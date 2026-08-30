/* === VIEWPORT = BRUNAHÓLF PINCH (336) =======================================
 *
 * Agnar 2026-08-30: Brunahólf Fjármála-yfirlit fylgir pinch/hard-zoom;
 * Slökkvitæki stóð kyrr. Google's #1 was the real bug: numeric width=390,
 * maximum-scale=1, user-scalable=no, plus CSS zoom on html.
 *
 * Þessi pappi (síðastur) læsir UPP:
 *   • viewport alltaf width=device-width, user-scalable=yes, engin
 *     maximum-scale=1, engin width=390
 *   • hreinsar html/body/#app/#app-zoom-root { zoom }
 *   • overflow-x:auto á html/body svo visual viewport geti pannað
 *
 * 333 −/+ stýrir initial-scale (sama og pinch). 336 varðveitir það.
 * 153/187 er ÓSNERT. Kröfuyfirlit-raðir (798 / 335) eru ÓSNERTAR.
 * ========================================================================== */
(() => {
  if (window.__viewportBrunaholf336) return;
  window.__viewportBrunaholf336 = true;

  const STYLE_ID = 'viewport-brunaholf-336';
  const HUB_VP = 'width=device-width, initial-scale=1, user-scalable=yes, viewport-fit=cover';

  function locked(content) {
    const c = String(content || '').toLowerCase().replace(/\s+/g, '');
    if (!c) return true;
    if (c.indexOf('user-scalable=no') >= 0 || c.indexOf('user-scalable=0') >= 0) return true;
    if (/maximum-scale=1(?:\.0+)?(?:,|$)/.test(c)) return true;
    if (/width=\d+/.test(c)) return true;
    return false;
  }

  function desired() {
    let scale = 1;
    try {
      if (window.AppPageZoom && typeof window.AppPageZoom.get === 'function') {
        const z = +window.AppPageZoom.get();
        if (isFinite(z) && z > 1) scale = z;
      }
    } catch (_) {}
    if (scale === 1) return HUB_VP;
    return 'width=device-width, initial-scale=' + scale + ', user-scalable=yes, viewport-fit=cover';
  }

  function vpEl() {
    let vp = document.querySelector('meta[name="viewport"]');
    if (!vp) {
      vp = document.createElement('meta');
      vp.setAttribute('name', 'viewport');
      (document.head || document.documentElement).appendChild(vp);
    }
    return vp;
  }

  function sync() {
    try {
      const vp = vpEl();
      const cur = vp.getAttribute('content') || '';
      const next = desired();
      if (locked(cur) || cur !== next) vp.setAttribute('content', next);
    } catch (_) {}
  }

  function clearCssZoom() {
    const ids = ['app', 'app-zoom-root'];
    const nodes = [document.documentElement];
    if (document.body) nodes.push(document.body);
    ids.forEach(id => {
      const el = document.getElementById(id);
      if (el) nodes.push(el);
    });
    nodes.forEach(n => {
      try {
        if (n.style && n.style.zoom) {
          n.style.zoom = '';
          n.style.removeProperty('zoom');
        }
      } catch (_) {}
    });
  }

  function mountCss() {
    let s = document.getElementById(STYLE_ID);
    if (!s) {
      s = document.createElement('style');
      s.id = STYLE_ID;
      (document.head || document.documentElement).appendChild(s);
    }
    s.textContent = [
      'html,body{overflow-x:auto!important;touch-action:pan-x pan-y pinch-zoom}',
      'html[data-viewmode="mobile"],html[data-viewmode="mobile"] body{overflow-x:auto!important}',
      'body.appmode,body.appmode html{overflow-x:auto!important}'
    ].join('\n');
    if (s.parentNode && s.parentNode.lastElementChild !== s) s.parentNode.appendChild(s);
  }

  function apply() {
    mountCss();
    clearCssZoom();
    sync();
  }

  let _lock = false;
  try {
    const mo = new MutationObserver(() => {
      if (_lock) return;
      _lock = true;
      try { sync(); } finally { _lock = false; }
    });
    const start = () => {
      const vp = document.querySelector('meta[name="viewport"]');
      if (vp) mo.observe(vp, { attributes: true, attributeFilter: ['content'] });
      else mo.observe(document.head || document.documentElement, { childList: true, subtree: true });
    };
    if (document.head) start();
    else document.addEventListener('DOMContentLoaded', start, { once: true });
  } catch (_) {}

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', apply);
  else apply();
  [0, 60, 400, 1200, 3000].forEach(ms => setTimeout(apply, ms));
  document.addEventListener('slokk-viewmode', () => setTimeout(apply, 0));

  window.SlokkHubViewport = HUB_VP;
  window.SlokkViewportUnlock = { sync, locked, desired, version: '336' };
  console.log('[patch-336] viewport = Brunahólf pinch');
})();
/* === END VIEWPORT BRUNAHÓLF === */
