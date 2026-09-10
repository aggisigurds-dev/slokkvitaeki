#!/usr/bin/env node
'use strict';
/* VERKSTAÐA — verkbeiðni fær aðeins kanónískt stöðugildi.
 *
 * Af hverju hann er til (10.09.2026): 01-sala-suite.js skrifaði BIRTINGARTEXTA
 * sem stöðu — 'Tilbúið', 'Í vinnslu', 'Afhent', 'Greitt', 'Selt' — í stað geymdu
 * gildanna (received · inprogress · ready · collected · done). Ekkert annað í
 * kerfinu les þau gildi: verk sem fékk 'Afhent' hvarf úr öllum listum og taldist
 * OPIÐ á Stjórnstöð. Leiðirnar voru dauðar meðan síur Sölu-svítunnar hittu engar
 * raðir. Þegar síurnar voru lagaðar sama dag urðu takkarnir virkir — og þessi
 * skrif með. Enginn vörður sá það; prófunaragent fann það í viðmótinu.
 *
 * REGLAN: hvert stöðugildi sem kóðinn SKRIFAR á verkbeidnir — .update/.insert/
 * .upsert á .from('verkbeidnir'), updateVerkStatus(id, { status }) og
 * DB.updateJobStatus(id, status) — verður að vera í KANON hér að neðan.
 * Rautt frá fyrsta broti — engin grunnlína.
 *
 * Takmörk: grípur aðeins stöðugildi skrifuð sem strengur beint í kallinu.
 * Stöðu sem er sett saman í breytu annars staðar (t.d. updates-hlutur í 137)
 * sér hann ekki.
 *
 * Keyrsla: node tools/audit-verk-stada.cjs [mappa]    (sjálfgefið js)
 * Static — þarf hvorki net né lykla.
 */
const fs = require('fs');
const path = require('path');

const rot = path.join(__dirname, '..');
const mappa = process.argv[2] || path.join(rot, 'js');

// Kanónan fyrir verkbeidnir.status. js/utils.js (U.sl) er birtingarkort fyrir ALLAR
// stöður — líka tækja og skoðana (ok, due, pass, fail …) — og getur því ekki eitt og
// sér sagt hvað á heima á verkbeiðni. Listinn er skráður hér, og hvert gildi (nema
// 'eytt', mjúk eyðing í 78) verður að vera til sem lykill í U.sl; annars er listinn
// orðinn úreltur og vörðurinn segir það í stað þess að segja grænt.
const KANON = ['received', 'inprogress', 'ready', 'collected', 'done', 'eytt'];
const utils = fs.readFileSync(path.join(rot, 'js/utils.js'), 'utf8');
const sl = /\bsl\s*:\s*function\s*\(\s*\w+\s*\)\s*\{\s*var\s+\w+\s*=\s*\{([^}]*)\}/.exec(utils);
if (!sl) {
  console.log('RED: fann ekki U.sl í js/utils.js — vörðurinn getur ekki staðfest stöðukanónuna ' +
    'og segir því ekki grænt.');
  process.exit(1);
}
const slLyklar = new Set([...sl[1].matchAll(/(\w+)\s*:/g)].map(m => m[1]));
const vantar = KANON.filter(k => k !== 'eytt' && !slLyklar.has(k));
if (vantar.length) {
  console.log('RED: KANON í tools/audit-verk-stada.cjs passar ekki lengur við U.sl í js/utils.js — ' +
    'vantar þar: ' + vantar.join(', ') + '. Uppfærðu KANON áður en treyst er á vörðinn.');
  process.exit(1);
}
const KANON_SET = new Set(KANON);

const skrar = [];
(function ganga(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) { if (!/node_modules|\.git|dist/.test(p)) ganga(p); }
    else if (e.name.endsWith('.js')) skrar.push(p);
  }
})(mappa);

// Athugasemd sem LÝSIR gömlu villunni er ekki villan (sama aðferð og audit-pagination):
// athugasemdir út, línunúmer varðveitt.
const anAthugasemda = s => s
  .replace(/\/\*[\s\S]*?\*\//g, m => m.replace(/[^\n]/g, ' '))
  .replace(/(^|[^:])\/\/[^\n]*/g, (m, p1) => p1 + m.slice(p1.length).replace(/[^\n]/g, ' '));

const STADA = /(?:^|[,{\s])status\s*:\s*['"]([^'"]+)['"]/;
const brot = [];
const skra = (f, src, idx, gildi, leid) => {
  if (KANON_SET.has(gildi)) return;
  brot.push({
    f: path.relative(rot, f).split(path.sep).join('/'),
    lina: src.slice(0, idx).split('\n').length, gildi, leid,
  });
};

for (const f of skrar) {
  const src = anAthugasemda(fs.readFileSync(f, 'utf8'));
  let m;
  // 1) .from('verkbeidnir') … .update({ … status: 'X' … })  (líka insert/upsert)
  const fra = /\.from\(\s*['"]verkbeidnir['"]\s*\)/g;
  while ((m = fra.exec(src)) !== null) {
    const bitur = src.slice(m.index, m.index + 600).split(/;\s*\n/)[0];
    const skrif = /\.(update|insert|upsert)\(\s*\{([\s\S]*?)\}\s*\)/.exec(bitur);
    if (!skrif) continue;
    const st = STADA.exec(skrif[2]);
    if (st) skra(f, src, m.index, st[1], ".from('verkbeidnir')." + skrif[1]);
  }
  // 2) updateVerkStatus(id, { status: 'X' })
  const uvs = /updateVerkStatus\(\s*[^,()]+,\s*\{([^}]*)\}/g;
  while ((m = uvs.exec(src)) !== null) {
    const st = STADA.exec(m[1]);
    if (st) skra(f, src, m.index, st[1], 'updateVerkStatus');
  }
  // 3) DB.updateJobStatus(id, 'X')
  const ujs = /updateJobStatus\(\s*[^,()]+,\s*['"]([^'"]+)['"]/g;
  while ((m = ujs.exec(src)) !== null) skra(f, src, m.index, m[1], 'updateJobStatus');
}

const kanonTexti = KANON.join(' · ');
if (brot.length) {
  console.log('❌ audit-verk-stada: ' + brot.length + ' skrif á verkbeidnir.status utan kanónunnar:\n');
  for (const b of brot) {
    console.log('  ' + ("'" + b.gildi + "'").padEnd(13) + b.leid.padEnd(30) + b.f + ':' + b.lina);
  }
  console.log('\nKanónan: ' + kanonTexti);
  console.log('RED: ' + brot.length + ' stöðugildi sem ekkert annað í kerfinu les — verkið hverfur úr ' +
    'listum og telst opið á Stjórnstöð. Notaðu geymda gildið, ekki birtingartextann.');
  process.exit(1);
}
console.log('✅ GRÆNT verkstaða: öll skrif á verkbeidnir.status nota kanónuna (' + kanonTexti + ') — ' +
  skrar.length + ' skrár.');
