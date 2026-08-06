/* === COMPANY REPORT EMAIL v1 ===
 *
 * Sends the company úttektarskýrsla (built by patch 168) to the customer as a
 * PDF attachment, straight from the app.
 *
 *   • Renders the report HTML → A4 PDF client-side (html2pdf.js, lazy-loaded
 *     from CDN on first use so the ~250 KB bundle isn't on every page).
 *   • Sends via the existing Resend proxy (/api/email-send) — same plumbing,
 *     "from" address and API-key settings as the invoice mailer (patch 29).
 *   • The email body is a short Icelandic cover note; the report itself rides
 *     along as Uttektarskyrsla-<fyrirtaeki>.pdf.
 *
 * Public API:
 *   window.CompanyReportEmail.open({ co, html })
 *     co   — fyrirtaeki row ({ nafn, netfang, ... })
 *     html — the full report document string from patch 168
 */
(() => {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (window.__companyReportEmailInstalled) return;
  window.__companyReportEmailInstalled = true;

  const H2P_URL = 'https://cdn.jsdelivr.net/npm/html2pdf.js@0.10.2/dist/html2pdf.bundle.min.js';
  // Mirror the invoice mailer's default sender — must be a Resend-verified
  // domain (eldklar.is). A value in Stillingar (localStorage) overrides it.
  const DEFAULT_FROM = 'Brunahólf Slökkvitæki ehf <noreply@eldklar.is>';

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c =>
      ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }
  function toast(msg) { if (window.Toast && Toast.show) Toast.show(msg); else console.log('[report-email]', msg); }

  // ── Lazy-load the PDF bundle ──────────────────────────────────────────────
  let _h2pLoading = null;
  function loadHtml2Pdf() {
    if (window.html2pdf) return Promise.resolve();
    if (_h2pLoading) return _h2pLoading;
    _h2pLoading = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = H2P_URL;
      s.onload = () => resolve();
      s.onerror = () => { _h2pLoading = null; reject(new Error('Gat ekki hlaðið PDF-einingu (html2pdf).')); };
      document.head.appendChild(s);
    });
    return _h2pLoading;
  }

  function waitForImages(root) {
    const imgs = Array.from(root.querySelectorAll('img'));
    return Promise.all(imgs.map(img =>
      (img.complete && img.naturalWidth) ? Promise.resolve()
        // 2026-07-20: kapp við tímamörk — án þess hékk PDF-teikningin ENDALAUST
        // ef mynd (logo/undirskrift) hleðst aldrei (blokkuð/hæg slóð). Betra að
        // halda áfram eftir 6s án myndarinnar en að frjósa „Sendi…" að eilífu.
        : new Promise(res => {
            let done = false;
            const fin = () => { if (!done) { done = true; res(); } };
            img.onload = img.onerror = fin;
            setTimeout(fin, 6000);
          })
    ));
  }

  // ── Render the report HTML string → PDF, return base64 (no data: prefix) ──
  async function htmlToPdfBase64(html, filename) {
    await loadHtml2Pdf();
    // The report is a full <html> document; lift its <style> + <body> into an
    // offscreen A4-width holder so html2canvas can lay it out and capture it.
    const parsed = new DOMParser().parseFromString(html, 'text/html');
    const styles = Array.from(parsed.querySelectorAll('style')).map(s => s.textContent).join('\n');
    // 2026-06-10: html2canvas reliably captures only GENUINELY VISIBLE elements
    // (off-screen / hidden / 0-height / opacity:0 all give blank or clipped
    // output). So render a real full-A4-width visible holder, but at a z-index
    // just BELOW the report modal (100050) so it sits hidden behind the modal
    // backdrop — invisible to the user, fully captured by html2canvas.
    const W = 794; // A4 width in px @96dpi
    const holder = document.createElement('div');
    holder.style.cssText = 'position:fixed;top:0;left:0;width:' + W + 'px;background:#fff;z-index:100000';
    holder.innerHTML = (styles ? '<style>' + styles + '</style>' : '') + parsed.body.innerHTML;
    document.body.appendChild(holder);
    try {
      await waitForImages(holder);
      const opt = {
        margin: [12, 12, 12, 12], // mm — top, left, bottom, right
        filename: filename || 'Uttektarskyrsla.pdf',
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };
      const dataUri = await window.html2pdf().set(opt).from(holder).outputPdf('datauristring');
      return String(dataUri).split(',')[1] || '';
    } finally {
      holder.remove();
    }
  }

  function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result).split(',')[1] || '');
      r.onerror = reject;
      r.readAsDataURL(blob);
    });
  }

  // 2026-08-06: preferred PDF source — the SAME vector jsPDF builder patch 168
  // uses for Vista/Sækja PDF (buildReportPdfBlob(ctx)). The old html2canvas
  // path below (htmlToPdfBase64) rendered a BLANK PDF for the Senda-í-
  // tölvupósti flow ("it work everywhere else" bug report) — buildReportPdfBlob
  // was already the fix applied to Vista/Sækja for the exact same blank-canvas
  // issue (see the comment on buildReportPdfBlob in patch 168). Falls back to
  // htmlToPdfBase64 only if reportCtx wasn't passed in (shouldn't happen from
  // the only real caller, patch 168, but keeps this module usable standalone).
  async function reportPdfBase64(html, filename, reportCtx) {
    if (reportCtx && window.CompanyInspectionReport && typeof CompanyInspectionReport.buildReportPdfBlob === 'function') {
      const blob = await CompanyInspectionReport.buildReportPdfBlob(reportCtx);
      return blobToBase64(blob);
    }
    return htmlToPdfBase64(html, filename);
  }

  function safeFileName(name) {
    const base = String(name || 'fyrirtaeki')
      .normalize('NFKD').replace(/[̀-ͯ]/g, '') // strip diacritics
      .replace(/[^A-Za-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    return 'Uttektarskyrsla-' + (base || 'fyrirtaeki') + '.pdf';
  }

  function coverHtml(co) {
    const nafn = esc(co && co.nafn || '');
    return `<!DOCTYPE html><html lang="is"><head><meta charset="utf-8"></head>
      <body style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#0f172a">
        <div style="background:#C93C1D;padding:16px 20px;border-radius:8px 8px 0 0">
          <h1 style="margin:0;color:#fff;font-size:18px">Brunahólf Slökkvitæki ehf</h1>
          <p style="margin:4px 0 0;color:rgba(255,255,255,.85);font-size:13px">Úttektarskýrsla</p>
        </div>
        <div style="background:#fff;border:1px solid #e2e8f0;border-top:none;padding:20px;border-radius:0 0 8px 8px;font-size:14px;line-height:1.6">
          <p>Sæl/sæll,</p>
          <p>Meðfylgjandi er úttektarskýrsla vegna yfirferðar á brunaslöngum, slökkvitækjum og öðrum búnaði${nafn ? ' hjá ' + nafn : ''}.</p>
          <p>Skýrslan er í viðhengi sem PDF-skjal.</p>
          <p style="margin-top:20px;color:#475569;font-size:13px">Kær kveðja,<br><strong>Brunahólf Slökkvitæki ehf</strong><br>Helluhrauni 10, 220 Hafnarfjörður · Sími 565 4080</p>
        </div>
      </body></html>`;
  }

  // ── Send via the Resend proxy (PDF attachment) ────────────────────────────
  async function sendViaResend(to, co, html, reportCtx) {
    // Reports always go out as the noreply sender (noreply@eldklar.is) — a
    // dedicated `report_email_from` override, NOT the invoice mailer's
    // `email_from`, so the report sender can't be changed by accident.
    const from = localStorage.getItem('report_email_from') || DEFAULT_FROM;
    const apiKey = localStorage.getItem('resend_api_key') || ''; // server prefers env var
    const filename = safeFileName(co && co.nafn);
    const base64 = await reportPdfBase64(html, filename, reportCtx);
    if (!base64) throw new Error('Tókst ekki að búa til PDF.');
    const payload = {
      from,
      to: [to],
      subject: 'Úttektarskýrsla' + (co && co.nafn ? ' — ' + co.nafn : ''),
      html: coverHtml(co),
      attachments: [{ filename, content: base64 }],
      apiKey: apiKey || undefined
    };
    // 2026-07-20: Gmail (AppMail → /api/gmail-send) í stað Resend.
    const r = await (window.AppMail ? AppMail.send(payload)
      : fetch('/api/email-send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }));
    if (!r.ok) {
      const err = await r.json().catch(() => ({ message: 'Sending mistókst' }));
      throw new Error(err.message || err.error || ('HTTP ' + r.status));
    }
    return r.json().catch(() => ({}));
  }

  // ── Recipient modal ───────────────────────────────────────────────────────
  function open(ctx) {
    const co = (ctx && ctx.co) || {};
    const html = ctx && ctx.html;
    const reportCtx = ctx && ctx.reportCtx;
    if (!html) { alert('Engin skýrsla til að senda.'); return; }

    const old = document.getElementById('_cre-modal');
    if (old) old.remove();

    const dlg = document.createElement('div');
    dlg.id = '_cre-modal';
    dlg.style.cssText = 'position:fixed;inset:0;z-index:100060;display:flex;align-items:center;justify-content:center;background:rgba(15,23,42,.6);padding:16px';
    dlg.innerHTML =
      '<div style="background:#fff;border-radius:14px;box-shadow:0 20px 60px rgba(0,0,0,.35);width:min(440px,calc(100vw - 24px));overflow:hidden">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;padding:14px 18px;border-bottom:1px solid #e2e8f0;background:#f8fafc">' +
          '<div style="font-size:14px;font-weight:700;color:#0f172a">📧 Senda úttektarskýrslu</div>' +
          '<button id="_cre-x" type="button" style="background:none;border:none;font-size:18px;color:#94a3b8;cursor:pointer;line-height:1;padding:4px 8px">✕</button>' +
        '</div>' +
        '<div style="padding:18px">' +
          '<div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:10px 12px;font-size:12px;color:#1e40af;margin-bottom:14px">Skýrslan er send sem PDF-viðhengi beint úr appinu.</div>' +
          '<label style="display:block;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.05em;margin-bottom:5px">Netfang viðtakanda</label>' +
          '<input id="_cre-to" type="email" value="' + esc((ctx && ctx.defaultTo) || co.netfang || '') + '" placeholder="vidskiptavinur@daemi.is" ' +
            'style="width:100%;padding:9px 12px;border:1px solid #cbd5e1;border-radius:8px;font:inherit;font-size:14px;box-sizing:border-box">' +
          (co.nafn ? '<div style="margin-top:8px;font-size:12px;color:#64748b">Fyrirtæki: <strong style="color:#334155">' + esc(co.nafn) + '</strong></div>' : '') +
        '</div>' +
        '<div style="display:flex;gap:8px;justify-content:space-between;align-items:center;padding:12px 18px;border-top:1px solid #e2e8f0;background:#f8fafc">' +
          '<button id="_cre-dl" type="button" style="padding:9px 14px;background:#fff;border:1px solid #cbd5e1;border-radius:8px;cursor:pointer;font:inherit;font-size:12px;color:#475569">⬇ Sækja PDF</button>' +
          '<div style="display:flex;gap:8px">' +
            '<button id="_cre-cancel" type="button" style="padding:9px 16px;background:#fff;border:1px solid #cbd5e1;border-radius:8px;cursor:pointer;font:inherit;font-size:13px;color:#475569">Hætta við</button>' +
            '<button id="_cre-send" type="button" style="padding:9px 18px;background:#2563eb;color:#fff;border:none;border-radius:8px;cursor:pointer;font:inherit;font-size:13px;font-weight:700">📤 Senda</button>' +
          '</div>' +
        '</div>' +
      '</div>';
    document.body.appendChild(dlg);

    function close() { dlg.remove(); }
    dlg.querySelector('#_cre-x').onclick = close;
    dlg.querySelector('#_cre-cancel').onclick = close;
    dlg.addEventListener('click', e => { if (e.target === dlg) close(); });

    // Download fallback — same PDF the send flow attaches (reportPdfBase64:
    // vector jsPDF when reportCtx is available, html2canvas otherwise).
    dlg.querySelector('#_cre-dl').onclick = async () => {
      const btn = dlg.querySelector('#_cre-dl');
      const prev = btn.textContent; btn.disabled = true; btn.textContent = 'Bý til PDF…';
      try {
        const filename = safeFileName(co.nafn);
        const base64 = await reportPdfBase64(html, filename, reportCtx);
        const bin = atob(base64);
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        const blobUrl = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
        const a = document.createElement('a'); a.href = blobUrl; a.download = filename;
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(blobUrl), 4000);
      } catch (e) {
        toast('Villa: ' + (e.message || e));
      } finally {
        btn.disabled = false; btn.textContent = prev;
      }
    };

    dlg.querySelector('#_cre-send').onclick = async () => {
      const to = dlg.querySelector('#_cre-to').value.trim();
      if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) { toast('Sláðu inn gilt netfang.'); return; }
      const btn = dlg.querySelector('#_cre-send');
      btn.disabled = true; btn.textContent = 'Sendir…';
      try {
        await sendViaResend(to, co, html, reportCtx);
        toast('✓ Úttektarskýrsla send á ' + to);
        close();
      } catch (e) {
        alert('Villa við sendingu:\n\n' + (e.message || e));
        btn.disabled = false; btn.textContent = '📤 Senda';
      }
    };

    setTimeout(() => { const i = dlg.querySelector('#_cre-to'); if (i && !i.value) i.focus(); }, 80);
  }

  window.CompanyReportEmail = { open, htmlToPdfBase64 };
  console.log('[patch-176] Company report email installed — PDF attachment via Resend');
})();
/* === END COMPANY REPORT EMAIL === */
