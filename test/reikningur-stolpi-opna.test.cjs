// 👁 / 🧾 á reikningi sem er EKKI í Sölu (Stólpi — gamla kerfið, fyrri eigandi). Keyrsla: node --test test/reikningur-stolpi-opna.test.cjs
//
// Agnar 17.11.2026 (skjámynd af hótelstað): veljarinn „hvaða reikningur?" stakk upp á Stólpa-reikningi og 👁 svaraði
// „Gat ekki opnað reikninginn: salan R-109991 fannst ekki í Sölu". Reglan: skjalið ræðst af því sem smellt er á —
//   1. Stólpa-reikningur MEÐ PDF í skjalasafninu (customer_documents) → PDF-ið opnast;
//   2. Stólpa-reikningur ÁN PDF → sagt skýrt: „úr Stólpa … PDF fannst ekki í skjalasafninu", með dags./upphæð — aldrei „fannst ekki í Sölu";
//   3. reikningur sem er hvorki í Sölu né með PDF → sagt það;
//   4. sala sem er til → opnast úr sölunni eins og áður.
// Föllin eru tekin beint úr js/patches/199-doc-year-grid.js (sami texti og vafrinn keyrir) og keyrð í vm með gervigögnum.
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const SRC = fs.readFileSync(path.join(__dirname, '..', 'js', 'patches', '199-doc-year-grid.js'), 'utf8');
function bútur() {
  const lok = SRC.indexOf('  function openInvoiceOverlay(');
  const nyr = SRC.indexOf('  var erStolpaNr');
  const upph = nyr >= 0 ? nyr : SRC.indexOf('  async function openInvFromSale(');
  assert.ok(upph > 0 && lok > upph, 'opnunarföllin fundust í 199');
  return SRC.slice(upph, lok);
}
function keyra({ solur = [], skjol = [] }) {
  const atburdir = { alert: [], open: [], yfirlag: [] };
  const fra = (rows) => {
    const st = { sia: [] };
    const b = { select: () => b, limit: () => b, eq: (k, v) => { st.sia.push((r) => String(r[k]) === String(v)); return b; },
      then: (res, rej) => Promise.resolve({ data: rows.filter((r) => st.sia.every((f) => f(r))), error: null }).then(res, rej) };
    return b;
  };
  const ctx = {
    SB: () => ({ from: (t) => fra(t === 'solur' ? solur : t === 'customer_documents' ? skjol : []) }),
    docUrl: (d) => (d && d.storage_path ? 'https://gervi/storage/' + d.storage_path : (d && d.drive_file_id ? 'https://drive/' + d.drive_file_id : '')),
    fmtKrLoc: (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.'),
    getCompany: () => ({ kennitala: '0101010190', heimilisfang: 'Gata 1' }),
    openInvoiceOverlay: (num) => atburdir.yfirlag.push(num),
    alert: (m) => atburdir.alert.push(String(m)),
    window: { open: (u) => atburdir.open.push(u), SalaInvoice: { renderFromSale() {} } }, SalaInvoice: { renderFromSale() {} },
    String, Number, Promise, RegExp, Math, Object, Array, Error, JSON,
  };
  vm.createContext(ctx);
  vm.runInContext(bútur() + '\n;this.__opna = openInvFromSale;', ctx);
  return { opna: (...a) => ctx.__opna(...a), atburdir };
}

const STOLPI_AN_PDF = { id: 1, invoice_number: 'R-109991', storage_path: null, drive_file_id: null, amount: '123456', doc_date: '2023-01-02', year: 2023,
  notes: 'Stólpa-reikningur án PDF. Pörun LÍKLEG (útilokun): gervi.', vidskiptategund: 'brunakerfi' };

test('1. Stólpa-reikningur án PDF: „úr Stólpa … PDF fannst ekki í skjalasafninu" — aldrei „fannst ekki í Sölu"', async () => {
  const k = keyra({ skjol: [STOLPI_AN_PDF] });
  await k.opna('R-109991', 201, STOLPI_AN_PDF);
  assert.strictEqual(k.atburdir.alert.length, 1);
  const m = k.atburdir.alert[0];
  assert.doesNotMatch(m, /fannst ekki í Sölu/);
  assert.match(m, /Reikningur R-109991 er úr Stólpa \(gamla kerfinu, fyrri eigandi\) — PDF fannst ekki í skjalasafninu\./);
  assert.match(m, /02\.01\.2023 · 123\.456 kr · brunakerfi/);
  assert.strictEqual(k.atburdir.open.length, 0);
});

test('2. Stólpa-reikningur MEÐ PDF í skjalasafninu → PDF-ið opnast (sama heimild og „KOMIN"-línan)', async () => {
  const k = keyra({ skjol: [{ id: 2, invoice_number: 'R-109992', storage_path: 'samningar/drive-afrit/reikningur/201/gervi.pdf', amount: '654321', year: 2025 }] });
  await k.opna('R-109992', 201);
  assert.deepStrictEqual(k.atburdir.open, ['https://gervi/storage/samningar/drive-afrit/reikningur/201/gervi.pdf']);
  assert.strictEqual(k.atburdir.alert.length, 0);
});

test('3. reikningur sem er hvorki í Sölu né með PDF (ekki Stólpa-númer) → sagt það', async () => {
  const k = keyra({});
  await k.opna('R-000123', 201);
  assert.match(k.atburdir.alert[0], /Reikningur R-000123 er hvorki í Sölu né með PDF í skjalasafninu\./);
});

test('4. sala sem er til → opnast úr sölunni eins og áður', async () => {
  const k = keyra({ solur: [{ id: 9, num: 'R-009007', customer_kt: '0101010190' }] });
  await k.opna('R-009007', 1339);
  assert.deepStrictEqual(k.atburdir.yfirlag, ['R-009007']);
  assert.strictEqual(k.atburdir.alert.length, 0);
});
