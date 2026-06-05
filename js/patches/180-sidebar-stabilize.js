/* === SIDEBAR STABILIZE — anti-"popcorn" load v1 ===
 *
 * The side-nav buttons used to visibly "popcorn" in on load: ~19 patches inject
 * their own nav button on DOMContentLoaded (after first paint), and patch 68
 * (sidebar-reorder) then wipes + rebuilds the whole nav up to three times
 * (DOMContentLoaded / +1.5s / +3s) to sort the late arrivals — so buttons
 * appear and jump between paints.
 *
 * Rather than rewrite all 19 injectors to render statically (high regression
 * risk — each has its own dedup guard + click wiring), we make the load LOOK
 * static: mask the nav *contents* until they've been injected and ordered once,
 * then reveal the finished list in a single step — no entrance animation.
 *
 * The sidebar rail keeps its fixed width while masked, so there is zero
 * horizontal reflow. A hard timeout guarantees the nav is ALWAYS revealed even
 * if anything errors — the nav can never get stuck hidden.
 *
 * Purely additive: does not touch the injector patches or patch 68's logic.
 */
(() => {
  if (window.__sidebarStabilizeInstalled) return;
  window.__sidebarStabilizeInstalled = true;

  const STYLE_ID = 'sidebar-stabilize-style';
  if (!document.getElementById(STYLE_ID)) {
    const s = document.createElement('style');
    s.id = STYLE_ID;
    // Hide only the nav's items while settling — the rail (background + fixed
    // width) stays, so layout width is unchanged.
    s.textContent = `
      body.nav-settling nav.view-nav .vnav-btn,
      body.nav-settling nav.view-nav .nav-sep,
      body.nav-settling nav.view-nav .nav-section-label,
      body.nav-settling nav.view-nav .qlinks-section { visibility: hidden !important; }
      /* No entrance/transition flicker on the first reveal — items just appear,
         already sorted. User-initiated open/close animations are unaffected
         (they only run after settling is over). */
      body.nav-settling nav.view-nav .vnav-btn { transition: none !important; animation: none !important; }
    `;
    document.head.appendChild(s);
  }

  // Begin masking as early as possible (this script parses before first paint).
  (function startMask() {
    if (document.body) document.body.classList.add('nav-settling');
    else requestAnimationFrame(startMask);
  })();

  let revealed = false;
  function reveal() {
    if (revealed) return;
    revealed = true;
    // Force one final ordering pass so the nav appears already-sorted.
    try { if (window.SidebarReorder && SidebarReorder.reorder) SidebarReorder.reorder(); } catch (_) {}
    if (document.body) document.body.classList.remove('nav-settling');
  }

  // Reveal once the nav STOPS changing — i.e. all ~19 async injectors (some on
  // setTimeout 600/1500/3000ms) have landed and patch 68 has ordered them — so
  // the finished list appears in a single paint instead of popcorning in.
  // Debounce on nav child mutations; a hard cap guarantees it never stays
  // masked. The mask uses visibility:hidden, so the rail keeps its width/height
  // the whole time → zero layout shift.
  function scheduleStableReveal() {
    const nav = document.querySelector('nav.view-nav, .view-nav');
    if (!nav) { setTimeout(scheduleStableReveal, 150); return; }
    let timer = setTimeout(reveal, 360);
    const obs = new MutationObserver(() => {
      if (revealed) { obs.disconnect(); return; }
      clearTimeout(timer);
      timer = setTimeout(() => { obs.disconnect(); reveal(); }, 360);
    });
    obs.observe(nav, { childList: true });
  }
  function whenReady(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn, { once: true });
    else fn();
  }
  whenReady(scheduleStableReveal);

  // Hard safety net — never leave the nav masked, no matter what.
  setTimeout(reveal, 2600);

  console.log('[patch-180] sidebar-stabilize installed — mask-until-settled, no popcorn');
})();
/* === END SIDEBAR STABILIZE === */
