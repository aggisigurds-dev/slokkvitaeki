/* === COMPANY INSPECTION REPORT v2 ===
 *
 * Generates a printable A4 "úttektarskýrsla" matching the existing IKEA 2025
 * paper template exactly:
 *   • Slökkvitæki Brunahólf logo (PNG asset, no inline SVG)
 *   • Address line + intro sentence
 *   • Customer line (name, address, kt) pulled from fyrirtaeki
 *   • Month label "í maí 2026"
 *   • Fixed list of 8 equipment categories with Fjöldi / Í lagi per row
 *   • Annað: section from the blue notes box (tripState.notes)
 *   • Athugasemdir: section ("Engar athugasemdir" by default)
 *   • Footer: "Fyrir hönd Slökkvitæki ehf" + Skoðunaraðili name
 *
 * NO PRICES — this is a delivery confirmation, not an invoice.
 *
 * Public API: window.CompanyInspectionReport.open(coId)
 */
(() => {
  if (window.__companyInspectionReportInstalled) return;
  window.__companyInspectionReportInstalled = true;

  function getSB() { return (window.DB && window.DB.sb) || null; }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c =>
      ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  function loadTripState(coId) {
    try { return JSON.parse(localStorage.getItem('slokk_trip_' + coId) || '{}'); }
    catch (_) { return {}; }
  }

  // ── Bucket a uttaeki row into one of the 8 PDF categories ───────────────
  // Returns the category key, or null if the unit doesn't fit any known
  // bucket (very rare — would be a weird type label).
  function categorize(u) {
    const t = String(u.type || '').toLowerCase();
    const sizeStr = String(u.size || '').toLowerCase();
    // Extract leading numeric part of size (e.g. "6 kg" → 6, "6-9 ltr" → 6)
    const sizeNum = parseFloat(sizeStr.replace(',', '.')) || 0;

    if (/léttv|lettv|abf|froð|frod/.test(t)) return 'lettvatn';
    if (/\bduft\b|\babc\b|\bpfc\b/.test(t)) {
      return sizeNum <= 3 ? 'duft_small' : 'duft_big';
    }
    if (/co2|co₂|co_?2|kolsyr|kolsýr/.test(t)) {
      return sizeNum <= 3 ? 'co2_small' : 'co2_big';
    }
    // „slöng" vantaði hér (aðeins „slang"), svo „Slönguskápur" — 30 tæki hjá 7
    // fyrirtækjum, m.a. 21 hjá Hótel Atlantic apartments — féll í gegn og var
    // EKKI talinn á prentuðu úttektarskýrslunni. Systur-flokkarinn í
    // 270-report-facts-sync.js:78 hafði „slöng" og taldi þau, svo skýrslan og
    // `arsskodun_report_facts` stemmdu ekki. Röðin er líka samræmd við 270
    // (reyk á undan teppi): „eldvarn" í teppi-reglunni myndi annars gleypa
    // eldvarnar-búnað sem á heima annars staðar ef nýr flokkur bætist við.
    if (/brunaslang|brunaslöng|brunaslong|slang|slöng|hose/.test(t)) return 'slang';
    if (/reykskynj|smoke/.test(t)) return 'reyk';
    if (/teppi|blanket|eldvarn/.test(t)) return 'teppi';
    return null;
  }

  // Fixed display order matching the PDF — keys map to (label, sublabel)
  const CATEGORIES = [
    { k: 'lettvatn',  label: 'Slökkvitæki léttvatn 6-9 ltr.' },
    { k: 'duft_small', label: 'Slökkvitæki duft 2 kg.' },
    { k: 'duft_big',   label: 'Slökkvitæki duft 6-12 kg.' },
    { k: 'co2_small',  label: 'Slökkvitæki Co₂ 2 kg.' },
    { k: 'co2_big',    label: 'Slökkvitæki Co₂ 5 kg.' },
    { k: 'slang',      label: 'Brunaslöngur' },
    { k: 'teppi',      label: 'Eldvarnarteppi' },
    { k: 'reyk',       label: 'Reykskynjarar' }
  ];

  // ── jsPDF vector renderer ───────────────────────────────────────────────
  // 2026-06-10: html2canvas renders BLANK in Agnar's browser no matter where
  // the source element lives (off-screen, iframe, behind-modal). So we stop
  // rasterizing the DOM entirely and draw the report as vector text with
  // jsPDF — works in every browser, tiny, and the text stays selectable.
  function loadJsPDF() {
    if (window.jspdf && window.jspdf.jsPDF) return Promise.resolve();
    return new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
      s.onload = () => (window.jspdf && window.jspdf.jsPDF) ? res() : rej(new Error('jsPDF hlóðst ekki.'));
      s.onerror = () => rej(new Error('jsPDF hlóðst ekki.'));
      document.head.appendChild(s);
    });
  }

  // Fetch /img/logo.png → dataURL (so jsPDF.addImage can embed it). Returns
  // { dataUri, w, h } or null on any failure (report still renders, sans logo).
  function logoDataUri() {
    return new Promise(resolve => {
      try {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          try {
            const cv = document.createElement('canvas');
            cv.width = img.naturalWidth; cv.height = img.naturalHeight;
            cv.getContext('2d').drawImage(img, 0, 0);
            resolve({ dataUri: cv.toDataURL('image/png'), w: img.naturalWidth, h: img.naturalHeight });
          } catch (_) { resolve(null); }
        };
        img.onerror = () => resolve(null);
        // Use the CURRENT logo (branding.logo_url via patch 169) so the SAVED PDF
        // matches the print preview — not the old static /img/logo.png.
        img.src = (window.SlokkLogo && SlokkLogo.getUrl) ? SlokkLogo.getUrl() : '/img/logo.png?v=20260520b';
      } catch (_) { resolve(null); }
    });
  }

  // jsPDF default Helvetica encodes WinAnsi/Latin-1, which covers Icelandic
  // (þ ð æ ö á é í ó ú ý) — but NOT the subscript ₂, so map Co₂ → Co2.
  function pdfText(s) { return String(s == null ? '' : s).replace(/₂/g, '2'); }

  async function buildReportPdfBlob(ctx) {
    await loadJsPDF();
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
    const { co, counts, annad, athugasemdir, skodunaradili, monthPhrase } = ctx;

    const PAGE_W = 210, ML = 18, MR = 18, CW = PAGE_W - ML - MR;
    let y = 18;

    // Letterhead — logo left, address right
    const logo = await logoDataUri();
    if (logo) {
      const hMM = 22; // ~88px tall in the preview
      const wMM = logo.w && logo.h ? (logo.w / logo.h) * hMM : 66;
      try { doc.addImage(logo.dataUri, 'PNG', ML, y, wMM, hMM); } catch (_) {}
    }
    doc.setFont('helvetica', 'normal').setFontSize(9.5).setTextColor(15, 23, 42);
    doc.text('Helluhrauni 10, 220 Hafnarfjörður', PAGE_W - MR, y + 7, { align: 'right' });
    doc.text('Sími: 565 4080, kt. 600508-0400', PAGE_W - MR, y + 12, { align: 'right' });
    y += 30;

    // Intro sentence
    doc.setFontSize(10.5);
    const intro = 'Skýrsla vegna úttektar á brunaslöngum, slökkvitækjum og öðrum búnaði (ef við á) hjá fyrirtækinu';
    doc.splitTextToSize(pdfText(intro), CW).forEach(line => { doc.text(line, ML, y); y += 5.5; });
    y += 3;

    // Customer line + underline
    const ktLine = co.kennitala ? '  kt: ' + co.kennitala : '';
    const addrLine = co.heimilisfang ? ', ' + co.heimilisfang : '';
    const custLine = (co.nafn || '—') + addrLine + ktLine;
    doc.setFontSize(11);
    doc.splitTextToSize(pdfText(custLine), CW).forEach(line => { doc.text(line, ML, y); y += 5.5; });
    y += 1.5;
    doc.setDrawColor(15, 23, 42).setLineWidth(0.3).line(ML, y, PAGE_W - MR, y);
    y += 10;

    // Inspection statement (bold)
    doc.setFont('helvetica', 'bold').setFontSize(12);
    doc.text(pdfText('Tæki voru yfirfarin af Slökkvitæki ehf ' + monthPhrase), ML, y);
    doc.setFont('helvetica', 'normal');
    y += 11;

    // Equipment category rows
    doc.setFontSize(10.5);
    const labelX = ML + 4, fjoldiX = ML + 92, ilagiX = ML + 130;
    CATEGORIES.forEach(c => {
      const n = counts[c.k] || 0;
      const fjoldi = n > 0 ? String(n) : 'x';
      const ilagi  = n > 0 ? 'Já' : 'x';
      doc.text(pdfText(c.label), labelX, y);
      doc.text('Fjöldi: ' + fjoldi, fjoldiX, y);
      doc.text(pdfText('Í lagi: ' + ilagi), ilagiX, y);
      y += 3;
      doc.setDrawColor(226, 232, 240).setLineWidth(0.2).line(labelX, y, PAGE_W - MR, y);
      y += 6;
    });
    y += 6;

    // Annað
    doc.setFontSize(10.5).setFont('helvetica', 'bold');
    doc.text('Annað:', ML, y); y += 5.5;
    doc.setFont('helvetica', 'normal');
    doc.splitTextToSize(pdfText(annad || '—'), CW).forEach(line => { doc.text(line, ML, y); y += 5.2; });
    y += 8;

    // Athugasemdir
    doc.setFont('helvetica', 'bold');
    doc.text('Athugasemdir:', ML, y); y += 5.5;
    doc.setFont('helvetica', 'normal');
    doc.splitTextToSize(pdfText(athugasemdir), CW).forEach(line => { doc.text(line, ML, y); y += 5.2; });
    y += 18;

    // Sign-off
    doc.text(pdfText('Fyrir hönd Slökkvitæki ehf'), ML, y); y += 16;
    doc.text(pdfText(skodunaradili || '_______________________'), ML, y);

    return doc.output('blob');
  }

  async function fetchUnits(client) {
    const sb = getSB();
    if (!sb) return [];
    let all = [];
    let from = 0, pageSize = 1000;
    while (true) {
      const { data, error } = await sb.from('uttaeki')
        .select('id,serial,type,size,status')
        .eq('client', client)
        .range(from, from + pageSize - 1);
      if (error || !data) break;
      all = all.concat(data);
      if (data.length < pageSize) break;
      from += pageSize;
    }
    // 2026-06-16: list the SAME units the company-detail table + cost calc
    // (patch 129) use — exclude only onytt/geymsla/úrelt/í-vinnslu, so 'fail'
    // / 'ok' / null count (they render as ✓ Virkt). Keeps the úttektarskýrsla
    // in lock-step with the reikningur. Mirrors patch 129's fetchUnits.
    const NONBILL = { onytt: 1, geymsla: 1, urelt: 1, i_vinnslu: 1 };
    const normSt = (window.Companies && Companies._normStatus) ? Companies._normStatus : function (s) {
      const c = String(s == null ? '' : s).toLowerCase();
      if (c === 'onytt' || c === 'ónýtt') return 'onytt';
      if (/geymsl/.test(c)) return 'geymsla';
      if (c === 'urelt' || c === 'úrelt') return 'urelt';
      if (/vinnsl/.test(c)) return 'i_vinnslu';
      return 'active';
    };
    return all.filter(u => !NONBILL[normSt(u.status)]);
  }

  // ── Open report ─────────────────────────────────────────────────────────
  async function openReport(coId, opts) {
    if (!coId) { alert('Ekkert fyrirtæki valið'); return; }
    const SB = getSB();
    if (!SB) { alert('Engin gagnabankatenging'); return; }

    const c = await SB.from('fyrirtaeki')
      .select('id,nafn,kennitala,heimilisfang,simi,netfang')
      .eq('id', coId).maybeSingle();
    if (c.error || !c.data) { alert('Fyrirtæki fannst ekki'); return; }
    const co = c.data;

    const units = await fetchUnits(co.nafn);
    const counts = {};
    CATEGORIES.forEach(c => counts[c.k] = 0);
    units.forEach(u => {
      const k = categorize(u);
      if (k && counts[k] != null) counts[k]++;
    });

    const trip = loadTripState(coId);
    const annad = (trip.notes || '').trim();
    const athugasemdir = (trip.athugasemdir_skyrsla || '').trim() || 'Engar athugasemdir';
    const skodunaradili = (trip.skodunaradili || '').trim();

    const now = new Date();
    // 2026-06-02: Agnar asked for the inspection date in dd.mm.yyyy instead of
    // the "í maí 2026" month phrase.
    // 2026-06-09: the date is now driven by the custom "Dagsetning" field on
    // the company page (falls back to today). The optional "Skoðun framkvæmd"
    // month field adds a "Framkvæmd í Maí 2026" line under the statement.
    // 2026-06-10: month only on the report (no exact date), e.g. "í Maí 2026".
    const MONTHS_IS = ['Janúar','Febrúar','Mars','Apríl','Maí','Júní','Júlí','Ágúst','September','Október','Nóvember','Desember'];
    const vd = (window.SlokkVisitDate && window.SlokkVisitDate.get)
      ? window.SlokkVisitDate.get(coId) : null;
    const manudur = (vd && vd.manudur) ? vd.manudur : MONTHS_IS[now.getMonth()];
    const arYear  = (vd && vd.year)    ? vd.year    : now.getFullYear();
    const monthPhrase = 'í ' + manudur + ' ' + arYear;
    // 2026-07-16: mánaðar-index (1-12) fyrir ReportFactsSync (patch 270).
    const _mi = MONTHS_IS.findIndex(m => m.toLowerCase() === String(manudur).toLowerCase());
    const monthIdx = _mi >= 0 ? _mi + 1 : now.getMonth() + 1;

    const ctx = { co, counts, annad, athugasemdir, skodunaradili, monthPhrase, ar: arYear, monthIdx };
    const html = buildReportHtml(ctx);
    showModal(html, co, opts, ctx);
  }

  function buildReportHtml(ctx) {
    const { co, counts, annad, athugasemdir, skodunaradili, monthPhrase } = ctx;

    const ktLine = co.kennitala ? ' kt: ' + esc(co.kennitala) : '';
    const addrLine = co.heimilisfang ? ', ' + esc(co.heimilisfang) : '';
    const custLine = esc(co.nafn || '—') + addrLine + ktLine;

    // 8 category rows, all always shown. Empty count → "x".
    // 2026-05-21: pulled the three columns ~30% closer. Each cell trimmed
    // to 3px horizontal padding on the inner sides so Fjöldi/Í lagi hug
    // the label tightly. Text size + vertical padding unchanged.
    const rowsHtml = CATEGORIES.map(c => {
      const n = counts[c.k] || 0;
      const fjoldi = n > 0 ? String(n) : 'x';
      const ilagi  = n > 0 ? 'Já'      : 'x';
      return `<tr>
        <td style="padding:7px 4px 7px 8px;font-size:13px;color:#0f172a;border-bottom:1px solid #e2e8f0;white-space:nowrap">${esc(c.label)}</td>
        <td style="padding:7px 4px;font-size:13px;color:#0f172a;border-bottom:1px solid #e2e8f0;white-space:nowrap;width:1%"><strong>Fjöldi:</strong> ${esc(fjoldi)}</td>
        <td style="padding:7px 8px 7px 4px;font-size:13px;color:#0f172a;border-bottom:1px solid #e2e8f0;white-space:nowrap;width:1%"><strong>Í lagi:</strong> ${esc(ilagi)}</td>
      </tr>`;
    }).join('');

    return `<!DOCTYPE html><html lang="is"><head><meta charset="utf-8">
      <title>Úttektarskýrsla — ${esc(co.nafn || '')}</title>
      <style>
        @page { size: A4; margin: 16mm 18mm; }
        html, body { margin:0; padding:0; font-family: Arial, Helvetica, sans-serif; color:#0f172a; background:#fff; line-height:1.45; }
        table { width:100%; border-collapse: collapse; }
        @media print { .no-print { display:none !important; } }
      </style></head><body>

        <!-- Letterhead: logo on the left, address on the right -->
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px">
          ${(window.SlokkLogo && SlokkLogo.imgHtml) ? SlokkLogo.imgHtml({heightPx:88, alt:'Slökkvitæki Brunahólf', objectPosition:'left'}) : '<img src="/img/logo.png?v=20260520b" alt="Slökkvitæki Brunahólf" style="height:88px;width:264px;object-fit:contain;object-position:left">'}
          <div style="text-align:right;font-size:12px;color:#0f172a;line-height:1.5">
            Helluhrauni 10, 220 Hafnarfjörður<br>
            Sími: 565 4080, kt. 600508-0400
          </div>
        </div>

        <!-- Intro sentence + customer line -->
        <div style="font-size:13px;color:#0f172a;line-height:1.55;margin-bottom:18px">
          Skýrsla vegna úttektar á brunaslöngum, slökkvitækjum og öðrum búnaði (ef við á) hjá fyrirtækinu
        </div>
        <div style="font-size:13px;color:#0f172a;border-bottom:1px solid #0f172a;padding-bottom:6px;margin-bottom:16px">
          ${custLine}
        </div>

        <!-- Inspection statement — month only -->
        <div style="font-size:15px;font-weight:700;color:#0f172a;margin-bottom:14px">
          Tæki voru yfirfarin af Slökkvitæki ehf ${esc(monthPhrase)}
        </div>

        <!-- Fixed equipment category table — centered as a readable mid-
             page block. Width:auto + label column flex-grow gives uniform
             rows where every "Fjöldi:" and "Í lagi:" line up vertically. -->
        <table style="margin:0 auto 22px;border-collapse:collapse">
          <tbody>${rowsHtml}</tbody>
        </table>

        <!-- Annað -->
        <div style="font-size:13px;color:#0f172a;margin-bottom:18px">
          <strong>Annað:</strong>
          <div style="margin-top:4px;white-space:pre-wrap;line-height:1.6">${annad ? esc(annad) : '—'}</div>
        </div>

        <!-- Athugasemdir -->
        <div style="font-size:13px;color:#0f172a;margin-bottom:60px">
          <strong>Athugasemdir:</strong>
          <div style="margin-top:4px;white-space:pre-wrap;line-height:1.6">${esc(athugasemdir)}</div>
        </div>

        <!-- Sign-off -->
        <div style="font-size:13px;color:#0f172a;line-height:1.7">
          Fyrir hönd <strong>Slökkvitæki ehf</strong>
        </div>
        <div style="margin-top:28px;font-size:13px;color:#0f172a">
          ${skodunaradili ? esc(skodunaradili) : '_______________________'}
        </div>

      </body></html>`;
  }

  function showModal(html, co, opts, ctx) {
    const existing = document.getElementById('_cir-modal');
    if (existing) existing.remove();
    const dlg = document.createElement('div');
    dlg.id = '_cir-modal';
    dlg.style.cssText = 'position:fixed;inset:0;z-index:100050;background:rgba(15,23,42,0.7);display:flex;align-items:center;justify-content:center;padding:18px';
    dlg.innerHTML =
      '<div style="background:#fff;border-radius:14px;box-shadow:0 24px 64px rgba(0,0,0,0.4);width:min(900px,calc(100vw - 32px));height:calc(100vh - 60px);display:flex;flex-direction:column;overflow:hidden">' +
        '<div style="padding:11px 16px;border-bottom:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center;background:#f8fafc">' +
          '<div style="font-size:13px;font-weight:700;color:#0f172a">📄 Úttektarskýrsla</div>' +
          '<div style="display:flex;gap:8px">' +
            '<button id="_cir-save" type="button" style="padding:7px 14px;background:#16a34a;color:#fff;border:none;border-radius:7px;cursor:pointer;font:inherit;font-size:12px;font-weight:700">💾 Vista sem ' + new Date().getFullYear() + ' skýrslu</button>' +
            '<button id="_cir-download" type="button" style="padding:7px 14px;background:#fff;border:1px solid #cbd5e1;border-radius:7px;cursor:pointer;font:inherit;font-size:12px;font-weight:600;color:#334155">⬇ Sækja PDF</button>' +
            '<button id="_cir-email" type="button" style="padding:7px 14px;background:#fff;border:1px solid #cbd5e1;border-radius:7px;cursor:pointer;font:inherit;font-size:12px;font-weight:600;color:#334155">📧 Senda í tölvupósti</button>' +
            '<button id="_cir-print" type="button" style="padding:7px 14px;background:#0d6efd;color:#fff;border:none;border-radius:7px;cursor:pointer;font:inherit;font-size:12px;font-weight:700">🖨 Prenta</button>' +
            '<button id="_cir-close" type="button" style="padding:7px 14px;background:#fff;border:1px solid #cbd5e1;border-radius:7px;cursor:pointer;font:inherit;font-size:12px;color:#475569">✕ Loka</button>' +
          '</div>' +
        '</div>' +
        // 2026-05-20: use srcdoc as a fallback for sandboxed browsers, but
        // the image needs to load from /img/ so we set src directly to a
        // blob URL so the same-origin policy lets it load.
        '<iframe id="_cir-frame" style="flex:1;border:none;background:#fff"></iframe>' +
      '</div>';
    document.body.appendChild(dlg);
    const frame = dlg.querySelector('#_cir-frame');
    // Write into the iframe document so relative URLs (/img/...) resolve
    // against the parent origin instead of about:srcdoc.
    frame.addEventListener('load', () => {});
    frame.src = 'about:blank';
    setTimeout(() => {
      const doc = frame.contentDocument || frame.contentWindow.document;
      doc.open();
      doc.write(html);
      doc.close();
    }, 30);

    function close() { dlg.remove(); }
    dlg.querySelector('#_cir-close').addEventListener('click', close);
    dlg.addEventListener('click', e => { if (e.target === dlg) close(); });
    document.addEventListener('keydown', function escHandler(e) {
      if (e.key === 'Escape') { close(); document.removeEventListener('keydown', escHandler); }
    });
    dlg.querySelector('#_cir-print').addEventListener('click', () => {
      try { frame.contentWindow.focus(); frame.contentWindow.print(); }
      catch (e) { alert('Get ekki prentað: ' + (e.message || e)); }
    });
    // 2026-06-10: save the report as the year's úttektarskýrsla — renders the
    // PDF (reusing patch 176) and uploads it as a year-tagged company
    // attachment, which lights up the 📄 box in that year's column (patch 187).
    // 2026-06-23: vista úttektarskýrsluna sem ársmerkt PDF í skjalakassann —
    // SJÁLFKRAFA þegar skýrslan er búin til (eins og Agnar bað um) OG gegnum
    // „💾 Vista" takkann. Skráarheiti: "<Fyrirtæki> - <kt> - <ár> - úttektarskýrsla.pdf".
    // Vistast í Supabase 'samningar' bucket (þessi vefur hefur ekki Drive-aðgang).
    const _cirSaveBtn = dlg.querySelector('#_cir-save');
    // 2026-07-16 (patch 270): tækjatölur skýrslunnar flæða BEINT inn í kerfið
    // (arsskodun_report_facts + uttaeki-samræming + arsskodun-blob) — áður las
    // facts-pípan bara Drive-PDF svo prófílar/listar héldu gömlum tölum.
    // Best-effort: má aldrei stöðva vistun (ALLTAF LEYFA VISTUN).
    function _rfSync() {
      try {
        if (window.ReportFactsSync && ReportFactsSync.sync) {
          ReportFactsSync.sync(co.id, ctx.counts, { year: +ctx.ar, month: ctx.monthIdx })
            .catch(function () {});
        }
      } catch (_) {}
    }
    async function _cirSaveReport(auto) {
      const ar = String((ctx && ctx.ar) || new Date().getFullYear());
      if (!window.CompanyAttachments || !CompanyAttachments.upload) { if (!auto) alert('Skjalaeining ekki tiltæk.'); return; }
      // Sjálfvirk vistun: sleppa ef úttektarskýrsla þessa árs er þegar til (svo
      // endurteknar forskoðanir tvírita ekki). Handvirki takkinn vistar samt.
      if (auto) {
        try {
          const have = (CompanyAttachments.list ? CompanyAttachments.list(co.id) : []) || [];
          if (have.some(a => a && a.kind === 'skyrsla' && String(a.year) === ar)) {
            if (_cirSaveBtn) { _cirSaveBtn.disabled = true; _cirSaveBtn.textContent = '✓ Vistuð sem ' + ar; }
            _rfSync(); // skýrslan er þegar til — tölurnar samstillast samt (idempotent)
            return;
          }
        } catch (_) {}
      }
      const orig = _cirSaveBtn ? _cirSaveBtn.textContent : '';
      if (_cirSaveBtn) { _cirSaveBtn.disabled = true; _cirSaveBtn.textContent = '⏳ Vista…'; }
      try {
        // jsPDF vektor-texti (engin DOM-rösterun — html2canvas birti autt í þessum vafra).
        const blob = await buildReportPdfBlob(ctx);
        const n = String(co.nafn || 'fyrirtæki').replace(/\s+/g, ' ').trim();
        const ktD = String(co.kennitala || '').replace(/[^0-9]/g, '');
        const ktDash = ktD.length === 10 ? ktD.slice(0, 6) + '-' + ktD.slice(6) : (co.kennitala || '');
        const _mIS = ['janúar','febrúar','mars','apríl','maí','júní','júlí','ágúst','september','október','nóvember','desember'][new Date().getMonth()];
        // Innra skráarheiti (Drive/lesari — EKKI á sendum reikningi):
        // Fyrirtæki - Heimilisfang - Kennitala - Ár - Mánuður - #<fyrirtaeki_id>.
        // #id = STAÐA-id svo lesarinn/nafnabreytirinn tengi BEINT á réttan stað.
        const _addr = String(co.heimilisfang || '').replace(/\s+/g, ' ').trim();
        const _sub = co.id != null ? '#' + co.id : '';
        const fname = [n, _addr, ktDash, ar, _mIS, 'úttektarskýrsla', _sub].filter(Boolean).join(' - ') + '.pdf';
        const file = new File([blob], fname, { type: 'application/pdf' });
        const meta = await CompanyAttachments.upload(co.id, file, { year: ar, kind: 'skyrsla' });
        if (meta) {
          _rfSync(); // patch 270: tölur skýrslunnar inn í facts/uttaeki/blob
          // ── 2026-07-29 (Agnar: „reyna láta skýrsluna haldast betur … og hún á
          //    að vera sýnileg í kröfuyfirliti líka") ─────────────────────────
          // Slökkvitækjaskýrslan fór AÐEINS í company_attachments. Brunakerfið
          // (patch 273) skrifar hins vegar líka customer_documents-röð — og það
          // er sú tafla sem árdálkarnir (187), Kröfu yfirlit (166) og
          // Rekstrarfélög (175) lesa. Þess vegna „vantaði" skýrsluna alls staðar
          // þótt hún væri til (staðfest á E Fasteignafélag v/Norðurhella 17:
          // brunakerfi-röð fyrir 2026 en ENGIN uttektarskyrsla-röð).
          //
          // Drive-leiðin hér að neðan (/api/uttekt-upload) átti að búa röðina
          // til, en hún er best-effort og bregst þegjandi ef endapunkturinn
          // svarar ekki. Nú skrifum við röðina BEINT, idempotent: uppfærum
          // fyrirliggjandi röð sama árs í stað þess að afrita.
          try {
            const sb = window.DB && DB.sb;
            if (sb && co.id != null && ar) {
              const rec = {
                doc_type: 'uttektarskyrsla', fyrirtaeki_id: co.id, year: +ar,
                storage_path: meta.storage_path || null,
                doc_date: new Date().toISOString().slice(0, 10),
                customer_name: n || null, source: 'app', found_by: 'uttektarskyrsla-app',
                notes: fname
              };
              const ex = await sb.from('customer_documents')
                .select('id').eq('fyrirtaeki_id', co.id).eq('year', +ar)
                .eq('doc_type', 'uttektarskyrsla').limit(1);
              if (ex && ex.data && ex.data[0]) {
                await sb.from('customer_documents').update(rec).eq('id', ex.data[0].id);
              } else {
                await sb.from('customer_documents').insert(rec);
              }
              // Skjalaspjaldið (199) endurteiknar sig á þessum atburði — annars
              // sést nýja skýrslan ekki fyrr en eftir hard reload (2026-08-09).
              document.dispatchEvent(new CustomEvent('customer-doc-written'));
            }
          } catch (e) { console.warn('[uttektarskyrsla] customer_documents', e); }
          // 2026-07-16 (ósk Agnars): eintak af skýrslunni fer LÍKA í Google Drive
          // gegnum brunahólfs-endapunktinn /api/uttekt-upload (kanónískt nafn +
          // #staðar-stimpill + customer_documents-röð; idempotent — sama skýrsla
          // uppfærist, afritast aldrei). Best-effort: má ALDREI stöðva vistun.
          try {
            const pub = meta.public_url || meta.publicUrl || meta.url
              || (meta.storage_path && window.DB && DB.sb && DB.sb.storage
                  ? (DB.sb.storage.from('samningar').getPublicUrl(meta.storage_path).data || {}).publicUrl : '');
            const body = { kt: ktDash, fyrirtaeki_id: co.id, company: n, address: _addr, year: +ar, month: _mIS };
            if (pub) body.public_url = pub;
            else body.pdf_base64 = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1]); r.onerror = rej; r.readAsDataURL(blob); });
            fetch('https://brunaholf.netlify.app/api/uttekt-upload', {
              method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
            }).then(r => { if (!r.ok && r.status !== 404) console.warn('[168] uttekt-upload', r.status); })
              .catch(e => console.warn('[168] uttekt-upload', e && e.message));
          } catch (e) { console.warn('[168] uttekt-upload prep', e && e.message); }
          if (_cirSaveBtn) _cirSaveBtn.textContent = '✓ Vistuð sem ' + ar;
          if (window.Toast && Toast.show) Toast.show('✓ Skýrsla vistuð sem ' + ar);
          // Skýrsla þessa árs raunverulega vistuð → „Skýrsla tilbúin/send" grænt
          // á ÞjónustuVerkstæði. Aðeins fyrir árið í ár (curYear) — ekki afturvirkt.
          if (window.ArsWorkflow && String(ar) === String(ArsWorkflow.curYear)) {
            try { ArsWorkflow.markReport(co.id); } catch (_) {}
          }
        }
        else if (_cirSaveBtn) { _cirSaveBtn.disabled = false; _cirSaveBtn.textContent = orig; }
      } catch (e) { if (!auto) alert('Villa við vistun: ' + (e.message || e)); if (_cirSaveBtn) { _cirSaveBtn.disabled = false; _cirSaveBtn.textContent = orig; } }
    }
    if (_cirSaveBtn) _cirSaveBtn.addEventListener('click', () => _cirSaveReport(false));
    // 2026-06-24: straight download — same vector PDF, filename
    // "<Fyrirtæki> - <kt> - <ár> - úttektarskýrsla.pdf".
    const _cirDlBtn = dlg.querySelector('#_cir-download');
    if (_cirDlBtn) _cirDlBtn.addEventListener('click', async () => {
      const ar = String((ctx && ctx.ar) || new Date().getFullYear());
      const orig = _cirDlBtn.textContent;
      _cirDlBtn.disabled = true; _cirDlBtn.textContent = '⏳ …';
      try {
        const blob = await buildReportPdfBlob(ctx);
        const n = String(co.nafn || 'fyrirtæki').replace(/\s+/g, ' ').trim();
        const ktD = String(co.kennitala || '').replace(/[^0-9]/g, '');
        const ktDash = ktD.length === 10 ? ktD.slice(0, 6) + '-' + ktD.slice(6) : (co.kennitala || '');
        const _mIS = ['janúar','febrúar','mars','apríl','maí','júní','júlí','ágúst','september','október','nóvember','desember'][new Date().getMonth()];
        // Innra skráarheiti (Drive/lesari — EKKI á sendum reikningi):
        // Fyrirtæki - Heimilisfang - Kennitala - Ár - Mánuður - #<fyrirtaeki_id>.
        // #id = STAÐA-id svo lesarinn/nafnabreytirinn tengi BEINT á réttan stað.
        const _addr = String(co.heimilisfang || '').replace(/\s+/g, ' ').trim();
        const _sub = co.id != null ? '#' + co.id : '';
        const fname = [n, _addr, ktDash, ar, _mIS, 'úttektarskýrsla', _sub].filter(Boolean).join(' - ') + '.pdf';
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = fname;
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 4000);
      } catch (e) { alert('Villa við að sækja PDF: ' + (e.message || e)); }
      _cirDlBtn.disabled = false; _cirDlBtn.textContent = orig;
    });
    // Sjálfvirk vistun þegar skýrslan opnast (= er búin til); tvíritunarvörn að ofan.
    setTimeout(() => _cirSaveReport(true), 450);
    dlg.querySelector('#_cir-email').addEventListener('click', () => {
      if (window.CompanyReportEmail && typeof CompanyReportEmail.open === 'function') {
        // 2026-08-06: pass reportCtx along so patch 176 can build the PDF with
        // the SAME vector jsPDF renderer as Vista/Sækja (buildReportPdfBlob)
        // instead of re-rendering `html` via html2canvas — that path was
        // producing a blank PDF (see comment on buildReportPdfBlob above).
        CompanyReportEmail.open({ co: co, html: html, reportCtx: ctx, defaultTo: opts && opts.emailTo });
      } else {
        alert('Tölvupóstseining er ekki tiltæk.');
      }
    });
  }

  window.CompanyInspectionReport = { open: openReport, buildReportPdfBlob };
  console.log('[patch-168] Company inspection report v2 installed — PDF-style, no prices');
})();
/* === END COMPANY INSPECTION REPORT v2 === */
