/* === KRÖFUR 2-LÍNU HNAPPAR + KANBAN LÁRÉTT SKRUN (340) =====================
 *
 * Agnar 2026-08-30 (S26): 8–9 aðgerðahnappar á Kröfuyfirliti stóðu í háum
 * 2×4 stafla. Þeir eiga að sitja á TVEIMUR línum (5+4 / 4+4). Sama lota:
 * Afgreiðslu-kanban (Móttekin / Í vinnslu / Tilbúin) klipptist án láréttrar
 * skrunar á 390px.
 *
 * 153/187-reikningur er ÓSNERT. .oneignore er ekki snert.
 * ========================================================================== */
(() => {
  if (window.__krofuActsZoomScroll340) return;
  window.__krofuActsZoomScroll340 = true;

  const STYLE_ID = 'krofu-acts-zoom-scroll-340';

  function css() {
    const M = 'html[data-viewmode="mobile"] ';
    const A = 'body.appmode ';
    const KY = '#view-krofu-yfirlit ';
    /* 5 dálkar → 8 hnappar á 2 línum (5+3), 9 á 2 línum (5+4). min 40px. */
    const btn =
      '{flex:1 1 calc(20% - 4px)!important;min-width:calc(20% - 4px)!important;'
      + 'max-width:calc(20% - 4px)!important;width:calc(20% - 4px)!important;'
      + 'min-height:40px!important;height:40px!important;padding:1px 2px!important;'
      + 'box-sizing:border-box!important;gap:0!important}';
    return [
      M + KY + '.ky-acts,' + M + KY + '.open .ky-acts,'
        + A + KY + '.ky-acts,' + A + KY + '.open .ky-acts,'
        + A + KY + '.ky-mrow.open .ky-acts'
        + '{display:flex!important;flex-wrap:wrap!important;gap:4px!important;'
        + 'padding:4px 8px 8px!important;margin-top:6px}',
      M + KY + '.ky-acts .ky-abtn,' + M + KY + '.open .ky-acts .ky-abtn,'
        + M + KY + '.open button.ky-abtn,'
        + A + KY + '.ky-acts .ky-abtn,' + A + KY + '.open .ky-acts .ky-abtn,'
        + A + KY + '.open button.ky-abtn,'
        + A + KY + '.ky-mrow.open .ky-acts .ky-abtn'
        + btn,
      M + KY + '.ky-acts .ky-abtn>span:first-child,'
        + A + KY + '.ky-acts .ky-abtn>span:first-child'
        + '{font-size:12px!important;line-height:1!important}',
      M + KY + '.ky-acts .ky-abtn>span:last-child,'
        + A + KY + '.ky-acts .ky-abtn>span:last-child'
        + '{font-size:8px!important;font-weight:700;letter-spacing:0;line-height:1.1;'
        + 'white-space:nowrap;max-width:100%;overflow:hidden;text-overflow:ellipsis}',

      /* Kanban: 3 dálkar mega ekki krammast. Lárétt skrun á borðinu. */
      M + '#view-counter.active,' + A + '#view-counter.active,'
        + M + '#view-workshop.active,' + A + '#view-workshop.active'
        + '{overflow-x:auto!important;overflow-y:auto!important;-webkit-overflow-scrolling:touch}',
      'html body #view-counter#view-counter [data-pe-kanban],'
        + 'html[data-viewmode="mobile"] body.appmode #view-counter [style*="grid-template-columns:1fr 1fr 1fr"],'
        + M + '#view-counter [style*="grid-template-columns:1fr 1fr 1fr"],'
        + A + '#view-counter [style*="grid-template-columns:1fr 1fr 1fr"],'
        + 'html[data-viewmode="mobile"] body #view-counter#view-counter [data-pe-kanban],'
        + 'html body.appmode #view-counter#view-counter [data-pe-kanban]'
        + '{grid-template-columns:repeat(3,minmax(220px,1fr))!important;'
        + 'overflow-x:auto!important;min-width:680px!important;height:auto!important;'
        + 'max-height:none!important}',
      M + '#view-counter .cw-col,' + A + '#view-counter .cw-col'
        + '{min-width:220px!important}'
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

  window.KrofuActsZoomScroll340 = { mountCss, version: '340' };
  console.log('[patch-340] krofu 2-line acts + kanban hscroll');
})();
