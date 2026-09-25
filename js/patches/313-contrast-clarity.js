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
    const cssNytt = [
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
        '.view [style*="color:#8a93a5"],.view [style*="color:#9aa1ab"],' +
        /* 23.09.2026: ljósu „tómt/ekkert"-tónarnir sem þemað skilur eftir ólæsilega.
         * #cbd2dc er var(--empty) skrifað beint inn (t.d. — strikið í þjónustudálki,
         * js/patches/157-allir-vidskiptavinir.js:1088). Hinir eru systkini hans. */
        '.view [style*="color:#cbd2dc"],.view [style*="color: #cbd2dc"],' +
        '.view [style*="color:#d8dde4"],.view [style*="color:#c3cad6"],' +
        '.view [style*="color:#aab3c0"],.view [style*="color:#a1a9b6"]'),
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

      /* ── 23.09.2026: grái textinn festur í CSS í stað þess að vera lagaður í hverri teikningu ──
       *
       * Agnar hefur setið uppi með þennan grámann síðan þemað var smíðað í ágúst. Skannarinn hér
       * að neðan hefur verið að laga hann — en aðeins EFTIR á, 180 ms eftir hver sýnarskipti, á
       * hverjum hlut fyrir sig. Þessar reglur gera það sama við fyrstu teikningu: enginn blossi,
       * enginn kostnaður, og skannarinn finnur ekkert eftir.
       *
       * Upprunareglurnar sem gáfu of ljósan tón (allar ætlaðar hvítu spjaldi, lenda á stáli):
       *     ._devs div.off b   var(--empty) #cbd2dc   js/patches/153-arsskodun.js:3847
       *     ._devs div.off i   #d8dde4                js/patches/153-arsskodun.js:3848
       *     ._yr (grunnur)     #aab3c0                js/patches/153-arsskodun.js:3825
       *     ._av-yr b          #aab3c0                js/patches/157-allir-vidskiptavinir.js:1001
       *     ._av-yr.none b     #c3cad6                js/patches/157-allir-vidskiptavinir.js:1005
       *     ._kt               #8a93a5                js/patches/157-allir-vidskiptavinir.js:982
       *     .vkm-num0          #a1a9b6                js/patches/390-verkstaedi-midar.js:218
       *     .tbm-sec-n         #2b313c á dökku        js/patches/389-tilbuin-midar.js:561
       *
       * HVER VELJARI VAR MÆLDUR á lifandi síðu áður en hann var skrifaður hér: hann hittir
       * NÁKVÆMLEGA þá hluti sem skannarinn merkti (`[data-cc313]`) og ENGAN annan. Þess vegna
       * standa :not()-in — án þeirra svertu reglurnar líka hvíta textann á grænu/rauðu/gullnu
       * ástandspillunum (mælt: ._av-yr b hittir 100, þar af 44 sem MÁ EKKI snerta).
       */
      prefixed('.view ._devs div.off b,.view ._devs div.off i'),
      '{color:' + INK + '!important}',
      prefixed('.view a._yr._yr-add:not(.on):not(.now):not(.both):not(.inv-only):not(.penda)'),
      '{color:' + INK + '!important}',
      prefixed('.view ._av-yr:not(.ok):not(.prev):not(.old) b'),
      '{color:' + INK + '!important}',
      prefixed('.view ._av-namecell span._kt'),
      '{color:' + INK + '!important}',
      prefixed('.view .vkm-num span.vkm-num0'),
      '{color:' + INK + '!important}',
      prefixed('.view .tbm-sec span.tbm-sec-n'),
      '{color:#fff!important}',
      /* Forgangs-punkturinn án forgangs (175:72 btnHtml — COLORS[0] + opacity .45).
       * `data-pri="0"` er nákvæmlega sá hópur; punktar MEÐ forgang bera 1/2/3 og halda
       * sínum lit. Mælt: 44 af 50 — hinir sex mega ekki breytast. */
      prefixed('.view ._pri-btn[data-pri="0"]'),
      '{color:' + INK + '!important;opacity:1!important}',
      /* Kröfu yfirlit — afritunartakkinn og Skýrslu-takkinn í ÓVIRKA ástandinu.
       * `.on`-útgáfan (31 af 52) er lituð og má ekki breytast; mælt á lifandi síðu. */
      prefixed('.view button._ky-copy-total'),
      '{color:' + INK_MUTED + '!important}',
      prefixed('.view ._ky-skyrsla:not(.on) span.ky-abtn-ico,.view ._ky-skyrsla:not(.on) span.ky-abtn-lbl'),
      '{color:' + INK + '!important}',

      '.nav-section-label{color:rgba(255,255,255,.82)!important}',
      '.vnav-btn{color:rgba(255,255,255,.92)!important}',
      '#gs-trigger{background:#fff!important;color:' + INK + '!important;border:1px solid #cbd5e1!important;opacity:1!important}',
      '#gs-trigger kbd{color:#334155!important;background:#e2e8f0!important}'
    ].join('');
    // 21.09.2026 (afköst, mælt á lifandi Ársskoðun): blaðið var endurskrifað og fært aftast við HVERJA DOM-breytingu á
    // síðunni (~2×/s) — hvort tveggja neyðir vafrann til að endurreikna útlit allra 23.000 hnúta. Nú aðeins þegar textinn
    // breytist, og aðeins fært ef ÓKUNNUGT blað er komið aftar (jafningjarnir 319 · 323 mega standa þar — annars
    // berjast blöðin þrjú endalaust um síðasta sætið).
    if (s.textContent !== cssNytt) s.textContent = cssNytt;
    const aftast = (() => { let n = s.nextElementSibling; while (n) { if (['_coldrag-css', 'contrast-clarity-css', '_pe-zones-css', '_pe-kanban-css'].indexOf(n.id) < 0) return false; n = n.nextElementSibling; } return true; })();
    if (s.parentNode && !aftast) s.parentNode.appendChild(s);
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
  // 22.09.2026: burstaði málmurinn (389/392) leggur hárþunna GLANSRÖND efst í
  // background-image: `repeating-linear-gradient(108deg,rgba(255,255,255,.05) …)`.
  // Fyrsti litur myndarinnar var þá nær-gegnsætt HVÍTT, skanninn las spjaldið sem
  // ljóst og þvingaði Playfair-töluna dökka á svartan málm (mælt á Brunakerfis
  // skoðun: 22 · 7 · 10 · 4 nánast ósýnileg). Hér er hoppað yfir stopp sem sjást
  // varla (alfa < .25) og fyrsti raunverulegi liturinn notaður.
  function firstStop(img) {
    const re = /rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)/g;
    let m, fallback = null;
    while ((m = re.exec(String(img || '')))) {
      const c = { r: +m[1], g: +m[2], b: +m[3], a: 1 };
      const alpha = m[4] === undefined ? 1 : +m[4];
      if (!fallback) fallback = c;
      if (alpha >= 0.25) return c;
    }
    return fallback;
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
  // 22.09.2026: .bw-page-hdr (Verkröð-titillinn) bætt við — hann situr á DÖKKA hluta
  // síðuhallans undir borðanum (~#3a3d41), en bgOf() les síðuna sem ljóst stál og
  // þvingaði titilinn dökkan (1,7:1). 390 stílar hann hvítan (11:1).
  // 22.09.2026: .kym-head (Kröfu yfirlit, 166 Skjár) — sama ástæða: hvítur titill á dökka bandinu.
  // 24.09.2026: #_uv-strip (328) situr í SVARTA REIKNINGUR-hausnum og ber sína eigin
  // ljósu liti. Skannin las bakgrunn pillnanna sem ljósan (þær eru hálfgegnsæjar) og
  // skrifaði dökkt blek á þær — dökkt á dökkt, ólæsilegt. Hausinn á sína liti sjálfur.
  const SKIP_CLOSEST = '#_pe-panel,#bstal-banner,thead,.cw-col-head,.cw-toolbar,#counter-sidebar,.stat-card--hero,.bstal-hero,.hero-stat,.ky-navbtn,.bw-page-hdr,.kym-head,._sk-hd,#_uv-strip,.b412-titill,._uv-rb,.b414-top';

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

  // 23.09.2026 (afköst) — LESA ALLT FYRST, SKRIFA SVO.
  //
  // Áður stóð `el.style.setProperty(...)` inni í lestrarlykkjunni sjálfri. Hvert
  // skrif ógildir stílinn, svo NÆSTA `getComputedStyle`/`bgOf` þvingaði fulla
  // stílendurreikninga á öllu skjalinu — layout-thrashing. Mælt á lifandi síðu
  // 23.09.2026 á 2.900 hlutum í Kröfu yfirliti:
  //     hreinn lestur ................... 11 ms
  //     lestur + skrif á víxl (gamla) ... 23.601 ms
  //     lesa fyrst, skrifa svo (þetta) .. 66 ms
  // Skönnunin sjálf mældist 4.339 ms við hver sýnarskipti (hraðamælir 387 sýnir
  // 4.087 ms á krofu-yfirlit og 34.840 ms á arsskodun hjá raunverulegum notendum).
  //
  // AÐEINS RÖÐIN BREYTIST. Sömu hlutir eru valdir eftir sömu skilyrðum og fá
  // nákvæmlega sama blek — ákvörðunin er tekin í lestrarfasanum og geymd, og
  // öll skrifin gerast í einni lotu á eftir þar sem enginn lestur truflar.
  function scan(root) {
    if (!root) return 0;
    const all = root.querySelectorAll('*');
    const limit = Math.min(all.length, 6000);
    const akvardanir = [];   // { el, litur, deyfa }
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
        akvardanir.push({
          el,
          litur: (size >= 20 || w >= 700) ? INK : INK_MUTED,
          deyfa: parseFloat(cs.opacity) < 0.7
        });
        continue;
      }
      const greyishBg = chroma(bg) < 55;
      const greyishFg = chroma(fg) < 55;
      if (!greyishFg || !greyishBg) continue;
      if (ratio(fg, bg) >= 4.5) continue;
      akvardanir.push({ el, litur: pickInk(bg), deyfa: parseFloat(cs.opacity) < 0.7 });
    }

    // ── skrif-fasinn: ENGINN lestur hér á milli, annars snýr thrashið aftur ──
    for (let i = 0; i < akvardanir.length; i++) {
      const a = akvardanir[i];
      a.el.style.setProperty('color', a.litur, 'important');
      a.el.setAttribute('data-cc313', '1');
      if (a.deyfa) a.el.style.setProperty('opacity', '1', 'important');
    }
    return akvardanir.length;
  }

  // Er hluturinn undir lit-reglu Stílstjórans? (262 birtir __peColorSels.)
  //
  // 23.09.2026 (afköst): 75 veljarar × 2.953 hlutir = 221.475 closest()-köll,
  // mælt 144,6 ms. Sameinaður veljari gerir EITT kall per hlut — 89,2 ms.
  // Listinn breytist sjaldan, svo hann er lagður saman einu sinni og geymdur.
  // Einn ógildur veljari fellir allan sameinaða strenginn, svo hann er prófaður
  // fyrst; bregðist hann er fallið aftur í gömlu lykkjuna (rétt svar, hægara).
  let _peSels = null, _peSameinad = null, _peNothaefur = false;
  function peSameinad() {
    const sels = window.__peColorSels || [];
    if (sels === _peSels) return _peSameinad;
    _peSels = sels;
    _peNothaefur = false;
    const c = sels.join(',');
    if (!c) { _peSameinad = ''; return ''; }
    try { document.createDocumentFragment().querySelector(c); _peSameinad = c; }
    catch (_) { _peSameinad = null; _peNothaefur = true; }
    return _peSameinad;
  }
  function peGoverned(el) {
    const sels = window.__peColorSels || [];
    if (!sels.length || !el.closest) return false;
    const c = peSameinad();
    if (c && !_peNothaefur) {
      try { return !!el.closest(c); } catch (_) { _peNothaefur = true; }
    }
    for (let i = 0; i < sels.length; i++) {
      try { if (el.closest(sels[i])) return true; } catch (_) {}
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
    // 2026-09-17: þögnin er RÉTT — aðeins skráning á áhorfanda fyrir endurskönnun á
    // útliti. Bregðist hún keyra hinar kveikjurnar hér að ofan (nav, hash, observer,
    // tímamælar) skönnunina eftir sem áður; engin gögn og engin staða veltur á þessu.
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
