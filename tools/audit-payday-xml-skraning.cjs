#!/usr/bin/env node
/* Vörður — Payday-höfnun á rafrænum reikningi (XML) er aldrei þögul (2026-09-14).
 *
 * Það sem gerðist: payday-push.js reynir alltaf rafrænan reikning (XML). Hafni
 * Payday honum með villu sem nefnir „electronic invoice" býr varaleiðin reikninginn
 * til aftur ÁN XML og sendir hann í pósti. Það er rétt — ekkert tapast — en
 * höfnunin fór AÐEINS í svar vafrans og gleymdist. Plaza R-000852 og Austurberg 20
 * R-000769 fóru þannig 31.08. í Payday án XML; enginn vissi fyrr en 14.09. þegar
 * Plaza var enn ógreitt. Agnar 14.09.: sendingin heldur áfram, en höfnunin skal
 * skráð á Kerfisheilsu (app_problems) svo hægt sé að senda XML handvirkt úr Payday.
 *
 * Les aðeins kóðann (ekkert net). RED ef:
 *   1) varaleiðin (/electronic invoice/i) er horfin — þá þarf að endurskoða
 *      vörðinn með kóðanum, ekki þagga hann,
 *   2) varaleiðin skráir ekki höfnunina bæði þegar endurtilraun án XML tekst og
 *      þegar hún mistekst (502),
 *   3) skraXmlHofnun skrifar ekki kind 'payday_xml_hafnad' í app_problems,
 *   4) skraXmlHofnun getur fellt kröfusendinguna (gleypir ekki villur) eða hefur
 *      ekkert tímaþak (hæg Supabase má ekki halda sendingu í gíslingu),
 *   5) kennitala ratar í skráninguna (netvörður: aldrei persónu-kt í log).
 */
const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.join(__dirname, '..', 'netlify/functions/payday-push.js'), 'utf8');
const brot = [];

const iGrein = src.indexOf('/electronic invoice/i.test(msg)');
if (iGrein < 0) {
  brot.push('fann ekki XML-varaleiðina (/electronic invoice/i.test(msg)) í payday-push.js — vörðurinn þarf að uppfærast með kóðanum');
} else {
  const iElse = src.indexOf('} else {', iGrein);
  const grein = src.slice(iGrein, iElse > iGrein ? iElse : iGrein + 4000);
  const kallanir = (grein.match(/await\s+skraXmlHofnun\s*\(/g) || []).length;
  if (kallanir < 2) {
    brot.push(`varaleiðin skráir XML-höfnun ${kallanir}× — á að skrá bæði þegar endurtilraun án XML tekst og þegar hún mistekst`);
  }
  const iCatch = grein.indexOf('catch (invErr2)');
  const iRetur = grein.indexOf('retriedWithoutElectronic');
  const misheppnud = iCatch > -1 && iRetur > iCatch ? grein.slice(iCatch, iRetur) : '';
  if (!/await\s+skraXmlHofnun\s*\(/.test(misheppnud)) {
    brot.push('mistekin endurtilraun (invErr2) skilar 502 án þess að skrá höfnunina');
  }
  const eftirEndurtilraun = iRetur > -1 ? grein.slice(iRetur) : '';
  if (!/await\s+skraXmlHofnun\s*\(/.test(eftirEndurtilraun)) {
    brot.push('reikningur búinn til án XML (endurtilraun tókst) skráist ekki');
  }
}

const fall = (src.match(/async function skraXmlHofnun\([^)]*\)\s*\{([\s\S]*?)\n\}/) || [])[1] || '';
if (!fall) {
  brot.push('fallið skraXmlHofnun vantar í payday-push.js');
} else {
  if (!/\/rest\/v1\/app_problems/.test(fall)) brot.push('skraXmlHofnun skrifar ekki í app_problems');
  if (!/kind:\s*'payday_xml_hafnad'/.test(fall)) brot.push("skraXmlHofnun skráir ekki kind 'payday_xml_hafnad'");
  if (!/\bcatch\s*\(/.test(fall)) brot.push('skraXmlHofnun gleypir ekki villur — skráning gæti fellt kröfusendingu');
  if (!/AbortController/.test(fall) || !/signal/.test(fall)) brot.push('skraXmlHofnun hefur ekkert tímaþak (AbortController + signal)');
  if (/customer_kt|kennitala|\.ssn\b/.test(fall)) brot.push('skraXmlHofnun les kennitölu — kt má aldrei rata í app_problems');
  if (!/fela_kt|\\d\{6\}/.test(fall)) brot.push('skraXmlHofnun hreinsar ekki kennitölur úr Payday-villutextanum');
}

if (brot.length) {
  brot.forEach(b => console.log('  ✗ ' + b));
  console.log(`RED: ${brot.length} brot — XML-höfnun í Payday getur aftur orðið þögul. Sjá netlify/functions/payday-push.js (skraXmlHofnun).`);
  process.exit(1);
}
console.log('✅ GRÆNT payday-xml-skráning: varaleiðin skráir höfnun (tekst/mistekst) í app_problems, gleypir villur, 3 s þak, engin kt.');
