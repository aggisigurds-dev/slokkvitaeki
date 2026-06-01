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
  const LS_SORTCOL = 'arsskodun_sortCol';
  const LS_SORTDIR = 'arsskodun_sortDir';
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

    // 2026-06-01: tæki count + estimated yearly revenue are now DERIVED LIVE
    // from the real uttaeki table (status='active'), not a hand-maintained
    // snapshot — so every company that actually has equipment shows up with a
    // correct count and revenue. Pricing comes from the vorur "yfirferð" rates
    // (single source of truth) with hardcoded fallbacks. Manual inspect_month
    // / last_year_inspected / priority etc. are preserved from arsskodun_customers.
    const unitsByClient = await loadActiveUnitsByClient(SB);
    const PRICE = await loadYfirferdPrices(SB);

    // 2026-05-19: Only include companies that are ACTUALLY in service
    // (subscribed to ársskoðun, subscribed to brunakerfi, OR — new — they have
    // real active tæki in uttaeki). Companies without any service belong in
    // Allir Viðskiptavinir only.
    function inService(c) {
      const key = String(c.id);
      const a = arsMap[key];
      // A company qualifies if it has equipment with counts > 0 (legacy
      // migration data) OR was explicitly subscribed via the button (patch 158
      // stamps `subscribed: true`) OR has real active units in uttaeki.
      const hasArs = !!(a && (
        a.subscribed === true ||
        (a.equipment && Object.values(a.equipment).some(v => +v > 0))
      ));
      const hasBru = !!bruMap[key];
      const hasUnits = (unitsByClient[foldName(c.nafn)] || []).length > 0;
      return hasArs || hasBru || hasUnits;
    }

    _cache.list = allCompanies
      .filter(inService)
      .map(c => {
        const manual = arsMap[String(c.id)] || {};
        const _ars = Object.assign({}, manual);
        const units = unitsByClient[foldName(c.nafn)] || [];
        if (units.length) {
          // Bucket the real tæki by category and price each at its yfirferð rate.
          const equip = {};
          let est = 0;
          units.forEach(u => {
            const cat = categoryOf(u.type, u.size);
            equip[cat] = (equip[cat] || 0) + 1;
            est += (PRICE[cat] != null ? PRICE[cat] : PRICE.annad);
          });
          _ars.equipment = equip;
          _ars.estimated_yearly = Math.round(est);
          _ars._unit_count = units.length;
          _ars._derived = true;
        }
        return {
          ...c,
          _ars,
          _bru: bruMap[String(c.id)] || null
        };
      })
      .sort((a, b) => String(a.nafn || '').localeCompare(String(b.nafn || ''), 'is'));
  }

  // ── Live-equipment helpers (2026-06-01) ───────────────────────────────────
  // Diacritic/case-folded key for matching fyrirtaeki.nafn ↔ uttaeki.client.
  function foldName(s) {
    return String(s || '').toLowerCase().trim()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/þ/g, 'th').replace(/ð/g, 'd').replace(/æ/g, 'ae').replace(/ö/g, 'o')
      .replace(/\s+/g, ' ');
  }
  // Same, but also folds subscript digits so "CO₂" matches "CO2".
  function foldTok(s) {
    return foldName(s).replace(/[₀-₉]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0x2080 + 48));
  }
  // Map a raw uttaeki.type to a canonical service category.
  function categoryOf(type, size) {
    const t = foldTok(type);
    const sizeNum = parseFloat(String(size || '').replace(',', '.')) || 0;
    if (/lettv|abf|frod/.test(t)) return 'lettvatn';
    if (/duft|abc|pfc/.test(t)) return sizeNum > 3 ? 'duft6_12' : 'duft2';
    if (/co2|kolsyr/.test(t)) return sizeNum > 3 ? 'co2_5' : 'co2_2';
    if (/brunaslang|brunaslong|hose/.test(t)) return 'brunaslongur';
    if (/reykskynj|smoke/.test(t)) return 'reykskynjarar';
    if (/teppi|blanket|eldvarn/.test(t)) return 'eldvarnarteppi';
    return 'annad'; // Slönguskápur, Óþekkt, unmatched
  }
  async function loadActiveUnitsByClient(SB) {
    const byClient = {};
    try {
      let from = 0; const page = 1000;
      while (true) {
        const { data, error } = await SB.from('uttaeki')
          .select('type,size,client,status')
          .eq('status', 'active')
          .range(from, from + page - 1);
        if (error || !data) break;
        data.forEach(u => {
          const k = foldName(u.client);
          if (!k) return;
          (byClient[k] = byClient[k] || []).push(u);
        });
        if (data.length < page) break;
        from += page;
      }
    } catch (e) { console.warn('[arsskodun] units load', e); }
    return byClient;
  }
  // Per-category yearly "yfirferð" price from the vorur list, with fallbacks so
  // it never zeroes out. teppi/slonguskapur/annad use the base Skoðunargjald.
  async function loadYfirferdPrices(SB) {
    const FB = { lettvatn: 3150, duft: 3387, co2: 3270, brunaslanga: 4346, reykskynjari: 2346, skod: 1532 };
    let vorur = [];
    try {
      const { data } = await SB.from('vorur').select('nafn,verd_an_vsk,virkt').eq('virkt', true);
      vorur = data || [];
    } catch (_) {}
    const find = re => {
      const v = vorur.find(p => re.test(foldTok(p.nafn)));
      return v ? Math.round(+v.verd_an_vsk) : null;
    };
    const skod = find(/skodunargjald/) || FB.skod;
    return {
      lettvatn:       find(/yfirfer.*lettv|lettv.*yfirfer/) || FB.lettvatn,
      duft2:          find(/yfirfer.*duft|duft.*yfirfer/) || FB.duft,
      duft6_12:       find(/yfirfer.*duft|duft.*yfirfer/) || FB.duft,
      co2_2:          find(/yfirfer.*co2|co2.*yfirfer/) || FB.co2,
      co2_5:          find(/yfirfer.*co2|co2.*yfirfer/) || FB.co2,
      brunaslongur:   find(/yfirfer.*brunaslang|brunaslang.*yfirfer/) || FB.brunaslanga,
      reykskynjarar:  find(/yfirfer.*reykskynj|reykskynj.*yfirfer/) || FB.reykskynjari,
      eldvarnarteppi: skod,
      annad:          skod
    };
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
  // 2026-05-29: search term is no longer persisted — always start blank.
  try { localStorage.removeItem(LS_SEARCH); } catch (_) {}
  const state = {
    view: localStorage.getItem(LS_VIEW) || 'card',          // 'card' | 'list'
    sort: localStorage.getItem(LS_SORT) || 'alpha',         // 'alpha' | 'month' | 'oldest' (legacy)
    sortCol: localStorage.getItem(LS_SORTCOL) || '',         // name|address|email|month|tools|estimate|priority|status|lastYr
    sortDir: localStorage.getItem(LS_SORTDIR) || 'asc',      // asc | desc
    month: parseInt(localStorage.getItem(LS_MONTH) || '0', 10), // 0 = all
    status: localStorage.getItem(LS_STATUS) || 'all',        // 'all' | 'done' | 'pending' | 'never'
    search: ''
  };
  function saveState() {
    localStorage.setItem(LS_VIEW, state.view);
    localStorage.setItem(LS_SORT, state.sort);
    localStorage.setItem(LS_SORTCOL, state.sortCol || '');
    localStorage.setItem(LS_SORTDIR, state.sortDir || 'asc');
    localStorage.setItem(LS_MONTH, String(state.month));
    localStorage.setItem(LS_STATUS, state.status);
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
    } else if (state.status === 'skipped2025') {
      // 2026-05-26: companies inspected 2024 but skipped 2025 — the "weird year"
      // hole. Detect by last_year_inspected === 2024 (or any year < curYear-1).
      arr = arr.filter(c => {
        const last = +c._ars.last_year_inspected || 0;
        return last > 0 && last < curYear - 1;
      });
    } else if (state.status === 'priority') {
      // 2026-05-26: damage-control filter — show only flagged priority cases.
      arr = arr.filter(c => +(c._ars.priority || 0) > 0);
    }
    // Sort by priority (red > yellow > green > none) first, then by other criteria
    // — but only when filtering by priority (otherwise the existing sort flow wins)
    if (state.status === 'priority') {
      arr.sort((a, b) => (+(b._ars.priority || 0)) - (+(a._ars.priority || 0)));
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
    // 2026-05-26: column-based sort. state.sortCol drives, state.sortDir is asc|desc.
    // Falls back to legacy state.sort (alpha|month|oldest) for users with old
    // localStorage state.
    const SORT_COMPARATORS = {
      name: (a, b) => String(a.nafn || '').localeCompare(b.nafn || '', 'is'),
      address: (a, b) => String(a.heimilisfang || '').localeCompare(b.heimilisfang || '', 'is')
                       || String(a.nafn || '').localeCompare(b.nafn || '', 'is'),
      email: (a, b) => {
        const ea = (a.netfang || '').trim();
        const eb = (b.netfang || '').trim();
        // Empty emails always last regardless of asc/desc
        if (!ea && eb) return 1;
        if (ea && !eb) return -1;
        return ea.localeCompare(eb, 'is')
            || String(a.nafn || '').localeCompare(b.nafn || '', 'is');
      },
      month: (a, b) => {
        const ma = +a._ars.inspect_month || 13;
        const mb = +b._ars.inspect_month || 13;
        // Sort by closest-upcoming for month asc; raw 1-12 for explicit user click
        return ma - mb || String(a.nafn).localeCompare(b.nafn, 'is');
      },
      tools: (a, b) => {
        const ta = Object.values(a._ars.equipment || {}).reduce((s, v) => s + (+v || 0), 0);
        const tb = Object.values(b._ars.equipment || {}).reduce((s, v) => s + (+v || 0), 0);
        return ta - tb || String(a.nafn).localeCompare(b.nafn, 'is');
      },
      estimate: (a, b) => (+a._ars.estimated_yearly || 0) - (+b._ars.estimated_yearly || 0)
                        || String(a.nafn).localeCompare(b.nafn, 'is'),
      status: (a, b) => {
        // 0=done, 1=fieldOnly, 2=overdue, 3=skipped, 4=pending — relevance order
        const score = c => {
          const ars = c._ars || {};
          const lastYr = +ars.last_year_inspected || 0;
          const fieldYr = +ars.field_inspected_year || 0;
          const m = +ars.inspect_month || 0;
          if (lastYr === curYear) return 0;
          if (fieldYr === curYear) return 1;
          if (lastYr > 0 && lastYr < curYear - 1) return 3;
          if (m > 0 && m <= curMonth) return 2;
          return 4;
        };
        return score(a) - score(b) || String(a.nafn).localeCompare(b.nafn, 'is');
      },
      priority: (a, b) => (+(b._ars.priority || 0)) - (+(a._ars.priority || 0))  // higher first
                       || String(a.nafn).localeCompare(b.nafn, 'is'),
      lastYr: (a, b) => (+a._ars.last_year_inspected || 0) - (+b._ars.last_year_inspected || 0)
                       || String(a.nafn).localeCompare(b.nafn, 'is'),
    };
    // Legacy fallback
    if (!state.sortCol) {
      if (state.sort === 'alpha')  state.sortCol = 'name';
      else if (state.sort === 'month')  state.sortCol = 'month';
      else if (state.sort === 'oldest') state.sortCol = 'lastYr';
      else state.sortCol = 'month';
      state.sortDir = 'asc';
    }
    const cmp = SORT_COMPARATORS[state.sortCol] || SORT_COMPARATORS.name;
    arr.sort(cmp);
    if (state.sortDir === 'desc') arr.reverse();
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
            <button id="_ars-print" type="button" title="Prenta listann eins og hann er síaður núna" style="padding:7px 12px;border:1px solid #cbd5e1;border-radius:8px;background:#fff;font:inherit;font-size:12px;font-weight:600;color:#0f172a;cursor:pointer">🖨 Prenta lista</button>
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
              { v: 'skipped2025', label: '🟡 Slepptir í fyrra' },
              { v: 'priority', label: '❗ Forgangur' },
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
    main.querySelector('#_ars-print')?.addEventListener('click', printList);
    main.querySelectorAll('._ars-st').forEach(b => b.addEventListener('click', () => {
      state.status = b.dataset.status; saveState(); render();
    }));
    main.querySelectorAll('._ars-mo').forEach(b => b.addEventListener('click', () => {
      state.month = parseInt(b.dataset.month, 10); saveState(); render();
    }));
    // 2026-05-26: column-header sort click — toggle dir if same col, else
    // switch to col with asc as default.
    main.querySelectorAll('._ars-sort').forEach(th => th.addEventListener('click', () => {
      const col = th.dataset.sort;
      if (state.sortCol === col) {
        state.sortDir = state.sortDir === 'asc' ? 'desc' : 'asc';
      } else {
        state.sortCol = col;
        // Sensible default direction per column: name/address/email ascending,
        // numeric/priority/status descending (so biggest/most-important on top)
        state.sortDir = (col === 'name' || col === 'address' || col === 'email' || col === 'month')
                        ? 'asc' : 'desc';
      }
      saveState(); render();
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

    // "Tekið út" toggle (2026-05-25): operator can mark physical inspection done
    // without finishing the paperwork. Persists to arsskodun_customers[co].field_inspected_year.
    main.querySelectorAll('._ars-tu-toggle').forEach(btn => btn.addEventListener('click', async e => {
      e.stopPropagation();
      const coId = +btn.dataset.coId;
      if (!coId) return;
      if (!window.AppSettings || !window.AppSettings.save) { alert('Engar stillingar tiltækar'); return; }
      const curYear = new Date().getFullYear();
      const allMap = (window.AppSettings.path && window.AppSettings.path(STORAGE_KEY)) || {};
      const entry = Object.assign({}, allMap[String(coId)] || {});
      const isCurrentlyMarked = +entry.field_inspected_year === curYear;
      if (isCurrentlyMarked) {
        delete entry.field_inspected_year;
      } else {
        entry.field_inspected_year = curYear;
      }
      const map = Object.assign({}, allMap, { [String(coId)]: entry });
      btn.disabled = true;
      const ok = await window.AppSettings.save({ [STORAGE_KEY]: map });
      if (!ok) { alert('Vista mistókst'); btn.disabled = false; return; }
      // Update local cache so re-render picks up the change without a full reload
      const c = _cache.list.find(x => x.id === coId);
      if (c) c._ars = entry;
      render();
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

  // ── Print the currently-filtered list ─────────────────────────────────────
  // Prints exactly what filteredSorted() returns (same search + status + month
  // filters and sort the user sees), as a clean A4-landscape worklist.
  function printList() {
    const arr = filteredSorted();
    if (!arr.length) { alert('Engin fyrirtæki í listanum til að prenta.'); return; }
    const curYear = new Date().getFullYear();
    const filterLabel = state.month >= 1 && state.month <= 12
      ? `${MONTHS_IS[state.month - 1]} ${curYear}`
      : (state.status === 'done'        ? `Búið ${curYear}`
       : state.status === 'pending'     ? `Eftir ${curYear}`
       : state.status === 'never'       ? 'Aldrei skoðað'
       : state.status === 'skipped2025' ? 'Slepptir í fyrra'
       : state.status === 'priority'    ? 'Forgangur'
       : `Allir mánuðir ${curYear}`);
    const searchNote = state.search.trim() ? ` · leit: “${esc(state.search.trim())}”` : '';

    let totalEst = 0;
    const rows = arr.map((c, i) => {
      const ars = c._ars || {};
      const m = +ars.inspect_month || 0;
      const lastYr = +ars.last_year_inspected || 0;
      const fieldYr = +ars.field_inspected_year || 0;
      const totalEq = Object.values(ars.equipment || {}).reduce((s, v) => s + (+v || 0), 0);
      const est = +ars.estimated_yearly || 0;
      totalEst += est;
      const statusTxt = lastYr === curYear ? 'Búið ' + curYear
        : fieldYr === curYear ? 'Tekið út'
        : lastYr ? 'Eftir (síðast ' + lastYr + ')'
        : 'Aldrei';
      const phone = [c.simi, c.farsimi].filter(Boolean).join(' / ');
      return `<tr>
        <td class="num">${i + 1}</td>
        <td><strong>${esc(c.nafn || '')}</strong>${c.kennitala ? `<div class="kt">kt. ${esc(fmtKt(c.kennitala))}</div>` : ''}</td>
        <td>${esc(c.heimilisfang || '')}</td>
        <td class="nowrap">${esc(phone)}</td>
        <td>${esc(c.netfang || '')}</td>
        <td class="c">${esc(MONTHS_IS_SHORT[m - 1] || '—')}</td>
        <td class="c">${totalEq || ''}</td>
        <td class="r">${est ? fmtKr(est) : ''}</td>
        <td class="c">${esc(statusTxt)}</td>
      </tr>`;
    }).join('');

    const win = window.open('', '_blank');
    if (!win) { alert('Leyfðu sprettiglugga til að prenta.'); return; }
    const logo = (window.SlokkLogo && SlokkLogo.imgHtml) ? SlokkLogo.imgHtml({ heightPx: 46, alt: 'Slökkvitæki ehf' }) : '';
    const dateStr = new Date().toLocaleDateString('is-IS');
    win.document.write(`<!doctype html><html lang="is"><head><meta charset="utf-8"><title>Fyrirtæki í Þjónustu — ${esc(filterLabel)}</title>
<style>
  @page { size: A4 landscape; margin: 12mm; }
  * { box-sizing: border-box; }
  body { font-family: 'IBM Plex Sans', system-ui, Arial, sans-serif; color:#0f172a; margin:0; padding:18px; }
  .hd { display:flex; justify-content:space-between; align-items:flex-start; border-bottom:2px solid #0f172a; padding-bottom:10px; margin-bottom:12px; }
  .hd h1 { margin:0; font-size:18px; }
  .hd .sub { font-size:12px; color:#475569; margin-top:3px; }
  .hd .meta { text-align:right; font-size:11px; color:#64748b; }
  table { width:100%; border-collapse:collapse; font-size:11px; }
  th, td { padding:5px 7px; border-bottom:1px solid #e2e8f0; text-align:left; vertical-align:top; }
  th { background:#f1f5f9; font-size:9.5px; text-transform:uppercase; letter-spacing:.04em; color:#475569; border-bottom:1.5px solid #cbd5e1; }
  td.num, td.c { text-align:center; color:#64748b; }
  td.r { text-align:right; font-variant-numeric:tabular-nums; }
  td.nowrap { white-space:nowrap; }
  .kt { font-size:9.5px; color:#94a3b8; font-family:monospace; }
  tbody tr:nth-child(even) td { background:#fafbfc; }
  tfoot td { font-weight:700; border-top:2px solid #0f172a; background:#fff; }
  .toolbar { margin-bottom:12px; }
  .toolbar button { padding:8px 16px; font-size:13px; border:none; border-radius:7px; cursor:pointer; font-weight:600; margin-right:6px; }
  .toolbar .p { background:#dc2626; color:#fff; }
  .toolbar .x { background:#f1f5f9; color:#334155; }
  @media print { .toolbar { display:none; } body { padding:0; } }
</style></head><body>
  <div class="toolbar">
    <button class="p" onclick="window.print()">🖨 Prenta</button>
    <button class="x" onclick="window.close()">Loka</button>
  </div>
  <div class="hd">
    <div>
      <h1>Fyrirtæki í Þjónustu</h1>
      <div class="sub">Sía: <strong>${esc(filterLabel)}</strong>${searchNote} · ${arr.length} fyrirtæki</div>
    </div>
    <div class="meta">${logo}<div style="margin-top:4px">Slökkvitæki ehf · ${dateStr}</div></div>
  </div>
  <table>
    <thead><tr>
      <th class="num">#</th><th>Fyrirtæki</th><th>Heimilisfang</th><th>Sími</th><th>Netfang</th>
      <th style="text-align:center">Skoðun</th><th style="text-align:center">Tæki</th><th style="text-align:right">Áætl.</th><th style="text-align:center">Staða</th>
    </tr></thead>
    <tbody>${rows}</tbody>
    <tfoot><tr><td></td><td>Samtals ${arr.length} fyrirtæki</td><td colspan="5"></td><td class="r">${fmtKr(totalEst)}</td><td></td></tr></tfoot>
  </table>
  <script>setTimeout(function(){window.print();},350);<\/script>
</body></html>`);
    win.document.close();
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
          const fieldYr = +ars.field_inspected_year || 0;     // 2026-05-25: physical inspection done, paperwork pending
          const isDone = lastYr === curYear;
          const isFieldOnly = !isDone && fieldYr === curYear; // Tekið út — skjöl eftir
          // 2026-05-26: "skipped last year" — last inspection was 2024 (or older)
          // even though curYear-1 (2025) should have happened. Coworker reported
          // 2025 was a chaotic year and several locations never got visited.
          const isSkipped = !isDone && !isFieldOnly && lastYr > 0 && lastYr < curYear - 1;
          const isOverdue = !isDone && !isFieldOnly && !isSkipped && (m > 0 && m <= curMonth);
          const aminning = cleanAminning(ars.aminning);
          const est = +ars.estimated_yearly || 0;

          const statusBadge = isDone
            ? '<span style="background:#dcfce7;color:#15803d;font-size:9.5px;font-weight:700;padding:2px 7px;border-radius:99px;border:1px solid #bbf7d0">✅ ' + curYear + '</span>'
            : isFieldOnly
            ? '<span style="background:#fef3c7;color:#a16207;font-size:9.5px;font-weight:700;padding:2px 7px;border-radius:99px;border:1px solid #fde68a">🟡 Tekið út</span>'
            : isSkipped
            ? `<span title="Síðast skoðað ${lastYr} — sleppt í fyrra" style="background:#fef3c7;color:#a16207;font-size:9.5px;font-weight:700;padding:2px 7px;border-radius:99px;border:1px solid #fde68a;display:inline-flex;align-items:center;gap:2px">⏰ '${String(lastYr).slice(-2)}</span>`
            : isOverdue
            ? '<span style="background:#fee2e2;color:#b91c1c;font-size:9.5px;font-weight:700;padding:2px 7px;border-radius:99px;border:1px solid #fecaca">⚠ Á eftir</span>'
            : '<span style="background:#f1f5f9;color:#475569;font-size:9.5px;font-weight:700;padding:2px 7px;border-radius:99px;border:1px solid #cbd5e1">⏳ Í pípu</span>';
          // Toggle button: lets user mark "tekið út" without finishing paperwork.
          // Click cycles: nothing → Tekið út → cleared (back to nothing) ; once "skoðað"
          // (isDone) is set, the toggle is hidden because the work is fully done.
          const toggleBtn = !isDone
            ? `<button class="_ars-tu-toggle" data-co-id="${c.id}" type="button" title="${isFieldOnly ? 'Hreinsa — ekki búið að taka út' : 'Merkja sem tekið út (skjöl eftir)'}" style="font-size:9.5px;padding:2px 7px;border-radius:99px;border:1px solid ${isFieldOnly ? '#fbbf24' : '#cbd5e1'};background:${isFieldOnly ? '#fef3c7' : '#fff'};color:${isFieldOnly ? '#a16207' : '#475569'};cursor:pointer;font-weight:600;line-height:1.3">${isFieldOnly ? '✓ Tekið út' : '☐ Tekið út'}</button>`
            : '';

          return `
            <div class="_ars-card" data-co-id="${c.id}" style="background:#fff;border:1px solid #e2e8f0;border-radius:11px;padding:12px 14px;display:flex;flex-direction:column;gap:7px;box-shadow:0 1px 2px rgba(0,0,0,0.03);cursor:pointer;transition:all .15s" onmouseover="this.style.borderColor='#94a3b8';this.style.boxShadow='0 2px 8px rgba(0,0,0,0.06)'" onmouseout="this.style.borderColor='#e2e8f0';this.style.boxShadow='0 1px 2px rgba(0,0,0,0.03)'">
              <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px">
                <div style="min-width:0;flex:1">
                  <div style="font-weight:700;color:#0f172a;font-size:13.5px;line-height:1.25">${esc(c.nafn || '—')}</div>
                  ${c.kennitala ? `<div style="font-size:10.5px;color:#94a3b8;font-family:monospace;margin-top:1px">kt. ${esc(fmtKt(c.kennitala))}</div>` : ''}
                  ${c.heimilisfang ? `<div style="font-size:11px;color:#64748b;margin-top:2px">📍 ${esc(c.heimilisfang)}</div>` : ''}
                  ${(() => {
                    // 2026-05-26: surface netfang on the card so the operator can
                    // see at a glance which companies are missing it for the month.
                    const email = (c.netfang || '').trim();
                    if (email) {
                      return `<div style="font-size:11px;color:#0369a1;margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${esc(email)}">✉ <a href="mailto:${esc(email)}" style="color:#0369a1;text-decoration:none" onclick="event.stopPropagation()">${esc(email)}</a></div>`;
                    }
                    return `<div style="font-size:11px;color:#dc2626;margin-top:2px;font-weight:600">✉ Netfang vantar</div>`;
                  })()}
                </div>
                <div style="display:flex;flex-direction:column;gap:3px;align-items:flex-end">
                  <div style="display:flex;gap:4px;align-items:center">${(window.Priority && window.Priority.btnHtml(c.id, 18)) || ''}${statusBadge}</div>
                  ${toggleBtn}
                </div>
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
              ${(() => {
                // 2026-05-26: clickable sort headers. Smelltu → bring upp;
                // smelltu aftur → snúa.
                const cur = state.sortCol;
                const dir = state.sortDir;
                const arrow = (col) => cur === col
                  ? `<span style="color:#0f172a;margin-left:3px;font-weight:700">${dir==='asc' ? '▲' : '▼'}</span>`
                  : '<span style="color:#cbd5e1;margin-left:3px;font-size:9px">⇅</span>';
                const css = 'padding:9px 11px;cursor:pointer;user-select:none;transition:background .12s';
                const hover = `onmouseover="this.style.background='#eef2f7'" onmouseout="this.style.background='transparent'"`;
                return `
                  <th data-sort="name"     class="_ars-sort" style="${css}" ${hover}>Fyrirtæki${arrow('name')}</th>
                  <th data-sort="address"  class="_ars-sort" style="${css}" ${hover}>Heimilisfang${arrow('address')}</th>
                  <th data-sort="email"    class="_ars-sort" style="${css}" ${hover}>Netfang${arrow('email')}</th>
                  <th data-sort="month"    class="_ars-sort" style="${css};text-align:center" ${hover}>Skoðun${arrow('month')}</th>
                  <th data-sort="tools"    class="_ars-sort" style="${css};text-align:center" ${hover}>Tæki${arrow('tools')}</th>
                  <th data-sort="estimate" class="_ars-sort" style="${css};text-align:right" ${hover}>Áætl.${arrow('estimate')}</th>
                  <th data-sort="priority" class="_ars-sort" style="${css};text-align:center" ${hover}>❗${arrow('priority')}</th>
                  <th data-sort="status"   class="_ars-sort" style="${css};text-align:center" ${hover}>${curYear}${arrow('status')}</th>
                  <th style="padding:9px 11px"></th>
                `;
              })()}
            </tr>
          </thead>
          <tbody>
            ${arr.map(c => {
              const ars = c._ars || {};
              const eq = ars.equipment || {};
              const totalEq = Object.values(eq).reduce((s, v) => s + (+v || 0), 0);
              const m = +ars.inspect_month || 0;
              const lastYr = +ars.last_year_inspected || 0;
              const fieldYr = +ars.field_inspected_year || 0;
              const isDone = lastYr === curYear;
              const isFieldOnly = !isDone && fieldYr === curYear;
              const isSkipped = !isDone && !isFieldOnly && lastYr > 0 && lastYr < curYear - 1;
              const isOverdue = !isDone && !isFieldOnly && !isSkipped && (m > 0 && m <= curMonth);
              const est = +ars.estimated_yearly || 0;
              const aminning = cleanAminning(ars.aminning);
              const dot = isDone ? '#22c55e'
                : (isFieldOnly ? '#f59e0b'
                : (isSkipped ? '#f59e0b'
                : (isOverdue ? '#ef4444' : '#94a3b8')));
              const statusTitle = isDone ? ('Skoðað ' + curYear)
                : (isFieldOnly ? 'Tekið út — skjöl eftir'
                : (isSkipped ? ('Síðast skoðað ' + lastYr)
                : (isOverdue ? 'Útrunnið' : 'Á dagskrá')));
              const skippedBadge = isSkipped
                ? `<span title="Síðast skoðað ${lastYr}" style="display:inline-block;margin-left:4px;background:#fef3c7;color:#a16207;font-size:8.5px;font-weight:700;padding:1px 5px;border-radius:99px;border:1px solid #fde68a;line-height:1.2">⏰ '${String(lastYr).slice(-2)}</span>`
                : '';
              return `
                <tr class="_ars-row" data-co-id="${c.id}" style="border-bottom:1px solid #f1f5f9;cursor:pointer;transition:background .1s" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='transparent'">
                  <td style="padding:8px 11px">
                    <div style="font-weight:600;color:#0f172a">${esc(c.nafn || '—')}</div>
                    ${c.kennitala ? `<div style="font-size:10.5px;color:#94a3b8;font-family:monospace;margin-top:1px">kt. ${esc(fmtKt(c.kennitala))}</div>` : ''}
                    ${aminning ? `<div style="font-size:10px;color:#b45309;margin-top:1px;line-height:1.3"><span style="font-weight:700">📌</span> ${esc(aminning.slice(0, 90))}${aminning.length>90?'…':''}</div>` : ''}
                  </td>
                  <td style="padding:8px 7px;color:#475569;font-size:11.5px">${esc(c.heimilisfang || '—')}</td>
                  <td style="padding:8px 7px;font-size:11px">${(() => {
                    const e = (c.netfang || '').trim();
                    if (e) return `<a href="mailto:${esc(e)}" style="color:#0369a1;text-decoration:none" onclick="event.stopPropagation()">${esc(e)}</a>`;
                    return `<span style="color:#dc2626;font-weight:600">✉ vantar</span>`;
                  })()}</td>
                  <td style="padding:8px 7px;text-align:center;font-weight:600;color:${m===curMonth?'#dc2626':'#475569'}">${esc(MONTHS_IS_SHORT[m-1] || '—')}</td>
                  <td style="padding:8px 7px;text-align:center;font-weight:700;color:#0f172a">${totalEq||'—'}</td>
                  <td style="padding:8px 7px;text-align:right;color:#15803d;font-weight:700;font-variant-numeric:tabular-nums">${fmtKrShort(est)}</td>
                  <td style="padding:8px 7px;text-align:center" onclick="event.stopPropagation()">${(window.Priority && window.Priority.btnHtml(c.id, 18)) || ''}</td>
                  <td style="padding:8px 7px"><div style="display:flex;align-items:center;justify-content:center;gap:5px">
                    <span style="width:46px;display:inline-flex;justify-content:flex-end;flex-shrink:0">${skippedBadge}</span>
                    <span title="${statusTitle}" style="display:inline-block;width:13px;height:13px;border-radius:99px;background:${dot};box-shadow:0 0 0 1px rgba(0,0,0,.12);flex-shrink:0"></span>
                    <span style="width:24px;display:inline-flex;justify-content:center;flex-shrink:0">${!isDone ? `<button class="_ars-tu-toggle" data-co-id="${c.id}" type="button" title="${isFieldOnly ? 'Hreinsa — ekki búið að taka út' : 'Merkja sem tekið út (skjöl eftir)'}" style="font-size:9px;padding:1px 5px;border-radius:99px;border:1px solid ${isFieldOnly ? '#fbbf24' : '#cbd5e1'};background:${isFieldOnly ? '#fef3c7' : '#fff'};color:${isFieldOnly ? '#a16207' : '#475569'};cursor:pointer;font-weight:600;line-height:1.2">${isFieldOnly ? '✓' : '☐'}</button>` : ''}</span>
                  </div></td>
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
      ['reykskynjarar', 'Reykskynjarar'],
      ['annad', 'Annað / óþekkt']
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
                  ${sorted.map((a, idx) => {
                    // Drive-link entries get a direct <a> opening Drive viewer.
                    // Storage entries (have `path` but no drive_url/drive_id)
                    // get a click handler that fetches a signed URL — patch 111
                    // before this fix rendered href="#" which reloaded the SPA
                    // back to the list view.
                    const isStorage = !a.drive_url && !a.drive_id && a.path;
                    const url = a.drive_url || (a.drive_id ? 'https://drive.google.com/file/d/' + a.drive_id + '/view' : null);
                    const icon = a.kind === 'samningur' ? '📜' : '🧾';
                    const yearTag = a.year ? `<span style="background:#f0fdf4;color:#15803d;font-size:10px;font-weight:700;padding:1px 6px;border-radius:99px;border:1px solid #bbf7d0;margin-left:6px">${a.year}</span>` : '';
                    const autoTag = a.auto_matched ? '<span style="color:#94a3b8;font-size:10px" title="Sjálfkrafa pörun">✦</span>' : '';
                    const inner = `
                      <span style="font-size:14px">${icon}</span>
                      <span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(a.name || 'Skjal')}</span>
                      ${yearTag}
                      ${autoTag}
                      <span style="color:#94a3b8;font-size:10px">↗</span>`;
                    const baseStyle = "display:flex;align-items:center;gap:8px;background:#fafafa;border:1px solid #f1f5f9;border-radius:6px;padding:6px 10px;text-decoration:none;color:#0f172a;font-size:11.5px;transition:background .1s;text-align:left;width:100%;font:inherit;cursor:pointer";
                    if (isStorage) {
                      return `<button type="button" data-ars-att-co="${coId}" data-ars-att-idx="${idx}" style="${baseStyle}" onmouseover="this.style.background='#fff';this.style.borderColor='#cbd5e1'" onmouseout="this.style.background='#fafafa';this.style.borderColor='#f1f5f9'">${inner}</button>`;
                    }
                    return `<a href="${esc(url || '#')}" target="_blank" rel="noopener" style="${baseStyle}" onmouseover="this.style.background='#fff';this.style.borderColor='#cbd5e1'" onmouseout="this.style.background='#fafafa';this.style.borderColor='#f1f5f9'">${inner}</a>`;
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
            <button class="_ars-go-samningur" data-co-id="${c.id}" type="button" style="flex:1;min-width:140px;padding:8px 12px;background:#fff;color:#0f172a;border:1px solid #cbd5e1;border-radius:8px;cursor:pointer;font:inherit;font-size:12px;font-weight:600">📑 Þjónustusamningur</button>
          </div>
        </div>
      </div>
    `;
    bg.addEventListener('click', e => {
      if (e.target === bg) bg.remove();
    });
    bg.querySelector('._ars-close').addEventListener('click', () => bg.remove());

    // Delegated click for storage-backed attachments (those rendered as
    // <button data-ars-att-co data-ars-att-idx> because they have a `path`
    // but no drive_url/drive_id). Fetch signed URL via patch 111 and open
    // in a new tab — never let it bubble up to whatever was eating clicks
    // and reloading the SPA.
    bg.addEventListener('click', async e => {
      const btn = e.target.closest('button[data-ars-att-co][data-ars-att-idx]');
      if (!btn) return;
      e.preventDefault();
      e.stopPropagation();
      const coId = +btn.dataset.arsAttCo;
      const idx  = +btn.dataset.arsAttIdx;
      const attsAll = (window.AppSettings && window.AppSettings.path && window.AppSettings.path('company_attachments')) || {};
      const list = attsAll[String(coId)] || [];
      const sorted = list.slice().sort((a, b) => (+b.year || 0) - (+a.year || 0));
      const att = sorted[idx];
      if (!att || !att.path) return;
      const CA = window.CompanyAttachments;
      const url = CA && CA.getPublicUrl ? await CA.getPublicUrl(att.path) : null;
      if (!url) { alert('Gat ekki opnað skjalið.'); return; }
      window.open(url, '_blank', 'noopener');
    });

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
      //
      // Formula: ∑(tæki × Yfirferð) + Skýrslugerð + Akstur × N
      //   - Skýrslugerð: 3500 + VSK = 4340 kr (per customer per year)
      //   - Akstur: 3000 + VSK = 3720 kr × akstur_multiplier (1 by default,
      //     2 for far-away customers — stored on entry.akstur_multiplier)
      //   - Áminning overrides yfirferd_price and applies discount_pct.
      const parsed = entry.aminning_parsed || null;
      // 2026-05-27: dynamic Yfirferð pricelist — pulls live from vorur table
      // so any price update Aggi makes in Vörur og þjónusta is reflected
      // immediately, without a code change/deploy. Hardcoded values stay
      // as fallback if a vorur row is missing or DB roundtrip fails.
      const FALLBACK_PRICES = {
        lettvatn:       3906,
        duft2:          4200,
        duft6_12:       4200,
        co2_2:          4055,
        co2_5:          4055,
        brunaslongur:   5389,
        eldvarnarteppi: 0,
        reykskynjarar:  2909
      };
      // Token signatures to match against vorur.nafn — used to find the
      // right "Yfirferð X" row for each equipment key. Each entry: must
      // contain ALL required tokens (case-insensitive, diacritic-folded).
      const KEY_SIGS = {
        lettvatn:       ['yfirfer', 'lettvatn'],
        duft2:          ['yfirfer', 'duft', '2'],
        duft6_12:       ['yfirfer', 'duft', '6'],
        co2_2:          ['yfirfer', 'co2', '2'],
        co2_5:          ['yfirfer', 'co2', '5'],
        brunaslongur:   ['yfirfer', 'brunaslang'],   // matches both "brunaslanga"/"brunaslöngur"
        eldvarnarteppi: ['yfirfer', 'eldvarn'],
        reykskynjarar:  ['yfirfer', 'reykskyn'],
      };
      function fold(s) {
        return String(s || '').toLowerCase()
          .normalize('NFD').replace(/\p{Diacritic}/gu, '')
          .replace(/þ/g, 'th').replace(/ð/g, 'd')
          .replace(/æ/g, 'ae').replace(/ö/g, 'o');
      }
      async function loadPricesFromVorur() {
        try {
          const SB = window.DB && window.DB.sb;
          if (!SB) return FALLBACK_PRICES;
          const r = await SB.from('vorur').select('nafn,verd_an_vsk').ilike('nafn', '%yfir%');
          if (r.error || !Array.isArray(r.data)) return FALLBACK_PRICES;
          const out = Object.assign({}, FALLBACK_PRICES);
          for (const key in KEY_SIGS) {
            const sig = KEY_SIGS[key];
            const hit = r.data.find(p => {
              const n = fold(p.nafn);
              return sig.every(tok => n.includes(fold(tok)));
            });
            if (hit && hit.verd_an_vsk > 0) {
              out[key] = Math.round((+hit.verd_an_vsk) * 1.24);
            }
          }
          console.log('[arsskodun] live yfirferð prices:', out);
          return out;
        } catch (_) { return FALLBACK_PRICES; }
      }
      const PRICES = await loadPricesFromVorur();
      const SKYRSLUGERD = 4340;   // 3500 + 24% VSK
      const AKSTUR_UNIT = 3720;   // 3000 + 24% VSK
      let total = 0;
      for (const k in PRICES) {
        const qty = +newEq[k] || 0;
        if (!qty) continue;
        let unit = PRICES[k];
        if (parsed && parsed.yfirferd_price > 0 && /^(lettvatn|duft|co2)/.test(k)) unit = parsed.yfirferd_price;
        total += qty * unit;
      }
      const aksturMult = +entry.akstur_multiplier || 1;
      if (total > 0) {
        total += SKYRSLUGERD;
        total += AKSTUR_UNIT * aksturMult;
      }
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
    // 2026-05-31: open the prefilled Þjónustusamningur (aðal) template for this
    // company, same as the company-detail page button.
    const _samnBtn = bg.querySelector('._ars-go-samningur');
    if (_samnBtn) _samnBtn.addEventListener('click', () => {
      bg.remove();
      if (window.DocTemplates && DocTemplates.openForCompany) DocTemplates.openForCompany(coId);
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
  window.Arsskodun = { show, openDetail, openOnMap, _cache, render, version: 'v1' };

  // Keep the cached priority in sync when the ❗ control is cycled (patch 175),
  // so sorting by ❗ stays correct. The ❗ button updates itself in place — no
  // re-render here (that reset scroll and made the list jump).
  document.addEventListener('priority-changed', e => {
    const co = (_cache.list || []).find(x => String(x.id) === String(e.detail.coId));
    if (co) {
      co._ars = co._ars || {};
      if (e.detail.newPri > 0) co._ars.priority = e.detail.newPri;
      else delete co._ars.priority;
    }
  });
  console.log('[arsskodun] v1 ready');
})();
/* === END ÁRSSKOÐUN === */
