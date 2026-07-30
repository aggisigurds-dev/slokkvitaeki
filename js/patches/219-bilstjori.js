/* === BÍLSTJÓRI (Drivers app) v2 ===
 *
 * A full-screen, sidebar-less mobile page for the drivers. Per the owner:
 * "we don't need the side panel or anything in the app — only Leiðsögn and a
 * soft version of Fyrirtæki í þjónustu." So this view is a full-screen overlay
 * (covers the sidebar) with two stacked surfaces, the same map-then-list shape
 * Leiðsögn already uses:
 *
 *   1. 🗺️ Leiðsögn — a Leaflet map of the in-service customers, pins coloured
 *      by the SAME statusFor rule (green/amber/red). Tap a pin → company sheet.
 *      "🚗 Keyra leið dagsins" routes the due stops via Google Maps.
 *   2. 🏢 Fyrirtæki (soft) — a simplified in-service list (search + Dagsins verk
 *      / Allir). Tap a row → company sheet.
 *
 * Company sheet (slide-in, back top-left): "Keyra þangað", call, shared
 * minnispunktar + an 🚨 urgent message (both saved to arsskodun_customers[id]
 * via AppSettings.save → sync office↔driver, also shown in Leiðsögn), and the
 * tækjalisti — SAMA form og fyrirtækjasíða skrifstofunnar (patch 224):
 *   ✓ Yfirfarið · 🔧 Á verkstæði   (staða → uttaeki.status: ok / loaned /
 *                                   active, + last_insp/next_insp á Yfirfarið;
 *                                   'loaned' lætur tækið birtast sjálfkrafa á
 *                                   verkstæðis-borðunum í 268/269)
 *   Yfirferð | Hleðsla | Nýtt · 🚫 Ónýtt   (þjónustuval → trip-state
 *                                   slokk_trip_<coId>.units[uid] gegnum patch
 *                                   131, sem verðvélin 129 + reikningurinn 165
 *                                   lesa — engin ný gildi, engin ný tafla)
 * "✅ Tekið út" sets field_inspected_year.
 *
 * Styling uses the app's css/app.css design tokens (--brand, --font, --grn …)
 * so it looks native. Reuses Leiðsögn's getCustomers / addToRoute / launchNav
 * and the geocode cache (no parallel data). Deep-linkable #bilstjori (patch 218).
 *
 * Mobile-first: ≥44px targets, ≥16px text, bottom thumb-zone actions, stack
 * nav, loading/error/offline (DB.cache) states.
 */
(() => {
  if (window.__bilstjoriInstalled) return;
  window.__bilstjoriInstalled = true;

  const VIEW_ID = 'view-bilstjori';
  const NAV_KEY = 'bilstjori';
  const GC_KEY  = '_slokk_gc';

  // Locked "driver mode": when the URL carries ?driver the app opens straight
  // into Bílstjóri and the driver cannot leave — no exit button, the sidebar is
  // hidden, and any attempt to navigate to another view snaps back here. The
  // office keeps full access via the bare URL (no ?driver). This is a focus
  // lock for the shared driver link / installed app, not security.
  // Locked also via the app-profile link (?app=bilstjori) so the „🚚 Bílstjóri"
  // card on the Öpp-page installs/boots straight into this locked view — the
  // legacy ?driver share-link stays a valid alias.
  const LOCKED = (() => {
    try {
      if (/^\/app\/bilstjori\/?/.test(location.pathname || '')) return true;   // own PWA scope
      const sp = new URLSearchParams(location.search); return sp.has('driver') || sp.get('app') === 'bilstjori';
    } catch (_) {
      return /^\/app\/bilstjori/.test(location.pathname || '') || /[?&]driver(?:$|[=&])/.test(location.search || '') || /[?&]app=bilstjori(?:$|[&])/.test(location.search || '');
    }
  })();
  const DRIVER_LINK = () => location.origin + '/app/bilstjori/';

  // In locked driver mode, swap the PWA manifest to the dedicated Bílstjóri
  // one so Android/iOS "Install app" captures a clean "Bílstjóri" home-screen
  // app that opens straight at /?driver — instead of offering "open in Fjármál"
  // (patch 261's app manifests all scope "/", which otherwise grabs this URL
  // and drops the driver into the wide office shell).
  if (LOCKED) {
    try {
      let link = document.querySelector('link[rel="manifest"]');
      if (!link) { link = document.createElement('link'); link.rel = 'manifest'; document.head.appendChild(link); }
      link.setAttribute('href', '/manifest-bilstjori.json?v=1');
      // 2026-07-17: appið opnist ALLTAF í app-skala (device-width, zoom 1) —
      // grunn-viewportið leyfir pinch-zoom og út-zoomað ástand gat setið fast
      // í uppsetta appinu svo allt birtist agnarsmátt. Bílstjóra-appið þarf
      // ekki pinch-zoom, svo læst hamur festir skalann.
      let vp = document.querySelector('meta[name="viewport"]');
      if (!vp) { vp = document.createElement('meta'); vp.setAttribute('name', 'viewport'); document.head.appendChild(vp); }
      vp.setAttribute('content', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover');
      const tc = document.querySelector('meta[name="theme-color"]');
      if (tc) tc.setAttribute('content', '#0a0b0d');
      // Driver app = full-width phone app. The base .bt.screen caps at 440px
      // and centers — on a wide/PWA layout viewport that leaves ugly grey
      // margins („wide view"). Locked mode fills the screen edge-to-edge.
      const st = document.createElement('style');
      st.id = '_bs-locked-css';
      st.textContent =
        '#view-bilstjori #_bs-root.bt.screen{max-width:100%!important}' +
        '#view-bilstjori .bt .dock,#view-bilstjori .bt.screen .dock,#view-bilstjori .bt .dock--wide{max-width:100%!important}' +
        '._bs-sheet.bt.screen{max-width:100%!important}';
      (document.head || document.documentElement).appendChild(st);
    } catch (_) {}
  }

  // ── helpers ──────────────────────────────────────────────────────────────
  function esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    })[c]);
  }
  function fmtKt(kt) {
    const s = String(kt || '').replace(/\D/g, '');
    return s.length === 10 ? s.slice(0,6) + '-' + s.slice(6) : (kt || '');
  }
  const MONTHS_IS = ['Janúar','Febrúar','Mars','Apríl','Maí','Júní','Júlí','Ágúst','September','Október','Nóvember','Desember'];
  const today = () => new Date().toISOString().slice(0,10);
  const nextYearIso = () => { const t = today(); return (parseInt(t.slice(0,4))+1) + t.slice(4); };
  const curYear = () => new Date().getFullYear();
  function readGc() { try { return JSON.parse(localStorage.getItem(GC_KEY) || '{}'); } catch (_) { return {}; } }

  function companies() { return (window.Companies && Companies.list) || []; }
  function arsAll() { return (window.AppSettings && AppSettings.path && AppSettings.path('arsskodun_customers')) || {}; }
  function bruAll() { return (window.AppSettings && AppSettings.path && AppSettings.path('brunakerfi_customers')) || {}; }
  async function arsSave(coId, patch) {
    if (!window.AppSettings || !AppSettings.save) return false;
    try { return await AppSettings.save({ arsskodun_customers: { [String(coId)]: patch } }); }
    catch (_) { return false; }
  }
  function inService(c, ars, bru) {
    // 2026-07-09 (audit): sama regla og patch 153 — er_i_thjonustu dálkurinn er
    // source-of-truth; áður gat áskrifandi án tækja-blobs VANTAÐ á aksturslistann.
    if (c && c.er_i_thjonustu === true) return true;
    return (ars && (ars.subscribed === true || ars.equipment)) || !!bru ||
      (window.InServiceClients && window.InServiceClients.has && window.InServiceClients.has(c.nafn));
  }
  function statusFor(ars) {
    const a = ars || {};
    const cy = curYear(), cm = new Date().getMonth() + 1;
    const m = +a.inspect_month || 0;
    const lastYr = +a.last_year_inspected || 0;
    const fieldYr = +a.field_inspected_year || 0;
    const isDone = lastYr === cy;
    const isFieldOnly = !isDone && fieldYr === cy;
    const isOverdue = !isDone && !isFieldOnly && m > 0 && m < cm;
    const isDueNow = !isDone && !isFieldOnly && m === cm;
    if (isDone)      return { key:'done',        color:'#1a7f4b', label:'Í lagi ' + cy };
    if (isFieldOnly) return { key:'in_progress', color:'#b45309', label:'Tekið út — skjöl eftir' };
    if (isOverdue)   return { key:'overdue',     color:'#C93C1D', label:'Útrunnið (' + (MONTHS_IS[m-1] || '?') + ')' };
    if (isDueNow)    return { key:'duenow',      color:'#b45309', label:'Þessi mánuður' };
    if (m > 0)       return { key:'scheduled',   color:'#404550', label:'Á dagskrá: ' + (MONTHS_IS[m-1] || '?') };
    return { key:'unknown', color:'#8891a0', label:'Engin dagsetning' };
  }
  // statusFor().key → theme variant (rail / pill / pin): overdue→overdue,
  // done/in_progress→done, everything else (duenow/scheduled/unknown)→pending.
  function variantFor(key) {
    if (key === 'done' || key === 'in_progress') return 'done';
    if (key === 'overdue') return 'overdue';
    return 'pending';
  }
  function phoneOf(c) { return c.simi || c['sími'] || c.phone || c.telefon || ''; }
  function coordOf(c, gc) { gc = gc || readGc(); return gc['__co__:' + c.id] || gc[c.heimilisfang] || gc[c.nafn] || null; }

  // ── VAKT: starfsmanna-nafn + dagleg virkni + staðsetning ───────────────────
  // Bílstjóri velur nafn sitt (geymt á tæki). Hver aðgerð (heimsókn, yfirfarið,
  // á verkstæði, klárað) er skráð í `bilstjori_vakt` með staðsetningu → skrifstofan
  // sér daglega samantekt + hvar hver er, á aðal-síðu Bílstjóra.
  const EMPLOYEES = ['Hákon', 'Binni', 'Elías', 'Agnar'];
  const EMP_COL = { 'Hákon': '#2563eb', 'Binni': '#059669', 'Elías': '#d97706', 'Agnar': '#dc2626' };
  const EMP_KEY = 'bs_employee';
  const empColor = (n) => EMP_COL[n] || '#64748b';
  function getEmp() { try { return localStorage.getItem(EMP_KEY) || ''; } catch (_) { return ''; } }
  function setEmp(v) { try { v ? localStorage.setItem(EMP_KEY, v) : localStorage.removeItem(EMP_KEY); } catch (_) {} }

  // best-effort staðsetning (uppfærist í bakgrunni meðan appið er opið)
  let _geo = null, _geoWatch = null, _vaktGeo = {}, _vaktTimer = null, _lastAct = {}, _pingTimer = null, _vaktPoll = null;
  function startGeo() {
    if (_geoWatch != null || !navigator.geolocation) return;
    try {
      _geoWatch = navigator.geolocation.watchPosition(
        p => { _geo = { lat: p.coords.latitude, lng: p.coords.longitude }; },
        () => {}, { enableHighAccuracy: false, maximumAge: 120000, timeout: 15000 });
    } catch (_) {}
  }
  async function logAct(action, opts) {
    opts = opts || {};
    const emp = getEmp();
    if (!emp || !(window.DB && DB.sb)) return;
    const k = action + '|' + (opts.co_id || '') + '|' + (opts.uttaeki_id || '');
    const now = Date.now();
    if (action !== 'ping' && _lastAct[k] && now - _lastAct[k] < 3000) return;   // afþreyting
    _lastAct[k] = now;
    const row = { employee: emp, action: action, co_id: opts.co_id || null, co_nafn: opts.co_nafn || null,
      uttaeki_id: opts.uttaeki_id || null, lat: _geo ? _geo.lat : null, lng: _geo ? _geo.lng : null };
    try { await DB.sb.from('bilstjori_vakt').insert(row); } catch (_) {}
    scheduleVaktRefresh();
  }
  function scheduleVaktRefresh() { clearTimeout(_vaktTimer); _vaktTimer = setTimeout(renderVakt, 500); }

  function pickEmp(force) {
    if (document.getElementById('_bs-emppick')) return;
    const wrap = document.createElement('div');
    wrap.id = '_bs-emppick';
    wrap.style.cssText = 'position:fixed;inset:0;z-index:1300;background:rgba(10,11,13,.88);display:flex;align-items:center;justify-content:center;padding:24px';
    wrap.innerHTML =
      '<div style="background:#1b1e24;border:1px solid #2b2f37;border-radius:18px;padding:22px 20px;max-width:360px;width:100%;box-shadow:0 20px 60px -20px #000">' +
        '<div style="font-size:20px;font-weight:800;color:#eef1f4;margin-bottom:16px">Hver ert þú?</div>' +
        '<div style="display:flex;flex-direction:column;gap:10px">' +
          EMPLOYEES.map(n => '<button class="_bs-emp" data-n="' + esc(n) + '" type="button" style="padding:15px;border-radius:12px;border:0;background:' + empColor(n) + ';color:#fff;font:inherit;font-size:17px;font-weight:800;cursor:pointer">' + esc(n) + '</button>').join('') +
          (force ? '' : '<button class="_bs-emp" data-n="" type="button" style="padding:12px;border-radius:12px;border:1px solid #3a3f48;background:transparent;color:#aeb4be;font:inherit;font-size:14px;cursor:pointer">Skrifstofa / sleppa</button>') +
        '</div>' +
      '</div>';
    document.body.appendChild(wrap);
    wrap.querySelectorAll('._bs-emp').forEach(b => b.addEventListener('click', () => {
      setEmp(b.dataset.n || ''); wrap.remove();
      if (b.dataset.n) { startGeo(); logAct('ping', {}); }
      renderVakt();
    }));
  }

  function relTime(iso) {
    if (!iso) return '';
    const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
    if (s < 60) return 'rétt í þessu';
    if (s < 3600) return Math.round(s / 60) + ' mín';
    return Math.round(s / 3600) + ' klst';
  }
  async function renderVakt() {
    const box = document.getElementById('_bs-vakt');
    if (!box || !(window.DB && DB.sb)) return;
    const start = new Date(); start.setHours(0, 0, 0, 0);
    let rows = [];
    try {
      const r = await DB.sb.from('bilstjori_vakt').select('employee,action,co_id,lat,lng,created_at')
        .gte('created_at', start.toISOString()).order('created_at', { ascending: false }).limit(5000);
      rows = r.data || [];
    } catch (_) { return; }
    const agg = {};
    EMPLOYEES.forEach(n => agg[n] = { emp: n, cos: new Set(), yf: 0, vs: 0, last: null, geo: null });
    rows.forEach(x => {
      const a = agg[x.employee]; if (!a) return;
      if (x.co_id && x.action !== 'ping') a.cos.add(x.co_id);
      if (x.action === 'yfirfarid') a.yf++;
      if (x.action === 'verkstaedi') a.vs++;
      if (!a.last) a.last = x.created_at;
      if (!a.geo && x.lat != null) a.geo = { lat: x.lat, lng: x.lng };
    });
    _vaktGeo = {}; EMPLOYEES.forEach(n => { if (agg[n].geo) _vaktGeo[n] = agg[n].geo; });
    const me = getEmp();
    const card = (a) => {
      const tot = a.yf + a.vs, active = !!a.last;
      return '<div style="flex:0 0 auto;min-width:150px;background:' + (active ? 'rgba(255,255,255,.07)' : 'rgba(255,255,255,.03)') + ';border:1px solid ' + (a.emp === me ? empColor(a.emp) : 'rgba(255,255,255,.1)') + ';border-radius:12px;padding:9px 11px">' +
        '<div style="display:flex;align-items:center;gap:6px;margin-bottom:6px">' +
          '<span style="width:9px;height:9px;border-radius:50%;background:' + empColor(a.emp) + ';flex:none;box-shadow:0 0 0 2px rgba(255,255,255,.12)"></span>' +
          '<span style="font-size:13px;font-weight:800;color:#eef1f4">' + esc(a.emp) + '</span>' +
          (a.geo ? '<button class="_bs-vloc" data-n="' + esc(a.emp) + '" type="button" title="Sýna á korti" style="margin-left:auto;border:0;background:transparent;cursor:pointer;font-size:13px;padding:0">📍</button>' : '<span style="margin-left:auto;font-size:10px;color:#6b7280">—</span>') +
        '</div>' +
        '<div style="display:flex;gap:9px;font-size:12px;color:#c7ccd3;font-variant-numeric:tabular-nums">' +
          '<span title="Fyrirtæki">🏢 <b style="color:#fff">' + a.cos.size + '</b></span>' +
          '<span title="Yfirfarið">🟢 <b style="color:#fff">' + a.yf + '</b></span>' +
          '<span title="Á verkstæði">🔵 <b style="color:#fff">' + a.vs + '</b></span>' +
          '<span title="Heild tækja" style="margin-left:auto">Σ <b style="color:#fff">' + tot + '</b></span>' +
        '</div>' +
        '<div style="font-size:10px;color:#8a93a5;margin-top:5px">' + (active ? 'síðast ' + relTime(a.last) : 'engin virkni í dag') + '</div>' +
      '</div>';
    };
    box.innerHTML =
      '<div style="display:flex;align-items:center;gap:8px;margin-bottom:7px">' +
        '<span style="font-size:11.5px;font-weight:800;color:rgba(255,255,255,.85);letter-spacing:.05em">📊 DAGURINN Í DAG</span>' +
        '<button id="_bs-empchip" type="button" style="margin-left:auto;border:1px solid ' + (me ? empColor(me) : '#3a3f48') + ';background:' + (me ? empColor(me) : 'transparent') + ';color:#fff;border-radius:99px;padding:4px 11px;font:inherit;font-size:12px;font-weight:700;cursor:pointer">👤 ' + esc(me || 'Velja nafn') + '</button>' +
      '</div>' +
      '<div style="display:flex;gap:8px;overflow-x:auto;-webkit-overflow-scrolling:touch;padding-bottom:2px">' +
        EMPLOYEES.map(n => card(agg[n])).join('') +
      '</div>';
    const chip = document.getElementById('_bs-empchip');
    if (chip) chip.addEventListener('click', () => pickEmp(false));
    box.querySelectorAll('._bs-vloc').forEach(b => b.addEventListener('click', () => {
      const g = _vaktGeo[b.dataset.n];
      if (g && _map) { try { _map.setView([g.lat, g.lng], 15); } catch (_) {} renderPins(); }
    }));
    renderPins();   // draga starfsmanna-merki á kortið
  }

  function buildList() {
    const ars = arsAll(), bru = bruAll(), gc = readGc();
    const out = [];
    companies().forEach(c => {
      const a = ars[String(c.id)], b = bru[String(c.id)];
      if (!inService(c, a, b)) return;
      out.push({ co: c, ars: a || {}, status: statusFor(a), coord: coordOf(c, gc),
                 priority: +((a || {}).priority) || 0, urgent: (a && a.urgent) ? String(a.urgent).trim() : '' });
    });
    return out;
  }

  // tæki-count (same source as Leiðsögn unitCount): live cache by client name,
  // else the manual arsskodun equipment snapshot. last-inspected year =
  // max(last_year_inspected, field_inspected_year).
  function unitCount(x) {
    const byClient = window.DB && DB.cache && DB.cache.unitsByClient;
    const nafn = x.co && x.co.nafn;
    if (byClient && nafn && byClient[nafn]) return byClient[nafn].length;
    const eq = (x.ars || {}).equipment;
    if (eq && typeof eq === 'object') return Object.values(eq).reduce((s, n) => s + (+n || 0), 0);
    return 0;
  }
  function yearOf(a) { a = a || {}; return Math.max(+a.last_year_inspected || 0, +a.field_inspected_year || 0); }

  // ── Aksturslistar: 3 nefndir listar (per starfsmann) — geymt í
  //    arsskodun_customers[id].akstur (1/2/3, 0=enginn), samstillist office↔driver.
  const AKSTUR = {
    1: { label: 'Akstur 1', dot: '#1d4ed8', bg: '#eff6ff', bd: '#bfdbfe' }, // blár
    2: { label: 'Akstur 2', dot: '#1a7f4b', bg: '#edfaf3', bd: '#a7e8c5' }, // grænn
    3: { label: 'Akstur 3', dot: '#0e7490', bg: '#ecfeff', bd: '#a5f3fc' }  // grænblár
  };
  function aksturOf(a) { const v = +((a || {}).akstur) || 0; return (v >= 1 && v <= 3) ? v : 0; }
  // haversine (km) milli tveggja hnita — fyrir km-áætlun á framvindu-stikunni.
  function havKm(a, b) {
    const R = 6371, dLat = (b.lat - a.lat) * Math.PI / 180, dLng = (b.lng - a.lng) * Math.PI / 180;
    const s = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(s));
  }
  // Litað tæki-tákn eftir tegund (tækjalisti í fyrirtækjaspjaldi).
  function unitIcon(type) {
    const t = String(type || '').toLowerCase();
    if (/co2|co₂|kolsýr|kolsyr/.test(t)) return { cls: 'co2', emoji: '🧯' };
    if (/léttv|lettv|vatn|abf|froð|frod/.test(t)) return { cls: 'vatn', emoji: '🧯' };
    if (/duft|abc/.test(t)) return { cls: 'duft', emoji: '🧯' };
    if (/slang|slöng|slong|skáp|skap/.test(t)) return { cls: 'slang', emoji: '🚿' };
    if (/reyk|skynj/.test(t)) return { cls: 'reyk', emoji: '🔔' };
    if (/teppi/.test(t)) return { cls: 'annad', emoji: '🟥' };
    return { cls: 'annad', emoji: '🧯' };
  }

  let _seg = 'today';   // 'today' | 'all' | 'a1' | 'a2' | 'a3'
  let _search = '';
  const DUE = { overdue:0, duenow:1, scheduled:2, in_progress:3, done:4, unknown:5 };
  function currentList() {
    if (!(window.Companies && Companies.list)) return { ready:false, list:[] };
    let list = buildList();
    if (_seg === 'a1' || _seg === 'a2' || _seg === 'a3') { const n = +_seg.slice(1); list = list.filter(x => aksturOf(x.ars) === n); }
    else if (_seg === 'today') list = list.filter(x => x.status.key === 'overdue' || x.status.key === 'duenow' || x.priority);
    const q = _search.trim().toLowerCase();
    if (q) list = list.filter(x =>
      (x.co.nafn || '').toLowerCase().includes(q) ||
      (x.co.heimilisfang || '').toLowerCase().includes(q) ||
      String(x.co.kennitala || '').replace(/\D/g,'').includes(q.replace(/\D/g,'')));
    list.sort((a, b) =>
      ((+b.priority || 0) - (+a.priority || 0)) ||   // higher forgangur first (3→2→1→0)
      ((DUE[a.status.key] ?? 9) - (DUE[b.status.key] ?? 9)) ||
      String(a.co.nafn).localeCompare(b.co.nafn, 'is'));
    return { ready:true, list };
  }

  // Locked /app/bilstjori/ boots STRAIGHT into this view — nothing navigated to
  // the companies view first, so window.Companies may be empty → the list sits
  // on „⏳ Sæki gögn…" forever. Kick Companies.load() and re-render when ready
  // (poll covers the module/AppSettings arriving late during boot).
  let _loading = false, _dataPoll = null;
  function dataReady() { return !!(window.Companies && Companies.list && Companies.list.length); }
  // Læst /app/bilstjori/ ræsist beint í þessa sýn án þess að nokkuð hlaði fyrirtækin.
  // Companies.load() BAILAR meðan DB.online er ósatt (tengingin ræsist enn) — svo við
  // sækjum fyrirtæki BEINT gegnum DB.sb (Supabase-biðlarinn er til um leið og db.js
  // hleðst, óháð DB.online). Reynt á hverjum púls þar til listinn kemur; _loading
  // kemur í veg fyrir skörun.
  function tryLoad() {
    if (_loading || dataReady()) return;
    if (!(window.DB && DB.sb && typeof DB.fetchAll === 'function')) return;   // biðlarinn ekki tilbúinn enn
    _loading = true;
    Promise.resolve(
      DB.fetchAll(function (from, to) {
        return DB.sb.from('fyrirtaeki').select('*').is('deleted_at', null).order('nafn').range(from, to);
      })
    ).then((rows) => {
      if (rows && rows.length) {
        if (!window.Companies) window.Companies = { list: [] };
        Companies.list = rows;
        renderList(); renderPins();
      }
    }).catch(() => {}).finally(() => { _loading = false; });
  }
  function ensureData() {
    if (dataReady()) return;
    tryLoad();
    if (_dataPoll) return;
    let tries = 0;
    _dataPoll = setInterval(() => {
      tries++;
      if (dataReady()) { clearInterval(_dataPoll); _dataPoll = null; renderList(); renderPins(); return; }
      tryLoad();
      if (tries > 80) { clearInterval(_dataPoll); _dataPoll = null; }   // ~56s cap
    }, 700);
  }

  // ── equipment (uttaeki) ──────────────────────────────────────────────────
  function unitState(u) {
    const st = (u.status || '').toLowerCase();
    if (st === 'loaned') return 'verkstaedi';
    if (st === 'ok' && String(u.last_insp || '').slice(0,4) === String(curYear())) return 'yfirfarid';
    return 'oskodad';
  }
  // Tækja-formið (2026-07-30, ósk Agnars: „change the tæki checklist into this
  // form … but add another button. á verkstæði"): SAMA form og á fyrirtækjasíðu
  // skrifstofunnar (patch 224 UttektTaeki) — ✓ Yfirfarið · Yfirferð|Hleðsla|Nýtt
  // · 🚫 Ónýtt — PLÚS „🔧 Á verkstæði" sem er bílstjóra-aðgerðin (tækið fer með
  // í bílinn á verkstæðið). Tveir aðskildir hlutir, EKKI blandað:
  //
  //   1) STAÐA tækisins  → uttaeki (status/last_insp/next_insp/custody_status)
  //      ✓ Yfirfarið   = status 'ok'      (+ last_insp í dag, next_insp +1 ár)
  //      🔧 Á verkstæði = status 'loaned'  (custody_status null = „Nýkomið")
  //                       → tækið birtist SJÁLFKRAFA á verkstæðis-borðunum
  //                         (268 Aksturslisti + 269 Verkstæði lesa status='loaned')
  //      tapp aftur á virkan takka → ⚪ Óskoðað (status 'active', stimplar hreinsaðir)
  //      — nákvæmlega sömu þrjú gildi og gamli rúllu-chippinn skrifaði.
  //   2) ÞJÓNUSTUVAL (hvað á að gera / rukka) → trip-state, EKKI uttaeki:
  //      localStorage `slokk_trip_<coId>`.units[unitId] gegnum patch 131
  //      UnitServicePicker — nákvæmlega sama geymsla og skrifstofuformið (224)
  //      notar, skýjað með patch 227 og lesið af verðvélinni (129) og
  //      reikningnum (165). Gildin eru orðaforði skrifstofunnar:
  //      'yfirferd' | 'hledsla' | 'nyitt' | 'onytt'.
  // Verkstæðis-þrepin sem skrifstofan/verkstæðið setja (268/269) — birt sem
  // lesin merking á tækinu svo bílstjórinn sjái hvar það er statt.
  const CUSTODY_LBL = { komid:'Komið á verkstæði', tilbuid:'Tilbúið', farid:'Farið af verkstæði' };
  // Þjónustuval — SÖMU gildi og patch 131/224 (aldrei ný gildi fundin upp).
  const SVC = [['yfirferd','Yfirferð'], ['hledsla','Hleðsla'], ['nyitt','Nýtt']];
  function svcDefault(type) {   // sama regla og 131 defaultForType
    const t = String(type || '').toLowerCase();
    return /\bduft\b|\babc\b|\bpfc\b/.test(t) ? 'hledsla' : 'yfirferd';
  }
  function svcGet(coId, u) {
    try { if (window.UnitServicePicker && UnitServicePicker.getChoice) return UnitServicePicker.getChoice(coId, u.id, u.type); } catch (_) {}
    try { const t = JSON.parse(localStorage.getItem('slokk_trip_' + coId) || '{}'); if (t.units && t.units[u.id]) return t.units[u.id]; } catch (_) {}
    return svcDefault(u.type);
  }
  function svcSet(coId, unitId, v) {
    let ok = false;
    try { if (window.UnitServicePicker && UnitServicePicker.setChoice) { UnitServicePicker.setChoice(coId, unitId, v); ok = true; } } catch (_) {}
    if (!ok) {   // 131 ekki hlaðinn → skrifa í SÖMU lyklana handvirkt (227 speglar í skýið)
      try {
        const k = 'slokk_trip_' + coId;
        const t = JSON.parse(localStorage.getItem(k) || '{}');
        t.units = t.units || {}; t.units[unitId] = v;
        localStorage.setItem(k, JSON.stringify(t)); ok = true;
      } catch (_) {}
    }
    // Ef skrifstofusíðan er opin í sama vafra → láta verðvélina (129) reikna upp á nýtt.
    try { if (typeof window.recomputeCompanyTotalCost === 'function') window.recomputeCompanyTotalCost(); } catch (_) {}
    return ok;
  }
  function updateForState(next) {
    if (next === 'yfirfarid') return { status:'ok', last_insp: today(), next_insp: nextYearIso(), custody_status: null, service_choice: null };
    if (next === 'verkstaedi') return { status:'loaned', custody_status: null };   // nýkomið á verkstæði
    // Aftur í óskoðað: hreinsar skoðunar-stimpil þessarar lotu (svo chipinn lesist
    // óskoðað út um allt) OG custody/verkstæðis-þrep (dettur af verkstæðis-borðinu).
    // last_insp var þegar yfirskrifað þegar tappað var áfram, svo engin eldri
    // dagsetning tapast við þessa aftur-færslu.
    return { status:'active', last_insp: null, next_insp: null, custody_status: null, service_choice: null };
  }
  async function loadUnits(c) {
    const name = c.nafn || '';
    if (window.DB && DB.sb) {
      try {
        // audit-pagination:ok — afmarkað við EITT fyrirtæki í næsta skrefi (q.or/q.ilike á client)
        let q = DB.sb.from('uttaeki')
          .select('id,serial,type,size,location,status,last_insp,next_insp,custody_status,service_choice')
          .order('type', { ascending: true });
        const kt = String(c.kennitala || '').replace(/\D/g,'');
        q = (kt.length === 10) ? q.or('client.ilike.' + JSON.stringify(name) + ',client.eq.' + kt)
                               : q.ilike('client', name);
        const r = await q;
        if (!r.error && Array.isArray(r.data)) return r.data;
      } catch (_) {}
    }
    const cache = (window.DB && DB.cache) || {};
    if (cache.unitsByClient && cache.unitsByClient[name]) return cache.unitsByClient[name];
    if (Array.isArray(cache.units)) return cache.units.filter(u => (u.client || '') === name);
    return [];
  }
  async function saveUnitState(unitId, nextState) {
    const upd = updateForState(nextState);
    if (window.DB && DB.sb) {
      const r = await DB.sb.from('uttaeki').update(upd).eq('id', unitId);
      if (r && r.error) throw new Error(r.error.message || 'update villa');
    }
    try {
      const cache = (window.DB && DB.cache) || {};
      const u = (cache.units || []).find(x => String(x.id) === String(unitId));
      if (u) Object.assign(u, upd);
    } catch (_) {}
    return true;
  }

  // Bæta við tæki á staðnum. Nýtt tæki er sjálfgefið „Yfirfarið" (þú varst að
  // skoða/setja það upp núna) — má rúlla í ⚪/🔵 með chippanum. Serial er
  // placeholder (skiptir ekki máli, sbr. CLAUDE.md). Skilar nýju röðunum.
  async function addUnitsOnSite(coNafn, type, size, count) {
    const n = Math.max(1, Math.min(50, parseInt(count, 10) || 1));
    const stamp = Date.now().toString(36).toUpperCase();
    const rows = [];
    for (let i = 0; i < n; i++) rows.push({
      serial: 'TMP-' + stamp + (n > 1 ? '-' + (i + 1) : ''),
      type: type || 'Tæki', size: size || '', client: coNafn, location: '',
      status: 'ok', last_insp: today(), next_insp: nextYearIso(), pressure: 14
    });
    if (window.DB && DB.sb) {
      const r = await DB.sb.from('uttaeki').insert(rows).select('id,serial,type,size,location,status,last_insp,next_insp');
      if (r && r.error) throw new Error(r.error.message || 'innsetning mistókst');
      const data = (r && r.data) || rows;
      try { const cache = (window.DB && DB.cache) || {}; if (Array.isArray(cache.units)) data.forEach(u => cache.units.push(Object.assign({ client: coNafn }, u))); } catch (_) {}
      return data;
    }
    return rows;
  }

  // Skýrslu-athugasemd geymist í trip-state (slokk_trip_<coId>.athugasemdir_skyrsla)
  // svo hún lendi í „Athugasemdir" á úttektarskýrslunni (patch 168) og samstillist
  // gegnum patch 227 (sem vefur localStorage.setItem á slokk_trip_*).
  function getTripSkyrsla(coId) {
    try { return (JSON.parse(localStorage.getItem('slokk_trip_' + coId) || '{}')).athugasemdir_skyrsla || ''; } catch (_) { return ''; }
  }
  function setTripSkyrsla(coId, val) {
    try {
      const k = 'slokk_trip_' + coId;
      const t = JSON.parse(localStorage.getItem(k) || '{}');
      t.athugasemdir_skyrsla = val;
      localStorage.setItem(k, JSON.stringify(t));
      return true;
    } catch (_) { return false; }
  }

  // ── view container + styles ──────────────────────────────────────────────
  function ensureView() {
    if (document.getElementById(VIEW_ID)) return;
    injectStyles();
    const v = document.createElement('div');
    v.id = VIEW_ID;
    v.style.display = 'none';
    v.innerHTML = '<div id="_bs-root" class="_bs-root bt screen"></div>';
    // Append to <body> (NOT the content panel): the content panel is a
    // transformed/positioned ancestor, which would confine our position:fixed
    // overlay to the area right of the sidebar. On <body> it covers the whole
    // viewport — sidebar included.
    (document.body || document.documentElement).appendChild(v);
  }

  // ── Class-based design system (Bílstjóri handoff theme), scoped under .bt ──
  // theme.css transformed: every selector prefixed with `.bt `, the :root tokens
  // moved onto `.bt`, `*`→`.bt *`, the theme's own body{} dropped. The @import
  // font line stays first (an @import must precede all other rules). A small set
  // of overlay-mechanics + gap-filler rules (not in the theme) follows.
  const BS_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Space+Mono:wght@400;700&display=swap');
.bt{--accent:#e23232;--ring:rgba(220,40,34,.55);--glow:rgba(190,20,20,.5);--btn-grad:linear-gradient(145deg,#0d0102,#7a0e12 43%,#a81717 53%,#0f0102);--metb:linear-gradient(180deg,#2f333b,#1b1e24 60%,#111318);--green:linear-gradient(145deg,#2f9d63,#0f6e3a 60%,#083f22);--page:linear-gradient(180deg,#23262d 0px,#2e323a 90px,#4d525c 320px,#41454d 100%);--font:'Space Grotesk',system-ui,-apple-system,sans-serif;--mono:'Space Mono',monospace;--ink:#11141c;--ink-2:#3a4250;--muted:#5b6472;--faint:#94a3b8;font-family:var(--font)}
.bt *{box-sizing:border-box}
/* 2026-07-19 (ósk Agnars): App-view (fullur breidd) er SJÁLFGEFIÐ — appið
   hoppaði áður milli 440px-miðjaðrar „wide view" og fullbreiðrar app-view því
   440px-cap-ið var grunnstaða og læsti hamurinn víkkaði með JS-innspýtingu eftir
   á. Nú er fullur breidd grunnur (enginn hopp), og aðeins á ALVÖRU skjáborði
   (≥820px, skrifstofan) er sími-ramminn miðjaður. */
.bt .screen{max-width:100%;margin:0 auto;min-height:100vh;background:var(--page);padding-bottom:96px}
.bt .screen--wide{max-width:900px}
@media (min-width:820px){ .bt .screen{max-width:440px} }
.bt .topbar{position:sticky;top:0;z-index:20;background:var(--metb);border-bottom:1px solid #000;box-shadow:0 6px 18px -8px #000;display:flex;align-items:center;gap:13px;padding:13px 16px;color:#eef1f4}
.bt .topbar__title{font-size:16px;font-weight:700}
.bt .topbar__sub{font-family:var(--mono);font-size:11.5px;color:rgba(255,255,255,.5)}
.bt .card{border-radius:16px;background:#fff;border:1px solid rgba(20,24,34,.08);box-shadow:0 12px 30px -18px rgba(15,23,42,.4)}
.bt .pad{padding:14px 16px}
.bt .stack{display:flex;flex-direction:column;gap:14px;padding:14px 14px 0}
.bt .sec-label{font-size:11px;font-weight:700;letter-spacing:.12em;color:var(--faint)}
.bt .btn{height:48px;border-radius:13px;font-family:inherit;font-size:14px;font-weight:600;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:8px;transition:filter .12s,transform .1s}
.bt .btn:active{transform:translateY(1px)}
.bt .btn--accent{border:1px solid var(--ring);background:var(--btn-grad);color:#fff;box-shadow:0 10px 24px -10px var(--glow),inset 0 1px 0 rgba(255,255,255,.18)}
.bt .btn--green{border:1px solid #0c5e30;background:var(--green);color:#fff;box-shadow:inset 0 1.5px 0 rgba(255,255,255,.4),0 4px 10px -4px rgba(12,80,40,.5)}
.bt .btn--dark{border:1px solid #0a0b0d;background:var(--metb);color:#fff;box-shadow:inset 0 1px 0 rgba(255,255,255,.1)}
.bt .btn--light{border:1px solid rgba(20,24,34,.14);background:linear-gradient(180deg,#fff,#e3e7ee);color:var(--muted);box-shadow:inset 0 1px 0 rgba(255,255,255,.9)}
.bt .btn--sm{height:38px;padding:0 15px;border-radius:10px;font-size:13px}
.bt .icon-btn{width:38px;height:38px;flex:none;border-radius:11px;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.06);color:#fff;font-size:15px;cursor:pointer;display:flex;align-items:center;justify-content:center}
.bt .pill{display:inline-flex;align-items:center;gap:5px;font-size:11.5px;font-weight:700;color:#fff;padding:3px 10px;border-radius:8px;box-shadow:inset 0 1px 0 rgba(255,255,255,.35),0 2px 5px -2px rgba(0,0,0,.4);text-shadow:0 1px 1px rgba(0,0,0,.3)}
.bt .pill--overdue{background:linear-gradient(145deg,#e2555f,#a01820 55%,#6c0e14);border:1px solid #4a0a0e}
.bt .pill--pending{background:linear-gradient(145deg,#e6b45a,#b47f1e 55%,#7a5210);border:1px solid #4a3208}
.bt .pill--done{background:var(--green);border:1px solid #0c5e30}
.bt .progress{height:7px;border-radius:5px;background:rgba(255,255,255,.1);overflow:hidden;box-shadow:inset 0 1px 2px #000}
.bt .progress__bar{height:100%;background:linear-gradient(90deg,#2bbf6c,#4fd08a);box-shadow:0 0 10px rgba(43,191,108,.6)}
.bt .search{display:flex;align-items:center;gap:9px;height:46px;padding:0 14px;border-radius:13px;background:#fff;box-shadow:0 8px 20px -12px rgba(0,0,0,.6)}
.bt .search input{flex:1;border:0;background:transparent;font-family:inherit;font-size:14px;color:var(--ink);outline:none}
.bt .map{position:relative;height:190px;border-radius:16px;overflow:hidden;border:1px solid rgba(255,255,255,.08);box-shadow:0 12px 30px -16px #000}
.bt .map img{width:100%;height:100%;object-fit:cover;display:block}
.bt .bs-pin{width:26px;height:26px}
.bt .bs-pin .pin{position:absolute;left:0;top:0;width:26px;height:26px;border-radius:50% 50% 50% 2px;rotate:45deg;border:2px solid #fff;box-shadow:0 3px 6px rgba(0,0,0,.5)}
.bt .bs-pin b{position:absolute;left:0;top:0;width:26px;height:26px;display:flex;align-items:center;justify-content:center;font-family:var(--mono);font-size:12px;font-weight:700;color:#fff}
.bt .pin--done{background:#1f9d57}.bt .pin--overdue{background:#e23232}.bt .pin--pending{background:#e0a93e}
.bt .stop{position:relative;border-radius:16px;background:#fff;border:1px solid rgba(20,24,34,.08);box-shadow:0 10px 26px -16px rgba(15,23,42,.35);overflow:hidden;transition:box-shadow .14s,transform .14s}
.bt .stop:active{transform:scale(.995)}
.bt .stop__rail{position:absolute;left:0;top:0;bottom:0;width:5px}
.bt .stop__rail--done{background:#1f9d57}.bt .stop__rail--overdue{background:#e23232}.bt .stop__rail--pending{background:#e0a93e}
.bt .stop__body{display:flex;gap:13px;padding:14px 14px 14px 18px}
.bt .badge{width:34px;height:34px;flex:none;border-radius:50%;border:2px solid #fff;box-shadow:0 3px 7px -2px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;font-family:var(--mono);font-size:14px;font-weight:700;color:#fff}
.bt .badge--done{background:radial-gradient(circle at 35% 30%,#4fd08a,#0f6e3a)}
.bt .badge--todo{background:radial-gradient(circle at 35% 30%,#ff6a5e,#a01820)}
.bt .stop__name{font-size:15.5px;font-weight:700;color:var(--ink);line-height:1.2}
.bt .stop__addr{font-size:12.5px;color:var(--muted);margin-top:2px}
.bt .stop__meta{font-family:var(--mono);font-size:11.5px;color:var(--faint)}
.bt .stop__actions{display:flex;border-top:1px solid rgba(20,24,34,.07)}
.bt .stop__actions .act{flex:1;height:46px;border:0;border-right:1px solid rgba(20,24,34,.07);background:#f6f8fb;font-family:inherit;font-size:13px;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:7px;text-decoration:none}
.bt .act--maps{color:#2f5fe0}.bt .act--call{color:var(--ink-2)}
.bt .act--done{flex:1.3;border-right:0;background:#eef7f0;color:#1f7a45}
.bt .act--done.is-done{background:var(--green);color:#fff}
.bt .stop.is-done{opacity:.62}
.bt .dev{display:flex;align-items:center;gap:13px;padding:13px 16px;border-top:1px solid rgba(20,24,34,.06);transition:background .12s}
.bt .dev:hover{background:#f6f8fc}
.bt .dev__ic{width:34px;height:34px;flex:none;border-radius:10px;box-shadow:inset 0 1px 0 rgba(255,255,255,.4);display:flex;align-items:center;justify-content:center;font-size:15px}
.bt .dev__ic--red{background:linear-gradient(180deg,#ff9a92,#d1362f)}
.bt .dev__ic--blue{background:linear-gradient(180deg,#8fb0ff,#2f5fe0)}
.bt .dev__name{font-size:14px;font-weight:600;color:var(--ink)}
.bt .dev__meta{font-family:var(--mono);font-size:11.5px;color:#9098a6;margin-top:2px}
.bt .chk{flex:none;display:inline-flex;align-items:center;gap:6px;height:36px;padding:0 14px;border-radius:10px;border:1px solid rgba(20,24,34,.16);background:linear-gradient(180deg,#fff,#e3e7ee);color:#8a93a5;font-family:inherit;font-size:12.5px;font-weight:600;cursor:pointer;box-shadow:inset 0 1px 0 rgba(255,255,255,.9)}
.bt ._bs-delunit{flex:none;width:34px;height:36px;margin-left:8px;border-radius:10px;border:1px solid rgba(20,24,34,.1);background:transparent;color:#b9414a;font-size:15px;cursor:pointer;opacity:.55;transition:opacity .12s,background .12s}
.bt ._bs-delunit:hover{opacity:1;background:rgba(201,60,29,.1)}
.bt .chk.is-done{background:var(--green);color:#fff;border-color:#0c5e30}
.bt .chk.chk--vs{background:linear-gradient(180deg,#8fb0ff,#2f5fe0);color:#fff;border-color:#2f5fe0}
/* ── Tækja-form (2026-07-30) — sama form og fyrirtækjasíðan (patch 224):
   ✓ Yfirfarið · 🔧 Á verkstæði  /  Yfirferð | Hleðsla | Nýtt · 🚫 Ónýtt.
   Stórir hnappar (≥46px) sem STAFLAST í stað þess að minnka — símaskjár
   fyrst (Agnar: takkarnir verða að vera nógu stórir til að sjást). */
.bt .dev--form{display:block;padding:12px 14px 14px}
.bt .dev--form:hover{background:transparent}
.bt .dev__top{display:flex;align-items:center;gap:12px}
.bt .dev__id{flex:1;min-width:0}
.bt .dev--form .dev__meta{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
/* Verkstæðis-þrepið á EIGIN línu (ekki inni í nafnalínunni — þar kramdi það
   stærð/raðnúmer í þrjár línur á 360px síma). */
.bt .dev__cust{display:inline-block;margin-top:9px;font-size:12px;font-weight:700;color:#fff;background:linear-gradient(180deg,#8fb0ff,#2f5fe0);border:1px solid #2f5fe0;border-radius:9px;padding:5px 11px}
.bt .uact-row,.bt .usvc-row{display:flex;gap:7px;margin-top:8px}
.bt .uact{flex:1;min-height:50px;padding:0 6px;border-radius:12px;border:1px solid rgba(20,24,34,.16);background:linear-gradient(180deg,#fff,#e3e7ee);color:#5b6472;font-family:inherit;font-size:15px;font-weight:700;cursor:pointer;box-shadow:inset 0 1px 0 rgba(255,255,255,.9);display:inline-flex;align-items:center;justify-content:center;gap:6px;line-height:1.15}
.bt .uact:active,.bt .usvc:active,.bt .uonytt:active{transform:translateY(1px)}
.bt .uact.is-on[data-act="yfirfarid"]{background:var(--green);color:#fff;border-color:#0c5e30;box-shadow:inset 0 1.5px 0 rgba(255,255,255,.4),0 4px 10px -4px rgba(12,80,40,.5)}
.bt .uact.is-on[data-act="verkstaedi"]{background:linear-gradient(180deg,#8fb0ff,#2f5fe0);color:#fff;border-color:#2f5fe0;box-shadow:inset 0 1.5px 0 rgba(255,255,255,.35),0 4px 10px -4px rgba(30,64,175,.5)}
.bt .usvc{flex:1;min-width:0;min-height:46px;padding:0 4px;border-radius:11px;border:1px solid rgba(20,24,34,.14);background:#fff;color:var(--ink-2);font-family:inherit;font-size:15px;font-weight:700;cursor:pointer;box-shadow:inset 0 1px 0 rgba(255,255,255,.9)}
.bt .usvc.is-on{border-color:#1e3a8a;background:linear-gradient(180deg,#60a5fa,#2563eb 48%,#1e40af);color:#fff;text-shadow:0 1px 1px rgba(0,0,0,.35);box-shadow:inset 0 1px 0 rgba(255,255,255,.32),0 2px 6px -2px rgba(0,0,0,.35)}
.bt .uonytt{flex:0 0 60px;min-height:46px;border-radius:11px;border:1px solid rgba(20,24,34,.14);background:#fff;color:#8a93a5;font-size:20px;cursor:pointer;box-shadow:inset 0 1px 0 rgba(255,255,255,.9)}
.bt .uonytt.is-on{background:#fff0ed;color:#c0341d;border-color:#fca5a5}
.bt .dev--onytt .dev__name{text-decoration:line-through}
.bt .dev--onytt .usvc{opacity:.42}
.bt .seg{display:flex;gap:8px}
.bt .seg__btn{flex:1;height:42px;border-radius:11px;font-family:inherit;font-size:13px;font-weight:600;cursor:pointer;border:1px solid rgba(20,24,34,.14);background:#fff;color:var(--ink-2);box-shadow:inset 0 1px 0 rgba(255,255,255,.9)}
.bt .seg__btn.is-active{border:1px solid #0c5e30;background:var(--green);color:#fff;box-shadow:inset 0 1.5px 0 rgba(255,255,255,.4),0 4px 10px -4px rgba(12,80,40,.5)}
.bt .field{width:100%;resize:none;padding:11px 13px;border-radius:11px;border:1px solid rgba(20,24,34,.14);background:#f6f8fb;color:#141822;font-family:inherit;font-size:13.5px;outline:none}
.bt .card--alert{border:1px solid #f3c6c4;background:linear-gradient(180deg,#fff,#fdf1f1)}
.bt .card--alert .field{background:#fff}
.bt .dock{position:fixed;left:0;right:0;bottom:0;z-index:30;max-width:100%;margin:0 auto;display:flex;gap:12px;padding:12px 14px;background:linear-gradient(180deg,rgba(65,69,77,0),rgba(65,69,77,.94) 42%)}
@media (min-width:820px){ .bt .dock{max-width:440px} }
.bt .dock--wide{max-width:900px}
.bt .dock .btn{flex:1;height:52px}
/* Fyrirtækja-spjaldið (._bs-sheet) hefur transform meðan það rennur inn →
   position:fixed leysist miðað við transformaða boxið og dokkurinn „flaut"
   mitt á efninu. 2026-07-16: eftir inn-rennsli er transforminn HREINSAÐUR af
   spjaldinu (sjá openCompany) svo fixed festist við ALVÖRU botn skjásins,
   með safe-area fyrir bendilrönd símans. padding-bottom á spjaldinu tryggir
   að síðustu línur listans hverfi aldrei undir dokkinn. */
._bs-sheet .dock{position:fixed!important;left:0!important;right:0!important;bottom:0!important;max-width:100%!important;margin:0!important;padding-bottom:calc(12px + env(safe-area-inset-bottom,0px))!important;z-index:40}
._bs-sheet{padding-bottom:calc(110px + env(safe-area-inset-bottom,0px))!important}
/* ‹ Til baka: skýr, ≥44px snertiflötur efst til vinstri á spjaldinu */
._bs-sheet ._bs-back{width:auto;min-width:44px;min-height:44px;padding:0 12px;font-size:15px;font-weight:700;gap:2px;white-space:nowrap}

/* ── overlay mechanics + gap-fillers (not part of the theme) ── */
/* .screen / .screen--wide sit ON the .bt root itself, so the descendant form
   (.bt .screen) can't reach them — add the same-element compound form. */
.bt.screen{max-width:100%;margin:0 auto;min-height:100vh;background:var(--page);padding-bottom:96px}
.bt.screen--wide{max-width:900px}
@media (min-width:820px){ .bt.screen{max-width:440px} }
#${VIEW_ID}{position:fixed!important;inset:0!important;z-index:1000;overflow-y:auto;-webkit-overflow-scrolling:touch;background:#41454d}
body.bs-active{overflow:hidden}
body.bs-active > .topbar,body.bs-active nav.view-nav,body.bs-active .sidebar{display:none!important}
/* Hide the app's global floating chrome so it never leaks OVER the locked
   Bílstjóri overlay: the 📷 QR-scan FAB (#qr-fab), the EN language toggle
   (#_slokk_langbtn) and every mobile-nav hamburger/drawer variant. */
body.bs-active #qr-fab,body.bs-active #_slokk_langbtn,
body.bs-active #_mnav_btn,body.bs-active #_mobnav_btn,body.bs-active #_slokk_hamb,
body.bs-active .mobile-nav-toggle,body.bs-active .mobile-nav-backdrop,body.bs-active .mobile-nav-drawer,
body.bs-active #_mnav_drawer,body.bs-active #_mnav_scrim,body.bs-active #_mobnav_drawer{display:none!important}
/* fljótandi 🤖/🎨-takkar (238/230) sitja á z-index >9000 og gægðust yfir yfirlagið */
body.bs-active #_ad-aibtn,body.bs-active .ad-panel,body.bs-active #bstal-restore{display:none!important}
/* the app's .topbar IS the sidebar (position:fixed/width/min-height/flex-direction:column !important) — neutralise that hijack of OUR nested topbars */
#${VIEW_ID} .topbar,._bs-sheet .topbar{position:sticky!important;top:0!important;left:auto!important;right:auto!important;bottom:auto!important;width:auto!important;min-height:0!important;height:auto!important;flex-direction:row!important;display:flex!important}
._bs-sheet{position:fixed;inset:0;z-index:1100;overflow-y:auto;-webkit-overflow-scrolling:touch;transform:translateX(100%);transition:transform .24s cubic-bezier(.32,.72,0,1);background:#41454d}
._bs-sheet.in{transform:translateX(0)}
.bt .map #_bs-mapcanvas{position:absolute;inset:0;width:100%;height:100%}
.bt .leaflet-container{background:#e9eaee;font-family:var(--font)}
.bt #_bs-prog2{background:var(--metb);padding:11px 15px 13px}
.bt .btn[disabled]{opacity:.5;cursor:default;box-shadow:none;filter:none}
.bt .act[disabled]{color:#c0c6cf;cursor:default}
.bt ._bs-empty{padding:36px 22px;text-align:center;color:#e6e8ec;font-size:14px}
.bt ._bs-err{margin:10px 0;padding:14px;border-radius:12px;background:#fdecea;border:1px solid #f3c6c4;color:#8a1010;font-size:13.5px;display:flex;justify-content:space-between;align-items:center;gap:10px}
`;

  function injectStyles() {
    if (document.getElementById('_bs-styles')) return;
    const s = document.createElement('style');
    s.id = '_bs-styles';
    s.textContent = BS_CSS;
    document.head.appendChild(s);
  }

  // ── Leaflet (lazy, shared CDN with patch 161) ────────────────────────────
  let _leafletLP = null;
  function ensureLeaflet() {
    if (window.L && window.L.map) return Promise.resolve();
    if (_leafletLP) return _leafletLP;
    _leafletLP = new Promise(resolve => {
      const css = document.createElement('link');
      css.rel = 'stylesheet'; css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(css);
      const sc = document.createElement('script');
      sc.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      sc.onload = () => resolve();
      document.head.appendChild(sc);
    });
    return _leafletLP;
  }
  let _map = null, _markers = [], _driverMarkers = [];
  // Theme's numbered teardrop pin (.pin.pin--done|overdue|pending). The marker
  // lands inside .bt (map > _bs-mapcanvas > .bt), so the scoped .bt .pin styles
  // apply; the number shows in the <span> (rotated upright), colour by status.
  function makeIcon(variant, n) {
    // The OUTER element is owned by Leaflet (it writes an inline `transform`
    // to position the marker on the map) — so it must carry NO transform/rotate
    // of its own, else the pin detaches and rides the screen instead of the map.
    // The teardrop shape + rotation live on the inner .pin child.
    return L.divIcon({ className: 'bs-pin',
      html: '<i class="pin pin--' + variant + '"></i><b>' + (n != null ? n : '') + '</b>',
      iconSize: [26,26], iconAnchor: [13,26] });
  }
  function renderPins() {
    if (!_map || !window.L) return;
    _markers.forEach(m => { try { _map.removeLayer(m); } catch (_) {} });
    _markers = [];
    const { list } = currentList();
    const pts = [];
    list.forEach((x, i) => {
      if (!x.coord) return;
      const m = L.marker([x.coord.lat, x.coord.lng], { icon: makeIcon(variantFor(x.status.key), i + 1) }).addTo(_map);
      m.on('click', () => openCompany(x.co.id));
      _markers.push(m); pts.push([x.coord.lat, x.coord.lng]);
    });
    // Starfsmanna-merki (hvar hver bílstjóri er núna) — sér-lag, ofan á tækjunum.
    _driverMarkers.forEach(m => { try { _map.removeLayer(m); } catch (_) {} });
    _driverMarkers = [];
    Object.keys(_vaktGeo || {}).forEach(n => {
      const g = _vaktGeo[n]; if (!g) return;
      const col = empColor(n);
      const ic = L.divIcon({ className: '_bs-drv', iconSize: [0, 0], iconAnchor: [0, 0], html:
        '<div style="position:absolute;transform:translate(-50%,-50%);display:flex;align-items:center;gap:5px;white-space:nowrap">' +
          '<span style="width:18px;height:18px;border-radius:50%;background:' + col + ';border:3px solid #fff;box-shadow:0 0 0 2px ' + col + ',0 2px 6px rgba(0,0,0,.5)"></span>' +
          '<span style="font:800 11px/1 system-ui;color:#fff;background:' + col + ';padding:3px 7px;border-radius:99px;box-shadow:0 2px 6px rgba(0,0,0,.4)">' + esc(n) + '</span>' +
        '</div>' });
      try { const m = L.marker([g.lat, g.lng], { icon: ic, zIndexOffset: 1000 }).addTo(_map); _driverMarkers.push(m); } catch (_) {}
    });
    if (pts.length) {
      const RVK = [64.13, -21.90];
      const near = pts.filter(p => Math.abs(p[0]-RVK[0]) < 0.18 && Math.abs(p[1]-RVK[1]) < 0.45);
      try { _map.fitBounds(L.latLngBounds(near.length ? near : pts).pad(0.15), { maxZoom: 13 }); } catch (_) {}
    }
  }

  // ── shell + list ─────────────────────────────────────────────────────────
  function show() {
    ensureView();
    document.querySelectorAll('[id^="view-"]').forEach(v => { v.style.display='none'; v.classList.remove('active'); });
    const v = document.getElementById(VIEW_ID);
    if (v) { v.style.display='block'; v.classList.add('active'); }
    document.body.classList.add('bs-active');   // hides the sidebar (see CSS)
    if (LOCKED) armBack();   // læst app: tryggja history-state svo back loki ekki appinu
    document.querySelectorAll('.vnav-btn').forEach(b => b.classList.toggle('active', b.getAttribute('data-view') === NAV_KEY));
    try { localStorage.setItem('lastView', NAV_KEY); } catch (_) {}
    try { if ((location.hash || '').replace(/^#/, '') !== NAV_KEY) history.replaceState(null, '', '#' + NAV_KEY); } catch (_) {}

    const root = document.getElementById('_bs-root');
    if (!root) { setTimeout(show, 150); return; }

    if (!root.querySelector('#_bs-mapcanvas')) {
      const dateStr = new Date().toLocaleDateString('is-IS', { weekday: 'short', day: 'numeric', month: 'short' });
      root.innerHTML =
        '<header class="topbar">' +
          '<div class="icon-btn" style="background:#0a0b0d">🚚</div>' +
          '<div style="flex:1;min-width:0">' +
            '<div class="topbar__title">Bílstjóri · Leið dagsins</div>' +
            '<div class="topbar__sub">' + esc(dateStr) + '</div>' +
          '</div>' +
          '<button id="_bs-full" class="icon-btn" type="button" title="Allur skjár (fela vafra)">⛶</button>' +
          '<button id="_bs-share" class="icon-btn" type="button" title="Afrita hlekk til að senda á bílstjóra">🔗</button>' +
          (LOCKED ? '' : '<button id="_bs-exit" class="icon-btn" type="button" title="Til baka í forritið / vefsíðu">✕</button>') +
        '</header>' +
        '<div id="_bs-prog2" style="display:none"></div>' +
        '<div style="padding:12px 12px 0"><div class="map"><div id="_bs-mapcanvas"></div></div></div>' +
        '<div style="padding:12px 12px 4px"><div class="search">' +
          '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#9aa3b5" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"></circle><path d="m21 21-4.3-4.3"></path></svg>' +
          '<input id="_bs-q" type="search" inputmode="search" placeholder="Leita að fyrirtæki, heimilisfangi, kt…">' +
        '</div></div>' +
        '<div style="padding:4px 12px 0;display:flex;flex-direction:column;gap:9px">' +
          '<div class="seg _bs-seg">' +
            '<button class="seg__btn" data-seg="today" type="button">📋 Dagsins verk</button>' +
            '<button class="seg__btn" data-seg="all" type="button">🏢 Allir í þjónustu</button>' +
          '</div>' +
          '<div class="seg _bs-akstur">' +
            '<button class="seg__btn" data-seg="a1" type="button">🚗 Akstur 1</button>' +
            '<button class="seg__btn" data-seg="a2" type="button">🚗 Akstur 2</button>' +
            '<button class="seg__btn" data-seg="a3" type="button">🚗 Akstur 3</button>' +
          '</div>' +
        '</div>' +
        '<div id="_bs-vakt" style="padding:10px 12px 0"></div>' +
        '<div id="_bs-list" style="padding:10px 12px 0;display:flex;flex-direction:column;gap:12px"></div>' +
        '<div class="dock"><button id="_bs-drive" class="btn btn--accent" style="flex:1" type="button">🧭 Keyra leið dagsins</button></div>';

      const exitBtn = root.querySelector('#_bs-exit');
      if (exitBtn) exitBtn.addEventListener('click', () => {
        if (window.App && App.switchView) App.switchView('leidsogn');
      });
      root.querySelector('#_bs-full').addEventListener('click', toggleFullscreen);
      armAutoFullscreen();   // þéttur hamur sjálfgefinn — virkjast við fyrstu snertingu
      root.querySelector('#_bs-share').addEventListener('click', () => {
        const url = DRIVER_LINK();   // the locked driver link to send out
        copyText(url).then(ok => toast(ok ? '✓ Hlekkur afritaður — sendu á bílstjóra' : url));
      });
      const qEl = root.querySelector('#_bs-q');
      qEl.addEventListener('input', e => { _search = e.target.value || ''; renderList(); renderPins(); });
      root.querySelectorAll('._bs-seg button').forEach(b => b.addEventListener('click', () => {
        _seg = b.dataset.seg; renderList(); renderPins();
      }));
      root.querySelectorAll('._bs-akstur button').forEach(b => b.addEventListener('click', () => {
        _seg = (_seg === b.dataset.seg) ? 'all' : b.dataset.seg;   // tappa aftur → slökkva síu
        renderList(); renderPins();
      }));
      root.querySelector('#_bs-drive').addEventListener('click', () => driveDay(currentList().list));
    }

    // (re)build the map
    const canvas = document.getElementById('_bs-mapcanvas');
    if (canvas && !_map) {
      ensureLeaflet().then(() => {
        if (_map) return;
        _map = L.map(canvas, { zoomControl: false }).setView([64.1355, -21.8954], 11);
        L.control.zoom({ position: 'bottomright' }).addTo(_map);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap', maxZoom: 19 }).addTo(_map);
        setTimeout(() => { try { _map.invalidateSize(); } catch (_) {} renderPins(); }, 60);
      });
    } else if (_map) {
      setTimeout(() => { try { _map.invalidateSize(); } catch (_) {} renderPins(); }, 60);
    }

    renderList();
    ensureData();   // locked boot: kick Companies.load() if the data isn't in yet

    // Vakt: staðsetning + dagleg samantekt. Bílstjóri velur nafn (læst-hamur spyr
    // strax ef ekkert nafn valið); skrifstofan getur sleppt. Ping á 4 mín svo
    // „hvar eru þeir" haldist ferskt yfir daginn.
    if (getEmp()) startGeo();
    renderVakt();
    if (LOCKED && !getEmp()) setTimeout(() => pickEmp(false), 400);
    if (!_pingTimer) _pingTimer = setInterval(() => { if (getEmp()) logAct('ping', {}); }, 240000);
    if (!_vaktPoll) _vaktPoll = setInterval(renderVakt, 60000);   // sjá aðra bílstjóra uppfærast
  }

  function renderList() {
    const box = document.getElementById('_bs-list');
    if (!box) return;
    // reflect segment / aksturslisti buttons (theme .seg__btn.is-active)
    document.querySelectorAll('._bs-seg .seg__btn').forEach(b => b.classList.toggle('is-active', b.dataset.seg === _seg));
    document.querySelectorAll('._bs-akstur .seg__btn').forEach(b => b.classList.toggle('is-active', b.dataset.seg === _seg));
    const qEl = document.getElementById('_bs-q');
    if (qEl && qEl.value !== _search) qEl.value = _search;

    const { ready, list } = currentList();
    if (!ready) { box.innerHTML = '<div class="_bs-empty">⏳ Sæki gögn…</div>'; return; }
    box.innerHTML = list.length
      ? list.map((x, i) => cardHtml(x, i + 1)).join('')
      : '<div class="_bs-empty">' + (_seg === 'today' ? '✅ Ekkert áríðandi eftir í dag.' : 'Engin fyrirtæki fundust.') + '</div>';
    box.querySelectorAll('.stop').forEach(card => card.addEventListener('click', e => {
      if (e.target.closest('.act')) return;   // action buttons handled below
      openCompany(+card.dataset.id);
    }));
    // Maps-takki á korti → opna leiðsögn í Google Maps.
    box.querySelectorAll('[data-maps]').forEach(btn => btn.addEventListener('click', e => {
      e.stopPropagation();
      const x = list.find(y => String(y.co.id) === String(btn.dataset.id));
      if (x) navTo(x.co, x.coord && x.coord.lat, x.coord && x.coord.lng);
    }));
    // Framvindu-stika: N af M kláruð + km/mín áætlun (haversine milli hnita í röð).
    const pb = document.getElementById('_bs-prog2');
    if (pb) {
      const done = list.filter(x => +((x.ars || {}).field_inspected_year) === curYear()).length;
      const tot = list.length;
      let km = 0, prev = null;
      list.filter(x => x.coord).forEach(x => { if (prev) km += havKm(prev, x.coord); prev = x.coord; });
      km *= 1.3;
      pb.style.display = tot ? 'block' : 'none';
      pb.innerHTML =
        '<div style="display:flex;justify-content:space-between;margin-bottom:6px;gap:8px">' +
          '<span style="font-size:12px;color:rgba(255,255,255,.7)"><b style="color:#fff">' + done + '</b> af ' + tot + ' kláruð</span>' +
          (km > 0.3 ? '<span class="topbar__sub">' + km.toFixed(1).replace('.', ',') + ' km eftir · ~' + Math.max(1, Math.round(km / 40 * 60)) + ' mín</span>' : '') +
        '</div>' +
        '<div class="progress"><div class="progress__bar" style="width:' + (tot ? Math.round(done / tot * 100) : 0) + '%"></div></div>';
    }
    // Merkja búið → toggle field_inspected_year (🔵 Í vinnslu). Sends the company
    // to ÞjónustuVerkstæði "Í vinnslu" (finish report) and drops it from the
    // driving list (status becomes in_progress) — same flag as patch 190.
    box.querySelectorAll('[data-check]').forEach(btn => btn.addEventListener('click', async e => {
      e.stopPropagation();
      const id = btn.dataset.id;
      const wasOn = (+((arsAll()[String(id)] || {}).field_inspected_year) === curYear());
      btn.classList.toggle('is-done', !wasOn); btn.textContent = !wasOn ? '✓ Búið' : '✓ Merkja búið';   // optimistic
      clearErrBar();
      const ok = await arsSave(id, { field_inspected_year: wasOn ? 0 : curYear() });
      try { if (window.Leidsogn && Leidsogn.refresh) Leidsogn.refresh(); } catch (_) {}
      if (ok) toast(wasOn ? '↩︎ Tekið úr vinnslu' : '🔵 Sent í vinnslu — skýrsla eftir');
      else errBar('⚠ Vistun mistókst — merking ekki uppfærð. Reyndu aftur.', () => {
        const b2 = document.querySelector('[data-check][data-id="' + id + '"]'); if (b2) b2.click();
      });
      renderList(); renderPins();   // re-reads source of truth → optimistic toggle reverts if save failed
    }));

    const drive = document.getElementById('_bs-drive');
    if (drive) {
      const n = list.filter(x => x.coord && (x.status.key==='overdue' || x.status.key==='duenow' || x.priority)).length;
      drive.disabled = !n;
      drive.textContent = '🧭 Keyra leið dagsins' + (n ? ' (' + n + ')' : '');
    }
  }

  // Unified status pill — same colour system as Ársskoðun, mapped from the
  // statusFor() key. Mobile-clean: colour + label, no icon (the drive-order
  // marker on the left already carries the forgangur).
  function cardHtml(x, seq) {
    const c = x.co;
    const m = +((x.ars || {}).inspect_month) || 0;
    const monthName = (m >= 1 && m <= 12) ? MONTHS_IS[m - 1] : '';
    const insYear = yearOf(x.ars);
    const nUnits = unitCount(x);
    const inVinnsla = (+((x.ars || {}).field_inspected_year) === curYear());  // 🔵 blue flag (þjónustuverkstæði)
    const variant = variantFor(x.status.key);   // done | overdue | pending
    const done = inVinnsla || x.status.key === 'done';
    // 🧯 tæki-count · month · last-inspected (NO address here — it's on stop__addr)
    const extra = '🧯 ' + nUnits + ' tæki'
      + (monthName ? ' · 📅 ' + monthName : '')
      + ' · ' + (insYear ? 'síðast ' + insYear : 'óskoðað');
    const ph = phoneOf(c);
    return (
      '<div class="stop' + (done ? ' is-done' : '') + '" role="button" tabindex="0" data-id="' + c.id + '" data-co-id="' + c.id + '">' +
        '<span class="stop__rail stop__rail--' + variant + '"></span>' +
        '<div class="stop__body">' +
          '<div class="badge ' + (done ? 'badge--done' : 'badge--todo') + '">' + esc(String(seq)) + '</div>' +
          '<div style="flex:1;min-width:0">' +
            '<div class="stop__name">' + esc(c.nafn || '—') + '</div>' +
            '<div class="stop__addr">' + (c.heimilisfang ? '📍 ' + esc(c.heimilisfang) : '<span style="color:#e2555f">⚠ Ekkert heimilisfang</span>') + '</div>' +
            '<div style="display:flex;align-items:center;gap:8px;margin-top:9px;flex-wrap:wrap">' +
              '<span class="pill pill--' + variant + '">' + esc(x.status.label) + '</span>' +
              (x.urgent ? '<span class="pill pill--overdue">🚨 Skilaboð</span>' : '') +
              '<span class="stop__meta">' + esc(extra) + '</span>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="stop__actions">' +
          '<button class="act act--maps" type="button" data-maps data-id="' + c.id + '"' + (x.coord ? '' : ' disabled') + '>↗ Maps</button>' +
          (ph ? '<a class="act act--call" href="tel:' + esc(String(ph).replace(/\s/g,'')) + '">📞 Hringja</a>'
              : '<button class="act act--call" type="button" disabled>📞 Hringja</button>') +
          '<button class="act act--done' + (inVinnsla ? ' is-done' : '') + '" type="button" data-check data-id="' + c.id + '">' +
            (inVinnsla ? '✓ Búið' : '✓ Merkja búið') + '</button>' +
        '</div>' +
      '</div>'
    );
  }

  function driveDay(list) {
    const stops = list.filter(x => x.coord && (x.status.key==='overdue' || x.status.key==='duenow' || x.priority))
      .map(x => ({ id: x.co.id, name: x.co.nafn, addr: x.co.heimilisfang || '', lat: x.coord.lat, lng: x.coord.lng }));
    if (!stops.length) return;
    if (window.Leidsogn && Leidsogn.clearRoute && Leidsogn.addToRoute && Leidsogn.launchNav) {
      try { Leidsogn.clearRoute(); stops.forEach(s => Leidsogn.addToRoute(s.id, s.name, s.addr, s.lat, s.lng)); Leidsogn.launchNav(); return; } catch (_) {}
    }
    const dest = stops[stops.length - 1];
    const wp = stops.slice(0, -1).map(s => s.lat + ',' + s.lng).join('|');
    let url = 'https://www.google.com/maps/dir/?api=1&destination=' + dest.lat + ',' + dest.lng + '&travelmode=driving';
    if (wp) url += '&waypoints=' + encodeURIComponent(wp);
    window.open(url, '_blank');
  }

  // ── company sheet ────────────────────────────────────────────────────────
  function navTo(co, lat, lng) {
    let url;
    if (lat != null && lng != null) url = 'https://www.google.com/maps/dir/?api=1&destination=' + lat + ',' + lng + '&travelmode=driving';
    else url = 'https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent([co.nafn, co.heimilisfang].filter(Boolean).join(', ')) + '&travelmode=driving';
    window.open(url, '_blank');
  }

  function copyText(t) {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText)
        return navigator.clipboard.writeText(t).then(() => true).catch(() => { try { window.prompt('Afritaðu hlekkinn:', t); } catch (_) {} return false; });
    } catch (_) {}
    try { window.prompt('Afritaðu hlekkinn:', t); } catch (_) {}
    return Promise.resolve(false);
  }
  // ── Þéttur hamur (fullur skjár) — SJÁLFGEFINN (Agnar 2026-07-30) ────────────
  // Ósk: „ökumaður app should open upp í tight view as default … það er
  // valmöguleiki efst í horninu, en vill hafa takkana nokkuð stóra svo sjáist."
  // ⛶-valið er því MUNAÐ og sjálfgefið KVEIKT; takkastærðir eru ÓBREYTTAR
  // (ekkert minnkað — bara vafrastikan felin svo fleiri verk komist á skjáinn).
  //
  // GILDRA: vafrar hafna requestFullscreen() án notenda-bendingar, svo við getum
  // ekki kallað hann beint við opnun. Þess í stað vopnum við EINSKIPTIS hlustara
  // á fyrstu snertingu og förum þá í fullan skjá. Í uppsettu appi
  // (/app/bilstjori/, display:standalone) er stikan þegar falin — þá gerir þetta
  // ekkert sýnilegt og er meinlaust.
  const FS_KEY = 'bs_fullscreen_default';
  function fsWanted() { try { return localStorage.getItem(FS_KEY) !== '0'; } catch (_) { return true; } }
  function fsSet(on) { try { localStorage.setItem(FS_KEY, on ? '1' : '0'); } catch (_) {} }
  function isFs() { return !!(document.fullscreenElement || document.webkitFullscreenElement); }
  function enterFs() {
    const el = document.documentElement;
    try { (el.requestFullscreen || el.webkitRequestFullscreen).call(el); } catch (_) {}
  }
  function toggleFullscreen() {
    const d = document;
    try {
      if (isFs()) { (d.exitFullscreen || d.webkitExitFullscreen).call(d); fsSet(false); }
      else { enterFs(); fsSet(true); }
    } catch (_) { toast('Fullur skjár ekki studdur hér — notaðu „Bæta á heimaskjá".'); }
  }
  let _fsArmed = false;
  function armAutoFullscreen() {
    if (_fsArmed || !fsWanted() || isFs()) return;
    _fsArmed = true;
    const go = () => {
      document.removeEventListener('pointerdown', go, true);
      document.removeEventListener('touchstart', go, true);
      // aðeins ef enn óskað og appið enn opið
      if (fsWanted() && !isFs() && document.body.classList.contains('bs-active')) enterFs();
    };
    document.addEventListener('pointerdown', go, true);
    document.addEventListener('touchstart', go, true);
  }

  function openCompany(coId) {
    const c = companies().find(x => String(x.id) === String(coId));
    if (!c) return;
    logAct('visit', { co_id: c.id, co_nafn: c.nafn });   // vakt: heimsókn skráð
    const a = arsAll()[String(coId)] || {};
    const st = statusFor(a);
    const coord = coordOf(c);
    const phone = phoneOf(c);

    const sheet = document.createElement('div');
    sheet.className = '_bs-sheet bt screen screen--wide';
    const telHref = 'tel:' + esc(String(phone || '').replace(/\s/g, ''));
    sheet.innerHTML =
      '<header class="topbar">' +
        '<button class="_bs-back icon-btn" type="button" aria-label="Til baka"><span style="font-size:19px;line-height:1">‹</span> Til baka</button>' +
        '<div style="flex:1;min-width:0">' +
          '<div class="topbar__title" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(c.nafn || '—') + '</div>' +
          '<div style="display:flex;align-items:center;gap:9px;margin-top:2px;flex-wrap:wrap">' +
            (c.kennitala ? '<span class="topbar__sub">kt. ' + esc(fmtKt(c.kennitala)) + '</span>' : '') +
            '<span class="pill pill--' + variantFor(st.key) + '">⚠ ' + esc(st.label) + '</span>' +
          '</div>' +
          (c.heimilisfang ? '<div style="font-size:12px;color:rgba(255,255,255,.55);margin-top:3px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">📍 ' + esc(c.heimilisfang) + '</div>' : '') +
        '</div>' +
        '<button class="icon-btn _bs-mapbtn" type="button" title="Keyra þangað">🗺</button>' +
        (phone ? '<a class="icon-btn" href="' + telHref + '" style="border-color:var(--ring);background:var(--btn-grad);text-decoration:none" title="Hringja">🚚</a>'
               : '<button class="icon-btn" type="button" style="border-color:var(--ring);background:var(--btn-grad)" title="Bílstjóri">🚚</button>') +
      '</header>' +
      '<div class="stack">' +
        '<div style="display:flex;gap:10px">' +
          '<button class="btn btn--accent" id="_bs-nav" type="button" style="flex:1.4">🧭 Keyra þangað</button>' +
          (LOCKED ? '' : '<button class="btn btn--light" id="_bs-open-co" type="button" style="flex:1">📖 Opna fyrirtæki</button>') +
          (LOCKED ? '' : '<button class="btn btn--light" id="_bs-verkst" type="button" style="flex:1">🧾 Verkstæði</button>') +
        '</div>' +
        '<div class="card pad">' +
          '<div class="sec-label" style="margin-bottom:11px">🚚 AKSTURSLISTI</div>' +
          '<div class="seg _bs-ak-row">' +
            '<button class="seg__btn _bs-ak-set" data-ak="0" type="button">Enginn</button>' +
            '<button class="seg__btn _bs-ak-set" data-ak="1" type="button">Akstur 1</button>' +
            '<button class="seg__btn _bs-ak-set" data-ak="2" type="button">Akstur 2</button>' +
            '<button class="seg__btn _bs-ak-set" data-ak="3" type="button">Akstur 3</button>' +
          '</div>' +
        '</div>' +
        '<div class="card card--alert pad">' +
          '<div class="sec-label" style="color:#c0241f;margin-bottom:10px">⚠ ÁRÍÐANDI SKILABOÐ</div>' +
          '<textarea class="field" id="_bs-urgent-ta" style="height:58px" placeholder="Brýn skilaboð fyrir bílstjóra / skrifstofu (sést á forsíðu listans)…">' + esc(a.urgent || '') + '</textarea>' +
          '<button class="btn btn--dark btn--sm" id="_bs-urgent-save" type="button" style="margin-top:11px">💾 Vista skilaboð</button>' +
        '</div>' +
        '<div class="card pad">' +
          '<div style="display:flex;align-items:center;margin-bottom:10px"><span class="sec-label">📝 MINNISPUNKTAR</span><span style="margin-left:auto;font-size:11px;color:#aeb4be">deilt með Leiðsögn</span></div>' +
          '<textarea class="field" id="_bs-note-ta" style="height:58px" placeholder="Áminningar: hringja á undan, lykill hjá húsverði, bílastæði í bakgarði…">' + esc(a.notes || '') + '</textarea>' +
          '<button class="btn btn--dark btn--sm" id="_bs-note-save" type="button" style="margin-top:11px">💾 Vista</button>' +
        '</div>' +
        '<div class="card pad">' +
          '<div class="sec-label" style="margin-bottom:10px">✍️ ATHUGASEMDIR Í SKÝRSLU</div>' +
          '<textarea class="field" id="_bs-skyrsla-ta" style="height:58px" placeholder="Það sem á að koma fram í úttektarskýrslunni (ástand, ábendingar)…"></textarea>' +
          '<button class="btn btn--dark btn--sm" id="_bs-skyrsla-save" type="button" style="margin-top:11px">💾 Vista í skýrslu</button>' +
        '</div>' +
        '<div class="card" style="padding:0;overflow:hidden">' +
          '<div style="display:flex;align-items:center;padding:13px 16px;border-bottom:1px solid rgba(20,24,34,.07)"><span class="sec-label">🧯 TÆKJALISTI</span><span class="_bs-prog" id="_bs-prog" style="margin-left:auto;font-family:var(--mono);font-size:12px;color:#8a93a5">…</span></div>' +
          '<div id="_bs-units"><div class="_bs-empty" style="color:#8a93a5;padding:20px">⏳ Sæki tæki…</div></div>' +
          '<div style="padding:0 14px 14px">' +
            '<button class="_bs-addunit" id="_bs-add-unit" type="button">➕ Bæta við tæki</button>' +
            '<div id="_bs-addunit-form"></div>' +
            '<button class="_bs-listlock" id="_bs-lock" type="button">✅ Staðfesta lista</button>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div class="dock dock--wide">' +
        // 2026-07-17 (ósk Agnars): back-takki í vinstra horni neðstu stikunnar
        // — þumal-svæðið, sama aðgerð og ‹ Til baka efst.
        '<button class="_bs-back btn btn--light" type="button" aria-label="Til baka" style="flex:0 0 auto;min-width:64px;padding:0 16px;font-size:22px;font-weight:800">‹</button>' +
        '<button class="btn btn--light" id="_bs-add-route" type="button" style="flex:1">✚ Á leið</button>' +
        '<button class="btn btn--accent" id="_bs-done" type="button" style="flex:2">✓ Klára úttekt</button>' +
      '</div>';

    document.body.appendChild(sheet);
    requestAnimationFrame(() => sheet.classList.add('in'));
    // Eftir inn-rennsli: hreinsa transforminn svo position:fixed dokkurinn
    // („✚ Á leið / ✓ Klára úttekt") festist við ALVÖRU botn skjásins í stað
    // þess að fljóta miðað við transformaða boxið (Samsung/Chrome).
    const clearTf = () => { if (sheet.classList.contains('in')) sheet.style.transform = 'none'; };
    sheet.addEventListener('transitionend', e => { if (e.target === sheet && e.propertyName === 'transform') clearTf(); });
    setTimeout(clearTf, 320);   // öryggisnet ef transitionend skilar sér ekki
    armBack();   // ýtir history-state svo síma-back loki spjaldinu (ekki appinu)
    const close = () => {
      sheet.style.transform = '';   // endurvekja transition fyrir út-rennsli
      sheet.classList.remove('in');
      setTimeout(() => sheet.remove(), 240);
      try { window.SlokkViewMode && window.SlokkViewMode.reapply(); } catch (_) {}
    };
    // ‹ takki OG síma-back → history.back() → popstate loki efsta spjaldi.
    sheet.querySelectorAll('._bs-back').forEach(b => b.addEventListener('click', () => { try { history.back(); } catch (_) { close(); } }));
    sheet.querySelector('#_bs-nav').addEventListener('click', () => navTo(c, coord && coord.lat, coord && coord.lng));
    const mapBtn = sheet.querySelector('._bs-mapbtn');   // 🗺 topbar → keyra þangað
    if (mapBtn) mapBtn.addEventListener('click', () => navTo(c, coord && coord.lat, coord && coord.lng));
    // Office only (hidden in locked driver mode): jump to this company's main
    // page in the office app. switchView leaves the Bílstjóri overlay (the
    // patchSwitchView hook hides it when !LOCKED), then open the detail.
    const openCoBtn = sheet.querySelector('#_bs-open-co');
    if (openCoBtn) openCoBtn.addEventListener('click', () => {
      close();
      try { if (window.App && App.switchView) App.switchView('companies'); } catch (_) {}
      setTimeout(() => {
        try {
          if (window.Companies && Companies.openDetail) Companies.openDetail(coId);
          else if (window.VidskDetail && VidskDetail.show) VidskDetail.show(coId);
        } catch (_) {}
      }, 80);
    });
    sheet.querySelector('#_bs-add-route').addEventListener('click', () => {
      if (coord && window.Leidsogn && Leidsogn.addToRoute) { Leidsogn.addToRoute(c.id, c.nafn, c.heimilisfang || '', coord.lat, coord.lng); toast('➕ Bætt á leið'); }
      else toast('⚠ Vantar staðsetningu');
    });
    sheet.querySelector('#_bs-urgent-save').addEventListener('click', async e => {
      const val = sheet.querySelector('#_bs-urgent-ta').value;
      e.target.textContent = '… vista'; e.target.disabled = true;
      const ok = await arsSave(coId, { urgent: val });
      e.target.textContent = ok ? '✓ Vistað' : '⚠ Villa'; setTimeout(() => { e.target.textContent = '💾 Vista skilaboð'; e.target.disabled = false; }, 1400);
      renderList();
    });
    sheet.querySelector('#_bs-note-save').addEventListener('click', async e => {
      const val = sheet.querySelector('#_bs-note-ta').value;
      e.target.textContent = '… vista'; e.target.disabled = true;
      const ok = await arsSave(coId, { notes: val });
      e.target.textContent = ok ? '✓ Vistað' : '⚠ Villa'; setTimeout(() => { e.target.textContent = '💾 Vista'; e.target.disabled = false; }, 1400);
    });
    // Aksturslisti-val: velur 0/1/2/3, samstillist (arsskodun_customers[id].akstur).
    const akSetBtns = sheet.querySelectorAll('._bs-ak-set');
    const reflectAk = () => { const cur = aksturOf(arsAll()[String(coId)]); akSetBtns.forEach(b => b.classList.toggle('is-active', +b.dataset.ak === cur)); };
    reflectAk();
    akSetBtns.forEach(b => b.addEventListener('click', async () => {
      const v = +b.dataset.ak || 0;
      const ok = await arsSave(coId, { akstur: v });
      reflectAk(); renderList(); renderPins();
      toast(ok ? (v ? '🚗 Settur í Akstur ' + v : '↩︎ Tekinn af aksturslista') : '⚠ Villa');
    }));
    // ── Athugasemdir í skýrslu (→ trip-state, birtist á úttektarskýrslunni) ──
    const skTa = sheet.querySelector('#_bs-skyrsla-ta');
    if (skTa) skTa.value = getTripSkyrsla(coId);
    const skSaveBtn = sheet.querySelector('#_bs-skyrsla-save');
    if (skSaveBtn) skSaveBtn.addEventListener('click', e => {
      setTripSkyrsla(coId, skTa ? skTa.value : '');
      e.target.textContent = '✓ Vistað'; setTimeout(() => { e.target.textContent = '💾 Vista í skýrslu'; }, 1400);
    });

    // ── Bæta við tæki á staðnum ──────────────────────────────────────────────
    const addBtn = sheet.querySelector('#_bs-add-unit');
    const addForm = sheet.querySelector('#_bs-addunit-form');
    if (addBtn && addForm) addBtn.addEventListener('click', () => {
      if (addForm.dataset.open === '1') { addForm.dataset.open = '0'; addForm.innerHTML = ''; return; }
      addForm.dataset.open = '1';
      // Föst tegunda-listi — raunverulegu slökkvitækin (tegund+stærð sameinuð svo
      // úttektarskýrslan (168) flokki þau rétt: duft/léttvatn/CO₂ small/big).
      // Tegund+stærð = NÁKVÆMLEGA kanónísku gildin í uttaeki (staðfest úr gögnum:
      // Léttvatn/6 L, ABC Duft/6 kg, CO2/5 kg — venjulegt 'CO2', ekki 'CO₂') svo
      // skýrslu-flokkun (168) OG verð-útreikningur skrifstofunnar (129) þekki þau.
      const PRESETS = [
        ['ABC Duft 6 kg', 'ABC Duft', '6 kg'],
        ['ABC Duft 2 kg', 'ABC Duft', '2 kg'],
        ['Léttvatn 6 L', 'Léttvatn', '6 L'],
        ['CO₂ 5 kg', 'CO2', '5 kg'],
        ['CO₂ 2 kg', 'CO2', '2 kg'],
        ['Brunaslanga', 'Brunaslanga', ''],
        ['Reykskynjari', 'Reykskynjari', ''],
        ['Eldvarnarteppi', 'Eldvarnarteppi', '']
      ];
      addForm.innerHTML =
        '<select class="_bs-af-in" id="_bs-af-preset">' + PRESETS.map((p, i) => '<option value="' + i + '">' + esc(p[0]) + '</option>').join('') + '</select>' +
        '<div class="_bs-af-row"><span style="align-self:center;color:#8891a0;font-size:14px">Fjöldi</span><input class="_bs-af-in" id="_bs-af-count" type="number" inputmode="numeric" min="1" value="1" style="max-width:90px">' +
          '<button class="btn btn--green btn--sm" id="_bs-af-add" type="button" style="flex:1">➕ Bæta við 🟢</button></div>';
      const doAdd = addForm.querySelector('#_bs-af-add');
      doAdd.addEventListener('click', async () => {
        const p = PRESETS[+addForm.querySelector('#_bs-af-preset').value] || PRESETS[0];
        const type = p[1], size = p[2];
        const count = addForm.querySelector('#_bs-af-count').value;
        if (!type) { toast('⚠ Veldu tegund'); return; }
        doAdd.textContent = '… bæti við'; doAdd.disabled = true;
        try {
          await addUnitsOnSite(c.nafn || '', type, size, count);
          addForm.dataset.open = '0'; addForm.innerHTML = '';
          toast('✓ Tæki bætt við');
          loadUnitsInto(sheet, c);   // endurteikna listann með nýja tækinu
        } catch (err) { doAdd.textContent = '➕ Bæta við (🟢 Yfirfarið)'; doAdd.disabled = false; toast('⚠ Villa: ' + (err.message || err)); }
      });
    });

    // ── Klára úttekt: setur „í vinnslu" + úttekt-þrep, býr til + vistar
    //    úttektarskýrsluna (168 auto-vistar PDF + setur „skýrsla"-þrepið).
    //    Reikningurinn bíður skrifstofunnar. ──────────────────────────────────
    sheet.querySelector('#_bs-done').addEventListener('click', async e => {
      e.target.textContent = '… vinn'; e.target.disabled = true;
      logAct('company_done', { co_id: coId, co_nafn: c.nafn });   // vakt: fyrirtæki klárað
      if (window.ArsWorkflow && ArsWorkflow.markInVinnsla) { await ArsWorkflow.markInVinnsla(coId); }
      else {
        const okv = await arsSave(coId, { field_inspected_year: curYear() });
        if (!okv) errBar('⚠ Vistun mistókst — „í vinnslu" ekki skráð. Reyndu aftur.', null);
      }
      try { if (window.Leidsogn && Leidsogn.refresh) Leidsogn.refresh(); } catch (_) {}
      renderList(); renderPins();
      close();
      if (window.CompanyInspectionReport && CompanyInspectionReport.open) {
        toast('📄 Bý til úttektarskýrslu…');
        setTimeout(() => { try { CompanyInspectionReport.open(coId); } catch (_) { toast('⚠ Gat ekki búið til skýrslu'); } }, 140);
      } else {
        toast('✅ Skráð í vinnslu (skýrslu-eining ekki hlaðin)');
      }
    });
    // Side link: jump to the Þjónustuverkstæði (ársskoðun) office list.
    const verkBtn = sheet.querySelector('#_bs-verkst');
    if (verkBtn) verkBtn.addEventListener('click', () => { close(); try { if (window.App && App.switchView) App.switchView('arsskodun'); } catch (_) {} });
    // List-lock: "Staðfesta lista" turns dark metal green + locks every tæki
    // choice (persisted per company via localStorage); tap again to open. CSS
    // disables .uact/.usvc/.uonytt while the sheet carries ._bs-locked.
    const lockKey = 'sk_bs_lock_' + coId;
    const applyLock = () => {
      let on = false; try { on = localStorage.getItem(lockKey) === '1'; } catch (_) {}
      sheet.classList.toggle('_bs-locked', on);
      const lb = sheet.querySelector('#_bs-lock');
      if (lb) { lb.classList.toggle('on', on); lb.textContent = on ? '🔒 Listi staðfestur — smelltu til að opna' : '✅ Staðfesta lista'; }
    };
    sheet.querySelector('#_bs-lock').addEventListener('click', () => {
      let on = false; try { on = localStorage.getItem(lockKey) === '1'; } catch (_) {}
      try { on ? localStorage.removeItem(lockKey) : localStorage.setItem(lockKey, '1'); } catch (_) {}
      applyLock();
    });
    applyLock();
    if (!document.getElementById('sk-bslock-css')) {
      const s = document.createElement('style'); s.id = 'sk-bslock-css';
      // Only the tækjalisti add/lock chrome lives here now (the aksturslisti +
      // tækja-formið eru á class-based þemanu: .seg/.seg__btn og .uact/.usvc/
      // .uonytt). Lock disables every tæki-takka meðan listinn er staðfestur.
      s.textContent = '._bs-listlock{display:block;width:100%;margin-top:10px;padding:13px;border-radius:12px;border:1px solid #c7ccd3;background:#eef1f4;color:#2b313a;font-weight:800;font-size:15px;font-family:inherit;cursor:pointer}'
        + '._bs-listlock:active{transform:translateY(1px)}'
        + '._bs-sheet._bs-locked .chk,._bs-sheet._bs-locked .uact,._bs-sheet._bs-locked .usvc,._bs-sheet._bs-locked .uonytt{pointer-events:none;opacity:.5}'
        + '._bs-listlock.on{background:linear-gradient(180deg,#2f5d3f,#173524);color:#daffe8;border-color:#0e2417;box-shadow:inset 0 1px 0 rgba(255,255,255,.18),0 2px 6px rgba(0,0,0,.25)}'
        + '._bs-addunit{display:block;width:100%;margin-top:10px;padding:12px;border-radius:12px;border:1px dashed #9aa3af;background:#fff;color:#2b313a;font-weight:700;font-size:15px;font-family:inherit;cursor:pointer}'
        + '._bs-addunit:active{transform:translateY(1px)}'
        + '#_bs-addunit-form{display:flex;flex-direction:column;gap:8px;margin-top:8px}'
        + '#_bs-addunit-form:empty{display:none}'
        + '._bs-af-row{display:flex;gap:8px}'
        + '._bs-af-in{flex:1;min-width:0;padding:12px;border-radius:10px;border:1px solid #cbd2da;font-size:16px;font-family:inherit;background:#fff;color:#1b1f26}';
      document.head.appendChild(s);
    }
    loadUnitsInto(sheet, c);
  }

  async function loadUnitsInto(sheet, c) {
    const box = sheet.querySelector('#_bs-units');
    const prog = sheet.querySelector('#_bs-prog');
    let units;
    try { units = await loadUnits(c); }
    catch (e) {
      box.innerHTML = '<div class="_bs-err" style="margin:12px 14px">Villa við að sækja tæki.<button class="btn btn--accent btn--sm" type="button">↻ Reyna aftur</button></div>';
      box.querySelector('button').addEventListener('click', () => loadUnitsInto(sheet, c));
      return;
    }
    if (!units.length) { box.innerHTML = '<div class="_bs-empty" style="color:#8a93a5;padding:20px">Engin skráð tæki á þessu fyrirtæki.</div>'; if (prog) prog.textContent = '0 tæki'; return; }
    const coId = c.id;
    const draw = () => {
      const done = units.filter(u => unitState(u) === 'yfirfarid').length;
      const inShop = units.filter(u => unitState(u) === 'verkstaedi').length;
      if (prog) prog.textContent = 'Yfirfarin: ' + done + '/' + units.length + (inShop ? ' · 🔧 ' + inShop : '');
      box.innerHTML = units.map(u => {
        const st = unitState(u);
        const svc = svcGet(coId, u);
        const onytt = svc === 'onytt';
        // Sleppa staðsetningu/heimilisfangi á tækinu (Agnar) — bara stærð + serial.
        const sub = [u.size, u.serial].filter(Boolean).map(esc).join(' · ');
        const ic = unitIcon(u.type);
        // theme dev__ic--red for warm (duft/reyk/annad), --blue for cool (co2/vatn/slang)
        const col = (ic.cls === 'co2' || ic.cls === 'vatn' || ic.cls === 'slang') ? 'blue' : 'red';
        // Verkstæðis-þrepið (sett af verkstæðinu í 268/269) — les-merking.
        const cust = (st === 'verkstaedi' && CUSTODY_LBL[u.custody_status]) ? CUSTODY_LBL[u.custody_status] : '';
        return '<div class="dev dev--form' + (onytt ? ' dev--onytt' : '') + '">' +
          '<div class="dev__top">' +
            '<span class="dev__ic dev__ic--' + col + '">' + ic.emoji + '</span>' +
            '<div class="dev__id">' +
              '<div class="dev__name">' + esc(u.type || 'Tæki') + '</div>' +
              (sub ? '<div class="dev__meta">' + sub + '</div>' : '') +
            '</div>' +
            '<button class="_bs-delunit" data-id="' + u.id + '" type="button" title="Eyða tæki (t.d. mistalið úr skýrslu)" aria-label="Eyða tæki">🗑</button>' +
          '</div>' +
          (cust ? '<div><span class="dev__cust">🔧 ' + esc(cust) + '</span></div>' : '') +
          // 1) STAÐA — skrifar í uttaeki (sömu þrjú gildi og gamli rúllu-chippinn)
          '<div class="uact-row">' +
            '<button class="uact _bs-uact' + (st === 'yfirfarid' ? ' is-on' : '') + '" data-act="yfirfarid" data-id="' + u.id + '" type="button" title="Merkja yfirfarið">✓ Yfirfarið</button>' +
            '<button class="uact _bs-uact' + (st === 'verkstaedi' ? ' is-on' : '') + '" data-act="verkstaedi" data-id="' + u.id + '" type="button" title="Tekið með á verkstæðið">🔧 Á verkstæði</button>' +
          '</div>' +
          // 2) ÞJÓNUSTUVAL — skrifar í trip-state (sama og skrifstofuformið 224)
          '<div class="usvc-row">' +
            SVC.map(s => '<button class="usvc _bs-usvc' + ((!onytt && svc === s[0]) ? ' is-on' : '') +
              '" data-v="' + s[0] + '" data-id="' + u.id + '" type="button">' + s[1] + '</button>').join('') +
            '<button class="uonytt _bs-uonytt' + (onytt ? ' is-on' : '') + '" data-id="' + u.id + '" type="button" title="Ónýtt — ekki rukkað" aria-label="Ónýtt">🚫</button>' +
          '</div>' +
        '</div>';
      }).join('');
      // ── STAÐA: ✓ Yfirfarið / 🔧 Á verkstæði (tapp á virkan takka → ⚪ Óskoðað) ──
      box.querySelectorAll('._bs-uact').forEach(btn => btn.addEventListener('click', async () => {
        const u = units.find(x => String(x.id) === String(btn.dataset.id));
        if (!u) return;
        const cur = unitState(u);
        const act = btn.dataset.act;
        // Fullur hringur (2026-07-14, ósk Agnars — „go back to óskoðað"): tapp á
        // takkann sem er þegar virkur skilar tækinu í ⚪ Óskoðað.
        const next = (cur === act) ? 'oskodad' : act;
        // Vörn (2026-07-26): skrifstofan merkti tækið ÓNÝTT í verkstæðinu
        // (service_choice='onytt'). Ekki leyfa tappi að endurlífga það óvart sem
        // gilt tæki — staðfesta fyrst. Leiðréttingar eru áfram mögulegar (já → heldur áfram).
        if (String(u.service_choice || '').toLowerCase() === 'onytt') {
          if (!confirm('Skrifstofan merkti þetta tæki ÓNÝTT í verkstæðinu.\n\nViltu samt breyta stöðunni?')) return;
        }
        // Vörn: verkstæðið er byrjað að vinna með tækið (custody_status sett í
        // 268/269) — að taka það af verkstæðis-borðinu hendir þeirri vinnu.
        if (cur === 'verkstaedi' && next !== 'verkstaedi' && u.custody_status) {
          if (!confirm('Verkstæðið er byrjað með þetta tæki (' + (CUSTODY_LBL[u.custody_status] || u.custody_status) + ').\n\nTaka það samt af verkstæðis-borðinu?')) return;
        }
        // Snapshot the fields updateForState() will overwrite, so a FAILED save
        // can be rolled back — otherwise the optimistic UI lied about a change
        // that never persisted (the "silently losing field inspections" bug).
        const prev = { status: u.status, last_insp: u.last_insp, next_insp: u.next_insp,
                       custody_status: u.custody_status, service_choice: u.service_choice };
        Object.assign(u, updateForState(next));
        draw();                                   // optimistic
        clearErrBar();
        try {
          await saveUnitState(u.id, next);
          // vakt: sömu aðgerðaheiti og áður (268 Aksturslisti telur þau)
          if (next === 'yfirfarid' || next === 'verkstaedi') logAct(next, { co_id: c.id, co_nafn: c.nafn, uttaeki_id: u.id });
        } catch (_) {
          Object.assign(u, prev); draw();   // roll UI back to the true (unsaved) state
          errBar('⚠ Vistun mistókst — ' + (u.type || 'tæki') + ' ekki uppfært. Reyndu aftur.', () => {
            const b2 = box.querySelector('._bs-uact[data-act="' + act + '"][data-id="' + u.id + '"]'); if (b2) b2.click();
          });
        }
      }));
      // ── ÞJÓNUSTUVAL: Yfirferð | Hleðsla | Nýtt (trip-state, engin DB-skrif) ──
      box.querySelectorAll('._bs-usvc').forEach(btn => btn.addEventListener('click', () => {
        const u = units.find(x => String(x.id) === String(btn.dataset.id));
        if (!u) return;
        svcSet(coId, u.id, btn.dataset.v);
        draw();
      }));
      // 🚫 Ónýtt — sami víxl-hnappur og á skrifstofusíðunni (224): onytt ⇄ yfirferd.
      box.querySelectorAll('._bs-uonytt').forEach(btn => btn.addEventListener('click', () => {
        const u = units.find(x => String(x.id) === String(btn.dataset.id));
        if (!u) return;
        svcSet(coId, u.id, svcGet(coId, u) === 'onytt' ? 'yfirferd' : 'onytt');
        draw();
      }));
      // Eyða tæki — leiðrétting þegar skýrslan var mistalin / tæki ekki lengur til.
      box.querySelectorAll('._bs-delunit').forEach(btn => btn.addEventListener('click', async () => {
        const u = units.find(x => String(x.id) === String(btn.dataset.id));
        if (!u) return;
        if (!confirm('Eyða þessu tæki?\n\n' + (u.type || 'Tæki') + (u.serial ? ' · ' + u.serial : '') + '\n\nÞetta fjarlægir tækið varanlega af ' + (c.nafn || 'fyrirtækinu') + '.')) return;
        btn.disabled = true; btn.textContent = '…';
        try {
          // Supabase resolves with { error } instead of throwing — must inspect
          // it, else a failed delete silently splices the row out of the list
          // (row gone on screen, still in the DB).
          if (window.DB && DB.sb) {
            const r = await DB.sb.from('uttaeki').delete().eq('id', u.id);
            if (r && r.error) throw new Error(r.error.message || 'delete villa');
          }
          const i = units.findIndex(x => String(x.id) === String(u.id));
          if (i >= 0) units.splice(i, 1);   // only remove AFTER a confirmed delete
          logAct('delete_unit', { co_id: c.id, co_nafn: c.nafn, uttaeki_id: u.id });
          clearErrBar(); toast('🗑 Tæki eytt'); draw();
        } catch (_) {
          btn.disabled = false; btn.textContent = '🗑';   // row kept — nothing lost
          errBar('⚠ Gat ekki eytt tæki — reyndu aftur.', () => {
            const b2 = box.querySelector('._bs-delunit[data-id="' + u.id + '"]'); if (b2) b2.click();
          });
        }
      }));
    };
    draw();
  }

  function toast(msg) {
    if (window.Toast && Toast.show) { try { Toast.show(msg); return; } catch (_) {} }
    const t = document.createElement('div');
    t.textContent = msg;
    t.style.cssText = 'position:fixed;left:50%;bottom:92px;transform:translateX(-50%);z-index:100090;background:var(--ink1,#0f1117);color:#fff;padding:11px 18px;border-radius:999px;font-size:14px;font-weight:700;font-family:var(--font,Inter,sans-serif);box-shadow:0 8px 24px rgba(0,0,0,.3)';
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 1800);
  }

  // Persistent error bar — for FAILED writes (a transient 1.8s toast is too easy
  // to miss when a save silently failed and the optimistic UI was rolled back).
  // Stays until the driver dismisses it (✕) or hits „↻ Reyna aftur". Fixed at the
  // top so it shows above the overlay/sheet (z above toast). Single reused node.
  function errBar(msg, retryFn) {
    let bar = document.getElementById('_bs-errbar');
    if (!bar) {
      bar = document.createElement('div');
      bar.id = '_bs-errbar';
      bar.style.cssText = 'position:fixed;left:0;right:0;top:0;z-index:100095;display:flex;align-items:center;gap:12px;padding:12px 16px;background:linear-gradient(180deg,#c0241f,#8a1010);color:#fff;font-family:var(--font,system-ui,-apple-system,sans-serif);font-size:14px;font-weight:700;box-shadow:0 6px 18px -6px rgba(0,0,0,.5)';
      document.body.appendChild(bar);
    }
    bar.innerHTML =
      '<span style="flex:1;min-width:0">' + esc(msg) + '</span>' +
      (retryFn ? '<button type="button" class="_bs-eb-retry" style="border:0;border-radius:8px;padding:7px 12px;background:rgba(255,255,255,.92);color:#8a1010;font:inherit;font-weight:800;cursor:pointer">↻ Reyna aftur</button>' : '') +
      '<button type="button" class="_bs-eb-x" aria-label="Loka" style="border:0;background:transparent;color:#fff;font-size:18px;font-weight:800;cursor:pointer;padding:0 4px;line-height:1">✕</button>';
    bar.style.display = 'flex';
    const x = bar.querySelector('._bs-eb-x'); if (x) x.onclick = () => { bar.style.display = 'none'; };
    const r = bar.querySelector('._bs-eb-retry');
    if (r) r.onclick = () => { bar.style.display = 'none'; try { retryFn(); } catch (_) {} };
  }
  function clearErrBar() { const b = document.getElementById('_bs-errbar'); if (b) b.style.display = 'none'; }

  // ── nav button + switchView hook + boot ──────────────────────────────────
  function injectSidebar() {
    const nav = document.querySelector('nav.view-nav, .view-nav');
    if (!nav) { setTimeout(injectSidebar, 600); return; }
    if (nav.querySelector('[data-view="' + NAV_KEY + '"]')) return;
    const ref = nav.querySelector('[data-view="leidsogn"]') || nav.querySelector('.vnav-btn');
    const btn = document.createElement('button');
    btn.className = (ref && ref.className) || 'vnav-btn';
    btn.setAttribute('data-view', NAV_KEY);
    btn.innerHTML = '<span style="display:inline-flex;align-items:center;gap:8px">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18">' +
        '<path d="M1 3h15v13H1zM16 8h4l3 3v5h-7z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>' +
      '</svg><span>Bílstjóri</span></span>';
    btn.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); if (window.App && App.switchView) App.switchView(NAV_KEY); else show(); });
    if (ref && ref.parentNode) ref.parentNode.insertBefore(btn, ref.nextSibling);
    else nav.insertBefore(btn, nav.firstChild);
  }

  function patchSwitchView() {
    if (!window.App) { setTimeout(patchSwitchView, 120); return; }
    if (window.App._bilstjoriPatched) return;
    const orig = window.App.switchView;
    window.App.switchView = function (view) {
      if (view === NAV_KEY) { show(); return; }
      if (LOCKED) {                               // locked driver mode: never leave
        try { if (orig) orig.apply(this, arguments); } catch (_) {}  // let lazy data-loads run
        show();                                   // …but keep Bílstjóri on top
        return;
      }
      const r = orig ? orig.apply(this, arguments) : undefined;
      // leaving the driver app: hide the overlay + restore the sidebar
      try { const v = document.getElementById(VIEW_ID); if (v) { v.style.display = 'none'; v.classList.remove('active'); } document.body.classList.remove('bs-active'); } catch (_) {}
      return r;
    };
    for (const k in orig) { try { window.App.switchView[k] = orig[k]; } catch (_) {} }
    window.App._bilstjoriPatched = true;
  }

  // Own the #bilstjori / #drivers deep link: re-assert the driver view until we
  // reach it OR the user interacts. This outlasts boot-time auto-landers — e.g.
  // sala.js switches to Sala ~1.5s in; without this it stole the deep link and
  // the URL ended up on #sala (the main site) instead of the driver app.
  let _userTook = false;
  ['pointerdown', 'mousedown', 'keydown', 'touchstart'].forEach(ev =>
    window.addEventListener(ev, () => { _userTook = true; }, { capture: true, passive: true }));
  function hashIsMine() {
    if (LOCKED) return true;
    const h = (location.hash || '').replace(/^#/, '').toLowerCase();
    return h === NAV_KEY || h === 'drivers';
  }
  // Hide the fullscreen driver overlay + restore the sidebar (same cleanup the
  // switchView wrapper does). Needed on hashchange too: a board patch installed
  // ABOVE this wrapper (e.g. 231 Verkborð) short-circuits its own view without
  // calling through, so the wrapper's cleanup never ran → the overlay stayed
  // covering the app on mobile.
  function hideOverlay() {
    try {
      const v = document.getElementById(VIEW_ID);
      if (v) { v.style.display = 'none'; v.classList.remove('active'); }
      document.body.classList.remove('bs-active');
    } catch (_) {}
  }
  // NB: a boot-lander steal gets MIRRORED into the hash via replaceState
  // (patch 218 wrapper) without firing hashchange — so the loop must NOT
  // poll location.hash to decide to stop. Real navigation (a hashchange
  // event) re-enters openFromHash, bumps _navGen and kills the old loop.
  let _navGen = 0;
  function openFromHash() {
    _navGen++;
    if (!hashIsMine()) {
      // navigated away by hash while the driver overlay is up → close it
      // (locked ?driver mode keeps snapping back as designed — hashIsMine()
      // is always true there, so this branch never runs when LOCKED).
      if (document.body.classList.contains('bs-active')) hideOverlay();
      return;
    }
    const gen = _navGen;
    const deadline = Date.now() + 5000;
    let skippedOnce = false;
    (function tick() {
      if (_userTook || gen !== _navGen || Date.now() > deadline) return;  // user took over / navigated / gave up
      // Foreign hash? Two possibilities: (a) REAL navigation whose hashchange
      // hasn't dispatched yet — showing now would replaceState the hash back
      // and swallow the navigation; (b) a boot-lander steal mirrored silently
      // via replaceState (no event) — then we SHOULD re-assert. Skip ONE tick:
      // (a) bumps _navGen before the next tick and kills the loop, (b) doesn't.
      if (!hashIsMine() && !skippedOnce) { skippedOnce = true; setTimeout(tick, 70); return; }
      skippedOnce = false;
      try {
        const active = document.querySelector('.view.active');
        if (!active || active.id !== VIEW_ID) show();           // re-assert if a lander stole focus
      } catch (_) {}
      setTimeout(tick, 70);
    })();
  }

  // Síma-back / til-baka: haldið innan appsins. Ýtum history-state svo „back"
  // (síma-hnappur, bendill eða ‹) loki EFSTA spjaldi — en loki ekki appinu.
  // Í læstum ham fer back aldrei út (endur-armar); í skrifstofuham má fara út.
  function armBack() { try { history.pushState({ bs: 1 }, ''); } catch (_) {} }
  let _backGuard = false;
  function installBackGuard() {
    if (_backGuard) return; _backGuard = true;
    window.addEventListener('popstate', () => {
      if (!document.body.classList.contains('bs-active')) return;   // ekki í Bílstjóra
      const sheet = document.querySelector('._bs-sheet.in');
      if (sheet) {
        sheet.style.transform = '';   // endurvekja transition fyrir út-rennsli
        sheet.classList.remove('in');
        setTimeout(() => sheet.remove(), 240);
        armBack();
        // Eftir lokun: sýnin (Sími/Tafla/Skjár) helst — endur-beita geymdri stillingu.
        try { window.SlokkViewMode && window.SlokkViewMode.reapply(); } catch (_) {}
        return;
      }
      if (LOCKED) armBack();   // læst: back lokar aldrei appinu
    });
  }

  function boot() {
    ensureView();
    injectSidebar();
    patchSwitchView();
    installBackGuard();
    setTimeout(injectSidebar, 1400);
    setTimeout(injectSidebar, 3000);
    openFromHash();                               // deep-link on first load
    window.addEventListener('hashchange', openFromHash);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  window.Bilstjori = { show, render: show, renderList, renderVakt, pickEmp, getEmp, version: 'v2' };
  console.log('[bilstjori v2] installed');
})();
/* === END BÍLSTJÓRI === */
