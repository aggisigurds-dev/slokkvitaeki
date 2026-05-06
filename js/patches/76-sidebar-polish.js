/* === SIDEBAR POLISH v1 === */
/* Two small fixes for the left navigation panel:
 *   1. Cursor flickering — child elements inside nav buttons (svg/span/etc.)
 *      didn't all have cursor:pointer, so the arrow toggled between pointer
 *      and default as you moved over the button. Now pointer is consistent
 *      across the entire button surface.
 *   2. Hover lights up — subtle background tint on hover with a smooth
 *      transition so buttons feel responsive without being noisy.
 *
 * Pure CSS patch — overrides any per-button inline mouseenter/mouseleave
 * handlers (some patches set background via JS) using !important.
 */
(() => {
  if (document.getElementById('_sidebar_polish_css')) return;
  const css = document.createElement('style');
  css.id = '_sidebar_polish_css';
  css.textContent = [
    /* 1. Brute-force pointer cursor across the ENTIRE nav and ALL its children.
     *    Buttons, SVGs, spans, separators, labels, padding gaps — everything
     *    inside the nav area shows the same pointer cursor. This kills the
     *    flicker that came from the cursor toggling between pointer/default
     *    as you crossed sub-element boundaries inside the nav. */
    '.view-nav,',
    '.view-nav *,',
    '.sidebar,',
    '.sidebar * { cursor: pointer !important; }',
    /* Non-clickable separators don\'t catch hover/click events */
    '.view-nav .nav-sep,',
    '.view-nav .nav-section-label,',
    '.view-nav .nav-sep-group,',
    '.sidebar .nav-sep,',
    '.sidebar .nav-section-label { pointer-events: none !important; }',
    /* 3. Subtle hover lift — INSTANT (no transition) so tiny mouse jitter
     *    doesn't create rapid fade-in/fade-out flicker. */
    '.view-nav .vnav-btn,',
    '.view-nav button,',
    '.view-nav a,',
    '.sidebar .vnav-btn,',
    '.sidebar button,',
    '.sidebar a {',
    '  transition: none !important;',
    '  animation: none !important;',
    '}',
    '.view-nav .vnav-btn:hover:not(.active),',
    '.view-nav button:hover,',
    '.view-nav a:hover,',
    '.sidebar .vnav-btn:hover:not(.active),',
    '.sidebar button:hover,',
    '.sidebar a:hover {',
    '  background-color: rgba(255,255,255,0.12) !important;',
    '  color: #fff !important;',
    '}',
    /* Active button stays slightly lit; don\'t override existing red theme */
    '.view-nav .vnav-btn.active,',
    '.sidebar .vnav-btn.active { color: #fff !important; }'
  ].join('\n');
  document.head.appendChild(css);
  console.log('[sidebar-polish] installed v2');
})();
/* === END SIDEBAR POLISH v1 === */
