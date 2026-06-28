/* === VERKBORÐ v1 — eitt sameinað vinnuborð ===
 *
 * Sameinar gömlu efstu listana (Verkefni #145 · Þjónustuverk #172 ·
 * Beiðnir/Þjónustuver #182 · Eftirfylgni #194) + foldar Verkdagbók #04 inn —
 * í EITT hratt verkborð. Hugsað eins og léttur verkefna-/CRM-/tikket-listi:
 *
 *   • HRAÐ-skráning efst: skrifaðu og ýttu á Enter → komið inn. Veldu tegund
 *     með einum smelli (Tilboð / Póstur / Skýrsla / Heimsókn / Annað).
 *   • Allt á einum stað, raðað eftir því sem skiptir máli: áríðandi + á
 *     gjalddaga efst. Rauður dagsetningarstimpill þegar útrunnið.
 *   • Biðraðir: Í dag · Allt opið · Lokað  +  tegunda-síur.
 *   • Smelltu á röð → opnast ritill (titill, nótur, tegund, staða, forgangur,
 *     gjalddagi/mikilvæg dagsetning, viðskiptavinur). Smelltu á stöðu-depil til
 *     að færa áfram. Stjarna = áríðandi.
 *   • Verkdagbókar-færslur (óloknar) birtast inni í borðinu (📓) — opnast í
 *     Verkdagbók til að breyta; hægt að haka „Klárað“ beint.
 *   • ✨ Tillaga: endurnýtir /api/tv-summary (sama Haiku-endapunkt og #182) til
 *     að fá eina næsta-skref línu. Dýpri AI-hjálp kemur í fasa 2.
 *
 * Gögn: BEINT í `thjonustubeidni` töfluna (sama og Beiðnir #182 notar — engin
 * ný tafla, engin tvíföldun). Verkdagbók lesin live úr `verkdagbok`.
 *
 * Við fyrstu opnun felur borðið gömlu fjóra listana úr valmyndinni (bætir
 * 'verkefni'/'thjonustuverk'/'thjonustuver'/'eftirfylgni' í sidebar_hidden) og
 * setur sig efst — allt afturkræft í Stillingar → Valmynd. Gögnin lifa áfram.
 */
(() => {
  if (window.__verkbordInstalled) return;
  window.__verkbordInstalled = true;

  const VIEW_ID = 'view-verkbord';
  const NAV_KEY = 'verkbord';

  // ── helpers ──────────────────────────────────────────────────────────────
  function getSB() { return (window.DB && window.DB.sb) || null; }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  function toast(m) { if (window.Toast && Toast.show) Toast.show(m); else console.log('[verkbord]', m); }
  function nowIso() { return new Date().toISOString(); }
  function fmtDate(iso) {
    if (!iso) return '';
    const d = (iso instanceof Date) ? iso : new Date(iso);
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

  // ── reference data ───────────────────────────────────────────────────────
  // Unified type vocabulary. Includes the legacy keys patch #182 wrote so old
  // rows still get a sensible chip.
  const TYPES = {
    tilbod:             { label: 'Tilboð',      emoji: '💰', color: '#1d4ed8', bg: '#eff6ff' },
    email:              { label: 'Póstur',      emoji: '✉️', color: '#7c3aed', bg: '#f5f3ff' },
    skyrsla:            { label: 'Skýrsla',     emoji: '📄', color: '#0891b2', bg: '#ecfeff' },
    heimsokn:           { label: 'Heimsókn',    emoji: '🚐', color: '#16a34a', bg: '#f0fdf4' },
    hringja:            { label: 'Hringja',     emoji: '📞', color: '#d97706', bg: '#fffbeb' },
    samningur:          { label: 'Samningur',   emoji: '📝', color: '#16a34a', bg: '#f0fdf4' },
    skjalabeidni:       { label: 'Skjöl',       emoji: '📁', color: '#7c3aed', bg: '#f5f3ff' },
    verkdagbok:         { label: 'Verkdagbók',  emoji: '📓', color: '#92400e', bg: '#fef3c7' },
    annad:              { label: 'Annað',       emoji: '•',  color: '#64748b', bg: '#f1f5f9' },
    // legacy (#182):
    skodun_tilbod:      { label: 'Skoðun & tilboð',  emoji: '💰', color: '#1d4ed8', bg: '#eff6ff' },
    nyr_samningur:      { label: 'Nýr samningur',    emoji: '📝', color: '#16a34a', bg: '#f0fdf4' },
    uttekt_eftirfylgni: { label: 'Úttekt / eftirfylgni', emoji: '🔎', color: '#0891b2', bg: '#ecfeff' }
  };
  function typeDef(t) { return TYPES[t] || TYPES.annad; }
  function typeChip(t) {
    const d = typeDef(t);
    return '<span class="vb-type" style="color:' + d.color + ';background:' + d.bg + ';border-color:' + d.color + '33">' + d.emoji + ' ' + esc(d.label) + '</span>';
  }
  // Tegunda-síur → hvaða raun-type gildi falla undir.
  const TYPE_GROUP = {
    tilbod:    ['tilbod', 'skodun_tilbod'],
    email:     ['email'],
    skyrsla:   ['skyrsla', 'uttekt_eftirfylgni'],
    heimsokn:  ['heimsokn'],
    verkdagbok:['verkdagbok'],
    hringja:   ['hringja']
  };
  const FILTERS = [
    { v: 'tilbod',     label: '💰 Tilboð' },
    { v: 'email',      label: '✉️ Póstur' },
    { v: 'skyrsla',    label: '📄 Skýrslur' },
    { v: 'heimsokn',   label: '🚐 Heimsóknir' },
    { v: 'verkdagbok', label: '📓 Verkdagbók' },
    { v: 'hringja',    label: '📞 Hringja' }
  ];
  // Hröðu tegundir í skráningarstikunni.
  const ADD_TYPES = ['annad', 'tilbod', 'email', 'skyrsla', 'heimsokn'];

  const STATUSES = {
    nytt:      { label: 'Nýtt',      color: '#475569', dot: '#94a3b8' },
    i_vinnslu: { label: 'Í vinnslu', color: '#1d4ed8', dot: '#2563eb' },
    bedid:     { label: 'Beðið',     color: '#92400e', dot: '#d97706' },
    tilbuid:   { label: 'Tilbúið',   color: '#166534', dot: '#16a34a' },
    lokad:     { label: 'Lokað',     color: '#166534', dot: '#16a34a' }
  };
  const STATUS_ORDER = ['nytt', 'i_vinnslu', 'bedid', 'tilbuid', 'lokad'];
  function statusDef(s) { return STATUSES[s] || STATUSES.nytt; }
  function nextStatus(s) { const i = STATUS_ORDER.indexOf(s); return STATUS_ORDER[(i + 1) % STATUS_ORDER.length]; }

  const PRIORITIES = { lagur: 'Lágur', venjulegur: 'Venjulegur', har: 'Hár' };

  function dueInfo(iso) {
    if (!iso) return null;
    const d = new Date(iso); if (isNaN(d)) return null;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const dd = new Date(d); dd.setHours(0, 0, 0, 0);
    const diff = Math.round((dd - today) / 86400000);
    let label, overdue = false;
    if (diff < 0) { overdue = true; label = 'Fyrir ' + (-diff) + (-diff === 1 ? ' degi' : ' dögum'); }
    else if (diff === 0) label = 'Í dag';
    else if (diff === 1) label = 'Á morgun';
    else if (diff <= 7) label = 'Eftir ' + diff + ' daga';
    else label = fmtDate(iso);
    return { label, overdue, diff };
  }
  function isOpen(r) { return r.status !== 'lokad'; }
  function isOverdue(r) { if (!isOpen(r)) return false; const di = dueInfo(r.due_at); return !!(di && di.overdue); }
  function isToday(r) {
    if (!isOpen(r)) return false;
    if (r.important) return true;
    const di = dueInfo(r.due_at);
    return !!(di && di.diff <= 0);
  }

  // ── state ────────────────────────────────────────────────────────────────
  const QKEY = '_vb_queue', FKEY = '_vb_filter';
  const state = {
    items: [],          // thjonustubeidni rows
    vd: [],             // open verkdagbok rows (folded in)
    companies: null,    // fyrirtaeki names for the datalist (lazy)
    loading: false,
    queue: (function () { try { return localStorage.getItem(QKEY) || 'idag'; } catch (_) { return 'idag'; } })(),
    filter: (function () { try { return localStorage.getItem(FKEY) || ''; } catch (_) { return ''; } })(),
    search: '',
    addType: 'annad',
    expandedId: null
  };
  function setQueue(q) { state.queue = q; try { localStorage.setItem(QKEY, q); } catch (_) {} }
  function setFilter(f) { state.filter = f; try { localStorage.setItem(FKEY, f); } catch (_) {} }

  // verkdagbok rows → pseudo work-items (read-through; structure stays in #04).
  function vdItems() {
    return state.vd.map(r => ({
      id: 'vd:' + r.id, _vd: true, _raw: r,
      title: (r.fyrirtaeki || 'Verkdagbók') + (r.athugasemdir ? '' : ' — þjónusta'),
      notes: r.athugasemdir || '',
      type: 'verkdagbok', status: r.done ? 'lokad' : 'nytt',
      priority: 'venjulegur', important: false, due_at: null,
      customer_nafn: r.fyrirtaeki || '', source: 'verkdagbok',
      created_at: r.created_at
    }));
  }
  function allItems() { return state.items.concat(vdItems()); }

  // ── data ─────────────────────────────────────────────────────────────────
  async function load() {
    const SB = getSB(); if (!SB) return;
    state.loading = true; renderList();
    try {
      const a = await SB.from('thjonustubeidni').select('*').is('deleted_at', null)
        .order('created_at', { ascending: false }).range(0, 1499);
      if (a.error) throw a.error;
      state.items = a.data || [];
    } catch (e) {
      console.warn('[verkbord] load thjonustubeidni', e);
      state.items = [];
    }
    try {
      const b = await SB.from('verkdagbok').select('*').eq('done', false).eq('archived', false)
        .order('created_at', { ascending: false }).range(0, 499);
      state.vd = (b && !b.error && b.data) ? b.data : [];
    } catch (e) { state.vd = []; }
    state.loading = false;
    renderControls(); renderList(); refreshBadge();
  }

  async function loadCompanies() {
    if (state.companies) return state.companies;
    const SB = getSB(); if (!SB) { state.companies = []; return []; }
    try {
      const r = await SB.from('fyrirtaeki').select('id,nafn,customer_base_id').is('deleted_at', null).range(0, 1999);
      state.companies = (r && !r.error && r.data) ? r.data.filter(c => c.nafn) : [];
    } catch (_) { state.companies = []; }
    return state.companies;
  }

  async function quickAdd(title, type) {
    title = (title || '').trim();
    if (!title) return;
    const SB = getSB(); if (!SB) { toast('Engin gagnabankatenging'); return; }
    const obj = {
      title, notes: '', type: type || 'annad', status: 'nytt', priority: 'venjulegur',
      source: 'beint', important: false, created_at: nowIso(), created_by: currentUser(), updated_at: nowIso()
    };
    try {
      const r = await SB.from('thjonustubeidni').insert(obj).select().single();
      if (r.error) throw r.error;
      state.items.unshift(r.data);
      renderControls(); renderList(); refreshBadge();
    } catch (e) { toast('Náði ekki að bæta við: ' + (e.message || e)); }
  }

  async function saveRow(id, patch) {
    const SB = getSB(); if (!SB) return;
    patch.updated_at = nowIso();
    const row = state.items.find(x => x.id === id);
    if (row) Object.assign(row, patch);
    try { const r = await SB.from('thjonustubeidni').update(patch).eq('id', id); if (r.error) throw r.error; }
    catch (e) { toast('Náði ekki að vista: ' + (e.message || e)); }
  }
  async function softDelete(id) {
    const SB = getSB(); if (!SB) return;
    if (!window.confirm('Eyða þessu verki? (geymist sem eytt og endurheimtanlegt)')) return;
    try {
      const r = await SB.from('thjonustubeidni').update({ deleted_at: nowIso() }).eq('id', id);
      if (r.error) throw r.error;
      state.items = state.items.filter(x => x.id !== id);
      if (state.expandedId === id) state.expandedId = null;
      renderControls(); renderList(); refreshBadge();
    } catch (e) { toast('Eyðing mistókst: ' + (e.message || e)); }
  }
  async function vdSetDone(rawId) {
    const SB = getSB(); if (!SB) return;
    try {
      const r = await SB.from('verkdagbok').update({ done: true }).eq('id', rawId);
      if (r.error) throw r.error;
      state.vd = state.vd.filter(x => x.id !== rawId);
      renderControls(); renderList(); refreshBadge();
    } catch (e) { toast('Tókst ekki: ' + (e.message || e)); }
  }

  // ✨ next-step suggestion via the existing /api/tv-summary endpoint (#182).
  async function aiSuggest(id) {
    const row = state.items.find(x => x.id === id);
    if (!row) return;
    const btn = document.querySelector('.vb-ai[data-id="' + id + '"]');
    if (btn) { btn.disabled = true; btn.textContent = '… hugsa'; }
    try {
      const items = [{ id: row.id, customer_nafn: row.customer_nafn, type: row.type, title: row.title, notes: row.notes }];
      const r = await fetch('/api/tv-summary', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ items }) });
      const data = await r.json().catch(() => ({}));
      if (!r.ok || (data && data.error)) throw new Error((data && data.error) || ('HTTP ' + r.status));
      const sums = (data && data.summaries) || {};
      const txt = sums[row.id] || sums[String(row.id)];
      if (txt) { row.summary = txt; saveRow(id, { summary: txt }); renderList(); }
      else { toast('Engin tillaga kom til baka'); if (btn) { btn.disabled = false; btn.textContent = '✨ Tillaga'; } }
    } catch (e) { toast('Tillaga mistókst: ' + (e.message || e)); if (btn) { btn.disabled = false; btn.textContent = '✨ Tillaga'; } }
  }

  // ── filtering / sorting ──────────────────────────────────────────────────
  function inQueue(r) {
    if (state.queue === 'idag') return isToday(r);
    if (state.queue === 'lokad') return !isOpen(r);
    return isOpen(r); // opid
  }
  function inFilter(r) {
    if (!state.filter) return true;
    const grp = TYPE_GROUP[state.filter] || [state.filter];
    return grp.indexOf(r.type) !== -1;
  }
  function visibleRows() {
    let r = allItems().filter(x => inQueue(x) && inFilter(x));
    const s = state.search.trim().toLowerCase();
    if (s) r = r.filter(x => [x.customer_nafn, x.title, x.notes].some(f => (f || '').toLowerCase().includes(s)));
    const prio = { har: 0, venjulegur: 1, lagur: 2 };
    r.sort((a, b) => {
      // áríðandi efst, svo útrunnið/gjalddagi, svo forgangur, svo nýjast.
      const ai = (a.important ? 1 : 0), bi = (b.important ? 1 : 0);
      if (ai !== bi) return bi - ai;
      const ao = isOverdue(a) ? 1 : 0, bo = isOverdue(b) ? 1 : 0;
      if (ao !== bo) return bo - ao;
      const ad = dueInfo(a.due_at), bd = dueInfo(b.due_at);
      const adv = ad ? ad.diff : 99999, bdv = bd ? bd.diff : 99999;
      if (adv !== bdv) return adv - bdv;
      const ap = prio[a.priority] ?? 1, bp = prio[b.priority] ?? 1;
      if (ap !== bp) return ap - bp;
      return new Date(b.created_at || 0) - new Date(a.created_at || 0);
    });
    return r;
  }
  function counts() {
    const all = allItems();
    const c = { idag: 0, opid: 0, lokad: 0 };
    for (const x of all) { if (isToday(x)) c.idag++; if (isOpen(x)) c.opid++; else c.lokad++; }
    return c;
  }

  // ── sidebar nav ──────────────────────────────────────────────────────────
  function injectNav() {
    const nav = document.querySelector('nav.view-nav, .view-nav');
    if (!nav) { setTimeout(injectNav, 500); return; }
    if (nav.querySelector('[data-view="' + NAV_KEY + '"]')) return;
    const tpl = nav.querySelector('.vnav-btn');
    if (!tpl) { setTimeout(injectNav, 500); return; }
    const btn = document.createElement('button');
    btn.className = (tpl.className || 'vnav-btn').replace(/\bactive\b/g, '').trim();
    btn.setAttribute('data-view', NAV_KEY);
    btn.style.cssText += ';position:relative;z-index:5;display:flex;align-items:center';
    btn.innerHTML = '<span style="margin-right:6px">✅</span>Verkborð' +
      ' <span class="vb-badge" style="margin-left:auto;background:#fff;color:#b91c1c;font-size:10px;font-weight:800;padding:1px 7px;border-radius:99px;display:none"></span>';
    btn.addEventListener('click', e => {
      e.preventDefault(); e.stopPropagation();
      if (window.App && App.switchView) App.switchView(NAV_KEY); else show();
    });
    nav.insertBefore(btn, nav.firstChild); // efst — patch 68 heldur svo röðinni
    refreshBadge();
  }
  function refreshBadge() {
    const b = document.querySelector('.vb-badge');
    if (!b) return;
    const n = counts().idag;
    b.textContent = String(n);
    b.style.display = n > 0 ? 'inline-block' : 'none';
  }

  // ── view container + switchView hook ──────────────────────────────────────
  function ensureView() {
    if (document.getElementById(VIEW_ID)) return;
    const sample = document.getElementById('view-counter') || document.getElementById('view-sala');
    if (!sample || !sample.parentElement) return;
    const v = document.createElement('div');
    v.id = VIEW_ID;
    v.className = sample.className.replace(/\bactive\b/g, '').trim();
    v.innerHTML = '<main id="vb-main" class="main-panel"></main>';
    sample.parentElement.appendChild(v);
    injectStyle();
    wireDelegation(v);
  }
  function show() {
    ensureView();
    document.querySelectorAll('[id^="view-"]').forEach(v => { v.style.display = 'none'; v.classList.remove('active'); });
    const v = document.getElementById(VIEW_ID);
    if (v) { v.style.display = 'block'; v.classList.add('active'); }
    document.querySelectorAll('.vnav-btn').forEach(b => b.classList.toggle('active', b.dataset.view === NAV_KEY));
    renderAll();
    retireOldOnce();
    load();
  }
  function patchSwitchView() {
    if (!window.App || window.App._vbSwitchPatched) return;
    const orig = window.App.switchView;
    window.App.switchView = function (view) {
      if (view === NAV_KEY) { show(); return; }
      return orig.apply(this, arguments);
    };
    window.App._vbSwitchPatched = true;
  }

  // ── one-time retire of the old lists ──────────────────────────────────────
  async function retireOldOnce() {
    try {
      if (!window.AppSettings || !AppSettings.save || !AppSettings.isLoaded || !AppSettings.isLoaded()) return;
      if (AppSettings.path('verkbord.retired_v1')) return;
      const hidden = (AppSettings.path('sidebar_hidden') || []).slice();
      const add = ['verkefni', 'thjonustuverk', 'thjonustuver', 'eftirfylgni'];
      add.forEach(h => { if (!hidden.some(x => String(x).toLowerCase() === h)) hidden.push(h); });
      const patch = { verkbord: { retired_v1: true }, sidebar_hidden: hidden };
      let order = AppSettings.path('sidebar_order');
      if (Array.isArray(order) && order.length &&
          !order.some(x => { const v = String(x).toLowerCase(); return v === 'verkbord' || v.indexOf('verkborð') !== -1; })) {
        patch.sidebar_order = ['verkbord'].concat(order);
      }
      await AppSettings.save(patch);
      hideOldButtonsNow();
      toast('Faldi gömlu listana — sjást aftur í Stillingar → Valmynd ef þú vilt.');
    } catch (e) { console.warn('[verkbord] retireOldOnce', e); }
  }
  function hideOldButtonsNow() {
    const nav = document.querySelector('nav.view-nav, .view-nav'); if (!nav) return;
    const ids = ['thjonustuverk', 'thjonustuver', 'eftirfylgni'];
    nav.querySelectorAll('.vnav-btn').forEach(b => {
      const dv = b.getAttribute('data-view');
      const txt = (b.textContent || '').toLowerCase();
      if ((dv && ids.indexOf(dv) !== -1) || (!b.querySelector('.vb-badge') && /(^|\s)verkefni(\s|$)/.test(txt) && dv !== NAV_KEY)) {
        b.style.display = 'none';
      }
    });
  }

  // ── migration: import sensible open items from the old blob lists ─────────
  async function importOld() {
    const SB = getSB(); if (!SB) { toast('Engin gagnabankatenging'); return; }
    if (!window.AppSettings) { toast('Stillingar ekki tilbúnar'); return; }
    const existingRefs = new Set(state.items.map(x => x.channel_ref).filter(Boolean));
    const toInsert = [];
    // Verkefni (#145) — kanban cards not in a "done" column.
    const todo = AppSettings.path('todo');
    if (todo && Array.isArray(todo.columns)) {
      todo.columns.forEach(col => {
        const done = /klárað|done|lokið/i.test(col.title || '');
        (col.cards || []).forEach(card => {
          const ref = 'imp:verkefni:' + card.id;
          if (done || existingRefs.has(ref)) return;
          const title = (card.title || '').trim() || (card.body || '').trim().slice(0, 60) || '(án titils)';
          toInsert.push({
            title, notes: card.body || '', type: 'annad',
            status: /vinnsl/i.test(col.title || '') ? 'i_vinnslu' : 'nytt',
            priority: 'venjulegur', source: 'beint', important: false, channel_ref: ref,
            created_at: card.created_at || nowIso(), created_by: currentUser(), updated_at: nowIso()
          });
        });
      });
    }
    // Þjónustuverk (#172) — open cases.
    const tv = AppSettings.path('thjonustuverk');
    if (tv && Array.isArray(tv.cases)) {
      tv.cases.forEach(cs => {
        if (cs.status === 'lokid') return;
        const ref = 'imp:tverk:' + cs.id;
        if (existingRefs.has(ref)) return;
        const hasTilbod = cs.tilbod && (cs.tilbod.lines || cs.tilbod.items || []).length;
        toInsert.push({
          title: (cs.title || '').trim() || '(án titils)', notes: cs.body || '',
          type: hasTilbod ? 'tilbod' : 'annad',
          status: cs.status === 'i_vinnslu' ? 'i_vinnslu' : 'nytt',
          priority: 'venjulegur', source: 'beint', important: false, channel_ref: ref,
          customer_nafn: cs.customer_nafn || cs.customer || null,
          created_at: cs.created_at || nowIso(), created_by: currentUser(), updated_at: nowIso()
        });
      });
    }
    if (!toInsert.length) { toast('Ekkert nýtt að flytja inn — allt þegar komið.'); return; }
    if (!window.confirm('Flytja inn ' + toInsert.length + ' atriði úr Verkefni + Þjónustuverk?')) return;
    try {
      const r = await SB.from('thjonustubeidni').insert(toInsert).select();
      if (r.error) throw r.error;
      state.items = (r.data || []).concat(state.items);
      renderControls(); renderList(); refreshBadge();
      toast('Flutti inn ' + (r.data || []).length + ' atriði.');
    } catch (e) { toast('Innflutningur mistókst: ' + (e.message || e)); }
  }

  // ── styles ────────────────────────────────────────────────────────────────
  function injectStyle() {
    if (document.getElementById('verkbord-style')) return;
    const s = document.createElement('style');
    s.id = 'verkbord-style';
    s.textContent = `
      #view-verkbord .vb-wrap { max-width: 1100px; margin: 0 auto; padding: 16px 18px 80px; }
      #view-verkbord .vb-add { display:flex; gap:8px; flex-wrap:wrap; align-items:center;
        background:#fff; border:1px solid #e2e8f0; border-radius:12px; padding:12px 14px;
        box-shadow:0 1px 3px rgba(0,0,0,.05); position:sticky; top:0; z-index:6; }
      #view-verkbord .vb-add-input { flex:1; min-width:200px; font:inherit; font-size:16px;
        border:1px solid #cbd5e1; border-radius:9px; padding:11px 13px; outline:none; }
      #view-verkbord .vb-add-input:focus { border-color:#2563eb; box-shadow:0 0 0 3px #2563eb22; }
      #view-verkbord .vb-add-btn { font:inherit; font-size:15px; font-weight:700; color:#fff;
        background:#2563eb; border:none; border-radius:9px; padding:11px 18px; cursor:pointer; min-height:44px; }
      #view-verkbord .vb-add-btn:active { transform:translateY(1px); }
      #view-verkbord .vb-add-types { display:flex; gap:6px; flex-wrap:wrap; width:100%; margin-top:2px; }
      #view-verkbord .vb-tchip { font:inherit; font-size:13px; padding:6px 11px; border-radius:99px;
        border:1px solid #e2e8f0; background:#f8fafc; color:#475569; cursor:pointer; min-height:36px; }
      #view-verkbord .vb-tchip.active { background:#1d4ed8; color:#fff; border-color:#1d4ed8; }
      #view-verkbord .vb-controls { display:flex; gap:8px; flex-wrap:wrap; align-items:center; margin:14px 2px 10px; }
      #view-verkbord .vb-q { font:inherit; font-size:14px; font-weight:600; padding:8px 14px; border-radius:99px;
        border:1px solid #e2e8f0; background:#fff; color:#334155; cursor:pointer; min-height:40px; }
      #view-verkbord .vb-q.active { background:#0f172a; color:#fff; border-color:#0f172a; }
      #view-verkbord .vb-q .n { opacity:.7; font-weight:700; margin-left:5px; }
      #view-verkbord .vb-fchip { font:inherit; font-size:13px; padding:6px 12px; border-radius:99px;
        border:1px solid #e2e8f0; background:#fff; color:#475569; cursor:pointer; min-height:38px; }
      #view-verkbord .vb-fchip.active { background:#eff6ff; color:#1d4ed8; border-color:#1d4ed8; font-weight:700; }
      #view-verkbord .vb-search { flex:1; min-width:140px; font:inherit; font-size:14px; border:1px solid #cbd5e1;
        border-radius:9px; padding:9px 12px; outline:none; }
      #view-verkbord .vb-list { display:flex; flex-direction:column; gap:8px; }
      #view-verkbord .vb-row { background:#fff; border:1px solid #e2e8f0; border-radius:11px; padding:11px 13px;
        display:flex; align-items:flex-start; gap:11px; cursor:pointer; box-shadow:0 1px 2px rgba(0,0,0,.04); }
      #view-verkbord .vb-row.imp { border-color:#fca5a5; background:linear-gradient(135deg,#fef2f2,#fff 60%); }
      #view-verkbord .vb-row.open { box-shadow:0 4px 16px rgba(0,0,0,.10); border-color:#bfdbfe; }
      #view-verkbord .vb-dot { width:26px; height:26px; min-width:26px; border-radius:50%; border:3px solid;
        margin-top:1px; cursor:pointer; display:inline-flex; align-items:center; justify-content:center; font-size:13px; }
      #view-verkbord .vb-main { flex:1; min-width:0; }
      #view-verkbord .vb-title { font-size:15px; font-weight:600; color:#0f172a; line-height:1.35; word-break:break-word; }
      #view-verkbord .vb-row.done .vb-title { text-decoration:line-through; color:#94a3b8; }
      #view-verkbord .vb-meta { display:flex; gap:7px; flex-wrap:wrap; align-items:center; margin-top:5px; }
      #view-verkbord .vb-type { font-size:11px; font-weight:700; padding:2px 8px; border-radius:99px; border:1px solid; white-space:nowrap; }
      #view-verkbord .vb-cust { font-size:12px; color:#475569; }
      #view-verkbord .vb-due { font-size:11.5px; font-weight:700; padding:2px 8px; border-radius:99px; background:#f1f5f9; color:#475569; }
      #view-verkbord .vb-due.od { background:#fee2e2; color:#b91c1c; }
      #view-verkbord .vb-sum { font-size:12px; color:#7c3aed; margin-top:5px; line-height:1.35; }
      #view-verkbord .vb-star { font-size:18px; cursor:pointer; line-height:1; margin-top:1px; opacity:.85; }
      #view-verkbord .vb-tag { font-size:10px; font-weight:700; color:#92400e; background:#fef3c7; padding:1px 6px; border-radius:5px; }
      #view-verkbord .vb-ed { margin-top:11px; border-top:1px dashed #e2e8f0; padding-top:11px; display:grid; gap:9px; }
      #view-verkbord .vb-ed label { font-size:11px; font-weight:700; color:#64748b; display:block; margin-bottom:3px; }
      #view-verkbord .vb-ed input, #view-verkbord .vb-ed select, #view-verkbord .vb-ed textarea {
        font:inherit; font-size:14px; border:1px solid #cbd5e1; border-radius:8px; padding:9px 11px; width:100%; box-sizing:border-box; outline:none; }
      #view-verkbord .vb-ed textarea { min-height:70px; resize:vertical; }
      #view-verkbord .vb-ed-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(150px,1fr)); gap:9px; }
      #view-verkbord .vb-ed-actions { display:flex; gap:8px; flex-wrap:wrap; align-items:center; }
      #view-verkbord .vb-btn { font:inherit; font-size:13px; padding:8px 13px; border-radius:8px; cursor:pointer; min-height:40px; border:1px solid #cbd5e1; background:#fff; color:#334155; }
      #view-verkbord .vb-btn.red { border-color:#fecaca; color:#dc2626; }
      #view-verkbord .vb-btn.green { background:#16a34a; color:#fff; border-color:#16a34a; font-weight:700; }
      #view-verkbord .vb-empty { text-align:center; color:#1e293b; padding:44px 18px; font-size:15px; font-weight:600; }
      #view-verkbord .vb-hint { font-size:12px; color:#334155; margin:2px 2px 0; font-weight:600; }
      @media (max-width:640px){ #view-verkbord .vb-wrap{ padding:12px 12px 90px; } #view-verkbord .vb-q{ flex:1; text-align:center; } }
    `;
    document.head.appendChild(s);
  }

  // ── render ─────────────────────────────────────────────────────────────────
  function renderAll() {
    const main = document.getElementById('vb-main'); if (!main) return;
    main.innerHTML =
      '<div class="vb-wrap">' +
        '<div class="vb-add">' +
          '<input class="vb-add-input" id="vb-add-input" placeholder="Skráðu verk… Enter til að bæta við" autocomplete="off">' +
          '<button class="vb-add-btn" data-act="add">+ Bæta við</button>' +
          '<div class="vb-add-types">' + ADD_TYPES.map(t =>
            '<button class="vb-tchip' + (state.addType === t ? ' active' : '') + '" data-act="addtype" data-type="' + t + '">' +
            typeDef(t).emoji + ' ' + esc(typeDef(t).label) + '</button>').join('') + '</div>' +
        '</div>' +
        '<div class="vb-hint" id="vb-hint"></div>' +
        '<div class="vb-controls" id="vb-controls"></div>' +
        '<div class="vb-list" id="vb-list"></div>' +
      '</div>';
    renderControls(); renderList();
  }

  function renderControls() {
    const el = document.getElementById('vb-controls'); if (!el) return;
    const c = counts();
    const q = (v, label, n) => '<button class="vb-q' + (state.queue === v ? ' active' : '') + '" data-act="queue" data-q="' + v + '">' + label + '<span class="n">' + n + '</span></button>';
    const f = (v, label) => '<button class="vb-fchip' + (state.filter === v ? ' active' : '') + '" data-act="filter" data-f="' + v + '">' + label + '</button>';
    el.innerHTML =
      q('idag', '🔥 Í dag', c.idag) + q('opid', 'Allt opið', c.opid) + q('lokad', 'Lokað', c.lokad) +
      '<span style="flex:1 0 8px"></span>' +
      '<input class="vb-search" id="vb-search" placeholder="🔎 Leita…" value="' + esc(state.search) + '">' +
      '<div style="display:flex;gap:6px;flex-wrap:wrap;width:100%;margin-top:4px">' +
        f('', 'Allt') + FILTERS.map(x => f(x.v, x.label)).join('') +
        '<span style="flex:1"></span>' +
        '<button class="vb-fchip" data-act="import" title="Flytja inn opin atriði úr gömlu Verkefni + Þjónustuverk listunum">⬇︎ Flytja inn úr gömlu</button>' +
      '</div>';
  }

  function renderList() {
    const el = document.getElementById('vb-list'); if (!el) return;
    if (state.loading && !state.items.length) { el.innerHTML = '<div class="vb-empty">Sæki…</div>'; return; }
    const rows = visibleRows();
    if (!rows.length) {
      el.innerHTML = '<div class="vb-empty">' +
        (state.queue === 'idag' ? '🎉 Ekkert sem þarf að gera í dag.' :
         state.search ? 'Ekkert fannst fyrir „' + esc(state.search) + '“.' : 'Enginn verk hér.') + '</div>';
      return;
    }
    const cap = 300;
    el.innerHTML = rows.slice(0, cap).map(renderRow).join('') +
      (rows.length > cap ? '<div class="vb-hint" style="text-align:center">Sýni fyrstu ' + cap + ' af ' + rows.length + '.</div>' : '');
    if (state.expandedId != null) {
      const open = el.querySelector('.vb-row.open');
      if (open) wireEditor(open);
    }
  }

  function renderRow(r) {
    const st = statusDef(r.status);
    const di = dueInfo(r.due_at);
    const od = isOverdue(r);
    const open = state.expandedId === r.id;
    const done = !isOpen(r);
    const dotColor = (r.important || od) ? '#dc2626' : st.dot;
    const cls = 'vb-row' + (r.important ? ' imp' : '') + (open ? ' open' : '') + (done ? ' done' : '');
    let html = '<div class="' + cls + '" data-id="' + esc(r.id) + '" data-act="expand">' +
      '<div class="vb-dot" data-act="status" data-id="' + esc(r.id) + '" title="' + esc(st.label) + ' — smella til að færa áfram" ' +
        'style="border-color:' + dotColor + ';color:' + dotColor + '">' + (done ? '✓' : '') + '</div>' +
      '<div class="vb-main">' +
        '<div class="vb-title">' + esc(r.title || '(án titils)') + '</div>' +
        '<div class="vb-meta">' +
          typeChip(r.type) +
          (r._vd ? '<span class="vb-tag">úr Verkdagbók</span>' : '') +
          (r.customer_nafn ? '<span class="vb-cust">🏢 ' + esc(r.customer_nafn) + '</span>' : '') +
          (di ? '<span class="vb-due' + (od ? ' od' : '') + '">📅 ' + esc(di.label) + '</span>' : '') +
          '<span class="vb-cust" style="color:' + st.color + '">' + esc(st.label) + '</span>' +
        '</div>' +
        (r.summary ? '<div class="vb-sum">✨ ' + esc(r.summary) + '</div>' : '') +
        (open ? renderEditor(r) : '') +
      '</div>' +
      '<div class="vb-star" data-act="star" data-id="' + esc(r.id) + '" title="Áríðandi">' + (r.important ? '⭐' : '☆') + '</div>' +
    '</div>';
    return html;
  }

  function renderEditor(r) {
    if (r._vd) {
      return '<div class="vb-ed" data-act="noexpand">' +
        (r.notes ? '<div style="font-size:13px;color:#475569;white-space:pre-wrap">' + esc(r.notes) + '</div>' : '<div class="vb-hint">Þjónustufærsla úr Verkdagbók.</div>') +
        '<div class="vb-ed-actions">' +
          '<button class="vb-btn" data-act="vd-open" data-id="' + esc(r.id) + '">📓 Opna í Verkdagbók</button>' +
          '<button class="vb-btn green" data-act="vd-done" data-id="' + esc(r.id) + '">✓ Klárað</button>' +
        '</div></div>';
    }
    const statusOpts = STATUS_ORDER.map(s => '<option value="' + s + '"' + (r.status === s ? ' selected' : '') + '>' + STATUSES[s].label + '</option>').join('');
    const typeOpts = ['tilbod', 'email', 'skyrsla', 'heimsokn', 'hringja', 'samningur', 'skjalabeidni', 'annad']
      .map(t => '<option value="' + t + '"' + (r.type === t ? ' selected' : '') + '>' + typeDef(t).emoji + ' ' + typeDef(t).label + '</option>').join('');
    const prioOpts = Object.keys(PRIORITIES).map(p => '<option value="' + p + '"' + (r.priority === p ? ' selected' : '') + '>' + PRIORITIES[p] + '</option>').join('');
    const dueVal = r.due_at ? new Date(r.due_at).toISOString().slice(0, 10) : '';
    return '<div class="vb-ed" data-act="noexpand">' +
      '<div><label>Titill</label><input data-field="title" value="' + esc(r.title || '') + '"></div>' +
      '<div><label>Nótur</label><textarea data-field="notes" placeholder="Lýsing, símanúmer, krækjur…">' + esc(r.notes || '') + '</textarea></div>' +
      '<div class="vb-ed-grid">' +
        '<div><label>Tegund</label><select data-field="type">' + typeOpts + '</select></div>' +
        '<div><label>Staða</label><select data-field="status">' + statusOpts + '</select></div>' +
        '<div><label>Forgangur</label><select data-field="priority">' + prioOpts + '</select></div>' +
        '<div><label>Gjalddagi / dagsetning</label><input type="date" data-field="due_at" value="' + dueVal + '"></div>' +
      '</div>' +
      '<div><label>Viðskiptavinur</label><input data-field="customer_nafn" list="vb-companies" value="' + esc(r.customer_nafn || '') + '" placeholder="Fyrirtæki…"><datalist id="vb-companies"></datalist></div>' +
      '<div class="vb-ed-actions">' +
        '<button class="vb-ai vb-btn" data-act="ai" data-id="' + esc(r.id) + '">✨ Tillaga</button>' +
        '<span style="flex:1"></span>' +
        '<button class="vb-btn red" data-act="del" data-id="' + esc(r.id) + '">🗑 Eyða</button>' +
        '<button class="vb-btn green" data-act="collapse">✓ Loka</button>' +
      '</div></div>';
  }

  // ── event wiring ─────────────────────────────────────────────────────────
  let _searchTimer = null, _noteTimer = null;
  function wireDelegation(root) {
    root.addEventListener('click', e => {
      const t = e.target.closest('[data-act]'); if (!t) return;
      const act = t.getAttribute('data-act');
      const id = t.getAttribute('data-id');
      const nid = id && id.indexOf('vd:') !== 0 ? Number(id) : id;
      if (act === 'add') { doAdd(); return; }
      if (act === 'addtype') {
        state.addType = t.getAttribute('data-type');
        root.querySelectorAll('.vb-add-types .vb-tchip').forEach(c => c.classList.toggle('active', c.getAttribute('data-type') === state.addType));
        const inp = document.getElementById('vb-add-input'); if (inp) inp.focus();
        return;
      }
      if (act === 'queue') { setQueue(t.getAttribute('data-q')); renderControls(); renderList(); return; }
      if (act === 'filter') { setFilter(t.getAttribute('data-f')); renderControls(); renderList(); return; }
      if (act === 'import') { importOld(); return; }
      if (act === 'noexpand') { e.stopPropagation(); return; }
      if (act === 'status') { e.stopPropagation(); advance(id); return; }
      if (act === 'star') { e.stopPropagation(); toggleStar(id); return; }
      if (act === 'ai') { e.stopPropagation(); aiSuggest(nid); return; }
      if (act === 'del') { e.stopPropagation(); softDelete(nid); return; }
      if (act === 'collapse') { e.stopPropagation(); state.expandedId = null; renderList(); return; }
      if (act === 'vd-open') { e.stopPropagation(); if (window.App && App.switchView) App.switchView('verkdagbok'); return; }
      if (act === 'vd-done') { e.stopPropagation(); vdSetDone(id.slice(3)); return; }
      if (act === 'expand') {
        const rid = t.getAttribute('data-id');
        const real = rid && rid.indexOf('vd:') !== 0 ? Number(rid) : rid;
        state.expandedId = (state.expandedId === real) ? null : real;
        renderList();
        if (state.expandedId != null) loadCompanies().then(fillCompanyList);
        return;
      }
    });
    root.addEventListener('input', e => {
      if (e.target.id === 'vb-search') {
        clearTimeout(_searchTimer);
        _searchTimer = setTimeout(() => { state.search = e.target.value; renderList(); }, 180);
        return;
      }
      const f = e.target.getAttribute && e.target.getAttribute('data-field');
      if (f && (f === 'title' || f === 'notes')) {
        const id = currentEditorId(e.target);
        if (id == null) return;
        clearTimeout(_noteTimer);
        const val = e.target.value;
        _noteTimer = setTimeout(() => saveRow(id, { [f]: val }), 500);
      }
    });
    root.addEventListener('keydown', e => {
      if (e.target.id === 'vb-add-input' && e.key === 'Enter') { e.preventDefault(); doAdd(); }
    });
    root.addEventListener('change', e => {
      const f = e.target.getAttribute && e.target.getAttribute('data-field');
      if (!f) return;
      const id = currentEditorId(e.target);
      if (id == null) return;
      let val = e.target.value;
      if (f === 'due_at') val = val ? new Date(val + 'T00:00:00').toISOString() : null;
      if (f === 'customer_nafn') {
        const match = (state.companies || []).find(c => c.nafn === val);
        saveRow(id, { customer_nafn: val || null, customer_base_id: match ? match.customer_base_id : null });
      } else {
        saveRow(id, { [f]: val });
      }
      if (f === 'status' || f === 'type') { renderControls(); renderList(); refreshBadge(); }
    });
  }
  function currentEditorId() { return state.expandedId; }
  function doAdd() {
    const inp = document.getElementById('vb-add-input'); if (!inp) return;
    const v = inp.value; inp.value = '';
    quickAdd(v, state.addType);
    inp.focus();
  }
  function advance(id) {
    if (typeof id === 'string' && id.indexOf('vd:') === 0) { return; }
    const rid = Number(id);
    const row = state.items.find(x => x.id === rid); if (!row) return;
    const ns = nextStatus(row.status);
    saveRow(rid, { status: ns });
    renderControls(); renderList(); refreshBadge();
  }
  function toggleStar(id) {
    if (typeof id === 'string' && id.indexOf('vd:') === 0) return;
    const rid = Number(id);
    const row = state.items.find(x => x.id === rid); if (!row) return;
    saveRow(rid, { important: !row.important });
    renderControls(); renderList(); refreshBadge();
  }
  function wireEditor(rowEl) {
    const ta = rowEl.querySelector('textarea[data-field="notes"]');
    if (ta) { ta.style.height = 'auto'; ta.style.height = Math.min(ta.scrollHeight + 2, 320) + 'px'; }
  }
  function fillCompanyList() {
    const dl = document.getElementById('vb-companies'); if (!dl || !state.companies) return;
    dl.innerHTML = state.companies.slice(0, 1500).map(c => '<option value="' + esc(c.nafn) + '"></option>').join('');
  }

  // ── boot ──────────────────────────────────────────────────────────────────
  function boot() {
    injectNav();
    patchSwitchView();
    setTimeout(() => { injectNav(); patchSwitchView(); }, 1500);
    // keep the "Í dag" badge fresh once settings/DB are warm
    if (window.AppSettings && AppSettings.onChange) AppSettings.onChange(() => refreshBadge());
    // light preload so the badge has a number before first open
    setTimeout(() => { if (getSB() && !state.items.length) quietCount(); }, 2500);
  }
  async function quietCount() {
    const SB = getSB(); if (!SB) return;
    try {
      const a = await SB.from('thjonustubeidni').select('*').is('deleted_at', null).range(0, 1499);
      if (!a.error) { state.items = a.data || []; }
      const b = await SB.from('verkdagbok').select('*').eq('done', false).eq('archived', false).range(0, 499);
      if (b && !b.error) state.vd = b.data || [];
      refreshBadge();
    } catch (_) {}
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  window.Verkbord = { open: show, reload: load, importOld };
  console.log('[patch-231] Verkborð installed — App.switchView("verkbord")');
})();
/* === END VERKBORÐ === */
