/* === SWITCHVIEW DISPATCH v1 === */
/* Verkdagbok and Vidskiptavinir bind their own click interceptors on the
 * sidebar nav buttons instead of going through App.switchView, which means
 * any code that programmatically calls App.switchView('vidskiptavinir')
 * leaves the view stuck on its loading state.
 *
 * This patch wraps App.switchView so that after it fires it (a) dispatches
 * a 'view-shown' CustomEvent and (b) directly invokes the view's own
 * renderer when one is exposed on the window. Patch 02 already hooks
 * Vidskiptavinir; this fills the gap for Verkdagbok and any future view.
 */
(() => {
  if (typeof window === 'undefined') return;
  if (window.__switchViewDispatchInstalled) return;
  window.__switchViewDispatchInstalled = true;

  const VIEW_RENDERERS = {
    verkdagbok: () => {
      if (window.Verkdagbok && typeof Verkdagbok.refresh === 'function') {
        Verkdagbok.refresh();
      }
    },
    vidskiptavinir: () => {
      if (window.Vidskiptavinir && typeof Vidskiptavinir.render === 'function') {
        Vidskiptavinir.render();
      }
    },
    'bokhalds-yfirlit': () => {
      if (window.BokhaldsYfirlit && typeof BokhaldsYfirlit.render === 'function') {
        BokhaldsYfirlit.render();
      }
    }
  };

  function wrap() {
    if (!window.App || typeof App.switchView !== 'function') {
      setTimeout(wrap, 200);
      return;
    }
    if (App.switchView.__dispatchHook) return;
    const orig = App.switchView.bind(App);
    App.switchView = function (name) {
      const ret = orig(name);
      try {
        if (VIEW_RENDERERS[name]) {
          // Defer slightly to let display swap settle first
          setTimeout(VIEW_RENDERERS[name], 50);
        }
        document.dispatchEvent(new CustomEvent('view-shown', { detail: { name } }));
      } catch (e) {
        console.warn('[switchview-dispatch]', e);
      }
      return ret;
    };
    App.switchView.__dispatchHook = true;
    console.log('[switchview-dispatch] installed');
  }
  wrap();
})();
/* === END SWITCHVIEW DISPATCH === */
