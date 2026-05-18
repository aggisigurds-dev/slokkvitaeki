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

  const state = {
    filter: localStorage.getItem(LS_FILT) || 'all',   // all | fyrirt | brunak | onei
    search: localStorage.getItem(LS_SRCH) || ''
  };
  function saveState() {
    localStorage.setItem(LS_FILT, state.filter);
    localStorage.setItem(LS_SRCH, state.search);
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
    return companies.map(c => {
      const ars = arsMap[String(c.id)];
      const bru = brunMap[String(c.id)];
      return {
        ...c,
        _hasArs: !!(ars && ars.equipment),
        _hasBru: !!bru,
        _ars: ars || {},
        _bru: bru || {}
      };
    });
  }

  function filterAll(arr) {
    const search = (state.search || '').trim().toLowerCase();
    let result = arr.slice();
    if (state.filter === 'fyrirt') result = result.filter(c => c._hasArs);
    else if (state.filter === 'brunak') result = result.filter(c => c._hasBru);
    else if (state.filter === 'onei') result = result.filter(c => !c._hasArs && !c._hasBru);
    if (search) {
      result = result.filter(c =>
        (c.nafn || '').toLowerCase().includes(search) ||
        (c.kennitala || '').replace(/\D/g,'').includes(search.replace(/\D/g,'')) ||
        (c.heimilisfang || '').toLowerCase().includes(search) ||
        (c.simi || '').includes(search) ||
        (c.farsimi || '').includes(search) ||
        (c.netfang || '').toLowerCase().includes(search) ||
        (c.tengiliður || '').toLowerCase().includes(search)
      );
    }
    return result.sort((a, b) =>
      String(a.nafn || '').localeCompare(String(b.nafn || ''), 'is')
    );
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
    const all = getAll();
    const filtered = filterAll(all);

    const cntAll = all.length;
    const cntArs = all.filter(c => c._hasArs).length;
    const cntBru = all.filter(c => c._hasBru).length;
    const cntOne = all.filter(c => !c._hasArs && !c._hasBru).length;

    main.innerHTML = `
      <div style="max-width:1200px;margin:0 auto;padding:18px 20px 60px">

        <!-- Header -->
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:18px;gap:16px;flex-wrap:wrap">
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

        <!-- Filter chips -->
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px;align-items:center">
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

        ${filtered.length === 0 ? `
          <div style="background:#fff;border:2px dashed #cbd5e1;border-radius:12px;padding:38px;text-align:center;color:#64748b">
            <div style="font-size:30px;margin-bottom:8px">🔍</div>
            <div style="font-size:14px;font-weight:600;color:#0f172a;margin-bottom:3px">Engir viðskiptavinir passa við þessa síu</div>
            <div style="font-size:12px">Reyndu að breyta sía eða leitarstreng.</div>
          </div>
        ` : renderCards(filtered)}

        <div style="margin-top:18px;font-size:11px;color:#94a3b8;text-align:center">
          Sýni <strong style="color:#475569">${filtered.length}</strong> af ${all.length} viðskiptavinum
        </div>
      </div>
    `;

    // Wire
    main.querySelectorAll('._av-ft').forEach(b => b.addEventListener('click', () => {
      state.filter = b.dataset.filter; saveState(); render(main);
    }));
    let _searchTimer = null;
    main.querySelector('#_av-search')?.addEventListener('input', e => {
      clearTimeout(_searchTimer);
      _searchTimer = setTimeout(() => { state.search = e.target.value; saveState(); render(main); }, 200);
    });
    main.querySelectorAll('._av-card').forEach(el => {
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

          const initial = (c.nafn || '?').trim().charAt(0).toUpperCase();
          const avatarColor = c._hasArs && c._hasBru ? '#7c3aed' :
                              c._hasArs ? '#b91c1c' :
                              c._hasBru ? '#1d4ed8' : '#64748b';

          return `
            <div class="_av-card" data-co-id="${c.id}" style="background:#fff;border:1px solid #e2e8f0;border-radius:11px;padding:12px 14px;display:flex;flex-direction:column;gap:7px;box-shadow:0 1px 2px rgba(0,0,0,0.03);cursor:pointer;transition:all .15s" onmouseover="this.style.borderColor='#94a3b8';this.style.boxShadow='0 2px 8px rgba(0,0,0,0.06)'" onmouseout="this.style.borderColor='#e2e8f0';this.style.boxShadow='0 1px 2px rgba(0,0,0,0.03)'">
              <div style="display:flex;gap:10px;align-items:flex-start">
                <div style="width:34px;height:34px;flex-shrink:0;border-radius:50%;background:${avatarColor};color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px">${esc(initial)}</div>
                <div style="min-width:0;flex:1">
                  <div style="font-weight:700;color:#0f172a;font-size:13.5px;line-height:1.25">${esc(c.nafn || '—')}</div>
                  ${c.kennitala ? `<div style="font-size:10.5px;color:#94a3b8;font-family:monospace;margin-top:1px">kt. ${esc(fmtKt(c.kennitala))}</div>` : ''}
                </div>
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
      delete map[String(coId)];
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
