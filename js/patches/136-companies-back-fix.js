/* === COMPANIES BACK BUTTON FIX v1 ===
 *
 * Vandinn: Patch 127 (companies-edit-guard) blokkerar Companies.render()
 * þegar #companies-main er ekki með .company-grid og inniheldur detail-
 * markera (Breyta-takki o.fl.) — sem hann gerir RÉTT á meðan notandi er
 * að lesa detail-síðu (svo realtime breytingar þurrki ekki út detail).
 *
 * En þetta þýðir líka að „Til baka" takkinn á detail-síðu fer í sömu
 * skilyrði og er blokkað. Notandi smellir „Til baka" og ekkert gerist
 * — verður að refresha síðuna handvirkt.
 *
 * Lausn: grípa „Til baka" smellinn í CAPTURE PHASE (áður en aðrir
 * handlerar fíra). Þurrka detail-HTML-ið út fyrst → þá hættir
 * onDetailPage() að skila true → render fer í gegnum vörnina eðlilega.
 *
 * Capture-phase + e.stopImmediatePropagation() tryggir að engin önnur
 * lóg gripi við þetta (t.d. patch 100-back-button-fix).
 */
(() => {
  if (window.__companiesBackFixInstalled) return;
  window.__companiesBackFixInstalled = true;

  // 2026-06-07 DISABLED — obsolete and now harmful.
  // This patch existed back when the company-detail "Til baka" button called
  // Companies.render() (the grid) and patch 127's edit-guard blocked that
  // render, so back "did nothing". The detail header (features.js) now uses
  //   onclick="App.switchView('arsskodun')"
  // i.e. it correctly returns to Fyrirtæki í þjónustu. But this capture-phase
  // handler still fired first, called stopImmediatePropagation()+preventDefault(),
  // and forced Companies.render() — hijacking the user into the OLD "Fyrirtæki"
  // grid instead of "Fyrirtæki í þjónustu". switchView() is not Companies.render(),
  // so the edit-guard never blocks it; letting the button's own onclick run is
  // both correct and sufficient.
  return;

  function isTilBakaInCompanies(btn) {
    if (!btn) return false;
    const txt = (btn.textContent || '').trim();
    // Buttons with just "Til baka" or with an SVG chevron + "Til baka"
    if (!/^Til baka(\s|$)/.test(txt)) return false;
    return !!btn.closest('#companies-main');
  }

  document.addEventListener('click', (e) => {
    const btn = e.target && e.target.closest && e.target.closest('button');
    if (!isTilBakaInCompanies(btn)) return;
    const main = document.getElementById('companies-main');
    if (!main) return;
    // We're handling this — pre-empt all other listeners
    e.preventDefault();
    e.stopImmediatePropagation();
    // Clear detail-markers so patch 127's onDetailPage() returns false.
    main.innerHTML = '<div class="loading-state" style="padding:20px;color:#94a3b8;text-align:center">Hleður…</div>';
    // Now Companies.render() will pass the guard.
    setTimeout(() => {
      if (window.Companies && typeof Companies.render === 'function') {
        try { Companies.render(); } catch (err) { console.error('[companies-back-fix]', err); }
      }
      // Force the table-list to re-decorate on the new grid
      if (typeof window.refreshCompaniesList === 'function') {
        try { window.refreshCompaniesList(); } catch (_) {}
      }
    }, 20);
  }, true); // capture phase — runs before bubble-phase handlers

  console.log('[companies-back-fix] installed — Til baka guaranteed to work');
})();
/* === END COMPANIES BACK BUTTON FIX v1 === */
