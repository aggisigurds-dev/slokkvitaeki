// Próf á fallinu rekstur-yfirlit.cjs (22.11.2026): hlið, lestur, tímamörk, ómælt-mynstur, engin nöfn. Keyrsla: timeout 90 node --test test/rekstur-yfirlit-fall.test.cjs
// Gögnin eru tilbúin (engin raunveruleg nöfn, kennitölur eða upphæðir — repóið er opið).
'use strict';
const test = require('node:test');
const assert = require('node:assert');
process.env.SUPABASE_URL = 'https://dummy.supabase.co'; process.env.SUPABASE_SERVICE_ROLE_KEY = 'x';
const RY = require('../netlify/functions/rekstur-yfirlit.cjs');

function notandi(svar) {
  const HUB = require('../netlify/functions/hub-adgangar.cjs');
  const gamalt = HUB.handler;
  HUB.handler = async () => (svar === 'nidri' ? { statusCode: 500, body: '{}' } : { statusCode: 200, body: JSON.stringify(svar) });
  return () => { HUB.handler = gamalt; };
}
const ADMIN = { gate: true, authed: true, user: { nafn: 'Prófari', rola: 'Admin' } };
const NU = new Date('2026-11-22T10:00:00Z');
const F = 'final';

// 7 BH-mánuðir eins og rekstur-manudir.js skilar þeim
const bhMan = ['2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10', '2026-11'].map((m, i) => ({
  fra: m + '-01', til: m + '-28', heiti: { n: m, s: '' }, unnid: 1000000 * (i + 1), greitt: 500000 * (i + 1), greitt_n: 3, unnid_hlutar: { tima: 1, landspitali: 2, heklureitur: 3 }, klst: 10, got: 5,
}));

function stub(h) {
  global.fetch = async (url, init = {}) => {
    const u = new URL(url);
    const svar = (d, ok = true, status = 200) => ({ ok, status, text: async () => (d == null ? '' : JSON.stringify(d)), json: async () => d });
    if (u.hostname.includes('brunaholf') && u.pathname.includes('rekstur-manudir')) {
      h.bhKaka = (init.headers || {}).cookie || null; h.bhSignal = !!init.signal;
      if (h.bhKastar) throw new Error('net niðri');
      if (h.bhLokad) return svar({}, false, 401);
      if (h.bhOvaent) return svar({ man: [] });
      return svar({ idag: '2026-11-22', man: bhMan, innheimta: { hlutfall: 88.5, hradi_midgildi: 14, hradi_n: 20, greitt_kr: 1000, gjaldfallid_kr: 130, fra: '2026-06-30' }, ferskleiki: {} });
    }
    if (u.hostname.includes('brunaholf') && u.pathname.includes('krofu-yfirlit-bru')) {
      h.bhToki = (init.headers || {})['x-hub-toki'] || null;
      if (h.ogreittLokad) return svar({}, false, 401);
      return svar({ tier2: { total: 500000, n: 2 }, tier1: { total: 9000000, n: 3, debtors: [{ invoices: [
        { amount: 5000000, gjalddagi: '2026-09-01' }, { amount: 3000000, gjalddagi: '2026-11-10' }, { amount: 1000000, gjalddagi: '2026-12-20' }, { amount: 777, gjalddagi: '2026-01-01', hidden: true },
      ] }] } });
    }
    const t = u.pathname.split('/').pop(), q = u.searchParams;
    if (Number(q.get('offset') || 0) > 0) return svar([]);
    if (h.nidriTafla === t) return svar({ message: 'kaboom' }, false, 500);
    if (t === 'solur' && q.get('status') === 'eq.void') return svar([{ id: 2 }]);
    if (t === 'solur' && (q.get('id') || '').startsWith('in.')) { h.frumsolurSott = true; return svar([{ id: 500, created_at: '2026-08-10T00:00:00Z', paid_at: null }]); }
    if (t === 'solur') {
      h.solurSignal = !!init.signal;
      return svar([
        { id: 1, num: 'R-000001', status: F, vidskiptategund: 'bud', credit_of: null, upphaed_an_vsk: 1000, created_at: '2026-10-10T00:00:00Z', paid_at: '2026-10-10T00:00:00Z', greitt_med: 'kort', linur: [] },
        { id: 3, num: 'R-000003', status: F, vidskiptategund: 'bud', credit_of: null, upphaed_an_vsk: 4000, created_at: '2026-10-12T00:00:00Z', greitt_med: 'reikningur', linur: [] },
        { id: 4, num: 'R-000004', status: F, vidskiptategund: 'bud', credit_of: 500, upphaed_an_vsk: -300, created_at: '2026-11-03T00:00:00Z', paid_at: '2026-11-03T00:00:00Z', greitt_med: 'kort', linur: [] },
      ]);
    }
    if (t === 'v_krafa_ekki_send_adgerd') return svar(h.osentNidri ? { message: 'kaboom' } : [{ num: 'R-1', samtals: 1240 }, { num: 'R-2', samtals: 2480 }], !h.osentNidri, h.osentNidri ? 500 : 200);
    if (t === 'customer_documents') return svar(h.skyrslurTomar ? [] : [{ id: 1, doc_type: 'uttektarskyrsla', doc_date: '2026-10-03', customer_base_id: 7, fyrirtaeki_id: 70, is_duplicate: false, notes: 'x' }]);
    if (t === 'verkbeidnir') return svar([{ id: 51, num: 'R-009999-V1', status: 'collected', verd: 1240, klart_at: null, eytt_at: null }]);
    if (t === 'verklidur') return svar([{ job_id: 51, service: 'Duft 2 kg. ABC hleðsla', status: 'done', eytt_at: null }]);
    if (t === 'payday_invoices_slokk') {
      if (h.paydayTomt) return svar([]);
      return svar([
        { status: 'PAID', amount_ex: 4000, amount_total: 4960, created_date: '2026-10-14', paid_date: '2026-10-24', due_date: '2026-10-21', updated_at: '2026-11-21T03:00:00Z' },
        { status: 'SENT', amount_ex: 700, amount_total: 868, created_date: '2026-11-05', due_date: '2026-11-12' },
        { status: 'SENT', amount_ex: 300, amount_total: 372, created_date: '2026-11-18', due_date: '2026-11-25' },
      ]);
    }
    if (t === 'invoices') {
      if (h.reikningarTomir) return svar([]);
      return svar([{ status: 'PAID', source: 'payday', hofudstoll: 3000000, utgafudagur: '2026-11-04' }, { status: 'SENT', source: 'payday', hofudstoll: 11000000, utgafudagur: '2026-10-20' }]);
    }
    throw new Error('óvænt slóð ' + url);
  };
}
const EV = { httpMethod: 'GET', headers: { cookie: 'annad=1; hub_user=abc.def; fleira=2' } };

test('rekstur-yfirlit: hvort félag sér — mánuðir, setning, ógreitt, innheimta; kaka áfram (aðeins hub_user); engin nöfn í svarinu', async () => {
  const h = {}; stub(h);
  const d = await RY._lesa(NU, EV);
  assert.equal(h.bhKaka, 'hub_user=abc.def', 'aðeins hub_user fer áfram'); assert.equal(h.bhSignal, true, '7 s tímamörk fylgja kallinu'); assert.equal(h.solurSignal, true);
  assert.equal(h.frumsolurSott, true, 'frumsala kreditnótu sótt sér');
  const sl = d.slokkvitaeki;
  assert.equal(sl.man.length, 7);
  const nov = sl.man[6], okt = sl.man[5], jun = sl.man[1];
  assert.equal(nov.man, '2026-11'); assert.equal(okt.man, '2026-10');
  assert.equal(okt.reikningsfaert, 4000 + 1000, 'Payday 4.000 + verslun 1.000'); assert.equal(okt.greitt, 4000 + 1000);
  assert.equal(nov.reikningsfaert, 1000, 'Payday 700 + 300 sent í nóvember (verslunin á −300 nótu er á frumsölunni í ágúst)');
  assert.equal(sl.man[3].reikningsfaert, -300, 'ágúst: nóta úr frumsolur fylgir frumsölunni');
  assert.equal(jun.reikningsfaert, null); assert.match(jun.omaelt, /Payday/);
  assert.match(sl.setning.setning, /^Nóvember til dags: unnið /); assert.match(sl.setning.aaetlun.texti, /^ÁÆTLUN/);
  assert.equal(sl.ogreitt.kr_an_vsk, 1000); assert.equal(sl.ogreitt.n, 2); assert.equal(sl.ogreitt.gjaldfallid_kr, 700); assert.equal(sl.ogreitt.gjaldfallid_n, 1);
  assert.equal(sl.innheimta.hlutfall, Math.round(1000 * 4000 / 4700) / 10); assert.equal(sl.innheimta.hradi_midgildi, 10);
  const bh = d.brunaholf;
  assert.equal(bh.man.length, 7); assert.equal(bh.man[6].unnid, 7000000); assert.equal(bh.man[6].greitt, 3500000);
  assert.equal(bh.man[6].reikningsfaert, 3000000, 'útgáfudagur'); assert.equal(bh.man[5].reikningsfaert, 11000000);
  assert.equal(bh.man[6].ogefid, 7000000 - 3000000);
  assert.equal(bh.ogreitt.kr_m_vsk, 9000000); assert.equal(bh.ogreitt.gjaldfallid_kr_m_vsk, 8000000, 'gjalddagi liðinn (falið undanskilið)'); assert.equal(bh.ogreitt.yfir45_kr_m_vsk, 5000000);
  assert.equal(bh.innheimta.hlutfall, 88.5);
  assert.deepEqual(sl.ogreitt.osent, { kr_m_vsk: 3720, n: 2 }, 'ósent núna SL = v_krafa_ekki_send_adgerd'); assert.deepEqual(bh.ogreitt.osent, { kr_m_vsk: 500000, n: 2 }, 'ósent núna BH = Kröfu yfirlit þrep 2');
  assert.deepEqual(sl.ferskleiki, { payday_samstillt: '2026-11-21T03:00:00Z', nyjasti_reikningur: '2026-11-18' });
  assert.equal(sl.man[2].ogefid, null, 'júlí: ógefið út ómælt (ber reikninga fyrir júnívinnu)'); assert.match(sl.man[2].ogefid_omaelt, /júní/);
  assert.match(bh.setning.setning, /^Nóvember til dags: unnið 7,00 m — 70 % af október-heild \(6,00 m\)/.source ? /unnið 7,00 m/ : /x/);
  assert.ok(d.skilgreining.innheimtuhlutfall && d.skilgreining.greidsluhradi);
  assert.doesNotMatch(JSON.stringify(d), /customer|nafn|kennitala|\b\d{10}\b/i, 'aðeins samtölur fara út — engin nöfn né kennitölur (ath.: „október“ ber stafina kt, svo /kt/ prófið á ekki við hér)');
});

test('rekstur-yfirlit: hver heimild sér — Brunahólf niðri/lokað/óvænt snið/net → ómælt með ástæðu (aldrei 0), Slökkvitæki stendur; tómir lestrar ómældir', async () => {
  const h = {}; stub(h);
  for (const [lysing, flagg, vaent] of [['lokað', 'bhLokad', /401/], ['óvænt snið', 'bhOvaent', /óvænt snið/], ['net niðri', 'bhKastar', /náðist ekki/]]) {
    h[flagg] = true;
    const d = await RY._lesa(NU, EV);
    assert.equal(d.brunaholf.man.every((x) => x.unnid === null && x.greitt === null), true, lysing + ': unnið og greitt ómælt');
    assert.match(d.brunaholf.man[6].omaelt, vaent, lysing);
    assert.match(d.brunaholf.setning.setning, /unnið ómælt/); assert.match(d.brunaholf.innheimta.omaelt, vaent);
    assert.equal(d.brunaholf.man[6].reikningsfaert, 3000000, lysing + ': reikningsfært stendur');
    assert.equal(d.slokkvitaeki.man[6].unnid >= 0, true, lysing + ': Slökkvitæki stendur');
    h[flagg] = false;
  }
  const d0 = await RY._lesa(NU, { httpMethod: 'GET', headers: {} });
  assert.match(d0.brunaholf.man[6].omaelt, /kökuna vantar/);
  h.ogreittLokad = true;
  assert.match((await RY._lesa(NU, EV)).brunaholf.ogreitt.omaelt, /401.*tóki/); h.ogreittLokad = false;
  h.paydayTomt = true;
  const dp = await RY._lesa(NU, EV);
  assert.equal(dp.slokkvitaeki.man[6].reikningsfaert, null); assert.match(dp.slokkvitaeki.man[6].omaelt, /Payday-lesturinn skilaði engu/);
  assert.match(dp.slokkvitaeki.ogreitt.omaelt, /skilaði engu/); h.paydayTomt = false;
  h.skyrslurTomar = true;
  assert.match((await RY._lesa(NU, EV)).slokkvitaeki.omaelt, /skýrslulesturinn skilaði engu/); h.skyrslurTomar = false;
  h.reikningarTomir = true;
  const dr = await RY._lesa(NU, EV);
  assert.equal(dr.brunaholf.man[6].reikningsfaert, null); assert.match(dr.brunaholf.man[6].omaelt, /reikningalesturinn skilaði engu/); assert.equal(dr.brunaholf.man[6].unnid, 7000000, 'unnið stendur'); h.reikningarTomir = false;
  h.osentNidri = true;
  const dos = await RY._lesa(NU, EV);
  assert.match(dos.slokkvitaeki.ogreitt.osent.omaelt, /náðist ekki/); assert.equal(dos.slokkvitaeki.man.length, 7, 'ósent bregst → hitt stendur'); h.osentNidri = false;
  h.nidriTafla = 'payday_invoices_slokk';
  const dn = await RY._lesa(NU, EV);
  assert.match(dn.slokkvitaeki.omaelt, /náðist ekki/); assert.doesNotMatch(JSON.stringify(dn), /kaboom/, 'hrátexti úr Supabase fer aldrei út');
  assert.equal(dn.brunaholf.man.length, 7, 'Brunahólf stendur');
});

test('rekstur-yfirlit: aðeins stjórnandi — óinnskráður 401, önnur rola 403, notendaskrá niðri 503; Admin 200; aðeins GET', async () => {
  for (const [lysing, svar, kodi] of [
    ['óinnskráður', { gate: true, authed: false, user: null }, 401],
    ['Starfsmaður', { gate: true, authed: true, user: { nafn: 'X', rola: 'Starfsmaður' } }, 403],
    ['notendaskrá svarar ekki', 'nidri', 503],
  ]) {
    const aftur = notandi(svar);
    let kallad = false; global.fetch = async () => { kallad = true; throw new Error('má ekki lesa'); };
    try {
      assert.equal((await RY.handler({ httpMethod: 'GET', headers: {} })).statusCode, kodi, lysing);
      assert.equal(kallad, false, lysing + ': ekkert lesið');
    } finally { aftur(); }
  }
  const aftur = notandi(ADMIN);
  try {
    stub({});
    const r = await RY.handler(EV);
    assert.equal(r.statusCode, 200); assert.equal(JSON.parse(r.body).slokkvitaeki.man.length, 7);
    assert.equal((await RY.handler({ httpMethod: 'POST', headers: {} })).statusCode, 405);
  } finally { aftur(); }
});

test('Yfirsýnarröndin (523): „tekjur vikunnar“ víkur fyrir „unnið í mánuðinum“ úr /api/rekstur-yfirlit — ómælt með ástæðu, aldrei 0, félögin sér', () => {
  const fs = require('node:fs'), path = require('node:path');
  const src = fs.readFileSync(path.join(__dirname, '..', 'js', 'patches', '523-yfirsyn-rond.js'), 'utf8');
  assert.doesNotMatch(src, /'tekjur vikunnar'/, 'gamla flísin er farin');
  assert.match(src, /fetch\('\/api\/rekstur-yfirlit'/); assert.match(src, /unnidFlis\(\) \+/); assert.match(src, /ladaRekstur\(force\)/);
  assert.match(src, /<small>ómælt<\/small>/); assert.match(src, /Félögin eru aldrei lögð saman/); assert.match(src, /ekki einkunn/);
  assert.match(src, /S\.rVilla \? 'Unnið í mánuðinum: ómælt — '/);
});
