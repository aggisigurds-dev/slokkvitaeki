#!/usr/bin/env node
/* Regression net — Brunakerfi yfirlit Staða must follow a REAL report file,
 * not the shared Ársskoðun flag and not a stub/HTML document. Agnar 2026-08-24
 * + 2026-08-25: Klöpp / Laugavegur / Plaza showed ✅ Skoðað 2026 with no
 * brunakerfi skýrsla and no marked brunakerfi inspection, because
 * last_year_inspected is slökkvitæki-Ársskoðun and because years[y]='#'
 * counted as a report.
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

if (/function hasReport\(r, y\)/.test(src) && /const done = hasReport\(r, NOW\)/.test(src)) {
  ok('stodaHtml done = hasReport(r, NOW) (real brunakerfi report URL)');
} else {
  bad('stodaHtml must set done via hasReport(r, NOW), not last_year_inspected or years["#"]');
}
if (/const done = \+a\.last_year_inspected === NOW/.test(src) ||
    /const done = !!r\.years\[String\(NOW\)\]/.test(src)) {
  bad('stodaHtml still treats last_year_inspected or a stub years[y] as Skoðað');
} else {
  ok('last_year_inspected / stub years[y] is not the Skoðað predicate');
}
if (/url \|\| r\.years\[y\] \|\| '#'/.test(src)) {
  bad('load() still falls back to years[y]="#", which greens Staða without a file');
} else {
  ok('load() does not store "#" as a fake report URL');
}
if (/function reportUrl\(d\)/.test(src) && /\\.html\?/.test(src)) {
  ok('reportUrl rejects HTML placeholders');
} else {
  bad('reportUrl must exist and skip .html files');
}

function hasReport(r, y) {
  const u = r && r.years && r.years[String(y)];
  return !!(u && u !== '#' && String(u).indexOf('http') === 0);
}
function label(r, a, NOW) {
  const done = hasReport(r, NOW);
  const wip = !done && +a.field_inspected_year === NOW;
  if (done) return 'skodad';
  if (wip) return 'wip';
  return 'none';
}
const NOW = 2026;
const PDF = 'https://example.test/skyrsla.pdf';
const cases = [
  [{ years: { '2025': PDF } }, { last_year_inspected: 2026 }, 'none', 'Ársskoðun flag 2026 + 2025 report is NOT Skoðað 2026'],
  [{ years: { '2026': PDF } }, { last_year_inspected: 0 }, 'skodad', '2026 PDF report is Skoðað even without the flag'],
  [{ years: { '2026': '#' } }, { last_year_inspected: 0 }, 'none', 'stub "#" is NOT a skýrsla'],
  [{ years: { '2026': '' } }, { last_year_inspected: 2026 }, 'none', 'empty URL + slökkvitækja-merki is NOT Skoðað'],
  [{ years: {} }, { field_inspected_year: 2026, last_year_inspected: 0 }, 'wip', 'no report + field year = Í vinnslu'],
  [{ years: { '2026': PDF } }, { field_inspected_year: 2026 }, 'skodad', 'report wins over Í vinnslu flag'],
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
console.log('OK — Skoðað YYYY requires a real brunakerfi report file for that year.');
