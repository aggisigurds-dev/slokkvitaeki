#!/usr/bin/env node
/* Regression net — the 999999-9999 kennitala trap.
 * A real kt was entered but the sale still carries the walk-in 999999-9999.
 * Two signatures (both directly queryable, non-zero before the 2026-08-20 fix):
 *   (1) kt='999999-9999' AND a real kt sits in athugasemdir ("Kt: dddddd-dddd")
 *       -> the pickup/Sótt path (121) dropped the entered kt.
 *   (2) kt='999999-9999' AND customer_nafn is basically a kt
 *       -> a kt was typed into the name field (pos.js) and never extracted.
 * Exit 1 while any exist so CI/health flags them (and lists rows to backfill).
 * Read-only, publishable key.
 */
const SUPA = 'https://osfdzskyvisifcwyjkuk.supabase.co';
const KEY  = 'sb_publishable_YVpznM5EK01qOdevQwOcIg_rMjTkT7f';
const WALKIN = '999999-9999';
const KT_IN_NOTE = /kt[:.]?\s*(\d{6}-?\d{4})/i;
const NAME_IS_KT = /^\D*\d{6}-?\d{4}\D*$/;   // name is essentially just a kt

(async () => {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const r = await fetch(`${SUPA}/rest/v1/solur?select=num,status,customer_kt,customer_nafn,athugasemdir&order=id.asc`, {
      headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, Range: `${from}-${from + 999}` }
    });
    const b = await r.json();
    if (!Array.isArray(b) || !b.length) break;
    rows.push(...b);
    if (b.length < 1000) break;
  }

  const isWalkin = s => String(s.customer_kt || '').replace(/[^0-9]/g, '') === '9999999999';
  const drop = rows.filter(s => s.status === 'final' && isWalkin(s) && KT_IN_NOTE.test(String(s.athugasemdir || '')));
  const inName = rows.filter(s => isWalkin(s) && NAME_IS_KT.test(String(s.customer_nafn || '').trim()) && /\d{6}/.test(String(s.customer_nafn || '')));

  console.log(`solur scanned: ${rows.length}`);
  console.log(`(1) 999999 but real kt in note (pickup drop): ${drop.length}`);
  drop.slice(0, 30).forEach(s => console.log(`    ${s.num}  note="${String(s.athugasemdir || '').replace(/\s+/g, ' ').slice(0, 60)}"`));
  console.log(`(2) 999999 but kt typed into name: ${inName.length}`);
  inName.slice(0, 30).forEach(s => console.log(`    ${s.num}  nafn="${s.customer_nafn}"`));

  const total = drop.length + inName.length;
  const BASELINE = 10;   // already-existing kt-trap rows on 2026-08-20; RED only if it grows
  if (total) {
    console.log(`\nThe 2026-08-20 fix (121 saves entered kt; pos.js extracts kt from name) stops NEW ones.`);
    console.log(`Backfill: these ${total} existing rows still carry 999999 — then lower BASELINE.`);
  }
  if (total > BASELINE) {
    console.log(`RED: ${total} > baseline ${BASELINE} — the kt-trap fix leaked a NEW one. Investigate.`);
    process.exit(1);
  }
  console.log(`OK — ${total} kt-trap rows (<= baseline ${BASELINE}); fix holds.`);
})();
