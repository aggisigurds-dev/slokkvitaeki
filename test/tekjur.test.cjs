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
    if (u.hostname.includes('brunaholf') && u.pathname.includes('rekstrarskyrsla')) {
      h.unnidKaka = (init.headers || {}).cookie || null;
      h.unnidSignal = !!init.signal; h.unnidKall = (h.unnidKall || 0) + 1;
      if (h.unnidKastar) throw new Error('net niðri');
      if (h.unnidLokad) return { ok: false, status: 401, text: async () => '{}', json: async () => ({}) };
      if (h.unnidOvaent) return svar({ bh: {} });
      return svar({ timabil: [{}, {}, {}, { fra: '2026-11-01', til: '2026-11-17' }, {}, {}, {}],
        bh: { virdi: [0, 0, 0, 10799465.4, 6616706.2, 0, 0], greitt: [0, 0, 0, 609867.4, 17953176, 0, 0] },
        ferskleiki: { ajour: { nyjast: '2026-11-18' } } });
    }
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
    // Slökkvitæki „Unnið“ (22.11.2026): sölur með tegund + skýrslur + verkbeiðnir + verkliðir; hver tafla getur brugðist sér
    if (t === 'solur' && q.get('select').includes('vidskiptategund')) {
      h.unnidSlSignal = !!init.signal; h.unnidSlKall = (h.unnidSlKall || 0) + 1;
      if (h.slKastar) throw new Error('net niðri');
      return svar([
        { id: 1, num: 'R-000001', status: F, vidskiptategund: 'uttekt', credit_of: null, upphaed_an_vsk: 1000, created_at: '2026-10-02T00:00:00Z', customer_base_id: 7, customer_id: 70, linur: [{ desc: 'Yfirferð · A', qty: 4, unit_price_ex_vat: 250 }] },
        { id: 9, num: 'R-000009', status: F, vidskiptategund: 'uttekt', credit_of: null, upphaed_an_vsk: 400, created_at: '2026-11-02T00:00:00Z', customer_base_id: 8, customer_id: 80, linur: [{ desc: 'Hleðsla · B', qty: 2, unit_price_ex_vat: 200 }] },
        { id: 5, num: 'R-000005', status: F, vidskiptategund: 'uttekt', credit_of: 2, upphaed_an_vsk: -500, created_at: '2026-11-03T00:00:00Z', customer_base_id: 8, customer_id: 80, linur: [] },
        { id: 11, num: 'R-000011', status: F, vidskiptategund: 'bud', credit_of: null, upphaed_an_vsk: 1000, created_at: '2026-10-05T00:00:00Z', customer_base_id: null, customer_id: null, linur: [{ desc: 'Hleðsla · Duft 2 kg', qty: 1, unit_price_ex_vat: 1000 }] },
      ]);
    }
    if (t === 'customer_documents') {
      assert.match(q.get('doc_type'), /uttektarskyrsla/); assert.equal(q.get('source'), 'eq.app');
      if (h.skyrslurTomar) return svar([]);
      return svar([{ id: 1, doc_type: 'uttektarskyrsla', doc_date: '2026-10-03', customer_base_id: 7, fyrirtaeki_id: 70, is_duplicate: false, skodun_ar_man: null, notes: 'Prófun - 0000000000 - 2026 - september - úttektarskýrsla - #1.pdf' }]);
    }
    if (t === 'verkbeidnir') return svar([{ id: 51, num: 'R-000011-V1', status: 'collected', verd: 1240, klart_at: '2026-11-03T08:00:00Z', eytt_at: null }]);
    if (t === 'verklidur') {
      assert.match(q.get('select'), /status/, 'status verkliðs sóttur — eydd/ónýt tæki talin ekki');
      if (h.verklidirTomir) return svar([]);
      return svar([{ job_id: 51, service: 'Duft 2 kg. ABC hleðsla', status: 'done', eytt_at: null }, { job_id: 51, service: 'Duft 6 kg. ABC hleðsla', status: 'eytt', eytt_at: null }, { job_id: 51, service: 'Duft 6 kg. ABC hleðsla', status: 'broken', eytt_at: null }]);
    }
    if (t === 'solur' && q.get('select').includes('linur')) return svar([{ status: F, created_at: '2026-10-05T00:00:00Z', linur: [{ product_id: 7, qty: 1, unit_price_ex_vat: 100 }] }]);
    if (t === 'solur' && (q.get('id') || '').startsWith('in.')) {          // frumsölur kreditnótna sóttar sér (22.11.2026)
      h.frumsolurSott = true;
      return svar(h.kreditOrg === true ? [{ id: 500, created_at: '2026-08-10T00:00:00Z' }] : []);
    }
    if (t === 'solur') return svar([
      { id: 1, status: F, upphaed_an_vsk: 1000, created_at: '2026-10-02T00:00:00Z' },
      { id: 9, status: F, upphaed_an_vsk: 400, created_at: '2026-11-02T00:00:00Z' },
      { id: 5, status: F, upphaed_an_vsk: -500, credit_of: 2, created_at: '2026-11-03T00:00:00Z' },
      ...(h.kreditOrg ? [{ id: 20, status: F, upphaed_an_vsk: -700, credit_of: 500, created_at: '2026-11-03T00:00:00Z' }] : []),
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

test('tekjur-beint: Brunahólf „Unnið" úr Rekstrarskýrslu — kaka kallandans áfram, aðeins hún; ómælt (aldrei 0) ef skýrslan lokar eða snið breytist', async () => {
  const h = {}; stub(h);
  const ev = { headers: { cookie: 'annad=1; hub_user=abc.def; fleira=2' } };
  const d = await TB._lesa(new Date('2026-11-17T01:00:00Z'), ev);
  assert.equal(h.unnidKaka, 'hub_user=abc.def', 'aðeins hub_user fer áfram, engin önnur kaka');
  assert.deepEqual(d.brunaholf.unnid, { manudur_til_dags: 10799465, fyrri_manudur: 6616706, greitt_manudur_til_dags: 609867, fra: '2026-11-01', til: '2026-11-17', ajour_til: '2026-11-18' });
  assert.equal(d.brunaholf.manudur_til_dags, 300, 'Reikningsfært (útgáfudagur) er óbreytt og sér tala');
  assert.doesNotMatch(JSON.stringify(d), /customer|nafn|kt/i, 'aðeins samtölur fara út');
  // án kökunnar: ómælt með ástæðu
  const d2 = await TB._lesa(new Date('2026-11-17T01:00:00Z'));
  assert.match(d2.brunaholf.unnid.omaelt, /kökuna vantar/); assert.equal(d2.brunaholf.unnid.manudur_til_dags, undefined);
  // skýrslan lokuð / óvænt snið: ómælt, hitt stendur
  h.unnidLokad = true;
  const d3 = await TB._lesa(new Date('2026-11-17T01:00:00Z'), ev);
  assert.match(d3.brunaholf.unnid.omaelt, /401/); assert.equal(d3.brunaholf.manudur_til_dags, 300);
  h.unnidLokad = false; h.unnidOvaent = true;
  const d4 = await TB._lesa(new Date('2026-11-17T01:00:00Z'), ev);
  assert.match(d4.brunaholf.unnid.omaelt, /óvænt snið/);
  // tímamörk fylgja kallinu (rýni 22.11), og net niðri/tímamörk → ómælt, aldrei kast
  h.unnidOvaent = false;
  await TB._lesa(new Date('2026-11-17T01:00:00Z'), ev);
  assert.equal(h.unnidSignal, true, 'AbortSignal.timeout fylgir fetch');
  h.unnidKastar = true;
  const d5 = await TB._lesa(new Date('2026-11-17T01:00:00Z'), ev);
  assert.match(d5.brunaholf.unnid.omaelt, /náðist ekki/); assert.equal(d5.brunaholf.manudur_til_dags, 300, 'hitt stendur');
  // „Vista forsendu“ (event=false) sækir ekki skýrsluna: unnid null, ekkert kall
  h.unnidKastar = false; h.unnidKall = 0;
  const d6 = await TB._lesa(new Date('2026-11-17T01:00:00Z'), false);
  assert.equal(d6.brunaholf.unnid, null); assert.equal(h.unnidKall, 0, 'skýrslan ekki kölluð við Vista');
});

// ── 22.11.2026: KREDITNÓTUR MIÐAST VIÐ DAGSETNINGU FRUMSÖLUNNAR (Agnar: „0 fellur bara út“) ──────────────────────────────────────────
test('kredit í öðrum mánuði en frumsala: nettó 0 í mánuði frumsölunnar og 0 í mánuði nótunnar (slokkvitaekiManudirFrumsala)', () => {
  const rows = [
    { id: 1, status: F, upphaed_an_vsk: 1000, created_at: '2026-08-20T09:00:00Z' },
    { id: 2, status: F, upphaed_an_vsk: -1000, credit_of: 1, created_at: '2026-09-04T09:00:00Z' },
  ];
  const r = T.slokkvitaekiManudirFrumsala(rows, []);
  assert.equal(r.man['2026-08'], 0, 'ágúst: salan og nótan jafnast út');
  assert.equal(r.man['2026-09'], undefined, 'september (mánuður nótunnar): ekkert');
  assert.equal(r.kredit_an_frumsolu, 0);
  // gamla fallið (Ráðgjafinn) er ÓBREYTT: nótan í sínum mánuði — markmiðsröndin snertist ekki
  assert.deepEqual(T.slokkvitaekiManudir(rows, []), { '2026-08': 1000, '2026-09': -1000 });
});

test('hluta-kredit: mismunurinn er eftir í mánuði frumsölunnar; frumsala sótt sér (frumsolur); án frumsölu = eigin mánuður og TALIÐ', () => {
  const sala = { id: 1, status: F, upphaed_an_vsk: 1000, created_at: '2026-08-20T09:00:00Z' };
  const nota = { id: 2, status: F, upphaed_an_vsk: -300, credit_of: 1, created_at: '2026-09-04T09:00:00Z' };
  assert.deepEqual(T.slokkvitaekiManudirFrumsala([sala, nota], []).man, { '2026-08': 700 });
  // frumsalan er ekki í lestrinum (eldri en gluggi) en kemur úr frumsolur
  const b = T.slokkvitaekiManudirFrumsala([nota], [], [{ id: 1, created_at: '2026-08-20T09:00:00Z' }]);
  assert.deepEqual(b.man, { '2026-08': -300 }); assert.equal(b.kredit_an_frumsolu, 0);
  // finnst hvergi → eigin mánuður, talið; is_credit án credit_of líka; kredit á bakfærða sölu er úti og ekki talin
  const c = T.slokkvitaekiManudirFrumsala([
    { id: 3, status: F, upphaed_an_vsk: -100, credit_of: 999, created_at: '2026-10-05T09:00:00Z' },
    { id: 4, status: F, upphaed_an_vsk: -50, is_credit: true, created_at: '2026-10-06T09:00:00Z' },
    { id: 5, status: F, upphaed_an_vsk: -900, credit_of: 77, created_at: '2026-10-07T09:00:00Z' },
  ], [77]);
  assert.deepEqual(c.man, { '2026-10': -150 }); assert.equal(c.kredit_an_frumsolu, 2);
});

test('tekjur-beint: frumsala kreditnótu sótt sér, nóta fer á mánuð frumsölunnar og „kredit án frumsölu“ er talið í svarinu', async () => {
  const h = { kreditOrg: true }; stub(h);
  const d = await TB._lesa(new Date('2026-11-17T01:00:00Z'));
  assert.equal(d.slokkvitaeki.kredit_an_frumsolu, 0, 'frumsalan fannst');
  assert.equal(h.frumsolurSott, true, 'frumsölurnar sóttar með id=in.(…) — aðeins þær sem vantar');
  assert.equal(d.slokkvitaeki.manudur_til_dags, 400, 'nóvember: nótan (−700 á ágústsölu) er EKKI í nóvember');
  assert.equal(d.slokkvitaeki.ar_til_dags, 700, 'ár til dags = 1000 + 400 − 700');
  h.kreditOrg = 'finnst-ekki';
  const d2 = await TB._lesa(new Date('2026-11-17T01:00:00Z'));
  assert.equal(d2.slokkvitaeki.kredit_an_frumsolu, 1, 'frumsalan finnst ekki → eigin mánuður og talið');
  assert.equal(d2.slokkvitaeki.manudur_til_dags, -300, 'nóvember: 400 − 700 (eigin dagur)');
});

test('tekjur-beint: Slökkvitæki „Unnið“ — skoðanir eftir skoðunarmánuði, verkstæði á klart_at, samtals; ómælt (aldrei 0) ef lestur bregst; Vista sækir það ekki', async () => {
  const h = {}; stub(h);
  const d = await TB._lesa(new Date('2026-11-17T01:00:00Z'));
  const u = d.slokkvitaeki.unnid;
  assert.equal(h.unnidSlSignal, true, 'AbortSignal.timeout (5 s) fylgir lestrunum');
  assert.equal(u.manudur_til_dags.skodanir.kr, 400, 'sala 02.11 án skýrslu → mánuður sölunnar');
  assert.equal(u.manudur_til_dags.skodanir.an_skyrslu_kr, 400, '… og merkt „án skýrslu“');
  assert.equal(u.manudur_til_dags.verkstaedi.kr, 1000, 'V-hluti (1240 ÷ 1,24) á klart_at 03.11, þótt salan sé frá október');
  assert.deepEqual(u.manudur_til_dags.verkstaedi.taeki, { yfirferd: 0, hledsla: 1, nytt: 0 });
  assert.deepEqual(u.manudur_til_dags.skodanir.taeki, { yfirferd: 0, hledsla: 2, nytt: 0 });
  assert.equal(u.manudur_til_dags.samtals.kr, 1400); assert.deepEqual(u.manudur_til_dags.samtals.taeki, { yfirferd: 0, hledsla: 3, nytt: 0 });
  assert.equal(u.fyrri_manudur.samtals.kr, 0, 'salan frá 05.10 er færð á klart_at — engin tvítalning í október');
  assert.equal(u.ar_til_dags_kr, 2400, 'september (1000 á skoðunarmánuð) + nóvember');
  assert.equal(d.slokkvitaeki.manudur_til_dags, 400, 'gamla reglan (söludagur) er óbreytt og sér tala');
  assert.doesNotMatch(JSON.stringify(d), /customer|nafn|kt/i, 'aðeins samtölur fara út');
  assert.match(d.skilgreining.slokkvitaeki_unnid, /klart_at/);
  // skýrslulestur tómur → ómælt með ástæðu (annars yrði allt „án skýrslu“), hitt stendur
  h.skyrslurTomar = true;
  const d2 = await TB._lesa(new Date('2026-11-17T01:00:00Z'));
  assert.match(d2.slokkvitaeki.unnid.omaelt, /skýrslulesturinn skilaði engu/); assert.equal(d2.slokkvitaeki.unnid.manudur_til_dags, undefined);
  assert.equal(d2.slokkvitaeki.manudur_til_dags, 400, 'gamla talan stendur');
  // verkliðir tómir (aðgangsregla) → ómælt: annars yrðu tæki verkstæðis 0
  h.skyrslurTomar = false; h.verklidirTomir = true;
  const d2b = await TB._lesa(new Date('2026-11-17T01:00:00Z'));
  assert.match(d2b.slokkvitaeki.unnid.omaelt, /verkliðalesturinn skilaði engu/);
  // net niðri → ómælt, aldrei kast
  h.verklidirTomir = false; h.slKastar = true;
  const d3 = await TB._lesa(new Date('2026-11-17T01:00:00Z'));
  assert.match(d3.slokkvitaeki.unnid.omaelt, /náðist ekki/); assert.equal(d3.slokkvitaeki.fyrri_manudur, 1000);
  // „Vista forsendu“ (event=false) sækir ekki Unnið
  h.slKastar = false; h.unnidSlKall = 0;
  const d4 = await TB._lesa(new Date('2026-11-17T01:00:00Z'), false);
  assert.equal(d4.slokkvitaeki.unnid, null); assert.equal(h.unnidSlKall, 0);
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
  assert.equal((bh.match(/<span>ómælt<\/span>/g) || []).length, 6, 'Unnið (nýtt 21.11), mánuður, ár, síðasti mánuður, pípa og hagnaður: ómælt');
  assert.match(bh, /reikningalesturinn skilaði engu/); assert.match(bh, /Kröfu yfirlit Brunahólfs svaraði ekki/);
  assert.doesNotMatch(bh, /<span>0 kr<\/span>/);
});

test('512: Unnið og Greitt teiknast með tölum, Greitt fellur út þegar það er null, útgáfudagstalan heitir Reikningsfært', async () => {
  const gr = (greitt) => ({
    maelt_at: '2026-11-22T04:00:00Z', skilgreining: {},
    slokkvitaeki: { manudur: '2026-11', manudur_til_dags: 400, fyrri_man: '2026-10', fyrri_manudur: 1000, ar_til_dags: 1400, ar_fra: '2026-05',
      pipa: { kr_an_vsk: 0, fjoldi: 0 }, framlegd_voru: { fyrri_manudur: { framlegd: 60, thak_pct: 10 } }, hagnadur: { kr: null } },
    brunaholf: { manudur: '2026-11', manudur_til_dags: 3034316, fyrri_man: '2026-10', fyrri_manudur: 11755921, ar_til_dags: 30000000, ar_fra: '2026-01',
      unnid: { manudur_til_dags: 10799465, fyrri_manudur: 6616706, greitt_manudur_til_dags: greitt, fra: '2026-11-01', til: '2026-11-21', ajour_til: '2026-11-18' },
      pipa: { heiti: 'Ósent', kr_m_vsk: 100, fjoldi: 1 }, hagnadur: { kr: null } },
  });
  const a = flisar(svarHttp(200, gr(609867))); a.TB.mount(a.el); await bida();
  const bh = a.el.innerHTML.split('Brunahólf<small>')[1];
  assert.match(bh, /Unnið · [^<]*til dags/); assert.match(bh, /tkb-unnid/); assert.match(bh, /göt til 18\.11/);
  assert.match(bh, /Reikningsfært · [^<]*til dags/); assert.match(bh, /Greitt · [^<]*til dags/);
  assert.doesNotMatch(bh, /<span>ómælt<\/span>[^]*?Unnið/, 'Unnið er mælt');
  const b = flisar(svarHttp(200, gr(null))); b.TB.mount(b.el); await bida();
  assert.doesNotMatch(b.el.innerHTML.split('Brunahólf<small>')[1], /Greitt · /, 'Greitt hverfur þegar það er null — ekki 0');
});

test('512: Slökkvitæki „unnið“ — Skoðanir · Verkstæði · Verslun · Samtals með tækjum, flaggað „án skýrslu“/„óviss“/„áætlað“; ómælt með ástæðu, aldrei 0; eldra svar án unnid hrynur ekki', async () => {
  const tk = (y, h, n) => ({ yfirferd: y, hledsla: h, nytt: n });
  const u = {
    manudur: '2026-11', fyrri_man: '2026-10', ar_fra: '2026-05', ar_til_dags_kr: 25000000, i_vinnslu_kr: 56000, fyrir_yfirtoku_kr: 0, ostemmt_kr: 0, ostemmt_fjoldi: 0,
    manudur_til_dags: {
      skodanir: { kr: 4200000, arsthjonusta_kr: 4000000, brunakerfi_kr: 200000, slokkvikerfi_kr: 0, an_skyrslu_kr: 120000, an_skyrslu_fjoldi: 3, oviss_kr: 45000, leidrett_fjoldi: 1, skyrslur_klaradar: 41, skyrslur_sidbuin: 6, taeki: tk(412, 88, 12) },
      verkstaedi: { kr: 650000, aaetlad_kr: 650000, aaetlad_taeki: 300, taeki: tk(20, 300, 0) },
      verslun: { kr: 900000 }, samtals: { kr: 5750000, taeki: tk(432, 388, 12) },
    },
    fyrri_manudur: { skodanir: { kr: 6000000 }, verkstaedi: { kr: 0 }, verslun: { kr: 0 }, samtals: { kr: 8100000, taeki: tk(1, 1, 1) } },
  };
  const d = (unnid) => ({
    maelt_at: '2026-11-22T04:00:00Z', skilgreining: {},
    slokkvitaeki: { manudur: '2026-11', manudur_til_dags: 400, fyrri_man: '2026-10', fyrri_manudur: 1000, ar_til_dags: 1400, ar_fra: '2026-05',
      unnid, pipa: { kr_an_vsk: 0, fjoldi: 0 }, framlegd_voru: { fyrri_manudur: { framlegd: 60, thak_pct: 10 } }, hagnadur: { kr: null } },
    brunaholf: { manudur: '2026-11', manudur_til_dags: 3034316, fyrri_man: '2026-10', fyrri_manudur: 11755921, ar_til_dags: 30000000, ar_fra: '2026-01',
      pipa: { heiti: 'Ósent', kr_m_vsk: 100, fjoldi: 1 }, hagnadur: { kr: null } },
  });
  const a = flisar(svarHttp(200, d(u))); a.TB.mount(a.el); await bida();
  const sl = a.el.innerHTML.split('Brunahólf<small>')[0];
  assert.match(sl, /Slökkvitæki<small>unnið/); assert.match(sl, /Slökkvitæki<small>söluskráð/);
  assert.match(sl, /Skoðanir · nóvember til dags/); assert.match(sl, /Verkstæði · nóvember til dags/); assert.match(sl, /Samtals unnið · nóvember til dags/);
  assert.match(sl, /yfirf\. 412 · hlaðin 88 · ný 12/, 'tæki skoðana'); assert.match(sl, /yfirf\. 432 · hlaðin 388 · ný 12/, 'tæki samtals');
  assert.match(sl, /án skýrslu 120\.000 kr \(3\)/, 'án skýrslu flaggað með fjölda'); assert.match(sl, /óviss 45\.000 kr/); assert.match(sl, /áætlað 650\.000 kr \(klart_at vantar\)/);
  assert.match(sl, /Skýrslur kláraðar · nóvember<\/b><span>41<\/span>[^]*?þar af 6 síðbúnar/, 'skýrslur eftir kláradegi'); assert.match(sl, /Á verkstæði núna/); assert.match(sl, /Samtals unnið · október/);
  // ómælt með ástæðu — aldrei 0
  const b = flisar(svarHttp(200, d({ omaelt: 'skýrslulesturinn skilaði engu' }))); b.TB.mount(b.el); await bida();
  const slb = b.el.innerHTML.split('Brunahólf<small>')[0];
  assert.match(slb, /<span>ómælt<\/span>/); assert.match(slb, /skýrslulesturinn skilaði engu/); assert.doesNotMatch(slb, /Skoðanir · /);
  // eldra svar án unnid (skyndiminni/eldri þjónn): engin Unnið-röð og engin villa
  const c = flisar(svarHttp(200, d(undefined))); c.TB.mount(c.el); await bida();
  assert.doesNotMatch(c.el.innerHTML.split('Brunahólf<small>')[0], /unnið/); assert.match(c.el.innerHTML, /Slökkvitæki<small>söluskráð/);
});

// ── 22.11.2026: „Hvernig gengur reksturinn?“ efst í Tekjur í beinni ─────────────────────────────────────────────────────────────────────
const svarURL = (adal, rekstur) => async (url) => { const r = String(url).indexOf('rekstur-yfirlit') >= 0 ? rekstur : adal; return { status: r.status, ok: r.status >= 200 && r.status < 300, json: async () => r.j }; };
const TKP = { maelt_at: '2026-11-22T04:00:00Z', skilgreining: {},
  slokkvitaeki: { manudur: '2026-11', manudur_til_dags: 400, fyrri_man: '2026-10', fyrri_manudur: 1000, ar_til_dags: 1400, ar_fra: '2026-05', pipa: { kr_an_vsk: 0, fjoldi: 0 }, framlegd_voru: { fyrri_manudur: { framlegd: 60, thak_pct: 10 } }, hagnadur: { kr: null } },
  brunaholf: { manudur: '2026-11', manudur_til_dags: 3034316, fyrri_man: '2026-10', fyrri_manudur: 11755921, ar_til_dags: 30000000, ar_fra: '2026-01', pipa: { heiti: 'Ósent', kr_m_vsk: 100, fjoldi: 1 }, hagnadur: { kr: null } } };
function rkData() {
  const man = (m, u, rf, gr, extra) => Object.assign({ man: m, unnid: u, reikningsfaert: rf, greitt: gr, ogefid: rf == null ? null : u - rf }, extra || {});
  const slMan = [
    man('2026-05', 1000000, null, null, { omaelt: 'Slökkvitæki fór í Payday 30.06.2026 — reikningar fyrir þann tíma eru ekki í þessum gögnum' }),
    man('2026-06', 2000000, null, null, { omaelt: 'Slökkvitæki fór í Payday 30.06.2026 — reikningar fyrir þann tíma eru ekki í þessum gögnum' }),
    man('2026-07', 4000000, 4900000, 4800000), man('2026-08', 4200000, 4200000, 4100000), man('2026-09', 4500000, 5200000, 5000000),
    man('2026-10', 5178689, 5700000, 4600000, { mat: { an_skyrslu_kr: 79745, aaetlad_kr: 160108 }, hlutar: { rf_payday: 4700000, rf_verslun: 1000000, gr_payday: 3900000, gr_verslun: 700000 } }),
    man('2026-11', 2103182, 2146000, 709000),
  ];
  const bhMan = ['2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10', '2026-11'].map((m, i) => man(m, 8000000 + i * 100000, 7000000 + i * 500000, 6000000 + i * 100000, { hlutar: { tima: 1000, landspitali: 2000, heklureitur: 3000 } }));
  bhMan[5] = man('2026-10', 9280000, 11760000, 5000000);
  return {
    maelt_at: '2026-11-22T04:00:00Z', idag: '2026-11-22',
    slokkvitaeki: { man: slMan, ogefid_uppsafnad: -1234567, ogefid_manudir: 5,
      ogreitt: { kr_an_vsk: 2730762, kr_m_vsk: 3386140, n: 29, gjaldfallid_kr: 1743464, gjaldfallid_n: 22, yfir45_kr: 40000, yfir45_n: 2 },
      innheimta: { hlutfall: 92.5, hradi_midgildi: 10, hradi_n: 391, greitt_kr: 21465433, gjaldfallid_kr: 1743464, fra: '2026-06-30' },
      setning: { setning: 'Nóvember til dags: unnið 2,10 m — 41 % af október-heild (5,18 m) og 71 % mánaðarins er liðinn (15 af 21 vinnudögum).', aaetlun: { kr: 2944455, hlutfall_fyrri: 57, texti: 'ÁÆTLUN (línuleg, ekki spá): sömu vinnudagar áfram → mánuðurinn endar í um 2,94 m (57 % af október-heild).' } } },
    brunaholf: { man: bhMan, ogefid_uppsafnad: 4000000, ogefid_manudir: 7,
      ogreitt: { kr_m_vsk: 6510000, n: 10, gjaldfallid_kr_m_vsk: 4200000, gjaldfallid_n: 4, yfir45_kr_m_vsk: 1100000, yfir45_n: 1 },
      innheimta: { hlutfall: 88.5, hradi_midgildi: 14.5, hradi_n: 20, greitt_kr: 1000, gjaldfallid_kr: 130, fra: '2026-06-30' },
      setning: { setning: 'Nóvember til dags: unnið 8,60 m — 93 % af október-heild (9,28 m) og 71 % mánaðarins er liðinn (15 af 21 vinnudögum).', aaetlun: null } },
    skilgreining: { unnid: 'UNNIÐ-skýring', reikningsfaert: 'REIKNINGSFÆRT-skýring', greitt: 'GREITT-skýring', ogefid: 'ÓGEFIÐ-skýring', innheimtuhlutfall: 'INNHEIMTU-skýring', greidsluhradi: 'HRAÐA-skýring', setning: 'SETNINGAR-skýring', hagnadur: 'HAGNAÐAR-skýring' },
  };
}

test('512: „Hvernig gengur reksturinn?“ — hvort félag sér, sjö mánuðir, unnið/reikningsfært/greitt/ógefið út, ógreitt, innheimta, setning + MERKT áætlun, hagnaður ómælt', async () => {
  const { TB, el } = flisar(svarURL({ status: 200, j: TKP }, { status: 200, j: rkData() }));
  TB.mount(el); await bida();
  const h = el.innerHTML;
  assert.match(h, /Hvernig gengur reksturinn\?/);
  const blokk = h.split('class="tkb-rk-h"')[1].split('Slökkvitæki<small>')[0];
  const [slHluti, bhHluti] = blokk.split('<h4>Brunahólf</h4>');
  assert.match(slHluti, /<h4>Slökkvitæki<\/h4>/); assert.ok(bhHluti, 'Brunahólf sér hluti');
  assert.equal((slHluti.match(/<tr/g) || []).length, 8, 'haus + sjö mánuðir (SL)'); assert.equal((bhHluti.match(/<tr/g) || []).length, 8, 'haus + sjö mánuðir (BH)');
  assert.match(slHluti, /nóv · til dags/); assert.match(slHluti, /<td>maí<\/td>|<td>maí/); assert.match(slHluti, />Ógefið út</);
  // setning og merkt áætlun, engin fullyrðing
  assert.match(slHluti, /Nóvember til dags: unnið 2,10 m — 41 % af október-heild/); assert.match(slHluti, /class="tkb-aaetl">ÁÆTLUN \(línuleg, ekki spá\)/);
  assert.doesNotMatch(bhHluti, /ÁÆTLUN/, 'engin áætlun þegar hún er null');
  // júní og fyrr hjá SL: reikningsfært og greitt ómælt með ástæðu (title), aldrei 0
  assert.match(slHluti, /<td class="tkb-om" title="Slökkvitæki fór í Payday 30\.06\.2026[^"]*">ómælt<\/td>/);
  assert.doesNotMatch(slHluti.split('<tr')[8] || '', /<td>0 kr<\/td>/);
  // neikvætt ógefið út með formerki; flögg á október (án skýrslu *, verkstæði áætlað †)
  assert.match(bhHluti, /class="tkb-ne"[^>]*>−2,48 m<\/td>/); assert.match(slHluti, /<sup title="án skýrslu 79\.745 kr[^"]*">\*<\/sup>/); assert.match(slHluti, /<sup title="verkstæði áætlað 160\.108 kr[^"]*">†<\/sup>/);
  // ógreitt núna (SL án vsk eins og Payday; BH Kröfu yfirlit m. VSK) + tengill, innheimta og hraði með ⓘ skilgreiningu
  assert.match(slHluti, /Ógreitt núna \(sent, án VSK\): <b>2,73 m<\/b> \(29 reikn\.\) · gjaldfallið <b>1,74 m<\/b> \(22\)/);
  assert.match(bhHluti, /Ógreitt núna \(Kröfu yfirlit, m\. VSK\): <b>6,51 m<\/b> \(10 reikn\.\) · gjaldfallið <b>4,20 m<\/b> \(4\)/);
  assert.match(slHluti, /data-tkb-ga="krofu-yfirlit"/);
  assert.match(slHluti, /Innheimtuhlutfall <b>92,5 %<\/b> <span class="tkb-i" title="INNHEIMTU-skýring">ⓘ<\/span> · greiðsluhraði <b>10 dagar<\/b> <span class="tkb-i" title="HRAÐA-skýring">ⓘ<\/span>/);
  assert.match(bhHluti, /greiðsluhraði <b>14,5 dagar<\/b>/);
  assert.match(slHluti, /Ógefið út, uppsafnað \(5 mán\.\): <b class="tkb-ne">−1,23 m<\/b>/);
  // hagnaður ómældur með tengli í innsláttarformið — aldrei 0
  assert.match(slHluti, /Hagnaður: <b>ómælt<\/b> — vantar laun og annan kostnað · <a data-tkb-hagn="slokkvitaeki">skrá laun og kostnað<\/a>/);
  assert.match(bhHluti, /data-tkb-hagn="brunaholf"/);
  assert.doesNotMatch(blokk, /<td>0 kr<\/td>.*Hagnaður/, 'ekkert „0 kr“ fyrir hagnað');
  // flísarnar fyrir neðan standa
  assert.match(h, /Slökkvitæki<small>söluskráð/); assert.match(h, /Brunahólf<small>án VSK/);
});

test('512: reksturinn bregst → „Ómælt — ástæða“ í blokkinni og flísarnar standa; 403 → blokkin hverfur; óvænt snið og net niðri hrynja ekki', async () => {
  for (const [lysing, rk, vaent] of [
    ['500', { status: 500, j: { error: 'Reksturinn náðist ekki — reyndu aftur eftir smá stund' } }, /Ómælt — Reksturinn náðist ekki/],
    ['óvænt snið', { status: 200, j: { slokkvitaeki: {} } }, /Ómælt — óvænt snið/],
  ]) {
    const { TB, el } = flisar(svarURL({ status: 200, j: TKP }, rk));
    assert.doesNotThrow(() => TB.mount(el), lysing); await bida();
    assert.match(el.innerHTML, vaent, lysing); assert.match(el.innerHTML, /Slökkvitæki<small>söluskráð/, lysing + ': flísarnar standa');
  }
  const net = flisar(async (url) => { if (String(url).indexOf('rekstur-yfirlit') >= 0) throw new Error('Failed to fetch'); return { status: 200, ok: true, json: async () => TKP }; });
  net.TB.mount(net.el); await bida();
  assert.match(net.el.innerHTML, /Ómælt — Failed to fetch/); assert.match(net.el.innerHTML, /Brunahólf<small>/);
  const f403 = flisar(svarURL({ status: 200, j: TKP }, { status: 403, j: { error: 'x' } }));
  f403.TB.mount(f403.el); await bida();
  assert.doesNotMatch(f403.el.innerHTML, /Hvernig gengur reksturinn/); assert.match(f403.el.innerHTML, /Slökkvitæki<small>söluskráð/);
  // félag ómælt (ómælt í heild) → „Ómælt — ástæða“ fyrir það félag, hitt stendur
  const d = rkData(); d.brunaholf = { omaelt: 'Rekstur Brunahólfs svaraði of seint' };
  const c = flisar(svarURL({ status: 200, j: TKP }, { status: 200, j: d })); c.TB.mount(c.el); await bida();
  assert.match(c.el.innerHTML, /<h4>Brunahólf<\/h4><p>Ómælt — Rekstur Brunahólfs svaraði of seint<\/p>/); assert.match(c.el.innerHTML, /Nóvember til dags: unnið 2,10 m/);
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
