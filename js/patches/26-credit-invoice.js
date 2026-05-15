/* === CREDIT INVOICE / KREDITREIKNINGUR v1 === */
/* Allows creating a credit note (negative invoice) against an existing sale.
 * Shows a "Kreditreikningur" button on every sale row in BokhaldsYfirlit.
 *
 * SQL required (run once in Supabase):
 *   ALTER TABLE solur ADD COLUMN IF NOT EXISTS credit_of BIGINT REFERENCES solur(id);
 *   ALTER TABLE solur ADD COLUMN IF NOT EXISTS is_credit BOOLEAN DEFAULT FALSE;
 *
 * When confirmed:
 *  • Inserts a new solur row with negative amounts, is_credit=true, credit_of=original_id
 *  • The original invoice's paid status is NOT changed automatically
 *  • Opens the receipt printer for the credit note
 *
 * The credit note is rendered just like a normal receipt but with
 * "KREDITREIKNINGUR" heading and negative amounts.
 */
(() => {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (window.__creditInvoiceInstalled) return;
  window.__creditInvoiceInstalled = true;

  function getSB() { return (window.DB && window.DB.sb) || null; }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c =>
      ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }
  function fmtKr(n) { return Math.round(Math.abs(n)).toLocaleString('is-IS') + ' kr'; }

  // ── CSS ───────────────────────────────────────────────────────────────────
  if (!document.getElementById('ci-style')) {
    const s = document.createElement('style');
    s.id = 'ci-style';
    s.textContent = `
      .ci-btn {
        padding: 3px 9px; background: #fff7ed; border: 1px solid #fed7aa;
        color: #c2410c; border-radius: 6px; font: inherit; font-size: 11px;
        font-weight: 600; cursor: pointer; white-space: nowrap;
      }
      .ci-btn:hover { background: #fff; border-color: #c2410c; }

      #ci-modal {
        position: fixed; inset: 0; z-index: 100010;
        display: flex; align-items: center; justify-content: center;
        font-family: inherit;
      }
      #ci-modal .ci-back { position: absolute; inset: 0; background: rgba(15,23,42,.6); }
      #ci-modal .ci-card {
        position: relative; background: #fff; border-radius: 14px;
        box-shadow: 0 20px 60px rgba(0,0,0,.3);
        width: min(500px,calc(100vw - 24px)); max-height: calc(100vh - 40px);
        overflow-y: auto;
      }
      #ci-modal .ci-head {
        display: flex; justify-content: space-between; align-items: center;
        padding: 16px 20px; border-bottom: 1px solid #e2e8f0;
        background: linear-gradient(135deg,#fff7ed,#fff);
      }
      #ci-modal .ci-head h3 { margin: 0; font-size: 17px; font-weight: 700; color: #9a3412; }
      #ci-modal .ci-x { background: none; border: none; font-size: 20px; color: #94a3b8; cursor: pointer; padding: 2px 8px; border-radius: 6px; }
      #ci-modal .ci-x:hover { background: #f1f5f9; }
      #ci-modal .ci-body { padding: 20px; }
      #ci-modal .ci-info-box {
        background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px;
        padding: 12px 14px; margin-bottom: 16px; font-size: 13px;
      }
      #ci-modal .ci-lines-table { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 14px; }
      #ci-modal .ci-lines-table th { background: #f8fafc; padding: 7px 10px; text-align: left; font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: .04em; border-bottom: 1px solid #e2e8f0; }
      #ci-modal .ci-lines-table th.r { text-align: right; }
      #ci-modal .ci-lines-table td { padding: 7px 10px; border-bottom: 1px solid #f1f5f9; }
      #ci-modal .ci-lines-table td.r { text-align: right; font-variant-numeric: tabular-nums; }
      #ci-modal .ci-lines-table .ci-check { width: 16px; height: 16px; cursor: pointer; }
      #ci-modal .ci-row { margin-bottom: 12px; }
      #ci-modal .ci-row label { display: block; font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: .05em; margin-bottom: 4px; }
      #ci-modal .ci-input { width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 7px; font: inherit; font-size: 13px; box-sizing: border-box; }
      #ci-modal .ci-input:focus { outline: none; border-color: #2563eb; }
      #ci-modal .ci-foot { display: flex; gap: 8px; justify-content: flex-end; padding: 12px 20px; border-top: 1px solid #e2e8f0; }
      #ci-modal .ci-cancel { padding: 9px 18px; border: 1px solid #cbd5e1; border-radius: 8px; background: #fff; cursor: pointer; font: inherit; font-size: 13px; color: #475569; }
      #ci-modal .ci-confirm { padding: 9px 18px; background: #c2410c; color: #fff; border: none; border-radius: 8px; cursor: pointer; font: inherit; font-size: 13px; font-weight: 600; }
      #ci-modal .ci-confirm:hover { background: #9a3412; }
      #ci-modal .ci-confirm:disabled { opacity: .5; cursor: not-allowed; }
    `;
    document.head.appendChild(s);
  }

  // ── Modal ─────────────────────────────────────────────────────────────────
  function buildModal() {
    if (document.getElementById('ci-modal')) return;
    const el = document.createElement('div');
    el.id = 'ci-modal';
    el.style.display = 'none';
    el.innerHTML = `
      <div class="ci-back"></div>
      <div class="ci-card">
        <div class="ci-head">
          <h3>Kreditreikningur</h3>
          <button class="ci-x" id="ci-x">✕</button>
        </div>
        <div class="ci-body" id="ci-body"></div>
        <div class="ci-foot">
          <button class="ci-cancel" id="ci-cancel">Hætta við</button>
          <button class="ci-confirm" id="ci-confirm">✓ Gefa út kreditreikning</button>
        </div>
      </div>`;
    document.body.appendChild(el);
    el.querySelector('.ci-back').onclick = closeCIModal;
    el.querySelector('#ci-x').onclick = closeCIModal;
    el.querySelector('#ci-cancel').onclick = closeCIModal;
  }

  function closeCIModal() {
    const el = document.getElementById('ci-modal');
    if (el) el.style.display = 'none';
  }

  // ── Open credit invoice dialog for a sale ─────────────────────────────────
  async function openCreditDialog(sale) {
    buildModal();
    const modal = document.getElementById('ci-modal');
    const body = document.getElementById('ci-body');
    const confirmBtn = document.getElementById('ci-confirm');

    const linur = Array.isArray(sale.lines) ? sale.lines : [];
    const lineRows = linur.map((l, i) => {
      const qty = +l.qty || 0;
      const unitEx = +l.unit_price_ex_vat || 0;
      const rate = +l.vsk_pct || 0;
      const lineInc = qty * unitEx * (1 + rate / 100);
      return `<tr>
        <td><input type="checkbox" class="ci-check" data-ci-line="${i}" checked></td>
        <td>${esc(l.desc || '')}</td>
        <td class="r">${qty}</td>
        <td class="r">${Math.round(unitEx).toLocaleString('is-IS')}</td>
        <td class="r">${rate}%</td>
        <td class="r" style="font-weight:600;">${Math.round(lineInc).toLocaleString('is-IS')}</td>
      </tr>`;
    }).join('');

    body.innerHTML = `
      <div class="ci-info-box">
        <strong>Upprunalegur reikningur:</strong> ${esc(sale.num || '')} &nbsp;|&nbsp;
        <strong>Viðskiptavinur:</strong> ${esc(sale.customer || '—')} &nbsp;|&nbsp;
        <strong>Upphæð:</strong> ${esc(fmtKr(sale.total))}
      </div>
      <p style="font-size:13px;color:#475569;margin:0 0 14px;">
        Veldu línur sem á að kreditfæra. Hægt er að velja hluta af reikningnum.
      </p>
      ${linur.length ? `<table class="ci-lines-table">
        <thead><tr><th></th><th>Lýsing</th><th class="r">Magn</th><th class="r">Einingaverð</th><th class="r">VSK</th><th class="r">Samtals</th></tr></thead>
        <tbody>${lineRows}</tbody>
      </table>` : '<p style="color:#94a3b8;font-style:italic;font-size:13px;">Engar línur</p>'}
      <div class="ci-row">
        <label>Ástæða kreditfærslu</label>
        <input id="ci-reason" type="text" class="ci-input" placeholder="t.d. Skilavara, rangur reikningur…">
      </div>`;

    modal.style.display = 'flex';

    confirmBtn.onclick = async () => {
      const reason = document.getElementById('ci-reason')?.value.trim() || '';
      // Collect checked lines
      const checkedLines = [];
      body.querySelectorAll('[data-ci-line]').forEach(cb => {
        if (cb.checked) {
          const idx = parseInt(cb.dataset.ciLine, 10);
          if (linur[idx]) checkedLines.push(linur[idx]);
        }
      });
      if (!checkedLines.length) {
        if (window.Toast && Toast.show) Toast.show('Veldu að minnsta kosti eina línu');
        return;
      }
      confirmBtn.disabled = true;
      confirmBtn.textContent = 'Bíð…';
      try {
        const creditSale = await createCreditNote(sale, checkedLines, reason);
        closeCIModal();
        if (window.Toast && Toast.show) Toast.show('✓ Kreditreikningur ' + (creditSale.num || '') + ' gefinn út');
        // Print receipt for the credit note
        setTimeout(() => printCreditNote(creditSale, sale), 300);
      } catch (e) {
        if (window.Toast && Toast.show) Toast.show('Villa: ' + (e.message || e));
        confirmBtn.disabled = false;
        confirmBtn.textContent = '✓ Gefa út kreditreikning';
      }
    };
  }

  // ── Create credit note in DB ──────────────────────────────────────────────
  async function createCreditNote(origSale, lines, reason) {
    const SB = getSB();
    if (!SB) throw new Error('Engin gagnabankatenging');

    // Build negative lines
    const creditLines = lines.map(l => ({
      ...l,
      qty: -(+l.qty || 0)
    }));
    const ex = creditLines.reduce((a, l) => a + (Math.abs(+l.qty||0) * (+l.unit_price_ex_vat||0)), 0);
    const vsk = creditLines.reduce((a, l) => a + (Math.abs(+l.qty||0) * (+l.unit_price_ex_vat||0) * ((+l.vsk_pct||0)/100)), 0);
    const total = -(ex + vsk);

    // Get next sale number
    const today = new Date();
    const prefix = 'K' + today.getFullYear().toString().slice(-2) + String(today.getMonth()+1).padStart(2,'0');
    const { data: latestData } = await SB
      .from('solur')
      .select('num')
      .like('num', prefix + '%')
      .order('num', { ascending: false })
      .limit(1);
    let seq = 1;
    if (latestData && latestData.length) {
      const m = (latestData[0].num || '').match(/(\d+)$/);
      if (m) seq = parseInt(m[1], 10) + 1;
    }
    const num = prefix + String(seq).padStart(3, '0');

    const row = {
      num,
      customer_id: origSale.customer_id || null,
      customer_nafn: origSale.customer || '',
      linur: creditLines,
      upphaed_an_vsk: -ex,
      vsk_upphaed: -vsk,
      samtals: total,
      greitt_med: origSale.payment || 'reikningur',
      athugasemdir: reason ? 'Kreditfærsla: ' + reason : 'Kreditfærsla á reikning ' + (origSale.num || ''),
      is_credit: true,
      credit_of: origSale.id
    };

    const { data, error } = await SB.from('solur').insert(row).select().single();
    if (error) {
      // 2026-05-12: Two distinct error shapes from Postgres/PostgREST when the
      // optional credit columns aren't present:
      //   - direct PG:   "column \"is_credit\" of relation \"solur\" does not exist"
      //   - PostgREST:   "Could not find the 'credit_of' column of 'solur' in the schema cache"
      // Match either so the fallback INSERT (without is_credit/credit_of) fires.
      const msg = (error.message || '') + ' ' + (error.details || '');
      const isMissingCol = /column.*does not exist/i.test(msg)
        || /could not find the.*column.*in the schema cache/i.test(msg)
        || /(is_credit|credit_of)/i.test(msg);
      if (isMissingCol) {
        delete row.is_credit; delete row.credit_of;
        const { data: d2, error: e2 } = await SB.from('solur').insert(row).select().single();
        if (e2) throw e2;
        return { ...d2, lines: creditLines, customer: origSale.customer };
      }
      throw error;
    }
    return { ...data, lines: creditLines, customer: origSale.customer };
  }

  // ── Print credit note ─────────────────────────────────────────────────────
  function printCreditNote(creditSale, origSale) {
    if (window.SalaInvoice && SalaInvoice.render) {
      const win = window.open('', 'credit-note', 'width=900,height=1100');
      if (!win) return;
      const opts = {
        num: creditSale.num,
        isCredit: true,
        creditOf: origSale.num,
        customer: creditSale.customer_nafn || creditSale.customer || '',
        lines: creditSale.lines || creditSale.linur || [],
        total: creditSale.samtals || creditSale.total || 0,
        ex: creditSale.upphaed_an_vsk || creditSale.ex || 0,
        vsk: creditSale.vsk_upphaed || creditSale.vsk || 0,
        notes: creditSale.athugasemdir || creditSale.notes || '',
        payment: creditSale.greitt_med || creditSale.payment || ''
      };
      SalaInvoice.render(win, opts);
    }
  }

  // ── Inject "Kreditreikningur" button into sale rows ───────────────────────
  // The BokhaldsYfirlit tbody uses event delegation; we piggyback by watching
  // for table rows that already have a "Merkja greitt" button (patch 20).
  // We inject our button next to that, or next to the payment pill.
  function injectCreditButtons() {
    // Check if by-table exists
    const tbody = document.getElementById('by-tbody');
    if (!tbody || tbody.dataset.ciHooked) return;
    tbody.dataset.ciHooked = '1';
    tbody.addEventListener('click', async e => {
      const btn = e.target.closest('.ci-btn[data-ci-sale]');
      if (!btn) return;
      e.stopPropagation();
      const id = btn.dataset.ciSale;
      // Find sale data — look in BokhaldsYfirlit's internal state or re-fetch
      let sale = null;
      try {
        const SB = getSB();
        if (SB) {
          const { data } = await SB
            .from('solur')
            .select('id,num,customer_nafn,customer_id,samtals,greitt_med,linur,upphaed_an_vsk,vsk_upphaed,created_at')
            .eq('id', id).single();
          if (data) {
            sale = {
              id: data.id, num: data.num, customer: data.customer_nafn,
              customer_id: data.customer_id, total: +(data.samtals||0),
              ex: +(data.upphaed_an_vsk||0), vsk: +(data.vsk_upphaed||0),
              lines: Array.isArray(data.linur) ? data.linur : [],
              payment: data.greitt_med
            };
          }
        }
      } catch (_) {}
      if (sale) openCreditDialog(sale);
    });
  }

  // Inject credit buttons into rendered rows via MutationObserver on tbody
  function injectCreditButtonsIntoRows() {
    const tbody = document.getElementById('by-tbody');
    if (!tbody) return;
    // Add a credit button to each sale row that doesn't have one yet
    tbody.querySelectorAll('tr.by-sale-row:not([data-ci-done])').forEach(tr => {
      const id = tr.dataset.id;
      if (!id) return;
      tr.dataset.ciDone = '1';
      // Find the last td
      const lastTd = tr.querySelector('td:last-child');
      if (!lastTd) return;
      const existing = lastTd.querySelector('.ci-btn');
      if (existing) return;
      const btn = document.createElement('button');
      btn.className = 'ci-btn';
      btn.dataset.ciSale = id;
      btn.title = 'Gefa út kreditreikning';
      btn.textContent = '↩ Kredit';
      lastTd.style.display = 'flex';
      lastTd.style.gap = '6px';
      lastTd.style.flexWrap = 'wrap';
      lastTd.style.alignItems = 'center';
      lastTd.appendChild(btn);
    });
  }

  // Watch for tbody changes
  const tbodyObs = new MutationObserver(() => {
    injectCreditButtons();
    injectCreditButtonsIntoRows();
  });
  function watchTbody() {
    const tbody = document.getElementById('by-tbody');
    if (tbody && !tbody.dataset.ciObserved) {
      tbody.dataset.ciObserved = '1';
      tbodyObs.observe(tbody, { childList: true, subtree: true });
      injectCreditButtons();
      injectCreditButtonsIntoRows();
    }
  }
  const docObs = new MutationObserver(watchTbody);
  docObs.observe(document.body, { childList: true, subtree: true });
  setTimeout(watchTbody, 1000);
  setTimeout(watchTbody, 3000);

  window.CreditInvoice = { open: openCreditDialog, print: printCreditNote };
  console.log('[credit-invoice] installed');
})();
/* === END CREDIT INVOICE === */
