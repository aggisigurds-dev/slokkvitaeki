// Próf: „Þarf þig núna" (526) í vm-samhengi — póstlisti (VIP fyrst, nýjast efst, þak), ósendar kröfur flokkaðar eftir kúnna
// með flögum sem opna vinnuglugga kröfunnar, enginn lykkja í póst-hleðslunni, engar skrifleiðir nema 448 `svarad`.
//   node --test test/nuna.test.cjs
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const NU = Date.parse('2026-11-23T12:00:00Z');
const dagar = n => new Date(NU - n * 864e5).toISOString();

function thradur(k, hluti, d, o) {
  return Object.assign({ k, hluti, falid: false, timi: dagar(d), nafn: 'Sendandi ' + k, netfang: k + '@x.is', efni: 'Efni ' + k, kunni: null }, o || {});
}
// Tilbúin gögn — engin raunveruleg nöfn, kennitölur eða upphæðir úr grunninum (repóið er opinbert).
const KROFUR = [
  { num: 'R-9001', customer_nafn: 'Leiga ehf - Staður A', samtals: 50000, dags: '2026-11-20', dagar: 3, kreditfaerdur: false, i_bid: false },
  { num: 'R-9002', customer_nafn: 'Leiga ehf - Staður B', samtals: 20000, dags: '2026-11-20', dagar: 3, kreditfaerdur: false, i_bid: false },
  { num: 'R-9003', customer_nafn: 'Húsfélag Z', samtals: 31430, dags: '2026-09-10', dagar: 74, kreditfaerdur: false, i_bid: false },
];
const SOLUR = [{ id: 11, num: 'R-9001' }, { id: 12, num: 'R-9002' }];   // R-9003 finnst ekki → flaga án smells

function smida(opt) {
  opt = opt || {};
  const kall = { load: 0, svarad: [], opnaHam: [], render: 0, krofur: 0 };
  const T = {
    S: { thraedir: opt.thraedir || [], busy: {}, sia: {}, valinn: null, svarOpid: null, claudeOpid: null, synaFalid: false },
    loaded: () => !!opt.loaded, loading: () => false, villa: () => opt.villa || null, loadedAt: () => NU,
    load: () => { kall.load++; return Promise.resolve(); },
    svarad: k => { kall.svarad.push(k); return Promise.resolve(); },
    dagarSidan: iso => Math.max(0, Math.floor((NU - Date.parse(iso)) / 864e5)),
  };
  const bygg = tafla => ({
    select() { return this; }, order() { return this; }, limit() { return this; },
    in() { return Promise.resolve({ data: SOLUR, error: null }); },
    then(f, r) { kall.krofur++; return Promise.resolve({ data: KROFUR, error: null }).then(f, r); },
  });
  const win = {
    console, setTimeout, Date, JSON, Math, Map, Set, Promise, Number, String, Array, Object, isFinite, isNaN,
    document: { createElement: () => ({ id: '', textContent: '' }) },
    Tolvupostar: opt.engin ? undefined : T,
    DB: opt.dbOn === false ? undefined : { sb: { from: bygg } },
    Bord368: { render: () => { kall.render++; }, opnaHam: k => { kall.opnaHam.push(k); return true; }, toast: () => {} },
    YfirsynRond: { S: { d: { krofur: { bh: { osent: { n: 10, kr: 6510655 } } } } } },
  };
  win.window = win;
  vm.createContext(win);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../js/patches/526-nuna.js'), 'utf8'), win);
  return { win, T, kall };
}
const bida = (ms) => new Promise(r => setTimeout(r, ms));

test('kröfur flokkaðar eftir kúnna: Leiga = ein lína, staðir sem flögur, stærsta upphæð fyrst', async () => {
  const { win, kall } = smida({ loaded: true });
  win.BordNuna.listi();            // ræsir sóknina
  await bida(20);
  const h = win.BordNuna._hopar();
  assert.strictEqual(h.length, 2);
  assert.strictEqual(h[0].k, 'Leiga ehf');
  assert.strictEqual(h[0].n, 2);
  assert.strictEqual(h[0].kr, 70000);
  assert.strictEqual(h[1].k, 'Húsfélag Z');
  const html = win.BordNuna.listi();
  assert.match(html, /data-t5="vinna-sala" data-sid="11"/);
  assert.match(html, /data-t5="vinna-sala" data-sid="12"/);
  assert.ok(!/data-sid="undefined"|data-sid="null"/.test(html));
  assert.match(html, /Staður A · 50\.000/);
  assert.match(html, /R-9003 · 31\.430/);                  // engin sölu-auðkenni → flaga án smellis
  assert.match(html, /nu-fl-off[^>]*title="R-9003"/);
  assert.match(html, /10 ósendar kröfur · 6\.510\.655 kr\./); // Brunahólf-línan kemur úr Yfirsýnarröndinni
  assert.strictEqual(kall.krofur, 1);
});

test('póstur: VIP fyrst, svo nýjast efst; þak 5 og „+ N í viðbót"; efni er escapað', () => {
  const l = [
    thradur('a', 'bidur', 9), thradur('b', 'bidur', 1), thradur('c', 'undirbuid', 4), thradur('v', 'vip', 6, { efni: '<img src=x onerror=alert(1)>' }),
    thradur('d', 'bidur', 2), thradur('e', 'bidur', 3), thradur('f', 'bidur', 5),
    thradur('x', 'buid', 0), thradur('y', 'sjalfvirkt', 0), thradur('z', 'bidur', 0, { falid: true }),
  ];
  const { win } = smida({ loaded: true, thraedir: l });
  assert.deepStrictEqual(win.BordNuna._thraedir().map(t => t.k), ['v', 'b', 'd', 'e', 'c', 'f', 'a']);
  const html = win.BordNuna.listi();
  assert.strictEqual((html.match(/data-t5="nuna-svara"/g) || []).length, 5);
  assert.match(html, /\+ 2 í viðbót — allir 7 í Tölvupóstum/);
  assert.ok(!/<img src=x/.test(html), 'efni þráðar má aldrei fara óbreytt í HTML');
  assert.match(html, /&lt;img src=x onerror=alert\(1\)&gt;/);
  assert.match(html, /nu-vip/);
  assert.match(html, /★ Tilbúið/);
});

test('póst-hleðslan: aldrei án DB.sb, mest tvær tilraunir og aldrei oftar en á 15 s fresti (engin lykkja)', () => {
  const a = smida({ loaded: false, dbOn: false });
  a.win.BordNuna.listi(); a.win.BordNuna.listi();
  assert.strictEqual(a.kall.load, 0, 'án gagnagrunnstengingar má ekki kalla load() — fyrsta kallið sat fast 23.11');
  const b = smida({ loaded: false, villa: 'bilun' });
  for (let i = 0; i < 6; i++) b.win.BordNuna.listi();
  assert.strictEqual(b.kall.load, 1, 'ein tilraun í einu — notify() → render() má ekki kalla aftur og aftur');
  assert.match(b.win.BordNuna.listi(), /Náði ekki í póstinn: bilun/);
});

test('smellir: Svara opnar þráðinn í Tölvupóstum, ✓ kallar á 448 svarad, óþekkt nuna-aðgerð fer áfram til 368', () => {
  const { win, T, kall } = smida({ loaded: true, thraedir: [thradur('k1', 'bidur', 1)] });
  let fest = null;
  const rot = { querySelector: () => null, appendChild() {}, addEventListener: (t, f, cap) => { if (t === 'click') fest = { f, cap }; } };
  win.BordNuna.festa(rot);
  assert.ok(fest && fest.cap === true, 'smellir festir í handtökufasa á skuggarótina');
  const smella = (t5, k) => {
    const el = { dataset: { t5, k, ham: 'tolvupostar' } };
    const e = { target: { closest: () => el }, stopped: false, prevented: false, preventDefault() { this.prevented = true; }, stopPropagation() { this.stopped = true; } };
    fest.f(e); return e;
  };
  const e1 = smella('nuna-svara', 'k1');
  assert.ok(e1.stopped && e1.prevented);
  assert.strictEqual(T.S.valinn, 'k1'); assert.strictEqual(T.S.svarOpid, 'k1');
  assert.deepStrictEqual(kall.opnaHam, ['tolvupostar']);
  const e2 = smella('nuna-svarad', 'k1');
  assert.ok(e2.stopped);
  assert.deepStrictEqual(kall.svarad, ['k1']);
  const e3 = smella('nuna-tog', 'k1');
  assert.ok(!e3.stopped, 'fellihnappurinn er 368 — má ekki gleypast hér');
});

test('Tolvupostar vantar → spjaldið segir það í stað þess að kasta; samantektin er til', () => {
  const { win } = smida({ engin: true });
  assert.match(win.BordNuna.listi(), /Tölvupóstar \(448\) hafa ekki hlaðist/);
  assert.ok(typeof win.BordNuna.samantekt() === 'string');
});
