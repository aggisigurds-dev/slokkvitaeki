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
  { view: 'companies', texti: 'Fyrirtækjaþjónusta' },
  // keppir við „Brunahólf — Kerfis-kort“ um leitarorðið „kerfiskort“ (hittir aðeins á stytt „kerfis“)
  { view: 'brunaskra', texti: 'Brunakerfis skoðun' },
  // heiti hnapps kemur úr gögnum (starfsmannanöfn, merki) og má aldrei rata ómeðhöndlað í teikninguna
  { view: 'ohreint', texti: '<img src=x onerror=alert(1)>' }
];
const HAMIR = [{ m: 'thjonusta', texti: 'Mál' }, { m: 'peningar', texti: 'Kröfur' }];
const EININGAR = [{ k: 'dagskra', t: 'Dagskrá' }, { k: 'postholf', t: 'Pósthólfið' }, { k: 'tilbuin', t: 'Tilbúin verk' }];

// Lítil skrá yfir það sem getElementById á að skila. ensureModal býr til gluggann og skrifar
// innihaldið sem HTML-streng, svo reitirnir inni í honum eru skráðir hér fyrirfram — annars
// kemst prófið aldrei að renderResults, sem er einmitt þar sem v1 féll (öryggi + data-idx).
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
  const head = el('head');
  const skraSetja = (c) => { if (c && c.id) skra[c.id] = c; return c; };
  const vidbot = { appendChild(c) { this.children.push(c); return skraSetja(c); } };
  const topbar = el('div', vidbot);
  const body = el('body', vidbot);

  const heimur = { setTimeout, clearTimeout, console, Date, Promise, JSON, Math, Object, Array, Map, Set, String, Number, parseInt };
  heimur.window = heimur;
  heimur.location = { hash: '', href: '' };
  mælt.replaceState = [];
  heimur.history = { replaceState: (a, b, u) => mælt.replaceState.push(u) };
  const skra = {
    'gs-input': el('input', { value: '', focus() {} }),
    'gs-results': el('div')
  };
  heimur.document = {
    readyState: 'complete', head, body,
    addEventListener() {},
    createElement: (t) => el(t),
    getElementById: (id) => skra[id] || null,
    querySelector: (sel) => {
      if (sel === '.topbar') return topbar;
      if (sel.indexOf('verkbord') > -1) return navEl[0];
      return null;
    },
    querySelectorAll: (sel) => (sel === '.vnav-btn' ? navEl : [])
  };
  heimur.App = { switchView: (v) => mælt.switchView.push(v) };
  if (medOpenCompanySafe) heimur._openCompanySafe = (id) => mælt.openCo.push(id);
  mælt.opnaEiningu = []; mælt.toast = [];
  heimur.alert = (t) => mælt.toast.push(t);
  heimur.Bord368 = {
    root: () => ({ querySelectorAll: (sel) => (sel === '[data-t5="mode"]' ? hamEl : []) }),
    opnaMal: (id) => mælt.opnaMal.push(id),
    opnaHam: (k) => { mælt.opnaHam.push(k); return true; },
    toast: (t) => mælt.toast.push(t),
    einingar: () => EININGAR.slice(),
    hamir: () => HAMIR.map(h => ({ k: h.m, l: h.texti })),
    // „postholf" er EKKI á borði þess sem situr við það — opnaEiningu skilar false
    opnaEiningu: (k) => { mælt.opnaEiningu.push(k); return k !== 'postholf'; }
  };
  vm.runInNewContext(KODI, heimur, { filename: SKRA });
  return { G: heimur.GlobalSearch, mælt, heimur, navEl, hamEl, topbar, body, skra };
}

// Supabase-keðja sem svarar eftir `bid` ms: .select().is().or().limit() → loforð.
function hægurSB(bid, nafn) {
  const q = () => {
    const o = {
      select: () => o, or: () => o, is: () => o,
      limit: () => new Promise((r) => setTimeout(() => r({ data: [{ id: 1, nafn, kennitala: '000000-0000' }] }), bid))
    };
    return o;
  };
  return { from: () => q() };
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

test('#2c heiti með bandstrik/bil finnst sem eitt orð („kerfiskort“) og raðast ofar en stytt hitta', () => {
  const { G } = hlada();
  const r = G.sidurFyrir('kerfiskort', G.sidur());
  assert.ok(r.length, 'fann ekkert');
  assert.strictEqual(r[0].title, 'Brunahólf — Kerfis-kort',
    'heitið sem geymir orðið HEILT á að standa fremst, á undan þeim sem hittu á stytt orð: ' + r.map(x => x.title).join(', '));
});

test('#3 nákvæmt heiti raðast fremst („sala“ á undan „Söluyfirlit“)', () => {
  const { G } = hlada();
  const r = G.sidurFyrir('sala', G.sidur());
  assert.strictEqual(r[0].title, 'Sala');
});

test('#4 tómur reitur sýnir ALLAR síður: stikan + hamirnir + stöku síðurnar', () => {
  const { G } = hlada();
  const allt = G.sidurFyrir('', G.sidur());
  // Stöku síðurnar eru taldar úr listanum sjálfum: handskrifuð tala fór rautt í hvert sinn sem
  // síðu var bætt við STAKAR, sem er ekki afturför heldur viðhald.
  const stakar = allt.filter(x => x.meta === 'Sér síða' || x.meta === 'Annar vefur').length;
  assert.ok(stakar >= 5, 'stöku síðurnar: ' + stakar);
  assert.strictEqual(allt.length, NAV.length + HAMIR.length + EININGAR.length + stakar, 'fjöldi: ' + allt.length);
  assert.ok(allt.some(x => x.meta === 'Hamur á Þjónustuborðinu'), 'hamirnir vantar');
  assert.ok(allt.some(x => x.meta === 'Eining á Þjónustuborðinu'), 'einingarnar vantar');
  assert.ok(allt.some(x => x.title === 'Afgreiðsla — tilbúin verk'), 'stöku síðurnar vantar');
});

// Einingar borðsins (Dagskrá, Pósthólfið, Tilbúin verk …) eru það sem hann horfir á allan daginn,
// en þær eru hvorki hnappur í stikunni né hamur. „postholfid“ skilaði engu áður en þetta kom.
test('#4b eining finnst á beygðu heiti, borðið opnað fyrst og svo einingin', () => {
  const { G, mælt, navEl } = hlada();
  const r = G.sidurFyrir('postholfid', G.sidur());
  assert.strictEqual(r[0].title, 'Pósthólfið', 'fann ekki eininguna: ' + r.map(x => x.title).join(', '));
  r[0].opna();
  assert.strictEqual(navEl[0]._smellir, 1, 'Þjónustuborðs-hnappurinn var ekki smelltur fyrst');
  assert.deepStrictEqual(mælt.opnaEiningu, ['postholf']);
});

// Hamir og einingar mega ekki hverfa úr leitinni þótt borðið hafi aldrei verið teiknað: á ferskri
// hleðslu er skugga-rót 368 ekki tengd. Listinn kemur því úr Bord368.hamir()/einingar(), ekki af skjánum.
test('#4d hamir og einingar finnast þótt skugga-rót borðsins sé ekki til', () => {
  const { G, heimur } = hlada();
  heimur.Bord368.root = () => null;                    // eins og áður en render() keyrir í fyrsta sinn
  const allt = G.sidurFyrir('', G.sidur());
  assert.strictEqual(allt.filter(x => x.meta === 'Hamur á Þjónustuborðinu').length, HAMIR.length);
  assert.strictEqual(allt.filter(x => x.meta === 'Eining á Þjónustuborðinu').length, EININGAR.length);
});

test('#4c eining sem er EKKI á borði notandans: sagt frá, ekki þagað', () => {
  const { G, mælt } = hlada();
  G.sidurFyrir('postholfid', G.sidur())[0].opna();      // opnaEiningu skilar false fyrir 'postholf'
  assert.strictEqual(mælt.toast.length, 1, 'ekkert var sagt');
  assert.match(mælt.toast[0], /Velja einingar/);
  const d = hlada();
  d.G.sidurFyrir('dagskra', d.G.sidur())[0].opna();     // þessi er á borðinu — engin skilaboð
  assert.deepStrictEqual(d.mælt.toast, []);
});

// 368 render() hættir samstundis sé borðssýnin ekki virk, en opnaHam/opnaEiningu skila SAMT true.
// Stæði notandinn á Tekjum og smellti á „Kröfur" gerðist því ekki neitt — og ekkert var sagt heldur.
// Fyrri útgáfa þessa prófs mældi aðeins að opnaHam væri kallað og festi þannig gallann (rýni 20.11.2026).
test('#5 hamur: borðið er opnað FYRST og svo skipt um ham', () => {
  const { G, mælt, navEl } = hlada();
  const r = G.sidurFyrir('krofur', G.sidur()).find(x => x.meta === 'Hamur á Þjónustuborðinu');
  assert.ok(r, 'fann ekki haminn');
  r.opna();
  assert.strictEqual(navEl[0]._smellir, 1, 'Þjónustuborðs-hnappurinn var ekki smelltur fyrst');
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

// ── 3. Teikningin sjálf — þar sem v1 féll ────────────────────────────────────
// Prófin hér að ofan mæla opnunarföllin. Þau komast aldrei að renderResults, svo afturför í
// `esc()` eða í data-idx-tengingunni færi óséð — og það er einmitt gallaflokkurinn sem v1 féll á.
test('#16 teikningin: hvert heiti er umflúið og raðnúmerin stemma', () => {
  const { G, skra } = hlada();
  G.open();                                            // tómur reitur → allar síður teiknaðar
  const html = skra['gs-results'].innerHTML;
  assert.ok(html.indexOf('<img src=x') < 0, 'ómeðhöndlað <img> rataði í teikninguna');
  assert.ok(html.indexOf('&lt;img src=x onerror=alert(1)&gt;') > -1, 'hættulega heitið var ekki umflúið');
  const idx = [...html.matchAll(/data-idx="(\d+)"/g)].map((m) => Number(m[1]));
  assert.deepStrictEqual(idx, idx.map((_, i) => i), 'raðnúmerin eru ekki samfelld frá 0');
  assert.ok(html.indexOf('Síður og hamir') > -1, 'hópheitið vantar');
});

// Mælt í rýni 20.11.2026: svar við „hotel" skilaði sér eftir að notandinn strokaði niður í „h"
// (sú leit fer aldrei í gegn) og var teiknað — listinn sýndi þá niðurstöður sem áttu ekkert skylt
// við það sem stóð í reitnum.
test('#17 gamalt svar yfirskrifar ekki nýrra', async () => {
  const { G, heimur, skra } = hlada();
  heimur.DB = { sb: hægurSB(250, 'Seinkað félag') };
  G.open();
  const p = G.leita('hotel');                          // fer af stað, svarar eftir 250 ms
  G.leita('h');                                        // of stutt: hættir strax EN hækkar teljarann
  await p;
  await bida(400);
  assert.ok(skra['gs-results'].innerHTML.indexOf('Seinkað félag') < 0,
    'gamla svarið var teiknað ofan í nýrri leit');
});

test('#18 svar sem kemur eftir að glugganum var lokað er ekki teiknað', async () => {
  const { G, heimur, skra } = hlada();
  heimur.DB = { sb: hægurSB(250, 'Seinkað félag') };
  G.open();
  const p = G.leita('hotel');
  G.close();
  await p;
  await bida(400);
  assert.ok(skra['gs-results'].innerHTML.indexOf('Seinkað félag') < 0, 'teiknað í lokaðan glugga');
});

// ── 4. Hnapparnir ────────────────────────────────────────────────────────────
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
