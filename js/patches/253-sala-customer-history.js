/* === SALA CUSTOMER HISTORY v2 ===
 *
 * Adds a "🧾 Fyrri kaup" button to the selected-customer card in Sala (POS,
 * patch 114's #_ups-selected card). Clicking opens a modal listing that
 * customer's previous receipts + invoices (from `solur`), each viewable /
 * printable / re-sendable — so when a customer asks "what did I buy last time"
 * or "send me the receipt from last week" you can answer without leaving Sala
 * (the karfa is untouched). The modal header also carries a shareable
 * deep-link `#hreyfingarlisti/<kt>` (open in new tab · copy) whose handler
 * lives in patch 167 (Hreyfingarlisti) and runs the same name/kt lookup.
 *
 * Self-contained: reads the card's identity (data-id / data-source / data-kt +
 * the shown name) — it does NOT touch patch 114's sale flow. Sales are matched
 * by customer_kt (the reliable link after the 2026-07-01 always-kt work) OR the
 * company customer_id OR the exact name, mirroring Hreyfingarlisti's lookup.
 *
 * Send (📧) uses window.ReceiptSender.send(saleId) when the email connector is
 * wired; until then it opens the invoice so the operator can print / save PDF.
 */
(() => {
  if (window.__salaCustHistoryInstalled) return;
  window.__salaCustHistoryInstalled = true;

  function SB() { return (window.DB && DB.sb) || null; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
  function ktDigits(s) { return String(s == null ? '' : s).replace(/\D/g, ''); }
  function ktDashed(d) { return d && d.length === 10 ? d.slice(0, 6) + '-' + d.slice(6) : d; }
  function orSafe(s) { return String(s == null ? '' : s).replace(/["(),*]/g, ' ').trim(); }
  function fmtKr(n) { return Math.round(Number(n) || 0).toLocaleString('is-IS').replace(/,/g, '.') + ' kr'; }
  function fmtDate(iso) { if (!iso) return '—'; const d = new Date(iso); return isNaN(d) ? '—' : (String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear()); }
  function methodLabel(m) {
    if (m === 'kort') return '💳 Kort'; if (m === 'reidufe' || m === 'peningar') return '💵 Reiðufé';
    if (m === 'reikningur') return '📋 Reikningur'; if (m === 'greitt_sidar') return '⏳ Greitt síðar';
    return esc(m || '—');
  }

  // Shareable deep-link — kt when real (unambiguous), else the name.
  function queryFor(kt, nafn) { const d = ktDigits(kt); return (d.length === 10 && d !== '9999999999') ? d : (nafn || '').trim(); }
  function urlFor(kt, nafn) { const q = queryFor(kt, nafn); return q ? (location.origin + '/#hreyfingarlisti/' + encodeURIComponent(q)) : ''; }

  // ── Inject the button + keep its visibility synced to "Sjá →" ─────────────
  function ensureButton() {
    const openBtn = document.getElementById('_ups-sel-open');
    if (!openBtn || !openBtn.parentElement) return;
    let btn = document.getElementById('_ups-sel-history');
    if (!btn) {
      btn = document.createElement('button');
      btn.id = '_ups-sel-history';
      btn.type = 'button';
      btn.title = 'Sjá fyrri kvittanir og reikninga þessa viðskiptavinar';
      btn.textContent = '🧾 Fyrri';
      btn.style.cssText = 'background:#0f766e;border:1px solid #0d5b54;color:#fff;font-size:11px;font-weight:600;padding:4px 9px;border-radius:5px;cursor:pointer;line-height:1.2;white-space:nowrap';
      btn.addEventListener('click', onClick);
      openBtn.parentElement.insertBefore(btn, openBtn.nextSibling);
    }
    btn.style.display = openBtn.style.display === 'none' ? 'none' : '';
  }

  function onClick() {
    const card = document.getElementById('_ups-selected');
    if (!card) return;
    const nafn = ((document.getElementById('_ups-sel-nafn') || {}).textContent || '').trim();
    open({ id: card.dataset.id || '', source: card.dataset.source || '', kt: card.dataset.kt || '', nafn: nafn });
  }

  // ── Modal ─────────────────────────────────────────────────────────────────
  function close() { document.getElementById('_sch-modal')?.remove(); }

  async function open(idty) {
    close();
    const link = urlFor(idty.kt, idty.nafn);
    const dlg = document.createElement('div');
    dlg.id = '_sch-modal';
    dlg.style.cssText = 'position:fixed;inset:0;z-index:100085;background:rgba(15,23,42,0.6);display:flex;align-items:center;justify-content:center;padding:16px;font-family:inherit';
    dlg.innerHTML =
      '<div style="background:#fff;border-radius:14px;box-shadow:0 24px 64px rgba(0,0,0,0.35);width:min(760px,calc(100vw - 24px));max-height:calc(100vh - 48px);display:flex;flex-direction:column;overflow:hidden">' +
        '<div style="padding:14px 20px;background:linear-gradient(135deg,#0f766e,#0d5b54);color:#fff;display:flex;justify-content:space-between;align-items:center;gap:10px">' +
          '<div style="min-width:0">' +
            '<div style="font-size:15px;font-weight:700">🧾 Fyrri kaup — ' + esc(idty.nafn || 'Viðskiptavinur') + '</div>' +
            '<div style="font-size:11px;color:#99f6e4;margin-top:2px">' + (ktDigits(idty.kt).length === 10 && ktDigits(idty.kt) !== '9999999999' ? 'kt. ' + esc(ktDashed(ktDigits(idty.kt))) : 'án kennitölu') + '</div>' +
          '</div>' +
          '<div style="display:flex;gap:6px;align-items:center">' +
            (link ? '<button id="_sch-opentab" type="button" title="Opna í Hreyfingarlista í nýjum flipa" style="background:rgba(255,255,255,0.14);border:1px solid rgba(255,255,255,0.4);color:#fff;font-size:11px;font-weight:600;padding:5px 9px;border-radius:6px;cursor:pointer;white-space:nowrap">🔗 Opna flipa</button>' +
                    '<button id="_sch-copy" type="button" title="Afrita hlekk á sögu kúnnans" style="background:rgba(255,255,255,0.14);border:1px solid rgba(255,255,255,0.4);color:#fff;font-size:11px;font-weight:600;padding:5px 9px;border-radius:6px;cursor:pointer;white-space:nowrap">📋 Afrita hlekk</button>' : '') +
            '<button id="_sch-x" type="button" style="background:transparent;border:1px solid rgba(255,255,255,0.4);color:#fff;width:32px;height:32px;border-radius:7px;cursor:pointer;font-size:16px;line-height:1">✕</button>' +
          '</div>' +
        '</div>' +
        '<div id="_sch-body" style="flex:1;overflow:auto;padding:14px 18px;background:#f8fafc"><div style="padding:30px;text-align:center;color:#94a3b8">Hleður sögu…</div></div>' +
      '</div>';
    document.body.appendChild(dlg);
    dlg.addEventListener('click', e => { if (e.target === dlg) close(); });
    dlg.querySelector('#_sch-x').addEventListener('click', close);
    document.addEventListener('keydown', function onKey(e) { if (e.key === 'Escape') { close(); document.removeEventListener('keydown', onKey); } });
    if (link) {
      dlg.querySelector('#_sch-opentab')?.addEventListener('click', () => window.open(link, '_blank'));
      dlg.querySelector('#_sch-copy')?.addEventListener('click', () => {
        try { navigator.clipboard.writeText(link); if (window.Toast && Toast.show) Toast.show('🔗 Hlekkur afritaður'); }
        catch (_) { window.prompt('Afritaðu hlekkinn:', link); }
      });
    }

    const sb = SB();
    const body = dlg.querySelector('#_sch-body');
    if (!sb) { body.innerHTML = '<div style="padding:30px;text-align:center;color:#dc2626">Engin gagnabankatenging.</div>'; return; }

    const ktd = ktDigits(idty.kt);
    const parts = [];
    if (idty.id && idty.source === 'fyrirtaeki') parts.push('customer_id.eq.' + idty.id);
    if (ktd.length === 10 && ktd !== '9999999999') { parts.push('customer_kt.eq.' + ktd); const d = ktDashed(ktd); if (d !== ktd) parts.push('customer_kt.eq.' + d); }
    if (idty.nafn) parts.push('customer_nafn.eq."' + orSafe(idty.nafn) + '"');
    if (!parts.length) { body.innerHTML = '<div style="padding:30px;text-align:center;color:#94a3b8">Ekki hægt að fletta upp þessum viðskiptavini.</div>'; return; }

    const r = await sb.from('solur')
      .select('id,num,customer_nafn,customer_id,customer_kt,samtals,greitt_med,created_at,paid_at,is_credit')
      .or(parts.join(','))
      .order('created_at', { ascending: false })
      .limit(500);
    if (r.error) { body.innerHTML = '<div style="padding:30px;text-align:center;color:#dc2626">Villa: ' + esc(r.error.message) + '</div>'; return; }
    const rows = r.data || [];
    if (!rows.length) { body.innerHTML = '<div style="padding:34px;text-align:center;color:#94a3b8;font-style:italic">Engin fyrri kaup fundust hjá þessum viðskiptavini.</div>'; return; }

    const total = rows.filter(s => !s.is_credit).reduce((a, s) => a + (+s.samtals || 0), 0);
    body.innerHTML =
      '<div style="font-size:12px;color:#475569;margin-bottom:10px">' + rows.length + ' færslur · samtals ' + esc(fmtKr(total)) + '</div>' +
      '<div style="background:#fff;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden">' +
        '<table style="width:100%;border-collapse:collapse;font-size:13px">' +
          '<thead><tr style="background:#f1f5f9;border-bottom:1px solid #e2e8f0">' +
            '<th style="padding:8px 10px;text-align:left;font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:.04em">Dags</th>' +
            '<th style="padding:8px 10px;text-align:left;font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:.04em">Skjal</th>' +
            '<th style="padding:8px 10px;text-align:left;font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:.04em">Greiðsla</th>' +
            '<th style="padding:8px 10px;text-align:left;font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:.04em">Staða</th>' +
            '<th style="padding:8px 10px;text-align:right;font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:.04em">Upphæð</th>' +
            '<th style="padding:8px 10px"></th>' +
          '</tr></thead><tbody>' +
          rows.map(rowHtml).join('') +
        '</tbody></table>' +
      '</div>';
    body.querySelectorAll('._sch-view').forEach(b => b.addEventListener('click', () => openInvoice(b.dataset.id)));
    body.querySelectorAll('._sch-send').forEach(b => b.addEventListener('click', () => sendReceipt(b.dataset.id)));
  }

  function rowHtml(s) {
    const isCredit = !!s.is_credit;
    const isInvoice = (s.greitt_med === 'greitt_sidar' || s.greitt_med === 'reikningur');
    const status = isCredit ? '<span style="color:#991b1b;font-size:11px">↩ Kredit</span>'
      : s.paid_at ? '<span style="font-size:10px;font-weight:700;background:#dcfce7;color:#166534;padding:2px 8px;border-radius:99px">✓ Greitt</span>'
      : isInvoice ? '<span style="font-size:10px;font-weight:700;background:#fef3c7;color:#92400e;padding:2px 8px;border-radius:99px">⚠ Ógreitt</span>'
      : '<span style="color:#94a3b8;font-size:11px">—</span>';
    const amt = isCredit ? '-' + fmtKr(Math.abs(+s.samtals || 0)) : fmtKr(+s.samtals || 0);
    return '<tr style="border-bottom:1px solid #f1f5f9">' +
      '<td style="padding:8px 10px;color:#475569;white-space:nowrap">' + esc(fmtDate(s.created_at)) + '</td>' +
      '<td style="padding:8px 10px;font-family:monospace;font-size:11.5px;font-weight:600;color:#0f172a">' + esc(s.num || '') + '</td>' +
      '<td style="padding:8px 10px;font-size:11.5px;color:#475569">' + methodLabel(s.greitt_med) + '</td>' +
      '<td style="padding:8px 10px">' + status + '</td>' +
      '<td style="padding:8px 10px;text-align:right;font-weight:700;color:' + (isCredit ? '#dc2626' : '#0f172a') + ';font-variant-numeric:tabular-nums">' + esc(amt) + '</td>' +
      '<td style="padding:8px 10px;text-align:right;white-space:nowrap">' +
        '<button class="_sch-send" data-id="' + s.id + '" type="button" title="Senda kvittun í tölvupósti" style="padding:4px 8px;background:#fff;color:#0f766e;border:1px solid #99f6e4;border-radius:5px;cursor:pointer;font:inherit;font-size:11px;margin-right:4px">📧</button>' +
        '<button class="_sch-view" data-id="' + s.id + '" type="button" title="Skoða / prenta / vista PDF" style="padding:4px 8px;background:#fff;color:#1d4ed8;border:1px solid #bfdbfe;border-radius:5px;cursor:pointer;font:inherit;font-size:11px">🖨</button>' +
      '</td>' +
    '</tr>';
  }

  async function openInvoice(saleId) {
    const sb = SB();
    if (!sb || !window.SalaInvoice || typeof SalaInvoice.renderFromSale !== 'function') { alert('Reikningsmótið er ekki tiltækt.'); return; }
    const w = window.open('', '_blank', 'width=900,height=1100');
    if (!w) { alert('Vinsamlegast leyfðu sprettiglugga til að prenta.'); return; }
    const r = await sb.from('solur').select('*').eq('id', saleId).single();
    if (r.error || !r.data) { w.close(); alert('Salan fannst ekki.'); return; }
    const sale = r.data;
    let cust = null;
    if (sale.customer_id) {
      const [f, v] = await Promise.all([
        sb.from('fyrirtaeki').select('nafn,kennitala,heimilisfang').eq('id', sale.customer_id).maybeSingle(),
        sb.from('vidskiptavinir').select('nafn,kennitala,heimilisfang').eq('id', sale.customer_id).maybeSingle(),
      ]);
      const norm = s => String(s || '').trim().toLowerCase();
      const sn = norm(sale.customer_nafn);
      if (f.data && norm(f.data.nafn) === sn) cust = f.data;
      else if (v.data && norm(v.data.nafn) === sn) cust = v.data;
      if (!cust) cust = f.data || v.data || null;
    }
    try { SalaInvoice.renderFromSale(w, sale, cust); } catch (e) { alert('Villa: ' + (e.message || e)); }
  }

  async function sendReceipt(saleId) {
    if (window.ReceiptSender && typeof window.ReceiptSender.send === 'function') {
      try { await window.ReceiptSender.send(saleId); return; } catch (_) {}
    }
    if (window.Toast && Toast.show) Toast.show('📧 Bein tölvupóstsending er ekki tengd enn — opna reikninginn til að prenta eða vista sem PDF.');
    openInvoice(saleId);
  }

  setInterval(ensureButton, 700);
  setTimeout(ensureButton, 800);
  window.SalaCustomerHistory = { open, urlFor, queryFor };
  console.log('[patch-253] Sala customer-history v2 installed');
})();
/* === END SALA CUSTOMER HISTORY === */
