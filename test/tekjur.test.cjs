// Próf á tekjum í beinni (lota 4, 17.11.2026). Keyrsla: node --test test/tekjur.test.cjs
//
// AF HVERJU: þrjár síður töldu tekjur á þrjá vegu. Tekjur-síðan taldi BAKFÆRÐAR sölur með,
// Vinnusamantektin hrundi (lokid óskilgreint eftir 3bc9aab4) og markmiðsröndin taldi Brunahólf eftir GJALDDAGA
// (ág–okt um 10 % of hátt). Það sem má aldrei bila:
//   1. bakfært (void) og drög teljast aldrei; kreditnótur dragast frá; kreditnóta á bakfærða sölu telst ekki;
//   2. Brunahólf eftir útgáfudegi, gjalddagi aðeins ef útgáfudag vantar; aðeins PAID/SENT;
//   3. Slökkvitæki fyrir 05.2026 er ÓMÆLT (null), ekki 0; hagnaður án forsendna er null, aldrei 0;
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
