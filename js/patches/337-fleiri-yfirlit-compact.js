/* === FLEIRI YFIRLIT = KRÖFU CHIP-RÖÐ (337) ==================================
 *
 * Agnar 2026-08-30: Kröfu yfirlit (KPI + fyrirtækjakort + ein nowrap chippa-
 * röð per krafa) átti að smitast yfir á önnur native hub-yfirlit sem enn voru
 * risatakkar / frosin spjöld / beige tómarúm eftir zoom.
 *
 * Sama tungumál og 166+335: 46×42 chip, nowrap, lárétt skrun ef þarf, mörg
 * atriði sýnileg. Allar aðgerðir haldast. Engin ný sjónræn tungumál.
 *
 * Síður:
 *   1. Hreyfingarlisti — chippa-röð, ekki 50% flísar (335 byrjar; 315 felur)
 *   2. Afgreiðsla / Verkstæði / Þjónustuverkstæði — takkar í röð, ekki pad
 *   3. Tekjur / Bókhald — yfirlit fyllir, ekki tveggja-dálka veggur
 *   4. Verk kanban — dálkar panna, ekki frímerki
 *   5. Brunakerfi yfirlit — tafla fyllir og skrunar
 *   6. Öpp — listi sem yfirlit, ekki tóm ræma
 *   7. Ársskoðun Sími — læsilegar raðir; Skjár er áfram tafla með pan.
 *      Ekki klippa Fyrirtæki-nöfn. Ekki mála ._yr.
 *
 * 153/187-reikningur er ÓSNERT. .oneignore er ekki snert.
 * Viewport: ekki user-scalable=no / width=390 / html { zoom }.
 * ========================================================================== */
(() => {
  if (window.__fleiriYfirlitCompact337) return;
  window.__fleiriYfirlitCompact337 = true;

  const STYLE_ID = 'fleiri-yfirlit-compact-337';
  const P = ':not(#_p337a):not(#_p337b):not(#_p337c):not(#_p337d)';

  function css() {
    const M = 'html[data-viewmode="mobile"] ';
    const A = 'body.appmode ';
    const Z = 'html.app-page-zoomed ';
    const chip =
      '{display:inline-flex!important;flex:0 0 auto!important;flex-direction:column!important;'
      + 'align-items:center!important;justify-content:center!important;'
      + 'min-width:46px!important;width:auto!important;max-width:none!important;'
      + 'min-height:0!important;height:42px!important;padding:0 7px!important;'
      + 'gap:1px!important;box-sizing:border-box!important;white-space:nowrap!important}';
    const strip =
      '{display:flex!important;flex-wrap:nowrap!important;align-items:center!important;'
      + 'gap:6px!important;overflow-x:auto!important;overflow-y:hidden!important;'
      + 'height:auto!important;max-height:none!important;'
      + '-webkit-overflow-scrolling:touch}';
    const fill =
      '{width:100%!important;max-width:none!important;box-sizing:border-box!important}';
    const pan =
      '{overflow:auto!important;overflow-x:auto!important;overflow-y:auto!important;'
      + '-webkit-overflow-scrolling:touch}';

    function both(sel) { return M + sel + ',' + A + sel; }

    return [
      /* ── 1. Hreyfingarlisti ───────────────────────────────────────────────
         167 teiknar alltaf .hl-macts. 315 felur þær á Öpp þar til .open og
         vefur í 25%/50% flísar. Yfirlit = chips alltaf, ein röð, skrun. */
      both('#view-hreyfingarlisti' + P) + pan,
      both('#view-hreyfingarlisti .hl-mlist' + P) + fill,
      both('#view-hreyfingarlisti .page-title' + P)
        + '{margin-bottom:6px!important;gap:6px!important}',
      both('#view-hreyfingarlisti .page-title h1' + P)
        + '{font-size:18px!important}',
      both('#view-hreyfingarlisti .page-title p' + P)
        + '{display:none!important}',
      both('#view-hreyfingarlisti .stat-row' + P)
        + '{gap:6px!important;margin-bottom:6px!important}',
      both('#view-hreyfingarlisti .stat-card' + P) + ','
        + both('#view-hreyfingarlisti .thm .app-page .stat-card' + P)
        + '{padding:6px 8px!important;border-radius:10px!important;min-height:0!important}',
      both('#view-hreyfingarlisti .stat-card__value' + P)
        + '{font-size:14px!important}',
      both('#view-hreyfingarlisti .stat-card__label' + P)
        + '{font-size:9px!important}',
      both('#view-hreyfingarlisti .hl-mcard' + P)
        + '{margin-bottom:6px!important;overflow:visible!important}',
      both('#view-hreyfingarlisti .hl-mhead' + P)
        + '{padding:6px 12px 2px!important}',
      both('#view-hreyfingarlisti .hl-macts' + P) + ','
        + A + '#view-hreyfingarlisti .hl-mcard:not(.open) .hl-macts' + P + ','
        + A + '#view-hreyfingarlisti .hl-mcard.open .hl-macts' + P
        + strip.slice(0, -1) + ';display:flex!important;padding:4px 10px 8px!important}',
      both('#view-hreyfingarlisti .abtn5' + P) + ','
        + A + '#view-hreyfingarlisti .hl-mcard.open .abtn5' + P
        + chip,
      both('#view-hreyfingarlisti .hl-macts .abtn5' + P)
        + '{flex:0 0 auto!important;min-width:46px!important}',

      /* ── 2. Afgreiðsla / Verkstæði / Þjónustuverkstæði ───────────────────
         78+314 vefja .cw-rcard > button í flex:1 1 auto (50% pad). Chip-röð. */
      both('#view-counter' + P) + pan,
      both('#view-workshop' + P) + pan,
      both('#view-field' + P) + pan,
      both('#view-counter .cw-rcard' + P)
        + '{flex-wrap:nowrap!important;align-items:center!important;gap:6px!important;'
        + 'overflow-x:auto!important;-webkit-overflow-scrolling:touch}',
      both('#view-counter .cw-rcard-info' + P)
        + '{flex:1 1 auto!important;min-width:0!important;max-width:none!important}',
      both('#view-counter .cw-rcard > button' + P) + ','
        + both('#view-counter .cw-rcard > .btn' + P) + ','
        + both('#view-counter .cw-rcard > select' + P)
        + '{flex:0 0 auto!important;min-width:0!important;width:auto!important;'
        + 'min-height:36px!important;height:36px!important;padding:0 10px!important;'
        + 'font-size:12px!important;white-space:nowrap!important}',
      both('#view-workshop .bw-flow' + P)
        + '{flex-wrap:nowrap!important;overflow-x:auto!important;overflow-y:auto!important;'
        + '-webkit-overflow-scrolling:touch;align-items:flex-start!important}',
      both('#view-workshop .bw-card' + P)
        + '{flex:0 0 auto!important;min-width:min(100%,520px)!important;max-width:100%!important}',
      both('#view-workshop .bw-prow' + P) + strip,
      both('#view-workshop .bw-tiles' + P)
        + '{flex-wrap:nowrap!important;overflow-x:auto!important;-webkit-overflow-scrolling:touch}',
      both('#view-field .field-toolbar' + P) + strip,
      both('#view-field .field-toolbar .btn' + P)
        + '{flex:0 0 auto!important;min-height:42px!important;height:42px!important;'
        + 'padding:0 12px!important;white-space:nowrap!important}',

      /* ── 3. Tekjur / Bókhald ───────────────────────────────────────────── */
      both('#view-income' + P) + pan,
      both('#view-bokhalds-yfirlit' + P) + pan,
      both('#view-income .thm .app-main' + P) + fill,
      both('#view-bokhalds-yfirlit .by-wrap' + P)
        + '{max-width:none!important;width:100%!important;padding:10px 10px 48px!important}',
      both('#view-income [style*="grid-template-columns:1fr 1fr"]' + P)
        + '{display:flex!important;flex-direction:column!important;gap:10px!important}',
      both('#view-income .page-title__tools' + P) + strip,
      both('#view-income .page-title__tools button' + P)
        + '{flex:0 0 auto!important;min-height:42px!important;height:42px!important;'
        + 'padding:0 12px!important;white-space:nowrap!important}',
      both('#view-income .tekjur-sale' + P)
        + '{padding:8px 8px!important;gap:8px!important}',
      both('#view-bokhalds-yfirlit .by-actions' + P) + strip,
      both('#view-bokhalds-yfirlit .by-actions button' + P) + ','
        + both('#view-bokhalds-yfirlit .by-header button' + P)
        + '{flex:0 0 auto!important;min-height:42px!important;height:42px!important;'
        + 'padding:0 12px!important;white-space:nowrap!important}',
      both('#view-bokhalds-yfirlit table' + P)
        + '{min-width:720px}',
      both('#view-bokhalds-yfirlit [class*="scroll"]' + P) + ','
        + both('#view-bokhalds-yfirlit .by-wrap' + P)
        + '{overflow-x:auto!important;-webkit-overflow-scrolling:touch}',

      /* ── 4. Verk kanban — dálkar panna ─────────────────────────────────── */
      both('#view-verkbord' + P) + pan,
      both('#view-verkbord .vb-wrap' + P)
        + '{max-width:none!important;width:100%!important;padding:12px 8px 72px!important}',
      both('#view-verkbord .vb-scroll' + P) + strip,
      both('#view-verkbord .vb-ed-actions' + P) + strip,
      both('#view-verkbord .vb-ed-actions .vb-btn' + P)
        + '{flex:0 0 auto!important;min-height:42px!important;height:42px!important;'
        + 'padding:0 12px!important;white-space:nowrap!important}',
      both('#vb-skipulag .sb-grid' + P)
        + '{display:flex!important;flex-wrap:nowrap!important;overflow-x:auto!important;'
        + 'gap:8px!important;-webkit-overflow-scrolling:touch;'
        + 'grid-template-columns:none!important}',
      both('#vb-skipulag .sb-slot' + P)
        + '{flex:0 0 min(220px,78vw)!important;min-width:180px!important;min-height:88px!important}',
      '#_tb-panel' + P
        + '{overflow:hidden!important}',
      '#_tb-board' + P
        + '{display:flex!important;flex-wrap:nowrap!important;overflow-x:auto!important;'
        + 'overflow-y:hidden!important;-webkit-overflow-scrolling:touch;'
        + 'align-items:stretch!important}',
      '#_tb-board > *' + P
        + '{flex:0 0 280px!important;min-width:260px!important;max-width:320px!important;'
        + 'width:280px!important}',

      /* ── 5. Brunakerfi yfirlit — fyllir og skrunar ─────────────────────── */
      both('#view-brunakerfi-yfirlit' + P)
        + '{overflow:auto!important;overflow-x:auto!important;overflow-y:auto!important;'
        + '-webkit-overflow-scrolling:touch;width:100%!important;max-width:none!important;'
        + 'box-sizing:border-box!important}',
      both('#view-brunakerfi-yfirlit #_bky-root' + P) + fill,
      both('#view-brunakerfi-yfirlit [style*="max-width:1280px"]' + P)
        + '{max-width:none!important;width:100%!important;margin:0!important;'
        + 'padding:10px 10px 48px!important;box-sizing:border-box!important}',
      both('#view-brunakerfi-yfirlit [style*="display:flex;gap:12px;flex-wrap:wrap"]' + P)
        + '{display:grid!important;grid-template-columns:1fr 1fr!important;gap:8px!important}',
      both('#view-brunakerfi-yfirlit ._bky-tbl' + P)
        + '{min-width:820px}',
      both('#view-brunakerfi-yfirlit [style*="overflow-x:auto"]' + P)
        + '{overflow-x:auto!important;max-width:100%!important;-webkit-overflow-scrolling:touch}',
      Z + '#view-brunakerfi-yfirlit,'
        + Z + M + '#view-brunakerfi-yfirlit,'
        + Z + A + '#view-brunakerfi-yfirlit'
        + pan,

      /* ── 6. Öpp launcher — yfirlit, ekki tóm ræma ──────────────────────── */
      both('#view-opp' + P) + pan,
      both('#view-opp .op-main' + P)
        + '{max-width:none!important;width:100%!important;padding:72px 10px 28px!important;'
        + 'box-sizing:border-box!important}',
      both('#view-opp .op-card' + P)
        + '{padding:10px 12px!important;margin:0 0 8px!important;min-height:0!important}',
      both('#view-opp .op-ic' + P)
        + '{width:40px!important;height:40px!important;font-size:22px!important;border-radius:11px!important}',
      both('#view-opp .op-nm' + P) + '{font-size:16px!important}',
      both('#view-opp .op-acts' + P) + strip.slice(0, -1) + ';margin:8px 0 0!important}',
      both('#view-opp .op-btn' + P)
        + '{flex:0 0 auto!important;min-width:46px!important;min-height:42px!important;'
        + 'height:42px!important;padding:0 12px!important;font-size:13px!important;'
        + 'white-space:nowrap!important}',
      both('#view-opp .op-card[style*="min-height:170px"]' + P)
        + '{min-height:0!important;padding:12px!important}',
      Z + '#view-opp,' + Z + '#view-opp .op-main' + pan,

      /* ── 7. Ársskoðun Sími: læsilegt, ekki klippt; Skjár panna ───────────
         330/331 eiga raðir og Skjár-töflu. Hér aðeins overflow svo zoom
         skilji ekki beige. Aldrei ._yr. Aldrei isPhone→card. */
      both('#view-arsskodun' + P)
        + '{overflow-x:auto!important;overflow-y:auto!important;-webkit-overflow-scrolling:touch}',
      both('#view-arsskodun #ars-main' + P)
        + '{max-width:none!important;width:100%!important}',
      both('#view-arsskodun ._arsm-tbl' + P)
        + '{overflow-x:auto!important;max-width:100%!important;-webkit-overflow-scrolling:touch}',
      both('#view-arsskodun ._arsm-nm' + P)
        + '{overflow-wrap:break-word!important;word-break:normal!important;'
        + 'overflow:visible!important;text-overflow:clip!important}',
      /* Skjár/Tafla scroller already in 331 — keep it panning, never clip. */
      both('#view-arsskodun ._ars-tblscroll' + P)
        + '{overflow:auto!important;-webkit-overflow-scrolling:touch}',

      /* Shared: action strips that 314 wrapped into tiles. */
      both('.view .row-actions' + P) + ','
        + both('.view .jd-actions' + P)
        + strip,
      both('.view .row-actions .btn' + P) + ','
        + both('.view .jd-actions .btn' + P) + ','
        + both('.view .row-actions button' + P) + ','
        + both('.view .jd-actions button' + P)
        + '{flex:0 0 auto!important;min-height:42px!important;height:42px!important;'
        + 'padding:0 10px!important;white-space:nowrap!important}'
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

  window.FleiriYfirlitCompact337 = { mountCss, version: '337' };
  console.log('[patch-337] fleiri yfirlit = Kröfu chip-row density');
})();
