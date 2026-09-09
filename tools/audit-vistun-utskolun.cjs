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
 * ENGIN GRUNNLÍNA fyrir nýjar skrár. Þekktu tilvikin eru NAFNGREIND hér að neðan
 * með ástæðu; sá listi á aðeins að styttast. Ný skrá í honum er RAUTT.
 *
 * Keyrsla:  node tools/audit-vistun-utskolun.cjs
 * Les aðeins kóða — engin gagnatenging.
 */
const fs = require('fs');
const path = require('path');

const ROT = path.join(__dirname, '..');
const HITT_REPO = path.join(ROT, '..', 'brunaholf');

// Þekkt og óafgreitt 09.09.2026. Hver færsla þarf ástæðu.
const THEKKT = {
  'js/patches/00-legacy.js':        'gamli grunnurinn — sópað 09.09 en á eftir að fara í gegn aftur',
  'js/patches/01-sala-suite.js':    'sölusvítan — bíður yfirferðar',
  'js/patches/06-pos-fixes.js':     'POS-lagfæringar — bíður yfirferðar',
  'js/features.js':                 'bíður yfirferðar',
  'js/vbu.js':                      'skrifar í dálk sem er ekki til (á verkefnalista) — tekið með því verki',
};

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
const SKOLAR_UT = /addEventListener\s*\(\s*['"]pagehide['"]|visibilityState\s*===?\s*['"]hidden['"]|keepalive\s*:\s*true|sendBeacon/;

const fundnir = [];
for (const [merki, rot, undir] of [
  ['slokkvitaeki', ROT, ['js', 'js/patches']],
  ['brunaholf', HITT_REPO, ['js', 'index.html']],
]) {
  if (!fs.existsSync(rot)) continue;
  for (const f of skrarUndir(rot, undir)) {
    let txt;
    try { txt = fs.readFileSync(f, 'utf8'); } catch { continue; }
    if (!TEFUR_SKRIF.some(re => re.test(txt))) continue;
    if (!SKRIFAR_A_THJON.test(txt)) continue;
    if (SKOLAR_UT.test(txt)) continue;
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

console.log(`✅ GRÆNT útskolun: ${fundnir.length} skrár tefja vistun, engin NÝ án útskolunar` +
  ` (${Object.keys(THEKKT).length} þekktar bíða yfirferðar)`);
