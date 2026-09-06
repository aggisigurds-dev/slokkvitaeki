/* === FYRIRTÆKI: DJÚPTENGING #companies/<id> (357) ===============================
 *
 * Agnar 06.09.2026 (Drög-stöð): „geturðu linkað fyrirtækin inn á fyrirtækjaprófílinn". Hubbinn
 * (brunaholf.netlify.app, Drög-stöð + Efniskostnaður) vísar nú á
 *     https://slokkvitaeki.netlify.app/#companies/<fyrirtaeki.id>
 * Þessi pappi les hana: opnar prófílinn með `_openCompanySafe` (mapfix.js — skiptir á
 * Fyrirtæki-sýnina og bíður eftir Companies.load() svo endurteiknun listans skrifi ekki yfir
 * prófílinn), hreinsar svo slóðina í #companies svo 218-routing sjái hreint slug.
 * 218 hunsar path-lík hash (cleanHash → '') og 154 víkur fyrir þeim, svo enginn árekstur.
 * Virkar líka inni í öppunum (Fjármál/Boss): hubbinn í iframe setur hash á foreldrið →
 * hashchange hér → prófíllinn opnast án endurhleðslu. Líka #fyrirtaeki/<id>.
 * Ekkert skrifað; 153/187 ÓSNERT.
 * ========================================================================== */
(() => {
  if (window.__coDeeplink357) return;
  window.__coDeeplink357 = true;

  function parse() {
    const m = (location.hash || '').match(/^#(?:companies|fyrirtaeki)\/(\d+)\b/);
    return m ? Number(m[1]) : null;
  }
  const sl = ms => new Promise(r => setTimeout(r, ms));
  let busy = false;
  async function go(id) {
    if (busy) return; busy = true;
    try {
      const t0 = Date.now();
      while (!(window.App && window.Companies && (window._openCompanySafe || Companies.openDetail)) && Date.now() - t0 < 20000) await sl(250);
      try { history.replaceState(null, '', location.pathname + location.search + '#companies'); } catch (_) {}
      if (window._openCompanySafe) { window._openCompanySafe(id); return; }
      // varaleið án mapfix: skipta, bíða eftir listanum, opna
      try { App.switchView('companies'); } catch (_) {}
      const t1 = Date.now();
      while (!(Companies.list && Companies.list.length) && Date.now() - t1 < 20000) await sl(300);
      await sl(300);
      try { Companies.openDetail(id); } catch (e) { console.warn('[357] openDetail', e); }
    } finally { busy = false; }
  }
  function check() { const id = parse(); if (id) go(id); }
  window.addEventListener('hashchange', check);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(check, 600)); else setTimeout(check, 600);
  window.CoDeeplink = { open: go, parse, version: '357b' };
  console.log('[patch-357] fyrirtæki djúptenging #companies/<id>');
})();
/* === END FYRIRTÆKI DJÚPTENGING === */
