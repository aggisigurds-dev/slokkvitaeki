/* === SALA RECEIPT REDESIGN v2 === */
/* A4 invoice ("Reikningur") that matches the existing paper layout:
 *   - Top-left: company name + logo + kt
 *   - Top-right: address + VSK nr.
 *   - Mid-row: customer block (left) | invoice meta (right) divided by a rule
 *   - Items table: Vörunúmer | Lýsing | Fjöldi | Einingaverð | Upphæð | VSK
 *   - Bottom-right totals block: Samtals fyrir Vsk + per-rate VAT lines + Til greiðslu
 *   - Footer: signature line + reglugerð disclaimer
 *
 * This module exposes window.SalaInvoice.render(win, ctx). The Sala
 * checkout dialog (patch 07) calls it when "Prenta kvittun" is checked.
 * It pulls rich data from window.POS.getState() (lines with VAT rates,
 * customer co_id) and looks the customer up in Companies.list to get
 * the full address + kennitala for the bill-to block.
 */
(() => {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (window.__salaInvoiceInstalled) return;
  window.__salaInvoiceInstalled = true;

  const ICELAND_LOCALE = 'is-IS';
  const COMPANY = {
    name: 'Slökkvitæki ehf',
    tag: 'Brunakerfi',
    kt: '600508-0400',
    vsk: '98107',
    addr1: 'Helluhrauni 10',
    addr2: '220 Hafnarfjörður',
    phone: '565-4080'
  };
  const DEFAULTS = {
    paymentTerms: 'Krafa í banka 10 dagar',
    deliveryTerms: 'Skilmáli1',
    employee: 'Kassi'
  };

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }
  function fmtAmt(n) {
    if (n == null || isNaN(n)) return '';
    return Math.round(n).toLocaleString(ICELAND_LOCALE).replace(/,/g, '.');
  }
  function fmtAmtDec(n) {
    if (n == null || isNaN(n)) return '0,00';
    return n.toLocaleString(ICELAND_LOCALE, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  function fmtKt(s) {
    s = String(s || '').replace(/[^0-9]/g, '');
    if (s.length === 10) return s.slice(0, 6) + '-' + s.slice(6);
    return s || '';
  }
  function fmtDate(d) {
    if (!(d instanceof Date)) d = new Date();
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yy = String(d.getFullYear()).slice(-2);
    return `${dd}.${mm}.${yy}`;
  }

  function lookupCustomer(state) {
    const list = (window.Companies && Companies.list) || [];
    if (!list.length) return null;
    if (state && state.customer && state.customer.co_id) {
      const byId = list.find(c => c.id === state.customer.co_id);
      if (byId) return byId;
    }
    const name = state && state.customer && (state.customer.nafn || '').trim();
    if (name) {
      const norm = s => String(s || '').trim().toLowerCase();
      const target = norm(name);
      return list.find(c => norm(c.nafn) === target)
          || list.find(c => norm(c.nafn).startsWith(target))
          || null;
    }
    const kt = state && state.customer && (state.customer.kt || '').replace(/[^0-9]/g, '');
    if (kt && kt.length === 10) {
      return list.find(c => String(c.kennitala || '').replace(/[^0-9]/g, '') === kt) || null;
    }
    return null;
  }

  function splitAddress(heimilisfang) {
    if (!heimilisfang) return { line1: '', line2: '' };
    const parts = String(heimilisfang).split(/,\s*/).map(s => s.trim()).filter(Boolean);
    if (parts.length <= 1) return { line1: parts[0] || '', line2: '' };
    return { line1: parts[0], line2: parts.slice(1).join(', ') };
  }

  function buildLines(state) {
    if (state && Array.isArray(state.lines) && state.lines.length) {
      return state.lines.map((l, i) => {
        const qty = +l.qty || 0;
        const unitEx = +l.unit_price_ex_vat || 0;
        const vskPct = (l.vsk_pct == null ? 24 : +l.vsk_pct);
        const lineEx = qty * unitEx;
        const vskCode = vskPct >= 20 ? '2' : (vskPct >= 10 ? '1' : '0');
        return {
          ref: l.ref || (l.product_id ? String(l.product_id) : ''),
          desc: l.desc || '',
          qty,
          unitEx,
          lineEx,
          vskPct,
          vskCode
        };
      });
    }
    return [];
  }

  function totalsByRate(lines) {
    const byRate = {};
    let subEx = 0, vsk = 0;
    for (const l of lines) {
      const v = (l.lineEx * l.vskPct) / 100;
      subEx += l.lineEx;
      vsk += v;
      const key = String(l.vskPct);
      byRate[key] = byRate[key] || { vskPct: l.vskPct, vskCode: l.vskCode, ex: 0, vsk: 0 };
      byRate[key].ex += l.lineEx;
      byRate[key].vsk += v;
    }
    return { subEx, vsk, total: subEx + vsk, byRate };
  }

  const CSS = `
    @page { size: A4; margin: 0; }
    @media print {
      .no-print { display: none !important; }
      body { background: #fff !important; padding: 0 !important; }
      .sheet { box-shadow: none !important; margin: 0 !important; padding: 16mm !important; }
    }
    html, body {
      font-family: Arial, Helvetica, 'Helvetica Neue', sans-serif;
      background: #f1f5f9; margin: 0; padding: 24px 16px; color: #000;
      -webkit-print-color-adjust: exact; print-color-adjust: exact;
    }
    .no-print { max-width: 800px; margin: 0 auto 18px; text-align: center; }
    .no-print button {
      padding: 11px 22px; border-radius: 8px; font: inherit;
      font-size: 14px; font-weight: 600; cursor: pointer; border: none; margin: 0 4px;
    }
    .btn-primary { background: #1a7f4b; color: #fff; }
    .btn-primary:hover { background: #156c40; }
    .btn-secondary { background: #fff; color: #334155; border: 1px solid #cbd5e1 !important; }
    .btn-secondary:hover { background: #f8fafc; }

    .sheet {
      background: #fff; max-width: 800px; margin: 0 auto;
      padding: 18mm 16mm 14mm; box-shadow: 0 4px 24px rgba(15,23,42,.08);
      font-size: 10pt; line-height: 1.4; color: #000;
      min-height: 270mm; display: flex; flex-direction: column; box-sizing: border-box;
    }

    .hdr {
      display: flex; justify-content: space-between; align-items: flex-start;
      margin-bottom: 24px;
    }
    .hdr-left { display: flex; align-items: center; gap: 14px; }
    .logo-circle {
      width: 56px; height: 56px; border-radius: 50%; background: #000;
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    }
    .hdr-co { line-height: 1.05; }
    .co-name, .co-tag {
      font-size: 22pt; font-weight: 800; letter-spacing: -0.01em;
    }
    .co-kt {
      font-size: 7.5pt; color: #444; margin-top: 3px; letter-spacing: 0.04em;
    }
    .hdr-right {
      text-align: right; font-size: 10pt; line-height: 1.55; padding-top: 4px;
    }
    .hdr-right .vsk-line { font-weight: 600; }

    .meta-row {
      display: grid; grid-template-columns: 1fr 1fr; gap: 28px;
      margin: 10px 0 22px;
    }
    .bill-to { font-size: 10pt; line-height: 1.55; }
    .bill-to .nafn { font-size: 11pt; }
    .bill-to .vegna { margin-top: 12px; font-size: 9.5pt; font-style: italic; color: #111; }

    .invoice-meta { font-size: 10pt; }
    .inv-title-row {
      display: flex; justify-content: space-between; align-items: baseline;
      border-bottom: 0.6pt solid #000; padding-bottom: 4px; margin-bottom: 8px;
    }
    .inv-title-row em {
      font-style: italic; font-size: 18pt; font-weight: 700; letter-spacing: -0.01em;
    }
    .inv-num { font-size: 14pt; font-weight: 700; }
    .inv-meta-grid {
      display: grid; grid-template-columns: auto 1fr; gap: 1px 14px;
      font-size: 10pt;
    }
    .inv-meta-grid .lbl { color: #000; }
    .inv-meta-grid .val { text-align: right; }

    .items {
      width: 100%; border-collapse: collapse; margin: 6px 0 0;
      font-size: 10pt;
    }
    .items thead th {
      text-align: left; font-weight: 700; padding: 4px 6px;
      border-top: 0.6pt solid #000; border-bottom: 0.6pt solid #000;
      font-size: 9.5pt;
    }
    .items th.num-col { width: 9%; }
    .items th.desc-col { width: 36%; }
    .items th.qty-col { width: 9%; text-align: right; }
    .items th.unit-col { width: 16%; text-align: right; }
    .items th.amt-col { width: 18%; text-align: right; }
    .items th.vsk-col { width: 6%; text-align: right; padding-right: 0; }
    .items td { padding: 4px 6px; vertical-align: top; font-size: 10pt; }
    .items td.qty-col, .items td.unit-col, .items td.amt-col, .items td.vsk-col {
      text-align: right; white-space: nowrap;
    }
    .items td.vsk-col { padding-right: 0; }

    .spacer { flex: 1 1 auto; min-height: 24mm; }

    .totals-block {
      margin-top: 12px; margin-left: 42%; font-size: 10.5pt;
    }
    .totals-line {
      display: flex; justify-content: space-between; align-items: baseline;
      padding: 5px 0; border-top: 0.6pt solid #000;
    }
    .totals-line .amt { font-weight: 700; padding-left: 16px; white-space: nowrap; }
    .totals-line.vsk-line { font-size: 9.5pt; font-weight: 400; }
    .totals-line.vsk-line .amt { font-weight: 600; }
    .totals-line.grand {
      font-weight: 700; border-bottom: 0.6pt solid #000; padding: 7px 0;
    }

    .footer { margin-top: 18px; font-size: 9pt; }
    .signature { display: flex; align-items: baseline; gap: 8px; }
    .signature .lbl { white-space: nowrap; }
    .signature .line {
      flex: 1; max-width: 280px; border-bottom: 0.6pt solid #000; height: 1.2em;
    }
    .disclaimer { margin-top: 16px; font-size: 8pt; color: #444; }

    /* Phone preview: shrink the sheet so the user can see/print without horizontal scroll */
    @media screen and (max-width: 600px) {
      html, body { padding: 6px !important; }
      .sheet {
        max-width: 100% !important; padding: 8mm 6mm !important;
        min-height: auto !important; font-size: 9pt;
      }
      .hdr { flex-direction: column; gap: 12px; }
      .hdr-right { text-align: left; }
      .meta-row { grid-template-columns: 1fr; gap: 14px; }
      .totals-block { margin-left: 0 !important; }
      .co-name, .co-tag { font-size: 18pt; }
      .inv-title-row em { font-size: 16pt; }
      .items th, .items td { padding: 3px 4px !important; font-size: 9pt; }
      .no-print button { padding: 9px 14px; font-size: 13px; }
    }
  `;

  function buildHTML(ctx) {
    const t = ctx.totals;
    const lines = ctx.lines;
    const rateOrder = Object.keys(t.byRate).sort((a, b) => +a - +b);
    const vskBreakdown = rateOrder.map(k => {
      const r = t.byRate[k];
      return `<div class="totals-line vsk-line">
        <span class="lbl">${esc(r.vskCode)} = Sala með ${r.vskPct.toLocaleString(ICELAND_LOCALE, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}% Vsk: ${fmtAmtDec(r.ex)}</span>
        <span class="amt">${fmtAmt(r.vsk)}</span>
      </div>`;
    }).join('');

    const linesHTML = lines.map(l => `
      <tr>
        <td class="num-col">${esc(l.ref || '')}</td>
        <td class="desc-col">${esc(l.desc)}</td>
        <td class="qty-col">${l.qty ? l.qty.toLocaleString(ICELAND_LOCALE, { minimumFractionDigits: l.qty % 1 ? 1 : 0, maximumFractionDigits: 2 }) : ''}</td>
        <td class="unit-col">${fmtAmt(l.unitEx)}</td>
        <td class="amt-col">${fmtAmt(l.lineEx)}</td>
        <td class="vsk-col">${esc(l.vskCode)}</td>
      </tr>`).join('');

    const co = ctx.customer || {};
    const addr = splitAddress(co.heimilisfang);
    const customerLines = [];
    if (co.nafn || ctx.customerName) customerLines.push(`<div class="nafn">${esc(co.nafn || ctx.customerName)}</div>`);
    if (addr.line1) customerLines.push(`<div>${esc(addr.line1)}</div>`);
    if (addr.line2) customerLines.push(`<div>${esc(addr.line2)}</div>`);
    if (co.kennitala) customerLines.push(`<div>${esc(fmtKt(co.kennitala))}</div>`);
    if (ctx.vegna) customerLines.push(`<div class="vegna">vegna ${esc(ctx.vegna)}</div>`);

    return `
      <div class="no-print">
        <button onclick="window.print()" class="btn-primary">🖨 Prenta reikning</button>
        <button onclick="window.close()" class="btn-secondary">Loka</button>
      </div>
      <div class="sheet">
        <header class="hdr">
          <div class="hdr-left">
            <div class="logo-circle">
              <svg viewBox="0 0 48 48" width="44" height="44">
                <circle cx="24" cy="24" r="24" fill="#000"/>
                <path d="M24 9c-2 5-4 7-6 11-2.5 5 0 11 6 14-3-2-3-6 0-9 1.5 2 3 4 3 7 4-2 6-6 6-11 0-4-3-7-5-9 0 3-1 5-3 5 1-3 0-6-1-8z" fill="#fff"/>
              </svg>
            </div>
            <div class="hdr-co">
              <div class="co-name">${esc(COMPANY.name)}</div>
              <div class="co-tag">${esc(COMPANY.tag)}</div>
              <div class="co-kt">Kt. ${esc(COMPANY.kt)}</div>
            </div>
          </div>
          <div class="hdr-right">
            <div>${esc(COMPANY.name)} &nbsp;&nbsp;<span class="vsk-line">VSK nr. ${esc(COMPANY.vsk)}</span></div>
            <div>${esc(COMPANY.addr1)}</div>
            <div>${esc(COMPANY.addr2)}</div>
          </div>
        </header>

        <div class="meta-row">
          <div class="bill-to">
            ${customerLines.join('')}
          </div>
          <div class="invoice-meta">
            <div class="inv-title-row">
              <em>Reikningur</em>
              <span class="inv-num">${esc(ctx.invoiceNum || '')}</span>
            </div>
            <div class="inv-meta-grid">
              <div class="lbl">Dagsetning:</div><div class="val">${esc(ctx.dateStr)}</div>
              <div class="lbl">Greiðsl.skilm.:</div><div class="val">${esc(ctx.paymentTerms)}</div>
              <div class="lbl">Afh.skilm.:</div><div class="val">${esc(ctx.deliveryTerms)}</div>
              <div class="lbl">Starfsmaður:</div><div class="val">${esc(ctx.employee)}</div>
              <div class="lbl">Tilvísun:</div><div class="val">${esc(ctx.tilvisun || '')}</div>
              <div class="lbl">Raðnr.:</div><div class="val">${esc(ctx.radnr || '')}</div>
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
            <span class="amt">${fmtAmt(t.subEx)}</span>
          </div>
          ${vskBreakdown}
          <div class="totals-line grand">
            <span class="lbl">Til greiðslu :</span>
            <span class="amt">${fmtAmt(t.total)}</span>
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

  function render(win, options) {
    if (!win || win.closed) return false;
    const opts = options || {};
    const state = (window.POS && typeof POS.getState === 'function') ? POS.getState() : null;
    const customer = lookupCustomer(state);
    const lines = buildLines(state);
    if (!lines.length) {
      console.warn('[SalaInvoice] no lines in POS state — falling back to no-op');
      return false;
    }
    const t = totalsByRate(lines);
    const now = new Date();
    const notes = (state && state.notes) || '';

    const ctx = {
      lines,
      totals: t,
      customer,
      customerName: opts.customerName || (state && state.customer && state.customer.nafn) || '',
      invoiceNum: opts.invoiceNum || ('R-' + now.getTime().toString().slice(-6)),
      radnr: opts.radnr || (state && state.customer && state.customer.kt) || '',
      dateStr: fmtDate(now),
      paymentTerms: opts.paymentTerms || DEFAULTS.paymentTerms,
      deliveryTerms: opts.deliveryTerms || DEFAULTS.deliveryTerms,
      employee: opts.employee || DEFAULTS.employee,
      tilvisun: opts.tilvisun || (state && state.customer && state.customer.simi) || '',
      vegna: opts.vegna || notes
    };

    try {
      const doc = win.document;
      doc.open();
      doc.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Reikningur ${esc(ctx.invoiceNum)}</title><style>${CSS}</style></head><body>${buildHTML(ctx)}</body></html>`);
      doc.close();
      doc.title = 'Reikningur ' + ctx.invoiceNum;
      return true;
    } catch (e) {
      console.error('[SalaInvoice] render error', e);
      return false;
    }
  }

  window.SalaInvoice = { render, version: 'v2' };
  console.log('[sala-invoice] v2 ready');
})();
/* === END SALA RECEIPT REDESIGN === */
