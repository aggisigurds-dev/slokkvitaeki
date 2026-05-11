/* Manual "🔄 Endurnýja" button in Fyrirtækjaþjónusta header.
 *
 * Tied to patch 127 v2 which now blocks automatic re-renders while the
 * user is on a detail page. This gives the user a one-click way to pull
 * the latest data from Supabase when they're ready (e.g. another machine
 * added a unit and they want to see it).
 *
 * Hides itself when no fresh data is pending; lights up green when there
 * IS pending data so the user notices.
 */
(() => {
  if (window.__companiesRefreshBtnInstalled) return;
  window.__companiesRefreshBtnInstalled = true;

  let _pendingChanges = 0;

  function getHeader() {
    const main = document.getElementById('companies-main');
    if (!main) return null;
    // First-child header div usually has the "Fyrirtæki" title + "+ Nýtt" button.
    return main.querySelector('div[style*="justify-content:space-between"]') || main.firstElementChild;
  }

  function ensureButton() {
    const main = document.getElementById('companies-main');
    if (!main) return;
    if (main.querySelector('#_cr_refresh_btn')) return;
    const header = getHeader();
    if (!header) return;
    const btn = document.createElement('button');
    btn.id = '_cr_refresh_btn';
    btn.className = 'btn btn-outline btn-sm';
    btn.style.cssText = 'margin-right:6px;display:none';
    btn.title = 'Sækja nýjustu gögn úr gagnagrunni';
    btn.textContent = '🔄 Endurnýja';
    btn.onclick = () => {
      _pendingChanges = 0;
      updateButton();
      if (window.__companiesEditGuard && window.__companiesEditGuard.forceRefresh) {
        window.__companiesEditGuard.forceRefresh();
      } else if (window.Companies && Companies.load) {
        Companies.load();
      }
    };
    // Insert before existing "+ Nýtt fyrirtæki" button if there is one.
    const addBtn = header.querySelector('button.btn-primary');
    if (addBtn && addBtn.parentNode === header) {
      header.insertBefore(btn, addBtn);
    } else {
      header.appendChild(btn);
    }
  }

  function updateButton() {
    const btn = document.getElementById('_cr_refresh_btn');
    if (!btn) return;
    if (_pendingChanges > 0) {
      btn.style.display = '';
      btn.style.background = '#dcfce7';
      btn.style.color = '#166534';
      btn.style.borderColor = '#86efac';
      btn.textContent = '🔄 Endurnýja (' + _pendingChanges + ' nýtt)';
    } else {
      btn.style.display = '';
      btn.style.background = '';
      btn.style.color = '';
      btn.style.borderColor = '';
      btn.textContent = '🔄 Endurnýja';
    }
  }

  // Hook the realtime channels so we can count pending changes.
  function attachRealtime() {
    const sb = window.DB && window.DB.sb;
    if (!sb || !sb.channel) { setTimeout(attachRealtime, 800); return; }
    ['uttaeki','fyrirtaeki','verkbeidnir'].forEach(tbl => {
      try {
        sb.channel('rt_cr_'+tbl)
          .on('postgres_changes', { event:'*', schema:'public', table:tbl }, () => {
            if (window.__companiesEditGuard && window.__companiesEditGuard.blocked && window.__companiesEditGuard.blocked()) {
              _pendingChanges++;
              updateButton();
            }
          }).subscribe();
      } catch(e){}
    });
  }
  attachRealtime();

  // Reset pending count when user returns to grid (auto-refresh kicks in).
  function watchGridReturn() {
    const main = document.getElementById('companies-main');
    if (!main) { setTimeout(watchGridReturn, 800); return; }
    new MutationObserver(() => {
      // Inject button after every render.
      ensureButton();
      // If grid is showing AND we have a fresh render → pending counter has
      // already been fulfilled by the auto-flush.
      if (main.querySelector('.company-grid')) {
        if (_pendingChanges) {
          _pendingChanges = 0;
          updateButton();
        }
      }
    }).observe(main, { childList: true, subtree: true });
    ensureButton();
  }
  watchGridReturn();

  console.log('[companies-refresh-btn] installed');
})();
