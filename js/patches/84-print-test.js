/* === PRINT TEST PANEL v1 ===
 *
 * Floating "🧪 Prufa prentun" button that lets the user verify printer
 * setup (Brother QL-700 strikamerki, A4 kvittun, 24×100mm áfyllingu QR)
 * WITHOUT creating real sales in the database. Useful for a fresh printer
 * setup so test invoices don't pollute Sala/Tekjur/Bókhald views.
 *
 * Pulls the print routines exposed by patch 07 (window.SalaCheckout) and
 * patch 08 (window.QrLabelCustomer), feeds them mock cart data. Nothing
 * is written to Supabase. */
(() => {
  if (window.__printTestInstalled) return;
  window.__printTestInstalled = true;

  const MOCK_CART = {
    customer: {
      nafn: 'Prufa Prentari ehf.',
      kt: '600508-0400',
      simi: '565-4080'
    },
    items: [
      { name: 'Slökkvitæki 6kg ABC Duft', qty: 2, total: '27.800', isProduct: true },
      { name: 'Yfirferð slökkvitækis',    qty: 2, total: '8.400',  isProduct: false }
    ],
    grandTotal: '36.200',
    invoiceNum: 'TEST-001'
  };

  function buildPanel() {
    if (document.getElementById('pt-panel')) return;
    const wrap = document.createElement('div');
    wrap.id = 'pt-panel';
    wrap.style.cssText =
      'position:fixed;bottom:16px;right:16px;z-index:99990;font-family:inherit;' +
      'display:flex;flex-direction:column;align-items:flex-end;gap:8px';
    // 2026-05-19: Re-enabled panel after Aggi flagged that disabling the
     // whole thing was wrong. The 🟢 QR-merki áfylling (24×100 mm) button
     // was the one to remove; the kvittun + strikamerki tests are wanted.
    wrap.innerHTML =
      '<div id="pt-menu" style="display:none;background:#fff;border:1px solid #cbd5e1;border-radius:10px;padding:10px;box-shadow:0 10px 30px rgba(15,23,42,.18);min-width:240px">' +
        '<div style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px">Prufa prentun</div>' +
        '<button class="pt-act" data-pt="receipt" style="width:100%;text-align:left;padding:9px 11px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:7px;cursor:pointer;font:inherit;font-size:13px;margin-bottom:6px">📄 Prufa kvittun (A4)</button>' +
        '<button class="pt-act" data-pt="barcode" style="width:100%;text-align:left;padding:9px 11px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:7px;cursor:pointer;font:inherit;font-size:13px">🏷 Prufa strikamerki (62×17 mm Brother QL)</button>' +
        '<div style="font-size:11px;color:#94a3b8;margin-top:8px;line-height:1.4">Engar gögn vistuð í gagnagrunn. Gakk úr skugga um að réttur prentari er valinn í prentglugganum.</div>' +
      '</div>' +
      '<button id="pt-toggle" type="button" title="Prufa prentun" ' +
        'style="background:#0f172a;color:#fff;border:none;padding:11px 16px;border-radius:24px;cursor:pointer;font:inherit;font-size:13px;font-weight:600;box-shadow:0 6px 18px rgba(15,23,42,.25);display:flex;align-items:center;gap:7px">' +
        '🧪 <span>Prufa prentun</span>' +
      '</button>';
    document.body.appendChild(wrap);

    const toggle = wrap.querySelector('#pt-toggle');
    const menu = wrap.querySelector('#pt-menu');
    toggle.addEventListener('click', () => {
      menu.style.display = (menu.style.display === 'none') ? 'block' : 'none';
    });
    document.addEventListener('click', e => {
      if (!wrap.contains(e.target)) menu.style.display = 'none';
    });

    wrap.querySelectorAll('.pt-act').forEach(btn => {
      btn.addEventListener('click', () => {
        menu.style.display = 'none';
        runTest(btn.dataset.pt);
      });
    });
  }

  function runTest(kind) {
    if (kind === 'receipt') {
      if (!window.SalaCheckout || typeof window.SalaCheckout.printReceipt !== 'function') {
        alert('Prentunarkerfið ekki tilbúið — endurhladdu síðunni.'); return;
      }
      window.SalaCheckout.printReceipt(MOCK_CART, 'kort');
      return;
    }
    if (kind === 'barcode') {
      if (!window.SalaCheckout || typeof window.SalaCheckout.printBarcodes !== 'function') {
        alert('Prentunarkerfið ekki tilbúið — endurhladdu síðunni.'); return;
      }
      window.SalaCheckout.printBarcodes(MOCK_CART);
      return;
    }
    if (kind === 'qrlabel') {
      if (!window.QrLabelCustomer || typeof window.QrLabelCustomer.open !== 'function') {
        alert('QR-merki kerfi ekki tilbúið — endurhladdu síðunni.'); return;
      }
      window.QrLabelCustomer.open({
        nafn: MOCK_CART.customer.nafn,
        kennitala: MOCK_CART.customer.kt,
        simi: MOCK_CART.customer.simi
      });
      return;
    }
  }

  // 2026-05-19: Re-enabled the "🧪 Prufa prentun" panel. The 2026-05-08
  // disable removed all three buttons when only the 🟢 QR-merki áfylling
  // (24×100 mm) one was meant to go — Aggi flagged this today. Now we
  // build the panel with only the kvittun + strikamerki tests.
  function init() {
    // 2026-05-19: floating "🧪 Prufa prentun" button disabled per Agnar —
    // printers are set up and the FAB clutters the bottom-right corner.
    // The print routines stay reachable via window.SalaCheckout for any
    // future tooling.
    // buildPanel();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  console.log('[print-test] installed — panel disabled');
})();
/* === END PRINT TEST PANEL v1 === */
