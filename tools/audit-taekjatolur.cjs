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
/* ÚTGÁFUMERKIN TVÖ VERÐA AÐ FYLGJAST AÐ — en ekki vera FRYST.
 *
 * Þessi vörður krafðist áður nákvæmlega `?v=20261002taek` á báðum skrám. Það
 * var rétt þann dag (báðar urðu að losna úr vafra-skyndiminni í sömu andrá),
 * en það FRYSTI merkið: hver lögmæt breyting á 153 eða 360 rakst þá á
 * `audit-utgafumerki`, sem heimtar merki jafn nýtt og efnið. Mælt 12.10.2026:
 * 360 breyttist (ræsi-afritið mátti ekki lengur slökkva á per-fyrirtækis-sókn)
 * og verðirnir tveir urðu ósamrýmanlegir — annar heimtaði nýtt, hinn gamalt.
 *
 * Ætlunin var aldrei strengurinn sjálfur heldur að skrárnar LOSNI SAMAN.
 * Því er prófað: báðar bera merki, og það er SAMA merkið. Breytist önnur
 * verður hin að fylgja — sem er nákvæmlega vörnin sem átti að vera.
 */
const m153 = /153-arsskodun\.js\?v=([A-Za-z0-9._-]+)/.exec(html);
const m360 = /360-raesi-skyndiminni\.js\?v=([A-Za-z0-9._-]+)/.exec(html);
if (!m153) villur.push('index.html: 153-arsskodun.js ber ekkert ?v= — ræsi-skyndiminnið gæti borið gamla kóðann');
if (!m360) villur.push('index.html: 360-raesi-skyndiminni.js ber ekkert ?v= — ræsi-skyndiminnið gæti borið gamla kóðann');
if (m153 && m360 && m153[1] !== m360[1]) {
  villur.push('index.html: 153 (' + m153[1] + ') og 360 (' + m360[1] + ') bera ÓLÍK ?v= — þær verða að losna úr skyndiminni saman, annars getur gamalt 360 vökvað nýtt 153 með eitruðum snapshot');
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
