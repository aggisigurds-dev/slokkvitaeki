/* === RECEIPT SENDER v2 ===
 *
 * Sendir reikninga OG úttektarskýrslur í tölvupósti úr Sölu („Fyrri viðskipti"),
 * Hreyfingarlista (167) og víðar. Skilgreinir:
 *   window.ReceiptSender.send(saleId)   → POS-sala: teiknar reikning og sendir
 *   window.ReceiptSender.sendDoc(opts)  → skjal úr customer_documents (skýrsla/reikn.)
 *   window.ReceiptSender.compose(opts)  → opnar ritilinn beint
 *
 * 2026-07-20 — TVENNT LAGAÐ (kvörtun Agnars: „það virkar ekki að senda"):
 *
 * 1) RANGUR PÓSTÞJÓNN. v1 sendi á /api/graph-send (Microsoft Graph). Sá
 *    endapunktur svarar `{"configured": false}` — Azure-appið var aldrei sett
 *    upp. Kallandinn (253) faldi villuna í `catch(_) {}` og sagði bara „ekki
 *    tengt enn", svo þetta leit út eins og hálfkarað fídus. Nú er sent á
 *    /api/email-send (Resend) sem er ÞEGAR í notkun annars staðar í appinu
 *    (Reikninga-póstur 240, skýrslupóstur 176, allt Brunahólf).
 *
 * 2) ENGINN TEXTI SÝNILEGUR. v1 spurði bara um netfang og sendi fastan texta.
 *    Nú opnast ritill með efni + SKILABOÐUM sem sjást og má breyta/bæta við
 *    áður en sent er (ósk Agnars).
 *
 * Viðhengi nýta það sem /api/email-send styður nú þegar:
 *   { filename, content }  base64 (reikningur teiknaður í vafranum, patch 233)
 *   { filename, driveId }  skjal í Drive — fallið sækir það server-megin
 *   { filename, path }     bein slóð (Supabase Storage)
 */
(() => {
  if (window.__receiptSenderInstalled) return;
  window.__receiptSenderInstalled = true;

  function SB() { return (window.DB && DB.sb) || null; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
  function ktDashed(d) { d = String(d || '').replace(/\D/g, ''); return d.length === 10 ? d.slice(0, 6) + '-' + d.slice(6) : d; }
  function toast(m) { if (window.Toast && Toast.show) Toast.show(m); }

  // Sendandi verður að vera á staðfestu Resend-léni (eldklar.is) — sama og 240 notar.
  function fromAddr() {
    try { return localStorage.getItem('email_from') || 'Slökkvitæki ehf <reikningar@eldklar.is>'; }
    catch (_) { return 'Slökkvitæki ehf <reikningar@eldklar.is>'; }
  }

  function blobToBase64(blob) {
    return new Promise((res, rej) => {
      const r = new FileReader();
      r.onloadend = () => res(String(r.result).split(',')[1] || '');
      r.onerror = rej;
      r.readAsDataURL(blob);
    });
  }

  // Textinn úr ritlinum → einfalt HTML (línubil haldast).
  function textToHtml(t) {
    return '<div style="font-family:Arial,sans-serif;font-size:14px;color:#111;line-height:1.5">' +
      esc(t).replace(/\n/g, '<br>') + '</div>';
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

  // ── Staðlaður texti (má breyta í ritlinum áður en sent er) ────────────────
  function standardText(kind, opts) {
    const nafn = (opts && opts.nafn) || '';
    const hi = 'Sæl(l)' + (nafn ? ' ' + nafn : '') + ',';
    if (kind === 'skyrsla') {
      return hi + '\n\n' +
        'Meðfylgjandi er úttektarskýrsla' + (opts && opts.ar ? ' fyrir ' + opts.ar : '') +
        (opts && opts.stadur ? ' — ' + opts.stadur : '') + '.\n\n' +
        'Skýrslan sýnir yfirferð slökkvitækja og brunavarna hjá ykkur. Ef eitthvað er óljóst eða þið viljið fá tilboð í úrbætur er velkomið að hafa samband.\n\n' +
        'Kær kveðja,\nSlökkvitæki ehf.\nkt. 600508-0400\nsími 565-4080';
    }
    return hi + '\n\n' +
      'Meðfylgjandi er reikningur' + (opts && opts.nr ? ' ' + opts.nr : '') + ' frá Slökkvitæki ehf.\n\n' +
      'Ef spurningar vakna um reikninginn er velkomið að hafa samband.\n\n' +
      'Kær kveðja,\nSlökkvitæki ehf.\nkt. 600508-0400\nsími 565-4080';
  }

  // ── Ritill: viðtakandi + efni + SKILABOÐ (sýnileg og breytanleg) ──────────
  // Skilar Promise<true> ef sent tókst, annars false.
  function compose(o) {
    o = o || {};
    return new Promise(resolve => {
      document.getElementById('_rs-dialog')?.remove();
      const dlg = document.createElement('div');
      dlg.id = '_rs-dialog';
      dlg.style.cssText = 'position:fixed;inset:0;z-index:100090;background:rgba(15,23,42,0.6);display:flex;align-items:center;justify-content:center;padding:16px;font-family:inherit';
      const L = 'display:block;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.04em;margin:0 0 5px';
      const I = 'width:100%;padding:9px 11px;border:1.5px solid #cbd5e1;border-radius:8px;font:inherit;font-size:13.5px;box-sizing:border-box';
      dlg.innerHTML =
        '<div style="background:#fff;border-radius:14px;box-shadow:0 24px 64px rgba(0,0,0,0.35);width:min(560px,calc(100vw - 24px));max-height:calc(100vh - 48px);display:flex;flex-direction:column;overflow:hidden">' +
          '<div style="padding:14px 18px;background:linear-gradient(135deg,#0f766e,#0d5b54);color:#fff;font-size:15px;font-weight:700">📧 ' + esc(o.title || 'Senda í tölvupósti') + '</div>' +
          '<div style="padding:16px 18px;overflow:auto;display:flex;flex-direction:column;gap:12px">' +
            '<div><label style="' + L + '">Netfang viðtakanda</label>' +
              '<input id="_rs-to" type="email" value="' + esc(o.to || '') + '" placeholder="netfang@daemi.is" style="' + I + '"></div>' +
            '<div><label style="' + L + '">Efni</label>' +
              '<input id="_rs-subj" type="text" value="' + esc(o.subject || '') + '" style="' + I + '"></div>' +
            '<div><label style="' + L + '">Skilaboð — má breyta og bæta við</label>' +
              '<textarea id="_rs-body" rows="11" style="' + I + ';resize:vertical;line-height:1.5;font-size:13px">' + esc(o.bodyText || '') + '</textarea></div>' +
            '<div style="font-size:11.5px;color:#64748b;background:#f1f5f9;border:1px solid #e2e8f0;border-radius:8px;padding:8px 10px">' +
              '📎 Viðhengi: <b>' + esc(o.attachmentName || 'ekkert') + '</b><br>' +
              '<span style="color:#94a3b8">Sent frá ' + esc(fromAddr()) + '</span>' +
            '</div>' +
            '<div id="_rs-err" style="display:none;font-size:12px;color:#b91c1c;background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:8px 10px"></div>' +
          '</div>' +
          '<div style="padding:12px 18px;border-top:1px solid #e2e8f0;display:flex;gap:8px;justify-content:flex-end;background:#f8fafc">' +
            '<button id="_rs-cancel" type="button" style="padding:8px 16px;border:1px solid #cbd5e1;background:#fff;border-radius:8px;cursor:pointer;font:inherit;font-size:13px;color:#475569">Hætta við</button>' +
            '<button id="_rs-go" type="button" style="padding:8px 18px;background:#0f766e;color:#fff;border:none;border-radius:8px;cursor:pointer;font:inherit;font-size:13px;font-weight:700">📧 Senda</button>' +
          '</div>' +
        '</div>';
      document.body.appendChild(dlg);
      const to = dlg.querySelector('#_rs-to'), subj = dlg.querySelector('#_rs-subj'),
            bodyEl = dlg.querySelector('#_rs-body'), errEl = dlg.querySelector('#_rs-err'),
            go = dlg.querySelector('#_rs-go');
      const done = v => { dlg.remove(); resolve(v); };
      const fail = m => { errEl.textContent = m; errEl.style.display = ''; go.disabled = false; go.textContent = '📧 Senda'; };
      dlg.addEventListener('click', e => { if (e.target === dlg) done(false); });
      dlg.querySelector('#_rs-cancel').addEventListener('click', () => done(false));
      dlg.addEventListener('keydown', e => { if (e.key === 'Escape') done(false); });

      go.addEventListener('click', async () => {
        const addr = (to.value || '').trim();
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(addr)) { to.style.borderColor = '#dc2626'; to.focus(); return; }
        errEl.style.display = 'none';
        go.disabled = true; go.textContent = 'Sendi…';
        try {
          // Viðhengið er byggt hér (getur þurft að teikna PDF) svo ritillinn
          // opnist STRAX og notandinn bíði ekki eftir teikningu að óþörfu.
          let atts = o.attachments || [];
          if (typeof o.buildAttachments === 'function') atts = await o.buildAttachments();
          const resp = await fetch('/api/email-send', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              from: fromAddr(),
              to: [addr],
              subject: (subj.value || '').trim() || 'Skjal frá Slökkvitæki ehf',
              html: textToHtml(bodyEl.value || ''),
              attachments: atts,
            }),
          });
          const j = await resp.json().catch(() => ({}));
          if (!resp.ok || j.error) {
            const msg = j.message || j.detail || j.error || ('HTTP ' + resp.status);
            fail(String(msg).indexOf('API_KEY_MISSING') >= 0
              ? 'Resend-lykill er ekki stilltur á vefþjóninum (RESEND_API_KEY).'
              : 'Sending mistókst: ' + msg);
            return;
          }
          toast('✅ Sent á ' + addr);
          done(true);
        } catch (e) { fail('Villa: ' + ((e && e.message) || e)); }
      });
      setTimeout(() => { to.focus(); if (!o.to) to.select(); }, 30);
    });
  }

  // ── POS-sala: teiknar reikninginn og opnar ritilinn ───────────────────────
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
    const nr = sale.num || '';
    return compose({
      title: 'Senda reikning ' + nr,
      to: opts.to || (co && co.netfang) || '',
      subject: 'Reikningur ' + nr + ' — Slökkvitæki ehf',
      bodyText: standardText('reikningur', { nafn: (co && co.nafn) || sale.customer_nafn || '', nr: nr }),
      attachmentName: 'Reikningur ' + nr + '.pdf',
      buildAttachments: async () => {
        const blob = await UttektInvoicePdf.buildInvoiceBlob(sale, co);
        return [{ filename: 'Reikningur ' + nr + '.pdf', content: await blobToBase64(blob) }];
      },
    });
  }

  // ── Skjal úr customer_documents (úttektarskýrsla eða reikningur) ──────────
  // opts: { kind:'skyrsla'|'reikningur', filename, driveId?, url?, to?, nafn?, ar?, stadur?, nr? }
  async function sendDoc(opts) {
    opts = opts || {};
    if (!opts.driveId && !opts.url) { toast('Engin skrá fylgir þessari færslu — ekkert að senda.'); return false; }
    const att = opts.driveId
      ? { filename: opts.filename || 'skjal.pdf', driveId: opts.driveId }
      : { filename: opts.filename || 'skjal.pdf', path: opts.url };
    const isRep = opts.kind === 'skyrsla';
    return compose({
      title: isRep ? 'Senda úttektarskýrslu' : 'Senda reikning',
      to: opts.to || '',
      subject: (isRep ? 'Úttektarskýrsla' : 'Reikningur') + (opts.ar ? ' ' + opts.ar : '') +
               (opts.nr ? ' ' + opts.nr : '') + ' — Slökkvitæki ehf',
      bodyText: standardText(isRep ? 'skyrsla' : 'reikningur', opts),
      attachmentName: att.filename,
      attachments: [att],
    });
  }

  async function status() {
    try { const r = await fetch('/api/email-send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      const j = await r.json().catch(() => ({}));
      // 'Missing from/to/subject' þýðir að fallið er uppi OG lykillinn er til.
      return { configured: j.error !== 'API_KEY_MISSING' };
    } catch (_) { return { configured: false }; }
  }

  window.ReceiptSender = { send, sendDoc, compose, status, standardText };
  console.log('[patch-254] ReceiptSender v2 installed (Resend /api/email-send + ritill)');
})();
/* === END RECEIPT SENDER === */
