#!/usr/bin/env node
/* Regression net — POS applies fyrirtaeki.afslattur_pct (2026-08-25).
 *
 * lookupKt used to .eq('kennitala', digits-only). DB stores hyphenated kts
 * (420187-1499), so the query returned 0 rows, fell through to RSK with 0%,
 * and overwrote the 15% patch 114 had already painted on the customer card.
 *
 * Proves:
 *   (1) SOURCE: lookupKt queries both dash and digits forms, keeps limit(20),
 *       walk-in 999999 still short-circuits, pickBest prefers pinned co_id.
 *   (2) DATA: a known hyphenated company with afslattur_pct>0 is found by the
 *       dual-form query (Colas Gullhella 15%).
 *
 * Read-only, publishable key. Does not call Payday.
 */
const fs = require('fs');
const path = require('path');

const SUPA = 'https://osfdzskyvisifcwyjkuk.supabase.co';
const KEY  = 'sb_publishable_YVpznM5EK01qOdevQwOcIg_rMjTkT7f';
const SRC = fs.readFileSync(path.join(__dirname, '..', 'js', 'pos.js'), 'utf8');

function fail(msg) {
  console.log('RED: ' + msg);
  process.exit(1);
}

const lookupFn = SRC.slice(SRC.indexOf('function lookupKt'), SRC.indexOf('function invalidateVorur') > 0 ? 0 : SRC.length);
// lookupKt starts after invalidateVorur in the file — grab from function lookupKt to Per-line helpers
const start = SRC.indexOf('function lookupKt');
const end = SRC.indexOf('function lineDiscPct', start);
const lookup = start >= 0 ? SRC.slice(start, end > 0 ? end : start + 8000) : '';

if (!lookup) fail('pos.js lookupKt not found.');
if (!/9999999999/.test(lookup)) fail('lookupKt lost the walk-in 999999-9999 short-circuit.');
if (!/kennitala\.eq\.' \+ dash/.test(lookup)) {
  fail('lookupKt no longer queries hyphenated kennitala — cart discount would fall through to RSK 0%.');
}
if (!/kennitala\.eq\.' \+ kt/.test(lookup)) {
  fail('lookupKt no longer queries digits-only kennitala as well.');
}
if (!/\.limit\(20\)/.test(lookup)) fail('lookupKt dropped .limit(20) — pagination audit would fire.');
if (/\.maybeSingle\(/.test(lookup)) fail('lookupKt uses maybeSingle — multi-site Colas would error and lose the discount.');
if (!/pinnedId/.test(lookup)) fail('lookupKt pickBest no longer prefers the pinned site co_id.');

const ups = fs.readFileSync(path.join(__dirname, '..', 'js', 'patches', '114-unified-pos-search.js'), 'utf8');
if (!/posState\.discount_pct\s*=\s*\+m\.afslattur_pct/.test(ups)) {
  fail('114 selectCustomer does not copy afslattur_pct into cart discount_pct.');
}

(async () => {
  const r = await fetch(
    `${SUPA}/rest/v1/fyrirtaeki?or=(kennitala.eq.420187-1499,kennitala.eq.4201871499)&deleted_at=is.null&select=id,nafn,afslattur_pct,kennitala`,
    { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } }
  );
  const rows = await r.json();
  if (!Array.isArray(rows) || !rows.length) fail('dual-form query returned 0 Colas rows — hyphenated kt lookup is broken.');
  const gull = rows.find(x => x.id === 218);
  if (!gull) fail('Colas Gullhella #218 missing from dual-form result.');
  if (!(+gull.afslattur_pct > 0)) fail('Gullhella afslattur_pct is 0 — card 15% would not reach the cart.');
  const digitsOnly = await fetch(
    `${SUPA}/rest/v1/fyrirtaeki?kennitala=eq.4201871499&select=id`,
    { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } }
  ).then(x => x.json());
  if (Array.isArray(digitsOnly) && digitsOnly.length > 0) {
    console.log('(info) digits-only kt rows exist; dual-form still required for hyphenated majority.');
  }
  console.log(`Colas sites via dual-form: ${rows.length} · Gullhella #218 = ${gull.afslattur_pct}%`);
  console.log('GREEN: POS lookupKt finds hyphenated kt and copies afslattur_pct into the cart.');
})().catch(e => fail(String(e && e.message || e)));
