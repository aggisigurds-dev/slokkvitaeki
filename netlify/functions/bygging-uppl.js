/**
 * bygging-uppl — Byggingarupplýsingar úr opinberum skjölum („Greining fasteignar", 451). LES AÐEINS.
 *
 * Agnar 08.10.2026: í skjalasafni Reykjavíkur eru, auk teikninga, blöð með „Lýsing: Skráningartafla" og
 * „Byggingarlýsing". Skráningartaflan (sniðmát HMS, útg. 4.x/5.x) geymir brúttóflöt, rúmmál, hverja hæð og
 * hvern eignarhluta; byggingarlýsingin geymir brunavarnirnar (brunahólfun, vatnsúðakerfi, brunaviðvörunarkerfi,
 * flóttaleiðir, slökkvitæki). 09.10.2026 bað hann um síðuna „Greining fasteignar" sem notar þetta fall.
 *
 *   GET /.netlify/functions/bygging-uppl?heimilisfang=Laugavegur 120, 105 Reykjavík
 *   GET /.netlify/functions/bygging-uppl?landnr=102986                   (aðeins Reykjavík)
 *   → { eign, m2, m2_birt, rummal_m3, haedir, eignir, stigagangar, byggingarar, brunavarnir, lysingar,
 *       heimildir:[{tegund, dags, lysing, slod, lesin, lesid_af, matshluti}], olesin, oryggi, athugasemdir }
 *
 * HVAÐAN TÖLURNAR KOMA. Skjölin eru oftast skannaðar myndir (TIF eða mynd-PDF). Þau eru lesin með OCR (RapidOCR)
 * Á SKRIFSTOFUTÖLVUNNI, ekki hér: Netlify-fall hefur hvorki OCR-vél né tíma (10 s). Lesturinn liggur í töflunni
 * `fasteign_greining` (tegund 'skjal', lykill 'skjal:<slóð>') — skrifaður af brúnni (luna-bridge bygging-ocr.js) eða
 * fyrstu lotunni 08.10.2026. Fallið (1) finnur skjölin — sama leit og 374/hus-upplysingar — og (2) skilar lestri ef
 * hann er til. Skjal sem hefur ekki verið lesið kemur samt í `heimildir` með hlekk (og í `olesin`, svo síðan geti
 * boðið „Lesa skjölin"), og tölurnar eru þá null — aldrei ágiskun.
 *
 * ÖRYGGI. Skráningartaflan hefur innbyggðar summur: hæð = summa A-rýma hennar, matshluti = summa hæða (+ botn í
 * rúmmáli). Stemmi summan er talan „há" (tvær óháðar OCR-lestrar þyrftu að skekkjast eins). Lesið en óstaðfest =
 * „miðlungs". Mælt 08.10.2026 (teikning-greining/byggingargogn/nidurstodur_maeling.json): 58/58 lykiltölur réttar á
 * 7 blöðum; 51 fengu „há" og allar 51 voru réttar — ekkert falskt öryggi. Eignafjöldi er miðlungs í mesta lagi.
 *
 * MATSHLUTAR. Lóð getur átt mörg hús (Hraunbær 62-100 = einn matshluti á stigagang; L103185 = Rauðarárstígur 35
 * + Þverholt 20-32). Lýsigögn skjalasafnsins bera oft heimilisfang LÓÐARINNAR, ekki hússins. Því ræður heimilisfangið
 * sem lesið var af blaðinu sjálfu; finnist það ekki eru tölur aðeins sýndar ef lóðin hefur einn matshluta og allar
 * töflur hennar eru lesnar.
 *
 * 09.10.2026: Kaupskrá HMS er EKKI notuð (Agnar hefur ekki farið yfir skilmálana) — byggingarár kemur aðeins úr
 * byggingarlýsingunni sjálfri („miðlungs"). Regla Agnars: sjálfsótt gögn eru merkt 🏛 og skrifast ALDREI yfir hans
 * reiti. Þetta fall skrifar ekkert.
 */
import { husUpplysingar, thattaHeimilisfang } from './hus-upplysingar.js';

const FOTOWEB = 'https://skjalasafn.reykjavik.is';
const RVK_SAFN = '/fotoweb/archives/5000-A%C3%B0aluppdr%C3%A6ttir/';
const KJARNI_HAMARK = 150;      // Kjarni sækir 6 síður × 25; fleiri blöð = listinn styttur → bein orðaleit
const SB_URL = 'https://osfdzskyvisifcwyjkuk.supabase.co';
const SB_KEY = 'sb_publishable_YVpznM5EK01qOdevQwOcIg_rMjTkT7f';
const OCR_MIN_SKJAL = 2.5;      // mælt miðgildi 143 s per skjal á skrifstofutölvunni (samanburdur/lestur/_timar.json)

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};
const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });

const SKRAN = /skr[áa]ning(ar)?t[aö]fl/i;
const LYS = /byggingarl[ýy]sing|brunal[ýy]sing/i;
/** Kópavogur merkir „Ofnatafla." með gerð „Skráningartafla" — lýsingin ræður, gerðin aðeins ef lýsingin nefnir enga aðra töflu. */
export function tegundSkjals(r) {
  const l = String(r.lysing || ''), g = String(r.gerd || '');
  const t = [];
  if (SKRAN.test(l) || (SKRAN.test(g) && !/tafla/i.test(l))) t.push('skraningartafla');
  if (LYS.test(l)) t.push('byggingarlysing');
  return t;
}

/** Samanburðarlykill heimilisfangs: án broddstafa, bila og greinarmerkja („Skútuvogur 4, 104" → „skutuvogur4"). */
function lykill(s) {
  return String(s || '').split(',')[0].normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ð/gi, 'd').replace(/þ/gi, 'th')
    .replace(/æ/gi, 'ae').replace(/ö/gi, 'o').toLowerCase().replace(/[^a-z0-9]/g, '');
}
/** Líkindi tveggja lykla (0–1) — OCR les „ó" stundum sem „60" („Fiskisl60 41"), svo jafnt dugar ekki. */
function likindi(a, b) {
  if (!a || !b) return 0;
  if (a === b) return 1;
  const m = a.length, n = b.length;
  const d = Array.from({ length: m + 1 }, (_, i) => [i]);
  for (let j = 1; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++)
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return 1 - d[m][n] / Math.max(m, n);
}
/** „Fiskisl60 41" → { gata:'fiskisl60', nr:'41' }. Húsnúmerið er síðasta orðið ef það er tala — annars tölustafir í
 *  enda („Skutuvogur4,104" → 4). OCR les „ó" sem „60", svo tölustafir inni í götuheitinu mega ekki verða húsnúmer. */
function hlutar(s) {
  const fyrst = String(s || '').split(',')[0].trim();
  const ord = fyrst.split(/\s+/);
  const sid = ord[ord.length - 1];
  if (ord.length > 1 && /^\d+[a-zA-Z]?(-\d+[a-zA-Z]?)?$/.test(sid)) return { gata: lykill(ord.slice(0, -1).join(' ')), nr: sid.split('-')[0].replace(/[a-z]$/i, '') };
  const k = lykill(fyrst), m = k.match(/(\d+)[a-z]?$/);
  return m ? { gata: k.slice(0, m.index), nr: m[1] } : { gata: k, nr: '' };
}
/** Sama hús? Húsnúmerið verður að vera eins (Hraunbær 64 ≠ Hraunbær 86), gatan má vera OCR-skekkt. */
export function samaHus(blad, hus) {
  const a = hlutar(blad), b = hlutar(hus);
  if (!a.nr || !b.nr || a.nr !== b.nr) return false;
  return likindi(a.gata, b.gata) >= 0.75;
}

async function fotowebLeit(q, signal) {
  const r = await fetch(FOTOWEB + RVK_SAFN + '?q=' + encodeURIComponent(q), {
    headers: { Accept: 'application/vnd.fotoware.assetlist+json', 'User-Agent': 'Slokkvitaeki-bygging/0.2' }, signal,
  });
  if (!r.ok) throw new Error('Skjalasafnið svaraði ' + r.status);
  const d = await r.json();
  const v = (a, k) => { const x = a.metadata && a.metadata[k] && a.metadata[k].value; return x == null ? null : String(Array.isArray(x) ? x[0] : x).trim() || null; };
  return (d.data || []).map((a) => ({ infoUrl: FOTOWEB + a.href, dags: v(a, '30'), lysing: v(a, '214'), gata: v(a, '210'), landnr: v(a, '202') }));
}

/** Lesnu skjölin lóðarinnar úr fasteign_greining (anon-lestur; RLS: select opið). */
async function lesnSkjol(landnr, signal) {
  if (!landnr) return new Map();
  const u = `${SB_URL}/rest/v1/fasteign_greining?tegund=eq.skjal&landnr=eq.${encodeURIComponent(landnr)}&select=lykill,gogn,uppruni,lesid_at&limit=400`;
  const r = await fetch(u, { headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` }, signal });
  if (!r.ok) throw new Error('fasteign_greining svaraði ' + r.status);
  const radir = await r.json();
  const m = new Map();
  for (const x of Array.isArray(radir) ? radir : []) {
    const slod = String(x.lykill || '').replace(/^skjal:/, '');
    if (slod && x.gogn) m.set(slod, Object.assign({}, x.gogn, { _uppruni: x.uppruni || null, _lesid_at: x.lesid_at || null }));
  }
  return m;
}

export async function byggingUppl({ heimilisfang, landnr, mhl }) {
  const ut = { eign: null, m2: null, m2_birt: null, rummal_m3: null, haedir: null, eignir: null, stigagangar: null, byggingarar: null,
    brunavarnir: null, lysingar: [], heimildir: [], olesin: [], oryggi: { m2: null, haedir: null, eignir: null, stigagangar: null, byggingarar: null, heild: 'ekkert' },
    athugasemdir: [], ocr_min_skjal: OCR_MIN_SKJAL };
  let listi = [];
  let husLabel = null;

  if (heimilisfang) {
    const s = await husUpplysingar(heimilisfang, 8000);
    if (!s.eign) return { ...ut, error: s.error || 'Fann ekki heimilisfangið' };
    ut.eign = { landnr: s.eign.landnr, heitinr: s.eign.heitinr, label: s.eign.label, postnr: s.eign.postnr, svf: s.eign.svf || null, safn: s.eign.heimildNafn || null, oviss: !!s.eign.oviss };
    husLabel = s.eign.oviss ? null : s.eign.label;
    // 09.10.2026 (Bríetartún 9 → „Hátún 9", oviss): ágiskuð lóð má ALDREI bera tölur hljóðlaust — svarið segir að
    // staðfangið hafi ekki fundist nákvæmlega og hverja lóð ágiskunin benti á; engin skjöl eða tölur þeirrar lóðar.
    if (s.eign.oviss) {
      ut.oviss = true;
      ut.athugasemdir.push('Óvíst — „' + heimilisfang + '" fannst ekki nákvæmlega í Staðfangaskrá. Næsta lóð í Landeignaskrá er „' + (s.eign.label || '?') + '" (L' + s.eign.landnr + ') — tölur hennar eru ekki sýndar. Veldu rétta lóð: landnúmer eða annað heimilisfang.');
      return ut;
    }
    listi = Array.isArray(s.results) ? s.results : [];
    if (s.error) ut.athugasemdir.push(s.error);
    // Reykjavík: teikningalisti Kjarna er orðaleit á landnúmerinu og ber ekki reit 202 (landnúmer) — hann tók með
    // Tunguveg 19 og Suðurlandsbraut 12 á Fiskislóð 41, og er styttur við 150 blöð (Þverholt 24: 9 töflur af 11).
    // Því er leitað beint að „<landnr> skráningartafla" / „<landnr> byggingarlýsing" og reitur 202 látinn ráða.
    // Listi Kjarna er aðeins varaleið ef skjalasafnið svarar ekki.
    if (!s.eign.svf) {
      try {
        const sig = AbortSignal.timeout(4500);
        const [a, b] = await Promise.all([fotowebLeit(s.eign.landnr + ' skráningartafla', sig), fotowebLeit(s.eign.landnr + ' byggingarlýsing', sig)]);
        const til = new Set();
        const beint = [];
        for (const x of [...a, ...b]) if (String(x.landnr) === String(s.eign.landnr) && !til.has(x.infoUrl)) { beint.push(x); til.add(x.infoUrl); }
        listi = beint;
      } catch (_) {
        ut.athugasemdir.push('Bein leit í skjalasafninu svaraði ekki — notaður listi teikningaþjónustunnar (getur innihaldið blöð annarra lóða).');
        if (listi.length >= KJARNI_HAMARK) ut.athugasemdir.push('Teikningalistinn er styttur við 150 blöð.');
      }
    }
  } else if (landnr) {
    ut.eign = { landnr: Number(landnr), heitinr: null, label: null, postnr: null, svf: null, safn: 'Skjalasafn Reykjavíkur', oviss: false };
    const sig = AbortSignal.timeout(6000);
    const [a, b] = await Promise.all([fotowebLeit(landnr + ' skráningartafla', sig), fotowebLeit(landnr + ' byggingarlýsing', sig)]);
    const til = new Set();
    for (const x of [...a, ...b]) if (String(x.landnr) === String(landnr) && !til.has(x.infoUrl)) { listi.push(x); til.add(x.infoUrl); }
  } else {
    return { ...ut, error: 'heimilisfang eða landnr vantar' };
  }

  // ── lesturinn sem er til (fasteign_greining) ─────────────────────────────────
  let LESID = new Map();
  try { LESID = await lesnSkjol(ut.eign.landnr, AbortSignal.timeout(2500)); }
  catch (e) { ut.athugasemdir.push('Náði ekki í lesnu skjölin (' + ((e && e.message) || 'villa') + ') — aðeins hlekkir sýndir.'); ut.lestur_villa = true; }

  // ── skjölin ────────────────────────────────────────────────────────────────
  const skran = [], lys = [];
  for (const r of listi) {
    const slod = r.infoUrl;
    if (!slod) continue;
    for (const t of tegundSkjals(r)) (t === 'skraningartafla' ? skran : lys).push(r);
  }
  const nyjast = (a, b) => String(b.dags || '').localeCompare(String(a.dags || ''));
  skran.sort(nyjast);
  lys.sort(nyjast);
  const heimildAf = (r, teg) => {
    const l = LESID.get(r.infoUrl) || null;
    return {
      tegund: teg,
      dags: r.dags || null,
      lysing: r.lysing || null,
      merking: r.gata || null,                  // heimilisfangið í lýsigögnum safnsins (oft lóðin)
      slod: r.infoUrl,
      snid: /\.pdf(\.info)?$/i.test(r.infoUrl) ? 'pdf' : /\.tiff?\.info$/i.test(r.infoUrl) ? 'tif' : null,
      lesin: !!l,
      ekki_tafla: !!(l && l.ekki_tafla),
      lesid_af: l ? [l._uppruni, l._lesid_at ? String(l._lesid_at).slice(0, 10) : null].filter(Boolean).join(' · ') : null,
      a_bladi: l ? (l.heimilisfang || null) : null,
      matshluti: l ? (l.matshluti || null) : null,
    };
  };
  ut.heimildir = [...skran.map((r) => heimildAf(r, 'skraningartafla')), ...lys.map((r) => heimildAf(r, 'byggingarlysing'))];
  ut.olesin = ut.heimildir.filter((h) => !h.lesin).map((h) => ({ slod: h.slod, tegund: h.tegund, dags: h.dags, lysing: h.lysing }));

  // ── lestur skráningartöflu: nýjasta lesna blaðið sem á við húsið ─────────────
  const lesnar = skran.map((r) => ({ r, l: LESID.get(r.infoUrl) })).filter((x) => x.l && x.l.tegund === 'skraningartafla' && !x.l.ekki_tafla);
  const matshlutar = new Set(lesnar.map((x) => x.l.matshluti).filter(Boolean));
  let valin = null, samsvorun = null;
  // Hús lóðarinnar (lesnar töflur, nýjasta per matshluta): 451 leyfir að skipta milli þeirra (Höfðatorgsreiturinn:
  // S1 = Bríetartún 9–11, H1 Katrínartún 2, H2, bílageymsla — allar teikningar skráðar á „Borgartún 8-16A")
  const mhlYfirlit = new Map();
  lesnar.forEach((x) => { const k = x.l.matshluti || '—'; if (!mhlYfirlit.has(k)) mhlYfirlit.set(k, { matshluti: x.l.matshluti || null, a_bladi: x.l.heimilisfang || null, m2: x.l.bruttoflotur_m2 ?? null, haedir_ofan: x.l.haedir_ofan ?? null, eignir: Number.isFinite(x.l.eignir) ? x.l.eignir : null, dags: x.r.dags || null, slod: x.r.infoUrl }); });
  ut.matshlutar = [...mhlYfirlit.values()];
  if (mhl) {
    valin = lesnar.find((x) => String(x.l.matshluti || '') === String(mhl)) || null;
    if (valin) samsvorun = 'valið af notanda (matshluti ' + mhl + ')';
  }
  if (!valin && husLabel) {
    valin = lesnar.find((x) => x.l.heimilisfang && samaHus(x.l.heimilisfang, husLabel));
    if (valin) samsvorun = 'heimilisfang á blaðinu';
  }
  const tofluSkjol = skran.filter((r) => { const l = LESID.get(r.infoUrl); return !(l && l.ekki_tafla); });
  if (!valin && lesnar.length && matshlutar.size <= 1 && lesnar.length === tofluSkjol.length) {
    // Allar töflur lóðarinnar lesnar og einn matshluti: blaðið á við þótt heimilisfangið hafi ekki lesist.
    // EKKI ef aðeins hluti er lesinn — Þverholt 24 fékk annars tölur Þverholts 20 (1 af 11 töflum lesin).
    valin = lesnar[0];
    samsvorun = 'eini matshluti lóðarinnar';
  }
  if (!valin && lesnar.length) {
    const vantar = tofluSkjol.length - lesnar.length;
    ut.athugasemdir.push(`Ekkert lesið blað á við ${husLabel || 'húsið'} — lesnir matshlutar: ${[...matshlutar].sort().join(', ') || '?'}` +
      (vantar ? `; ${vantar} af ${tofluSkjol.length} töflum ólesnar` : '') + '. Engar tölur sýndar.');
  }
  if (!lesnar.length && skran.length) ut.athugasemdir.push((skran.length === 1 ? '1 skráningartafla fannst' : skran.length + ' skráningartöflur fundust') + ' en engin hefur verið lesin enn.');
  if (!skran.length) ut.athugasemdir.push('Engin skráningartafla í teikningasafninu.');

  if (valin) {
    const l = valin.l;
    const v = l.vissa || {};
    ut.m2 = l.bruttoflotur_m2 ?? null;
    ut.m2_birt = l.birt_flatarmal_m2 ?? null;
    ut.rummal_m3 = l.brutto_rummal_m3 ?? null;
    ut.haedir = l.haedir ? { ofanjardar: l.haedir_ofan, kjallari: !!l.kjallari, ris: !!l.ris, listi: l.haedir } : null;
    ut.eignir = Number.isFinite(l.eignir) ? l.eignir : null;
    // eignarhlutanúmerin sjálf (0101 … 0406): fyrstu tveir stafir = hæð („00" kjallari — oftast geymslur/bílastæði).
    // 451 telur íbúðir í íbúðarhúsi út frá þeim (Agnar 09.10.2026: „hvað það eru mörg … íbúðir í fjölbýlishúsum")
    ut.eignarhlutar = Array.isArray(l.eignarhlutar) ? l.eignarhlutar.map(String).slice(0, 600) : null;
    ut.oryggi.m2 = v.bruttoflotur_m2 || null;
    ut.oryggi.haedir = v.haedir || null;
    ut.oryggi.rummal = v.brutto_rummal_m3 || null;
    // Eignarhlutar = ólík númer í D4 (sameign X/Y ekki talin). Engin summa prófar þau → miðlungs í mesta lagi.
    ut.oryggi.eignir = ut.eignir != null ? 'miðlungs' : null;
    ut.skraningartafla = { slod: valin.r.infoUrl, dags: valin.r.dags, matshluti: l.matshluti || null, a_bladi: l.heimilisfang || null, samsvorun,
      summuprof: l.summuprof || null, lesid: l.lesid || null, adferd: l.adferd || null, lesid_af: l._uppruni || null };
    const nyrri = skran.filter((r) => String(r.dags || '') > String(valin.r.dags || '') && !LESID.get(r.infoUrl)).length;
    if (nyrri) ut.athugasemdir.push((nyrri === 1 ? '1 nýrri skráningartafla er á lóðinni, ólesin' : nyrri + ' nýrri skráningartöflur eru á lóðinni, ólesnar') + ' — tölurnar eru frá ' + valin.r.dags + '.');
    if (matshlutar.size > 1) ut.athugasemdir.push(`Lóðin hefur ${matshlutar.size} matshluta — tölurnar eiga við matshluta ${l.matshluti || '?'} (${l.heimilisfang || 'óþekkt heimilisfang'}).`);
    if (Number.isFinite(l.stigahus) && l.stigahus > 0) { ut.stigagangar = l.stigahus; ut.oryggi.stigagangar = 'lágt'; }
  }

  // ── byggingarlýsing: brunavarnir (aðeins þar sem hún hefur verið lesin) ──────
  const lysLesin = lys.map((r) => ({ r, l: LESID.get(r.infoUrl) })).filter((x) => x.l && x.l.tegund === 'byggingarlysing');
  ut.lysingar = lysLesin.map((x) => ({ slod: x.r.infoUrl, dags: x.r.dags, merking: x.r.gata || null, heimild: x.l.heimild || null, lesid_af: x.l._uppruni || null }));
  const bl = (husLabel ? lysLesin.find((x) => samaHus(x.r.gata || '', husLabel)) : null) || lysLesin[0];
  if (bl) {
    // stadir = staðsetningar búnaðar úr setningum lýsingarinnar (brúin, stadir.py) — TILLÖGUR, ekki staðfestar
    ut.brunavarnir = { slod: bl.r.infoUrl, dags: bl.r.dags, heimild: bl.l.heimild, efni: bl.l.efni || {}, tolur: bl.l.tolur || {}, lesid_af: bl.l._uppruni || null,
      stadir: bl.l.stadir || null, stadir_athugasemd: bl.l.stadir_athugasemd || null, athugasemd: bl.l.athugasemd || null };
    const t = bl.l.tolur || {};
    if (t.stigahus_nefnd && !ut.stigagangar) { ut.stigagangar = t.stigahus_nefnd; ut.oryggi.stigagangar = 'lágt'; }
    if (t.byggingarar) { ut.byggingarar = t.byggingarar; ut.oryggi.byggingarar = 'miðlungs'; }
    if (t.notkunarflokkur) ut.notkunarflokkur_lysing = t.notkunarflokkur;
  }
  // herbergi og hámarksfjöldi úr ÖLLUM lesnum lýsingum hússins (brúin: tolur.herbergi_nefnd, tolur.hamarksfjoldi_manns) —
  // lýsing með heimilisfangi hússins fyrst, annars nýjust (Agnar 09.10.2026: „hvað það eru mörg herbergi á hótelunum")
  const medTolu = (lyk) => lysLesin.filter((x) => x.l.tolur && Number.isFinite(+x.l.tolur[lyk]) && +x.l.tolur[lyk] > 0);
  const veljaLys = (a) => (husLabel ? a.find((x) => samaHus(x.r.gata || '', husLabel)) : null) || a[0];
  const hb = veljaLys(medTolu('herbergi_nefnd'));
  if (hb) ut.herbergi = { fjoldi: +hb.l.tolur.herbergi_nefnd, dags: hb.r.dags || null, slod: hb.r.infoUrl, heimild: hb.l.heimild || null };
  const hm = veljaLys(medTolu('hamarksfjoldi_manns'));
  if (hm) ut.hamarksfjoldi = { fjoldi: +hm.l.tolur.hamarksfjoldi_manns, dags: hm.r.dags || null, slod: hm.r.infoUrl };
  if (!ut.byggingarar) ut.athugasemdir.push('Byggingarár fannst ekki í lesinni byggingarlýsingu (Kaupskrá HMS er ekki notuð).');

  const s = [ut.oryggi.m2, ut.oryggi.haedir];
  ut.oryggi.heild = s.every((x) => x === 'há') ? 'hátt' : s.some((x) => x) ? 'miðlungs' : ut.heimildir.length ? 'aðeins hlekkir' : 'ekkert';
  return ut;
}

export default async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  const sp = new URL(req.url).searchParams;
  const heimilisfang = (sp.get('heimilisfang') || '').normalize('NFC').trim();
  const landnr = (sp.get('landnr') || '').replace(/[^0-9]/g, '');
  if (!landnr && heimilisfang.length < 4) return json({ error: 'heimilisfang eða landnr vantar' }, 400);
  if (heimilisfang && !thattaHeimilisfang(heimilisfang)) return json({ error: 'Heimilisfangið er ekki á sniðinu „Gata 12, 105 Bær"' }, 400);
  try {
    const mhl = (sp.get('mhl') || '').replace(/[^0-9A-Za-z]/g, '').slice(0, 4) || null;
    const v = await byggingUppl({ heimilisfang, landnr, mhl });
    // „fannst ekki" er svar (200 + error), ekki bilun — 404 kæmi sem rauð villa í vafraborðinu
    return json(v, 200);
  } catch (e) {
    return json({ error: 'Uppfletting mistókst: ' + (e && e.message ? e.message : e) }, 502);
  }
};
