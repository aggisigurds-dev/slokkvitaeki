/* === RECEIPT SENDER v1 ===
 *
 * Makes the 📧 "Senda" buttons (Hreyfingarlisti patch 167, Sala history patch
 * 253, and anywhere else) actually deliver a reikningur/kvittun by email —
 * FROM slokkvitaeki@brunaholf.is via Microsoft Graph (netlify/functions/
 * graph-send.js). Defines window.ReceiptSender.send(saleId).
 *
 * Flow: load the sale → resolve the customer + their netfang → confirm the
 * recipient (editable) → draw the reikningur PDF (reuses patch 233's vector
 * UttektInvoicePdf.buildInvoiceBlob) → POST it as a base64 attachment.
 *
 * Until the Azure app + env vars are set, /api/graph-send returns CONFIG_MISSING
 * and we tell the user the sender isn't connected yet (the 📧 callers already
 * fall back to opening the invoice for print/save).
 */
(() => {
  if (window.__receiptSenderInstalled) return;
  window.__receiptSenderInstalled = true;

  function SB() { return (window.DB && DB.sb) || null; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
  function ktDashed(d) { d = String(d || '').replace(/\D/g, ''); return d.length === 10 ? d.slice(0, 6) + '-' + d.slice(6) : d; }
  function toast(m) { if (window.Toast && Toast.show) Toast.show(m); }

  function blobToBase64(blob) {
    return new Promise((res, rej) => {
      const r = new FileReader();
      r.onloadend = () => res(String(r.result).split(',')[1] || '');
      r.onerror = rej;
      r.readAsDataURL(blob);
    });
  }

  async function resolveCustomer(sale) {
    const sb = SB();
    let co = null;
    if (sale.customer_id && sb) {
      const [f, v] = await Promise.all([
        sb.from('fyrirtaeki').select('nafn,kennitala,heimilisfang,netfang').eq('id', sale.customer_id).maybeSingle(),
        sb.from('vidskiptavinir').select('nafn,kennitala,heimilisfang,netfang').eq('id', sale.customer_id).maybeSingle(),
      ]);
      const norm = s => String(s || '').trim().toLowerCase();
      const sn = norm(sale.customer_nafn);
      if (f.data && norm(f.data.nafn) === sn) co = f.data;
      else if (v.data && norm(v.data.nafn) === sn) co = v.data;
      if (!co) co = f.data || v.data || null;
    }
    if (!co && sb && sale.customer_kt) {
      const ktd = String(sale.customer_kt).replace(/\D/g, '');
      if (ktd.length === 10 && ktd !== '9999999999') {
        try {
          const f = await sb.from('fyrirtaeki').select('nafn,kennitala,heimilisfang,netfang')
            .or('kennitala.eq.' + ktd + ',kennitala.eq.' + ktDashed(ktd)).limit(1).maybeSingle();
          if (f && f.data) co = f.data;
        } catch (_) {}
      }
    }
    return co;
  }

  // ── Confirm dialog (editable recipient) ───────────────────────────────────
  function confirmRecipient(sale, defaultEmail) {
    return new Promise(resolve => {
      document.getElementById('_rs-dialog')?.remove();
      const dlg = document.createElement('div');
      dlg.id = '_rs-dialog';
      dlg.style.cssText = 'position:fixed;inset:0;z-index:100090;background:rgba(15,23,42,0.6);display:flex;align-items:center;justify-content:center;padding:16px;font-family:inherit';
      dlg.innerHTML =
        '<div style="background:#fff;border-radius:14px;box-shadow:0 24px 64px rgba(0,0,0,0.35);width:min(440px,calc(100vw - 24px));overflow:hidden">' +
          '<div style="padding:14px 18px;background:linear-gradient(135deg,#0f766e,#0d5b54);color:#fff;font-size:15px;font-weight:700">📧 Senda reikning ' + esc(sale.num || '') + '</div>' +
          '<div style="padding:16px 18px">' +
            '<label style="display:block;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.04em;margin-bottom:5px">Netfang viðtakanda</label>' +
            '<input id="_rs-email" type="email" value="' + esc(defaultEmail || '') + '" placeholder="netfang@daemi.is" style="width:100%;padding:10px 12px;border:1.5px solid #cbd5e1;border-radius:8px;font:inherit;font-size:14px;box-sizing:border-box">' +
            '<div style="font-size:11px;color:#94a3b8;margin-top:6px">Sent frá slokkvitaeki@brunaholf.is með reikningnum sem PDF-viðhengi.</div>' +
          '</div>' +
          '<div style="padding:12px 18px;border-top:1px solid #e2e8f0;display:flex;gap:8px;justify-content:flex-end;background:#f8fafc">' +
            '<button id="_rs-cancel" type="button" style="padding:8px 16px;border:1px solid #cbd5e1;background:#fff;border-radius:8px;cursor:pointer;font:inherit;font-size:13px;color:#475569">Hætta við</button>' +
            '<button id="_rs-go" type="button" style="padding:8px 18px;background:#0f766e;color:#fff;border:none;border-radius:8px;cursor:pointer;font:inherit;font-size:13px;font-weight:700">📧 Senda</button>' +
          '</div>' +
        '</div>';
      document.body.appendChild(dlg);
      const inp = dlg.querySelector('#_rs-email');
      const done = v => { dlg.remove(); resolve(v); };
      dlg.addEventListener('click', e => { if (e.target === dlg) done(null); });
      dlg.querySelector('#_rs-cancel').addEventListener('click', () => done(null));
      dlg.querySelector('#_rs-go').addEventListener('click', () => {
        const v = (inp.value || '').trim();
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) { inp.style.borderColor = '#dc2626'; inp.focus(); return; }
        done(v);
      });
      inp.addEventListener('keydown', e => { if (e.key === 'Enter') dlg.querySelector('#_rs-go').click(); if (e.key === 'Escape') done(null); });
      setTimeout(() => { inp.focus(); if (!defaultEmail) inp.select(); }, 30);
    });
  }

  function emailHtml(sale, co) {
    const nafn = (co && co.nafn) || sale.customer_nafn || '';
    return '<div style="font-family:Arial,sans-serif;font-size:14px;color:#111">' +
      '<p>Sæl(l)' + (nafn ? ' ' + esc(nafn) : '') + ',</p>' +
      '<p>Meðfylgjandi er reikningur <b>' + esc(sale.num || '') + '</b> frá Slökkvitæki ehf.</p>' +
      '<p>Kær kveðja,<br>Slökkvitæki ehf.<br>kt. 600508-0400</p>' +
      '</div>';
  }

  async function send(saleId, opts) {
    opts = opts || {};
    const sb = SB();
    if (!sb) { toast('Engin gagnabankatenging.'); return false; }
    if (!window.UttektInvoicePdf || typeof UttektInvoicePdf.buildInvoiceBlob !== 'function') {
      toast('Reikningsteikning ekki tilbúin — endurhladdu síðunni.'); return false;
    }
    const r = await sb.from('solur').select('*').eq('id', saleId).single();
    if (r.error || !r.data) { toast('Salan fannst ekki.'); return false; }
    const sale = r.data;
    const co = await resolveCustomer(sale);
    const to = opts.to || await confirmRecipient(sale, (co && co.netfang) || '');
    if (!to) return false;

    toast('📧 Sendi reikning…');
    try {
      const blob = await UttektInvoicePdf.buildInvoiceBlob(sale, co);
      const b64 = await blobToBase64(blob);
      const resp = await fetch('/api/graph-send', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: to,
          subject: 'Reikningur ' + (sale.num || '') + ' — Slökkvitæki ehf',
          html: emailHtml(sale, co),
          attachments: [{ filename: 'Reikningur ' + (sale.num || '') + '.pdf', contentBytes: b64, contentType: 'application/pdf' }],
        }),
      });
      const j = await resp.json().catch(() => ({}));
      if (resp.ok && j.ok) { toast('✅ Reikningur sendur á ' + to); return true; }
      if (j.error === 'CONFIG_MISSING') { toast('📧 Tölvupóstsending er ekki tengd enn (vantar Azure-uppsetningu).'); return false; }
      toast('Sending mistókst: ' + (j.message || j.detail || j.error || ('HTTP ' + resp.status)));
      return false;
    } catch (e) { toast('Villa: ' + (e.message || e)); return false; }
  }

  async function status() {
    try { const r = await fetch('/api/graph-send?status=1'); return await r.json(); } catch (_) { return { configured: false }; }
  }

  window.ReceiptSender = { send, status };
  console.log('[patch-254] ReceiptSender installed (Microsoft Graph → slokkvitaeki@brunaholf.is)');
})();
/* === END RECEIPT SENDER === */
