#!/usr/bin/env node
/* Regression net — Rekstrarfélög table columns stay aligned (2026-08-26).
 *
 * Agnar annotated live Sími: HEIMILISFANG / NÓTA / TÆKI shifted one place
 * (addresses under Nóta, ✈ nóta under Tæki). Cause:
 *   (1) 263 `table{display:block}` + thead/tbody `{display:table}` split the
 *       rf-tbl into two tables under html[data-viewmode=mobile].
 *   (2) 175 `.rf-cellname{display:flex}` dropped the first <td> out of the
 *       column grid.
 *
 * This audit is SOURCE-only (no live data). GREEN if the guards are present.
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const src175 = fs.readFileSync(path.join(root, 'js/patches/175-rekstrarfelog.js'), 'utf8');
const src263 = fs.readFileSync(path.join(root, 'js/patches/263-mobile-baseline.js'), 'utf8');

const fails = [];

if (/\.rf-cellname\{[^}]*display:\s*flex/.test(src175)) {
  fails.push('175 .rf-cellname still uses display:flex (must stay table-cell)');
}
if (!/\.rf-cellinner\{display:flex/.test(src175)) {
  fails.push('175 missing .rf-cellinner flex wrapper');
}
if (!/rf-tbl\{display:table!important/.test(src175)) {
  fails.push('175 .rf-tbl missing display:table !important');
}
if (!/rf-cellinner/.test(src175)) {
  fails.push('175 row HTML missing rf-cellinner');
}
if (!/#view-rekstrarfelog table\.rf-tbl\{display:table!important/.test(src263)) {
  fails.push('263 missing Rekstrarfélög table display:table exception');
}

if (fails.length) {
  console.log('RED  ' + fails.join('; '));
  process.exit(1);
}
console.log('GREEN  rf-tbl stays one table; rf-cellname is table-cell (BASELINE 0)');
process.exit(0);
