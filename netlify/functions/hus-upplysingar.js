/**
 * Húsupplýsingar úr opinberum skrám — fyrir fyrirtækjabannerinn (patch 363).
 *
 * Agnar 14.09.2026: „Can you [get] some details of the buildings that could
 * benefit us here as well" — hæðir, kjallari, jarðhæð o.fl. eiga ekki að
 * þurfa að slást inn ef skrárnar vita það.
 *
 *   GET /.netlify/functions/hus-upplysingar?heimilisfang=Dalshrauni 1b, 220 Hafnarfirði
 *   → { eign:      { landnr, heitinr, postnr, label, gata, husnr, svf, heimildNafn },
 *       tillogur:  { haedir: '4', kjallari: 'yes', jardhaed: 'yes', ris: 'yes' }  (aðeins það sem fannst)
 *       teikningar:{ fjoldi, gildandi, grunnmyndir, haedir: [1,2,3,4], stig: ['Kjallari'] },
 *       heimild:   'Kortasjá Hafnarfjarðar · 25 grunnmyndir',
 *       turbopaint:'https://slokkvitaeki.vercel.app/kjarni/turbopaint?leit=Dalshraun%201B' }
 *
 * ÞREP 1 — heimilisfang → lóð. Staðfangaskrá HMS (WFS á geo.fasteignaskra.is,
 *   fasteignaskra:VSTADF_ALLT) flett upp NÁKVÆMLEGA á götuheiti + húsnúmeri
 *   (+ bókstaf, + póstnúmeri). Götuheitið er borið saman bæði í nefnifalli og
 *   ÞÁGUFALLI (HEITI_NF / HEITI_TGF) af því heimilisföngin í `fyrirtaeki` eru
 *   ýmist „Dalshraun 1b" eða „Dalshrauni 1b". Staðfest 14.09.2026:
 *   „Dalshrauni 1b" → Dalshraun 1B, L 212944 / H 1128776 / 220. Bil („9-11") →
 *   fyrsta númerið (Bríetartún 9 og 11 deila landnúmeri 199350).
 *   Fallvörn: lausa leitin í Landeignaskrá (sama og /landnr) ef ekkert finnst —
 *   en hún er ÓVISS („Borgartún 12" → lóðin „Borgartún 8-16A") og gefur því
 *   aðeins teikningatengilinn, ALDREI hæða-tillögur (eign.oviss = true).
 *
 *   SVÆÐISVÖRÐUR: þegar bókstaf/póstnúmeri er sleppt í leitinni má svarið aðeins
 *   koma úr sama sveitarfélagi (210 og 212 eru bæði Garðabær) — „Borgartún 12,
 *   105" fann annars Borgartún 12 á Djúpavogi (785) af því 12-14 í Reykjavík er
 *   ekki skráð sem húsnúmer 12. Sveitarfélagið er lesið úr SVFNR-reit
 *   Staðfangaskrár (0000 = Reykjavík, 1000/1300/1400 = map.is-bæirnir) og
 *   póstnúmeralistinn er aðeins varaleið.
 *
 * ÞREP 2 — lóð → teikningar. Sama þjónusta og TurboPaint notar
 *   (kjarni: /api/turbopaint/teikningar): FotoWeb-safn Reykjavíkur á landnúmeri,
 *   kortasjár map.is (Hafnarfjörður 1400, Garðabær 1300, Kópavogur 1000) á
 *   landnúmeri + heitinúmeri. Hún þáttar hæðirnar úr lýsingu hverrar teikningar.
 *
 * ÞREP 3 — teikningar → tillögur. Hæsta hæðarnúmer grunnmyndanna = hæðir ofan
 *   jarðar; „kjallari"/„jarðhæð"/„ris" í lýsingum = já. Þetta eru TILLÖGUR
 *   (bannerinn sýnir þær sem flísar, aldrei vistað sjálfkrafa) — teikningasöfn
 *   ná ekki alltaf yfir nýjustu breytingar á húsi.
 *   SAMEIGINLEG LÓÐ: eitt landnúmer getur átt mörg hús (Höfðatorg: Bríetartún
 *   9-11 deilir L 199350 með 19 hæða turninum á Katrínartúni 2 og Borgartúni
 *   8-16A). Reykjavíkur-safnið merkir hverja teikningu heimilisfangi (`gata`);
 *   sé það til staðar eru AÐEINS teikningar sem nefna götuna+númerið sem leitað
 *   var að notaðar í tillögurnar — finnist engin slík eru engar hæðir stungnar
 *   upp á (teikningafjöldinn og tengillinn í TurboPaint sýnast samt). Söfn
 *   map.is merkja ekki götu; þar er lóðin tekin sem heild.
 *
 * TÍMAFRESTUR: Netlify sker samstillt fall við 10 s. Fyrsta kall fyrir stóra lóð
 * (kalt kjarni-API + ný map.is-seta + 1000 raðir) mældist 10,7 s í heild 14.09.2026.
 * Því fær hvert kall sameiginlegan 8,5 s frest (FRESTUR_MS): renni hann út skilar
 * fallið eigninni + tenglinum með `error` og 200 — bannerinn sýnir tengilinn og
 * reynir aftur eftir smástund (þá er allt orðið heitt og svarið kemur á <1 s).
 *
 * Fjöldi íbúða/stigaganga/herbergja er EKKI opinber: Fasteignaskrá HMS selur
 * þær upplýsingar í áskrift (api.hms.is svarar 403) og hms.is er læst á bak við
 * botvörn. Þeir reitir standa því áfram handvirkir.
 */
const WFS = 'https://geo.fasteignaskra.is/ws/geoserver/wfs';
const LANDEIGN = 'https://geo.fasteignaskra.is/landeignaskra/search';
const KJARNI = process.env.KJARNI_TEIKNINGAR_API || 'https://slokkvitaeki.vercel.app/api/turbopaint/teikningar';
const TURBOPAINT = 'https://slokkvitaeki.vercel.app/kjarni/turbopaint';

const RVK_POSTNR = new Set([101, 102, 103, 104, 105, 107, 108, 109, 110, 111, 112, 113, 116, 121, 123, 124, 125, 127, 128, 129, 130, 132, 155, 161, 162]);
const MAPIS = [
  { svf: 1000, nafn: 'Kópavogur', kort: 'Kortasjá Kópavogs', postnr: [200, 201, 202, 203] },
  { svf: 1300, nafn: 'Garðabær', kort: 'Kortasjá Garðabæjar', postnr: [210, 211, 212, 225] },
  { svf: 1400, nafn: 'Hafnarfjörður', kort: 'Kortasjá Hafnarfjarðar', postnr: [220, 221] },
];

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};
const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });

// Sama heimilisfang er flett upp í hvert sinn sem bannerinn teiknast — skyndiminni
// í fallinu sjálfu (lifir meðan Netlify heldur tilvikinu vakandi).
const minni = new Map();
const MINNI_MS = 10 * 60 * 1000;
const FRESTUR_MS = 8500;
/** Tímamerki sem virðir sameiginlega frestinn: minnst 800 ms, mest það sem eftir er. */
const frestur = (deadline, hamark) => AbortSignal.timeout(Math.max(800, Math.min(hamark, deadline - Date.now())));

/** „Dalshrauni 1b, 220 Hafnarfirði" → { gata:'Dalshrauni', husnr:1, bokst:'b', postnr:220, husnr2:null } */
export function thattaHeimilisfang(raw) {
  const t = String(raw || '').normalize('NFC').replace(/\s+/g, ' ').trim();
  if (!t) return null;
  const fyrsti = t.split(',')[0].trim();
  const m = /^(.+?)\s+(\d{1,4})\s*([a-zA-ZáðéíóúýþæöÁÐÉÍÓÚÝÞÆÖ])?(?:\s*[-–]\s*(\d{1,4})\s*([a-zA-ZáðéíóúýþæöÁÐÉÍÓÚÝÞÆÖ])?)?\b/.exec(fyrsti);
  if (!m) return null;
  const postnr = Number((/\b(\d{3})\b/.exec(t.slice(fyrsti.length)) || [])[1]) || Number((/\b(\d{3})\b/.exec(t) || [])[1]) || null;
  return {
    gata: m[1].trim(),
    husnr: Number(m[2]),
    bokst: (m[3] || '').toUpperCase() || null,
    husnr2: m[4] ? Number(m[4]) : null,
    postnr: postnr && postnr >= 100 && postnr <= 999 ? postnr : null,
  };
}

const cqlStr = (s) => "'" + String(s).replace(/'/g, "''") + "'";

async function wfsStadfang(h, medBokst, medPostnr, deadline) {
  const bitar = [`(HEITI_NF ILIKE ${cqlStr(h.gata)} OR HEITI_TGF ILIKE ${cqlStr(h.gata)})`, `HUSNR=${h.husnr}`];
  if (medBokst && h.bokst) bitar.push(`BOKST ILIKE ${cqlStr(h.bokst)}`);
  if (medPostnr && h.postnr) bitar.push(`POSTNR=${h.postnr}`);
  const url = `${WFS}?service=WFS&version=1.1.0&request=GetFeature&typename=fasteignaskra:VSTADF_ALLT&outputFormat=application/json&maxFeatures=10&CQL_FILTER=${encodeURIComponent(bitar.join(' AND '))}`;
  const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Slokkvitaeki/1.0)' }, signal: frestur(deadline, 6000) });
  if (!r.ok) throw new Error('Staðfangaskrá svaraði ' + r.status);
  const d = await r.json();
  const fs = Array.isArray(d.features) ? d.features : [];
  return fs.map((f) => f.properties || {}).filter((p) => p.LANDNR);
}

/** Nákvæm uppfletting; sleppir bókstaf, svo póstnúmeri, ef nákvæma leitin finnur ekkert. */
async function finnaStadfang(h, deadline) {
  const tilraunir = [[true, true], [true, false], [false, true], [false, false]];
  for (const [b, p] of tilraunir) {
    if (!b && !h.bokst && !p && !h.postnr) continue;
    const rows = (await wfsStadfang(h, b, p, deadline)).filter((r) => samaSvaedi(h, r));
    if (rows.length) {
      // Bókstafslaust heimilisfang: taka bókstafslausu röðina fram yfir 1A/1B.
      rows.sort((x, y) => (x.BOKST ? 1 : 0) - (y.BOKST ? 1 : 0));
      return rows[0];
    }
  }
  return null;
}

/** „Borgartún  8-16A (105) - L 199350" → { fra:8, til:16 } — húsnúmerabil lóðarmerkingar (null = ekkert númer). */
function husbil(label) {
  const m = /^\D+?\s+(\d{1,4})\s*[a-zA-ZáðéíóúýþæöÁÐÉÍÓÚÝÞÆÖ]?(?:\s*[-–]\s*(\d{1,4}))?/.exec(label);
  if (!m) return null;
  return { fra: Number(m[1]), til: m[2] ? Number(m[2]) : Number(m[1]) };
}

/** Fallvörn: lausa leitin (sama og /.netlify/functions/landnr). Tekur aðeins lóð sem ber
 *  húsnúmerið sem leitað var að (eða bil sem það lendir í) í sama sveitarfélagi. */
async function landeignLeit(texti, postnr, husnr, deadline) {
  const r = await fetch(`${LANDEIGN}?term=${encodeURIComponent(texti)}`, { headers: { 'User-Agent': 'Mozilla/5.0 (Slokkvitaeki/1.0)', Accept: 'application/json, */*' }, signal: frestur(deadline, 5000) });
  if (!r.ok) return null;
  let raw;
  try { raw = JSON.parse(await r.text()); } catch (_) { return null; }
  if (!Array.isArray(raw)) return null;
  const rows = raw.filter((x) => x.Landnr).map((x) => {
    const label = String(x.Vef_Birting || '').replace(/\s+/g, ' ').trim();
    return { LANDNR: Number(x.Landnr), HEINUM: x.Heinum ? Number(x.Heinum) : null, POSTNR: Number((label.match(/\((\d{3})\)/) || [])[1]) || null, SVFNR: null, VEF_BIRTING: label, HEITI_NF: label.replace(/\s*\d.*$/, ''), HUSNR: Number((label.match(/\s(\d{1,4})/) || [])[1]) || null, BOKST: null };
  }).filter((x) => samaSvaedi({ postnr }, x)).filter((x) => {
    const b = husbil(x.VEF_BIRTING);
    return b && husnr >= b.fra && husnr <= b.til && (b.til === b.fra || (husnr - b.fra) % 2 === 0);
  });
  if (!rows.length) return null;
  const valin = rows.find((x) => postnr && x.POSTNR === postnr) || rows[0];
  valin.OVISS = true;
  return valin;
}

/** Svæði heimilisfangs: 'rvk', map.is-sveitarfélagsnúmer, eða 'p<postnr>' fyrir óþekkt svæði. */
function svaediFyrir(postnr, svfnr) {
  const sv = svfnr != null && String(svfnr).trim() !== '' ? Number(svfnr) : null;
  if (sv === 0) return 'rvk';
  if (sv && MAPIS.some((m) => m.svf === sv)) return sv;
  if (postnr && RVK_POSTNR.has(postnr)) return 'rvk';
  const m = postnr ? MAPIS.find((x) => x.postnr.includes(postnr)) : null;
  if (m) return m.svf;
  if (sv) return 's' + sv;
  return postnr ? 'p' + postnr : null;
}

/** Má nota þessa Staðfangaskrár-röð fyrir heimilisfangið? Sama póstnúmer, eða sama sveitarfélag. */
function samaSvaedi(h, row) {
  if (!h.postnr) return true;
  const rp = Number(row.POSTNR) || null;
  if (rp === h.postnr) return true;
  const a = svaediFyrir(h.postnr, null);
  const b = svaediFyrir(rp, row.SVFNR);
  return a != null && a === b;
}

function heimildFyrir(postnr, svfnr) {
  const sv = svaediFyrir(postnr, svfnr);
  if (sv === 'rvk') return { heimild: 'reykjavik', svf: null, nafn: 'Skjalasafn Reykjavíkur' };
  const m = MAPIS.find((x) => x.svf === sv);
  if (m) return { heimild: 'map.is', svf: m.svf, nafn: m.kort };
  return { heimild: null, svf: null, nafn: null };
}

/** „Borgartún 8-16A" → { gata:'borgartun', fra:8, til:16 } — bókstafslaus lykill fyrir samanburð. */
function gotulykill(texti) {
  const h = thattaHeimilisfang(texti);
  if (!h) return null;
  const gata = h.gata.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z]/g, '');
  return { gata, fra: h.husnr, til: h.husnr2 || h.husnr };
}

/** Á teikning merkt „Borgartún 8-16A" við Borgartún 12? Sama gata og númerið innan bilsins (bilið tekur bara sléttar/oddatölur með sér eins og götunúmer gera). */
function somuGotu(merki, leit) {
  if (!merki || !leit || merki.gata !== leit.gata) return false;
  if (leit.til < merki.fra || leit.fra > merki.til) return false;
  const bil = merki.til > merki.fra;
  return !bil || (leit.fra - merki.fra) % 2 === 0;
}

/**
 * Hæðir/kjallari/jarðhæð/ris úr teikningalistanum sem TurboPaint-þjónustan þáttaði.
 * `heimilisfang` (t.d. „Bríetartún 9") síar lóð með mörgum húsum: þegar teikningarnar
 * bera götu-merki er aðeins það hús notað sem leitað var að.
 */
export function tillogurUrTeikningum(results, heimilisfang) {
  const allar = Array.isArray(results) ? results : [];
  const leit = heimilisfang ? gotulykill(heimilisfang) : null;
  const merktar = allar.filter((t) => t && t.gata);
  let rows = allar;
  let sia = null;                                   // 'hus' = síað á húsið, 'ekkert' = lóðin nefnir húsið hvergi
  if (leit && merktar.length) {
    const minar = merktar.filter((t) => somuGotu(gotulykill(t.gata), leit));
    if (minar.length) { rows = minar; sia = 'hus'; }
    else { rows = []; sia = 'ekkert'; }
  }
  const gild = rows.filter((t) => !t.urelt);
  const grunn = (gild.length ? gild : rows).filter((t) => t && (t.grunnmynd || (t.haed && t.haed.length) || (t.stig && t.stig.length)));
  const haedir = new Set();
  const stig = new Set();
  for (const t of grunn) {
    (t.haed || []).forEach((h) => { if (Number.isFinite(h) && h > 0 && h < 60) haedir.add(h); });
    (t.stig || []).forEach((s) => stig.add(s));
    if (t.kjallari) stig.add('Kjallari');
    if (t.ris) stig.add('Ris');
  }
  const ut = {};
  const max = haedir.size ? Math.max(...haedir) : 0;
  if (max > 0) ut.haedir = String(max);
  else if (stig.has('Jarðhæð')) ut.haedir = '1';
  if (stig.has('Kjallari')) ut.kjallari = 'yes';
  if (stig.has('Jarðhæð')) ut.jardhaed = 'yes';
  if (stig.has('Ris')) ut.ris = 'yes';
  return {
    tillogur: ut,
    teikningar: {
      fjoldi: allar.length,
      gildandi: allar.filter((t) => !t.urelt).length,
      husid: sia ? rows.length : null,               // teikningar merktar húsinu sjálfu (null = lóðin er ekki merkt eftir húsum)
      sia,
      grunnmyndir: grunn.length,
      haedir: [...haedir].sort((a, b) => a - b),
      stig: [...stig],
    },
  };
}

function lysaHeimild(nafn, teik, label) {
  const bitar = [];
  if (teik.haedir.length) bitar.push(teik.haedir.length === 1 ? `${teik.haedir[0]}. hæð` : `${teik.haedir[0]}.–${teik.haedir[teik.haedir.length - 1]}. hæð`);
  bitar.push(...teik.stig.map((s) => s.toLowerCase()));
  if (teik.sia === 'ekkert') return `${nafn} · ${teik.fjoldi} teikningar á lóðinni, engin merkt ${label} — engar tillögur`;
  const hus = teik.sia === 'hus' ? ` merktum ${label}` : '';
  return `${nafn} · ${teik.grunnmyndir} grunnmynd${teik.grunnmyndir === 1 ? '' : 'ir'}${bitar.length ? ' (' + bitar.join(', ') + ')' : ''} af ${teik.sia === 'hus' ? teik.husid : teik.fjoldi} teikningum${hus}${teik.sia === 'hus' && teik.husid !== teik.fjoldi ? ` (${teik.fjoldi} á lóðinni)` : ''}`;
}

export async function husUpplysingar(heimilisfang, frestMs = FRESTUR_MS) {
  const h = thattaHeimilisfang(heimilisfang);
  if (!h) return { error: 'Heimilisfangið er ekki á sniðinu „Gata 12, 220 Bær"', ogilt: true };
  const deadline = Date.now() + frestMs;

  let st = null;
  try { st = await finnaStadfang(h, deadline); } catch (_) { st = null; }
  if (!st) {
    try { st = await landeignLeit(`${h.gata} ${h.husnr}${h.bokst ? h.bokst : ''}`, h.postnr, h.husnr, deadline); } catch (_) { st = null; }
  }
  if (!st) return { error: 'Fann ekki heimilisfangið í Staðfangaskrá HMS', eign: null };

  const postnr = Number(st.POSTNR) || h.postnr || null;
  const oviss = !!st.OVISS;
  // Óviss lóð: merking lóðarinnar sjálfrar („Borgartún 8-16A"), ekki húsnúmerið sem beðið var um.
  const label = oviss
    ? String(st.VEF_BIRTING || '').replace(/\s*\(.*$/, '').trim() || `${h.gata} ${h.husnr}`
    : `${st.HEITI_NF || h.gata} ${st.HUSNR || h.husnr}${st.BOKST ? String(st.BOKST).toUpperCase() : ''}`;
  const hm = heimildFyrir(postnr, st.SVFNR);
  const eign = {
    landnr: Number(st.LANDNR), heitinr: st.HEINUM ? Number(st.HEINUM) : null, postnr, label,
    gata: st.HEITI_NF || h.gata, husnr: st.HUSNR || h.husnr, svfnr: st.SVFNR != null ? String(st.SVFNR) : null, svf: hm.svf, heimildNafn: hm.nafn,
    oviss,
  };
  const turbopaint = `${TURBOPAINT}?leit=${encodeURIComponent(label)}`;

  if (!hm.heimild) {
    return { eign, tillogur: {}, teikningar: null, heimild: null, turbopaint, athugasemd: 'Ekkert teikningasafn tengt þessu póstnúmeri (Reykjavík, Kópavogur, Garðabær, Hafnarfjörður).' };
  }
  const q = hm.heimild === 'reykjavik'
    ? `landnr=${eign.landnr}`
    : `landnr=${eign.landnr}&heitinr=${eign.heitinr || 0}&svf=${hm.svf}`;
  let d;
  try {
    const r = await fetch(`${KJARNI}?${q}`, { headers: { 'User-Agent': 'Slokkvitaeki-banner/1.0' }, signal: frestur(deadline, 25000) });
    d = await r.json();
    if (!r.ok || d.error) return { eign, tillogur: {}, teikningar: null, heimild: hm.nafn, turbopaint, error: d.error || ('Teikningaþjónustan svaraði ' + r.status), reynaAftur: true };
  } catch (e) {
    const timi = e && (e.name === 'TimeoutError' || e.name === 'AbortError');
    return { eign, tillogur: {}, teikningar: null, heimild: hm.nafn, turbopaint, error: timi ? 'Teikningaþjónustan svaraði ekki í tæka tíð' : 'Náði ekki í teikningaþjónustuna', reynaAftur: true };
  }
  const { tillogur, teikningar } = tillogurUrTeikningum(d.results, oviss ? null : label);
  if (oviss) {
    // Lóðin er ágiskun — teikningarnar má skoða, en engar tillögur í reitina.
    return { eign, tillogur: {}, teikningar, heimild: `${hm.nafn} · ${h.gata} ${h.husnr} er ekki í Staðfangaskrá; næsta lóð er ${label} (${teikningar.fjoldi} teikningar) — engar tillögur`, turbopaint };
  }
  return { eign, tillogur, teikningar, heimild: teikningar.fjoldi ? lysaHeimild(hm.nafn, teikningar, label) : `${hm.nafn} · engar teikningar skráðar`, turbopaint };
}

export default async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  const url = new URL(req.url);
  const heimilisfang = (url.searchParams.get('heimilisfang') || '').normalize('NFC').trim();
  if (heimilisfang.length < 4) return json({ error: 'heimilisfang vantar' }, 400);
  const lykill = heimilisfang.toLowerCase();
  const gamalt = minni.get(lykill);
  if (gamalt && Date.now() - gamalt.t < MINNI_MS) return json(gamalt.v);
  try {
    const v = await husUpplysingar(heimilisfang);
    v.utgafa = '2026-09-14';
    if ((!v.error || v.eign) && !v.reynaAftur) minni.set(lykill, { t: Date.now(), v });
    return json(v, v.ogilt ? 400 : v.error && !v.eign ? 404 : 200);
  } catch (e) {
    return json({ error: 'Uppfletting mistókst: ' + (e && e.message ? e.message : e) }, 502);
  }
};
