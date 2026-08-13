/* Force the Stillingar nav button to stay visible.
 *
 * Some legacy patch sets `style="display:none"` on the
 * .vnav-btn[data-view="settings"] button at startup. That hides the only
 * entry point for owner-level settings (branding, taxes, employees,
 * receipts, audit log, etc.). This patch removes the inline style and
 * keeps watching in case it gets re-applied.
 */
(() => {
  if (window.__showSettingsInstalled) return;
  window.__showSettingsInstalled = true;

  function ensureVisible() {
    const btn = document.querySelector('.vnav-btn[data-view="settings"]');
    if (!btn) return false;
    if (btn.style.display === 'none' || /display\s*:\s*none/i.test(btn.getAttribute('style') || '')) {
      // Strip just the display rule; preserve any other inline styles.
      const cur = btn.getAttribute('style') || '';
      const cleaned = cur.replace(/display\s*:\s*none\s*;?/gi, '').trim();
      if (cleaned) btn.setAttribute('style', cleaned);
      else btn.removeAttribute('style');
    }
    return true;
  }

  function init() {
    ensureVisible();
    new MutationObserver((muts) => {
      for (const m of muts) {
        if (m.type === 'attributes' && m.target.matches?.('.vnav-btn[data-view="settings"]')) {
          ensureVisible();
        }
      }
    }).observe(document.body, { attributes: true, subtree: true, attributeFilter: ['style'] });
    let tries = 0;
    const t = setInterval(() => {
      ensureVisible();
      if (++tries > 20) clearInterval(t);
    }, 500);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  console.log('[show-settings-tab] installed');
})();
