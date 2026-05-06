/* === SALA TWEAKS v1 === */
/* Two small UI fixes for the Sala (POS) view:
 *   1. Clock in the banner ticks every 30s (was frozen — only updated on
 *      view-render which doesn't happen until something else triggers it).
 *   2. Product tiles' icons/images are bumped to 56x56 to match the visual
 *      weight of the Þjónusta tiles (which felt heavier even though both
 *      were 42x42, because product images felt smaller next to the bold
 *      service icons).
 */
(() => {
  if (window.__salaTweaksInstalled) return;
  window.__salaTweaksInstalled = true;

  // 1. Clock tick — find the HH:MM div inside .pos-banner and update it
  const HHMM_RE = /^\d{1,2}:\d{2}$/;
  function tickClock() {
    const banner = document.querySelector('.pos-banner');
    if (!banner) return;
    let target = null;
    banner.querySelectorAll('div').forEach((d) => {
      if (target) return;
      const t = (d.textContent || '').trim();
      if (HHMM_RE.test(t) && d.children.length === 0) target = d;
    });
    if (target) {
      target.textContent = new Date().toLocaleTimeString('is-IS', {hour: '2-digit', minute: '2-digit'});
    }
  }
  setInterval(tickClock, 30000);
  // Also tick on first appearance
  setTimeout(tickClock, 1000);

  // 2. Bigger product tiles — CSS override so we don't have to patch renderTile()
  if (!document.getElementById('_sala_tweaks_css')) {
    const css = document.createElement('style');
    css.id = '_sala_tweaks_css';
    css.textContent =
      // Bump product (not service) tile icons/images
      '.pos-prod img,' +
      '.pos-prod > div:first-child,' +
      '.pos-prod > div[style*="background"]:not([style*="border-radius:6px"]) {' +
      '  width: 56px !important; height: 56px !important;' +
      '}' +
      // Slightly larger product tile padding to keep proportions
      '.pos-prod { padding: 12px 8px !important; }';
    document.head.appendChild(css);
  }

  console.log('[sala-tweaks] installed');
})();
/* === END SALA TWEAKS v1 === */
