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

krefst(html, /433-teikning-merking\.js\?v=20261002(sja|b|eyda|att|staerd|eitt|stjorn)/, 'index.html: 433 vantar script-tag');
krefst(html, /434-teikning-takn\.js\?v=20261002(sja|a|eyda|gaedi|stjorn)/, 'index.html: 434 vantar script-tag');
krefst(html, /435-teikning-gaedi\.js\?v=20261002c/, 'index.html: 435 vantar gæði');
krefst(html, /436-teikning-sja\.js\?v=20261002(c|stjorn)/, 'index.html: 436 vantar sja');
krefst(html, /437-teikning-gluggi\.js\?v=20261002(a|b|opna)/, 'index.html: 437 vantar glugga');
krefst(html, /383-teikning-hreinsa-3d\.js\?v=20261002(sja|takntp|eyda|att|staerd|gaedi|eitt|stjorn|gra|draugur)/, 'index.html: 383 vantar cache');
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
krefst(p433, /function setjaEitt/, '433: einn smellur á að setja eitt merki og velja það');
krefst(p433, /setjaEitt\(S\.valinn/, '433: striga-smellur má ekki halda stimplinum vopnuðum');
krefst(p433, /fp-stimpil-staerd/, '433 vantar stærðarhvarfa á táknunum');
krefst(p433, /S\.valinnMerki\) \{/, '433 stærð á að gilda á völdu tæki, ekki bara skilti');
krefst(p433, /function breytaTakn/, '433 á að leyfa að breyta tákni á tæki');
krefst(p433, /function skjaStaerd/, '433 stimplar eiga að fylgja þysjun, ekki halda skjástærð');
krefst(p383, /TeiknBord\.thysjun|thysjun: \(\) => Z\.s/, '383 á að bjóða þysjunina svo merki fylgi zoominu');
krefst(p383, /vistaHaedMinni/, '383 á að muna Skýrari veggir per hæð');
krefst(p383, /hreinsaStrigaStrax/, '383 á að hreinsa gamla hæð af striganum strax');
krefst(p383, /function sameinaHaedir/, '383 má ekki skipta út hæða-hnútum svo myndhleðsla deyji');
krefst(p383, /nu\.id !== h\.id/, '383 onload á að bera saman hæðar-id, ekki hnút');
krefst(p433, /STAERD_MIN = 24/, 'skilti eiga að ná niður í 24 px');
krefst(p433, /STAERD_MAX = 160/, 'skilti eiga að ná upp í 160 px');
krefst(p433, /m\.staerd/, '433 á að leyfa stærð per merki');
krefst(p433, /TeiknMerking\.stimpilPx|stimpilPx: merkiStaerd/, '433 á að bjóða stimpilPx');
  krefst(p383, /TeiknMerking\.skjaStaerd/, '383 yfirlag á að þysja stimpla með borðinu');
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
