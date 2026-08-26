#!/usr/bin/env node
/* Regression net — Ársskoðun blue invoice-dot is per site (2026-08-25).
 *
 * 187 used to group customer_documents reikningur by customer_base_id →
 * kennitala digits, then OR that into hasInvYear. One Center Hótel invoice
 * painted a blue under-dot on all 11 hotels (Hlaðvarpinn / Þverholt 14 /
 * Þingholt Apartments had no own invoice and no report).
 *
 * Proves:
 *   (1) SOURCE: loadReik selects fyrirtaeki_id; hasReikYear keys byCo +
 *       unique-kt orphan only; reikMap[kt] leak is gone; isKlaradYear stays
 *       pairMap[coId]; fetchAll still pages customer_documents.
 *   (2) DATA: Hlaðvarpinn (1750) has no 2024–2026 site invoice while a
 *       sibling (Grandi 197) does — the leak would still be visible if the
 *       source keyed on kt. Sites are never merged.
 *
 * Read-only, publishable key.
 */
const fs = require('fs');
const path = require('path');

const SUPA = 'https://osfdzskyvisifcwyjkuk.supabase.co';
const KEY  = 'sb_publishable_YVpznM5EK01qOdevQwOcIg_rMjTkT7f';
const SRC = fs.readFileSync(path.join(__dirname, '..', 'js', 'patches', '187-inservice-row-reports.js'), 'utf8');

function fail(msg) {
  console.log('RED: ' + msg);
  process.exit(1);
}

const loadStart = SRC.indexOf('async function loadReik');
const loadEnd = SRC.indexOf('async function loadFc', loadStart);
const loadReik = loadStart >= 0 ? SRC.slice(loadStart, loadEnd > 0 ? loadEnd : loadStart + 4000) : '';
if (!loadReik) fail('187 loadReik not found.');
if (!/fyrirtaeki_id/.test(loadReik)) {
  fail('187 loadReik no longer selects fyrirtaeki_id — invoice dots would key on kennitala again.');
}
if (!/byCo/.test(loadReik) || !/byKtOrphan/.test(loadReik)) {
  fail('187 loadReik lost byCo / byKtOrphan split — multi-site kts would share invoice years.');
}
if (!/fetchAll/.test(loadReik)) {
  fail('187 loadReik dropped fetchAll — customer_documents would truncate at 1000.');
}
if (/vidskiptategund['"]\s*,\s*['"]bud/.test(loadReik) === false && !/vidskiptategund',\s*'bud'/.test(loadReik) && !/eq\('vidskiptategund',\s*'bud'\)/.test(loadReik)) {
  fail('187 loadReik no longer excludes búðarreikningar.');
}

if (!/function hasReikYear/.test(SRC)) {
  fail('187 hasReikYear missing — invoice-dot helper was the site-level gate.');
}
const helperStart = SRC.indexOf('function hasReikYear');
const helper = SRC.slice(helperStart, helperStart + 900);
if (!/reikMap\.byCo/.test(helper)) {
  fail('187 hasReikYear does not read reikMap.byCo[coId].');
}
if (!/ktCount\[kt\]/.test(helper) || !/byKtOrphan/.test(helper)) {
  fail('187 hasReikYear unique-kt orphan fallback missing (must match uttekt_files ktCount).');
}
if (/reikMap\[kt\]/.test(SRC)) {
  fail('187 still reads reikMap[kt] — that is the sibling-hotel invoice leak.');
}
if (!/hasInvYear = hasReikYear\(coId, kt, y, ktCount\)/.test(SRC)) {
  fail('187 hasInvYear is not hasReikYear(coId, kt, y, ktCount) — year pills may still OR a kt map.');
}
if (!/reik: hasReikYear\(coId, kt, y, ktCount\)/.test(SRC)) {
  fail('187 yearInfo().reik is not site-scoped — print 🧾 would leak across a shared kt.');
}
if (!/isUttektInvoiceTeg/.test(SRC) || !/vidskiptategund/.test(loadReik)) {
  fail('187 loadReik no longer filters by vidskiptategund — brunakerfi invoices would light úttekt 🧾.');
}
if (/k === 'brunakerfi'/.test(SRC)) {
  fail('187 isReportKind still treats brunakerfi as úttektarskýrsla.');
}
if (!/bruInvIds/.test(SRC) || !/invoice_doc_id/.test(SRC)) {
  fail('187 loadPairs no longer skips uttekt+klarad pairs whose invoice is brunakerfi.');
}

const klarad = SRC.slice(SRC.indexOf('function isKlaradYear'), SRC.indexOf('function isKlaradYear') + 280);
if (!/pairMap && pairMap\[String\(coId\)\]/.test(klarad) && !/pairMap && pairMap\[String\(coId\)\]/.test(SRC)) {
  fail('187 isKlaradYear is no longer pairMap per fyrirtaeki_id.');
}

async function pageAll(pathAndQuery) {
  const out = [];
  for (let from = 0; ; from += 1000) {
    const r = await fetch(`${SUPA}/rest/v1/${pathAndQuery}`, {
      headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, Range: `${from}-${from + 999}` }
    });
    const b = await r.json();
    if (!Array.isArray(b) || !b.length) break;
    out.push(...b);
    if (b.length < 1000) break;
  }
  return out;
}

(async () => {
  const center = await pageAll('fyrirtaeki?kennitala=eq.450905-1430&deleted_at=is.null&select=id,nafn,er_i_thjonustu');
  if (center.length < 8) {
    fail('Center Hótel (450905-1430) has ' + center.length + ' sites — expected ≥8. Do not merge hotels.');
  }
  const hlad = center.find(c => +c.id === 1750);
  const grandi = center.find(c => +c.id === 197);
  if (!hlad) fail('Center Hótel Hlaðvarpinn (id 1750) missing — false-flag fixture gone.');
  if (!grandi) fail('Center Hótel Grandi (id 197) missing — sibling invoice fixture gone.');

  const docs = await pageAll('customer_documents?doc_type=eq.reikningur&customer_base_id=eq.146&select=year,invoice_number,fyrirtaeki_id');
  const years = new Set(['2024', '2025', '2026']);
  const hladInv = docs.filter(d => +d.fyrirtaeki_id === 1750 && years.has(String(d.year)));
  const grandiInv = docs.filter(d => +d.fyrirtaeki_id === 197 && years.has(String(d.year)));
  if (hladInv.length) {
    fail('Hlaðvarpinn unexpectedly has site invoices ' + hladInv.map(d => d.year + ':' + d.invoice_number).join(',') + ' — hunt fixture changed.');
  }
  if (!grandiInv.length) {
    fail('Grandi has no 2024–2026 site invoice — sibling leak would be untestable.');
  }
  console.log('GREEN: Ársskoðun invoice-dot is per fyrirtaeki_id (Hlaðvarpinn 0 own 24–26, Grandi ' + grandiInv.length + ' sibling; Center sites ' + center.length + ').');
})().catch(e => fail(e.message || String(e)));
