/* === HREYFINGARLISTI v1 ===
 *
 * Tímaröð yfir allar hreyfingar í `solur`: sölur + kreditfærslur, með
 * mánaðar-nav, samantekt og CSV útflutningi. Útvíkkar Bókhalds yfirlit
 * með einföldu ledger-flæði — eitt línur per færsla, raðað eftir tíma.
 *
 * Sidebar entry "📜 Hreyfingarlisti" rétt fyrir neðan Bókhalds yfirlit.
 */
(() => {
  if (window.__hreyfingarlistiInstalled) return;
  window.__hreyfingarlistiInstalled = true;

  const VIEW_ID = 'view-hreyfingarlisti';
  const NAV_KEY = 'hreyfingarlisti';

  function getSB() { return (window.DB && window.DB.sb) || null; }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c =>
      ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }
  function fmtKr(n) {
    const v = Math.round(Number(n) || 0);
    const neg = v < 0;
    return (neg ? '−' : '') + Math.abs(v).toLocaleString('is-IS').replace(/,/g, '.') + ' kr';
  }
  function fmtDate(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    if (isNaN(d)) return '—';
    return String(d.getDate()).padStart(2,'0') + '/' + String(d.getMonth()+1).padStart(2,'0') + '/' + d.getFullYear();
  }
  function fmtTime(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d)) return '';
    return String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0');
  }
  function methodLabel(m) {
    if (m === 'kort') return '💳 Kort';
    if (m === 'pening' || m === 'reidufe' || m === 'peningar') return '💵 Reiðufé';
    if (m === 'reikningur') return '📋 Reikningur';
    if (m === 'greitt_sidar') return '⏳ Greitt síðar';
    return esc(m || '—');
  }

  // ── Sidebar entry ────────────────────────────────────────────────────────
  function injectNav() {
    const nav = document.querySelector('nav.view-nav, .view-nav');
    if (!nav) { setTimeout(injectNav, 500); return; }
    if (nav.querySelector('[data-view="' + NAV_KEY + '"]')) return;
    const byBtn = Array.from(nav.querySelectorAll('.vnav-btn'))
      .find(b => /Bókhalds yfirlit|Bokhalds yfirlit/.test(b.textContent || ''));
    const tpl = byBtn || nav.querySelector('.vnav-btn');
    if (!tpl) { setTimeout(injectNav, 500); return; }
    const btn = document.createElement('button');
    btn.className = (tpl.className || 'vnav-btn').replace(/\bactive\b/g, '').trim();
    btn.setAttribute('data-view', NAV_KEY);
    btn.innerHTML = '<span style="margin-right:6px">📜</span>Hreyfingarlisti';
    btn.style.display = 'flex';
    btn.style.alignItems = 'center';
    btn.addEventListener('click', e => {
      e.preventDefault(); e.stopPropagation();
      if (window.App && App.switchView) App.switchView(NAV_KEY);
      else show();
    });
    if (byBtn && byBtn.parentNode) byBtn.parentNode.insertBefore(btn, byBtn.nextSibling);
    else nav.appendChild(btn);
  }

  // ── View container ───────────────────────────────────────────────────────
  function ensureView() {
    if (document.getElementById(VIEW_ID)) return;
    const sample = document.getElementById('view-counter') || document.getElementById('view-sala');
    if (!sample || !sample.parentElement) return;
    const v = document.createElement('div');
    v.id = VIEW_ID;
    v.className = sample.className.replace(/\bactive\b/g, '').trim();
    v.innerHTML = '<main id="hr-main" class="main-panel"></main>';
    sample.parentElement.appendChild(v);
  }

  function patchSwitchView() {
    if (!window.App || window.App._hrSwitchPatched) return;
    const orig = window.App.switchView;
    window.App.switchView = function (view) {
      if (view === NAV_KEY) {
        ensureView();
        document.querySelectorAll('[id^="view-"]').forEach(v => {
          v.style.display = 'none';
          v.classList.remove('active');
        });
        const v = document.getElementById(VIEW_ID);
        if (v) { v.style.display = 'block'; v.classList.add('active'); }
        document.querySelectorAll('.vnav-btn').forEach(b => b.classList.toggle('active', b.dataset.view === NAV_KEY));
        load();
        return;
      }
      return orig.apply(this, arguments);
    };
    window.App._hrSwitchPatched = true;
  }

  // ── Data load ────────────────────────────────────────────────────────────
  let _state = { month: null, all: [], filter: 'all' };

  function monthBounds(d) {
    const start = new Date(d.getFullYear(), d.getMonth(), 1);
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    return { start, end };
  }

  async function load(filterMonth) {
    const main = document.getElementById('hr-main');
    if (!main) return;
    main.innerHTML = '<div style="padding:32px;text-align:center;color:#94a3b8">Hleður hreyfingum…</div>';
    const SB = getSB();
    if (!SB) { main.innerHTML = '<div style="padding:32px;color:#dc2626">Engin gagnabankatenging.</div>'; return; }

    const m = filterMonth || _state.month || new Date();
    _state.month = m;
    const { start, end } = monthBounds(m);

    const r = await SB.from('solur')
      .select('id,num,customer_nafn,customer_id,samtals,upphaed_an_vsk,vsk_upphaed,greitt_med,athugasemdir,created_at,paid_at,is_credit,credit_of,starfsmadur')
      .gte('created_at', start.toISOString())
      .lt('created_at', end.toISOString())
      .order('created_at', { ascending: false });
    if (r.error) { main.innerHTML = '<div style="padding:32px;color:#dc2626">Villa: ' + esc(r.error.message) + '</div>'; return; }
    _state.all = r.data || [];

    render();
  }

  // ── Render ───────────────────────────────────────────────────────────────
  function applyFilter(rows) {
    if (_state.filter === 'paid')   return rows.filter(r => r.paid_at && !r.is_credit);
    if (_state.filter === 'unpaid') return rows.filter(r => !r.paid_at && !r.is_credit);
    if (_state.filter === 'credit') return rows.filter(r => r.is_credit);
    return rows;
  }

  function render() {
    const main = document.getElementById('hr-main');
    if (!main) return;

    const all = _state.all;
    const rows = applyFilter(all);

    // Totals computed against the FULL month, not the filter — gives a stable
    // picture of the month while the chips slice the visible list.
    let sales = 0, credits = 0, paidIn = 0, unpaidOut = 0;
    all.forEach(s => {
      const total = +s.samtals || 0;
      if (s.is_credit) credits += Math.abs(total);
      else {
        sales += total;
        if (s.paid_at) paidIn += total;
        else if (s.greitt_med === 'greitt_sidar' || s.greitt_med === 'reikningur') unpaidOut += total;
      }
    });
    const net = sales - credits;

    const monthLabel = _state.month.getFullYear() + ' · ' +
      ['Janúar','Febrúar','Mars','Apríl','Maí','Júní','Júlí','Ágúst','September','Október','Nóvember','Desember'][_state.month.getMonth()];

    const chipDef = [
      ['all',    'Allt',       all.length],
      ['paid',   'Greitt',     all.filter(r => r.paid_at && !r.is_credit).length],
      ['unpaid', 'Ógreitt',    all.filter(r => !r.paid_at && !r.is_credit).length],
      ['credit', 'Kredit',     all.filter(r => r.is_credit).length]
    ];

    main.innerHTML = `
      <div style="max-width:1200px;margin:0 auto;padding:22px">

        <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:14px;margin-bottom:18px">
          <div>
            <h1 style="margin:0;font-size:22px;color:#0f172a;display:flex;align-items:center;gap:10px">📜 Hreyfingarlisti</h1>
            <div style="font-size:12px;color:#64748b;margin-top:2px">Tímaröð yfir allar færslur — sölur og kreditfærslur</div>
          </div>
          <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
            <button class="_hr-prev" type="button" style="padding:7px 11px;border:1px solid #cbd5e1;border-radius:7px;background:#fff;cursor:pointer;font:inherit;font-size:13px">◀</button>
            <div style="font-size:13px;font-weight:700;color:#0f172a;padding:0 8px;min-width:140px;text-align:center">${esc(monthLabel)}</div>
            <button class="_hr-next" type="button" style="padding:7px 11px;border:1px solid #cbd5e1;border-radius:7px;background:#fff;cursor:pointer;font:inherit;font-size:13px">▶</button>
            <button class="_hr-csv" type="button" style="padding:7px 12px;border:1px solid #cbd5e1;border-radius:7px;background:#fff;cursor:pointer;font:inherit;font-size:12px;font-weight:600;color:#475569;margin-left:6px">📥 CSV</button>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px;margin-bottom:18px">
          ${statCard('Sölur', sales, '#1d4ed8', '#dbeafe', '💰')}
          ${statCard('Kreditfært', -credits, '#dc2626', '#fee2e2', '↩️')}
          ${statCard('Greitt í mán.', paidIn, '#16a34a', '#dcfce7', '✓')}
          ${statCard('Ógreitt', unpaidOut, '#b45309', '#fef3c7', '⏳')}
          ${statCard('Nettó', net, net >= 0 ? '#0f172a' : '#dc2626', '#f1f5f9', 'Σ')}
        </div>

        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px">
          ${chipDef.map(([k, label, n]) => {
            const on = _state.filter === k;
            return `<button class="_hr-chip" data-k="${k}" type="button"
              style="padding:6px 12px;border:1px solid ${on ? '#0f172a' : '#cbd5e1'};
                background:${on ? '#0f172a' : '#fff'};color:${on ? '#fff' : '#475569'};
                border-radius:99px;cursor:pointer;font:inherit;font-size:12px;font-weight:600">
              ${esc(label)} <span style="opacity:.65;font-weight:500">${n}</span></button>`;
          }).join('')}
        </div>

        <div style="background:#fff;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden">
          <table style="width:100%;border-collapse:collapse;font-size:13px">
            <thead><tr style="background:#f8fafc;border-bottom:1px solid #e2e8f0">
              <th style="padding:9px 10px;text-align:left;font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.05em">Dags · Tími</th>
              <th style="padding:9px 10px;text-align:left;font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.05em">Skjal</th>
              <th style="padding:9px 10px;text-align:left;font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.05em">Viðskiptavinur</th>
              <th style="padding:9px 10px;text-align:left;font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.05em">Tegund</th>
              <th style="padding:9px 10px;text-align:left;font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.05em">Greiðslumáti</th>
              <th style="padding:9px 10px;text-align:left;font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.05em">Staða</th>
              <th style="padding:9px 10px;text-align:right;font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.05em">Upphæð</th>
              <th style="padding:9px 10px"></th>
            </tr></thead>
            <tbody>
              ${rows.length
                ? rows.map(rowHtml).join('')
                : '<tr><td colspan="8" style="padding:30px;text-align:center;color:#94a3b8;font-style:italic">Engar hreyfingar á þessu tímabili</td></tr>'}
            </tbody>
          </table>
        </div>

      </div>`;

    main.querySelector('._hr-prev')?.addEventListener('click', () => {
      const m = new Date(_state.month); m.setMonth(m.getMonth() - 1); load(m);
    });
    main.querySelector('._hr-next')?.addEventListener('click', () => {
      const m = new Date(_state.month); m.setMonth(m.getMonth() + 1); load(m);
    });
    main.querySelector('._hr-csv')?.addEventListener('click', exportCSV);
    main.querySelectorAll('._hr-chip').forEach(c => {
      c.addEventListener('click', () => { _state.filter = c.dataset.k; render(); });
    });
    main.querySelectorAll('._hr-view').forEach(b => {
      b.addEventListener('click', () => openInvoice(b.dataset.id));
    });
  }

  function statCard(label, value, color, bg, icon) {
    return `<div style="background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:12px 14px;display:flex;align-items:center;gap:10px">
      <div style="width:34px;height:34px;border-radius:8px;background:${bg};color:${color};display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:700;flex-shrink:0">${icon}</div>
      <div style="min-width:0">
        <div style="font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:.05em;font-weight:600">${esc(label)}</div>
        <div style="font-size:17px;font-weight:800;color:${color};font-variant-numeric:tabular-nums">${esc(fmtKr(value))}</div>
      </div>
    </div>`;
  }

  function rowHtml(s) {
    const isCredit = !!s.is_credit;
    const isInvoice = (s.greitt_med === 'greitt_sidar' || s.greitt_med === 'reikningur');
    const isPaid = !!s.paid_at;
    const total = +s.samtals || 0;

    const typeBadge = isCredit
      ? '<span style="font-size:10px;font-weight:700;background:#fee2e2;color:#991b1b;padding:2px 8px;border-radius:99px">↩ Kredit</span>'
      : '<span style="font-size:10px;font-weight:700;background:#dbeafe;color:#1e40af;padding:2px 8px;border-radius:99px">Sala</span>';

    const status = isCredit
      ? '<span style="color:#991b1b;font-size:11px">—</span>'
      : isPaid
        ? '<span style="font-size:10px;font-weight:700;background:#dcfce7;color:#166534;padding:2px 8px;border-radius:99px">✓ Greitt</span>'
        : isInvoice
          ? '<span style="font-size:10px;font-weight:700;background:#fef3c7;color:#92400e;padding:2px 8px;border-radius:99px">⚠ Ógreitt</span>'
          : '<span style="font-size:10px;font-weight:700;background:#f1f5f9;color:#64748b;padding:2px 8px;border-radius:99px">—</span>';

    const amountCol = isCredit
      ? `<span style="color:#dc2626;font-weight:700;font-variant-numeric:tabular-nums">${esc(fmtKr(-Math.abs(total)))}</span>`
      : `<span style="color:#0f172a;font-weight:700;font-variant-numeric:tabular-nums">${esc(fmtKr(total))}</span>`;

    return `<tr style="border-bottom:1px solid #f1f5f9">
      <td style="padding:8px 10px;font-size:12px;color:#475569;white-space:nowrap">
        ${esc(fmtDate(s.created_at))}<span style="color:#94a3b8;margin-left:5px">${esc(fmtTime(s.created_at))}</span>
      </td>
      <td style="padding:8px 10px;font-family:monospace;font-size:11.5px;color:#0f172a;font-weight:600">${esc(s.num || '')}</td>
      <td style="padding:8px 10px;font-size:12.5px;color:#0f172a">${esc(s.customer_nafn || '—')}</td>
      <td style="padding:8px 10px">${typeBadge}</td>
      <td style="padding:8px 10px;font-size:11.5px;color:#475569">${methodLabel(s.greitt_med)}</td>
      <td style="padding:8px 10px">${status}</td>
      <td style="padding:8px 10px;text-align:right">${amountCol}</td>
      <td style="padding:8px 10px;text-align:right">
        <button class="_hr-view" data-id="${s.id}" type="button" title="Skoða reikning"
          style="padding:4px 8px;background:#fff;color:#1d4ed8;border:1px solid #bfdbfe;border-radius:5px;cursor:pointer;font:inherit;font-size:11px">🖨</button>
      </td>
    </tr>`;
  }

  // ── View invoice (same pattern as Til að rukka / Kröfu yfirlit) ──────────
  async function openInvoice(saleId) {
    const SB = getSB();
    if (!SB) return;
    if (!window.SalaInvoice || typeof SalaInvoice.renderFromSale !== 'function') {
      alert('Reikningsmótið er ekki tiltækt.'); return;
    }
    const w = window.open('', '_blank', 'width=900,height=1100');
    if (!w) { alert('Vinsamlegast leyfðu sprettiglugga til að prenta.'); return; }
    const r = await SB.from('solur').select('*').eq('id', saleId).single();
    if (r.error || !r.data) { w.close(); alert('Salan fannst ekki.'); return; }
    const sale = r.data;
    let cust = null;
    if (sale.customer_id) {
      const c1 = await SB.from('fyrirtaeki').select('kennitala,heimilisfang').eq('id', sale.customer_id).maybeSingle();
      if (c1.data) cust = c1.data;
      if (!cust) {
        const c2 = await SB.from('vidskiptavinir').select('kennitala,heimilisfang').eq('id', sale.customer_id).maybeSingle();
        if (c2.data) cust = c2.data;
      }
    }
    SalaInvoice.renderFromSale(w, sale, cust);
  }

  // ── CSV export ──────────────────────────────────────────────────────────
  function exportCSV() {
    const rows = applyFilter(_state.all);
    const header = ['Dags','Tími','Skjal','Viðskiptavinur','Tegund','Greiðslumáti','Staða','Án VSK','VSK','Samtals','Starfsmaður','Athugasemdir'];
    const lines = [header];
    rows.forEach(s => {
      const isCredit = !!s.is_credit;
      const isInvoice = (s.greitt_med === 'greitt_sidar' || s.greitt_med === 'reikningur');
      const isPaid = !!s.paid_at;
      const status = isCredit ? 'Kredit' : isPaid ? 'Greitt' : isInvoice ? 'Ógreitt' : '';
      const total = +s.samtals || 0;
      lines.push([
        fmtDate(s.created_at),
        fmtTime(s.created_at),
        s.num || '',
        s.customer_nafn || '',
        isCredit ? 'Kreditfærsla' : 'Sala',
        s.greitt_med || '',
        status,
        Math.round(+s.upphaed_an_vsk || 0),
        Math.round(+s.vsk_upphaed || 0),
        isCredit ? -Math.abs(Math.round(total)) : Math.round(total),
        s.starfsmadur || '',
        s.athugasemdir || ''
      ]);
    });
    const csv = '﻿' + lines.map(r => r.map(c => '"' + String(c == null ? '' : c).replace(/"/g, '""') + '"').join(';')).join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const monthSlug = _state.month.getFullYear() + '-' + String(_state.month.getMonth()+1).padStart(2,'0');
    a.href = url;
    a.download = 'Hreyfingarlisti_' + monthSlug + '.csv';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 200);
  }

  function show() {
    ensureView();
    if (window.App && App.switchView) App.switchView(NAV_KEY);
    else load();
  }

  injectNav();
  setTimeout(injectNav, 1000);
  ensureView();
  patchSwitchView();

  window.Hreyfingarlisti = { show, load };
  console.log('[patch-167] Hreyfingarlisti installed');
})();
/* === END HREYFINGARLISTI === */
