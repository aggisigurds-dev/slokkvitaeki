// Próf: Alheimsleitin (js/patches/56-global-search.js) í vm, eins og test/merkja-keyra-vafri.test.cjs gerir við 519.
//   node --test test/leit-opnar.test.cjs
//
// Það sem má ALDREI bila (Agnar 20.11.2026: „eg finn ekkert“):
//   · NIÐURSTAÐA VERÐUR AÐ OPNA HLUTINN. v1 kallaði aðeins App.switchView(view), svo smellur á „Hótel Varmaland“
//     skilaði honum á listann með 1.377 félögum. Hvert opnunarfall er mælt hér, beint.
//   · SÍÐUR VERÐA AÐ FINNAST ÁN BRODDSTAFA. Hann skrifar úr símanum: „thjonustubord“, „krofu“, „bokhald“.
//   · TÓMUR REITUR SÝNIR ALLAR SÍÐUR. Leitin er kortið yfir kerfið — 63 hnappar, 12 hamir, 7 stakar síður.
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const SKRA = path.join(__dirname, '..', 'js', 'patches', '56-global-search.js');
const KODI = fs.readFileSync(SKRA, 'utf8');
const bida = (ms) => new Promise((r) => setTimeout(r, ms));

// Gervi-hnappar hliðarstikunnar. Talan aftast er merki (t.d. „Kröfu yfirlit 96“) og á að falla af heitinu.
const NAV = [
  { view: 'verkbord', texti: 'Þjónustuborð' },
  { view: 'krofu-yfirlit', texti: 'Kröfu yfirlit 96' },
  { view: 'bokhalds-yfirlit', texti: 'Bókhalds yfirlit' },
  { view: 'sala', texti: 'Sala' },
  { view: 'soluyfirlit', texti: 'Söluyfirlit' },
  { view: 'companies', texti: 'Fyrirtækjaþjónusta' }
];
const HAMIR = [{ m: 'thjonusta', texti: 'Mál' }, { m: 'peningar', texti: 'Kröfur' }];

function el(tag, yfir) {
  const e = Object.assign({
    tagName: tag, style: { cssText: '' }, dataset: {}, innerHTML: '', textContent: '', _smellir: 0,
    children: [], appendChild(c) { this.children.push(c); return c; }, setAttribute() {}, addEventListener() {},
    querySelector: () => null, querySelectorAll: () => [],
    classList: { add() {}, remove() {}, contains: () => false, toggle() {} },
    onclick: null, click() { this._smellir++; if (this.onclick) this.onclick(); }
  }, yfir || {});
  return e;
}

function hlada({ medOpenCompanySafe = true } = {}) {
  const mælt = { openCo: [], opnaMal: [], opnaHam: [], switchView: [] };
  const navEl = NAV.map(n => el('button', { textContent: n.texti, dataset: { view: n.view } }));
  const hamEl = HAMIR.map(h => el('button', { textContent: h.texti, dataset: { mode: h.m, t5: 'mode' } }));
  const topbar = el('div');
  const body = el('body');
  const head = el('head');

  const heimur = { setTimeout, clearTimeout, console, Date, Promise, JSON, Math, Object, Array, Map, Set, String, Number, parseInt };
  heimur.window = heimur;
  heimur.location = { hash: '', href: '' };
  mælt.replaceState = [];
  heimur.history = { replaceState: (a, b, u) => mælt.replaceState.push(u) };
  heimur.document = {
    readyState: 'complete', head, body,
    addEventListener() {},
    createElement: (t) => el(t),
    getElementById: () => null,
    querySelector: (sel) => {
      if (sel === '.topbar') return topbar;
      if (sel.indexOf('verkbord') > -1) return navEl[0];
      return null;
    },
    querySelectorAll: (sel) => (sel === '.vnav-btn' ? navEl : [])
  };
  heimur.App = { switchView: (v) => mælt.switchView.push(v) };
  if (medOpenCompanySafe) heimur._openCompanySafe = (id) => mælt.openCo.push(id);
  heimur.Bord368 = {
    root: () => ({ querySelectorAll: (sel) => (sel === '[data-t5="mode"]' ? hamEl : []) }),
    opnaMal: (id) => mælt.opnaMal.push(id),
    opnaHam: (k) => { mælt.opnaHam.push(k); return true; }
  };
  vm.runInNewContext(KODI, heimur, { filename: SKRA });
  return { G: heimur.GlobalSearch, mælt, heimur, navEl, hamEl, topbar, body };
}

// ── 1. Síðurnar finnast, og án broddstafa ────────────────────────────────────
test('#1 „thjonustubord“ (engir broddstafir) finnur Þjónustuborðið efst', () => {
  const { G } = hlada();
  const r = G.sidurFyrir('thjonustubord', G.sidur());
  assert.ok(r.length, 'engin niðurstaða');
  assert.strictEqual(r[0].title, 'Þjónustuborð');
});

test('#2 „krofu“ finnur Kröfu yfirlit og merkitalan fylgir ekki heitinu', () => {
  const { G } = hlada();
  const r = G.sidurFyrir('krofu', G.sidur());
  const heiti = r.map(x => x.title);
  assert.ok(heiti.indexOf('Kröfu yfirlit') > -1, 'fann ekki Kröfu yfirlit: ' + heiti.join(', '));
  assert.ok(heiti.every(h => !/\s\d+$/.test(h)), 'merkitala hékk í heitinu: ' + heiti.join(', '));
});

// Mælt í loftinu 20.11.2026: „Þjonustubordid“ (greinirinn með, eins og Agnar skrifar) skilaði ENGU,
// því orðið er LENGRA en heitið sem leitað er í. Og „kerfiskort“ fann ekki „Brunahólf — Kerfis-kort“,
// því bilið milli „kerfis“ og „kort“ stóð á milli.
test('#2b beygt orð með greini finnur síðuna („Þjonustubordid“)', () => {
  const { G } = hlada();
  const S = G.sidur();
  assert.strictEqual(G.sidurFyrir('Þjonustubordid', S)[0].title, 'Þjónustuborð');
  assert.strictEqual(G.sidurFyrir('krofurnar', S).length > 0, true, '„krofurnar“ fann ekkert');
});

test('#2c heiti með bandstrik/bil finnst sem eitt orð („kerfiskort“)', () => {
  const { G } = hlada();
  const r = G.sidurFyrir('kerfiskort', G.sidur());
  assert.ok(r.some(x => x.title === 'Brunahólf — Kerfis-kort'), 'fann ekki Kerfis-kortið');
});

test('#3 nákvæmt heiti raðast fremst („sala“ á undan „Söluyfirlit“)', () => {
  const { G } = hlada();
  const r = G.sidurFyrir('sala', G.sidur());
  assert.strictEqual(r[0].title, 'Sala');
});

test('#4 tómur reitur sýnir ALLAR síður: stikan + hamirnir + stöku síðurnar', () => {
  const { G } = hlada();
  const allt = G.sidurFyrir('', G.sidur());
  assert.strictEqual(allt.length, NAV.length + HAMIR.length + 7, 'fjöldi: ' + allt.length);
  assert.ok(allt.some(x => x.meta === 'Hamur á Þjónustuborðinu'), 'hamirnir vantar');
  assert.ok(allt.some(x => x.title === 'Afgreiðsla — tilbúin verk'), 'stöku síðurnar vantar');
});

test('#5 hamur opnast með Bord368.opnaHam, ekki með því að skipta um síðu', () => {
  const { G, mælt } = hlada();
  const r = G.sidurFyrir('krofur', G.sidur()).find(x => x.meta === 'Hamur á Þjónustuborðinu');
  assert.ok(r, 'fann ekki haminn');
  r.opna();
  assert.deepStrictEqual(mælt.opnaHam, ['peningar']);
});

// ── 2. Opnunarleiðirnar — kjarninn ───────────────────────────────────────────
test('#6 fyrirtæki opnast á SÍNUM prófíl (_openCompanySafe), ekki á listanum', () => {
  const { G, mælt } = hlada();
  G._opna.fyrirtaeki(1934);
  assert.deepStrictEqual(mælt.openCo, [1934]);
  assert.deepStrictEqual(mælt.switchView, [], 'skipti um síðu í staðinn fyrir að opna félagið');
});

test('#7 fyrirtæki: sé _openCompanySafe ekki til er djúptengið #company/<id> notað', () => {
  const { G, heimur } = hlada({ medOpenCompanySafe: false });
  G._opna.fyrirtaeki(5);
  assert.strictEqual(heimur.location.hash, '#company/5');
});

test('#8 reikningur opnast um #sale/<num> (235), ekki á Tekjum', () => {
  const { G, heimur, mælt } = hlada();
  G._opna.sala({ id: 7, num: 'R-000244' });
  assert.strictEqual(heimur.location.hash, '#sale/R-000244');
  assert.deepStrictEqual(mælt.switchView, []);
});

// 20.11.2026, mælt í loftinu: slóðin var rétt og sýnin rétt — en reikningurinn birtist ALDREI.
// 235 opnar hann með window.open; fari opnunin um location.hash kemur hún í nýrri lotu, smell-keðjan
// er rofin og sprettigluggavörnin stöðvar hann þegjandi. Þetta próf heldur opnuninni í sama smelli.
test('#8b reikningur: opnunin er kölluð BEINT í smellinum, ekki um hashchange', () => {
  const { G, heimur, mælt } = hlada();
  const kallad = [];
  heimur.SubRoutes = { _routes: { sale: { parent: 'bokhalds-yfirlit', open: (n) => kallad.push(n) } } };
  G._opna.sala({ id: 7, num: 'R-000244' });
  assert.deepStrictEqual(kallad, ['R-000244'], 'opnunin var ekki kölluð beint');
  assert.deepStrictEqual(mælt.switchView, ['bokhalds-yfirlit'], 'foreldrasýnin var ekki opnuð');
  assert.deepStrictEqual(mælt.replaceState, ['#sale/R-000244'], 'slóðin var ekki skrifuð án hashchange');
  assert.strictEqual(heimur.location.hash, '', 'skrifaði í location.hash og rauf smell-keðjuna');
});

test('#9 tæki opnast um #unit/<serial> og verkbeiðni um #verkbeidni/<num>', () => {
  const a = hlada(); a.G._opna.taeki({ serial: 'AE20260728-00055' });
  assert.strictEqual(a.heimur.location.hash, '#unit/AE20260728-00055');
  const b = hlada(); b.G._opna.verkbeidni({ num: 'V-1234' });
  assert.strictEqual(b.heimur.location.hash, '#verkbeidni/V-1234');
});

test('#10 númerslaus reikningur/tæki fellur aftur á sína síðu í stað þess að gera ekkert', () => {
  const { G, mælt, heimur } = hlada();
  G._opna.sala({ id: 7 });
  G._opna.taeki({ id: 9 });
  assert.deepStrictEqual(mælt.switchView, ['income', 'field']);
  assert.strictEqual(heimur.location.hash, '', 'skrifaði tómt djúptengi');
});

test('#11 mál: borðið er opnað FYRST og svo valið málið sjálft', async () => {
  const { G, mælt, navEl } = hlada();
  G._opna.mal(1376);
  await bida(50);
  assert.strictEqual(navEl[0]._smellir, 1, 'Þjónustuborðs-hnappurinn var ekki smelltur');
  assert.deepStrictEqual(mælt.opnaMal, [1376]);
});

test('#12 mál: sé borðið ekki komið upp er beðið og reynt aftur — ekki gefist upp þegjandi', async () => {
  const { G, heimur, navEl } = hlada();
  const kom = [];
  delete heimur.Bord368.opnaMal;                       // borðið ekki tilbúið þegar smellt er
  setTimeout(() => { heimur.Bord368.opnaMal = (id) => kom.push(id); }, 200);
  G._opna.mal(42);
  await bida(700);
  assert.strictEqual(navEl[0]._smellir, 1);
  assert.deepStrictEqual(kom, [42], 'málið opnaðist aldrei eftir að borðið kom upp');
});

test('#13 skjal opnast á félaginu sínu þegar það er tengt', () => {
  const { G, mælt } = hlada();
  G._opna.skjal({ id: 1, fyrirtaeki_id: 1934 });
  assert.deepStrictEqual(mælt.openCo, [1934]);
  G._opna.skjal({ id: 2 });                            // ótengt skjal (40 slík eru til)
  assert.deepStrictEqual(mælt.switchView, ['companies']);
});

// ── 3. Hnapparnir ────────────────────────────────────────────────────────────
test('#14 bæði stikuhnappurinn og fasti símahnappurinn verða til', async () => {
  const { topbar, body } = hlada();
  await bida(1400);
  assert.ok(topbar.children.some(c => c.id === 'gs-trigger'), 'stikuhnappinn vantar');
  assert.ok(body.children.some(c => c.id === 'gs-fab'), 'símahnappinn vantar');
});

test('#15 ensureBtn keyrir tvisvar en býr hnappana aðeins til einu sinni', async () => {
  const { topbar, body, heimur } = hlada();
  const finna = (id) => topbar.children.concat(body.children).filter(c => c.id === id);
  await bida(1400);
  // getElementById skilar núna hnöppunum sem eru til, eins og í vafranum
  heimur.document.getElementById = (id) => finna(id)[0] || null;
  await bida(1900);
  assert.strictEqual(finna('gs-trigger').length, 1);
  assert.strictEqual(finna('gs-fab').length, 1);
});
