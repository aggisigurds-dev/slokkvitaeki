// Próf á „✏️ Leiðrétta" í sölu-ritlinum (142, 16.11.2026). Keyrsla: node --test test/sala-leidretting.test.cjs
//
// AF HVERJU: lokaðan (sendan) reikning var aðeins hægt að leiðrétta með kreditfærslu OG heilli nýrri úttekt. Takkinn býr
// til ný DRÖG með sömu línum. Það sem má aldrei bila:
//   1. afritið er ALLTAF drög — aldrei final, aldrei merkt sent eða greitt (annars færi tvöföld krafa af stað);
//   2. ekkert úr sendingarsögu gamla reikningsins (krafa, Payday-auðkenni, greiðsla, númer) fylgir með;
//   3. takkinn býðst aðeins á LOKUÐUM reikningi — ósendan reikning má breyta beint og drög eru þegar opin;
//   4. línurnar eru afrit, ekki sama fylkið (breyting á drögunum má ekki breyta þeim lokaða í minni).
// Gögnin hér eru tilbúin (engin raunveruleg nöfn, kennitölur eða upphæðir — repóið er opið).
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const SKRA = path.join(__dirname, '..', 'js', 'patches', '142-sale-editor.js');
const win = {};
vm.runInNewContext(fs.readFileSync(SKRA, 'utf8'), {
  window: win, console: { log() {}, warn() {}, error() {} },
  document: { addEventListener() {}, removeEventListener() {}, getElementById() { return null; }, querySelector() { return null; } },
  setTimeout, clearTimeout
}, { filename: SKRA });
const SE = win.SaleEditor;

const sendur = (yfir) => Object.assign({
  id: 501, num: 'R-000501', status: 'final', is_credit: false, greitt_med: 'reikningur', source: 'uttekt',
  customer_nafn: 'Prófunarfélagið ehf.', customer_kt: '0101010101', customer_id: 11, customer_base_id: 22, starfsmadur: 'Prófari',
  linur: [{ desc: 'Yfirferð · Duft 6 kg', qty: 2, unit_price_ex_vat: 1000, vsk_pct: 24, type: 'service', _ny: true }, { desc: 'Skýrslugerð', qty: 1, unit_price_ex_vat: 500, vsk_pct: 24 }],
  upphaed_an_vsk: 2500, vsk_upphaed: 600, afslattur: 0, samtals: 3100, athugasemdir: 'Beiðni nr: 7',
  invoiced_at: '2026-01-05T10:00:00Z', krafa_sent_at: '2026-01-05T10:00:00Z', dk_invoice_id: 'aaaa-bbbb', paid_at: null, krafa_note: ''
}, yfir || {});

test('takkinn býðst aðeins á lokuðum reikningi', () => {
  assert.strictEqual(SE._maLeidretta(sendur()), true, 'sendur, ógreiddur reikningur');
  assert.strictEqual(SE._maLeidretta(sendur({ paid_at: '2026-01-20T10:00:00Z' })), true, 'sendur og greiddur reikningur');
  assert.strictEqual(SE._maLeidretta(sendur({ invoiced_at: null, krafa_sent_at: null, dk_invoice_id: null })), false, 'ósendan reikning má breyta beint — enginn takki');
  assert.strictEqual(SE._isUnsentFinal(sendur({ invoiced_at: null, krafa_sent_at: null, dk_invoice_id: null })), true);
  assert.strictEqual(SE._maLeidretta(sendur({ status: 'drog' })), false, 'drög eru þegar opin');
  assert.strictEqual(SE._maLeidretta(sendur({ is_credit: true })), false, 'kreditreikningur verður ekki leiðréttur');
  assert.strictEqual(SE._maLeidretta(sendur({ greitt_med: 'kort', paid_at: '2026-01-05T10:00:00Z' })), false, 'kortasala er ekki reikningur');
  assert.strictEqual(SE._maLeidretta(sendur({ num: '' })), false);
  assert.strictEqual(SE._maLeidretta(null), false);
});

test('afritið er alltaf drög og ber ekkert úr sendingarsögunni', () => {
  const s = sendur();
  const r = SE._leidrettingarRod(s);
  assert.strictEqual(r.status, 'drog');
  assert.strictEqual(r.greitt_med, 'reikningur');
  for (const k of ['id', 'num', 'paid_at', 'krafa_sent_at', 'invoiced_at', 'dk_invoice_id', 'is_credit', 'credit_of', 'kredit_a', 'created_at', 'hidden', 'invoice_batch_id']) {
    assert.ok(!(k in r), 'reiturinn ' + k + ' má ekki fylgja í afritið');
  }
  // Sami kúnni, sömu línur og sömu upphæðir — hann breytir sjálfur því sem þarf.
  assert.strictEqual(r.customer_nafn, s.customer_nafn);
  assert.strictEqual(r.customer_kt, s.customer_kt);
  assert.strictEqual(r.customer_id, 11);
  assert.strictEqual(r.customer_base_id, 22);
  assert.strictEqual(r.source, 'uttekt');
  assert.strictEqual(r.samtals, 3100);
  assert.strictEqual(r.upphaed_an_vsk, 2500);
  assert.strictEqual(r.vsk_upphaed, 600);
  assert.strictEqual(r.athugasemdir, 'Beiðni nr: 7');
});

test('athugasemdin segir hvaða reikningur er leiðréttur og að þetta er ekki ný úttekt', () => {
  const r = SE._leidrettingarRod(sendur());
  const m = /Leiðrétting á ([A-Z]{1,2}-?\d{3,})/.exec(r.krafa_note);
  assert.ok(m, 'borðinn á drögunum les númerið úr krafa_note');
  assert.strictEqual(m[1], 'R-000501');
  assert.match(r.krafa_note, /ekki ný úttekt/);
});

test('línurnar eru afrit: breyting á drögunum breytir ekki lokaða reikningnum, og innri merki fylgja ekki', () => {
  const s = sendur();
  const r = SE._leidrettingarRod(s);
  assert.strictEqual(r.linur.length, 2);
  assert.notStrictEqual(r.linur, s.linur);
  r.linur[0].qty = 99;
  assert.strictEqual(s.linur[0].qty, 2, 'upprunalega línan er ósnert');
  assert.ok(!('_ny' in r.linur[0]), 'innra merkið _ny má ekki vistast (stofnaði annars verkbeiðni aftur)');
  assert.strictEqual(r.linur[1].unit_price_ex_vat, 500, 'verðin eru þau sömu og á upprunalega reikningnum');
});

test('tómur eða gallaður reikningur fellir ekki fallið', () => {
  const r = SE._leidrettingarRod({ num: 'R-000777', linur: null });
  assert.strictEqual(r.status, 'drog');
  assert.strictEqual(Array.isArray(r.linur) ? r.linur.length : 0, 0);
  assert.strictEqual(r.customer_kt, null);
  assert.strictEqual(r.afslattur, 0);
});
