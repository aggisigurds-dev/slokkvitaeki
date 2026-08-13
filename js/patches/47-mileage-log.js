/* === AKSTURSDAGBÓK / MILEAGE LOG v1 === */
/* Per-trip mileage log for tax-compliant vehicle deductions (RSK).
 *
 * Each row: dagsetning, frá, til, km, erindi, tæknimaður, job_num.
 * Configurable km-rate (default 130 kr/km — current 2026 Icelandic rate).
 * CSV export for tax filing.
 *
 * Required SQL:
 *   CREATE TABLE IF NOT EXISTS akstursdagbok (
 *     id BIGSERIAL PRIMARY KEY,
 *     dagsetning DATE NOT NULL DEFAULT CURRENT_DATE,
 *     fra TEXT, til TEXT,
 *     km NUMERIC NOT NULL DEFAULT 0,
 *     erindi TEXT, taeknimadur TEXT,
 *     job_id BIGINT, job_num TEXT,
 *     created_at TIMESTAMPTZ DEFAULT NOW()
 *   );
 *   ALTER TABLE akstursdagbok ENABLE ROW LEVEL SECURITY;
 *   DROP POLICY IF EXISTS "Allow all akstursdagbok" ON akstursdagbok;
 *   CREATE POLICY "Allow all akstursdagbok" ON akstursdagbok FOR ALL USING (true) WITH CHECK (true);
 */
(() => {
  if (window.__mileageLogInstalled) return;
  window.__mileageLogInstalled = true;

  function getSB() { return window.DB && window.DB.sb; }
  function esc(s)  { return String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function fmtDate(d) { if(!d)return''; const x=new Date(d); return x.getDate()+'.'+(x.getMonth()+1)+'.'+x.getFullYear(); }
  function fmtKr(n) { if(!n&&n!==0)return'—'; const s=Math.round(n).toString(); const r=[]; let t=s; while(t.length>3){r.unshift(t.slice(-3));t=t.slice(0,-3);}r.unshift(t);return r.join('.')+' kr'; }
  function fmtKm(n) { return (n||0).toFixed(1)+' km'; }

  function getKmRate() { return parseInt(localStorage.getItem('cfg_km_rate')||'130')||130; }
  function getDefaultTech() { return localStorage.getItem('cfg_default_tech')||localStorage.getItem('insp_tech')||''; }

  let entries = [];
  let period = 'month'; // 'week' | 'month' | 'all'

  // ── CSS ───────────────────────────────────────────────────────────────────
  if (!document.getElementById('akstur-style')) {
    const s = document.createElement('style');
    s.id = 'akstur-style';
    s.textContent = `
      #view-akstur .ak-wrap { max-width:1180px; margin:0 auto; }
      #view-akstur .ak-hd { display:flex; align-items:center; justify-content:space-between; margin-bottom:14px; flex-wrap:wrap; gap:8px; }
      #view-akstur h1 { margin:0; font-size:20px; font-weight:600; }
      #view-akstur .ak-sub { color:var(--ink3,#64748b); font-size:13px; margin-top:2px; }
      #view-akstur .ak-period { display:flex; gap:4px; }
      #view-akstur .ak-period button { padding:6px 12px; border:1px solid var(--brd,#e2e8f0); background:#fff; border-radius:6px; font-size:12px; cursor:pointer; }
      #view-akstur .ak-period button.active { background:var(--blu,#3b82f6); color:#fff; border-color:var(--blu,#3b82f6); }
      #view-akstur .ak-cards { display:grid; grid-template-columns:repeat(auto-fit, minmax(180px, 1fr)); gap:10px; margin-bottom:14px; }
      #view-akstur .ak-card { background:#fff; border:1px solid var(--brd,#e2e8f0); border-radius:10px; padding:14px; }
      #view-akstur .ak-card .lbl { font-size:11px; color:var(--ink3,#64748b); text-transform:uppercase; letter-spacing:.05em; }
      #view-akstur .ak-card .val { font-size:22px; font-weight:700; margin-top:4px; }
      #view-akstur table { width:100%; border-collapse:collapse; background:#fff; border-radius:10px; overflow:hidden; box-shadow:0 1px 3px rgba(0,0,0,.04); }
      #view-akstur th, #view-akstur td { padding:8px 10px; text-align:left; font-size:13px; border-bottom:1px solid var(--bg2,#f1f5f9); }
      #view-akstur th { background:#f8fafc; font-weight:600; font-size:11px; text-transform:uppercase; letter-spacing:.05em; color:var(--ink3,#64748b); }
      #view-akstur tr:hover td { background:#fafbfc; }
      #view-akstur .ak-empty { padding:40px; text-align:center; color:var(--ink3,#64748b); }
      .ak-modal-wrap { position:fixed; inset:0; z-index:99999; display:flex; align-items:center; justify-content:center; background:rgba(0,0,0,.45); padding:16px; }
      .ak-modal { background:#fff; border-radius:14px; padding:22px; max-width:480px; width:100%; box-shadow:0 24px 64px rgba(0,0,0,.25); }
      .ak-modal h3 { margin:0 0 14px; font-size:16px; font-weight:700; }
      .ak-modal .row { display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:8px; }
      .ak-modal label { font-size:11px; color:var(--ink3,#64748b); display:block; margin-bottom:2px; font-weight:600; text-transform:uppercase; letter-spacing:.04em; }
      .ak-modal input, .ak-modal textarea { width:100%; padding:8px 10px; border:1px solid var(--brd,#e2e8f0); border-radius:6px; font:inherit; box-sizing:border-box; }
      .ak-modal textarea { resize:vertical; min-height:60px; }
      .ak-modal .actions { display:flex; gap:8px; justify-content:flex-end; margin-top:14px; }
      .ak-mileage-btn { background:none; border:none; cursor:pointer; padding:6px; font-size:18px; }
    `;
    document.head.appendChild(s);
  }

  // ── Nav button + view container ───────────────────────────────────────────
  function ensureNav() {
    if (document.querySelector('.vnav-btn[data-view="akstur"]')) return;
    const sample = document.querySelector('.vnav-btn[data-view="timar"]') || document.querySelector('.vnav-btn[data-view="utgjold"]');
    if (!sample) return;
    const btn = sample.cloneNode(false);
    btn.className = sample.className.replace(/\bactive\b/g,'').trim();
    btn.dataset.view = 'akstur';
    btn.textContent = '🚗 Akstur';
    btn.onclick = () => window.App && window.App.switchView && window.App.switchView('akstur');
    sample.parentElement.insertBefore(btn, sample.nextSibling);
  }

  function ensureView() {
    if (document.getElementById('view-akstur')) return;
    const sample = document.getElementById('view-timar') || document.getElementById('view-utgjold');
    if (!sample || !sample.parentElement) return;
    const v = document.createElement('div');
    v.id = 'view-akstur';
    v.className = sample.className.replace(/\bactive\b/g,'').trim();
    v.innerHTML = '<main id="ak-main" class="main-panel"></main>';
    sample.parentElement.appendChild(v);
  }

  function getMain() { return document.querySelector('#view-akstur #ak-main'); }

  // ── Patch App.switchView ──────────────────────────────────────────────────
  function patchSwitch() {
    if (!window.App || window.App._akPatch) return;
    const orig = window.App.switchView;
    window.App.switchView = function(view) {
      if (view === 'akstur') {
        ensureView();
        document.querySelectorAll('[id^="view-"]').forEach(v => { v.style.display = 'none'; v.classList.remove('active'); });
        const v = document.getElementById('view-akstur');
        if (v) { v.style.display = 'block'; v.classList.add('active'); }
        document.querySelectorAll('.vnav-btn').forEach(b => b.classList.toggle('active', b.dataset.view==='akstur'));
        load();
        return;
      }
      orig.apply(this, arguments);
    };
    window.App._akPatch = true;
  }

  // ── Load + render ─────────────────────────────────────────────────────────
  async function load() {
    const main = getMain();
    if (!main) return;
    main.innerHTML = '<div class="ak-empty">Hleður…</div>';

    const SB = getSB();
    if (!SB) { main.innerHTML = '<div class="ak-empty">Engin tenging við gagnagrunn</div>'; return; }

    let q = SB.from('akstursdagbok').select('*').order('dagsetning', { ascending:false });
    if (period === 'week') {
      const d = new Date(); d.setDate(d.getDate()-7);
      q = q.gte('dagsetning', d.toISOString().slice(0,10));
    } else if (period === 'month') {
      const d = new Date(); d.setMonth(d.getMonth()-1);
      q = q.gte('dagsetning', d.toISOString().slice(0,10));
    }
    const { data, error } = await q;
    if (error) {
      if (/relation .* does not exist/i.test(error.message||'')) {
        main.innerHTML = `<div class="ak-empty">⚠️ Taflan <code>akstursdagbok</code> er ekki til.<br>Keyrðu MIGRATION.sql í Supabase til að bæta henni við.</div>`;
      } else {
        main.innerHTML = `<div class="ak-empty">Villa: ${esc(error.message)}</div>`;
      }
      return;
    }
    entries = data || [];
    render();
  }

  function render() {
    const main = getMain();
    if (!main) return;

    const totalKm = entries.reduce((s,e)=>s+(parseFloat(e.km)||0),0);
    const rate = getKmRate();
    const totalKr = Math.round(totalKm * rate);
    const byTech = {};
    entries.forEach(e => {
      const t = e.taeknimadur || '—';
      if (!byTech[t]) byTech[t] = { km:0, count:0 };
      byTech[t].km += parseFloat(e.km)||0;
      byTech[t].count++;
    });

    main.innerHTML = `
      <div class="ak-wrap">
        <div class="ak-hd">
          <div>
            <h1>🚗 Akstursdagbók</h1>
            <div class="ak-sub">Skráning aksturs til skattaskýrslu — ${rate} kr/km <a href="#" onclick="event.preventDefault();MileageLog._setRate()" style="color:var(--blu);text-decoration:none">(breyta)</a></div>
          </div>
          <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
            <div class="ak-period">
              <button class="${period==='week'?'active':''}" onclick="MileageLog._period('week')">Vika</button>
              <button class="${period==='month'?'active':''}" onclick="MileageLog._period('month')">Mánuður</button>
              <button class="${period==='all'?'active':''}" onclick="MileageLog._period('all')">Allt</button>
            </div>
            <button class="btn btn-outline" onclick="MileageLog._exportCsv()">📤 CSV</button>
            <button class="btn btn-primary" onclick="MileageLog._openNew()">+ Ný ferð</button>
          </div>
        </div>

        <div class="ak-cards">
          <div class="ak-card"><div class="lbl">Heildarakstur</div><div class="val">${fmtKm(totalKm)}</div></div>
          <div class="ak-card"><div class="lbl">Áætluð endurgreiðsla</div><div class="val">${fmtKr(totalKr)}</div></div>
          <div class="ak-card"><div class="lbl">Færslur</div><div class="val">${entries.length}</div></div>
        </div>

        ${Object.keys(byTech).length>1 ? `
          <div style="margin-bottom:14px">
            <div style="font-size:11px;color:var(--ink3);text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px">Eftir tæknimönnum</div>
            <div style="display:flex;flex-wrap:wrap;gap:8px">
              ${Object.entries(byTech).map(([t,d]) => `
                <div style="background:#fff;border:1px solid var(--brd,#e2e8f0);border-radius:8px;padding:8px 12px;font-size:12px">
                  <strong>${esc(t)}</strong> · ${fmtKm(d.km)} · ${d.count} ferð${d.count===1?'':'ir'}
                </div>`).join('')}
            </div>
          </div>` : ''}

        ${entries.length ? `
          <table>
            <thead><tr>
              <th>Dagsetning</th><th>Frá</th><th>Til</th><th style="text-align:right">Km</th>
              <th>Erindi</th><th>Tæknimaður</th><th>Verk</th><th></th>
            </tr></thead>
            <tbody>
              ${entries.map(e => `
                <tr>
                  <td>${esc(fmtDate(e.dagsetning))}</td>
                  <td>${esc(e.fra||'')}</td>
                  <td>${esc(e.til||'')}</td>
                  <td style="text-align:right;font-weight:600">${fmtKm(e.km)}</td>
                  <td>${esc(e.erindi||'')}</td>
                  <td>${esc(e.taeknimadur||'')}</td>
                  <td>${esc(e.job_num||'')}</td>
                  <td><button class="btn btn-sm btn-outline" onclick="MileageLog._delete(${e.id})">🗑</button></td>
                </tr>`).join('')}
            </tbody>
          </table>` : '<div class="ak-empty">Engar ferðir skráðar á þessu tímabili.</div>'}
      </div>`;
  }

  // ── Modal: new entry ──────────────────────────────────────────────────────
  function _openNew(jobId, jobNum) {
    document.getElementById('ak-modal')?.remove();
    const today = new Date().toISOString().slice(0,10);
    const m = document.createElement('div');
    m.id = 'ak-modal';
    m.className = 'ak-modal-wrap';
    m.onclick = e => { if(e.target===m) m.remove(); };
    m.innerHTML = `
      <div class="ak-modal">
        <h3>+ Ný akstursfærsla</h3>
        <div class="row">
          <div><label>Dagsetning</label><input type="date" id="ak-date" value="${today}"></div>
          <div><label>Tæknimaður</label><input type="text" id="ak-tech" value="${esc(getDefaultTech())}"></div>
        </div>
        <div class="row">
          <div><label>Frá</label><input type="text" id="ak-fra" placeholder="Reykjavík"></div>
          <div><label>Til</label><input type="text" id="ak-til" placeholder="Akureyri"></div>
        </div>
        <div class="row">
          <div><label>Km</label><input type="number" id="ak-km" min="0" step="0.1" placeholder="0"></div>
          <div><label>Verk #</label><input type="text" id="ak-job" value="${esc(jobNum||'')}" placeholder="(valfrjálst)"></div>
        </div>
        <div><label>Erindi</label><textarea id="ak-erindi" placeholder="t.d. Þjónusta hjá viðskiptavin"></textarea></div>
        <input type="hidden" id="ak-job-id" value="${esc(jobId||'')}">
        <div class="actions">
          <button class="btn btn-outline" onclick="document.getElementById('ak-modal').remove()">Hætta við</button>
          <button class="btn btn-primary" onclick="MileageLog._save()">Vista</button>
        </div>
      </div>`;
    document.body.appendChild(m);
    setTimeout(() => document.getElementById('ak-fra')?.focus(), 50);
  }

  async function _save() {
    const SB = getSB();
    if (!SB) return;
    const rec = {
      dagsetning: document.getElementById('ak-date').value || new Date().toISOString().slice(0,10),
      fra:        document.getElementById('ak-fra').value.trim(),
      til:        document.getElementById('ak-til').value.trim(),
      km:         parseFloat(document.getElementById('ak-km').value)||0,
      erindi:     document.getElementById('ak-erindi').value.trim(),
      taeknimadur:document.getElementById('ak-tech').value.trim(),
      job_id:     parseInt(document.getElementById('ak-job-id').value)||null,
      job_num:    document.getElementById('ak-job').value.trim()||null
    };
    if (!rec.km) { alert('Sláðu inn km'); return; }
    const { error } = await SB.from('akstursdagbok').insert(rec);
    if (error) { alert('Villa: '+error.message); return; }
    document.getElementById('ak-modal').remove();
    load();
  }

  async function _delete(id) {
    if (!await Confirm.show('Eyða þessari færslu?')) return;
    const { error } = await getSB().from('akstursdagbok').delete().eq('id', id);
    if (error) { alert('Villa: '+error.message); return; }
    load();
  }

  function _period(p) { period = p; load(); }

  function _setRate() {
    const cur = getKmRate();
    const v = prompt('Km-gjald (kr/km):', cur);
    if (v===null) return;
    const n = parseInt(v)||130;
    localStorage.setItem('cfg_km_rate', n);
    render();
  }

  function _exportCsv() {
    if (!entries.length) { alert('Engar færslur til að flytja út'); return; }
    const head = ['Dagsetning','Frá','Til','Km','Erindi','Tæknimaður','Verk','Endurgr.kr'];
    const rate = getKmRate();
    const rows = entries.map(e => [
      e.dagsetning, e.fra||'', e.til||'', e.km||0, e.erindi||'',
      e.taeknimadur||'', e.job_num||'', Math.round((e.km||0)*rate)
    ]);
    const csv = [head, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob = new Blob(['﻿'+csv], { type:'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `akstursdagbok-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
  }

  // ── Inject 🚗 button into job rows ────────────────────────────────────────
  const _obs = new MutationObserver(() => {
    document.querySelectorAll('[data-job-id]:not([data-mileage-injected])').forEach(row => {
      const jobId  = row.dataset.jobId;
      const jobNum = row.dataset.num || row.dataset.jobNum || '';
      if (!jobId) return;
      row.dataset.mileageInjected = '1';
      const actions = row.querySelector('.row-actions, .job-actions');
      if (!actions) return;
      const btn = document.createElement('button');
      btn.className = 'ak-mileage-btn';
      btn.title = 'Skrá akstur';
      btn.innerHTML = '🚗';
      btn.onclick = e => { e.stopPropagation(); _openNew(jobId, jobNum); };
      actions.appendChild(btn);
    });
  });

  // ── Initialize ────────────────────────────────────────────────────────────
  function init() {
    ensureNav();
    ensureView();
    patchSwitch();
    _obs.observe(document.body, { childList:true, subtree:true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else setTimeout(init, 800);
  // Keep retrying nav injection in case App loads later
  setTimeout(init, 1500);
  setTimeout(init, 3000);

  window.MileageLog = { load, _openNew, _save, _delete, _period, _setRate, _exportCsv };
  console.log('[mileage-log] installed');
})();
/* === END AKSTURSDAGBÓK === */
