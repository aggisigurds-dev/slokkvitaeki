/* === HOOK-CHAIN FIX v1 ===
 *
 * Stops the unbounded wrapping chain of `Companies.openDetail`.
 *
 * Patches 24 (contact-log) and 25 (customer-ledger) each wrap
 * Companies.openDetail with their own setTimeout retries + MutationObserver
 * re-hooks. Their "already installed" guard is `Companies.openDetail._<flag>`
 * — a flag stored ON THE WRAPPER FUNCTION itself. Once a later wrapper sits
 * on top, the flag is gone (it lives on the inner function), so each retry
 * happily re-wraps. Patch 25's MutationObserver fires on every body change
 * (and there are many, especially with patch 162's own MutationObserver),
 * so the chain grows without bound — eventually stack overflow when the
 * user clicks a company.
 *
 * Fix: intercept assignment of `Companies.openDetail` and auto-stamp the
 * _clHook / _ledHook flags on any new wrapper. The original hookOpenDetail
 * checks then short-circuit and skip the re-wrap.
 *
 * Built 2026-05-19. Reversible: just delete this patch.
 */
(() => {
  if (window.__hookChainFixInstalled) return;
  window.__hookChainFixInstalled = true;

  function install() {
    if (!window.Companies || !Companies.openDetail) {
      setTimeout(install, 300);
      return;
    }
    if (Companies._openDetailGuarded) return;
    Companies._openDetailGuarded = true;

    let current = Companies.openDetail;
    // Stamp the current wrapper so the next 24/25 retry skips immediately.
    try { current._clHook = true; current._ledHook = true; } catch (_) {}

    Object.defineProperty(Companies, 'openDetail', {
      configurable: true,
      get() { return current; },
      set(v) {
        if (v && typeof v === 'function') {
          try { v._clHook = true; v._ledHook = true; } catch (_) {}
        }
        current = v;
      }
    });

    console.log('[hook-chain-fix v1] Companies.openDetail wrap-chain frozen');
  }

  install();
})();
/* === END HOOK-CHAIN FIX === */
