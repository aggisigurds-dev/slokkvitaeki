// Próf: rofinn Yfirferð | Hleðsla | Ónýtt í afhendingunni (121 Sótt ✓) og pörunin á bak við hann (518 ThjSkipti).
// Keyrsla: node --test test/sott-thjonusturofi.test.cjs
//
// AF HVERJU (Agnar 17.11.2026): „þegar fólk er að sækja tækin í sótt, þá verð ég að geta svissað á milli hvort það
// hafi verið hlaðið eða yfirfarið eða ónýtt". Það sem má aldrei bila:
//   1. pörunin tæki ↔ vara fer eftir tegund + stærð + þjónustu, EKKI heiti — vörulistinn skrifar sama tæki á þrjá vegu
//      („Léttvatnstækis 6L. hleðsla" / „Léttvatnstæki 6L. yfirferð" / „CO₂ 5 kg. yfirferd");
//   2. tæki sem fer ekki út (Ónýtt) dregur SÍNA línu frá, ekki magnmestu línuna;
//   3. forskoðun = vistun: finalizePickup notar sama frádráttarfall og samtölurnar;
//   4. þjónustan sem valin var fylgir tækinu (verklidur.service) og stendur í athugasemd sölunnar;
//   5. án 518 (eða finnist línan ekki) gildir gamla reglan óbreytt.
// Heiti hér eru vöruheiti úr vörulistanum; verðin eru tilbúin (repóið er opið — engin raunveruleg nöfn eða kennitölur).
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const lesa = (f) => fs.readFileSync(path.join(__dirname, '..', 'js', 'patches', f), 'utf8');
const S121 = lesa('121-pickup-checkout.js');
const S518 = lesa('518-thj-skipti.js');

const VORUR = [
  { id: 1, nafn: 'Duft 6 kg. ABC hleðsla', flokkur: 'Þjónusta', virkt: true, verd_an_vsk: 8000, vsk_prosenta: 24 },
  { id: 2, nafn: 'Duft 6 kg. ABC yfirferð', flokkur: 'Þjónusta', virkt: true, verd_an_vsk: 4000, vsk_prosenta: 24 },
  { id: 3, nafn: 'Léttvatnstækis 6L. hleðsla', flokkur: 'Þjónusta', virkt: true, verd_an_vsk: 7000, vsk_prosenta: 24 },
  { id: 4, nafn: 'Léttvatnstæki 6L. yfirferð', flokkur: 'Þjónusta', virkt: true, verd_an_vsk: 3000, vsk_prosenta: 24 },
  { id: 5, nafn: 'CO₂ 5 kg. hleðsla', flokkur: 'Þjónusta', virkt: true, verd_an_vsk: 6000, vsk_prosenta: 24 },
  { id: 6, nafn: 'CO₂ 5 kg. yfirferd', flokkur: 'Þjónusta', virkt: true, verd_an_vsk: 3500, vsk_prosenta: 24 },
  { id: 7, nafn: 'CO₂ 9 kg. Áfylling', flokkur: 'Þjónusta', virkt: true, verd_an_vsk: 13000, vsk_prosenta: 24 },
  { id: 8, nafn: 'CO₂ 100 gr.', flokkur: 'Þjónusta', virkt: true, verd_an_vsk: 150, vsk_prosenta: 24 },
  { id: 9, nafn: 'Duft 6 kg. ABC Slökkvitæki', flokkur: 'Slökkvitæki', virkt: true, verd_an_vsk: 11000, vsk_prosenta: 24 },
  { id: 10, nafn: 'Duft 2 kg. ABC hleðsla', flokkur: 'Þjónusta', virkt: false, verd_an_vsk: 4000, vsk_prosenta: 24 },
];

// Hermdur Supabase: vorur skilar listanum; allt annað er skráð og leysist með { error: null }.
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
        then(res, rej) {
          const data = k.adgerd === 'select' && tafla === 'vorur' ? VORUR : (k.adgerd === 'insert' ? { id: 999, ...k.gogn } : null);
          return Promise.resolve({ error: null, data }).then(res, rej);
        },
      };
      return kedja;
    },
  };
  return { SB, kollud };
}

function hlada(SB, an518) {
  const win = { DB: { sb: SB, cache: { jobs: [] } }, SaleEditor: { erIPayday: () => false } };
  win.window = win;
  const ctx = vm.createContext({
    window: win, DB: win.DB, document: { querySelector() { return null; }, getElementById() { return null; }, addEventListener() {} },
    console: { log() {}, warn() {}, error() {} }, setTimeout() {}, clearTimeout() {}, alert() {},
  });
  if (!an518) vm.runInContext(S518, ctx, { filename: '518-thj-skipti.js' });
  vm.runInContext(S121, ctx, { filename: '121-pickup-checkout.js' });
  return { T: win.ThjSkipti, P: win.PickupCheckout };
}

const lina = (desc, qty, verd, id) => ({ desc, qty, unit_price_ex_vat: verd, vsk_pct: 24, product_id: id, type: 'service' });
const taeki = (id, service, type, size, checked, nafn) => ({ idx: id, jobId: 1, checked: checked !== false, nafn: nafn == null ? null : nafn, unit: { id, serial: 'T' + id, service, type, size, status: 'done' } });
const m = (x) => JSON.parse(JSON.stringify(x));   // úr vm-samhengi í venjuleg gildi (deepEqual ber saman frumgerðir)

test('lysa: tegund + stærð + þjónusta lesin úr ósamkvæmum heitum', () => {
  const { T } = hlada(hermdurSB().SB);
  assert.deepEqual(m(T.lysa('Léttvatnstækis 6L. hleðsla')), { fl: 'lett', st: '6l', teg: 'hleðsla' });
  assert.deepEqual(m(T.lysa('Léttvatnstæki 6L. yfirferð')), { fl: 'lett', st: '6l', teg: 'yfirferð' });
  assert.deepEqual(m(T.lysa('CO₂ 5 kg. yfirferd')), { fl: 'co2', st: '5kg', teg: 'yfirferð' }, 'yfirferd án ð');
  assert.deepEqual(m(T.lysa('CO2 5 kg. hleðsla')), { fl: 'co2', st: '5kg', teg: 'hleðsla' }, 'tvisturinn í CO2 er ekki stærðin');
  assert.deepEqual(m(T.lysa('CO₂ 9 kg. Áfylling')), { fl: 'co2', st: '9kg', teg: 'hleðsla' }, 'áfylling telst hleðsla');
  assert.deepEqual(m(T.lysa('CO₂ 100 gr. × 26 (samtals)')), { fl: 'co2', st: '100g', teg: '' });
  assert.deepEqual(m(T.lysa('Slökkvitæki 9L léttvatn yfirferð')), { fl: 'lett', st: '9l', teg: 'yfirferð' });
  assert.deepEqual(m(T.lysa('Duft 6 kg. ABC hleðsla · −15% afsl.')), { fl: 'duft', st: '6kg', teg: 'hleðsla' });
});

test('lysaTaeki: eldri verkliðir bera aðeins orðið — tegund og stærð koma úr dálkunum', () => {
  const { T } = hlada(hermdurSB().SB);
  assert.deepEqual(m(T.lysaTaeki({ service: 'yfirferð', type: 'Duft ABC', size: '6 kg' })), { fl: 'duft', st: '6kg', teg: 'yfirferð' });
  assert.deepEqual(m(T.lysaTaeki({ service: 'Hleðsla + Skoðun', type: 'ABC Duft', size: '6 kg' })), { fl: 'duft', st: '6kg', teg: 'hleðsla' });
  assert.deepEqual(m(T.lysaTaeki({ service: 'Duft 6 kg. ABC hleðsla', type: 'Duft ABC', size: '6 kg' }, 'Duft 6 kg. ABC yfirferð')).teg, 'yfirferð', 'valið heiti gengur fyrir');
});

test('vara: hin þjónustan finnst þótt heitin stemmi ekki; engin vara → null; óvirkar og vörur utan Þjónustu ekki með', async () => {
  const { T } = hlada(hermdurSB().SB);
  assert.equal(T.vara(T.lysa('Duft 6 kg. ABC hleðsla'), 'yfirferð'), null, 'listinn ósóttur → null');
  await T.saekja();
  assert.equal(T.listi().length, 8, 'aðeins virkar þjónustuvörur');
  assert.equal(T.vara(T.lysa('Léttvatnstækis 6L. hleðsla'), 'yfirferð').id, 4);
  assert.equal(T.vara(T.lysa('Léttvatnstæki 6L. yfirferð'), 'hleðsla').id, 3);
  assert.equal(T.vara(T.lysa('CO₂ 5 kg. hleðsla'), 'yfirferð').id, 6);
  assert.equal(T.vara(T.lysaTaeki({ service: 'yfirferð', type: 'Duft ABC', size: '6 kg' }), 'hleðsla').id, 1);
  assert.equal(T.vara(T.lysa('CO₂ 9 kg. Áfylling'), 'yfirferð'), null, 'CO₂ 9 kg á enga yfirferð');
  assert.equal(T.vara(T.lysa('CO₂ 100 gr. × 26 (samtals)'), 'hleðsla'), null);
  assert.equal(T.vara(T.lysa('Duft 2 kg. ABC yfirferð'), 'hleðsla'), null, 'óvirk vara er ekki í boði');
  assert.equal(T.varaNu('yfirferð', T.lysaTaeki({ service: 'yfirferð', type: 'Duft ABC', size: '6 kg' })).id, 2);
});

test('finnaLinu + skiptaLinu: nákvæmt heiti fyrst, annars sama þrenna; magn > 1 klofnar; bakaður afsláttur fylgir', async () => {
  const { T } = hlada(hermdurSB().SB);
  await T.saekja();
  const linur = [lina('Reykskynjari', 3, 2000, 50), lina('Duft 6 kg. ABC hleðsla', 2, 8000, 1), lina('Léttvatnstækis 6L. hleðsla · −15% afsl.', 1, 5950, 3)];
  const d = T.lysaTaeki({ service: 'hleðsla', type: 'Duft ABC', size: '6 kg' });
  const i = T.finnaLinu(linur, 'hleðsla', d);
  assert.equal(i, 1, 'orðið eitt finnur línuna um þrennuna');
  const j = T.skiptaLinu(linur, i, T.vara(d, 'yfirferð'));
  assert.equal(linur.length, 4);
  assert.equal(linur[1].qty, 1, 'gamla línan heldur einni einingu');
  assert.deepEqual(m({ desc: linur[j].desc, qty: linur[j].qty, v: linur[j].unit_price_ex_vat, id: linur[j].product_id }), { desc: 'Duft 6 kg. ABC yfirferð', qty: 1, v: 4000, id: 2 });
  const k = T.finnaLinu(linur, 'Léttvatnstækis 6L. hleðsla', T.lysa('Léttvatnstækis 6L. hleðsla'));
  const n = T.skiptaLinu(linur, k, T.vara(T.lysa('Léttvatnstækis 6L. hleðsla'), 'yfirferð'));
  assert.equal(linur[n].desc, 'Léttvatnstæki 6L. yfirferð · −15% afsl.');
  assert.equal(linur[n].unit_price_ex_vat, 2550, '3.000 − 15 %');
  assert.equal(T.finnaLinu([lina('Duft 6 kg. ABC hleðsla', 0, 8000, 1)], 'Duft 6 kg. ABC hleðsla', d), -1, 'lína með magn 0 er ekki í boði');
});

test('linurAnOafhentra: ónýtt tæki dregur SÍNA línu frá — ekki magnmestu línuna, ekki dýrari þjónustuna', () => {
  const { P } = hlada(hermdurSB().SB);
  const linur = [lina('Reykskynjari', 3, 2000, 50), lina('Duft 6 kg. ABC hleðsla', 1, 8000, 1), lina('Duft 6 kg. ABC yfirferð', 1, 4000, 2)];
  const us = [taeki(1, 'Duft 6 kg. ABC hleðsla', 'Duft ABC', '6 kg'), taeki(2, 'Duft 6 kg. ABC yfirferð', 'Duft ABC', '6 kg', false)];
  const w = P._thj.linurAnOafhentra(linur, us, []);
  assert.deepEqual(m(w.map((l) => l.qty)), [3, 1, 0], 'yfirferðin fór, skynjararnir og hleðslan standa');
  assert.deepEqual(m(linur.map((l) => l.qty)), [3, 1, 1], 'upprunalínunum er ekki breytt');
});

test('linurAnOafhentra: finnist línan ekki gildir gamla reglan (magnmesta línan fyrst)', () => {
  const { P } = hlada(hermdurSB().SB);
  const linur = [lina('Þjónusta A', 1, 1000), lina('Þjónusta B', 4, 1000)];
  const us = [taeki(1, 'eitthvað', '', ''), taeki(2, 'annað', '', '', false), taeki(3, 'þriðja', '', '', false)];
  assert.deepEqual(m(P._thj.linurAnOafhentra(linur, us, []).map((l) => l.qty)), [1, 2]);
});

test('linurAnOafhentra án 518: nákvæmlega gamla reglan', () => {
  const { P, T } = hlada(hermdurSB().SB, true);
  assert.equal(T, undefined);
  const linur = [lina('Duft 6 kg. ABC hleðsla', 1, 8000, 1), lina('Reykskynjari', 3, 2000, 50)];
  const us = [taeki(1, 'Duft 6 kg. ABC hleðsla', 'Duft ABC', '6 kg', false)];
  assert.deepEqual(m(P._thj.linurAnOafhentra(linur, us, []).map((l) => l.qty)), [1, 2]);
});

test('tæki sem ber verðið í viðbótinni (bætt við á verkstæði): Ónýtt tekur viðbótina af og enga sölulínu', () => {
  const { P } = hlada(hermdurSB().SB);
  const part = { nafn: 'Duft 6 kg. ABC yfirferð', verd_an_vsk: 4000, vsk_prosenta: 24, qty: 1 };
  const u2 = taeki(2, 'Duft 6 kg. ABC yfirferð', 'Duft ABC', '6 kg', false);
  u2.unit.parts = [part];
  assert.equal(P._thj.erThjTaekis(part, u2.unit), true);
  assert.equal(P._thj.erThjTaekis({ nafn: 'Slanga fyrir 5 kg. Kolsýrutæki' }, { service: 'CO₂ 5 kg. hleðsla', type: 'CO₂', size: '5 kg' }), false, 'varahlutur er ekki þjónusta tækisins');
  const extras = [{ name: part.nafn, qty: 1, unit_price_ex_vat: 4000, vsk_pct: 24, _fromWorkshop: true, _unitId: 2, _thj: true },
    { name: 'Þrýstimælir', qty: 1, unit_price_ex_vat: 900, vsk_pct: 24, _fromWorkshop: true, _unitId: 2, _thj: false }];
  const us = [taeki(1, 'Duft 6 kg. ABC hleðsla', 'Duft ABC', '6 kg'), u2];
  assert.deepEqual(m(P._thj.vidbotAfhent(extras, us).map((e) => e.name)), ['Þrýstimælir'], 'þjónustan dettur af, varahluturinn stendur');
  assert.deepEqual(m(P._thj.linurAnOafhentra([lina('Duft 6 kg. ABC hleðsla', 1, 8000, 1)], us, extras).map((l) => l.qty)), [1], 'engin sölulína dregin frá');
});

test('finalizePickup: skipt þjónusta og ónýtt tæki — salan, tækin og athugasemdin stemma', async () => {
  const { SB, kollud } = hermdurSB(); const { P, T } = hlada(SB);
  await T.saekja();
  const sale = { id: 7, num: 'R-000007', status: 'drog', customer_nafn: 'Prófun ehf', samtals: 26040, upphaed_an_vsk: 21000, vsk_upphaed: 5040, afslattur: 0, athugasemdir: '',
    linur: [lina('Duft 6 kg. ABC hleðsla', 2, 8000, 1), lina('Léttvatnstækis 6L. hleðsla', 1, 5000, 3)] };
  const us = [taeki(1, 'Duft 6 kg. ABC hleðsla', 'Duft ABC', '6 kg'), taeki(2, 'Duft 6 kg. ABC hleðsla', 'Duft ABC', '6 kg'), taeki(3, 'Léttvatnstækis 6L. hleðsla', 'Léttvatnstækis', '6 L')];
  // Það sem glugginn gerir við smell á „Yfirferð" á tæki 1: línan færð í minni, heitið skráð á stöðu tækisins.
  const d = T.lysaTaeki(us[0].unit);
  T.skiptaLinu(sale.linur, T.finnaLinu(sale.linur, us[0].unit.service, d), T.vara(d, 'yfirferð'));
  us[0].nafn = 'Duft 6 kg. ABC yfirferð';
  us[2].checked = false;   // Ónýtt á léttvatnstækinu
  await P._sendSala.finalizePickup({ num: 'R-000007-V1', customer: 'Prófun ehf' }, sale, us, [], 'reikningur', null, null, 0, 0, '', false);
  const upd = kollud.filter((k) => k.tafla === 'solur' && k.adgerd === 'update');
  assert.equal(upd.length, 1);
  const g = upd[0].gogn;
  assert.deepEqual(m(g.linur.map((l) => l.desc + ' ×' + l.qty)), ['Duft 6 kg. ABC hleðsla ×1', 'Duft 6 kg. ABC yfirferð ×1'], 'léttvatnið fór af, yfirferðin kom í stað annarrar hleðslunnar');
  assert.equal(g.samtals, 14880, '(8.000 + 4.000) × 1,24');
  assert.equal(g.upphaed_an_vsk + g.vsk_upphaed, g.samtals);
  assert.match(g.athugasemdir, /Þjónustu breytt við afhendingu: T1: Duft 6 kg\. ABC hleðsla → Duft 6 kg\. ABC yfirferð/);
  assert.match(g.athugasemdir, /Ekki afhent: T3/);
  const vl = kollud.filter((k) => k.tafla === 'verklidur' && k.adgerd === 'update');
  const eftir = (id) => vl.find((k) => k.sia.some((s) => s[0] === 'id' && s[1] === id)).gogn;
  assert.deepEqual(m(eftir(1)), { status: 'done', service: 'Duft 6 kg. ABC yfirferð' });
  assert.deepEqual(m(eftir(2)), { status: 'done' }, 'ósnert tæki fær aðeins stöðuna');
  assert.deepEqual(m(eftir(3)), { status: 'broken' });
  assert.equal(us[0].unit.service, 'Duft 6 kg. ABC yfirferð', 'tækjasagan (466) les nýju þjónustuna');
});

test('finalizePickup: þjónusta viðbætts tækis skipt — verðið í viðbótinni og parts tækisins fylgja', async () => {
  const { SB, kollud } = hermdurSB(); const { P } = hlada(SB);
  const sale = { id: 8, num: 'R-000008', status: 'drog', customer_nafn: 'Prófun ehf', samtals: 9920, upphaed_an_vsk: 8000, vsk_upphaed: 1920, afslattur: 0, athugasemdir: '',
    linur: [lina('Duft 6 kg. ABC hleðsla', 1, 8000, 1)] };
  const u2 = taeki(2, 'Duft 6 kg. ABC yfirferð', 'Duft ABC', '6 kg', true, 'Duft 6 kg. ABC hleðsla');
  u2.unit.parts = [{ vara_id: 2, nafn: 'Duft 6 kg. ABC yfirferð', verd_an_vsk: 4000, vsk_prosenta: 24, qty: 1 }];
  // Staðan eftir smell á „Hleðsla" í glugganum: viðbótin ber nýju vöruna.
  const extras = [{ name: 'Duft 6 kg. ABC hleðsla', qty: 1, unit_price_ex_vat: 8000, vsk_pct: 24, _fromWorkshop: true, _unitId: 2, _thj: true, _varaId: 1 }];
  await P._sendSala.finalizePickup({ num: 'R-000008-V1', customer: 'Prófun ehf' }, sale, [taeki(1, 'Duft 6 kg. ABC hleðsla', 'Duft ABC', '6 kg'), u2], extras, 'reikningur', null, null, 0, 0, '', false);
  const g = kollud.find((k) => k.tafla === 'solur' && k.adgerd === 'update').gogn;
  assert.equal(g.samtals, 19840, 'tvær hleðslur');
  const v2 = kollud.find((k) => k.tafla === 'verklidur' && k.sia.some((s) => s[1] === 2)).gogn;
  assert.equal(v2.service, 'Duft 6 kg. ABC hleðsla');
  assert.deepEqual(m(v2.parts), [{ vara_id: 1, nafn: 'Duft 6 kg. ABC hleðsla', verd_an_vsk: 8000, vsk_prosenta: 24, qty: 1 }]);
});

test('línuafsláttur á stöku línu: forskoðun og vistun baka hann inn (17.11.2026)', async () => {
  const { SB, kollud } = hermdurSB(); const { P } = hlada(SB);
  const sale = { id: 9, num: 'R-000009', status: 'drog', customer_nafn: 'Prófun ehf', samtals: 24800, upphaed_an_vsk: 20000, vsk_upphaed: 4800, afslattur: 0, athugasemdir: '',
    linur: [lina('Duft 6 kg. ABC hleðsla', 1, 10000, 1), lina('Duft 6 kg. ABC hleðsla', 1, 10000, 1)] };
  sale.linur[0].discount_pct = 20;   // það sem reiturinn í glugganum skrifar
  const us = [taeki(1, 'Duft 6 kg. ABC hleðsla', 'Duft ABC', '6 kg'), taeki(2, 'Duft 6 kg. ABC hleðsla', 'Duft ABC', '6 kg')];
  await P._sendSala.finalizePickup({ num: 'R-000009-V1', customer: 'Prófun ehf' }, sale, us, [], 'reikningur', null, null, 0, 0, '', false);
  const g = kollud.find((k) => k.tafla === 'solur' && k.adgerd === 'update').gogn;
  assert.deepEqual(m(g.linur.map((l) => l.desc + ' @' + l.unit_price_ex_vat)), ['Duft 6 kg. ABC hleðsla · −20% afsl. @8000', 'Duft 6 kg. ABC hleðsla @10000']);
  assert.equal(g.samtals, 22320, '(8.000 + 10.000) × 1,24');
  assert.equal(g.upphaed_an_vsk + g.vsk_upphaed, g.samtals);
  assert.ok(g.linur.every((l) => l.discount_pct === undefined), 'afslátturinn er bakaður, ekki geymdur tvisvar');
});
