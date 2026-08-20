#!/usr/bin/env node
/* BEGIN-TO-END SAFETY TEST — run before every push.
 *
 * Runs every tools/audit-*.cjs and reports whether the safety net still holds.
 * Each audit is GREEN at/below its known BASELINE of already-existing bad rows,
 * and RED if the count grew — meaning a guard leaked or new bad data appeared.
 *
 * GREEN (exit 0) → safe to push.  RED (exit 1) → a guarantee broke; fix first.
 *
 * This is Agnar's "run begin-to-end test if it will hold." See docs/ORYGGISNET.md.
 * A new invariant? Drop a tools/audit-<name>.cjs next to the others — it is picked
 * up here automatically.
 */
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const dir = __dirname;
const audits = fs.readdirSync(dir)
  .filter(f => /^audit-.*\.cjs$/.test(f) && f !== 'audit-all.cjs')
  .sort();

if (!audits.length) { console.log('No audits found.'); process.exit(0); }

console.log(`🔌 Öryggisnet — begin-to-end test (${audits.length} audits)\n`);
let failed = 0;
for (const a of audits) {
  process.stdout.write('  ' + a.padEnd(30) + ' ');
  try {
    const out = execFileSync('node', [path.join(dir, a)], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 60000 });
    const last = out.trim().split('\n').filter(Boolean).pop() || 'ok';
    console.log('✅  ' + last.slice(0, 90));
  } catch (e) {
    failed++;
    const out = String((e.stdout || '') + (e.stderr || '')).trim();
    const last = out.split('\n').filter(Boolean).slice(-1)[0] || (e.message || 'error');
    console.log('❌  ' + last.slice(0, 90));
  }
}
console.log(`\n${failed ? '❌ ' + failed + ' of ' + audits.length + ' RED — a guarantee broke. Fix before pushing (see docs/ORYGGISNET.md).'
                       : '✅ All ' + audits.length + ' green — the net holds.'}`);
process.exit(failed ? 1 : 0);
