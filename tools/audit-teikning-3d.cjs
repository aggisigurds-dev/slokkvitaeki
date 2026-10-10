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
 * Fimmtán reiknireglur bera þetta, og hver þeirra er PRÓFUÐ HÉR á tilbúnum gögnum (ekki bara leitað að nafni hennar):
 *   1. heilirVeggir   — vigurstrik pöruð í veggi (miðlína + þykkt), samlínu bútar sameinaðir yfir súlur, horn smellt saman.
 *   2. veggirUrGrimu  — veggjagríma skönnunar lesin sem langir jafnþykkir borðar; klessur (stafir, tákn) verða ekki veggir.
 *   3. glerIBilum     — bil milli veggbúta á sömu línu er gler ef teikningin sýnir ≥ 2 samsíða línur þar; autt hurðargat
 *                       og stök áslína eru það ekki.
 *   4. holirVeggir    — léttir milliveggir teiknaðir sem TVÆR mjóar línur: hvíta bilið á milli er lesið sem borði;
 *                       greiður (stigar, skástrikun) og stutt stök pör (hurðarblöð, húsgögn) eru það ekki.
 *   5. linubond       — útveggur teiknaður sem nokkrar örþunnar línur þétt saman (Skútuvogur 4): grár borði, breiðari en
 *                       stök lína og langur. Agnar: „Vantar oft aðal útveggina."
 *   6. lengjaVeggi    — veggur nær alla línuna þar til hún endar eða rekst á annan vegg (Agnar: „Veggirnir stoppa oft á
 *                       miðri leið. Eins og með EI-60 og EI-30 veggi"): línunni er fylgt á myndinni yfir stutt rof.
 *   7. merkjaEldveggi — EI-60 / EI-30 merki litar ALLAN vegginn sem það stendur við, út í enda línunnar (í gegnum
 *                       hurðargöt og T-mót); EI-CS merki eru hurðir og lita ekkert.
 *   8. husklasi       — aðeins veggjanetið sem hangir saman er húsið; stakir smáklasar utan við það (nafnreitur,
 *                       norðurör, lóðartákn) falla. Agnar um Arnarhvol: „smá mesh þarna".
 *   9. hurdagot       — rými lokast: stutt bil sem er ekki gler er hurðargat og fær dyrakarm; laus endi FESTS veggjar
 *                       tengist veggnum beint fram undan sér. Langt op stendur opið. 08.10.2026 (Sléttuvegur 7): stubbur
 *                       skýtur ekki hurð, hurð fer ekki í gegnum vegg og hurðir skerast ekki.
 *  10. tengdirVeggir  — stakur stuttur veggur sem snertir ekkert og tengist engu um glugga eða hurð fellur
 *                       (Agnar: „hindrar þá kannski að stakir veggir úti á gólfi myndast").
 *  11. eldurHurda     — hurð í brunavegg erfir flokk hans: karmurinn yfir henni er brunaveggur líka.
 *  12. brunaholf      — brunaveggir mynda alltaf LOKAÐ rými með öðrum brunaveggjum og útveggjum: útveggir fundnir,
 *                       laus endi brunaveggjar lokaður eftir stystu leið (ályktað, sýnt í ljósari lit), hólfin talin.
 *  13. reiknaEld      — HANDVAL: notandinn tengir eða aftengir brunavegg í 3D (✏ Eldveggir); valið gengur fyrir
 *                       merkjunum, vistast með hæðinni (haedir[].eldVal) og aftengdur veggur er ekki ályktaður aftur.
 *  14. gerdTaekis /   — tækin eru LÍKÖN (slökkvitæki, slöngukefli, reykskynjari, rafmagnstafla, skilti) sem hanga á
 *      festaAVegg       næsta vegg, þeim megin sem merkið stendur.
 *  15. teiknaTaekistakn — tákn tegundarinnar á miðanum, í lit (🧯, 🔔 fyrir reykskynjara, slöngukefli með stút).
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
    '; Object.assign(ut, { heilirVeggir, klippaButa, veggirUrGrimu, heilirUrGrimu, glerIBilum, holirVeggir, linubond, lengjaVeggi, merkjaEldveggi, husklasi, hurdagot, tengdirVeggir, eldurHurda, brunaholf, veggurVid, reiknaEld, gerdTaekis, festaAVegg, teiknaTaekistakn, klasaButa, hreinsaGogn, skorunSkurda });')(m);
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

if (m.holirVeggir) {
  // 4 · tvær mjóar línur með 6 díla bili (holur veggur) → 1 veggur · greiða úr fimm línum (stigi) → 0 · stakt hurðarblað → 0
  const W = 500, H = 300, gra = new Uint8Array(W * H).fill(245);
  const lar = (x0, x1, y) => { for (let x = x0; x < x1; x++) gra[y * W + x] = 60; };
  const lod = (x, y0, y1) => { for (let y = y0; y < y1; y++) gra[y * W + x] = 60; };
  lar(40, 300, 50); lar(40, 300, 57); lod(40, 50, 58); lod(299, 50, 58);                     // holur veggur, 260 díla langur
  for (let i = 0; i < 5; i++) lar(40, 200, 120 + i * 7); lod(40, 120, 149); lod(199, 120, 149);   // stigi: fimm þrep
  lar(350, 380, 200); lar(350, 380, 206); lod(350, 200, 207); lod(379, 200, 207);             // hurðarblað, 30 díla
  const Hv = m.holirVeggir(gra, W, H, 1, 1);
  if (Hv.length !== 1 || Math.abs(Hv[0][1] - 54) > 2 || Math.hypot(Hv[0][2] - Hv[0][0], Hv[0][3] - Hv[0][1]) < 230) villur.push('holirVeggir: holur veggur á að finnast (1), stigi og stakt hurðarblað ekki; fékk ' + JSON.stringify(Hv.map(v => v.map(Math.round))));
}

if (m.linubond) {
  // 5 · grár 5 díla borði (nokkrar örþunnar línur runnar saman) → 1 veggur; stök 2 díla lína og stutt band → ekkert
  const W = 500, H = 200, gra = new Uint8Array(W * H).fill(245);
  const fl = (x0, y0, x1, y1, g) => { for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) gra[y * W + x] = g; };
  fl(40, 50, 440, 55, 195); fl(40, 100, 440, 102, 120); fl(40, 150, 80, 155, 195);
  const B = m.linubond(gra, W, H, 1, 1);
  if (B.length !== 1 || Math.abs(B[0][1] - 52.5) > 1.5) villur.push('linubond: grár 5 díla borði á að verða 1 veggur, stök lína og stutt band ekki; fékk ' + JSON.stringify(B.map(v => v.map(Math.round))));
}
if (m.lengjaVeggi) {
  // 6 · veggur greindist aðeins að hluta (40–140) en línan á myndinni nær frá 40 til 300 með 6 díla rofi (texti yfir) og
  //     endar þar; handan við 60 díla hurðargat heldur ANNAR veggur áfram — lengingin má ekki stökkva yfir gatið.
  const W = 500, H = 100, gra = new Uint8Array(W * H).fill(245);
  const fl = (x0, y0, x1, y1) => { for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) gra[y * W + x] = 40; };
  fl(40, 45, 200, 56); fl(206, 45, 300, 56); fl(360, 45, 460, 56);
  const L = m.lengjaVeggi([[40, 50.5, 140, 50.5, 11]], gra, W, H, 1);
  if (Math.abs(L[0][2] - 300) > 4 || L[0][0] > 41) villur.push('lengjaVeggi: veggurinn á að ná alla línuna (til 300) yfir stutt rof en EKKI yfir hurðargatið; endaði í ' + Math.round(L[0][2]));
}

if (m.merkjaEldveggi) {
  // 7 · EI-60 merki við MIÐBÚT veggjalínu sem er þrír bútar með hurðargötum (60 díla) → allir þrír eldveggir; búturinn
  //     handan við 300 díla gat (línan endaði) ekki; þverveggur ekki; EI-CS-30 (hurðarmerki) litar ekkert.
  const veggir = [[100, 200, 300, 200, 8], [360, 200, 560, 200, 8], [620, 200, 800, 200, 8], [1100, 200, 1300, 200, 8], [460, 204, 460, 500, 8], [100, 600, 800, 600, 8]];
  const E = m.merkjaEldveggi(veggir, [{ x: 450, y: 180, label: 'EI-60', minutes: 60 }, { x: 300, y: 590, label: 'EI-CS-30', minutes: 30 }], 1);
  if (String(Array.from(E)) !== '60,60,60,0,0,0') villur.push('merkjaEldveggi: merkið á að lita ALLA línuna (yfir hurðargöt), ekki handan við enda hennar, ekki þvervegg, og CS-merki ekkert; fékk ' + Array.from(E).join(','));
}

if (m.husklasi) {
  // 8 · hús (ferhyrningur + stakur innveggur inni í því) heldur sér; þrjár stuttar „textalínur" langt til hliðar falla.
  const hus = [[100, 100, 500, 100, 8], [500, 100, 500, 400, 8], [500, 400, 100, 400, 8], [100, 400, 100, 100, 8], [250, 200, 350, 200, 6]];
  const rusl = [[900, 120, 1000, 120, 6], [900, 150, 1000, 150, 6], [900, 180, 990, 180, 6]];
  // álma: tveir veggir 90 díla frá húsinu (ótengd því) á að haldast; ruslið er 400 díla frá og fellur
  // (álman er undir fjórðungi hússins að lengd, svo aðeins ÁLMUREGLAN heldur henni)
  const alma = [[590, 100, 590, 300, 8], [590, 100, 700, 100, 8]];
  const K = m.husklasi(hus.concat(rusl, alma), 30, 115, 115);
  if (K.length !== 7 || K.some(v => v[0] >= 900)) villur.push('husklasi: húsið (með stökum innvegg) og álman við hlið þess eiga að standa, klasinn langt frá að falla; eftir stóðu ' + K.length);
}

if (m.hurdagot) {
  // 9 · veggjalína með 60 díla gati (hurð) og 300 díla gati (op): aðeins hurðin fær karm; gat sem er GLER fær engan;
  //     laus endi FESTS veggjar (T-mót efst) 50 díla frá þvervegg tengist honum.
  const veggir = [[100, 100, 300, 100, 8], [360, 100, 600, 100, 8], [900, 100, 1100, 100, 8], [1160, 100, 1300, 100, 8], [200, 100, 200, 300, 8], [100, 350, 400, 350, 8]];
  const gler = [[1100, 100, 1160, 100, 8]];
  const Hu = m.hurdagot(veggir, gler, 1).map(v => v.map(Math.round));
  const er = (ax, ay, bx, by) => Hu.some(v => Math.abs(v[0] - ax) + Math.abs(v[1] - ay) + Math.abs(v[2] - bx) + Math.abs(v[3] - by) < 8);
  if (!er(300, 100, 360, 100)) villur.push('hurdagot: 60 díla bil milli samlínu veggja á að vera hurðargat');
  if (Hu.some(v => v[0] >= 590 && v[2] <= 910 && v[1] === 100)) villur.push('hurdagot: 300 díla op má ekki fá dyrakarm');
  if (Hu.some(v => v[0] >= 1090 && v[1] === 100)) villur.push('hurdagot: bil sem er gler má ekki líka verða hurð');
  if (!er(200, 300, 200, 350)) villur.push('hurdagot: laus endi fests veggjar 50 díla frá þvervegg á að tengjast honum; fékk ' + JSON.stringify(Hu));
  // 9b · Sléttuvegur 7 (08.10.2026: „kemur svolítið út í mesh", 89 hurðir þar af 82 úr lausum endum):
  //   · STUBBUR sem snertir ekkert (feitletrað herbergisheiti, málsetning) skýtur ekki hurð yfir herbergið að næsta vegg —
  //     en tengist áfram stakra-veggja-síunni (ut.tengi), svo veggirnir eru þeir sömu og áður;
  //   · hurð fer ekki í gegnum vegg sem liggur nær samsíða geislanum (~10°, skökk álma) — áður sá geislinn hann ekki;
  //   · tvær hurðir skerast ekki („+" í fundarherbergi): sú styttri lifir.
  const stubbur = [240, 220, 270, 220, 8];
  const V2 = veggir.concat([stubbur,
    [700, 560, 700, 640, 8], [700, 600, 760, 600, 8], [780, 594, 840, 604, 8], [830, 550, 830, 650, 8],
    [1000, 700, 1000, 830, 8], [1120, 700, 1120, 830, 8], [1000, 700, 1120, 700, 8], [1000, 830, 1120, 830, 8], [1000, 780, 1050, 780, 8], [1080, 700, 1080, 760, 8]]);
  const H2r = m.hurdagot(V2, gler, 1), H2 = H2r.map(v => v.map(Math.round));
  const er2 = (ax, ay, bx, by) => H2.some(v => Math.abs(v[0] - ax) + Math.abs(v[1] - ay) + Math.abs(v[2] - bx) + Math.abs(v[3] - by) < 8);
  if (H2.some(v => v[1] === 220 && v[3] === 220)) villur.push('hurdagot: stubbur sem snertir ekkert má ekki skjóta hurð að næsta vegg; fékk ' + JSON.stringify(H2.filter(v => v[1] === 220)));
  if (!(H2r.tengi || []).some(v => Math.round(v[1]) === 220)) villur.push('hurdagot: bil stubbsins á samt að vera í ut.tengi (stakra-veggja-sían sér það eins og áður)');
  if (er2(760, 600, 830, 600)) villur.push('hurdagot: hurð má ekki fara í gegnum vegg sem liggur ~10° frá geislanum');
  const kross = [er2(1050, 780, 1120, 780), er2(1080, 760, 1080, 830)].filter(Boolean).length;
  if (kross !== 1) villur.push('hurdagot: af tveimur hurðum sem skerast á nákvæmlega ein að lifa; lifðu ' + kross);
  if (!er2(200, 300, 200, 350) || !er2(300, 100, 360, 100)) villur.push('hurdagot: nýju reglurnar mega ekki fella venjulegu hurðirnar');
}

if (m.tengdirVeggir) {
  // 10 · stakur stuttur veggur úti á gólfi fellur; veggur sem tengist um hurð heldur sér; langur frístandandi líka.
  const veggir = [[100, 100, 400, 100, 8], [400, 100, 400, 300, 8], [200, 200, 260, 200, 8], [460, 100, 600, 100, 8], [100, 500, 700, 500, 8]];
  const T = m.tengdirVeggir(veggir, [], [[400, 100, 460, 100, 8]], 1, 400);
  if (String(T) !== 'true,true,false,true,true') villur.push('tengdirVeggir: stakur stuttur veggur á að falla, veggur tengdur um hurð og langur frístandandi að standa; fékk ' + T);
}

if (m.eldurHurda) {
  // 11 · hurð í brunavegg erfir flokk veggjarins (karmurinn yfir henni er þá rauður); hurð í venjulegum vegg ekki;
  //      þverveggur sem er brunaveggur og snertir enda hurðarinnar gefur henni ekki flokk.
  const veggir = [[100, 100, 300, 100, 8], [360, 100, 600, 100, 8], [100, 300, 300, 300, 8], [360, 300, 600, 300, 8], [360, 300, 360, 500, 8]];
  const eld = new Uint8Array([60, 60, 0, 0, 60]);
  const E = m.eldurHurda([[300, 100, 360, 100, 8], [300, 300, 360, 300, 8]], veggir, eld, 1);
  if (String(Array.from(E)) !== '60,0') villur.push('eldurHurda: hurð í brunavegg á að erfa EI-60, hurð í venjulegum vegg ekki (þverveggur telst ekki); fékk ' + Array.from(E).join(','));
}

if (m.brunaholf) {
  // 12 · hús 600 × 400 með einum brunavegg þvert yfir (merktur) → útveggirnir fjórir þekkjast, tvö brunahólf.
  //      Sama hús þar sem brunaveggurinn nær aðeins hálfa leið og venjulegur veggur tekur við → hann er ÁLYKTAÐUR
  //      brunaveggur (lokar hólfinu) og hólfin eru áfram tvö. Án lokunar væri hólfið eitt.
  const ut4 = [[100, 100, 700, 100, 8], [700, 100, 700, 500, 8], [700, 500, 100, 500, 8], [100, 500, 100, 100, 8]];
  const heill = ut4.concat([[400, 100, 400, 500, 8]]);
  const H1 = m.brunaholf(heill, [], [], new Uint8Array([0, 0, 0, 0, 60]), null, 800, 600, 1);
  if (!H1 || H1.fjoldi !== 2) villur.push('brunaholf: hús með einum brunavegg þvert yfir á að vera tvö brunahólf, fékk ' + (H1 ? H1.fjoldi : 'null'));
  else if (String(H1.ytri) !== 'true,true,true,true,false') villur.push('brunaholf: útveggirnir fjórir eiga að þekkjast og milliveggurinn ekki; fékk ' + H1.ytri);
  const halfur = ut4.concat([[400, 100, 400, 300, 8], [400, 300, 400, 500, 8], [150, 250, 250, 250, 8]]);
  const H2 = m.brunaholf(halfur, [], [], new Uint8Array([0, 0, 0, 0, 60, 0, 0]), null, 800, 600, 1);
  if (!H2 || H2.alyktad[5] !== 60 || H2.alyktad[6]) villur.push('brunaholf: brunaveggur sem endar í lausu lofti á að lokast eftir veggnum sem tekur við (ályktað), stakur veggur annars staðar ekki; fékk ' + (H2 ? Array.from(H2.alyktad) : 'null'));
  else if (H2.fjoldi !== 2) villur.push('brunaholf: eftir lokun eiga hólfin að vera tvö, fékk ' + H2.fjoldi);
}

if (m.reiknaEld && m.veggurVid) {
  // 13 · HANDVAL: hús með brunavegg þvert yfir (EI-60 merki). Notandinn (a) aftengir hann, (b) tengir annan vegg sem EI-30.
  //      Þverveggur B (þykkari) endar í miðju veggjar A — handval á A má ekki lenda á B.
  const hus = () => ({ butar: [[100, 100, 700, 100, 8], [700, 100, 700, 500, 8], [700, 500, 100, 500, 8], [100, 500, 100, 100, 8], [400, 100, 400, 500, 8], [100, 300, 400, 300, 8]], gler: [], hurdir: [], sk: { x: 50, y: 20, w: 800, h: 600 }, frumB: 2384, frumH: 1700 });
  const merki = [{ x: 420 + 50, y: 200 + 20, label: 'EI-60', minutes: 60 }];
  const U0 = m.reiknaEld(hus(), merki, null);
  if (!U0.eld || U0.eld[4] !== 60 || U0.handval[4] !== -1 || !U0.holf || U0.holf.fjoldi !== 2) villur.push('reiknaEld: án handvals á merkti veggurinn að vera EI-60 og hólfin tvö');
  const U1 = m.reiknaEld(hus(), merki, [[450, 120, 450, 520, 0]]);                      // aftengja brunavegginn (frumdílar = skurður + sk)
  if (!U1.eld || U1.eld[4] !== 0 || U1.handval[4] !== 0 || U1.holf) villur.push('reiknaEld: aftengdur brunaveggur á að hætta að vera eldveggur (og hólfin hverfa); fékk eld=' + (U1.eld ? U1.eld[4] : null));
  const U2 = m.reiknaEld(hus(), merki, [[150, 320, 450, 320, 30]]);                     // tengja vegg A sem EI-30
  if (!U2.eld || U2.eld[5] !== 30 || U2.handval[5] !== 30 || U2.eld[4] !== 60) villur.push('reiknaEld: handvalinn veggur á að verða EI-30 og merkti veggurinn halda EI-60; fékk ' + (U2.eld ? Array.from(U2.eld) : null));
  if (!U2.holf || U2.holf.fjoldi !== 3) villur.push('reiknaEld: eftir að veggur A er tengdur eiga hólfin að vera þrjú, fékk ' + (U2.holf ? U2.holf.fjoldi : null));
  const U3 = m.reiknaEld(hus(), null, [[150, 320, 450, 320, 60]]);                      // engin merki, aðeins handval
  if (!U3.eld || U3.eld[5] !== 60) villur.push('reiknaEld: handval á að virka þótt engin EI-merki séu á teikningunni');
  // T-mót: þykkur veggur B endar í miðju A
  const T = [[100, 100, 500, 100, 6], [300, 100, 300, 400, 30]];
  if (m.veggurVid(T, [100, 100, 500, 100], 1) !== 0 || m.veggurVid(T, [300, 100, 300, 400], 1) !== 1) villur.push('veggurVid: handval verður að finna réttan vegg við T-mót (samsíða + skörun, ekki nálægð við punkt)');
  if (m.veggurVid(T, [100, 250, 250, 250], 1) !== -1) villur.push('veggurVid: lína sem á engan vegg á ekki að lenda á neinum');
  // aftengdur veggur verður ekki ÁLYKTAÐUR aftur
  const ut4 = [[100, 100, 700, 100, 8], [700, 100, 700, 500, 8], [700, 500, 100, 500, 8], [100, 500, 100, 100, 8]];
  const halfur = ut4.concat([[400, 100, 400, 300, 8], [400, 300, 400, 500, 8]]);
  const B = m.brunaholf(halfur, [], [], new Uint8Array([0, 0, 0, 0, 60, 0]), null, 800, 600, 1, new Uint8Array([0, 0, 0, 0, 0, 1]));
  if (!B || B.alyktad[5]) villur.push('brunaholf: veggur sem notandinn aftengdi má ekki verða ályktaður brunaveggur aftur');
  // … heldur ekki þegar hann er SEINNI hlekkurinn í leiðinni (þá lokast hólfið ekki þessa leið)
  const thrir = ut4.concat([[400, 100, 400, 220, 8], [400, 220, 400, 360, 8], [400, 360, 400, 500, 8]]);
  const B2 = m.brunaholf(thrir, [], [], new Uint8Array([0, 0, 0, 0, 60, 0, 0]), null, 800, 600, 1, new Uint8Array([0, 0, 0, 0, 0, 0, 1]));
  if (!B2 || B2.alyktad[6] || B2.alyktad[5]) villur.push('brunaholf: leið sem liggur um aftengdan vegg má ekki verða ályktuð; fékk ' + (B2 ? Array.from(B2.alyktad) : null));
  const B3 = m.brunaholf(thrir, [], [], new Uint8Array([0, 0, 0, 0, 60, 0, 0]), null, 800, 600, 1, null);
  if (!B3 || B3.alyktad[5] !== 60 || B3.alyktad[6] !== 60) villur.push('brunaholf: án aftengingar á tveggja veggja leið að lokast (ályktað); fékk ' + (B3 ? Array.from(B3.alyktad) : null));
}

if (m.gerdTaekis && m.festaAVegg) {
  // 14 · LÍKÖN: tegund → líkan, og tækið hangir á næsta vegg þeim megin sem merkið er.
  const G = (a, b) => m.gerdTaekis(a, b);
  const fekk = [G('Léttvatn'), G('ABC Duft'), G('CO2'), G('CO₂'), G('Brunaslanga'), G('Slönguskápur'), G('Reykskynjari'), G('Eldvarnarteppi'), G('Óþekkt'), G(null, 'rafmagn'), G(null, 'hose'), G(null, 'skilti_slt'), G(null, 'ut'), G('Viðvörunarbjalla'), G(null, 'bjalla'), G(null, 'reykskynjari'), G(null, 'neyðarútgangur'), G(null, 'segull'), G('Segulloki'), G(null, 'hitaskynjari'), G('Hitaskynjari')].join(',');
  if (fekk !== 'slokkvitaeki,slokkvitaeki,co2,co2,slanga,slanga,reykskynjari,teppi,slokkvitaeki,rafmagn,slanga,skilti,skilti-ut,bjalla,bjalla,reykskynjari,skilti-ut,segull,segull,hitaskynjari,hitaskynjari') villur.push('gerdTaekis: tegundir tækja og stimpla verða að fá rétt líkan; fékk ' + fekk);
  const F = m.festaAVegg([[100, 100, 500, 100, 10]], 300, 130, 60);
  if (!F.aVegg || Math.abs(F.x - 300) > 0.5 || Math.abs(F.y - 105) > 0.5 || F.ny < 0.99) villur.push('festaAVegg: tæki 30 díla neðan við vegg á að hanga á neðra yfirborði hans og snúa niður; fékk ' + JSON.stringify(F));
  const F2 = m.festaAVegg([[100, 100, 500, 100, 10]], 300, 400, 60);
  if (F2.aVegg || F2.x !== 300 || F2.y !== 400) villur.push('festaAVegg: tæki langt frá vegg á að standa þar sem merkið er');
}

if (m.teiknaTaekistakn) {
  // 15 · TÁKN: hver gerð teiknar sitt tákn innan 48 × 48 reitsins og gerðirnar eru ólíkar hver annarri (gervisamhengi
  //      skráir aðgerðirnar — ekkert DOM þarf).
  const skra = gerd => {
    const log = []; let mest = 0, minnst = 0;
    const hn = (...a) => { a.forEach(v => { if (typeof v === 'number' && Math.abs(v) < 1000) { mest = Math.max(mest, v); minnst = Math.min(minnst, v); } }); };
    const c = new Proxy({}, { get: (o, k) => (k in o ? o[k] : (...a) => { log.push(String(k)); if (/^(moveTo|lineTo|rect)$/.test(String(k))) hn(...a); if (k === 'arc') hn(a[0] + a[2], a[1] + a[2], a[0] - a[2], a[1] - a[2]); }), set: (o, k, v) => { if (k === 'fillStyle' || k === 'strokeStyle') log.push(k + '=' + v); o[k] = v; return true; } });
    m.teiknaTaekistakn(c, gerd);
    return { fp: log.join('|'), mest, minnst, n: log.length };
  };
  const gerdir = ['slokkvitaeki', 'co2', 'slanga', 'reykskynjari', 'hitaskynjari', 'bjalla', 'segull', 'rafmagn', 'skilti', 'skilti-ut', 'teppi'], sed = new Map();
  gerdir.forEach(gd => {
    const r = skra(gd);
    if (r.n < 6) villur.push('teiknaTaekistakn: „' + gd + '" teiknar ekkert tákn');
    if (r.mest > 48.5 || r.minnst < -0.5) villur.push('teiknaTaekistakn: „' + gd + '" fer út fyrir 48 × 48 reitinn (' + r.minnst + ' … ' + r.mest + ')');
    if (sed.has(r.fp)) villur.push('teiknaTaekistakn: „' + gd + '" og „' + sed.get(r.fp) + '" fá sama táknið'); else sed.set(r.fp, gd);
  });
  const rs = skra('reykskynjari').fp, bj = skra('bjalla').fp, rf = skra('rafmagn').fp;
  if (!/fillStyle=#f6c431/.test(rf) || !/fillStyle=#bdbdbd/.test(rf) || (rf.match(/rect/g) || []).length < 4) villur.push('teiknaTaekistakn: rafmagnstaflan á að vera grár skápur með gulri eldingu og strengjum niður (myndin sem Agnar sendi)');
  if ((rs.match(/ellipse/g) || []).length < 2 || (rs.match(/quadraticCurveTo/g) || []).length < 10) villur.push('teiknaTaekistakn: reykskynjarinn á að vera skífa við loft með þremur reykjarslæðum (myndin sem Agnar sendi)');
  if ((bj.match(/arc/g) || []).length < 5 || !/fillStyle=#cfd8dc/.test(bj)) villur.push('teiknaTaekistakn: viðvörunarbjallan á að vera rauð bjalla með nöf og kólfi (myndin sem Agnar sendi)');
  if ((skra('slanga').fp.match(/arc/g) || []).length < 3) villur.push('teiknaTaekistakn: slöngukeflið á að vera spóla úr hringjum með nöf (myndin sem Agnar sendi)');
}

// Tengingin: undirbua → butar/gler → syna3d
const krefst = (re, skilabod) => { if (!re.test(src)) villur.push('383: ' + skilabod); };
krefst(/butar = heilirVeggir\(h\.pdfVeggir, fb, fh\)/, 'undirbua verður að para PDF-strikin (heilirVeggir) — annars kemur girðingin aftur');
krefst(/heilirUrGrimu\(gr, r\.W, r\.H, r\.kvardi, fb, fh\)/, 'undirbua verður að lesa veggi úr grímunni á skönnunum (heilirUrGrimu)');
krefst(/holirVeggir\(r\.gra, r\.W, r\.H, r\.kvardi, kpt\)/, 'undirbua verður að leita holra veggja (tvær mjóar línur) á skönnunum');
krefst(/linubond\(r\.gra, r\.W, r\.H, r\.kvardi, kpt\)/, 'undirbua verður að leita línubanda (útveggir úr örþunnum línum) á skönnunum');
krefst(/lengjaVeggi\(butar, r\.gra, r\.W, r\.H, r\.kvardi\)/, 'undirbua verður að lengja veggi eftir línunni (Agnar: „ná alla línuna þar til hún endar á annarri eða endar")');
krefst(/merkjaEldveggi\(butar, eiHintar\.map/, 'undirbua verður að merkja eldveggi út frá EI-merkjunum');
// 16 · FASTUR GREININGARKVARÐI (Agnar 05.10.2026: „3D er fucked á Arnarhóli“). Þröskuldar veggjagrímunnar voru hlutfall af
//      breidd vinnumyndarinnar, svo sama hús gaf aðra veggi eftir skurði og gæðavali (Arnarhvoll: 172 veggir → 380).
//      Með `vidmid` eru þeir fastir: sama opnun hvort sem vinnumyndin er 1000 eða 3000 díla breið.
if (m.hreinsaGogn) {
  const gera = (W, o) => { const H = 40, g = new Uint8Array(W * H).fill(255); for (let x = 10; x < W - 10; x++) for (let y = 15; y < 23; y++) g[y * W + x] = 0; return m.hreinsaGogn(g, W, H, o).thykkt; };
  const an = [gera(1000), gera(3000)], med = [gera(1000, { vidmid: 2200 }), gera(3000, { vidmid: 2200 })];
  if (an[0] === an[1]) villur.push('hreinsaGogn: án viðmiðs á opnunin að fylgja breidd myndarinnar (prófið sjálft er þá marklaust), fékk ' + an.join(' og '));
  if (med[0] !== 2 || med[1] !== 2) villur.push('hreinsaGogn: með vidmid = 2200 á opnunin að vera 2 dílar óháð breidd vinnumyndar, fékk ' + med.join(' og ') + ' — þá breytist 3D-húsið aftur við það eitt að skera þrengra');
}
krefst(/kvardi: greiningarkvardi\(fb, fh\), vidmid: VIDMID_3D/, 'undirbua verður að greina skönnun í FÖSTUM kvarða (greiningarkvardi + vidmid) — annars ræður skurður og gæðaval því hvaða línur verða veggir');
krefst(/function greiningarkvardi\(fb, fh\) \{ return Math\.min\(1, \(window\.Teikn3D && Teikn3D\.profKvardi\) \|\| BLAD_3D \/ Math\.max\(fb, fh, 1\)\); \}/, 'greiningarkvarðinn á að ráðast af stærð BLAÐSINS (frummyndar), ekki af skurði eða TeiknGaedi.vinnuPx');
// 17 · SKORIÐ AÐ HÚSINU eftir veggjanetinu (Agnar 05.10.2026: „næ ekki að losna við teikningaupplýsingaruglið á hægri
//      hliðinni“ · „Cutta að húsinu“). klasaButa flokkar búta sem hanga saman; husRammi velur klasann með mest
//      veggjaflatarmál (hús = þykkir veggir, nafnreitur = línur) og sker að honum.
if (m.klasaButa) {
  const hus = [[100, 100, 500, 100, 8], [500, 100, 500, 400, 8], [500, 400, 100, 400, 8], [100, 400, 100, 100, 8]];
  const reitur = [[900, 120, 1000, 120, 2], [900, 150, 1000, 150, 2], [1000, 120, 1000, 150, 2]];
  const nr = m.klasaButa(hus.concat(reitur), 30);
  if (new Set(nr.slice(0, 4)).size !== 1 || new Set(nr.slice(4)).size !== 1 || nr[0] === nr[4]) villur.push('klasaButa: húsið og nafnreiturinn 400 díla frá eiga að vera TVEIR klasar, fékk ' + JSON.stringify(nr));
  if (new Set(m.klasaButa(hus.concat([[520, 250, 700, 250, 8]]), 30)).size !== 1) villur.push('klasaButa: veggur 20 díla frá húsinu (innan tengibils) á að lenda í sama klasa');
} else villur.push('klasaButa vantar — husRammi (skorið að húsinu) byggir á henni');
krefst(/const adal = K\.reduce\(\(a, q\) => \(!a \|\| q\.flat > a\.flat \? q : a\), null\);/, 'husRammi á að velja klasann með mest veggjaFLATARMÁL (lengd × þykkt) — eftir lengd einni vinnur nafnreiturinn stundum');
krefst(/const butar = veggirUrMynd\(r, iw, ih, \{\}, true\);/, 'husRammi á að lesa veggjanetið ÁN husklasi (álmureglan þar hélt nafnreit Rauðarárstígs 31 sem álmu)');
krefst(/if \(!val\.fest && h\.sjalf !== false && !h\.thett && !pdfSlod\(h\) && !h\.pdfVeggir\.length && G\.husReynt !== G\.frum\)/, 'sjálfvirkur skurður skönnunar verður að þéttast einu sinni að veggjanetinu — og aldrei þegar útlit er fest eða skurður handvalinn');
krefst(/gera\('fp-hus-btn', '⌂ Að húsinu'/, 'takkinn „Að húsinu“ (skorið að húsinu með einum smelli) er farinn');
krefst(/plan\(\)\.markers\.forEach\(m => \{ if \(erPx\(m\)\) \{ const mx = m\.x \+ G\.rymi\.x, my = m\.y \+ G\.rymi\.y; x0 = Math\.min\(x0, mx - sp\); y0 = Math\.min\(y0, my - sp\); x1 = Math\.max\(x1, mx \+ sp\); y1 = Math\.max\(y1, my \+ sp\); \} \}\);\s+x0 = Math\.max\(0, x0\); y0 = Math\.max\(0, y0\); x1 = Math\.min\(iw, x1\); y1 = Math\.min\(ih, y1\);\s+const nw = x1 - x0, nh = y1 - y0, gamall = h\.skurdur;\s+h\.thett = true;/, 'skeraAdHusi verður að víkka kassann svo merki sem þegar eru til lendi innan hans');
// 19 · HÆÐIR STAFLAST (05.10.2026, Hótel Klöpp í 3D: hæðirnar lágu hlið við hlið). Staða skurðar á blaðinu ræður aðeins
//      þegar skurðirnir skarast greinilega; tvær grunnmyndir hlið við hlið á einu blaði eru miðjaðar hvor yfir annarri.
if (m.skorunSkurda) {
  const kj = { x: 180, y: 340, w: 2162, h: 3316 }, h1 = { x: 2523, y: 340, w: 2282, h: 3316 }, h2 = { x: 1562, y: 849, w: 1562, h: 2165 };
  if (m.skorunSkurda(kj, h1) !== 0) villur.push('skorunSkurda: tvær grunnmyndir hlið við hlið á sama blaði skarast ekki — eiga að gefa 0');
  if (m.skorunSkurda(kj, h2) >= 0.7) villur.push('skorunSkurda: skurðir sem skarast aðeins að hálfu (Klöpp kjallari / 2. hæð) mega ekki teljast á sama stað, fékk ' + m.skorunSkurda(kj, h2).toFixed(2));
  const pl = { x: 1312, y: 0, w: 3383, h: 4193 }, p7 = { x: 843, y: 1259, w: 3321, h: 1714 };
  if (m.skorunSkurda(pl, p7) < 0.7) villur.push('skorunSkurda: minni hæð sem liggur innan þeirrar stærri (Plaza 7. hæð) á að halda stöðu sinni á blaðinu, fékk ' + m.skorunSkurda(pl, p7).toFixed(2));
} else villur.push('skorunSkurda vantar — án hennar raðast hæðir af ólíkum stöðum á blaði hlið við hlið í 3D');
krefst(/if \(skorunSkurda\(hd\.sk, vidmid\.sk\) >= 0\.7\) \{/, 'syna3d: staða á blaðinu má aðeins ráða þegar skurðirnir skarast greinilega — annars eru hæðir miðjaðar');
// 18 · TÆKI UTAN TEIKNINGAR (Agnar 05.10.2026: „Tækin eru fyrir utan húsið“): merki utan myndarinnar er ekki teiknað í 3D,
//      en skýringin segir hve mörg þau eru.
krefst(/const merki = merkiOll\.filter\(\(m, i\) => !\(merkiFrum\[i\] && merkiFrum\[i\]\.uti\) && m\.x >= 0 && m\.y >= 0 && m\.x <= iw && m\.y <= ih\), merkiUti = merkiOll\.length - merki\.length;/, 'merki utan myndarinnar (eða sem bíður í horninu) má ekki svífa við hlið hússins í 3D');
krefst(/function saekjaMerkiInn\(\) \{[\s\S]{0,700}m\.uti = \[m\.x \+ G\.rymi\.x, m\.y \+ G\.rymi\.y\];/, '„Sækja inn“ verður að merkja merkin sem það leggur í hornið (m.uti) — annars líta þau út fyrir að vera rétt staðsett');
krefst(/stika\(skilabod\); flipar\(\); hnappar\(\); merkiUtiStika\(\);/, 'stikan um merki utan teikningar verður að fylgja hverri teikningu gluggans — líka þegar útlit er fest');
if (/m\.x \/ 2\.38|m\.y \/ 2\.38/.test(src)) villur.push('383: ekki má giska á réttan stað merkis með því að deila í símakvarðann — hliðrunin réðst af stöðu strigans á skjánum');
krefst(/nUti \+= u\.merkiUti \|\| 0;/, 'skýringin í 3D verður að telja tæki sem eru staðsett utan teikningar — annars hverfa þau þegjandi');
krefst(/\(b < h \* 1\.5 \? Math\.min\(2\.6, 1\.5 \* h \/ Math\.max\(1, b\)\) : 1\)/, 'á háum, mjóum striga (sími) verður myndavélin að bakka svo allt húsið sjáist');
krefst(/const ei = await eiHintarFyrir3d\(h, fbE, fhE\);/, 'opna3d verður að sækja EI-merkin (vistuð eða úr textalagi PDF-sins) áður en hæðin er undirbúin');
krefst(/\[0, d, -d\]\.some\(o => inni\(/, 'útisían má ekki fella ÚTVEGGI: veggur fellur aðeins ef ekkert er inni heldur til hliðar við hann (Agnar: „Vantar oft aðal útveggina")');
krefst(/butar = husklasi\(butar, 30 \* kpt, 115 \* kpt, 115 \* kpt\)/, 'undirbua verður að halda aðeins veggjaneti hússins á skönnunum (nafnreitur og lóðartákn urðu að veggjum — Agnar: „smá mesh þarna")');
krefst(/hurdir = hurdagot\(butar, gler,/, 'undirbua verður að loka rýmum með hurðargötum (Agnar: „að allir veggirnir tengjast, hvort það sé gluggi eða hurð")');
krefst(/tengdirVeggir\(butar, gler, hurdir,/, 'undirbua verður að fella staka veggi úti á gólfi á skönnunum');
krefst(/u\.hurdEld = eldurHurda\(u\.hurdir, butar, eld, k\)/, 'karmur yfir hurð í brunavegg verður að fá lit veggjarins (Agnar: „bilið fyrir ofan hurð á brunavegg ætti þá að vera brunaveggur líka")');
krefst(/lg\.rendur\.setColorAt\(i, lit\.setHex\(hd\.hurdEld && hd\.hurdEld\[i\] \? ELDHURD_3D : HURDALITUR_3D\)\)/, 'hurðir verða að sjást ofan frá á litaðri rönd (brunahurð appelsínugul, önnur brún)');
krefst(/u\.holf = brunaholf\(butar, u\.gler, u\.hurdir, eld, u\.hurdEld, u\.sk\.w, u\.sk\.h, k, bannad\)/, 'undirbua verður að reikna brunahólfin (Agnar: „brunaveggir mynda alltaf lokað rými … brunahólf")');
krefst(/reiknaEld\(uE, eiHintar, h\.eldVal\)/, 'undirbua verður að reikna eldflokkinn með handvali notandans (haedir[].eldVal)');
krefst(/const STILLINGAR = \[[^\]]*'eldVal'\]/, 'handval eldveggja (eldVal) verður að vistast með hæðinni á þjóninn — annars sést leiðréttingin aðeins í þessum vafra');
krefst(/eldVal: n\.eldVal \|\| g\.eldVal/, 'sameinaHaedir verður að halda eldVal þegar röð þjónsins berst');
krefst(/hRef\.eldVal = fyrri;[\s\S]{0,400}vistaSjalfkrafa\('eldveggir'\)/, 'val í 3D verður að skrifast í haedir[].eldVal og vistast (Agnar: „savað síðan réttu útgáfuna")');
krefst(/texti: u \? \(u\.type \? String\(u\.type\) : radnr\.slice\(-6\)\) : '', gerd/, 'miðar tækjanna eiga að sýna TEGUND (Agnar: „grænu pinnarnir sýndu slökkvitæki eða brunaslöngur")');
krefst(/const lk = taekjalikan\(mk\.gerd, (?:veggH|3 \* metri), litur\);/, 'tækin verða að teiknast sem líkön (slökkvitæki, slanga, reykskynjari, rafmagnstafla, skilti) — Agnar 04.10.2026');
krefst(/const LOFTH_M = 3\.0;[\s\S]*const metri = metriA3d\(hd, k\), veggH = LOFTH \* metri/, 'vegghæð = 3 m í öllum húsum, metrakvarðinn sér (Agnar 10.10.2026: „Allt 3 metra")');
krefst(/const SVALIR_M = 1\.1;[\s\S]*if \(hd\.svalir && hd\.svalir\.length\)[\s\S]*tpSvalir = tp\.filter\(v => v\.tegund === 'svalir'\)/, 'svalir (tegund svalir) teiknast sem 1,1 m lágur veggur — Agnar 10.10.2026');
krefst(/gerd: gerdTaekis\(u && u\.type\)/, 'hvert tæki verður að bera gerð sína inn í 3D');
krefst(/teiknaTaekistakn\(mc, mk\.gerd\)/, 'miðar tækjanna verða að bera tákn tegundarinnar (🧯 🔔 slöngukefli — Agnar 04.10.2026)');
krefst(/new T\.TorusGeometry\(hr\[0\] \* e, hr\[1\] \* e/, 'slöngukeflið í 3D á að vera spóla úr hringjum eins og táknið');
krefst(/gerd === 'bjalla'\) \{\s+\/\/ viðvörunarbjalla: rauð skál/, 'viðvörunarbjallan verður að eiga líkan í 3D');
krefst(/hRef = u && haedir\(\)\.find\(x => x && x\.id === u\.haedId\)/, 'handval verður að skrifast í LIFANDI hæðarhlutinn (fundinn eftir auðkenni) — tilvísun frá opnun 3D verður úrelt þegar röð þjónsins berst og þá vistast valið ekki');
krefst(/veggjaPx: butar \? butar\.length : n, butar, gler, hurdir, (?:svalir, )?hurdEld, eld, holf/, 'undirbua verður að rétta syna3d heilu veggina og glerið');
krefst(/if \(hd\.butar && hd\.butar\.length\) \{/, 'syna3d verður að teikna heila veggi (einn kassi á vegg) þegar þeir eru til');
krefst(/kassarUrGrimu\(hd\.veggir, hd\.W, hd\.H\)/, 'gamla ristarleiðin verður að standa sem varaleið fyrir teikningar án veggjanets');
krefst(/syna\(nr\) \{/, 'hæðatakkarnir (ein hæð í einu) eru farnir — fjölhæða hús verða ólæsileg án þeirra');
krefst(/sizeAttenuation: false/, 'miðar tækjanna verða að halda skjástærð (voru ólæsilegir á síma)');

if (villur.length) { console.log('RED  TEIKNING-3D — ' + villur.length + ' brot:\n  · ' + villur.join('\n  · ')); process.exit(1); }
console.log('TEIKNING-3D GRÆNT — vigurstrik parast í heila veggi, gríma skönnunar verður borðar (klessur ekki), gler finnst í bilum með tveimur línum, og 3D fær veggina.');
process.exit(0);
