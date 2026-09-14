#!/usr/bin/env node
/* Vörður — Payday-höfnun á rafrænum reikningi (XML) er aldrei þögul (2026-09-14).
 *
 * Það sem gerðist: payday-push.js reynir alltaf rafrænan reikning (XML). Hafni
 * Payday honum með villu sem nefnir „electronic invoice" býr varaleiðin reikninginn
 * til aftur ÁN XML og sendir hann í pósti. Það er rétt — ekkert tapast — en
 * höfnunin fór AÐEINS í svar vafrans (smá-toast) og gleymdist. Plaza R-000852 og
 * Austurberg 20 R-000769 fóru þannig 31.08. í Payday án XML; enginn vissi fyrr en
 * 14.09. Agnar 14.09.: sendingin heldur áfram, en höfnunin skal (a) skráð í
 * app_problems, (b) stofna mál á Þjónustuborðinu og (c) spretta strax upp á skjánum.
 *
 * Les aðeins kóðann (ekkert net). RED ef:
 *   1) varaleiðin (/electronic invoice/i) eða markSaleInvoiced-kallið er horfið,
 *   2) mistekin endurtilraun án XML (invErr2) skilar 502 án skráningar eða án bord_mal_id,
 *   3) reikningur búinn til án XML skráist ekki, skráist ÁÐUR en salan er merkt send,
 *      eða 200-svarið ber ekki xml_villa + bord_mal_id,
 *   4) skraXmlHofnun skrifar ekki kind 'payday_xml_hafnad' í app_problems, stofnar ekki
 *      mál á Þjónustuborðinu (eitt per sölu, á Agnar, samthykki), gleypir ekki villur,
 *      eða hefur ekki raunverulegt tímaþak (setTimeout → ctl.abort + signal),
 *   5) kt getur ratað í skráninguna/málið,
 *   6) 166 sýnir ekki gluggann (synaXmlHofnun) í bæði stakri sendingu og fjöldasendingu,
 *      bæði við fellBackToNonElectronic og retriedWithoutElectronic — eða glugginn er
 *      aðeins toast (verður að vera fastur alertdialog sem notandinn lokar).
 */
const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.join(__dirname, '..', 'netlify/functions/payday-push.js'), 'utf8').replace(/\r\n/g, '\n');
const ky = fs.readFileSync(path.join(__dirname, '..', 'js/patches/166-krofu-yfirlit.js'), 'utf8').replace(/\r\n/g, '\n');
const brot = [];
const KALL = /(?:[\w$]+\s*=\s*)?await\s+skraXmlHofnun\s*\(/;
const KALL_G = /await\s+skraXmlHofnun\s*\(/g;

// ── payday-push: varaleiðin ────────────────────────────────────────────────
const iGrein = src.indexOf('/electronic invoice/i.test(msg)');
const iMerkt = src.indexOf('await markSaleInvoiced(sale.id, created);');
if (iGrein < 0) brot.push('fann ekki XML-varaleiðina (/electronic invoice/i.test(msg)) í payday-push.js — vörðurinn þarf að uppfærast með kóðanum');
if (iMerkt < 0) brot.push('fann ekki await markSaleInvoiced(sale.id, created) í payday-push.js — vörðurinn þarf að uppfærast með kóðanum');

if (iGrein > -1 && iMerkt > iGrein) {
  const iElse = src.indexOf('} else {', iGrein);
  const grein = src.slice(iGrein, iElse > iGrein && iElse < iMerkt ? iElse : iMerkt);
  if (!/fellBackToNonElectronic\s*=\s*true/.test(grein)) brot.push('varaleiðin merkir ekki fellBackToNonElectronic = true');
  if (!/xmlVilla\s*=\s*msg\b/.test(grein)) brot.push('varaleiðin geymir ekki Payday-villuna (xmlVilla = msg)');

  const iCatch = grein.indexOf('catch (invErr2)');
  const iRetur = grein.indexOf('retriedWithoutElectronic');
  const misheppnud = iCatch > -1 && iRetur > iCatch ? grein.slice(iCatch, iRetur) : '';
  if (!KALL.test(misheppnud)) brot.push('mistekin endurtilraun (invErr2) skilar 502 án þess að skrá höfnunina');
  const retur502 = iRetur > -1 ? grein.slice(iRetur, grein.indexOf('}', iRetur) + 1) : '';
  if (!/bord_mal_id/.test(retur502)) brot.push('502-svarið (retriedWithoutElectronic) ber ekki bord_mal_id — 166 getur ekki vísað á málið');

  const kallFyrir = (src.slice(iGrein, iMerkt).match(KALL_G) || []).length;
  if (kallFyrir !== 1) brot.push(`${kallFyrir} skráningarköll á milli varaleiðar og markSaleInvoiced — aðeins 502-greinin (invErr2) má skrá þar`);

  const eftir = src.slice(iMerkt, iMerkt + 1400);
  if (!/if\s*\(\s*fellBackToNonElectronic\s*\)\s*\{\s*(?:[\w$]+\s*=\s*)?await\s+skraXmlHofnun\s*\(\s*event\s*,\s*sale\s*,\s*xmlVilla\b/.test(eftir)) {
    brot.push('reikningur búinn til án XML skráist ekki á eftir markSaleInvoiced (if (fellBackToNonElectronic) { … await skraXmlHofnun(event, sale, xmlVilla, …) })');
  }
  const i200 = eftir.indexOf('return json(200, {');
  const svar200 = i200 > -1 ? eftir.slice(i200, eftir.indexOf('delivery:', i200)) : '';
  if (!/xml_villa\s*:/.test(svar200) || !/bord_mal_id/.test(svar200)) brot.push('200-svarið ber ekki xml_villa + bord_mal_id — glugginn í 166 fær ekki villuna/málið');
}

// ── payday-push: skraXmlHofnun ─────────────────────────────────────────────
const fall = (src.match(/async function skraXmlHofnun\([^)]*\)\s*\{([\s\S]*?)\n\}/) || [])[1] || '';
if (!fall) {
  brot.push('fallið skraXmlHofnun vantar í payday-push.js');
} else {
  if (!/\/rest\/v1\/app_problems/.test(fall)) brot.push('skraXmlHofnun skrifar ekki í app_problems');
  if (!/kind:\s*'payday_xml_hafnad'/.test(fall)) brot.push("skraXmlHofnun skráir ekki kind 'payday_xml_hafnad'");
  if (!/\/rest\/v1\/thjonustubeidni\?[^`]*tags=cs\./.test(fall) || !/payday-xml-sala:/.test(fall)) brot.push('skraXmlHofnun flettir ekki upp fyrra máli sölunnar (tags=cs.["payday-xml-sala:<id>"]) — tvítekin mál');
  if (!/\/rest\/v1\/thjonustubeidni`/.test(fall) || !/return=representation/.test(fall)) brot.push('skraXmlHofnun stofnar ekki mál á Þjónustuborðinu (POST thjonustubeidni, return=representation)');
  if (!/assigned_to:\s*'Agnar'/.test(fall) || !/'samthykki'/.test(fall) || !/'payday-xml'/.test(fall)) brot.push("málið er ekki á Agnar með töggunum 'samthykki' + 'payday-xml'");
  if (!/Promise\.allSettled\(/.test(fall)) brot.push('skráning og mál eru ekki óháð (Promise.allSettled) — bilun í öðru má ekki fella hitt');
  if (!/\bcatch\s*\(/.test(fall)) brot.push('skraXmlHofnun gleypir ekki villur — skráning gæti fellt kröfusendingu');
  if (!/setTimeout\(\s*\(\)\s*=>\s*ctl\.abort\(\)/.test(fall) || !/signal:\s*ctl\.signal/.test(fall)) {
    brot.push('skraXmlHofnun hefur ekkert raunverulegt tímaþak (setTimeout(() => ctl.abort(), …) + signal: ctl.signal)');
  }
  if (/customer_kt|kennitala|\.ssn\b/.test(fall)) brot.push('skraXmlHofnun les kennitölu — kt má aldrei rata í app_problems/borðið');
  if (!/detail:\s*fela_kt\(/.test(fall)) brot.push('detail fer ekki gegnum fela_kt');
  if (!/title:\s*fela_kt\(/.test(fall) || !/summary:\s*fela_kt\(/.test(fall) || !/notes:\s*fela_kt\(/.test(fall)) brot.push('title/summary/notes málsins fara ekki öll gegnum fela_kt');
  if (!fall.includes('(?<!\\d)\\d{6}[-\\s_]?\\d{4}(?!\\d)')) {
    brot.push('fela_kt notar ekki kt-mynstrið úr gmail-send ((?<!\\d)\\d{6}[-\\s_]?\\d{4}(?!\\d)) — \\b-mynstrið lak 01.09.');
  }
}

// ── 166: glugginn strax ────────────────────────────────────────────────────
const synaFall = (ky.match(/function synaXmlHofnun\([^)]*\)\s*\{([\s\S]*?)\n  \}/) || [])[1] || '';
if (!synaFall) {
  brot.push('166 vantar function synaXmlHofnun — XML-höfnun sprettur ekki upp á skjánum');
} else {
  if (!/position:fixed/.test(synaFall) || !/alertdialog/.test(synaFall)) brot.push('166 synaXmlHofnun er ekki fastur alertdialog (position:fixed + role=alertdialog)');
  if (/Toast\.show/.test(synaFall)) brot.push('166 synaXmlHofnun notar Toast — toast hverfur og gleymist (Plaza 31.08.)');
  if (!/bord_mal_id/.test(synaFall)) brot.push('166 synaXmlHofnun vísar ekki á málið á Þjónustuborðinu (bord_mal_id)');
}
const fallbackKoll = (ky.match(/if\s*\(\s*j\.fellBackToNonElectronic\s*\)\s*synaXmlHofnun\(\s*sale\s*,\s*j\s*\)/g) || []).length;
if (fallbackKoll < 2) brot.push(`166 sýnir gluggann við fellBackToNonElectronic á ${fallbackKoll} stað(stöðum) — á að vera bæði stök sending og fjöldasending`);
const retriedKoll = (ky.match(/j\.retriedWithoutElectronic\s*\)\s*\{?\s*synaXmlHofnun\(\s*sale\s*,\s*j\s*\)/g) || []).length;
if (retriedKoll < 2) brot.push(`166 sýnir gluggann við retriedWithoutElectronic á ${retriedKoll} stað(stöðum) — á að vera bæði stök sending og fjöldasending`);

if (brot.length) {
  brot.forEach(b => console.log('  ✗ ' + b));
  console.log(`RED: ${brot.length} brot — XML-höfnun í Payday getur aftur orðið þögul. Sjá payday-push.js (skraXmlHofnun) og 166 (synaXmlHofnun).`);
  process.exit(1);
}
console.log('✅ GRÆNT payday-xml-skráning: app_problems + mál á borði (eitt per sölu) + gluggi í 166 (stök/fjölda), á eftir markSaleInvoiced, 3 s þak, engin kt.');
