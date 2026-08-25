#!/usr/bin/env node
/* Regression net — Brunakerfi yfirlit Staða must follow the report, not the
 * shared Ársskoðun flag. Agnar 2026-08-24: Klöpp showed ✅ Skoðað 2026 while
 * Síðast was 2025 · okt because last_year_inspected is slökkvitæki-Ársskoðun.
 *
 * Source + truth-table. Run: node tools/audit-brunakerfi-stada.cjs
 */
'use strict';
const fs = require('fs');
const path = require('path');
const src = fs.readFileSync(path.join(__dirname, '..', 'js/patches/272-brunakerfi-yfirlit.js'), 'utf8');
let failed = 0;
function ok(m) { console.log('  OK  ' + m); }
function bad(m) { console.log('  RED ' + m); failed++; }

if (/const done = !!r\.years\[String\(NOW\)\]/.test(src)) {
  ok('stodaHtml done = r.years[current year] (brunakerfi report)');
} else {
  bad('stodaHtml must set done from r.years[NOW], not last_year_inspected');
}
if (/const done = \+a\.last_year_inspected === NOW/.test(src)) {
  bad('stodaHtml still treats last_year_inspected as Skoðað — that is the false-green bug');
} else {
  ok('last_year_inspected is not the Skoðað predicate');
}

function label(r, a, NOW) {
  const done = !!r.years[String(NOW)];
  const wip = !done && +a.field_inspected_year === NOW;
  if (done) return 'skodad';
  if (wip) return 'wip';
  return 'none';
}
const NOW = 2026;
const cases = [
  [{ years: { '2025': '#' } }, { last_year_inspected: 2026 }, 'none', 'flag 2026 + 2025 report is NOT Skoðað 2026'],
  [{ years: { '2026': '#' } }, { last_year_inspected: 0 }, 'skodad', '2026 report is Skoðað even without the flag'],
  [{ years: {} }, { field_inspected_year: 2026, last_year_inspected: 0 }, 'wip', 'no report + field year = Í vinnslu'],
  [{ years: { '2026': '#' } }, { field_inspected_year: 2026 }, 'skodad', 'report wins over Í vinnslu flag'],
];
for (const [r, a, want, why] of cases) {
  const got = label(r, a, NOW);
  if (got === want) ok(why);
  else bad(why + ' — got ' + got + ' want ' + want);
}

if (failed) {
  console.log('\nRED: Brunakerfi Staða is lying again.');
  process.exit(1);
}
console.log('OK — Skoðað YYYY requires a brunakerfi report for that year.');
