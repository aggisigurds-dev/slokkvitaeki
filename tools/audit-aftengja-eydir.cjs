#!/usr/bin/env node
'use strict';
/* „AFTENGJA" MÁ ALDREI EYÐA SKRÁNINGU.
 *
 * Af hverju þessi vörður er til (11.09.2026): ×-takkinn á brunakerfissíðu fyrirtækis (patch 274) spurði
 * „Aftengja þetta skjal af fyrirtækinu? (Skráin sjálf helst óbreytt í Drive — bara tengingin fer.)" en keyrði
 * customer_documents.delete(). Notandinn hélt að hann væri að losa tengingu og eyddi röðinni — og eydd röð
 * skráðist svo aftur í næsta Drive-sópi, á sama ranga staðinn (rannsókn á R-107802, Verkefnalisti ae9f9b45).
 *
 * Reglan: þar sem textinn lofar að aðeins tengingin fari („Aftengja", „bara tengingin fer") skal kóðinn
 * UPPFÆRA röðina (fyrirtaeki_id/customer_base_id = null), aldrei eyða henni. Heiðarleg eyðing („Eyða …")
 * er annað mál og er ekki skoðuð hér.
 *
 * Hrein textaleit, engin gagnatenging (static-settið, pre-push).
 * Keyrsla:  node tools/audit-aftengja-eydir.cjs
 */
const fs = require('fs');
const path = require('path');

const ROT = path.join(__dirname, '..');
const MAPPA = path.join(ROT, 'js');
const LOFORD = /Aftengja|tengingin fer/;
const EYDING = /from\(\s*['"]customer_documents['"]\s*\)\s*\.delete\s*\(/;
const GLUGGI = 12;   // línur á eftir staðfestingartextanum

const fundnir = [];

function ganga(mappa) {
  let listi;
  try { listi = fs.readdirSync(mappa); } catch { return; }
  for (const f of listi) {
    const p = path.join(mappa, f);
    let st;
    try { st = fs.statSync(p); } catch { continue; }
    if (st.isDirectory()) { ganga(p); continue; }
    if (!/\.js$/.test(f) || /\.min\.js$/.test(f)) continue;
    const linur = fs.readFileSync(p, 'utf8').split('\n');
    for (let i = 0; i < linur.length; i++) {
      // Aðeins staðfestingar sem notandinn samþykkir — ekki athugasemdir eða title-texti á tökkum.
      if (!/confirm\s*\(|Confirm\.show\s*\(/.test(linur[i]) || !LOFORD.test(linur[i])) continue;
      for (let j = i + 1; j <= Math.min(linur.length - 1, i + GLUGGI); j++) {
        if (EYDING.test(linur[j])) {
          fundnir.push({ skra: path.relative(ROT, p).replace(/\\/g, '/'), lina: i + 1, eyding: j + 1 });
          break;
        }
      }
    }
  }
}

ganga(MAPPA);

if (fundnir.length) {
  for (const f of fundnir) console.log('   ' + f.skra + '  staðfesting lína ' + f.lina + ' → customer_documents.delete() lína ' + f.eyding);
  console.log('RED: ' + fundnir.length + ' staður/staðir lofa „aftengja" en EYÐA skráningunni. Uppfærðu röðina (fyrirtaeki_id/customer_base_id = null) í stað delete.');
  process.exit(1);
}

console.log('✅ GRÆNT aftengja: engin staðfesting sem lofar að aðeins tengingin fari eyðir customer_documents-röð');
