#!/usr/bin/env node
/* Vörður — Payday-höfnun á rafrænum reikningi (XML) er aldrei þögul (2026-09-14).
 *
 * Það sem gerðist: payday-push.js reynir alltaf rafrænan reikning (XML). Hafni
 * Payday honum með villu sem nefnir „electronic invoice" býr varaleiðin reikninginn
 * til aftur ÁN XML og sendir hann í pósti. Það er rétt — ekkert tapast — en
 * höfnunin fór AÐEINS í svar vafrans og gleymdist. Plaza R-000852 og Austurberg 20
 * R-000769 fóru þannig 31.08. í Payday án XML; enginn vissi fyrr en 14.09. þegar
 * Plaza var enn ógreitt. Agnar 14.09.: sendingin heldur áfram, en höfnunin skal
 * skráð í app_problems svo hægt sé að senda XML handvirkt úr Payday.
 *
 * Les aðeins kóðann (ekkert net). RED ef:
 *   1) varaleiðin (/electronic invoice/i) eða markSaleInvoiced-kallið er horfið —
 *      þá þarf að endurskoða vörðinn með kóðanum, ekki þagga hann,
 *   2) mistekin endurtilraun án XML (invErr2) skilar 502 án skráningar,
 *   3) reikningur búinn til án XML skráist ekki, eða skráist ÁÐUR en salan er merkt
 *      send — skráningin (≤3 s) má aldrei standa á milli þess að Payday býr reikninginn
 *      til og markSaleInvoiced (netvörður 14.09.: deyi fallið þar er salan ómerkt og
 *      endurtilraun býr til annan reikning),
 *   4) skraXmlHofnun skrifar ekki kind 'payday_xml_hafnad' í app_problems, gleypir ekki
 *      villur, eða hefur ekki raunverulegt tímaþak (setTimeout → ctl.abort + signal),
 *   5) kt getur ratað í skráninguna: fallið les kt, detail fer ekki gegnum fela_kt, eða
 *      fela_kt notar annað mynstur en gmail-send (\b-mynstrið lak 01.09.).
 * Stökkbreytingar M5 (þak fjarlægt) og M6 (fela_kt ekki beitt á detail) verða RAUÐAR.
 */
const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.join(__dirname, '..', 'netlify/functions/payday-push.js'), 'utf8').replace(/\r\n/g, '\n');
const brot = [];

const iGrein = src.indexOf('/electronic invoice/i.test(msg)');
const iMerkt = src.indexOf('await markSaleInvoiced(sale.id, created);');
if (iGrein < 0) brot.push('fann ekki XML-varaleiðina (/electronic invoice/i.test(msg)) í payday-push.js — vörðurinn þarf að uppfærast með kóðanum');
if (iMerkt < 0) brot.push('fann ekki await markSaleInvoiced(sale.id, created) í payday-push.js — vörðurinn þarf að uppfærast með kóðanum');

if (iGrein > -1 && iMerkt > iGrein) {
  const iElse = src.indexOf('} else {', iGrein);
  const grein = src.slice(iGrein, iElse > iGrein && iElse < iMerkt ? iElse : iMerkt);
  if (!/fellBackToNonElectronic\s*=\s*true/.test(grein)) brot.push('varaleiðin merkir ekki fellBackToNonElectronic = true');
  if (!/xmlVilla\s*=\s*msg\b/.test(grein)) brot.push('varaleiðin geymir ekki Payday-villuna (xmlVilla = msg) fyrir skráninguna');

  const iCatch = grein.indexOf('catch (invErr2)');
  const iRetur = grein.indexOf('retriedWithoutElectronic');
  const misheppnud = iCatch > -1 && iRetur > iCatch ? grein.slice(iCatch, iRetur) : '';
  if (!/await\s+skraXmlHofnun\s*\(/.test(misheppnud)) brot.push('mistekin endurtilraun (invErr2) skilar 502 án þess að skrá höfnunina');

  const kallFyrir = (src.slice(iGrein, iMerkt).match(/await\s+skraXmlHofnun\s*\(/g) || []).length;
  if (kallFyrir !== 1) brot.push(`${kallFyrir} skráningarköll á milli varaleiðar og markSaleInvoiced — aðeins 502-greinin (invErr2) má skrá þar`);

  const eftir = src.slice(iMerkt, iMerkt + 900);
  if (!/if\s*\(\s*fellBackToNonElectronic\s*\)\s*\{\s*await\s+skraXmlHofnun\s*\(\s*event\s*,\s*sale\s*,\s*xmlVilla\b/.test(eftir)) {
    brot.push('reikningur búinn til án XML skráist ekki á eftir markSaleInvoiced (if (fellBackToNonElectronic) { await skraXmlHofnun(event, sale, xmlVilla, …) })');
  }
}

const fall = (src.match(/async function skraXmlHofnun\([^)]*\)\s*\{([\s\S]*?)\n\}/) || [])[1] || '';
if (!fall) {
  brot.push('fallið skraXmlHofnun vantar í payday-push.js');
} else {
  if (!/\/rest\/v1\/app_problems/.test(fall)) brot.push('skraXmlHofnun skrifar ekki í app_problems');
  if (!/kind:\s*'payday_xml_hafnad'/.test(fall)) brot.push("skraXmlHofnun skráir ekki kind 'payday_xml_hafnad'");
  if (!/\bcatch\s*\(/.test(fall)) brot.push('skraXmlHofnun gleypir ekki villur — skráning gæti fellt kröfusendingu');
  if (!/setTimeout\(\s*\(\)\s*=>\s*ctl\.abort\(\)/.test(fall) || !/signal:\s*ctl\.signal/.test(fall)) {
    brot.push('skraXmlHofnun hefur ekkert raunverulegt tímaþak (setTimeout(() => ctl.abort(), …) + signal: ctl.signal)');
  }
  if (/customer_kt|kennitala|\.ssn\b/.test(fall)) brot.push('skraXmlHofnun les kennitölu — kt má aldrei rata í app_problems');
  if (!/detail:\s*fela_kt\(/.test(fall)) brot.push('detail fer ekki gegnum fela_kt — kt-líkar tölur geta ratað í app_problems');
  if (!fall.includes('(?<!\\d)\\d{6}[-\\s_]?\\d{4}(?!\\d)')) {
    brot.push('fela_kt notar ekki kt-mynstrið úr gmail-send ((?<!\\d)\\d{6}[-\\s_]?\\d{4}(?!\\d)) — \\b-mynstrið lak 01.09.');
  }
}

if (brot.length) {
  brot.forEach(b => console.log('  ✗ ' + b));
  console.log(`RED: ${brot.length} brot — XML-höfnun í Payday getur aftur orðið þögul. Sjá netlify/functions/payday-push.js (skraXmlHofnun).`);
  process.exit(1);
}
console.log('✅ GRÆNT payday-xml-skráning: höfnun skráð (502 í greininni, án-XML á eftir markSaleInvoiced), gleypir villur, 3 s þak, engin kt.');
