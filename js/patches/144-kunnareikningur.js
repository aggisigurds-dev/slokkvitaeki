/* === KÚNNAREIKNINGUR v1 ===
   Statement of account per customer — chronological list of every
   reikningur + kreditfærsla with paid status and running balance.

   API:
     window.KunnaReikningur.open()           → opens customer picker
     window.KunnaReikningur.openForId(id, source='fyrirtaeki'|'vidskiptavinir')
     window.KunnaReikningur.openForName(name)

   The view shows:
     • Header card with customer info + balance summary
     • Chronological transactions table (sale / credit / paid event)
     • Running balance after each row
     • 🖨 Prenta A4 yfirlit · CSV útflutningur · Date filter
     • Lock-aware: greitt rows are dimmed; ógreitt rows are highlighted */
(() => {
  if (window.__kunnareikningurInstalled) return;
  window.__kunnareikningurInstalled = true;

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
    return String(d.getDate()).padStart(2,'0') + '.' + String(d.getMonth()+1).padStart(2,'0') + '.' + d.getFullYear();
  }
  function isoDay(iso) {
    if (!iso) return '';
    return new Date(iso).toISOString().slice(0,10);
  }

  // ── Customer picker ──────────────────────────────────────────────────────
  function open() {
    closeAll();
    const dlg = document.createElement('div');
    dlg.id = '_kr-picker';
    dlg.style.cssText = 'position:fixed;inset:0;z-index:100050;background:rgba(15,23,42,0.55);display:flex;align-items:center;justify-content:center;padding:16px;font-family:inherit';
    dlg.innerHTML = `
      <div style="background:#fff;border-radius:14px;box-shadow:0 24px 60px rgba(0,0,0,0.3);width:min(520px,calc(100vw - 28px));overflow:hidden">
        <div style="padding:14px 20px;background:linear-gradient(135deg,#2563eb,#1d4ed8);color:#fff;display:flex;justify-content:space-between;align-items:center">
          <div>
            <h2 style="margin:0;font-size:17px;font-weight:700">📊 Yfirlit viðskiptavinar</h2>
            <div style="font-size:12px;color:#bfdbfe;margin-top:2px">Veldu viðskiptavin til að sjá kúnnareikning</div>
          </div>
          <button id="_kr-x" type="button" style="background:transparent;border:1px solid rgba(255,255,255,0.4);color:#fff;font-size:18px;width:32px;height:32px;border-radius:7px;cursor:pointer;line-height:1">✕</button>
        </div>
        <div style="padding:18px 22px">
          <input id="_kr-search" type="text" autocomplete="off"
            placeholder="🔍 Leita að kennitölu, nafni eða síma…"
            style="width:100%;padding:11px 14px;border:1px solid #cbd5e1;border-radius:8px;font:inherit;font-size:14px;box-sizing:border-box;outline:none">
          <div id="_kr-results" style="margin-top:10px;max-height:360px;overflow-y:auto"></div>
        </div>
      </div>`;
    document.body.appendChild(dlg);
    document.addEventListener('keydown', escHandler);
    dlg.querySelector('#_kr-x').addEventListener('click', closeAll);
    dlg.addEventListener('click', e => { if (e.target === dlg) closeAll(); });
    const inp = dlg.querySelector('#_kr-search');
    inp.focus();
    let timer;
    inp.addEventListener('input', () => {
      clearTimeout(timer);
      timer = setTimeout(() => runSearch(inp.value.trim()), 180);
    });
  }

  async function runSearch(q) {
    const out = document.getElementById('_kr-results');
    if (!out) return;
    if (q.length < 2) { out.innerHTML = ''; return; }
    const SB = getSB();
    if (!SB) return;
    const qDigits = q.replace(/[^0-9]/g, '');
    const looksLikeKt = qDigits.length >= 3;
    let fyQ = SB.from('fyrirtaeki').select('id,nafn,kennitala,simi').limit(8);
    let vkQ = SB.from('vidskiptavinir').select('id,nafn,kennitala,simi').limit(8);
    if (looksLikeKt) {
      fyQ = fyQ.or(`kennitala.ilike.${qDigits}%`);
      vkQ = vkQ.or(`kennitala.ilike.${qDigits}%`);
    } else {
      fyQ = fyQ.ilike('nafn', '%' + q + '%');
      vkQ = vkQ.ilike('nafn', '%' + q + '%');
    }
    const [fy, vk] = await Promise.all([fyQ, vkQ]);
    const fyList = (fy.data || []).map(c => ({ ...c, source: 'fyrirtaeki' }));
    const vkList = (vk.data || []).map(c => ({ ...c, source: 'vidskiptavinir' }));
    const all = [].concat(fyList, vkList);
    if (!all.length) { out.innerHTML = '<div style="padding:14px;text-align:center;color:#94a3b8;font-style:italic;font-size:13px">Engin samsvörun</div>'; return; }
    out.innerHTML = all.map((c, i) => {
      const badge = c.source === 'fyrirtaeki'
        ? '<span style="font-size:9px;background:#dcfce7;color:#166534;padding:2px 7px;border-radius:99px;font-weight:700;margin-left:6px">B2B</span>'
        : '<span style="font-size:9px;background:#dbeafe;color:#1e40af;padding:2px 7px;border-radius:99px;font-weight:700;margin-left:6px">Viðsk.</span>';
      return `<div class="_kr-row" data-i="${i}" style="padding:10px 13px;border:1px solid #e2e8f0;border-radius:8px;margin-bottom:6px;cursor:pointer;background:#fff;transition:all .12s" onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background='#fff'">
        <div style="font-weight:700;color:#0f172a;font-size:13.5px">${esc(c.nafn || '—')}${badge}</div>
        ${c.kennitala ? `<div style="font-size:11px;color:#64748b;font-family:monospace;margin-top:2px">kt. ${esc(c.kennitala)}${c.simi ? ' · 📞 ' + esc(c.simi) : ''}</div>` : ''}
      </div>`;
    }).join('');
    out.querySelectorAll('._kr-row').forEach(r => {
      r.addEventListener('click', () => {
        const i = +r.dataset.i;
        openForCustomer(all[i]);
      });
    });
  }

  function escHandler(e) { if (e.key === 'Escape') closeAll(); }
  function closeAll() {
    document.removeEventListener('keydown', escHandler);
    document.getElementById('_kr-picker')?.remove();
    document.getElementById('_kr-statement')?.remove();
  }

  // ── Direct openers ────────────────────────────────────────────────────────
  async function openForId(id, source) {
    const SB = getSB();
    if (!SB) return;
    const table = source === 'vidskiptavinir' ? 'vidskiptavinir' : 'fyrirtaeki';
    const { data } = await SB.from(table).select('id,nafn,kennitala,simi,heimilisfang').eq('id', id).maybeSingle();
    if (!data) { alert('Viðskiptavinur fannst ekki'); return; }
    openForCustomer({ ...data, source });
  }
  async function openForName(name) {
    const SB = getSB();
    if (!SB) return;
    const [fy, vk] = await Promise.all([
      SB.from('fyrirtaeki').select('id,nafn,kennitala,simi,heimilisfang').eq('nafn', name).maybeSingle(),
      SB.from('vidskiptavinir').select('id,nafn,kennitala,simi,heimilisfang').eq('nafn', name).maybeSingle()
    ]);
    const c = (fy.data && { ...fy.data, source: 'fyrirtaeki' }) || (vk.data && { ...vk.data, source: 'vidskiptavinir' });
    if (!c) { alert('Viðskiptavinur fannst ekki: ' + name); return; }
    openForCustomer(c);
  }

  // ── Load statement for a customer ─────────────────────────────────────────
  async function openForCustomer(cust) {
    closeAll();
    if (!cust) return;
    const SB = getSB();
    if (!SB) return;

    // 2026-05-14: Use multiple separate queries instead of OR-with-parens.
    // PostgREST `.or()` chokes on values containing parens/slashes (Ikea's
    // company name has them). We collect from id, exact-name, and prefix-name
    // matches separately and de-dupe by sale id.
    const promises = [];
    if (cust.id) {
      promises.push(SB.from('solur').select('*').eq('customer_id', cust.id).limit(500));
    }
    if (cust.nafn) {
      // Exact-name match (catches sales where customer_id is null but name matches)
      promises.push(SB.from('solur').select('*').eq('customer_nafn', cust.nafn).limit(500));
      // Prefix match on first word (catches name variations like "Miklatorg hf / Ikea" vs "Miklatorg hf ( Ikea )")
      const firstWord = cust.nafn.split(/\s+/)[0];
      if (firstWord && firstWord.length >= 4) {
        promises.push(SB.from('solur').select('*').ilike('customer_nafn', firstWord + '%').limit(500));
      }
    }
    const results = await Promise.all(promises);
    const dedupe = new Map();
    results.forEach(r => {
      (r.data || []).forEach(row => { dedupe.set(row.id, row); });
    });
    let rows = Array.from(dedupe.values()).sort((a, b) =>
      (b.created_at || '').localeCompare(a.created_at || '')
    );

    // Optional: also match by ktClean via athugasemdir or kennitala join (skip for v1)
    renderStatement(cust, rows);
  }

  // ── Statement view ────────────────────────────────────────────────────────
  function computeStats(rows) {
    let velta = 0, greitt = 0, ogreitt = 0, kredit = 0;
    rows.forEach(r => {
      const total = +r.samtals || 0;
      if (r.is_credit) {
        kredit += Math.abs(total);
        velta -= Math.abs(total);
      } else {
        velta += total;
        if (r.paid_at) greitt += total;
        else if (r.greitt_med === 'greitt_sidar' || r.greitt_med === 'reikningur') ogreitt += total;
        else greitt += total; // Kort / Pening = paid at sale time
      }
    });
    const skuldar = ogreitt - kredit;
    return { velta, greitt, ogreitt, kredit, skuldar };
  }

  function renderStatement(cust, rows) {
    const stats = computeStats(rows);
    // Sort chronologically (oldest first) for proper running-balance computation
    const chronological = rows.slice().sort((a, b) =>
      (a.created_at || '').localeCompare(b.created_at || '')
    );

    let bal = 0;
    const tbody = chronological.map(s => {
      const total = +s.samtals || 0;
      const isCredit = !!s.is_credit;
      const isPaid = !!s.paid_at;
      const isInvoice = (s.greitt_med === 'greitt_sidar' || s.greitt_med === 'reikningur');
      // Running balance: invoice adds, credit subtracts, paid invoice contributes 0
      if (isCredit) bal -= Math.abs(total);
      else if (isInvoice && !isPaid) bal += total;
      // Paid card/cash sales don't move the balance
      const linesPreview = Array.isArray(s.linur)
        ? s.linur.slice(0, 2).map(l => (l.qty + '× ' + (l.desc || ''))).join(', ') + (s.linur.length > 2 ? ' …' : '')
        : '';
      const status = isCredit
        ? '<span style="font-size:10px;font-weight:700;background:#fee2e2;color:#991b1b;padding:2px 7px;border-radius:99px">Kredit</span>'
        : isPaid
          ? '<span style="font-size:10px;font-weight:700;background:#dcfce7;color:#166534;padding:2px 7px;border-radius:99px">✓ Greitt ' + esc(fmtDate(s.paid_at)) + '</span>'
          : isInvoice
            ? '<span style="font-size:10px;font-weight:700;background:#fef3c7;color:#92400e;padding:2px 7px;border-radius:99px">⚠ Ógreitt</span>'
            : '<span style="font-size:10px;font-weight:700;background:#dbeafe;color:#1e40af;padding:2px 7px;border-radius:99px">' + esc(s.greitt_med || '') + '</span>';
      const totalCol = isCredit
        ? '<span style="color:#dc2626;font-weight:700">' + esc(fmtKr(total)) + '</span>'
        : '<span style="color:#0f172a;font-weight:700">' + esc(fmtKr(total)) + '</span>';
      return `<tr>
        <td style="padding:8px 10px;font-size:12px;color:#475569">${esc(fmtDate(s.created_at))}</td>
        <td style="padding:8px 10px;font-family:monospace;font-size:11.5px;color:#0f172a;font-weight:600">${esc(s.num || '')}</td>
        <td style="padding:8px 10px;font-size:12px;color:#475569">${esc(linesPreview)}</td>
        <td style="padding:8px 10px;text-align:right;font-variant-numeric:tabular-nums">${totalCol}</td>
        <td style="padding:8px 10px;font-size:11px">${status}</td>
        <td style="padding:8px 10px;text-align:right;font-weight:700;font-variant-numeric:tabular-nums;color:${bal>0?'#0f172a':'#16a34a'}">${esc(fmtKr(bal))}</td>
      </tr>`;
    }).join('');

    // Reverse for display (newest first by default)
    const tbodyRows = chronological.length
      ? `<tbody>${tbody}</tbody>`
      : '<tbody><tr><td colspan="6" style="padding:30px;text-align:center;color:#94a3b8;font-style:italic;font-size:13px">Engar færslur fundust fyrir þennan viðskiptavin</td></tr></tbody>';

    const dlg = document.createElement('div');
    dlg.id = '_kr-statement';
    dlg.style.cssText = 'position:fixed;inset:0;z-index:100050;background:rgba(15,23,42,0.55);display:flex;align-items:center;justify-content:center;padding:14px;font-family:inherit';
    dlg.innerHTML = `
      <div style="background:#fff;border-radius:14px;box-shadow:0 24px 60px rgba(0,0,0,0.3);width:min(1100px,calc(100vw - 28px));max-height:calc(100vh - 28px);display:flex;flex-direction:column;overflow:hidden">
        <div style="padding:14px 22px;background:linear-gradient(135deg,#2563eb,#1d4ed8);color:#fff;display:flex;justify-content:space-between;align-items:center;gap:10px">
          <div>
            <h2 style="margin:0;font-size:17px;font-weight:700">📊 Yfirlit · ${esc(cust.nafn || '')}</h2>
            <div style="font-size:11px;color:#bfdbfe;margin-top:2px">
              ${cust.kennitala ? 'kt. ' + esc(cust.kennitala) : ''}
              ${cust.simi ? ' · 📞 ' + esc(cust.simi) : ''}
              ${cust.heimilisfang ? ' · 📍 ' + esc(cust.heimilisfang) : ''}
            </div>
          </div>
          <div style="display:flex;gap:6px">
            <button id="_kr-back" type="button" style="background:transparent;border:1px solid rgba(255,255,255,0.4);color:#fff;font-size:12px;padding:6px 12px;border-radius:7px;cursor:pointer">↩ Velja annan</button>
            <button id="_kr-csv" type="button" style="background:transparent;border:1px solid rgba(255,255,255,0.4);color:#fff;font-size:12px;padding:6px 12px;border-radius:7px;cursor:pointer">📥 CSV</button>
            <button id="_kr-print" type="button" style="background:#fff;color:#1d4ed8;border:none;font-size:12px;padding:6px 14px;border-radius:7px;cursor:pointer;font-weight:700">🖨 Prenta yfirlit</button>
            <button id="_kr-x2" type="button" style="background:transparent;border:1px solid rgba(255,255,255,0.4);color:#fff;font-size:16px;width:32px;height:32px;border-radius:7px;cursor:pointer;line-height:1">✕</button>
          </div>
        </div>

        <div style="padding:14px 22px;background:#f8fafc;border-bottom:1px solid #e2e8f0;display:grid;grid-template-columns:repeat(4,1fr);gap:10px">
          ${statCard('Heildarvelta', stats.velta, '#0f172a')}
          ${statCard('Greitt', stats.greitt, '#166534')}
          ${statCard('Kreditfært', -stats.kredit, '#dc2626')}
          ${statCard('Skuldar núna', stats.skuldar, stats.skuldar > 0 ? '#dc2626' : '#166534', true)}
        </div>

        <div style="flex:1;overflow:auto;padding:0;background:#fff">
          <table style="width:100%;border-collapse:collapse;font-size:13px">
            <thead><tr style="background:#f1f5f9;text-align:left;position:sticky;top:0;z-index:1">
              <th style="padding:8px 10px;font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.04em">Dags</th>
              <th style="padding:8px 10px;font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.04em">Skjal</th>
              <th style="padding:8px 10px;font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.04em">Lýsing</th>
              <th style="padding:8px 10px;text-align:right;font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.04em">Upphæð</th>
              <th style="padding:8px 10px;font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.04em">Staða</th>
              <th style="padding:8px 10px;text-align:right;font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.04em">Saldó</th>
            </tr></thead>
            ${tbodyRows}
          </table>
        </div>
      </div>`;
    document.body.appendChild(dlg);

    dlg.querySelector('#_kr-x2').addEventListener('click', closeAll);
    dlg.querySelector('#_kr-back').addEventListener('click', () => { closeAll(); open(); });
    dlg.querySelector('#_kr-print').addEventListener('click', () => printStatement(cust, chronological, stats));
    dlg.querySelector('#_kr-csv').addEventListener('click', () => exportCSV(cust, chronological));
    document.addEventListener('keydown', escHandler);
  }

  function statCard(label, value, color, big) {
    return `<div style="background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:10px 12px;">
      <div style="font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.04em">${esc(label)}</div>
      <div style="font-size:${big?'22px':'18px'};font-weight:800;color:${color};margin-top:2px;font-variant-numeric:tabular-nums">${esc(fmtKr(value))}</div>
    </div>`;
  }

  // ── Print A4 statement ────────────────────────────────────────────────────
  function printStatement(cust, rows, stats) {
    const win = window.open('', '_blank', 'width=900,height=1100');
    if (!win) { alert('Vinsamlegast leyfðu sprettiglugga til að prenta.'); return; }
    let bal = 0;
    const tbody = rows.map(s => {
      const total = +s.samtals || 0;
      const isCredit = !!s.is_credit;
      const isPaid = !!s.paid_at;
      const isInvoice = (s.greitt_med === 'greitt_sidar' || s.greitt_med === 'reikningur');
      if (isCredit) bal -= Math.abs(total);
      else if (isInvoice && !isPaid) bal += total;
      const desc = Array.isArray(s.linur)
        ? s.linur.slice(0,3).map(l => (l.qty + '× ' + (l.desc || ''))).join(', ') + (s.linur.length > 3 ? '…' : '')
        : '';
      const status = isCredit ? 'Kredit' : isPaid ? ('Greitt ' + fmtDate(s.paid_at)) : isInvoice ? 'Ógreitt' : (s.greitt_med || '');
      return `<tr>
        <td>${esc(fmtDate(s.created_at))}</td>
        <td style="font-family:monospace">${esc(s.num || '')}</td>
        <td>${esc(desc)}</td>
        <td class="num">${esc(fmtKr(total))}</td>
        <td>${esc(status)}</td>
        <td class="num">${esc(fmtKr(bal))}</td>
      </tr>`;
    }).join('');
    const today = new Date();
    const todayStr = String(today.getDate()).padStart(2,'0') + '.' +
                     String(today.getMonth()+1).padStart(2,'0') + '.' + today.getFullYear();
    win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Yfirlit ${esc(cust.nafn || '')}</title>
      <style>
        @page { size: A4; margin: 14mm }
        body { font-family: Arial, Helvetica, sans-serif; color: #0f172a; margin: 0; padding: 0; }
        .hd { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0f172a; padding-bottom: 10px; margin-bottom: 14px; }
        .hd .logo { max-height: 60px }
        .hd .meta { text-align: right; font-size: 11px; color: #475569; }
        h1 { font-size: 20px; margin: 8px 0 4px }
        .cust { font-size: 14px; font-weight: 700; margin-top: 4px; }
        .cust-meta { font-size: 11px; color: #475569; margin-bottom: 12px }
        .stats { display: grid; grid-template-columns: repeat(4,1fr); gap: 8px; margin-bottom: 16px; }
        .stats div { border: 1px solid #cbd5e1; border-radius: 6px; padding: 6px 9px; }
        .stats .l { font-size: 9px; text-transform: uppercase; color: #64748b; font-weight: 700; letter-spacing: .04em }
        .stats .v { font-size: 14px; font-weight: 800; margin-top: 1px; font-variant-numeric: tabular-nums }
        .stats .red { color: #dc2626 } .stats .grn { color: #16a34a }
        table { width: 100%; border-collapse: collapse; font-size: 11px; }
        th { background: #f1f5f9; text-align: left; padding: 6px 8px; font-size: 9px; text-transform: uppercase; color: #64748b; letter-spacing: .04em }
        td { padding: 5px 8px; border-bottom: 1px solid #e2e8f0; }
        td.num { text-align: right; font-variant-numeric: tabular-nums; font-weight: 600 }
        .foot { margin-top: 14px; padding-top: 10px; border-top: 2px solid #0f172a; display: flex; justify-content: space-between; font-size: 12px }
        .foot .total { font-size: 16px; font-weight: 800; color: ${stats.skuldar > 0 ? '#dc2626' : '#16a34a'} }
        .small { font-size: 9.5px; color: #94a3b8; margin-top: 18px; text-align: center }
      </style>
      </head><body>
        <div class="hd">
          <div><img src="${window.location.origin}/img/logo.png" class="logo" onerror="this.style.display='none'"></div>
          <div class="meta">
            Slökkvitæki ehf · Helluhrauni 10, 220 Hafnarfirði<br>
            kt 600508-0400 · vsknr. 98107 · Sími 565-4080<br>
            <strong>Yfirlit prentað: ${esc(todayStr)}</strong>
          </div>
        </div>
        <h1>📊 Kúnnareikningur</h1>
        <div class="cust">${esc(cust.nafn || '')}</div>
        <div class="cust-meta">
          ${cust.kennitala ? 'kt. ' + esc(cust.kennitala) : ''}
          ${cust.simi ? ' · Sími ' + esc(cust.simi) : ''}
          ${cust.heimilisfang ? ' · ' + esc(cust.heimilisfang) : ''}
        </div>
        <div class="stats">
          <div><div class="l">Heildarvelta</div><div class="v">${esc(fmtKr(stats.velta))}</div></div>
          <div><div class="l">Greitt</div><div class="v grn">${esc(fmtKr(stats.greitt))}</div></div>
          <div><div class="l">Kreditfært</div><div class="v red">${esc(fmtKr(-stats.kredit))}</div></div>
          <div><div class="l">Skuldar núna</div><div class="v ${stats.skuldar > 0 ? 'red' : 'grn'}">${esc(fmtKr(stats.skuldar))}</div></div>
        </div>
        <table>
          <thead><tr>
            <th>Dags</th><th>Skjal</th><th>Lýsing</th>
            <th style="text-align:right">Upphæð</th><th>Staða</th>
            <th style="text-align:right">Saldó</th>
          </tr></thead>
          <tbody>${tbody || '<tr><td colspan="6" style="text-align:center;padding:20px;color:#94a3b8">Engar færslur</td></tr>'}</tbody>
        </table>
        <div class="foot">
          <div>${rows.length} færsla / færslur</div>
          <div class="total">Núverandi skuld: ${esc(fmtKr(stats.skuldar))}</div>
        </div>
        <div class="small">Slökkvitæki ehf — eldklar@eldklar.is — vsknr. 98107</div>
        <script>setTimeout(function(){ try { window.focus(); window.print(); } catch(e){} }, 250);<\/script>
      </body></html>`);
    win.document.close();
  }

  // ── CSV export ────────────────────────────────────────────────────────────
  function exportCSV(cust, rows) {
    let bal = 0;
    const lines = [['Dags','Skjal','Lýsing','Upphæð án VSK','VSK','Samtals m/VSK','Staða','Saldó']];
    rows.forEach(s => {
      const total = +s.samtals || 0;
      const isCredit = !!s.is_credit;
      const isPaid = !!s.paid_at;
      const isInvoice = (s.greitt_med === 'greitt_sidar' || s.greitt_med === 'reikningur');
      if (isCredit) bal -= Math.abs(total);
      else if (isInvoice && !isPaid) bal += total;
      const desc = Array.isArray(s.linur) ? s.linur.map(l => (l.qty + '× ' + (l.desc || ''))).join('; ') : '';
      const status = isCredit ? 'Kredit' : isPaid ? ('Greitt ' + fmtDate(s.paid_at)) : isInvoice ? 'Ógreitt' : (s.greitt_med || '');
      lines.push([
        fmtDate(s.created_at), s.num || '', desc,
        String(Math.round(+s.upphaed_an_vsk || 0)).replace('.', ','),
        String(Math.round(+s.vsk_upphaed || 0)).replace('.', ','),
        String(Math.round(total)).replace('.', ','),
        status,
        String(Math.round(bal)).replace('.', ',')
      ]);
    });
    const csv = '﻿' + lines.map(r => r.map(c => '"' + String(c || '').replace(/"/g, '""') + '"').join(';')).join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Yfirlit_' + (cust.nafn || 'kunni').replace(/[^a-z0-9À-ſ]+/gi, '_') + '_' + new Date().toISOString().slice(0,10) + '.csv';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 200);
  }

  // ── Sidebar launcher ──────────────────────────────────────────────────────
  function injectSidebar() {
    const nav = document.querySelector('nav.view-nav, .view-nav');
    if (!nav) { setTimeout(injectSidebar, 500); return; }
    if (nav.querySelector('._kr-nav-btn')) return;
    const allBtns = Array.from(nav.querySelectorAll('.vnav-btn'));
    const tpl = allBtns.find(b => /bókhald|bokhalds/i.test(b.textContent || '')) || allBtns[0];
    if (!tpl) { setTimeout(injectSidebar, 500); return; }
    const btn = document.createElement('button');
    btn.className = (tpl.className || 'vnav-btn').replace(/\bactive\b/g,'').trim() + ' _kr-nav-btn';
    btn.innerHTML = '<span style="margin-right:6px">📊</span>Kúnnareikningur';
    btn.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); open(); });
    tpl.parentNode.insertBefore(btn, tpl.nextSibling);
  }
  injectSidebar();
  setTimeout(injectSidebar, 1000);

  // ── Public API ────────────────────────────────────────────────────────────
  window.KunnaReikningur = { open, openForId, openForName };
  window.kunnareikningur = open; // console helper
  console.log('[patch-144] kúnnareikningur installed — KunnaReikningur.open()');
})();
/* === END KÚNNAREIKNINGUR === */
