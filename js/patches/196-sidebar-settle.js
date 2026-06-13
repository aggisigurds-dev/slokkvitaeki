/* === SIDEBAR SETTLE v1 ===
 *
 * Todoist „Sidepannel, bug" (annað lag): fyrstu ~3 sekúndurnar hellast
 * takkarnir inn í hliðarstikuna á tímurum og patch 68 endurraðar á milli —
 * notandinn SÉR hringlið. Fyrri lagfæring (PR #120/#121) stoppaði að
 * hringlað röð FESTIST (editorinn les nú vistuðu röðina, auka umferðir
 * á 6s/12s) — þetta lag felur sjálft sjónarspilið:
 *
 * Stikan byrjar dauf (opacity .35, áfram smellanleg) og skýrist EINU SINNI
 * þegar hún hefur verið kjurr í 700ms — þ.e. þegar injector-patchar og
 * endurröðun eru hætt að hræra — í síðasta lagi eftir 4 sek. Eftir það
 * er hún ósnert (one-shot), svo seinni smá-breytingar (badge-teljarar
 * o.þ.h.) dimma hana aldrei aftur.
 */
(() => {
  if (window.__sidebarSettleInstalled) return;
  window.__sidebarSettleInstalled = true;

  // 2026-06-13: NEUTRALISED. The opacity-fade was a band-aid for the old
  // DOM-wipe reorder (patch 68), which now positions buttons via CSS `order`
  // with zero DOM moves — there's no shuffle to hide, and the .35 fade itself
  // read as "tabs dim/disappear on load". No-op now.
  return;

  const QUIET_MS = 700;
  const CAP_MS = 4000;

  function start(tries) {
    const nav = document.querySelector('nav.view-nav, .view-nav');
    if (!nav) {
      if ((tries || 0) < 30) setTimeout(() => start((tries || 0) + 1), 300);
      return;
    }
    nav.style.transition = 'opacity .3s ease';
    nav.style.opacity = '0.35';

    let t = null, done = false;
    const lift = () => {
      if (done) return;
      done = true;
      try { mo.disconnect(); } catch (_) {}
      nav.style.opacity = '1';
    };
    const arm = () => { clearTimeout(t); t = setTimeout(lift, QUIET_MS); };
    const mo = new MutationObserver(arm);
    mo.observe(nav, { childList: true, subtree: true });
    arm();
    setTimeout(lift, CAP_MS);
  }
  start();
})();
/* === END SIDEBAR SETTLE === */
