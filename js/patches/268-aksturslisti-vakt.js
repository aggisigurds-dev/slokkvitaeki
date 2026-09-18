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
  // Starfsmenn úr sameiginlega listanum (350, bord_starfsmenn) — fólkið, án „Charlize" og „Allir" (Agnar 11.09.2026).
  const folkid = () => { try { const l = window.BordStarfsmadur && BordStarfsmadur.list ? BordStarfsmadur.list() : []; const f = l.filter(n => n && n !== 'Charlize' && String(n).toLowerCase() !== 'allir'); if (f.length) return f; } catch (_) {} return ['Agnar', 'Bjarndís', 'Binni', 'Anni', 'Hákon', 'Afgreiðsla']; };
  const EMP_COL = { 'Hákon': '#2563eb', 'Binni': '#059669', 'Elías': '#d97706', 'Agnar': '#dc2626', 'Bjarndís': '#7c3aed', 'Anni': '#db2777', 'Afgreiðsla': '#0891b2' };
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
  // 18.09.2026 — úttektarferðir dagsins (app_settings.inspection_trips).
  let _ferdir = [];

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
      _shop = await DB.fetchAll((from, to) => DB.sb.from('uttaeki').select('id,client,type,size,serial,status,custody_status,service_choice').eq('status', 'loaned').order('id').range(from, to));
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

  /* ── ÚTTEKTARFERÐIR ────────────────────────────────────────────────────
   * MÆLT 18.09.2026: `bilstjori_vakt` — sem þessi sýn las eina — hafði 0
   * færslur í dag og 4 á viku. `inspection_trips` var uppfært kl. 09:19 sama
   * dag með 10 ferðum á viku. Aðgerðirnar `yfirfarid`/`verkstaedi` hættu að
   * skrást 28.07.2026 þegar vinnuflæðið færðist yfir á ÞJÓNUSTUVAL, sem
   * skrifar ekkert í þá töflu. Listinn var því tómur af því að hann horfði á
   * rangan stað — ekki af því að ekkert væri unnið.
   *
   * HEIÐARLEIKI UM TÍMANN: `_ts` er SÍÐASTA SNERTING á ferðinni, ekki
   * vinnudagurinn. Mælt dæmi: fyrirtæki 228 ber `_ts` 16.09 en úttektin var
   * gerð 30.07 — reikningurinn var búinn til síðar. Hér er því sagt „síðast
   * unnið", aldrei „gert í dag". `skodun_dagsetning` væri réttari en hana
   * vantar í 63 af 170 ferðum (37%) og snið hennar er blandað.
   *
   * NÖFN: `skodunaradili` ber bæði „hákon" og „Hákon" í gögnunum. Hópað er
   * eftir lágstöfum svo sami maður telist einn, en birt eins og skráð var.
   */
  function ferdirDagsins() {
    let allar = null;
    try { allar = window.AppSettings && AppSettings.path && AppSettings.path('inspection_trips'); } catch (_) {}
    if (!allar || typeof allar !== 'object') return [];
    const byrjun = new Date(_day + 'T00:00:00').getTime();
    const endir = byrjun + 86400000;
    const ut = [];
    Object.keys(allar).forEach(coId => {
      const f = allar[coId];
      if (!f || typeof f !== 'object' || f._deleted) return;
      const ts = +f._ts || 0;
      if (!(ts >= byrjun && ts < endir)) return;
      const units = (f.units && typeof f.units === 'object') ? f.units : {};
      const talning = { yfirferd: 0, hledsla: 0, nytt: 0, annad: 0 };
      Object.keys(units).forEach(id => {
        const v = String(units[id] || '').toLowerCase();
        if (v === 'yfirferd') talning.yfirferd++;
        else if (v === 'hledsla') talning.hledsla++;
        else if (v === 'nytt') talning.nytt++;
        else if (v) talning.annad++;
      });
      const nafn = String(f.skodunaradili || '').trim();
      ut.push({
        coId: +coId, ts,
        madur: nafn || '(óskráður)',
        lykill: (nafn || '(óskráður)').toLowerCase(),
        talning,
        taeki: Object.keys(units).length,
        klarad: +f._doneIds || 0,
        laest: !!f._locked,
        reikningur: (f._invoice && f._invoice.num) || null,
        upphaed: (f._invoice && f._invoice.samtals) || null,
        uttektardagur: f.skodun_dagsetning || null,
        nota: String(f.notes || '').trim(),
      });
    });
    try { window.__alDebug = { day: _day, fjoldi: ut.length, allarTil: !!(window.AppSettings && AppSettings.path && AppSettings.path("inspection_trips")), kallad: (window.__alDebug ? window.__alDebug.kallad : 0) + 1 }; } catch(_){}
    return ut.sort((a, b) => b.ts - a.ts);
  }

  // ── data ─────────────────────────────────────────────────────────────────
  async function load() {
    if (!(window.DB && DB.sb)) { _rows = []; return; }
    const start = new Date(_day + 'T00:00:00');
    const end = new Date(_day + 'T00:00:00'); end.setDate(end.getDate() + 1);
    try {
      _rows = await DB.fetchAll((from, to) => DB.sb.from('bilstjori_vakt')
        .select('id,employee,action,co_id,co_nafn,uttaeki_id,lat,lng,created_at')
        .gte('created_at', start.toISOString()).lt('created_at', end.toISOString())
        .order('created_at', { ascending: false }).order('id').range(from, to));
    } catch (_) { _rows = []; }
  }

  function aggregate() {
    const agg = {};
    folkid().forEach(n => agg[n] = { emp: n, cos: new Set(), yf: 0, vs: 0, done: 0, last: null, geo: null, trail: [] });
    // _rows is newest-first; build trail oldest-first
    const asc = _rows.slice().reverse();
    asc.forEach(x => {
      const a = agg[x.employee] || (x.employee ? (agg[x.employee] = { emp: x.employee, cos: new Set(), yf: 0, vs: 0, done: 0, last: null, geo: null, trail: [] }) : null); if (!a) return;
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
      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', { attribution: 'Flísar © Esri, HERE, Garmin, © OpenStreetMap contributors', maxZoom: 19 }).addTo(_map);
      setTimeout(() => { try { _map.invalidateSize(); } catch (_) {} }, 80);
      setTimeout(() => { try { _map.invalidateSize(); } catch (_) {} }, 400);
    } else {
      setTimeout(() => { try { _map.invalidateSize(); } catch (_) {} }, 60);
    }
    _layers.forEach(l => { try { _map.removeLayer(l); } catch (_) {} });
    _layers = [];
    const pts = [];
    Object.keys(agg).forEach(n => {
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

    // Litakerfi: HVÍT textasvæði m/ svörtum texta · DÖKK-METALÍK headers/takkar m/ hvítum texta.
    // 2026-08-07 (skjáskot Agnars: „much black on black" í símanum): INK var
    // #111827 og INK3 #6b7280 — litir sem HVORKI dökka þemað (66) né þemabrúin
    // (229) þekkja. Þemun flippa hvítu kortin (background:#fff → dökkt) með
    // attribute-selectorum en skildu þessa tvo texta eftir dökka → svart á
    // svörtu. Húslitirnir #0f172a og #64748b eru eins í ljósu en eru á
    // remappa-listum beggja þema, svo textinn lýsist nú með kortunum.
    const INK = '#0f172a', INK2 = '#475569', INK3 = '#64748b';
    const CARD = 'background:#fff;border:1px solid #d7dee7;border-radius:14px;box-shadow:0 1px 3px rgba(15,23,42,.14)';
    const METAL = 'background:linear-gradient(180deg,#3a3f48,#23272e 55%,#171a1f);color:#fff;border:1px solid #0c0e12;box-shadow:inset 0 1px 0 rgba(255,255,255,.12),0 2px 6px rgba(0,0,0,.35)';
    const METALBTN = 'background:linear-gradient(180deg,#3a3f48,#23272e);color:#fff;border:1px solid #0c0e12;box-shadow:inset 0 1px 0 rgba(255,255,255,.1);border-radius:99px;padding:6px 13px;font:inherit;font-size:12px;font-weight:700;cursor:pointer';
    const secHdr = (t, right) => '<div style="' + METAL + ';border-radius:11px;padding:9px 14px;margin-bottom:11px;display:flex;align-items:center">' +
      '<span style="font-size:12.5px;font-weight:800;letter-spacing:.05em">' + t + '</span>' + (right ? '<span style="margin-left:auto;font-size:12px;font-weight:700;color:#d3dae4">' + right + '</span>' : '') + '</div>';

    const card = (a) => {
      const tot = a.yf + a.vs, active = !!a.last, on = (_emp === a.emp);
      return '<button type="button" class="_al-empcard" data-emp="' + esc(a.emp) + '" style="text-align:left;flex:1 1 160px;min-width:160px;cursor:pointer;' + CARD + ';padding:12px 13px;font:inherit;' + (on ? 'outline:2.5px solid ' + empColor(a.emp) + ';outline-offset:-2px;' : '') + '">' +
        '<div style="display:flex;align-items:center;gap:7px;margin-bottom:8px">' +
          '<span style="width:11px;height:11px;border-radius:50%;background:' + empColor(a.emp) + ';flex:none"></span>' +
          '<span style="font-size:15px;font-weight:800;color:' + INK + '">' + esc(a.emp) + '</span>' +
          '<span style="margin-left:auto;font-size:10.5px;color:' + INK3 + '">' + (active ? relTime(a.last) : '—') + '</span>' +
        '</div>' +
        '<div style="display:flex;gap:11px;flex-wrap:wrap;font-size:12.5px;color:' + INK2 + ';font-variant-numeric:tabular-nums">' +
          '<span title="Fyrirtæki">🏢 <b style="color:' + INK + '">' + a.cos.size + '</b></span>' +
          '<span title="Yfirfarið">🟢 <b style="color:' + INK + '">' + a.yf + '</b></span>' +
          '<span title="Á verkstæði">🔵 <b style="color:' + INK + '">' + a.vs + '</b></span>' +
          '<span title="Kláraðar úttektir">✅ <b style="color:' + INK + '">' + a.done + '</b></span>' +
          '<span title="Heild tækja" style="margin-left:auto">Σ <b style="color:' + INK + '">' + tot + '</b></span>' +
        '</div>' +
      '</button>';
    };

    // rakningar-listi (feed) — sleppum ping (of mikið)
    const feed = _rows.filter(x => x.action !== 'ping' && (_emp === 'all' || x.employee === _emp));
    const feedHtml = feed.length ? feed.map(x => {
      const A = ACT[x.action] || { icon: '•', label: x.action, col: '#94a3b8' };
      return '<div style="display:flex;align-items:center;gap:10px;padding:9px 4px;border-bottom:1px solid #eef2f7">' +
        '<span style="font-family:var(--mono,monospace);font-size:12px;color:' + INK3 + ';flex:none;width:42px">' + hhmm(x.created_at) + '</span>' +
        '<span style="width:8px;height:8px;border-radius:50%;background:' + empColor(x.employee) + ';flex:none"></span>' +
        '<span style="font-size:13px;font-weight:800;color:' + INK + ';flex:none;min-width:52px">' + esc(x.employee) + '</span>' +
        '<span style="font-size:13px;color:' + INK2 + '">' + A.icon + ' ' + esc(A.label) + '</span>' +
        '<span style="font-size:12.5px;color:' + INK3 + ';margin-left:auto;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:45%;text-align:right">' + esc(x.co_nafn || '') + '</span>' +
      '</div>';
    }).join('') : '<div style="padding:26px 8px;text-align:center;color:' + INK3 + ';font-size:13px">Engin skráð virkni þennan dag.</div>';

    root.innerHTML =
      '<div style="max-width:1000px;margin:0 auto;padding:18px 16px 44px">' +
        '<div style="font-size:23px;font-weight:800;color:#fff;margin-bottom:2px;text-shadow:0 1px 2px rgba(0,0,0,.4)">🚚 Aksturslisti</div>' +
        '<div style="font-size:13px;color:#c9cfd8;margin-bottom:16px">Rakning á því sem bílstjórarnir gera yfir daginn.</div>' +

        // toolbar (dökk-metalík)
        '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:16px">' +
          '<div style="display:flex;align-items:center;gap:2px;' + METAL + ';border-radius:99px;padding:2px">' +
            '<button id="_al-prev" type="button" style="border:0;background:transparent;color:#fff;cursor:pointer;font-size:17px;padding:4px 11px;border-radius:99px">‹</button>' +
            '<span style="font-size:13px;font-weight:800;color:#fff;min-width:96px;text-align:center">' + esc(dayLabel(_day)) + '</span>' +
            '<button id="_al-next" type="button" ' + (_day === todayStr() ? 'disabled style="opacity:.3;' : 'style="') + 'border:0;background:transparent;color:#fff;cursor:pointer;font-size:17px;padding:4px 11px;border-radius:99px">›</button>' +
          '</div>' +
          (_day !== todayStr() ? '<button id="_al-today" type="button" style="' + METALBTN + '">Í dag</button>' : '') +
          '<div style="display:flex;gap:6px;margin-left:auto;flex-wrap:wrap">' +
            [['all', 'Allir', '#334155']].concat(folkid().map(n => [n, n, empColor(n)])).map(([k, lab, col]) => {
              const on = _emp === k;
              return '<button type="button" class="_al-emp" data-emp="' + esc(k) + '" style="' + (on
                ? 'background:' + col + ';color:#fff;border:1px solid ' + col + ';box-shadow:inset 0 1px 0 rgba(255,255,255,.25)'
                : METAL) + ';border-radius:99px;padding:6px 13px;font:inherit;font-size:12px;font-weight:700;cursor:pointer">' + esc(lab) + '</button>';
            }).join('') +
          '</div>' +
          '<button id="_al-refresh" type="button" style="' + METALBTN + ';padding:6px 12px">↻</button>' +
        '</div>' +

        // Akstursleiðir 1/2/3
        (() => {
          const L3 = aksturLists();
          const anyList = L3[1].length + L3[2].length + L3[3].length > 0;
          if (!anyList) return secHdr('🗺️ AKSTURSLEIÐIR') + '<div style="' + CARD + ';padding:14px;margin-bottom:18px;color:' + INK2 + ';font-size:13px">Engin fyrirtæki komin á akstursleið enn — raðaðu þeim á Akstur 1/2/3 á „Fyrirtæki í þjónustu" (🚗-táknið á hverri röð).</div>';
          const col = (k) => {
            const rows = L3[k], done = rows.filter(r => r.done).length;
            return '<div style="flex:1 1 220px;min-width:200px;' + CARD + ';border-top:4px solid ' + AK_COL[k] + ';padding:12px 13px">' +
              '<div style="display:flex;align-items:center;gap:7px;margin-bottom:9px">' +
                '<span style="font-size:14px;font-weight:800;color:' + INK + '">🚗 Akstur ' + k + '</span>' +
                '<span style="margin-left:auto;font-size:11.5px;color:' + INK2 + '"><b style="color:' + INK + '">' + done + '</b>/' + rows.length + ' kláruð</span>' +
              '</div>' +
              (rows.length ? '<div style="display:flex;flex-direction:column;gap:5px;max-height:230px;overflow:auto">' + rows.map(r =>
                '<div style="display:flex;align-items:center;gap:8px;font-size:12.5px">' +
                  '<span style="width:8px;height:8px;border-radius:50%;flex:none;background:' + (r.done ? '#16a34a' : '#cbd5e1') + '"></span>' +
                  '<span style="color:' + (r.done ? '#94a3b8' : INK) + ';overflow:hidden;text-overflow:ellipsis;white-space:nowrap' + (r.done ? ';text-decoration:line-through' : '') + '">' + esc(r.nafn) + '</span>' +
                '</div>').join('') + '</div>'
              : '<div style="color:' + INK3 + ';font-size:12px;padding:6px 0">Engin fyrirtæki á þessari leið.</div>') +
            '</div>';
          };
          return secHdr('🗺️ AKSTURSLEIÐIR') + '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:18px">' + [1, 2, 3].map(col).join('') + '</div>';
        })() +

        // Á verkstæði — verkstæðis-lífsferill
        (() => {
          const grp = workshopByClient();
          const total = _shop.length;
          const stBtn = (id, act, label, col) =>
            '<button type="button" class="_al-cust" data-id="' + id + '" data-act="' + act + '" style="border:0;background:' + col + ';color:#fff;border-radius:8px;padding:5px 11px;font:inherit;font-size:11.5px;font-weight:700;cursor:pointer;box-shadow:inset 0 1px 0 rgba(255,255,255,.22)">' + label + '</button>';
          const row = (u) => {
            const cs = u.custody_status || 'null';
            const meta = [u.type || 'Tæki', u.size, u.serial].filter(Boolean).map(esc).join(' · ');
            const pill = CUSTODY[cs] || CUSTODY['null'];
            let actions = '';
            if (cs === 'null') actions = stBtn(u.id, 'komid', '✅ Komið á verkstæði', '#2563eb');
            else if (cs === 'komid') actions = stBtn(u.id, 'hladid', '🔋 Hlaðið', '#16a34a') + stBtn(u.id, 'onytt', '❌ Ónýtt', '#dc2626') + stBtn(u.id, 'nytt', '🆕 Nýtt', '#d97706');
            else if (cs === 'tilbuid') actions = '<span style="font-size:11.5px;color:#fff;background:#059669;border-radius:99px;padding:3px 10px;font-weight:700">' + (DISP[u.service_choice] || 'Tilbúið') + '</span>' + stBtn(u.id, 'farid', '➡️ Farið af verkstæði', '#7c3aed');
            else if (cs === 'farid') actions = '<span style="font-size:11.5px;color:#6d28d9;background:#ede9fe;border:1px solid #c4b5fd;border-radius:99px;padding:3px 10px;font-weight:800">🚚 Bíður skila hjá bílstjóra</span>';
            return '<div style="display:flex;align-items:center;gap:9px;flex-wrap:wrap;padding:8px 0;border-top:1px solid #eef2f7">' +
              '<span style="width:9px;height:9px;border-radius:50%;flex:none;background:' + pill.col + '"></span>' +
              '<span style="font-size:13px;color:' + INK + ';font-weight:600">' + meta + '</span>' +
              '<span style="font-size:10.5px;color:#fff;font-weight:700;background:' + pill.col + ';border-radius:99px;padding:2px 9px">' + esc(pill.label) + '</span>' +
              '<span style="display:flex;gap:6px;margin-left:auto;flex-wrap:wrap">' + actions + '</span>' +
            '</div>';
          };
          const body = grp.length ? grp.map(g =>
            '<div style="padding:6px 0 2px">' +
              '<div style="font-size:13.5px;font-weight:800;color:' + INK + ';margin-bottom:2px">' + esc(g.client) + ' <span style="font-weight:600;color:' + INK3 + ';font-size:12px">· ' + g.items.length + ' tæki</span></div>' +
              g.items.map(row).join('') +
            '</div>').join('')
            : '<div style="padding:16px 6px;color:' + INK3 + ';font-size:13px">Engin tæki á verkstæði núna. 👍</div>';
          return secHdr('🔧 Á VERKSTÆÐI — Á EFTIR AÐ SKILA', total ? total + ' tæki · ' + grp.length + ' staðir' : '') +
            '<div style="' + CARD + ';padding:10px 14px;margin-bottom:18px;max-height:440px;overflow:auto">' + body + '</div>';
        })() +

        // starfsmenn
        secHdr('👷 STARFSMENN Í DAG') +
        '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:18px">' + (Object.keys(agg).filter(n => agg[n].last).map(n => card(agg[n])).join('') || '<span style="color:#64748b;font-size:13px">Engin virkni skráð þennan dag.</span>') + '</div>' +

        // kort
        '<div style="border-radius:14px;overflow:hidden;border:1px solid #0c0e12;margin-bottom:18px;background:#dfe3e8;box-shadow:0 2px 6px rgba(0,0,0,.25)">' +
          '<div id="_al-map" style="height:300px;width:100%"></div>' +
        '</div>' +

        // 18.09.2026 — úttektarferðir: þar sem vinnan er RAUNVERULEGA skráð.
        (() => {
          const f = _ferdir.filter(x => _emp === 'all' || x.lykill === String(_emp).toLowerCase());
          if (!f.length) return secHdr('🧰 ÚTTEKTARFERÐIR', '0') +
            '<div style="' + CARD + ';padding:14px;margin-bottom:18px;color:' + INK3 + ';font-size:12.5px">' +
              'Engin ferð var snert þennan dag.' +
            '</div>';
          const perMann = {};
          f.forEach(x => {
            const a = perMann[x.lykill] || (perMann[x.lykill] = { madur: x.madur, stadir: 0, taeki: 0, klarad: 0, yf: 0, hl: 0, ny: 0, reikningar: [] });
            a.stadir++; a.taeki += x.taeki; a.klarad += x.klarad;
            a.yf += x.talning.yfirferd; a.hl += x.talning.hledsla; a.ny += x.talning.nytt;
            if (x.reikningur) a.reikningar.push(x.reikningur);
          });
          const nafnFyrirtaekis = id => { const c = (_cos || []).find(y => +y.id === +id); return c ? c.nafn : ('#' + id); };
          const bitar = Object.keys(perMann).map(k => {
            const a = perMann[k];
            return '<div style="' + CARD + ';padding:11px 14px;flex:1 1 220px">' +
              '<div style="font-weight:800;color:' + INK + ';font-size:13px;margin-bottom:5px">' + esc(a.madur) + '</div>' +
              '<div style="font-size:12px;color:' + INK2 + ';line-height:1.7">' +
                '🏢 ' + a.stadir + ' ' + (a.stadir === 1 ? 'staður' : 'staðir') + ' · 🧯 ' + a.taeki + ' tæki<br>' +
                (a.yf ? '🟢 ' + a.yf + ' yfirferð ' : '') + (a.hl ? '🔵 ' + a.hl + ' hleðsla ' : '') + (a.ny ? '🆕 ' + a.ny + ' nýtt' : '') +
                (a.reikningar.length ? '<br>🧾 ' + esc(a.reikningar.join(', ')) : '') +
              '</div>' +
            '</div>';
          }).join('');
          const radir = f.map(x => {
            const t = new Date(x.ts);
            const klst = String(t.getHours()).padStart(2, '0') + ':' + String(t.getMinutes()).padStart(2, '0');
            const teg = [x.talning.yfirferd ? x.talning.yfirferd + '× yfirferð' : '',
                         x.talning.hledsla ? x.talning.hledsla + '× hleðsla' : '',
                         x.talning.nytt ? x.talning.nytt + '× nýtt' : ''].filter(Boolean).join(' · ');
            return '<div style="display:flex;gap:10px;align-items:baseline;padding:6px 0;border-bottom:1px solid #eef1f5">' +
              '<span style="font-variant-numeric:tabular-nums;color:' + INK3 + ';font-size:11.5px;min-width:38px">' + klst + '</span>' +
              '<span style="flex:1;color:' + INK + ';font-size:12.5px">' + esc(nafnFyrirtaekis(x.coId)) +
                (teg ? ' <span style="color:' + INK2 + '">— ' + esc(teg) + '</span>' : '') +
                (x.uttektardagur ? ' <span style="color:' + INK3 + ';font-size:11px">(úttekt ' + esc(x.uttektardagur) + ')</span>' : '') +
              '</span>' +
              '<span style="color:' + INK3 + ';font-size:11.5px">' + esc(x.madur) + (x.laest ? ' 🔒' : '') + '</span>' +
            '</div>';
          }).join('');
          return secHdr('🧰 ÚTTEKTARFERÐIR', f.length + ' ' + (f.length === 1 ? 'ferð' : 'ferðir')) +
            '<div style="font-size:11.5px;color:' + INK3 + ';margin:-6px 0 9px">Tíminn er SÍÐASTA SNERTING á ferðinni, ekki endilega vinnudagurinn — reikningur er oft gerður síðar.</div>' +
            '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:10px">' + bitar + '</div>' +
            '<div style="' + CARD + ';padding:8px 14px 12px;margin-bottom:18px">' + radir + '</div>';
        })() +

        // rakningar-listi
        secHdr('🧭 RAKNING DAGSINS', feed.length + ' atriði') +
        '<div style="' + CARD + ';padding:8px 14px 12px">' + feedHtml + '</div>' +
      '</div>';

    // wire
    const bind = (id, fn) => { const el = document.getElementById(id); if (el) el.addEventListener('click', fn); };
    // 18.09.2026 — ÖRVARNAR SVÖRUÐU EKKI. Mælt: eftir smell á ‹ var
    // merkimiðinn vaktaður á 200 ms fresti í 6 sek og breyttist ALLS EKKI.
    // Í öðrum keyrslum hoppaði hann tvo eða þrjá daga. Sama aðgerð, ólík
    // útkoma — það er „random" eins og notandinn upplifir það.
    //
    // Rótin: `_day` var uppfært en skjárinn beið eftir `reload()`, sem er
    // ósamstillt og skarast við 60 sek púlsinn og fyrri smelli. Sú keyrsla
    // sem TEIKNAÐI síðast réð, ekki sá dagur sem var BEÐIÐ UM síðast.
    //
    // `faraADag` teiknar STRAX með nýja deginum og sækir svo gögnin. Þá sést
    // alltaf sá dagur sem smellt var á, hversu hægt sem netið er.
    const faraADag = (nyr) => {
      if (nyr === _day) return;
      _day = nyr;
      _rows = []; _ferdir = [];      // ekki sýna gærdagsvirkni undir nýrri dagsetningu
      render();                      // dagurinn birtist samstundis
      reload();                      // gögnin koma á eftir
    };
    bind('_al-prev', () => faraADag(shiftDay(_day, -1)));
    bind('_al-next', () => { if (_day !== todayStr()) faraADag(shiftDay(_day, 1)); });
    bind('_al-today', () => faraADag(todayStr()));
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

  /* 18.09.2026 — DAGSETNINGARÖRVARNAR HEGÐUÐU SÉR „RANDOM".
   * Mælt, fjórir smellir á ‹ með 4 sek millibili:
   *     #1  Í gær (17)  →  Sep 15     hoppaði yfir 16.
   *     #2  Sep 15      →  Sep 15     ekkert
   *     #3  Sep 15      →  Sep 15     ekkert
   *     #4  Sep 15      →  Sep 12     stökk þrjá daga
   *
   * `_day` færðist rétt í hvert sinn. Vandinn var að reload() er ósamstillt og
   * keyrslur skarast: sú sem KLÁRAST síðast vann, ekki sú sem var BEÐIÐ UM
   * síðast. Hæg fyrirspurn skrifaði því yfir nýrri og skjárinn sat á gömlum
   * degi — þangað til næsti smellur „stökk" mörgum dögum.
   *
   * Kynslóðateljari: hver keyrsla tekur númer og hættir hljóðlega ef nýrri er
   * hafin. Skjárinn sýnir þá alltaf þann dag sem síðast var beðið um.
   */
  async function reload() {
    const root = document.getElementById('_al-root');
    if (root && !root.innerHTML) root.innerHTML = '<div style="padding:40px;text-align:center;color:#a9b2bf">⏳ Sæki gögn…</div>';
    // 18.09.2026: hér stóð kynslóðavörn sem ÉG bætti við og tók svo út.
    // Hún leysti ekki vandann (það gerði tafarlaus teikning í `faraADag`) og
    // mælingin sýndi að hún stöðvaði gagnahleðsluna: ferðakaflinn sagði
    // „0 ferðir" á 16.09 þótt sama sía, keyrð handvirkt með sama degi, fyndi
    // ferðina. Tafarlausa teikningin gerir skjáinn réttan óháð því hvaða
    // hleðsla klárast síðast — það var allt sem þurfti.
    await Promise.all([load(), loadCompanies(), loadWorkshop()]);
    _ferdir = ferdirDagsins();            // 18.09.2026 — sjá ferdirDagsins()
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
