#!/usr/bin/env node
/* Vörður — canonical skoðunarmánuður í RÆSINGU (patch 312 + 89, 2026-09-14).
 *
 * Rótin sem fannst: CanonStadur.ready() var kallað áður en DB.init (DOMContentLoaded) bjó til
 * Supabase-biðlarann. _load() skilaði þá {} án þess að spyrja viewið, 312 skráði
 * „v_stadur_yfirlit skilaði 0 röðum" (987 falskar raðir í app_problems 24.08–14.09 á meðan
 * viewið hafði 1179 raðir — edge_logs sýndu skráninguna á undan fyrsta GET), og kallendur
 * fengu tómt kort: 89 merkti mánaðar-listann hlaðinn og endurreyndi aldrei.
 *
 * Les aðeins kóðann (ekkert net). Krefst þess að:
 *   1) _load bíði eftir biðlaranum (_waitSb) í stað þess að skila {} þegar hann vantar,
 *   2) villa í síðuflettingu kasti — aldrei `if(r.error) break` (þá yrði villa að „0 röðum"),
 *   3) báðar skráningarnar (canon_stadur_empty og canon_stadur_load_failed) séu enn til staðar,
 *   4) 89 merki mánaðar-listann hlaðinn AÐEINS þegar kortið hefur raðir.
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const src312 = fs.readFileSync(path.join(root, 'js/patches/312-canon-stadur.js'), 'utf8');
const src89 = fs.readFileSync(path.join(root, 'js/patches/89-monthly-inspection-strip.js'), 'utf8');

const brot = [];
const load = (src312.match(/async function _load\(\)\s*\{([\s\S]*?)\n  \}/) || [])[1] || '';

if (!load) {
  brot.push('fann ekki _load() í 312 — vörðurinn þarf að uppfærast með kóðanum');
} else {
  if (/if\s*\(\s*!\s*SB\s*\)\s*return\s*\{\s*\}/.test(load)) {
    brot.push('312 _load skilar {} þegar Supabase-biðlarinn vantar → falskt canon_stadur_empty í ræsingu');
  }
  if (!/_waitSb\s*\(/.test(load)) {
    brot.push('312 _load bíður ekki eftir Supabase-biðlaranum (_waitSb)');
  }
  if (/\bcatch\s*\(/.test(load)) {
    brot.push('312 _load gleypir villur (try/catch) — villan á að ná til ready().catch og skrást sem load_failed');
  }
}
if (/if\s*\(\s*r\.error\s*\)\s*break/.test(src312)) {
  brot.push('312 breytir villu í síðuflettingu í „0 raðir" (if(r.error) break) — á að kasta');
}
if (!/logProblem\('canon_stadur_empty'/.test(src312)) {
  brot.push('canon_stadur_empty-skráningin er horfin úr 312 (netvordur vír 3)');
}
if (!/logProblem\('canon_stadur_load_failed'/.test(src312)) {
  brot.push('canon_stadur_load_failed-skráningin er horfin úr 312 (netvordur vír 3)');
}
const merkingar = (src89.match(/__misCanonLoaded\s*=\s*true/g) || []).length;
const vardar = (src89.match(/Object\.keys\(\s*m\s*\)\.length\s*\)\s*window\.__misCanonLoaded\s*=\s*true/g) || []).length;
if (merkingar !== vardar) {
  brot.push(`89 merkir mánaðar-listann hlaðinn óháð því hvort kortið hafi raðir (${merkingar - vardar} óvarið tilvik)`);
}

if (brot.length) {
  brot.forEach(b => console.log('  ✗ ' + b));
  console.log(`RED: ${brot.length} brot — canonical skoðunarmánuður getur aftur tæmst í ræsingu. Sjá js/patches/312-canon-stadur.js (_waitSb) og 89 ensure().`);
  process.exit(1);
}
console.log('✅ GRÆNT canon-ræsing: 312 bíður eftir biðlaranum, villur kasta (load_failed), 0-raða vörðurinn stendur og 89 festir ekki tómt kort.');
