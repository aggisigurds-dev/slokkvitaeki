/* === NAV HISTORY v1 === */
/* Adds a browser-style "back" stack on top of App.switchView so that the
 * "Til baka" buttons across detail pages return the user to the actual
 * previous location (which view + which detail) instead of always
 * dropping them onto the list overview.
 *
 * Strategy: every successful App.switchView call pushes onto a stack,
 * Companies.openDetail / Vidskiptavinir.openDetail / Verkdagbok detail
 * record their entries too. A single "back()" function replays the
 * previous entry. Browser back-button (popstate) is also wired.
 */
(() => {
  if (typeof window === 'undefined') return;
  if (window.__navHistoryInstalled) return;
  window.__navHistoryInstalled = true;
  // 2026-05-12 DISABLED — this patch was the root cause of the "Til baka
  // does nothing" bug on Companies. It hijacked the inline onclick on
  // every back button and routed it through a custom stack which got
  // out of sync with the actual rendered surface. Patches 100 + 136
  // existed only to neutralize this. With 18 disabled, the original
  // inline `onclick="Companies.render()"` on detail pages works as
  // intended and patches 100 + 136 become unnecessary.
  return;

  const stack = [];
  let suppressNext = false;

  function push(entry) {
    if (suppressNext) { suppressNext = false; return; }
    const last = stack[stack.length - 1];
    if (last && JSON.stringify(last) === JSON.stringify(entry)) return;
    stack.push(entry);
    if (stack.length > 30) stack.shift();
    try {
      history.pushState({ slokkNav: stack.length }, '', '#' + entry.view + (entry.detailId ? '/' + entry.detailId : ''));
    } catch (_) {}
  }

  function back() {
    if (stack.length < 2) {
      // Nothing meaningful to go back to — show list of last view
      const last = stack[stack.length - 1];
      if (last && window.App && App.switchView) App.switchView(last.view);
      return;
    }
    stack.pop(); // current
    const prev = stack.pop(); // restore as if we just navigated to it
    suppressNext = true;
    apply(prev);
  }

  function apply(entry) {
    if (!entry) return;
    // For companies, use the safe helper that avoids the App.switchView/Companies.load race
    if (entry.view === 'companies' && entry.detailId != null && window._openCompanySafe) {
      window._openCompanySafe(entry.detailId);
      return;
    }
    if (window.App && App.switchView) App.switchView(entry.view);
    if (entry.detailId == null) return;
    setTimeout(() => {
      if (entry.view === 'companies' && window.Companies && Companies.openDetail) {
        Companies.openDetail(entry.detailId);
      } else if (entry.view === 'vidskiptavinir' && window.Vidskiptavinir && typeof Vidskiptavinir.openDetail === 'function') {
        Vidskiptavinir.openDetail(entry.detailId);
      }
    }, 200);
  }

  function wrap() {
    if (!window.App || typeof App.switchView !== 'function') {
      setTimeout(wrap, 200);
      return;
    }
    if (App.switchView.__navHistoryHook) return;
    const orig = App.switchView.bind(App);
    App.switchView = function (name) {
      const ret = orig(name);
      push({ view: name, detailId: null });
      return ret;
    };
    App.switchView.__navHistoryHook = true;

    // Hook Companies.openDetail to record the detail navigation.
    if (window.Companies && Companies.openDetail && !Companies.openDetail.__navHistoryHook) {
      const origC = Companies.openDetail.bind(Companies);
      Companies.openDetail = function (id) {
        const ret = origC(id);
        push({ view: 'companies', detailId: id });
        return ret;
      };
      Companies.openDetail.__navHistoryHook = true;
    }

    // Hook Vidskiptavinir.openDetail similarly when it lands.
    function hookVidsk() {
      if (window.Vidskiptavinir && Vidskiptavinir.openDetail && !Vidskiptavinir.openDetail.__navHistoryHook) {
        const origV = Vidskiptavinir.openDetail.bind(Vidskiptavinir);
        Vidskiptavinir.openDetail = function (id) {
          const ret = origV(id);
          push({ view: 'vidskiptavinir', detailId: id });
          return ret;
        };
        Vidskiptavinir.openDetail.__navHistoryHook = true;
      }
    }
    hookVidsk();
    setTimeout(hookVidsk, 1500);

    window.SlokkNav = { back, stack, push };
    console.log('[nav-history] installed');
  }

  // Listen for browser back/forward
  window.addEventListener('popstate', () => {
    if (stack.length >= 2) back();
  });

  // Intercept "Til baka" (Til baka) buttons to use our back() instead of always
  // calling Companies.render / Vidskiptavinir.render.
  document.addEventListener('click', (e) => {
    const btn = e.target.closest && e.target.closest('button');
    if (!btn) return;
    const txt = (btn.textContent || '').trim();
    if (!/^til baka$/i.test(txt)) return;
    // Don't hijack if this back is inside a modal (modal close)
    if (btn.closest('.modal, #vid-master-modal')) return;
    e.preventDefault();
    e.stopPropagation();
    back();
  }, true);

  wrap();
})();
/* === END NAV HISTORY === */
