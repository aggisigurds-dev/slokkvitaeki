/* === HUB: SÍÐUZOOOM − / + Á ALLRI SÍÐUNNI (333) ============================
 *
 * Agnar 2026-08-29: hard −/+ áttu að minnka ALLAN hubbinn.
 * 2026-08-30: CSS zoom á html / #app-zoom-root skildi eftir dauðan beige
 * „frímerkis" viewport sem fylgdi ekki. Brunahólf Fjármála-yfirlit notar
 * native visual viewport (width=device-width, initial-scale=1, pinch).
 *
 * − / + breyta SAMA hlut og vafrinn: viewport initial-scale. Aldrei
 * html { zoom } / #app-zoom-root { zoom }. Pinch er source of truth;
 * takkarnir eru þægindi ofan á því (aðeins zoom IN, svo síðan fyllir
 * skjáinn í stað þess að minnka).
 *
 *   localStorage.app_page_zoom  sjálfgefið 1
 *
 * 153/187-reikningur er ÓSNERT.
 * ========================================================================== */
(() => {
  if (window.__appPageZoom333) return;
  window.__appPageZoom333 = true;

  const LS = 'app_page_zoom';
  const BAR_ID = '_app-zoom';
  const STYLE_ID = 'app-page-zoom-333';
  // 2026-09-01 (Agnar): „the zoom button actually means enlarge content or
  // shrink content. because i can still use pince zoom." Rétt greint — og
  // kóðinn staðfesti það: −/+ skrifuðu `initial-scale` í viewport-taggið, sem
  // er BÓKSTAFLEGA sama vélin og fingraklípan. MIN var 1, svo „−" komst aldrei
  // niður fyrir 100% (sjá gömlu athugasemdina: „aðeins zoom IN").
  // Takkarnir gerðu því tvennt í senn: hermdu eftir klípunni og gátu bara
  // stækkað. Núna skala þeir INNIHALDIÐ og mega fara NIÐUR fyrir 100%, svo
  // meira komist á skjáinn. Klípan er áfram ósnert og sér um stækkunarglerið.
  const MIN = 0.7;
  const MAX = 2;
  const STEPS = [0.7, 0.8, 0.9, 1, 1.15, 1.35, 1.6, 2];
  const HUB_VP = 'width=device-width, initial-scale=1, user-scalable=yes, viewport-fit=cover';

  function clamp(s) {
    s = +s;
    if (!isFinite(s)) s = 1;
    return Math.round(Math.min(MAX, Math.max(MIN, s)) * 100) / 100;
  }
  function read() {
    try {
      const z = parseFloat(localStorage.getItem(LS) || '');
      if (z >= MIN && z <= MAX) return clamp(z);
    } catch (_) {}
    return 1;
  }
  function write(z) {
    try { localStorage.setItem(LS, String(z)); } catch (_) {}
  }

  let scale = read();

  function vpEl() {
    let vp = document.querySelector('meta[name="viewport"]');
    if (!vp) {
      vp = document.createElement('meta');
      vp.setAttribute('name', 'viewport');
      (document.head || document.documentElement).appendChild(vp);
    }
    return vp;
  }
  // Viewport-taggið er NÚ ALLTAF native. Áður var `initial-scale` skrifað hér
  // og það var einmitt vandinn: takkarnir hreyfðu sama stýri og fingraklípan,
  // svo þeir bættu engu við hana. Klípan á viewport-ið ein; takkarnir skala
  // innihaldið (sjá contentZoomCss).
  function viewportContent() { return HUB_VP; }
  function syncViewport() {
    try {
      const vp = vpEl();
      const next = viewportContent();
      if (vp.getAttribute('content') !== next) vp.setAttribute('content', next);
    } catch (_) {}
  }

  function clearCssZoom() {
    const nodes = [document.documentElement];
    if (document.body) nodes.push(document.body);
    ['app', 'app-zoom-root'].forEach(id => {
      const el = document.getElementById(id);
      if (el) nodes.push(el);
    });
    nodes.forEach(n => {
      try {
        n.style.zoom = '';
        n.style.removeProperty('zoom');
      } catch (_) {}
    });
  }

  function apply(z, persist) {
    scale = clamp(z);
    const html = document.documentElement;
    try {
      html.style.setProperty('--app-page-zoom', String(scale));
      html.classList.toggle('app-page-zoomed', scale !== 1);
    } catch (_) {}
    clearCssZoom();
    syncViewport();
    const bar = document.getElementById(BAR_ID);
    if (bar) {
      bar.classList.toggle('on', scale !== 1);
      bar.style.zoom = '';
      const pct = bar.querySelector('#_app-zoom-pct');
      if (pct) pct.textContent = Math.round(scale * 100) + '%';
    }
    if (persist !== false) write(scale);
  }

  function step(dir) {
    if (dir < 0) {
      let j = STEPS.length - 1;
      while (j > 0 && STEPS[j] >= scale - 0.001) j--;
      return STEPS[j];
    }
    let k = 0;
    while (k < STEPS.length - 1 && STEPS[k] <= scale + 0.001) k++;
    return STEPS[k];
  }

  function css() {
    return [
      '#' + BAR_ID + '{position:fixed;top:calc(env(safe-area-inset-top,0px) + 52px);right:8px;z-index:2147483600;'
        + 'display:flex;align-items:center;gap:4px;padding:4px;border-radius:12px;'
        + 'background:rgba(255,255,255,.94);border:1px solid #cfd4dc;box-shadow:0 6px 18px -8px rgba(15,23,42,.45);'
        + 'touch-action:manipulation;box-sizing:border-box}',
      '#' + BAR_ID + '>button{flex:0 0 auto;min-width:40px;min-height:40px;margin:0;padding:0;'
        + 'border:1px solid #cfd4dc;border-radius:9px;background:#fff;color:#1e293b;'
        + 'font:700 18px/1 system-ui,sans-serif;cursor:pointer;touch-action:manipulation}',
      '#' + BAR_ID + '>button#_app-zoom-reset{font-size:11px;min-width:44px}',
      '#' + BAR_ID + ' #_app-zoom-pct{flex:0 0 auto;min-width:40px;text-align:center;'
        + 'font:700 12px ui-monospace,SFMono-Regular,Menlo,monospace;color:#334155}',
      'html,body,#app,#app-zoom-root{touch-action:pan-x pan-y pinch-zoom}',

      /* ── INNIHALDS-SKÖLUNIN ────────────────────────────────────────────────
         Skalað er á `.view` — efnissvæðinu — EKKI á html/body. Sú leið var
         reynd 2026-08-30 og skildi eftir dauðan beige „frímerkis"-viewport:
         html-kassinn minnkaði en viewport-ið fylgdi ekki. (Athugasemdin vísar
         í #app / #app-zoom-root; hvorugt er til í index.html — mælt, 0 tilvik
         — svo skölunin lenti óhjákvæmilega á html.) `.view` er venjulegur
         blokkur inni í flæðinu og hefur enga slíka viewport-tengingu.

         TVÆR LEIÐRÉTTINGAR SEM ERU EKKI VALFRJÁLSAR:

         1. BREIDDIN. 261:702 negldi `width:100vw!important` á `.view` í
            app-ham. Zoom margfaldar þá tölu, svo við 0,7 yrði sýnin 70vw og
            30vw af beige stæði eftir — nákvæmlega gamla gallinn. Deilt með
            skalanum: 100vw/0,7 = 143vw, sem málast sem 100vw.

         2. FYLLINGIN UNDIR FÖSTU CHROME-I. Botnstikan og toppstikan eru
            `position:fixed` og skalast EKKI með. Fyllingin sem heldur efninu
            frá þeim er hins vegar inni í `.view` og skalast. Við 0,7 yrði
            140px fyllingin að 98px meðan stikan er áfram 140px há — síðasta
            röðin hyrfi undir hana. Deilt með skalanum líka. */
      /* SÍMA/APP-HAMUR EINGÖNGU. 100vw-leiðréttingin á breiddinni gildir bara
         þar sem 261 negldi `width:100vw` (app-hamur). Á skjáborði hefur `.view`
         `margin-left` fyrir hliðarstikuna og er EKKI 100vw — óskorðuð regla
         hefði þvingað 100vw/z þar og rifið skjáborðsútlitið í sundur. Zoom-
         stikan sjálf er hvort eð er falin á breiðum skjá með fínbendli (reglan
         neðst), svo þetta er engin skerðing í reynd. */
      'html.app-page-zoomed body.appmode .view.active,'
        + 'html.app-page-zoomed[data-viewmode="mobile"] .view.active{'
        + 'zoom:var(--app-page-zoom);'
        + 'width:calc(100vw / var(--app-page-zoom))!important;'
        + 'max-width:calc(100vw / var(--app-page-zoom))!important;'
        + 'min-height:calc(100vh / var(--app-page-zoom))}',
      'html.app-page-zoomed body.appmode .view.active{'
        + 'padding-top:calc(50px / var(--app-page-zoom))!important;'
        + 'padding-bottom:calc((140px + env(safe-area-inset-bottom,0px)) / var(--app-page-zoom))!important}',
      'html.app-page-zoomed body.appmode.appmode-nonav .view.active{'
        + 'padding-bottom:calc(24px / var(--app-page-zoom))!important}',
      '@media (min-width:1100px) and (pointer:fine){'
        + '#' + BAR_ID + ':not(.on){display:none}'
        + '}'
    ].join('\n');
  }

  function mountCss() {
    let s = document.getElementById(STYLE_ID);
    if (!s) {
      s = document.createElement('style');
      s.id = STYLE_ID;
      (document.head || document.documentElement).appendChild(s);
    }
    s.textContent = css();
  }

  function ensureBar() {
    let bar = document.getElementById(BAR_ID);
    if (bar) return bar;
    bar = document.createElement('div');
    bar.id = BAR_ID;
    bar.setAttribute('role', 'group');
    bar.setAttribute('aria-label', 'Síðuzoom');
    bar.innerHTML =
      '<button type="button" data-az="out" title="Minnka alla síðuna" aria-label="Minnka">−</button>' +
      '<span id="_app-zoom-pct">100%</span>' +
      '<button type="button" data-az="in" title="Stækka alla síðuna" aria-label="Stækka">+</button>' +
      '<button type="button" id="_app-zoom-reset" data-az="reset" title="Aftur í 100%">1:1</button>';
    bar.querySelectorAll('[data-az]').forEach(b => {
      b.addEventListener('click', e => {
        e.preventDefault();
        e.stopPropagation();
        const k = b.getAttribute('data-az');
        if (k === 'out') apply(step(-1));
        else if (k === 'in') apply(step(1));
        else apply(1);
      });
    });
    (document.body || document.documentElement).appendChild(bar);
    bar.classList.toggle('on', scale !== 1);
    return bar;
  }

  function boot() {
    mountCss();
    ensureBar();
    apply(scale, false);
  }

  function reapply() { apply(scale, false); }

  ['hashchange', 'popstate', 'pageshow'].forEach(ev =>
    window.addEventListener(ev, () => setTimeout(reapply, 0)));
  document.addEventListener('slokk-viewmode', () => setTimeout(reapply, 40));
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) reapply();
  });

  function wrapSwitch() {
    try {
      if (!window.App || typeof App.switchView !== 'function' || App.switchView.__appZoom333) return false;
      const orig = App.switchView;
      App.switchView = function () {
        const r = orig.apply(this, arguments);
        setTimeout(reapply, 0);
        setTimeout(reapply, 80);
        return r;
      };
      App.switchView.__appZoom333 = true;
      return true;
    } catch (_) { return false; }
  }
  wrapSwitch();
  [200, 800, 2000].forEach(ms => setTimeout(wrapSwitch, ms));

  try {
    const mo = new MutationObserver(() => { syncViewport(); });
    const startMo = () => {
      const vp = document.querySelector('meta[name="viewport"]');
      if (vp) mo.observe(vp, { attributes: true, attributeFilter: ['content'] });
    };
    if (document.head) startMo();
    else document.addEventListener('DOMContentLoaded', startMo, { once: true });
  } catch (_) {}

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
  [200, 800, 2000].forEach(ms => setTimeout(boot, ms));

  window.AppPageZoom = { get: () => scale, set: apply, MIN, version: '333-native' };
  window.SlokkHubViewport = HUB_VP;
  console.log('[patch-333] app page zoom (native viewport)');
})();
/* === END HUB SÍÐUZOOOM === */
