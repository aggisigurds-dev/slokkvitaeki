// 27.11.2026 (Agnar, Hjálparsveit skáta 173.223 → 202.760 kr): „↻ Endurreikna verð"
// setti line_disc/line_price = {}. 227 sendir ferðina í app_settings_merge sem
// deep-merge-ar, svo {} eyddi engum lykli í skýinu: gamli 15 % afslátturinn sat þar
// áfram og vélarnar sýndu sitt hvora upphæðina. Hreinsunin VERÐUR að skrifa null.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const src = fs.readFileSync(path.join(__dirname, '..', 'js', 'patches', '129-company-total-cost.js'), 'utf8');
const i = src.indexOf("querySelector('#_ctc-endurreikna')");
const blokk = src.slice(i, src.indexOf('recomputeCompanyTotalCost()', i));

test('Endurreikna hreinsar línuafslátt og -verð með null (nær í skýið)', () => {
  assert.ok(i > 0, 'fann ekki Endurreikna-takkann');
  assert.match(blokk, /st\.line_disc\s*=\s*null/);
  assert.match(blokk, /st\.line_price\s*=\s*null/);
  assert.doesNotMatch(blokk, /st\.line_disc\s*=\s*\{\s*\}/);
  assert.doesNotMatch(blokk, /st\.line_price\s*=\s*\{\s*\}/);
});

test('Staðfestingin nefnir línuafsláttinn sem hverfur', () => {
  assert.match(blokk, /Línuafsláttur hverfur af/);
});

test('lesendur fara með null sem tómt', () => {
  assert.match(src, /tripState\.line_disc && typeof tripState\.line_disc === 'object'/);
  assert.match(src, /tripState\.line_price && typeof tripState\.line_price === 'object'/);
});
