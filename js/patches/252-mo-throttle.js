/* === 252-mo-throttle.js — global MutationObserver throttle ==================
 *
 * The slokkvitæki app has accumulated ~40+ MutationObservers across patches +
 * legacy `newfeatures.js`, most of them watching `document.body` with
 * `subtree:true`. Every DOM mutation (POS cart add, sidebar paint, sale-line
 * tweak) fires ALL of them. On POS Sala specifically this manifests as a
 * sluggish UI — typing or clicking adds layout work and observer callbacks.
 *
 * This patch monkey-patches `MutationObserver` so every callback is coalesced
 * to AT MOST one call per animation frame. The DOM still records every
 * mutation (callbacks receive the union of pending mutation records on each
 * frame), so logic stays correct — but instead of N callbacks per click we
 * get ≤ N/16 on a 60Hz display when activity is bursty.
 *
 * Idempotent: only wraps once, and falls back to passthrough if the runtime
 * doesn't support requestAnimationFrame for any reason.
 * ========================================================================= */
(() => {
  if (window.__moThrottle252) return;
  window.__moThrottle252 = true;

  const RealMO = window.MutationObserver;
  if (!RealMO || typeof requestAnimationFrame !== 'function') return;

  function ThrottledMO(originalCb) {
    let pending = [];
    let scheduled = false;
    let observerRef = null;

    const wrapped = function (mutations, observer) {
      observerRef = observer;
      if (mutations && mutations.length) pending.push(...mutations);
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(() => {
        scheduled = false;
        const flush = pending;
        pending = [];
        try { originalCb(flush, observerRef); }
        catch (e) { /* never let one bad observer poison the others */ console.error('[mo-throttle252] callback threw', e); }
      });
    };

    return new RealMO(wrapped);
  }
  // Mirror prototype + statics so `instanceof MutationObserver` still works
  // for anything that introspects.
  ThrottledMO.prototype = RealMO.prototype;
  Object.setPrototypeOf(ThrottledMO, RealMO);

  // Replace the global. Existing observers created before this loads keep
  // their original (un-throttled) behavior, but every patch after this gets
  // the throttled version automatically.
  window.MutationObserver = function (cb) { return ThrottledMO(cb); };
  window.MutationObserver.prototype = RealMO.prototype;

  console.log('[mo-throttle252] MutationObservers now throttled to ≤ 1 callback / animation frame');
})();
/* === END MO THROTTLE === */
