/* === RETIRE ÞJÓNUSTUTÆKI + LEGACY COMPANIES NAV v2 ===
 *
 * Hides two sidebar entries:
 *   • "Þjónustutæki" (data-view="field") — map/GPS now in Leiðsögn (161),
 *     per-unit detail + Klára heimsókn on Customer Detail Page (158).
 *   • "Fyrirtækjaþjónusta" (data-view="companies") — legacy companies
 *     list, replaced by "Fyrirtæki í Þjónustu" (Ársskoðun, patch 153).
 *     The underlying view-companies page is still reachable via the
 *     "Opna fyrirtækisíðu" button from Customer Detail / Ársskoðun.
 *
 * Both views remain in the DOM so deep-links keep working. Only the
 * sidebar entries are hidden so drivers stop bouncing between equivalent
 * views.
 *
 * v2 (2026-05-19): switched from inline `style.display = 'none'` to a
 * CSS !important rule. Patches 68 (sidebar-reorder) and 15 (sidebar
 * counts) rebuild/touch sidebar buttons after 162 runs, which sometimes
 * dropped the inline style. CSS survives DOM rewrites because the
 * selector keeps matching the freshly-injected button.
 *
 * Built 2026-05-19. Reversible: just delete this patch file.
 */
(() => {
  if (window.__retireThjonustutaekiInstalled) return;
  window.__retireThjonustutaekiInstalled = true;

  const STYLE_ID = 'retire-thjonustutaeki-style';
  if (!document.getElementById(STYLE_ID)) {
    const s = document.createElement('style');
    s.id = STYLE_ID;
    // Cover both the canonical `.vnav-btn[data-view="field"]` selector and
    // the legacy onclick-only form some patches generate. The space before
    // `!important` matters in older Safari builds.
    s.textContent = `
      .vnav-btn[data-view="field"],
      .view-nav [data-view="field"],
      nav.view-nav [data-view="field"],
      .vnav-btn[data-view="companies"],
      .view-nav [data-view="companies"],
      nav.view-nav [data-view="companies"] {
        display: none !important;
      }
    `;
    (document.head || document.documentElement).appendChild(s);
  }

  console.log('[retire-thjonustutaeki-nav v2] CSS-hide installed');
})();
/* === END RETIRE ÞJÓNUSTUTÆKI NAV === */
