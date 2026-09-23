/* === KRÖFU YFIRLIT Í MIÐAKERFINU — SÍMI OG APP (399) — 23.09.2026 ===
 *
 * Agnar (skjáskot úr Fjármál-appinu 02:15): „App fjarmal krofuyfirlit still
 * look like this" — Skjár-sýnin fékk Miðakerfið í 166 (22.09) en hún er læst
 * við `getViewMode()==='desktop'`, og appið keyrir alltaf í `mobile`. Símaútlitið
 * sat því eftir með ávölum hvítum kortum og pastel-tökkum.
 *
 * HÉR ER AÐEINS SKINN. Símamarkupið (renderCompany) er ÓBREYTT — sömu raðir,
 * sömu takkar, sömu snertifletir (>=44 px) — en það ber nú sama efnið og hinar
 * síðurnar: burstaðan málm í hausum, ferkantaða fleti (2–3 px), upphæðir í
 * Playfair og merkimiða í JetBrains Mono.
 *
 * Af hverju skinn en ekki sama markup og á Skjá: Skjár-útgáfan er byggð fyrir
 * 1600 px borð (breiðar raðir, mörg gildi á línu). Að skipta símanum yfir á hana
 * hefði þýtt nýja síðu í símanum um miðja nótt með óprófuðum snertiflötum —
 * skinnið gefur sama svip án þeirrar áhættu. Sé það sem hann vill næst, er það
 * eitt skilyrði í 166 (MID) og sér CSS fyrir þröngan skjá.
 */
(() => {
  if (window.__kySimiMidar399) return;
  window.__kySimiMidar399 = true;

  const MONO = '"JetBrains Mono",ui-monospace,monospace';
  const SANS = '"IBM Plex Sans",system-ui,-apple-system,"Segoe UI",sans-serif';
  const DISPLAY = '"Playfair Display",Georgia,serif';
  const METAL = 'linear-gradient(145deg,#08080a 0%,#26262c 26%,#3a3a41 50%,#19191d 74%,#070709 100%)';
  const STRIPE = 'repeating-linear-gradient(108deg,rgba(255,255,255,.05) 0 1px,transparent 1px 5px),';
  const SILVER = 'linear-gradient(180deg,#fdfdfe 0%,#e3e7ee 100%)';
  const GREEN = 'linear-gradient(145deg,#010d05 0%,#06331a 20%,#0e5a2e 43%,#16783f 53%,#073a1d 74%,#010f06 100%)';

  function css() {
    const V = 'html body #view-krofu-yfirlit ';
    // Sérvitur selector VILJANDI: 335 (krofu-brunaholf-layout) skrifar
    // `html[data-viewmode="mobile"] #view-krofu-yfirlit .ky-abtn:not(#_kyc0):not(#_kyc1)…`
    // — gervi-auðkenni til að hlaða sérvirkni (sama húsbragð og css/mobile.css).
    // Mælt: radíus stóð í 9 px þrátt fyrir tvöfaldað auðkenni og !important, svo
    // hér er sama aðferð notuð með fimm gervi-auðkennum ofan á tvö raun-auðkenni.
    const P = ':not(#_kyx1):not(#_kyx2):not(#_kyx3):not(#_kyx4):not(#_kyx5)';
    const W = 'html[data-viewmode] body #view-krofu-yfirlit#view-krofu-yfirlit' + P + ' ';
    return [
      // ── Fyrirtækjaspjaldið ───────────────────────────────────────────────
      W + 'div:has(>.ky-card-rows){border-radius:2px!important;border:1px solid rgba(20,24,34,.16)!important}',
      W + 'div:has(>.ky-card-rows){overflow:hidden!important;box-shadow:0 1px 1px rgba(15,20,30,.06),0 10px 22px -18px rgba(15,20,30,.45)!important}',
      // Hausinn með nafni og upphæð: burstaður málmur.
      W + 'div:has(>.ky-card-rows)>div:first-child{background-image:' + STRIPE + METAL + '!important;border-bottom:1px solid #23262c!important;color:#eef1f4!important}',
      W + 'div:has(>.ky-card-rows)>div:first-child *{color:#eef1f4!important}',
      W + 'div:has(>.ky-card-rows)>div:first-child a{color:#ffd27a!important}',
      W + 'div:has(>.ky-card-rows)>div:first-child small{color:#aeb6c4!important}',

      // ── Lykiltölu-reitirnir efst ────────────────────────────────────────
      // Agnar 23.09: „þessir ljósu gulu bláu eru hræðilegir. Reyndu að setja
      // desktop stílinn á það." Hér koma sömu málmspjöld og á Skjá: dökkur
      // burstaður flötur, merkimiði í einbreiðu letri, talan í Playfair — og
      // litur AÐEINS sem 3 px rönd efst, sama regla og á Ársskoðun.
      W + '.stat-card{border-radius:2px!important;border:1px solid #23262c!important;background-image:' + STRIPE + METAL + '!important;background-color:#0a0a0c!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.07),0 12px 26px -18px rgba(0,0,0,.75)!important;position:relative!important;overflow:hidden!important}',
      W + '.stat-card::after{content:"";position:absolute;top:0;left:0;right:0;height:3px;background:#8f98a8;pointer-events:none}',
      W + '.stat-card--amber::after{background:#d3ab4e}',
      W + '.stat-card--hero::after{background:#2f7fc9}',
      W + '.stat-card--blue::after,' + W + '.stat-card--info::after{background:#2f7fc9}',
      W + '.stat-card--green::after,' + W + '.stat-card--ok::after{background:#16783f}',
      W + '.stat-card__label{font-family:' + MONO + '!important;font-size:9.5px!important;font-weight:700!important;letter-spacing:.12em!important;text-transform:uppercase!important;color:#aeb6c4!important}',
      W + '.stat-card__value{font-family:' + DISPLAY + '!important;font-weight:800!important;letter-spacing:-.02em!important;color:#fff!important}',
      W + '.stat-card__icon{background:rgba(255,255,255,.06)!important;border-radius:2px!important;border:1px solid rgba(255,255,255,.10)!important}',
      W + '.stat-card p,' + W + '.stat-card small,' + W + '.stat-card div:not(.stat-card__value):not(.stat-card__icon){color:#c9d0db!important}',
      W + '.stat-card b{color:#fff!important}',

      // Stóru tveir („ÓGREIDDAR Í PAYDAY" og „ÓSENDAR KRÖFUR") eru `button._ky-exp`
      // — það voru þessir ljósgulu/ljósbláu fletir. Þeir fá sama málm og hin
      // spjöldin; liturinn lifir áfram sem rönd efst og í tölunni sjálfri.
      W + '._ky-exp{border-radius:2px!important;border:1px solid #23262c!important;background-image:' + STRIPE + METAL + '!important;background-color:#0a0a0c!important;color:#d5dbe6!important;position:relative!important;overflow:hidden!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.07),0 12px 26px -18px rgba(0,0,0,.75)!important;text-align:left!important}',
      W + '._ky-exp::after{content:"";position:absolute;top:0;left:0;right:0;height:3px;background:#d3ab4e;pointer-events:none}',
      W + '._ky-exp[data-exp="osendar"]::after,' + W + '._ky-exp[data-card="osendar"]::after{background:#2f7fc9}',
      W + '._ky-exp *{color:#c9d0db!important}',
      W + '._ky-exp b,' + W + '._ky-exp strong{color:#fff!important}',
      // Talan sjálf: Playfair, í lit reitsins (gull = bíður greiðslu, blátt = ósent).
      W + '._ky-exp .ky-num{font-family:' + DISPLAY + '!important;font-weight:800!important;font-size:26px!important;letter-spacing:-.02em!important;color:#ffd27a!important}',
      W + '._ky-exp[data-exp="osendar"] .ky-num,' + W + '._ky-exp[data-card="osendar"] .ky-num{color:#9ec5f0!important}',

      // ── Upphæðir og merkimiðar ──────────────────────────────────────────
      V + '.ky-num{font-family:' + MONO + '!important;font-variant-numeric:tabular-nums lining-nums!important}',
      // Krafan sjálf (stóra talan á spjaldinu) í Playfair.
      W + 'div:has(>.ky-card-rows)>div:first-child .ky-num{font-family:' + DISPLAY + '!important;font-weight:800!important;letter-spacing:-.02em!important}',

      // ── Raðirnar ────────────────────────────────────────────────────────
      W + '.ky-row{border-bottom:1px solid rgba(20,24,34,.08)!important}',
      W + '.ky-row:hover{background:#f7f8fb!important}',

      // ── Aðgerðatakkarnir (Senda · Reikning · Skýrsla · Krafa send · Greitt) ──
      // Ferkantaðir, silfraðir; sá sem er VIRKUR (.on) fær grænan málm — sama
      // regla og annars staðar: grænt = búið, ekki skraut.
      W + '.ky-abtn{border-radius:2px!important;border:1px solid rgba(20,24,34,.16)!important;background:' + SILVER + '!important;color:#3a4250!important;box-shadow:none!important;min-height:44px!important}',
      W + '.ky-abtn .ky-abtn-lbl{font-family:' + MONO + '!important;font-size:9.5px!important;font-weight:700!important;letter-spacing:.04em!important}',
      W + '.ky-abtn.on{background-image:' + STRIPE + GREEN + '!important;border-color:rgba(52,168,98,.45)!important;color:#fff!important;text-shadow:0 1px 1px rgba(0,0,0,.5)!important}',
      W + '.ky-abtn.on .ky-abtn-lbl{color:#fff!important}',

      // ── Leitin og síuhnapparnir efst ────────────────────────────────────
      W + '#ky-search,' + W + 'input[type="search"]{border-radius:3px!important;border:1px solid rgba(20,24,34,.18)!important;background:#eef1f6!important;box-shadow:inset 0 2px 5px rgba(0,0,0,.12)!important}',
      W + '.ky-tab,' + W + '.ky-filter{border-radius:2px!important;border:1px solid rgba(20,24,34,.18)!important;background:' + SILVER + '!important;color:#3a4250!important;font-family:' + SANS + '!important;font-weight:600!important}',
      W + '.ky-tab.on,' + W + '.ky-filter.on{background-image:' + STRIPE + METAL + '!important;border-color:#000!important;color:#fff!important;text-shadow:0 1px 1px rgba(0,0,0,.5)!important}',

      // ── Minnispunkta-reiturinn í röðinni ────────────────────────────────
      W + '._ky-note{border-radius:2px!important;border:1px solid rgba(20,24,34,.14)!important;border-left:3px solid #d3ab4e!important;background:#fff!important;font-family:' + SANS + '!important}',
    ].join('\n');
  }

  function inject() {
    let st = document.getElementById('_kysimi-css');
    if (!st) {
      st = document.createElement('style');
      st.id = '_kysimi-css';
      (document.head || document.documentElement).appendChild(st);
    }
    // Aðeins þröngt/app — Skjár-sýnin hefur sitt eigið Miðakerfi úr 166.
    st.textContent = '@media (max-width: 1100px){\n' + css() + '\n}';
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', inject);
  else inject();

  console.log('[399] Kröfu yfirlit — Miðakerfi á síma');
})();
/* === END KRÖFU YFIRLIT Á SÍMA === */
