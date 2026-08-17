/* === ÚTLIT — FROSIÐ grunnútlit (220) ========================================
 *
 * 2026-08-17 (Agnar: „nota núverandi stillingar sem grunnstillingu, eyða öðrum
 * þemum og öllu sem tengist þemu-veseninu"): Þemakerfið var orðið margra laga
 * hakk — 11 forstillingar, ⚙️ Útlit-stjórnborð, accent/dark-rofar, vistun í
 * localStorage + AppSettings, og allt gat rekið í sundur milli tækja.
 *
 * Núverandi útlit er nú EINA grunnstillingin, hart kóðuð hér:
 *   🔥 Brunastál · rauður accent · eld-borði · ljóst · venjulegur þéttleiki.
 * Ekkert val, engin vistun, ekkert þemaflökt. Vilji menn þemaskipti síðar má
 * endurvekja gamla stjórnborðið úr git-sögunni (þessi skrá fyrir 2026-08-17).
 *
 * Skilur eftir NÁKVÆMLEGA það sem húð-patcharnir keyra á (229/230/240/245/250,
 * 224, 213, 11, 166 …): --thm-* tókenana + Stage-2 app-tókenana
 * (--brand/--ink1/--bg/--surface/…), data-thm-preset="brunastal",
 * data-thm-density="venju" og data-thm-dark="0". window.Theme stendur áfram sem
 * lágmarks-API svo eldri kallarar brotni ekki.
 * =========================================================================== */
(() => {
  if (window.Theme && window.Theme._installed) return;

  // Frosna stillingin — áður „brunastal"-færslan í PRESETS-safninu (m.a. muted
  // #5b6573 úr grey-on-grey lagfæringunni 2026-07-22, 5,91:1 á hvítu).
  const T = { bg:'#9ba1ad', card:'#ffffff', ink:'#11141c', muted:'#5b6573', line:'#e3e7ee',
              brand:'#c92a2a', primary:'#c92a2a', h1:'#11141c', h2:'#3a4250', h3:'#9098a6' };
  const FONT = '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif';

  function apply() {
    const r = document.documentElement.style;
    r.setProperty('--thm-bg', T.bg);     r.setProperty('--thm-card', T.card);
    r.setProperty('--thm-ink', T.ink);   r.setProperty('--thm-muted', T.muted);
    r.setProperty('--thm-line', T.line); r.setProperty('--thm-brand', T.brand);
    r.setProperty('--thm-primary', T.primary);
    r.setProperty('--thm-h1', T.h1); r.setProperty('--thm-h2', T.h2); r.setProperty('--thm-h3', T.h3);
    r.setProperty('--thm-sumh', T.brand);
    r.setProperty('--thm-fs', '1');
    r.setProperty('--thm-font', FONT);
    document.documentElement.setAttribute('data-thm-density', 'venju');
    document.documentElement.setAttribute('data-thm-preset', 'brunastal');
    document.documentElement.setAttribute('data-thm-dark', '0');
    // Stage 2: app-víðu tókenarnir (css/app.css :root) fylgja sömu litum svo
    // allt sem vísar í --brand/--ink1/--bg/--brd fær sama útlit.
    r.setProperty('--brand', T.primary);
    r.setProperty('--brand-dk', T.brand);
    r.setProperty('--ink1', T.ink);
    r.setProperty('--ink2', T.muted);
    r.setProperty('--bg', T.bg);
    r.setProperty('--bg2', T.card);
    r.setProperty('--surface', T.card);
    r.setProperty('--brd', T.line);
    r.setProperty('--sidebar-active-border', T.primary);
  }
  apply(); // strax við hleðslu, á undan flestum view-renderum (ekkert flash)

  // Val-leifar gamla kerfisins per tæki — hreinsað svo ekkert „muni" annað þema.
  // AppSettings 'ui_theme' stendur óhreyft (ekki eyða gögnum; enginn les það lengur).
  try { ['slokk_theme', 'brunastal_accent', 'bstal_prev_preset', '_thm_darkreset_v1'].forEach(k => localStorage.removeItem(k)); } catch (_) {}

  // Lágmarks-API í stað gamla Theme-kerfisins: set() skiptir ekki lengur um þema
  // heldur endur-applyar bara grunninn — eldri kallarar fá aldrei villu.
  const FROZEN = { preset:'brunastal', accent:null, fill:'solid', font:'system', fs:1, density:'venju', h1:null, h2:null, h3:null };
  window.Theme = {
    _installed: true,
    get: () => Object.assign({}, FROZEN),
    set: () => { apply(); },
    apply,
    open: () => {},
    PRESETS: { brunastal: { nm: '🔥 Brunastál', t: Object.assign({}, T) } },
    TOKENS: () => Object.assign({ sumh: T.brand }, T)
  };
  console.log('[patch-220] Frosið grunnútlit (brunastal) virkt — þemaskipti fjarlægð');
})();
/* === END ÚTLIT === */
