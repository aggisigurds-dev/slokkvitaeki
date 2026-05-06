/* === VSK SKÝRSLA v1 === */
/* VSK (VAT) report for tax filing (Skatturinn / RSK).
 *
 * Reads from solur table and breaks down by VSK rate:
 *  • 24% standard rate (vsk_pct = 24)
 *  • 11% reduced rate (vsk_pct = 11)
 *  • 0% exempt (vsk_pct = 0)
 *
 * Features:
 *  • Dedicated "VSK skýrsla" nav button
 *  • Period filter: quarter presets (Q1/Q2/Q3/Q4), year, custom date range
 *  • Summary cards: total revenue, ex-VAT per rate, VAT per rate
 *  • VSK return form (RSK 10.27 layout) — shows the numbers to transcribe
 *  • CSV / print export
 *
 * No schema changes required.
 */
(() => {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (window.__vskReportInstalled) return;
  window.__vskReportInstalled = true;

  const VIEW_ID = 'view-vsk-report';

  function getSB() { return (window.DB && window.DB.sb) || null; }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c =>
      ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }
  function fmtKr(n) { return Math.round(n).toLocaleString('is-IS') + ' kr'; }
  function fmtNum(n) { return isNaN(n) ? '' : Math.round(n).toLocaleString('is-IS'); }
  function fmtDate(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    return d.getDate().toString().padStart(2,'0') + '.' + (d.getMonth()+1).toString().padStart(2,'0') + '.' + d.getFullYear();
  }
  const MONTHS_IS = ['janúar','febrúar','mars','apríl','maí','júní','júlí','ágúst','september','október','nóvember','desember'];

  // ── Styles ────────────────────────────────────────────────────────────────
  if (!document.getElementById('vsk-style')) {
    const s = document.createElement('style');
    s.id = 'vsk-style';
    s.textContent = `
      #${VIEW_ID} { padding: 0; overflow-y: auto; }
      #${VIEW_ID} .vr-wrap { max-width: 900px; margin: 0 auto; padding: 20px 16px 40px; }
      #${VIEW_ID} .vr-header { margin-bottom: 18px; }
      #${VIEW_ID} .vr-header h1 { margin: 0; font-size: 22px; font-weight: 800; }
      #${VIEW_ID} .vr-sub { font-size: 12px; color: #64748b; margin-top: 4px; }

      #${VIEW_ID} .vr-filters {
        background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px;
        padding: 12px 14px; margin-bottom: 16px;
      }
      #${VIEW_ID} .vr-row { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; margin-bottom: 6px; }
      #${VIEW_ID} .vr-row:last-child { margin-bottom: 0; }
      #${VIEW_ID} .vr-row label { font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: .05em; min-width: 70px; }
      #${VIEW_ID} .vr-input { padding: 6px 10px; border: 1px solid #cbd5e1; border-radius: 7px; font: inherit; font-size: 13px; }
      #${VIEW_ID} .vr-preset {
        padding: 5px 12px; border: 1px solid #cbd5e1; border-radius: 6px;
        background: #fff; cursor: pointer; font: inherit; font-size: 12px; color: #475569;
      }
      #${VIEW_ID} .vr-preset:hover { background: #f1f5f9; }
      #${VIEW_ID} .vr-preset.active { background: #2563eb; color: #fff; border-color: #2563eb; }

      #${VIEW_ID} .vr-cards { display: grid; grid-template-columns: repeat(auto-fit,minmax(150px,1fr)); gap: 10px; margin-bottom: 20px; }
      #${VIEW_ID} .vr-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px 14px; }
      #${VIEW_ID} .vr-card .lbl { font-size: 10px; color: #64748b; font-weight: 700; text-transform: uppercase; letter-spacing: .05em; }
      #${VIEW_ID} .vr-card .val { font-size: 20px; font-weight: 800; margin-top: 4px; }
      #${VIEW_ID} .vr-card .sub { font-size: 11px; color: #64748b; margin-top: 2px; }
      #${VIEW_ID} .vr-card.accent { background: #eff6ff; border-color: #bfdbfe; }
      #${VIEW_ID} .vr-card.accent .val { color: #1d4ed8; }
      #${VIEW_ID} .vr-card.red { background: #fef2f2; border-color: #fca5a5; }
      #${VIEW_ID} .vr-card.red .val { color: #dc2626; }

      /* RSK form box */
      #${VIEW_ID} .vr-form-box {
        background: #fff; border: 2px solid #e2e8f0; border-radius: 12px;
        margin-bottom: 20px; overflow: hidden;
      }
      #${VIEW_ID} .vr-form-box .vr-form-hd {
        background: #1e40af; color: #fff; padding: 12px 18px;
        font-size: 14px; font-weight: 700;
      }
      #${VIEW_ID} .vr-form-box .vr-form-sub {
        font-size: 11px; opacity: .8; margin-top: 2px;
      }
      #${VIEW_ID} .vr-form-row {
        display: grid; grid-template-columns: 1fr auto auto;
        align-items: center; gap: 12px;
        padding: 10px 18px; border-bottom: 1px solid #f1f5f9;
        font-size: 13px;
      }
      #${VIEW_ID} .vr-form-row:last-child { border-bottom: none; }
      #${VIEW_ID} .vr-form-row .row-num { font-size: 11px; font-weight: 700; color: #94a3b8; min-width: 24px; }
      #${VIEW_ID} .vr-form-row .row-desc { color: #334155; }
      #${VIEW_ID} .vr-form-row .row-val {
        font-weight: 700; font-size: 15px; text-align: right;
        font-variant-numeric: tabular-nums; min-width: 120px;
        color: #0f172a;
      }
      #${VIEW_ID} .vr-form-row.total-row {
        background: #f0fdf4; font-weight: 700; border-top: 2px solid #bbf7d0;
      }
      #${VIEW_ID} .vr-form-row.total-row .row-val { color: #15803d; font-size: 17px; }
      #${VIEW_ID} .vr-form-row.highlight-row { background: #fef3c7; }
      #${VIEW_ID} .vr-form-row.highlight-row .row-val { color: #92400e; }

      #${VIEW_ID} .vr-actions { display: flex; gap: 8px; margin-bottom: 16px; }
      #${VIEW_ID} .vr-btn { padding: 8px 14px; background: #fff; border: 1px solid #cbd5e1; border-radius: 8px; font: inherit; font-size: 13px; cursor: pointer; color: #334155; }
      #${VIEW_ID} .vr-btn:hover { background: #f1f5f9; }
      #${VIEW_ID} .vr-btn.primary { background: #2563eb; color: #fff; border-color: #2563eb; }
      #${VIEW_ID} .vr-btn.primary:hover { background: #1d4ed8; }
      #${VIEW_ID} .vr-period-label { font-size: 13px; font-weight: 600; color: #334155; margin-left: auto; }

      @media print {
        body * { visibility: hidden; }
        #${VIEW_ID}, #${VIEW_ID} * { visibility: visible; }
        #${VIEW_ID} { position: absolute; left: 0; top: 0; width: 100%; }
        #${VIEW_ID} .vr-actions, #${VIEW_ID} .vr-filters { display: none; }
      }
    `;
    document.head.appendChild(s);
  }

  // ── Data & state ──────────────────────────────────────────────────────────
  let allSales = [];
  let filtered = [];
  let fromDate = '', toDate = '';
  let activePreset = 'thisMonth';

  async function load() {
    const SB = getSB();
    if (!SB) return;
    const { data } = await SB
      .from('solur')
      .select('id,num,created_at,customer_nafn,linur,samtals,upphaed_an_vsk,vsk_upphaed,greitt_med,paid_at')
      .order('created_at', { ascending: false });
    allSales = (data || []).map(s => {
      const linur = Array.isArray(s.linur) ? s.linur : [];
      // Build per-rate breakdown
      const byRate = {};
      for (const l of linur) {
        const rate = +l.vsk_pct || 0;
        const lineEx = (+l.qty || 0) * (+l.unit_price_ex_vat || 0);
        if (!byRate[rate]) byRate[rate] = { ex: 0, vsk: 0 };
        byRate[rate].ex += lineEx;
        byRate[rate].vsk += lineEx * (rate / 100);
      }
      return { id: s.id, num: s.num, date: s.created_at,
        customer: s.customer_nafn || '', payment: s.greitt_med || '',
        paid_at: s.paid_at, total: +(s.samtals || 0),
        ex: +(s.upphaed_an_vsk || 0), vsk: +(s.vsk_upphaed || 0),
        byRate };
    });
  }

  function applyFilters() {
    const from = fromDate ? new Date(fromDate + 'T00:00:00').getTime() : -Infinity;
    const to = toDate ? new Date(toDate + 'T23:59:59').getTime() : Infinity;
    filtered = allSales.filter(s => {
      const ts = new Date(s.date).getTime();
      return ts >= from && ts <= to;
    });
  }

  function fmt(d) {
    return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
  }

  function setPreset(preset) {
    activePreset = preset;
    const now = new Date();
    const y = now.getFullYear();
    const q = Math.floor(now.getMonth() / 3);
    switch (preset) {
      case 'Q1': fromDate = `${y}-01-01`; toDate = `${y}-03-31`; break;
      case 'Q2': fromDate = `${y}-04-01`; toDate = `${y}-06-30`; break;
      case 'Q3': fromDate = `${y}-07-01`; toDate = `${y}-09-30`; break;
      case 'Q4': fromDate = `${y}-10-01`; toDate = `${y}-12-31`; break;
      case 'prevQ': {
        const pq = q === 0 ? 3 : q - 1;
        const py = q === 0 ? y - 1 : y;
        const qStarts = [[0,1],[3,1],[6,1],[9,1]];
        const qEnds = [[2,31],[5,30],[8,30],[11,31]];
        fromDate = `${py}-${String(qStarts[pq][0]+1).padStart(2,'0')}-01`;
        toDate = `${py}-${String(qEnds[pq][0]+1).padStart(2,'0')}-${qEnds[pq][1]}`;
        break;
      }
      case 'thisYear': fromDate = `${y}-01-01`; toDate = fmt(now); break;
      case 'lastYear': fromDate = `${y-1}-01-01`; toDate = `${y-1}-12-31`; break;
      case 'thisMonth': fromDate = `${y}-${String(now.getMonth()+1).padStart(2,'0')}-01`; toDate = fmt(now); break;
      default: fromDate = ''; toDate = '';
    }
    const fromEl = document.getElementById('vr-from');
    const toEl = document.getElementById('vr-to');
    if (fromEl) fromEl.value = fromDate;
    if (toEl) toEl.value = toDate;
    document.querySelectorAll('#'+VIEW_ID+' .vr-preset').forEach(b =>
      b.classList.toggle('active', b.dataset.preset === preset));
  }

  // ── Compute totals by rate ─────────────────────────────────────────────────
  function computeTotals() {
    const totals = { '24': { ex: 0, vsk: 0 }, '11': { ex: 0, vsk: 0 }, '0': { ex: 0, vsk: 0 } };
    for (const s of filtered) {
      for (const [rate, v] of Object.entries(s.byRate)) {
        const key = String(rate);
        if (!totals[key]) totals[key] = { ex: 0, vsk: 0 };
        totals[key].ex += v.ex;
        totals[key].vsk += v.vsk;
      }
    }
    return totals;
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  function periodLabel() {
    if (!fromDate && !toDate) return 'Allt tímabil';
    if (fromDate && toDate) return fmtDate(fromDate) + ' – ' + fmtDate(toDate);
    if (fromDate) return 'Frá ' + fmtDate(fromDate);
    return 'Til ' + fmtDate(toDate);
  }

  function render() {
    const view = document.getElementById(VIEW_ID);
    if (!view || !view.classList.contains('active')) return;
    applyFilters();
    const T = computeTotals();
    const totalEx = T['24'].ex + T['11'].ex + T['0'].ex;
    const totalVsk = T['24'].vsk + T['11'].vsk + T['0'].vsk;
    const totalInc = totalEx + totalVsk;

    // Cards
    document.getElementById('vr-cards').innerHTML = `
      <div class="vr-card accent"><div class="lbl">Sala m. VSK</div><div class="val">${fmtNum(totalInc)}</div><div class="sub">kr</div></div>
      <div class="vr-card"><div class="lbl">Sala án VSK</div><div class="val">${fmtNum(totalEx)}</div><div class="sub">kr</div></div>
      <div class="vr-card red"><div class="lbl">VSK til greiðslu</div><div class="val">${fmtNum(totalVsk)}</div><div class="sub">kr — VSK 24%+11%</div></div>
      <div class="vr-card"><div class="lbl">Sölur</div><div class="val">${filtered.length}</div><div class="sub">á tímabilinu</div></div>
    `;

    // RSK form
    document.getElementById('vr-form-inner').innerHTML = `
      <div class="vr-form-box">
        <div class="vr-form-hd">
          RSK 10.27 — VSK-skýrsla
          <div class="vr-form-sub">${esc(periodLabel())} · ${esc(filtered.length)} sölur</div>
        </div>
        <div class="vr-form-row"><span class="row-desc"><strong>Sala</strong> (með VSK)</span><span></span><span class="row-val">${fmtNum(totalInc)} kr</span></div>
        <div class="vr-form-row">
          <span class="row-desc">Skattskyld velta 24% (án VSK)</span>
          <span class="row-num">1</span>
          <span class="row-val">${fmtNum(T['24'].ex)} kr</span>
        </div>
        <div class="vr-form-row highlight-row">
          <span class="row-desc">VSK af 24% veltu</span>
          <span class="row-num">2</span>
          <span class="row-val">${fmtNum(T['24'].vsk)} kr</span>
        </div>
        <div class="vr-form-row">
          <span class="row-desc">Skattskyld velta 11% (án VSK)</span>
          <span class="row-num">3</span>
          <span class="row-val">${fmtNum(T['11'].ex)} kr</span>
        </div>
        <div class="vr-form-row highlight-row">
          <span class="row-desc">VSK af 11% veltu</span>
          <span class="row-num">4</span>
          <span class="row-val">${fmtNum(T['11'].vsk)} kr</span>
        </div>
        ${T['0'].ex ? `<div class="vr-form-row">
          <span class="row-desc">Skattfrjáls velta / 0% (án VSK)</span>
          <span class="row-num">5</span>
          <span class="row-val">${fmtNum(T['0'].ex)} kr</span>
        </div>` : ''}
        <div class="vr-form-row total-row">
          <span class="row-desc">Útskattur samtals (lína 2 + lína 4)</span>
          <span class="row-num">6</span>
          <span class="row-val">${fmtNum(totalVsk)} kr</span>
        </div>
        <div class="vr-form-row" style="background:#f8fafc;font-size:11px;color:#64748b;">
          <span class="row-desc">Innskattur (gjaldfærðar vörur/þjónusta — skráðu handvirkt)</span>
          <span class="row-num">7</span>
          <span class="row-val" style="color:#94a3b8;">— kr</span>
        </div>
      </div>`;
  }

  // ── CSV export ────────────────────────────────────────────────────────────
  function exportCSV() {
    applyFilters();
    const T = computeTotals();
    const header = ['Tegund','Án VSK','VSK','Með VSK'];
    const rows = [
      ['24% velta', T['24'].ex, T['24'].vsk, T['24'].ex + T['24'].vsk],
      ['11% velta', T['11'].ex, T['11'].vsk, T['11'].ex + T['11'].vsk],
      ['0% velta', T['0'].ex, 0, T['0'].ex],
    ].map(r => r.map((v,i) => i === 0 ? v : String(Math.round(v)).replace('.',',')));

    const csvLines = [header.join(';'), ...rows.map(r => r.join(';'))];
    const csv = '﻿' + csvLines.join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'vsk-skyrsla-' + (fromDate||'all') + '.csv';
    document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }

  // ── Build view HTML ────────────────────────────────────────────────────────
  function buildViewHTML() {
    return `
      <main class="main-panel" style="overflow-y:auto;">
      <div class="vr-wrap">
        <div class="vr-header">
          <h1>🧾 VSK skýrsla</h1>
          <div class="vr-sub">Sundurliðun VSK eftir skatthlutföllum til skattskila hjá Skatturinn (RSK 10.27)</div>
        </div>
        <div class="vr-filters">
          <div class="vr-row">
            <label>Tímabil</label>
            <input type="date" id="vr-from" class="vr-input">
            <span style="color:#94a3b8;">→</span>
            <input type="date" id="vr-to" class="vr-input">
            <button class="vr-preset active" data-preset="thisMonth">Þ. mánuður</button>
            <button class="vr-preset" data-preset="Q1">Q1</button>
            <button class="vr-preset" data-preset="Q2">Q2</button>
            <button class="vr-preset" data-preset="Q3">Q3</button>
            <button class="vr-preset" data-preset="Q4">Q4</button>
            <button class="vr-preset" data-preset="prevQ">Síðasta Q</button>
            <button class="vr-preset" data-preset="thisYear">Þ. ár</button>
            <button class="vr-preset" data-preset="lastYear">S. ár</button>
          </div>
        </div>
        <div class="vr-actions">
          <button id="vr-csv-btn" class="vr-btn primary">📥 CSV</button>
          <button id="vr-print-btn" class="vr-btn">🖨 Prenta</button>
          <button id="vr-refresh-btn" class="vr-btn">🔄 Endurnýja</button>
          <span class="vr-period-label" id="vr-period-lbl"></span>
        </div>
        <div id="vr-cards" class="vr-cards"></div>
        <div id="vr-form-inner"></div>
      </div>
      </main>`;
  }

  // ── View injection ─────────────────────────────────────────────────────────
  function ensureView() {
    if (document.getElementById(VIEW_ID)) return;
    const views = document.querySelectorAll('.view');
    if (!views.length) return;
    const last = views[views.length - 1];
    const view = document.createElement('section');
    view.id = VIEW_ID;
    view.className = 'view';
    view.innerHTML = buildViewHTML();
    last.parentNode.insertBefore(view, last.nextSibling);

    document.getElementById('vr-csv-btn').addEventListener('click', exportCSV);
    document.getElementById('vr-print-btn').addEventListener('click', () => window.print());
    document.getElementById('vr-refresh-btn').addEventListener('click', async () => {
      document.getElementById('vr-refresh-btn').textContent = '🔄 Hleður…';
      await load(); render();
      document.getElementById('vr-refresh-btn').textContent = '🔄 Endurnýja';
    });
    document.querySelectorAll('#'+VIEW_ID+' .vr-preset').forEach(b => {
      b.addEventListener('click', () => { setPreset(b.dataset.preset); applyFilters(); render(); });
    });
    const onChange = () => {
      fromDate = document.getElementById('vr-from')?.value || '';
      toDate = document.getElementById('vr-to')?.value || '';
      activePreset = 'custom';
      document.querySelectorAll('#'+VIEW_ID+' .vr-preset').forEach(b => b.classList.remove('active'));
      applyFilters(); render();
    };
    document.getElementById('vr-from')?.addEventListener('change', onChange);
    document.getElementById('vr-to')?.addEventListener('change', onChange);
  }

  function ensureNavButton() {
    if (document.querySelector('[data-vsk-report]')) return;
    const tekjurBtn = Array.from(document.querySelectorAll('.vnav-btn')).find(b => /Tekjur/i.test(b.textContent));
    if (!tekjurBtn || !tekjurBtn.parentElement) return;
    const btn = document.createElement('button');
    btn.className = 'vnav-btn';
    btn.setAttribute('data-vsk-report', '1');
    btn.setAttribute('data-view', 'vsk-report');
    btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>VSK skýrsla`;
    btn.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); switchToView(); });
    tekjurBtn.parentElement.insertBefore(btn, tekjurBtn.nextSibling);
  }

  async function switchToView() {
    ensureView();
    document.querySelectorAll('.view.active').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.vnav-btn.active').forEach(b => b.classList.remove('active'));
    const view = document.getElementById(VIEW_ID);
    if (view) view.classList.add('active');
    const btn = document.querySelector('[data-vsk-report]');
    if (btn) btn.classList.add('active');
    await load();
    setPreset(activePreset);
    render();
    const lbl = document.getElementById('vr-period-lbl');
    if (lbl) lbl.textContent = periodLabel();
  }

  ensureView();
  ensureNavButton();
  setTimeout(() => { ensureView(); ensureNavButton(); }, 600);
  setTimeout(() => { ensureView(); ensureNavButton(); }, 2000);
  const obs = new MutationObserver(() => { ensureView(); ensureNavButton(); });
  obs.observe(document.body, { childList: true, subtree: true });

  window.VskReport = { open: switchToView };
  console.log('[vsk-report] installed');
})();
/* === END VSK SKÝRSLA === */
