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

krefst(html, /433-teikning-merking\.js\?v=20261002(sja|b|eyda|att)/, 'index.html: 433 vantar script-tag');
krefst(html, /434-teikning-takn\.js\?v=20261002(sja|a|eyda)/, 'index.html: 434 vantar script-tag');
krefst(html, /383-teikning-hreinsa-3d\.js\?v=20261002(sja|takntp|eyda|att)/, 'index.html: 383 vantar takn-cache');
krefst(p433, /Neyðarútgangur/, '433 vantar Neyðarútgangur-stimpil');
krefst(p433, /id: 'ut'/, '433 vantar Út-stimpil');
krefst(p433, /id: 'hose'/, '433 vantar slöngumerki');
krefst(p433, /id: 'rafmagn'/, '433 vantar Rafmagnstafla-stimpil');
krefst(p433, /id: 'skilti_slt'/, '433 vantar Skilti slökkvitæki');
krefst(p433, /id: 'skilti_slanga'/, '433 vantar Skilti brunaslanga');
krefst(p433, /application\/x-fp-unit/, '433 vantar drátt á tæki');
krefst(p433, /application\/x-fp-sign/, '433 vantar drátt á stimpil');
krefst(p433, /kind: 'sign'/, '433 verður að merkja stimpla sem sign');
krefst(p433, /teikning_bord/, '433 verður að vista í teikning_bord');
krefst(p433, /setjaTaeki/, '433 vantar setjaTaeki');
krefst(p433, /grip/, '433 vantar grip á rauðan punkt');
krefst(p433, /function eydaMerki/, '433 vantar eyða á stimpil');
krefst(p433, /fp-valmynd/, '433 vantar hægri-smells valmynd');
krefst(p433, /Snúa ör/, '433 valmynd á að snúa útgangi');
krefst(p433, /Afrita/, '433 valmynd á að afrita merki');
krefst(p433, /Breyta í/, '433 valmynd á að skipta um stimpil');
krefst(p433, /Fjarlægja af teikningu/, '433 má ekki eyða tæki úr fyrirtækinu');
krefst(p433, /contextmenu/, '433 á að opna valmynd á hægri smell');
krefst(p433, /flex:1 1 140px/, 'stimplar á ræmu eiga að fylla breiddina');
krefst(p433, /fp-merki-adgerd/, '433 á að sýna Snúa/Breyta/Eyða í ræmunni þegar merki er valið');
krefst(p433, /fp-armadur/, '433 á að merkja strigann þegar stimpill er valinn til að setja');
krefst(p433, /fp-stimpill\.on/, '433 á að auðkenna valinn stimpil á ræmunni');
krefst(p433, /dragstart[\s\S]{0,80}preventDefault/, '433 má ekki láta HTML5-drátt stela pointer-atburðum');
krefst(p433, /info\.textContent !== msg/, '433 má ekki skrifa fp-info í hvert tikk (MutationObserver-lykkja)');
krefst(p383, /if \(fingur\.size === 0\) hreyft = 0/, '383 má ekki láta gamla pönnun éta næsta smell');
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
