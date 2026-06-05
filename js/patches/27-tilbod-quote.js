/* === TILBOÐ / QUOTE WORKFLOW v1 === */
/* Creates and manages sales quotes (tilboð). A quote can be:
 *  draft → sent → accepted (→ creates a Verkdagbok job) or rejected / expired.
 *
 * SQL required (run once in Supabase):
 *   CREATE TABLE IF NOT EXISTS tilbod (
 *     id BIGSERIAL PRIMARY KEY,
 *     num TEXT,
 *     company_id BIGINT,
 *     company_nafn TEXT,
 *     linur JSONB DEFAULT '[]'::jsonb,
 *     upphaed_an_vsk NUMERIC DEFAULT 0,
 *     vsk_upphaed NUMERIC DEFAULT 0,
 *     samtals NUMERIC DEFAULT 0,
 *     valid_until DATE,
 *     status TEXT DEFAULT 'draft',
 *     notes TEXT,
 *     created_at TIMESTAMPTZ DEFAULT NOW(),
 *     created_by TEXT
 *   );
 *
 * Features:
 *  • Nav button "Tilboð" under Sala
 *  • List of all quotes with status, customer, amount
 *  • New quote: select customer, add lines (same items as POS), set validity
 *  • Actions per quote: Send (email link), Accept (creates counter job), Reject
 *  • Print/email quote as A4 PDF (uses SalaInvoice renderer)
 */
(() => {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (window.__tilbodInstalled) return;
  window.__tilbodInstalled = true;

  const VIEW_ID = 'view-tilbod';

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
  function today() {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
  }
  function daysUntil(dateStr) {
    if (!dateStr) return null;
    return Math.ceil((new Date(dateStr) - new Date()) / 86400000);
  }

  const STATUS_META = {
    draft:    { label: 'Drög',     color: '#64748b', bg: '#f1f5f9' },
    sent:     { label: 'Sent',     color: '#2563eb', bg: '#eff6ff' },
    accepted: { label: 'Samþykkt', color: '#16a34a', bg: '#f0fdf4' },
    rejected: { label: 'Hafnað',   color: '#dc2626', bg: '#fef2f2' },
    expired:  { label: 'Útrunnið', color: '#94a3b8', bg: '#f8fafc' }
  };

  // ── CSS ───────────────────────────────────────────────────────────────────
  if (!document.getElementById('tb-style')) {
    const s = document.createElement('style');
    s.id = 'tb-style';
    s.textContent = `
      #${VIEW_ID} { padding: 0; overflow-y: auto; }
      #${VIEW_ID} .tb-wrap { max-width: 1100px; margin: 0 auto; padding: 20px 16px 40px; }
      #${VIEW_ID} .tb-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px; flex-wrap: wrap; gap: 12px; }
      #${VIEW_ID} .tb-header h1 { margin: 0; font-size: 22px; font-weight: 800; }
      #${VIEW_ID} .tb-new-btn { padding: 9px 16px; background: #2563eb; color: #fff; border: none; border-radius: 8px; font: inherit; font-size: 13px; font-weight: 600; cursor: pointer; }
      #${VIEW_ID} .tb-new-btn:hover { background: #1d4ed8; }
      #${VIEW_ID} .tb-filters { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 14px; }
      #${VIEW_ID} .tb-filter-btn { padding: 5px 12px; border: 1px solid #cbd5e1; border-radius: 99px; background: #fff; cursor: pointer; font: inherit; font-size: 12px; color: #475569; }
      #${VIEW_ID} .tb-filter-btn:hover { background: #f1f5f9; }
      #${VIEW_ID} .tb-filter-btn.active { background: #0f172a; color: #fff; border-color: #0f172a; }
      #${VIEW_ID} .tb-table-wrap { background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; }
      #${VIEW_ID} table.tb-table { width: 100%; border-collapse: collapse; font-size: 13px; }
      #${VIEW_ID} .tb-table th { background: #f8fafc; padding: 9px 12px; text-align: left; font-size: 10px; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: .04em; border-bottom: 1px solid #e2e8f0; }
      #${VIEW_ID} .tb-table td { padding: 9px 12px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
      #${VIEW_ID} .tb-table tr:last-child td { border-bottom: none; }
      #${VIEW_ID} .tb-table tr:hover td { background: #f8fafc; }
      #${VIEW_ID} .tb-status { display: inline-block; padding: 2px 9px; border-radius: 99px; font-size: 11px; font-weight: 700; }
      #${VIEW_ID} .tb-expiry-warn { color: #d97706; font-size: 11px; font-weight: 600; }
      #${VIEW_ID} .tb-expiry-expired { color: #dc2626; font-size: 11px; font-weight: 600; }
      #${VIEW_ID} .tb-action-btns { display: flex; gap: 5px; flex-wrap: wrap; }
      #${VIEW_ID} .tb-action-btn { padding: 3px 9px; border: 1px solid #e2e8f0; border-radius: 6px; background: #fff; font: inherit; font-size: 11px; font-weight: 500; cursor: pointer; color: #334155; white-space: nowrap; }
      #${VIEW_ID} .tb-action-btn:hover { background: #f8fafc; border-color: #94a3b8; }
      #${VIEW_ID} .tb-action-btn.green { border-color: #86efac; color: #16a34a; background: #f0fdf4; }
      #${VIEW_ID} .tb-action-btn.green:hover { background: #dcfce7; }
      #${VIEW_ID} .tb-action-btn.red { border-color: #fca5a5; color: #dc2626; background: #fef2f2; }
      #${VIEW_ID} .tb-action-btn.red:hover { background: #fee2e2; }
      #${VIEW_ID} .tb-empty { padding: 60px; text-align: center; color: #94a3b8; font-style: italic; }

      /* New quote modal */
      #tb-modal {
        position: fixed; inset: 0; z-index: 100010;
        display: flex; align-items: flex-start; justify-content: center;
        padding-top: 5vh; font-family: inherit;
      }
      #tb-modal .tb-back { position: absolute; inset: 0; background: rgba(15,23,42,.55); }
      #tb-modal .tb-card {
        position: relative; background: #fff; border-radius: 14px;
        box-shadow: 0 20px 60px rgba(0,0,0,.3);
        width: min(680px,calc(100vw - 24px)); max-height: 90vh; overflow-y: auto;
      }
      #tb-modal .tb-mhd { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-bottom: 1px solid #e2e8f0; }
      #tb-modal .tb-mhd h3 { margin: 0; font-size: 17px; font-weight: 700; }
      #tb-modal .tb-mx { background: none; border: none; font-size: 20px; color: #94a3b8; cursor: pointer; padding: 2px 8px; border-radius: 6px; }
      #tb-modal .tb-mx:hover { background: #f1f5f9; }
      #tb-modal .tb-mbody { padding: 20px; }
      #tb-modal .tb-mrow { margin-bottom: 14px; }
      #tb-modal .tb-mrow label { display: block; font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: .05em; margin-bottom: 5px; }
      #tb-modal .tb-minput { width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 8px; font: inherit; font-size: 13px; box-sizing: border-box; }
      #tb-modal .tb-minput:focus { outline: none; border-color: #2563eb; }
      #tb-modal .tb-lines-hd { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
      #tb-modal .tb-add-line-btn { padding: 5px 12px; background: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 6px; font: inherit; font-size: 12px; cursor: pointer; color: #334155; }
      #tb-modal .tb-add-line-btn:hover { background: #e2e8f0; }
      #tb-modal .tb-line-row { display: grid; grid-template-columns: 1fr 60px 90px 70px 26px; gap: 6px; margin-bottom: 6px; align-items: center; }
      #tb-modal .tb-line-row input { padding: 6px 8px; border: 1px solid #e2e8f0; border-radius: 6px; font: inherit; font-size: 12px; }
      #tb-modal .tb-line-row input:focus { outline: none; border-color: #2563eb; }
      #tb-modal .tb-del-line { background: none; border: none; color: #94a3b8; cursor: pointer; font-size: 16px; line-height: 1; padding: 4px; }
      #tb-modal .tb-del-line:hover { color: #dc2626; }
      #tb-modal .tb-total-row { background: #f8fafc; border-radius: 8px; padding: 10px 12px; font-size: 13px; margin-top: 8px; display: flex; gap: 20px; flex-wrap: wrap; }
      #tb-modal .tb-total-row strong { font-weight: 700; }
      #tb-modal .tb-mfoot { display: flex; gap: 8px; justify-content: flex-end; padding: 12px 20px; border-top: 1px solid #e2e8f0; }
      #tb-modal .tb-mcancel { padding: 9px 18px; border: 1px solid #cbd5e1; border-radius: 8px; background: #fff; cursor: pointer; font: inherit; font-size: 13px; color: #475569; }
      #tb-modal .tb-msave { padding: 9px 18px; background: #2563eb; color: #fff; border: none; border-radius: 8px; cursor: pointer; font: inherit; font-size: 13px; font-weight: 600; }
      #tb-modal .tb-msave:hover { background: #1d4ed8; }
      #tb-modal .tb-msave:disabled { opacity: .5; cursor: not-allowed; }
      #tb-modal .tb-co-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 12px; }
      #tb-modal .tb-co-grid > div { min-width: 0; }
      #tb-modal .tb-mtextarea { min-height: 180px; resize: vertical; line-height: 1.55; font-family: inherit; white-space: pre-wrap; }
    `;
    document.head.appendChild(s);
  }

  // ── State ─────────────────────────────────────────────────────────────────
  let quotes = [];
  let filterStatus = 'all';
  let editingId = null;
  let editLines = [];
  let tbProducts = [];   // vörur fyrir línur (datalist + verð/VSK autofill)

  // ── Data ──────────────────────────────────────────────────────────────────
  async function load() {
    const SB = getSB();
    if (!SB) return;
    const { data, error } = await SB
      .from('tilbod')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      if (/relation.*does not exist/i.test(error.message)) {
        quotes = [];
        return;
      }
      console.warn('[tilbod]', error.message); return;
    }
    quotes = data || [];
    // Auto-expire
    const now = today();
    quotes = quotes.map(q => {
      if (q.status === 'sent' && q.valid_until && q.valid_until < now) return { ...q, status: 'expired' };
      return q;
    });
  }

  async function saveQuote(q) {
    const SB = getSB();
    if (!SB) throw new Error('Engin tenging');
    if (q.id) {
      const { error } = await SB.from('tilbod').update(q).eq('id', q.id);
      if (error) throw error;
    } else {
      const { data, error } = await SB.from('tilbod').insert(q).select().single();
      if (error) throw error;
      return data;
    }
    return q;
  }

  async function updateStatus(id, status) {
    const SB = getSB();
    if (!SB) throw new Error('Engin tenging');
    const { error } = await SB.from('tilbod').update({ status }).eq('id', id);
    if (error) throw error;
    const q = quotes.find(q => q.id === id);
    if (q) q.status = status;
  }

  // ── Get next quote number ─────────────────────────────────────────────────
  async function nextNum() {
    const SB = getSB();
    if (!SB) return 'T001';
    const year = new Date().getFullYear().toString().slice(-2);
    const prefix = 'T' + year;
    const { data } = await SB.from('tilbod').select('num').like('num', prefix + '%').order('num', { ascending: false }).limit(1);
    if (data && data.length) {
      const m = (data[0].num || '').match(/(\d+)$/);
      if (m) return prefix + String(parseInt(m[1], 10) + 1).padStart(3, '0');
    }
    return prefix + '001';
  }

  // Per-row status changer — lets the user set any status directly.
  function statusSelect(q) {
    const sm = STATUS_META[q.status] || STATUS_META.draft;
    const opts = Object.keys(STATUS_META).map(k =>
      `<option value="${k}" ${q.status === k ? 'selected' : ''}>${esc(STATUS_META[k].label)}</option>`).join('');
    return `<select class="tb-status-sel" data-tb-id="${q.id}" title="Breyta stöðu"
      style="background:${sm.bg};color:${sm.color};border:1px solid ${sm.color};border-radius:99px;font:inherit;font-size:11px;font-weight:700;padding:3px 8px;cursor:pointer;outline:none">${opts}</select>`;
  }

  // ── Render list ───────────────────────────────────────────────────────────
  function render() {
    const view = document.getElementById(VIEW_ID);
    if (!view || !view.classList.contains('active')) return;
    const tbody = document.getElementById('tb-tbody');
    if (!tbody) return;

    let visible = quotes;
    if (filterStatus !== 'all') visible = visible.filter(q => q.status === filterStatus);
    document.querySelectorAll('#'+VIEW_ID+' .tb-filter-btn').forEach(b =>
      b.classList.toggle('active', b.dataset.tbFilter === filterStatus));

    if (!visible.length) {
      tbody.innerHTML = `<tr><td colspan="7"><div class="tb-empty">Engin tilboð ${filterStatus !== 'all' ? 'með stöðuna "' + (STATUS_META[filterStatus]?.label || filterStatus) + '"' : ''}</div></td></tr>`;
      return;
    }

    tbody.innerHTML = visible.map(q => {
      let actions = '';
      if (q.status === 'draft') {
        actions = `<button class="tb-action-btn" data-tb-print="${q.id}">🖨 Prenta</button>
          <button class="tb-action-btn green" data-tb-status="${q.id}" data-tb-new-status="sent">✉ Merkja sent</button>
          <button class="tb-action-btn" data-tb-edit="${q.id}">✏ Breyta</button>
          <button class="tb-action-btn red" data-tb-del="${q.id}">✕</button>`;
      } else if (q.status === 'sent') {
        actions = `<button class="tb-action-btn" data-tb-print="${q.id}">🖨 Prenta</button>
          <button class="tb-action-btn green" data-tb-accept="${q.id}">✓ Samþykkja</button>
          <button class="tb-action-btn red" data-tb-status="${q.id}" data-tb-new-status="rejected">✕ Hafna</button>`;
      } else if (q.status === 'accepted') {
        actions = `<button class="tb-action-btn" data-tb-print="${q.id}">🖨 Prenta</button>`;
      } else {
        actions = `<button class="tb-action-btn" data-tb-print="${q.id}">🖨 Prenta</button>`;
      }
      const linkIco = q.link_url
        ? ` <a href="${esc(q.link_url)}" target="_blank" rel="noopener" title="Opna tengdan hlekk" style="text-decoration:none">🔗</a>` : '';
      return `<tr>
        <td style="font-family:monospace;font-size:12px;">${esc(q.num || '')}</td>
        <td>${esc(q.company_nafn || '—')}</td>
        <td>${esc(fmtDate(q.created_at))}</td>
        <td style="max-width:280px">${q.lysing
          ? `<span title="${esc(q.lysing)}" style="display:inline-block;max-width:250px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;vertical-align:bottom">${esc(q.lysing)}</span>`
          : '<span style="color:#cbd5e1">—</span>'}${linkIco}</td>
        <td style="text-align:right;font-weight:700;">${esc(fmtKr(+q.samtals||0))}</td>
        <td>${statusSelect(q)}</td>
        <td><div class="tb-action-btns">${actions}</div></td>
      </tr>`;
    }).join('');

    // Wire actions
    tbody.querySelectorAll('[data-tb-print]').forEach(btn => {
      btn.addEventListener('click', () => { const q = quotes.find(q => q.id == btn.dataset.tbPrint); if (q) printQuote(q); });
    });
    tbody.querySelectorAll('[data-tb-status]').forEach(btn => {
      btn.addEventListener('click', async () => {
        await updateStatus(parseInt(btn.dataset.tbStatus), btn.dataset.tbNewStatus);
        render();
      });
    });
    tbody.querySelectorAll('[data-tb-accept]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const q = quotes.find(q => q.id == btn.dataset.tbAccept);
        if (q) await acceptQuote(q);
        render();
      });
    });
    tbody.querySelectorAll('[data-tb-del]').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!await Confirm.show('Eyða þessu tilboði?')) return;
        const SB = getSB(); if (!SB) return;
        await SB.from('tilbod').delete().eq('id', btn.dataset.tbDel);
        quotes = quotes.filter(q => q.id != btn.dataset.tbDel);
        render();
      });
    });
    tbody.querySelectorAll('[data-tb-edit]').forEach(btn => {
      btn.addEventListener('click', () => {
        const q = quotes.find(q => q.id == btn.dataset.tbEdit);
        if (q) openQuoteModal(q);
      });
    });
    tbody.querySelectorAll('.tb-status-sel').forEach(sel => {
      sel.addEventListener('change', async () => {
        try { await updateStatus(parseInt(sel.dataset.tbId, 10), sel.value); }
        catch (e) { if (window.Toast && Toast.show) Toast.show('Villa: ' + (e.message || e)); }
        render();
      });
    });
  }

  // ── Accept quote → create counter job ────────────────────────────────────
  async function acceptQuote(q) {
    await updateStatus(q.id, 'accepted');
    // Create a job in verk (counter) if window.Counter.openNew exists
    if (window.Counter && typeof Counter.openNew === 'function') {
      Counter.openNew({ title: 'Tilboð ' + q.num, customer_nafn: q.company_nafn, notes: q.notes || '' });
    } else {
      if (window.Toast && Toast.show) Toast.show('Tilboð samþykkt ✓ — búðu til verk handvirkt í Afgreiðslu');
    }
  }

  // ── Print quote ───────────────────────────────────────────────────────────
  function printQuote(q) {
    const linur = Array.isArray(q.linur) ? q.linur : [];
    if (window.SalaInvoice && SalaInvoice.render) {
      const win = window.open('', 'tilbod-print', 'width=900,height=1100');
      if (!win) return;
      SalaInvoice.render(win, {
        num: q.num, isTilbod: true,
        customer: q.company_nafn || '', lines: linur,
        total: +(q.samtals||0), ex: +(q.upphaed_an_vsk||0), vsk: +(q.vsk_upphaed||0),
        notes: q.notes || '',
        validUntil: q.valid_until ? fmtDate(q.valid_until) : ''
      });
    }
  }

  // ── Quote modal ───────────────────────────────────────────────────────────
  function buildModal() {
    if (document.getElementById('tb-modal')) return;
    const el = document.createElement('div');
    el.id = 'tb-modal';
    el.style.display = 'none';
    el.innerHTML = `
      <div class="tb-back"></div>
      <div class="tb-card">
        <div class="tb-mhd">
          <h3 id="tb-modal-title">Nýtt tilboð</h3>
          <button class="tb-mx" id="tb-mx">✕</button>
        </div>
        <div class="tb-mbody" id="tb-mbody"></div>
        <div class="tb-mfoot">
          <button class="tb-mcancel" id="tb-mcancel">Hætta við</button>
          <button class="tb-msave" id="tb-mprint" style="background:#0f766e">🖨 Vista og prenta</button>
          <button class="tb-msave" id="tb-msave">Vista tilboð</button>
        </div>
      </div>`;
    document.body.appendChild(el);
    // Backdrop no longer closes the modal — clicking the dark area was the #1 way
    // people lost a half-filled tilboð. Close only via ✕ / Hætta við (and even
    // then we confirm if anything's been typed).
    el.querySelector('.tb-back').onclick = (e) => { e.stopPropagation(); };
    el.querySelector('#tb-mx').onclick = maybeCloseTbModal;
    el.querySelector('#tb-mcancel').onclick = maybeCloseTbModal;
  }

  function closeTbModal() {
    const el = document.getElementById('tb-modal');
    if (el) el.style.display = 'none';
    editingId = null; editLines = [];
  }

  // Confirm before closing only when something has actually been typed, so a
  // stray click never silently throws away a half-filled tilboð.
  function tbModalDirty() {
    const v = id => (document.getElementById(id)?.value || '').trim();
    if (v('tb-co-name') || v('tb-co-kt') || v('tb-co-simi') || v('tb-co-netfang') ||
        v('tb-co-heim') || v('tb-lysing') || v('tb-link') || v('tb-notes')) return true;
    if (Array.isArray(editLines) && editLines.some(l => (l.desc||'').trim() || +l.unit_price_ex_vat > 0)) return true;
    return false;
  }
  function maybeCloseTbModal() {
    if (!tbModalDirty()) { closeTbModal(); return; }
    if (window.Confirm && Confirm.show) {
      Confirm.show('Loka tilboðinu og henda því sem þú slóst inn?',
        { okText: 'Henda', cancelText: 'Halda áfram', danger: true })
        .then(ok => { if (ok) closeTbModal(); });
    } else if (confirm('Loka tilboðinu og henda því sem þú slóst inn?')) {
      closeTbModal();
    }
  }

  function calcTotals(lines) {
    const ex = lines.reduce((a, l) => a + ((+l.qty||0) * (+l.unit_price_ex_vat||0)), 0);
    const vsk = lines.reduce((a, l) => {
      const lineEx = (+l.qty||0) * (+l.unit_price_ex_vat||0);
      return a + lineEx * ((+l.vsk_pct||0)/100);
    }, 0);
    return { ex, vsk, total: ex + vsk };
  }

  function renderModalLines() {
    const wrap = document.getElementById('tb-lines-wrap');
    if (!wrap) return;
    const { ex, vsk, total } = calcTotals(editLines);
    let html = editLines.map((l, i) => `
      <div class="tb-line-row" data-line="${i}">
        <input type="text" class="tb-line-desc" list="tb-vorur-list" value="${esc(l.desc||'')}" placeholder="Lýsing vöru/þjónustu — eða veldu úr vörulista">
        <input type="number" class="tb-line-qty" value="${l.qty||1}" min="0.01" step="1" style="text-align:right;">
        <input type="number" class="tb-line-price" value="${+l.unit_price_ex_vat||0}" min="0" step="100" style="text-align:right;" placeholder="Verð án VSK">
        <select class="tb-line-vsk">
          <option value="24" ${+l.vsk_pct===24?'selected':''}>24%</option>
          <option value="11" ${+l.vsk_pct===11?'selected':''}>11%</option>
          <option value="0" ${+l.vsk_pct===0?'selected':''}>0%</option>
        </select>
        <button class="tb-del-line" data-del-line="${i}">✕</button>
      </div>`).join('');
    html += `<div class="tb-total-row">
      <span>Án VSK: <strong>${fmtKr(ex)}</strong></span>
      <span>VSK: <strong>${fmtKr(vsk)}</strong></span>
      <span>Samtals: <strong>${fmtKr(total)}</strong></span>
    </div>`;
    wrap.innerHTML = html;

    wrap.querySelectorAll('[data-del-line]').forEach(b => {
      b.addEventListener('click', () => { editLines.splice(parseInt(b.dataset.delLine),1); renderModalLines(); });
    });
    wrap.querySelectorAll('.tb-line-desc,.tb-line-qty,.tb-line-price,.tb-line-vsk').forEach(inp => {
      inp.addEventListener('input', () => {
        const row = inp.closest('[data-line]');
        if (!row) return;
        const i = parseInt(row.dataset.line, 10);
        // Vörulisti: ef lýsing passar nákvæmlega við skráða vöru → fylltu verð + VSK.
        if (inp.classList.contains('tb-line-desc') && tbProducts.length) {
          const want = inp.value.trim().toLowerCase();
          const prod = tbProducts.find(p => String(p.nafn || '').trim().toLowerCase() === want);
          if (prod) {
            const pe = row.querySelector('.tb-line-price'); if (pe) pe.value = +prod.verd_an_vsk || 0;
            const ve = row.querySelector('.tb-line-vsk'); if (ve && prod.vsk_prosenta != null) ve.value = String(+prod.vsk_prosenta);
          }
        }
        editLines[i] = {
          desc: row.querySelector('.tb-line-desc')?.value || '',
          qty: parseFloat(row.querySelector('.tb-line-qty')?.value) || 1,
          unit_price_ex_vat: parseFloat(row.querySelector('.tb-line-price')?.value) || 0,
          vsk_pct: parseFloat(row.querySelector('.tb-line-vsk')?.value) || 0
        };
        // Recalc total display only
        const { ex: e2, vsk: v2, total: t2 } = calcTotals(editLines);
        const totRow = wrap.querySelector('.tb-total-row');
        if (totRow) totRow.innerHTML = `<span>Án VSK: <strong>${fmtKr(e2)}</strong></span><span>VSK: <strong>${fmtKr(v2)}</strong></span><span>Samtals: <strong>${fmtKr(t2)}</strong></span>`;
      });
    });
  }

  async function openQuoteModal(existingQ) {
    buildModal();
    editingId = (existingQ && existingQ.id) ? existingQ.id : null;
    // Expose to other patches (e.g. 71-tilbod-photos.js needs to know which
    // quote we're editing so it can list/upload attachments under the
    // correct tilbod_id).
    window.__tilbodEditingId = editingId;
    editLines = existingQ ? JSON.parse(JSON.stringify(Array.isArray(existingQ.linur) ? existingQ.linur : [])) : [{ desc: '', qty: 1, unit_price_ex_vat: 0, vsk_pct: 24 }];
    document.getElementById('tb-modal-title').textContent = (existingQ && existingQ.id) ? 'Breyta tilboði' : 'Nýtt tilboð';

    // Load companies for the typeahead (name → optional link + autofill).
    // A tilboð is usually for a prospect who is NOT a registered customer, so
    // the company link is optional — free-form names/contacts are kept as-is.
    let cos = [];
    try {
      const SB = getSB();
      if (SB) {
        const { data } = await SB.from('fyrirtaeki')
          .select('id,nafn,kennitala,netfang,simi,heimilisfang').order('nafn').limit(2000);
        cos = data || [];
      }
    } catch (_) {}
    if (!cos.length && window.Companies && Companies.list) cos = Companies.list;
    // Vörur fyrir línur — datalist + sjálfvirkt verð/VSK þegar vara er valin.
    try { const SB2 = getSB(); if (SB2) { const { data: vd } = await SB2.from('vorur').select('nafn,verd_an_vsk,vsk_prosenta').eq('virkt', true).order('nafn'); tbProducts = vd || []; } } catch (_) {}

    const foldName = s => String(s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').trim();
    const coByName = {};
    cos.forEach(c => { if (c && c.nafn) coByName[foldName(c.nafn)] = c; });
    let selectedCompanyId = (existingQ && existingQ.company_id) || null;
    const coOpts = cos.map(c => `<option value="${esc(c.nafn||'')}"></option>`).join('');

    const defValidUntil = (() => { const d = new Date(); d.setDate(d.getDate()+30); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); })();

    document.getElementById('tb-mbody').innerHTML = `
      <div class="tb-mrow">
        <label>Viðskiptavinur / nafn *</label>
        <input type="text" id="tb-co-name" class="tb-minput" list="tb-co-list" autocomplete="off"
          value="${esc(existingQ?.company_nafn||'')}" placeholder="Nafn, fyrirtæki eða hver sem er — þarf ekki að vera skráður">
        <datalist id="tb-co-list">${coOpts}</datalist>
        <div id="tb-co-hint" style="font-size:11px;color:#94a3b8;margin-top:5px;min-height:14px"></div>
      </div>
      <div class="tb-mrow tb-co-grid">
        <div><label>Kennitala</label><input type="text" id="tb-co-kt" class="tb-minput" value="${esc(existingQ?.kennitala||'')}" placeholder="000000-0000"></div>
        <div><label>Sími</label><input type="text" id="tb-co-simi" class="tb-minput" value="${esc(existingQ?.simi||'')}" placeholder="000 0000"></div>
        <div><label>Netfang</label><input type="text" id="tb-co-netfang" class="tb-minput" value="${esc(existingQ?.netfang||'')}" placeholder="netfang@daemi.is"></div>
        <div><label>Heimilisfang</label><input type="text" id="tb-co-heim" class="tb-minput" value="${esc(existingQ?.heimilisfang||'')}" placeholder="Gata 1, 101 Reykjavík"></div>
      </div>
      <div class="tb-mrow">
        <label>Lýsing — stutt fyrirsögn (hvað er beðið um)</label>
        <input type="text" id="tb-lysing" class="tb-minput" value="${esc(existingQ?.lysing||'')}" placeholder="t.d. 20× Duft 6kg endurfylling + skoðun">
      </div>
      <div class="tb-mrow tb-co-grid">
        <div><label>Gildistími til</label><input type="date" id="tb-valid" class="tb-minput" value="${existingQ?.valid_until || defValidUntil}"></div>
        <div><label>Tengill (hlekkur)</label><input type="text" id="tb-link" class="tb-minput" value="${esc(existingQ?.link_url||'')}" placeholder="https://… tilboðsform eða samningur"></div>
      </div>
      <div class="tb-mrow">
        <label>Athugasemd</label>
        <textarea id="tb-notes" class="tb-minput tb-mtextarea" rows="8" placeholder="Frjáls texti — límdu inn fyrirspurn, lýsingu eða aðrar upplýsingar. Boxið er stórt og resizanlegt.">${esc(existingQ?.notes||'')}</textarea>
      </div>
      <div class="tb-lines-hd">
        <label style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.05em;">Línur</label>
        <button class="tb-add-line-btn" id="tb-add-line">+ Bæta við línu</button>
      </div>
      <div id="tb-lines-wrap"></div>
      <datalist id="tb-vorur-list">${tbProducts.map(p => `<option value="${esc(p.nafn||'')}"></option>`).join('')}</datalist>`;

    renderModalLines();
    document.getElementById('tb-add-line').addEventListener('click', () => {
      editLines.push({ desc: '', qty: 1, unit_price_ex_vat: 0, vsk_pct: 24 });
      renderModalLines();
    });

    // Typeahead: when the typed name matches a registered company, link it and
    // offer to autofill empty contact fields. Otherwise it's a free-form prospect.
    const nameEl = document.getElementById('tb-co-name');
    const hintEl = document.getElementById('tb-co-hint');
    function applyCompanyMatch(autofill) {
      const c = coByName[foldName(nameEl.value)] || null;
      selectedCompanyId = c ? c.id : null;
      if (c) {
        hintEl.textContent = '✓ Tengt skráðum viðskiptavin';
        hintEl.style.color = '#16a34a';
        if (autofill) {
          const set = (id, val) => { const el = document.getElementById(id); if (el && !el.value && val) el.value = val; };
          set('tb-co-kt', c.kennitala); set('tb-co-simi', c.simi);
          set('tb-co-netfang', c.netfang); set('tb-co-heim', c.heimilisfang);
        }
      } else {
        hintEl.textContent = nameEl.value.trim() ? 'Nýr / óskráður — vistast sem frjáls texti' : '';
        hintEl.style.color = '#94a3b8';
      }
    }
    if (nameEl) {
      nameEl.addEventListener('input', () => applyCompanyMatch(false));
      nameEl.addEventListener('change', () => applyCompanyMatch(true));
      applyCompanyMatch(false);
    }

    async function doSave() {
      const coNafn = (document.getElementById('tb-co-name')?.value || '').trim();
      // Re-resolve link from the current name (covers paste / no-event cases).
      const matched = coByName[foldName(coNafn)] || null;
      const coId = matched ? matched.id : (selectedCompanyId || null);
      const kennitala    = document.getElementById('tb-co-kt')?.value.trim() || '';
      const simi         = document.getElementById('tb-co-simi')?.value.trim() || '';
      const netfang      = document.getElementById('tb-co-netfang')?.value.trim() || '';
      const heimilisfang = document.getElementById('tb-co-heim')?.value.trim() || '';
      const validUntil = document.getElementById('tb-valid')?.value || null;
      const lysing = document.getElementById('tb-lysing')?.value.trim() || '';
      const linkUrl = document.getElementById('tb-link')?.value.trim() || '';
      const notes = document.getElementById('tb-notes')?.value.trim() || '';

      if (!coNafn) { if (window.Toast && Toast.show) Toast.show('Sláðu inn nafn eða fyrirtæki'); return null; }
      if (!editLines.length) { if (window.Toast && Toast.show) Toast.show('Bættu við línum'); return null; }

      const { ex, vsk, total } = calcTotals(editLines);
      const num = editingId ? (quotes.find(q=>q.id===editingId)?.num||'') : await nextNum();
      const q = {
        num, company_id: coId, company_nafn: coNafn,
        kennitala, netfang, heimilisfang, simi,
        lysing, link_url: linkUrl,
        linur: editLines, upphaed_an_vsk: ex, vsk_upphaed: vsk, samtals: total,
        valid_until: validUntil, notes, status: existingQ?.status || 'draft'
      };
      if (editingId) q.id = editingId;
      const saved = await saveQuote(q);
      const out = saved || q;
      if (!editingId) { quotes.unshift(out); }
      else { const idx = quotes.findIndex(x => x.id === editingId); if (idx >= 0) quotes[idx] = { ...quotes[idx], ...q }; }
      return out;
    }

    document.getElementById('tb-msave').onclick = async () => {
      const btn = document.getElementById('tb-msave'); btn.disabled = true;
      try {
        const out = await doSave();
        if (!out) { btn.disabled = false; return; }
        closeTbModal(); render();
        if (window.Toast && Toast.show) Toast.show('✓ Tilboð ' + (out.num||'') + ' vistað');
      } catch (e) { if (window.Toast && Toast.show) Toast.show('Villa: ' + (e.message || e)); btn.disabled = false; }
    };

    const tbPrintBtn = document.getElementById('tb-mprint');
    if (tbPrintBtn) tbPrintBtn.onclick = async () => {
      tbPrintBtn.disabled = true;
      try {
        const out = await doSave();
        if (!out) { tbPrintBtn.disabled = false; return; }
        closeTbModal(); render();
        if (window.Toast && Toast.show) Toast.show('✓ Tilboð ' + (out.num||'') + ' vistað — prenta…');
        printQuote(out);
      } catch (e) { if (window.Toast && Toast.show) Toast.show('Villa: ' + (e.message || e)); tbPrintBtn.disabled = false; }
    };

    document.getElementById('tb-modal').style.display = 'flex';
  }

  // ── Links bar (above the table) ─────────────────────────────────────────────
  // A fixed link to the public Brunahólf tilboð form + a jump to Samningar,
  // plus any extra tilboð-form links the user adds (stored in AppSettings so
  // the user can manage them without code changes).
  const FIXED_LINKS = [
    { label: '🌐 Brunahólf tilboðsform', url: 'https://brunaholf-tilbod.netlify.app/', fixed: true },
  ];
  function getFormLinks() {
    try { const v = window.AppSettings && AppSettings.path && AppSettings.path('tilbod_form_links'); return Array.isArray(v) ? v : []; }
    catch (_) { return []; }
  }
  async function saveFormLinks(arr) {
    if (!window.AppSettings || !AppSettings.save) { alert('AppSettings ekki tilbúið'); return false; }
    return await AppSettings.save({ tilbod_form_links: arr });
  }
  function linkChip(label, url, removable, idx) {
    return `<a href="${esc(url)}" target="_blank" rel="noopener" title="${esc(url)}"
      style="display:inline-flex;align-items:center;gap:6px;padding:7px 13px;background:#eff6ff;border:1px solid #bfdbfe;color:#1d4ed8;border-radius:8px;font:inherit;font-size:12.5px;font-weight:600;text-decoration:none">${esc(label)}${
      removable ? `<span class="tb-link-del" data-idx="${idx}" title="Fjarlægja" style="margin-left:3px;color:#94a3b8;cursor:pointer;font-weight:700">✕</span>` : ''}</a>`;
  }
  function renderLinksBar() {
    const bar = document.getElementById('tb-links');
    if (!bar) return;
    const extra = getFormLinks();
    bar.innerHTML =
      FIXED_LINKS.map(l => linkChip(l.label, l.url, false)).join('') +
      extra.map((l, i) => linkChip(l.label || l.url, l.url, true, i)).join('') +
      `<button id="tb-samningar" type="button" style="display:inline-flex;align-items:center;gap:6px;padding:7px 13px;background:#fff;border:1px solid #cbd5e1;color:#334155;border-radius:8px;font:inherit;font-size:12.5px;font-weight:600;cursor:pointer">📑 Samningar →</button>` +
      `<button id="tb-add-link" type="button" style="padding:7px 12px;background:#fff;border:1px dashed #cbd5e1;color:#64748b;border-radius:8px;font:inherit;font-size:12.5px;font-weight:600;cursor:pointer">＋ Bæta við hlekk</button>`;

    bar.querySelector('#tb-samningar')?.addEventListener('click', () => {
      if (window.App && App.switchView) App.switchView('samningar');
    });
    bar.querySelector('#tb-add-link')?.addEventListener('click', async () => {
      const url = prompt('Slóð á tilboðsform eða samning (https://…):');
      if (!url || !url.trim()) return;
      const label = (prompt('Nafn á hlekk (valfrjálst):', '') || '').trim();
      const arr = getFormLinks().concat([{ label: label || url.trim(), url: url.trim() }]);
      if (await saveFormLinks(arr)) renderLinksBar();
    });
    bar.querySelectorAll('.tb-link-del').forEach(x => x.addEventListener('click', async e => {
      e.preventDefault(); e.stopPropagation();
      const i = parseInt(x.dataset.idx, 10);
      const arr = getFormLinks(); arr.splice(i, 1);
      if (await saveFormLinks(arr)) renderLinksBar();
    }));
  }

  // ── View HTML ─────────────────────────────────────────────────────────────
  function buildViewHTML() {
    return `
      <main class="main-panel" style="overflow-y:auto;">
      <div class="tb-wrap">
        <div class="tb-header">
          <h1>📄 Tilboð</h1>
          <button class="tb-new-btn" id="tb-new-btn">+ Nýtt tilboð</button>
        </div>
        <div id="tb-links" style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:14px"></div>
        <div class="tb-filters">
          <button class="tb-filter-btn active" data-tb-filter="all">Öll</button>
          <button class="tb-filter-btn" data-tb-filter="draft">Drög</button>
          <button class="tb-filter-btn" data-tb-filter="sent">Sent</button>
          <button class="tb-filter-btn" data-tb-filter="accepted">Samþykkt</button>
          <button class="tb-filter-btn" data-tb-filter="rejected">Hafnað</button>
          <button class="tb-filter-btn" data-tb-filter="expired">Útrunnið</button>
        </div>
        <div class="tb-table-wrap">
          <table class="tb-table">
            <thead><tr>
              <th>Númer</th><th>Viðskiptavinur</th><th>Dagsetning</th>
              <th>Lýsing</th><th style="text-align:right;">Upphæð</th>
              <th>Staða</th><th>Aðgerðir</th>
            </tr></thead>
            <tbody id="tb-tbody">
              <tr><td colspan="7"><div class="tb-empty">Hleður tilboð…</div></td></tr>
            </tbody>
          </table>
        </div>
      </div>
      </main>`;
  }

  // ── View injection ────────────────────────────────────────────────────────
  function ensureView() {
    if (document.getElementById(VIEW_ID)) return;
    const views = document.querySelectorAll('.view');
    if (!views.length) return;
    const last = views[views.length - 1];
    const view = document.createElement('section');
    view.id = VIEW_ID; view.className = 'view';
    view.innerHTML = buildViewHTML();
    last.parentNode.insertBefore(view, last.nextSibling);

    document.getElementById('tb-new-btn').addEventListener('click', () => openQuoteModal(null));
    document.querySelectorAll('#'+VIEW_ID+' .tb-filter-btn').forEach(b => {
      b.addEventListener('click', () => { filterStatus = b.dataset.tbFilter; render(); });
    });
    renderLinksBar();
  }

  function ensureNavButton() {
    if (document.querySelector('[data-tilbod-nav]')) return;
    const salaBtn = Array.from(document.querySelectorAll('.vnav-btn')).find(b => /Afgreiðsla|Sala|sala/i.test(b.textContent));
    if (!salaBtn || !salaBtn.parentElement) return;
    const btn = document.createElement('button');
    btn.className = 'vnav-btn';
    btn.setAttribute('data-tilbod-nav', '1');
    btn.setAttribute('data-view', 'tilbod');
    btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>Tilboð`;
    btn.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); switchToView(); });
    salaBtn.parentElement.insertBefore(btn, salaBtn.nextSibling);
  }

  async function switchToView() {
    ensureView();
    document.querySelectorAll('.view.active').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.vnav-btn.active').forEach(b => b.classList.remove('active'));
    const view = document.getElementById(VIEW_ID);
    if (view) view.classList.add('active');
    const btn = document.querySelector('[data-tilbod-nav]');
    if (btn) btn.classList.add('active');
    await load(); render();
  }

  ensureView();
  ensureNavButton();
  setTimeout(() => { ensureView(); ensureNavButton(); }, 700);
  setTimeout(() => { ensureView(); ensureNavButton(); }, 2200);
  const obs = new MutationObserver(() => { ensureView(); ensureNavButton(); });
  obs.observe(document.body, { childList: true, subtree: true });

  window.Tilbod = { open: switchToView, openQuote: openQuoteModal };
  console.log('[tilbod-quote] installed');
})();
/* === END TILBOÐ QUOTE === */
