/* === ÁRSSKOÐUN SÍMI/APP: FULL BREIDD + BOTNPLÁSS (330) =====================
 *
 * Agnar 2026-08-29 (Fjármál app, Stjórnun-mrows): listinn var miðjuð hvít
 * súla með gráum hliðargötum. Nöfn brotnuðu mid-orð („Starfsgreinafélag /
 * g") af því dálkurinn var of mjór. Botnvalmyndin huldi síðustu raðir.
 *
 * Þessi pappi er CSS-aðeins á sími/appham. Hann vinnur á:
 *   • 153 innfellda `max-width:1720px;padding:10px 18px`
 *   • 314 `padding:8px 8px 48px` á sama umgjörð
 *   • 315/261 `.main-panel` / appmode chrome
 * Skjáborðs-taflan (renderTable) og 153/187-reikningur eru ÓSNERT.
 *
 * Bílstjóraspjöld: 🏢 / nafn → Arsskodun.openDetail er í 317, ekki hér.
 * ========================================================================== */
(() => {
  if (window.__arsSimiFullwidth330) return;
  window.__arsSimiFullwidth330 = true;

  const STYLE_ID = 'ars-simi-fullwidth-330';
  const P = ':not(#_p330a):not(#_p330b)';
  const V = '#view-arsskodun#view-arsskodun';

  function css() {
    const M = 'html[data-viewmode="mobile"] ';
    const A = 'body.appmode ';
    const out = [];
    /* suffix er án viewmode-forskeytis, t.d. " #ars-main". both() setur
       Sími- og Öpp-forskeyti á SAMA suffix — enginn tvöfaldur prefix. */
    function both(suffix, decl) {
      out.push(M + V + suffix + decl);
      out.push(A + V + suffix + decl);
    }

    /* css/mobile.css @media(max-width:900): `.view{padding:56px 12px 24px 12px
       !important}` — þetta er 12px hliðargatið á RAUNVERULEGUM 390px (sími og
       símarammi). padding-top/bottom eru þegar yfirskrifuð; vinstri/hægri
       sátu eftir. */
    const side0 = '{padding-left:0!important;padding-right:0!important}';
    both(P, side0);
    both('.view.active' + P, side0);

    /* ── 1. Drepa hliðargötin ───────────────────────────────────────────────
       Inline 1720-ramminn + 314 8px + .main-panel 10/14/32px lögðust ofan á
       hvort annað. Hér er vinstri/hægri = 0. Lítið öryggisbil (8px) aðeins
       á síu-strimlum, ekki á sjálfri töflunni. */
    const bleed = '{'
      + 'padding-left:0!important;padding-right:0!important;'
      + 'max-width:none!important;margin-left:0!important;margin-right:0!important;'
      + 'width:100%!important;box-sizing:border-box!important}';
    both(' #ars-main' + P, bleed);
    both(' #ars-main.main-panel' + P, bleed);

    both(' [style*="max-width:1720"]' + P, '{'
      + 'max-width:none!important;width:100%!important;margin:0!important;'
      + 'padding-left:0!important;padding-right:0!important;'
      + 'padding-top:6px!important;'
      + 'padding-bottom:calc(88px + env(safe-area-inset-bottom,0px))!important;'
      + 'box-sizing:border-box!important}');

    both(' ._arsm-tbl' + P, '{'
      + 'width:100%!important;max-width:100%!important;margin:0!important;'
      + 'border-radius:0!important;border-left:none!important;border-right:none!important;'
      + 'box-shadow:none!important}');

    const inset = '{padding-left:8px!important;padding-right:8px!important;box-sizing:border-box}';
    both(' ._ars-filterstrip' + P, inset);
    both(' ._ars-morow' + P, inset);
    both(' #_ars-pnr-row' + P, inset);
    both(' ._ars-summary' + P, inset);
    both(' #ars-main > div > div:first-child' + P, inset);

    /* ── 2. Nöfn: brot við orð, ekki staf ─────────────────────────────────── */
    both(' ._arsm-nm' + P, '{'
      + 'overflow-wrap:break-word!important;word-break:normal!important;'
      + 'hyphens:manual}');

    /* ── 3. Botnvalmynd má ekki hylja síðustu raðir ──────────────────────── */
    const navPad = '{padding-bottom:calc(88px + env(safe-area-inset-bottom,0px))!important}';
    out.push(A + '.view.active' + P + navPad);
    out.push(
      'html[data-bstal-banner="on"][data-thm-preset="brunastal"] body.appmode '
      + '#view-arsskodun.active:not(#view-field):not(#view-counter):not(#view-workshop)'
      + navPad
    );
    out.push(A + '[data-app="fjarmal"] #view-arsskodun.active' + P + navPad);
    out.push(A + '[data-app="boss"] #view-arsskodun.active' + P + navPad);

    /* ── 4. Bílstjóraspjöld: full breidd ─────────────────────────────────── */
    both(' ._bil-wrap' + P, '{'
      + 'padding-left:0!important;padding-right:0!important;'
      + 'padding-bottom:calc(88px + env(safe-area-inset-bottom,0px))!important}');
    both(' ._bil-list' + P, '{padding-left:4px!important;padding-right:4px!important}');
    both(' ._bil-mon' + P, '{padding-left:8px!important;padding-right:8px!important}');
    both(' ._bil-hdr' + P, '{padding-left:8px!important;padding-right:8px!important}');

    return out.join('\n');
  }

  function mount() {
    let s = document.getElementById(STYLE_ID);
    if (!s) {
      s = document.createElement('style');
      s.id = STYLE_ID;
      (document.head || document.documentElement).appendChild(s);
    }
    s.textContent = css();
    if (s.parentNode && s.parentNode.lastElementChild !== s) s.parentNode.appendChild(s);
  }

  mount();
  document.addEventListener('slokk-viewmode', mount);
  document.addEventListener('DOMContentLoaded', mount);
  [400, 1200].forEach(ms => setTimeout(mount, ms));

  window.ArsSimiFullwidth = { mount, version: '330' };
  console.log('[patch-330] arsskodun simi/app full width');
})();
/* === END ÁRSSKOÐUN SÍMI/APP FULL BREIDD === */
