/* === VERKDAGBOK v5 === */
/* Verkdagbók — polish: search, date grouping, stats bar, collapsible archived, autoresize, keyboard shortcuts */
(() => {
  if (typeof window === 'undefined' || !window.supabase || !window.SUPABASE_URL || !window.SUPABASE_KEY) {
    console.warn('[Verkdagbok] supabase not ready, skipping');
    return;
  }

  const SB = (window.DB && window.DB.sb) || window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_KEY);
  const DESKTOP_MIN = 900;
  const isDesktop = () => window.matchMedia('(min-width: ' + DESKTOP_MIN + 'px)').matches;

  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));

  const todayISO = () => {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
  };

  const MONTHS_IS = ['jan','feb','mar','apr','maí','jún','júl','ágú','sep','okt','nóv','des'];
  const fmtDateShort = s => {
    if (!s) return '';
    try { const d = new Date(s); if (isNaN(d)) return String(s);
      return d.getDate() + '. ' + MONTHS_IS[d.getMonth()];
    } catch(e) { return ''; }
  };
  const fmtDateTbl = s => {
    if (!s) return '';
    try { const d = new Date(s); if (isNaN(d)) return String(s);
      return d.getDate() + '. ' + (d.getMonth()+1) + ".'" + String(d.getFullYear()).slice(-2);
    } catch(e) { return ''; }
  };

  function dateBucketLabel(dateStr) {
    if (!dateStr) return 'Án dagsetningar';
    const today = new Date(); today.setHours(0,0,0,0);
    const d = new Date(dateStr); d.setHours(0,0,0,0);
    if (isNaN(d)) return 'Án dagsetningar';
    const diffMs = today - d;
    const diffDays = Math.round(diffMs / 86400000);
    if (diffDays === 0) return 'Í dag';
    if (diffDays === 1) return 'Í gær';
    if (diffDays === -1) return 'Á morgun';
    if (diffDays > 0 && diffDays <= 6) return diffDays + ' dögum síðan';
    if (diffDays < 0 && diffDays >= -6) return 'Eftir ' + (-diffDays) + ' daga';
    return d.getDate() + '. ' + MONTHS_IS[d.getMonth()] + (d.getFullYear() !== today.getFullYear() ? " '" + String(d.getFullYear()).slice(-2) : '');
  }

  // -------- state --------
  let entries = [];
  let isLoading = false;
  let tableMissing = false;
  let searchQuery = '';
  let archivedExpanded = false;

  async function load() {
    isLoading = true;
    tableMissing = false;
    try {
      const { data, error } = await SB.from('verkdagbok').select('*').order('created_at', { ascending: false });
      if (error) {
        if (/(could not find|relation .* does not exist|schema cache)/i.test(error.message || '')) {
          tableMissing = true;
        } else throw error;
      } else {
        entries = data || [];
      }
    } finally { isLoading = false; }
  }

  function ensureNavButton() {
    if (document.querySelector('.vnav-btn[data-view="verkdagbok"]')) return true;
    const sample = document.querySelector('.vnav-btn[data-view="vidskiptavinir"]') ||
                   document.querySelector('.vnav-btn[data-view="companies"]');
    if (!sample || !sample.parentElement) return false;
    const btn = sample.cloneNode(false);
    btn.className = sample.className.replace(/\bactive\b/g,'').trim();
    btn.dataset.view = 'verkdagbok';
    btn.textContent = '📔 Verkdagbók';
    sample.parentElement.insertBefore(btn, sample.nextSibling);
    return true;
  }

  function ensureViewContainer() {
    if (document.getElementById('view-verkdagbok')) return true;
    const sample = document.getElementById('view-vidskiptavinir') ||
                   document.getElementById('view-companies');
    if (!sample || !sample.parentElement) return false;
    const v = document.createElement('div');
    v.id = 'view-verkdagbok';
    v.className = sample.className.replace(/\bactive\b/g,'').trim();
    v.innerHTML = '<main id="vd-main" class="main-panel"></main>';
    sample.parentElement.appendChild(v);
    return true;
  }

  function ensureMain() { return document.querySelector('#view-verkdagbok #vd-main'); }

  const STYLES = `
    .vd-wrap { max-width:1180px; margin:0 auto; }
    .vd-section { font-size:12px; font-weight:600; color:#475569; margin:18px 0 10px; padding:0 0 0 10px; border-left:3px solid #cbd5e1; text-transform:uppercase; letter-spacing:0.05em; display:flex; align-items:center; gap:10px; }
    .vd-section.archived { color:#94a3b8; cursor:pointer; user-select:none; }
    .vd-section.archived .vd-chev { transition:transform .2s; }
    .vd-section.archived.expanded .vd-chev { transform:rotate(90deg); }
    .vd-section .count-pill { padding:1px 8px; background:#e2e8f0; color:#475569; border-radius:99px; font-size:10px; font-weight:600; }
    .vd-section.archived .count-pill { background:#f1f5f9; color:#94a3b8; }
    .vd-section .date-bucket { color:#0f172a; font-size:11px; }
    .vd-empty { background:#fff; border:1px dashed #cbd5e1; border-radius:12px; padding:28px; text-align:center; color:#94a3b8; font-size:13px; }
    .vd-skra-btn { padding:10px 20px; background:#2563eb; color:#fff; border:none; border-radius:8px; font-size:14px; font-weight:600; cursor:pointer; transition:background .15s, transform .1s; }
    .vd-skra-btn:hover { background:#1d4ed8; }
    .vd-skra-btn:active { transform:translateY(1px); }

    .vd-header { margin-bottom:12px; }
    .vd-header h1 { margin:0 0 4px 0; font-size:20px; font-weight:600; color:#0f172a; }
    .vd-header .sub { font-size:13px; color:#64748b; }

    /* Toolbar (search + stats) */
    .vd-toolbar { display:flex; align-items:center; gap:10px; margin:10px 0 14px; flex-wrap:wrap; }
    .vd-search { position:relative; flex:1; min-width:220px; }
    .vd-search input { width:100%; padding:9px 36px 9px 36px; border:1px solid #e2e8f0; border-radius:8px; font:inherit; font-size:14px; color:#0f172a; background:#fff; outline:none; transition:border-color .15s, background .15s; box-sizing:border-box; }
    .vd-search input:focus { border-color:#3b82f6; background:#f0f7ff; }
    .vd-search .vd-search-icon { position:absolute; left:11px; top:50%; transform:translateY(-50%); color:#94a3b8; pointer-events:none; font-size:14px; }
    .vd-search .vd-search-clear { position:absolute; right:8px; top:50%; transform:translateY(-50%); background:none; border:none; color:#94a3b8; cursor:pointer; padding:4px 8px; font-size:14px; line-height:1; border-radius:4px; }
    .vd-search .vd-search-clear:hover { background:#f1f5f9; color:#475569; }
    .vd-stats { display:flex; gap:6px; flex-shrink:0; }
    .vd-stat { background:#fff; border:1px solid #e2e8f0; border-radius:8px; padding:6px 12px; font-size:12px; color:#475569; display:inline-flex; align-items:center; gap:6px; }
    .vd-stat strong { color:#0f172a; font-weight:600; }
    .vd-stat.active { border-color:#bfdbfe; background:#eff6ff; color:#1d4ed8; }
    .vd-stat.active strong { color:#1d4ed8; }
    .vd-stat.done { border-color:#a7f3d0; background:#ecfdf5; color:#065f46; }
    .vd-stat.done strong { color:#065f46; }

    /* ===== Mobile / Card layout ===== */
    .vd-form-card { background:#fff; border:1px solid #e2e8f0; border-radius:12px; padding:16px; margin-bottom:18px; box-shadow:0 1px 2px rgba(15,23,42,0.04); }
    .vd-form-card label.lbl { display:block; font-size:11px; font-weight:600; color:#64748b; margin-bottom:5px; text-transform:uppercase; letter-spacing:0.04em; }
    .vd-form-card input[type=text], .vd-form-card input[type=date], .vd-form-card textarea {
      width:100%; padding:9px 11px; border:1px solid #e2e8f0; border-radius:8px;
      font:inherit; font-size:14px; color:#0f172a; background:#fff; outline:none; box-sizing:border-box;
      transition:border-color .15s, background .15s;
    }
    .vd-form-card input:focus, .vd-form-card textarea:focus { border-color:#3b82f6; background:#f0f7ff; }
    .vd-form-card textarea#vd-athugasemdir { font-size:15px; line-height:1.5; min-height:120px; resize:vertical; }
    .vd-meta-row { display:grid; grid-template-columns:140px 1fr; gap:10px; margin-bottom:12px; }
    @media (max-width:480px) { .vd-meta-row { grid-template-columns:1fr; gap:8px; } }
    .vd-eq-block { margin-top:14px; padding-top:14px; border-top:1px dashed #e2e8f0; }
    .vd-eq-row { display:grid; grid-template-columns:90px 1fr 38px 38px; gap:8px; align-items:center; margin-bottom:6px; font-size:13px; }
    .vd-eq-row .lbl-cell { font-weight:500; color:#334155; }
    .vd-eq-row input[type=text] { padding:7px 10px; border:1px solid #e2e8f0; border-radius:6px; font:inherit; font-size:13px; background:#fff; outline:none; }
    .vd-eq-row input[type=text]:focus { border-color:#3b82f6; background:#f0f7ff; }
    .vd-eq-row .cb-cell { display:flex; flex-direction:column; align-items:center; gap:1px; }
    .vd-eq-row .cb-cell input[type=checkbox] { width:18px; height:18px; cursor:pointer; margin:0; }
    .vd-eq-head { display:grid; grid-template-columns:90px 1fr 38px 38px; gap:8px; font-size:10px; color:#94a3b8; text-transform:uppercase; letter-spacing:0.05em; margin-bottom:6px; padding-left:2px; }
    .vd-eq-head > div:first-child { font-weight:600; color:#475569; }
    .vd-eq-head > .h, .vd-eq-head > .y { text-align:center; }
    .vd-skra-row { margin-top:14px; display:flex; justify-content:space-between; align-items:center; gap:10px; }
    .vd-skra-hint { font-size:11px; color:#94a3b8; }

    .vd-card { background:#fff; border:1px solid #e2e8f0; border-radius:12px; padding:14px; margin-bottom:8px;
               display:grid; grid-template-columns:auto 1fr auto; gap:12px; align-items:flex-start; transition:border-color .15s, background .15s, box-shadow .15s; }
    .vd-card:hover { border-color:#cbd5e1; box-shadow:0 1px 3px rgba(15,23,42,0.05); }
    .vd-card.done { background:#ecfdf5; border-color:#a7f3d0; }
    .vd-card.archived { background:#f8fafc; border-color:#e2e8f0; opacity:0.65; }
    .vd-card.archived:hover { opacity:0.85; }
    .vd-card.archived .vd-ath, .vd-card.archived .vd-fyr { text-decoration:line-through; }
    .vd-cb-col input[type=checkbox] { width:22px; height:22px; cursor:pointer; accent-color:#10b981; margin:0; }
    .vd-cb-col .vd-archived-mark { font-size:18px; color:#94a3b8; line-height:22px; }
    .vd-body { min-width:0; }
    .vd-ath { font-size:15px; line-height:1.5; color:#0f172a; font-weight:500; white-space:pre-wrap; word-break:break-word; }
    .vd-card.done .vd-ath { color:#065f46; }
    .vd-ath-empty { color:#94a3b8; font-style:italic; font-weight:400; }
    .vd-meta { font-size:12px; color:#64748b; margin-top:8px; line-height:1.6; }
    .vd-meta .vd-fyr { color:#334155; font-weight:600; }
    .vd-meta .vd-dot { color:#cbd5e1; margin:0 6px; }
    .vd-eq-pills { margin-top:6px; display:flex; flex-wrap:wrap; gap:4px; }
    .vd-eq-pill { display:inline-flex; align-items:center; gap:4px; padding:3px 9px; background:#f1f5f9; border-radius:99px; font-size:12px; color:#334155; }
    .vd-card.done .vd-eq-pill { background:#d1fae5; color:#065f46; }
    .vd-eq-pill .ck { font-size:10px; padding:1px 5px; background:#cbd5e1; border-radius:99px; color:#334155; font-weight:600; }
    .vd-card.done .vd-eq-pill .ck { background:#6ee7b7; color:#065f46; }
    .vd-actions { display:flex; flex-direction:column; gap:4px; flex-shrink:0; }
    .vd-actions button { padding:6px 10px; font-size:12px; line-height:1; min-height:0; border:1px solid #e2e8f0; background:#fff; border-radius:6px; cursor:pointer; color:#334155; transition:all .15s; white-space:nowrap; }
    .vd-actions button:hover { border-color:#94a3b8; background:#f8fafc; }
    .vd-actions button.primary { background:#2563eb; color:#fff; border-color:#2563eb; }
    .vd-actions button.primary:hover { background:#1d4ed8; border-color:#1d4ed8; }
    .vd-actions button.danger { color:#dc2626; }
    .vd-actions button.danger:hover { background:#fef2f2; border-color:#fca5a5; }
    @media (max-width:520px) {
      .vd-card { grid-template-columns:auto 1fr; padding:12px; gap:10px; }
      .vd-actions { grid-column:1/-1; flex-direction:row; flex-wrap:wrap; gap:4px; padding-top:6px; border-top:1px solid #e2e8f0; margin-top:2px; }
      .vd-actions button { flex:1; min-width:60px; padding:7px 8px; }
      .vd-actions button.danger { flex:0 0 auto; min-width:0; }
      .vd-form-card { padding:14px; }
      .vd-eq-row { grid-template-columns:80px 1fr 34px 34px; gap:6px; }
      .vd-eq-head { grid-template-columns:80px 1fr 34px 34px; gap:6px; }
    }

    /* ===== Desktop / Table (paper-form) layout ===== */
    .vd-tbl-wrap { background:#fff; border:1px solid #e2e8f0; border-radius:12px; overflow:hidden; box-shadow:0 1px 2px rgba(15,23,42,0.04); margin-bottom:14px; }
    .vd-tbl { width:100%; border-collapse:collapse; font-size:13px; background:#fff; }
    .vd-tbl th, .vd-tbl td { border:1px solid #e2e8f0; padding:7px 9px; vertical-align:top; }
    .vd-tbl thead th { background:#f8fafc; font-weight:600; font-size:11px; color:#475569; text-align:center; padding:8px 6px; text-transform:uppercase; letter-spacing:0.04em; border-color:#e2e8f0; }
    .vd-tbl thead th.left { text-align:left; }
    .vd-tbl tbody td { background:#fff; transition:background .15s; }
    .vd-tbl tbody tr:nth-child(even):not(.vd-form-row):not(.done):not(.archived) td { background:#fcfdff; }
    .vd-tbl input[type=text], .vd-tbl input[type=date], .vd-tbl textarea {
      width:100%; border:none; background:transparent; font:inherit; padding:2px 4px; outline:none;
      box-sizing:border-box; color:#0f172a; resize:none;
    }
    .vd-tbl textarea { font-family:inherit; min-height:46px; line-height:1.5; overflow:hidden; }
    .vd-tbl input:focus, .vd-tbl textarea:focus { background:#f0f7ff; border-radius:4px; }
    .vd-tbl input[type=checkbox] { width:18px; height:18px; cursor:pointer; margin:0; vertical-align:middle; }
    .vd-tbl .cc { text-align:center; width:34px; }
    .vd-tbl .sz { width:90px; }
    .vd-tbl .stat { text-align:center; width:30px; }
    .vd-tbl .dt { width:80px; white-space:nowrap; color:#64748b; font-size:12px; }
    .vd-tbl .ath-cell { min-width:280px; font-size:14px; line-height:1.5; color:#0f172a; white-space:pre-wrap; word-break:break-word; font-weight:500; }
    .vd-tbl .fyr-cell { min-width:160px; font-weight:500; color:#334155; }
    .vd-tbl .act { width:120px; white-space:nowrap; text-align:center; }

    .vd-tbl .vd-form-row td { background:#eff6ff !important; }
    .vd-tbl .vd-form-row .stat { color:#2563eb; }
    .vd-tbl .vd-row.done td { background:#ecfdf5 !important; }
    .vd-tbl .vd-row.done .ath-cell, .vd-tbl .vd-row.done .fyr-cell { color:#065f46; }
    .vd-tbl .vd-row.archived td { background:#f8fafc !important; color:#94a3b8; }
    .vd-tbl .vd-row.archived .ath-cell, .vd-tbl .vd-row.archived .fyr-cell { text-decoration:line-through; }
    .vd-tbl .vd-row:hover:not(.archived):not(.vd-form-row):not(.done) td { background:#f0f7ff !important; }
    .vd-tbl .vd-x { color:#1e293b; font-weight:700; font-size:15px; }
    .vd-tbl .circle { display:inline-block; width:12px; height:12px; border:1.5px solid #2563eb; border-radius:50%; }

    .vd-tbl .act button { padding:3px 7px; font-size:12px; margin:0 1px; border:1px solid #e2e8f0; background:#fff; border-radius:5px; cursor:pointer; color:#334155; line-height:1.2; transition:all .15s; }
    .vd-tbl .act button:hover { border-color:#94a3b8; background:#f8fafc; }
    .vd-tbl .act button.primary { background:#2563eb; color:#fff; border-color:#2563eb; }
    .vd-tbl .act button.primary:hover { background:#1d4ed8; }
    .vd-tbl .act button.danger { color:#dc2626; }
    .vd-tbl .act button.danger:hover { background:#fef2f2; border-color:#fca5a5; }
    .vd-tbl .skra-cell { padding:4px; }
    .vd-tbl .skra-cell button { padding:6px 12px; background:#2563eb; color:#fff; border:none; border-radius:6px; font-size:12px; font-weight:600; cursor:pointer; }
    .vd-tbl .skra-cell button:hover { background:#1d4ed8; }

    /* archived collapse */
    .vd-archived-block { transition:opacity .2s; }
    .vd-archived-block.collapsed { display:none; }

    /* date group separator */
    .vd-date-group { margin:14px 0 8px; }
    .vd-date-group:first-child { margin-top:0; }
  `;

  function injectStyles() {
    if (document.getElementById('vd-styles')) return;
    const s = document.createElement('style');
    s.id = 'vd-styles';
    s.textContent = STYLES;
    document.head.appendChild(s);
  }

  // ===== shared filter & grouping =====
  function matchesSearch(e, q) {
    if (!q) return true;
    const lc = q.toLowerCase();
    return (e.fyrirtaeki || '').toLowerCase().includes(lc) ||
           (e.athugasemdir || '').toLowerCase().includes(lc) ||
           (e.duft_size || '').toLowerCase().includes(lc) ||
           (e.lettvatn_size || '').toLowerCase().includes(lc) ||
           (e.kolsyra_size || '').toLowerCase().includes(lc) ||
           (e.job_date || '').includes(lc);
  }

  function groupByDate(list) {
    // preserve order, group by job_date label
    const groups = []; const seen = new Map();
    for (const e of list) {
      const key = e.job_date || '__none__';
      let g = seen.get(key);
      if (!g) {
        g = { key, label: dateBucketLabel(e.job_date), items: [] };
        seen.set(key, g); groups.push(g);
      }
      g.items.push(e);
    }
    return groups;
  }

  // ===== Mobile (card) renderers =====
  function formCardHTML() {
    return `
      <div class="vd-form-card">
        <div class="vd-meta-row">
          <div>
            <label class="lbl">Dags</label>
            <input type="date" id="vd-date" value="${todayISO()}">
          </div>
          <div>
            <label class="lbl">Fyrirtæki</label>
            <input type="text" id="vd-fyrirtaeki" placeholder="t.d. Trönuhraun 2">
          </div>
        </div>
        <div>
          <label class="lbl">Athugasemdir / verklýsing</label>
          <textarea id="vd-athugasemdir" placeholder="kt, sími, hvað á að gera..."></textarea>
        </div>
        <div class="vd-eq-block">
          <div class="vd-eq-head"><div>Tæki</div><div></div><div class="h">h</div><div class="y">y</div></div>
          <div class="vd-eq-row"><div class="lbl-cell">🧯 Duft</div>
            <input type="text" id="vd-duft-size" placeholder="t.d. 5kg × 2">
            <div class="cb-cell"><input type="checkbox" id="vd-duft-h"></div>
            <div class="cb-cell"><input type="checkbox" id="vd-duft-y"></div></div>
          <div class="vd-eq-row"><div class="lbl-cell">🚒 Léttvatn</div>
            <input type="text" id="vd-lettvatn-size" placeholder="t.d. 6L × 3">
            <div class="cb-cell"><input type="checkbox" id="vd-lettvatn-h"></div>
            <div class="cb-cell"><input type="checkbox" id="vd-lettvatn-y"></div></div>
          <div class="vd-eq-row"><div class="lbl-cell">☁️ Kolsýra</div>
            <input type="text" id="vd-kolsyra-size" placeholder="t.d. 5kg">
            <div class="cb-cell"><input type="checkbox" id="vd-kolsyra-h"></div>
            <div class="cb-cell"><input type="checkbox" id="vd-kolsyra-y"></div></div>
        </div>
        <div class="vd-skra-row">
          <span class="vd-skra-hint">Cmd/Ctrl+Enter = skrá</span>
          <button class="vd-skra-btn" id="vd-save-btn">+ Skrá</button>
        </div>
      </div>`;
  }

  function eqPillHTML(icon, size, h, y) {
    if (!size && !h && !y) return '';
    const marks = [];
    if (h) marks.push('<span class="ck">h</span>');
    if (y) marks.push('<span class="ck">y</span>');
    const sizeText = size ? esc(size) : '';
    return `<span class="vd-eq-pill">${icon}${sizeText ? ' ' + sizeText : ''}${marks.length ? ' ' + marks.join('') : ''}</span>`;
  }

  function entryCardHTML(e, isArchived) {
    const cls = ['vd-card'];
    if (e.done && !isArchived) cls.push('done');
    if (isArchived) cls.push('archived');
    const ath = e.athugasemdir
      ? `<div class="vd-ath">${esc(e.athugasemdir)}</div>`
      : `<div class="vd-ath vd-ath-empty">${esc(e.fyrirtaeki || '(engin athugasemd)')}</div>`;
    const metaParts = [];
    if (e.athugasemdir && e.fyrirtaeki) metaParts.push(`<span class="vd-fyr">${esc(e.fyrirtaeki)}</span>`);
    if (e.job_date) metaParts.push(esc(fmtDateShort(e.job_date)));
    const eqHTML = [
      eqPillHTML('🧯', e.duft_size, e.duft_h, e.duft_y),
      eqPillHTML('🚒', e.lettvatn_size, e.lettvatn_h, e.lettvatn_y),
      eqPillHTML('☁️', e.kolsyra_size, e.kolsyra_h, e.kolsyra_y)
    ].filter(Boolean).join('');
    const metaHTML = metaParts.length ? `<div class="vd-meta">${metaParts.join('<span class="vd-dot">·</span>')}</div>` : '';
    const eqWrap = eqHTML ? `<div class="vd-eq-pills">${eqHTML}</div>` : '';
    return `
      <div class="${cls.join(' ')}" data-id="${esc(e.id)}">
        <div class="vd-cb-col">${isArchived ? '<span class="vd-archived-mark">✓</span>' : `<input type="checkbox" class="vd-done-cb" data-id="${esc(e.id)}" ${e.done?'checked':''}>`}</div>
        <div class="vd-body">${ath}${metaHTML}${eqWrap}</div>
        <div class="vd-actions">
          ${!isArchived ? `
            <button class="vd-edit" data-id="${esc(e.id)}">✏️ Breyta</button>
            <button class="primary vd-archive" data-id="${esc(e.id)}">✓ Frágengið</button>
            <button class="danger vd-del" data-id="${esc(e.id)}">🗑️</button>
          ` : `
            <button class="vd-unarchive" data-id="${esc(e.id)}">↩ Endurvirkja</button>
            <button class="danger vd-del" data-id="${esc(e.id)}">🗑️</button>
          `}
        </div>
      </div>`;
  }

  // ===== Desktop (table) renderers =====
  function tableHead() {
    return `
      <thead>
        <tr>
          <th rowspan="2" class="stat"></th>
          <th rowspan="2" class="dt">Dags</th>
          <th rowspan="2" class="left">Fyrirtæki</th>
          <th rowspan="2" class="left">Athugasemdir</th>
          <th colspan="3">🧯 Duft</th>
          <th colspan="3">🚒 Léttvatn</th>
          <th colspan="3">☁️ Kolsýra</th>
          <th rowspan="2" class="act">Aðgerðir</th>
        </tr>
        <tr>
          <th class="sz">Stærð</th><th class="cc" title="Hleðsla">h</th><th class="cc" title="Yfirfara">y</th>
          <th class="sz">Stærð</th><th class="cc" title="Hleðsla">h</th><th class="cc" title="Yfirfara">y</th>
          <th class="sz">Stærð</th><th class="cc" title="Hleðsla">h</th><th class="cc" title="Yfirfara">y</th>
        </tr>
      </thead>`;
  }

  function formRowHTML() {
    return `
      <tr class="vd-form-row">
        <td class="stat"><span class="circle"></span></td>
        <td class="dt"><input type="date" id="vd-date" value="${todayISO()}"></td>
        <td class="fyr-cell"><input type="text" id="vd-fyrirtaeki" placeholder="Fyrirtæki..."></td>
        <td class="ath-cell"><textarea id="vd-athugasemdir" placeholder="Athugasemdir, kt, sími, ATH... (Cmd/Ctrl+Enter til að skrá)" rows="2"></textarea></td>
        <td class="sz"><input type="text" id="vd-duft-size" placeholder="5kg"></td>
        <td class="cc"><input type="checkbox" id="vd-duft-h"></td>
        <td class="cc"><input type="checkbox" id="vd-duft-y"></td>
        <td class="sz"><input type="text" id="vd-lettvatn-size" placeholder="6L"></td>
        <td class="cc"><input type="checkbox" id="vd-lettvatn-h"></td>
        <td class="cc"><input type="checkbox" id="vd-lettvatn-y"></td>
        <td class="sz"><input type="text" id="vd-kolsyra-size" placeholder="5kg"></td>
        <td class="cc"><input type="checkbox" id="vd-kolsyra-h"></td>
        <td class="cc"><input type="checkbox" id="vd-kolsyra-y"></td>
        <td class="skra-cell"><button id="vd-save-btn">+ Skrá</button></td>
      </tr>`;
  }

  function entryRowHTML(e, isArchived) {
    const cls = ['vd-row'];
    if (e.done && !isArchived) cls.push('done');
    if (isArchived) cls.push('archived');
    const X = '<span class="vd-x">✕</span>';
    return `
      <tr class="${cls.join(' ')}" data-id="${esc(e.id)}">
        <td class="stat">${isArchived
          ? '<span style="color:#94a3b8;font-size:14px;">✓</span>'
          : `<input type="checkbox" class="vd-done-cb" data-id="${esc(e.id)}" ${e.done?'checked':''}>`}</td>
        <td class="dt">${esc(fmtDateTbl(e.job_date))}</td>
        <td class="fyr-cell">${esc(e.fyrirtaeki || '')}</td>
        <td class="ath-cell">${esc(e.athugasemdir || '')}</td>
        <td class="sz">${esc(e.duft_size || '')}</td>
        <td class="cc">${e.duft_h ? X : ''}</td>
        <td class="cc">${e.duft_y ? X : ''}</td>
        <td class="sz">${esc(e.lettvatn_size || '')}</td>
        <td class="cc">${e.lettvatn_h ? X : ''}</td>
        <td class="cc">${e.lettvatn_y ? X : ''}</td>
        <td class="sz">${esc(e.kolsyra_size || '')}</td>
        <td class="cc">${e.kolsyra_h ? X : ''}</td>
        <td class="cc">${e.kolsyra_y ? X : ''}</td>
        <td class="act">
          ${!isArchived ? `
            <button class="vd-edit" data-id="${esc(e.id)}" title="Breyta">✏️</button>
            <button class="primary vd-archive" data-id="${esc(e.id)}" title="Frágengið">✓</button>
            <button class="danger vd-del" data-id="${esc(e.id)}" title="Eyða">🗑️</button>
          ` : `
            <button class="vd-unarchive" data-id="${esc(e.id)}" title="Endurvirkja">↩</button>
            <button class="danger vd-del" data-id="${esc(e.id)}" title="Eyða">🗑️</button>
          `}
        </td>
      </tr>`;
  }

  function setupNotInstalledHTML() {
    return `
      <div style="background:#fffbeb;border:1px solid #fcd34d;border-radius:12px;padding:20px;">
        <div style="font-size:15px;font-weight:600;color:#92400e;margin-bottom:8px;">⚠️ Verkdagbók er ekki sett upp</div>
        <div style="font-size:14px;color:#475569;line-height:1.5;margin-bottom:12px;">Þú þarft að keyra SQL-skipun í Supabase til að búa til <code>verkdagbok</code> töfluna.</div>
        <button class="vd-skra-btn" id="vd-retry" style="background:#475569;">Reyna aftur</button>
      </div>`;
  }

  function toolbarHTML(activeCount, doneTodayCount, archivedCount) {
    return `
      <div class="vd-toolbar">
        <div class="vd-search">
          <span class="vd-search-icon">🔍</span>
          <input type="text" id="vd-search" placeholder="Leita í færslum..." value="${esc(searchQuery)}" autocomplete="off">
          ${searchQuery ? '<button class="vd-search-clear" id="vd-search-clear" title="Hreinsa">✕</button>' : ''}
        </div>
        <div class="vd-stats">
          <div class="vd-stat active"><strong>${activeCount}</strong> virk</div>
          <div class="vd-stat done"><strong>${doneTodayCount}</strong> í dag</div>
          <div class="vd-stat"><strong>${archivedCount}</strong> frágengin</div>
        </div>
      </div>`;
  }

  function render() {
    const m = ensureMain();
    if (!m) return;
    if (isLoading && !entries.length && !tableMissing) {
      m.innerHTML = '<div style="padding:40px;text-align:center;color:#94a3b8;">Hleður…</div>';
      return;
    }
    injectStyles();

    const headerHTML = `
      <div class="vd-header">
        <h1>📔 Verkdagbók</h1>
        <div class="sub">Verkefni, athugasemdir og þjónusta sem bíður</div>
      </div>`;

    if (tableMissing) {
      m.innerHTML = '<div class="vd-wrap">' + headerHTML + setupNotInstalledHTML() + '</div>';
      m.querySelector('#vd-retry')?.addEventListener('click', refresh);
      return;
    }

    const allActive = entries.filter(e => !e.archived);
    const allArchived = entries.filter(e => e.archived);
    const today = todayISO();
    const doneToday = entries.filter(e => e.done && e.job_date === today && !e.archived).length;

    const filteredActive = searchQuery ? allActive.filter(e => matchesSearch(e, searchQuery)) : allActive;
    const filteredArchived = searchQuery ? allArchived.filter(e => matchesSearch(e, searchQuery)) : allArchived;

    const desktop = isDesktop();
    const groups = groupByDate(filteredActive);

    let activeHTML;
    if (filteredActive.length === 0) {
      activeHTML = `<div class="vd-empty">${searchQuery ? 'Engin færsla passar við leitina.' : 'Engin virk verkefni — skráðu nýtt að ofan'}</div>`;
    } else if (desktop) {
      // Desktop: each date group becomes its own table
      activeHTML = groups.map(g => `
        <div class="vd-date-group">
          <div class="vd-section">
            <span class="date-bucket">${esc(g.label)}</span>
            <span class="count-pill">${g.items.length}</span>
          </div>
          <div class="vd-tbl-wrap"><table class="vd-tbl">${tableHead()}<tbody>${g.items.map(e => entryRowHTML(e, false)).join('')}</tbody></table></div>
        </div>`).join('');
    } else {
      activeHTML = groups.map(g => `
        <div class="vd-date-group">
          <div class="vd-section">
            <span class="date-bucket">${esc(g.label)}</span>
            <span class="count-pill">${g.items.length}</span>
          </div>
          ${g.items.map(e => entryCardHTML(e, false)).join('')}
        </div>`).join('');
    }

    let archivedHTML = '';
    if (filteredArchived.length > 0) {
      const expanded = archivedExpanded || !!searchQuery;
      const inner = desktop
        ? `<div class="vd-tbl-wrap" style="opacity:0.75;"><table class="vd-tbl">${tableHead()}<tbody>${filteredArchived.map(e => entryRowHTML(e, true)).join('')}</tbody></table></div>`
        : filteredArchived.map(e => entryCardHTML(e, true)).join('');
      archivedHTML = `
        <div class="vd-section archived ${expanded ? 'expanded' : ''}" id="vd-archived-toggle">
          <span class="vd-chev">▶</span>
          <span>Frágengið</span>
          <span class="count-pill">${filteredArchived.length}</span>
        </div>
        <div class="vd-archived-block ${expanded ? '' : 'collapsed'}" id="vd-archived-block">${inner}</div>`;
    }

    let formHTML;
    if (desktop) {
      formHTML = `
        <div class="vd-section">Ný færsla</div>
        <div class="vd-tbl-wrap"><table class="vd-tbl">${tableHead()}<tbody>${formRowHTML()}</tbody></table></div>`;
    } else {
      formHTML = `
        <div class="vd-section">Ný færsla</div>
        ${formCardHTML()}`;
    }

    m.innerHTML = `
      <div class="vd-wrap">
        ${headerHTML}
        ${toolbarHTML(allActive.length, doneToday, allArchived.length)}
        ${formHTML}
        <div class="vd-section">${searchQuery ? 'Leitarniðurstöður · virk' : 'Virk verkefni'}</div>
        ${activeHTML}
        ${archivedHTML}
      </div>
    `;

    // wire up
    m.querySelector('#vd-save-btn')?.addEventListener('click', saveNew);
    m.querySelectorAll('.vd-done-cb').forEach(cb => cb.addEventListener('change', () => toggleDone(cb.dataset.id, cb.checked)));
    m.querySelectorAll('.vd-edit').forEach(b => b.addEventListener('click', () => openEdit(b.dataset.id)));
    m.querySelectorAll('.vd-del').forEach(b => b.addEventListener('click', () => deleteEntry(b.dataset.id)));
    m.querySelectorAll('.vd-archive').forEach(b => b.addEventListener('click', () => archiveEntry(b.dataset.id, true)));
    m.querySelectorAll('.vd-unarchive').forEach(b => b.addEventListener('click', () => archiveEntry(b.dataset.id, false)));

    // search
    const searchInput = m.querySelector('#vd-search');
    if (searchInput) {
      let debounce = null;
      searchInput.addEventListener('input', () => {
        clearTimeout(debounce);
        debounce = setTimeout(() => {
          searchQuery = searchInput.value.trim();
          render();
          // re-focus
          const newInput = ensureMain()?.querySelector('#vd-search');
          if (newInput) {
            newInput.focus();
            const v = newInput.value;
            newInput.setSelectionRange(v.length, v.length);
          }
        }, 200);
      });
    }
    m.querySelector('#vd-search-clear')?.addEventListener('click', () => {
      searchQuery = '';
      render();
      ensureMain()?.querySelector('#vd-search')?.focus();
    });

    // archived toggle
    m.querySelector('#vd-archived-toggle')?.addEventListener('click', () => {
      archivedExpanded = !archivedExpanded;
      const sec = m.querySelector('#vd-archived-toggle');
      const block = m.querySelector('#vd-archived-block');
      if (sec) sec.classList.toggle('expanded', archivedExpanded);
      if (block) block.classList.toggle('collapsed', !archivedExpanded);
    });

    // textarea autoresize
    const ath = m.querySelector('#vd-athugasemdir');
    if (ath) {
      const resize = () => { ath.style.height = 'auto'; ath.style.height = Math.max(46, ath.scrollHeight) + 'px'; };
      ath.addEventListener('input', resize);
      resize();
    }

    // keyboard: Cmd/Ctrl+Enter to save from any form input
    const formInputs = m.querySelectorAll('.vd-form-row input, .vd-form-row textarea, .vd-form-card input, .vd-form-card textarea');
    formInputs.forEach(el => {
      el.addEventListener('keydown', (ev) => {
        if ((ev.metaKey || ev.ctrlKey) && ev.key === 'Enter') {
          ev.preventDefault();
          saveNew();
        }
      });
    });
  }

  function readForm(scope, prefix) {
    const $ = id => scope.querySelector('#' + prefix + id);
    return {
      job_date: $('-date')?.value || todayISO(),
      fyrirtaeki: $('-fyrirtaeki')?.value.trim() || null,
      athugasemdir: $('-athugasemdir')?.value.trim() || null,
      duft_size: $('-duft-size')?.value.trim() || null,
      duft_h: !!$('-duft-h')?.checked,
      duft_y: !!$('-duft-y')?.checked,
      lettvatn_size: $('-lettvatn-size')?.value.trim() || null,
      lettvatn_h: !!$('-lettvatn-h')?.checked,
      lettvatn_y: !!$('-lettvatn-y')?.checked,
      kolsyra_size: $('-kolsyra-size')?.value.trim() || null,
      kolsyra_h: !!$('-kolsyra-h')?.checked,
      kolsyra_y: !!$('-kolsyra-y')?.checked
    };
  }

  async function saveNew() {
    const m = ensureMain();
    const form = readForm(m, 'vd');
    if (!form.fyrirtaeki && !form.athugasemdir) {
      alert('Sláðu inn fyrirtæki eða athugasemd áður en þú skráir.');
      return;
    }
    form.done = false; form.archived = false;
    try {
      const { error } = await SB.from('verkdagbok').insert(form);
      if (error) throw error;
      await load(); render();
    } catch (e) { alert('Villa við vistun: ' + e.message); }
  }

  async function toggleDone(id, done) {
    try {
      const { error } = await SB.from('verkdagbok').update({ done }).eq('id', id);
      if (error) throw error;
      const entry = entries.find(x => String(x.id) === String(id));
      if (entry) entry.done = done;
      render();
    } catch (e) { alert('Villa: ' + e.message); }
  }

  async function archiveEntry(id, archived) {
    try {
      const upd = { archived, archived_at: archived ? new Date().toISOString() : null };
      const { error } = await SB.from('verkdagbok').update(upd).eq('id', id);
      if (error) throw error;
      await load(); render();
    } catch (e) { alert('Villa: ' + e.message); }
  }

  async function deleteEntry(id) {
    const e = entries.find(x => String(x.id) === String(id));
    if (!confirm('Eyða þessari færslu varanlega?\n\n' + (e?.athugasemdir?.slice(0,80) || e?.fyrirtaeki || '(ónefnd)'))) return;
    try {
      const { error } = await SB.from('verkdagbok').delete().eq('id', id);
      if (error) throw error;
      await load(); render();
    } catch (e) { alert('Villa: ' + e.message); }
  }

  function openEdit(id) {
    const entry = entries.find(x => String(x.id) === String(id));
    if (!entry) return;
    const existing = document.getElementById('vd-edit-modal');
    if (existing) existing.remove();
    const html = `
      <div id="vd-edit-modal" class="modal" style="display:flex;position:fixed;inset:0;z-index:9999;background:rgba(15,23,42,0.5);align-items:flex-start;justify-content:center;padding:16px;overflow-y:auto;">
        <div class="vd-form-card" style="max-width:600px;width:100%;margin-top:30px;">
          <h3 style="margin:0 0 16px 0;font-size:17px;color:#0f172a;">Breyta færslu</h3>
          <div class="vd-meta-row">
            <div><label class="lbl">Dags</label><input type="date" id="ve-date" value="${esc(entry.job_date || todayISO())}"></div>
            <div><label class="lbl">Fyrirtæki</label><input type="text" id="ve-fyrirtaeki" value="${esc(entry.fyrirtaeki || '')}"></div>
          </div>
          <div><label class="lbl">Athugasemdir / verklýsing</label><textarea id="ve-athugasemdir" style="min-height:120px;font-size:15px;line-height:1.5;">${esc(entry.athugasemdir || '')}</textarea></div>
          <div class="vd-eq-block">
            <div class="vd-eq-head"><div>Tæki</div><div></div><div class="h">h</div><div class="y">y</div></div>
            <div class="vd-eq-row"><div class="lbl-cell">🧯 Duft</div><input type="text" id="ve-duft-size" value="${esc(entry.duft_size || '')}">
              <div class="cb-cell"><input type="checkbox" id="ve-duft-h" ${entry.duft_h?'checked':''}></div>
              <div class="cb-cell"><input type="checkbox" id="ve-duft-y" ${entry.duft_y?'checked':''}></div></div>
            <div class="vd-eq-row"><div class="lbl-cell">🚒 Léttvatn</div><input type="text" id="ve-lettvatn-size" value="${esc(entry.lettvatn_size || '')}">
              <div class="cb-cell"><input type="checkbox" id="ve-lettvatn-h" ${entry.lettvatn_h?'checked':''}></div>
              <div class="cb-cell"><input type="checkbox" id="ve-lettvatn-y" ${entry.lettvatn_y?'checked':''}></div></div>
            <div class="vd-eq-row"><div class="lbl-cell">☁️ Kolsýra</div><input type="text" id="ve-kolsyra-size" value="${esc(entry.kolsyra_size || '')}">
              <div class="cb-cell"><input type="checkbox" id="ve-kolsyra-h" ${entry.kolsyra_h?'checked':''}></div>
              <div class="cb-cell"><input type="checkbox" id="ve-kolsyra-y" ${entry.kolsyra_y?'checked':''}></div></div>
          </div>
          <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:18px;">
            <button id="ve-cancel" style="padding:9px 16px;background:#fff;border:1px solid #e2e8f0;border-radius:8px;font-size:14px;cursor:pointer;color:#334155;">Hætta við</button>
            <button class="vd-skra-btn" id="ve-save">Vista</button>
          </div>
        </div>
      </div>`;
    document.body.insertAdjacentHTML('beforeend', html);
    const modal = document.getElementById('vd-edit-modal');
    const close = () => modal.remove();
    modal.querySelector('#ve-cancel').addEventListener('click', close);
    modal.addEventListener('click', ev => { if (ev.target === modal) close(); });
    const saveFn = async () => {
      const upd = readForm(modal, 've');
      try {
        const { error } = await SB.from('verkdagbok').update(upd).eq('id', entry.id);
        if (error) throw error;
        close(); await load(); render();
      } catch (er) { alert('Villa við vistun: ' + er.message); }
    };
    modal.querySelector('#ve-save').addEventListener('click', saveFn);
    modal.querySelectorAll('input, textarea').forEach(el => {
      el.addEventListener('keydown', (ev) => {
        if ((ev.metaKey || ev.ctrlKey) && ev.key === 'Enter') { ev.preventDefault(); saveFn(); }
        if (ev.key === 'Escape') { close(); }
      });
    });
    // autoresize edit textarea
    const ath = modal.querySelector('#ve-athugasemdir');
    if (ath) {
      const resize = () => { ath.style.height = 'auto'; ath.style.height = Math.max(120, ath.scrollHeight) + 'px'; };
      ath.addEventListener('input', resize);
      setTimeout(resize, 0);
    }
  }

  async function refresh() {
    const m = ensureMain();
    if (m && !entries.length && !tableMissing) m.innerHTML = '<div style="padding:40px;text-align:center;color:#94a3b8;">Hleður…</div>';
    try { await load(); render(); }
    catch (e) {
      const m2 = ensureMain();
      if (m2) m2.innerHTML = '<div style="padding:40px;text-align:center;color:#dc2626;">Villa: ' + esc(e.message) + '</div>';
      console.error('[Verkdagbok]', e);
    }
  }

  function showVerkdagbokView() {
    document.querySelectorAll('.view.active').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.vnav-btn.active').forEach(b => b.classList.remove('active'));
    const v = document.getElementById('view-verkdagbok');
    const b = document.querySelector('.vnav-btn[data-view="verkdagbok"]');
    if (v) v.classList.add('active');
    if (b) b.classList.add('active');
    refresh();
    document.querySelectorAll('.vnav, [class*="drawer"], [class*="menu-open"]').forEach(el => {
      el.classList.remove('open', 'active', 'menu-open');
    });
  }

  // Re-render on viewport change between mobile/desktop
  let lastWasDesktop = isDesktop();
  let resizeTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      const nowDesktop = isDesktop();
      const view = document.getElementById('view-verkdagbok');
      if (nowDesktop !== lastWasDesktop && view && view.classList.contains('active')) {
        lastWasDesktop = nowDesktop;
        render();
      } else {
        lastWasDesktop = nowDesktop;
      }
    }, 200);
  });

  function init() { ensureNavButton(); ensureViewContainer(); }
  init();
  setTimeout(init, 100);
  setTimeout(init, 500);
  setTimeout(init, 1500);

  const interceptor = (e) => {
    const target = e.target.closest && e.target.closest('.vnav-btn[data-view="verkdagbok"]');
    if (!target) return;
    e.stopImmediatePropagation();
    e.preventDefault();
    showVerkdagbokView();
  };
  window.addEventListener('click', interceptor, true);
  document.addEventListener('click', interceptor, true);

  window.Verkdagbok = { load, render, refresh, list: entries, version: 'v5' };
  window.__VerkdagbokInstalled = true;
})();
/* === END VERKDAGBOK === */
