#!/usr/bin/env node
/**
 * VÖRÐUR: veggagreining á teikningu (383). Agnar 02.10.2026: svört stika
 * með slitinni setningu + 1,0% veggir á venjulegri grunnmynd (raster, enginn
 * vigur, þunnar línur, stórt hvítt blað).
 *
 * Fastar sem mega ekki detta út:
 *   • viðvörun er EIN læsileg íslensk lína, ekki „sýni upprunalegu…"
 *   • 3D má ekki þykjast virka undir 4% þekju
 *   • blekRammi sker auða spássíu þegar finnaHus skilar null
 *   • Veggir er áfram varaleið
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROT = path.join(__dirname, '..');
const skra = fs.readFileSync(path.join(ROT, 'js/patches/383-teikning-hreinsa-3d.js'), 'utf8');
const villur = [];

const krefst = (re, skilabod) => { if (!re.test(skra)) villur.push(skilabod); };

krefst(/Sjálfvirk veggagreining náði ekki/, 'viðvörun verður að vera ein skýr íslensk lína');
krefst(/Engir vigrar í PDF/, 'PDF-án-vigurs á að segja „Engir vigrar í PDF"');
krefst(/Fyrir 3D: teiknaðu með Veggir/, 'varaleið Veggir verður að standa í viðvöruninni');
if (/sýni upprunalegu teikninguna/.test(skra)) villur.push('gamla slitin setningin („sýni upprunalegu…") er enn í 383');
krefst(/white-space:nowrap;overflow:hidden;text-overflow:ellipsis/, 'viðvörunarstikan á að vera ein lína');
krefst(/const NOTHAEF_THEKJA = 0\.04/, '3D/hreinsun má ekki þykjast undir 4% þekju');
krefst(/function blekRammi/, 'blekRammi (spássíuskurður) vantar');
krefst(/dokkt: 210, thykkt: 1, fylla: true/, 'þunnlínu-CAD endurtekning vantar');
krefst(/hluti >= 0\.08 && hluti <= 0\.88/, 'þunnlínu-niðurstaða má aðeins vinna með heilt fótspor');
krefst(/gera\('fp-veggir-btn', '✏ Veggir'/, '✏ Veggir takki má ekki detta út');
krefst(/r\.thekja >= NOTHAEF_THEKJA && !h\.pdfVeggir\.length \? r\.veggir : new Uint8Array/, '3D má ekki lyfta slitrugrímunni');

function hlaða() {
  const el = () => ({
    style: {}, dataset: {},
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    appendChild() {}, setAttribute() {}, addEventListener() {}, removeEventListener() {},
    querySelector() { return null; }, querySelectorAll() { return []; }, remove() {},
    getContext() {
      return {
        fillRect() {}, drawImage() {}, getImageData() { return { data: new Uint8Array(0) }; },
        putImageData() {}, beginPath() {}, moveTo() {}, lineTo() {}, stroke() {}
      };
    }
  });
  const document = {
    documentElement: {},
    getElementById() { return null; },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    createElement: el,
    addEventListener() {},
    head: { appendChild() {} },
    body: { appendChild() {} }
  };
  const window = {};
  const ctx = {
    window, document, console,
    setInterval() { return 0; },
    setTimeout() { return 0; },
    clearInterval() {},
    MutationObserver: class { observe() {} disconnect() {} },
    getComputedStyle() { return { display: 'none' }; },
    performance: { now() { return 0; } },
    localStorage: { getItem() { return null; }, setItem() {}, removeItem() {} },
    Uint8Array, Int32Array, Math, URL, Promise, Object, Array, JSON, Number, String, Boolean
  };
  ctx.window = ctx;
  ctx.globalThis = ctx;
  vm.runInNewContext(skra, ctx);
  if (!ctx.window.TeiknHreinsun) throw new Error('TeiknHreinsun komst ekki út');
  return ctx.window.TeiknHreinsun;
}

function teiknaHus(W, H, x0, y0, x1, y1, litur, thykkt) {
  const gra = new Uint8Array(W * H); gra.fill(255);
  const sett = (x, y) => { if (x >= 0 && x < W && y >= 0 && y < H) gra[y * W + x] = litur; };
  for (let t = 0; t < thykkt; t++) {
    for (let x = x0; x <= x1; x++) { sett(x, y0 + t); sett(x, y1 - t); }
    for (let y = y0; y <= y1; y++) { sett(x0 + t, y); sett(x1 - t, y); }
  }
  // milliveggur
  const mx = Math.round((x0 + x1) / 2);
  for (let t = 0; t < thykkt; t++) for (let y = y0; y <= y1; y++) sett(mx + t, y);
  return gra;
}

try {
  const T = hlaða();
  const W = 800, H = 600;
  // Stórt hvítt blað, hús í miðju — dæmigerð grunnmynd.
  const gra = teiknaHus(W, H, 220, 140, 580, 460, 40, 3);
  const rammi = T.blekRammi(gra, W, H);
  if (!rammi) villur.push('blekRammi fann ekki hús á stóru hvítu blaði');
  else {
    const flat = rammi.w * rammi.h;
    if (flat > 0.55) villur.push('blekRammi skar of laust: ' + (flat * 100).toFixed(1) + '% af blaði');
    if (rammi.x > 0.32 || rammi.y > 0.28) villur.push('blekRammi byrjar of langt inn í húsið');
    if (rammi.x + rammi.w < 0.68 || rammi.y + rammi.h < 0.72) villur.push('blekRammi klippti húsið');
  }
  const hus = T.finnaHus(gra, W, H);
  if (!hus) villur.push('finnaHus átti að finna dökkt hús á hvítu blaði');

  // Tómt blað: enginn skurður.
  const tomt = new Uint8Array(W * H); tomt.fill(255);
  if (T.blekRammi(tomt, W, H)) villur.push('blekRammi má ekki skera tómt blað');

  // Þunnlínu-CAD: 2 px veggir, ljósgrátt blek, stórt blað. Sjálfgefin opnun étur þá.
  const thunn = teiknaHus(1200, 900, 300, 180, 900, 720, 90, 2);
  const g0 = T.hreinsaGogn(thunn, 1200, 900, {});
  const g2 = T.hreinsaGogn(thunn, 1200, 900, { dokkt: 210, thykkt: 1, fylla: true });
  if (g2.thekja + 1e-9 < g0.thekja) villur.push('þunnlínu-endurtekning má ekki finna FÆRRI veggi en sjálfgefið');

  // Fylltir þykkir veggir: sjálfgefið á að ná yfir 4% á skornum ramma (ekki A0).
  const fyllt = teiknaHus(400, 300, 20, 20, 380, 280, 20, 8);
  const gf = T.hreinsaGogn(fyllt, 400, 300, {});
  if (gf.thekja < 0.04) villur.push('fylltir veggir á skornum ramma áttu að ná 4% (var ' + (gf.thekja * 100).toFixed(1) + '%)');
} catch (e) {
  villur.push('keyrsla: ' + ((e && e.stack) || e));
}

if (villur.length) {
  console.log('VEGGAGREINING RAUDT — ' + villur.length + ' vantar:');
  villur.forEach(v => console.log('  · ' + v));
  process.exit(1);
}
console.log('VEGGAGREINING GRAENT — viðvörun, blekRammi, 4% hlið og Veggir standa');
