/* === ÞJÓNUSTU-AFGREIÐSLA: "Í vinnslu" fyrirtæki í þjónustu ===
 *
 * A clean standalone view (own nav item, next to Móttaka) that works like an
 * Afgreiðsla for service customers: lists every Fyrirtæki í þjónustu that is
 * currently "Í vinnslu" (the blue dot in patch 153 — skoðun hafin, skýrsla/
 * reikningur eftir) so the office finishes sending reports + bills in one place.
 *
 * Built standalone (not wedged into the messy Móttaka/counter view) per the
 * owner's call. Source of truth = AppSettings.arsskodun_customers, same flag
 * the blue dot uses: field_inspected_year === curYear AND last_year_inspected
 * !== curYear.
 *
 * Per company: 🏢 Opna · 📄 Úttektarskýrsla · ✓ Búið (clears it from the queue
 * + turns the dot green). Card ⇄ list toggle (persisted).
 */
(() => {
  if (window.__thjonustuAfgreidslaInstalled) return;
  window.__thjonustuAfgreidslaInstalled = true;

  const STORAGE_KEY = 'arsskodun_customers';
  const LS_VIEW = '_tafg_view';
  const VIEW_ID = 'view-thjonustu-afgr';
  const NAV_KEY = 'thjonustu-afgr';
  const curYear = new Date().getFullYear();

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c])); }
  function fmtKt(k) { const c = String(k || '').replace(/\D/g, ''); return c.length >= 10 ? c.slice(0,6) + '-' + c.slice(6,10) : (k || ''); }
  function viewMode() { return localStorage.getItem(LS_VIEW) === 'list' ? 'list' : 'card'; }
  function setViewMode(v) { try { localStorage.setItem(LS_VIEW, v); } catch (_) {} }

  function arsMap() {
    try { if (window.AppSettings && AppSettings.path) return AppSettings.path(STORAGE_KEY) || {}; } catch (_) {}
    return {};
  }
  function inProgress() {
    const map = arsMap();
    const cos = (window.Companies && Companies.list) || [];
    const byId = {}; cos.forEach(c => { byId[String(c.id)] = c; });
    const out = [];
    Object.keys(map).forEach(id => {
      const a = map[id] || {};
      const fy = +a.field_inspected_year || 0;
      const ly = +a.last_year_inspected || 0;
      if (fy === curYear && ly !== curYear) {
        const co = byId[id];
        out.push({
          id: +id,
          nafn: (co && co.nafn) || a.nafn || ('#' + id),
          kennitala: (co && co.kennitala) || a.kennitala || '',
          aminning: (a.aminning || '').trim()
        });
      }
    });
    out.sort((x, y) => String(x.nafn).localeCompare(y.nafn, 'is'));
    return out;
  }

  async function markDone(coId) {
    if (!window.AppSettings || !AppSettings.save) { alert('Engar stillingar tiltækar'); return; }
    const map = arsMap();
    const entry = Object.assign({}, map[String(coId)] || {});
    entry.last_year_inspected = curYear;
    delete entry.field_inspected_year;
    await AppSettings.save({ [STORAGE_KEY]: Object.assign({}, map, { [String(coId)]: entry }) });
    render();
  }
  function openCompany(coId) {
    if (window.VidskDetail && VidskDetail.show) return VidskDetail.show(coId);
    if (window.Companies && Companies.openDetail) return Companies.openDetail(coId);
  }
  function openReport(coId) {
    if (window.CompanyInspectionReport && CompanyInspectionReport.open) return CompanyInspectionReport.open(coId);
    if (window.VisitReport && VisitReport.open) return VisitReport.open(coId);
    openCompany(coId);
  }

  function btn(bg, tx, bd) { return 'padding:6px 11px;border:1px solid ' + bd + ';border-radius:7px;background:' + bg + ';color:' + tx + ';font-size:12px;font-weight:700;cursor:pointer;margin-left:5px'; }
  function actions(r) {
    return '<button class="_tafg-act" data-act="open" data-id="' + r.id + '" style="' + btn('#fff','#475569','#cbd5e1') + '">🏢 Opna</button>' +
           '<button class="_tafg-act" data-act="report" data-id="' + r.id + '" style="' + btn('#ede9fe','#5b21b6','#ddd6fe') + '">📄 Skýrsla</button>' +
           '<button class="_tafg-act" data-act="done" data-id="' + r.id + '" style="' + btn('#dcfce7','#14532d','#86efac') + '">✓ Búið</button>';
  }

  function bodyHtml(rows) {
    const mode = viewMode();
    const toggle =
      '<div style="display:flex;border:1px solid #cbd5e1;border-radius:8px;overflow:hidden">' +
        '<button class="_tafg-vm" data-vm="card" style="padding:6px 13px;border:none;background:' + (mode==='card'?'#0f172a':'#fff') + ';color:' + (mode==='card'?'#fff':'#475569') + ';font:inherit;font-size:12px;font-weight:600;cursor:pointer">🟦 Kort</button>' +
        '<button class="_tafg-vm" data-vm="list" style="padding:6px 13px;border:none;border-left:1px solid #cbd5e1;background:' + (mode==='list'?'#0f172a':'#fff') + ';color:' + (mode==='list'?'#fff':'#475569') + ';font:inherit;font-size:12px;font-weight:600;cursor:pointer">📋 Listi</button>' +
      '</div>';
    const head =
      '<div style="display:flex;justify-content:space-between;align-items:flex-end;gap:12px;flex-wrap:wrap;margin-bottom:6px">' +
        '<h1 style="font-size:22px;margin:0;font-weight:750">🔵 Í vinnslu — þjónusta</h1>' + toggle +
      '</div>' +
      '<p style="color:#64748b;font-size:14px;margin:0 0 16px">Fyrirtæki í þjónustu þar sem skoðun er hafin — eftir að senda skýrslu / reikning. ' + rows.length + ' fyrirtæki.</p>';
    if (!rows.length) {
      return head + '<div style="padding:40px;text-align:center;color:#94a3b8;background:#f8fafc;border:1px dashed #cbd5e1;border-radius:12px;font-size:14px">Ekkert í vinnslu núna.<br><span style="font-size:12.5px">Merktu fyrirtæki „🔵 Í vinnslu" í <b>Fyrirtæki í þjónustu</b> listanum og það birtist hér.</span></div>';
    }
    if (mode === 'list') {
      const body = rows.map(r =>
        '<tr style="border-bottom:1px solid #f1f5f9">' +
          '<td style="padding:9px 12px"><div style="font-weight:600;color:#0f172a">' + esc(r.nafn) + '</div>' + (r.kennitala ? '<div style="font-size:10.5px;color:#94a3b8;font-family:monospace">kt. ' + esc(fmtKt(r.kennitala)) + '</div>' : '') + '</td>' +
          '<td style="padding:9px 12px;font-size:12px;color:#475569">' + (r.aminning ? '📌 ' + esc(r.aminning.slice(0,80)) : '') + '</td>' +
          '<td style="padding:9px 12px;text-align:right;white-space:nowrap">' + actions(r) + '</td>' +
        '</tr>').join('');
      return head + '<div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden"><table style="width:100%;border-collapse:collapse;font-size:13px"><tbody>' + body + '</tbody></table></div>';
    }
    const cards = rows.map(r =>
      '<div style="background:#fff;border:1px solid #e2e8f0;border-left:4px solid #3b82f6;border-radius:12px;padding:13px 15px;box-shadow:0 1px 2px rgba(16,24,40,.04)">' +
        '<div style="font-weight:700;font-size:15px;color:#0f172a">' + esc(r.nafn) + '</div>' +
        (r.kennitala ? '<div style="font-size:10.5px;color:#94a3b8;font-family:monospace;margin-top:1px">kt. ' + esc(fmtKt(r.kennitala)) + '</div>' : '') +
        (r.aminning ? '<div style="font-size:11px;color:#b45309;margin-top:5px">📌 ' + esc(r.aminning.slice(0,90)) + '</div>' : '') +
        '<div style="display:flex;gap:5px;flex-wrap:wrap;margin-top:11px">' + actions(r) + '</div>' +
      '</div>').join('');
    return head + '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:12px">' + cards + '</div>';
  }

  function viewEl() { return document.getElementById(VIEW_ID); }
  function ensureView() {
    if (viewEl()) return;
    const v = document.createElement('div');
    v.id = VIEW_ID; v.className = 'view'; v.style.cssText = 'padding:20px';
    const ref = document.getElementById('view-counter') || document.getElementById('view-companies');
    if (ref && ref.parentNode) ref.parentNode.insertBefore(v, ref.nextSibling); else document.body.appendChild(v);
  }
  function render() {
    ensureView();
    const v = viewEl(); if (!v) return;
    v.innerHTML = '<div style="max-width:1100px;margin:0 auto">' + bodyHtml(inProgress()) + '</div>';
    v.querySelectorAll('._tafg-vm').forEach(b => b.addEventListener('click', () => { setViewMode(b.dataset.vm); render(); }));
    v.querySelectorAll('._tafg-act').forEach(b => b.addEventListener('click', e => {
      e.stopPropagation();
      const id = +b.dataset.id, act = b.dataset.act;
      if (act === 'open') openCompany(id);
      else if (act === 'report') openReport(id);
      else if (act === 'done') markDone(id);
    }));
  }

  function openView() {
    document.querySelectorAll('[id^=view-]').forEach(v => { v.style.display = 'none'; v.classList.remove('active'); });
    ensureView();
    const v = viewEl(); v.style.display = ''; v.classList.add('active');
    document.querySelectorAll('.vnav-btn').forEach(b => b.classList.remove('active'));
    const btnEl = document.querySelector('[data-view="' + NAV_KEY + '"]'); if (btnEl) btnEl.classList.add('active');
    render();
  }
  function injectTab() {
    const btns = Array.prototype.slice.call(document.querySelectorAll('.vnav-btn'));
    const anchor = btns.find(b => b.dataset.view === 'counter') || btns.find(b => b.dataset.view === 'workshop');
    if (!anchor || !anchor.parentElement) return;
    if (document.querySelector('[data-view="' + NAV_KEY + '"]')) return;
    const btn = anchor.cloneNode(true);
    btn.dataset.view = NAV_KEY;
    btn.classList.remove('active');
    const span = btn.querySelector('span');
    if (span) span.textContent = '🔵 Í vinnslu'; else btn.textContent = '🔵 Í vinnslu';
    btn.querySelectorAll('.badge,.count,[class*="badge"],[class*="count"]').forEach(n => n.remove());
    btn.removeAttribute('onclick');
    btn.onclick = openView;
    anchor.parentNode.insertBefore(btn, anchor.nextSibling);
    document.querySelectorAll('.vnav-btn').forEach(b => {
      if (b === btn) return;
      b.addEventListener('click', () => { const vv = viewEl(); if (vv) { vv.style.display = 'none'; vv.classList.remove('active'); } btn.classList.remove('active'); });
    });
    console.log('[þjónustu-afgreiðsla] tab injected');
  }
  setInterval(injectTab, 1200);
  setTimeout(injectTab, 600);

  try { if (window.AppSettings && AppSettings.onChange) AppSettings.onChange(() => { if (viewEl() && viewEl().classList.contains('active')) render(); }); } catch (_) {}

  window.ThjonustuAfgreidsla = { inProgress, render, open: openView };
  console.log('[patch-192] Þjónustu-afgreiðsla (Í vinnslu) installed');
})();
/* === END ÞJÓNUSTU-AFGREIÐSLA === */
