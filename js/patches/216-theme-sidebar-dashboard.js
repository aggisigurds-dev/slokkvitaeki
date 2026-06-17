/* 216-theme-sidebar-dashboard.js  —  "Inspection panel" refresh: the extra
   mockup polish for the sidebar + the Fyrirtæki í Þjónustu header.

     • Sidebar: gentle group dividers + spacing between the existing nav groups
       (the app already marks group starts with .nav-grp-start) so the dense
       nav reads as organised sections.
     • Dashboard: an "ÁRSSKOÐUN" eyebrow above the page title.

   CSS only, builds on 213. No nav items added/removed, no behaviour changed.
   Revert by deleting this file + its <script> tag. */
(function () {
  if (window.__themeSidebarDashInstalled) return;
  window.__themeSidebarDashInstalled = true;
  if (document.getElementById('thm-sbd-style')) return;

  var st = document.createElement('style');
  st.id = 'thm-sbd-style';
  st.textContent = [
    ".vnav-btn.nav-grp-start{margin-top:9px !important;padding-top:10px !important;}",
    ".vnav-btn.nav-grp-start::after{content:'' !important;position:absolute !important;top:0 !important;left:11px !important;right:11px !important;height:1px !important;background:rgba(176,138,79,.20) !important;}",
    "#view-arsskodun h1::before{content:'ÁRSSKOÐUN' !important;display:block !important;font-family:'Space Mono',monospace !important;font-size:11px !important;letter-spacing:.14em !important;color:#B08A4F !important;font-weight:400 !important;margin-bottom:6px !important;}"
  ].join('\n');
  document.head.appendChild(st);
})();
