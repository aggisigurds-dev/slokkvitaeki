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
      const rate = (l.vsk_pct == null ? 24 : +l.vsk_pct);
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

    // Reset the confirm button on every open. buildModal() builds the modal
    // once and reuses it, so the same #ci-confirm element persists across
    // opens — and the success path only calls closeCIModal() without restoring
    // the button, leaving it disabled + "Bíð…". Without this reset the NEXT
    // credit showed a stuck button until a full page reload. (Agnar 2026-08-19)
    confirmBtn.disabled = false;
    confirmBtn.textContent = '✓ Gefa út kreditreikning';

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
      qty: -(+l.qty || 0),
      // 2026-08-19: kreditlínur bera NETTÓ-verðið sem á að bakfæra (ratio-skalað að
      // neðan svo Σ línur === geymd heild). discount_pct má EKKI fylgja með — annars
      // les per-line grein Payday (payday-push buildPayload, Slice 3) afsláttinn OFAN Á
      // þegar-lækkað verð og tvöfaldar hann → kreditkrafan verður of lág (R-000178:
      // −8.774 í stað −10.968). Prentun sjálf-leiðréttir en bankakrafan ekki.
      discount_pct: 0
    }));
    // BUG-FIX 2026-07-07: the credit note must honour the ORIGINAL sale's
    // afsláttur. `linur` carry FULL unit prices (the discount lives only in the
    // sale's totals — see solur schema note), so summing line value straight
    // gives the pre-discount amount. Crediting a 25%-discounted 81.000 kr
    // invoice used to produce a −108.000 kr credit note. Instead:
    //   • crediting ALL lines → mirror the sale's stored discounted totals.
    //   • crediting SOME lines → scale the selected lines by the same
    //     discounted/full ratio the sale had.
    const selEx  = creditLines.reduce((a, l) => a + (Math.abs(+l.qty||0) * (+l.unit_price_ex_vat||0)), 0);
    const selVsk = creditLines.reduce((a, l) => a + (Math.abs(+l.qty||0) * (+l.unit_price_ex_vat||0) * ((l.vsk_pct == null ? 24 : +l.vsk_pct)/100)), 0);
    const fullEx = (Array.isArray(origSale.lines) ? origSale.lines : []).reduce(
      (a, l) => a + (Math.abs(+l.qty||0) * (+l.unit_price_ex_vat||0)), 0);
    const saleEx  = +origSale.ex  || 0;   // upphaed_an_vsk (POST-discount)
    const saleVsk = +origSale.vsk || 0;   // vsk_upphaed    (POST-discount)
    const isFull  = fullEx > 0.5 && Math.abs(selEx - fullEx) < 0.5;
    // 2026-07-08 (afsláttar-úttekt): bake the sale's discount ratio into the
    // credit LINE prices (unrounded, so Σ línur === stored totals) and store
    // afslattur: 0. The previous convention (full-price lines + NEGATIVE
    // afslattur) matched no branch in renderFromSale, so the printed
    // KREDITREIKNINGUR showed the PRE-discount amount (−108.000 instead of
    // −81.000) even though the booked row was right.
    const ratio = (saleEx > 0 && fullEx > 0.5) ? Math.min(1, saleEx / fullEx) : 1;
    if (ratio < 1) creditLines.forEach(l => { l.unit_price_ex_vat = (+l.unit_price_ex_vat || 0) * ratio; });
    const ex  = (isFull && saleEx > 0) ? saleEx  : Math.round(selEx * ratio);
    const vsk = (isFull && saleEx > 0) ? saleVsk : Math.round(selVsk * ratio);
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
      afslattur: 0,
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
  // 2026-05-29: render(win, opts) ignores opts.lines and reads the live POS
  // cart (empty here) → blank first print. Use renderFromSale instead, which
  // builds a synthetic POS state from the saved sale's `linur`. We forward
  // isCredit/creditOf so the heading shows "KREDITREIKNINGUR" + the credited
  // reference, and the negative amounts come straight from creditSale.linur.
  function printCreditNote(creditSale, origSale) {
    if (window.SalaInvoice && SalaInvoice.renderFromSale) {
      const win = window.open('', 'credit-note', 'width=900,height=1100');
      if (!win) return;
      // Normalise to the shape renderFromSale expects (it reads `linur`).
      const sale = {
        num: creditSale.num,
        customer_nafn: creditSale.customer_nafn || creditSale.customer || '',
        customer_id: creditSale.customer_id || null,
        linur: creditSale.linur || creditSale.lines || [],
        afslattur: creditSale.afslattur || 0,
        upphaed_an_vsk: creditSale.upphaed_an_vsk != null ? creditSale.upphaed_an_vsk : (creditSale.ex || 0),
        vsk_upphaed: creditSale.vsk_upphaed != null ? creditSale.vsk_upphaed : (creditSale.vsk || 0),
        samtals: creditSale.samtals != null ? creditSale.samtals : (creditSale.total || 0),
        athugasemdir: creditSale.athugasemdir || creditSale.notes || '',
        greitt_med: creditSale.greitt_med || creditSale.payment || '',
        starfsmadur: creditSale.starfsmadur || ''
      };
      SalaInvoice.renderFromSale(win, sale, null, {
        isCredit: true,
        creditOf: origSale.num
      });
    } else if (window.SalaInvoice && SalaInvoice.render) {
      // Fallback for older SalaInvoice without renderFromSale.
      const win = window.open('', 'credit-note', 'width=900,height=1100');
      if (!win) return;
      SalaInvoice.render(win, {
        num: creditSale.num,
        isCredit: true,
        creditOf: origSale.num,
        invoiceNum: creditSale.num,
        customerName: creditSale.customer_nafn || creditSale.customer || '',
        lines: creditSale.linur || creditSale.lines || [],
        notes: creditSale.athugasemdir || creditSale.notes || '',
        paymentMethod: creditSale.greitt_med || creditSale.payment || ''
      });
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
      const creBtn = e.target.closest('.cre-btn[data-cre-sale]');
      if (creBtn) {
        e.stopPropagation();
        let sale = null;
        try {
          const SB = getSB();
          if (SB) {
            const { data } = await SB.from('solur').select('*').eq('id', creBtn.dataset.creSale).single();
            if (data) sale = {
              id: data.id, num: data.num, customer: data.customer_nafn, customer_id: data.customer_id,
              customer_kt: data.customer_kt || null, total: +(data.samtals || 0), ex: +(data.upphaed_an_vsk || 0),
              vsk: +(data.vsk_upphaed || 0), lines: Array.isArray(data.linur) ? data.linur : [], payment: data.greitt_med
            };
          }
        } catch (_) {}
        if (sale) openCreditEditDialog(sale);
        return;
      }
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
      // 2026-06-23: "✏️ Kredit + breyta" — credit the original AND issue a new
      // corrected invoice (reopen lines editable → klára sölu → gamli kreditfærður).
      const btn2 = document.createElement('button');
      btn2.className = 'ci-btn cre-btn';
      btn2.dataset.creSale = id;
      btn2.title = 'Kreditfæra gamla reikninginn og gefa út nýjan, leiðréttan';
      btn2.style.cssText = 'background:#eff6ff;border-color:#bfdbfe;color:#1d4ed8';
      btn2.textContent = '✏️ Kredit + breyta';
      lastTd.appendChild(btn2);
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

  // ── 2026-06-23: Kreditfæra OG breyta — reopen the invoice lines editable,
  // issue a corrected NEW invoice, and full-credit the original. ──────────────
  function payOpt(v, label, cur) {
    const c = String(cur || '').toLowerCase();
    const sel = (c === v || (v === 'kort' && (c === 'kort' || c === 'card')) || (v === 'reidufe' && /rei[dð]uf|pening/.test(c))) ? ' selected' : '';
    return '<option value="' + v + '"' + sel + '>' + label + '</option>';
  }

  async function createCorrectedSale(origSale, lines, payMethod) {
    const SB = getSB(); if (!SB) throw new Error('Engin gagnabankatenging');
    // 2026-07-08: honour line discount_pct if present (defensive — the edit
    // dialog now bakes them) + vsk_pct null means 24%, not 0%.
    const ex = lines.reduce((a, l) => a + (+l.qty || 0) * (+l.unit_price_ex_vat || 0) * (1 - Math.max(0, Math.min(100, +l.discount_pct || 0)) / 100), 0);
    const vsk = lines.reduce((a, l) => a + (+l.qty || 0) * (+l.unit_price_ex_vat || 0) * (1 - Math.max(0, Math.min(100, +l.discount_pct || 0)) / 100) * (((l.vsk_pct == null ? 24 : +l.vsk_pct) || 0) / 100), 0);
    const paid = (payMethod !== 'reikningur' && payMethod !== 'greitt_sidar');
    const row = {
      starfsmadur: 'Kassi',
      customer_id: origSale.customer_id || null,
      customer_nafn: origSale.customer || '',
      customer_kt: origSale.customer_kt || null,
      linur: lines,
      upphaed_an_vsk: Math.round(ex),
      vsk_upphaed: Math.round(vsk),
      samtals: Math.round(ex) + Math.round(vsk),
      greitt_med: payMethod || 'reikningur',
      athugasemdir: 'Leiðréttur reikningur (kredit á ' + (origSale.num || '') + ')',
      status: 'final',
      paid_at: paid ? new Date().toISOString() : null
    };
    let r = await SB.from('solur').insert(row).select().single();
    if (r.error && /(status|customer_kt|paid_at).*(does not exist|schema cache)/i.test((r.error.message || '') + ' ' + (r.error.details || ''))) {
      delete row.status; delete row.customer_kt; delete row.paid_at;
      r = await SB.from('solur').insert(row).select().single();
    }
    if (r.error) throw r.error;
    return r.data;
  }

  function openCreditEditDialog(sale) {
    const old = document.getElementById('cre-modal'); if (old) old.remove();
    // 2026-07-08 (afsláttar-úttekt): carry the original sale's discounts into
    // the corrected invoice — per-line discount_pct is baked into the price
    // and the sale-level afslattur via the ex-ratio. Before, the corrected
    // invoice silently reissued at FULL price (credit −81.000 + new 108.000).
    const _dFullEx = (sale.lines || []).reduce((a, l) => {
      const d = Math.max(0, Math.min(100, +l.discount_pct || 0));
      return a + Math.abs(+l.qty || 0) * (+l.unit_price_ex_vat || 0) * (1 - d / 100);
    }, 0);
    const _dRatio = (+sale.ex > 0 && _dFullEx > 0.5) ? Math.min(1, (+sale.ex) / _dFullEx) : 1;
    let eLines = (sale.lines || []).map(l => {
      const d = Math.max(0, Math.min(100, +l.discount_pct || 0));
      return {
        desc: (l.desc || '') + (d > 0 ? ' · −' + d + '% afsl.' : ''),
        qty: +l.qty || 0,
        unit_price_ex_vat: Math.round((+l.unit_price_ex_vat || 0) * (1 - d / 100) * _dRatio),
        vsk_pct: (l.vsk_pct == null ? 24 : +l.vsk_pct), ref: l.ref || '', product_id: l.product_id, type: l.type
      };
    });
    const dlg = document.createElement('div');
    dlg.id = 'cre-modal';
    dlg.style.cssText = 'position:fixed;inset:0;z-index:100012;display:flex;align-items:center;justify-content:center;font-family:inherit';
    dlg.innerHTML =
      '<div style="position:absolute;inset:0;background:rgba(15,23,42,.6)" data-cre-back></div>' +
      '<div style="position:relative;background:#fff;border-radius:14px;box-shadow:0 20px 60px rgba(0,0,0,.3);width:min(620px,calc(100vw - 24px));max-height:calc(100vh - 40px);display:flex;flex-direction:column;overflow:hidden">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;padding:15px 20px;border-bottom:1px solid #e2e8f0;background:linear-gradient(135deg,#eff6ff,#fff)">' +
          '<h3 style="margin:0;font-size:17px;font-weight:700;color:#1e40af">✏️ Kreditfæra og breyta reikning</h3>' +
          '<button data-cre-x style="background:none;border:none;font-size:20px;color:#94a3b8;cursor:pointer;padding:2px 8px;border-radius:6px">✕</button>' +
        '</div>' +
        '<div style="padding:16px 20px;overflow-y:auto;flex:1">' +
          '<div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:11px 13px;margin-bottom:12px;font-size:13px;color:#1e3a8a"><b>Upprunalegur reikningur:</b> ' + esc(sale.num || '') + ' &nbsp;|&nbsp; <b>Viðskiptavinur:</b> ' + esc(sale.customer || '—') + ' &nbsp;|&nbsp; <b>Upphæð:</b> ' + fmtKr(sale.total) + '</div>' +
          '<p style="font-size:12.5px;color:#475569;margin:0 0 10px">Breyttu línunum og smelltu „Klára" — gamli reikningurinn verður kreditfærður og nýr, leiðréttur reikningur gefinn út.</p>' +
          '<div id="cre-lines"></div>' +
          '<button id="cre-add" type="button" style="margin-top:8px;padding:6px 12px;background:#f1f5f9;border:1px solid #cbd5e1;color:#334155;border-radius:7px;font:inherit;font-size:12.5px;font-weight:600;cursor:pointer">+ Bæta við línu</button>' +
          '<div style="display:flex;gap:14px;flex-wrap:wrap;margin-top:16px">' +
            '<div style="flex:1;min-width:150px"><label style="display:block;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px">Greiðslumáti</label>' +
              '<select id="cre-pay" style="width:100%;padding:8px 11px;border:1px solid #cbd5e1;border-radius:7px;font:inherit;font-size:13px;background:#fff">' + payOpt('kort', '💳 Kort', sale.payment) + payOpt('reidufe', '💵 Reiðufé', sale.payment) + payOpt('reikningur', '📋 Reikningur', sale.payment) + payOpt('greitt_sidar', '⏳ Greitt síðar', sale.payment) + '</select></div>' +
            '<div style="flex:2;min-width:190px"><label style="display:block;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px">Ástæða kreditfærslu</label>' +
              '<input id="cre-reason" type="text" placeholder="t.d. rangt magn, rangt verð…" style="width:100%;padding:8px 11px;border:1px solid #cbd5e1;border-radius:7px;font:inherit;font-size:13px;box-sizing:border-box"></div>' +
          '</div>' +
        '</div>' +
        '<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;padding:12px 20px;border-top:1px solid #e2e8f0;background:#f8fafc;flex-wrap:wrap">' +
          '<div style="font-size:13px;color:#475569">Nýr reikningur: <b id="cre-total" style="font-size:16px;color:#0f172a">0 kr</b></div>' +
          '<div style="display:flex;gap:8px"><button data-cre-cancel style="padding:9px 16px;border:1px solid #cbd5e1;border-radius:8px;background:#fff;cursor:pointer;font:inherit;font-size:13px;color:#475569">Hætta við</button>' +
            '<button id="cre-confirm" style="padding:9px 18px;background:#1d4ed8;color:#fff;border:none;border-radius:8px;cursor:pointer;font:inherit;font-size:13px;font-weight:700">✓ Klára — nýr reikningur + kredit</button></div>' +
        '</div>' +
      '</div>';
    document.body.appendChild(dlg);
    function close() { dlg.remove(); }
    dlg.querySelector('[data-cre-back]').onclick = close;
    dlg.querySelector('[data-cre-x]').onclick = close;
    dlg.querySelector('[data-cre-cancel]').onclick = close;

    const linesEl = dlg.querySelector('#cre-lines');
    function calc() { let ex = 0, vsk = 0; eLines.forEach(l => { const le = (+l.qty || 0) * (+l.unit_price_ex_vat || 0); ex += le; vsk += le * ((+l.vsk_pct || 0) / 100); }); return { ex, vsk, total: ex + vsk }; }
    function renderLines() {
      linesEl.innerHTML =
        '<div style="display:grid;grid-template-columns:1fr 52px 84px 84px 26px;gap:6px;font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.04em;padding:0 2px 5px"><div>Lýsing</div><div style="text-align:right">Magn</div><div style="text-align:right">Einingav.</div><div style="text-align:right">Samtals</div><div></div></div>' +
        eLines.map((l, i) => {
          const le = (+l.qty || 0) * (+l.unit_price_ex_vat || 0) * (1 + (+l.vsk_pct || 0) / 100);
          return '<div style="display:grid;grid-template-columns:1fr 52px 84px 84px 26px;gap:6px;align-items:center;margin-bottom:5px">' +
            '<input data-i="' + i + '" data-f="desc" value="' + esc(l.desc) + '" style="padding:6px 8px;border:1px solid #e2e8f0;border-radius:6px;font:inherit;font-size:12.5px;min-width:0">' +
            '<input data-i="' + i + '" data-f="qty" type="text" inputmode="decimal" value="' + esc(String(l.qty)) + '" style="padding:6px 4px;border:1px solid #e2e8f0;border-radius:6px;font:inherit;font-size:12.5px;text-align:right">' +
            '<input data-i="' + i + '" data-f="unit_price_ex_vat" type="text" inputmode="decimal" value="' + esc(String(l.unit_price_ex_vat)) + '" style="padding:6px 4px;border:1px solid #e2e8f0;border-radius:6px;font:inherit;font-size:12.5px;text-align:right">' +
            '<div class="cre-lt" style="text-align:right;font-size:12.5px;font-weight:600;font-variant-numeric:tabular-nums;white-space:nowrap">' + fmtKr(le) + '</div>' +
            '<button data-rm="' + i + '" title="Fjarlægja" style="background:none;border:none;color:#cbd5e1;font-size:16px;cursor:pointer;padding:0">✕</button>' +
          '</div>';
        }).join('');
      const tot = dlg.querySelector('#cre-total'); if (tot) tot.textContent = fmtKr(calc().total);
    }
    linesEl.addEventListener('input', e => {
      const inp = e.target.closest('input[data-i]'); if (!inp) return;
      const i = +inp.dataset.i, f = inp.dataset.f; if (!eLines[i]) return;
      if (f === 'desc') eLines[i].desc = inp.value;
      else { const raw = String(inp.value).replace(/[^0-9.,]/g, '').replace(',', '.'); eLines[i][f] = parseFloat(raw) || 0; }
      const rowEl = inp.closest('div[style*="grid-template-columns"]');
      const lt = rowEl && rowEl.querySelector('.cre-lt');
      if (lt) lt.textContent = fmtKr((+eLines[i].qty || 0) * (+eLines[i].unit_price_ex_vat || 0) * (1 + (+eLines[i].vsk_pct || 0) / 100));
      const tot = dlg.querySelector('#cre-total'); if (tot) tot.textContent = fmtKr(calc().total);
    });
    linesEl.addEventListener('click', e => { const rm = e.target.closest('[data-rm]'); if (!rm) return; eLines.splice(+rm.dataset.rm, 1); renderLines(); });
    dlg.querySelector('#cre-add').onclick = () => { eLines.push({ desc: '', qty: 1, unit_price_ex_vat: 0, vsk_pct: 24 }); renderLines(); };
    renderLines();

    dlg.querySelector('#cre-confirm').onclick = async () => {
      const cbtn = dlg.querySelector('#cre-confirm');
      const lines = eLines.filter(l => (+l.qty || 0) !== 0 && (l.desc || '').trim());
      if (!lines.length) { if (window.Toast && Toast.show) Toast.show('Engar gildar línur'); return; }
      const payMethod = dlg.querySelector('#cre-pay').value;
      const reason = (dlg.querySelector('#cre-reason').value || '').trim();
      cbtn.disabled = true; cbtn.textContent = 'Vinn…';
      try {
        const newSale = await createCorrectedSale(sale, lines, payMethod);
        try {
          await createCreditNote(sale, sale.lines || [], reason || ('Leiðrétt → ' + (newSale.num || '')));
        } catch (ce) {
          alert('Nýr reikningur ' + (newSale.num || '') + ' búinn til, EN kreditfærsla á ' + (sale.num || '') + ' mistókst: ' + ((ce && ce.message) || ce) + '\nNotaðu „↩ Kredit" takkann handvirkt á gamla reikninginn.');
        }
        close();
        if (window.Toast && Toast.show) Toast.show('✓ Nýr reikningur ' + (newSale.num || '') + ' · gamli ' + (sale.num || '') + ' kreditfærður');
        try { if (window.BokhaldsYfirlit && BokhaldsYfirlit.refresh) BokhaldsYfirlit.refresh(); } catch (_) {}
        setTimeout(() => { try { if (window.SalaInvoice && SalaInvoice.renderFromSale) { const w = window.open('', 'corrected', 'width=900,height=1100'); if (w) SalaInvoice.renderFromSale(w, newSale, null, {}); } } catch (_) {} }, 300);
      } catch (e) {
        cbtn.disabled = false; cbtn.textContent = '✓ Klára — nýr reikningur + kredit';
        alert('Villa: ' + ((e && e.message) || e));
      }
    };
  }

  window.CreditInvoice = { open: openCreditDialog, openEdit: openCreditEditDialog, print: printCreditNote };
  console.log('[credit-invoice] installed');
})();
/* === END CREDIT INVOICE === */
