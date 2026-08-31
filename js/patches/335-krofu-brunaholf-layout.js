/* === KRÖFUYFIRLIT = BRUNAHÓLF RÖÐ (335) =====================================
 *
 * Agnar 2026-08-30: Slökkvitæki Kröfuyfirlit átti að vera sama layout og
 * Brunahólf Kröfu yfirlit — þétt yfirlit, 46×42 ky-abtn á EINNI línu, lárétt
 * skrun (ekki 2-dálka flísar, ekki 16px þriðja útlit).
 *
 * Brunahólf er EKKI sami kóði: brunaholf/index.html renderKrofuyfirlit()
 * afritaði Skjár-röðina úr 166. Sími/appmode hér notaði svo renderCompanyMobile
 * (2-dálka .ky-acts). 166 teiknar nú Skjár-röðina alls staðar nema ▦ Tafla.
 *
 * 166 á master (#795) stillir 16px wrap-chips með :not(#_kyc0)×3. 340 (#797)
 * vefur í 2 línur. 261/314/315 reyna 50% flísar. Þessi patch vinnur CSS-stríðið
 * (sömu :not-keðju + auka fake-id) svo flísarnar / 16px / 2-línu 340 komi ekki
 * aftur, og svo zoom skili overflow (ekki dauðu beige).
 *
 * Skjár 2026-08-30: .ky-row er width:100% (ekki max-content) svo
 * .ky-row-end (upphæð + stöðu/aðgerða-flísar) situr hægra megin.
 * Sími/Öpp halda max-content. 153/187-reikningur er ÓSNERT.
 * Viewport: ekki user-scalable=no / width=390 / html { zoom }.
 * ========================================================================== */
(() => {
  if (window.__krofuBrunaholfLayout335) return;
  window.__krofuBrunaholfLayout335 = true;

  const STYLE_ID = 'krofu-brunaholf-layout-335';
  /* 166 uses :not(#_kyc0):not(#_kyc1):not(#_kyc2) (3 IDs). Match that and add
     one more so this sheet wins without editing 166. Also beats 340 wrap. */
  const K = ':not(#_kyc0):not(#_kyc1):not(#_kyc2):not(#_p335a)';

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
      + 'gap:1px!important;box-sizing:border-box!important;'
      + 'font-size:inherit!important;line-height:1!important;white-space:nowrap!important;'
      + 'overflow:visible!important;border-radius:9px!important}';
    const strip =
      '{display:flex!important;flex-wrap:nowrap!important;gap:6px!important;'
      + 'overflow-x:auto!important;overflow-y:hidden!important;'
      + 'height:auto!important;max-height:none!important;'
      + 'visibility:visible!important;pointer-events:auto!important;'
      + '-webkit-overflow-scrolling:touch}';
    return [
      /* Card-rows: Brunahólf .ky-card-rows — bounded width, children max-content. */
      KY + ' .ky-card-rows,'
        + M + KY + ' .ky-card-rows,'
        + A + KY + ' .ky-card-rows'
        + '{display:block!important;width:100%!important;max-width:100%!important;'
        + 'overflow-x:auto!important;overflow-y:hidden!important;'
        + '-webkit-overflow-scrolling:touch}',
      /* Skjár: row fills the card so amount+chips (.ky-row-end) sit at the
         right edge (under the company KRAFA total). min-width:max-content
         still lets card-rows scroll if chips overflow. Sími/Öpp keep the
         shrink-to-content row — same chip strip as before. */
      KY + ' .ky-card-rows>.ky-row'
        + '{display:flex!important;flex-wrap:nowrap!important;align-items:center!important;'
        + 'width:100%!important;min-width:max-content!important;'
        + 'box-sizing:border-box!important}',
      M + KY + ' .ky-card-rows>.ky-row,'
        + A + KY + ' .ky-card-rows>.ky-row'
        + '{display:flex!important;flex-wrap:nowrap!important;align-items:center!important;'
        + 'min-width:max-content!important;width:max-content!important}',
      KY + ' .ky-row-end'
        + '{display:flex!important;align-items:center!important;gap:12px!important;'
        + 'margin-left:auto!important;flex:0 0 auto!important;'
        + 'justify-content:flex-end!important}',

      /* Never let 166/314/315/340 wrap chips into 2-col tiles or 16px crumbs. */
      M + KY + ' .ky-acts' + K + ','
        + A + KY + ' .ky-acts' + K + ','
        + A + KY + ' .open .ky-acts' + K + ','
        + A + KY + ' .ky-mrow.open .ky-acts' + K + ','
        + M + KY + ' .ky-mrow .ky-acts' + K + ','
        + M + KY + ' .ky-mrow.open .ky-acts' + K
        + strip.slice(0, -1) + ';padding:4px 10px 8px!important;margin-top:4px!important}',

      M + KY + ' .ky-abtn' + K + ','
        + M + KY + ' .ky-acts .ky-abtn' + K + ','
        + M + KY + ' button.ky-abtn' + K + ','
        + A + KY + ' .ky-abtn' + K + ','
        + A + KY + ' .ky-acts .ky-abtn' + K + ','
        + A + KY + ' button.ky-abtn' + K + ','
        + A + KY + ' .open button.ky-abtn' + K
        + chip,

      M + KY + ' .ky-acts .ky-abtn span' + K + ','
        + A + KY + ' .ky-acts .ky-abtn span' + K + ','
        + M + KY + ' .ky-abtn .ky-abtn-ico' + K + ','
        + A + KY + ' .ky-abtn .ky-abtn-ico' + K
        + '{font-size:14px!important;line-height:1!important;letter-spacing:0!important}',
      M + KY + ' .ky-abtn .ky-abtn-lbl' + K + ','
        + A + KY + ' .ky-abtn .ky-abtn-lbl' + K
        + '{font-size:8.5px!important;line-height:1!important;font-weight:700!important}',

      /* Hreyfingar: same chip strip (167 already wanted nowrap; 315 wrapped it). */
      M + HL + ' .hl-macts,'
        + A + HL + ' .hl-macts,'
        + A + HL + ' .hl-mcard.open .hl-macts,'
        + A + HL + ' .hl-mcard:not(.open) .hl-macts'
        + strip.slice(0, -1) + ';display:flex!important;padding:6px 10px 8px!important}',
      M + HL + ' .abtn5,'
        + A + HL + ' .abtn5,'
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
