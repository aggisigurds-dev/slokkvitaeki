/* === WEEKLY REPORT / VIKULEGT YFIRLIT v1 === */
/* Generates a printable weekly summary report for the business owner.
 *
 * Accessible from:
 *   - Dashboard quick action → "📊 Vikulegt skýrsla"
 *   - Report modal triggered by BulkReports.open()
 *
 * The report covers a selectable week and shows:
 *   • Jobs completed / in progress
 *   • Revenue (from solur)
 *   • Inspections done (last_insp updated this week in þjonustutaeki)
 *   • Time logged (from timabok — if installed)
 *   • Expenses (from utgjalda_log — if installed)
 *   • Stock used (from birgdir notes — if available)
 *   • Calendar events
 *
 * No new SQL tables required — reads existing tables.
 * Uses window.print() with @media print for clean A4 output.
 */
(() => {
  if (window.__weeklyReportInstalled) return;
  window.__weeklyReportInstalled = true;

  function getSB() { return window.DB && window.DB.sb; }
  function esc(s) { return String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function fmtKr(n) { if(!n&&n!==0)return'—'; const s=Math.round(n).toString(); const r=[]; let t=s; while(t.length>3){r.unshift(t.slice(-3));t=t.slice(0,-3);}r.unshift(t);return r.join('.')+' kr'; }
  function fmtDate(iso) {
    if(!iso)return'';
    const d=new Date(iso);
    return d.getDate()+'. '+['jan','feb','mar','apr','maí','jún','júl','ágú','sep','okt','nóv','des'][d.getMonth()]+' '+d.getFullYear();
  }
  function fmtHours(min) { const h=Math.floor((min||0)/60); const m=(min||0)%60; return h?`${h} klst${m?` ${m} mín`:''}`:m+' mín'; }

  function isoWeekBounds(weekOffset) {
    // Returns [monday ISO, sunday ISO] for current week + offset
    const now = new Date();
    const day = now.getDay() || 7; // 1=Mon..7=Sun
    const mon = new Date(now);
    mon.setDate(now.getDate() - day + 1 + weekOffset*7);
    mon.setHours(0,0,0,0);
    const sun = new Date(mon);
    sun.setDate(mon.getDate()+6);
    const fmt = d => d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
    return [fmt(mon), fmt(sun)];
  }

  // ── Print stylesheet ──────────────────────────────────────────────────────
  if (!document.getElementById('wreport-print-style')) {
    const s = document.createElement('style');
    s.id = 'wreport-print-style';
    s.textContent = `
      @media print {
        body > *:not(#wreport-frame) { display:none !important; }
        #wreport-frame { display:block !important; position:static !important; }
        .wreport-actions { display:none !important; }
      }
      #wreport-frame {
        display:none; position:fixed; inset:0; z-index:999999;
        background:#fff; overflow-y:auto;
      }
      .wrep-page {
        width:210mm; min-height:280mm; margin:0 auto; padding:18mm 16mm;
        font-family:'IBM Plex Sans',Arial,sans-serif; font-size:10pt; color:#1e293b; box-sizing:border-box;
      }
      .wrep-hd { display:flex; justify-content:space-between; align-items:flex-start; border-bottom:2px solid #C93C1D; padding-bottom:10px; margin-bottom:16px; }
      .wrep-co  { font-size:14pt; font-weight:700; color:#C93C1D; }
      .wrep-title { font-size:13pt; font-weight:700; text-align:right; }
      .wrep-week  { font-size:9pt; color:#64748b; text-align:right; margin-top:2px; }
      .wrep-kpi   { display:grid; grid-template-columns:repeat(4,1fr); gap:10px; margin-bottom:16px; }
      .wrep-kpi-card { border:1px solid #e2e8f0; border-radius:6px; padding:10px 12px; }
      .wrep-kpi-label { font-size:7.5pt; text-transform:uppercase; letter-spacing:.05em; color:#64748b; font-weight:600; margin-bottom:4px; }
      .wrep-kpi-val   { font-size:16pt; font-weight:700; color:#1e293b; line-height:1; }
      .wrep-section { margin-bottom:16px; }
      .wrep-section h3 { font-size:8.5pt; text-transform:uppercase; letter-spacing:.05em; color:#64748b; font-weight:700; margin:0 0 6px; border-bottom:1px solid #e2e8f0; padding-bottom:3px; }
      .wrep-tbl { width:100%; border-collapse:collapse; font-size:8.5pt; }
      .wrep-tbl th { background:#f8fafc; border:1px solid #e2e8f0; padding:5px 7px; font-weight:600; text-align:left; }
      .wrep-tbl td { border:1px solid #e2e8f0; padding:5px 7px; vertical-align:top; }
      .wrep-tbl tr:nth-child(even) td { background:#f8fafc; }
      .wrep-footer { margin-top:20px; border-top:1px solid #e2e8f0; padding-top:8px; font-size:7.5pt; color:#94a3b8; display:flex; justify-content:space-between; }
      .wreport-actions { position:fixed; bottom:20px; right:20px; display:flex; gap:8px; z-index:9999999; }
      .wrep-modal-wrap { position:fixed; inset:0; z-index:99999; display:flex; align-items:center; justify-content:center; background:rgba(0,0,0,.45); padding:16px; }
      .wrep-modal { background:#fff; border-radius:14px; padding:24px; max-width:400px; width:100%; box-shadow:0 20px 60px rgba(0,0,0,.25); font-family:inherit; }
    `;
    document.head.appendChild(s);
  }

  // ── Open report picker ────────────────────────────────────────────────────
  function open() {
    document.getElementById('wreport-picker')?.remove();
    const m = document.createElement('div');
    m.id = 'wreport-picker';
    m.className = 'wrep-modal-wrap';
    m.onclick = e => { if(e.target===m) m.remove(); };
    const weekOpts = [-3,-2,-1,0].map(o => {
      const [mon,sun] = isoWeekBounds(o);
      const label = o===0 ? 'Þessi vika' : o===-1 ? 'Síðasta vika' : `Vika (${fmtDate(mon)} – ${fmtDate(sun)})`;
      return `<option value="${o}" ${o===0?'selected':''}>${label}</option>`;
    }).join('');
    m.innerHTML = `
      <div class="wrep-modal">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
          <div style="font-size:15px;font-weight:700">📊 Vikulegt yfirlit</div>
          <button onclick="document.getElementById('wreport-picker')?.remove()" style="background:none;border:none;font-size:18px;cursor:pointer;color:#64748b">✕</button>
        </div>
        <div class="fg"><label class="fl">Vika</label>
          <select class="fi" id="wrep-week-sel">${weekOpts}</select>
        </div>
        <div style="display:flex;gap:8px;margin-top:16px;justify-content:flex-end">
          <button class="btn btn-outline" onclick="document.getElementById('wreport-picker')?.remove()">Hætta við</button>
          <button class="btn btn-primary" onclick="WeeklyReport._generate(parseInt(document.getElementById('wrep-week-sel').value))">📊 Búa til skýrslu</button>
        </div>
      </div>`;
    document.body.appendChild(m);
  }

  // ── Generate report ───────────────────────────────────────────────────────
  async function _generate(weekOffset) {
    document.getElementById('wreport-picker')?.remove();
    const [from, to] = isoWeekBounds(weekOffset||0);
    const toEnd = to + 'T23:59:59';
    const fromStart = from + 'T00:00:00';

    const SB = getSB();
    if (!SB) { if(window.Toast) Toast.show('Gagngrunnur ekki tengdur'); return; }

    if(window.Toast) Toast.show('Hleður gögn…');

    // Fetch all data in parallel (graceful fallback for missing tables)
    const safe = async p => { try { return await p; } catch (e) { return { data:[], error:e }; } };

    const [jobsRes, solurRes, inspRes, eventsRes, timaRes, utgRes] = await Promise.all([
      SB.from('verkbeidnir').select('id,num,customer,status,created_at').gte('created_at', fromStart).lte('created_at', toEnd),
      SB.from('solur').select('samtals,greitt_med,paid_at,created_at').gte('created_at', fromStart).lte('created_at', toEnd),
      safe(SB.from('þjonustutaeki').select('serial,tegund,company_nafn,client,last_insp').gte('last_insp', from).lte('last_insp', to)),
      safe(SB.from('dagbok').select('title,scheduled_start,assigned_to,status').gte('scheduled_start', fromStart).lte('scheduled_start', toEnd).neq('status','cancelled').order('scheduled_start')),
      safe(SB.from('timabok').select('tæknimaður,mínútur,dagsetning').gte('dagsetning', from).lte('dagsetning', to)),
      safe(SB.from('utgjalda_log').select('lýsing,flokkur,upphæð,dagsetning').gte('dagsetning', from).lte('dagsetning', to))
    ]);

    const jobs      = jobsRes.data  || [];
    const solur     = solurRes.data || [];
    const insps     = inspRes.data  || [];
    const events    = eventsRes.data|| [];
    const timaEntries= timaRes.data || [];
    const utgEntries = utgRes.data  || [];

    const revenue   = solur.reduce((s,r)=>s+(r.samtals||0),0);
    const totalMins = timaEntries.reduce((s,e)=>s+(e.mínútur||0),0);
    const totalUtg  = utgEntries.reduce((s,e)=>s+(e.upphæð||0),0);
    const doneJobs  = jobs.filter(j=>j.status==='Afhent'||j.status==='Tilbúið');

    // Per-tech hours
    const byTech = {};
    timaEntries.forEach(e => { byTech[e.tæknimaður||'?'] = (byTech[e.tæknimaður||'?']||0)+(e.mínútur||0); });

    // Build HTML
    const kpiHtml = `
      <div class="wrep-kpi-card"><div class="wrep-kpi-label">Verk opnuð</div><div class="wrep-kpi-val">${jobs.length}</div></div>
      <div class="wrep-kpi-card"><div class="wrep-kpi-label">Lokið / Afhent</div><div class="wrep-kpi-val">${doneJobs.length}</div></div>
      <div class="wrep-kpi-card"><div class="wrep-kpi-label">Tekjur</div><div class="wrep-kpi-val" style="font-size:${revenue>999999?'10':'14'}pt">${fmtKr(revenue)}</div></div>
      <div class="wrep-kpi-card"><div class="wrep-kpi-label">Skoðanir</div><div class="wrep-kpi-val">${insps.length}</div></div>`;

    const jobsTableRows = jobs.map(j=>`<tr>
      <td style="font-family:monospace">${esc(j.num||j.id)}</td>
      <td>${esc(j.customer||'')}</td>
      <td>${esc(j.status||'')}</td>
    </tr>`).join('') || '<tr><td colspan="3" style="text-align:center;color:#94a3b8">Engin verk</td></tr>';

    const inspRows = insps.slice(0,20).map(i=>`<tr>
      <td style="font-family:monospace">${esc(i.serial||'?')}</td>
      <td>${esc(i.tegund||'')}</td>
      <td>${esc(i.company_nafn||i.client||'')}</td>
    </tr>`).join('') || '<tr><td colspan="3" style="text-align:center;color:#94a3b8">Engar skoðanir skráðar þessa viku</td></tr>';

    const techRows = Object.entries(byTech).sort((a,b)=>b[1]-a[1]).map(([t,m])=>`<tr>
      <td>${esc(t)}</td><td>${fmtHours(m)}</td>
    </tr>`).join('') || '<tr><td colspan="2" style="text-align:center;color:#94a3b8">Engar tímaskráningar</td></tr>';

    const utgRows = utgEntries.map(e=>`<tr>
      <td>${esc(e.dagsetning||'')}</td><td>${esc(e.flokkur||'')}</td><td>${esc(e.lýsing||'')}</td><td style="text-align:right">${fmtKr(e.upphæð)}</td>
    </tr>`).join('') || '<tr><td colspan="4" style="text-align:center;color:#94a3b8">Engar útgjaldafærslur</td></tr>';

    const eventRows = events.map(e=>`<tr>
      <td>${e.scheduled_start?new Date(e.scheduled_start).toLocaleDateString('is-IS'):''}</td>
      <td>${esc(e.title||'')}</td>
      <td>${esc(e.assigned_to||'')}</td>
    </tr>`).join('') || '<tr><td colspan="3" style="text-align:center;color:#94a3b8">Engar dagbókarfærslur</td></tr>';

    const certNum = 'W-'+from.replace(/-/g,'');

    const html = `
      <div class="wrep-page">
        <div class="wrep-hd">
          <div>
            <div class="wrep-co">Slökkvitæki ehf</div>
            <div style="font-size:8pt;color:#64748b">Brunakerfi · Skoðun og þjónusta</div>
          </div>
          <div>
            <div class="wrep-title">📊 Vikulegt yfirlit</div>
            <div class="wrep-week">${fmtDate(from)} – ${fmtDate(to)}</div>
          </div>
        </div>

        <div class="wrep-kpi">${kpiHtml}</div>

        <div class="wrep-section">
          <h3>Verkbeiðnir þessa viku (${jobs.length})</h3>
          <table class="wrep-tbl"><thead><tr><th>Nr.</th><th>Viðskiptavinur</th><th>Staða</th></tr></thead>
          <tbody>${jobsTableRows}</tbody></table>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
          <div class="wrep-section">
            <h3>Skoðanir framkvæmdar (${insps.length})</h3>
            <table class="wrep-tbl"><thead><tr><th>Raðnr.</th><th>Tegund</th><th>Fyrirtæki</th></tr></thead>
            <tbody>${inspRows}</tbody></table>
          </div>
          <div class="wrep-section">
            <h3>Tímar per tæknimann</h3>
            <table class="wrep-tbl"><thead><tr><th>Tæknimaður</th><th>Skráðar klst.</th></tr></thead>
            <tbody>${techRows}</tbody>
            ${totalMins?`<tfoot><tr><td style="font-weight:700">Samtals</td><td style="font-weight:700">${fmtHours(totalMins)}</td></tr></tfoot>`:''}
            </table>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
          <div class="wrep-section">
            <h3>Útgjöld (${fmtKr(totalUtg)})</h3>
            <table class="wrep-tbl"><thead><tr><th>Dags.</th><th>Flokkur</th><th>Lýsing</th><th>Upphæð</th></tr></thead>
            <tbody>${utgRows}</tbody></table>
          </div>
          <div class="wrep-section">
            <h3>Dagbókarfærslur (${events.length})</h3>
            <table class="wrep-tbl"><thead><tr><th>Dags.</th><th>Titill</th><th>Tengill</th></tr></thead>
            <tbody>${eventRows}</tbody></table>
          </div>
        </div>

        <div class="wrep-footer">
          <span>Slökkvitæki ehf · Skýrsla búin til ${fmtDate(new Date().toISOString().slice(0,10))}</span>
          <span>${certNum}</span>
        </div>
      </div>`;

    // Show frame
    let frame = document.getElementById('wreport-frame');
    if (!frame) { frame=document.createElement('div'); frame.id='wreport-frame'; document.body.appendChild(frame); }
    frame.innerHTML = html;
    frame.style.display = 'block';

    const actions = document.createElement('div');
    actions.className = 'wreport-actions';
    actions.innerHTML = `
      <button onclick="window.print()" style="padding:10px 18px;background:#C93C1D;color:#fff;border:none;border-radius:8px;font:inherit;font-size:13px;font-weight:600;cursor:pointer">🖨 Prenta / Vista PDF</button>
      <button onclick="document.getElementById('wreport-frame').style.display='none'" style="padding:10px 18px;background:#f1f5f9;border:1px solid #e2e8f0;border-radius:8px;font:inherit;font-size:13px;cursor:pointer">✕ Loka</button>`;
    frame.appendChild(actions);
  }

  // ── Expose globally ───────────────────────────────────────────────────────
  window.WeeklyReport = { open, _generate };

  // ── Inject into dashboard quick actions if present ────────────────────────
  const _obs = new MutationObserver(() => {
    const dashActions = document.querySelector('.dash-actions');
    if (!dashActions || dashActions.querySelector('.wrep-dash-btn')) return;
    const btn = document.createElement('button');
    btn.className = 'dash-act-btn wrep-dash-btn';
    btn.innerHTML = '📊 Vikulegt skýrsla';
    btn.onclick = () => WeeklyReport.open();
    dashActions.appendChild(btn);
  });
  _obs.observe(document.body, { childList:true, subtree:true });

  console.log('[weekly-report] installed');
})();
/* === END WEEKLY REPORT === */
