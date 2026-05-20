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
      if (window.App && App.switchView) App.switchView(NAV_KEY);
      else show();
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
        document.querySelectorAll('[id^="view-"]').forEach(v => {
          v.style.display = 'none';
          v.classList.remove('active');
        });
        const v = document.getElementById(VIEW_ID);
        if (v) { v.style.display = 'block'; v.classList.add('active'); }
        document.querySelectorAll('.vnav-btn').forEach(b => b.classList.toggle('active', b.dataset.view === NAV_KEY));
        load();
        return;
      }
      return orig.apply(this, arguments);
    };
    window.App._kySwitchPatched = true;
  }

  // ── Data load ────────────────────────────────────────────────────────────
  let _state = { month: null, all: [], vbByParent: {} };

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
    const r = await SB.from('solur')
      .select('id,num,customer_nafn,customer_id,samtals,greitt_med,athugasemdir,created_at,paid_at,is_credit,credit_of')
      .eq('greitt_med', 'reikningur')
      .is('paid_at', null)
      .order('created_at', { ascending: false });
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
      if (!grouped[key]) grouped[key] = { display, id: s.customer_id || null, sales: [], sum: 0, thisMonthSum: 0, olderSum: 0 };
      grouped[key].sales.push(s);
      grouped[key].sum += parseFloat(s.samtals) || 0;
      const t = new Date(s.created_at).getTime();
      if (t >= start.getTime() && t < end.getTime()) grouped[key].thisMonthSum += parseFloat(s.samtals) || 0;
      else grouped[key].olderSum += parseFloat(s.samtals) || 0;
    });
    const companies = Object.values(grouped).sort((a, b) => b.sum - a.sum);

    const monthLabel = _state.month.getFullYear() + ' · ' +
      ['Janúar','Febrúar','Mars','Apríl','Maí','Júní','Júlí','Ágúst','September','Október','Nóvember','Desember'][_state.month.getMonth()];

    main.innerHTML = `
      <div style="max-width:1200px;margin:0 auto;padding:22px">

        <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:14px;margin-bottom:18px">
          <div>
            <h1 style="margin:0;font-size:22px;color:#0f172a;display:flex;align-items:center;gap:10px">📋 Kröfu yfirlit</h1>
            <div style="font-size:12px;color:#64748b;margin-top:2px">Krafa í heimabanka — sölur með greitt_med = "Senda reikning" sem þarf að safna saman í lok mánaðar</div>
          </div>
          <div style="display:flex;gap:8px;align-items:center">
            <button class="_ky-prev" type="button" style="padding:7px 11px;border:1px solid #cbd5e1;border-radius:7px;background:#fff;cursor:pointer;font:inherit;font-size:13px">◀</button>
            <div style="font-size:13px;font-weight:700;color:#0f172a;padding:0 8px;min-width:140px;text-align:center">${esc(monthLabel)}</div>
            <button class="_ky-next" type="button" style="padding:7px 11px;border:1px solid #cbd5e1;border-radius:7px;background:#fff;cursor:pointer;font:inherit;font-size:13px">▶</button>
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
            <button class="_ky-mark-all-paid" data-ids="${ids}" data-name="${esc(grp.display)}" type="button" style="padding:7px 12px;background:#16a34a;color:#fff;border:none;border-radius:6px;cursor:pointer;font:inherit;font-size:12px;font-weight:700">✓ Allar greiddar</button>
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
                  <button class="_ky-mark-paid" data-id="${s.id}" type="button" title="Merkja sem greitt" style="padding:5px 9px;background:#16a34a;color:#fff;border:none;border-radius:5px;cursor:pointer;font:inherit;font-size:11px;font-weight:600">✓</button>
                  <button class="_ky-open-editor" data-num="${esc(s.num)}" type="button" title="Opna í sölu-editor" style="padding:5px 9px;background:#fff;color:#475569;border:1px solid #cbd5e1;border-radius:5px;cursor:pointer;font:inherit;font-size:11px">✏️</button>
                </div>
              </div>`;
          }).join('')}
        </div>
      </div>`;
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
    if (window.App && App.switchView) App.switchView(NAV_KEY);
    else load();
  }

  injectNav();
  setTimeout(injectNav, 1000);
  ensureView();
  patchSwitchView();
  setTimeout(refreshBadge, 2500);
  setTimeout(refreshBadge, 8000);
  document.addEventListener('sale-edited', () => setTimeout(refreshBadge, 600));

  window.KrofuYfirlit = { show, load, refreshBadge };
  console.log('[patch-166] Kröfu yfirlit installed — krafa í heimabanka per fyrirtæki');
})();
/* === END KRÖFU YFIRLIT === */
