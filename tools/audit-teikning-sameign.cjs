#!/usr/bin/env node
/**
 * VÖRÐUR: SAMEIGN Í FJÖLBÝLI (446, Agnar 08.10.2026 — „tækin oftast bara í sameign … stigagangurinn upp og kjallari").
 *
 *  1. Heiti flokkast rétt: Stigahús / Stigag. / Gangur - lyfta / Hjóla- og vagnageymsla / Þvottah. / Inntak → sameign;
 *     Íbúð / Stofa / Herb. / Bað → íbúð; Geymsla → annað (séreign á sameignargangi).
 *  2. Gervigrunnmynd í rasta (tvöfaldar veggjalínur, hurðagöt, stigi = 9 samsíða þrep, lyftustokkur með krossi, íbúð
 *     með húsgögnum): stiginn finnst, stigahúsið verður sameignarsvæði, gangurinn við lyftuna líka, íbúðin ekki.
 *  3. Staðfesting milli hæða: sami stigi á öðru blaði staðfestir; stigi sem finnst á EINU blaði af þremur er ekki
 *     stigahús (tröppur niður í kjallara utan húss á Berjavöllum 6).
 *  4. Tengingin: 383 kallar á TeiknSameign (Sameign-takki, 3D, blenderSena: snid + sameign), 445 teiknar á vinnumynd,
 *     433 gefur hógværa athugasemd, index.html hleður 446. Sneiðmyndin fylgir aðeins 3+ hæðum.
 */
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROT = path.join(__dirname, '..');
const villur = [];
const lesa = f => fs.readFileSync(path.join(ROT, f), 'utf8');
const s446 = lesa('js/patches/446-teikning-sameign.js'), s383 = lesa('js/patches/383-teikning-hreinsa-3d.js');
const s445 = lesa('js/patches/445-teikning-vinnumynd.js'), s433 = lesa('js/patches/433-teikning-merking.js'), html = lesa('index.html');

const ctx = { console, Math, Map, Set, Uint8Array, Uint16Array, Uint32Array, Int32Array, Float32Array, JSON, Object, Array, Number, String, Infinity, isFinite };
ctx.window = ctx; vm.createContext(ctx); vm.runInContext(s446, ctx);
const TS = ctx.TeiknSameign;
if (!TS) { console.log('TEIKNING-SAMEIGN RAUTT — 446 setti ekki window.TeiknSameign'); process.exit(1); }

// 1. heiti
const vaent = { 'Stigahús 01-08': 'sameign', 'Stigag.': 'sameign', 'Gangur - lyfta 01-07': 'sameign', 'Hjóla- og vagnageymsla': 'sameign',
  'Hjóla og vagna geymsla 00-29': 'sameign', 'Þvottah.': 'sameign', 'Þurrkherb.': 'sameign', 'Inntak': 'sameign', 'Tæknirými': 'sameign', 'Sorp': 'sameign',
  'Anddyri 01-12': 'sameign', 'Geymslugangur': 'sameign', 'Íbúð 01-03': 'ibud', 'Íb. 0203': 'ibud', 'Stofa': 'ibud', 'Svefnh.': 'ibud', 'Herb.': 'ibud',
  'Eldh.': 'ibud', 'Bað': 'ibud', 'Geymsla 00-05': 'annad' };
Object.keys(vaent).forEach(t => { const f = TS.flokkur(t); if (f.hopur !== vaent[t]) villur.push('flokkur(„' + t + '") = ' + f.hopur + ', átti að vera ' + vaent[t]); });

// 2. gervigrunnmynd (40 díl/m): 24 × 14 m
const PX = 40, W = 24 * PX, H = 14 * PX;
function haed(medStiga) {
  const g = new Uint8Array(W * H).fill(255);
  const lina = (x0, y0, x1, y1) => { for (let y = Math.round(y0); y <= Math.round(y1); y++) for (let x = Math.round(x0); x <= Math.round(x1); x++) if (x >= 0 && y >= 0 && x < W && y < H) g[y * W + x] = 0; };
  // veggur = tvær línur 0,15 m í sundur; gat = [a, b] í metrum eftir veggnum
  const veggurL = (y, x0, x1, gat) => { [y, y + 0.15].forEach(yy => { const Y = yy * PX; if (gat) { lina(x0 * PX, Y, gat[0] * PX, Y); lina(gat[1] * PX, Y, x1 * PX, Y); } else lina(x0 * PX, Y, x1 * PX, Y); }); };
  const veggurD = (x, y0, y1, gat) => { [x, x + 0.15].forEach(xx => { const X = xx * PX; if (gat) { lina(X, y0 * PX, X, gat[0] * PX); lina(X, gat[1] * PX, X, y1 * PX); } else lina(X, y0 * PX, X, y1 * PX); }); };
  // útveggir
  veggurL(1, 1, 23); veggurL(13, 1, 23); veggurD(1, 1, 13.15); veggurD(23, 1, 13.15);
  // stigahús 1–6 × 1–6, hurð í neðri vegg; gangur 1–12 × 6–9; lyfta 6–8 × 1–3,5 með krossi; íbúð 12–23 × 1–13
  // efri veggur gangsins: hurð stigahúss [3, 4] og lyftudyr [6,6, 7,4]
  veggurL(6, 1, 3, null); veggurL(6, 4, 6.6, null); veggurL(6, 7.4, 12, null);
  veggurD(6, 1, 6.15); veggurL(9, 1, 12, [9, 10]); veggurD(12, 1, 13.15, [7, 8]);
  // lyftustokkur 6,15–8 × 4,15–6 (yfir ganginum) með krossi yfir körfuna
  veggurD(8, 1, 6.15); veggurL(4, 6, 8.15, null);
  { const a = [6.3, 4.3], b = [7.85, 5.85]; for (let t = 0; t <= 1; t += 0.001) { const x = (a[0] + (b[0] - a[0]) * t) * PX, y = (a[1] + (b[1] - a[1]) * t) * PX; lina(x, y, x, y); const y2 = (b[1] + (a[1] - b[1]) * t) * PX; lina(x, y2, x, y2); } }
  if (medStiga) for (let k = 0; k < 9; k++) { const x = (2 + k * 0.28) * PX; lina(x, 1.5 * PX, x, 2.7 * PX); lina(x, 3.6 * PX, x, 4.8 * PX); }
  // húsgögn í íbúðinni (stakar línur — mega ekki skipta henni)
  lina(15 * PX, 4 * PX, 18 * PX, 4 * PX); lina(15 * PX, 4 * PX, 15 * PX, 6 * PX); lina(19 * PX, 9 * PX, 21 * PX, 9 * PX);
  return { g, W, H, s: 1 };
}
const R = haed(true);
const kb = TS.kambar(R);
if (!kb.stigar.some(k => k.n >= 8 && k.ass === 'z')) villur.push('stiginn (9 þrep) fannst ekki: ' + JSON.stringify(kb.stigar.map(k => [k.ass, k.n])));
const hus = TS.greinaHus([
  { lykill: 'blad-A', pxmSrc: PX, R, nafn: '1. hæð', textar: [] },
  { lykill: 'blad-B', pxmSrc: PX, R: haed(true), nafn: '2. hæð', textar: [] },
  { lykill: 'blad-C', pxmSrc: PX, R: haed(false), nafn: 'Kjallari', textar: [] }
]);
const h1 = hus.haedir[0];
const i = (x, y) => TS.iSameign(h1, x * PX, y * PX, 0);
if (!h1.svaedi.some(v => v.teg === 'stigahus')) villur.push('stigahúsið varð ekki sameignarsvæði: ' + JSON.stringify(h1.talning));
if (!i(3.5, 3.5)) villur.push('miðja stigahússins (3,5; 3,5) er ekki innan sameignar');
if (!i(4, 7.5)) villur.push('gangurinn við lyftuna (4; 7,5) er ekki sameign: ' + JSON.stringify(h1.svaedi.map(v => v.teg + ' ' + v.flatarmal)));
if (i(17, 8)) villur.push('íbúðin (17; 8) taldist sameign');
if (!h1.stigar.some(k => k.stadfest)) villur.push('stiginn var ekki staðfestur af hinni hæðinni');
if (!hus.haedir[2].heil) villur.push('kjallarinn á að vera sameign í heild');
// 3. stigi á aðeins einu af þremur blöðum: ekki stigahús
const einn = TS.greinaHus([
  { lykill: 'A', pxmSrc: PX, R: haed(true), nafn: '1. hæð' }, { lykill: 'B', pxmSrc: PX, R: haed(false), nafn: '2. hæð' }, { lykill: 'C', pxmSrc: PX, R: haed(false), nafn: '3. hæð' }
]);
if (einn.haedir[0].svaedi.some(v => v.teg === 'stigahus')) villur.push('stigi á einu blaði af þremur varð stigahús (á að krefjast tveggja staðfestinga)');

// 4. tengingin
const krefst = (txt, re, m) => { if (!re.test(txt)) villur.push(m); };
krefst(html, /446-teikning-sameign\.js/, 'index.html hleður ekki 446');
krefst(s383, /fp-sameign-btn/, '383: Sameign-takkinn í 2D vantar');
krefst(s383, /id="fp-3d-sameign"/, '383: Sameign-takkinn í 3D vantar');
krefst(s383, /TS\.greinaHus\(inn\)/, '383 kallar ekki á greinaHus');
krefst(s383, /stigaStafli: ut\.length >= 3/, '383: stigastafli aðeins fyrir 3+ hæðir');
krefst(s383, /const snid = raun && \(o\.snid \|\| lag\.filter\(lg => lg\.hopur\.visible\)\.length >= 3\)/, '383 blenderSena: sneiðmynd aðeins fyrir 3+ hæðir (1–2 hæða myndir óbreyttar)');
krefst(s383, /if \(snid && hd\.sameign/, '383 blenderSena: sameign aðeins í sneiðmynd');
krefst(s445, /TeiknSameign\.teikna\(/, '445 teiknar ekki sameign á vinnumynd');
krefst(s433, /TeiknBord\.sameignAthuga/, '433: athugasemd um tæki utan sameignar vantar');
if (/DB\.sb\.from\(['"]teikning_bord['"]\)\.(insert|update|upsert)/.test(s446)) villur.push('446 má ekkert skrifa');

if (villur.length) { console.log('TEIKNING-SAMEIGN RAUTT\n  · ' + villur.join('\n  · ')); process.exit(1); }
console.log('TEIKNING-SAMEIGN GRÆNT — heiti flokkast, stigi + stigahús + gangur við lyftu finnast á gervigrunnmynd, íbúð ekki, staðfesting milli blaða, kjallari allur, tengt í 2D/3D/vinnumynd/Blender.');
