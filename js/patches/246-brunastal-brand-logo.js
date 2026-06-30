/* === BRUNASTAL BRAND LOGO v1 ===
 * Ensures the top-left sidebar logo is the Design's gradient flame badge
 * (yellow → orange → red) wherever the brunastal preset is active.
 *
 * The earlier `newfeatures.js → patch()` MutationObserver kept rewriting
 * `.brand-logo` to a different SVG; that file is now guarded to skip when
 * our `#sbfl` gradient is present. This patch is the second guard — if
 * anything strips the SVG (e.g. a settings reload or another late patch),
 * we put the canonical flame mark back.
 *
 * Pure visual: only touches the markup INSIDE `.brand-logo`, leaves
 * `.brand-text` (name + subtitle) alone.
 */
(() => {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (window.__bstalBrandLogoInstalled) return;
  window.__bstalBrandLogoInstalled = true;

  const FLAME_SVG =
    '<svg viewBox="0 0 36 48" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">' +
      '<defs>' +
        '<linearGradient id="sbfl" x1="0" y1="0" x2="0" y2="1">' +
          '<stop offset="0" stop-color="#ffd24a"/>' +
          '<stop offset=".4" stop-color="#ff7a1a"/>' +
          '<stop offset="1" stop-color="#e5231f"/>' +
        '</linearGradient>' +
      '</defs>' +
      '<path d="M18 3c1.6 6 8 8 8 17a8 8 0 0 1-16 0c0-2 .6-3.4 1.7-5 .3 3.2 2.4 4.2 3.2 3.2 1.3-1.6-1.6-5 3.1-15.4z" fill="url(#sbfl)"/>' +
    '</svg>';

  function activeBrunastal() {
    return document.documentElement.getAttribute('data-thm-preset') === 'brunastal';
  }

  function ensure() {
    if (!activeBrunastal()) return;
    const logo = document.querySelector('.brand-logo');
    if (!logo) return;
    // Already the spec mark?
    if (logo.querySelector('#sbfl')) return;
    logo.innerHTML = FLAME_SVG;
    logo.dataset.v6 = '1'; // signal to newfeatures.js
    logo.dataset.bstalLogo = '1';
  }

  function ensureNameSub() {
    if (!activeBrunastal()) return;
    const name = document.querySelector('.brand-name');
    const sub = document.querySelector('.brand-sub');
    if (name && !name.dataset.bannerCustom) {
      // Only auto-correct if it's still the legacy "Slökkvitæki ehf"
      const t = (name.textContent || '').trim();
      if (t === 'Slökkvitæki ehf') name.textContent = 'Slökkvitæki';
    }
    if (sub && !sub.dataset.bannerCustom) {
      const t = (sub.textContent || '').trim();
      if (t === 'Brunakerfi') sub.textContent = 'Slökkvitækjaþjónusta';
    }
  }

  function tick() {
    ensure();
    ensureNameSub();
  }

  function install() {
    tick();
    // Re-assert whenever the topbar / brand area changes (newfeatures.js's
    // body-wide MO is the main offender).
    const root = document.querySelector('.topbar') || document.body;
    if (root) {
      const obs = new MutationObserver(() => {
        // De-bounce by next-frame; avoids feedback loops with newfeatures.js.
        requestAnimationFrame(tick);
      });
      obs.observe(root, { childList: true, subtree: true, characterData: true });
    }
    // Also re-assert on theme switches.
    const htmlObs = new MutationObserver(tick);
    htmlObs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-thm-preset'] });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', install, { once: true });
  } else {
    install();
  }
})();
/* === END BRUNASTAL BRAND LOGO === */
