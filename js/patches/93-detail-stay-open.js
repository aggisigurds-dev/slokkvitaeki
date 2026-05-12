/* === DETAIL STAY-OPEN GUARD v1 ===
 *
 * Vandamál: pm-rt (realtime subscription í 00-legacy.js) hlustar á breytingar
 * á fyrirtaeki/uttaeki/o.s.frv. og kallar á App.refreshAll() eftir 500ms
 * debounce. App.refreshAll() endurræsir Companies.render() sem þurrkar út
 * fyrirtækisspjaldið og setur listann í staðinn — notandinn dettur úr
 * fyrirtækinu sem hann var að skoða.
 *
 * Vegna þess að pm-rt fires við hverja breytingu í þessum töflum (líka frá
 * öðrum tækjum eða bakgrunnsferlum), getur notandinn ekki haldið fyrirtæki
 * opnu lengur en nokkrar sekúndur áður en það "blikkar" og lokast.
 *
 * Lausn: vefjum App.refreshAll og Vidskiptavinir.refreshAll í verndarlag:
 *   1. Áður en refresh keyrir → muna hvaða detail er opin (companies/vidskipta)
 *   2. Eftir refresh → ef við erum enn á sömu view, opnum samann detail aftur
 *   3. Forðumst óþarfa rendering ef notandinn er nú þegar í detail
 *
 * Greinir detail með því að leita að "Til baka"-takka í main-svæðinu.
 */
(() => {
  if (window.__detailStayOpenGuardInstalled) return;
  window.__detailStayOpenGuardInstalled = true;
  // 2026-05-12 DISABLED — db.js subscribeRealtime is now smart (debounced
  // 3s + only calls Companies.load() for fyrirtaeki changes, which doesn't
  // wipe #companies-main). Patch 127 (companies-edit-guard) also blocks
  // any render that would wipe a detail page. This patch's re-open dance
  // was the cause of the nav-history-stack inflation that patch 100 had
  // to clean up. With db.js + patch 127 in place, no longer needed.
  return;

  // Detect if a company-detail is currently rendered (vs the company list).
  // Use multiple signals because patch 100 strips the inline onclick attribute
  // off the "Til baka" button and replaces it with an addEventListener handler.
  function isCompanyDetailOpen() {
    const main = document.getElementById('companies-main');
    if (!main) return false;
    // Method 1: original inline onclick (might still be there)
    if (main.querySelector('button[onclick*="Companies.render"]')) return true;
    // Method 2: patch 100 stripped onclick but flagged the button
    if (main.querySelector('button[data-_bbFixed="1"]')) return true;
    // Method 3: detect by visible "Til baka" button text + classic detail
    // structure (info-grid with .ic-lbl elements, only present on detail view)
    const btns = main.querySelectorAll('button');
    for (const b of btns) {
      const txt = (b.textContent || '').trim();
      if (/^til\s*baka$/i.test(txt)) return true;
    }
    // Method 4: look for the canonical detail header (info-grid + edit button)
    if (main.querySelector('button[onclick*="Companies.openEdit"]')) return true;
    return false;
  }

  function currentCompanyId() {
    // 00-legacy.js wraps Companies.openDetail to set this.
    return window._currentCompanyId || null;
  }

  // Same idea for Viðskiptavinir (customers) — they have their own detail view.
  function isCustomerDetailOpen() {
    const view = document.getElementById('view-vidskiptavinir');
    if (!view) return false;
    return !!view.querySelector('button[onclick*="Vidskiptavinir.render"]') ||
           !!view.querySelector('button[onclick*="render()"]') &&
           view.classList.contains('active');
  }

  function patchAppRefreshAll() {
    if (!window.App || typeof window.App.refreshAll !== 'function') return false;
    if (window.App.refreshAll._stayOpenWrapped) return true;
    const orig = window.App.refreshAll;
    window.App.refreshAll = function() {
      // Snapshot what's currently open BEFORE refresh wipes it.
      const wasInCoDetail = isCompanyDetailOpen();
      const coId = currentCompanyId();

      try { orig.apply(this, arguments); } catch (e) { console.warn('[stay-open] refreshAll err:', e); }

      // After refresh, restore the detail view if it was open.
      // Use a small delay so any async loads (Companies.load) settle first.
      if (wasInCoDetail && coId && window.App && window.App.view === 'companies' &&
          window.Companies && typeof window.Companies.openDetail === 'function') {
        setTimeout(() => {
          // Only re-open if user hasn't navigated away in the meantime
          if (window.App.view === 'companies' && !isCompanyDetailOpen()) {
            try {
              window.Companies.openDetail(coId);
            } catch (e) { console.warn('[stay-open] re-open failed:', e); }
          }
        }, 80);
      }
    };
    window.App.refreshAll._stayOpenWrapped = true;
    console.log('[detail-stay-open] App.refreshAll wrapped');
    return true;
  }

  // App.refreshAll might be redefined by other patches. Re-wrap if so.
  function maintain() {
    if (window.App && window.App.refreshAll && !window.App.refreshAll._stayOpenWrapped) {
      patchAppRefreshAll();
    }
  }

  // Initial wrap + maintenance loop
  function init() {
    if (!patchAppRefreshAll()) {
      setTimeout(init, 400);
      return;
    }
    setInterval(maintain, 1500);
  }
  init();

  // Expose helper for debugging
  window._detailStayOpen = {
    isCompanyDetailOpen,
    currentCompanyId,
    forceReopen: () => {
      const id = currentCompanyId();
      if (id && window.Companies && Companies.openDetail) Companies.openDetail(id);
    }
  };

  console.log('[detail-stay-open] guard installed — pm-rt refresh will no longer kick you out of company detail');
})();
/* === END DETAIL STAY-OPEN GUARD v1 === */
