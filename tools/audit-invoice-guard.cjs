#!/usr/bin/env node
/* Regression net — invoice-out safety.
 * Finds saved sales (final/sott) that would render/email a BLANK invoice because
 * they have no line items. After the 2026-08-20 guards (233 buildInvoiceBlob throw
 * + 254 compose block), such a sale can no longer be emailed — but the rows still
 * exist and should be cleaned/voided. Exit 1 if any are found, so CI/health flags it.
 *
 * Run:  node tools/audit-invoice-guard.cjs
 * Read-only, uses the browser publishable key (RLS).
 */
const SUPA = 'https://osfdzskyvisifcwyjkuk.supabase.co';
const KEY  = 'sb_publishable_YVpznM5EK01qOdevQwOcIg_rMjTkT7f';

(async () => {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const r = await fetch(`${SUPA}/rest/v1/solur?select=num,status,samtals,linur&order=id.asc`, {
      headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, Range: `${from}-${from + 999}` }
    });
    const b = await r.json();
    if (!Array.isArray(b) || !b.length) break;
    rows.push(...b);
    if (b.length < 1000) break;
  }

  const emailable = ['final', 'sott'];
  const blanks = rows.filter(s => {
    if (!emailable.includes(s.status)) return false;
    const l = s.linur;
    const arr = Array.isArray(l) ? l : (typeof l === 'string' ? safeArr(l) : []);
    return arr.length === 0;               // no lines → would produce a blank invoice
  });

  function safeArr(s) { try { const p = JSON.parse(s); return Array.isArray(p) ? p : []; } catch (_) { return []; } }

  console.log(`solur scanned: ${rows.length}`);
  console.log(`emailable-but-BLANK (status final/sott, no línur): ${blanks.length}`);
  blanks.slice(0, 60).forEach(s => console.log(`  ${s.num}  ${s.status}  samtals=${s.samtals}`));
  if (blanks.length > 60) console.log(`  … +${blanks.length - 60} more`);

  if (blanks.length) {
    console.log('\nThe 2026-08-20 send guards BLOCK these from reaching a customer.');
    console.log('Remaining action: void/clean these rows so they stop showing in lists.');
    process.exit(1);
  }
  console.log('OK — no blank-emailable sales.');
})();
