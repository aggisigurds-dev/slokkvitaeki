/* === KRÖFU YFIRLIT v1 ===
 *
 * Mánaðar-yfirlit yfir ALLAR ógreiddar sölur með greitt_med='reikningur'
 * (Senda reikning / krafa í heimabanka 10 dagar). Aðskilið frá "Til að
 * rukka" sem inniheldur líka 'greitt_sidar'.
 *
 * Markmið: í lok mánaðar þarf Agnar að senda hverri fyrirtækjakröfu inn
 * í heimabankann. Þessi síða hjálpar honum að:
 *   1. Sjá alla útistandandi kröfu-sölu á einum stað
 *   2. Gruppera per fyrirtæki — heildartala per fyrirtæki er það sem fer
 *      í heimabankann
 *   3. Merkja allar sölur fyrirtækis sem greitt þegar krafan er búin
 *
 * Sidebar entry "📋 Kröfu yfirlit" rétt fyrir neðan "Til að rukka".
 */
(() => {
  if (window.__krofuYfirlitInstalled) return;
  window.__krofuYfirlitInstalled = true;

  const VIEW_ID = 'view-krofu-yfirlit';
  const NAV_KEY = 'krofu-yfirlit';

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
    return String(d.getDate()).padStart(2,'0') + '/' + String(d.getMonth()+1).padStart(2,'0') + '/' + d.getFullYear();
  }
  function daysAgo(iso) {
    if (!iso) return null;
    return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  }
  function normName(s) { return String(s || '').toLowerCase().replace(/\s+/g, ' ').trim(); }

  // ── Sidebar entry ────────────────────────────────────────────────────────
  function injectNav() {
    const nav = document.querySelector('nav.view-nav, .view-nav');
    if (!nav) { setTimeout(injectNav, 500); return; }
    if (nav.querySelector('[data-view="' + NAV_KEY + '"]')) return;
    const rukkBtn = Array.from(nav.querySelectorAll('.vnav-btn'))
      .find(b => /Til að rukka|Til ad rukka/.test(b.textContent || ''));
    const tpl = rukkBtn || nav.querySelector('.vnav-btn');
    if (!tpl) { setTimeout(injectNav, 500); return; }
    const btn = document.createElement('button');
    btn.className = (tpl.className || 'vnav-btn').replace(/\bactive\b/g, '').trim();
    btn.setAttribute('data-view', NAV_KEY);
    btn.innerHTML = '<span style="margin-right:6px">📋</span>Kröfu yfirlit <span class="ky-badge" style="margin-left:auto;background:#1d4ed8;color:#fff;font-size:10px;font-weight:700;padding:1px 7px;border-radius:99px;display:none"></span>';
    btn.style.display = 'flex';
    btn.style.alignItems = 'center';
    btn.addEventListener('click', e => {
      e.preventDefault(); e.stopPropagation();
      show();
    });
    if (rukkBtn && rukkBtn.parentNode) rukkBtn.parentNode.insertBefore(btn, rukkBtn.nextSibling);
    else nav.appendChild(btn);
  }

  // ── View container ───────────────────────────────────────────────────────
  function ensureView() {
    if (document.getElementById(VIEW_ID)) return;
    const sample = document.getElementById('view-counter') || document.getElementById('view-sala');
    if (!sample || !sample.parentElement) return;
    const v = document.createElement('div');
    v.id = VIEW_ID;
    v.className = sample.className.replace(/\bactive\b/g, '').trim();
    v.innerHTML = '<main id="ky-main" class="main-panel"></main>';
    sample.parentElement.appendChild(v);
  }

  function patchSwitchView() {
    if (!window.App || window.App._kySwitchPatched) return;
    const orig = window.App.switchView;
    window.App.switchView = function (view) {
      if (view === NAV_KEY) {
        ensureView();
        // 2026-06-13: class-based like the core (.view.active{display:block}).
        // Clear any stale inline display so switching AWAY later (core toggles
        // the class only) doesn't leave other views stranded as display:none.
        document.querySelectorAll('[id^="view-"]').forEach(v => {
          v.classList.remove('active');
          v.style.display = '';
        });
        const v = document.getElementById(VIEW_ID);
        if (v) { v.classList.add('active'); v.style.display = 'block'; }
        document.querySelectorAll('.vnav-btn').forEach(b => b.classList.toggle('active', b.dataset.view === NAV_KEY));
        load();
        return;
      }
      return orig.apply(this, arguments);
    };
    window.App._kySwitchPatched = true;
  }

  // ── Data load ────────────────────────────────────────────────────────────
  // 2026-05-21: _state.sort persists the current sort across reloads via
  // localStorage so the choice survives view-switches.
  const SORT_KEY = '_ky_sort_v1';
  function loadSort() {
    try { return localStorage.getItem(SORT_KEY) || 'updated_desc'; } catch (_) { return 'updated_desc'; }
  }
  function saveSort(v) { try { localStorage.setItem(SORT_KEY, v); } catch (_) {} }
  let _state = { month: null, all: [], vbByParent: {}, sort: loadSort() };

  function monthBounds(d) {
    const start = new Date(d.getFullYear(), d.getMonth(), 1);
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    return { start, end };
  }

  async function load(filterMonth) {
    const main = document.getElementById('ky-main');
    if (!main) return;
    main.innerHTML = '<div style="padding:32px;text-align:center;color:#94a3b8">Hleður kröfum…</div>';
    const SB = getSB();
    if (!SB) { main.innerHTML = '<div style="padding:32px;color:#dc2626">Engin gagnabankatenging.</div>'; return; }

    const m = filterMonth || new Date();
    _state.month = m;

    // ONLY reikningur — that's the "krafa í heimabanka 10 dagar" choice.
    // 'greitt_sidar' is excluded — it has its own page (Til að rukka).
    // 2026-05-21: pull updated_at too so the sort options can use it.
    const r = await SB.from('solur')
      .select('id,num,customer_nafn,customer_id,samtals,greitt_med,athugasemdir,created_at,updated_at,paid_at,krafa_sent_at,is_credit,credit_of')
      .eq('greitt_med', 'reikningur')
      .is('paid_at', null)
      .order('updated_at', { ascending: false });
    if (r.error) { main.innerHTML = '<div style="padding:32px;color:#dc2626">Villa: ' + esc(r.error.message) + '</div>'; return; }
    _state.all = r.data || [];

    // Verkbeidnir for pickup status (same approach as patch 152).
    const vb = await SB.from('verkbeidnir').select('num,status').like('num', 'R-%-V%');
    _state.vbByParent = {};
    (vb.data || []).forEach(v => {
      const parent = String(v.num || '').replace(/-V\d+$/, '');
      (_state.vbByParent[parent] = _state.vbByParent[parent] || []).push(v.status);
    });

    render();
  }

  function pickupStatus(saleNum) {
    const statuses = _state.vbByParent[saleNum] || [];
    if (!statuses.length) return { label: '—', icon: '·', color: '#94a3b8' };
    const allCollected = statuses.every(s => s === 'collected' || s === 'done');
    const anyAtShop = statuses.some(s => s === 'received' || s === 'ready' || s === 'inprogress');
    if (allCollected) return { label: 'Sótt', icon: '✅', color: '#16a34a' };
    if (anyAtShop) return { label: 'Hjá þér', icon: '🏪', color: '#f59e0b' };
    return { label: '—', icon: '·', color: '#94a3b8' };
  }

  // ── Render ───────────────────────────────────────────────────────────────
  function render() {
    const main = document.getElementById('ky-main');
    if (!main) return;
    const all = _state.all;
    const { start, end } = monthBounds(_state.month);

    const thisMonth = [];
    const older = [];
    all.forEach(s => {
      const t = new Date(s.created_at).getTime();
      if (t >= start.getTime() && t < end.getTime()) thisMonth.push(s);
      else older.push(s);
    });

    function sum(arr) { return arr.reduce((s, x) => s + (parseFloat(x.samtals) || 0), 0); }
    const thisMonthTotal = sum(thisMonth);
    const olderTotal = sum(older);
    const grandTotal = thisMonthTotal + olderTotal;

    // Group by company across the whole dataset for the per-company section.
    const grouped = {};
    all.forEach(s => {
      const key = normName(s.customer_nafn) || '(ekkert nafn)';
      const display = s.customer_nafn || '(ekkert nafn)';
      if (!grouped[key]) grouped[key] = { display, id: s.customer_id || null, sales: [], sum: 0, thisMonthSum: 0, olderSum: 0, latestUpdated: '', latestCreated: '' };
      grouped[key].sales.push(s);
      grouped[key].sum += parseFloat(s.samtals) || 0;
      const t = new Date(s.created_at).getTime();
      if (t >= start.getTime() && t < end.getTime()) grouped[key].thisMonthSum += parseFloat(s.samtals) || 0;
      else grouped[key].olderSum += parseFloat(s.samtals) || 0;
      // Track latest timestamps so sort modes work at company-card level too.
      const u = s.updated_at || s.created_at || '';
      if (u > grouped[key].latestUpdated) grouped[key].latestUpdated = u;
      const c = s.created_at || '';
      if (c > grouped[key].latestCreated) grouped[key].latestCreated = c;
    });
    // 2026-05-21: sort companies AND the sales within each company by the
    // chosen order. Default = nýlega breytt → claims you just touched
    // (mark paid, switch method, save edits) jump to the top instead of
    // staying buried by their original created_at.
    const sortMode = _state.sort;
    function cmpUpdated(a, b) { return (b.updated_at || b.created_at || '').localeCompare(a.updated_at || a.created_at || ''); }
    function cmpCreatedDesc(a, b) { return (b.created_at || '').localeCompare(a.created_at || ''); }
    function cmpCreatedAsc(a, b) { return (a.created_at || '').localeCompare(b.created_at || ''); }
    function cmpAmtDesc(a, b) { return (+b.samtals || 0) - (+a.samtals || 0); }
    function cmpAmtAsc(a, b)  { return (+a.samtals || 0) - (+b.samtals || 0); }
    const saleCmp = sortMode === 'created_desc' ? cmpCreatedDesc
                  : sortMode === 'created_asc'  ? cmpCreatedAsc
                  : sortMode === 'amount_desc'  ? cmpAmtDesc
                  : sortMode === 'amount_asc'   ? cmpAmtAsc
                  : cmpUpdated; // updated_desc default
    Object.values(grouped).forEach(g => g.sales.sort(saleCmp));
    const companies = Object.values(grouped).sort((a, b) => {
      if (sortMode === 'amount_asc')   return a.sum - b.sum;
      if (sortMode === 'amount_desc')  return b.sum - a.sum;
      if (sortMode === 'created_asc')  return (a.latestCreated || '').localeCompare(b.latestCreated || '');
      if (sortMode === 'created_desc') return (b.latestCreated || '').localeCompare(a.latestCreated || '');
      // updated_desc: company with the most-recently-touched sale floats up
      return (b.latestUpdated || '').localeCompare(a.latestUpdated || '');
    });

    const monthLabel = _state.month.getFullYear() + ' · ' +
      ['Janúar','Febrúar','Mars','Apríl','Maí','Júní','Júlí','Ágúst','September','Október','Nóvember','Desember'][_state.month.getMonth()];

    main.innerHTML = `
      <div style="max-width:1200px;margin:0 auto;padding:22px">

        <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:14px;margin-bottom:18px">
          <div>
            <h1 style="margin:0;font-size:22px;color:#0f172a;display:flex;align-items:center;gap:10px">📋 Kröfu yfirlit</h1>
            <div style="font-size:12px;color:#64748b;margin-top:2px">Krafa í heimabanka — sölur með greitt_med = "Senda reikning" sem þarf að safna saman í lok mánaðar</div>
          </div>
          <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
            <button class="_ky-prev" type="button" style="padding:7px 11px;border:1px solid #cbd5e1;border-radius:7px;background:#fff;cursor:pointer;font:inherit;font-size:13px">◀</button>
            <div style="font-size:13px;font-weight:700;color:#0f172a;padding:0 8px;min-width:140px;text-align:center">${esc(monthLabel)}</div>
            <button class="_ky-next" type="button" style="padding:7px 11px;border:1px solid #cbd5e1;border-radius:7px;background:#fff;cursor:pointer;font:inherit;font-size:13px">▶</button>
            <select class="_ky-sort" title="Raða" style="margin-left:6px;padding:6px 9px;border:1px solid #cbd5e1;border-radius:7px;background:#fff;font:inherit;font-size:12.5px;font-weight:600;color:#475569;cursor:pointer">
              <option value="updated_desc"${_state.sort === 'updated_desc' ? ' selected' : ''}>🕐 Nýlega breytt fyrst</option>
              <option value="created_desc"${_state.sort === 'created_desc' ? ' selected' : ''}>📅 Nýjast stofnað</option>
              <option value="created_asc"${_state.sort === 'created_asc' ? ' selected' : ''}>📅 Elst stofnað</option>
              <option value="amount_desc"${_state.sort === 'amount_desc' ? ' selected' : ''}>💰 Hæsta upphæð</option>
              <option value="amount_asc"${_state.sort === 'amount_asc' ? ' selected' : ''}>💰 Lægsta upphæð</option>
            </select>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px;margin-bottom:22px">
          <div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:18px;box-shadow:0 1px 3px rgba(0,0,0,.04);border-left:4px solid #1d4ed8">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
              <div style="width:32px;height:32px;border-radius:8px;background:#dbeafe;display:flex;align-items:center;justify-content:center;font-size:18px">📋</div>
              <div style="font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:.05em;font-weight:600">Þessi mánuður</div>
            </div>
            <div style="font-size:26px;font-weight:800;color:#1d4ed8">${fmtKr(thisMonthTotal)}</div>
            <div style="font-size:11px;color:#94a3b8;margin-top:2px">${thisMonth.length} kröfur</div>
          </div>
          ${olderTotal !== 0 ? `
          <div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:18px;box-shadow:0 1px 3px rgba(0,0,0,.04);border-left:4px solid #b45309">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
              <div style="width:32px;height:32px;border-radius:8px;background:#fef3c7;display:flex;align-items:center;justify-content:center;font-size:18px">🕓</div>
              <div style="font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:.05em;font-weight:600">Eldri ógreitt</div>
            </div>
            <div style="font-size:26px;font-weight:800;color:#b45309">${fmtKr(olderTotal)}</div>
            <div style="font-size:11px;color:#94a3b8;margin-top:2px">${older.length} kröfur</div>
          </div>` : ''}
          <div style="background:linear-gradient(135deg,#1e3a8a,#1d4ed8);color:#fff;border-radius:12px;padding:18px;box-shadow:0 1px 3px rgba(0,0,0,.04)">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
              <div style="width:32px;height:32px;border-radius:8px;background:rgba(255,255,255,.15);display:flex;align-items:center;justify-content:center;font-size:18px">💰</div>
              <div style="font-size:11px;color:#bfdbfe;text-transform:uppercase;letter-spacing:.05em;font-weight:600">Heildarkröfur</div>
            </div>
            <div style="font-size:26px;font-weight:800">${fmtKr(grandTotal)}</div>
            <div style="font-size:11px;color:#bfdbfe;margin-top:2px">${all.length} sölur · ${companies.length} fyrirtæki</div>
          </div>
        </div>

        <div style="font-size:13px;color:#475569;margin-bottom:10px;padding:10px 14px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;line-height:1.5">
          💡 Þessar tölur eru útistandandi kröfur per fyrirtæki sem þarf að setja í heimabankann.
          Þegar krafan hefur verið mynduð fyrir fyrirtæki, smelltu <b>"✓ Allar greiddar"</b> til að hreinsa þær út.
        </div>

        ${companies.length
          ? companies.map(renderCompany).join('')
          : '<div style="background:#fff;border:1px solid #e2e8f0;border-radius:9px;padding:40px;text-align:center;color:#94a3b8;font-style:italic">Engar útistandandi kröfur 🎉</div>'}

      </div>`;

    main.querySelector('._ky-sort')?.addEventListener('change', e => {
      _state.sort = e.target.value;
      saveSort(_state.sort);
      render();
    });
    main.querySelector('._ky-prev')?.addEventListener('click', () => {
      const m = new Date(_state.month);
      m.setMonth(m.getMonth() - 1);
      load(m);
    });
    main.querySelector('._ky-next')?.addEventListener('click', () => {
      const m = new Date(_state.month);
      m.setMonth(m.getMonth() + 1);
      load(m);
    });

    // 2026-06-12 (Todoist): „Krafa send" hak per kröfu — togglar krafa_sent_at.
    main.querySelectorAll('._ky-krafa-toggle').forEach(b => {
      b.addEventListener('click', async () => {
        const id = b.dataset.id;
        const isOn = b.dataset.on === '1';
        if (isOn && !confirm('Afhaka „Krafa send"?')) return;
        const SB = getSB();
        const r = await SB.from('solur').update({ krafa_sent_at: isOn ? null : new Date().toISOString() }).eq('id', id);
        if (r.error) { alert('Villa: ' + r.error.message); return; }
        if (window.Toast && Toast.show) Toast.show(isOn ? 'Krafa send — afhakað' : '🏦 ✓ Krafa send');
        await load(_state.month);
      });
    });
    main.querySelectorAll('._ky-mark-paid').forEach(b => {
      b.addEventListener('click', async () => {
        const id = b.dataset.id;
        if (!confirm('Merkja sem greitt? (paid_at = núna)')) return;
        const SB = getSB();
        const r = await SB.from('solur').update({ paid_at: new Date().toISOString() }).eq('id', id);
        if (r.error) { alert('Villa: ' + r.error.message); return; }
        if (window.Toast && Toast.show) Toast.show('✓ Merkt sem greitt');
        await load(_state.month);
        refreshBadge();
      });
    });
    main.querySelectorAll('._ky-mark-all-paid').forEach(b => {
      b.addEventListener('click', async () => {
        const ids = b.dataset.ids.split(',').map(Number);
        const name = b.dataset.name || 'þetta fyrirtæki';
        if (!confirm('Merkja allar ' + ids.length + ' kröfur sem greitt fyrir "' + name + '"?\n\n(Notist eftir að krafa hefur verið send í heimabanka.)')) return;
        const SB = getSB();
        const r = await SB.from('solur').update({ paid_at: new Date().toISOString() }).in('id', ids);
        if (r.error) { alert('Villa: ' + r.error.message); return; }
        if (window.Toast && Toast.show) Toast.show('✓ ' + ids.length + ' kröfur merktar greiddar');
        await load(_state.month);
        refreshBadge();
      });
    });
    main.querySelectorAll('._ky-open-editor').forEach(b => {
      b.addEventListener('click', () => {
        const num = b.dataset.num;
        if (window.SaleEditor && SaleEditor.openByNum) SaleEditor.openByNum(num);
      });
    });
    main.querySelectorAll('._ky-view-invoice').forEach(b => {
      b.addEventListener('click', () => openInvoice(b.dataset.id));
    });
    main.querySelectorAll('._ky-kredit').forEach(b => {
      b.addEventListener('click', async () => {
        if (!window.CreditInvoice || !CreditInvoice.open) {
          alert('Kreditfærslueining ekki tiltæk.'); return;
        }
        const SB = getSB(); if (!SB) return;
        const r = await SB.from('solur')
          .select('id,num,customer_nafn,customer_id,samtals,upphaed_an_vsk,vsk_upphaed,linur,greitt_med')
          .eq('id', b.dataset.id).single();
        if (r.error || !r.data) { alert('Salan fannst ekki.'); return; }
        const d = r.data;
        CreditInvoice.open({
          id: d.id, num: d.num, customer: d.customer_nafn, customer_id: d.customer_id,
          total: +(d.samtals || 0), ex: +(d.upphaed_an_vsk || 0), vsk: +(d.vsk_upphaed || 0),
          lines: Array.isArray(d.linur) ? d.linur : [], payment: d.greitt_med
        });
        // Patch 26 hides the modal on confirm/cancel — refresh on close.
        setTimeout(() => {
          const modal = document.getElementById('ci-modal');
          if (!modal) return;
          const obs = new MutationObserver(() => {
            if (modal.style.display === 'none') {
              obs.disconnect();
              setTimeout(() => load(_state.month), 250);
            }
          });
          obs.observe(modal, { attributes: true, attributeFilter: ['style'] });
        }, 250);
      });
    });
    main.querySelectorAll('._ky-copy-total').forEach(b => {
      b.addEventListener('click', async () => {
        const v = b.dataset.value;
        try {
          await navigator.clipboard.writeText(v);
          if (window.Toast && Toast.show) Toast.show('✓ Afritað: ' + v + ' kr');
        } catch (_) {}
      });
    });

    refreshBadge();
  }

  function renderCompany(grp) {
    // Sort sales chronological asc within the company card for easier review.
    const sales = grp.sales.slice().sort((a, b) => (a.created_at || '').localeCompare(b.created_at || ''));
    const ids = sales.map(s => s.id).join(',');
    const totalStr = String(Math.round(grp.sum));

    return `
      <div style="background:#fff;border:1px solid #e2e8f0;border-radius:10px;margin-bottom:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.04)">
        <div style="padding:12px 16px;background:linear-gradient(135deg,#f8fafc,#eff6ff);border-bottom:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap">
          <div>
            <div style="font-weight:800;color:#0f172a;font-size:15px">${esc(grp.display)}</div>
            <div style="font-size:11px;color:#64748b;margin-top:2px">${sales.length} kröfur ·
              ${grp.thisMonthSum > 0 ? '<span style="color:#1d4ed8">þessi mán: ' + fmtKr(grp.thisMonthSum) + '</span>' : ''}
              ${grp.thisMonthSum > 0 && grp.olderSum > 0 ? ' · ' : ''}
              ${grp.olderSum > 0 ? '<span style="color:#b45309">eldra: ' + fmtKr(grp.olderSum) + '</span>' : ''}
            </div>
          </div>
          <div style="display:flex;gap:8px;align-items:center">
            <div style="text-align:right">
              <div style="font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:.05em">Krafa</div>
              <div style="font-size:20px;font-weight:800;color:#1d4ed8;font-variant-numeric:tabular-nums">${fmtKr(grp.sum)}</div>
            </div>
            <button class="_ky-copy-total" data-value="${esc(totalStr)}" type="button" title="Afrita upphæð án vsk-formúleringa" style="padding:6px 9px;background:#fff;color:#475569;border:1px solid #cbd5e1;border-radius:6px;cursor:pointer;font:inherit;font-size:11px">📋</button>
            <button class="_ky-mark-all-paid" data-ids="${ids}" data-name="${esc(grp.display)}" type="button" title="Merkja allar kröfur sem greitt" style="padding:7px 12px;background:#f8fafc;color:#15803d;border:1.5px solid #86efac;border-radius:6px;cursor:pointer;font:inherit;font-size:12px;font-weight:700">✓ Allar greiddar</button>
          </div>
        </div>
        <div>
          ${sales.map(s => {
            const st = pickupStatus(s.num);
            const da = daysAgo(s.created_at);
            return `
              <div style="display:grid;grid-template-columns:100px 80px 1fr 90px 1fr auto;gap:10px;padding:9px 16px;border-bottom:1px solid #f1f5f9;font-size:12.5px;align-items:center">
                <div style="font-family:monospace;color:#475569">${esc(s.num || '')}</div>
                <div style="color:#64748b">${fmtDate(s.created_at)}</div>
                <div style="color:${st.color};font-weight:600">${st.icon} ${esc(st.label)}</div>
                <div style="color:#94a3b8;font-size:11px">${da != null ? da + ' d.' : ''}</div>
                <div style="text-align:right;font-weight:700;color:#0f172a;font-variant-numeric:tabular-nums">${fmtKr(s.samtals)}</div>
                <div style="display:flex;gap:4px">
                  ${s.krafa_sent_at
                    ? `<button class="_ky-krafa-toggle" data-id="${s.id}" data-on="1" type="button" title="Krafa send ${fmtDate(s.krafa_sent_at)} — smelltu til að afhaka" style="padding:5px 9px;background:#dcfce7;color:#14532d;border:1px solid #86efac;border-radius:5px;cursor:pointer;font:inherit;font-size:11px;font-weight:700;white-space:nowrap">🏦 ✓ Krafa send</button>`
                    : `<button class="_ky-krafa-toggle" data-id="${s.id}" type="button" title="Haka við þegar krafan hefur verið stofnuð í heimabankanum" style="padding:5px 9px;background:#fff;color:#475569;border:1px solid #cbd5e1;border-radius:5px;cursor:pointer;font:inherit;font-size:11px;font-weight:600;white-space:nowrap">🏦 Krafa send</button>`}
                  <button class="_ky-mark-paid" data-id="${s.id}" type="button" title="Merkja sem greitt" style="padding:5px 9px;background:#f8fafc;color:#15803d;border:1.5px solid #86efac;border-radius:5px;cursor:pointer;font:inherit;font-size:11px;font-weight:700">✓</button>
                  <button class="_ky-view-invoice" data-id="${s.id}" type="button" title="Skoða / prenta reikning" style="padding:5px 9px;background:#fff;color:#1d4ed8;border:1px solid #bfdbfe;border-radius:5px;cursor:pointer;font:inherit;font-size:11px">🖨</button>
                  <button class="_ky-open-editor" data-num="${esc(s.num)}" type="button" title="Opna í sölu-editor" style="padding:5px 9px;background:#fff;color:#475569;border:1px solid #cbd5e1;border-radius:5px;cursor:pointer;font:inherit;font-size:11px">✏️</button>
                  <button class="_ky-kredit" data-id="${s.id}" type="button" title="Kreditfæra reikninginn" style="padding:5px 9px;background:#fff7ed;color:#c2410c;border:1px solid #fed7aa;border-radius:5px;cursor:pointer;font:inherit;font-size:11px;font-weight:600">↩ Kredit</button>
                </div>
              </div>`;
          }).join('')}
        </div>
      </div>`;
  }

  // ── View invoice (SalaInvoice popup) ─────────────────────────────────────
  async function openInvoice(saleId) {
    const SB = getSB();
    if (!SB) return;
    if (!window.SalaInvoice || typeof SalaInvoice.renderFromSale !== 'function') {
      alert('Reikningsmótið er ekki tiltækt.'); return;
    }
    const w = window.open('', '_blank', 'width=900,height=1100');
    if (!w) { alert('Vinsamlegast leyfðu sprettiglugga til að prenta.'); return; }
    const r = await SB.from('solur').select('*').eq('id', saleId).single();
    if (r.error || !r.data) { w.close(); alert('Salan fannst ekki.'); return; }
    const sale = r.data;
    let cust = null;
    if (sale.customer_id) {
      const c1 = await SB.from('fyrirtaeki').select('kennitala,heimilisfang').eq('id', sale.customer_id).maybeSingle();
      if (c1.data) cust = c1.data;
      if (!cust) {
        const c2 = await SB.from('vidskiptavinir').select('kennitala,heimilisfang').eq('id', sale.customer_id).maybeSingle();
        if (c2.data) cust = c2.data;
      }
    }
    SalaInvoice.renderFromSale(w, sale, cust);
  }

  // ── Sidebar badge ────────────────────────────────────────────────────────
  async function refreshBadge() {
    const btn = document.querySelector('.vnav-btn[data-view="' + NAV_KEY + '"]');
    if (!btn) return;
    const SB = getSB();
    if (!SB) return;
    try {
      const r = await SB.from('solur').select('id', { count: 'exact', head: true })
        .eq('greitt_med', 'reikningur')
        .is('paid_at', null);
      const badge = btn.querySelector('.ky-badge');
      if (!badge) return;
      const n = r.count || 0;
      if (n > 0) {
        badge.textContent = String(n);
        badge.style.display = '';
      } else {
        badge.style.display = 'none';
      }
    } catch (_) {}
  }

  function show() {
    ensureView();
    // Try the normal route first…
    try { if (window.App && App.switchView) App.switchView(NAV_KEY); } catch (_) {}
    // …then, ONLY if that didn't activate our view (e.g. a later patch replaced
    // App.switchView without chaining our case → the core hid all views and
    // showed nothing, "shuts itself off"), force it the class-based way the
    // core uses — clearing stale inline display so nothing strands.
    const v = document.getElementById(VIEW_ID);
    if (v && !v.classList.contains('active')) {
      try {
        document.querySelectorAll('[id^="view-"]').forEach(x => { x.classList.remove('active'); x.style.display = ''; });
        v.classList.add('active'); v.style.display = 'block';
        document.querySelectorAll('.vnav-btn').forEach(b =>
          b.classList.toggle('active', b.getAttribute('data-view') === NAV_KEY));
      } catch (_) {}
    }
    load();
  }

  // 2026-06-13: keep the nav button alive. It must never be in sidebar_hidden
  // for it to "shut off" — but to be bulletproof against ANY patch removing it,
  // re-inject if it ever goes missing (injectNav is idempotent — it no-ops when
  // the button is already present, so this is cheap). Debounced so a burst of
  // nav mutations on load collapses into one check.
  function guardButton() {
    const nav = document.querySelector('nav.view-nav, .view-nav');
    if (!nav) { setTimeout(guardButton, 400); return; }
    let t = null;
    new MutationObserver(() => { clearTimeout(t); t = setTimeout(injectNav, 250); })
      .observe(nav, { childList: true, subtree: false });
  }

  injectNav();
  setTimeout(injectNav, 1000);
  setTimeout(injectNav, 3000);
  setTimeout(injectNav, 6000);
  guardButton();
  ensureView();
  patchSwitchView();
  setTimeout(refreshBadge, 2500);
  setTimeout(refreshBadge, 8000);
  document.addEventListener('sale-edited', () => setTimeout(refreshBadge, 600));

  window.KrofuYfirlit = { show, load, refreshBadge };
  console.log('[patch-166] Kröfu yfirlit installed — krafa í heimabanka per fyrirtæki');
})();
/* === END KRÖFU YFIRLIT === */
