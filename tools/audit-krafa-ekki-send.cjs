#!/usr/bin/env node
'use strict';
/* KRAFA ALDREI SEND — sala sem á að rukkast en krafan fór aldrei út.
 * Búinn til: 07.11.2026. Mæling: sýnan `v_krafa_ekki_send` — úr leitinni 07.11.2026 þar sem um milljón lá úti og
 *   133 staðir biðu skoðunar. Leitin var handvirk; nú er hún vörður.
 * Ver gegn gildrunni: peningar liggja úti því sala er skráð sem krafa en enginn sendir hana; krafa_note segir „bíður sendingar“ mánuðum saman (elsta 158 dagar) og engin skjámynd kvartar.
 * Hönnun: BASELINE, EKKI ALGILD TALA. Rauður AÐEINS ef NÝ tilvik bætast við umfram grunnlínuna; gamla skuldin er
 *   nafngreindur listi í tools/_grunnlina-syn.json (kjarni: _grunnlina-syn.cjs). Read-only — skrifar aldrei í gögn.
 * Endurstilla grunnlínu: uppfæra fastana hér og keyra  node tools/audit-krafa-ekki-send.cjs --skra-grunnlinu
 */
// ── GRUNNLÍNA (mæld 07.11.2026) ─────────────────────────────────────────────────
const BASELINE_DAGS = '07.11.2026';
const BASELINE_TALA = 9;
const BASELINE_UPPHAED = 662759;   // kr (null = sýnan geymir enga fjárhæð)

const { keyra, kr } = require('./_grunnlina-syn.cjs');
keyra({
  // 07.11.2026, eftir samræmingu: v_krafa_ekki_send var breikkuð svo hún sýni NÁKVÆMLEGA sömu 23
  // raðir og Vinnusamantektin (patch 489) — tvær tölur um sama hlutinn var vandinn sjálfur.
  // Vörðurinn vaktar AÐGERÐAHÆFA hlutann: án kreditnótu, án gengið-inn. Það eru þessar 9.
  syn: 'v_krafa_ekki_send_adgerd', merki: 'raðir',
  baselineTala: BASELINE_TALA, baselineUpphaed: BASELINE_UPPHAED, baselineDags: BASELINE_DAGS,
  lykill: r => r.num,
  upphaed: r => r.samtals,
  lysing: r => r.num + '  ' + r.customer_nafn + '  ' + r.dags + '  ' + kr(r.samtals) + '  (' + r.dagar + ' dagar)',
  gera: 'Opna Kröfuyfirlit og senda kröfuna (eða skrá hvers vegna ekki) fyrir hvert númer. Ekki hækka baseline.',
}).catch(e => { console.log('RED: audit sprakk: ' + e.message); process.exitCode = 1; });
