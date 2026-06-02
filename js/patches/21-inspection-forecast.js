/* === INSPECTION FORECAST v1 === */
/* "Þjónustuáætlun" — projects expected inspection revenue from upcoming
 * next_insp dates across all service units (þjonustutaeki table).
 *
 * No schema changes required — reads existing next_insp column.
 *
 * Features:
 *  • Nav button "📅 Þjónustuáætlun" in the sidebar
 *  • 12-month bar chart (SVG, no external libs) + summary cards
 *  • Table of all upcoming inspections per company with expected revenue
 *  • Average revenue per inspection pre-filled from last 6 months of solur data
 *    (editable override via a settings input)
 *  • CSV export
 */
(() => {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (window.__inspForecastInstalled) return;
  window.__inspForecastInstalled = true;

  const VIEW_ID = 'view-insp-forecast';

  function getSB() {
    return (window.DB && window.DB.sb) || null;
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c =>
      ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }
  function fmtKr(n) {
    return Math.round(n).toLocaleString('is-IS') + ' kr';
  }
  function fmtDate(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d)) return '';
    return d.getDate() + '.' + (d.getMonth()+1) + '.' + d.getFullYear();
  }
  const MONTHS_IS = ['Jan','Feb','Mar','Apr','Maí','Jún','Júl','Ágú','Sep','Okt','Nóv','Des'];

  // ── Styles ───────────────────────────────────────────────────────────────
  if (!document.getElementById('if-style')) {
    const s = document.createElement('style');
    s.id = 'if-style';
    s.textContent = `
      #${VIEW_ID} { padding: 0; overflow-y: auto; }
      #${VIEW_ID} .if-wrap { max-width: 1200px; margin: 0 auto; padding: 20px 16px 40px; }
      #${VIEW_ID} .if-header { display: flex; justify-content: space-between; align-items: flex-end; gap: 16px; margin-bottom: 18px; flex-wrap: wrap; }
      #${VIEW_ID} .if-header h1 { margin: 0; font-size: 22px; font-weight: 800; }
      #${VIEW_ID} .if-sub { font-size: 12px; color: #64748b; margin-top: 4px; }
      #${VIEW_ID} .if-cards { display: grid; grid-template-columns: repeat(auto-fit,minmax(160px,1fr)); gap: 10px; margin-bottom: 20px; }
      #${VIEW_ID} .if-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px 16px; }
      #${VIEW_ID} .if-card .lbl { font-size: 10px; color: #64748b; font-weight: 700; text-transform: uppercase; letter-spacing: .05em; }
      #${VIEW_ID} .if-card .val { font-size: 22px; font-weight: 800; margin-top: 4px; color: #0f172a; }
      #${VIEW_ID} .if-card .sub { font-size: 11px; color: #64748b; margin-top: 2px; }
      #${VIEW_ID} .if-card.accent { background: #eff6ff; border-color: #bfdbfe; }
      #${VIEW_ID} .if-card.accent .val { color: #1d4ed8; }
      #${VIEW_ID} .if-card.green { background: #f0fdf4; border-color: #bbf7d0; }
      #${VIEW_ID} .if-card.green .val { color: #16a34a; }

      #${VIEW_ID} .if-settings {
        background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px;
        padding: 10px 14px; margin-bottom: 16px; display: flex; gap: 16px; align-items: center; flex-wrap: wrap;
      }
      #${VIEW_ID} .if-settings label { font-size: 12px; color: #64748b; font-weight: 600; }
      #${VIEW_ID} .if-amt-input {
        padding: 6px 10px; border: 1px solid #cbd5e1; border-radius: 7px;
        font: inherit; font-size: 13px; width: 120px;
      }
      #${VIEW_ID} .if-months-input {
        padding: 6px 10px; border: 1px solid #cbd5e1; border-radius: 7px;
        font: inherit; font-size: 13px; width: 80px;
      }
      #${VIEW_ID} .if-actions { display: flex; gap: 8px; margin-bottom: 14px; }
      #${VIEW_ID} .if-btn {
        padding: 8px 14px; background: #fff; border: 1px solid #cbd5e1;
        border-radius: 8px; font: inherit; font-size: 13px; cursor: pointer; color: #334155;
      }
      #${VIEW_ID} .if-btn:hover { background: #f1f5f9; }
      #${VIEW_ID} .if-btn.primary { background: #2563eb; color: #fff; border-color: #2563eb; }
      #${VIEW_ID} .if-btn.primary:hover { background: #1d4ed8; }

      #${VIEW_ID} .if-chart-wrap {
        background: #fff; border: 1px solid #e2e8f0; border-radius: 12px;
        padding: 16px; margin-bottom: 18px; overflow: hidden;
      }
      #${VIEW_ID} .if-chart-title { font-size: 13px; font-weight: 700; color: #334155; margin-bottom: 12px; }
      #${VIEW_ID} .if-chart svg { width: 100%; display: block; }

      #${VIEW_ID} .if-table-wrap {
        background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;
      }
      #${VIEW_ID} table.if-table { width: 100%; border-collapse: collapse; font-size: 13px; }
      #${VIEW_ID} .if-table thead th {
        background: #f8fafc; text-align: left; padding: 9px 12px;
        font-size: 10px; font-weight: 700; color: #475569;
        text-transform: uppercase; letter-spacing: .04em; border-bottom: 1px solid #e2e8f0;
      }
      #${VIEW_ID} .if-table td { padding: 8px 12px; border-bottom: 1px solid #f1f5f9; }
      #${VIEW_ID} .if-table tr:last-child td { border-bottom: none; }
      #${VIEW_ID} .if-urg { color: #dc2626; font-weight: 700; }
      #${VIEW_ID} .if-near { color: #d97706; font-weight: 600; }
      #${VIEW_ID} .if-ok { color: #16a34a; }
      #${VIEW_ID} .if-empty { padding: 40px; text-align: center; color: #94a3b8; font-style: italic; }
    `;
    document.head.appendChild(s);
  }

  // ── Data ─────────────────────────────────────────────────────────────────
  let units = [];
  let avgRevPerInsp = parseInt(localStorage.getItem('if_avg_rev') || '0', 10) || 15000;
  let lookAheadMonths = 12;

  async function load() {
    const SB = getSB();
    if (!SB) return;

    // Load service units with next_insp
    const unitData = await DB.fetchAll((from, to) => SB
      .from('uttaeki')
      .select('id,serial,type,size,client,next_insp,location')
      .not('next_insp', 'is', null)
      .order('next_insp', { ascending: true })
      .range(from, to));  // uttaeki has >1000 rows — page through the Supabase cap

    units = (unitData || []).map(u => ({
      id: u.id,
      serial: u.serial || '',
      tegund: u.type || '',
      company_id: null,
      company: u.client || '—',
      next_insp: u.next_insp,
      stadsetning: u.location || ''
    }));

    // Try to compute average from recent sales if not manually set
    if (!localStorage.getItem('if_avg_rev')) {
      try {
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        const { data: salesData } = await SB
          .from('solur')
          .select('samtals')
          .gte('created_at', sixMonthsAgo.toISOString());
        if (salesData && salesData.length > 5) {
          const total = salesData.reduce((a, s) => a + (+(s.samtals) || 0), 0);
          avgRevPerInsp = Math.round(total / salesData.length);
          localStorage.setItem('if_avg_rev', String(avgRevPerInsp));
        }
      } catch (_) {}
    }
  }

  // ── Build forecast bucketed by month ─────────────────────────────────────
  function buildMonthBuckets() {
    const now = new Date();
    const buckets = [];
    for (let i = 0; i < lookAheadMonths; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      buckets.push({ year: d.getFullYear(), month: d.getMonth(), label: MONTHS_IS[d.getMonth()] + ' ' + d.getFullYear(), items: [] });
    }
    const endDate = new Date(now.getFullYear(), now.getMonth() + lookAheadMonths, 1);
    for (const u of units) {
      const d = new Date(u.next_insp);
      if (isNaN(d) || d < now || d >= endDate) continue;
      const bIdx = (d.getFullYear() - now.getFullYear()) * 12 + d.getMonth() - now.getMonth();
      if (bIdx >= 0 && bIdx < buckets.length) buckets[bIdx].items.push(u);
    }
    return buckets;
  }

  // ── SVG bar chart ─────────────────────────────────────────────────────────
  function renderChart(buckets) {
    const W = 900, H = 180, PAD = { top: 10, right: 10, bottom: 40, left: 60 };
    const counts = buckets.map(b => b.items.length);
    const maxCount = Math.max(...counts, 1);
    const barW = Math.floor((W - PAD.left - PAD.right) / buckets.length);
    const chartH = H - PAD.top - PAD.bottom;

    let bars = '';
    let labels = '';
    let countLabels = '';
    buckets.forEach((b, i) => {
      const x = PAD.left + i * barW;
      const barHeight = Math.max(b.items.length / maxCount * chartH, b.items.length ? 3 : 0);
      const y = PAD.top + chartH - barHeight;
      const revenue = b.items.length * avgRevPerInsp;
      const isNow = i === 0;
      const color = isNow ? '#3b82f6' : b.items.length > 5 ? '#16a34a' : '#60a5fa';
      bars += `<rect x="${x+2}" y="${y}" width="${barW-4}" height="${barHeight}" fill="${color}" rx="3" opacity="0.85">
        <title>${b.label}: ${b.items.length} tæki — ${fmtKr(revenue)}</title></rect>`;
      labels += `<text x="${x + barW/2}" y="${H - 5}" text-anchor="middle" font-size="10" fill="#64748b">${b.label.split(' ')[0]}</text>`;
      if (b.items.length > 0) {
        countLabels += `<text x="${x + barW/2}" y="${y - 4}" text-anchor="middle" font-size="10" fill="${color}" font-weight="700">${b.items.length}</text>`;
      }
    });

    // Y axis labels
    let yLabels = '';
    for (let tick = 0; tick <= 5; tick++) {
      const v = Math.round(maxCount * tick / 5);
      const y = PAD.top + chartH - (tick/5 * chartH);
      yLabels += `<line x1="${PAD.left}" y1="${y}" x2="${W - PAD.right}" y2="${y}" stroke="#f1f5f9" stroke-width="1"/>`;
      yLabels += `<text x="${PAD.left - 6}" y="${y + 4}" text-anchor="end" font-size="10" fill="#94a3b8">${v}</text>`;
    }

    return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
      ${yLabels}${bars}${countLabels}${labels}
    </svg>`;
  }

  // ── Render table ──────────────────────────────────────────────────────────
  function renderTable(buckets) {
    const now = new Date();
    const upcoming = units.filter(u => {
      const d = new Date(u.next_insp);
      if (isNaN(d)) return false;
      const end = new Date(now.getFullYear(), now.getMonth() + lookAheadMonths, 1);
      return d >= now && d < end;
    });
    if (!upcoming.length) return '<div class="if-empty">Engar þjónustuskoðanir á næstu ' + lookAheadMonths + ' mánuðum</div>';

    const rows = upcoming.map(u => {
      const d = new Date(u.next_insp);
      const daysAway = Math.ceil((d - now) / 86400000);
      let cls = 'if-ok';
      if (daysAway <= 14) cls = 'if-urg';
      else if (daysAway <= 45) cls = 'if-near';
      return `<tr>
        <td class="${cls}">${esc(fmtDate(u.next_insp))}</td>
        <td class="${cls}" style="font-weight:600;">${daysAway}d</td>
        <td>${esc(u.company)}</td>
        <td>${esc(u.tegund)}</td>
        <td>${esc(u.serial)}</td>
        <td>${esc(u.stadsetning)}</td>
        <td style="text-align:right;font-weight:600;">${esc(fmtKr(avgRevPerInsp))}</td>
      </tr>`;
    }).join('');
    return `<table class="if-table">
      <thead><tr>
        <th>Næsta skoðun</th><th>Eftir</th><th>Fyrirtæki</th>
        <th>Tegund</th><th>Raðnúmer</th><th>Staðsetning</th>
        <th style="text-align:right;">Virt tekjur</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
  }

  // ── Render all ────────────────────────────────────────────────────────────
  function render() {
    const view = document.getElementById(VIEW_ID);
    if (!view || !view.classList.contains('active')) return;
    const buckets = buildMonthBuckets();
    const totalUnits = buckets.reduce((a, b) => a + b.items.length, 0);
    const totalRevenue = totalUnits * avgRevPerInsp;
    const nearCount = units.filter(u => {
      const d = new Date(u.next_insp);
      const days = Math.ceil((d - new Date()) / 86400000);
      return days >= 0 && days <= 30;
    }).length;

    const wrap = view.querySelector('.if-wrap');
    if (!wrap) return;
    wrap.querySelector('#if-cards').innerHTML = `
      <div class="if-card accent">
        <div class="lbl">Skoðanir næstu ${lookAheadMonths} mán.</div>
        <div class="val">${totalUnits}</div>
        <div class="sub">þjónustutæki</div>
      </div>
      <div class="if-card green">
        <div class="lbl">Virt tekjur</div>
        <div class="val">${fmtKr(totalRevenue)}</div>
        <div class="sub">á ${lookAheadMonths} mánuðum</div>
      </div>
      <div class="if-card${nearCount > 0 ? '' : ''}">
        <div class="lbl">Á næsta mánuð</div>
        <div class="val" style="${nearCount > 0 ? 'color:#d97706' : ''}">${nearCount}</div>
        <div class="sub">tæki</div>
      </div>
      <div class="if-card">
        <div class="lbl">Meðaltekjur/tæki</div>
        <div class="val">${fmtKr(avgRevPerInsp)}</div>
        <div class="sub">stillt</div>
      </div>
    `;
    wrap.querySelector('#if-chart-inner').innerHTML = renderChart(buckets);
    wrap.querySelector('#if-table-inner').innerHTML = renderTable(buckets);
    // Sync input
    const inp = wrap.querySelector('#if-avg-inp');
    if (inp) inp.value = avgRevPerInsp;
    const mInp = wrap.querySelector('#if-months-inp');
    if (mInp) mInp.value = lookAheadMonths;
  }

  // ── Build view HTML ───────────────────────────────────────────────────────
  function buildViewHTML() {
    return `
      <main class="main-panel" style="overflow-y:auto;">
      <div class="if-wrap">
        <div class="if-header">
          <div>
            <h1>📅 Þjónustuáætlun</h1>
            <div class="if-sub">Áætlaðar tekjur af komandi þjónustuskoðunum á næstu mánuðum</div>
          </div>
        </div>
        <div class="if-settings">
          <label>Meðaltekjur á skoðun (kr):</label>
          <input id="if-avg-inp" type="number" class="if-amt-input" value="${avgRevPerInsp}" min="0" step="1000">
          <label style="margin-left:8px;">Líta fram (mánuðir):</label>
          <input id="if-months-inp" type="number" class="if-months-input" value="${lookAheadMonths}" min="1" max="36">
          <button id="if-apply-btn" class="if-btn primary" style="margin-left:4px;">Uppfæra</button>
        </div>
        <div id="if-cards" class="if-cards"></div>
        <div class="if-chart-wrap">
          <div class="if-chart-title">Dreifing skoðana eftir mánuðum</div>
          <div id="if-chart-inner" class="if-chart"></div>
        </div>
        <div class="if-actions">
          <button id="if-csv-btn" class="if-btn primary">📥 Sækja CSV</button>
          <button id="if-refresh-btn" class="if-btn">🔄 Endurnýja</button>
        </div>
        <div class="if-table-wrap">
          <div id="if-table-inner"></div>
        </div>
      </div>
      </main>`;
  }

  // ── CSV export ────────────────────────────────────────────────────────────
  function exportCSV() {
    const now = new Date();
    const end = new Date(now.getFullYear(), now.getMonth() + lookAheadMonths, 1);
    const upcoming = units.filter(u => {
      const d = new Date(u.next_insp);
      return !isNaN(d) && d >= now && d < end;
    });
    const header = ['Dagsetning','Fyrirtæki','Tegund','Raðnúmer','Staðsetning','Virt tekjur'];
    const rows = upcoming.map(u => [
      u.next_insp, u.company, u.tegund, u.serial, u.stadsetning,
      String(avgRevPerInsp).replace('.', ',')
    ]);
    const sep = ';';
    const csv = '﻿' + [header.join(sep), ...rows.map(r => r.map(v => {
      const s = String(v == null ? '' : v);
      return /[;";\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    }).join(sep))].join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'þjonustuaetlun.csv';
    document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
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

    const wrap = view.querySelector('.if-wrap');
    wrap.querySelector('#if-apply-btn').addEventListener('click', () => {
      const v = parseInt(wrap.querySelector('#if-avg-inp').value, 10);
      const m = parseInt(wrap.querySelector('#if-months-inp').value, 10);
      if (v > 0) { avgRevPerInsp = v; localStorage.setItem('if_avg_rev', String(v)); }
      if (m > 0 && m <= 36) lookAheadMonths = m;
      render();
    });
    wrap.querySelector('#if-csv-btn').addEventListener('click', exportCSV);
    wrap.querySelector('#if-refresh-btn').addEventListener('click', async () => {
      wrap.querySelector('#if-refresh-btn').textContent = '🔄 Hleður…';
      await load(); render();
      wrap.querySelector('#if-refresh-btn').textContent = '🔄 Endurnýja';
    });
  }

  function ensureNavButton() {
    if (document.querySelector('[data-insp-forecast]')) return;
    const fieldBtn = Array.from(document.querySelectorAll('.vnav-btn'))
      .find(b => /Þjónustutæki/i.test(b.textContent));
    if (!fieldBtn || !fieldBtn.parentElement) return;
    const btn = document.createElement('button');
    btn.className = 'vnav-btn';
    btn.setAttribute('data-insp-forecast', '1');
    btn.setAttribute('data-view', 'insp-forecast');
    btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>Þjónustuáætlun`;
    btn.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); switchToView(); });
    fieldBtn.parentElement.insertBefore(btn, fieldBtn.nextSibling);
  }

  function switchToView() {
    ensureView();
    document.querySelectorAll('.view.active').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.vnav-btn.active').forEach(b => b.classList.remove('active'));
    const view = document.getElementById(VIEW_ID);
    if (view) { view.classList.add('active'); }
    const btn = document.querySelector('[data-insp-forecast]');
    if (btn) btn.classList.add('active');
    setTimeout(async () => { await load(); render(); }, 50);
  }

  ensureView();
  ensureNavButton();
  setTimeout(() => { ensureView(); ensureNavButton(); }, 600);
  setTimeout(() => { ensureView(); ensureNavButton(); }, 2000);
  const navObs = new MutationObserver(() => { ensureView(); ensureNavButton(); });
  navObs.observe(document.body, { childList: true, subtree: true });

  window.InspForecast = { open: switchToView, refresh: async () => { await load(); render(); } };
  console.log('[inspection-forecast] installed');
})();
/* === END INSPECTION FORECAST === */
