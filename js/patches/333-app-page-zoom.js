/* === HUB: SÍÐUZOOOM − / + Á ALLRI SÍÐUNNI (333) ============================
 *
 * Agnar 2026-08-29: hard −/+ áttu að minnka ALLAN hubbinn, ekki bara
 * Ársskoðunar-töfluskrunarann, og halda zoom-inu á Fjármálum / Stilla /
 * öðrum síðum þar til hann breytir því. Android (S26): CSS zoom á html
 * + viewport user-scalable svo venjulegt pinch virkar áfram.
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
    try { vpEl().setAttribute('content', PINCH_VP); } catch (_) {}
  }

  function apply(z, persist) {
    scale = clamp(z);
    const html = document.documentElement;
    const body = document.body;
    const zStr = scale === 1 ? '' : String(scale);
    try {
      html.style.zoom = zStr;
      html.style.setProperty('--app-page-zoom', String(scale));
      html.classList.toggle('app-page-zoomed', scale !== 1);
    } catch (_) {}
    /* Android WebView: body.zoom ef html.zoom er hunsað. Ekki BÆÐI, því þá
       tvöfaldast. Aðeins body ef html skilaði ekki. */
    try {
      if (body) {
        const got = String(html.style.zoom || '');
        if (zStr && got !== zStr) body.style.zoom = zStr;
        else if (!zStr) body.style.zoom = '';
      }
    } catch (_) {}
    const bar = document.getElementById(BAR_ID);
    if (bar) {
      bar.classList.toggle('on', scale !== 1);
      /* Gagnstæð zoom svo takkarnir haldist þrýstanlegir. */
      bar.style.zoom = scale === 1 ? '' : String(Math.round((1 / scale) * 1000) / 1000);
      const pct = bar.querySelector('#_app-zoom-pct');
      if (pct) pct.textContent = Math.round(scale * 100) + '%';
    }
    syncViewport();
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
      'html.app-page-zoomed,html.app-page-zoomed body{touch-action:pan-x pan-y pinch-zoom}',
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

  ['hashchange', 'popstate', 'pageshow'].forEach(ev =>
    window.addEventListener(ev, () => setTimeout(() => apply(scale, false), 0)));
  document.addEventListener('slokk-viewmode', () => setTimeout(() => apply(scale, false), 40));
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) apply(scale, false);
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
  [200, 800, 2000].forEach(ms => setTimeout(boot, ms));

  window.AppPageZoom = { get: () => scale, set: apply, MIN, version: '333' };
  console.log('[patch-333] app page zoom');
})();
/* === END HUB SÍÐUZOOOM === */
