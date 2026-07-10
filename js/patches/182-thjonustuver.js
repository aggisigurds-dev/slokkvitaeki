/* === ÞJÓNUSTUVER — CRM intake hub (Verkborð #12/#12b/#12c, Fasi 1, sneið 1) ===
 *
 * One shared inbox for customer requests from all 4 channels (sími / verslun /
 * vettvangur / tölvupóstur). LIST-FIRST (not kanban) — built to hold 120+ items:
 * a dense sortable/filterable table + clickable work-queues (Nýtt / Mínar /
 * Útrunnið / Bíður / Allar opnar) + bulk actions + a fast "+ Ný beiðni" form.
 *
 * Backed by the additive `thjonustubeidni` table. Soft-delete only.
 * Kept clearly distinct from Þjónustuverk (service work).
 *
 * Slice 2 (email channel: Beiðnir ingestion → thjonustubeidni, email→company
 * auto-match, keyword classification) and slice 3 (pick docs → email back) land
 * in later patches.
 */
(() => {
  if (window.__thjonustuverInstalled) return;
  window.__thjonustuverInstalled = true;

  const VIEW_ID = 'view-thjonustuver';
  const NAV_KEY = 'thjonustuver';

  function getSB() { return (window.DB && window.DB.sb) || null; }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  function toast(m) { if (window.Toast && Toast.show) Toast.show(m); else console.log('[þjónustuver]', m); }
  const normKt = s => String(s == null ? '' : s).replace(/\D/g, '');

  function currentUser() {
    try {
      const p = window.UserAuth && UserAuth.getProfile && UserAuth.getProfile();
      if (p && p.nafn) return p.nafn;
      const u = window.UserAuth && UserAuth.getUser && UserAuth.getUser();
      if (u && u.email) return u.email.split('@')[0];
      const list = window.AppSettings && AppSettings.path && AppSettings.path('starfsmenn');
      if (Array.isArray(list)) { const f = list.find(s => s && s.name && s.name.trim()); if (f) return f.name.trim(); }
    } catch (_) {}
    return 'Starfsmaður';
  }

  // ── Reference data ──────────────────────────────────────────────────────────
  const TYPES = {
    skodun_tilbod:      { label: 'Skoðun & tilboð',            color: '#1d4ed8', bg: '#eff6ff', next: 'Bóka heimsókn → tilboð' },
    nyr_samningur:      { label: 'Nýr samningur',              color: '#16a34a', bg: '#f0fdf4', next: 'Þjónustusamningur' },
    hringja:            { label: 'Hringja til baka',           color: '#d97706', bg: '#fffbeb', next: 'Símtal til baka' },
    skjalabeidni:       { label: 'Skjalabeiðni',               color: '#7c3aed', bg: '#f5f3ff', next: 'Velja skjöl + senda' },
    uttekt_eftirfylgni: { label: 'Þjónustu-úttekt / eftirfylgni', color: '#0891b2', bg: '#ecfeff', next: 'Tengja við úttekt' },
    annad:              { label: 'Annað',                      color: '#64748b', bg: '#f1f5f9', next: '' }
  };
  const TYPE_ORDER = ['skodun_tilbod', 'nyr_samningur', 'hringja', 'skjalabeidni', 'uttekt_eftirfylgni', 'annad'];
  const STATUSES = { nytt: 'Nýtt', i_vinnslu: 'Í vinnslu', bedid: 'Beðið', tilbuid: 'Tilbúið', lokad: 'Lokað' };
  const STATUS_ORDER = ['nytt', 'i_vinnslu', 'bedid', 'tilbuid', 'lokad'];
  const SOURCES = { phone: { label: 'Sími', icon: '📞' }, store: { label: 'Verslun', icon: '🏪' }, field: { label: 'Vettvangur', icon: '🚐' }, email: { label: 'Tölvupóstur', icon: '✉️' }, verkdagbok: { label: 'Verkdagbók', icon: '📓' } };
  const SOURCE_ORDER = ['phone', 'store', 'field', 'email', 'verkdagbok'];
  const PRIORITIES = { lagur: 'Lágur', venjulegur: 'Venjulegur', har: 'Hár' };

  function typeChip(t) {
    const m = TYPES[t] || TYPES.annad;
    return `<span style="display:inline-block;padding:1px 8px;border-radius:99px;font-size:10.5px;font-weight:700;color:${m.color};background:${m.bg};border:1px solid ${m.color}33;white-space:nowrap">${esc(m.label)}</span>`;
  }
  function ageDays(row) {
    if (!row.created_at) return 0;
    return Math.max(0, Math.floor((Date.now() - new Date(row.created_at)) / 86400000));
  }
  function isOverdue(row) {
    if (row.status === 'lokad') return false;
    if (row.due_at && new Date(row.due_at) < new Date()) return true;
    return ageDays(row) >= 14; // SLA: nothing should rot
  }
  // Status-dot (#14): grár Nýtt · blár Í vinnslu · gulur Beðið · grænn Tilbúið/
  // Lokað · rauður = útrunnið eða áríðandi. Click advances to the next status.
  const STATUS_COLORS = { nytt: '#94a3b8', i_vinnslu: '#2563eb', bedid: '#d97706', tilbuid: '#16a34a', lokad: '#16a34a' };
  function statusColor(r) { return (r.important || isOverdue(r)) ? '#dc2626' : (STATUS_COLORS[r.status] || '#94a3b8'); }
  function nextStatus(s) { const i = STATUS_ORDER.indexOf(s); return STATUS_ORDER[(i + 1) % STATUS_ORDER.length]; }
  const TIDY_DAYS = 30; // default-view window + Tiltekt age threshold

  // ── State ───────────────────────────────────────────────────────────────────
  const state = {
    items: [], loading: false,
    queue: 'open',                 // nytt | mine | overdue | bedid | open
    search: '',
    fType: '', fPriority: '', fSource: '', fImportant: false,
    fSourceGroup: '',              // '' | beint | verkdagbok | email — quick source filter (chips by the queue boxes)
    showOlder: false,              // default view = last 30 days (Áríðandi exempt)
    selected: new Set(),
    sort: 'new',                   // new | old | age | priority | important | type | customer
    // #15 skiptanleg sýn: 'list' = þétt tafla · 'cards' = ítarleg kort (meira pláss).
    // Sjálfgefið = Ítarlegt (rúmgott); geymt í localStorage svo valið helst.
    view: (function () { try { return localStorage.getItem('_tv_view') === 'list' ? 'list' : 'cards'; } catch (_) { return 'cards'; } })()
  };

  // ── Data ────────────────────────────────────────────────────────────────────
  async function load() {
    const SB = getSB(); if (!SB) return;
    state.loading = true; render();
    try {
      const { data, error } = await SB.from('thjonustubeidni')
        .select('*').is('deleted_at', null)
        .order('created_at', { ascending: false }).range(0, 999);
      if (error) throw error;
      state.items = data || [];
    } catch (e) {
      console.warn('[þjónustuver] load', e);
      if (/relation .* does not exist/i.test(e.message || '')) state.items = [];
    }
    state.loading = false; render();
    autoSummarize(); // background, non-blocking — fills the last-30-day view
  }

  function inQueue(row, q) {
    const me = currentUser();
    if (q === 'nytt') return row.status === 'nytt';
    if (q === 'mine') return (row.assigned_to || '') === me && row.status !== 'lokad';
    if (q === 'overdue') return isOverdue(row);
    if (q === 'bedid') return row.status === 'bedid';
    return row.status !== 'lokad'; // open
  }
  function olderHiddenCount() {
    return state.items.filter(x => inQueue(x, state.queue) && !x.important && ageDays(x) > TIDY_DAYS).length;
  }
  // Source groups for the quick filter chips: email (Eldklar pósthólf),
  // verkdagbok (úr Verk/þjónustubók), beint (allt sem er skráð beint inn í
  // Þjónustuver — sími/búð/vettvangur). Lets the eigandi isolate the few
  // hand-entered erindi from the flood of emails.
  function srcGroup(r) {
    if (r.source === 'email') return 'email';
    if (r.source === 'verkdagbok') return 'verkdagbok';
    return 'beint';
  }
  function sourceGroupCounts() {
    const base = state.items.filter(x => inQueue(x, state.queue) && (state.showOlder || x.important || ageDays(x) <= TIDY_DAYS));
    const c = { beint: 0, verkdagbok: 0, email: 0 };
    for (const x of base) c[srcGroup(x)]++;
    return c;
  }
  function visibleRows() {
    let r = state.items.filter(x => inQueue(x, state.queue));
    // Default view = last 30 days; older tucked away (Áríðandi always shown).
    if (!state.showOlder) r = r.filter(x => x.important || ageDays(x) <= TIDY_DAYS);
    if (state.fImportant) r = r.filter(x => x.important);
    if (state.fType) r = r.filter(x => x.type === state.fType);
    if (state.fPriority) r = r.filter(x => x.priority === state.fPriority);
    if (state.fSource) r = r.filter(x => x.source === state.fSource);
    if (state.fSourceGroup) r = r.filter(x => srcGroup(x) === state.fSourceGroup);
    const s = state.search.trim().toLowerCase();
    if (s) r = r.filter(x => [x.customer_nafn, x.title, x.notes, x.assigned_to].some(f => (f || '').toLowerCase().includes(s)));
    const pr = { har: 0, venjulegur: 1, lagur: 2 };
    const coll = new Intl.Collator('is', { sensitivity: 'base' });
    r.sort((a, b) => {
      switch (state.sort) {
        case 'old': return new Date(a.created_at) - new Date(b.created_at);
        case 'age': return ageDays(b) - ageDays(a);
        case 'priority': return (pr[a.priority] ?? 1) - (pr[b.priority] ?? 1) || (new Date(b.created_at) - new Date(a.created_at));
        case 'important': return (b.important ? 1 : 0) - (a.important ? 1 : 0) || (new Date(b.created_at) - new Date(a.created_at));
        case 'type': return TYPE_ORDER.indexOf(a.type) - TYPE_ORDER.indexOf(b.type) || coll.compare(a.customer_nafn || '', b.customer_nafn || '');
        case 'customer': return coll.compare(a.customer_nafn || '', b.customer_nafn || '');
        default: return new Date(b.created_at) - new Date(a.created_at);
      }
    });
    return r;
  }

  async function saveRow(id, patch) {
    const SB = getSB(); if (!SB) return;
    patch.updated_at = new Date().toISOString();
    const row = state.items.find(x => x.id === id);
    if (row) Object.assign(row, patch);
    try { const r = await SB.from('thjonustubeidni').update(patch).eq('id', id); if (r.error) throw r.error; }
    catch (e) { toast('Náði ekki að vista: ' + (e.message || e)); }
  }
  async function softDelete(id) {
    const SB = getSB(); if (!SB) return;
    try {
      const r = await SB.from('thjonustubeidni').update({ deleted_at: new Date().toISOString() }).eq('id', id);
      if (r.error) throw r.error;
      state.items = state.items.filter(x => x.id !== id);
      state.selected.delete(id);
    } catch (e) { toast('Eyðing mistókst: ' + (e.message || e)); }
  }

  // ── AI summaries (#14.6/#32) — cached `summary`, on-demand + capped auto ──────
  // One short Icelandic next-action line per request via /api/tv-summary (Haiku,
  // server-side key). Generated ONCE per row, batched, never blocks the UI.
  let _summarizing = false;
  async function summarizeIds(ids, opts) {
    ids = (ids || []).filter(Boolean);
    if (!ids.length) return;
    const SB = getSB(); if (!SB) return;
    const items = state.items.filter(x => ids.includes(x.id))
      .map(x => ({ id: x.id, customer_nafn: x.customer_nafn, type: x.type, title: x.title, notes: x.notes }));
    if (!items.length) return;
    try {
      const r = await fetch('/api/tv-summary', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ items }) });
      const data = await r.json().catch(() => ({}));
      if (!r.ok || (data && data.error)) { if (!(opts && opts.silent)) toast('Samantekt mistókst: ' + ((data && data.error) || r.status)); return; }
      const sums = (data && data.summaries) || {};
      for (const id in sums) {
        const row = state.items.find(x => String(x.id) === id);
        if (row) { row.summary = sums[id]; try { await SB.from('thjonustubeidni').update({ summary: sums[id] }).eq('id', +id); } catch (_) {} }
      }
      if (!(opts && opts.silent)) render();
    } catch (e) { if (!(opts && opts.silent)) toast('Samantekt mistókst: ' + (e.message || e)); }
  }
  async function autoSummarize() {
    if (_summarizing) return;
    _summarizing = true;
    try {
      // un-summarized rows in the default 30-day view; capped so cost stays bounded.
      const pending = state.items.filter(x => !x.summary && (x.important || ageDays(x) <= TIDY_DAYS)).slice(0, 40);
      while (pending.length) {
        const batch = pending.splice(0, 8).map(x => x.id);
        await summarizeIds(batch, { silent: true });
        const m = document.getElementById('_tv-main'); if (m && document.getElementById(VIEW_ID)?.classList.contains('active')) render();
        await new Promise(res => setTimeout(res, 400));
      }
    } finally { _summarizing = false; }
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  function queueCounts() {
    const c = { nytt: 0, mine: 0, overdue: 0, bedid: 0, open: 0 };
    for (const x of state.items) {
      if (inQueue(x, 'nytt')) c.nytt++;
      if (inQueue(x, 'mine')) c.mine++;
      if (inQueue(x, 'overdue')) c.overdue++;
      if (inQueue(x, 'bedid')) c.bedid++;
      if (inQueue(x, 'open')) c.open++;
    }
    return c;
  }

  // ── Ítarleg sýn (#15): rúmgóð kort í stað þéttu töflunnar ────────────────────
  // Endurnýtir sömu control-klasa og taflan (_tv-cb/_tv-dot/_tv-star/_tv-arch +
  // _tv-row) svo wire() virkar óbreytt. Stærri texti, lýsing fær að vefjast,
  // áberandi samantektar-reitur.
  function renderCards(rows) {
    return '<div style="display:flex;flex-direction:column;gap:10px">' + rows.map(r => {
      const od = isOverdue(r);
      const src = SOURCES[r.source] || SOURCES.phone;
      const sel = state.selected.has(r.id);
      const pri = r.priority === 'har' ? '<span style="color:#dc2626;font-weight:700">⚑ Hár forgangur</span>'
        : (r.priority === 'lagur' ? '<span style="color:#94a3b8">Lágur forgangur</span>' : '');
      const created = r.created_at ? new Date(r.created_at).toLocaleDateString('is-IS') : '';
      const linkBadge = r.customer_base_id
        ? '<span title="Tengt skráðum viðskiptavin" style="font-size:10.5px;font-weight:700;color:#15803d;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:99px;padding:1px 7px">✓ tengt</span>'
        : '<span title="Ekki tengt viðskiptavin — flettu upp í smáatriðum" style="font-size:10.5px;font-weight:600;color:#94a3b8;background:#f8fafc;border:1px solid #e2e8f0;border-radius:99px;padding:1px 7px">ótengt</span>';
      return `<div class="_tv-row" data-id="${r.id}" style="cursor:pointer;background:#fff;border:1px solid ${od ? '#fecaca' : '#e2e8f0'};border-left:4px solid ${statusColor(r)};border-radius:11px;padding:13px 15px;${od ? 'background:#fffafa;' : ''}">
        <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
          <input type="checkbox" class="_tv-cb" data-id="${r.id}" ${sel ? 'checked' : ''} onclick="event.stopPropagation()" style="width:16px;height:16px;flex:none">
          <button class="_tv-dot" data-id="${r.id}" title="${STATUSES[r.status]} — smelltu til að færa áfram" onclick="event.stopPropagation()" style="width:15px;height:15px;border-radius:50%;border:none;background:${statusColor(r)};cursor:pointer;padding:0;flex:none"></button>
          <span style="font-size:15.5px;font-weight:800;color:#0f172a">${esc(r.customer_nafn || '—')}</span>
          ${linkBadge}
          ${typeChip(r.type)}
          <button class="_tv-star" data-id="${r.id}" title="${r.important ? 'Áríðandi — afmerkja' : 'Merkja áríðandi'}" onclick="event.stopPropagation()" style="background:none;border:none;cursor:pointer;font-size:16px;line-height:1;padding:0;flex:none">${r.important ? '⭐' : '☆'}</button>
          <div style="flex:1;min-width:8px"></div>
          <span title="${esc(src.label)}" style="font-size:13px;color:#64748b">${src.icon} ${esc(src.label)}</span>
          <span style="font-size:12px;font-weight:700;color:${od ? '#dc2626' : '#94a3b8'}">${ageDays(r)} d</span>
          <button class="_tv-arch" data-id="${r.id}" title="Fjarlægja af síðu (archive — endurheimtanlegt)" onclick="event.stopPropagation()" style="background:none;border:none;color:#cbd5e1;cursor:pointer;font-size:15px;line-height:1;padding:0;flex:none">✕</button>
        </div>
        <div style="font-size:14.5px;font-weight:600;color:#0f172a;margin-top:9px">${esc(r.title || '(efnislaust)')}</div>
        ${r.notes ? `<div style="font-size:13px;color:#475569;margin-top:4px;line-height:1.5;white-space:pre-wrap;word-break:break-word">${esc(String(r.notes).slice(0, 600))}${String(r.notes).length > 600 ? '…' : ''}</div>` : ''}
        <div style="margin-top:9px;padding:9px 11px;border-radius:8px;background:${r.summary ? '#f5f3ff' : '#f8fafc'};border:1px solid ${r.summary ? '#ddd6fe' : '#eef2f7'}">
          <span style="font-size:11px;font-weight:700;color:#7c3aed;text-transform:uppercase;letter-spacing:.03em">📋 Samantekt</span>
          <div style="font-size:13px;color:${r.summary ? '#5b21b6' : '#94a3b8'};margin-top:3px;line-height:1.45">${r.summary ? esc(r.summary) : 'Útbý samantekt…'}</div>
        </div>
        <div style="display:flex;gap:14px;flex-wrap:wrap;align-items:center;margin-top:9px;font-size:12px;color:#64748b">
          ${created ? `<span>📅 ${esc(created)}</span>` : ''}
          ${pri ? `<span>${pri}</span>` : ''}
          ${r.assigned_to ? `<span>Ábyrgð: <strong style="color:#334155">${esc(r.assigned_to)}</strong></span>` : '<span style="color:#cbd5e1">Óúthlutað</span>'}
          ${r.due_at ? `<span style="${od ? 'color:#dc2626;font-weight:700' : ''}">⏰ ${esc(String(r.due_at).slice(0, 10))}</span>` : ''}
        </div>
      </div>`;
    }).join('') + '</div>';
  }

  function render() {
    const main = document.getElementById('_tv-main');
    if (!main) return;
    const prevActive = document.activeElement;
    const keepSearch = prevActive && prevActive.id === '_tv-search';
    const c = queueCounts();
    const rows = visibleRows();
    const olderHidden = olderHiddenCount();
    const QUEUES = [
      ['nytt', '🆕 Nýtt', c.nytt, '#2563eb'],
      ['mine', '👤 Mínar', c.mine, '#0f766e'],
      ['overdue', '⏰ Útrunnið', c.overdue, '#dc2626'],
      ['bedid', '⏳ Bíður', c.bedid, '#d97706'],
      ['open', '📋 Allar opnar', c.open, '#0f172a']
    ];
    const qBtn = ([k, lbl, n, col]) => `<button class="_tv-q" data-q="${k}" style="display:flex;flex-direction:column;gap:2px;padding:9px 14px;border:1px solid ${state.queue === k ? col : '#e2e8f0'};background:${state.queue === k ? col : '#fff'};color:${state.queue === k ? '#fff' : '#334155'};border-radius:10px;cursor:pointer;font:inherit;min-width:84px">
      <span style="font-size:19px;font-weight:800;line-height:1">${n}</span><span style="font-size:11px;font-weight:600;opacity:${state.queue === k ? 1 : .8}">${lbl}</span></button>`;

    // Quick source-filter chips (same row as the queue boxes). Toggle on/off.
    const sc = sourceGroupCounts();
    const SRC_GROUPS = [
      ['beint', '✍️ Skráð beint', sc.beint, '#0f766e'],
      ['verkdagbok', '📓 Verk/þjónustubók', sc.verkdagbok, '#7c3aed'],
      ['email', '✉️ Tölvupóstur', sc.email, '#2563eb']
    ];
    const srcChip = ([k, lbl, n, col]) => {
      const on = state.fSourceGroup === k;
      return `<button class="_tv-srcg" data-srcg="${k}" title="Sía á farveg — smelltu aftur til að hreinsa" style="display:flex;align-items:center;gap:6px;padding:9px 13px;border:1px solid ${on ? col : '#e2e8f0'};background:${on ? col : '#fff'};color:${on ? '#fff' : '#475569'};border-radius:10px;cursor:pointer;font:inherit;font-size:12.5px;font-weight:600">
        <span>${lbl}</span><span style="font-size:12px;font-weight:800;opacity:${on ? 1 : .65}">${n}</span></button>`;
    };

    const selN = state.selected.size;
    const bulk = selN ? `
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;padding:9px 12px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;margin-bottom:12px">
        <strong style="color:#1e40af;font-size:13px">${selN} valdar</strong>
        <button class="_tv-bulk-clear" style="padding:5px 10px;border:1px solid #cbd5e1;background:#fff;border-radius:7px;cursor:pointer;font:inherit;font-size:12px">Hreinsa val</button>
        <div style="flex:1;min-width:0"></div>
        <select class="_tv-bulk-status" style="padding:6px 9px;border:1px solid #cbd5e1;border-radius:7px;font:inherit;font-size:12px"><option value="">Setja stöðu…</option>${STATUS_ORDER.map(s => `<option value="${s}">${STATUSES[s]}</option>`).join('')}</select>
        <button class="_tv-bulk-assign" style="padding:6px 10px;border:1px solid #93c5fd;background:#dbeafe;color:#1d4ed8;border-radius:7px;cursor:pointer;font:inherit;font-size:12px;font-weight:700">Úthluta</button>
        <button class="_tv-bulk-close" style="padding:6px 10px;border:1px solid #fcd34d;background:#fffbeb;color:#b45309;border-radius:7px;cursor:pointer;font:inherit;font-size:12px;font-weight:700">Loka</button>
      </div>` : '';

    const cell = 'padding:8px 10px;border-bottom:1px solid #f1f5f9;font-size:12.5px;color:#0f172a;vertical-align:middle';
    const th = 'padding:8px 10px;text-align:left;font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.04em;background:#f8fafc;border-bottom:1px solid #e2e8f0;cursor:pointer;white-space:nowrap';
    const body = rows.length ? rows.map(r => {
      const od = isOverdue(r);
      const src = SOURCES[r.source] || SOURCES.phone;
      const sel = state.selected.has(r.id);
      const initials = (r.assigned_to || '').split(/\s+/).filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase();
      return `<tr class="_tv-row" data-id="${r.id}" style="cursor:pointer;${od ? 'background:#fef2f2;' : ''}">
        <td style="${cell};text-align:center"><input type="checkbox" class="_tv-cb" data-id="${r.id}" ${sel ? 'checked' : ''} onclick="event.stopPropagation()" style="width:15px;height:15px"></td>
        <td style="${cell};white-space:nowrap">
          <button class="_tv-dot" data-id="${r.id}" title="${STATUSES[r.status]} — smelltu til að færa áfram" onclick="event.stopPropagation()" style="width:14px;height:14px;border-radius:50%;border:none;background:${statusColor(r)};cursor:pointer;padding:0;vertical-align:middle"></button>
          <button class="_tv-star" data-id="${r.id}" title="${r.important ? 'Áríðandi — afmerkja' : 'Merkja áríðandi'}" onclick="event.stopPropagation()" style="background:none;border:none;cursor:pointer;font-size:14px;line-height:1;padding:0 0 0 4px;vertical-align:middle">${r.important ? '⭐' : '☆'}</button>
        </td>
        <td style="${cell};font-weight:700;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(r.customer_nafn || '—')}</td>
        <td style="${cell}">${typeChip(r.type)}</td>
        <td style="${cell};width:100%">
          <div style="line-height:1.45" title="${esc(r.title || '')}">${esc(r.title || '')}</div>
          ${r.summary ? `<div style="font-size:11px;color:#7c3aed;line-height:1.4;margin-top:2px" title="${esc(r.summary)}">✨ ${esc(r.summary)}</div>` : ''}
        </td>
        <td style="${cell};text-align:center" title="${esc(src.label)}">${src.icon}</td>
        <td style="${cell};text-align:center">${r.priority === 'har' ? '<span style="color:#dc2626;font-weight:700">⚑ Hár</span>' : (r.priority === 'lagur' ? '<span style="color:#94a3b8">Lágur</span>' : 'Venjul.')}</td>
        <td style="${cell};text-align:right;${od ? 'color:#dc2626;font-weight:700' : 'color:#64748b'}">${ageDays(r)} d</td>
        <td style="${cell};text-align:center"><span title="${esc(r.assigned_to || '')}" style="display:inline-block;min-width:22px;font-size:10.5px;font-weight:700;color:#475569">${esc(initials || '—')}</span></td>
        <td style="${cell};text-align:center"><button class="_tv-arch" data-id="${r.id}" title="Fjarlægja af síðu (archive — endurheimtanlegt)" onclick="event.stopPropagation()" style="background:none;border:none;color:#cbd5e1;cursor:pointer;font-size:14px;line-height:1;padding:0">✕</button></td>
      </tr>`;
    }).join('') : `<tr><td colspan="10" style="padding:34px;text-align:center;color:#94a3b8">Engar beiðnir í þessari biðröð. 🎉</td></tr>`;

    main.innerHTML = `
      <div style="max-width:none;padding:16px 22px 60px">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:14px">
          <div><div style="font-size:21px;font-weight:800;color:#0f172a">🛎️ Þjónustuver</div>
            <div style="font-size:12px;color:#94a3b8">Sameiginlegt inbox — kúnna-beiðnir úr öllum farvegum</div></div>
          <div class="_tv-actions" style="display:flex;gap:8px;flex-wrap:wrap"><button id="_tv-refresh" style="padding:8px 12px;border:1px solid #cbd5e1;background:#fff;border-radius:8px;cursor:pointer;font:inherit;font-size:12.5px;font-weight:600;color:#475569">↻ Sækja</button>
            <button id="_tv-email" title="Flytja inn nýjar beiðnir úr eldklar pósthólfi" style="padding:8px 12px;border:1px solid #cbd5e1;background:#fff;border-radius:8px;cursor:pointer;font:inherit;font-size:12.5px;font-weight:600;color:#475569">✉️ Sækja tölvupóst</button>
            <button id="_tv-verk" title="Flytja opin follow-up úr Verkdagbók" style="padding:8px 12px;border:1px solid #cbd5e1;background:#fff;border-radius:8px;cursor:pointer;font:inherit;font-size:12.5px;font-weight:600;color:#475569">📓 Sækja úr Verkdagbók</button>
            <button id="_tv-tidy" title="Tiltekt — fela Lokað + gömul (>30 daga) Annað sem er ekki áríðandi" style="padding:8px 12px;border:1px solid #fcd34d;background:#fffbeb;border-radius:8px;cursor:pointer;font:inherit;font-size:12.5px;font-weight:600;color:#b45309">🧹 Tiltekt</button>
            <button id="_tv-test" title="Senda prufupóst á aggisigurds@gmail.com gegnum Resend" style="padding:8px 12px;border:1px solid #c7d2fe;background:#eef2ff;border-radius:8px;cursor:pointer;font:inherit;font-size:12.5px;font-weight:600;color:#4338ca">✉️ Prufa send</button>
            <button id="_tv-new" style="padding:8px 15px;border:none;background:#2563eb;color:#fff;border-radius:8px;cursor:pointer;font:inherit;font-size:13px;font-weight:700">+ Ný beiðni</button></div>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:stretch;margin-bottom:14px">${QUEUES.map(qBtn).join('')}
          <div style="width:1px;background:#e2e8f0;margin:2px 4px"></div>${SRC_GROUPS.map(srcChip).join('')}</div>
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:12px">
          <input id="_tv-search" type="search" placeholder="🔍 Leita…" value="${esc(state.search)}" style="flex:1;min-width:160px;padding:8px 12px;border:1px solid #cbd5e1;border-radius:8px;font:inherit;font-size:13px">
          <select id="_tv-ftype" style="padding:7px 9px;border:1px solid #cbd5e1;border-radius:8px;font:inherit;font-size:12px"><option value="">Allar tegundir</option>${TYPE_ORDER.map(t => `<option value="${t}" ${state.fType === t ? 'selected' : ''}>${TYPES[t].label}</option>`).join('')}</select>
          <select id="_tv-fpri" style="padding:7px 9px;border:1px solid #cbd5e1;border-radius:8px;font:inherit;font-size:12px"><option value="">Forgangur</option>${Object.keys(PRIORITIES).map(p => `<option value="${p}" ${state.fPriority === p ? 'selected' : ''}>${PRIORITIES[p]}</option>`).join('')}</select>
          <select id="_tv-fsrc" style="padding:7px 9px;border:1px solid #cbd5e1;border-radius:8px;font:inherit;font-size:12px"><option value="">Farvegur</option>${SOURCE_ORDER.map(s => `<option value="${s}" ${state.fSource === s ? 'selected' : ''}>${SOURCES[s].icon} ${SOURCES[s].label}</option>`).join('')}</select>
          <select id="_tv-sort" style="padding:7px 9px;border:1px solid #cbd5e1;border-radius:8px;font:inherit;font-size:12px">
            <option value="new" ${state.sort === 'new' ? 'selected' : ''}>Nýjast fyrst</option>
            <option value="old" ${state.sort === 'old' ? 'selected' : ''}>Elst fyrst</option>
            <option value="priority" ${state.sort === 'priority' ? 'selected' : ''}>Forgangur</option>
            <option value="important" ${state.sort === 'important' ? 'selected' : ''}>Áríðandi fyrst</option>
            <option value="type" ${state.sort === 'type' ? 'selected' : ''}>Eftir tegund</option>
            <option value="customer" ${state.sort === 'customer' ? 'selected' : ''}>Eftir kúnna</option>
            <option value="age" ${state.sort === 'age' ? 'selected' : ''}>Aldur / SLA</option>
          </select>
          <button id="_tv-fimp" style="padding:7px 11px;border:1px solid ${state.fImportant ? '#f59e0b' : '#cbd5e1'};background:${state.fImportant ? '#fffbeb' : '#fff'};color:${state.fImportant ? '#b45309' : '#475569'};border-radius:8px;cursor:pointer;font:inherit;font-size:12px;font-weight:600">⭐ Áríðandi</button>
          ${(olderHidden > 0 || state.showOlder) ? `<button id="_tv-older" style="padding:7px 11px;border:1px solid ${state.showOlder ? '#0f172a' : '#cbd5e1'};background:${state.showOlder ? '#0f172a' : '#fff'};color:${state.showOlder ? '#fff' : '#475569'};border-radius:8px;cursor:pointer;font:inherit;font-size:12px;font-weight:600">${state.showOlder ? 'Fela eldri' : 'Sýna eldri (' + olderHidden + ')'}</button>` : ''}
          <div style="flex:1;min-width:0"></div>
          <div style="display:inline-flex;border:1px solid #cbd5e1;border-radius:8px;overflow:hidden">
            <button id="_tv-view-list" title="Þétt tafla" style="padding:7px 11px;border:none;background:${state.view === 'list' ? '#0f172a' : '#fff'};color:${state.view === 'list' ? '#fff' : '#475569'};cursor:pointer;font:inherit;font-size:12px;font-weight:600">☰ Þétt</button>
            <button id="_tv-view-cards" title="Ítarleg kort — meira pláss og samantekt" style="padding:7px 11px;border:none;border-left:1px solid #cbd5e1;background:${state.view === 'cards' ? '#0f172a' : '#fff'};color:${state.view === 'cards' ? '#fff' : '#475569'};cursor:pointer;font:inherit;font-size:12px;font-weight:600">▤ Ítarlegt</button>
          </div>
        </div>
        ${bulk}
        ${state.view === 'cards' ? `
        ${rows.length && !state.loading ? `<label style="display:inline-flex;align-items:center;gap:7px;margin-bottom:9px;font-size:12px;color:#64748b;cursor:pointer;user-select:none"><input type="checkbox" id="_tv-all" style="width:15px;height:15px" ${rows.every(r => state.selected.has(r.id)) ? 'checked' : ''}>Velja allar (${rows.length})</label>` : ''}
        <div>${state.loading ? '<div style="padding:30px;text-align:center;color:#94a3b8">Hleður…</div>' : (rows.length ? renderCards(rows) : '<div style="padding:34px;text-align:center;color:#94a3b8;background:#fff;border:1px solid #e2e8f0;border-radius:11px">Engar beiðnir í þessari biðröð. 🎉</div>')}</div>
        ` : `
        <div style="background:#fff;border:1px solid #e2e8f0;border-radius:11px;overflow:hidden">
          <div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse">
            <thead><tr>
              <th style="${th};text-align:center;width:34px"><input type="checkbox" id="_tv-all" style="width:15px;height:15px"></th>
              <th style="${th};width:58px">Staða</th>
              <th style="${th}">Viðskiptavinur</th><th style="${th}">Tegund</th><th style="${th}">Lýsing</th>
              <th style="${th};text-align:center">Farv.</th><th style="${th};text-align:center">Forg.</th>
              <th style="${th};text-align:right">Aldur</th><th style="${th};text-align:center">Ábyrgð</th>
              <th style="${th};width:30px"></th>
            </tr></thead><tbody>${state.loading ? '<tr><td colspan="10" style="padding:30px;text-align:center;color:#94a3b8">Hleður…</td></tr>' : body}</tbody>
          </table></div>
        </div>`}
        <div style="margin-top:10px;font-size:11px;color:#94a3b8;text-align:center">${rows.length} beiðnir í þessari sýn · ${state.items.length} alls${state.showOlder ? '' : (olderHidden ? ' · síðustu 30 dagar (' + olderHidden + ' eldri faldar)' : '')}</div>
      </div>`;

    wire(main, rows);
    if (keepSearch) { const el = main.querySelector('#_tv-search'); if (el) { el.focus(); try { el.setSelectionRange(el.value.length, el.value.length); } catch (_) {} } }
  }

  function wire(main, rows) {
    main.querySelector('#_tv-refresh')?.addEventListener('click', load);
    main.querySelector('#_tv-email')?.addEventListener('click', ingestEmail);
    main.querySelector('#_tv-verk')?.addEventListener('click', ingestVerkdagbok);
    main.querySelector('#_tv-new')?.addEventListener('click', () => openForm());
    main.querySelectorAll('._tv-q').forEach(b => b.addEventListener('click', () => { state.queue = b.dataset.q; state.selected.clear(); render(); }));
    main.querySelectorAll('._tv-srcg').forEach(b => b.addEventListener('click', () => { state.fSourceGroup = state.fSourceGroup === b.dataset.srcg ? '' : b.dataset.srcg; render(); }));
    let t = null;
    main.querySelector('#_tv-search')?.addEventListener('input', e => { clearTimeout(t); t = setTimeout(() => { state.search = e.target.value; render(); }, 180); });
    main.querySelector('#_tv-ftype')?.addEventListener('change', e => { state.fType = e.target.value; render(); });
    main.querySelector('#_tv-fpri')?.addEventListener('change', e => { state.fPriority = e.target.value; render(); });
    main.querySelector('#_tv-fsrc')?.addEventListener('change', e => { state.fSource = e.target.value; render(); });
    main.querySelector('#_tv-sort')?.addEventListener('change', e => { state.sort = e.target.value; render(); });
    main.querySelector('#_tv-fimp')?.addEventListener('click', () => { state.fImportant = !state.fImportant; render(); });
    main.querySelector('#_tv-older')?.addEventListener('click', () => { state.showOlder = !state.showOlder; render(); });
    const setView = v => { if (state.view === v) return; state.view = v; try { localStorage.setItem('_tv_view', v); } catch (_) {} render(); if (v === 'cards') autoSummarize(); };
    main.querySelector('#_tv-view-list')?.addEventListener('click', () => setView('list'));
    main.querySelector('#_tv-view-cards')?.addEventListener('click', () => setView('cards'));
    main.querySelector('#_tv-tidy')?.addEventListener('click', () => doTidy());
    main.querySelector('#_tv-test')?.addEventListener('click', () => sendTest());

    main.querySelectorAll('._tv-dot').forEach(b => b.addEventListener('click', async e => {
      e.stopPropagation();
      const row = state.items.find(x => x.id === +b.dataset.id); if (!row) return;
      await saveRow(row.id, { status: nextStatus(row.status) });
      render();
    }));
    main.querySelectorAll('._tv-star').forEach(b => b.addEventListener('click', async e => {
      e.stopPropagation();
      const row = state.items.find(x => x.id === +b.dataset.id); if (!row) return;
      await saveRow(row.id, { important: !row.important });
      render();
    }));
    main.querySelectorAll('._tv-arch').forEach(b => b.addEventListener('click', async e => {
      e.stopPropagation();
      await softDelete(+b.dataset.id);
      render();
    }));
    main.querySelectorAll('._tv-row').forEach(row => row.addEventListener('click', e => {
      if (e.target.closest('button, select, input, a')) return;
      openDetail(+row.dataset.id);
    }));
    main.querySelectorAll('._tv-cb').forEach(cb => cb.addEventListener('change', e => {
      e.stopPropagation();
      const id = +cb.dataset.id;
      if (cb.checked) state.selected.add(id); else state.selected.delete(id);
      render();
    }));
    const all = main.querySelector('#_tv-all');
    if (all) all.addEventListener('change', () => { if (all.checked) rows.forEach(r => state.selected.add(r.id)); else state.selected.clear(); render(); });

    main.querySelector('._tv-bulk-clear')?.addEventListener('click', () => { state.selected.clear(); render(); });
    main.querySelector('._tv-bulk-status')?.addEventListener('change', async e => {
      const s = e.target.value; if (!s) return;
      for (const id of state.selected) await saveRow(id, { status: s });
      state.selected.clear(); render();
    });
    main.querySelector('._tv-bulk-close')?.addEventListener('click', async () => {
      for (const id of state.selected) await saveRow(id, { status: 'lokad' });
      state.selected.clear(); render();
    });
    main.querySelector('._tv-bulk-assign')?.addEventListener('click', async () => {
      const who = prompt('Úthluta á (nafn):', currentUser()); if (who === null) return;
      for (const id of state.selected) await saveRow(id, { assigned_to: who.trim() });
      state.selected.clear(); render();
    });
  }

  // ── Tiltekt (bulk cleanup, #14.5) — archive Lokað + stale Annað ──────────────
  // Soft-delete only, never touches Áríðandi, never auto-archives a typed item
  // (only generic 'Annað' once it's >30 days idle) so real work isn't hidden.
  function tidyCandidates() {
    return state.items.filter(x =>
      x.deleted_at == null && !x.important &&
      (x.status === 'lokad' || (ageDays(x) > TIDY_DAYS && x.type === 'annad'))
    );
  }
  function doTidy() {
    const cands = tidyCandidates();
    if (!cands.length) { toast('Ekkert til að taka til (allt nýlegt/áríðandi/flokkað).'); return; }
    document.getElementById('_tv-tidybar')?.remove();
    const bar = document.createElement('div');
    bar.id = '_tv-tidybar';
    bar.style.cssText = 'position:fixed;left:50%;bottom:18px;transform:translateX(-50%);z-index:100060;background:#0f172a;color:#fff;border-radius:12px;box-shadow:0 12px 40px rgba(0,0,0,.35);padding:12px 16px;display:flex;gap:12px;align-items:center;flex-wrap:wrap;font:inherit;font-size:13px;max-width:calc(100vw - 24px)';
    bar.innerHTML = `<span>🧹 Tiltekt: fela <b>${cands.length}</b> (Lokað + gömul Annað, ekki áríðandi)? Endurheimtanlegt.</span>
      <button id="_tv-tidy-cancel" style="padding:6px 12px;border:1px solid #475569;background:transparent;color:#cbd5e1;border-radius:7px;cursor:pointer;font:inherit;font-size:12px">Hætta við</button>
      <button id="_tv-tidy-go" style="padding:6px 12px;border:none;background:#f59e0b;color:#111;border-radius:7px;cursor:pointer;font:inherit;font-size:12px;font-weight:700">Já, fela</button>`;
    document.body.appendChild(bar);
    bar.querySelector('#_tv-tidy-cancel').onclick = () => bar.remove();
    bar.querySelector('#_tv-tidy-go').onclick = async () => {
      const go = bar.querySelector('#_tv-tidy-go'); go.disabled = true; go.textContent = 'Fel…';
      const ids = cands.map(x => x.id);
      const SB = getSB();
      for (let i = 0; i < ids.length; i += 200) {
        const chunk = ids.slice(i, i + 200);
        try { const r = await SB.from('thjonustubeidni').update({ deleted_at: new Date().toISOString() }).in('id', chunk); if (r.error) throw r.error; }
        catch (e) { toast('Tiltekt stöðvaðist: ' + (e.message || e)); break; }
        go.textContent = 'Fel… ' + Math.min(i + 200, ids.length) + '/' + ids.length;
      }
      const idset = new Set(ids);
      state.items = state.items.filter(x => !idset.has(x.id));
      bar.remove(); render();
      toast('🧹 ' + ids.length + ' faldar (endurheimtanlegt)');
    };
  }

  // ── + Ný beiðni / detail form (shared modal) ─────────────────────────────────
  let _coList = [];
  async function loadCompanies() {
    if (_coList.length) return;
    const SB = getSB(); if (!SB) return;
    try { const { data } = await SB.from('fyrirtaeki').select('id,nafn,kennitala,netfang,customer_base_id').is('deleted_at', null).order('nafn').limit(3000); _coList = data || []; } catch (_) {}
  }

  // ── Shared customer matcher (round 2) — normalize + substring fallback ───────
  // Loosens the ~50% link rate: strip " ehf"/punctuation/whitespace, fold accents,
  // then exact-normalized, then substring either-direction (min 4 chars). For
  // email also try sender netfang exact → company domain.
  function normName(s) {
    return String(s == null ? '' : s).toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[.,;:!?'"()/\\\-]+/g, ' ')
      .replace(/\b(ehf|hf|sf|slf|ohf)\b/g, ' ')
      .replace(/\s+/g, ' ').trim();
  }
  const FREEMAIL = /gmail|hotmail|outlook|live|icloud|yahoo|me\.com|simnet|internet\.is/;
  // Generic single words that must NOT substring-match alone (would sweep e.g.
  // every "Hótel X" / "Húsfélag X" onto one base). Cowork accuracy guard.
  const GENERIC = new Set(['hótel', 'hotel', 'húsfélag', 'husfelag', 'hús', 'verslun', 'verkstæði', 'bílaverkstæði', 'söluturn', 'bakarí', 'veitingar', 'kaffihús', 'skóli', 'leikskóli', 'sundlaug', 'apótek', 'heimili', 'félag', 'samtök', 'hótelið']);
  // Property-management / agency domains: one domain fronts MANY end-customers
  // (Eignaumsjón sits on 50+ húsfélög, Heimaleiga/Eignarekstur/Rekstrarumsjón
  // likewise). Never domain-match these — it collapses many customers onto one.
  // Belt-and-suspenders: the unique-domain rule below already drops any domain
  // that appears on >1 fyrirtaeki, which catches these automatically + future ones.
  const AGENCY = new Set(['eignaumsjon.is', 'eignarekstur.is', 'rekstrarumsjon.is', 'fjoleignir.is', 'heimaleiga.is', 'logborg.is', 'eignamidlun.is', 'eignaumsjón.is']);
  function buildCoIndex() {
    const byNorm = new Map(), byEmail = new Map();
    const domCos = new Map(); // domain -> Set(company id) to detect ambiguity
    const domOne = new Map(); // domain -> last company (used only when unique)
    _coList.forEach(c => {
      const n = normName(c.nafn); if (n && !byNorm.has(n)) byNorm.set(n, c);
      const e = (c.netfang || '').trim().toLowerCase();
      if (!e || e.indexOf('@') === -1) return;
      byEmail.set(e, c); // exact sender-email match stays precise even for agencies
      let d = (e.split('@')[1] || '').split(/[ ,;<>]/)[0].trim(); // tolerate malformed "voov.is , yfirlit"
      if (!d || FREEMAIL.test(d) || AGENCY.has(d)) return;
      if (!domCos.has(d)) domCos.set(d, new Set());
      domCos.get(d).add(c.id);
      domOne.set(d, c);
    });
    // Only keep domains owned by exactly ONE company — ambiguous (multi-tenant /
    // agency / chain) domains are dropped so they can't mis-link.
    const byDomain = new Map();
    domCos.forEach((ids, d) => { if (ids.size === 1) byDomain.set(d, domOne.get(d)); });
    return { byNorm, byEmail, byDomain };
  }
  function matchCompany(idx, name, email) {
    email = (email || '').trim().toLowerCase();
    if (email && idx.byEmail.has(email)) return idx.byEmail.get(email);
    if (email) { const d = email.split('@')[1]; if (d && idx.byDomain.has(d)) return idx.byDomain.get(d); }
    const n = normName(name);
    if (!n) return null;
    if (idx.byNorm.has(n)) return idx.byNorm.get(n);
    // Substring fallback — whole-WORD match only, skip generic or short single-
    // word company names, and prefer the longest (most specific) match.
    if (n.length >= 5) {
      const wb = (hay, needle) => (' ' + hay + ' ').indexOf(' ' + needle + ' ') !== -1;
      let best = null;
      for (const [cn, co] of idx.byNorm) {
        const single = cn.indexOf(' ') === -1;
        if (single && (cn.length < 6 || GENERIC.has(cn))) continue;
        if (!single && cn.length < 5) continue;
        if (wb(n, cn) || wb(cn, n)) { if (!best || cn.length > best.cn.length) best = { cn, co }; }
      }
      if (best) return best.co;
    }
    return null;
  }

  function seg(name, opts, val) {
    return `<div class="_tv-seg" data-name="${name}" style="display:flex;gap:6px;flex-wrap:wrap">${opts.map(([v, lbl]) =>
      `<button type="button" class="_tv-segbtn" data-name="${name}" data-val="${v}" style="padding:7px 12px;border:1px solid ${val === v ? '#2563eb' : '#cbd5e1'};background:${val === v ? '#2563eb' : '#fff'};color:${val === v ? '#fff' : '#334155'};border-radius:8px;cursor:pointer;font:inherit;font-size:12.5px;font-weight:600">${lbl}</button>`).join('')}</div>`;
  }

  // #19 — "Opna prófíl →": deep-link to the company's profile. Þjónustuver
  // customers are fyrirtæki, so we use the Fyrirtæki (companies) view's
  // Companies.openDetail(id) — matching by name (and base id when present).
  // Falls back to opening the companies list pre-filtered by name.
  function gotoCompanies() {
    try {
      if (window.App && window.App.switchView) window.App.switchView('companies');
      else document.querySelector('[data-view="companies"]')?.click();
    } catch (_) {}
  }
  function openCustomerProfile(row) {
    const name = ((row && row.customer_nafn) || '').trim();
    const baseId = row && row.customer_base_id;
    document.getElementById('_tv-modal')?.remove();
    const C = window.Companies;
    if (C && Array.isArray(C.list) && typeof C.openDetail === 'function') {
      const L = C.list;
      const co = (baseId != null && L.find(c => c.customer_base_id === baseId)) ||
                 L.find(c => (c.nafn || '').trim().toLowerCase() === name.toLowerCase());
      if (co) { gotoCompanies(); setTimeout(() => { try { C.openDetail(co.id); } catch (_) {} }, 180); return; }
    }
    // Fallback — open the companies list and pre-fill its search with the name.
    gotoCompanies();
    if (!name) return;
    setTimeout(() => {
      const inp = document.querySelector('#_cl_search') || document.querySelector('#view-companies input');
      if (inp) { inp.value = name; inp.dispatchEvent(new Event('input', { bubbles: true })); }
    }, 350);
  }

  async function openForm(existing) {
    await loadCompanies();
    document.getElementById('_tv-modal')?.remove();
    const ex = existing || {};
    const sel = { source: ex.source || 'phone', type: ex.type || 'annad', priority: ex.priority || 'venjulegur', status: ex.status || 'nytt' };
    const m = document.createElement('div');
    m.id = '_tv-modal';
    m.style.cssText = 'position:fixed;inset:0;z-index:100040;display:flex;align-items:flex-start;justify-content:center;padding-top:4vh;font-family:inherit';
    // #19 — for an existing beiðni, lead with the customer's request (summary +
    // FULL message) big at the top + an "Opna prófíl →" link, and demote the
    // meta selectors (Farvegur/Tegund/Forgangur/Frestur/Ábyrgð/Staða) into a
    // collapsible section. New beiðni keeps the entry-focused order.
    const lbl = t => `<label style="display:block;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;margin-bottom:6px">${t}</label>`;
    const F = {};
    F.source = `<div>${lbl('Farvegur *')}${seg('source', SOURCE_ORDER.map(s => [s, SOURCES[s].icon + ' ' + SOURCES[s].label]), sel.source)}</div>`;
    F.customer = `<div>${lbl('Viðskiptavinur *')}
      <input id="_tv-co-name" list="_tv-co-list" autocomplete="off" value="${esc(ex.customer_nafn || '')}" placeholder="Veldu úr lista eða sláðu inn" style="width:100%;padding:9px 12px;border:1px solid #cbd5e1;border-radius:8px;font:inherit;font-size:13px;box-sizing:border-box">
      <datalist id="_tv-co-list">${_coList.map(c => `<option value="${esc(c.nafn || '')}"></option>`).join('')}</datalist>
      <input id="_tv-co-kt" value="${esc(ex.__kt || '')}" placeholder="Kennitala (Fletta upp)" style="width:100%;margin-top:8px;padding:9px 12px;border:1px solid #cbd5e1;border-radius:8px;font:inherit;font-size:13px;box-sizing:border-box"></div>`;
    F.type = `<div>${lbl('Tegund')}${seg('type', TYPE_ORDER.map(t => [t, TYPES[t].label]), sel.type)}
      <div id="_tv-next" style="font-size:11px;color:#94a3b8;margin-top:6px;min-height:14px">${TYPES[sel.type].next ? 'Næsta aðgerð: ' + TYPES[sel.type].next : ''}</div></div>`;
    F.title = `<div>${lbl('Stutt lýsing *')}<input id="_tv-title" value="${esc(ex.title || '')}" placeholder="t.d. Vill tilboð í 12 tæki" style="width:100%;padding:9px 12px;border:1px solid #cbd5e1;border-radius:8px;font:inherit;font-size:13px;box-sizing:border-box"></div>`;
    F.notes = big => `<div>${lbl(big ? 'Skilaboð / ósk kúnnans' : 'Nánar')}<textarea id="_tv-notes" rows="${big ? 7 : 3}" placeholder="Valfrjálst" style="width:100%;padding:11px 13px;border:1px solid ${big ? '#cbd5e1' : '#cbd5e1'};border-radius:8px;font:inherit;font-size:${big ? 14 : 13}px;line-height:1.55;box-sizing:border-box;resize:vertical">${esc(ex.notes || '')}</textarea></div>`;
    F.prioDue = `<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
      <div>${lbl('Forgangur')}${seg('priority', Object.keys(PRIORITIES).map(p => [p, PRIORITIES[p]]), sel.priority)}</div>
      <div>${lbl('Frestur')}<input id="_tv-due" type="date" value="${ex.due_at ? String(ex.due_at).slice(0, 10) : ''}" style="width:100%;padding:8px 10px;border:1px solid #cbd5e1;border-radius:8px;font:inherit;font-size:13px;box-sizing:border-box"></div></div>`;
    F.assigned = `<div>${lbl('Ábyrgð')}<input id="_tv-assigned" value="${esc(ex.assigned_to != null ? ex.assigned_to : currentUser())}" style="width:100%;padding:9px 12px;border:1px solid #cbd5e1;border-radius:8px;font:inherit;font-size:13px;box-sizing:border-box"></div>`;
    F.status = existing ? `<div>${lbl('Staða')}${seg('status', STATUS_ORDER.map(s => [s, STATUSES[s]]), sel.status)}</div>` : '';
    F.important = `<label style="display:flex;align-items:center;gap:8px;font-size:13px;cursor:pointer;color:#0f172a"><input type="checkbox" id="_tv-imp" ${ex.important ? 'checked' : ''} style="width:16px;height:16px"> ⭐ Áríðandi (undanskilið auto-tiltekt)</label>`;
    const reqPanel = existing ? `
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:11px;padding:14px 15px">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;flex-wrap:wrap">
          <div style="font-size:17px;font-weight:800;color:#0f172a">${esc(ex.customer_nafn || '—')}</div>
          <button id="_tv-profile" type="button" style="background:none;border:none;color:#2563eb;cursor:pointer;font:inherit;font-size:12.5px;font-weight:700;padding:2px 0">Opna prófíl →</button>
        </div>
        ${ex.summary ? `<div style="margin-top:9px;padding:9px 11px;border-radius:8px;background:#f5f3ff;border:1px solid #ddd6fe"><span style="font-size:10.5px;font-weight:700;color:#7c3aed;text-transform:uppercase;letter-spacing:.03em">📋 Samantekt</span><div style="font-size:13px;color:#5b21b6;margin-top:3px;line-height:1.45">${esc(ex.summary)}</div></div>` : ''}
        <div style="font-size:13px;color:#475569;margin-top:9px">${esc(ex.title || '')}</div>
      </div>` : '';
    const metaWrap = existing
      ? `<details style="border:1px solid #e2e8f0;border-radius:10px;padding:0"><summary style="cursor:pointer;padding:11px 13px;font-size:12.5px;font-weight:700;color:#475569;list-style:none">⚙︎ Flokkun &amp; smáatriði</summary><div style="display:flex;flex-direction:column;gap:14px;padding:4px 13px 14px">${F.source}${F.customer}${F.type}${F.prioDue}${F.assigned}${F.status}</div></details>`
      : '';
    const body = existing
      ? reqPanel + F.title + F.notes(true) + metaWrap + '<div id="_tv-attach"></div>' + F.important
      : F.source + F.customer + F.type + F.title + F.notes(false) + F.prioDue + F.assigned + F.important;
    m.innerHTML = `
      <div style="position:absolute;inset:0;background:rgba(15,23,42,.55)"></div>
      <div style="position:relative;background:#fff;border-radius:14px;box-shadow:0 20px 60px rgba(0,0,0,.3);width:min(560px,calc(100vw - 20px));max-height:92vh;overflow-y:auto">
        <div style="display:flex;justify-content:space-between;align-items:center;padding:15px 20px;border-bottom:1px solid #e2e8f0">
          <h3 style="margin:0;font-size:17px;font-weight:700">${existing ? 'Breyta beiðni' : 'Ný beiðni'}</h3>
          <button id="_tv-x" style="background:none;border:none;font-size:20px;color:#94a3b8;cursor:pointer">✕</button></div>
        <div style="padding:18px 20px;display:flex;flex-direction:column;gap:14px">${body}</div>
        <div style="display:flex;gap:8px;justify-content:space-between;padding:13px 20px;border-top:1px solid #e2e8f0">
          <div style="display:flex;gap:8px">${existing ? `<button id="_tv-del" style="padding:9px 14px;border:1px solid #fca5a5;background:#fff;color:#dc2626;border-radius:8px;cursor:pointer;font:inherit;font-size:13px;font-weight:600">🗑 Eyða</button>` : ''}${existing ? `<button id="_tv-sum" title="Búa til AI-samantekt (næsta aðgerð)" style="padding:9px 14px;border:1px solid #ddd6fe;background:#f5f3ff;color:#6d28d9;border-radius:8px;cursor:pointer;font:inherit;font-size:13px;font-weight:600">✨ Samantekt</button>` : ''}${existing ? `<button id="_tv-docsend" style="padding:9px 14px;border:1px solid #c4b5fd;background:#f5f3ff;color:#6d28d9;border-radius:8px;cursor:pointer;font:inherit;font-size:13px;font-weight:600">📎 Skjöl &amp; senda</button>` : ''}</div>
          <div style="display:flex;gap:8px">
            <button id="_tv-cancel" style="padding:9px 16px;border:1px solid #cbd5e1;background:#fff;border-radius:8px;cursor:pointer;font:inherit;font-size:13px;color:#475569">Hætta við</button>
            <button id="_tv-save" style="padding:9px 18px;border:none;background:#2563eb;color:#fff;border-radius:8px;cursor:pointer;font:inherit;font-size:13px;font-weight:700">Vista beiðni</button></div>
        </div>
      </div>`;
    document.body.appendChild(m);
    const close = () => m.remove();
    m.querySelector('#_tv-x').onclick = close;
    m.querySelector('#_tv-cancel').onclick = close;
    // Segmented controls
    m.querySelectorAll('._tv-segbtn').forEach(b => b.addEventListener('click', () => {
      const name = b.dataset.name; sel[name] = b.dataset.val;
      m.querySelectorAll(`._tv-segbtn[data-name="${name}"]`).forEach(x => {
        const on = x.dataset.val === sel[name];
        x.style.background = on ? '#2563eb' : '#fff'; x.style.color = on ? '#fff' : '#334155'; x.style.borderColor = on ? '#2563eb' : '#cbd5e1';
      });
      if (name === 'type') { const nx = m.querySelector('#_tv-next'); if (nx) nx.textContent = TYPES[sel.type].next ? 'Næsta aðgerð: ' + TYPES[sel.type].next : ''; }
    }));
    // kt "Fletta upp" auto-attaches (KtLookup scans inputs with id containing "kt"); fills name field.
    setTimeout(() => { try { if (window.KtLookup && KtLookup.scan) KtLookup.scan(m); } catch (_) {} }, 60);

    if (existing) m.querySelector('#_tv-del').onclick = async () => {
      if (!confirm('Eyða þessari beiðni? (mjúk eyðing — hægt að endurheimta)')) return;
      await softDelete(existing.id); close(); render();
    };
    if (existing) m.querySelector('#_tv-docsend').onclick = () => openDocSend(existing);
    if (existing && window.TvAttach) { const ae = m.querySelector('#_tv-attach'); if (ae) window.TvAttach.wire(ae, existing.id); }
    if (existing) { const pb = m.querySelector('#_tv-profile'); if (pb) pb.onclick = () => openCustomerProfile(ex); }
    if (existing) { const sb = m.querySelector('#_tv-sum'); if (sb) sb.onclick = async () => { sb.disabled = true; sb.textContent = '✨ …'; await summarizeIds([existing.id]); sb.disabled = false; sb.textContent = '✨ Samantekt'; const row = state.items.find(x => x.id === existing.id); if (row && row.summary) toast('✨ ' + row.summary); }; }
    m.querySelector('#_tv-save').onclick = async () => {
      const name = (m.querySelector('#_tv-co-name').value || '').trim();
      const title = (m.querySelector('#_tv-title').value || '').trim();
      if (!name) { toast('Sláðu inn viðskiptavin'); return; }
      if (!title) { toast('Sláðu inn stutta lýsingu'); return; }
      const kt = normKt(m.querySelector('#_tv-co-kt').value);
      const duev = m.querySelector('#_tv-due').value;
      // Resolve customer_base_id: kt → customers_base, else name → fyrirtaeki link.
      let baseId = null;
      const SB = getSB();
      if (kt && SB) { try { const { data } = await SB.from('customers_base').select('id').eq('kennitala', kt.length === 10 ? kt.slice(0, 6) + '-' + kt.slice(6) : kt).maybeSingle(); if (data) baseId = data.id; } catch (_) {} }
      if (!baseId) { const co = _coList.find(c => (c.nafn || '').trim().toLowerCase() === name.toLowerCase() || normKt(c.kennitala) === kt); if (co) baseId = co.customer_base_id || null; }
      const rec = {
        source: sel.source, type: sel.type, priority: sel.priority, status: sel.status,
        important: !!m.querySelector('#_tv-imp')?.checked,
        customer_nafn: name, customer_base_id: baseId,
        title, notes: (m.querySelector('#_tv-notes').value || '').trim() || null,
        assigned_to: (m.querySelector('#_tv-assigned').value || '').trim() || null,
        due_at: duev ? new Date(duev + 'T09:00:00').toISOString() : null
      };
      try {
        if (existing) { await saveRow(existing.id, rec); }
        else {
          rec.created_by = currentUser();
          const { data, error } = await SB.from('thjonustubeidni').insert(rec).select().single();
          if (error) throw error;
          if (data) state.items.unshift(data);
        }
        close(); render();
        toast(existing ? '✓ Beiðni uppfærð' : '✓ Beiðni skráð');
      } catch (e) { toast('Villa: ' + (e.message || e)); }
    };
  }

  function openDetail(id) {
    const row = state.items.find(x => x.id === id);
    if (row) openForm(row);
  }

  // ── Email channel (slice 2): ingest eldklar inbox → thjonustubeidni ──────────
  // Reuses the email source + a keyword classifier mapped onto the real request
  // types, auto-matches sender → company, idempotent via channel_ref. Additive:
  // the existing Beiðnir tab (178) is untouched; this just pulls the same mail
  // into the CRM hub.
  const EML_ACCOUNT = 'eldklar@eldklar.is';
  // Skip obvious automated / system senders so they don't clog the triage pile.
  const EML_NOISE_SENDER = /(no-?reply|noreply|do-?not-?reply|donotreply|postmaster|mailer-daemon|bounce[@.]|notification[s]?@|automated@|google\.com|accounts\.google|cloudflare|mailchimp|sendgrid|amazonses|facebookmail|linkedin\.com|news@|info@e?infodreifing)/i;
  const EML_NOISE_SUBJ = /(security alert|new sign-in|google data|takeout|\bpassword\b|critical security|free plan|cloudflare|your invoice from|verify your email|undeliverable|delivery status|out of office|sjálfvirkt svar|automatic reply)/i;
  function classifyEmailType(text) {
    if (/hringja|símtal|simtal|heyra í|hringið|hringdu/i.test(text)) return 'hringja';
    if (/tilboð|tilbod|verðtilboð|\bverð\b|\bverd\b|kostar|kostnað|bjóð|boðið|\btæki\b|\btaeki\b/i.test(text)) return 'skodun_tilbod';
    if (/þjónustusamning|thjonustusamning|nýr samning|nyr samning|gera samning|\bsamning/i.test(text)) return 'nyr_samningur';
    if (/endurfyll|áfyll|afyll|hleðsl|hledsl|endurhleðsl/i.test(text)) return 'uttekt_eftirfylgni';
    if (/skýrsl|skyrsl|úttekt|uttekt|skoðun|skodun|reikning|afrit/i.test(text)) return 'skjalabeidni';
    return 'annad';
  }
  async function ingestEmail() {
    const SB = getSB(); if (!SB) return;
    await loadCompanies();
    const idx = buildCoIndex();
    let existing = [];
    try { const { data } = await SB.from('thjonustubeidni').select('channel_ref').not('channel_ref', 'is', null); existing = data || []; } catch (_) {}
    const seen = new Set(existing.map(r => String(r.channel_ref)));
    let emails = [];
    try {
      const { data, error } = await SB.from('email_digest')
        .select('id,sender_name,sender_email,subject,snippet,body_preview,received_at,folder')
        .eq('account', EML_ACCOUNT).ilike('folder', '%inbox%')
        .order('received_at', { ascending: false }).range(0, 499);
      if (error) throw error;
      emails = data || [];
    } catch (e) { toast('Email-lestur mistókst: ' + (e.message || e)); return; }
    const rows = [];
    for (const e of emails) {
      if (seen.has('email:' + e.id)) continue;
      if (/eldklar/i.test(e.sender_email || '')) continue;
      const subj = String(e.subject || '');
      if (EML_NOISE_SENDER.test(e.sender_email || '') || EML_NOISE_SUBJ.test(subj)) continue;
      const text = subj + ' ' + (e.snippet || '') + ' ' + (e.body_preview || '');
      const co = matchCompany(idx, e.sender_name, e.sender_email);
      rows.push({
        source: 'email', channel_ref: 'email:' + e.id, type: classifyEmailType(text),
        status: 'nytt', priority: 'venjulegur',
        customer_base_id: co ? (co.customer_base_id || null) : null,
        customer_nafn: co ? co.nafn : (e.sender_name || e.sender_email || '—'),
        title: subj || '(efnislaust)',
        notes: String(e.body_preview || e.snippet || '').slice(0, 2000) || null,
        created_by: 'email', created_at: e.received_at || new Date().toISOString()
      });
    }
    if (!rows.length) { toast('Engar nýjar email-beiðnir'); return; }
    // No blocking native confirm (it froze automated sessions). Import directly
    // with inline progress on the button; idempotent, so a re-run is harmless.
    const btn = document.getElementById('_tv-email');
    if (btn) { btn.disabled = true; btn.textContent = '✉️ Flyt inn ' + rows.length + '…'; }
    let ok = 0;
    for (let i = 0; i < rows.length; i += 100) {
      const chunk = rows.slice(i, i + 100);
      const { error } = await SB.from('thjonustubeidni').insert(chunk);
      if (error) { toast('Innflutningur stöðvaðist: ' + error.message); break; }
      ok += chunk.length;
      if (btn) btn.textContent = '✉️ Flyt inn ' + ok + '/' + rows.length + '…';
    }
    toast('✉️ ' + ok + ' email-beiðnir fluttar inn');
    await load();
  }

  // ── Verkdagbók channel (#13): import open follow-ups → thjonustubeidni ───────
  // KEEP BOTH (Agnar): we do NOT mark the verkdagbok row done/moved — it stays
  // visible in Verkdagbók/Þjónustuverk too while the team gets used to the hub.
  // Idempotent via channel_ref='verkdagbok:<id>'.
  function classifyVerkType(text) {
    if (/hringd|hringja|símtal|simtal|heyra í/i.test(text)) return 'hringja';
    if (/þjónustusamning|samning/i.test(text)) return 'nyr_samningur';
    if (/skýrsl|skyrsl|úttekt|uttekt|reikning|afrit/i.test(text)) return 'skjalabeidni';
    if (/áfyll|afyll|hleðsl|hledsl|endurfyll|endurhleðsl/i.test(text)) return 'uttekt_eftirfylgni';
    if (/yfirfara|kíkja|kikja|skoða|skoda|\btæki\b|\btaeki\b|tilboð|tilbod|\bverð\b/i.test(text)) return 'skodun_tilbod';
    return 'annad';
  }
  async function ingestVerkdagbok() {
    const SB = getSB(); if (!SB) return;
    await loadCompanies();
    const idx = buildCoIndex();
    let existing = [];
    try { const { data } = await SB.from('thjonustubeidni').select('channel_ref').not('channel_ref', 'is', null); existing = data || []; } catch (_) {}
    const seen = new Set(existing.map(r => String(r.channel_ref)));
    let src = [];
    try {
      const { data, error } = await SB.from('verkdagbok')
        .select('id,job_date,fyrirtaeki,athugasemdir,archived,done')
        .neq('archived', true).neq('done', true).not('athugasemdir', 'is', null)
        .order('job_date', { ascending: false }).range(0, 999);
      if (error) throw error;
      src = data || [];
    } catch (e) { toast('Verkdagbók-lestur mistókst: ' + (e.message || e)); return; }
    const rows = [];
    for (const v of src) {
      const note = String(v.athugasemdir || '').trim();
      if (!note) continue;
      if (seen.has('verkdagbok:' + v.id)) continue;
      const name = (v.fyrirtaeki || '').trim();
      const co = matchCompany(idx, name, null);
      let ca = new Date().toISOString();
      if (v.job_date) { const d = new Date(v.job_date); if (!isNaN(d)) ca = d.toISOString(); }
      rows.push({
        source: 'verkdagbok', channel_ref: 'verkdagbok:' + v.id, type: classifyVerkType(note),
        status: 'nytt', priority: 'venjulegur',
        customer_base_id: co ? (co.customer_base_id || null) : null,
        customer_nafn: co ? co.nafn : (name || '—'),
        title: note.slice(0, 80), notes: note.slice(0, 2000) || null,
        created_by: 'verkdagbok', created_at: ca
      });
    }
    if (!rows.length) { toast('Engar nýjar Verkdagbókar-beiðnir'); return; }
    const btn = document.getElementById('_tv-verk');
    if (btn) { btn.disabled = true; btn.textContent = '📓 Flyt inn ' + rows.length + '…'; }
    let ok = 0;
    for (let i = 0; i < rows.length; i += 100) {
      const chunk = rows.slice(i, i + 100);
      const { error } = await SB.from('thjonustubeidni').insert(chunk);
      if (error) { toast('Innflutningur stöðvaðist: ' + error.message); break; }
      ok += chunk.length;
      if (btn) btn.textContent = '📓 Flyt inn ' + ok + '/' + rows.length + '…';
    }
    toast('📓 ' + ok + ' Verkdagbókar-beiðnir fluttar inn'); await load();
  }

  // ── Skjala-velja + senda til baka (slice 3) — doc picker + reply preview ─────
  // Real email send needs a credential (Gmail send scope / SMTP for eldklar@);
  // until that's wired this is a DRY-RUN that shows exactly what would be sent
  // and marks the request handled. sendReply() is the single seam to go live.
  const DOC_LABELS = { samningur: 'Samningur', uttektarskyrsla: 'Úttektarskýrsla', reikningur: 'Reikningur' };
  // Live send goes through the Resend proxy (/api/email-send, RESEND_API_KEY in
  // Netlify env). SAFETY: the default From is Resend's onboarding@resend.dev,
  // which in an unverified Resend account can ONLY deliver to the account owner
  // (aggisigurds@gmail.com) — so a real customer can't be emailed by accident.
  // Switch From to noreply@eldklar.is once eldklar.is is verified in Resend.
  const SEND_LIVE = true;
  function bodyToHtml(t) {
    return '<div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;font-size:14px;color:#0f172a;white-space:pre-wrap;line-height:1.5">' +
      esc(String(t || '')) + '</div>';
  }
  async function sendReply(payload) {
    if (!SEND_LIVE) return { ok: true, dryRun: true };
    try {
      const from = /</.test(payload.from) ? payload.from : ('Slökkvitæki ehf <' + payload.from + '>');
      const body = {
        from,
        to: Array.isArray(payload.to) ? payload.to : [payload.to],
        subject: payload.subject || '(efnislaust)',
        html: bodyToHtml(payload.body)
      };
      // Attachments go up as { filename, driveId }; the email-send function
      // resolves each via the brunaholf drive-download endpoint (server-side
      // Google OAuth) into base64 — so even restricted Drive PDFs attach.
      const atts = (payload.attachments || []).filter(a => a.fileId);
      if (atts.length) body.attachments = atts.map(a => ({ filename: (a.name || 'skjal').replace(/[\\/:*?"<>|]/g, '_') + '.pdf', driveId: a.fileId }));
      const r = await fetch('/api/email-send', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
      const data = await r.json().catch(() => ({}));
      if (!r.ok || (data && data.error)) return { ok: false, error: (data && (data.message || data.error)) || ('HTTP ' + r.status) };
      return { ok: true, id: data && data.id };
    } catch (e) { return { ok: false, error: String((e && e.message) || e) }; }
  }
  function driveUrl(id) { return id ? 'https://drive.google.com/file/d/' + id + '/view' : ''; }

  // One-click pipeline test: emails aggisigurds@gmail.com via Resend (test
  // sender) WITH a small PDF attachment so the whole chain — Drive→base64
  // (server-side) → Resend — is exercised in one click. The sample is the
  // Thai Lindin þjónustusamningur (~313 kB) from the customer_documents trove.
  async function sendTest() {
    const btn = document.getElementById('_tv-test');
    if (btn) { btn.disabled = true; btn.textContent = '✉️ Sendi…'; }
    const res = await sendReply({
      from: 'onboarding@resend.dev',
      to: 'aggisigurds@gmail.com',
      subject: 'Þjónustuver — prufusending ' + new Date().toLocaleString('is-IS'),
      body: 'Halló Agnar,\n\nÞetta er prufusending úr Þjónustuver (Resend email-pípan) með PDF-viðhengi.\nEf þú færð þennan póst MEÐ viðhengi þá virkar bæði email- og skjala-sendingin. 🎉\n\n— Slökkvitæki ehf',
      attachments: [{ name: 'Prufa - Þjónustusamningur Thai Lindin', fileId: '1MGyQx87eQGFptuzYoaYmtrvv7d_Dxg57' }]
    });
    if (btn) { btn.disabled = false; btn.textContent = '✉️ Prufa send'; }
    if (res.ok) toast('✉️ Prufa send (m. PDF) á aggisigurds@gmail.com' + (res.id ? ' (' + res.id + ')' : ''));
    else toast('Prufa mistókst: ' + (res.error || 'óþekkt villa'));
  }

  async function openDocSend(row) {
    const SB = getSB(); if (!SB) return;
    if (!row.customer_base_id) { toast('Tengdu fyrst viðskiptavin — engin skjöl án tengingar.'); return; }
    await loadCompanies();
    let docs = [];
    try { const { data } = await SB.from('customer_documents').select('id,doc_type,year,drive_file_id,amount,notes').eq('customer_base_id', row.customer_base_id).order('year', { ascending: false }); docs = data || []; } catch (_) {}
    let toEmail = '';
    if (row.source === 'email' && row.channel_ref) {
      const id = String(row.channel_ref).replace(/^email:/, '');
      try { const { data } = await SB.from('email_digest').select('sender_email').eq('id', id).maybeSingle(); if (data) toEmail = data.sender_email || ''; } catch (_) {}
    }
    if (!toEmail) { const co = _coList.find(c => c.customer_base_id === row.customer_base_id) || _coList.find(c => (c.nafn || '') === row.customer_nafn); if (co) toEmail = co.netfang || ''; }
    const hay = ((row.title || '') + ' ' + (row.notes || '')).toLowerCase();
    const pre = new Set();
    if (/reikning|afrit/.test(hay)) pre.add('reikningur');
    if (/skýrsl|skyrsl|úttekt|uttekt|skoðun|skodun/.test(hay)) pre.add('uttektarskyrsla');
    if (/samning/.test(hay)) pre.add('samningur');
    // "síðasta / nýjasta / latest" → pre-select only the NEWEST of each matched
    // type (a request for "afrit af síðasta reikningi" must not tick 20 invoices).
    const wantsLatest = /síðast|sidast|seinast|seinasta|nýjast|nyjast|nýjasta|\blatest\b|\blast\b/.test(hay);
    const selected = new Set();
    pre.forEach(dt => {
      let group = docs.filter(d => d.doc_type === dt);
      if (wantsLatest) group = group.slice().sort((a, b) => (b.year || 0) - (a.year || 0) || (b.id - a.id)).slice(0, 1);
      group.forEach(d => selected.add(d.id));
    });

    document.getElementById('_tv-send')?.remove();
    const m = document.createElement('div');
    m.id = '_tv-send';
    m.style.cssText = 'position:fixed;inset:0;z-index:100050;display:flex;align-items:flex-start;justify-content:center;padding-top:4vh;font-family:inherit';
    const docRow = d => `<label style="display:flex;align-items:center;gap:9px;padding:8px 10px;border:1px solid #e2e8f0;border-radius:8px;margin-bottom:6px;cursor:pointer;font-size:12.5px">
      <input type="checkbox" class="_tv-doc" data-id="${d.id}" ${selected.has(d.id) ? 'checked' : ''} style="width:16px;height:16px">
      <span style="font-weight:600;color:#0f172a">${esc(DOC_LABELS[d.doc_type] || d.doc_type)}${d.year ? ' ' + d.year : ''}</span>
      ${d.amount ? `<span style="color:#64748b">· ${Math.round(d.amount).toLocaleString('is-IS')} kr</span>` : ''}
      <span style="flex:1"></span>
      ${d.drive_file_id ? `<a href="${driveUrl(d.drive_file_id)}" target="_blank" rel="noopener" onclick="event.stopPropagation()" style="color:#2563eb;text-decoration:none;font-size:11px">opna ↗</a>` : '<span style="color:#cbd5e1;font-size:11px">ekkert skjal</span>'}</label>`;
    m.innerHTML = `
      <div style="position:absolute;inset:0;background:rgba(15,23,42,.55)"></div>
      <div style="position:relative;background:#fff;border-radius:14px;box-shadow:0 20px 60px rgba(0,0,0,.3);width:min(580px,calc(100vw - 20px));max-height:92vh;overflow-y:auto">
        <div style="display:flex;justify-content:space-between;align-items:center;padding:15px 20px;border-bottom:1px solid #e2e8f0"><h3 style="margin:0;font-size:17px;font-weight:700">📎 Senda skjöl til baka</h3><button id="_tv-s-x" style="background:none;border:none;font-size:20px;color:#94a3b8;cursor:pointer">✕</button></div>
        <div style="padding:16px 20px;display:flex;flex-direction:column;gap:13px">
          <div style="font-size:12.5px;color:#0f172a"><strong>${esc(row.customer_nafn || '')}</strong></div>
          <div style="padding:8px 10px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;font-size:11.5px;color:#1e40af">✉️ Raunveruleg sending um Resend. <b>onboarding@resend.dev</b> kemst AÐEINS á eiganda-netfangið (aggisigurds@gmail.com) — öruggt til prufu. Til að senda á viðskiptavini þarf <b>eldklar.is</b> staðfest í Resend, veldu þá noreply@eldklar.is.</div>
          <div style="display:grid;grid-template-columns:60px 1fr;gap:8px;align-items:center;font-size:12.5px">
            <label style="color:#64748b">Frá</label>
            <select id="_tv-s-from" style="padding:7px 9px;border:1px solid #cbd5e1;border-radius:7px;font:inherit;font-size:12.5px"><option value="onboarding@resend.dev">Resend prufa — onboarding@resend.dev</option><option value="noreply@eldklar.is">noreply@eldklar.is (þarf staðfest lén)</option><option value="eldklar@eldklar.is">eldklar@eldklar.is (þarf staðfest lén)</option></select>
            <label style="color:#64748b">Til</label>
            <input id="_tv-s-to" value="${esc(toEmail)}" placeholder="netfang viðskiptavinar" style="padding:7px 9px;border:1px solid #cbd5e1;border-radius:7px;font:inherit;font-size:12.5px">
            <label style="color:#64748b">Efni</label>
            <input id="_tv-s-subj" value="Skjöl frá Slökkvitæki ehf" style="padding:7px 9px;border:1px solid #cbd5e1;border-radius:7px;font:inherit;font-size:12.5px">
          </div>
          <div><div style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;margin-bottom:6px">Skjöl (viðhengi) — ${docs.length}</div>
            ${docs.length ? docs.map(docRow).join('') : '<div style="font-size:12px;color:#94a3b8;padding:6px 0">Engin skráð skjöl fyrir þennan viðskiptavin.</div>'}</div>
          <div><div style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;margin-bottom:6px">Skilaboð</div>
            <textarea id="_tv-s-body" rows="4" style="width:100%;padding:9px 12px;border:1px solid #cbd5e1;border-radius:8px;font:inherit;font-size:12.5px;box-sizing:border-box;resize:vertical">Sæl(l),

Meðfylgjandi eru umbeðin skjöl.

Kær kveðja,
Slökkvitæki ehf</textarea></div>
        </div>
        <div id="_tv-s-foot1" style="display:flex;gap:8px;justify-content:flex-end;padding:13px 20px;border-top:1px solid #e2e8f0">
          <button id="_tv-s-cancel" style="padding:9px 16px;border:1px solid #cbd5e1;background:#fff;border-radius:8px;cursor:pointer;font:inherit;font-size:13px;color:#475569">Hætta við</button>
          <button id="_tv-s-send" style="padding:9px 18px;border:none;background:#6d28d9;color:#fff;border-radius:8px;cursor:pointer;font:inherit;font-size:13px;font-weight:700">Forskoða &amp; senda →</button>
        </div>
        <div id="_tv-s-foot2" style="display:none;flex-direction:column;gap:10px;padding:13px 20px;border-top:1px solid #e2e8f0;background:#faf5ff">
          <div id="_tv-s-summary" style="font-size:12.5px;color:#334155;line-height:1.6"></div>
          <div style="display:flex;gap:8px;justify-content:flex-end">
            <button id="_tv-s-back" style="padding:9px 16px;border:1px solid #cbd5e1;background:#fff;border-radius:8px;cursor:pointer;font:inherit;font-size:13px;color:#475569">← Til baka</button>
            <button id="_tv-s-go" style="padding:9px 18px;border:none;background:#16a34a;color:#fff;border-radius:8px;cursor:pointer;font:inherit;font-size:13px;font-weight:700">✉️ Já, senda núna</button>
          </div>
        </div>
      </div>`;
    document.body.appendChild(m);
    const close = () => m.remove();
    m.querySelector('#_tv-s-x').onclick = close;
    m.querySelector('#_tv-s-cancel').onclick = close;
    const foot1 = m.querySelector('#_tv-s-foot1'), foot2 = m.querySelector('#_tv-s-foot2');
    function gather() {
      const from = m.querySelector('#_tv-s-from').value;
      const to = (m.querySelector('#_tv-s-to').value || '').trim();
      const subject = (m.querySelector('#_tv-s-subj').value || '').trim();
      const body = m.querySelector('#_tv-s-body').value || '';
      const chosen = Array.from(m.querySelectorAll('._tv-doc')).filter(c => c.checked).map(c => +c.dataset.id);
      const atts = docs.filter(d => chosen.includes(d.id)).map(d => ({ name: (DOC_LABELS[d.doc_type] || d.doc_type) + (d.year ? ' ' + d.year : ''), fileId: d.drive_file_id, url: driveUrl(d.drive_file_id) }));
      return { from, to, subject, body, atts };
    }
    // Step 1 → in-modal preview (no blocking native dialog — that was freezing the
    // renderer in automated sessions, and it's smoother for everyone).
    m.querySelector('#_tv-s-send').onclick = () => {
      const d = gather();
      if (!d.to) { toast('Vantar netfang viðtakanda'); return; }
      const dvUrl = d.from === 'onboarding@resend.dev' && !/aggisigurds@gmail\.com/i.test(d.to)
        ? '<div style="color:#dc2626;margin-top:4px">⚠ onboarding@resend.dev kemst aðeins á aggisigurds@gmail.com — annað netfang skilar villu.</div>' : '';
      m.querySelector('#_tv-s-summary').innerHTML =
        '<div style="font-weight:700;color:#16a34a;margin-bottom:4px">Tilbúið að senda</div>' +
        '<div><b>Frá:</b> ' + esc(d.from) + '</div><div><b>Til:</b> ' + esc(d.to) + '</div>' +
        '<div><b>Efni:</b> ' + esc(d.subject) + '</div>' +
        '<div><b>Viðhengi:</b> ' + (d.atts.length ? esc(d.atts.map(a => a.name).join(', ')) : '<span style="color:#94a3b8">engin valin</span>') + '</div>' + dvUrl;
      foot1.style.display = 'none'; foot2.style.display = 'flex';
    };
    m.querySelector('#_tv-s-back').onclick = () => { foot2.style.display = 'none'; foot1.style.display = 'flex'; };
    m.querySelector('#_tv-s-go').onclick = async () => {
      const go = m.querySelector('#_tv-s-go'); go.disabled = true; go.textContent = 'Sendi…';
      const d = gather();
      const res = await sendReply({ from: d.from, to: d.to, subject: d.subject, body: d.body, attachments: d.atts });
      if (!res.ok && !res.dryRun) {
        go.disabled = false; go.textContent = '✉️ Já, senda núna';
        m.querySelector('#_tv-s-summary').insertAdjacentHTML('beforeend',
          '<div style="margin-top:8px;padding:7px 10px;background:#fef2f2;border:1px solid #fecaca;border-radius:7px;color:#b91c1c">Sending mistókst: ' + esc(res.error || 'óþekkt villa') + '</div>');
        toast('Sending mistókst: ' + (res.error || ''));
        return; // do NOT close the request — let the user retry / fix recipient
      }
      const stamp = new Date().toISOString().slice(0, 10);
      const logNote = (row.notes ? row.notes + '\n\n' : '') + '[' + stamp + '] Skjöl ' + (res.dryRun ? '(PRUFA) ' : '') + 'send til ' + d.to + ' frá ' + d.from + (res.id ? ' (Resend ' + res.id + ')' : '') + ': ' + (d.atts.map(a => a.name).join(', ') || '(engin)');
      await saveRow(row.id, { status: 'lokad', notes: logNote });
      close();
      document.getElementById('_tv-modal')?.remove();
      render();
      toast(res.dryRun ? '✓ Prufa skráð — beiðni lokað' : '✉️ Sent — beiðni lokað');
    };
  }

  // ── View + sidebar wiring (mirrors patch 178) ────────────────────────────────
  // One-time responsive styles. Inline styles win over normal stylesheet rules,
  // so the mobile overrides use !important to take effect on small screens.
  function injectStyle() {
    if (document.getElementById('_tv-style')) return;
    const s = document.createElement('style');
    s.id = '_tv-style';
    s.textContent =
      // #20 — the shared .main-panel caps width at 1200px, which left a big empty
      // strip on wide screens. Lift the cap for the Þjónustuver panel only.
      '#_tv-main.main-panel,#_tv-main{max-width:none!important;width:auto!important}' +
      '@media (max-width:640px){' +
      '#_tv-main ._tv-actions{width:100%!important}' +
      '#_tv-main ._tv-actions button{flex:1 1 40%!important;justify-content:center!important;padding:9px 6px!important}' +
      '}';
    document.head.appendChild(s);
  }
  function ensureView() {
    injectStyle();
    if (document.getElementById(VIEW_ID)) return;
    const sample = document.getElementById('view-beidnir') || document.getElementById('view-companies') || document.querySelector('.view');
    if (!sample || !sample.parentElement) return;
    const v = document.createElement('div');
    v.id = VIEW_ID;
    v.className = (sample.className || 'view').replace(/\bactive\b/g, '').trim();
    v.innerHTML = '<main id="_tv-main" class="main-panel"></main>';
    sample.parentElement.appendChild(v);
  }
  function show() {
    ensureView();
    document.querySelectorAll('[id^="view-"]').forEach(v => { v.style.display = 'none'; v.classList.remove('active'); });
    const v = document.getElementById(VIEW_ID);
    if (v) { v.style.display = 'block'; v.classList.add('active'); }
    document.querySelectorAll('.vnav-btn').forEach(b => b.classList.toggle('active', b.getAttribute('data-view') === NAV_KEY));
    render();
    if (!state.items.length && !state.loading) load();
  }
  function patchSwitchView() {
    if (!window.App || window.App._tvPatched) return;
    const orig = window.App.switchView;
    window.App.switchView = function (view) {
      if (view === NAV_KEY) { show(); return; }
      return orig.apply(this, arguments);
    };
    window.App._tvPatched = true;
  }
  function injectSidebar() {
    const nav = document.querySelector('nav.view-nav, .view-nav');
    if (!nav) { setTimeout(injectSidebar, 500); return; }
    // #21 — Þjónustuver must be the FIRST nav button (above Leiðsögn / Fyrirtæki
    // í þjónustu …). Other patches inject their buttons on their own timers, so
    // we re-assert the top position on every tick rather than only once.
    let btn = nav.querySelector('[data-view="' + NAV_KEY + '"]');
    const firstBtn = nav.querySelector('.vnav-btn');
    if (btn) {
      if (firstBtn && firstBtn !== btn && btn.parentNode === firstBtn.parentNode) firstBtn.parentNode.insertBefore(btn, firstBtn);
      return;
    }
    btn = document.createElement('button');
    // Use the plain nav class only — copying firstBtn.className dragged in stray
    // classes (e.g. a themed/gold highlight) that made this button look special.
    btn.className = 'vnav-btn';
    btn.setAttribute('data-view', NAV_KEY);
    btn.innerHTML = '<span style="display:inline-flex;align-items:center;gap:8px">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>' +
      '<span>Þjónustuver</span></span>';
    btn.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); if (window.App && App.switchView) App.switchView(NAV_KEY); else show(); });
    if (firstBtn && firstBtn.parentNode) firstBtn.parentNode.insertBefore(btn, firstBtn); else nav.appendChild(btn);
  }

  function boot() { injectSidebar(); ensureView(); patchSwitchView(); [600, 1500, 3000].forEach(t => setTimeout(injectSidebar, t)); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();

  // 2026-07-10: ingestEmail exportað svo Verkborð (231) geti sótt tölvupóst-
  // beiðnirnar án þess að opna þessa síðu — sama tafla, sama idempotency.
  window.Thjonustuver = { open: show, reload: load, ingestEmail };
  console.log('[patch-182] Þjónustuver (CRM intake hub) installed');
})();
/* === END ÞJÓNUSTUVER === */
