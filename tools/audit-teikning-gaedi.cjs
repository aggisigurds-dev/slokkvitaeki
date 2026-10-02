#!/usr/bin/env node
/**
 * VÖRÐUR: gæði teikningar (Forskoðun/Miðlungs/Full), Afturkalla,
 * PDF-raster í fullum gæðum, veggagreiningarvinnuPx. Ekki EI-stimplar
 * né gegnumtök. Ekki Ársskoðun.
 */
const fs = require('fs');
const path = require('path');
const rot = path.join(__dirname, '..');
const p435 = fs.readFileSync(path.join(rot, 'js/patches/435-teikning-gaedi.js'), 'utf8');
const p434 = fs.readFileSync(path.join(rot, 'js/patches/434-teikning-takn.js'), 'utf8');
const p433 = fs.readFileSync(path.join(rot, 'js/patches/433-teikning-merking.js'), 'utf8');
const p383 = fs.readFileSync(path.join(rot, 'js/patches/383-teikning-hreinsa-3d.js'), 'utf8');
const html = fs.readFileSync(path.join(rot, 'index.html'), 'utf8');
const villur = [];
const krefst = (src, re, msg) => { if (!re.test(src)) villur.push(msg); };

krefst(html, /435-teikning-gaedi\.js\?v=20261002c/, 'index.html: 435 vantar');
krefst(html, /433-teikning-merking\.js\?v=20261002(gaedi|eitt|stjorn)/, 'index.html: 433 gaedi-cache');
krefst(html, /436-teikning-sja\.js\?v=20261002(c|stjorn)/, 'index.html: 436 vantar sja ofan á gæði');
krefst(html, /437-teikning-gluggi\.js\?v=20261002(a|b|opna)/, 'index.html: 437 vantar stærri glugga');
krefst(p435, /teikn_gaedi/, '435 vantar localStorage teikn_gaedi');
krefst(p435, /Forskoðun/, '435 vantar Forskoðun');
krefst(p435, /Miðlungs/, '435 vantar Miðlungs');
krefst(p435, /Full gæði/, '435 vantar Full gæði');
krefst(p435, /teikn-pdf/, '435 á að sækja PDF í fullum gæðum');
krefst(p435, /vinnuPx/, '435 vantar vinnuPx fyrir veggagreiningu');
krefst(p435, /bindSrc/, '435 vantar bindSrc');
krefst(p435, /TeiknSja\.bindSrc/, '435 Forskoðun/Miðlungs á að nota TeiknSja raster');
krefst(p435, /_loadPDF/, '435 á að vefja FloorPlan._loadPDF');
krefst(p434, /gaediHTML/, '434 á að sýna Gæði í Stillingum');
krefst(p433, /function afturkalla/, '433 vantar afturkalla');
krefst(p433, /fp-afturkalla/, '433 vantar Afturkalla-hnapp');
krefst(p433, /ctrlKey/, '433 vantar Ctrl+Z');
krefst(p433, /vistaAdThjoni/, 'undo á að vista á þjón');
krefst(p383, /TeiknGaedi\.vinnuPx/, '383 á að lesa vinnuPx úr gæðum');
krefst(p383, /faraAd: zFaraAd/, '383 vantar TeiknBord.faraAd');
if (/gegnumt/.test(p435) || /gegnumt/.test(p433)) villur.push('má ekki bæta við gegnumtökum');
if (/kind:\s*'ei'|sign:\s*'ei-30'|eldveggi staðsetja/i.test(p435)) villur.push('má ekki stimpla EI sem eldveggi');
if (/arsskodun|Ársskoðun/.test(p435) && /refetch|poll/i.test(p435)) villur.push('435 má ekki snerta Ársskoðun');

if (villur.length) {
  console.log('TEIKNING-GAEDI RAUDT — ' + villur.length + ' vantar:');
  villur.forEach(v => console.log('  · ' + v));
  process.exit(1);
}
console.log('TEIKNING-GAEDI GRÆNT — gæði, PDF-raster, Afturkalla, engar EI-stimplanir.');
process.exit(0);
