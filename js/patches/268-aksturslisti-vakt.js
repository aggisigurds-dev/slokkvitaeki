/* === AKSTURSLISTI (VAKT-YFIRLIT) v1 ===
 *
 * Sjálfstæð skrifstofu-síða (view `view-aksturslisti`, slug `#aksturslisti`,
 * hliðarstiku-hnappur „🚚 Aksturslisti") sem gefur góða RAKNINGU á því sem
 * bílstjórarnir (Hákon/Binni/Elías) gera yfir daginn — les `bilstjori_vakt`
 * töfluna sem Bílstjóri (patch 219) skrifar í.
 *
 *   • Dags-val (◀ Í dag ▶) + starfsmanna-sía (Allir / hver um sig).
 *   • Samantektar-spjöld per starfsmann: 🏢 fyrirtæki · 🟢 yfirfarið ·
 *     🔵 á verkstæði · ✅ kláruð · Σ heild · síðast séð.
 *   • Kort: síðasta staðsetning hvers + SLÓÐ dagsins (polyline úr ping+aðgerðum).
 *   • Rakningar-listi: tímaröð, nýjast efst — „HH:MM · nafn · aðgerð · fyrirtæki".
 *   • Uppfærist sjálfkrafa á 60s (bara þegar síðan er virk).
 *
 * Read-only. Wiring eins og 239/240 (view-div, klónaður hnappur, switchView-hook,
 * patch 218 ALIAS). Public: window.Aksturslisti = { open, reload }.
 */
(() => {
  if (window.__aksturListiInstalled) return;
  window.__aksturListiInstalled = true;

  const VIEW_ID = 'view-aksturslisti';
  const NAV_KEY = 'aksturslisti';
  const EMPLOYEES = ['Hákon', 'Binni', 'Elías'];
  const EMP_COL = { 'Hákon': '#2563eb', 'Binni': '#059669', 'Elías': '#d97706' };
  const empColor = (n) => EMP_COL[n] || '#64748b';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const ACT = {
    visit:        { icon: '📍', label: 'Heimsókn',        col: '#64748b' },
    yfirfarid:    { icon: '🟢', label: 'Yfirfór tæki',    col: '#1a7f4b' },
    verkstaedi:   { icon: '🔵', label: 'Á verkstæði',     col: '#2563eb' },
    company_done: { icon: '✅', label: 'Kláraði úttekt',  col: '#7c3aed' },
    ping:         { icon: '·',  label: 'Staðsetning',     col: '#94a3b8' },
  };

  let _day = todayStr();
  let _emp = 'all';
  let _map = null, _layers = [], _leafletLP = null, _poll = null, _rows = [], _cos = null, _shop = [], _mapView = null;

  // Akstursleiðir (1/2/3) búa í arsskodun_customers[id].akstur (patch 267/219).
  const AK_COL = { 1: '#1d4ed8', 2: '#1a7f4b', 3: '#0e7490' };
  function arsAll() { return (window.AppSettings && AppSettings.path && AppSettings.path('arsskodun_customers')) || {}; }
  async function loadCompanies() {
    if (_cos || !(window.DB && DB.sb && DB.fetchAll)) return;
    _cos = {};
    try {
      const rows = await DB.fetchAll((f, t) => DB.sb.from('fyrirtaeki').select('id,nafn,heimilisfang').is('deleted_at', null).range(f, t));
      rows.forEach(c => { _cos[c.id] = c; });
    } catch (_) { _cos = _cos || {}; }
  }
  // Tæki á verkstæði sem á eftir að skila = uttaeki.status='loaned' (Bílstjóri
  // setur 🔵 Á verkstæði → status 'loaned'). Live-staða, ekki dags-bundin.
  async function loadWorkshop() {
    if (!(window.DB && DB.sb)) { _shop = []; return; }
    try {
      const r = await DB.sb.from('uttaeki').select('id,client,type,size,serial,status,custody_status,service_choice').eq('status', 'loaned').limit(2000);
      _shop = r.data || [];
    } catch (_) { _shop = []; }
  }
  async function saveCustody(id, patch) {
    if (!(window.DB && DB.sb)) return false;
    try { const r = await DB.sb.from('uttaeki').update(patch).eq('id', id); return !(r && r.error); } catch (_) { return false; }
  }
  // verkstæðis-þrep tækis á verkstæði (status='loaned'): custody_status
  //   null → 'komid' → 'tilbuid' (+ service_choice hladid/onytt/nytt) → 'farid'
  const CUSTODY = {
    'null':    { label: 'Nýkomið', col: '#94a3b8' },
    komid:     { label: 'Komið á verkstæði', col: '#2563eb' },
    tilbuid:   { label: 'Tilbúið', col: '#059669' },
    farid:     { label: 'Farið af verkstæði', col: '#7c3aed' },
  };
  const DISP = { hladid: '🔋 Hlaðið', onytt: '❌ Ónýtt', nytt: '🆕 Keypt nýtt' };
  function workshopByClient() {
    const m = {};
    _shop.forEach(u => { const k = u.client || '— óþekkt —'; (m[k] = m[k] || []).push(u); });
    return Object.keys(m).sort((a, b) => m[b].length - m[a].length || a.localeCompare(b, 'is')).map(k => ({ client: k, items: m[k] }));
  }

  function aksturLists() {
    const ars = arsAll(), cy = new Date().getFullYear();
    const L3 = { 1: [], 2: [], 3: [] };
    Object.keys(ars).forEach(id => {
      const a = ars[id] || {}; const v = +a.akstur || 0;
      if (v < 1 || v > 3) return;
      const co = _cos && _cos[id];
      const done = Math.max(+a.last_year_inspected || 0, +a.field_inspected_year || 0) === cy;
      L3[v].push({ id: id, nafn: co ? (co.nafn || ('#' + id)) : ('#' + id), done: done });
    });
    [1, 2, 3].forEach(k => L3[k].sort((a, b) => (a.done - b.done) || String(a.nafn).localeCompare(String(b.nafn), 'is')));
    return L3;
  }

  function todayStr() { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function shiftDay(base, delta) { const d = new Date(base + 'T12:00:00'); d.setDate(d.getDate() + delta); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function dayLabel(s) {
    if (s === todayStr()) return 'Í dag';
    if (s === shiftDay(todayStr(), -1)) return 'Í gær';
    const d = new Date(s + 'T12:00:00');
    return d.toLocaleDateString('is-IS', { weekday: 'short', day: 'numeric', month: 'short' });
  }
  function hhmm(iso) { try { return new Date(iso).toLocaleTimeString('is-IS', { hour: '2-digit', minute: '2-digit' }); } catch (_) { return ''; } }
  function relTime(iso) {
    if (!iso) return '';
    const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
    if (s < 60) return 'rétt í þessu';
    if (s < 3600) return Math.round(s / 60) + ' mín';
    if (s < 86400) return Math.round(s / 3600) + ' klst';
    return Math.round(s / 86400) + ' d';
  }

  function ensureLeaflet() {
    if (window.L && window.L.map) return Promise.resolve();
    if (_leafletLP) return _leafletLP;
    _leafletLP = new Promise(resolve => {
      if (!document.querySelector('link[href*="leaflet"]')) {
        const css = document.createElement('link'); css.rel = 'stylesheet'; css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'; document.head.appendChild(css);
      }
      const sc = document.createElement('script'); sc.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      sc.onload = () => resolve(); sc.onerror = () => resolve(); document.head.appendChild(sc);
    });
    return _leafletLP;
  }

  // ── data ─────────────────────────────────────────────────────────────────
  async function load() {
    if (!(window.DB && DB.sb)) { _rows = []; return; }
    const start = new Date(_day + 'T00:00:00');
    const end = new Date(_day + 'T00:00:00'); end.setDate(end.getDate() + 1);
    try {
      const r = await DB.sb.from('bilstjori_vakt')
        .select('id,employee,action,co_id,co_nafn,uttaeki_id,lat,lng,created_at')
        .gte('created_at', start.toISOString()).lt('created_at', end.toISOString())
        .order('created_at', { ascending: false }).limit(6000);
      _rows = r.data || [];
    } catch (_) { _rows = []; }
  }

  function aggregate() {
    const agg = {};
    EMPLOYEES.forEach(n => agg[n] = { emp: n, cos: new Set(), yf: 0, vs: 0, done: 0, last: null, geo: null, trail: [] });
    // _rows is newest-first; build trail oldest-first
    const asc = _rows.slice().reverse();
    asc.forEach(x => {
      const a = agg[x.employee]; if (!a) return;
      if (x.co_id && x.action !== 'ping') a.cos.add(x.co_id);
      if (x.action === 'yfirfarid') a.yf++;
      if (x.action === 'verkstaedi') a.vs++;
      if (x.action === 'company_done') a.done++;
      if (x.lat != null && x.lng != null) { a.geo = { lat: x.lat, lng: x.lng }; a.trail.push([x.lat, x.lng]); }
      a.last = x.created_at;   // asc → ends on newest
    });
    return agg;
  }

  // ── map ──────────────────────────────────────────────────────────────────
  function drawMap(agg) {
    const canvas = document.getElementById('_al-map');
    if (!canvas || !window.L) return;
    // render() endurbyggir root.innerHTML (60s poll + aðgerðir) → gamla kort-boxið
    // dettur út og _map situr eftir á fjarlægðu box-i. Ef box hefur skipt um /
    // dottið úr DOM → eyða og endurbyggja á nýja boxinu (annars er kortið tómt).
    if (_map) {
      let bad = false;
      try { const c = _map.getContainer(); bad = (c !== canvas) || !document.body.contains(c); } catch (_) { bad = true; }
      if (bad) { try { _mapView = { c: _map.getCenter(), z: _map.getZoom() }; } catch (_) {} try { _map.remove(); } catch (_) {} _map = null; }
    }
    if (!_map) {
      _map = L.map(canvas, { zoomControl: false }).setView(_mapView ? _mapView.c : [64.13, -21.90], _mapView ? _mapView.z : 11);
      L.control.zoom({ position: 'bottomright' }).addTo(_map);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap', maxZoom: 19 }).addTo(_map);
      setTimeout(() => { try { _map.invalidateSize(); } catch (_) {} }, 80);
      setTimeout(() => { try { _map.invalidateSize(); } catch (_) {} }, 400);
    } else {
      setTimeout(() => { try { _map.invalidateSize(); } catch (_) {} }, 60);
    }
    _layers.forEach(l => { try { _map.removeLayer(l); } catch (_) {} });
    _layers = [];
    const pts = [];
    EMPLOYEES.forEach(n => {
      if (_emp !== 'all' && _emp !== n) return;
      const a = agg[n]; const col = empColor(n);
      if (a.trail.length > 1) {
        const pl = L.polyline(a.trail, { color: col, weight: 3, opacity: .6, dashArray: '4 6' }).addTo(_map);
        _layers.push(pl); a.trail.forEach(p => pts.push(p));
      }
      if (a.geo) {
        const ic = L.divIcon({ className: '_al-drv', iconSize: [0, 0], iconAnchor: [0, 0], html:
          '<div style="position:absolute;transform:translate(-50%,-50%);display:flex;align-items:center;gap:5px;white-space:nowrap">' +
            '<span style="width:18px;height:18px;border-radius:50%;background:' + col + ';border:3px solid #fff;box-shadow:0 0 0 2px ' + col + ',0 2px 6px rgba(0,0,0,.5)"></span>' +
            '<span style="font:800 11px/1 system-ui;color:#fff;background:' + col + ';padding:3px 7px;border-radius:99px;box-shadow:0 2px 6px rgba(0,0,0,.4)">' + esc(n) + '</span>' +
          '</div>' });
        const m = L.marker([a.geo.lat, a.geo.lng], { icon: ic, zIndexOffset: 1000 }).addTo(_map);
        _layers.push(m); pts.push([a.geo.lat, a.geo.lng]);
      }
    });
    if (pts.length) { try { _map.fitBounds(L.latLngBounds(pts).pad(0.25), { maxZoom: 14 }); } catch (_) {} }
  }

  // ── render ─────────────────────────────────────────────────────────────────
  function render() {
    const root = document.getElementById('_al-root');
    if (!root) return;
    const agg = aggregate();

    const card = (a) => {
      const tot = a.yf + a.vs, active = !!a.last, on = (_emp === a.emp);
      return '<button type="button" class="_al-empcard" data-emp="' + esc(a.emp) + '" style="text-align:left;flex:1 1 150px;min-width:150px;cursor:pointer;background:' + (active ? 'rgba(255,255,255,.06)' : 'rgba(255,255,255,.03)') + ';border:1.5px solid ' + (on ? empColor(a.emp) : 'rgba(255,255,255,.12)') + ';border-radius:14px;padding:12px 13px;font:inherit;color:inherit">' +
        '<div style="display:flex;align-items:center;gap:7px;margin-bottom:8px">' +
          '<span style="width:11px;height:11px;border-radius:50%;background:' + empColor(a.emp) + ';flex:none;box-shadow:0 0 0 2px rgba(255,255,255,.14)"></span>' +
          '<span style="font-size:15px;font-weight:800;color:#f2f4f7">' + esc(a.emp) + '</span>' +
          '<span style="margin-left:auto;font-size:10.5px;color:#a9b2bf">' + (active ? relTime(a.last) : '—') + '</span>' +
        '</div>' +
        '<div style="display:flex;gap:11px;flex-wrap:wrap;font-size:12.5px;color:#d8dde4;font-variant-numeric:tabular-nums">' +
          '<span title="Fyrirtæki">🏢 <b style="color:#fff">' + a.cos.size + '</b></span>' +
          '<span title="Yfirfarið">🟢 <b style="color:#fff">' + a.yf + '</b></span>' +
          '<span title="Á verkstæði">🔵 <b style="color:#fff">' + a.vs + '</b></span>' +
          '<span title="Kláraðar úttektir">✅ <b style="color:#fff">' + a.done + '</b></span>' +
          '<span title="Heild tækja" style="margin-left:auto;color:#eef1f4">Σ <b style="color:#fff">' + tot + '</b></span>' +
        '</div>' +
      '</button>';
    };

    // rakningar-listi (feed) — sleppum ping (of mikið); flettum flokkun
    const feed = _rows.filter(x => x.action !== 'ping' && (_emp === 'all' || x.employee === _emp));
    const feedHtml = feed.length ? feed.map(x => {
      const A = ACT[x.action] || { icon: '•', label: x.action, col: '#94a3b8' };
      return '<div style="display:flex;align-items:center;gap:10px;padding:9px 4px;border-bottom:1px solid rgba(255,255,255,.06)">' +
        '<span style="font-family:var(--mono,monospace);font-size:12px;color:#a9b2bf;flex:none;width:42px">' + hhmm(x.created_at) + '</span>' +
        '<span style="width:8px;height:8px;border-radius:50%;background:' + empColor(x.employee) + ';flex:none"></span>' +
        '<span style="font-size:13px;font-weight:700;color:#e7eaef;flex:none;min-width:52px">' + esc(x.employee) + '</span>' +
        '<span style="font-size:13px;color:#d8dde4">' + A.icon + ' ' + esc(A.label) + '</span>' +
        '<span style="font-size:12.5px;color:#aeb7c3;margin-left:auto;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:45%;text-align:right">' + esc(x.co_nafn || '') + '</span>' +
      '</div>';
    }).join('') : '<div style="padding:26px 8px;text-align:center;color:#a9b2bf;font-size:13px">Engin skráð virkni þennan dag.</div>';

    root.innerHTML =
      '<div style="max-width:1000px;margin:0 auto;padding:18px 16px 40px">' +
        '<div style="font-size:22px;font-weight:800;color:#f2f4f7;margin-bottom:2px">🚚 Aksturslisti</div>' +
        '<div style="font-size:13px;color:#aeb7c3;margin-bottom:16px">Rakning á því sem bílstjórarnir gera yfir daginn.</div>' +

        // toolbar: dagur + starfsmenn + refresh
        '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:14px">' +
          '<div style="display:flex;align-items:center;gap:4px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);border-radius:99px;padding:3px">' +
            '<button id="_al-prev" type="button" style="border:0;background:transparent;color:#e7eaef;cursor:pointer;font-size:16px;padding:4px 10px;border-radius:99px">‹</button>' +
            '<span style="font-size:13px;font-weight:700;color:#f2f4f7;min-width:96px;text-align:center">' + esc(dayLabel(_day)) + '</span>' +
            '<button id="_al-next" type="button" ' + (_day === todayStr() ? 'disabled style="opacity:.3;' : 'style="') + 'border:0;background:transparent;color:#e7eaef;cursor:pointer;font-size:16px;padding:4px 10px;border-radius:99px">›</button>' +
          '</div>' +
          (_day !== todayStr() ? '<button id="_al-today" type="button" style="border:1px solid rgba(255,255,255,.14);background:transparent;color:#d8dde4;border-radius:99px;padding:6px 12px;font:inherit;font-size:12px;cursor:pointer">Í dag</button>' : '') +
          '<div style="display:flex;gap:6px;margin-left:auto;flex-wrap:wrap">' +
            [['all', 'Allir', '#475569']].concat(EMPLOYEES.map(n => [n, n, empColor(n)])).map(([k, lab, col]) => {
              const on = _emp === k;
              return '<button type="button" class="_al-emp" data-emp="' + esc(k) + '" style="border:1px solid ' + (on ? col : 'rgba(255,255,255,.16)') + ';background:' + (on ? col : 'transparent') + ';color:' + (on ? '#fff' : '#d8dde4') + ';border-radius:99px;padding:6px 13px;font:inherit;font-size:12px;font-weight:700;cursor:pointer">' + esc(lab) + '</button>';
            }).join('') +
          '</div>' +
          '<button id="_al-refresh" type="button" style="border:1px solid rgba(255,255,255,.14);background:transparent;color:#d8dde4;border-radius:99px;padding:6px 12px;font:inherit;font-size:12px;cursor:pointer">↻</button>' +
        '</div>' +

        // Akstursleiðir 1/2/3 (leiðirnar sjálfar + fyrirtækin á þeim)
        (() => {
          const L3 = aksturLists();
          const anyList = L3[1].length + L3[2].length + L3[3].length > 0;
          if (!anyList) return '<div style="background:rgba(255,255,255,.065);border:1px solid rgba(255,255,255,.17);border-radius:14px;padding:14px;margin-bottom:16px;color:#a9b2bf;font-size:13px">Engin fyrirtæki komin á akstursleið enn — raðaðu þeim á Akstur 1/2/3 á „Fyrirtæki í þjónustu" (🚗-táknið á hverri röð).</div>';
          const col = (k) => {
            const rows = L3[k], done = rows.filter(r => r.done).length;
            return '<div style="flex:1 1 220px;min-width:200px;background:rgba(255,255,255,.065);border:1px solid rgba(255,255,255,.17);border-top:3px solid ' + AK_COL[k] + ';border-radius:14px;padding:12px 13px">' +
              '<div style="display:flex;align-items:center;gap:7px;margin-bottom:9px">' +
                '<span style="font-size:14px;font-weight:800;color:#f2f4f7">🚗 Akstur ' + k + '</span>' +
                '<span style="margin-left:auto;font-size:11.5px;color:#aeb7c3"><b style="color:#fff">' + done + '</b>/' + rows.length + ' kláruð</span>' +
              '</div>' +
              (rows.length ? '<div style="display:flex;flex-direction:column;gap:5px;max-height:230px;overflow:auto">' + rows.map(r =>
                '<div style="display:flex;align-items:center;gap:8px;font-size:12.5px">' +
                  '<span style="width:8px;height:8px;border-radius:50%;flex:none;background:' + (r.done ? '#22c55e' : 'rgba(255,255,255,.22)') + '"></span>' +
                  '<span style="color:' + (r.done ? '#a9b2bf' : '#eef1f5') + ';overflow:hidden;text-overflow:ellipsis;white-space:nowrap' + (r.done ? ';text-decoration:line-through' : '') + '">' + esc(r.nafn) + '</span>' +
                '</div>').join('') + '</div>'
              : '<div style="color:#a9b2bf;font-size:12px;padding:6px 0">Engin fyrirtæki á þessari leið.</div>') +
            '</div>';
          };
          return '<div style="font-size:12px;font-weight:800;letter-spacing:.05em;color:rgba(255,255,255,.96);margin-bottom:9px">🗺️ AKSTURSLEIÐIR</div>' +
            '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:18px">' + [1, 2, 3].map(col).join('') + '</div>';
        })() +

        // Á verkstæði — verkstæðis-lífsferill (verkstjórinn hakar; helst þar til
        // bílstjórinn skilar). Per tæki: staða-pilla + aðgerðahnappar.
        (() => {
          const grp = workshopByClient();
          const total = _shop.length;
          const stBtn = (id, act, label, col) =>
            '<button type="button" class="_al-cust" data-id="' + id + '" data-act="' + act + '" style="border:1px solid ' + col + ';background:transparent;color:' + col + ';border-radius:8px;padding:4px 9px;font:inherit;font-size:11.5px;font-weight:700;cursor:pointer">' + label + '</button>';
          const row = (u) => {
            const cs = u.custody_status || 'null';
            const meta = [u.type || 'Tæki', u.size, u.serial].filter(Boolean).map(esc).join(' · ');
            const pill = CUSTODY[cs] || CUSTODY['null'];
            let actions = '';
            if (cs === 'null') actions = stBtn(u.id, 'komid', '✅ Komið á verkstæði', '#3b82f6');
            else if (cs === 'komid') actions = stBtn(u.id, 'hladid', '🔋 Hlaðið', '#22c55e') + stBtn(u.id, 'onytt', '❌ Ónýtt', '#ef4444') + stBtn(u.id, 'nytt', '🆕 Nýtt', '#f59e0b');
            else if (cs === 'tilbuid') actions = '<span style="font-size:11.5px;color:#e7eaef;background:rgba(255,255,255,.08);border-radius:99px;padding:3px 9px;font-weight:700">' + (DISP[u.service_choice] || 'Tilbúið') + '</span>' + stBtn(u.id, 'farid', '➡️ Farið af verkstæði', '#a78bfa');
            else if (cs === 'farid') actions = '<span style="font-size:11.5px;color:#c4b5fd;background:rgba(124,58,237,.2);border:1px solid rgba(124,58,237,.45);border-radius:99px;padding:3px 9px;font-weight:700">🚚 Bíður skila hjá bílstjóra</span>';
            return '<div style="display:flex;align-items:center;gap:9px;flex-wrap:wrap;padding:8px 0;border-top:1px solid rgba(255,255,255,.07)">' +
              '<span style="width:9px;height:9px;border-radius:50%;flex:none;background:' + pill.col + '"></span>' +
              '<span style="font-size:13px;color:#eef1f5">' + meta + '</span>' +
              '<span style="font-size:10.5px;color:' + pill.col + ';font-weight:700;background:rgba(255,255,255,.06);border-radius:99px;padding:2px 8px">' + esc(pill.label) + '</span>' +
              '<span style="display:flex;gap:6px;margin-left:auto;flex-wrap:wrap">' + actions + '</span>' +
            '</div>';
          };
          const body = grp.length ? grp.map(g =>
            '<div style="padding:6px 0 2px">' +
              '<div style="font-size:13.5px;font-weight:800;color:#f2f4f7;margin-bottom:2px">' + esc(g.client) + ' <span style="font-weight:600;color:#aab3c0;font-size:12px">· ' + g.items.length + ' tæki</span></div>' +
              g.items.map(row).join('') +
            '</div>').join('')
            : '<div style="padding:16px 6px;color:#aab3c0;font-size:13px">Engin tæki á verkstæði núna. 👍</div>';
          return '<div style="display:flex;align-items:center;margin-bottom:9px"><span style="font-size:12px;font-weight:800;letter-spacing:.05em;color:rgba(255,255,255,.95)">🔧 Á VERKSTÆÐI — Á EFTIR AÐ SKILA</span>' + (total ? '<span style="margin-left:auto;font-size:11.5px;color:#93c5fd;font-weight:700">' + total + ' tæki · ' + grp.length + ' staðir</span>' : '') + '</div>' +
            '<div style="background:rgba(255,255,255,.055);border:1px solid rgba(255,255,255,.16);border-radius:14px;padding:10px 14px;margin-bottom:18px;max-height:420px;overflow:auto">' + body + '</div>';
        })() +

        // starfsmenn — samantektar-spjöld
        '<div style="font-size:12px;font-weight:800;letter-spacing:.05em;color:rgba(255,255,255,.96);margin-bottom:9px">👷 STARFSMENN Í DAG</div>' +
        '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px">' + EMPLOYEES.map(n => card(agg[n])).join('') + '</div>' +

        // kort
        '<div style="border-radius:16px;overflow:hidden;border:1px solid rgba(255,255,255,.17);margin-bottom:16px;background:#2b2e35">' +
          '<div id="_al-map" style="height:300px;width:100%"></div>' +
        '</div>' +

        // rakningar-listi
        '<div style="background:rgba(255,255,255,.065);border:1px solid rgba(255,255,255,.17);border-radius:16px;padding:12px 14px">' +
          '<div style="display:flex;align-items:center;margin-bottom:8px"><span style="font-size:12px;font-weight:800;letter-spacing:.05em;color:rgba(255,255,255,.96)">🧭 RAKNING DAGSINS</span><span style="margin-left:auto;font-size:11px;color:#a9b2bf">' + feed.length + ' atriði</span></div>' +
          feedHtml +
        '</div>' +
      '</div>';

    // wire
    const bind = (id, fn) => { const el = document.getElementById(id); if (el) el.addEventListener('click', fn); };
    bind('_al-prev', () => { _day = shiftDay(_day, -1); reload(); });
    bind('_al-next', () => { if (_day !== todayStr()) { _day = shiftDay(_day, 1); reload(); } });
    bind('_al-today', () => { _day = todayStr(); reload(); });
    bind('_al-refresh', () => reload());
    root.querySelectorAll('._al-emp,._al-empcard').forEach(b => b.addEventListener('click', () => {
      const v = b.dataset.emp; _emp = (b.classList.contains('_al-empcard') && _emp === v) ? 'all' : v; render(); drawMap(aggregate());
    }));
    // verkstæðis-þrep (verkstjóri hakar)
    const PATCHES = {
      komid:  { custody_status: 'komid' },
      hladid: { custody_status: 'tilbuid', service_choice: 'hladid' },
      onytt:  { custody_status: 'tilbuid', service_choice: 'onytt' },
      nytt:   { custody_status: 'tilbuid', service_choice: 'nytt' },
      farid:  { custody_status: 'farid' },
    };
    root.querySelectorAll('._al-cust').forEach(b => b.addEventListener('click', async () => {
      const id = b.dataset.id, p = PATCHES[b.dataset.act]; if (!p) return;
      b.disabled = true; b.style.opacity = '.5';
      const local = _shop.find(u => String(u.id) === String(id));
      if (local) Object.assign(local, p);
      const ok = await saveCustody(id, p);
      if (ok) render(); else { b.disabled = false; b.style.opacity = '1'; }
    }));
    ensureLeaflet().then(() => drawMap(agg));
  }

  async function reload() {
    const root = document.getElementById('_al-root');
    if (root && !root.innerHTML) root.innerHTML = '<div style="padding:40px;text-align:center;color:#a9b2bf">⏳ Sæki gögn…</div>';
    await Promise.all([load(), loadCompanies(), loadWorkshop()]);
    render();
  }

  // ── view + wiring ──────────────────────────────────────────────────────────
  function ensureView() {
    let v = document.getElementById(VIEW_ID);
    if (v) return v;
    v = document.createElement('div');
    v.id = VIEW_ID;
    v.className = 'view';
    v.style.cssText = 'display:none;min-height:100vh;background:linear-gradient(180deg,#1a1d23 0,#21252d 200px,#252932 100%)';
    v.innerHTML = '<div id="_al-root"></div>';
    document.body.appendChild(v);
    return v;
  }

  function open() {
    ensureView();
    document.querySelectorAll('.view,[id^="view-"]').forEach(x => { x.style.display = 'none'; x.classList.remove('active'); });
    const v = document.getElementById(VIEW_ID);
    v.style.display = 'block'; v.classList.add('active');
    document.querySelectorAll('.vnav-btn').forEach(b => b.classList.toggle('active', b.getAttribute('data-view') === NAV_KEY));
    try { localStorage.setItem('lastView', NAV_KEY); } catch (_) {}
    try { if ((location.hash || '').replace(/^#/, '') !== NAV_KEY) history.replaceState(null, '', '#' + NAV_KEY); } catch (_) {}
    reload();
    if (!_poll) _poll = setInterval(() => { const el = document.getElementById(VIEW_ID); if (el && el.classList.contains('active')) reload(); }, 60000);
  }

  function injectSidebar() {
    const nav = document.querySelector('nav.view-nav, .view-nav');
    if (!nav) { setTimeout(injectSidebar, 600); return; }
    if (nav.querySelector('[data-view="' + NAV_KEY + '"]')) return;
    const ref = nav.querySelector('[data-view="bilstjori"]') || nav.querySelector('.vnav-btn');
    const btn = document.createElement('button');
    btn.className = (ref && ref.className) || 'vnav-btn';
    btn.setAttribute('data-view', NAV_KEY);
    btn.innerHTML = '<span style="display:inline-flex;align-items:center;gap:8px">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><path d="M1 3h15v13H1zM16 8h4l3 3v5h-7z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>' +
      '<span>Aksturslisti</span></span>';
    btn.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); if (window.App && App.switchView) App.switchView(NAV_KEY); else open(); });
    if (ref && ref.parentNode) ref.parentNode.insertBefore(btn, ref.nextSibling);
    else nav.insertBefore(btn, nav.firstChild);
  }

  function patchSwitchView() {
    if (!window.App) { setTimeout(patchSwitchView, 150); return; }
    if (window.App._aksturListiPatched) return;
    const orig = window.App.switchView;
    window.App.switchView = function (view) {
      if (view === NAV_KEY) { open(); return; }
      const r = orig ? orig.apply(this, arguments) : undefined;
      try { const v = document.getElementById(VIEW_ID); if (v) { v.style.display = 'none'; v.classList.remove('active'); } } catch (_) {}
      return r;
    };
    for (const k in orig) { try { window.App.switchView[k] = orig[k]; } catch (_) {} }
    window.App._aksturListiPatched = true;
  }

  function boot() {
    injectSidebar();
    setTimeout(injectSidebar, 1500);
    patchSwitchView();
    if ((location.hash || '').replace(/^#/, '') === NAV_KEY) setTimeout(() => { if (window.App && App.switchView) App.switchView(NAV_KEY); else open(); }, 300);
    window.addEventListener('hashchange', () => { if ((location.hash || '').replace(/^#/, '') === NAV_KEY) open(); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  window.Aksturslisti = { open, reload };
  console.log('[aksturslisti-vakt] v1 installed');
})();
/* === END AKSTURSLISTI (VAKT-YFIRLIT) === */
