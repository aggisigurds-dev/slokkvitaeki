#!/usr/bin/env node
/* VÖRÐUR — öpp-skel (Öpp-villa 3, 5, 6, 13, 14).
 *
 * Staðfestir að iframe-síða fái hash sem 277 getur ýtt, að Þjónustuverk sé
 * ekki sjálfgefin síða, að ræsilásinn endurræsist ekki í buildShell, og að
 * app-lyklar og class-vaktin séu ekki fastur listi / allt skjalið.
 *
 *   node tools/audit-opp-skel.cjs
 */
const fs = require('fs');
const path = require('path');
const rot = path.join(__dirname, '..');
const lesa = (f) => fs.readFileSync(path.join(rot, f), 'utf8');
const brot = [];

const p261 = lesa('js/patches/261-app-profiles.js');
const p316 = lesa('js/patches/316-simi-boards.js');
const p354 = lesa('js/patches/354-opp-styribord.js');
const api = lesa('netlify/functions/app-manifest.js');

if (!/function rememberFrame\(/.test(p261) || !/history\.replaceState\(/.test(p261)) {
  brot.push('261: iframe-síða ýtir ekki hash með replaceState (#f-<lykill>)');
}
if (!/function frameKeyFromLocation\(/.test(p261) || !/function restoreFromHash\(/.test(p261)) {
  brot.push('261: vantar endurheimt á #f- við hashchange/popstate');
}
if (/rememberFrame[\s\S]{0,280}history\.pushState/.test(p261)) {
  brot.push('261: rememberFrame má ekki pushState — 277 á ýtinguna');
}

const defaults = p261.match(/key: 'fjarmal'[\s\S]{0,500}?defaults: \[([^\]]+)\]/);
if (!defaults) brot.push('261: fann ekki Fjármál-defaults');
else if (/\bthjonustuverk\b/.test(defaults[1])) brot.push('261: thjonustuverk er enn í Fjármál-defaults');
if (!/k !== 'thjonustuverk'/.test(p261)) brot.push('261: pagesFor() fellir ekki thjonustuverk');
if (/insertOnce\('__tvk1'/.test(p261)) brot.push('261: __tvk1 setur thjonustuverk inn aftur');

const build = p261.match(/function buildShell\(\) \{([\s\S]*?)\n  function syncFrameBottom/);
if (!build) brot.push('261: fann ekki buildShell');
else if (/_bootAt\s*=\s*Date\.now\(\)/.test(build[1])) brot.push('261: buildShell endurstillir _bootAt');
if (!/pointerdown[\s\S]{0,120}_bootAt = Date\.now\(\) - 13000/.test(p261)) {
  brot.push('261: ræsilásinn sleppur ekki við fyrstu snertingu');
}
if (!/Date\.now\(\) - _bootAt < 12000/.test(p261)) {
  brot.push('261: fókuslás-skilyrðið á að standa (PR #1014 vísar í sömu línu)');
}

if (/const APP_KEYS\s*=/.test(p316)) brot.push('316: APP_KEYS er enn fastur listi');
if (!/AppProfiles\.isApp/.test(p316)) brot.push('316: activeAppKey les ekki AppProfiles');
if (/documentElement,\s*\{\s*subtree:\s*true/.test(p316)) brot.push('316: class-vaktin er enn subtree á documentElement');
if (!/observe\(document\.body,\s*\{\s*attributes:\s*true,\s*attributeFilter:\s*\['class'\]\s*\}\)/.test(p316)) {
  brot.push('316: vaktin á að vera attributes á body, án subtree');
}

if (/const BUILTIN\s*=\s*\[/.test(p354)) brot.push('354: BUILTIN er enn fastur listi');
if (!/AppProfiles\.isBuiltin/.test(p354)) brot.push('354: isBuiltin les ekki AppProfiles');

for (const k of ['verkstjorar', 'skyrslustod', 'threedwork']) {
  if (!api.includes("'" + k + "'")) brot.push('app-manifest: vantar ' + k + ' í BUILTIN');
}
if (!/isBuiltin:\s*function/.test(p261) || !/builtinKeys:\s*function/.test(p261)) {
  brot.push('261: AppProfiles vantar isBuiltin/builtinKeys');
}

/* Samningur við 277: replaceState + ýting þegar sagan lengist ekki.
   A (innbyggð) → F (iframe) → B (innbyggð). Bakk frá B lendir á F, svo á A. */
function bakk() {
  const hist = ['#sala'];
  let i = 0;
  function replace(h) { hist[i] = h; }
  function yta(prev, next) {
    replace(prev);
    hist.splice(i + 1);
    hist.push(next);
    i += 1;
  }
  function eftirSnertingu(naesta) {
    const fra = hist[i];
    const len = hist.length;
    replace(naesta);
    if (hist.length === len && hist[i] !== fra) yta(fra, hist[i]);
  }
  function tilBaka() { if (i > 0) i -= 1; return hist[i]; }
  eftirSnertingu('#f-br-dagurinn');
  eftirSnertingu('#krofu-yfirlit');
  return { einn: tilBaka(), tveir: tilBaka(), hist };
}
function frameKey(h) { return h.indexOf('#f-') === 0 ? h.slice(3) : ''; }
const ut = bakk();
if (ut.einn !== '#f-br-dagurinn' || ut.tveir !== '#sala') {
  brot.push('bakk-samningur brást: ' + JSON.stringify(ut));
}
if (frameKey('#f-br-krofur') !== 'br-krofur' || frameKey('#sala') !== '') {
  brot.push('frameKey las #f- rangt');
}

if (brot.length) {
  console.log('RED: öpp-skel\n  ' + brot.join('\n  '));
  process.exit(1);
}
console.log('GREEN: öpp-skel — hash-bakk, þjónustuverk, ræsilás, lyklar, vakt');
