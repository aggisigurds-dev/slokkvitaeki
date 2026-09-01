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
  // 2026-09-01: strengirnir tveir að ofan duga EKKI einir. Meðan tveir verðir
  // með sama nafni lágu í skránni (sá frá 08-27 og sá nýi) hefði mátt eyða þeim
  // nýja — með registry-skráningunni — og þetta próf hefði samt verið GRÆNT af
  // því dauði tvífarinn uppfyllti greppið. Vörður sem audit sér ekki er vörður
  // sem hverfur þegjandi. Þess vegna er nú sannað hvert atriði fyrir sig.
  if (/allowPartial\s*!==\s*true/.test(gs)) {
    ok('brunaholf/gmail-send: allowPartial er STÍFT === true (truthy slekkur ekki á vörninni)');
  } else {
    bad('brunaholf/gmail-send: allowPartial-prófið er laust — `allowPartial:"nei"` myndi slökkva á vörninni.');
  }
  // Kallstaðurinn sjálfur, ekki bara nafnið: `_disabled_logAttachmentFailure`
  // inniheldur strenginn og hefði haldið þessu grænu meðan skráningin var slökkt.
  if (/await\s+logAttachmentFailure\s*\(/.test(gs) && /app_problems/.test(gs) && /attachments_failed/.test(gs)) {
    ok('brunaholf/gmail-send: stöðvuð sending er SKRÁÐ í app_problems (3×/dag sópunin sér hana)');
  } else {
    bad('brunaholf/gmail-send: stöðvunin er þögul — engin app_problems-skráning, sópunin sér hana aldrei.');
  }
  // Regla 6: skráanöfn bera kennitölu í 41% tilvika (mælt á 3.755 röðum), svo
  // hreinsunin er meginregla. `\b` dugar ekki — undirstrik er orðstafur.
  if (/scrubDetail/.test(gs) && /\(\?<!\\d\)/.test(gs)) {
    ok('brunaholf/gmail-send: kennitölur/slóðir hreinsaðar úr registry-detail (lookbehind, ekki \\b)');
  } else {
    bad('brunaholf/gmail-send: kennitala eða slóð með token gæti ratað í app_problems (regla 6).');
  }
} else {
  console.log('  --  brunaholf ekki í þessari vinnumöppu — þjóns-vörnin ekki prófuð hér');
}

if (failed) {
  console.log('\nRED: viðhengja-formin brotin — reikningar verða ósendanlegir eða tómir. Sjá docs/ORYGGISNET.md.');
  process.exit(1);
}
console.log('OK — content/driveId/url teljast öll gild viðhengi; tómt base64 stöðvað klientmegin, óleyst viðhengi stöðvuð þjónsmegin.');
