// Próf á „Hvernig gengur reksturinn?“ (22.11.2026, beiðni Agnars). Keyrsla: timeout 90 node --test test/rekstur-yfirlit.test.cjs
//
// AF HVERJU: Agnar sá Payday-mælaborðið (reikningsfært = SENT) og áttaði sig á að það segir ekkert um hvað er UNNIÐ. Það sem má aldrei bila:
//   1. þrjár tölur á mánuði (unnið / reikningsfært / greitt) og „ógefið út“ = unnið − reikningsfært — félögin aldrei lögð saman;
//   2. Slökkvitæki fyrir Payday (fyrir 07.2026) er ÓMÆLT með ástæðu, aldrei 0; ómælt Brunahólf (kall brást) er ómælt, aldrei 0;
//   3. innheimtuhlutfall og greiðsluhraði stemma við Payday-mælaborð Agnars (SL 2026: 21.465.433 greitt, 1.376.001 gjaldfallið → 94 %, miðgildi 10 d);
//   4. setningin ber aðeins tölur og hlutföll, áætlunin er MERKT „ÁÆTLUN“ og engin fullyrðing um að allt sé í lagi;
//   5. kreditnóta á búðarsölu fylgir frumsölunni (Agnar 22.11.2026); svarið geymir aðeins samtölur (engin nöfn).
// Gögnin eru tilbúin (engin raunveruleg nöfn, kennitölur eða upphæðir — repóið er opið).
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const Y = require('../netlify/functions/_rekstur-yfirlit.cjs');

const NU = '2026-11-22T10:00:00Z';

test('sjö mánuðir: sex heilir á undan + líðandi; vinnudagar mán–fös (15 af 21 í nóvember 1.–22.; 15 af 22 í október 1.–21.)', () => {
  assert.deepEqual(Y.sjoManudir(NU), ['2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10', '2026-11']);
  assert.deepEqual(Y.sjoManudir('2027-02-03T00:00:00Z'), ['2026-08', '2026-09', '2026-10', '2026-11', '2026-12', '2027-01', '2027-02']);
  assert.deepEqual(Y.vinnudagar('2026-11', NU), { lidnir: 15, alls: 21 });
  assert.deepEqual(Y.vinnudagar('2026-10', '2026-10-21T10:00:00Z'), { lidnir: 15, alls: 22 }, 'sömu 15 vinnudagar og 1.–21. nóv (greining Tony Stark)');
  assert.deepEqual(Y.vinnudagar('2026-10', NU), { lidnir: 22, alls: 22 }, 'liðinn mánuður: allir');
});

test('innheimta SL: stemmir við Payday-mælaborð Agnars — 94 % og miðgildi 10 dagar; gjaldfallið aðeins SENT með gjalddaga liðinn; engar raðir → null', () => {
  const rows = [
    { status: 'PAID', amount_ex: 21465433, amount_total: 26617142, created_date: '2026-10-01', paid_date: '2026-10-11', due_date: '2026-10-08' },
    { status: 'SENT', amount_ex: 1376001, amount_total: 1706241, created_date: '2026-11-03', due_date: '2026-11-10' },           // gjaldfallið
    { status: 'SENT', amount_ex: 1354761, amount_total: 1679905, created_date: '2026-11-18', due_date: '2026-11-25' },           // ekki fallið
    { status: 'CANCELLED', amount_ex: 99999, created_date: '2026-10-01', due_date: '2026-10-08' },                               // telst hvorki
    { status: 'PAID', amount_ex: 5000, created_date: '2026-06-01', paid_date: '2026-06-05', due_date: '2026-06-08' },            // fyrir gluggann (30.06)
  ];
  const r = Y.ogreittOgInnheimta(rows, '2026-11-22', Y.INNHEIMTA_FRA);
  assert.equal(r.greitt_kr, 21465433); assert.equal(r.sent_kr, 2730762, 'ógreitt = 2.730.762 eins og á skjáskoti Agnars'); assert.equal(r.sent_n, 2);
  assert.equal(r.gjaldfallid_kr, 1376001); assert.equal(r.gjaldfallid_n, 1); assert.equal(r.yfir45_kr, 0);
  assert.equal(r.hlutfall, 94); assert.equal(r.hradi_midgildi, 10); assert.equal(r.hradi_n, 1);
  assert.equal(r.sent_m_vsk, 1706241 + 1679905);
  const tom = Y.ogreittOgInnheimta([], '2026-11-22', Y.INNHEIMTA_FRA);
  assert.equal(tom.hlutfall, null); assert.equal(tom.hradi_midgildi, null, 'ómælt, ekki 0');
  // yfir 45 dögum og miðgildi tveggja talna
  const b = Y.ogreittOgInnheimta([
    { status: 'SENT', amount_ex: 100, created_date: '2026-07-03', due_date: '2026-07-10' },
    { status: 'PAID', amount_ex: 100, created_date: '2026-11-01', paid_date: '2026-11-05', due_date: '2026-11-08' },
    { status: 'PAID', amount_ex: 100, created_date: '2026-11-01', paid_date: '2026-11-11', due_date: '2026-11-08' },
  ], '2026-11-22', Y.INNHEIMTA_FRA);
  assert.equal(b.yfir45_kr, 100); assert.equal(b.hradi_midgildi, 7, 'miðgildi 4 og 10 dagar');
  assert.equal(b.hlutfall, 66.7);
});

test('setning: aðeins tölur og hlutföll; áætlun MERKT og línuleg; engin fullyrðing; ómælt og fáir dagar → engin áætlun', () => {
  const vd = Y.vinnudagar('2026-11', NU);
  const s = Y.manadarSetning({ man: '2026-11', unnid: 2103182, fyrri_man: '2026-10', fyrri: 5178689, vd });
  assert.equal(s.setning, 'Nóvember til dags: unnið 2,10 m — 41 % af október-heild (5,18 m) og 71 % mánaðarins er liðinn (15 af 21 vinnudögum).');
  assert.equal(s.hlutfall_fyrri, 41); assert.equal(s.hlutfall_manadar, 71);
  assert.equal(s.aaetlun.kr, Math.round(2103182 * 21 / 15)); assert.match(s.aaetlun.texti, /^ÁÆTLUN \(línuleg, ekki spá\)/);
  assert.doesNotMatch(s.setning + s.aaetlun.texti, /í lagi|gengur vel|gengur illa|hagnaður/i, 'engin túlkun');
  // fyrri mánuður ómældur/0 → engin hlutfallsbrot, setningin stendur
  const b = Y.manadarSetning({ man: '2026-11', unnid: 1000000, fyrri_man: '2026-10', fyrri: null, vd });
  assert.doesNotMatch(b.setning, /heild/); assert.match(b.setning, /71 % mánaðarins er liðinn/);
  // unnið ómælt → ómælt með ástæðu, aldrei 0
  const o = Y.manadarSetning({ man: '2026-11', unnid: null, omaelt: 'Rekstrarskýrsla Brunahólfs náðist ekki', fyrri_man: '2026-10', fyrri: 1, vd });
  assert.match(o.setning, /unnið ómælt — Rekstrarskýrsla Brunahólfs náðist ekki/); assert.equal(o.aaetlun, null);
  // 2 vinnudagar liðnir: of snemmt að áætla
  const sn = Y.manadarSetning({ man: '2026-11', unnid: 100000, fyrri_man: '2026-10', fyrri: 5000000, vd: Y.vinnudagar('2026-11', '2026-11-03T10:00:00Z') });
  assert.equal(sn.aaetlun, null);
  assert.equal(Y.mkr(950000), '950.000 kr'); assert.equal(Y.mkr(-1234567), '−1,23 m');
});

const sala = (o) => ({ id: 1, num: 'R-000001', status: 'final', vidskiptategund: 'bud', credit_of: null, upphaed_an_vsk: 1000, created_at: '2026-10-10T10:00:00Z', greitt_med: 'kort', paid_at: '2026-10-10T10:00:00Z', customer_base_id: null, customer_id: null, linur: [], ...o });

test('reksturSl: unnið / reikningsfært (Payday + verslun) / greitt, ógefið út; júní og fyrr ómælt með ástæðu — aldrei 0', () => {
  const g = {
    solur: [
      sala({ id: 1, upphaed_an_vsk: 1000, created_at: '2026-10-10T10:00:00Z' }),                                              // verslun, kort
      sala({ id: 2, upphaed_an_vsk: 5000, greitt_med: 'reikningur', paid_at: null, created_at: '2026-10-12T10:00:00Z' }),     // á reikning (Payday)
      sala({ id: 3, upphaed_an_vsk: 800, greitt_med: 'reikningur', paid_at: null, created_at: '2026-06-12T10:00:00Z' }),      // júní: fyrir Payday
    ],
    voidIds: [], frumsolur: [], skyrslur: [], verkbeidnir: [], verklidir: [],
    payday: [
      { status: 'PAID', amount_ex: 4000, created_date: '2026-10-14', paid_date: '2026-10-24' },
      { status: 'SENT', amount_ex: 900, created_date: '2026-11-05' },
      { status: 'CANCELLED', amount_ex: 7777, created_date: '2026-10-14' },
    ],
  };
  const r = Y.reksturSl(g, NU);
  const okt = r.man.find((x) => x.man === '2026-10'), nov = r.man.find((x) => x.man === '2026-11'), jun = r.man.find((x) => x.man === '2026-06');
  assert.equal(okt.unnid, 6000, 'allar sölur októbers (færðar eftir reglunni; hér án skýrslu = söludagur)');
  assert.equal(okt.reikningsfaert, 4000 + 1000, 'Payday 4.000 + verslun 1.000 á söludegi'); assert.equal(okt.greitt, 4000 + 1000);
  assert.equal(okt.ogefid, 1000, 'unnið 6.000 − reikningsfært 5.000: salan á reikning (5.000) er enn aðeins að hluta send');
  assert.equal(nov.reikningsfaert, 900); assert.equal(nov.greitt, 0, 'mælt og 0: ekkert greitt í nóvember');
  assert.equal(nov.unnid, 0);
  assert.equal(jun.reikningsfaert, null); assert.equal(jun.greitt, null); assert.equal(jun.ogefid, null);
  assert.match(jun.omaelt, /Payday 30\.06\.2026/); assert.equal(jun.unnid, 800, 'Unnið er mælt þótt Payday vanti');
  assert.equal(r.man.length, 7);
  const uppsafnad = r.man.filter((x) => x.ogefid != null).reduce((a, x) => a + x.ogefid, 0);
  assert.equal(r.ogefid_uppsafnad, uppsafnad); assert.equal(r.ogefid_manudir, 5);
});

test('reksturSl: kreditnóta á búðarsölu fylgir frumsölunni (reikningsfært og greitt), líka þegar frumsalan kemur úr frumsolur', () => {
  const g = {
    solur: [
      sala({ id: 1, upphaed_an_vsk: 1000, created_at: '2026-09-20T10:00:00Z', paid_at: '2026-09-21T10:00:00Z' }),
      sala({ id: 2, credit_of: 1, upphaed_an_vsk: -1000, created_at: '2026-10-05T10:00:00Z', paid_at: '2026-10-05T10:00:00Z' }),
      sala({ id: 3, credit_of: 99, upphaed_an_vsk: -200, created_at: '2026-11-05T10:00:00Z', paid_at: '2026-11-05T10:00:00Z' }),
    ],
    voidIds: [], skyrslur: [], verkbeidnir: [], verklidir: [], payday: [],
    frumsolur: [{ id: 99, created_at: '2026-08-14T10:00:00Z', paid_at: '2026-08-14T10:00:00Z' }],
  };
  const r = Y.reksturSl(g, NU);
  const m = (x) => r.man.find((y) => y.man === x);
  assert.equal(m('2026-09').reikningsfaert, 0, 'sept: salan og nótan jafnast út'); assert.equal(m('2026-09').greitt, 0);
  assert.equal(m('2026-10').reikningsfaert, 0, 'október (mánuður nótunnar): ekkert');
  assert.equal(m('2026-08').reikningsfaert, -200, 'nóta úr frumsolur á ágúst'); assert.equal(m('2026-11').reikningsfaert, 0);
  assert.equal(r.kredit_an_frumsolu, 0);
});

test('reksturBh: sjö mánuðir eftir fra, reikningsfært eftir útgáfudegi (aðeins PAID/SENT); kallið brást → unnið/greitt ómælt með ástæðu en reikningsfært stendur', () => {
  const bhMan = [
    { fra: '2026-10-01', til: '2026-10-31', unnid: 9280000, greitt: 4000000, unnid_hlutar: { tima: 1, landspitali: 2, heklureitur: 3 } },
    { fra: '2026-11-01', til: '2026-11-22', unnid: 10800000, greitt: 4740000 },
  ];
  const radir = [
    { source: 'payday', status: 'PAID', hofudstoll: 11700000, utgafudagur: '2026-10-20' },
    { source: 'payday', status: 'SENT', hofudstoll: 60000, utgafudagur: '2026-10-25' },
    { source: 'payday', status: 'CANCELLED', hofudstoll: 99, utgafudagur: '2026-10-25' },
    { source: 'payday', status: 'PAID', hofudstoll: 3030000, utgafudagur: '2026-11-04' },
  ];
  const r = Y.reksturBh(bhMan, radir, NU);
  const okt = r.man.find((x) => x.man === '2026-10'), nov = r.man.find((x) => x.man === '2026-11'), sep = r.man.find((x) => x.man === '2026-09');
  assert.equal(okt.reikningsfaert, 11760000); assert.equal(okt.unnid, 9280000); assert.equal(okt.ogefid, 9280000 - 11760000, 'neikvætt: fyrri vinna reikningsfærð í október');
  assert.equal(nov.reikningsfaert, 3030000); assert.equal(nov.greitt, 4740000);
  assert.equal(sep.unnid, null, 'BH-gögn vantar fyrir september → ómælt, ekki 0'); assert.match(sep.omaelt, /náðist ekki/); assert.equal(sep.reikningsfaert, 0, 'mælt og 0');
  const bilad = Y.reksturBh(null, radir, NU, 'Rekstrarskýrsla Brunahólfs svaraði 401');
  assert.equal(bilad.man.every((x) => x.unnid === null && x.greitt === null), true); assert.equal(bilad.ogefid_uppsafnad, null);
  assert.equal(bilad.man.find((x) => x.man === '2026-11').reikningsfaert, 3030000);
  assert.match(bilad.man[0].omaelt, /401/);
});

test('skilgreiningarnar í ⓘ: allar til, innheimtuhlutfall og greiðsluhraði skýrð (engin ný regla falin í viðmótinu)', () => {
  for (const k of ['unnid', 'reikningsfaert', 'greitt', 'ogefid', 'innheimtuhlutfall', 'greidsluhradi', 'setning', 'hagnadur']) assert.ok(Y.SKILGREINING[k] && Y.SKILGREINING[k].length > 40, k);
  assert.match(Y.SKILGREINING.innheimtuhlutfall, /greitt ÷ \(greitt \+ gjaldfallið ógreitt\)/);
  assert.match(Y.SKILGREINING.greidsluhradi, /miðgildi daga/);
});
