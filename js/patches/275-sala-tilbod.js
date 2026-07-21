/* === SALA: SENDA TILBOÐ (2026-07-21) ===
 *
 * Ósk Agnars (skjámynd m/ „Tilb" krote á greiðslugluggann): nýr valkostur í
 * Greiðslu-glugganum í Sölu — „✉️ Senda tilboð". Í stað þess að klára sölu:
 *   1. Teiknar TILBOÐ sem PDF úr körfunni (jsPDF vektor — sama útlit og
 *      tilboðs-sniðið sem verdlisti.pdf sýnir: logo, rautt TILBOÐ-merki, línur,
 *      VSK-samtala, „gildir í 30 daga")
 *   2. Opnar póst-ritilinn (ReceiptSender.compose, patch 254) með tilbúnum
 *      texta („Meðfylgjandi er tilboð…") sem má breyta áður en sent er
 *   3. Sendir frá eldklar@eldklar.is gegnum Gmail-leiðina (brunahólf
 *      /api/gmail-send) með PDF-ið sem viðhengi
 *
 * SNERTIR EKKI greiðslu-/söluflæðið: patch 07 bindur greiðslu-handlera á sína
 * takka við smíði gluggans, svo þessi viðbótar-flís (sprautað inn EFTIR á) fer
 * aldrei í proceed(). Engin sala verður til; karfan stendur óhreyfð á eftir.
 *
 * Public: window.SalaTilbod = { open, buildPdf }
 */
(() => {
  if (window.__salaTilbodInstalled) return;
  window.__salaTilbodInstalled = true;

  const LOGO_PATH = '/img/brunaholf-logo.png';
  const VALID_LINE = 'Tilboð þetta gildir í 30 daga. Verð eru með fyrirvara um breytingar á umfangi verks.';
  const FOOT_CO = 'Brunahólf slökkvitæki ehf. · Helluhrauni 10, 220 Hafnarfjörður · kt. 600508-0400 · Sími 565-4080 · eldklar@eldklar.is';

  let _logoData = null;

  function SB() { return (window.DB && DB.sb) || null; }
  function toast(m) { if (window.Toast && Toast.show) Toast.show(m); else alert(m); }
  function fmtKr(n) { return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ' kr'; }
  function fmtKt(kt) { const d = String(kt || '').replace(/\D/g, ''); return d.length === 10 ? d.slice(0, 6) + '-' + d.slice(6) : (kt || ''); }
  function today() { const d = new Date(); return String(d.getDate()).padStart(2, '0') + '.' + String(d.getMonth() + 1).padStart(2, '0') + '.' + d.getFullYear(); }
  // jsPDF innbyggða letrið er CP1252 — stafir utan þess (₂ í „CO₂", U+2212 o.fl.)
  // brjóta línuna („C O , 5 k g …" ruslið, Agnar 2026-07-21). Undirskriftar-
  // tölustafir verða venjulegir, týpó-mínus verður '-', annað óstutt fellt burt.
  const PDF_OK = new Set('–—‘’“”•…€™‚„‰‹›ŠžœŽšŒƒˆ˜Ÿ');
  function pdfSafe(s) {
    return String(s == null ? '' : s)
      .replace(/[₀-₉]/g, d => String.fromCharCode(48 + d.charCodeAt(0) - 0x2080))
      .replace(/−/g, '-')
      .split('').map(c => (c.charCodeAt(0) <= 0xFF || PDF_OK.has(c)) ? c : '').join('');
  }
  function blobToBase64(blob) {
    return new Promise((res, rej) => {
      const r = new FileReader();
      r.onloadend = () => res(String(r.result).split(',')[1] || '');
      r.onerror = rej;
      r.readAsDataURL(blob);
    });
  }

  function ensureJsPdf() {
    if (window.jspdf && window.jspdf.jsPDF) return Promise.resolve();
    return new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
      s.onload = () => (window.jspdf && window.jspdf.jsPDF) ? res() : rej(new Error('jsPDF hlóðst ekki.'));
      s.onerror = () => rej(new Error('jsPDF hlóðst ekki.'));
      document.head.appendChild(s);
    });
  }
  function logoData() {
    if (_logoData) return Promise.resolve(_logoData);
    return fetch(LOGO_PATH).then(r => { if (!r.ok) throw new Error('logo'); return r.blob(); })
      .then(b => new Promise((res, rej) => {
        const fr = new FileReader();
        fr.onload = () => { const im = new Image(); im.onload = () => { _logoData = { url: fr.result, w: im.width, h: im.height }; res(_logoData); }; im.onerror = rej; im.src = fr.result; };
        fr.onerror = rej; fr.readAsDataURL(b);
      })).catch(() => null);
  }

  // Afrit af körfunni á smell-augnablikinu (svo síðari breytingar trufli ekki)
  function snapshot() {
    const st = (window.POS && POS.getState && POS.getState()) || {};
    const tt = (window.POS && POS.totals && POS.totals()) || { ex: 0, vsk: 0, total: 0, raw_ex: 0, saved: 0 };
    return {
      lines: (st.lines || []).map(l => ({ desc: l.desc || '', qty: +l.qty || 1, unit: +l.unit_price_ex_vat || 0, vsk: +l.vsk_pct || 24 })),
      totals: tt,
      discount_pct: parseFloat(st.discount_pct) || 0,
      customer: st.customer ? { ...st.customer } : {}
    };
  }

  // ── TILBOÐ-PDF (útlit eftir tilboðs-sniðinu í verdlisti.pdf) ────────────────
  async function buildPdf(snap) {
    await ensureJsPdf();
    const logo = await logoData();
    const jsPDF = window.jspdf.jsPDF;
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const W = 595.28, H = 841.89, ML = 48, MR = W - 48, CW = MR - ML;
    const INK = [26, 32, 44], GRAY = [100, 108, 122], BORDER = [226, 229, 234], RED = [217, 72, 15];
    let y = 46;

    // stærra logo (ósk Agnars 2026-07-21): 40pt → 58pt
    if (logo) { const lh = 58, lw = lh * logo.w / logo.h; doc.addImage(logo.url, 'PNG', ML, y, lw, lh); }
    // rautt TILBOÐ-merki + dags hægra megin
    doc.setFillColor.apply(doc, RED);
    doc.roundedRect(MR - 86, y, 86, 22, 11, 11, 'F');
    doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(10.5);
    doc.text('TILBOÐ', MR - 43, y + 15, { align: 'center' });
    doc.setTextColor.apply(doc, GRAY); doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
    doc.text(today(), MR, y + 38, { align: 'right' });
    y += 74;
    doc.setTextColor.apply(doc, GRAY); doc.setFontSize(8.5);
    ['Helluhrauni 10, 220 Hafnarfirði', 'Sími 565-4080 · eldklar@eldklar.is', 'kt. 600508-0400'].forEach(t => { doc.text(t, ML, y); y += 11; });
    y += 6;
    doc.setDrawColor.apply(doc, RED); doc.setLineWidth(2.5);
    doc.line(ML, y, MR, y); y += 20;

    // viðskiptavinur
    doc.setFillColor(246, 247, 249);
    doc.roundedRect(ML, y, CW, 46, 6, 6, 'F');
    doc.setTextColor.apply(doc, GRAY); doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5);
    doc.text('VIÐSKIPTAVINUR', ML + 14, y + 15);
    doc.setTextColor.apply(doc, INK); doc.setFontSize(11.5);
    const cu = snap.customer || {};
    doc.text(pdfSafe((cu.nafn || '—') + (cu.kt ? '   ·   kt. ' + fmtKt(cu.kt) : '')), ML + 14, y + 32);
    y += 64;

    // línutafla
    const cols = [
      { w: CW - 300, label: 'LIÐUR', align: 'left' },
      { w: 52, label: 'MAGN', align: 'center' },
      { w: 92, label: 'EININGAVERÐ', align: 'right' },
      { w: 52, label: 'AFSL.', align: 'center' },
      { w: 104, label: 'SAMTALS ÁN VSK', align: 'right' }
    ];
    let cx = ML;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor.apply(doc, GRAY);
    cols.forEach(c => {
      const tx = c.align === 'center' ? cx + c.w / 2 : c.align === 'right' ? cx + c.w : cx;
      doc.text(c.label, tx, y, { align: c.align === 'left' ? 'left' : c.align });
      cx += c.w;
    });
    y += 6;
    doc.setDrawColor.apply(doc, BORDER); doc.setLineWidth(0.8);
    doc.line(ML, y, MR, y); y += 4;

    const afsl = snap.discount_pct > 0 ? Math.round(snap.discount_pct) + '%' : '—';
    snap.lines.forEach(l => {
      if (y > H - 190) { doc.addPage(); y = 60; }
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5); doc.setTextColor.apply(doc, INK);
      const nameLines = doc.splitTextToSize(pdfSafe(l.desc) || '—', cols[0].w - 8);
      const rowH = Math.max(18, nameLines.length * 12 + 6);
      nameLines.forEach((ln, i) => doc.text(ln, ML, y + 12 + i * 12));
      let x2 = ML + cols[0].w;
      doc.text(String(l.qty), x2 + cols[1].w / 2, y + 12, { align: 'center' }); x2 += cols[1].w;
      doc.text(fmtKr(l.unit), x2 + cols[2].w, y + 12, { align: 'right' }); x2 += cols[2].w;
      doc.setTextColor.apply(doc, GRAY);
      doc.text(afsl, x2 + cols[3].w / 2, y + 12, { align: 'center' }); x2 += cols[3].w;
      doc.setTextColor.apply(doc, INK); doc.setFont('helvetica', 'bold');
      doc.text(fmtKr(l.qty * l.unit), x2 + cols[4].w, y + 12, { align: 'right' });
      y += rowH;
      doc.setDrawColor(240, 241, 244); doc.setLineWidth(0.6);
      doc.line(ML, y, MR, y); y += 3;
    });

    // samtölur
    y += 14;
    const tt = snap.totals || {};
    const totRow = (label, val, opts) => {
      opts = opts || {};
      doc.setFont('helvetica', opts.bold ? 'bold' : 'normal');
      doc.setFontSize(opts.big ? 13 : 9.5);
      doc.setTextColor.apply(doc, opts.red ? RED : (opts.bold ? INK : GRAY));
      doc.text(label, MR - 210, y, { align: 'left' });
      doc.text(val, MR, y, { align: 'right' });
      y += opts.big ? 22 : 16;
    };
    if ((tt.saved || 0) > 0.5) {
      totRow('Samtals án vsk', fmtKr(tt.raw_ex || 0));
      // ASCII '-' — týpógrafíski mínusinn (U+2212) er EKKI til í CP1252-letri
      // jsPDF og teiknaðist sem rusl („&&&…") í kringum töluna (Agnar 2026-07-21)
      totRow('Afsláttur' + (snap.discount_pct > 0 ? ' (' + Math.round(snap.discount_pct) + '%)' : ''), '-' + fmtKr(tt.saved || 0));
    }
    totRow('Án vsk', fmtKr(tt.ex || 0));
    totRow('VSK', fmtKr(tt.vsk || 0));
    doc.setDrawColor.apply(doc, INK); doc.setLineWidth(1.2);
    doc.line(MR - 210, y - 6, MR, y - 6); y += 6;
    totRow('Samtals m. vsk', fmtKr(tt.total || 0), { bold: true, big: true, red: true });

    // fótur
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor.apply(doc, GRAY);
    doc.text(VALID_LINE, ML, Math.max(y + 18, H - 74));
    doc.setDrawColor.apply(doc, BORDER); doc.setLineWidth(0.7);
    doc.line(ML, H - 56, MR, H - 56);
    doc.setFontSize(7.5); doc.setFont('helvetica', 'bold'); doc.setTextColor.apply(doc, INK);
    doc.text(FOOT_CO, W / 2, H - 42, { align: 'center' });
    return doc.output('blob');
  }

  // ── netfang viðtakanda (fyrirtaeki eftir co_id / kt) ────────────────────────
  async function resolveEmail(cu) {
    const sb = SB(); if (!sb) return '';
    try {
      if (cu.co_id) {
        const r = await sb.from('fyrirtaeki').select('netfang').eq('id', cu.co_id).maybeSingle();
        if (r.data && r.data.netfang) return String(r.data.netfang).split(/[,;]/)[0].trim();
      }
      const ktd = String(cu.kt || '').replace(/\D/g, '');
      if (ktd.length === 10 && ktd !== '9999999999') {
        const r = await sb.from('fyrirtaeki').select('netfang').or('kennitala.eq.' + ktd + ',kennitala.eq.' + fmtKt(ktd)).limit(1).maybeSingle();
        if (r.data && r.data.netfang) return String(r.data.netfang).split(/[,;]/)[0].trim();
      }
    } catch (_) {}
    return '';
  }

  function bodyText(nafn) {
    return 'Sæl(l)' + (nafn ? ' ' + nafn : '') + ',\n\n' +
      'Meðfylgjandi er tilboð frá Brunahólf slökkvitæki ehf.\n\n' +
      'Tilboðið gildir í 30 daga. Ef spurningar vakna, eða þið viljið staðfesta tilboðið, er velkomið að svara þessum pósti eða hringja í síma 565-4080.\n\n' +
      'Kær kveðja,\nBrunahólf slökkvitæki ehf.\nkt. 600508-0400\nsími 565-4080';
  }

  // ── opna ritilinn út frá körfunni ───────────────────────────────────────────
  async function open() {
    if (!window.ReceiptSender || typeof ReceiptSender.compose !== 'function') {
      toast('Póst-sendirinn er ekki tilbúinn — endurhladdu síðunni.'); return false;
    }
    const snap = snapshot();
    if (!snap.lines.length) { toast('Karfan er tóm — ekkert tilboð að senda.'); return false; }
    const cu = snap.customer || {};
    const to = await resolveEmail(cu);
    const fname = 'Tilboð - ' + (cu.nafn || 'Brunahólf slökkvitæki ehf') + ' - ' + today() + '.pdf';
    return ReceiptSender.compose({
      title: 'Senda tilboð' + (cu.nafn ? ' — ' + cu.nafn : ''),
      to: to,
      subject: 'Tilboð — Brunahólf slökkvitæki ehf',
      bodyText: bodyText(cu.nafn || ''),
      attachmentName: fname,
      preview: async () => buildPdf(snap),
      buildAttachments: async () => {
        const blob = await buildPdf(snap);
        return [{ filename: fname, content: await blobToBase64(blob) }];
      }
    });
  }

  // ── flísin í Greiðslu-gluggann (07) — sprautað inn þegar hann birtist ──────
  function inject(modal) {
    const grid = modal.querySelector('.scd-methods');
    if (!grid || grid.querySelector('[data-method="tilbod"]')) return;
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'scd-method';
    b.dataset.method = 'tilbod';
    b.style.gridColumn = '1 / -1';
    b.innerHTML = '<span class="scd-icon">✉️</span><span>Senda tilboð</span>' +
      '<small style="display:block;font-size:11px;color:#64748b;margin-top:2px">PDF í tölvupósti frá eldklar@eldklar.is — engin sala stofnast</small>';
    b.addEventListener('click', e => {
      e.preventDefault(); e.stopPropagation();
      modal.remove();          // loka greiðslu-glugganum; karfan stendur óbreytt
      open();
    });
    grid.appendChild(b);
  }
  new MutationObserver(muts => {
    for (const m of muts) {
      for (const n of m.addedNodes) {
        if (n && n.nodeType === 1) {
          if (n.id === 'sala-pay-modal') inject(n);
          else if (n.querySelector) { const x = n.querySelector('#sala-pay-modal'); if (x) inject(x); }
        }
      }
    }
  }).observe(document.body, { childList: true });

  window.SalaTilbod = { open, buildPdf };
  console.log('[patch-275] Sala „Senda tilboð" installed');
})();
/* === END SALA SENDA TILBOÐ === */
