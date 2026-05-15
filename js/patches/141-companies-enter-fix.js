/* === COMPANIES ENTER FIX v2 ===
   Symptom v1 was meant to fix: clicking "Fyrirtækjaþjónusta" sometimes
   leaves you stuck on a previous company detail page (or shows nothing),
   because patch 127's edit-guard refuses to re-render Companies while
   #companies-main still contains detail-page markers.

   2026-05-14: v1 went too far — it wiped #companies-main on *every*
   view-shown event and *every* nav click, which kicked the user out of
   a detail page they were actively reading or editing. v2 only fires
   when truly needed:

   - View-shown event:           reset only if NOT already on a valid
                                 detail page AND grid isn't visible
   - Nav-button click on Fyrirtæki: same check
   - Always preserves the detail page when one is open

   Manual rescue: `__companiesEnter()` from the console still force-loads
   the grid. */
(() => {
  if (window.__companiesEnterFixInstalled) return;
  window.__companiesEnterFixInstalled = true;

  // Detect "user is actively reading a company detail page". Uses the same
  // markers patch 127's onDetailPage() uses, so the two stay in agreement.
  function isOnDetailPage(main) {
    if (!main) return false;
    return !!main.querySelector(
      'button[onclick*="Companies.openEdit"], ' +
      'button[onclick*="Companies.openMap"], ' +
      'button[onclick*="Companies.render"], ' +
      '._cat-section, ._cpr-section, #_ctc-section'
    );
  }

  function isGridVisible(main) {
    if (!main) return false;
    return !!main.querySelector('.company-grid');
  }

  function forceEnterCompanies(opts) {
    const main = document.getElementById('companies-main');
    if (!main) return;
    // 2026-05-14: NEVER wipe a live detail page. The user is reading or
    // editing — don't yank it out from under them.
    if (isOnDetailPage(main) && !(opts && opts.allowDetailWipe)) {
      // Detail is showing → leave alone. Companies' own realtime updates
      // (patch 127 guarded) will handle data refreshes.
      return;
    }
    // If the grid is already visible, nothing to do — Companies module
    // owns the rendering from here. We don't want to trigger an extra
    // re-render either (causes the "constant refresh" feeling).
    if (isGridVisible(main)) return;
    // Truly stale: empty container with no grid and no detail markers.
    main.innerHTML = '<div style="padding:20px;color:#94a3b8;text-align:center;font-size:13px">Hleður fyrirtækjum…</div>';
    if (window.__companiesEditGuard && typeof window.__companiesEditGuard.forceRefresh === 'function') {
      try { window.__companiesEditGuard.forceRefresh(); return; } catch (_) {}
    }
    if (window.Companies) {
      try {
        if (typeof Companies.load === 'function') Companies.load();
        else if (typeof Companies.render === 'function') Companies.render();
      } catch (e) {
        console.error('[patch-141] Companies render failed:', e);
      }
    }
  }

  document.addEventListener('view-shown', e => {
    const name = e && e.detail && (e.detail.name || e.detail);
    if (name === 'companies' || name === 'fyrirtaeki') {
      setTimeout(forceEnterCompanies, 40);
    }
  });

  // Nav-button backup: only acts when the user is NOT already on a detail.
  function wireNavClick() {
    const nav = document.querySelector('nav.view-nav, .view-nav');
    if (!nav) { setTimeout(wireNavClick, 600); return; }
    nav.addEventListener('click', (evt) => {
      const btn = evt.target && evt.target.closest && evt.target.closest('.vnav-btn, [data-view], button');
      if (!btn) return;
      const txt = (btn.textContent || '').toLowerCase();
      const view = (btn.dataset && btn.dataset.view) || '';
      if (view === 'companies' || /fyrirtækj/.test(txt)) {
        setTimeout(forceEnterCompanies, 60);
      }
    }, true);
  }
  wireNavClick();

  // Console rescue: force a full reload to the grid (allowed to wipe detail
  // if the user is genuinely stuck and explicitly wants the grid back).
  window.__companiesEnter = () => forceEnterCompanies({ allowDetailWipe: true });

  console.log('[patch-141 v2] detail-preserving enter fix installed');
})();
/* === END COMPANIES ENTER FIX === */
