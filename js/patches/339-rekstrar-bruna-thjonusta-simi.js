/* === REKSTRAR / BRUNA / ÞJÓNUSTA = KRÖFU YFIRLIT (339) ======================
 *
 * Agnar 2026-08-30: Rekstrarfélög, Brunakerfi yfirlit og Þjónustuborð á Sími
 * áttu að vera sama þétta yfirlit og Kröfu yfirlit — KPI + chips/raðir, mörg
 * atriði sýnileg, ekki risaspjöld.
 *
 * Aðeins `html[data-viewmode="mobile"]` og `body.appmode`. Skjár/Tafla ósnert.
 * 153/187-reikningur er ÓSNERT. 187 list renderer er ÓSNERT. Brunahólf er
 * ÓSNERT. .oneignore er ekki snert.
 *
 * 337 (önnur lota) málar önnur hub-yfirlit. Þessi patch á þrjár síður.
 * ========================================================================== */
(() => {
  if (window.__rekstrarBrunaThjonustaSimi339) return;
  window.__rekstrarBrunaThjonustaSimi339 = true;

  const STYLE_ID = 'rekstrar-bruna-thjonusta-simi-339';
  const P = ':not(#_p339a):not(#_p339b):not(#_p339c):not(#_p339d)';

  function css() {
    const M = 'html[data-viewmode="mobile"] ';
    const A = 'body.appmode ';
    const Z = 'html.app-page-zoomed ';
    const RF = '#view-rekstrarfelog';
    const BK = '#view-brunakerfi-yfirlit';
    const TB = '#view-thjonustubord';

    const chip =
      '{display:inline-flex!important;flex:0 0 auto!important;'
      + 'align-items:center!important;justify-content:center!important;'
      + 'min-width:46px!important;width:auto!important;max-width:none!important;'
      + 'min-height:0!important;height:42px!important;padding:0 10px!important;'
      + 'box-sizing:border-box!important;white-space:nowrap!important}';
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
    const kpi =
      '{flex:1 1 calc(50% - 6px)!important;min-width:0!important;max-width:none!important;'
      + 'padding:6px 8px!important;border-radius:10px!important;min-height:0!important;'
      + 'box-sizing:border-box!important}';

    function both(sel) { return M + sel + ',' + A + sel; }

    return [
      /* ── 1. Rekstrarfélög — accordion + KPI eins og Kröfu ─────────────── */
      both(RF + P) + pan,
      both(RF + ' .rf-page' + P)
        + '{padding:8px 8px 48px!important;max-width:none!important}',
      both(RF + ' .rf-phead' + P)
        + '{display:flex!important;flex-wrap:nowrap!important;align-items:center!important;'
        + 'gap:6px!important;margin-bottom:8px!important;overflow-x:auto!important;'
        + '-webkit-overflow-scrolling:touch}',
      both(RF + ' .rf-ptitle' + P)
        + '{font-size:18px!important;line-height:1.15!important}',
      both(RF + ' .rf-psub' + P)
        + '{display:none!important}',
      both(RF + ' .rf-search' + P)
        + '{margin-left:0!important;width:min(220px,52vw)!important;height:36px!important;'
        + 'flex:0 1 220px!important;min-width:140px!important}',
      both(RF + ' .rf-search input' + P)
        + '{font-size:16px!important;min-height:0!important;height:auto!important}',
      both(RF + ' .rf-phead .rf-btn' + P) + ','
        + both(RF + ' .rf-phead>span' + P)
        + '{flex:0 0 auto!important;margin-left:0!important}',
      both(RF + ' .rf-phead>span' + P) + strip,
      both(RF + ' .rf-btn' + P)
        + '{flex:0 0 auto!important;min-height:36px!important;height:36px!important;'
        + 'padding:0 10px!important;font-size:13px!important;white-space:nowrap!important}',

      both(RF + ' .rf-stats' + P)
        + '{display:grid!important;grid-template-columns:1fr 1fr!important;'
        + 'gap:6px!important;margin-bottom:8px!important;flex-wrap:unset!important}',
      both(RF + ' .rf-stat' + P) + kpi,
      both(RF + ' .rf-stat__l' + P)
        + '{font-size:9px!important;letter-spacing:.04em}',
      both(RF + ' .rf-stat__v' + P)
        + '{font-size:14px!important;margin-top:1px!important}',
      both(RF + ' .rf-stat__s' + P)
        + '{font-size:10px!important;margin-left:4px!important}',

      both(RF + ' .rf-svcbar' + P)
        + '{padding:8px 8px!important;margin-bottom:8px!important}',
      both(RF + ' .rf-svcrow' + P) + strip,
      both(RF + ' .rf-svcbtn' + P) + chip,
      both(RF + ' .rf-bsearch' + P)
        + '{margin-left:0!important;min-width:140px!important;height:36px!important;'
        + 'flex:0 1 180px!important}',
      both(RF + ' .rf-leg' + P)
        + '{flex:0 0 auto!important;white-space:nowrap!important}',

      both(RF + ' .rf-chiprow' + P) + strip.slice(0, -1) + ';margin-bottom:8px!important}',
      both(RF + ' .rf-pill' + P)
        + '{flex:0 0 auto!important;min-height:0!important;padding:3px 8px!important;'
        + 'font-size:11px!important;white-space:nowrap!important}',
      both(RF + ' .rf-gold' + P)
        + '{min-width:0!important;padding:6px 8px!important;flex:0 0 auto!important}',
      both(RF + ' .rf-gold__v' + P)
        + '{font-size:14px!important}',

      both(RF + ' .rf-acclist' + P)
        + '{gap:6px!important}',
      both(RF + ' .rfa__head' + P)
        + '{padding:8px 10px!important;gap:8px!important;min-height:0!important}',
      both(RF + ' .rfa__logo' + P)
        + '{width:32px!important;height:32px!important;border-radius:9px!important}',
      both(RF + ' .rfa__logo svg' + P)
        + '{width:16px!important;height:16px!important}',
      both(RF + ' .rfa__name' + P)
        + '{font-size:14px!important;line-height:1.2!important}',
      both(RF + ' .rfa__sub' + P)
        + '{font-size:10px!important;margin-top:0!important}',
      both(RF + ' .rfa__pills' + P) + strip.slice(0, -1)
        + ';flex:1 1 auto!important;max-width:none!important;justify-content:flex-end!important}',
      both(RF + ' .rfa__chev' + P)
        + '{width:24px!important;height:24px!important;min-width:24px!important}',
      both(RF + ' .rfa__pad' + P)
        + '{padding:8px 8px!important}',

      both(RF + ' .rf-tbl tbody td' + P)
        + '{padding:3px 8px!important}',
      both(RF + ' .rf-cellname' + P) + ','
        + both(RF + ' .rf-cellinner' + P)
        + '{min-height:36px!important}',
      both(RF + ' .rf-bname' + P)
        + '{font-size:13px!important}',
      both(RF + ' .rf-tblwrap' + P) + ','
        + both(RF + ' .rf-tblscroll' + P) + ','
        + both(RF + ' .rf-ovwrap' + P)
        + '{overflow-x:auto!important;max-width:100%!important;-webkit-overflow-scrolling:touch}',
      Z + RF + ',' + Z + M + RF + ',' + Z + A + RF + pan,

      /* ── 2. Brunakerfi yfirlit — KPI 2×2 + chip-raðir + tafla ─────────── */
      both(BK + P)
        + '{overflow:auto!important;overflow-x:auto!important;overflow-y:auto!important;'
        + '-webkit-overflow-scrolling:touch;width:100%!important;max-width:none!important;'
        + 'box-sizing:border-box!important}',
      both(BK + ' #_bky-root' + P) + fill,
      both(BK + ' [style*="max-width:1280px"]' + P)
        + '{max-width:none!important;width:100%!important;margin:0!important;'
        + 'padding:8px 8px 48px!important;box-sizing:border-box!important}',
      both(BK + ' [style*="font-size:20px;font-weight:800"]' + P)
        + '{font-size:18px!important;line-height:1.15!important}',
      both(BK + ' [style*="font-size:12.5px;color:#64748b"]' + P)
        + '{display:none!important}',
      both(BK + ' [style*="display:flex;align-items:center;gap:12px;margin:6px 0 14px"]' + P)
        + '{margin:0 0 8px!important;gap:8px!important}',

      both(BK + ' [style*="display:flex;gap:12px;flex-wrap:wrap"]' + P)
        + '{display:grid!important;grid-template-columns:1fr 1fr!important;'
        + 'gap:6px!important;margin-bottom:8px!important}',
      both(BK + ' [style*="flex:1 1 160px"]' + P) + kpi,
      both(BK + ' [style*="font-size:26px"]' + P)
        + '{font-size:14px!important;margin-top:1px!important}',
      both(BK + ' [style*="font-size:10.5px;font-weight:800"]' + P)
        + '{font-size:9px!important}',
      both(BK + ' [style*="font-size:11px;color:#94a3b8"]' + P)
        + '{font-size:10px!important;margin-top:1px!important}',

      both(BK + ' [style*="display:flex;gap:8px;flex-wrap:wrap"]' + P) + ','
        + both(BK + ' [style*="display:flex;gap:6px;flex-wrap:wrap"]' + P)
        + strip.slice(0, -1) + ';margin-bottom:8px!important}',
      both(BK + ' ._bky-filter' + P) + ','
        + both(BK + ' ._bky-month' + P) + ','
        + both(BK + ' ._bky-viewbtn' + P)
        + '{flex:0 0 auto!important;min-height:36px!important;height:36px!important;'
        + 'padding:0 10px!important;font-size:12px!important;white-space:nowrap!important}',
      both(BK + ' ._bky-search' + P)
        + '{flex:0 1 180px!important;min-width:140px!important;min-height:36px!important;'
        + 'height:36px!important;margin-left:0!important;font-size:16px!important}',
      both(BK + ' [style*="overflow-x:auto"]' + P)
        + '{overflow-x:auto!important;max-width:100%!important;-webkit-overflow-scrolling:touch}',
      both(BK + ' table._bky-tbl' + P)
        + '{min-width:720px}',
      both(BK + ' ._bky-row td' + P)
        + '{padding-top:3px!important;padding-bottom:3px!important}',
      Z + BK + ',' + Z + M + BK + ',' + Z + A + BK + pan,

      /* ── 3. Þjónustuborð — raðir, ekki risaspjöld ─────────────────────── */
      both(TB + P) + pan,
      both(TB + ' #tbm-wrap' + P)
        + '{height:100%!important;max-width:none!important}',
      both(TB + ' #tbm-wrap > div:first-child' + P)
        + '{padding:8px 10px 6px!important;gap:8px!important}',
      both(TB + ' #tbm-wrap > div:first-child > span:first-child' + P)
        + '{font-size:18px!important}',
      both(TB + ' #tbm-flokk-tabs' + P) + strip.slice(0, -1)
        + ';padding:0 8px!important;background:#fff!important}',
      both(TB + ' #tbm-flokk-tabs button' + P)
        + '{flex:0 0 auto!important;min-height:36px!important;height:36px!important;'
        + 'padding:0 10px!important;font-size:12px!important}',
      both(TB + ' #tbm-tabs' + P) + strip.slice(0, -1)
        + ';padding:0 4px!important}',
      both(TB + ' #tbm-tabs button' + P)
        + '{flex:0 0 auto!important;min-height:36px!important;height:36px!important;'
        + 'padding:0 10px!important;font-size:12px!important}',
      both(TB + ' #tbm-list' + P)
        + '{padding:6px 8px 80px!important}',
      both(TB + ' [data-tbmcard]' + P)
        + '{margin-bottom:6px!important;border-radius:10px!important;'
        + 'box-shadow:0 1px 2px rgba(20,30,25,.06)!important}',
      both(TB + ' [data-tbmcard] > div:first-child' + P)
        + '{padding:4px 10px 2px!important;gap:6px!important}',
      both(TB + ' [data-tbmcard] > div:nth-child(2)' + P)
        + '{padding:0 10px 2px!important}',
      both(TB + ' [data-tbmcard] > div:nth-child(2) > div:first-child' + P)
        + '{font-size:14px!important;line-height:1.2!important}',
      both(TB + ' [data-tbmcard] > div:nth-child(2) > div:nth-child(2)' + P)
        + '{font-size:12px!important;margin-top:0!important;line-height:1.25!important}',
      both(TB + ' [data-tbmcard] > div:nth-child(2) > div:nth-child(3)' + P)
        + '{display:none!important}',
      both(TB + ' [data-tbmcard] > div:last-child' + P)
        + strip.slice(0, -1) + ';padding:2px 10px 6px!important}',
      both(TB + ' [data-tbmcard] > div:last-child > span' + P)
        + '{flex:0 0 auto!important;font-size:10px!important;padding:2px 7px!important}',
      both(TB + ' #tbm-fab' + P)
        + '{width:48px!important;height:48px!important;min-width:48px!important;'
        + 'min-height:48px!important;font-size:24px!important}',
      Z + TB + ',' + Z + M + TB + ',' + Z + A + TB + pan
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

  window.RekstrarBrunaThjonustaSimi339 = { mountCss, version: '339' };
  console.log('[patch-339] rekstrar/bruna/thjonusta Sími = Kröfu chip-row density');
})();
