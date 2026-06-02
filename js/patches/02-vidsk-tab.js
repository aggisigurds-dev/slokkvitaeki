/* === VIDSK TAB v1 (2026-04-30) === */

/* Viðskiptavinir tab — mirrors Fyrirtæki layout (header + search + list + cards),
   reads from `vidskiptavinir` table, joins counts from `uttaeki`, last visit from `verkbeidnir`.
   Click a customer → opens existing window.SalaCustomer360 hub. */
(() => {
  if (window.__VidskInstalled) { console.log('[Vidsk] already installed'); return; }
  window.__VidskInstalled = true;

  const sb = window.supabase || window.sb;
  if (!sb) { console.warn('[Vidsk] Supabase not ready, abort'); return; }

  const State = { customers: [], counts: {}, lastVisits: {}, search: '', loaded: false };

  // ---------- helpers ----------
  function esc(s) {
    return (s == null ? '' : String(s)).replace(/[&<>"']/g, c =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  function initials(s) {
    const p = (s || '').trim().split(/\s+/);
    return ((p[0] || '').charAt(0) + (p[1] || '').charAt(0)).toUpperCase() || '?';
  }
  function fmtDate(d) {
    if (!d) return '—';
    try {
      const x = new Date(d);
      if (isNaN(x)) return '—';
      return String(x.getDate()).padStart(2,'0') + '/' + String(x.getMonth()+1).padStart(2,'0') + '/' + x.getFullYear();
    } catch (_) { return '—'; }
  }
  function daysAgo(d) {
    if (!d) return null;
    const ms = Date.now() - new Date(d).getTime();
    return Math.floor(ms / 86400000);
  }

  // ---------- data ----------
  async function loadData() {
    const [v, u, j] = await Promise.all([
      sb.from('vidskiptavinir').select('*').order('nafn'),
      DB.fetchAll((from, to) => sb.from('uttaeki').select('client').range(from, to)).then(rows => ({ data: rows })),  // >1000 rows — page through cap
      sb.from('verkbeidnir').select('customer,dropoff,created_at'),
    ]);
    State.customers = v.data || [];
    State.counts = {};
    for (const r of (u.data || [])) {
      if (!r.client) continue;
      State.counts[r.client] = (State.counts[r.client] || 0) + 1;
    }
    State.lastVisits = {};
    for (const r of (j.data || [])) {
      const c = r.customer; if (!c) continue;
      const d = r.dropoff || r.created_at; if (!d) continue;
      if (!State.lastVisits[c] || d > State.lastVisits[c]) State.lastVisits[c] = d;
    }
    State.loaded = true;
  }

  // ---------- DOM ----------
  function ensureViewContainer() {
    if (document.getElementById('view-vidskiptavinir')) return;
    const tpl = document.getElementById('view-companies');
    if (!tpl || !tpl.parentElement) {
      console.warn('[Vidsk] no view-companies template, cannot inject');
      return;
    }
    const view = document.createElement('div');
    view.id = 'view-vidskiptavinir';
    view.className = 'view';
    view.hidden = true;
    view.innerHTML = '<main class="main-panel" id="vidsk-main"><div class="loading-state" style="padding:40px;text-align:center;color:#888;">Hleður viðskiptavinum…</div></main>';
    tpl.parentElement.appendChild(view);
  }

  function renameCompaniesTab() {
    const btn = document.querySelector('.vnav-btn[data-view="companies"]');
    if (!btn) return;
    const cur = (btn.textContent || '').trim();
    if (cur === 'Fyrirtæki' || cur === 'Fyrirtækjaþjónusta') {
      btn.textContent = 'Fyrirtækjaþjónusta';
    }
  }

  function wireNavButton() {
    const btn = document.querySelector('.vnav-btn[data-view="vidskiptavinir"]');
    if (!btn) return;
    if (btn.dataset.vkWired === '1') return;
    btn.dataset.vkWired = '1';
    btn.addEventListener('click', () => {
      if (window.App && App.switchView) App.switchView('vidskiptavinir');
    });
  }

  function hookSwitchView() {
    if (!window.App || !App.switchView || App.switchView.__vkHooked) return;
    const orig = App.switchView;
    App.switchView = function (name) {
      const r = orig.apply(this, arguments);
      if (name === 'vidskiptavinir') Vidskiptavinir.render();
      return r;
    };
    App.switchView.__vkHooked = true;
  }

  // ---------- render ----------
  function render() {
    const main = document.getElementById('vidsk-main');
    if (!main) return;

    if (!State.loaded) {
      loadData().then(render).catch(e => {
        main.innerHTML = '<div style="padding:24px;color:#c33;">Villa við að sækja gögn: ' + esc(e.message || e) + '</div>';
      });
      return;
    }

    const filt = State.search.trim().toLowerCase();
    const list = !filt ? State.customers : State.customers.filter(c =>
      (c.nafn || '').toLowerCase().includes(filt) ||
      (c.kennitala || '').toLowerCase().includes(filt) ||
      (c.simi || '').toLowerCase().includes(filt) ||
      (c.netfang || '').toLowerCase().includes(filt)
    );

    main.innerHTML =
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:12px;">' +
        '<div>' +
          '<div style="font-size:22px;font-weight:600;">Viðskiptavinir</div>' +
          '<div class="_cl_subtitle" style="margin-top:2px;">' + State.customers.length + ' skráðir</div>' +
        '</div>' +
        '<button class="btn btn-primary btn-sm" id="_vk_new">+ Nýr viðskiptavinur</button>' +
      '</div>' +

      '<div class="_cl_wrap">' +
        '<div style="display:flex;gap:8px;align-items:center;">' +
          '<input id="_vk_search" class="fi" type="text" placeholder="🔎 Leita að viðskiptavini..." value="' + esc(State.search) + '" style="flex:1;">' +
          '<button id="_vk_clear" class="btn btn-sm">Hreinsa</button>' +
        '</div>' +
        '<div class="_cl_subtitle" style="margin:8px 0 12px;">Listi · ' + list.length + ' / ' + State.customers.length + ' viðskiptavinir</div>' +
        '<table class="_cl_table">' +
          '<thead><tr>' +
            '<th>Nafn</th><th>Kennitala</th><th>Sími</th>' +
            '<th>Tæki</th><th>Síðasta heimsókn</th><th></th>' +
          '</tr></thead>' +
          '<tbody>' +
            (list.length === 0
              ? '<tr><td colspan="6" style="text-align:center;padding:24px;color:#888;">Engir viðskiptavinir fundust</td></tr>'
              : list.map(c => {
                  const cnt = State.counts[c.nafn] || 0;
                  const last = State.lastVisits[c.nafn];
                  const days = daysAgo(last);
                  const lastTxt = last
                    ? fmtDate(last) + (days != null ? '<br><span style="font-size:11px;color:#888;">' + days + ' dögum</span>' : '')
                    : '—';
                  return '<tr data-vk-name="' + esc(c.nafn) + '" style="cursor:pointer;">' +
                    '<td><strong>' + esc(c.nafn) + '</strong></td>' +
                    '<td>' + esc(c.kennitala || '—') + '</td>' +
                    '<td>' + esc(c.simi || '—') + '</td>' +
                    '<td>' + cnt + '</td>' +
                    '<td>' + lastTxt + '</td>' +
                    '<td style="color:#888;">›</td>' +
                  '</tr>';
                }).join('')
            ) +
          '</tbody>' +
        '</table>' +
      '</div>' +

      '<div class="company-grid" style="margin-top:20px;">' +
        list.map(c => {
          const cnt = State.counts[c.nafn] || 0;
          return '<div class="company-card" data-vk-name="' + esc(c.nafn) + '" style="cursor:pointer;">' +
            '<div class="company-card-top">' +
              '<div class="company-initials">' + esc(initials(c.nafn)) + '</div>' +
              '<div style="flex:1;min-width:0;">' +
                '<div class="company-name">' + esc(c.nafn) + '</div>' +
                (c.kennitala ? '<div style="font-size:12px;color:#888;margin-top:2px;">kt. ' + esc(c.kennitala) + '</div>' : '') +
              '</div>' +
            '</div>' +
            '<div class="company-card-bottom">' +
              '<span class="company-stat"><strong>' + cnt + '</strong> tæki</span>' +
              (c.simi ? '<span style="font-size:13px;color:#666;">📞 ' + esc(c.simi) + '</span>' : '') +
            '</div>' +
          '</div>';
        }).join('') +
      '</div>';

    // bind events for this render
    const search = main.querySelector('#_vk_search');
    if (search) {
      search.addEventListener('input', e => { State.search = e.target.value; render(); });
      // keep focus + caret position
      if (filt) {
        search.focus();
        const v = search.value; search.value = ''; search.value = v;
      }
    }
    const clr = main.querySelector('#_vk_clear');
    if (clr) clr.addEventListener('click', () => { State.search = ''; render(); });
    const nu = main.querySelector('#_vk_new');
    if (nu) nu.addEventListener('click', () => Vidskiptavinir.openNew());

    main.querySelectorAll('[data-vk-name]').forEach(el => {
      el.addEventListener('click', ev => {
        if (ev.target.closest('button, input, a')) return;
        Vidskiptavinir.openDetail(el.dataset.vkName);
      });
    });
  }

  // ---------- public API ----------
  const Vidskiptavinir = {
    async load() { await loadData(); render(); },
    async render() {
      ensureViewContainer();
      if (!State.loaded) { await loadData(); }
      render();
    },
    refresh() { State.loaded = false; return Vidskiptavinir.render(); },
    openDetail(name) {
      if (window.SalaCustomer360 && SalaCustomer360.open) {
        SalaCustomer360.open(name);
      } else if (window.Customer360 && Customer360.open) {
        Customer360.open(name);
      } else {
        alert('Staða viðskiptavinar (' + name + ') — eining ekki tilbúin');
      }
    },
    openNew() {
      // Delegate to Sala intake's "new customer" flow if available
      if (window.SalaMottaka && SalaMottaka.openNewCustomer) {
        SalaMottaka.openNewCustomer();
      } else if (window.SalaMottaka && SalaMottaka.open) {
        SalaMottaka.open();
      } else {
        alert('Nýr viðskiptavinur — opnaðu Sala flipann.');
      }
    },
  };
  window.Vidskiptavinir = Vidskiptavinir;

  // ---------- bootstrap ----------
  function init() {
    try {
      renameCompaniesTab();
      ensureViewContainer();
      wireNavButton();
      hookSwitchView();
      console.log('[Vidsk] initialized');
    } catch (e) { console.error('[Vidsk] init err', e); }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  // also re-attempt after a moment in case App / nav builds late
  setTimeout(init, 1500);
  setTimeout(init, 4000);
})();


/* === END VIDSK TAB === */
