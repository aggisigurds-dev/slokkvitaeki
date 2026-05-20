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
  const COMPANY_FALLBACK = {
    name: 'Slökkvitæki ehf',      // LEGAL entity name — used in VAT address block, alt text
    nameLogo: 'Slökkvitæki',      // VISUAL identity for the logo area (drops "ehf")
    tag: 'Brunahólf',
    kt: '600508-0400',
    vsk: '98107',
    addr1: 'Helluhrauni 10',
    addr2: '220 Hafnarfjörður',
    phone: '565-4080'
  };
  // Live getter: pulls company info from AppSettings (Settings panel → Branding)
  // every time a receipt is built. Falls back to hardcoded values until
  // settings load. Uses a Proxy-free pattern via getter object.
  const COMPANY = {
    get name()     { const b = window.AppSettings && window.AppSettings.path('branding'); return (b && b.company_name) || COMPANY_FALLBACK.name; },
    // nameLogo = visual identity for the logo area at the top of the receipt.
    // Auto-trims " ehf" from the legal name ("Slökkvitæki ehf" → "Slökkvitæki").
    // The in-app top banner uses banner_text directly so it can keep "ehf" internally.
    get nameLogo() { return this.name.replace(/\s+ehf\.?\s*$/i, ''); },
    get tag()      { const b = window.AppSettings && window.AppSettings.path('branding'); return (b && b.tagline)      || COMPANY_FALLBACK.tag; },
    get kt()    { const b = window.AppSettings && window.AppSettings.path('branding'); return (b && b.kennitala)    || COMPANY_FALLBACK.kt; },
    get vsk()   { const b = window.AppSettings && window.AppSettings.path('branding'); return (b && b.vsk_nr)       || COMPANY_FALLBACK.vsk; },
    get addr1() { const b = window.AppSettings && window.AppSettings.path('branding'); return (b && b.address1)     || COMPANY_FALLBACK.addr1; },
    get addr2() { const b = window.AppSettings && window.AppSettings.path('branding'); return (b && b.address2)     || COMPANY_FALLBACK.addr2; },
    get phone() { const b = window.AppSettings && window.AppSettings.path('branding'); return (b && b.phone)        || COMPANY_FALLBACK.phone; }
  };
  const DEFAULTS = {
    paymentTerms: 'Staðgreitt',
    deliveryTerms: 'Skilmáli1',
    employee: 'Kassi'  // last-resort fallback only — see resolveEmployee()
  };

  // Resolve the "Starfsmaður" field on the receipt to the actual logged-in
  // user's display name (from window.UserAuth) so it shows e.g.
  // "Haukur Valdimarsson" instead of the generic "Kassi".
  function resolveEmployee() {
    try {
      const profile = window.UserAuth?.getProfile?.();
      if (profile && profile.nafn) return profile.nafn;
      const user = window.UserAuth?.getUser?.();
      if (user && user.email) return user.email.split('@')[0];
    } catch (e) { /* fall through */ }
    // Fallback to first non-empty starfsmadur from AppSettings (Stillingar → Starfsmenn).
    try {
      const list = window.AppSettings && window.AppSettings.path('starfsmenn');
      if (Array.isArray(list)) {
        const first = list.find(s => s && s.name && s.name.trim());
        if (first) return first.name.trim();
      }
    } catch (e) { /* ignore */ }
    return DEFAULTS.employee;
  }

  // Map greitt_med payment-method codes to the wording shown on the receipt
  // under "Greiðsl.skilm."
  function paymentTermsFor(method) {
    const m = String(method || '').toLowerCase().trim();
    if (m === 'reikningur' || m === 'i reikning' || m === 'í reikning') {
      return 'Krafa í banka 10 dagar';
    }
    if (m === 'greitt_sidar' || m === 'greitt sidar' || m === 'greitt síðar') {
      return 'Ógreitt — greitt við afhendingu';
    }
    // Card, cash and everything else default to Staðgreitt
    return 'Staðgreitt';
  }

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
    // Honor Stillingar → Almennt → "Dagsformat". Falls back to dd.mm.yy
    // (legacy) if AppSettings is not loaded yet.
    if (window.AppSettings && typeof window.AppSettings.fmtDate === 'function') {
      try { return window.AppSettings.fmtDate(d); } catch (_) {}
    }
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

  function totalsByRate(lines, opts) {
    const byRate = {};
    let rawEx = 0, rawVsk = 0;
    for (const l of lines) {
      const v = (l.lineEx * l.vskPct) / 100;
      rawEx += l.lineEx;
      rawVsk += v;
      const key = String(l.vskPct);
      byRate[key] = byRate[key] || { vskPct: l.vskPct, vskCode: l.vskCode, ex: 0, vsk: 0 };
      byRate[key].ex += l.lineEx;
      byRate[key].vsk += v;
    }
    // Apply discount: % first, then absolute kr. Both clamp at zero. The
    // discount is split across VSK rates proportionally so the breakdown
    // (e.g. "Sala með 24% Vsk") reflects the post-discount amounts.
    const pct = Math.max(0, Math.min(100, parseFloat(opts && opts.discount_pct) || 0));
    const abs = Math.max(0, parseFloat(opts && opts.discount) || 0);
    const pctDiscEx = rawEx * pct / 100;
    const totalDiscEx = Math.min(rawEx, pctDiscEx + abs);
    const subEx = Math.max(0, rawEx - totalDiscEx);
    const factor = rawEx > 0 ? subEx / rawEx : 1;
    let vsk = 0;
    Object.keys(byRate).forEach(k => {
      byRate[k].ex *= factor;
      byRate[k].vsk *= factor;
      vsk += byRate[k].vsk;
    });
    return {
      subEx, vsk, total: subEx + vsk, byRate,
      rawEx, rawVsk, discountEx: totalDiscEx, discountPct: pct, discountAbs: abs
    };
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
    .bill-to { font-size: 10.5pt; line-height: 1.5; color: #000; }
    .bill-to .bt-name { font-size: 10.5pt; margin-bottom: 10px; }
    .bill-to .bt-line { font-size: 10.5pt; }
    .bill-to .vegna { margin-top: 10px; font-size: 9.5pt; font-style: italic; }

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
    .signature { display: flex; align-items: baseline; gap: 8px; margin-top: 28px; }
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

  // The receipt opens in a popup whose URL is `about:blank`, so root-relative
  // paths like "/img/logo.png" don't resolve. Build an absolute URL from the
  // parent window's origin so the logo loads correctly in print + preview.
  // 2026-05-20: cache-bust so browsers pick up the new Slökkvitæki Brunahólf
  // wordmark logo (replaces the small extinguisher icon).
  const LOGO_URL = (typeof window !== 'undefined' && window.location && window.location.origin)
    ? window.location.origin + '/img/logo.png?v=20260520b'
    : '/img/logo.png?v=20260520b';

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
    let nafn  = co.nafn || ctx.customerName || '';
    // Strip the auto-generated "Viðskiptavinur NNNNNN-NNNN" placeholder name
    // (created by legacy.js when a sale is made with only a kennitala). Run
    // unconditionally — when re-printing a historical sale the kennitala may
    // not be passed in separately, but it's embedded in the name itself and
    // we can recover it from there.
    const placeholder = /^vi[ðd]skiptavinur\s+(\d{6,}(?:-?\d{4})?)\s*$/i.exec(nafn.trim());
    if (placeholder) {
      nafn = 'Viðskiptavinur';
      if (!co.kennitala) co.kennitala = placeholder[1];
    }
    const ktDigits = (co.kennitala || '').replace(/[^0-9]/g, '');
    if (ktDigits && nafn.replace(/[^0-9]/g, '') === ktDigits && /^[\d\s-]+$/.test(nafn)) {
      nafn = 'Viðskiptavinur';
    }
    const customerRows = [];
    if (nafn)         customerRows.push(`<div class="bt-name">${esc(nafn)}</div>`);
    if (addr.line1)   customerRows.push(`<div class="bt-line">${esc(addr.line1)}</div>`);
    if (addr.line2)   customerRows.push(`<div class="bt-line">${esc(addr.line2)}</div>`);
    if (co.kennitala) customerRows.push(`<div class="bt-line">${esc(fmtKt(co.kennitala))}</div>`);
    // Strip the legacy auto-prepended "ÓGREITT — verður greitt við afhendingu"
    // stamp. Older sales saved this into athugasemdir and the field still has it.
    // paymentTerms now conveys the same info; the stamp on the receipt is just
    // duplicate noise. Keep whatever real free-form note remains.
    if (ctx.vegna) {
      const cleaned = String(ctx.vegna)
        .replace(/^[\s⚠❗]*(?:Ó|O)GREITT\s*[—\-:]\s*verður\s+greitt\s+við\s+afhendingu\s*[—\-:]?\s*/i, '')
        .replace(/^[\s⚠❗]*(?:Ó|O)GREITT\s*[—\-:]?\s*/i, '')
        .trim();
      if (cleaned) {
        customerRows.push(`<div class="vegna">vegna ${esc(cleaned)}</div>`);
      }
    }

    return `
      <div class="no-print">
        <button onclick="window.print()" class="btn-primary">🖨 Prenta reikning</button>
        <button onclick="window.close()" class="btn-secondary">Loka</button>
      </div>
      <div class="sheet">
        <header class="hdr">
          <div class="hdr-left">
            ${(() => {
              // Honor Stillingar → Kvittun → "Birta logo" toggle. When off,
              // logo is skipped entirely (the company name takes its place).
              const showLogo = !window.AppSettings || window.AppSettings.path('kvittun.show_logo') !== false;
              if (!showLogo) return '';
              // 2026-05-20: 3:1 container so any wordmark logo fits without
              // distortion. Was a 72x72 circle (designed for the old
              // extinguisher icon); now reads as a horizontal brand bar.
              // 2026-05-20: bumped from 60 → 110 per Agnar's request — let
              // the wordmark be the visual hero of the receipt.
              if (window.SlokkLogo && SlokkLogo.imgHtml) {
                return SlokkLogo.imgHtml({ heightPx: 110, alt: COMPANY.name, absoluteUrl: true });
              }
              return `<img src="${esc(LOGO_URL)}" alt="${esc(COMPANY.name)}"
              style="height:110px;width:330px;object-fit:contain;display:inline-block"
              onerror="this.style.visibility='hidden'">`;
            })()}
            ${(() => {
              // 2026-05-20: Logo is the visual hero on the left. When the
              // wordmark logo is on, drop ALL the duplicate text on the left
              // (name/tag/kt). Kt now lives on the right block under the
              // company-name line. With logo off, restore the legacy text.
              const showLogo = !window.AppSettings || window.AppSettings.path('kvittun.show_logo') !== false;
              if (showLogo) return '';
              return '<div class="hdr-co">' +
                '<div class="co-name">' + esc(COMPANY.nameLogo) + '</div>' +
                '<div class="co-tag">' + esc(COMPANY.tag) + '</div>' +
                '<div class="co-kt">Kt. ' + esc(COMPANY.kt) + '</div>' +
              '</div>';
            })()}
          </div>
          <div class="hdr-right">
            <div>${esc(COMPANY.name)} &nbsp;&nbsp;<span class="vsk-line">VSK nr. ${esc(COMPANY.vsk)}</span></div>
            <div>Kt. ${esc(COMPANY.kt)}</div>
            <div>${esc(COMPANY.addr1)}</div>
            <div>${esc(COMPANY.addr2)}</div>
          </div>
        </header>

        <div class="meta-row">
          <div class="bill-to">
            ${customerRows.join('')}
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
          ${(t.discountEx > 0) ? `
            <div class="totals-line">
              <span class="lbl">Samtals fyrir afslátt:</span>
              <span class="amt">${fmtAmt(t.rawEx)}</span>
            </div>
            <div class="totals-line" style="color:#b91c1c">
              <span class="lbl">Afsláttur${t.discountPct > 0 ? ' ('+t.discountPct+'%)' : ''}:</span>
              <span class="amt">−${fmtAmt(t.discountEx)}</span>
            </div>
          ` : ''}
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
          ${(() => {
            // Pull from AppSettings.kvittun (Stillingar → Kvittun tab)
            const k = (window.AppSettings && window.AppSettings.path('kvittun')) || {};
            const isInv = ctx.paymentMethod === 'reikningur' || /reikning/i.test(ctx.paymentTerms || '');
            const reikMsg = (isInv && k.reikningur_message) ? `<div class="reik-msg" style="margin-bottom:8px;padding:8px 10px;background:#fff7ed;border-left:3px solid #C93C1D;font-size:9pt;color:#7c2d12">${esc(k.reikningur_message)}</div>` : '';
            const footerTxt = k.footer_text ? `<div class="footer-txt" style="margin-top:6px;text-align:center;font-size:9pt;color:#475569;font-style:italic">${esc(k.footer_text)}</div>` : '';
            return reikMsg + footerTxt;
          })()}
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
    let customer = lookupCustomer(state);
    // Fallback: if no Companies.list record matched, build a synthetic customer
    // from the POS state OR from explicit opts.customer{Name,Kt,Simi} passed
    // by the caller (e.g. the checkout dialog reads the live form fields and
    // hands them to us; state may not be set when the call originates there).
    if (!customer) {
      const sc = (state && state.customer) || {};
      const fallbackNafn = sc.nafn || opts.customerName || '';
      const fallbackKt   = sc.kt   || sc.kennitala || opts.customerKt || '';
      const fallbackAddr = sc.heimilisfang || opts.customerHeimilisfang || '';
      if (fallbackNafn || fallbackKt || fallbackAddr) {
        customer = {
          nafn: fallbackNafn,
          kennitala: fallbackKt,
          heimilisfang: fallbackAddr
        };
      }
    }
    const lines = buildLines(state);
    if (!lines.length) {
      console.warn('[SalaInvoice] no lines in POS state — falling back to no-op');
      return false;
    }
    // Pull discount from state (or from explicit opts overrides) so the
    // receipt's totals & VSK breakdown match what the POS showed.
    const t = totalsByRate(lines, {
      discount_pct: (opts.discount_pct != null) ? opts.discount_pct
                  : (state && state.discount_pct) || 0,
      discount:     (opts.discount != null) ? opts.discount
                  : (state && state.discount) || 0
    });
    const now = new Date();
    const notes = (state && state.notes) || '';

    // Derive paymentTerms from the supplied payment method if not explicit.
    const derivedTerms = opts.paymentMethod
      ? paymentTermsFor(opts.paymentMethod)
      : (opts.paymentTerms || DEFAULTS.paymentTerms);

    const ctx = {
      lines,
      totals: t,
      customer,
      customerName: opts.customerName || (state && state.customer && state.customer.nafn) || '',
      // Sequential R-NNNNNN numbers are assigned by the Supabase trigger on
      // INSERT into solur. Pass through opts.invoiceNum when available;
      // otherwise show a placeholder which the user can replace once saved.
      invoiceNum: opts.invoiceNum || 'R-(úthlutað við vistun)',
      // Raðnr. = the device/serial number for this receipt. NOT the kennitala
      // (that belongs in the bill-to block). Leave blank unless caller passes one.
      radnr: opts.radnr || '',
      dateStr: fmtDate(now),
      paymentTerms: derivedTerms,
      deliveryTerms: opts.deliveryTerms || DEFAULTS.deliveryTerms,
      employee: opts.employee || resolveEmployee(),
      // Tilvísun is a freeform reference field; don't auto-fill with phone.
      tilvisun: opts.tilvisun || '',
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

  // Re-render a previously-saved sale (a row from the `solur` table) using
  // the same template. Called by the Bókhalds yfirlit / Tekjur / Reikningar
  // views when the user wants to re-print a historical receipt. The saved
  // row already has the correct invoice number, lines, totals, etc., so we
  // just unpack it into a synthetic POS-state shape and call render().
  function renderFromSale(win, sale, customerLookup) {
    if (!win || win.closed || !sale) return false;
    // Build a synthetic state. The renderer reads `state.lines`,
    // `state.discount_pct`, `state.discount`, `state.notes` and
    // `state.customer.{nafn,kt,co_id,heimilisfang}`.
    const linur = Array.isArray(sale.linur) ? sale.linur : [];
    // Reconstruct discount % from saved data when possible. We saved
    // `afslattur` as the absolute kr amount applied at sale time; pass it
    // through as discount_pct=0, discount=afslattur so the receipt totals
    // match what was originally printed.
    const fakeState = {
      lines: linur,
      discount: +sale.afslattur || 0,
      discount_pct: 0,
      notes: sale.athugasemdir || '',
      customer: {
        nafn: sale.customer_nafn || '',
        kt: '',
        kennitala: '',
        heimilisfang: '',
        co_id: sale.customer_id || null
      }
    };
    // If the caller provides extra customer info (e.g. fetched from the
    // `vidskiptavinir` / `fyrirtaeki` tables) splice it in.
    if (customerLookup) {
      fakeState.customer.kt = customerLookup.kennitala || '';
      fakeState.customer.kennitala = customerLookup.kennitala || '';
      fakeState.customer.heimilisfang = customerLookup.heimilisfang || '';
    }
    // Temporarily override POS.getState() so render() pulls our fake state.
    const origGetState = window.POS && window.POS.getState;
    if (window.POS) window.POS.getState = () => fakeState;
    try {
      return render(win, {
        invoiceNum: sale.num || '',
        paymentMethod: sale.greitt_med || '',
        employee: sale.starfsmadur || '',
        customerName: sale.customer_nafn || '',
        customerKt: customerLookup ? customerLookup.kennitala : '',
        customerHeimilisfang: customerLookup ? customerLookup.heimilisfang : ''
      });
    } finally {
      if (window.POS) window.POS.getState = origGetState;
    }
  }

  window.SalaInvoice = { render, renderFromSale, paymentTermsFor, version: 'v8' };
  console.log('[sala-invoice] v8 ready');
})();
/* === END SALA RECEIPT REDESIGN === */
