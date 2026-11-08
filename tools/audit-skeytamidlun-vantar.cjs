#!/usr/bin/env node
'use strict';
/* SKEYTAMIÐLUN VANTAR — félag á ógreidda reikninga en skeytamiðlun er tóm.
 * Búinn til: 07.11.2026. Mæling: sýnan `v_skeytamidlun_vantar` — úr leitinni 07.11.2026 þar sem um milljón lá úti og
 *   133 staðir biðu skoðunar. Leitin var handvirk; nú er hún vörður.
 * Ver gegn gildrunni: reikningur fer til félags sem getur ekki tekið við honum í skeytamiðlun, svo hann situr ógreiddur og enginn veit hvers vegna.
 * Hönnun: BASELINE, EKKI ALGILD TALA. Rauður AÐEINS ef NÝ tilvik bætast við umfram grunnlínuna; gamla skuldin er
 *   nafngreindur listi í tools/_grunnlina-syn.json (kjarni: _grunnlina-syn.cjs). Read-only — skrifar aldrei í gögn.
 * Endurstilla grunnlínu: uppfæra fastana hér og keyra  node tools/audit-skeytamidlun-vantar.cjs --skra-grunnlinu
 */
// ── GRUNNLÍNA (mæld 08.11.2026) ─────────────────────────────────────────────────
/* 49 → 46. Sýnin var LEIÐRÉTT 08.11.2026, ekki hreinsuð: hún útilokaði `status = 'draft'`
 * en það gildi er EKKI til í `solur`. Raunverulegu gildin eru final (1022), drog (69) og
 * void (56), svo 68 ógreidd DRÖG upp á 686.331 kr töldust sem raunverulegar kröfur.
 * Fjögur félög duttu út þegar 'drog' var bætt í útilokunina — þau áttu aldrei kröfu.
 * Fannst þegar Hjallabraut 35 var sett aftur í þjónustu og birtist strax hér með
 * „1 ógreiddan": R-000230, sem er drög OG merkt VOID í krafa_note OG á kreditnótu. */
const BASELINE_DAGS = '08.11.2026';
const BASELINE_TALA = 46;
const BASELINE_UPPHAED = null;   // kr (null = sýnan geymir enga fjárhæð)

const { keyra, kr } = require('./_grunnlina-syn.cjs');
keyra({
  syn: 'v_skeytamidlun_vantar', merki: 'félög',
  baselineTala: BASELINE_TALA, baselineUpphaed: BASELINE_UPPHAED, baselineDags: BASELINE_DAGS,
  lykill: r => String(r.fyrirtaeki_id),
  upphaed: null,
  lysing: r => '#' + r.fyrirtaeki_id + '  ' + r.nafn + '  ' + r.ogreiddir + ' ógreiddir  miðlun: ' + r.payday_delivery,
  gera: 'Skrá skeytamiðlun félagsins í Payday (eða senda reikninginn í tölvupósti) og setja á kröfulistann.',
}).catch(e => { console.log('RED: audit sprakk: ' + e.message); process.exitCode = 1; });
