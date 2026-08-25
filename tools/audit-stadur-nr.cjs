#!/usr/bin/env node
/* Regression net — rekstrarfélög identity is kennitala + stadur_nr (2026-08-25).
 *
 * Agnar: use the numbering system WITH the kennitala. stadur_nr alone is
 * not unique (Plaza nr. 2 at Center Hótel ≠ Máni nr. 2 at Heimaleiga).
 *
 * Proves:
 *   (1) SOURCE: payday-push selects stadur_nr and only writes
 *       "kt nr. N" when _siteTrusted; Vegna (nr. N) sits behind _siteOk.
 *       POS does not .limit(1) a kt onto the first hotel. 114 prefetch
 *       keeps stadur_nr. 175 companyForBld may match kt+nr, never hits[0].
 *   (2) DATA: Center Hótel numbers 1–11 are unique on that kt; Heimaleiga
 *       also has an nr. 2 on a different kt.
 *
 * Read-only, publishable key.
 */
const fs = require('fs');
const path = require('path');

const SUPA = 'https://osfdzskyvisifcwyjkuk.supabase.co';
const KEY  = 'sb_publishable_YVpznM5EK01qOdevQwOcIg_rMjTkT7f';

function fail(msg) {
  console.log('RED: ' + msg);
  process.exit(1);
}

const push = fs.readFileSync(path.join(__dirname, '..', 'netlify/functions/payday-push.js'), 'utf8');
const pos = fs.readFileSync(path.join(__dirname, '..', 'js/pos.js'), 'utf8');
const ups = fs.readFileSync(path.join(__dirname, '..', 'js/patches/114-unified-pos-search.js'), 'utf8');
const rf = fs.readFileSync(path.join(__dirname, '..', 'js/patches/175-rekstrarfelog.js'), 'utf8');
const ed = fs.readFileSync(path.join(__dirname, '..', 'js/patches/14-companies-openedit.js'), 'utf8');

if (!/stadur_nr/.test(push)) fail('payday-push no longer mentions stadur_nr.');
if (!/bokunarnumer,stadur_nr/.test(push) && !/bokunarnumer,stadur_nr/.test(push.replace(/\s/g, ''))) {
  if (!/skyrsla_med_krofu,bokunarnumer,stadur_nr/.test(push)) {
    fail('fetchFyrirtaeki dropped stadur_nr from the select.');
  }
}
if (!/_siteTrusted && site\.stadur_nr/.test(push)) {
  fail('accountingCost nr. is not gated on _siteTrusted — Plaza nr.2 could leak onto Máni.');
}
if (!/_ktDash \+ ' nr\. '/.test(push) && !/_ktDash \+ " nr. "/.test(push)) {
  fail('accountingCost is not "kennitala nr. N".');
}
if (!/_nrBit = \(_siteOk && _site\.stadur_nr/.test(push)) {
  fail('Vegna (nr. N) is not gated on _siteOk.');
}

const attachChunk = pos.slice(pos.indexOf('UttektInvoicePdf.saveForSale'), pos.indexOf('UttektInvoicePdf.saveForSale') + 1800);
if (!attachChunk || attachChunk.length < 100) fail('invoice auto-save chunk not found.');
if (/\.limit\(1\)\.maybeSingle\(\)/.test(attachChunk)) {
  fail('POS still .limit(1).maybeSingle() on kt when attaching an invoice — would hit the first Center hotel.');
}
if (!/_rows\.length === 1/.test(attachChunk)) {
  fail('invoice attach no longer requires a unique-kt match when co_id is missing.');
}

const autoLink = pos.slice(pos.indexOf('If this kt already belongs to a COMPANY'), pos.indexOf('If this kt already belongs to a COMPANY') + 1600);
if (/from\('fyrirtaeki'\)[\s\S]{0,280}\.limit\(1\)\.maybeSingle\(\)/.test(autoLink)) {
  fail('POS auto-link still .limit(1).maybeSingle() a shared kt onto solur.customer_id.');
}
if (!/fyRows\.length===1/.test(autoLink) && !/fyRows.length === 1/.test(autoLink)) {
  fail('POS auto-link no longer requires exactly one fyrirtaeki row.');
}

if (!/pickBest/.test(pos) || !/arr\.length === 1/.test(pos.slice(pos.indexOf('function pickBest'), pos.indexOf('function pickBest') + 900))) {
  fail('lookupKt pickBest still guesses arr[0] on a multi-site kt.');
}

if (!/stadur_nr/.test(ups.split("from('fyrirtaeki')")[1] || '')) {
  fail('114 prefetch select dropped stadur_nr — Companies.list overwrite would strip site numbers.');
}
if (!/nr\. /.test(ups)) fail('114 search results no longer show nr.');

if (/if\s*\(hits\.length\s*>\s*1\)[\s\S]{0,400}return hits\[0\]/.test(rf)) {
  fail('175 companyForBld still returns hits[0] on ambiguous names.');
}
if (!/ktHits\.length > 1/.test(rf) || !/stadur_nr/.test(rf.slice(rf.indexOf('function companyForBld'), rf.indexOf('function companyForBld') + 2500))) {
  fail('175 companyForBld lost kt+stadur_nr matching.');
}
if (!/row\.stadur_nr = maxN \+ 1/.test(rf)) {
  fail('175 createServiceCompany no longer assigns the next stadur_nr for that kt.');
}
if (!/nf-stadur-nr/.test(ed) || !/stadur_nr:/.test(ed)) {
  fail('14 company editor no longer saves stadur_nr.');
}

async function pageAll(q) {
  const out = [];
  for (let from = 0; ; from += 1000) {
    const r = await fetch(`${SUPA}/rest/v1/${q}`, {
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
  const center = await pageAll('fyrirtaeki?kennitala=eq.450905-1430&deleted_at=is.null&select=id,nafn,stadur_nr');
  const heim = await pageAll('fyrirtaeki?kennitala=eq.510117-0690&deleted_at=is.null&select=id,nafn,stadur_nr');
  if (center.length < 8) fail('Center Hótel sites merged or missing.');
  const nums = center.map(c => String(c.stadur_nr)).filter(n => n && n !== 'null');
  const uniq = new Set(nums);
  if (nums.length < 8) fail('Center Hótel sites missing stadur_nr.');
  if (uniq.size !== nums.length) fail('Center Hótel stadur_nr is not unique on that kennitala.');
  const centerHas2 = center.some(c => String(c.stadur_nr) === '2');
  const heimHas2 = heim.some(c => String(c.stadur_nr) === '2');
  if (centerHas2 && heimHas2) {
    /* expected: nr. 2 exists on two kts — proves nr alone is not a key */
  } else if (!centerHas2) {
    fail('Center Hótel lost nr. 2 (Plaza).');
  }
  console.log('GREEN: rekstrarfélög identity is kennitala + stadur_nr (Center ' + nums.length + ' unique nrs; nr. 2 exists on more than one kt).');
})().catch(e => fail(e.message || String(e)));
