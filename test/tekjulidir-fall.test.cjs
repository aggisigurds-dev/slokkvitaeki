// Próf á fallinu tekjulidir.cjs (fasi 3, 22.11.2026): hlið, lestur, tómur lestur = 503 með ástæðu, engin nöfn. Keyrsla: timeout 90 node --test test/tekjulidir-fall.test.cjs
// Gögnin eru tilbúin (engin raunveruleg nöfn, kennitölur eða upphæðir — repóið er opið).
'use strict';
const test = require('node:test');
const assert = require('node:assert');
process.env.SUPABASE_URL = 'https://dummy.supabase.co'; process.env.SUPABASE_SERVICE_ROLE_KEY = 'x';
const TF = require('../netlify/functions/tekjulidir.cjs');

function notandi(svar) {
  const HUB = require('../netlify/functions/hub-adgangar.cjs');
  const gamalt = HUB.handler;
  HUB.handler = async () => (svar === 'nidri' ? { statusCode: 500, body: '{}' } : { statusCode: 200, body: JSON.stringify(svar) });
  return () => { HUB.handler = gamalt; };
}
const ADMIN = { gate: true, authed: true, user: { nafn: 'Prófari', rola: 'Admin' } };
const NU = new Date('2026-11-22T10:00:00Z');

function stub(h) {
  global.fetch = async (url, init = {}) => {
    const u = new URL(url);
    const svar = (d, ok = true, status = 200) => ({ ok, status, text: async () => (d == null ? '' : JSON.stringify(d)), json: async () => d });
    const t = u.pathname.split('/').pop(), q = u.searchParams;
    if (Number(q.get('offset') || 0) > 0) return svar([]);
    if (h.nidriTafla === t) return svar({ message: 'kaboom-leyndarmál' }, false, 500);
    h.signal = h.signal || !!init.signal;
    if (t === 'solur' && q.get('status') === 'eq.void') return svar([{ id: 2 }]);
    if (t === 'solur' && (q.get('id') || '').startsWith('in.')) { h.frumsolurSott = true; return svar([]); }
    if (t === 'solur') return svar([
      { id: 1, num: 'R-000001', status: 'final', vidskiptategund: 'bud', credit_of: null, upphaed_an_vsk: 1500, created_at: '2026-10-10T00:00:00Z', linur: [{ desc: 'Yfirferð · A', qty: 4, unit_price_ex_vat: 250 }, { desc: 'Akstur', qty: 1, unit_price_ex_vat: 1000 }] },
      { id: 3, num: 'R-000003', status: 'final', vidskiptategund: 'bud', credit_of: 1, upphaed_an_vsk: -300, created_at: '2026-11-03T00:00:00Z', linur: [{ desc: 'Yfirferð · A', qty: -1, unit_price_ex_vat: 250 }] },
    ]);
    if (t === 'customer_documents') return svar([{ id: 1, doc_type: 'uttektarskyrsla', doc_date: '2026-10-03', customer_base_id: 7, fyrirtaeki_id: 70, is_duplicate: false, notes: 'x' }]);
    if (t === 'verkbeidnir') return svar([{ id: 51, num: 'R-009999-V1', status: 'collected', verd: 1240, klart_at: null, eytt_at: null }]);
    if (t === 'verklidur') return svar([{ job_id: 51, service: 'Duft 2 kg. ABC hleðsla', status: 'done', eytt_at: null }]);
    if (t === 'vorur') return svar(h.vorurTomar ? [] : [{ id: 1, nafn: 'Léttvatn', flokkur: 'Slökkvitæki', virkt: true }]);
    throw new Error('óvænt slóð ' + url);
  };
}

test('tekjulidir: flokkar × mánuðir, kredit á dag frumsölu, heildin = solur-heildin, skilgreining fylgir, engin nöfn', async () => {
  const h = {}; stub(h);
  const d = await TF._lesa(NU);
  assert.equal(h.signal, true, '7 s tímamörk fylgja lestrinum'); assert.equal(h.frumsolurSott === undefined || h.frumsolurSott === true, true);
  assert.deepEqual(d.manudir, ['2026-10']);
  const f01 = d.flokkar.find((f) => f.id === '01'), f08 = d.flokkar.find((f) => f.id === '08');
  assert.equal(f01.man['2026-10'], 750 - 300, 'yfirferð 750 í október; nótan (−300) á dag frumsölunnar (október), ekki nóvember');
  assert.equal(f08.man['2026-10'], 750); assert.equal(f01.stk, 3);
  assert.equal(d.samtals, 1200); assert.equal(d.heild_solur, 1200); assert.equal(d.stemmir, true);
  assert.equal(d.flokkar.length, 15); assert.equal(d.hopar.length, 6); assert.equal(d.solutegundir.length, 4);
  assert.ok(d.skilgreining.fyrirvarar);
  assert.doesNotMatch(JSON.stringify(d), /customer|nafn|kennitala|leyndarmál/i);
});

test('tekjulidir: aðeins stjórnandi — óinnskráður 401, önnur rola 403, notendaskrá niðri 503, aðeins GET; tómur vörulisti og bilun → 503 með ástæðu, aldrei tölur', async () => {
  for (const [lysing, svar, kodi] of [
    ['óinnskráður', { gate: true, authed: false, user: null }, 401],
    ['Starfsmaður', { gate: true, authed: true, user: { nafn: 'X', rola: 'Starfsmaður' } }, 403],
    ['notendaskrá svarar ekki', 'nidri', 503],
  ]) {
    const aftur = notandi(svar);
    let kallad = false; global.fetch = async () => { kallad = true; throw new Error('má ekki lesa'); };
    try { assert.equal((await TF.handler({ httpMethod: 'GET', headers: {} })).statusCode, kodi, lysing); assert.equal(kallad, false, lysing + ': ekkert lesið'); } finally { aftur(); }
  }
  const aftur = notandi(ADMIN);
  try {
    const h = {}; stub(h);
    const r = await TF.handler({ httpMethod: 'GET', headers: {} });
    assert.equal(r.statusCode, 200); assert.equal(JSON.parse(r.body).flokkar.length, 15);
    assert.equal((await TF.handler({ httpMethod: 'POST', headers: {} })).statusCode, 405);
    h.vorurTomar = true;
    const r2 = await TF.handler({ httpMethod: 'GET', headers: {} });
    assert.equal(r2.statusCode, 503); assert.match(JSON.parse(r2.body).error, /vörulistalesturinn skilaði engu/); assert.equal(JSON.parse(r2.body).flokkar, undefined);
    h.vorurTomar = false; h.nidriTafla = 'solur';
    const r3 = await TF.handler({ httpMethod: 'GET', headers: {} });
    assert.equal(r3.statusCode, 503); assert.doesNotMatch(r3.body, /kaboom|leyndarmál/, 'hrátexti úr Supabase fer aldrei út');
  } finally { aftur(); }
});
