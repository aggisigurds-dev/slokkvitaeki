#!/usr/bin/env node
/* Öryggisnet — skráarnöfn á PDF eiga að vera EITT snið (2026-09-30).
 *
 * Agnar: „að rétt format af nefningu skjala haldist … save as pdf með réttum
 * nöfnum" · „raun best að finna alla takka sem eiga að gera það sama og bera þá
 * saman og samræma."
 *
 * KANÓNÍSKA SNIÐIÐ er `window.Skjalanafn.buaTil()` (papp 233):
 *
 *     Fyrirtæki - kt - ár - R-xxxxxx - #<fyrirtaeki_id>.pdf
 *
 * `#<fyrirtaeki_id>` aftast er ekki skraut: það lætur lesarann í Bakenda tengja
 * skjalið BEINT á réttan stað í stað þess að giska á heimilisfang.
 *
 * Fram að 30.09 bjó þetta fall INNI í 233 og enginn annar komst í það. Þess
 * vegna fundu SJÖ aðrir staðir upp sitt eigið snið — mælt sama dag:
 *
 *   176  'Uttektarskyrsla.pdf'                    ekkert nafn, engin kt, ekkert ár
 *   190  '<nafn> - úttektarskýrsla <ár>'          engin kt, enginn id
 *   240  [nafn, R-nr]                             ekkert ár, enginn id
 *   254  'Reikningur <nr>.pdf'                    ekkert félag
 *   273  [nafn, kt, ár, 'brunakerfi-skoðunarskýrsla']   enginn id
 *   386  [nafn, kt, ár, 'slökkvikerfi-skoðunarskýrsla'] enginn id
 *   275  'Tilboð - <nafn> - <dags>'
 *   94   heiti útfyllta skjalsins
 *
 * HVERS VEGNA ÞETTA ER EKKI LAGAÐ Í EINU LAGI: skráarnafn er ekki bara útlit.
 * Skjölin eru ÞEGAR geymd undir þessum nöfnum í Drive og Supabase, og lesarinn
 * paraar þau við fyrirtæki á nafninu. Að breyta sniðinu á sjö stöðum í einu er
 * breyting á sögunni, ekki á kóðanum, og hún á að gerast vakandi.
 *
 * ÞESSI VÖRÐUR STOPPAR ÚTBREIÐSLUNA: hann fellur þegar NÝ smíði á PDF-skráarnafni
 * bætist við sem fer ekki gegnum Skjalanafn. Eftirstöðulistinn er skjalfestur og
 * á að LÆKKA, aldrei hækka.
 *
 * Aðeins lestur. Ekkert net.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
function fail(msg) { console.log('RED: ' + msg); process.exit(1); }

// Staðir sem smíða PDF-nafn án Skjalanafn, mældir 30.09.2026. LÆKKAÐU þessa
// tölu þegar hver þeirra er samræmdur; hækkaðu hana aldrei til að fá grænt.
// MÆLT 30.09.2026: 16. (Fyrra mat mitt, 8, var byggt á þrengri leit — ég
// leiðrétti það þegar vörðurinn var keyrður.)
//
// TVÆR RÉTTMÆTAR HEFÐIR, ekki ein. Ég ætla ekki að fletja þær út:
//   SKÝRSLUR   168: [nafn, heimilisfang, kt, ár, mánuður, 'úttektarskýrsla', #id]
//                   — þetta er sniðið sem skjölin á afgreiðslutölvunni bera
//                   („Pitstop þjónustan ehf. - Hjallahrauni 4 - 660219-0480 -
//                     R-000931 - 2026.pdf")
//   REIKNINGAR 233: [nafn, kt, ár, R-nr, #id]
// Samræmingin á að velja MILLI þeirra, ekki búa til þriðju. Það er ákvörðun
// Agnars því hún snertir skjöl sem eru ÞEGAR geymd undir gömlu nöfnunum.
const EFTIRSTODVAR = 16;

// Nafnasmíði: strengur sem endar á .pdf og er bundinn við filename/fname/namer/
// download — ekki hvaða .pdf-tilvitnun sem er (slóðir og athugasemdir sleppa).
const SMIDI = /(filename|fname|namer|\.download|skraarnafn)\s*[:=][^;\n]*\.pdf/i;

const skrar = [];
(function ganga(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) { if (!/node_modules|\.git|dist|_attic/.test(p)) ganga(p); continue; }
    if (e.name.endsWith('.js')) skrar.push(p);
  }
})(path.join(ROOT, 'js'));

const fundin = [];
for (const f of skrar) {
  const src = fs.readFileSync(f, 'utf8');
  const linur = src.split('\n');
  linur.forEach((lina, i) => {
    if (!SMIDI.test(lina)) return;
    // Notar hún kanónikuna? (á sömu línu eða í næsta nágrenni)
    const naerri = linur.slice(Math.max(0, i - 6), i + 2).join('\n');
    if (/Skjalanafn\s*\./.test(naerri)) return;
    // 233 sjálfur á kanónikuna og telst ekki frávik.
    if (/233-uttekt-pdf-autosave/.test(f)) return;
    fundin.push({ skra: path.relative(ROOT, f).replace(/\\/g, '/'), lina: i + 1, texti: lina.trim().slice(0, 74) });
  });
}

// Er kanónikan yfirleitt til? Hverfi hún er vörðurinn marklaus.
const p233 = path.join(ROOT, 'js/patches/233-uttekt-pdf-autosave.js');
if (!fs.existsSync(p233) || !/window\.Skjalanafn\s*=/.test(fs.readFileSync(p233, 'utf8'))) {
  fail('window.Skjalanafn er horfið úr 233 — kanóníska skráarnafnið er ekki lengur aðgengilegt og þessi vörður getur ekkert varið.');
}

console.log('   ' + fundin.length + ' staðir smíða PDF-nafn fram hjá Skjalanafn:');
fundin.slice(0, 14).forEach((x) => console.log('     ' + (x.skra.split('/').pop() + ':' + x.lina).padEnd(40) + x.texti));

if (fundin.length > EFTIRSTODVAR) {
  fail('NÝ smíði á PDF-skráarnafni bættist við (' + fundin.length + ' > ' + EFTIRSTODVAR + '). ' +
    'Notaðu window.Skjalanafn.buaTil(nafn, kt, ár, hali, fyrirtaeki_id) — sniðið ber #<id> sem lesarinn þarf til að tengja skjalið á réttan stað.');
}

console.log('✅ GRÆNT skjalanöfn: kanónikan er til (233) · ' + fundin.length +
  ' eftirstöðvar (<= ' + EFTIRSTODVAR + ') · engin NÝ smíði bættist við.');
