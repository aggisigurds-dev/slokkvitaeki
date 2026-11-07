#!/usr/bin/env node
'use strict';
/* TÆKJATÖLUR STANGAST Á — skýrsla og tækjaskrá segja ekki sömu töluna.
 * Búinn til: 07.11.2026. Mæling: sýnan `v_taekjatolur_misraemi` — úr leitinni 07.11.2026 þar sem um milljón lá úti og
 *   133 staðir biðu skoðunar. Leitin var handvirk; nú er hún vörður.
 * Ver gegn gildrunni: T=S=I brotnar: skýrslan telur eitt, tækjaskráin annað og rukkað er eftir öðru hvoru; Ársskoðun ræður þegar tölur stangast á.
 * Hönnun: BASELINE, EKKI ALGILD TALA. Rauður AÐEINS ef NÝ tilvik bætast við umfram grunnlínuna; gamla skuldin er
 *   nafngreindur listi í tools/_grunnlina-syn.json (kjarni: _grunnlina-syn.cjs). Read-only — skrifar aldrei í gögn.
 * Endurstilla grunnlínu: uppfæra fastana hér og keyra  node tools/audit-taekjatolur-misraemi.cjs --skra-grunnlinu
 */
// ── GRUNNLÍNA (mæld 07.11.2026) ─────────────────────────────────────────────────
const BASELINE_DAGS = '07.11.2026';
const BASELINE_TALA = 45;
const BASELINE_UPPHAED = null;   // kr (null = sýnan geymir enga fjárhæð)

const { keyra, kr } = require('./_grunnlina-syn.cjs');
keyra({
  syn: 'v_taekjatolur_misraemi', merki: 'staðir',
  baselineTala: BASELINE_TALA, baselineUpphaed: BASELINE_UPPHAED, baselineDags: BASELINE_DAGS,
  lykill: r => r.fyrirtaeki_id + '|' + r.ar,
  upphaed: null,
  lysing: r => '#' + r.fyrirtaeki_id + '  ' + r.nafn + '  ' + r.ar + '  skýrsla ' + r.skyrsla_taeki + ' / tækjaskrá ' + r.taekjaskra_lifandi + ' (' + r.mismunur + ')',
  gera: 'Laga tækjaskrána (aldrei rukka mismun eftir á); sjá audit-t-s-i og skill rekstrarfelog-parun.',
}).catch(e => { console.log('RED: audit sprakk: ' + e.message); process.exitCode = 1; });
