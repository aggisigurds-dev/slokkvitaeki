#!/usr/bin/env node
/* Prófun: hvaða sölulínur fá NÝJA verkbeiðni þegar sala er vistuð í sölu-ritlinum (142).
 *
 * Villan (Agnar 16.11.2026: „2 CO2 fyllinga kútar koma ennþá stundum sem eitt verk"):
 * ritillinn taldi verk sölunnar á móti línum merktum krefst_verkbeidni. Línur úr Sölu
 * (pos.js bakedLines) bera merkið ekki í grunninum, svo seinni kútur sem bætt var við
 * í ritlinum fékk ekkert verk ef salan átti þegar jafn mörg verk og merktar línur.
 *
 * Raðirnar hér að neðan eru RAUNVERULEGAR (lesnar úr solur / verkbeidnir 16.11.2026,
 * aðeins SELECT). Prófunin hleður 142 í sandkassa og keyrir bæði gömlu regluna
 * (endurgerð orðrétt) og þá nýju á sömu röðum.
 *
 *   node tools/test-sala-ritill-verk.cjs
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const SKRA = path.join(__dirname, '..', 'js', 'patches', '142-sale-editor.js');
const win = {};
const sandbox = {
  window: win, console: { log() {}, warn() {}, error() {} },
  document: { addEventListener() {}, removeEventListener() {}, getElementById() { return null; }, querySelector() { return null; } },
  setTimeout, clearTimeout
};
vm.runInNewContext(fs.readFileSync(SKRA, 'utf8'), sandbox, { filename: SKRA });
const nyja = win.SaleEditor && win.SaleEditor._verkLinurTilStofnunar;
const hreinsa = win.SaleEditor && win.SaleEditor._linurTilVistunar;
if (typeof nyja !== 'function' || typeof hreinsa !== 'function') {
  console.error('FALL: 142 birtir ekki _verkLinurTilStofnunar / _linurTilVistunar');
  process.exit(1);
}
// Gamla reglan, orðrétt úr 142 fyrir 16.11.2026:
//   taeki = linur.filter(l => l.krefst_verkbeidni === true)
//   for (k = existing.length; k < taeki.length; k++) stofna(taeki[k])
const gamla = (linur, fjoldiVerka) => linur.filter(l => l.krefst_verkbeidni === true).slice(fjoldiVerka);

let fall = 0;
function stadfesta(heiti, raun, vaent) {
  const ok = JSON.stringify(raun) === JSON.stringify(vaent);
  if (!ok) fall++;
  console.log((ok ? '  ok   ' : '  FALL ') + heiti + (ok ? '' : '\n         fékk:   ' + JSON.stringify(raun) + '\n         vænti:  ' + JSON.stringify(vaent)));
}
const lysa = l => l.map(x => x.desc + ' ×' + x.qty);

// ── 1. R-000926 (solur 956, Sigurður, 11.09.2026) ───────────────────────────
// Sala úr Sölu: CO₂ 100 gr. ×26 + byrjunargjald → verk 849 (R-000926-V1). Seinni kútnum
// (CO₂ 100 gr. ×26) var bætt við í ritlinum — línan ber krefst_verkbeidni:true í grunninum —
// en salan á enn AÐEINS eitt verk. Tveir kútar, eitt verk.
const r926_ur_solu = [
  { qty: 26, ref: '', desc: 'CO₂ 100 gr.', type: 'service', vsk_pct: 24, product_id: 83, unit_price_ex_vat: 150 },
  { qty: 1, ref: '', desc: 'CO₂ byrjunargjald', type: 'product', vsk_pct: 24, product_id: 40, unit_price_ex_vat: 1000 }
];
const r926_vidbot = { qty: 26, desc: 'CO₂ 100 gr.', type: 'service', vsk_pct: 24, product_id: 83, discount_pct: 0, krefst_verkbeidni: true, unit_price_ex_vat: 150 };
console.log('R-000926 — seinni CO₂-kút bætt við í ritlinum, salan á 1 verk (R-000926-V1):');
{
  const ny = Object.assign({}, r926_vidbot, { _ny: true });        // eins og addLine setur hana inn
  const linur = r926_ur_solu.concat([ny]);
  stadfesta('FYRIR: gamla reglan stofnar ekkert verk (villan)', lysa(gamla(linur, 1)), []);
  stadfesta('EFTIR: seinni kúturinn fær sitt verk', lysa(nyja(linur, 1, [ny])), ['CO₂ 100 gr. ×26']);
  const vistad = hreinsa(linur);
  stadfesta('vinnumerkið _ny fer ekki í solur.linur', vistad.some(l => '_ny' in l), false);
  stadfesta('vistaða línan er sú sama og stendur í grunninum í dag', vistad[2], r926_vidbot);
  // Röðin eins og hún stendur í grunninum núna (ekkert bætt við í opnuninni): ekkert verk verður til eftirá.
  const idag = r926_ur_solu.concat([Object.assign({}, r926_vidbot)]);
  stadfesta('endurvistun án viðbótar stofnar ekkert (engin tvítekning eftirá)', lysa(nyja(idag, 1, [])), []);
}

// ── 2. R-001004 (solur 1029, Bustravel, 23.09.2026) ─────────────────────────
// Tvær línur úr Sölu → verk 887 og 888. Í ritlinum bættust við Duft 6 kg hleðsla ×5 og
// CO₂ 100 gr. ×25 (báðar merktar) — hvorug fékk verk (2 verk á móti 2 merktum línum).
const r1004_ur_solu = [
  { qty: 1, ref: '', desc: 'Léttvatnstæki 6L. yfirferð', type: 'service', vsk_pct: 24, product_id: 27, unit_price_ex_vat: 3150 },
  { qty: 4, ref: '', desc: 'Duft 2 kg. ABC yfirferð', type: 'service', vsk_pct: 24, product_id: 358, unit_price_ex_vat: 2903.23 }
];
const r1004_vidbot = [
  { qty: 5, desc: 'Duft 6 kg. ABC hleðsla', type: 'service', vsk_pct: 24, product_id: 6, discount_pct: 0, krefst_verkbeidni: true, unit_price_ex_vat: 6782.26 },
  { qty: 1, desc: 'Skipafesting fyrir 6 kg. Slökkvitæki', type: 'product', vsk_pct: 24, product_id: 113, discount_pct: 0, krefst_verkbeidni: false, unit_price_ex_vat: 6962.9 },
  { qty: 25, desc: 'CO₂ 100 gr.', type: 'service', vsk_pct: 24, product_id: 83, discount_pct: 0, krefst_verkbeidni: true, unit_price_ex_vat: 150 }
];
console.log('R-001004 — tvær tæki-línur bætast við sölu sem á 2 verk:');
{
  const ny = r1004_vidbot.map(l => Object.assign({}, l, { _ny: true }));
  const linur = r1004_ur_solu.concat(ny);
  stadfesta('FYRIR: gamla reglan stofnar ekkert verk (villan)', lysa(gamla(linur, 2)), []);
  stadfesta('EFTIR: báðar tæki-línurnar fá verk, festingin (vara) ekki', lysa(nyja(linur, 2, ny)), ['Duft 6 kg. ABC hleðsla ×5', 'CO₂ 100 gr. ×25']);
}

// ── 3. R-001309 (solur 1330, drög frá 16.11.2026) — nýleg röð ───────────────
// Einn CO₂-kútur, verk 1044 (R-001309-V1). Hermt: kúnninn kemur með annan kút og
// honum er bætt við í ritlinum (ekkert skrifað í grunninn).
const r1309 = [
  { qty: 23, ref: '', desc: 'CO₂ 100 gr.', type: 'service', vsk_pct: 24, product_id: 83, unit_price_ex_vat: 150 },
  { qty: 1, ref: '', desc: 'CO₂ byrjunargjald', type: 'product', vsk_pct: 24, product_id: 40, unit_price_ex_vat: 1000 }
];
console.log('R-001309 — nýleg drög (1 kútur, 1 verk), öðrum kút bætt við:');
{
  const ny = { desc: 'CO₂ 100 gr.', qty: 1, unit_price_ex_vat: 150, vsk_pct: 24, discount_pct: 0, type: 'service', product_id: 83, krefst_verkbeidni: true, _ny: true };
  const linur = r1309.concat([ny]);
  stadfesta('FYRIR: ekkert verk (tveir kútar, eitt verk)', lysa(gamla(linur, 1)), []);
  stadfesta('EFTIR: eitt nýtt verk fyrir seinni kútinn', lysa(nyja(linur, 1, [ny])), ['CO₂ 100 gr. ×1']);
  stadfesta('óbreytt sala vistuð aftur: ekkert verk (hvorki fyrir né eftir)', [lysa(gamla(r1309, 1)), lysa(nyja(r1309, 1, []))], [[], []]);
}

// ── 4. Það sem má EKKI breytast ─────────────────────────────────────────────
console.log('Óbreytt hegðun:');
{
  // R-001200 (Staðgreitt, 22.10.2026): fyllt á staðnum, verkbeiðnum sleppt (0 verk). Breyting í ritli
  // (t.d. afsláttur) má ekki búa til verk fyrir kúta sem eru þegar farnir.
  const r1200 = [
    { qty: 1, ref: '', desc: 'CO₂ byrjunargjald', type: 'product', vsk_pct: 24, product_id: 40, unit_price_ex_vat: 1000 },
    { qty: 26, ref: '', desc: 'CO₂ 100 gr.', type: 'service', vsk_pct: 24, product_id: 83, unit_price_ex_vat: 150 },
    { qty: 26, ref: '', desc: 'CO₂ 100 gr.', type: 'service', vsk_pct: 24, product_id: 83, unit_price_ex_vat: 150 }
  ];
  stadfesta('R-001200: sala án verka, engin viðbót → ekkert verk', lysa(nyja(r1200, 0, [])), []);
  // Varaleiðin „vistaðu söluna aftur": merkt lína úr eldri opnun sem fékk ekki verk (stofnun mistókst), 0 verk til.
  const eldri = [{ qty: 1, desc: 'CO₂ 2 kg. hleðsla', krefst_verkbeidni: true }];
  stadfesta('eldri merkt lína án verks → verk við endurvistun (eins og áður)', [lysa(gamla(eldri, 0)), lysa(nyja(eldri, 0, []))], [['CO₂ 2 kg. hleðsla ×1'], ['CO₂ 2 kg. hleðsla ×1']]);
  stadfesta('eldri merkt lína sem á verk → ekkert (eins og áður)', [lysa(gamla(eldri, 1)), lysa(nyja(eldri, 1, []))], [[], []]);
  // Ómerkt viðbót (vara yfir borðið, byrjunargjald) fær aldrei verk.
  const vara = { qty: 1, desc: 'CO₂ byrjunargjald', krefst_verkbeidni: false, _ny: true };
  stadfesta('ný lína sem er ekki tæki → ekkert verk', lysa(nyja(r1309.concat([vara]), 1, [vara])), []);
}

console.log(fall ? '\n' + fall + ' atriði FÉLLU' : '\nAllt stóðst.');
process.exit(fall ? 1 : 0);
