/* === SIDEBAR STABILIZE — NEUTRALISED 2026-06-20 ===
 *
 * This patch used to MASK the whole side-nav (visibility:hidden on every
 * .vnav-btn via `body.nav-settling`) until it "stopped changing", revealing it
 * only after a 700ms-quiet debounce with a hard 3800ms cap.
 *
 * It was built for the OLD patch-68 engine, which wiped + rebuilt the nav DOM
 * up to three times on load ("popcorn"). Patch 68 was rewritten 2026-06-13 to
 * position buttons with CSS `order` (zero DOM moves) + a permanent observer that
 * drops every button straight into its slot the instant it exists — so there is
 * no popcorn to hide anymore.
 *
 * The mask had become the single biggest cause of "the sidebar is very slow to
 * load": because this script runs late in the load order, it hid the nav AFTER
 * it had already painted, so the user saw buttons flash in → the whole sidebar
 * go blank for ~2 seconds → reappear at ~3.4s. Instrumented load timeline
 * (2026-06-20) confirmed buttons were ready by ~1.2s but stayed masked to ~3.4s.
 *
 * NEUTRALISED: the nav now paints as soon as its buttons exist. Correct,
 * stable order from the first paint is guaranteed by patch 68's CSS-`order`
 * engine + a localStorage cache of the saved order (no late Supabase reshuffle).
 * Kept as a no-op (not deleted) so the change is trivially reversible.
 */
(() => {
  if (window.__sidebarStabilizeInstalled) return;
  window.__sidebarStabilizeInstalled = true;

  // Safety: if any older build left the masking class/style behind (e.g. a
  // cached index.html with body class="nav-settling"), clear it so the nav can
  // never get stuck hidden.
  try {
    if (document.body) document.body.classList.remove('nav-settling');
    const old = document.getElementById('sidebar-stabilize-style');
    if (old) old.remove();
  } catch (_) {}

  console.log('[patch-180] sidebar-stabilize NEUTRALISED — nav paints immediately (no mask)');
})();
/* === END SIDEBAR STABILIZE === */
