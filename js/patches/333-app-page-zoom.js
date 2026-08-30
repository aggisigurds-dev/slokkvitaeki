/* === HUB: SÍÐUZOOOM − / + Á ALLRI SÍÐUNNI (333) ============================
 *
 * Agnar 2026-08-29: hard −/+ áttu að minnka ALLAN hubbinn, ekki bara
 * Ársskoðunar-töfluskrunarann, og halda zoom-inu á Fjármálum / Stilla /
 * öðrum síðum þar til hann breytir því.
 *
 * 2026-08-30: CSS zoom á html skildi eftir dauðan viewport á Android —
 * innihaldið minnkaði en overflow óx ekki, svo ekki var hægt að skruna
 * í tóma beige-svæðið né ná í klippta dálka. Zoom fer nú á innri
 * #app-zoom-root með min-width/min-height = viewport / zoom, og html/body
 * eru skrunarar. − / % / + / 1:1 situr UTAN ræturinnar (visual viewport).
 *
 *   localStorage.app_page_zoom  sjálfgefið 1 uns hann ýtir á takkana
 *   Fastur − / % / + / 1:1 rofi á öllum síðum (ekki bara Skjár-borðanum)
 *
 * 153/187-reikningur er ÓSNERT.
 * ========================================================================== */
(() => {
  if (window.__appPageZoom333) return;
  window.__appPageZoom333 = true;

  const LS = 'app_page_zoom';
  const BAR_ID = '_app-zoom';
  const ROOT_ID = 'app-zoom-root';
  const SPACER_ID = '_app-zoom-spacer';
  const STYLE_ID = 'app-page-zoom-333';
  const MIN = 0.15;
  const MAX = 3;
  const STEPS = [0.15, 0.22, 0.3, 0.4, 0.5, 0.62, 0.75, 0.88, 1, 1.15, 1.35, 1.6, 2, 2.5, 3];
  const PINCH_VP = 'width=device-width, initial-scale=1, minimum-scale=0.1, maximum-scale=5, user-scalable=yes, viewport-fit=cover';

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
  function syncViewport() {
    if (scale === 1) return;
    try {
      const vp = vpEl();
      if (vp.getAttribute('content') !== PINCH_VP) vp.setAttribute('content', PINCH_VP);
    } catch (_) {}
  }

  function keepOut(n) {
    if (!n || !n.id) return false;
    return n.id === BAR_ID || n.id === ROOT_ID || n.id === SPACER_ID;
  }

  function ensureRoot() {
    if (!document.body) return null;
    let root = document.getElementById(ROOT_ID);
    if (!root) {
      root = document.createElement('div');
      root.id = ROOT_ID;
      const bar = document.getElementById(BAR_ID);
      const move = [];
      for (let n = document.body.firstChild; n; n = n.nextSibling) {
        if (keepOut(n)) continue;
        move.push(n);
      }
      move.forEach(n => root.appendChild(n));
      if (bar && bar.parentNode === document.body) document.body.insertBefore(root, bar);
      else document.body.insertBefore(root, document.body.firstChild);
    }
    const bar = document.getElementById(BAR_ID);
    if (bar && bar.parentNode !== document.body) document.body.appendChild(bar);
    return root;
  }

  function clearHtmlBodyZoom() {
    try { document.documentElement.style.zoom = ''; } catch (_) {}
    try { if (document.body) document.body.style.zoom = ''; } catch (_) {}
    const app = document.getElementById('app');
    try { if (app) app.style.zoom = ''; } catch (_) {}
  }

  function dropSpacer() {
    const sp = document.getElementById(SPACER_ID);
    if (sp) try { sp.remove(); } catch (_) {}
  }

  function compensateOverflow() {
    if (scale === 1) { dropSpacer(); return; }
    const root = document.getElementById(ROOT_ID);
    if (!root) return;
    const z = scale;
    const wantW = Math.ceil((window.innerWidth || 390) / z);
    const wantH = Math.ceil((window.innerHeight || 800) / z);
    /* Inverse viewport only — do not copy scrollHeight into min-height
       (that compounds on reapply and balloons Verk to tens of thousands of px). */
    try {
      root.style.minWidth = wantW + 'px';
      root.style.minHeight = wantH + 'px';
    } catch (_) {}
    const layoutW = Math.max(wantW, root.scrollWidth || 0, root.offsetWidth || 0);
    const layoutH = Math.max(wantH, root.scrollHeight || 0, root.offsetHeight || 0);
    const se = document.scrollingElement || document.documentElement;
    const needX = layoutW * z > (window.innerWidth || 0) + 4;
    const needY = layoutH * z > (window.innerHeight || 0) + 4;
    const dead = se && se.scrollHeight <= se.clientHeight + 2 && se.scrollWidth <= se.clientWidth + 2;
    if (dead && (needX || needY || layoutH > wantH || layoutW > wantW)) {
      let sp = document.getElementById(SPACER_ID);
      if (!sp) {
        sp = document.createElement('div');
        sp.id = SPACER_ID;
        sp.setAttribute('aria-hidden', 'true');
        sp.style.cssText = 'position:absolute;left:0;top:0;pointer-events:none;visibility:hidden;z-index:-1;width:1px;height:1px';
        document.body.appendChild(sp);
      }
      sp.style.width = Math.max(layoutW, Math.ceil(layoutW * z)) + 'px';
      sp.style.height = Math.max(layoutH, Math.ceil(layoutH * z)) + 'px';
    } else if (!dead) {
      dropSpacer();
    }
  }

  function apply(z, persist) {
    scale = clamp(z);
    const html = document.documentElement;
    try {
      html.style.setProperty('--app-page-zoom', String(scale));
      html.classList.toggle('app-page-zoomed', scale !== 1);
    } catch (_) {}
    clearHtmlBodyZoom();
    const root = ensureRoot();
    if (root) {
      if (scale === 1) {
        root.style.zoom = '';
        root.style.minWidth = '';
        root.style.minHeight = '';
        root.style.width = '';
        dropSpacer();
      } else {
        root.style.zoom = String(scale);
        root.style.minWidth = 'calc(100vw / var(--app-page-zoom))';
        root.style.minHeight = 'calc(100dvh / var(--app-page-zoom))';
        root.style.width = 'max-content';
      }
    }
    const bar = document.getElementById(BAR_ID);
    if (bar) {
      bar.classList.toggle('on', scale !== 1);
      bar.style.zoom = '';
      const pct = bar.querySelector('#_app-zoom-pct');
      if (pct) pct.textContent = Math.round(scale * 100) + '%';
    }
    syncViewport();
    if (persist !== false) write(scale);
    requestAnimationFrame(() => {
      compensateOverflow();
      requestAnimationFrame(compensateOverflow);
    });
    setTimeout(compensateOverflow, 80);
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
    const Z = 'html.app-page-zoomed';
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
      '#' + ROOT_ID + '{display:contents}',
      Z + ' #' + ROOT_ID + '{display:block;box-sizing:border-box;width:max-content;'
        + 'min-width:calc(100vw / var(--app-page-zoom,1));'
        + 'min-height:calc(100dvh / var(--app-page-zoom,1))}',
      Z + ',' + Z + ' body,'
        + Z + '[data-viewmode="mobile"],' + Z + '[data-viewmode="mobile"] body,'
        + Z + ' body.appmode'
        + '{overflow:auto!important;overflow-x:auto!important;overflow-y:auto!important;'
        + 'height:auto!important;max-height:none!important;overscroll-behavior:auto;'
        + 'touch-action:pan-x pan-y pinch-zoom}',
      Z + ' body{display:block!important;position:relative;min-height:calc(100dvh / var(--app-page-zoom,1));'
        + 'min-width:calc(100vw / var(--app-page-zoom,1))}',
      Z + ' .view,' + Z + ' .view.active,'
        + Z + '[data-bstal-banner="on"] .view.active,'
        + Z + '[data-bstal-banner="on"][data-thm-preset="brunastal"] .view.active,'
        + Z + '[data-bstal-banner="on"][data-thm-preset="brunastal"] .view.active:not(#view-field):not(#view-counter):not(#view-workshop),'
        + Z + '[data-viewmode="mobile"] .view.active,'
        + Z + ' body.appmode .view.active'
        + '{width:100%!important;max-width:none!important;min-width:100%!important;'
        + 'height:auto!important;max-height:none!important;'
        + 'min-height:calc(100dvh / var(--app-page-zoom,1))!important;'
        + 'overflow:visible!important;overflow-x:auto!important;overflow-y:visible!important}',
      Z + '[data-viewmode="mobile"] .view.active,'
        + Z + ' body.appmode .view.active'
        + '{margin-left:0!important}',
      Z + ' #view-krofu-yfirlit,' + Z + ' #view-opp,' + Z + ' #view-brunakerfi-yfirlit,'
        + Z + ' #view-arsskodun,' + Z + ' #view-counter,' + Z + ' #view-workshop,'
        + Z + ' body.appmode #view-krofu-yfirlit,'
        + Z + ' body.appmode #view-arsskodun,'
        + Z + '[data-viewmode="mobile"] #view-krofu-yfirlit,'
        + Z + '[data-viewmode="mobile"] #view-arsskodun'
        + '{overflow:auto!important;overflow-x:auto!important;overflow-y:auto!important;'
        + 'max-width:none!important}',
      Z + ' #view-arsskodun ._ars-tblscroll,'
        + Z + ' #view-arsskodun .data-table-scroll,'
        + Z + ' #view-arsskodun .data-table-wrap,'
        + Z + ' #view-arsskodun ._arsm-tbl,'
        + Z + ' #view-arsskodun #ars-main'
        + '{overflow:auto!important;overflow-x:auto!important;overflow-y:auto!important;'
        + 'max-width:none!important;max-height:none!important;height:auto!important;'
        + 'min-width:0}',
      Z + ' #view-arsskodun table.data-table,'
        + Z + ' #view-arsskodun ._ars-tblscroll>table'
        + '{min-width:1100px!important;width:max-content!important;max-width:none!important}',
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
    if (s.parentNode && s.parentNode.lastElementChild !== s) s.parentNode.appendChild(s);
  }

  function ensureBar() {
    let bar = document.getElementById(BAR_ID);
    if (bar) {
      if (bar.parentNode && bar.parentNode !== document.body) document.body.appendChild(bar);
      return bar;
    }
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
    ensureRoot();
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
  window.addEventListener('resize', () => { if (scale !== 1) setTimeout(compensateOverflow, 40); });

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
    const mo = new MutationObserver(() => { if (scale !== 1) syncViewport(); });
    const startMo = () => {
      const vp = document.querySelector('meta[name="viewport"]');
      if (vp) mo.observe(vp, { attributes: true, attributeFilter: ['content'] });
    };
    if (document.head) startMo();
    else document.addEventListener('DOMContentLoaded', startMo, { once: true });
  } catch (_) {}

  try {
    const bodyMo = new MutationObserver(muts => {
      const root = document.getElementById(ROOT_ID);
      if (!root || !document.body) return;
      muts.forEach(m => {
        m.addedNodes.forEach(n => {
          if (n.parentNode !== document.body) return;
          if (keepOut(n)) return;
          try { root.appendChild(n); } catch (_) {}
        });
      });
    });
    const watchBody = () => {
      if (document.body) bodyMo.observe(document.body, { childList: true });
    };
    if (document.body) watchBody();
    else document.addEventListener('DOMContentLoaded', watchBody, { once: true });
  } catch (_) {}

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
  [200, 800, 2000].forEach(ms => setTimeout(boot, ms));

  window.AppPageZoom = { get: () => scale, set: apply, MIN, version: '333.1' };
  console.log('[patch-333] app page zoom (scroll-fix)');
})();
/* === END HUB SÍÐUZOOOM === */
