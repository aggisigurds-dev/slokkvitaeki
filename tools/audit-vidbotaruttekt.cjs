#!/usr/bin/env node
'use strict';
/* VIÐBÓTARÚTTEKT (patch 488, 28.10.2026) — kóðavörður, án nets.
 *
 * Ósk Agnars: bætist tæki við EFTIR úttektarreikning á að birtast spurning „Viltu gera viðbótarúttekt?". Ekkert má
 * gerast sjálfkrafa og „aldrei rukka mismun eftir á" stendur (sjálfgefið svar er NEI). Þessi vörður fellur ef:
 *   1. patch 488 snertir sendingu (payday-push, krafa_sent_at, dk_invoice_id, invoiced_at, fetch) — viðbót er aldrei send héðan;
 *   2. sala er stofnuð annars staðar en í klara() EFTIR confirm(), eða oftar en einu sinni;
 *   3. viðbótarreikningurinn ber ekki krafa_note sem byrjar á „Viðbótarúttekt við " (þannig þekkist hann í endurskoðun);
 *   4. „Nei" skrifar sölu í stað þess að merkja tækin afgreidd á þjóninum (AppSettings, ekki localStorage);
 *   5. gildistöku-mörkin (FRA) vantar — án þeirra dynur spurningin á félögum með gömul tæki (93 félög mæld 28.10);
 *   6. 168 tekur ekki við af eldri skýrslu (CIR_VIDBOT + fjarlæging) — payday-push festir fyrstu skýrslu ársins;
 *   7. útflutningar sem 488 lesir (129 CtcPricing, 165 VisitWorkflowReikn) eða <script>-línan í index.html vantar.
 */
const fs = require('fs');
const path = require('path');
const rot = path.join(__dirname, '..');
const lesa = f => fs.readFileSync(path.join(rot, f), 'utf8').replace(/\r/g, '');
const brot = [];

const p488 = lesa('js/patches/488-vidbotar-uttekt.js');
const kodi = p488.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

for (const [re, lysing] of [
  [/payday-push/, 'vísar í payday-push'], [/krafa_sent_at/, 'snertir krafa_sent_at'], [/dk_invoice_id/, 'snertir dk_invoice_id'],
  [/invoiced_at/, 'snertir invoiced_at'], [/\bfetch\s*\(/, 'kallar fetch()'], [/krafa_sendir_at/, 'snertir krafa_sendir_at']
]) if (re.test(kodi)) brot.push('488 ' + lysing + ' — viðbót er aldrei send héðan');

const inserts = kodi.match(/from\('solur'\)\s*\.insert/g) || [];
if (inserts.length !== 1) brot.push('488 á að stofna sölu á NÁKVÆMLEGA einum stað (fann ' + inserts.length + ')');
const iKlara = kodi.indexOf('async function klara');
const iConfirm = kodi.indexOf('confirm(', iKlara);
const iInsert = kodi.indexOf("from('solur').insert");
if (iKlara < 0) brot.push('klara() vantar');
else if (iConfirm < 0 || iInsert < iConfirm) brot.push('salan er stofnuð áður en notandinn staðfestir (confirm) — ekkert má gerast sjálfkrafa');
if (!/krafa_note:\s*MARKI\s*\+/.test(kodi) || !/MARKI\s*=\s*'Viðbótarúttekt við '/.test(kodi)) brot.push('krafa_note viðbótarreiknings byrjar ekki á „Viðbótarúttekt við "');

const mNei = kodi.match(/async function nei\([\s\S]*?\n  }\n/);
if (!mNei) brot.push('nei() vantar');
else {
  if (/\.insert|from\('solur'\)/.test(mNei[0])) brot.push('„Nei" býr til sölu — á aðeins að merkja tækin afgreidd');
  if (!/AppSettings\.save\(\s*\{\s*vidbot_uttekt/.test(mNei[0])) brot.push('„Nei" vistar ekki á þjón (AppSettings vidbot_uttekt) — regla 15.10.2026: engin stilling bara í einu tæki');
}
if (!/const FRA\s*=/.test(kodi) || !/Math\.max\(.*,\s*FRA\)/.test(kodi)) brot.push('gildistöku-mörk (FRA) vantar eða eru ekki notuð í t0');
if (!/skra\('vidbot_sala_brast'/.test(kodi)) brot.push('vidbot_sala_brast er ekki skráð með logProblem');
if (/localStorage\.setItem/.test(kodi)) brot.push('488 skrifar í localStorage — staða á að vera á þjóni');

const p168 = lesa('js/patches/168-company-inspection-report.js');
if (!/window\.CIR_VIDBOT/.test(p168) || !/vidbot_skyrsla_eldri_eftir/.test(p168)) brot.push('168 tekur ekki við af eldri skýrslu ársins eftir viðbótarúttekt (CIR_VIDBOT)');
if (!/CompanyAttachments\.delete\(co\.id, a\)/.test(p168)) brot.push('168 fjarlægir ekki eldri skýrslu ársins');
if (!/window\.CtcPricing\s*=/.test(lesa('js/patches/129-company-total-cost.js'))) brot.push('129 flytur ekki út CtcPricing.normalizeTypeFamily');
if (!/window\.VisitWorkflowReikn\s*=\s*\{[^}]*totalsFromLinur/.test(lesa('js/patches/165-visit-workflow.js'))) brot.push('165 flytur ekki út VisitWorkflowReikn.totalsFromLinur');

// Endurskoðun netvarðar 28.10.2026 (CUTS-A-WIRE → lagað):
const iKl = kodi.indexOf('async function klara');
const klaraKodi = iKl >= 0 ? kodi.slice(iKl, kodi.indexOf('async function bidaSkyrslu', iKl)) : '';
const iConf = klaraKodi.indexOf('confirm(');
const iFersk = klaraKodi.indexOf('saekja(coId, true)');
if (iConf < 0 || iFersk < iConf) brot.push('klara() les ekki stöðuna ferskt EFTIR confirm() — annað tæki getur hafa gert viðbótina');
if (!/from\('uttaeki'\)\.select\('id,status,fyrirtaeki_id,created_at'\)\.in\('id'/.test(klaraKodi)) brot.push('klara() endurles ekki tækin eftir staðfestingu — reikningur byggður úr gamalli mynd');
if (!/utanVerkbeidna\(.*,\s*true\)/.test(klaraKodi)) brot.push('klara() athugar ekki verkbeiðnir LOKAÐ (strict) — tæki á verkbeiðni gætu tvírukkast');
if (!/await CompanyInspectionReport\.open\(coId\)/.test(klaraKodi) || !/bidaSkyrslu\(coId, sala\)/.test(klaraKodi)) brot.push('klara() bíður ekki eftir að ný skýrsla vistist (bidaSkyrslu)');
if (!/rk\.vantar \|\| rk\.hopur/.test(kodi)) brot.push('Klára er ekki læst þegar afsláttarhópur náðist ekki (rk.hopur)');
if (!/gate:\s*'vidbot_skyrsla'/.test(lesa('netlify/functions/payday-push.cjs'))) brot.push('payday-push stöðvar ekki viðbótarkröfu með gamalli/engri skýrslu (gate vidbot_skyrsla)');
if (!/if \(!attachReport\) return json\(409, \{ gate: 'vidbot_skyrsla'/.test(lesa('netlify/functions/payday-push.cjs'))) brot.push('payday-push leyfir attach_report=false á viðbótarkröfu (gamla gatið: hliðið var hunsað)');
for (const f of ['tools/trio.cjs', 'netlify/functions/trio.js']) {
  if (!/krafa_note/.test(lesa(f)) || !/\^Viðbótarúttekt við /.test(lesa(f))) brot.push(f + ' sleppir ekki viðbótarsölu — nýjasta salan (aðeins nýju tækin) rænir tölu aðalreikningsins í trio');
}
if (!/addUnitsOnSite\(c\.nafn \|\| '', type, size, count, c\.id\)/.test(lesa('js/patches/219-bilstjori.js')) || !/fyrirtaeki_id: \+coId/.test(lesa('js/patches/219-bilstjori.js'))) brot.push('219 Bílstjóri býr til tæki án fyrirtaeki_id — viðbótarkassinn (488) sér þau ekki');
if (!/not like ''Viðbótarúttekt við %''/.test(lesa('sql/2026-10-29_heilsucheck_vidbot_uttekt.sql'))) brot.push('sql/2026-10-29_heilsucheck_vidbot_uttekt.sql vantar (heilsucheck telur viðbót sem tvítekna úttekt)');
if (!/async function parReikningur/.test(kodi) || !/from\('document_pairs'\)/.test(kodi) || !/vidbot_par_brast/.test(kodi)) brot.push('488 sér ekki reikning ársins gegnum document_pairs (samreikningar / Payday-skjöl) — staðir án eigin sölu fá aldrei kassann');
if (/parReikningur[\s\S]{0,2500}\.insert\(/.test(kodi.slice(kodi.indexOf('async function parReikningur'), kodi.indexOf('async function parReikningur') + 3500))) brot.push('parReikningur má aðeins LESA (engin skrif í document_pairs/solur)');
if (!p168.includes("' - úttektarskýrsla - #' + co.id +")) brot.push('168 eyðir fleiru en nákvæmlega úttektarskýrslunni sem appið bjó til (… - úttektarskýrsla - #<id>.pdf) — handinnhlaðin skjöl eiga að vera í friði');
if (!/sala_nums/.test(kodi) || !/vidbot_merking_brast/.test(kodi)) brot.push('488 skráir ekki númer viðbótarsölunnar (vidbot_uttekt.<fyrirtæki>.sala_nums) — krafa_note er ritanlegt í Kröfu yfirliti og hliðið má ekki hvíla á því einu');
if (!/sala_nums/.test(lesa('netlify/functions/payday-push.cjs'))) brot.push('payday-push les ekki sala_nums — hliðið hvílir á ritanlegum krafa_note');
if (!/vidbot_skyrsla_vistun_brast/.test(p168)) brot.push('168 skráir ekki bilaða vistun viðbótarskýrslu (logProblem)');

// Allir sem völdu „nýjasta/fyrsta úttektarreikning ársins" verða að þekkja viðbótina (annars tekur hún sæti aðalreikningsins).
for (const f of ['166-krofu-yfirlit', '175-rekstrarfelog', '199-doc-year-grid', '226-uttekt-reader', '253-sala-customer-history', '311-doc-pairs-band', '328-uttekt-vorn']) {
  if (!/VidbotUttekt\s*&&\s*VidbotUttekt\.erVidbot/.test(lesa('js/patches/' + f + '.js'))) brot.push(f + ' þekkir ekki viðbótarreikning (VidbotUttekt.erVidbot) — viðbótin gæti tekið sæti aðalreikningsins');
}
if (!/window\.VidbotUttekt\s*=\s*Object\.assign\(window\.VidbotUttekt\s*\|\|\s*\{\},\s*\{\s*erVidbot/.test(kodi)) brot.push('488 flytur ekki erVidbot út snemma (window.VidbotUttekt)');
if (!/CIR_VIDBOT\.month/.test(kodi) && !/month:\s*manudur/.test(kodi)) brot.push('488 sendir ekki skoðunarmánuð upprunalegu skýrslunnar til 168 (mánuður má aldrei færast)');
if (!/_vb0/.test(p168)) brot.push('168 erfir ekki skoðunarmánuðinn við viðbótarskýrslu (_vb0)');

// „Annað" á viðbótarskýrslu (29.10.2026): 488 sendir setninguna um nýju tækin með CIR_VIDBOT, 168 bætir henni aftan við án þess að yfirskrifa.
if (!/annad:\s*annadVidbot/.test(kodi) || !/'Viðbótarúttekt: '/.test(kodi)) brot.push('488 sendir ekki setninguna um nýju tækin (CIR_VIDBOT.annad) í „Annað" á viðbótarskýrslunni');
if (!/_vb0\.annad && annad\.indexOf\(_vb0\.annad\) < 0/.test(p168) || !/annad:\s*annadMed/.test(p168)) brot.push('168 bætir ekki CIR_VIDBOT.annad aftan við „Annað" (eða yfirskrifar/tvítekur texta)');

const idx = lesa('index.html');
const iS = idx.indexOf('488-vidbotar-uttekt.js');
if (iS < 0) brot.push('index.html hleður ekki 488-vidbotar-uttekt.js');
else for (const d of ['129-company-total-cost.js', '165-visit-workflow.js', '168-company-inspection-report.js']) {
  const i = idx.indexOf(d); if (i < 0 || i > iS) brot.push('488 hleðst á undan ' + d);
}

// 31.10.2026 (allsherjar úttekt): /^R-0d{5}$/ í 488 — „d" bókstafur — passaði aldrei við R-númer, svo dagsetning
// samreiknings án doc_date var aldrei sótt af sölunni. Hvert /^R-0…$/-mynstur í 488 verður að þekkja okkar eigin númer.
for (const lit of (kodi.match(/\/\^R-0[^\/\n]*\$\//g) || [])) {
  let re = null;
  try { re = new Function('return ' + lit)(); } catch (e) { brot.push('488: mynstrið ' + lit + ' þýðist ekki'); continue; }
  if (!re.test('R-001250')) brot.push('488: mynstrið ' + lit + ' þekkir ekki R-001250 (vantar \\ á undan d?)');
  if (re.test('R-0d1250')) brot.push('488: mynstrið ' + lit + ' tekur við bókstöfum');
}
if (brot.length) { console.log('✗ viðbótarúttekt: ' + brot.length + ' brot'); brot.forEach(b => console.log('  - ' + b)); process.exit(1); }
console.log('✓ viðbótarúttekt: aldrei send héðan · sala aðeins eftir staðfestingu · „Nei" á þjóni · 168 tekur við af eldri skýrslu · gildistökumörk til');
