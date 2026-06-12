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
  // 2026-06-12: status-chips skipt út fyrir ÁR-chips (Allt / 2024 / 2025 /
  // 2026 = hvenær síðast var skoðað) og mánuðirnir urðu FJÖLVAL — hægt að
  // haka við marga mánuði í einu. Gömlu lyklarnir (leidsogn_filter /
  // leidsogn_month) eru ekki lesnir lengur.
  const LS_YEAR   = 'leidsogn_year';   // 'all' | '2024' | '2025' | '2026'
  const LS_MONTHS = 'leidsogn_months'; // csv: "2,3,5" — tómt = allir

  // ── State ───────────────────────────────────────────────────────────────
  let _map = null;
  let _markers = {};
  let _leafletLP = null;
  let _state = {
    year: localStorage.getItem(LS_YEAR) || 'all',
    months: String(localStorage.getItem(LS_MONTHS) || '')
      .split(',').map(n => +n).filter(n => n >= 1 && n <= 12)
  };
  function saveState() {
    localStorage.setItem(LS_YEAR, _state.year);
    localStorage.setItem(LS_MONTHS, _state.months.join(','));
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
  const MONTHS_IS_SHORT = ['Jan','Feb','Mar','Apr','Maí','Jún','Júl','Ágú','Sep','Okt','Nóv','Des'];

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
    const fieldYr = +((ars||{}).field_inspected_year) || 0;
    const isDone = lastYr === curYear;
    // 2026-05-25: "Tekið út" intermediate state — physical inspection done
    // but paperwork pending. Shows yellow on the map instead of red.
    const isFieldOnly = !isDone && fieldYr === curYear;
    const isOverdue = !isDone && !isFieldOnly && m > 0 && m < curMonth;
    const isDueNow = !isDone && !isFieldOnly && m === curMonth;
    if (isDone)        return { key:'done',        color:'#1a7f4b', label:'Í lagi ' + curYear };
    if (isFieldOnly)   return { key:'in_progress', color:'#f59e0b', label:'Tekið út — skjöl eftir' };
    if (isOverdue)     return { key:'overdue',     color:'#dc2626', label:'Útrunnið (' + (MONTHS_IS[m-1] || '?') + ')' };
    if (isDueNow)      return { key:'duenow',      color:'#b45309', label:'Þessi mánuður' };
    if (m > 0)         return { key:'scheduled',   color:'#475569', label:'Á dagskrá: ' + (MONTHS_IS[m-1] || '?') };
    return { key:'unknown', color:'#94a3b8', label:'Engin dagsetning' };
  }

  // ── Resolve a geocode for a fyrirtæki, trying a few key variants ────────
  // 2026-05-25: the server-side geocode_cache uses short keys like
  // "Ármúla 23" but DB addresses include postcode + city ("Ármúla 23, 108
  // Reykjavík"). Without these fallbacks ~150 pins fail to drop.
  function lookupCoord(gc, c) {
    if (!gc || !c) return null;
    // 2026-06-02: a hand-placed exact coordinate (keyed by company id) always
    // wins — it survives address edits and never gets second-guessed by the
    // address-variant fallbacks below.
    if (gc['__co__:' + c.id]) return gc['__co__:' + c.id];
    const addr = c.heimilisfang || '';
    const nafn = c.nafn || '';
    if (gc[addr]) return gc[addr];
    if (gc[nafn]) return gc[nafn];
    // Strip ", NNN City" tail
    const stripped = addr.replace(/,?\s*\d{3}\s+.+$/, '').trim();
    if (stripped && gc[stripped]) return gc[stripped];
    // First "Street Number" chunk only
    const m = addr.match(/^([A-Za-zÁÉÍÓÚÝÆÖÞÐáéíóúýæöþð.]+\s+\d{1,3}[a-zA-Z]?)/);
    if (m && gc[m[1]]) return gc[m[1]];
    // Just the street word with first number (handles "Skipholti 50b, 105...")
    if (m) {
      const street = m[1].replace(/\s+\d.*$/, '').trim();
      for (const k in gc) {
        if (k.toLowerCase().startsWith(street.toLowerCase() + ' ') && gc[k]) {
          // Only return if the number prefix matches too
          const num = (m[1].match(/\d+/) || [''])[0];
          const kNum = (k.match(/\d+/) || [''])[0];
          if (num && num === kNum) return gc[k];
        }
      }
    }
    return null;
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
      // In service via manual snapshot OR real active tæki in uttaeki
      // (patch 177 — matches the Fyrirtæki í Þjónustu list).
      const hasContract = (ars && ars.equipment) || !!bru ||
        (window.InServiceClients && window.InServiceClients.has(c.nafn));
      if (!hasContract) return null;
      const coord = lookupCoord(gc, c);
      if (!coord) return null;
      return { co: c, ars: ars || {}, bru: bru || {}, coord, status: statusFor(c, ars) };
    }).filter(Boolean);
  }

  // Ár-sía: 'all' sýnir allt; annars kúnnar sem voru síðast skoðaðir
  // (eða teknir út á staðnum) viðkomandi ár. Pinnaliturinn sýnir áfram
  // stöðuna (útrunnið/þessi mánuður/búið …).
  function yearOf(ars) {
    const a = ars || {};
    return Math.max(+a.last_year_inspected || 0, +a.field_inspected_year || 0);
  }
  function applyYear(list) {
    if (!_state.year || _state.year === 'all') return list;
    const y = +_state.year;
    return list.filter(x => yearOf(x.ars) === y);
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
        // Priority mark — same 4-state cycle button as Fyrirtæki í Þjónustu,
        // shared store (patch 175) so it syncs across both views.
        '<div style="display:flex;align-items:center;gap:7px;margin-top:9px">' +
          ((window.Priority && window.Priority.btnHtml(c.id, 20)) || '') +
          '<span style="font-size:11px;color:#64748b">Forgangur — smelltu til að breyta</span>' +
        '</div>' +
        '<div style="display:flex;gap:6px;margin-top:10px">' +
          (inRoute
            ? '<button class="_lds-route-remove" data-co-id="' + c.id + '" type="button" style="flex:1;padding:6px 10px;background:#fee2e2;color:#b91c1c;border:1px solid #fecaca;border-radius:6px;cursor:pointer;font:inherit;font-size:11.5px;font-weight:700">✕ Fjarlægja af leið</button>'
            : '<button class="_lds-route-add" data-co-id="' + c.id + '" data-lat="' + item.coord.lat + '" data-lng="' + item.coord.lng + '" type="button" style="flex:1;padding:6px 10px;background:#16a34a;color:#fff;border:1px solid #15803d;border-radius:6px;cursor:pointer;font:inherit;font-size:11.5px;font-weight:700">➕ Bæta á leið</button>') +
          '<button class="_lds-open-co" data-co-id="' + c.id + '" type="button" style="padding:6px 10px;background:#fff;color:#0f172a;border:1px solid #cbd5e1;border-radius:6px;cursor:pointer;font:inherit;font-size:11.5px;font-weight:600">🏢 Opna</button>' +
        '</div>' +
        '<button class="_lds-setloc" data-co-id="' + c.id + '" type="button" title="Setja nákvæm hnit (líma úr Google Maps eða draga pinna)" style="width:100%;margin-top:6px;padding:5px 10px;background:#fff;color:#92400e;border:1px solid #fde68a;border-radius:6px;cursor:pointer;font:inherit;font-size:11px;font-weight:600">📍 Laga nákvæma staðsetningu</button>' +
      '</div>'
    );
  }

  function clearMarkers() {
    Object.values(_markers).forEach(m => { try { _map.removeLayer(m); } catch (_) {} });
    _markers = {};
  }

  // ── Due-now / overdue list (below the map) ──────────────────────────────
  // 2026-05-19: driver wanted a tabular view of what needs work this month
  // sitting directly below the map. Map = where, list = who. Always shows
  // overdue first (most urgent), then this-month, regardless of the map
  // filter chip state.
  function renderDueList() {
    const panel = document.getElementById('_lds-due-panel');
    if (!panel) return;
    const all = getCustomers();  // already filtered to contract customers w/ coords
    // Pull contract customers WITHOUT coords too, so the list doesn't
    // silently hide overdue work for un-geocoded addresses.
    const cos = (window.Companies && Companies.list) || [];
    const arsMap = (window.AppSettings && window.AppSettings.path && window.AppSettings.path('arsskodun_customers')) || {};
    const allDue = [];
    cos.forEach(c => {
      const ars = arsMap[String(c.id)];
      if (!ars || !ars.equipment) return;
      const status = statusFor(c, ars);
      if ((status.key === 'overdue' || status.key === 'duenow') &&
          (!_state.months.length || _state.months.includes(+ars.inspect_month || 0))) {
        const gc = readGc();
        const coord = gc['__co__:' + c.id] || gc[c.heimilisfang] || gc[c.nafn] || null;
        allDue.push({ co: c, ars, status, coord });
      }
    });
    // Group: overdue first (sorted by month — earliest month = most overdue),
    // then duenow (this month).
    const overdue = allDue.filter(x => x.status.key === 'overdue')
      .sort((a, b) => (+a.ars.inspect_month || 0) - (+b.ars.inspect_month || 0)
                    || String(a.co.nafn).localeCompare(b.co.nafn, 'is'));
    const duenow = allDue.filter(x => x.status.key === 'duenow')
      .sort((a, b) => String(a.co.nafn).localeCompare(b.co.nafn, 'is'));

    const route = readRoute();
    const inRoute = new Set(route.map(r => String(r.id)));

    function rowHtml(item) {
      const c = item.co;
      const m = +item.ars.inspect_month || 0;
      const monthLabel = m >= 1 && m <= 12 ? MONTHS_IS[m-1] : '—';
      const isInRoute = inRoute.has(String(c.id));
      const canAddToRoute = !!item.coord && !isInRoute;
      return (
        '<div class="_lds-due-row" data-co-id="' + c.id + '" style="display:flex;align-items:center;gap:10px;padding:9px 14px;border-bottom:1px solid #f1f5f9;font-size:12.5px;cursor:pointer;transition:background .1s" onmouseover="this.style.background=\'#f8fafc\'" onmouseout="this.style.background=\'transparent\'">' +
          '<span style="width:10px;height:10px;border-radius:50%;background:' + item.status.color + ';flex-shrink:0"></span>' +
          ((window.Priority && window.Priority.btnHtml(c.id, 18)) || '') +
          '<div style="flex:1;min-width:0">' +
            '<div style="font-weight:600;color:#0f172a;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(c.nafn || '—') + '</div>' +
            '<div style="font-size:11px;color:#64748b;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' +
              (c.heimilisfang ? '📍 ' + esc(c.heimilisfang) : '<span style="color:#dc2626">⚠ Ekkert heimilisfang</span>') +
            '</div>' +
          '</div>' +
          '<div style="text-align:right;flex-shrink:0">' +
            '<div style="font-size:11px;font-weight:700;color:' + item.status.color + '">' + esc(item.status.label) + '</div>' +
            '<div style="font-size:10.5px;color:#94a3b8">' + esc(monthLabel) + '</div>' +
          '</div>' +
          '<div style="display:flex;gap:4px;flex-shrink:0">' +
            (canAddToRoute
              ? '<button class="_lds-due-add" data-co-id="' + c.id + '" data-lat="' + item.coord.lat + '" data-lng="' + item.coord.lng + '" type="button" title="Bæta á leið" style="padding:5px 9px;background:#16a34a;color:#fff;border:1px solid #15803d;border-radius:6px;cursor:pointer;font:inherit;font-size:11px;font-weight:700">➕</button>'
              : isInRoute
                ? '<span title="Á leið" style="padding:5px 9px;background:#dcfce7;color:#15803d;border:1px solid #bbf7d0;border-radius:6px;font:inherit;font-size:11px;font-weight:700">✓</span>'
                : '<button class="_lds-due-setloc" data-co-id="' + c.id + '" type="button" title="Setja staðsetningu (t.d. líma hnit úr Google Maps)" style="padding:5px 9px;background:#fef3c7;color:#92400e;border:1px solid #fde68a;border-radius:6px;cursor:pointer;font:inherit;font-size:11px;font-weight:700">📍 Setja</button>') +
            '<button class="_lds-due-open" data-co-id="' + c.id + '" type="button" title="Opna kúnna" style="padding:5px 9px;background:#fff;color:#0f172a;border:1px solid #cbd5e1;border-radius:6px;cursor:pointer;font:inherit;font-size:11px;font-weight:600">🏢</button>' +
          '</div>' +
        '</div>'
      );
    }

    function groupHtml(title, rows, color, bg) {
      if (!rows.length) return '';
      return (
        '<div style="background:' + bg + ';padding:8px 14px;font-size:11px;font-weight:700;color:' + color + ';text-transform:uppercase;letter-spacing:.04em;border-bottom:1px solid #e2e8f0">' +
          esc(title) + ' <span style="opacity:.6;font-weight:600">(' + rows.length + ')</span>' +
        '</div>' +
        rows.map(rowHtml).join('')
      );
    }

    if (!overdue.length && !duenow.length) {
      panel.innerHTML =
        '<div style="padding:18px;text-align:center;color:#94a3b8;font-size:13px">' +
          '✅ Allir samningar í lagi þennan mánuðinn.' +
        '</div>';
      return;
    }

    panel.innerHTML =
      '<div style="display:flex;justify-content:space-between;align-items:center;padding:11px 14px;background:#0f172a;color:#fff">' +
        '<div style="font-weight:700;font-size:13px">⏰ Eftir að skoða</div>' +
        '<div style="font-size:11px;color:#cbd5e1;font-weight:600">' +
          (overdue.length ? overdue.length + ' útrunnið' : '') +
          (overdue.length && duenow.length ? ' · ' : '') +
          (duenow.length ? duenow.length + ' þessi mánuður' : '') +
        '</div>' +
      '</div>' +
      '<div style="max-height:420px;overflow-y:auto">' +
        groupHtml('Útrunnið', overdue, '#b91c1c', '#fef2f2') +
        groupHtml('Þessi mánuður', duenow, '#92400e', '#fffbeb') +
      '</div>';

    // Wire interactions
    panel.querySelectorAll('._lds-due-row').forEach(row => {
      row.addEventListener('click', e => {
        if (e.target.closest('button')) return;
        const id = +row.dataset.coId;
        if (window.VidskDetail && typeof window.VidskDetail.show === 'function') {
          window.VidskDetail.show(id);
        } else if (window._openCompanySafe) {
          window._openCompanySafe(id);
        }
      });
    });
    panel.querySelectorAll('._lds-due-add').forEach(b => b.addEventListener('click', e => {
      e.stopPropagation();
      const coId = b.dataset.coId;
      const lat = parseFloat(b.dataset.lat);
      const lng = parseFloat(b.dataset.lng);
      const co = (window.Companies && Companies.list || []).find(c => String(c.id) === String(coId));
      if (co) addToRoute(coId, co.nafn, co.heimilisfang || '', lat, lng);
      renderDueList();
    }));
    panel.querySelectorAll('._lds-due-open').forEach(b => b.addEventListener('click', e => {
      e.stopPropagation();
      const id = +b.dataset.coId;
      if (window.VidskDetail && typeof window.VidskDetail.show === 'function') {
        window.VidskDetail.show(id);
      } else if (window._openCompanySafe) {
        window._openCompanySafe(id);
      }
    }));
    panel.querySelectorAll('._lds-due-setloc').forEach(b => b.addEventListener('click', e => {
      e.stopPropagation();
      const id = b.dataset.coId;
      const co = (window.Companies && Companies.list || []).find(c => String(c.id) === String(id));
      if (co && window.ManualGeocode) window.ManualGeocode.open(co, () => { renderPins({ fit: false }); renderDueList(); });
    }));
  }

  function renderPins(opts) {
    if (!_map) return;
    // fit:false skips the auto-zoom — used by live background refreshes so a
    // newly-geocoded pin doesn't yank the viewport while the user is looking.
    const fit = !opts || opts.fit !== false;
    clearMarkers();
    // Ár-chips og mánaðar-fjölval vinna saman: sía fyrst eftir ári, svo
    // eftir völdum mánuðum. Tómt val = engin sía.
    const list = applyMonths(applyYear(getCustomers()));
    list.forEach(item => {
      const m = L.marker([item.coord.lat, item.coord.lng], { icon: makeIcon(item.status.color) }).addTo(_map);
      m.bindPopup(() => makePopupHtml(item));
      _markers[item.co.id] = m;
    });
    if (fit && list.length > 0) {
      const pts = list.map(x => [x.coord.lat, x.coord.lng]);
      // Fit to the greater-capital cluster (where ~all customers are) and
      // ignore far outliers (Akureyri / Selfoss / Vogar) so the view doesn't
      // zoom all the way out to cover Iceland. maxZoom keeps a lone pin from
      // over-zooming. Falls back to all points if none are in the capital box.
      const RVK = [64.13, -21.90];
      const near = pts.filter(p => Math.abs(p[0] - RVK[0]) < 0.18 && Math.abs(p[1] - RVK[1]) < 0.45);
      const usePts = near.length ? near : pts;
      try { _map.fitBounds(L.latLngBounds(usePts).pad(0.12), { maxZoom: 14 }); } catch (_) {}
    }
    // Update counts in chip row
    updateChipCounts();
  }

  // Public hook so the background geocode pre-warm (patch 156) can drop
  // newly-resolved pins live — without re-fitting the viewport each time.
  window.Leidsogn = {
    refresh: () => {
      try { if (_map) { renderPins({ fit: false }); renderDueList(); } } catch (_) {}
    }
  };

  // Keep priority in sync with Fyrirtæki í Þjónustu: when a mark changes in any
  // view, re-render the due list here so colours stay consistent. (The clicked
  // button itself updates optimistically via patch 175's delegate; this catches
  // changes made in the OTHER view while Leiðsögn is open.)
  document.addEventListener('priority-changed', () => {
    try { renderDueList(); } catch (_) {}
  });

  function updateChipCounts() {
    // 2026-05-26: chip counts should reflect ALL eligible customers, including
    // those without geocodes (otherwise the Leiðsögn count silently understates
    // workload — Aggi noticed Leiðsögn said 48 but Fyrirtæki í þjónustu said
    // 113 for the same filter). Map pins still only show geocoded ones, but
    // the chip-count header should match what's "real".
    const cos = (window.Companies && Companies.list) || [];
    const arsMap = (window.AppSettings && window.AppSettings.path && window.AppSettings.path('arsskodun_customers')) || {};
    const bruMap = (window.AppSettings && window.AppSettings.path && window.AppSettings.path('brunakerfi_customers')) || {};
    const cnt = { all: 0, 2024: 0, 2025: 0, 2026: 0 };
    cos.forEach(c => {
      const ars = arsMap[String(c.id)];
      const bru = bruMap[String(c.id)];
      const hasContract = (ars && ars.equipment) || !!bru ||
        (window.InServiceClients && window.InServiceClients.has(c.nafn));
      if (!hasContract) return;
      cnt.all++;
      const y = yearOf(ars);
      if (cnt[y] != null) cnt[y]++;
    });
    Object.keys(cnt).forEach(k => {
      const el = document.querySelector('._lds-chip[data-year="' + k + '"] ._lds-count');
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
    renderDueList();
    // Re-render pin's popup
    const m = _markers[coId];
    if (m) m.closePopup();
  }
  function removeFromRoute(coId) {
    const r = readRoute().filter(x => String(x.id) !== String(coId));
    saveRoute(r);
    renderRoutePanel();
    renderDueList();
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
  // ── City pick + bulk route builder (2026-05-26) ─────────────────────────
  // Postcode → coarse region. Designed so most stops land in known capital-area
  // buckets; rare regions (Vestmannaeyjar, Akureyri, etc.) fall in 'Annað'.
  function regionFor(addr) {
    const s = String(addr || '');
    const m = s.match(/\b(\d{3})\b/);
    if (!m) return 'Annað';
    const p = +m[1];
    if (p >= 101 && p <= 132) return 'Reykjavík';
    if (p >= 200 && p <= 203) return 'Kópavogur';
    if (p >= 210 && p <= 212) return 'Garðabær';
    if (p >= 220 && p <= 225) return 'Hafnarfjörður';
    if (p === 270 || p === 271) return 'Mosfellsbær';
    if (p >= 800 && p <= 802) return 'Selfoss';
    if (p === 810) return 'Hveragerði';
    if (p === 816) return 'Þorlákshöfn';
    if (p === 311) return 'Borgarnes';
    if (p === 190) return 'Vogar';
    if (p === 820) return 'Eyrarbakki';
    return 'Annað';
  }

  // Nearest-neighbor TSP heuristic — start from first stop, repeatedly pick
  // the closest unvisited stop. Good enough for ≤30 stops; <5% worse than
  // optimal in practice for clustered city routes.
  function tspNearestNeighbor(stops) {
    if (stops.length <= 2) return stops.slice();
    const remaining = stops.slice();
    const route = [remaining.shift()];
    while (remaining.length) {
      const cur = route[route.length - 1];
      let bestI = 0, bestD = Infinity;
      for (let i = 0; i < remaining.length; i++) {
        const dx = remaining[i].lat - cur.lat;
        const dy = remaining[i].lng - cur.lng;
        const d2 = dx*dx + dy*dy;
        if (d2 < bestD) { bestD = d2; bestI = i; }
      }
      route.push(remaining.splice(bestI, 1)[0]);
    }
    return route;
  }

  // Filter a customer list down to the chosen inspection months (fjölval —
  // empty selection = all months).
  function applyMonths(list) {
    if (!_state.months.length) return list;
    return list.filter(x => _state.months.includes(+((x.ars || {}).inspect_month) || 0));
  }

  // MÁNUÐUR chip row — same look as Fyrirtæki í Þjónustu. Clicking a month
  // filters the map + due-list to that inspection month.
  function renderMonthRow() {
    const row = document.getElementById('_lds-month-row');
    if (!row) return;
    const cos = (window.Companies && Companies.list) || [];
    const arsMap = (window.AppSettings && window.AppSettings.path && window.AppSettings.path('arsskodun_customers')) || {};
    const inService = c => {
      const ars = arsMap[String(c.id)];
      return (ars && ars.equipment) || (window.InServiceClients && window.InServiceClients.has(c.nafn));
    };
    const counts = {};
    cos.forEach(c => {
      if (!inService(c)) return;
      const m = +((arsMap[String(c.id)] || {}).inspect_month) || 0;
      if (m >= 1 && m <= 12) counts[m] = (counts[m] || 0) + 1;
    });
    // 2026-06-12: fjölval — smellur togglar mánuðinn án þess að afvelja hina;
    // „Allir" hreinsar valið. ✓ sýnir valda mánuði.
    function moBtn(mn, label, cnt) {
      const sel = mn === 0 ? _state.months.length === 0 : _state.months.includes(mn);
      const has = cnt == null || cnt > 0;
      return '<button data-month="' + mn + '" class="_lds-mo" type="button" style="padding:5px 10px;border:1px solid ' +
        (sel ? '#0f172a' : (has ? '#cbd5e1' : '#e2e8f0')) + ';background:' + (sel ? '#0f172a' : '#fff') +
        ';color:' + (sel ? '#fff' : (has ? '#0f172a' : '#cbd5e1')) + ';border-radius:99px;cursor:pointer;font:inherit;font-size:11px;font-weight:600">' +
        (sel && mn !== 0 ? '✓ ' : '') + esc(label) + (cnt ? ' <span style="opacity:.6;font-weight:500">' + cnt + '</span>' : '') + '</button>';
    }
    row.innerHTML =
      '<span style="font-size:10.5px;font-weight:700;color:#64748b;text-transform:uppercase;padding-right:3px">Mánuður:</span>' +
      moBtn(0, 'Allir', null) +
      MONTHS_IS_SHORT.map((m, i) => moBtn(i + 1, m, counts[i + 1] || 0)).join('');
    row.querySelectorAll('._lds-mo').forEach(b => b.addEventListener('click', () => {
      const mn = +b.dataset.month || 0;
      if (mn === 0) {
        _state.months = [];
      } else if (_state.months.includes(mn)) {
        _state.months = _state.months.filter(x => x !== mn);
      } else {
        _state.months.push(mn);
        _state.months.sort((a, b) => a - b);
      }
      saveState();
      renderMonthRow();
      if (_map) renderPins({ fit: true });
      renderDueList();
    }));
  }

  function renderCityRow() {
    const row = document.getElementById('_lds-city-row');
    if (!row) return;
    const cos = (window.Companies && Companies.list) || [];
    const arsMap = (window.AppSettings && window.AppSettings.path && window.AppSettings.path('arsskodun_customers')) || {};
    const gc = readGc();
    // Build region → [stops] for customers that are on dagskrá (overdue/duenow)
    // AND have coords. Drives the "Aka núna" experience.
    const byRegion = {};
    cos.forEach(c => {
      const ars = arsMap[String(c.id)];
      if (!ars || !ars.equipment) return;
      const status = statusFor(c, ars);
      if (status.key !== 'overdue' && status.key !== 'duenow') return;
      const coord = gc['__co__:' + c.id] || gc[c.heimilisfang] || gc[c.nafn];
      if (!coord) return;
      const reg = regionFor(c.heimilisfang);
      (byRegion[reg] = byRegion[reg] || []).push({
        id: c.id, name: c.nafn, addr: c.heimilisfang || '',
        lat: coord.lat, lng: coord.lng
      });
    });
    const regions = Object.keys(byRegion).sort((a, b) => byRegion[b].length - byRegion[a].length);
    if (!regions.length) {
      row.innerHTML = '<div style="font-size:12px;color:#94a3b8">Engir staðir á dagskrá þessa stundina</div>';
      return;
    }
    row.innerHTML =
      '<div style="font-size:12px;font-weight:600;color:#475569;margin-right:4px">🚙 Aka í borg →</div>' +
      regions.map(r =>
        '<button class="_lds-city-go" data-region="' + esc(r) + '" type="button" style="' +
          'padding:6px 11px;border:1px solid #cbd5e1;background:#fff;color:#0f172a;border-radius:99px;' +
          'cursor:pointer;font:inherit;font-size:12px;font-weight:600;' +
          'display:inline-flex;align-items:center;gap:5px">' +
          esc(r) + ' <span style="background:#0f172a;color:#fff;border-radius:99px;font-size:10px;padding:1px 6px">' + byRegion[r].length + '</span>' +
        '</button>'
      ).join('');
    row.querySelectorAll('._lds-city-go').forEach(b => b.addEventListener('click', () => {
      const reg = b.dataset.region;
      const stops = byRegion[reg];
      if (!stops || !stops.length) return;
      // Confirm if large
      if (stops.length > 5 && !confirm('Setja ' + stops.length + ' stoppistöðvar á leið og opna leiðsögn?')) return;
      // TSP order
      const ordered = tspNearestNeighbor(stops);
      // Replace existing route
      saveRoute(ordered.map(s => ({ id: s.id, name: s.name, addr: s.addr, lat: s.lat, lng: s.lng })));
      renderRoutePanel();
      renderDueList();
      launchNav();
    }));
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
      const setBtn = e.target.closest && e.target.closest('._lds-setloc');
      if (setBtn) {
        e.preventDefault(); e.stopPropagation();
        const co = (window.Companies && Companies.list || []).find(c => String(c.id) === String(setBtn.dataset.coId));
        if (co && window.ManualGeocode) window.ManualGeocode.open(co, () => { try { renderPins({ fit: false }); renderDueList(); } catch (_) {} });
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
          // Ár-chips (síðast skoðað): Allt / 2024 / 2025 / 2026
          '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px">' +
            [
              ['all',  'Allt',  '#0f172a'],
              ['2024', '2024',  '#dc2626'],
              ['2025', '2025',  '#b45309'],
              ['2026', '2026',  '#1a7f4b']
            ].map(([k, lbl, color]) => {
              const sel = _state.year === k;
              return '<button data-year="' + k + '" class="_lds-chip" type="button" style="padding:6px 11px;border:1px solid ' + (sel?'#0f172a':'#cbd5e1') + ';background:' + (sel?'#0f172a':'#fff') + ';color:' + (sel?'#fff':'#475569') + ';border-radius:99px;cursor:pointer;font:inherit;font-size:12px;font-weight:600;display:flex;align-items:center;gap:6px"><span style="width:10px;height:10px;border-radius:50%;background:' + color + ';display:inline-block"></span>' + esc(lbl) + ' <span class="_lds-count" style="opacity:.7;font-weight:500">·</span></button>';
            }).join('') +
          '</div>' +
          // Month-chip row (same format as Fyrirtæki í Þjónustu) — filters the
          // map by inspection month. Populated by renderMonthRow().
          '<div id="_lds-month-row" style="display:flex;gap:5px;flex-wrap:wrap;margin-bottom:12px;align-items:center"></div>' +
          // 2026-05-26: city-pick row — Aggi can fill the route with all
          // overdue customers in a single city, sorted nearest-neighbor.
          '<div id="_lds-city-row" style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px;align-items:center"></div>' +
          '<div id="_lds-mapcanvas" style="width:100%;height:480px;background:#f1f5f9;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden"></div>' +
          '<div id="_lds-due-panel" style="margin-top:12px;background:#fff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden"></div>' +
          '<div id="_lds-route-panel" style="margin-top:12px;background:#fff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden"></div>' +
        '</div>';
      // Wire year chips
      main.querySelectorAll('._lds-chip').forEach(b => b.addEventListener('click', () => {
        _state.year = b.dataset.year || 'all';
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
      renderDueList();
      renderRoutePanel();
      renderCityRow();
      renderMonthRow();
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
    // When the uttaeki-based in-service set finishes loading (patch 177),
    // refresh pins + counts if the map is already on screen.
    if (window.InServiceClients && window.InServiceClients.onReady) {
      window.InServiceClients.onReady(() => {
        if (_map) { try { renderPins(); renderDueList(); } catch (_) {} }
      });
    }
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
