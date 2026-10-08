#!/usr/bin/env node
'use strict';
/* KREDITFÆRSLA VERÐUR AÐ FELLA KRÖFUNA NIÐUR Í PAYDAY — EN BARA FULL OG ÓGREIDD
 *
 * Af hverju hann er til (08.10.2026). Agnar: „↩ Bakfæra (kreditreikningur) …
 * mátt láta afturkalla þarna líka Payday."
 *
 * Kreditreikningur hjá OKKUR snerti Payday ekki neitt. Krafan stóð áfram í
 * heimabanka kúnnans og hann greiðir hana. MÆLT þennan dag: R-001029
 * (Heimaleiga, 52.519 kr) var kreditfærð, en Payday-reikningur nr. 374 stóð
 * enn `SENT` með gjalddaga 12.10. Tveir hnappar í 166 heita næstum það sama og
 * gera gjörólíka hluti — ⊘ „Afturkalla í Payday" kallar á þjóninn, ↩ „Bakfæra"
 * gerði það ekki. Lagfæringin er í patch 26, þar sem kreditfærslan verður til,
 * svo ALLAR leiðir að henni erfi hana (166, 167, 00-legacy, 120, 137).
 *
 * TVÖ SKILYRÐI SEM MEGA ALDREI HVERFA
 *  1. FULL kreditfærsla. `isFull` í 26 er satt þegar valdar línur eru öll
 *     salan. Hlutakredit — ein lína af fimm — má ALDREI fella niður allan
 *     reikninginn í Payday. Án þessarar varnar yrði 52.519 kr krafa felld
 *     niður af því 4.400 kr lína var bakfærð.
 *  2. ÓGREIDD krafa. Payday neitar greiddri kröfu hvort eð er, og greidd krafa
 *     á að leiðrétast með endurgreiðslu.
 *
 * Keyrsla: node tools/audit-kredit-afturkollun.cjs
 * Static — þarf hvorki net né lykla.
 */
const fs = require('fs');
const path = require('path');
/* Skráin er að stórum hluta athugasemdir, og orðin sem hér er leitað að koma
 * fyrir ÞAR líka — blokkin ofan við fallið nefnir bæði `isFull` og `paid_at`.
 * Vörður sem verður grænn á prósa um villuna er einmitt það sem
 * `_athugasemdir.cjs` var skrifað gegn. */
const { anAthugasemdaJs } = require('./_athugasemdir.cjs');

const rot = path.join(__dirname, '..');
const les = p => { try { return anAthugasemdaJs(fs.readFileSync(path.join(rot, p), 'utf8')); } catch (_) { return ''; } };

const villur = [];
const SKRA = 'js/patches/26-credit-invoice.js';
const s = les(SKRA);

if (!s) {
  villur.push(SKRA + ' fannst ekki — vörðurinn getur ekki dæmt.');
} else {
  const HEITI = 'afturkallaKrofuIPayday';

  // ── 1. Fallið verður að vera til ────────────────────────────────────────
  const m = s.match(new RegExp('async function ' + HEITI + '\\(([^)]*)\\)([\\s\\S]*?)\\n  \\}'));
  if (!m) {
    villur.push('26: fann ekki `' + HEITI + '`. Hafi hún verið endurnefnd verður vörðurinn að vita það — ' +
                'annars er hann grænn á kóða sem gerir ekkert.');
  } else {
    const rok  = m[1].split(',').map(x => x.trim()).filter(Boolean);
    const bodi = m[2];

    // ── 2. FULL-skilyrðið ─────────────────────────────────────────────────
    const fullRok = rok[1];
    if (!fullRok) {
      villur.push('26: `' + HEITI + '` tekur ekki við full/hluta-merki. Þá fellur hlutakredit niður ALLA ' +
                  'kröfuna í Payday — 4.400 kr lína felldi 52.519 kr kröfu.');
    } else if (!new RegExp('if\\s*\\([^)]*!\\s*' + fullRok).test(bodi)) {
      villur.push('26: `' + HEITI + '` hættir ekki strax þegar `' + fullRok + '` er ósatt. Hlutakredit má ' +
                  'ALDREI fella niður allan reikninginn.');
    }

    // ── 3. GREITT-skilyrðið ───────────────────────────────────────────────
    // 08.10.2026: fyrsta útgáfan prófaði `/paid_at/` á fallinu öllu. Hún varð
    // GRÆN þegar greiðsluvörnin var tekin úr sambandi (`if (modir.paid_at)` →
    // `if (false)`), því orðið stendur líka í `.select('num,dk_invoice_id,paid_at')`.
    // Sótt gildi er ekki vörn — það verður að vera GREINT á það.
    if (!/if\s*\([^)]*paid_at/.test(bodi)) {
      villur.push('26: `' + HEITI + '` greinir ekki á `paid_at` (aðeins sækja það dugar ekki). Greidd krafa ' +
                  'á að leiðrétast með endurgreiðslu, ekki afturköllun — og Payday neitar henni hvort eð er.');
    }

    // ── 4. Hún verður að kalla á afturköllunina ───────────────────────────
    if (!/payday-push/.test(bodi) || !/['"]cancel['"]/.test(bodi)) {
      villur.push('26: `' + HEITI + '` sendir ekki { action: "cancel" } á /api/payday-push. Þá er hún ' +
                  'skrautfall og krafan stendur áfram.');
    }

    // ── 5. Báðar innsetningarleiðirnar verða að kalla hana ────────────────
    // 26 setur kreditröðina inn TVISVAR: venjulega leiðin og vara-leiðin sem
    // sleppir is_credit/credit_of þegar súlurnar vantar. Sleppi önnur þeirra
    // kallinu er afturköllunin handahófskennd.
    const kollin = (s.match(new RegExp('await\\s+' + HEITI + '\\s*\\(', 'g')) || []).length;
    if (kollin < 2) {
      villur.push('26: `' + HEITI + '` er aðeins kölluð ' + kollin + ' sinni. Kreditröðin er sett inn eftir ' +
                  'TVEIMUR leiðum (venjulegri og vara-leið án is_credit/credit_of) — báðar verða að fella ' +
                  'kröfuna niður, annars veltur það á skemaheppni hvort krafan stendur eftir.');
    }
    // og þau köll verða að bera full-merkið áfram
    const medFull = (s.match(new RegExp('await\\s+' + HEITI + '\\s*\\([^)]*isFull[^)]*\\)', 'g')) || []).length;
    if (kollin >= 1 && medFull < kollin) {
      villur.push('26: ' + (kollin - medFull) + ' af ' + kollin + ' köllum á `' + HEITI + '` bera ekki `isFull`. ' +
                  'Án þess er hlutakredit meðhöndlað eins og full bakfærsla.');
    }
  }
}

console.log('KREDITFÆRSLA → PAYDAY (26) — full bakfærsla fellir kröfuna, hlutakredit aldrei');
if (!villur.length) {
  console.log('✅ GRÆNT: kreditfærsla afturkallar í Payday, en aðeins full og ógreidd — báðar innsetningarleiðir.');
  process.exit(0);
}
villur.forEach(v => console.log('  ❌ ' + v));
console.log('\nRED: ' + villur.length + ' atriði. Krafa sem stendur eftir kreditfærslu rukkast á kúnnann.');
process.exit(1);
