/* === COMPANY INSPECTION REPORT v1 ===
 *
 * Generates a printable A4 "úttektarskýrsla" for a company's upcoming
 * service visit. Pulls:
 *   • Company info (nafn, kt, heimilisfang, simi, netfang) from fyrirtaeki
 *   • Planned-service table from the rendered _ctc-section (patch 129)
 *   • Athugasemd from tripState.notes
 *   • Skoðunaraðili from tripState.skodunaradili
 *
 * Triggered by the "📄 Búa til úttektarskýrslu" button injected into the
 * green Heildarkostnaður section by patch 129.
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

  const MONTHS = ['Janúar','Febrúar','Mars','Apríl','Maí','Júní','Júlí','Ágúst','September','Október','Nóvember','Desember'];

  // Inline SVG logo — "Slökkvitæki Brunahólf" wordmark with the extinguisher
  // circle icon. Kept inline so we don't need a separate asset file.
  const LOGO_SVG =
    '<svg width="320" height="80" viewBox="0 0 320 80" xmlns="http://www.w3.org/2000/svg">' +
      '<circle cx="38" cy="40" r="36" fill="#000"/>' +
      // Stylised fire-extinguisher silhouette
      '<g fill="#fff" transform="translate(38,40)">' +
        '<rect x="-11" y="-12" width="22" height="28" rx="3"/>' +
        '<rect x="-4" y="-19" width="8" height="7" rx="1"/>' +
        '<rect x="-9" y="-23" width="18" height="5" rx="1.5"/>' +
        '<path d="M-2 -22 L-9 -28 L-11 -26 L-4 -20 Z" />' +
        '<circle cx="0" cy="2" r="3" fill="#000"/>' +
      '</g>' +
      '<text x="92" y="36" font-family="Georgia, &quot;Times New Roman&quot;, serif" font-size="26" font-weight="700" fill="#000">Slökkvitæki</text>' +
      '<text x="92" y="68" font-family="Georgia, &quot;Times New Roman&quot;, serif" font-size="26" font-weight="700" fill="#000">Brunahólf</text>' +
    '</svg>';

  function loadTripState(coId) {
    try { return JSON.parse(localStorage.getItem('slokk_trip_' + coId) || '{}'); }
    catch (_) { return {}; }
  }

  // ── Read the already-rendered cost table from _ctc-section ──────────────
  // Avoids duplicating patch 129's product-matching logic — we just scrape
  // the visible rows + totals.
  function extractRows() {
    const section = document.getElementById('_ctc-section');
    if (!section) return [];
    const trs = section.querySelectorAll('table tbody tr');
    const rows = [];
    trs.forEach(tr => {
      const tds = tr.querySelectorAll('td');
      if (tds.length < 6) return;
      // First td has "Type / Size" + a sub-line with the product name.
      // Read them separately so the report can show them on two lines too.
      const firstTd = tds[0];
      const sub = firstTd.querySelector('div');
      const subText = sub ? sub.textContent.trim() : '';
      const mainText = sub
        ? firstTd.firstChild && firstTd.firstChild.textContent
          ? firstTd.firstChild.textContent.trim()
          : firstTd.textContent.replace(subText, '').trim()
        : firstTd.textContent.trim();
      rows.push({
        main: mainText,
        sub: subText,
        count: tds[1].textContent.trim(),
        kind: tds[2].textContent.trim(),
        unitPrice: tds[3].textContent.replace(/\s+/g, ' ').trim(),
        vskPct: tds[4].textContent.trim(),
        subTotal: tds[5].textContent.trim()
      });
    });
    return rows;
  }
  function extractTotals() {
    const section = document.getElementById('_ctc-section');
    if (!section) return { ex: '', vsk: '', inc: '' };
    const tfoot = section.querySelector('tfoot');
    if (!tfoot) return { ex: '', vsk: '', inc: '' };
    const trs = tfoot.querySelectorAll('tr');
    const pick = i => {
      if (!trs[i]) return '';
      const tds = trs[i].querySelectorAll('td');
      return tds.length ? tds[tds.length - 1].textContent.trim() : '';
    };
    return { ex: pick(0), vsk: pick(1), inc: pick(2) };
  }

  // ── Open report ─────────────────────────────────────────────────────────
  async function openReport(coId) {
    if (!coId) { alert('Ekkert fyrirtæki valið'); return; }
    const SB = getSB();
    if (!SB) { alert('Engin gagnabankatenging'); return; }

    const c = await SB.from('fyrirtaeki')
      .select('id,nafn,kennitala,heimilisfang,simi,netfang')
      .eq('id', coId).maybeSingle();
    if (c.error || !c.data) { alert('Fyrirtæki fannst ekki'); return; }
    const co = c.data;

    const trip = loadTripState(coId);
    const notes = trip.notes || '';
    const skodunaradili = trip.skodunaradili || '';

    const rows = extractRows();
    const totals = extractTotals();

    const now = new Date();
    const monthLabel = MONTHS[now.getMonth()] + ' ' + now.getFullYear();
    const fullDateLabel = String(now.getDate()).padStart(2, '0') + '.' +
                         String(now.getMonth() + 1).padStart(2, '0') + '.' +
                         now.getFullYear();

    const html = buildReportHtml({ co, rows, totals, notes, skodunaradili, monthLabel, fullDateLabel });
    showModal(html);
  }

  function buildReportHtml(ctx) {
    const { co, rows, totals, notes, skodunaradili, monthLabel, fullDateLabel } = ctx;

    const rowsHtml = rows.length ? rows.map(r => `<tr>
      <td style="padding:7px 10px;font-size:12px;color:#0f172a">
        ${esc(r.main)}
        ${r.sub ? `<div style="font-size:10.5px;color:#64748b;margin-top:1px">${esc(r.sub)}</div>` : ''}
      </td>
      <td style="padding:7px 10px;font-size:12px;text-align:center;font-weight:600;font-variant-numeric:tabular-nums">${esc(r.count)}</td>
      <td style="padding:7px 10px;font-size:11px;color:#475569">${esc(r.kind)}</td>
      <td style="padding:7px 10px;font-size:12px;text-align:right;font-variant-numeric:tabular-nums">${esc(r.unitPrice)}</td>
      <td style="padding:7px 10px;font-size:11px;text-align:center;color:#64748b">${esc(r.vskPct)}</td>
      <td style="padding:7px 10px;font-size:12px;text-align:right;font-weight:700;font-variant-numeric:tabular-nums">${esc(r.subTotal)}</td>
    </tr>`).join('') : '<tr><td colspan="6" style="padding:18px;text-align:center;color:#94a3b8;font-style:italic">Engin þjónusta áætluð</td></tr>';

    const tfoot = totals.inc ? `<tfoot>
      <tr><td colspan="5" style="padding:7px 10px;text-align:right;font-size:11px;color:#64748b">Án VSK:</td>
        <td style="padding:7px 10px;text-align:right;font-weight:600;font-variant-numeric:tabular-nums">${esc(totals.ex)}</td></tr>
      <tr><td colspan="5" style="padding:5px 10px;text-align:right;font-size:11px;color:#64748b">VSK:</td>
        <td style="padding:5px 10px;text-align:right;font-weight:600;font-variant-numeric:tabular-nums">${esc(totals.vsk)}</td></tr>
      <tr style="background:#dcfce7">
        <td colspan="5" style="padding:9px 10px;text-align:right;font-size:13px;font-weight:800;color:#166534">SAMTALS M. VSK:</td>
        <td style="padding:9px 10px;text-align:right;font-weight:800;color:#166534;font-size:14px;font-variant-numeric:tabular-nums">${esc(totals.inc)}</td>
      </tr>
    </tfoot>` : '';

    return `<!DOCTYPE html><html lang="is"><head><meta charset="utf-8">
      <title>Úttektarskýrsla — ${esc(co.nafn || '')}</title>
      <style>
        @page { size: A4; margin: 14mm; }
        html, body { margin:0; padding:0; font-family: Arial, Helvetica, sans-serif; color:#0f172a; background:#fff; }
        .page { padding: 0; }
        table { width:100%; border-collapse: collapse; }
        th { background:#f8fafc; padding:8px 10px; text-align:left; font-size:10px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:.04em; border-bottom:1px solid #e2e8f0; }
        tbody tr:nth-child(even) td { background:#fafafa; }
        @media print { .no-print { display:none !important; } }
      </style></head><body><div class="page">

        <!-- Header: logo + "úttektarskýrsla" tag + month + inspector -->
        <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #000;padding-bottom:12px;margin-bottom:22px">
          <div>${LOGO_SVG}</div>
          <div style="text-align:right">
            <div style="display:inline-block;background:#000;color:#fff;padding:4px 14px;border-radius:6px;font-size:11px;font-weight:700;letter-spacing:.05em;text-transform:uppercase">Úttektarskýrsla</div>
            <div style="font-size:20px;font-weight:800;margin-top:10px;color:#0f172a">${esc(monthLabel)}</div>
            <div style="font-size:11px;color:#94a3b8;margin-top:2px">Dagsetning: ${esc(fullDateLabel)}</div>
            ${skodunaradili ? `<div style="font-size:12px;color:#475569;margin-top:6px">🧑 Skoðunaraðili: <strong style="color:#0f172a">${esc(skodunaradili)}</strong></div>` : ''}
          </div>
        </div>

        <!-- Customer block -->
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:14px 16px;margin-bottom:20px">
          <div style="font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.05em">Viðskiptavinur</div>
          <div style="font-size:18px;font-weight:800;color:#0f172a;margin-top:4px">${esc(co.nafn || '—')}</div>
          <div style="font-size:12px;color:#475569;margin-top:5px;line-height:1.55">
            ${co.kennitala ? 'kt. ' + esc(co.kennitala) : ''}
            ${co.simi ? (co.kennitala ? ' · ' : '') + 'sími ' + esc(co.simi) : ''}
            ${co.heimilisfang ? '<br>' + esc(co.heimilisfang) : ''}
            ${co.netfang ? '<br>' + esc(co.netfang) : ''}
          </div>
        </div>

        <!-- Planned-service table -->
        <div style="font-size:13px;font-weight:700;color:#0f172a;margin-bottom:8px">📋 Áætluð þjónusta — ${esc(monthLabel)}</div>
        <table style="margin-bottom:20px;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden">
          <thead><tr>
            <th>Tegund / Stærð</th>
            <th style="text-align:center;width:60px">Fjöldi</th>
            <th style="width:90px">Þjónusta</th>
            <th style="text-align:right">Per stk</th>
            <th style="text-align:center;width:50px">VSK</th>
            <th style="text-align:right">Samtals</th>
          </tr></thead>
          <tbody>${rowsHtml}</tbody>
          ${tfoot}
        </table>

        ${notes.trim() ? `
        <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:12px 14px;margin-bottom:28px">
          <div style="font-size:10px;font-weight:700;color:#1e40af;text-transform:uppercase;letter-spacing:.05em">📝 Athugasemd</div>
          <div style="font-size:12.5px;color:#0f172a;margin-top:5px;line-height:1.55;white-space:pre-wrap">${esc(notes)}</div>
        </div>` : ''}

        <!-- Sign-off -->
        <div style="margin-top:50px;padding-top:14px;border-top:1px solid #cbd5e1">
          <div style="font-size:12px;color:#475569;line-height:1.6">
            Fyrir hönd <strong style="color:#0f172a">Slökkvitæki ehf</strong>
          </div>
          <div style="margin-top:46px;border-bottom:1px solid #0f172a;width:300px"></div>
          <div style="font-size:11px;color:#64748b;margin-top:4px">${esc(skodunaradili || 'Nafn skoðunaraðila')}</div>
        </div>

        <!-- Footer -->
        <div style="margin-top:36px;padding-top:10px;border-top:1px solid #e2e8f0;font-size:10px;color:#94a3b8;text-align:center">
          Slökkvitæki ehf · Helluhrauni 10, 220 Hafnarfirði · kt 600508-0400 · vsknr. 98107 · Sími 565-4080 · eldklar@eldklar.is
        </div>

      </div></body></html>`;
  }

  function showModal(html) {
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
            '<button id="_cir-print" type="button" style="padding:7px 14px;background:#0d6efd;color:#fff;border:none;border-radius:7px;cursor:pointer;font:inherit;font-size:12px;font-weight:700">🖨 Prenta</button>' +
            '<button id="_cir-close" type="button" style="padding:7px 14px;background:#fff;border:1px solid #cbd5e1;border-radius:7px;cursor:pointer;font:inherit;font-size:12px;color:#475569">✕ Loka</button>' +
          '</div>' +
        '</div>' +
        '<iframe id="_cir-frame" style="flex:1;border:none;background:#fff" sandbox="allow-same-origin allow-modals allow-scripts"></iframe>' +
      '</div>';
    document.body.appendChild(dlg);
    const frame = dlg.querySelector('#_cir-frame');
    frame.srcdoc = html;
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
  }

  window.CompanyInspectionReport = { open: openReport };
  console.log('[patch-168] Company inspection report installed');
})();
/* === END COMPANY INSPECTION REPORT === */
