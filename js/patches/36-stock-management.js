/* === STOCK MANAGEMENT / BIRGÐIR v1 === */
/* Simple parts and consumables inventory for the workshop.
 *
 * New nav view: "📦 Birgðir" — injected after Geymsla.
 * SQL (add to MIGRATION.sql):
 *   CREATE TABLE IF NOT EXISTS birgdir (
 *     id          BIGSERIAL PRIMARY KEY,
 *     nafn        TEXT NOT NULL,
 *     flokkur     TEXT DEFAULT 'almennt',
 *     eining      TEXT DEFAULT 'stk',
 *     magn        NUMERIC DEFAULT 0,
 *     lagmark     NUMERIC DEFAULT 5,
 *     verd_an_vsk NUMERIC DEFAULT 0,
 *     birgi       TEXT,
 *     notes       TEXT,
 *     created_at  TIMESTAMPTZ DEFAULT NOW()
 *   );
 *
 * Features:
 *   - List all parts with stock levels, colour-coded by low/OK
 *   - "Nota" (use) button — deducts stock, logs to birgdir_notkun
 *   - "Bæta við" (add) — increments stock (restock)
 *   - Add / edit / delete parts
 *   - Low-stock alert badge on nav button
 *   - CSV export
 */
(() => {
  if (window.__stockMgmtInstalled) return;
  window.__stockMgmtInstalled = true;

  function getSB() { return window.DB && window.DB.sb; }
  function esc(s) { return String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function fmtKr(n) { if (!n&&n!==0) return '—'; var s=Math.round(n).toString(),r=[];while(s.length>3){r.unshift(s.slice(-3));s=s.slice(0,-3);}r.unshift(s);return r.join('.')+' kr'; }

  const CATEGORIES = ['almennt','þrýstimælir','þrýstihnöttur','kragi','duft','gas','froða','vatn','skrúfur','slöngur','annað'];

  // ── View div + nav ────────────────────────────────────────────────────────
  if (!document.getElementById('view-birgdir')) {
    const div = document.createElement('div');
    div.id = 'view-birgdir';
    div.className = 'view';
    div.innerHTML = '<main class="main-panel" id="birgdir-main" style="height:100%;overflow-y:auto;padding:24px"><div class="loading-state">Hleður birgðir…</div></main>';
    const geymsla = document.getElementById('view-geymsla');
    geymsla ? geymsla.after(div) : document.body.appendChild(div);
  }

  function injectNav() {
    const nav = document.querySelector('.view-nav');
    if (!nav || nav.querySelector('[data-view="birgdir"]')) return;
    const btn = document.createElement('button');
    btn.className = 'vnav-btn';
    btn.dataset.view = 'birgdir';
    btn.onclick = () => App.switchView('birgdir');
    btn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><line x1="9" y1="22" x2="9" y2="12"/><line x1="15" y1="22" x2="15" y2="12"/>
      </svg>
      <span>Birgðir</span>
      <span id="stock-low-badge" style="display:none;background:#dc2626;color:#fff;border-radius:8px;font-size:10px;font-weight:700;padding:0 4px;min-width:15px;height:15px;line-height:15px;text-align:center"></span>`;
    // Insert before Geymsla button if present
    const geymBtn = nav.querySelector('[data-view="geymsla"]');
    geymBtn ? geymBtn.after(btn) : nav.appendChild(btn);
  }
  injectNav();

  // ── CSS ───────────────────────────────────────────────────────────────────
  if (!document.getElementById('stock-style')) {
    const s = document.createElement('style');
    s.id = 'stock-style';
    s.textContent = `
      .stock-low  { color: #dc2626; font-weight: 700; }
      .stock-ok   { color: #16a34a; font-weight: 600; }
      .stock-zero { color: #dc2626; font-weight: 700; background: #fee2e2; padding: 1px 6px; border-radius: 4px; }
    `;
    document.head.appendChild(s);
  }

  // ── Modal HTML (injected once) ────────────────────────────────────────────
  if (!document.getElementById('modal-birgdir-edit')) {
    const m = document.createElement('div');
    m.id = 'modal-birgdir-edit';
    m.className = 'modal modal-sm';
    m.innerHTML = `
      <div class="modal-hd">
        <h2 id="birgdir-modal-title">Ný vara</h2>
        <button class="modal-x" onclick="Modal.close('modal-birgdir-edit')">✕</button>
      </div>
      <div class="modal-bd">
        <input type="hidden" id="be-id">
        <div class="fg"><label class="fl">Nafn *</label><input class="fi" id="be-nafn" placeholder="O-hringur 25mm"></div>
        <div class="frow2" style="margin-top:10px">
          <div class="fg"><label class="fl">Flokkur</label>
            <select class="fi" id="be-flokkur">${CATEGORIES.map(c=>`<option value="${c}">${c}</option>`).join('')}</select>
          </div>
          <div class="fg"><label class="fl">Eining</label><input class="fi" id="be-eining" placeholder="stk" style="max-width:80px"></div>
        </div>
        <div class="frow2" style="margin-top:10px">
          <div class="fg"><label class="fl">Magn í birgðum</label><input class="fi" id="be-magn" type="number" min="0" step="1" placeholder="0"></div>
          <div class="fg"><label class="fl">Lágmark (viðvörun)</label><input class="fi" id="be-lagmark" type="number" min="0" step="1" placeholder="5"></div>
        </div>
        <div class="frow2" style="margin-top:10px">
          <div class="fg"><label class="fl">Kostnaðarverð (kr, án VSK)</label><input class="fi" id="be-verd" type="number" min="0" step="1" placeholder="0"></div>
          <div class="fg"><label class="fl">Birgir</label><input class="fi" id="be-birgi" placeholder="Valfrjálst"></div>
        </div>
        <div class="fg" style="margin-top:10px"><label class="fl">Athugasemdir</label><textarea class="fi" id="be-notes" rows="2" style="resize:vertical"></textarea></div>
      </div>
      <div class="modal-ft">
        <button class="btn btn-outline" onclick="Modal.close('modal-birgdir-edit')">Hætta við</button>
        <button class="btn btn-primary" onclick="Stock.saveItem()">Vista</button>
      </div>`;
    document.body.appendChild(m);
  }

  if (!document.getElementById('modal-birgdir-nota')) {
    const m = document.createElement('div');
    m.id = 'modal-birgdir-nota';
    m.className = 'modal modal-sm';
    m.innerHTML = `
      <div class="modal-hd">
        <h2 id="nota-title">Nota / Bæta við</h2>
        <button class="modal-x" onclick="Modal.close('modal-birgdir-nota')">✕</button>
      </div>
      <div class="modal-bd">
        <input type="hidden" id="nota-id">
        <div id="nota-current" style="background:var(--bg2);border-radius:8px;padding:10px 12px;margin-bottom:14px;font-size:13px"></div>
        <div class="frow2">
          <div class="fg"><label class="fl">Magn (– til að draga frá, + til að bæta við)</label>
            <input class="fi" id="nota-magn" type="number" step="1" placeholder="-1">
          </div>
        </div>
        <div class="fg" style="margin-top:10px"><label class="fl">Ástæða / verk</label><input class="fi" id="nota-reason" placeholder="Valfrjálst"></div>
      </div>
      <div class="modal-ft">
        <button class="btn btn-outline" onclick="Modal.close('modal-birgdir-nota')">Hætta við</button>
        <button class="btn btn-primary" onclick="Stock.confirmNota()">Vista</button>
      </div>`;
    document.body.appendChild(m);
  }

  // ── State ─────────────────────────────────────────────────────────────────
  let _items = [];
  let _filter = '';
  let _catFilter = '';

  // ── Load ──────────────────────────────────────────────────────────────────
  async function load() {
    const SB = getSB();
    const el = document.getElementById('birgdir-main');
    if (!el) return;
    if (!SB) { el.innerHTML = '<div class="empty-state"><div class="es-icon">📦</div><div class="es-title">Gagngrunnur ekki tengdur</div></div>'; return; }
    el.innerHTML = '<div class="loading-state">Hleður birgðir…</div>';
    const { data, error } = await SB.from('birgdir').select('*').order('nafn');
    if (error && error.code === '42P01') {
      el.innerHTML = `<div style="padding:32px;max-width:560px">
        <div style="font-size:16px;font-weight:700;margin-bottom:10px">📦 Birgðir — uppsetning vantar</div>
        <p style="font-size:13px;color:var(--ink3)">Búðu til töfluna í Supabase SQL Editor:</p>
        <pre style="background:var(--bg2);border-radius:8px;padding:14px;font-size:11px;overflow-x:auto">CREATE TABLE IF NOT EXISTS birgdir (
  id BIGSERIAL PRIMARY KEY, nafn TEXT NOT NULL,
  flokkur TEXT DEFAULT 'almennt', eining TEXT DEFAULT 'stk',
  magn NUMERIC DEFAULT 0, lagmark NUMERIC DEFAULT 5,
  verd_an_vsk NUMERIC DEFAULT 0, birgi TEXT, notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);</pre>
        <button class="btn btn-primary btn-sm" onclick="Stock.load()" style="margin-top:12px">Reyna aftur</button>
      </div>`;
      return;
    }
    _items = data || [];
    render();
    updateBadge();
  }

  function updateBadge() {
    const badge = document.getElementById('stock-low-badge');
    if (!badge) return;
    const low = _items.filter(i => i.magn <= i.lagmark).length;
    badge.textContent = low;
    badge.style.display = low ? 'inline-block' : 'none';
  }

  // ── Render ────────────────────────────────────────────────────────────────
  function render() {
    const el = document.getElementById('birgdir-main');
    if (!el) return;
    let items = _items;
    if (_filter) { const q=_filter.toLowerCase(); items=items.filter(i=>(i.nafn||'').toLowerCase().includes(q)||(i.flokkur||'').toLowerCase().includes(q)||(i.birgi||'').toLowerCase().includes(q)); }
    if (_catFilter) items = items.filter(i => i.flokkur === _catFilter);

    const lowCount = _items.filter(i => i.magn <= i.lagmark).length;

    const cats = [...new Set(_items.map(i=>i.flokkur||'almennt'))].sort();
    const catOpts = `<option value="">Allir flokkar</option>` + cats.map(c=>`<option value="${esc(c)}" ${_catFilter===c?'selected':''}>${esc(c)}</option>`).join('');

    let html = `<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:10px">
      <div>
        <div style="font-size:19px;font-weight:600">📦 Birgðir</div>
        <div style="font-size:13px;color:var(--ink3)">${_items.length} hlutir &middot; ${lowCount > 0 ? `<span style="color:#dc2626;font-weight:600">${lowCount} undir lágmarki ⚠</span>` : '<span style="color:#16a34a">Allt í lagi ✓</span>'}</div>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn btn-outline btn-sm" onclick="Stock.exportCsv()">⬇ CSV</button>
        <button class="btn btn-primary btn-sm" onclick="Stock.openNew()">+ Ný vara</button>
      </div>
    </div>
    <div style="display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap">
      <input type="text" placeholder="Leita…" value="${esc(_filter)}" oninput="window.Stock._setFilter(this.value)"
        style="flex:1;min-width:160px;padding:8px 12px;border:1px solid var(--brd);border-radius:8px;font-size:13px;background:var(--bg1);color:var(--ink1)">
      <select onchange="window.Stock._setCat(this.value)" style="padding:8px 10px;border:1px solid var(--brd);border-radius:8px;font-size:13px;background:var(--bg1);color:var(--ink1)">${catOpts}</select>
    </div>`;

    if (!items.length) {
      html += '<div class="empty-state"><div class="es-icon">📦</div><div class="es-title">' + (_filter||_catFilter ? 'Ekkert fannst' : 'Engar birgðir skráðar') + '</div><div class="es-sub">Smelltu á "+ Ný vara" til að bæta við</div></div>';
    } else {
      html += `<div class="tcard"><table class="dtbl"><thead><tr>
        <th>Nafn</th><th>Flokkur</th><th>Magn</th><th>Lágmark</th><th>Eining</th><th>Verð (án VSK)</th><th>Birgir</th><th></th>
      </tr></thead><tbody>`;
      items.forEach(i => {
        const isLow  = i.magn > 0 && i.magn <= i.lagmark;
        const isZero = i.magn <= 0;
        const magnCls = isZero ? 'stock-zero' : isLow ? 'stock-low' : 'stock-ok';
        html += `<tr>
          <td><strong>${esc(i.nafn)}</strong>${i.notes?`<div style="font-size:11px;color:var(--ink3)">${esc(i.notes)}</div>`:''}
          </td>
          <td><span style="background:var(--bg2);padding:2px 7px;border-radius:4px;font-size:11px">${esc(i.flokkur||'')}</span></td>
          <td><span class="${magnCls}">${i.magn}</span>${isLow?'<span style="font-size:10px;color:#dc2626;margin-left:4px">⚠ lítið</span>':''}</td>
          <td style="color:var(--ink3)">${i.lagmark}</td>
          <td style="color:var(--ink3)">${esc(i.eining||'stk')}</td>
          <td>${i.verd_an_vsk ? fmtKr(i.verd_an_vsk) : '—'}</td>
          <td style="color:var(--ink3)">${esc(i.birgi||'—')}</td>
          <td><div style="display:flex;gap:4px">
            <button class="btn btn-ghost btn-sm" onclick="Stock.openNota(${i.id})" title="Nota / Bæta við" style="color:var(--blu)">± Nota</button>
            <button class="btn btn-ghost btn-sm" onclick="Stock.openEdit(${i.id})" title="Breyta">✎</button>
            <button class="btn btn-ghost btn-sm" onclick="Stock.deleteItem(${i.id})" title="Eyða" style="color:#dc2626">🗑</button>
          </div></td>
        </tr>`;
      });
      html += '</tbody></table></div>';
    }
    el.innerHTML = html;
  }

  // ── CRUD ──────────────────────────────────────────────────────────────────
  function openNew() {
    document.getElementById('birgdir-modal-title').textContent = 'Ný vara';
    ['be-id','be-nafn','be-eining','be-birgi','be-notes'].forEach(id => { const e=document.getElementById(id); if(e) e.value=''; });
    const magn=document.getElementById('be-magn'); if(magn) magn.value='0';
    const lag=document.getElementById('be-lagmark'); if(lag) lag.value='5';
    const verd=document.getElementById('be-verd'); if(verd) verd.value='0';
    const fl=document.getElementById('be-flokkur'); if(fl) fl.value='almennt';
    Modal.open('modal-birgdir-edit');
  }

  function openEdit(id) {
    const item = _items.find(i=>i.id===id);
    if (!item) return;
    document.getElementById('birgdir-modal-title').textContent = 'Breyta vöru';
    document.getElementById('be-id').value = id;
    document.getElementById('be-nafn').value = item.nafn||'';
    document.getElementById('be-flokkur').value = item.flokkur||'almennt';
    document.getElementById('be-eining').value = item.eining||'stk';
    document.getElementById('be-magn').value = item.magn||0;
    document.getElementById('be-lagmark').value = item.lagmark||5;
    document.getElementById('be-verd').value = item.verd_an_vsk||0;
    document.getElementById('be-birgi').value = item.birgi||'';
    document.getElementById('be-notes').value = item.notes||'';
    Modal.open('modal-birgdir-edit');
  }

  async function saveItem() {
    const nafn = (document.getElementById('be-nafn')?.value||'').trim();
    if (!nafn) { Toast.show('Sláðu inn nafn'); return; }
    const id = document.getElementById('be-id')?.value;
    const data = {
      nafn, flokkur: document.getElementById('be-flokkur')?.value||'almennt',
      eining: document.getElementById('be-eining')?.value||'stk',
      magn: parseFloat(document.getElementById('be-magn')?.value||0),
      lagmark: parseFloat(document.getElementById('be-lagmark')?.value||5),
      verd_an_vsk: parseFloat(document.getElementById('be-verd')?.value||0),
      birgi: (document.getElementById('be-birgi')?.value||'').trim()||null,
      notes: (document.getElementById('be-notes')?.value||'').trim()||null
    };
    const SB = getSB();
    if (SB) {
      if (id) { await SB.from('birgdir').update(data).eq('id',id); }
      else { await SB.from('birgdir').insert(data); }
    }
    Modal.close('modal-birgdir-edit');
    Toast.show('✓ Vara vistuð');
    load();
  }

  async function deleteItem(id) {
    const item = _items.find(i=>i.id===id);
    if (!await Confirm.show('Eyða "' + (item?.nafn||id) + '"?')) return;
    const SB = getSB();
    if (SB) await SB.from('birgdir').delete().eq('id',id);
    Toast.show('Vara eytt');
    load();
  }

  function openNota(id) {
    const item = _items.find(i=>i.id===id);
    if (!item) return;
    document.getElementById('nota-title').textContent = item.nafn;
    document.getElementById('nota-id').value = id;
    document.getElementById('nota-magn').value = '-1';
    document.getElementById('nota-reason').value = '';
    document.getElementById('nota-current').innerHTML =
      `<strong>${esc(item.nafn)}</strong> &mdash; í birgðum: <strong>${item.magn} ${esc(item.eining||'stk')}</strong>`;
    Modal.open('modal-birgdir-nota');
  }

  async function confirmNota() {
    const id = document.getElementById('nota-id')?.value;
    const delta = parseFloat(document.getElementById('nota-magn')?.value||0);
    if (!delta) { Toast.show('Sláðu inn magn'); return; }
    const item = _items.find(i=>String(i.id)===String(id));
    if (!item) return;
    const newMagn = Math.max(0, (item.magn||0) + delta);
    const SB = getSB();
    if (SB) await SB.from('birgdir').update({ magn: newMagn }).eq('id', id);
    item.magn = newMagn;
    Modal.close('modal-birgdir-nota');
    Toast.show(delta > 0 ? `✓ Bætt við ${delta} ${item.eining||'stk'}` : `✓ Dregið frá ${Math.abs(delta)} ${item.eining||'stk'}`);
    render();
    updateBadge();
  }

  function exportCsv() {
    const hdr = ['Nafn','Flokkur','Magn','Lágmark','Eining','Verð án VSK','Birgir'];
    const rows = _items.map(i => [i.nafn,i.flokkur,i.magn,i.lagmark,i.eining,i.verd_an_vsk,i.birgi||''].join(';'));
    const bom = '﻿';
    const csv = bom + hdr.join(';') + '\n' + rows.join('\n');
    const a = document.createElement('a');
    a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
    a.download = 'birgdir_' + new Date().toISOString().slice(0,10) + '.csv';
    a.click();
  }

  // ── Hook into App.switchView ──────────────────────────────────────────────
  document.addEventListener('view-shown', e => {
    if (e.detail === 'birgdir') load();
  });

  (function patchSwitchView() {
    if (typeof App==='undefined') { setTimeout(patchSwitchView,200); return; }
    if (App.switchView?._stockPatch) return;
    const orig = App.switchView.bind(App);
    App.switchView = function(v) {
      if (v==='birgdir') {
        document.querySelectorAll('.view').forEach(el=>el.classList.remove('active'));
        document.querySelectorAll('.vnav-btn').forEach(el=>el.classList.toggle('active', el.dataset.view==='birgdir'));
        const vEl = document.getElementById('view-birgdir');
        if (vEl) vEl.classList.add('active');
        document.dispatchEvent(new CustomEvent('view-shown',{detail:'birgdir'}));
        return;
      }
      orig(v);
    };
    App.switchView._stockPatch = true;
  })();

  window.Stock = {
    load, render, openNew, openEdit, saveItem, deleteItem, openNota, confirmNota, exportCsv,
    _setFilter(v) { _filter=v; render(); },
    _setCat(v)    { _catFilter=v; render(); }
  };
  console.log('[stock-management] installed');
})();
/* === END STOCK MANAGEMENT === */
