/**
 * Þjónustuver AI-flokkun (triage) — batch classify email-mál into the board's
 * own vocabulary so incoming póstur lands on the Þjónustuborð already sorted.
 *
 *   POST /api/postur-triage
 *   Body: { items: [{ id, title, notes, customer_nafn }], mode? }   (batch, cheap — Haiku)
 *
 * TWO MODES (mode defaults to 'bord'):
 *
 *  • mode 'bord'  (óbreytt — patch 308 treystir á þetta): flokkur + merki +
 *    samantekt í ORÐAFORÐA borðsins (patch 231) svo email-mál raðist á Þjónustuborðið.
 *      → { results: { "<id>": { flokkur, tags[], important, summary, urgency, action, customer_hint } } }
 *
 *  • mode 'thjonustuver' (patch 309 — þjónustuver-póstsíðan): RÍKARI útdráttur fyrir
 *    kúnnaþjónustu-í-pósti. Markmiðið er að EKKERT mikilvægt tapist í styttingu:
 *      → { results: { "<id>": {
 *            summary,          // ein hnitmiðuð setning — hvað kúnninn vill NÁKVÆMLEGA
 *            ask,              // beiðnin/spurningin sjálf, með tölum/magni
 *            details: [{label,value}],  // lykil-staðreyndir (magn, upphæð, staðsetn., frestur, tæki, tengiliður)
 *            contact: {name,phone,email},
 *            important, urgency, reply_hint, flokkur, customer_hint
 *          } } }
 *
 * Server-side so ANTHROPIC_API_KEY stays off the client. The model NEVER writes
 * to the database — it only returns suggestions. Vocabulary (flokkur/tags) is
 * fixed to what the board understands; anything the model invents is dropped here.
 */

// ── The board's real vocabulary (must match js/patches/231-verkbord.js) ────────
const FLOKKAR = ['tilbod', 'thjonusta', 'brunakerfi', 'rukkun', 'samskipti'];
const TAGS = [
  'gera_tilbod', 'thjonustusamningur', 'bokhald', 'kvortun', 'hringja',
  'brunakerfi', 'eftir_ad_rukka', 'thjonusta', 'senda_tolvupost',
  'senda_skyrslur', 'uppsetning',
];
const URGENCY = ['lagur', 'venjulegur', 'har'];
const MODEL = 'claude-haiku-4-5-20251001';
const MODELS_OK = { 'claude-haiku-4-5-20251001': 1, 'claude-sonnet-5': 1 };

export default async (req) => {
  if (req.method === 'OPTIONS') return new Response('', { status: 204, headers: cors() });
  if (req.method !== 'POST') return j(405, { error: 'POST only' });

  // Default-open shared-secret gate: enforced AÐEINS þegar EDGE_SHARED_KEY er sett.
  const GATE = (process.env.EDGE_SHARED_KEY || '').trim();
  if (GATE) {
    const got = String(req.headers.get('x-eldklar-key') || '').trim();
    if (got !== GATE) return j(401, { error: 'unauthorized' });
  }

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return j(400, { error: 'ANTHROPIC_API_KEY_MISSING' });

  let body;
  try { body = await req.json(); } catch (_) { return j(400, { error: 'Invalid JSON' }); }
  const mode = body.mode === 'thjonustuver' ? 'thjonustuver' : 'bord';
  const model = MODELS_OK[body.model] ? body.model : MODEL;
  const cap = mode === 'thjonustuver' ? 12 : 15;
  const items = Array.isArray(body.items) ? body.items.slice(0, cap) : [];
  if (!items.length) return j(400, { error: 'no items' });

  const notesCap = mode === 'thjonustuver' ? 1600 : 700;
  const list = items.map((it, i) => {
    const notes = String(it.notes || '').replace(/\s+/g, ' ').slice(0, notesCap);
    return `#${i + 1} (id ${it.id})\n` +
      `Frá/kúnni: ${(it.customer_nafn || '—')}\n` +
      `Efni: ${String(it.title || '').slice(0, 200)}\n` +
      `Texti: ${notes || '(enginn texti)'}`;
  }).join('\n\n');

  const prompt = mode === 'thjonustuver' ? tvPrompt(list) : bordPrompt(list);
  const maxTokens = mode === 'thjonustuver' ? 4000 : 3000;

  let data;
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model, max_tokens: maxTokens, messages: [{ role: 'user', content: prompt }] }),
    });
    data = await r.json();
    if (!r.ok) return j(r.status, { error: (data && data.error && data.error.message) || 'anthropic error' });
  } catch (e) { return j(502, { error: String((e && e.message) || e) }); }

  const text = (data && data.content && data.content[0] && data.content[0].text) || '[]';
  let arr = [];
  try { const m = text.match(/\[[\s\S]*\]/); arr = m ? JSON.parse(m[0]) : []; } catch (_) { arr = []; }

  const results = {};
  items.forEach((it, i) => {
    const o = arr[i] && typeof arr[i] === 'object' ? arr[i] : {};
    results[String(it.id)] = mode === 'thjonustuver'
      ? validateTv(o, model)
      : validateBord(o, model);
  });
  return j(200, { results, model, mode });
};

// ── mode 'bord' — óbreytt orðaforða-flokkun fyrir Þjónustuborðið ────────────────
function bordPrompt(list) {
  return 'Þú ert aðstoð fyrir þjónustuver Slökkvitækis ehf (íslenskt fyrirtæki sem selur og ' +
    'þjónustar slökkvitæki og brunakerfi). Þú flokkar innkomna tölvupósta sem eru orðnir að ' +
    '„málum" á þjónustuborðinu. Fyrir HVERT mál hér að neðan skila fjórum flokkunum:\n\n' +
    'FLOKKUR (veldu NÁKVÆMLEGA einn lykil, eða null ef algjörlega óljóst):\n' +
    '- tilbod = beiðni um verð/tilboð, verðfyrirspurn, „hvað kostar".\n' +
    '- thjonusta = pöntun á þjónustu/skoðun/áfyllingu/uppsetningu, almenn þjónustubeiðni.\n' +
    '- brunakerfi = snýst um brunakerfi/brunaviðvörun/reykskynjara-kerfi (ekki stök tæki).\n' +
    '- rukkun = reikningur, greiðsla, innheimta, bókhald, afrit af reikningi.\n' +
    '- samskipti = fyrirspurn/svar/almenn samskipti sem kalla helst á símtal eða póst.\n\n' +
    'MERKI (tags — veldu 0–3 lykla sem eiga við, sem fylki):\n' +
    '- gera_tilbod, thjonustusamningur, bokhald, kvortun, hringja, brunakerfi, ' +
    'eftir_ad_rukka, thjonusta, senda_tolvupost, senda_skyrslur, uppsetning.\n' +
    '  (kvortun = óánægja/kvörtun; hringja = á að hringja; senda_skyrslur = beðið um úttektarskýrslu; ' +
    'senda_tolvupost = á að svara pósti; eftir_ad_rukka = á eftir að rukka; uppsetning = uppsetningarverk.)\n\n' +
    'IMPORTANT (true/false): er þetta áríðandi? (kvörtun, gjaldfallið, „strax", öryggismál) → true, annars false.\n' +
    'URGENCY: einn af lagur|venjulegur|har.\n' +
    'SUMMARY: EIN stutt íslensk setning (hámark 14 orð) — hvað sendandinn vill / hvað þarf að gera.\n' +
    'ACTION: EIN stutt íslensk setning — næsta skref (t.d. „Senda tilboð í brunaslöngur").\n' +
    'CUSTOMER_HINT: nafn fyrirtækis/kúnna EF það kemur skýrt fram í textanum, annars "".\n\n' +
    'Svaraðu EINGÖNGU sem hreint JSON fylki, í sömu röð og málin, einn hlutur per mál, ekkert annað:\n' +
    '[{"flokkur":"thjonusta","tags":["thjonusta","hringja"],"important":false,' +
    '"urgency":"venjulegur","summary":"…","action":"…","customer_hint":""}, …]\n\n' +
    'MÁLIN:\n' + list;
}
function validateBord(o, model) {
  const flokkur = FLOKKAR.includes(o.flokkur) ? o.flokkur : null;
  const tags = Array.isArray(o.tags) ? [...new Set(o.tags.filter((t) => TAGS.includes(t)))].slice(0, 4) : [];
  return {
    flokkur,
    tags,
    important: o.important === true,
    urgency: URGENCY.includes(o.urgency) ? o.urgency : 'venjulegur',
    summary: o.summary ? String(o.summary).slice(0, 220) : '',
    action: o.action ? String(o.action).slice(0, 220) : '',
    customer_hint: o.customer_hint ? String(o.customer_hint).slice(0, 120) : '',
    model,
  };
}

// ── mode 'thjonustuver' — ríkari útdráttur fyrir kúnnaþjónustu-í-pósti ──────────
// Markmið Agnars: (1) samantekt á ALVÖRU beiðninni með tölum, (2) ENGIN mikilvæg
// gögn falin í styttingu → structured `details` fylki dregur út lykil-staðreyndir.
function tvPrompt(list) {
  return 'Þú ert reyndur þjónustufulltrúi hjá Slökkvitæki ehf (íslenskt fyrirtæki sem selur og ' +
    'þjónustar slökkvitæki, brunaslöngur og brunakerfi). Þú lest tölvupóst FRÁ viðskiptavini og ' +
    'dregur út allt sem starfsmaður þarf til að svara vel — án þess að opna póstinn sjálfan. ' +
    'MARKMIÐ: ekkert mikilvægt má tapast. Ef upphæð, magn, dagsetning, heimilisfang, sími eða ' +
    'nafn kemur fram í póstinum SKAL það rata í „details". Ekki skálda — sleppa reit ef gögnin vantar.\n\n' +
    'Fyrir HVERT mál skilaðu hlut með þessum reitum:\n' +
    '- summary: EIN hnitmiðuð íslensk setning — hvað kúnninn vill NÁKVÆMLEGA (með tölum ef við á). ' +
    'Ekki almennt („fyrirspurn um þjónustu") heldur nákvæmt („Vill tilboð í áfyllingu á 12 slökkvitækjum í Ármúla 6").\n' +
    '- ask: beiðnin/spurningin sjálf í 1–2 setningum, orðuð eins og kúnninn meinar hana.\n' +
    '- details: FYLKI af {label,value} — dregðu út hverja lykil-staðreynd sér. Notaðu skýr íslensk ' +
    'label eins og „Magn", „Upphæð", „Staðsetning", „Frestur", „Tæki/vara", „Reikningsnr.", „Dagsetning". ' +
    'value er stutt (t.d. „12 stk", „45.000 kr", „Ármúli 6, 3. hæð", „fyrir föstudag"). Tómt fylki ef ekkert áþreifanlegt.\n' +
    '- contact: {name,phone,email} — tengiliður/sími/netfang EF það kemur fram í póstinum, annars tómir strengir.\n' +
    '- important: true ef áríðandi (kvörtun, öryggismál, gjaldfallið, „strax"), annars false.\n' +
    '- needs_action: true EF pósturinn kallar á svar eða aðgerð frá okkur (spurning, pöntun, ' +
    'beiðni, kvörtun). false EF þetta er BARA þökk/staðfesting/kvittun/„takk"/sjálfvirk tilkynning ' +
    'sem þarf EKKERT svar. Vertu varfærinn: ef í vafa, true.\n' +
    '- urgency: lagur|venjulegur|har.\n' +
    '- reply_hint: EIN stutt setning — hvað starfsmaður ætti að gera næst / svara.\n' +
    '- flokkur: gróf flokkun — NÁKVÆMLEGA einn af tilbod|thjonusta|brunakerfi|rukkun|samskipti, eða null.\n' +
    '- customer_hint: nafn fyrirtækis/kúnna EF það kemur skýrt fram, annars "".\n\n' +
    'Svaraðu EINGÖNGU sem hreint JSON fylki, í sömu röð og málin, einn hlutur per mál, ekkert annað:\n' +
    '[{"summary":"…","ask":"…","details":[{"label":"Magn","value":"12 stk"}],' +
    '"contact":{"name":"","phone":"","email":""},"important":false,"needs_action":true,"urgency":"venjulegur",' +
    '"reply_hint":"…","flokkur":"tilbod","customer_hint":""}, …]\n\n' +
    'PÓSTARNIR:\n' + list;
}
function validateTv(o, model) {
  const details = Array.isArray(o.details)
    ? o.details
        .filter((d) => d && typeof d === 'object' && (d.label || d.value))
        .slice(0, 8)
        .map((d) => ({ label: String(d.label || '').slice(0, 40), value: String(d.value || '').slice(0, 160) }))
    : [];
  const c = (o.contact && typeof o.contact === 'object') ? o.contact : {};
  const contact = {
    name: c.name ? String(c.name).slice(0, 120) : '',
    phone: c.phone ? String(c.phone).slice(0, 60) : '',
    email: c.email ? String(c.email).slice(0, 160) : '',
  };
  const hasContact = contact.name || contact.phone || contact.email;
  return {
    summary: o.summary ? String(o.summary).slice(0, 300) : '',
    ask: o.ask ? String(o.ask).slice(0, 500) : '',
    details,
    contact: hasContact ? contact : null,
    important: o.important === true,
    needs_action: o.needs_action === false ? false : true,   // varfærið: aðeins skýrt false þaggar niður
    urgency: URGENCY.includes(o.urgency) ? o.urgency : 'venjulegur',
    reply_hint: o.reply_hint ? String(o.reply_hint).slice(0, 240) : '',
    flokkur: FLOKKAR.includes(o.flokkur) ? o.flokkur : null,
    customer_hint: o.customer_hint ? String(o.customer_hint).slice(0, 120) : '',
    model,
  };
}

function cors() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, x-eldklar-key',
  };
}
function j(status, obj) {
  return new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json', ...cors() } });
}

export const config = { path: '/api/postur-triage' };
