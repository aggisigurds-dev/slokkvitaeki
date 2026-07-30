/* === PURCHASE ORDERS / INNKAUPAPANTANIR v1 === */
/* Manage purchase orders to suppliers for restocking parts inventory.
 *
 * New nav view: "🛒 Pantanir" — injected after Birgðir.
 *
 * SQL (add to MIGRATION.sql):
 *   CREATE TABLE IF NOT EXISTS innkaupapantanir (
 *     id           BIGSERIAL PRIMARY KEY,
 *     po_num       TEXT,
 *     birgi        TEXT,
 *     status       TEXT DEFAULT 'drög',
 *     lines        JSONB DEFAULT '[]',
 *     notes        TEXT,
 *     created_at   TIMESTAMPTZ DEFAULT NOW(),
 *     sent_at      TIMESTAMPTZ,
 *     received_at  TIMESTAMPTZ
 *   );
 *
 * Lines format: [{ nafn, magn, eining, verd_an_vsk, birgdir_id? }, ...]
 *
 * Statuses: drög → sent → móttekið
 *
 * Features:
 *   - Create new PO (auto-suggest low-stock items from birgdir)
 *   - Email supplier via mailto: link
 *   - "Móttekin" → auto-increments birgdir.magn for each line
 *   - CSV export, delete
 */
(() => {
  if (window.__purchaseOrdersInstalled) return;
  window.__purchaseOrdersInstalled = true;

  function getSB() { return window.DB && window.DB.sb; }
  function esc(s) { return String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function fmtKr(n) { if(!n&&n!==0)return'—'; const s=Math.round(n).toString(); const r=[]; let t=s; while(t.length>3){r.unshift(t.slice(-3));t=t.slice(0,-3);}r.unshift(t);return r.join('.')+' kr'; }
  function todayISO() { const d=new Date(); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }
  function poNum() { return 'PO-'+new Date().getFullYear()+'-'+String(Math.floor(Math.random()*9000)+1000); }

  const STATUS_LABELS = { 'drög':'Drög','sent':'Sent','móttekið':'Móttekið' };
  const STATUS_COLORS = { 'drög':'#64748b','sent':'#3b82f6','móttekið':'#16a34a' };
  const STATUS_BG    = { 'drög':'#f1f5f9','sent':'#eff6ff','móttekið':'#f0fdf4' };

  // ── CSS ───────────────────────────────────────────────────────────────────
  if (!document.getElementById('po-style')) {
    const s = document.createElement('style');
    s.id = 'po-style';
    s.textContent = `
      #view-pantanir { background:var(--bg2,#f8fafc); overflow-y:auto; }
      .po-wrap { max-width:860px; margin:0 auto; padding:24px 20px 48px; }
      .po-status-chip { display:inline-block; padding:2px 9px; border-radius:10px; font-size:11px; font-weight:700; }
      .po-line-row { display:grid; grid-template-columns:1fr 70px 60px 100px 32px; gap:6px; align-items:center; margin-bottom:6px; }
      .po-line-inp { padding:6px 9px; border:1px solid var(--brd,#e2e8f0); border-radius:6px; font:inherit; font-size:12px; background:var(--bg1,#fff); color:var(--ink1); width:100%; box-sizing:border-box; }
      .po-modal-wrap { position:fixed; inset:0; z-index:99999; display:flex; align-items:center; justify-content:center; background:rgba(0,0,0,.45); padding:16px; }
      .po-modal { background:#fff; border-radius:14px; padding:24px; max-width:620px; width:100%; max-height:88vh; display:flex; flex-direction:column; box-shadow:0 20px 60px rgba(0,0,0,.25); font-family:inherit; }
      .po-modal-hd { display:flex; align-items:center; justify-content:space-between; margin-bottom:16px; }
      .po-modal-title { font-size:15px; font-weight:700; color:#1e293b; }
      .po-modal-close { background:none; border:none; font-size:18px; cursor:pointer; color:#64748b; }
      .po-modal-body { flex:1; overflow-y:auto; }
      .po-modal-ft { display:flex; gap:8px; margin-top:16px; justify-content:flex-end; }
      .po-detail-wrap { position:fixed; inset:0; z-index:99998; display:flex; align-items:flex-start; justify-content:flex-end; }
      .po-detail-backdrop { position:absolute; inset:0; background:rgba(0,0,0,.3); }
      .po-detail { position:relative; background:#fff; width:min(500px,100%); height:100%; overflow-y:auto; box-shadow:-4px 0 24px rgba(0,0,0,.15); padding:24px; }
    `;
    document.head.appendChild(s);
  }

  // ── View div ──────────────────────────────────────────────────────────────
  if (!document.getElementById('view-pantanir')) {
    const div = document.createElement('div');
    div.id = 'view-pantanir';
    div.className = 'view';
    div.innerHTML = '<div class="po-wrap"><div class="loading-state">Hleður pantanir…</div></div>';
    const ref = document.getElementById('view-birgdir') || document.getElementById('view-geymsla');
    ref ? ref.after(div) : document.body.appendChild(div);
  }

  // ── Nav button ────────────────────────────────────────────────────────────
  function injectNav() {
    const nav = document.querySelector('.view-nav');
    if (!nav || nav.querySelector('[data-view="pantanir"]')) return;
    const btn = document.createElement('button');
    btn.className = 'vnav-btn';
    btn.dataset.view = 'pantanir';
    btn.onclick = () => App.switchView('pantanir');
    btn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
        <line x1="3" y1="6" x2="21" y2="6"/>
        <path d="M16 10a4 4 0 01-8 0"/>
      </svg>
      <span>Pantanir</span>`;
    const ref = nav.querySelector('[data-view="birgdir"]') || nav.querySelector('[data-view="geymsla"]');
    ref ? ref.after(btn) : nav.appendChild(btn);
  }
  injectNav();
  new MutationObserver(injectNav).observe(document.body, { childList:true, subtree:true });

  // ── State ─────────────────────────────────────────────────────────────────
  let _orders = [];
  let _stockItems = []; // from birgdir for autocomplete
  let _editLines = []; // lines being edited in modal
  let _editId = null;

  // ── Load ──────────────────────────────────────────────────────────────────
  async function load() {
    const SB = getSB();
    const el = document.querySelector('#view-pantanir .po-wrap');
    if (!el) return;
    if (!SB) { el.innerHTML = '<div class="empty-state"><div class="es-icon">🛒</div><div class="es-title">Gagngrunnur ekki tengdur</div></div>'; return; }
    el.innerHTML = '<div class="loading-state">Hleður pantanir…</div>';

    const [ordRes, stockRes] = await Promise.all([
      SB.from('innkaupapantanir').select('*').order('created_at', { ascending:false }),
      SB.from('birgdir').select('id,nafn,eining,verd_an_vsk,birgi,magn,lagmark').order('nafn')
    ]);

    if (ordRes.error && ordRes.error.code === '42P01') {
      el.innerHTML = `<div style="padding:32px;max-width:560px">
        <div style="font-size:16px;font-weight:700;margin-bottom:10px">🛒 Pantanir — uppsetning vantar</div>
        <p style="font-size:13px;color:var(--ink3)">Búðu til töfluna í Supabase SQL Editor:</p>
        <pre style="background:var(--bg2);border-radius:8px;padding:14px;font-size:11px;overflow-x:auto">CREATE TABLE IF NOT EXISTS innkaupapantanir (
  id BIGSERIAL PRIMARY KEY, po_num TEXT,
  birgi TEXT, status TEXT DEFAULT 'drög',
  lines JSONB DEFAULT '[]', notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  sent_at TIMESTAMPTZ, received_at TIMESTAMPTZ
);</pre>
        <button class="btn btn-primary btn-sm" onclick="PurchaseOrders.load()" style="margin-top:12px">Reyna aftur</button>
      </div>`;
      return;
    }

    _orders = ordRes.data || [];
    _stockItems = stockRes.data || [];
    render();
  }

  // ── Render ────────────────────────────────────────────────────────────────
  function render() {
    const el = document.querySelector('#view-pantanir .po-wrap');
    if (!el) return;

    const byStatus = { 'drög':[], 'sent':[], 'móttekið':[] };
    _orders.forEach(o => { (byStatus[o.status] || byStatus['drög']).push(o); });

    const statusOrder = ['drög','sent','móttekið'];

    let html = `<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:10px">
      <div>
        <div style="font-size:19px;font-weight:600">🛒 Innkaupapantanir</div>
        <div style="font-size:13px;color:var(--ink3)">${_orders.length} pantanir</div>
      </div>
      <div style="display:flex;gap:8px">
        <button class="btn btn-outline btn-sm" onclick="PurchaseOrders._autoNew()">⚡ Lág-birgðir → Pöntun</button>
        <button class="btn btn-primary btn-sm" onclick="PurchaseOrders._openNew()">+ Ný pöntun</button>
      </div>
    </div>`;

    const allEmpty = statusOrder.every(s => !byStatus[s].length);
    if (allEmpty) {
      html += '<div class="empty-state"><div class="es-icon">🛒</div><div class="es-title">Engar pantanir</div><div class="es-sub">Smelltu á "+ Ný pöntun" til að hefja</div></div>';
    } else {
      statusOrder.forEach(status => {
        const orders = byStatus[status];
        if (!orders.length) return;
        html += `<div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--ink3);margin-bottom:8px;margin-top:18px">${STATUS_LABELS[status]} (${orders.length})</div>`;
        html += `<div class="tcard" style="margin-bottom:8px"><table class="dtbl"><thead><tr>
          <th>PO númer</th><th>Birgir</th><th>Línur</th><th>Heildarverð</th><th>Dagsetning</th><th></th>
        </tr></thead><tbody>`;
        orders.forEach(o => {
          const lines = Array.isArray(o.lines) ? o.lines : [];
          const total = lines.reduce((s,l) => s+(l.magn||0)*(l.verd_an_vsk||0), 0);
          html += `<tr>
            <td><strong>${esc(o.po_num||'—')}</strong></td>
            <td>${esc(o.birgi||'—')}</td>
            <td style="color:var(--ink3)">${lines.length} hlutir</td>
            <td>${total>0?fmtKr(total):'—'}</td>
            <td style="color:var(--ink3)">${o.created_at?new Date(o.created_at).toLocaleDateString('is-IS'):'—'}</td>
            <td><div style="display:flex;gap:4px;flex-wrap:wrap">
              <button class="btn btn-ghost btn-sm" onclick="PurchaseOrders._detail(${o.id})">Skoða</button>
              ${status==='drög'?`
                <button class="btn btn-ghost btn-sm" onclick="PurchaseOrders._send(${o.id})" style="color:#3b82f6">📧 Senda</button>
                <button class="btn btn-ghost btn-sm" onclick="PurchaseOrders._edit(${o.id})" title="Breyta">✎</button>
              `:''}
              ${status==='sent'?`<button class="btn btn-ghost btn-sm" onclick="PurchaseOrders._receive(${o.id})" style="color:#16a34a">✓ Móttekin</button>`:''}
              <button class="btn btn-ghost btn-sm" onclick="PurchaseOrders._delete(${o.id})" style="color:#dc2626">🗑</button>
            </div></td>
          </tr>`;
        });
        html += '</tbody></table></div>';
      });
    }
    el.innerHTML = html;
  }

  // ── New PO modal ──────────────────────────────────────────────────────────
  function _openNew(prefillLines) {
    _editId = null;
    _editLines = prefillLines || [{ nafn:'', magn:1, eining:'stk', verd_an_vsk:0, birgdir_id:null }];
    _showEditModal('Ný pöntun', '');
  }

  function _edit(id) {
    const o = _orders.find(x => x.id===id);
    if (!o) return;
    _editId = id;
    _editLines = Array.isArray(o.lines) ? JSON.parse(JSON.stringify(o.lines)) : [];
    if (!_editLines.length) _editLines.push({ nafn:'', magn:1, eining:'stk', verd_an_vsk:0, birgdir_id:null });
    _showEditModal('Breyta pöntun', o.birgi||'', o.notes||'');
  }

  function _showEditModal(title, birgi, notes) {
    document.getElementById('po-edit-modal')?.remove();
    const m = document.createElement('div');
    m.id = 'po-edit-modal';
    m.className = 'po-modal-wrap';
    m.onclick = e => { if(e.target===m) m.remove(); };
    m.innerHTML = `
      <div class="po-modal">
        <div class="po-modal-hd">
          <div class="po-modal-title">${title}</div>
          <button class="po-modal-close" onclick="document.getElementById('po-edit-modal')?.remove()">✕</button>
        </div>
        <div class="po-modal-body">
          <div class="fg" style="margin-bottom:12px">
            <label class="fl">Birgir</label>
            <input class="fi" id="po-birgi" placeholder="Nafn birgis" value="${esc(birgi)}" list="po-birgi-list">
            <datalist id="po-birgi-list">
              ${[...new Set(_stockItems.map(i=>i.birgi||'').filter(Boolean))].map(b=>`<option value="${esc(b)}">`).join('')}
            </datalist>
          </div>
          <div style="font-size:12px;font-weight:600;color:var(--ink3);text-transform:uppercase;letter-spacing:.04em;margin-bottom:8px">Línur</div>
          <div id="po-lines-container"></div>
          <button class="btn btn-outline btn-sm" onclick="PurchaseOrders._addLine()" style="margin-top:6px">+ Bæta við línu</button>
          <div class="fg" style="margin-top:14px">
            <label class="fl">Athugasemdir</label>
            <textarea class="fi" id="po-notes" rows="2" style="resize:vertical">${esc(notes||'')}</textarea>
          </div>
        </div>
        <div class="po-modal-ft">
          <button class="btn btn-outline" onclick="document.getElementById('po-edit-modal')?.remove()">Hætta við</button>
          <button class="btn btn-primary" onclick="PurchaseOrders._saveEdit()">Vista</button>
        </div>
      </div>`;
    document.body.appendChild(m);
    _renderLines();
  }

  function _renderLines() {
    const c = document.getElementById('po-lines-container');
    if (!c) return;
    c.innerHTML = _editLines.map((l,i) => `
      <div class="po-line-row">
        <input class="po-line-inp" value="${esc(l.nafn||'')}" placeholder="Nafn vöru"
          oninput="PurchaseOrders._lineVal(${i},'nafn',this.value)"
          list="po-stock-list-${i}">
        <datalist id="po-stock-list-${i}">
          ${_stockItems.map(s=>`<option value="${esc(s.nafn)}" data-id="${s.id}">`).join('')}
        </datalist>
        <input class="po-line-inp" type="number" min="0" step="0.1" value="${l.magn||1}" placeholder="Magn"
          oninput="PurchaseOrders._lineVal(${i},'magn',parseFloat(this.value)||0)">
        <input class="po-line-inp" value="${esc(l.eining||'stk')}" placeholder="Eining"
          oninput="PurchaseOrders._lineVal(${i},'eining',this.value)">
        <input class="po-line-inp" type="number" min="0" step="1" value="${l.verd_an_vsk||0}" placeholder="Verð"
          oninput="PurchaseOrders._lineVal(${i},'verd_an_vsk',parseFloat(this.value)||0)">
        <button class="btn btn-ghost btn-sm" onclick="PurchaseOrders._removeLine(${i})" style="color:#dc2626;padding:4px">✕</button>
      </div>`).join('') + `<div style="font-size:10px;color:var(--ink3);padding-left:2px">Nafn · Magn · Eining · Verð án VSK</div>`;
  }

  function _addLine()          { _editLines.push({ nafn:'', magn:1, eining:'stk', verd_an_vsk:0, birgdir_id:null }); _renderLines(); }
  function _removeLine(i)      { _editLines.splice(i,1); if(!_editLines.length)_editLines.push({nafn:'',magn:1,eining:'stk',verd_an_vsk:0}); _renderLines(); }
  function _lineVal(i, f, v)   {
    if (!_editLines[i]) return;
    _editLines[i][f] = v;
    // Auto-link to birgdir_id when nafn matches
    if (f === 'nafn') {
      const match = _stockItems.find(s => s.nafn === v);
      if (match) {
        _editLines[i].birgdir_id = match.id;
        if (!_editLines[i].eining) _editLines[i].eining = match.eining||'stk';
        if (!_editLines[i].verd_an_vsk && match.verd_an_vsk) _editLines[i].verd_an_vsk = match.verd_an_vsk;
      } else {
        _editLines[i].birgdir_id = null;
      }
    }
  }

  async function _saveEdit() {
    const birgi  = document.getElementById('po-birgi')?.value.trim() || '';
    const notes  = document.getElementById('po-notes')?.value.trim() || null;
    const lines  = _editLines.filter(l => l.nafn);
    const SB = getSB();
    if (!SB) return;
    if (_editId) {
      await SB.from('innkaupapantanir').update({ birgi, notes, lines }).eq('id', _editId);
    } else {
      await SB.from('innkaupapantanir').insert({ po_num: poNum(), birgi, notes, lines, status:'drög' });
    }
    document.getElementById('po-edit-modal')?.remove();
    if(window.Toast) Toast.show('✓ Pöntun vistuð');
    load();
  }

  // ── Auto-create PO from low-stock ─────────────────────────────────────────
  function _autoNew() {
    const low = _stockItems.filter(i => i.magn <= i.lagmark && i.lagmark > 0);
    if (!low.length) { if(window.Toast) Toast.show('Allar birgðir yfir lágmarki ✓'); return; }
    const lines = low.map(i => ({
      nafn:        i.nafn,
      magn:        Math.max(1, (i.lagmark||5)*2 - (i.magn||0)), // order up to 2× minimum
      eining:      i.eining||'stk',
      verd_an_vsk: i.verd_an_vsk||0,
      birgdir_id:  i.id
    }));
    _openNew(lines);
  }

  // ── Detail drawer ─────────────────────────────────────────────────────────
  function _detail(id) {
    const o = _orders.find(x => x.id===id);
    if (!o) return;
    document.getElementById('po-detail-panel')?.remove();
    const lines = Array.isArray(o.lines) ? o.lines : [];
    const total = lines.reduce((s,l) => s+(l.magn||0)*(l.verd_an_vsk||0), 0);
    const chip = `<span class="po-status-chip" style="background:${STATUS_BG[o.status]||'#f1f5f9'};color:${STATUS_COLORS[o.status]||'#64748b'}">${STATUS_LABELS[o.status]||o.status}</span>`;

    const lineRows = lines.map(l => `
      <tr>
        <td>${esc(l.nafn||'')}</td>
        <td style="text-align:right">${l.magn||0}</td>
        <td>${esc(l.eining||'stk')}</td>
        <td style="text-align:right">${l.verd_an_vsk?fmtKr(l.verd_an_vsk):'—'}</td>
        <td style="text-align:right">${l.verd_an_vsk&&l.magn?fmtKr((l.magn||0)*(l.verd_an_vsk||0)):'—'}</td>
      </tr>`).join('');

    const wrap = document.createElement('div');
    wrap.id = 'po-detail-panel';
    wrap.className = 'po-detail-wrap';
    wrap.innerHTML = `
      <div class="po-detail-backdrop" onclick="document.getElementById('po-detail-panel')?.remove()"></div>
      <div class="po-detail">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">
          <div>
            <div style="font-size:16px;font-weight:700">${esc(o.po_num||'—')}</div>
            <div style="margin-top:4px">${chip}</div>
          </div>
          <button onclick="document.getElementById('po-detail-panel')?.remove()" style="background:none;border:none;font-size:18px;cursor:pointer;color:#64748b">✕</button>
        </div>
        <div style="font-size:13px;margin-bottom:16px">
          <div><span style="color:var(--ink3)">Birgir:</span> <strong>${esc(o.birgi||'—')}</strong></div>
          <div><span style="color:var(--ink3)">Dagsetning:</span> ${o.created_at?new Date(o.created_at).toLocaleDateString('is-IS'):'—'}</div>
          ${o.sent_at?`<div><span style="color:var(--ink3)">Sent:</span> ${new Date(o.sent_at).toLocaleDateString('is-IS')}</div>`:''}
          ${o.received_at?`<div><span style="color:var(--ink3)">Móttekið:</span> ${new Date(o.received_at).toLocaleDateString('is-IS')}</div>`:''}
        </div>
        <table class="dtbl" style="margin-bottom:14px">
          <thead><tr><th>Nafn</th><th>Magn</th><th>Ein.</th><th>Eðl. verð</th><th>Samtals</th></tr></thead>
          <tbody>${lineRows||'<tr><td colspan="5" style="text-align:center;color:#94a3b8">Engar línur</td></tr>'}</tbody>
          <tfoot><tr><td colspan="4" style="text-align:right;font-weight:700;font-size:12px;padding:8px 8px 4px">Samtals:</td>
          <td style="font-weight:700;padding:8px 8px 4px;text-align:right">${total?fmtKr(total):'—'}</td></tr></tfoot>
        </table>
        ${o.notes?`<div style="background:var(--bg2);border-radius:8px;padding:10px 12px;font-size:13px;margin-bottom:16px"><strong>Athugasemdir:</strong><br>${esc(o.notes)}</div>`:''}
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          ${o.status==='drög'?`<button class="btn btn-outline btn-sm" onclick="document.getElementById('po-detail-panel')?.remove();PurchaseOrders._send(${o.id})">📧 Senda birgja</button>`:''}
          ${o.status==='sent'?`<button class="btn btn-primary btn-sm" onclick="document.getElementById('po-detail-panel')?.remove();PurchaseOrders._receive(${o.id})">✓ Móttekin</button>`:''}
          <button class="btn btn-outline btn-sm" onclick="PurchaseOrders._printPO(${o.id})">🖨 Prenta</button>
        </div>
      </div>`;
    document.body.appendChild(wrap);
  }

  // ── Send (email supplier) ─────────────────────────────────────────────────
  async function _send(id) {
    const o = _orders.find(x => x.id===id);
    if (!o) return;
    const SB = getSB();
    const lines = Array.isArray(o.lines)?o.lines:[];
    const linesTxt = lines.map(l => `  • ${l.nafn||'?'} — ${l.magn||0} ${l.eining||'stk'}${l.verd_an_vsk?' @ '+fmtKr(l.verd_an_vsk):''}`).join('\n');
    const body = `Góðan dag,\n\nSlökkvitæki ehf er að panta eftirfarandi:\n\n${linesTxt}\n\nPöntunarnúmer: ${o.po_num||'—'}\n\nVinsamlegast staðfestið móttöku.\n\nKveðja,\nSlökkvitæki ehf`;
    const subject = `Innkaupapöntun ${o.po_num||''} frá Slökkvitæki ehf`;
    window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, '_blank');
    if (SB) await SB.from('innkaupapantanir').update({ status:'sent', sent_at:new Date().toISOString() }).eq('id',id);
    if(window.Toast) Toast.show('📧 Pöntun merkt sem sent');
    load();
  }

  // ── Receive — auto-restock birgdir ────────────────────────────────────────
  async function _receive(id) {
    if (!await Confirm.show('Merkja sem móttekið og uppfæra birgðir?')) return;
    const o = _orders.find(x => x.id===id);
    if (!o) return;
    const SB = getSB();
    if (!SB) return;
    const lines = Array.isArray(o.lines)?o.lines:[];
    // Fetch current magn for all linked items
    const linkedIds = lines.filter(l=>l.birgdir_id).map(l=>l.birgdir_id);
    let currentStock = {};
    if (linkedIds.length) {
      const { data } = await SB.from('birgdir').select('id,magn').in('id', linkedIds);
      (data||[]).forEach(r => { currentStock[r.id] = r.magn||0; });
    }
    // Update each item
    await Promise.all(lines.filter(l=>l.birgdir_id).map(l =>
      SB.from('birgdir').update({ magn: (currentStock[l.birgdir_id]||0) + (l.magn||0) }).eq('id', l.birgdir_id)
    ));
    await SB.from('innkaupapantanir').update({ status:'móttekið', received_at:new Date().toISOString() }).eq('id',id);
    if(window.Toast) Toast.show('✓ Pöntun móttekið — birgðir uppfærðar');
    load();
  }

  // ── Delete ────────────────────────────────────────────────────────────────
  async function _delete(id) {
    const o = _orders.find(x=>x.id===id);
    if (!await Confirm.show('Eyða pöntun '+((o?.po_num)||id)+'?')) return;
    const SB = getSB();
    if (SB) await SB.from('innkaupapantanir').delete().eq('id',id);
    if(window.Toast) Toast.show('Pöntun eytt');
    load();
  }

  // ── Simple print ─────────────────────────────────────────────────────────
  function _printPO(id) {
    const o = _orders.find(x=>x.id===id);
    if (!o) return;
    const lines = Array.isArray(o.lines)?o.lines:[];
    const rows = lines.map(l=>`<tr><td>${esc(l.nafn||'')}</td><td>${l.magn||0}</td><td>${esc(l.eining||'stk')}</td><td>${l.verd_an_vsk?fmtKr(l.verd_an_vsk):'—'}</td></tr>`).join('');
    const win = window.open('','_blank','width=700,height=600');
    win.document.write(`<!DOCTYPE html><html><head><title>Pöntun ${esc(o.po_num||'')}</title>
    <style>body{font-family:Arial,sans-serif;padding:24px;color:#1e293b}table{width:100%;border-collapse:collapse}th,td{border:1px solid #e2e8f0;padding:8px}th{background:#f8fafc}h1{font-size:16px}h2{font-size:13px;color:#64748b;font-weight:normal}</style></head>
    <body><h1>Innkaupapöntun — ${esc(o.po_num||'—')}</h1>
    <h2>Birgir: ${esc(o.birgi||'—')} &nbsp;·&nbsp; Dagsetning: ${new Date(o.created_at).toLocaleDateString('is-IS')}</h2>
    <br><table><thead><tr><th>Nafn</th><th>Magn</th><th>Eining</th><th>Eðl. verð</th></tr></thead><tbody>${rows}</tbody></table>
    ${o.notes?`<p style="margin-top:16px"><strong>Athugasemdir:</strong> ${esc(o.notes)}</p>`:''}
    <p style="margin-top:24px;font-size:11px;color:#94a3b8">Slökkvitæki ehf</p>
    <script>window.print()</script></body></html>`);
    win.document.close();
  }

  // ── SwitchView patch ──────────────────────────────────────────────────────
  (function patchSwitchView() {
    if (typeof App==='undefined') { setTimeout(patchSwitchView,200); return; }
    if (App.switchView?._poPatch) return;
    const orig = App.switchView.bind(App);
    App.switchView = function(v) {
      if (v==='pantanir') {
        document.querySelectorAll('.view').forEach(el=>el.classList.remove('active'));
        document.querySelectorAll('.vnav-btn').forEach(el=>el.classList.toggle('active', el.dataset.view==='pantanir'));
        const vEl = document.getElementById('view-pantanir');
        if (vEl) vEl.classList.add('active');
        document.dispatchEvent(new CustomEvent('view-shown',{detail:'pantanir'}));
        return;
      }
      orig(v);
    };
    App.switchView._poPatch = true;
  })();

  document.addEventListener('view-shown', e => { if (e.detail==='pantanir') load(); });

  window.PurchaseOrders = { load, _openNew, _autoNew, _edit, _addLine, _removeLine, _lineVal, _saveEdit, _send, _receive, _delete, _detail, _printPO };
  console.log('[purchase-orders] installed');
})();
/* === END PURCHASE ORDERS === */
