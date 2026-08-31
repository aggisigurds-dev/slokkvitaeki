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

      /* v2 (2026-08-26, Agnar): PRÓSENTU-dálkar sem summa í 100% — taflan
         fyllir ALLTAF viewportið (412px Sími jafnt sem ~980px "desktop site")
         í stað þess að hrynja til vinstri þegar föstu pixlarnir < viewport.
         Nótan fær SINN eigin mjóa dálk (col2, sem áður var falinn) og
         under-name línan hverfur → raðhæðin lækkar ~35%. */
      M + 'col,' + A + 'col{width:0!important}',
      M + 'col:nth-child(1),' + A + 'col:nth-child(1){width:7%!important}',
      M + 'col:nth-child(2),' + A + 'col:nth-child(2){width:26%!important}',
      M + 'col:nth-child(5),' + A + 'col:nth-child(5),',
      M + 'col:nth-child(6),' + A + 'col:nth-child(6),',
      M + 'col:nth-child(7),' + A + 'col:nth-child(7){width:7%!important}',
      M + 'col:nth-child(8),' + A + 'col:nth-child(8){width:9%!important}',
      M + 'col:nth-child(4),' + A + 'col:nth-child(4){width:24%!important}',
      M + 'col:nth-child(10),' + A + 'col:nth-child(10){width:13%!important}',

      /* 2026-08-28 (Agnar: „address lost only in mobile view", „taeki sumary
         is still not there"): HEIMILISFANG og TÆKI voru falin hér sem
         „desktop-only". Þau eru nú SÝNILEG á síma — plássið kemur úr
         póst-dálknum sem hafði 26% af skjánum fyrir eitt umslag.
         FORGANGUR er áfram falinn (síu-flísin ofar gerir sama gagn).
         Vilji notandinn fela þau má gera það í 📐 Dálkastjóra (patch 326) —
         TableLook-reglur 319 vinna á þessum. */
      M + 'th[data-sort="priority"],'+ A + 'th[data-sort="priority"],',
      M + 'td:has(._pri-btn),'+ A + 'td:has(._pri-btn),',
      M + 'col:nth-child(3),'+ A + 'col:nth-child(3),',
      M + 'col:nth-child(9),'+ A + 'col:nth-child(9),',
      M + 'col:nth-child(11),'+ A + 'col:nth-child(11)',
      '{display:none!important;width:0!important}',
      /* Nótu-dálkurinn: mjór, ein punktalína, öll nótan í title/tap. */
      M + 'th[data-notacol],'+ A + 'th[data-notacol]{display:table-cell!important;font-size:8px!important;padding:6px 1px!important}',
      M + 'td._ars-notacell,'+ A + 'td._ars-notacell{display:table-cell!important;padding:2px 2px!important;vertical-align:middle!important}',
      M + 'td._ars-notacell ._note,'+ A + 'td._ars-notacell ._note,',
      M + 'td._ars-notacell input,'+ A + 'td._ars-notacell input',
      '{width:100%!important;min-width:0!important;font-size:12px!important;height:22px!important;overflow:hidden!important;text-overflow:ellipsis!important;white-space:nowrap!important}',

      /* Header: same metal band, tighter type. */
      M + '.data-table thead th,' + A + '.data-table thead th',
      '{padding:7px 3px!important;font-size:8px!important;letter-spacing:.06em!important;white-space:nowrap!important}',
      M + 'th[data-sort="name"],' + A + 'th[data-sort="name"]',
      '{padding-left:8px!important}',
      M + 'th[data-yrcol],' + A + 'th[data-yrcol]',
      '{font-size:8px!important;letter-spacing:.03em!important;white-space:normal!important;line-height:1.15!important;padding:6px 1px!important}',
      M + 'th[data-sort="name"] ._ars-mailsort,' + A + 'th[data-sort="name"] ._ars-mailsort',
      '{display:none!important}',

      /* Rows — v2: ~30% lægri (nótan er farin úr nafn-staflanum í eigin dálk),
         texti ~10% stærri (ósk Agnars 2026-08-26). */
      M + '.data-table tbody td,' + A + '.data-table tbody td',
      '{padding:3px 2px!important;height:auto!important;min-height:34px!important;font-size:14px!important;line-height:1.2!important;white-space:nowrap!important;vertical-align:middle!important}',
      M + '.data-table tbody td:first-child,' + A + '.data-table tbody td:first-child',
      '{white-space:normal!important;padding-left:8px!important}',
      M + 'tr._ars-row,' + A + 'tr._ars-row{min-height:34px}',

      /* Name + kennitala — readable on white/steel, +10%. */
      M + '._co,' + A + '._co',
      '{font-size:17px!important;font-weight:700!important;line-height:1.15!important;color:#11141c!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important;display:block!important}',
      M + '._kt,' + A + '._kt',
      '{font-size:12.5px!important;color:#334155!important;margin-top:0!important;line-height:1.1!important}',

      /* Year pills: SCALE only — keep look-A gradients. +10%. */
      M + 'td[data-yrcell],' + A + 'td[data-yrcell]',
      '{padding:2px 0!important;text-align:center!important}',
      M + 'a._yr,' + A + 'a._yr',
      '{width:30px!important;height:22px!important;font-size:10px!important;gap:0!important;border-radius:5px!important}',
      M + 'a._yr::before,' + A + 'a._yr::before{width:4px!important;height:4px!important}',
      M + '._dd,' + A + '._dd{gap:1px!important}',
      M + '._yrs,' + A + '._yrs{gap:1px!important}',

      /* Under-name ferðanótan VÍKUR — nótan býr nú í eigin dálki (col2). */
      M + 'input._ars-note-under,' + A + 'input._ars-note-under',
      '{display:none!important}',

      /* Month / akstur / status — +10%, þjappað til hægri */
      M + '._mo,' + A + '._mo{font-size:13px!important}',
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
