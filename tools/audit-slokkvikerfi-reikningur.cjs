#!/usr/bin/env node
'use strict';
/* SLÖKKVIKERFISREIKNINGUR — kyrrstæður vörður (05.10.2026).
 *
 * Af hverju: Agnar (Hótel Varmaland): „getum ekki útbúið reikninginn, bara skýrsluna … láta þetta virka svipað og
 * ársskoðun … fari svo í kröfuyfirlit með skýrslunni og sendir hana með". 386 stofnar nú sölu með source
 * 'slokkvikerfi'. Sá staður á líka slökkvitækja-úttektarskýrslu sama árs, svo fjórar línur verða að halda:
 *   (1) payday-push festir skýrslu AÐEINS á 'uttekt' og 'slokkvikerfi', og slökkvikerfissala fær AÐEINS
 *       slökkvikerfisskýrslu (findSlokkvikerfiPdf: engin fyrirtækjaviðhengi, engin slóð frá vafranum).
 *   (2) 166 resolveSkyrsla velur aðeins doc_type 'slokkvikerfi' fyrir slíka sölu og sleppir viðhengjunum.
 *   (3) 187/190 telja slökkvikerfisreikning EKKI sem slökkvitækjaúttekt (falskt grænt á árinu).
 *   (4) 386 tekur skoðunina (reikningur_at, skilyrt á updated_at) ÁÐUR en salan verður til, losar takið og
 *       skráir vanda (logProblem) ef salan vistast ekki — tvær vélar geta ekki gert tvo reikninga.
 * Gagnagrunnshliðin (vidskiptategund + sjálfvirk pörun) er í sql/slokkvikerfi_reikningur.sql.
 */
const fs = require('fs');
const path = require('path');
const rot = path.join(__dirname, '..');
const lesa = (p) => fs.readFileSync(path.join(rot, p), 'utf8');
const brot = [];
// fall frá skilgreiningu að lokasviga á SAMA inndrætti (efsta stig í .cjs, tvö bil inni í IIFE-patch)
const fall = (src, nafn) => {
  const m = src.match(new RegExp('\\n( *)(?:async\\s+)?function ' + nafn + '\\('));
  if (!m) return null;
  const upph = m.index + 1, endir = src.indexOf('\n' + m[1] + '}', upph);
  return endir < 0 ? null : src.slice(upph, endir + m[1].length + 2);
};

// (1) payday-push
const pp = lesa('netlify/functions/payday-push.cjs');
if (!/if \(sale\.source !== 'uttekt' && sale\.source !== 'slokkvikerfi'\) \{\s*attachSkipReason/.test(pp)) brot.push('payday-push: skýrslugáttin hleypir öðru en uttekt/slokkvikerfi í gegn (eða finnst ekki)');
if (!/sale\.source === 'slokkvikerfi'\s*\?\s*await findSlokkvikerfiPdf\(sale\)\s*:\s*await findReportPdf\(sale, body\.report_storage_path\)/.test(pp)) brot.push('payday-push: slökkvikerfissala sækir ekki skýrslu um findSlokkvikerfiPdf');
const fsk = fall(pp, 'findSlokkvikerfiPdf');
if (!fsk) brot.push('payday-push: findSlokkvikerfiPdf finnst ekki');
else {
  if (/company_attachments|fetchAppSettings|report_storage_path|explicit/i.test(fsk)) brot.push('payday-push: findSlokkvikerfiPdf les fyrirtækjaviðhengi eða slóð frá vafranum — þar eru slökkvitækjaskýrslur');
  if ((fsk.match(/doc_type=eq\.slokkvikerfi/g) || []).length < 2) brot.push('payday-push: findSlokkvikerfiPdf síar ekki báðar leitir á doc_type=slokkvikerfi');
  if (!/slokkvikerfi_skodanir\?sala_id=eq\./.test(fsk)) brot.push('payday-push: findSlokkvikerfiPdf fer ekki fyrst um tengingu skoðunarinnar (sala_id → doc_id)');
}

// (2) 166
const ky = lesa('js/patches/166-krofu-yfirlit.js');
const rs = fall(ky, 'resolveSkyrsla');
if (!rs) brot.push('166: resolveSkyrsla finnst ekki');
else {
  if (!/if \(!slokkvikerfi\) try \{[\s\S]{0,200}CompanyAttachments/.test(rs)) brot.push('166: slökkvikerfissala getur fengið fyrirtækjaviðhengi (slökkvitækjaskýrslu)');
  if (!/slokkvikerfi \?[^:]*gild\.find\(d => d\.doc_type === 'slokkvikerfi'\)\)\s*:/.test(rs.replace(/\n\s*/g, ' '))) brot.push('166: slökkvikerfissala velur ekki eingöngu doc_type slokkvikerfi');
}

// (3) 187 / 190
for (const f of ['js/patches/187-inservice-row-reports.js', 'js/patches/190-thjonustu-verkstaedi.js']) {
  const src = lesa(f), u = fall(src, 'isUttektInvoiceTeg');
  if (!u || !/t !== 'slokkvikerfi'/.test(u)) brot.push(path.basename(f) + ': isUttektInvoiceTeg telur slökkvikerfisreikning sem slökkvitækjaúttekt');
}
const s187 = lesa('js/patches/187-inservice-row-reports.js');
if (!/teg === 'bud' \|\| teg === 'brunakerfi' \|\| teg === 'slokkvikerfi'\) \{ if \(n\) skipNums\.add\(n\)/.test(s187)) brot.push('187: skipNums sleppir ekki slökkvikerfisreikningum');

// (4) 386
const sk = lesa('js/patches/386-slokkvikerfi-skyrsla.js');
const st = fall(sk, 'stofnaReikning');
if (!st) brot.push('386: stofnaReikning finnst ekki');
else {
  const iTak = st.indexOf("update({ reikningur_at: nu"), iIns = st.indexOf("from('solur').insert(");
  if (iTak < 0) brot.push('386: skoðunin er ekki tekin (reikningur_at) fyrir reikningsgerð');
  if (iTak > -1 && !/update\(\{ reikningur_at: nu, updated_by: notandi\(\) \}\)\.eq\('id', fersk\.id\)\.eq\('updated_at', fersk\.updated_at\)/.test(st)) brot.push('386: takið er ekki skilyrt á updated_at');
  if (iTak > -1 && iIns > -1 && iTak > iIns) brot.push('386: salan verður til ÁÐUR en skoðunin er tekin');
  if (!/source: 'slokkvikerfi'/.test(st) || !/greitt_med: 'reikningur'/.test(st)) brot.push("386: salan fær ekki source 'slokkvikerfi' / greitt_med 'reikningur'");
  if (/status:\s*'drog'/.test(st)) brot.push('386: salan er drög — Kröfu yfirlit sér hana ekki');
  if (!/update\(\{ reikningur_at: null \}\)/.test(st)) brot.push('386: takinu er ekki sleppt þegar salan vistast ekki');
  if (!/logProblem/.test(st)) brot.push('386: mistök í reikningsgerð eru ekki skráð (logProblem)');
}

// gagnagrunnshliðin á sér skrá
const sql = lesa('sql/slokkvikerfi_reikningur.sql');
if (!/new\.vidskiptategund := 'slokkvikerfi'/.test(sql) || !/v_teg in \('bud','slokkvikerfi'\)/.test(sql)) brot.push('sql/slokkvikerfi_reikningur.sql: tegundar- eða pörunarreglan vantar');

if (brot.length) { brot.forEach((b) => console.log('  ✗ ' + b)); console.log('RED: ' + brot.length + ' brot — slökkvikerfisreikningurinn getur borið ranga skýrslu eða tvítekist.'); process.exit(1); }
console.log('✅ GRÆNT slökkvikerfisreikningur: Payday festir aðeins slökkvikerfisskýrsluna · 166 velur hana eina · 187/190 telja hann ekki sem úttekt · 386 tekur skoðunina á undan sölunni og losar við villu');
