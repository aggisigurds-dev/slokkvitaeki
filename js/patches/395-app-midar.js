/* === ÖPPIN Í MIÐAKERFINU (395) — 22.09.2026 ===
 *
 * Agnar (skjáskot úr S26, „The Big Boss" og Kröfu yfirlit): „Can you also update
 * the webapps". Króm appanna — hausinn, botnstikan, zoom-stikan og
 * Sími/Tafla/Skjár-röðin — var enn með ávölum plast-hnöppum og hálfgagnsæjum
 * flötum meðan allar síðurnar undir eru komnar í Miðakerfið (389–394).
 *
 * AÐEINS ÚTLIT. Engin stærð, staðsetning eða hegðun er snert:
 *   • 353 mælir króm-hlutfallið á símanum (48 px haus = 48 dp) og 333 sér um
 *     síðuzoomið. Báðar treysta á hæðirnar sem 261 setur — þær standa óbreyttar
 *     hér (50 px haus, 84 px flipi, 120 px lágmarkshæð) svo fyllingarnar sem
 *     þeir reikna haldist réttar. Aðeins litir, letur, radíus og rendur breytast.
 *   • Hnapparnir halda sínum atburðum; ekkert element er búið til eða fært.
 *
 * Stikkorð útlitsins: burstaður málmur með rák, ferkantað (2–3 px), merkimiðar í
 * JetBrains Mono með sperrtu bili, gull á því sem stendur yfir NÚNA (valinn flipi),
 * og nafn appsins í Playfair — sama regla og á borðunum.
 */
(() => {
  if (window.__appMidar395) return;
  window.__appMidar395 = true;

  const MONO = '"JetBrains Mono",ui-monospace,monospace';
  const SANS = '"IBM Plex Sans",system-ui,-apple-system,"Segoe UI",sans-serif';
  const DISPLAY = '"Playfair Display",Georgia,serif';
  const METAL = 'linear-gradient(145deg,#08080a 0%,#26262c 26%,#3a3a41 50%,#19191d 74%,#070709 100%)';
  const STRIPE = 'repeating-linear-gradient(108deg,rgba(255,255,255,.05) 0 1px,transparent 1px 5px),';
  const SILVER = 'linear-gradient(180deg,#fdfdfe 0%,#e3e7ee 100%)';

  function css() {
    const B = 'html body.appmode ';
    return [
      // ── Hausinn ──────────────────────────────────────────────────────────
      B + '#_app-hdr{background-image:' + STRIPE + METAL + '!important;border-bottom:1px solid #23262c!important;box-shadow:0 10px 22px -16px rgba(0,0,0,.8)!important}',
      // Gullröndin undir hausnum: sama merki og á borðunum — þunn lína, ekki skraut.
      B + '#_app-hdr::after{content:"";position:absolute;left:0;right:0;bottom:-1px;height:1px;background:linear-gradient(90deg,rgba(211,171,78,0),rgba(211,171,78,.85) 22%,rgba(211,171,78,.85) 78%,rgba(211,171,78,0));pointer-events:none}',
      B + '#_app-hdr .nm{font-family:' + DISPLAY + '!important;font-weight:800!important;letter-spacing:-.01em!important;color:#f0d79a!important;text-shadow:0 1px 2px rgba(0,0,0,.6)!important}',
      B + '#_app-hdr button{border-radius:3px!important;border:1px solid #3a3d44!important;background:rgba(255,255,255,.06)!important;color:#eef1f4!important;font-family:' + SANS + '!important;font-weight:600!important}',
      B + '#_app-hdr button:active{background:rgba(255,255,255,.14)!important}',

      // ── Botnstikan ───────────────────────────────────────────────────────
      B + '#_app-nav{background-image:' + STRIPE + METAL + '!important;border-top:1px solid #23262c!important}',
      // NB: HÁSTAFIR + sperrt bil klipptu heitin („Hreyfingar" varð „HREYFINGAI")
      // — flipinn er 84 px og einbreitt letur er breiðara. Heitin standa því eins og
      // 261 skrifar þau; aðeins letrið og litirnir breytast.
      B + '#_app-nav button{border-radius:2px!important;background:rgba(255,255,255,.035)!important;border:1px solid rgba(255,255,255,.07)!important;color:#aeb6c4!important;font-family:' + MONO + '!important;font-weight:700!important;letter-spacing:0!important;position:relative}',
      B + '#_app-nav button .e{filter:saturate(.92)}',
      // Flipinn sem er opinn: málmur + gullrönd efst (gull = „hér ertu núna").
      B + '#_app-nav button.on{background-image:' + STRIPE + 'linear-gradient(180deg,#3d4048 0%,#1c1e23 100%)!important;border-color:#000!important;color:#fff!important}',
      B + '#_app-nav button.on::before{content:"";position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,#8a6410,#d3ab4e 45%,#ffe9b0 55%,#8a6410);pointer-events:none}',

      // ── Zoom-stikan (333) ────────────────────────────────────────────────
      'html body #_app-zoom{border-radius:3px!important;background:' + SILVER + '!important;border:1px solid rgba(20,24,34,.22)!important;box-shadow:0 10px 24px -12px rgba(10,14,22,.6)!important}',
      'html body #_app-zoom>button{border-radius:2px!important;border:1px solid rgba(20,24,34,.16)!important;background:#fff!important;color:#3a4250!important;font-family:' + SANS + '!important}',
      'html body #_app-zoom>button#_app-zoom-reset{font-family:' + MONO + '!important;font-weight:700!important}',
      'html body #_app-zoom #_app-zoom-pct{font-family:' + MONO + '!important;font-weight:700!important;color:#1f2530!important}',

      // ── Sími · Tafla · Skjár (og „Passa töflu") ─────────────────────────
      // Ein silfurstika með málmi á því sem er valið — sama form og síustikan
      // á Ársskoðun, svo hamurinn lítur eins út hvar sem hann birtist.
      'html body ._ars-sjon,html body ._ars-sjon-zoom{border-radius:3px!important;overflow:hidden!important;border:1px solid rgba(20,24,34,.22)!important;background:' + SILVER + '!important}',
      'html body ._ars-sjon button,html body ._ars-sjon-zoom button{border-radius:0!important;border:0!important;border-left:1px solid rgba(20,24,34,.14)!important;background:transparent!important;color:#3a4250!important;font-family:' + SANS + '!important;font-weight:600!important}',
      'html body ._ars-sjon button:first-child,html body ._ars-sjon-zoom button:first-child{border-left:0!important}',
      'html body ._ars-sjon button[aria-pressed="true"],html body ._ars-sjon button.on{background-image:' + STRIPE + METAL + '!important;color:#fff!important;text-shadow:0 1px 1px rgba(0,0,0,.5)!important}',
      'html body #_ars-z-pct{font-family:' + MONO + '!important;font-weight:700!important;color:#1f2530!important}',
    ].join('\n');
  }

  function inject() {
    let st = document.getElementById('_appmidar-css');
    if (!st) {
      st = document.createElement('style');
      st.id = '_appmidar-css';
      (document.head || document.documentElement).appendChild(st);
    }
    st.textContent = css();
    // Hausinn þarf position:relative fyrir gullröndina; 261 setur position:fixed
    // sem dugar sem viðmið, svo ekkert er breytt þar.
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', inject);
  else inject();
  // Króm appanna er teiknað eftir ræsingu (261) — blaðið er þegar á sínum stað
  // og hittir það um leið og það birtist. Ekkert element er snert hér.

  console.log('[395] Öppin í Miðakerfinu');
})();
/* === END ÖPPIN Í MIÐAKERFINU === */
