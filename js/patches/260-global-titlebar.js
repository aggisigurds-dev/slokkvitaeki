/* === GLOBAL TITLE BAR (Brunastál) v1 ===
 *
 * Makes EVERY content page look like it belongs to the same site: prepends the
 * dark metallic "title bar" (the same one Hreyfingarlisti / ÞjónustuVerkstæði /
 * Kröfu yfirlit hand-build) to the top of each view, so title-less pages (e.g.
 * Þjónustutæki, which jumped straight from the banner to a toolbar) get a
 * consistent header — and pages that already have a plain <h1> get it wrapped
 * into the bar instead of two competing titles.
 *
 * Design:
 *  • Brunastál preset ONLY (other themes untouched — data-thm-preset guard).
 *  • Non-destructive: the bar is prepended to the VIEW element (a sibling above
 *    the page's own main-panel), so a page re-rendering its main-panel's
 *    innerHTML never wipes it. A debounced MutationObserver re-applies after
 *    re-renders and view switches.
 *  • Title text is read from the ACTIVE sidebar nav item (always accurate),
 *    trailing badge counts stripped. If the page has its own leading <h1> whose
 *    text matches, that <h1> is hidden to avoid a duplicate title.
 *  • Pages that already ship their own dark bar are skipped (SKIP set).
 */
(() => {
  if (window.__ghTitlebarInstalled) return;
  window.__ghTitlebarInstalled = true;

  const BAR_ATTR = 'data-ghbar';
  // Views that already hand-build the identical bar — don't double it.
  const SKIP = new Set([
    'view-hreyfingarlisti', 'view-thjonustu-verkstaedi', 'view-krofu-yfirlit',
    'view-utlit',            // Útlit control board owns its layout
    'view-bilstjori',        // full-screen driver overlay
  ]);
  // Nice per-view icon; falls back to any emoji already in the title, else 📄.
  const ICONS = {
    'view-field': '🧯', 'view-counter': '🧾', 'view-workshop': '🔧',
    'view-arsskodun': '🏢', 'view-companies': '🏢', 'view-allir-vidsk': '👥',
    'view-income': '💰', 'view-bokhalds-yfirlit': '📊', 'view-vorur': '📦',
    'view-sala': '🛒', 'view-mottaka': '📥', 'view-vertid': '🗓️',
    'view-rekstrarfelog': '🏢', 'view-brunakerfi': '🚨', 'view-verkbord': '🗂️',
  };

  function isBrunastal() { return document.documentElement.getAttribute('data-thm-preset') === 'brunastal'; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c])); }

  function activeView() {
    let v = document.querySelector('[id^="view-"].active');
    if (v && v.offsetParent !== null) return v;
    const all = Array.from(document.querySelectorAll('[id^="view-"]'));
    return all.find(x => x.offsetParent !== null && getComputedStyle(x).display !== 'none') || null;
  }
  function navTitle() {
    const b = document.querySelector('.vnav-btn.active');
    if (!b) return '';
    // Clone, drop any badge element, read text, strip trailing count.
    let t = (b.textContent || '').replace(/\s+/g, ' ').trim();
    t = t.replace(/\s*\d{1,6}\s*$/, '').trim();   // "Tekjur176" / "Lánstæki 12" → drop count
    return t;
  }
  function leadingEmoji(s) {
    const m = String(s || '').match(/^\s*(\p{Extended_Pictographic}(?:️)?)/u);
    return m ? m[1] : '';
  }
  function stripEmoji(s) { return String(s || '').replace(/\p{Extended_Pictographic}️?/gu, '').replace(/\s+/g, ' ').trim(); }

  function buildBar(icon, title, sub) {
    const bar = document.createElement('div');
    bar.setAttribute(BAR_ATTR, '1');
    bar.style.cssText = 'background:linear-gradient(180deg,#3a3d45,#2a2d33 45%,#1b1d22);border-radius:14px;padding:9px 15px;display:flex;align-items:center;gap:11px;box-shadow:0 12px 28px -18px rgba(0,0,0,.65);margin:0 0 13px;font-family:\'Space Grotesk\',system-ui,sans-serif';
    bar.innerHTML =
      '<div style="width:38px;height:38px;border-radius:10px;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:18px;background:linear-gradient(180deg,#4a4e57,#2b2e34);box-shadow:inset 0 1.5px 0 rgba(255,255,255,.18),inset 0 -3px 6px rgba(0,0,0,.4)">' + esc(icon) + '</div>' +
      '<div style="min-width:0">' +
        '<h1 style="margin:0;font-family:\'Space Grotesk\',system-ui,sans-serif;font-size:20px;font-weight:700;color:#fff;letter-spacing:-.01em;line-height:1.15">' + esc(title) + '</h1>' +
        (sub ? '<div style="font-size:12px;color:rgba(255,255,255,.6);margin-top:1px">' + esc(sub) + '</div>' : '') +
      '</div>';
    return bar;
  }

  // Try to find the page's own leading title <h1> (to hide as a duplicate).
  function ownHeading(view, title) {
    const bar = view.querySelector('[' + BAR_ATTR + ']');
    const h1s = Array.from(view.querySelectorAll('h1'));
    const key = stripEmoji(title).toLowerCase();
    for (const h of h1s) {
      if (bar && bar.contains(h)) continue;
      const ht = stripEmoji(h.textContent).toLowerCase();
      if (!ht) continue;
      if (ht === key || ht.indexOf(key) === 0 || key.indexOf(ht) === 0) return h;
    }
    return null;
  }

  function apply() {
    const view = activeView();
    if (!view || SKIP.has(view.id)) return;
    if (!isBrunastal()) {                     // theme changed away → tear down
      const old = view.querySelector(':scope > [' + BAR_ATTR + ']');
      if (old) old.remove();
      view.querySelectorAll('[data-ghhide]').forEach(h => { h.style.display = ''; h.removeAttribute('data-ghhide'); });
      return;
    }
    const title = navTitle();
    if (!title) return;

    // Hide the page's own duplicate title (survives re-renders via re-apply).
    const own = ownHeading(view, title);
    const icon = ICONS[view.id] || leadingEmoji(title) || (own ? leadingEmoji(own.textContent) : '') || '📄';

    let bar = view.querySelector(':scope > [' + BAR_ATTR + ']');
    if (!bar) {
      bar = buildBar(icon, stripEmoji(title) || title, '');
      view.insertBefore(bar, view.firstChild);
    } else {
      // keep title fresh if the nav label changed
      const h1 = bar.querySelector('h1');
      if (h1 && h1.textContent !== (stripEmoji(title) || title)) h1.textContent = stripEmoji(title) || title;
    }
    if (own && own.style.display !== 'none') { own.setAttribute('data-ghhide', '1'); own.style.display = 'none'; }
  }

  // ── wiring: view-switch hook + observer + boot ────────────────────────────
  const debounced = (() => { let t = 0; return () => { clearTimeout(t); t = setTimeout(apply, 60); }; })();

  function hookSwitch() {
    if (!window.App || window.App._ghSwitchHooked || typeof App.switchView !== 'function') return false;
    const orig = App.switchView;
    App.switchView = function () { const r = orig.apply(this, arguments); debounced(); return r; };
    App._ghSwitchHooked = true;
    return true;
  }
  (function waitHook(n) { if (hookSwitch()) return; if (n > 0) setTimeout(() => waitHook(n - 1), 400); })(30);

  // Re-apply when any view's content changes (pages re-render their panels).
  const mo = new MutationObserver(debounced);
  function observe() {
    // Watch content re-renders (childList) + view-activation / theme switches
    // (class on view divs, data-thm-preset on <html>). No 'style' — too noisy.
    mo.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'data-thm-preset'] });
    try { mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-thm-preset'] }); } catch (_) {}
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', observe);
  else observe();

  document.addEventListener('click', e => { if (e.target.closest('.vnav-btn')) debounced(); }, true);
  setTimeout(apply, 1200);
  setTimeout(apply, 3000);

  window.GlobalTitlebar = { apply };
  console.log('[patch-252] Global title bar (Brunastál) installed');
})();
/* === END GLOBAL TITLE BAR === */
