#!/usr/bin/env node
/**
 * VÖRÐUR: hverjir hengja sig á GREIÐA-takkann, og í hvaða fasa.
 *
 * MÆLT 17.09.2026 með tools/smoke/arekstrar.js í lifandi viðmóti: `#pos-checkout`
 * — „✓ ÁFRAM", mikilvægasti takki kerfisins — ber FJÓRA smellihlustara:
 *
 *   1. js/pos.js:1216                        bubble, skráður FYRSTUR  → checkout()
 *   2. js/patches/106-checkout-unit-prompt.js  bubble, skráður annar
 *   3. js/patches/00-legacy.js:707           CAPTURE                  → tekur körfuafrit
 *   4. js/patches/00-legacy.js:720           bubble, skráður þriðji   → speglar sölu
 *                                                                      + skráir kúnna
 *
 * ÞAÐ SEM ER AÐ: 106 ber athugasemdina „capture phase, runs first" en kallar
 * addEventListener ÁN þriðja rökins — það er bubble. Samkvæmt DOM-staðlinum
 * keyra bubble-hlustarar í SKRÁNINGARRÖÐ, svo 106 keyrir Á EFTIR pos.js.
 * Afleiðingarnar eru tvær og hvorug er sú sem kóðinn ætlar sér:
 *
 *   · `e.preventDefault()` / `stopPropagation()` í 106 geta ekki stöðvað
 *     checkout() — það er þegar farið af stað (checkout er async og skilar
 *     við fyrsta await, svo salan verður til hvort sem er).
 *   · `e.stopImmediatePropagation()` í 106 STÖÐVAR hins vegar hlustara sem
 *     skráðust seinna — þ.e. 00-legacy:720. Sá speglar söluna í
 *     `sala_transactions` og skráir viðskiptavininn. Athugasemdin við hann
 *     (00-legacy.js:769) kallar hann „síðustu verksmiðjuna sem bjó til
 *     munaðarlausar raðir" og hann er tengdur audit-solu-id.
 *
 * Í reynd bjargar endurræsingin (106 setur SKIP_ATTR og kallar btn.click()
 * aftur) þessu í flestum tilvikum — á seinni smellinum hleypir 106 í gegn og
 * 720 keyrir. En HÆTTI notandinn við gluggann er engin endurræsing: salan er
 * orðin til og 720 keyrði aldrei.
 *
 * ÞESSI VÖRÐUR BREYTIR ENGU. Kassinn er ekki staður fyrir ágiskanir. Hann
 * frystir aðeins það sem er VITAÐ, svo fimmti hlustarinn geti ekki laumast inn
 * og svo að lagfæringin (þegar Agnar ákveður hana) sjáist sem meðvituð breyting.
 *
 * Fall: exit 1.
 */
const fs = require('fs');
const path = require('path');

const ROT = path.join(__dirname, '..');
const TAKKI = 'pos-checkout';

/** Skrár sem MEGA hengja smellihlustara á kassatakkann, og af hverju. */
const LEYFT = {
  'js/pos.js': 'sjálf útskráningin (checkout)',
  'js/patches/106-checkout-unit-prompt.js': 'gluggi fyrir skráningu tækja',
  'js/patches/00-legacy.js': 'körfuafrit (capture) + speglun sölu og kúnnaskráning',
  'js/patches/264-beidni-gate.js': 'beiðninúmer Reykjavíkurborgar — umboðshlustari á '
    + 'document í CAPTURE, svo hann kemst að á undan öllum hinum (sem er rétt: hann á '
    + 'að stöðva söluna þangað til númerið er komið)',
  'js/patches/07-sala-checkout-dialog.js': 'greiðsluglugginn — sama rétta mynstur: '
    + 'document + capture + endurkomuflagg (dataset.scdProceed)',
};

/*
 * MYNSTRIÐ SEM KERFIÐ NOTAR — og eina frávikið.
 *
 * Kassatakkinn ber SEX þátttakendur. Röðin sem vafrinn keyrir er:
 *
 *   1. 07-sala-checkout-dialog.js:546   document · CAPTURE   greiðsluglugginn
 *   2. 264-beidni-gate.js:92            document · CAPTURE   beiðninúmer RVK
 *   3. 00-legacy.js:707                 hnútur   · capture   körfuafrit
 *   4. js/pos.js:1216                   hnútur   · bubble    checkout()
 *   5. 106-checkout-unit-prompt.js:329  hnútur   · bubble    tækjaglugginn
 *   6. 00-legacy.js:720                 hnútur   · bubble    speglun + kúnnaskráning
 *
 * Hliðin tvö sem VIRKA (1 og 2) nota nákvæmlega sama mynstur: umboð á document í
 * capture-fasa, `stopImmediatePropagation`, gluggi, og svo endurkoma með flaggi
 * (`dataset.scdProceed`, `SKIP_ATTR`). Þau komast að á undan checkout() og geta
 * því raunverulega stöðvað söluna.
 *
 * 106 ætlar sér það sama — athugasemdin hans segir „capture phase, runs first" —
 * en hann er sá EINI sem hengir sig á hnútinn í bubble-fasa. Hann kemst því að á
 * EFTIR checkout(), þegar salan er þegar farin af stað. Það er ekki hönnun; það
 * er frávik frá venju hússins sem enginn tók eftir af því að endurkoman felur það
 * í flestum tilvikum.
 */

const kvartanir = [];
const fundnir = {};

function skrarUndir(d) {
  const ut = [];
  let l; try { l = fs.readdirSync(path.join(ROT, d)); } catch (_) { return ut; }
  for (const f of l) if (/\.js$/.test(f)) ut.push(d + '/' + f);
  return ut;
}

for (const rel of skrarUndir('js').concat(skrarUndir('js/patches'))) {
  let t; try { t = fs.readFileSync(path.join(ROT, rel), 'utf8'); } catch (_) { continue; }
  if (!t.includes(TAKKI)) continue;
  const L = t.split('\n');

  // 17.09.2026 — LEIÐRÉTT TVISVAR samdægurs, og það var þess virði.
  //   · leit 14 línur AFTUR á bak eignaði 264-beidni-gate.js ranga línu
  //     (hlustari á #_pkc-finalize fékk tilvísun sem tilheyrði þeim á undan);
  //   · leit 20 línur FRAM á við missti af 106, sem geymir hnútinn í breytu
  //     löngu áður en hún hengir hlustarann.
  // Röng lína í viðvörun sendir mann í vitlausan kóða — verra en engin viðvörun.
  // Rétta leiðin er að rekja BREYTUNA sem heldur á hnútnum, ekki nálægð í texta.
  const breytur = new Set();
  for (const m of t.matchAll(
    new RegExp('(?:const|let|var)\\s+([A-Za-z_$][\\w$]*)\\s*=\\s*[^;\\n]*getElementById\\([\'"]' + TAKKI + '[\'"]\\)', 'g')
  )) breytur.add(m[1]);

  L.forEach((lina, i) => {
    if (!/addEventListener\s*\(\s*['"]click['"]/.test(lina)) return;

    const beintAHnut = new RegExp('getElementById\\([\'"]' + TAKKI + '[\'"]\\)\\s*\\.addEventListener').test(lina);
    const gegnumBreytu = [...breytur].some((b) =>
      new RegExp('(^|[^\\w$])' + b.replace(/\$/g, '\\$') + '\\.addEventListener\\s*\\(\\s*[\'"]click[\'"]').test(lina));
    // Umboðshlustari: hengdur á document en síar á kassatakkann í líkamanum.
    const umbod = /(document|window)\s*\.addEventListener/.test(lina)
      && new RegExp('closest\\([\'"]#' + TAKKI + '[\'"]\\)').test(L.slice(i, i + 6).join('\n'));

    if (!beintAHnut && !gegnumBreytu && !umbod) return;

    // Þriðja rökið `true` (eða { capture: true }) = capture-fasi. Skráningin getur
    // spannað margar línur, svo leitað er að lokun kallsins.
    const kall = L.slice(i, i + 60).join('\n');
    const eftirAdd = kall.split('addEventListener')[1] || '';
    const capture = /,\s*true\s*\)/.test(eftirAdd.slice(0, 4000)) || /capture\s*:\s*true/.test(eftirAdd.slice(0, 4000));
    (fundnir[rel] = fundnir[rel] || []).push({ nr: i + 1, capture, umbod });
  });
}

for (const rel of Object.keys(fundnir)) {
  if (!LEYFT[rel]) {
    kvartanir.push('NÝR hlustari á ' + TAKKI + ' úr ' + rel + ' (línur '
      + fundnir[rel].map((x) => x.nr).join(', ') + ').\n     Kassinn ber þegar fjóra. '
      + 'Röðin ræður því hvað keyrir og hvað er stöðvað — þetta má ekki bætast við óvart.');
  }
}
for (const rel of Object.keys(LEYFT)) {
  if (!fundnir[rel]) {
    kvartanir.push('hlustari HORFINN úr ' + rel + ' (' + LEYFT[rel] + '). '
      + 'Hafi hann verið fjarlægður viljandi: uppfærðu LEYFT í þessari skrá.');
  }
}

/* Misræmið sjálft: 106 segist keyra fyrst en gerir það ekki. */
const rel106 = 'js/patches/106-checkout-unit-prompt.js';
if (fundnir[rel106]) {
  let t106 = '';
  try { t106 = fs.readFileSync(path.join(ROT, rel106), 'utf8'); } catch (_) {}
  const segistCapture = /capture phase, runs first|capture-fasa, keyrir fyrst/i.test(t106);
  const erCapture = fundnir[rel106].some((x) => x.capture);
  if (segistCapture && !erCapture) {
    kvartanir.push('SKJALFEST MISRÆMI (17.09.2026, óleyst): ' + rel106 + ' segir '
      + '„capture phase, runs first" en skráir sig í bubble-fasa á eftir js/pos.js.\n'
      + '     Afleiðing: preventDefault stöðvar ekki checkout(), en '
      + 'stopImmediatePropagation stöðvar speglun sölunnar í 00-legacy.js:720.\n'
      + '     Hætti notandinn við tækjagluggann er salan orðin til án speglunar og '
      + 'án kúnnaskráningar.\n'
      + '     Þetta er EKKI lagað — kassinn er ekki staður fyrir ágiskanir. Þegar '
      + 'lagfæringin kemur: fjarlægðu þessa athugun um leið.');
  }
}

/*
 * Misræmið í 106 er MEÐVITAÐ ólagað: kassinn er ekki staður fyrir ágiskanir að
 * næturlagi. Vörður sem stendur rauður út af þekktu máli stöðvar hverja einustu
 * ýtingu og verður þá slökktur — það er nákvæmlega hvernig verðir deyja hér.
 * Þess vegna skrall: misræmið er prentað HÁTT í hverri keyrslu, en fellur ekki.
 * Nýr eða horfinn þátttakandi fellir hins vegar strax.
 */
const NYTT = kvartanir.filter((k) => !k.startsWith('SKJALFEST MISRÆMI'));
const thekkt = kvartanir.filter((k) => k.startsWith('SKJALFEST MISRÆMI'));

if (kvartanir.length) {
  thekkt.forEach((k) => console.log('🟡 ' + k));
  NYTT.forEach((k) => console.log('❌ ' + k));
  if (NYTT.length) {
    console.log('\n❌ Kassa-hlustarar: ' + NYTT.length + ' NÝ frávik — röðin á GREIÐA-takkanum hefur breyst.');
    process.exit(1);
  }
  console.log('\n🟡 EKKI GRÆNT — þekkt misræmi í 106 stendur óleyst (sjá að ofan); '
    + 'engir nýir hlustarar bættust við kassann.');
  process.exit(0);
}

const alls = Object.values(fundnir).reduce((a, b) => a + b.length, 0);
console.log('✅ Kassa-hlustarar óbreyttir — ' + alls + ' smellihlustarar á #' + TAKKI
  + ' úr ' + Object.keys(fundnir).length + ' þekktum skrám, engin ný.');
