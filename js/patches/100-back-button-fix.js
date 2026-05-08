/* === BACK BUTTON FIX v1 ===
 *
 * Vandamál: patch 18 nav-history.js tekur yfir „Til baka"-takkann í
 * fyrirtækisspjaldi og keyrir back() sem ratast í gegnum nav-history-stack.
 * Þegar stack-ið hefur fleiri en eina færslu (sem gerist alltaf þegar
 * patch 93's stay-open keyrir Companies.openDetail aftur eftir refresh),
 * þá skoppar back() aftur tvö skref og notandinn lendir á Sala-síðunni
 * í stað þess að fara í fyrirtækjalistann.
 *
 * Nákvæmt sequence:
 *   Stack: [sala]  ← startup
 *   User → companies tab        Stack: [sala, companies]
 *   User → opens detail (164)   Stack: [sala, companies, {view:companies, id:164}]
 *   refreshAll fires → patch 93 re-opens detail → openDetail kallað aftur
 *   Stack: [sala, companies, {view:companies, id:164}, {view:companies, id:164}]
 *   User → "Til baka"           pop 2 → prev = {view:companies, id:164}
 *                               apply prev → openDetail(164) kallar enn
 *   ... endurtekur, stack tæmist smám saman
 *   Að lokum: User → "Til baka" → endurtekur → endar á Sala-síðunni!
 *
 * Lausn: vefjum "Til baka"-takkann þannig að ef hann er inni í
 * #companies-main eða view-vidskiptavinir og hefur inline onclick sem
 * heitir Render eða Companies.render eða Vidskiptavinir.render, þá keyrum
 * við þann inline onclick og forðumst nav-history-stack.
 *
 * Þetta passar betur við væntingar notanda: „Til baka" á fyrirtækisspjaldi
 * fer í LISTANN, ekki í aftur-saga.
 */
(() => {
  if (window.__backButtonFixInstalled) return;
  window.__backButtonFixInstalled = true;

  // Capture-phase listener that runs BEFORE patch 18's listener.
  // (patch 18 also uses capture phase, but our patch loads later, so our
  // handler is registered later. Capture-phase listeners on document
  // execute in registration order — so we run AFTER patch 18.)
  //
  // Therefore we use a different approach: intercept on capture phase using
  // useCapture=true with the OUTERMOST element so we catch the click before
  // bubbling through to patch 18.
  //
  // Actually simpler: replace the inline onclick on the back button with
  // a direct handler that bypasses patch 18.

  function fixBackButtons() {
    // Companies detail back button
    const main = document.getElementById('companies-main');
    if (main) {
      main.querySelectorAll('button[onclick*="Companies.render"]').forEach(btn => {
        if (btn.dataset._bbFixed === '1') return;
        btn.dataset._bbFixed = '1';
        const orig = btn.getAttribute('onclick');
        btn.removeAttribute('onclick'); // strip inline
        btn.addEventListener('click', e => {
          // Run BEFORE patch 18 by stopping propagation immediately
          e.stopPropagation();
          e.stopImmediatePropagation();
          e.preventDefault();
          try {
            if (window.Companies && typeof Companies.render === 'function') {
              Companies.render();
            } else if (orig) {
              // Fallback to original inline
              eval(orig);
            }
          } catch (err) { console.warn('[back-button-fix]', err); }
        }, true); // capture phase
      });
    }

    // Vidskiptavinir detail back button (if any view-vidskiptavinir is rendered)
    const vidView = document.getElementById('view-vidskiptavinir');
    if (vidView) {
      vidView.querySelectorAll('button[onclick*="Vidskiptavinir.render"], button[onclick*="render()"]').forEach(btn => {
        if (btn.dataset._bbFixed === '1') return;
        // Only handle if button text says "Til baka"
        const txt = (btn.textContent || '').trim();
        if (!/til\s*baka/i.test(txt)) return;
        btn.dataset._bbFixed = '1';
        const orig = btn.getAttribute('onclick');
        btn.removeAttribute('onclick');
        btn.addEventListener('click', e => {
          e.stopPropagation();
          e.stopImmediatePropagation();
          e.preventDefault();
          try {
            if (window.Vidskiptavinir && typeof Vidskiptavinir.render === 'function') {
              Vidskiptavinir.render();
            } else if (orig) {
              eval(orig);
            }
          } catch (err) { console.warn('[back-button-fix]', err); }
        }, true);
      });
    }
  }

  // Watch for new "Til baka" buttons (re-rendered each time openDetail runs)
  function attach() {
    const main = document.getElementById('companies-main');
    if (!main) { setTimeout(attach, 800); return; }
    let _t = 0;
    new MutationObserver(() => {
      clearTimeout(_t);
      _t = setTimeout(fixBackButtons, 60);
    }).observe(main, { childList: true, subtree: true });

    const vid = document.getElementById('view-vidskiptavinir');
    if (vid) {
      let _t2 = 0;
      new MutationObserver(() => {
        clearTimeout(_t2);
        _t2 = setTimeout(fixBackButtons, 60);
      }).observe(vid, { childList: true, subtree: true });
    }
  }
  attach();

  // Initial passes
  setTimeout(fixBackButtons, 600);
  setTimeout(fixBackButtons, 1500);
  setTimeout(fixBackButtons, 3500);

  // Also fix on view-shown event so back buttons get re-wired after navigation
  document.addEventListener('view-shown', () => setTimeout(fixBackButtons, 200));

  console.log('[back-button-fix] installed — Til baka takki fer beint í lista, ekki gegnum nav-history');
})();
/* === END BACK BUTTON FIX v1 === */
