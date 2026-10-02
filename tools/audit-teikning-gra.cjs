#!/usr/bin/env node
/**
 * VÖRÐUR: Skýrari á 2D má aðeins hvíta grátt UTAN hússins.
 * Agnar 02.10.2026: „I only meant the grey area outside the building".
 *
 * Fastar:
 *   • 2D notar hvitaGraUtan, ekki veggjabitmap (r.strigi)
 *   • finnaHus / blekRammi hunsa gráa lóð (150–200)
 *   • grunnmyndin inni í húsinu helst
 *   • 3D notar áfram veggjamaskann
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROT = path.join(__dirname, '..');
const skra = fs.readFileSync(path.join(ROT, 'js/patches/383-teikning-hreinsa-3d.js'), 'utf8');
const html = fs.readFileSync(path.join(ROT, 'index.html'), 'utf8');
const villur = [];
const krefst = (re, msg) => { if (!re.test(skra)) villur.push(msg); };

krefst(/function hvitaGraUtan/, 'hvitaGraUtan vantar — Skýrari á að hvíta grátt utan húss');
krefst(/function hvitaGraUtanGra/, 'hvitaGraUtanGra vantar (prófanleg grein án striga)');
krefst(/ut = G\.graUtan/, 'beita á að sýna hvitaða grunnmynd, ekki veggi');
krefst(/Grátt utan húss hreinsað/, 'stikan á að segja að grátt utan húss sé hreinsað');
krefst(/const DOKKT_HUS = 130/, 'DOKKT_HUS=130 — grá lóð má ekki teljast blek');
krefst(/dokkt = dokkt == null \? DOKKT_HUS/, 'blekRammi á að hunsa grátt sjálfgefið');
krefst(/3D notar hreinsa\(\) áfram/, '3D má ekki missa veggjamaskann');
if (/if \(r && r\.thekja >= NOTHAEF_THEKJA\) ut = r\.strigi/.test(skra)) {
  villur.push('2D Skýrari má ekki skipta út grunnmynd fyrir veggjabitmap (r.strigi)');
}
if (!/383-teikning-hreinsa-3d\.js\?v=20261002gra/.test(html)) {
  villur.push('index.html: 383 vantar ?v=20261002gra');
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
  const mx = Math.round((x0 + x1) / 2);
  for (let t = 0; t < thykkt; t++) for (let y = y0; y <= y1; y++) sett(mx + t, y);
}

try {
  const T = hlaða();
  const W = 800, H = 600;
  const gra = new Uint8Array(W * H);
  gra.fill(180);
  veggir(gra, W, H, 250, 160, 550, 440, 40, 6);
  gra[60 * W + 60] = 20;

  const hus = T.finnaHus(gra, W, H);
  if (!hus) villur.push('finnaHus átti að finna dökkt hús inni á grárri lóð');
  else {
    const flat = hus.w * hus.h;
    if (flat > 0.55) villur.push('finnaHus tók lóðina með: ' + (flat * 100).toFixed(1) + '% af blaði');
    if (hus.x > 0.36 || hus.y > 0.32) villur.push('finnaHus byrjar of langt inn í húsið');
    if (hus.x + hus.w < 0.64 || hus.y + hus.h < 0.68) villur.push('finnaHus klippti húsið');
  }

  const rammi = T.blekRammi(gra, W, H);
  if (!rammi) villur.push('blekRammi fann ekki hús á grárri lóð');
  else {
    const flat = rammi.w * rammi.h;
    if (flat > 0.55) villur.push('blekRammi tók lóðina með: ' + (flat * 100).toFixed(1) + '%');
  }

  const ut = T.hvitaGraUtanGra(gra, W, H);
  const utan = ut[20 * W + 20];
  const inn = ut[350 * W + 350];
  const veggur = ut[300 * W + 250];
  const texti = ut[60 * W + 60];
  if (utan < 248) villur.push('grá lóð utan húss átti að verða hvít (var ' + utan + ')');
  if (inn < 160 || inn > 200) villur.push('inni í húsinu átti grátt/upprunalegt að haldast (var ' + inn + ')');
  if (veggur > 60) villur.push('veggur inni átti að haldast dökkur (var ' + veggur + ')');
  if (texti > 40) villur.push('dökkur texti utan húss átti að haldast (var ' + texti + ')');

  const lod = new Uint8Array(W * H); lod.fill(180);
  if (T.finnaHus(lod, W, H)) villur.push('finnaHus má ekki skera að auðri/grárri lóð án húss');
  if (T.blekRammi(lod, W, H)) villur.push('blekRammi má ekki skera að auðri/grárri lóð án húss');
} catch (e) {
  villur.push('keyrsla: ' + ((e && e.stack) || e));
}

if (villur.length) {
  console.log('TEIKNING-GRA RAUDT — ' + villur.length + ' vantar:');
  villur.forEach(v => console.log('  · ' + v));
  process.exit(1);
}
console.log('TEIKNING-GRA GRÆNT — grátt utan húss hvítt, grunnmyndin helst');
process.exit(0);
