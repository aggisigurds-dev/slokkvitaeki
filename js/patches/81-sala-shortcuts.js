/* === SALA SHORTCUTS v2 ===
 * Adds a "🧾 Bókhald" link next to the cart header's "+ Eigin" button so
 * the user can jump straight to Bókhalds yfirlit without rummaging through
 * the sidebar. The earlier v1 floated this button on the .pos-banner — that
 * stopped looking clean once banner_style = 'mynd' (custom PNG) was added,
 * so the button now lives in the cart toolbar area where it doesn't fight
 * with the banner artwork.
 */
(() => {
  if (window.__salaShortcutsInstalled) return;
  window.__salaShortcutsInstalled = true;

  function ensure() {
    // Remove the v1 banner-floating button if any older version left one in place.
    document.querySelectorAll('.pos-banner ._sala_shortcut_by').forEach(b => b.remove());

    const addEigin = document.getElementById('pos-add-service');
    if (!addEigin) return;
    const header = addEigin.parentElement;
    if (!header) return;
    if (header.querySelector('._sala_shortcut_by')) return;

    const btn = document.createElement('button');
    btn.className = '_sala_shortcut_by';
    btn.type = 'button';
    btn.innerHTML = '🧾 Bókhald';
    btn.title = 'Bókhalds yfirlit';
    btn.style.cssText = 'background:#f1f5f9;color:#334155;border:none;padding:4px 10px;border-radius:6px;font-size:11px;cursor:pointer;font-weight:600;margin-left:6px';
    btn.addEventListener('click', () => {
      if (window.App && App.switchView) App.switchView('bokhalds-yfirlit');
    });
    addEigin.insertAdjacentElement('afterend', btn);
  }

  ensure();
  document.addEventListener('view-shown', e => {
    if (e && e.detail && e.detail.name === 'sala') setTimeout(ensure, 100);
  });
  // Light retry chain for first paint
  setTimeout(ensure, 500);
  setTimeout(ensure, 1500);
  console.log('[sala-shortcuts v2] installed');
})();
/* === END SALA SHORTCUTS v2 === */
