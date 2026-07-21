/* 215-theme-sala.js  —  "Inspection panel" refresh, pass 3 (Sala / till).

   Brings the till's product grid into the design system:
     • tactile product cards (clean border, soft shadow, hover lift)
     • prices as Space Grotesk "instrument" figures (matches the dashboard)
     • ex-VAT lines in quiet monospace

   CSS ONLY. Targets the product cards by position, so it survives every POS
   re-render with no JS. The product ICONS/IMAGES (the first child of each
   card) are deliberately left untouched, and nothing about pricing, the cart
   or any behaviour changes. Revert by deleting this file + its <script> tag. */
(function () {
  if (window.__themeSalaInstalled) return;
  window.__themeSalaInstalled = true;
  if (document.getElementById('thm-sala-style')) return;

  var st = document.createElement('style');
  st.id = 'thm-sala-style';
  st.textContent = [
    "#pos-services{gap:12px !important;}",
    "button.pos-svc{border:1px solid #E6E3DA !important;border-radius:13px !important;box-shadow:0 1px 2px rgba(20,20,25,.05) !important;padding:13px 12px !important;transition:transform .12s ease,box-shadow .12s ease,border-color .12s ease !important;}",
    "button.pos-svc:hover{transform:translateY(-2px) !important;box-shadow:0 8px 18px rgba(20,20,25,.10) !important;border-color:#D7D1C4 !important;}",
    "button.pos-svc>div:nth-child(3){font-family:'Space Grotesk',sans-serif !important;font-size:17px !important;font-weight:600 !important;letter-spacing:-.01em !important;color:#1B1D22 !important;}",
    "button.pos-svc>div:nth-child(4){font-family:'Space Mono',monospace !important;font-size:10px !important;color:#9A9CA2 !important;font-weight:400 !important;}"
  ].join('\n');
  document.head.appendChild(st);
})();
