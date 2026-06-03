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
    xfilter: (localStorage.getItem(LS_XFILT) || '').split(',').filter(Boolean)
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
  function getAll() {
    const companies = (window.Companies && Companies.list) || [];
    const arsMap = (window.AppSettings && window.AppSettings.path && window.AppSettings.path('arsskodun_customers')) || {};
    const brunMap = (window.AppSettings && window.AppSettings.path && window.AppSettings.path('brunakerfi_customers')) || {};
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
      return {
        ...c,
        _hasArs: !!(ars && ars.equipment),
        _hasBru: !!bru,
        _ars: ars || {},
        _bru: bru || {},
        _unitCount: unitsByClient[c.nafn] || 0,
        _hasGps: !!(c.heimilisfang && gc[c.heimilisfang]) || !!(c.nafn && gc[c.nafn])
      };
    });
  }

  function filterAll(arr) {
    const search = (state.search || '').trim().toLowerCase();
    let result = arr.slice();

    // Primary service filter (chips)
    if (state.filter === 'fyrirt') result = result.filter(c => c._hasArs);
    else if (state.filter === 'brunak') result = result.filter(c => c._hasBru);
    else if (state.filter === 'onei') result = result.filter(c => !c._hasArs && !c._hasBru);

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

    const cntAll = all.length;
    const cntArs = all.filter(c => c._hasArs).length;
    const cntBru = all.filter(c => c._hasBru).length;
    const cntOne = all.filter(c => !c._hasArs && !c._hasBru).length;

    // Counts for the secondary (xfilter) chips
    const cntWithEmail   = all.filter(c => !!c.netfang).length;
    const cntWithGps     = all.filter(c => c._hasGps).length;
    const cntNoAddress   = all.filter(c => !c.heimilisfang).length;
    const cntWithUnits   = all.filter(c => c._unitCount > 0).length;
    const cntInService   = all.filter(c => c._hasArs || c._hasBru).length;
    const cntNoEmail     = cntAll - cntWithEmail;

    main.innerHTML = `
      <div style="max-width:1200px;margin:0 auto;padding:18px 20px 60px">

        <!-- Header -->
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:14px;gap:16px;flex-wrap:wrap">
          <div>
            <h1 style="margin:0 0 4px 0;font-size:23px;font-weight:800;color:#0f172a;display:flex;align-items:center;gap:9px">
              <span>👥</span><span>Allir Viðskiptavinir</span>
            </h1>
            <div style="font-size:12.5px;color:#64748b">
              ${cntAll} fyrirtæki ·
              <span style="color:#b91c1c">${cntArs} í fyrirtækjaþjónustu</span> ·
              <span style="color:#1d4ed8">${cntBru} í brunakerfi</span> ·
              ${cntOne} án samnings
            </div>
          </div>
          <input id="_av-search" type="text" placeholder="🔍 Leita..." value="${esc(state.search)}"
                 style="padding:8px 12px;border:1px solid #cbd5e1;border-radius:8px;font:inherit;font-size:13px;width:240px">
        </div>

        <!-- Summary cards (same layout as Fyrirtæki í Þjónustu) -->
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-bottom:14px">
          <div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:13px 15px">
            <div style="font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.05em">Fjöldi</div>
            <div style="font-size:25px;font-weight:800;color:#0f172a;line-height:1.1;margin-top:2px">${cntAll}</div>
            <div style="font-size:11px;color:#94a3b8;margin-top:1px">viðskiptavinir</div>
          </div>
          <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:13px 15px">
            <div style="font-size:10px;font-weight:700;color:#16a34a;text-transform:uppercase;letter-spacing:.05em">Í þjónustu</div>
            <div style="font-size:25px;font-weight:800;color:#16a34a;line-height:1.1;margin-top:2px">${cntInService}</div>
            <div style="font-size:11px;color:#64748b;margin-top:1px">${cntArs} fyrirtækjaþj. · ${cntBru} brunakerfi</div>
          </div>
          <div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:13px 15px">
            <div style="font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.05em">Með tæki</div>
            <div style="font-size:25px;font-weight:800;color:#0f172a;line-height:1.1;margin-top:2px">${cntWithUnits}</div>
            <div style="font-size:11px;color:#94a3b8;margin-top:1px">skráð slökkvitæki</div>
          </div>
          <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:12px;padding:13px 15px">
            <div style="font-size:10px;font-weight:700;color:#b45309;text-transform:uppercase;letter-spacing:.05em">Án netfangs</div>
            <div style="font-size:25px;font-weight:800;color:#b45309;line-height:1.1;margin-top:2px">${cntNoEmail}</div>
            <div style="font-size:11px;color:#64748b;margin-top:1px">vantar tölvupóst</div>
          </div>
        </div>

        <!-- Toolbar: view toggle + sort -->
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:12px">
          <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
            <div style="display:inline-flex;border:1px solid #cbd5e1;border-radius:8px;overflow:hidden;background:#fff">
              <button data-view-mode="card" class="_av-vm" type="button" style="padding:6px 12px;background:${state.view==='card'?'#0f172a':'#fff'};color:${state.view==='card'?'#fff':'#475569'};border:none;cursor:pointer;font:inherit;font-size:12px;font-weight:600;display:flex;align-items:center;gap:5px">▦ Kort</button>
              <button data-view-mode="list" class="_av-vm" type="button" style="padding:6px 12px;background:${state.view==='list'?'#0f172a':'#fff'};color:${state.view==='list'?'#fff':'#475569'};border:none;border-left:1px solid #cbd5e1;cursor:pointer;font:inherit;font-size:12px;font-weight:600;display:flex;align-items:center;gap:5px">☰ Listi</button>
            </div>
            <button id="_av-new-cust" type="button" style="padding:6px 14px;background:#16a34a;color:#fff;border:none;border-radius:8px;cursor:pointer;font:inherit;font-size:12px;font-weight:700;display:flex;align-items:center;gap:5px">+ Nýr viðskiptavinur</button>
          </div>
          <div style="display:flex;align-items:center;gap:7px">
            <label for="_av-sort" style="font-size:11px;color:#64748b;font-weight:600;text-transform:uppercase">Raða:</label>
            <select id="_av-sort" style="padding:6px 10px;border:1px solid #cbd5e1;border-radius:8px;font:inherit;font-size:12.5px;font-weight:600;background:#fff;color:#0f172a;cursor:pointer">
              <option value="nafn"      ${state.sort==='nafn'?'selected':''}>Nafn A → Ö</option>
              <option value="nafn-desc" ${state.sort==='nafn-desc'?'selected':''}>Nafn Ö → A</option>
              <option value="kt"        ${state.sort==='kt'?'selected':''}>Kennitala</option>
              <option value="newest"    ${state.sort==='newest'?'selected':''}>Nýjast fyrst</option>
              <option value="units"     ${state.sort==='units'?'selected':''}>Fjöldi tækja</option>
            </select>
          </div>
        </div>

        <!-- Primary service filter chips -->
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:7px;align-items:center">
          ${[
            ['all',    'Allir',                  cntAll],
            ['fyrirt', '🔥 Fyrirtækjaþjónusta',  cntArs],
            ['brunak', '🚨 Brunakerfi',          cntBru],
            ['onei',   'Án samnings',            cntOne]
          ].map(([key, lbl, n]) => {
            const sel = state.filter === key;
            return `<button data-filter="${key}" class="_av-ft" style="padding:6px 12px;border:1px solid ${sel?'#0f172a':'#cbd5e1'};background:${sel?'#0f172a':'#fff'};color:${sel?'#fff':'#475569'};border-radius:99px;cursor:pointer;font:inherit;font-size:12px;font-weight:600">${lbl} <span style="opacity:.65;font-weight:500">${n}</span></button>`;
          }).join('')}
        </div>

        <!-- Secondary filter chips (xfilter — AND'd with primary) -->
        <div style="display:flex;gap:5px;flex-wrap:wrap;margin-bottom:14px;align-items:center">
          <span style="font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;padding-right:4px">Sía:</span>
          ${[
            ['has-email',  '✉️ Netfang',      cntWithEmail],
            ['has-gps',    '📍 GPS staðsetning', cntWithGps],
            ['has-units',  '🧯 Hefur tæki',   cntWithUnits],
            ['no-address', '❌ Vantar heimilisfang', cntNoAddress]
          ].map(([key, lbl, n]) => {
            const sel = state.xfilter.includes(key);
            return `<button data-xfilter="${key}" class="_av-xft" style="padding:4px 9px;border:1px solid ${sel?'#0f172a':'#e2e8f0'};background:${sel?'#0f172a':'#f8fafc'};color:${sel?'#fff':'#64748b'};border-radius:99px;cursor:pointer;font:inherit;font-size:11px;font-weight:600">${lbl} <span style="opacity:.65">${n}</span></button>`;
          }).join('')}
          ${state.xfilter.length ? `<button id="_av-clear-x" type="button" style="padding:4px 9px;border:none;background:none;color:#dc2626;cursor:pointer;font:inherit;font-size:11px;font-weight:600">Hreinsa síu ✕</button>` : ''}
        </div>

        ${filtered.length === 0 ? `
          <div style="background:#fff;border:2px dashed #cbd5e1;border-radius:12px;padding:38px;text-align:center;color:#64748b">
            <div style="font-size:30px;margin-bottom:8px">🔍</div>
            <div style="font-size:14px;font-weight:600;color:#0f172a;margin-bottom:3px">Engir viðskiptavinir passa við þessa síu</div>
            <div style="font-size:12px">Reyndu að breyta sía eða leitarstreng.</div>
          </div>
        ` : (state.view === 'list' ? renderList(filtered) : renderCards(filtered))}

        <div style="margin-top:18px;font-size:11px;color:#94a3b8;text-align:center">
          Sýni <strong style="color:#475569">${filtered.length}</strong> af ${all.length} viðskiptavinum
        </div>
      </div>
    `;

    // Wire
    main.querySelectorAll('._av-ft').forEach(b => b.addEventListener('click', () => {
      state.filter = b.dataset.filter; saveState(); render(main);
    }));
    main.querySelectorAll('._av-vm').forEach(b => b.addEventListener('click', () => {
      state.view = b.dataset.viewMode; saveState(); render(main);
    }));
    main.querySelector('#_av-sort')?.addEventListener('change', e => {
      state.sort = e.target.value; saveState(); render(main);
    });
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
    // + Nýr viðskiptavinur — open the canonical shared dialog (patch 114) and
    // refresh the list once it closes (after create/cancel).
    main.querySelector('#_av-new-cust')?.addEventListener('click', () => {
      if (typeof window._upsOpenNewCustomer !== 'function') {
        if (window.Toast && Toast.show) Toast.show('Stofnunargluggi ekki tiltækur');
        return;
      }
      window._upsOpenNewCustomer('', '');
      // The dialog (#_ups-newdlg) removes itself on save/cancel. Watch for
      // that removal and re-render so any new data is picked up. Guard against
      // stacking observers if the button is clicked repeatedly.
      if (window.__avNewCustWatch) { window.__avNewCustWatch.disconnect(); window.__avNewCustWatch = null; }
      const watch = new MutationObserver(() => {
        if (!document.getElementById('_ups-newdlg')) {
          watch.disconnect();
          if (window.__avNewCustWatch === watch) window.__avNewCustWatch = null;
          const m = document.getElementById('_av-main');
          if (m) render(m);
        }
      });
      window.__avNewCustWatch = watch;
      watch.observe(document.body, { childList: true });
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
              <div style="display:flex;gap:4px;flex-wrap:wrap;margin-top:2px">${arsBtn}${bruBtn}</div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  // ── List (table) view — compact alternative to cards ───────────────────
  function renderList(arr) {
    const headerStyle = 'text-align:left;padding:8px 10px;border-bottom:1px solid #e2e8f0;font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.04em;background:#f8fafc';
    const cellStyle = 'padding:7px 10px;border-bottom:1px solid #f1f5f9;font-size:12px;color:#0f172a;vertical-align:middle';

    return `
      <div style="background:#fff;border:1px solid #e2e8f0;border-radius:11px;overflow:hidden;box-shadow:0 1px 2px rgba(0,0,0,0.03)">
        <div style="overflow-x:auto">
          <table style="width:100%;border-collapse:collapse;font:inherit">
            <thead>
              <tr>
                <th style="${headerStyle}">Nafn</th>
                <th style="${headerStyle}">Kennitala</th>
                <th style="${headerStyle}">Heimilisfang</th>
                <th style="${headerStyle}">Sími</th>
                <th style="${headerStyle};text-align:center">Tæki</th>
                <th style="${headerStyle}">Þjónusta</th>
                <th style="${headerStyle};text-align:right;width:90px">Aðgerð</th>
              </tr>
            </thead>
            <tbody>
              ${arr.map(c => {
                const badges = [];
                if (c._hasArs) badges.push('<span style="background:#fee2e2;color:#b91c1c;font-size:9.5px;font-weight:700;padding:1px 6px;border-radius:99px;border:1px solid #fecaca">🔥</span>');
                if (c._hasBru) badges.push('<span style="background:#dbeafe;color:#1d4ed8;font-size:9.5px;font-weight:700;padding:1px 6px;border-radius:99px;border:1px solid #93c5fd">🚨</span>');
                if (!c._hasArs && !c._hasBru) badges.push('<span style="background:#f1f5f9;color:#94a3b8;font-size:9.5px;font-weight:600;padding:1px 6px;border-radius:99px;border:1px solid #cbd5e1">—</span>');
                return `
                  <tr class="_av-row" data-co-id="${c.id}" style="cursor:pointer;transition:background .12s" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='transparent'">
                    <td style="${cellStyle};font-weight:700">${esc(c.nafn || '—')}</td>
                    <td style="${cellStyle};font-family:monospace;color:#64748b;font-size:11.5px">${esc(fmtKt(c.kennitala) || '—')}</td>
                    <td style="${cellStyle};color:#475569;max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${esc(c.heimilisfang || '')}">${esc(c.heimilisfang || '—')}</td>
                    <td style="${cellStyle};color:#475569;font-family:monospace;font-size:11.5px">${esc(c.simi || c.farsimi || '—')}</td>
                    <td style="${cellStyle};text-align:center;color:${c._unitCount>0?'#0f172a':'#cbd5e1'};font-weight:700">${c._unitCount || '·'}</td>
                    <td style="${cellStyle}"><div style="display:flex;gap:3px">${badges.join('')}</div></td>
                    <td style="${cellStyle};text-align:right">
                      <button class="_av-toggle" data-co-id="${c.id}" data-svc="ars" data-action="${c._hasArs?'remove':'add'}" type="button" title="${c._hasArs?'Fjarlægja úr fyrirtækjaþj.':'Skrá í fyrirtækjaþjónustu'}" style="padding:3px 7px;border:1px ${c._hasArs?'solid #fecaca':'dashed #cbd5e1'};background:${c._hasArs?'#fee2e2':'#fff'};color:${c._hasArs?'#b91c1c':'#94a3b8'};border-radius:6px;cursor:pointer;font:inherit;font-size:10.5px;font-weight:700">🔥</button>
                      <button class="_av-toggle" data-co-id="${c.id}" data-svc="bru" data-action="${c._hasBru?'remove':'add'}" type="button" title="${c._hasBru?'Fjarlægja úr brunakerfi':'Skrá í brunakerfi'}" style="padding:3px 7px;border:1px ${c._hasBru?'solid #93c5fd':'dashed #cbd5e1'};background:${c._hasBru?'#dbeafe':'#fff'};color:${c._hasBru?'#1d4ed8':'#94a3b8'};border-radius:6px;cursor:pointer;font:inherit;font-size:10.5px;font-weight:700">🚨</button>
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
  async function toggleService(coId, svc, action) {
    if (!window.AppSettings || !window.AppSettings.save) {
      alert('AppSettings ekki tilbúið');
      return;
    }
    const STORAGE_KEY = svc === 'ars' ? 'arsskodun_customers' : 'brunakerfi_customers';
    const map = Object.assign({}, window.AppSettings.path(STORAGE_KEY) || {});
    const company = (window.Companies && Companies.list || []).find(c => +c.id === +coId);
    const name = (company && company.nafn) || ('co#' + coId);

    if (action === 'add') {
      const svcLabel = svc === 'ars' ? 'fyrirtækjaþjónustu' : 'brunakerfi';
      if (!confirm('Skrá "' + name + '" í ' + svcLabel + '?')) return;
      if (svc === 'ars') {
        // Minimal arsskodun entry — equipment object is what _hasArs checks.
        map[String(coId)] = Object.assign({}, map[String(coId)] || {}, {
          equipment: (map[String(coId)] && map[String(coId)].equipment) || {},
          inspect_month: (map[String(coId)] && map[String(coId)].inspect_month) || 0,
          last_year_inspected: (map[String(coId)] && map[String(coId)].last_year_inspected) || 0
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
      const svcLabel = svc === 'ars' ? 'fyrirtækjaþjónustu' : 'brunakerfi';
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
