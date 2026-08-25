/* === CONTRAST CLARITY v1 =====================================================
 * Grey-on-grey / hidden-text sweep for the whole hub.
 *
 * Brunastál paints the page as brushed steel (#9ba1ad) under the banner.
 * Muted slate (#64748b / #94a3b8) and translucent white then vanish. Patch
 * 240 also forces every `.view h1/h2` to dark ink, which hides titles that
 * sit on the fire band, orange headers (Drög), and other colored bars.
 *
 * This patch does not edit theme-scoped.css (frozen). Invoice OUT / kennitala
 * / Payday paths are untouched — display CSS + a conservative contrast pass.
 * ========================================================================== */
(() => {
  if (window.__contrastClarityInstalled) return;
  window.__contrastClarityInstalled = true;

  const STYLE_ID = 'contrast-clarity-css';

  function injectCss() {
    let s = document.getElementById(STYLE_ID);
    if (!s) {
      s = document.createElement('style');
      s.id = STYLE_ID;
      (document.head || document.documentElement).appendChild(s);
    }
    s.textContent = [
      /* Keep author-intended WHITE headings (240's .view h1/h2 !important
         had been painting them navy on orange/dark bars). */
      '.view h1[style*="color:#fff"],.view h1[style*="color: #fff"],.view h1[style*="color:#ffffff"],',
      '.view h2[style*="color:#fff"],.view h2[style*="color: #fff"],.view h2[style*="color:#ffffff"],',
      '.view h3[style*="color:#fff"],.view h3[style*="color: #fff"]',
      '{color:#fff!important;text-shadow:0 2px 8px rgba(0,0,0,.55)!important}',

      /* Themed page titles live on the dark/fire band. */
      '.view .page-title h1,.view .thm .page-title h1,.view .app-page .page-title h1,',
      '.view .page-title h2,.view .bw-page-h1,.view .tbord-title,.view .ky-h1',
      '{color:#fff!important;text-shadow:0 2px 8px rgba(0,0,0,.55)!important}',
      '.view .page-title p,.view .thm .page-title p,.view .bw-page-sub,.view .tbord-note,.view .ky-sub',
      '{color:rgba(255,255,255,.9)!important}',
      '.view .page-title .ky-month,.view .page-title__tools,.view .page-title__tools .ky-month',
      '{color:#fff!important}',

      /* Colored page bars (Drög orange, similar headers): white title + sub. */
      '.view [style*="linear-gradient(135deg,#f59e0b"] h1,',
      '.view [style*="linear-gradient(135deg,#f59e0b"] h2,',
      '.view [style*="linear-gradient(135deg,#f59e0b"] > div:first-child > div',
      '{color:#fff!important}',
      '#view-drog h2{color:#fff!important;text-shadow:0 1px 2px rgba(0,0,0,.35)!important}',
      '#view-drog h2 + div{color:#fef3c7!important}',

      /* App-mode is a white canvas — dark titles, not white-on-white. */
      'body.appmode .view .page-title h1,body.appmode .view .page-title h2,',
      'body.appmode .view .bw-page-h1,body.appmode .view .ky-h1,body.appmode #view-drog h2',
      '{color:#11141c!important;text-shadow:none!important}',
      'body.appmode .view .page-title p,body.appmode .view .bw-page-sub,body.appmode .view .ky-sub,',
      'body.appmode #view-drog h2 + div',
      '{color:#334155!important}',

      /* Muted labels: dark enough on steel AND on white cards (WCAG AA). */
      '.view .muted,.view .text-muted,.view .empty-state,.view .empty-state .es-sub,.view .empty-state .es-title,',
      '.view .vb-empty,.view .vb-hint',
      '{color:#1e293b!important}',

      /* Placeholders must stay visible (240 already darkens the field itself). */
      '.view input::placeholder,.view textarea::placeholder,.view select::placeholder',
      '{color:#475569!important;opacity:1!important}',
      '.view .field-dark::placeholder,.view .darkfield::placeholder',
      '{color:#475569!important;opacity:1!important}',

      /* Search / tools on the dark band: white field, dark ink — never grey-on-grey. */
      '.view .page-title input,.view .page-title select,.view .field-dark,.view input.darkfield,',
      '.view .page-title__tools input,.view .page-title__tools select',
      '{background:#fff!important;color:#11141c!important;border:1px solid #cbd5e1!important}',

      /* Hero / dark-blue stat cards keep light figures. */
      '.view .stat-card--hero .stat-card__label{color:rgba(255,255,255,.86)!important}',
      '.view .stat-card--hero .stat-card__value,.view .stat-card--hero .ky-num{color:#fff!important}',
      '.view .stat-card__label{color:#334155!important}',
      '.view .stat-card__value{color:#0f172a!important}',
      '.view .stat-card--hero .stat-card__value{color:#fff!important}',

      /* Table body already dark in 240; keep header captions light-on-dark. */
      '.view table thead th{color:#fff!important}',

      /* Sidebar section labels were 30% white — bump so groups are findable. */
      '.nav-section-label{color:rgba(255,255,255,.72)!important}',
      '.vnav-btn{color:rgba(255,255,255,.88)!important}'
    ].join('');
    /* Keep this sheet last so it wins equal-specificity !important ties
       against Stílstjóri (#_pe-overrides) after that tag is injected. */
    if (s.parentNode) s.parentNode.appendChild(s);
  }

  function parseRgb(str) {
    const m = String(str || '').match(/rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/i);
    if (!m) return null;
    const aM = String(str).match(/rgba\(\s*[\d.]+,\s*[\d.]+,\s*[\d.]+,\s*([\d.]+)/i);
    return { r: +m[1], g: +m[2], b: +m[3], a: aM ? +aM[1] : 1 };
  }
  function srgb(c) {
    c = c / 255;
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  }
  function lum(c) {
    return 0.2126 * srgb(c.r) + 0.7152 * srgb(c.g) + 0.0722 * srgb(c.b);
  }
  function chroma(c) { return Math.max(c.r, c.g, c.b) - Math.min(c.r, c.g, c.b); }
  function ratio(a, b) {
    const x = lum(a), y = lum(b);
    const hi = Math.max(x, y), lo = Math.min(x, y);
    return (hi + 0.05) / (lo + 0.05);
  }
  function bgOf(el) {
    let n = el;
    while (n && n !== document.documentElement) {
      const cs = getComputedStyle(n);
      const c = parseRgb(cs.backgroundColor);
      if (c && c.a > 0.04) {
        if (!(c.r === 0 && c.g === 0 && c.b === 0 && c.a === 0)) return c;
      }
      n = n.parentElement;
    }
    return { r: 155, g: 161, b: 173, a: 1 }; /* steel fallback */
  }

  const SKIP = /^(SCRIPT|STYLE|SVG|PATH|CANVAS|VIDEO|IMG|BR|HR|SOURCE|LINK|META)$/;

  function hasOwnText(el) {
    for (let n = el.firstChild; n; n = n.nextSibling) {
      if (n.nodeType === 3 && String(n.textContent || '').trim()) return true;
    }
    return false;
  }

  function scan(root) {
    if (!root) return 0;
    let fixed = 0;
    const all = root.querySelectorAll('*');
    const limit = Math.min(all.length, 2500);
    for (let i = 0; i < limit; i++) {
      const el = all[i];
      if (SKIP.test(el.tagName)) continue;
      if (el.closest && (el.closest('#_pe-panel') || el.closest('#bstal-banner'))) continue;
      if (!hasOwnText(el)) continue;
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden') continue;
      if (parseFloat(cs.fontSize) < 8) continue;
      const fg = parseRgb(cs.color);
      if (!fg || fg.a < 0.2) continue;
      if (chroma(fg) >= 48) continue;          /* keep green/orange/blue figures */
      const bg = bgOf(el);
      if (!bg) continue;
      const greyishBg = chroma(bg) < 50;
      const greyishFg = chroma(fg) < 50;
      if (!greyishFg || !greyishBg) continue;
      if (ratio(fg, bg) >= 4.5) continue;
      const darkBg = lum(bg) < 0.45;
      el.style.setProperty('color', darkBg ? '#ffffff' : '#11141c', 'important');
      if (parseFloat(cs.opacity) < 0.55) el.style.setProperty('opacity', '1', 'important');
      fixed++;
    }
    return fixed;
  }

  let _t = null;
  function schedule(reason) {
    clearTimeout(_t);
    _t = setTimeout(() => {
      injectCss();
      const view = document.querySelector('.view.active') || document.querySelector('.view[style*="display: block"]');
      try { scan(view || document.body); } catch (e) { console.warn('[patch-313] scan', e); }
    }, reason === 'now' ? 20 : 180);
  }

  function wrapSwitch() {
    if (window.App && typeof App.switchView === 'function' && !App.switchView.__cxPatched) {
      const orig = App.switchView;
      App.switchView = function () {
        const r = orig.apply(this, arguments);
        schedule('switch');
        return r;
      };
      App.switchView.__cxPatched = true;
      return true;
    }
    return false;
  }

  function boot() {
    injectCss();
    wrapSwitch();
    [400, 1200].forEach(ms => setTimeout(wrapSwitch, ms));
    [200, 800, 2000, 5000].forEach(ms => setTimeout(() => { injectCss(); schedule('now'); }, ms));
    document.addEventListener('click', e => {
      const b = e.target && e.target.closest && e.target.closest('.vnav-btn,[data-view]');
      if (b) schedule('nav');
    }, true);
    window.addEventListener('hashchange', () => schedule('hash'));
    try {
      if (window.AppSettings && AppSettings.onChange) AppSettings.onChange(() => schedule('settings'));
    } catch (_) {}
  }

  injectCss();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  window.ContrastClarity = { rescan: () => schedule('now') };
  console.log('[patch-313] contrast clarity installed');
})();
/* === END CONTRAST CLARITY === */
