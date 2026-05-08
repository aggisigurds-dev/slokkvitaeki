/* === FIELD INSPECTION FORM v1 === */
/* Digital inspection form for field technicians.
 *
 * New nav view: "📋 Skoðun" — injected after Þjónustuáætlun / Birgðir.
 *
 * Flow:
 *   1. Pick company / customer (searched from þjonustutaeki)
 *   2. Enter technician name (saved to localStorage)
 *   3. For each unit: tick pressure / weight / pin checks, set result, set next_insp date
 *   4. "Vista skoðun" → writes last_insp + next_insp + notes back to þjonustutaeki
 *   5. Offer to print Þjónustuvottorð via ServiceCert (patch 35)
 *
 * No new SQL tables required — writes to existing þjonustutaeki columns.
 */
(() => {
  if (window.__inspFormInstalled) return;
  window.__inspFormInstalled = true;

  function getSB() { return window.DB && window.DB.sb; }
  function esc(s) { return String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function todayISO() { const d=new Date(); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }
  function addYearISO(iso) { const d=iso?new Date(iso):new Date(); d.setFullYear(d.getFullYear()+1); return d.toISOString().slice(0,10); }
  function fmtDate(iso) {
    if(!iso)return'';
    const d=new Date(iso);
    return d.getDate()+'. '+['jan','feb','mar','apr','maí','jún','júl','ágú','sep','okt','nóv','des'][d.getMonth()]+' '+d.getFullYear();
  }

  // ── CSS ───────────────────────────────────────────────────────────────────
  if (!document.getElementById('inspform-style')) {
    const s = document.createElement('style');
    s.id = 'inspform-style';
    s.textContent = `
      #view-inspform { background:var(--bg2,#f8fafc); overflow-y:auto; }
      .ifm-wrap { max-width:780px; margin:0 auto; padding:24px 20px 48px; }
      .ifm-step { background:var(--bg1,#fff); border:1px solid var(--brd,#e2e8f0); border-radius:12px; padding:20px 24px; margin-bottom:16px; }
      .ifm-step-title { font-size:14px; font-weight:700; color:var(--ink1,#1e293b); margin-bottom:14px; }
      .ifm-co-search { width:100%; box-sizing:border-box; padding:10px 14px; border:1px solid var(--brd,#e2e8f0); border-radius:8px; font:inherit; font-size:14px; background:var(--bg1,#fff); color:var(--ink1,#1e293b); }
      .ifm-co-list { max-height:220px; overflow-y:auto; border:1px solid var(--brd,#e2e8f0); border-radius:8px; margin-top:8px; }
      .ifm-co-row { padding:10px 14px; cursor:pointer; font-size:13px; border-bottom:1px solid var(--bg2,#f1f5f9); }
      .ifm-co-row:last-child { border-bottom:none; }
      .ifm-co-row:hover { background:var(--bg2,#f8fafc); }
      .ifm-co-row.ifm-sel { background:#eff6ff; color:#1d4ed8; font-weight:600; }
      .ifm-unit-card { border:1px solid var(--brd,#e2e8f0); border-radius:8px; margin-bottom:12px; overflow:hidden; }
      .ifm-unit-hd { display:flex; align-items:center; gap:12px; padding:10px 14px; background:var(--bg2,#f8fafc); border-bottom:1px solid var(--brd,#e2e8f0); }
      .ifm-serial { font-family:monospace; font-weight:700; font-size:13px; color:var(--ink1,#1e293b); }
      .ifm-meta   { font-size:12px; color:var(--ink3,#64748b); }
      .ifm-unit-bd { padding:12px 14px; display:grid; grid-template-columns:repeat(auto-fill,minmax(175px,1fr)); gap:10px 20px; align-items:start; }
      .ifm-chk { display:flex; align-items:center; gap:8px; font-size:13px; cursor:pointer; padding:4px 0; }
      .ifm-chk input { width:16px; height:16px; cursor:pointer; flex-shrink:0; }
      .ifm-fl { font-size:11px; color:var(--ink3,#64748b); margin-bottom:3px; }
      .ifm-sel-inp { padding:6px 10px; border:1px solid var(--brd,#e2e8f0); border-radius:6px; font:inherit; font-size:13px; background:var(--bg1,#fff); color:var(--ink1); width:100%; box-sizing:border-box; }
      .ifm-sel-inp.ok   { border-color:#86efac; background:#f0fdf4; }
      .ifm-sel-inp.fail { border-color:#fca5a5; background:#fef2f2; }
      .ifm-date { padding:6px 10px; border:1px solid var(--brd,#e2e8f0); border-radius:6px; font:inherit; font-size:12px; background:var(--bg1,#fff); color:var(--ink1); width:100%; box-sizing:border-box; }
      .ifm-ta { width:100%; box-sizing:border-box; padding:6px 10px; border:1px solid var(--brd,#e2e8f0); border-radius:6px; font:inherit; font-size:12px; background:var(--bg1,#fff); color:var(--ink1); resize:none; }
    `;
    document.head.appendChild(s);
  }

  // ── View div ──────────────────────────────────────────────────────────────
  if (!document.getElementById('view-inspform')) {
    const div = document.createElement('div');
    div.id = 'view-inspform';
    div.className = 'view';
    div.innerHTML = '<div class="ifm-wrap"></div>';
    const ref = document.getElementById('view-inspforecast') || document.getElementById('view-birgdir');
    ref ? ref.after(div) : document.body.appendChild(div);
  }

  // ── Nav button ────────────────────────────────────────────────────────────
  function injectNav() {
    const nav = document.querySelector('.view-nav');
    if (!nav || nav.querySelector('[data-view="inspform"]')) return;
    const btn = document.createElement('button');
    btn.className = 'vnav-btn';
    btn.dataset.view = 'inspform';
    btn.onclick = () => App.switchView('inspform');
    btn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M9 11l3 3L22 4"/>
        <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
      </svg>
      <span>Skoðun</span>`;
    const ref = nav.querySelector('[data-view="inspforecast"]') || nav.querySelector('[data-view="birgdir"]');
    ref ? ref.after(btn) : nav.appendChild(btn);
  }
  injectNav();
  const _navObs = new MutationObserver(injectNav);
  _navObs.observe(document.body, { childList: true, subtree: true });

  // ── State ─────────────────────────────────────────────────────────────────
  let _co = null, _units = [], _results = {};

  // ── Company search ────────────────────────────────────────────────────────
  async function _searchCo(q) {
    const list = document.getElementById('ifm-co-list');
    if (!list) return;
    const SB = getSB();
    if (!SB) { list.innerHTML = '<div style="padding:12px;font-size:13px;color:var(--ink3)">Gagngrunnur ekki tengdur</div>'; return; }
    const { data } = await SB.from('uttaeki').select('client').limit(500);
    const seen = new Set(), out = [];
    (data||[]).forEach(r => {
      const n = r.client || '';
      if (n && !seen.has(n) && (!q || n.toLowerCase().includes(q.toLowerCase()))) { seen.add(n); out.push(n); }
    });
    out.sort();
    list.innerHTML = out.slice(0,60).map(c =>
      `<div class="ifm-co-row${_co===c?' ifm-sel':''}" onclick="InspForm._pickCo(${JSON.stringify(c)})">${esc(c)}</div>`
    ).join('') || '<div style="padding:10px;font-size:13px;color:var(--ink3)">Engin fyrirtæki fundust</div>';
  }

  function _pickCo(name) {
    _co = name;
    document.querySelectorAll('.ifm-co-row').forEach(r => r.classList.toggle('ifm-sel', r.textContent.trim() === name));
    const btn = document.getElementById('ifm-next1');
    if (btn) btn.disabled = false;
  }

  // ── Step 1 render ─────────────────────────────────────────────────────────
  function renderStep1() {
    const wrap = document.querySelector('#view-inspform .ifm-wrap');
    if (!wrap) return;
    _co = null; _units = []; _results = {};
    wrap.innerHTML = `
      <div style="font-size:19px;font-weight:600;margin-bottom:20px">📋 Ný skoðun</div>
      <div class="ifm-step">
        <div class="ifm-step-title">1. Veldu viðskiptavin</div>
        <input class="ifm-co-search" id="ifm-co-inp" placeholder="Leita að fyrirtæki…"
          oninput="InspForm._searchCo(this.value)" autocomplete="off">
        <div class="ifm-co-list" id="ifm-co-list"></div>
      </div>
      <div class="ifm-step">
        <div class="ifm-step-title">Tæknimaður</div>
        <input class="fi" id="ifm-tech" style="max-width:280px"
          placeholder="Nafn tæknimanns"
          value="${esc(localStorage.getItem('insp_tech')||'')}">
      </div>
      <div style="display:flex;justify-content:flex-end">
        <button class="btn btn-primary" id="ifm-next1" onclick="InspForm._next1()" disabled>Áfram →</button>
      </div>`;
    setTimeout(() => _searchCo(''), 120);
  }

  // ── Step 1 → Step 2 ───────────────────────────────────────────────────────
  async function _next1() {
    if (!_co) return;
    const techEl = document.getElementById('ifm-tech');
    if (techEl?.value.trim()) localStorage.setItem('insp_tech', techEl.value.trim());
    const wrap = document.querySelector('#view-inspform .ifm-wrap');
    if (wrap) wrap.innerHTML = '<div class="loading-state">Hleður tæki…</div>';
    const SB = getSB();
    if (!SB) return;
    const { data } = await SB.from('uttaeki')
      .select('id,serial,type,size,next_insp,last_insp,pressure,notes')
      .eq('client', _co)
      .order('serial');
    _units = data || [];
    if (!_units.length) {
      if (wrap) wrap.innerHTML = `
        <div class="ifm-step">
          <div class="ifm-step-title">Engin tæki skráð hjá ${esc(_co)}</div>
          <button class="btn btn-outline" onclick="InspForm._reset()">← Til baka</button>
        </div>`;
      return;
    }
    // Default results: all checks pass, next insp in 1 year
    _results = {};
    const todayPlus1 = addYearISO(todayISO());
    _units.forEach(u => {
      _results[u.id] = { pressure:true, weight:true, pin:true, result:'Í lagi', notes:'', next_insp:todayPlus1 };
    });
    renderStep2();
  }

  // ── Step 2 render ─────────────────────────────────────────────────────────
  function renderStep2() {
    const wrap = document.querySelector('#view-inspform .ifm-wrap');
    if (!wrap) return;
    const tech = localStorage.getItem('insp_tech') || '—';
    const cards = _units.map(u => {
      const r = _results[u.id];
      const isOk = r.result === 'Í lagi';
      return `<div class="ifm-unit-card">
        <div class="ifm-unit-hd">
          <span class="ifm-serial">${esc(u.serial||'?')}</span>
          <span class="ifm-meta">${esc(u.type||u.tegund||'')}${(u.size||u.sterd)?' · '+esc(u.size||u.sterd):''}${u.next_insp?' · Gjalddagi: '+fmtDate(u.next_insp):''}</span>
        </div>
        <div class="ifm-unit-bd">
          <label class="ifm-chk">
            <input type="checkbox" ${r.pressure?'checked':''} onchange="InspForm._chk(${u.id},'pressure',this.checked)">
            Þrýstingur í lagi
          </label>
          <label class="ifm-chk">
            <input type="checkbox" ${r.weight?'checked':''} onchange="InspForm._chk(${u.id},'weight',this.checked)">
            Þyngd / fyllta í lagi
          </label>
          <label class="ifm-chk">
            <input type="checkbox" ${r.pin?'checked':''} onchange="InspForm._chk(${u.id},'pin',this.checked)">
            Tápinni / insigli í lagi
          </label>
          <div>
            <div class="ifm-fl">Niðurstaða</div>
            <select class="ifm-sel-inp ${isOk?'ok':'fail'}"
              onchange="InspForm._res(${u.id},this.value,this)">
              <option ${isOk?'selected':''}>Í lagi</option>
              <option ${!isOk?'selected':''}>Gallað</option>
            </select>
          </div>
          <div>
            <div class="ifm-fl">Næsta skoðun</div>
            <input type="date" class="ifm-date" value="${r.next_insp||''}"
              onchange="InspForm._fld(${u.id},'next_insp',this.value)">
          </div>
          <div style="grid-column:1/-1">
            <div class="ifm-fl">Athugasemdir</div>
            <textarea class="ifm-ta" rows="2" placeholder="Valfrjálst"
              onchange="InspForm._fld(${u.id},'notes',this.value)">${esc(r.notes||'')}</textarea>
          </div>
        </div>
      </div>`;
    }).join('');

    wrap.innerHTML = `
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;flex-wrap:wrap">
        <div>
          <div style="font-size:19px;font-weight:600">📋 ${esc(_co)}</div>
          <div style="font-size:13px;color:var(--ink3)">${_units.length} tæki · Tæknimaður: ${esc(tech)}</div>
        </div>
        <button class="btn btn-outline btn-sm" style="margin-left:auto" onclick="InspForm._reset()">← Til baka</button>
      </div>
      ${cards}
      <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:8px;flex-wrap:wrap">
        <button class="btn btn-outline" onclick="InspForm._reset()">Hætta við</button>
        <button class="btn btn-primary" onclick="InspForm._save()">✓ Vista skoðun</button>
      </div>`;
  }

  // ── Checklist helpers ─────────────────────────────────────────────────────
  function _chk(id, f, v)  { if (_results[id]) _results[id][f] = v; }
  function _res(id, v, el) { if (_results[id]) { _results[id].result = v; el.className = 'ifm-sel-inp '+(v==='Í lagi'?'ok':'fail'); } }
  function _fld(id, f, v)  { if (_results[id]) _results[id][f] = v; }

  // ── Save ──────────────────────────────────────────────────────────────────
  async function _save() {
    const SB = getSB();
    if (!SB) { if(window.Toast)Toast.show('Gagngrunnur ekki tengdur'); return; }
    const today = todayISO();
    await Promise.all(_units.map(u => {
      const r = _results[u.id] || {};
      return SB.from('uttaeki').update({
        last_insp: today,
        next_insp: r.next_insp || addYearISO(today),
        notes:     (r.notes||'').trim() || null
      }).eq('id', u.id);
    }));
    if(window.Toast) Toast.show('✓ Skoðun vistuð');
    renderStep3();
  }

  // ── Completion screen ─────────────────────────────────────────────────────
  function renderStep3() {
    const wrap = document.querySelector('#view-inspform .ifm-wrap');
    if (!wrap) return;
    const passC = _units.filter(u => _results[u.id]?.result === 'Í lagi').length;
    const failC = _units.length - passC;
    wrap.innerHTML = `
      <div class="ifm-step" style="text-align:center;padding:44px 24px">
        <div style="font-size:44px;margin-bottom:12px">✅</div>
        <div style="font-size:18px;font-weight:700;margin-bottom:8px">Skoðun vistuð!</div>
        <div style="font-size:13px;color:var(--ink3);margin-bottom:24px">
          ${esc(_co)} · ${_units.length} tæki skoðuð<br>
          ${passC} í lagi${failC?` · <span style="color:#dc2626;font-weight:600">${failC} gallaðar</span>`:''}
        </div>
        <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">
          <button class="btn btn-outline" onclick="InspForm._reset()">📋 Ný skoðun</button>
          ${window.ServiceCert?`<button class="btn btn-primary" onclick="InspForm._cert()">🖨 Prenta vottorð</button>`:''}
        </div>
      </div>`;
  }

  // ── Print cert via patch 35 ───────────────────────────────────────────────
  function _cert() {
    if (!window.ServiceCert) return;
    const tech = localStorage.getItem('insp_tech') || '';
    const unitsForCert = _units.map(u => ({
      ...u,
      result:    _results[u.id]?.result || 'Í lagi',
      next_insp: _results[u.id]?.next_insp || u.next_insp,
      weight_ok: _results[u.id]?.weight !== false
    }));
    ServiceCert.openForUnits(unitsForCert, _co, '', tech, '');
  }

  function _reset() { renderStep1(); }

  // ── SwitchView patch ──────────────────────────────────────────────────────
  (function patchSwitchView() {
    if (typeof App === 'undefined') { setTimeout(patchSwitchView, 200); return; }
    if (App.switchView?._inspFormPatch) return;
    const orig = App.switchView.bind(App);
    App.switchView = function(v) {
      if (v === 'inspform') {
        document.querySelectorAll('.view').forEach(el => el.classList.remove('active'));
        document.querySelectorAll('.vnav-btn').forEach(el => el.classList.toggle('active', el.dataset.view==='inspform'));
        const vEl = document.getElementById('view-inspform');
        if (vEl) vEl.classList.add('active');
        document.dispatchEvent(new CustomEvent('view-shown', { detail:'inspform' }));
        return;
      }
      orig(v);
    };
    App.switchView._inspFormPatch = true;
  })();

  document.addEventListener('view-shown', e => { if (e.detail==='inspform') renderStep1(); });

  window.InspForm = { _searchCo, _pickCo, _next1, _chk, _res, _fld, _save, _cert, _reset };
  console.log('[insp-form] installed');
})();
/* === END FIELD INSPECTION FORM === */
