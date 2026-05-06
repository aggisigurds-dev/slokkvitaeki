/* === SJÁLFVIRKIR REIKNINGAR Í PÓSTI / AUTO EMAIL INVOICES v1 === */
/* When a job is marked as completed/billed, opens user's mail client with
 * a prefilled invoice email (mailto: link). No SMTP server required.
 *
 * Email body includes invoice number, amount, payment instructions.
 * Settings (cfg_email_subject, cfg_email_intro, cfg_company_phone) are reused.
 *
 * Adds "📧 Senda reikning" button to invoice/job detail panels.
 */
(() => {
  if (window.__autoEmailInstalled) return;
  window.__autoEmailInstalled = true;

  function esc(s){return String(s==null?'':s);}
  function fmtKr(n){if(!n&&n!==0)return'—';const s=Math.round(n).toString();const r=[];let t=s;while(t.length>3){r.unshift(t.slice(-3));t=t.slice(0,-3);}r.unshift(t);return r.join('.')+' kr';}
  function fmtDate(d){if(!d)return'';const x=new Date(d);return x.getDate()+'.'+(x.getMonth()+1)+'.'+x.getFullYear();}

  function getSetting(k, def) { return localStorage.getItem('cfg_'+k) || localStorage.getItem(k) || def || ''; }

  function buildEmailBody(invoice) {
    const co = getSetting('company_name', 'Slökkvitæki ehf');
    const phone = getSetting('company_phone', '');
    const intro = getSetting('email_intro', 'Sæll/sæl,\n\nMeðfylgjandi er reikningur.');
    const lines = [];
    lines.push(intro);
    lines.push('');
    lines.push(`Reikningur:    ${invoice.num || '#'+invoice.id}`);
    if (invoice.created_at) lines.push(`Dags:          ${fmtDate(invoice.created_at)}`);
    lines.push(`Upphæð:        ${fmtKr(invoice.samtals)}`);
    if (invoice.greitt_med === 'reikningur') {
      lines.push('');
      lines.push('Greiðsluleiðbeiningar:');
      lines.push('— Banki: Bankaupplýsingar koma hér');
      lines.push('— Kennitala: ' + getSetting('kennitala',''));
      lines.push('— Eindagi: 14 daga frá útgáfu');
    }
    lines.push('');
    lines.push('Bestu kveðjur,');
    lines.push(co);
    if (phone) lines.push('Sími: ' + phone);
    return lines.join('\n');
  }

  function sendInvoice(invoice, recipientEmail) {
    const subject = getSetting('email_subject', 'Reikningur frá Slökkvitæki ehf') + (invoice.num ? ' — ' + invoice.num : '');
    const body = buildEmailBody(invoice);
    const url = `mailto:${encodeURIComponent(recipientEmail||'')}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = url;
  }

  function showSendDialog(invoice) {
    const m = document.createElement('div');
    m.style.cssText = 'position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.5);padding:16px';
    m.onclick = e => { if(e.target===m) m.remove(); };
    m.innerHTML = `
      <div style="background:#fff;border-radius:14px;padding:22px;max-width:520px;width:100%">
        <h3 style="margin:0 0 12px">📧 Senda reikning í tölvupósti</h3>
        <div style="font-size:13px;color:#64748b;margin-bottom:12px">Reikningur ${esc(invoice.num||'#'+invoice.id)} · ${fmtKr(invoice.samtals)}</div>
        <label style="font-size:11px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:.04em">Móttakandi (netfang)</label>
        <input id="ae-to" type="email" placeholder="netfang@example.com" value="${esc(invoice.email||invoice.netfang||'')}" style="width:100%;padding:10px;border:1px solid #e2e8f0;border-radius:6px;box-sizing:border-box;margin-bottom:8px">
        <label style="font-size:11px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:.04em">Forskoðun</label>
        <textarea id="ae-body" rows="10" style="width:100%;padding:10px;border:1px solid #e2e8f0;border-radius:6px;box-sizing:border-box;font-family:monospace;font-size:12px">${esc(buildEmailBody(invoice))}</textarea>
        <div style="font-size:11px;color:#94a3b8;margin-top:6px">Þú getur breytt textanum áður en þú smellir á "Opna í pósti".</div>
        <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:14px">
          <button class="btn btn-outline" onclick="this.closest('[style*=fixed]').remove()">Hætta við</button>
          <button class="btn btn-primary" onclick="AutoEmail._send(${invoice.id})">📧 Opna í pósti</button>
        </div>
      </div>`;
    document.body.appendChild(m);
    m.dataset.invoice = JSON.stringify(invoice);
  }

  function _send(id) {
    const m = document.querySelector('div[data-invoice]');
    if (!m) return;
    const inv = JSON.parse(m.dataset.invoice);
    const to = document.getElementById('ae-to').value.trim();
    const body = document.getElementById('ae-body').value;
    if (!to) { alert('Sláðu inn netfang'); return; }
    const subject = getSetting('email_subject', 'Reikningur frá Slökkvitæki ehf') + (inv.num ? ' — ' + inv.num : '');
    const url = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = url;
    m.remove();
  }

  // Inject button into invoice rows
  const obs = new MutationObserver(() => {
    document.querySelectorAll('[data-invoice-id]:not([data-aemail-injected])').forEach(row => {
      const id = row.dataset.invoiceId;
      if (!id) return;
      row.dataset.aemailInjected = '1';
      const actions = row.querySelector('.row-actions, .invoice-actions');
      if (!actions) return;
      const btn = document.createElement('button');
      btn.className = 'btn btn-ghost btn-sm';
      btn.title = 'Senda í pósti';
      btn.innerHTML = '📧';
      btn.onclick = async e => {
        e.stopPropagation();
        const SB = window.DB && window.DB.sb;
        if (!SB) return;
        const { data } = await SB.from('solur').select('*').eq('id', id).single();
        if (data) showSendDialog(data);
      };
      actions.appendChild(btn);
    });
  });
  obs.observe(document.body, { childList:true, subtree:true });

  window.AutoEmail = { sendInvoice, showSendDialog, _send };
  console.log('[auto-email] installed');
})();
