#!/usr/bin/env node
'use strict';
/* KREDITFÆRT OG ALDREI ENDURGERT — reikningur felldur niður en réttur reikningur kom aldrei í staðinn.
 * Búinn til: 07.11.2026. Mæling: sýnan `v_kredit_an_endurgerdar` — úr leitinni 07.11.2026 þar sem um milljón lá úti og
 *   133 staðir biðu skoðunar. Leitin var handvirk; nú er hún vörður.
 * Ver gegn gildrunni: viðskiptavinur er kreditfærður (til leiðréttingar) en ný sala er aldrei gerð, svo upphæðin er hvorki rukkuð né afskrifuð af ásetningi.
 * Hönnun: BASELINE, EKKI ALGILD TALA. Rauður AÐEINS ef NÝ tilvik bætast við umfram grunnlínuna; gamla skuldin er
 *   nafngreindur listi í tools/_grunnlina-syn.json (kjarni: _grunnlina-syn.cjs). Read-only — skrifar aldrei í gögn.
 * Endurstilla grunnlínu: uppfæra fastana hér og keyra  node tools/audit-kredit-an-endurgerdar.cjs --skra-grunnlinu
 */
// ── GRUNNLÍNA (mæld 07.11.2026) ─────────────────────────────────────────────────
const BASELINE_DAGS = '07.11.2026';
const BASELINE_TALA = 22;
const BASELINE_UPPHAED = 992163;   // kr (null = sýnan geymir enga fjárhæð)

const { keyra, kr } = require('./_grunnlina-syn.cjs');
keyra({
  syn: 'v_kredit_an_endurgerdar', merki: 'raðir',
  baselineTala: BASELINE_TALA, baselineUpphaed: BASELINE_UPPHAED, baselineDags: BASELINE_DAGS,
  lykill: r => r.num + '|' + r.kredit_num,
  upphaed: r => r.samtals,
  lysing: r => r.num + '  ' + r.customer_nafn + '  ' + kr(r.samtals) + '  kredit ' + r.kredit_num + ' ' + r.kredit_dags,
  gera: 'Endurgera söluna (réttan reikning) eða skrá úrskurð Agnars um að ekkert verði rukkað; athuga credit_of-tengingu.',
}).catch(e => { console.log('RED: audit sprakk: ' + e.message); process.exitCode = 1; });
