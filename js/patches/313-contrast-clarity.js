/* === CONTRAST CLARITY v3 =====================================================
 * Grey-on-grey / hidden-text sweep for the whole hub.
 *
 * Brunastál paints the page as brushed steel (#9ba1ad) under the banner.
 * Patch 230 prefixes `html[data-thm-preset="brunastal"]` and paints titles
 * WHITE (meant for a dark band behind the fire banner) plus 55–74% white
 * subtitles — both vanish on steel. This sheet uses the SAME prefix so it
 * actually wins, then a scan inks leftover mid-grey pairs.
 *
 * Frozen theme-scoped.css is not edited. Invoice OUT / kennitala / Payday
 * paths are untouched.
 * ========================================================================== */
(() => {
  if (window.__contrastClarityInstalled) return;
  window.__contrastClarityInstalled = true;

  const STYLE_ID = 'contrast-clarity-css';
  const INK = '#11141c';
  const INK_MUTED = '#1e293b';
  const B = 'html[data-thm-preset="brunastal"] ';
  const steel = () => ({ r: 155, g: 161, b: 173, a: 1 });

  function prefixed(sel) {
    const parts = [];
    let buf = '', q = null;
    const str = String(sel);
    for (let i = 0; i < str.length; i++) {
      const ch = str[i];
      if (q) { if (ch === q) q = null; buf += ch; continue; }
      if (ch === '"' || ch === "'") { q = ch; buf += ch; continue; }
      if (ch === ',') { if (buf.trim()) parts.push(buf.trim()); buf = ''; continue; }
      buf += ch;
    }
    if (buf.trim()) parts.push(buf.trim());
    return parts.map(p => B + p).join(',');
  }

  function injectCss() {
    let s = document.getElementById(STYLE_ID);
    if (!s) {
      s = document.createElement('style');
      s.id = STYLE_ID;
      (document.head || document.documentElement).appendChild(s);
    }
    s.textContent = [
      ':root{--ink-on-steel:' + INK + '!important;--ink-muted-readable:' + INK_MUTED + '!important}',

      /* Beat 230's html[data-thm-preset] .view h1 {#fff} — titles sit on steel. */
      prefixed('.view h1,.view h2,.view h3,' +
        '.view > .main-panel > h1:first-child,.view > h1:first-child,' +
        '.view > .main-panel > div > h1:first-child,' +
        '.view .page-title h1,.view .thm .page-title h1,.view .app-page .page-title h1,' +
        '.view .bw-page-h1,.view .tbord-title,.view .ky-h1'),
      '{color:' + INK + '!important;text-shadow:none!important}',

      prefixed('.view .page-title p,.view .thm .page-title p,.view .bw-page-sub,' +
        '.view ._ars-sub,.view ._cl_subtitle,.view .tbord-note,.view .ky-sub,' +
        '.view h1 + div,.view h1 + p,.view h2 + div,.view h2 + p,' +
        '#view-allir-vidsk h1 + div,#view-krofu-yfirlit .page-title p'),
      '{color:' + INK_MUTED + '!important;text-shadow:none!important}',

      /* Author-intended WHITE headings on a coloured/dark bar (inline). */
      prefixed('.view h1[style*="color:#fff"],.view h1[style*="color: #fff"],.view h1[style*="color:#ffffff"],' +
        '.view h2[style*="color:#fff"],.view h2[style*="color: #fff"],.view h2[style*="color:#ffffff"]'),
      '{color:#fff!important;text-shadow:0 2px 8px rgba(0,0,0,.55)!important}',

      prefixed('.view .page-title .ky-month,.view .page-title__tools .ky-month'),
      '{color:' + INK + '!important}',

      /* Drög orange bar — ID beats the brunastál h2 dark lock. */
      '#view-drog h2{color:#fff!important;text-shadow:0 1px 2px rgba(0,0,0,.35)!important}',
      '#view-drog h2 + div{color:#fef3c7!important}',

      '#view-arsskodun h1,#view-hreyfingarlisti h1,#view-income h1,',
      '#view-workshop .bw-page-h1,#view-companies h1,#view-bokhalds-yfirlit h1',
      '{color:' + INK + '!important;text-shadow:none!important}',
      '#view-arsskodun ._ars-sub,#view-hreyfingarlisti .page-title p,',
      '#view-krofu-yfirlit .page-title p,#view-income h1 + div,#view-income .page-title p',
      '{color:' + INK_MUTED + '!important;text-shadow:none!important}',
      '#view-verkbord [style*="font-size:28px"]{color:' + INK + '!important;text-shadow:none!important}',
      '#view-verkbord #vb-morgun,',
      '#view-verkbord div[style*="rgba(255,255,255,.6)"],',
      '#view-verkbord div[style*="rgba(255,255,255,.55)"]',
      '{color:' + INK_MUTED + '!important}',
      '#view-verkbord [style*="color:#64748b"],#view-verkbord [style*="color:#94a3b8"],',
      '#view-verkbord [style*="color:#6b7280"],#view-verkbord [style*="color:#475569"]',
      '{color:' + INK_MUTED + '!important}',
      prefixed('.view [style*="linear-gradient(135deg,#f59e0b"] h1,' +
        '.view [style*="linear-gradient(135deg,#f59e0b"] h2,' +
        '.view [style*="linear-gradient(135deg,#f59e0b"] > div:first-child > div'),
      '{color:#fff!important}',

      /* App-mode: force dark on white canvas. */
      'body.appmode .view .page-title h1,body.appmode .view .page-title h2,',
      'body.appmode .view .bw-page-h1,body.appmode .view .ky-h1,body.appmode #view-drog h2',
      '{color:' + INK + '!important;text-shadow:none!important}',
      'body.appmode .view .page-title p,body.appmode .view .bw-page-sub,body.appmode .view .ky-sub,',
      'body.appmode #view-drog h2 + div',
      '{color:#334155!important}',

      prefixed('.view .muted,.view .text-muted,.view .empty-state,.view .empty-state .es-sub,' +
        '.view .empty-state .es-title,.view .vb-empty,.view .vb-hint,.view .sec-label,' +
        '.view .empty,.view .loading-state,.view .kt,.view .kennitala'),
      '{color:' + INK_MUTED + '!important}',
      prefixed('.view .empty-state .es-sub'),
      '{color:#334155!important}',

      prefixed('.view [style*="color:#64748b"],.view [style*="color: #64748b"],' +
        '.view [style*="color:#94a3b8"],.view [style*="color: #94a3b8"],' +
        '.view [style*="color:#9ca3af"],.view [style*="color: #9ca3af"],' +
        '.view [style*="color:#6b7280"],.view [style*="color: #6b7280"],' +
        '.view [style*="color:#9aa3b3"],.view [style*="color:#8891a0"],' +
        '.view [style*="color:#5b6472"],.view [style*="color:#5b6573"],' +
        '.view [style*="color:#8a93a5"],.view [style*="color:#9aa1ab"]'),
      '{color:' + INK_MUTED + '!important}',

      /* Translucent white (230 subtitles) on steel → dark ink. */
      prefixed('.view [style*="color:rgba(255,255,255,.6)"],' +
        '.view [style*="color:rgba(255,255,255, .6)"],' +
        '.view [style*="color:rgba(255,255,255,.55)"],' +
        '.view [style*="color:rgba(255,255,255,.62)"],' +
        '.view [style*="color:rgba(255,255,255,.74)"]'),
      '{color:' + INK_MUTED + '!important}',

      prefixed('.view .cw-col-head,.view .cw-col-head *,' +
        '.view .cw-toolbar,.view .cw-toolbar > span,.view .cw-toolbar > div:first-child,' +
        '.view #counter-sidebar,.view #counter-sidebar > span'),
      '{color:#e8edf5!important}',
      prefixed('.view .cw-col-title[style*="#64748b"]') + '{color:#d5dbe6!important}',
      prefixed('.view .cw-col-title[style*="#d97706"]') + '{color:#f6b545!important}',
      prefixed('.view .cw-col-title[style*="#059669"]') + '{color:#34d399!important}',
      prefixed('.view .cw-col-title[style*="#0d6efd"]') + '{color:#6ea8ff!important}',
      prefixed('.view .cw-col-sub') + '{color:rgba(255,255,255,.82)!important}',
      prefixed('.view .cw-archive span') + '{color:#e7eaf0!important}',

      prefixed('.view input::placeholder,.view textarea::placeholder,.view select::placeholder'),
      '{color:#475569!important;opacity:1!important}',
      'input::placeholder,textarea::placeholder{color:#475569!important;opacity:1!important}',
      prefixed('.view .field-dark::placeholder,.view .darkfield::placeholder'),
      '{color:#475569!important;opacity:1!important}',

      prefixed('.view .page-title input,.view .page-title select,.view .field-dark,.view input.darkfield,' +
        '.view .page-title__tools input,.view .page-title__tools select'),
      '{background:#fff!important;color:' + INK + '!important;border:1px solid #cbd5e1!important}',

      prefixed('.view .stat-card--hero .stat-card__label') + '{color:rgba(255,255,255,.86)!important}',
      prefixed('.view .stat-card--hero .stat-card__value,.view .stat-card--hero .ky-num') + '{color:#fff!important}',
      prefixed('.view .stat-card__label') + '{color:#334155!important}',
      prefixed('.view .bstal-hero,.view .bstal-hero *,.view .hero-stat,.view .hero-stat *'),
      '{color:#fff!important}',

      prefixed('.view table thead th,.view table thead th *,.view table thead .sort-ar'),
      '{color:#fff!important}',

      '.nav-section-label{color:rgba(255,255,255,.82)!important}',
      '.vnav-btn{color:rgba(255,255,255,.92)!important}',
      '#gs-trigger{background:#fff!important;color:' + INK + '!important;border:1px solid #cbd5e1!important;opacity:1!important}',
      '#gs-trigger kbd{color:#334155!important;background:#e2e8f0!important}'
    ].join('');
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
  function isPageSurface(el) {
    return !!(el.matches && el.matches('html,body,.view,.main-panel,.app-page,.app-main,.thm,main.app-main'));
  }
  function firstStop(img) {
    const m = String(img || '').match(/rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/);
    return m ? { r: +m[1], g: +m[2], b: +m[3], a: 1 } : null;
  }
  function bgOf(el) {
    let n = el;
    while (n && n !== document.documentElement) {
      const cs = getComputedStyle(n);
      const img = cs.backgroundImage;
      const hasImg = img && img !== 'none';
      const page = isPageSurface(n);
      if (hasImg && !page) {
        return firstStop(img) || { r: 18, g: 20, b: 28, a: 1 };
      }
      const c = parseRgb(cs.backgroundColor);
      if (c && c.a > 0.08 && !(c.r === 0 && c.g === 0 && c.b === 0 && c.a === 0)) return c;
      n = n.parentElement;
    }
    return steel();
  }

  const SKIP_TAG = /^(SCRIPT|STYLE|SVG|PATH|CANVAS|VIDEO|IMG|BR|HR|SOURCE|LINK|META)$/;
  const SKIP_CLOSEST = '#_pe-panel,#bstal-banner,thead,.cw-col-head,.cw-toolbar,#counter-sidebar,.stat-card--hero,.bstal-hero,.hero-stat,.ky-navbtn';

  function hasOwnText(el) {
    for (let n = el.firstChild; n; n = n.nextSibling) {
      if (n.nodeType === 3 && String(n.textContent || '').trim()) return true;
    }
    return false;
  }

  const WHITE = { r: 255, g: 255, b: 255, a: 1 };
  const DARK = { r: 17, g: 20, b: 28, a: 1 };

  function pickInk(bg) {
    return ratio(DARK, bg) >= ratio(WHITE, bg) ? INK : '#ffffff';
  }
  function isSteelish(bg) {
    const L = lum(bg);
    return chroma(bg) < 42 && L > 0.22 && L < 0.62;
  }

  function scan(root) {
    if (!root) return 0;
    let fixed = 0;
    const all = root.querySelectorAll('*');
    const limit = Math.min(all.length, 6000);
    for (let i = 0; i < limit; i++) {
      const el = all[i];
      if (SKIP_TAG.test(el.tagName)) continue;
      if (el.closest && el.closest(SKIP_CLOSEST)) continue;
      if (!hasOwnText(el)) continue;
      // Stílstjórinn ræður (26.08): hlutur sem lit-regla notandans nær yfir
      // (sjálfur eða gegnum erfðir) fær EKKI inline-blek frá skannanum.
      if (peGoverned(el)) continue;
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden') continue;
      if (parseFloat(cs.fontSize) < 8) continue;
      const fg0 = parseRgb(cs.color);
      if (!fg0 || fg0.a < 0.12) continue;
      const bg = bgOf(el);
      if (!bg) continue;
      const fg = {
        r: fg0.r * fg0.a + bg.r * (1 - fg0.a),
        g: fg0.g * fg0.a + bg.g * (1 - fg0.a),
        b: fg0.b * fg0.a + bg.b * (1 - fg0.a),
        a: 1
      };
      if (chroma(fg) >= 48) continue;
      if (isSteelish(bg)) {
        const lightOnSteel = lum(fg) > 0.62;
        if (!lightOnSteel && ratio(fg, bg) >= 4.5) continue;
        const size = parseFloat(cs.fontSize);
        const w = parseInt(cs.fontWeight, 10) || 400;
        el.style.setProperty('color', (size >= 20 || w >= 700) ? INK : INK_MUTED, 'important');
        el.setAttribute('data-cc313', '1');
        if (parseFloat(cs.opacity) < 0.7) el.style.setProperty('opacity', '1', 'important');
        fixed++;
        continue;
      }
      const greyishBg = chroma(bg) < 55;
      const greyishFg = chroma(fg) < 55;
      if (!greyishFg || !greyishBg) continue;
      if (ratio(fg, bg) >= 4.5) continue;
      el.style.setProperty('color', pickInk(bg), 'important');
      el.setAttribute('data-cc313', '1');
      if (parseFloat(cs.opacity) < 0.7) el.style.setProperty('opacity', '1', 'important');
      fixed++;
    }
    return fixed;
  }

  // Er hluturinn undir lit-reglu Stílstjórans? (262 birtir __peColorSels.)
  function peGoverned(el) {
    const sels = window.__peColorSels || [];
    for (let i = 0; i < sels.length; i++) {
      try { if (el.closest && el.closest(sels[i])) return true; } catch (_) {}
    }
    return false;
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

  function observe() {
    if (window.__cxMo) return;
    try {
      window.__cxMo = new MutationObserver(() => schedule('dom'));
      window.__cxMo.observe(document.body, { childList: true, subtree: true });
    } catch (_) {}
  }

  function boot() {
    injectCss();
    wrapSwitch();
    observe();
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
  console.log('[patch-313] contrast clarity v3 installed');
})();
/* === END CONTRAST CLARITY === */
