/* === REALTIME REFRESH — sync the open view when the registry changes v1 ===
 *
 * v9.js subscribes to Supabase realtime on `uttaeki` and, on any change,
 * refreshes DB.cache.units and then calls `App.refreshCurrentView()` — but
 * that function was never defined, so the live data updated silently and the
 * screen never re-rendered. This wires it up:
 *
 *   • Company detail open  → re-run Companies.openDetail(id) (re-renders the
 *     tæki table; patch 129 then recomputes Heildarkostnaður). So if a tæki's
 *     status/tegund changes (here or on another device), the cost updates at once.
 *   • Vertíð view active    → Vertid.reload() (re-fetches jobs + units + bill).
 *
 * Debounced so a burst of row changes coalesces into one re-render, and it
 * skips re-rendering while the user is typing in a field (so notes don't get
 * wiped mid-keystroke).
 */
(() => {
  if (window.__rtRefreshInstalled) return;
  window.__rtRefreshInstalled = true;

  let _t = 0;

  function isTyping() {
    const a = document.activeElement;
    if (!a) return false;
    const tag = (a.tagName || '').toLowerCase();
    return tag === 'input' || tag === 'textarea' || tag === 'select' || a.isContentEditable;
  }

  function openCompanyId() {
    const cm = document.getElementById('companies-main');
    if (!cm) return null;
    const eb = cm.querySelector('button[onclick*="Companies.openEdit"]');
    if (!eb) return null;
    const m = eb.getAttribute('onclick').match(/openEdit\((\d+)/);
    return m ? +m[1] : null;
  }

  function doRefresh() {
    try {
      // Don't yank the DOM out from under an active text field.
      if (isTyping()) { _t = setTimeout(doRefresh, 1200); return; }

      // 1. Vertíð workbench active → reload it.
      const vt = document.getElementById('view-vertid');
      if (vt && (vt.classList.contains('active') || vt.style.display === 'block') &&
          window.Vertid && typeof Vertid.reload === 'function') {
        Vertid.reload();
        return;
      }

      // 2. Company detail open → re-render (recomputes the cost via patch 129).
      const cv = document.getElementById('view-companies');
      if (cv && (cv.classList.contains('active') || cv.style.display !== 'none')) {
        const id = openCompanyId();
        if (id && window.Companies && typeof Companies.openDetail === 'function') {
          Companies.openDetail(id);
          return;
        }
      }
    } catch (e) { console.warn('[rt-refresh]', e); }
  }

  // Define the hook v9.js already calls on every uttaeki realtime change.
  window.App = window.App || {};
  const _prev = window.App.refreshCurrentView;
  window.App.refreshCurrentView = function () {
    if (typeof _prev === 'function') { try { _prev.apply(this, arguments); } catch (_) {} }
    clearTimeout(_t);
    _t = setTimeout(doRefresh, 500);
  };

  console.log('[patch-211] realtime refreshCurrentView wired');
})();
/* === END REALTIME REFRESH === */
