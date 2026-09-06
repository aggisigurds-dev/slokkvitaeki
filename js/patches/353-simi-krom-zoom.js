/* === SÍMI: KRÓM-ZOOM — haus, ☰, botnstika og zoom-stika í RAUNSTÆRÐ (353) ====
 *
 * Agnar 06.09.2026 (skjáskot úr S26): „the top is just really small. and the
 * sidepanel button very small" · „zoomið virkar fínt. bara það sem er yfir
 * ofan stýrikassann" · „boss app. virkar illa líka" · „hlutföll í botnstiku
 * ömurleg". Síðuzoomið (333) var í lagi — það skalar EFNIÐ (.view.active).
 *
 * RÓT (mæld úr skjáskotunum): Chrome á S26 keyrir síðuna í „Tölvusíða"-ham
 * (sbr. mobilenav.js v5) → layout-viewport ≈ 980 CSS-px á 411 dp breiðum skjá
 * (Ársskoðun·Skjár mældist ≈ 1110). Allt FASTA króm-ið — #_app-hdr (48px),
 * #_app-nav, #bstal-banner, #_mnav_btn (44px), #_app-zoom — er teiknað í CSS-px
 * og birtist því á ~0,42: 48px haus = 20 dp, 44px ☰ = 18 dp, 18px emoji = 8 dp.
 * 333 zoomar aðeins .view.active, svo efnið var læsilegt en króm-ið ekki.
 * Fjármál-appið á símanum sýndi RÉTTA stærð af því að það er sett upp af öðrum
 * uppruna (Netlify deploy-preview — „Collaborate / Log in"-stikan neðst).
 *
 * LAUSN: mæla hlutfallið layout-viewport / skjár á snertitæki
 * (innerWidth / screen.width, eða 1 / visualViewport.scale) og setja CSS `zoom`
 * = hlutfallið á KRÓM-IÐ EITT. 48px haus → 48 dp, hvað sem Chrome-hamurinn
 * heitir. Á venjulegum síma (hlutfall 1) breytist ekkert. Fyllingar undir/yfir
 * króminu (.view padding-top/bottom, #_app-frame top) eru MÆLDAR af króminu
 * (getBoundingClientRect = raunpixlar) og deilt með síðuzoominu, því .view
 * er sjálft zoomað. 314 pinPad og mobilenav.js stimpla inline !important —
 * þeir lesa __appHdrPad / __peBannerPad, sem hér fá mældu töluna.
 *
 * Botnstikan: 316 þjappaði í 52px/18px-emoji og 349 tvöfaldaði Boss — hvort
 * tveggja voru BÆTUR fyrir 0,42-skalann. Í raunstærð fá öll öpp sömu hlutföll:
 * 76×62 px hnappur, 24px emoji, 12,5px texti. Þegar hlutfallið er 1 (venjulegur
 * sími) standa 316/349 óbreytt.
 *
 * localStorage.app_krom_zoom = tala (1–3) yfirskrifar sjálfvirknina (prófun /
 * handstilling): window.AppKrom.set(2.4) · AppKrom.set('auto').
 * 153/187-reikningur ÓSNERTUR. Engin gögn — aðeins útlit eins vafra.
 * ========================================================================== */
(() => {
  if (window.__simiKromZoom353) return;
  window.__simiKromZoom353 = true;

  const STYLE_ID = 'simi-krom-zoom-353';
  const LS = 'app_krom_zoom';
  const MIN_AUTO = 1.2;   // undir þessu = venjulegur sími, ekkert gert
  const MAX = 3;
  // Falsk-id keðja = hússtíllinn (sjá 349): 349 notar þrjá :not(#id), hér fjórir
  // svo röðin í <head> skipti engu.
  const P4 = ':not(#_p353a):not(#_p353b):not(#_p353c):not(#_p353d)';
  const K = 'html.app-krom-zoomed ';
  const KP = 'html.app-krom-zoomed.slokk-phone-nav ';
  const A = 'body.appmode ';

  let C = 1;
  let bannerPad = null;   // mæld fylling undir borðanum (síma-ham), lesin gegnum __peBannerPad
  let rawPeBannerPad = (window.__peBannerPad != null) ? window.__peBannerPad : null;

  // __peBannerPad: 323 skrifar (mjór/falinn borði); mobilenav.js og 314 lesa og
  // stimpla inline !important á hvert .view. Lesturinn er sveigður hér: þegar
  // borðinn mælist sýnilegur fá lesendur MÆLDU töluna (raunstærð / síðuzoom),
  // annars hrágildi 323 óbreytt. Setjarinn geymir hrágildið — 323 er ósnert.
  try {
    Object.defineProperty(window, '__peBannerPad', {
      configurable: true,
      get: function () { return bannerPad != null ? bannerPad : rawPeBannerPad; },
      set: function (v) { rawPeBannerPad = v; }
    });
  } catch (_) {}

  function readManual() {
    try {
      const v = parseFloat(localStorage.getItem(LS) || '');
      if (v >= 1 && v <= MAX) return v;
    } catch (_) {}
    return null;
  }
  // Snertitæki: aðal-bendill grófur (Android líka í Tölvusíðu-ham) — EKKI
  // Windows-fartölva með snertiskjá og mús (hover:hover).
  function touchPrimary() {
    try { if (window.matchMedia && matchMedia('(pointer: coarse)').matches) return true; } catch (_) {}
    try {
      if ((navigator.maxTouchPoints || 0) > 1 && window.matchMedia && matchMedia('(hover: none)').matches) return true;
    } catch (_) {}
    return false;
  }
  function autoZoom() {
    if (!touchPrimary()) return 1;
    let r = 1;
    try {
      const sw = screen.width || 0, iw = window.innerWidth || 0;
      if (sw > 0 && iw > 0) r = Math.max(r, iw / sw);          // layout-viewport breiðari en skjárinn
    } catch (_) {}
    try {
      const vv = window.visualViewport;
      if (vv && vv.scale > 0 && vv.scale < 0.92) r = Math.max(r, 1 / vv.scale);   // síðan sýnd minnkuð
    } catch (_) {}
    if (r < MIN_AUTO) return 1;
    return Math.min(MAX, Math.round(r * 100) / 100);
  }

  const CSS = [
    /* ── Króm-ið skalast (zoom). Efnið er ÓSNERT — 333 á það. ────────────── */
    K + A + '#_app-hdr' + P4 + ',' + K + A + '#_app-nav' + P4 + ',' + K + '#_app-zoom' + P4 + ','
      + K + '#_app-inst-guide' + P4 + ',' + K + '#_app-pgedit' + P4 + ','
      + KP + '#bstal-banner' + P4 + ',' + KP + '#bstal-ember' + P4 + ','
      + KP + '#_mnav_btn' + P4 + ',' + KP + '.topbar' + P4
      + '{zoom:var(--app-krom-zoom)!important}',
    /* iframe-síður (Boss-heimasíðan = Brunahólf) fylgja síðuzoominu eins og .view.
       Sama bragð og 333: zoom deilir containing-block, svo left/right:0 fylla áfram. */
    'html.app-page-zoomed ' + A + '#_app-frame' + P4 + '{zoom:var(--app-page-zoom)!important}',
    /* Zoom-stikan á síma/appi: neðst til hægri, ofan við 💬-kúluna / botnstikuna — efst lá hún ofan á
       borðanum og „Vista/Klára"-stikum síðna (Agnar 06.09, fyrirtækjasíðan). --app-zoom-bottom stimplað í appham. */
    'html.slokk-phone-nav #_app-zoom' + P4 + ',' + A + '#_app-zoom' + P4
      + '{top:auto!important;bottom:calc(env(safe-area-inset-bottom,0px) + var(--app-zoom-bottom,84px))!important;right:8px!important}',
    /* 🎨 (262) er position:absolute við hægri brún borðans á síma og lá ofan á 📱▦🖥-rofanum (166) */
    /* Borðinn á síma (mælt 06.09 á 980px/×2,4): andlitið er ~327px; lógó+orðmerki tóku 238, rofinn 105, 🎨 44 →
       komst ekki fyrir. Orðmerkið („SLÖKKVITÆKI EHF.") fer, lógóið 26px, þrengri fyllingar; 🎨 er absolute
       við hægri brún (262) og andlitið heldur 50px fyrir hann. */
    'html[data-viewmode="mobile"] #bstal-banner .bb-word,html.slokk-phone-dev #bstal-banner .bb-word{display:none!important}',
    'html[data-viewmode="mobile"] #bstal-banner .bb-logo img,html.slokk-phone-dev #bstal-banner .bb-logo img{height:24px!important}',
    'html[data-viewmode="mobile"] #bstal-banner .bb-logo,html.slokk-phone-dev #bstal-banner .bb-logo{padding:2px 4px 2px 2px!important;margin:0!important}',
    'html[data-viewmode="mobile"] #bstal-banner .bb-face,html.slokk-phone-dev #bstal-banner .bb-face{padding:0 52px 0 6px!important;gap:4px!important}',
    'html[data-viewmode="mobile"] #bstal-banner .ky-vm,html.slokk-phone-dev #bstal-banner .ky-vm{margin:0 0 0 auto!important;flex:none!important}',
    /* Merkimiðar rofans („Sími/Tafla/Skjár") fela sig aðeins undir @media ≤760px í 166 — sem gildir ekki á 980px
       layout-viewporti símans í Tölvusíðu-ham; rofinn varð 200px og flæddi út fyrir borðann. Tákn ein á síma. */
    'html[data-viewmode="mobile"] #bstal-banner .ky-vm-lbl,html.slokk-phone-dev #bstal-banner .ky-vm-lbl{display:none!important}',
    'html[data-viewmode="mobile"] #bstal-banner .ky-vm-seg,html.slokk-phone-dev #bstal-banner .ky-vm-seg{padding:6px 6px!important}',

    /* ── App-haus: hæfilega stærri í raunstærð ────────────────────────────── */
    K + A + '#_app-hdr' + P4 + '{height:52px!important;gap:5px!important}',
    K + A + '#_app-hdr .nm' + P4 + '{font-size:16px!important}',
    K + A + '#_app-hdr button' + P4 + '{height:46px!important;min-height:46px!important}',
    K + A + '#_app-hdr #_app-pages' + P4 + ',' + K + A + '#_app-hdr #_app-inst2' + P4 + ','
      + K + A + '#_app-hdr #_app-style' + P4 + ',' + K + A + '#_app-hdr #_app-exit' + P4
      + '{width:46px!important;min-width:46px!important;max-width:46px!important;line-height:46px!important;font-size:20px!important}',

    /* ── Botnstika: sömu hlutföll í ÖLLUM öppum í raunstærð ──────────────── */
    K + A + '#_app-nav' + P4 + '{padding:5px 8px calc(5px + env(safe-area-inset-bottom,0px))!important;gap:6px!important}',
    K + A + '#_app-nav button' + P4 + '{flex:1 0 76px!important;min-width:76px!important;min-height:62px!important;'
      + 'padding:6px 4px!important;font-size:12.5px!important;gap:3px!important;border-radius:12px!important;line-height:1.15!important}',
    K + A + '#_app-nav button .e' + P4 + '{font-size:24px!important;line-height:1!important}',
  ].join('\n');

  function mountCss() {
    let s = document.getElementById(STYLE_ID);
    if (!s) {
      s = document.createElement('style');
      s.id = STYLE_ID;
      (document.head || document.documentElement).appendChild(s);
    }
    if (s.textContent !== CSS) s.textContent = CSS;
  }

  /* ── Mælingar (raunpixlar — zoom er inni í getBoundingClientRect) ─────── */
  function rect(el) {
    if (!el || !el.isConnected) return null;
    try {
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden') return null;
      const r = el.getBoundingClientRect();
      return r.height > 0 ? r : null;
    } catch (_) { return null; }
  }
  function elZoom(el) {
    try { const z = parseFloat(getComputedStyle(el).zoom); if (z > 0) return z; } catch (_) {}
    return 1;
  }
  function stamp(el, prop, val) {
    if (!el || val == null) return;
    if (el.style.getPropertyValue(prop) !== val) el.style.setProperty(prop, val, 'important');
  }

  function stampPads() {
    const body = document.body; if (!body) return;
    const app = body.classList.contains('appmode');
    const phone = document.documentElement.classList.contains('slokk-phone-nav');
    const views = document.querySelectorAll('.view');
    const active = document.querySelector('.view.active');
    const Z = active ? elZoom(active) : 1;   // .view.active er sjálft zoomað (333)

    if (app) {
      const hr = rect(document.getElementById('_app-hdr'));
      const nr = body.classList.contains('appmode-nonav') ? null : rect(document.getElementById('_app-nav'));
      const top = hr ? Math.round(hr.bottom + 4) : 52;
      const bot = nr ? Math.round(nr.height + 8) : 24;
      window.__appHdrPad = Math.round(top / Z) + 'px';        // 314 pinPad les þetta
      const padBot = Math.round(bot / Z) + 'px';
      views.forEach(v => { stamp(v, 'padding-top', window.__appHdrPad); stamp(v, 'padding-bottom', padBot); });
      const f = document.getElementById('_app-frame');
      if (f) stamp(f, 'top', Math.round((hr ? hr.bottom : 48) / elZoom(f)) + 'px');   // bottom: 261 syncFrameBottom
      // zoom-stikan situr ofan við botnstikuna (í eigin zoom-hnitum: raunhæð ÷ C)
      const zb = Math.round(((nr ? nr.height : 0) / C) + 12) + 'px';
      if (document.documentElement.style.getPropertyValue('--app-zoom-bottom') !== zb) document.documentElement.style.setProperty('--app-zoom-bottom', zb);
      bannerPad = null;
      return;
    }
    window.__appHdrPad = null;
    if (document.documentElement.style.getPropertyValue('--app-zoom-bottom')) document.documentElement.style.removeProperty('--app-zoom-bottom');
    if (phone) {
      const br = rect(document.getElementById('bstal-banner'));
      bannerPad = br ? Math.round((br.bottom + 12) / Z) + 'px' : null;
      const pad = window.__peBannerPad;                 // getter: mæld eða hrá (323)
      if (pad) views.forEach(v => stamp(v, 'padding-top', pad));
      // Skúffan: mobilenav.js stimplar height:100vh !important — vh deilist ekki
      // með zoom, svo neðstu valmyndar-liðirnir yrðu óaðgengilegir. Deilt hér.
      const tb = document.querySelector('.topbar');
      if (tb) {
        // Mælt 06.09: stílblað setur líka min-height:100vh á .topbar → sama deiling þar.
        stamp(tb, 'height', C !== 1 ? 'calc(100vh / ' + C + ')' : '100vh');
        stamp(tb, 'min-height', C !== 1 ? 'calc(100vh / ' + C + ')' : '');
      }
    } else {
      bannerPad = null;
    }
  }

  function apply() {
    try {
      const c = readManual() || autoZoom();
      C = c;
      const html = document.documentElement;
      if (html.style.getPropertyValue('--app-krom-zoom') !== String(c)) html.style.setProperty('--app-krom-zoom', String(c));
      html.classList.toggle('app-krom-zoomed', c !== 1);
      mountCss();
      stampPads();
    } catch (_) {}
  }
  let _t = null;
  function schedule(ms) { clearTimeout(_t); _t = setTimeout(apply, ms == null ? 60 : ms); }

  window.addEventListener('resize', () => schedule(150));
  window.addEventListener('orientationchange', () => schedule(250));
  try { if (window.visualViewport) window.visualViewport.addEventListener('resize', () => schedule(350)); } catch (_) {}
  document.addEventListener('slokk-viewmode', () => schedule(80));
  ['hashchange', 'popstate', 'pageshow'].forEach(ev => window.addEventListener(ev, () => { schedule(0); setTimeout(apply, 300); }));

  function wrapSwitch() {
    let ok = false;
    try {
      if (window.App && typeof App.switchView === 'function' && !App.switchView.__krom353) {
        const orig = App.switchView;
        App.switchView = function () {
          const r = orig.apply(this, arguments);
          schedule(0); setTimeout(apply, 150);
          return r;
        };
        App.switchView.__krom353 = true;
        ok = true;
      }
    } catch (_) {}
    // Síðuzoom (333) breytir zoom á .view.active og #_app-frame → fyllingar endurmældar.
    try {
      if (window.AppPageZoom && typeof AppPageZoom.set === 'function' && !AppPageZoom.set.__krom353) {
        const origZ = AppPageZoom.set;
        AppPageZoom.set = function () {
          const r = origZ.apply(this, arguments);
          schedule(0); setTimeout(apply, 150); setTimeout(apply, 500);
          return r;
        };
        AppPageZoom.set.__krom353 = true;
        ok = true;
      }
    } catch (_) {}
    return ok;
  }
  wrapSwitch();
  [200, 800, 2000].forEach(ms => setTimeout(wrapSwitch, ms));

  function watchBody() {
    if (!document.body || window.__simiKromZoom353mo) return;
    window.__simiKromZoom353mo = true;
    try {
      // class (appmode / mobile-nav-open / appmode-nonav) + skelin endurbyggð (261 vaktari)
      new MutationObserver(() => schedule(40)).observe(document.body, { attributes: true, attributeFilter: ['class'], childList: true });
      // html-klasar: app-page-zoomed (333), slokk-phone-nav (mobilenav), data-viewmode (166)
      new MutationObserver(() => schedule(40)).observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'data-viewmode'] });
    } catch (_) {}
  }

  function boot() { apply(); watchBody(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
  [0, 300, 1000, 3000].forEach(ms => setTimeout(boot, ms));
  setInterval(apply, 2000);   // idempotent — skrifar aðeins þegar mæling breytist

  window.AppKrom = {
    get: () => C,
    auto: autoZoom,
    set: v => {
      try {
        if (v == null || v === 'auto' || v === '') localStorage.removeItem(LS);
        else localStorage.setItem(LS, String(Math.min(MAX, Math.max(1, +v || 1))));
      } catch (_) {}
      apply();
      return C;
    },
    measure: stampPads,
    version: '353'
  };
  console.log('[patch-353] króm-zoom fyrir síma');
})();
/* === END SÍMI KRÓM-ZOOM === */
