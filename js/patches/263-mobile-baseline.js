/* MOBILE BASELINE — global phone-usability baseline for the view-mode toggle.
 *
 * The app-wide view-mode toggle (📱 Sími / ▦ Tafla / 🖥 Skjár, in the banner,
 * patch 166) sets `html[data-viewmode]` = mobile | table | desktop. This patch
 * injects ONE stylesheet whose rules are ALL gated behind
 * `html[data-viewmode="mobile"]`, so:
 *   • in table/desktop mode NOTHING here applies — every page renders exactly
 *     as before (the 🖥 Skjár button is the escape hatch), and
 *   • in mobile mode every GENERAL content page gets a gentle, recoverable
 *     reflow: no horizontal page overflow, wide tables scroll instead of
 *     bleeding, common column rows wrap, and taps/text stay finger-friendly.
 *
 * Deliberately conservative — under-reach rather than risk breaking a layout.
 * Scope is the app CONTENT (`.view`) only; the sidebar/nav, banner, modals,
 * maps and canvas are left untouched. The FOUR pages that already ship their
 * own per-mode layouts are EXCLUDED so this baseline never fights them:
 *   #view-krofu-yfirlit (166) · #view-arsskodun (153) ·
 *   #view-sala (POS, pos.js) · #view-hreyfingarlisti (167).
 */
(() => {
  if (window.__mobileBaselineInstalled) return;
  window.__mobileBaselineInstalled = true;

  const STYLE_ID = 'mobile-baseline-css';
  if (document.getElementById(STYLE_ID)) return;

  // Content scope, minus the 4 bespoke per-mode pages.
  // NB `[id="…"]` en EKKI `#…` inni í :not(): sértækni :not() = sértækni
  // innihaldsins, svo fjögur `:not(#id)` gæfu þessum „gentle" reglum
  // ID-sértækni ×4 — þá töpuðu ALLAR síðu-reglur (t.d. 190
  // `#view-thjonustu-verkstaedi ._sv-step{min-height:44px}`) fyrir 40px
  // grunninum hér að neðan. Eigindaval passar sömu stök en telur sem klasi,
  // svo „no !important, so page rules win" heldur í alvöru.
  const V = 'html[data-viewmode="mobile"] .view' +
    ':not([id="view-krofu-yfirlit"]):not([id="view-arsskodun"])' +
    ':not([id="view-sala"]):not([id="view-hreyfingarlisti"])';

  const css = [
    // ── 0. Full-width when the sidebar is a hidden drawer ───────────────────
    // app.css: `.view { width: calc(100vw - var(--sidebar-w)) !important }`.
    // After the hamburger hides the rail, that still reserved 220px — white
    // gutter on the right (Agnar 2026-08-25: "Not the right wide"). ALL views,
    // including the four that otherwise opt out of this baseline.
    'html.slokk-phone-nav,html[data-viewmode="mobile"]{--sidebar-w:0px}',
    'html.slokk-phone-nav .view,html.slokk-phone-nav .view.active,' +
      'html[data-viewmode="mobile"] .view,html[data-viewmode="mobile"] .view.active{' +
      'margin-left:0!important;width:100%!important;max-width:100%!important;box-sizing:border-box!important}',
    'html.slokk-phone-nav #bstal-banner,html[data-viewmode="mobile"] #bstal-banner{' +
      'left:58px!important;right:10px!important}',
    'html.slokk-phone-nav #bstal-ember,html[data-viewmode="mobile"] #bstal-ember{' +
      'left:10px!important;right:10px!important}',

    // ── 1. Kill horizontal page overflow ────────────────────────────────────
    // Root guarantee: in mobile mode the page never scrolls sideways, whatever
    // the viewport width. This is the recoverable escape-hatch behaviour —
    // Skjár removes the attribute and everything returns to normal.
    'html[data-viewmode="mobile"],html[data-viewmode="mobile"] body{overflow-x:auto!important}',
    // The active content view fills the width and clips stray wide children.
    V + '{max-width:100%!important;overflow-x:hidden!important}',
    // Content images fit; leaflet map tiles are explicitly left alone below.
    V + ' img{max-width:100%;height:auto}',
    V + ' .leaflet-container img,' + V + ' .leaflet-container canvas{max-width:none;height:auto}',

    // ── 2. Wide tables scroll instead of bleeding ───────────────────────────
    // Standard responsive pattern: the <table> becomes a scroll box; thead/tbody
    // stay table-laid-out so the columns still read.
    V + ' table{display:block;overflow-x:auto;-webkit-overflow-scrolling:touch;max-width:100%}',
    V + ' table>thead,' + V + ' table>tbody,' + V + ' table>tfoot{display:table;width:100%;table-layout:auto}',
    // 2026-08-26 (Agnar column-shift): Rekstrarfélög already scrolls inside
    // .rf-tblscroll. Splitting thead/tbody into two tables + td.rf-cellname
    // {display:flex} shifted Heimilisfang/Nóta/Tæki one column. Keep one table.
    'html[data-viewmode="mobile"] #view-rekstrarfelog table.rf-tbl{display:table!important;overflow:visible!important;max-width:none}',
    'html[data-viewmode="mobile"] #view-rekstrarfelog table.rf-tbl>thead{display:table-header-group!important;width:auto;table-layout:fixed}',
    'html[data-viewmode="mobile"] #view-rekstrarfelog table.rf-tbl>tbody{display:table-row-group!important;width:auto;table-layout:fixed}',
    'html[data-viewmode="mobile"] #view-rekstrarfelog table.rf-tbl>tfoot{display:table-footer-group!important}',
    'html[data-viewmode="mobile"] #view-rekstrarfelog table.rf-tbl>colgroup{display:table-column-group}',

    // ── 3. Stack common multi-column rows ───────────────────────────────────
    // Conservative, class-based only (inline-style selectors are too broad).
    V + ' .three-col{display:block!important}',
    V + ' .three-col>aside.sidebar,' + V + ' .three-col>main.main-panel,' + V + ' .three-col>aside.print-aside{width:100%!important;max-width:100%!important;min-width:0!important;flex:none!important;box-sizing:border-box!important;margin-bottom:12px}',
    V + ' .frow2{grid-template-columns:1fr!important}',
    V + ' .row,' + V + ' .card-header,' + V + ' .toolbar,' + V + ' [class*="toolbar"],' + V + ' .tb{flex-wrap:wrap}',

    // ── 4. Readability & tap targets (gentle — no !important, so page rules win) ─
    V + ' button,' + V + ' .btn,' + V + ' input,' + V + ' select,' + V + ' textarea{min-height:40px}',
    V + ' button,' + V + ' .btn,' + V + ' a,' + V + ' input,' + V + ' select,' + V + ' textarea{font-size:15px}'
  ].join('\n');

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = css;
  (document.head || document.documentElement).appendChild(style);
})();
