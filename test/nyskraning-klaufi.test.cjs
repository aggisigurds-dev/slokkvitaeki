// Nýskráning sem klaufskur starfsmaður (álagspróf lotu 6, 17.11.2026). Keyrsla: node --test test/nyskraning-klaufi.test.cjs
//
// AF HVERJU: vafra-álagsprófið (öll skrif stífluð og talin) fann tvennt:
//   1. „+ Nýtt fyrirtæki": símanúmerið „abc" vistaðist — patch 17 taldi texta án tölustafa AUTT reit.
//   2. Ársskoðun „+ Nýtt fyrirtæki" (153): þrír smellir á Vista = ÞRJÚ eins fyrirtæki (async smellifall án læsingar,
//      engin einkvæmniskorða á fyrirtaeki), og röng vartala á kt fór í gegn.
// Eftir lagfæringu mældist í vafranum: 0 skrif á rangri kt (skilaboð sýnd), 1 innsetning við þrefaldan smell.
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROT = path.join(__dirname, '..');

// ── Gervi-DOM sem dugar patch 17 ───────────────────────────────────────────
function gerviDom(gildi) {
  const el = (id) => {
    const born = [];
    const parent = { querySelector: (s) => born.find((b) => s === '.' + b.className) || null, appendChild: (b) => born.push(b) };
    return { id, value: gildi[id] || '', dataset: {}, parentElement: parent, _born: born, _cls: new Set(),
      classList: { toggle(c, on) { on ? this._o._cls.add(c) : this._o._cls.delete(c); }, _o: null },
      addEventListener() {} };
  };
  const els = {};
  for (const id of ['nf-kt', 'nf-netfang', 'nf-simi', 'nf-nafn']) { els[id] = el(id); els[id].classList._o = els[id]; }
  const document = {
    getElementById: (id) => els[id] || null,
    createElement: () => ({ className: '', textContent: '' }),
    head: { appendChild() {} },
  };
  return { els, document };
}
function hlada17(gildi) {
  const { els, document } = gerviDom(gildi);
  let kallad = 0;
  // Í vafranum er window = alheimurinn og patch 17 notar bæði window.X og bert Companies.
  const ctx = { Companies: { submitNew: () => { kallad++; } }, Toast: { show() {} }, document, console: { log() {} }, setInterval: () => 0, setTimeout: () => 0 };
  ctx.window = ctx;
  vm.runInNewContext(fs.readFileSync(path.join(ROT, 'js/patches/17-form-validation.js'), 'utf8'), ctx);
  return { submit: () => ctx.Companies.submitNew(), kallad: () => kallad, els };
}

test('patch 17: „abc" í síma stöðvar vistun (áður: vistaðist)', () => {
  const h = hlada17({ 'nf-kt': '691299-0079', 'nf-simi': 'abc' });
  h.submit();
  assert.strictEqual(h.kallad(), 0, 'vistun átti ekki að fara í gegn');
  assert.ok(h.els['nf-simi']._cls.has('fv-bad'), 'símareitur merktur rauður');
  assert.match(h.els['nf-simi']._born[0].textContent, /tölustafi/);
});

test('patch 17: autt símanúmer og gilt símanúmer vistast', () => {
  for (const simi of ['', '   ', '555 1234', '+354 555 1234']) {
    const h = hlada17({ 'nf-kt': '691299-0079', 'nf-simi': simi });
    h.submit();
    assert.strictEqual(h.kallad(), 1, 'átti að vista með síma „' + simi + '"');
  }
});

test('patch 17: röng vartala á kt stöðvar vistun', () => {
  const h = hlada17({ 'nf-kt': '420115-0680' });
  h.submit();
  assert.strictEqual(h.kallad(), 0);
});

// ── 153: Ársskoðun „+ Nýtt fyrirtæki" ─────────────────────────────────────
const K153 = fs.readFileSync(path.join(ROT, 'js/patches/153-arsskodun.js'), 'utf8');
const dlg = K153.slice(K153.indexOf('function openNewCompanyDialog('), K153.indexOf('// ── Map deep-link'));

test('153: vistun læst á meðan hún stendur (tvísmellur = ein innsetning)', () => {
  assert.ok(dlg.length > 1000, 'openNewCompanyDialog fannst ekki');
  // Læsingin verður að vera á undan innsetningunni og losna í finally.
  assert.match(dlg, /if \(vistarUpptekid\) return;\s*vistarUpptekid = true;/);
  assert.match(dlg, /finally \{ vistarUpptekid = false;/);
  const lasing = dlg.indexOf('vistarUpptekid = true'), innsetning = dlg.indexOf(".from('fyrirtaeki').insert(");
  assert.ok(lasing > 0 && innsetning > lasing, 'læsing kemur á undan insert');
  // Aðeins EITT click-fall á vistunarhnappinum (annað fall framhjá læsingunni myndi opna gatið aftur).
  assert.strictEqual((dlg.match(/_ars-new-save'\)\.addEventListener\('click'/g) || []).length, 0, 'gamla óvarða fallið er farið');
  assert.strictEqual((dlg.match(/vistaHnappur\.addEventListener\('click'/g) || []).length, 1);
});

test('153: röng vartala á kt stöðvuð áður en vistað er', () => {
  const m = dlg.match(/const ktGild = \(raw\) => \{[\s\S]*?\n    \};/);
  assert.ok(m, 'ktGild vantar');
  const ktGild = vm.runInNewContext('(' + m[0].replace(/^const ktGild = /, '').replace(/;$/, '') + ')');
  assert.strictEqual(ktGild('420115-0670'), true);
  assert.strictEqual(ktGild('681299-0099'), true);
  assert.strictEqual(ktGild('681299-0089'), false);
  assert.strictEqual(ktGild('12345'), false);
  const athugun = dlg.indexOf('!ktGild(data.kennitala)'), innsetning = dlg.indexOf(".from('fyrirtaeki').insert(");
  assert.ok(athugun > 0 && athugun < innsetning, 'kt-athugun kemur á undan insert');
});

// ── 114: „Afgreiðsla án stofnunar" í kassanum ─────────────────────────────
// Mælt í vafra 17.11.2026: leit að 4201150680 (röng vartala) → „Afgreiðsla án stofnunar — Kennitalan fer á reikninginn" →
// solur.customer_kt = 420115-0680, engin viðvörun. Eftir lagfæringu: viðvörun og kennitalan fylgir ekki.
const K114 = fs.readFileSync(path.join(ROT, 'js/patches/114-unified-pos-search.js'), 'utf8');
test('114: ógild kt fer EKKI á reikning um „Afgreiðsla án stofnunar"', () => {
  const m = K114.match(/const ktVartalaOk = \(d\) => \{[\s\S]*?\n        \};/);
  assert.ok(m, 'ktVartalaOk vantar');
  const ok = vm.runInNewContext('(' + m[0].replace(/^const ktVartalaOk = /, '').replace(/;$/, '') + ')');
  assert.strictEqual(ok('4201150670'), true);
  assert.strictEqual(ok('4201150680'), false);
  assert.match(K114, /const ogildKt = qDigits\.length === 10 && qDigits !== '9999999999' && !ktVartalaOk\(qDigits\);/);
  assert.match(K114, /const ostofnKt = \(qDigits\.length === 10 && qDigits !== '9999999999' && !ogildKt\) \? qDigits : '';/,
    'ostofnKt má ekki taka við ógildri kennitölu');
  assert.match(K114, /_ups-ogild-kt[\s\S]{0,300}er ekki gild kennitala/, 'viðvörun sýnd');
});
