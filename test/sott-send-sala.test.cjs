// Próf: afhending (121 Sótt ✓) á sölu sem er KOMIN Í PAYDAY (17.11.2026, Verkefnalisti 60d00882 · Óðinn #33).
// Keyrsla: node --test test/sott-send-sala.test.cjs
//
// AF HVERJU: leið A í finalizePickup skrifaði nýjar línur og upphæðir yfir sölu sem var þegar farin í Payday
// (krafa_sent_at / dk_invoice_id / invoiced_at). Payday-reikningurinn stóð óbreyttur — viðbótin rukkaðist aldrei
// (fjórar sölur, mælt 13.09). Það sem má aldrei bila:
//   1. send sala: línur, samtals, upphaed_an_vsk, vsk_upphaed, afslattur, paid_at og greitt_med eru ALDREI skrifuð —
//      aðeins athugasemd bætist við (reikningur er aldrei leiðréttur né kreditfærður sjálfkrafa);
//   2. viðbót fer á NÝJA sölu án num (set_reikningur_num gefur nýtt R-númer) með aðeins viðbótarlínunum;
//   3. ósend sala (drög / final án kröfu) fer leið A eins og áður.
// Gögnin hér eru tilbúin (engin raunveruleg nöfn, kennitölur eða upphæðir — repóið er opið).
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const SRC = fs.readFileSync(path.join(__dirname, '..', 'js', 'patches', '121-pickup-checkout.js'), 'utf8');
// Heimildin um „komin í Payday" er 142 (SaleEditor.erIPayday) — prófið notar RAUNVERULEGA fallið þaðan.
const S142 = fs.readFileSync(path.join(__dirname, '..', 'js', 'patches', '142-sale-editor.js'), 'utf8');
const ER_I_PAYDAY = (() => { const m = /function erIPayday\(sale\) \{[^\n]*\}/.exec(S142); assert.ok(m, '142 skilgreinir erIPayday'); const c = {}; vm.runInNewContext(m[0] + '; this.f = erIPayday;', c); return c.f; })();

// Hermdur Supabase: hver keðja (from → update/insert → eq/in/select/single) er skráð og leysist með { error: null }.
function hermdurSB() {
  const kollud = [];
  const SB = {
    from(tafla) {
      const k = { tafla, adgerd: null, gogn: null, sia: [] };
      kollud.push(k);
      const kedja = {
        update(g) { k.adgerd = 'update'; k.gogn = g; return kedja; },
        insert(g) { k.adgerd = 'insert'; k.gogn = g; return kedja; },
        select() { if (!k.adgerd) k.adgerd = 'select'; return kedja; },
        eq(a, b) { k.sia.push([a, b]); return kedja; },
        in(a, b) { k.sia.push([a, b]); return kedja; },
        single() { return kedja; },
        maybeSingle() { return kedja; },
        then(res, rej) { return Promise.resolve({ error: null, data: k.adgerd === 'insert' ? { id: 999, ...k.gogn, num: 'R-009999' } : null }).then(res, rej); },
      };
      return kedja;
    },
  };
  return { SB, kollud };
}

function hlada(SB, an142) {
  const win = { DB: { sb: SB, cache: { jobs: [] } } };
  if (!an142) win.SaleEditor = { erIPayday: ER_I_PAYDAY };
  win.window = win;
  vm.runInNewContext(SRC, {
    window: win, DB: win.DB, document: { querySelector() { return null; }, getElementById() { return null; }, addEventListener() {} },
    console: { log() {}, warn() {}, error() {} }, setTimeout() {}, clearTimeout() {}, alert() {},
  }, { filename: '121-pickup-checkout.js' });
  return win.PickupCheckout._sendSala;
}

const SEND = { id: 41, num: 'R-000041', status: 'final', krafa_sent_at: '2026-11-01T10:00:00Z', customer_nafn: 'Prófun ehf', customer_id: 7,
  linur: [{ desc: 'Yfirferð', qty: 2, unit_price_ex_vat: 1000, vsk_pct: 24 }], samtals: 2480, upphaed_an_vsk: 2000, vsk_upphaed: 480, afslattur: 0, athugasemdir: 'upphafleg' };
const JOB = { num: 'R-000041-V1', customer: 'Prófun ehf' };
const UNITS = [{ checked: true, unit: { id: 1, serial: 'A1' } }, { checked: false, unit: { id: 2, serial: 'A2' } }];
const EXTRA = [{ name: 'Nýtt 6 kg tæki', qty: 1, unit_price_ex_vat: 10000, vsk_pct: 24 }];
const BANNAD = ['linur', 'samtals', 'upphaed_an_vsk', 'vsk_upphaed', 'afslattur', 'paid_at', 'greitt_med', 'status', 'customer_id', 'customer_nafn'];

test('erSendSala: krafa_sent_at, dk_invoice_id eða invoiced_at læsir — drög og final án kröfu ekki', () => {
  const { SB } = hermdurSB(); const S = hlada(SB);
  assert.equal(S.erSendSala({ id: 1, krafa_sent_at: 'x' }), true);
  assert.equal(S.erSendSala({ id: 1, dk_invoice_id: 5 }), true);
  assert.equal(S.erSendSala({ id: 1, invoiced_at: 'x' }), true);
  assert.equal(S.erSendSala({ id: 1, status: 'final' }), false);
  assert.equal(S.erSendSala({ id: 1, status: 'drog' }), false);
  assert.equal(S.erSendSala(null), false);
  assert.match(S142, /isDraft, isLocked, erIPayday,/, '142 flytur erIPayday út á window.SaleEditor');
  assert.doesNotMatch(SRC, /krafa_sent_at|dk_invoice_id/, '121 endurreiknar ekki merkin — les 142 (audit-ein-heimild-krofur)');
});

test('finalizePickup án 142 (óvíst hvort salan er send): stöðvar með skýringu og skrifar ekkert á sölur', async () => {
  const { SB, kollud } = hermdurSB(); const S = hlada(SB, true);
  assert.equal(S.erSendSala(SEND), null);
  await assert.rejects(() => S.finalizePickup(JOB, SEND, UNITS, EXTRA, 'kort', null, null, 0, 0, '', false), /Söluritillinn er ekki hlaðinn/);
  assert.equal(kollud.filter((k) => k.tafla === 'solur').length, 0);
});

test('vidbotarSala: aðeins viðbótarlínur, afsláttur afhendingar á viðbótina eina, vsk tekur afrúnun', () => {
  const { SB } = hermdurSB(); const S = hlada(SB);
  const v = S.vidbotarSala(EXTRA, 10, 0);
  assert.equal(v.linur.length, 1);
  assert.equal(v.afslattur, 1240);
  assert.equal(v.samtals, 11160);
  assert.equal(v.upphaed_an_vsk + v.vsk_upphaed, v.samtals);
  assert.equal(S.vidbotarSala(EXTRA, 0, 999999).samtals, 0, 'föst kr klemmd við viðbótina');
});

test('finalizePickup á SENDA sölu: línum/upphæðum hennar aldrei breytt; viðbót á nýja sölu án num; tæki merkt', async () => {
  const { SB, kollud } = hermdurSB(); const S = hlada(SB);
  await S.finalizePickup(JOB, SEND, UNITS, EXTRA, 'kort', null, null, 0, 0, '', false);
  const solur = kollud.filter((k) => k.tafla === 'solur');
  const upd = solur.filter((k) => k.adgerd === 'update');
  assert.equal(upd.length, 1, 'ein uppfærsla á sendu söluna');
  assert.deepEqual(Object.keys(upd[0].gogn), ['athugasemdir'], 'aðeins athugasemd — ekkert annað');
  assert.deepEqual(upd[0].sia, [['id', 41]]);
  for (const k of BANNAD) assert.ok(!(k in upd[0].gogn), k + ' má ekki skrifast á senda sölu');
  assert.match(upd[0].gogn.athugasemdir, /^upphafleg/);
  assert.match(upd[0].gogn.athugasemdir, /þegar komin í Payday/);
  assert.match(upd[0].gogn.athugasemdir, /1 tæki fóru ekki út — kredit er ákvörðun Agnars/);
  const ins = solur.filter((k) => k.adgerd === 'insert');
  assert.equal(ins.length, 1, 'viðbótin fer á nýja sölu');
  assert.ok(!('num' in ins[0].gogn), 'ekkert num → nýtt R-númer úr set_reikningur_num (ekki sama R-númer)');
  assert.equal(ins[0].gogn.linur.length, 1); assert.equal(ins[0].gogn.linur[0].desc, 'Nýtt 6 kg tæki');
  assert.equal(ins[0].gogn.samtals, 12400);
  assert.equal(ins[0].gogn.customer_id, 7);
  assert.equal(ins[0].gogn.greitt_med, 'kort'); assert.ok(ins[0].gogn.paid_at, 'kort → greitt núna');
  assert.match(ins[0].gogn.athugasemdir, /Viðbót við afhendingu á R-000041/);
  const vl = kollud.filter((k) => k.tafla === 'verklidur');
  assert.deepEqual(vl.map((k) => k.gogn.status), ['done', 'broken'], 'tækin merkt eins og áður');
});

test('finalizePickup á SENDA sölu án viðbótar: engin ný sala; reikningur → viðbót ógreidd', async () => {
  const a = hermdurSB(); const S = hlada(a.SB);
  await S.finalizePickup(JOB, { ...SEND, dk_invoice_id: 12, krafa_sent_at: null }, UNITS.map((u) => ({ ...u, checked: true })), [], 'reikningur', null, null, 0, 0, '', false);
  assert.equal(a.kollud.filter((k) => k.tafla === 'solur' && k.adgerd === 'insert').length, 0);
  const b = hermdurSB(); const S2 = hlada(b.SB);
  await S2.finalizePickup(JOB, SEND, UNITS, EXTRA, 'reikningur', null, null, 0, 0, '', false);
  const ins = b.kollud.find((k) => k.tafla === 'solur' && k.adgerd === 'insert');
  assert.equal(ins.gogn.paid_at, null); assert.equal(ins.gogn.greitt_med, 'reikningur');
});

test('finalizePickup á ÓSENDRI sölu: leið A óbreytt (línur, samtals og status skrifuð á sömu sölu, engin ný sala)', async () => {
  const { SB, kollud } = hermdurSB(); const S = hlada(SB);
  const drog = { ...SEND, krafa_sent_at: null, status: 'drog' };
  await S.finalizePickup(JOB, drog, UNITS, EXTRA, 'kort', null, null, 0, 0, '', false);
  const upd = kollud.filter((k) => k.tafla === 'solur' && k.adgerd === 'update');
  assert.equal(upd.length, 1);
  assert.equal(upd[0].gogn.status, 'final');
  assert.equal(upd[0].gogn.linur.length, 2, 'ein upprunalína (1 af 2 tækjum) + viðbót');
  assert.equal(kollud.filter((k) => k.tafla === 'solur' && k.adgerd === 'insert').length, 0);
});

test('afhendingarglugginn varar við sendri sölu og sýnir aðeins viðbótina til rukkunar', () => {
  const i = SRC.indexOf('function renderTotals()');
  const kafli = SRC.slice(i, i + 2500);
  assert.match(kafli, /erSendSala\(sale\)/);
  assert.match(kafli, /rukkaðu aðeins/);
});
