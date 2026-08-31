#!/usr/bin/env node
/* Öryggisnet — SALA Í SÍMA HELST HREIN (2026-08-31).
 *
 * Agnar: „Þessi er bara tilbúinn… Sala ready í mobile view. Geturðu savað það
 * einhvers staðar ef eitthvað rúttast til, svo það sé til uppskriftin af þessu."
 *
 * Þetta ER uppskriftin. Skjal hefði rotnað þegjandi; þetta verður RAUTT.
 *
 * ── ÁSTANDIÐ SEM ER VARIÐ (mælt á localhost í 390x844, ?devframe=simi#sala) ──
 * Á söluborðinu í síma flýtur EKKERT ofan á vöruflísunum. Aðeins réttmæt
 * umgjörð stendur eftir:
 *     .topbar · #_mnav_btn (☰) · #bstal-banner · #_app-zoom · #pos-checkout
 *
 * Fimm fljótandi takkar úr ÖÐRUM pöppum lögðust áður ofan á vörurnar — hver
 * þeirra fullkomlega réttmætur á sinni eigin síðu, enginn þeirra hluti af Sölu:
 *     #pe-pagelinks / -doc  262  „Keldan — fyrirtækjaleit"
 *     #pat-launch           308  🤖 AI-flokka póst
 *     #cg-sk-trigger        297  🎯 CG
 *     #_dst-btn._float      326  📐 Dálkastjóri (engin tafla á Sölu hvort eð er)
 *     #qr-fab               QR   📷 — TVÍTEKNING: Sala hefur sinn eigin
 *                                #pos-scan-top „📷 Skanna" í viðskiptavinaspjaldinu
 *
 * ── ÞRENNT SEM MÁ ALDREI GERAST ─────────────────────────────────────────────
 * 1. ✓ ÁFRAM (#pos-checkout) má ALDREI lenda í felulistanum. Það er eina leiðin
 *    út úr körfunni; sé hann falinn er Sala ónothæf en lítur rétt út.
 * 2. #pos-scan-top verður að vera áfram í js/pos.js. Um leið og hann hverfur er
 *    #qr-fab ekki lengur tvítekning heldur EINA leiðin til að skanna — og þá má
 *    ekki fela hann.
 * 3. Scope-ið verður að halda sér við `html:has(#view-sala.active)`. Víkkun
 *    fjarlægir takkana af ÖLLUM síðum þar sem þeir eiga heima.
 *
 * SOURCE-only, engin lifandi gögn. Sami háttur og audit-rf-column-shift.
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');

const p327 = 'js/patches/327-sala-simi-hreinsun.js';
const fails = [];

let src327 = '';
try { src327 = read(p327); }
catch (_) { fails.push(p327 + ' vantar — símahreinsun Sölu er farin'); }

const idx = read('index.html');
const pos = read('js/pos.js');

if (src327) {
  // 1 · pappinn verður að vera hlaðinn, annars gerir hann ekkert
  if (!/327-sala-simi-hreinsun\.js/.test(idx)) {
    fails.push('327 er til en EKKI hlaðinn í index.html');
  }

  // 2 · allir fimm fljótandi takkarnir enn faldir
  const MUST_HIDE = [
    ['#pe-pagelinks', 'Keldan — fyrirtækjaleit (262)'],
    ['#pat-launch', 'AI-flokka póst (308)'],
    ['#cg-sk-trigger', 'CG (297)'],
    ['#_dst-btn._float', 'Dálkastjóri (326)'],
    ['#qr-fab', 'fljótandi QR — tvítekning við #pos-scan-top'],
  ];
  for (const [sel, hvad] of MUST_HIDE) {
    if (!src327.includes("'" + sel + "'")) {
      fails.push('327 felur ekki lengur ' + sel + ' — ' + hvad);
    }
  }

  // 3 · ✓ ÁFRAM má ALDREI falla inn í listann
  if (/['"]#pos-checkout['"]/.test(src327)) {
    fails.push('327 felur #pos-checkout — ✓ ÁFRAM er eina leiðin út úr körfunni');
  }

  // 4 · scope-ið má ekki víkka út fyrir Sölu
  if (!/html:has\(#view-sala\.active\)/.test(src327)) {
    fails.push('327 hefur misst scope-ið html:has(#view-sala.active) — felur nú á ÖLLUM síðum');
  }

  // 5 · reglan verður að vera display:none !important (annars vinnur hún ekki
  //     á fljótandi lögunum, sem setja sín eigin !important)
  if (!/display:\s*none\s*!important/.test(src327)) {
    fails.push('327 vantar display:none !important — fljótandi lögin vinna annars');
  }
}

// 6 · forsendan fyrir því að fela #qr-fab: Sala hefur SINN EIGIN skanna
if (!/id="pos-scan-top"/.test(pos)) {
  fails.push('js/pos.js hefur misst #pos-scan-top — #qr-fab er þá EINA skönnunarleiðin '
    + 'og má ekki vera falinn. Taktu hann úr 327 eða skilaðu Skanna-hnappinum.');
}

if (fails.length) {
  console.log('RED  ' + fails.join('; '));
  process.exit(1);
}
console.log('GREEN: Sala í síma helst hrein — 5 fljótandi takkar faldir, ✓ ÁFRAM og '
  + '#pos-scan-top ósnertir, scope bundið við #view-sala.active');
process.exit(0);
