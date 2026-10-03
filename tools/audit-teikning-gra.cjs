#!/usr/bin/env node
/**
 * VÖRÐUR: 2D má ekki skemma teikninguna. 3D sýnir aðeins húsið.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROT = path.join(__dirname, '..');
const skra = fs.readFileSync(path.join(ROT, 'js/patches/383-teikning-hreinsa-3d.js'), 'utf8');
const html = fs.readFileSync(path.join(ROT, 'index.html'), 'utf8');
const villur = [];
const krefst = (re, msg) => { if (!re.test(skra)) villur.push(msg); };

krefst(/function husMaska/, 'husMaska vantar — 3D á að halda bara stærsta húsinu');
krefst(/function golfMedUti/, 'golfMedUti vantar');
krefst(/px\[j \+ 3\] = 0/, '3D-gólf á að stinga alpha=0 utan húss');
krefst(/gd\[i \* 4 \+ 3\] < 16\) veggir\[i\] = 0/, '3D-veggir utan húss eiga að detta út');
krefst(/2D sýnir ALLTAF grunnmyndina/, 'beita má ekki skipta 2D út');
krefst(/alphaTest: 0\.05/, '3D-gólf þarf alphaTest');
krefst(/const DOKKT_HUS = 130/, 'DOKKT_HUS=130 — grá lóð má ekki teljast veggur');
krefst(/herbergi/, 'husMaska á að velja lokuð hvít herbergi, ekki CAD-línunet');
krefst(/Math\.max\(W, H\) \/ 220/, 'utiMaska má ekki innsigla strikuð lóðarmörk með r=max/80');
if (/ut = r\.strigi/.test(skra)) villur.push('2D má ekki skipta grunnmynd út fyrir r.strigi');
if (/function hvitaGraUtan/.test(skra)) villur.push('hvitaGraUtan má ekki vera');
if (/ut = G\.graUtan/.test(skra)) villur.push('beita má ekki sýna hvitaða grunnmynd');
if (!/383-teikning-hreinsa-3d\.js\?v=20261002veg/.test(html)) {
  villur.push('index.html: 383 vantar ?v=20261002veg');
}

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
  const ctx = {
    window: {}, document, console,
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

function veggir(gra, W, H, x0, y0, x1, y1, litur, thykkt) {
  const sett = (x, y) => { if (x >= 0 && x < W && y >= 0 && y < H) gra[y * W + x] = litur; };
  for (let t = 0; t < thykkt; t++) {
    for (let x = x0; x <= x1; x++) { sett(x, y0 + t); sett(x, y1 - t); }
    for (let y = y0; y <= y1; y++) { sett(x0 + t, y); sett(x1 - t, y); }
  }
}

try {
  const T = hlaða();
  const W = 800, H = 600;
  const gra = new Uint8Array(W * H);
  gra.fill(250);
  veggir(gra, W, H, 180, 80, 720, 520, 45, 3);
  for (let y = 84; y <= 516; y++) {
    for (let x = 184; x <= 716; x++) {
      if (gra[y * W + x] > 130) gra[y * W + x] = 175;
    }
  }
  for (let y = 162; y <= 438; y++) {
    for (let x = 252; x <= 548; x++) gra[y * W + x] = 250;
  }
  veggir(gra, W, H, 250, 160, 550, 440, 40, 6);
  veggir(gra, W, H, 20, 20, 140, 200, 30, 4);
  for (let x = 140; x <= 250; x++) gra[300 * W + x] = 40;

  const hus = T.husMaska(gra, W, H);
  if (!hus[300 * W + 400]) villur.push('stofa inni í húsi átti að haldast');
  if (!hus[300 * W + 250]) villur.push('veggur húss átti að haldast');
  if (hus[100 * W + 400]) villur.push('grá lóð inni í lóðarmörkum má ekki vera 3D-gólf');
  if (hus[80 * W + 400]) villur.push('lóðarmörk mega ekki verða 3D-veggur utan húss');
  if (hus[10 * W + 10]) villur.push('hvítt blað má ekki vera 3D-gólf');
  if (hus[60 * W + 40]) villur.push('nafnreitur/snið má ekki vera 3D-hús');

  const gra2 = new Uint8Array(W * H);
  gra2.fill(250);
  veggir(gra2, W, H, 250, 160, 550, 440, 40, 1);
  const hus2 = T.husMaska(gra2, W, H);
  if (!hus2[300 * W + 400]) villur.push('stofa á bak við 1 px vegg átti að haldast');
  if (hus2[20 * W + 20]) villur.push('spássía má ekki vera hús þegar veggir eru 1 px');
} catch (e) {
  villur.push('keyrsla: ' + ((e && e.stack) || e));
}

if (villur.length) {
  console.log('TEIKNING-GRA RAUDT — ' + villur.length + ' vantar:');
  villur.forEach(v => console.log('  · ' + v));
  process.exit(1);
}
console.log('TEIKNING-GRA GRÆNT — 2D ósnert, 3D aðeins húsið');
process.exit(0);
