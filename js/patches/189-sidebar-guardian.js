/* === SIDEBAR GUARDIAN v1 — dedupe + late-arrival ordering ===
 *
 * The side-nav is assembled by ~19 independent injector patches on staggered
 * timers, then ordered by patch 68 (sidebar-reorder) which stopped watching
 * after its 3s pass. Two failure modes remained:
 *
 *   1. DUPLICATES — an injector's dedup guard misses (races a reorder wipe,
 *      or two patches add the "same" button) and the nav accumulates copies.
 *   2. LATE ARRIVALS — any button injected after patch 68's last pass (3s)
 *      pops in unordered at the tail and stays there ("multi-layered
 *      build-up" on refresh).
 *
 * This guardian watches the nav with one debounced MutationObserver and on
 * each settle: (a) removes duplicate .vnav-btn entries (same data-view, or
 * same visible label when neither has a data-view — first in DOM order
 * wins), then (b) asks patch 68 for one reorder pass — but ONLY when the
 * nav's id-signature actually changed since the last pass, so the
 * reorder's own DOM writes never re-trigger us (no loops). Patch 68's
 * scheduleReorder keeps its click-protection (defers while the user is
 * clicking), so this cannot bring back the "button moved mid-click" bug.
 */
(() => {
  if (window.__sidebarGuardianInstalled) return;
  window.__sidebarGuardianInstalled = true;

  function navEl() { return document.querySelector('nav.view-nav, .view-nav'); }
  function btnText(b) { return String(b.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase(); }
  function navId(b) {
    const dv = b.getAttribute && b.getAttribute('data-view');
    return dv || ('#' + btnText(b));
  }

  function dedupe(nav) {
    const seen = new Set();
    let removed = 0;
    nav.querySelectorAll('.vnav-btn').forEach(b => {
      const id = navId(b);
      if (!id || id === '#') return;
      if (seen.has(id)) { b.remove(); removed++; }
      else seen.add(id);
    });
    if (removed) console.log('[sidebar-guardian] removed ' + removed + ' duplicate nav button(s)');
    return removed;
  }

  // Membership signature — SORTED so patch 68's repositioning (same buttons,
  // new order) never re-triggers us; only additions/removals do.
  function signature(nav) {
    return Array.from(nav.querySelectorAll('.vnav-btn')).map(navId).sort().join('|');
  }

  let lastSig = '';
  let timer = null;

  function settle() {
    const nav = navEl();
    if (!nav) return;
    dedupe(nav);
    const sig = signature(nav);
    if (sig === lastSig) return;             // our own / reorder's writes — quiet
    lastSig = sig;
    // Membership changed → one ordering pass (throttled + click-protected
    // inside patch 68). After it runs, the next settle sees the same
    // signature (reorder only repositions, never adds/removes buttons) and
    // goes quiet.
    try { if (window.SidebarReorder && SidebarReorder.scheduleReorder) SidebarReorder.scheduleReorder(); } catch (_) {}
  }

  function arm(tries) {
    const nav = navEl();
    if (!nav) {
      if ((tries || 0) > 40) return;
      setTimeout(() => arm((tries || 0) + 1), 500);
      return;
    }
    lastSig = signature(nav);
    const obs = new MutationObserver(() => {
      clearTimeout(timer);
      timer = setTimeout(settle, 400);
    });
    obs.observe(nav, { childList: true, subtree: false });
    // One initial pass for anything that landed before we armed.
    setTimeout(settle, 400);
    console.log('[patch-189] sidebar-guardian armed');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => arm(0), { once: true });
  else arm(0);
})();
/* === END SIDEBAR GUARDIAN === */
