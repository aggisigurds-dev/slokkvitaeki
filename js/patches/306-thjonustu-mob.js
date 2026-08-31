/* === ÞJÓNUSTUBORÐ — Mobile (patch 306) ===
 * Einlægur farsíma-útgáfa af þjónustuborðinu (patch 231).
 * Les sömu gögn úr `thjonustubeidni` — engin tvítekning, sama tafla.
 *
 * Hönnun:
 *  - Ein dálkur, snertivæn spjöld (44px+ touch targets)
 *  - Flipa-röð neðst: Allt · ★ · Í dag · Lokið
 *  - Smella á spjald → neðri blað (bottom sheet) með öllum upplýsingum
 *  - Stöðu-framfær með stórum takka; áríðandi toggle; ritanlegur nótu-reitur
 *  - FAB (+ takki) neðst til hægri — hrað-skráning
 *  - Flipa-röð EFST: flokka-síur (Tilboð / Þjónusta / Brunakerfi / Rukkun / Samskipti)
 *
 * Page key: 'thjonustubord' (slug laus frá 2026-08-06 þegar crm-board fékk
 * 'samskiptabord'). Skráð í 261-app-profiles.js PAGES lista.
 */
(() => {
  if (window.__thjonustumobInstalled) return;
  window.__thjonustumobInstalled = true;

  const VIEW_ID = 'view-thjonustubord';
  const NAV_KEY = 'thjonustubord';

  // ── helpers ─────────────────────────────────────────────────────────────
  function getSB() { return (window.DB && window.DB.sb) || null; }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  function toast(m) { if (window.Toast && Toast.show) Toast.show(m); else console.log('[thjonustu-mob]', m); }
  function nowIso() { return new Date().toISOString(); }
  function fmtDate(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d)) return '';
    return String(d.getDate()).padStart(2, '0') + '.' + String(d.getMonth() + 1).padStart(2, '0') + '.' + d.getFullYear();
  }
  function currentUser() {
    try {
      const p = window.UserAuth && UserAuth.getProfile && UserAuth.getProfile();
      if (p && p.nafn) return p.nafn;
      const u = window.UserAuth && UserAuth.getUser && UserAuth.getUser();
      if (u && u.email) return u.email.split('@')[0];
    } catch (_) {}
    return 'Slökkvitæki';
  }

  // ── reference data (sama og patch 231) ──────────────────────────────────
  const TYPES = {
    tilbod:       { label: 'Tilboð',    emoji: '💰', color: '#1d4ed8' },
    email:        { label: 'Póstur',    emoji: '✉️', color: '#7c3aed' },
    skyrsla:      { label: 'Skýrsla',   emoji: '📄', color: '#0891b2' },
    heimsokn:     { label: 'Heimsókn',  emoji: '🚐', color: '#16a34a' },
    hringja:      { label: 'Hringja',   emoji: '📞', color: '#d97706' },
    samningur:    { label: 'Samningur', emoji: '📝', color: '#16a34a' },
    skjalabeidni: { label: 'Skjöl',     emoji: '📁', color: '#7c3aed' },
    verkdagbok:   { label: 'Verkdagbók',emoji: '📓', color: '#92400e' },
    annad:        { label: 'Annað',     emoji: '•',  color: '#64748b' },
    // legacy
    skodun_tilbod: { label: 'Skoðun & tilboð', emoji: '💰', color: '#1d4ed8' },
    nyr_samningur: { label: 'Nýr samningur',   emoji: '📝', color: '#16a34a' }
  };
  function typeDef(t) { return TYPES[t] || TYPES.annad; }

  const FLOKKAR = {
    tilbod:     { label: 'Tilboð',     emoji: '💰', color: '#1d4ed8', rail: '#2f5fe0' },
    thjonusta:  { label: 'Þjónusta',   emoji: '🔧', color: '#0d9488', rail: '#22b063' },
    brunakerfi: { label: 'Brunakerfi', emoji: '🔥', color: '#ea580c', rail: '#df2c2c' },
    rukkun:     { label: 'Rukkun',     emoji: '💸', color: '#be123c', rail: '#be123c' },
    samskipti:  { label: 'Samskipti',  emoji: '📞', color: '#d97706', rail: '#e0a93e' }
  };
  function flokkDef(f) { return FLOKKAR[f] || { label: 'Annað', emoji: '•', color: '#64748b', rail: '#8a929e' }; }

  const TAGS = {
    draft:              { label: 'Draft',             emoji: '📝', color: '#b45309' },
    gera_tilbod:        { label: 'Gera tilboð',       emoji: '📄', color: '#7c3aed' },
    thjonustusamningur: { label: 'Þjónustusamningur', emoji: '📝', color: '#16a34a' },
    bokhald:            { label: 'Bókhald',           emoji: '📊', color: '#1d4ed8' },
    kvortun:            { label: 'Kvörtun',           emoji: '😠', color: '#dc2626' },
    hringja:            { label: 'Hringja',           emoji: '📞', color: '#d97706' },
    brunakerfi:         { label: 'Brunakerfi',        emoji: '🔥', color: '#ea580c' },
    eftir_ad_rukka:     { label: 'Eftir að rukka',    emoji: '💰', color: '#be123c' },
    thjonusta:          { label: 'Þjónusta',          emoji: '🔧', color: '#0d9488' },
    senda_tolvupost:    { label: 'Senda tölvupóst',   emoji: '✉️', color: '#0369a1' },
    senda_skyrslur:     { label: 'Senda skýrslur',    emoji: '📑', color: '#4338ca' }
  };

  const STATUSES = {
    nytt:      { label: 'Ný',        color: '#2563eb', bg: '#eff6ff' },
    i_vinnslu: { label: 'Í vinnslu', color: '#7c3aed', bg: '#f5f3ff' },
    bedid:     { label: 'Beðið',     color: '#d97706', bg: '#fffbeb' },
    tilbuid:   { label: 'Tilbúið',   color: '#16a34a', bg: '#f0fdf4' },
    lokad:     { label: 'Lokað',     color: '#6b7280', bg: '#f9fafb' }
  };
  const STATUS_ORDER = ['nytt', 'i_vinnslu', 'bedid', 'tilbuid', 'lokad'];
  function statusDef(s) { return STATUSES[s] || STATUSES.nytt; }
  function nextStatus(s) {
    const i = STATUS_ORDER.indexOf(s);
    return STATUS_ORDER[(i + 1) % STATUS_ORDER.length];
  }

  function rowTags(r) {
    let t = r && r.tags;
    if (typeof t === 'string') { try { t = JSON.parse(t); } catch (_) { t = []; } }
    return Array.isArray(t) ? t : [];
  }

  // ── state ────────────────────────────────────────────────────────────────
  const state = {
    items: [], loading: false,
    tab: 'allt',       // allt | aridandi | idagg | lokad
    flokk: '',         // '' | tilbod | thjonusta | brunakerfi | rukkun | samskipti
    selId: null,       // id of selected item (bottom sheet)
    sheetEdit: {},     // edits in sheet before save
    saving: false,
    adding: false,
    addTitle: '',
    addType: 'annad'
  };

  // ── load ─────────────────────────────────────────────────────────────────
  async function load() {
    const SB = getSB();
    if (!SB) {
      if ((load._w = (load._w || 0) + 1) <= 40) setTimeout(load, 250);
      return;
    }
    load._w = 0;
    state.loading = true; renderList();
    try {
      const r = await SB.from('thjonustubeidni').select('*').is('deleted_at', null)
        .order('created_at', { ascending: false }).range(0, 1499);
      state.items = (r.data || []).filter(x => x.type !== 'verkdagbok');
    } catch (e) { console.warn('[thjonustu-mob]', e); state.items = []; }
    state.loading = false;
    renderList();
    refreshBadge();
  }

  async function saveRow(id, patch) {
    const SB = getSB(); if (!SB) return;
    patch.updated_at = nowIso();
    await SB.from('thjonustubeidni').update(patch).eq('id', id);
    const idx = state.items.findIndex(x => x.id == id);
    if (idx !== -1) state.items[idx] = Object.assign({}, state.items[idx], patch);
  }

  async function quickAdd(title, type) {
    title = (title || '').trim();
    if (!title) return;
    const SB = getSB(); if (!SB) { toast('Engin gagnabankatenging'); return; }
    const obj = {
      title, type: type || 'annad', status: 'nytt', priority: 'venjulegur',
      tags: [], source: 'beint', important: false,
      created_at: nowIso(), created_by: currentUser(), updated_at: nowIso()
    };
    try {
      const r = await SB.from('thjonustubeidni').insert(obj).select().single();
      if (r.error) throw r.error;
      state.items.unshift(r.data);
      state.selId = r.data.id;
      state.sheetEdit = {};
      renderList();
      renderSheet();
    } catch (e) { toast('Náði ekki að bæta við: ' + (e.message || e)); }
  }

  // ── badge ────────────────────────────────────────────────────────────────
  function refreshBadge() {
    const open = state.items.filter(x => x.status !== 'lokad').length;
    if (window.NavBadge && NavBadge.set) NavBadge.set(NAV_KEY, open || '');
    // Update nav item badge if switchView system exposes it
    const el = document.querySelector('[data-nav="' + NAV_KEY + '"] .nav-badge, [data-view="' + VIEW_ID + '"] .nav-badge');
    if (el) el.textContent = open || '';
  }

  // ── filter & sort ────────────────────────────────────────────────────────
  function isOverdue(r) {
    const d = r.due_at ? new Date(r.due_at) : null;
    if (!d || isNaN(d)) return false;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return d < today;
  }
  function isDueToday(r) {
    const d = r.due_at ? new Date(r.due_at) : null;
    if (!d || isNaN(d)) return false;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const dd = new Date(d); dd.setHours(0, 0, 0, 0);
    return dd.getTime() === today.getTime();
  }

  function filtered() {
    let rows = state.items.slice();
    // tab filter
    if (state.tab === 'aridandi') rows = rows.filter(r => r.important && r.status !== 'lokad');
    else if (state.tab === 'idagg') rows = rows.filter(r => (isOverdue(r) || isDueToday(r)) && r.status !== 'lokad');
    else if (state.tab === 'lokad') rows = rows.filter(r => r.status === 'lokad');
    else rows = rows.filter(r => r.status !== 'lokad');
    // flokkur filter
    if (state.flokk && FLOKKAR[state.flokk]) rows = rows.filter(r => r.flokkur === state.flokk);
    // sort: áríðandi first, then overdue, then by created_at
    rows.sort((a, b) => {
      if (a.important !== b.important) return a.important ? -1 : 1;
      const ao = isOverdue(a) || isDueToday(a), bo = isOverdue(b) || isDueToday(b);
      if (ao !== bo) return ao ? -1 : 1;
      return new Date(b.created_at) - new Date(a.created_at);
    });
    return rows;
  }

  // ── render ────────────────────────────────────────────────────────────────
  const ROOT = '#' + VIEW_ID;

  function render() {
    const el = document.getElementById(VIEW_ID);
    if (!el) return;
    el.innerHTML =
      '<div id="tbm-wrap" style="' +
        'display:flex;flex-direction:column;height:100%;background:#f3f4f6;' +
        'font-family:-apple-system,BlinkMacSystemFont,\"Segoe UI\",sans-serif;' +
        'position:relative;overflow:hidden">' +
        headerHTML() +
        flokkTabsHTML() +
        tabBarHTML() +
        '<div id="tbm-list" style="flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch;padding:12px 14px 80px">' +
        '</div>' +
        fabHTML() +
        '<div id="tbm-sheet-overlay" style="display:none;position:absolute;inset:0;background:rgba(0,0,0,.45);z-index:50" onclick="window.__tbmCloseSheet()"></div>' +
        '<div id="tbm-sheet" style="display:none;position:absolute;bottom:0;left:0;right:0;z-index:51;background:#fff;border-radius:20px 20px 0 0;box-shadow:0 -8px 30px rgba(0,0,0,.18);max-height:88%;overflow-y:auto"></div>' +
        '<div id="tbm-add-bar" style="display:none;position:absolute;bottom:0;left:0;right:0;z-index:52;background:#fff;border-top:1px solid #e5e7eb;padding:12px 14px 20px">' +
          addBarHTML() +
        '</div>' +
      '</div>';
    renderList();
    attachEvents();
  }

  function headerHTML() {
    const open = state.items.filter(r => r.status !== 'lokad').length;
    return '<div style="background:#fff;border-bottom:1px solid #e5e7eb;padding:14px 16px 10px;display:flex;align-items:center;gap:10px">' +
      '<span style="font-size:22px;font-weight:800;color:#111827;flex:1">🔧 Þjónustuborð</span>' +
      (open ? '<span style="font-size:13px;font-weight:700;color:#6b7280;background:#f3f4f6;border-radius:99px;padding:3px 10px">' + open + ' opin</span>' : '') +
      '<button onclick="window.__tbmRefresh()" style="border:none;background:none;cursor:pointer;font-size:18px;color:#6b7280;padding:4px 6px;line-height:1" title="Endurhlaða">↻</button>' +
    '</div>';
  }

  function flokkTabsHTML() {
    const tabs = [{ k: '', label: 'Allt' }].concat(Object.keys(FLOKKAR).map(k => ({ k, label: FLOKKAR[k].emoji + ' ' + FLOKKAR[k].label })));
    return '<div id="tbm-flokk-tabs" style="background:#fff;border-bottom:1px solid #f0f0f0;overflow-x:auto;white-space:nowrap;-webkit-overflow-scrolling:touch;padding:0 10px">' +
      tabs.map(t => {
        const on = state.flokk === t.k;
        const col = t.k ? flokkDef(t.k).color : '#374151';
        return '<button data-tbmflokk="' + esc(t.k) + '" style="border:none;background:none;cursor:pointer;display:inline-block;padding:10px 12px;font-size:13px;font-weight:' + (on ? '700' : '500') + ';color:' + (on ? col : '#9ca3af') + ';border-bottom:2px solid ' + (on ? col : 'transparent') + ';white-space:nowrap">' + esc(t.label) + '</button>';
      }).join('') +
    '</div>';
  }

  function tabBarHTML() {
    const tabs = [
      { k: 'allt',      label: 'Allt',     count: state.items.filter(r => r.status !== 'lokad').length },
      { k: 'aridandi',  label: '★ Áríðandi', count: state.items.filter(r => r.important && r.status !== 'lokad').length },
      { k: 'idagg',     label: '📅 Í dag',  count: state.items.filter(r => (isOverdue(r) || isDueToday(r)) && r.status !== 'lokad').length },
      { k: 'lokad',     label: '✓ Lokið',  count: state.items.filter(r => r.status === 'lokad').length }
    ];
    return '<div id="tbm-tabs" style="background:#fff;border-bottom:1px solid #e5e7eb;display:flex">' +
      tabs.map(t => {
        const on = state.tab === t.k;
        return '<button data-tbmtab="' + esc(t.k) + '" style="flex:1;border:none;background:none;cursor:pointer;padding:9px 4px;font-size:12px;font-weight:' + (on ? '700' : '500') + ';color:' + (on ? '#1d4ed8' : '#6b7280') + ';border-bottom:2px solid ' + (on ? '#1d4ed8' : 'transparent') + ';white-space:nowrap">' +
          esc(t.label) + (t.count ? ' <span style="font-size:10px;background:' + (on ? '#1d4ed8' : '#e5e7eb') + ';color:' + (on ? '#fff' : '#6b7280') + ';border-radius:99px;padding:1px 5px">' + t.count + '</span>' : '') +
        '</button>';
      }).join('') +
    '</div>';
  }

  function fabHTML() {
    return '<button id="tbm-fab" onclick="window.__tbmShowAdd()" style="' +
      'position:absolute;bottom:20px;right:18px;z-index:40;' +
      'width:54px;height:54px;border-radius:27px;border:none;cursor:pointer;' +
      'background:linear-gradient(145deg,#2563eb,#1d4ed8);color:#fff;' +
      'font-size:26px;line-height:1;' +
      'box-shadow:0 4px 16px rgba(37,99,235,.5);' +
      'display:flex;align-items:center;justify-content:center">+</button>';
  }

  function addBarHTML() {
    const types = ['annad', 'tilbod', 'email', 'heimsokn', 'hringja'];
    return '<div style="display:flex;align-items:center;gap:8px">' +
      '<input id="tbm-add-input" type="text" placeholder="Nýtt mál — titill…" ' +
        'style="flex:1;border:1px solid #d1d5db;border-radius:10px;padding:10px 12px;font-size:15px;outline:none" ' +
        'onkeydown="if(event.key===\'Enter\'){event.preventDefault();window.__tbmQuickAdd()}" />' +
      '<button onclick="window.__tbmQuickAdd()" style="background:#1d4ed8;color:#fff;border:none;border-radius:10px;padding:10px 16px;font-weight:700;font-size:15px;cursor:pointer">+</button>' +
      '<button onclick="window.__tbmHideAdd()" style="background:#f3f4f6;color:#374151;border:none;border-radius:10px;padding:10px 12px;font-size:15px;cursor:pointer">✕</button>' +
    '</div>' +
    '<div style="display:flex;gap:6px;margin-top:8px;overflow-x:auto">' +
      types.map(k => {
        const d = typeDef(k);
        const on = state.addType === k;
        return '<button data-tbmaddtype="' + esc(k) + '" style="white-space:nowrap;border:1px solid ' + (on ? d.color : '#e5e7eb') + ';background:' + (on ? d.color + '14' : '#fff') + ';color:' + (on ? d.color : '#6b7280') + ';border-radius:99px;padding:5px 12px;font-size:12px;font-weight:600;cursor:pointer">' + d.emoji + ' ' + esc(d.label) + '</button>';
      }).join('') +
    '</div>';
  }

  function renderList() {
    const el = document.getElementById('tbm-list');
    if (!el) return;
    if (state.loading) {
      el.innerHTML = '<div style="text-align:center;padding:40px;color:#9ca3af;font-size:15px">Hleð…</div>';
      return;
    }
    const rows = filtered();
    if (!rows.length) {
      el.innerHTML = '<div style="text-align:center;padding:60px 20px;color:#9ca3af">' +
        '<div style="font-size:44px;margin-bottom:12px;opacity:.3">🔧</div>' +
        '<div style="font-size:15px;font-weight:600">Engin mál hér</div>' +
        '<div style="font-size:13px;margin-top:6px">Ýttu á + til að bæta við</div>' +
      '</div>';
      return;
    }
    el.innerHTML = rows.map(cardHTML).join('');
  }

  function cardHTML(r) {
    const st = statusDef(r.status);
    const fd = r.flokkur ? flokkDef(r.flokkur) : null;
    const railCol = fd ? fd.rail : '#e5e7eb';
    const td = typeDef(r.type);
    const tags = rowTags(r).filter(t => TAGS[t]).slice(0, 3);
    const due = r.due_at ? new Date(r.due_at) : null;
    const overdue = due && isOverdue(r);
    const today = due && isDueToday(r);
    const isSelected = String(state.selId) === String(r.id);

    let dueStr = '';
    if (due && !isNaN(due)) {
      if (overdue) dueStr = '<span style="color:#dc2626;font-weight:700">⚠ ' + fmtDate(r.due_at) + '</span>';
      else if (today) dueStr = '<span style="color:#d97706;font-weight:700">Í dag</span>';
      else dueStr = '<span style="color:#6b7280">' + fmtDate(r.due_at) + '</span>';
    }

    return '<div data-tbmcard="' + esc(r.id) + '" style="' +
      'background:#fff;border-radius:12px;margin-bottom:10px;' +
      'border-left:4px solid ' + railCol + ';' +
      'box-shadow:' + (isSelected ? '0 0 0 2px #2563eb,0 4px 12px rgba(0,0,0,.12)' : '0 2px 8px rgba(0,0,0,.07)') + ';' +
      'cursor:pointer;overflow:hidden;transition:box-shadow .15s">' +
      // top row: status pill + date + star
      '<div style="display:flex;align-items:center;gap:8px;padding:10px 12px 6px">' +
        '<span style="font-size:11px;font-weight:700;padding:3px 9px;border-radius:99px;background:' + st.bg + ';color:' + st.color + ';white-space:nowrap">' + esc(st.label) + '</span>' +
        '<span style="flex:1;font-size:11px">' + dueStr + '</span>' +
        (r.important ? '<span style="color:#eab308;font-size:16px;line-height:1">★</span>' : '') +
        '<span style="font-size:11px;color:#d1d5db">' + fmtDate(r.created_at) + '</span>' +
      '</div>' +
      // body: customer + title
      '<div style="padding:0 12px 8px">' +
        (r.customer_nafn ? '<div style="font-size:14px;font-weight:700;color:#111827;line-height:1.3">' + esc(r.customer_nafn) + '</div>' : '') +
        '<div style="font-size:13px;color:' + (r.customer_nafn ? '#4b5563' : '#111827') + ';font-weight:' + (r.customer_nafn ? '400' : '600') + ';line-height:1.4;margin-top:2px">' + esc(r.title || '—') + '</div>' +
        (r.notes ? '<div style="font-size:12px;color:#9ca3af;margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(r.notes.substring(0, 80)) + '</div>' : '') +
      '</div>' +
      // footer: type chip + tags
      '<div style="display:flex;align-items:center;gap:6px;padding:6px 12px 10px;flex-wrap:wrap">' +
        '<span style="font-size:11px;color:' + td.color + ';background:' + td.color + '14;border:1px solid ' + td.color + '33;border-radius:99px;padding:2px 8px;white-space:nowrap">' + td.emoji + ' ' + esc(td.label) + '</span>' +
        tags.map(t => {
          const d = TAGS[t];
          return '<span style="font-size:11px;color:' + d.color + ';background:' + d.color + '14;border-radius:99px;padding:2px 8px;white-space:nowrap">' + d.emoji + ' ' + esc(d.label) + '</span>';
        }).join('') +
        (fd ? '<span style="font-size:11px;color:' + fd.color + ';background:' + fd.color + '14;border-radius:99px;padding:2px 8px;white-space:nowrap">' + fd.emoji + ' ' + esc(fd.label) + '</span>' : '') +
      '</div>' +
    '</div>';
  }

  // ── bottom sheet ──────────────────────────────────────────────────────────
  function openSheet(id) {
    state.selId = id;
    state.sheetEdit = {};
    renderList();
    renderSheet();
    const overlay = document.getElementById('tbm-sheet-overlay');
    const sheet = document.getElementById('tbm-sheet');
    if (overlay) overlay.style.display = 'block';
    if (sheet) sheet.style.display = 'block';
    // Also load attachments for this item
    loadSheetAttachments(id);
  }

  window.__tbmCloseSheet = function () {
    state.selId = null;
    state.sheetEdit = {};
    const overlay = document.getElementById('tbm-sheet-overlay');
    const sheet = document.getElementById('tbm-sheet');
    if (overlay) overlay.style.display = 'none';
    if (sheet) { sheet.style.display = 'none'; sheet.innerHTML = ''; }
    renderList();
  };

  const sheetAtts = {}; // id → attachment rows

  async function loadSheetAttachments(id) {
    const SB = getSB(); if (!SB) return;
    const { data } = await SB.from('thjonustubeidni_files').select('*').eq('beidni_id', id).order('created_at');
    sheetAtts[id] = data || [];
    if (String(state.selId) === String(id)) renderSheet();
  }

  function renderSheet() {
    const sheet = document.getElementById('tbm-sheet');
    if (!sheet || !state.selId) return;
    const r = state.items.find(x => String(x.id) === String(state.selId));
    if (!r) { sheet.innerHTML = ''; return; }
    const fd = r.flokkur ? flokkDef(r.flokkur) : null;
    const railCol = fd ? fd.rail : '#e5e7eb';
    const st = statusDef(r.status);
    const ns = nextStatus(r.status);
    const nst = statusDef(ns);
    const atts = sheetAtts[r.id] || [];

    const notesVal = state.sheetEdit.notes !== undefined ? state.sheetEdit.notes : (r.notes || '');
    const titleVal = state.sheetEdit.title !== undefined ? state.sheetEdit.title : (r.title || '');

    sheet.innerHTML =
      // drag handle
      '<div style="display:flex;justify-content:center;padding:10px 0 4px">' +
        '<div style="width:36px;height:4px;background:#e5e7eb;border-radius:99px"></div>' +
      '</div>' +
      // header
      '<div style="border-left:4px solid ' + railCol + ';padding:12px 16px;margin:0 16px 12px;border-radius:0 8px 8px 0;background:#f9fafb">' +
        '<div style="display:flex;align-items:flex-start;gap:8px">' +
          '<div style="flex:1">' +
            (r.customer_nafn ? '<div style="font-size:12px;font-weight:600;color:#6b7280;margin-bottom:4px">' + esc(r.customer_nafn) + '</div>' : '') +
            '<div id="tbm-sh-title-view" style="font-size:17px;font-weight:700;color:#111827;line-height:1.3;cursor:pointer" onclick="window.__tbmEditTitle()" title="Smella til að breyta">' + esc(r.title || '—') + ' <span style="font-size:12px;color:#d1d5db">✏</span></div>' +
            '<div id="tbm-sh-title-edit" style="display:none;margin-top:4px">' +
              '<input id="tbm-sh-title-inp" type="text" value="' + esc(titleVal) + '" style="width:100%;box-sizing:border-box;border:1px solid #2563eb;border-radius:8px;padding:8px 10px;font-size:16px;font-weight:700;outline:none" />' +
            '</div>' +
          '</div>' +
          '<button onclick="window.__tbmCloseSheet()" style="border:none;background:none;cursor:pointer;font-size:22px;color:#9ca3af;padding:0 4px;line-height:1;margin-left:4px">✕</button>' +
        '</div>' +
      '</div>' +
      // status + important row
      '<div style="display:flex;align-items:center;gap:10px;padding:0 16px 12px">' +
        // current status
        '<span style="font-size:12px;font-weight:700;padding:5px 12px;border-radius:99px;background:' + st.bg + ';color:' + st.color + '">' + esc(st.label) + '</span>' +
        // advance button
        (r.status !== 'lokad' ?
          '<button onclick="window.__tbmAdvance(\'' + esc(r.id) + '\')" style="flex:1;border:1px solid ' + nst.color + ';background:' + nst.bg + ';color:' + nst.color + ';border-radius:99px;padding:5px 12px;font-size:12px;font-weight:700;cursor:pointer">▶ ' + esc(nst.label) + '</button>' :
          '<button onclick="window.__tbmAdvance(\'' + esc(r.id) + '\')" style="flex:1;border:1px solid #6b7280;background:#f9fafb;color:#6b7280;border-radius:99px;padding:5px 12px;font-size:12px;font-weight:700;cursor:pointer">↺ Enduropna</button>'
        ) +
        // important toggle
        '<button onclick="window.__tbmToggleStar(\'' + esc(r.id) + '\')" style="border:none;background:none;cursor:pointer;font-size:22px;padding:2px;line-height:1;color:' + (r.important ? '#eab308' : '#d1d5db') + '">' + (r.important ? '★' : '☆') + '</button>' +
      '</div>' +
      // meta: type, due, flokkur
      '<div style="padding:0 16px 12px;display:flex;gap:8px;flex-wrap:wrap">' +
        sheetSelectHTML(r, 'type', Object.keys(TYPES).map(k => ({ v: k, label: typeDef(k).emoji + ' ' + typeDef(k).label })), r.type) +
        sheetSelectHTML(r, 'flokkur', [{ v: '', label: '— Flokkur' }].concat(Object.keys(FLOKKAR).map(k => ({ v: k, label: flokkDef(k).emoji + ' ' + flokkDef(k).label }))), r.flokkur || '') +
        (r.due_at ? '<span style="font-size:12px;color:#6b7280;padding:5px 0">' + (isOverdue(r) ? '⚠ ' : '') + fmtDate(r.due_at) + '</span>' : '') +
      '</div>' +
      // notes
      '<div style="padding:0 16px 12px">' +
        '<label style="font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px">📝 Nótur</label>' +
        '<textarea id="tbm-sh-notes" placeholder="Athugasemdir…" style="width:100%;box-sizing:border-box;border:1px solid #e5e7eb;border-radius:10px;padding:10px 12px;font-size:14px;min-height:80px;resize:vertical;outline:none;font-family:inherit" oninput="window.__tbmEditNotes(this.value)">' + esc(notesVal) + '</textarea>' +
      '</div>' +
      // tags
      '<div style="padding:0 16px 12px">' +
        '<label style="font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:6px">🏷 Merki</label>' +
        '<div style="display:flex;flex-wrap:wrap;gap:6px">' +
          Object.keys(TAGS).map(t => {
            const d = TAGS[t], on = rowTags(r).indexOf(t) !== -1;
            return '<button data-tbmtag="' + esc(t) + '" data-tbmtagid="' + esc(r.id) + '" style="border:1px solid ' + (on ? d.color : '#e5e7eb') + ';background:' + (on ? d.color + '18' : '#fff') + ';color:' + (on ? d.color : '#9ca3af') + ';border-radius:99px;padding:5px 12px;font-size:12px;font-weight:600;cursor:pointer">' + d.emoji + ' ' + esc(d.label) + '</button>';
          }).join('') +
        '</div>' +
      '</div>' +
      // attachments
      '<div style="padding:0 16px 12px">' +
        '<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">' +
          '<label style="font-size:12px;font-weight:600;color:#374151">📎 Fylgiskjöl</label>' +
          '<label style="font-size:12px;color:#2563eb;cursor:pointer;font-weight:600">' +
            '＋ Hlaða inn' +
            '<input type="file" multiple style="display:none" onchange="window.__tbmUpload(event,\'' + esc(r.id) + '\')" />' +
          '</label>' +
        '</div>' +
        (atts.length ?
          atts.map(a =>
            '<div style="display:flex;align-items:center;gap:8px;padding:6px 10px;background:#f9fafb;border-radius:8px;margin-bottom:4px">' +
              '<a href="' + esc(a.url || '') + '" target="_blank" style="flex:1;font-size:12px;color:#2563eb;text-decoration:none;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">📎 ' + esc(a.name) + '</a>' +
              '<button onclick="window.__tbmDelAtt(\'' + esc(a.id) + '\',\'' + esc(a.path || '') + '\',\'' + esc(r.id) + '\')" style="border:none;background:none;color:#ef4444;cursor:pointer;font-size:14px;padding:2px 4px">✕</button>' +
            '</div>'
          ).join('') :
          '<div style="font-size:12px;color:#9ca3af;padding:4px 0">Engin fylgiskjöl</div>'
        ) +
      '</div>' +
      // save / delete footer
      '<div style="padding:12px 16px 30px;border-top:1px solid #f3f4f6;display:flex;gap:10px">' +
        '<button id="tbm-save-btn" onclick="window.__tbmSave()" style="flex:1;background:#2563eb;color:#fff;border:none;border-radius:12px;padding:13px;font-size:15px;font-weight:700;cursor:pointer">Vista breytingar</button>' +
        '<button onclick="window.__tbmDelete(\'' + esc(r.id) + '\')" style="background:#fef2f2;color:#dc2626;border:1px solid #fecaca;border-radius:12px;padding:13px 16px;font-size:15px;cursor:pointer">🗑</button>' +
      '</div>';
  }

  function sheetSelectHTML(r, field, opts, currentVal) {
    return '<select data-tbmfield="' + esc(field) + '" data-tbmfieldid="' + esc(r.id) + '" style="border:1px solid #e5e7eb;border-radius:99px;padding:4px 10px;font-size:12px;color:#374151;background:#fff;cursor:pointer;outline:none">' +
      opts.map(o => '<option value="' + esc(o.v) + '"' + (o.v === currentVal ? ' selected' : '') + '>' + esc(o.label) + '</option>').join('') +
    '</select>';
  }

  // ── sheet actions ─────────────────────────────────────────────────────────
  window.__tbmEditTitle = function () {
    const view = document.getElementById('tbm-sh-title-view');
    const edit = document.getElementById('tbm-sh-title-edit');
    if (view) view.style.display = 'none';
    if (edit) { edit.style.display = 'block'; const inp = document.getElementById('tbm-sh-title-inp'); if (inp) inp.focus(); }
  };
  window.__tbmEditNotes = function (v) { state.sheetEdit.notes = v; };

  window.__tbmAdvance = async function (id) {
    const r = state.items.find(x => String(x.id) === String(id));
    if (!r) return;
    const ns = nextStatus(r.status);
    await saveRow(id, { status: ns });
    if (ns === 'lokad') {
      window.__tbmCloseSheet();
    } else {
      renderSheet();
      renderList();
    }
    renderTabs();
  };

  window.__tbmToggleStar = async function (id) {
    const r = state.items.find(x => String(x.id) === String(id));
    if (!r) return;
    await saveRow(id, { important: !r.important });
    renderSheet();
    renderList();
  };

  window.__tbmSave = async function () {
    const id = state.selId;
    if (!id) return;
    const r = state.items.find(x => String(x.id) === String(id));
    if (!r) return;
    const patch = {};
    // title from input
    const inp = document.getElementById('tbm-sh-title-inp');
    if (inp) {
      const t = inp.value.trim();
      if (t && t !== r.title) patch.title = t;
    }
    // notes from edit state
    if (state.sheetEdit.notes !== undefined && state.sheetEdit.notes !== r.notes) patch.notes = state.sheetEdit.notes;
    if (!Object.keys(patch).length) { toast('Engar breytingar'); return; }
    const btn = document.getElementById('tbm-save-btn');
    if (btn) btn.textContent = 'Vistar…';
    await saveRow(id, patch);
    state.sheetEdit = {};
    if (btn) btn.textContent = 'Vista breytingar';
    toast('Vistað');
    renderSheet();
    renderList();
  };

  window.__tbmDelete = async function (id) {
    const delBeidniOk = (window.Confirm && Confirm.show) ? await Confirm.show('Eyða þessum beiðni?') : window.confirm('Eyða þessum beiðni?');
    if (!delBeidniOk) return;
    const SB = getSB(); if (!SB) return;
    await SB.from('thjonustubeidni').update({ deleted_at: nowIso() }).eq('id', id);
    state.items = state.items.filter(x => String(x.id) !== String(id));
    window.__tbmCloseSheet();
    renderList();
    refreshBadge();
    renderTabs();
  };

  // ── attachment handlers (reuse same bucket as patch 231) ──────────────────
  const ATT_BUCKET = 'verkbord-files';

  window.__tbmUpload = async function (ev, beidniId) {
    const f = ev.target && ev.target.files && ev.target.files[0];
    if (!f) return;
    ev.target.value = '';
    const SB = getSB(); if (!SB) return;
    toast('Hleð upp…');
    const safeName = f.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = String(beidniId) + '/' + Date.now() + '-' + safeName;
    const { error: upErr } = await SB.storage.from(ATT_BUCKET).upload(path, f, { contentType: f.type || 'application/octet-stream', upsert: false });
    if (upErr) { toast('Villa: ' + (upErr.message || upErr)); return; }
    const { data: urlData } = SB.storage.from(ATT_BUCKET).getPublicUrl(path);
    const { error: insErr } = await SB.from('thjonustubeidni_files').insert({
      beidni_id: Number(beidniId), name: f.name, path,
      url: urlData ? urlData.publicUrl : null,
      mime_type: f.type || null, size: f.size || null
    });
    if (insErr) { toast('Villa við skráningu: ' + (insErr.message || insErr)); return; }
    toast(f.name + ' vistað');
    await loadSheetAttachments(beidniId);
  };

  window.__tbmDelAtt = async function (attId, path, beidniId) {
    const delAttOk = (window.Confirm && Confirm.show) ? await Confirm.show('Eyða fylgiskjali?') : window.confirm('Eyða fylgiskjali?');
    if (!delAttOk) return;
    const SB = getSB(); if (!SB) return;
    if (path) await SB.storage.from(ATT_BUCKET).remove([path]);
    await SB.from('thjonustubeidni_files').delete().eq('id', attId);
    await loadSheetAttachments(beidniId);
  };

  // ── quick add ──────────────────────────────────────────────────────────────
  window.__tbmShowAdd = function () {
    const bar = document.getElementById('tbm-add-bar');
    const fab = document.getElementById('tbm-fab');
    if (bar) bar.style.display = 'block';
    if (fab) fab.style.display = 'none';
    setTimeout(() => { const inp = document.getElementById('tbm-add-input'); if (inp) inp.focus(); }, 50);
  };

  window.__tbmHideAdd = function () {
    const bar = document.getElementById('tbm-add-bar');
    const fab = document.getElementById('tbm-fab');
    if (bar) bar.style.display = 'none';
    if (fab) fab.style.display = 'flex';
  };

  window.__tbmQuickAdd = async function () {
    const inp = document.getElementById('tbm-add-input');
    const title = inp ? inp.value.trim() : '';
    if (!title) return;
    if (inp) inp.value = '';
    window.__tbmHideAdd();
    state.tab = 'allt';
    state.flokk = '';
    await quickAdd(title, state.addType);
    renderTabs();
    renderFlokkTabs();
  };

  window.__tbmRefresh = function () { load(); };

  // ── re-render helpers (partial, avoid full DOM rebuild) ───────────────────
  function renderTabs() {
    const el = document.getElementById('tbm-tabs');
    if (el) el.outerHTML = tabBarHTML();
  }

  function renderFlokkTabs() {
    const el = document.getElementById('tbm-flokk-tabs');
    if (el) el.outerHTML = flokkTabsHTML();
  }

  // ── event delegation ───────────────────────────────────────────────────────
  function attachEvents() {
    const wrap = document.getElementById('tbm-wrap');
    if (!wrap) return;

    wrap.addEventListener('click', function (e) {
      // tab switch
      const tab = e.target.closest('[data-tbmtab]');
      if (tab) { state.tab = tab.getAttribute('data-tbmtab'); renderList(); renderTabs(); return; }

      // flokkur switch
      const flokk = e.target.closest('[data-tbmflokk]');
      if (flokk) { state.flokk = flokk.getAttribute('data-tbmflokk'); renderList(); renderFlokkTabs(); return; }

      // card tap
      const card = e.target.closest('[data-tbmcard]');
      if (card) { openSheet(card.getAttribute('data-tbmcard')); return; }

      // add type toggle
      const addtype = e.target.closest('[data-tbmaddtype]');
      if (addtype) { state.addType = addtype.getAttribute('data-tbmaddtype'); const ab = document.getElementById('tbm-add-bar'); if (ab) ab.innerHTML = addBarHTML(); return; }

      // field change (type/flokkur selects in sheet)
      // tag toggle in sheet
      const tagBtn = e.target.closest('[data-tbmtag]');
      if (tagBtn) {
        const t = tagBtn.getAttribute('data-tbmtag');
        const id = tagBtn.getAttribute('data-tbmtagid');
        const r = state.items.find(x => String(x.id) === String(id));
        if (r) {
          const cur = rowTags(r);
          const next = cur.indexOf(t) !== -1 ? cur.filter(x => x !== t) : cur.concat([t]);
          saveRow(id, { tags: next }).then(() => renderSheet());
        }
        return;
      }
    });

    wrap.addEventListener('change', function (e) {
      const sel = e.target.closest('[data-tbmfield]');
      if (sel) {
        const field = sel.getAttribute('data-tbmfield');
        const id = sel.getAttribute('data-tbmfieldid');
        const val = sel.value;
        saveRow(id, { [field]: val }).then(() => { renderSheet(); renderList(); });
      }
    });
  }

  // ── nav registration ──────────────────────────────────────────────────────
  function show() {
    let el = document.getElementById(VIEW_ID);
    if (!el) {
      el = document.createElement('div');
      el.id = VIEW_ID;
      el.style.cssText = 'display:none;height:100%;overflow:hidden';
      document.body.appendChild(el);
    }
    if (window.switchView) {
      switchView(VIEW_ID);
    } else {
      document.querySelectorAll('[id^="view-"]').forEach(v => v.style.display = 'none');
      el.style.display = 'block';
    }
    render();
    if (!state.items.length && !state.loading) load();
  }

  function init() {
    if (window.NavRegistry && NavRegistry.register) {
      NavRegistry.register({
        key: NAV_KEY,
        label: '🔧 Þjónusta',
        viewId: VIEW_ID,
        show
      });
    } else if (window.registerNavItem) {
      registerNavItem(NAV_KEY, '🔧 Þjónusta', VIEW_ID, show);
    }
    // also register as a switch target
    if (window.registerView) registerView(VIEW_ID, show);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    setTimeout(init, 0);
  }
})();
