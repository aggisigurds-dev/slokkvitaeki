#!/usr/bin/env node
/**
 * VÖRÐUR: teikningaglugginn á að fylla skjáinn; #fp-main á að fá mest af
 * rýminu, ekki 560 px spjald inni í bakgrunni.
 */
const fs = require('fs');
const path = require('path');
const rot = path.join(__dirname, '..');
const src = fs.readFileSync(path.join(rot, 'js/patches/437-teikning-gluggi.js'), 'utf8');
const html = fs.readFileSync(path.join(rot, 'index.html'), 'utf8');
const villur = [];

if (!/437-teikning-gluggi\.js\?v=20261002a/.test(html)) {
  villur.push('index.html: 437 vantar script-tag með ?v=20261002a');
}
if (!/align-items:stretch/.test(src)) villur.push('437 á að teygja spjaldið yfir bakgrunninn');
if (!/width', '100%'/.test(src) && !/width:100%!important/.test(src)) {
  villur.push('437 á að setja haus/bol/fót á 100% (ekki 560 px)');
}
if (!/168px/.test(src)) villur.push('437 á að þrengja tækjaræmuna svo teikningin fái meira');
if (!/fp-simi/.test(src)) villur.push('437 má ekki brjóta símaútlit 383');
if (!/ResizeObserver/.test(src)) villur.push('437 á að teikna strigann aftur þegar glugginn stækkar');
if (!/TeiknGluggi/.test(src)) villur.push('437 á að bjóða TeiknGluggi.beita');
if (!/560/.test(src)) villur.push('athugasemd á að nafngreina 560 px takmörkunina');

if (villur.length) {
  console.log('TEIKNING-GLUGGI RAUDT — ' + villur.length + ' vantar:');
  villur.forEach(v => console.log('  · ' + v));
  process.exit(1);
}
console.log('TEIKNING-GLUGGI GRÆNT — glugginn teygist, teikningin fær mest af skjánum.');
process.exit(0);
