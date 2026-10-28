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

const idx = lesa('index.html');
const iS = idx.indexOf('488-vidbotar-uttekt.js');
if (iS < 0) brot.push('index.html hleður ekki 488-vidbotar-uttekt.js');
else for (const d of ['129-company-total-cost.js', '165-visit-workflow.js', '168-company-inspection-report.js']) {
  const i = idx.indexOf(d); if (i < 0 || i > iS) brot.push('488 hleðst á undan ' + d);
}

if (brot.length) { console.log('✗ viðbótarúttekt: ' + brot.length + ' brot'); brot.forEach(b => console.log('  - ' + b)); process.exit(1); }
console.log('✓ viðbótarúttekt: aldrei send héðan · sala aðeins eftir staðfestingu · „Nei" á þjóni · 168 tekur við af eldri skýrslu · gildistökumörk til');
