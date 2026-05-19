/* === COMPANIES OPEN-DETAIL LOADING FIX v1 ===
 *
 * User reported: "Fyrirtækjaþjónusta doesn't open for companies, just
 * loading". Reproduces when:
 *   1. Companies.list hasn't finished loading yet (race), OR
 *   2. The company id passed in isn't in Companies.list (data hole), OR
 *   3. DB.cache.units hasn't loaded (Companies.openDetail filters units
 *      by client name and references DB.cache.units — if it's undefined,
 *      the function throws and nothing renders).
 *
 * In all three cases the original `Companies.openDetail` (features.js:88)
 * bails silently with `return` and view-companies stays on whatever it
 * was previously — usually the "Hleður…" loading state.
 *
 * This patch wraps openDetail to:
 *   • Retry once via Companies.load() if list is empty
 *   • Render a clear error message if company still not found
 *   • Render a loading message + retry if DB.cache.units isn't ready
 *
 * Built 2026-05-19 after Aggi flagged Fyrirtækjaþjónusta open-stuck-loading.
 */
(() => {
  if (window.__companiesOpenLoadingFixInstalled) return;
  window.__companiesOpenLoadingFixInstalled = true;

  function install() {
    if (!window.Companies || typeof Companies.openDetail !== 'function') {
      setTimeout(install, 300);
      return;
    }
    if (Companies._openLoadingFixed) return;
    Companies._openLoadingFixed = true;

    const orig = Companies.openDetail;
    Companies.openDetail = function(id) {
      const numId = parseInt(id, 10) || id;
      const list = (this && this.list) || [];
      const c = list.find(x => x.id === numId);

      // Case 1: list empty — load and retry
      if ((!list || !list.length) && typeof Companies.load === 'function') {
        const main = document.getElementById('companies-main');
        if (main) main.innerHTML = '<div class="loading-state" style="padding:40px;text-align:center;color:#64748b">Sæki fyrirtækjalista…</div>';
        Promise.resolve(Companies.load()).then(() => {
          // Retry once after load. Use orig directly to avoid re-wrapping.
          orig.call(Companies, numId);
          // If unit cache also hasn't loaded, retry one more time
          if (!window.DB || !window.DB.cache || !window.DB.cache.units) {
            const tryUnits = (tries) => {
              if (tries <= 0) return;
              if (window.DB && window.DB.cache && window.DB.cache.units) {
                orig.call(Companies, numId);
              } else {
                setTimeout(() => tryUnits(tries - 1), 400);
              }
            };
            tryUnits(8);
          }
        }).catch(() => {
          if (main) main.innerHTML = '<div style="padding:40px;text-align:center;color:#dc2626">Gat ekki sótt fyrirtækjalista. Endurnýjaðu síðuna.</div>';
        });
        return;
      }

      // Case 2: company not in list — show error rather than blank loading
      if (!c) {
        const main = document.getElementById('companies-main');
        if (main) main.innerHTML =
          '<button class="btn btn-ghost btn-sm" onclick="App.switchView(\'arsskodun\')" style="margin-bottom:16px">‹ Til baka</button>' +
          '<div style="padding:40px;text-align:center;color:#64748b">' +
          '<div style="font-size:16px;font-weight:600;color:#0f172a;margin-bottom:6px">Fyrirtæki #' + numId + ' fannst ekki</div>' +
          '<div style="font-size:13px">Það er ekki í fyrirtækjalistanum. Hugsanlega var því eytt.</div>' +
          '</div>';
        return;
      }

      // Case 3: list has it but units cache missing — render anyway,
      // then retry once units arrive (so the units table fills in).
      if (!window.DB || !window.DB.cache || !window.DB.cache.units) {
        const main = document.getElementById('companies-main');
        if (main) main.innerHTML = '<div class="loading-state" style="padding:40px;text-align:center;color:#64748b">Sæki tæki…</div>';
        const tryRender = (tries) => {
          if (tries <= 0) return;
          if (window.DB && window.DB.cache && window.DB.cache.units) {
            return orig.call(Companies, numId);
          }
          setTimeout(() => tryRender(tries - 1), 400);
        };
        tryRender(10);
        return;
      }

      // Happy path
      return orig.apply(this, arguments);
    };

    console.log('[companies-open-loading-fix v1] Companies.openDetail wrapped');
  }

  install();
})();
/* === END COMPANIES OPEN-DETAIL LOADING FIX === */
