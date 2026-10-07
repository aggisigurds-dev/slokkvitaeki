#!/usr/bin/env node
'use strict';
/* HEMILLINN MÁ ALDREI LOKA Á OKKAR EIGIN HNITATÖFLU
 *
 * Af hverju hann er til (07.10.2026). Agnar: „ég sé bara Ljónsstaðir og Sláturfélag
 * Suðurlands í Aksturslista 3."
 *
 * Tvennt ólíkt ber orðið „geocode":
 *   • `/api/geocode`            — YTRI uppfletting (Nominatim). Kostar, má ekki hamast á.
 *   • `/rest/v1/geocode_cache`  — OKKAR EIGIN tafla. Ókeypis, og er EINMITT það sem
 *                                 gerir ytri uppflettingu óþarfa.
 *
 * Þessu var blandað saman á ÞREMUR stöðum, og útkoman var þögul:
 *   1. `jobOf` í papp 431 prófaði `/\/geocode/` — sem greip `geocode_cache` líka. Hver
 *      lestur á töflunni fékk tilbúið 503 með tómum skrokk úr `neitun()`, og engin
 *      þeirra beiðna sást í edge-skrám Supabase: þær komust aldrei út.
 *   2. Papp 156 hafði niðurhalið (`syncSharedToLocal`) í SAMA falli og dýru
 *      Nominatim-lykkjuna. Þegar lykkjan var slökkt 01.10 slokknaði niðurhalið með.
 *   3. Papp 431 kallar `GeocodePrewarm.cancel()` þegar `kort` er ekki á sjálfvirkum ham
 *      — sem drap niðurhalið líka, því það las sama `_cancelled`.
 *
 * MÆLT: taflan bar 1.875 hnit, `_slokk_gc` í vafranum bar 563. Fimm af sjö félögum á
 * Aksturslista 3 duttu út úr Leiðsögn — hnitin voru til, vafrinn fékk þau aldrei.
 * Eftir lagfæringu: 1.875 lyklar, og Leiðsögn fór úr 448 í 688 félög með hnit.
 *
 * REGLAN: ytri uppflettingin má hemjast eins og þurfa þykir, en lestur á okkar eigin
 * `geocode_cache` má hvorki hemjast né deyja með henni.
 *
 * Keyrsla: node tools/audit-geocache-hemill.cjs
 * Static — þarf hvorki net né lykla.
 */
const fs = require('fs');
const path = require('path');

const rot = path.join(__dirname, '..');
const les = p => { try { return fs.readFileSync(path.join(rot, p), 'utf8'); } catch (_) { return ''; } };

const villur = [];

// ── 1. Hemillinn (431) má ekki flokka geocode_cache sem ytri uppflettingu ──
const h = les('js/patches/431-uppferslubord.js');
if (!h) villur.push('js/patches/431-uppferslubord.js fannst ekki — vörðurinn getur ekki dæmt');
else {
  // Skilyrðið má spanna fleiri línur (það gerir það eftir 07.10) — `[^\n]*` var rauður
  // á RÉTTUM kóða í fyrstu útgáfu þessa varðar. Vörður sem gelgir að ósekju verður
  // þaggaður; sjá docs/MAELINGAR.md gildru 10.
  const m = h.match(/\/\\\/geocode\/i\.test\(url\)[\s\S]{0,400}?return 'kort';/);
  if (!m) {
    villur.push('431: fann ekki `kort`-flokkunina í jobOf — hefur hún verið endurskrifuð? ' +
                'Vörðurinn verður að sjá hana til að geta tryggt að geocode_cache sleppi.');
  } else if (!/geocode_cache/.test(m[0])) {
    villur.push('431 jobOf: `kort`-flokkunin undanskilur EKKI `geocode_cache`. Reglan `/\\/geocode/` ' +
                'grípur `/rest/v1/geocode_cache` líka, svo lestur á okkar eigin hnitatöflu fær ' +
                'tilbúið 503 og sameiginlega skyndiminnið berst aldrei í vafrann. Mælt 07.10: ' +
                '563 lyklar í vafra á móti 1.875 í töflu, fimm félög duttu úr Leiðsögn.');
  }
}

// ── 2. Niðurhalið (156) má ekki hanga á forhitunar-rofanum ────────────────
const g = les('js/patches/156-geocode-prewarm.js');
if (!g) villur.push('js/patches/156-geocode-prewarm.js fannst ekki — vörðurinn getur ekki dæmt');
else {
  /* 07.10.2026 (Agnar: „thetta er ekkert sem tharf ad vera live ad endursaekja punktana …
   * frekar bara refresh takka. Annars setja tha bara sem fasta punkta"). Honnunin er thvi:
   *   · FASTIR PUNKTAR — 741 felag i thjonustu + brunakerfisthjonustu eiga `__co__:<id>` i
   *     `app_settings.geocode_cache`, sem papp 173 flytur i localStorage AN nokkurrar
   *     beidni (stillingarnar eru sottar hvort ed er). +29 kB a 1,8 MB blobb.
   *   · TAKKI — `GeocodePrewarm.saekjaPunkta()` saekir tofluna handvirkt thegar nytt
   *     felag eda nytt heimilisfang baetist vid.
   * Vordurinn ver thad ad hvorugt se tekid ur sambandi. */
  if (!/saekjaPunkta\s*:/.test(g)) {
    villur.push('156: `saekjaPunkta` er ekki opid ut. Tha er ENGIN leid ad saekja hnit fyrir nytt ' +
                'felag — sjalfvirka nidurhalid var tekid ur sambandi 07.10 ad beidni Agnars.');
  }
  if (/\n  raesaNidurhal\(\);/.test(g)) {
    villur.push('156: nidurhalid er ordid sjalfvirkt aftur. Agnar bad um takka, ekki endursokn ' +
                'vid hverja hledslu — punktarnir breytast varla.');
  }
  if (!/_farid/.test(g)) {
    villur.push('156: `_farid` er horfid. Handvirka sokinn ma haetta vid ef sidan er ad hverfa, ' +
                'en ma ALDREI deyja med `_cancelled` (sem 431 setur thegar kort er ekki sjalfvirkt).');
  }
}

// ── 3. Takkinn verdur ad vera til, og fostu punktarnir ad berast ──────────
const l = les('js/patches/161-leidsogn.js');
if (l && !/_lds-saekja-hnit/.test(l)) {
  villur.push('161: fann ekki hnit-takkann (`_lds-saekja-hnit`). Hann er eina leidin fyrir Agnar ' +
              'ad na i hnit nys felags eftir ad sjalfvirka sokinn var tekin ur sambandi.');
}
const m173 = les('js/patches/173-geocode-cache-from-appsettings.js');
if (!m173 || !/AppSettings\.path\('geocode_cache'\)/.test(m173)) {
  villur.push('173: fastir punktar berast ekki lengur ur app_settings. Thad er leidin sem kostar ' +
              'ENGA beidni — an hennar er kortid tomt a nyrri vel thar til einhver ytir a takkann.');
}

console.log('HNITATAFLAN OG HEMILLINN — ytri uppfletting má hemjast, okkar eigin tafla ekki');
if (!villur.length) {
  console.log('✅ GRÆNT: `geocode_cache` sleppur við hemilinn og niðurhalið stendur sjálfstætt.');
  process.exit(0);
}
villur.forEach(v => console.log('  ❌ ' + v));
console.log('\nRED: ' + villur.length + ' atriði. Hnit sem eru til en berast ekki eru ósýnileg bilun.');
process.exit(1);
