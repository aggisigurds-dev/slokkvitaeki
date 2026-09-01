/* === BOSS-APP: TVÖFALT STÆRRI BOTNSTIKA (349) ==============================
 *
 * Agnar 2026-09-01: „can double the size of botton banner".
 *
 * Botnstikan er `#_app-nav` — eina fasta chrome-ið neðst (`position:fixed;
 * bottom:0`, pappi 261:727). `#bstal-banner` er TOPP-borðinn (230:285,
 * `top:10px`), ekki þessi. Í app-ham var stikan kramin niður í 52px hnappa
 * með 11px texta og 18px emoji (315:22-24) — þetta tvöfaldar hana AÐEINS í
 * Boss-appinu; Fjármál og hin sniðin standa óbreytt.
 *
 * ⚠️ KRÖFTUG PÖRUN SEM MÁ EKKI GLEYMA:
 * 315/330/338 setja `padding-bottom: calc(88px + safe-area)` á `.view.active`
 * EINMITT svo stikan hylji ekki síðustu raðirnar. Tvöföld stika sem gleymir
 * þeirri fyllingu felur efni í staðinn fyrir að stækka það — þess vegna fylgir
 * botnfyllingin hér með, í öllum þremur afbrigðunum sem 315 skrifar (venjulegt,
 * brunastál-keðjan með :not()-hlekkjunum, og [data-app]-afbrigðið).
 *
 * Hæðin tvöfaldast (52 → 104). Textinn gerir það EKKI — 11 → 22px væri
 * fáránlegt á 84px breiðum hnappi; 15px les vel og heldur tveggja-línu
 * merkimiðum heilum. Emoji fylgir hæðinni (18 → 30).
 * ========================================================================== */
(() => {
  if (window.__bossNavStor349) return;
  window.__bossNavStor349 = true;

  const STYLE_ID = 'boss-nav-stor-349';
  // Falsk-id keðjan er HÚSSTÍLLINN hér (sjá skill slokkvitaeki-layout §1), ekki
  // hakk — og hún er nauðsyn, ekki skraut. MÆLT: fyrsta útgáfa þessa pappa
  // notaði `body.appmode[data-app="boss"] .view.active` (0 id-vægi) og botn-
  // fyllingin mældist ÁFRAM 88px. Ástæðan er 330, sem skrifar
  // `body.appmode .view.active:not(#_p330a):not(#_p330b)` — TVÖ id-vægi úr
  // :not() — og vinnur því hvað sem !important eða röð líður. Þrír hlekkir hér
  // fara yfir þá tvo. Röðin í <head> dugar EKKI ein: mælt sátu sex stílblöð
  // fyrir aftan þetta (m.a. 313 contrast-clarity) þótt það endur-tengi sig
  // aftast, því þau gera nákvæmlega það sama.
  const P = ':not(#_p349a):not(#_p349b):not(#_p349c)';
  const B = 'body.appmode[data-app="boss"] ';
  // Sama :not()-keðja og 230/315 nota — án hennar vinnur brunastál-reglan.
  const NOT = ':not(#view-field):not(#view-counter):not(#view-workshop)';
  const BSTAL = 'html[data-bstal-banner="on"][data-thm-preset="brunastal"] ';

  // 88px (ein stika) → 140px (tvöföld: 104px hnappur + 2×8px padding + borði).
  const PAD = '{padding-bottom:calc(140px + env(safe-area-inset-bottom,0px))!important}';

  const css = [
    // ── Stikan sjálf ──────────────────────────────────────────────────────
    B + '#_app-nav' + P + '{padding:8px 10px calc(8px + env(safe-area-inset-bottom,0px))!important;gap:8px!important}',
    B + '#_app-nav button' + P + '{min-height:104px!important;padding:8px 6px!important;'
      + 'font-size:15px!important;gap:5px!important;border-radius:16px!important;'
      + 'flex:1 0 96px!important;min-width:96px!important}',
    B + '#_app-nav button .e' + P + '{font-size:30px!important;line-height:1!important}',

    // ── Botnfyllingin VERÐUR að fylgja, annars felur stikan síðustu raðirnar ──
    B + '.view.active' + P + PAD,
    B + '.view.active' + NOT + P + PAD,
    BSTAL + B + '.view.active' + NOT + P + PAD,
    // 330 skrifar líka sína eigin útgáfu á Ársskoðun — mætt hér með sama vopni.
    B + '#view-arsskodun.active' + P + PAD,
    B + '[style*="max-width:1720"]' + P + PAD,
  ].join('\n');

  function mount() {
    let s = document.getElementById(STYLE_ID);
    if (!s) {
      s = document.createElement('style');
      s.id = STYLE_ID;
      (document.head || document.documentElement).appendChild(s);
    }
    s.textContent = css;
    // Verður að vera SÍÐAST í head — 315/316/330/338 skrifa öll á sömu velli
    // og sá sem situr aftast vinnur við jafna sértækni.
    if (s.parentNode && s.parentNode.lastElementChild !== s) s.parentNode.appendChild(s);
  }

  mount();
  document.addEventListener('slokk-viewmode', mount);
  document.addEventListener('DOMContentLoaded', mount);
  [400, 1200, 2500].forEach(ms => setTimeout(mount, ms));

  window.BossNavStor = { mount, version: '349' };
  console.log('[patch-349] boss app: tvöföld botnstika');
})();
/* === END BOSS TVÖFALT STÆRRI BOTNSTIKA === */
