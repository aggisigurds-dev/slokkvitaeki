// Próf: gallaða letrið í reiknings-PDF (233) — „H l e ð s l a" teygt yfir dálkana (17.11.2026).
// Keyrsla: node --test test/reikningur-pdf-letur.test.cjs
//
// AF HVERJU: jsPDF 2.5.1 með staðalletrinu Helvetica getur AÐEINS skrifað Latin-1 (U+0020–U+00FF) og 27 WinAnsi-tákn
// (mælt staf fyrir staf á sömu jsPDF-skrá og appið hleður). Einn stafur utan þess mengis í streng og jsPDF skrifar
// ALLAN strenginn sem UTF-16 → hver stafur fær núll-bæti á undan sér, línan teygist og rennur yfir FJÖLDI/EININGAV.
// Lagfæringin 26.08 tók aðeins ₂ − – —; „höfn↔Hafnarfjörður" (vistað 24.10) brotnaði samt.
// Það sem má aldrei bila: HVER texti sem 233 teiknar (lýsing, nafn, heimilisfang, kt, vegna, seljandi, starfsmaður,
// samtölur) er innan mengisins — og íslenskan stendur óbreytt.
// Gögnin hér eru tilbúin (engin raunveruleg nöfn, kennitölur eða upphæðir — repóið er opið).
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const SRC = fs.readFileSync(path.join(__dirname, '..', 'js', 'patches', '233-uttekt-pdf-autosave.js'), 'utf8');
// Mengið sem jsPDF 2.5.1 (cdnjs …/jspdf/2.5.1/jspdf.umd.min.js) skrifar án UTF-16 — mælt 17.11.2026.
const WINANSI = new Set('ŒœŠšŸŽžƒˆ˜–—‘’‚“”„†‡•…‰‹›€™');
const iLagi = (c) => c === '\n' || (c.codePointAt(0) >= 0x20 && c.codePointAt(0) <= 0xff) || WINANSI.has(c);
const utan = (s) => Array.from(String(s)).filter((c) => !iLagi(c));

// Gervi-jsPDF: skráir HVERN streng sem fer í doc.text (og splitTextToSize) — prófið les hann.
function hlada(branding) {
  const skrad = [];
  class GerviPdf {
    constructor() { ['setFont', 'setFontSize', 'setTextColor', 'setDrawColor', 'setLineWidth', 'line', 'addImage', 'addPage'].forEach((m) => { this[m] = () => this; }); }
    text(t) { (Array.isArray(t) ? t : [t]).forEach((x) => skrad.push(String(x))); return this; }
    splitTextToSize(t) { skrad.push(String(t)); return String(t).split('\n'); }
    output() { return { gervi: true }; }
  }
  class GerviMynd { set src(_) { setTimeout(() => this.onerror && this.onerror(), 0); } }
  const AppSettings = { path: () => branding || {} };
  const win = { jspdf: { jsPDF: GerviPdf }, AppSettings };
  win.window = win;
  vm.runInNewContext(SRC, {
    window: win, AppSettings, Image: GerviMynd, setTimeout, clearTimeout, console: { log() {}, warn() {}, error() {} },
    document: { createElement: () => ({ getContext: () => ({ drawImage() {} }), toDataURL: () => '' }), head: { appendChild() {} }, dispatchEvent() {} },
    CustomEvent: function () {}, fetch: () => Promise.reject(new Error('ekkert net í prófi')),
  }, { filename: '233-uttekt-pdf-autosave.js' });
  return { P: Object.assign({ pdfText: win.PdfTexti && win.PdfTexti.texti }, win.UttektInvoicePdf), skrad };
}

test('pdfText: íslenskan og WinAnsi-táknin standa óbreytt', () => {
  const { P } = hlada();
  for (const s of ['Hleðsla · Léttvatnstækis 6L. hleðsla', 'ÞÆÖÐÁÉÍÓÚÝ þæöðáéíóúý', '„Gæsalappir“ 3 × 6 kg … 100 € • ‘a’', 'Húsfélagið Á-götu 12, 101 Reykjavík']) {
    assert.equal(P.pdfText(s), s);
  }
});

test('pdfText: stafir sem felldu línuna í UTF-16 eru varpaðir — ekkert utan mengisins', () => {
  const { P } = hlada();
  const tilvik = {
    'Hleðsla · Léttvatnstækis 6L. hleðsla · −20% afsl.': 'Hleðsla · Léttvatnstækis 6L. hleðsla · -20% afsl.',   // R-000800-tilvikið
    'Vinna: skýrslugerð + akstur höfn↔Hafnarfjörður': 'Vinna: skýrslugerð + akstur höfn<->Hafnarfjörður',       // R-000599-tilvikið
    'CO₂ 5 kg': 'CO2 5 kg',
    'Łukasz Wiśniewski, ul. Żółta 3': 'Lukasz Wisniewski, ul. Zólta 3',
    'Ąžuolas Čepauskas': 'Ažuolas Cepauskas',
    'Hiti ≥ 20 → í lagi ✓': 'Hiti >= 20 -> í lagi v',
    'tala 1 000​': 'tala 1 000',
    '🔥 Brunaslanga': ' Brunaslanga',
    'ߐ': '?',
  };
  for (const [inn, ut] of Object.entries(tilvik)) {
    const r = P.pdfText(inn);
    assert.deepEqual(utan(r), [], inn + ' → ' + r);
    assert.equal(r, ut);
  }
  assert.equal(P.pdfText(null), '');
});

test('buildInvoiceBlob: HVER teiknaður texti er innan mengisins (lýsing, kaupandi, vegna, seljandi, starfsmaður)', async () => {
  const { P, skrad } = hlada({ company_name: 'Prófun Slökkvitæki ehf.', kennitala: '000000-0000', vsk_nr: '0000', address1: 'Gata 1 ↔ 2', address2: '000 Bær' });
  const sale = {
    num: 'R-000001', created_at: '2026-08-24T13:59:40Z', greitt_med: 'reikningur', starfsmadur: 'Jón Łódź', samtals: 0, afslattur: 0,
    athugasemdir: 'Heimsókn 2026-08-24 — akstur höfn↔bær',
    linur: [
      { qty: 19, desc: 'Hleðsla · Léttvatnstækis 6L. hleðsla · −20% afsl.', unit_price_ex_vat: 5000, vsk_pct: 24 },
      { qty: 1, desc: 'Vinna: akstur höfn↔Hafnarfjörður → CO₂ ≈ 2 kg', unit_price_ex_vat: 1000, vsk_pct: 24, ref: 'A↔1' },
      { qty: 2, desc: 'Skýrslugerð', unit_price_ex_vat: 100, vsk_pct: 24, discount_pct: 10 },
    ],
  };
  const co = { nafn: 'Prófun ehf. − Żółta', heimilisfang: 'Gata 3 ≥ 4, 000 Bær', kennitala: '0000000000' };
  await P.buildInvoiceBlob(sale, co);
  assert.ok(skrad.length > 20, 'gervi-jsPDF skráði textann');
  const slaemt = skrad.filter((s) => utan(s).length);
  assert.deepEqual(slaemt, [], 'strengir utan mengisins: ' + JSON.stringify(slaemt));
  assert.ok(skrad.includes('Hleðsla · Léttvatnstækis 6L. hleðsla · -20% afsl.'), 'lýsingin heldur íslenskunni');
  assert.ok(skrad.some((s) => s.indexOf('höfn<->Hafnarfjörður') >= 0));
});

test('233: enginn doc.text með breytilegum texta fer fram hjá pdfText', () => {
  const kafli = SRC.slice(SRC.indexOf('async function buildInvoiceBlob'), SRC.indexOf("return doc.output('blob')"));
  const kollin = kafli.match(/doc\.text\([^;]*/g) || [];
  const leyft = [/^doc\.text\('[^'+]*',/, /^doc\.text\('kt\. ' \+ fmtKtDash\(/, /^doc\.text\(pdfText\(/, /^doc\.text\(wrapped,/, /^doc\.text\(ln,/, /^doc\.text\(String\(qty\)/, /^doc\.text\(fmtKr\(/, /^doc\.text\(code,/, /^doc\.text\(lbl, labelX/];
  const framhja = kollin.filter((k) => !leyft.some((r) => r.test(k)));
  assert.deepEqual(framhja, []);
});
