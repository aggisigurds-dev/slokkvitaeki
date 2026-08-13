/* === ÚTTEKTARSKÝRSLA v1 ===
 *
 * Generates a printable A4 service report (úttektarskýrsla) from a solur row.
 * Pulls together:
 *   • Sale header (num, date, customer, totals)
 *   • Per-unit detail from verklidur (service performed, status done/broken)
 *   • Field-service uttaeki link (pressure, location, last_insp, next_insp)
 *     — auto-updated by patch 121 to today + 12 mán for done units
 *   • Branding from AppSettings (company logo, contact info, primary color)
 *
 * Usage:
 *   window.UttektarSkyrsla.print(saleId)  // opens print preview window
 *
 * Wired into:
 *   • Bókhalds yfirlit row — "📄 Skýrsla" button next to existing Kredit
 *   • Reikningar modal row — "📄 Skýrsla" button on each row
 */
(() => {
  if (window.__uttektarSkyrslaInstalled) return;
  window.__uttektarSkyrslaInstalled = true;

  function getSB() { return (window.DB && window.DB.sb) || null; }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c =>
      ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }
  function fmtKr(n) { return Math.round(Math.abs(+n || 0)).toLocaleString('is-IS') + ' kr'; }
  function fmtDate(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    if (isNaN(d)) return '—';
    return String(d.getDate()).padStart(2, '0') + '.' +
           String(d.getMonth() + 1).padStart(2, '0') + '.' + d.getFullYear();
  }

  // ── Build the report HTML ────────────────────────────────────────────────
  function buildReportHtml({ sale, lines, uttaekiById, customer, branding }) {
    const b = branding || {};
    const co = customer || {};
    const total = +sale.samtals || 0;
    const ex = +sale.upphaed_an_vsk || 0;
    const vsk = +sale.vsk_upphaed || 0;
    const dateStr = fmtDate(sale.created_at);
    const techName = sale.starfsmadur || '—';
    const num = sale.num || '';

    const doneCount = lines.filter(l => l.status === 'done').length;
    const brokenCount = lines.filter(l => l.status === 'broken').length;
    const otherCount = lines.length - doneCount - brokenCount;

    const serviceColor = status => {
      if (status === 'broken') return '#dc2626';
      if (status === 'done') return '#16a34a';
      return '#64748b';
    };
    const serviceLabel = status => {
      if (status === 'broken') return '✗ Ónýtt';
      if (status === 'done') return '✓ Í lagi';
      return '— Beið';
    };

    const rowsHtml = lines.length ? lines.map(l => {
      const u = l.uttaeki_id && uttaekiById ? uttaekiById[l.uttaeki_id] : null;
      const pressure = u && u.pressure ? esc(String(u.pressure)) + ' bar' : '—';
      const location = u && u.location ? esc(u.location) : '';
      const nextInsp = u && u.next_insp ? fmtDate(u.next_insp) : '—';
      return '<tr>' +
        '<td style="padding:7px 9px;font-family:monospace;font-size:11px">' + esc(l.serial || '—') + '</td>' +
        '<td style="padding:7px 9px;font-size:12px">' + esc(l.type || '—') + (l.size ? ' ' + esc(l.size) : '') +
          (location ? '<div style="font-size:10px;color:#64748b">' + location + '</div>' : '') +
        '</td>' +
        '<td style="padding:7px 9px;font-size:12px">' + esc(l.service || '—') + '</td>' +
        '<td style="padding:7px 9px;font-size:11px;color:' + serviceColor(l.status) + ';font-weight:700;white-space:nowrap">' +
          serviceLabel(l.status) + '</td>' +
        '<td style="padding:7px 9px;font-size:11px;text-align:right;font-variant-numeric:tabular-nums">' + pressure + '</td>' +
        '<td style="padding:7px 9px;font-size:11px;text-align:center">' + nextInsp + '</td>' +
      '</tr>';
    }).join('') : '<tr><td colspan="6" style="padding:18px;text-align:center;color:#94a3b8">Engin tæki á þessari sölu</td></tr>';

    const summaryChips = [
      doneCount ? '<span style="background:#dcfce7;color:#166534;padding:3px 10px;border-radius:99px;font-size:11px;font-weight:700">' + doneCount + ' í lagi</span>' : '',
      brokenCount ? '<span style="background:#fee2e2;color:#991b1b;padding:3px 10px;border-radius:99px;font-size:11px;font-weight:700;margin-left:6px">' + brokenCount + ' ónýtt</span>' : '',
      otherCount ? '<span style="background:#f3f4f6;color:#475569;padding:3px 10px;border-radius:99px;font-size:11px;font-weight:700;margin-left:6px">' + otherCount + ' ófullnað</span>' : ''
    ].filter(Boolean).join('');

    const primary = (b.primary_color || '#C93C1D').trim();
    const coLine1 = (b.address1 || '').trim();
    const coLine2 = (b.address2 || '').trim();
    const phone = (b.phone || '').trim();
    const email = (b.email || '').trim();
    const ktCo = (b.kennitala || '').trim();
    const vskNr = (b.vsk_nr || '').trim();
    const compName = (b.company_name || 'Slökkvitæki ehf').trim();

    return '' +
      '<!DOCTYPE html><html lang="is"><head><meta charset="utf-8">' +
      '<title>Úttektarskýrsla — ' + esc(num) + '</title>' +
      '<style>' +
        '@page { size: A4; margin: 14mm; }' +
        'html, body { margin:0; padding:0; font-family: Arial, Helvetica, sans-serif; color:#0f172a; background:#fff; }' +
        '.page { padding: 6mm 0; }' +
        'table { width:100%; border-collapse: collapse; }' +
        'th { background:#f8fafc; padding:7px 9px; text-align:left; font-size:10px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:.04em; border-bottom:1px solid #e2e8f0; }' +
        'tr:nth-child(even) td { background:#fafafa; }' +
        '.btn-print { padding:9px 18px; background:' + primary + '; color:#fff; border:none; border-radius:8px; cursor:pointer; font-size:13px; font-weight:700 }' +
        '.btn-close { padding:9px 18px; background:#fff; border:1px solid #cbd5e1; border-radius:8px; cursor:pointer; font-size:13px; color:#475569 }' +
        '@media print { .no-print { display:none !important; } .page { padding:0 } }' +
      '</style></head><body><div class="page">' +
        // 2026-05-10 (L4): inline header buttons removed — the modal that
        // hosts this iframe has its own Loka/Prenta buttons. Avoids duplicate
        // controls when shown in-page; legacy `window.close()` handlers
        // didn't work inside iframe anyway.
        // Header
        '<div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid ' + primary + ';padding-bottom:10px;margin-bottom:18px">' +
          '<div>' +
            '<div style="font-size:22px;font-weight:800;color:#0f172a;letter-spacing:-0.01em">' + esc(compName) + '</div>' +
            (b.tagline ? '<div style="font-size:11px;color:#64748b;margin-top:2px">' + esc(b.tagline) + '</div>' : '') +
            '<div style="font-size:11px;color:#475569;margin-top:8px;line-height:1.4">' +
              (coLine1 ? esc(coLine1) + (coLine2 ? ', ' + esc(coLine2) : '') + '<br>' : '') +
              (phone ? 'Sími ' + esc(phone) : '') +
              (phone && email ? ' · ' : '') +
              (email ? esc(email) : '') +
              (ktCo ? '<br>kt. ' + esc(ktCo) : '') +
              (vskNr ? ' · vsk-nr. ' + esc(vskNr) : '') +
            '</div>' +
          '</div>' +
          '<div style="text-align:right">' +
            '<div style="display:inline-block;background:' + primary + ';color:#fff;padding:3px 12px;border-radius:6px;font-size:11px;font-weight:700;letter-spacing:.05em;text-transform:uppercase">Úttektarskýrsla</div>' +
            '<div style="font-size:18px;font-weight:800;margin-top:8px;font-family:monospace;color:#0f172a">' + esc(num) + '</div>' +
            '<div style="font-size:11px;color:#64748b;margin-top:2px">' + esc(dateStr) + '</div>' +
            (techName !== '—' ? '<div style="font-size:11px;color:#475569;margin-top:4px">Starfsmaður: <strong>' + esc(techName) + '</strong></div>' : '') +
          '</div>' +
        '</div>' +
        // Customer block
        '<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:11px 14px;margin-bottom:14px">' +
          '<div style="font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.05em">Viðskiptavinur</div>' +
          '<div style="font-size:14px;font-weight:700;color:#0f172a;margin-top:3px">' + esc(sale.customer_nafn || co.nafn || '—') + '</div>' +
          '<div style="font-size:11px;color:#475569;margin-top:3px;line-height:1.5">' +
            (co.kennitala ? 'kt. ' + esc(co.kennitala) : '') +
            (co.simi ? (co.kennitala ? ' · ' : '') + 'sími ' + esc(co.simi) : '') +
            (co.netfang ? '<br>' + esc(co.netfang) : '') +
            (co.heimilisfang ? '<br>' + esc(co.heimilisfang) : '') +
          '</div>' +
        '</div>' +
        // Summary chips
        '<div style="margin-bottom:10px;display:flex;align-items:center;justify-content:space-between">' +
          '<div style="font-size:13px;font-weight:700;color:#0f172a">Tæki sem voru þjónustuð (' + lines.length + ')</div>' +
          '<div>' + summaryChips + '</div>' +
        '</div>' +
        // Equipment table
        '<table style="margin-bottom:18px;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden">' +
          '<thead><tr>' +
            '<th>Raðnúmer</th>' +
            '<th>Tegund / staðsetning</th>' +
            '<th>Þjónusta</th>' +
            '<th>Staða</th>' +
            '<th style="text-align:right">Þrýstingur</th>' +
            '<th style="text-align:center">Næsta skoðun</th>' +
          '</tr></thead>' +
          '<tbody>' + rowsHtml + '</tbody>' +
        '</table>' +
        // Totals
        '<div style="display:flex;justify-content:flex-end;margin-bottom:24px">' +
          '<div style="min-width:240px;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden">' +
            '<div style="padding:8px 12px;background:#f8fafc;border-bottom:1px solid #e2e8f0;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase">Reikningur</div>' +
            '<div style="padding:6px 12px;display:flex;justify-content:space-between;font-size:12px;color:#475569"><span>Án VSK</span><span style="font-variant-numeric:tabular-nums">' + esc(fmtKr(ex)) + '</span></div>' +
            '<div style="padding:6px 12px;display:flex;justify-content:space-between;font-size:12px;color:#475569"><span>VSK</span><span style="font-variant-numeric:tabular-nums">' + esc(fmtKr(vsk)) + '</span></div>' +
            '<div style="padding:9px 12px;background:#f8fafc;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;font-size:14px;font-weight:800;color:#0f172a"><span>Samtals</span><span style="font-variant-numeric:tabular-nums">' + esc(fmtKr(total)) + '</span></div>' +
          '</div>' +
        '</div>' +
        // Sign-off
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:30px;margin-bottom:18px">' +
          '<div>' +
            '<div style="border-bottom:1px solid #0f172a;height:32px"></div>' +
            '<div style="font-size:11px;color:#64748b;margin-top:4px">Undirskrift starfsmanns</div>' +
          '</div>' +
          '<div>' +
            '<div style="border-bottom:1px solid #0f172a;height:32px"></div>' +
            '<div style="font-size:11px;color:#64748b;margin-top:4px">Undirskrift viðskiptavinar (móttekið)</div>' +
          '</div>' +
        '</div>' +
        // Footer
        '<div style="border-top:1px solid #e2e8f0;padding-top:10px;font-size:10px;color:#94a3b8;text-align:center">' +
          esc(compName) +
          (phone ? ' · ' + esc(phone) : '') +
          (email ? ' · ' + esc(email) : '') +
          ' · Úttektarskýrsla prentuð ' + fmtDate(new Date().toISOString()) +
        '</div>' +
      '</div></body></html>';
  }

  // ── Fetch + open ─────────────────────────────────────────────────────────
  async function printReport(saleId) {
    const SB = getSB();
    if (!SB) { alert('Engin gagnabankatenging'); return; }

    // Fetch sale
    const sr = await SB.from('solur').select('*').eq('id', saleId).single();
    if (sr.error || !sr.data) {
      alert('Sala fannst ekki: ' + (sr.error ? sr.error.message : ''));
      return;
    }
    const sale = sr.data;

    // Fetch verklidur for this sale's parent verkbeiðnir.
    // Sale.num like "R-000044", verkbeiðnir num like "R-000044-V1".
    const parentNum = String(sale.num || '');
    let lines = [];
    let uttaekiById = {};
    if (parentNum) {
      const jobsRes = await SB.from('verkbeidnir').select('id,num').like('num', parentNum + '%');
      const jobs = (jobsRes.data || []).filter(j => {
        const n = j.num || '';
        return n === parentNum || /^.+-V\d+$/.test(n) && n.startsWith(parentNum);
      });
      const jobIds = jobs.map(j => j.id);
      if (jobIds.length) {
        const linesRes = await SB.from('verklidur').select('*').in('job_id', jobIds);
        lines = linesRes.data || [];
        // Fetch linked uttaeki
        const uttaekiIds = lines.map(l => l.uttaeki_id).filter(Boolean);
        if (uttaekiIds.length) {
          const uRes = await SB.from('uttaeki').select('*').in('id', uttaekiIds);
          (uRes.data || []).forEach(u => { uttaekiById[u.id] = u; });
        }
      }
    }
    // Fallback: if no verklidur lines, build pseudo-rows from sale.linur
    if (!lines.length && Array.isArray(sale.linur)) {
      lines = sale.linur.map((l, i) => ({
        id: 'pseudo-' + i,
        serial: '—',
        type: l.desc || '—',
        size: '',
        service: l.qty + '× á ' + fmtKr(l.unit_price_ex_vat || 0),
        status: 'done',
        uttaeki_id: null
      }));
    }

    // Fetch customer info
    let customer = {};
    if (sale.customer_id) {
      const [cFy, cVi] = await Promise.all([
        SB.from('fyrirtaeki').select('id,nafn,kennitala,simi,netfang,heimilisfang').eq('id', sale.customer_id).maybeSingle(),
        SB.from('vidskiptavinir').select('id,nafn,kennitala,simi,netfang,heimilisfang').eq('id', sale.customer_id).maybeSingle()
      ]);
      customer = (cFy && cFy.data) || (cVi && cVi.data) || {};
    }

    // Branding from AppSettings
    const branding = (window.AppSettings && window.AppSettings.path('branding')) || {};

    const html = buildReportHtml({ sale, lines, uttaekiById, customer, branding });
    // 2026-05-10 (L4 fix): Render the skýrsla as an inline modal with an
    // iframe (srcdoc) instead of `window.open`. Popup blockers no longer
    // hide the report. Print uses the iframe's contentWindow.print() so the
    // user prints just the skýrsla, not the whole app.
    showReportModal(html);
  }

  function showReportModal(reportHtml) {
    const existing = document.getElementById('_us-modal');
    if (existing) existing.remove();
    const dlg = document.createElement('div');
    dlg.id = '_us-modal';
    dlg.style.cssText =
      'position:fixed;inset:0;z-index:100050;background:rgba(15,23,42,0.7);' +
      'display:flex;align-items:center;justify-content:center;padding:18px';
    dlg.innerHTML =
      '<div style="background:#fff;border-radius:14px;box-shadow:0 24px 64px rgba(0,0,0,0.4);' +
        'width:min(900px,calc(100vw - 32px));height:calc(100vh - 60px);' +
        'display:flex;flex-direction:column;overflow:hidden">' +
        '<div style="padding:11px 16px;border-bottom:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center;background:#f8fafc">' +
          '<div style="font-size:13px;font-weight:700;color:#0f172a">📄 Úttektarskýrsla</div>' +
          '<div style="display:flex;gap:8px">' +
            '<button id="_us-print" type="button" style="padding:7px 14px;background:#0d6efd;color:#fff;border:none;border-radius:7px;cursor:pointer;font:inherit;font-size:12px;font-weight:700">🖨 Prenta</button>' +
            '<button id="_us-close" type="button" style="padding:7px 14px;background:#fff;border:1px solid #cbd5e1;border-radius:7px;cursor:pointer;font:inherit;font-size:12px;color:#475569">✕ Loka</button>' +
          '</div>' +
        '</div>' +
        '<iframe id="_us-frame" style="flex:1;border:none;background:#fff" sandbox="allow-same-origin allow-modals allow-scripts"></iframe>' +
      '</div>';
    document.body.appendChild(dlg);
    const frame = dlg.querySelector('#_us-frame');
    frame.srcdoc = reportHtml;
    function close() { dlg.remove(); }
    dlg.querySelector('#_us-close').addEventListener('click', close);
    dlg.addEventListener('click', e => { if (e.target === dlg) close(); });
    document.addEventListener('keydown', function escHandler(e) {
      if (e.key === 'Escape') {
        close();
        document.removeEventListener('keydown', escHandler);
      }
    });
    dlg.querySelector('#_us-print').addEventListener('click', () => {
      try {
        frame.contentWindow.focus();
        frame.contentWindow.print();
      } catch (e) {
        alert('Get ekki prentað: ' + (e.message || e));
      }
    });
  }

  // ── Inject "📄 Skýrsla" buttons ──────────────────────────────────────────
  // Strategy: event delegation on document. Any button with class
  // `_us-btn[data-us-sale]` triggers printReport. Bókhalds yfirlit and
  // Reikningar modal both add their own buttons via existing renderers
  // (we add a small delegation handler here).

  document.addEventListener('click', e => {
    const btn = e.target.closest && e.target.closest('._us-btn[data-us-sale]');
    if (!btn) return;
    e.stopPropagation();
    const id = btn.dataset.usSale;
    if (id) printReport(id);
  });

  // Inject buttons into Bókhalds yfirlit rows alongside Kredit (patch 26).
  // Same pattern as patch 26's `injectCreditButtonsIntoRows`.
  function injectIntoBokhalds() {
    const tbody = document.getElementById('by-tbody');
    if (!tbody) return;
    tbody.querySelectorAll('tr.by-sale-row:not([data-us-done])').forEach(tr => {
      const id = tr.dataset.id;
      if (!id) return;
      tr.dataset.usDone = '1';
      const lastTd = tr.querySelector('td:last-child');
      if (!lastTd) return;
      if (lastTd.querySelector('._us-btn')) return;
      const btn = document.createElement('button');
      btn.className = '_us-btn';
      btn.dataset.usSale = id;
      btn.title = 'Prenta úttektarskýrsla';
      btn.textContent = '📄 Skýrsla';
      btn.style.cssText = 'padding:3px 9px;background:#eff6ff;border:1px solid #bfdbfe;color:#1e40af;border-radius:6px;font:inherit;font-size:11px;font-weight:600;cursor:pointer;white-space:nowrap;margin-left:4px';
      // 2026-05-10 (B6 fix): Direct click handler with stopPropagation. The
      // row-level click handler on `tr.by-sale-row` (patch 11) was capturing
      // the bubbling click and toggling row expansion BEFORE the document-
      // level delegation listener could fire — so the report never opened.
      btn.addEventListener('click', e => {
        e.stopPropagation();
        e.preventDefault();
        printReport(id);
      });
      lastTd.appendChild(btn);
    });
  }
  function watchBokhalds() {
    const tbody = document.getElementById('by-tbody');
    if (tbody && !tbody.dataset.usObserved) {
      tbody.dataset.usObserved = '1';
      new MutationObserver(injectIntoBokhalds).observe(tbody, { childList: true, subtree: true });
      injectIntoBokhalds();
    }
  }
  new MutationObserver(watchBokhalds).observe(document.body, { childList: true, subtree: true });
  setTimeout(watchBokhalds, 1000);
  setTimeout(watchBokhalds, 3000);

  // Inject into Reikningar modal too. The modal's invTbl already renders
  // mk-paid + mk-credit buttons; we follow the pattern by listening for
  // when `#reik-master-modal` opens and injecting buttons.
  function injectIntoReikningar() {
    const modal = document.getElementById('reik-master-modal');
    if (!modal || modal.dataset.usDone) return;
    const rows = modal.querySelectorAll('tr');
    if (!rows.length) return; // table not rendered yet
    modal.dataset.usDone = '1';
    rows.forEach(tr => {
      const mkBtn = tr.querySelector('.mk-paid');
      if (!mkBtn || !mkBtn.dataset.id) return;
      const id = mkBtn.dataset.id;
      const td = mkBtn.parentElement;
      if (!td || td.querySelector('._us-btn')) return;
      const b = document.createElement('button');
      b.className = '_us-btn';
      b.dataset.usSale = id;
      b.title = 'Prenta úttektarskýrsla';
      b.textContent = '📄 Skýrsla';
      b.style.cssText = 'padding:6px 12px;border:1px solid #bfdbfe;border-radius:6px;background:#eff6ff;color:#1e40af;font-size:12px;font-weight:600;cursor:pointer;margin-left:6px';
      td.appendChild(b);
    });
  }
  new MutationObserver(injectIntoReikningar).observe(document.body, { childList: true, subtree: true });

  // Public API
  window.UttektarSkyrsla = { print: printReport };

  console.log('[uttektarskyrsla] installed');
})();
/* === END ÚTTEKTARSKÝRSLA === */
