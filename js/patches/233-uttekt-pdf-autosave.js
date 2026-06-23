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

  // ── Teikna reikninginn sem PDF-blob ───────────────────────────────────────
  async function buildInvoiceBlob(sale, co) {
    await loadJsPDF();
    var jsPDF = window.jspdf.jsPDF;
    var doc = new jsPDF({ unit: 'mm', format: 'a4' });
    var M = 18, W = 210, y = 20;

    // Seljandi (Slökkvitæki ehf) vinstra megin · REIKNINGUR-haus hægra megin.
    doc.setTextColor(20);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(16); doc.text('Slökkvitæki ehf', M, y);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(90);
    doc.text('kt. 600508-0400', M, y + 5);
    doc.setTextColor(20);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(15); doc.text('REIKNINGUR', W - M, y, { align: 'right' });
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
    doc.text('Nr.: ' + pdfText(sale.num || '—'), W - M, y + 6, { align: 'right' });
    doc.text('Dags.: ' + ddmmyyyy(sale.created_at), W - M, y + 11, { align: 'right' });

    y += 22; doc.setDrawColor(210); doc.line(M, y, W - M, y); y += 8;

    // Kaupandi.
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(90); doc.text('VIÐSKIPTAVINUR', M, y); doc.setTextColor(20);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(11);
    doc.text(pdfText((co && co.nafn) || sale.customer_nafn || '—'), M, y + 6);
    if (co && co.kennitala) { doc.setFontSize(10); doc.setTextColor(90); doc.text('kt. ' + fmtKtDash(co.kennitala), M, y + 11); doc.setTextColor(20); }
    y += 20;

    // Línu-haus.
    var cQty = W - M - 74, cUnit = W - M - 40, cTot = W - M;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(90);
    doc.text('LÝSING', M, y); doc.text('MAGN', cQty, y, { align: 'right' });
    doc.text('VERÐ ÁN VSK', cUnit, y, { align: 'right' }); doc.text('SAMTALS', cTot, y, { align: 'right' });
    doc.setTextColor(20); y += 2; doc.setDrawColor(225); doc.line(M, y, W - M, y); y += 6;

    // Línur (verð og línutala ÁN VSK; VSK lagt við neðst).
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
    lineArray(sale).forEach(function (l) {
      var qty = Number(l.qty) || 0, unit = Number(l.unit_price_ex_vat) || 0, lineEx = qty * unit;
      var wrapped = doc.splitTextToSize(pdfText(l.desc || ''), cQty - M - 6);
      doc.text(wrapped, M, y);
      doc.text(String(qty), cQty, y, { align: 'right' });
      doc.text(fmtKr(unit), cUnit, y, { align: 'right' });
      doc.text(fmtKr(lineEx), cTot, y, { align: 'right' });
      y += Math.max(6, wrapped.length * 5);
      if (y > 268) { doc.addPage(); y = 20; }
    });

    y += 2; doc.setDrawColor(225); doc.line(cQty - 14, y, W - M, y); y += 7;

    // Heildartölur.
    var anVsk = Number(sale.upphaed_an_vsk) || 0, vsk = Number(sale.vsk_upphaed) || 0;
    var total = Number(sale.samtals) || (anVsk + vsk);
    function totRow(label, val, big) {
      doc.setFont('helvetica', big ? 'bold' : 'normal'); doc.setFontSize(big ? 12.5 : 10);
      doc.text(label, cUnit, y, { align: 'right' }); doc.text(val, cTot, y, { align: 'right' });
      y += big ? 9 : 6;
    }
    totRow('Án vsk', fmtKr(anVsk), false);
    if (Number(sale.afslattur)) totRow('Afsláttur', '-' + fmtKr(sale.afslattur), false);
    totRow('VSK', fmtKr(vsk), false);
    y += 1; doc.setDrawColor(180); doc.line(cUnit - 34, y, W - M, y); y += 6;
    totRow('Samtals m. vsk', fmtKr(total), true);

    if (sale.athugasemdir) {
      y += 7; doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(90);
      doc.text(doc.splitTextToSize('Athugasemd: ' + pdfText(sale.athugasemdir), W - 2 * M), M, y);
      doc.setTextColor(20);
    }
    return doc.output('blob');
  }

  // ── Vista reikning sölunnar í skjalakassann ──────────────────────────────
  async function saveForSale(coId, sale) {
    try {
      if (!coId || !sale) return null;
      if (!window.CompanyAttachments || !CompanyAttachments.upload) return null;
      var SB = getSB(), co = null;
      if (SB) {
        try { var r = await SB.from('fyrirtaeki').select('id,nafn,kennitala').eq('id', coId).maybeSingle(); if (r && r.data) co = r.data; } catch (_) {}
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
