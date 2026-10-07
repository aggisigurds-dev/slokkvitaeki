#!/usr/bin/env node
/**
 * VÖRÐUR: „NÝTT"-MERKI LIFA AF VISTUN TEIKNINGAR (Agnar 07.10.2026, Álfaborg 661)
 *
 * „ég var búinn að raða öllum tækjunum inn í TurboPaint.. en þau koma ekki á Teikningar … erum ekkert byrjaðir að setja
 * nein raðnúmer … koma bara með viðvörun um að það vanti fleiri skráð tæki á félagið,,, með merkinu kannski bara Nýtt??"
 * og „erum að fara bæta við tækjum í fasteignina, bara eftir að fá samþykki frá honum hvað hann vill fá mörg".
 *
 * TurboPaint („Vista í úttekt") tengir hvert ótengt tækjatákn við óstaðsett skráð tæki af sömu tegund; afgangurinn
 * vistast sem Nýtt-merki — TILLAGA sem bíður samþykkis eiganda, ALDREI skráð tæki:
 *     { unitId: "n:<lykill>:<id>", x, y, nytt: true, tegund: "Léttvatn", stada: "bid", staerd?, rot? }
 * `unitId` með n:-forskeyti (eins og stimplar s:…) er nauðsynlegt: sameining 375 (sameinaVidFerska) og afturköllun 433
 * para merki á unitId — merki ÁN unitId týnast í sameiningu og eyðing eins eyddi þeim öllum.
 *
 * Hér er prófað (les aðeins kóðann, ekkert net):
 *   1. 375 sameinaVidFerska heldur Nýtt-merkjum sem TurboPaint vistaði eftir að vafrinn sá röðina — með ÖLLUM reitum
 *   2. 375: Nýtt-merki sem var fært hér heldur nýju stöðunni; eytt hér kemur ekki aftur
 *   3. 433 afritMerki (afturkalla eyða/færa) heldur nytt / tegund / stada
 *   4. 434 lykillFyrir teiknar Nýtt sem tegundina (Léttvatn, CO2, Brunaslanga …), ekki „annað"
 *   5. 383 undirbua: Nýtt fær „Nýtt · <tegund>" í hlutlausu indígó — aldrei grænt (tengt) né rautt (komið fram yfir)
 *   6. 433: upplýsingalínan í tækjalistanum (systkini #fp-unit-list) og ekkert sem síar merki eftir tölulegu unitId
 *   node tools/audit-teikning-nytt.cjs
 */
const fs = require('fs');
const path = require('path');
const rot = path.join(__dirname, '..');
const les = p => fs.readFileSync(path.join(rot, p), 'utf8').replace(/\r/g, '');
const s375 = les('js/patches/375-teikning-vistun.js'), s433 = les('js/patches/433-teikning-merking.js');
const s434 = les('js/patches/434-teikning-takn.js'), s383 = les('js/patches/383-teikning-hreinsa-3d.js');
const villur = [];
const krefst = (src, re, skilabod) => { if (!re.test(src)) villur.push(skilabod); };
const bannar = (src, re, skilabod) => { if (re.test(src)) villur.push(skilabod); };
const nytt = (id, x, y, tegund) => ({ unitId: 'n:' + id, x, y, nytt: true, tegund, stada: 'bid' });
const M = (id, x, y) => ({ unitId: id, x, y });
const H = (id, merki) => ({ id, nafn: id, image_url: 'm1', markers: merki });

// ── 1–2. 375 sameinaVidFerska ────────────────────────────────────────────────────────────────────────────────────
let sam = null;
try {
  const a = s375.indexOf('  var _sed = {};'), b = s375.indexOf('  function uppfaeraRitil(');
  if (a < 0 || b < 0 || b < a) throw new Error('fann ekki sameinaVidFerska í 375');
  sam = new Function(s375.slice(a, b) + '; return sameinaVidFerska;')();
} catch (e) { villur.push('375: sameinaVidFerska hleðst ekki (' + e.message + ')'); }
if (sam) {
  // TurboPaint vistaði 3 Nýtt-merki á hæð a EFTIR að þessi vafri sá hana (sá aðeins tæki 1) → Vista hér heldur þeim
  {
    const sed = { ids: ['a'], merki: { a: ['1'] } };
    const ferskar = [H('a', [M(1, 10, 10), nytt('lettvatn:x1', 100, 100, 'Léttvatn'), nytt('slanga:x2', 200, 200, 'Brunaslanga'), M(8223, 300, 300)])];
    const ut = sam([H('a', [M(1, 15, 15)])], ferskar, sed);
    const n = (ut[0].markers || []).filter(m => m.nytt);
    if (n.length !== 2) villur.push('375: Nýtt-merki sem TurboPaint vistaði týndust við Vista í Teikningu — ' + n.length + ' af 2');
    else if (!n.every(m => m.tegund && m.stada === 'bid' && /^n:/.test(m.unitId))) villur.push('375: Nýtt-merki misstu reiti (tegund / stada / unitId) í sameiningu: ' + JSON.stringify(n));
    if (!(ut[0].markers || []).some(m => m.unitId === 8223)) villur.push('375: sjálftengt tæki (8223) frá TurboPaint týndist í sameiningu');
    if ((ut[0].markers || []).find(m => m.unitId === 1).x !== 15) villur.push('375: tæki sem var fært hér á að halda nýju stöðunni');
  }
  // Nýtt-merki fært hér → staðan héðan; Nýtt-merki eytt hér → kemur ekki aftur
  {
    const sed = { ids: ['a'], merki: { a: ['n:lettvatn:x1', 'n:slanga:x2'] } };
    const ferskar = [H('a', [nytt('lettvatn:x1', 100, 100, 'Léttvatn'), nytt('slanga:x2', 200, 200, 'Brunaslanga')])];
    const ut = sam([H('a', [nytt('lettvatn:x1', 140, 160, 'Léttvatn')])], ferskar, sed);
    const l = (ut[0].markers || []);
    if (l.length !== 1 || l[0].x !== 140 || l[0].tegund !== 'Léttvatn') villur.push('375: Nýtt fært hér / eytt hér rangt sameinað — ' + JSON.stringify(l));
  }
  // SKJALFEST: merki ÁN unitId lifir ekki sameiningu á hæð sem er til hér — þess vegna ber Nýtt alltaf n:-unitId
  {
    const sed = { ids: ['a'], merki: { a: ['1'] } };
    const ut = sam([H('a', [M(1, 1, 1)])], [H('a', [M(1, 1, 1), { x: 5, y: 5, nytt: true, tegund: 'Léttvatn' }])], sed);
    if ((ut[0].markers || []).some(m => m.nytt && m.unitId == null)) villur.push('375: sameining hélt merki án unitId — endurskoðaðu reglu Nýtt-merkja (n:-unitId) í hausnum');
  }
}

// ── 3. 433 afritMerki ────────────────────────────────────────────────────────────────────────────────────────────
try {
  const a = s433.indexOf('  function afritMerki(m) {'), b = s433.indexOf('  function undoLykill()');
  if (a < 0 || b < 0) throw new Error('fann ekki afritMerki');
  const afrit = new Function(s433.slice(a, b) + '; return afritMerki;')();
  const m = Object.assign(nytt('co2:z9', 7, 8, 'CO2'), { staerd: 40, rot: 90 });
  const k = afrit(m);
  if (JSON.stringify(k) !== JSON.stringify(m)) villur.push('433: afritMerki (afturkalla) sviptir merki reitum — fékk ' + JSON.stringify(k));
  if (k === m) villur.push('433: afritMerki verður að skila AFRITI, ekki sama hlut');
} catch (e) { villur.push('433: afritMerki hleðst ekki (' + e.message + ')'); }
krefst(s433, /const erNytt = m => !!\(m && \(m\.nytt === true \|\| \(typeof m\.unitId === 'string' && String\(m\.unitId\)\.indexOf\('n:'\) === 0\)\)\);/, '433: erNytt (nytt: true eða n:-unitId) vantar');
krefst(s433, /if \(erNytt\(m\)\) return 'Nýtt · ' \+ \(m\.tegund \|\| 'tæki'\) \+ ' \(í bið/, '433: nafnMerkis á að segja „Nýtt · <tegund> (í bið …)"');

// ── 4. 434 lykillFyrir ───────────────────────────────────────────────────────────────────────────────────────────
try {
  const a = s434.indexOf('  function fjold(u) {'), b = s434.indexOf('  function teiknaGlyff(');
  if (a < 0 || b < 0) throw new Error('fann ekki fjold/lykillFyrir');
  const lyk = new Function('const STIMPIL_LYKILL = { hose: "hose", ut: "ut" }, SJALF = {}, LITIR = {};' + s434.slice(a, b) + '; return lykillFyrir;')();
  const units = [{ id: 8214, type: 'Léttvatn' }];
  const prof = [
    [nytt('lettvatn:a', 0, 0, 'Léttvatn'), 'lettvatn'], [nytt('co2:b', 0, 0, 'CO2'), 'co2'], [nytt('slanga:c', 0, 0, 'Brunaslanga'), 'slanga'],
    [nytt('duft:d', 0, 0, 'ABC Duft'), 'duft'], [M(8214, 0, 0), 'lettvatn'], [{ unitId: 's:ut:x', kind: 'sign', sign: 'ut' }, 'ut'],
  ];
  for (const [m, vaent] of prof) {
    const f = lyk(m, units);
    if (f !== vaent) villur.push('434: lykillFyrir(' + JSON.stringify(m) + ') = ' + f + ', átti að vera ' + vaent);
  }
} catch (e) { villur.push('434: lykillFyrir hleðst ekki (' + e.message + ')'); }
krefst(s434, /if \(erNytt\(mk\)\) nyttMidi\(ctx, mk, mx, my, size\);/, '434: Nýtt-merki fá miðann „Nýtt · <tegund>" undir tákninu í 2D');
krefst(s434, /const texti = 'Nýtt · ' \+ \(m\.tegund \|\| 'tæki'\);/, '434: miðinn er „Nýtt · <tegund>"');

// ── 5. 383 undirbua ──────────────────────────────────────────────────────────────────────────────────────────────
krefst(s383, /if \(mk\.nytt === true \|\| \(typeof mk\.unitId === 'string' && String\(mk\.unitId\)\.indexOf\('n:'\) === 0\)\) \{\s+return \{ x: px, y: py, litur: '#4f46e5', texti: 'Nýtt · ' \+ \(mk\.tegund \|\| 'tæki'\), gerd: gerdTaekis\(mk\.tegund\), nytt: true \};/,
  '383 undirbua: Nýtt-merki fá „Nýtt · <tegund>" í indígó (#4f46e5) og líkan tegundarinnar — ekki grænt/rautt tæki');
{
  const i = s383.indexOf("if (mk.nytt === true"), j = s383.indexOf('const u = einingar.find(q => q.id === mk.unitId);');
  if (i < 0 || j < 0 || i > j) villur.push('383 undirbua: Nýtt-greinin verður að koma Á UNDAN uppflettingu tækisins (annars grænt tæki án miða)');
}

// ── 6. 433 upplýsingalína + engin sía á tölulegt unitId ──────────────────────────────────────────────────────────
krefst(s433, /el\.id = 'fp-nytt';/, '433: upplýsingalínan #fp-nytt vantar');
krefst(s433, /if \(listi && listi\.parentNode === panel\) panel\.insertBefore\(el, listi\.nextSibling\);/, '433: #fp-nytt á að vera SYSTKINI #fp-unit-list (raðir listans parast við F.units eftir sæti)');
krefst(s433, /if \(el\.textContent !== texti\) el\.textContent = texti;/, '433: #fp-nytt skrifast aðeins ef textinn breyttist (MutationObserver-lykkja)');
krefst(s433, /'Nýtt \(óskráð\): ' \+ t\.n \+ ' — ' \+ t\.n \+ ' ný tæki í biðstöðu, bíða samþykkis: '/, '433: línan segir „Nýtt (óskráð): N — N ný tæki í biðstöðu, bíða samþykkis: …" (ekki „Vantar")');
for (const [nafn, src] of [['375', s375], ['433', s433], ['383', s383]]) {
  bannar(src, /markers\s*=\s*[^;\n]*\.filter\([^)]*typeof\s+\w+\.unitId\s*===\s*['"]number['"]/, nafn + ': sía á TÖLULEGT unitId hendir Nýtt-merkjum (n:…) og stimplum við vistun');
}

if (villur.length) {
  console.log('RAUTT — Nýtt-merki Teikningar (' + villur.length + '):');
  villur.forEach(v => console.log('  ✗ ' + v));
  process.exit(1);
}
console.log('GRÆNT — Nýtt-merki lifa af vistun Teikningar (375 sameining, 433 afturköllun), teiknast sem tegundin í 2D (434) og „Nýtt · <tegund>" í 3D (383)');
