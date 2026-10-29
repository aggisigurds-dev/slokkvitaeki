#!/usr/bin/env node
'use strict';
/* SJÁLFVIRKI ÚTTEKTARTEXTINN (patch 294) SEGIR HVE MÖRG TÆKI VORU YFIRFARIN, HLAÐIN OG NÝ.
 *
 * Ósk Agnars 29.10.2026: „hve mörg voru yfirfarin, mörg hlaðin og ný" og „hlaðin (skipt um innihald)".
 * Mælir smida() úr patch 294 án nets (innsetning með gervi-umhverfi) á föstum tilvikum. Heildin = yfirferð + hleðsla
 * (hlaðið tæki er líka yfirfarið), ný tæki eru ekki í heildinni, slöngur/skynjarar eiga sínar línur.
 * Keyrsla:  node tools/audit-uttektartexti.cjs
 */
const fs = require('fs');
const path = require('path');
const src = fs.readFileSync(path.join(__dirname, '..', 'js/patches/294-uttektartexti.js'), 'utf8');

function run(units, choices) {
  const store = {};
  const sb = {
    window: {}, console: { log() {} }, setTimeout: () => 0, clearTimeout() {},
    localStorage: { getItem: k => store[k] || null, setItem: (k, v) => { store[k] = v; } },
    document: { addEventListener() {}, getElementById() { return null; }, querySelector() { return null; } },
    MutationObserver: function () { this.observe = () => {}; }, Event: function () {}, alert() {}, confirm() { return true; },
  };
  sb.window.Companies = { list: [{ id: 1, nafn: 'X' }] };
  sb.window.DB = { cache: { units: units.map((t, i) => ({ id: i + 1, client: 'X', type: t })) } };
  sb.window.UnitServicePicker = { getChoice: (co, id) => choices[id - 1] };
  sb.DB = sb.window.DB; sb.Companies = sb.window.Companies; sb.UnitServicePicker = sb.window.UnitServicePicker;
  new Function(...Object.keys(sb), src).apply(null, Object.values(sb));
  return sb.window.Uttektartexti.forskoda(1);
}
const L = 'Léttvatn', D = 'Duft', S = 'Brunaslanga';
const rep = (t, n) => Array(n).fill(t);
const TILVIK = [
  ['14 yfirferð', rep(L, 14), rep('yfirferd', 14), 'Öll 14 slökkvitæki yfirfarin og vottuð í lagi.'],
  ['2 yfirferð + 12 hlaðin', [...rep(L, 2), ...rep(L, 12)], [...rep('yfirferd', 2), ...rep('hledsla', 12)],
    'Öll 14 slökkvitæki yfirfarin og vottuð í lagi. 12 þeirra endurhlaðin (skipt um innihald) og vottuð í lagi.'],
  ['allt hlaðið', rep(D, 4), rep('hledsla', 4), 'Öll 4 slökkvitæki yfirfarin, endurhlaðin (skipt um innihald) og vottuð í lagi.'],
  ['eitt tæki', [L], ['yfirferd'], 'Eitt slökkvitæki yfirfarið og vottað í lagi.'],
  ['eitt hlaðið', [D], ['hledsla'], 'Eitt slökkvitæki yfirfarið, endurhlaðið (skipt um innihald) og vottað í lagi.'],
  ['blanda: yfirferð, hleðsla, ný, slöngur, ónýtt', [...rep(L, 10), D, ...rep(L, 3), ...rep(S, 6), L],
    [...rep('yfirferd', 10), 'hledsla', ...rep('nyitt', 3), ...rep('yfirferd', 6), 'onytt'],
    'Öll 11 slökkvitæki yfirfarin og vottuð í lagi nema eitt sem var dæmt ónýtt. Eitt þeirra endurhlaðið (skipt um innihald) og vottað í lagi. 3 nýjum slökkvitækjum bætt við.\nBrunaslöngur prófaðar á fullum þrýstingi.'],
  ['bara ný', rep(L, 3), rep('nyitt', 3), '3 nýjum slökkvitækjum bætt við.'],
];
const brot = [];
for (const [nafn, u, c, vaent] of TILVIK) {
  const ut = run(u, c);
  if (ut !== vaent) brot.push(nafn + ':\n    fékk   ' + JSON.stringify(ut) + '\n    átti að vera ' + JSON.stringify(vaent));
}
if (brot.length) { console.log('❌ RAUTT úttektartexti: ' + brot.length + ' brot'); brot.forEach(b => console.log('  - ' + b)); process.exit(1); }
console.log('✅ GRÆNT úttektartexti: fjöldi yfirfarinna, hlaðinna („skipt um innihald") og nýrra tækja stendur í textanum (' + TILVIK.length + ' tilvik)');
process.exit(0);
