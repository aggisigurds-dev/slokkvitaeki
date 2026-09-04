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
  querySelectorAll: () => []
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

console.log('\n' + (fall === 0 ? '✅ ' + ok + ' prófanir grænar' : '❌ ' + fall + ' féllu (' + ok + ' grænar)') + '\n');
process.exit(fall === 0 ? 0 : 1);
