/* === COMPANIES OPEN-DETAIL LOADING FIX v2 ===
 *
 * User reported: "Fyrirtækjaþjónusta doesn't open for companies, just
 * loading … sometime it opens but in most cases not". An intermittent
 * race condition. Causes:
 *   1. Companies.list hasn't finished loading yet (race), OR
 *   2. The company id passed in isn't in Companies.list (data hole), OR
 *   3. DB.cache.units hasn't loaded (Companies.openDetail throws when
 *      filtering units), OR
 *   4. Company has null/empty `nafn` (c.nafn.slice(0,2) throws — patch
 *      19 enrichment doesn't fill it back in), OR
 *   5. Patch 24/25's wrapper chain (now frozen by patch 163) returned a
 *      thrown error from an inner wrapper.
 *
 * In all these cases the original `Companies.openDetail` (features.js:88)
 * either bails silently with `return` or throws mid-render — and
 * view-companies stays on whatever it was previously, usually "Hleður…".
 *
 * This patch wraps openDetail to:
 *   • Retry once via Companies.load() if list is empty
 *   • Render a clear error message if company still not found
 *   • Render a loading message + retry if DB.cache.units isn't ready
 *   • Catch ANY throw from the inner chain and render a recoverable
 *     error UI rather than leaving the user on a blank Hleður screen
 *   • Force display:block + active class on view-companies even if a
 *     prior switchView left inline display:none
 *
 * v2 (2026-05-19): added throw-catch + active-class force + nafn guard
 * after Aggi reported it still mostly didn't open.
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

    // Force view-companies to be visible. _openCompanySafe only adds the
    // 'active' class — if a previous switchView (e.g. patch 153 → arsskodun)
    // left `style.display = 'none'` inline, that wins on browsers that
    // don't honor the !important CSS rule cleanly under all conditions.
    function ensureVisible() {
      const v = document.getElementById('view-companies');
      if (!v) return;
      v.style.display = '';   // clear inline so CSS .active wins
      v.classList.add('active');
    }

    function showError(numId, message, details) {
      const main = document.getElementById('companies-main');
      if (!main) return;
      main.innerHTML =
        '<button class="btn btn-ghost btn-sm" onclick="App.switchView(\'arsskodun\')" style="margin-bottom:16px">‹ Til baka í Fyrirtæki í Þjónustu</button>' +
        '<div style="padding:36px;text-align:center;color:#64748b;background:#fff;border:1px solid #e2e8f0;border-radius:12px;max-width:540px;margin:24px auto">' +
        '<div style="font-size:30px;margin-bottom:10px">⚠</div>' +
        '<div style="font-size:16px;font-weight:600;color:#0f172a;margin-bottom:6px">' + esc(message) + '</div>' +
        (details ? '<div style="font-size:12.5px;color:#94a3b8;margin-bottom:14px">' + esc(details) + '</div>' : '') +
        '<button onclick="window._openCompanySafe(' + numId + ')" style="padding:8px 18px;background:#0f172a;color:#fff;border:none;border-radius:8px;cursor:pointer;font:inherit;font-size:13px;font-weight:600">🔄 Reyna aftur</button>' +
        '</div>';
    }
    function esc(s) {
      return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    }

    const orig = Companies.openDetail;
    Companies.openDetail = function(id) {
      ensureVisible();

      const numId = parseInt(id, 10) || id;
      const list = (this && this.list) || (window.Companies && window.Companies.list) || [];
      const c = list.find(x => x.id === numId);

      // Case 1: list empty — load and retry
      if ((!list || !list.length) && typeof Companies.load === 'function') {
        const main = document.getElementById('companies-main');
        if (main) main.innerHTML = '<div class="loading-state" style="padding:40px;text-align:center;color:#64748b">Sæki fyrirtækjalista…</div>';
        Promise.resolve(Companies.load()).then(() => {
          // Retry once after load. Use orig directly to avoid re-wrapping.
          safeCallOrig(numId);
          // If unit cache also hasn't loaded, retry one more time
          if (!window.DB || !window.DB.cache || !window.DB.cache.units) {
            const tryUnits = (tries) => {
              if (tries <= 0) return;
              if (window.DB && window.DB.cache && window.DB.cache.units) {
                safeCallOrig(numId);
              } else {
                setTimeout(() => tryUnits(tries - 1), 400);
              }
            };
            tryUnits(8);
          }
        }).catch(() => {
          showError(numId, 'Gat ekki sótt fyrirtækjalista', 'Endurnýjaðu síðuna eða smelltu hér til að reyna aftur.');
        });
        return;
      }

      // Case 2: company not in list — try a reload before giving up
      if (!c) {
        const main = document.getElementById('companies-main');
        if (main) main.innerHTML = '<div class="loading-state" style="padding:40px;text-align:center;color:#64748b">Endurhleð fyrirtækjalista…</div>';
        if (typeof Companies.load === 'function') {
          Promise.resolve(Companies.load()).then(() => {
            const stillList = (window.Companies && window.Companies.list) || [];
            const found = stillList.find(x => x.id === numId);
            if (found) safeCallOrig(numId);
            else showError(numId, 'Fyrirtæki #' + numId + ' fannst ekki', 'Það er ekki í fyrirtækjalistanum. Hugsanlega var því eytt.');
          }).catch(() => {
            showError(numId, 'Fyrirtæki #' + numId + ' fannst ekki', 'Það er ekki í fyrirtækjalistanum.');
          });
        } else {
          showError(numId, 'Fyrirtæki #' + numId + ' fannst ekki');
        }
        return;
      }

      // Case 3: list has it but units cache missing — poll then render
      if (!window.DB || !window.DB.cache || !window.DB.cache.units) {
        const main = document.getElementById('companies-main');
        if (main) main.innerHTML = '<div class="loading-state" style="padding:40px;text-align:center;color:#64748b">Sæki tæki…</div>';
        const tryRender = (tries) => {
          if (tries <= 0) {
            showError(numId, 'Náði ekki að sækja tæki', 'Tækjagagnagrunnurinn svaraði ekki.');
            return;
          }
          if (window.DB && window.DB.cache && window.DB.cache.units) {
            return safeCallOrig(numId);
          }
          setTimeout(() => tryRender(tries - 1), 400);
        };
        tryRender(10);
        return;
      }

      // Case 4: c.nafn null/empty — orig will throw on c.nafn.slice(0,2).
      // Patch the company in place so render succeeds.
      if (!c.nafn || typeof c.nafn !== 'string') {
        c.nafn = c.nafn || ('Fyrirtæki #' + numId);
      }

      // Happy path — but wrap in try/catch so a thrown error doesn't
      // leave the user staring at a blank "Hleður…" screen.
      let result;
      try {
        result = orig.apply(this, arguments);
      } catch (e) {
        console.error('[companies-open-loading-fix] openDetail threw:', e);
        showError(numId, 'Villa við að birta fyrirtæki', (e && e.message) || String(e));
        return;
      }

      // 2026-05-19 (v2): Post-flight check. User reported "companies
      // rarely open in fyrirtækjaþjónustu — opnast en festist á Hleður".
      // Sometimes orig completes without throwing but ALSO without
      // rendering the detail (e.g. some inner wrapper bypassed the
      // innerHTML write, or the chain returned early). Verify the
      // page actually got replaced; if still on loading state, retry.
      //
      // Also rewire "Til baka" to return to Fyrirtæki í Þjónustu (arsskodun)
      // — the only way to reach this view now is via the arsskodun modal
      // "Opna fyrirtæki" button or the Customer Detail "Opna fyrirtækisíðu"
      // button. Both originate from arsskodun-context. The default inline
      // onclick="Companies.render()" tries to show the grid, which patch 127
      // blocks while on detail → page appears stuck.
      function rewireBackBtn() {
        const main = document.getElementById('companies-main');
        if (!main) return;
        const backBtn = main.querySelector('button[onclick*="Companies.render"]');
        if (backBtn && !backBtn.dataset._cmpRewired) {
          backBtn.dataset._cmpRewired = '1';
          backBtn.setAttribute('onclick', "App.switchView('arsskodun')");
        }
      }
      setTimeout(() => {
        const main = document.getElementById('companies-main');
        if (!main) return;
        const stillLoading = main.innerHTML.includes('class="loading-state"');
        const hasDetailMarker = main.querySelector(
          'button[onclick*="Companies.openEdit"], ' +
          'button[onclick*="App.switchView"], ' +
          'button[onclick*="Companies.render"], ' +
          'button[onclick*="Companies.addUnit"]'
        );
        if (stillLoading && !hasDetailMarker) {
          console.warn('[companies-open-loading-fix] post-flight: still loading after openDetail — retrying');
          try {
            orig.call(Companies, numId);
          } catch (e) {
            console.error('[companies-open-loading-fix] retry threw:', e);
            showError(numId, 'Villa við að birta fyrirtæki', (e && e.message) || String(e));
            return;
          }
        }
        rewireBackBtn();
      }, 400);
      // Also rewire after patch 75 enhances (50ms timeout there)
      setTimeout(rewireBackBtn, 120);
      return result;
    };

    // Helper: call orig.openDetail with try/catch so retries don't crash.
    function safeCallOrig(numId) {
      try {
        return orig.call(Companies, numId);
      } catch (e) {
        console.error('[companies-open-loading-fix] safeCallOrig threw:', e);
        showError(numId, 'Villa við að birta fyrirtæki', (e && e.message) || String(e));
      }
    }

    console.log('[companies-open-loading-fix v1] Companies.openDetail wrapped');
  }

  install();
})();
/* === END COMPANIES OPEN-DETAIL LOADING FIX === */
