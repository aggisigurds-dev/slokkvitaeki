/* === ÁRSSKOÐUN v1 ===
 *
 * New top-level sidebar tab "📋 Ársskoðun" — replaces the role that the
 * old Fyrirtækjaþjónustu page had for once-per-year fire-extinguisher
 * inspection customers. Old Fyrirtækjaþjónusta is left untouched.
 *
 * What it shows
 *   • 295 companies that appear in the úttektarskýrslur sheet
 *   • Per-company: kennitala, address, monthly inspection slot, latest
 *     inspection status (2026 done? 2025?), equipment counts, estimated
 *     yearly service revenue (computed from equipment × yfirferð prices,
 *     adjusted by Áminning discount), Áminning note from skuldunautaskrá.
 *
 * Views
 *   • Card view (default) — visual grid like Brunakerfisþjónusta
 *   • List view — dense table, sortable, searchable
 *   • Toggle preserved via localStorage
 *
 * Filters
 *   • Month chips — show only companies whose inspection slot is that month
 *   • Status chips — "Búið 2026" / "Eftir 2026" / "Allt"
 *   • Free-text search (matches name, kt, address)
 *
 * Sort
 *   • Alphabetical (default for card view)
 *   • By inspection month (Jan-Dec → current year roll-over)
 *   • By last-serviced date (oldest first — i.e. most overdue)
 *
 * Detail modal
 *   • Equipment counts in a small grid
 *   • Áminning note (special pricing)
 *   • Estimated yearly revenue
 *   • History list (last inspections by year)
 *   • Quick links to: Fyrirtæki detail · Þjónustutæki (map) · Brunakerfi
 *
 * Data source
 *   • AppSettings.arsskodun_customers — written by tmp_import_arsskodun.mjs
 *     and tmp_enrich_arsskodun.mjs. Schema:
 *       <co_id>: { co_id, equipment:{lettvatn,duft2,duft6_12,co2_2,co2_5,
 *                  brunaslongur,eldvarnarteppi,reykskynjarar},
 *                  inspect_month, last_year_inspected, last_skodun,
 *                  last_skra, annad, history:[…],
 *                  aminning, aminning_parsed, estimated_yearly }
 */
(() => {
  if (window.__arsskodunInstalled) return;
  window.__arsskodunInstalled = true;

  const VIEW_ID = 'view-arsskodun';
  const NAV_KEY = 'arsskodun';
  const STORAGE_KEY = 'arsskodun_customers';
  const LS_VIEW = 'arsskodun_view';
  const LS_SORT = 'arsskodun_sort';
  const LS_MONTH = 'arsskodun_month';
  const LS_STATUS = 'arsskodun_status';
  const LS_SEARCH = 'arsskodun_search';

  function getSB() { return (window.DB && window.DB.sb) || null; }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c =>
      ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }
  function fmtKr(n) {
    const v = Math.round(Number(n) || 0);
    if (!v) return '—';
    return v.toLocaleString('is-IS').replace(/,/g, '.') + ' kr';
  }
  function fmtKrShort(n) {
    const v = Math.round(Number(n) || 0);
    if (v === 0) return '—';
    if (v >= 1000000) return (v / 1000000).toFixed(1).replace('.0','').replace('.', ',') + 'M';
    if (v >= 10000) return Math.round(v / 1000) + 'þ';
    if (v >= 1000) return (v / 1000).toFixed(1).replace('.', ',') + 'þ';
    return String(v);
  }
  const MONTHS_IS = ['Janúar','Febrúar','Mars','Apríl','Maí','Júní','Júlí','Ágúst','September','Október','Nóvember','Desember'];
  const MONTHS_IS_SHORT = ['Jan','Feb','Mar','Apr','Maí','Jún','Júl','Ágú','Sep','Okt','Nóv','Des'];
  // Filter out junk áminning entries — sometimes the sheet has "0 kr",
  // "FALSE", or short throwaway strings that aren't real notes.
  function cleanAminning(s) {
    const t = String(s == null ? '' : s).trim();
    if (!t) return '';
    if (/^(0\s*kr|false|true|—|-|0|null)$/i.test(t)) return '';
    if (t.length < 4) return '';                 // single words / typos
    if (/^h(æ|a)\s*h(ó|o)w*\s*$/i.test(t)) return ''; // "hæ hó" test entry
    return t;
  }

  function fmtKt(k) {
    const s = String(k || '').replace(/[^0-9]/g, '');
    if (s.length === 10) return s.slice(0, 6) + '-' + s.slice(6);
    return s || '';
  }

  // ── Data loader ──────────────────────────────────────────────────────────
  let _cache = { list: [], byId: {}, allCompanies: [] };

  async function loadAll() {
    const SB = getSB();
    if (!SB) return;
    if (window.AppSettings && window.AppSettings.load) {
      try { await window.AppSettings.load(); } catch (_) {}
    }
    const map = (window.AppSettings && window.AppSettings.path && window.AppSettings.path(STORAGE_KEY)) || {};
    const ids = Object.keys(map).map(k => +k).filter(Boolean);

    let companies = [];
    if (ids.length) {
      // Pull in batches of 80 to stay under PostgREST URL limits
      for (let i = 0; i < ids.length; i += 80) {
        const batch = ids.slice(i, i + 80);
        const { data } = await SB.from('fyrirtaeki')
          .select('id,nafn,kennitala,simi,farsimi,heimilisfang,netfang,tengiliður,athugasemdir')
          .in('id', batch);
        companies.push(...(data || []));
      }
    }
    _cache.allCompanies = companies;
    _cache.byId = Object.fromEntries(companies.map(c => [c.id, c]));
    _cache.list = companies.map(c => ({
      ...c,
      _ars: map[String(c.id)] || {}
    })).sort((a, b) => String(a.nafn || '').localeCompare(String(b.nafn || ''), 'is'));
  }

  // ── Sidebar entry ────────────────────────────────────────────────────────
  function injectSidebar() {
    const nav = document.querySelector('nav.view-nav, .view-nav');
    if (!nav) { setTimeout(injectSidebar, 500); return; }
    if (nav.querySelector('[data-view="' + NAV_KEY + '"]')) return;
    // Insert AFTER Brunakerfisþjónusta if present, else AFTER Þjónustutæki,
    // else at the end.
    const allBtns = Array.from(nav.querySelectorAll('.vnav-btn'));
    const after = allBtns.find(b => /brunakerf/i.test(b.textContent || ''))
              || allBtns.find(b => /þjónustutæki|fyrirtæki/i.test(b.textContent || ''))
              || allBtns[0];
    const tpl = after || allBtns[0];
    if (!tpl) { setTimeout(injectSidebar, 500); return; }
    const btn = document.createElement('button');
    btn.className = (tpl.className || 'vnav-btn').replace(/\bactive\b/g, '').trim();
    btn.setAttribute('data-view', NAV_KEY);
    btn.innerHTML = '<span style="margin-right:6px">📋</span>Ársskoðun';
    btn.addEventListener('click', e => {
      e.preventDefault(); e.stopPropagation();
      if (window.App && App.switchView) App.switchView(NAV_KEY);
      else show();
    });
    if (after && after.parentNode) after.parentNode.insertBefore(btn, after.nextSibling);
    else nav.appendChild(btn);
  }

  // ── View container ───────────────────────────────────────────────────────
  function ensureView() {
    if (document.getElementById(VIEW_ID)) return;
    const sample = document.getElementById('view-counter') || document.getElementById('view-companies');
    if (!sample || !sample.parentElement) return;
    const v = document.createElement('div');
    v.id = VIEW_ID;
    v.className = sample.className.replace(/\bactive\b/g, '').trim();
    v.innerHTML = '<main id="ars-main" class="main-panel"></main>';
    sample.parentElement.appendChild(v);
  }

  // ── Hook App.switchView ──────────────────────────────────────────────────
  function patchSwitchView() {
    if (!window.App || window.App._arsSwitchPatched) return;
    const orig = window.App.switchView;
    window.App.switchView = function (view) {
      if (view === NAV_KEY) {
        ensureView();
        document.querySelectorAll('[id^="view-"]').forEach(v => {
          v.style.display = 'none';
          v.classList.remove('active');
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
    window.App._arsSwitchPatched = true;
  }

  // ── Filters / sort state ────────────────────────────────────────────────
  const state = {
    view: localStorage.getItem(LS_VIEW) || 'card',          // 'card' | 'list'
    sort: localStorage.getItem(LS_SORT) || 'alpha',         // 'alpha' | 'month' | 'oldest'
    month: parseInt(localStorage.getItem(LS_MONTH) || '0', 10), // 0 = all
    status: localStorage.getItem(LS_STATUS) || 'all',        // 'all' | 'done' | 'pending' | 'never'
    search: localStorage.getItem(LS_SEARCH) || ''
  };
  function saveState() {
    localStorage.setItem(LS_VIEW, state.view);
    localStorage.setItem(LS_SORT, state.sort);
    localStorage.setItem(LS_MONTH, String(state.month));
    localStorage.setItem(LS_STATUS, state.status);
    localStorage.setItem(LS_SEARCH, state.search);
  }

  function filteredSorted() {
    const today = new Date();
    const curYear = today.getFullYear();
    const curMonth = today.getMonth() + 1;
    let arr = _cache.list.slice();

    if (state.month >= 1 && state.month <= 12) {
      arr = arr.filter(c => +c._ars.inspect_month === state.month);
    }
    if (state.status === 'done') {
      arr = arr.filter(c => +c._ars.last_year_inspected === curYear);
    } else if (state.status === 'pending') {
      arr = arr.filter(c => {
        const m = +c._ars.inspect_month || 0;
        const last = +c._ars.last_year_inspected || 0;
        return last < curYear && (m === 0 || m <= curMonth);
      });
    } else if (state.status === 'never') {
      arr = arr.filter(c => !c._ars.last_year_inspected);
    }
    const q = state.search.trim().toLowerCase();
    if (q) {
      arr = arr.filter(c => {
        const hay = (c.nafn || '') + ' ' + (c.kennitala || '') + ' ' + (c.heimilisfang || '');
        return hay.toLowerCase().includes(q);
      });
    }
    if (state.sort === 'alpha') {
      arr.sort((a, b) => String(a.nafn || '').localeCompare(b.nafn || '', 'is'));
    } else if (state.sort === 'month') {
      // Closest upcoming month first (wrapping). Current month at top, then
      // next, then …, with finished-this-year pushed to bottom.
      arr.sort((a, b) => {
        const ma = +a._ars.inspect_month || 13;
        const mb = +b._ars.inspect_month || 13;
        const da = (ma - curMonth + 12) % 12;
        const db = (mb - curMonth + 12) % 12;
        return da - db || String(a.nafn).localeCompare(b.nafn, 'is');
      });
    } else if (state.sort === 'oldest') {
      arr.sort((a, b) => {
        const ya = +a._ars.last_year_inspected || 0;
        const yb = +b._ars.last_year_inspected || 0;
        return ya - yb || String(a.nafn).localeCompare(b.nafn, 'is');
      });
    }
    return arr;
  }

  // ── Render ───────────────────────────────────────────────────────────────
  async function show() {
    ensureView();
    const main = document.getElementById('ars-main');
    if (!main) return;
    main.innerHTML = '<div style="padding:24px;color:#94a3b8">Hleður…</div>';
    await loadAll();
    render();
  }

  function render() {
    const main = document.getElementById('ars-main');
    if (!main) return;
    const all = _cache.list;
    const filtered = filteredSorted();

    const today = new Date();
    const curYear = today.getFullYear();
    const monthCounts = Array(13).fill(0);
    all.forEach(c => { const m = +c._ars.inspect_month || 0; if (m >= 1 && m <= 12) monthCounts[m]++; });
    const doneThisYear = all.filter(c => +c._ars.last_year_inspected === curYear).length;
    const totalEstimate = all.reduce((s, c) => s + (+c._ars.estimated_yearly || 0), 0);
    const estDoneThisYear = all
      .filter(c => +c._ars.last_year_inspected === curYear)
      .reduce((s, c) => s + (+c._ars.estimated_yearly || 0), 0);

    main.innerHTML = `
      <div style="max-width:1400px;margin:0 auto;padding:18px 22px 60px">
        <div style="display:flex;justify-content:space-between;align-items:flex-end;flex-wrap:wrap;gap:14px;margin-bottom:14px">
          <div>
            <h1 style="margin:0;font-size:22px;color:#0f172a;display:flex;align-items:center;gap:10px">📋 Ársskoðun</h1>
            <div style="font-size:12px;color:#64748b;margin-top:2px">${all.length} viðskiptavinir í árlegri slökkvitækjaskoðun</div>
          </div>
          <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
            <div style="display:flex;border:1px solid #cbd5e1;border-radius:8px;overflow:hidden;background:#fff">
              <button data-view-mode="card" class="_ars-vm" style="padding:7px 14px;border:none;background:${state.view==='card'?'#0f172a':'#fff'};color:${state.view==='card'?'#fff':'#475569'};cursor:pointer;font:inherit;font-size:12px;font-weight:600">🟦 Kort</button>
              <button data-view-mode="list" class="_ars-vm" style="padding:7px 14px;border:none;background:${state.view==='list'?'#0f172a':'#fff'};color:${state.view==='list'?'#fff':'#475569'};cursor:pointer;font:inherit;font-size:12px;font-weight:600;border-left:1px solid #cbd5e1">📋 Listi</button>
            </div>
            <select id="_ars-sort" style="padding:7px 10px;border:1px solid #cbd5e1;border-radius:8px;background:#fff;font:inherit;font-size:12px;color:#0f172a;cursor:pointer">
              <option value="alpha" ${state.sort==='alpha'?'selected':''}>↕️ Stafrófsröð</option>
              <option value="month" ${state.sort==='month'?'selected':''}>📅 Eftir skoðunarmánuði (næst fyrst)</option>
              <option value="oldest" ${state.sort==='oldest'?'selected':''}>⏳ Þeir elstu fyrst (lengst síðan skoðað)</option>
            </select>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:14px">
          <div style="background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:11px 13px">
            <div style="font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.05em">Fjöldi</div>
            <div style="font-size:22px;font-weight:800;color:#0f172a;line-height:1.1;margin-top:2px">${all.length}</div>
            <div style="font-size:10.5px;color:#64748b">viðskiptavinir alls</div>
          </div>
          <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:11px 13px">
            <div style="font-size:10px;font-weight:700;color:#166534;text-transform:uppercase;letter-spacing:.05em">Búið ${curYear}</div>
            <div style="font-size:22px;font-weight:800;color:#15803d;line-height:1.1;margin-top:2px">${doneThisYear}</div>
            <div style="font-size:10.5px;color:#16a34a">${Math.round(doneThisYear/Math.max(all.length,1)*100)}% af öllum</div>
          </div>
          <div style="background:#fef3c7;border:1px solid #fde68a;border-radius:10px;padding:11px 13px">
            <div style="font-size:10px;font-weight:700;color:#92400e;text-transform:uppercase;letter-spacing:.05em">Eftir ${curYear}</div>
            <div style="font-size:22px;font-weight:800;color:#b45309;line-height:1.1;margin-top:2px">${all.length - doneThisYear}</div>
            <div style="font-size:10.5px;color:#b45309">í pípunni</div>
          </div>
          <div style="background:linear-gradient(135deg,#0f172a,#1e293b);color:#fff;border:1px solid #0f172a;border-radius:10px;padding:11px 13px">
            <div style="font-size:10px;font-weight:700;color:#cbd5e1;text-transform:uppercase;letter-spacing:.05em">Áætlaðar tekjur ${curYear}</div>
            <div style="font-size:22px;font-weight:800;color:#fff;line-height:1.1;margin-top:2px;font-variant-numeric:tabular-nums">${fmtKr(totalEstimate)}</div>
            <div style="font-size:10.5px;color:#86efac">${fmtKr(estDoneThisYear)} þegar innheimt</div>
          </div>
        </div>

        <!-- Filter strip -->
        <div style="display:flex;gap:7px;align-items:center;flex-wrap:wrap;margin-bottom:8px">
          <input id="_ars-search" type="search" placeholder="🔎 Leita í nafni, kt eða heimilisfangi…" value="${esc(state.search)}" style="flex:1;min-width:220px;padding:8px 11px;border:1px solid #cbd5e1;border-radius:8px;font:inherit;font-size:13px;background:#fff;color:#0f172a;outline:none"/>
          <div style="display:flex;gap:5px;border:1px solid #cbd5e1;border-radius:8px;overflow:hidden;background:#fff">
            ${[
              { v: 'all', label: 'Allt' },
              { v: 'done', label: '✅ Búið ' + curYear },
              { v: 'pending', label: '⏳ Eftir' },
              { v: 'never', label: '⛔ Aldrei' }
            ].map(s => `
              <button data-status="${s.v}" class="_ars-st" style="padding:7px 11px;border:none;background:${state.status===s.v?'#0f172a':'#fff'};color:${state.status===s.v?'#fff':'#475569'};cursor:pointer;font:inherit;font-size:11.5px;font-weight:600">${esc(s.label)}</button>
            `).join('')}
          </div>
        </div>

        <!-- Month chip row -->
        <div style="display:flex;gap:5px;flex-wrap:wrap;margin-bottom:14px;align-items:center">
          <span style="font-size:10.5px;font-weight:700;color:#64748b;text-transform:uppercase;padding-right:3px">Mánuður:</span>
          <button data-month="0" class="_ars-mo" style="padding:5px 11px;border:1px solid ${state.month===0?'#0f172a':'#cbd5e1'};background:${state.month===0?'#0f172a':'#fff'};color:${state.month===0?'#fff':'#475569'};border-radius:99px;cursor:pointer;font:inherit;font-size:11px;font-weight:600">Allir</button>
          ${MONTHS_IS_SHORT.map((m, i) => {
            const mn = i + 1;
            const cnt = monthCounts[mn];
            const sel = state.month === mn;
            return `<button data-month="${mn}" class="_ars-mo" style="padding:5px 10px;border:1px solid ${sel?'#0f172a':(cnt?'#cbd5e1':'#e2e8f0')};background:${sel?'#0f172a':'#fff'};color:${sel?'#fff':(cnt?'#0f172a':'#cbd5e1')};border-radius:99px;cursor:pointer;font:inherit;font-size:11px;font-weight:600">${esc(m)} ${cnt?`<span style="opacity:.6;font-weight:500">${cnt}</span>`:''}</button>`;
          }).join('')}
        </div>

        ${filtered.length === 0 ? `
          <div style="background:#fff;border:2px dashed #cbd5e1;border-radius:12px;padding:38px;text-align:center;color:#64748b">
            <div style="font-size:30px;margin-bottom:8px">🔍</div>
            <div style="font-size:14px;font-weight:600;color:#0f172a;margin-bottom:3px">Engin fyrirtæki passa við þessa síu</div>
            <div style="font-size:12px">Reyndu að breyta sía eða leitarstreng.</div>
          </div>
        ` : (state.view === 'card' ? renderCards(filtered) : renderTable(filtered))}

        <div style="margin-top:18px;font-size:11px;color:#94a3b8;text-align:center">
          Sýni <strong style="color:#475569">${filtered.length}</strong> af ${all.length} viðskiptavinum
        </div>
      </div>
    `;

    // Wire interactions
    main.querySelectorAll('._ars-vm').forEach(b => b.addEventListener('click', () => {
      state.view = b.dataset.viewMode; saveState(); render();
    }));
    main.querySelector('#_ars-sort')?.addEventListener('change', e => {
      state.sort = e.target.value; saveState(); render();
    });
    main.querySelectorAll('._ars-st').forEach(b => b.addEventListener('click', () => {
      state.status = b.dataset.status; saveState(); render();
    }));
    main.querySelectorAll('._ars-mo').forEach(b => b.addEventListener('click', () => {
      state.month = parseInt(b.dataset.month, 10); saveState(); render();
    }));
    let _searchTimer = null;
    main.querySelector('#_ars-search')?.addEventListener('input', e => {
      clearTimeout(_searchTimer);
      _searchTimer = setTimeout(() => { state.search = e.target.value; saveState(); render(); }, 200);
    });
    main.querySelectorAll('._ars-row, ._ars-card').forEach(el => {
      el.addEventListener('click', e => {
        if (e.target.closest('button, a')) return;
        const id = +el.dataset.coId;
        if (id) openDetail(id);
      });
    });
    main.querySelectorAll('._ars-open-map').forEach(b => b.addEventListener('click', e => {
      e.stopPropagation();
      const id = +b.dataset.coId;
      openOnMap(id);
    }));
    main.querySelectorAll('._ars-open-fyrirt').forEach(b => b.addEventListener('click', e => {
      e.stopPropagation();
      const id = +b.dataset.coId;
      if (window._openCompanySafe) window._openCompanySafe(id);
      else if (window.App && App.switchView) App.switchView('companies');
    }));
  }

  function attCount(coId) {
    const attsAll = (window.AppSettings && window.AppSettings.path && window.AppSettings.path('company_attachments')) || {};
    return (attsAll[String(coId)] || []).length;
  }

  function renderCards(arr) {
    const today = new Date();
    const curYear = today.getFullYear();
    const curMonth = today.getMonth() + 1;
    return `
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(310px,1fr));gap:11px">
        ${arr.map(c => {
          const ars = c._ars || {};
          const eq = ars.equipment || {};
          const totalEq = Object.values(eq).reduce((s, v) => s + (+v || 0), 0);
          const m = +ars.inspect_month || 0;
          const monthLabel = m >= 1 && m <= 12 ? MONTHS_IS[m-1] : '—';
          const lastYr = +ars.last_year_inspected || 0;
          const isDone = lastYr === curYear;
          const isOverdue = !isDone && (m > 0 && m <= curMonth);
          const aminning = cleanAminning(ars.aminning);
          const est = +ars.estimated_yearly || 0;

          const statusBadge = isDone
            ? '<span style="background:#dcfce7;color:#15803d;font-size:9.5px;font-weight:700;padding:2px 7px;border-radius:99px;border:1px solid #bbf7d0">✅ ' + curYear + '</span>'
            : isOverdue
            ? '<span style="background:#fee2e2;color:#b91c1c;font-size:9.5px;font-weight:700;padding:2px 7px;border-radius:99px;border:1px solid #fecaca">⚠ Á eftir</span>'
            : '<span style="background:#fef3c7;color:#92400e;font-size:9.5px;font-weight:700;padding:2px 7px;border-radius:99px;border:1px solid #fde68a">⏳ Í pípu</span>';

          return `
            <div class="_ars-card" data-co-id="${c.id}" style="background:#fff;border:1px solid #e2e8f0;border-radius:11px;padding:12px 14px;display:flex;flex-direction:column;gap:7px;box-shadow:0 1px 2px rgba(0,0,0,0.03);cursor:pointer;transition:all .15s" onmouseover="this.style.borderColor='#94a3b8';this.style.boxShadow='0 2px 8px rgba(0,0,0,0.06)'" onmouseout="this.style.borderColor='#e2e8f0';this.style.boxShadow='0 1px 2px rgba(0,0,0,0.03)'">
              <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px">
                <div style="min-width:0;flex:1">
                  <div style="font-weight:700;color:#0f172a;font-size:13.5px;line-height:1.25">${esc(c.nafn || '—')}</div>
                  ${c.kennitala ? `<div style="font-size:10.5px;color:#94a3b8;font-family:monospace;margin-top:1px">kt. ${esc(fmtKt(c.kennitala))}</div>` : ''}
                  ${c.heimilisfang ? `<div style="font-size:11px;color:#64748b;margin-top:2px">📍 ${esc(c.heimilisfang)}</div>` : ''}
                </div>
                <div style="display:flex;flex-direction:column;gap:3px;align-items:flex-end">${statusBadge}</div>
              </div>

              <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:5px;font-size:11px;margin-top:2px">
                <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:4px 7px">
                  <div style="font-size:9px;font-weight:700;color:#64748b;text-transform:uppercase">Skoðun</div>
                  <div style="font-size:12px;font-weight:700;color:${m===curMonth?'#dc2626':'#0f172a'}">${esc(MONTHS_IS_SHORT[m-1] || '—')}</div>
                </div>
                <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:4px 7px">
                  <div style="font-size:9px;font-weight:700;color:#64748b;text-transform:uppercase">Tæki</div>
                  <div style="font-size:12px;font-weight:700;color:#0f172a">${totalEq}</div>
                </div>
                <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px;padding:4px 7px">
                  <div style="font-size:9px;font-weight:700;color:#166534;text-transform:uppercase">Áætl.</div>
                  <div style="font-size:11.5px;font-weight:700;color:#15803d;font-variant-numeric:tabular-nums">${fmtKrShort(est)}</div>
                </div>
              </div>

              ${(() => {
                const ac = attCount(c.id);
                return ac > 0 ? `<div style="display:flex;align-items:center;gap:5px;font-size:10.5px;color:#64748b"><span style="background:#dbeafe;color:#1d4ed8;font-weight:700;padding:1px 6px;border-radius:99px;border:1px solid #93c5fd">📎 ${ac} ${ac === 1 ? 'skjal' : 'skjöl'}</span></div>` : '';
              })()}
              ${aminning ? `<div style="background:#fffbeb;border:1px solid #fde68a;border-radius:6px;padding:5px 8px;font-size:10.5px;color:#92400e;line-height:1.35"><strong style="font-weight:700">📌 Áminning:</strong> ${esc(aminning.slice(0, 140))}${aminning.length>140?'…':''}</div>` : ''}

              <div style="display:flex;gap:5px;margin-top:3px">
                <button class="_ars-open-fyrirt" data-co-id="${c.id}" type="button" style="flex:1;padding:5px 9px;background:#fff;color:#0f172a;border:1px solid #cbd5e1;border-radius:6px;cursor:pointer;font:inherit;font-size:10.5px;font-weight:600">🏢 Fyrirtæki</button>
                <button class="_ars-open-map" data-co-id="${c.id}" type="button" style="flex:1;padding:5px 9px;background:#fff;color:#0f172a;border:1px solid #cbd5e1;border-radius:6px;cursor:pointer;font:inherit;font-size:10.5px;font-weight:600">🗺️ Þj.tæki</button>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  function renderTable(arr) {
    const today = new Date();
    const curYear = today.getFullYear();
    const curMonth = today.getMonth() + 1;
    return `
      <div style="background:#fff;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden">
        <div style="overflow-x:auto">
        <table style="width:100%;border-collapse:collapse;font-size:12px">
          <thead style="background:#f8fafc;border-bottom:1px solid #e2e8f0">
            <tr style="text-align:left;color:#475569;font-weight:700;text-transform:uppercase;font-size:10px;letter-spacing:.04em">
              <th style="padding:9px 11px">Fyrirtæki</th>
              <th style="padding:9px 7px">Kt</th>
              <th style="padding:9px 7px">Heimilisfang</th>
              <th style="padding:9px 7px;text-align:center">Skoðun</th>
              <th style="padding:9px 7px;text-align:center">Tæki</th>
              <th style="padding:9px 7px;text-align:right">Áætl.</th>
              <th style="padding:9px 7px;text-align:center">${curYear}</th>
              <th style="padding:9px 11px"></th>
            </tr>
          </thead>
          <tbody>
            ${arr.map(c => {
              const ars = c._ars || {};
              const eq = ars.equipment || {};
              const totalEq = Object.values(eq).reduce((s, v) => s + (+v || 0), 0);
              const m = +ars.inspect_month || 0;
              const lastYr = +ars.last_year_inspected || 0;
              const isDone = lastYr === curYear;
              const isOverdue = !isDone && (m > 0 && m <= curMonth);
              const est = +ars.estimated_yearly || 0;
              const aminning = cleanAminning(ars.aminning);
              const dot = isDone ? '#22c55e' : (isOverdue ? '#ef4444' : '#f59e0b');
              return `
                <tr class="_ars-row" data-co-id="${c.id}" style="border-bottom:1px solid #f1f5f9;cursor:pointer;transition:background .1s" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='transparent'">
                  <td style="padding:8px 11px">
                    <div style="font-weight:600;color:#0f172a">${esc(c.nafn || '—')}</div>
                    ${aminning ? `<div style="font-size:10px;color:#b45309;margin-top:1px;line-height:1.3"><span style="font-weight:700">📌</span> ${esc(aminning.slice(0, 90))}${aminning.length>90?'…':''}</div>` : ''}
                  </td>
                  <td style="padding:8px 7px;font-family:monospace;color:#64748b;font-size:11px">${esc(fmtKt(c.kennitala))}</td>
                  <td style="padding:8px 7px;color:#475569;font-size:11.5px">${esc(c.heimilisfang || '—')}</td>
                  <td style="padding:8px 7px;text-align:center;font-weight:600;color:${m===curMonth?'#dc2626':'#475569'}">${esc(MONTHS_IS_SHORT[m-1] || '—')}</td>
                  <td style="padding:8px 7px;text-align:center;font-weight:700;color:#0f172a">${totalEq||'—'}</td>
                  <td style="padding:8px 7px;text-align:right;color:#15803d;font-weight:700;font-variant-numeric:tabular-nums">${fmtKrShort(est)}</td>
                  <td style="padding:8px 7px;text-align:center"><span style="display:inline-block;width:9px;height:9px;border-radius:99px;background:${dot}"></span></td>
                  <td style="padding:8px 11px;text-align:right;white-space:nowrap">
                    <button class="_ars-open-fyrirt" data-co-id="${c.id}" type="button" title="Opna fyrirtæki" style="padding:3px 8px;background:#fff;color:#475569;border:1px solid #cbd5e1;border-radius:5px;cursor:pointer;font:inherit;font-size:10.5px;margin-right:3px">🏢</button>
                    <button class="_ars-open-map" data-co-id="${c.id}" type="button" title="Sjá á korti" style="padding:3px 8px;background:#fff;color:#475569;border:1px solid #cbd5e1;border-radius:5px;cursor:pointer;font:inherit;font-size:10.5px">🗺️</button>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
        </div>
      </div>
    `;
  }

  // ── Detail modal ─────────────────────────────────────────────────────────
  function openDetail(coId) {
    const c = _cache.list.find(x => x.id === coId);
    if (!c) return;
    const ars = c._ars || {};
    const eq = ars.equipment || {};
    const m = +ars.inspect_month || 0;
    const history = ars.history || [];
    const aminning = cleanAminning(ars.aminning);
    const est = +ars.estimated_yearly || 0;
    const eqRows = [
      ['lettvatn', 'Léttvatn 6 ltr.'],
      ['duft2', 'Duft 2 kg.'],
      ['duft6_12', 'Duft 6-12 kg.'],
      ['co2_2', 'CO₂ 2 kg.'],
      ['co2_5', 'CO₂ 5 kg.'],
      ['brunaslongur', 'Brunaslöngur'],
      ['eldvarnarteppi', 'Eldvarnarteppi'],
      ['reykskynjarar', 'Reykskynjarar']
    ];
    const eqTotal = Object.values(eq).reduce((s, v) => s + (+v || 0), 0);

    // Backdrop
    document.querySelectorAll('._ars-modal-bg').forEach(n => n.remove());
    const bg = document.createElement('div');
    bg.className = '_ars-modal-bg';
    bg.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,0.55);z-index:9999;display:flex;align-items:flex-start;justify-content:center;padding:40px 16px;overflow-y:auto';
    bg.innerHTML = `
      <div class="_ars-modal" style="background:#fff;border-radius:14px;max-width:780px;width:100%;box-shadow:0 25px 60px rgba(0,0,0,0.4);overflow:hidden">
        <div style="padding:16px 20px;border-bottom:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:flex-start;gap:10px">
          <div>
            <div style="font-size:18px;font-weight:700;color:#0f172a">${esc(c.nafn || '—')}</div>
            <div style="font-size:11.5px;color:#64748b;margin-top:3px">${esc(fmtKt(c.kennitala) || '—')}${c.heimilisfang ? ' · 📍 ' + esc(c.heimilisfang) : ''}</div>
            ${c.simi || c.farsimi ? `<div style="font-size:11px;color:#64748b;margin-top:1px">📞 ${esc([c.simi, c.farsimi].filter(Boolean).join(' / '))}</div>` : ''}
            ${c.netfang ? `<div style="font-size:11px;color:#64748b;margin-top:1px">✉️ ${esc(c.netfang)}</div>` : ''}
          </div>
          <button class="_ars-close" type="button" style="background:transparent;border:none;font-size:24px;color:#94a3b8;cursor:pointer;line-height:1;padding:0 4px">×</button>
        </div>

        <div style="padding:18px 20px;display:flex;flex-direction:column;gap:14px">

          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px">
            <div style="background:#fef3c7;border:1px solid #fde68a;border-radius:8px;padding:8px 11px">
              <div style="font-size:10px;font-weight:700;color:#92400e;text-transform:uppercase">Skoðunarmánuður</div>
              <div style="font-size:16px;font-weight:800;color:#b45309;margin-top:2px">${m>=1&&m<=12 ? esc(MONTHS_IS[m-1]) : '—'}</div>
            </div>
            <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:8px 11px">
              <div style="font-size:10px;font-weight:700;color:#166534;text-transform:uppercase">Síðasta skoðun</div>
              <div style="font-size:16px;font-weight:800;color:#15803d;margin-top:2px">${ars.last_year_inspected || '—'}</div>
              ${ars.last_skodun ? `<div style="font-size:10.5px;color:#16a34a">${esc(ars.last_skodun)}</div>` : ''}
            </div>
            <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:8px 11px">
              <div style="font-size:10px;font-weight:700;color:#475569;text-transform:uppercase">Áætluð árstekja</div>
              <div style="font-size:16px;font-weight:800;color:#0f172a;margin-top:2px;font-variant-numeric:tabular-nums">${fmtKr(est)}</div>
              ${ars.aminning_parsed && ars.aminning_parsed.discount_pct ? `<div style="font-size:10.5px;color:#dc2626">−${ars.aminning_parsed.discount_pct}% afsl.</div>` : ''}
            </div>
          </div>

          ${aminning ? `
          <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:9px;padding:10px 13px">
            <div style="font-size:10px;font-weight:700;color:#92400e;text-transform:uppercase;margin-bottom:4px">📌 Áminning (úr skuldunautaskrá)</div>
            <div style="font-size:12px;color:#78350f;line-height:1.5;white-space:pre-wrap">${esc(aminning)}</div>
            ${ars.aminning_parsed && (ars.aminning_parsed.yfirferd_price || ars.aminning_parsed.hledsla_price) ? `
              <div style="margin-top:6px;display:flex;gap:10px;flex-wrap:wrap;font-size:10.5px;color:#92400e">
                ${ars.aminning_parsed.yfirferd_price ? `<span style="background:#fff;border:1px solid #fde68a;border-radius:5px;padding:2px 7px"><strong>Yfirferð:</strong> ${fmtKr(ars.aminning_parsed.yfirferd_price)}</span>` : ''}
                ${ars.aminning_parsed.hledsla_price ? `<span style="background:#fff;border:1px solid #fde68a;border-radius:5px;padding:2px 7px"><strong>Hleðsla:</strong> ${fmtKr(ars.aminning_parsed.hledsla_price)}</span>` : ''}
              </div>` : ''}
          </div>` : ''}

          <div>
            <div style="font-size:11px;font-weight:700;color:#475569;text-transform:uppercase;margin-bottom:6px">🧰 Þjónustutæki  <span style="color:#94a3b8;font-weight:500">(${eqTotal} alls)</span></div>
            <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px">
              ${eqRows.map(([k, label]) => {
                const v = +eq[k] || 0;
                return `<div style="background:${v?'#f8fafc':'#fff'};border:1px solid ${v?'#cbd5e1':'#f1f5f9'};border-radius:7px;padding:7px 9px;text-align:center">
                  <div style="font-size:9.5px;color:#64748b;font-weight:600;line-height:1.2">${esc(label)}</div>
                  <div style="font-size:18px;font-weight:800;color:${v?'#0f172a':'#cbd5e1'};margin-top:2px">${v||'·'}</div>
                </div>`;
              }).join('')}
            </div>
          </div>

          ${(() => {
            // Pull Drive-link attachments from AppSettings.company_attachments
            const attsAll = (window.AppSettings && window.AppSettings.path && window.AppSettings.path('company_attachments')) || {};
            const list = attsAll[String(coId)] || [];
            if (!list.length) return '';
            // Sort newest year first
            const sorted = list.slice().sort((a, b) => (+b.year || 0) - (+a.year || 0));
            return `
              <div>
                <div style="font-size:11px;font-weight:700;color:#475569;text-transform:uppercase;margin-bottom:6px">📎 Skjöl <span style="color:#94a3b8;font-weight:500">(${list.length})</span></div>
                <div style="display:flex;flex-direction:column;gap:4px">
                  ${sorted.map(a => {
                    const url = a.drive_url || (a.drive_id ? 'https://drive.google.com/file/d/' + a.drive_id + '/view' : '#');
                    const icon = a.kind === 'samningur' ? '📜' : '🧾';
                    const yearTag = a.year ? `<span style="background:#f0fdf4;color:#15803d;font-size:10px;font-weight:700;padding:1px 6px;border-radius:99px;border:1px solid #bbf7d0;margin-left:6px">${a.year}</span>` : '';
                    const autoTag = a.auto_matched ? '<span style="color:#94a3b8;font-size:10px" title="Sjálfkrafa pörun">✦</span>' : '';
                    return `<a href="${esc(url)}" target="_blank" rel="noopener" style="display:flex;align-items:center;gap:8px;background:#fafafa;border:1px solid #f1f5f9;border-radius:6px;padding:6px 10px;text-decoration:none;color:#0f172a;font-size:11.5px;transition:background .1s" onmouseover="this.style.background='#fff';this.style.borderColor='#cbd5e1'" onmouseout="this.style.background='#fafafa';this.style.borderColor='#f1f5f9'">
                      <span style="font-size:14px">${icon}</span>
                      <span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(a.name || 'Skjal')}</span>
                      ${yearTag}
                      ${autoTag}
                      <span style="color:#94a3b8;font-size:10px">↗</span>
                    </a>`;
                  }).join('')}
                </div>
              </div>
            `;
          })()}

          ${history.length ? `
          <div>
            <div style="font-size:11px;font-weight:700;color:#475569;text-transform:uppercase;margin-bottom:6px">📜 Saga</div>
            <div style="display:flex;flex-direction:column;gap:4px">
              ${history.slice().sort((a,b)=>String(b.year).localeCompare(String(a.year))).map(h => `
                <div style="background:#fafafa;border:1px solid #f1f5f9;border-radius:6px;padding:6px 10px;display:flex;justify-content:space-between;gap:10px;align-items:center;font-size:11.5px">
                  <div><strong style="color:#0f172a">${esc(String(h.year))}</strong> <span style="color:#64748b">${esc(h.skodun || '')}</span></div>
                  <div style="color:#475569;font-size:11px">${esc((h.stada||'').replace(/_/g, ' ')) || ''}</div>
                </div>
              `).join('')}
            </div>
          </div>` : ''}

          <div style="display:flex;gap:7px;flex-wrap:wrap;padding-top:8px;border-top:1px solid #f1f5f9">
            <button class="_ars-go-fyrirt" type="button" style="flex:1;min-width:140px;padding:8px 12px;background:#0f172a;color:#fff;border:none;border-radius:8px;cursor:pointer;font:inherit;font-size:12px;font-weight:600">🏢 Opna fyrirtæki</button>
            <button class="_ars-go-map" type="button" style="flex:1;min-width:140px;padding:8px 12px;background:#fff;color:#0f172a;border:1px solid #cbd5e1;border-radius:8px;cursor:pointer;font:inherit;font-size:12px;font-weight:600">🗺️ Sjá á Þjónustutæki</button>
            <button class="_ars-go-brunakerfi" type="button" style="flex:1;min-width:140px;padding:8px 12px;background:#fff;color:#dc2626;border:1px solid #fca5a5;border-radius:8px;cursor:pointer;font:inherit;font-size:12px;font-weight:600">🚨 Brunakerfi</button>
          </div>
        </div>
      </div>
    `;
    bg.addEventListener('click', e => {
      if (e.target === bg) bg.remove();
    });
    bg.querySelector('._ars-close').addEventListener('click', () => bg.remove());
    bg.querySelector('._ars-go-fyrirt').addEventListener('click', () => {
      bg.remove();
      if (window._openCompanySafe) window._openCompanySafe(coId);
      else if (window.App && App.switchView) App.switchView('companies');
    });
    bg.querySelector('._ars-go-map').addEventListener('click', () => {
      bg.remove();
      openOnMap(coId);
    });
    bg.querySelector('._ars-go-brunakerfi').addEventListener('click', () => {
      bg.remove();
      if (window.App && App.switchView) App.switchView('brunakerfi');
    });
    document.body.appendChild(bg);
  }

  // ── Map deep-link ────────────────────────────────────────────────────────
  // Opens Þjónustutæki and tries to focus the map on this company.
  function openOnMap(coId) {
    const co = _cache.byId[coId];
    if (!co) return;
    if (!window.App || !window.App.switchView) return;
    // Stash the deep-link so the Þjónustutæki page can pick it up after
    // its data has loaded.
    try {
      sessionStorage.setItem('_ars_focus_company', JSON.stringify({
        id: coId, nafn: co.nafn || '', kennitala: co.kennitala || ''
      }));
    } catch (_) {}
    window.App.switchView('field');
    // Try to focus once the view is rendered. Re-poll a few times because
    // Field is async.
    let tries = 0;
    function tryFocus() {
      tries++;
      const focusFn = window.Field && (window.Field.focusCompany || window.Field.focusOnCompany || window.Field.openCompany);
      if (focusFn) {
        try { focusFn.call(window.Field, coId, co.nafn); return; } catch (_) {}
      }
      // Fallback: try to set the search box value and trigger filter
      const search = document.querySelector('#view-field input[type="search"], #view-field input[type="text"]');
      if (search) {
        search.value = co.nafn || '';
        search.dispatchEvent(new Event('input', { bubbles: true }));
      }
      if (tries < 8) setTimeout(tryFocus, 250);
    }
    setTimeout(tryFocus, 350);
  }

  // ── Boot ─────────────────────────────────────────────────────────────────
  function boot() {
    injectSidebar();
    ensureView();
    patchSwitchView();
    // Re-run injection if sidebar gets rebuilt later (patch 68 reorders)
    setTimeout(injectSidebar, 1200);
    setTimeout(injectSidebar, 2500);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  // Expose for debugging
  window.Arsskodun = { show, openDetail, openOnMap, _cache, version: 'v1' };
  console.log('[arsskodun] v1 ready');
})();
/* === END ÁRSSKOÐUN === */
