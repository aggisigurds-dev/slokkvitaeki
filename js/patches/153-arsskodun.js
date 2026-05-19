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
  //
  // Some rows got polluted with a leading "FALSE" / "TRUE" / "0 kr" /
  // "FALSE\n" prefix during the earlier Viðskiptavinir-sheet enrichment
  // (the parser read one column too early — c[38]=Falinn? instead of
  // c[39]=Áminning). Cheaper to strip at read time than to re-import.
  function cleanAminning(s) {
    let t = String(s == null ? '' : s).trim();
    if (!t) return '';
    // Strip junk prefix (single token + separator)
    t = t.replace(/^(false|true|0\s*kr|null|—|-)\s*[\n,;.\s]*/i, '').trim();
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
    const arsMap = (window.AppSettings && window.AppSettings.path && window.AppSettings.path(STORAGE_KEY)) || {};
    const bruMap = (window.AppSettings && window.AppSettings.path && window.AppSettings.path('brunakerfi_customers')) || {};

    // Load ALL fyrirtaeki rows. PostgREST paginates at 1000 rows by default.
    const { data: companies, error } = await SB.from('fyrirtaeki')
      .select('id,nafn,kennitala,simi,farsimi,heimilisfang,netfang,tengiliður,athugasemdir,vefsida')
      .order('nafn');
    if (error) { console.error('[arsskodun] loadAll', error); return; }
    const allCompanies = companies || [];
    _cache.allCompanies = allCompanies;
    _cache.byId = Object.fromEntries(allCompanies.map(c => [c.id, c]));

    // 2026-05-19: Only include companies that are ACTUALLY in service
    // (subscribed to ársskoðun with non-zero equipment, OR subscribed to
    // brunakerfi). Aggi reported Akstursþjónustan ehf. showing up here
    // even though it has empty equipment {} in arsskodun — i.e. parked
    // there during migration but never actually subscribed. Companies
    // without any service belong in Allir Viðskiptavinir only.
    function inService(c) {
      const key = String(c.id);
      const a = arsMap[key];
      const hasArs = !!(a && a.equipment && Object.values(a.equipment).some(v => +v > 0));
      const hasBru = !!bruMap[key];
      return hasArs || hasBru;
    }

    _cache.list = allCompanies
      .filter(inService)
      .map(c => ({
        ...c,
        _ars: arsMap[String(c.id)] || {},
        _bru: bruMap[String(c.id)] || null
      }))
      .sort((a, b) => String(a.nafn || '').localeCompare(String(b.nafn || ''), 'is'));
  }

  // ── Sidebar entry ────────────────────────────────────────────────────────
  // Replace the OLD Fyrirtæki nav (data-view="companies") with our Ársskoðun
  // entry — same position, new label. The old view is still available via
  // direct URL (?view=companies) for the rare case a feature isn't here yet.
  function injectSidebar() {
    const nav = document.querySelector('nav.view-nav, .view-nav');
    if (!nav) { setTimeout(injectSidebar, 500); return; }
    if (nav.querySelector('[data-view="' + NAV_KEY + '"]')) {
      // Already injected — but make sure the old Fyrirtæki button is hidden.
      hideOldFyrirtaekiBtn(nav);
      return;
    }
    const allBtns = Array.from(nav.querySelectorAll('.vnav-btn'));
    // Find old companies nav (legacy "Fyrirtæki"). We'll insert RIGHT BEFORE
    // it and then hide it, so our new entry lands in the same sidebar slot.
    const oldFyrirtBtn = allBtns.find(b => b.getAttribute('data-view') === 'companies')
                     || allBtns.find(b => /^\s*(🏢)?\s*Fyrirtæki\s*$/i.test(b.textContent || ''));
    const after = oldFyrirtBtn
              || allBtns.find(b => /brunakerf/i.test(b.textContent || ''))
              || allBtns.find(b => /þjónustutæki/i.test(b.textContent || ''))
              || allBtns[0];
    const tpl = after || allBtns[0];
    if (!tpl) { setTimeout(injectSidebar, 500); return; }
    const btn = document.createElement('button');
    btn.className = (tpl.className || 'vnav-btn').replace(/\bactive\b/g, '').trim();
    btn.setAttribute('data-view', NAV_KEY);
    btn.innerHTML = '<span style="margin-right:6px">🏢</span>Fyrirtæki í Þjónustu';
    btn.addEventListener('click', e => {
      e.preventDefault(); e.stopPropagation();
      if (window.App && App.switchView) App.switchView(NAV_KEY);
      else show();
    });
    if (oldFyrirtBtn && oldFyrirtBtn.parentNode) {
      // Insert BEFORE the old button so we take its slot.
      oldFyrirtBtn.parentNode.insertBefore(btn, oldFyrirtBtn);
    } else if (after && after.parentNode) {
      after.parentNode.insertBefore(btn, after.nextSibling);
    } else {
      nav.appendChild(btn);
    }
    hideOldFyrirtaekiBtn(nav);
  }
  function hideOldFyrirtaekiBtn(nav) {
    nav.querySelectorAll('.vnav-btn[data-view="companies"]').forEach(b => {
      b.style.display = 'none';
    });
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
      // Diacritic-insensitive: normalise BOTH sides via NFD + strip combining
      // marks, then also fold the Icelandic-specific letters that don't have
      // an obvious ASCII equivalent (þ → th, ð → d, æ → ae, ö → o).
      const fold = s => String(s || '').toLowerCase()
        .normalize('NFD').replace(/\p{Diacritic}/gu, '')
        .replace(/þ/g, 'th').replace(/ð/g, 'd')
        .replace(/æ/g, 'ae').replace(/ö/g, 'o');
      const qn = fold(q);
      arr = arr.filter(c => {
        const hay = (c.nafn || '') + ' ' + (c.kennitala || '') + ' ' + (c.heimilisfang || '');
        return fold(hay).includes(qn);
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
    // Preserve search-box focus across re-renders: typing in #_ars-search
    // triggers a debounced render that calls main.innerHTML=... which
    // destroys the old input element. Without this, the user loses focus
    // after every keystroke once they pause for >200ms.
    const prevActive = document.activeElement;
    const keepSearchFocus = !!(prevActive && prevActive.id === '_ars-search');
    const selStart = keepSearchFocus ? prevActive.selectionStart : null;
    const selEnd = keepSearchFocus ? prevActive.selectionEnd : null;
    if (!main) return;
    const all = _cache.list;
    const filtered = filteredSorted();
    // Stats restricted to companies that ARE in árskoðun (have equipment).
    // The full list still includes everyone — the user wanted the whole
    // fyrirtækjaregistur in one tab, but tiles only count the ones that
    // matter for yearly inspections.
    const arsAll = all.filter(c => c._ars && c._ars.equipment);

    const today = new Date();
    const curYear = today.getFullYear();
    const monthCounts = Array(13).fill(0);
    arsAll.forEach(c => { const m = +c._ars.inspect_month || 0; if (m >= 1 && m <= 12) monthCounts[m]++; });
    const doneThisYear = arsAll.filter(c => +c._ars.last_year_inspected === curYear).length;
    const totalEstimate = arsAll.reduce((s, c) => s + (+c._ars.estimated_yearly || 0), 0);
    const estDoneThisYear = arsAll
      .filter(c => +c._ars.last_year_inspected === curYear)
      .reduce((s, c) => s + (+c._ars.estimated_yearly || 0), 0);

    // 2026-05-17 (Luna): per-month / per-filter revenue summary shown below
    // the list. Lets the user see "if I do all of May's inspections, that's X kr".
    const filteredAars = filtered.filter(c => c._ars && c._ars.equipment);
    const filteredTotal = filteredAars.reduce((s, c) => s + (+c._ars.estimated_yearly || 0), 0);
    const filteredDone = filteredAars
      .filter(c => +c._ars.last_year_inspected === curYear)
      .reduce((s, c) => s + (+c._ars.estimated_yearly || 0), 0);
    const filteredRemain = Math.max(0, filteredTotal - filteredDone);
    const filteredDonePct = filteredTotal > 0 ? Math.round(filteredDone / filteredTotal * 100) : 0;
    const filterLabel = state.month >= 1 && state.month <= 12
      ? `${MONTHS_IS[state.month - 1]} ${curYear}`
      : (state.status === 'done'    ? `Búið ${curYear} (allir mánuðir)`
       : state.status === 'pending' ? `Eftir ${curYear} (allir mánuðir)`
       : state.status === 'never'   ? `Aldrei skoðað`
       : `Allir mánuðir ${curYear}`);

    main.innerHTML = `
      <div style="max-width:1400px;margin:0 auto;padding:18px 22px 60px">
        <div style="display:flex;justify-content:space-between;align-items:flex-end;flex-wrap:wrap;gap:14px;margin-bottom:14px">
          <div>
            <h1 style="margin:0;font-size:22px;color:#0f172a;display:flex;align-items:center;gap:10px">🏢 Fyrirtæki í Þjónustu</h1>
            <div style="font-size:12px;color:#64748b;margin-top:2px">${all.length} fyrirtæki · ${arsAll.length} í árlegri slökkvitækjaskoðun</div>
          </div>
          <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
            <button id="_ars-new" type="button" style="padding:7px 14px;background:#dc2626;color:#fff;border:none;border-radius:8px;cursor:pointer;font:inherit;font-size:12px;font-weight:700">+ Nýtt fyrirtæki</button>
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
            <div style="font-size:10.5px;color:#64748b">${arsAll.length} í ársskoðun</div>
          </div>
          <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:11px 13px">
            <div style="font-size:10px;font-weight:700;color:#166534;text-transform:uppercase;letter-spacing:.05em">Búið ${curYear}</div>
            <div style="font-size:22px;font-weight:800;color:#15803d;line-height:1.1;margin-top:2px">${doneThisYear}</div>
            <div style="font-size:10.5px;color:#16a34a">${Math.round(doneThisYear/Math.max(arsAll.length,1)*100)}% af ársskoðun</div>
          </div>
          <div style="background:#fef3c7;border:1px solid #fde68a;border-radius:10px;padding:11px 13px">
            <div style="font-size:10px;font-weight:700;color:#92400e;text-transform:uppercase;letter-spacing:.05em">Eftir ${curYear}</div>
            <div style="font-size:22px;font-weight:800;color:#b45309;line-height:1.1;margin-top:2px">${arsAll.length - doneThisYear}</div>
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

        ${filteredAars.length > 0 ? `
        <div style="margin-top:14px;padding:13px 16px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;display:flex;gap:24px;justify-content:space-between;flex-wrap:wrap;align-items:center">
          <div>
            <div style="font-size:10.5px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.05em">Samantekt — ${esc(filterLabel)}</div>
            <div style="font-size:13px;color:#475569;margin-top:3px">${filteredAars.length} fyrirtæki í ársskoðun</div>
          </div>
          <div style="display:flex;gap:22px;flex-wrap:wrap">
            <div style="text-align:right">
              <div style="font-size:10.5px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.05em">Áætlaðar tekjur</div>
              <div style="font-size:18px;font-weight:800;color:#0f172a;font-variant-numeric:tabular-nums">${fmtKr(filteredTotal)}</div>
            </div>
            ${filteredDone > 0 ? `
            <div style="text-align:right">
              <div style="font-size:10.5px;font-weight:700;color:#166534;text-transform:uppercase;letter-spacing:.05em">Þegar innheimt</div>
              <div style="font-size:18px;font-weight:800;color:#15803d;font-variant-numeric:tabular-nums">${fmtKr(filteredDone)}</div>
              <div style="font-size:10.5px;color:#16a34a">${filteredDonePct}%</div>
            </div>` : ''}
            ${filteredRemain > 0 ? `
            <div style="text-align:right">
              <div style="font-size:10.5px;font-weight:700;color:#92400e;text-transform:uppercase;letter-spacing:.05em">Eftir</div>
              <div style="font-size:18px;font-weight:800;color:#b45309;font-variant-numeric:tabular-nums">${fmtKr(filteredRemain)}</div>
            </div>` : ''}
          </div>
        </div>
        ` : ''}

        <div style="margin-top:18px;font-size:11px;color:#94a3b8;text-align:center">
          Sýni <strong style="color:#475569">${filtered.length}</strong> af ${all.length} viðskiptavinum
        </div>
      </div>
    `;

    // Wire interactions
    main.querySelectorAll('._ars-vm').forEach(b => b.addEventListener('click', () => {
      state.view = b.dataset.viewMode; saveState(); render();
    }));
    main.querySelector('#_ars-new')?.addEventListener('click', openNewCompanyDialog);
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

    if (keepSearchFocus) {
      const fresh = main.querySelector('#_ars-search');
      if (fresh) {
        fresh.focus();
        try {
          fresh.setSelectionRange(selStart ?? fresh.value.length, selEnd ?? fresh.value.length);
        } catch (_) { /* type=search may not allow setSelectionRange in some browsers */ }
      }
    }
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
                <button class="_ars-open-map" data-co-id="${c.id}" type="button" style="flex:1;padding:5px 9px;background:#fff;color:#0f172a;border:1px solid #cbd5e1;border-radius:6px;cursor:pointer;font:inherit;font-size:10.5px;font-weight:600">🗺️ Á korti</button>
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
          <div style="flex:1;min-width:0">
            <div class="_ars-info-view">
              <div style="font-size:18px;font-weight:700;color:#0f172a">${esc(c.nafn || '—')}</div>
              <div style="font-size:11.5px;color:#64748b;margin-top:3px">${esc(fmtKt(c.kennitala) || '—')}${c.heimilisfang ? ' · 📍 ' + esc(c.heimilisfang) : ''}</div>
              ${c.simi || c.farsimi ? `<div style="font-size:11px;color:#64748b;margin-top:1px">📞 ${esc([c.simi, c.farsimi].filter(Boolean).join(' / '))}</div>` : ''}
              ${c.netfang ? `<div style="font-size:11px;color:#64748b;margin-top:1px">✉️ ${esc(c.netfang)}</div>` : ''}
              ${c['tengiliður'] ? `<div style="font-size:11px;color:#64748b;margin-top:1px">👤 ${esc(c['tengiliður'])}</div>` : ''}
            </div>
            <div class="_ars-info-edit" style="display:none">
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:7px">
                <label style="display:flex;flex-direction:column;gap:2px;font-size:10px;color:#64748b;font-weight:700;text-transform:uppercase">Nafn<input data-field="nafn" value="${esc(c.nafn || '')}" style="padding:6px 9px;border:1px solid #cbd5e1;border-radius:6px;font:inherit;font-size:13px;color:#0f172a;background:#fff;outline:none"/></label>
                <label style="display:flex;flex-direction:column;gap:2px;font-size:10px;color:#64748b;font-weight:700;text-transform:uppercase">Kennitala<input data-field="kennitala" value="${esc(c.kennitala || '')}" style="padding:6px 9px;border:1px solid #cbd5e1;border-radius:6px;font:inherit;font-size:13px;color:#0f172a;background:#fff;outline:none;font-family:monospace"/></label>
                <label style="display:flex;flex-direction:column;gap:2px;font-size:10px;color:#64748b;font-weight:700;text-transform:uppercase;grid-column:1/-1">Heimilisfang<input data-field="heimilisfang" value="${esc(c.heimilisfang || '')}" style="padding:6px 9px;border:1px solid #cbd5e1;border-radius:6px;font:inherit;font-size:13px;color:#0f172a;background:#fff;outline:none"/></label>
                <label style="display:flex;flex-direction:column;gap:2px;font-size:10px;color:#64748b;font-weight:700;text-transform:uppercase">Sími<input data-field="simi" value="${esc(c.simi || '')}" style="padding:6px 9px;border:1px solid #cbd5e1;border-radius:6px;font:inherit;font-size:13px;color:#0f172a;background:#fff;outline:none"/></label>
                <label style="display:flex;flex-direction:column;gap:2px;font-size:10px;color:#64748b;font-weight:700;text-transform:uppercase">Farsími<input data-field="farsimi" value="${esc(c.farsimi || '')}" style="padding:6px 9px;border:1px solid #cbd5e1;border-radius:6px;font:inherit;font-size:13px;color:#0f172a;background:#fff;outline:none"/></label>
                <label style="display:flex;flex-direction:column;gap:2px;font-size:10px;color:#64748b;font-weight:700;text-transform:uppercase">Netfang<input data-field="netfang" type="email" value="${esc(c.netfang || '')}" style="padding:6px 9px;border:1px solid #cbd5e1;border-radius:6px;font:inherit;font-size:13px;color:#0f172a;background:#fff;outline:none"/></label>
                <label style="display:flex;flex-direction:column;gap:2px;font-size:10px;color:#64748b;font-weight:700;text-transform:uppercase">Tengiliður<input data-field="tengiliður" value="${esc(c['tengiliður'] || '')}" style="padding:6px 9px;border:1px solid #cbd5e1;border-radius:6px;font:inherit;font-size:13px;color:#0f172a;background:#fff;outline:none"/></label>
              </div>
              <div style="display:flex;gap:6px;margin-top:8px">
                <button class="_ars-info-save" type="button" style="padding:6px 14px;background:#15803d;color:#fff;border:none;border-radius:6px;cursor:pointer;font:inherit;font-size:12px;font-weight:600">💾 Vista</button>
                <button class="_ars-info-cancel" type="button" style="padding:6px 14px;background:#fff;color:#475569;border:1px solid #cbd5e1;border-radius:6px;cursor:pointer;font:inherit;font-size:12px">Hætta við</button>
              </div>
            </div>
          </div>
          <div style="display:flex;gap:4px;flex-shrink:0">
            <button class="_ars-info-toggle" type="button" title="Breyta upplýsingum" style="background:#f1f5f9;border:1px solid #e2e8f0;color:#475569;border-radius:5px;width:28px;height:28px;cursor:pointer;font-size:13px;padding:0">✏️</button>
            <button class="_ars-close" type="button" style="background:transparent;border:none;font-size:24px;color:#94a3b8;cursor:pointer;line-height:1;padding:0 4px">×</button>
          </div>
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
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
              <div style="font-size:11px;font-weight:700;color:#475569;text-transform:uppercase">🧰 Þjónustutæki  <span class="_ars-eq-total" style="color:#94a3b8;font-weight:500">(${eqTotal} alls)</span></div>
              <button class="_ars-eq-toggle" type="button" title="Breyta tölum" style="background:#f1f5f9;border:1px solid #e2e8f0;color:#475569;border-radius:5px;padding:3px 8px;cursor:pointer;font:inherit;font-size:11px">✏️ Breyta</button>
            </div>
            <div class="_ars-eq-grid" style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px">
              ${eqRows.map(([k, label]) => {
                const v = +eq[k] || 0;
                return `<div data-eq-cell="${k}" style="background:${v?'#f8fafc':'#fff'};border:1px solid ${v?'#cbd5e1':'#f1f5f9'};border-radius:7px;padding:7px 9px;text-align:center;position:relative">
                  <div style="font-size:9.5px;color:#64748b;font-weight:600;line-height:1.2">${esc(label)}</div>
                  <div class="_ars-eq-val" style="font-size:18px;font-weight:800;color:${v?'#0f172a':'#cbd5e1'};margin-top:2px">${v||'·'}</div>
                  <input class="_ars-eq-input" data-eq="${k}" type="number" min="0" step="1" value="${v}" style="display:none;width:100%;padding:4px 6px;border:1px solid #cbd5e1;border-radius:5px;font:inherit;font-size:14px;font-weight:700;color:#0f172a;background:#fff;outline:none;text-align:center;margin-top:2px;box-sizing:border-box;-moz-appearance:textfield"/>
                </div>`;
              }).join('')}
            </div>
            <div class="_ars-eq-actions" style="display:none;gap:6px;margin-top:8px">
              <button class="_ars-eq-save" type="button" style="padding:6px 14px;background:#15803d;color:#fff;border:none;border-radius:6px;cursor:pointer;font:inherit;font-size:12px;font-weight:600">💾 Vista breytingar</button>
              <button class="_ars-eq-cancel" type="button" style="padding:6px 14px;background:#fff;color:#475569;border:1px solid #cbd5e1;border-radius:6px;cursor:pointer;font:inherit;font-size:12px">Hætta við</button>
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

          ${(() => {
            if (!history.length) return '';
            // Dedupe: úttektir sometimes records the same kt twice for the
            // same inspection month (e.g. the customer had two work orders
            // that month). Collapse by year+skodun, keeping the entry with
            // a status if both exist.
            const seen = {};
            for (const h of history) {
              const key = String(h.year) + '|' + String(h.skodun || '');
              if (!seen[key] || (!seen[key].stada && h.stada)) seen[key] = h;
            }
            const rows = Object.values(seen).sort((a, b) => String(b.year).localeCompare(String(a.year)));
            return `
            <div>
              <div style="font-size:11px;font-weight:700;color:#475569;text-transform:uppercase;margin-bottom:6px">📜 Saga <span style="color:#94a3b8;font-weight:500">(${rows.length})</span></div>
              <div style="display:flex;flex-direction:column;gap:4px">
                ${rows.map(h => `
                  <div style="background:#fafafa;border:1px solid #f1f5f9;border-radius:6px;padding:6px 10px;display:flex;justify-content:space-between;gap:10px;align-items:center;font-size:11.5px">
                    <div><strong style="color:#0f172a">${esc(String(h.year))}</strong> <span style="color:#64748b">${esc(h.skodun || '')}</span></div>
                    <div style="color:#475569;font-size:11px">${esc((h.stada||'').replace(/_/g, ' ')) || ''}</div>
                  </div>
                `).join('')}
              </div>
            </div>`;
          })()}

          <div style="display:flex;gap:7px;flex-wrap:wrap;padding-top:8px;border-top:1px solid #f1f5f9">
            <button class="_ars-go-fyrirt" type="button" style="flex:1;min-width:140px;padding:8px 12px;background:#0f172a;color:#fff;border:none;border-radius:8px;cursor:pointer;font:inherit;font-size:12px;font-weight:600">🏢 Opna fyrirtæki</button>
            <button class="_ars-go-map" data-co-id="${c.id}" type="button" style="flex:1;min-width:140px;padding:8px 12px;background:#fff;color:#0f172a;border:1px solid #cbd5e1;border-radius:8px;cursor:pointer;font:inherit;font-size:12px;font-weight:600">🗺️ Sjá á korti</button>
            <button class="_ars-go-brunakerfi" type="button" style="flex:1;min-width:140px;padding:8px 12px;background:#fff;color:#dc2626;border:1px solid #fca5a5;border-radius:8px;cursor:pointer;font:inherit;font-size:12px;font-weight:600">🚨 Brunakerfi</button>
          </div>
        </div>
      </div>
    `;
    bg.addEventListener('click', e => {
      if (e.target === bg) bg.remove();
    });
    bg.querySelector('._ars-close').addEventListener('click', () => bg.remove());

    // ── Contact info editing ────────────────────────────────────────────
    const infoView = bg.querySelector('._ars-info-view');
    const infoEdit = bg.querySelector('._ars-info-edit');
    const infoToggle = bg.querySelector('._ars-info-toggle');
    function setInfoMode(editing) {
      infoView.style.display = editing ? 'none' : '';
      infoEdit.style.display = editing ? '' : 'none';
      infoToggle.style.display = editing ? 'none' : '';
    }
    infoToggle.addEventListener('click', () => setInfoMode(true));
    bg.querySelector('._ars-info-cancel').addEventListener('click', () => setInfoMode(false));
    bg.querySelector('._ars-info-save').addEventListener('click', async () => {
      const patch = {};
      infoEdit.querySelectorAll('input[data-field]').forEach(i => {
        const f = i.dataset.field;
        const v = String(i.value || '').trim();
        // Only include fields that actually changed (null-vs-empty equivalence)
        if (v !== String(c[f] || '').trim()) patch[f] = v || null;
      });
      if (!Object.keys(patch).length) { setInfoMode(false); return; }
      const SB = getSB();
      if (!SB) { alert('Engin tenging við gagnagrunn'); return; }
      const { error } = await SB.from('fyrirtaeki').update(patch).eq('id', coId);
      if (error) { alert('Vista mistókst: ' + error.message); return; }
      // Update local cache + close modal & re-render
      Object.assign(c, patch);
      Object.assign(_cache.byId[coId] || {}, patch);
      const inList = _cache.list.find(x => x.id === coId);
      if (inList) Object.assign(inList, patch);
      bg.remove();
      render();
    });

    // ── Equipment editing ──────────────────────────────────────────────
    const eqGrid = bg.querySelector('._ars-eq-grid');
    const eqToggle = bg.querySelector('._ars-eq-toggle');
    const eqActions = bg.querySelector('._ars-eq-actions');
    function setEqMode(editing) {
      eqGrid.querySelectorAll('._ars-eq-val').forEach(el => el.style.display = editing ? 'none' : '');
      eqGrid.querySelectorAll('._ars-eq-input').forEach(el => el.style.display = editing ? '' : 'none');
      eqActions.style.display = editing ? 'flex' : 'none';
      eqToggle.style.display = editing ? 'none' : '';
    }
    eqToggle.addEventListener('click', () => setEqMode(true));
    bg.querySelector('._ars-eq-cancel').addEventListener('click', () => setEqMode(false));
    bg.querySelector('._ars-eq-save').addEventListener('click', async () => {
      const newEq = {};
      eqGrid.querySelectorAll('._ars-eq-input').forEach(i => {
        newEq[i.dataset.eq] = Math.max(0, parseInt(i.value, 10) || 0);
      });
      // Save to AppSettings.arsskodun_customers[coId].equipment
      if (!window.AppSettings || !window.AppSettings.save) {
        alert('Engar stillingar tiltækar'); return;
      }
      const allMap = (window.AppSettings.path && window.AppSettings.path(STORAGE_KEY)) || {};
      const entry = Object.assign({}, allMap[String(coId)] || {});
      entry.co_id = coId;
      entry.equipment = newEq;
      // Re-compute estimated_yearly using canonical Yfirferð pricelist
      // (patch 66 — incVat prices that match the per-product rows in the
      // vorur table). 2026-05-19: bumped from rough estimates to actual
      // pricelist values so revenue numbers match what the customer pays.
      const parsed = entry.aminning_parsed || null;
      const PRICES = {
        lettvatn:       3906,  // Yfirferð Léttvatn
        duft2:          4200,  // Yfirferð Duft (sama verð fyrir 2kg og 6kg)
        duft6_12:       4200,  // Yfirferð Duft
        co2_2:          4055,  // Yfirferð CO2 2 kg
        co2_5:          4055,  // Yfirferð CO2 5 kg
        brunaslongur:   5389,  // Yfirferð Brunaslanga
        eldvarnarteppi: 0,     // ekki á samningi/pricelist ennþá
        reykskynjarar:  2909   // Yfirferð Reykskynjari
      };
      const AKSTUR = 4407;     // Akstur (3554 ex × 1.24 = 4407 incVat)
      let total = 0;
      for (const k in PRICES) {
        const qty = +newEq[k] || 0;
        if (!qty) continue;
        let unit = PRICES[k];
        if (parsed && parsed.yfirferd_price > 0 && /^(lettvatn|duft|co2)/.test(k)) unit = parsed.yfirferd_price;
        total += qty * unit;
      }
      if (total > 0) total += AKSTUR;
      if (parsed && parsed.discount_pct > 0) total = total * (1 - parsed.discount_pct / 100);
      entry.estimated_yearly = Math.round(total / 100) * 100;
      const map = Object.assign({}, allMap, { [String(coId)]: entry });
      const ok = await window.AppSettings.save({ [STORAGE_KEY]: map });
      if (!ok) { alert('Vista mistókst'); return; }
      // Update local cache + redraw page so the card reflects new counts
      if (c._ars) { c._ars.equipment = newEq; c._ars.estimated_yearly = entry.estimated_yearly; }
      bg.remove();
      render();
    });
    bg.querySelector('._ars-go-fyrirt').addEventListener('click', () => {
      bg.remove();
      if (window._openCompanySafe) window._openCompanySafe(coId);
      else if (window.App && App.switchView) App.switchView('companies');
    });
    bg.querySelector('._ars-go-map').addEventListener('click', () => {
      // Switch view FIRST, then remove modal — bg.remove() can trigger
      // MutationObservers that re-render Ársskoðun and steal focus back.
      openOnMap(coId);
      bg.remove();
    });
    bg.querySelector('._ars-go-brunakerfi').addEventListener('click', () => {
      bg.remove();
      if (window.App && App.switchView) App.switchView('brunakerfi');
    });
    document.body.appendChild(bg);
  }

  // ── New-company dialog ───────────────────────────────────────────────────
  // Lightweight inline form: nafn + kennitala + heimilisfang + sími + netfang.
  // Saves directly into fyrirtaeki (no Ársskoðun data — they can edit it
  // afterwards from the detail modal). Reloads the list on success.
  function openNewCompanyDialog() {
    document.querySelectorAll('._ars-modal-bg').forEach(n => n.remove());
    const bg = document.createElement('div');
    bg.className = '_ars-modal-bg';
    bg.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,0.55);z-index:9999;display:flex;align-items:flex-start;justify-content:center;padding:60px 16px;overflow-y:auto';
    bg.innerHTML = `
      <div style="background:#fff;border-radius:14px;max-width:520px;width:100%;box-shadow:0 25px 60px rgba(0,0,0,0.4);overflow:hidden">
        <div style="padding:14px 18px;border-bottom:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center">
          <div style="font-size:16px;font-weight:700;color:#0f172a">+ Nýtt fyrirtæki</div>
          <button class="_ars-new-close" type="button" style="background:transparent;border:none;font-size:24px;color:#94a3b8;cursor:pointer;line-height:1;padding:0 4px">×</button>
        </div>
        <div style="padding:18px;display:flex;flex-direction:column;gap:10px">
          <label style="display:flex;flex-direction:column;gap:3px;font-size:11px;color:#475569;font-weight:700;text-transform:uppercase">Nafn *<input data-f="nafn" required style="padding:8px 11px;border:1px solid #cbd5e1;border-radius:7px;font:inherit;font-size:14px;color:#0f172a;background:#fff;outline:none"/></label>
          <label style="display:flex;flex-direction:column;gap:3px;font-size:11px;color:#475569;font-weight:700;text-transform:uppercase">Kennitala<input data-f="kennitala" placeholder="123456-7890" style="padding:8px 11px;border:1px solid #cbd5e1;border-radius:7px;font:inherit;font-size:14px;color:#0f172a;background:#fff;outline:none;font-family:monospace"/></label>
          <label style="display:flex;flex-direction:column;gap:3px;font-size:11px;color:#475569;font-weight:700;text-transform:uppercase">Heimilisfang<input data-f="heimilisfang" style="padding:8px 11px;border:1px solid #cbd5e1;border-radius:7px;font:inherit;font-size:14px;color:#0f172a;background:#fff;outline:none"/></label>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
            <label style="display:flex;flex-direction:column;gap:3px;font-size:11px;color:#475569;font-weight:700;text-transform:uppercase">Sími<input data-f="simi" style="padding:8px 11px;border:1px solid #cbd5e1;border-radius:7px;font:inherit;font-size:14px;color:#0f172a;background:#fff;outline:none"/></label>
            <label style="display:flex;flex-direction:column;gap:3px;font-size:11px;color:#475569;font-weight:700;text-transform:uppercase">Netfang<input data-f="netfang" type="email" style="padding:8px 11px;border:1px solid #cbd5e1;border-radius:7px;font:inherit;font-size:14px;color:#0f172a;background:#fff;outline:none"/></label>
          </div>
          <label style="display:flex;flex-direction:column;gap:3px;font-size:11px;color:#475569;font-weight:700;text-transform:uppercase">Tengiliður<input data-f="tengiliður" style="padding:8px 11px;border:1px solid #cbd5e1;border-radius:7px;font:inherit;font-size:14px;color:#0f172a;background:#fff;outline:none"/></label>
          <div class="_ars-new-err" style="color:#dc2626;font-size:12px;display:none"></div>
          <div style="display:flex;gap:8px;margin-top:6px">
            <button class="_ars-new-save" type="button" style="flex:1;padding:9px 14px;background:#15803d;color:#fff;border:none;border-radius:8px;cursor:pointer;font:inherit;font-size:13px;font-weight:700">💾 Vista</button>
            <button class="_ars-new-cancel" type="button" style="padding:9px 14px;background:#fff;color:#475569;border:1px solid #cbd5e1;border-radius:8px;cursor:pointer;font:inherit;font-size:13px">Hætta við</button>
          </div>
        </div>
      </div>
    `;
    bg.addEventListener('click', e => { if (e.target === bg) bg.remove(); });
    bg.querySelector('._ars-new-close').addEventListener('click', () => bg.remove());
    bg.querySelector('._ars-new-cancel').addEventListener('click', () => bg.remove());
    setTimeout(() => bg.querySelector('input[data-f="nafn"]').focus(), 50);
    bg.querySelector('._ars-new-save').addEventListener('click', async () => {
      const errEl = bg.querySelector('._ars-new-err');
      errEl.style.display = 'none';
      const data = {};
      bg.querySelectorAll('input[data-f]').forEach(i => {
        const v = String(i.value || '').trim();
        if (v) data[i.dataset.f] = v;
      });
      if (!data.nafn) {
        errEl.textContent = 'Nafn er nauðsynlegt.';
        errEl.style.display = 'block';
        return;
      }
      const SB = getSB();
      if (!SB) { errEl.textContent = 'Engin tenging við gagnagrunn.'; errEl.style.display = 'block'; return; }
      const { data: rows, error } = await SB.from('fyrirtaeki').insert(data).select();
      if (error) {
        errEl.textContent = 'Vista mistókst: ' + error.message;
        errEl.style.display = 'block';
        return;
      }
      bg.remove();
      await loadAll();
      render();
      // Open the newly-created row's detail modal so user can keep editing
      if (rows && rows[0]) {
        setTimeout(() => openDetail(rows[0].id), 100);
      }
    });
    document.body.appendChild(bg);
  }

  // ── Map deep-link ────────────────────────────────────────────────────────
  // Switch to view-field (Þjónustutæki / Leaflet map) and pan-zoom to the
  // company's marker. Uses the window.MapFix.focusCompany helper exposed
  // by mapfix.js, which polls until the map + markers are ready.
  //
  // Failure modes (the helper returns { ok:false, reason:... }):
  //   • no-map      — Leaflet hasn't initialised yet (rare; view never opened)
  //   • no-marker   — Company has no cached geocoordinate; we toast the user
  //                   and link them to "Uppfæra" (the geocoding button).
  async function openOnMap(coId) {
    const co = _cache.byId[coId];
    if (!co) return;
    if (!window.App || !window.App.switchView) return;
    // 2026-05-19: Þjónustutæki (view-field) nav retired. Send users to
    // Leiðsögn instead — same Leaflet map, plus the route planner.
    window.App.switchView('leidsogn');
    // Leiðsögn doesn't expose a focus-by-id API yet; the marker for this
    // customer will be on the map. Add it to the route stack for the user.
    if (window.Leidsogn && typeof window.Leidsogn.addToRoute === 'function') {
      try { window.Leidsogn.addToRoute(coId); } catch (_) {}
    }
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
