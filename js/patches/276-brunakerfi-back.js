/* === BRUNAKERFI APP: BAKK-TAKKI SÍMANS (2026-07-21) ===
 *
 * Ósk Agnars: í uppsetta skoðunarmanna-appinu (/app/brunakerfi/) á bakk-takki
 * símans að virka sem „til baka" í appinu — EKKI loka því.
 *
 * Sama bragð og Bílstjórinn (219 armBack): buffer-færsla er sett í history við
 * ræsingu; popstate (bakk-takkinn) lokar þá EFSTA laginu sem er opið —
 * verðlista-ritill → skýrslu-val → skoðunarskýrslu-formið (vistar drögin
 * sjálfkrafa við lokun) → fyrirtækjasíðan — og endur-vopnar bufferinn. Þegar
 * ekkert lag er opið (á yfirlitinu) gerir bakk ekkert; út úr appinu fer maður
 * með heim-takkanum eins og í öðrum öppum.
 *
 * Gildir AÐEINS í app-ham (/app/brunakerfi/ eða ?app=brunakerfi) — venjulegi
 * vefurinn heldur óbreyttri back-hegðun vafrans.
 */
(() => {
  if (window.__bkBackInstalled) return;
  window.__bkBackInstalled = true;

  const APPMODE = /^\/app\/brunakerfi\//.test(location.pathname || '') ||
    /[?&]app=brunakerfi(?:$|[=&])/.test(location.search || '');
  if (!APPMODE) return;

  // efsta lagið fyrst: ritill → val-gluggi → form → fyrirtækjasíða
  function closeTop() {
    const pedit = document.getElementById('_bks-pedit');
    if (pedit) { pedit.remove(); return true; }
    const pick = document.getElementById('_bks-picker');
    if (pick) { pick.remove(); return true; }
    const form = document.getElementById('_bks-overlay');
    if (form && form.style.display === 'block') {
      const b = form.querySelector('[data-act="close"]');
      if (b) b.click(); else form.style.display = 'none';
      return true;
    }
    const co = document.getElementById('_bkc-overlay');
    if (co && co.style.display === 'block') {
      const b = co.querySelector('[data-a="back"]');
      if (b) b.click(); else co.style.display = 'none';
      return true;
    }
    return false;
  }

  function arm() { try { history.pushState({ bkApp: 1 }, ''); } catch (_) {} }
  arm();
  window.addEventListener('popstate', () => {
    closeTop();
    arm();
  });
  console.log('[patch-276] brunakerfi app bakk-takki virkur');
})();
/* === END BRUNAKERFI BAKK-TAKKI === */
