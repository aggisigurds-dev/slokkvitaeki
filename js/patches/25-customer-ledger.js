/* === CUSTOMER LEDGER / VIÐSKIPTAVINALYKILL v1 === */
/* Per-customer running balance view. Shows all invoices issued to a company,
 * payments received, and outstanding balance. Accessible from:
 *  1. Company detail panel — "Lykill" tab button
 *  2. Sidebar nav button "Viðskiptavinalykill"
 *
 * Reads from solur + (if present) contact_log tables.
 * No schema changes required for basic view.
 * Uses paid_at column from patch 20 if it exists.
 */
(() => {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (window.__customerLedgerInstalled) return;
  window.__customerLedgerInstalled = true;

  const VIEW_ID = 'view-customer-ledger';

  function getSB() { return (window.DB && window.DB.sb) || null; }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c =>
      ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }
  function fmtKr(n) { return Math.round(n).toLocaleString('is-IS') + ' kr'; }
  function fmtDate(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    return d.getDate() + '.' + (d.getMonth()+1) + '.' + d.getFullYear();
  }

  // ── CSS ───────────────────────────────────────────────────────────────────
  if (!document.getElementById('led-style')) {
    const s = document.createElement('style');
    s.id = 'led-style';
    s.textContent = `
      #${VIEW_ID} { padding: 0; overflow-y: auto; }
      #${VIEW_ID} .led-wrap { max-width: 1000px; margin: 0 auto; padding: 20px 16px 40px; }
      #${VIEW_ID} .led-header h1 { margin: 0 0 18px; font-size: 22px; font-weight: 800; }
      #${VIEW_ID} .led-search-row { display: flex; gap: 8px; margin-bottom: 16px; }
      #${VIEW_ID} .led-search { flex: 1; padding: 9px 12px; border: 1px solid #cbd5e1; border-radius: 8px; font: inherit; font-size: 14px; }
      #${VIEW_ID} .led-search:focus { outline: none; border-color: #2563eb; }
      #${VIEW_ID} .led-co-list { display: flex; flex-direction: column; gap: 4px; max-height: 220px; overflow-y: auto; border: 1px solid #e2e8f0; border-radius: 8px; background: #fff; margin-bottom: 16px; }
      #${VIEW_ID} .led-co-item { padding: 9px 14px; cursor: pointer; font-size: 13px; color: #334155; border-bottom: 1px solid #f1f5f9; }
      #${VIEW_ID} .led-co-item:last-child { border-bottom: none; }
      #${VIEW_ID} .led-co-item:hover { background: #f1f5f9; }
      #${VIEW_ID} .led-co-item.active { background: #eff6ff; color: #1d4ed8; font-weight: 600; }
      #${VIEW_ID} .led-co-empty { padding: 20px; text-align: center; color: #94a3b8; font-style: italic; font-size: 13px; }
      #${VIEW_ID} .led-balance-bar {
        display: flex; gap: 16px; flex-wrap: wrap; margin-bottom: 18px;
        background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px 18px;
      }
      #${VIEW_ID} .led-balance-bar .bb-item .lbl { font-size: 10px; color: #64748b; text-transform: uppercase; font-weight: 700; letter-spacing: .05em; }
      #${VIEW_ID} .led-balance-bar .bb-item .val { font-size: 20px; font-weight: 800; margin-top: 3px; }
      #${VIEW_ID} .led-balance-bar .bb-item.debit .val { color: #dc2626; }
      #${VIEW_ID} .led-balance-bar .bb-item.credit .val { color: #16a34a; }
      #${VIEW_ID} .led-balance-bar .bb-item.outstanding .val { color: #d97706; }

      #${VIEW_ID} .led-table-wrap { background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; }
      #${VIEW_ID} table.led-table { width: 100%; border-collapse: collapse; font-size: 13px; }
      #${VIEW_ID} .led-table th { background: #f8fafc; padding: 9px 12px; text-align: left; font-size: 10px; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: .04em; border-bottom: 1px solid #e2e8f0; }
      #${VIEW_ID} .led-table td { padding: 9px 12px; border-bottom: 1px solid #f1f5f9; }
      #${VIEW_ID} .led-table tr:last-child td { border-bottom: none; }
      #${VIEW_ID} .led-table tr:hover td { background: #f8fafc; }
      #${VIEW_ID} .led-debit { color: #dc2626; font-weight: 600; }
      #${VIEW_ID} .led-credit { color: #16a34a; font-weight: 600; }
      #${VIEW_ID} .led-running { font-variant-numeric: tabular-nums; }
      #${VIEW_ID} .led-paid-pill { display: inline-block; padding: 1px 7px; border-radius: 99px; font-size: 10px; font-weight: 700; background: #dcfce7; color: #166534; }
      #${VIEW_ID} .led-unpaid-pill { display: inline-block; padding: 1px 7px; border-radius: 99px; font-size: 10px; font-weight: 700; background: #fee2e2; color: #dc2626; }
      #${VIEW_ID} .led-actions { display: flex; gap: 8px; margin-bottom: 14px; }
      #${VIEW_ID} .led-btn { padding: 7px 14px; background: #fff; border: 1px solid #cbd5e1; border-radius: 7px; font: inherit; font-size: 12px; cursor: pointer; color: #334155; }
      #${VIEW_ID} .led-btn:hover { background: #f1f5f9; }
      #${VIEW_ID} .led-btn.primary { background: #2563eb; color: #fff; border-color: #2563eb; }
      #${VIEW_ID} .led-btn.primary:hover { background: #1d4ed8; }
      #${VIEW_ID} .led-no-sel { padding: 60px; text-align: center; color: #94a3b8; font-style: italic; }

      /* Inline ledger inside company detail */
      .led-inline { margin-top: 14px; }
      .led-inline .led-table-wrap { border-radius: 8px; }
      .led-inline .led-balance-bar { border-radius: 8px; margin-bottom: 10px; }
    `;
    document.head.appendChild(s);
  }

  // ── Data ──────────────────────────────────────────────────────────────────
  async function loadForCompany(companyId) {
    const SB = getSB();
    if (!SB) return [];
    let data, error;
    try {
      // Try with paid_at
      const r = await SB
        .from('solur')
        .select('id,num,samtals,greitt_med,paid_at,paid_method,created_at,linur,athugasemdir,customer_nafn')
        .eq('customer_id', companyId)
        .order('created_at', { ascending: true });
      data = r.data; error = r.error;
    } catch (_) {
      const r2 = await SB
        .from('solur')
        .select('id,num,samtals,greitt_med,created_at,linur,athugasemdir,customer_nafn')
        .eq('customer_id', companyId)
        .order('created_at', { ascending: true });
      data = r2.data; error = r2.error;
    }
    if (error) { console.warn('[customer-ledger]', error.message); return []; }
    return (data || []).map(s => {
      // Unpaid if no paid_at AND payment method is one of the deferred-payment
      // codes (reikningur = invoice on credit, greitt_sidar = pay-on-pickup).
      const deferredPay = ['reikningur', 'greitt_sidar'];
      const isPaid = s.paid_at || (s.greitt_med && !deferredPay.includes(s.greitt_med));
      return {
        id: s.id, num: s.num || '', date: s.created_at,
        total: +(s.samtals || 0),
        payment: s.greitt_med || '', isPaid,
        paid_at: s.paid_at || null,
        paid_method: s.paid_method || s.greitt_med || '',
        notes: s.athugasemdir || ''
      };
    });
  }

  async function loadAllCustomers() {
    const SB = getSB();
    if (!SB) return [];
    // Get unique customers from solur
    const { data } = await SB
      .from('solur')
      .select('customer_id,customer_nafn')
      .not('customer_id', 'is', null);
    const seen = new Map();
    for (const row of (data || [])) {
      if (row.customer_id && !seen.has(row.customer_id)) {
        seen.set(row.customer_id, row.customer_nafn || '—');
      }
    }
    // Also load from fyrirtaeki
    const coData = await DB.fetchAll((from, to) => SB.from('fyrirtaeki').select('id,nafn').is('deleted_at', null).order('nafn').range(from, to));  // page through 1000-row cap
    for (const co of (coData || [])) {
      if (!seen.has(co.id)) seen.set(co.id, co.nafn || '—');
    }
    return [...seen.entries()].map(([id, nafn]) => ({ id, nafn })).sort((a, b) =>
      (a.nafn || '').localeCompare(b.nafn || '', 'is'));
  }

  // ── Render ledger for a company ─────────────────────────────────────────
  function renderLedger(rows, container) {
    if (!rows.length) {
      container.innerHTML = '<div style="padding:20px;text-align:center;color:#94a3b8;font-style:italic;">Engar sölur skráðar</div>';
      return;
    }
    let running = 0;
    const totalInvoiced = rows.reduce((a, r) => a + r.total, 0);
    const totalPaid = rows.filter(r => r.isPaid).reduce((a, r) => a + r.total, 0);
    const outstanding = totalInvoiced - totalPaid;

    const tableRows = rows.map(r => {
      running += r.total;
      const payPill = r.isPaid
        ? `<span class="led-paid-pill">Greitt</span>${r.paid_method ? ' ' + esc(r.paid_method) : ''}`
        : `<span class="led-unpaid-pill">Ógreitt</span>`;
      return `<tr>
        <td>${esc(fmtDate(r.date))}</td>
        <td>${esc(r.num)}</td>
        <td style="text-align:right;" class="led-debit">${esc(fmtKr(r.total))}</td>
        <td style="text-align:right;" class="${r.isPaid ? 'led-credit' : ''}">${r.isPaid ? esc(fmtKr(r.total)) : ''}</td>
        <td style="text-align:right;" class="led-running" style="color:${running > 0 && !r.isPaid ? '#dc2626' : '#334155'}">${esc(fmtKr(outstanding))}</td>
        <td>${payPill}</td>
        <td style="font-size:11px;color:#64748b;">${esc(r.notes)}</td>
      </tr>`;
    }).join('');

    container.innerHTML = `
      <div class="led-balance-bar">
        <div class="bb-item debit"><div class="lbl">Gefnir reikningar</div><div class="val">${fmtKr(totalInvoiced)}</div></div>
        <div class="bb-item credit"><div class="lbl">Mótteknar greiðslur</div><div class="val">${fmtKr(totalPaid)}</div></div>
        <div class="bb-item outstanding"><div class="lbl">Útistandandi</div><div class="val">${fmtKr(outstanding)}</div></div>
        <div class="bb-item"><div class="lbl">Sölur</div><div class="val" style="font-size:18px;color:#334155;">${rows.length}</div></div>
      </div>
      <div class="led-table-wrap">
        <table class="led-table">
          <thead><tr>
            <th>Dagsetning</th><th>Salnr.</th>
            <th style="text-align:right;">Reikningur</th>
            <th style="text-align:right;">Greiðsla</th>
            <th style="text-align:right;">Útistandandi</th>
            <th>Staða</th><th>Athugasemd</th>
          </tr></thead>
          <tbody>${tableRows}</tbody>
        </table>
      </div>`;
  }

  // ── Full-page view ────────────────────────────────────────────────────────
  let selectedCompany = null;
  let allCustomers = [];

  function buildViewHTML() {
    return `
      <main class="main-panel" style="overflow-y:auto;">
      <div class="led-wrap">
        <div class="led-header"><h1>📒 Viðskiptavinalykill</h1></div>
        <div class="led-search-row">
          <input type="search" id="led-search" class="led-search" placeholder="Leita að fyrirtæki eða viðskiptavin…">
        </div>
        <div id="led-co-list" class="led-co-list"></div>
        <div class="led-actions" id="led-actions" style="display:none;">
          <button id="led-csv-btn" class="led-btn primary">📥 CSV</button>
          <button id="led-refresh-btn" class="led-btn">🔄 Endurnýja</button>
        </div>
        <div id="led-detail"></div>
      </div>
      </main>`;
  }

  function renderCustomerList(q) {
    const list = document.getElementById('led-co-list');
    if (!list) return;
    const lower = (q || '').trim().toLowerCase();
    const visible = allCustomers.filter(c => !lower || c.nafn.toLowerCase().includes(lower));
    if (!visible.length) {
      list.innerHTML = '<div class="led-co-empty">Engir viðskiptavinir fundust</div>';
      return;
    }
    list.innerHTML = visible.map(c =>
      `<div class="led-co-item${selectedCompany && selectedCompany.id === c.id ? ' active' : ''}" data-led-co="${c.id}">${esc(c.nafn)}</div>`
    ).join('');
    list.querySelectorAll('[data-led-co]').forEach(el => {
      el.addEventListener('click', async () => {
        const id = parseInt(el.dataset.ledCo, 10);
        const co = allCustomers.find(c => c.id === id);
        selectedCompany = co;
        renderCustomerList(document.getElementById('led-search')?.value);
        document.getElementById('led-detail').innerHTML = '<div style="padding:20px;color:#64748b;">Hleður lykil…</div>';
        document.getElementById('led-actions').style.display = 'flex';
        const rows = await loadForCompany(id);
        const detail = document.getElementById('led-detail');
        if (detail) renderLedger(rows, detail);
      });
    });
  }

  async function initView() {
    allCustomers = await loadAllCustomers();
    const search = document.getElementById('led-search');
    if (search) {
      search.addEventListener('input', () => renderCustomerList(search.value));
    }
    renderCustomerList('');
    document.getElementById('led-csv-btn')?.addEventListener('click', async () => {
      if (!selectedCompany) return;
      const rows = await loadForCompany(selectedCompany.id);
      const header = ['Dagsetning','Salnúmer','Upphæð','Greitt','Staða','Greiðsluaðferð','Athugasemd'];
      const csvRows = rows.map(r => [
        fmtDate(r.date), r.num,
        String(Math.round(r.total)).replace('.',','),
        r.isPaid ? String(Math.round(r.total)).replace('.',',') : '',
        r.isPaid ? 'Greitt' : 'Ógreitt',
        r.paid_method, r.notes
      ]);
      const sep = ';';
      const csv = '﻿' + [header.join(sep), ...csvRows.map(r => r.map(v => {
        const sv = String(v == null ? '' : v);
        return /[";'\n]/.test(sv) ? '"' + sv.replace(/"/g,'""') + '"' : sv;
      }).join(sep))].join('\r\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'lykill-' + (selectedCompany.nafn || 'co').replace(/[^a-z0-9]/gi,'_') + '.csv';
      document.body.appendChild(a); a.click();
      setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    });
    document.getElementById('led-refresh-btn')?.addEventListener('click', async () => {
      allCustomers = await loadAllCustomers();
      renderCustomerList(document.getElementById('led-search')?.value);
    });
  }

  // ── Inject "Lykill" tab into company detail ───────────────────────────────
  function injectTabIntoDetail(companyId, detailEl) {
    if (!detailEl || detailEl.querySelector(`#led-tab-btn-${companyId}`)) return;
    let tabRow = detailEl.querySelector('.co-tabs');
    if (!tabRow) {
      tabRow = document.createElement('div');
      tabRow.className = 'co-tabs';
      tabRow.style.cssText = 'display:flex;gap:6px;padding:10px 16px 0;flex-wrap:wrap;';
      const first = detailEl.querySelector('.co-section, h3, .section, .detail-section');
      if (first) first.parentNode.insertBefore(tabRow, first);
      else detailEl.appendChild(tabRow);
    }
    const tabBtn = document.createElement('button');
    tabBtn.id = `led-tab-btn-${companyId}`;
    tabBtn.className = 'cl-tab-btn';
    tabBtn.textContent = '📒 Lykill';
    tabRow.appendChild(tabBtn);

    const panel = document.createElement('div');
    panel.id = `led-inline-${companyId}`;
    panel.className = 'led-inline';
    panel.style.cssText = 'padding:0 16px;display:none;';
    detailEl.appendChild(panel);

    let isOpen = false;
    tabBtn.addEventListener('click', async () => {
      isOpen = !isOpen;
      tabBtn.classList.toggle('active', isOpen);
      panel.style.display = isOpen ? '' : 'none';
      if (isOpen && !panel.dataset.loaded) {
        panel.innerHTML = '<div style="padding:14px;color:#64748b;font-size:13px;">Hleður lykil…</div>';
        panel.dataset.loaded = '1';
        const rows = await loadForCompany(parseInt(companyId, 10));
        renderLedger(rows, panel);
      }
    });
  }

  function hookOpenDetail() {
    if (!window.Companies || !Companies.openDetail) return;
    if (Companies.openDetail._ledHook) return;
    const orig = Companies.openDetail.bind(Companies);
    Companies.openDetail = function(id) {
      const ret = orig(id);
      setTimeout(() => {
        const detailPanels = document.querySelectorAll('[id^="co-detail"], .co-detail');
        detailPanels.forEach(p => { if (p.querySelector('h2,h3,.co-name')) injectTabIntoDetail(id, p); });
        // Generic search
        document.querySelectorAll('[class*="company-detail"], [id*="company-detail"]').forEach(p => {
          injectTabIntoDetail(id, p);
        });
      }, 400);
      return ret;
    };
    Companies.openDetail._ledHook = true;
  }

  hookOpenDetail();
  setTimeout(hookOpenDetail, 1000);
  setTimeout(hookOpenDetail, 2500);

  // ── View injection ──────────────────────────────────────────────────────
  function ensureView() {
    if (document.getElementById(VIEW_ID)) return;
    const views = document.querySelectorAll('.view');
    if (!views.length) return;
    const last = views[views.length - 1];
    const view = document.createElement('section');
    view.id = VIEW_ID; view.className = 'view';
    view.innerHTML = buildViewHTML();
    last.parentNode.insertBefore(view, last.nextSibling);
  }

  function ensureNavButton() {
    if (document.querySelector('[data-led-nav]')) return;
    const vidBtn = Array.from(document.querySelectorAll('.vnav-btn')).find(b => /Viðskiptavinir|Vidskiptavinir/i.test(b.textContent));
    if (!vidBtn || !vidBtn.parentElement) return;
    const btn = document.createElement('button');
    btn.className = 'vnav-btn';
    btn.setAttribute('data-led-nav', '1');
    btn.setAttribute('data-view', 'customer-ledger');
    btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px"><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/></svg>Viðskiptavinalykill`;
    btn.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); switchToView(); });
    vidBtn.parentElement.insertBefore(btn, vidBtn.nextSibling);
  }

  async function switchToView() {
    ensureView();
    document.querySelectorAll('.view.active').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.vnav-btn.active').forEach(b => b.classList.remove('active'));
    const view = document.getElementById(VIEW_ID);
    if (view) view.classList.add('active');
    const btn = document.querySelector('[data-led-nav]');
    if (btn) btn.classList.add('active');
    setTimeout(initView, 50);
  }

  ensureView();
  ensureNavButton();
  setTimeout(() => { ensureView(); ensureNavButton(); }, 700);
  setTimeout(() => { ensureView(); ensureNavButton(); }, 2200);
  const obs = new MutationObserver(() => { ensureView(); ensureNavButton(); hookOpenDetail(); });
  obs.observe(document.body, { childList: true, subtree: true });

  window.CustomerLedger = { open: switchToView };
  console.log('[customer-ledger] installed');
})();
/* === END CUSTOMER LEDGER === */
