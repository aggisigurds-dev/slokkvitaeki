#!/usr/bin/env node
'use strict';
/* SKÝRSLA TIL, ENGINN REIKNINGUR — verk unnið og skýrsla gerð en ekkert rukkað.
 * Búinn til: 07.11.2026. Mæling: sýnan `v_verk_an_reiknings` — úr leitinni 07.11.2026 þar sem um milljón lá úti og
 *   133 staðir biðu skoðunar. Leitin var handvirk; nú er hún vörður.
 * Ver gegn gildrunni: unnið verk sem aldrei er rukkað af því enginn reikningur er stofnaður eftir skýrslu.
 * Hönnun: BASELINE, EKKI ALGILD TALA. Rauður AÐEINS ef NÝ tilvik bætast við umfram grunnlínuna; gamla skuldin er
 *   nafngreindur listi í tools/_grunnlina-syn.json (kjarni: _grunnlina-syn.cjs). Read-only — skrifar aldrei í gögn.
 * Endurstilla grunnlínu: uppfæra fastana hér og keyra  node tools/audit-verk-an-reiknings.cjs --skra-grunnlinu
 */
// ── GRUNNLÍNA (mæld 07.11.2026) ─────────────────────────────────────────────────
const BASELINE_DAGS = '07.11.2026';
const BASELINE_TALA = 29;
const BASELINE_UPPHAED = null;   // kr (null = sýnan geymir enga fjárhæð)

const { keyra, kr } = require('./_grunnlina-syn.cjs');
keyra({
  syn: 'v_verk_an_reiknings', merki: 'raðir',
  baselineTala: BASELINE_TALA, baselineUpphaed: BASELINE_UPPHAED, baselineDags: BASELINE_DAGS,
  lykill: r => r.fyrirtaeki_id + '|' + r.ar + '|' + r.manudur,
  upphaed: null,
  lysing: r => '#' + r.fyrirtaeki_id + '  ' + r.nafn + '  ' + r.ar + '-' + r.manudur + '  ' + r.taeki + ' tæki',
  gera: 'Stofna reikning fyrir hverja skýrslu, eða skrá hvers vegna enginn á að koma (gjafaverk, innanhúss).',
}).catch(e => { console.log('RED: audit sprakk: ' + e.message); process.exitCode = 1; });
