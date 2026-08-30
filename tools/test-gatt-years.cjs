#!/usr/bin/env node
'use strict';
/**
 * Offline ticks for the customer portal: slökk and brunakerfi never fill
 * each other, and never fill forward from sidasta_ar.
 */
const GY = require('../netlify/functions/_gatt-years.cjs');
let failed = 0;
function ok(name, cond, detail) {
  if (cond) console.log('  OK  ' + name);
  else { failed++; console.log('  FAIL ' + name + (detail ? ' — ' + detail : '')); }
}

const y = GY.yearsFromDocs({
  sidasta_ar: 2026,
  ar_slokk: ['2024', '2026'],
  ar_bru: ['2025'],
});
ok('2023 slökk stays no even when sidasta_ar is 2026', y[0][0] === 'no');
ok('2024 slökk ok from ar_slokk', y[1][0] === 'ok');
ok('2025 slökk stays no (gap year)', y[2][0] === 'no');
ok('2025 brunakerfi ok from ar_bru, not from slökk', y[2][1] === 'ok');
ok('2026 brunakerfi stays no', y[3][1] === 'no');
ok('lastYear of ar_slokk is 2026', GY.lastYear(['2023', '2026', '2024']) === 2026);
ok('pick never returns a sister', GY.pickDocForSite([{ fyrirtaeki_id: 198 }], 195) == null);

console.log(failed ? '\nFAIL ' + failed : '\nOK');
process.exit(failed ? 1 : 0);
