/* === MARK INVOICE PAID v1 === */
/* Adds a "Merkja sem greitt" (Mark as paid) workflow to unpaid invoices.
 *
 * What counts as an unpaid invoice: solur rows where greitt_med = 'reikningur'
 * AND paid_at IS NULL.
 *
 * SQL required (run once in Supabase SQL editor):
 *   ALTER TABLE solur ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;
 *   ALTER TABLE solur ADD COLUMN IF NOT EXISTS paid_method TEXT;
 *
 * Features:
 *  • "Ógreiddir reikningar" badge on the Tekjur nav button (count + red dot)
 *  • In Tekjur / BokhaldsYfirlit rows: unpaid invoice rows get a red "Ógreitt"
 *    pill and a "Merkja greitt" button
 *  • Clicking opens a tiny modal: confirm payment method + date → writes
 *    paid_at + paid_method back to supabase
 *  • A standalone "Ógreiddir" panel is exposed as window.InvoicePaid for
 *    other patches (aging report) to query
 */
(() => {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (window.__markInvoicePaidInstalled) return;
  window.__markInvoicePaidInstalled = true;

  function getSB() {
    return (window.DB && window.DB.sb) || null;
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c =>
      ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }
  function today() {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
  }

  // ── CSS ─────────────────────────────────────────────────────────────────
  if (!document.getElementById('mip-style')) {
    const s = document.createElement('style');
    s.id = 'mip-style';
    s.textContent = `
      .mip-unpaid-pill {
        display: inline-block; padding: 2px 8px; border-radius: 99px;
        background: #fee2e2; color: #dc2626;
        font-size: 11px; font-weight: 700; letter-spacing: 0.02em;
      }
      .mip-paid-pill {
        display: inline-block; padding: 2px 8px; border-radius: 99px;
        background: #dcfce7; color: #166534;
        font-size: 11px; font-weight: 700;
      }
      .mip-btn {
        padding: 3px 10px; background: #fff; border: 1px solid #dc2626;
        color: #dc2626; border-radius: 6px; font: inherit; font-size: 11px;
        font-weight: 600; cursor: pointer; white-space: nowrap;
      }
      .mip-btn:hover { background: #fee2e2; }

      /* ── Mark-paid modal ── */
      #mip-modal {
        position: fixed; inset: 0; z-index: 100010;
        display: flex; align-items: center; justify-content: center;
        font-family: inherit;
      }
      #mip-modal .mip-back { position: absolute; inset: 0; background: rgba(15,23,42,.55); }
      #mip-modal .mip-card {
        position: relative; background: #fff; border-radius: 14px;
        box-shadow: 0 20px 60px rgba(0,0,0,.28);
        width: min(420px, calc(100vw - 24px)); padding: 0;
        overflow: hidden;
      }
      #mip-modal .mip-head {
        display: flex; justify-content: space-between; align-items: center;
        padding: 16px 20px; border-bottom: 1px solid #e2e8f0;
      }
      #mip-modal .mip-head h3 { margin: 0; font-size: 17px; color: #0f172a; font-weight: 700; }
      #mip-modal .mip-x {
        background: none; border: none; font-size: 20px;
        color: #94a3b8; cursor: pointer; padding: 2px 8px; border-radius: 6px;
      }
      #mip-modal .mip-x:hover { background: #f1f5f9; }
      #mip-modal .mip-body { padding: 20px; }
      #mip-modal .mip-row { margin-bottom: 14px; }
      #mip-modal .mip-row label { display: block; font-size: 11px; font-weight: 700;
        color: #64748b; text-transform: uppercase; letter-spacing: .05em; margin-bottom: 5px; }
      #mip-modal .mip-input {
        width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 8px;
        font: inherit; font-size: 14px; box-sizing: border-box;
      }
      #mip-modal .mip-input:focus { outline: none; border-color: #2563eb; }
      #mip-modal .mip-foot {
        display: flex; gap: 8px; justify-content: flex-end;
        padding: 12px 20px; border-top: 1px solid #e2e8f0;
      }
      #mip-modal .mip-cancel {
        padding: 9px 18px; border: 1px solid #cbd5e1; border-radius: 8px;
        background: #fff; cursor: pointer; font: inherit; font-size: 13px;
        color: #475569;
      }
      #mip-modal .mip-confirm {
        padding: 9px 18px; background: #16a34a; color: #fff;
        border: none; border-radius: 8px; cursor: pointer;
        font: inherit; font-size: 13px; font-weight: 600;
      }
      #mip-modal .mip-confirm:hover { background: #15803d; }
      #mip-modal .mip-confirm:disabled { opacity: .5; cursor: not-allowed; }
      #mip-modal .mip-sale-info {
        background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px;
        padding: 12px 14px; margin-bottom: 16px; font-size: 13px;
      }
      #mip-modal .mip-sale-info strong { font-weight: 700; }

      /* ── Unpaid summary panel ── */
      #mip-panel {
        background: #fff; border: 1px solid #fca5a5; border-radius: 12px;
        margin: 16px; padding: 0; overflow: hidden;
      }
      #mip-panel .mip-panel-hd {
        background: #fef2f2; border-bottom: 1px solid #fca5a5;
        padding: 10px 16px; font-size: 13px; font-weight: 700; color: #991b1b;
        display: flex; justify-content: space-between; align-items: center;
      }
      #mip-panel table { width: 100%; border-collapse: collapse; font-size: 13px; }
      #mip-panel th {
        background: #f8fafc; text-align: left; padding: 8px 12px;
        font-size: 10px; font-weight: 700; color: #64748b;
        text-transform: uppercase; letter-spacing: .04em;
        border-bottom: 1px solid #e2e8f0;
      }
      #mip-panel td { padding: 9px 12px; border-bottom: 1px solid #f1f5f9; }
      #mip-panel tr:last-child td { border-bottom: none; }
    `;
    document.head.appendChild(s);
  }

  // ── Modal ────────────────────────────────────────────────────────────────
  let _modalResolve = null;

  function buildModal() {
    if (document.getElementById('mip-modal')) return;
    const el = document.createElement('div');
    el.id = 'mip-modal';
    el.style.display = 'none';
    el.innerHTML = `
      <div class="mip-back"></div>
      <div class="mip-card">
        <div class="mip-head">
          <h3>Merkja reikning sem greiddan</h3>
          <button class="mip-x" id="mip-x">✕</button>
        </div>
        <div class="mip-body">
          <div class="mip-sale-info" id="mip-sale-info"></div>
          <div class="mip-row">
            <label>Greiðsluaðferð</label>
            <select id="mip-method" class="mip-input">
              <option value="Bankayfirfærsla">Bankayfirfærsla</option>
              <option value="Kort">Kort</option>
              <option value="Reiðufé">Reiðufé</option>
              <option value="Nettógreiðsla">Nettógreiðsla</option>
              <option value="Annað">Annað</option>
            </select>
          </div>
          <div class="mip-row">
            <label>Dagsetning greiðslu</label>
            <input type="date" id="mip-date" class="mip-input">
          </div>
          <div class="mip-row">
            <label>Athugasemd (valfrjálst)</label>
            <input type="text" id="mip-notes" class="mip-input" placeholder="t.d. tilvísunarnúmer">
          </div>
        </div>
        <div class="mip-foot">
          <button class="mip-cancel" id="mip-cancel">Hætta við</button>
          <button class="mip-confirm" id="mip-confirm">✓ Merkja greitt</button>
        </div>
      </div>`;
    document.body.appendChild(el);

    const close = () => {
      el.style.display = 'none';
      if (_modalResolve) { _modalResolve(null); _modalResolve = null; }
    };
    el.querySelector('.mip-back').onclick = close;
    el.querySelector('#mip-x').onclick = close;
    el.querySelector('#mip-cancel').onclick = close;
    el.querySelector('#mip-confirm').onclick = async () => {
      const method = document.getElementById('mip-method').value;
      const date = document.getElementById('mip-date').value;
      const notes = document.getElementById('mip-notes').value.trim();
      if (_modalResolve) {
        _modalResolve({ method, date, notes });
        _modalResolve = null;
      }
      el.style.display = 'none';
    };
  }

  function openModal(sale) {
    buildModal();
    const el = document.getElementById('mip-modal');
    if (!el) return Promise.resolve(null);
    document.getElementById('mip-date').value = today();
    document.getElementById('mip-notes').value = '';
    const fmtKr = n => Math.round(n).toLocaleString('is-IS') + ' kr';
    document.getElementById('mip-sale-info').innerHTML = `
      <strong>Salnúmer:</strong> ${esc(sale.num || '')} &nbsp;|&nbsp;
      <strong>Viðskiptavinur:</strong> ${esc(sale.customer || '—')} &nbsp;|&nbsp;
      <strong>Upphæð:</strong> ${esc(fmtKr(sale.total || 0))}
      ${sale.created_at ? '<br><small style="color:#64748b;">Dagsetning: ' + esc(sale.created_at.slice(0,10)) + '</small>' : ''}
    `;
    el.style.display = 'flex';
    return new Promise(resolve => { _modalResolve = resolve; });
  }

  // ── Core mark-paid logic ─────────────────────────────────────────────────
  async function markPaid(saleId, method, date, notes) {
    const SB = getSB();
    if (!SB) throw new Error('Engin gagnabankatenging');
    const update = {
      paid_at: date ? new Date(date).toISOString() : new Date().toISOString(),
      paid_method: method
    };
    if (notes) update.athugasemdir = notes;
    const { error } = await SB.from('solur').update(update).eq('id', saleId);
    if (error) throw error;
  }

  // ── Exposed API ──────────────────────────────────────────────────────────
  async function triggerMarkPaid(sale, onDone) {
    const result = await openModal(sale);
    if (!result) return;
    const SB = getSB();
    if (!SB) { Toast && Toast.show && Toast.show('Engin tenging'); return; }
    try {
      await markPaid(sale.id, result.method, result.date, result.notes);
      sale.paid_at = result.date;
      sale.paid_method = result.method;
      if (window.Toast && Toast.show) Toast.show('✓ Reikningur merktur sem greiddur');
      if (typeof onDone === 'function') onDone(sale);
    } catch (e) {
      if (window.Toast && Toast.show) Toast.show('Villa: ' + (e.message || e));
    }
  }

  // ── Load unpaid invoices ─────────────────────────────────────────────────
  // "Unpaid" means either:
  //   - greitt_med = 'reikningur'    (Krafa í banka — invoice on account)
  //   - greitt_med = 'greitt_sidar'  ("Greitt síðar" — pay-later flag)
  // …AND paid_at IS NULL (not yet marked paid).
  let _unpaid = [];
  async function loadUnpaid() {
    const SB = getSB();
    if (!SB) return [];
    try {
      const { data, error } = await SB
        .from('solur')
        .select('id,num,customer_nafn,customer_id,samtals,greitt_med,paid_at,paid_method,created_at,linur,upphaed_an_vsk,vsk_upphaed')
        .in('greitt_med', ['reikningur', 'greitt_sidar'])
        .is('paid_at', null)
        .order('created_at', { ascending: true });
      if (error) throw error;
      _unpaid = (data || []).map(s => ({
        id: s.id,
        num: s.num || '',
        customer: s.customer_nafn || '',
        customer_id: s.customer_id,
        total: +(s.samtals || 0),
        ex: +(s.upphaed_an_vsk || 0),
        vsk: +(s.vsk_upphaed || 0),
        payment: s.greitt_med || '',
        paid_at: s.paid_at || null,
        created_at: s.created_at
      }));
    } catch (e) {
      console.warn('[mark-invoice-paid] loadUnpaid:', e.message);
    }
    return _unpaid;
  }

  // ── Unpaid panel injected into Tekjur / Bókhalds views ──────────────────
  function fmtDate(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    return d.getDate() + '.' + (d.getMonth()+1) + '.' + d.getFullYear();
  }
  function daysSince(iso) {
    if (!iso) return 0;
    return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  }
  function ageClass(days) {
    if (days > 90) return 'color:#7f1d1d;font-weight:700';
    if (days > 60) return 'color:#991b1b;font-weight:600';
    if (days > 30) return 'color:#dc2626';
    return 'color:#64748b';
  }
  function fmtKr(n) {
    return Math.round(n).toLocaleString('is-IS') + ' kr';
  }

  function renderUnpaidPanel(container) {
    if (!container) return;
    let panel = document.getElementById('mip-panel');
    if (!panel) {
      panel = document.createElement('div');
      panel.id = 'mip-panel';
      container.prepend(panel);
    }
    if (!_unpaid.length) {
      panel.innerHTML = '';
      panel.style.display = 'none';
      return;
    }
    panel.style.display = '';
    const total = _unpaid.reduce((a, s) => a + s.total, 0);
    const rows = _unpaid.map(s => {
      const days = daysSince(s.created_at);
      return `<tr>
        <td>${esc(s.num)}</td>
        <td>${esc(s.customer || '—')}</td>
        <td>${esc(fmtDate(s.created_at))}</td>
        <td style="${ageClass(days)}">${days} dagar</td>
        <td style="text-align:right;font-weight:600;">${esc(fmtKr(s.total))}</td>
        <td><button class="mip-btn" data-mip-id="${s.id}">Merkja greitt</button></td>
      </tr>`;
    }).join('');
    panel.innerHTML = `
      <div class="mip-panel-hd">
        <span>Ógreiddir reikningar (${_unpaid.length})</span>
        <span style="font-weight:800;">${esc(fmtKr(total))}</span>
      </div>
      <table>
        <thead><tr>
          <th>Númer</th><th>Viðskiptavinur</th><th>Dagsetning</th><th>Aldur</th>
          <th style="text-align:right;">Upphæð</th><th></th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>`;
    panel.querySelectorAll('.mip-btn[data-mip-id]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = parseInt(btn.dataset.mipId, 10);
        const sale = _unpaid.find(s => s.id === id);
        if (!sale) return;
        await triggerMarkPaid(sale, () => {
          _unpaid = _unpaid.filter(s => s.id !== id);
          renderUnpaidPanel(container);
          updateNavBadge();
        });
      });
    });
  }

  // ── Nav badge ────────────────────────────────────────────────────────────
  function updateNavBadge() {
    const n = _unpaid.length;
    const btn = document.querySelector('.vnav-btn[data-view="income"]');
    if (!btn) return;
    let badge = btn.querySelector('.sb-badge.mip-badge');
    if (!badge) {
      badge = document.createElement('span');
      badge.className = 'sb-badge mip-badge';
      btn.appendChild(badge);
    }
    badge.textContent = n;
    badge.style.display = n ? 'inline-flex' : 'none';
    badge.style.background = n > 0 ? '#dc2626' : '';
  }

  // ── Hook into views ──────────────────────────────────────────────────────
  async function refresh() {
    await loadUnpaid();
    updateNavBadge();
    const inc = document.getElementById('view-income');
    if (inc && inc.classList.contains('active')) {
      const main = inc.querySelector('.main-panel, main') || inc;
      renderUnpaidPanel(main);
    }
    const by = document.getElementById('view-bokhalds-yfirlit');
    if (by && by.classList.contains('active')) {
      const main = by.querySelector('.main-panel, main') || by;
      renderUnpaidPanel(main);
    }
  }

  document.addEventListener('view-shown', e => {
    if (e.detail && (e.detail.name === 'income' || e.detail.name === 'bokhalds-yfirlit')) {
      setTimeout(async () => {
        await loadUnpaid();
        updateNavBadge();
        const view = document.getElementById('view-' + e.detail.name);
        const main = view && (view.querySelector('.main-panel, main') || view);
        renderUnpaidPanel(main);
      }, 300);
    }
  });

  // Initial load
  setTimeout(async () => {
    await loadUnpaid();
    updateNavBadge();
  }, 3000);

  setInterval(async () => {
    await loadUnpaid();
    updateNavBadge();
  }, 60000);

  window.InvoicePaid = {
    loadUnpaid,
    getUnpaid: () => _unpaid,
    markPaid: triggerMarkPaid,
    refresh
  };

  console.log('[mark-invoice-paid] installed');
})();
/* === END MARK INVOICE PAID === */
