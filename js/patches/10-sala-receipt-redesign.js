/* === SALA RECEIPT REDESIGN v1 === */
/* Re-styles the Sala "Kvittun" popup to look like a proper A4 invoice
   (matching reikningur.jpg in Drive: top-left logo + name, top-right address,
   bill-to + invoice-meta side-by-side, items table with rule lines on header
   only, totals block bottom-right, signature line + regulation footnote).
   - Hooks window.open to detect any popup whose title starts with "Kvittun"
   - Extracts data from the already-rendered DOM, so it survives pos.js changes
   - Rewrites <head> + <body> with new HTML/CSS, keeps print() shortcut */
(() => {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (window.__salaReceiptRedesignInstalled) return;
  window.__salaReceiptRedesignInstalled = true;

  const origOpen = window.open;
  window.open = function() {
    const win = origOpen.apply(window, arguments);
    if (win) tryRewrite(win);
    return win;
  };

  function tryRewrite(win) {
    let attempts = 0;
    const tick = () => {
      attempts++;
      let title = '';
      let hasReceipt = false;
      try {
        if (!win || win.closed) return;
        title = (win.document && win.document.title) || '';
        const body = win.document && win.document.body;
        hasReceipt = !!(body && body.querySelector('.receipt'));
      } catch (e) { /* cross-origin, retry */ }
      if (/^kvittun/i.test(title) && hasReceipt) {
        // Wait a beat to ensure full content is written
        setTimeout(() => { try { rewrite(win); } catch (e) { console.warn('[receipt redesign]', e); } }, 60);
        return;
      }
      if (attempts < 50) setTimeout(tick, 80);
    };
    setTimeout(tick, 50);
  }

  function fmtKr(n) {
    if (n == null || isNaN(n)) return '';
    return Math.round(n).toLocaleString('is-IS').replace(/,/g, '.') + ' kr';
  }
  function fmtAmt(n) {
    if (n == null || isNaN(n)) return '';
    return Math.round(n).toLocaleString('is-IS').replace(/,/g, '.');
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    }[c]));
  }

  function extractData(doc) {
    const r = doc.querySelector('.receipt');
    const data = { num: '', date: '', customer: '', phone: '', notes: '' };

    // Pull info pairs from .receipt-info: each direct child <div> has a <span>label</span> + value
    const cells = r.querySelectorAll('.receipt-info > div');
    cells.forEach(cell => {
      const span = cell.querySelector('span');
      if (!span) return;
      const label = span.textContent.replace(/[:\s]+$/, '').trim().toLowerCase();
      const value = cell.textContent.replace(span.textContent, '').trim();
      if (/kvittun/.test(label)) data.num = value;
      else if (/dagsetn/.test(label)) data.date = value;
      else if (/(viðskipt|customer)/.test(label)) data.customer = value;
      else if (/(sími|phone)/.test(label)) data.phone = value;
    });
    // Fallback: title also has the number
    if (!data.num) {
      const m = (doc.title || '').match(/kvittun\s+(\S+)/i);
      if (m) data.num = m[1];
    }

    // Lines from the items table — tolerate 3-col (desc/qty/total) or wider layouts
    const rows = r.querySelectorAll('table tbody tr, table tr');
    const lines = [];
    rows.forEach(tr => {
      const tds = tr.querySelectorAll('td');
      if (tds.length < 3) return;
      // Last cell = total, second-to-last = qty, first = desc
      const desc = tds[0].textContent.trim();
      const qtyTxt = tds[tds.length - 2].textContent.trim();
      const totalTxt = tds[tds.length - 1].textContent.trim();
      const qty = parseFloat(qtyTxt.replace(/[^\d.,-]/g, '').replace(',', '.')) || 0;
      const lineTotalIncVat = parseFloat(totalTxt.replace(/[^\d.,-]/g, '').replace(/\./g, '').replace(',', '.')) || 0;
      // Back out 24% VAT to get "ex" line and unit price (most items use 24% — best-effort)
      const lineEx = lineTotalIncVat / 1.24;
      const unitEx = qty > 0 ? lineEx / qty : lineEx;
      // Find the description's reference span if present
      const refSpan = tds[0].querySelector('span');
      const refText = refSpan ? refSpan.textContent.trim() : '';
      const cleanDesc = refText ? desc.replace(refText, '').trim() : desc;
      lines.push({
        ref: refText,
        desc: cleanDesc,
        qty,
        unitEx,
        lineEx,
        lineInc: lineTotalIncVat,
        vskCode: '2'
      });
    });
    data.lines = lines;

    // Totals: extract from .totals block — there are .total-row entries and .grand-total
    const totalEls = r.querySelectorAll('.totals .total-row, .totals .grand-total');
    let subEx = 0, vsk = 0, total = 0;
    totalEls.forEach(el => {
      const txt = el.textContent.toLowerCase();
      // Last number in the line is the value
      const m = el.textContent.match(/([\d.,]+)\s*kr?\s*$/i) || el.textContent.match(/([\d.,]+)\s*$/);
      if (!m) return;
      const v = parseFloat(m[1].replace(/\./g, '').replace(',', '.')) || 0;
      if (/(samtals|án vsk|fyrir vsk|undirsamtals|subtotal)/.test(txt)) subEx = v;
      else if (/(vsk|skattur|vat)/.test(txt) && !/(með|inc)/.test(txt)) vsk = v;
      else if (/(til greiðslu|samtals.*greiðs|total|alls)/.test(txt) || el.classList.contains('grand-total')) total = v;
    });
    if (!total && (subEx || vsk)) total = subEx + vsk;
    if (!subEx && lines.length) subEx = lines.reduce((s, l) => s + l.lineEx, 0);
    if (!vsk && total && subEx) vsk = total - subEx;
    if (!total && lines.length) total = lines.reduce((s, l) => s + l.lineInc, 0);
    data.subEx = subEx;
    data.vsk = vsk;
    data.total = total;

    return data;
  }

  function buildHTML(data) {
    const linesHTML = data.lines.map(l => {
      return `<tr>
        <td class="num-col">${esc(l.ref || '')}</td>
        <td class="desc-col">${esc(l.desc)}</td>
        <td class="qty-col">${l.qty ? l.qty.toLocaleString('is-IS', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : ''}</td>
        <td class="unit-col">${fmtAmt(l.unitEx)}</td>
        <td class="amt-col">${fmtAmt(l.lineEx)}</td>
        <td class="vsk-col">${esc(l.vskCode || '')}</td>
      </tr>`;
    }).join('');

    return `
      <div class="no-print">
        <button onclick="window.print()" class="btn-primary">🖨 Prenta reikning</button>
        <button onclick="window.close()" class="btn-secondary">Loka</button>
      </div>

      <div class="sheet">
        <header class="hdr">
          <div class="hdr-left">
            <div class="logo-circle">
              <svg viewBox="0 0 48 48" width="44" height="44" aria-hidden="true">
                <circle cx="24" cy="24" r="24" fill="#000"/>
                <path d="M24 9c-2 5-4 7-6 11-2.5 5 0 11 6 14-3-2-3-6 0-9 1.5 2 3 4 3 7 4-2 6-6 6-11 0-4-3-7-5-9 0 3-1 5-3 5 1-3 0-6-1-8z" fill="#fff"/>
              </svg>
            </div>
            <div class="hdr-co">
              <div class="co-name">Slökkvitæki ehf</div>
              <div class="co-tag">Brunakerfi</div>
              <div class="co-kt">Kt. 600508-0400</div>
            </div>
          </div>
          <div class="hdr-right">
            <div>Slökkvitæki ehf &nbsp;&nbsp;<strong>VSK nr. 98107</strong></div>
            <div>Helluhrauni 10</div>
            <div>220 Hafnarfjörður</div>
          </div>
        </header>

        <div class="meta-row">
          <div class="bill-to">
            <div class="cust-name">${esc(data.customer || '—')}</div>
          </div>
          <div class="invoice-meta">
            <div class="inv-title-row">
              <em>Reikningur</em>
              <span class="inv-num">${esc(data.num || '')}</span>
            </div>
            <div class="inv-meta-grid">
              <div class="lbl">Dagsetning:</div><div class="val">${esc(data.date || '')}</div>
              <div class="lbl">Greiðsl.skilm.:</div><div class="val">Krafa í banka 10 dagar</div>
              <div class="lbl">Afh.skilm.:</div><div class="val">Skilmáli1</div>
              <div class="lbl">Starfsmaður:</div><div class="val">Haukur Valdimarsson</div>
              <div class="lbl">Tilvísun:</div><div class="val">${esc(data.phone || '')}</div>
              <div class="lbl">Raðnr.:</div><div class="val">${esc(data.num || '')}</div>
            </div>
          </div>
        </div>

        <table class="items">
          <thead>
            <tr>
              <th class="num-col">Vörunúmer</th>
              <th class="desc-col">Lýsing</th>
              <th class="qty-col">Fjöldi</th>
              <th class="unit-col">Einingaverð</th>
              <th class="amt-col">Upphæð</th>
              <th class="vsk-col">VSK</th>
            </tr>
          </thead>
          <tbody>${linesHTML}</tbody>
        </table>

        <div class="spacer"></div>

        <div class="totals-block">
          <div class="totals-line">
            <span class="lbl">Samtals fyrir Vsk.:</span>
            <span class="amt">${fmtAmt(data.subEx)}</span>
          </div>
          <div class="totals-line">
            <span class="lbl">2 = Sala með 24,0% Vsk: ${fmtAmt(data.subEx)},00</span>
            <span class="amt">${fmtAmt(data.vsk)}</span>
          </div>
          <div class="totals-line grand">
            <span class="lbl">Til greiðslu :</span>
            <span class="amt">${fmtAmt(data.total)}</span>
          </div>
        </div>

        <div class="footer">
          <div class="signature">
            <span class="lbl">Móttekið/Greitt:</span>
            <span class="line"></span>
          </div>
          <div class="disclaimer">Þessi reikningur er rafrænt ytra frumgagn skv. reglugerð nr. 505/2013.</div>
        </div>
      </div>
    `;
  }

  const NEW_CSS = `
    @page { size: A4; margin: 0; }
    @media print {
      .no-print { display: none !important; }
      body { background: #fff !important; padding: 0 !important; }
      .sheet { box-shadow: none !important; margin: 0 !important; padding: 18mm 16mm !important; }
    }
    html, body {
      font-family: Arial, Helvetica, 'Helvetica Neue', sans-serif;
      background: #f1f5f9;
      margin: 0;
      padding: 24px 16px;
      color: #000;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .no-print {
      max-width: 800px;
      margin: 0 auto 18px;
      text-align: center;
    }
    .no-print button {
      padding: 11px 22px;
      border-radius: 8px;
      font: inherit;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      border: none;
      margin: 0 4px;
    }
    .btn-primary { background: #1a7f4b; color: #fff; }
    .btn-primary:hover { background: #156c40; }
    .btn-secondary { background: #fff; color: #334155; border: 1px solid #cbd5e1 !important; }
    .btn-secondary:hover { background: #f8fafc; }

    .sheet {
      background: #fff;
      max-width: 800px;
      margin: 0 auto;
      padding: 22mm 16mm 18mm;
      box-shadow: 0 4px 24px rgba(15,23,42,.08);
      font-size: 10pt;
      line-height: 1.4;
      color: #000;
      min-height: 270mm;
      display: flex;
      flex-direction: column;
      box-sizing: border-box;
    }

    .hdr {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 22px;
    }
    .hdr-left {
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .logo-circle {
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: #000;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .hdr-co {
      line-height: 1.05;
    }
    .co-name {
      font-size: 22pt;
      font-weight: 800;
      letter-spacing: -0.01em;
    }
    .co-tag {
      font-size: 22pt;
      font-weight: 800;
      letter-spacing: -0.01em;
    }
    .co-kt {
      font-size: 7.5pt;
      color: #444;
      margin-top: 3px;
      letter-spacing: 0.04em;
    }
    .hdr-right {
      text-align: right;
      font-size: 10pt;
      line-height: 1.6;
      padding-top: 4px;
    }

    .meta-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
      margin: 18px 0 26px;
    }
    .bill-to { font-size: 10pt; line-height: 1.7; }
    .cust-name { font-size: 11pt; font-weight: 400; }
    .cust-line { color: #000; }
    .cust-ref { margin-top: 14px; font-size: 9pt; }

    .invoice-meta { font-size: 10pt; }
    .inv-title-row {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      border-bottom: 1px solid #000;
      padding-bottom: 4px;
      margin-bottom: 8px;
    }
    .inv-title-row em {
      font-style: italic;
      font-size: 18pt;
      font-weight: 700;
      letter-spacing: -0.01em;
    }
    .inv-num {
      font-size: 14pt;
      font-weight: 700;
    }
    .inv-meta-grid {
      display: grid;
      grid-template-columns: auto 1fr;
      gap: 1px 14px;
      font-size: 10pt;
    }
    .inv-meta-grid .lbl { color: #000; }
    .inv-meta-grid .val { text-align: right; }

    .items {
      width: 100%;
      border-collapse: collapse;
      margin: 6px 0 0;
      font-size: 10pt;
    }
    .items thead th {
      text-align: left;
      font-weight: 700;
      border-top: 0.6pt solid #000;
      border-bottom: 0.6pt solid #000;
      padding: 4px 6px;
      font-size: 9.5pt;
    }
    .items th.num-col { width: 9%; }
    .items th.desc-col { width: 36%; }
    .items th.qty-col { width: 9%; text-align: right; }
    .items th.unit-col { width: 16%; text-align: right; }
    .items th.amt-col { width: 18%; text-align: right; }
    .items th.vsk-col { width: 6%; text-align: right; padding-right: 0; }
    .items td {
      padding: 4px 6px;
      vertical-align: top;
      font-size: 10pt;
    }
    .items td.num-col { color: #000; }
    .items td.qty-col, .items td.unit-col, .items td.amt-col, .items td.vsk-col {
      text-align: right;
      white-space: nowrap;
    }
    .items td.vsk-col { padding-right: 0; }

    .spacer { flex: 1 1 auto; min-height: 30mm; }

    .totals-block {
      margin-top: 12px;
      margin-left: 45%;
      font-size: 10.5pt;
    }
    .totals-line {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      padding: 5px 0;
      border-top: 0.6pt solid #000;
    }
    .totals-line .amt { font-weight: 700; padding-left: 16px; white-space: nowrap; }
    .totals-line.grand {
      font-weight: 700;
      border-bottom: 0.6pt solid #000;
      padding: 7px 0;
    }

    .footer {
      margin-top: 18px;
      font-size: 9pt;
    }
    .signature {
      display: flex;
      align-items: baseline;
      gap: 8px;
    }
    .signature .lbl { white-space: nowrap; }
    .signature .line {
      flex: 1;
      max-width: 260px;
      border-bottom: 0.6pt solid #000;
      height: 1.2em;
    }
    .disclaimer {
      margin-top: 16px;
      font-size: 8pt;
      color: #444;
    }
  `;

  function rewrite(win) {
    const doc = win.document;
    let data;
    try { data = extractData(doc); }
    catch (e) { console.warn('[receipt redesign] extract failed', e); return; }
    if (!data || (!data.num && !data.lines.length)) return;

    // Replace head: keep title, replace styles
    const oldStyles = doc.querySelectorAll('style, link[rel=stylesheet]');
    oldStyles.forEach(s => s.remove());
    const styleEl = doc.createElement('style');
    styleEl.textContent = NEW_CSS;
    doc.head.appendChild(styleEl);

    // Replace body
    doc.body.innerHTML = buildHTML(data);
    doc.title = 'Reikningur ' + (data.num || '');
  }

  window.SalaReceiptRedesign = { rewrite, version: 'v1' };
})();
/* === END SALA RECEIPT REDESIGN === */
