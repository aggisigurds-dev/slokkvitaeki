/* === RETIRE ÞJÓNUSTUTÆKI NAV v1 ===
 *
 * Hides the "Þjónustutæki" (view-field) sidebar nav entry. The map and
 * GPS routing it provided are now in Leiðsögn (patch 161). The per-unit
 * detail + Klára heimsókn + Úttektarskýrsla + Teikning are on the
 * Customer Detail Page (patch 158).
 *
 * view-field itself stays in the DOM — `_openCompanySafe`-style
 * deep-links from older code paths still work. Only the sidebar entry
 * is hidden so drivers stop bouncing between confusing equivalent views.
 *
 * Built 2026-05-19. Reversible: just delete this patch file.
 */
(() => {
  if (window.__retireThjonustutaekiInstalled) return;
  window.__retireThjonustutaekiInstalled = true;

  function hide() {
    const nav = document.querySelector('nav.view-nav, .view-nav');
    if (!nav) { setTimeout(hide, 500); return; }
    const btns = nav.querySelectorAll('.vnav-btn[data-view="field"]');
    if (!btns.length) { setTimeout(hide, 500); return; }
    btns.forEach(b => { b.style.display = 'none'; });
  }

  // Other patches rebuild the sidebar (patch 68 reorders); keep hiding.
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', hide);
  } else {
    hide();
  }
  setTimeout(hide, 1200);
  setTimeout(hide, 2500);
  // Also watch for re-injections
  new MutationObserver(() => hide()).observe(document.body, { childList: true, subtree: true });

  console.log('[retire-thjonustutaeki-nav v1] installed');
})();
/* === END RETIRE ÞJÓNUSTUTÆKI NAV === */
