/* === LAST VIEW MEMORY v3.2 ===
 *
 * Persists the user's most recently used view to localStorage and
 * restores it on page reload.
 *
 * v3.2 — uses "first user interaction" as the boot boundary, not a
 * fixed deadline. Discovered v3.1 that SOMETHING calls switchView('sala')
 * around t=1500ms (well past sala.js's setTimeout(0)) — likely a
 * patch reacting to data load. v3.1's BOOT_DEADLINE=2000ms wasn't enough.
 *
 * v3.2 design:
 *   • TARGET captured at script load — immune to boot-time overwrites.
 *   • Wrap only saves to localStorage AFTER first real user interaction
 *     (mousedown/keydown/touchstart/pointerdown — events that cannot
 *     be triggered synthetically without dispatchEvent). This means
 *     boot-time auto-landings (sala.js, patch 88, late patches) never
 *     poison the stored value.
 *   • Tick runs until either first user interaction OR a 10-second
 *     safety deadline. Each tick re-asserts the target if we drifted
 *     away — survives the t=1500ms switchView('sala') we observed.
 *   • Once user interacts, tick stops and wrap starts saving on every
 *     switchView call.
 */
(() => {
  if (window.__lastViewMemoryInstalled) return;
  window.__lastViewMemoryInstalled = true;

  const LS_KEY = 'lastView';

  // Capture target at SCRIPT LOAD time — before anything else can
  // race-update localStorage.
  const TARGET = (() => {
    try { return localStorage.getItem(LS_KEY); } catch (_) { return null; }
  })();

  // Safety deadline — stop ticking after 10s even if user never interacts.
  // (Cheap 50ms timer; mostly stops earlier via _userInteracted.)
  const TICK_DEADLINE = Date.now() + 10000;

  // Boot boundary: any of these REAL user-input events flips us.
  // Synthetic events don't trigger these unless something explicitly
  // dispatches them, which no other patch in this codebase does.
  let _userInteracted = false;
  const markInteracted = () => { _userInteracted = true; };
  ['mousedown', 'keydown', 'touchstart', 'pointerdown'].forEach(evt => {
    window.addEventListener(evt, markInteracted, { capture: true, passive: true });
  });

  // Debug counters — readable via window.__lvmDebug
  const debug = window.__lvmDebug = { ticks: 0, restores: 0, saves_skipped: 0, saves_done: 0, target: TARGET };

  function patchSwitchView() {
    if (!window.App || typeof window.App.switchView !== 'function') {
      setTimeout(patchSwitchView, 100);
      return;
    }
    if (window.App.switchView.__lastViewWrapped) return;
    const orig = window.App.switchView;
    const wrapped = function (view) {
      const r = orig.apply(this, arguments);
      try {
        if (view && typeof view === 'string') {
          if (_userInteracted) {
            localStorage.setItem(LS_KEY, view);
            debug.saves_done++;
          } else {
            debug.saves_skipped++;
          }
        }
      } catch (_) {}
      return r;
    };
    wrapped.__lastViewWrapped = true;
    window.App.switchView = wrapped;
  }

  function isOnTarget() {
    if (!TARGET) return true;
    const activeView = document.querySelector('.view.active');
    return !!(activeView && activeView.id === 'view-' + TARGET);
  }

  function restoreLastView() {
    if (!TARGET) return true;
    // Yield when a deep link is present: the legacy #view-… form OR any clean
    // slug hash the url-routing patch (218) handles (e.g. #leidsogn, #sala) —
    // i.e. any non key=value hash. The router applies it; we must not yank the
    // user back to the last-used view on reload.
    if (location.hash && location.hash.length > 1 && location.hash.indexOf('=') === -1) return true;
    if (!window.App || typeof window.App.switchView !== 'function') return false;
    if (isOnTarget()) return true;
    try {
      window.App.switchView(TARGET);
      debug.restores++;
    } catch (_) {}
    return isOnTarget();
  }

  function init() {
    patchSwitchView();
    // Tick every 50ms, re-asserting TARGET each time we drift away.
    // Stops on first real user interaction OR after the 10s safety
    // deadline. This is the key to surviving late switchView calls
    // (we observed one at t≈1554ms on this page).
    const tick = () => {
      debug.ticks++;
      if (_userInteracted) return;          // user took over
      if (Date.now() >= TICK_DEADLINE) return; // safety bail
      if (!isOnTarget()) restoreLastView();
      setTimeout(tick, 50);
    };
    tick();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  console.log('[last-view-memory v3.2] installed, target:', TARGET);
})();
/* === END LAST VIEW MEMORY === */
