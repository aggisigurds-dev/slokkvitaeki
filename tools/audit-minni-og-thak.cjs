#!/usr/bin/env node
'use strict';
/* REST-LAGIÐ: LOKUN MINNIS OG BIÐRÖÐ — tvær reglur sem hvor um sig getur étið daginn
 *
 * Af hverju hann er til (05.10.2026):
 *
 * 1) MINNIÐ LOKAÐIST OF BREITT. Stök fyrirtækja-röð er svarað úr `Companies.list` án
 *    netferðar (03.10). Vörnin var `minniLokad = true` við HVERT skrif — á hvaða töflu
 *    sem er — og opnaðist aðeins þegar `Companies.list` varð NÝTT fylki, sem getur
 *    verið löngu síðar eða aldrei. Mælt á prófíl 195: `urMinni` komst í 13, svo urðu
 *    tvö skrif á allt aðrar töflur og eftir það fór hvert `fyrirtaeki?select=<einn
 *    dálkur>&id=eq.195` í netið. Agnar vistar eitthvað á fyrstu mínútunni hvers dags,
 *    svo sparnaðurinn var í reynd dauður allan daginn — fjögur til sex köll á hverja
 *    prófílheimsókn, og hann fer inn og út af þessum síðum allan daginn.
 *    REGLAN: lokast AÐEINS við skrif á `fyrirtaeki`, um `rpc` eða um okkar Netlify-föll
 *    (óþekkt leið → varkárni). Skrif á solur/verkbeidnir/app_kv eiga ekkert við röðina.
 *    Prófað í báðar áttir 05.10: skrif á solur → 6 úr minni áfram; skrif á fyrirtaeki
 *    → 0 úr minni, fer í netið.
 *
 * 2) SKRIFT MÁ ALDREI BÍÐA. Biðröðin (hámark samtíma lestra, mælt 25 → 10) á aðeins við
 *    LESTRA. Lenti skrift í röð á eftir átta lestrum þá hægist á vistun — og
 *    „vistun má aldrei glatast" er regla hér. Þess vegna verða skriftar-greinarnar að
 *    skila sér ÁÐUR en biðröðin kemur til; vörðurinn mælir það á stöðu í skránni.
 *
 * Keyrsla: node tools/audit-minni-og-thak.cjs
 * Static — þarf hvorki net né lykla.
 */
const fs = require('fs');
const path = require('path');

const SKRA = 'js/rest-samnyting.js';
const s = (() => { try { return fs.readFileSync(path.join(__dirname, '..', SKRA), 'utf8'); } catch (_) { return ''; } })();

const villur = [];
if (!s) villur.push(SKRA + ': skráin fannst ekki — vörðurinn getur ekki dæmt');

if (s) {
  // ── 1. Lokun minnis er TÖFLUBUNDIN ────────────────────────────────────────
  if (!/_t === 'fyrirtaeki'[\s\S]{0,40}minniLokad = true/.test(s)) {
    villur.push('Fann ekki töflubundna lokun minnis (`_t === \'fyrirtaeki\' … minniLokad = true`). ' +
                'Lokist minnið við hvert skrif er stök-raðar-sparnaðurinn dauður um leið og Agnar vistar ' +
                'það fyrsta á morgninum — mælt 05.10: urMinni stóð í 13 og hreyfðist ekki meir.');
  }
  // Óskilyrt lokun í Supabase-skriftargreininni er einmitt gallinn sem var lagaður.
  if (/\n\s*minniLokad = true;\s*\/\/ eigin breyting/.test(s)) {
    villur.push('Óskilyrta lokunin („eigin breyting") er komin aftur — hún lokar minninu við skrif á ' +
                'solur/verkbeidnir/app_kv sem eiga ekkert við fyrirtækja-röðina.');
  }
  // rpc og óþekkt leið VERÐA samt að loka (annars getur gömul röð lifað).
  if (!/_t === 'rpc:'/.test(s)) {
    villur.push('rpc-skrif loka ekki minninu. Við vitum ekki hvaða töflur geymt fall snertir ' +
                '(merge_customers o.fl.) — óþekkt leið á alltaf að loka.');
  }
  if (!/catch \(_\) \{ minniLokad = true; \}/.test(s)) {
    villur.push('Þáttun töflunafnsins fellur ekki í varkárni (`catch → minniLokad = true`). ' +
                'Mistakist þáttunin má minnið ALDREI halda áfram að svara.');
  }

  // ── 2. Biðröðin: aðeins lestrar ───────────────────────────────────────────
  const iThak = s.indexOf('medThaki(function');
  if (iThak < 0) {
    villur.push('Fann ekki biðröðina (`medThaki(...)`) á lestrarleiðinni — hámark samtíma lestra er horfið.');
  } else {
    // Hvert einasta `tolur.skrif++` (skriftar-greinarnar) verður að vera FYRIR biðröðina.
    let m, re = /tolur\.skrif\+\+/g, eftir = 0, alls = 0;
    while ((m = re.exec(s))) { alls++; if (m.index > iThak) eftir++; }
    if (!alls) villur.push('Fann engar skriftar-greinar (`tolur.skrif++`) — skráin er ekki sú sem vörðurinn þekkir.');
    if (eftir) {
      villur.push(eftir + ' skriftar-grein(ar) liggja EFTIR biðröðinni í skránni — skrift getur þá beðið á eftir ' +
                  'átta lestrum. Vistun má aldrei hægja á sér út af lestrarbiðröð.');
    }
    if (!/if \(!THAK\) return senda\(\);/.test(s)) {
      villur.push('Biðröðin er ekki hægt að slökkva (`if (!THAK) return senda();`) — þá er ekki hægt að mæla á móti henni.');
    }
    if (!/SLEPPI_MS/.test(s)) {
      villur.push('Fann ekki sætis-sleppinguna (SLEPPI_MS) — ein hangandi beiðni getur þá stíflað alla röðina.');
    }
  }
  const mThak = s.match(/var THAK = (\d+)/);
  if (!mThak || +mThak[1] <= 0) {
    villur.push('Sjálfgefið THAK er 0 eða fannst ekki — biðröðin er þá óvirk í framleiðslu.');
  } else if (+mThak[1] > 16) {
    villur.push('THAK = ' + mThak[1] + ' er svo hátt að það ver ekki tengipottinn (mælt: 25 samtímis felldi Supabase 06.09).');
  }
}

console.log('REST-LAGIÐ — lokun minnis töflubundin, biðröð aðeins á lestra');
if (!villur.length) {
  console.log('✅ GRÆNT: minnið lokast aðeins við fyrirtaeki/rpc/óþekkta leið, og allar skriftar-greinar ' +
              'liggja fyrir biðröðinni svo vistun bíður aldrei.');
  process.exit(0);
}
villur.forEach(v => console.log('  ❌ ' + v));
console.log('\nRED: ' + villur.length + ' atriði.');
process.exit(1);
