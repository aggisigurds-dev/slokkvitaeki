#!/usr/bin/env node
/* VÖRÐUR — pappar sem raða línunum í fyrirtækjaspjaldinu (.co-bupp) verða að vera SAMMÁLA um röðina.
 *
 * VILLAN, fundin 20.10.2026 (Agnar: „þessir takkar eru að blikka stanslaust", mælt 12–15 DOM-breytingar/s á
 * #companies-main .co-bupp): á prófíl án Teikninga- og Séruppdrátta-línu setti 432 Hús-línuna (._fasteign) beint á UNDAN
 * Óskráð (.b411-oskrad), en 464 setur Rýmingaráætlun-línuna (._ba-lina) á EFTIR Hús-línunni. Þá stóð Rýmingaráætlun
 * milli Húss og Óskráð, 432 færði Hús framhjá henni, 464 færði sína til baka — reiptog í MutationObserver, 15×/s, að eilífu.
 * Vörðurinn var grænn af því hvorug skráin var röng ein og sér; vandinn var samspilið.
 *
 * Þessi vörður líkir eftir BÁÐUM stöðsetningarföllunum á raunverulegri raðgerð (litlu DOM-líkani) og krefst þess að röðin
 * festist innan fárra umferða í öllum samsetningum sem prófíllinn getur haft (með/án Teikninga, Séruppdrátta, Húss).
 * Líkanið les STAÐSETNINGARREGLURNAR beint úr frumskránum með því að ná í ankerin sem þær nota — breytist önnur þeirra svo
 * hún noti annað akkeri en hin reiknar með, fellur vörðurinn.
 *
 *   node tools/audit-bupp-rod.cjs
 */
const fs = require('fs');
const path = require('path');
const rot = path.join(__dirname, '..');
const les = (f) => fs.readFileSync(path.join(rot, f), 'utf8');

const s432 = les('js/patches/432-fasteign-facts.js');
const s464 = les('js/patches/464-brunaaaetlun-takki.js');

// ── Líkan: raðaður listi af nöfnum. Hver „pappi" er fall sem breytir listanum eftir sömu reglum og frumskráin. ──
function fjarlaega(l, x) { const i = l.indexOf(x); if (i > -1) l.splice(i, 1); }
function settaEftir(l, x, ref) { fjarlaega(l, x); l.splice(l.indexOf(ref) + 1, 0, x); }
function settaFyrir(l, x, ref) { fjarlaega(l, x); l.splice(l.indexOf(ref), 0, x); }
const til = (l, x) => l.indexOf(x) > -1;
const naesti = (l, x) => l[l.indexOf(x) + 1];
const fyrri = (l, x) => l[l.indexOf(x) - 1];

// 432 stadsetja(box, el=_fasteign) — afritað eftir frumskránni; ankerin eru valin með því sem skráin NOTAR.
function p432(l, ankeri432) { // skilar fjölda færslna (DOM-skrifa)
  let f = 0; const eftir = (...a) => { settaEftir(...a); f++; }; const fyrirF = (...a) => { settaFyrir(...a); f++; };
  const a = til(l, '_serupp') ? '_serupp' : til(l, '_teikn') ? '_teikn' : null;
  if (a) { if (naesti(l, a) !== '_fasteign') eftir(l, '_fasteign', a); return f; }
  const fyrir = ankeri432.map((k) => (til(l, k) ? k : null)).find(Boolean);
  if (fyrir) { if (fyrri(l, fyrir) !== '_fasteign') fyrirF(l, '_fasteign', fyrir); return f; }
  if (!til(l, '_fasteign')) { l.push('_fasteign'); f++; }
  return f;
}
// 464 setjaLinu — lína (._ba-lina) á eftir _fasteign | _serupp | _teikn; annars á undan Óskráð.
function p464(l) {
  let f = 0; const eftir = (...a) => { settaEftir(...a); f++; }; const fyrirF = (...a) => { settaFyrir(...a); f++; };
  const fyrir = ['_fasteign', '_serupp', '_teikn'].find((k) => til(l, k));
  if (fyrir) { if (naesti(l, fyrir) !== '_ba-lina') eftir(l, '_ba-lina', fyrir); return f; }
  if (til(l, 'b411-oskrad')) { if (fyrri(l, 'b411-oskrad') !== '_ba-lina') fyrirF(l, '_ba-lina', 'b411-oskrad'); return f; }
  if (!til(l, '_ba-lina')) { l.push('_ba-lina'); f++; }
  return f;
}

// Ankerin sem 432 notar án Teikninga/Séruppdrátta, í þeirri röð sem skráin leitar að þeim.
const m432 = /const fyrir = ((?:box\.querySelector\(':scope > ([^']+)'\)\s*(?:\|\|\s*)?)+);/.exec(s432);
if (!m432) { console.log('❌ BUPP-RÖÐ: fann ekki ankerin í 432 stadsetja() — vörðurinn þarf uppfærslu.'); process.exit(1); }
const ankeri432 = [...m432[1].matchAll(/:scope > ([^']+)'/g)].map((x) => x[1].replace(/^\./, '').replace('._bupp-vixl', '_bupp-vixl'));
const nafn = (k) => ({ '_ba-lina': '_ba-lina', 'b411-oskrad': 'b411-oskrad', '_bupp-vixl': '_bupp-vixl' }[k.replace(/^\./, '')] || k.replace(/^\./, ''));
const anker = ankeri432.map(nafn);

if (!/const LINA = '_ba-lina'/.test(s464)) { console.log('❌ BUPP-RÖÐ: LINA í 464 er ekki lengur _ba-lina — vörðurinn þarf uppfærslu.'); process.exit(1); }

const villur = [];
for (const med of [[], ['_teikn'], ['_serupp'], ['_teikn', '_serupp']]) {
  for (const husFyrst of [true, false]) {
    for (const lina of [true, false]) {
      let l = ['x1', 'x2'].concat(med.includes('_teikn') ? ['_teikn'] : [], med.includes('_serupp') ? ['_serupp'] : [], ['b411-oskrad', 'x3']);
      if (husFyrst) p432(l, anker);
      if (lina) p464(l);
      // Umferðir á víxl. Telur FÆRSLUR (DOM-skrif), ekki nettó breytingu — reiptog er færsla fram og til baka innan umferðar.
      // Eftir 4 umferðir á hvorug að færa neitt.
      let breytt = 0, snapshot = '';
      for (let i = 0; i < 12; i++) {
        const faerslur = p432(l, anker) + p464(l);
        if (faerslur > 0) breytt = i + 1;
        snapshot = l.join(' · ');
      }
      if (breytt > 4) villur.push('með [' + med.join(',') + '] ' + (husFyrst ? 'Hús fyrst' : 'lína fyrst') + ': færist enn í umferð ' + breytt + ' (reiptog) — ' + snapshot);
    }
  }
}
if (villur.length) {
  console.log('❌ BUPP-RÖÐ: 432 og 464 raða línum fyrirtækjaspjaldsins ósammála (ankeri 432 án Teikninga: ' + anker.join(' → ') + '):');
  villur.forEach((v) => console.log('   · ' + v));
  process.exit(1);
}
console.log('✅ GRÆNT bupp-röð: 432 (Hús) og 464 (Rýmingaráætlun) festast í sömu röð í öllum 16 samsetningum (ankeri 432 án Teikninga: ' + anker.join(' → ') + ').');
