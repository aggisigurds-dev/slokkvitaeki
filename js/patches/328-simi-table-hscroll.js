/* === SÍMI/APP: LÁRÉTT TÖFLUSKRUN (328) =====================================
 *
 * Agnar 2026-08-29 (símarammi á Fjármálum · Fyrirtæki í þjónustu):
 * „mátt bæta við möguleikann svo ég geti skrollað til hliðar fyrir svona
 * töflur í símaham".
 *
 * Ársskoðunar-mrows (._arsm-tbl) hafa þegar overflow-x:auto + frosinn
 * nafndálk (153 / f819a2f). Á snertiskjá virkar strokið. Í símarammanum á
 * skjáborði (mús) gerist hins vegar þetta:
 *   1. Drag til hliðar opnar fyrirtæki (röðin er smellanleg) í stað þess
 *      að skruna töfluna.
 *   2. Aðeins shift/trackpad-hjól skrunar — ósýnilegt og ekki það sem
 *      maður prófar í ramma.
 *
 * LAUSN: einn skrunari á umgjörðinni, sýnileg skrunstika, og músar-drag
 * sem skrunar + bæli smell þegar strokið var lárétt. Sama á
 * .rf-tblscroll (Rekstrarfélög í Fjármálum) og ._ars-tblscroll ef hún
 * birtist. Skjáborðs-taflan er ósnert — aðeins sími/app-ham.
 * ========================================================================== */
(() => {
  if (window.__simiTableHscroll328) return;
  window.__simiTableHscroll328 = true;

  const STYLE_ID = 'simi-table-hscroll-328';
  const SEL = '._arsm-tbl, .rf-tblscroll, ._ars-tblscroll, .data-table-scroll';
  const MOBILE = () => {
    const vm = document.documentElement && document.documentElement.dataset.viewmode;
    const app = document.body && document.body.classList.contains('appmode');
    return app || vm === 'mobile';
  };

  function injectCss() {
    let s = document.getElementById(STYLE_ID);
    if (!s) {
      s = document.createElement('style');
      s.id = STYLE_ID;
      (document.head || document.documentElement).appendChild(s);
    }
    /* :not(#_a) pad — sama húsasiður og 263/325 svo þetta slái 261/mobile.css. */
    const P = ':not(#_a):not(#_b)';
    const roots = [
      'html[data-viewmode="mobile"]',
      'body.appmode'
    ];
    const rules = [];
    roots.forEach((r) => {
      /* Umgjörðin er EINN láréttur skrunari. */
      rules.push(
        r + ' ' + SEL.split(', ').map((x) => x + P).join(',' + r + ' ') +
        '{max-width:100%!important;overflow-x:auto!important;overflow-y:hidden!important;' +
        '-webkit-overflow-scrolling:touch;overscroll-behavior-x:contain;' +
        'scrollbar-width:thin;touch-action:pan-x pan-y pinch-zoom;cursor:grab}'
      );
      rules.push(
        r + ' ' + SEL.split(', ').map((x) => x + P + ':active').join(',' + r + ' ') +
        '{cursor:grabbing}'
      );
      /* Foreldrar mega ekki vera samkeppnisskrunarar á X-ás. */
      rules.push(
        r + ' #view-arsskodun #ars-main' + P + ',' +
        r + ' #view-arsskodun' + P +
        '{overflow-x:clip!important}'
      );
      rules.push(
        r + ' #view-rekstrarfelog .rf-tblwrap' + P +
        '{overflow-x:clip!important;overflow-y:visible!important}'
      );
      /* Frosinn fyrsti dálkur á HTML-töflum sem skrunast (Rekstrarfélög o.fl.).
         Ársskoðun-mrows nota sticky á ._arsm-name — ósnert. */
      rules.push(
        r + ' .rf-tblscroll th:first-child' + P + ',' +
        r + ' .rf-tblscroll td:first-child' + P +
        '{position:sticky;left:0;z-index:2;background:#fff;box-shadow:1px 0 0 #eef1f5}'
      );
      rules.push(
        r + ' .rf-tblscroll thead th:first-child' + P +
        '{background:#2b2f36;z-index:3}'
      );
    });
    s.textContent = rules.join('\n');
    if (s.parentNode && s.parentNode.lastElementChild !== s) s.parentNode.appendChild(s);
  }

  /* Músar-drag → scrollLeft. Snertiskjár lætur vafrann um strokið
     (touch-action:pan-x). Smellur bælist aðeins ef strokið var >8px lárétt. */
  function bindDrag(scroller) {
    if (!scroller || scroller.__hscroll328) return;
    scroller.__hscroll328 = true;
    let down = false;
    let moved = false;
    let startX = 0;
    let startLeft = 0;
    let pointerId = null;

    scroller.addEventListener('pointerdown', (e) => {
      if (!MOBILE()) return;
      if (e.pointerType === 'touch') return; /* native pan */
      if (e.button != null && e.button !== 0) return;
      if (e.target && e.target.closest && e.target.closest('input,textarea,select,button,a,[contenteditable]')) return;
      down = true;
      moved = false;
      startX = e.clientX;
      startLeft = scroller.scrollLeft;
      pointerId = e.pointerId;
      try { scroller.setPointerCapture(pointerId); } catch (_) {}
    });

    scroller.addEventListener('pointermove', (e) => {
      if (!down || (pointerId != null && e.pointerId !== pointerId)) return;
      const dx = e.clientX - startX;
      if (!moved && Math.abs(dx) < 8) return;
      moved = true;
      scroller.scrollLeft = startLeft - dx;
      e.preventDefault();
    });

    function end(e) {
      if (!down) return;
      if (pointerId != null && e && e.pointerId != null && e.pointerId !== pointerId) return;
      down = false;
      try { if (pointerId != null) scroller.releasePointerCapture(pointerId); } catch (_) {}
      pointerId = null;
      if (moved) {
        /* Bæli smellinn sem pointerup myndi annars triggera á ._ars-row. */
        const block = (ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          ev.stopImmediatePropagation();
        };
        scroller.addEventListener('click', block, true);
        setTimeout(() => scroller.removeEventListener('click', block, true), 0);
      }
      moved = false;
    }
    scroller.addEventListener('pointerup', end);
    scroller.addEventListener('pointercancel', end);
  }

  function scan() {
    if (!MOBILE()) return;
    document.querySelectorAll(SEL).forEach(bindDrag);
  }

  injectCss();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => { injectCss(); scan(); });
  } else {
    scan();
  }
  document.addEventListener('slokk-viewmode', () => { injectCss(); scan(); });
  new MutationObserver(() => {
    clearTimeout(window.__hscroll328t);
    window.__hscroll328t = setTimeout(scan, 200);
  }).observe(document.documentElement, { childList: true, subtree: true });

  window.SimiTableHscroll = { scan, injectCss };
  console.log('[patch-328] simi table hscroll ready');
})();
/* === END SÍMI/APP LÁRÉTT TÖFLUSKRUN === */
