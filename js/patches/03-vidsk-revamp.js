/* === VIDSK REVAMP v1 === */
/* Viðskiptavinir tab — list (table + cards) and detail page mirroring Fyrirtækjaþjónusta */
(() => {
  if (typeof window === 'undefined' || !window.supabase || !window.SUPABASE_URL || !window.SUPABASE_KEY) {
    console.warn('[VidskRevamp] supabase not ready, skipping');
    return;
  }

  const SB = (window.DB && window.DB.sb) || window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_KEY);

  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));

  const initials = nafn => {
    if (!nafn) return '?';
    const w = String(nafn).trim().split(/\s+/).filter(Boolean);
    if (!w.length) return '?';
    if (w.length === 1) return w[0].slice(0, 2).toUpperCase();
    return (w[0][0] + w[w.length - 1][0]).toUpperCase();
  };

  const fmtDate = s => {
    if (!s) return '—';
    try { const d = new Date(s); if (isNaN(d)) return '—';
      return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
    } catch(e) { return '—'; }
  };

  const ktPattern = /^kt[:\s]*[0-9]{6}-?[0-9]{4}\s*$/i;
  const isPlaceholderName = n => !n || ktPattern.test(n);
  const displayName = c => isPlaceholderName(c.nafn) ? (c.kennitala ? 'kt: ' + c.kennitala : '(nafnlaus viðskiptavinur)') : c.nafn;

  // Categorize equipment by type into Fyrirtæki-matching buckets
  const TYPE_EXT_RE = /(slökkvi|abc|kolsýr|duft|extinguish)/i;
  const TYPE_HOSE_RE = /(slöng|slang|hose|brunaslang|slönguskáp)/i;
  const TYPE_SMOKE_RE = /(reyk|smoke|brunabjall)/i;
  const categorize = type => {
    const t = (type || '').toString();
    if (TYPE_HOSE_RE.test(t)) return 'hose';
    if (TYPE_SMOKE_RE.test(t)) return 'smoke';
    if (TYPE_EXT_RE.test(t)) return 'ext';
    return 'other';
  };

  // -------- state --------
  const SORT_PRESETS = [
    { id: 'name-asc',     key: 'name',    dir:  1, label: 'Stafrófsröð (A → Ö)' },
    { id: 'total-desc',   key: 'total',   dir: -1, label: 'Flest tæki fyrst' },
    { id: 'created-desc', key: 'created', dir: -1, label: 'Nýjastir fyrst' },
    { id: 'created-asc',  key: 'created', dir:  1, label: 'Elstu fyrst' }
  ];

  let customers = [];
  let unitsByPhone = {};   // phone -> [units]
  let unitsByName = {};    // name -> [units]
  let searchTerm = '';
  let sortKey = 'name';
  let sortDir = 1;
  try {
    const saved = localStorage.getItem('vidsk_sort');
    const preset = SORT_PRESETS.find(p => p.id === saved);
    if (preset) { sortKey = preset.key; sortDir = preset.dir; }
  } catch (_) { /* no localStorage */ }
  let view = 'list';       // 'list' | 'detail'
  let detailCustomer = null;
  let detailUnits = [];
  let isLoading = false;
  const selectedIds = new Set();

  function persistSort() {
    try {
      const p = SORT_PRESETS.find(x => x.key === sortKey && x.dir === sortDir);
      if (p) localStorage.setItem('vidsk_sort', p.id);
      else localStorage.removeItem('vidsk_sort');
    } catch (_) {}
  }

  async function load() {
    isLoading = true;
    try {
      const { data: rows, error } = await SB.from('vidskiptavinir').select('*').order('nafn', { ascending: true });
      if (error) throw error;
      customers = rows || [];

      const phones = customers.map(c => c.simi).filter(Boolean);
      const names = customers.map(c => c.nafn).filter(Boolean);

      unitsByPhone = {};
      unitsByName = {};

      if (phones.length) {
        const { data: byPhone } = await SB.from('uttaeki').select('*').in('phone', phones);
        for (const u of byPhone || []) {
          const k = u.phone || '';
          if (k) (unitsByPhone[k] = unitsByPhone[k] || []).push(u);
        }
      }
      if (names.length) {
        const { data: byName } = await SB.from('uttaeki').select('*').in('client', names);
        for (const u of byName || []) {
          const k = u.client || '';
          // dedupe: only count by name if not already counted by phone
          if (k && !u.phone) (unitsByName[k] = unitsByName[k] || []).push(u);
        }
      }
      window.Vidskiptavinir.list = customers;
    } finally {
      isLoading = false;
    }
  }

  function unitsFor(c) {
    const a = c.simi ? (unitsByPhone[c.simi] || []) : [];
    const b = unitsByName[c.nafn] || [];
    return a.concat(b);
  }

  function counts(c) {
    const u = unitsFor(c);
    let ext = 0, hose = 0, smoke = 0, other = 0;
    for (const x of u) {
      const cat = categorize(x.type);
      if (cat === 'ext') ext++;
      else if (cat === 'hose') hose++;
      else if (cat === 'smoke') smoke++;
      else other++;
    }
    return { ext, hose, smoke, other, total: u.length };
  }

  function ensureMain() {
    const v = document.getElementById('view-vidskiptavinir');
    if (!v) return null;
    let m = document.getElementById('vidsk-main');
    if (!m) {
      v.innerHTML = '<main id="vidsk-main" class="main-panel"></main>';
      m = v.querySelector('#vidsk-main');
    }
    return m;
  }

  // -------- list view --------
  function compareCustomers(a, b) {
    const ca = counts(a), cb = counts(b);
    let av, bv;
    if (sortKey === 'name') { av = (a.nafn || '').toLowerCase(); bv = (b.nafn || '').toLowerCase(); }
    else if (sortKey === 'kt') { av = (a.kennitala || ''); bv = (b.kennitala || ''); }
    else if (sortKey === 'simi') { av = (a.simi || ''); bv = (b.simi || ''); }
    else if (sortKey === 'ext') { av = ca.ext; bv = cb.ext; }
    else if (sortKey === 'hose') { av = ca.hose; bv = cb.hose; }
    else if (sortKey === 'smoke') { av = ca.smoke; bv = cb.smoke; }
    else if (sortKey === 'total') { av = ca.total; bv = cb.total; }
    else if (sortKey === 'created') { av = a.created_at || ''; bv = b.created_at || ''; }
    else { av = (a.nafn || '').toLowerCase(); bv = (b.nafn || '').toLowerCase(); }
    if (av < bv) return -sortDir;
    if (av > bv) return sortDir;
    return 0;
  }

  function renderList() {
    const m = ensureMain();
    if (!m) return;
    if (isLoading && !customers.length) {
      m.innerHTML = '<div class="loading-state">Hleður viðskiptavinum…</div>';
      return;
    }

    const term = searchTerm.toLowerCase().trim();
    const filtered = (term
      ? customers.filter(c => [c.nafn, c.kennitala, c.simi, c.netfang]
          .some(f => (f || '').toString().toLowerCase().includes(term)))
      : customers.slice()
    ).sort(compareCustomers);

    const arrow = k => sortKey === k ? (sortDir === 1 ? ' ▲' : ' ▼') : ' ⇅';

    const headerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:12px;">
        <div>
          <div style="font-size:19px;font-weight:600;color:var(--text,#0f1117);">Viðskiptavinir</div>
          <div style="font-size:13px;font-weight:400;color:var(--text-muted,#8891a0);">${customers.length} skráðir</div>
        </div>
        <button class="btn btn-primary btn-sm" id="vk-new-btn">+ Nýr viðskiptavinur</button>
      </div>`;

    const currentPresetId = (SORT_PRESETS.find(p => p.key === sortKey && p.dir === sortDir) || {}).id || '';
    const sortOptionsHTML = SORT_PRESETS.map(p =>
      `<option value="${p.id}"${p.id === currentPresetId ? ' selected' : ''}>${esc(p.label)}</option>`
    ).join('') + (currentPresetId ? '' : '<option value="" selected>Sérsniðin röðun</option>');

    // Bulk action bar (visible only when selection > 0)
    const filteredIds = new Set(filtered.map(c => c.id));
    const selectedInFiltered = filtered.filter(c => selectedIds.has(c.id)).length;
    const allFilteredSelected = filtered.length > 0 && selectedInFiltered === filtered.length;
    const someSelected = selectedIds.size > 0;
    const bulkBarHTML = someSelected ? `
      <div style="display:flex;align-items:center;gap:8px;padding:10px 12px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:9px;margin-top:10px;flex-wrap:wrap;">
        <span style="font-weight:600;color:#1e40af;font-size:14px;">${selectedIds.size} valdir</span>
        <button class="btn btn-outline btn-sm" id="vk-bulk-clear">Hreinsa val</button>
        <div style="flex:1;min-width:0;"></div>
        <button class="btn btn-outline btn-sm" id="vk-bulk-csv">📥 Útflytja CSV</button>
        <button class="btn btn-outline btn-sm" id="vk-bulk-email">📧 Tölvupóstur</button>
        <button class="btn btn-outline btn-sm" id="vk-bulk-delete" style="color:#dc2626;border-color:#fca5a5;">🗑️ Eyða</button>
      </div>
    ` : '';

    const searchHTML = `
      <div class="_cl_wrap" style="margin-bottom:16px;">
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
          <input id="vk-search" type="search"
                 placeholder="🔎 Leita að viðskiptavini..."
                 value="${esc(searchTerm)}"
                 style="flex:1;min-width:180px;padding:10px 14px;border:1px solid #e5e7eb;border-radius:9px;font-size:14px;background:#fff;outline:none;">
          <select id="vk-sort"
                  style="padding:10px 12px;border:1px solid #e5e7eb;border-radius:9px;font-size:14px;background:#fff;outline:none;cursor:pointer;">
            ${sortOptionsHTML}
          </select>
          ${searchTerm ? '<button class="btn btn-outline btn-sm" id="vk-clear">Hreinsa</button>' : ''}
        </div>
        ${bulkBarHTML}
        <div class="_cl_subtitle" style="margin-top:8px;color:var(--text-muted,#8891a0);font-size:13px;">
          Listi · ${filtered.length} / ${customers.length} viðskiptavinir${someSelected ? ` · ${selectedIds.size} valdir` : ''}
        </div>
        <table class="_cl_table" style="width:100%;border-collapse:collapse;margin-top:10px;background:#fff;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;">
          <thead>
            <tr style="background:#f9fafb;">
              <th style="width:36px;padding:10px 8px;text-align:center;border-bottom:1px solid #e5e7eb;">
                <input type="checkbox" id="vk-sel-all" ${allFilteredSelected ? 'checked' : ''} ${selectedInFiltered > 0 && !allFilteredSelected ? 'data-indet="1"' : ''} style="cursor:pointer;width:16px;height:16px;">
              </th>
              <th data-sort="name" style="padding:10px 12px;text-align:left;font-size:13px;font-weight:600;cursor:pointer;border-bottom:1px solid #e5e7eb;">Viðskiptavinur${arrow('name')}</th>
              <th data-sort="kt" style="padding:10px 12px;text-align:left;font-size:13px;font-weight:600;cursor:pointer;border-bottom:1px solid #e5e7eb;">Kennitala${arrow('kt')}</th>
              <th data-sort="simi" style="padding:10px 12px;text-align:left;font-size:13px;font-weight:600;cursor:pointer;border-bottom:1px solid #e5e7eb;">Sími${arrow('simi')}</th>
              <th data-sort="ext" style="padding:10px 12px;text-align:right;font-size:13px;font-weight:600;cursor:pointer;border-bottom:1px solid #e5e7eb;">🧯 Slökkvi${arrow('ext')}</th>
              <th data-sort="hose" style="padding:10px 12px;text-align:right;font-size:13px;font-weight:600;cursor:pointer;border-bottom:1px solid #e5e7eb;">🚒 Slöngur${arrow('hose')}</th>
              <th data-sort="smoke" style="padding:10px 12px;text-align:right;font-size:13px;font-weight:600;cursor:pointer;border-bottom:1px solid #e5e7eb;">🚨 Reyk${arrow('smoke')}</th>
              <th data-sort="total" style="padding:10px 12px;text-align:right;font-size:13px;font-weight:600;cursor:pointer;border-bottom:1px solid #e5e7eb;">Samtals${arrow('total')}</th>
              <th style="padding:10px 12px;border-bottom:1px solid #e5e7eb;"></th>
            </tr>
          </thead>
          <tbody>
            ${filtered.length === 0
              ? `<tr><td colspan="9" style="padding:24px;text-align:center;color:#888;">${customers.length===0 ? 'Engir viðskiptavinir skráðir.' : 'Enginn viðskiptavinur passar við leit.'}</td></tr>`
              : filtered.map(c => {
                  const cc = counts(c);
                  const isSel = selectedIds.has(c.id);
                  return `
                  <tr class="vk-row" data-id="${esc(c.id)}" style="cursor:pointer;border-bottom:1px solid #f3f4f6;${isSel ? 'background:#f0f9ff;' : ''}">
                    <td class="vk-cb-cell" style="padding:10px 8px;text-align:center;">
                      <input type="checkbox" class="vk-sel-cb" data-id="${esc(c.id)}" ${isSel ? 'checked' : ''} style="cursor:pointer;width:16px;height:16px;">
                    </td>
                    <td style="padding:10px 12px;font-size:14px;font-weight:500;">${esc(displayName(c))}</td>
                    <td style="padding:10px 12px;font-size:13px;color:#555;">${esc(c.kennitala || '—')}</td>
                    <td style="padding:10px 12px;font-size:13px;color:#555;">${esc(c.simi || '—')}</td>
                    <td style="padding:10px 12px;font-size:14px;text-align:right;">${cc.ext}</td>
                    <td style="padding:10px 12px;font-size:14px;text-align:right;">${cc.hose}</td>
                    <td style="padding:10px 12px;font-size:14px;text-align:right;">${cc.smoke}</td>
                    <td style="padding:10px 12px;font-size:14px;text-align:right;font-weight:600;">${cc.total}</td>
                    <td style="padding:10px 12px;text-align:right;"><button class="btn btn-outline btn-sm vk-row-open" data-id="${esc(c.id)}">Opna</button></td>
                  </tr>`;
                }).join('')}
          </tbody>
        </table>
      </div>`;

    const cardsHTML = '<div class="company-grid">' + filtered.map(c => {
      const cc = counts(c);
      const pill = cc.total > 0
        ? '<span class="st st-ok">Í lagi</span>'
        : '<span class="st" style="background:rgba(0,0,0,0.04);color:var(--text-muted,#8891a0);">Nýr</span>';
      return `
        <div class="company-card vk-card" data-id="${esc(c.id)}">
          <div class="company-card-top">
            <div class="company-initials">${esc(initials(isPlaceholderName(c.nafn) ? (c.kennitala || '?') : c.nafn))}</div>
            <div style="flex:1;min-width:0;">
              <div class="company-name">${esc(displayName(c))}</div>
              ${pill}
            </div>
          </div>
          <div class="company-card-bottom">
            <span class="company-stat"><strong>${cc.total}</strong> tæki</span>
            <div style="display:flex;gap:6px;">
              <button class="btn btn-outline btn-sm vk-view-btn" data-id="${esc(c.id)}">Skoða</button>
              <button class="btn btn-primary btn-sm vk-add-btn" data-id="${esc(c.id)}">+ Tæki</button>
            </div>
          </div>
        </div>`;
    }).join('') + '</div>';

    m.innerHTML = headerHTML + searchHTML + cardsHTML;

    // Wire events
    const search = m.querySelector('#vk-search');
    if (search) search.addEventListener('input', e => {
      const cur = e.target.selectionStart;
      searchTerm = e.target.value;
      renderList();
      const re = m.querySelector('#vk-search');
      if (re) { re.focus(); try { re.setSelectionRange(cur, cur); } catch(_){} }
    });
    m.querySelector('#vk-clear')?.addEventListener('click', () => { searchTerm = ''; renderList(); });
    m.querySelector('#vk-new-btn')?.addEventListener('click', () => {
      if (window.SalaMottaka?.openNewCustomer) window.SalaMottaka.openNewCustomer();
    });

    // Sort dropdown
    m.querySelector('#vk-sort')?.addEventListener('change', e => {
      const preset = SORT_PRESETS.find(p => p.id === e.target.value);
      if (preset) {
        sortKey = preset.key;
        sortDir = preset.dir;
        persistSort();
        renderList();
      }
    });

    // Sort header clicks
    m.querySelectorAll('th[data-sort]').forEach(th => {
      th.addEventListener('click', () => {
        const k = th.dataset.sort;
        if (sortKey === k) sortDir = -sortDir;
        else { sortKey = k; sortDir = 1; }
        persistSort();
        renderList();
      });
    });

    // Selection: per-row checkboxes
    m.querySelectorAll('.vk-sel-cb').forEach(cb => {
      cb.addEventListener('click', e => e.stopPropagation());
      cb.addEventListener('change', () => {
        const id = cb.dataset.id;
        if (cb.checked) selectedIds.add(id);
        else selectedIds.delete(id);
        renderList();
      });
    });

    // Selection: select-all header checkbox
    const selAll = m.querySelector('#vk-sel-all');
    if (selAll) {
      if (selAll.dataset.indet === '1') selAll.indeterminate = true;
      selAll.addEventListener('click', e => e.stopPropagation());
      selAll.addEventListener('change', () => {
        if (selAll.checked) filtered.forEach(c => selectedIds.add(c.id));
        else filtered.forEach(c => selectedIds.delete(c.id));
        renderList();
      });
    }

    // Bulk action bar
    m.querySelector('#vk-bulk-clear')?.addEventListener('click', () => {
      selectedIds.clear();
      renderList();
    });

    m.querySelector('#vk-bulk-csv')?.addEventListener('click', () => {
      const sel = customers.filter(c => selectedIds.has(c.id));
      if (sel.length === 0) return;
      const cols = ['Nafn','Kennitala','Sími','Netfang','Heimilisfang','Athugasemdir','Slökkvi','Slöngur','Reyk','Samtals'];
      const esc2 = v => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
      const rows = [cols.map(esc2).join(',')];
      for (const c of sel) {
        const cc = counts(c);
        rows.push([c.nafn||'', c.kennitala||'', c.simi||'', c.netfang||'', c.heimilisfang||'', c.athugasemdir||'', cc.ext, cc.hose, cc.smoke, cc.total].map(esc2).join(','));
      }
      const csv = '\uFEFF' + rows.join('\r\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `vidskiptavinir_${new Date().toISOString().slice(0,10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    });

    m.querySelector('#vk-bulk-email')?.addEventListener('click', () => {
      const withEmail = customers.filter(c => selectedIds.has(c.id) && c.netfang);
      if (withEmail.length === 0) {
        alert('Enginn af völdum viðskiptavinum hefur netfang skráð.');
        return;
      }
      const skipped = selectedIds.size - withEmail.length;
      if (skipped > 0 && !confirm(`${withEmail.length} hafa netfang en ${skipped} ekki. Halda áfram með ${withEmail.length}?`)) return;
      const emails = withEmail.map(c => c.netfang).join(',');
      window.location.href = 'mailto:?bcc=' + encodeURIComponent(emails);
    });

    m.querySelector('#vk-bulk-delete')?.addEventListener('click', async () => {
      const ids = Array.from(selectedIds);
      const n = ids.length;
      const word = n === 1 ? 'viðskiptavini' : 'viðskiptavinum';
      if (!confirm(`Eyða ${n} ${word}?\n\nÞetta er ekki hægt að taka til baka.`)) return;
      const btn = m.querySelector('#vk-bulk-delete');
      if (btn) { btn.disabled = true; btn.textContent = 'Eyði…'; }
      let ok = 0, err = 0;
      for (const id of ids) {
        try {
          const { error } = await SB.from('vidskiptavinir').delete().eq('id', id);
          if (error) throw error;
          ok++;
          selectedIds.delete(id);
        } catch (e) {
          err++;
          console.error('[VidskRevamp] bulk delete failed for', id, e);
        }
      }
      await load();
      renderList();
      if (err > 0) alert(`Eyddi ${ok} en ${err} mistókust.`);
    });

    // Row clicks open detail (but not when clicking checkbox or buttons)
    m.querySelectorAll('.vk-row').forEach(row => {
      row.addEventListener('click', e => {
        if (e.target.closest('button')) return;
        if (e.target.closest('.vk-cb-cell')) return;
        if (e.target.matches('input[type="checkbox"]')) return;
        openDetailById(row.dataset.id);
      });
    });
    m.querySelectorAll('.vk-row-open').forEach(b => {
      b.addEventListener('click', e => { e.stopPropagation(); openDetailById(b.dataset.id); });
    });

    // Card clicks open detail
    m.querySelectorAll('.vk-card').forEach(card => {
      card.style.cursor = 'pointer';
      card.addEventListener('click', e => {
        if (e.target.closest('button')) return;
        openDetailById(card.dataset.id);
      });
    });
    m.querySelectorAll('.vk-view-btn').forEach(b => {
      b.addEventListener('click', e => { e.stopPropagation(); openDetailById(b.dataset.id); });
    });
    m.querySelectorAll('.vk-add-btn').forEach(b => {
      b.addEventListener('click', e => {
        e.stopPropagation();
        const c = customers.find(x => String(x.id) === String(b.dataset.id));
        if (c && window.SalaMottaka?.openCustomer) {
          window.SalaMottaka.openCustomer({ kind: 'vidskiptavinur', id: c.id, nafn: c.nafn, simi: c.simi, kennitala: c.kennitala });
        }
      });
    });
  }

  // -------- detail view --------
  function openDetailById(id) {
    const c = customers.find(x => String(x.id) === String(id));
    if (!c) return;
    detailCustomer = c;
    detailUnits = unitsFor(c).slice().sort((a,b) => (a.type||'').localeCompare(b.type||''));
    view = 'detail';
    renderDetail();
  }

  function renderDetail() {
    const m = ensureMain();
    if (!m || !detailCustomer) return;
    const c = detailCustomer;
    const cc = counts(c);
    const summary = `🧯 Slökkvi: ${cc.ext}  |  🚒 Slöngur: ${cc.hose}  |  🚨 Reyk: ${cc.smoke}` +
      (cc.other > 0 ? `  |  Annað: ${cc.other}` : '');

    const headerHTML = `
      <button class="btn btn-ghost btn-sm" id="vk-back" style="display:inline-flex;align-items:center;gap:6px;margin-bottom:12px;">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
        Til baka
      </button>
      <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:20px;flex-wrap:wrap;">
        <div style="display:flex;align-items:center;gap:14px;min-width:0;">
          <div class="company-initials" style="flex-shrink:0;">${esc(initials(isPlaceholderName(c.nafn) ? (c.kennitala || '?') : c.nafn))}</div>
          <div style="min-width:0;">
            <div class="company-name" style="font-size:18px;font-weight:600;">${esc(displayName(c))}</div>
            <div style="font-size:13px;color:var(--text-muted,#8891a0);margin-top:2px;">${summary}</div>
          </div>
        </div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;">
          <button class="btn btn-outline btn-sm" id="vk-edit">Breyta</button>
          <button class="btn btn-outline btn-sm" id="vk-delete">🗑️ Eyða</button>
          <button class="btn btn-outline btn-sm" id="vk-c360">Staða</button>
          <button class="btn btn-primary btn-sm" id="vk-add-tæki">+ Bæta við tæki</button>
        </div>
      </div>`;

    const infoRow = (label, value) => `
      <div style="display:contents;">
        <div style="padding:8px 12px;font-size:13px;color:var(--text-muted,#8891a0);background:#f9fafb;border-bottom:1px solid #f3f4f6;">${esc(label)}</div>
        <div style="padding:8px 12px;font-size:14px;color:var(--text,#0f1117);background:#fff;border-bottom:1px solid #f3f4f6;">${value || '<span style="color:#9ca3af;">—</span>'}</div>
      </div>`;
    const infoGridHTML = `
      <div class="info-grid" style="display:grid;grid-template-columns:180px 1fr;gap:1px;background:#e5e7eb;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;margin-bottom:20px;">
        ${infoRow('Nafn', esc(c.nafn || ''))}
        ${infoRow('Kennitala', esc(c.kennitala || ''))}
        ${infoRow('Sími', c.simi ? `<a href="tel:${esc(c.simi)}" style="color:#2563eb;text-decoration:none;">${esc(c.simi)}</a>` : '')}
        ${infoRow('Netfang', c.netfang ? `<a href="mailto:${esc(c.netfang)}" style="color:#2563eb;text-decoration:none;">${esc(c.netfang)}</a>` : '')}
        ${infoRow('Heimilisfang', esc(c.heimilisfang || ''))}
        ${infoRow('Athugasemdir', esc(c.athugasemdir || ''))}
      </div>`;

    const tableRows = detailUnits.length === 0
      ? `<tr><td colspan="7" style="padding:20px;text-align:center;color:#888;font-style:italic;">Engin tæki skráð</td></tr>`
      : detailUnits.map(u => `
          <tr style="border-bottom:1px solid #f3f4f6;">
            <td style="padding:8px 12px;font-size:13px;">${esc(u.type || '—')}</td>
            <td style="padding:8px 12px;font-size:13px;font-family:ui-monospace,monospace;">${esc(u.serial || '—')}</td>
            <td style="padding:8px 12px;font-size:13px;">${esc(u.size || '—')}</td>
            <td style="padding:8px 12px;font-size:13px;">${esc(u.location || '—')}</td>
            <td style="padding:8px 12px;font-size:13px;">${esc(fmtDate(u.last_insp))}</td>
            <td style="padding:8px 12px;font-size:13px;">${esc(fmtDate(u.next_insp))}</td>
            <td style="padding:8px 12px;font-size:13px;">${esc(u.status || '—')}</td>
          </tr>`).join('');

    const tcardHTML = `
      <div style="margin-bottom:8px;font-size:14px;font-weight:600;color:var(--text,#0f1117);">Tæki (${detailUnits.length})</div>
      <div class="tcard" style="background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:0;overflow:hidden;">
        <table class="dtbl" style="width:100%;border-collapse:collapse;">
          <thead>
            <tr style="background:#f9fafb;">
              <th style="padding:10px 12px;text-align:left;font-size:13px;font-weight:600;border-bottom:1px solid #e5e7eb;">Tegund</th>
              <th style="padding:10px 12px;text-align:left;font-size:13px;font-weight:600;border-bottom:1px solid #e5e7eb;">Raðnúmer</th>
              <th style="padding:10px 12px;text-align:left;font-size:13px;font-weight:600;border-bottom:1px solid #e5e7eb;">Stærð</th>
              <th style="padding:10px 12px;text-align:left;font-size:13px;font-weight:600;border-bottom:1px solid #e5e7eb;">Staðsetning</th>
              <th style="padding:10px 12px;text-align:left;font-size:13px;font-weight:600;border-bottom:1px solid #e5e7eb;">Sl. skoðun</th>
              <th style="padding:10px 12px;text-align:left;font-size:13px;font-weight:600;border-bottom:1px solid #e5e7eb;">Næsta skoðun</th>
              <th style="padding:10px 12px;text-align:left;font-size:13px;font-weight:600;border-bottom:1px solid #e5e7eb;">Staða</th>
            </tr>
          </thead>
          <tbody>${tableRows}</tbody>
        </table>
      </div>`;

    m.innerHTML = headerHTML + infoGridHTML + tcardHTML;

    // Wire
    m.querySelector('#vk-back')?.addEventListener('click', () => { view = 'list'; detailCustomer = null; renderList(); });
    m.querySelector('#vk-add-tæki')?.addEventListener('click', () => {
      if (window.SalaMottaka?.openCustomer) {
        window.SalaMottaka.openCustomer({ kind: 'vidskiptavinur', id: c.id, nafn: c.nafn, simi: c.simi, kennitala: c.kennitala });
      }
    });
    m.querySelector('#vk-c360')?.addEventListener('click', () => {
      if (c.nafn && window.SalaCustomer360?.open) window.SalaCustomer360.open(c.nafn);
    });
    m.querySelector('#vk-delete')?.addEventListener('click', async () => {
      if (!confirm('Eyða viðskiptavini "' + (c.nafn || c.kennitala || c.id) + '"?\n\nÞetta er ekki hægt að taka til baka.')) return;
      try {
        const { error } = await SB.from('vidskiptavinir').delete().eq('id', c.id);
        if (error) throw error;
        view = 'list'; detailCustomer = null;
        await load();
        renderList();
      } catch (e) { alert('Villa við eyðingu: ' + e.message); }
    });
    m.querySelector('#vk-edit')?.addEventListener('click', () => openEditModal(c));
  }

  // -------- edit modal --------
  function openEditModal(c) {
    const existing = document.getElementById('vk-edit-modal');
    if (existing) existing.remove();
    const html = `
      <div id="vk-edit-modal" class="modal sm-modal" style="display:flex;position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.5);align-items:center;justify-content:center;padding:16px;">
        <div style="background:#fff;border-radius:12px;max-width:500px;width:100%;max-height:90vh;overflow:auto;padding:20px;">
          <h3 style="margin:0 0 16px 0;font-size:18px;">Breyta viðskiptavini</h3>
          <div style="display:grid;gap:12px;">
            <label style="display:block;"><div style="font-size:13px;color:#555;margin-bottom:4px;">Nafn</div>
              <input id="vk-e-nafn" value="${esc(c.nafn || '')}" style="width:100%;padding:8px 10px;border:1px solid #e5e7eb;border-radius:6px;font-size:14px;"></label>
            <label style="display:block;"><div style="font-size:13px;color:#555;margin-bottom:4px;">Kennitala</div>
              <input id="vk-e-kt" value="${esc(c.kennitala || '')}" style="width:100%;padding:8px 10px;border:1px solid #e5e7eb;border-radius:6px;font-size:14px;"></label>
            <label style="display:block;"><div style="font-size:13px;color:#555;margin-bottom:4px;">Sími</div>
              <input id="vk-e-simi" value="${esc(c.simi || '')}" style="width:100%;padding:8px 10px;border:1px solid #e5e7eb;border-radius:6px;font-size:14px;"></label>
            <label style="display:block;"><div style="font-size:13px;color:#555;margin-bottom:4px;">Netfang</div>
              <input id="vk-e-netfang" value="${esc(c.netfang || '')}" style="width:100%;padding:8px 10px;border:1px solid #e5e7eb;border-radius:6px;font-size:14px;"></label>
            <label style="display:block;"><div style="font-size:13px;color:#555;margin-bottom:4px;">Heimilisfang</div>
              <input id="vk-e-addr" value="${esc(c.heimilisfang || '')}" style="width:100%;padding:8px 10px;border:1px solid #e5e7eb;border-radius:6px;font-size:14px;"></label>
            <label style="display:block;"><div style="font-size:13px;color:#555;margin-bottom:4px;">Athugasemdir</div>
              <textarea id="vk-e-notes" rows="3" style="width:100%;padding:8px 10px;border:1px solid #e5e7eb;border-radius:6px;font-size:14px;resize:vertical;">${esc(c.athugasemdir || '')}</textarea></label>
          </div>
          <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px;">
            <button class="btn btn-outline btn-sm" id="vk-e-cancel">Hætta við</button>
            <button class="btn btn-primary btn-sm" id="vk-e-save">Vista</button>
          </div>
        </div>
      </div>`;
    document.body.insertAdjacentHTML('beforeend', html);
    const modal = document.getElementById('vk-edit-modal');
    const close = () => modal.remove();
    modal.querySelector('#vk-e-cancel').addEventListener('click', close);
    modal.addEventListener('click', e => { if (e.target === modal) close(); });
    modal.querySelector('#vk-e-save').addEventListener('click', async () => {
      const upd = {
        nafn: modal.querySelector('#vk-e-nafn').value.trim() || null,
        kennitala: modal.querySelector('#vk-e-kt').value.trim() || null,
        simi: modal.querySelector('#vk-e-simi').value.trim() || null,
        netfang: modal.querySelector('#vk-e-netfang').value.trim() || null,
        heimilisfang: modal.querySelector('#vk-e-addr').value.trim() || null,
        athugasemdir: modal.querySelector('#vk-e-notes').value.trim() || null
      };
      try {
        const { error } = await SB.from('vidskiptavinir').update(upd).eq('id', c.id);
        if (error) throw error;
        close();
        await load();
        // Reopen detail with updated record
        const updated = customers.find(x => String(x.id) === String(c.id));
        if (updated) { detailCustomer = updated; detailUnits = unitsFor(updated); renderDetail(); }
        else { view = 'list'; renderList(); }
      } catch (e) { alert('Villa við vistun: ' + e.message); }
    });
  }

  async function refresh() {
    try {
      const m = ensureMain();
      if (m && !customers.length) m.innerHTML = '<div class="loading-state">Hleður viðskiptavinum…</div>';
      await load();
      if (view === 'detail' && detailCustomer) {
        const updated = customers.find(x => String(x.id) === String(detailCustomer.id));
        if (updated) { detailCustomer = updated; detailUnits = unitsFor(updated); renderDetail(); return; }
        view = 'list'; detailCustomer = null;
      }
      renderList();
    } catch (e) {
      const m = ensureMain();
      if (m) m.innerHTML = '<div style="padding:40px;text-align:center;color:#c00;">Villa við hleðslu viðskiptavina: ' + esc(e.message) + '</div>';
      console.error('[VidskRevamp] load error', e);
    }
  }

  window.Vidskiptavinir = {
    load, render: renderList, refresh,
    list: customers,
    openDetail: c => { if (c?.id) openDetailById(c.id); },
    openNew: () => window.SalaMottaka?.openNewCustomer?.(),
    version: 'revamp-5-bulk'
  };
  window.__VidskRevampInstalled = true;

  function showVidskiptaviniView() {
    document.querySelectorAll('.view.active').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.vnav-btn.active').forEach(b => b.classList.remove('active'));
    const v = document.getElementById('view-vidskiptavinir');
    const b = document.querySelector('.vnav-btn[data-view="vidskiptavinir"]');
    if (v) v.classList.add('active');
    if (b) b.classList.add('active');
    // Reset to list view when re-entering
    view = 'list'; detailCustomer = null;
    refresh();
    document.querySelectorAll('.vnav, [class*="drawer"], [class*="menu-open"]').forEach(el => {
      el.classList.remove('open', 'active', 'menu-open');
    });
  }

  const navClickInterceptor = (e) => {
    const target = e.target.closest && e.target.closest('.vnav-btn[data-view="vidskiptavinir"]');
    if (!target) return;
    e.stopImmediatePropagation();
    e.preventDefault();
    showVidskiptaviniView();
  };
  window.addEventListener('click', navClickInterceptor, true);
  document.addEventListener('click', navClickInterceptor, true);

  function maybeRefresh() {
    const v = document.getElementById('view-vidskiptavinir');
    if (v && v.classList.contains('active')) refresh();
  }
  setTimeout(maybeRefresh, 100);

  // Nav label enforcement
  function fixLabels() {
    const fyBtn = document.querySelector('.vnav-btn[data-view="companies"]');
    if (fyBtn && fyBtn.textContent.trim() !== 'Fyrirtækjaþjónusta') fyBtn.textContent = 'Fyrirtækjaþjónusta';
    const vkBtn = document.querySelector('.vnav-btn[data-view="vidskiptavinir"]');
    if (vkBtn && vkBtn.textContent.trim() !== 'Viðskiptavinir') vkBtn.textContent = 'Viðskiptavinir';
  }
  fixLabels();
  const navHost = document.querySelector('.vnav, nav') || document.body;
  try {
    new MutationObserver(() => fixLabels()).observe(navHost, { childList: true, subtree: true, characterData: true });
  } catch (e) { setInterval(fixLabels, 2000); }
})();
/* === END VIDSK REVAMP === */
