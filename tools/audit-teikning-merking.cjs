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

krefst(html, /433-teikning-merking\.js\?v=20261002a/, 'index.html: 433 vantar script-tag');
krefst(html, /383-teikning-hreinsa-3d\.js\?v=20261002merki/, 'index.html: 383 vantar merki-cache');
krefst(p433, /Neyðarútgangur/, '433 vantar Neyðarútgangur-stimpil');
krefst(p433, /id: 'ut'/, '433 vantar Út-stimpil');
krefst(p433, /id: 'hose'/, '433 vantar slöngumerki');
krefst(p433, /application\/x-fp-unit/, '433 vantar drátt á tæki');
krefst(p433, /application\/x-fp-sign/, '433 vantar drátt á stimpil');
krefst(p433, /kind: 'sign'/, '433 verður að merkja stimpla sem sign');
krefst(p433, /teikning_bord/, '433 verður að vista í teikning_bord');
krefst(p433, /setjaTaeki/, '433 vantar setjaTaeki');
krefst(p433, /grip/, '433 vantar grip á rauðan punkt');
krefst(p433, /TeiknBord\.samstilla/, '433 þarf að samstilla hæðir áður en vistað er');
krefst(p383, /erTaeki/, '383 má ekki eyða stimplum af öðrum hæðum');
krefst(p383, /TeiknMerking\.grip/, '383 á að láta grip taka yfir pönnun');
krefst(p383, /mk\.kind === 'sign'/, '383 3D á að sýna stimpla');
krefst(p383, /soknKom/, '383 á að bjóða TeiknBord.soknKom svo 433 núlli ekki hæðir');
krefst(p433, /Ekki EI-30/, '433 á að lofa að merkja ekki EI sjálfkrafa');

if (villur.length) {
  console.log('TEIKNING-MERKING RAUDT — ' + villur.length + ' vantar:');
  villur.forEach(v => console.log('  · ' + v));
  process.exit(1);
}
console.log('TEIKNING-MERKING GRÆNT — dráttur, stimplar og teikning_bord, 3D merki, engar EI-sjálfvirkar.');
process.exit(0);
