#!/usr/bin/env node
/**
 * VÖRÐUR: 3D-SÝN TEIKNINGA (383) — heilir veggir, ekki girðing.
 *
 * Agnar 04.10.2026 (skjáskot af Fiskislóð 41 í 3D, veggirnir stóðu eins og girðing): „pæla hvort það sé hægt að ná betri
 * niðurstöðu heldur en við berum með núna" · „Some walls still missing" · „try some of the center hotels … multi floor".
 *
 * ORSÖKIN var gögnin, ekki teiknarinn: CAD teiknar vegg sem TVÆR línur með endastrikum, og gamla leiðin málaði strikin
 * í grímu og lyfti henni í ~420 reita rist. Mælt 04.10.2026 (headless Chrome, staðbundin bygging, engin skrif):
 *   Fiskislóð 41 (vigur-PDF)      777 strik → 48 heilir veggir, 245 m, húsið 32,9 × 41,2 m · 11 glerfletir, 33 m
 *   Miðgarður 1. hæð (skönnuð TIF) veggjagríma → 106 veggir (skáveggir með) í stað kubba og stafasúlna; 6 hæðir í 3D
 *
 * Þrjár reiknireglur bera þetta, og hver þeirra er PRÓFUÐ HÉR á tilbúnum gögnum (ekki bara leitað að nafni hennar):
 *   1. heilirVeggir   — vigurstrik pöruð í veggi (miðlína + þykkt), samlínu bútar sameinaðir yfir súlur, horn smellt saman.
 *   2. veggirUrGrimu  — veggjagríma skönnunar lesin sem langir jafnþykkir borðar; klessur (stafir, tákn) verða ekki veggir.
 *   3. glerIBilum     — bil milli veggbúta á sömu línu er gler ef teikningin sýnir ≥ 2 samsíða línur þar; autt hurðargat
 *                       og stök áslína eru það ekki.
 * Og tengingin: undirbua() verður að rétta syna3d heilu veggina (butar) — annars er gríman lyft eins og áður.
 *
 * SOURCE-only, engin net-köll. Fall: exit 1.
 */
const fs = require('fs');
const path = require('path');
const src = fs.readFileSync(path.join(__dirname, '..', 'js/patches/383-teikning-hreinsa-3d.js'), 'utf8').replace(/\r/g, '');
const villur = [];
const but = (a, b) => { const i = src.indexOf(a), j = src.indexOf(b); if (i < 0 || j < 0 || j < i) { villur.push('383: fann ekki bútinn „' + a.trim().slice(0, 40) + '" … „' + b.trim().slice(0, 40) + '"'); return ''; } return src.slice(i, j); };

const m = {};
try {
  new Function('ut', but('  function summutafla', '  /** mynd: <img> eða <canvas>') + but('  const sameinaBil = ', '  const BAKGRUNNUR_3D') +
    '; Object.assign(ut, { heilirVeggir, klippaButa, veggirUrGrimu, heilirUrGrimu, glerIBilum });')(m);
} catch (e) { villur.push('383: reiknireglurnar hlaðast ekki sjálfstætt (' + e.message + ') — þær verða að vera hrein gagnavinnsla án DOM'); }

const lengd = v => Math.hypot(v[2] - v[0], v[3] - v[1]);
if (m.heilirVeggir) {
  // 1a · tvöfaldur ferhyrningur (veggþykkt 8 px ≈ 3,2 pt á 6006 px blaði) með súlubili í efri veggnum → FJÓRIR veggir
  const k = 6006 / 2384, T = 8, strik = [];
  const kassi = (x0, y0, x1, y1) => strik.push([x0, y0, x1, y0], [x1, y0, x1, y1], [x1, y1, x0, y1], [x0, y1, x0, y0]);
  kassi(1000, 1000, 2000, 1800); kassi(1000 + T, 1000 + T, 2000 - T, 1800 - T);
  // súla: efri veggurinn rofinn á 30 px bili (≈ 0,4 m) — á að sameinast; og endastrik sitt hvoru megin
  const efri = strik.filter(s => s[1] === s[3] && (s[1] === 1000 || s[1] === 1000 + T));
  for (const s of efri) { const [a, b] = [Math.min(s[0], s[2]), Math.max(s[0], s[2])]; strik.splice(strik.indexOf(s), 1, [a, s[1], 1400, s[1]], [1430, s[1], b, s[1]]); }
  strik.push([1400, 1000, 1400, 1000 + T], [1430, 1000, 1430, 1000 + T]);
  const V = m.heilirVeggir(strik, 4244, 6006);
  if (V.length !== 4) villur.push('heilirVeggir: tvöfaldur ferhyrningur með súlubili á að verða 4 veggir, varð ' + V.length);
  else {
    if (V.some(v => Math.abs(v[4] - T) > 1.5)) villur.push('heilirVeggir: veggþykktin á að vera bilið milli línanna (' + T + ' px), fékk ' + V.map(v => v[4].toFixed(1)).join(', '));
    const heild = V.reduce((s, v) => s + lengd(v), 0);
    if (Math.abs(heild - 2 * (1000 - T + 800 - T)) > 40) villur.push('heilirVeggir: heildarlengd miðlína röng (' + Math.round(heild) + ' px) — horn eiga að mætast á miðlínu, súlubil að lokast');
  }
  // 1b · hurðargat (120 px ≈ 1,7 m) má EKKI lokast
  const hurd = [[100, 500, 900, 500], [100, 508, 900, 508], [1020, 500, 1800, 500], [1020, 508, 1800, 508]];
  const Vh = m.heilirVeggir(hurd, 4244, 6006);
  if (Vh.length !== 2) villur.push('heilirVeggir: veggur með 120 px hurðargati á að vera TVEIR veggir (gatið helst opið), varð ' + Vh.length);
  // 1c · einfaldar línur (ekki tvær hliðar) → hvert langt strik veggur
  const Ve = m.heilirVeggir([[100, 100, 900, 100], [900, 100, 900, 700], [900, 700, 100, 700], [100, 700, 100, 100]], 4244, 6006);
  if (Ve.length !== 4) villur.push('heilirVeggir: fjórar einfaldar línur eiga að verða fjórir veggir (varaleið), varð ' + Ve.length);
  // 1d · klipping við skurð skilar hnitum SKORNU myndarinnar
  const K = m.klippaButa([[50, 500, 950, 500, 6]], { x: 100, y: 400, w: 600, h: 300 });
  if (K.length !== 1 || Math.abs(K[0][0]) > 0.5 || Math.abs(K[0][2] - 600) > 0.5 || Math.abs(K[0][1] - 100) > 0.5) villur.push('klippaButa: veggur á að klippast við skurðinn og færast í hnit skornu myndarinnar');
}

if (m.veggirUrGrimu) {
  // 2 · gríma: láréttur borði, lóðréttur borði, skáborði, tvær smáklessur og flekkur → þrír veggir
  const W = 400, H = 300, g = new Uint8Array(W * H);
  const fylla = (x0, y0, x1, y1) => { for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) g[y * W + x] = 1; };
  fylla(40, 50, 360, 58); fylla(40, 50, 48, 250);
  for (let i = 0; i < 160; i++) fylla(120 + i, 100 + Math.round(i * 0.5), 121 + i, 108 + Math.round(i * 0.5));
  fylla(300, 200, 312, 211); fylla(330, 240, 339, 250); fylla(200, 180, 240, 220);   // tvær smáklessur og einn flekkur (40×40)
  const r = m.veggirUrGrimu(g, W, H);
  if (!r || r.butar.length !== 3) villur.push('veggirUrGrimu: tveir beinir borðar + einn skáborði + klessur og flekkur eiga að verða 3 veggir, varð ' + (r ? r.butar.length : 'null'));
  else {
    if (r.butar.some(v => Math.abs(v[4] - 8) > 1.6)) villur.push('veggirUrGrimu: þykkt borða á að vera ≈ 8, fékk ' + r.butar.map(v => v[4].toFixed(1)).join(', '));
    const ska = r.butar.find(v => Math.abs(v[3] - v[1]) > 20 && Math.abs(v[2] - v[0]) > 20);
    if (!ska || Math.abs(Math.abs((ska[3] - ska[1]) / (ska[2] - ska[0])) - 0.5) > 0.08) villur.push('veggirUrGrimu: skáveggur á að verða EINN leggur með réttum halla (0,5)');
  }
}

if (m.glerIBilum) {
  // 3 · þrjú bil á sömu veggjalínu: tvær línur (gler) · autt (hurð) · ein lína (áslína)
  const W = 800, H = 100, gra = new Uint8Array(W * H).fill(245);
  const lina = (x0, x1, y) => { for (let x = x0; x < x1; x++) gra[y * W + x] = 60; };
  const veggir = [[20, 50, 150, 50, 10], [250, 50, 380, 50, 10], [480, 50, 610, 50, 10], [710, 50, 780, 50, 10]];
  lina(150, 250, 47); lina(150, 250, 53);       // gler
  lina(610, 710, 50);                            // stök áslína
  const G = m.glerIBilum(veggir, gra, W, H, 1, 1);
  if (G.length !== 1 || Math.abs(G[0][0] - 150) > 3 || Math.abs(G[0][2] - 250) > 3) villur.push('glerIBilum: aðeins bilið með TVEIMUR samsíða línum er gler (autt gat = hurð, ein lína = áslína); fékk ' + JSON.stringify(G.map(v => v.map(Math.round))));
}

// Tengingin: undirbua → butar/gler → syna3d
const krefst = (re, skilabod) => { if (!re.test(src)) villur.push('383: ' + skilabod); };
krefst(/butar = heilirVeggir\(h\.pdfVeggir, fb, fh\)/, 'undirbua verður að para PDF-strikin (heilirVeggir) — annars kemur girðingin aftur');
krefst(/heilirUrGrimu\(gr, r\.W, r\.H, r\.kvardi, fb, fh\)/, 'undirbua verður að lesa veggi úr grímunni á skönnunum (heilirUrGrimu)');
krefst(/veggjaPx: butar \? butar\.length : n, butar, gler/, 'undirbua verður að rétta syna3d heilu veggina og glerið');
krefst(/if \(hd\.butar && hd\.butar\.length\) \{/, 'syna3d verður að teikna heila veggi (einn kassi á vegg) þegar þeir eru til');
krefst(/kassarUrGrimu\(hd\.veggir, hd\.W, hd\.H\)/, 'gamla ristarleiðin verður að standa sem varaleið fyrir teikningar án veggjanets');
krefst(/syna\(nr\) \{/, 'hæðatakkarnir (ein hæð í einu) eru farnir — fjölhæða hús verða ólæsileg án þeirra');
krefst(/sizeAttenuation: false/, 'miðar tækjanna verða að halda skjástærð (voru ólæsilegir á síma)');

if (villur.length) { console.log('RED  TEIKNING-3D — ' + villur.length + ' brot:\n  · ' + villur.join('\n  · ')); process.exit(1); }
console.log('TEIKNING-3D GRÆNT — vigurstrik parast í heila veggi, gríma skönnunar verður borðar (klessur ekki), gler finnst í bilum með tveimur línum, og 3D fær veggina.');
process.exit(0);
