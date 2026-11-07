#!/usr/bin/env node
'use strict';
/* SKOÐUN GLEYMD — lifandi tæki á stað þar sem skoðun hefur ekki verið gerð.
 * Búinn til: 07.11.2026. Mæling: sýnan `v_skodun_gleymd` — úr leitinni 07.11.2026 þar sem um milljón lá úti og
 *   133 staðir biðu skoðunar. Leitin var handvirk; nú er hún vörður.
 * Ver gegn gildrunni: staður með lifandi tæki dettur út úr ársskoðun án þess að nokkur taki eftir því; ekkert borð bendir á staði sem vantar.
 * Hönnun: BASELINE, EKKI ALGILD TALA. Rauður AÐEINS ef NÝ tilvik bætast við umfram grunnlínuna; gamla skuldin er
 *   nafngreindur listi í tools/_grunnlina-syn.json (kjarni: _grunnlina-syn.cjs). Read-only — skrifar aldrei í gögn.
 * Endurstilla grunnlínu: uppfæra fastana hér og keyra  node tools/audit-skodun-gleymd.cjs --skra-grunnlinu
 */
// ── GRUNNLÍNA (mæld 07.11.2026) ─────────────────────────────────────────────────
const BASELINE_DAGS = '07.11.2026';
const BASELINE_TALA = 133;
const BASELINE_UPPHAED = null;   // kr (null = sýnan geymir enga fjárhæð)

const { keyra, kr } = require('./_grunnlina-syn.cjs');
keyra({
  syn: 'v_skodun_gleymd', merki: 'staðir',
  baselineTala: BASELINE_TALA, baselineUpphaed: BASELINE_UPPHAED, baselineDags: BASELINE_DAGS,
  lykill: r => String(r.fyrirtaeki_id),
  upphaed: null,
  lysing: r => '#' + r.fyrirtaeki_id + '  ' + r.nafn + '  ' + r.taeki + ' tæki  síðast ' + r.sidasta_skodun,
  gera: 'Bóka skoðun á staðinn, eða taka tækin úr þjónustu ef staðurinn er hættur. Aldrei færa skoðunarmánuð.',
}).catch(e => { console.log('RED: audit sprakk: ' + e.message); process.exitCode = 1; });
