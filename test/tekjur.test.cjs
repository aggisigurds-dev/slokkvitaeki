// Próf á tekjum í beinni (lota 4, 17.11.2026). Keyrsla: node --test test/tekjur.test.cjs
//
// AF HVERJU: þrjár síður töldu tekjur á þrjá vegu. Tekjur-síðan taldi BAKFÆRÐAR sölur með,
// Vinnusamantektin hrundi (lokid óskilgreint eftir 3bc9aab4) og markmiðsröndin taldi Brunahólf eftir GJALDDAGA
// (ág–okt um 10 % of hátt). Það sem má aldrei bila:
//   1. bakfært (void) og drög teljast aldrei; kreditnótur dragast frá; kreditnóta á bakfærða sölu telst ekki;
//   2. Brunahólf eftir útgáfudegi, gjalddagi aðeins ef útgáfudag vantar; aðeins PAID/SENT;
//   3. Slökkvitæki fyrir 05.2026 er ÓMÆLT (null), ekki 0; hagnaður án forsendna er null, aldrei 0;
//   4. endapunkturinn er lokaður óinnskráðum og sendir aðeins samtölur (engin nöfn).
// Gögnin hér eru tilbúin (engin raunveruleg nöfn, kennitölur eða upphæðir — repóið er opið).
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const T = require('../netlify/functions/_tekjur.cjs');

const F = 'final';
test('Slökkvitæki: void og drög úti, kredit dregið frá, kredit á bakfærða sölu ekki talið', () => {
  const rows = [
    { id: 1, status: F, upphaed_an_vsk: 1000, created_at: '2026-10-02T09:00:00Z' },
    { id: 2, status: 'void', upphaed_an_vsk: 5000, created_at: '2026-10-03T09:00:00Z' },
    { id: 3, status: 'drog', upphaed_an_vsk: 7000, created_at: '2026-10-03T09:00:00Z' },
    { id: 4, status: F, upphaed_an_vsk: -300, credit_of: 1, created_at: '2026-11-01T09:00:00Z' },
    { id: 5, status: F, upphaed_an_vsk: -5000, credit_of: 2, created_at: '2026-10-04T09:00:00Z' },
  ];
  assert.deepEqual(T.slokkvitaekiManudir(rows, [2]), { '2026-10': 1000, '2026-11': -300 });
});

test('Brunahólf: eftir útgáfudegi, gjalddagi aðeins varaleið, aðeins PAID/SENT', () => {
  const rows = [
    { source: 'payday', status: 'PAID', hofudstoll: 100, utgafudagur: '2026-09-30', gjalddagi: '2026-10-15' },
    { source: 'payday', status: 'SENT', hofudstoll: 50, utgafudagur: null, gjalddagi: '2026-10-20' },
    { source: 'payday', status: 'CANCELLED', hofudstoll: 999, utgafudagur: '2026-10-01' },
    { source: 'payday', status: 'CREDIT', hofudstoll: -999, utgafudagur: '2026-10-01' },
    { source: 'payday', status: 'DRAFT', hofudstoll: 777, utgafudagur: '2026-10-01' },
    { source: 'landsbankinn_krafnir', status: 'PAID', hofudstoll: 888, utgafudagur: '2026-10-01' },
  ];
  assert.deepEqual(T.brunaholfManudir(rows), { '2026-09': 100, '2026-10': 50 });
});

test('tolur: mánuður til dags, ár til dags frá yfirtöku, síðasti mánuður null fyrir mælingu', () => {
  const man = { '2026-04': 9, '2026-05': 10, '2026-10': 20, '2026-11': 3 };
  const t = T.tolur(man, '2026-11-17T01:00:00Z', T.SL_FRA);
  assert.equal(t.manudur_til_dags, 3); assert.equal(t.fyrri_manudur, 20); assert.equal(t.fyrri_man, '2026-10');
  assert.equal(t.ar_til_dags, 33, 'apríl (fyrir yfirtöku) er ekki í ári til dags'); assert.equal(t.ar_fra, '2026-05');
  assert.equal(T.tolur(man, '2026-05-10T00:00:00Z', T.SL_FRA).fyrri_manudur, null, 'apríl er ómældur — null, ekki 0');
  assert.equal(T.tolur(man, '2027-01-05T00:00:00Z', T.SL_FRA).ar_fra, '2027-01');
  assert.equal(T.fyrriMan('2027-01'), '2026-12');
});

test('framlegð vöru: aðeins línur með kostnaðarverði; kreditnótur sleppt; þekja í %', () => {
  const rows = [
    { status: F, linur: [{ product_id: 7, qty: 2, unit_price_ex_vat: 100 }, { product_id: 8, qty: 1, unit_price_ex_vat: 200 }, { desc: 'Skýrslugerð', unit_price_ex_vat: 400 }] },
    { status: F, credit_of: 1, linur: [{ product_id: 7, qty: -2, unit_price_ex_vat: 100 }] },
  ];
  const f = T.framlegdVoru(rows, { 7: 60 });
  assert.deepEqual(f, { sala_alls: 800, sala_med_kostnadarverd: 200, kostnadarverd: 120, framlegd: 80, thak_pct: 25 });
  assert.equal(T.framlegdVoru([], {}).thak_pct, null);
});

test('hagnaður: null (ómælt) án forsendna — aldrei 0; reiknaður þegar bæði laun og annar kostnaður eru skráð', () => {
  assert.equal(T.hagnadur(1000, null).kr, null);
  assert.equal(T.hagnadur(1000, { laun: 400 }).vantar.length, 1);
  assert.equal(T.hagnadur(1000, { laun: 400, annar: '' }).kr, null, 'tómur reitur er ekki 0');
  assert.equal(T.hagnadur(null, { laun: 1, annar: 1 }).kr, null, 'án tekna er enginn hagnaður');
  const h = T.hagnadur(1000, { laun: 400, annar: 100 });
  assert.equal(h.kr, 500); assert.deepEqual(h.vantar, []);
  assert.equal(T.hagnadur(1000, { laun: 0, annar: 0 }).kr, 1000, 'skráð 0 er gild tala');
});

// ── endapunkturinn: lokaður óinnskráðum, les rétta töflu, skilar samtölum ──────────────────────────────────────────────
function stub(h) {
  global.fetch = async (url, init = {}) => {
    const u = new URL(url);
    const svar = (d, ok = true) => ({ ok, status: ok ? 200 : 500, text: async () => (d == null ? '' : JSON.stringify(d)), json: async () => d });
    if (u.hostname.includes('brunaholf')) {
      h.bhHaus = (init.headers || {})['x-hub-toki'] || null;
      if (h.bhLokad) return { ok: false, status: 401, text: async () => '{}', json: async () => ({}) };
      return h.bhNidri ? svar(null, false) : svar({ tier2: { total: 1240.4, n: 2 } });
    }
    const t = u.pathname.split('/').pop(), q = u.searchParams;
    if (Number(q.get('offset') || 0) > 0) return svar([]);
    if (t === 'app_kv' && (init.method || 'GET') === 'POST') { h.vistad = JSON.parse(init.body); return svar(null); }
    if (t === 'app_kv') return svar(h.kv ? [{ value: h.kv }] : []);
    if (t === 'solur' && q.get('status') === 'eq.void') return svar([{ id: 2 }]);
    if (t === 'solur' && q.get('status') === 'eq.drog') { assert.equal(q.get('hidden'), 'is.false'); return svar([{ upphaed_an_vsk: 70 }, { upphaed_an_vsk: 30 }]); }
    if (t === 'solur' && q.get('select').includes('linur')) return svar([{ status: F, created_at: '2026-10-05T00:00:00Z', linur: [{ product_id: 7, qty: 1, unit_price_ex_vat: 100 }] }]);
    if (t === 'solur') return svar([
      { id: 1, status: F, upphaed_an_vsk: 1000, created_at: '2026-10-02T00:00:00Z' },
      { id: 9, status: F, upphaed_an_vsk: 400, created_at: '2026-11-02T00:00:00Z' },
      { id: 5, status: F, upphaed_an_vsk: -500, credit_of: 2, created_at: '2026-11-03T00:00:00Z' },
    ]);
    if (t === 'invoices' && h.invoicesTomt) return svar([]);
    if (t === 'invoices') { assert.match(q.get('or'), /utgafudagur/); return svar([{ status: 'PAID', source: 'payday', hofudstoll: 300, utgafudagur: '2026-11-01', gjalddagi: '2026-11-10' }]); }
    if (t === 'vorur') return svar([{ id: 7, kostnadarverd: 40 }]);
    throw new Error('óvænt slóð ' + url);
  };
}
process.env.SUPABASE_URL = 'https://dummy.supabase.co'; process.env.SUPABASE_SERVICE_ROLE_KEY = 'x';
const TB = require('../netlify/functions/tekjur-beint.cjs');

test('tekjur-beint: tölur hvors félags sér, pípa, framlegð, hagnaður ómældur — og engin nöfn í svarinu', async () => {
  const h = {}; stub(h);
  const d = await TB._lesa(new Date('2026-11-17T01:00:00Z'));
  assert.equal(d.slokkvitaeki.manudur_til_dags, 400, 'kreditnóta á bakfærða sölu (2) ekki dregin frá');
  assert.equal(d.slokkvitaeki.fyrri_manudur, 1000);
  assert.equal(d.slokkvitaeki.ar_til_dags, 1400); assert.equal(d.slokkvitaeki.ar_fra, '2026-05');
  assert.deepEqual(d.slokkvitaeki.pipa, { heiti: 'Drög (ekki reikningsfært)', kr_an_vsk: 100, fjoldi: 2 });
  assert.equal(d.slokkvitaeki.framlegd_voru.fyrri_manudur.framlegd, 60);
  assert.equal(d.slokkvitaeki.hagnadur.kr, null); assert.equal(d.slokkvitaeki.hagnadur.vantar.length, 2);
  assert.equal(d.brunaholf.manudur_til_dags, 300); assert.equal(d.brunaholf.fyrri_manudur, 0);
  assert.equal(d.brunaholf.pipa.kr_m_vsk, 1240);
  assert.doesNotMatch(JSON.stringify(d), /customer|nafn|kt/i, 'aðeins samtölur fara út');
  h.bhNidri = true;
  const d2 = await TB._lesa(new Date('2026-11-17T01:00:00Z'));
  assert.equal(d2.brunaholf.pipa.kr_m_vsk, null, 'Kröfu yfirlit niðri → ómælt, ekki 0');
});

test('tekjur-beint: tómur reikningalestur (aðgangsregla á invoices) er ÓMÆLDUR — null með ástæðu, aldrei 0', async () => {
  const h = { invoicesTomt: true }; stub(h);
  const d = await TB._lesa(new Date('2026-11-17T01:00:00Z'));
  assert.equal(d.brunaholf.manudur_til_dags, null); assert.equal(d.brunaholf.fyrri_manudur, null); assert.equal(d.brunaholf.ar_til_dags, null);
  assert.match(d.brunaholf.omaelt, /skilaði engu/);
  assert.equal(d.brunaholf.hagnadur.kr, null);
  assert.equal(d.slokkvitaeki.manudur_til_dags, 400, 'hitt félagið mælist áfram');
  assert.equal(d.slokkvitaeki.omaelt, undefined);
});

test('tekjur-beint: Kröfu yfirlit lokað (lota 13) → pípa ómæld með stöðukóða; tóki x-hub-toki sendur þegar hann er til', async () => {
  const HUB = require('../netlify/functions/hub-adgangar.cjs');
  const gamalt = { t: HUB.hubApiToki, h: HUB.HUB_TOKI_HAUS };
  try {
    const h = { bhLokad: true }; stub(h);
    HUB.hubApiToki = undefined;
    const d = await TB._lesa(new Date('2026-11-17T01:00:00Z'));
    assert.equal(d.brunaholf.pipa.kr_m_vsk, null); assert.match(d.brunaholf.pipa.omaelt, /401/);
    assert.equal(h.bhHaus, null, 'án hubApiToki er enginn tóki sendur');
    HUB.hubApiToki = async () => '29000000.abc'; HUB.HUB_TOKI_HAUS = 'x-hub-toki';
    h.bhLokad = false;
    const d2 = await TB._lesa(new Date('2026-11-17T01:00:00Z'));
    assert.equal(h.bhHaus, '29000000.abc', 'tókinn fer í hausinn x-hub-toki');
    assert.equal(d2.brunaholf.pipa.kr_m_vsk, 1240);
  } finally { HUB.hubApiToki = gamalt.t; HUB.HUB_TOKI_HAUS = gamalt.h; }
});

// Raunverulega hliðið (_starfshlid.stjornandi) keyrir; aðeins svar notendaskrárinnar (hub-adgangar GET) er hermt.
function notandi(svar) {
  const HUB = require('../netlify/functions/hub-adgangar.cjs');
  const gamalt = HUB.handler;
  HUB.handler = async () => (svar === 'nidri' ? { statusCode: 500, body: '{}' } : { statusCode: 200, body: JSON.stringify(svar) });
  return () => { HUB.handler = gamalt; };
}
const ADMIN = { gate: true, authed: true, user: { nafn: 'Prófari', rola: 'Admin' } };

test('tekjur-beint: aðeins stjórnandi — óinnskráður 401, önnur rola 403, notendaskrá niðri 503; ekkert lesið nema Admin', async () => {
  for (const [lysing, svar, kodi] of [
    ['óinnskráður', { gate: true, authed: false, user: null }, 401],
    ['Starfsmaður', { gate: true, authed: true, user: { nafn: 'X', rola: 'Starfsmaður' } }, 403],
    ['Afgreiðsla', { gate: true, authed: true, user: { nafn: 'X', rola: 'Afgreiðsla' } }, 403],
    ['notendaskrá svarar ekki', 'nidri', 503],
  ]) {
    const aftur = notandi(svar);
    let kallad = false; global.fetch = async () => { kallad = true; throw new Error('má ekki lesa'); };
    try {
      for (const ev of [{ httpMethod: 'GET', headers: {} }, { httpMethod: 'POST', headers: {}, body: JSON.stringify({ action: 'forsenda', felag: 'slokkvitaeki', lykill: 'laun', kr: 1 }) }]) {
        const r = await TB.handler(ev);
        assert.equal(r.statusCode, kodi, lysing + ' ' + ev.httpMethod);
      }
      assert.equal(kallad, false, lysing + ': ekkert lesið né skrifað');
    } finally { aftur(); }
  }
  const aftur = notandi(ADMIN);
  try {
    stub({});
    const r = await TB.handler({ httpMethod: 'GET', headers: {} });
    assert.equal(r.statusCode, 200, 'Admin fær svar');
  } finally { aftur(); }
});

test('tekjur-beint: 500 sendir aldrei hrátexta úr Supabase-svari í vafrann', async () => {
  const aftur = notandi(ADMIN);
  const villa = console.error; console.error = () => {};
  try {
    global.fetch = async () => ({ ok: false, status: 500, text: async () => 'permission denied for table solur LEYNDARMAL', json: async () => ({}) });
    const r = await TB.handler({ httpMethod: 'GET', headers: {} });
    assert.equal(r.statusCode, 500);
    assert.doesNotMatch(r.body, /LEYNDARMAL|permission|solur|supabase/i);
    assert.match(JSON.parse(r.body).error, /reyndu aftur/);
  } finally { aftur(); console.error = villa; }
});

test('tekjur-beint: forsenda vistuð á félag, ógild tala hafnað, 0 er gilt', async () => {
  const aftur = notandi(ADMIN);
  try {
    const h = { kv: { brunaholf: { laun: 5 } } }; stub(h);
    const bad = await TB.handler({ httpMethod: 'POST', headers: {}, body: JSON.stringify({ action: 'forsenda', felag: 'bæði', lykill: 'laun', kr: 1 }) });
    assert.equal(bad.statusCode, 400);
    const bad2 = await TB.handler({ httpMethod: 'POST', headers: {}, body: JSON.stringify({ action: 'forsenda', felag: 'slokkvitaeki', lykill: 'laun', kr: -4 }) });
    assert.equal(bad2.statusCode, 400);
    const ok = await TB.handler({ httpMethod: 'POST', headers: {}, body: JSON.stringify({ action: 'forsenda', felag: 'slokkvitaeki', lykill: 'laun', kr: '1.250.000' }) });
    assert.equal(ok.statusCode, 200);
    assert.equal(h.vistad.key, 'tekjur_forsendur');
    assert.equal(h.vistad.value.slokkvitaeki.laun, 1250000);
    assert.equal(h.vistad.value.slokkvitaeki.skrad.af, 'Prófari');
    assert.deepEqual(h.vistad.value.brunaholf, { laun: 5 }, 'hitt félagið óbreytt');
  } finally { aftur(); }
});

// ── 512 flísarnar: bila mjúklega — 401/500/net/óvænt snið gefa eina villulínu, aldrei hrun á Tekjum/Bókhaldi ─────────
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
function flisar(fetchSvar) {
  const src = fs.readFileSync(path.join(__dirname, '..', 'js', 'patches', '512-tekjur-beint.js'), 'utf8');
  const el = { innerHTML: '', dataset: {}, isConnected: true, addEventListener() {}, querySelector() { return null; } };
  const doc = { getElementById() { return null; }, createElement() { return {}; }, head: { appendChild() {} } };
  const win = {};
  vm.runInNewContext(src, { window: win, document: doc, fetch: fetchSvar, Promise, Date, String, Number, Math, JSON, Error, Array }, { filename: '512' });
  return { TB: win.TekjurBeint, el };
}
const bida = () => new Promise((r) => setTimeout(r, 20));
const svarHttp = (status, j) => async () => ({ status, ok: status >= 200 && status < 300, json: async () => j });

test('512: 401 → „Skráðu þig inn", 500 → villulína, net niðri → villulína, óvænt snið → villulína; mount kastar aldrei', async () => {
  for (const [lysing, f, vaent] of [
    ['401', svarHttp(401, { error: 'Innskráning starfsmanns vantar' }), /Skráðu þig inn/],
    ['500', svarHttp(500, { error: 'Supabase 500' }), /Tekjur í beinni: Supabase 500/],
    ['net', async () => { throw new Error('Failed to fetch'); }, /Tekjur í beinni: Failed to fetch/],
    ['200 tómt', svarHttp(200, {}), /Tekjur í beinni: /],
    ['200 ekki JSON', async () => ({ status: 200, ok: true, json: async () => { throw new SyntaxError('x'); } }), /Tekjur í beinni: /],
  ]) {
    const { TB, el } = flisar(f);
    assert.doesNotThrow(() => TB.mount(el), lysing);
    await bida();
    assert.match(el.innerHTML, vaent, lysing);
    assert.doesNotMatch(el.innerHTML, /\b0 kr\b/, lysing + ': aldrei 0');
  }
  const { TB } = flisar(svarHttp(200, {}));
  assert.doesNotThrow(() => TB.mount(null), 'ekkert hólf → ekkert gerist');
  const f403 = flisar(svarHttp(403, { error: 'Aðeins fyrir stjórnanda' }));
  f403.TB.mount(f403.el); await bida();
  assert.equal(f403.el.innerHTML, '', '403 (ekki stjórnandi): flísarnar hverfa, engin villulína');
});

test('512: ómælt Brunahólf (tómur lestur) og Kröfu yfirlit lokað → „ómælt" á flísunum, ekki 0', async () => {
  const d = {
    maelt_at: '2026-11-17T04:00:00Z', skilgreining: {},
    slokkvitaeki: { manudur: '2026-11', manudur_til_dags: 400, fyrri_man: '2026-10', fyrri_manudur: 1000, ar_til_dags: 1400, ar_fra: '2026-05',
      pipa: { kr_an_vsk: 0, fjoldi: 0 }, framlegd_voru: { fyrri_manudur: { framlegd: 60, thak_pct: 10 } }, hagnadur: { kr: null } },
    brunaholf: { manudur: '2026-11', manudur_til_dags: null, fyrri_man: '2026-10', fyrri_manudur: null, ar_til_dags: null, ar_fra: '2026-01',
      omaelt: 'reikningalesturinn skilaði engu', pipa: { heiti: 'Ósent', kr_m_vsk: null, omaelt: 'Kröfu yfirlit Brunahólfs svaraði ekki' }, hagnadur: { kr: null } },
  };
  const { TB, el } = flisar(svarHttp(200, d));
  TB.mount(el); await bida();
  const bh = el.innerHTML.split('Brunahólf<small>')[1];
  assert.ok(bh, 'Brunahólfsröðin teiknast');
  assert.equal((bh.match(/<span>ómælt<\/span>/g) || []).length, 5, 'mánuður, ár, síðasti mánuður, pípa og hagnaður: ómælt');
  assert.match(bh, /reikningalesturinn skilaði engu/); assert.match(bh, /Kröfu yfirlit Brunahólfs svaraði ekki/);
  assert.doesNotMatch(bh, /<span>0 kr<\/span>/);
});

test('512: 200 með röngu sniði (vantar hluta) hrynur ekki — villulína; Tekjur og Bókhald vefja mount í try', async () => {
  const halft = { maelt_at: '2026-11-17T04:00:00Z', slokkvitaeki: { manudur: '2026-11', fyrri_man: '2026-10' }, brunaholf: null };
  const { TB, el } = flisar(svarHttp(200, halft));
  assert.doesNotThrow(() => TB.mount(el));
  await bida();
  assert.match(el.innerHTML, /Tekjur í beinni: /);
  // kallendurnir: villa í mount má ekki stöðva teikningu síðunnar
  const tk = fs.readFileSync(path.join(__dirname, '..', 'js', 'tekjur.js'), 'utf8');
  const bk = fs.readFileSync(path.join(__dirname, '..', 'js', 'patches', '11-bokhalds-yfirlit.js'), 'utf8');
  for (const [nafn, src] of [['tekjur.js', tk], ['11-bokhalds-yfirlit.js', bk]]) {
    const kall = src.split('\n').filter((l) => /TekjurBeint\.mount\(/.test(l));
    assert.ok(kall.length >= 1, nafn + ' kallar á mount');
    for (const l of kall) assert.match(l, /try\s*\{.*TekjurBeint\.mount\(.*\}\s*catch/, nafn + ': mount vafið í try/catch á sömu línu');
  }
  // og teikningin heldur áfram á eftir (bindOverviewEvents kallað eftir mount í tekjur.js)
  assert.ok(tk.indexOf('bindOverviewEvents();', tk.indexOf('TekjurBeint.mount(')) > 0);
});

test('tekjur.js: fjöldi sölu telur reikninga eins og 489 — hvorki is_credit né credit_of', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'js', 'tekjur.js'), 'utf8');
  const win = {};
  vm.runInNewContext(src, { window: win, console: { log() {}, warn() {}, error() {} }, document: { readyState: 'complete', getElementById() { return null; }, querySelector() { return null; }, addEventListener() {} }, setTimeout, clearTimeout, setInterval() {} }, { filename: 'tekjur.js' });
  const r = win.TekjurReglur;
  const rows = [{ id: 1, status: 'final' }, { id: 2, status: 'final', is_credit: true }, { id: 3, status: 'final', credit_of: 1 }, { id: 4, status: 'final', is_credit: true, credit_of: 1 }];
  assert.deepEqual(rows.filter(r.erReikningur).map((x) => x.id), [1]);
  const s489 = fs.readFileSync(path.join(__dirname, '..', 'js', 'patches', '489-vinnusamantekt.js'), 'utf8');
  assert.match(s489, /if \(!erKredit\(x\) && x\.credit_of == null\) \{ m\.n\+\+/, '489 telur sömu reikninga');
});
