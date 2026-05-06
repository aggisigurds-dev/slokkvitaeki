/* === TIME TRACKING / TÍMASKRÁNING v1 === */
/* Track billable hours per job and per technician.
 *
 * New nav view: "⏱ Tímar" — injected after Pantanir.
 *
 * SQL (add to MIGRATION.sql):
 *   CREATE TABLE IF NOT EXISTS timabok (
 *     id          BIGSERIAL PRIMARY KEY,
 *     job_id      BIGINT,
 *     job_num     TEXT,
 *     tæknimaður  TEXT NOT NULL,
 *     mínútur     INTEGER NOT NULL,
 *     dagsetning  DATE NOT NULL DEFAULT CURRENT_DATE,
 *     notes       TEXT,
 *     created_at  TIMESTAMPTZ DEFAULT NOW()
 *   );
 *
 * Features:
 *   - "Ný skráning" — log time against any job or free-form
 *   - Weekly / monthly summary per technician
 *   - Inject "⏱" quick-log button into job rows in Afgreiðsla
 *   - CSV export
 */
(() => {
  if (window.__timeTrackingInstalled) return;
  window.__timeTrackingInstalled = true;

  function getSB() { return window.DB && window.DB.sb; }
  function esc(s) { return String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function todayISO() { const d=new Date(); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }
  function startOfWeek() { const d=new Date(); d.setDate(d.getDate()-d.getDay()+1); return d.toISOString().slice(0,10); }
  function startOfMonth() { const d=new Date(); d.setDate(1); return d.toISOString().slice(0,10); }
  function fmtHours(min) { const h=Math.floor((min||0)/60); const m=(min||0)%60; return h?`${h} klst${m?` ${m} mín`:''}`:m+' mín'; }

  // ── CSS ───────────────────────────────────────────────────────────────────
  if (!document.getElementById('tima-style')) {
    const s = document.createElement('style');
    s.id = 'tima-style';
    s.textContent = `
      #view-timabok { background:var(--bg2,#f8fafc); overflow-y:auto; }
      .tima-wrap { max-width:860px; margin:0 auto; padding:24px 20px 48px; }
      .tima-period-tabs { display:flex; gap:6px; margin-bottom:16px; }
      .tima-tab { padding:7px 14px; border:1px solid var(--brd,#e2e8f0); border-radius:8px; background:var(--bg1,#fff); font:inherit; font-size:12px; font-weight:600; cursor:pointer; color:var(--ink3); }
      .tima-tab.active { background:var(--blu,#3b82f6); color:#fff; border-color:var(--blu,#3b82f6); }
      .tima-summary { display:grid; grid-template-columns:repeat(auto-fill,minmax(180px,1fr)); gap:12px; margin-bottom:20px; }
      .tima-sum-card { background:var(--bg1,#fff); border:1px solid var(--brd,#e2e8f0); border-radius:10px; padding:14px 16px; }
      .tima-sum-name { font-size:12px; font-weight:700; color:var(--ink1); margin-bottom:4px; }
      .tima-sum-hrs  { font-size:22px; font-weight:700; color:var(--ink1); line-height:1; }
      .tima-sum-sub  { font-size:11px; color:var(--ink3); margin-top:4px; }
      .tima-modal-wrap { position:fixed; inset:0; z-index:99999; display:flex; align-items:center; justify-content:center; background:rgba(0,0,0,.45); padding:16px; }
      .tima-modal { background:#fff; border-radius:14px; padding:24px; max-width:440px; width:100%; box-shadow:0 20px 60px rgba(0,0,0,.25); font-family:inherit; }
      .tima-modal-hd { display:flex; align-items:center; justify-content:space-between; margin-bottom:16px; }
      .tima-modal-ft { display:flex; gap:8px; margin-top:16px; justify-content:flex-end; }
    `;
    document.head.appendChild(s);
  }

  // ── View div ──────────────────────────────────────────────────────────────
  if (!document.getElementById('view-timabok')) {
    const div = document.createElement('div');
    div.id = 'view-timabok';
    div.className = 'view';
    div.innerHTML = '<div class="tima-wrap"><div class="loading-state">Hleður tímabok…</div></div>';
    const ref = document.getElementById('view-pantanir') || document.getElementById('view-birgdir');
    ref ? ref.after(div) : document.body.appendChild(div);
  }

  // ── Nav button ────────────────────────────────────────────────────────────
  function injectNav() {
    const nav = document.querySelector('.view-nav');
    if (!nav || nav.querySelector('[data-view="timabok"]')) return;
    const btn = document.createElement('button');
    btn.className = 'vnav-btn';
    btn.dataset.view = 'timabok';
    btn.onclick = () => App.switchView('timabok');
    btn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/>
        <polyline points="12 6 12 12 16 14"/>
      </svg>
      <span>Tímar</span>`;
    const ref = nav.querySelector('[data-view="pantanir"]') || nav.querySelector('[data-view="birgdir"]');
    ref ? ref.after(btn) : nav.appendChild(btn);
  }
  injectNav();
  new MutationObserver(injectNav).observe(document.body, { childList:true, subtree:true });

  // ── State ─────────────────────────────────────────────────────────────────
  let _entries = [];
  let _period = 'week'; // 'week' | 'month' | 'all'
  let _jobs = []; // cached job list for autocomplete

  // ── Load ──────────────────────────────────────────────────────────────────
  async function load() {
    const SB = getSB();
    const el = document.querySelector('#view-timabok .tima-wrap');
    if (!el) return;
    if (!SB) { el.innerHTML = '<div class="empty-state"><div class="es-icon">⏱</div><div class="es-title">Gagngrunnur ekki tengdur</div></div>'; return; }
    el.innerHTML = '<div class="loading-state">Hleður tímabok…</div>';

    const [timRes, jobRes] = await Promise.all([
      SB.from('timabok').select('*').order('dagsetning', { ascending:false }).order('created_at', { ascending:false }),
      SB.from('verkbeidnir').select('id,num,customer').limit(200).order('created_at', { ascending:false })
    ]);

    if (timRes.error && timRes.error.code === '42P01') {
      el.innerHTML = `<div style="padding:32px;max-width:560px">
        <div style="font-size:16px;font-weight:700;margin-bottom:10px">⏱ Tímar — uppsetning vantar</div>
        <p style="font-size:13px;color:var(--ink3)">Búðu til töfluna í Supabase SQL Editor:</p>
        <pre style="background:var(--bg2);border-radius:8px;padding:14px;font-size:11px;overflow-x:auto">CREATE TABLE IF NOT EXISTS timabok (
  id BIGSERIAL PRIMARY KEY,
  job_id BIGINT, job_num TEXT,
  tæknimaður TEXT NOT NULL,
  mínútur INTEGER NOT NULL,
  dagsetning DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);</pre>
        <button class="btn btn-primary btn-sm" onclick="TimeTracking.load()" style="margin-top:12px">Reyna aftur</button>
      </div>`;
      return;
    }

    _entries = timRes.data || [];
    _jobs    = jobRes.data  || [];
    render();
  }

  // ── Filtered entries ──────────────────────────────────────────────────────
  function filteredEntries() {
    if (_period === 'all') return _entries;
    const from = _period === 'week' ? startOfWeek() : startOfMonth();
    return _entries.filter(e => e.dagsetning >= from);
  }

  // ── Render ────────────────────────────────────────────────────────────────
  function render() {
    const el = document.querySelector('#view-timabok .tima-wrap');
    if (!el) return;
    const entries = filteredEntries();

    // Summary per technician
    const byTech = {};
    entries.forEach(e => {
      const t = e.tæknimaður || 'Óþekktur';
      if (!byTech[t]) byTech[t] = 0;
      byTech[t] += e.mínútur||0;
    });
    const totalMin = entries.reduce((s,e) => s+(e.mínútur||0), 0);

    const tabs = ['week','month','all'].map(p =>
      `<button class="tima-tab${_period===p?' active':''}" onclick="TimeTracking._setPeriod('${p}')">${p==='week'?'Þessi vika':p==='month'?'Þessi mánuður':'Allt'}</button>`
    ).join('');

    const summaryCards = Object.entries(byTech).sort((a,b)=>b[1]-a[1]).map(([t,min]) => `
      <div class="tima-sum-card">
        <div class="tima-sum-name">${esc(t)}</div>
        <div class="tima-sum-hrs">${Math.floor(min/60)}<span style="font-size:14px;font-weight:500;color:var(--ink3)"> klst</span></div>
        <div class="tima-sum-sub">${fmtHours(min)} · ${_entries.filter(e=>e.tæknimaður===t).length} skráningar</div>
      </div>`).join('');

    const rows = entries.map(e => `<tr>
      <td>${esc(e.dagsetning||'')}</td>
      <td><strong>${esc(e.tæknimaður||'')}</strong></td>
      <td>${e.job_num?`<span style="font-family:monospace;background:var(--bg2);padding:1px 5px;border-radius:3px">${esc(e.job_num)}</span>`:''}</td>
      <td><strong>${fmtHours(e.mínútur)}</strong></td>
      <td style="color:var(--ink3)">${esc(e.notes||'')}</td>
      <td><button class="btn btn-ghost btn-sm" onclick="TimeTracking._delete(${e.id})" style="color:#dc2626" title="Eyða">🗑</button></td>
    </tr>`).join('');

    el.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:10px">
        <div>
          <div style="font-size:19px;font-weight:600">⏱ Tímaskráning</div>
          <div style="font-size:13px;color:var(--ink3)">${fmtHours(totalMin)} skráðar ${_period==='week'?'þessa viku':_period==='month'?'þennan mánuð':'samtals'}</div>
        </div>
        <div style="display:flex;gap:8px">
          <button class="btn btn-outline btn-sm" onclick="TimeTracking._exportCsv()">⬇ CSV</button>
          <button class="btn btn-primary btn-sm" onclick="TimeTracking._openNew()">+ Ný skráning</button>
        </div>
      </div>
      <div class="tima-period-tabs">${tabs}</div>
      ${Object.keys(byTech).length ? `
        <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:var(--ink3);margin-bottom:8px">Yfirlit per tæknimann</div>
        <div class="tima-summary">${summaryCards}</div>` : ''}
      ${entries.length ? `
        <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:var(--ink3);margin-bottom:8px">Skráningar</div>
        <div class="tcard"><table class="dtbl"><thead><tr>
          <th>Dagsetning</th><th>Tæknimaður</th><th>Verk</th><th>Tímar</th><th>Athugasemdir</th><th></th>
        </tr></thead><tbody>${rows}</tbody></table></div>` :
        '<div class="empty-state"><div class="es-icon">⏱</div><div class="es-title">Engar skráningar</div><div class="es-sub">Smelltu á "+ Ný skráning" til að hefja</div></div>'}`;
  }

  // ── New / quick entry modal ───────────────────────────────────────────────
  function _openNew(prefillJobId, prefillJobNum) {
    document.getElementById('tima-entry-modal')?.remove();
    const m = document.createElement('div');
    m.id = 'tima-entry-modal';
    m.className = 'tima-modal-wrap';
    m.onclick = e => { if(e.target===m) m.remove(); };

    const jobOpts = _jobs.slice(0,100).map(j =>
      `<option value="${esc(j.num||j.id)}" data-id="${j.id}">${esc(j.num||j.id)} — ${esc(j.customer||'')}</option>`
    ).join('');

    m.innerHTML = `
      <div class="tima-modal">
        <div class="tima-modal-hd">
          <div style="font-size:15px;font-weight:700">⏱ Ný tímaskráning</div>
          <button onclick="document.getElementById('tima-entry-modal')?.remove()" style="background:none;border:none;font-size:18px;cursor:pointer;color:#64748b">✕</button>
        </div>
        <div class="fg"><label class="fl">Tæknimaður *</label>
          <input class="fi" id="te-tech" placeholder="Nafn" value="${esc(localStorage.getItem('insp_tech')||'')}">
        </div>
        <div class="frow2" style="margin-top:10px">
          <div class="fg"><label class="fl">Dagsetning</label>
            <input class="fi" type="date" id="te-date" value="${todayISO()}">
          </div>
          <div class="fg"><label class="fl">Tímar og mínútur</label>
            <div style="display:flex;gap:6px">
              <input class="fi" type="number" id="te-hours" min="0" max="24" step="1" placeholder="klst" style="max-width:70px">
              <input class="fi" type="number" id="te-mins" min="0" max="59" step="5" placeholder="mín" style="max-width:70px">
            </div>
          </div>
        </div>
        <div class="fg" style="margin-top:10px"><label class="fl">Verkbeiðni (valfrjálst)</label>
          <input class="fi" id="te-job" placeholder="Númer eða leita…" value="${esc(prefillJobNum||'')}" list="te-job-list">
          <datalist id="te-job-list">${jobOpts}</datalist>
        </div>
        <div class="fg" style="margin-top:10px"><label class="fl">Athugasemdir</label>
          <input class="fi" id="te-notes" placeholder="Valfrjálst">
        </div>
        <div class="tima-modal-ft">
          <button class="btn btn-outline" onclick="document.getElementById('tima-entry-modal')?.remove()">Hætta við</button>
          <button class="btn btn-primary" onclick="TimeTracking._save()">Vista</button>
        </div>
      </div>`;
    document.body.appendChild(m);
    if (prefillJobId) { const el=document.getElementById('te-job'); if(el) el.dataset.jobId=prefillJobId; }
    setTimeout(()=>document.getElementById('te-tech')?.focus(),100);
  }

  async function _save() {
    const tech  = document.getElementById('te-tech')?.value.trim();
    const hours = parseInt(document.getElementById('te-hours')?.value||0)||0;
    const mins  = parseInt(document.getElementById('te-mins')?.value||0)||0;
    const total = hours*60+mins;
    if (!tech)  { if(window.Toast) Toast.show('Sláðu inn nafn tæknimanns'); return; }
    if (!total) { if(window.Toast) Toast.show('Sláðu inn tíma'); return; }
    const date  = document.getElementById('te-date')?.value || todayISO();
    const jobEl = document.getElementById('te-job');
    const jobNum= jobEl?.value.trim()||null;
    const notes = document.getElementById('te-notes')?.value.trim()||null;

    // Try to link to job_id
    let jobId = null;
    if (jobNum) {
      const match = _jobs.find(j => j.num===jobNum || String(j.id)===jobNum);
      if (match) jobId = match.id;
    }

    localStorage.setItem('insp_tech', tech);
    const SB = getSB();
    if (SB) await SB.from('timabok').insert({ tæknimaður:tech, mínútur:total, dagsetning:date, job_id:jobId, job_num:jobNum, notes });
    document.getElementById('tima-entry-modal')?.remove();
    if(window.Toast) Toast.show(`✓ ${fmtHours(total)} skráðar`);
    load();
  }

  async function _delete(id) {
    if (!confirm('Eyða þessari skráningu?')) return;
    const SB = getSB();
    if (SB) await SB.from('timabok').delete().eq('id',id);
    if(window.Toast) Toast.show('Skráning eytt');
    load();
  }

  function _setPeriod(p) { _period = p; render(); }

  function _exportCsv() {
    const entries = filteredEntries();
    const hdr = ['Dagsetning','Tæknimaður','Verk','Mínútur','Klst','Athugasemdir'];
    const rows = entries.map(e => [e.dagsetning,e.tæknimaður,e.job_num||'',e.mínútur,((e.mínútur||0)/60).toFixed(2),e.notes||''].join(';'));
    const csv = '﻿'+hdr.join(';')+'\n'+rows.join('\n');
    const a = document.createElement('a');
    a.href = 'data:text/csv;charset=utf-8,'+encodeURIComponent(csv);
    a.download = 'timabok_'+todayISO()+'.csv';
    a.click();
  }

  // ── Inject quick-log button into job rows ─────────────────────────────────
  // Works by watching for verkbeidnir table rows and injecting a ⏱ button
  const _injObs = new MutationObserver(() => {
    document.querySelectorAll('[data-job-id]:not([data-tima-injected]), tr[data-id]:not([data-tima-injected])').forEach(row => {
      const jobId  = row.dataset.jobId || row.dataset.id;
      const jobNum = row.dataset.num   || row.dataset.jobNum || '';
      if (!jobId) return;
      row.dataset.timaInjected = '1';
      const actions = row.querySelector('.row-actions, .job-actions');
      if (!actions) return;
      const btn = document.createElement('button');
      btn.className = 'btn btn-ghost btn-sm';
      btn.title = 'Skrá tíma';
      btn.innerHTML = '⏱';
      btn.onclick = e => { e.stopPropagation(); TimeTracking._openNew(jobId, jobNum); };
      actions.appendChild(btn);
    });
  });
  _injObs.observe(document.body, { childList:true, subtree:true });

  // ── SwitchView patch ──────────────────────────────────────────────────────
  (function patchSwitchView() {
    if (typeof App==='undefined') { setTimeout(patchSwitchView,200); return; }
    if (App.switchView?._timaPatch) return;
    const orig = App.switchView.bind(App);
    App.switchView = function(v) {
      if (v==='timabok') {
        document.querySelectorAll('.view').forEach(el=>el.classList.remove('active'));
        document.querySelectorAll('.vnav-btn').forEach(el=>el.classList.toggle('active', el.dataset.view==='timabok'));
        const vEl = document.getElementById('view-timabok');
        if (vEl) vEl.classList.add('active');
        document.dispatchEvent(new CustomEvent('view-shown',{detail:'timabok'}));
        return;
      }
      orig(v);
    };
    App.switchView._timaPatch = true;
  })();

  document.addEventListener('view-shown', e => { if (e.detail==='timabok') load(); });

  window.TimeTracking = { load, _openNew, _save, _delete, _setPeriod, _exportCsv };
  console.log('[time-tracking] installed');
})();
/* === END TIME TRACKING === */
