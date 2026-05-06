/* === EXPENSE TRACKING / ÚTGJÖLD v1 === */
/* Track job-related costs: materials, travel, subcontractors, tools.
 *
 * New nav view: "💰 Útgjöld" — injected after Tímar.
 *
 * SQL (add to MIGRATION.sql):
 *   CREATE TABLE IF NOT EXISTS utgjalda_log (
 *     id          BIGSERIAL PRIMARY KEY,
 *     job_id      BIGINT,
 *     job_num     TEXT,
 *     flokkur     TEXT DEFAULT 'efni',
 *     lýsing      TEXT NOT NULL,
 *     upphæð      NUMERIC NOT NULL DEFAULT 0,
 *     tæknimaður  TEXT,
 *     dagsetning  DATE NOT NULL DEFAULT CURRENT_DATE,
 *     created_at  TIMESTAMPTZ DEFAULT NOW()
 *   );
 *
 * Categories: efni, ferðakostnaður, verkfæri, undirverktaki, annað
 *
 * Features:
 *   - Weekly / monthly / all-time expense view
 *   - Per-job expense total
 *   - Summary chart by category (CSS bar chart, no libraries)
 *   - CSV export
 *   - Inject "💰" quick-add button into job rows
 */
(() => {
  if (window.__expenseTrackingInstalled) return;
  window.__expenseTrackingInstalled = true;

  function getSB() { return window.DB && window.DB.sb; }
  function esc(s) { return String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function fmtKr(n) { if(!n&&n!==0)return'—'; const s=Math.round(n).toString(); const r=[]; let t=s; while(t.length>3){r.unshift(t.slice(-3));t=t.slice(0,-3);}r.unshift(t);return r.join('.')+' kr'; }
  function todayISO() { const d=new Date(); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }
  function startOfWeek()  { const d=new Date(); d.setDate(d.getDate()-d.getDay()+1); return d.toISOString().slice(0,10); }
  function startOfMonth() { const d=new Date(); d.setDate(1); return d.toISOString().slice(0,10); }

  const CATEGORIES = ['efni','ferðakostnaður','verkfæri','undirverktaki','annað'];
  const CAT_COLORS = { efni:'#3b82f6', ferðakostnaður:'#f59e0b', verkfæri:'#8b5cf6', undirverktaki:'#ec4899', annað:'#64748b' };

  // ── CSS ───────────────────────────────────────────────────────────────────
  if (!document.getElementById('utg-style')) {
    const s = document.createElement('style');
    s.id = 'utg-style';
    s.textContent = `
      #view-utgjaldalog { background:var(--bg2,#f8fafc); overflow-y:auto; }
      .utg-wrap { max-width:860px; margin:0 auto; padding:24px 20px 48px; }
      .utg-period-tabs { display:flex; gap:6px; margin-bottom:16px; }
      .utg-tab { padding:7px 14px; border:1px solid var(--brd,#e2e8f0); border-radius:8px; background:var(--bg1,#fff); font:inherit; font-size:12px; font-weight:600; cursor:pointer; color:var(--ink3); }
      .utg-tab.active { background:var(--blu,#3b82f6); color:#fff; border-color:var(--blu,#3b82f6); }
      .utg-summary { display:grid; grid-template-columns:repeat(auto-fill,minmax(160px,1fr)); gap:12px; margin-bottom:20px; }
      .utg-card { background:var(--bg1,#fff); border:1px solid var(--brd,#e2e8f0); border-radius:10px; padding:14px 16px; }
      .utg-card-label { font-size:11px; font-weight:700; color:var(--ink3); margin-bottom:4px; text-transform:uppercase; letter-spacing:.04em; }
      .utg-card-val   { font-size:18px; font-weight:700; color:var(--ink1); line-height:1.2; }
      .utg-bar-wrap { display:flex; align-items:center; gap:8px; margin-bottom:6px; font-size:12px; }
      .utg-bar-label { width:110px; flex-shrink:0; color:var(--ink2); font-weight:500; text-transform:capitalize; }
      .utg-bar-track { flex:1; background:var(--bg2); border-radius:4px; height:8px; overflow:hidden; }
      .utg-bar-fill  { height:8px; border-radius:4px; transition:width .4s; }
      .utg-bar-val   { width:80px; text-align:right; color:var(--ink3); font-weight:600; }
      .utg-modal-wrap { position:fixed; inset:0; z-index:99999; display:flex; align-items:center; justify-content:center; background:rgba(0,0,0,.45); padding:16px; }
      .utg-modal { background:#fff; border-radius:14px; padding:24px; max-width:440px; width:100%; box-shadow:0 20px 60px rgba(0,0,0,.25); font-family:inherit; }
      .utg-modal-ft { display:flex; gap:8px; margin-top:16px; justify-content:flex-end; }
    `;
    document.head.appendChild(s);
  }

  // ── View div ──────────────────────────────────────────────────────────────
  if (!document.getElementById('view-utgjaldalog')) {
    const div = document.createElement('div');
    div.id = 'view-utgjaldalog';
    div.className = 'view';
    div.innerHTML = '<div class="utg-wrap"><div class="loading-state">Hleður útgjöld…</div></div>';
    const ref = document.getElementById('view-timabok') || document.getElementById('view-birgdir');
    ref ? ref.after(div) : document.body.appendChild(div);
  }

  // ── Nav button ────────────────────────────────────────────────────────────
  function injectNav() {
    const nav = document.querySelector('.view-nav');
    if (!nav || nav.querySelector('[data-view="utgjaldalog"]')) return;
    const btn = document.createElement('button');
    btn.className = 'vnav-btn';
    btn.dataset.view = 'utgjaldalog';
    btn.onclick = () => App.switchView('utgjaldalog');
    btn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/>
        <path d="M12 6v6l4 2"/>
        <line x1="8" y1="14" x2="16" y2="14"/>
      </svg>
      <span>Útgjöld</span>`;
    const ref = nav.querySelector('[data-view="timabok"]') || nav.querySelector('[data-view="birgdir"]');
    ref ? ref.after(btn) : nav.appendChild(btn);
  }
  injectNav();
  new MutationObserver(injectNav).observe(document.body, { childList:true, subtree:true });

  // ── State ─────────────────────────────────────────────────────────────────
  let _entries = [];
  let _period  = 'month';
  let _jobs    = [];

  // ── Load ──────────────────────────────────────────────────────────────────
  async function load() {
    const SB = getSB();
    const el = document.querySelector('#view-utgjaldalog .utg-wrap');
    if (!el) return;
    if (!SB) { el.innerHTML = '<div class="empty-state"><div class="es-icon">💰</div><div class="es-title">Gagngrunnur ekki tengdur</div></div>'; return; }
    el.innerHTML = '<div class="loading-state">Hleður útgjöld…</div>';

    const [expRes, jobRes] = await Promise.all([
      SB.from('utgjalda_log').select('*').order('dagsetning', { ascending:false }),
      SB.from('verkbeidnir').select('id,num,customer').limit(200).order('created_at', { ascending:false })
    ]);

    if (expRes.error && expRes.error.code === '42P01') {
      el.innerHTML = `<div style="padding:32px;max-width:560px">
        <div style="font-size:16px;font-weight:700;margin-bottom:10px">💰 Útgjöld — uppsetning vantar</div>
        <p style="font-size:13px;color:var(--ink3)">Búðu til töfluna í Supabase SQL Editor:</p>
        <pre style="background:var(--bg2);border-radius:8px;padding:14px;font-size:11px;overflow-x:auto">CREATE TABLE IF NOT EXISTS utgjalda_log (
  id BIGSERIAL PRIMARY KEY,
  job_id BIGINT, job_num TEXT,
  flokkur TEXT DEFAULT 'efni',
  lýsing TEXT NOT NULL,
  upphæð NUMERIC NOT NULL DEFAULT 0,
  tæknimaður TEXT,
  dagsetning DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);</pre>
        <button class="btn btn-primary btn-sm" onclick="ExpenseTracking.load()" style="margin-top:12px">Reyna aftur</button>
      </div>`;
      return;
    }

    _entries = expRes.data || [];
    _jobs    = jobRes.data  || [];
    render();
  }

  function filtered() {
    if (_period === 'all') return _entries;
    const from = _period === 'week' ? startOfWeek() : startOfMonth();
    return _entries.filter(e => e.dagsetning >= from);
  }

  // ── Render ────────────────────────────────────────────────────────────────
  function render() {
    const el = document.querySelector('#view-utgjaldalog .utg-wrap');
    if (!el) return;
    const entries = filtered();
    const total = entries.reduce((s,e) => s+(e.upphæð||0), 0);

    // Per-category totals
    const byCat = {};
    CATEGORIES.forEach(c => { byCat[c] = 0; });
    entries.forEach(e => { byCat[e.flokkur||'annað'] = (byCat[e.flokkur||'annað']||0)+(e.upphæð||0); });
    const maxCat = Math.max(...Object.values(byCat), 1);

    // Per-job totals (top 5)
    const byJob = {};
    entries.forEach(e => {
      const k = e.job_num || (e.job_id ? '#'+e.job_id : '—');
      byJob[k] = (byJob[k]||0)+(e.upphæð||0);
    });
    const topJobs = Object.entries(byJob).sort((a,b)=>b[1]-a[1]).slice(0,5);

    const tabs = ['week','month','all'].map(p =>
      `<button class="utg-tab${_period===p?' active':''}" onclick="ExpenseTracking._period('${p}')">${p==='week'?'Þessi vika':p==='month'?'Þessi mánuður':'Allt'}</button>`
    ).join('');

    const catBars = Object.entries(byCat).filter(([,v])=>v>0).sort((a,b)=>b[1]-a[1]).map(([cat,val]) => `
      <div class="utg-bar-wrap">
        <div class="utg-bar-label">${esc(cat)}</div>
        <div class="utg-bar-track"><div class="utg-bar-fill" style="width:${(val/maxCat*100).toFixed(1)}%;background:${CAT_COLORS[cat]||'#64748b'}"></div></div>
        <div class="utg-bar-val">${fmtKr(val)}</div>
      </div>`).join('');

    const rows = entries.slice(0,150).map(e => `<tr>
      <td>${esc(e.dagsetning||'')}</td>
      <td><span style="background:${CAT_COLORS[e.flokkur||'annað']}22;color:${CAT_COLORS[e.flokkur||'annað']};padding:1px 6px;border-radius:4px;font-size:11px;font-weight:600">${esc(e.flokkur||'annað')}</span></td>
      <td>${esc(e.lýsing||'')}</td>
      <td>${e.job_num?`<span style="font-family:monospace;font-size:11px;background:var(--bg2);padding:1px 5px;border-radius:3px">${esc(e.job_num)}</span>`:''}</td>
      <td style="text-align:right"><strong>${fmtKr(e.upphæð)}</strong></td>
      <td style="color:var(--ink3)">${esc(e.tæknimaður||'')}</td>
      <td><button class="btn btn-ghost btn-sm" onclick="ExpenseTracking._delete(${e.id})" style="color:#dc2626">🗑</button></td>
    </tr>`).join('');

    el.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:10px">
        <div>
          <div style="font-size:19px;font-weight:600">💰 Útgjöld</div>
          <div style="font-size:13px;color:var(--ink3)">${fmtKr(total)} ${_period==='week'?'þessa viku':_period==='month'?'þennan mánuð':'samtals'} · ${entries.length} færslur</div>
        </div>
        <div style="display:flex;gap:8px">
          <button class="btn btn-outline btn-sm" onclick="ExpenseTracking._exportCsv()">⬇ CSV</button>
          <button class="btn btn-primary btn-sm" onclick="ExpenseTracking._openNew()">+ Ný útgjöld</button>
        </div>
      </div>
      <div class="utg-period-tabs">${tabs}</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px">
        ${catBars ? `<div class="utg-card" style="grid-column:1/2">
          <div class="utg-card-label" style="margin-bottom:12px">Útgjöld eftir flokkum</div>
          ${catBars}
        </div>` : ''}
        ${topJobs.length ? `<div class="utg-card">
          <div class="utg-card-label" style="margin-bottom:10px">Dýrustu verk</div>
          ${topJobs.map(([k,v])=>`<div class="utg-bar-wrap"><div class="utg-bar-label">${esc(k)}</div><div class="utg-bar-track"><div class="utg-bar-fill" style="width:${(v/topJobs[0][1]*100).toFixed(1)}%;background:#3b82f6"></div></div><div class="utg-bar-val">${fmtKr(v)}</div></div>`).join('')}
        </div>` : ''}
      </div>
      ${entries.length ? `<div class="tcard"><table class="dtbl"><thead><tr>
        <th>Dagsetning</th><th>Flokkur</th><th>Lýsing</th><th>Verk</th><th style="text-align:right">Upphæð</th><th>Tæknimaður</th><th></th>
      </tr></thead><tbody>${rows}</tbody></table></div>` :
      '<div class="empty-state"><div class="es-icon">💰</div><div class="es-title">Engar útgjaldafærslur</div><div class="es-sub">Smelltu á "+ Ný útgjöld" til að hefja</div></div>'}`;
  }

  // ── Modal ─────────────────────────────────────────────────────────────────
  function _openNew(prefillJobNum) {
    document.getElementById('utg-entry-modal')?.remove();
    const m = document.createElement('div');
    m.id = 'utg-entry-modal';
    m.className = 'utg-modal-wrap';
    m.onclick = e => { if(e.target===m) m.remove(); };
    const catOpts = CATEGORIES.map(c=>`<option value="${c}">${c}</option>`).join('');
    const jobOpts = _jobs.slice(0,100).map(j=>
      `<option value="${esc(j.num||j.id)}">${esc(j.num||j.id)} — ${esc(j.customer||'')}</option>`
    ).join('');
    m.innerHTML = `
      <div class="utg-modal">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
          <div style="font-size:15px;font-weight:700">💰 Ný útgjaldafærsla</div>
          <button onclick="document.getElementById('utg-entry-modal')?.remove()" style="background:none;border:none;font-size:18px;cursor:pointer;color:#64748b">✕</button>
        </div>
        <div class="fg"><label class="fl">Lýsing *</label>
          <input class="fi" id="ue-lys" placeholder="t.d. Eldsneytiskostnaður, O-hringir…">
        </div>
        <div class="frow2" style="margin-top:10px">
          <div class="fg"><label class="fl">Flokkur</label>
            <select class="fi" id="ue-flk">${catOpts}</select>
          </div>
          <div class="fg"><label class="fl">Upphæð (kr)</label>
            <input class="fi" type="number" id="ue-upph" min="0" step="1" placeholder="0">
          </div>
        </div>
        <div class="frow2" style="margin-top:10px">
          <div class="fg"><label class="fl">Dagsetning</label>
            <input class="fi" type="date" id="ue-date" value="${todayISO()}">
          </div>
          <div class="fg"><label class="fl">Tæknimaður</label>
            <input class="fi" id="ue-tech" value="${esc(localStorage.getItem('insp_tech')||'')}" placeholder="Nafn">
          </div>
        </div>
        <div class="fg" style="margin-top:10px"><label class="fl">Verkbeiðni (valfrjálst)</label>
          <input class="fi" id="ue-job" value="${esc(prefillJobNum||'')}" placeholder="Númer" list="ue-job-list">
          <datalist id="ue-job-list">${jobOpts}</datalist>
        </div>
        <div class="utg-modal-ft">
          <button class="btn btn-outline" onclick="document.getElementById('utg-entry-modal')?.remove()">Hætta við</button>
          <button class="btn btn-primary" onclick="ExpenseTracking._save()">Vista</button>
        </div>
      </div>`;
    document.body.appendChild(m);
    setTimeout(()=>document.getElementById('ue-lys')?.focus(),80);
  }

  async function _save() {
    const lys   = document.getElementById('ue-lys')?.value.trim();
    const upph  = parseFloat(document.getElementById('ue-upph')?.value||0)||0;
    if (!lys)  { if(window.Toast) Toast.show('Sláðu inn lýsingu'); return; }
    if (!upph) { if(window.Toast) Toast.show('Sláðu inn upphæð'); return; }
    const flk   = document.getElementById('ue-flk')?.value || 'annað';
    const date  = document.getElementById('ue-date')?.value || todayISO();
    const tech  = document.getElementById('ue-tech')?.value.trim()||null;
    const jobN  = document.getElementById('ue-job')?.value.trim()||null;
    const match = jobN ? _jobs.find(j=>j.num===jobN||String(j.id)===jobN) : null;
    if (tech) localStorage.setItem('insp_tech', tech);
    const SB = getSB();
    if (SB) await SB.from('utgjalda_log').insert({ lýsing:lys, flokkur:flk, upphæð:upph, dagsetning:date, tæknimaður:tech, job_id:match?.id||null, job_num:jobN });
    document.getElementById('utg-entry-modal')?.remove();
    if(window.Toast) Toast.show(`✓ ${fmtKr(upph)} skráðar`);
    load();
  }

  async function _delete(id) {
    if (!confirm('Eyða þessari færslu?')) return;
    const SB = getSB();
    if (SB) await SB.from('utgjalda_log').delete().eq('id',id);
    if(window.Toast) Toast.show('Færsla eytt');
    load();
  }

  function _period(p) { _period = p; render(); }

  function _exportCsv() {
    const entries = filtered();
    const hdr = ['Dagsetning','Flokkur','Lýsing','Verk','Upphæð','Tæknimaður'];
    const rows = entries.map(e=>[e.dagsetning,e.flokkur,e.lýsing,e.job_num||'',e.upphæð,e.tæknimaður||''].join(';'));
    const csv = '﻿'+hdr.join(';')+'\n'+rows.join('\n');
    const a = document.createElement('a');
    a.href = 'data:text/csv;charset=utf-8,'+encodeURIComponent(csv);
    a.download = 'utgjaldalog_'+todayISO()+'.csv';
    a.click();
  }

  // ── Inject quick-add button into job rows ─────────────────────────────────
  const _obs = new MutationObserver(() => {
    document.querySelectorAll('[data-job-id]:not([data-utg-injected]), tr[data-id]:not([data-utg-injected])').forEach(row => {
      const jobId  = row.dataset.jobId || row.dataset.id;
      const jobNum = row.dataset.num   || row.dataset.jobNum || '';
      if (!jobId) return;
      row.dataset.utgInjected = '1';
      const actions = row.querySelector('.row-actions, .job-actions');
      if (!actions) return;
      const btn = document.createElement('button');
      btn.className = 'btn btn-ghost btn-sm';
      btn.title = 'Skrá útgjöld';
      btn.innerHTML = '💰';
      btn.onclick = e => { e.stopPropagation(); ExpenseTracking._openNew(jobNum); };
      actions.appendChild(btn);
    });
  });
  _obs.observe(document.body, { childList:true, subtree:true });

  // ── SwitchView patch ──────────────────────────────────────────────────────
  (function patchSwitchView() {
    if (typeof App==='undefined') { setTimeout(patchSwitchView,200); return; }
    if (App.switchView?._utgPatch) return;
    const orig = App.switchView.bind(App);
    App.switchView = function(v) {
      if (v==='utgjaldalog') {
        document.querySelectorAll('.view').forEach(el=>el.classList.remove('active'));
        document.querySelectorAll('.vnav-btn').forEach(el=>el.classList.toggle('active', el.dataset.view==='utgjaldalog'));
        const vEl = document.getElementById('view-utgjaldalog');
        if (vEl) vEl.classList.add('active');
        document.dispatchEvent(new CustomEvent('view-shown',{detail:'utgjaldalog'}));
        return;
      }
      orig(v);
    };
    App.switchView._utgPatch = true;
  })();

  document.addEventListener('view-shown', e => { if (e.detail==='utgjaldalog') load(); });

  window.ExpenseTracking = { load, _openNew, _save, _delete, _period, _exportCsv };
  console.log('[expense-tracking] installed');
})();
/* === END EXPENSE TRACKING === */
