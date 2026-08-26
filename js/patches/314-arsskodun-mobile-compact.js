/* === ÁRSSKOÐUN MOBILE COMPACT v1 ============================================
 * Sími / app-ham: same desktop table (look-A glossy year pills, metallic
 * header, status chips) packed onto ~390px. Extra columns hide; 261's
 * 1320px horizontal-scroll table is cancelled. Gradients on ._yr are NOT
 * restyled — only size. Inline <col> widths are overridden so the table
 * actually shrinks (display:none on a col still left 728px of declared
 * widths).
 * ========================================================================== */
(() => {
  if (window.__arsMobileCompact314) return;
  window.__arsMobileCompact314 = true;

  const ID = 'ars-mobile-compact-314';
  const M = 'html[data-viewmode="mobile"] #view-arsskodun ';
  const A = 'body.appmode #view-arsskodun ';

  function inject() {
    let s = document.getElementById(ID);
    if (!s) {
      s = document.createElement('style');
      s.id = ID;
      (document.head || document.documentElement).appendChild(s);
    }
    s.textContent = [
      /* Clip the page, not the body — table may still scroll inside. */
      'html[data-viewmode="mobile"] #view-arsskodun,',
      'body.appmode #view-arsskodun',
      '{overflow-x:hidden!important;max-width:100%!important}',

      /* ── table: fit the phone, no page-wide horizontal scroll ── */
      M + '.data-table,' + A + '.data-table,',
      M + '._ars-tblscroll table,' + A + '._ars-tblscroll table,',
      'body.appmode #ars-main ._ars-tblscroll table',
      '{min-width:0!important;width:100%!important;table-layout:fixed!important}',
      M + '._ars-tblscroll,' + A + '._ars-tblscroll,',
      'body.appmode #ars-main ._ars-tblscroll',
      '{overflow-x:auto!important;max-width:100%!important;-webkit-overflow-scrolling:touch}',
      M + '.data-table-wrap,' + A + '.data-table-wrap',
      '{margin:0!important;border-radius:12px!important}',
      M + '.thm,' + A + '.thm{padding:0!important}',

      /* Inline col widths (186/118/284/64…) would keep the table ~728px
         even after hiding columns. Zero everything, then size the keepers. */
      M + 'col,' + A + 'col{width:0!important}',
      M + 'col:nth-child(1),' + A + 'col:nth-child(1){width:34%!important}',
      M + 'col:nth-child(4),' + A + 'col:nth-child(4),',
      M + 'col:nth-child(5),' + A + 'col:nth-child(5),',
      M + 'col:nth-child(6),' + A + 'col:nth-child(6),',
      M + 'col:nth-child(7),' + A + 'col:nth-child(7){width:30px!important}',
      M + 'col:nth-child(8),' + A + 'col:nth-child(8){width:38px!important}',
      M + 'col:nth-child(10),' + A + 'col:nth-child(10){width:36px!important}',
      M + 'col:nth-child(12),' + A + 'col:nth-child(12){width:78px!important}',

      /* Hide desktop-only columns: ferðanóta, heimilisfang, tæki, forg. */
      M + 'th[data-notacol],'+ A + 'th[data-notacol],',
      M + 'td._ars-notacell,'+ A + 'td._ars-notacell,',
      M + 'th[data-addrcol],'+ A + 'th[data-addrcol],',
      M + 'td._ars-addrcell,'+ A + 'td._ars-addrcell,',
      M + 'th[data-sort="tools"],'+ A + 'th[data-sort="tools"],',
      M + 'td:has(._devs),'+ A + 'td:has(._devs),',
      M + 'th[data-sort="priority"],'+ A + 'th[data-sort="priority"],',
      M + 'td:has(._pri-btn),'+ A + 'td:has(._pri-btn),',
      M + 'col:nth-child(2),'+ A + 'col:nth-child(2),',
      M + 'col:nth-child(3),'+ A + 'col:nth-child(3),',
      M + 'col:nth-child(9),'+ A + 'col:nth-child(9),',
      M + 'col:nth-child(11),'+ A + 'col:nth-child(11)',
      '{display:none!important;width:0!important}',

      /* Header: same metal band, tighter type. */
      M + '.data-table thead th,' + A + '.data-table thead th',
      '{padding:7px 3px!important;font-size:8px!important;letter-spacing:.06em!important;white-space:nowrap!important}',
      M + 'th[data-sort="name"],' + A + 'th[data-sort="name"]',
      '{padding-left:8px!important}',
      M + 'th[data-yrcol],' + A + 'th[data-yrcol]',
      '{font-size:8px!important;letter-spacing:.03em!important;white-space:normal!important;line-height:1.15!important;padding:6px 1px!important}',
      M + 'th[data-sort="name"] ._ars-mailsort,' + A + 'th[data-sort="name"] ._ars-mailsort',
      '{display:none!important}',

      /* Rows */
      M + '.data-table tbody td,' + A + '.data-table tbody td',
      '{padding:6px 2px!important;height:auto!important;min-height:48px!important;font-size:13px!important;line-height:1.25!important;white-space:nowrap!important;vertical-align:middle!important}',
      M + '.data-table tbody td:first-child,' + A + '.data-table tbody td:first-child',
      '{white-space:normal!important;padding-left:8px!important}',
      M + 'tr._ars-row,' + A + 'tr._ars-row{min-height:48px}',

      /* Name + kennitala — readable on white/steel. */
      M + '._co,' + A + '._co',
      '{font-size:16px!important;font-weight:700!important;line-height:1.2!important;color:#11141c!important}',
      M + '._kt,' + A + '._kt',
      '{font-size:12px!important;color:#334155!important;margin-top:1px!important}',

      /* Year pills: SCALE only — keep look-A gradients. */
      M + 'td[data-yrcell],' + A + 'td[data-yrcell]',
      '{padding:4px 0!important;text-align:center!important}',
      M + 'a._yr,' + A + 'a._yr',
      '{width:28px!important;height:20px!important;font-size:9px!important;gap:0!important;border-radius:5px!important}',
      M + 'a._yr::before,' + A + 'a._yr::before{width:4px!important;height:4px!important}',
      M + '._dd,' + A + '._dd{gap:1px!important}',
      M + '._yrs,' + A + '._yrs{gap:1px!important}',

      /* Under-name ferðanóta on Sími (column stays hidden). Dotted, shrinks. */
      M + 'input._ars-note-under,' + A + 'input._ars-note-under',
      '{display:block!important;width:100%!important;min-width:0!important;max-width:100%!important;' +
       'height:22px!important;min-height:22px!important;margin-top:3px!important;' +
       'font-size:16px!important;padding:0 2px!important;border:0!important;' +
       'border-bottom:1px dotted #c3c9d3!important;border-radius:0!important;' +
       'background:transparent!important;box-sizing:border-box!important}',

      /* Month / akstur / status */
      M + '._mo,' + A + '._mo{font-size:12px!important}',
      M + '._arsak-chip,' + A + '._arsak-chip,',
      M + 'table button._arsak-chip,' + A + 'table button._arsak-chip,',
      'body.appmode #ars-main table ._arsak-chip',
      '{min-width:32px!important;width:32px!important;min-height:32px!important;height:32px!important;padding:0!important;font-size:12px!important}',
      M + '._stcell,' + A + '._stcell',
      '{grid-template-columns:28px minmax(0,1fr)!important;gap:3px!important;flex-wrap:nowrap!important}',
      M + '._st,' + A + '._st',
      '{font-size:10px!important;padding:3px 5px!important;min-width:0!important;max-width:100%!important;overflow:hidden!important;text-overflow:ellipsis!important}',
      M + '._chk,' + A + '._chk,',
      M + '._ars-mark,' + A + '._ars-mark',
      '{width:28px!important;height:28px!important;min-width:28px!important;min-height:28px!important;padding:0!important}',

      /* Toolbar / KPI — denser, search full-width so iOS doesn't zoom. */
      M + '._ars-statgrid,' + A + '._ars-statgrid',
      '{grid-template-columns:1fr 1fr!important;gap:7px!important}',
      M + '._ars-statgrid > div,' + A + '._ars-statgrid > div',
      '{padding:8px 10px!important}',
      M + '._ars-filterstrip,' + A + '._ars-filterstrip',
      '{flex-direction:column!important;align-items:stretch!important}',
      M + '#_ars-search,' + A + '#_ars-search',
      '{font-size:16px!important;min-height:44px!important;max-width:none!important;width:100%!important;flex:1 1 100%!important}',
      M + '._ars-st,' + M + '._ars-mo,' + A + '._ars-st,' + A + '._ars-mo',
      '{min-height:40px!important;font-size:13px!important}'
    ].join('');
    /* Re-append so this sheet wins over 261/263/267 regardless of load order. */
    if (s.parentNode) s.parentNode.appendChild(s);
  }

  inject();
  document.addEventListener('slokk-viewmode', inject);
  window.addEventListener('hashchange', () => setTimeout(inject, 80));
  console.log('[patch-314] ársskoðun mobile compact');
})();
/* === END ÁRSSKOÐUN MOBILE COMPACT === */
