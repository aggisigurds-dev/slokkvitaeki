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
const krefst = (txt, re, m) => { if (!re.test(txt)) villur.push(m); };
const lesa = f => fs.readFileSync(path.join(ROT, f), 'utf8');
const s446 = lesa('js/patches/446-teikning-sameign.js'), s383 = lesa('js/patches/383-teikning-hreinsa-3d.js');
const s445 = lesa('js/patches/445-teikning-vinnumynd.js'), s433 = lesa('js/patches/433-teikning-merking.js'), html = lesa('index.html');

// 446 keyrt í aðalsamhenginu: vm-samhengi gerði talnalykkjurnar ~20× hægari (38 s í stað nokkurra)
(0, eval)(s446);
const TS = globalThis.TeiknSameign;
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

// 5. Umferð 2 (08.10.2026): ályktun, hringstigi, skástigi, kvarðaleiðrétting
// 5a. ÁLYKTUN: stiginn á 1. og 3. hæð (ólík blöð) en ekki 2. — stigahúsið er lagt til á 2. hæð, merkt „ályktað"
const aly = TS.greinaHus([
  { lykill: 'A', pxmSrc: PX, R: haed(true), nafn: '1. hæð' }, { lykill: 'B', pxmSrc: PX, R: haed(false), nafn: '2. hæð' }, { lykill: 'C', pxmSrc: PX, R: haed(true), nafn: '3. hæð' }
]);
if (!aly.haedir[1].svaedi.some(v => v.teg === 'stigahus' && v.alyktad)) villur.push('ályktun: stigahús á 1. og 3. hæð var ekki lagt til á 2. hæð (' + JSON.stringify(aly.haedir[1].talning) + ')');
if (aly.haedir[0].svaedi.some(v => v.alyktad)) villur.push('ályktun: hæð þar sem stiginn FANNST fékk ályktað svæði');
if (!/v\.alyktad \? \[5, 4\]/.test(s446) || !/\(ályktað\)/.test(s446)) villur.push('446 teikna: ályktað stigahús á að vera strikað og merkt „(ályktað)"');
// 5b. HRINGSTIGI: 10 geislar á 18° fresti um súlu (hálfhringur) finnast; lyftukross (4 geislar) ekki
function hringMynd(geislar, hornBil) {
  const W2 = 8 * PX, H2 = 8 * PX, g = new Uint8Array(W2 * H2).fill(255), cx = 4 * PX, cy = 4 * PX;
  for (let k = 0; k < geislar; k++) {
    const a = (10 + k * hornBil) * Math.PI / 180;
    for (let r = 0.3 * PX; r <= 1.3 * PX; r += 0.5) { const x = Math.round(cx + r * Math.cos(a)), y = Math.round(cy + r * Math.sin(a)); g[y * W2 + x] = 0; }
  }
  for (let t = 0; t < 2 * Math.PI; t += 0.003) { const x = Math.round(cx + 0.3 * PX * Math.cos(t)), y = Math.round(cy + 0.3 * PX * Math.sin(t)); g[y * W2 + x] = 0; }
  return { g, W: W2, H: H2, s: 1 };
}
const hr = TS.hringstigar(hringMynd(10, 18));
if (!hr.length || Math.hypot(hr[0].cx - 4 * PX, hr[0].cy - 4 * PX) > 0.3 * PX) villur.push('hringstigi (10 geislar) fannst ekki: ' + JSON.stringify(hr.map(k => [k.n, k.cx, k.cy])));
if (TS.hringstigar(hringMynd(4, 90)).length) villur.push('kross (4 geislar) taldist hringstigi');
// 5c. SKÁSTIGI: skáálma á 45° (langir veggir) með 9 þrepum hornrétt á álmuna finnst sem s45/s135
{
  const W2 = 16 * PX, H2 = 16 * PX, g = new Uint8Array(W2 * H2).fill(255);
  const pkt = (x, y) => { const X = Math.round(x * PX), Y = Math.round(y * PX); if (X >= 0 && Y >= 0 && X < W2 && Y < H2) g[Y * W2 + X] = 0; };
  const strik = (x0, y0, x1, y1) => { const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) * PX * 2); for (let i = 0; i <= n; i++) pkt(x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n); };
  const u = [Math.SQRT1_2, Math.SQRT1_2], nn = [-Math.SQRT1_2, Math.SQRT1_2];
  // tveir veggir (tvær línur hvor) 13 m langir, 2,6 m á milli
  for (const d of [0, 0.15, 2.6, 2.75]) strik(2 + nn[0] * d, 2 + nn[1] * d, 2 + nn[0] * d + u[0] * 13, 2 + nn[1] * d + u[1] * 13);
  // þrep: 9 línur þvert á álmuna (frá vegg að vegg), 0,28 m bil, byrja 5 m inn í álmunni
  for (let k = 0; k < 9; k++) { const s = 5 + k * 0.28; strik(2 + u[0] * s + nn[0] * 0.3, 2 + u[1] * s + nn[1] * 0.3, 2 + u[0] * s + nn[0] * 2.45, 2 + u[1] * s + nn[1] * 2.45); }
  const ska = TS.skakambar({ g, W: W2, H: H2, s: 1 });
  if (!ska.some(k => k.n >= 8 && /^s(45|135)$/.test(k.ass))) villur.push('skástigi á 45° fannst ekki: ' + JSON.stringify(ska.map(k => [k.ass, k.n])) + ' horn ' + JSON.stringify(TS.rikjandiHorn({ g, W: W2, H: H2, s: 1 })));
}
// 5d. KVARÐI: kjallari teiknaður í 1:200 (helmingi minni) en lesinn sem 1:100 — endurRasti með réttum kvarða er beðið um
{
  const smaekka = (R0, f) => { const W2 = Math.round(R0.W * f), H2 = Math.round(R0.H * f), g = new Uint8Array(W2 * H2).fill(255); for (let y = 0; y < R0.H; y++) for (let x = 0; x < R0.W; x++) if (!R0.g[y * R0.W + x]) g[Math.min(H2 - 1, Math.floor(y * f)) * W2 + Math.min(W2 - 1, Math.floor(x * f))] = 0; return { g, W: W2, H: H2, s: 1 }; };
  let bedid = null;
  TS.greinaHus([
    { lykill: 'K', pxmSrc: PX, R: smaekka(haed(true), 0.5), nafn: 'Kjallari', endurRasti: p => { bedid = p; return haed(true); } },
    { lykill: 'A', pxmSrc: PX, R: haed(true), nafn: '1. hæð' }, { lykill: 'B', pxmSrc: PX, R: haed(true), nafn: '2. hæð' }, { lykill: 'C', pxmSrc: PX, R: haed(true), nafn: '3. hæð' }
  ]);
  if (!bedid || bedid > PX * 0.62) villur.push('kvarði: kjallari í hálfum kvarða var ekki lesinn aftur (endurRasti ' + bedid + ')');
}
// 5e. TENGINGAR: takkinn aðeins þegar hann á við, fjölhæða-vinnumyndir, lóðarteikningar
krefst(s383, /function samAvid\(\)/, '383: samAvid (Sameign-takkinn aðeins í fjölbýli) vantar');
krefst(s383, /fp-sameign-btn\.fp-ekki\{display:none!important\}/, '383: Sameign-takkinn felst ekki (fp-ekki)');
krefst(s383, /sena\.vinnumyndir = vms/, '383 blenderSena: vinnumyndir hverrar hæðar vantar');
krefst(s383, /const blVmFyrir = /, '383: Nota sem vinnumynd á hverju vinnuskjali (blVmFyrir) vantar');
krefst(s383, /TS\.greinaHusBid/, '383: greiningin á að anda (greinaHusBid)');
krefst(lesa('netlify/functions/teikn-listi.js'), /heitinumer=0/, 'teikn-listi: lóðarteikningar (heitinumer=0) vantar');

// 4. tengingin
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
console.log('TEIKNING-SAMEIGN GRÆNT — heiti flokkast, stigi + stigahús + gangur við lyftu finnast á gervigrunnmynd, íbúð ekki, staðfesting milli blaða, kjallari allur, ályktun á milli hæða, hringstigi, skástigi, kvarði kjallara, tengt í 2D/3D/vinnumynd/Blender/Sameign-takka/lóðarteikningar.');
