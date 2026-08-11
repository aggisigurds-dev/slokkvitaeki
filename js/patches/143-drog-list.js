/* === DRÖG LIST v1 ===
   Surfaces all open draft sales (status='drog') so the user can see them at
   a glance and click into the Sale Editor to continue them. Drafts are
   sales that have been started (drop-off, partial pickup, etc.) but not
   yet finalized — invisible in Bókhald but very much "in progress".

   Adds:
     1. A sidebar entry "📝 Drög (N)" below Sala, with live count
     2. A modal listing all draft sales when clicked, with customer / num /
        total / created date / "✏️ Breyta" + "✅ Klára" actions per row
     3. Auto-refreshes on the `sale-edited` event the editor dispatches

   Depends on patch 142 (sale-editor).  */
(() => {
  if (window.__drogListInstalled) return;
  window.__drogListInstalled = true;

  // 2026-08-07 (ósk Agnars „I don't like this popup pages, just a normal page"):
  // Drög var áður fljótandi modal (position:fixed;inset:0). Núna er þetta VENJULEG
  // view eins og önnur borð — hliðarstiku-hnappurinn (data-view) skiptir yfir í
  // heil-síðu í #view-svæðinu, með hash-slóð (#drog), URL-routing (218) og
  // bakk-takka (276/277). Fyrirmyndin er patch 231/268.
  const VIEW_ID = 'view-drog';
  const NAV_KEY = 'drog';

  function getSB() { return (window.DB && window.DB.sb) || null; }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c =>
      ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }
  function fmtKr(n) {
    const v = Math.round(Number(n) || 0);
    return v.toLocaleString('is-IS').replace(/,/g, '.') + ' kr';
  }
  function fmtDate(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    if (isNaN(d)) return '—';
    return String(d.getDate()).padStart(2,'0') + '.' + String(d.getMonth()+1).padStart(2,'0') + '.' + d.getFullYear();
  }
  function daysSince(iso) {
    if (!iso) return 0;
    return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  }

  // 2026-06-24: show WHERE each draft's work currently sits. Verkbeiðnir nums are
  // "<saleNum>-V<n>"; their status maps to a column:
  //   received/inprogress → Verkstæði · ready → Afgreiðsla ·
  //   collected → already picked up (just finalize) · none → bara drög.
  const LOC = {
    verkstaedi: { label:'Verkstæði',   emoji:'🔧', color:'#92400e', bg:'#fef3c7', bd:'#fde68a' },
    afgreidsla: { label:'Afgreiðsla',  emoji:'📦', color:'#166534', bg:'#dcfce7', bd:'#bbf7d0' },
    sott:       { label:'Sótt · klára', emoji:'✅', color:'#1e40af', bg:'#dbeafe', bd:'#bfdbfe' },
    drog:       { label:'Bara drög',   emoji:'📝', color:'#475569', bg:'#f1f5f9', bd:'#e2e8f0' },
  };
  function locFor(statuses) {
    if (!statuses || !statuses.size) return LOC.drog;
    if (statuses.has('received') || statuses.has('inprogress') || statuses.has('in_progress')) return LOC.verkstaedi;
    if (statuses.has('ready')) return LOC.afgreidsla;
    if (statuses.has('collected')) return LOC.sott;
    return LOC.drog;
  }
  function locBadge(loc) {
    loc = loc || LOC.drog;
    return '<span style="display:inline-flex;align-items:center;gap:4px;font-size:11px;font-weight:700;padding:3px 9px;border-radius:99px;white-space:nowrap;background:' +
      loc.bg + ';color:' + loc.color + ';border:1px solid ' + loc.bd + '">' + loc.emoji + ' ' + loc.label + '</span>';
  }
  async function attachLocations(SB) {
    try {
      const { data } = await SB.from('verkbeidnir').select('num,status').limit(5000);
      const map = {};
      (data || []).forEach(v => {
        const parent = String(v.num || '').replace(/-V\d+$/, '');
        if (!parent) return;
        (map[parent] = map[parent] || new Set()).add(v.status);
      });
      _items.forEach(s => { s._loc = locFor(map[s.num]); });
    } catch (e) { console.warn('[drog-list] locations:', e); _items.forEach(s => { s._loc = LOC.drog; }); }
  }

  let _count = 0;
  let _items = [];
  // 2026-05-21: persisted sort mode.
  const DROG_SORT_KEY = '_drog_sort_v1';
  function loadSort() {
    try { return localStorage.getItem(DROG_SORT_KEY) || 'updated_desc'; } catch (_) { return 'updated_desc'; }
  }
  function saveSort(v) { try { localStorage.setItem(DROG_SORT_KEY, v); } catch (_) {} }
  let _sortMode = loadSort();
  let _showDeleted = false;   // 2026-06-24: reveal soft-deleted (hidden) drög

  async function loadDrog() {
    const SB = getSB();
    if (!SB) return;
    try {
      let q = SB.from('solur')
        .select('id,num,customer_nafn,samtals,greitt_med,created_at,updated_at,athugasemdir,hidden')
        .eq('status', 'drog');
      if (!_showDeleted) q = q.neq('hidden', true);   // soft-deleted drög hidden by default
      const { data, error } = await q.order('updated_at', { ascending: false }).limit(100);
      if (error) { console.warn('[drog-list] load error:', error); return; }
      _items = data || [];
      _count = _items.filter(s => !s.hidden).length;   // badge = active (non-deleted) drög
      await attachLocations(SB);
      updateBadge();
      // Lifandi endurnýjun (30s/sale-edited) uppfærir listann þegar viewið er opið.
      const vv = document.getElementById(VIEW_ID);
      if (vv && vv.classList.contains('active') && document.getElementById('_drog-body')) renderList();
    } catch (e) {
      console.warn('[drog-list] load exception:', e);
    }
  }

  // ── Sidebar entry ─────────────────────────────────────────────────────────
  function injectSidebar() {
    const nav = document.querySelector('nav.view-nav, .view-nav');
    if (!nav) { setTimeout(injectSidebar, 500); return; }
    if (nav.querySelector('._drog-nav-btn')) { updateBadge(); return; }
    // Place right after the Sala nav button
    const allBtns = Array.from(nav.querySelectorAll('.vnav-btn'));
    const salaBtn = allBtns.find(b => /\bsala\b/i.test(b.textContent || ''));
    if (!salaBtn) { setTimeout(injectSidebar, 500); return; }
    const btn = document.createElement('button');
    btn.className = salaBtn.className.replace(/\bactive\b/g, '').trim() + ' _drog-nav-btn';
    btn.setAttribute('data-drog-nav', '1');
    btn.setAttribute('data-view', NAV_KEY);   // venjuleg view — App.switchView þekkir hana
    btn.innerHTML = '<span style="margin-right:6px">📝</span>Drög <span class="_drog-badge" style="display:none;margin-left:6px;background:#f59e0b;color:#fff;font-size:10px;font-weight:700;padding:1px 7px;border-radius:99px">0</span>';
    btn.addEventListener('click', e => {
      e.preventDefault();
      e.stopPropagation();
      if (window.App && App.switchView) App.switchView(NAV_KEY); else show();
    });
    salaBtn.parentNode.insertBefore(btn, salaBtn.nextSibling);
    updateBadge();
  }

  function updateBadge() {
    const badge = document.querySelector('._drog-badge');
    if (!badge) return;
    badge.textContent = String(_count);
    badge.style.display = _count > 0 ? 'inline-block' : 'none';
  }

  // ── View (venjuleg heil-síða, ekki modal) ─────────────────────────────────
  // Búið til dýnamískt eins og verkborð (231) / aksturslisti (268): eigin
  // #view-drog í view-svæðinu, hausinn (titill + „Sýna eydd" + röðun) færður úr
  // gamla modal-hausnum, ENGIN ✕ (bakk-takkinn/hliðarstikan sér um að fara burt).
  function ensureView() {
    let v = document.getElementById(VIEW_ID);
    if (v) return v;
    const sample = document.getElementById('view-counter') || document.getElementById('view-sala');
    v = document.createElement('div');
    v.id = VIEW_ID;
    v.className = 'view';
    v.innerHTML =
      '<div style="min-height:100vh;background:#f8fafc;display:flex;flex-direction:column;font-family:inherit">' +
        '<div style="padding:16px 22px;background:linear-gradient(135deg,#f59e0b,#d97706);color:#fff;display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap">' +
          '<div>' +
            '<h2 style="margin:0;font-size:19px;font-weight:700;color:#fff">📝 Drög</h2>' +
            '<div style="font-size:12px;color:#fef3c7;margin-top:2px">Sölur sem hafa ekki verið kláraðar — birtast ekki í Bókhaldi fyrr en klárað er</div>' +
          '</div>' +
          '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">' +
            '<label style="display:flex;align-items:center;gap:5px;font-size:12px;color:#fff;cursor:pointer;white-space:nowrap"><input type="checkbox" id="_drog-showdel" style="cursor:pointer"> Sýna eydd</label>' +
            '<select id="_drog-sort" title="Raða" style="padding:6px 9px;border:1px solid rgba(255,255,255,0.4);border-radius:7px;background:rgba(255,255,255,0.15);color:#fff;font:inherit;font-size:12.5px;font-weight:600;cursor:pointer">' +
              '<option value="updated_desc" style="color:#0f172a">🕐 Nýlega breytt fyrst</option>' +
              '<option value="created_desc" style="color:#0f172a">📅 Nýjast stofnað</option>' +
              '<option value="created_asc" style="color:#0f172a">📅 Elst stofnað</option>' +
              '<option value="amount_desc" style="color:#0f172a">💰 Hæsta upphæð</option>' +
              '<option value="amount_asc" style="color:#0f172a">💰 Lægsta upphæð</option>' +
            '</select>' +
          '</div>' +
        '</div>' +
        '<div id="_drog-body" style="flex:1;background:#f8fafc"></div>' +
      '</div>';
    (sample && sample.parentElement ? sample.parentElement : document.body).appendChild(v);
    // Haus-stýringar vírðar einu sinni (viewið lifir áfram á milli heimsókna).
    const sortSel = v.querySelector('#_drog-sort');
    if (sortSel) {
      sortSel.value = _sortMode;
      sortSel.addEventListener('change', e => { _sortMode = e.target.value; saveSort(_sortMode); renderList(); });
    }
    const showDel = v.querySelector('#_drog-showdel');
    if (showDel) {
      showDel.checked = _showDeleted;
      showDel.addEventListener('change', async e => { _showDeleted = e.target.checked; await loadDrog(); renderList(); });
    }
    return v;
  }

  // Sýna viewið: fela önnur, virkja þetta, spegla #drog í slóðina (277 gerir
  // það svo að alvöru bakk-færslu), sækja fersk gögn.
  function show() {
    ensureView();
    document.querySelectorAll('.view,[id^="view-"]').forEach(x => { x.style.display = 'none'; x.classList.remove('active'); });
    const v = document.getElementById(VIEW_ID);
    if (v) { v.style.display = 'block'; v.classList.add('active'); }
    document.querySelectorAll('.vnav-btn').forEach(b => b.classList.toggle('active', b.getAttribute('data-view') === NAV_KEY));
    try { if ((location.hash || '').replace(/^#/, '') !== NAV_KEY) history.replaceState(null, '', '#' + NAV_KEY); } catch (_) {}
    renderList();
    loadDrog().then(renderList).catch(() => {});
  }

  // Vefja App.switchView: okkar view → show(); annað → fela okkar view (fellur á
  // .active-regluna hvort eð er, en 268-mynstrið gerir þetta skýrt).
  function patchSwitchView() {
    if (!window.App) { setTimeout(patchSwitchView, 150); return; }
    if (window.App._drogSwitchPatched) return;
    const orig = window.App.switchView;
    window.App.switchView = function (view) {
      if (view === NAV_KEY) { show(); return; }
      const r = orig ? orig.apply(this, arguments) : undefined;
      try { const el = document.getElementById(VIEW_ID); if (el) { el.style.display = 'none'; el.classList.remove('active'); } } catch (_) {}
      return r;
    };
    for (const k in orig) { try { window.App.switchView[k] = orig[k]; } catch (_) {} }
    window.App._drogSwitchPatched = true;
  }

  function renderList() {
    const body = document.getElementById('_drog-body');
    if (!body) return;
    if (!_items.length) {
      body.innerHTML = '<div style="padding:32px;text-align:center;color:#94a3b8;font-style:italic;font-size:13px">Engin drög í gangi 🎉</div>';
      return;
    }
    // 2026-05-21: client-side sort so the dropdown takes effect without a
    // round-trip. Pulled the items in updated_desc order, but the user can
    // re-sort here.
    const sorted = _items.slice().sort((a, b) => {
      switch (_sortMode) {
        case 'created_desc': return (b.created_at || '').localeCompare(a.created_at || '');
        case 'created_asc':  return (a.created_at || '').localeCompare(b.created_at || '');
        case 'amount_desc':  return (+b.samtals || 0) - (+a.samtals || 0);
        case 'amount_asc':   return (+a.samtals || 0) - (+b.samtals || 0);
        default: /* updated_desc */
          return (b.updated_at || b.created_at || '').localeCompare(a.updated_at || a.created_at || '');
      }
    });
    const rows = sorted.map(s => {
      const age = daysSince(s.created_at);
      const ageBadge = age > 14
        ? '<span style="font-size:10px;font-weight:700;background:#fee2e2;color:#991b1b;padding:2px 7px;border-radius:99px">' + age + ' daga gamalt</span>'
        : (age > 7 ? '<span style="font-size:10px;font-weight:700;background:#fef3c7;color:#92400e;padding:2px 7px;border-radius:99px">' + age + ' daga</span>'
                   : '<span style="font-size:10px;color:#64748b">' + age + ' d</span>');
      const actions = s.hidden
        ? '<button data-act="restore" type="button" style="padding:6px 12px;background:#0f766e;color:#fff;border:none;border-radius:6px;cursor:pointer;font:inherit;font-size:12px;font-weight:600">↩ Endurheimta</button>'
        : '<button data-act="edit" type="button" style="padding:6px 12px;background:#2563eb;color:#fff;border:none;border-radius:6px;cursor:pointer;font:inherit;font-size:12px;font-weight:600;margin-right:4px">✏️ Breyta</button>' +
          '<button data-act="finalize" type="button" style="padding:6px 12px;background:#16a34a;color:#fff;border:none;border-radius:6px;cursor:pointer;font:inherit;font-size:12px;font-weight:600;margin-right:4px">✅ Klára</button>' +
          '<button data-act="delete" type="button" title="Eyða drögum (hægt að endurheimta)" style="padding:6px 11px;background:#fff;border:1px solid #fecaca;color:#dc2626;border-radius:6px;cursor:pointer;font:inherit;font-size:12px;font-weight:600">🗑</button>';
      return `
        <tr data-id="${s.id}" style="${s.hidden ? 'opacity:.55;background:#fff7ed' : ''}">
          <td style="padding:11px 14px;font-family:monospace;font-size:12px;color:#475569">${esc(s.num || '—')}</td>
          <td style="padding:11px 14px;font-weight:600;color:#0f172a">${esc(s.customer_nafn || '—')}${s.hidden ? ' <span style="font-size:10px;font-weight:700;color:#dc2626">· eytt</span>' : ''}</td>
          <td style="padding:11px 14px">${locBadge(s._loc)}</td>
          <td style="padding:11px 14px;color:#475569;font-size:12.5px">${esc(s.greitt_med || '—')}</td>
          <td style="padding:11px 14px;color:#475569;font-size:12px">${esc(fmtDate(s.created_at))} · ${ageBadge}</td>
          <td style="padding:11px 14px;text-align:right;font-weight:700;color:#0f172a;font-variant-numeric:tabular-nums">${fmtKr(s.samtals)}</td>
          <td style="padding:9px 12px;text-align:right;white-space:nowrap">${actions}</td>
        </tr>`;
    }).join('');
    body.innerHTML = `
      <table style="width:100%;border-collapse:collapse;font-size:13px">
        <thead><tr style="background:#fff;text-align:left;border-bottom:1px solid #e2e8f0">
          <th style="padding:10px 14px;font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.04em">Num</th>
          <th style="padding:10px 14px;font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.04em">Viðskiptavinur</th>
          <th style="padding:10px 14px;font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.04em">Staðsetning</th>
          <th style="padding:10px 14px;font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.04em">Greiðsla</th>
          <th style="padding:10px 14px;font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.04em">Stofnað</th>
          <th style="padding:10px 14px;text-align:right;font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.04em">Upphæð</th>
          <th></th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>`;

    body.querySelectorAll('tbody tr').forEach(tr => {
      const id = tr.dataset.id;
      const on = (act, fn) => { const b = tr.querySelector('button[data-act="' + act + '"]'); if (b) b.addEventListener('click', fn); };
      on('edit', () => { if (window.SaleEditor) window.SaleEditor.openById(id); });
      on('finalize', () => { if (window.SaleEditor) window.SaleEditor.openById(id); });
      on('delete', async () => {
        const drogMsg = 'Eyða þessum drögum?\n\nÞau hverfa af listanum en hægt er að endurheimta (haka í „Sýna eydd").';
        const drogOk = (window.Confirm && Confirm.show) ? await Confirm.show(drogMsg) : window.confirm(drogMsg);
        if (!drogOk) return;
        const SB = getSB(); if (!SB) return;
        try { await SB.from('solur').update({ hidden: true, hidden_at: new Date().toISOString() }).eq('id', id); }
        catch (e) { alert('Tókst ekki að eyða: ' + (e.message || e)); return; }
        if (window.Toast && Toast.show) Toast.show('🗑 Drögum eytt');
        await loadDrog(); renderList();
      });
      on('restore', async () => {
        const SB = getSB(); if (!SB) return;
        try { await SB.from('solur').update({ hidden: false, hidden_at: null }).eq('id', id); }
        catch (e) { alert('Tókst ekki að endurheimta: ' + (e.message || e)); return; }
        if (window.Toast && Toast.show) Toast.show('↩ Drög endurheimt');
        await loadDrog(); renderList();
      });
    });
  }

  // ── Refresh hooks ─────────────────────────────────────────────────────────
  document.addEventListener('sale-edited', loadDrog);
  // Periodic refresh in case other tabs/devices change drög
  setInterval(loadDrog, 30000);

  // ── Boot ──────────────────────────────────────────────────────────────────
  function boot() {
    ensureView();               // #view-drog til strax svo patch 218 leysi #drog
    injectSidebar();
    setTimeout(injectSidebar, 1000);
    patchSwitchView();
    setTimeout(patchSwitchView, 1500);
    setTimeout(loadDrog, 600);
    // deep-link á fyrstu hleðslu + hashchange (samhliða patch 218-routing)
    if ((location.hash || '').replace(/^#/, '') === NAV_KEY) setTimeout(() => { if (window.App && App.switchView) App.switchView(NAV_KEY); else show(); }, 300);
    window.addEventListener('hashchange', () => { if ((location.hash || '').replace(/^#/, '') === NAV_KEY) show(); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  // Public API (open opnar nú viewið; ytri kallar — pos.js pos-drog, patch 78
  // Workshop.openDrog — halda áfram að virka).
  window.DrogList = {
    open: show,
    refresh: loadDrog,
    count: () => _count
  };
  console.log('[patch-143] drog-list installed — sidebar view + badge (#drog)');
})();
/* === END DRÖG LIST === */
