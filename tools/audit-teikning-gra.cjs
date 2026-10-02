#!/usr/bin/env node
/**
 * VÖRÐUR: 3D-draugur. Agnar 02.10.2026: „I was talking about the 3d ghost".
 *
 * Fastar:
 *   • 2D má EKKI hvíta/bleikja grunnmyndina (hvitaGraUtan / G.graUtan)
 *   • Skýrari á 2D er veggjamaski (r.strigi) eins og áður
 *   • 3D-gólf er upprunalega teikningin, gegnsæ UTAN hússins
 *   • grá lóð (150–200) er ekki veggur — annars fyllir efri hæðin gluggann
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROT = path.join(__dirname, '..');
const skra = fs.readFileSync(path.join(ROT, 'js/patches/383-teikning-hreinsa-3d.js'), 'utf8');
const html = fs.readFileSync(path.join(ROT, 'index.html'), 'utf8');
const villur = [];
const krefst = (re, msg) => { if (!re.test(skra)) villur.push(msg); };

krefst(/function utiMaska/, 'utiMaska vantar — 3D þarf að vita hvað er UTAN hússins');
krefst(/function golfMedUti/, 'golfMedUti vantar — 3D-gólf á að vera gegnsætt utan húss');
krefst(/px\[j \+ 3\] = 0/, '3D-gólf á að stinga alpha=0 utan húss, ekki hvíta');
krefst(/golfMedUti\(stig1/, 'undirbua á að nota golfMedUti, ekki r.vinnu (grá plata)');
krefst(/alphaTest: 0\.05/, '3D-gólf þarf alphaTest svo gegnsæir punktar feli ekki neðri hæð');
krefst(/transparent: true, opacity: nr > 0 \? 0\.42 : 1/, 'allar hæðir transparent — grá lóð má ekki vera ógegnsæ plata');
krefst(/const DOKKT_HUS = 130/, 'DOKKT_HUS=130 — grá lóð má ekki teljast veggur í 3D');
krefst(/if \(r && r\.thekja >= NOTHAEF_THEKJA\) ut = r\.strigi/, '2D Skýrari á að vera veggjamaski, ekki hvítun');
if (/function hvitaGraUtan/.test(skra)) villur.push('hvitaGraUtan má ekki vera — 2D má ekki hvíta teikninguna');
if (/ut = G\.graUtan/.test(skra)) villur.push('beita má ekki sýna hvitaða grunnmynd (G.graUtan)');
if (/Grátt utan húss hreinsað/.test(skra)) villur.push('stikan má ekki lofa 2D-hvítun');
if (!/383-teikning-hreinsa-3d\.js\?v=20261002draugur/.test(html)) {
  villur.push('index.html: 383 vantar ?v=20261002draugur');
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

  const uti = T.utiMaska(gra, W, H);
  if (!uti) villur.push('utiMaska skilaði engu');
  else {
    if (!uti[20 * W + 20]) villur.push('grá lóð UTAN húss átti að vera gegnsæ í 3D');
    if (uti[350 * W + 350]) villur.push('inni í húsinu átti gólfið að haldast (ekki gegnsætt)');
    if (uti[300 * W + 250]) villur.push('veggur átti að loka — ekki gegnsætt');
  }

  const lod = new Uint8Array(W * H); lod.fill(180);
  const utiLod = T.utiMaska(lod, W, H);
  let utiN = 0;
  for (let i = 0; i < W * H; i++) utiN += utiLod[i];
  if (utiN < W * H * 0.98) villur.push('auð grá lóð án veggja átti að vera algegnsæ í 3D');
} catch (e) {
  villur.push('keyrsla: ' + ((e && e.stack) || e));
}

if (villur.length) {
  console.log('TEIKNING-GRA RAUDT — ' + villur.length + ' vantar:');
  villur.forEach(v => console.log('  · ' + v));
  process.exit(1);
}
console.log('TEIKNING-GRA GRÆNT — 3D stingur grátt utan húss, 2D teikningin ósnert');
process.exit(0);
