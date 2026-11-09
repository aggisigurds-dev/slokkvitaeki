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
// ── GRUNNLÍNA (mæld 08.11.2026) ─────────────────────────────────────────────────
/* 22 → 27 og 992.163 → 1.087.220 kr. Talan HÆKKAÐI af því að sýnin var LEIÐRÉTT, ekki af því
 * að ný kredit hafi orðið til. Hún útilokaði `status = 'draft'` en það gildi er EKKI til í
 * `solur` (final 1022 · drog 69 · void 56). DRAG taldist því gild endurgerð og FALDI fimm
 * raðir þar sem reikningurinn var aldrei endurgerður í raun.
 *
 * LESTU `endurgerd_greidd` ÁÐUR EN ÞÚ SEGIR AÐ FÉ SÉ ÚTI: 8 af 27 bera endurgerð sem var
 * greidd. Hinar 19 (625.370 kr) eru heldur ekki allar útistandandi — Þangbakki (190.987) má
 * EKKI rukka (verkið var aldrei unnið) og Strandasel (39.638) er afgreitt: Agnar 20.09.2026
 * „leyfa þessu að vera … Ekki spyrja aftur." Talan hér er mælikvarði, ekki krafa. */
/* 27 → 28 og 1.087.220 → 1.098.080 kr (09.11.2026): R-001273 Bílaþvottur Íslands (pos-sala 10.860 kr, 13:44) var felld niður með
 * kredit R-001274 (13:46) — Agnar 09.11.2026: „felldur niður, varð ekki sala". ÚRSKURÐUR: ekkert verður rukkað og ekkert er útistandandi;
 * röðin er skráð í grunnlínuna (tools/_grunnlina-syn.json) og er því ekki ný næst. */
const BASELINE_DAGS = '09.11.2026';
const BASELINE_TALA = 28;
const BASELINE_UPPHAED = 1098080;   // kr (null = sýnan geymir enga fjárhæð)

const { keyra, kr } = require('./_grunnlina-syn.cjs');
keyra({
  syn: 'v_kredit_an_endurgerdar', merki: 'raðir',
  baselineTala: BASELINE_TALA, baselineUpphaed: BASELINE_UPPHAED, baselineDags: BASELINE_DAGS,
  lykill: r => r.num + '|' + r.kredit_num,
  upphaed: r => r.samtals,
  lysing: r => r.num + '  ' + r.customer_nafn + '  ' + kr(r.samtals) + '  kredit ' + r.kredit_num + ' ' + r.kredit_dags,
  gera: 'Endurgera söluna (réttan reikning) eða skrá úrskurð Agnars um að ekkert verði rukkað; athuga credit_of-tengingu.',
}).catch(e => { console.log('RED: audit sprakk: ' + e.message); process.exitCode = 1; });
