#!/usr/bin/env node
'use strict';
/* DEBOUNCE ÁN ÚTSKOLUNAR — vistun sem bíður og fer aldrei af stað.
 *
 * Af hverju þessi vörður er til (09.09.2026). Agnar, eftir að hafa tapað vinnu
 * miðja í reikningalotu með yfirmanni sínum:
 *   „Þetta er það mikilvægasta af öllu. En af hverju hefur enginn lagað þetta
 *    eftir ítrekaðar staðfestingar að þetta sé að fullu lagað og muni aldrei
 *    gerast aftur. Á hverjum degi endalaust."
 *
 * Svarið er ekki að lagfæringarnar hafi verið rangar. Þær voru of ÞRÖNGAR.
 * Textatap-sópið fyrr sama dag lagaði nákvæmlega þetta mynstur í níu pöppum í
 * slokkvitaeki — og vistunin í brunaholf/index.html var ekki á þeim lista. Sama
 * villa, önnur skrá, enginn leitaði. Hún kom ekki aftur; hún fór aldrei.
 *
 * MYNSTRIÐ
 *   save() skrifar í minni og setur setTimeout(..., 800) á samstillinguna.
 *   Fari notandinn af síðunni, loki flipanum eða endurhlaði innan þeirrar biðar
 *   fer tímamælirinn ALDREI af stað. Vinnan er til á einni vél og hvergi annars
 *   staðar. Ekkert villuboð, ekkert merki — hún er bara farin.
 *
 * REGLAN
 *   Skrá sem tefur skrif á þjón VERÐUR að skola út þegar síðan hverfur:
 *   `pagehide` (eða `visibilitychange` → hidden) sem sendir strax, helst með
 *   fetch(keepalive:true) svo vafrinn klári beiðnina þótt flipinn sé farinn.
 *   `beforeunload` sem birtir AÐEINS aðvörun telst ekki útskolun.
 *
 * ENGAR UNDANÞÁGUR. Fyrsta útgáfa fann sjö skrár og ég ætlaði að frysta fimm sem
 * „þekktar". Svo kom papp 365 og þá voru þær allar varðar — mælt með tómum lista:
 * grænt. Vörður án undanþága er sá eini sem hægt er að treysta.
 *
 * Keyrsla:  node tools/audit-vistun-utskolun.cjs
 * Les aðeins kóða — engin gagnatenging.
 */
const fs = require('fs');
const path = require('path');

const ROT = path.join(__dirname, '..');
const HITT_REPO = path.join(ROT, '..', 'brunaholf');

// ENGAR UNDANÞÁGUR. Fyrsta útgáfa fann sjö skrár og ég ætlaði að frysta fimm
// þeirra sem "þekktar". Svo kom papp 365 sem sendir blur/change/focusout á
// reitinn í fókus þegar síðan hverfur — og þá voru þær allar varðar. Mælt með
// því að keyra vörðinn með TÓMAN lista: grænt.
// Vörður án undanþága er sá eini sem hægt er að treysta. Komi ný skrá hér inn
// er hún löguð, ekki skráð á lista.
const THEKKT = {};

// Skrár sem eru söfn, ekki okkar kóði.
const ER_SAFN = f => /\.min\.js$|jspdf|leaflet|jsqr|qrcode|supabase|chart|pdf-lib/i.test(f);

function skrarUndir(rot, undirslodir) {
  const ut = [];
  for (const u of undirslodir) {
    const p = path.join(rot, u);
    if (!fs.existsSync(p)) continue;
    if (fs.statSync(p).isFile()) { ut.push(p); continue; }
    for (const f of fs.readdirSync(p)) {
      const fp = path.join(p, f);
      if (fs.statSync(fp).isFile() && /\.(js|html)$/.test(f)) ut.push(fp);
    }
  }
  return ut.filter(f => !ER_SAFN(path.basename(f)));
}

// Tefur skráin SKRIF Á ÞJÓN? Ekki bara einhvern setTimeout.
const TEFUR_SKRIF = [
  /setTimeout\s*\(\s*(?:function\s*\(\s*\)\s*\{[^}]{0,200}?)?(?:\w*[Ss]ync\w*|\w*[Ss]ave\w*|\w*[Vv]ista\w*|\w*[Pp]ersist\w*)\s*(?:\(\s*\))?\s*,\s*\d+/,
  /_syncTimer\s*=\s*setTimeout/,
  /debounce\w*\s*\(\s*(?:\w*[Ss]ave|\w*[Ss]ync|\w*vista)/i,
];
// Skrifar hún raunverulega á þjón?
const SKRIFAR_A_THJON = /fetch\s*\([^)]*\/api\/|\.from\s*\(['"][a-z_]+['"]\)\s*\.\s*(?:upsert|insert|update)|AppSettings\.save/;
// Skolar hún út?
// Frá 09.09.2026 telst BLUR-VISTUN fullnægjandi útskolun, því papp 365
// (js/patches/365-vistun-utskolun.js) sendir blur/change/focusout á reitinn í
// fókus þegar síðan hverfur — og ræsir þar með alla blur-vistara í öllum pöppum.
// Skrá sem vistar aðeins á tímamæli, án blur-leiðar, er ÁFRAM óvarin: enginn
// blur berst henni og tímamælirinn fer aldrei af stað.
const SKOLAR_UT = new RegExp([
  "addEventListener\\s*\\(\\s*['\"]pagehide['\"]",
  "visibilityState\\s*===?\\s*['\"]hidden['\"]",
  'keepalive\\s*:\\s*true',
  'sendBeacon',
  // blur-vistun — varin af papp 365
  "addEventListener\\s*\\(\\s*['\"](?:blur|focusout)['\"]",
  '\\bon(?:blur|focusout)\\s*=',
].join('|'));

// Skrifar ÞETTA fall á þjón? Ekki nóg að skráin geri það einhvers staðar.
//
// Hvers vegna þetta skiptir máli (09.09.2026): fyrsta útgáfa varðarins flaggaði
// 255-auto-discount.js af því skráin bæði tefur kall OG skrifar á þjón — en það
// eru ÓSKYLDAR leiðir. Tímamælirinn þar endurreiknar afslátt í minni; skrifin
// hanga á skýrum vistunartakka. Vörður sem gelgir að ósekju verður þaggaður, og
// þá er hann verri en enginn. Þess vegna: fallið sem er tafið verður sjálft að
// skrifa á þjón.
function fallSkrifar(txt, nafn) {
  const re = new RegExp(
    '(?:async\\s+)?function\\s+' + nafn + '\\s*\\([^)]*\\)\\s*\\{|' +
    '\\b' + nafn + '\\s*=\\s*(?:async\\s*)?(?:function\\s*\\([^)]*\\)|\\([^)]*\\)\\s*=>)\\s*\\{');
  const m = re.exec(txt);
  if (!m) return true;               // finnum ekki fallið — verum varkár
  // Lesum líkama fallsins með svigatalningu.
  let i = txt.indexOf('{', m.index + m[0].length - 1), djupt = 0, byrjun = i;
  for (; i < txt.length && i < byrjun + 20000; i++) {
    if (txt[i] === '{') djupt++;
    else if (txt[i] === '}') { djupt--; if (djupt === 0) break; }
  }
  return SKRIFAR_A_THJON.test(txt.slice(byrjun, i));
}

const fundnir = [];
for (const [merki, rot, undir] of [
  ['slokkvitaeki', ROT, ['js', 'js/patches']],
  ['brunaholf', HITT_REPO, ['js', 'index.html']],
]) {
  if (!fs.existsSync(rot)) continue;
  for (const f of skrarUndir(rot, undir)) {
    let txt;
    try { txt = fs.readFileSync(f, 'utf8'); } catch { continue; }
    if (!SKRIFAR_A_THJON.test(txt)) continue;
    if (SKOLAR_UT.test(txt)) continue;

    // Nöfn fallanna sem eru tafin — og aðeins þau sem skrifa sjálf á þjón telja.
    const tafin = [...txt.matchAll(/setTimeout\s*\(\s*([A-Za-z_$][\w$]*)\s*,\s*\d+/g)]
      .map(m => m[1])
      .filter(n => /sync|save|vista|persist/i.test(n));
    const hraSetTimeout = TEFUR_SKRIF.some(re => re.test(txt)) && !tafin.length;

    if (!tafin.some(n => fallSkrifar(txt, n)) && !hraSetTimeout) continue;
    fundnir.push({ merki, slod: path.relative(rot, f).replace(/\\/g, '/') });
  }
}

const nyir = fundnir.filter(x => !THEKKT[x.slod]);

if (nyir.length) {
  nyir.forEach(x => console.log(`   ${x.merki}/${x.slod} — tefur skrif á þjón en skolar ekki út við lokun`));
  console.log('RED: ' + nyir.length + ' NÝ skrá/skrár tefja vistun án útskolunar. ' +
    'Bættu við pagehide/visibilitychange sem sendir strax (fetch keepalive:true). ' +
    'Sjá brunaholf/index.html flushSyncNow() sem fyrirmynd.');
  process.exit(1);
}

console.log('✅ GRÆNT útskolun: engin skrá tefur skrif á þjón án útskolunar við lokun ' +
  '(engar undanþágur — sjá haus)');
