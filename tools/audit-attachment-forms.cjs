#!/usr/bin/env node
/* Regression net — a Drive/URL attachment is a REAL attachment.
 *
 * 2026-08-27 (Menja ehf. R-000831 — Agnar: „gat ekki sent reikninginn, kom
 * viðvörun að innihaldið væri tómt"): blank-invoice vörðurinn í 254 (settur
 * 2026-08-20) taldi viðhengi gilt AÐEINS ef það bar base64 `content`. En
 * gmail-send leysir ÞRJÚ form — `content`, `driveId` (Drive-skrá sótt þjónsmegin
 * með OAuth) og `url`. Hvert Drive-hýst skjal fékk því 0/N og sending var
 * stöðvuð: reikningar úr document_pairs urðu ósendanlegir í viku, þöglum megin
 * réttlætis („við sendum ekki tóman reikning") en rangt greint.
 *
 * Vörnin sjálf má ALDREI hverfa: hún færðist í gmail-send, sem er eini staðurinn
 * sem veit hvort driveId/url leystist í raun (ATTACHMENTS_FAILED, 422).
 *
 * SOURCE audit — engin lifandi sending. Run: node tools/audit-attachment-forms.cjs
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
let failed = 0;
function ok(msg) { console.log('  OK  ' + msg); }
function bad(msg) { console.log('  RED ' + msg); failed++; }
function src(rel) { return fs.readFileSync(path.join(ROOT, rel), 'utf8'); }

const rs = src('js/patches/254-receipt-sender.js');

// 1) Vörðurinn verður að hleypa öllum þremur formunum í gegn.
const filt = (rs.match(/const\s+_okAtts\s*=\s*atts\.filter\([\s\S]{0,400}?\);/) || [''])[0];
if (!filt) {
  bad('254: fann ekki _okAtts-síuna — vörðurinn hefur verið endurskrifaður, rektu vírinn upp á nýtt.');
} else {
  if (/a\.driveId/.test(filt) && /a\.url/.test(filt)) {
    ok('254: vörðurinn telur driveId og url gild viðhengi (Drive-skjöl sendanleg)');
  } else {
    bad('254: vörðurinn hafnar driveId/url — hvert Drive-hýst skjal verður „tómt" og ósendanlegt (Menja R-000831 veilan).');
  }
  if (/a\.content\s*&&\s*String\(a\.content\)\.length\s*>\s*\d+/.test(filt)) {
    ok('254: tómt/of stutt base64 er áfram stöðvað (blank-invoice vörnin heldur)');
  } else {
    bad('254: base64-lengdarprófið horfið — tómur teiknaður reikningur kæmist til kúnna.');
  }
}

// 2) Stöðvunin má ekki hverfa: logProblem + fail verða að standa.
if (/blank_invoice_blocked/.test(rs) && /Sendi EKKI á kúnna/.test(rs)) {
  ok('254: stöðvun + skráning (blank_invoice_blocked) á sínum stað');
} else {
  bad('254: blank_invoice_blocked stöðvunin er horfin — engin vörn gegn tómum reikningi klientmegin.');
}

// 3) Formin þrjú sem þjónninn leysir eru skjalfest í kallinu sjálfu.
if (/attachments:\s*atts/.test(rs)) {
  ok('254: viðhengin fara óbreytt í gmail-send (þjónninn leysir driveId/url)');
} else {
  bad('254: viðhengin fara ekki lengur beint í sendinguna — rektu vírinn.');
}

// 4) Systurvörnin lifir í brunaholf/gmail-send.js þegar repo-ið er við höndina.
const sib = path.join(ROOT, '..', 'brunaholf', 'netlify', 'functions', 'gmail-send.js');
if (fs.existsSync(sib)) {
  const gs = fs.readFileSync(sib, 'utf8');
  if (/ATTACHMENTS_FAILED/.test(gs) && /allowPartial/.test(gs)) {
    ok('brunaholf/gmail-send: neitar að senda leysist umbeðið viðhengi ekki (422 ATTACHMENTS_FAILED)');
  } else {
    bad('brunaholf/gmail-send: engin neitun við óleyst viðhengi — kúnni gæti fengið reikningslausan póst merktan „Sent".');
  }
} else {
  console.log('  --  brunaholf ekki í þessari vinnumöppu — þjóns-vörnin ekki prófuð hér');
}

if (failed) {
  console.log('\nRED: viðhengja-formin brotin — reikningar verða ósendanlegir eða tómir. Sjá docs/ORYGGISNET.md.');
  process.exit(1);
}
console.log('OK — content/driveId/url teljast öll gild viðhengi; tómt base64 stöðvað klientmegin, óleyst viðhengi stöðvuð þjónsmegin.');
