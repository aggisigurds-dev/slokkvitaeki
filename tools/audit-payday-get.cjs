#!/usr/bin/env node
/* Regression net — Payday GET must never write.
 *
 * 2026-08-25: GET /api/payday-sync-paid and GET /api/payday-pull-slokk used to
 * mutate production (mark solur.paid_at / upsert payday_invoices_slokk) with
 * no login. Writes belong on POST (cron + Kröfu yfirlit 🔄).
 *
 * This is a SOURCE audit — do NOT hit the live GET (that was the bug).
 * Run: node tools/audit-payday-get.cjs
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
let failed = 0;
function ok(msg) { console.log('  OK  ' + msg); }
function bad(msg) { console.log('  RED ' + msg); failed++; }
function src(rel) { return fs.readFileSync(path.join(ROOT, rel), 'utf8'); }

const sync = src('netlify/functions/payday-sync-paid.js');
const pull = src('netlify/functions/payday-pull-slokk.js');
const cron = src('netlify/functions/payday-sync-cron.js');

if (/httpMethod\s*!==\s*['"]POST['"]/.test(sync) && /const dry\s*=/.test(sync)) {
  ok('payday-sync-paid: dry is forced unless POST');
} else {
  bad('payday-sync-paid: GET can still write — dry must include httpMethod !== \'POST\'');
}
if (/if\s*\(\s*!dry\s*\)\s*await markPaid/.test(sync) || /if\s*\(\s*!dry\s*\)/.test(sync) && /markPaid/.test(sync)) {
  ok('payday-sync-paid: markPaid still gated on !dry');
} else {
  bad('payday-sync-paid: markPaid is not gated on !dry');
}

if (/httpMethod\s*!==\s*['"]POST['"]/.test(pull) && /const isDry\s*=/.test(pull)) {
  ok('payday-pull-slokk: isDry is forced unless POST');
} else {
  bad('payday-pull-slokk: GET can still upsert — isDry must include httpMethod !== \'POST\'');
}
if (/httpMethod\s*!==\s*['"]GET['"]\s*&&\s*event\.httpMethod\s*!==\s*['"]POST['"]/.test(pull)) {
  ok('payday-pull-slokk: accepts GET and POST');
} else {
  bad('payday-pull-slokk: must accept POST (cron write path) as well as GET');
}
if (/if\s*\(\s*isDry\s*\)/.test(pull) && /payday_invoices_slokk/.test(pull)) {
  ok('payday-pull-slokk: upsert sits behind isDry');
} else {
  bad('payday-pull-slokk: upsert is not behind isDry');
}

if (/payday-pull-slokk['"]\s*,\s*\{[\s\S]*?method:\s*['"]POST['"]/.test(cron)) {
  ok('payday-sync-cron: mirror pull uses POST');
} else {
  bad('payday-sync-cron: must POST /api/payday-pull-slokk or the daily mirror dies');
}
if (/payday-sync-paid['"]\s*,\s*\{[\s\S]*?method:\s*['"]POST['"]/.test(cron)) {
  ok('payday-sync-cron: paid-sync uses POST');
} else {
  bad('payday-sync-cron: paid-sync must stay on POST');
}

function dryOf(method, bodyDry, pDry) {
  return method !== 'POST' || !!bodyDry || !!pDry;
}
if (dryOf('GET', false, false) && dryOf('GET', false, '0') && !dryOf('POST', false, false) && dryOf('POST', true, false)) {
  ok('dry helper: GET always dry, POST writes unless asked dry');
} else {
  bad('dry helper truth table failed');
}

if (failed) {
  console.log('\nRED: GET-mutate guard missing — reconnect before push.');
  process.exit(1);
}
console.log('OK — GET cannot write Payday sales/mirror; cron POSTs both legs.');
