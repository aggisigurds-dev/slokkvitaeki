/* === SALA RECEIPT REDESIGN v2 === */
/* A4 invoice ("Reikningur") that matches the existing paper layout:
 *   - Top-left: company name + logo + kt
 *   - Top-right: address + VSK nr.
 *   - Mid-row: customer block (left) | invoice meta (right) divided by a rule
 *   - Items table: Vörunúmer | Lýsing | Fjöldi | Einingaverð | Upphæð | VSK
 *   - Bottom-right totals block: Samtals fyrir Vsk + per-rate VAT lines + Til greiðslu
 *   - Footer: reglugerð disclaimer
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
  // Afsl.% column — reference-invoice style „15,00" (2 aukastafir, komma). Tómt við 0.
  function fmtPct(p) {
    if (p == null || isNaN(p) || +p <= 0) return '';
    return (+p).toLocaleString(ICELAND_LOCALE, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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

  // 2026-05-21: lookupCustomer used to blindly trust `co_id` against
  // Companies.list (= fyrirtaeki). But solur.customer_id may have come from
  // the SEPARATE `vidskiptavinir` table — and ids overlap between the two.
  // Example: R-000165 (Höldur ehf.) had customer_id=513 because Höldur lives
  // in vidskiptavinir, but fyrirtaeki ALSO has id=513 (Gólfbúðin) — so the
  // invoice was printing "Gólfbúðin" for a Höldur bill. Fix: id-lookup only
  // wins if the name matches what's stored on the sale; otherwise fall
  // through to name-based matching across the actual company list.
  //
  // 2026-06-02: also search `vidskiptavinir`, not just `fyrirtaeki`. A sale to
  // a vidskiptavinir-only customer (e.g. "dna bókhald ehf.") printed with the
  // name only — its kennitala/heimilisfang were never recovered because the
  // bill-to resolution looked at the company list alone. Match by name across
  // BOTH tables (which also neutralises the id collision above, since the name
  // must agree before an id match is trusted).
  function customerPool() {
    const fy = (window.Companies && Companies.list) || [];
    const vk = (window.Vidskiptavinir && Vidskiptavinir.list)
            || (window.DB && DB.cache && DB.cache.vidsk) || [];
    return { fy, vk, all: fy.concat(vk) };
  }

  function lookupCustomer(state) {
    const { fy, vk, all } = customerPool();
    if (!all.length) return null;
    const norm = s => String(s || '').trim().toLowerCase().replace(/[\s\.,;:]+$/g, '');
    const sc = (state && state.customer) || {};
    const rawName = (sc.nafn || '').trim();
    const expected = norm(rawName);

    // id-match — but only trust it when the stored name agrees, since ids
    // overlap between fyrirtaeki and vidskiptavinir. Check companies first.
    if (sc.co_id) {
      const f = fy.find(c => +c.id === +sc.co_id);
      if (f && (!expected || norm(f.nafn) === expected)) return f;
      const v = vk.find(c => +c.id === +sc.co_id);
      if (v && (!expected || norm(v.nafn) === expected)) return v;
    }
    // name match across both tables (exact, then prefix).
    if (expected) {
      return all.find(c => norm(c.nafn) === expected)
          || all.find(c => norm(c.nafn).indexOf(expected) === 0)
          || null;
    }
    // kt match across both tables.
    const kt = (sc.kt || sc.kennitala || '').replace(/[^0-9]/g, '');
    if (kt.length === 10) {
      return all.find(c => String(c.kennitala || '').replace(/[^0-9]/g, '') === kt) || null;
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
        let unitEx = +l.unit_price_ex_vat || 0;
        let desc = l.desc || '';
        // 2026-08-19 (Agnar): honour a LIVE per-line discount (disc_pct) the POS
        // "Afsláttur %" box writes on the cart line. Baking it into the price +
        // the "· −N% afsl." marker normally happens in bakedLines() AT SAVE, but
        // the checkout dialog prints the receipt from the live, unbaked state
        // BEFORE the save — so a per-line discount printed at full price with no
        // Afsláttur line. disc_pct is a live-only field (0 saved rows carry it),
        // so this can't collide with renderFromSale's kept-pct (case A) path.
        const dp = Math.max(0, Math.min(100, parseFloat(l.disc_pct) || 0));
        // 2026-08-19 (Agnar — reference-invoice format „make all calculations
        // follow the same rule"): the per-line discount now lives in its OWN
        // Afsl.% column, so the Einingaverð column can show the NET unit price and
        // Upphæð = unitBase×qty×(1−afsl%) — exactly the reikningur Agnar sent and
        // exactly what Payday bills (net unit + line discount %). Display-only:
        // unitEx/lineEx (and therefore totalsByRate) are byte-unchanged; we only
        // (a) remember the pre-discount base + the %, and (b) stop printing the
        // „· −N% afsl." marker in the Lýsing (it would double up with the column).
        let unitBase = unitEx;   // net unit BEFORE the per-line discount
        let dispPct = 0;         // per-line discount % for the Afsl.% column
        const bakedMarker = String(desc).match(/·\s*[−-]\s*(\d+(?:[.,]\d+)?)\s*%\s*afsl\.?/i);
        if (bakedMarker) {
          // saved sale: unitEx is ALREADY the discounted net — recover the base.
          const p = parseFloat(bakedMarker[1].replace(',', '.'));
          if (p > 0 && p < 100) { dispPct = p; unitBase = unitEx / (1 - p / 100); }
          desc = desc.replace(/\s*·\s*[−-]\s*\d+(?:[.,]\d+)?\s*%\s*afsl\.?/i, '').trim();
        } else if (dp > 0) {
          // live checkout line: bake the discount into unitEx (unchanged) and keep
          // the base + % for display; no marker text added.
          unitBase = unitEx;
          unitEx = Math.round(unitEx * (1 - dp / 100));
          dispPct = dp;
        }
        const vskPct = (l.vsk_pct == null ? 24 : +l.vsk_pct);
        // 2026-08-10 (ósk Agnars): Einingaverð dálkurinn sýnir nú m. vsk — talan
        // sem viðskiptavinurinn raunverulega greiðir per stk, ekki nettóverðið.
        const unitGross = unitEx * (1 + vskPct / 100);
        const lineEx = qty * unitEx;
        const vskCode = vskPct >= 20 ? '2' : (vskPct >= 10 ? '1' : '0');
        return {
          ref: l.ref || (l.product_id ? String(l.product_id) : ''),
          desc: desc,
          qty,
          unitEx,
          unitBase,
          dispPct,
          unitGross,
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
    // 2026-07-10 (verkefnalisti 962a74f0): línu-afslættir eru BAKAÐIR inn í
    // einingaverðin (165-konvensjónin, "· −N% afsl." í lýsingunni) og sáust því
    // hvergi í samtölu-blokkinni. Endurreiknum sparnaðinn úr lýsingunni —
    // upphaflegt verð = bakað/(1−p) — svo hægt sé að SÝNA afsláttinn án þess
    // að snerta tölurnar sjálfar (upplýsinga-lína, ekki ný stærðfræði).
    let lineDiscEx = 0;
    // 2026-08-10 (ósk Agnars): m.vsk hliðstæða lineDiscEx, fyrir totals-block
    // sem sýnir nú afslátt m. vsk í stað án vsk.
    let lineDiscGross = 0;
    const linePcts = [];
    let billableLines = 0, discLines = 0;
    for (const l of lines) {
      const v = (l.lineEx * l.vskPct) / 100;
      rawEx += l.lineEx;
      rawVsk += v;
      const key = String(l.vskPct);
      byRate[key] = byRate[key] || { vskPct: l.vskPct, vskCode: l.vskCode, ex: 0, vsk: 0 };
      byRate[key].ex += l.lineEx;
      byRate[key].vsk += v;
      if (l.lineEx > 0) {
        billableLines++;
        // per-line discount % now travels as l.dispPct (buildLines sets it from the
        // live disc_pct OR a saved „· −N% afsl." marker). Same value the marker
        // gave, so lineDiscEx/Gross — and therefore every displayed total — are
        // unchanged; the source is just cleaner now that the marker is stripped.
        const p = (l.dispPct != null ? +l.dispPct : 0);
        if (p > 0 && p < 100) {
          const reconstructedEx = l.lineEx * (p / (100 - p));
          lineDiscEx += reconstructedEx;
          lineDiscGross += reconstructedEx * (1 + l.vskPct / 100);
          if (linePcts.indexOf(p) < 0) linePcts.push(p);
          discLines++;
        }
      }
    }
    // Apply discount: % first, then absolute kr. Both clamp at zero. The
    // discount is split across VSK rates proportionally so the breakdown
    // (e.g. "Sala með 24% Vsk") reflects the post-discount amounts.
    // 2026-06-12: two semantics for the absolute kr discount —
    //   legacy (default):          abs comes off the ex-VAT subtotal
    //   opts.discount_gross=true:  abs comes off the FINAL price m. vsk, so
    //   the bottom line lands on a round number (5.200 − 200 = 5.000). The
    //   POS stores new sales this way; renderFromSale auto-detects per row.
    const pct = Math.max(0, Math.min(100, parseFloat(opts && opts.discount_pct) || 0));
    const abs = Math.max(0, parseFloat(opts && opts.discount) || 0);
    const pctDiscEx = rawEx * pct / 100;
    const grossMode = !!(opts && opts.discount_gross);
    let factor;
    if (grossMode) {
      const f1 = rawEx > 0 ? Math.max(0, rawEx - pctDiscEx) / rawEx : 1;
      const grossAfterPct = (rawEx + rawVsk) * f1;
      const f2 = grossAfterPct > 0 ? Math.max(0, grossAfterPct - abs) / grossAfterPct : 1;
      factor = f1 * f2;
    } else {
      const totalDiscExLegacy = Math.min(rawEx, pctDiscEx + abs);
      factor = rawEx > 0 ? Math.max(0, rawEx - totalDiscExLegacy) / rawEx : 1;
    }
    const subEx = rawEx * factor;
    const totalDiscEx = rawEx - subEx;
    let vsk = 0;
    Object.keys(byRate).forEach(k => {
      byRate[k].ex *= factor;
      byRate[k].vsk *= factor;
      vsk += byRate[k].vsk;
    });
    return {
      subEx, vsk, total: subEx + vsk, byRate,
      rawEx, rawVsk, discountEx: totalDiscEx, discountPct: pct, discountAbs: abs,
      grossMode,
      rawGross: rawEx + rawVsk,
      // kr m. vsk the customer saves — shown on the bill in gross mode
      discountGross: (rawEx + rawVsk) - (subEx + vsk),
      // bakaðir línu-afslættir (upplýsinga-lína í samtölum, sjá að ofan)
      lineDiscEx: lineDiscEx,
      lineDiscGross: lineDiscGross,
      // 2026-07-10 (📣 verkefnalisti 962a74f0): prósentan birtist AÐEINS þegar
      // sami afsláttur nær yfir ALLA vöruliðina — nái hann bara yfir hluta
      // þeirra stendur bara „Afsláttur" + upphæðin (annars villandi 20%).
      lineDiscPct: (linePcts.length === 1 && discLines === billableLines) ? linePcts[0] : 0
    };
  }

  const CSS = `
    @page { size: A4; margin: 0; }
    @media print {
      .no-print { display: none !important; }
      body { background: #fff !important; padding: 0 !important; }
      .sheet { box-shadow: none !important; margin: 0 !important; padding: 16mm !important; }
      .sheet[contenteditable="true"] { outline: none !important; }
    }
    /* 2026-08-19 (Agnar #7): „Breyta texta" gerir reikninginn ritanlegan á
       forskoðunar-skjánum og prentast þá eins og skilið er við hann. Ramminn
       sjálfur prentast aldrei — sjá regluna í @media print að ofan. */
    .sheet[contenteditable="true"] { outline: 2px dashed #d8451a; outline-offset: 6px; }
    .sheet[contenteditable="true"]:focus-within { outline-color: #b8390f; }
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
    .items th.unit-col { width: 14%; text-align: right; }
    .items th.afsl-col { width: 8%; text-align: right; }
    .items th.amt-col { width: 16%; text-align: right; }
    .items th.vsk-col { width: 6%; text-align: right; padding-right: 0; }
    .items td { padding: 4px 6px; vertical-align: top; font-size: 10pt; }
    .items td.qty-col, .items td.unit-col, .items td.afsl-col, .items td.amt-col, .items td.vsk-col {
      text-align: right; white-space: nowrap;
    }
    .items td.afsl-col { color: #444; }
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
        <td class="unit-col">${fmtAmt(l.unitBase)}</td>
        <td class="afsl-col">${l.dispPct ? fmtPct(l.dispPct) : ''}</td>
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
    if (ctx.vegnaRaw) {
      // Print the reference line exactly as supplied (e.g. visit invoices).
      customerRows.push(`<div class="vegna">${esc(ctx.vegnaRaw)}</div>`);
    } else if (ctx.vegna) {
      let cleaned = String(ctx.vegna)
        .replace(/^[\s⚠❗]*(?:Ó|O)GREITT\s*[—\-:]\s*verður\s+greitt\s+við\s+afhendingu\s*[—\-:]?\s*/i, '')
        .replace(/^[\s⚠❗]*(?:Ó|O)GREITT\s*[—\-:]?\s*/i, '')
        // 2026-07-26: eldri drög báru fræið „Drög — bíður Sótt ✓" (patch 122) sem
        // laup á reikninginn — staðan á heima í status-dálkinum, ekki hér. Strippa það.
        .replace(/^\s*Drög\s*[—–\-]\s*bíður\b[^\n]*/i, '')
        .trim();
      if (cleaned) {
        // 2026-05-27: Aggi asked to clean up the chaotic vegna line.
        // The walk-in flow often produces strings like:
        //   "Kt: 150486-2389 [Sótt 2026-05-27] Afsláttur: 20% (-1040 kr) Greiðsla: kort"
        // We pull each known token out into its own row, drop the redundant
        // "Greiðsla: ..." (already shown in Greiðsl.skilm. on the right) and
        // drop "Afsláttur: ..." (already shown in totals at the bottom).
        // 2026-07-23: the pickup checkout (patch 121) also appends an internal
        // audit block to athugasemdir — "[Sótt …] Ekki afhent: … Viðbót: …
        // Afsláttur við afhendingu: N% (−kr) Athugasemd: … Greiðsla: …" — which
        // was leaking onto the customer reikningur. It is bookkeeping or already
        // shown (line items + the discount in the totals), so cut the whole
        // trailing block. Any genuine note typed in KARFA precedes it and is kept.
        const ktMatch    = cleaned.match(/\bKt[:.]?\s*(\d{6}-?\d{4})/i);
        const sottMatch  = cleaned.match(/\bSótt[\s:]*\[?\s*(\d{4}-\d{2}-\d{2})\s*\]?/i);
        // Strip recognised tokens to reveal any leftover free-form note
        let remainder = cleaned
          .replace(/\bKt[:.]?\s*\d{6}-?\d{4}/i, '')
          .replace(/\[?\s*Sótt[\s:]*\d{4}-\d{2}-\d{2}\s*\]?/i, '')
          // 2026-07-31: innri bókhalds-merki sem láku á kúnnareikninginn (t.d.
          // R-000391 „Sótt ✓ (leiðrétt … var ranglega merkt „Drög — bíður"). Payday
          // #6 PAID."): Payday-greiðslustaða, „(leiðrétt …)" leiðréttinga-nóta og
          // „Sótt ✓" upptökuhak eiga heima í innri yfirlitum, ekki á reikningi kúnna.
          .replace(/\bPayday\s*#?\s*\d+\s*(?:PAID|SENT|CREDIT|CANCELL?ED|DRAFT|greitt|ógreitt|kredit)?\.?/gi, '')
          .replace(/\((?:leiðrétt|leidrett)[^)]*\)\.?/gi, '')
          .replace(/\bSótt\s*✓/gi, '')
          // Cut the pickup-audit trail (patch 121) from its first token to the end.
          .replace(/\s*(?:Ekki afhent|Viðbót|Afsláttur\s+(?:við afhendingu|úr sölu)|Athugasemd|Greiðsla)\s*:[\s\S]*$/i, '')
          .replace(/\bAfsl(?:áttur)?[:.]?\s*[\d,.]+%?\s*\(?[-−–\s]*[\d.,]*\s*kr?\)?/i, '')
          .replace(/\bGreiðsla[:.]?\s*\w+/i, '')
          // Tidy leftover punctuation
          .replace(/^\s*[,.\s]+|[,.\s]+$/g, '')
          .replace(/\s{2,}/g, ' ')
          .trim();
        if (ktMatch && !co.kennitala) {
          // Only show kt separately if it wasn't already on its own line
          customerRows.push(`<div class="bt-line">${esc(fmtKt(ktMatch[1]))}</div>`);
        }
        if (sottMatch) {
          const d = sottMatch[1];
          // Convert YYYY-MM-DD → DD.MM.YYYY for Icelandic format
          const [y, m, dd] = d.split('-');
          customerRows.push(`<div class="bt-line">Sótt: ${dd}.${m}.${y}</div>`);
        }
        if (remainder) {
          customerRows.push(`<div class="vegna">vegna ${esc(remainder)}</div>`);
        }
      }
    }

    return `
      <div class="no-print">
        <button onclick="window.print()" class="btn-primary">🖨 ${ctx.isTilbod ? 'Prenta tilboð' : 'Prenta reikning'}</button>
        <button type="button" onclick="var s=document.querySelector('.sheet');if(!s)return;var on=s.getAttribute('contenteditable')==='true';s.setAttribute('contenteditable',on?'false':'true');this.textContent=on?'✏️ Breyta texta':'✓ Búið að breyta';if(!on){s.focus();}" class="btn-secondary" title="Gerðu reikninginn ritanlegan og lagaðu texta áður en þú prentar">✏️ Breyta texta</button>
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
                return SlokkLogo.imgHtml({ heightPx: 110, alt: COMPANY.name, absoluteUrl: true, objectPosition: 'left' });
              }
              return `<img src="${esc(LOGO_URL)}" alt="${esc(COMPANY.name)}"
              style="height:110px;width:330px;object-fit:contain;object-position:left;display:inline-block"
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
              <em>${ctx.isTilbod ? 'TILBOÐ' : (ctx.isCredit ? 'KREDITREIKNINGUR' : 'Reikningur')}</em>
              <span class="inv-num">${esc(ctx.invoiceNum || '')}</span>
            </div>
            <div class="inv-meta-grid">
              ${ctx.isCredit && ctx.creditOf ? `<div class="lbl">Vegna reiknings:</div><div class="val">${esc(ctx.creditOf)}</div>` : ''}
              <div class="lbl">Dagsetning:</div><div class="val">${esc(ctx.dateStr)}</div>
              ${ctx.isTilbod
                ? (ctx.validUntil ? `<div class="lbl">Gildir til:</div><div class="val">${esc(ctx.validUntil)}</div>` : '')
                  + `<div class="lbl">Starfsmaður:</div><div class="val">${esc(ctx.employee)}</div>`
                : `<div class="lbl">Greiðsl.skilm.:</div><div class="val">${esc(ctx.paymentTerms)}</div>
              <div class="lbl">Afh.skilm.:</div><div class="val">${esc(ctx.deliveryTerms)}</div>
              <div class="lbl">Starfsmaður:</div><div class="val">${esc(ctx.employee)}</div>
              <div class="lbl">Tilvísun:</div><div class="val">${esc(ctx.tilvisun || '')}</div>
              <div class="lbl">Raðnr.:</div><div class="val">${esc(ctx.radnr || '')}</div>`}
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
              <th class="afsl-col">Afsl.%</th>
              <th class="amt-col">Upphæð</th>
              <th class="vsk-col">VSK</th>
            </tr>
          </thead>
          <tbody>${linesHTML}</tbody>
        </table>

        <div class="spacer"></div>

        <div class="totals-block">
          ${(() => {
            // 2026-08-10 (ósk Agnars): afsláttar-línurnar eru nú settar fram
            // M. VSK (áður án VSK) — sami "hvað borgar viðskiptavinurinn"
            // háttur og Einingaverð-dálkurinn og Karfan í POS. lineD/saleD/
            // discEx eru enn í ex-vat einingum og notaðar ÓBREYTTAR fyrir
            // núll-athugunina og pct-greininguna (hlutfall er mælikvarða-
            // óháð — sama % hvort sem miðað er við án/með vsk), aðeins
            // birtu-talan sjálf skiptir yfir í gross.
            const lineD = t.lineDiscEx || 0;
            const saleD = t.discountEx || 0;
            const discEx = saleD + lineD;
            if (discEx <= 0.5) return '';
            const lineDGross = t.lineDiscGross || 0;
            const saleDGross = t.discountGross || 0;
            const discGross = saleDGross + lineDGross;
            const preGross = t.rawGross + lineDGross;
            let pct = 0;
            if (saleD > 0.005 && lineD <= 0.5) {
              if (t.discountPct > 0) pct = t.discountPct;
              else {
                const base = t.grossMode ? t.rawGross : t.rawEx;
                const d = t.grossMode ? t.discountGross : t.discountEx;
                const p = base > 0 ? (d / base) * 100 : 0;
                const r = Math.round(p);
                if (r > 0 && Math.abs(p - r) < 0.05) pct = r;
              }
            } else if (lineD > 0.5 && saleD <= 0.005) {
              pct = t.lineDiscPct || 0;
            }
            return `
            <div class="totals-line">
              <span class="lbl">Samtals fyrir afslátt (m. vsk):</span>
              <span class="amt">${fmtAmt(preGross)}</span>
            </div>
            <div class="totals-line" style="color:#b91c1c">
              <span class="lbl">Afsláttur${pct > 0 ? ' (' + pct + '%)' : ''} (m. vsk):</span>
              <span class="amt">−${fmtAmt(discGross)}</span>
            </div>`;
          })()}
          <div class="totals-line">
            <span class="lbl">Samtals fyrir Vsk.:</span>
            <span class="amt">${fmtAmt(t.subEx)}</span>
          </div>
          ${vskBreakdown}
          <div class="totals-line grand">
            <span class="lbl">${ctx.isTilbod ? 'Samtals m. VSK :' : 'Til greiðslu :'}</span>
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
          <div class="disclaimer">${ctx.isTilbod
            ? ('Tilboð — verð eru með VSK. Gildir' + (ctx.validUntil ? ' til ' + esc(ctx.validUntil) : ' í 30 daga') + '.')
            : 'Þessi reikningur er rafrænt ytra frumgagn skv. reglugerð nr. 505/2013.'}</div>
        </div>
      </div>
    `;
  }

  function render(win, options) {
    if (!win || win.closed) return false;
    const opts = options || {};
    let state = (window.POS && typeof POS.getState === 'function') ? POS.getState() : null;
    // Callers other than the POS checkout (e.g. the tilboð print) don't have a
    // live POS state — they pass their own lines/customer/discount in opts.
    // Build a synthetic state from those so buildLines/totals work the same.
    if (Array.isArray(opts.lines) && opts.lines.length) {
      state = {
        lines: opts.lines,
        customer: (opts.customer && typeof opts.customer === 'object') ? opts.customer
                : (typeof opts.customer === 'string' && opts.customer) ? { nafn: opts.customer }
                : null,
        discount_pct: opts.discount_pct || 0,
        discount: opts.discount || 0,
        discount_gross: !!opts.discount_gross,
        notes: opts.notes || ''
      };
    }
    let customer = lookupCustomer(state);
    // Build the bill-to block by MERGING the best available data for each
    // field: the resolved Companies.list record first, then the live POS
    // state, then explicit opts.customer{Name,Kt,Heimilisfang} passed by the
    // caller. Previously this only filled fields when lookupCustomer returned
    // nothing — so when it returned a partial record (or the company wasn't
    // matched) the kennitala + heimilisfang were dropped and only the name
    // printed. Merging unconditionally fixes that for every print path.
    const sc = (state && state.customer) || {};
    const billNafn = (customer && customer.nafn) || sc.nafn || opts.customerName || '';
    // 2026-08-19 (Agnar, R-000773): the SAVED sale's own kennitala wins. A
    // legacy walk-in row saved under the same first name was matched by
    // lookupCustomer (name before kt) and its 999999-9999 overrode the real kt
    // here — so the invoice printed 999999-9999 even though solur.customer_kt
    // was correct. Only fall back to the looked-up / opts kt when the sale
    // carries no real kt (keeps genuine walk-ins and the empty-kt recovery
    // case intact).
    const _scKt = String(sc.kt || sc.kennitala || '').replace(/[^0-9]/g, '');
    const _scRealKt = _scKt.length === 10 && _scKt !== '9999999999';
    const billKt   = _scRealKt
      ? (sc.kt || sc.kennitala)
      : ((customer && customer.kennitala) || sc.kennitala || sc.kt || opts.customerKt || '');
    const billAddr = (customer && customer.heimilisfang) || sc.heimilisfang || opts.customerHeimilisfang || '';
    if (billNafn || billKt || billAddr) {
      customer = Object.assign({}, customer, {
        nafn: billNafn,
        kennitala: billKt,
        heimilisfang: billAddr
      });
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
                  : (state && state.discount) || 0,
      // gross semantics: explicit opt-in wins; otherwise follow the state
      // marker (live POS state carries discount_gross:true since 2026-06-12)
      discount_gross: (opts.discount_gross != null) ? !!opts.discount_gross
                  : !!(state && state.discount_gross)
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
      // 2026-06-09: callers (e.g. the visit-invoice flow) may pass an explicit
      // date string to print instead of today's date.
      dateStr: opts.dateStr || fmtDate(now),
      paymentTerms: derivedTerms,
      deliveryTerms: opts.deliveryTerms || DEFAULTS.deliveryTerms,
      employee: opts.employee || resolveEmployee(),
      // Tilvísun is a freeform reference field; don't auto-fill with phone.
      tilvisun: opts.tilvisun || '',
      vegna: opts.vegna || notes,
      // Verbatim reference line. When set, it's printed exactly as given
      // (no "vegna " prefix, no token cleanup) — used by the visit-invoice
      // flow to print "Vegna heimsókn DD.MM.YYYY".
      vegnaRaw: opts.vegnaRaw || '',
      // Credit-note presentation (KREDITREIKNINGUR heading + "vegna" ref).
      isCredit: !!opts.isCredit,
      creditOf: opts.creditOf || '',
      // Tilboð (quote) presentation: "TILBOÐ" heading + Gildir-til row +
      // tilboð footer instead of the reikningur disclaimer.
      isTilbod: !!opts.isTilbod,
      validUntil: opts.validUntil || ''
    };

    try {
      const doc = win.document;
      // 2026-08-17 (Agnar): gluggatitillinn er sjálfgefna skráarheitið í
      // „Save as"/prenta-í-PDF — Fyrirtæki - Heimilisfang - kt - R-númer - Ár
      // (var „Reikningur R-000754"). Tilboð/kredit halda gamla forminu.
      const _tc = ctx.customer || {};
      const _bits = [
        String(_tc.nafn || ctx.customerName || '').trim(),
        String(_tc.heimilisfang || '').split(/[,\n]/)[0].trim(),   // gatan ein — ekki póstnr/staður
        String(_tc.kennitala || '').trim(),
        String(ctx.invoiceNum || '').trim(),
        (String(ctx.dateStr || '').match(/(\d{4})/) || [])[1] || ''
      ].filter(Boolean);
      const docTitle = ctx.isTilbod ? ('Tilboð ' + ctx.invoiceNum)
        : ctx.isCredit ? ('Kreditreikningur ' + ctx.invoiceNum)
        : _bits.length > 1 ? _bits.join(' - ').replace(/[\\/:*?"<>|]/g, '')
        : ('Reikningur ' + ctx.invoiceNum);
      doc.open();
      doc.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${esc(docTitle)}</title><style>${CSS}</style></head><body>${buildHTML(ctx)}</body></html>`);
      doc.close();
      doc.title = docTitle;
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
  function renderFromSale(win, sale, customerLookup, extraOpts) {
    if (!win || win.closed || !sale) return false;
    const xo = extraOpts || {};
    // Build a synthetic state. The renderer reads `state.lines`,
    // `state.discount_pct`, `state.discount`, `state.notes` and
    // `state.customer.{nafn,kt,co_id,heimilisfang}`.
    const linur = Array.isArray(sale.linur) ? sale.linur : [];
    // 2026-05-21: discount rendering — three cases.
    //   (A) All lines share a non-zero discount_pct AND afslattur is 0:
    //       lines carry PRE-discount prices, discount applied as % at the
    //       totals section. Bill prints "Söluverð / Afsláttur (N%) / Til
    //       greiðslu". This is the desired modern format.
    //   (B) Some line has discount_pct > 0 AND afslattur > 0 (legacy data
    //       where discount was baked into prices AND stored as afslattur):
    //       ignore both, totalsByRate sums lines as-is. Avoids the previous
    //       double-discount bug that miscounted R-000166 as 42k.
    //   (C) No line discount_pct, sale-level afslattur set: legacy flat
    //       discount. Apply afslattur as opts.discount.
    const allPcts = linur.map(l => Number(l.discount_pct) || 0);
    const uniformPct = allPcts.length && allPcts[0] > 0 && allPcts.every(p => p === allPcts[0])
      ? allPcts[0] : 0;
    const anyPct = allPcts.some(p => p > 0);
    const afsl = +sale.afslattur || 0;
    let optsDiscount = 0, optsDiscountPct = 0;
    let lines = linur;
    const sumT = ls => ls.reduce((a, l) => {
      const le = (Number(l.qty) || 0) * (Number(l.unit_price_ex_vat) || 0);
      return a + le * (1 + ((l.vsk_pct == null ? 24 : Number(l.vsk_pct)) || 0) / 100);
    }, 0);
    if (uniformPct > 0 && afsl === 0) {
      optsDiscountPct = uniformPct;                // case A
    } else if (anyPct) {
      // 2026-07-08 (afsláttar-úttekt): non-uniform line discounts, or line
      // discounts combined with a sale-level afslattur, used to fall into
      // "case B — ignore both" and printed FULL price. Decide by reproducing
      // the stored samtals: bake the per-line discounts into the prices
      // (± afslattur on top), or leave raw for TRUE legacy case-B rows where
      // the discount was already baked in AND discount_pct kept.
      const baked = linur.map(l => {
        const d = Math.max(0, Math.min(100, Number(l.discount_pct) || 0));
        if (!d) return l;
        const nl = Object.assign({}, l);
        nl.unit_price_ex_vat = Math.round((Number(l.unit_price_ex_vat) || 0) * (1 - d / 100));
        nl.desc = String(l.desc || '') + ' · −' + d + '% afsl.';
        nl.discount_pct = 0;
        return nl;
      });
      const rawT = sumT(linur), bakedT = sumT(baked);
      const saved = Number(sale.samtals);
      const cands = [
        { diff: Math.abs(bakedT - (afsl > 0 ? afsl : 0) - saved), useBaked: true,  useAfsl: afsl > 0 },
        { diff: Math.abs(bakedT - saved),                          useBaked: true,  useAfsl: false },
        { diff: Math.abs(rawT - saved),                            useBaked: false, useAfsl: false }
      ];
      let best = cands[0];
      if (isFinite(saved) && saved !== 0) cands.forEach(c => { if (c.diff < best.diff) best = c; });
      if (best.useBaked) lines = baked;
      if (best.useAfsl) optsDiscount = afsl;
    } else if (afsl > 0) {
      optsDiscount = afsl;                          // case C
    } else if (afsl < 0) {
      // 2026-07-08: legacy credit notes (26 pre-fix) stored full-price negated
      // lines + NEGATIVE afslattur — matched no case, so the printed KREDIT-
      // REIKNINGUR showed the pre-discount amount. Scale the lines so the
      // printed credit equals the booked samtals.
      const rawT = sumT(linur);
      const saved = Number(sale.samtals);
      if (isFinite(saved) && saved < 0 && rawT < 0 && Math.abs(rawT - saved) > 2) {
        const r = saved / rawT;
        if (r > 0 && r < 1) lines = linur.map(l => Object.assign({}, l, { unit_price_ex_vat: (Number(l.unit_price_ex_vat) || 0) * r }));
      }
    }
    // 2026-06-12: the POS kr discount changed semantics — new sales store
    // `afslattur` as the kr saved off the FINAL price m. vsk; older sales
    // stored the ex-VAT kr value. The saved `samtals` is ground truth:
    // re-print with whichever interpretation reproduces it (ties → gross,
    // which is also the going-forward default).
    let discountGross = true;
    if (optsDiscount > 0) {
      let _rawEx = 0, _rawVsk = 0;
      lines.forEach(l => {
        const le = (Number(l.qty) || 0) * (Number(l.unit_price_ex_vat) || 0);
        _rawEx += le;
        _rawVsk += le * ((Number(l.vsk_pct) || 24) / 100);
      });
      const grossTotal = Math.max(0, (_rawEx + _rawVsk) - optsDiscount);
      const exFactor = _rawEx > 0 ? Math.max(0, _rawEx - optsDiscount) / _rawEx : 1;
      const exTotal = (_rawEx + _rawVsk) * exFactor;
      const savedSamtals = Number(sale.samtals);
      if (isFinite(savedSamtals) && savedSamtals > 0) {
        discountGross = Math.abs(grossTotal - savedSamtals) <= Math.abs(exTotal - savedSamtals);
      }
    }
    const fakeState = {
      lines: lines,
      discount: optsDiscount,
      discount_pct: optsDiscountPct,
      discount_gross: discountGross,
      notes: sale.athugasemdir || '',
      customer: {
        nafn: sale.customer_nafn || '',
        kt: (sale.customer_kt || '').replace(/^(\d{6})[- ]?(\d{4})$/, '$1-$2'),
        kennitala: (sale.customer_kt || '').replace(/^(\d{6})[- ]?(\d{4})$/, '$1-$2'),
        heimilisfang: '',
        co_id: sale.customer_id || null
      }
    };
    // If the caller provides extra customer info (e.g. fetched from the
    // `vidskiptavinir` / `fyrirtaeki` tables) splice it in — but ONLY when the
    // lookup actually carries a value. Previously `customerLookup.kennitala || ''`
    // (etc.) overwrote the kt that came from `sale.customer_kt` with an empty
    // string whenever the lookup was a name-only / partial match — so the
    // kennitala silently vanished from the receipt. Guard each field so a
    // missing lookup value never clobbers the sale's own data.
    if (customerLookup) {
      if (customerLookup.kennitala) {
        fakeState.customer.kt = customerLookup.kennitala;
        fakeState.customer.kennitala = customerLookup.kennitala;
      }
      if (customerLookup.heimilisfang) fakeState.customer.heimilisfang = customerLookup.heimilisfang;
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
        customerHeimilisfang: customerLookup ? customerLookup.heimilisfang : '',
        // Forward credit-note presentation flags (set by printCreditNote).
        isCredit: !!xo.isCredit,
        creditOf: xo.creditOf || '',
        // Verbatim reference line (visit-invoice flow passes "Vegna heimsókn …").
        vegnaRaw: xo.vegnaRaw || '',
        // 2026-08-14 (ALVARLEG VILLA, skjáskot Agnars — R-000258): endurprentun
        // VISTAÐRAR sölu sendi tóma dagsetningu og render() féll þá á daginn í
        // dag — hver endurprentun eldri reiknings fékk NÝJA dagsetningu.
        // Dagsetning eldri reiknings má ALDREI breytast: salan prentar alltaf
        // SÍNA dagsetningu (created_at); xo.dateStr yfirskrifar áfram (visit-
        // flæðið), og dagurinn-í-dag gildir aðeins um óvistaða POS-kvittun.
        dateStr: xo.dateStr || (sale.created_at && !isNaN(new Date(sale.created_at)) ? fmtDate(new Date(sale.created_at)) : '')
      });
    } finally {
      if (window.POS) window.POS.getState = origGetState;
    }
  }

  window.SalaInvoice = { render, renderFromSale, paymentTermsFor, version: 'v8' };
  console.log('[sala-invoice] v8 ready');
})();
/* === END SALA RECEIPT REDESIGN === */
