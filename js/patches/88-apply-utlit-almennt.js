/* === APPLY ÚTLIT + ALMENNT v1 ===
 *
 * Applies AppSettings.utlit and AppSettings.almennt to the live app:
 *   • utlit.hidden_nav_views → hide named view buttons in the sidebar
 *   • utlit.compact_mode → adds .app-compact on <html> for tighter spacing
 *   • almennt.starting_view → overrides sala.js's default landing
 *
 * Re-runs on AppSettings.onChange so toggles take effect without reload.
 */
(() => {
  if (window.__applyUtlitAlmenntInstalled) return;
  window.__applyUtlitAlmenntInstalled = true;

  function applyHiddenNav(s) {
    const u = (s && s.utlit) || (window.AppSettings && window.AppSettings.path('utlit')) || {};
    const hidden = new Set(u.hidden_nav_views || []);
    document.querySelectorAll('.vnav-btn[data-view]').forEach(btn => {
      const v = btn.getAttribute('data-view');
      btn.style.display = hidden.has(v) ? 'none' : '';
    });
  }
  function applyCompact(s) {
    const u = (s && s.utlit) || (window.AppSettings && window.AppSettings.path('utlit')) || {};
    document.documentElement.classList.toggle('app-compact', !!u.compact_mode);
  }
  let _startingApplied = false;
  function applyStartingView(s) {
    // Apply the starting view (from Stillingar → Útlit) once on initial mount.
    // Honors 'sala' explicitly too — relying on sala.js's setSalaAsLanding
    // alone is fragile because other patches may render a different view first.
    if (_startingApplied) return;
    const a = (s && s.almennt) || (window.AppSettings && window.AppSettings.path('almennt')) || {};
    const want = a.starting_view || 'sala';
    // If the URL points at a specific view (e.g., deeplink), respect it.
    if (location.hash && /^#?view-/.test(location.hash)) { _startingApplied = true; return; }
    // If a view is already active AND it matches what we want, we're done.
    const activeView = document.querySelector('.view.active');
    if (activeView && activeView.id === 'view-' + want) { _startingApplied = true; return; }
    // If a different view is active, leave it alone (user may have clicked).
    if (activeView) { _startingApplied = true; return; }
    if (window.App && typeof window.App.switchView === 'function') {
      try { window.App.switchView(want); _startingApplied = true; } catch (e) { /* retry */ }
    }
  }

  // Inject one-time CSS for compact mode
  if (!document.getElementById('_uam-style')) {
    const s = document.createElement('style'); s.id = '_uam-style';
    s.textContent = `
      html.app-compact body { font-size: 13px; }
      html.app-compact .vnav-btn { padding: 6px 10px !important; }
      html.app-compact .pos-banner { padding: 10px 16px !important; min-height: auto !important; }
      html.app-compact .card, html.app-compact .modal-bd { padding: 12px !important; }
    `;
    document.head.appendChild(s);
  }

  function applyAll(s) {
    applyHiddenNav(s);
    applyCompact(s);
  }

  // Re-apply when settings change
  function hookSettings() {
    if (window.AppSettings && typeof window.AppSettings.onChange === 'function') {
      window.AppSettings.onChange(applyAll);
      // Try once immediately + after first hydration
      applyAll(window.AppSettings.get());
      return true;
    }
    return false;
  }
  if (!hookSettings()) {
    setTimeout(() => hookSettings() || setTimeout(hookSettings, 1500), 400);
  }

  // First-time apply on initial mount + once more shortly after settings load
  function initial() {
    applyAll();
    // Starting view applied with delay so sala.js's setSalaAsLanding has run first.
    setTimeout(() => applyStartingView(), 50);
    setTimeout(() => applyStartingView(), 600);
    // Re-apply hidden-nav after sidebar fully built (other patches may add buttons later)
    setTimeout(applyAll, 1500);
    setTimeout(applyAll, 3000);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initial);
  } else {
    initial();
  }

  console.log('[apply-utlit-almennt] installed');
})();
/* === END APPLY ÚTLIT + ALMENNT v1 === */
