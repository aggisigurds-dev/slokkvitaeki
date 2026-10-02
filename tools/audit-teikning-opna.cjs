#!/usr/bin/env node
/**
 * VÖRÐUR: teikningar opnast. Tómur FloorPlan má ekki vera hvítt blað, og
 * 1. hæð / kjallari á prófílnum verða að bera landnúmer svo forskoðunin
 * nái í teikn-listi (hus-upplysingar skilar ekki results).
 */
const fs = require('fs');
const path = require('path');
const rot = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(rot, 'index.html'), 'utf8');
const p437 = fs.readFileSync(path.join(rot, 'js/patches/437-teikning-gluggi.js'), 'utf8');
const p384 = fs.readFileSync(path.join(rot, 'js/patches/384-teikninga-forskodun.js'), 'utf8');
const p363 = fs.readFileSync(path.join(rot, 'js/patches/363-banner-upplysingar.js'), 'utf8');
const p374 = fs.readFileSync(path.join(rot, 'js/patches/374-teikning-saekja.js'), 'utf8');
const villur = [];
const krefst = (src, re, msg) => { if (!re.test(src)) villur.push(msg); };

krefst(html, /437-teikning-gluggi\.js\?v=20261002opna/, 'index.html: 437 vantar ?v=20261002opna');
krefst(html, /384-teikninga-forskodun\.js\?v=20261002opna/, 'index.html: 384 vantar ?v=20261002opna');
krefst(html, /363-banner-upplysingar\.js\?v=20261002opna/, 'index.html: 363 vantar ?v=20261002opna');
krefst(html, /374-teikning-saekja\.js\?v=20261002opna/, 'index.html: 374 vantar ?v=20261002opna');

krefst(p437, /background:#1a1814!important/, '437 á að mála modal-bd dokkkað gegn app.css #fff');
krefst(p437, /fp-drop-msg/, '437 á að gera drop-skilaboðin læsileg');
krefst(p437, /setImp\(bd, 'background'/, '437 beita á að setja bakgrunn með !important');

krefst(p363, /eignAttr/, '363 hæða-takkar verða að bera landnúmer eignarinnar');
krefst(p363, /data-landnr=/, '363 vantar data-landnr á Teikningar-hnöppum');
krefst(p363, /data-golv=.*eignAttr|eignAttr \+ ' title/, '363 golv-takkar eiga að innihalda eignAttr');

krefst(p384, /function opnaAfEl/, '384 á að opna beint af landnúmeri hnappins');
krefst(p384, /if \(nyr == null\) return S\.coId/, '384 nyskra má ekki loka forskoðun á tómu id');
krefst(p384, /heimiliFyrir/, '384 á að falla á heimilisfang þegar cache er án lista');

krefst(p374, /function saekjaEfTomt/, '374 á að sækja teikningar hússins þegar borðið er tómt');
krefst(p374, /function undirbuaDrop/, '374 á að gera drop-skilaboðin smellanleg');
krefst(p374, /Sækja teikningu hússins/, '374 vantar CTA á tóma borðið');

if (villur.length) {
  console.log('TEIKNING-OPNA RAUDT — ' + villur.length + ' vantar:');
  villur.forEach(v => console.log('  · ' + v));
  process.exit(1);
}
console.log('TEIKNING-OPNA GRÆNT — tómur gluggi er dokkkaður, hæða-takkar bera landnr, Sækja opnast af sjálfu sér.');
process.exit(0);
