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

// --static: aðeins verðir sem lesa kóðann og þurfa hvorki net né lykla. Notað í
// pre-push-hooknum svo ýting stöðvist ekki þótt netið sé niðri eða hægt — CI
// keyrir allt settið á eftir. Greint á fetch( í skránni, ekki á handlista, svo
// nýr vörður flokkist sjálfkrafa rétt.
const adeinsStatic = process.argv.includes('--static');

const dir = __dirname;
let audits = fs.readdirSync(dir)
  .filter(f => /^audit-.*\.cjs$/.test(f) && f !== 'audit-all.cjs')
  .sort();

const alls = audits.length;
if (adeinsStatic) {
  audits = audits.filter(f => !/fetch\s*\(/.test(fs.readFileSync(path.join(dir, f), 'utf8')));
}

if (!audits.length) { console.log('No audits found.'); process.exit(0); }

// --skra: skrifa niðurstöðu hvers varðar í `oryggisnet_keyrslur` svo Jarvis-síðan
// (brunaholf/jarvis.html) sjái stöðuna og SÖGUNA. Það sem vantaði 09.09.2026 var
// ekki staðan — hún fékkst með því að keyra — heldur hvenær vörður varð rauður og
// hvað olli því. Skrifin mega aldrei fella keyrsluna: vörður sem virkar en nær
// ekki að skrá sig er samt vörður.
const skra = process.argv.includes('--skra');
const uppruni = (process.argv.find(a => a.startsWith('--uppruni=')) || '').split('=')[1] || 'handvirkt';

console.log(`🔌 Öryggisnet — begin-to-end test (${audits.length}` +
  (adeinsStatic ? ` af ${alls} — aðeins kóða-verðir` : ' audits') + ')\n');
let failed = 0;
const nidurstodur = [];
for (const a of audits) {
  process.stdout.write('  ' + a.padEnd(30) + ' ');
  const t0 = Date.now();
  try {
    const out = execFileSync('node', [path.join(dir, a)], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 60000 });
    const last = out.trim().split('\n').filter(Boolean).pop() || 'ok';
    console.log('✅  ' + last.slice(0, 90));
    nidurstodur.push({ audit: a, stada: 'graent', skilabod: last.slice(0, 400), ms: Date.now() - t0 });
  } catch (e) {
    failed++;
    const out = String((e.stdout || '') + (e.stderr || '')).trim();
    const last = out.split('\n').filter(Boolean).slice(-1)[0] || (e.message || 'error');
    console.log('❌  ' + last.slice(0, 90));
    nidurstodur.push({
      audit: a,
      stada: /^RED:/.test(last) || /\bRED\b/.test(last) ? 'rautt' : 'villa',
      skilabod: last.slice(0, 400), ms: Date.now() - t0
    });
  }
}
console.log(`\n${failed ? '❌ ' + failed + ' of ' + audits.length + ' RED — a guarantee broke. Fix before pushing (see docs/ORYGGISNET.md).'
                       : '✅ All ' + audits.length + ' green — the net holds.'}`);

if (skra) {
  (async () => {
    try {
      const cfg = fs.readFileSync(path.join(dir, '..', 'js/config.js'), 'utf8');
      const URL_ = (cfg.match(/SUPABASE_URL\s*=\s*["']([^"']+)/) || [])[1];
      const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ||
                  (cfg.match(/SUPABASE_KEY\s*=\s*["']([^"']+)/) || [])[1];
      const keyrslaId = (require('crypto').randomUUID)();
      const sha = (process.env.GITHUB_SHA || '').slice(0, 7) || null;
      const vel = process.env.RUNNER_NAME || require('os').hostname();
      const r = await fetch(URL_ + '/rest/v1/oryggisnet_keyrslur', {
        method: 'POST',
        headers: { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify(nidurstodur.map(n => ({
          ...n, keyrsla_id: keyrslaId, uppruni, commit_sha: sha, vel
        })))
      });
      console.log(r.ok ? `📝 Skráð í oryggisnet_keyrslur (${nidurstodur.length} raðir, uppruni: ${uppruni})`
                       : `⚠️  Náði ekki að skrá keyrsluna (${r.status}) — vörðurinn gildir samt.`);
    } catch (e) {
      console.log('⚠️  Náði ekki að skrá keyrsluna: ' + e.message + ' — vörðurinn gildir samt.');
    } finally {
      process.exit(failed ? 1 : 0);
    }
  })();
} else {
  process.exit(failed ? 1 : 0);
}
