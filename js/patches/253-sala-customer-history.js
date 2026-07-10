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
      btn.textContent = '🧾 Fyrri viðskipti';
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
            '<div style="font-size:15px;font-weight:700">🧾 Fyrri viðskipti — ' + esc(idty.nafn || 'Viðskiptavinur') + '</div>' +
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
      .select('id,num,customer_nafn,customer_id,customer_kt,samtals,greitt_med,created_at,paid_at,is_credit,dk_invoice_id')
      .or(parts.join(','))
      .order('created_at', { ascending: false })
      .limit(500);
    if (r.error) { body.innerHTML = '<div style="padding:30px;text-align:center;color:#dc2626">Villa: ' + esc(r.error.message) + '</div>'; return; }
    const rows = r.data || [];

    // ── Payday-kröfur (2026-07-10, ósk Agnars): reikningar stofnaðir BEINT í
    // Payday (mánaðaruppgjör, bókari) eiga enga solur-röð — kúnnar hringja og
    // nefna PAYDAY-númerið og ekkert fannst. Spegillinn payday_invoices_slokk
    // (fylltur af /api/payday-pull-slokk, uppfærður daglega í payday-sync-cron)
    // gerir þá leitanlega hér. Sölur sem fóru gegnum payday-push (dk_invoice_id
    // = Payday id/númer) fá PD-númerið Á SÍNA röð í stað þess að tvíbirtast.
    let pdRows = [];
    if (ktd.length === 10 && ktd !== '9999999999') {
      try {
        const pr = await sb.from('payday_invoices_slokk')
          .select('payday_id,number,customer_name,amount_total,created_date,due_date,paid_date,status,reference,description')
          .eq('kt', ktd)
          .order('created_date', { ascending: false })
          .limit(300);
        if (!pr.error) pdRows = pr.data || [];
      } catch (_) {}
    }
    // Tengja PD-númer við sölur sem eiga þau: payday-push skrifar dk_invoice_id,
    // og Payday-`reference` ber R-númerið (sannreynt live 2026-07-10 — t.d.
    // PD 118 með reference "R-000454") svo num↔reference tengir líka kröfur
    // sem bókarinn stofnaði með R-númeri í tilvísun.
    const pdByKey = new Map(), pdByRef = new Map();
    pdRows.forEach(p => {
      if (p.payday_id) pdByKey.set(String(p.payday_id).trim(), p);
      if (p.number) pdByKey.set(String(p.number).trim(), p);
      const ref = String(p.reference || '').trim().toUpperCase();
      if (ref) pdByRef.set(ref, p);
    });
    const linkedPd = new Set();
    rows.forEach(s => {
      const k = s.dk_invoice_id != null ? String(s.dk_invoice_id).trim() : '';
      let p = (k && pdByKey.get(k)) || null;
      if (!p && s.num) p = pdByRef.get(String(s.num).trim().toUpperCase()) || null;
      if (p) { s._pd_number = p.number || p.payday_id; linkedPd.add(p); }
    });
    const pdOnly = pdRows.filter(p => !linkedPd.has(p));

    if (!rows.length && !pdOnly.length) { body.innerHTML = '<div style="padding:34px;text-align:center;color:#94a3b8;font-style:italic">Engin fyrri kaup fundust hjá þessum viðskiptavini.</div>'; return; }

    // Fléttað í eina tímaröð (nýjast efst).
    const merged = rows.map(s => ({ t: s.created_at || '', h: rowHtml(s) }))
      .concat(pdOnly.map(p => ({ t: (p.created_date || '') + 'T00:00:00', h: pdRowHtml(p) })));
    merged.sort((a, b) => String(b.t).localeCompare(String(a.t)));

    const total = rows.filter(s => !s.is_credit).reduce((a, s) => a + (+s.samtals || 0), 0);
    const pdTotal = pdOnly.filter(p => !/credit|cancel/i.test(p.status || '')).reduce((a, p) => a + (+p.amount_total || 0), 0);
    body.innerHTML =
      '<div style="font-size:12px;color:#475569;margin-bottom:10px">' + rows.length + ' færslur · samtals ' + esc(fmtKr(total)) +
        (pdOnly.length ? ' &nbsp;·&nbsp; <span style="color:#6d28d9;font-weight:600">+ ' + pdOnly.length + ' Payday-kröfur · ' + esc(fmtKr(pdTotal)) + '</span>' : '') +
      '</div>' +
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
          merged.map(x => x.h).join('') +
        '</tbody></table>' +
      '</div>' +
      '<div id="_sch-docs"><div style="padding:16px 4px;color:#94a3b8;font-size:12px">Sæki skjöl…</div></div>';
    body.querySelectorAll('._sch-view').forEach(b => b.addEventListener('click', () => openInvoice(b.dataset.id)));
    body.querySelectorAll('._sch-send').forEach(b => b.addEventListener('click', () => sendReceipt(b.dataset.id)));
    loadDocs(idty, body).catch(() => { const h = body.querySelector('#_sch-docs'); if (h) h.innerHTML = ''; });
  }

  // ── Skjöl (úttektarskýrslur + reikninga-PDF) — 2026-07-09 (ósk Agnars):
  // þegar kúnninn er valinn í Sölu á að sjást ÖLL sagan hans, líka skjölin.
  // Tveir brunnar: customer_documents (Drive-skráin, per staðsetningu/kt) og
  // CompanyAttachments (viðhengin í Supabase, patch 111/233 sjálfvirku PDF-in).
  async function loadDocs(idty, body) {
    const sb = SB();
    const holder = body.querySelector('#_sch-docs');
    if (!sb || !holder) return;
    const curYear = new Date().getFullYear();
    const ktd = ktDigits(idty.kt);

    // Finna allar fyrirtækja-raðir kúnnans (kt getur átt margar staðsettningar).
    const coIds = [];
    const baseIds = [];
    if (idty.id && idty.source === 'fyrirtaeki') coIds.push(+idty.id);
    if (ktd.length === 10 && ktd !== '9999999999') {
      const d = ktDashed(ktd);
      const f = await sb.from('fyrirtaeki').select('id,customer_base_id')
        .in('kennitala', d !== ktd ? [ktd, d] : [ktd]).is('deleted_at', null);
      (f.data || []).forEach(r => {
        if (!coIds.includes(+r.id)) coIds.push(+r.id);
        if (r.customer_base_id != null && !baseIds.includes(r.customer_base_id)) baseIds.push(r.customer_base_id);
      });
    }
    if (!coIds.length && !baseIds.length) { holder.innerHTML = ''; return; }

    // 1) Drive-skráin (customer_documents)
    let docs = [];
    try {
      const ors = [];
      if (coIds.length) ors.push('fyrirtaeki_id.in.(' + coIds.join(',') + ')');
      if (baseIds.length) ors.push('customer_base_id.in.(' + baseIds.join(',') + ')');
      const r = await sb.from('customer_documents')
        .select('id,doc_type,year,drive_file_id,invoice_number,doc_date,amount,fyrirtaeki_id')
        .or(ors.join(','))
        .in('doc_type', ['uttektarskyrsla', 'reikningur']);
      docs = (r.data || []).filter(x => x.drive_file_id && String(x.drive_file_id).indexOf('sb:') !== 0);
    } catch (_) {}

    // 2) Viðhengin (CompanyAttachments — sjálfvirku PDF-in úr patch 233 o.fl.)
    const atts = [];
    try {
      if (window.CompanyAttachments && CompanyAttachments.list) {
        coIds.forEach(id => (CompanyAttachments.list(id) || []).forEach(f => atts.push({ coId: id, f })));
      }
    } catch (_) {}

    const attYear = a => { const y = a.f && a.f.year; if (y && y !== '0') return String(y); const m = String((a.f && a.f.name) || '').match(/\b(20[2-3][0-9])\b/); return m ? m[1] : ''; };
    const docKind = a => { const k = a.f && a.f.kind; if (k === 'skyrsla' || k === 'reikningur') return k; const n = String((a.f && a.f.name) || '').toLowerCase(); if (/reikning|\br-?\d/.test(n)) return 'reikningur'; if (/úttekt|uttekt|skýrsl|skyrsl/.test(n)) return 'skyrsla'; return 'annad'; };

    let showAll = false;
    function render() {
      const yStr = String(curYear);
      const d2 = showAll ? docs : docs.filter(x => String(x.year || '') === yStr);
      const a2 = showAll ? atts : atts.filter(a => attYear(a) === yStr);
      const otherCount = (docs.length - docs.filter(x => String(x.year || '') === yStr).length)
                       + (atts.length - atts.filter(a => attYear(a) === yStr).length);
      const items = [];
      d2.forEach(x => items.push({
        sort: (x.doc_type === 'uttektarskyrsla' ? '0' : '1') + (x.year || ''),
        html: docRow('🗂', x.doc_type === 'uttektarskyrsla' ? 'Úttektarskýrsla' : (x.invoice_number ? 'Reikningur ' + esc(x.invoice_number) : 'Reikningur'),
          (x.year || '') + (x.doc_date ? ' · ' + esc(fmtDate(x.doc_date)) : '') + (x.amount ? ' · ' + esc(fmtKr(x.amount)) : '') + ' · Drive',
          '_sch-drive', x.drive_file_id)
      }));
      a2.forEach(a => items.push({
        sort: (docKind(a) === 'skyrsla' ? '0' : docKind(a) === 'reikningur' ? '1' : '2') + attYear(a),
        html: docRow(docKind(a) === 'skyrsla' ? '📄' : docKind(a) === 'reikningur' ? '🧾' : '📎',
          esc((a.f && a.f.name) || 'Skjal'), (attYear(a) || '') + ' · Viðhengi', '_sch-att', a.coId + '|' + ((a.f && a.f.path) || ''))
      }));
      items.sort((x, y) => x.sort.localeCompare(y.sort));
      holder.innerHTML =
        '<div style="display:flex;justify-content:space-between;align-items:center;margin:16px 0 8px">' +
          '<div style="font-size:12px;font-weight:700;color:#0f172a">📄 Skjöl ' + (showAll ? '(öll ár)' : yStr) + ' — úttektarskýrslur & reikningar</div>' +
          (otherCount > 0 || showAll ? '<button id="_sch-yrs" type="button" style="background:none;border:none;color:#1d4ed8;font-size:11.5px;cursor:pointer;text-decoration:underline;padding:0">' + (showAll ? 'Sýna bara ' + yStr : 'Sýna öll ár (+' + otherCount + ')') + '</button>' : '') +
        '</div>' +
        (items.length
          ? '<div style="background:#fff;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden">' + items.map(i => i.html).join('') + '</div>'
          : '<div style="background:#fff;border:1px dashed #e2e8f0;border-radius:10px;padding:16px;text-align:center;color:#94a3b8;font-size:12px;font-style:italic">Engin skjöl skráð fyrir ' + yStr + '.</div>');
      holder.querySelector('#_sch-yrs')?.addEventListener('click', () => { showAll = !showAll; render(); });
      holder.querySelectorAll('._sch-drive').forEach(b => b.addEventListener('click', () =>
        window.open('https://drive.google.com/file/d/' + encodeURIComponent(b.dataset.v) + '/view', '_blank')));
      holder.querySelectorAll('._sch-att').forEach(b => b.addEventListener('click', () => {
        const [coId, path] = String(b.dataset.v).split('|');
        const f = ((window.CompanyAttachments && CompanyAttachments.list && CompanyAttachments.list(coId)) || []).find(x => x.path === path);
        if (f && window.CompanyAttachments.openPreview) CompanyAttachments.openPreview(f);
      }));
    }
    function docRow(icon, label, sub, cls, val) {
      return '<div style="display:flex;align-items:center;gap:10px;padding:8px 12px;border-bottom:1px solid #f1f5f9">' +
        '<span style="font-size:16px">' + icon + '</span>' +
        '<div style="flex:1;min-width:0"><div style="font-size:12.5px;font-weight:600;color:#0f172a;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + label + '</div>' +
        '<div style="font-size:10.5px;color:#94a3b8">' + sub + '</div></div>' +
        '<button class="' + cls + '" data-v="' + esc(String(val)) + '" type="button" style="padding:4px 10px;background:#fff;color:#1d4ed8;border:1px solid #bfdbfe;border-radius:5px;cursor:pointer;font:inherit;font-size:11px;white-space:nowrap">Opna</button>' +
      '</div>';
    }
    render();
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
      '<td style="padding:8px 10px;font-family:monospace;font-size:11.5px;font-weight:600;color:#0f172a">' + esc(s.num || '') +
        (s._pd_number ? '<span title="Payday-númerið sem kúnninn sér á kröfunni" style="display:inline-block;margin-left:6px;padding:1px 6px;background:#f5f3ff;color:#6d28d9;border:1px solid #ddd6fe;border-radius:99px;font-size:10px;font-weight:700">PD ' + esc(s._pd_number) + '</span>' : '') +
      '</td>' +
      '<td style="padding:8px 10px;font-size:11.5px;color:#475569">' + methodLabel(s.greitt_med) + '</td>' +
      '<td style="padding:8px 10px">' + status + '</td>' +
      '<td style="padding:8px 10px;text-align:right;font-weight:700;color:' + (isCredit ? '#dc2626' : '#0f172a') + ';font-variant-numeric:tabular-nums">' + esc(amt) + '</td>' +
      '<td style="padding:8px 10px;text-align:right;white-space:nowrap">' +
        '<button class="_sch-send" data-id="' + s.id + '" type="button" title="Senda kvittun í tölvupósti" style="padding:4px 8px;background:#fff;color:#0f766e;border:1px solid #99f6e4;border-radius:5px;cursor:pointer;font:inherit;font-size:11px;margin-right:4px">📧</button>' +
        '<button class="_sch-view" data-id="' + s.id + '" type="button" title="Skoða / prenta / vista PDF" style="padding:4px 8px;background:#fff;color:#1d4ed8;border:1px solid #bfdbfe;border-radius:5px;cursor:pointer;font:inherit;font-size:11px">🖨</button>' +
      '</td>' +
    '</tr>';
  }

  // Payday-krafa án solur-raðar (stofnuð beint í Payday) — sýnd með PAYDAY-
  // númerinu sem kúnninn nefnir í síma. Engin PDF-aðgerð hér (skjalið býr í
  // Payday); tooltip ber tilvísun/lýsingu ef til.
  function pdRowHtml(p) {
    const st = String(p.status || '').toUpperCase();
    const status = /PAID/.test(st) || p.paid_date
        ? '<span style="font-size:10px;font-weight:700;background:#dcfce7;color:#166534;padding:2px 8px;border-radius:99px">✓ Greitt</span>'
      : /CREDIT/.test(st) ? '<span style="color:#991b1b;font-size:11px">↩ Kredit</span>'
      : /CANCEL/.test(st) ? '<span style="font-size:10px;font-weight:700;background:#f1f5f9;color:#64748b;padding:2px 8px;border-radius:99px">Ógilt</span>'
      : /DRAFT|DRÖG/.test(st) ? '<span style="font-size:10px;font-weight:700;background:#e0e7ff;color:#3730a3;padding:2px 8px;border-radius:99px">Drög</span>'
      : '<span style="font-size:10px;font-weight:700;background:#fef3c7;color:#92400e;padding:2px 8px;border-radius:99px">⚠ Ógreitt</span>';
    const amt = +p.amount_total || 0;
    const tip = [p.reference, p.description].filter(Boolean).join(' · ');
    return '<tr style="border-bottom:1px solid #f1f5f9;background:#fdfcff"' + (tip ? ' title="' + esc(tip) + '"' : '') + '>' +
      '<td style="padding:8px 10px;color:#475569;white-space:nowrap">' + esc(fmtDate(p.created_date)) + '</td>' +
      '<td style="padding:8px 10px;font-family:monospace;font-size:11.5px;font-weight:600;color:#6d28d9">PD ' + esc(p.number || p.payday_id || '') +
        '<span style="display:inline-block;margin-left:6px;padding:1px 6px;background:#f5f3ff;color:#6d28d9;border:1px solid #ddd6fe;border-radius:99px;font-size:10px;font-weight:700">Payday</span></td>' +
      '<td style="padding:8px 10px;font-size:11.5px;color:#475569">🏦 Payday-krafa' + (p.due_date ? ' · gjd. ' + esc(fmtDate(p.due_date)) : '') + '</td>' +
      '<td style="padding:8px 10px">' + status + '</td>' +
      '<td style="padding:8px 10px;text-align:right;font-weight:700;color:' + (amt < 0 ? '#dc2626' : '#0f172a') + ';font-variant-numeric:tabular-nums">' + esc(fmtKr(amt)) + '</td>' +
      '<td style="padding:8px 10px"></td>' +
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
