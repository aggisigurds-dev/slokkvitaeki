#!/usr/bin/env node
/**
 * VÖRÐUR: hopp / stale-load á Ársskoðun, Fyrirtæki í þjónustu,
 * Brunakerfisskoðun og hliðarspjaldinu (01.10.2026).
 *
 * Agnar: „Arsskodun. Fyrirtæki i þjonustu. Brunakerfis skodun. Side panel
 * eru held eg verst." Hver slóð hér að neðan er staðfest rót hopps:
 *   • Companies.load() teiknaði grid yfir opinn prófíl
 *   • openDetail var kallað þrisvar á ~300 ms (hash + _openCompanySafe)
 *   • _openCompanySafe fjarlægði aðeins .active — 153 sat display:block undir
 *   • 147/385/274 tæmdu síðuna í „Hleður…" við hverja opnun
 *   • 385.reload() hunsaði nýrri sókn ef eldri var á lofti
 *
 * Fall: exit 1.
 */
const fs = require('fs');
const path = require('path');

const ROT = path.join(__dirname, '..');
const lesa = rel => fs.readFileSync(path.join(ROT, rel), 'utf8');
const villur = [];
const krefst = (rel, re, skilabod) => {
  let t;
  try { t = lesa(rel); } catch (e) { villur.push(rel + ': vantar skrá — ' + skilabod); return; }
  if (!re.test(t)) villur.push(rel + ': ' + skilabod);
};

krefst('js/features.js', /_detailOpen\s*:\s*function/, 'Companies._detailOpen vantar');
krefst('js/features.js', /if\s*\(\s*!this\._detailOpen\(\)\s*\)\s*this\.render\(\)/, 'load() má ekki render() yfir opinn prófíl');
krefst('js/features.js', /this\.currentId\s*===\s*id[\s\S]{0,80}_openedAt/, 'openDetail þarf debounce á sama id');

krefst('js/mapfix.js', /style\.display\s*===\s*['"]block['"]/, '_openCompanySafe verður að fela display:block sýnir');
krefst('js/mapfix.js', /Companies\.currentId\s*=\s*coId/, '_openCompanySafe verður að setja currentId áður en load() ræsir');

krefst('js/patches/153-arsskodun.js', /let\s+_loadGen\s*=\s*0/, '153 loadAll þarf kynslóðar-tákn');
krefst('js/patches/153-arsskodun.js', /function\s+arsSynVirk\s*\(/, '153 þarf arsSynVirk svo bakgrunns-sókn teikni ekki undir prófíl');
krefst('js/patches/153-arsskodun.js', /_arsModalId/, '153 openDetail má ekki remounta sama modal');

krefst('js/patches/147-brunakerfi.js', /let\s+_bkLoadGen\s*=\s*0/, '147 loadAll þarf kynslóðar-tákn');
krefst('js/patches/147-brunakerfi.js', /_bkLastLoad\s*&&\s*Date\.now\(\)\s*-\s*_bkLastLoad\s*<\s*8000/, '147 show() má ekki tæma síðuna við hraða endurkomu');
krefst('js/patches/147-brunakerfi.js', /Stodugt\.vernda/, '147 renderList þarf Stodugt.vernda svo skrun sitji');
krefst('js/patches/147-brunakerfi.js', /_openCompanySafe/, '147 Fyrirtækjaspjald á að fara um _openCompanySafe');

krefst('js/patches/274-brunakerfi-fyrirtaeki.js', /let\s+_bkcGen\s*=\s*0/, '274 overlay þarf kynslóðar-tákn');
krefst('js/patches/274-brunakerfi-fyrirtaeki.js', /keepScroll/, '274 reload má ekki skruna á topp og flasha Hleð');

krefst('js/patches/385-slokkvikerfi.js', /let\s+_loadGen\s*=\s*0/, '385 reload þarf kynslóðar-tákn (stale svar má ekki vinna)');
krefst('js/patches/385-slokkvikerfi.js', /if\s*\(_rows\s*==\s*null\)\s*reload\(\)/, '385 open() má ekki reload() þegar gögn sitja');
krefst('js/patches/385-slokkvikerfi.js', /if\s*\(r\)\s*r\.skodunarmanudur\s*=\s*gildi/, '385 mánaðarvistun má ekki kalla reload()');

krefst('js/patches/218-url-routing.js', /brunaskra:\s*'brunaskra'/, '218 verður að þekkja #brunaskra (annars #sala)');
krefst('js/patches/218-url-routing.js', /userTouched/, '218 boot-tick má ekki rífa slóð eftir fyrsta smell');

const html = lesa('index.html');
['features.js', 'mapfix.js', '147-brunakerfi.js', '153-arsskodun.js', '218-url-routing.js', '274-brunakerfi-fyrirtaeki.js', '385-slokkvikerfi.js']
  .forEach(f => {
    if (!new RegExp(f.replace('.', '\\.') + '\\?v=20261001hopp').test(html)) {
      villur.push('index.html: ' + f + ' vantar ?v=20261001hopp');
    }
  });

if (villur.length) {
  console.log('HOPP-LOAD RAUDT — ' + villur.length + ' vantar:');
  villur.forEach(v => console.log('  · ' + v));
  process.exit(1);
}
console.log('HOPP-LOAD GRÆNT — Ársskoðun / þjónusta / brunaskrá / hliðarspjald halda kynslóð og sitja.');
process.exit(0);
