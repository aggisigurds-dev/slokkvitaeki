/* === LEIÐSÖGN v1 ===
 *
 * Dedicated GPS-navigation page. Replaces Þjónustutæki's map-functionality
 * (which was getting fragile and freezing because the old view-field tries
 * to do too many things — unit management + map + everything).
 *
 * THIS PAGE DOES ONE THING: route planning for drivers.
 *   1. Map with pins for all contract customers
 *   2. Click pin → popup with name, addr, inspection date, "Bæta á leið"
 *   3. Route panel below map lists added stops in order
 *   4. "Keyra núna" → opens Google Maps with waypoints (from current GPS)
 *
 * Unit management + reports + Tilboðsverð all live on the Customer Detail
 * Page (patch 158). The Leiðsögn page ONLY navigates — that's it.
 *
 * Built 2026-05-18 at user's request after Þjónustutæki freezing reports.
 */
(() => {
  if (window.__leidsognInstalled) return;
  window.__leidsognInstalled = true;

  const VIEW_ID = 'view-leidsogn';
  const NAV_KEY = 'leidsogn';
  const ROUTE_KEY = '_slokk_route';   // shared with navfix.js
  const GC_KEY    = '_slokk_gc';      // shared geocode cache
  const LS_FILTER = 'leidsogn_filter'; // all | overdue | this-month | done

  // ── State ───────────────────────────────────────────────────────────────
  let _map = null;
  let _markers = {};
  let _leafletLP = null;
  let _state = {
    filter: localStorage.getItem(LS_FILTER) || 'this-month'
  };
  function saveState() {
    localStorage.setItem(LS_FILTER, _state.filter);
  }

  // ── Helpers ─────────────────────────────────────────────────────────────
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

  function readGc() {
    try { return JSON.parse(localStorage.getItem(GC_KEY) || '{}'); } catch (_) { return {}; }
  }
  function readRoute() {
    try { return JSON.parse(localStorage.getItem(ROUTE_KEY) || '[]'); } catch (_) { return []; }
  }
  function saveRoute(r) {
    try { localStorage.setItem(ROUTE_KEY, JSON.stringify(r)); } catch (_) {}
  }

  // ── Leaflet loader (on demand, shared with patch 155) ───────────────────
  function ensureLeaflet() {
    if (window.L && window.L.map) return Promise.resolve();
    if (_leafletLP) return _leafletLP;
    _leafletLP = new Promise(resolve => {
      const css = document.createElement('link');
      css.rel = 'stylesheet';
      css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(css);
      const sc = document.createElement('script');
      sc.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      sc.onload = () => resolve();
      document.head.appendChild(sc);
    });
    return _leafletLP;
  }

  // ── Status for a contract customer ──────────────────────────────────────
  function statusFor(c, ars) {
    const today = new Date();
    const curYear = today.getFullYear();
    const curMonth = today.getMonth() + 1;
    const m = +((ars||{}).inspect_month) || 0;
    const lastYr = +((ars||{}).last_year_inspected) || 0;
    const isDone = lastYr === curYear;
    const isOverdue = !isDone && m > 0 && m < curMonth;
    const isDueNow = !isDone && m === curMonth;
    if (isDone)    return { key:'done',     color:'#1a7f4b', label:'Í lagi ' + curYear };
    if (isOverdue) return { key:'overdue',  color:'#dc2626', label:'Útrunnið (' + (MONTHS_IS[m-1] || '?') + ')' };
    if (isDueNow)  return { key:'duenow',   color:'#b45309', label:'Þessi mánuður' };
    if (m > 0)     return { key:'scheduled',color:'#475569', label:'Á dagskrá: ' + (MONTHS_IS[m-1] || '?') };
    return { key:'unknown', color:'#94a3b8', label:'Engin dagsetning' };
  }

  // ── Build the customer list for the map ─────────────────────────────────
  function getCustomers() {
    const cos = (window.Companies && Companies.list) || [];
    const arsMap = (window.AppSettings && window.AppSettings.path && window.AppSettings.path('arsskodun_customers')) || {};
    const bruMap = (window.AppSettings && window.AppSettings.path && window.AppSettings.path('brunakerfi_customers')) || {};
    const gc = readGc();
    return cos.map(c => {
      const ars = arsMap[String(c.id)];
      const bru = bruMap[String(c.id)];
      const hasContract = (ars && ars.equipment) || !!bru;
      if (!hasContract) return null;
      const coord = gc[c.heimilisfang] || gc[c.nafn];
      if (!coord) return null;
      return { co: c, ars: ars || {}, bru: bru || {}, coord, status: statusFor(c, ars) };
    }).filter(Boolean);
  }

  function applyFilter(list) {
    if (_state.filter === 'all') return list;
    if (_state.filter === 'overdue') return list.filter(x => x.status.key === 'overdue');
    if (_state.filter === 'this-month') return list.filter(x => x.status.key === 'duenow' || x.status.key === 'overdue');
    if (_state.filter === 'done') return list.filter(x => x.status.key === 'done');
    if (_state.filter === 'scheduled') return list.filter(x => x.status.key === 'scheduled');
    return list;
  }

  // ── Map & pins ──────────────────────────────────────────────────────────
  function makeIcon(color) {
    return L.divIcon({
      className: '_lds-pin',
      html: '<div style="background:' + color + ';width:16px;height:16px;border-radius:50%;border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,0.4)"></div>',
      iconSize: [20, 20],
      iconAnchor: [10, 10]
    });
  }

  function makePopupHtml(item) {
    const c = item.co;
    const a = item.ars;
    const monthLabel = a.inspect_month ? MONTHS_IS[(+a.inspect_month) - 1] : '—';
    const inRoute = readRoute().some(r => String(r.id) === String(c.id));
    return (
      '<div style="font:13px system-ui,sans-serif;line-height:1.4;min-width:220px">' +
        '<div style="font-weight:700;font-size:14px;color:#0f172a">' + esc(c.nafn || '—') + '</div>' +
        (c.kennitala ? '<div style="font-size:11px;color:#94a3b8;font-family:monospace">kt. ' + esc(fmtKt(c.kennitala)) + '</div>' : '') +
        (c.heimilisfang ? '<div style="margin-top:5px;color:#475569">📍 ' + esc(c.heimilisfang) + '</div>' : '') +
        '<div style="margin-top:5px;color:' + item.status.color + ';font-weight:600">' + esc(item.status.label) + '</div>' +
        '<div style="font-size:11px;color:#64748b;margin-top:2px">Skoðunarmánuður: ' + esc(monthLabel) + '</div>' +
        '<div style="display:flex;gap:6px;margin-top:10px">' +
          (inRoute
            ? '<button class="_lds-route-remove" data-co-id="' + c.id + '" type="button" style="flex:1;padding:6px 10px;background:#fee2e2;color:#b91c1c;border:1px solid #fecaca;border-radius:6px;cursor:pointer;font:inherit;font-size:11.5px;font-weight:700">✕ Fjarlægja af leið</button>'
            : '<button class="_lds-route-add" data-co-id="' + c.id + '" data-lat="' + item.coord.lat + '" data-lng="' + item.coord.lng + '" type="button" style="flex:1;padding:6px 10px;background:#16a34a;color:#fff;border:1px solid #15803d;border-radius:6px;cursor:pointer;font:inherit;font-size:11.5px;font-weight:700">➕ Bæta á leið</button>') +
          '<button class="_lds-open-co" data-co-id="' + c.id + '" type="button" style="padding:6px 10px;background:#fff;color:#0f172a;border:1px solid #cbd5e1;border-radius:6px;cursor:pointer;font:inherit;font-size:11.5px;font-weight:600">🏢 Opna</button>' +
        '</div>' +
      '</div>'
    );
  }

  function clearMarkers() {
    Object.values(_markers).forEach(m => { try { _map.removeLayer(m); } catch (_) {} });
    _markers = {};
  }

  function renderPins() {
    if (!_map) return;
    clearMarkers();
    const list = applyFilter(getCustomers());
    list.forEach(item => {
      const m = L.marker([item.coord.lat, item.coord.lng], { icon: makeIcon(item.status.color) }).addTo(_map);
      m.bindPopup(() => makePopupHtml(item));
      _markers[item.co.id] = m;
    });
    if (list.length > 0) {
      const pts = list.map(x => [x.coord.lat, x.coord.lng]);
      try { _map.fitBounds(L.latLngBounds(pts).pad(0.15)); } catch (_) {}
    }
    // Update counts in chip row
    updateChipCounts();
  }

  function updateChipCounts() {
    const all = getCustomers();
    const cnt = { all: all.length, overdue: 0, 'this-month': 0, done: 0, scheduled: 0 };
    all.forEach(x => {
      if (x.status.key === 'overdue') { cnt.overdue++; cnt['this-month']++; }
      else if (x.status.key === 'duenow') cnt['this-month']++;
      else if (x.status.key === 'done') cnt.done++;
      else if (x.status.key === 'scheduled') cnt.scheduled++;
    });
    Object.keys(cnt).forEach(k => {
      const el = document.querySelector('._lds-chip[data-filter="' + k + '"] ._lds-count');
      if (el) el.textContent = cnt[k];
    });
  }

  // ── Route panel ─────────────────────────────────────────────────────────
  function addToRoute(coId, name, addr, lat, lng) {
    const r = readRoute();
    if (r.find(x => String(x.id) === String(coId))) return;
    r.push({ id: coId, name, addr, lat, lng });
    saveRoute(r);
    renderRoutePanel();
    // Re-render pin's popup
    const m = _markers[coId];
    if (m) m.closePopup();
  }
  function removeFromRoute(coId) {
    const r = readRoute().filter(x => String(x.id) !== String(coId));
    saveRoute(r);
    renderRoutePanel();
    const m = _markers[coId];
    if (m) m.closePopup();
  }
  function moveRouteStop(coId, dir) {
    const r = readRoute();
    const i = r.findIndex(x => String(x.id) === String(coId));
    if (i < 0) return;
    const j = i + (dir === 'up' ? -1 : 1);
    if (j < 0 || j >= r.length) return;
    [r[i], r[j]] = [r[j], r[i]];
    saveRoute(r);
    renderRoutePanel();
  }
  function clearRoute() {
    saveRoute([]);
    renderRoutePanel();
  }
  function launchNav() {
    const r = readRoute();
    if (!r.length) return;
    let url;
    if (r.length === 1) {
      url = 'https://www.google.com/maps/dir/?api=1&destination=' + r[0].lat + ',' + r[0].lng + '&travelmode=driving';
    } else {
      const dest = r[r.length - 1];
      const waypoints = r.slice(0, -1).map(s => s.lat + ',' + s.lng).join('|');
      url = 'https://www.google.com/maps/dir/?api=1&destination=' + dest.lat + ',' + dest.lng +
            '&waypoints=' + encodeURIComponent(waypoints) + '&travelmode=driving';
    }
    window.open(url, '_blank');
  }

  function renderRoutePanel() {
    const panel = document.getElementById('_lds-route-panel');
    if (!panel) return;
    const r = readRoute();
    if (!r.length) {
      panel.innerHTML =
        '<div style="padding:12px;text-align:center;color:#94a3b8;font-size:12.5px">' +
          'Smelltu á pinn og bætt við leið til að byrja.' +
        '</div>';
      return;
    }
    panel.innerHTML =
      '<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 14px;border-bottom:1px solid #e2e8f0;background:#f8fafc">' +
        '<div style="font-weight:700;color:#0f172a;font-size:13px">📋 Áætlaðar heimsóknir <span style="color:#94a3b8;font-weight:500">(' + r.length + ')</span></div>' +
        '<div style="display:flex;gap:6px">' +
          '<button id="_lds-clear" type="button" style="padding:5px 10px;background:#fff;color:#dc2626;border:1px solid #fecaca;border-radius:6px;cursor:pointer;font:inherit;font-size:11px;font-weight:600">🗑 Hreinsa</button>' +
          '<button id="_lds-drive" type="button" style="padding:5px 14px;background:#16a34a;color:#fff;border:1px solid #15803d;border-radius:6px;cursor:pointer;font:inherit;font-size:12px;font-weight:700">🚗 Keyra núna</button>' +
        '</div>' +
      '</div>' +
      '<div style="max-height:200px;overflow-y:auto">' +
        r.map((s, i) => (
          '<div style="display:flex;align-items:center;gap:8px;padding:8px 14px;border-bottom:1px solid #f1f5f9;font-size:12.5px">' +
            '<span style="background:#0f172a;color:#fff;width:22px;height:22px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-weight:700;font-size:11px;flex-shrink:0">' + (i+1) + '</span>' +
            '<div style="flex:1;min-width:0">' +
              '<div style="font-weight:600;color:#0f172a;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(s.name) + '</div>' +
              '<div style="font-size:10.5px;color:#94a3b8;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(s.addr || '') + '</div>' +
            '</div>' +
            '<div style="display:flex;gap:3px;flex-shrink:0">' +
              (i > 0 ? '<button class="_lds-move" data-co-id="' + s.id + '" data-dir="up" type="button" title="Færa upp" style="padding:2px 6px;background:#fff;border:1px solid #cbd5e1;border-radius:4px;cursor:pointer;font:inherit;font-size:11px">↑</button>' : '<span style="width:24px"></span>') +
              (i < r.length-1 ? '<button class="_lds-move" data-co-id="' + s.id + '" data-dir="down" type="button" title="Færa niður" style="padding:2px 6px;background:#fff;border:1px solid #cbd5e1;border-radius:4px;cursor:pointer;font:inherit;font-size:11px">↓</button>' : '<span style="width:24px"></span>') +
              '<button class="_lds-rm" data-co-id="' + s.id + '" type="button" title="Fjarlægja" style="padding:2px 6px;background:#fff;color:#dc2626;border:1px solid #fecaca;border-radius:4px;cursor:pointer;font:inherit;font-size:11px;font-weight:700">✕</button>' +
            '</div>' +
          '</div>'
        )).join('') +
      '</div>';

    panel.querySelector('#_lds-drive')?.addEventListener('click', launchNav);
    panel.querySelector('#_lds-clear')?.addEventListener('click', () => { if (confirm('Hreinsa alla leið?')) clearRoute(); });
    panel.querySelectorAll('._lds-move').forEach(b => b.addEventListener('click', () => moveRouteStop(b.dataset.coId, b.dataset.dir)));
    panel.querySelectorAll('._lds-rm').forEach(b => b.addEventListener('click', () => removeFromRoute(b.dataset.coId)));
  }

  // ── Popup click delegate (route add/remove + open detail) ───────────────
  function hookPopupDelegate() {
    if (hookPopupDelegate._done) return;
    hookPopupDelegate._done = true;
    document.addEventListener('click', e => {
      const addBtn = e.target.closest && e.target.closest('._lds-route-add');
      if (addBtn) {
        e.preventDefault(); e.stopPropagation();
        const coId = addBtn.dataset.coId;
        const lat = parseFloat(addBtn.dataset.lat);
        const lng = parseFloat(addBtn.dataset.lng);
        const co = (window.Companies && Companies.list || []).find(c => String(c.id) === String(coId));
        if (co) addToRoute(coId, co.nafn, co.heimilisfang || '', lat, lng);
        return;
      }
      const rmBtn = e.target.closest && e.target.closest('._lds-route-remove');
      if (rmBtn) {
        e.preventDefault(); e.stopPropagation();
        removeFromRoute(rmBtn.dataset.coId);
        return;
      }
      const openBtn = e.target.closest && e.target.closest('._lds-open-co');
      if (openBtn) {
        e.preventDefault(); e.stopPropagation();
        const id = +openBtn.dataset.coId;
        if (window.VidskDetail && typeof window.VidskDetail.show === 'function') {
          window.VidskDetail.show(id);
        } else if (window._openCompanySafe) {
          window._openCompanySafe(id);
        }
      }
    });
  }

  // ── Sidebar ─────────────────────────────────────────────────────────────
  function injectSidebar() {
    const nav = document.querySelector('nav.view-nav, .view-nav');
    if (!nav) { setTimeout(injectSidebar, 500); return; }
    if (nav.querySelector('[data-view="' + NAV_KEY + '"]')) return;
    const allBtns = Array.from(nav.querySelectorAll('.vnav-btn'));
    // Insert near "Þjónustutæki" (field) if found, else near top
    const fieldBtn = allBtns.find(b => b.getAttribute('data-view') === 'field');
    const sampleClass = (fieldBtn && fieldBtn.className) || 'vnav-btn';
    const btn = document.createElement('button');
    btn.className = sampleClass;
    btn.setAttribute('data-view', NAV_KEY);
    btn.innerHTML = '<span style="display:inline-flex;align-items:center;gap:8px">' +
                    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18">' +
                      '<polygon points="3 11 22 2 13 21 11 13 3 11"/>' +
                    '</svg>' +
                    '<span>Leiðsögn</span></span>';
    btn.addEventListener('click', e => {
      e.preventDefault(); e.stopPropagation();
      if (window.App && App.switchView) App.switchView(NAV_KEY);
      else show();
    });
    if (fieldBtn && fieldBtn.parentNode) {
      fieldBtn.parentNode.insertBefore(btn, fieldBtn);
    } else {
      nav.insertBefore(btn, nav.firstChild);
    }
  }

  // ── View container ──────────────────────────────────────────────────────
  function ensureView() {
    if (document.getElementById(VIEW_ID)) return;
    const sample = document.getElementById('view-arsskodun') ||
                   document.getElementById('view-field') ||
                   document.getElementById('view-counter');
    if (!sample || !sample.parentElement) return;
    const v = document.createElement('div');
    v.id = VIEW_ID;
    v.className = sample.className.replace(/\bactive\b/g, '').trim();
    v.innerHTML = '<main id="_lds-main" class="main-panel"></main>';
    sample.parentElement.appendChild(v);
  }

  // ── Hook App.switchView ────────────────────────────────────────────────
  function patchSwitchView() {
    if (!window.App || window.App._leidsognPatched) return;
    const orig = window.App.switchView;
    window.App.switchView = function (view) {
      if (view === NAV_KEY) {
        ensureView();
        document.querySelectorAll('[id^="view-"]').forEach(v => {
          v.style.display = 'none'; v.classList.remove('active');
        });
        const v = document.getElementById(VIEW_ID);
        if (v) { v.style.display = 'block'; v.classList.add('active'); }
        document.querySelectorAll('.vnav-btn').forEach(b => {
          b.classList.toggle('active', b.getAttribute('data-view') === NAV_KEY);
        });
        try { localStorage.setItem('lastView', NAV_KEY); } catch (_) {}
        show();
        return;
      }
      if (orig) return orig.apply(this, arguments);
    };
    window.App._leidsognPatched = true;
  }

  // ── Show ────────────────────────────────────────────────────────────────
  async function show() {
    ensureView();
    const main = document.getElementById('_lds-main');
    if (!main) { setTimeout(show, 200); return; }
    if (!main.querySelector('#_lds-mapcanvas')) {
      main.innerHTML =
        '<div style="max-width:1200px;margin:0 auto;padding:18px 20px 40px">' +
          '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:14px;gap:16px;flex-wrap:wrap">' +
            '<div>' +
              '<h1 style="margin:0 0 4px 0;font-size:23px;font-weight:800;color:#0f172a;display:flex;align-items:center;gap:9px">' +
                '<span>🗺️</span><span>Leiðsögn</span>' +
              '</h1>' +
              '<div style="font-size:12.5px;color:#64748b">Smelltu á pinn → bætt á leið → keyra. Engin önnur trufla.</div>' +
            '</div>' +
          '</div>' +
          // Filter chips
          '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px">' +
            [
              ['this-month',  'Þessi mánuður + útrunnið', '#b45309'],
              ['overdue',     'Aðeins útrunnið',          '#dc2626'],
              ['scheduled',   'Á dagskrá síðar',          '#475569'],
              ['done',        'Búið ' + new Date().getFullYear(), '#1a7f4b'],
              ['all',         'Allir',                    '#0f172a']
            ].map(([k, lbl, color]) => {
              const sel = _state.filter === k;
              return '<button data-filter="' + k + '" class="_lds-chip" type="button" style="padding:6px 11px;border:1px solid ' + (sel?'#0f172a':'#cbd5e1') + ';background:' + (sel?'#0f172a':'#fff') + ';color:' + (sel?'#fff':'#475569') + ';border-radius:99px;cursor:pointer;font:inherit;font-size:12px;font-weight:600;display:flex;align-items:center;gap:6px"><span style="width:10px;height:10px;border-radius:50%;background:' + color + ';display:inline-block"></span>' + esc(lbl) + ' <span class="_lds-count" style="opacity:.7;font-weight:500">·</span></button>';
            }).join('') +
          '</div>' +
          '<div id="_lds-mapcanvas" style="width:100%;height:480px;background:#f1f5f9;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden"></div>' +
          '<div id="_lds-route-panel" style="margin-top:12px;background:#fff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden"></div>' +
        '</div>';
      // Wire filter chips
      main.querySelectorAll('._lds-chip').forEach(b => b.addEventListener('click', () => {
        _state.filter = b.dataset.filter;
        saveState();
        show(); // re-render
      }));
    }
    // Build the Leaflet map (lazy)
    const canvas = document.getElementById('_lds-mapcanvas');
    if (canvas && !_map) {
      await ensureLeaflet();
      _map = L.map(canvas).setView([64.1355, -21.8954], 11);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap',
        maxZoom: 19
      }).addTo(_map);
    } else if (_map && !document.body.contains(_map.getContainer())) {
      // Stale map from a previous render (view re-mounted)
      try { _map.remove(); } catch (_) {}
      _map = null;
      _markers = {};
      await ensureLeaflet();
      _map = L.map(canvas).setView([64.1355, -21.8954], 11);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap',
        maxZoom: 19
      }).addTo(_map);
    }
    setTimeout(() => {
      try { _map && _map.invalidateSize(); } catch (_) {}
      renderPins();
      renderRoutePanel();
    }, 100);
    hookPopupDelegate();
  }

  // ── Boot ────────────────────────────────────────────────────────────────
  function boot() {
    injectSidebar();
    ensureView();
    patchSwitchView();
    setTimeout(injectSidebar, 1200);
    setTimeout(injectSidebar, 2500);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  // Expose
  window.Leidsogn = {
    show, addToRoute, removeFromRoute, clearRoute, launchNav,
    getCustomers, version: 'v1'
  };
  console.log('[leidsogn v1] installed');
})();
/* === END LEIÐSÖGN === */
