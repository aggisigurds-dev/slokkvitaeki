/* === AGING REPORT / ALDURSGREINING v1 === */
/* Outstanding invoice aging — shows unpaid "reikningur" invoices grouped by
 * how many days they have been open: Current (0-30), 31-60, 61-90, 90+ days.
 *
 * Works with or without the paid_at column (patch 20). If the column doesn't
 * exist yet, all reikningur rows are treated as unpaid.
 *
 * No additional schema changes required.
 */
(() => {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (window.__agingReportInstalled) return;
  window.__agingReportInstalled = true;

  const VIEW_ID = 'view-aging-report';

  function getSB() { return (window.DB && window.DB.sb) || null; }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c =>
      ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }
  function fmtKr(n) { return Math.round(n).toLocaleString('is-IS') + ' kr'; }
  function fmtDate(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    return d.getDate() + '.' + (d.getMonth()+1) + '.' + d.getFullYear();
  }
  function daysSince(iso) {
    if (!iso) return 0;
    return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  }
  function ageBucket(days) {
    if (days <= 30) return 0;
    if (days <= 60) return 1;
    if (days <= 90) return 2;
    return 3;
  }
  const BUCKET_LABELS = ['0–30 dagar','31–60 dagar','61–90 dagar','91+ dagar'];
  const BUCKET_COLORS = ['#16a34a','#d97706','#ea580c','#dc2626'];
  const BUCKET_BG = ['#f0fdf4','#fffbeb','#fff7ed','#fef2f2'];
  const BUCKET_BORDER = ['#bbf7d0','#fde68a','#fed7aa','#fecaca'];

  // ── Styles ────────────────────────────────────────────────────────────────
  if (!document.getElementById('ar-style')) {
    const s = document.createElement('style');
    s.id = 'ar-style';
    s.textContent = `
      #${VIEW_ID} { padding: 0; overflow-y: auto; }
      #${VIEW_ID} .ar-wrap { max-width: 1100px; margin: 0 auto; padding: 20px 16px 40px; }
      #${VIEW_ID} .ar-header { margin-bottom: 18px; }
      #${VIEW_ID} .ar-header h1 { margin: 0; font-size: 22px; font-weight: 800; }
      #${VIEW_ID} .ar-sub { font-size: 12px; color: #64748b; margin-top: 4px; }

      #${VIEW_ID} .ar-summary-grid {
        display: grid; grid-template-columns: repeat(4,1fr); gap: 10px; margin-bottom: 20px;
      }
      @media(max-width:600px){ #${VIEW_ID} .ar-summary-grid { grid-template-columns: repeat(2,1fr); } }
      #${VIEW_ID} .ar-bucket-card {
        border-radius: 10px; padding: 14px 16px; border: 1px solid;
      }
      #${VIEW_ID} .ar-bucket-card .bc-lbl { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .04em; }
      #${VIEW_ID} .ar-bucket-card .bc-count { font-size: 28px; font-weight: 800; margin-top: 4px; }
      #${VIEW_ID} .ar-bucket-card .bc-amt { font-size: 14px; font-weight: 600; margin-top: 2px; }

      #${VIEW_ID} .ar-total-card {
        background: #fff; border: 2px solid #e2e8f0; border-radius: 10px;
        padding: 14px 18px; margin-bottom: 20px; display: flex; gap: 32px; flex-wrap: wrap;
        align-items: center;
      }
      #${VIEW_ID} .ar-total-card .tc-item .lbl { font-size: 10px; color: #64748b; text-transform: uppercase; letter-spacing: .05em; font-weight: 700; }
      #${VIEW_ID} .ar-total-card .tc-item .val { font-size: 24px; font-weight: 800; color: #0f172a; }

      #${VIEW_ID} .ar-actions { display: flex; gap: 8px; margin-bottom: 14px; }
      #${VIEW_ID} .ar-btn { padding: 8px 14px; background: #fff; border: 1px solid #cbd5e1; border-radius: 8px; font: inherit; font-size: 13px; cursor: pointer; color: #334155; }
      #${VIEW_ID} .ar-btn:hover { background: #f1f5f9; }
      #${VIEW_ID} .ar-btn.primary { background: #2563eb; color: #fff; border-color: #2563eb; }
      #${VIEW_ID} .ar-btn.primary:hover { background: #1d4ed8; }

      #${VIEW_ID} .ar-section { margin-bottom: 20px; }
      #${VIEW_ID} .ar-section-hd {
        padding: 10px 14px; border-radius: 8px 8px 0 0; font-size: 13px;
        font-weight: 700; display: flex; justify-content: space-between; align-items: center;
      }
      #${VIEW_ID} .ar-table-wrap { border-radius: 0 0 10px 10px; overflow: hidden; border: 1px solid; border-top: none; }
      #${VIEW_ID} table.ar-table { width: 100%; border-collapse: collapse; font-size: 13px; }
      #${VIEW_ID} .ar-table th { background: #f8fafc; text-align: left; padding: 8px 12px; font-size: 10px; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: .04em; border-bottom: 1px solid #e2e8f0; }
      #${VIEW_ID} .ar-table td { padding: 9px 12px; border-bottom: 1px solid #f1f5f9; }
      #${VIEW_ID} .ar-table tr:last-child td { border-bottom: none; }
      #${VIEW_ID} .ar-table tr:hover td { background: #f8fafc; }
      #${VIEW_ID} .ar-mip-btn { padding: 3px 10px; background: #fff; border: 1px solid #16a34a; color: #16a34a; border-radius: 6px; font: inherit; font-size: 11px; font-weight: 600; cursor: pointer; }
      #${VIEW_ID} .ar-mip-btn:hover { background: #f0fdf4; }
      #${VIEW_ID} .ar-empty { padding: 60px; text-align: center; color: #64748b; font-size: 15px; }
    `;
    document.head.appendChild(s);
  }

  // ── State ─────────────────────────────────────────────────────────────────
  let invoices = [];

  async function load() {
    const SB = getSB();
    if (!SB) return;
    // Try with paid_at column; if missing, fall back without it
    let data, error;
    try {
      const res = await SB
        .from('solur')
        .select('id,num,customer_nafn,customer_id,samtals,created_at,paid_at,paid_method,athugasemdir,greitt_med')
        .in('greitt_med', ['reikningur', 'greitt_sidar'])
        .is('paid_at', null)
        .order('created_at', { ascending: true });
      data = res.data; error = res.error;
    } catch (_) {
      const res2 = await SB
        .from('solur')
        .select('id,num,customer_nafn,customer_id,samtals,created_at,athugasemdir,greitt_med')
        .in('greitt_med', ['reikningur', 'greitt_sidar'])
        .order('created_at', { ascending: true });
      data = res2.data; error = res2.error;
    }
    if (error) { console.warn('[aging-report] load:', error.message); return; }
    // 2026-07-14: birtingar-hreinsun (breytir ALDREI solur-röðum):
    //  a) sleppa 0-kr röðum án merkingarbærs viðskiptavinar ("0"/tómt/
    //     "Viðskiptavinur" placeholder) — ekki raunveruleg krafa;
    //  b) para kreditreikninga: −X hjá viðskiptavini á móti ógreiddum +X
    //     (t.d. SAFÍR ±323.331) = uppgert par → bæði út af listanum og
    //     úr samtölunum. Íhaldssamt: aðeins nákvæm upphæða-speglun parast.
    const meaningless = n => { const t=String(n==null?'':n).trim(); return !t || t==='0' || t==='—' || /^viðskiptavinur$/i.test(t); };
    let rows = (data || []).filter(s => !(Math.round(+(s.samtals||0))===0 && meaningless(s.customer_nafn)));
    const nkey = s => String(s.customer_nafn||'').trim().toLowerCase();
    const drop = new Set();
    rows.forEach((neg,i) => {
      const na = Math.round(+(neg.samtals||0));
      if (na >= 0 || drop.has(i)) return;
      const j = rows.findIndex((pos,k) => !drop.has(k) && k!==i &&
        Math.round(+(pos.samtals||0)) === -na && nkey(pos)===nkey(neg) && nkey(neg)!=='');
      if (j !== -1) { drop.add(i); drop.add(j); }
    });
    rows = rows.filter((_,i)=>!drop.has(i));
    invoices = rows.map(s => ({
      id: s.id, num: s.num || '',
      customer: s.customer_nafn || '—',
      customer_id: s.customer_id,
      total: +(s.samtals || 0),
      created_at: s.created_at,
      notes: s.athugasemdir || '',
      paid_at: s.paid_at || null,
      payment: s.greitt_med || '',
      days: daysSince(s.created_at)
    }));
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  function render() {
    const view = document.getElementById(VIEW_ID);
    if (!view || !view.classList.contains('active')) return;
    const wrap = view.querySelector('.ar-wrap');
    if (!wrap) return;

    if (!invoices.length) {
      wrap.querySelector('#ar-main').innerHTML = '<div class="ar-empty">Engir ógreiddir reikningar 🎉</div>';
      wrap.querySelector('#ar-summary').innerHTML = '';
      wrap.querySelector('#ar-total').innerHTML = '';
      return;
    }

    // Split by payment method — Setja í reikning vs Greitt síðar.
    // These are different workflows (monthly batch billing vs pay-on-pickup)
    // so totals/buckets must NOT be combined.
    const groups = [
      { key: 'reikningur',   label: '📋 Setja í reikning (krafa í heimabanka)', items: invoices.filter(i => i.payment === 'reikningur'), color: '#1d4ed8' },
      { key: 'greitt_sidar', label: '⏳ Greitt síðar (greitt við afhendingu)', items: invoices.filter(i => i.payment === 'greitt_sidar'), color: '#b45309' }
    ].filter(g => g.items.length > 0);

    const totalAmt = invoices.reduce((a, i) => a + i.total, 0);

    // Top-level summary: ONE row per payment method, each with its own total
    wrap.querySelector('#ar-summary').innerHTML = groups.map(g => {
      const amt = g.items.reduce((a, inv) => a + inv.total, 0);
      return `<div class="ar-bucket-card" style="background:#fff;border-color:${g.color};border-width:2px;flex:1">
        <div class="bc-lbl" style="color:${g.color};font-weight:700">${g.label}</div>
        <div class="bc-count" style="color:${g.color};">${g.items.length} ógreitt</div>
        <div class="bc-amt" style="color:${g.color};">${fmtKr(amt)}</div>
      </div>`;
    }).join('');

    // Total bar — keep grand total but make it secondary
    wrap.querySelector('#ar-total').innerHTML = `
      <div class="tc-item"><div class="lbl">Heildar ógreitt (allt)</div><div class="val">${fmtKr(totalAmt)}</div></div>
      <div class="tc-item"><div class="lbl">Fjöldi reikninga</div><div class="val">${invoices.length}</div></div>
      <div class="tc-item"><div class="lbl">Elsti reikningur</div><div class="val">${invoices.length ? invoices[0].days + ' dagar' : '—'}</div></div>
    `;

    // For each payment-method group, render its own bucket-by-age tables
    let sectionsHTML = '';
    for (const g of groups) {
      const groupTotal = g.items.reduce((a, inv) => a + inv.total, 0);
      sectionsHTML += `<div style="margin-top:24px;padding:14px 18px;background:${g.color}15;border-left:4px solid ${g.color};border-radius:8px">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <h2 style="margin:0;color:${g.color};font-size:18px">${g.label}</h2>
          <div style="font-size:18px;font-weight:700;color:${g.color}">${fmtKr(groupTotal)}</div>
        </div>
      </div>`;
      // Age buckets within this group
      const groupBuckets = [[], [], [], []];
      for (const inv of g.items) groupBuckets[ageBucket(inv.days)].push(inv);
      for (let i = 3; i >= 0; i--) {
        const b = groupBuckets[i];
        if (!b.length) continue;
        const secAmt = b.reduce((a, inv) => a + inv.total, 0);
        const rows = b.map(inv => `<tr>
          <td>${esc(inv.num)}</td>
          <td>${esc(inv.customer)}</td>
          <td>${esc(fmtDate(inv.created_at))}</td>
          <td style="font-weight:700;color:${BUCKET_COLORS[i]};">${inv.days} d</td>
          <td style="text-align:right;font-weight:700;">${esc(fmtKr(inv.total))}</td>
          <td>${esc(inv.notes)}</td>
          <td style="white-space:nowrap">
            <button class="ar-mip-btn" data-ar-id="${inv.id}" title="Merkja greitt">✓</button>
            <button class="ar-credit-btn" data-ar-id="${inv.id}" data-ar-num="${esc(inv.num)}" title="Kreditfæra (búa til kreditreikning)" style="margin-left:4px;background:#fef3c7;color:#92400e;border:1px solid #fcd34d;padding:6px 10px;border-radius:6px;cursor:pointer;font-size:12px;font-weight:600">Kreditfæra</button>
            <button class="ar-delete-btn" data-ar-id="${inv.id}" data-ar-num="${esc(inv.num)}" title="Eyða færslu (varúð: óafturkræft)" style="margin-left:4px;background:#fee2e2;color:#991b1b;border:1px solid #fca5a5;padding:6px 10px;border-radius:6px;cursor:pointer;font-size:12px;font-weight:600">🗑</button>
          </td>
        </tr>`).join('');
        sectionsHTML += `<div class="ar-section">
          <div class="ar-section-hd" style="background:${BUCKET_BG[i]};border:1px solid ${BUCKET_BORDER[i]};color:${BUCKET_COLORS[i]};">
            <span>${BUCKET_LABELS[i]} (${b.length})</span>
            <span>${fmtKr(secAmt)}</span>
          </div>
          <div class="ar-table-wrap" style="border-color:${BUCKET_BORDER[i]};">
            <table class="ar-table">
              <thead><tr><th>Númer</th><th>Viðskiptavinur</th><th>Dagsetning</th><th>Aldur</th><th style="text-align:right;">Upphæð</th><th>Athugasemd</th><th>Aðgerðir</th></tr></thead>
              <tbody>${rows}</tbody>
          </table>
        </div>
      </div>`;
      }
    }
    wrap.querySelector('#ar-main').innerHTML = sectionsHTML;

    // Wire mark-paid buttons
    wrap.querySelectorAll('.ar-mip-btn[data-ar-id]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = parseInt(btn.dataset.arId, 10);
        const inv = invoices.find(i => i.id === id);
        if (!inv) return;
        if (window.InvoicePaid && InvoicePaid.markPaid) {
          await InvoicePaid.markPaid(inv, () => {
            invoices = invoices.filter(i => i.id !== id);
            render();
          });
        } else {
          const SB = getSB();
          if (!SB) return;
          const { error } = await SB.from('solur').update({ paid_at: new Date().toISOString(), paid_method: 'Óþekkt' }).eq('id', id);
          if (!error) { invoices = invoices.filter(i => i.id !== id); render(); }
        }
      });
    });
    // Wire kreditfæra buttons — uses patch 26's credit-invoice flow
    wrap.querySelectorAll('.ar-credit-btn[data-ar-id]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = parseInt(btn.dataset.arId, 10);
        const SB = getSB();
        if (!SB) return;
        // Fetch the original sale row in full (CreditInvoice.open expects a full sale)
        const { data: sale, error } = await SB.from('solur').select('*').eq('id', id).maybeSingle();
        if (error || !sale) { alert('Gat ekki sótt sölu'); return; }
        if (window.CreditInvoice && CreditInvoice.open) {
          CreditInvoice.open(sale);
        } else {
          alert('Kreditfærsla er ekki tiltæk (vantar patch 26)');
        }
      });
    });
    // Wire delete buttons — destructive, requires double confirm
    wrap.querySelectorAll('.ar-delete-btn[data-ar-id]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = parseInt(btn.dataset.arId, 10);
        const num = btn.dataset.arNum || '#'+id;
        if (!await Confirm.show('Eyða færslu '+num+' endanlega?\n\nÞetta er ÓAFTURKRÆFT. Notaðu Kreditfæra ef þú vilt halda bókhaldsslóð.')) return;
        if (!await Confirm.show('Ertu alveg viss? '+num+' verður ekki hægt að endurheimta.')) return;
        const SB = getSB();
        if (!SB) return;
        const { error } = await SB.from('solur').delete().eq('id', id);
        if (error) { alert('Villa: '+error.message); return; }
        invoices = invoices.filter(i => i.id !== id);
        render();
        if (window.Toast && Toast.show) Toast.show('🗑 '+num+' eytt');
      });
    });
  }

  // ── CSV export ─────────────────────────────────────────────────────────────
  function exportCSV() {
    const header = ['Salnúmer','Viðskiptavinur','Dagsetning reiknings','Aldur (dagar)','Upphaed','Aldursflokkur','Athugasemd'];
    const rows = invoices.map(inv => [
      inv.num, inv.customer, fmtDate(inv.created_at), inv.days,
      String(Math.round(inv.total)).replace('.',','),
      BUCKET_LABELS[ageBucket(inv.days)],
      inv.notes
    ]);
    const sep = ';';
    const csv = '﻿' + [header.join(sep), ...rows.map(r => r.map(v => {
      const s = String(v == null ? '' : v);
      return /[";'\n]/.test(s) ? '"' + s.replace(/"/g,'""') + '"' : s;
    }).join(sep))].join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'aldursgreining-' + new Date().toISOString().slice(0,10) + '.csv';
    document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }

  // ── Build view HTML ────────────────────────────────────────────────────────
  function buildViewHTML() {
    return `
      <main class="main-panel" style="overflow-y:auto;">
      <div class="ar-wrap">
        <div class="ar-header">
          <h1>📬 Aldursgreining</h1>
          <div class="ar-sub">Ógreiddir reikningar flokkað eftir aldri — 30/60/90+ dagar</div>
        </div>
        <div id="ar-summary" class="ar-summary-grid"></div>
        <div id="ar-total" class="ar-total-card"></div>
        <div class="ar-actions">
          <button id="ar-csv-btn" class="ar-btn primary">📥 CSV</button>
          <button id="ar-print-btn" class="ar-btn">🖨 Prenta</button>
          <button id="ar-refresh-btn" class="ar-btn">🔄 Endurnýja</button>
        </div>
        <div id="ar-main"></div>
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

    document.getElementById('ar-csv-btn').addEventListener('click', exportCSV);
    document.getElementById('ar-print-btn').addEventListener('click', () => window.print());
    document.getElementById('ar-refresh-btn').addEventListener('click', async () => {
      document.getElementById('ar-refresh-btn').textContent = '🔄 Hleður…';
      await load(); render();
      document.getElementById('ar-refresh-btn').textContent = '🔄 Endurnýja';
    });
  }

  function ensureNavButton() {
    if (document.querySelector('[data-aging-report]')) return;
    const tekjurBtn = Array.from(document.querySelectorAll('.vnav-btn')).find(b => /Tekjur/i.test(b.textContent));
    if (!tekjurBtn || !tekjurBtn.parentElement) return;
    const btn = document.createElement('button');
    btn.className = 'vnav-btn';
    btn.setAttribute('data-aging-report', '1');
    btn.setAttribute('data-view', 'aging-report');
    btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>Aldursgreining`;
    btn.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); switchToView(); });
    tekjurBtn.parentElement.insertBefore(btn, tekjurBtn.nextSibling);
  }

  async function switchToView() {
    ensureView();
    document.querySelectorAll('.view.active').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.vnav-btn.active').forEach(b => b.classList.remove('active'));
    const view = document.getElementById(VIEW_ID);
    if (view) view.classList.add('active');
    const btn = document.querySelector('[data-aging-report]');
    if (btn) btn.classList.add('active');
    await load(); render();
  }

  ensureView();
  ensureNavButton();
  setTimeout(() => { ensureView(); ensureNavButton(); }, 600);
  setTimeout(() => { ensureView(); ensureNavButton(); }, 2000);
  const obs = new MutationObserver(() => { ensureView(); ensureNavButton(); });
  obs.observe(document.body, { childList: true, subtree: true });

  window.AgingReport = { open: switchToView };
  console.log('[aging-report] installed');
})();
/* === END AGING REPORT === */
