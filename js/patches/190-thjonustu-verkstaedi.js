/* === ÞJÓNUSTUVERKSTÆÐI v2 — Kanban yfir fyrirtæki í þjónustu ===
 *
 * One Kanban that mirrors the Móttaka/Verkstæði style but for whole-company
 * service cycles (Fyrirtæki í þjónustu). Columns:
 *
 *   ⏳ Á dagskrá   — skoðunarmánuður kominn/liðinn, ekki hafið (not blue/green)
 *   🔵 Í vinnslu   — skoðun hafin, skýrsla/reikningur eftir   (the blue flag)
 *   ✅ Búið í ár   — fullklárað í ár (green)
 *
 * Single source of truth = AppSettings.arsskodun_customers (same flag as the
 * blue dot in patch 153 and the per-unit Í vinnslu in patch 191). No separate
 * service_visits table needed — ticking units Í vinnslu auto-moves a company
 * into the 🔵 column; finishing it (✓ Búið) moves it to ✅.
 *
 * Per card: 🏢 Opna · 📄 Skýrsla · ✓ Búið (▶ í vinnslu on Á-dagskrá cards).
 */
(() => {
  if (window.__thjonustuVerkstaediInstalled) return;
  window.__thjonustuVerkstaediInstalled = true;

  const VIEW_ID = 'view-thjonustu-verkstaedi';
  const NAV_KEY = 'thjonustu-verkstaedi';
  const KEY = 'arsskodun_customers';
  const curYear = new Date().getFullYear();
  const curMonth = new Date().getMonth() + 1;

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c])); }
  function fmtKt(k) { const c = String(k || '').replace(/\D/g, ''); return c.length >= 10 ? c.slice(0,6) + '-' + c.slice(6,10) : (k || ''); }
  function digits(s) { return String(s || '').replace(/\D/g, ''); }
  function toast(m) { if (window.Toast && Toast.show) Toast.show(m); else console.log('[þjónustuverkstæði]', m); }
  function arsMap() { try { if (window.AppSettings && AppSettings.path) return AppSettings.path(KEY) || {}; } catch (_) {} return {}; }

  // Build the three buckets from the company list + arsskodun flags.
  function buckets() {
    const map = arsMap();
    const cos = (window.Companies && Companies.list) || [];
    const out = { dagskra: [], vinnsla: [], buid: [] };
    cos.forEach(co => {
      if (!co || co.deleted_at) return;
      if (co.er_i_thjonustu === false) return;          // only service companies
      const a = map[String(co.id)] || {};
      const ly = +a.last_year_inspected || 0;
      const fy = +a.field_inspected_year || 0;
      const m  = +a.inspect_month || 0;
      const card = { id: co.id, nafn: co.nafn || ('#' + co.id), kennitala: co.kennitala || '', month: m, aminning: (a.aminning || '').trim() };
      if (ly === curYear) out.buid.push(card);
      else if (fy === curYear) out.vinnsla.push(card);
      else if (m > 0 && m <= curMonth) out.dagskra.push(card);   // due/overdue, not started
    });
    const byName = (x, y) => String(x.nafn).localeCompare(y.nafn, 'is');
    out.dagskra.sort(byName); out.vinnsla.sort(byName); out.buid.sort(byName);
    return out;
  }

  async function setFlag(coId, patch) {
    if (!window.AppSettings || !AppSettings.save) { toast('Engar stillingar'); return; }
    const map = arsMap();
    const e = Object.assign({}, map[String(coId)] || {}, patch);
    if (patch._delete) patch._delete.forEach(k => { delete e[k]; });
    delete e._delete;
    await AppSettings.save({ [KEY]: Object.assign({}, map, { [String(coId)]: e }) });
    render();
  }
  const startVinnsla = id => setFlag(id, { field_inspected_year: curYear, _delete: ['last_year_inspected'] });
  const markBuid     = id => setFlag(id, { last_year_inspected: curYear, _delete: ['field_inspected_year'] });
  const reopen       = id => setFlag(id, { _delete: ['field_inspected_year', 'last_year_inspected'] });

  function openCompany(id) { if (window.VidskDetail && VidskDetail.show) return VidskDetail.show(id); if (window.Companies && Companies.openDetail) return Companies.openDetail(id); }
  function openReport(id) { if (window.CompanyInspectionReport && CompanyInspectionReport.open) return CompanyInspectionReport.open(id); if (window.VisitReport && VisitReport.open) return VisitReport.open(id); openCompany(id); }

  const COLS = [
    { key: 'dagskra', label: '⏳ Á dagskrá',  head: '#fef3c7', tx: '#7c2d12', bar: '#d97706' },
    { key: 'vinnsla', label: '🔵 Í vinnslu',   head: '#dbeafe', tx: '#1e3a8a', bar: '#3b82f6' },
    { key: 'buid',    label: '✅ Búið í ár',   head: '#dcfce7', tx: '#14532d', bar: '#16a34a' },
  ];
  function btn(bg, tx, bd) { return 'padding:5px 9px;border:1px solid ' + bd + ';border-radius:7px;background:' + bg + ';color:' + tx + ';font-size:11.5px;font-weight:700;cursor:pointer'; }
  function cardHtml(r, colKey, bar) {
    let acts = '<button class="_sv-act" data-act="open" data-id="' + r.id + '" style="' + btn('#fff','#475569','#cbd5e1') + '">🏢 Opna</button>';
    if (colKey === 'dagskra') acts += '<button class="_sv-act" data-act="start" data-id="' + r.id + '" style="' + btn('#dbeafe','#1e3a8a','#93c5fd') + '">▶ Í vinnslu</button>';
    else if (colKey === 'vinnsla') acts += '<button class="_sv-act" data-act="report" data-id="' + r.id + '" style="' + btn('#ede9fe','#5b21b6','#ddd6fe') + '">📄 Skýrsla</button><button class="_sv-act" data-act="buid" data-id="' + r.id + '" style="' + btn('#dcfce7','#14532d','#86efac') + '">✓ Búið</button>';
    else acts += '<button class="_sv-act" data-act="reopen" data-id="' + r.id + '" style="' + btn('#f1f5f9','#475569','#cbd5e1') + '">↩ Opna aftur</button>';
    return '<div style="background:#fff;border:1px solid #e2e8f0;border-left:4px solid ' + bar + ';border-radius:10px;padding:10px 12px;box-shadow:0 1px 2px rgba(16,24,40,.04)">' +
      '<div style="font-weight:700;font-size:13.5px;color:#0f172a">' + esc(r.nafn) + '</div>' +
      (r.kennitala ? '<div style="font-size:10px;color:#94a3b8;font-family:monospace;margin-top:1px">kt. ' + esc(fmtKt(r.kennitala)) + '</div>' : '') +
      (r.aminning ? '<div style="font-size:10.5px;color:#b45309;margin-top:3px">📌 ' + esc(r.aminning.slice(0,70)) + '</div>' : '') +
      '<div style="display:flex;gap:5px;flex-wrap:wrap;margin-top:8px">' + acts + '</div></div>';
  }

  function viewEl() { return document.getElementById(VIEW_ID); }
  function ensureView() {
    if (viewEl()) return;
    const v = document.createElement('div'); v.id = VIEW_ID; v.className = 'view'; v.style.cssText = 'padding:20px';
    const ref = document.getElementById('view-workshop') || document.getElementById('view-counter');
    if (ref && ref.parentNode) ref.parentNode.insertBefore(v, ref.nextSibling); else document.body.appendChild(v);
  }
  function render() {
    ensureView();
    const v = viewEl(); if (!v) return;
    const b = buckets();
    const cols = COLS.map(col => {
      const rows = b[col.key] || [];
      const cards = rows.map(r => cardHtml(r, col.key, col.bar)).join('') ||
        '<div style="color:#cbd5e1;font-size:12.5px;padding:16px;text-align:center;border:1px dashed #e2e8f0;border-radius:10px">—</div>';
      return '<div style="flex:1;min-width:260px"><div style="background:' + col.head + ';color:' + col.tx + ';border-radius:10px;padding:8px 12px;font-size:13px;font-weight:700;margin-bottom:10px">' + col.label + ' · ' + rows.length + '</div><div style="display:flex;flex-direction:column;gap:9px">' + cards + '</div></div>';
    }).join('');
    v.innerHTML = '<div style="max-width:1400px;margin:0 auto">' +
      '<div style="display:flex;justify-content:space-between;align-items:flex-end;gap:12px;flex-wrap:wrap;margin-bottom:6px"><h1 style="font-size:22px;margin:0;font-weight:750">🔧 ÞjónustuVerkstæði</h1></div>' +
      '<p style="color:#64748b;font-size:14px;margin:0 0 16px">Fyrirtæki í þjónustu eftir stöðu. Færðu þau ⏳ → 🔵 → ✅ og kláraðu skýrslur og reikninga.</p>' +
      '<div style="display:flex;gap:14px;align-items:flex-start;overflow-x:auto;padding-bottom:10px">' + cols + '</div></div>';
    v.querySelectorAll('._sv-act').forEach(bn => bn.addEventListener('click', e => {
      e.stopPropagation();
      const id = +bn.dataset.id, act = bn.dataset.act;
      if (act === 'open') openCompany(id);
      else if (act === 'report') openReport(id);
      else if (act === 'start') startVinnsla(id);
      else if (act === 'buid') markBuid(id);
      else if (act === 'reopen') reopen(id);
    }));
  }

  function openView() {
    document.querySelectorAll('[id^=view-]').forEach(x => { x.style.display = 'none'; x.classList.remove('active'); });
    ensureView();
    const v = viewEl(); v.style.display = ''; v.classList.add('active');
    document.querySelectorAll('.vnav-btn').forEach(x => x.classList.remove('active'));
    const b = document.querySelector('[data-view="' + NAV_KEY + '"]'); if (b) b.classList.add('active');
    render();
  }
  function injectTab() {
    const btns = Array.prototype.slice.call(document.querySelectorAll('.vnav-btn'));
    const anchor = btns.find(b => b.dataset.view === 'workshop') || btns.find(b => b.dataset.view === 'counter');
    if (!anchor || !anchor.parentElement) return;
    if (document.querySelector('[data-view="' + NAV_KEY + '"]')) return;
    const btn = anchor.cloneNode(true);
    btn.dataset.view = NAV_KEY; btn.classList.remove('active');
    const span = btn.querySelector('span');
    if (span) span.textContent = '🔧 ÞjónustuVerkstæði'; else btn.textContent = '🔧 ÞjónustuVerkstæði';
    btn.querySelectorAll('.badge,.count,[class*="badge"],[class*="count"]').forEach(n => n.remove());
    btn.removeAttribute('onclick');
    btn.onclick = openView;
    anchor.parentNode.insertBefore(btn, anchor.nextSibling);
    document.querySelectorAll('.vnav-btn').forEach(b => { if (b === btn) return; b.addEventListener('click', () => { const vv = viewEl(); if (vv) { vv.style.display = 'none'; vv.classList.remove('active'); } btn.classList.remove('active'); }); });
    console.log('[þjónustuverkstæði] tab injected');
  }
  setInterval(injectTab, 1200);
  setTimeout(injectTab, 600);
  try { if (window.AppSettings && AppSettings.onChange) AppSettings.onChange(() => { if (viewEl() && viewEl().classList.contains('active')) render(); }); } catch (_) {}

  window.ThjonustuVerkstaedi = { render, open: openView, buckets };
  console.log('[patch-190 v2] ÞjónustuVerkstæði (company Kanban) installed');
})();
/* === END ÞJÓNUSTUVERKSTÆÐI === */
