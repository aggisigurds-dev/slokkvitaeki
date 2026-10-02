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
krefst('js/patches/153-arsskodun.js', /function\s+heilTaekiIMinni/, '153 má ekki lesa prófílsneið sem alla tækjaskrána');
krefst('js/patches/153-arsskodun.js', /function\s+fyrstaBordHledsla/, '153 fyrsta opnun borðsins á að sækja tæki einu sinni');
krefst('js/patches/360-raesi-skyndiminni.js', /if\s*\(!DB\._unitsComplete\)\s*return/, '360 má ekki vista prófílsneið sem heild');

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

krefst('js/patches/224-uttekt-taeki.js', /function hoppBump/, '224 þarf hoppBump svo hak/Yfirferð merki kynslóð');
krefst('js/patches/224-uttekt-taeki.js', /function uppfaeraVal/, '224 valreitur má ekki rerender() — aðeins uppfaeraVal');
krefst('js/patches/224-uttekt-taeki.js', /type="button" class="ut-svc/, '224 Yfirferð/Hleðsla verður að vera type=button');
krefst('js/patches/224-uttekt-taeki.js', /type="button" class="ut-check/, '224 hak verður að vera type=button');
krefst('js/patches/224-uttekt-taeki.js', /contains\('ut-chk'\)[\s\S]{0,400}uppfaeraVal\(cco\)/, '.ut-chk má ekki kalla rerender');
krefst('js/patches/227-trip-cloud-sync.js', /__hakHopp[\s\S]{0,80}skalSleppa/, '227 applyCloud/notifyRestored verður að sleppa í hak-glugga');
krefst('js/patches/421-profill-lifandi.js', /rpc:app_settings_merge/, '421 má ekki remounta prófíl á trip-cloud echo');
krefst('js/patches/428-hak-hopp.js', /window\.__hakHopp/, '428 kynslóðar-tákn vantar');
krefst('js/patches/428-hak-hopp.js', /a\[href\^="#"\]/, '428 verður að stöðva hash-leiðsögn á hak/Yfirferð');

const html = lesa('index.html');
// Skrár sem Endurnýja-lagfæringin (01.10) snerti bera nýrra merki. Hinar
// halda hopp-merkinu. Nýrra merki hleður hopp-kóðann líka — gamalt cache ekki.
const utgafa = {
  'features.js': '20261002teikn',
  'mapfix.js': '20261001endur',
  // 02.10: 153 sækir tækjaskrá einu sinni við fyrstu opnun borðsins.
  '153-arsskodun.js': '20261002taek',
  // 01.10 kvöld: 421 hunsar vistun Brunakerfis-/Slökkvikerfis-spjaldanna.
  // 02.10: sama skrá sækir aðeins töfluna sem var skrifuð. Nýtt merki hleður bæði.
  '421-profill-lifandi.js': '20261002saek',
  // 02.10: 274 fékk „Önnur vara/þjónusta — skrifa sjálf/ur" og skoðunarlínur sem fylgja búnaðinum.
  '274-brunakerfi-fyrirtaeki.js': '20261002ogilda',
  // Uppfærsluborð bætti #uppferslubord við 218. Nýrra merki hleður hopp-kóðann líka.
  '218-url-routing.js': '20261001ub',
};
['features.js', 'mapfix.js', '147-brunakerfi.js', '153-arsskodun.js', '218-url-routing.js', '224-uttekt-taeki.js', '227-trip-cloud-sync.js', '274-brunakerfi-fyrirtaeki.js', '385-slokkvikerfi.js', '421-profill-lifandi.js']
  .forEach(f => {
    const v = utgafa[f] || '20261001hopp';
    if (!new RegExp(f.replace('.', '\\.') + '\\?v=' + v).test(html)) {
      villur.push('index.html: ' + f + ' vantar ?v=' + v);
    }
  });
krefst('js/features.js', /data-co-endurnyja/, 'Endurnýja er eina handvirka endurhleðslan á prófílnum');
krefst('js/features.js', /opnaTeikningu\s*:\s*function/, 'Teikning-takki verður að opna út frá núverandi félagi, ekki gömlum onclick');
krefst('js/features.js', /_taekiAProfill\s*:\s*function/, 'Teikning má ekki lesa prófílsneið sem alla uttaeki-töfluna');
krefst('js/features.js', /this\._detailUnits\s*=\s*units/, 'openDetail verður að geyma tæki þessa prófíls');
krefst('js/patches/384-teikninga-forskodun.js', /function nyskraFyrirtaeki/, '384 verður að núllstilla forskoðun þegar félag breytist');
krefst('js/patches/384-teikninga-forskodun.js', /function festTakka/, '384 verður að festa Teikningar-takka aftur á nýtt félag');
krefst('js/patches/363-banner-upplysingar.js', /festTakka\(box\)/, '363 teikna() verður að festa Teikningar-hnappa eftir innerHTML');
krefst('js/patches/363-banner-upplysingar.js', /hashchange/, '363 verður að remounta banner við fyrirtækjaskipti, ekki bíða eftir púls');
krefst('js/patches/383-teikning-hreinsa-3d.js', /function endurfestaEfNyttFelag/, '383 hæðaflipar/hnappar verða að festast aftur þegar félag breytist');
krefst('js/patches/383-teikning-hreinsa-3d.js', /function fpEl/, '383 má ekki binda hæðaflipa á fyrsta #fp-main í skjalinu');
krefst('js/patches/383-teikning-hreinsa-3d.js', /_festModal/, '383 verður að festa hnappa aftur þegar FloorPlan.open rífur gluggann, ekki aðeins þegar félagsnúmer breytist');
krefst('js/patches/383-teikning-hreinsa-3d.js', /function vaktGlugga/, '383 þarf MutationObserver svo nýr #modal-floorplan fái hæðaflipa og Skýrari veggir/3D');
if (!/384-teikninga-forskodun\.js\?v=20261002smelltp/.test(html)) villur.push('index.html: 384-teikninga-forskodun.js vantar ?v=20261002smelltp');
if (!/383-teikning-hreinsa-3d\.js\?v=20261002(sja|takntp|eyda|att)/.test(html)) villur.push('index.html: 383-teikning-hreinsa-3d.js vantar ?v=20261002sja');
if (!/363-banner-upplysingar\.js\?v=20261002smell/.test(html)) villur.push('index.html: 363-banner-upplysingar.js vantar ?v=20261002smell');
if (!/405-efsta-rod\.js\?v=20261002smell/.test(html)) villur.push('index.html: 405-efsta-rod.js vantar ?v=20261002smell');
krefst('js/db.js', /skipped:\s*true/, 'prófíll á #company má ekki sækja allar uttaeki-síður');
krefst('js/patches/421-profill-lifandi.js', /skalSleppa/, 'hak/Yfirferð má ekki sækja öll tæki félagsins');
krefst('js/patches/421-profill-lifandi.js', /SJALFTEIKNA\.test\(t\)/, '421 má ekki rífa prófílinn þegar Brunakerfis-/Slökkvikerfis-spjaldið vistar (hoppið í Línum reiknings 01.10)');
if (!/428-hak-hopp\.js\?v=20261001b/.test(html)) villur.push('index.html: 428-hak-hopp.js vantar ?v=20261001b');

if (villur.length) {
  console.log('HOPP-LOAD RAUDT — ' + villur.length + ' vantar:');
  villur.forEach(v => console.log('  · ' + v));
  process.exit(1);
}
console.log('HOPP-LOAD GRÆNT — Ársskoðun / þjónusta / brunaskrá / hliðarspjald halda kynslóð og sitja.');
process.exit(0);
