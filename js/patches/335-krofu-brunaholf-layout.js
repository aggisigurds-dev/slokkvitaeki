/* === KRÖFUYFIRLIT = BRUNAHÓLF RÖÐ (335) =====================================
 *
 * Agnar 2026-08-30: Slökkvitæki Kröfuyfirlit átti að vera sama layout og
 * Brunahólf Kröfu yfirlit — þétt yfirlit, 46×42 ky-abtn á EINNI línu, lárétt
 * skrun (ekki 2-dálka flísar, ekki 16px þriðja útlit).
 *
 * Brunahólf er EKKI sami kóði: brunaholf/index.html renderKrofuyfirlit()
 * afritaði Skjár-röðina úr 166. Sími/appmode hér notaði svo renderCompanyMobile
 * (2-dálka .ky-acts). 166 teiknar nú Skjár-röðina alls staðar nema ▦ Tafla.
 * Þessi patch vinnur CSS-stríðið við 261/314/315/333 svo flísarnar komi ekki
 * aftur, og svo 333-zoom skili overflow (ekki dauðu beige).
 *
 * 153/187-reikningur er ÓSNERT. .oneignore er ekki snert.
 * ========================================================================== */
(() => {
  if (window.__krofuBrunaholfLayout335) return;
  window.__krofuBrunaholfLayout335 = true;

  const STYLE_ID = 'krofu-brunaholf-layout-335';

  function css() {
    const KY = '#view-krofu-yfirlit';
    const HL = '#view-hreyfingarlisti';
    const M = 'html[data-viewmode="mobile"] ';
    const A = 'body.appmode ';
    const Z = 'html.app-page-zoomed ';
    /* Same chip box as brunaholf index.html .kyf-wrap .ky-abtn (46×42). */
    const chip =
      '{display:inline-flex!important;flex:0 0 auto!important;flex-direction:column!important;'
      + 'align-items:center!important;justify-content:center!important;'
      + 'min-width:46px!important;width:auto!important;max-width:none!important;'
      + 'min-height:0!important;height:42px!important;padding:0 7px!important;'
      + 'gap:1px!important;box-sizing:border-box!important}';
    return [
      /* Card-rows: Brunahólf .ky-card-rows — bounded width, children max-content. */
      KY + ' .ky-card-rows,'
        + M + KY + ' .ky-card-rows,'
        + A + KY + ' .ky-card-rows'
        + '{display:block!important;width:100%!important;max-width:100%!important;'
        + 'overflow-x:auto!important;overflow-y:hidden!important;'
        + '-webkit-overflow-scrolling:touch}',
      KY + ' .ky-card-rows>.ky-row,'
        + M + KY + ' .ky-card-rows>.ky-row,'
        + A + KY + ' .ky-card-rows>.ky-row'
        + '{display:flex!important;flex-wrap:nowrap!important;align-items:center!important;'
        + 'min-width:max-content!important;width:max-content!important}',

      /* Never let 166/314/315 wrap chips into 2-col tiles. */
      M + KY + ' .ky-acts,'
        + A + KY + ' .ky-acts,'
        + A + KY + ' .open .ky-acts,'
        + A + KY + ' .ky-mrow.open .ky-acts'
        + '{display:flex!important;flex-wrap:nowrap!important;gap:6px!important;'
        + 'overflow-x:auto!important;overflow-y:hidden!important;'
        + 'height:auto!important;max-height:none!important;'
        + 'padding:4px 10px 8px!important;-webkit-overflow-scrolling:touch}',

      M + KY + ' .ky-abtn,'
        + M + KY + ' .ky-acts .ky-abtn,'
        + M + KY + ' button.ky-abtn,'
        + A + KY + ' .ky-abtn,'
        + A + KY + ' .ky-acts .ky-abtn,'
        + A + KY + ' button.ky-abtn,'
        + A + KY + ' .open button.ky-abtn'
        + chip,

      /* Hreyfingar: same chip strip (167 already wanted nowrap; 315 wrapped it). */
      M + HL + ' .hl-macts,'
        + A + HL + ' .hl-mcard.open .hl-macts'
        + '{display:flex!important;flex-wrap:nowrap!important;overflow-x:auto!important;'
        + 'gap:6px!important;-webkit-overflow-scrolling:touch}',
      M + HL + ' .abtn5,'
        + A + HL + ' .hl-mcard.open .abtn5'
        + chip,

      /* 333 hard-zoom: view + card-rows must stay scrollable (no dead beige). */
      Z + KY + ','
        + 'html.app-page-zoomed[data-viewmode="mobile"] ' + KY + ','
        + Z + A + KY + ','
        + Z + KY + ' .ky-card-rows'
        + '{overflow:auto!important;overflow-x:auto!important;overflow-y:auto!important;'
        + 'max-width:none!important}',
      Z + KY + '{overflow-x:auto!important}',
      M + KY + ',' + A + KY
        + '{overflow-x:auto!important;-webkit-overflow-scrolling:touch}'
    ].join('\n');
  }

  function mountCss() {
    let s = document.getElementById(STYLE_ID);
    if (!s) {
      s = document.createElement('style');
      s.id = STYLE_ID;
      (document.head || document.documentElement).appendChild(s);
    }
    s.textContent = css();
    if (s.parentNode && s.parentNode.lastElementChild !== s) s.parentNode.appendChild(s);
  }
  mountCss();
  document.addEventListener('slokk-viewmode', mountCss);
  [80, 400, 1200].forEach(ms => setTimeout(mountCss, ms));

  window.KrofuBrunaholfLayout335 = { mountCss, version: '335' };
  console.log('[patch-335] krofu yfirlit = Brunahólf row layout');
})();
