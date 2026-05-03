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
    // Customer info
    const ktInput = document.getElementById('pos-kt');
    const nafnInput = document.getElementById('pos-nafn');
    const simiInput = document.getElementById('pos-simi');
    const customer = {
      kt: ktInput?.value.trim() || '',
      nafn: nafnInput?.value.trim() || '',
      simi: simiInput?.value.trim() || ''
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
            </div>
          </div>
          <div class="scd-section">
            <div class="scd-section-title">Prenta</div>
            <label class="scd-check">
              <input type="checkbox" id="scd-receipt" checked>
              <span>🧾 Prenta kvittun</span>
            </label>
            <label class="scd-check ${hasProducts ? '' : 'disabled'}">
              <input type="checkbox" id="scd-barcodes" ${hasProducts ? '' : 'disabled'}>
              <span>🏷️ Prenta strikamerki fyrir tæki${hasProducts ? ' (' + productCount + ')' : ' (engin tæki í körfu)'}</span>
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
        proceed(originalBtn, method, doReceipt, doBarcodes, cart);
      });
    });

    document.addEventListener('keydown', function escH(e) {
      if (e.key === 'Escape') { close(); document.removeEventListener('keydown', escH); }
    });
  }

  function proceed(originalBtn, method, doReceipt, doBarcodes, cart) {
    if (doReceipt) printReceipt(cart, method);
    if (doBarcodes) printBarcodes(cart);
    close();
    // Allow the original click to go through this time
    originalBtn.dataset.scdProceed = '1';
    setTimeout(() => originalBtn.click(), 50);
  }

  // --- Print Receipt ---
  function printReceipt(cart, method) {
    const win = window.open('', 'kvittun', 'width=420,height=700');
    if (!win) { alert('Vinsamlegast leyfðu sprettiglugga til að prenta kvittun.'); return; }
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
    const win = window.open('', 'strikamerki', 'width=380,height=700');
    if (!win) { alert('Vinsamlegast leyfðu sprettiglugga til að prenta strikamerki.'); return; }
    const labelsHTML = products.map(p => `
      <div class="lbl">
        <img class="qr" src="https://api.qrserver.com/v1/create-qr-code/?size=140x140&margin=0&data=${encodeURIComponent(p.serial)}" alt="${esc(p.serial)}">
        <div class="lbl-text">
          <div class="lbl-serial">${esc(p.serial)}</div>
          <div class="lbl-name">${esc(p.name)}</div>
          <div class="lbl-org">Slökkvitæki ehf · 565-4080</div>
        </div>
      </div>`).join('');
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Strikamerki</title>
<style>
  @page { margin: 4mm; }
  body { font-family: -apple-system, sans-serif; margin: 0; padding: 6px; color: #000; }
  .lbl {
    display: flex; align-items: center; gap: 10px;
    padding: 6px 8px; border: 1px solid #000; border-radius: 4px;
    margin-bottom: 6px; page-break-inside: avoid;
    width: 220px; min-height: 80px;
  }
  .qr { width: 70px; height: 70px; flex-shrink: 0; }
  .lbl-text { flex: 1; min-width: 0; }
  .lbl-serial { font-size: 14px; font-weight: 700; font-family: monospace; line-height: 1.1; }
  .lbl-name { font-size: 10px; color: #333; line-height: 1.2; margin-top: 3px; word-break: break-word; }
  .lbl-org { font-size: 8px; color: #666; margin-top: 3px; }
  .toolbar { padding: 6px; background: #f0f0f0; margin-bottom: 10px; text-align: center; font-size: 11px; }
  .toolbar button { padding: 6px 14px; font-size: 12px; cursor: pointer; margin: 0 4px; }
  @media print { .toolbar { display: none; } body { padding: 0; } }
</style></head><body>
  <div class="toolbar">
    ${products.length} strikamerki tilbúin · <button onclick="window.print()">🖨️ Prenta</button>
    <button onclick="window.close()">Loka</button>
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
    version: 'v1'
  };
})();
/* === END SALA CHECKOUT DIALOG === */
