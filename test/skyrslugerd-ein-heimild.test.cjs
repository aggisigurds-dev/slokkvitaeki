// Skýrslugerð: eitt sjálfgildi alls staðar (álagspróf umferð 3, 17.11.2026). Keyrsla: node --test test/skyrslugerd-ein-heimild.test.cjs
//
// AF HVERJU: Agnar staðfesti 16.11 að Skýrslugerð sé 4.600 kr (stendur í app_settings.slokk_visit_defaults). Kóðasjálfgildið
// var enn 5.600 á fimm stöðum. Náist app_settings ekki (2,3 MB röð; 85-app-settings fellur þá þegjandi á sjálfgildi) fór
// 5.600 á reikninginn — endurgert í vafra 17.11 (vistað gildi null alla lotuna → sala með „Skýrslugerð ×1 á 5600").
// Prófið les öll afritin og krefst þess að þau séu EIN tala, sú sem var staðfest.
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROT = path.join(__dirname, '..');
const SKRAR = ['js/patches/129-company-total-cost.js', 'js/patches/165-visit-workflow.js', 'js/patches/410-thjonustu-tengingar.js',
  'js/patches/488-vidbotar-uttekt.js', 'netlify/functions/_gatt-serkjor.cjs'];
const STADFEST = 4600;   // Agnar 16.11.2026

test('öll kóðasjálfgildi Skýrslugerðar eru sama tala og hún er staðfesta verðið', () => {
  const fundid = [];
  for (const f of SKRAR) {
    const k = fs.readFileSync(path.join(ROT, f), 'utf8');
    for (const m of k.matchAll(/skyrslugerd:\s*(\d+)/g)) fundid.push({ f, v: +m[1] });
  }
  assert.ok(fundid.length >= 7, 'fann aðeins ' + fundid.length + ' sjálfgildi — var skrá færð?');
  const olik = fundid.filter((x) => x.v !== STADFEST);
  assert.deepStrictEqual(olik, [], 'sjálfgildi sem víkja frá ' + STADFEST + ': ' + JSON.stringify(olik));
});

test('akstur er líka ein tala í öllum afritum', () => {
  const v = new Set();
  for (const f of SKRAR) for (const m of fs.readFileSync(path.join(ROT, f), 'utf8').matchAll(/\{ akstur:\s*(\d+)/g)) v.add(+m[1]);
  assert.strictEqual(v.size, 1, 'akstur misræmi: ' + [...v].join(', '));
});
