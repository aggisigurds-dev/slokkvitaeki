#!/usr/bin/env node
/*
 * audit-sott-afslattur.cjs — drög af verkstæðinu bera afslátt félagsins.  03.11.2026
 *
 * Agnar: „sami afslátturinn á að koma sjálfvirkt á alla í sama félagi."
 *
 * VILLAN SEM ÞETTA VER: 122 `submitReceive` bjó til drögin með `afslattur: 0` HARÐKÓÐUÐU og
 * leit aldrei á `_selectedCompany.afslattur_pct`, þótt félagið væri valið í sama falli. Salan
 * (pos.js) setti afsláttinn sjálfkrafa, úttektartaflan (129) líka — Sótt-leiðin ein gerði það
 * ekki. Mælt 03.11.2026: 2 af 2 Sótt-sölum hjá félögum með skráðan afslátt fóru út án hans
 * (R-001050 Brynja leigufélag 20 %, R-001080 Gullhamrar veitingar 20 %). Hvorug sást í viðmótinu
 * — drögin líta rétt út, bara dýrari.
 *
 * Vörðurinn keyrir RAUNVERULEGU LÍNURNAR úr 122 í Node vm (ekki afrit — afrit sannar ekkert um
 * skrána sem keyrir). Hann dregur reiknistubbinn út úr `submitReceive` og reiknar þrjú tilvik:
 *   A. 20 %-félag, engin tilboðsverð  → afsláttur = 20 % MEÐ vsk, ex/vsk geymd EFTIR afslátt.
 *   B. 20 %-félag með tilboðsverðslínu → sú lína er ÓSNERT (þrepin: Tilboðsverð › Hópur › % af öllu).
 *   C. félag án afsláttar            → afsláttur 0 og tölurnar óbreyttar (engin ný hegðun).
 *
 * Viðmiðunartalan í A er tekin af RAUNVERULEGUM reikningi svo venjan um `solur.afslattur`
 * (geymd MEÐ vsk) sé sannreynd en ekki ályktuð: R-001070, Steypustöðin Helguvík, brúttó
 * 34.857 kr. án vsk, 25 % → afslattur 10.806, upphaed_an_vsk 26.143, vsk_upphaed 6.274.
 *
 * Keyrsla:  node tools/audit-sott-afslattur.cjs
 * Les aðeins skrá — ekkert net, engir lyklar.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

// argv[2] leyfir að beina verðinum á eldri útgáfu skrárinnar — notað til að sanna að RAUÐA greinin virki.
const skra = process.argv[2] || path.join(__dirname, '..', 'js', 'patches', '122-samningshafar-receive.js');
const src = fs.readFileSync(skra, 'utf8').replace(/\r/g, '');
const brot = [];
const krefja = (satt, m) => { if (!satt) brot.push(m); };

krefja(!/afslattur:\s*0\s*,/.test(src),
  '122: `afslattur: 0` er komið aftur inn — drög af verkstæðinu fara þá aftur út á fullu verði '
+ 'hjá félögum með samning.');
krefja(/afslattur:\s*draftAfsl\s*,/.test(src),
  '122: drögin senda ekki lengur `draftAfsl` í `afslattur`. Reikningurinn ber þá engan afslátt '
+ 'sama hvað reiknað var.');

// ── Draga reiknistubbinn út og keyra hann ───────────────────────────────────
const fra = src.indexOf('const brutEx = linur.reduce');
const til = src.indexOf('const draftTotal = Math.round(draftEx + draftVsk);');
if (fra < 0 || til < 0) {
  console.log('RED: fann ekki reiknistubbinn í 122 (`brutEx` … `draftTotal`) — vörðurinn getur ekki dæmt.');
  process.exit(1);
}
const stubbur = src.slice(fra, til) + 'const draftTotal = Math.round(draftEx + draftVsk);';

function reikna(linur, pct) {
  const sandur = { linur, _selectedCompany: { afslattur_pct: pct }, Math, Number, out: null };
  vm.createContext(sandur);
  vm.runInContext(stubbur + '\nout = { draftEx, draftVsk, draftAfsl, draftTotal, brutEx, brutVsk };', sandur);
  return sandur.out;
}

const L = (qty, verd, vsk, isOverride) => ({ qty, unit_price_ex_vat: verd, vsk_pct: vsk, isOverride: !!isOverride });

// A. Raunverulegi reikningurinn R-001070: 34.857 án vsk, 25 %.
const a = reikna([L(1, 34857, 24)], 25);
krefja(a.draftAfsl === 10806, 'A: afsláttur ' + a.draftAfsl + ' kr. — á að vera 10.806 (25 % af 34.857 MEÐ vsk, sbr. R-001070). '
  + 'Sé talan 8.714 er hún geymd ÁN vsk og stangast á við Söluna.');
krefja(Math.round(a.draftEx) === 26143, 'A: upphaed_an_vsk ' + Math.round(a.draftEx) + ' — á að vera 26.143 (eftir afslátt).');
krefja(Math.round(a.draftVsk) === 6274, 'A: vsk_upphaed ' + Math.round(a.draftVsk) + ' — á að vera 6.274 (eftir afslátt).');
krefja(a.draftTotal === 32417, 'A: samtals ' + a.draftTotal + ' — á að vera 32.417.');

// B. Tilboðsverðslína má ekki fá prósentuna ofan á.
const b = reikna([L(1, 10000, 24, true), L(1, 10000, 24, false)], 20);
krefja(b.draftAfsl === 2480, 'B: afsláttur ' + b.draftAfsl + ' — á að vera 2.480 (20 % MEÐ vsk af EINNI línu). '
  + 'Sé hann 4.960 er tilboðsverðið líka afslátturst — þrepin Tilboðsverð › Hópur › % af öllu brotin.');
krefja(Math.round(b.draftEx) === 18000, 'B: ex ' + Math.round(b.draftEx) + ' — á að vera 18.000 (10.000 óbreytt + 8.000).');

// C. Félag án afsláttar: engin breyting frá fyrri hegðun.
const c = reikna([L(2, 5000, 24), L(1, 1000, 11)], 0);
krefja(c.draftAfsl === 0, 'C: afsláttur ' + c.draftAfsl + ' hjá félagi án afsláttar — á að vera 0.');
krefja(Math.round(c.draftEx) === 11000 && Math.round(c.draftVsk) === Math.round(10000 * 0.24 + 1000 * 0.11),
  'C: tölur félags án afsláttar breyttust (ex ' + Math.round(c.draftEx) + ', vsk ' + Math.round(c.draftVsk) + ').');

if (brot.length) {
  console.log('RED: ' + brot.length + ' brot á Sótt-afslættinum:');
  brot.forEach((b2) => console.log('   • ' + b2));
  process.exit(1);
}
console.log('✅ GRÆNT Sótt-afsláttur: drög af verkstæðinu erfa prósentu félagsins (10.806 á R-001070-viðmiðinu), '
  + 'tilboðsverðslína er ósnert, og félag án afsláttar fær óbreyttar tölur.');
