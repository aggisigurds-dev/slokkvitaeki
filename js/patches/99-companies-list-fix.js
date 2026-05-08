/* === COMPANIES LIST FIX v1 ===
 *
 * Vandamál (race condition): companieslist.js decorate() hagar sér ekki
 * réttilega þegar Companies.render() er kallaður tvisvar í röð (sem gerist
 * þegar Companies.load() er hægt — render keyrist með tóman lista, svo aftur
 * með full lista).
 *
 * Sequence sem skapar bug-ið:
 *   1. switchView('companies') → Companies.load() byrjar (async)
 *   2. switchView líka kallar Companies.render() — list er enn tóm → tóm grid
 *   3. companieslist.js MutationObserver: 80ms timeout → decorate()
 *   4. decorate() byrjar, setur _pending=true, await loadData()
 *   5. Companies.load() klárar → kallar this.render() → ný grid í DOM
 *   6. MutationObserver fires aftur, setur 80ms timeout fyrir decorate
 *   7. Eftir 80ms keyrir decorate aftur — sér _pending=true → return
 *   8. Fyrri decorate klárar await, en `grid` variable er gamla detached grid
 *   9. grid.parentNode er null → return early
 *  10. _pending reset, en engin önnur decorate fer í gang
 *  11. Tafla aldrei birt — notandi sér tóma síðu
 *
 * Lausn: vefjum Companies.render() og Companies.load() til að:
 *   • Hreinsa _listShown flag á gamla grid
 *   • Þvinga companieslist decorate() aftur eftir lítil bið
 *   • Tryggja að tafla og row-clicks séu vírdaðir áfram
 *
 * Líka: bætum við „retry-if-empty" í setInterval — ef grid hefur cards en
 *  table er tóm, þvingum decorate() aftur.
 */
(() => {
  if (window.__companiesListFixInstalled) return;
  window.__companiesListFixInstalled = true;

  function tryForceRedecorate() {
    const v = document.getElementById('view-companies');
    if (!v) return;
    const grid = v.querySelector('.company-grid');
    const cards = grid ? grid.querySelectorAll('.company-card').length : 0;
    const tbody = v.querySelector('._cl_table tbody');
    const tbodyRows = tbody ? tbody.querySelectorAll('tr').length : 0;

    // If we have cards but no table rows, the decoration didn't complete.
    // Force re-run by clearing the _listShown flag and removing the stale wrap.
    if (cards > 0 && tbodyRows === 0) {
      if (grid) grid.dataset._listShown = '';
      const wrap = v.querySelector('._cl_wrap');
      if (wrap) wrap.remove();
      // Restore grid display so user sees something while decorate re-runs
      if (grid) grid.style.display = '';
      // Trigger re-decorate via the public hook (or fall back)
      if (typeof window.refreshCompaniesList === 'function') {
        try { window.refreshCompaniesList(); } catch (_) {}
      }
    }
  }

  // Wrap Companies.render so each call clears the _listShown flag,
  // ensuring companieslist.js will re-decorate the new grid.
  function wrapCompaniesRender() {
    if (!window.Companies || typeof window.Companies.render !== 'function') return false;
    if (window.Companies.render._clFixed) return true;
    const orig = window.Companies.render;
    window.Companies.render = function() {
      const result = orig.apply(this, arguments);
      // After render, the old _cl_wrap is now stale (it was inside the old grid).
      // Remove it and clear flags so companieslist.decorate runs again.
      setTimeout(() => {
        const v = document.getElementById('view-companies');
        if (!v) return;
        const grid = v.querySelector('.company-grid');
        if (grid && grid.dataset._listShown === '1') {
          grid.dataset._listShown = '';
        }
        const wrap = v.querySelector('._cl_wrap');
        if (wrap) wrap.remove();
        if (typeof window.refreshCompaniesList === 'function') {
          try { window.refreshCompaniesList(); } catch (_) {}
        }
      }, 50);
      // 2026-05-08: was running tryForceRedecorate at both 600ms AND 1500ms
      // after every render — caused visible "page loaded 3 times" flicker.
      // The setInterval below is enough as a safety net.
      // setTimeout(tryForceRedecorate, 600);
      // setTimeout(tryForceRedecorate, 1500);
      return result;
    };
    window.Companies.render._clFixed = true;
    console.log('[companies-list-fix] Companies.render wrapped');
    return true;
  }

  function init() {
    if (!wrapCompaniesRender()) {
      setTimeout(init, 400);
      return;
    }
    // 2026-05-08: Safety net interval bumped from 2s → 5s and tied to view
    // active. tryForceRedecorate is already idempotent (only acts when
    // cards>0 && tbody empty), so the slower cadence is safe.
    setInterval(() => {
      const v = document.getElementById('view-companies');
      if (!v || !v.classList.contains('active')) return;
      tryForceRedecorate();
    }, 5000);
  }
  init();

  console.log('[companies-list-fix] installed — race condition guard for company list rendering');
})();
/* === END COMPANIES LIST FIX v1 === */
