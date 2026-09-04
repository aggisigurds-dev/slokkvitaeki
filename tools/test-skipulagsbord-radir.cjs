#!/usr/bin/env node
'use strict';
/**
 * Skipulagsbord (js/patches/305-skipulagsbord.js) — raðastýringin.
 *
 * Agnar 2026-09-04: „taka burtu markmið +- en sýna frekar fjölda verkefna á
 * borði, og + og mínus til að sýna fjölda rows … hin atriðin fyrir neðan
 * línu 3 detta ekki út."
 *
 * Loforðið sem má ALDREI brotna: fækkun raða FELUR, hún hendir engu. Þessi
 * prófun keyrir raunverulegan render() patchsins í smá-DOM (engin jsdom í
 * þessu umhverfi) og les HTML-ið sem kemur út.
 *
 * Seinni hlutinn prófar hina óskina frá sama degi: „láta 3. línuna yfirskrifa
 * punktavalið, að það þá hverfi ef texti verður of mikill" — bæði HTML-ið sem
 * kemur út og sjálfa línumælinguna (fölsuð spjaldhæð → sb-l2 / sb-l3).
 *
 *   node tools/test-skipulagsbord-radir.cjs
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const SRC = path.join(__dirname, '..', 'js', 'patches', '305-skipulagsbord.js');

// ── Smá-DOM ────────────────────────────────────────────────────────────────
const geymd = new Map();
const el = {
  id: 'vb-skipulag',
  innerHTML: '',
  contains: () => true,
  querySelector: () => null,
  _fake: {},
  querySelectorAll: sel => el._fake[sel] || []
};
function nyrNode(tag) {
  return {
    tagName: tag, id: '', innerHTML: '', textContent: '', style: {},
    setAttribute(k, v) { if (k === 'id') this.id = v; },
    getAttribute: () => null,
    appendChild() {}, remove() {},
    addEventListener() {},
    querySelector: () => null,
    querySelectorAll: () => []
  };
}
const smellarar = [];
const store = {};
global.localStorage = {
  getItem: k => (k in store ? store[k] : null),
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: k => { delete store[k]; }
};
global.document = {
  getElementById: id => (id === 'vb-skipulag' ? el : (geymd.get(id) || null)),
  createElement: nyrNode,
  head: { appendChild: n => { if (n.id) geymd.set(n.id, n); } },
  body: { appendChild() {} },
  addEventListener: (t, fn) => { if (t === 'click') smellarar.push(fn); },
  removeEventListener() {},
  querySelectorAll: () => []
};
global.window = global;
global.addEventListener = () => {};
global.Toast = { show() {} };
global.getComputedStyle = n => (n && n.__cs) || { lineHeight: '15px', fontSize: '11.5px' };
global.setTimeout = setTimeout;

vm.runInThisContext(fs.readFileSync(SRC, 'utf8'), { filename: SRC });

// ── Hjálpartól ─────────────────────────────────────────────────────────────
function smella(act) {
  const target = {
    closest: sel => (sel === '[data-sb]'
      ? { getAttribute: a => (a === 'data-sb' ? act : null) }
      : null)
  };
  smellarar.forEach(fn => fn({ target, stopPropagation() {}, preventDefault() {} }));
}
const holf   = () => (el.innerHTML.match(/data-sb-slot="/g) || []).length;
const radir  = () => Number((el.innerHTML.match(/Raðir:<\/span>[\s\S]{0,140}?>(\d+)</) || [])[1]);
const talin  = () => Number((el.innerHTML.match(/>(\d+)<\/span><span style="font-size:11px;color:#9aa0aa">spj/) || [])[1]);
const faldar = () => Number((el.innerHTML.match(/⤓ (\d+) spj/) || [])[1] || 0);
const synir  = id => el.innerHTML.indexOf('data-sb-card="' + id + '"') !== -1;

let fall = 0, ok = 0;
function pr(nafn, satt) {
  if (satt) { ok++; console.log('  ✅ ' + nafn); }
  else { fall++; console.log('  ❌ ' + nafn); }
}

// Opna borðið (sjálfgefið samanbrotið) og byrja á hreinu borði.
localStorage.setItem('vb_skipulag_open', '1');
Skipulagsbord.mount();

console.log('\nSKIPULAGSBORD — raðir og teljari\n');

pr('sjálfgefið 3 raðir = 12 rúður', holf() === 12 && radir() === 3);
pr('Markmiðs-teljarinn er farinn', el.innerHTML.indexOf('Markmið') === -1);
pr('hausinn sýnir fjölda spjalda (0)', talin() === 0);

// Spjöld á borðið
const idar = [];
for (let i = 0; i < 12; i++) {
  Skipulagsbord.addFromRow({ id: 'v' + i, customer_nafn: 'Fyrirtæki ' + i, title: 'mál ' + i });
}
el.innerHTML.replace(/data-sb-card="([^"]+)"/g, (_, id) => idar.push(id));
pr('12 spjöld bætt við — teljarinn segir 12', talin() === 12);
pr('12 spjöld rúmast í 3 röðum', radir() === 3 && idar.length === 12);

// 13. spjaldið á ekki að hverfa þegjandi — raðir vaxa sjálfkrafa
Skipulagsbord.addFromRow({ id: 'v12', customer_nafn: 'Þrettánda', title: '' });
pr('13. spjald → raðir vaxa sjálfkrafa í 4', radir() === 4 && holf() === 16);
pr('13. spjaldið sést', el.innerHTML.indexOf('Þrettánda') !== -1);
pr('engin falin röð eftir sjálfvirka stækkun', faldar() === 0);

// + og −
smella('rows-plus');
pr('+ → 5 raðir / 20 rúður', radir() === 5 && holf() === 20);
for (let i = 0; i < 9; i++) smella('rows-plus');
pr('+ stoppar á 10 röðum (40 rúður)', radir() === 10 && holf() === 40);
pr('+ er óvirkur í hámarki', /data-sb="rows-plus"[^>]*\sdisabled/.test(el.innerHTML));

// KJARNINN: fækkun felur, hendir ekki
for (let i = 0; i < 7; i++) smella('rows-minus');
pr('− aftur niður í 3 raðir', radir() === 3 && holf() === 12);
pr('spjöldin 13 eru ÖLL enn til (teljarinn óbreyttur)', talin() === 13);
pr('faldar raðir taldar upp undir griðinu', faldar() === 1);
pr('13. spjaldið er falið núna', el.innerHTML.indexOf('Þrettánda') === -1);

smella('rows-fit');
pr('⤓ sýna → raðir fara aftur í 4', radir() === 4);
pr('13. spjaldið er komið aftur óskaddað', el.innerHTML.indexOf('Þrettánda') !== -1);
pr('öll 13 spjöldin á sínum stað', idar.every(synir) && talin() === 13);

// Neðri mörk
for (let i = 0; i < 9; i++) smella('rows-minus');
pr('− stoppar á 1 röð (4 rúður)', radir() === 1 && holf() === 4);
pr('− er óvirkur í lágmarki', /data-sb="rows-minus"[^>]*\sdisabled/.test(el.innerHTML));
pr('ekkert spjald tapaðist í lágmarki', talin() === 13 && faldar() === 9);

// ═══ 3. LÍNAN YFIRSKRIFAR PUNKTAVALIÐ ═════════════════════════════════════
console.log('\nSKIPULAGSBORD — þriðja línan og punktaröðin\n');

// Minnispunkta-spjöld (verkbord_id === null) koma inn um localStorage-afritið.
localStorage.setItem('bh_sb', JSON.stringify({ rows: 3, cards: [
  { id: 'n1', slot: 0, verkbord_id: null, name: 'Setja upp Reykskynjara á Álhellu - Binni ath   Senda reikning - 7 kolsýru - 14 léttvatn - 21 skilti - 10 x tímard', title: '' },
  { id: 'n2', slot: 1, verkbord_id: null, name: 'Stutt', title: 'skýring hér' },
  { id: 'm1', slot: 2, verkbord_id: 4711, name: 'Fyrirtæki hf', title: 'mál á borðinu' }
] }));
Skipulagsbord.mount();

const kort = id => (el.innerHTML.split('data-sb-card="' + id + '"')[1] || '').split('</div></div>')[0];
pr('minnispunktur án skýringar fær 3 línur', /class="sb-nafn"[^>]*-webkit-line-clamp:3/.test(kort('n1')));
pr('minnispunktur MEÐ skýringu heldur einnar línu fyrirsögn', /class="sb-nafn"[^>]*white-space:nowrap/.test(kort('n2')));
pr('spjald á máli er ósnert (nowrap, engin .sb-nafn)', kort('m1').indexOf('sb-nafn') === -1 && /white-space:nowrap/.test(kort('m1')));
pr('vísbendingin ber .sb-hint', kort('n1').indexOf('sb-hint') !== -1);
pr('skýringin ber .sb-titill', kort('n2').indexOf('sb-titill') !== -1);
pr('punktaröðin ber .sb-dots', (el.innerHTML.match(/class="sb-dots"/g) || []).length === 3);

// Mælingin sjálf — fölsuð spjöld með þekktri hæð.
function nod(h, fs, lh) {
  return { getBoundingClientRect: () => ({ height: h }), __cs: { lineHeight: (fs * lh) + 'px', fontSize: fs + 'px' } };
}
function falsSpjald(nafnLinur, titilLinur) {
  const cls = new Set();
  return {
    cls,
    addEventListener() {}, setAttribute() {}, getAttribute: () => null,
    classList: { add: c => cls.add(c), remove: c => cls.delete(c),
                 toggle: (c, a) => { if (a) cls.add(c); else cls.delete(c); } },
    querySelector: sel => (sel === '.sb-nafn' ? nod(nafnLinur * 14.95, 11.5, 1.3)
                        : (sel === '.sb-titill' && titilLinur ? nod(titilLinur * 14.7, 10.5, 1.4) : null)),
    querySelectorAll: () => []
  };
}
const ein   = falsSpjald(1, 0);
const tvaer = falsSpjald(2, 0);
const thrjar = falsSpjald(3, 0);
const nafnOgTitill = falsSpjald(1, 2);
const aMali = { addEventListener() {}, setAttribute() {}, getAttribute: () => null,
                classList: { add() {}, remove() {}, toggle() { aMali.snert = true; } },
                querySelector: () => null, querySelectorAll: () => [] };
el._fake['.sb-card'] = [ein, tvaer, thrjar, nafnOgTitill, aMali];
smella('rows-plus');   // → persist() → render() → maelaTexta()

pr('1 lína: hvorki vísbending né punktar faldir', !ein.cls.has('sb-l2') && !ein.cls.has('sb-l3'));
pr('2 línur: vísbendingin fer, punktarnir halda sér', tvaer.cls.has('sb-l2') && !tvaer.cls.has('sb-l3'));
pr('3 línur: punktaröðin fer líka', thrjar.cls.has('sb-l2') && thrjar.cls.has('sb-l3'));
pr('fyrirsögn + tveggja lína skýring telst 3 línur', nafnOgTitill.cls.has('sb-l3'));
pr('spjald á máli er aldrei snert', !aMali.snert);
el._fake['.sb-card'] = [];

console.log('\n' + (fall === 0 ? '✅ ' + ok + ' prófanir grænar' : '❌ ' + fall + ' féllu (' + ok + ' grænar)') + '\n');
process.exit(fall === 0 ? 0 : 1);
