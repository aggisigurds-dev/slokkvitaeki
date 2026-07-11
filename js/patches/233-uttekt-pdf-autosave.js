/* 233-uttekt-pdf-autosave.js — sjálfvirk PDF-vistun reikninga í skjalakassann.
 *
 * Þegar heimsókn er kláruð (patch 165 finalizeVisit → „✓ Klára heimsókn") er
 * reikningurinn teiknaður sem PDF (jsPDF, vektor-texti eins og úttektarskýrslan
 * í patch 168) og vistaður SJÁLFKRAFA sem ársmerkt fyrirtækjaviðhengi
 * (kind:'reikningur') gegnum CompanyAttachments.upload — birtist þá strax í
 * „Skjöl & viðhengi" reikningsdálki ársins (patch 199 árstaflan).
 *
 * Skráarheiti:  "<Fyrirtæki> - <kt> - <ár> - R-xxxxxx.pdf"
 * (Úttektarskýrslan vistast sjálf í patch 168 með sama skráarheita-sniði.)
 *
 * NB: vistast í Supabase 'samningar' bucket — EKKI í Google Drive „Allt"
 * möppuna. Þessi vefur hefur ekki Drive-aðgang (engin googleapis/OAuth function);
 * Drive-pörunin lifir í Brunahólf-appinu (sjá „Laga pörun í Brunahólf →").
 */
(function () {
  if (window.UttektInvoicePdf) return;

  function getSB() { return (window.DB && DB.sb) || null; }

  // jsPDF á eftir-pöntun (sami CDN og patch 168 notar; deilir window.jspdf).
  function loadJsPDF() {
    if (window.jspdf && window.jspdf.jsPDF) return Promise.resolve();
    return new Promise(function (res, rej) {
      var s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
      s.onload = function () { (window.jspdf && window.jspdf.jsPDF) ? res() : rej(new Error('jsPDF hlóðst ekki.')); };
      s.onerror = function () { rej(new Error('jsPDF hlóðst ekki.')); };
      document.head.appendChild(s);
    });
  }

  // Helvetica (WinAnsi) ræður við íslensku en EKKI undirskrift ₂ → Co₂ verður Co2.
  function pdfText(s) { return String(s == null ? '' : s).replace(/₂/g, '2'); }
  function fmtKr(n) {
    var v = Math.round(Number(n) || 0); var s = Math.abs(v).toString(), p = [];
    while (s.length > 3) { p.unshift(s.slice(-3)); s = s.slice(0, -3); } p.unshift(s);
    return (v < 0 ? '-' : '') + p.join('.') + ' kr';
  }
  function fmtKtDash(k) { var s = String(k || '').replace(/[^0-9]/g, ''); return s.length === 10 ? s.slice(0, 6) + '-' + s.slice(6) : (k || ''); }
  function docName(nafn, kt, ar, tail) {
    var n = String(nafn || 'fyrirtæki').replace(/\s+/g, ' ').trim();
    return [n, fmtKtDash(kt), ar, tail].filter(Boolean).join(' - ') + '.pdf';
  }
  function isoYear(s) { var m = /(\d{4})/.exec(String(s || '')); return m ? m[1] : String(new Date().getFullYear()); }
  function ddmmyyyy(s) {
    var d = s ? new Date(s) : new Date(); if (isNaN(d)) d = new Date();
    return String(d.getDate()).padStart(2, '0') + '.' + String(d.getMonth() + 1).padStart(2, '0') + '.' + d.getFullYear();
  }
  function lineArray(sale) {
    var l = sale && sale.linur;
    if (typeof l === 'string') { try { l = JSON.parse(l); } catch (_) { l = []; } }
    return Array.isArray(l) ? l : [];
  }

  // 2026-07-08 (afsláttar-úttekt): mirror renderFromSale's line preprocessing
  // so the PDF handles the same sale shapes as the HTML print:
  //   • per-line discount_pct (incl. NON-uniform) → baked into unit prices
  //     when that reproduces sale.samtals (raw kept for legacy already-baked
  //     rows); consumesAfsl tells the caller whether afslattur is still to be
  //     subtracted in the totals section.
  //   • legacy credit notes (negative afslattur + full-price negated lines)
  //     → lines scaled so the printed credit equals the booked samtals.
  function preprocessLines(sale) {
    var linur = lineArray(sale);
    var afsl = Number(sale.afslattur) || 0;
    var saved = Number(sale.samtals);
    var sumT = function (ls) {
      return ls.reduce(function (a, l) {
        var le = (Number(l.qty) || 0) * (Number(l.unit_price_ex_vat) || 0);
        return a + le * (1 + ((l.vsk_pct == null ? 24 : Number(l.vsk_pct)) || 0) / 100);
      }, 0);
    };
    var anyPct = linur.some(function (l) { return (Number(l.discount_pct) || 0) > 0; });
    if (anyPct) {
      var allPcts = linur.map(function (l) { return Number(l.discount_pct) || 0; });
      var uniform = allPcts.length && allPcts[0] > 0 && allPcts.every(function (p) { return p === allPcts[0]; });
      if (uniform && afsl === 0) {
        // case A: uniform % — applied at the totals level (like totalsByRate)
        // so the PDF total matches the booked samtals without per-line
        // rounding drift.
        return { lines: linur, applyAfsl: 0, applyPct: allPcts[0] };
      }
      var baked = bake(linur);
      var rawT = sumT(linur), bakedT = sumT(baked);
      var cands = [
        { diff: Math.abs(bakedT - (afsl > 0 ? afsl : 0) - saved), useBaked: true,  useAfsl: afsl > 0 },
        { diff: Math.abs(bakedT - saved),                          useBaked: true,  useAfsl: false },
        { diff: Math.abs(rawT - saved),                            useBaked: false, useAfsl: false }
      ];
      var best = cands[0];
      if (isFinite(saved) && saved !== 0) cands.forEach(function (c) { if (c.diff < best.diff) best = c; });
      return { lines: best.useBaked ? baked : linur, applyAfsl: best.useAfsl ? afsl : 0, applyPct: 0 };
    }
    if (afsl < 0) {
      var rT = sumT(linur);
      if (isFinite(saved) && saved < 0 && rT < 0 && Math.abs(rT - saved) > 2) {
        var r = saved / rT;
        if (r > 0 && r < 1) {
          return {
            lines: linur.map(function (l) {
              var nl = Object.assign({}, l);
              nl.unit_price_ex_vat = (Number(l.unit_price_ex_vat) || 0) * r;
              return nl;
            }),
            applyAfsl: 0, applyPct: 0
          };
        }
      }
      return { lines: linur, applyAfsl: 0, applyPct: 0 };
    }
    return { lines: linur, applyAfsl: afsl, applyPct: 0 };
    function bake(ls) {
      return ls.map(function (l) {
        var d = Math.max(0, Math.min(100, Number(l.discount_pct) || 0));
        if (!d) return l;
        var nl = Object.assign({}, l);
        nl.unit_price_ex_vat = Math.round((Number(l.unit_price_ex_vat) || 0) * (1 - d / 100));
        nl.desc = String(l.desc || '') + ' · −' + d + '% afsl.';
        nl.discount_pct = 0;
        return nl;
      });
    }
  }

  // Fetch /img/logo.png → dataURL fyrir jsPDF.addImage (sama og patch 168).
  function logoDataUri() {
    return new Promise(function (resolve) {
      try {
        var img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = function () {
          try {
            var cv = document.createElement('canvas');
            cv.width = img.naturalWidth; cv.height = img.naturalHeight;
            cv.getContext('2d').drawImage(img, 0, 0);
            resolve({ dataUri: cv.toDataURL('image/png'), w: img.naturalWidth, h: img.naturalHeight });
          } catch (_) { resolve(null); }
        };
        img.onerror = function () { resolve(null); };
        // Use the CURRENT logo (branding.logo_url via patch 169) so the SAVED PDF
        // matches the print preview — not the old static /img/logo.png.
        img.src = (window.SlokkLogo && SlokkLogo.getUrl) ? SlokkLogo.getUrl() : '/img/logo.png?v=20260520b';
      } catch (_) { resolve(null); }
    });
  }

  // Seljanda-upplýsingar (Stillingar → Branding), sömu fallbökk og SalaInvoice.
  function branding() {
    var b = (window.AppSettings && AppSettings.path && AppSettings.path('branding')) || {};
    return {
      name:  b.company_name || 'Slökkvitæki ehf',
      kt:    b.kennitala    || '600508-0400',
      vsk:   b.vsk_nr       || '98107',
      addr1: b.address1     || 'Helluhrauni 10',
      addr2: b.address2     || '220 Hafnarfjörður'
    };
  }
  function vskCodeFor(pct) { return pct >= 20 ? '2' : (pct >= 10 ? '1' : '0'); }
  // Greiðsluskilmáli — nota SalaInvoice-vörpunina ef til (reikningur → „Krafa í
  // banka 10 dagar"), annars einföld fallbökk.
  function paymentTermsFor(method) {
    if (window.SalaInvoice && SalaInvoice.paymentTermsFor) {
      try { return SalaInvoice.paymentTermsFor(method); } catch (_) {}
    }
    return String(method || '').toLowerCase().trim() === 'reikningur' ? 'Krafa í banka 10 dagar' : 'Staðgreitt';
  }
  // „Heimsókn 2026-06-23 — …" → „Vegna heimsókn 23.06.2026" (eins og prentaði
  // reikningurinn), annars athugasemdin óbreytt.
  function vegnaLine(athugasemdir) {
    var s = String(athugasemdir || '');
    var m = /(\d{4})-(\d{2})-(\d{2})/.exec(s);
    if (/heims[oó]kn/i.test(s) && m) return 'Vegna heimsókn ' + m[3] + '.' + m[2] + '.' + m[1];
    return s;
  }

  // ── Teikna reikninginn sem PDF-blob (vektor — eins og prent-forskoðunin) ──
  async function buildInvoiceBlob(sale, co) {
    await loadJsPDF();
    var jsPDF = window.jspdf.jsPDF;
    var doc = new jsPDF({ unit: 'mm', format: 'a4' });
    var B = branding();
    var W = 210, M = 18, RX = W - M; // hægri brún
    var y = 20;

    // ── Haus: logo vinstra megin, seljandi hægra megin ──
    var logo = await logoDataUri();
    if (logo) {
      var hMM = 20, wMM = (logo.w && logo.h) ? (logo.w / logo.h) * hMM : 60;
      if (wMM > 95) { wMM = 95; hMM = (logo.h / logo.w) * wMM; }
      try { doc.addImage(logo.dataUri, 'PNG', M, y - 4, wMM, hMM); } catch (_) {}
    } else {
      doc.setFont('helvetica', 'bold').setFontSize(18).setTextColor(20);
      doc.text(pdfText(B.name), M, y + 4);
    }
    doc.setFont('helvetica', 'normal').setFontSize(9.5).setTextColor(40);
    doc.text(pdfText(B.name) + '    VSK nr. ' + B.vsk, RX, y, { align: 'right' });
    doc.setTextColor(90);
    doc.text('Kt. ' + B.kt, RX, y + 5, { align: 'right' });
    doc.text(pdfText(B.addr1), RX, y + 10, { align: 'right' });
    doc.text(pdfText(B.addr2), RX, y + 15, { align: 'right' });

    y += 26;
    doc.setDrawColor(15, 23, 42).setLineWidth(0.3).line(M, y, RX, y);
    y += 9;

    // ── Meta-röð: kaupandi (vinstri) | reiknings-haus (hægri) ──
    var leftY = y, rightY = y;
    doc.setTextColor(20).setFont('helvetica', 'bold').setFontSize(11);
    doc.text(pdfText((co && co.nafn) || sale.customer_nafn || '—'), M, leftY); leftY += 6;
    doc.setFont('helvetica', 'normal').setFontSize(10).setTextColor(40);
    if (co && co.heimilisfang) {
      String(co.heimilisfang).split(/,\s*/).filter(Boolean).forEach(function (ln) {
        doc.text(pdfText(ln), M, leftY); leftY += 5;
      });
    }
    if (co && co.kennitala) { doc.text('kt. ' + fmtKtDash(co.kennitala), M, leftY); leftY += 5; }
    var vg = vegnaLine(sale.athugasemdir);
    if (vg) {
      leftY += 2;
      doc.setFont('helvetica', 'italic').setFontSize(9.5).setTextColor(80);
      doc.splitTextToSize(pdfText(vg), 92).forEach(function (ln) { doc.text(ln, M, leftY); leftY += 4.6; });
      doc.setFont('helvetica', 'normal');
    }

    // Hægri — reiknings-haus.
    var labelX = 120, valX = RX;
    doc.setTextColor(20).setFont('helvetica', 'italic').setFontSize(17);
    doc.text('Reikningur', labelX, rightY);
    doc.setFont('helvetica', 'bold').setFontSize(13);
    doc.text(pdfText(sale.num || ''), valX, rightY, { align: 'right' });
    rightY += 4;
    doc.setDrawColor(15, 23, 42).setLineWidth(0.3).line(labelX, rightY, valX, rightY);
    rightY += 6;
    doc.setFont('helvetica', 'normal').setFontSize(9.5).setTextColor(40);
    function metaRow(lbl, val) {
      doc.text(lbl, labelX, rightY);
      doc.text(pdfText(val || ''), valX, rightY, { align: 'right' });
      rightY += 5;
    }
    metaRow('Dagsetning:', ddmmyyyy(sale.created_at));
    metaRow('Greiðsl.skilm.:', paymentTermsFor(sale.greitt_med));
    metaRow('Starfsmaður:', sale.starfsmadur || 'Kassi');

    y = Math.max(leftY, rightY) + 6;

    // ── Línutafla ──
    var cNumX = M, cDescX = M + 16, cQtyR = 116, cUnitR = 146, cAmtR = 178, cVskR = RX;
    doc.setFont('helvetica', 'bold').setFontSize(8.5).setTextColor(90);
    doc.text('VÖRUNR.', cNumX, y);
    doc.text('LÝSING', cDescX, y);
    doc.text('FJÖLDI', cQtyR, y, { align: 'right' });
    doc.text('EININGAV.', cUnitR, y, { align: 'right' });
    doc.text('UPPHÆÐ', cAmtR, y, { align: 'right' });
    doc.text('VSK', cVskR, y, { align: 'right' });
    y += 2; doc.setDrawColor(15, 23, 42).setLineWidth(0.3).line(M, y, RX, y); y += 5;

    doc.setFont('helvetica', 'normal').setFontSize(9.5).setTextColor(20);
    var byRate = {};
    var _pp = preprocessLines(sale);
    _pp.lines.forEach(function (l) {
      var qty = Number(l.qty) || 0, unit = Number(l.unit_price_ex_vat) || 0;
      var pct = (l.vsk_pct == null ? 24 : Number(l.vsk_pct)) || 0;
      var ex = qty * unit, code = vskCodeFor(pct), key = String(pct);
      if (!byRate[key]) byRate[key] = { pct: pct, code: code, ex: 0, vsk: 0 };
      byRate[key].ex += ex; byRate[key].vsk += ex * pct / 100;
      var ref = l.ref || (l.product_id ? String(l.product_id) : '');
      var wrapped = doc.splitTextToSize(pdfText(l.desc || ''), cQtyR - cDescX - 6);
      doc.text(String(ref || ''), cNumX, y);
      doc.text(wrapped, cDescX, y);
      doc.text(String(qty), cQtyR, y, { align: 'right' });
      doc.text(fmtKr(unit), cUnitR, y, { align: 'right' });
      doc.text(fmtKr(ex), cAmtR, y, { align: 'right' });
      doc.text(code, cVskR, y, { align: 'right' });
      y += Math.max(5.5, wrapped.length * 4.8);
      if (y > 250) { doc.addPage(); y = 22; }
    });

    // ── Heildartölur (hægri) ──
    var subEx = 0, vsk = 0;
    Object.keys(byRate).forEach(function (k) { subEx += byRate[k].ex; vsk += byRate[k].vsk; });
    var rawExBefore = subEx;   // án-vsk samtala FYRIR sölu-afslátt (fyrir framsetninguna)
    // 2026-07-10 (verkefnalisti 962a74f0): bakaðir línu-afslættir ("· −N% afsl.")
    // endurreiknaðir úr lýsingunum svo afslátturinn sjáist í samtölunum —
    // upplýsinga-lína eingöngu, engin ný stærðfræði.
    var lineDiscEx = 0, linePcts = [], billableLines = 0, discLines = 0;
    _pp.lines.forEach(function (l) {
      var ex = (Number(l.qty) || 0) * (Number(l.unit_price_ex_vat) || 0);
      if (ex <= 0) return;
      billableLines++;
      var m = String(l.desc || '').match(/·\s*[−-]\s*(\d+(?:[.,]\d+)?)\s*%\s*afsl/i);
      if (m) {
        var p = parseFloat(m[1].replace(',', '.'));
        if (p > 0 && p < 100) { lineDiscEx += ex * (p / (100 - p)); if (linePcts.indexOf(p) < 0) linePcts.push(p); discLines++; }
      }
    });
    // applyAfsl = the sale-level discount still to subtract here (0 when the
    // preprocessing consumed it by baking it into the line prices).
    var afsl = _pp.applyAfsl;
    // afslattur semantics flipped 2026-06-12: legacy = ex-VAT discount,
    // post-2026-06-12 = final m.vsk discount. Auto-detect by reproducing
    // sale.samtals (mirrors SalaInvoice.renderFromSale logic).
    var total;
    var pctDisc = 0;
    if (_pp.applyPct > 0) {
      // case A (uniform line %): applied at the totals level, same as
      // SalaInvoice totalsByRate — buckets scaled, discount shown as a row.
      var pf = 1 - Math.max(0, Math.min(100, _pp.applyPct)) / 100;
      pctDisc = (subEx + vsk) * (1 - pf);
      Object.keys(byRate).forEach(function (k) { byRate[k].ex *= pf; byRate[k].vsk *= pf; });
      subEx *= pf;
      vsk *= pf;
      total = subEx + vsk;
    } else if (afsl > 0) {
      var grossTotal = subEx + vsk - afsl;
      var exFactor = subEx > 0 ? Math.max(0, subEx - afsl) / subEx : 1;
      var exTotal = (subEx + vsk) * exFactor;
      var savedSamtals = Number(sale.samtals);
      var grossMode = true;
      if (isFinite(savedSamtals) && savedSamtals > 0) {
        grossMode = Math.abs(grossTotal - savedSamtals) <= Math.abs(exTotal - savedSamtals);
      }
      total = grossMode ? grossTotal : exTotal;
      // 2026-07-08 (afsláttar-úttekt): scale the per-rate buckets in BOTH
      // modes so "Samtals fyrir Vsk." + VSK lines show the actual collected
      // (post-discount) amounts — same as SalaInvoice's totalsByRate, which
      // applies its factor unconditionally. The gross branch used to leave
      // them unscaled, so the archived PDF overstated the VAT versus the
      // booked vsk_upphaed.
      var scaleF = grossMode
        ? ((subEx + vsk) > 0 ? Math.max(0, total) / (subEx + vsk) : 1)
        : exFactor;
      Object.keys(byRate).forEach(function (k) {
        byRate[k].ex *= scaleF;
        byRate[k].vsk *= scaleF;
      });
      subEx *= scaleF;
      vsk *= scaleF;
    } else {
      total = subEx + vsk;
    }

    y += 3; doc.setDrawColor(15, 23, 42).setLineWidth(0.3).line(110, y, RX, y); y += 6;
    var tLabelR = 150, tValR = RX;
    function totRow(lbl, val, opts) {
      opts = opts || {};
      doc.setFont('helvetica', opts.bold ? 'bold' : 'normal').setFontSize(opts.big ? 12 : 9.8);
      doc.setTextColor(opts.red ? 185 : 20, opts.red ? 28 : 20, opts.red ? 28 : 20);
      doc.text(lbl, tLabelR, y, { align: 'right' });
      doc.text(val, tValR, y, { align: 'right' });
      y += opts.big ? 8 : 5.4;
      doc.setTextColor(20);
    }
    // 2026-07-10 (verkefnalisti ee3f5faf): afsláttar-línurnar settar fram ÁN VSK
    // og OFAN við "Samtals fyrir Vsk." svo keðjan gangi upp:
    // fyrir-afslátt − afsláttur = Samtals fyrir Vsk. Sama framsetning og
    // SalaInvoice (patch 10). Til greiðslu og VSK-sundurliðun ÓBREYTT.
    var saleDiscEx = Math.max(0, rawExBefore - subEx);
    var discExTotal = saleDiscEx + lineDiscEx;
    if (discExTotal > 0.5) {
      var showPct = 0;
      if (saleDiscEx > 0.005 && lineDiscEx <= 0.5) {
        if (_pp.applyPct > 0) showPct = _pp.applyPct;
        else {
          var _p = rawExBefore > 0 ? (saleDiscEx / rawExBefore) * 100 : 0;
          var _r = Math.round(_p);
          if (_r > 0 && Math.abs(_p - _r) < 0.05) showPct = _r;
        }
      } else if (lineDiscEx > 0.5 && saleDiscEx <= 0.005 && linePcts.length === 1 && discLines === billableLines) {
        // 2026-07-10 (📣 962a74f0): prósentan aðeins þegar sami afsláttur nær
        // yfir ALLA liðina — annars bara „Afsláttur" + upphæð (villandi 20%).
        showPct = linePcts[0];
      }
      totRow('Samtals fyrir afslátt (án VSK):', fmtKr(rawExBefore + lineDiscEx));
      totRow('Afsláttur' + (showPct > 0 ? ' (' + showPct + '%)' : '') + ' án VSK:', '-' + fmtKr(discExTotal), { red: true });
    }
    totRow('Samtals fyrir Vsk.:', fmtKr(subEx));
    Object.keys(byRate).sort(function (a, b) { return (+a) - (+b); }).forEach(function (k) {
      var r = byRate[k], pctTxt = (Math.round(r.pct * 10) / 10).toString().replace('.', ',');
      totRow(r.code + ' = Sala með ' + pctTxt + '% Vsk: ' + fmtKr(r.ex), fmtKr(r.vsk));
    });
    y += 1; doc.setDrawColor(15, 23, 42).setLineWidth(0.4).line(110, y, RX, y); y += 6;
    totRow('Til greiðslu :', fmtKr(total), { bold: true, big: true });

    // ── Fótur ──
    if (y < 274) y = 280; else y += 8;
    doc.setFont('helvetica', 'normal').setFontSize(8).setTextColor(110);
    doc.text(pdfText('Þessi reikningur er rafrænt ytra frumgagn skv. reglugerð nr. 505/2013.'), M, y);

    return doc.output('blob');
  }

  // ── Vista reikning sölunnar í skjalakassann ──────────────────────────────
  async function saveForSale(coId, sale) {
    try {
      if (!coId || !sale) return null;
      if (!window.CompanyAttachments || !CompanyAttachments.upload) return null;
      var SB = getSB(), co = null;
      if (SB) {
        try { var r = await SB.from('fyrirtaeki').select('id,nafn,kennitala,heimilisfang').eq('id', coId).maybeSingle(); if (r && r.data) co = r.data; } catch (_) {}
      }
      if (!co) co = { id: coId, nafn: sale.customer_nafn, kennitala: null };
      var ar = isoYear(sale.created_at);
      // Tvíritunarvörn: ef reikningur með þessu R-númeri er þegar vistaður, sleppa.
      try {
        var have = (CompanyAttachments.list ? CompanyAttachments.list(coId) : []) || [];
        var rnum = String(sale.num || '');
        if (rnum && have.some(function (a) { return a && a.name && a.name.indexOf(rnum) >= 0; })) return null;
      } catch (_) {}
      var blob = await buildInvoiceBlob(sale, co);
      var fname = docName(co.nafn, co.kennitala, ar, sale.num || 'reikningur');
      var file = new File([blob], fname, { type: 'application/pdf' });
      var meta = await CompanyAttachments.upload(coId, file, { year: ar, kind: 'reikningur' });
      if (meta && window.Toast && Toast.show) Toast.show('🧾 Reikningur vistaður í skjöl (' + ar + ')');
      return meta;
    } catch (e) { console.warn('[patch-233] saveForSale', e); return null; }
  }

  window.UttektInvoicePdf = { saveForSale: saveForSale, buildInvoiceBlob: buildInvoiceBlob };
  console.log('[patch-233] úttekt invoice PDF auto-save installed');
})();
