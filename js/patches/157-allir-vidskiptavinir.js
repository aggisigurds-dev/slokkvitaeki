/* === ALLIR VIÐSKIPTAVINIR v1 ===
 *
 * New "master customer list" view — every company in one place, with
 * service-subscription badges showing which contracts they hold.
 *
 * Concept (2026-05-18):
 *   The user has companies scattered across multiple views:
 *     • Fyrirtæki í Þjónustu  → 295 fyrirtækjaþjónusta contract customers
 *     • Brunakerfisþjónusta   → brunakerfi contract customers
 *     • Viðskiptavinir         → individuals (mined from work orders)
 *
 *   But customer base info lives in ONE table (fyrirtaeki). The other
 *   views are filtered slices. This patch surfaces the WHOLE customer
 *   base as a single page with service badges, so you can see at a
 *   glance who is in what contract — and so it's easy to find any
 *   customer regardless of which contract they're in.
 *
 *   Tonight's scope (additive, read-only):
 *     • New sidebar entry "Allir Viðskiptavinir"
 *     • Same card layout as Fyrirtæki í Þjónustu (preserved look)
 *     • Filter chips: Allir / Fyrirtækjaþj. / Brunakerfi / Án samnings
 *     • Search by name, kt, address, phone, email
 *     • Click card → opens existing company detail modal
 *
 *   Future (tomorrow eve+):
 *     • Buttons in the modal to register/unregister a customer for
 *       fyrirtækjaþjónusta or brunakerfi (writes to AppSettings)
 *     • Þjónustutæki reads its list from arsskodun_customers mark
 *     • Same for the brunakerfi workspace
 *
 *   What this patch DOESN'T touch:
 *     • Existing Viðskiptavinir nav stays as-is (individuals fallback)
 *     • No changes to Þjónustutæki, Fyrirtæki í Þjónustu, or Brunakerfi
 *     • No writes to any data — fully read-only
 */
(() => {
  if (window.__allirVidskInstalled) return;
  window.__allirVidskInstalled = true;

  const VIEW_ID  = 'view-allir-vidsk';
  const NAV_KEY  = 'allir-vidsk';
  const LS_FILT  = 'allir_vidsk_filter';
  const LS_SRCH  = 'allir_vidsk_search';
  const LS_VIEW  = 'allir_vidsk_view2';    // 'card' | 'list' (default list)
  const LS_SORT  = 'allir_vidsk_sort';     // 'nafn' | 'nafn-desc' | 'kt' | 'newest' | 'units'
  const LS_XFILT = 'allir_vidsk_xfilter';  // extra filter — comma-separated of:
                                           //   has-email | has-gps | no-address

  // 2026-05-29: search term is no longer persisted — always start blank.
  try { localStorage.removeItem(LS_SRCH); } catch (_) {}
  const state = {
    filter:  localStorage.getItem(LS_FILT)  || 'all',
    search:  '',
    view:    localStorage.getItem(LS_VIEW)  || 'list',
    sort:    localStorage.getItem(LS_SORT)  || 'nafn',
    xfilter: (localStorage.getItem(LS_XFILT) || '').split(',').filter(Boolean),
    editId:  null,           // transient: company row currently in inline-edit mode
    selectMode: false,       // transient: bulk-select toolbar on/off
    selected: new Set()      // transient: ids picked in select mode
  };
  function saveState() {
    localStorage.setItem(LS_FILT,  state.filter);
    localStorage.setItem(LS_VIEW,  state.view);
    localStorage.setItem(LS_SORT,  state.sort);
    localStorage.setItem(LS_XFILT, state.xfilter.join(','));
  }

  // ── Helpers ────────────────────────────────────────────────────────────
  function esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    })[c]);
  }
  function fmtKt(kt) {
    const s = String(kt || '').replace(/\D/g, '');
    return s.length === 10 ? s.slice(0,6) + '-' + s.slice(6) : (kt || '');
  }

  // ── Data ───────────────────────────────────────────────────────────────
  // ── Document counter (samningur / úttektarskýrslur / reikningar) ───────────
  // Surfaces, per company, which service documents are on file so you can spot
  // — while scrolling — who is still missing docs. Keyed customer_base_id
  // (fyrirtaeki carries it) → customer_doc_status, kennitala as fallback.
  let _docByBase = new Map(), _docByKt = new Map(), _docLoaded = false;
  const _normKt = s => String(s == null ? '' : s).replace(/\D/g, '');
  async function loadDocStatus() {
    const SB = (window.DB && window.DB.sb); if (!SB) return;
    try {
      const { data } = await SB.from('customer_doc_status')
        .select('customer_base_id,kennitala,has_samningur,uttektir,reikningar,total_docs');
      _docByBase = new Map(); _docByKt = new Map();
      (data || []).forEach(s => {
        const rec = { samningur: !!s.has_samningur, uttektir: +s.uttektir || 0, reikningar: +s.reikningar || 0, total: +s.total_docs || 0 };
        if (s.customer_base_id != null) _docByBase.set(String(s.customer_base_id), rec);
        const kt = _normKt(s.kennitala); if (kt) _docByKt.set(kt, rec);
      });
      _docLoaded = true;
    } catch (_) { /* view may be unavailable */ }
  }
  function docsFor(c) {
    const rec = (c.customer_base_id != null && _docByBase.get(String(c.customer_base_id))) || _docByKt.get(_normKt(c.kennitala)) || null;
    if (!rec) return null;
    // customer_doc_status er lögaðila-víð. Á fjölstaða-kt (Center/Pizzan)
    // málaði Ú11/R8 á hvert hótel sem ætti 0. Aðeins sýnt þegar kt/base á einn stað.
    const kt = _normKt(c.kennitala);
    const list = (window.Companies && Companies.list) || [];
    let n = 0;
    for (let i = 0; i < list.length; i++) {
      const x = list[i];
      if (c.customer_base_id != null && x.customer_base_id === c.customer_base_id) n++;
      else if (kt && _normKt(x.kennitala) === kt) n++;
    }
    if (n > 1) return null;
    return rec;
  }

  // Bank-import-only payer rows (PR1 / framhald 48A): fyrirtaeki flagged
  // is_bank_only — no kt, no tæki, no samningur, just a name + bank note. They
  // inflated "Allir" + "Vantar skjöl", so they're hidden from every view except
  // the dedicated "Greiðendur (bank)" filter. Reversible (the flag, not delete).
  let _bankOnlyIds = new Set(), _bankLoaded = false;
  async function loadBankOnly() {
    const SB = (window.DB && window.DB.sb); if (!SB) return;
    try {
      const { data } = await SB.from('fyrirtaeki').select('id').eq('is_bank_only', true);
      _bankOnlyIds = new Set((data || []).map(r => +r.id));
      _bankLoaded = true;
    } catch (_) { /* column may not exist yet on older deploys */ }
  }
  function docPill(text, ok) {
    return '<span style="display:inline-block;padding:1px 5px;border-radius:5px;font-size:10px;font-weight:700;' +
      (ok ? 'color:#15803d;background:#f0fdf4;border:1px solid #bbf7d0;' : 'color:#5b6472;background:#eef1f6;border:1px solid #d7dde6;') + '">' + text + '</span>';
  }
  function docBadge(c) {
    const d = c._docs;
    if (!d) return '<span style="color:#8891a0;font-size:11px">—</span>';
    return '<span style="display:inline-flex;gap:3px;white-space:nowrap" title="Samningur · Úttektarskýrslur · Reikningar">' +
      docPill('S' + (d.samningur ? '✓' : '✗'), d.samningur) +
      docPill('Ú' + d.uttektir, d.uttektir > 0) +
      docPill('R' + d.reikningar, d.reikningar > 0) + '</span>';
  }

  function getAll() {
    const companies = (window.Companies && Companies.list) || [];
    const arsMap = (window.AppSettings && window.AppSettings.path && window.AppSettings.path('arsskodun_customers')) || {};
    const brunMap = (window.AppSettings && window.AppSettings.path && window.AppSettings.path('brunakerfi_customers')) || {};
    // Ferðaþjónusta — same idea as the two contract services but with NO
    // contract and flexible/seasonal drop-offs. Stored like the other two
    // (AppSettings map keyed by company id) so all three segments stay together.
    const ferdaMap = (window.AppSettings && window.AppSettings.path && window.AppSettings.path('ferdathjonusta_customers')) || {};
    const units = (window.DB && window.DB.cache && window.DB.cache.units) || [];
    const gc = (() => { try { return JSON.parse(localStorage.getItem('_slokk_gc') || '{}'); } catch (_) { return {}; } })();
    // Pre-tally unit counts by client name once (much faster than filtering
    // per company for 444 cards).
    const unitsByClient = {};
    units.forEach(u => {
      if (u.status === 'active') {
        unitsByClient[u.client] = (unitsByClient[u.client] || 0) + 1;
      }
    });
    return companies.map(c => {
      const ars = arsMap[String(c.id)];
      const bru = brunMap[String(c.id)];
      const ferda = ferdaMap[String(c.id)];
      const unitCount = unitsByClient[c.nafn] || 0;
      return {
        ...c,
        // 2026-07-09 (critical bug, Agnar): notaði BARA gamla equipment-blobbið
        // svo kúnnar sem ERU í þjónustu (er_i_thjonustu á fyrirtaeki-röðinni,
        // subscribed-flaggið, eða með alvöru virk tæki) töldust „Án samnings".
        // Nú SAMA regla og inService() í patch 153 (Fyrirtæki í Þjónustu) —
        // síðurnar tvær mega aldrei flokka ólíkt.
        _hasArs: c.er_i_thjonustu === true || !!(ars && (
          ars.subscribed === true ||
          (ars.equipment && Object.values(ars.equipment).some(v => +v > 0))
        )) || unitCount > 0,
        _hasBru: !!bru,
        _hasFerda: !!ferda,
        _ars: ars || {},
        _bru: bru || {},
        _ferda: ferda || {},
        _unitCount: unitCount,
        _hasGps: !!(c.heimilisfang && gc[c.heimilisfang]) || !!(c.nafn && gc[c.nafn]),
        _docs: docsFor(c),
        _bankOnly: _bankOnlyIds.has(+c.id)
      };
    });
  }

  function filterAll(arr) {
    const search = (state.search || '').trim().toLowerCase();
    let result = arr.slice();

    // Primary service filter (chips). Bank-import-only payers are hidden from
    // every view except their own "Greiðendur (bank)" filter.
    if (state.filter === 'bank') {
      result = result.filter(c => c._bankOnly);
    } else {
      result = result.filter(c => !c._bankOnly);
      if (state.filter === 'fyrirt') result = result.filter(c => c._hasArs);
      else if (state.filter === 'brunak') result = result.filter(c => c._hasBru);
      else if (state.filter === 'ferda') result = result.filter(c => c._hasFerda);
      else if (state.filter === 'onei') result = result.filter(c => !c._hasArs && !c._hasBru && !c._hasFerda);
    }

    // Secondary filters (xfilter) — additive AND
    if (state.xfilter.includes('has-email')) {
      result = result.filter(c => !!c.netfang);
    }
    if (state.xfilter.includes('has-gps')) {
      result = result.filter(c => c._hasGps);
    }
    if (state.xfilter.includes('no-address')) {
      result = result.filter(c => !c.heimilisfang);
    }
    if (state.xfilter.includes('has-units')) {
      result = result.filter(c => c._unitCount > 0);
    }
    if (state.xfilter.includes('review')) {
      result = result.filter(c => !!c.review_flag);
    }
    if (state.xfilter.includes('missing-docs')) {
      result = result.filter(c => !c._docs || c._docs.total === 0);
    }

    // Free-text search. NB: the kennitala check digit-strips both sides,
    // but if the user typed letters the stripped search becomes '' and
    // ''.includes('') is true — which would match every company. Guard
    // against that by only running the kt match when the search has at
    // least one digit.
    if (search) {
      const ktSearch = search.replace(/\D/g, '');
      result = result.filter(c =>
        (c.nafn || '').toLowerCase().includes(search) ||
        (ktSearch && (c.kennitala || '').replace(/\D/g,'').includes(ktSearch)) ||
        (c.heimilisfang || '').toLowerCase().includes(search) ||
        (c.simi || '').includes(search) ||
        (c.farsimi || '').includes(search) ||
        (c.netfang || '').toLowerCase().includes(search) ||
        (c.tengiliður || '').toLowerCase().includes(search)
      );
    }

    // Sort
    const collator = new Intl.Collator('is', { sensitivity: 'base' });
    switch (state.sort) {
      case 'nafn-desc':
        result.sort((a, b) => collator.compare(String(b.nafn || ''), String(a.nafn || '')));
        break;
      case 'kt':
        result.sort((a, b) => {
          const ak = String(a.kennitala || '').replace(/\D/g,'');
          const bk = String(b.kennitala || '').replace(/\D/g,'');
          return ak.localeCompare(bk);
        });
        break;
      case 'newest':
        // Higher ID = newer (auto-incremented PK)
        result.sort((a, b) => (+b.id || 0) - (+a.id || 0));
        break;
      case 'units':
        result.sort((a, b) => (b._unitCount - a._unitCount) || collator.compare(String(a.nafn || ''), String(b.nafn || '')));
        break;
      case 'addr':
        result.sort((a, b) => collator.compare(String(a.heimilisfang || ''), String(b.heimilisfang || '')));
        break;
      case 'simi':
        result.sort((a, b) => String(a.simi || a.farsimi || '').localeCompare(String(b.simi || b.farsimi || '')));
        break;
      case 'docs':
        // Fewest docs first (so gaps surface). Nulls (no base match) sort last.
        result.sort((a, b) => ((a._docs ? a._docs.total : 999) - (b._docs ? b._docs.total : 999)) || collator.compare(String(a.nafn || ''), String(b.nafn || '')));
        break;
      case 'nafn':
      default:
        result.sort((a, b) => collator.compare(String(a.nafn || ''), String(b.nafn || '')));
    }
    return result;
  }

  // ── Sidebar ────────────────────────────────────────────────────────────
  function injectSidebar() {
    const nav = document.querySelector('nav.view-nav, .view-nav');
    if (!nav) { setTimeout(injectSidebar, 500); return; }
    if (nav.querySelector('[data-view="' + NAV_KEY + '"]')) return;

    const allBtns = Array.from(nav.querySelectorAll('.vnav-btn'));
    // Insert after the existing Viðskiptavinir nav if we can find it,
    // else after the Ársskoðun (Fyrirtæki í Þjónustu) entry, else end.
    const vidskBtn = allBtns.find(b => /viðskiptavinir/i.test(b.textContent) && b.getAttribute('data-view') !== NAV_KEY);
    const arsBtn = allBtns.find(b => b.getAttribute('data-view') === 'arsskodun');
    const refBtn = vidskBtn || arsBtn || allBtns[allBtns.length - 1];

    const sampleClass = (refBtn && refBtn.className) || 'vnav-btn';
    const btn = document.createElement('button');
    btn.className = sampleClass;
    btn.setAttribute('data-view', NAV_KEY);
    // Match the inline-flex icon+label pattern used by other nav buttons.
    btn.innerHTML = '<span style="display:inline-flex;align-items:center;gap:8px">' +
                    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18">' +
                      '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>' +
                      '<circle cx="9" cy="7" r="4"/>' +
                      '<path d="M23 21v-2a4 4 0 0 0-3-3.87"/>' +
                      '<path d="M16 3.13a4 4 0 0 1 0 7.75"/>' +
                    '</svg>' +
                    '<span>Allir Viðskiptavinir</span></span>';
    btn.addEventListener('click', e => {
      e.preventDefault(); e.stopPropagation();
      if (window.App && App.switchView) App.switchView(NAV_KEY);
      else show();
    });

    if (refBtn && refBtn.parentNode) {
      refBtn.parentNode.insertBefore(btn, refBtn.nextSibling);
    } else {
      nav.appendChild(btn);
    }
  }

  // ── View container ─────────────────────────────────────────────────────
  function ensureView() {
    if (document.getElementById(VIEW_ID)) return;
    const sample = document.getElementById('view-arsskodun') ||
                   document.getElementById('view-counter') ||
                   document.getElementById('view-companies');
    if (!sample || !sample.parentElement) return;
    const v = document.createElement('div');
    v.id = VIEW_ID;
    v.className = sample.className.replace(/\bactive\b/g, '').trim();
    v.innerHTML = '<main id="_av-main" class="main-panel"></main>';
    sample.parentElement.appendChild(v);
  }

  // ── Hook App.switchView ────────────────────────────────────────────────
  function patchSwitchView() {
    if (!window.App || window.App._allirVidskPatched) return;
    const orig = window.App.switchView;
    window.App.switchView = function (view) {
      if (view === NAV_KEY) {
        ensureView();
        document.querySelectorAll('[id^="view-"]').forEach(v => {
          v.style.display = 'none'; v.classList.remove('active');
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
    window.App._allirVidskPatched = true;
  }

  // ── Render ─────────────────────────────────────────────────────────────
  function show() {
    ensureView();
    const main = document.getElementById('_av-main');
    if (!main) { setTimeout(show, 200); return; }
    render(main);
    // Load the document counter once, then refresh so the badges fill in.
    if (!_docLoaded) loadDocStatus().then(() => {
      const m = document.getElementById('_av-main');
      if (m) render(m);
    });
    // Load the bank-only flag set once, then refresh so they drop out of view.
    if (!_bankLoaded) loadBankOnly().then(() => {
      const m = document.getElementById('_av-main');
      if (m) render(m);
    });
  }

  function render(main) {
    // 2026-05-19: preserve search-input focus across debounced re-renders.
    // Typing in #_av-search fires a 200ms timeout that calls main.innerHTML=…
    // which destroys the input. Without this, the user can only type one
    // letter at a time — every keystroke loses focus.
    const prevActive = document.activeElement;
    const keepSearchFocus = !!(prevActive && prevActive.id === '_av-search');
    const selStart = keepSearchFocus ? prevActive.selectionStart : null;
    const selEnd   = keepSearchFocus ? prevActive.selectionEnd   : null;

    const all = getAll();
    const filtered = filterAll(all);

    // Headline counts exclude bank-import-only payers (they get their own chip).
    const nonBank = all.filter(c => !c._bankOnly);
    const cntBank = all.length - nonBank.length;
    const cntAll = nonBank.length;
    const cntArs = nonBank.filter(c => c._hasArs).length;
    const cntBru = nonBank.filter(c => c._hasBru).length;
    const cntFerda = nonBank.filter(c => c._hasFerda).length;
    const cntOne = nonBank.filter(c => !c._hasArs && !c._hasBru && !c._hasFerda).length;

    // Counts for the secondary (xfilter) chips
    const cntWithEmail   = nonBank.filter(c => !!c.netfang).length;
    const cntWithGps     = nonBank.filter(c => c._hasGps).length;
    const cntNoAddress   = nonBank.filter(c => !c.heimilisfang).length;
    const cntWithUnits   = nonBank.filter(c => c._unitCount > 0).length;
    const cntInService   = nonBank.filter(c => c._hasArs || c._hasBru).length;
    const cntNoEmail     = cntAll - cntWithEmail;
    const cntReview      = nonBank.filter(c => !!c.review_flag).length;
    const cntMissingDocs = nonBank.filter(c => !c._docs || c._docs.total === 0).length;

    // theme.css (2026-07-09): viewið flush svo .thm .app-page bandið eigi útlitið.
    if (!document.getElementById('av-thm-style')) {
      const _st = document.createElement('style');
      _st.id = 'av-thm-style';
      _st.textContent = '#view-allir-vidsk{padding:0 !important;max-width:none !important}';
      document.head.appendChild(_st);
    }
    main.innerHTML = `
      <div class="thm"><div class="app-page"><main class="app-main" style="font-family:'IBM Plex Sans',-apple-system,'Segoe UI',sans-serif;color:#11141c">

        <div class="page-title">
          <div class="page-title__lead">
            <span class="page-title__icon">👥</span>
            <div>
              <h1>Allir Viðskiptavinir</h1>
              <p>
                <span style="font-family:'JetBrains Mono',ui-monospace,monospace;color:#fff;font-weight:700">${cntAll}</span> fyrirtæki ·
                <span style="color:#fca5a5"><span style="font-family:'JetBrains Mono',ui-monospace,monospace;font-weight:700">${cntArs}</span> í fyrirtækjaþjónustu</span> ·
                <span style="color:#93c5fd"><span style="font-family:'JetBrains Mono',ui-monospace,monospace;font-weight:700">${cntBru}</span> í brunakerfi</span> ·
                <span style="color:#7dd3fc"><span style="font-family:'JetBrains Mono',ui-monospace,monospace;font-weight:700">${cntFerda}</span> í ferðaþjónustu</span> ·
                <span style="font-family:'JetBrains Mono',ui-monospace,monospace;color:#fff;font-weight:700">${cntOne}</span> án samnings
              </p>
            </div>
          </div>
          <div class="page-title__tools">
            <input id="_av-search" type="text" placeholder="🔍 Leita..." value="${esc(state.search)}"
                   style="height:38px;padding:0 14px;border:1px solid rgba(0,0,0,.35);border-radius:10px;font:inherit;font-size:13.5px;width:280px;background:#fff;color:#141822;outline:none;box-shadow:inset 0 1px 3px rgba(0,0,0,.15)">
          </div>
        </div>

        <!-- Summary cards — spec §5 stat tiles -->
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px;margin-bottom:18px">
          <div style="background:#fff;border:1px solid rgba(20,24,34,.08);border-radius:14px;padding:16px 18px;box-shadow:0 8px 22px -16px rgba(25,35,60,.18)">
            <div style="font-size:10.5px;font-weight:700;color:#8a93a5;letter-spacing:.14em">FJÖLDI</div>
            <div style="font-family:'JetBrains Mono',ui-monospace,monospace;font-size:30px;font-weight:700;color:#11141c;margin-top:4px">${cntAll}</div>
            <div style="font-size:11.5px;color:#9098a6;margin-top:3px">viðskiptavinir</div>
          </div>
          <div style="background:linear-gradient(180deg,#eaf7ef,#fff);border:1px solid #a7f3d0;border-radius:14px;padding:16px 18px;box-shadow:0 8px 22px -16px rgba(25,35,60,.18)">
            <div style="font-size:10.5px;font-weight:700;color:#047857;letter-spacing:.14em">Í ÞJÓNUSTU</div>
            <div style="font-family:'JetBrains Mono',ui-monospace,monospace;font-size:30px;font-weight:700;color:#1f9d57;margin-top:4px">${cntInService}</div>
            <div style="font-size:11.5px;color:#5b6472;margin-top:3px">${cntArs} fyrirtækjaþj. · ${cntBru} brunakerfi</div>
          </div>
          <div style="background:#fff;border:1px solid rgba(20,24,34,.08);border-radius:14px;padding:16px 18px;box-shadow:0 8px 22px -16px rgba(25,35,60,.18)">
            <div style="font-size:10.5px;font-weight:700;color:#8a93a5;letter-spacing:.14em">MEÐ TÆKI</div>
            <div style="font-family:'JetBrains Mono',ui-monospace,monospace;font-size:30px;font-weight:700;color:#11141c;margin-top:4px">${cntWithUnits}</div>
            <div style="font-size:11.5px;color:#9098a6;margin-top:3px">skráð slökkvitæki</div>
          </div>
          <div style="background:linear-gradient(180deg,#fff7e6,#fff);border:1px solid #fde68a;border-radius:14px;padding:16px 18px;box-shadow:0 8px 22px -16px rgba(25,35,60,.18)">
            <div style="font-size:10.5px;font-weight:700;color:#b45309;letter-spacing:.14em">ÁN NETFANGS</div>
            <div style="font-family:'JetBrains Mono',ui-monospace,monospace;font-size:30px;font-weight:700;color:#c77a16;margin-top:4px">${cntNoEmail}</div>
            <div style="font-size:11.5px;color:#9098a6;margin-top:3px">vantar tölvupóst</div>
          </div>
        </div>

        <!-- Toolbar: view toggle + sort -->
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:14px">
          <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
            <div style="display:inline-flex;border:1px solid rgba(20,24,34,.14);border-radius:11px;overflow:hidden;background:#fff;padding:3px;gap:3px">
              <button data-view-mode="card" class="_av-vm" type="button" style="padding:7px 14px;background:${state.view==='card'?'linear-gradient(145deg,#08080a 0%,#26262c 26%,#3a3a41 50%,#19191d 74%,#070709 100%)':'transparent'};color:${state.view==='card'?'#fff':'#3a4250'};border:none;border-radius:9px;cursor:pointer;font:inherit;font-size:12.5px;font-weight:600;display:flex;align-items:center;gap:5px">▦ Kort</button>
              <button data-view-mode="list" class="_av-vm" type="button" style="padding:7px 14px;background:${state.view==='list'?'linear-gradient(145deg,#08080a 0%,#26262c 26%,#3a3a41 50%,#19191d 74%,#070709 100%)':'transparent'};color:${state.view==='list'?'#fff':'#3a4250'};border:none;border-radius:9px;cursor:pointer;font:inherit;font-size:12.5px;font-weight:600;display:flex;align-items:center;gap:5px">☰ Listi</button>
            </div>
            <button id="_av-new-cust" type="button" style="padding:8px 16px;height:38px;background:linear-gradient(150deg,#2bbf6c,#0f6e3a);color:#fff;border:1px solid #156e3a;border-radius:11px;cursor:pointer;font:inherit;font-size:12.5px;font-weight:700;box-shadow:inset 0 1px 0 rgba(255,255,255,.25);display:flex;align-items:center;gap:5px">+ Nýr viðskiptavinur</button>
          </div>
          ${state.view === 'list' ? '<div style="font-family:\'JetBrains Mono\',ui-monospace,monospace;font-size:11px;color:#9098a6">Smelltu á dálkahaus til að raða</div>' : ''}
        </div>

        <!-- Primary service filter chips -->
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px;align-items:center">
          ${[
            ['all',    'Allir',                  cntAll],
            ['fyrirt', '🔥 Fyrirtækjaþjónusta',  cntArs],
            ['brunak', '🚨 Brunakerfi',          cntBru],
            ['ferda',  '🚌 Ferðaþjónusta',       cntFerda],
            ['onei',   'Án samnings',            cntOne]
          ].concat(cntBank ? [['bank', '🏦 Greiðendur (bank)', cntBank]] : []).map(([key, lbl, n]) => {
            const sel = state.filter === key;
            const inactive = 'background:linear-gradient(180deg,#fdfdfe,#e3e7ee);border:1px solid rgba(20,24,34,.14);color:#3a4250';
            const active   = 'background:linear-gradient(145deg,#08080a 0%,#26262c 26%,#3a3a41 50%,#19191d 74%,#070709 100%);color:#fff;border:1px solid #0a0b0d';
            return `<button data-filter="${key}" class="_av-ft" style="padding:7px 14px;${sel?active:inactive};border-radius:10px;cursor:pointer;font:inherit;font-size:12.5px;font-weight:600">${lbl} <span style="font-family:'JetBrains Mono',ui-monospace,monospace;opacity:.7;font-weight:700">${n}</span></button>`;
          }).join('')}
        </div>

        <!-- Secondary filter chips (xfilter — AND'd with primary) -->
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:16px;align-items:center">
          <span style="font-size:10.5px;font-weight:700;color:#8a93a5;letter-spacing:.12em;padding-right:4px">SÍA:</span>
          ${[
            ['review',     '⚑ Til skoðunar',  cntReview],
            ['missing-docs','📄 Vantar skjöl', cntMissingDocs],
            ['has-email',  '✉️ Netfang',      cntWithEmail],
            ['has-gps',    '📍 GPS staðsetning', cntWithGps],
            ['has-units',  '🧯 Hefur tæki',   cntWithUnits],
            ['no-address', '❌ Vantar heimilisfang', cntNoAddress]
          ].map(([key, lbl, n]) => {
            const sel = state.xfilter.includes(key);
            const inactive = 'background:#fff;border:1px solid rgba(20,24,34,.14);color:#5b6472';
            const active   = 'background:#eef3ff;border:1px solid #c6d6ff;color:#2f5fe0;font-weight:700';
            return `<button data-xfilter="${key}" class="_av-xft" style="padding:5px 11px;${sel?active:inactive};border-radius:8px;cursor:pointer;font:inherit;font-size:11.5px;font-weight:600">${lbl} <span style="font-family:'JetBrains Mono',ui-monospace,monospace;opacity:.7">${n}</span></button>`;
          }).join('')}
          ${state.xfilter.length ? `<button id="_av-clear-x" type="button" style="padding:5px 11px;border:none;background:none;color:#c0241f;cursor:pointer;font:inherit;font-size:11.5px;font-weight:600">Hreinsa síu ✕</button>` : ''}
          <button id="_av-selmode" type="button" style="margin-left:auto;padding:6px 13px;border:1px solid ${state.selectMode?'#0a0b0d':'rgba(20,24,34,.14)'};background:${state.selectMode?'linear-gradient(145deg,#08080a 0%,#26262c 26%,#3a3a41 50%,#19191d 74%,#070709 100%)':'#fff'};color:${state.selectMode?'#fff':'#3a4250'};border-radius:9px;cursor:pointer;font:inherit;font-size:11.5px;font-weight:700">☑︎ ${state.selectMode?'Hætta vali':'Velja margar'}</button>
        </div>

        ${state.selectMode ? `
        <!-- Bulk action bar -->
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:14px;padding:12px 14px;background:#eef3ff;border:1px solid #c6d6ff;border-radius:12px">
          <span style="font-family:'JetBrains Mono',ui-monospace,monospace;font-weight:700;color:#2f5fe0;font-size:13px">${state.selected.size} valdir</span>
          <button id="_av-sel-clear" type="button" style="padding:6px 12px;border:1px solid rgba(20,24,34,.14);background:#fff;border-radius:9px;cursor:pointer;font:inherit;font-size:12px;color:#3a4250">Hreinsa val</button>
          <div style="flex:1;min-width:0"></div>
          <button id="_av-bulk-merge" type="button" ${state.selected.size === 2 ? '' : 'disabled'} title="Sameina tvö fyrirtæki sem eru sama viðskiptavinurinn (færir tæki + skjöl yfir á það sem heldur; hitt fer í geymslu). Veldu nákvæmlega 2." style="padding:6px 12px;border:1px solid #ddd6fe;background:#f5f3ff;color:#6d28d9;border-radius:9px;cursor:pointer;font:inherit;font-size:12px;font-weight:700${state.selected.size === 2 ? '' : ';opacity:.5'}">🔗 Sameina ${state.selected.size === 2 ? 'tvö' : '(veldu 2)'}</button>
          <button id="_av-bulk-ferda" type="button" ${state.selected.size?'':'disabled'} style="padding:6px 12px;border:1px solid #bae6fd;background:#e0f2fe;color:#0369a1;border-radius:9px;cursor:pointer;font:inherit;font-size:12px;font-weight:700${state.selected.size?'':';opacity:.5'}">🚌 Merkja Ferðaþjónustu</button>
          <button id="_av-bulk-archive" type="button" ${state.selected.size?'':'disabled'} title="Mjúk geymsla (deleted_at). Sleppir þeim sem hafa samning/skjöl." style="padding:6px 12px;border:1px solid #fde68a;background:#fffbeb;color:#b45309;border-radius:9px;cursor:pointer;font:inherit;font-size:12px;font-weight:700${state.selected.size?'':';opacity:.5'}">📦 Geyma (mjúkt)</button>
        </div>` : ''}

        ${filtered.length === 0 ? `
          <div style="background:#fff;border:1px dashed rgba(20,24,34,.12);border-radius:14px;padding:44px;text-align:center;color:#5b6472">
            <div style="font-size:30px;margin-bottom:8px">🔍</div>
            <div style="font-size:14px;font-weight:600;color:#11141c;margin-bottom:3px">Engir viðskiptavinir passa við þessa síu</div>
            <div style="font-size:12px;color:#8a93a5">Reyndu að breyta sía eða leitarstreng.</div>
          </div>
        ` : (state.view === 'list' ? renderList(filtered) : renderCards(filtered))}

        <div style="margin-top:20px;font-family:'JetBrains Mono',ui-monospace,monospace;font-size:11px;color:#9098a6;text-align:center">
          Sýni <strong style="color:#11141c">${filtered.length}</strong> af ${state.filter === 'bank' ? cntBank : cntAll} viðskiptavinum${cntBank && state.filter !== 'bank' ? ` · ${cntBank} bank-greiðendur faldir` : ''}
        </div>
      </main></div></div>
    `;

    // Wire
    main.querySelectorAll('._av-ft').forEach(b => b.addEventListener('click', () => {
      state.filter = b.dataset.filter; saveState(); render(main);
    }));
    main.querySelectorAll('._av-vm').forEach(b => b.addEventListener('click', () => {
      state.view = b.dataset.viewMode; saveState(); render(main);
    }));
    // Sort by clicking a table column header (list view). Nafn toggles A→Ö / Ö→A.
    main.querySelectorAll('th[data-sort]').forEach(th => th.addEventListener('click', () => {
      const k = th.dataset.sort;
      state.sort = (k === 'nafn') ? (state.sort === 'nafn' ? 'nafn-desc' : 'nafn') : k;
      saveState(); render(main);
    }));
    main.querySelectorAll('._av-xft').forEach(b => b.addEventListener('click', () => {
      const key = b.dataset.xfilter;
      const idx = state.xfilter.indexOf(key);
      if (idx >= 0) state.xfilter.splice(idx, 1);
      else state.xfilter.push(key);
      saveState(); render(main);
    }));
    main.querySelector('#_av-clear-x')?.addEventListener('click', () => {
      state.xfilter = []; saveState(); render(main);
    });
    // + Nýr viðskiptavinur — this list renders from Companies.list (the
    // `fyrirtaeki` table), so it MUST create the record there. The old POS
    // quick-add (_upsOpenNewCustomer) inserted into `vidskiptavinir` instead,
    // a table this list never reads — so new companies saved but "vanished".
    // Use the canonical company modal (Companies.openNew → fyrirtaeki) and
    // re-render when it closes so the new row appears immediately.
    main.querySelector('#_av-new-cust')?.addEventListener('click', () => {
      const reRender = () => { const m = document.getElementById('_av-main'); if (m) render(m); };
      if (window.Companies && typeof Companies.openNew === 'function') {
        Companies.openNew();
        const modal = document.getElementById('modal-nyfyrirtaeki');
        if (!modal) { reRender(); return; }
        if (window.__avNewCustWatch) { window.__avNewCustWatch.disconnect(); window.__avNewCustWatch = null; }
        // Modal.open adds the `open` class; Modal.close removes it. Re-render
        // once it's gone (covers both save and cancel).
        const watch = new MutationObserver(() => {
          if (!modal.classList.contains('open')) {
            watch.disconnect();
            if (window.__avNewCustWatch === watch) window.__avNewCustWatch = null;
            reRender();
          }
        });
        window.__avNewCustWatch = watch;
        watch.observe(modal, { attributes: true, attributeFilter: ['class'] });
        return;
      }
      // Fallback: if Companies isn't ready, fall back to the shared quick-add.
      if (typeof window._upsOpenNewCustomer === 'function') {
        window._upsOpenNewCustomer('', '');
        if (window.__avNewCustWatch) { window.__avNewCustWatch.disconnect(); window.__avNewCustWatch = null; }
        const watch = new MutationObserver(() => {
          if (!document.getElementById('_ups-newdlg')) {
            watch.disconnect();
            if (window.__avNewCustWatch === watch) window.__avNewCustWatch = null;
            reRender();
          }
        });
        window.__avNewCustWatch = watch;
        watch.observe(document.body, { childList: true });
      } else if (window.Toast && Toast.show) {
        Toast.show('Stofnunargluggi ekki tiltækur');
      }
    });
    let _searchTimer = null;
    main.querySelector('#_av-search')?.addEventListener('input', e => {
      clearTimeout(_searchTimer);
      _searchTimer = setTimeout(() => { state.search = e.target.value; saveState(); render(main); }, 200);
    });
    main.querySelectorAll('._av-card, ._av-row').forEach(el => {
      el.addEventListener('click', e => {
        if (e.target.closest('button, a')) return;
        const id = +el.dataset.coId;
        if (id) openDetail(id);
      });
    });
    // Subscribe/unsubscribe buttons — stop card-click propagation so we
    // don't accidentally open the detail at the same time.
    main.querySelectorAll('._av-toggle').forEach(b => {
      b.addEventListener('click', e => {
        e.stopPropagation();
        e.preventDefault();
        const coId = +b.dataset.coId;
        const svc = b.dataset.svc;
        const action = b.dataset.action;
        toggleService(coId, svc, action);
      });
    });
    main.querySelectorAll('._av-flag').forEach(b => {
      b.addEventListener('click', e => { e.stopPropagation(); e.preventDefault(); toggleReview(+b.dataset.coId); });
    });
    // Bulk select mode
    main.querySelector('#_av-selmode')?.addEventListener('click', () => {
      state.selectMode = !state.selectMode;
      if (!state.selectMode) state.selected.clear();
      render(main);
    });
    main.querySelector('#_av-sel-clear')?.addEventListener('click', () => { state.selected.clear(); render(main); });
    main.querySelectorAll('._av-sel').forEach(cb => {
      cb.addEventListener('change', e => {
        e.stopPropagation();
        const id = +cb.dataset.coId;
        if (cb.checked) state.selected.add(id); else state.selected.delete(id);
        render(main);
      });
    });
    main.querySelector('#_av-bulk-ferda')?.addEventListener('click', () => bulkTagFerda());
    main.querySelector('#_av-bulk-archive')?.addEventListener('click', () => bulkArchive());
    main.querySelector('#_av-bulk-merge')?.addEventListener('click', () => {
      const ids = Array.from(state.selected);
      if (ids.length === 2) openMergeModal(ids[0], ids[1]);
    });

    // Inline edit (kt / heimilisfang / sími)
    main.querySelectorAll('._av-edit').forEach(b => {
      b.addEventListener('click', e => { e.stopPropagation(); e.preventDefault(); state.editId = +b.dataset.coId; render(main); });
    });
    main.querySelectorAll('._av-ecancel').forEach(b => {
      b.addEventListener('click', e => { e.stopPropagation(); e.preventDefault(); state.editId = null; render(main); });
    });
    main.querySelectorAll('._av-esave').forEach(b => {
      b.addEventListener('click', e => {
        e.stopPropagation(); e.preventDefault();
        const row = b.closest('._av-row'); if (!row) return;
        const vals = {};
        row.querySelectorAll('._av-ei').forEach(inp => { vals[inp.dataset.k] = inp.value.trim(); });
        saveEdit(+b.dataset.coId, vals);
      });
    });

    // Restore search-input focus + cursor position (see top of render()).
    if (keepSearchFocus) {
      const fresh = main.querySelector('#_av-search');
      if (fresh) {
        fresh.focus();
        try {
          fresh.setSelectionRange(selStart ?? fresh.value.length, selEnd ?? fresh.value.length);
        } catch (_) { /* type=text always allows setSelectionRange */ }
      }
    }
  }

  function renderCards(arr) {
    return `
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(310px,1fr));gap:11px">
        ${arr.map(c => {
          // Service toggle buttons — click to subscribe / unsubscribe.
          // When subscribed: red/blue filled chip with × icon (click to remove).
          // When not subscribed: outlined chip with + icon (click to add).
          const arsBtn = c._hasArs
            ? `<button class="_av-toggle" data-co-id="${c.id}" data-svc="ars" data-action="remove" type="button" title="Fjarlægja úr fyrirtækjaþjónustu" style="background:#fee2e2;color:#b91c1c;font-size:10px;font-weight:700;padding:3px 8px;border-radius:99px;border:1px solid #fecaca;cursor:pointer;font-family:inherit">🔥 Fyrirtækjaþj. <span style="opacity:.6;margin-left:2px">✕</span></button>`
            : `<button class="_av-toggle" data-co-id="${c.id}" data-svc="ars" data-action="add" type="button" title="Skrá í fyrirtækjaþjónustu" style="background:#fff;color:#94a3b8;font-size:10px;font-weight:600;padding:3px 8px;border-radius:99px;border:1px dashed #cbd5e1;cursor:pointer;font-family:inherit">🔥 + Fyrirtækjaþj.</button>`;

          const bruBtn = c._hasBru
            ? `<button class="_av-toggle" data-co-id="${c.id}" data-svc="bru" data-action="remove" type="button" title="Fjarlægja úr brunakerfi" style="background:#dbeafe;color:#1d4ed8;font-size:10px;font-weight:700;padding:3px 8px;border-radius:99px;border:1px solid #93c5fd;cursor:pointer;font-family:inherit">🚨 Brunakerfi <span style="opacity:.6;margin-left:2px">✕</span></button>`
            : `<button class="_av-toggle" data-co-id="${c.id}" data-svc="bru" data-action="add" type="button" title="Skrá í brunakerfi" style="background:#fff;color:#94a3b8;font-size:10px;font-weight:600;padding:3px 8px;border-radius:99px;border:1px dashed #cbd5e1;cursor:pointer;font-family:inherit">🚨 + Brunakerfi</button>`;

          const ferdaBtn = c._hasFerda
            ? `<button class="_av-toggle" data-co-id="${c.id}" data-svc="ferda" data-action="remove" type="button" title="Fjarlægja úr ferðaþjónustu" style="background:#e0f2fe;color:#0369a1;font-size:10px;font-weight:700;padding:3px 8px;border-radius:99px;border:1px solid #7dd3fc;cursor:pointer;font-family:inherit">🚌 Ferðaþj. <span style="opacity:.6;margin-left:2px">✕</span></button>`
            : `<button class="_av-toggle" data-co-id="${c.id}" data-svc="ferda" data-action="add" type="button" title="Skrá í ferðaþjónustu" style="background:#fff;color:#94a3b8;font-size:10px;font-weight:600;padding:3px 8px;border-radius:99px;border:1px dashed #cbd5e1;cursor:pointer;font-family:inherit">🚌 + Ferðaþj.</button>`;

          return `
            <div class="_av-card" data-co-id="${c.id}" style="background:#fff;border:1px solid #e2e8f0;border-radius:11px;padding:12px 14px;display:flex;flex-direction:column;gap:7px;box-shadow:0 1px 2px rgba(0,0,0,0.03);cursor:pointer;transition:all .15s" onmouseover="this.style.borderColor='#94a3b8';this.style.boxShadow='0 2px 8px rgba(0,0,0,0.06)'" onmouseout="this.style.borderColor='#e2e8f0';this.style.boxShadow='0 1px 2px rgba(0,0,0,0.03)'">
              <div style="min-width:0">
                <div style="font-weight:700;color:#0f172a;font-size:14px;line-height:1.25">${esc(c.nafn || '—')}</div>
                ${c.kennitala ? `<div style="font-size:11px;color:#94a3b8;font-family:monospace;margin-top:1px">kt. ${esc(fmtKt(c.kennitala))}</div>` : ''}
              </div>
              <div style="display:flex;flex-direction:column;gap:2px;font-size:11px;color:#64748b">
                ${c.heimilisfang ? `<div>📍 ${esc(c.heimilisfang)}</div>` : ''}
                ${c.simi || c.farsimi ? `<div>📞 ${esc(c.simi || c.farsimi)}</div>` : ''}
                ${c.netfang ? `<div style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">✉️ ${esc(c.netfang)}</div>` : ''}
                ${c.tengiliður ? `<div>👤 ${esc(c.tengiliður)}</div>` : ''}
              </div>
              <div style="display:flex;gap:4px;flex-wrap:wrap;margin-top:2px">${arsBtn}${bruBtn}${ferdaBtn}</div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  // ── List (table) view — compact alternative to cards ───────────────────
  function renderList(arr) {
    // Spec §4 table recipe — sticky header on tinted #eef1f6, mono numbers, surface card.
    const headerStyle = 'text-align:left;padding:11px 14px;font-size:10px;font-weight:700;color:#8a93a5;letter-spacing:.08em;text-transform:uppercase;white-space:nowrap';
    // Clickable sort headers. Arrow shows the active column/direction.
    const arrow = key => key === 'nafn' ? (state.sort === 'nafn' ? ' ▲' : state.sort === 'nafn-desc' ? ' ▼' : '')
                       : (state.sort === key ? ' ▲' : '');
    const sortTh = (label, key, extra) => `<th data-sort="${key}" title="Raða eftir ${esc(label)}" style="${headerStyle}${extra || ''};cursor:pointer;user-select:none">${esc(label)}<span style="color:#2f5fe0">${arrow(key)}</span></th>`;
    const cellStyle = 'padding:12px 14px;font-size:13px;color:#3a4250;vertical-align:middle;border-bottom:1px solid rgba(20,24,34,.05)';

    return `
      <div style="background:#fff;border:1px solid rgba(20,24,34,.08);border-radius:16px;overflow:hidden;box-shadow:0 10px 28px -16px rgba(25,35,60,.16)">
        <div style="overflow-x:auto">
          <table style="width:100%;min-width:960px;border-collapse:collapse;font:inherit">
            <thead style="position:sticky;top:0;z-index:2">
              <tr style="background:#eef1f6;box-shadow:0 1px 0 rgba(20,24,34,.1)">
                ${sortTh('Nafn', 'nafn')}
                ${sortTh('Kennitala', 'kt')}
                ${sortTh('Heimilisfang', 'addr')}
                ${sortTh('Sími', 'simi')}
                ${sortTh('Tæki', 'units', ';text-align:center')}
                <th style="${headerStyle}">Þjónusta</th>
                ${sortTh('📄 Skjöl', 'docs')}
                <th style="${headerStyle};text-align:right;width:90px">Aðgerð</th>
              </tr>
            </thead>
            <tbody>
              ${arr.map(c => {
                const badges = [];
                if (c._hasArs) badges.push('<span style="background:#fdecec;color:#c0241f;font-size:10.5px;font-weight:600;padding:3px 8px;border-radius:7px;border:1px solid #f3c6c4">🔥</span>');
                if (c._hasBru) badges.push('<span style="background:#eef3ff;color:#2f5fe0;font-size:10.5px;font-weight:600;padding:3px 8px;border-radius:7px;border:1px solid #c6d6ff">🚨</span>');
                if (c._hasFerda) badges.push('<span style="background:#e0f2fe;color:#0369a1;font-size:10.5px;font-weight:600;padding:3px 8px;border-radius:7px;border:1px solid #bae6fd">🚌</span>');
                if (!c._hasArs && !c._hasBru && !c._hasFerda) badges.push('<span style="background:#f1f5f9;color:#8a93a5;font-size:10.5px;font-weight:600;padding:3px 8px;border-radius:7px;border:1px solid #e2e8f0">—</span>');
                const editing = state.editId === c.id;
                const eInput = (k, v) => `<input class="_av-ei" data-k="${k}" value="${esc(v == null ? '' : v)}" onclick="event.stopPropagation()" style="width:100%;box-sizing:border-box;padding:3px 5px;border:1px solid #93c5fd;border-radius:5px;font:inherit;font-size:11.5px">`;
                return `
                  <tr class="_av-row" data-co-id="${c.id}" style="cursor:pointer;transition:background .12s" onmouseover="this.style.background='#f3f6fc'" onmouseout="this.style.background='transparent'">
                    <td style="${cellStyle}"><div style="font-size:13.5px;font-weight:600;color:#11141c">${state.selectMode ? `<input type="checkbox" class="_av-sel" data-co-id="${c.id}" ${state.selected.has(c.id) ? 'checked' : ''} onclick="event.stopPropagation()" style="margin-right:6px;width:15px;height:15px;vertical-align:middle">` : ''}${c.review_flag ? '<span title="' + esc(c.review_note || 'Til skoðunar') + '" style="color:#c77a16;margin-right:4px">⚑</span>' : ''}${esc(c.nafn || '—')}</div>${c.review_flag && c.review_note ? '<div style="font-weight:500;font-size:10.5px;color:#b45309;max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-top:1px">' + esc(c.review_note) + '</div>' : ''}</td>
                    <td style="${cellStyle};font-family:'JetBrains Mono',ui-monospace,monospace;color:${c.kennitala?'#5b6472':'#cbd2dc'};font-size:11px">${editing ? eInput('kennitala', c.kennitala) : (esc(fmtKt(c.kennitala) || '—'))}</td>
                    <td style="${cellStyle};color:#3a4250;max-width:240px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${esc(c.heimilisfang || '')}">${editing ? eInput('heimilisfang', c.heimilisfang) : (esc(c.heimilisfang || '—'))}</td>
                    <td style="${cellStyle};color:#3a4250;font-family:'JetBrains Mono',ui-monospace,monospace;font-size:11.5px">${editing ? eInput('simi', c.simi) : (esc(c.simi || c.farsimi || '—'))}</td>
                    <td style="${cellStyle};text-align:center;font-family:'JetBrains Mono',ui-monospace,monospace;font-size:13px;font-weight:700;color:${c._unitCount>0?'#11141c':'#cbd2dc'}">${c._unitCount || '·'}</td>
                    <td style="${cellStyle}"><div style="display:flex;gap:4px">${badges.join('')}</div></td>
                    <td style="${cellStyle}">${docBadge(c)}</td>
                    <td style="${cellStyle};text-align:right;white-space:nowrap">
                      ${editing ? `
                      <button class="_av-esave" data-co-id="${c.id}" type="button" title="Vista breytingar" style="padding:3px 9px;border:1px solid #86efac;background:#16a34a;color:#fff;border-radius:6px;cursor:pointer;font:inherit;font-size:10.5px;font-weight:700">✓ Vista</button>
                      <button class="_av-ecancel" type="button" title="Hætta við" style="padding:3px 7px;border:1px solid #cbd5e1;background:#fff;color:#64748b;border-radius:6px;cursor:pointer;font:inherit;font-size:10.5px;font-weight:700">✕</button>
                      ` : `
                      <button class="_av-edit" data-co-id="${c.id}" type="button" title="Breyta kt / heimilisfangi / síma" style="padding:3px 7px;border:1px dashed #cbd5e1;background:#fff;color:#94a3b8;border-radius:6px;cursor:pointer;font:inherit;font-size:10.5px;font-weight:700">✏</button>
                      <button class="_av-flag" data-co-id="${c.id}" type="button" title="${c.review_flag?'Afmerkja (til skoðunar)':'Merkja til skoðunar + nóta'}" style="padding:3px 7px;border:1px ${c.review_flag?'solid #fcd34d':'dashed #cbd5e1'};background:${c.review_flag?'#fef3c7':'#fff'};color:${c.review_flag?'#b45309':'#94a3b8'};border-radius:6px;cursor:pointer;font:inherit;font-size:10.5px;font-weight:700">⚑</button>
                      <button class="_av-toggle" data-co-id="${c.id}" data-svc="ars" data-action="${c._hasArs?'remove':'add'}" type="button" title="${c._hasArs?'Fjarlægja úr fyrirtækjaþj.':'Skrá í fyrirtækjaþjónustu'}" style="padding:3px 7px;border:1px ${c._hasArs?'solid #fecaca':'dashed #cbd5e1'};background:${c._hasArs?'#fee2e2':'#fff'};color:${c._hasArs?'#b91c1c':'#94a3b8'};border-radius:6px;cursor:pointer;font:inherit;font-size:10.5px;font-weight:700">🔥</button>
                      <button class="_av-toggle" data-co-id="${c.id}" data-svc="bru" data-action="${c._hasBru?'remove':'add'}" type="button" title="${c._hasBru?'Fjarlægja úr brunakerfi':'Skrá í brunakerfi'}" style="padding:3px 7px;border:1px ${c._hasBru?'solid #93c5fd':'dashed #cbd5e1'};background:${c._hasBru?'#dbeafe':'#fff'};color:${c._hasBru?'#1d4ed8':'#94a3b8'};border-radius:6px;cursor:pointer;font:inherit;font-size:10.5px;font-weight:700">🚨</button>
                      <button class="_av-toggle" data-co-id="${c.id}" data-svc="ferda" data-action="${c._hasFerda?'remove':'add'}" type="button" title="${c._hasFerda?'Fjarlægja úr ferðaþjónustu':'Skrá í ferðaþjónustu'}" style="padding:3px 7px;border:1px ${c._hasFerda?'solid #7dd3fc':'dashed #cbd5e1'};background:${c._hasFerda?'#e0f2fe':'#fff'};color:${c._hasFerda?'#0369a1':'#94a3b8'};border-radius:6px;cursor:pointer;font:inherit;font-size:10.5px;font-weight:700">🚌</button>
                      `}
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

  // ── Subscribe / unsubscribe — write to AppSettings ─────────────────────
  // Uses the same storage keys + structure as patches 153 (arsskodun) and
  // 147 (brunakerfi). Minimal entry on add — user can fill details in the
  // service workspace afterwards. Remove deletes the key entirely so the
  // customer drops out of the service workspace.
  // ⚑ Flag-for-review + per-row note. Persists to fyrirtaeki.review_flag/
  // review_note (additive cols) and updates the in-memory Companies.list so the
  // marker shows immediately. The note is kept even when un-flagged, so
  // re-flagging remembers it.
  async function toggleReview(coId) {
    const SB = (window.DB && window.DB.sb);
    const company = (window.Companies && Companies.list || []).find(c => +c.id === +coId);
    if (!company) return;
    const turningOn = !company.review_flag;
    if (turningOn) {
      const inp = prompt('Til skoðunar — ástæða / nóta (valfrjálst):', company.review_note || '');
      if (inp === null) return; // cancelled
      company.review_note = inp.trim();
    }
    company.review_flag = turningOn;
    if (SB) {
      try {
        await SB.from('fyrirtaeki')
          .update({ review_flag: turningOn, review_note: company.review_note || null })
          .eq('id', coId);
      } catch (e) { if (window.Toast && Toast.show) Toast.show('Náði ekki að vista: ' + (e.message || e)); }
    }
    const main = document.getElementById('_av-main'); if (main) render(main);
  }

  // Bulk soft-archive (deleted_at) for the selected rows. Guardrail: NEVER
  // archive a customer that has a samningur or any document on file, and never
  // hard-delete. Skipped rows are reported so nothing silently disappears.
  async function bulkArchive() {
    const SB = (window.DB && window.DB.sb);
    const ids = Array.from(state.selected);
    if (!ids.length) return;
    const list = (window.Companies && Companies.list) || [];
    const byId = new Map(list.map(c => [+c.id, c]));
    const protectedIds = [], doIds = [];
    ids.forEach(id => {
      const c = byId.get(+id);
      const docs = c && docsFor(c);
      // protect anyone with a samningur or any document on file
      if (docs && (docs.samningur || docs.total > 0)) protectedIds.push(id);
      else doIds.push(id);
    });
    let msg = `Geyma (mjúkt) ${doIds.length} viðskiptavin${doIds.length === 1 ? '' : 'i'}? Þeir hverfa úr listanum en er hægt að endurheimta.`;
    if (protectedIds.length) msg += `\n\n⚠ ${protectedIds.length} sleppt — hafa samning/skjöl (má ekki geyma).`;
    if (!doIds.length) { alert('Engir valdir mega fara í geymslu — allir hafa samning/skjöl.'); return; }
    if (!confirm(msg)) return;
    let ok = 0, err = 0;
    for (const id of doIds) {
      try {
        const r = await SB.from('fyrirtaeki').update({ deleted_at: new Date().toISOString() }).eq('id', id);
        if (r.error) throw r.error;
        ok++;
        const idx = list.findIndex(c => +c.id === +id);
        if (idx >= 0) list.splice(idx, 1); // drop from the live cache
        state.selected.delete(id);
      } catch (e) { err++; console.warn('[allir-vidsk] archive failed', id, e); }
    }
    if (window.Toast && Toast.show) Toast.show(`📦 ${ok} sett í geymslu${err ? ' · ' + err + ' mistókust' : ''}${protectedIds.length ? ' · ' + protectedIds.length + ' vernduð' : ''}`);
    if (!state.selected.size) state.selectMode = false;
    const main = document.getElementById('_av-main'); if (main) render(main);
  }

  // ── Merge two duplicate companies ──────────────────────────────────────
  // The owner picks two rows that are the SAME customer; this folds the loser
  // into the keeper: equipment (uttaeki/lanstaeki, keyed by client NAME) and
  // name-based history move to the keeper's name, documents/beiðnir move to the
  // keeper's base id, the keeper's empty fields are filled from the loser, the
  // service marks move over, and the loser is soft-archived (deleted_at) with a
  // note — recoverable, nothing hard-deleted.
  function openMergeModal(idA, idB) {
    const list = (window.Companies && Companies.list) || [];
    const a = list.find(c => +c.id === +idA), b = list.find(c => +c.id === +idB);
    if (!a || !b) { if (window.Toast && Toast.show) Toast.show('Fann ekki bæði fyrirtækin'); return; }
    // Default keeper = more units, then more complete, then lower id (older).
    const score = c => (c._unitCount || 0) * 100 + ['kennitala','netfang','heimilisfang','simi','customer_base_id'].filter(k => c[k]).length;
    let keeperId = (score(a) > score(b)) ? a.id : (score(b) > score(a)) ? b.id : Math.min(a.id, b.id);

    document.getElementById('_av-merge')?.remove();
    const m = document.createElement('div');
    m.id = '_av-merge';
    m.style.cssText = 'position:fixed;inset:0;z-index:100060;display:flex;align-items:flex-start;justify-content:center;padding-top:5vh;font-family:inherit';
    const col = (c, sel) => `
      <label style="flex:1;min-width:0;display:block;border:2px solid ${sel ? '#6d28d9' : '#e2e8f0'};background:${sel ? '#faf5ff' : '#fff'};border-radius:11px;padding:12px 13px;cursor:pointer">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
          <input type="radio" name="_av-keep" value="${c.id}" ${sel ? 'checked' : ''} style="width:16px;height:16px">
          <span style="font-weight:800;font-size:14px;color:#0f172a">${esc(c.nafn || '—')}</span>
        </div>
        <div style="font-size:11.5px;color:#64748b;line-height:1.7">
          ${c.kennitala ? 'kt. ' + esc(fmtKt(c.kennitala)) + '<br>' : '<span style=\"color:#cbd5e1\">engin kt</span><br>'}
          ${c.heimilisfang ? '📍 ' + esc(c.heimilisfang) + '<br>' : ''}
          ${c.simi || c.farsimi ? '📞 ' + esc(c.simi || c.farsimi) + '<br>' : ''}
          ${c.netfang ? '✉️ ' + esc(c.netfang) + '<br>' : ''}
          🧯 <strong style="color:#0f172a">${c._unitCount || 0}</strong> tæki · ${docBadge(c)}
        </div>
        <div style="margin-top:6px;font-size:10.5px;font-weight:700;color:${sel ? '#6d28d9' : '#94a3b8'}">${sel ? '✓ HELDUR — hitt færist hingað' : 'fer í geymslu'}</div>
      </label>`;
    const draw = () => {
      m.querySelector('#_av-merge-cols').innerHTML = col(a, keeperId === a.id) + col(b, keeperId === b.id);
      const keeper = keeperId === a.id ? a : b, loser = keeperId === a.id ? b : a;
      m.querySelector('#_av-merge-preview').innerHTML =
        `<strong>${esc(loser.nafn)}</strong> (${loser._unitCount || 0} tæki) sameinast inn í <strong>${esc(keeper.nafn)}</strong>. ` +
        `Tæki, skjöl og saga færast yfir; ${esc(loser.nafn)} fer í geymslu (endurheimtanlegt).` +
        (loser._unitCount ? `<div style="margin-top:5px;color:#b45309">⚠ ${loser._unitCount} tæki verða endurmerkt á „${esc(keeper.nafn)}“.</div>` : '');
      m.querySelectorAll('input[name="_av-keep"]').forEach(r => r.onchange = () => { keeperId = +r.value; draw(); });
    };
    m.innerHTML = `
      <div style="position:absolute;inset:0;background:rgba(15,23,42,.55)"></div>
      <div style="position:relative;background:#fff;border-radius:14px;box-shadow:0 20px 60px rgba(0,0,0,.3);width:min(620px,calc(100vw - 20px));max-height:90vh;overflow-y:auto">
        <div style="display:flex;justify-content:space-between;align-items:center;padding:15px 20px;border-bottom:1px solid #e2e8f0">
          <h3 style="margin:0;font-size:17px;font-weight:700">🔗 Sameina tvö fyrirtæki</h3>
          <button id="_av-merge-x" style="background:none;border:none;font-size:20px;color:#94a3b8;cursor:pointer">✕</button>
        </div>
        <div style="padding:16px 20px;display:flex;flex-direction:column;gap:13px">
          <div style="font-size:12.5px;color:#475569">Veldu hvort skráin á að <strong>halda</strong> — hin sameinast inn í hana og fer í geymslu.</div>
          <div id="_av-merge-cols" style="display:flex;gap:12px;align-items:stretch"></div>
          <div id="_av-merge-preview" style="font-size:12px;color:#334155;background:#f8fafc;border:1px solid #e2e8f0;border-radius:9px;padding:10px 12px;line-height:1.5"></div>
        </div>
        <div style="display:flex;gap:8px;justify-content:flex-end;padding:13px 20px;border-top:1px solid #e2e8f0">
          <button id="_av-merge-cancel" style="padding:9px 16px;border:1px solid #cbd5e1;background:#fff;border-radius:8px;cursor:pointer;font:inherit;font-size:13px;color:#475569">Hætta við</button>
          <button id="_av-merge-go" style="padding:9px 18px;border:none;background:#6d28d9;color:#fff;border-radius:8px;cursor:pointer;font:inherit;font-size:13px;font-weight:700">🔗 Sameina núna</button>
        </div>
      </div>`;
    document.body.appendChild(m);
    draw();
    const close = () => m.remove();
    m.querySelector('#_av-merge-x').onclick = close;
    m.querySelector('#_av-merge-cancel').onclick = close;
    m.querySelector('#_av-merge-go').onclick = async () => {
      const go = m.querySelector('#_av-merge-go'); go.disabled = true; go.textContent = 'Sameina…';
      const keeper = keeperId === a.id ? a : b, loser = keeperId === a.id ? b : a;
      const res = await doMerge(keeper, loser);
      close();
      if (res && res.ok) {
        if (window.Toast && Toast.show) Toast.show('🔗 Sameinað → ' + keeper.nafn + (res.units ? ' (' + res.units + ' tæki færð)' : ''));
        state.selected.clear(); state.selectMode = false;
      } else if (window.Toast && Toast.show) Toast.show('Sameining mistókst: ' + ((res && res.error) || 'óþekkt'));
      const main = document.getElementById('_av-main'); if (main) render(main);
    };
  }

  async function doMerge(keeper, loser) {
    const SB = (window.DB && window.DB.sb); if (!SB) return { error: 'DB ekki tilbúið' };
    try {
      let units = 0;
      // 1) Equipment + name-based history → keeper's name.
      if (loser.nafn && keeper.nafn && loser.nafn !== keeper.nafn) {
        const moved = await SB.from('uttaeki').update({ client: keeper.nafn }).eq('client', loser.nafn).select('id');
        units = (moved && moved.data && moved.data.length) || 0;
        await SB.from('lanstaeki').update({ client: keeper.nafn }).eq('client', loser.nafn);
        for (const [tbl, colName] of [['solur', 'customer_nafn'], ['verkbeidnir', 'customer'], ['sala_transactions', 'customer']]) {
          try { await SB.from(tbl).update({ [colName]: keeper.nafn }).eq(colName, loser.nafn); } catch (_) {}
        }
      }
      // 2) Documents + beiðnir → keeper's base id (only when both have one).
      if (loser.customer_base_id && keeper.customer_base_id && loser.customer_base_id !== keeper.customer_base_id) {
        try { await SB.from('customer_documents').update({ customer_base_id: keeper.customer_base_id }).eq('customer_base_id', loser.customer_base_id); } catch (_) {}
        try { await SB.from('thjonustubeidni').update({ customer_base_id: keeper.customer_base_id }).eq('customer_base_id', loser.customer_base_id); } catch (_) {}
      }
      // 3) Fill the keeper's empty identity/contact fields from the loser.
      const fill = {};
      ['kennitala', 'heimilisfang', 'simi', 'farsimi', 'netfang', 'tengiliður', 'customer_base_id'].forEach(k => {
        if ((keeper[k] == null || keeper[k] === '') && loser[k]) fill[k] = loser[k];
      });
      if (Object.keys(fill).length) { try { await SB.from('fyrirtaeki').update(fill).eq('id', keeper.id); Object.assign(keeper, fill); } catch (_) {} }
      // 4) Move service-subscription marks (AppSettings maps keyed by company id).
      if (window.AppSettings && window.AppSettings.save) {
        const patch = {};
        ['arsskodun_customers', 'brunakerfi_customers', 'ferdathjonusta_customers'].forEach(key => {
          const map = window.AppSettings.path(key) || {};
          const lo = map[String(loser.id)];
          if (lo) {
            const sub = {};                       // þröngt: TVÖ id, ekki 808
            if (!map[String(keeper.id)]) sub[String(keeper.id)] = lo;
            sub[String(loser.id)] = null;
            patch[key] = sub;
          }
        });
        if (Object.keys(patch).length) { try { await window.AppSettings.save(patch); } catch (_) {} }
      }
      // 5) Soft-archive the loser with a merge note (recoverable).
      const stamp = new Date().toISOString();
      const note = '[sameinað ' + stamp.slice(0, 10) + '] → ' + keeper.nafn + ' (#' + keeper.id + ')';
      try { await SB.from('fyrirtaeki').update({ deleted_at: stamp, review_flag: false, review_note: note }).eq('id', loser.id); } catch (_) {}
      // 6) Drop the loser from the in-memory list so the UI updates immediately.
      const list = (window.Companies && Companies.list) || [];
      const li = list.findIndex(c => +c.id === +loser.id); if (li >= 0) list.splice(li, 1);
      return { ok: true, units };
    } catch (e) { return { error: (e && e.message) || String(e) }; }
  }

  // Bulk tag selected rows as Ferðaþjónusta (additive AppSettings map, like the
  // per-row 🚌 toggle).
  async function bulkTagFerda() {
    if (!window.AppSettings || !window.AppSettings.save) { alert('AppSettings ekki tilbúið'); return; }
    const ids = Array.from(state.selected);
    if (!ids.length) return;
    if (!confirm(`Merkja ${ids.length} viðskiptavin${ids.length === 1 ? '' : 'i'} sem Ferðaþjónustu?`)) return;
    // Þröngur patch — AÐEINS þau id sem verið er að merkja. Að senda alla vörpuna
    // af-merkti þögult alla sem höfðu verið merktir annars staðar frá hleðslu.
    const cur = window.AppSettings.path('ferdathjonusta_customers') || {};
    const map = {};
    ids.forEach(id => {
      map[String(id)] = Object.assign({}, cur[String(id)] || {}, { co_id: +id, flexible: true, marked_at: (cur[String(id)] && cur[String(id)].marked_at) || new Date().toISOString().slice(0, 10) });
    });
    await window.AppSettings.save({ ferdathjonusta_customers: map });
    if (window.Toast && Toast.show) Toast.show(`🚌 ${ids.length} merkt sem Ferðaþjónusta`);
    state.selected.clear(); state.selectMode = false;
    const main = document.getElementById('_av-main'); if (main) render(main);
  }

  // Inline-edit save → write kt / heimilisfang / sími to fyrirtaeki and update
  // Companies.list so the change shows immediately.
  async function saveEdit(coId, vals) {
    const SB = (window.DB && window.DB.sb);
    const company = (window.Companies && Companies.list || []).find(c => +c.id === +coId);
    const upd = {
      kennitala: (vals.kennitala || '').trim() || null,
      heimilisfang: (vals.heimilisfang || '').trim() || null,
      simi: (vals.simi || '').trim() || null
    };
    if (company) Object.assign(company, upd);
    if (SB && company) {
      try { await SB.from('fyrirtaeki').update(upd).eq('id', coId); if (window.Toast && Toast.show) Toast.show('✓ Vistað'); }
      catch (e) { if (window.Toast && Toast.show) Toast.show('Náði ekki að vista: ' + (e.message || e)); }
    }
    state.editId = null;
    const main = document.getElementById('_av-main'); if (main) render(main);
  }

  async function toggleService(coId, svc, action) {
    if (!window.AppSettings || !window.AppSettings.save) {
      alert('AppSettings ekki tilbúið');
      return;
    }
    const STORAGE_KEY = svc === 'ars' ? 'arsskodun_customers'
                      : svc === 'ferda' ? 'ferdathjonusta_customers'
                      : 'brunakerfi_customers';
    const svcLabelOf = s => s === 'ars' ? 'fyrirtækjaþjónustu' : s === 'ferda' ? 'ferðaþjónustu' : 'brunakerfi';
    const map = Object.assign({}, window.AppSettings.path(STORAGE_KEY) || {});
    const company = (window.Companies && Companies.list || []).find(c => +c.id === +coId);
    const name = (company && company.nafn) || ('co#' + coId);

    if (action === 'add') {
      const svcLabel = svcLabelOf(svc);
      if (!confirm('Skrá "' + name + '" í ' + svcLabel + '?')) return;
      if (svc === 'ars') {
        // Minimal arsskodun entry — equipment object is what _hasArs checks.
        map[String(coId)] = Object.assign({}, map[String(coId)] || {}, {
          equipment: (map[String(coId)] && map[String(coId)].equipment) || {},
          inspect_month: (map[String(coId)] && map[String(coId)].inspect_month) || 0,
          last_year_inspected: (map[String(coId)] && map[String(coId)].last_year_inspected) || 0
        });
      } else if (svc === 'ferda') {
        // Ferðaþjónusta: no contract, flexible drop-offs. Any truthy entry
        // flags _hasFerda; serviced units route through seasonal_job (§4).
        map[String(coId)] = Object.assign({}, map[String(coId)] || {}, {
          co_id: +coId,
          flexible: true,
          marked_at: (map[String(coId)] && map[String(coId)].marked_at) || new Date().toISOString().slice(0, 10)
        });
      } else {
        // Minimal brunakerfi entry.
        map[String(coId)] = Object.assign({}, map[String(coId)] || {}, {
          co_id: +coId,
          inspect_month: (map[String(coId)] && map[String(coId)].inspect_month) || 0,
          unit_count: (map[String(coId)] && map[String(coId)].unit_count) || 0
        });
      }
    } else if (action === 'remove') {
      const svcLabel = svcLabelOf(svc);
      if (!confirm('Fjarlægja "' + name + '" úr ' + svcLabel + '?\n\n(Gögn um búnað haldast — bara samningsmerkið fer.)')) return;
      // AppSettings.save() deep-merges; delete doesn't propagate. Set to
      // null instead — _hasArs requires .equipment and _hasBru is !!bru
      // so null is treated as "not subscribed".
      map[String(coId)] = null;
    }
    const ok = await window.AppSettings.save({ [STORAGE_KEY]: map });
    if (!ok) { alert('Vista mistókst'); return; }
    // Re-render to reflect the new state
    const main = document.getElementById('_av-main');
    if (main) render(main);
  }

  // ── Open the unified customer detail page (patch 158) ─────────────────
  // This is the platform's customer view — base info + service subscriptions
  // + units + notes in one place. Falls back to the legacy opener if
  // patch 158 isn't loaded for any reason.
  function openDetail(coId) {
    if (window.VidskDetail && typeof window.VidskDetail.show === 'function') {
      return window.VidskDetail.show(coId);
    }
    // Fallback: legacy company detail
    if (window._openCompanySafe) return window._openCompanySafe(coId);
    if (window.Companies && typeof Companies.openDetail === 'function') return Companies.openDetail(coId);
    console.warn('[allir-vidsk] no detail opener available for', coId);
  }

  // ── Boot ───────────────────────────────────────────────────────────────
  function boot() {
    injectSidebar();
    ensureView();
    patchSwitchView();
    // Re-inject sidebar a couple of times — patch 68 reorders the nav
    setTimeout(injectSidebar, 1200);
    setTimeout(injectSidebar, 2500);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  // Expose for debugging
  window.AllirVidsk = { show, openDetail, getAll, version: 'v1' };
  console.log('[allir-vidsk v1] installed');
})();
/* === END ALLIR VIÐSKIPTAVINIR === */
