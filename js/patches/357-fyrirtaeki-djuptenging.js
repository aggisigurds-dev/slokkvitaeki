/* === FYRIRTÆKI: DJÚPTENGING #companies/<id> (357) ===============================
 *
 * Agnar 06.09.2026 (Drög-stöð): „geturðu linkað fyrirtækin inn á fyrirtækjaprófílinn". Hubbinn
 * (brunaholf.netlify.app, Drög-stöð + Efniskostnaður) vísar nú á
 *     https://slokkvitaeki.netlify.app/#companies/<fyrirtaeki.id>
 * Þessi pappi les hana og opnar prófílinn með `_openCompanySafe` (mapfix.js — skiptir á
 * Fyrirtæki-sýnina og bíður eftir Companies.load() svo endurteiknun listans skrifi ekki yfir
 * prófílinn), hreinsar svo slóðina í #companies svo 218-routing sjái hreint slug.
 *
 * Ræsingin er ekki róleg (sama og 154 lýsir): App.init lendir á Sala, 218 speglar það strax í
 * hashið (svo #companies/<id> er horfið áður en DOMContentLoaded-tímamælir les það), og
 * EITTHVAÐ kallar switchView('sala') um t≈1500ms. Þess vegna: (1) auðkennið er gripið við
 * HLEÐSLU skriftunnar, (2) tikk endurtekur opnunina ef sýnin rekur burt — þar til fyrsta
 * raunverulega notendasnerting eða 8 s. 218 hunsar path-lík hash (cleanHash → '') og 154 víkur
 * fyrir öllum hash án '=', svo enginn árekstur.
 * Virkar líka inni í öppunum (Fjármál/Boss): hubbinn í iframe setur hash á foreldrið →
 * hashchange hér → prófíllinn opnast án endurhleðslu. Líka #fyrirtaeki/<id>.
 * Ekkert skrifað; 153/187 ÓSNERT.
 * ========================================================================== */
(() => {
  if (window.__coDeeplink357) return;
  window.__coDeeplink357 = true;

  function parseHash(h) {
    const m = (h || '').match(/^#(?:companies|fyrirtaeki)\/(\d+)\b/);
    return m ? Number(m[1]) : null;
  }
  // gripið við hleðslu — áður en ræsingin skrifar yfir hashið
  const BOOT_ID = parseHash(location.hash) || (() => {
    try { const n = performance.getEntriesByType('navigation')[0]; return n ? parseHash('#' + (n.name.split('#')[1] || '')) : null; } catch (_) { return null; }
  })();

  const sl = ms => new Promise(r => setTimeout(r, ms));
  let userTouched = false;
  ['mousedown', 'keydown', 'touchstart', 'pointerdown'].forEach(e => window.addEventListener(e, () => { userTouched = true; }, { capture: true, passive: true }));

  function openNow(id) {
    try { if (location.hash !== '#companies') history.replaceState(null, '', location.pathname + location.search + '#companies'); } catch (_) {}
    if (window._openCompanySafe) { window._openCompanySafe(id); return true; }
    if (window.App && window.Companies && Companies.openDetail) {
      try { App.switchView('companies'); } catch (_) {}
      if (Companies.list && Companies.list.length) Companies.openDetail(id);
      else if (typeof Companies.load === 'function') Promise.resolve(Companies.load()).then(() => Companies.openDetail(id)).catch(() => {});
      return true;
    }
    return false;
  }
  function onCompanies() { return (window.App && App.view === 'companies') || !!document.querySelector('#view-companies.active'); }

  let busy = false;
  async function go(id, boot) {
    if (busy) return; busy = true;
    try {
      const t0 = Date.now();
      while (!(window.App && window.Companies && (window._openCompanySafe || Companies.openDetail)) && Date.now() - t0 < 20000) await sl(250);
      if (!openNow(id)) return;
      if (!boot) return;
      // ræsing: halda prófílnum opnum gegnum sjálfvirku lendingarnar (sala t≈1500ms)
      const deadline = Date.now() + 8000;
      while (Date.now() < deadline && !userTouched) {
        await sl(300);
        if (!onCompanies()) { console.log('[357] sýnin rak burt — opna aftur'); openNow(id); }
      }
    } finally { busy = false; }
  }
  window.addEventListener('hashchange', () => { const id = parseHash(location.hash); if (id) go(id, false); });
  if (BOOT_ID) {
    const start = () => setTimeout(() => go(BOOT_ID, true), 400);
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
  }
  window.CoDeeplink = { open: id => go(id, false), parseHash, bootId: BOOT_ID, version: '357c' };
  console.log('[patch-357] fyrirtæki djúptenging #companies/<id>', BOOT_ID || '');
})();
/* === END FYRIRTÆKI DJÚPTENGING === */
