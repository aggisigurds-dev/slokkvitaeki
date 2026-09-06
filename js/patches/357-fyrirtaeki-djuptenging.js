/* === FYRIRTÆKI: DJÚPTENGING #company/<id> — ræsingarþolin (357) =====================
 *
 * Agnar 06.09.2026 (Drög-stöð): „geturðu linkað fyrirtækin inn á fyrirtækjaprófílinn". Hubbinn
 * (brunaholf.netlify.app, Drög-stöð + Efniskostnaður) vísar á
 *     https://slokkvitaeki.netlify.app/#company/<fyrirtaeki.id>
 * — sama snið og 235 (deeplink-subroutes) og 167 (hreyfingarlisti) nota. Líka #companies/<id>
 * og #fyrirtaeki/<id> (samræmt í #company/<id>).
 *
 * Af hverju 235 dugar ekki eitt og sér: ræsingin er ekki róleg (154 lýsir því líka). App.init
 * lendir á Sala, 218 speglar það strax í hashið (svo #company/<id> er horfið áður en nokkur
 * tímamælir les það), EITTHVAÐ kallar switchView('sala') um t≈1500ms, og Companies.load()
 * endurteiknar listann yfir opinn prófíl. Mælt 06.09.2026: ferskt #company/202 endaði á
 * #sala með „Hleður…". Þess vegna hér: (1) auðkennið gripið við HLEÐSLU skriftunnar,
 * (2) opnað með `_openCompanySafe` (mapfix.js — skiptir sýn án switchView-endurhleðslu og bíður
 * eftir Companies.load() ef listinn er tómur), (3) tikk staðfestir að PRÓFÍLLINN sjálfur sé á
 * skjánum (Breyta-takkinn `Companies.openEdit(<id>)` í #companies-main) og opnar aftur ef
 * listinn/lendingin skrifaði yfir — þar til fyrsta raunverulega notendasnerting eða 8 s.
 * Á hashchange (hubbinn í iframe setur top.location.hash) gerir 235 sitt; þetta tikkar á eftir
 * og lagar ef endurteiknun klúðraði. 218 hunsar path-lík hash og 154 víkur → enginn árekstur.
 * Ekkert skrifað; 153/187 ÓSNERT.
 * ========================================================================== */
(() => {
  if (window.__coDeeplink357) return;
  window.__coDeeplink357 = true;

  function parseHash(h) {
    const m = (h || '').match(/^#(?:company|companies|fyrirtaeki)\/(\d+)\b/);
    return m ? Number(m[1]) : null;
  }
  // gripið við hleðslu — áður en ræsingin skrifar yfir hashið
  const BOOT_ID = parseHash(location.hash) || (() => {
    try { const n = performance.getEntriesByType('navigation')[0]; return n ? parseHash('#' + (n.name.split('#')[1] || '')) : null; } catch (_) { return null; }
  })();

  const sl = ms => new Promise(r => setTimeout(r, ms));
  let userTouched = false;
  ['mousedown', 'keydown', 'touchstart', 'pointerdown'].forEach(e => window.addEventListener(e, () => { userTouched = true; }, { capture: true, passive: true }));

  function ready() { return !!(window.App && window.Companies && (window._openCompanySafe || Companies.openDetail)); }
  function detailOpen(id) {
    if (!document.querySelector('#view-companies.active')) return false;
    const main = document.getElementById('companies-main');
    return !!(main && main.querySelector('button[onclick*="Companies.openEdit(' + id + ')"]'));
  }
  function openNow(id) {
    if (window._openCompanySafe) { window._openCompanySafe(id); }
    else {
      try { App.switchView('companies'); } catch (_) {}
      if (Companies.list && Companies.list.length) Companies.openDetail(id);
      else if (typeof Companies.load === 'function') Promise.resolve(Companies.load()).then(() => Companies.openDetail(id)).catch(() => {});
    }
    // samræmt snið í slóðinni (235 speglar það sama úr openDetail)
    try { const want = '#company/' + id; if (location.hash !== want) history.replaceState(null, '', location.pathname + location.search + want); } catch (_) {}
  }

  let busy = false;
  async function go(id, ms) {
    if (busy) return; busy = true;
    try {
      const t0 = Date.now();
      while (!ready() && Date.now() - t0 < 20000) await sl(250);
      if (!ready()) return;
      openNow(id);
      const deadline = Date.now() + ms;
      let reopened = 0;
      while (Date.now() < deadline && !userTouched) {
        await sl(300);
        if (!detailOpen(id)) { reopened++; openNow(id); }
      }
      if (reopened) console.log('[357] prófíll #' + id + ' opnaður aftur ' + reopened + 'x gegnum ræsinguna');
    } finally { busy = false; }
  }
  window.addEventListener('hashchange', () => { const id = parseHash(location.hash); if (id) setTimeout(() => go(id, 3000), 350); });
  if (BOOT_ID) {
    const start = () => setTimeout(() => go(BOOT_ID, 8000), 400);
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
  }
  window.CoDeeplink = { open: id => go(Number(id), 3000), parseHash, detailOpen, bootId: BOOT_ID, version: '357d' };
  console.log('[patch-357] fyrirtæki djúptenging #company/<id>', BOOT_ID || '');
})();
/* === END FYRIRTÆKI DJÚPTENGING === */
