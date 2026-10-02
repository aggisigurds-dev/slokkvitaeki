#!/usr/bin/env node
/**
 * VÖRÐUR: tækjatölur (SLT/BSL/RS) á Ársskoðun (02.10.2026).
 *
 * Agnar: „alllllllllar tækjatölur eru farnar". PR 879 tæmdi backgroundRefresh
 * og urMinni tók fyrstu non-tómu `DB.cache.units` (prófílsneið / eitrað
 * ræsi-skyndiminni) sem heildina. Þá varð equipment {} á nánast hverri röð.
 *
 * Fall: exit 1.
 */
const fs = require('fs');
const path = require('path');

const ROT = path.join(__dirname, '..');
const lesa = (rel) => fs.readFileSync(path.join(ROT, rel), 'utf8');
const villur = [];
const krefst = (rel, re, skilabod) => {
  let t;
  try { t = lesa(rel); } catch (e) { villur.push(rel + ': vantar skrá — ' + skilabod); return; }
  if (!re.test(t)) villur.push(rel + ': ' + skilabod);
};

const ars = lesa('js/patches/153-arsskodun.js');
const html = lesa('index.html');
const boot = lesa('js/patches/360-raesi-skyndiminni.js');

if (!/function heilTaekiIMinni\s*\(/.test(ars)) {
  villur.push('153: heilTaekiIMinni vantar — prófílsneið getur orðið „öll tæki"');
}
if (!/DB\._unitsComplete/.test(ars)) {
  villur.push('153: urMinni/heilTaekiIMinni þarf DB._unitsComplete');
}
if (/async function urMinni\(\)[\s\S]{0,220}if \(u && u\.length\) return u/.test(ars)) {
  villur.push('153: urMinni les enn hvaða units.length sem er (prófílsneið)');
}
if (!/function fyrstaBordHledsla\s*\(/.test(ars)) {
  villur.push('153: fyrstaBordHledsla vantar — snapshot-slóðin sækir ekki tæki');
}
if (!/fyrstaBordHledsla\(\);/.test(ars)) {
  villur.push('153: show() kallar ekki fyrstaBordHledsla');
}
if (!/if \(!listiMedTaeki\(_cache\.list\)\)/.test(ars)) {
  villur.push('153: writeSnapshot má ekki eitra góðan snapshot með 0 tækjum');
}
if (/async function backgroundRefresh\(\)[\s\S]{0,400}await loadAll\(\)/.test(ars)) {
  villur.push('153: backgroundRefresh má ekki sækja allt mengið aftur (enginn púls)');
}
if (/setInterval\([^)]*loadAll/.test(ars) || /setInterval\([^)]*backgroundRefresh/.test(ars)) {
  villur.push('153: 30 s púll á tækjasókn má ekki koma aftur');
}
if (!/153-arsskodun\.js\?v=20261002taek/.test(html)) {
  villur.push('index.html: 153-arsskodun.js vantar ?v=20261002taek');
}
if (!/360-raesi-skyndiminni\.js\?v=20261002taek/.test(html)) {
  villur.push('index.html: 360-raesi-skyndiminni.js vantar ?v=20261002taek');
}
if (!/if \(!DB\._unitsComplete\) return/.test(boot)) {
  villur.push('360: vista má ekki prófílsneið sem heildar-skyndiminni');
}
if (!/snap\.complete && snap\.units\.length/.test(boot)) {
  villur.push('360: hydrate má ekki merkja _unitsComplete án complete-fána');
}

if (villur.length) {
  console.log('TÆKJATÖLUR RAUDT — ' + villur.length + ' vantar:');
  villur.forEach((v) => console.log('  · ' + v));
  process.exit(1);
}
console.log('TÆKJATÖLUR GRÆNT — fyrsta opnun borðsins sækir heild, prófílsneið er ekki heild, enginn púls.');
process.exit(0);
