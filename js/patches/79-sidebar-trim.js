/* === SIDEBAR TRIM v1 === */
/* Hides specific nav items the user doesn't use, so the sidebar isn't
 * cluttered. Functionality stays intact (the patches that own those features
 * still load), only the navigation entry is hidden.
 *
 * Items hidden: Kort, Áfyllingar, Ferðaáætlun, Þjónustuáætlun, Gæðakerfi,
 * Pantanir, Tímar, Skoðun.
 *
 * Implementation: a MutationObserver watches the sidebar; whenever a nav
 * button appears with matching label text, it's hidden via display:none.
 * Survives patches that inject buttons asynchronously.
 */
(() => {
  if (window.__sidebarTrimInstalled) return;
  window.__sidebarTrimInstalled = true;

  // Match buttons by their visible label. Trimmed + case-sensitive (Icelandic accents).
  const HIDE = new Set([
    'Kort',
    'Áfyllingar',
    'Ferðaáætlun',
    'Þjónustuáætlun',
    'Gæðakerfi',
    'Pantanir',
    'Tímar',
    'Skoðun'
  ]);

  // Strip the leading emoji + whitespace so "♻️ Áfyllingar" matches the
  // plain "Áfyllingar" in the HIDE set. The previous exact-match logic
  // silently no-op'd on every emoji-prefixed button label.
  function stripLeadingEmoji(s) {
    return String(s || '')
      .replace(/^[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F000}-\u{1F2FF}️‍\s]+/u, '')
      .trim();
  }

  function trim(root) {
    const nav = (root && root.querySelector ? root.querySelector('.view-nav, .sidebar') : null)
             || document.querySelector('.view-nav, .sidebar');
    if (!nav) return;
    nav.querySelectorAll('button, a').forEach(el => {
      if (el.dataset._sbtChecked) return;
      // Get the visible label — pick the last span (handles "[svg] [span]label")
      // or the trimmed text content. Then strip any leading emoji prefix.
      const span = el.querySelector('span');
      const rawLabel = (span ? span.textContent : el.textContent || '').trim();
      const label = stripLeadingEmoji(rawLabel);
      if (HIDE.has(label) || HIDE.has(rawLabel)) {
        el.style.display = 'none';
        // Also hide any preceding section divider/label that becomes orphaned
        // (best-effort; safer than removing because other patches may rely on it)
      }
      el.dataset._sbtChecked = '1';
    });
  }

  function start() {
    const nav = document.querySelector('.view-nav, .sidebar');
    if (!nav) { setTimeout(start, 300); return; }
    trim(document);
    new MutationObserver(() => trim(document)).observe(nav, { childList: true, subtree: true });
    // Also re-check when other patches inject (they may use document body root)
    new MutationObserver(() => trim(document)).observe(document.body, { childList: true, subtree: false });
    console.log('[sidebar-trim] installed');
  }
  start();
})();
/* === END SIDEBAR TRIM v1 === */
