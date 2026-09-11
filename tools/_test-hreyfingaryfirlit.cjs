#!/usr/bin/env node
'use strict';
/* _test-hreyfingaryfirlit — prófar netlify/functions/_hreyfingaryfirlit-kjarni.cjs á
 * RAUNVERULEGUM gögnum sem sótt voru með Supabase execute_sql 11.09.2026 og vistuð í
 * tools/fixtures/hreyfingaryfirlit/_*.json (sama snið og saekja() skilar).
 *
 *   node tools/_test-hreyfingaryfirlit.cjs
 *
 * UNDIRSTRIKIÐ ER VILJANDI: build-dist.js birtir allt í tools/ á vefnum NEMA skrár sem
 * byrja á „_" (sjá publishable()). Fixture-skrárnar eru viðskiptayfirlit nafngreindra
 * viðskiptavina og prófið ber nöfn þeirra og stöður — hvorugt á að verða opinber slóð.
 * Staðfest 11.09.2026: `node build-dist.js` → dist/tools inniheldur hvorugt.
 *
 * Talan sem hvert próf ber saman við kemur úr SQL-fyrirspurn eða beinum útreikningi á
 * dálkum — ekki úr kjarnanum sjálfum. Fyrst er gengið úr skugga um að fixture-skrárnar
 * stemmi við SQL-summurnar (afritunarvilla myndi annars fela sig).
 */
const fs = require('fs');
const path = require('path');
const K = require('../netlify/functions/_hreyfingaryfirlit-kjarni.cjs');

const FIX = path.join(__dirname, 'fixtures', 'hreyfingaryfirlit');
const lesa = f => JSON.parse(fs.readFileSync(path.join(FIX, f), 'utf8'));
const IDAG = '2026-09-11';

let villur = 0, fjoldi = 0;
function ok(heiti, skilyrdi, fekk) {
  fjoldi++;
  if (skilyrdi) console.log('  ✅ ' + heiti);
  else { villur++; console.log('  ❌ ' + heiti + (fekk !== undefined ? '\n       fékk: ' + JSON.stringify(fekk) : '')); }
}
const jafnt = (heiti, fekk, vaentist) => ok(heiti + ' = ' + JSON.stringify(vaentist), JSON.stringify(fekk) === JSON.stringify(vaentist), fekk);
const summa = (rows, sia) => rows.filter(sia || (() => true)).reduce((a, r) => a + Number(r.upphaed), 0);
const stadaA = (ut, d) => { let s = null; for (const l of ut.linur) { if (l.tegund !== 'lok' && l.dags <= d) s = l.stada; } return s; };
const faerslur = ut => ut.linur.filter(l => l.tegund === 'faersla');
const rodud = ut => ut.linur.every((l, i, a) => i === 0 || a[i - 1].dags <= l.dags);
const stemmirFlokkar = s => Math.round(s.byrjunarstada + s.reikningar + s.greidslur + s.vextir + s.laekkun + s.uppgjor + s.annad - s.lokastada) === 0;

// ── hjálparföll ─────────────────────────────────────────────────────────────
console.log('\nHjálparföll');
jafnt('kr(1234)', K.kr(1234), '1.234');
jafnt('kr(-7322)', K.kr(-7322), '-7.322');
jafnt('kr(283959)', K.kr(283959), '283.959');
jafnt('isDags(2026-05-07)', K.isDags('2026-05-07'), '07.05.2026');
jafnt('gildDags(2026-02-30)', K.gildDags('2026-02-30'), null);
jafnt('gildDags(2025-01-01)', K.gildDags('2025-01-01'), '2025-01-01');
jafnt('nafnKjarni(Atlas verktakar ehf.)', K.nafnKjarni('Atlas verktakar ehf.'), 'atlas verktakar');
jafnt('skiptaHeimilisfangi(Pósthólf 8940, 128 Reykjavík)', K.skiptaHeimilisfangi('Pósthólf 8940, 128 Reykjavík'), { gata: 'Pósthólf 8940', postnr: '128 Reykjavík' });

// ── Atlas verktakar ehf. 540319-1540 ────────────────────────────────────────
console.log('\nAtlas verktakar ehf. (540319-1540) — fixture á móti SQL');
const atlas = lesa('_atlas-5403191540.json');
jafnt('fjöldi Stólpa-hreyfinga', atlas.stolpi_hreyfingar.length, 56);
jafnt('SUM(upphaed) allra Stólpa-hreyfinga', summa(atlas.stolpi_hreyfingar), 283959);
jafnt('SUM(upphaed) fyrir 2025-01-01', summa(atlas.stolpi_hreyfingar, r => r.dags < '2025-01-01'), 157359);
jafnt('SUM(upphaed) fyrir 2026-01-01', summa(atlas.stolpi_hreyfingar, r => r.dags < '2026-01-01'), 158274);

console.log('\nAtlas — stolpi=opid, 01.01.2025–11.09.2026');
const aO = K.reikna(atlas, { fra: '2025-01-01', til: IDAG, stolpi: 'opid', idag: IDAG });
jafnt('Byrjunarstaða 01.01.2025', aO.samantekt.byrjunarstada, 157359);
jafnt('fyrsta lína', [aO.linur[0].tegund, aO.linur[0].texti, aO.linur[0].stada], ['byrjun', 'Byrjunarstaða', 157359]);
jafnt('árslok', aO.arslok, [{ ar: 2025, dags: '2025-12-31', stada: 158274 }]);
const arsLina = aO.linur.findIndex(l => l.tegund === 'arslok');
ok('„Staða 31.12.2025" situr milli 30.10.2025 og 16.01.2026', aO.linur[arsLina].texti === 'Staða 31.12.2025' && aO.linur[arsLina - 1].dags === '2025-10-30' && aO.linur[arsLina + 1].dags === '2026-01-16', aO.linur.slice(arsLina - 1, arsLina + 2));
jafnt('Staða 21.04.2026 (eftir bankagreiðslu 107729)', stadaA(aO, '2026-04-21'), 225284);
jafnt('Staða 07.05.2026', stadaA(aO, '2026-05-07'), 225284);
jafnt('Lokastaða 11.09.2026', aO.samantekt.lokastada, 225284);
jafnt('síðasta lína', [aO.linur[aO.linur.length - 1].tegund, aO.linur[aO.linur.length - 1].texti], ['lok', 'Lokastaða']);
jafnt('Reikningar tímabils', aO.samantekt.reikningar, 446653);
jafnt('Greiðslur tímabils', aO.samantekt.greidslur, -388607);
jafnt('Vextir / vanskilagjöld tímabils', aO.samantekt.vextir, 9879);
ok('Byrjun + flokkar = Lokastaða', stemmirFlokkar(aO.samantekt) && aO.samantekt.stemmir, aO.samantekt);
ok('línur í dagsetningaröð', rodud(aO));
const b107729 = faerslur(aO).filter(l => l.dags === '2026-04-21').map(l => [l.texti, l.skyring, l.nr, l.upphaed]);
jafnt('bankalínur 21.04.2026 (107729, 100% + vextir)', b107729, [['Innheimtukostnaður og vextir', 'Kostnaður', '104364', 2113], ['Greiðsla', 'Greiðsla', '104364', -60788]]);
jafnt('opnir Stólpa-reikningar (Eftirstöðvar > 0)', faerslur(aO).filter(l => l.skyring === 'Reikningur' && l.eftirstodvar > 0).map(l => [l.nr, l.eftirstodvar]), [['106590', 52000], ['107464', 106864], ['108189', 67010]]);
jafnt('107729 Eftirstöðvar', faerslur(aO).find(l => l.nr === '107729').eftirstodvar, 0);
jafnt('samantekt.stolpi', [aO.samantekt.stolpi.stada_vid_yfirtoku, aO.samantekt.stolpi.opid_alls, aO.samantekt.stolpi.opnir_reikningar.map(r => r.reikn_nr)], [225284, 225874, ['106590', '107464', '108189']]);
ok('athugasemd: Stólpa-staða ≠ opnir reikningar (590 kr)', aO.athugasemdir.some(a => /mismunur -590 kr/.test(a)), aO.athugasemdir);
ok('engin app-lína á yfirlitinu (allt Payday-drög)', !faerslur(aO).some(l => l.uppruni === 'payday' || l.uppruni === 'app'));
jafnt('Ósent', aO.osent.map(o => [o.num, o.upphaed, o.tenging, o.par]), [
  ['R-000505', 5200, 'kt', null],
  ['R-000613', 8500, 'kt', null],
  ['R-000504', 8500, 'nafn', null],
  ['R-000506', -8500, 'nafn', 'R-000504'],
]);
ok('R-000505 og R-000613 merkt Payday-drög', aO.osent.filter(o => /DRAFT/.test(o.astaeda)).map(o => o.num).join() === 'R-000505,R-000613', aO.osent);
ok('kreditpar R-000504 + R-000506 nettar 0', aO.osent.filter(o => o.num === 'R-000504' || o.par === 'R-000504').reduce((a, o) => a + o.upphaed, 0) === 0);
jafnt('haus', [aO.haus.nafn, aO.haus.nafn_heimild, aO.haus.gata, aO.haus.postnr_baer, aO.haus.kt, aO.haus.titill, aO.haus.dags],
  ['Atlas verktakar ehf.', 'payday', 'Einhella 4', '221 Hafnarfjirði', '540319-1540', 'Viðskiptahreyfingar 01.01.2025 - 11.09.2026', IDAG]);
ok('bókari nefnir Stólpa, Payday og bankayfirlit 0528', /Stólpa/.test(aO.haus.bokari) && /Payday/.test(aO.haus.bokari) && /0528-26-006005/.test(aO.haus.bokari), aO.haus.bokari);
ok('bókari nefnir ekki lækkun (engin 80% hjá Atlas)', !/Lækkun/.test(aO.haus.bokari), aO.haus.bokari);
jafnt('útgefandi án branding = sjálfgefið nafn og /img/logo.png', [aO.haus.utgefandi.nafn, aO.haus.utgefandi.merki], ['Slökkvitæki ehf.', '/img/logo.png?v=20260520b']);
// app_settings.branding eins og hún stóð 11.09.2026 (execute_sql): company_name + merki í Supabase Storage
const LOGO = 'https://osfdzskyvisifcwyjkuk.supabase.co/storage/v1/object/public/utlit/merki/logo-1785932585227.png';
const aB = K.reikna(Object.assign({}, atlas, { branding: { company_name: 'Brunahólf Slökkvitæki ehf.', logo_url: LOGO, kennitala: '600508-0400' } }), { fra: '2025-01-01', til: IDAG, idag: IDAG });
jafnt('útgefandi úr branding (sama merki og reikningarnir)', [aB.haus.utgefandi.nafn, aB.haus.utgefandi.merki], ['Brunahólf Slökkvitæki ehf.', LOGO]);
const aD = K.reikna(Object.assign({}, atlas, { branding: { logo_url: 'data:image/png;base64,AAAA' } }), { fra: '2025-01-01', til: IDAG, idag: IDAG });
jafnt('data:-merki er ekki sent í JSON (sjálfgefið í staðinn)', aD.haus.utgefandi.merki, '/img/logo.png?v=20260520b');

console.log('\nAtlas — stolpi=fyrri_eigandi');
const aF = K.reikna(atlas, { fra: '2025-01-01', til: IDAG, stolpi: 'fyrri_eigandi', idag: IDAG });
jafnt('Byrjunarstaða', aF.samantekt.byrjunarstada, 157359);
jafnt('árslok 2025', aF.arslok.map(a => a.stada), [158274]);
jafnt('Uppgjör við fyrri eigendur 07.05.2026', faerslur(aF).filter(l => l.flokkur === 'uppgjor').map(l => [l.dags, l.texti, l.upphaed]), [['2026-05-07', 'Uppgjör við fyrri eigendur', -225284]]);
jafnt('Lokastaða', aF.samantekt.lokastada, 0);
ok('Eftirstöðvar allra Stólpa-reikninga = 0', faerslur(aF).filter(l => l.skyring === 'Reikningur').every(l => l.eftirstodvar === 0));
ok('Byrjun + flokkar = Lokastaða', stemmirFlokkar(aF.samantekt));
ok('bókari nefnir uppgjör', /gerð upp við fyrri eigendur/.test(aF.haus.bokari), aF.haus.bokari);

console.log('\nAtlas — öll bókin (01.01.2023–11.09.2026)');
const aA = K.reikna(atlas, { fra: '2023-01-01', til: IDAG, stolpi: 'opid', idag: IDAG });
jafnt('Staða 20.04.2026 = lok Stólpa-bókar', stadaA(aA, '2026-04-20'), 283959);
jafnt('árslok 2023/2024/2025', aA.arslok.map(a => a.stada), [25600, 157359, 158274]);

// ── Skaftahlíð 4-10 (Eignaumsjón) 681178-0159 ───────────────────────────────
console.log('\nSkaftahlíð 4-10, húsfélag (681178-0159)');
const skaft = lesa('_skaftahlid-6811780159.json');
jafnt('SUM(upphaed) Stólpa (fixture)', summa(skaft.stolpi_hreyfingar), 0);
const sO = K.reikna(skaft, { fra: '2025-01-01', til: IDAG, stolpi: 'opid', idag: IDAG });
jafnt('Byrjunarstaða', sO.samantekt.byrjunarstada, 0);
jafnt('Reikningur 107780', faerslur(sO).filter(l => l.nr === '107780').map(l => [l.dags, l.texti, l.gjalddagi, l.upphaed, l.eftirstodvar]), [['2026-01-29', 'Reikningur 107780', '2026-02-08', 124892, 0]]);
jafnt('Greiðsla kröfu 104389 10.02.2026', faerslur(sO).filter(l => l.skyring === 'Greiðsla' && l.nr === '104389').map(l => [l.dags, l.upphaed]), [['2026-02-10', -125187]]);
jafnt('Staða 10.02.2026', stadaA(sO, '2026-02-10'), 0);
jafnt('Lokastaða', sO.samantekt.lokastada, 0);
jafnt('haus', [sO.haus.nafn, sO.haus.gata, sO.haus.postnr_baer], ['Skaftahlíð 4-10,húsfélag', 'Pósthólf 8940', '128 Reykjavík']);
jafnt('Ósent', sO.osent, []);
jafnt('athugasemdir', sO.athugasemdir, []);

// ── Strandasel 9 511087-7679: CANCELLED + CREDIT ─────────────────────────────
console.log('\nStrandasel 9 (511087-7679) — Payday CANCELLED + CREDIT');
const strand = K.reikna(lesa('_strandasel-5110877679.json'), { fra: '2025-01-01', til: IDAG, stolpi: 'opid', idag: IDAG });
jafnt('línur appsins', faerslur(strand).filter(l => l.uppruni !== 'stolpi').map(l => [l.dags, l.texti, l.upphaed, l.eftirstodvar, l.num]), [
  ['2026-07-03', 'Reikningur 76 · R-000397', 39638, 0, 'R-000397'],
  ['2026-07-03', 'Kreditreikningur 205 · vegna R-000397', -39638, 0, 'K2606002'],
  ['2026-07-06', 'Reikningur 108 · R-000418', 39638, 0, 'R-000418'],
  ['2026-07-06', 'Kreditreikningur 206 · vegna R-000418', -39638, 0, null],
]);
ok('engin greiðslulína á CANCELLED (solur.paid_at er dags. kreditsins)', !faerslur(strand).some(l => l.uppruni !== 'stolpi' && l.skyring === 'Greiðsla'));
jafnt('Stólpa-kredit 107075', faerslur(strand).filter(l => l.nr === '107075').map(l => [l.texti, l.skyring, l.upphaed]), [['Kreditreikningur 107075', 'Kredit', -26474]]);
jafnt('Lokastaða', strand.samantekt.lokastada, 0);
jafnt('Ósent', strand.osent, []);

// ── Þangbakki 8-10 640980-0289: Payday-kennitalan ræður ─────────────────────
console.log('\nÞangbakki 8-10 (640980-0289) — Payday-kennitala ræður');
const thang = lesa('_thangbakki-6409800289.json');
const tO = K.reikna(thang, { fra: '2025-01-01', til: IDAG, stolpi: 'opid', idag: IDAG });
jafnt('línur', faerslur(tO).map(l => [l.dags, l.texti, l.upphaed, l.num]), [
  ['2026-07-02', 'Reikningur 47 · R-000017', 59520, 'R-000017'],
  ['2026-07-02', 'Kreditreikningur 104 · vegna R-000017', -59520, 'R-000527'],
  ['2026-08-07', 'Reikningur 207 · R-000716', 190987, 'R-000716'],
  ['2026-08-07', 'Kreditreikningur 212 · vegna R-000716', -190987, 'R-000723'],
]);
jafnt('Lokastaða', tO.samantekt.lokastada, 0);
ok('athugasemd: R-000017 ber kt Ferðafélags í appinu', tO.athugasemdir.some(a => /^R-000017 ber kennitölu 530169-3759/.test(a)), tO.athugasemdir);
const fO = K.reikna(Object.assign({}, thang, { kt10: '5301693759', stolpi_hreyfingar: [], customers_base: [], fyrirtaeki: [] }), { fra: '2025-01-01', til: IDAG, idag: IDAG });
jafnt('sama gögn á kt Ferðafélags (530169-3759): engin lína (ekki tvítalið)', faerslur(fO).length, 0);
ok('… og athugasemd um að reikningurinn sé á 640980-0289', fO.athugasemdir.some(a => /R-000017 ber kennitölu 530169-3759 í appinu en var gefinn út á 640980-0289/.test(a)), fO.athugasemdir);

// ── Oscuro ehf. 500317-1670: 80% bankagreiðsla fyrir yfirtöku ───────────────
console.log('\nOscuro ehf. (500317-1670) — banki_0528:80%');
const osc = lesa('_oscuro-5003171670.json');
const oO = K.reikna(osc, { fra: '2026-01-01', til: IDAG, stolpi: 'opid', idag: IDAG });
jafnt('línur 27.04.2026', faerslur(oO).filter(l => l.dags === '2026-04-27').map(l => [l.texti, l.skyring, l.nr, l.upphaed, !!l.obekraeft]), [
  ['Innheimtukostnaður', 'Kostnaður', '104626', 295],
  ['Greiðsla', 'Greiðsla', '104626', -13750],
  ['Lækkun kröfu (20%)', 'Lækkun', '108164', -3364, true],
].map(r => r.length === 4 ? r.concat(false) : r));
jafnt('108164 nettar 0 (16.819 + 295 − 13.750 − 3.364)', 16819 + summa(faerslur(oO).filter(l => l.dags === '2026-04-27')), 0);
jafnt('Lokastaða = opinn 108113', oO.samantekt.lokastada, 16534);
jafnt('Lækkun krafna í samantekt', oO.samantekt.laekkun, -3364);
ok('Byrjun + flokkar = Lokastaða', stemmirFlokkar(oO.samantekt));
ok('bókari nefnir óstaðfesta lækkun', /Lækkun kröfu \(20%\)".*ekki verið staðfest/.test(oO.haus.bokari), oO.haus.bokari);
jafnt('athugasemdir (Stólpa-staða = opnir)', oO.athugasemdir, []);
const oF = K.reikna(osc, { fra: '2026-01-01', til: IDAG, stolpi: 'fyrri_eigandi', idag: IDAG });
jafnt('fyrri_eigandi: uppgjör og lokastaða', [faerslur(oF).filter(l => l.flokkur === 'uppgjor').map(l => l.upphaed), oF.samantekt.lokastada], [[-16534], 0]);

// ── Fótaaðgerðarstofa Reykjavíkur 701006-2910: 80%+vextir EFTIR yfirtöku ────
console.log('\nFótaaðgerðarstofa Reykjavíkur (701006-2910) — banki_0528:80%+vextir 26.05.2026');
const fot = lesa('_fotaadgerdarstofa-7010062910.json');
const pO = K.reikna(fot, { fra: '2025-01-01', til: IDAG, stolpi: 'opid', idag: IDAG });
jafnt('línur 26.05.2026', faerslur(pO).filter(l => l.dags === '2026-05-26').map(l => [l.texti, l.upphaed]), [
  ['Innheimtukostnaður og vextir', 328], ['Greiðsla', -6978], ['Lækkun kröfu (20%)', -1663],
]);
jafnt('árslok 2025 (295 kr kostnaður vantar í Stólpa-bók)', pO.arslok.map(a => a.stada), [-295]);
jafnt('Lokastaða', pO.samantekt.lokastada, -295);
ok('athugasemd: mismunur -295', pO.athugasemdir.some(a => /mismunur -295 kr/.test(a)), pO.athugasemdir);
const pF = K.reikna(fot, { fra: '2025-01-01', til: IDAG, stolpi: 'fyrri_eigandi', idag: IDAG });
ok('fyrri_eigandi: engar Stólpa-línur eftir 07.05.2026', !faerslur(pF).some(l => l.uppruni !== 'app' && l.uppruni !== 'payday' && l.dags > K.YFIRTAKA));
jafnt('fyrri_eigandi: uppgjör 07.05.2026 og lokastaða', [faerslur(pF).filter(l => l.flokkur === 'uppgjor').map(l => l.upphaed), pF.samantekt.lokastada], [[-8018], 0]);
ok('fyrri_eigandi: athugasemd um 3 færslur eftir yfirtöku (-8.313)', pF.athugasemdir.some(a => /3 Stólpa-færslur eftir 07\.05\.2026 \(samtals -8\.313 kr\)/.test(a)), pF.athugasemdir);

// ── saekja(): sóknaráætlun með hermdu PostgREST (síðuskipting 7 raðir) ──────
console.log('\nsaekja() — hermt PostgREST, síðustærð 7');
(async () => {
  const kollud = [];
  const medInnfellingu = s => { const r = Object.assign({}, s, { cb: s.cb_kt != null ? { kennitala: s.cb_kt } : null, fy: s.fy_kt != null ? { kennitala: s.fy_kt } : null }); delete r.cb_kt; delete r.fy_kt; return r; };
  async function sbGet(slod, fra, til) {
    kollud.push({ slod: decodeURIComponent(slod), fra, til });
    const tafla = slod.split('?')[0];
    let radir;
    if (tafla === 'stolpi_hreyfingar') radir = atlas.stolpi_hreyfingar.slice().sort((a, b) => a.id - b.id);
    else if (tafla === 'stolpi_reikningar') radir = atlas.stolpi_reikningar;
    else if (tafla === 'customers_base') radir = atlas.customers_base;
    else if (tafla === 'fyrirtaeki') radir = atlas.fyrirtaeki;
    else if (tafla === 'payday_invoices_slokk') radir = /payday_id=/.test(slod) ? [] : atlas.payday;
    else if (tafla === 'app_settings') throw new Error('hermt: app_settings ekki til');
    else if (tafla === 'solur') radir = (/customer_nafn=/.test(slod) ? atlas.solur_nafn : atlas.solur).map(medInnfellingu);
    else throw new Error('óþekkt tafla ' + tafla);
    return radir.slice(fra, til + 1);
  }
  try {
    const gogn = await K.saekja('540319-1540', sbGet, { siduStaerd: 7 });
    jafnt('Stólpa-hreyfingar sóttar yfir síður', gogn.stolpi_hreyfingar.length, 56);
    jafnt('síðuköll á stolpi_hreyfingar', kollud.filter(k => k.slod.startsWith('stolpi_hreyfingar')).length, 9);
    ok('hver fyrirspurn ber order= (stöðug síðuskipting)', kollud.filter(k => !k.slod.startsWith('app_settings')).every(k => /[?&]order=/.test(k.slod)), kollud.map(k => k.slod));
    ok('sölu-fyrirspurn: customer_kt + customers_base 403 + fyrirtaeki 233', kollud.some(k => k.slod.includes('or=(customer_kt.in.(540319-1540,5403191540),customer_base_id.in.(403),customer_id.in.(233))')), kollud.map(k => k.slod));
    ok('nafna-vísbending: ilike *atlas verktakar* án kennitölu', kollud.some(k => k.slod.includes('customer_nafn=ilike.*atlas verktakar*') && k.slod.includes('customer_kt.in.("",999999-9999)')), kollud.map(k => k.slod));
    ok('cb/fy innfelling flött í cb_kt/fy_kt', gogn.solur.every(s => !('cb' in s) && 'cb_kt' in s) && gogn.solur_nafn.every(s => !('fy' in s)), gogn.solur[0]);
    jafnt('branding fellur hljóðlega í null ef app_settings bregst', gogn.branding, null);
    const a = K.reikna(atlas, { fra: '2025-01-01', til: IDAG, idag: IDAG });
    const b = K.reikna(gogn, { fra: '2025-01-01', til: IDAG, idag: IDAG });
    ok('reikna(saekja()) === reikna(fixture)', JSON.stringify(a) === JSON.stringify(b));
  } catch (e) {
    ok('saekja keyrði án villu', false, e.stack || String(e));
  }
  console.log(`\n${villur ? '❌' : '✅'} ${fjoldi - villur} af ${fjoldi} prófum stóðust${villur ? ' — ' + villur + ' féllu' : ''}.`);
  process.exit(villur ? 1 : 0);
})();
