/* === FYRIRTÆKI: DJÚPTENGING #companies/<id> (357) ===============================
 *
 * Agnar 06.09.2026 (Drög-stöð): „geturðu linkað fyrirtækin inn á fyrirtækjaprófílinn". Hubbinn
 * (brunaholf.netlify.app, Drög-stöð + Efniskostnaður) vísar nú á
 *     https://slokkvitaeki.netlify.app/#companies/<fyrirtaeki.id>
 * Þessi pappi les hana: skiptir á Fyrirtæki-sýnina, bíður eftir fyrirtækjalistanum og opnar
 * prófílinn (Companies.openDetail), hreinsar svo slóðina í #companies svo 218-routing sjái
 * hreint slug. Virkar líka inni í öppunum (Fjármál/Boss): hubbinn í iframe setur hash á
 * foreldrið → hashchange hér → prófíllinn opnast án endurhleðslu.
 * Líka #fyrirtaeki/<id>. Ekkert skrifað; 153/187 ÓSNERT.
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
      try { if (window.App && App.switchView) App.switchView('companies'); } catch (_) {}
      const t0 = Date.now();
      while (!(window.Companies && Companies.list && Companies.list.length && Companies.openDetail) && Date.now() - t0 < 25000) {
        // listinn hleðst með Ársskoðun/Fyrirtæki-sýnunum — ýta við honum ef hann er tómur
        try { if (window.Companies && !((Companies.list || []).length) && typeof Companies.load === 'function') Companies.load(); } catch (_) {}
        await sl(400);
      }
      await sl(300);
      try { Companies.openDetail(id); } catch (e) { console.warn('[357] openDetail', e); }
      try { history.replaceState(null, '', location.pathname + location.search + '#companies'); } catch (_) {}
    } finally { busy = false; }
  }
  function check() { const id = parse(); if (id) go(id); }
  window.addEventListener('hashchange', check);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(check, 800)); else setTimeout(check, 800);
  window.CoDeeplink = { open: go, parse, version: '357' };
  console.log('[patch-357] fyrirtæki djúptenging #companies/<id>');
})();
/* === END FYRIRTÆKI DJÚPTENGING === */
