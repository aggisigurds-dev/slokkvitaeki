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
    { k: 'thjonustubord',    label: 'Þjónustuborð (mobíl)', short: 'Þjónusta',   emoji: '🔧' },
    { k: 'arsskodun',        label: 'Fyrirtæki í þjónustu',  short: 'Þjónusta',   emoji: '🏢' },
    { k: 'thjonustuverk',    label: 'Þjónustuverk',          short: 'Þj.verk',    emoji: '🛠' },
    { k: 'thjonustu-verkstaedi', label: 'ÞjónustuVerkstæði', short: 'Verkstæði', emoji: '🔧' },
    { k: 'brunayfirlit',     label: 'Brunakerfi yfirlit',    short: 'Brunakerfi', emoji: '🚨' },
    { k: 'rekstrarfelog',    label: 'Rekstrarfélög',         short: 'Rekstrarf.', emoji: '🏢' },
    { k: 'minar-sidur',      label: 'Mínar síður',           short: 'Mínar síður', emoji: '🧩' },
    // Brunahólf-síður — birtar inni í appinu í iframe (deep-link á tab-ið).
    { k: 'br-gerdreikninga', label: 'Gerð reikninga',        short: 'Reikn.gerð', emoji: '🧾', url: 'https://brunaholf.netlify.app/?embed=1#gerdreikninga' },
    { k: 'br-vinnubok',      label: 'Vinnubók',              emoji: '📓', url: 'https://brunaholf.netlify.app/?embed=1#vinnubok' },
    { k: 'br-krofur',        label: 'Krófur & Tekjur',       short: 'Fjárhagur', emoji: '📊', url: 'https://brunaholf.netlify.app/?embed=1#krofur' },
    { k: 'br-krofuyfirlit',  label: 'Kröfu yfirlit (Brunahólf)', short: 'BH Kröfur', emoji: '📑', url: 'https://brunaholf.netlify.app/?embed=1#krofuyfirlit' },
    { k: 'br-maeting',       label: 'Mæting · verkstaðir (Tímavera)', short: 'Mæting', emoji: '🕒', url: 'https://brunaholf.netlify.app/?embed=1#tvmaeting' },
    { k: 'br-fjarmalyfirlit',label: 'Fjármála-yfirlit (Slökkv. + Brunahólf)', short: 'Yfirlit', emoji: '💰', url: 'https://brunaholf.netlify.app/fjarmalyfirlit.html' },
    // Fleiri Brunahólf-síður (fyrir Brunahólf-appið — allt í iframe, deep-link á tab).
    { k: 'br-dagurinn',      label: 'Dagurinn (Brunahólf)',  short: 'Dagurinn',  emoji: '🌅', url: 'https://brunaholf.netlify.app/?embed=1#dagurinn' },
    { k: 'br-reikningagerd', label: 'Reikningagerð (Brunahólf)', short: 'Reikn.gerð', emoji: '🧾', url: 'https://brunaholf.netlify.app/?embed=1#reikningar' },
    { k: 'br-skuldunautar',  label: 'Skuldunautar (Brunahólf)', short: 'Skuldun.', emoji: '💰', url: 'https://brunaholf.netlify.app/?embed=1#skuldunautar' },
    { k: 'br-hreyfingar',    label: 'Hreyfingaryfirlit (Brunahólf)', short: 'Hreyf.', emoji: '📄', url: 'https://brunaholf.netlify.app/?embed=1#hreyfingaryfirlit' },
    { k: 'br-verkstadir',    label: 'Verkstaðir (Brunahólf)', short: 'Verkst.',  emoji: '🏗️', url: 'https://brunaholf.netlify.app/?embed=1#verkstadir' },
    { k: 'br-nlsh',          label: 'Landsspítalinn (Brunahólf)', short: 'NLSH', emoji: '🏥', url: 'https://brunaholf.netlify.app/?embed=1#nlsh' },
    // Verkkaupar er SJÁLFSTÆÐ síða (ekki hash-flipi í index.html) — því bein slóð
    // án ?embed=1#… . Hún er þegar app-útlit (eigin haus, engin hliðarstika).
    { k: 'br-verkkaupar',    label: 'Verkkaupar (Brunahólf)', short: 'Verkkaupar', emoji: '🤝', url: 'https://brunaholf.netlify.app/verkkaupar.html' },
    { k: 'br-jarvis',        label: 'J.A.R.V.I.S. (Brunahólf)', short: 'Jarvis', emoji: '🧠', url: 'https://brunaholf.netlify.app/jarvis.html?embed=1' },
    { k: 'br-raddminni',     label: 'Raddminni (Brunahólf)',  short: 'Raddminni', emoji: '🎙️', url: 'https://brunaholf.netlify.app/radd.html' },
    { k: 'br-kerfisheilsa',  label: 'Kerfisheilsa (Brunahólf)', short: 'Kerfisheilsa', emoji: '🛡️', url: 'https://brunaholf.netlify.app/kerfisheilsa.html' },
    // Yfirferð efnislista — símavæn síða þar sem yfirmaður fer yfir flaggaða
    // Efnislista (Kröfu yfirlit 👔-takkinn), breytir magni, vistar og staðfestir.
    { k: 'br-yfirferd',      label: 'Yfirferð efnislista (Brunahólf)', short: 'Yfirferð', emoji: '👔', url: 'https://brunaholf.netlify.app/yfirferd.html' },
    { k: 'br-eydublod',     label: 'Eyðublöð (Brunahólf)',            short: 'Eyðublöð', emoji: '📝', url: 'https://brunaholf.netlify.app/eydublod.html' },
    // Skýrslu-stöð úr Bakendanum — einangraður flipi í brunaholf (?embed=1#skyrslustod)
    // svo AÐEINS stöðin birtist í appinu, ekki allur Bakendinn. Tengja skýrslu/reikning
    // við réttan stað + ár beint úr símanum.
    { k: 'br-skyrslustod',  label: 'Skýrslu-stöð (Brunahólf)',        short: 'Skýrslust.', emoji: '📊', url: 'https://brunaholf.netlify.app/?embed=1#skyrslustod' },
  ];
  var PAGE_BY_KEY = {}; PAGES.forEach(function (p) { PAGE_BY_KEY[p.k] = p; });

  // ── einstakar Mínar síður-síður sem valkostir, ekki bara verkfærið í heild ──
  // Kyrrstæði PAGES-listinn dugar fyrir „Mínar síður" sem EITT boð (sjá að ofan) —
  // en hver vistuð síða notandans er ekki þekkt fyrr en í keyrslu, per-notanda.
  // Því er þessi hluti REIKNAÐUR (ekki fastur), lesinn beint úr sömu AppSettings-
  // slóð og patch 302 sjálft notar (min_sidur.sidur[]). k = 'minar-<id>' svo það
  // rekist aldrei á neinn fastan lykil úr PAGES að ofan.
  function dynamicPages() {
    try {
      var st = (window.AppSettings && AppSettings.path && AppSettings.path('min_sidur')) || null;
      if (!st || !Array.isArray(st.sidur)) return [];
      return st.sidur.map(function (s) {
        var nm = s.nafn || 'Ónefnd síða';
        return { k: 'minar-' + s.id, label: nm + ' (Mínar síður)', short: nm.length > 12 ? nm.slice(0, 12) + '…' : nm, emoji: '🧩', minarId: s.id };
      });
    } catch (_) { return []; }
  }
  function allPages() { return PAGES.concat(dynamicPages()); }
  function pageByKey(k) {
    if (PAGE_BY_KEY[k]) return PAGE_BY_KEY[k];
    if (k && k.indexOf('minar-') === 0) {
      var dyn = dynamicPages();
      for (var i = 0; i < dyn.length; i++) { if (dyn[i].k === k) return dyn[i]; }
    }
    return null;
  }

  // ── the apps (phase 1: Fjármál only) ────────────────────────────────────────
  var APPS = [
    { key: 'fjarmal', emoji: '💰', name: 'Fjármál', color: '#0e7a4f', dark: '#06402b',
      manifest: '/manifest-fjarmal.json', home: 'krofu-yfirlit',
      blurb: 'Kröfur, sala, fyrirtæki + Brunahólf reikningagerð',
      defaults: ['krofu-yfirlit', 'br-fjarmalyfirlit', 'br-krofuyfirlit', 'sala', 'vidskiptavinir', 'thjonustuverk', 'thjonustu-verkstaedi', 'rekstrarfelog', 'br-jarvis', 'br-maeting', 'br-gerdreikninga', 'br-vinnubok', 'br-krofur'] },
    { key: 'verkefni', emoji: '📋', name: 'Verkefnalisti', color: '#3b82f6', dark: '#1d4ed8',
      manifest: '/manifest-verkefni.json', home: 'verkbord',
      blurb: 'Verkborð — beiðnir, verkefni og eftirfylgni',
      defaults: ['thjonustubord', 'verkbord', 'arsskodun', 'reikninga-postur'] },
    { key: 'brunaholf', emoji: '🔥', name: 'Brunahólf', color: '#6d28d9', dark: '#4c1d95',
      manifest: '/manifest-brunaholf.json', home: 'br-dagurinn',
      blurb: 'Brunahólf-hubbið í símanum — Dagurinn, Krófur, Reikningagerð, Vinnubók, Mæting o.fl.',
      defaults: ['br-dagurinn', 'br-jarvis', 'br-verkkaupar', 'br-skyrslustod', 'br-krofur', 'br-krofuyfirlit', 'br-gerdreikninga', 'br-vinnubok', 'br-maeting'] },
    // Brunakerfi-appið fyrir skoðunarmenn á staðnum (ósk Agnars 2026-07-21):
    // yfirlitið er heimasíðan; fyrirtækjasíðan (274) og skýrslu-formið (273)
    // opnast þaðan sem yfirlög — allt innan sömu læstu skeljar.
    { key: 'brunakerfi', emoji: '🚨', name: 'Brunakerfi', color: '#b91c1c', dark: '#7f1d1d',
      manifest: '/manifest-brunakerfi.json', home: 'brunayfirlit',
      blurb: 'Skoðunarmanna-app: fyrirtækin, skoðunarskýrslur og verð — skráð á staðnum',
      defaults: ['brunayfirlit', 'sala'] },
    // Bílstjóri er STANDALONE: engin botn-nav-skel (patch 219 á heilan
    // læstan fullskjá). Kortið gefur bara Opna / Setja upp / Afrita hlekk —
    // engin „Síður í appinu"-listi. ?app=bilstjori ræsir læsta Bílstjórann.
    { key: 'bilstjori', emoji: '🚚', name: 'Bílstjóri', color: '#111318', dark: '#000000',
      manifest: '/manifest-bilstjori.json', standalone: true,
      blurb: 'Ökumanns-app: leið dagsins, tækjaúttekt og skýrslur í símanum',
      defaults: [] },
    // Framkvæmda-yfirlit fyrir Agnar (ósk 8.8.): sama efni og Fjármál-appið að
    // hluta en breiðara — tekur líka Tekjur/Bókhald/Verkefnalisti/Rekstrarfélög
    // svo öll stóru KPI-in eru á einum stað án þess að velja Fjármál-undirmengið.
    // Heimasíða = br-fjarmalyfirlit (Brunahólf iframe, EKKI þessa appsins Supabase-
    // klient) — krofu-yfirlit sem heimasíða sló stundum í "Engin gagnabankatenging"
    // á fyrstu opnun (DB.sb ekki tilbúinn þegar appmode-skelin snappar strax á
    // heimasíðuna á boot); fjarmalyfirlit-iframe-ið hleður sínum eigin gögnum og
    // forðast því kappleikinn alveg.
    { key: 'boss', emoji: '👑', name: 'The Big Boss', color: '#fbe9ab', dark: '#b8860b',
      manifest: '/manifest-boss.json', home: 'br-fjarmalyfirlit',
      blurb: 'Framkvæmda-yfirlit þvert á bæði fyrirtækin — kröfur, fjármál, tekjur, bókhald, verkefni',
      defaults: ['br-fjarmalyfirlit', 'br-yfirferd', 'br-skyrslustod', 'br-eydublod', 'krofu-yfirlit', 'income', 'bokhalds-yfirlit', 'verkbord', 'rekstrarfelog'] },
  ];
  var APP_BY_KEY = {}; APPS.forEach(function (a) { APP_BY_KEY[a.key] = a; });
  // ── NOTENDA-BÚIN ÖPP (2026-08-26, ósk Agnars: „save as app page named …") ──
  // Vistast í custom_apps_json (localStorage STRAX + AppSettings í ský) og
  // renna inn í APPS/APP_BY_KEY — fá launcher-kort MEÐ síðu-hökunum, ?app=
  // boot og /app/<key>/ slóð eins og innbyggðu öppin. Ekkert manifest →
  // „Setja upp" er falinn á þeim; Opna + Afrita hlekk virka.
  var CUSTOM_KEY = 'custom_apps_json';
  function loadCustoms() {
    var raw = null;
    try { if (window.AppSettings && AppSettings.get) raw = AppSettings.get(CUSTOM_KEY); } catch (_) {}
    if (!raw) { try { raw = localStorage.getItem(CUSTOM_KEY); } catch (_) {} }
    if (!raw) return [];
    try { var a = JSON.parse(raw); return Array.isArray(a) ? a : []; } catch (_) { return []; }
  }
  function saveCustoms(list) {
    var str = JSON.stringify(list || []);
    try { localStorage.setItem(CUSTOM_KEY, str); } catch (_) {}
    try { if (window.AppSettings && AppSettings.save) { var pl = {}; pl[CUSTOM_KEY] = str; AppSettings.save(pl); } } catch (_) {}
  }
  function mergeCustoms() {
    var changed = false;
    loadCustoms().forEach(function (c) {
      if (!c || !c.key || APP_BY_KEY[c.key]) return;
      var a = { key: c.key, emoji: c.emoji || '📱', name: c.name || c.key, color: c.color || '#334155',
        dark: c.dark || '#0f172a', home: '', blurb: c.blurb || 'Notenda-búið app', custom: true,
        defaults: Array.isArray(c.defaults) ? c.defaults : [] };
      APPS.push(a); APP_BY_KEY[a.key] = a;
      changed = true;
    });
    return changed;
  }
  mergeCustoms();   // localStorage-eintakið er til NÚNA → ?app=/slóð bootar strax
  function customKeyFor(name) {
    var base = 'x' + String(name || '').toLowerCase()
      .replace(/[áà]/g, 'a').replace(/é/g, 'e').replace(/í/g, 'i').replace(/[óö]/g, 'o')
      .replace(/ú/g, 'u').replace(/ý/g, 'y').replace(/þ/g, 'th').replace(/ð/g, 'd').replace(/æ/g, 'ae')
      .replace(/[^a-z]/g, '').slice(0, 18) || 'xapp';
    var k = base, i = 2;
    while (APP_BY_KEY[k]) k = base + 'abcdefghij'.charAt(i++ % 10);
    return k;
  }
  function createCustomApp() {
    var name = prompt('Nafn á nýja appinu:', ''); if (!name || !String(name).trim()) return;
    name = String(name).trim().slice(0, 30);
    var emoji = prompt('Tákn (emoji) fyrir appið:', '📱') || '📱';
    var list = loadCustoms();
    var app = { key: customKeyFor(name), name: name, emoji: String(emoji).trim().slice(0, 4) || '📱',
      color: '#334155', dark: '#0f172a', blurb: 'Notenda-búið app — hakaðu við síðurnar að neðan',
      defaults: ['thjonustubord'] };
    list.push(app); saveCustoms(list); mergeCustoms(); render();
    try { if (window.Toast && Toast.show) Toast.show('📱 „' + name + '" búið til — hakaðu við „⚙ Síður í appinu"'); } catch (_) {}
  }
  function deleteCustomApp(key) {
    var a = APP_BY_KEY[key]; if (!a || !a.custom) return;
    if (!confirm('Eyða appinu „' + a.name + '"?')) return;
    saveCustoms(loadCustoms().filter(function (c) { return c && c.key !== key; }));
    var i = APPS.indexOf(a); if (i >= 0) APPS.splice(i, 1); delete APP_BY_KEY[key];
    try { var c = loadCfg(); if (c && c[key]) { delete c[key]; var st = JSON.stringify(c); localStorage.setItem(CFG_KEY, st); if (window.AppSettings && AppSettings.save) AppSettings.save({ app_profiles_json: st }); } } catch (_) {}
    render();
  }
  // Skýja-eintakið kemur seint — sama 12s-retry mynstur og cfg-migrationin.
  (function () {
    var n = 0;
    function t() {
      try { if (mergeCustoms()) { var v = document.getElementById(VIEW_ID); if (v && v.classList.contains('active')) render(); } } catch (_) {}
      if (++n < 12) setTimeout(t, 1000);
    }
    setTimeout(t, 1000);
  })();
  // Standalone apps (Bílstjóri) render their OWN full-screen locked view
  // (patch 219) — patch 261 must NOT build its bottom-nav shell or snap-back
  // for them, only surface the launcher card + install button.
  function isStandalone(key) { return !!(APP_BY_KEY[key] && APP_BY_KEY[key].standalone); }

  // active app mode — from the path /app/<key>/ (each app's own PWA scope) or
  // the legacy ?app=<key> query (older installed shortcuts still boot).
  var ACTIVE = (function () {
    try {
      var pm = (location.pathname || '').match(/^\/app\/([a-z]+)\/?/);
      var v = pm ? pm[1] : new URLSearchParams(location.search).get('app');
      return APP_BY_KEY[v] ? v : null;
    } catch (_) { return null; }
  })();

  // ── forsíðu-hleðsluskjár (load screen) ───────────────────────────────────────
  // Sýndur STRAX (fyrir sw/pages hafa hlaðið), falinn þegar buildShell() klárar.
  // Standalone (Bílstjóri) sér um sitt eigið lok í patch 219 — skiptum okkur ekki af.
  var _splashEl = null;
  function showSplash(key) {
    if (isStandalone(key)) return;
    var a = effectiveApp(key); if (!a) return;
    if (_splashEl || document.getElementById('_app-splash')) return;
    var isBoss = a.key === 'boss';
    var d = document.createElement('div');
    d.id = '_app-splash';
    d.style.cssText = 'position:fixed;inset:0;z-index:2147483600;display:flex;flex-direction:column;' +
      'align-items:center;justify-content:center;gap:14px;' + (isBoss ? BOSS_BG_CSS : ('background:linear-gradient(180deg,' + esc(a.color) + ',' + esc(a.dark) + ')')) + ';' +
      'color:#fff;font-family:-apple-system,Segoe UI,Roboto,sans-serif';
    d.innerHTML = (isBoss ? bossCrownSvg(64) : '<div style="font-size:56px;line-height:1">' + esc(a.emoji) + '</div>') +
      '<div style="font-size:19px;font-weight:800;letter-spacing:.02em' + (isBoss ? ';' + BOSS_GOLD_CSS : '') + '">' + esc(a.name) + '</div>' +
      '<div style="width:26px;height:26px;border-radius:50%;border:3px solid rgba(255,255,255,.35);border-top-color:#fff;animation:_appspin .8s linear infinite"></div>' +
      '<style>@keyframes _appspin{to{transform:rotate(360deg)}}</style>';
    (document.body || document.documentElement).appendChild(d);
    _splashEl = d;
    setTimeout(hideSplash, 8000); // öryggisnet — aldrei sitja fastur á hleðsluskjá
  }
  function hideSplash() {
    var el = _splashEl || document.getElementById('_app-splash');
    if (!el) return;
    _splashEl = null;
    el.style.transition = 'opacity .25s ease';
    el.style.opacity = '0';
    setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 260);
  }
  if (ACTIVE && !isStandalone(ACTIVE)) showSplash(ACTIVE);

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
    return arr.filter(function (k) { return pageByKey(k); });
  }
  function saveCfg(key, arr) {
    var c = loadCfg(); c[key] = arr;
    var s = JSON.stringify(c);
    try { localStorage.setItem(CFG_KEY, s); } catch (_) {}
    try { if (window.AppSettings && AppSettings.save) AppSettings.save({ app_profiles_json: s }); } catch (_) {}
  }

  // ── útlits-yfirskrift (nafn/lýsing/tákn/litur) á hverju appi — sjálfgefið úr
  // APPS, notandi má breyta gegnum Þjónustuborðið. Sama vistunar-mynstur og cfg. ─
  var OV_KEY = 'app_profiles_overrides_json';
  function loadOverrides() {
    var raw = null;
    try { if (window.AppSettings && AppSettings.get) raw = AppSettings.get(OV_KEY); } catch (_) {}
    if (!raw) { try { raw = localStorage.getItem(OV_KEY); } catch (_) {} }
    if (!raw) return {};
    try { return JSON.parse(raw) || {}; } catch (_) { return {}; }
  }
  function saveOverrides(key, patch) {
    var o = loadOverrides();
    var cur = o[key] || {};
    for (var k in patch) { cur[k] = patch[k]; }
    for (var k2 in cur) { if (cur[k2] === '' || cur[k2] == null) delete cur[k2]; }
    o[key] = cur;
    var s = JSON.stringify(o);
    try { localStorage.setItem(OV_KEY, s); } catch (_) {}
    try { if (window.AppSettings && AppSettings.save) { var payload = {}; payload[OV_KEY] = s; AppSettings.save(payload); } } catch (_) {}
  }
  // Sameinar fast-skilgreint app (APPS) við notenda-yfirskriftina — notað
  // ALLS STAÐAR sem app er teiknað (launcher-kort, haus, splash) svo breyting
  // birtist samstundis alls staðar.
  function effectiveApp(key) {
    var a = APP_BY_KEY[key]; if (!a) return null;
    var ov = loadOverrides()[key] || {};
    return {
      key: a.key, manifest: a.manifest, home: a.home, standalone: a.standalone, defaults: a.defaults,
      emoji: ov.emoji || a.emoji, name: ov.name || a.name, blurb: ov.blurb || a.blurb,
      color: ov.color || a.color, dark: ov.dark || a.dark
    };
  }
  function versionLine() {
    var b = window.BUILD;
    if (!b || !b.commit) return null;
    var short = String(b.commit).slice(0, 7);
    var when = '';
    try { when = new Date(b.time).toLocaleString('is-IS', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }); } catch (_) {}
    return short + (when ? ' · ' + when : '');
  }

  // Einskiptis-migrations: nýjar síður bætt í ÞEGAR-VISTAÐAR Fjármál-stillingar
  // (flagg per síðu í cfg svo notandinn geti af-hakað hana eftirá án þess að hún
  // troði sér inn aftur; ný uppsetning fær þær úr defaults).
  //   __brky1 (2026-07-08): br-krofuyfirlit — á eftir krofu-yfirlit
  //   __brtv1 (2026-07-08): br-maeting — aftast fyrir framan br-gerdreikninga
  //   __tvk1  (2026-07-20): thjonustuverk — á eftir arsskodun (ósk Agnars)
  //   __vkp1  (2026-07-20): br-verkkaupar — á eftir br-dagurinn í BRUNAHÓLF-appinu
  //   __rf2   (2026-07-31): rekstrarfelog — á eftir vidskiptavinir í Fjármálum
  //   __jv2   (2026-07-31): br-jarvis — á eftir rekstrarfelog (Fjármál) og
  //   __jv2b                 á eftir br-dagurinn (Brunahólf)
  //   __tvks1 (2026-08-01): thjonustu-verkstaedi — á eftir thjonustuverk (Fjármál)
  //   __bksl1 (2026-08-27): sala — á eftir brunayfirlit í Brunakerfi-appinu
  // KAPPHLAUPS-GALLI SEM VAR LAGAÐUR 2026-07-31: migrationin keyrði EINU SINNI
  // við hleðslu skrárinnar — löngu áður en AppSettings hafði sótt vistuðu
  // stillinguna úr skýinu. Þá var `c[appKey]` ekki fylki, ekkert var sett inn,
  // EN flaggið var samt sett og vistað. Síðan bættist því ALDREI við hjá þeim
  // sem var þegar með vistaðar síður — nákvæmlega þeim sem migrationin er fyrir.
  // Tvennt lagar það: (1) flagg er AÐEINS sett þegar fylkið er raunverulega til,
  // (2) reynt aftur í ~12 s meðan skýja-stillingin er að koma.
  (function () {
    var reynt = 0;
    function keyra() {
      try {
        var c = loadCfg(), changed = false;
        // appKey er valfrjálst og fellur aftur á 'fjarmal' svo eldri köllin séu óbreytt.
        function insertOnce(flag, key, afterKey, appKey) {
          appKey = appKey || 'fjarmal';
          if (c[flag]) return;
          var arr = c[appKey];
          // Engin vistuð stilling ENN → ekki brenna flaggið, reyna síðar.
          // (Sé engin stilling til á endanum sér `defaults` um nýju síðurnar.)
          if (!Array.isArray(arr)) return;
          if (arr.indexOf(key) === -1) {
            var ki = arr.indexOf(afterKey);
            arr.splice(ki === -1 ? arr.length : ki + 1, 0, key);
          }
          c[flag] = 1; changed = true;
        }
        insertOnce('__brky1', 'br-krofuyfirlit', 'krofu-yfirlit');
        insertOnce('__brtv1', 'br-maeting', 'vidskiptavinir');
        insertOnce('__tvk1',  'thjonustuverk', 'arsskodun');
        insertOnce('__vkp1',  'br-verkkaupar', 'br-dagurinn', 'brunaholf');
        // NB flögg í ANNARRI kynslóð (__rf2/__jv2) — fyrstu flöggin brunnu í
        // gallanum hér að ofan, svo þau eru ónothæf til að greina „ógert".
        insertOnce('__rf2',   'rekstrarfelog', 'vidskiptavinir');
        insertOnce('__jv2',   'br-jarvis',     'rekstrarfelog');
        insertOnce('__jv2b',  'br-jarvis',     'br-dagurinn', 'brunaholf');
        insertOnce('__tvks1', 'thjonustu-verkstaedi', 'thjonustuverk');
        insertOnce('__yfd1',  'br-yfirferd', 'br-fjarmalyfirlit', 'boss');
        insertOnce('__bksl1', 'sala', 'brunayfirlit', 'brunakerfi');
        if (changed) {
          var s = JSON.stringify(c);
          try { localStorage.setItem(CFG_KEY, s); } catch (_) {}
          try { if (window.AppSettings && AppSettings.save) AppSettings.save({ app_profiles_json: s }); } catch (_) {}
        }
      } catch (_) {}
      if (++reynt < 12) setTimeout(keyra, 1000);
    }
    keyra();
  })();

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function appLink(key) { return location.origin + '/app/' + key + '/'; }

  // ── „The Big Boss" gold-foil skin — pure metal, not a flat yellow bar ────────
  // The generic header/splash (emoji + flat linear-gradient(color,dark)) reads
  // as a plain yellow banner for this app; Agnar asked for the SAME banded
  // gold-metal look as the install icon's "BOSS" wordmark. Scoped to key==='boss'
  // only — every other mini-app keeps the plain emoji+flat-color header.
  var BOSS_GOLD_CSS = 'background:linear-gradient(180deg,#fffbe8 0%,#f9e29a 12%,#e0ad3f 26%,' +
    '#96631a 40%,#6e4a11 46%,#c99a3f 54%,#f6dd8f 64%,#d3a63f 78%,#8a5c17 90%,#f3dd97 100%);' +
    '-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;color:transparent';
  var BOSS_BG_CSS = 'background:linear-gradient(135deg,#2c2c30 0%,#0a0a0b 45%,#000000 100%)';
  var _bossSvgSeq = 0;
  function bossCrownSvg(px) {
    var id = 'bossFoil' + (++_bossSvgSeq);
    return '<svg width="' + px + '" height="' + Math.round(px * 111 / 184) + '" viewBox="0 0 184 111" ' +
      'xmlns="http://www.w3.org/2000/svg" style="flex:none">' +
      '<defs><linearGradient id="' + id + '" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0%" stop-color="#fff6d2"/><stop offset="45%" stop-color="#e2b34a"/>' +
      '<stop offset="55%" stop-color="#8a5c17"/><stop offset="100%" stop-color="#f3dd97"/>' +
      '</linearGradient></defs>' +
      '<path d="M0 94L0 56L42 86L92 8L142 86L184 56L184 94Z" fill="url(#' + id + ')"/>' +
      '<rect x="0" y="94" width="184" height="17" rx="4" fill="url(#' + id + ')"/>' +
      '<circle cx="0" cy="49" r="11" fill="url(#' + id + ')"/>' +
      '<circle cx="92" cy="2" r="12.5" fill="url(#' + id + ')"/>' +
      '<circle cx="184" cy="49" r="11" fill="url(#' + id + ')"/></svg>';
  }

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
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault(); deferredPrompt = e; refreshInstallBtns();
    // Arrived via „Setja upp" (…/app/<key>/?install=1) → show the native install
    // dialog for THIS app the moment the browser offers it.
    try { if (new URLSearchParams(location.search).has('install')) setTimeout(doInstall, 300); } catch (_) {}
  });
  function setManifest(href) {
    var l = document.querySelector('link[rel="manifest"]');
    if (l && href) l.setAttribute('href', href);
  }
  async function doInstall() {
    // Already running as an installed PWA — nothing to do.
    if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) {
      toast('✓ Þetta app er þegar sett upp á þetta tæki');
      return;
    }
    if (deferredPrompt) { deferredPrompt.prompt(); try { await deferredPrompt.userChoice; } catch (_) {} deferredPrompt = null; refreshInstallBtns(); return; }
    // No native prompt yet. If we haven't tried a fresh page load, navigate to
    // ?install=1 so Chrome gets a clean shot at beforeinstallprompt on load.
    // The beforeinstallprompt listener will auto-call doInstall() if it fires.
    if (ACTIVE) {
      try {
        var _params = new URLSearchParams(location.search);
        if (!_params.has('install')) { location.href = appLink(ACTIVE) + '?install=1'; return; }
      } catch (_) {}
    }
    // Already at ?install=1 and Chrome still won't offer the prompt — fall back
    // to the manual guide (⋮ menu instructions).
    showInstallGuide();
    // Relabel all install buttons so it's clear that pressing them again just
    // re-opens the instructions — not the actual OS install dialog.
    document.querySelectorAll('#_app-inst2,._app-install[data-always]').forEach(function (b) {
      b.textContent = '📖 Leiðbeiningar';
    });
  }
  function showInstallGuide() {
    if (document.getElementById('_app-inst-guide')) return;
    var isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
    var isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    var steps = isIos
      ? ['Opnaðu þessa síðu í <b>Safari</b> (ekki Chrome/Firefox á iOS)', 'Ýttu á <b>📤 Share</b> hnappinn neðst á skjánum', 'Veldu <b>„Bæta við heimaskjá"</b> úr listanum']
      : ['Opnaðu valmynd vafrans (<b>⋮</b> efst til hægri)', 'Veldu <b>„Setja upp app"</b> eða <b>„Bæta á heimaskjá"</b>', 'Ýttu á <b>Setja upp</b> í staðfestingarglugganum'];
    var hint = isIos && !isSafari
      ? '<div style="background:#7c3aed;color:#fff;border-radius:10px;padding:10px 14px;margin-bottom:14px;font-size:13px;font-weight:600">⚠️ iOS krefst Safari — Chrome á iPhone/iPad getur ekki sett upp heimaskjáforrit.</div>'
      : '';
    // On Android Chrome the browser's own ⋮ menu is the only path once
    // beforeinstallprompt has been consumed — make that crystal-clear.
    var androidNote = !isIos
      ? '<div style="background:#fef9c3;border-radius:10px;padding:10px 14px;margin-top:14px;font-size:13px;color:#713f12;line-height:1.5">'
        + '💡 <b>Athugið:</b> „Setja upp"-takkinn í appinu vísar þér hér — þú þarft að nota <b>valmynd vafransins</b> (⋮) til að klára uppsetninguna.</div>'
      : '';
    var d = document.createElement('div');
    d.id = '_app-inst-guide';
    d.style.cssText = 'position:fixed;inset:0;z-index:2147483647;display:flex;align-items:flex-end;justify-content:center;background:rgba(0,0,0,.6);backdrop-filter:blur(4px)';
    d.innerHTML = '<div style="background:#fff;border-radius:20px 20px 0 0;padding:24px 22px 36px;max-width:480px;width:100%;box-shadow:0 -8px 40px rgba(0,0,0,.25)">'
      + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">'
      + '<div style="font-size:17px;font-weight:800;color:#11141c">📲 Setja upp í síma</div>'
      + '<button id="_app-inst-guide-x" type="button" style="width:32px;height:32px;background:#f1f5f9;border:none;border-radius:50%;cursor:pointer;font-size:18px;line-height:1;color:#64748b">✕</button>'
      + '</div>'
      + hint
      + '<ol style="margin:0;padding-left:22px;display:flex;flex-direction:column;gap:10px">'
      + steps.map(function(s){ return '<li style="font-size:15px;color:#1e293b;line-height:1.45">'+s+'</li>'; }).join('')
      + '</ol>'
      + androidNote
      + '<div style="margin-top:18px;font-size:12.5px;color:#94a3b8;line-height:1.5">Þegar forritið er sett upp opnarðu það beint af heimaskjánum eins og hvaða app sem er.</div>'
      + '</div>';
    document.body.appendChild(d);
    d.addEventListener('click', function(e) { if (e.target === d) d.remove(); });
    d.querySelector('#_app-inst-guide-x').addEventListener('click', function() { d.remove(); });
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
      // ── FYLKI: síður × öpp ──────────────────────────────────────────────
      // Fyrsta súlan er LÆST (position:sticky) svo síðuheitið sjáist alltaf
      // þegar strokið er til hliðar — annars veit maður ekki hvaða röð maður
      // er að haka við um leið og öppin verða fleiri en skjárinn ber.
      '.mx-box{padding:0 !important;overflow:hidden}',
      '.mx-sum{display:flex;align-items:center;gap:10px;padding:14px 16px;cursor:pointer;list-style:none;user-select:none}',
      '.mx-sum::-webkit-details-marker{display:none}',
      '.mx-sum-t{font-weight:800;font-size:13.5px;color:#0f172a}',
      '.mx-sum-n{margin-left:auto;font-size:11px;color:#64748b;white-space:nowrap}',
      '.mx-scroll{overflow-x:auto;overflow-y:visible;-webkit-overflow-scrolling:touch;border-top:1px solid #e2e8f0}',
      // Appið þvingar ALLAR töflur í `display:block;max-width:100%;overflow-x:auto`
      // (almenn "responsive tafla"-regla). Þá verður taflan sjálf skrunbox inni í
      // .mx-scroll, læsta súlan hættir að virka og síðustu dálkarnir KLIPPAST AF
      // í stað þess að skrunast (staðfest: síðasta appið á x=546 í 470px glugga).
      // Hér er hún færð aftur í alvöru töflu og skrunið skilið eftir hjá .mx-scroll.
      '.mx-scroll .mx-t{display:table !important;border-collapse:separate;border-spacing:0;font-size:12.5px;width:max-content !important;min-width:100% !important;max-width:none !important;overflow:visible !important}',
      '.mx-t th,.mx-t td{padding:0;margin:0}',
      '.mx-t thead th{position:sticky;top:0;z-index:3;background:#f8fafc;border-bottom:1px solid #e2e8f0}',
      '.mx-cnr{position:sticky;left:0;z-index:4 !important;background:#f8fafc !important;text-align:left;padding:8px 12px !important;font-size:10.5px;letter-spacing:.06em;text-transform:uppercase;color:#64748b;min-width:190px;border-right:1px solid #e2e8f0}',
      '.mx-ah{padding:7px 4px !important;min-width:62px;text-align:center;vertical-align:bottom}',
      '.mx-ae{font-size:17px;line-height:1.1}',
      '.mx-an{font-size:9px;color:#64748b;line-height:1.15;max-width:62px;margin:2px auto 0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '.mx-rh{position:sticky;left:0;z-index:2;background:#fff;text-align:left;font-weight:600;color:#0f172a;padding:7px 12px !important;border-right:1px solid #e2e8f0;border-bottom:1px solid #f1f5f9;white-space:nowrap}',
      '.mx-t tbody tr:nth-child(even) .mx-rh{background:#fcfdff}',
      '.mx-t tbody tr:nth-child(even) td{background:#fcfdff}',
      '.mx-pe{margin-right:7px}',
      // Útgáfu-raðir eru inndregnar og merktar v2/v3 svo sjáist strax að þetta
      // er SAMA síðan í annarri útfærslu, ekki ótengd síða.
      '.mx-sub .mx-rh{padding-left:30px !important;font-weight:500;color:#475569}',
      '.mx-vb{display:inline-block;margin-right:7px;background:#e0edff;color:#1d4ed8;border-radius:5px;padding:1px 6px;font-size:9.5px;font-weight:800;vertical-align:1px}',
      '.mx-sub .mx-vb{background:#f1f5f9;color:#64748b}',
      '.mx-c{text-align:center;border-bottom:1px solid #f1f5f9}',
      '.mx-c input{width:17px;height:17px;accent-color:#0e7a4f;cursor:pointer;margin:6px auto;display:block}',
      '.mx-op{width:34px;text-align:center;border-bottom:1px solid #f1f5f9}',
      '.mx-open{all:unset;cursor:pointer;color:#94a3b8;font-size:13px;padding:4px 6px;border-radius:6px}',
      '.mx-open:hover{color:#0f172a;background:#eef2f7}',
      '.mx-hint{padding:8px 14px 12px;font-size:11px;color:#64748b;border-top:1px solid #f1f5f9}',
      // launcher page
      '#' + VIEW_ID + '{padding:0 !important;background:linear-gradient(180deg,#060607 0px,#060607 95px,#aeb4be 360px,#9ba1ad 100%) !important;min-height:100vh}',
      // Launcher-inn er hub-síða → fasti Brunastál-borðinn (og hamborgarinn) liggja
      // ofan á honum. Ýtum innihaldinu niður fyrir borðann svo „📱 Öpp" titillinn
      // sé ekki falinn. Á síma er borðinn grennri en á skjáborði.
      '#' + VIEW_ID + ' .op-main{max-width:760px;margin:0 auto;padding:96px 18px 60px;box-sizing:border-box}',
      '@media (min-width:901px){#' + VIEW_ID + ' .op-main{padding-top:118px}}',
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
      // Samanbrjótanlegt síðuval (lokað sjálfgefið) — heldur launcher þéttum.
      '#' + VIEW_ID + ' .op-pagesbox{margin-top:14px;border-top:1px solid #eef1f5;padding-top:6px}',
      '#' + VIEW_ID + ' .op-pgsum{display:flex;align-items:center;gap:8px;list-style:none;cursor:pointer;padding:9px 4px;border-radius:10px;min-height:44px;-webkit-tap-highlight-color:transparent}',
      '#' + VIEW_ID + ' .op-pgsum::-webkit-details-marker{display:none}',
      '#' + VIEW_ID + ' .op-pgsum:hover{background:#f6f8fb}',
      '#' + VIEW_ID + ' .op-pgsum-t{font-size:13px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;color:#64748b}',
      '#' + VIEW_ID + ' .op-pgcount{margin-left:auto;font-size:12.5px;font-weight:700;color:#0e7a4f;background:#e7f5ee;padding:3px 10px;border-radius:99px}',
      '#' + VIEW_ID + ' .op-pgchev{font-size:12px;color:#94a3b8;transition:transform .18s}',
      '#' + VIEW_ID + ' .op-pagesbox[open] .op-pgchev{transform:rotate(180deg)}',
      '#' + VIEW_ID + ' .op-pages{display:flex;flex-direction:column;gap:2px;margin-top:6px}',
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
      'body.appmode .view.active{padding-top:50px !important;padding-bottom:116px !important}',
      // App-síðurnar sitja á STEEL-GRÁA bakgrunni skjáborðsþemunnar (Brunastál),
      // ekki flötu hvítu. Áður þvingaðum við hvítt (til að dökka gradientinn frá
      // 229-sala-theme-bridge blæddi ekki inn) — en það drap grámann sem síðurnar
      // eru hannaðar fyrir og hvítu titlarnir hurfu (hvítt-á-hvítu). Nú notum við
      // gráu stoppin úr Brunastál-gradientinum (patch 230: #aeb4be→#9ba1ad) EN án
      // svarta toppsins (0–95px) sem olli „dökka yfirlaginu" (#671). Þannig fá
      // síðurnar aftur skjáborðs-grámann og hvítu titlarnir verða læsilegir.
      // (Ósk Agnars 2026-08-22: „settu gráa upprunalega bakgrunninn aftur á þær".)
      // Launcher (#view-opp) heldur sínum eigin dökka gradient.
      'body.appmode .view.active:not(#view-opp){background:linear-gradient(180deg,#aeb4be 0px,#9ba1ad 340px,#9ba1ad 100%) !important}',
      // Beat patch 230's ON+':not(#id)…{padding-top:160px}` (id-level specificity) when the
      // Brunastál banner attr is present — otherwise the content sits 160px below my header.
      'html[data-bstal-banner="on"][data-thm-preset="brunastal"] body.appmode .view.active:not(#view-field):not(#view-counter):not(#view-workshop){padding-top:50px !important;padding-bottom:116px !important}',
      '#_app-hdr{position:fixed;top:0;left:0;right:0;height:50px;z-index:2147481001;display:flex;align-items:center;gap:10px;padding:0 12px;color:#fff;box-shadow:0 2px 10px rgba(0,0,0,.25)}',
      '#_app-hdr .nm{font-size:16px;font-weight:800;flex:1;display:flex;align-items:center;gap:8px}',
      '#_app-hdr button{font:inherit;font-size:13px;font-weight:700;height:34px;padding:0 11px;border-radius:9px;border:1px solid rgba(255,255,255,.3);background:rgba(255,255,255,.14);color:#fff;cursor:pointer}',
      // Bottom nav = 3-column grid (2 rows for up to 6 pages), bigger thumb targets.
      // 2026-07-19: EIN skrunanleg lína (ekki 3-dálka grind sem vafðist í 2
      // raðir — neðri röðin faldist á bak við home-strikuna á síma svo aðeins
      // 3 flipar sáust). flex:1 0 78px → fáir flipar fylla breiddina, margir
      // haldast í einni röð og skrunast lárétt (sama og Verkborð-lausnin).
      '#_app-nav{position:fixed;bottom:0;left:0;right:0;z-index:2147481001;display:flex;flex-wrap:nowrap;overflow-x:auto;-webkit-overflow-scrolling:touch;scrollbar-width:none;gap:7px;background:#0c0d10;border-top:1px solid #26262c;padding:9px 9px calc(9px + env(safe-area-inset-bottom,0px));box-shadow:0 -3px 14px rgba(0,0,0,.35)}',
      '#_app-nav::-webkit-scrollbar{display:none}',
      // 2026-07-29: dokkan var 256px há með 52px emoji — á appi með fáar/eina síðu
      // varð þetta risaflís sem gleypti hálfan skjáinn. Nú þéttur þumal-dokki
      // (~84px) og felst alveg þegar appið hefur bara eina síðu (ekkert að velja).
      '#_app-nav button{flex:1 0 84px;min-width:84px;background:rgba(255,255,255,.05);border:none;color:rgba(255,255,255,.66);font:inherit;font-size:13.5px;font-weight:600;cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;padding:10px 5px;border-radius:14px;min-height:120px;text-align:center;line-height:1.15;overflow:hidden}',
      '#_app-nav button .e{font-size:28px;line-height:1}',
      'body.appmode-nonav #_app-nav{display:none !important}',
      'body.appmode.appmode-nonav .view.active{padding-bottom:24px !important}',
      'body.appmode-nonav #_app-frame{bottom:0 !important}',
      '#_app-nav button.on{color:#fff;background:rgba(255,255,255,.08)}',
      // external-page iframe host (sits between the header and the bottom nav)
      '#_app-frame{position:fixed;top:50px;left:0;right:0;bottom:104px;z-index:2147481000;background:#fff;display:none}',
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
      '#_app-nav button{font-size:14.5px}',
      // Fyrirtæki í þjónustu-taflan (#ars-main) í appmode: litlu hringlaga
      // hnapparnir (forgangur ❗ / akstur 🚗 / merkja ✓ / staða) teygðust í
      // 50px sporöskjur af thumb-target reglunni (.view button{min-height:50px})
      // — „pulled circle". Undanskiljum þá svo þeir haldist hringlaga.
      'body.appmode #ars-main table button,body.appmode #ars-main table .akstur,body.appmode #ars-main table ._arsak-chip{min-height:0 !important;height:auto !important;padding-top:2px !important;padding-bottom:2px !important;line-height:1.1 !important}',
      // Kröfu yfirlit is an OVERVIEW list. The 50px-on-every-button rule turns
      // 8 .ky-abtn + month ◀▶ into sausages and the 52px input blows the
      // always-visible minnispunktur. Patch 166 owns compact sizes; we only
      // stop the hammer here (same pattern as #ars-main above).
      'body.appmode #view-krofu-yfirlit .ky-abtn,body.appmode #view-krofu-yfirlit .ky-navbtn,body.appmode #view-krofu-yfirlit .ky-mcopy,body.appmode #view-krofu-yfirlit .filter-chip,body.appmode #view-krofu-yfirlit ._ky-sync,body.appmode #view-krofu-yfirlit ._ky-exp{min-height:0 !important;padding-top:0 !important;padding-bottom:0 !important}',
      'body.appmode #view-krofu-yfirlit input._ky-note,body.appmode #view-krofu-yfirlit input._ky-search,body.appmode #view-krofu-yfirlit select._ky-sort{min-height:44px !important;font-size:16px !important}',
      // Full lárétt skrun á töflunni svo hægt sé að ná alla leið að „2026"-dálknum.
      // Staða-pillan í síðasta dálki (grænn/blár/gulur) datt út af hægri brún —
      // hún flæddi út fyrir skrun-breidd töflunnar. Víkkum töfluna + bætum
      // hægri-fyllingu í síðasta reit svo pillan sitji ÖLL innan skrunsins.
      'body.appmode #ars-main ._ars-tblscroll{overflow-x:auto !important;-webkit-overflow-scrolling:touch;max-width:100vw !important;padding-bottom:8px}',
      'body.appmode #ars-main ._ars-tblscroll table{min-width:1320px !important}',
      'body.appmode #ars-main ._ars-tblscroll td:last-child,body.appmode #ars-main ._ars-tblscroll th:last-child{padding-right:26px !important}',
      'body.appmode #ars-main ._ars-tblscroll td:last-child > div{justify-content:flex-start !important}',
      // In-app síðu-ritill (⚙ Síður) — yfirlagt spjald
      '#_app-pgedit{position:fixed;inset:0;z-index:2147482000;background:rgba(6,7,10,.55);display:none;align-items:flex-end;justify-content:center}',
      '#_app-pgedit ._pe-card{background:#fff;width:100%;max-width:560px;max-height:82vh;display:flex;flex-direction:column;border-radius:20px 20px 0 0;box-shadow:0 -10px 40px rgba(0,0,0,.4)}',
      '#_app-pgedit ._pe-h{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:16px 18px 8px;font-size:18px;font-weight:800;color:#11141c}',
      '#_app-pgedit ._pe-h button{font:inherit;font-size:15px;font-weight:700;padding:9px 15px;border-radius:10px;border:1px solid #d7dce4;background:#f1f5f9;color:#334155;cursor:pointer;min-height:44px}',
      '#_app-pgedit ._pe-sub{padding:0 18px 8px;font-size:13px;color:#64748b}',
      '#_app-pgedit ._pe-list{overflow-y:auto;-webkit-overflow-scrolling:touch;padding:6px 12px calc(20px + env(safe-area-inset-bottom,0px))}',
      '#_app-pgedit ._pe-row{display:flex;align-items:center;gap:13px;padding:13px 10px;border-radius:12px;cursor:pointer;font-size:16.5px;color:#1f2937}',
      '#_app-pgedit ._pe-row:active{background:#f1f5f9}',
      '#_app-pgedit ._pe-row input{width:24px;height:24px;accent-color:#0e7a4f;flex:none}',
      '#_app-pgedit ._pe-row .e{font-size:22px}',
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
  /* ── FYLKI: síður × öpp ─────────────────────────────────────────────────────
   * Agnar 29.08: "öll öppin eru með allskonar útgáfur núna með sömu síðunni …
   * listaðu frekar allar tilbúnar síður og öppin til hliðar, og sjá bara
   * checkmark hvaða síður hvert app á að vera með."
   *
   * Áður: sex öpp, hvert með sinn samanbrotna lista yfir allar 35 síðurnar.
   * Til að sjá hvar EIN síða er notuð þurfti að opna sex lista og bera saman.
   * Núna: eitt fylki — síður niður, öpp til hliðar, hak í skurðpunkti.
   *
   * ÚTGÁFUR. Sumar síður eru til í fleiri en einni útfærslu undir ólíkum lyklum
   * (Kröfu yfirlit í Slökkvitæki OG í Brunahólfi; tvær reikningagerðir). Þær
   * eru hópaðar í eina röð með v1/v2-merki svo sjáist að þetta er sama síðan —
   * annars líta þær út eins og ótengdar síður í 35-línu lista.
   * Hóparnir eru TALDIR UPP, ekki giskaðir: sjálfvirk pörun á heitum myndi
   * para saman óskyldar síður um leið og einhver endurnefnir eitthvað.        */
  var VARIANT_OF = {
    'br-krofuyfirlit':  'krofu-yfirlit',
    'br-hreyfingar':    'hreyfingarlisti',
    'br-reikningagerd': 'br-gerdreikninga'
  };

  function matrixRows() {
    var pages = allPages();
    var byKey = {}; pages.forEach(function (p) { byKey[p.k] = p; });
    var kids = {};
    pages.forEach(function (p) {
      var par = VARIANT_OF[p.k];
      if (par && byKey[par]) { (kids[par] = kids[par] || []).push(p); }
    });
    var rows = [];
    pages.forEach(function (p) {
      if (VARIANT_OF[p.k] && byKey[VARIANT_OF[p.k]]) return;   // birtist sem útgáfa
      rows.push({ page: p, v: 1, parent: null });
      (kids[p.k] || []).forEach(function (c, i) {
        rows.push({ page: c, v: i + 2, parent: p });
      });
    });
    return rows;
  }

  function matrixHtml() {
    var apps = APPS.map(function (b) { return effectiveApp(b.key); })
                   .filter(function (a) { return !a.standalone; });
    var sel = {};
    apps.forEach(function (a) { sel[a.key] = {}; pagesFor(a.key).forEach(function (k) { sel[a.key][k] = 1; }); });

    var head = '<th class="mx-cnr">Síða</th>' + apps.map(function (a) {
      return '<th class="mx-ah" title="' + esc(a.name) + '">' +
        '<div class="mx-ae">' + esc(a.emoji) + '</div>' +
        '<div class="mx-an">' + esc(a.name) + '</div></th>';
    }).join('') + '<th class="mx-op"></th>';

    var body = matrixRows().map(function (r) {
      var p = r.page;
      var nafn = r.parent
        ? '<span class="mx-vb">v' + r.v + '</span>' + esc(p.label)
        : '<span class="mx-pe">' + p.emoji + '</span>' + esc(p.label) +
          (r.v === 1 && matrixRows().filter(function (x) { return x.parent === p; }).length
            ? '<span class="mx-vb">v1</span>' : '');
      var cells = apps.map(function (a) {
        return '<td class="mx-c"><input type="checkbox" class="_op-mx" data-app="' + a.key +
               '" data-k="' + p.k + '"' + (sel[a.key][p.k] ? ' checked' : '') + '></td>';
      }).join('');
      return '<tr class="' + (r.parent ? 'mx-sub' : '') + '">' +
        '<th class="mx-rh">' + nafn + '</th>' + cells +
        '<td class="mx-op"><button class="mx-open _op-mxopen" data-k="' + p.k +
        '" type="button" title="Opna síðuna og sjá útlitið">↗</button></td></tr>';
    }).join('');

    return '<details class="op-card mx-box" open><summary class="mx-sum">' +
        '<span class="mx-sum-t">▦ Fylki — hvaða síður eru í hvaða appi</span>' +
        '<span class="mx-sum-n">' + matrixRows().length + ' síður · ' + apps.length + ' öpp</span>' +
      '</summary>' +
      '<div class="mx-scroll"><table class="mx-t"><thead><tr>' + head + '</tr></thead>' +
      '<tbody>' + body + '</tbody></table></div>' +
      '<div class="mx-hint">Strjúktu til hliðar til að sjá fleiri öpp · ↗ opnar síðuna svo þú sjáir útlitið</div>' +
    '</details>';
  }

  function render() {
    styles();
    var v = viewEl();
    var cards = APPS.map(function (base) {
      var a = effectiveApp(base.key);
      var sel = pagesFor(a.key);
      var selSet = {}; sel.forEach(function (k) { selSet[k] = 1; });
      var pageRows = allPages().map(function (p) {
        return '<label class="op-pg"><input type="checkbox" class="_op-pg" data-app="' + a.key + '" data-k="' + p.k + '"' + (selSet[p.k] ? ' checked' : '') + '>' +
          '<span class="e">' + p.emoji + '</span><span>' + esc(p.label) + '</span></label>';
      }).join('');
      // Síðuvalið var áður alltaf opið undir HVERJU appi → risalöng, kaótísk síða
      // (6 öpp × allur síðulistinn). Nú lokað sjálfgefið í <details> með teljara,
      // svo launcher-inn er þéttur; smellt til að velja síður.
      var pagesSection = a.standalone ? '' :
        ('<details class="op-pagesbox"><summary class="op-pgsum">' +
          '<span class="op-pgsum-t">⚙ Síður í appinu</span>' +
          '<span class="op-pgcount" data-app="' + a.key + '">' + sel.length + ' valdar</span>' +
          '<span class="op-pgchev">▾</span>' +
        '</summary><div class="op-pages">' + pageRows + '</div></details>');
      return '<div class="op-card">' +
        '<div class="op-top"><div class="op-ic" style="' + (a.key === 'boss' ? BOSS_BG_CSS : ('background:linear-gradient(180deg,' + esc(a.color) + ',' + esc(a.dark) + ')')) + '">' + (a.key === 'boss' ? bossCrownSvg(30) : esc(a.emoji)) + '</div>' +
          '<div><div class="op-nm">' + esc(a.name) + '</div><div class="op-bl">' + esc(a.blurb) + '</div></div></div>' +
        '<div class="op-acts">' +
          '<button class="op-btn prim _op-open" data-app="' + a.key + '" style="background:linear-gradient(180deg,' + esc(a.color) + ',' + esc(a.dark) + ')" type="button">▶ Opna</button>' +
          (a.custom ? '' : '<button class="op-btn _app-install _op-install" data-app="' + a.key + '" data-always="1" type="button">⤓ Setja upp í síma</button>') +
          '<button class="op-btn _op-link" data-app="' + a.key + '" type="button">🔗 Afrita hlekk</button>' +
          (a.custom ? '' : '<button class="op-btn _op-panel" data-app="' + a.key + '" type="button">⚙ Þjónustuborð</button>') +
          (a.custom ? '<button class="op-btn _op-delapp" data-app="' + a.key + '" type="button" style="color:#b91c1c;border-color:#fecaca">🗑 Eyða appi</button>' : '') +
        '</div>' +
        pagesSection +
      '</div>';
    }).join('');
    var ver = versionLine();
    v.innerHTML = '<div class="op-main"><h1 class="op-h1">📱 Öpp</h1>' +
      '<p class="op-sub">Léttar, símavænar útgáfur með völdum síðum — hver með eigin hlekk og hægt að setja upp í símann.</p>' +
      matrixHtml() +
      cards +
      '<div class="op-card" style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;min-height:170px;border:2px dashed #cbd5e1;background:rgba(255,255,255,.06)">' +
        '<div style="font-size:34px;line-height:1">➕</div>' +
        '<button class="op-btn prim" id="_op-newapp" type="button" style="background:linear-gradient(180deg,#334155,#0f172a)">Búa til app</button>' +
        '<div style="font-size:11.5px;color:#94a3b8;text-align:center;max-width:220px">Nefndu appið og hakaðu svo við í „⚙ Síður í appinu" hvaða síður birtast í því</div>' +
      '</div>' +
      (ver ? '<div style="text-align:center;font-size:11px;color:rgba(255,255,255,.4);margin-top:4px">Útgáfa ' + esc(ver) + '</div>' : '') +
      '</div>';
    v.querySelectorAll('._op-open').forEach(function (b) { b.addEventListener('click', function () { location.href = appLink(b.dataset.app); }); });
    var nb = v.querySelector('#_op-newapp'); if (nb) nb.addEventListener('click', function (e) { e.preventDefault(); createCustomApp(); });
    v.querySelectorAll('._op-delapp').forEach(function (b) { b.addEventListener('click', function (e) { e.preventDefault(); deleteCustomApp(b.dataset.app); }); });
    v.querySelectorAll('._op-install').forEach(function (b) { b.addEventListener('click', function () {
      // ALDREI nota deferredPrompt sem var fangaður HÉR á launcher-síðunni —
      // beforeinstallprompt er bundinn við manifestið sem gilti þegar hann
      // kviknaði (aðal-appið á "/"), svo prompt() setti upp AÐALAPPIÐ þó
      // setManifest() skipti hlekknum eftirá (rót „Fjármál varð aðalappið").
      // Farðu alltaf á eigin /app/<key>/ scope — þar fangar vafrinn RÉTTA
      // manifestið og ?install=1 opnar uppsetningargluggann sjálfkrafa.
      location.href = appLink(b.dataset.app) + '?install=1';
    }); });
    v.querySelectorAll('._op-link').forEach(function (b) { b.addEventListener('click', function () {
      var url = appLink(b.dataset.app);
      try { navigator.clipboard.writeText(url); toast('🔗 Hlekkur afritaður'); } catch (_) { toast(url); }
    }); });
    v.querySelectorAll('._op-panel').forEach(function (b) { b.addEventListener('click', function () { openControlPanel(b.dataset.app); }); });
    /* Fylkis-hakið skrifar BEINT í geymsluna og speglar sig svo í gamla
     * app-listann (og teljarann hans) — annars fara sýnirnar tvær úr takti og
     * notandinn sér tvö ólík svör við sömu spurningu. */
    v.querySelectorAll('._op-mx').forEach(function (cb) { cb.addEventListener('change', function () {
      var app = cb.dataset.app, k = cb.dataset.k;
      var cur = pagesFor(app).slice();
      var i = cur.indexOf(k);
      if (cb.checked) { if (i < 0) cur.push(k); } else if (i >= 0) { cur.splice(i, 1); }
      saveCfg(app, cur);
      var tvi = v.querySelector('._op-pg[data-app="' + app + '"][data-k="' + k + '"]');
      if (tvi) tvi.checked = cb.checked;
      var cnt = v.querySelector('.op-pgcount[data-app="' + app + '"]');
      if (cnt) cnt.textContent = cur.length + ' valdar';
    }); });
    v.querySelectorAll('._op-mxopen').forEach(function (b) { b.addEventListener('click', function (e) {
      e.preventDefault(); e.stopPropagation();
      var p = pageByKey(b.dataset.k); if (!p) return;
      // Brunahólfs-síður eiga sína eigin slóð; heimasíður fara um switchView.
      if (p.url) { window.open(p.url, '_blank', 'noopener'); return; }
      try { if (window.App && App.switchView) App.switchView(p.k); else location.hash = '#' + p.k; }
      catch (_) { location.hash = '#' + p.k; }
    }); });
    v.querySelectorAll('._op-pg').forEach(function (cb) { cb.addEventListener('change', function () {
      var app = cb.dataset.app;
      var picked = allPages().map(function (p) { return p.k; }).filter(function (k) {
        var el = v.querySelector('._op-pg[data-app="' + app + '"][data-k="' + k + '"]'); return el && el.checked;
      });
      saveCfg(app, picked);
      var cnt = v.querySelector('.op-pgcount[data-app="' + app + '"]');
      if (cnt) cnt.textContent = picked.length + ' valdar';
      var mx = v.querySelector('._op-mx[data-app="' + app + '"][data-k="' + cb.dataset.k + '"]');
      if (mx) mx.checked = cb.checked;
    }); });
  }

  // ── app-mode shell (bottom nav + header) ─────────────────────────────────────
  var _curPage = null;
  var _bootAt = Date.now();
  function buildShell() {
    _bootAt = Date.now();
    var a = effectiveApp(ACTIVE); if (!a) return;
    styles();
    document.body.classList.add('appmode');
    document.body.setAttribute('data-app', a.key);
    var pages = pagesFor(a.key); if (!pages.length) pages = a.defaults.slice();
    // App-mode á að opnast á SÍNU auðkennis-síðu (home), ekki hvað sem raðast
    // fremst í valdar síður. „Síður í appinu"-hökin vistast í PAGES-röð, svo t.d.
    // Verkefnalista-appið (verkbord) fékk krofu-yfirlit fremst þegar það var valið
    // með — og opnaðist ranglega á Fjármála-skjánum. Hífum home fremst í nav + boot.
    if (a.home && pages.indexOf(a.home) > 0) {
      pages = [a.home].concat(pages.filter(function (k) { return k !== a.home; }));
    }

    var isBoss = a.key === 'boss';
    var hdr = document.getElementById('_app-hdr') || document.createElement('div');
    hdr.id = '_app-hdr'; hdr.style.display = ''; hdr.style.background = isBoss ? BOSS_BG_CSS.replace('background:', '') : ('linear-gradient(180deg,' + a.color + ',' + a.dark + ')');
    hdr.innerHTML = '<div class="nm">' + (isBoss ? bossCrownSvg(26) + '<span style="' + BOSS_GOLD_CSS + '">' + esc(a.name) + '</span>' : esc(a.emoji) + ' ' + esc(a.name)) + '</div>' +
      (a.standalone ? '' : '<button id="_app-pages" type="button" title="Þjónustuborð — síður, útlit, útgáfa">⚙ Þjónustuborð</button>') +
      '<button class="_app-install" data-always="1" id="_app-inst2" type="button">⤓ Setja upp</button>' +
      '<button id="_app-exit" type="button" title="Loka appi">✕</button>';
    if (!hdr.parentNode) document.body.appendChild(hdr);

    var nav = document.getElementById('_app-nav') || document.createElement('div');
    nav.id = '_app-nav'; nav.style.display = '';
    nav.innerHTML = pages.map(function (k) {
      var p = pageByKey(k) || { emoji: '•', label: k };
      return '<button class="_app-tab" data-k="' + k + '"><span class="e">' + p.emoji + '</span>' + esc(p.short || p.label) + '</button>';
    }).join('');
    if (!nav.parentNode) document.body.appendChild(nav);
    // Ein síða → ekkert að velja: fela dokkinn alveg (risaflísin fór hálfan skjáinn).
    document.body.classList.toggle('appmode-nonav', pages.length < 2);

    nav.querySelectorAll('._app-tab').forEach(function (b) { b.addEventListener('click', function () { goPage(b.dataset.k); }); });
    hdr.querySelector('#_app-inst2').addEventListener('click', function () {
      // Uppsetning gildir aðeins innan eigin /app/<key>/ scope-s. Ef komið var
      // inn um gamla ?app=<key> hlekkinn er síðan UTAN scope-sins og prompt-inn
      // (ef einhver) tilheyrir aðalappinu — hoppa þá fyrst á réttu slóðina.
      if ((location.pathname || '').indexOf('/app/' + a.key + '/') !== 0) {
        location.href = appLink(a.key) + '?install=1'; return;
      }
      setManifest(a.manifest); doInstall();
    });
    hdr.querySelector('#_app-exit').addEventListener('click', function () { location.href = location.origin + '/'; });
    var _pgBtn = hdr.querySelector('#_app-pages');
    if (_pgBtn) _pgBtn.addEventListener('click', function () { openControlPanel(ACTIVE); });

    setManifest(a.manifest);   // install captures THIS app
    syncFrameBottom();
    // Endurbygging (vaktarinn) á EKKI að hoppa til baka á fyrstu síðu — nema
    // núverandi síða hafi verið tekin úr appinu (þá förum við á home/fyrstu).
    goPage((_curPage && pages.indexOf(_curPage) !== -1) ? _curPage : pages[0]);
    hideSplash();
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
  // ── Þjónustuborð (síður + útlit + útgáfa) ───────────────────────────────────
  // Áður var EINA leiðin til að bæta síðu við app að fara á Öpp-launcher-síðuna í
  // vafranum → haka → og svo var uppsetta appið í símanum ekki uppfært fyrr en
  // það var tekið út og sett upp aftur. Núna má breyta síðum, nafni/lýsingu/tákni/
  // lit BEINT — bæði inni í appinu sjálfu OG frá launcher-kortinu — breytist strax
  // (buildShell()/render() endurteikna lifandi), engin endur-uppsetning. Tekur
  // `key` (ekki bara ACTIVE) svo sama spjaldið dugi hvort sem kallað er innan úr
  // appi eða af 📱 Öpp-síðunni áður en appið er einu sinni opnað.
  function refreshAfterEdit(key) { if (ACTIVE === key) buildShell(); else render(); }
  function openControlPanel(key) {
    var a = effectiveApp(key); if (!a) return;
    var selSet = {}; pagesFor(a.key).forEach(function (k) { selSet[k] = 1; });
    var ver = versionLine();
    var ov = document.getElementById('_app-pgedit') || document.createElement('div');
    ov.id = '_app-pgedit';
    var pagesBlock = a.standalone ? '' :
      '<div class="op-sech" style="margin:14px 18px 6px">Síður í appinu</div>' +
      '<div class="_pe-sub">Hakaðu við síðurnar sem eiga að vera í appinu.</div>' +
      '<div class="_pe-list">' + allPages().map(function (p) {
        return '<label class="_pe-row"><input type="checkbox" class="_pe-pg" data-k="' + p.k + '"' + (selSet[p.k] ? ' checked' : '') + '>' +
          '<span class="e">' + p.emoji + '</span><span>' + esc(p.label) + '</span></label>';
      }).join('') + '</div>';
    ov.innerHTML =
      '<div class="_pe-card">' +
        '<div class="_pe-h"><span>⚙ Þjónustuborð — ' + esc(a.name) + '</span><button id="_pe-close" type="button">Loka</button></div>' +
        '<div class="_pe-list">' +
          '<div class="op-sech" style="margin:4px 8px 8px">Útlit</div>' +
          '<div style="display:flex;flex-direction:column;gap:10px;padding:0 10px 14px;font-size:13.5px;color:#334155">' +
            '<label style="display:flex;flex-direction:column;gap:4px">Nafn' +
              '<input class="_pe-name" value="' + esc(a.name) + '" style="padding:9px 11px;border:1px solid #d7dce4;border-radius:9px;font:inherit;font-size:15px"></label>' +
            '<label style="display:flex;flex-direction:column;gap:4px">Lýsing' +
              '<input class="_pe-blurb" value="' + esc(a.blurb || '') + '" style="padding:9px 11px;border:1px solid #d7dce4;border-radius:9px;font:inherit;font-size:15px"></label>' +
            '<div style="display:flex;gap:14px;align-items:flex-end;flex-wrap:wrap">' +
              '<label style="display:flex;flex-direction:column;gap:4px">Tákn' +
                '<input class="_pe-emoji" value="' + esc(a.emoji) + '" maxlength="4" style="width:64px;padding:9px 11px;border:1px solid #d7dce4;border-radius:9px;font:inherit;font-size:20px;text-align:center"></label>' +
              '<label style="display:flex;flex-direction:column;gap:4px">Litur (efst)' +
                '<input class="_pe-color" type="color" value="' + esc(a.color) + '" style="width:52px;height:40px;padding:2px;border:1px solid #d7dce4;border-radius:9px"></label>' +
              '<label style="display:flex;flex-direction:column;gap:4px">Litur (neðst)' +
                '<input class="_pe-dark" type="color" value="' + esc(a.dark) + '" style="width:52px;height:40px;padding:2px;border:1px solid #d7dce4;border-radius:9px"></label>' +
              '<button class="_pe-reset-look" type="button" style="font:inherit;font-size:13px;font-weight:700;padding:9px 13px;border-radius:9px;border:1px solid #d7dce4;background:#f1f5f9;color:#64748b;cursor:pointer;min-height:40px">Núllstilla</button>' +
            '</div>' +
            '<div style="font-size:11.5px;color:#94a3b8;line-height:1.5">Þetta breytir tákninu/litnum sem birtist HÉR í appinu (spjald, haus, hleðsluskjár) — ekki sjálfri heimaskjás-táknmyndinni, sem er föst mynd og krefst nýrrar hönnunar.</div>' +
          '</div>' +
          pagesBlock +
          '<div class="op-sech" style="margin:14px 18px 6px">Upplýsingar</div>' +
          '<div style="padding:0 18px 18px;font-size:12.5px;color:#64748b;line-height:1.7">' +
            'Útgáfa: ' + (ver ? esc(ver) : '—') + '<br>' +
            'Hlekkur: <code style="font-size:11.5px">' + esc(appLink(a.key)) + '</code>' +
          '</div>' +
        '</div>' +
      '</div>';
    if (!ov.parentNode) document.body.appendChild(ov);
    ov.style.display = 'flex';
    ov.querySelector('#_pe-close').addEventListener('click', function () { ov.style.display = 'none'; });
    ov.addEventListener('click', function (e) { if (e.target === ov) ov.style.display = 'none'; });
    ov.querySelectorAll('._pe-pg').forEach(function (cb) {
      cb.addEventListener('change', function () {
        var checked = Array.prototype.slice.call(ov.querySelectorAll('._pe-pg:checked')).map(function (x) { return x.dataset.k; });
        if (!checked.length) { cb.checked = true; return; }         // alltaf a.m.k. ein síða
        var picked = allPages().map(function (p) { return p.k; }).filter(function (k) { return checked.indexOf(k) !== -1; });
        saveCfg(a.key, picked);
        refreshAfterEdit(a.key);
      });
    });
    function bindLook(sel, field) {
      var el = ov.querySelector(sel); if (!el) return;
      el.addEventListener('change', function () {
        var patch = {}; patch[field] = el.value.trim();
        saveOverrides(a.key, patch);
        refreshAfterEdit(a.key);
        openControlPanel(a.key);   // endurteiknar spjaldið sjálft með nýjum gildum
      });
    }
    bindLook('._pe-name', 'name');
    bindLook('._pe-blurb', 'blurb');
    bindLook('._pe-emoji', 'emoji');
    bindLook('._pe-color', 'color');
    bindLook('._pe-dark', 'dark');
    var resetBtn = ov.querySelector('._pe-reset-look');
    if (resetBtn) resetBtn.addEventListener('click', function () {
      saveOverrides(a.key, { name: '', blurb: '', emoji: '', color: '', dark: '' });
      refreshAfterEdit(a.key);
      openControlPanel(a.key);
    });
  }

  function goPage(k) {
    _curPage = k;
    var p = pageByKey(k);
    if (p && p.minarId) {
      // Stök vistuð Mínar síður-síða — opna BEINT á hana (ekki bara flipann í heild).
      hideFrame();
      if (window.MinarSidur && window.MinarSidur.openPage) window.MinarSidur.openPage(p.minarId);
      else navTo('minar-sidur');
    } else if (p && p.url) showFrame(p);      // external (Brunahólf) page → iframe
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
        var _app = APP_BY_KEY[ACTIVE] || {};
        var _home = (_app.home && allowed.indexOf(_app.home) !== -1) ? _app.home : allowed[0];
        // Óheimil síða (t.d. sjálfgefinn krofu-yfirlit-landari á boot) → snappa á
        // home/fyrstu síðu jafnvel þótt _curPage sé enn óstillt (annars sat appið fast).
        if (allowed.indexOf(view) === -1 && view !== NAV_KEY) { setTimeout(function () { goPage(_curPage || _home); }, 0); }
        else if (view !== _curPage && _curPage) {
          // Leyfð síða en EKKI valin í botn-navinu: fyrstu sekúndurnar er þetta
          // boot-landerinn (sala.js opnar #sala eftir á) → festa fyrstu síðuna
          // aftur; seinna er þetta lögmæt in-page leið → uppfæra flipa-ljósið.
          if (Date.now() - _bootAt < 12000) { setTimeout(function () { if (_curPage) goPage(_curPage); }, 0); }
          else {
            _curPage = view;
            var nv = document.getElementById('_app-nav');
            if (nv) nv.querySelectorAll('._app-tab').forEach(function (b) { b.classList.toggle('on', b.dataset.k === view); });
          }
        }
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
