#!/usr/bin/env node
/**
 * VÖRÐUR: draga slökkvitæki og stimpla á teikningu, vista per hæð,
 * 3D sýnir merki þegar veggir eru til. Ekki EI/gegnumtök sjálfvirkt.
 */
const fs = require('fs');
const path = require('path');
const rot = path.join(__dirname, '..');
const p433 = fs.readFileSync(path.join(rot, 'js/patches/433-teikning-merking.js'), 'utf8');
const p383 = fs.readFileSync(path.join(rot, 'js/patches/383-teikning-hreinsa-3d.js'), 'utf8');
const html = fs.readFileSync(path.join(rot, 'index.html'), 'utf8');
const villur = [];
const krefst = (src, re, msg) => { if (!re.test(src)) villur.push(msg); };

krefst(html, /433-teikning-merking\.js\?v=20261002gaedi/, 'index.html: 433 vantar script-tag');
krefst(html, /434-teikning-takn\.js\?v=20261002(sja|gaedi)/, 'index.html: 434 vantar script-tag');
krefst(html, /435-teikning-gaedi\.js\?v=20261002c/, 'index.html: 435 vantar gæði');
krefst(html, /436-teikning-sja\.js\?v=20261002c/, 'index.html: 436 vantar sja');
krefst(html, /437-teikning-gluggi\.js\?v=20261002a/, 'index.html: 437 vantar glugga');
krefst(html, /383-teikning-hreinsa-3d\.js\?v=20261002(sja|takntp|gaedi)/, 'index.html: 383 vantar cache');
krefst(p433, /Neyðarútgangur/, '433 vantar Neyðarútgangur-stimpil');
krefst(p433, /id: 'ut'/, '433 vantar Út-stimpil');
krefst(p433, /id: 'hose'/, '433 vantar slöngumerki');
krefst(p433, /id: 'rafmagn'/, '433 vantar Rafmagnstafla-stimpil');
krefst(p433, /id: 'skilti_slt'/, '433 vantar Skilti slökkvitæki');
krefst(p433, /id: 'skilti_slanga'/, '433 vantar Skilti brunaslanga');
krefst(p433, /application\/x-fp-unit/, '433 vantar drátt á tæki');
krefst(p433, /application\/x-fp-sign/, '433 vantar drátt á stimpil');
krefst(p433, /kind: 'sign'/, '433 verður að merkja stimpla sem sign');
krefst(p433, /afturkalla/, '433 vantar Afturkalla / Ctrl+Z');
krefst(p433, /TeiknBord\.faraAd/, '433 á að færa teikninguna að merki á ræmu');
krefst(p433, /vistaAdThjoni/, '433 verður að vista í teikning_bord');
krefst(p433, /setjaTaeki/, '433 vantar setjaTaeki');
krefst(p433, /grip/, '433 vantar grip á rauðan punkt');
krefst(p433, /TeiknBord\.samstilla/, '433 þarf að samstilla hæðir áður en vistað er');
krefst(p383, /erTaeki/, '383 má ekki eyða stimplum af öðrum hæðum');
krefst(p383, /TeiknMerking\.grip/, '383 á að láta grip taka yfir pönnun');
krefst(p383, /mk\.kind === 'sign'/, '383 3D á að sýna stimpla');
krefst(p383, /soknKom/, '383 á að bjóða TeiknBord.soknKom svo 433 núlli ekki hæðir');
krefst(p433, /Ekki EI-30/, '433 á að lofa að merkja ekki EI sem eldveggi');
krefst(p433, /kind: 'sign'/, '433 verður að merkja stimpla sem sign');
const p434 = fs.readFileSync(path.join(rot, 'js/patches/434-teikning-takn.js'), 'utf8');
krefst(p434, /teikning_takn/, '434 vantar tákna-stillingar');
krefst(p434, /parseFirewallRating/, '434 vantar EI-lestur');
krefst(p434, /snuaHnit/, '434 á að lesa EI á 0\/90\/180\/270');
krefst(p434, /pdfVeggir/, '434 á að lesa EI meðfram veggjum');
krefst(p434, /Eldveggir eru ekki stimplaðir/, '434 má ekki stimpla eldveggi');
krefst(p434, /skilti_slt/, '434 vantar skilti-slt tákn');
krefst(p383, /TeiknEi\.lesaUrPdf/, '383 á að lesa EI-ábendingar úr PDF');
krefst(p383, /TeiknEi\.teikna/, '383 á að teikna EI-ábendingar á yfirlag');
krefst(p383, /TeiknTakn\.teiknaMerki/, '383 á að teikna tákn á stimpla');

if (villur.length) {
  console.log('TEIKNING-MERKING RAUDT — ' + villur.length + ' vantar:');
  villur.forEach(v => console.log('  · ' + v));
  process.exit(1);
}
console.log('TEIKNING-MERKING GRÆNT — dráttur, stimplar og teikning_bord, 3D merki, engar EI-sjálfvirkar.');
process.exit(0);
