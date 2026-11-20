// Þjónustugátt: prófíll félagsins + „ekki skráð" + gata sem heiti (lota 10, 17.11.2026). Keyrsla: node --test test/gatt-profill.test.cjs
//
// AF HVERJU: gátt eins félags sýndi eign undir nafni félagsins sjálfs, brunakerfi í þjónustu án
// skráðrar skoðunar stóð autt í stað „ekki skráð", og engin yfirsýn yfir félagið var til. Föllin eru dregin beint úr
// gatt/portal.js og keyrð — ekkert afrit af rökunum hér.
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROT = path.join(__dirname, '..');
const PORTAL = fs.readFileSync(path.join(ROT, 'gatt/portal.js'), 'utf8');

// Dregur `function NAFN(...) { ... }` úr skránni með sviga-talningu sem hoppar yfir strengi og athugasemdir.
function fall(nafn) {
  const i = PORTAL.indexOf('function ' + nafn + '(');
  assert.ok(i >= 0, nafn + ' fannst ekki í gatt/portal.js');
  let j = PORTAL.indexOf('{', i), d = 0, k = j;
  for (; k < PORTAL.length; k++) {
    const c = PORTAL[k];
    if (c === "'" || c === '"') { const q = c; k++; while (k < PORTAL.length && PORTAL[k] !== q) { if (PORTAL[k] === '\\') k++; k++; } continue; }
    if (c === '/' && PORTAL[k + 1] === '/') { k = PORTAL.indexOf('\n', k); continue; }
    if (c === '{') d++;
    if (c === '}' && --d === 0) break;
  }
  return PORTAL.slice(i, k + 1);
}
function samhengi(extra) {
  const ctx = Object.assign({
    EKKI_SKRAD: (PORTAL.match(/var EKKI_SKRAD = '([^']+)'/) || [])[1],
    MONTHS_IS: ['janúar', 'febrúar', 'mars', 'apríl', 'maí', 'júní', 'júlí', 'ágúst', 'september', 'október', 'nóvember', 'desember'],
    esc: (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])),
    sagaMerki: (m) => m,
  }, extra || {});
  vm.createContext(ctx);
  for (const f of ['lastDocYear', 'gataSemHeiti', 'nextInspText', 'sidastaSkodunLinur', 'renderProfill']) vm.runInContext(fall(f), ctx);
  return ctx;
}

test('EKKI_SKRAD er skilgreint', () => { assert.strictEqual(samhengi().EKKI_SKRAD, 'ekki skráð'); });

test('eign sem ber aðeins félagsnafnið fær götuna sem heiti — skýrslur og reikningar fylgja', () => {
  const c = samhengi();
  const o = { account: { name: 'Dæmi ehf' },
    buildings: [{ nafn: 'Dæmi ehf', heimilisfang: 'Dæmigata 9, 110 Reykjavík' }, { nafn: 'Prófgata', heimilisfang: 'Prófgata 41, 101 Reykjavík' }],
    reports: [{ bygging: 'Dæmi ehf' }], invoices: [{ bygging: 'Dæmi ehf' }, { bygging: 'Prófgata' }] };
  c.gataSemHeiti(o);
  assert.strictEqual(o.buildings[0].nafn, 'Dæmigata 9');
  assert.strictEqual(o.buildings[1].nafn, 'Prófgata');
  assert.strictEqual(o.reports[0].bygging, 'Dæmigata 9');
  assert.strictEqual(JSON.stringify(o.invoices.map((x) => x.bygging)), JSON.stringify(['Dæmigata 9', 'Prófgata']));
});

test('gata sem heiti: ein eign eða tvær með sama nafni → óbreytt', () => {
  const c = samhengi();
  const einn = { account: { name: 'X ehf' }, buildings: [{ nafn: 'X ehf', heimilisfang: 'Gata 1, 101 Reykjavík' }] };
  c.gataSemHeiti(einn); assert.strictEqual(einn.buildings[0].nafn, 'X ehf');
  const tvo = { account: { name: 'X ehf' }, buildings: [{ nafn: 'X ehf', heimilisfang: 'Gata 1' }, { nafn: 'X ehf', heimilisfang: 'Gata 2' }] };
  c.gataSemHeiti(tvo); assert.strictEqual(JSON.stringify(tvo.buildings.map((b) => b.nafn)), JSON.stringify(['X ehf', 'X ehf']));
});

test('brunakerfi í þjónustu án skráðrar skoðunar → „ekki skráð", ekki autt', () => {
  const c = samhengi();
  const raw = { i_thjonustu: true, skodun_manudur: 6, ar_slokk: ['2026'], sidasta_ar: 2026, bru_i_thjonustu: true, bru_skodun_manudur: 0, ar_bru: [] };
  assert.strictEqual(c.nextInspText(raw), 'Tæki: 06/2027|Kerfi: ekki skráð');
  const b = { i_thjonustu: true, skodun_manudur: 6, ar_slokk: ['2026'], sidasta_ar: 2026, br: true, bru_skodun_manudur: 0, ar_bru: [], saga: [] };
  assert.strictEqual(JSON.stringify(c.sidastaSkodunLinur(b)), JSON.stringify([['Tæki', '06/2026'], ['Kerfi', 'ekki skráð']]));   // JSON: fylki úr vm-samhengi
  // án brunakerfis: engin Kerfi-lína
  assert.strictEqual(c.nextInspText({ i_thjonustu: true, skodun_manudur: 6, ar_slokk: ['2026'] }), 'Tæki: 06/2027');
});

test('prófíll félagsins: raungögn, „ekki skráð" þar sem vantar, hluti einingatölu merktur', () => {
  const el = { hidden: true, innerHTML: '' };
  const c = samhengi({ $: (s) => (s === '#yf-profill' ? el : null) });
  c.renderProfill({ account: { name: 'Dæmi ehf' },
    buildings: [
      { nafn: 'Prófgata', greidandi_kt: '691299-0079', i_thjonustu: true, br: true, sl: 14, slo: 5, bru_ein: 73, nt: 'Tæki: 08/2027|Kerfi: 07/2027', teikning: [1, 2], bgr: {} },
      { nafn: 'Dæmigata 9', greidandi_kt: '691299-0079', i_thjonustu: true, br: true, sl: 13, slo: 4, bru_ein: null, nt: 'Tæki: 06/2027|Kerfi: ekki skráð', teikning: null, bgr: null }],
    reports: [{ ar: 2026 }, { ar: 2023 }] });
  assert.strictEqual(el.hidden, false);
  const h = el.innerHTML;
  assert.match(h, /Dæmi ehf/);
  assert.match(h, /kt\. 691299-0079/);
  assert.match(h, /<b>27<\/b> slökkvitæki/);
  assert.match(h, /<b>9<\/b> brunaslöngur/);
  assert.match(h, /<b>73<\/b> brunakerfiseiningar <span class="pf-es">\(ekki skráð á Dæmigata 9\)/);
  assert.match(h, /Teikningar<\/span><span class="pf-val"><b>2<\/b> blöð/);
  assert.match(h, /á <b>1<\/b> af 2 eignum/);
  assert.match(h, /<b>2<\/b> · nýjust 2026/);
});

test('prófíll: ekkert skráð → „ekki skráð", aldrei 0; tómt félag → falið', () => {
  const el = { hidden: true, innerHTML: '' };
  const c = samhengi({ $: () => el });
  c.renderProfill({ account: { name: 'Y ehf' }, buildings: [{ nafn: 'Gata 1', i_thjonustu: true, br: false, sl: null, slo: null, nt: '' }], reports: [] });
  const h = el.innerHTML;
  assert.doesNotMatch(h, /<b>0<\/b>/);
  assert.ok((h.match(/ekki skráð/g) || []).length >= 5, h);
  const tomt = { hidden: false, innerHTML: 'x' };
  samhengi({ $: () => tomt }).renderProfill({ account: { name: 'Z' }, buildings: [] });
  assert.strictEqual(tomt.hidden, true);
});

test('premium-v2: „Kerfi: ekki skráð" eitt og sér telst ekki skráð skoðun', () => {
  const V2 = fs.readFileSync(path.join(ROT, 'gatt/premium-v2.js'), 'utf8');
  assert.match(V2, /var skrad = String\(\(b && b\.nt\) \|\| ''\)\.split\('\|'\)\.some\(function \(l\) \{ return l\.trim\(\) && !\/:\\s\*ekki skráð\\s\*\$\/\.test\(l\); \}\);/);
});

test('prófíll rekstrarfélags: kt félagsins sjálfs + fjöldi félaga, mest 6 eignaflögur', () => {
  const el = { hidden: true, innerHTML: '' };
  const c = samhengi({ $: () => el });
  const B = [];
  for (let i = 0; i < 9; i++) B.push({ nafn: 'Eign ' + i, greidandi: i < 3 ? 'H ehf' : 'Systir ' + i, greidandi_kt: i < 3 ? '681299-0099' : '5101170' + (600 + i), i_thjonustu: true, br: false, sl: 1, slo: 0, nt: '' });
  c.renderProfill({ account: { name: 'H ehf' }, buildings: B, reports: [] });
  assert.match(el.innerHTML, /kt\. 681299-0099 · rekstrarfélag · 7 félög/);
  assert.strictEqual((el.innerHTML.match(/<span>Eign \d<\/span>/g) || []).length, 6);
  assert.match(el.innerHTML, /<span>\+3<\/span>/);
});

test('forskeyti sem er nafn félagsins sjálfs fer af, líka án meirihluta (rekstrarfélag)', () => {
  const c = samhengi();
  const o = { account: { name: 'Dæmi ehf' },
    buildings: [{ nafn: 'Dæmi - Prófgata', heimilisfang: 'Prófgata 41' }, { nafn: 'Dæmi ehf', heimilisfang: 'Dæmigata 9, 110 Reykjavík' },
      { nafn: 'Systir, Lager', heimilisfang: 'Lagergata 13' }, { nafn: 'Systir, Hraun 10', heimilisfang: 'Hraun 10' }],
    reports: [{ bygging: 'Dæmi - Prófgata' }], invoices: [] };
  c.gataSemHeiti(o);
  assert.strictEqual(JSON.stringify(o.buildings.map((b) => b.nafn)), JSON.stringify(['Prófgata', 'Dæmigata 9', 'Systir, Lager', 'Systir, Hraun 10']));
  assert.strictEqual(o.reports[0].bygging, 'Prófgata');
  // forskeyti annars félags fer EKKI af
  const o2 = { account: { name: 'Dæmi ehf' }, buildings: [{ nafn: 'Annað - Gata 1' }, { nafn: 'Dæmi - Gata 2' }] };
  c.gataSemHeiti(o2);
  assert.strictEqual(JSON.stringify(o2.buildings.map((b) => b.nafn)), JSON.stringify(['Annað - Gata 1', 'Gata 2']));
});
