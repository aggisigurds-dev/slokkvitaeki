/* === TIL AÐ RUKKA v1 ===
 *
 * Mánaðar-billing summary. Lists every unpaid sale (greitt_med =
 * 'greitt_sidar' or 'reikningur') with a clear pickup status pulled
 * from verkbeidnir, grouped by customer with a big "to-bill" total
 * at the top.
 *
 * Solves the user's pain points:
 *   1. "I have no idea how much the bill is that we need to send"
 *      → one big number at the top of the page (total to bill)
 *   2. "greitt síðar doesn't say if the guy has come to pick it up
 *      or if it is still unpicked up at the shop"
 *      → pickup status icon per sale: 🏪 Hjá þér / ✅ Sótt / 💰 Greitt
 *
 * Sidebar entry "🧾 Til að rukka" appears just below Drög.
 *
 * Actions per row:
 *   • Merkja sem greitt (paid_at = now)
 *   • Opna í Bókhaldi (jump to Bókhalds yfirlit detail)
 *   • Open sale-editor (re-edit lines / kreditfæra)
 */
(() => {
  if (window.__tilRukkunInstalled) return;
  window.__tilRukkunInstalled = true;

  const VIEW_ID = 'view-til-rukkun';
  const NAV_KEY = 'til-rukkun';

  // Helpers
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

  // ── Sidebar entry ───────────────────────────────────────────────────────
  function injectNav() {
    const nav = document.querySelector('nav.view-nav, .view-nav');
    if (!nav) { setTimeout(injectNav, 500); return; }
    if (nav.querySelector('[data-view="' + NAV_KEY + '"]')) return;
    const drogBtn = Array.from(nav.querySelectorAll('.vnav-btn'))
      .find(b => /Drög/.test(b.textContent || ''));
    const tpl = drogBtn || nav.querySelector('.vnav-btn');
    if (!tpl) { setTimeout(injectNav, 500); return; }
    const btn = document.createElement('button');
    btn.className = (tpl.className || 'vnav-btn').replace(/\bactive\b/g, '').trim();
    btn.setAttribute('data-view', NAV_KEY);
    btn.innerHTML = '<span style="margin-right:6px">🧾</span>Til að rukka <span class="tr-badge" style="margin-left:auto;background:#dc2626;color:#fff;font-size:10px;font-weight:700;padding:1px 7px;border-radius:99px;display:none"></span>';
    btn.style.display = 'flex';
    btn.style.alignItems = 'center';
    btn.addEventListener('click', e => {
      e.preventDefault(); e.stopPropagation();
      if (window.App && App.switchView) App.switchView(NAV_KEY);
      else show();
    });
    // Insert AFTER Drög
    if (drogBtn && drogBtn.parentNode) drogBtn.parentNode.insertBefore(btn, drogBtn.nextSibling);
    else nav.appendChild(btn);
  }

  // ── View container ──────────────────────────────────────────────────────
  function ensureView() {
    if (document.getElementById(VIEW_ID)) return;
    const sample = document.getElementById('view-counter') || document.getElementById('view-sala');
    if (!sample || !sample.parentElement) return;
    const v = document.createElement('div');
    v.id = VIEW_ID;
    v.className = sample.className.replace(/\bactive\b/g, '').trim();
    v.innerHTML = '<main id="tr-main" class="main-panel"></main>';
    sample.parentElement.appendChild(v);
  }

  // ── Hook into App.switchView ────────────────────────────────────────────
  function patchSwitchView() {
    if (!window.App || window.App._trSwitchPatched) return;
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
    window.App._trSwitchPatched = true;
  }

  // ── Data load ───────────────────────────────────────────────────────────
  let _state = { month: null, all: [], vbByParent: {} };

  function monthBounds(d) {
    const start = new Date(d.getFullYear(), d.getMonth(), 1);
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    return { start, end };
  }

  async function load(filterMonth) {
    const main = document.getElementById('tr-main');
    if (!main) return;
    main.innerHTML = '<div style="padding:32px;text-align:center;color:#94a3b8">Hleður reikningum…</div>';
    const SB = getSB();
    if (!SB) { main.innerHTML = '<div style="padding:32px;color:#dc2626">Engin gagnabankatenging.</div>'; return; }

    // Default: current month
    const m = filterMonth || new Date();
    _state.month = m;
    const { start, end } = monthBounds(m);

    // 1. Unpaid sales (greitt_sidar + reikningur) — both this month AND
    //    older outstanding ones (so you don't lose track of what's owed)
    const r = await SB.from('solur')
      .select('id,num,customer_nafn,customer_id,samtals,greitt_med,athugasemdir,created_at,paid_at,is_credit,credit_of')
      .in('greitt_med', ['greitt_sidar', 'reikningur'])
      .is('paid_at', null)
      .order('created_at', { ascending: false });
    if (r.error) { main.innerHTML = '<div style="padding:32px;color:#dc2626">Villa: ' + esc(r.error.message) + '</div>'; return; }
    _state.all = r.data || [];

    // 2. Look up verkbeidnir for pickup status. Match by parent num.
    //    We query all R- prefixed verkbeidnir since the dataset is small.
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
    if (!statuses.length) return { label: '?', icon: 'ℹ️', color: '#94a3b8', cls: 'unknown' };
    const allCollected = statuses.every(s => s === 'collected' || s === 'done');
    const anyAtShop = statuses.some(s => s === 'received' || s === 'ready' || s === 'inprogress');
    if (allCollected) return { label: 'Sótt', icon: '✅', color: '#16a34a', cls: 'collected' };
    if (anyAtShop) return { label: 'Hjá þér', icon: '🏪', color: '#f59e0b', cls: 'atshop' };
    return { label: '—', icon: '·', color: '#94a3b8', cls: 'mixed' };
  }

  // ── Render ──────────────────────────────────────────────────────────────
  function render() {
    const main = document.getElementById('tr-main');
    if (!main) return;
    const all = _state.all;
    const { start, end } = monthBounds(_state.month);

    // Bucket: thisMonth-toBill (picked up), thisMonth-atShop (not yet),
    //         older-toBill, older-atShop
    const thisMonth = [];
    const older = [];
    all.forEach(s => {
      const t = new Date(s.created_at).getTime();
      if (t >= start.getTime() && t < end.getTime()) thisMonth.push(s);
      else older.push(s);
    });

    function partition(arr) {
      const toBill = [], atShop = [], unknown = [];
      arr.forEach(s => {
        const st = pickupStatus(s.num);
        if (st.cls === 'collected') toBill.push(s);
        else if (st.cls === 'atshop') atShop.push(s);
        else unknown.push(s);
      });
      return { toBill, atShop, unknown };
    }

    const tm = partition(thisMonth);
    const ol = partition(older);

    function sum(arr) { return arr.reduce((s, x) => s + (parseFloat(x.samtals) || 0), 0); }
    const billNowTotal = sum(tm.toBill) + sum(ol.toBill);
    const stillAtShopTotal = sum(tm.atShop) + sum(ol.atShop);
    const unknownTotal = sum(tm.unknown) + sum(ol.unknown);
    const grandTotal = billNowTotal + stillAtShopTotal + unknownTotal;

    const monthLabel = _state.month.toLocaleDateString('en-GB', { year: 'numeric' }) + ' · ' +
      ['Janúar','Febrúar','Mars','Apríl','Maí','Júní','Júlí','Ágúst','September','Október','Nóvember','Desember'][_state.month.getMonth()];

    main.innerHTML = `
      <div style="max-width:1200px;margin:0 auto;padding:22px">

        <!-- Header -->
        <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:14px;margin-bottom:18px">
          <div>
            <h1 style="margin:0;font-size:22px;color:#0f172a;display:flex;align-items:center;gap:10px">🧾 Til að rukka</h1>
            <div style="font-size:12px;color:#64748b;margin-top:2px">Ógreidd sala — krafa í heimabanka og greitt síðar</div>
          </div>
          <div style="display:flex;gap:8px;align-items:center">
            <button class="_tr-prev" type="button" style="padding:7px 11px;border:1px solid #cbd5e1;border-radius:7px;background:#fff;cursor:pointer;font:inherit;font-size:13px">◀</button>
            <div style="font-size:13px;font-weight:700;color:#0f172a;padding:0 8px;min-width:140px;text-align:center">${esc(monthLabel)}</div>
            <button class="_tr-next" type="button" style="padding:7px 11px;border:1px solid #cbd5e1;border-radius:7px;background:#fff;cursor:pointer;font:inherit;font-size:13px">▶</button>
          </div>
        </div>

        <!-- Big summary tiles -->
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px;margin-bottom:22px">
          <div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:18px;box-shadow:0 1px 3px rgba(0,0,0,.04);border-left:4px solid #dc2626">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
              <div style="width:32px;height:32px;border-radius:8px;background:#fee2e2;display:flex;align-items:center;justify-content:center;font-size:18px">🧾</div>
              <div style="font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:.05em;font-weight:600">Til að rukka núna</div>
            </div>
            <div style="font-size:26px;font-weight:800;color:#dc2626">${fmtKr(billNowTotal)}</div>
            <div style="font-size:11px;color:#94a3b8;margin-top:2px">${tm.toBill.length + ol.toBill.length} reikningar · sótt</div>
          </div>
          <div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:18px;box-shadow:0 1px 3px rgba(0,0,0,.04);border-left:4px solid #f59e0b">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
              <div style="width:32px;height:32px;border-radius:8px;background:#fef3c7;display:flex;align-items:center;justify-content:center;font-size:18px">🏪</div>
              <div style="font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:.05em;font-weight:600">Bíður (hjá þér)</div>
            </div>
            <div style="font-size:26px;font-weight:800;color:#f59e0b">${fmtKr(stillAtShopTotal)}</div>
            <div style="font-size:11px;color:#94a3b8;margin-top:2px">${tm.atShop.length + ol.atShop.length} reikningar · ekki sótt</div>
          </div>
          ${unknownTotal !== 0 ? `
          <div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:18px;box-shadow:0 1px 3px rgba(0,0,0,.04);border-left:4px solid #94a3b8">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
              <div style="width:32px;height:32px;border-radius:8px;background:#f1f5f9;display:flex;align-items:center;justify-content:center;font-size:18px">ℹ️</div>
              <div style="font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:.05em;font-weight:600">Engin verkbeiðni</div>
            </div>
            <div style="font-size:26px;font-weight:800;color:#475569">${fmtKr(unknownTotal)}</div>
            <div style="font-size:11px;color:#94a3b8;margin-top:2px">${tm.unknown.length + ol.unknown.length} sölur · óþekkt</div>
          </div>` : ''}
          <div style="background:linear-gradient(135deg,#0f172a,#1e293b);color:#fff;border-radius:12px;padding:18px;box-shadow:0 1px 3px rgba(0,0,0,.04)">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
              <div style="width:32px;height:32px;border-radius:8px;background:rgba(255,255,255,.1);display:flex;align-items:center;justify-content:center;font-size:18px">💰</div>
              <div style="font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:.05em;font-weight:600">Útistandandi samtals</div>
            </div>
            <div style="font-size:26px;font-weight:800">${fmtKr(grandTotal)}</div>
            <div style="font-size:11px;color:#cbd5e1;margin-top:2px">${all.length} sölur ógreiddar</div>
          </div>
        </div>

        <!-- This month section -->
        ${renderSection(monthLabel + ' (þessi mánuður)', tm)}

        <!-- Older outstanding (other months) -->
        ${ol.toBill.length + ol.atShop.length + ol.unknown.length > 0
          ? renderSection('🕓 Eldri ógreitt', ol, true)
          : ''}

      </div>`;

    // Wire month navigation
    main.querySelector('._tr-prev')?.addEventListener('click', () => {
      const m = new Date(_state.month);
      m.setMonth(m.getMonth() - 1);
      load(m);
    });
    main.querySelector('._tr-next')?.addEventListener('click', () => {
      const m = new Date(_state.month);
      m.setMonth(m.getMonth() + 1);
      load(m);
    });

    // Per-row action handlers
    main.querySelectorAll('._tr-mark-paid').forEach(b => {
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
    main.querySelectorAll('._tr-open-editor').forEach(b => {
      b.addEventListener('click', () => {
        const num = b.dataset.num;
        if (window.SaleEditor && SaleEditor.openByNum) SaleEditor.openByNum(num);
      });
    });
    main.querySelectorAll('._tr-view-invoice').forEach(b => {
      b.addEventListener('click', () => openInvoice(b.dataset.id));
    });
    main.querySelectorAll('._tr-switch-method').forEach(b => {
      b.addEventListener('click', async () => {
        const id = b.dataset.id;
        const to = b.dataset.to;
        const label = to === 'reikningur' ? 'Í reikning (krafa í heimabanka)' : 'Greitt síðar';
        if (!confirm('Færa þessa sölu yfir í "' + label + '"?')) return;
        const SB = getSB();
        const r = await SB.from('solur').update({ greitt_med: to }).eq('id', id);
        if (r.error) { alert('Villa: ' + r.error.message); return; }
        if (window.Toast && Toast.show) Toast.show('✓ Færð í: ' + label);
        document.dispatchEvent(new CustomEvent('sale-edited'));
        await load(_state.month);
        refreshBadge();
      });
    });
    main.querySelectorAll('._tr-open-bokhald').forEach(b => {
      b.addEventListener('click', () => {
        if (window.App && App.switchView) App.switchView('bokhalds-yfirlit');
      });
    });

    refreshBadge();
  }

  function renderSection(title, partitioned, isOlder) {
    const { toBill, atShop, unknown } = partitioned;
    if (!toBill.length && !atShop.length && !unknown.length) return '';

    function customerGroups(arr) {
      const map = {};
      arr.forEach(s => {
        const key = normName(s.customer_nafn) || '(ekkert nafn)';
        const display = s.customer_nafn || '(ekkert nafn)';
        if (!map[key]) map[key] = { display, sales: [], sum: 0 };
        map[key].sales.push(s);
        map[key].sum += parseFloat(s.samtals) || 0;
      });
      return Object.values(map).sort((a, b) => b.sum - a.sum);
    }

    function renderGroup(grp) {
      return `
        <div style="background:#fff;border:1px solid #e2e8f0;border-radius:9px;margin-bottom:10px;overflow:hidden">
          <div style="padding:10px 14px;background:#f8fafc;border-bottom:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center;gap:10px">
            <div style="font-weight:700;color:#0f172a;font-size:13.5px">${esc(grp.display)}</div>
            <div style="font-weight:800;color:#dc2626;font-variant-numeric:tabular-nums">${fmtKr(grp.sum)}</div>
          </div>
          ${grp.sales.map(s => {
            const st = pickupStatus(s.num);
            const da = daysAgo(s.created_at);
            return `
              <div style="display:grid;grid-template-columns:90px 80px 1fr 110px 90px 1fr auto;gap:10px;padding:9px 14px;border-bottom:1px solid #f1f5f9;font-size:12.5px;align-items:center">
                <div style="font-family:monospace;color:#475569">${esc(s.num)}</div>
                <div style="color:#64748b">${fmtDate(s.created_at)}</div>
                <div style="color:${st.color};font-weight:600">${st.icon} ${esc(st.label)}</div>
                <div style="color:#475569;font-size:11px">${esc(s.greitt_med === 'reikningur' ? 'Krafa í banka' : 'Greitt síðar')}</div>
                <div style="color:#94a3b8;font-size:11px">${da != null ? da + ' d.' : ''}</div>
                <div style="text-align:right;font-weight:700;color:#0f172a;font-variant-numeric:tabular-nums">${fmtKr(s.samtals)}</div>
                <div style="display:flex;gap:4px">
                  <button class="_tr-mark-paid" data-id="${s.id}" type="button" title="Merkja sem greitt" style="padding:5px 9px;background:#16a34a;color:#fff;border:none;border-radius:5px;cursor:pointer;font:inherit;font-size:11px;font-weight:600">✓ Greitt</button>
                  ${s.greitt_med === 'greitt_sidar'
                    ? `<button class="_tr-switch-method" data-id="${s.id}" data-to="reikningur" type="button" title="Færa yfir í Kröfu yfirlit (krafa í heimabanka)" style="padding:5px 9px;background:#dbeafe;color:#1e40af;border:1px solid #bfdbfe;border-radius:5px;cursor:pointer;font:inherit;font-size:11px;font-weight:600">→ Í reikning</button>`
                    : ''}
                  <button class="_tr-view-invoice" data-id="${s.id}" type="button" title="Skoða / prenta reikning" style="padding:5px 9px;background:#fff;color:#1d4ed8;border:1px solid #bfdbfe;border-radius:5px;cursor:pointer;font:inherit;font-size:11px">🖨</button>
                  <button class="_tr-open-editor" data-num="${esc(s.num)}" type="button" title="Opna í sölu-editor" style="padding:5px 9px;background:#fff;color:#475569;border:1px solid #cbd5e1;border-radius:5px;cursor:pointer;font:inherit;font-size:11px">✏️</button>
                </div>
              </div>`;
          }).join('')}
        </div>`;
    }

    const blocks = [];
    if (toBill.length) {
      blocks.push(`
        <div style="margin-bottom:18px">
          <div style="font-size:13px;font-weight:700;color:#dc2626;text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px;padding-bottom:4px;border-bottom:1.5px solid #fecaca">🧾 Tilbúið að senda í banka — sótt (${toBill.length})</div>
          ${customerGroups(toBill).map(renderGroup).join('')}
        </div>`);
    }
    if (atShop.length) {
      blocks.push(`
        <div style="margin-bottom:18px">
          <div style="font-size:13px;font-weight:700;color:#f59e0b;text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px;padding-bottom:4px;border-bottom:1.5px solid #fde68a">🏪 Bíður — enn í verkstæði (${atShop.length})</div>
          ${customerGroups(atShop).map(renderGroup).join('')}
        </div>`);
    }
    if (unknown.length) {
      blocks.push(`
        <div style="margin-bottom:18px">
          <div style="font-size:13px;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px;padding-bottom:4px;border-bottom:1.5px solid #e2e8f0">ℹ️ Engin verkbeiðni tengd (${unknown.length})</div>
          ${customerGroups(unknown).map(renderGroup).join('')}
        </div>`);
    }

    return `
      <div style="margin-top:${isOlder ? '28' : '14'}px">
        <h2 style="margin:0 0 12px;font-size:15px;font-weight:700;color:#0f172a">${esc(title)}</h2>
        ${blocks.join('')}
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
      // fyrirtaeki + vidskiptavinir have independent bigserials → low ids
      // overlap. Pull both and disambiguate by matching sale.customer_nafn.
      const [fRes, vRes] = await Promise.all([
        SB.from('fyrirtaeki').select('nafn,kennitala,heimilisfang').eq('id', sale.customer_id).maybeSingle(),
        SB.from('vidskiptavinir').select('nafn,kennitala,heimilisfang').eq('id', sale.customer_id).maybeSingle(),
      ]);
      const f = fRes.data, v = vRes.data;
      const norm = s => String(s || '').trim().toLowerCase();
      const saleNafn = norm(sale.customer_nafn);
      if (saleNafn) {
        if (f && norm(f.nafn) === saleNafn) cust = f;
        else if (v && norm(v.nafn) === saleNafn) cust = v;
      }
      if (!cust) cust = f || v || null;
    }
    SalaInvoice.renderFromSale(w, sale, cust);
  }

  // ── Sidebar badge (count of items currently to-bill) ───────────────────
  async function refreshBadge() {
    const btn = document.querySelector('.vnav-btn[data-view="' + NAV_KEY + '"]');
    if (!btn) return;
    const SB = getSB();
    if (!SB) return;
    try {
      const r = await SB.from('solur').select('id', { count: 'exact', head: true })
        .in('greitt_med', ['greitt_sidar', 'reikningur'])
        .is('paid_at', null);
      const badge = btn.querySelector('.tr-badge');
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

  // ── Boot ────────────────────────────────────────────────────────────────
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
  // Refresh badge when a sale gets edited (patch 142 fires this)
  document.addEventListener('sale-edited', () => setTimeout(refreshBadge, 600));

  window.TilRukkun = { show, load, refreshBadge };
  console.log('[patch-152] Til að rukka installed — sidebar entry + view + monthly summary');
})();
/* === END TIL AÐ RUKKA === */
