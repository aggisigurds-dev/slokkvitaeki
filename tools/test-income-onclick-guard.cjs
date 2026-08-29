#!/usr/bin/env node
'use strict';
/**
 * Source contracts for the 2026-08-29 audit fixes:
 *  - Tekjur v2 race must not assign .onclick on a missing #_pm_csv_export
 *  - NETLIFY_TOKEN must not be a literal nfp_ value in the repo
 *  - HTML responses must send SAMEORIGIN (device-frame iframe), not DENY
 */
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
let failed = 0;
function ok(name, cond, detail) {
  if (cond) console.log('  OK  ' + name);
  else { failed++; console.log('  FAIL ' + name + (detail ? ' — ' + detail : '')); }
}

const legacy = fs.readFileSync(path.join(root, 'js/patches/00-legacy.js'), 'utf8');
ok('csv export onclick is null-guarded',
  /var csvBtn = document\.getElementById\('_pm_csv_export'\);\s*if\(!csvBtn\) return;\s*csvBtn\.onclick/.test(legacy));
ok('injectFinanceDash skips when Tekjur v2 owns the view',
  /function _tekjurOwnsIncome\(/.test(legacy) && /if\(_tekjurOwnsIncome\(\)\) return/.test(legacy));
ok('injectFinanceDash re-checks income-main after await',
  /main = document\.getElementById\('income-main'\);\s*if\(!main \|\| !main\.isConnected \|\| _tekjurOwnsIncome\(\)/.test(legacy));
ok('injectFinanceDash is wrapped in try/catch',
  /async function injectFinanceDash\(\)\{\s*try \{/.test(legacy) && /catch \(e\) \{/.test(legacy));
ok('ungarded _pm_csv_export.onclick is gone',
  !/getElementById\('_pm_csv_export'\)\.onclick/.test(legacy));

const backup = fs.readFileSync(path.join(root, 'js/patches/49-backup.js'), 'utf8');
ok('backup-btn onclick is null-guarded',
  /if \(backupBtn\) backupBtn\.onclick = backup/.test(backup));
ok('ungarded backup-btn.onclick is gone',
  !/getElementById\('backup-btn'\)\.onclick/.test(backup));

const sms = fs.readFileSync(path.join(root, 'js/patches/33-sms-reminder.js'), 'utf8');
ok('sms-save-btn onclick is null-guarded',
  /if \(smsSaveBtn\) smsSaveBtn\.onclick/.test(sms));

const toml = fs.readFileSync(path.join(root, 'netlify.toml'), 'utf8');
ok('X-Frame-Options is SAMEORIGIN', /X-Frame-Options = "SAMEORIGIN"/.test(toml));
ok('X-Frame-Options is not DENY (device-frame iframe)', !/X-Frame-Options = "DENY"/.test(toml));
ok('X-Content-Type-Options nosniff on /',
  /for = "\/"[\s\S]*?X-Content-Type-Options = "nosniff"/.test(toml));
ok('Referrer-Policy no-referrer on /',
  /for = "\/"[\s\S]*?Referrer-Policy = "no-referrer"/.test(toml));

const claude = fs.readFileSync(path.join(root, 'CLAUDE.md'), 'utf8');
ok('CLAUDE.md has no literal nfp_ token', !/nfp_[A-Za-z0-9]{10,}/.test(claude));
ok('CLAUDE.md still names the secret', /NETLIFY_TOKEN/.test(claude));

// Two-phase replica of injectFinanceDash: before-await vs after-await (Tekjur wipe).
function race(before, after) {
  var csvAssigned = false;
  var threw = false;
  var skipped = false;
  try {
    if (before.tekjurOwns) { skipped = true; return { csvAssigned, threw, skipped }; }
    var main = before.main;
    if (!main || !main.isConnected) { skipped = true; return { csvAssigned, threw, skipped }; }
    main = after.main;
    if (!main || !main.isConnected || after.tekjurOwns) { skipped = true; return { csvAssigned, threw, skipped }; }
    var csvBtn = after.csvBtn;
    if (!csvBtn) { skipped = true; return { csvAssigned, threw, skipped }; }
    csvBtn.onclick = function () {};
    csvAssigned = true;
  } catch (e) {
    threw = true;
  }
  return { csvAssigned, threw, skipped };
}
var wiped = race(
  { tekjurOwns: false, main: { isConnected: true } },
  { tekjurOwns: true, main: null, csvBtn: null }
);
ok('race: tekjur wipe does not throw', wiped.threw === false);
ok('race: tekjur wipe does not assign onclick', wiped.csvAssigned === false);
ok('race: tekjur wipe is treated as skip', wiped.skipped === true);

if (failed) {
  console.log('\n' + failed + ' contract(s) failed');
  process.exit(1);
}
console.log('\nall contracts passed');
