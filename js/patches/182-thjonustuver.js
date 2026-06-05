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
  const SOURCES = { phone: { label: 'Sími', icon: '📞' }, store: { label: 'Verslun', icon: '🏪' }, field: { label: 'Vettvangur', icon: '🚐' }, email: { label: 'Tölvupóstur', icon: '✉️' } };
  const SOURCE_ORDER = ['phone', 'store', 'field', 'email'];
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

  // ── State ───────────────────────────────────────────────────────────────────
  const state = {
    items: [], loading: false,
    queue: 'open',                 // nytt | mine | overdue | bedid | open
    search: '',
    fType: '', fPriority: '', fSource: '',
    selected: new Set(),
    sort: 'new'                    // new | old | age | priority
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
  }

  function inQueue(row, q) {
    const me = currentUser();
    if (q === 'nytt') return row.status === 'nytt';
    if (q === 'mine') return (row.assigned_to || '') === me && row.status !== 'lokad';
    if (q === 'overdue') return isOverdue(row);
    if (q === 'bedid') return row.status === 'bedid';
    return row.status !== 'lokad'; // open
  }
  function visibleRows() {
    let r = state.items.filter(x => inQueue(x, state.queue));
    if (state.fType) r = r.filter(x => x.type === state.fType);
    if (state.fPriority) r = r.filter(x => x.priority === state.fPriority);
    if (state.fSource) r = r.filter(x => x.source === state.fSource);
    const s = state.search.trim().toLowerCase();
    if (s) r = r.filter(x => [x.customer_nafn, x.title, x.notes, x.assigned_to].some(f => (f || '').toLowerCase().includes(s)));
    const pr = { har: 0, venjulegur: 1, lagur: 2 };
    r.sort((a, b) => {
      if (state.sort === 'old') return new Date(a.created_at) - new Date(b.created_at);
      if (state.sort === 'age') return ageDays(b) - ageDays(a);
      if (state.sort === 'priority') return (pr[a.priority] ?? 1) - (pr[b.priority] ?? 1) || (new Date(b.created_at) - new Date(a.created_at));
      return new Date(b.created_at) - new Date(a.created_at);
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

  function render() {
    const main = document.getElementById('_tv-main');
    if (!main) return;
    const prevActive = document.activeElement;
    const keepSearch = prevActive && prevActive.id === '_tv-search';
    const c = queueCounts();
    const rows = visibleRows();
    const QUEUES = [
      ['nytt', '🆕 Nýtt', c.nytt, '#2563eb'],
      ['mine', '👤 Mínar', c.mine, '#0f766e'],
      ['overdue', '⏰ Útrunnið', c.overdue, '#dc2626'],
      ['bedid', '⏳ Bíður', c.bedid, '#d97706'],
      ['open', '📋 Allar opnar', c.open, '#0f172a']
    ];
    const qBtn = ([k, lbl, n, col]) => `<button class="_tv-q" data-q="${k}" style="display:flex;flex-direction:column;gap:2px;padding:9px 14px;border:1px solid ${state.queue === k ? col : '#e2e8f0'};background:${state.queue === k ? col : '#fff'};color:${state.queue === k ? '#fff' : '#334155'};border-radius:10px;cursor:pointer;font:inherit;min-width:84px">
      <span style="font-size:19px;font-weight:800;line-height:1">${n}</span><span style="font-size:11px;font-weight:600;opacity:${state.queue === k ? 1 : .8}">${lbl}</span></button>`;

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
        <td style="${cell};font-weight:700;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(r.customer_nafn || '—')}</td>
        <td style="${cell}">${typeChip(r.type)}</td>
        <td style="${cell};max-width:280px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${esc(r.title || '')}">${esc(r.title || '')}</td>
        <td style="${cell};text-align:center" title="${esc(src.label)}">${src.icon}</td>
        <td style="${cell};text-align:center">${r.priority === 'har' ? '<span style="color:#dc2626;font-weight:700">⚑ Hár</span>' : (r.priority === 'lagur' ? '<span style="color:#94a3b8">Lágur</span>' : 'Venjul.')}</td>
        <td style="${cell}"><select class="_tv-status" data-id="${r.id}" onclick="event.stopPropagation()" style="padding:3px 6px;border:1px solid #cbd5e1;border-radius:6px;font:inherit;font-size:11.5px">${STATUS_ORDER.map(s => `<option value="${s}" ${r.status === s ? 'selected' : ''}>${STATUSES[s]}</option>`).join('')}</select></td>
        <td style="${cell};text-align:right;${od ? 'color:#dc2626;font-weight:700' : 'color:#64748b'}">${ageDays(r)} d</td>
        <td style="${cell};text-align:center"><span title="${esc(r.assigned_to || '')}" style="display:inline-block;min-width:22px;font-size:10.5px;font-weight:700;color:#475569">${esc(initials || '—')}</span></td>
      </tr>`;
    }).join('') : `<tr><td colspan="9" style="padding:34px;text-align:center;color:#94a3b8">Engar beiðnir í þessari biðröð. 🎉</td></tr>`;

    main.innerHTML = `
      <div style="max-width:1200px;margin:0 auto;padding:16px 18px 60px">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:14px">
          <div><div style="font-size:21px;font-weight:800;color:#0f172a">🛎️ Þjónustuver</div>
            <div style="font-size:12px;color:#94a3b8">Sameiginlegt inbox — kúnna-beiðnir úr öllum farvegum</div></div>
          <div style="display:flex;gap:8px"><button id="_tv-refresh" style="padding:8px 12px;border:1px solid #cbd5e1;background:#fff;border-radius:8px;cursor:pointer;font:inherit;font-size:12.5px;font-weight:600;color:#475569">↻ Sækja</button>
            <button id="_tv-email" title="Flytja inn nýjar beiðnir úr eldklar pósthólfi" style="padding:8px 12px;border:1px solid #cbd5e1;background:#fff;border-radius:8px;cursor:pointer;font:inherit;font-size:12.5px;font-weight:600;color:#475569">✉️ Sækja tölvupóst</button>
            <button id="_tv-new" style="padding:8px 15px;border:none;background:#2563eb;color:#fff;border-radius:8px;cursor:pointer;font:inherit;font-size:13px;font-weight:700">+ Ný beiðni</button></div>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px">${QUEUES.map(qBtn).join('')}</div>
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:12px">
          <input id="_tv-search" type="search" placeholder="🔍 Leita…" value="${esc(state.search)}" style="flex:1;min-width:160px;padding:8px 12px;border:1px solid #cbd5e1;border-radius:8px;font:inherit;font-size:13px">
          <select id="_tv-ftype" style="padding:7px 9px;border:1px solid #cbd5e1;border-radius:8px;font:inherit;font-size:12px"><option value="">Allar tegundir</option>${TYPE_ORDER.map(t => `<option value="${t}" ${state.fType === t ? 'selected' : ''}>${TYPES[t].label}</option>`).join('')}</select>
          <select id="_tv-fpri" style="padding:7px 9px;border:1px solid #cbd5e1;border-radius:8px;font:inherit;font-size:12px"><option value="">Forgangur</option>${Object.keys(PRIORITIES).map(p => `<option value="${p}" ${state.fPriority === p ? 'selected' : ''}>${PRIORITIES[p]}</option>`).join('')}</select>
          <select id="_tv-fsrc" style="padding:7px 9px;border:1px solid #cbd5e1;border-radius:8px;font:inherit;font-size:12px"><option value="">Farvegur</option>${SOURCE_ORDER.map(s => `<option value="${s}" ${state.fSource === s ? 'selected' : ''}>${SOURCES[s].icon} ${SOURCES[s].label}</option>`).join('')}</select>
          <select id="_tv-sort" style="padding:7px 9px;border:1px solid #cbd5e1;border-radius:8px;font:inherit;font-size:12px"><option value="new" ${state.sort === 'new' ? 'selected' : ''}>Nýjast fyrst</option><option value="old" ${state.sort === 'old' ? 'selected' : ''}>Elst fyrst</option><option value="age" ${state.sort === 'age' ? 'selected' : ''}>Aldur</option><option value="priority" ${state.sort === 'priority' ? 'selected' : ''}>Forgangur</option></select>
        </div>
        ${bulk}
        <div style="background:#fff;border:1px solid #e2e8f0;border-radius:11px;overflow:hidden">
          <div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse">
            <thead><tr>
              <th style="${th};text-align:center;width:34px"><input type="checkbox" id="_tv-all" style="width:15px;height:15px"></th>
              <th style="${th}">Viðskiptavinur</th><th style="${th}">Tegund</th><th style="${th}">Lýsing</th>
              <th style="${th};text-align:center">Farv.</th><th style="${th};text-align:center">Forgangur</th>
              <th style="${th}">Staða</th><th style="${th};text-align:right">Aldur</th><th style="${th};text-align:center">Ábyrgð</th>
            </tr></thead><tbody>${state.loading ? '<tr><td colspan="9" style="padding:30px;text-align:center;color:#94a3b8">Hleður…</td></tr>' : body}</tbody>
          </table></div>
        </div>
        <div style="margin-top:10px;font-size:11px;color:#94a3b8;text-align:center">${rows.length} beiðnir í þessari sýn · ${state.items.length} opnar/virkar alls</div>
      </div>`;

    wire(main, rows);
    if (keepSearch) { const el = main.querySelector('#_tv-search'); if (el) { el.focus(); try { el.setSelectionRange(el.value.length, el.value.length); } catch (_) {} } }
  }

  function wire(main, rows) {
    main.querySelector('#_tv-refresh')?.addEventListener('click', load);
    main.querySelector('#_tv-email')?.addEventListener('click', ingestEmail);
    main.querySelector('#_tv-new')?.addEventListener('click', () => openForm());
    main.querySelectorAll('._tv-q').forEach(b => b.addEventListener('click', () => { state.queue = b.dataset.q; state.selected.clear(); render(); }));
    let t = null;
    main.querySelector('#_tv-search')?.addEventListener('input', e => { clearTimeout(t); t = setTimeout(() => { state.search = e.target.value; render(); }, 180); });
    main.querySelector('#_tv-ftype')?.addEventListener('change', e => { state.fType = e.target.value; render(); });
    main.querySelector('#_tv-fpri')?.addEventListener('change', e => { state.fPriority = e.target.value; render(); });
    main.querySelector('#_tv-fsrc')?.addEventListener('change', e => { state.fSource = e.target.value; render(); });
    main.querySelector('#_tv-sort')?.addEventListener('change', e => { state.sort = e.target.value; render(); });

    main.querySelectorAll('._tv-status').forEach(sel => sel.addEventListener('change', async e => {
      e.stopPropagation();
      await saveRow(+sel.dataset.id, { status: sel.value });
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

  // ── + Ný beiðni / detail form (shared modal) ─────────────────────────────────
  let _coList = [];
  async function loadCompanies() {
    if (_coList.length) return;
    const SB = getSB(); if (!SB) return;
    try { const { data } = await SB.from('fyrirtaeki').select('id,nafn,kennitala,netfang,customer_base_id').is('deleted_at', null).order('nafn').limit(3000); _coList = data || []; } catch (_) {}
  }

  function seg(name, opts, val) {
    return `<div class="_tv-seg" data-name="${name}" style="display:flex;gap:6px;flex-wrap:wrap">${opts.map(([v, lbl]) =>
      `<button type="button" class="_tv-segbtn" data-name="${name}" data-val="${v}" style="padding:7px 12px;border:1px solid ${val === v ? '#2563eb' : '#cbd5e1'};background:${val === v ? '#2563eb' : '#fff'};color:${val === v ? '#fff' : '#334155'};border-radius:8px;cursor:pointer;font:inherit;font-size:12.5px;font-weight:600">${lbl}</button>`).join('')}</div>`;
  }

  async function openForm(existing) {
    await loadCompanies();
    document.getElementById('_tv-modal')?.remove();
    const ex = existing || {};
    const sel = { source: ex.source || 'phone', type: ex.type || 'annad', priority: ex.priority || 'venjulegur' };
    const m = document.createElement('div');
    m.id = '_tv-modal';
    m.style.cssText = 'position:fixed;inset:0;z-index:100040;display:flex;align-items:flex-start;justify-content:center;padding-top:4vh;font-family:inherit';
    m.innerHTML = `
      <div style="position:absolute;inset:0;background:rgba(15,23,42,.55)"></div>
      <div style="position:relative;background:#fff;border-radius:14px;box-shadow:0 20px 60px rgba(0,0,0,.3);width:min(560px,calc(100vw - 20px));max-height:92vh;overflow-y:auto">
        <div style="display:flex;justify-content:space-between;align-items:center;padding:15px 20px;border-bottom:1px solid #e2e8f0">
          <h3 style="margin:0;font-size:17px;font-weight:700">${existing ? 'Breyta beiðni' : 'Ný beiðni'}</h3>
          <button id="_tv-x" style="background:none;border:none;font-size:20px;color:#94a3b8;cursor:pointer">✕</button></div>
        <div style="padding:18px 20px;display:flex;flex-direction:column;gap:14px">
          <div><label style="display:block;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;margin-bottom:6px">Farvegur *</label>
            ${seg('source', SOURCE_ORDER.map(s => [s, SOURCES[s].icon + ' ' + SOURCES[s].label]), sel.source)}</div>
          <div><label style="display:block;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;margin-bottom:6px">Viðskiptavinur *</label>
            <input id="_tv-co-name" list="_tv-co-list" autocomplete="off" value="${esc(ex.customer_nafn || '')}" placeholder="Veldu úr lista eða sláðu inn" style="width:100%;padding:9px 12px;border:1px solid #cbd5e1;border-radius:8px;font:inherit;font-size:13px;box-sizing:border-box">
            <datalist id="_tv-co-list">${_coList.map(c => `<option value="${esc(c.nafn || '')}"></option>`).join('')}</datalist>
            <input id="_tv-co-kt" value="${esc(ex.__kt || '')}" placeholder="Kennitala (Fletta upp)" style="width:100%;margin-top:8px;padding:9px 12px;border:1px solid #cbd5e1;border-radius:8px;font:inherit;font-size:13px;box-sizing:border-box"></div>
          <div><label style="display:block;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;margin-bottom:6px">Tegund</label>
            ${seg('type', TYPE_ORDER.map(t => [t, TYPES[t].label]), sel.type)}
            <div id="_tv-next" style="font-size:11px;color:#94a3b8;margin-top:6px;min-height:14px">${TYPES[sel.type].next ? 'Næsta aðgerð: ' + TYPES[sel.type].next : ''}</div></div>
          <div><label style="display:block;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;margin-bottom:6px">Stutt lýsing *</label>
            <input id="_tv-title" value="${esc(ex.title || '')}" placeholder="t.d. Vill tilboð í 12 tæki" style="width:100%;padding:9px 12px;border:1px solid #cbd5e1;border-radius:8px;font:inherit;font-size:13px;box-sizing:border-box"></div>
          <div><label style="display:block;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;margin-bottom:6px">Nánar</label>
            <textarea id="_tv-notes" rows="3" placeholder="Valfrjálst" style="width:100%;padding:9px 12px;border:1px solid #cbd5e1;border-radius:8px;font:inherit;font-size:13px;box-sizing:border-box;resize:vertical">${esc(ex.notes || '')}</textarea></div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
            <div><label style="display:block;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;margin-bottom:6px">Forgangur</label>
              ${seg('priority', Object.keys(PRIORITIES).map(p => [p, PRIORITIES[p]]), sel.priority)}</div>
            <div><label style="display:block;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;margin-bottom:6px">Frestur</label>
              <input id="_tv-due" type="date" value="${ex.due_at ? String(ex.due_at).slice(0, 10) : ''}" style="width:100%;padding:8px 10px;border:1px solid #cbd5e1;border-radius:8px;font:inherit;font-size:13px;box-sizing:border-box"></div>
          </div>
          <div><label style="display:block;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;margin-bottom:6px">Ábyrgð</label>
            <input id="_tv-assigned" value="${esc(ex.assigned_to != null ? ex.assigned_to : currentUser())}" style="width:100%;padding:9px 12px;border:1px solid #cbd5e1;border-radius:8px;font:inherit;font-size:13px;box-sizing:border-box"></div>
        </div>
        <div style="display:flex;gap:8px;justify-content:space-between;padding:13px 20px;border-top:1px solid #e2e8f0">
          <div>${existing ? `<button id="_tv-del" style="padding:9px 14px;border:1px solid #fca5a5;background:#fff;color:#dc2626;border-radius:8px;cursor:pointer;font:inherit;font-size:13px;font-weight:600">🗑 Eyða</button>` : ''}</div>
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
        source: sel.source, type: sel.type, priority: sel.priority,
        customer_nafn: name, customer_base_id: baseId,
        title, notes: (m.querySelector('#_tv-notes').value || '').trim() || null,
        assigned_to: (m.querySelector('#_tv-assigned').value || '').trim() || null,
        due_at: duev ? new Date(duev + 'T09:00:00').toISOString() : null
      };
      try {
        if (existing) { await saveRow(existing.id, rec); }
        else {
          rec.status = 'nytt'; rec.created_by = currentUser();
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
  const EML_NOISE_SENDER = /(google\.com|accounts\.google|no-?reply@google|postmaster|mailer-daemon)/i;
  const EML_NOISE_SUBJ = /(security alert|new sign-in|google data|takeout|\bpassword\b|critical security)/i;
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
    const byEmail = new Map(), byDomain = new Map();
    _coList.forEach(c => {
      const e = (c.netfang || '').trim().toLowerCase();
      if (!e) return;
      byEmail.set(e, c);
      const d = e.split('@')[1];
      if (d && !/gmail|hotmail|outlook|live|icloud|yahoo|me\.com/.test(d) && !byDomain.has(d)) byDomain.set(d, c);
    });
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
      const senderEmail = (e.sender_email || '').trim().toLowerCase();
      let co = byEmail.get(senderEmail);
      if (!co) { const d = senderEmail.split('@')[1]; if (d) co = byDomain.get(d); }
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
    if (!confirm('Flytja inn ' + rows.length + ' nýjar email-beiðnir úr ' + EML_ACCOUNT + '?')) return;
    let ok = 0;
    for (let i = 0; i < rows.length; i += 100) {
      const chunk = rows.slice(i, i + 100);
      const { error } = await SB.from('thjonustubeidni').insert(chunk);
      if (error) { toast('Innflutningur stöðvaðist: ' + error.message); break; }
      ok += chunk.length;
    }
    toast('✉️ ' + ok + ' email-beiðnir fluttar inn');
    await load();
  }

  // ── View + sidebar wiring (mirrors patch 178) ────────────────────────────────
  function ensureView() {
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
    if (nav.querySelector('[data-view="' + NAV_KEY + '"]')) return;
    const allBtns = Array.from(nav.querySelectorAll('.vnav-btn'));
    const ref = allBtns.find(b => b.getAttribute('data-view') === 'beidnir') ||
                allBtns.find(b => /viðskiptavinir/i.test(b.textContent)) || allBtns[allBtns.length - 1];
    const btn = document.createElement('button');
    btn.className = (ref && ref.className) || 'vnav-btn';
    btn.setAttribute('data-view', NAV_KEY);
    btn.innerHTML = '<span style="display:inline-flex;align-items:center;gap:8px">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>' +
      '<span>Þjónustuver</span></span>';
    btn.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); if (window.App && App.switchView) App.switchView(NAV_KEY); else show(); });
    if (ref && ref.parentNode) ref.parentNode.insertBefore(btn, ref.nextSibling); else nav.appendChild(btn);
  }

  function boot() { injectSidebar(); ensureView(); patchSwitchView(); [600, 1500, 3000].forEach(t => setTimeout(injectSidebar, t)); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();

  window.Thjonustuver = { open: show, reload: load };
  console.log('[patch-182] Þjónustuver (CRM intake hub) installed');
})();
/* === END ÞJÓNUSTUVER === */
