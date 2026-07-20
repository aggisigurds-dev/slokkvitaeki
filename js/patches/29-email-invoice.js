/* === EMAIL INVOICE v1 === */
/* Sends an invoice link/PDF to the customer's email after checkout.
 * Appears as "Senda á netfang" option in the Sala checkout dialog.
 *
 * Because this is a static site with no backend, two approaches are
 * offered (configured in Settings):
 *
 *  1. mailto: link — opens the user's default email client with a
 *     pre-filled body containing invoice details + link to the web app.
 *     Works without any configuration. No PDF attachment.
 *
 *  2. Resend API — if user provides a Resend.com API key and a "from"
 *     address, sends a nicely formatted HTML email with invoice details.
 *     Resend free tier: 100 emails/day. Key stored in localStorage.
 *     URL: https://api.resend.com/emails
 *
 * Settings keys:
 *   email_mode: "mailto" | "resend"
 *   resend_api_key: "re_..."
 *   email_from: "Slökkvitæki ehf <noreply@yourdomain.is>"
 *   email_from_name: "Slökkvitæki ehf"
 */
(() => {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (window.__emailInvoiceInstalled) return;
  window.__emailInvoiceInstalled = true;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c =>
      ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }
  function fmtKr(n) { return Math.round(n).toLocaleString('is-IS') + ' kr'; }

  // ── CSS ───────────────────────────────────────────────────────────────────
  if (!document.getElementById('ei-style')) {
    const s = document.createElement('style');
    s.id = 'ei-style';
    s.textContent = `
      .ei-send-btn {
        display: flex; align-items: center; gap: 7px;
        padding: 9px 16px; background: #fff; border: 1px solid #cbd5e1;
        border-radius: 8px; cursor: pointer; font: inherit; font-size: 13px;
        color: #334155; font-weight: 500; width: 100%; text-align: left;
        margin-top: 8px;
      }
      .ei-send-btn:hover { background: #f8fafc; border-color: #94a3b8; }
      .ei-send-btn:disabled { opacity: .5; cursor: not-allowed; }
      .ei-send-btn svg { flex-shrink: 0; }

      #ei-modal {
        position: fixed; inset: 0; z-index: 100020;
        display: flex; align-items: center; justify-content: center;
        font-family: inherit;
      }
      #ei-modal .ei-back { position: absolute; inset: 0; background: rgba(15,23,42,.55); }
      #ei-modal .ei-card {
        position: relative; background: #fff; border-radius: 14px;
        box-shadow: 0 20px 60px rgba(0,0,0,.3);
        width: min(460px,calc(100vw - 24px));
      }
      #ei-modal .ei-head { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-bottom: 1px solid #e2e8f0; }
      #ei-modal .ei-head h3 { margin: 0; font-size: 16px; font-weight: 700; }
      #ei-modal .ei-x { background: none; border: none; font-size: 20px; color: #94a3b8; cursor: pointer; padding: 2px 8px; border-radius: 6px; }
      #ei-modal .ei-x:hover { background: #f1f5f9; }
      #ei-modal .ei-body { padding: 20px; }
      #ei-modal .ei-row { margin-bottom: 13px; }
      #ei-modal .ei-row label { display: block; font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: .05em; margin-bottom: 4px; }
      #ei-modal .ei-input { width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 7px; font: inherit; font-size: 13px; box-sizing: border-box; }
      #ei-modal .ei-input:focus { outline: none; border-color: #2563eb; }
      #ei-modal .ei-info { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 7px; padding: 10px 12px; font-size: 12px; color: #1e40af; margin-bottom: 14px; }
      #ei-modal .ei-foot { display: flex; gap: 8px; justify-content: flex-end; padding: 12px 20px; border-top: 1px solid #e2e8f0; }
      #ei-modal .ei-cancel { padding: 9px 18px; border: 1px solid #cbd5e1; border-radius: 8px; background: #fff; cursor: pointer; font: inherit; font-size: 13px; color: #475569; }
      #ei-modal .ei-send { padding: 9px 18px; background: #2563eb; color: #fff; border: none; border-radius: 8px; cursor: pointer; font: inherit; font-size: 13px; font-weight: 600; }
      #ei-modal .ei-send:hover { background: #1d4ed8; }
      #ei-modal .ei-send:disabled { opacity: .5; cursor: not-allowed; }
    `;
    document.head.appendChild(s);
  }

  // ── Modal ─────────────────────────────────────────────────────────────────
  function buildModal() {
    if (document.getElementById('ei-modal')) return;
    const el = document.createElement('div');
    el.id = 'ei-modal'; el.style.display = 'none';
    el.innerHTML = `
      <div class="ei-back"></div>
      <div class="ei-card">
        <div class="ei-head"><h3>📧 Senda reikning á netfang</h3><button class="ei-x" id="ei-x">✕</button></div>
        <div class="ei-body" id="ei-body"></div>
        <div class="ei-foot">
          <button class="ei-cancel" id="ei-cancel">Hætta við</button>
          <button class="ei-send" id="ei-send">📤 Senda</button>
        </div>
      </div>`;
    document.body.appendChild(el);
    el.querySelector('.ei-back').onclick = closeEiModal;
    el.querySelector('#ei-x').onclick = closeEiModal;
    el.querySelector('#ei-cancel').onclick = closeEiModal;
  }
  function closeEiModal() { const el = document.getElementById('ei-modal'); if (el) el.style.display = 'none'; }

  // ── Build email content ───────────────────────────────────────────────────
  function buildEmailBody(sale) {
    const lineItems = (sale.lines || []).map(l => {
      const qty = +l.qty || 0;
      const unitEx = +l.unit_price_ex_vat || 0;
      const rate = +l.vsk_pct || 0;
      const lineInc = qty * unitEx * (1 + rate / 100);
      return `• ${l.desc || ''} × ${qty} — ${fmtKr(lineInc)}`;
    }).join('\n');
    return `Reikningur ${sale.num || ''}\n`
      + `Dagsetning: ${new Date(sale.date || Date.now()).toLocaleDateString('is-IS')}\n`
      + `Viðskiptavinur: ${sale.customer || ''}\n\n`
      + `${lineItems}\n\n`
      + `Samtals: ${fmtKr(sale.total || 0)}\n\n`
      + `Kærar þakkir fyrir viðskiptin!\nSlökkvitæki ehf`;
  }

  function buildHtmlEmail(sale) {
    const lineRows = (sale.lines || []).map(l => {
      const qty = +l.qty || 0; const unitEx = +l.unit_price_ex_vat || 0;
      const rate = +l.vsk_pct || 0; const lineInc = qty * unitEx * (1 + rate / 100);
      return `<tr><td style="padding:6px 12px;border-bottom:1px solid #f1f5f9;">${esc(l.desc||'')}</td><td style="padding:6px 12px;text-align:right;border-bottom:1px solid #f1f5f9;">${qty}</td><td style="padding:6px 12px;text-align:right;border-bottom:1px solid #f1f5f9;font-weight:600;">${fmtKr(lineInc)}</td></tr>`;
    }).join('');
    return `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
      <div style="background:#C93C1D;padding:16px 20px;border-radius:8px 8px 0 0;">
        <h1 style="margin:0;color:#fff;font-size:18px;">Slökkvitæki ehf</h1>
        <p style="margin:4px 0 0;color:rgba(255,255,255,.8);font-size:13px;">Reikningur ${esc(sale.num||'')}</p>
      </div>
      <div style="background:#fff;border:1px solid #e2e8f0;border-top:none;padding:20px;border-radius:0 0 8px 8px;">
        <p style="color:#475569;font-size:13px;">Kæri viðskiptavinur,<br>hér er reikningurinn þinn.</p>
        <table style="width:100%;border-collapse:collapse;font-size:14px;margin:16px 0;">
          <thead><tr style="background:#f8fafc;">
            <th style="padding:8px 12px;text-align:left;font-size:11px;color:#64748b;text-transform:uppercase;">Lýsing</th>
            <th style="padding:8px 12px;text-align:right;font-size:11px;color:#64748b;text-transform:uppercase;">Magn</th>
            <th style="padding:8px 12px;text-align:right;font-size:11px;color:#64748b;text-transform:uppercase;">Upphæð</th>
          </tr></thead>
          <tbody>${lineRows}</tbody>
        </table>
        <div style="background:#f8fafc;border-radius:6px;padding:12px;text-align:right;font-size:16px;font-weight:700;">
          Samtals: ${fmtKr(sale.total||0)}
        </div>
        <p style="font-size:12px;color:#64748b;margin-top:20px;">Kærar þakkir fyrir viðskiptin!<br><strong>Slökkvitæki ehf</strong></p>
      </div>
    </body></html>`;
  }

  // ── Send via mailto ───────────────────────────────────────────────────────
  function sendMailto(toEmail, sale) {
    const subject = encodeURIComponent('Reikningur ' + (sale.num || '') + ' frá Slökkvitæki ehf');
    const body = encodeURIComponent(buildEmailBody(sale));
    window.open(`mailto:${encodeURIComponent(toEmail)}?subject=${subject}&body=${body}`);
    if (window.Toast && Toast.show) Toast.show('✓ Tölvupóstur opnaður í póstforritinu');
  }

  // ── Send via Resend API ───────────────────────────────────────────────────
  async function sendResend(toEmail, sale) {
    // Browser can't hit Resend directly (no CORS). Proxy via /api/email-send.
    // The proxy reads RESEND_API_KEY env var on Netlify; falls back to apiKey in body for legacy.
    const apiKey = localStorage.getItem('resend_api_key') || '';
    // 2026-05-31: default sender aligned to the company's real, mailable domain
    // (eldklar.is). Resend rejects any send from a domain without verified
    // SPF/DKIM records, so this MUST match the domain verified in the Resend
    // dashboard. A value set in Stillingar (localStorage) still overrides this.
    const from = localStorage.getItem('email_from') || 'Slökkvitæki ehf <noreply@eldklar.is>';
    const payload = {
      from,
      to: [toEmail],
      subject: 'Reikningur ' + (sale.num || '') + ' frá Slökkvitæki ehf',
      html: buildHtmlEmail(sale),
      apiKey: apiKey || undefined  // server prefers env var; this is legacy fallback
    };
    // 2026-07-20: sent gegnum Gmail (AppMail → /api/gmail-send) í stað Resend,
    // sem er dautt fyrir eldklar.is. AppMail skilar Response-líkum hlut.
    const r = await (window.AppMail ? AppMail.send(payload)
      : fetch('/api/email-send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }));
    if (!r.ok) {
      const err = await r.json().catch(() => ({ message: 'Sending mistókst' }));
      throw new Error(err.message || err.error || ('HTTP ' + r.status));
    }
    return await r.json();
  }

  // ── Open send modal ───────────────────────────────────────────────────────
  function openSendModal(sale) {
    buildModal();
    const mode = localStorage.getItem('email_mode') || 'mailto';
    const defaultEmail = sale.customerEmail || '';

    document.getElementById('ei-body').innerHTML = `
      ${mode === 'resend' ? `<div class="ei-info">Notar Resend API til að senda tölvupóst beint.</div>` :
        `<div class="ei-info">Opnar tölvupóstforritið þitt með útfylltum reikningsupplýsingum (mailto).<br>Þú getur stillt Resend API til að senda beint — sjá Stillingar.</div>`}
      <div class="ei-row">
        <label>Netfang viðtakanda</label>
        <input id="ei-to-email" type="email" class="ei-input" value="${esc(defaultEmail)}" placeholder="vidskiptavinur@dæmi.is">
      </div>
      <div class="ei-row">
        <label>Reikningur</label>
        <div style="font-size:13px;color:#334155;background:#f8fafc;border:1px solid #e2e8f0;border-radius:7px;padding:10px 12px;">
          <strong>${esc(sale.num||'')}</strong> · ${esc(sale.customer||'')} · <strong>${fmtKr(sale.total||0)}</strong>
        </div>
      </div>`;

    document.getElementById('ei-send').onclick = async () => {
      const email = document.getElementById('ei-to-email').value.trim();
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        if (window.Toast && Toast.show) Toast.show('Skrðu gilt netfang');
        return;
      }
      const sendBtn = document.getElementById('ei-send');
      sendBtn.disabled = true; sendBtn.textContent = 'Sendir…';
      try {
        if (mode === 'resend') {
          await sendResend(email, sale);
          if (window.Toast && Toast.show) Toast.show('✓ Reikningur sendur á ' + email);
        } else {
          sendMailto(email, sale);
        }
        closeEiModal();
      } catch (e) {
        if (window.Toast && Toast.show) Toast.show('Villa: ' + (e.message || e));
        sendBtn.disabled = false; sendBtn.textContent = '📤 Senda';
      }
    };

    document.getElementById('ei-modal').style.display = 'flex';
    setTimeout(() => document.getElementById('ei-to-email')?.focus(), 100);
  }

  // ── Hook into checkout dialog ─────────────────────────────────────────────
  // Patch 07 shows a checkout modal — we inject a "Send email" button
  // by watching for the modal to open.
  function injectSendButton() {
    const modal = document.getElementById('sala-pay-modal') || document.getElementById('scd-modal');
    if (!modal || modal.dataset.eiInjected) return;
    modal.dataset.eiInjected = '1';

    // Watch for it being shown
    const obs = new MutationObserver(() => {
      if (modal.style.display === 'none' || !modal.classList.contains('open')) return;
      if (modal.querySelector('.ei-send-btn')) return;
      // Find the body/options area
      const body = modal.querySelector('.scd-body, .modal-bd') || modal;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'ei-send-btn';
      btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>Senda reikning á netfang viðskiptavinar`;
      body.appendChild(btn);
      btn.addEventListener('click', () => {
        // Build a minimal sale object from POS state
        let sale = {};
        try {
          if (window.POS && POS.getState) {
            const st = POS.getState();
            sale = {
              lines: st.lines || [],
              customer: st.customer?.nafn || '',
              customerEmail: st.customer?.netfang || '',
              total: st.lines?.reduce((a,l) => a + ((+l.qty||0)*(+l.unit_price_ex_vat||0)*(1+(+l.vsk_pct||0)/100)), 0) || 0
            };
          }
        } catch (_) {}
        openSendModal(sale);
      });
    });
    obs.observe(modal, { attributes: true, attributeFilter: ['style','class'] });
  }

  // Also expose a standalone trigger
  window.EmailInvoice = {
    open: openSendModal,
    send: sendResend,
    sendMailto
  };

  // Inject settings section
  function injectSettingsSection() {
    const settingsView = document.getElementById('view-settings');
    if (!settingsView || document.getElementById('ei-settings-section')) return;
    const container = settingsView.querySelector('.main-panel, main') || settingsView;
    const div = document.createElement('div');
    div.id = 'ei-settings-section';
    div.style.cssText = 'padding:16px 20px;border-top:1px solid #e2e8f0;';
    const curMode = localStorage.getItem('email_mode') || 'mailto';
    const curKey = localStorage.getItem('resend_api_key') || '';
    const curFrom = localStorage.getItem('email_from') || '';
    div.innerHTML = `
      <div style="font-weight:700;font-size:13px;color:#0f172a;margin-bottom:10px;">Tölvupóstur (reikningssendir)</div>
      <div style="margin-bottom:10px;">
        <label style="font-size:12px;font-weight:600;color:#64748b;display:block;margin-bottom:4px;">Sendingarleið</label>
        <select id="ei-mode-sel" style="padding:7px 10px;border:1px solid #cbd5e1;border-radius:7px;font:inherit;font-size:13px;background:#fff;">
          <option value="mailto" ${curMode==='mailto'?'selected':''}>mailto: (opnar tölvupóstforrit)</option>
          <option value="resend" ${curMode==='resend'?'selected':''}>Resend API (sendir beint)</option>
        </select>
      </div>
      <div style="margin-bottom:10px;">
        <label style="font-size:12px;font-weight:600;color:#64748b;display:block;margin-bottom:4px;">Resend API lykill</label>
        <div style="display:flex;gap:8px;">
          <input id="ei-resend-key" type="text" placeholder="re_..." value="${esc(curKey)}"
            style="flex:1;padding:7px 10px;border:1px solid #cbd5e1;border-radius:7px;font:inherit;font-size:13px;">
        </div>
        <div style="font-size:11px;color:#64748b;margin-top:4px;">Fáðu lykil á <a href="https://resend.com" target="_blank" style="color:#2563eb;">resend.com</a> (100 tölvupóstar/dag ókeypis)</div>
      </div>
      <div style="margin-bottom:12px;">
        <label style="font-size:12px;font-weight:600;color:#64748b;display:block;margin-bottom:4px;">Sendandi netfang (Resend)</label>
        <input id="ei-from-email" type="text" placeholder="Slökkvitæki ehf <noreply@eldklar.is>" value="${esc(curFrom)}"
          style="width:100%;padding:7px 10px;border:1px solid #cbd5e1;border-radius:7px;font:inherit;font-size:13px;box-sizing:border-box;">
      </div>
      <button onclick="
        localStorage.setItem('email_mode', document.getElementById('ei-mode-sel').value);
        localStorage.setItem('resend_api_key', document.getElementById('ei-resend-key').value.trim());
        localStorage.setItem('email_from', document.getElementById('ei-from-email').value.trim());
        if(window.Toast&&Toast.show)Toast.show('✓ Stillingar vistaðar');
      " style="padding:7px 16px;background:#2563eb;color:#fff;border:none;border-radius:7px;cursor:pointer;font:inherit;font-size:13px;">Vista stillingar</button>`;
    container.appendChild(div);
  }

  document.addEventListener('view-shown', e => {
    if (e.detail && e.detail.name === 'settings') setTimeout(injectSettingsSection, 150);
  });
  setTimeout(injectSettingsSection, 2500);

  // Hook checkout dialog
  const checkoutObs = new MutationObserver(() => {
    injectSendButton();
    const m = document.getElementById('sala-pay-modal');
    if (m && !m.dataset.eiInjected) injectSendButton();
  });
  checkoutObs.observe(document.body, { childList: true, subtree: true });
  setTimeout(injectSendButton, 1500);

  console.log('[email-invoice] installed');
})();
/* === END EMAIL INVOICE === */
