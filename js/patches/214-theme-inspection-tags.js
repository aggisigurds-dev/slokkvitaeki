/* 214-theme-inspection-tags.js  —  "Inspection panel" refresh, pass 2.

   Restyles the Ársskoðun year columns (2023–2026) as colour-coded inspection
   tags:
       green  = úttektarskýrsla on file (links to Drive, as before)
       grey   = no report for that year (click to attach, as before)
       amber  = 2026 still due (no report yet this year)

   CSS ONLY. The cells are the exact same clickable links — nothing about the
   report/attach behaviour changes, and the priority dot, map→Leiðsögn icon and
   in-progress square are all left completely alone. Targets the year cells by
   position (nth-child 2–5 of a data row), so it needs no JS and survives every
   table re-render. Revert by deleting this file + its <script> tag. */
(function () {
  if (window.__themeTagsInstalled) return;
  window.__themeTagsInstalled = true;
  if (document.getElementById('thm-tags-style')) return;

  var st = document.createElement('style');
  st.id = 'thm-tags-style';
  st.textContent = [
    "tr._ars-row > td:nth-child(n+2):nth-child(-n+5){text-align:center !important;background:transparent !important;padding:6px 3px !important;}",
    "tr._ars-row > td:nth-child(n+2):nth-child(-n+5) > a{position:relative;display:inline-flex !important;align-items:center;justify-content:center;min-width:28px;height:20px;border-radius:3px 9px 9px 3px;font-size:0 !important;text-decoration:none !important;border:1px solid transparent;box-sizing:border-box;}",
    "tr._ars-row > td:nth-child(n+2):nth-child(-n+5) > a::before{content:'';position:absolute;left:5px;top:50%;transform:translateY(-50%);width:4px;height:4px;border-radius:50%;}",
    "tr._ars-row > td:nth-child(n+2):nth-child(-n+5) > a:not(._yr-add){background:#DBEEE3 !important;border-color:rgba(28,143,96,.35) !important;}",
    "tr._ars-row > td:nth-child(n+2):nth-child(-n+5) > a:not(._yr-add)::before{background:#1C8F60;}",
    "tr._ars-row > td:nth-child(n+2):nth-child(-n+5) > a._yr-add{background:#F0EFEA !important;border-color:#E2DFD6 !important;}",
    "tr._ars-row > td:nth-child(n+2):nth-child(-n+5) > a._yr-add::before{box-shadow:inset 0 0 0 1.5px #B9B6AC;}",
    "tr._ars-row > td:nth-child(5) > a._yr-add{background:#FBEAC6 !important;border-color:rgba(217,146,6,.5) !important;}",
    "tr._ars-row > td:nth-child(5) > a._yr-add::before{background:#D99206;}"
  ].join('\n');
  document.head.appendChild(st);
})();
