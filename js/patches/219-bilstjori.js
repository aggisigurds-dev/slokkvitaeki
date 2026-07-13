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
 * tækjalisti with a tap-to-roll chip ⚪ Óskoðað → 🟢 Yfirfarið → 🔵 Á verkstæði
 * writing uttaeki.status (+ last_insp/next_insp on Yfirfarið). "✅ Tekið út"
 * sets field_inspected_year.
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
  const LOCKED = (() => {
    try { return new URLSearchParams(location.search).has('driver'); }
    catch (_) { return /[?&]driver(?:$|[=&])/.test(location.search || ''); }
  })();
  const DRIVER_LINK = () => location.origin + '/?driver';

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
  function phoneOf(c) { return c.simi || c['sími'] || c.phone || c.telefon || ''; }
  function coordOf(c, gc) { gc = gc || readGc(); return gc['__co__:' + c.id] || gc[c.heimilisfang] || gc[c.nafn] || null; }

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

  // ── equipment (uttaeki) ──────────────────────────────────────────────────
  function unitState(u) {
    const st = (u.status || '').toLowerCase();
    if (st === 'loaned') return 'verkstaedi';
    if (st === 'ok' && String(u.last_insp || '').slice(0,4) === String(curYear())) return 'yfirfarid';
    return 'oskodad';
  }
  const STATE_META = {
    oskodad:   { bg:'var(--surface2,#f8f8fa)', fg:'var(--ink2,#404550)', bd:'var(--brd,#e4e6ea)', icon:'⚪', label:'Óskoðað' },
    yfirfarid: { bg:'var(--grn-bg,#edfaf3)', fg:'var(--grn,#1a7f4b)', bd:'var(--grn-bd,#a7e8c5)', icon:'🟢', label:'Yfirfarið' },
    verkstaedi:{ bg:'var(--blu-bg,#eff6ff)', fg:'var(--blu,#1d4ed8)', bd:'var(--blu-bd,#93c5fd)', icon:'🔵', label:'Á verkstæði' }
  };
  const ROLL = { oskodad:'yfirfarid', yfirfarid:'verkstaedi', verkstaedi:'oskodad' };
  function updateForState(next) {
    if (next === 'yfirfarid') return { status:'ok', last_insp: today(), next_insp: nextYearIso() };
    if (next === 'verkstaedi') return { status:'loaned' };
    return { status:'active' };
  }
  async function loadUnits(c) {
    const name = c.nafn || '';
    if (window.DB && DB.sb) {
      try {
        let q = DB.sb.from('uttaeki')
          .select('id,serial,type,size,location,status,last_insp,next_insp')
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
    v.innerHTML = '<div id="_bs-root" class="_bs-root"></div>';
    // Append to <body> (NOT the content panel): the content panel is a
    // transformed/positioned ancestor, which would confine our position:fixed
    // overlay to the area right of the sidebar. On <body> it covers the whole
    // viewport — sidebar included.
    (document.body || document.documentElement).appendChild(v);
  }

  function injectStyles() {
    if (document.getElementById('_bs-styles')) return;
    const s = document.createElement('style');
    s.id = '_bs-styles';
    s.textContent = [
      // full-screen overlay — covers the sidebar + all app chrome
      '#' + VIEW_ID + '{position:fixed!important;inset:0!important;z-index:1000;background:var(--bg,#f5f5f7);overflow-y:auto;-webkit-overflow-scrolling:touch}',
      'body.bs-active{overflow:hidden}',
      'body.bs-active .topbar,body.bs-active nav.view-nav,body.bs-active .sidebar{display:none!important}',
      '._bs-root{display:flex;flex-direction:column;min-height:100%;max-width:720px;margin:0 auto;font-family:var(--font,Inter,system-ui,sans-serif);font-size:16px;color:var(--ink1,#0f1117);-webkit-tap-highlight-color:transparent}',
      '._bs-top{position:sticky;top:0;z-index:6;background:var(--sidebar-bg,#1a1f2e);color:#fff;padding:14px 16px;display:flex;align-items:center;gap:10px;border-bottom:2px solid var(--brand,#C93C1D)}',
      '._bs-top h1{margin:0;font-size:18px;font-weight:700;letter-spacing:-.02em;display:flex;align-items:center;gap:9px;flex:1}',
      '._bs-iconbtn{min-width:44px;min-height:44px;padding:0 10px;font:inherit;font-size:17px;line-height:1;border:1px solid rgba(255,255,255,.18);border-radius:10px;background:rgba(255,255,255,.08);color:#fff;cursor:pointer;flex:none}',
      '._bs-iconbtn:active{background:rgba(255,255,255,.2)}',
      '._bs-hint{font-size:11.5px;color:var(--ink3,#8891a0);line-height:1.45;padding:1px 2px 0}',
      '._bs-map{width:100%;height:240px;background:#e9eaee;border-bottom:1px solid var(--brd,#e4e6ea)}',
      '._bs-pin{background:transparent;border:0}',
      '._bs-controls{position:sticky;top:51px;z-index:5;background:var(--bg,#f5f5f7);padding:12px 14px 8px;display:flex;flex-direction:column;gap:10px;border-bottom:1px solid var(--brd,#e4e6ea)}',
      '._bs-search{width:100%;box-sizing:border-box;font:inherit;font-size:16px;padding:12px 14px;border:1px solid var(--brd2,#d0d4da);border-radius:10px;background:var(--surface,#fff);color:var(--ink1,#0f1117)}',
      '._bs-search:focus{outline:none;border-color:var(--brand,#C93C1D)}',
      '._bs-seg{display:flex;gap:5px;background:var(--bg3,#efefef);padding:4px;border-radius:11px}',
      '._bs-seg button{flex:1;min-height:44px;font:inherit;font-size:13.5px;font-weight:600;border:none;border-radius:8px;background:transparent;color:var(--ink2,#404550);cursor:pointer}',
      '._bs-seg button.on{background:var(--surface,#fff);color:var(--ink1,#0f1117);box-shadow:var(--shadow-sm,0 1px 2px rgba(0,0,0,.1))}',
      '._bs-list{padding:12px 14px;display:flex;flex-direction:column;gap:9px}',
      '._bs-card{display:flex;gap:13px;align-items:center;width:100%;text-align:left;background:var(--surface,#fff);border:1px solid var(--brd,#e4e6ea);border-radius:var(--radius-lg,14px);padding:14px 15px;min-height:64px;cursor:pointer;box-shadow:var(--shadow-sm,0 1px 3px rgba(0,0,0,.06));transition:background .12s,box-shadow .12s}',
      '._bs-card:active{background:var(--surface2,#f8f8fa);box-shadow:var(--shadow-md,0 4px 12px rgba(0,0,0,.08))}',
      '._bs-dot{width:12px;height:12px;border-radius:50%;flex:none;box-shadow:0 0 0 3px rgba(0,0,0,.04)}',
      // drive-order marker — number = recommended order; colour = forgangur level
      '._bs-seq{width:32px;height:32px;flex:none;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14.5px;font-weight:800;color:#fff;background:#94a3b8;font-variant-numeric:tabular-nums;box-shadow:0 0 0 3px rgba(0,0,0,.04)}',
      '._bs-seq.p1{background:#16a34a}._bs-seq.p2{background:#d97706}._bs-seq.p3{background:#dc2626}',
      // unified status pill (matches Ársskoðun)
      '._bs-pill{display:inline-flex;align-items:center;gap:5px;font-size:12px;font-weight:700;line-height:1;padding:4px 10px;border-radius:999px;border:1px solid;white-space:nowrap}',
      '._bs-card-main{flex:1;min-width:0}',
      '._bs-card-name{font-weight:600;font-size:16px;line-height:1.3;color:var(--ink1,#0f1117);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '._bs-card-sub{font-size:13.5px;color:var(--ink3,#8891a0);margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '._bs-card-meta{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:6px;font-size:12.5px;font-weight:600}',
      '._bs-card-extra{display:block;margin-top:5px;font-size:12px;color:var(--ink3,#8891a0);font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '._bs-badge{font-size:11.5px;font-weight:700;padding:2px 9px;border-radius:999px;background:var(--red-bg,#fff0ed);color:var(--red,#C93C1D);border:1px solid var(--red-bd,#fca5a5)}',
      '._bs-chev{font-size:23px;color:var(--ink4,#bcc3cc);flex:none;line-height:1}',
      '._bs-check{width:38px;height:38px;flex:none;border-radius:10px;border:2px solid var(--blu,#1d4ed8);background:var(--surface,#fff);color:#fff;font-size:19px;font-weight:800;line-height:1;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0}',
      '._bs-check.on{background:var(--blu,#1d4ed8)}',
      '._bs-check:active{filter:brightness(.94)}',
      '._bs-empty{padding:42px 24px;text-align:center;color:var(--ink3,#8891a0);font-size:15px}',
      '._bs-err{margin:12px 14px;padding:14px;border-radius:12px;background:var(--red-bg,#fff0ed);border:1px solid var(--red-bd,#fca5a5);color:var(--brand-dk,#a83018);font-size:14px;display:flex;justify-content:space-between;align-items:center;gap:10px}',
      '._bs-bottom{position:fixed;left:0;right:0;bottom:0;z-index:210;background:linear-gradient(to top,var(--bg,#f5f5f7) 64%,rgba(245,245,247,0));padding:13px 14px calc(13px + env(safe-area-inset-bottom));display:flex;justify-content:center;pointer-events:none}',
      '._bs-bottom .inner{width:100%;max-width:692px;pointer-events:auto}',
      '._bs-primary{width:100%;box-sizing:border-box;min-height:54px;font:inherit;font-size:16.5px;font-weight:700;letter-spacing:-.01em;border:none;border-radius:var(--radius-lg,14px);background:var(--brand,#C93C1D);color:#fff;cursor:pointer;box-shadow:var(--shadow-md,0 4px 12px rgba(0,0,0,.16))}',
      '._bs-primary:active{background:var(--brand-dk,#a83018)}',
      '._bs-primary[disabled]{background:var(--ink4,#bcc3cc);box-shadow:none;cursor:default}',
      // company sheet
      '._bs-sheet{position:fixed;inset:0;z-index:1100;background:var(--bg,#f5f5f7);display:flex;flex-direction:column;transform:translateX(100%);transition:transform .24s cubic-bezier(.32,.72,0,1);overflow:hidden}',
      '._bs-sheet.in{transform:translateX(0)}',
      '._bs-sheet-top{position:sticky;top:0;background:var(--sidebar-bg,#1a1f2e);color:#fff;padding:12px;display:flex;align-items:center;gap:11px;border-bottom:2px solid var(--brand,#C93C1D)}',
      '._bs-back{min-width:48px;min-height:48px;border:none;border-radius:11px;background:rgba(255,255,255,.1);color:#fff;font-size:22px;line-height:1;cursor:pointer;flex:none}',
      '._bs-back:active{background:rgba(255,255,255,.18)}',
      '._bs-sheet-title{flex:1;min-width:0}',
      '._bs-sheet-title .nm{font-weight:700;font-size:17px;letter-spacing:-.01em;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '._bs-sheet-title .st{font-size:12.5px;color:rgba(255,255,255,.7);margin-top:1px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '._bs-sheet-body{flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch;padding:14px 14px 120px}',
      '._bs-addr{font-size:14.5px;color:var(--ink2,#404550);margin:2px 2px 14px;line-height:1.45}',
      '._bs-actrow{display:flex;gap:10px;margin-bottom:14px}',
      '._bs-act{flex:1;min-height:50px;font:inherit;font-size:15px;font-weight:600;border-radius:12px;border:1px solid var(--brd,#e4e6ea);background:var(--surface,#fff);color:var(--ink1,#0f1117);cursor:pointer;display:flex;align-items:center;justify-content:center;gap:7px;text-decoration:none;box-shadow:var(--shadow-sm,0 1px 3px rgba(0,0,0,.06))}',
      '._bs-act.go{background:var(--brand,#C93C1D);border-color:var(--brand,#C93C1D);color:#fff}',
      '._bs-act:active{filter:brightness(.97)}',
      '._bs-sec{background:var(--surface,#fff);border:1px solid var(--brd,#e4e6ea);border-radius:var(--radius-lg,14px);padding:15px;margin-bottom:13px;box-shadow:var(--shadow-sm,0 1px 3px rgba(0,0,0,.06))}',
      '._bs-sec h3{margin:0 0 11px;font-size:13px;font-weight:700;color:var(--ink2,#404550);text-transform:uppercase;letter-spacing:.03em;display:flex;align-items:center;justify-content:space-between;gap:8px}',
      '._bs-urgent{background:var(--red-bg,#fff0ed);border-color:var(--red-bd,#fca5a5)}',
      '._bs-urgent h3{color:var(--brand,#C93C1D)}',
      '._bs-ta{width:100%;box-sizing:border-box;font:inherit;font-size:15px;line-height:1.5;padding:11px 12px;border:1px solid var(--brd2,#d0d4da);border-radius:10px;resize:vertical;min-height:62px;background:var(--surface,#fff);color:var(--ink1,#0f1117)}',
      '._bs-ta:focus{outline:none;border-color:var(--brand,#C93C1D)}',
      '._bs-save{margin-top:9px;min-height:48px;padding:0 16px;font:inherit;font-size:13.5px;font-weight:600;border:none;border-radius:9px;background:var(--ink1,#0f1117);color:#fff;cursor:pointer}',
      '._bs-unit{display:flex;align-items:center;gap:12px;padding:11px 12px;border:1px solid var(--brd,#e4e6ea);border-radius:12px;margin-bottom:9px;background:var(--surface,#fff)}',
      '._bs-unit-main{flex:1;min-width:0}',
      '._bs-unit-t{font-weight:600;font-size:15px;color:var(--ink1,#0f1117);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '._bs-unit-s{font-size:12.5px;color:var(--ink3,#8891a0);margin-top:1px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '._bs-chip{min-width:132px;min-height:48px;border:1px solid transparent;border-radius:11px;font:inherit;font-size:14px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;flex:none}',
      '._bs-chip:active{filter:brightness(.96)}',
      '._bs-prog{font-size:12.5px;color:var(--ink3,#8891a0);font-weight:700;text-transform:none;letter-spacing:0}'
    ].join('');
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
  let _map = null, _markers = [];
  function makeIcon(color) {
    return L.divIcon({ className: '_bs-pin',
      html: '<div style="background:' + color + ';width:15px;height:15px;border-radius:50%;border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,.45)"></div>',
      iconSize: [19,19], iconAnchor: [9.5,9.5] });
  }
  function renderPins() {
    if (!_map || !window.L) return;
    _markers.forEach(m => { try { _map.removeLayer(m); } catch (_) {} });
    _markers = [];
    const { list } = currentList();
    const pts = [];
    list.forEach(x => {
      if (!x.coord) return;
      const m = L.marker([x.coord.lat, x.coord.lng], { icon: makeIcon(x.status.color) }).addTo(_map);
      m.on('click', () => openCompany(x.co.id));
      _markers.push(m); pts.push([x.coord.lat, x.coord.lng]);
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
    document.querySelectorAll('.vnav-btn').forEach(b => b.classList.toggle('active', b.getAttribute('data-view') === NAV_KEY));
    try { localStorage.setItem('lastView', NAV_KEY); } catch (_) {}
    try { if ((location.hash || '').replace(/^#/, '') !== NAV_KEY) history.replaceState(null, '', '#' + NAV_KEY); } catch (_) {}

    const root = document.getElementById('_bs-root');
    if (!root) { setTimeout(show, 150); return; }

    if (!root.querySelector('#_bs-mapcanvas')) {
      root.innerHTML =
        '<div class="_bs-top"><h1><span>🚚</span><span>Bílstjóri</span></h1>' +
          '<button id="_bs-full" class="_bs-iconbtn" type="button" title="Allur skjár (fela vafra)">⛶</button>' +
          '<button id="_bs-share" class="_bs-iconbtn" type="button" title="Afrita hlekk til að senda á bílstjóra">🔗</button>' +
          (LOCKED ? '' : '<button id="_bs-exit" class="_bs-iconbtn" type="button" title="Til baka í forritið / vefsíðu">✕</button>') +
          '</div>' +
        '<div id="_bs-mapcanvas" class="_bs-map"></div>' +
        '<div class="_bs-controls">' +
          '<input id="_bs-q" class="_bs-search" type="search" inputmode="search" placeholder="Leita að fyrirtæki, heimilisfangi, kt…">' +
          '<div class="_bs-seg">' +
            '<button data-seg="today" type="button">📋 Dagsins verk</button>' +
            '<button data-seg="all" type="button">🏢 Allir í þjónustu</button>' +
          '</div>' +
          '<div class="_bs-akstur">' +
            '<button data-seg="a1" type="button" class="_ak" style="--ak:' + AKSTUR[1].dot + '">🚗 Akstur 1</button>' +
            '<button data-seg="a2" type="button" class="_ak" style="--ak:' + AKSTUR[2].dot + '">🚗 Akstur 2</button>' +
            '<button data-seg="a3" type="button" class="_ak" style="--ak:' + AKSTUR[3].dot + '">🚗 Akstur 3</button>' +
          '</div>' +
          '<div class="_bs-hint">🔗 Afritaðu hlekkinn og sendu á bílstjóra · ⛶ opnar í fullum skjá · eða „Bæta á heimaskjá" fyrir app-ham.</div>' +
        '</div>' +
        '<div id="_bs-list" class="_bs-list"></div>' +
        '<div class="_bs-bottom"><div class="inner"><button id="_bs-drive" class="_bs-primary" type="button">🚗 Keyra leið dagsins</button></div></div>';

      const exitBtn = root.querySelector('#_bs-exit');
      if (exitBtn) exitBtn.addEventListener('click', () => {
        if (window.App && App.switchView) App.switchView('leidsogn');
      });
      root.querySelector('#_bs-full').addEventListener('click', toggleFullscreen);
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
  }

  function renderList() {
    const box = document.getElementById('_bs-list');
    if (!box) return;
    // reflect segment buttons
    document.querySelectorAll('._bs-seg button').forEach(b => b.classList.toggle('on', b.dataset.seg === _seg));
    document.querySelectorAll('._bs-akstur button').forEach(b => b.classList.toggle('on', b.dataset.seg === _seg));
    const qEl = document.getElementById('_bs-q');
    if (qEl && qEl.value !== _search) qEl.value = _search;

    const { ready, list } = currentList();
    if (!ready) { box.innerHTML = '<div class="_bs-empty">⏳ Sæki gögn…</div>'; return; }
    box.innerHTML = list.length
      ? list.map((x, i) => cardHtml(x, i + 1)).join('')
      : '<div class="_bs-empty">' + (_seg === 'today' ? '✅ Ekkert áríðandi eftir í dag.' : 'Engin fyrirtæki fundust.') + '</div>';
    box.querySelectorAll('._bs-card').forEach(card => card.addEventListener('click', e => {
      if (e.target.closest('._bs-check') || e.target.closest('._bs-ak-chip')) return;   // handled below
      openCompany(+card.dataset.id);
    }));
    // Aksturslisti-chip: tappa til að rúlla 0 → 1 → 2 → 3 → 0 (setur akstur á kúnna).
    box.querySelectorAll('._bs-ak-chip').forEach(btn => btn.addEventListener('click', async e => {
      e.stopPropagation();
      const id = +btn.dataset.id;
      const next = ((+btn.dataset.ak || 0) + 1) % 4;
      const ok = await arsSave(id, { akstur: next });
      toast(ok ? (next ? '🚗 Settur í Akstur ' + next : '↩︎ Tekinn af aksturslista') : '⚠ Villa');
      renderList(); renderPins();
    }));
    // Blue check → toggle field_inspected_year (🔵 Í vinnslu). Sends the company
    // to ÞjónustuVerkstæði "Í vinnslu" (finish report) and drops it from the
    // driving list (status becomes in_progress) — same flag as patch 190.
    box.querySelectorAll('._bs-check').forEach(btn => btn.addEventListener('click', async e => {
      e.stopPropagation();
      const id = btn.dataset.id;
      const wasOn = (+((arsAll()[String(id)] || {}).field_inspected_year) === curYear());
      btn.classList.toggle('on', !wasOn); btn.textContent = !wasOn ? '✓' : '';   // optimistic
      const ok = await arsSave(id, { field_inspected_year: wasOn ? 0 : curYear() });
      try { if (window.Leidsogn && Leidsogn.refresh) Leidsogn.refresh(); } catch (_) {}
      toast(ok ? (wasOn ? '↩︎ Tekið úr vinnslu' : '🔵 Sent í vinnslu — skýrsla eftir') : '⚠ Villa við vistun');
      renderList(); renderPins();
    }));

    const drive = document.getElementById('_bs-drive');
    if (drive) {
      const n = list.filter(x => x.coord && (x.status.key==='overdue' || x.status.key==='duenow' || x.priority)).length;
      drive.disabled = !n;
      drive.textContent = '🚗 Keyra leið dagsins' + (n ? ' (' + n + ')' : '');
    }
  }

  // Unified status pill — same colour system as Ársskoðun, mapped from the
  // statusFor() key. Mobile-clean: colour + label, no icon (the drive-order
  // marker on the left already carries the forgangur).
  const _BS_PILL = {
    done:        ['#f0fdf4', '#bbf7d0', '#15803d'],
    overdue:     ['#fef2f2', '#fecaca', '#b91c1c'],
    duenow:      ['#fffbeb', '#fde68a', '#a16207'],
    in_progress: ['#eff6ff', '#bfdbfe', '#1d4ed8'],
    scheduled:   ['#f1f5f9', '#cbd5e1', '#475569'],
    unknown:     ['#f1f5f9', '#cbd5e1', '#475569']
  };
  function statusPill(st) {
    const c = _BS_PILL[st.key] || _BS_PILL.unknown;
    return '<span class="_bs-pill" style="background:' + c[0] + ';border-color:' + c[1] + ';color:' + c[2] + '">' + esc(st.label) + '</span>';
  }

  function cardHtml(x, seq) {
    const c = x.co;
    const m = +((x.ars || {}).inspect_month) || 0;
    const monthName = (m >= 1 && m <= 12) ? MONTHS_IS[m - 1] : '';
    const insYear = yearOf(x.ars);
    const nUnits = unitCount(x);
    const inVinnsla = (+((x.ars || {}).field_inspected_year) === curYear());  // 🔵 blue flag (þjónustuverkstæði)
    const ak = aksturOf(x.ars);   // aksturslisti 0/1/2/3
    const lvl = +x.priority || 0;
    const extra = '🧯 ' + nUnits + ' tæki'
      + (monthName ? ' · 📅 ' + monthName : '')
      + ' · ' + (insYear ? 'síðast ' + insYear : 'óskoðað');
    // Left marker: in "Dagsins verk" it's the drive-order number; in "Allir" it's
    // a forgangur badge (! when set, · otherwise). Colour = forgangur level.
    const mark = (_seg === 'today') ? (seq || '·') : (lvl > 0 ? '!' : '·');
    return (
      '<div class="_bs-card" role="button" tabindex="0" data-id="' + c.id + '" data-co-id="' + c.id + '">' +
        '<span class="_bs-seq p' + lvl + '" title="' + (lvl ? 'Forgangur ' + lvl : 'Enginn forgangur') + '">' + mark + '</span>' +
        '<span class="_bs-card-main">' +
          '<span class="_bs-card-name">' + esc(c.nafn || '—') + '</span>' +
          '<span class="_bs-card-sub">' + (c.heimilisfang ? '📍 ' + esc(c.heimilisfang) : '<span style="color:var(--brand,#C93C1D)">⚠ Ekkert heimilisfang</span>') + '</span>' +
          '<span class="_bs-card-meta">' +
            statusPill(x.status) +
            (x.urgent ? '<span class="_bs-badge">🚨 Skilaboð</span>' : '') +
          '</span>' +
          '<span class="_bs-card-extra">' + esc(extra) + '</span>' +
        '</span>' +
        '<button class="_bs-ak-chip' + (ak ? ' on' : '') + '" type="button" data-id="' + c.id + '" data-ak="' + ak + '"' +
          (ak ? ' style="--ak:' + AKSTUR[ak].dot + '"' : '') +
          ' title="Aksturslisti — tappa til að setja 1 → 2 → 3">' + (ak ? '🚗' + ak : '🚗') + '</button>' +
        '<button class="_bs-check' + (inVinnsla ? ' on' : '') + '" type="button" data-id="' + c.id + '" ' +
          'title="' + (inVinnsla ? 'Í vinnslu (þjónustuverkstæði) — smelltu til að taka úr' : 'Senda í vinnslu — þjónustuverkstæði (dettur úr leiðsögn)') + '" ' +
          'aria-label="Senda í vinnslu">' + (inVinnsla ? '✓' : '') + '</button>' +
        '<span class="_bs-chev">›</span>' +
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
  function toggleFullscreen() {
    const d = document, el = d.documentElement;
    const fsEl = d.fullscreenElement || d.webkitFullscreenElement;
    try {
      if (fsEl) { (d.exitFullscreen || d.webkitExitFullscreen).call(d); }
      else { (el.requestFullscreen || el.webkitRequestFullscreen).call(el); }
    } catch (_) { toast('Fullur skjár ekki studdur hér — notaðu „Bæta á heimaskjá".'); }
  }

  function openCompany(coId) {
    const c = companies().find(x => String(x.id) === String(coId));
    if (!c) return;
    const a = arsAll()[String(coId)] || {};
    const st = statusFor(a);
    const coord = coordOf(c);
    const phone = phoneOf(c);

    const sheet = document.createElement('div');
    sheet.className = '_bs-sheet';
    sheet.innerHTML =
      '<div class="_bs-sheet-top">' +
        '<button class="_bs-back" type="button" aria-label="Til baka">‹</button>' +
        '<div class="_bs-sheet-title"><div class="nm">' + esc(c.nafn || '—') + '</div>' +
          '<div class="st">' + (c.kennitala ? 'kt. ' + esc(fmtKt(c.kennitala)) + ' · ' : '') +
          '<span style="color:' + st.color + '">●</span> ' + esc(st.label) + '</div></div>' +
      '</div>' +
      '<div class="_bs-sheet-body">' +
        (c.heimilisfang ? '<div class="_bs-addr">📍 ' + esc(c.heimilisfang) + '</div>' : '') +
        '<div class="_bs-actrow">' +
          '<button class="_bs-act go" id="_bs-nav" type="button">🧭 Keyra þangað</button>' +
          (phone ? '<a class="_bs-act" href="tel:' + esc(String(phone).replace(/\s/g,'')) + '">📞 Hringja</a>' : '') +
          (LOCKED ? '' : '<button class="_bs-act" id="_bs-open-co" type="button">🏢 Opna fyrirtæki</button>') +
          (LOCKED ? '' : '<button class="_bs-act" id="_bs-verkst" type="button">📋 Verkstæði</button>') +
        '</div>' +
        '<div class="_bs-sec">' +
          '<h3><span>🚗 Aksturslisti</span></h3>' +
          '<div class="_bs-ak-row">' +
            '<button class="_bs-ak-set" data-ak="0" type="button">Enginn</button>' +
            '<button class="_bs-ak-set" data-ak="1" type="button" style="--ak:' + AKSTUR[1].dot + '">Akstur 1</button>' +
            '<button class="_bs-ak-set" data-ak="2" type="button" style="--ak:' + AKSTUR[2].dot + '">Akstur 2</button>' +
            '<button class="_bs-ak-set" data-ak="3" type="button" style="--ak:' + AKSTUR[3].dot + '">Akstur 3</button>' +
          '</div>' +
        '</div>' +
        '<div class="_bs-sec _bs-urgent">' +
          '<h3><span>🚨 Áríðandi skilaboð</span></h3>' +
          '<textarea class="_bs-ta" id="_bs-urgent-ta" placeholder="Brýn skilaboð fyrir bílstjóra / skrifstofu (sést á forsíðu listans)…">' + esc(a.urgent || '') + '</textarea>' +
          '<button class="_bs-save" id="_bs-urgent-save" type="button">💾 Vista skilaboð</button>' +
        '</div>' +
        '<div class="_bs-sec">' +
          '<h3><span>📝 Minnispunktar</span><span style="font-weight:600;color:var(--ink3,#8891a0);font-size:12px;text-transform:none;letter-spacing:0">deilt með Leiðsögn</span></h3>' +
          '<textarea class="_bs-ta" id="_bs-note-ta" placeholder="Áminningar: hringja á undan, lykill hjá húsverði, bílastæði í bakgarði…">' + esc(a.notes || '') + '</textarea>' +
          '<button class="_bs-save" id="_bs-note-save" type="button">💾 Vista</button>' +
        '</div>' +
        '<div class="_bs-sec">' +
          '<h3><span>🧯 Tækjalisti</span><span class="_bs-prog" id="_bs-prog">…</span></h3>' +
          '<div id="_bs-units"><div class="_bs-empty" style="padding:18px">⏳ Sæki tæki…</div></div>' +
          '<button class="_bs-addunit" id="_bs-add-unit" type="button">➕ Bæta við tæki</button>' +
          '<div id="_bs-addunit-form"></div>' +
          '<button class="_bs-listlock" id="_bs-lock" type="button">✅ Staðfesta lista</button>' +
        '</div>' +
        '<div class="_bs-sec">' +
          '<h3><span>✍️ Athugasemdir í skýrslu</span></h3>' +
          '<textarea class="_bs-ta" id="_bs-skyrsla-ta" placeholder="Það sem á að koma fram í úttektarskýrslunni (ástand, ábendingar)…"></textarea>' +
          '<button class="_bs-save" id="_bs-skyrsla-save" type="button">💾 Vista í skýrslu</button>' +
        '</div>' +
      '</div>' +
      '<div class="_bs-bottom"><div class="inner" style="display:flex;gap:10px">' +
        '<button class="_bs-primary" id="_bs-add-route" style="background:var(--ink2,#404550);box-shadow:none;flex:1">➕ Á leið</button>' +
        '<button class="_bs-primary" id="_bs-done" style="flex:2">✓ Klára úttekt</button>' +
      '</div></div>';

    document.body.appendChild(sheet);
    requestAnimationFrame(() => sheet.classList.add('in'));
    const close = () => { sheet.classList.remove('in'); setTimeout(() => sheet.remove(), 240); };
    sheet.querySelector('._bs-back').addEventListener('click', close);
    sheet.querySelector('#_bs-nav').addEventListener('click', () => navTo(c, coord && coord.lat, coord && coord.lng));
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
    const reflectAk = () => { const cur = aksturOf(arsAll()[String(coId)]); akSetBtns.forEach(b => b.classList.toggle('on', +b.dataset.ak === cur)); };
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
        '<div class="_bs-af-row"><span style="align-self:center;color:var(--ink3,#8891a0);font-size:14px">Fjöldi</span><input class="_bs-af-in" id="_bs-af-count" type="number" inputmode="numeric" min="1" value="1" style="max-width:90px">' +
          '<button class="_bs-save" id="_bs-af-add" type="button" style="background:var(--grn,#1a7f4b);margin-top:0;flex:1">➕ Bæta við 🟢</button></div>';
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
      if (window.ArsWorkflow && ArsWorkflow.markInVinnsla) { await ArsWorkflow.markInVinnsla(coId); }
      else { await arsSave(coId, { field_inspected_year: curYear() }); }
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
    // disables ._bs-chip while the sheet carries ._bs-locked.
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
      s.textContent = '._bs-listlock{display:block;width:100%;margin-top:10px;padding:13px;border-radius:12px;border:1px solid #c7ccd3;background:#eef1f4;color:#2b313a;font-weight:800;font-size:15px;font-family:inherit;cursor:pointer}'
        + '._bs-listlock:active{transform:translateY(1px)}'
        + '._bs-sheet._bs-locked ._bs-chip{pointer-events:none;opacity:.5}'
        + '._bs-listlock.on{background:linear-gradient(180deg,#2f5d3f,#173524);color:#daffe8;border-color:#0e2417;box-shadow:inset 0 1px 0 rgba(255,255,255,.18),0 2px 6px rgba(0,0,0,.25)}'
        + '._bs-addunit{display:block;width:100%;margin-top:10px;padding:12px;border-radius:12px;border:1px dashed #9aa3af;background:#fff;color:#2b313a;font-weight:700;font-size:15px;font-family:inherit;cursor:pointer}'
        + '._bs-addunit:active{transform:translateY(1px)}'
        + '#_bs-addunit-form{display:flex;flex-direction:column;gap:8px;margin-top:8px}'
        + '#_bs-addunit-form:empty{display:none}'
        + '._bs-af-row{display:flex;gap:8px}'
        + '._bs-af-in{flex:1;min-width:0;padding:12px;border-radius:10px;border:1px solid #cbd2da;font-size:16px;font-family:inherit;background:#fff;color:#1b1f26}'
        + '._bs-akstur{display:flex;gap:6px;margin-top:6px}'
        + '._bs-akstur button{flex:1;padding:8px 4px;border-radius:9px;border:1.5px solid #d7dbe0;background:#fff;color:#5b6470;font-weight:700;font-size:12.5px;font-family:inherit;cursor:pointer;white-space:nowrap}'
        + '._bs-akstur button.on{border-color:var(--ak);color:#fff;background:var(--ak);box-shadow:0 1px 4px rgba(0,0,0,.18)}'
        + '._bs-ak-chip{flex:none;align-self:center;min-width:40px;height:40px;margin-right:6px;border-radius:11px;border:1.5px solid #d7dbe0;background:#f6f7f9;color:#7a828e;font-weight:800;font-size:14px;font-family:inherit;cursor:pointer}'
        + '._bs-ak-chip.on{border-color:var(--ak);background:var(--ak);color:#fff}'
        + '._bs-ak-row{display:flex;gap:6px;flex-wrap:wrap}'
        + '._bs-ak-set{flex:1;min-width:70px;padding:12px 6px;border-radius:11px;border:1.5px solid #d7dbe0;background:#fff;color:#3a414b;font-weight:700;font-size:14px;font-family:inherit;cursor:pointer}'
        + '._bs-ak-set.on{border-color:var(--ak,#1a7f4b);background:var(--ak,#1a7f4b);color:#fff;box-shadow:0 1px 4px rgba(0,0,0,.2)}';
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
      box.innerHTML = '<div class="_bs-err">Villa við að sækja tæki.<button class="_bs-save" style="background:var(--brand,#C93C1D)" type="button">↻ Reyna aftur</button></div>';
      box.querySelector('button').addEventListener('click', () => loadUnitsInto(sheet, c));
      return;
    }
    if (!units.length) { box.innerHTML = '<div class="_bs-empty" style="padding:18px">Engin skráð tæki á þessu fyrirtæki.</div>'; if (prog) prog.textContent = '0 tæki'; return; }
    const draw = () => {
      const done = units.filter(u => unitState(u) === 'yfirfarid').length;
      if (prog) prog.textContent = 'Yfirfarin: ' + done + '/' + units.length;
      box.innerHTML = units.map(u => {
        const m = STATE_META[unitState(u)];
        const sub = [u.size, u.location, u.serial].filter(Boolean).map(esc).join(' · ');
        return '<div class="_bs-unit"><div class="_bs-unit-main">' +
          '<div class="_bs-unit-t">' + esc(u.type || 'Tæki') + '</div>' + (sub ? '<div class="_bs-unit-s">' + sub + '</div>' : '') +
          '</div><button class="_bs-chip" data-id="' + u.id + '" type="button" style="background:' + m.bg + ';color:' + m.fg + ';border-color:' + m.bd + '">' + m.icon + ' ' + m.label + '</button></div>';
      }).join('');
      box.querySelectorAll('._bs-chip').forEach(btn => btn.addEventListener('click', async () => {
        const u = units.find(x => String(x.id) === String(btn.dataset.id));
        if (!u) return;
        const next = ROLL[unitState(u)]; const meta = STATE_META[next];
        btn.style.background = meta.bg; btn.style.color = meta.fg; btn.style.borderColor = meta.bd; btn.textContent = meta.icon + ' ' + meta.label;
        Object.assign(u, updateForState(next));
        try { await saveUnitState(btn.dataset.id, next); draw(); } catch (_) { toast('⚠ Vistun mistókst'); }
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
  function openFromHash() {
    if (!hashIsMine()) return;
    const deadline = Date.now() + 5000;
    (function tick() {
      if (_userTook || Date.now() > deadline) return;          // user took over / gave up
      try {
        const active = document.querySelector('.view.active');
        if (!active || active.id !== VIEW_ID) show();           // re-assert if a lander stole focus
      } catch (_) {}
      setTimeout(tick, 70);
    })();
  }

  function boot() {
    ensureView();
    injectSidebar();
    patchSwitchView();
    setTimeout(injectSidebar, 1400);
    setTimeout(injectSidebar, 3000);
    openFromHash();                               // deep-link on first load
    window.addEventListener('hashchange', openFromHash);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  window.Bilstjori = { show, render: show, renderList, version: 'v2' };
  console.log('[bilstjori v2] installed');
})();
/* === END BÍLSTJÓRI === */
