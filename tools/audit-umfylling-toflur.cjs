#!/usr/bin/env node
/**
 * VÖRÐUR: „UMFYLLING"-DÁLKURINN (00-legacy) FER AÐEINS Á TÆKJATÖFLUR — ALDREI Á SKÝRSLUBLAÐ
 *
 * Agnar 05.10.2026 (skjámynd af prófíl Bílabúðar Benna – Fiskislóð): „dagsetningarnar inn í brunakerfis skoðun alveg
 * risastórar, og þurfa ekki að vera" · „átti í raun bara líta svona út" (PDF-ið).
 * Gamli Umfyllingar-kóðinn leitaði að ÖLLUM töflum í #companies-main, las <th> úr innfelldum töflum líka og hengdi
 * <input type="date"> á hverja línu. Eftir að skýrslublað brunakerfis (273 renderSheet) fór að birtast inni í
 * prófílnum (274 #_bkc-blad) lenti það á blaðinu: mælt á lifandi síðu 42 dagsetningarreitir, hver 237×42 px.
 * Mælitæki: E:\pascal-profun\blad-dags.cjs (42 reitir á gömlu byggingunni, 0 á þeirri nýju).
 * Les aðeins kóðann (ekkert net, engir lyklar).
 */
const fs = require('fs');
const path = require('path');
const s = fs.readFileSync(path.join(__dirname, '..', 'js/patches/00-legacy.js'), 'utf8').replace(/\r/g, '');
const villur = [];
const a = s.indexOf('function addRefillColumn(){'), b = a < 0 ? -1 : s.indexOf('async function loadRefillData', a);
if (a < 0 || b < 0) villur.push('00-legacy: fann ekki addRefillColumn');
else {
  const f = s.slice(a, b).replace(/\/\/[^\n]*/g, '');
  if (!/if\(table\.closest\('#_bkc-blad, \.b274-blad, #_bkc-overlay, #_bks-overlay'\)\) return;/.test(f)) villur.push('00-legacy: Umfyllingar-dálkurinn verður að sleppa skýrslublöðum brunakerfis (#_bkc-blad, .b274-blad og yfirlögin)');
  if (!/var headerRow = table\.tHead && table\.tHead\.rows\[0\];/.test(f) || !/Array\.from\(headerRow\.cells\)\.some\(/.test(f)) villur.push('00-legacy: tækjatafla þekkist á EIGIN haus (table.tHead) — ekki <th> úr innfelldum töflum');
  if (/table\.querySelectorAll\('(th|tbody tr)'\)/.test(f)) villur.push("00-legacy: querySelectorAll('th' / 'tbody tr') nær líka í innfelldar töflur — nota table.tHead / table.tBodies");
}
if (villur.length) { console.log('RED  UMFYLLING-TÖFLUR — ' + villur.length + ' brot:\n  · ' + villur.join('\n  · ')); process.exit(1); }
console.log('UMFYLLING-TÖFLUR GRÆNT — dagsetningardálkurinn fer aðeins á töflu með eigin raðnúmers-haus og aldrei á skýrslublað.');
process.exit(0);
