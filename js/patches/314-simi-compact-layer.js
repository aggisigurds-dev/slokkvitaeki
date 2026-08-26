/* SIMI / ÖPP COMPACT LAYER — shared design-system compacting
 *
 * One additive sheet for hub Sími (`html[data-viewmode="mobile"]`, patch 166)
 * AND Öpp apps (`body.appmode`, patch 261). Not a visual rewrite: Brunastál
 * compact-desktop language (theme.css classes, denser rows, wrap/stack).
 *
 * Covers:
 *   1. Full-bleed content (kill 32px .main-panel gutters + .thm .app-main pad)
 *   2. Stacked columns (stat-row 2×2, page-title, frow2, three-col)
 *   3. Wrap action rows (abtn5 / ky-abtn / row-actions / toolbars / filter-row)
 *   4. Denser list/table rows
 *   5. Scope 261’s 50px-button hammer: lists compact, forms stay tappable
 *
 * Frozen: css/theme-scoped.css is not edited (higher-specificity overrides
 * here beat `.thm .app-page .stat-card{min-width:180px!important}`).
 *
 * Out of scope (do not restyle):
 *   • Ársskoðun `._yr` look-A gradients (153) — including `._yr.inv-only`
 *     plaza / invoice-dot. No background/color/box-shadow on those.
 *   • Invoice OUT (10 / 233 / 254), kennitala save (121 / pos.js),
 *     payday-push — this file is CSS-only and never touches those paths.
 *   • POS `#view-sala` — own per-mode layout (same exclusion as 263).
 *
 * Per-page skeletons: only if a page still breaks after this layer.
 * Joker owns per-page polish; this is the shared floor.
 */
(() => {
  if (window.__simiCompactLayerInstalled) return;
  window.__simiCompactLayerInstalled = true;

  const STYLE_ID = 'simi-compact-layer-css';
  if (document.getElementById(STYLE_ID)) return;

  // [class*="…"] inside :not() would raise specificity the way 263 documents
  // for `:not(#id)`. Attribute-equals keeps this a class-level floor so
  // page rules (166 Krofu, 153 Ársskoðun, pos.js) still win.
  const V = '.view:not([id="view-sala"])';
  const M = 'html[data-viewmode="mobile"] ';
  const A = 'body.appmode ';

  // g(' .stat-row') → Sími + Öpp. Extra suffixes are comma-joined
  // (never put a trailing comma in a suffix — g() already inserts them).
  function g() {
    const out = [];
    for (let i = 0; i < arguments.length; i++) {
      const s = arguments[i];
      out.push(M + V + s, A + V + s);
    }
    return out.join(',');
  }

  const css = [
    // ── 1. Full-bleed ──────────────────────────────────────────────────────
    // app.css `.main-panel{padding:28px 32px;max-width:1200px}` leaves ~64px
    // of gutter on a 360px S26. 261 already zeroes side margins in appmode
    // but not padding. .thm pages use .app-main (theme-scoped 10/16/40).
    g(' .main-panel') + '{' +
      'padding:10px 10px 24px!important;' +
      'max-width:none!important;' +
      'margin-left:0!important;margin-right:0!important;' +
      'box-sizing:border-box!important;width:100%!important}',
    g(' .thm .app-main') + '{' +
      'padding:8px 10px 28px!important;max-width:100%!important;' +
      'box-sizing:border-box!important}',
    g(' .thm .app-page') + '{min-height:0!important;width:100%!important;max-width:100%!important}',
    g(' .thm .filter-search') + '{width:100%!important;margin-left:0!important}',
    g(' .thm .filter-search .field-dark', ' .thm .tool-lookup') + '{width:100%!important;max-width:100%!important;box-sizing:border-box!important}',

    // ── 2. Stack columns ───────────────────────────────────────────────────
    // theme-scoped `.stat-card{min-width:180px!important}` overflows a 360px
    // row of 4 KPIs. 2×2 + min-width:0 is the compact desktop language
    // (same recipe 166 already uses on Krofu — that page’s ID rules still win).
    g(' .stat-row') + '{display:grid!important;grid-template-columns:1fr 1fr!important;gap:8px!important;margin-bottom:12px!important}',
    g(' .thm .app-page .stat-card') + '{' +
      'min-width:0!important;flex:none!important;' +
      'padding:12px 13px!important;gap:10px!important;border-radius:14px!important}',
    g(' .thm .app-page .stat-card__icon') + '{width:36px!important;height:36px!important;border-radius:11px!important;font-size:16px!important}',
    g(' .thm .app-page .stat-card__value') + '{font-size:16px!important;white-space:nowrap!important}',
    g(' .page-title') + '{flex-direction:column!important;align-items:stretch!important;gap:10px!important;margin-bottom:12px!important}',
    g(' .page-title__tools') + '{justify-content:flex-start!important;flex-wrap:wrap!important;width:100%!important;gap:7px!important}',
    g(' .page-title h1') + '{font-size:20px!important;line-height:1.15!important}',
    g(' .frow2') + '{grid-template-columns:1fr!important}',
    g(' .three-col') + '{display:block!important}',
    g(' .three-col>aside.sidebar', ' .three-col>main.main-panel', ' .three-col>aside.print-aside') +
      '{width:100%!important;max-width:100%!important;min-width:0!important;flex:none!important;box-sizing:border-box!important}',
    g(' .info-grid') + '{grid-template-columns:1fr!important}',
    g(' .seg') + '{flex-wrap:wrap!important;width:100%!important}',
    g(' .seg button') + '{flex:1 1 auto!important}',

    // ── 3. Wrap actions ────────────────────────────────────────────────────
    g(' .row-actions', ' .jd-actions', ' .ky-acts',
      ' .filter-row', ' .toolbar', ' [class*="toolbar"]', ' .tb',
      ' .card-header', ' .row') +
      '{flex-wrap:wrap!important;gap:6px!important}',
    g(' .row-actions') + '{justify-content:flex-start!important}',
    g(' .abtn5') + '{flex:0 1 auto!important}',

    // ── 4. Denser rows ─────────────────────────────────────────────────────
    g(' .thm .data-table th', ' .thm .data-table tbody td') +
      '{padding:8px 8px!important}',
    g(' table th', ' table td') + '{padding-top:7px;padding-bottom:7px}',
    g(' .tcard .card-header') + '{padding:10px 12px!important}',
    g(' .surface-card') + '{border-radius:12px!important}',

    // ── 5. 261 50px-button hammer — lists compact, forms tappable ──────────
    // 261: `body.appmode .view button{min-height:50px;padding:12px!important}`.
    // That turns year-chips, abtn5, row actions and table toggles into 50px
    // sausages (153 already fights this on #ars-main). Scope it: LIST chrome
    // collapses back to compact desktop sizes; FORM controls stay ≥44px with
    // 16px type (iOS will not zoom).
    //
    // Appmode only: undo 261's 50px on list/table chrome. Floor at 36px so
    // rows stay compact but still tap-able. Sími hub keeps 263's 40px floor
    // (do NOT min-height:0 there — that crushed .mip-btn to ~21px).
    // Selectors never match `._yr` (those are bare <a>, not button/.btn).
    A + V + ' table button,' +
    A + V + ' table .btn,' +
    A + V + ' table a.btn,' +
    A + V + ' table [role="button"],' +
    A + V + ' tbody button,' +
    A + V + ' tbody .btn,' +
    A + V + ' .data-table button,' +
    A + V + ' .data-table .btn,' +
    A + V + ' .row-actions button,' +
    A + V + ' .row-actions .btn,' +
    A + V + ' .jd-actions button' +
      '{min-height:36px!important;padding-top:4px!important;padding-bottom:4px!important;' +
       'line-height:1.15!important;font-size:13px!important}',

    g(' .abtn5') + '{min-height:40px!important;height:40px!important;padding:0 10px!important;font-size:9.5px!important}',
    g(' .ky-abtn') + '{min-height:42px!important;height:42px!important;padding:0 7px!important}',

    // Pills/chips in rows are status, not tap-primary — keep them compact.
    // filter-chip is a toolbar control → tappable, handled below.
    A + V + ' .pill,' + A + V + ' .chip,' +
    A + V + ' [class*="pill"]:not(.filter-chip),' +
    A + V + ' [class*="chip"]:not(.filter-chip)' +
      '{min-height:0!important;padding-top:3px!important;padding-bottom:3px!important;font-size:12px!important}',

    // Forms + primary chrome stay tappable. 16px input type = no iOS zoom.
    // Öpp keeps 261’s 52px fields; Sími hub gets 48px (263 was 40px / 15px).
    g(' .filter-chip', ' .seg button',
      ' .btn:not(.abtn5):not(.ky-abtn)',
      ' .page-title__tools > button:not(.abtn5)',
      ' .page-title__tools > .btn',
      ' form button:not(.abtn5):not(.ky-abtn)',
      ' .fg button', ' .modal-ft button') +
      '{min-height:44px!important;padding-top:8px!important;padding-bottom:8px!important;' +
       'font-size:16px!important;line-height:1.2!important}',
    M + V + ' input,' + M + V + ' select,' + M + V + ' textarea,' +
    M + V + ' .fi,' + M + V + ' .field-dark' +
      '{min-height:48px!important;font-size:16px!important}',
    A + V + ' input,' + A + V + ' select,' + A + V + ' textarea,' +
    A + V + ' .fi,' + A + V + ' .field-dark' +
      '{min-height:52px!important;font-size:16px!important}',

    // Ferðanóta / Rekstrarfélög nóta: dotted one-liner, not 48px bricks.
    M + V + ' input._ars-plannote,' + M + V + ' input._note,' +
    M + V + ' input.rf-plannote,' + M + V + ' input._rf-plannote,' +
    A + V + ' input._ars-plannote,' + A + V + ' input._note,' +
    A + V + ' input.rf-plannote,' + A + V + ' input._rf-plannote' +
      '{min-height:22px!important;height:22px!important;font-size:16px!important;' +
       'padding-top:0!important;padding-bottom:0!important;border-radius:0!important}',

    // Checkboxes / radios must not inherit the 48–52px field hammer.
    g(' input[type="checkbox"]', ' input[type="radio"]') +
      '{min-height:20px!important;width:20px!important;height:20px!important;padding:0!important}',

    // Maps: do not clip Leaflet tiles (263 already leaves these alone).
    g(' .leaflet-container', ' .leaflet-container img', ' .leaflet-container canvas') +
      '{max-width:none;overflow:visible}',

    // ── Banner: Sími is a MODE, not a media query ──────────────────────────
    'html[data-viewmode="mobile"] #bstal-banner{height:66px!important;top:8px!important;left:58px!important;right:8px!important}',
    'html[data-viewmode="mobile"] #bstal-banner .bb-rightwrap{display:none!important}',
    'html[data-viewmode="mobile"] #bstal-banner .bb-logo img{height:34px!important}',
    'html[data-viewmode="mobile"] #bstal-ember{display:none!important}',
    'html[data-viewmode="mobile"] .view.active{padding-top:86px!important}',
    'html[data-viewmode="mobile"][data-bstal-banner="on"] #view-field.active,' +
    'html[data-viewmode="mobile"][data-bstal-banner="on"] #view-counter.active,' +
    'html[data-viewmode="mobile"][data-bstal-banner="on"] #view-workshop.active' +
      '{padding-top:86px!important}',
    'html[data-viewmode="mobile"][data-bstal-banner="on"] .view.active:not(#view-field):not(#view-counter):not(#view-workshop)' +
      '{padding-top:86px!important}',

    // ── Verkborð 2-col (media-query stacks miss Sími-on-wide-window) ───────
    M + '#view-verkbord .vb-toprow,' + M + '#view-verkbord .vb-split,' +
    A + '#view-verkbord .vb-toprow,' + A + '#view-verkbord .vb-split' +
      '{grid-template-columns:minmax(0,1fr)!important}',
    M + '#view-verkbord #vb-sel,' + A + '#view-verkbord #vb-sel{position:static!important}',
    M + '#view-verkbord .vb-wrap{padding:12px 8px 80px!important}',
    M + '#view-verkbord .vb-rowflex{flex-wrap:wrap!important}',
    M + '#view-verkbord .vb-acts{flex:1 1 100%!important;justify-content:flex-end}',

    // ── Afgreiðsla 3-col + height clip under banner ────────────────────────
    M + '#view-counter [style*="grid-template-columns:1fr 1fr 1fr"],' +
    A + '#view-counter [style*="grid-template-columns:1fr 1fr 1fr"]' +
      '{grid-template-columns:1fr!important;height:auto!important;overflow:visible!important;min-height:0;padding-bottom:24px!important}',
    M + '#view-counter.active,' + A + '#view-counter.active' +
      '{overflow-x:hidden!important;overflow-y:auto!important}',
    M + '#view-counter .cw-rcard,' + A + '#view-counter .cw-rcard{flex-wrap:wrap!important;gap:8px 6px!important}',
    M + '#view-counter .cw-rcard-info,' + A + '#view-counter .cw-rcard-info{flex:1 1 100%!important}',
    M + '#view-counter .cw-rcard > button,' + A + '#view-counter .cw-rcard > button' +
      '{flex:1 1 auto!important;min-height:44px!important;font-size:13px!important}',
    M + '#view-workshop .bw-flow,' + A + '#view-workshop .bw-flow' +
      '{flex-direction:column!important;align-items:stretch!important;padding:2px 8px 76px!important}',
    M + '#view-workshop .bw-card{flex:none!important;width:100%!important}',
    M + '#view-workshop .bw-sh-col{width:auto!important;position:static!important;max-height:none!important}',

    // ── POS 2-col tiles (V excludes #view-sala from the floor; pin here) ──
    'html[data-viewmode="mobile"] #view-sala .pos-grid,body.appmode #view-sala .pos-grid' +
      '{grid-template-columns:1fr!important}',
    'html[data-viewmode="mobile"] #view-sala #pos-services,' +
    'html[data-viewmode="mobile"] #view-sala #pos-products,' +
    'body.appmode #view-sala #pos-services,body.appmode #view-sala #pos-products' +
      '{grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:8px!important}',

    // ── Ársskoðun chrome; do NOT touch ._yr look-A ─────────────────────────
    M + '#view-arsskodun [style*="max-width:1720px"]{max-width:none!important;padding:8px 8px 48px!important}',
    M + '#view-arsskodun ._ars-statgrid{grid-template-columns:1fr 1fr!important;gap:8px!important}',
    M + '#view-arsskodun ._mail-badge,' + A + '#view-arsskodun ._mail-badge' +
      '{position:relative;min-width:44px;min-height:44px;display:inline-flex;align-items:center;justify-content:center;margin:-12px 0 -12px -8px;padding:12px 8px;box-sizing:border-box}',

    // ── Rekstrarfélög row density (Heimaleiga data is another ticket) ──────
    M + '#view-rekstrarfelog .rf-page,' + A + '#view-rekstrarfelog .rf-page{padding:8px 8px 40px!important}',
    M + '#view-rekstrarfelog .rf-tbl tbody td,' + A + '#view-rekstrarfelog .rf-tbl tbody td{padding:4px 8px!important}',
    M + '#view-rekstrarfelog .rf-stat{flex:1 1 140px!important;min-width:0!important;padding:10px 12px!important}'
  ].join('\n');

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = css;
  (document.head || document.documentElement).appendChild(style);

  window.SimiCompactLayer = { installed: true, styleId: STYLE_ID };
})();
