/* === FYRIRTÆKI: DJÚPTENGING #company/<id> — ræsingarþolin + inni í öppum (357) ============
 *
 * Agnar 06.09.2026 (Drög-stöð): „geturðu linkað fyrirtækin inn á fyrirtækjaprófílinn" /
 * „það þarf að tengjast við svona link: slokkvitaeki.netlify.app/#company/1101".
 * Hubbinn (brunaholf.netlify.app, Drög-stöð + Efniskostnaður) vísar á #company/<fyrirtaeki.id>
 * — sama snið og 235 (deeplink-subroutes) og 167 (hreyfingarlisti). Líka #companies/<id> og
 * #fyrirtaeki/<id> (samræmt í #company/<id>).
 *
 * 1) FERSK HLEÐSLA. 235 dugar ekki eitt og sér: ræsingin er ekki róleg (154 lýsir því líka).
 *    App.init lendir á Sala, 218 speglar það strax í hashið (svo #company/<id> er horfið áður
 *    en nokkur tímamælir les það), EITTHVAÐ kallar switchView('sala') um t≈1500ms, og
 *    Companies.load() endurteiknar listann yfir opinn prófíl. Mælt 06.09.2026: ferskt
 *    #company/202 endaði á #sala með „Hleður…". Því: auðkennið gripið við HLEÐSLU skriftunnar,
 *    opnað með `_openCompanySafe` (mapfix.js — skiptir sýn án switchView-endurhleðslu og bíður
 *    eftir Companies.load() ef listinn er tómur), og tikk staðfestir að PRÓFÍLLINN sjálfur sé á
 *    skjánum (Breyta-takkinn `Companies.openEdit(<id>)` í #companies-main) og opnar aftur ef
 *    listinn/lendingin skrifaði yfir — þar til fyrsta raunverulega notendasnerting eða 8 s.
 * 2) INNI Í ÖPPUM (Fjármál/Boss, 261). Hubbinn liggur í iframe á öðrum uppruna, svo hann getur
 *    EKKI sett top.location.hash (SecurityError) — hann sendir postMessage
 *    {type:'slokk-open-company', id} og fær 'slokk-open-company-ack' til baka (annars opnar hann
 *    nýjan flipa). Hér: fela hub-rammann (#_app-frame liggur ofan á öllu, z-index 2147481000),
 *    opna prófílinn. 261-fókuslásinn grípur aðeins switchView, sem er ekki notað hér.
 * 3) HASHCHANGE (t.d. #company/1101 límt í slóðina): 235 gerir sitt, þetta tikkar á eftir (3 s).
 * 218 hunsar path-lík hash (cleanHash → '') og 154 víkur fyrir hash án '=' → enginn árekstur.
 * Ekkert skrifað; 153/187 ÓSNERT.
 * ========================================================================== */
(() => {
  if (window.__coDeeplink357) return;
  window.__coDeeplink357 = true;

  const HUB_ORIGIN = /^https:\/\/([a-z0-9-]+--)?brunaholf\.netlify\.app$/;
  const DEV_ORIGIN = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

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
  function listReady() { return !!(window.DB && DB.online) || !!(window.Companies && Companies.list && Companies.list.length); }
  function detailOpen(id) {
    if (!document.querySelector('#view-companies.active')) return false;
    const main = document.getElementById('companies-main');
    return !!(main && main.querySelector('button[onclick*="Companies.openEdit(' + id + ')"]'));
  }
  function hideAppFrame() {
    if (!document.body.classList.contains('appmode')) return;
    const f = document.getElementById('_app-frame');
    if (f && f.style.display !== 'none') f.style.display = 'none';
  }
  function openNow(id) {
    hideAppFrame();
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
      // bíða eftir gagnagrunninum (Companies.load() skilar tómu meðan DB.online er false)
      while (!listReady() && Date.now() - t0 < 15000) await sl(250);
      // 06.09.2026: bíða líka eftir DB.online (loadAll: uttaeki o.fl.) — annars opnast prófíllinn með „Slökkvitæki (0)"
      // og endurteiknast ekki þegar tækin koma (Örkin: 57 tæki sýnd sem 0 í djúptengdri hleðslu).
      while (!(window.DB && DB.online) && Date.now() - t0 < 20000) await sl(250);
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
  // hubbinn í iframe (Drög-stöð / Efniskostnaður inni í Fjármál/Boss)
  window.addEventListener('message', (e) => {
    if (!(HUB_ORIGIN.test(e.origin) || DEV_ORIGIN.test(e.origin))) return;
    const d = e.data || {};
    if (d.type !== 'slokk-open-company' || !(Number(d.id) > 0)) return;
    try { e.source && e.source.postMessage({ type: 'slokk-open-company-ack', id: Number(d.id) }, e.origin); } catch (_) {}
    userTouched = false;
    go(Number(d.id), 3000);
  });
  if (BOOT_ID) {
    const start = () => setTimeout(() => go(BOOT_ID, 8000), 400);
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
  }
  window.CoDeeplink = { open: id => go(Number(id), 3000), parseHash, detailOpen, bootId: BOOT_ID, version: '357f' };
  console.log('[patch-357] fyrirtæki djúptenging #company/<id>', BOOT_ID || '');
})();
/* === END FYRIRTÆKI DJÚPTENGING === */
