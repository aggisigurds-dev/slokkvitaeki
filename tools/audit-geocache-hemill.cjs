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
/* 08.10.2026 (yfirferð): vörðurinn mynstur-leitaði í HRÁUM texta — en skrárnar sem hann dæmir
 * eru um 40% athugasemdir, og orðin sem hann leitar að koma fyrir ÞAR: `geocode_cache` fimm
 * sinnum í blokkinni beint ofan við `jobOf`, `saekjaPunkta` í athugasemd í 156. Vörður sem
 * verður grænn á prósa um villuna er einmitt það sem `_athugasemdir.cjs` var skrifað gegn:
 * „athugasemd sem LÝSIR villunni er ekki villan". */
const { anAthugasemdaJs } = require('./_athugasemdir.cjs');

const rot = path.join(__dirname, '..');
const les = p => { try { return anAthugasemdaJs(fs.readFileSync(path.join(rot, p), 'utf8')); } catch (_) { return ''; } };

const villur = [];

// ── 1. Hemillinn (431) má ekki flokka geocode_cache sem ytri uppflettingu ──
const h = les('js/patches/431-uppferslubord.js');
if (!h) villur.push('js/patches/431-uppferslubord.js fannst ekki — vörðurinn getur ekki dæmt');
else {
  /* 08.10.2026 (yfirferð): fyrri útgáfur festu REGLUNA ORÐRÉTT. Sú fyrsta varð rauð á
   * RÉTTUM kóða (skilyrðið fór á tvær línur); sú næsta festi stafina og bannaði þar með
   * hverja einföldun á 431. Nú er prófuð ÁVIRKNIN: `jobOf` er keyrð á raunverulegum
   * slóðum. Þá má endurskrifa hana að vild svo lengi sem hún hemur ytri uppflettinguna
   * og sleppir okkar eigin töflu. (docs/MAELINGAR.md, gildra 10.) */
  const m = h.match(/function jobOf\(url\) \{[\s\S]*?\n  \}/);
  if (!m) {
    villur.push('431: fann ekki `jobOf` — hefur hún verið endurnefnd? Vörðurinn verður að geta ' +
                'keyrt hana til að dæma.');
  } else {
    let okTafla = null, okYtri = null;
    try {
      const f = new Function('url', m[0].replace(/^function jobOf\(url\) \{/, '').replace(/\n  \}$/, ''));
      okTafla = f('https://x.supabase.co/rest/v1/geocode_cache?select=query&limit=1000') !== 'kort';
      okYtri  = f('/api/geocode?q=Armuli+23') === 'kort';
    } catch (e) {
      villur.push('431: tókst ekki að keyra `jobOf` einangrað (' + (e && e.message) + ') — ' +
                  'hún styðst líklega við eitthvað utan sín. Vörðurinn getur þá ekki dæmt.');
    }
    if (okTafla === false) {
      villur.push('431 jobOf: lestur á OKKAR EIGIN `geocode_cache` flokkast sem `kort` og hemst því. ' +
                  'Hann fær tilbúið 503 og sameiginlega skyndiminnið berst aldrei í vafrann. ' +
                  'Mælt 07.10: 563 lyklar í vafra á móti 1.875 í töflu, fimm félög duttu úr Leiðsögn.');
    }
    if (okYtri === false) {
      villur.push('431 jobOf: ytri uppflettingin `/api/geocode` flokkast EKKI lengur sem `kort`. ' +
                  'Þá er hemillinn af — og Nominatim má ekki hamast á.');
    }
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
  /* 08.10.2026 (yfirferð): hér stóðu tvær reglur sem gátu ekki gagnast.
   *  · Ein vaktaði fallsheitið `raesaNidurhal` — sem var aldrei til í neinni útgáfu skrárinnar.
   *    Falskt grænt: yrði niðurhalið sjálfvirkt aftur héti það `syncSharedToLocal`.
   *  · Hin KRAFÐIST `_farid`, og festi þar með aukaástand sem reyndist dauð vörn (eftir
   *    `beforeunload` kemst enginn smellur að, en lifi síðan af sat flaggið fast í `true`).
   * Í staðinn er vaktað það sem raunverulega má ekki gerast: toppkall á niðurhalið. */
  if (/^\s*syncSharedToLocal\(\);/m.test(g)) {
    villur.push('156: niðurhalið er orðið sjálfvirkt aftur (toppkall á `syncSharedToLocal`). ' +
                'Agnar bað um takka, ekki endursókn við hverja hleðslu — punktarnir breytast varla.');
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
