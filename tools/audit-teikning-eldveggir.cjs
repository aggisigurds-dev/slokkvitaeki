#!/usr/bin/env node
/**
 * VÖRÐUR: eldveggir úr TurboPaint í Teikning (383). Agnar 07.10.2026: „Eldveggur er veggur með tegund — ekki sérstakt
 * yfirlag sem týnist." TurboPaint vistar eldvegg í haedir[].veggjaLinur sem { p, t, tegund: 'veggur', eld: 60 | 30 }
 * (og les tegund 'ei60' / 'ei30').
 *
 * Fastar sem mega ekki detta út:
 *   • eldveggjaLinur(h) les eld 60/30 (og tegund ei60/ei30) — venjulegir veggir, gler og hurðir eru ekki eldveggir
 *   • klippaButa heldur eldflokknum (bútur[5]) þegar veggurinn er klipptur við skurðinn
 *   • reiknaEld: TurboPaint-eldveggur ræður flokknum, handval („Breyta eldveggjum", eldVal) gengur fyrir
 *   • eldri hæðir (engin eld á veggjaLinur) — nákvæmlega sama útkoma og áður
 *   • 2D-yfirlagið teiknar eldveggina og fingrafarið breytist með þeim
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROT = path.join(__dirname, '..');
const skra = fs.readFileSync(path.join(ROT, 'js/patches/383-teikning-hreinsa-3d.js'), 'utf8');
const villur = [];
const krefst = (re, skilabod) => { if (!re.test(skra)) villur.push(skilabod); };

krefst(/const tpVeggir = tp\.filter\(v => !v\.tegund \|\| v\.tegund === 'veggur' \|\| v\.tegund === 'ei60' \|\| v\.tegund === 'ei30'\)/, 'eldveggir (ei60/ei30) verða að vera veggir í 3D');
krefst(/e = eldflokkurVeggs\(v\)/, 'tpButar á að bera eldflokk veggjarins (bútur[5])');
krefst(/const eldL = eldveggjaLinur\(h\)/, '2D-yfirlagið á að teikna eldveggi TurboPaint');
krefst(/eldveggjaLinur\(h\)\.map\(v => v\.e \+ ':'/, 'fingrafar 2D-yfirlagsins á að fylgja eldveggjunum');

function hlaða() {
  const el = () => ({
    style: {}, dataset: {},
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    appendChild() {}, setAttribute() {}, addEventListener() {}, removeEventListener() {},
    querySelector() { return null; }, querySelectorAll() { return []; }, remove() {},
    getContext() { return { fillRect() {}, drawImage() {}, getImageData() { return { data: new Uint8Array(0) }; }, putImageData() {}, beginPath() {}, moveTo() {}, lineTo() {}, stroke() {} }; }
  });
  const document = {
    documentElement: {}, getElementById() { return null; }, querySelector() { return null; }, querySelectorAll() { return []; },
    createElement: el, addEventListener() {}, head: { appendChild() {} }, body: { appendChild() {} }
  };
  const ctx = {
    document, console,
    setInterval() { return 0; }, setTimeout() { return 0; }, clearInterval() {},
    MutationObserver: class { observe() {} disconnect() {} },
    getComputedStyle() { return { display: 'none' }; },
    performance: { now() { return 0; } },
    localStorage: { getItem() { return null; }, setItem() {}, removeItem() {} },
    Uint8Array, Int8Array, Uint16Array, Uint32Array, Int32Array, Float64Array, Math, URL, Promise, Object, Array, JSON, Number, String, Boolean, Map, Set
  };
  ctx.window = ctx;
  ctx.globalThis = ctx;
  vm.runInNewContext(skra, ctx);
  if (!ctx.window.Teikn3D || !ctx.window.Teikn3D.reiknaEld) throw new Error('Teikn3D.reiknaEld komst ekki út');
  return ctx.window.Teikn3D;
}

try {
  const T = hlaða();
  const h = {
    veggjaLinur: [
      { p: [0, 0, 1000, 0], t: 10, tegund: 'veggur', eld: 60 },
      { p: [0, 100, 1000, 100], t: 10, tegund: 'veggur', eld: 30 },
      { p: [0, 200, 1000, 200], t: 10, tegund: 'ei60' },
      { p: [0, 300, 1000, 300], t: 10, tegund: 'veggur' },
      { p: [0, 400, 1000, 400], t: 10 },
      { p: [0, 500, 1000, 500], t: 10, tegund: 'gler', eld: 60 },
      { p: [0, 600, 1000, 600], t: 10, tegund: 'hurd' }
    ]
  };
  const e = T.eldveggjaLinur(h).map(v => v.e);
  if (JSON.stringify(e) !== JSON.stringify([60, 30, 60])) villur.push('eldveggjaLinur las rangt: ' + JSON.stringify(e));
  if (T.eldveggjaLinur({ veggjaLinur: [{ p: [0, 0, 1, 1], t: 1, tegund: 'veggur' }] }).length) villur.push('venjulegur veggur varð eldveggur');
  if (T.eldveggjaLinur({}).length) villur.push('hæð án veggjaLinur á að gefa tómt');

  const k = T.klippaButa([[-100, 50, 500, 50, 10, 60], [-100, 80, 500, 80, 10]], { x: 0, y: 0, w: 300, h: 300 });
  if (k.length !== 2 || k[0][5] !== 60 || k[0].length !== 6 || k[1].length !== 5) villur.push('klippaButa á að halda eldflokki (og aðeins honum): ' + JSON.stringify(k));

  // reiknaEld: eldveggur TurboPaint ræður; handval gengur fyrir
  const butar = [[0, 0, 1000, 0, 10, 60], [0, 0, 0, 800, 10], [1000, 0, 1000, 800, 10], [0, 800, 1000, 800, 10], [0, 400, 1000, 400, 10, 30]];
  const u = { butar, gler: null, hurdir: null, sk: { x: 0, y: 0, w: 1000, h: 800 }, frumB: 2384, frumH: 1700 };
  T.reiknaEld(u, [], null);
  if (!u.eld || u.eld[0] !== 60 || u.eld[4] !== 30 || u.eld[1] !== 0) villur.push('reiknaEld: eldflokkur TurboPaint skilaði sér ekki: ' + JSON.stringify(u.eld && Array.from(u.eld)));
  if (!u.tpEld || u.tpEld[0] !== 60) villur.push('reiknaEld: tpEld (skýring „merkt í TurboPaint") vantar');
  if (!u.handval || Array.from(u.handval).some(x => x >= 0)) villur.push('TurboPaint-eldveggur á ekki að teljast handval');
  const u2 = { butar, gler: null, hurdir: null, sk: { x: 0, y: 0, w: 1000, h: 800 }, frumB: 2384, frumH: 1700 };
  T.reiknaEld(u2, [], [[0, 0, 1000, 0, 0]]);
  if (!u2.eld || u2.eld[0] !== 0) villur.push('handval (0 = ekki brunaveggur) á að ganga fyrir TurboPaint-eldvegg');

  // eldri hæðir: engin eld → sama og áður (enginn eldflokkur, engin tpEld)
  const u3 = { butar: butar.map(v => v.slice(0, 5)), gler: null, hurdir: null, sk: { x: 0, y: 0, w: 1000, h: 800 }, frumB: 2384, frumH: 1700 };
  T.reiknaEld(u3, [], null);
  if (u3.eld !== null || u3.tpEld !== null) villur.push('hæð án eldveggja á að fá eld = null eins og áður');
} catch (e) {
  villur.push('keyrsla: ' + ((e && e.stack) || e));
}

if (villur.length) {
  console.log('TEIKNING ELDVEGGIR RAUDT — ' + villur.length + ' vantar:');
  villur.forEach(v => console.log('  · ' + v));
  process.exit(1);
}
console.log('TEIKNING ELDVEGGIR GRAENT — eld á veggjaLinur → rauðir veggir í 2D/3D, handval gengur fyrir, eldri hæðir óbreyttar');
