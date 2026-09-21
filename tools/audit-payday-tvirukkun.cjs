#!/usr/bin/env node
'use strict';
/* TVÍRUKKUNARVARNIR Í PAYDAY-SENDINGU — kyrrstæður vörður (21.09.2026).
 *
 * Af hverju: úttekt 21.09.2026 fann tvær leiðir að tvírukkun í netlify/functions/payday-push.js:
 *   (1) `await markSaleInvoiced(...)` — svarið var ALDREI lesið. Mistækist sú eina skrift var krafan komin í Payday
 *       en salan sat áfram í „Ósendar" og fór aftur daginn eftir.
 *   (2) „þegar send?" var LESIÐ efst en merkið SKRIFAÐ mörgum sekúndum síðar án skilyrðis — tvær vélar (eða fjölda-
 *       sending + stakur smellur) gátu báðar stofnað reikning fyrir sömu sölu.
 * Varnirnar: frátekt (takaFra: skilyrt PATCH á krafa_sendir_at) ÁÐUR en Payday er kallað; writeback lesið með
 * gate:'writeback' + skráningu + gátt sem stöðvar endursendingu. Þessi vörður fellur ef einhver þeirra hverfur.
 * Hegðunin sjálf er prófuð á gervineti (sjá ORYGGISNET.md, 21.09.2026) — hér er aðeins gætt að vírarnir standi.
 */
const fs = require('fs');
const path = require('path');
const src = fs.readFileSync(path.join(__dirname, '..', 'netlify', 'functions', 'payday-push.js'), 'utf8');
const brot = [];
const i = (s) => src.indexOf(s);

const iFra = i('await takaFra(sale.id)');
const iCreate = i('created = await createInvoice(');
// innskráningin sem tilheyrir SENDINGUNNI er sú síðasta á undan createInvoice (afturköllunarleiðin efst á sína eigin)
const iToken = iCreate > -1 ? src.lastIndexOf('const token = await getAccessToken();', iCreate) : -1;
if (iFra < 0) brot.push('frátekt vantar: `await takaFra(sale.id)` finnst ekki');
if (iFra > -1 && iToken > -1 && iFra > iToken) brot.push('frátektin kemur Á EFTIR Payday-innskráningu — hún verður að standa á undan öllu sem snertir Payday');
if (iFra > -1 && iCreate > -1 && iFra > iCreate) brot.push('frátektin kemur á eftir createInvoice');
if (!/if\s*\(\s*!fratekt\.ok\s*\)\s*return\s+json\(\s*409/.test(src)) brot.push('mistekin frátekt skilar ekki 409 — sendingin héldi áfram');

const mTaka = src.match(/async function takaFra\([\s\S]*?\n}/);
if (!mTaka) brot.push('fallið takaFra finnst ekki');
else {
  const t = mTaka[0];
  if (!/dk_invoice_id=is\.null/.test(t) || !/invoiced_at=is\.null/.test(t)) brot.push('takaFra er ekki skilyrt á „ekki þegar send" (dk_invoice_id / invoiced_at is.null)');
  if (!/krafa_sendir_at\.is\.null/.test(t) || !/krafa_sendir_at\.lt\./.test(t)) brot.push('takaFra er ekki skilyrt á lausa/útrunna frátekt');
  if (!/return=representation/.test(t)) brot.push('takaFra les ekki hvort röð uppfærðist (return=representation)');
}
if (!/const merkt = await markSaleInvoiced\(sale\.id, created\);/.test(src)) brot.push('svar markSaleInvoiced er ekki lesið');
if (!/if\s*\(\s*!merkt\.ok\s*\)[\s\S]{0,700}gate:\s*'writeback'/.test(src)) brot.push('mistekin merking skilar ekki gate:writeback');
if (!/await skraWritebackBrast\(/.test(src)) brot.push('mistekin merking er ekki skráð (skraWritebackBrast)');
if (!/const brast = await writebackBrast\(saleId\);[\s\S]{0,200}return json\(409/.test(src)) brot.push('gáttin sem stöðvar endursendingu eftir mistekna merkingu vantar');
const mMerk = src.match(/async function markSaleInvoiced\([\s\S]*?\n}/);
if (mMerk && !/krafa_sendir_at:\s*null/.test(mMerk[0])) brot.push('merkingin hreinsar ekki frátektina');

if (brot.length) { brot.forEach((b) => console.log('  ✗ ' + b)); console.log('RED: ' + brot.length + ' brot — tvírukkunarvörn í payday-push.js hefur veikst.'); process.exit(1); }
console.log('✅ GRÆNT payday-tvírukkun: frátekt á undan Payday (skilyrt, 409 við höfnun) · writeback lesið (gate:writeback + skráning + endursendingargátt) · frátekt hreinsuð við merkingu');
