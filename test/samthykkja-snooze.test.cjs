// Próf: snooze á Samþykkja-listanum (19.11.2026) og hreinsun efst á Þjónustuborðinu.
//   node --test test/samthykkja-snooze.test.cjs
//
// AF HVERJU (Agnar 19.11.2026): „Mátt bæta við snooze takka inn á samþykktir í viku og setja uppsafnað snooze þarna,
// t.d. við hliðina á svara pósti.“ Málið á hvorki að lokast né teljast svarað — það hverfur af listanum og kemur sjálft
// aftur. Það sem má ALDREI bila:
//   1. snooze-mál sést AÐEINS í „Snooze“-síunni — hvorki í „Allt“ né hinum síunum;
//   2. tíminn ræður: liðið snooze telst ekki snooze og málið er sjálfkrafa komið aftur (ekkert kerfi þarf að hreinsa);
//   3. staðan býr á ÞJÓNINUM (thjonustubeidni.snooze_til), aldrei í vafranum — vélarnar eru fjórar (Charlize #406);
//   4. sími (446) og borð (368) nota SÖMU skilgreiningu, svo listarnir séu aldrei ósammála.
// Öll gögn eru tilbúin (repóið er opinbert).
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROT = path.join(__dirname, '..');
const lesa = (s) => fs.readFileSync(path.join(ROT, s), 'utf8').replace(/\r\n/g, '\n');
const T368 = lesa('js/patches/368-thjonustubord5.js');
const T446 = lesa('js/patches/446-samthykkja-simi.js');

// Reglan sjálf, tekin ÚR 368 og keyrð — ekki afrit, svo prófið mælir kóðann sem fer í loftið.
function reglan() {
  const m = /const SNOOZE_DAGAR = [^\n]+\n\s*const snoozeStund = [^\n]+\n\s*const erSnoozad = [^\n]+\n\s*const snoozeDagarEftir = [^\n]+/.exec(T368);
  assert.ok(m, 'skilgreiningin fannst ekki í 368');
  const h = { Date, Math, isFinite };
  vm.runInNewContext(m[0] + '\n; this.ut = { SNOOZE_DAGAR, erSnoozad, snoozeDagarEftir };', h);
  return h.ut;
}

test('reglan: aðeins framtíðardagsetning er snooze, og hún rennur út af sjálfu sér', () => {
  const R = reglan();
  assert.equal(R.SNOOZE_DAGAR, 7, 'vikan sem Agnar bað um');
  const eftir = (ms) => ({ snooze_til: new Date(Date.now() + ms).toISOString() });
  assert.equal(R.erSnoozad(eftir(3 * 864e5)), true);
  assert.equal(R.erSnoozad(eftir(-1000)), false, 'liðið snooze er ekkert snooze — málið kemur sjálft aftur');
  for (const x of [null, undefined, {}, { snooze_til: null }, { snooze_til: '' }, { snooze_til: 'rusl' }]) {
    assert.equal(R.erSnoozad(x), false, JSON.stringify(x));
  }
  assert.equal(R.snoozeDagarEftir(eftir(7 * 864e5)), 7);
  assert.equal(R.snoozeDagarEftir(eftir(-5 * 864e5)), 0, 'aldrei neikvæð tala á hnappinn');
});

test('368: staðan er sótt og skrifuð á þjóninn, aldrei geymd í vafranum', () => {
  assert.match(T368, /,snooze_til,snooze_af';/, 'dálkarnir eru í SEL — annars sæist snooze aldrei');
  assert.match(T368, /patchRow\(id, \{ snooze_til: nytt, snooze_af: dagar > 0 \? nu\(\) : null \}\)/);
  assert.match(T368, /case 'samt-snooze':/);
  // Afturköllun: snooze og afsnooze mega aldrei vera endanleg.
  assert.match(T368, /toast\(dagar > 0 \? 'Í snooze[^\n]*\n\s*false, \(\) => act\(id, async \(\) => \{ await patchRow\(id, \{ snooze_til: adur, snooze_af: adurAf \}\);/);
  assert.ok(!/localStorage[^\n]*snooze|snooze[^\n]*localStorage/i.test(T368), 'engin vafrastaða (Charlize #406)');
});

test('368: snooze-mál er utan listans nema í eigin síu, og talan stendur á hnappnum', () => {
  assert.match(T368, /\(samtRodun === 'snooze' \? erSnoozad\(r\) : !erSnoozad\(r\)\)/, 'sían: annaðhvort/eða');
  assert.match(T368, /const samtSnoozeFjoldi = \(\) => S\.rows\.filter\(r => iHam\(r, SAMT_HAM\) && erSnoozad\(r\)\)\.length;/);
  assert.match(T368, /x\[0\] === 'snooze' \? ' <b>' \+ sn \+ '<\/b>' : ''/, 'uppsafnaða talan er á hnappnum');
  assert.match(T368, /\['snooze', 'Snooze',/);
  // Hnappurinn á spjaldinu: viku í snooze, og úr snooze aftur.
  assert.match(T368, /data-t5="samt-snooze" data-v="' \+ SNOOZE_DAGAR \+ '"/);
  assert.match(T368, /data-t5="samt-snooze" data-v="0"/);
  // „Sýna öll mál" sleppir bæði póst- og snooze-síunni, annars sat listinn tómur.
  assert.match(T368, /if \(samtRodun === 'postur' \|\| samtRodun === 'snooze'\) \{ samtRodun = 'nyjast';/);
});

// Rýni 19.11.2026: teljararnir mega ekki telja það sem listinn sýnir ekki, og tóma línan á að segja frá snoozinu.
test('teljarar stemma: hamahnappur, Vinnusamantekt og tóma línan vita af snoozinu', () => {
  assert.match(T368, /if \(h\.rymi === SAMT_HAM\) return S\.rows\.filter\(r => iHam\(r, k\) && erSamthykki\(r\) && !erSnoozad\(r\)\)\.length;/, 'hamahnappurinn');
  assert.match(T368, /samtSnoozeFjoldi\(\) \? 'Ekkert mál passar við síuna — ' \+ samtSnoozeFjoldi\(\) \+ ' bíða í snooze\.'/);
  assert.match(T368, /data-t5="samt-rod" data-v="snooze">Sýna snooze/, 'leið úr tómu línunni inn í snoozið');
  assert.match(lesa('js/patches/489-vinnusamantekt.js'), /SA\.listi\(\)\.filter\(r => !\(SA\.erSnoozad && SA\.erSnoozad\(r\)\)\)/);
  // „Velja einingar"-takkinn er eigandans eins — spjaldið var tekið af hinum 18.11.
  assert.match(T368, /: stjornStika \? '<button type="button" class="btn iv sm" data-t5="cfg"/);
  // Umbrotið er tölvuútlit eitt; appsniðið og þröngi hamurinn skruna áfram í einni línu.
  assert.match(T368, /:host-context\(body\.appmode\) \.seg\.modeseg\{flex-wrap:nowrap;/);
  assert.match(T368, /\.seg\.modeseg\{display:flex;flex-wrap:nowrap;width:100%;overflow-x:auto\}/);
});

// Ólesið pósthólf gefur engar raðir — einmitt þá má viðvörunin ekki hverfa með borðanum (rýni 19.11.2026).
test('VIP-vaktin þegir tóm, en ALDREI þegar hólf er ólesið', () => {
  const t = lesa('js/patches/513-vip-vakt.js');
  assert.match(t, /if \(!l\.length && \/⚠\/\.test\(inn\)\) return '<section class="vip _tomt"/);
  assert.match(t, /if \(!l\.length\) return '';/);
  assert.ok(t.indexOf("if (!l.length && /⚠/.test(inn))") < t.indexOf("if (!l.length) return '';"), 'viðvörunin er athuguð Á UNDAN þögninni');
});

test('446 (sími): engin eigin skilgreining — hún kemur úr 368', () => {
  assert.match(T446, /const snoozad = \(r, A\) => !!\(A && A\.erSnoozad && A\.erSnoozad\(r\)\);/);
  assert.match(T446, /rodun === 'snooze' \? snoozad\(r, A\) : !snoozad\(r, A\)/);
  assert.match(T446, /A\.snooza\(id, d\)/, 'skrifið er 368-megin, ekki afritað hingað');
  assert.match(T446, /\['snooze', 'Snooze',/);
  assert.ok(!/snooze_til\s*\)\s*>\s*Date\.now\(\)/.test(T446), '446 má ekki reikna snooze sjálft');
  // Bregðist skrifið má takkinn ekki standa dauður á „Augnablik…" (rýni 19.11.2026): hann er endurstilltur og villan sögð.
  assert.match(T446, /if \(!ok\) \{ b\.disabled = false; b\.textContent = fyrri;[^\n]*Toast\.show/);
  assert.match(T446, /if \(r\) r\._h = '';/, 'teikningin er þvinguð — annars sést ekkert gerast');
  assert.match(T446, /RADANIR\.filter\(x => x\[0\] !== 'snooze' \|\| \(A && A\.erSnoozad\)\)/, 'gamalt 368 í skyndiminni: enginn snooze-flipi');
  assert.match(T446, /\.sm-snz\{display:inline-flex;align-items:center;height:36px/, 'hnappurinn er jafn stór og hinir');
  assert.match(T368, /erSnoozad, snoozeDagar: SNOOZE_DAGAR, snoozeDagarEftir,/, '368 réttir símanum regluna');
  assert.match(T368, /snooza: \(id, dagar\) => \{/);
});

// 19.11.2026 — Agnar um efsta lag borðsins: „Ég næ ekkert að nota þetta, né collapsað það, svo mátt bara færa þetta í
// burtu“ (Í dag), „Þetta er ekki tengt við neitt“ (VIP-línan og Merkja-og-keyra-teljarinn í núlli).
test('efsta lag borðsins: „Í dag" er farinn, VIP og Merkja-og-keyra þegja þegar ekkert bíður', () => {
  assert.match(T368, /const idagBordi = '';/, '„Í dag" er ekki teiknaður lengur');
  assert.ok(!/first\.unshift\('idag'\)/.test(T368), 'og hann er ekki settur sjálfkrafa á vinnuborðið');
  assert.match(T368, /idag:\s*\{ n: '31'/, 'einingin sjálf stendur óbreytt og má taka upp aftur');
  assert.match(lesa('js/patches/513-vip-vakt.js'), /if \(!l\.length\) return '';/);
  assert.match(lesa('js/patches/519-merkja-keyra.js'), /if \(!merktN && !ljos && !S\.villa && !\['merkt', 'i_keyrslu', 'klarad', 'vantar_svar', 'blundar', 'snooze_buid'\]\.some\(\(k\) => \(t\[k\] \|\| 0\) > 0\)\) return '';/);
});

// 19.11.2026 — Agnar: „Hama stjórnstikan er kramin og vantar breytitakkann.“
test('hamaröðin: brotnar um (ekkert klippt af) og ber alltaf breytitakka', () => {
  // `.seg` ber overflow:hidden; með umbroti flæðir ekkert út fyrir, svo hornin haldast rúnnuð og ekkert er klippt af.
  assert.match(T368, /'\.seg\.modeseg\{flex-wrap:wrap;max-width:100%\}'/);
  // 19.11.2026 (Agnar: „fylla þetta út í gluggann“): röðin tekur það sem eftir er af línunni, bilið ekki.
  assert.match(T368, /'\.modes>\.seg\.modeseg\{flex:1 1 auto;min-width:0\}'/);
  assert.match(T368, /'\.modes>\.grow\{flex:0 0 0\}'/);
  assert.match(lesa('js/patches/507-bord-thema-bh2.js'), /\.seg\.modeseg\{flex:1 1 auto;/, 'V2-þemað (507) má ekki halda sinni eigin breidd');
  // 23.11.2026: takkinn er smíðaður einu sinni (veljaHtml) og stendur á fliparöðinni hjá eigandanum þegar flipar sýna hann —
  // annars í hamastikunni eins og áður.
  const m = /const veljaHtml = \(mode\.ser \|\| mode\.mitt\)\n([\s\S]{0,900}?)\n\s*const flipaHtml/.exec(T368);
  assert.ok(m, 'breytitakka-blokkin fannst ekki');
  assert.match(T368, /\(flipaFaert && stjornStika \? '' : veljaHtml\) \+\n\s*'<span class="grow">/, 'hamastikan ber takkann nema hann standi á fliparöðinni (aðeins hjá eigandanum)');
  assert.match(m[1], /data-t5="ham-breyta"/); assert.match(m[1], /data-t5="cfg"/, 'innbyggður hamur fær líka takka');
  assert.match(m[1], /: stjornStika \?/, 'en aðeins eigandi borðsins');
});
