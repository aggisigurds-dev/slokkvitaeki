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
    return (ars && ars.equipment) || !!bru ||
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
                 priority: +((a || {}).priority) > 0, urgent: (a && a.urgent) ? String(a.urgent).trim() : '' });
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

  let _seg = 'today';   // 'today' | 'all'
  let _search = '';
  const DUE = { overdue:0, duenow:1, scheduled:2, in_progress:3, done:4, unknown:5 };
  function currentList() {
    if (!(window.Companies && Companies.list)) return { ready:false, list:[] };
    let list = buildList();
    if (_seg === 'today') list = list.filter(x => x.status.key === 'overdue' || x.status.key === 'duenow' || x.priority);
    const q = _search.trim().toLowerCase();
    if (q) list = list.filter(x =>
      (x.co.nafn || '').toLowerCase().includes(q) ||
      (x.co.heimilisfang || '').toLowerCase().includes(q) ||
      String(x.co.kennitala || '').replace(/\D/g,'').includes(q.replace(/\D/g,'')));
    list.sort((a, b) =>
      (a.priority === b.priority ? 0 : (a.priority ? -1 : 1)) ||
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

  // ── view container + styles ──────────────────────────────────────────────
  function ensureView() {
    if (document.getElementById(VIEW_ID)) return;
    const sample = document.getElementById('view-leidsogn') ||
                   document.getElementById('view-arsskodun') ||
                   document.getElementById('view-counter');
    if (!sample || !sample.parentElement) return;
    const v = document.createElement('div');
    v.id = VIEW_ID;
    v.className = (sample.className || 'view').replace(/\bactive\b/g, '').trim();
    v.innerHTML = '<div id="_bs-root" class="_bs-root"></div>';
    sample.parentElement.appendChild(v);
    injectStyles();
  }

  function injectStyles() {
    if (document.getElementById('_bs-styles')) return;
    const s = document.createElement('style');
    s.id = '_bs-styles';
    s.textContent = [
      // full-screen overlay — covers the sidebar + all app chrome
      '#' + VIEW_ID + '{position:fixed!important;inset:0!important;z-index:200;background:var(--bg,#f5f5f7);overflow-y:auto;-webkit-overflow-scrolling:touch}',
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
      '._bs-card-main{flex:1;min-width:0}',
      '._bs-card-name{font-weight:600;font-size:16px;line-height:1.3;color:var(--ink1,#0f1117);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '._bs-card-sub{font-size:13.5px;color:var(--ink3,#8891a0);margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '._bs-card-meta{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:6px;font-size:12.5px;font-weight:600}',
      '._bs-card-extra{display:block;margin-top:5px;font-size:12px;color:var(--ink3,#8891a0);font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '._bs-badge{font-size:11.5px;font-weight:700;padding:2px 9px;border-radius:999px;background:var(--red-bg,#fff0ed);color:var(--red,#C93C1D);border:1px solid var(--red-bd,#fca5a5)}',
      '._bs-chev{font-size:23px;color:var(--ink4,#bcc3cc);flex:none;line-height:1}',
      '._bs-empty{padding:42px 24px;text-align:center;color:var(--ink3,#8891a0);font-size:15px}',
      '._bs-err{margin:12px 14px;padding:14px;border-radius:12px;background:var(--red-bg,#fff0ed);border:1px solid var(--red-bd,#fca5a5);color:var(--brand-dk,#a83018);font-size:14px;display:flex;justify-content:space-between;align-items:center;gap:10px}',
      '._bs-bottom{position:fixed;left:0;right:0;bottom:0;z-index:210;background:linear-gradient(to top,var(--bg,#f5f5f7) 64%,rgba(245,245,247,0));padding:13px 14px calc(13px + env(safe-area-inset-bottom));display:flex;justify-content:center;pointer-events:none}',
      '._bs-bottom .inner{width:100%;max-width:692px;pointer-events:auto}',
      '._bs-primary{width:100%;box-sizing:border-box;min-height:54px;font:inherit;font-size:16.5px;font-weight:700;letter-spacing:-.01em;border:none;border-radius:var(--radius-lg,14px);background:var(--brand,#C93C1D);color:#fff;cursor:pointer;box-shadow:var(--shadow-md,0 4px 12px rgba(0,0,0,.16))}',
      '._bs-primary:active{background:var(--brand-dk,#a83018)}',
      '._bs-primary[disabled]{background:var(--ink4,#bcc3cc);box-shadow:none;cursor:default}',
      // company sheet
      '._bs-sheet{position:fixed;inset:0;z-index:300;background:var(--bg,#f5f5f7);display:flex;flex-direction:column;transform:translateX(100%);transition:transform .24s cubic-bezier(.32,.72,0,1);overflow:hidden}',
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
          '<button id="_bs-exit" class="_bs-iconbtn" type="button" title="Til baka í forritið / vefsíðu">✕</button></div>' +
        '<div id="_bs-mapcanvas" class="_bs-map"></div>' +
        '<div class="_bs-controls">' +
          '<input id="_bs-q" class="_bs-search" type="search" inputmode="search" placeholder="Leita að fyrirtæki, heimilisfangi, kt…">' +
          '<div class="_bs-seg">' +
            '<button data-seg="today" type="button">📋 Dagsins verk</button>' +
            '<button data-seg="all" type="button">🏢 Allir í þjónustu</button>' +
          '</div>' +
          '<div class="_bs-hint">🔗 Afritaðu hlekkinn og sendu á bílstjóra · ⛶ opnar í fullum skjá · eða „Bæta á heimaskjá" fyrir app-ham.</div>' +
        '</div>' +
        '<div id="_bs-list" class="_bs-list"></div>' +
        '<div class="_bs-bottom"><div class="inner"><button id="_bs-drive" class="_bs-primary" type="button">🚗 Keyra leið dagsins</button></div></div>';

      root.querySelector('#_bs-exit').addEventListener('click', () => {
        if (window.App && App.switchView) App.switchView('leidsogn');
      });
      root.querySelector('#_bs-full').addEventListener('click', toggleFullscreen);
      root.querySelector('#_bs-share').addEventListener('click', () => {
        const url = location.origin + '/#' + NAV_KEY;
        copyText(url).then(ok => toast(ok ? '✓ Hlekkur afritaður — sendu á bílstjóra' : url));
      });
      const qEl = root.querySelector('#_bs-q');
      qEl.addEventListener('input', e => { _search = e.target.value || ''; renderList(); renderPins(); });
      root.querySelectorAll('._bs-seg button').forEach(b => b.addEventListener('click', () => {
        _seg = b.dataset.seg; renderList(); renderPins();
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
    const qEl = document.getElementById('_bs-q');
    if (qEl && qEl.value !== _search) qEl.value = _search;

    const { ready, list } = currentList();
    if (!ready) { box.innerHTML = '<div class="_bs-empty">⏳ Sæki gögn…</div>'; return; }
    box.innerHTML = list.length
      ? list.map(cardHtml).join('')
      : '<div class="_bs-empty">' + (_seg === 'today' ? '✅ Ekkert áríðandi eftir í dag.' : 'Engin fyrirtæki fundust.') + '</div>';
    box.querySelectorAll('._bs-card').forEach(card => card.addEventListener('click', () => openCompany(+card.dataset.id)));

    const drive = document.getElementById('_bs-drive');
    if (drive) {
      const n = list.filter(x => x.coord && (x.status.key==='overdue' || x.status.key==='duenow' || x.priority)).length;
      drive.disabled = !n;
      drive.textContent = '🚗 Keyra leið dagsins' + (n ? ' (' + n + ')' : '');
    }
  }

  function cardHtml(x) {
    const c = x.co;
    const m = +((x.ars || {}).inspect_month) || 0;
    const monthName = (m >= 1 && m <= 12) ? MONTHS_IS[m - 1] : '';
    const insYear = yearOf(x.ars);
    const nUnits = unitCount(x);
    const extra = '🧯 ' + nUnits + ' tæki'
      + (monthName ? ' · 📅 ' + monthName : '')
      + ' · ' + (insYear ? 'síðast ' + insYear : 'óskoðað');
    return (
      '<button class="_bs-card" type="button" data-id="' + c.id + '">' +
        '<span class="_bs-dot" style="background:' + x.status.color + '"></span>' +
        '<span class="_bs-card-main">' +
          '<span class="_bs-card-name">' + (x.priority ? '🚩 ' : '') + esc(c.nafn || '—') + '</span>' +
          '<span class="_bs-card-sub">' + (c.heimilisfang ? '📍 ' + esc(c.heimilisfang) : '<span style="color:var(--brand,#C93C1D)">⚠ Ekkert heimilisfang</span>') + '</span>' +
          '<span class="_bs-card-meta">' +
            '<span style="color:' + x.status.color + '">' + esc(x.status.label) + '</span>' +
            (x.urgent ? '<span class="_bs-badge">🚨 Skilaboð</span>' : '') +
          '</span>' +
          '<span class="_bs-card-extra">' + esc(extra) + '</span>' +
        '</span>' +
        '<span class="_bs-chev">›</span>' +
      '</button>'
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
        '</div>' +
      '</div>' +
      '<div class="_bs-bottom"><div class="inner" style="display:flex;gap:10px">' +
        '<button class="_bs-primary" id="_bs-add-route" style="background:var(--ink2,#404550);box-shadow:none;flex:1">➕ Á leið</button>' +
        '<button class="_bs-primary" id="_bs-done" style="flex:2">✅ Tekið út</button>' +
      '</div></div>';

    document.body.appendChild(sheet);
    requestAnimationFrame(() => sheet.classList.add('in'));
    const close = () => { sheet.classList.remove('in'); setTimeout(() => sheet.remove(), 240); };
    sheet.querySelector('._bs-back').addEventListener('click', close);
    sheet.querySelector('#_bs-nav').addEventListener('click', () => navTo(c, coord && coord.lat, coord && coord.lng));
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
    sheet.querySelector('#_bs-done').addEventListener('click', async e => {
      e.target.textContent = '… vista'; e.target.disabled = true;
      const ok = await arsSave(coId, { field_inspected_year: curYear() });
      toast(ok ? '✅ Skráð sem tekið út' : '⚠ Villa við vistun');
      try { if (window.Leidsogn && Leidsogn.refresh) Leidsogn.refresh(); } catch (_) {}
      close(); renderList(); renderPins();
    });
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
      const r = orig ? orig.apply(this, arguments) : undefined;
      // leaving the driver app: make sure the overlay is hidden so the app shows
      try { const v = document.getElementById(VIEW_ID); if (v) { v.style.display = 'none'; v.classList.remove('active'); } } catch (_) {}
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
