/**
 * Verkefnalisti — Claude vision á límdar skjámyndir.
 *
 * Þegar skjámynd er límd á verk í Verkefnalistanum situr hún bara í
 * `verkefnalisti`-bucketinu; agentinn sem tekur verkið fær aðeins titilinn og
 * textann. Ef textinn er stuttur („þetta er ljótt", „sjáðu myndina") er
 * samhengið glatað. Þetta fall les myndina og skrifar íslenska lýsingu í
 * `claude_notes` svo næsti agent sjái AF HVERJU Agnar segir þetta.
 *
 *   POST /api/verkefnalisti-vision      (→ 202 samstundis, vinnan heldur áfram)
 *   Body:
 *     {}                      → sópun: opin verk með mynd og enga lýsingu
 *     { id: "<uuid>" }        → eitt tiltekið verk (kallað eftir upload)
 *     { limit: 25 }           → hámark verka í sópun (sjálfgefið 10, þak 100)
 *     { statuses: [...] }     → sjálfgefið opin verk; ["*"] = öll (bakvirk keyrsla)
 *     { dry: true }           → les og lýsir en SKRIFAR EKKI (lýsingar í logg)
 *     { force: true }         → endurlýsir þótt lýsing sé þegar til
 *
 * BAKGRUNNSFALL (nafn endar á -background): skilar 202 strax og fær allt að 15
 * mínútur. Það er ekki valfrjálst — mælt á forskoðun tók EITT myndaþungt verk
 * 31,8 s og samstillt fall er drepið við ~30 s (HTTP 504). Lýsingin er
 * eðlisþung: 4 skjámyndir inn og ~700 tákn út. Kallandinn les því ekki
 * niðurstöðuna úr svarinu — hún lendir í claude_notes, og samantekt fer í
 * fallaloggið (þar sjást líka dry-lýsingar).
 *
 * VARÚÐ — claude_notes er SAMEIGINLEGUR reitur: þar liggja handskrifaðar nótur
 * (t.d. „Cowork 2026-07-28: afgangur eftir sjálfvirka tengingu."). Fallið
 * SKEYTIR lýsingunni AFTAN Á og yfirskrifar ALDREI — sama regla og patch 82
 * lærði á athugasemdum í mánaðarreikningum. Nóturnar eru LESNAR AFTUR rétt
 * fyrir skrif, svo nóta sem einhver skrifaði á meðan lýsingin var í smíðum
 * tapist ekki (og tvær samhliða keyrslur tvítaki ekki sömu lýsinguna).
 *
 * Sjálfvirkni: `verkefnalisti-vision-cron` keyrir sópunina á 15 mín fresti
 * (netlify.toml). Þess vegna þarf ENGA breytingu á brunaholf-framendanum —
 * mynd sem límd er inn fær lýsingu af sjálfu sér. Vilji maður hana samstundis
 * kallar framendinn beint með { id }.
 *
 * Lyklar: ANTHROPIC_API_KEY · SUPABASE_URL · SUPABASE_SERVICE_ROLE_KEY
 * (allir þegar á síðunni — sömu og ocr-scan/payday nota).
 */

import { createHash } from 'node:crypto';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Sonnet en ekki Haiku (sem ocr-scan notar): þar les módelið EINN reit sem
// maður getur sannreynt með berum augum, hér er lýsingin EINA heimildin um
// myndina fyrir næsta agent — hún er lesin, ekki skoðuð. Magnið er lítið
// (~77 myndir í bakvirku keyrslunni, örfáar á viku eftir það) svo munurinn í
// krónum er hverfandi. Yfirskrifanlegt með VERKEFNALISTI_VISION_MODEL.
const MODEL = process.env.VERKEFNALISTI_VISION_MODEL || 'claude-sonnet-5';

const MAX_IMAGES = 4;                     // þak per verk — heldur kostnaði og svartíma í skefjum
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;  // Anthropic-þak per mynd
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;
// Rúmt undir 15-mín þaki fallsins OG vel innan 15-mín cron-bilsins, svo tvær
// keyrslur skarist ekki að óþörfu. Mælt: ~25 s á myndaþungt verk.
const TIME_BUDGET_MS = 10 * 60 * 1000;
const OPEN_STATUSES = ['beidni', 'i_vinnu', 'i_yfirferd'];
const OK_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

const MARKER = '🖼️ Myndlýsing (Claude vision';

export default async (req) => {
  const start = Date.now();

  // Default-open shared-secret gate: enforced AÐEINS þegar EDGE_SHARED_KEY er sett.
  const GATE = (process.env.EDGE_SHARED_KEY || '').trim();
  if (GATE) {
    const got = String(req.headers.get('x-eldklar-key') || '').trim();
    if (got !== GATE) return done(401, { error: 'unauthorized' });
  }

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!anthropicKey) return done(400, { error: 'ANTHROPIC_API_KEY_MISSING' });
  if (!SUPABASE_URL || !SUPABASE_KEY) return done(500, { error: 'Supabase env vantar.' });

  let body = {};
  try { body = (await req.json()) || {}; } catch (_) { /* tómt body = sópun */ }

  const dry = body.dry === true;
  const force = body.force === true;
  const limit = Math.min(MAX_LIMIT, Math.max(1, Number(body.limit) || DEFAULT_LIMIT));

  let rows;
  try {
    rows = await fetchTasks(body, limit);
  } catch (e) {
    return done(502, { error: 'Supabase-lestur brást', message: msg(e) });
  }

  const out = [];
  let skrifad = 0, sleppt = 0, stoppad = false;

  for (const row of rows) {
    if (Date.now() - start > TIME_BUDGET_MS) { stoppad = true; break; }

    const urls = imageUrls(row);
    if (!urls.length) { sleppt++; out.push(mark(row, 'engin-mynd')); continue; }

    const fp = fingerprint(urls);
    if (!force && hasDescription(row.claude_notes, fp)) {
      sleppt++; out.push(mark(row, 'thegar-lyst')); continue;
    }

    let images;
    try { images = await loadImages(urls); }
    catch (e) { sleppt++; out.push(mark(row, 'mynd-sotti-ekki', msg(e))); continue; }
    if (!images.length) { sleppt++; out.push(mark(row, 'engin-nothaef-mynd')); continue; }

    let lysing;
    try { lysing = await describe(images, row, anthropicKey); }
    catch (e) { sleppt++; out.push(mark(row, 'vision-brast', msg(e))); continue; }

    if (!dry) {
      try {
        const wrote = await appendDescription(row.id, block(lysing, images.length, fp), fp, force);
        if (!wrote) { sleppt++; out.push(mark(row, 'thegar-lyst-a-medan')); continue; }
      } catch (e) { sleppt++; out.push(mark(row, 'vistun-brast', msg(e))); continue; }
    }

    skrifad++;
    out.push({ ...mark(row, dry ? 'thurrkeyrsla' : 'skrifad'), myndir: images.length, lysing });
  }

  // Loggið er eina leiðin til að sjá útkomuna (bakgrunnsfall skilar 202 strax).
  // Í dry-ham fylgja lýsingarnar með svo hægt sé að meta gæðin fyrir skrif.
  console.log(`[verkefnalisti-vision] model=${MODEL} dry=${dry} skodud=${rows.length} skrifad=${skrifad} sleppt=${sleppt}` +
    (stoppad ? ' STOPPAD_A_TIMA' : ''));
  for (const v of out) {
    console.log(`[verkefnalisti-vision] ${v.stada} · ${v.titill}${v.villa ? ' · ' + v.villa : ''}`);
    if (dry && v.lysing) console.log(`[verkefnalisti-vision]   » ${v.lysing.replace(/\n/g, '\n[verkefnalisti-vision]   ')}`);
  }

  return done(200, { ok: true, dry, model: MODEL, skodud: rows.length, skrifad, sleppt, stoppad_a_tima: stoppad, verk: out });
};

// --- Supabase ---------------------------------------------------------------

const COLS = 'id,title,description,status,category,claude_notes,request_image_url,request_image_urls';
const SB = () => ({ apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` });

async function fetchTasks(body, limit) {
  const id = typeof body.id === 'string' ? body.id.trim() : '';
  let url;

  if (id) {
    url = `${SUPABASE_URL}/rest/v1/verkefnalisti?select=${COLS}&id=eq.${encodeURIComponent(id)}`;
  } else {
    // Aðeins verk sem EIGA mynd. PostgREST getur ekki síað á jsonb-lengd, svo
    // við tökum bæði myndsviðin og hendum myndlausum röðum út hér að neðan.
    const statuses = Array.isArray(body.statuses) && body.statuses.length ? body.statuses : OPEN_STATUSES;
    const all = statuses.length === 1 && statuses[0] === '*';
    const filters = [
      `select=${COLS}`,
      'or=(request_image_url.not.is.null,request_image_urls.not.is.null)',
      // Nýjast fyrst — nýlímd skjámynd er sú sem einhver bíður eftir.
      'order=updated_at.desc',
      `limit=${limit * 4}`,
    ];
    if (!all) filters.push(`status=in.(${statuses.map(encodeURIComponent).join(',')})`);
    url = `${SUPABASE_URL}/rest/v1/verkefnalisti?${filters.join('&')}`;
  }

  const r = await fetch(url, { headers: SB() });
  if (!r.ok) throw new Error(`HTTP ${r.status}: ${(await r.text()).slice(0, 200)}`);
  const rows = await r.json();
  if (id) return rows;
  return rows.filter((row) => imageUrls(row).length).slice(0, limit);
}

/**
 * Les nóturnar UPP Á NÝTT og skeytir lýsingunni aftan á ferska gildið.
 * Lýsingin tekur tugi sekúndna í smíðum; á þeim tíma getur Agnar (eða önnur
 * keyrsla) hafa skrifað í reitinn. Að skrifa ofan á gildið sem lesið var í
 * upphafi myndi henda þeirri nótu. Skilar false ef lýsing er þegar komin.
 */
async function appendDescription(id, addition, fp, force) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/verkefnalisti?select=claude_notes&id=eq.${encodeURIComponent(id)}`, { headers: SB() });
  if (!r.ok) throw new Error(`HTTP ${r.status}: ${(await r.text()).slice(0, 200)}`);
  const fresh = (await r.json())[0];
  if (!fresh) throw new Error('verk fannst ekki við skrif');
  if (!force && hasDescription(fresh.claude_notes, fp)) return false;

  // ATH: updated_at er VILJANDI ekki snert — engir triggerar á töflunni, og
  // vélrituð lýsing á ekki að ýta verki upp listann eins og Agnar hafi
  // handleikið það.
  const w = await fetch(`${SUPABASE_URL}/rest/v1/verkefnalisti?id=eq.${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { ...SB(), 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify({ claude_notes: appendNote(fresh.claude_notes, addition) }),
  });
  if (!w.ok) throw new Error(`HTTP ${w.status}: ${(await w.text()).slice(0, 200)}`);
  return true;
}

// --- Myndir -----------------------------------------------------------------

function imageUrls(row) {
  const list = [];
  if (row.request_image_url) list.push(String(row.request_image_url));
  const many = row.request_image_urls;
  if (Array.isArray(many)) for (const u of many) if (u) list.push(String(u));
  // dedupe, haldið röð; þak svo eitt verk með 20 myndir sprengi ekki kallið
  return [...new Set(list.map((u) => u.trim()).filter(Boolean))].slice(0, MAX_IMAGES);
}

async function loadImages(urls) {
  const out = [];
  for (const url of urls) {
    const r = await fetch(url);
    if (!r.ok) continue;                       // horfin mynd stöðvar ekki hinar
    const buf = Buffer.from(await r.arrayBuffer());
    if (!buf.length || buf.length > MAX_IMAGE_BYTES) continue;
    const media = mediaType(r.headers.get('content-type'), url);
    if (!media) continue;
    out.push({ media, b64: buf.toString('base64') });
  }
  return out;
}

function mediaType(header, url) {
  const fromHeader = String(header || '').split(';')[0].trim().toLowerCase();
  if (OK_TYPES.includes(fromHeader)) return fromHeader;
  const ext = (url.split('?')[0].match(/\.([a-z0-9]+)$/i) || [, ''])[1].toLowerCase();
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
  if (ext === 'png') return 'image/png';
  if (ext === 'gif') return 'image/gif';
  if (ext === 'webp') return 'image/webp';
  return null;
}

// --- Claude -----------------------------------------------------------------

async function describe(images, row, key) {
  const samhengi = [
    `Titill verksins: ${row.title || '(enginn)'}`,
    row.category ? `Flokkur: ${row.category}` : '',
    row.description ? `Lýsing Agnars: ${String(row.description).slice(0, 1500)}` : '(engin textalýsing fylgdi — myndin er allt sem agentinn hefur)',
  ].filter(Boolean).join('\n');

  const instruction =
    'Þú ert að skrifa minnispunkt fyrir næsta forritara sem tekur við þessu verki. ' +
    'Hann sér EKKI myndina — lýsingin þín er eina heimildin um hana.\n\n' +
    'Skjámyndirnar eru yfirleitt úr innri vefkerfum Slökkvitækis ehf. ' +
    '(slokkvitaeki.netlify.app / brunaholf.netlify.app) — töflur, reikningar, ' +
    'úttektarskýrslur, kúnnaspjöld — eða af pappír/vinnublöðum.\n\n' +
    'Verkefnið:\n' + samhengi + '\n\n' +
    'Skrifaðu á ÍSLENSKU, samfelldan texta í 2–6 setningum sem svarar þessu:\n' +
    '· Hvaða skjár/skjal sést og hvað er á honum (nefndu flipa, dálka, hnappa og ' +
    'tölur sem sjást — nöfn og upphæðir eru oft kjarni málsins).\n' +
    '· Hvað er ATHUGAVERT — það sem Agnar er að benda á: brotin útlína, texti sem ' +
    'flæðir út fyrir, röng tala, tvítekin röð, villuskilaboð, tómur listi, rauð ' +
    'merking. Ef eitthvað er hringað, undirstrikað eða merkt með ör, segðu hvað.\n' +
    '· Ef ekkert virðist að, segðu það hreint út.\n\n' +
    'Vertu áþreifanlegur og hlutlægur. Lestu raunverulegan texta af myndinni ' +
    'þegar hann skiptir máli. Engar tillögur að lausn, engin kurteisisorð, ' +
    'engar fyrirsagnir, engir tölusettir liðir — aðeins lýsingin sjálf sem ' +
    'samfelldar málsgreinar.';

  const content = images.map((im) => ({
    type: 'image',
    source: { type: 'base64', media_type: im.media, data: im.b64 },
  }));
  if (images.length > 1) {
    // Númera myndirnar svo lýsingin geti vísað í „Mynd 2" o.s.frv.
    for (let i = images.length - 1; i >= 0; i--) {
      content.splice(i, 0, { type: 'text', text: `Mynd ${i + 1} af ${images.length}:` });
    }
  }
  content.push({ type: 'text', text: instruction });

  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    // Rúmt max_tokens (lýsingin sjálf er klippt í 2000 stafi hér að neðan):
    // 700 reyndist of naumt — verk með 4 þéttar skjámyndir kláraði kvótann
    // ÁÐUR en fyrsti textablokkin kom og skilaði þögn. Rýmið er þak, ekki
    // kostnaður; stutt svar kostar áfram stutt.
    body: JSON.stringify({ model: MODEL, max_tokens: 3000, messages: [{ role: 'user', content }] }),
  });
  const data = await r.json();
  if (!r.ok) throw new Error((data && data.error && data.error.message) || `anthropic ${r.status}`);

  const text = ((data && data.content) || [])
    .filter((b) => b && b.type === 'text')
    .map((b) => b.text)
    .join('\n')
    .trim();
  // Þögn án villu er versta útkoman — hún lítur út eins og „ekkert að segja".
  // Láttu stop_reason fylgja svo næsta bilun sé greinanleg en ekki dularfull.
  if (!text) throw new Error(`tómt svar frá módeli (stop_reason=${(data && data.stop_reason) || '?'})`);
  return text.slice(0, 2000);
}

// --- claude_notes ------------------------------------------------------------

/** Stutt fingrafar myndalistans — ný mynd á verkið ⇒ nýtt far ⇒ ný lýsing. */
function fingerprint(urls) {
  return createHash('sha1').update(urls.join('\n')).digest('hex').slice(0, 8);
}

/** Er lýsing fyrir NÁKVÆMLEGA þessar myndir þegar til? (fingrafarið er lykillinn) */
function hasDescription(notes, fp) {
  return String(notes || '').includes(`#${fp}`);
}

function block(lysing, count, fp) {
  const dags = new Date().toISOString().slice(0, 10);
  const myndir = count === 1 ? '1 mynd' : `${count} myndir`;
  return `${MARKER} · ${myndir} · ${dags} · #${fp})\n${lysing}`;
}

/** Skeytir aftan á — yfirskrifar ALDREI handskrifaðar nótur. */
function appendNote(existing, addition) {
  const cur = String(existing || '').trim();
  return cur ? `${cur}\n\n${addition}` : addition;
}

// --- smától -------------------------------------------------------------------

function mark(row, stada, villa) {
  const o = { id: row.id, titill: row.title, stada };
  if (villa) o.villa = villa;
  return o;
}
function msg(e) {
  return String((e && e.message) || e).slice(0, 200);
}
function done(status, obj) {
  return new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } });
}

// Bakgrunnsfall (nafn endar á -background) svo 15 mín séu í boði í stað ~30 s.
// Slóðin er skráð hér frekar en með redirect-reglu — sama og ocr-scan gerir.
export const config = { path: '/api/verkefnalisti-vision' };
