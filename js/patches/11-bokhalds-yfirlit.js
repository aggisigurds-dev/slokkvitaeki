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
        max-width: 1720px; margin: 0 auto; padding: 10px 18px 60px;
        font-family: 'Space Grotesk', system-ui, sans-serif; color: #11141c;
      }
      #${VIEW_ID} .by-header {
        display: flex; justify-content: space-between; align-items: flex-end;
        gap: 20px; margin-bottom: 18px; flex-wrap: wrap;
      }
      #${VIEW_ID} .by-header h1 {
        margin: 0; font-size: 26px; font-weight: 700; letter-spacing: -0.01em;
        color: #11141c; display: flex; align-items: center; gap: 10px;
      }
      #${VIEW_ID} .by-sub {
        font-size: 13px; color: #5b6472; margin-top: 4px;
      }
      /* Brunastál: the header sits on the dark page band → flip to white so it
         is not dark-on-dark. !important to beat patch 240's global
         .view h1 color rule. Scoped; light themes untouched. */
      html[data-thm-preset="brunastal"] #${VIEW_ID} .by-header h1 {
        color: #fff !important; text-shadow: 0 2px 8px rgba(0,0,0,.55);
      }
      html[data-thm-preset="brunastal"] #${VIEW_ID} .by-sub {
        color: rgba(255,255,255,.62) !important;
      }
      #${VIEW_ID} .by-summary {
        display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
        gap: 12px; margin-bottom: 20px;
      }
      #${VIEW_ID} .by-card {
        background: #fff; border: 1px solid rgba(20,24,34,.08); border-radius: 14px;
        padding: 16px 18px; line-height: 1.2;
        box-shadow: 0 8px 22px -16px rgba(25,35,60,.18);
      }
      #${VIEW_ID} .by-card .lbl {
        font-size: 10.5px; color: #8a93a5; font-weight: 700;
        text-transform: uppercase; letter-spacing: 0.14em;
      }
      #${VIEW_ID} .by-card .val {
        font-family: 'Space Mono', monospace;
        font-size: 30px; font-weight: 700; margin-top: 4px; color: #11141c;
      }
      #${VIEW_ID} .by-card .sub {
        font-size: 11.5px; color: #9098a6; margin-top: 3px;
      }
      /* Heildarsala — hero blue tile per spec */
      #${VIEW_ID} .by-card.accent {
        background: linear-gradient(150deg,#6f97ff 0%,#2f5fe0 34%,#1c3d8c 60%,#0b1838 100%);
        border-color: transparent; color: #fff;
        box-shadow: 0 10px 28px -16px rgba(11,24,56,.5), inset 0 1px 0 rgba(255,255,255,.45);
      }
      #${VIEW_ID} .by-card.accent .lbl { color: rgba(255,255,255,.7); }
      #${VIEW_ID} .by-card.accent .val { color: #fff; }
      #${VIEW_ID} .by-card.accent .sub { color: rgba(255,255,255,.7); }
      /* Drög — amber tinted tile */
      #${VIEW_ID} .by-card.warn {
        background: linear-gradient(180deg,#fff7e6,#fff);
        border-color: #fde68a;
      }
      #${VIEW_ID} .by-card.warn .val { color: #c77a16; }

      #${VIEW_ID} .by-filters {
        background: #fff; border: 1px solid rgba(20,24,34,.08); border-radius: 14px;
        padding: 14px 16px; margin-bottom: 14px;
        box-shadow: 0 8px 22px -16px rgba(25,35,60,.16);
      }
      #${VIEW_ID} .by-row {
        display: flex; gap: 8px; flex-wrap: wrap; align-items: center;
        margin: 5px 0;
      }
      #${VIEW_ID} .by-row label {
        font-size: 10.5px; color: #8a93a5; font-weight: 700;
        min-width: 60px; text-transform: uppercase; letter-spacing: 0.12em;
      }
      #${VIEW_ID} .by-input {
        height: 38px; padding: 0 12px; border: 1px solid rgba(20,24,34,.14); border-radius: 10px;
        font: inherit; font-size: 13px; background: #fff; color: #141822;
        outline: none;
      }
      #${VIEW_ID} .by-input:focus { border-color: #2f5fe0; box-shadow: 0 0 0 3px rgba(47,95,224,.12); }
      #${VIEW_ID} .by-search { flex: 1; min-width: 200px; }
      /* Filter chips — inactive metal, active = metallic black per spec */
      #${VIEW_ID} .by-preset {
        background: linear-gradient(180deg,#fdfdfe,#e3e7ee);
        border: 1px solid rgba(20,24,34,.14); border-radius: 10px;
        padding: 7px 13px; font: inherit; font-size: 12.5px; font-weight: 600;
        cursor: pointer; color: #3a4250; min-height: 32px;
      }
      #${VIEW_ID} .by-preset:hover { background: linear-gradient(180deg,#fff,#e3e7ee); border-color: rgba(20,24,34,.22); }
      #${VIEW_ID} .by-preset.active {
        background: linear-gradient(145deg,#08080a 0%,#26262c 26%,#3a3a41 50%,#19191d 74%,#070709 100%);
        color: #fff; border-color: #0a0b0d;
      }

      #${VIEW_ID} .by-actions {
        display: flex; gap: 9px; flex-wrap: wrap; align-items: center;
        margin: 14px 0;
      }
      #${VIEW_ID} .by-btn {
        height: 38px; padding: 0 14px; border: 1px solid rgba(20,24,34,.14); border-radius: 10px;
        background: #fff; cursor: pointer; font-size: 12.5px; color: #3a4250;
        font-family: inherit; font-weight: 600;
      }
      #${VIEW_ID} .by-btn:hover { background: #f1f5f9; border-color: rgba(20,24,34,.22); }
      /* Primary CSV button — accent metallic blue per spec --btn-grad */
      #${VIEW_ID} .by-btn.primary {
        background: linear-gradient(145deg,#03040a 0%,#0c1730 24%,#1d3c80 48%,#264c9e 56%,#0f2042 78%,#03060d 100%);
        color: #fff; border: 1px solid rgba(110,155,255,.55);
        box-shadow: 0 0 16px -4px rgba(64,113,240,.5), inset 0 1px 0 rgba(255,255,255,.16);
        font-weight: 700;
      }
      #${VIEW_ID} .by-btn.primary:hover { filter: brightness(1.14); }
      #${VIEW_ID} .by-count {
        font-family: 'Space Mono', monospace;
        font-size: 12px; color: #9098a6; margin-left: auto;
      }

      /* Table — surface card + sticky header per spec §4 */
      #${VIEW_ID} .by-table-wrap {
        background: #fff; border: 1px solid rgba(20,24,34,.08); border-radius: 16px;
        box-shadow: 0 10px 28px -16px rgba(25,35,60,.16);
        overflow: hidden;
      }
      #${VIEW_ID} .by-table-scroll { overflow-x: auto; }
      #${VIEW_ID} table.by-table {
        width: 100%; min-width: 980px; border-collapse: collapse; font-size: 13px;
      }
      #${VIEW_ID} .by-table thead { position: sticky; top: 0; z-index: 2; }
      #${VIEW_ID} .by-table thead th {
        background: #eef1f6; text-align: left; padding: 11px 14px;
        font-size: 10px; font-weight: 700; color: #8a93a5;
        text-transform: uppercase; letter-spacing: 0.08em;
        box-shadow: 0 1px 0 rgba(20,24,34,.1);
        cursor: pointer; user-select: none; white-space: nowrap;
      }
      #${VIEW_ID} .by-table thead th:hover { background: #e7eaf1; }
      #${VIEW_ID} .by-table th .arr { color: #94a3b8; margin-left: 4px; font-size: 10px; }
      #${VIEW_ID} .by-table th[data-sort] .arr:empty::after { content: '⇅'; color: #cbd5e1; }
      #${VIEW_ID} .by-table th.sorted .arr { color: #2f5fe0; }
      #${VIEW_ID} .by-table th.num-col { text-align: right; }
      #${VIEW_ID} .by-table tbody td {
        padding: 12px 14px; border-bottom: 1px solid rgba(20,24,34,.05);
        vertical-align: top; color: #3a4250;
      }
      #${VIEW_ID} .by-table tbody td.num-col {
        text-align: right; font-family: 'Space Mono', monospace; font-weight: 600; color: #11141c;
      }
      #${VIEW_ID} .by-table tbody tr.by-sale-row { cursor: pointer; transition: background .12s; }
      #${VIEW_ID} .by-table tbody tr.by-sale-row:hover { background: #f3f6fc; }
      #${VIEW_ID} .by-table tbody tr.by-sale-row.expanded { background: #eef3ff; }
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
      /* Status / payment chips per spec §3 — filled colour on tinted bg with 1px border */
      #${VIEW_ID} .by-payment-pill {
        display: inline-block; padding: 3px 9px; border-radius: 7px;
        font-size: 11.5px; font-weight: 600;
        background: #f1f5f9; color: #64748b; border: 1px solid #e2e8f0;
      }
      #${VIEW_ID} .by-payment-pill.kort { background: #ecfdf5; color: #047857; border-color: #a7f3d0; }
      #${VIEW_ID} .by-payment-pill.reidufe { background: #fffbeb; color: #b45309; border-color: #fde68a; }
      #${VIEW_ID} .by-payment-pill.reikn { background: #f5f3ff; color: #6d28d9; border-color: #ddd6fe; }
      #${VIEW_ID} .by-num-cell {
        font-family: 'Space Mono', monospace; font-size: 12px; color: #11141c;
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
          <div class="by-header" style="display:flex;flex-direction:column;gap:2px;margin-bottom:14px">
            <h1 style="margin:0;font-family:'Space Grotesk',system-ui,sans-serif;font-size:22px;font-weight:700;color:var(--ink1,#11141c);letter-spacing:-.01em;line-height:1.15">📊 Bókhalds yfirlit</h1>
            <div class="by-sub" style="font-size:12.5px;color:var(--ink3,#5b6472);margin-top:2px">Yfirlit yfir allar sölur með VSK-sundurliðun og útflutningi til CSV fyrir bókhald og skattaskil</div>
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
              <label style="display:inline-flex;align-items:center;gap:6px;min-width:0;font-size:12px;color:#475569;font-weight:600;text-transform:none;letter-spacing:0;cursor:pointer;user-select:none;background:#fff;border:1px solid #cbd5e1;border-radius:6px;padding:6px 10px">
                <input type="checkbox" id="by-include-drafts" style="cursor:pointer" checked>📝 Sýna drög
              </label>
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
           <div class="by-table-scroll">
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
                  <th data-sort="payment">Greitt<span class="arr"></span></th>
                  <th title="🧯 slökkvitæki · 🔥 brunakerfi · 🏪 almennt/búð (in-store)">Tegund</th>
                </tr>
              </thead>
              <tbody id="by-tbody">
                <tr><td colspan="10"><div class="by-loading">Hleður sölum…</div></td></tr>
              </tbody>
            </table>
           </div>
          </div>
        </div>
      </main>
    `;
  }

  // ----- State -----
  let allSales = [];
  let customerMap = new Map(); // id -> { kennitala, simi, netfang, ... } (vidskiptavinir)
  let companyMap = new Map();  // id -> { kennitala, nafn } (fyrirtaeki)
  let ktByName = new Map();     // normName -> kt (unambiguous across both tables)
  let vbByParent = {};         // R-NNN -> [status1, status2, ...] from verkbeidnir

  // Pickup-status helper: returns { icon, label, color } based on whether all
  // related verkbeiðnir for a sale have been collected, are still at the shop,
  // or there's no linkage. Only meaningful for greitt_sidar / reikningur sales.
  function pickupStatusFor(saleNum) {
    const statuses = vbByParent[saleNum] || [];
    if (!statuses.length) return null;
    const allCollected = statuses.every(s => s === 'collected' || s === 'done');
    const anyAtShop = statuses.some(s => s === 'received' || s === 'ready' || s === 'inprogress');
    if (allCollected) return { icon: '✅', label: 'Sótt', color: '#16a34a' };
    if (anyAtShop) return { icon: '🏪', label: 'Hjá þér', color: '#f59e0b' };
    return null;
  }
  let productMap = new Map();  // id -> { nafn, ... }
  let filtered = [];
  let sortKey = 'date';
  let sortDir = 'desc';
  const expanded = new Set();
  let activePreset = 'all';
  let _loadedMode = 'recent';   // 'recent' (newest 400) | 'range' | 'all'
  // Re-query the server for whatever period the toolbar currently shows, then
  // re-render. Date presets / custom range → bounded query; „Allt" → full.
  async function reloadForCurrentRange() {
    const { from, to } = getRangeFromInputs();
    const range = (from || to) ? { from, to } : (activePreset === 'all' ? 'all' : undefined);
    await loadAllSales(range);
    populateFilterDropdowns();
    applyFilters();
    renderAll();
  }

  // ----- Data load -----
  async function loadAllSales(range) {
    const SB = getSB();
    if (!SB) throw new Error('Supabase not initialized');
    // 2026-07-01: this view used to fetch EVERY sale (+ its linur JSON) on open,
    // which was slow. Now it's fast by default (newest 400) so the user can
    // eyeball recent reikningar/drög immediately; date presets/ranges re-query
    // server-side (bounded) and „Allt" loads the full history on demand — so the
    // accounting periods stay complete.
    let salesQ = SB.from('solur')
      .select('id,num,starfsmadur,customer_nafn,customer_id,linur,upphaed_an_vsk,vsk_upphaed,afslattur,samtals,greitt_med,athugasemdir,created_at,updated_at,paid_at,paid_method,status,vidskiptategund')
      // Röðum eftir SÍÐUSTU AÐGERÐ (updated_at) svo sjálfgefna „nýjustu 400"
      // sóknin nái líka gömlum sölum sem voru sóttar/greiddar/kredittaðar nýlega
      // (t.d. tæki úr hleðslu frá því fyrir 2 mánuðum) — annars duttu þær út.
      .neq('status','void').neq('hidden', true).order('updated_at', { ascending: false });
    if (range === 'all') {
      _loadedMode = 'all';                       // full history, no limit
    } else if (range && (range.from || range.to)) {
      if (range.from) salesQ = salesQ.gte('created_at', range.from + 'T00:00:00');
      if (range.to)   salesQ = salesQ.lte('created_at', range.to + 'T23:59:59.999');
      salesQ = salesQ.limit(3000);
      _loadedMode = 'range';
    } else {
      salesQ = salesQ.limit(400);                // fast default: newest 400
      _loadedMode = 'recent';
    }
    const [salesRes, custRes, prodRes, vbRes, coRes] = await Promise.all([
      salesQ,
      SB.from('vidskiptavinir').select('id,kennitala,nafn,simi,netfang'),
      SB.from('vorur').select('id,nafn,flokkur'),
      // Pickup status for greitt_sidar / reikningur sales: read verkbeidnir
      // status per parent sale-number so the row can show 🏪 Hjá þér / ✅ Sótt.
      SB.from('verkbeidnir').select('num,status').like('num', 'R-%-V%'),
      // 2026-07-01: also fetch fyrirtaeki — COMPANY sales link customer_id to
      // fyrirtaeki (not vidskiptavinir), so their kt lived nowhere in this view.
      // 2026-07-20: 1.340 fyrirtæki → stök .select() skilaði 1000, svo kt vantaði
      // á sölur ~340 fyrirtækja. Blaðsíðuflett gegnum 1000-raða þakið.
      DB.fetchAll((from, to) => SB.from('fyrirtaeki').select('id,kennitala,nafn').range(from, to)).then(rows => ({ data: rows }))
    ]);
    if (salesRes.error) throw salesRes.error;
    // Build a (parent → statuses[]) map for pickup-status lookup later.
    vbByParent = {};
    (vbRes && vbRes.data || []).forEach(v => {
      const parent = String(v.num || '').replace(/-V\d+$/, '');
      (vbByParent[parent] = vbByParent[parent] || []).push(v.status);
    });
    allSales = (salesRes.data || []).map(s => {
      const linur = Array.isArray(s.linur) ? s.linur : [];
      // Recompute totals from linur for safety (fallback to stored values)
      const stEx = linur.reduce((a, l) => a + ((+l.qty||0) * (+l.unit_price_ex_vat||0)), 0);
      const stVsk = linur.reduce((a, l) => a + ((+l.qty||0) * (+l.unit_price_ex_vat||0) * ((+l.vsk_pct||0)/100)), 0);
      return {
        id: s.id,
        num: s.num || '',
        status: s.status || 'final',
        isDraft: s.status === 'drog',
        date: s.created_at,
        updated_at: s.updated_at || null,
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
        notes: s.athugasemdir || '',
        vidskiptategund: s.vidskiptategund || ''
      };
    });
    customerMap = new Map((custRes.data || []).map(c => [c.id, c]));
    productMap = new Map((prodRes.data || []).map(p => [p.id, p]));
    companyMap = new Map(((coRes && coRes.data) || []).map(c => [c.id, c]));
    // Unambiguous name→kt index across BOTH tables (a name with one distinct kt).
    (function buildKtByName() {
      const acc = {};
      const add = (nafn, kt) => {
        const k = String(nafn || '').trim().toLowerCase();
        const d = String(kt || '').replace(/\D/g, '');
        if (!k || d.length !== 10) return;
        (acc[k] = acc[k] || new Set()).add(d.slice(0, 6) + '-' + d.slice(6));
      };
      (custRes.data || []).forEach(c => add(c.nafn, c.kennitala));
      ((coRes && coRes.data) || []).forEach(c => add(c.nafn, c.kennitala));
      ktByName = new Map();
      Object.keys(acc).forEach(k => { if (acc[k].size === 1) ktByName.set(k, Array.from(acc[k])[0]); });
    })();
  }

  function getKt(sale) {
    const wantName = String(sale.customer || '').trim().toLowerCase();
    const nm = s => String(s || '').trim().toLowerCase();
    // id-based, verified against the name to dodge the vidskiptavinir /
    // fyrirtaeki id overlap (both are independent bigserials that collide).
    if (sale.customer_id) {
      const v = customerMap.get(sale.customer_id);
      if (v && v.kennitala && (!wantName || nm(v.nafn) === wantName)) return v.kennitala;
      const c = companyMap.get(sale.customer_id);
      if (c && c.kennitala && (!wantName || nm(c.nafn) === wantName)) return c.kennitala;
    }
    // exact name match across both tables (unambiguous only)
    if (wantName && ktByName.has(wantName)) return ktByName.get(wantName);
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
    const includeDrafts = !!document.getElementById('by-include-drafts')?.checked;
    const fromTs = from ? new Date(from + 'T00:00:00').getTime() : -Infinity;
    const toTs = to ? new Date(to + 'T23:59:59').getTime() : Infinity;
    filtered = allSales.filter(s => {
      // Drafts only appear when "Sýna drög" is on.
      if (s.isDraft && !includeDrafts) return false;
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
    // 2026-05-12 (#8): Date sort uses paid_at when the money actually landed,
    // so the table sorts by the date the user cares about. 2026-07-22: widened
    // to ANY paid sale (not just greitt_sidar/reikningur) — a „greitt síðar"
    // draft picked up + paid by KORT today keeps its drop-off created_at but
    // gets paid_at=today, so it must sort/show on the payment day.
    const get = {
      num: s => s.num,
      // Sjálfgefna röðunin (Dags. ↓) = SÍÐASTA AÐGERÐ: greitt / breytt / skráð,
      // hvað sem er nýjast. Þannig flýtur sala sem var sótt+greidd (eða kreditt/
      // breytt) í dag EFST — líka gömul hleðslu-tæki sem eru sótt löngu síðar.
      date: s => Math.max(
        s.paid_at ? new Date(s.paid_at).getTime() : 0,
        s.updated_at ? new Date(s.updated_at).getTime() : 0,
        s.date ? new Date(s.date).getTime() : 0
      ),
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
    // Drafts are NOT real revenue — exclude them from every accounting total
    // so the headline numbers stay correct even while drög are displayed.
    const real = filtered.filter(s => !s.isDraft);
    const drafts = filtered.filter(s => s.isDraft);
    const totalSamtals = real.reduce((a, s) => a + (s.total || 0), 0);
    const totalEx = real.reduce((a, s) => a + (s.ex || 0), 0);
    // Per-rate VSK breakdown. Stored lines carry PRE-discount unit prices —
    // the sale-level afsláttur lives only in solur.total/ex. Summing raw line
    // values overstates output VSK and makes Σ(per-rate ex) ≠ the „Án VSK"
    // headline. Scale each sale's line ex/vsk by total/(rawEx+rawVsk) so the
    // breakdown reflects post-discount amounts (guard divide-by-zero) — mirrors
    // 10-sala-receipt-redesign.js:300-321.
    const byRate = new Map();
    for (const s of real) {
      let rawEx = 0, rawVsk = 0;
      const figs = [];
      for (const l of s.lines) {
        const rate = +l.vsk_pct || 0;
        const lineEx = (+l.qty||0) * (+l.unit_price_ex_vat||0);
        const lineVsk = lineEx * (rate/100);
        rawEx += lineEx; rawVsk += lineVsk;
        figs.push({ rate, ex: lineEx, vsk: lineVsk });
      }
      const scale = (rawEx + rawVsk) > 0 ? (s.total || 0) / (rawEx + rawVsk) : 1;
      for (const f of figs) {
        const cur = byRate.get(f.rate) || { ex: 0, vsk: 0 };
        cur.ex += f.ex * scale; cur.vsk += f.vsk * scale;
        byRate.set(f.rate, cur);
      }
    }
    const customers = new Set();
    for (const s of real) {
      customers.add(s.customer_id || s.customer || '');
    }
    cards.push({ lbl: 'Heildarsala', val: fmtKr(totalSamtals), cls: 'accent', sub: real.length + (real.length === 1 ? ' sala' : ' sölur') });
    cards.push({ lbl: 'Án VSK', val: fmtKr(totalEx) });
    // VSK by rate
    const sortedRates = [...byRate.keys()].sort((a,b) => b - a);
    for (const rate of sortedRates) {
      const v = byRate.get(rate);
      cards.push({ lbl: 'VSK ' + rate + '%', val: fmtKr(v.vsk), sub: 'af ' + fmtKr(v.ex) });
    }
    cards.push({ lbl: 'Viðskiptavinir', val: customers.size + '', sub: real.length && customers.size ? Math.round(real.length / customers.size * 10) / 10 + ' sölur að meðaltali' : '' });
    // Drafts card — only when drög are currently shown.
    if (drafts.length) {
      const draftSum = drafts.reduce((a, s) => a + (s.total || 0), 0);
      cards.push({ lbl: '📝 Drög', val: fmtKr(draftSum), cls: 'warn', sub: drafts.length + (drafts.length === 1 ? ' óklárað' : ' ókláruð') + ' · ekki í tekjum' });
    }
    // 3D metallic stat cards (matches Hreyfingarlisti / Kröfu yfirlit).
    const CS = '0 1px 1px rgba(15,23,42,.05),0 8px 16px -8px rgba(15,23,42,.15),0 24px 44px -20px rgba(15,23,42,.3),inset 0 2px 0 rgba(255,255,255,.95),inset 0 -10px 20px -14px rgba(15,23,42,.14)';
    const html = cards.map(c => {
      if (c.cls === 'accent') {
        return '<div style="flex:1 1 195px;min-width:195px;border-radius:15px;padding:12px 15px;background:linear-gradient(150deg,#6f97ff 0%,#2f5fe0 34%,#1c3d8c 60%,#0b1838 100%);box-shadow:0 1px 1px rgba(15,23,42,.05),0 8px 16px -8px rgba(15,23,42,.25),0 20px 38px -20px rgba(20,40,120,.5),inset 0 1px 0 rgba(255,255,255,.45)">'
          + '<div style="font-size:9.5px;font-weight:700;letter-spacing:.12em;color:rgba(255,255,255,.72);text-transform:uppercase">' + esc(c.lbl) + '</div>'
          + '<div style="font-family:\'Space Mono\',monospace;font-size:22px;font-weight:700;color:#fff;margin-top:2px;white-space:nowrap">' + esc(c.val) + '</div>'
          + (c.sub ? '<div style="font-size:11px;color:rgba(255,255,255,.7);margin-top:1px">' + esc(c.sub) + '</div>' : '')
          + '</div>';
      }
      const valCol = c.cls === 'warn' ? '#b45309' : '#11141c';
      return '<div style="flex:1 1 195px;min-width:195px;border-radius:15px;padding:12px 15px;background:linear-gradient(180deg,#ffffff,#eef1f6);box-shadow:' + CS + '">'
        + '<div style="font-size:9.5px;font-weight:700;letter-spacing:.12em;color:#8a93a5;text-transform:uppercase">' + esc(c.lbl) + '</div>'
        + '<div style="font-family:\'Space Mono\',monospace;font-size:22px;font-weight:700;color:' + valCol + ';margin-top:2px;white-space:nowrap">' + esc(c.val) + '</div>'
        + (c.sub ? '<div style="font-size:11px;color:#9098a6;margin-top:1px">' + esc(c.sub) + '</div>' : '')
        + '</div>';
    }).join('');
    const sumEl = document.getElementById('by-summary');
    sumEl.style.cssText = 'display:flex;gap:10px;flex-wrap:wrap;margin-bottom:14px';
    sumEl.innerHTML = html;
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
      tbody.innerHTML = '<tr><td colspan="10"><div class="by-empty">Engar sölur fundust á völdu tímabili</div></td></tr>';
      document.getElementById('by-count').textContent = '';
      return;
    }
    document.getElementById('by-count').textContent = filtered.length + ' sölur'
      + (_loadedMode === 'recent' ? ' · sýni nýjustu 400 — veldu tímabil eða „Allt" fyrir eldri/heild' : '');
    const rows = [];
    const rowHtml = (s) => {
      const isOpen = expanded.has(String(s.id));
      const draftBadge = s.isDraft
        ? ' <span style="font-size:9px;font-weight:700;background:#fef3c7;color:#92400e;padding:1px 6px;border-radius:99px;vertical-align:middle">DRÖG</span>'
        : '';
      // Reikninga-tegund (2026-08-22, Agnar): tákn + þrír hakreitir (ein í einu) → solur.vidskiptategund.
      const _vt = s.vidskiptategund || '';
      const _vtIcon = { uttekt: '🧯', brunakerfi: '🔥', bud: '🏪' }[_vt] || '❓';
      const _vtBox = (val, ic, lbl) => '<label title="' + lbl + '" style="cursor:pointer;display:inline-flex;align-items:center;gap:1px"><input type="checkbox" class="by-vt-box" data-sale-id="' + esc(s.id) + '" value="' + val + '"' + (_vt === val ? ' checked' : '') + '>' + ic + '</label>';
      let h = '<tr class="by-sale-row' + (isOpen ? ' expanded' : '') + '" data-id="' + esc(s.id) + '"' + (s.isDraft ? ' style="background:#fffbeb"' : '') + '>'
        + '<td class="by-num-cell">' + esc(s.num) + draftBadge + '</td>'
        // 2026-05-12 (#8): For paid greitt_sidar / reikningur sales, show
        // the date of payment (when the customer actually picked up & paid)
        // — not the date the verkbeiðni was created. That way the row
        // appears where the user expects in the date sort. The original
        // created date is still visible in the expanded detail ("Móttekið").
        + '<td>' + esc(fmtDate(s.paid_at || s.date))
        + (s.paid_at && fmtDateOnly(s.paid_at) !== fmtDateOnly(s.date)
            ? '<div style="font-size:10px;color:#16a34a;font-weight:600">✓ greitt ' + esc(fmtDateOnly(s.paid_at)) + '</div><div style="font-size:10px;color:#94a3b8">skráð ' + esc(fmtDateOnly(s.date)) + '</div>'
            : '')
        + '</td>'
        + '<td><div style="font-size:13.5px;font-weight:600;color:#11141c">' + esc(s.customer || '—') + '</div>' + (getKt(s) ? '<div style="font-family:\'Space Mono\',monospace;font-size:10.5px;color:#9098a6;margin-top:1px">kt. ' + esc(getKt(s)) + '</div>' : '') + '</td>'
        + '<td>' + esc(s.staff || '') + '</td>'
        + '<td class="num-col">' + s.lines.length + '</td>'
        + '<td class="num-col">' + fmtNum(s.ex) + '</td>'
        + '<td class="num-col">' + fmtNum(s.vsk) + '</td>'
        + '<td class="num-col" style="font-weight:700;">' + fmtNum(s.total) + '</td>'
        + '<td><span class="by-payment-pill ' + payClass(s.payment) + '">' + esc(s.payment || '—') + '</span>'
        + (
          // For unpaid greitt_sidar / reikningur, show a tiny pickup-status
          // chip so the user knows at a glance whether to bill the customer
          // (✅ Sótt) or wait (🏪 Hjá þér).
          !s.isDraft && !s.paid_at && (s.payment === 'greitt_sidar' || s.payment === 'reikningur')
            ? (() => { const ps = pickupStatusFor(s.num); return ps ? '<div style="display:inline-block;margin-left:6px;font-size:11px;color:' + ps.color + ';font-weight:600;white-space:nowrap" title="Pickup status">' + ps.icon + ' ' + esc(ps.label) + '</div>' : ''; })()
            : ''
          )
        + (s.isDraft ? ' <button class="by-edit-draft" data-sale-id="' + esc(s.id) + '" type="button" title="Breyta drögunum (verð, línur, viðskiptavinur)" style="margin-left:6px;padding:3px 9px;background:#fff;color:#1d4ed8;border:1px solid #bfdbfe;border-radius:6px;cursor:pointer;font:inherit;font-size:11px;font-weight:700">✏️ Breyta</button>' : '')
        + (s.isDraft ? ' <button class="by-finish-draft" data-sale-id="' + esc(s.id) + '" type="button" style="margin-left:6px;padding:3px 9px;background:#16a34a;color:#fff;border:none;border-radius:6px;cursor:pointer;font:inherit;font-size:11px;font-weight:700">✅ Klára</button>' : '')
        + '</td>'
        + '<td class="by-teg-cell" style="white-space:nowrap"><span class="by-teg-icon" style="margin-right:7px;font-size:15px">' + _vtIcon + '</span>'
          + '<span style="display:inline-flex;gap:8px;align-items:center;font-size:13px">' + _vtBox('uttekt', '🧯', 'Slökkvitæki') + _vtBox('brunakerfi', '🔥', 'Brunakerfi') + _vtBox('bud', '🏪', 'Almennt / búð (in-store)') + '</span></td>'
        + '</tr>';
      if (isOpen) h += '<tr class="by-detail-row"><td colspan="10">' + renderDetail(s) + '</td></tr>';
      return h;
    };
    // 2026-07-01 (Agnar): the „Ógreitt" pull-to-top group was removed. The
    // receivables overview now lives in Kröfu yfirlit (patch 166); here Agnar
    // wants the NEWEST transactions (drög + reikningar + greitt) visible right
    // away so a sala-mistake is caught the moment it's made. So render `filtered`
    // in its own sort order (date desc by default) — unpaid bills just sit at
    // their own date instead of being hoisted into a collapsed block at the top.
    for (const s of filtered) rows.push(rowHtml(s));
    tbody.innerHTML = rows.join('');
    // Row toggle is wired via delegation on tbody (in init), not per-row
  }

  function renderDetail(sale) {
    // Stored line prices are PRE-discount; the sale-level afsláttur lives in
    // sale.total/ex only. Scale line ex/vsk/inc by total/(rawEx+rawVsk) so the
    // detail rows foot to the sale total shown in the row above and match the
    // per-rate VSK cards (guard divide-by-zero) — mirrors the summary fix.
    let _rawEx = 0, _rawVsk = 0;
    for (const l of sale.lines) {
      const _ex = (+l.qty||0) * (+l.unit_price_ex_vat||0);
      _rawEx += _ex; _rawVsk += _ex * ((+l.vsk_pct||0) / 100);
    }
    const _scale = (_rawEx + _rawVsk) > 0 ? (sale.total || 0) / (_rawEx + _rawVsk) : 1;
    const lineRows = sale.lines.map(l => {
      const qty = +l.qty || 0;
      const unitEx = +l.unit_price_ex_vat || 0;
      const rate = +l.vsk_pct || 0;
      const lineEx = qty * unitEx * _scale;
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
          <div class="item"><span class="lbl">Greiðsluaðferð</span><span class="val">${(() => {
            // Inline editable payment method. Switching to "Reikningur" makes
            // the sale show up in Kröfuyfirlit (krafa í heimabanka); the
            // change saves instantly to solur.greitt_med.
            const cur = (() => { const x = String(sale.payment||'').toLowerCase();
              if (x==='reikningur') return 'reikningur';
              if (x==='greitt_sidar') return 'greitt_sidar';
              if (x==='kort') return 'kort';
              if (x==='reidufe'||x==='pening'||x==='reiðufé') return 'reidufe';
              return ''; })();
            const PAY = [['reikningur','Reikningur (senda kröfu)'],['greitt_sidar','Greitt síðar'],['kort','Kort'],['reidufe','Reiðufé']];
            const opts = (cur ? '' : '<option value="" selected>'+esc(sale.payment||'—')+'</option>')
              + PAY.map(p => '<option value="'+p[0]+'"'+(p[0]===cur?' selected':'')+'>'+p[1]+'</option>').join('');
            return '<select class="by-payment-select" data-sale-id="'+esc(sale.id)+'" style="padding:4px 8px;border:1px solid '+(cur==='reikningur'?'#0ea5e9':'#cbd5e1')+';border-radius:6px;font:inherit;font-size:12.5px;background:'+(cur==='reikningur'?'#f0f9ff':'#fff')+';color:#0f172a;cursor:pointer">'+opts+'</select>';
          })()}</span></div>
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
      if (tbody) tbody.innerHTML = '<tr><td colspan="10"><div class="by-empty" style="color:#dc2626;">Villa við að sækja sölur: ' + esc(e.message) + '</div></td></tr>';
      return;
    }
    populateFilterDropdowns();

    const onChange = () => { applyFilters(); renderAll(); };
    document.getElementById('by-from')?.addEventListener('change', () => { activePreset = 'custom'; document.querySelectorAll('#'+VIEW_ID+' .by-preset').forEach(b => b.classList.remove('active')); reloadForCurrentRange(); });
    document.getElementById('by-to')?.addEventListener('change', () => { activePreset = 'custom'; document.querySelectorAll('#'+VIEW_ID+' .by-preset').forEach(b => b.classList.remove('active')); reloadForCurrentRange(); });
    document.getElementById('by-search')?.addEventListener('input', onChange);
    document.getElementById('by-payment')?.addEventListener('change', onChange);
    document.getElementById('by-staff')?.addEventListener('change', onChange);
    document.getElementById('by-include-drafts')?.addEventListener('change', onChange);

    document.querySelectorAll('#'+VIEW_ID+' .by-preset').forEach(b => {
      b.addEventListener('click', () => { applyPreset(b.dataset.preset); reloadForCurrentRange(); });
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
      try { await reloadForCurrentRange(); }
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

        // "✏️ Breyta" / "✅ Klára" on a draft row — both open the Sale Editor,
        // which lets you change prices, lines and the customer on a draft
        // (and finish it there). Breyta is the discoverable "edit" entry.
        const editBtn = e.target.closest('.by-edit-draft') || e.target.closest('.by-finish-draft');
        if (editBtn) {
          e.stopPropagation();
          const sid = editBtn.getAttribute('data-sale-id');
          if (window.SaleEditor && typeof window.SaleEditor.openById === 'function') {
            window.SaleEditor.openById(sid);
          } else {
            alert('Söluritillinn er ekki tiltækur.');
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

      // Inline payment-method change in the expanded detail. Saves greitt_med
      // straight away; switching to "reikningur" surfaces the sale in
      // Kröfuyfirlit (krafa í heimabanka).
      tbody.addEventListener('change', async (e) => {
        // Reikninga-tegund (2026-08-22, Agnar): þrír hakreitir víxla solur.vidskiptategund
        // — 🧯 slökkvitæki (uttekt) · 🔥 brunakerfi · 🏪 almennt/búð (bud). Ein í einu; tóm ⇒ ovisst.
        const vtb = e.target.closest('.by-vt-box');
        if (vtb) {
          const tr = vtb.closest('tr');
          const vsid = vtb.getAttribute('data-sale-id');
          tr.querySelectorAll('.by-vt-box').forEach(b => { if (b !== vtb) b.checked = false; });
          const vval = vtb.checked ? vtb.value : 'ovisst';
          const vsale = allSales.find(s => String(s.id) === String(vsid));
          try {
            const SB2 = getSB(); if (!SB2) throw new Error('Engin gagnabankatenging');
            const { error } = await SB2.from('solur').update({ vidskiptategund: vval }).eq('id', vsid);
            if (error) throw error;
            if (vsale) vsale.vidskiptategund = vval;
            const ic = tr.querySelector('.by-teg-icon');
            if (ic) ic.textContent = { uttekt: '🧯', brunakerfi: '🔥', bud: '🏪' }[vval] || '❓';
            if (window.Toast && Toast.show) Toast.show('✓ Tegund uppfærð');
          } catch (err) { alert('Villa við að breyta tegund: ' + (err.message || err)); }
          return;
        }
        const sel = e.target.closest('.by-payment-select');
        if (!sel) return;
        const sid = sel.getAttribute('data-sale-id');
        const val = sel.value;
        const sale = allSales.find(s => String(s.id) === String(sid));
        if (!sale || !val) return;
        sel.disabled = true;
        try {
          const SB = getSB();
          if (!SB) throw new Error('Engin gagnabankatenging');
          const { error } = await SB.from('solur').update({ greitt_med: val }).eq('id', sid);
          if (error) throw error;
          sale.payment = val;
          if (window.Toast && Toast.show) Toast.show('✓ Greiðslumáti uppfærður → ' + (val === 'reikningur' ? 'Reikningur' : val === 'greitt_sidar' ? 'Greitt síðar' : val === 'kort' ? 'Kort' : 'Reiðufé'));
          // Re-render so the pill + krafa eligibility reflect the change.
          applyFilters(); renderAll();
          try { if (window.KrofuYfirlit) { KrofuYfirlit.refreshBadge && KrofuYfirlit.refreshBadge(); KrofuYfirlit.load && KrofuYfirlit.load(); } } catch (_) {}
          try { document.dispatchEvent(new CustomEvent('sale-edited', { detail: { id: sid } })); } catch (_) {}
        } catch (err) {
          alert('Villa við að breyta greiðslumáta: ' + (err.message || err));
          sel.disabled = false;
        }
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
    setTimeout(() => {
      init();
      if (initialized) { try { applyFilters(); renderAll(); } catch (_) {} }
    }, 50);
  }

  ensureView();
  ensureNavButton();
  setTimeout(() => { ensureView(); ensureNavButton(); }, 500);
  setTimeout(() => { ensureView(); ensureNavButton(); }, 1500);
  const navObs = new MutationObserver(() => { ensureView(); ensureNavButton(); });
  navObs.observe(document.body, { childList: true, subtree: true });

  window.BokhaldsYfirlit = {
    open: switchToView,
    refresh: async () => { await reloadForCurrentRange(); },
    version: 'v1.1'
  };
})();
/* === END BOKHALDS YFIRLIT === */
