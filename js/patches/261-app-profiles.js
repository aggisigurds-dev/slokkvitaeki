/* App-profiles — installable, mobile-first „mini-öpp" over a curated subset of
 * pages. Phase 1 ships ONE app — 💰 Fjármál (Kröfu yfirlit · Fyrirtæki í þjónustu
 * · Tekjur) — but the framework is generic so 🚚 Bílstjóri and 👥 Kúnnar drop in
 * by adding to APPS.
 *
 * How it works
 *  - „📱 Öpp" launcher page (view-opp, slug #opp): one card per app with an
 *    „Opna" button, „Afrita hlekk", and a page-checklist you tick to choose which
 *    pages the app shows (saved to localStorage + AppSettings — synced).
 *  - App mode: opening `/?app=fjarmal` (the app's start_url + its own manifest)
 *    boots a locked, full-screen mobile shell — sidebar + fire-banner hidden, a
 *    slim app header on top and a thumb-zone bottom nav with only that app's
 *    pages. Navigating outside the set snaps back (focus lock, like ?driver).
 *  - Each app has its OWN manifest (name + 💰 icon + start_url) so it installs as
 *    a SEPARATE home-screen icon. In app mode we swap <link rel=manifest> to it so
 *    „Setja upp" / the browser install menu captures the right app.
 */
(function () {
  if (window.__appProfilesInstalled) return; window.__appProfilesInstalled = true;

  var VIEW_ID = 'view-opp', NAV_KEY = 'opp', NAV_LABEL = '📱 Öpp';

  // ── catalog of pages that can go into an app (switchView key → label) ────────
  var PAGES = [
    { k: 'krofu-yfirlit',    label: 'Kröfu yfirlit',        short: 'Kröfur',     emoji: '💳' },
    { k: 'companies',        label: 'Fyrirtæki (skrá)',      short: 'Fyrirtæki',  emoji: '🏢' },
    { k: 'income',           label: 'Tekjur',                emoji: '📈' },
    { k: 'bokhalds-yfirlit', label: 'Bókhald',               emoji: '📊' },
    { k: 'reikninga-postur', label: 'Reikninga-póstur',      short: 'Póstur',     emoji: '📧' },
    { k: 'hreyfingarlisti',  label: 'Hreyfingarlisti',       short: 'Hreyfingar', emoji: '📄' },
    { k: 'vidskiptavinir',   label: 'Viðskiptavinir',        short: 'Kúnnar',     emoji: '👤' },
    { k: 'sala',             label: 'Sala',                  emoji: '💵' },
    { k: 'verkbord',         label: 'Verkefnalisti',         short: 'Verkefni',   emoji: '📋' },
    { k: 'arsskodun',        label: 'Fyrirtæki í þjónustu',  short: 'Þjónusta',   emoji: '🏢' },
    // Brunahólf-síður — birtar inni í appinu í iframe (deep-link á tab-ið).
    { k: 'br-gerdreikninga', label: 'Gerð reikninga',        short: 'Reikn.gerð', emoji: '🧾', url: 'https://brunaholf.netlify.app/?embed=1#gerdreikninga' },
    { k: 'br-vinnubok',      label: 'Vinnubók',              emoji: '📓', url: 'https://brunaholf.netlify.app/?embed=1#vinnubok' },
    { k: 'br-krofur',        label: 'Krófur & Tekjur',       short: 'Fjárhagur', emoji: '📊', url: 'https://brunaholf.netlify.app/?embed=1#krofur' },
    { k: 'br-krofuyfirlit',  label: 'Kröfu yfirlit (Brunahólf)', short: 'BH Kröfur', emoji: '📑', url: 'https://brunaholf.netlify.app/?embed=1#krofuyfirlit' },
    { k: 'br-maeting',       label: 'Mæting · verkstaðir (Tímavera)', short: 'Mæting', emoji: '🕒', url: 'https://brunaholf.netlify.app/?embed=1#tvmaeting' },
  ];
  var PAGE_BY_KEY = {}; PAGES.forEach(function (p) { PAGE_BY_KEY[p.k] = p; });

  // ── the apps (phase 1: Fjármál only) ────────────────────────────────────────
  var APPS = [
    { key: 'fjarmal', emoji: '💰', name: 'Fjármál', color: '#0e7a4f', dark: '#06402b',
      manifest: '/manifest-fjarmal.json',
      blurb: 'Kröfur, sala, fyrirtæki + Brunahólf reikningagerð',
      defaults: ['krofu-yfirlit', 'br-krofuyfirlit', 'sala', 'vidskiptavinir', 'br-maeting', 'br-gerdreikninga', 'br-vinnubok', 'br-krofur'] },
    { key: 'verkefni', emoji: '📋', name: 'Verkefnalisti', color: '#3b82f6', dark: '#1d4ed8',
      manifest: '/manifest-verkefni.json',
      blurb: 'Verkborð — beiðnir, verkefni og eftirfylgni',
      defaults: ['verkbord', 'arsskodun', 'reikninga-postur'] },
    // Bílstjóri er STANDALONE: engin botn-nav-skel (patch 219 á heilan
    // læstan fullskjá). Kortið gefur bara Opna / Setja upp / Afrita hlekk —
    // engin „Síður í appinu"-listi. ?app=bilstjori ræsir læsta Bílstjórann.
    { key: 'bilstjori', emoji: '🚚', name: 'Bílstjóri', color: '#111318', dark: '#000000',
      manifest: '/manifest-bilstjori.json', standalone: true,
      blurb: 'Ökumanns-app: leið dagsins, tækjaúttekt og skýrslur í símanum',
      defaults: [] },
  ];
  var APP_BY_KEY = {}; APPS.forEach(function (a) { APP_BY_KEY[a.key] = a; });
  // Standalone apps (Bílstjóri) render their OWN full-screen locked view
  // (patch 219) — patch 261 must NOT build its bottom-nav shell or snap-back
  // for them, only surface the launcher card + install button.
  function isStandalone(key) { return !!(APP_BY_KEY[key] && APP_BY_KEY[key].standalone); }

  // active app mode (from ?app=)
  var ACTIVE = (function () {
    try { var v = new URLSearchParams(location.search).get('app'); return APP_BY_KEY[v] ? v : null; }
    catch (_) { return null; }
  })();

  // ── config storage (which pages each app shows) — localStorage + AppSettings ─
  var CFG_KEY = 'app_profiles_json';
  function loadCfg() {
    var raw = null;
    try { if (window.AppSettings && AppSettings.get) raw = AppSettings.get(CFG_KEY); } catch (_) {}
    if (!raw) { try { raw = localStorage.getItem(CFG_KEY); } catch (_) {} }
    if (!raw) return {};
    try { return JSON.parse(raw) || {}; } catch (_) { return {}; }
  }
  function pagesFor(key) {
    var c = loadCfg();
    var app = APP_BY_KEY[key]; if (!app) return [];
    var arr = (c && Array.isArray(c[key])) ? c[key] : app.defaults;
    // The Fjármál "Fyrirtæki í þjónustu" slot used to point at the fyrirtæki
    // REGISTRY ('companies'); the intended page is the customer list. Swap on
    // read so already-saved configs pick up the fix without re-picking pages.
    arr = arr.map(function (k) { return k === 'companies' && key === 'fjarmal' ? 'vidskiptavinir' : k; });
    arr = arr.filter(function (k, i) { return arr.indexOf(k) === i; });   // de-dup
    return arr.filter(function (k) { return PAGE_BY_KEY[k]; });
  }
  function saveCfg(key, arr) {
    var c = loadCfg(); c[key] = arr;
    var s = JSON.stringify(c);
    try { localStorage.setItem(CFG_KEY, s); } catch (_) {}
    try { if (window.AppSettings && AppSettings.save) AppSettings.save({ app_profiles_json: s }); } catch (_) {}
  }

  // Einskiptis-migrations: nýjar síður bætt í ÞEGAR-VISTAÐAR Fjármál-stillingar
  // (flagg per síðu í cfg svo notandinn geti af-hakað hana eftirá án þess að hún
  // troði sér inn aftur; ný uppsetning fær þær úr defaults).
  //   __brky1 (2026-07-08): br-krofuyfirlit — á eftir krofu-yfirlit
  //   __brtv1 (2026-07-08): br-maeting — aftast fyrir framan br-gerdreikninga
  (function () {
    try {
      var c = loadCfg(), changed = false;
      function insertOnce(flag, key, afterKey) {
        if (c[flag]) return;
        if (Array.isArray(c.fjarmal) && c.fjarmal.indexOf(key) === -1) {
          var ki = c.fjarmal.indexOf(afterKey);
          c.fjarmal.splice(ki === -1 ? c.fjarmal.length : ki + 1, 0, key);
        }
        c[flag] = 1; changed = true;
      }
      insertOnce('__brky1', 'br-krofuyfirlit', 'krofu-yfirlit');
      insertOnce('__brtv1', 'br-maeting', 'vidskiptavinir');
      if (!changed) return;
      var s = JSON.stringify(c);
      try { localStorage.setItem(CFG_KEY, s); } catch (_) {}
      try { if (window.AppSettings && AppSettings.save) AppSettings.save({ app_profiles_json: s }); } catch (_) {}
    } catch (_) {}
  })();

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function appLink(key) { return location.origin + '/?app=' + key; }

  // Navigate to a page — click its real sidebar button when present (lazy pages
  // render most reliably that way), else fall back to App.switchView.
  function navTo(key) {
    var btn = document.querySelector('.vnav-btn[data-view="' + key + '"]');
    if (!btn) {
      var all = document.querySelectorAll('.vnav-btn');
      for (var i = 0; i < all.length; i++) {
        var oc = all[i].getAttribute('onclick') || '';
        if (oc.indexOf("switchView('" + key + "')") !== -1) { btn = all[i]; break; }
      }
    }
    if (btn) { btn.click(); return; }
    try { if (window.App && App.switchView) App.switchView(key); } catch (_) {}
  }

  // ── install (per-app manifest) ───────────────────────────────────────────────
  var deferredPrompt = null;
  window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); deferredPrompt = e; refreshInstallBtns(); });
  function setManifest(href) {
    var l = document.querySelector('link[rel="manifest"]');
    if (l && href) l.setAttribute('href', href);
  }
  async function doInstall() {
    if (deferredPrompt) { deferredPrompt.prompt(); try { await deferredPrompt.userChoice; } catch (_) {} deferredPrompt = null; refreshInstallBtns(); return; }
    toast('Opnaðu valmynd vafrans → „Setja upp forrit / Bæta á heimaskjá".');
  }
  function refreshInstallBtns() {
    document.querySelectorAll('._app-install').forEach(function (b) {
      b.style.display = deferredPrompt ? '' : (b.dataset.always ? '' : b.style.display);
    });
  }
  function toast(msg) { if (window.Toast && Toast.show) Toast.show(msg); else try { alert(msg); } catch (_) {} }

  // ── styles ───────────────────────────────────────────────────────────────────
  function styles() {
    if (document.getElementById('_app-styles')) return;
    var css = [
      // launcher page
      '#' + VIEW_ID + '{padding:0 !important;background:linear-gradient(180deg,#060607 0px,#060607 95px,#aeb4be 360px,#9ba1ad 100%) !important;min-height:100vh}',
      '#' + VIEW_ID + ' .op-main{max-width:760px;margin:0 auto;padding:22px 18px 60px;box-sizing:border-box}',
      '#' + VIEW_ID + ' .op-h1{margin:0 0 4px;font-size:26px;font-weight:800;color:#fff}',
      '#' + VIEW_ID + ' .op-sub{margin:0 0 20px;font-size:13px;color:rgba(255,255,255,.65)}',
      '#' + VIEW_ID + ' .op-card{background:#fff;border-radius:18px;padding:18px;margin:0 0 16px;box-shadow:0 18px 44px -22px rgba(10,20,40,.5)}',
      '#' + VIEW_ID + ' .op-top{display:flex;align-items:center;gap:13px}',
      '#' + VIEW_ID + ' .op-ic{width:56px;height:56px;border-radius:15px;display:flex;align-items:center;justify-content:center;font-size:30px;flex:none;color:#fff}',
      '#' + VIEW_ID + ' .op-nm{font-size:19px;font-weight:800;color:#11141c;line-height:1.1}',
      '#' + VIEW_ID + ' .op-bl{font-size:12.5px;color:#64748b;margin-top:2px}',
      '#' + VIEW_ID + ' .op-acts{display:flex;flex-wrap:wrap;gap:9px;margin:15px 0 0}',
      '#' + VIEW_ID + ' .op-btn{font:inherit;font-size:14px;font-weight:700;padding:11px 16px;border-radius:11px;border:1px solid #d7dce4;background:#fff;color:#334155;cursor:pointer;min-height:44px}',
      '#' + VIEW_ID + ' .op-btn.prim{color:#fff;border:none}',
      '#' + VIEW_ID + ' .op-btn:hover{filter:brightness(1.04)}',
      '#' + VIEW_ID + ' .op-sech{font-size:11px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;color:#94a3b8;margin:18px 0 8px}',
      '#' + VIEW_ID + ' .op-pages{display:flex;flex-direction:column;gap:2px}',
      '#' + VIEW_ID + ' .op-pg{display:flex;align-items:center;gap:11px;padding:11px 10px;border-radius:10px;cursor:pointer;font-size:14.5px;color:#1f2937}',
      '#' + VIEW_ID + ' .op-pg:hover{background:#f1f5f9}',
      '#' + VIEW_ID + ' .op-pg input{width:20px;height:20px;accent-color:#0e7a4f;flex:none}',
      '#' + VIEW_ID + ' .op-pg .e{font-size:18px}',
      // ── app mode shell ──
      'body.appmode #bstal-banner{display:none !important}',
      'body.appmode .topbar,body.appmode .sidebar,body.appmode nav.view-nav{display:none !important}',
      // Hide every mobile-nav hamburger variant (three patches ship one) + drawers.
      'body.appmode .mobile-nav-toggle,body.appmode .mobile-nav-backdrop,body.appmode .mobile-nav-drawer,' +
        'body.appmode #_mnav_btn,body.appmode #_mobnav_btn,body.appmode #_slokk_hamb,' +
        'body.appmode #_mnav_drawer,body.appmode #_mnav_scrim,body.appmode #_mobnav_drawer{display:none !important}',
      // Full-width content: .view carries margin-left:220px + width:calc(100vw-220px)
      // (the sidebar slot) from app.css — hidden sidebar leaves an empty left gutter.
      'body.appmode .view,body.appmode .view.active{margin-left:0 !important;width:100vw !important;max-width:100vw !important;left:0 !important}',
      'html[data-bstal-banner="on"][data-thm-preset="brunastal"] body.appmode .view.active:not(#view-field):not(#view-counter):not(#view-workshop){margin-left:0 !important;width:100vw !important;max-width:100vw !important}',
      'body.appmode .main-panel{margin-left:0 !important;margin-right:0 !important;max-width:none !important}',
      'body.appmode .view.active{padding-top:50px !important;padding-bottom:154px !important}',
      // Beat patch 230's ON+':not(#id)…{padding-top:160px}` (id-level specificity) when the
      // Brunastál banner attr is present — otherwise the content sits 160px below my header.
      'html[data-bstal-banner="on"][data-thm-preset="brunastal"] body.appmode .view.active:not(#view-field):not(#view-counter):not(#view-workshop){padding-top:50px !important;padding-bottom:154px !important}',
      '#_app-hdr{position:fixed;top:0;left:0;right:0;height:50px;z-index:2147481001;display:flex;align-items:center;gap:10px;padding:0 12px;color:#fff;box-shadow:0 2px 10px rgba(0,0,0,.25)}',
      '#_app-hdr .nm{font-size:16px;font-weight:800;flex:1;display:flex;align-items:center;gap:8px}',
      '#_app-hdr button{font:inherit;font-size:13px;font-weight:700;height:34px;padding:0 11px;border-radius:9px;border:1px solid rgba(255,255,255,.3);background:rgba(255,255,255,.14);color:#fff;cursor:pointer}',
      // Bottom nav = 3-column grid (2 rows for up to 6 pages), bigger thumb targets.
      '#_app-nav{position:fixed;bottom:0;left:0;right:0;z-index:2147481001;display:grid;grid-template-columns:repeat(3,1fr);gap:7px;background:#0c0d10;border-top:1px solid #26262c;padding:9px 9px calc(9px + env(safe-area-inset-bottom,0px));box-shadow:0 -3px 14px rgba(0,0,0,.35)}',
      '#_app-nav button{min-width:0;background:rgba(255,255,255,.05);border:none;color:rgba(255,255,255,.66);font:inherit;font-size:13.5px;font-weight:600;cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;padding:9px 3px;border-radius:13px;min-height:64px;text-align:center;line-height:1.15;overflow:hidden}',
      '#_app-nav button .e{font-size:25px;line-height:1}',
      '#_app-nav button.on{color:#fff;background:rgba(255,255,255,.08)}',
      // external-page iframe host (sits between the header and the bottom nav)
      '#_app-frame{position:fixed;top:50px;left:0;right:0;bottom:150px;z-index:2147481000;background:#fff;display:none}',
      '#_app-frame iframe{width:100%;height:100%;border:0;display:block}',
      // ── App-mode readability: bigger text + thumb-friendly tap targets. Scoped to
      //    body.appmode so the office desktop view is untouched. ──
      'body.appmode .view{font-size:17px}',
      'body.appmode .view button,body.appmode .view .btn,body.appmode .view a.btn,body.appmode .view [role="button"]{font-size:17px !important;min-height:50px;padding-top:12px !important;padding-bottom:12px !important;line-height:1.2}',
      'body.appmode .view input,body.appmode .view select,body.appmode .view textarea{font-size:18px !important;min-height:52px}',
      // tiny stacked icon+label action buttons (e.g. Krafa send / Greitt / Reikning) — keep compact but legible
      'body.appmode .view button:has(> svg),body.appmode .view .abtn5{font-size:14.5px !important}',
      'body.appmode .view .pill,body.appmode .view .chip,body.appmode .view [class*="pill"],body.appmode .view [class*="chip"]{font-size:15px !important}',
      // section/table text larger
      'body.appmode .view td,body.appmode .view th,body.appmode .view label,body.appmode .view p,body.appmode .view li{font-size:16.5px}',
      // headings a step up too
      'body.appmode .view h1{font-size:30px !important}',
      'body.appmode .view h2,body.appmode .view h3{font-size:21px !important}',
      '#_app-nav button{font-size:13.5px}',
    ];
    var st = document.createElement('style'); st.id = '_app-styles'; st.textContent = css.join('\n');
    document.head.appendChild(st);
  }

  // ── launcher page ────────────────────────────────────────────────────────────
  function viewEl() {
    var v = document.getElementById(VIEW_ID);
    if (v) return v;
    v = document.createElement('div'); v.id = VIEW_ID; v.className = 'view';
    var host = document.querySelector('.main-panel') ? document.querySelector('.main-panel').parentNode : null;
    var anchor = document.getElementById('view-counter') || document.querySelector('.view');
    if (anchor && anchor.parentNode) anchor.parentNode.appendChild(v);
    else document.body.appendChild(v);
    return v;
  }
  function render() {
    styles();
    var v = viewEl();
    var cards = APPS.map(function (a) {
      var sel = pagesFor(a.key);
      var selSet = {}; sel.forEach(function (k) { selSet[k] = 1; });
      var pageRows = PAGES.map(function (p) {
        return '<label class="op-pg"><input type="checkbox" class="_op-pg" data-app="' + a.key + '" data-k="' + p.k + '"' + (selSet[p.k] ? ' checked' : '') + '>' +
          '<span class="e">' + p.emoji + '</span><span>' + esc(p.label) + '</span></label>';
      }).join('');
      var pagesSection = a.standalone ? '' :
        ('<div class="op-sech">Síður í appinu</div>' + '<div class="op-pages">' + pageRows + '</div>');
      return '<div class="op-card">' +
        '<div class="op-top"><div class="op-ic" style="background:linear-gradient(180deg,' + a.color + ',' + a.dark + ')">' + a.emoji + '</div>' +
          '<div><div class="op-nm">' + esc(a.name) + '</div><div class="op-bl">' + esc(a.blurb) + '</div></div></div>' +
        '<div class="op-acts">' +
          '<button class="op-btn prim _op-open" data-app="' + a.key + '" style="background:linear-gradient(180deg,' + a.color + ',' + a.dark + ')" type="button">▶ Opna</button>' +
          '<button class="op-btn _app-install _op-install" data-app="' + a.key + '" data-always="1" type="button">⤓ Setja upp í síma</button>' +
          '<button class="op-btn _op-link" data-app="' + a.key + '" type="button">🔗 Afrita hlekk</button>' +
        '</div>' +
        pagesSection +
      '</div>';
    }).join('');
    v.innerHTML = '<div class="op-main"><h1 class="op-h1">📱 Öpp</h1>' +
      '<p class="op-sub">Léttar, símavænar útgáfur með völdum síðum — hver með eigin hlekk og hægt að setja upp í símann.</p>' +
      cards + '</div>';
    v.querySelectorAll('._op-open').forEach(function (b) { b.addEventListener('click', function () { location.href = appLink(b.dataset.app); }); });
    v.querySelectorAll('._op-install').forEach(function (b) { b.addEventListener('click', function () { var a = APP_BY_KEY[b.dataset.app]; if (a) setManifest(a.manifest); doInstall(); }); });
    v.querySelectorAll('._op-link').forEach(function (b) { b.addEventListener('click', function () {
      var url = appLink(b.dataset.app);
      try { navigator.clipboard.writeText(url); toast('🔗 Hlekkur afritaður'); } catch (_) { toast(url); }
    }); });
    v.querySelectorAll('._op-pg').forEach(function (cb) { cb.addEventListener('change', function () {
      var app = cb.dataset.app;
      var picked = PAGES.map(function (p) { return p.k; }).filter(function (k) {
        var el = v.querySelector('._op-pg[data-app="' + app + '"][data-k="' + k + '"]'); return el && el.checked;
      });
      saveCfg(app, picked);
    }); });
  }

  // ── app-mode shell (bottom nav + header) ─────────────────────────────────────
  var _curPage = null;
  function buildShell() {
    var a = APP_BY_KEY[ACTIVE]; if (!a) return;
    styles();
    document.body.classList.add('appmode');
    var pages = pagesFor(a.key); if (!pages.length) pages = a.defaults.slice();

    var hdr = document.getElementById('_app-hdr') || document.createElement('div');
    hdr.id = '_app-hdr'; hdr.style.display = ''; hdr.style.background = 'linear-gradient(180deg,' + a.color + ',' + a.dark + ')';
    hdr.innerHTML = '<div class="nm">' + a.emoji + ' ' + esc(a.name) + '</div>' +
      '<button class="_app-install" data-always="1" id="_app-inst2" type="button">⤓ Setja upp</button>' +
      '<button id="_app-exit" type="button" title="Loka appi">✕</button>';
    if (!hdr.parentNode) document.body.appendChild(hdr);

    var nav = document.getElementById('_app-nav') || document.createElement('div');
    nav.id = '_app-nav'; nav.style.display = '';
    nav.innerHTML = pages.map(function (k) {
      var p = PAGE_BY_KEY[k] || { emoji: '•', label: k };
      return '<button class="_app-tab" data-k="' + k + '"><span class="e">' + p.emoji + '</span>' + esc(p.short || p.label) + '</button>';
    }).join('');
    if (!nav.parentNode) document.body.appendChild(nav);

    nav.querySelectorAll('._app-tab').forEach(function (b) { b.addEventListener('click', function () { goPage(b.dataset.k); }); });
    hdr.querySelector('#_app-inst2').addEventListener('click', function () { setManifest(a.manifest); doInstall(); });
    hdr.querySelector('#_app-exit').addEventListener('click', function () { location.href = location.origin + '/'; });

    setManifest(a.manifest);   // install captures THIS app
    syncFrameBottom();
    // Endurbygging (vaktarinn) á EKKI að hoppa til baka á fyrstu síðu.
    goPage(_curPage || pages[0]);
  }
  // Iframe-botninn = raunhæð navsins (var harðkóðað 150px — 3ja raða nav er ~225px
  // svo neðsti hluti síðunnar lenti Á BAK VIÐ navið og virtist klipptur).
  function syncFrameBottom() {
    try {
      var nav = document.getElementById('_app-nav'), f = document.getElementById('_app-frame');
      if (nav && f) f.style.bottom = Math.max(60, Math.round(nav.getBoundingClientRect().height)) + 'px';
    } catch (_) {}
  }
  // Sjálf-heilun: EITTHVAÐ á símanum fjarlægir/felur botn-navið ("fliparnir niðri
  // hverfa alltaf") — annar patch, endur-teiknun eða yfirlögn. Vaktari sem
  // endurbyggir shellið ef header/nav vantar, er tómt eða falið. buildShell er
  // idempotent (endurnotar element eftir id) og goPage(_curPage) heldur síðunni.
  function startShellGuard() {
    if (window.__appShellGuard) return; window.__appShellGuard = true;
    setInterval(function () {
      try {
        if (!ACTIVE) return;
        var nav = document.getElementById('_app-nav'), hdr = document.getElementById('_app-hdr');
        var navDead = !nav || !nav.isConnected || !nav.querySelector('._app-tab');
        var hdrDead = !hdr || !hdr.isConnected;
        if (navDead || hdrDead) { buildShell(); return; }
        if (getComputedStyle(nav).display === 'none') nav.style.display = 'grid';
        if (getComputedStyle(hdr).display === 'none') hdr.style.display = 'flex';
        syncFrameBottom();
      } catch (_) {}
    }, 1500);
  }
  function goPage(k) {
    _curPage = k;
    var p = PAGE_BY_KEY[k];
    if (p && p.url) showFrame(p);      // external (Brunahólf) page → iframe
    else { hideFrame(); navTo(k); }    // native slökkvitæki view
    var nav = document.getElementById('_app-nav');
    if (nav) nav.querySelectorAll('._app-tab').forEach(function (b) { b.classList.toggle('on', b.dataset.k === k); });
  }
  // Full-screen iframe host for external pages (between header + bottom nav).
  function frameEl() {
    var f = document.getElementById('_app-frame');
    if (f) return f;
    f = document.createElement('div'); f.id = '_app-frame';
    f.innerHTML = '<iframe id="_app-iframe" title="app" allow="clipboard-write; clipboard-read"></iframe>';
    document.body.appendChild(f);
    return f;
  }
  function showFrame(p) {
    var f = frameEl(), ifr = f.querySelector('iframe');
    if (ifr.getAttribute('data-src') !== p.url) { ifr.src = p.url; ifr.setAttribute('data-src', p.url); }
    f.style.display = 'block';
  }
  function hideFrame() { var f = document.getElementById('_app-frame'); if (f) f.style.display = 'none'; }

  // ── switchView hook: launcher opens here; app mode is a focus-lock ───────────
  function patchSwitchView() {
    if (!window.App || !window.App.switchView) { setTimeout(patchSwitchView, 120); return; }
    if (window.App._appProfilesPatched) return;
    var orig = window.App.switchView;
    window.App.switchView = function (view) {
      if (view === NAV_KEY) { openLauncher(); return; }
      var r = orig ? orig.apply(this, arguments) : undefined;
      // hide the launcher when navigating elsewhere
      try { if (view !== NAV_KEY) { var v = document.getElementById(VIEW_ID); if (v) { v.style.display = 'none'; v.classList.remove('active'); } } } catch (_) {}
      // app mode: if someone navigates to a page NOT in the app, snap back
      // (standalone apps like Bílstjóri handle their own lock in patch 219)
      if (ACTIVE && !isStandalone(ACTIVE)) {
        var allowed = pagesFor(ACTIVE); if (!allowed.length) allowed = (APP_BY_KEY[ACTIVE] || {}).defaults || [];
        if (allowed.indexOf(view) === -1 && view !== NAV_KEY) { setTimeout(function () { if (_curPage) goPage(_curPage); }, 0); }
      }
      return r;
    };
    for (var k in orig) { try { window.App.switchView[k] = orig[k]; } catch (_) {} }
    window.App._appProfilesPatched = true;
  }
  function openLauncher() {
    document.querySelectorAll('.view.active').forEach(function (v) { v.classList.remove('active'); v.style.display = 'none'; });
    var v = viewEl(); render(); v.style.display = ''; v.classList.add('active');
  }

  // ── sidebar button ───────────────────────────────────────────────────────────
  function addNavButton() {
    if (document.getElementById('_app-navbtn')) return;
    var proto = document.querySelector('.vnav-btn'); if (!proto) { setTimeout(addNavButton, 300); return; }
    var btn = proto.cloneNode(true);
    btn.id = '_app-navbtn'; btn.removeAttribute('data-view'); btn.setAttribute('data-view', NAV_KEY);
    if (btn.hasAttribute('onclick')) btn.setAttribute('onclick', "App.switchView('" + NAV_KEY + "')");
    btn.classList.remove('active');
    btn.textContent = NAV_LABEL;
    proto.parentNode.insertBefore(btn, proto.nextSibling);
    btn.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); if (window.App && App.switchView) App.switchView(NAV_KEY); else openLauncher(); });
  }

  // ── boot ─────────────────────────────────────────────────────────────────────
  function boot() {
    patchSwitchView();
    addNavButton();
    // Standalone app (Bílstjóri) → patch 219 owns the full-screen lock; do not
    // build the 261 bottom-nav shell over it.
    if (ACTIVE && isStandalone(ACTIVE)) return;
    if (ACTIVE) {
      // wait for the shell + a nav target, then lock into the app.
      // Enginn 6s dauðafrestur lengur — á hægum síma gat App.switchView komið
      // seinna og shellið byggðist þá ALDREI; vaktarinn tekur líka við eftirá.
      (function tick() {
        if (document.querySelector('.vnav-btn') && window.App && window.App.switchView) { buildShell(); startShellGuard(); return; }
        setTimeout(tick, 250);
      })();
      startShellGuard();
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  window.AppProfiles = { open: openLauncher, reload: render, pagesFor: pagesFor };
})();
