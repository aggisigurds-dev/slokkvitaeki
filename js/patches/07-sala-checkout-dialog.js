/* === SALA CHECKOUT DIALOG v1 === */
/* Intercepts the GREIÐA button on Sala. Shows a modal with:
   - Payment method (Greitt með korti / Greitt með pening)
   - Optional: Prenta kvittun (receipt)
   - Optional: Prenta strikamerki fyrir tæki (barcode labels for the items)
   On confirm: optionally prints, then continues to the original sale flow.
   Cart lines starting with 🛒 = physical product (gets a barcode label).
   Cart lines starting with 🔧 = service (no label needed). */
(() => {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (window.__salaCheckoutInstalled) return;
  window.__salaCheckoutInstalled = true;

  const STYLE_ID = 'sala-checkout-style';
  const MODAL_ID = 'sala-pay-modal';

  // --- styles ---
  if (!document.getElementById(STYLE_ID)) {
    const s = document.createElement('style');
    s.id = STYLE_ID;
    s.textContent = `
      #${MODAL_ID} {
        position: fixed; inset: 0; z-index: 100000;
        display: flex; align-items: center; justify-content: center;
        font-family: inherit;
      }
      #${MODAL_ID} .scd-back {
        position: absolute; inset: 0; background: rgba(15,23,42,0.55);
      }
      #${MODAL_ID} .scd-card {
        position: relative; background: #fff; border-radius: 14px;
        box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        max-width: 460px; width: calc(100% - 32px);
        max-height: calc(100vh - 32px); overflow-y: auto;
      }
      #${MODAL_ID} .scd-head {
        display: flex; justify-content: space-between; align-items: center;
        padding: 16px 20px 12px; border-bottom: 1px solid #e2e8f0;
      }
      #${MODAL_ID} .scd-head h3 {
        margin: 0; font-size: 18px; color: #0f172a; font-weight: 600;
      }
      #${MODAL_ID} .scd-x {
        background: none; border: none; font-size: 24px; line-height: 1;
        color: #94a3b8; cursor: pointer; padding: 4px 8px; border-radius: 6px;
      }
      #${MODAL_ID} .scd-x:hover { background: #f1f5f9; color: #475569; }
      #${MODAL_ID} .scd-body { padding: 16px 20px; }
      #${MODAL_ID} .scd-amount {
        text-align: center; font-size: 32px; font-weight: 700; color: #0f172a;
        padding: 8px 0 20px; letter-spacing: -0.02em;
      }
      #${MODAL_ID} .scd-section { margin-bottom: 18px; }
      #${MODAL_ID} .scd-section:last-child { margin-bottom: 0; }
      #${MODAL_ID} .scd-section-title {
        font-size: 11px; font-weight: 600; color: #64748b;
        text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px;
      }
      #${MODAL_ID} .scd-methods {
        display: grid; grid-template-columns: 1fr 1fr; gap: 10px;
      }
      #${MODAL_ID} .scd-method {
        display: flex; flex-direction: column; align-items: center;
        gap: 6px; padding: 16px 10px;
        background: #f8fafc; border: 2px solid #e2e8f0;
        border-radius: 10px; cursor: pointer;
        font-family: inherit; font-size: 14px; font-weight: 600; color: #0f172a;
        transition: all .15s ease;
      }
      #${MODAL_ID} .scd-method:hover {
        background: #eff6ff; border-color: #3b82f6; transform: translateY(-1px);
      }
      #${MODAL_ID} .scd-method:active { transform: translateY(0); }
      #${MODAL_ID} .scd-method[data-method="kort"]:hover { border-color: #2563eb; }
      #${MODAL_ID} .scd-method[data-method="pening"]:hover { border-color: #16a34a; background: #f0fdf4; }
      #${MODAL_ID} .scd-method[data-method="reikningur"]:hover { border-color: #b45309; background: #fffbeb; }
      #${MODAL_ID} .scd-method[data-method="greitt_sidar"]:hover { border-color: #ea580c; background: #fff7ed; }
      #${MODAL_ID} .scd-icon { font-size: 28px; line-height: 1; }
      #${MODAL_ID} .scd-check {
        display: flex; align-items: center; gap: 10px;
        padding: 10px 12px; background: #f8fafc; border: 1px solid #e2e8f0;
        border-radius: 8px; cursor: pointer; font-size: 14px; color: #0f172a;
        margin-bottom: 6px; user-select: none; transition: background .15s;
      }
      #${MODAL_ID} .scd-check:hover { background: #eff6ff; }
      #${MODAL_ID} .scd-check input { width: 18px; height: 18px; cursor: pointer; margin: 0; }
      #${MODAL_ID} .scd-check.disabled { opacity: 0.5; cursor: not-allowed; }
      #${MODAL_ID} .scd-cart {
        background: #f8fafc; border-radius: 8px; padding: 10px 12px;
        font-size: 12px; color: #475569; max-height: 140px; overflow-y: auto;
      }
      #${MODAL_ID} .scd-cart-line {
        display: flex; justify-content: space-between; gap: 8px;
        padding: 3px 0; border-bottom: 1px dashed #e2e8f0;
      }
      #${MODAL_ID} .scd-cart-line:last-child { border-bottom: none; }
      #${MODAL_ID} .scd-cart-line .name { color: #0f172a; }
      #${MODAL_ID} .scd-cart-line .price { font-weight: 600; white-space: nowrap; }
      #${MODAL_ID} .scd-foot {
        padding: 12px 20px 16px; border-top: 1px solid #e2e8f0;
        display: flex; justify-content: flex-end; gap: 8px;
      }
      #${MODAL_ID} .scd-cancel {
        padding: 9px 18px; background: #fff; border: 1px solid #cbd5e1;
        border-radius: 8px; cursor: pointer; font-size: 14px; color: #475569;
        font-family: inherit;
      }
      #${MODAL_ID} .scd-cancel:hover { background: #f8fafc; border-color: #94a3b8; }
    `;
    document.head.appendChild(s);
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  // --- Read cart state from DOM ---
  function readCart() {
    const lines = Array.from(document.querySelectorAll('#pos-lines > div'));
    const items = [];
    for (const line of lines) {
      const txt = (line.innerText || line.textContent || '').replace(/\s+/g, ' ').trim();
      if (!txt) continue;
      // Parse: "🔧 Áfylling 2kg ABC Duft 1 × 4.194 kr − 1 + 5.200 kr ×"
      // Or:    "🛒 Slökkvitæki 6kg ABC Duft 1 × 9.000 kr − 1 + 11.160 kr ×"
      const isProduct = /^🛒/.test(txt);
      // Strip leading emoji
      let rest = txt.replace(/^[🛒🔧]\s*/, '');
      // Get the line total (last " 1.234 kr" before the trailing × button)
      const priceMatches = rest.match(/[\d.]+ kr/g) || [];
      const total = priceMatches[priceMatches.length - 1] || '';
      // Get qty (first "X ×" pattern OR via the "+" / "−" buttons)
      const qtyM = rest.match(/[−\-]\s*(\d+)\s*\+/);
      const qty = qtyM ? parseInt(qtyM[1], 10) : 1;
      // Name = everything before the first " 1 × " or " N × "
      const nameM = rest.match(/^(.+?)\s+\d+\s*×/);
      const name = (nameM ? nameM[1] : rest).trim();
      items.push({ isProduct, name, qty, total, raw: txt });
    }
    // Total from "Samtals: ... kr"
    let grandTotal = '';
    const totalEls = Array.from(document.querySelectorAll('#view-sala span, #view-sala div'))
      .filter(el => el.children.length === 0 && /^Samtals:/.test((el.textContent || '').trim()));
    if (totalEls.length > 0) {
      const parent = totalEls[0].parentElement;
      const parentTxt = (parent?.textContent || '').replace(/\s+/g, ' ').trim();
      const m = parentTxt.match(/Samtals:\s*([\d.]+\s*kr)/);
      if (m) grandTotal = m[1];
    }
    // Customer info — merge form values with POS state. In kt-lookup mode the
    // form inputs are empty but state.customer holds the looked-up nafn + simi.
    const ktInput = document.getElementById('pos-kt');
    const nafnInput = document.getElementById('pos-nafn');
    const simiInput = document.getElementById('pos-simi');
    const stateCust = (window.POS && typeof window.POS.getState === 'function')
      ? (window.POS.getState().customer || {})
      : {};
    const customer = {
      kt:    ktInput?.value.trim()  || stateCust.kt   || '',
      nafn:  nafnInput?.value.trim() || stateCust.nafn || '',
      simi:  simiInput?.value.trim() || stateCust.simi || '',
      co_id: stateCust.co_id || null
    };
    return { items, grandTotal, customer };
  }

  // --- Modal ---
  function close() { document.getElementById(MODAL_ID)?.remove(); }

  function showDialog(originalBtn) {
    const cart = readCart();
    if (cart.items.length === 0) {
      alert('Karfan er tóm — bættu vörum við áður en greitt er.');
      return;
    }
    const productCount = cart.items.filter(i => i.isProduct).reduce((s, i) => s + i.qty, 0);
    const hasProducts = productCount > 0;
    close();

    const modal = document.createElement('div');
    modal.id = MODAL_ID;
    modal.innerHTML = `
      <div class="scd-back"></div>
      <div class="scd-card">
        <div class="scd-head">
          <h3>💰 Greiðsla</h3>
          <button class="scd-x" type="button" aria-label="Loka">×</button>
        </div>
        <div class="scd-body">
          <div class="scd-amount">${esc(cart.grandTotal || '0 kr')}</div>
          ${(() => {
            // Prominent "Bills to:" card so the user always sees the customer
            // name + kt before paying. Helps catch cases where the customer
            // wasn't populated properly.
            const cu = cart.customer || {};
            const hasInfo = !!(cu.nafn || cu.kt);
            if (!hasInfo) {
              return '<div style="margin:0 0 14px;padding:10px 14px;background:#fef3c7;border:1px solid #fde68a;border-radius:8px;font-size:13px;color:#78350f">' +
                '⚠ Enginn viðskiptavinur skráður — kvittunin verður án nafns. ' +
                'Smelltu „Hætta við" og veldu viðskiptavin ef það á við.' +
              '</div>';
            }
            const parts = [];
            if (cu.nafn) parts.push('<div style="font-weight:700;font-size:15px;color:#0f172a">' + esc(cu.nafn) + '</div>');
            const meta = [];
            if (cu.kt) meta.push('kt. ' + esc(cu.kt));
            if (cu.simi) meta.push('📞 ' + esc(cu.simi));
            if (meta.length) parts.push('<div style="font-size:12px;color:#475569;margin-top:2px">' + meta.join(' · ') + '</div>');
            return '<div style="margin:0 0 14px;padding:10px 14px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px">' +
              '<div style="font-size:10px;font-weight:700;color:#1e40af;text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px">Reikningur á</div>' +
              parts.join('') +
            '</div>';
          })()}
          <div class="scd-section">
            <div class="scd-section-title">Greiðslumáti</div>
            <div class="scd-methods">
              <button class="scd-method" data-method="kort" type="button">
                <span class="scd-icon">💳</span>
                <span>Greitt með korti</span>
              </button>
              <button class="scd-method" data-method="pening" type="button">
                <span class="scd-icon">💵</span>
                <span>Greitt með pening</span>
              </button>
              <button class="scd-method" data-method="reikningur" type="button">
                <span class="scd-icon">📋</span>
                <span>Setja í reikning</span>
                <small style="display:block;font-size:11px;color:#64748b;margin-top:2px">Krafa í banka 10 dagar</small>
              </button>
              <button class="scd-method" data-method="greitt_sidar" type="button">
                <span class="scd-icon">⏳</span>
                <span>Greitt síðar</span>
                <small style="display:block;font-size:11px;color:#64748b;margin-top:2px">Greitt þegar tækið er sótt</small>
              </button>
            </div>
          </div>
          <div class="scd-section">
            <div class="scd-section-title">Prenta</div>
            <label class="scd-check">
              <input type="checkbox" id="scd-receipt" ${(window.AppSettings && window.AppSettings.path('prentun.default_print_kvittun') !== false) ? 'checked' : ''}>
              <span>🧾 Prenta kvittun</span>
            </label>
            <label class="scd-check ${hasProducts ? '' : 'disabled'}">
              <input type="checkbox" id="scd-barcodes" ${hasProducts && (!window.AppSettings || window.AppSettings.path('prentun.default_print_strikamerki') !== false) ? 'checked' : (hasProducts ? '' : 'disabled')}>
              <span>🏷️ Prenta strikamerki fyrir tæki${hasProducts ? ' (' + productCount + ')' : ' (engin tæki í körfu)'}</span>
            </label>
            <label class="scd-check">
              <input type="checkbox" id="scd-refill-label" ${(window.AppSettings && window.AppSettings.path('prentun.default_print_qr_label') === true) ? 'checked' : ''}>
              <span>🏷️ Prenta QR-merki fyrir tæki í áfyllingu (24 × 100 mm)</span>
            </label>
          </div>
          <div class="scd-section">
            <div class="scd-section-title">Verkbeiðnir</div>
            <label class="scd-check" title="Hakaðu af þetta þegar t.d. áfylling/hleðsla á sér stað strax og engin verkbeiðni þarf að búa til">
              <input type="checkbox" id="scd-skip-verk">
              <span>⏭️ Sleppa að búa til verkbeiðnir fyrir áfyllingu/hleðslu</span>
            </label>
          </div>
          <div class="scd-section">
            <div class="scd-section-title">Karfan (${cart.items.length})</div>
            <div class="scd-cart">
              ${cart.items.map(i => `<div class="scd-cart-line"><span class="name">${esc((i.qty > 1 ? i.qty + '× ' : '') + i.name)}</span><span class="price">${esc(i.total)}</span></div>`).join('')}
            </div>
          </div>
        </div>
        <div class="scd-foot">
          <button class="scd-cancel" type="button">Hætta við</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    modal.querySelector('.scd-back').addEventListener('click', close);
    modal.querySelector('.scd-x').addEventListener('click', close);
    modal.querySelector('.scd-cancel').addEventListener('click', close);

    modal.querySelectorAll('.scd-method').forEach(btn => {
      btn.addEventListener('click', () => {
        const method = btn.dataset.method;
        const doReceipt = modal.querySelector('#scd-receipt').checked;
        const doBarcodes = modal.querySelector('#scd-barcodes').checked && hasProducts;
        const doRefillLabel = modal.querySelector('#scd-refill-label')?.checked;
        const skipVerk = modal.querySelector('#scd-skip-verk')?.checked;
        // Pass-through to pos.js — its checkout() reads this global to decide
        // whether to create a verkbeiðni per service line.
        window._pendingSkipVerk = !!skipVerk;
        proceed(originalBtn, method, doReceipt, doBarcodes, doRefillLabel, cart);
      });
    });

    document.addEventListener('keydown', function escH(e) {
      if (e.key === 'Escape') { close(); document.removeEventListener('keydown', escH); }
    });
  }

  async function proceed(originalBtn, method, doReceipt, doBarcodes, doRefillLabel, cart) {
    // Pre-allocate the next invoice number so the printed receipt shows the
    // same R-NNNNNN that the database will store. The trigger on solur
    // respects pre-set num values that match ^R-\d+$.
    let invoiceNum = '';
    try {
      if (window.DB && window.DB.sb) {
        const { data } = await window.DB.sb.rpc('next_reikningur_num');
        if (typeof data === 'string') invoiceNum = data;
      }
    } catch (e) { console.warn('[scd] could not pre-allocate invoice num', e); }
    cart.invoiceNum = invoiceNum;
    window._pendingReikningurNum = invoiceNum; // pos.js reads this
    window._pendingPaymentMethod = method;     // pos.js / others may use

    // 2026-05-06: NO LONGER auto-prepending an ÓGREITT stamp to notes.
    // The receipt already shows "Greiðsl.skilm.: Ógreitt — greitt við afhendingu"
    // via paymentTermsFor(method), and the bookkeeping overview groups by
    // greitt_med directly. Adding the stamp to athugasemdir produced a
    // duplicate "vegna ÓGREITT —" line on the receipt right above the
    // payment-terms line. Now greitt_med = 'greitt_sidar' is the single
    // source of truth.

    if (doReceipt) printReceipt(cart, method);
    if (doBarcodes) printBarcodes(cart);
    if (doRefillLabel && window.QrLabelCustomer && typeof QrLabelCustomer.open === 'function') {
      // Open the existing 24×100mm QR-label dialog with the customer prefilled.
      setTimeout(() => QrLabelCustomer.open(cart.customer), 100);
    }
    close();
    // Allow the original click to go through this time
    originalBtn.dataset.scdProceed = '1';
    setTimeout(() => originalBtn.click(), 50);
  }

  // --- Print Receipt ---
  function printReceipt(cart, method) {
    const win = window.open('', '_blank', 'width=900,height=1100');
    if (!win) { alert('Vinsamlegast leyfðu sprettiglugga til að prenta kvittun.'); return; }
    // Prefer the A4 invoice layout if available (window.SalaInvoice)
    if (window.SalaInvoice && typeof SalaInvoice.render === 'function') {
      const ok = SalaInvoice.render(win, {
        customerName: cart.customer.nafn || '',
        // The kennitala belongs in the bill-to block; pass it via customerKt
        // so the renderer can build a synthetic customer record with it.
        // Tilvísun/Raðnr. are left empty (they are reference/serial fields,
        // not meant to hold the customer's phone or kennitala).
        customerKt: cart.customer.kt || '',
        customerSimi: cart.customer.simi || '',
        paymentMethod: method,            // 'kort' / 'pening' / 'reikningur'
        invoiceNum: cart.invoiceNum || '' // assigned by DB trigger on save
      });
      if (ok) return;
    }
    const date = new Date().toLocaleString('is-IS', { dateStyle: 'short', timeStyle: 'short' });
    const methodLabel = method === 'kort' ? '💳 Greitt með korti' : '💵 Greitt með pening';
    const cust = cart.customer;
    const custLines = [];
    if (cust.nafn) custLines.push(esc(cust.nafn));
    if (cust.kt) custLines.push('kt: ' + esc(cust.kt));
    if (cust.simi) custLines.push('s: ' + esc(cust.simi));
    const itemsHTML = cart.items.map(i => `
      <div class="row">
        <div class="r-name">${esc((i.qty > 1 ? i.qty + '× ' : '') + i.name)}</div>
        <div class="r-price">${esc(i.total)}</div>
      </div>`).join('');
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Kvittun</title>
<style>
  body { font-family: -apple-system, sans-serif; font-size: 12px; margin: 0; padding: 14px; color: #000; }
  h2 { text-align: center; margin: 0 0 4px 0; font-size: 15px; }
  .sub { text-align: center; font-size: 11px; color: #333; }
  .line { border-top: 1px dashed #999; margin: 10px 0; }
  .cust { margin: 4px 0; padding-left: 4px; font-size: 11px; }
  .row { display: flex; justify-content: space-between; gap: 8px; padding: 3px 0; font-size: 12px; }
  .r-name { flex: 1; }
  .r-price { font-weight: 600; white-space: nowrap; }
  .total { display: flex; justify-content: space-between; font-size: 15px; font-weight: 700; padding: 6px 0 4px; }
  .method { text-align: center; font-weight: 600; padding: 6px 0; background: #f0f0f0; border-radius: 4px; margin: 8px 0; }
  .footer { text-align: center; font-size: 11px; color: #666; margin-top: 10px; }
  @media print { body { padding: 4px; } }
</style></head><body>
  <h2>Slökkvitæki ehf</h2>
  <div class="sub">Slökkvitækjaþjónusta</div>
  <div class="sub">Helluhraun 10, 220 Hafnarfirði</div>
  <div class="sub">Sími: 565-4080</div>
  <div class="sub">${esc(date)}</div>
  ${custLines.length ? '<div class="line"></div><div class="cust">' + custLines.join('<br>') + '</div>' : ''}
  <div class="line"></div>
  ${itemsHTML}
  <div class="line"></div>
  <div class="total"><span>Samtals</span><span>${esc(cart.grandTotal)}</span></div>
  <div class="method">${esc(methodLabel)}</div>
  <div class="footer">Takk fyrir viðskiptin!</div>
  <script>window.onload = () => setTimeout(() => window.print(), 200);<\/script>
</body></html>`;
    win.document.write(html);
    win.document.close();
  }

  // --- Print Barcode Labels ---
  // Generates one label per unit (qty expanded). Each label has:
  // serial (date-based), product name, and a QR code rendered via api.qrserver.com.
  // Layout: stacked cards, one per page-break, sized for Brother PT-P750W tape (24mm tall).
  function printBarcodes(cart) {
    const products = [];
    let counter = 0;
    const today = new Date();
    const yymmdd = String(today.getFullYear()).slice(-2) +
                   String(today.getMonth() + 1).padStart(2, '0') +
                   String(today.getDate()).padStart(2, '0');
    for (const it of cart.items) {
      if (!it.isProduct) continue;
      for (let q = 0; q < it.qty; q++) {
        counter++;
        const serial = 'SLT' + yymmdd + String(counter).padStart(3, '0');
        products.push({ serial, name: it.name });
      }
    }
    if (products.length === 0) return;
    // Customer info for the label (name + phone). Read from cart.customer if present.
    const cust = cart.customer || {};
    const custName = (cust.nafn || cust.name || '').trim();
    const custPhone = (cust.simi || cust.farsimi || cust.phone || '').trim();
    const win = window.open('', 'strikamerki', 'width=420,height=700');
    if (!win) { alert('Vinsamlegast leyfðu sprettiglugga til að prenta strikamerki.'); return; }
    const labelsHTML = products.map(p => `
      <div class="lbl">
        <img class="qr" src="https://api.qrserver.com/v1/create-qr-code/?size=120x120&margin=0&data=${encodeURIComponent(p.serial)}" alt="${esc(p.serial)}">
        <div class="lbl-text">
          <div class="lbl-serial">${esc(p.serial)}</div>
          <div class="lbl-name">${esc(custName || p.name)}</div>
          ${custPhone ? '<div class="lbl-phone">📞 '+esc(custPhone)+'</div>' : ''}
          <div class="lbl-org">Slökkvitæki ehf · 565-4080</div>
        </div>
      </div>`).join('');
    /* Pull label size + DPI shift compensation from AppSettings (patch 85).
       Falls back to 54×17 mm + 2 mm DPI comp if settings aren't loaded. */
    const _ps = (window.AppSettings && window.AppSettings.path('prentun')) || {};
    const _sz = _ps.label_size || '54x17';
    const _dpiComp = Number.isFinite(+_ps.dpi_compensation) ? +_ps.dpi_compensation : 2;
    let _w = 54, _h = 17;
    if (_sz === '62x17')      { _w = 62; _h = 17; }
    else if (_sz === '62x100'){ _w = 62; _h = 100; }
    else if (_sz === '38x90') { _w = 38; _h = 90; }
    const _top = 9 + _dpiComp;
    const _qr = Math.max(4, Math.min(20, _h - _top - 1));
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Strikamerki — Brother ${_w}×${_h} mm</title>
<style>
  /* Brother QL series. Dimensions + DPI shift compensation come from
     AppSettings.prentun (Settings panel → Prentun tab). */
  @page { size: ${_w}mm ${_h}mm; margin: 0; }
  html, body { margin: 0; padding: 0; color: #000; font-family: Arial, Helvetica, sans-serif; }
  .lbl {
    width: ${_w}mm; height: ${_h}mm;
    box-sizing: border-box; padding: ${_top}mm 6mm 0mm 5mm;
    display: flex; align-items: center; gap: 1.5mm;
    page-break-after: always; break-after: page; overflow: hidden;
  }
  .lbl:last-child { page-break-after: auto; }
  .qr { width: ${_qr}mm; height: ${_qr}mm; flex-shrink: 0; }
  .lbl-text { flex: 1; min-width: 0; line-height: 1.05; }
  .lbl-serial { font-size: 10pt; font-weight: 800; font-family: 'Courier New', monospace; }
  .lbl-name   { font-size: 7.5pt; font-weight: 600; margin-top: 0.4mm; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .lbl-phone  { font-size: 6.5pt; color: #222; margin-top: 0.3mm; }
  .lbl-org    { font-size: 5.5pt; color: #555; margin-top: 0.3mm; }
  .toolbar {
    padding: 8px 12px; background: #f4f4f4; border-bottom: 1px solid #ddd;
    text-align: center; font-size: 12px;
  }
  .toolbar button { padding: 6px 14px; font-size: 12px; cursor: pointer; margin: 0 4px; }
  .toolbar small { color: #666; display: block; margin-top: 4px; font-size: 10px; }
  @media print { .toolbar { display: none; } }
</style></head><body>
  <div class="toolbar">
    ${products.length} strikamerki tilbúin · 54 × 17 mm
    <button onclick="window.print()">🖨️ Prenta</button>
    <button onclick="window.close()">Loka</button>
    <small>Veldu Brother QL prentara í prentglugganum og settu pappírsstærð á 54 × 17 mm</small>
  </div>
  ${labelsHTML}
  <script>
    // Wait for QR images to load before opening the print dialog.
    let imgs = Array.from(document.images);
    let loaded = 0;
    function maybePrint() {
      loaded++;
      if (loaded >= imgs.length) setTimeout(() => window.print(), 300);
    }
    if (imgs.length === 0) setTimeout(() => window.print(), 200);
    else imgs.forEach(img => {
      if (img.complete) maybePrint();
      else { img.addEventListener('load', maybePrint); img.addEventListener('error', maybePrint); }
    });
  <\/script>
</body></html>`;
    win.document.write(html);
    win.document.close();
  }

  // --- Click interception (capture phase) ---
  document.addEventListener('click', (e) => {
    const btn = e.target.closest && e.target.closest('#pos-checkout');
    if (!btn) return;
    if (btn.dataset.scdProceed === '1') {
      delete btn.dataset.scdProceed;
      return; // let the original handler run
    }
    e.stopImmediatePropagation();
    e.preventDefault();
    showDialog(btn);
  }, true);

  window.SalaCheckout = {
    show: () => { const b = document.getElementById('pos-checkout'); if (b) showDialog(b); },
    // Exposed for the test-print panel (patch 84) and any other tooling that
    // needs to drive the print routines without going through a real sale.
    printReceipt,
    printBarcodes,
    version: 'v2'
  };
})();
/* === END SALA CHECKOUT DIALOG === */
