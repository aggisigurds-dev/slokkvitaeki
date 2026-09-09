#!/usr/bin/env node
'use strict';
/* GIT-ÁREKSTRARMERKI MEGA ALDREI FARA Í LOFTIÐ.
 *
 * Af hverju þessi vörður er til (09.09.2026): Agnar sendi skjámynd af símanum
 * sínum af LIFANDI síðunni. Efst til vinstri stóð:
 *
 *     <<<<<<< Updated upstream =======  >>>>>>> Stashed changes
 *
 * index.html:1221 bar óleyst árekstrarmerki. Sjálfvirka samstillingin (Scheduled
 * Task, 15 mín) gerir stash → pull → pop; áreksturinn leystist ekki, og wip-commitið
 * tók merkin með sér út í framleiðslu.
 *
 * Áreksturinn sjálfur var meinlaus — tvær vélar bættu við sitthvorum script-tagi —
 * en merkin rjúfa HTML/JS þar sem þau lenda og birtast notandanum sem rusl.
 *
 * Þetta er ódýrasta prófun sem til er: hrein textaleit, engin gagnatenging,
 * millisekúndur. Hún fer í static-settið svo pre-push-hookurinn stöðvi ýtinguna
 * áður en nokkuð fer út.
 *
 * ENGAR UNDANÞÁGUR. Árekstrarmerki í kóða sem er ýtt er alltaf villa.
 *
 * Keyrsla:  node tools/audit-arekstrarmerki.cjs
 */
const fs = require('fs');
const path = require('path');

const ROT = path.join(__dirname, '..');
const HITT = path.join(ROT, '..', 'brunaholf');

// Aðeins í BYRJUN LÍNU — annars myndi þetta falla á hverri skrá sem fjallar um
// árekstra (þar á meðal þessari), og vörður sem gelgir að ósekju verður þaggaður.
const MERKI = /^(<{7} |={7}$|>{7} )/;

const SLEPPA = /node_modules|[\\/]dist[\\/]|[\\/]backups[\\/]|[\\/]\.git[\\/]|graphify-out|_attic|\.min\.(js|css)$/;
const SKODA = /\.(html|js|cjs|mjs|css|json|md|sql|yml|yaml)$/;

const fundnir = [];

function ganga(mappa, djupt) {
  if (djupt > 5) return;
  let listi;
  try { listi = fs.readdirSync(mappa); } catch { return; }
  for (const f of listi) {
    const p = path.join(mappa, f);
    if (SLEPPA.test(p)) continue;
    let st;
    try { st = fs.statSync(p); } catch { continue; }
    if (st.isDirectory()) { ganga(p, djupt + 1); continue; }
    if (!SKODA.test(f)) continue;
    if (st.size > 4 * 1024 * 1024) continue;
    let txt;
    try { txt = fs.readFileSync(p, 'utf8'); } catch { continue; }
    if (!/^<{7} |^={7}$|^>{7} /m.test(txt)) continue;
    const linur = txt.split('\n');
    for (let i = 0; i < linur.length; i++) {
      if (MERKI.test(linur[i])) {
        fundnir.push({ skra: p, lina: i + 1, texti: linur[i].slice(0, 60) });
      }
    }
  }
}

for (const rot of [ROT, HITT]) if (fs.existsSync(rot)) ganga(rot, 0);

if (fundnir.length) {
  const eftirSkra = new Map();
  for (const f of fundnir) {
    if (!eftirSkra.has(f.skra)) eftirSkra.set(f.skra, []);
    eftirSkra.get(f.skra).push(f);
  }
  for (const [skra, hopur] of eftirSkra) {
    console.log('   ' + path.relative(path.join(ROT, '..'), skra).replace(/\\/g, '/') +
      '  línur ' + hopur.map(h => h.lina).join(', '));
    console.log('      ' + hopur[0].texti);
  }
  console.log('RED: ' + fundnir.length + ' árekstrarmerki í ' + eftirSkra.size +
    ' skrá/skrám. Leystu áreksturinn — merkin birtast notandanum sem rusl og rjúfa HTML/JS.');
  process.exit(1);
}

console.log('✅ GRÆNT árekstrarmerki: engin <<<<<<< / ======= / >>>>>>> í kóða');
