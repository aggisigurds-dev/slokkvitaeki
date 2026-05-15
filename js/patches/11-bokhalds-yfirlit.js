/* === BOKHALDS YFIRLIT v1.1 === */
/* Detailed accounting overview of every sale in the system.
   - New nav button "📊 Bókhalds yfirlit" + dedicated view
   - Period filter (date range with quick presets), customer/product search,
     payment-method and salesperson dropdowns
   - Summary cards: total sales, ex-VAT, VSK 24%, VSK 11%, # sales, # customers
   - Sortable table (num/date/customer/staff/lines/ex/vsk/total/payment)
   - Click any row → expands line-item detail (qty, vsk%, unit price ex VAT,
     line total ex/inc VAT, product reference)
   - CSV export: summary (one row per sale) and detailed (one row per line item)
     with UTF-8 BOM, semicolon separator, Icelandic decimal comma — opens
     directly in Excel
   - Pulls from solur table (joins vidskiptavinir for kennitala/contact info) */
(() => {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (window.__bokhaldsInstalled) return;
  window.__bokhaldsInstalled = true;

  const VIEW_ID = 'view-bokhalds-yfirlit';

  function getSB() {
    if (window.DB && window.DB.sb) return window.DB.sb;
    if (!window.supabase || !window.SUPABASE_URL || !window.SUPABASE_KEY) return null;
    if (!window.__byaSB) window.__byaSB = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_KEY);
    return window.__byaSB;
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    }[c]));
  }
  function fmtKr(n) {
    if (n == null || isNaN(n)) return '';
    return Math.round(n).toLocaleString('is-IS').replace(/,/g, '.') + ' kr';
  }
  function fmtNum(n) {
    if (n == null || isNaN(n)) return '';
    return Math.round(n).toLocaleString('is-IS').replace(/,/g, '.');
  }
  function fmtDate(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d)) return '';
    return d.getDate().toString().padStart(2,'0') + '/' + (d.getMonth()+1).toString().padStart(2,'0') + '/' + d.getFullYear() + ' ' + d.getHours().toString().padStart(2,'0') + ':' + d.getMinutes().toString().padStart(2,'0');
  }
  function fmtDateOnly(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d)) return '';
    return d.getFullYear() + '-' + (d.getMonth()+1).toString().padStart(2,'0') + '-' + d.getDate().toString().padStart(2,'0');
  }
  function csvFmt(n) {
    // Icelandic: decimal comma, no thousands separator
    if (n == null || isNaN(n)) return '';
    return Math.round(n * 100) / 100 + '';
  }
  function ktFromName(name) {
    // "Vidskiptavinur 150486-2389" → "150486-2389"
    const m = (name || '').match(/(\d{6}-?\d{4})/);
    return m ? m[1] : '';
  }

  // ----- Styles -----
  const STYLE_ID = 'bokhalds-style';
  if (!document.getElementById(STYLE_ID)) {
    const s = document.createElement('style');
    s.id = STYLE_ID;
    s.textContent = `
      #${VIEW_ID} { padding: 0; }
      #${VIEW_ID} .by-wrap {
        max-width: 1400px; margin: 0 auto; padding: 20px 16px 40px;
        font-family: inherit; color: #0f172a;
      }
      #${VIEW_ID} .by-header {
        display: flex; justify-content: space-between; align-items: flex-end;
        gap: 20px; margin-bottom: 16px; flex-wrap: wrap;
      }
      #${VIEW_ID} .by-header h1 {
        margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.01em;
        display: flex; align-items: center; gap: 10px;
      }
      #${VIEW_ID} .by-sub {
        font-size: 13px; color: #64748b; margin-top: 4px;
      }
      #${VIEW_ID} .by-summary {
        display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
        gap: 10px; margin-bottom: 18px;
      }
      #${VIEW_ID} .by-card {
        background: #fff; border: 1px solid #e2e8f0; border-radius: 10px;
        padding: 12px 14px; line-height: 1.2;
      }
      #${VIEW_ID} .by-card .lbl {
        font-size: 10px; color: #64748b; font-weight: 600;
        text-transform: uppercase; letter-spacing: 0.04em;
      }
      #${VIEW_ID} .by-card .val {
        font-size: 20px; font-weight: 700; margin-top: 4px; color: #0f172a;
      }
      #${VIEW_ID} .by-card .sub {
        font-size: 11px; color: #64748b; margin-top: 2px;
      }
      #${VIEW_ID} .by-card.accent { background: #eff6ff; border-color: #bfdbfe; }
      #${VIEW_ID} .by-card.accent .val { color: #1d4ed8; }
      #${VIEW_ID} .by-card.warn { background: #fef3c7; border-color: #fde68a; }
      #${VIEW_ID} .by-card.warn .val { color: #92400e; }

      #${VIEW_ID} .by-filters {
        background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px;
        padding: 10px 12px; margin-bottom: 12px;
      }
      #${VIEW_ID} .by-row {
        display: flex; gap: 8px; flex-wrap: wrap; align-items: center;
        margin: 4px 0;
      }
      #${VIEW_ID} .by-row label {
        font-size: 11px; color: #475569; font-weight: 600;
        min-width: 60px; text-transform: uppercase; letter-spacing: 0.04em;
      }
      #${VIEW_ID} .by-input {
        padding: 6px 10px; border: 1px solid #cbd5e1; border-radius: 6px;
        font: inherit; font-size: 13px; background: #fff; color: #0f172a;
        outline: none;
      }
      #${VIEW_ID} .by-input:focus { border-color: #3b82f6; }
      #${VIEW_ID} .by-search { flex: 1; min-width: 180px; }
      #${VIEW_ID} .by-preset {
        background: #fff; border: 1px solid #cbd5e1; border-radius: 6px;
        padding: 6px 10px; font: inherit; font-size: 12px; cursor: pointer;
        color: #475569;
      }
      #${VIEW_ID} .by-preset:hover { background: #f1f5f9; border-color: #94a3b8; }
      #${VIEW_ID} .by-preset.active { background: #2563eb; color: #fff; border-color: #2563eb; }

      #${VIEW_ID} .by-actions {
        display: flex; gap: 8px; flex-wrap: wrap; align-items: center;
        margin: 12px 0;
      }
      #${VIEW_ID} .by-btn {
        padding: 8px 14px; border: 1px solid #cbd5e1; border-radius: 8px;
        background: #fff; cursor: pointer; font-size: 13px; color: #334155;
        font-family: inherit; font-weight: 500;
      }
      #${VIEW_ID} .by-btn:hover { background: #f8fafc; border-color: #94a3b8; }
      #${VIEW_ID} .by-btn.primary {
        background: #2563eb; color: #fff; border-color: #2563eb;
      }
      #${VIEW_ID} .by-btn.primary:hover { background: #1d4ed8; }
      #${VIEW_ID} .by-count {
        font-size: 12px; color: #64748b; margin-left: auto;
      }

      #${VIEW_ID} .by-table-wrap {
        background: #fff; border: 1px solid #e2e8f0; border-radius: 10px;
        overflow: hidden;
      }
      #${VIEW_ID} table.by-table {
        width: 100%; border-collapse: collapse; font-size: 13px;
      }
      #${VIEW_ID} .by-table thead th {
        background: #f8fafc; text-align: left; padding: 10px 12px;
        font-size: 11px; font-weight: 700; color: #475569;
        text-transform: uppercase; letter-spacing: 0.04em;
        border-bottom: 1px solid #e2e8f0;
        cursor: pointer; user-select: none; white-space: nowrap;
      }
      #${VIEW_ID} .by-table thead th:hover { background: #f1f5f9; }
      #${VIEW_ID} .by-table th .arr { color: #94a3b8; margin-left: 4px; font-size: 10px; }
      #${VIEW_ID} .by-table th.sorted .arr { color: #2563eb; }
      #${VIEW_ID} .by-table th.num-col { text-align: right; }
      #${VIEW_ID} .by-table tbody td {
        padding: 9px 12px; border-bottom: 1px solid #f1f5f9;
        vertical-align: top;
      }
      #${VIEW_ID} .by-table tbody td.num-col {
        text-align: right; font-variant-numeric: tabular-nums;
      }
      #${VIEW_ID} .by-table tbody tr.by-sale-row { cursor: pointer; transition: background .12s; }
      #${VIEW_ID} .by-table tbody tr.by-sale-row:hover { background: #f8fafc; }
      #${VIEW_ID} .by-table tbody tr.by-sale-row.expanded { background: #eff6ff; }
      #${VIEW_ID} .by-table tbody tr.by-sale-row.expanded td { border-bottom: none; }
      #${VIEW_ID} .by-table tbody tr.by-detail-row td {
        background: #f8fafc; padding: 0; border-bottom: 1px solid #e2e8f0;
      }
      #${VIEW_ID} .by-detail-inner {
        padding: 12px 16px;
      }
      #${VIEW_ID} .by-detail-table {
        width: 100%; border-collapse: collapse; font-size: 12px;
        background: #fff; border-radius: 6px; overflow: hidden;
        border: 1px solid #e2e8f0;
      }
      #${VIEW_ID} .by-detail-table th {
        background: #f1f5f9; padding: 6px 10px; text-align: left;
        font-size: 10px; font-weight: 700; color: #64748b;
        text-transform: uppercase; letter-spacing: 0.04em;
      }
      #${VIEW_ID} .by-detail-table th.num-col { text-align: right; }
      #${VIEW_ID} .by-detail-table td { padding: 6px 10px; border-top: 1px solid #f1f5f9; }
      #${VIEW_ID} .by-detail-table td.num-col { text-align: right; font-variant-numeric: tabular-nums; }
      #${VIEW_ID} .by-detail-meta {
        display: flex; gap: 24px; flex-wrap: wrap; margin-bottom: 10px;
        font-size: 12px;
      }
      #${VIEW_ID} .by-detail-meta .item .lbl {
        font-size: 10px; color: #64748b; text-transform: uppercase; letter-spacing: 0.04em;
        font-weight: 600; display: block;
      }
      #${VIEW_ID} .by-detail-meta .item .val { color: #0f172a; font-weight: 500; }

      #${VIEW_ID} .by-empty {
        padding: 60px 20px; text-align: center; color: #94a3b8;
        font-style: italic;
      }
      #${VIEW_ID} .by-loading {
        padding: 40px 20px; text-align: center; color: #64748b;
      }
      #${VIEW_ID} .by-payment-pill {
        display: inline-block; padding: 2px 8px; border-radius: 99px;
        font-size: 11px; font-weight: 600; background: #e0e7ff; color: #3730a3;
      }
      #${VIEW_ID} .by-payment-pill.kort { background: #d1fae5; color: #065f46; }
      #${VIEW_ID} .by-payment-pill.reidufe { background: #fef3c7; color: #92400e; }
      #${VIEW_ID} .by-payment-pill.reikn { background: #ede9fe; color: #5b21b6; }
      #${VIEW_ID} .by-num-cell {
        font-family: 'SF Mono', Menlo, Consolas, monospace; font-size: 12px;
      }

      @media print {
        body * { visibility: hidden; }
        #${VIEW_ID}, #${VIEW_ID} * { visibility: visible; }
        #${VIEW_ID} { position: absolute; left: 0; top: 0; width: 100%; }
        #${VIEW_ID} .by-actions, #${VIEW_ID} .by-filters { display: none; }
        #${VIEW_ID} .by-table thead th { background: #f1f5f9 !important; -webkit-print-color-adjust: exact; }
      }
    `;
    document.head.appendChild(s);
  }

  // ----- View HTML -----
  function buildViewHTML() {
    return `
      <main class="main-panel">
        <div class="by-wrap">
          <div class="by-header">
            <div>
              <h1>📊 Bókhalds yfirlit</h1>
              <div class="by-sub">Yfirlit yfir allar sölur með VSK-sundurliðun og útflutningi til CSV fyrir bókhald og skattaskil</div>
            </div>
          </div>

          <div class="by-summary" id="by-summary"></div>

          <div class="by-filters">
            <div class="by-row">
              <label>Tímabil</label>
              <input type="date" id="by-from" class="by-input" title="Frá dagsetningu">
              <span style="color:#94a3b8;font-size:12px;">→</span>
              <input type="date" id="by-to" class="by-input" title="Til dagsetningar">
              <button class="by-preset" data-preset="all">Allt</button>
              <button class="by-preset" data-preset="today">Í dag</button>
              <button class="by-preset" data-preset="thisWeek">Þessa viku</button>
              <button class="by-preset" data-preset="thisMonth">Þennan mánuð</button>
              <button class="by-preset" data-preset="lastMonth">Síðasta mánuð</button>
              <button class="by-preset" data-preset="thisYear">Þetta ár</button>
              <button class="by-preset" data-preset="lastYear">Síðasta ár</button>
            </div>
            <div class="by-row">
              <label>Leita</label>
              <input type="search" id="by-search" class="by-input by-search" placeholder="Salnúmer, viðskiptavinur, vöruheiti, kennitala…">
              <select id="by-payment" class="by-input"><option value="">— Allar greiðslur —</option></select>
              <select id="by-staff" class="by-input"><option value="">— Allir starfsmenn —</option></select>
            </div>
          </div>

          <div class="by-actions">
            <button class="by-btn primary" id="by-csv-summary">📥 CSV samantekt</button>
            <button class="by-btn primary" id="by-csv-detailed">📥 CSV sundurliðað</button>
            <button class="by-btn" id="by-print">🖨 Prenta</button>
            <button class="by-btn" id="by-refresh">🔄 Endurnýja</button>
            <span class="by-count" id="by-count"></span>
          </div>

          <div class="by-table-wrap">
            <table class="by-table">
              <thead>
                <tr>
                  <th data-sort="num">Sala<span class="arr"></span></th>
                  <th data-sort="date" class="sorted">Dags.<span class="arr">▼</span></th>
                  <th data-sort="customer">Viðskiptavinur<span class="arr"></span></th>
                  <th data-sort="staff">Starfsm.<span class="arr"></span></th>
                  <th data-sort="lines" class="num-col">Lín.<span class="arr"></span></th>
                  <th data-sort="ex" class="num-col">Án VSK<span class="arr"></span></th>
                  <th data-sort="vsk" class="num-col">VSK<span class="arr"></span></th>
                  <th data-sort="total" class="num-col">Samtals<span class="arr"></span></th>
                  <th data-sort="payment">Greitt</th>
                </tr>
              </thead>
              <tbody id="by-tbody">
                <tr><td colspan="9"><div class="by-loading">Hleður sölum…</div></td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </main>
    `;
  }

  // ----- State -----
  let allSales = [];
  let customerMap = new Map(); // id -> { kennitala, simi, netfang, ... }
  let productMap = new Map();  // id -> { nafn, ... }
  let filtered = [];
  let sortKey = 'date';
  let sortDir = 'desc';
  const expanded = new Set();
  let activePreset = 'all';

  // ----- Data load -----
  async function loadAllSales() {
    const SB = getSB();
    if (!SB) throw new Error('Supabase not initialized');
    const [salesRes, custRes, prodRes] = await Promise.all([
      SB.from('solur').select('id,num,starfsmadur,customer_nafn,customer_id,linur,upphaed_an_vsk,vsk_upphaed,afslattur,samtals,greitt_med,athugasemdir,created_at,paid_at,paid_method').neq('status','drog').order('created_at', { ascending: false }),
      SB.from('vidskiptavinir').select('id,kennitala,nafn,simi,netfang'),
      SB.from('vorur').select('id,nafn,flokkur')
    ]);
    if (salesRes.error) throw salesRes.error;
    allSales = (salesRes.data || []).map(s => {
      const linur = Array.isArray(s.linur) ? s.linur : [];
      // Recompute totals from linur for safety (fallback to stored values)
      const stEx = linur.reduce((a, l) => a + ((+l.qty||0) * (+l.unit_price_ex_vat||0)), 0);
      const stVsk = linur.reduce((a, l) => a + ((+l.qty||0) * (+l.unit_price_ex_vat||0) * ((+l.vsk_pct||0)/100)), 0);
      return {
        id: s.id,
        num: s.num || '',
        date: s.created_at,
        customer: s.customer_nafn || '',
        customer_id: s.customer_id,
        staff: s.starfsmadur || '',
        lines: linur,
        ex: s.upphaed_an_vsk != null ? +s.upphaed_an_vsk : stEx,
        vsk: s.vsk_upphaed != null ? +s.vsk_upphaed : stVsk,
        afslattur: +s.afslattur || 0,
        total: s.samtals != null ? +s.samtals : (stEx + stVsk),
        payment: s.greitt_med || '',
        paid_at: s.paid_at || null,
        paid_method: s.paid_method || '',
        notes: s.athugasemdir || ''
      };
    });
    customerMap = new Map((custRes.data || []).map(c => [c.id, c]));
    productMap = new Map((prodRes.data || []).map(p => [p.id, p]));
  }

  function getKt(sale) {
    if (sale.customer_id && customerMap.has(sale.customer_id)) {
      return customerMap.get(sale.customer_id).kennitala || '';
    }
    return ktFromName(sale.customer);
  }

  // ----- Filters -----
  function getRangeFromInputs() {
    const fromEl = document.getElementById('by-from');
    const toEl = document.getElementById('by-to');
    return {
      from: fromEl?.value || '',
      to: toEl?.value || ''
    };
  }
  function applyFilters() {
    const { from, to } = getRangeFromInputs();
    const q = (document.getElementById('by-search')?.value || '').trim().toLowerCase();
    const pay = document.getElementById('by-payment')?.value || '';
    const staff = document.getElementById('by-staff')?.value || '';
    const fromTs = from ? new Date(from + 'T00:00:00').getTime() : -Infinity;
    const toTs = to ? new Date(to + 'T23:59:59').getTime() : Infinity;
    filtered = allSales.filter(s => {
      const ts = new Date(s.date).getTime();
      if (ts < fromTs || ts > toTs) return false;
      if (pay && s.payment !== pay) return false;
      if (staff && s.staff !== staff) return false;
      if (q) {
        const hay = [s.num, s.customer, s.staff, s.notes, getKt(s),
          ...s.lines.map(l => (l.desc||'') + ' ' + (l.ref||''))].join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }

  // ----- Presets -----
  function applyPreset(preset) {
    activePreset = preset;
    const now = new Date();
    let from = '', to = '';
    const fmt = d => d.getFullYear() + '-' + (d.getMonth()+1).toString().padStart(2,'0') + '-' + d.getDate().toString().padStart(2,'0');
    switch (preset) {
      case 'today':
        from = to = fmt(now); break;
      case 'thisWeek': {
        const day = (now.getDay() + 6) % 7; // monday = 0
        const monday = new Date(now); monday.setDate(now.getDate() - day);
        from = fmt(monday); to = fmt(now); break;
      }
      case 'thisMonth':
        from = fmt(new Date(now.getFullYear(), now.getMonth(), 1));
        to = fmt(now); break;
      case 'lastMonth': {
        const f = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const t = new Date(now.getFullYear(), now.getMonth(), 0);
        from = fmt(f); to = fmt(t); break;
      }
      case 'thisYear':
        from = fmt(new Date(now.getFullYear(), 0, 1));
        to = fmt(now); break;
      case 'lastYear':
        from = fmt(new Date(now.getFullYear() - 1, 0, 1));
        to = fmt(new Date(now.getFullYear() - 1, 11, 31)); break;
      case 'all':
      default:
        from = ''; to = '';
    }
    const fromEl = document.getElementById('by-from');
    const toEl = document.getElementById('by-to');
    if (fromEl) fromEl.value = from;
    if (toEl) toEl.value = to;
    document.querySelectorAll('#'+VIEW_ID+' .by-preset').forEach(b => {
      b.classList.toggle('active', b.dataset.preset === preset);
    });
  }

  // ----- Sort -----
  function sortSales() {
    const key = sortKey;
    const dir = sortDir === 'asc' ? 1 : -1;
    // 2026-05-12 (#8): Date sort uses paid_at for paid greitt_sidar /
    // reikningur sales (same as the displayed date), so the table sorts
    // by the date the user actually cares about — when money landed.
    const get = {
      num: s => s.num,
      date: s => (((s.payment === 'greitt_sidar' || s.payment === 'reikningur') && s.paid_at) ? s.paid_at : s.date),
      customer: s => (s.customer || '').toLowerCase(),
      staff: s => (s.staff || '').toLowerCase(),
      lines: s => s.lines.length,
      ex: s => s.ex,
      vsk: s => s.vsk,
      total: s => s.total,
      payment: s => (s.payment || '').toLowerCase()
    }[key];
    filtered.sort((a, b) => {
      const av = get(a), bv = get(b);
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === 'number') return (av - bv) * dir;
      return (av < bv ? -1 : av > bv ? 1 : 0) * dir;
    });
  }

  // ----- Render -----
  function renderSummary() {
    const cards = [];
    const totalSamtals = filtered.reduce((a, s) => a + (s.total || 0), 0);
    const totalEx = filtered.reduce((a, s) => a + (s.ex || 0), 0);
    // Per-rate VSK breakdown
    const byRate = new Map();
    for (const s of filtered) {
      for (const l of s.lines) {
        const rate = +l.vsk_pct || 0;
        const lineEx = (+l.qty||0) * (+l.unit_price_ex_vat||0);
        const lineVsk = lineEx * (rate/100);
        const cur = byRate.get(rate) || { ex: 0, vsk: 0 };
        cur.ex += lineEx; cur.vsk += lineVsk;
        byRate.set(rate, cur);
      }
    }
    const customers = new Set();
    for (const s of filtered) {
      customers.add(s.customer_id || s.customer || '');
    }
    cards.push({ lbl: 'Heildarsala', val: fmtKr(totalSamtals), cls: 'accent', sub: filtered.length + (filtered.length === 1 ? ' sala' : ' sölur') });
    cards.push({ lbl: 'Án VSK', val: fmtKr(totalEx) });
    // VSK by rate
    const sortedRates = [...byRate.keys()].sort((a,b) => b - a);
    for (const rate of sortedRates) {
      const v = byRate.get(rate);
      cards.push({ lbl: 'VSK ' + rate + '%', val: fmtKr(v.vsk), sub: 'af ' + fmtKr(v.ex) });
    }
    cards.push({ lbl: 'Viðskiptavinir', val: customers.size + '', sub: filtered.length ? Math.round(filtered.length / customers.size * 10) / 10 + ' sölur að meðaltali' : '' });
    const html = cards.map(c =>
      '<div class="by-card' + (c.cls ? ' ' + c.cls : '') + '">'
      + '<div class="lbl">' + esc(c.lbl) + '</div>'
      + '<div class="val">' + esc(c.val) + '</div>'
      + (c.sub ? '<div class="sub">' + esc(c.sub) + '</div>' : '')
      + '</div>'
    ).join('');
    document.getElementById('by-summary').innerHTML = html;
  }

  function payClass(p) {
    const x = (p || '').toLowerCase();
    if (/kort/.test(x)) return 'kort';
    if (/reiðu|reidu/.test(x)) return 'reidufe';
    if (/reikn/.test(x)) return 'reikn';
    return '';
  }

  function renderTable() {
    const tbody = document.getElementById('by-tbody');
    if (!tbody) return;
    if (!filtered.length) {
      tbody.innerHTML = '<tr><td colspan="9"><div class="by-empty">Engar sölur fundust á völdu tímabili</div></td></tr>';
      document.getElementById('by-count').textContent = '';
      return;
    }
    document.getElementById('by-count').textContent = filtered.length + ' sölur';
    const rows = [];
    for (const s of filtered) {
      const isOpen = expanded.has(String(s.id));
      rows.push(
        '<tr class="by-sale-row' + (isOpen ? ' expanded' : '') + '" data-id="' + esc(s.id) + '">'
        + '<td class="by-num-cell">' + esc(s.num) + '</td>'
        // 2026-05-12 (#8): For paid greitt_sidar / reikningur sales, show
        // the date of payment (when the customer actually picked up & paid)
        // — not the date the verkbeiðni was created. That way the row
        // appears where the user expects in the date sort. The original
        // created date is still visible in the expanded detail ("Móttekið").
        + '<td>' + esc(fmtDate(((s.payment === 'greitt_sidar' || s.payment === 'reikningur') && s.paid_at) ? s.paid_at : s.date))
        + ((s.paid_at && (s.payment === 'greitt_sidar' || s.payment === 'reikningur')) ? '<div style="font-size:10px;color:#94a3b8">móttekið ' + esc(fmtDate(s.date)) + '</div>' : '')
        + '</td>'
        + '<td>' + esc(s.customer || '—') + (getKt(s) ? '<div style="font-size:11px;color:#64748b;">' + esc(getKt(s)) + '</div>' : '') + '</td>'
        + '<td>' + esc(s.staff || '') + '</td>'
        + '<td class="num-col">' + s.lines.length + '</td>'
        + '<td class="num-col">' + fmtNum(s.ex) + '</td>'
        + '<td class="num-col">' + fmtNum(s.vsk) + '</td>'
        + '<td class="num-col" style="font-weight:700;">' + fmtNum(s.total) + '</td>'
        + '<td><span class="by-payment-pill ' + payClass(s.payment) + '">' + esc(s.payment || '—') + '</span></td>'
        + '</tr>'
      );
      if (isOpen) {
        rows.push('<tr class="by-detail-row"><td colspan="9">' + renderDetail(s) + '</td></tr>');
      }
    }
    tbody.innerHTML = rows.join('');
    // Row toggle is wired via delegation on tbody (in init), not per-row
  }

  function renderDetail(sale) {
    const lineRows = sale.lines.map(l => {
      const qty = +l.qty || 0;
      const unitEx = +l.unit_price_ex_vat || 0;
      const rate = +l.vsk_pct || 0;
      const lineEx = qty * unitEx;
      const lineVsk = lineEx * (rate / 100);
      const lineInc = lineEx + lineVsk;
      const product = l.product_id ? productMap.get(l.product_id) : null;
      return `<tr>
        <td>${esc(l.product_id != null ? '#' + l.product_id : '')}</td>
        <td>${esc(l.desc || (product ? product.nafn : ''))}${l.ref ? ' <span style="color:#94a3b8;font-size:11px;">· ' + esc(l.ref) + '</span>' : ''}</td>
        <td>${esc(l.type || '')}</td>
        <td class="num-col">${qty.toLocaleString('is-IS')}</td>
        <td class="num-col">${fmtNum(unitEx)}</td>
        <td class="num-col">${rate}%</td>
        <td class="num-col">${fmtNum(lineEx)}</td>
        <td class="num-col">${fmtNum(lineVsk)}</td>
        <td class="num-col" style="font-weight:600;">${fmtNum(lineInc)}</td>
      </tr>`;
    }).join('');
    return `
      <div class="by-detail-inner">
        <div class="by-detail-meta">
          <div class="item"><span class="lbl">Salnúmer</span><span class="val">${esc(sale.num)}</span></div>
          <div class="item"><span class="lbl">Móttekið</span><span class="val">${esc(fmtDate(sale.date))}</span></div>
          ${(() => {
            // 2026-05-12 (#8): Show the paid date as its own row, prominent,
            // so it's easy to scan when looking for "what got paid today".
            if (sale.paid_at) {
              return `<div class="item"><span class="lbl">Greitt</span><span class="val" style="color:#166534;font-weight:700;">${esc(fmtDate(sale.paid_at))}${sale.paid_method ? ' <span style="font-weight:500;color:#475569">('+esc(sale.paid_method)+')</span>' : ''}</span></div>`;
            }
            return '';
          })()}
          <div class="item"><span class="lbl">Kennitala</span><span class="val">${esc(getKt(sale) || '—')}</span></div>
          <div class="item"><span class="lbl">Starfsmaður</span><span class="val">${esc(sale.staff || '—')}</span></div>
          <div class="item"><span class="lbl">Greiðsluaðferð</span><span class="val">${esc(sale.payment || '—')}</span></div>
          ${(() => {
            const isInvoice = sale.payment === 'reikningur' || sale.payment === 'greitt_sidar';
            if (!isInvoice) return '';
            if (sale.paid_at) {
              return `<div class="item"><span class="lbl">Greiðslustaða</span><span class="val" style="color:#166534;font-weight:600;">✓ Greitt</span></div>`;
            }
            return `<div class="item"><span class="lbl">Greiðslustaða</span><span class="val" style="color:#dc2626;font-weight:700;">⚠ Ógreitt</span></div>`;
          })()}
          ${sale.afslattur ? `<div class="item"><span class="lbl">Afsláttur</span><span class="val">${fmtKr(sale.afslattur)}</span></div>` : ''}
        </div>

        <!-- 2026-05-12 (#10): Editable, append-only athugasemd log. Existing
             notes display in a scrollable read-only history block; a small
             input lets the user append a new timestamped entry that survives
             across sessions and is visible to everyone. -->
        <div class="by-note-box" data-sale-id="${esc(sale.id)}" style="margin:0 0 12px;padding:10px 13px;background:#fffbeb;border:1px solid #fde68a;border-radius:8px;">
          <div style="font-size:11px;font-weight:700;color:#92400e;text-transform:uppercase;letter-spacing:.05em;margin-bottom:5px">📝 Athugasemdir</div>
          ${sale.notes ? `<div class="by-note-history" style="white-space:pre-wrap;font-size:12.5px;color:#334155;line-height:1.45;margin-bottom:7px;max-height:120px;overflow-y:auto;background:#fff;border:1px solid #fef3c7;border-radius:6px;padding:7px 9px;">${esc(sale.notes)}</div>` : ''}
          <div style="display:flex;gap:6px;align-items:stretch">
            <input type="text" class="by-note-input" placeholder="+ Bæta við athugasemd…" style="flex:1;padding:7px 10px;border:1px solid #fcd34d;border-radius:6px;font:inherit;font-size:12.5px;background:#fff;outline:none">
            <button type="button" class="by-note-add" style="padding:7px 13px;background:#f59e0b;color:#fff;border:none;border-radius:6px;cursor:pointer;font:inherit;font-size:12px;font-weight:700;white-space:nowrap">Vista</button>
          </div>
        </div>
        <div style="margin:8px 0 12px;display:flex;gap:8px;flex-wrap:wrap;">
          <button class="by-reprint-btn" data-sale-id="${esc(sale.id)}" type="button"
            style="padding:8px 14px;background:#1a7f4b;color:#fff;border:none;border-radius:7px;
                   font-weight:600;font-size:13px;cursor:pointer">
            🖨 Prenta aftur (kvittun)
          </button>
          ${(() => {
            // Add a "Merkja greitt" button if this sale is invoice/pay-later AND unpaid
            const isInvoice = sale.payment === 'reikningur' || sale.payment === 'greitt_sidar';
            if (!isInvoice || sale.paid_at) return '';
            return `<button class="by-markpaid-btn" data-sale-id="${esc(sale.id)}" type="button"
              style="padding:8px 14px;background:#16a34a;color:#fff;border:none;border-radius:7px;
                     font-weight:600;font-size:13px;cursor:pointer">
              ✓ Merkja greitt
            </button>`;
          })()}
        </div>
        <table class="by-detail-table">
          <thead>
            <tr>
              <th>Vöru-ID</th>
              <th>Lýsing</th>
              <th>Tegund</th>
              <th class="num-col">Magn</th>
              <th class="num-col">Ein.verð án VSK</th>
              <th class="num-col">VSK %</th>
              <th class="num-col">Lína án VSK</th>
              <th class="num-col">VSK upph.</th>
              <th class="num-col">Lína m. VSK</th>
            </tr>
          </thead>
          <tbody>${lineRows}</tbody>
        </table>
      </div>
    `;
  }

  function renderSortHeaders() {
    document.querySelectorAll('#'+VIEW_ID+' .by-table thead th').forEach(th => {
      const k = th.dataset.sort;
      const arr = th.querySelector('.arr');
      if (k === sortKey) {
        th.classList.add('sorted');
        if (arr) arr.textContent = sortDir === 'asc' ? '▲' : '▼';
      } else {
        th.classList.remove('sorted');
        if (arr) arr.textContent = '';
      }
    });
  }

  function renderAll() {
    sortSales();
    renderSortHeaders();
    renderSummary();
    renderTable();
  }

  function populateFilterDropdowns() {
    const pays = new Set(), staffs = new Set();
    for (const s of allSales) {
      if (s.payment) pays.add(s.payment);
      if (s.staff) staffs.add(s.staff);
    }
    const paySel = document.getElementById('by-payment');
    const staffSel = document.getElementById('by-staff');
    if (paySel) {
      const cur = paySel.value;
      paySel.innerHTML = '<option value="">— Allar greiðslur —</option>' +
        [...pays].sort().map(p => '<option value="' + esc(p) + '">' + esc(p) + '</option>').join('');
      paySel.value = cur;
    }
    if (staffSel) {
      const cur = staffSel.value;
      staffSel.innerHTML = '<option value="">— Allir starfsmenn —</option>' +
        [...staffs].sort().map(p => '<option value="' + esc(p) + '">' + esc(p) + '</option>').join('');
      staffSel.value = cur;
    }
  }

  // ----- CSV Export -----
  function csvField(v) {
    if (v == null) return '';
    const s = String(v);
    if (/[";\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  }
  function downloadCSV(filename, header, rows) {
    const sep = ';';
    const lines = [header.join(sep), ...rows.map(r => r.map(csvField).join(sep))];
    const csv = '\ufeff' + lines.join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1000);
  }
  function exportSummaryCSV() {
    const header = ['Salnúmer','Dagsetning','Tími','Viðskiptavinur','Kennitala','Starfsmaður','Fjöldi lína','Án VSK','VSK','Afsláttur','Samtals','Greitt með','Athugasemdir'];
    const rows = filtered.map(s => {
      const d = new Date(s.date);
      return [
        s.num,
        fmtDateOnly(s.date),
        d.getHours().toString().padStart(2,'0') + ':' + d.getMinutes().toString().padStart(2,'0'),
        s.customer,
        getKt(s),
        s.staff,
        s.lines.length,
        csvFmt(s.ex).replace('.', ','),
        csvFmt(s.vsk).replace('.', ','),
        csvFmt(s.afslattur).replace('.', ','),
        csvFmt(s.total).replace('.', ','),
        s.payment,
        s.notes
      ];
    });
    const today = fmtDateOnly(new Date().toISOString());
    downloadCSV('bokhalds-yfirlit-samantekt-' + today + '.csv', header, rows);
  }
  function exportDetailedCSV() {
    const header = ['Salnúmer','Dagsetning','Tími','Viðskiptavinur','Kennitala','Starfsmaður','Vöru-ID','Vörutegund','Lýsing','Tilvísun','Magn','Ein.verð án VSK','Lína án VSK','VSK %','VSK upphæð','Lína m. VSK','Greitt með','Athugasemdir'];
    const rows = [];
    for (const s of filtered) {
      const d = new Date(s.date);
      const hm = d.getHours().toString().padStart(2,'0') + ':' + d.getMinutes().toString().padStart(2,'0');
      const date = fmtDateOnly(s.date);
      const kt = getKt(s);
      for (const l of s.lines) {
        const qty = +l.qty || 0;
        const unitEx = +l.unit_price_ex_vat || 0;
        const rate = +l.vsk_pct || 0;
        const lineEx = qty * unitEx;
        const lineVsk = lineEx * (rate / 100);
        const lineInc = lineEx + lineVsk;
        rows.push([
          s.num, date, hm,
          s.customer, kt, s.staff,
          l.product_id != null ? l.product_id : '',
          l.type || '',
          l.desc || '',
          l.ref || '',
          qty.toString().replace('.', ','),
          csvFmt(unitEx).replace('.', ','),
          csvFmt(lineEx).replace('.', ','),
          rate,
          csvFmt(lineVsk).replace('.', ','),
          csvFmt(lineInc).replace('.', ','),
          s.payment, s.notes
        ]);
      }
    }
    const today = fmtDateOnly(new Date().toISOString());
    downloadCSV('bokhalds-yfirlit-sundurlidad-' + today + '.csv', header, rows);
  }

  // ----- Init / wiring -----
  let initialized = false;
  async function init() {
    if (initialized) return;
    initialized = true;
    try {
      await loadAllSales();
    } catch (e) {
      const tbody = document.getElementById('by-tbody');
      if (tbody) tbody.innerHTML = '<tr><td colspan="9"><div class="by-empty" style="color:#dc2626;">Villa við að sækja sölur: ' + esc(e.message) + '</div></td></tr>';
      return;
    }
    populateFilterDropdowns();

    const onChange = () => { applyFilters(); renderAll(); };
    document.getElementById('by-from')?.addEventListener('change', () => { activePreset = 'custom'; document.querySelectorAll('#'+VIEW_ID+' .by-preset').forEach(b => b.classList.remove('active')); onChange(); });
    document.getElementById('by-to')?.addEventListener('change', () => { activePreset = 'custom'; document.querySelectorAll('#'+VIEW_ID+' .by-preset').forEach(b => b.classList.remove('active')); onChange(); });
    document.getElementById('by-search')?.addEventListener('input', onChange);
    document.getElementById('by-payment')?.addEventListener('change', onChange);
    document.getElementById('by-staff')?.addEventListener('change', onChange);

    document.querySelectorAll('#'+VIEW_ID+' .by-preset').forEach(b => {
      b.addEventListener('click', () => { applyPreset(b.dataset.preset); onChange(); });
    });

    document.querySelectorAll('#'+VIEW_ID+' .by-table thead th[data-sort]').forEach(th => {
      th.addEventListener('click', () => {
        const k = th.dataset.sort;
        if (sortKey === k) sortDir = sortDir === 'asc' ? 'desc' : 'asc';
        else { sortKey = k; sortDir = (k === 'date' || k === 'total' || k === 'ex' || k === 'vsk' || k === 'lines') ? 'desc' : 'asc'; }
        renderAll();
      });
    });

    document.getElementById('by-csv-summary')?.addEventListener('click', exportSummaryCSV);
    document.getElementById('by-csv-detailed')?.addEventListener('click', exportDetailedCSV);
    document.getElementById('by-print')?.addEventListener('click', () => window.print());
    document.getElementById('by-refresh')?.addEventListener('click', async () => {
      const btn = document.getElementById('by-refresh');
      btn.disabled = true; btn.textContent = '🔄 Hleður…';
      try { await loadAllSales(); populateFilterDropdowns(); applyFilters(); renderAll(); }
      finally { btn.disabled = false; btn.textContent = '🔄 Endurnýja'; }
    });

    // Delegated row-click handler — survives every renderTable() rebuild
    const tbody = document.getElementById('by-tbody');
    if (tbody) {
      // 2026-05-12 (#10): Enter on note input == click Vista button
      tbody.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter') return;
        const inp = e.target && e.target.classList && e.target.classList.contains('by-note-input') ? e.target : null;
        if (!inp) return;
        e.preventDefault();
        const btn = inp.closest('.by-note-box')?.querySelector('.by-note-add');
        if (btn) btn.click();
      });
      tbody.addEventListener('click', async (e) => {
        // "Merkja greitt" button — open the mark-paid modal for unpaid
        // invoice/pay-later sales. Don't bubble to the row toggle.
        const mpBtn = e.target.closest('.by-markpaid-btn');
        if (mpBtn) {
          e.stopPropagation();
          const sid = mpBtn.getAttribute('data-sale-id');
          const sale = allSales.find(s => String(s.id) === String(sid));
          if (!sale) { alert('Salan fannst ekki.'); return; }
          if (!window.InvoicePaid || typeof window.InvoicePaid.markPaid !== 'function') {
            alert('Greiðslumerking er ekki tiltæk.'); return;
          }
          // Adapt the BY-format sale to what InvoicePaid.markPaid expects.
          const adapted = {
            id: sale.id,
            num: sale.num,
            customer: sale.customer || '',
            total: sale.total,
            created_at: sale.date,
            payment: sale.payment
          };
          await window.InvoicePaid.markPaid(adapted, (updated) => {
            // Copy the new paid status into the BY allSales row so the
            // detail panel re-renders with the green "✓ Greitt" badge.
            sale.paid_at = updated.paid_at || new Date().toISOString();
            sale.paid_method = updated.paid_method || '';
            renderTable();
            // Refresh the InvoicePaid panel/badge if it's exposed
            try { window.InvoicePaid && window.InvoicePaid.refresh && window.InvoicePaid.refresh(); } catch (_) {}
          });
          return;
        }

        // "Prenta aftur" button — re-print the saved receipt using the
        // SalaInvoice template. Don't bubble up to the row toggle below.
        const printBtn = e.target.closest('.by-reprint-btn');
        if (printBtn) {
          e.stopPropagation();
          const sid = printBtn.getAttribute('data-sale-id');
          const sale = allSales.find(s => String(s.id) === String(sid));
          if (!sale) { alert('Salan fannst ekki.'); return; }
          if (!window.SalaInvoice || typeof window.SalaInvoice.renderFromSale !== 'function') {
            alert('Reikningsmótið er ekki tiltækt.'); return;
          }
          // Pull the customer (kennitala/heimilisfang) from the lookup map so
          // the bill-to block on the reprinted receipt is complete.
          const cust = sale.customer_id ? customerMap.get(sale.customer_id) : null;
          const win = window.open('', '_blank', 'width=900,height=1100');
          if (!win) { alert('Vinsamlegast leyfðu sprettiglugga til að prenta.'); return; }
          // Reshape the sale row from BY-format back to the raw `solur` row
          // shape that renderFromSale expects (it reads .linur, .num, etc.).
          window.SalaInvoice.renderFromSale(win, {
            id: sale.id,
            num: sale.num,
            customer_nafn: sale.customer,
            customer_id: sale.customer_id,
            starfsmadur: sale.staff,
            linur: sale.lines,
            upphaed_an_vsk: sale.ex,
            vsk_upphaed: sale.vsk,
            afslattur: sale.afslattur || 0,
            samtals: sale.total,
            greitt_med: sale.payment,
            athugasemdir: sale.notes,
            created_at: sale.date
          }, cust);
          return;
        }
        // 2026-05-12 (#10): "Vista" button on the athugasemd-strengur — append
        // a timestamped entry to solur.athugasemdir. Append-only so previous
        // entries are preserved as a breadcrumb trail.
        const noteBtn = e.target.closest('.by-note-add');
        if (noteBtn) {
          e.stopPropagation();
          const box = noteBtn.closest('.by-note-box');
          if (!box) return;
          const sid = box.getAttribute('data-sale-id');
          const sale = allSales.find(s => String(s.id) === String(sid));
          if (!sale) { alert('Salan fannst ekki.'); return; }
          const input = box.querySelector('.by-note-input');
          const txt = (input.value || '').trim();
          if (!txt) { input.focus(); return; }
          const now = new Date();
          const stamp = now.getFullYear() + '-' +
                        String(now.getMonth() + 1).padStart(2, '0') + '-' +
                        String(now.getDate()).padStart(2, '0') + ' ' +
                        String(now.getHours()).padStart(2, '0') + ':' +
                        String(now.getMinutes()).padStart(2, '0');
          const newEntry = '[' + stamp + '] ' + txt;
          const merged = sale.notes ? (sale.notes + '\n' + newEntry) : newEntry;
          noteBtn.disabled = true;
          noteBtn.textContent = '…';
          try {
            const SB = window.DB && window.DB.sb;
            if (!SB) throw new Error('Engin gagnabankatenging');
            const { error } = await SB.from('solur').update({ athugasemdir: merged }).eq('id', sale.id);
            if (error) throw error;
            sale.notes = merged;
            // Re-render the detail panel so the new entry appears in the history
            const detailTr = box.closest('tr.by-detail-row');
            const detailTd = detailTr && detailTr.querySelector('td');
            if (detailTd) detailTd.innerHTML = renderDetail(sale);
            if (window.Toast && Toast.show) Toast.show('✓ Athugasemd vistuð');
          } catch (err) {
            alert('Villa: ' + (err.message || err));
            noteBtn.disabled = false;
            noteBtn.textContent = 'Vista';
          }
          return;
        }

        const tr = e.target.closest('.by-sale-row');
        if (!tr || !tbody.contains(tr)) return;
        const id = tr.dataset.id;
        if (expanded.has(id)) expanded.delete(id);
        else expanded.add(id);
        renderTable();
      });
    }

    applyPreset('all');
    applyFilters();
    renderAll();
  }

  // ----- View injection / nav -----
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
  }
  function ensureNavButton() {
    if (document.querySelector('.vnav-btn[data-bokhalds]')) return;
    const tekjurBtn = Array.from(document.querySelectorAll('.vnav-btn'))
      .find(b => /Tekjur/i.test(b.textContent));
    if (!tekjurBtn || !tekjurBtn.parentElement) return;
    const btn = document.createElement('button');
    btn.className = tekjurBtn.className.replace(/\bactive\b/g, '').trim();
    btn.setAttribute('data-bokhalds', '1');
    btn.setAttribute('data-view', 'bokhalds-yfirlit');
    btn.textContent = '📊 Bókhalds yfirlit';
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      switchToView();
    });
    tekjurBtn.parentElement.insertBefore(btn, tekjurBtn.nextSibling);
  }
  function switchToView() {
    ensureView();
    document.querySelectorAll('.view.active').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.vnav-btn.active').forEach(b => b.classList.remove('active'));
    const view = document.getElementById(VIEW_ID);
    if (view) view.classList.add('active');
    const btn = document.querySelector('.vnav-btn[data-bokhalds]');
    if (btn) btn.classList.add('active');
    setTimeout(init, 50);
  }

  ensureView();
  ensureNavButton();
  setTimeout(() => { ensureView(); ensureNavButton(); }, 500);
  setTimeout(() => { ensureView(); ensureNavButton(); }, 1500);
  const navObs = new MutationObserver(() => { ensureView(); ensureNavButton(); });
  navObs.observe(document.body, { childList: true, subtree: true });

  window.BokhaldsYfirlit = {
    open: switchToView,
    refresh: async () => { await loadAllSales(); populateFilterDropdowns(); applyFilters(); renderAll(); },
    version: 'v1.1'
  };
})();
/* === END BOKHALDS YFIRLIT === */
