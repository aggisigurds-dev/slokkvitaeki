/* === JOB PROFITABILITY / ARÐSEMI VERKS v1 === */
/* Per-job cost analysis: revenue vs time vs expenses vs parts.
 *
 * Accessible via:
 *   - "📈 Arðsemi" button injected into job detail panels
 *   - window.JobProfit.open(jobId, jobNum, customer) callable from anywhere
 *
 * Requires patches 40 (time tracking) and 41 (expense tracking) for full data.
 * Falls back gracefully if those tables don't exist yet.
 *
 * Shows:
 *   - Revenue (manual entry — links to solur by job ref if available)
 *   - Labor cost (timabok minutes × hourly rate from settings)
 *   - Expenses (utgjalda_log total)
 *   - Gross profit + margin %
 *   - Breakdown bar chart
 *
 * Settings: hourly rate stored in localStorage 'job_hourly_rate' (default 12000 kr/hr).
 * No new SQL tables required.
 */
(() => {
  if (window.__jobProfitInstalled) return;
  window.__jobProfitInstalled = true;

  function getSB() { return window.DB && window.DB.sb; }
  function esc(s) { return String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function fmtKr(n) { if(!n&&n!==0)return'—'; const s=Math.round(n).toString(); const r=[]; let t=s; while(t.length>3){r.unshift(t.slice(-3));t=t.slice(0,-3);}r.unshift(t);return r.join('.')+' kr'; }
  function fmtHours(min) { const h=Math.floor((min||0)/60); const m=(min||0)%60; return h?`${h} klst${m?` ${m} mín`:''}`:m+' mín'; }

  function getHourlyRate() { return parseInt(localStorage.getItem('job_hourly_rate')||'12000')||12000; }

  // ── CSS ───────────────────────────────────────────────────────────────────
  if (!document.getElementById('jprofit-style')) {
    const s = document.createElement('style');
    s.id = 'jprofit-style';
    s.textContent = `
      .jprofit-modal-wrap { position:fixed; inset:0; z-index:99999; display:flex; align-items:center; justify-content:center; background:rgba(0,0,0,.45); padding:16px; }
      .jprofit-modal { background:#fff; border-radius:16px; padding:28px; max-width:480px; width:100%; box-shadow:0 24px 64px rgba(0,0,0,.28); font-family:inherit; }
      .jprofit-modal-hd { display:flex; align-items:center; justify-content:space-between; margin-bottom:20px; }
      .jprofit-row { display:flex; align-items:center; justify-content:space-between; padding:8px 0; border-bottom:1px solid var(--bg2,#f1f5f9); font-size:13px; }
      .jprofit-row:last-child { border-bottom:none; }
      .jprofit-label { color:var(--ink2,#475569); }
      .jprofit-val   { font-weight:700; text-align:right; }
      .jprofit-profit-row { display:flex; align-items:center; justify-content:space-between; padding:12px 16px; border-radius:10px; margin-top:12px; font-size:14px; font-weight:700; }
      .jprofit-bar-track { background:var(--bg2,#f1f5f9); border-radius:6px; height:10px; overflow:hidden; margin:8px 0; }
      .jprofit-bar-fill  { height:10px; border-radius:6px; transition:width .5s; }
      .jprofit-section { font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.05em; color:var(--ink3,#64748b); margin:16px 0 8px; }
    `;
    document.head.appendChild(s);
  }

  // ── Open modal ────────────────────────────────────────────────────────────
  async function open(jobId, jobNum, customer) {
    document.getElementById('jprofit-modal')?.remove();

    const SB = getSB();
    let timeMins = 0, expTotal = 0;

    if (SB && jobNum) {
      const safe = async p => { try { return await p; } catch (e) { return { data:[], error:e }; } };
      const [timaRes, expRes] = await Promise.all([
        safe(SB.from('timabok').select('mínútur').or(`job_id.eq.${jobId||0},job_num.eq.${jobNum}`)),
        safe(SB.from('utgjalda_log').select('upphæð').or(`job_id.eq.${jobId||0},job_num.eq.${jobNum}`))
      ]);
      timeMins  = (timaRes.data||[]).reduce((s,r)=>s+(r.mínútur||0),0);
      expTotal  = (expRes.data||[]).reduce((s,r)=>s+(r.upphæð||0),0);
    }

    const hourlyRate = getHourlyRate();
    const laborCost  = Math.round(timeMins/60 * hourlyRate);
    const storedRev  = parseFloat(localStorage.getItem(`job_rev_${jobNum||jobId}`)||'0')||0;

    const m = document.createElement('div');
    m.id = 'jprofit-modal';
    m.className = 'jprofit-modal-wrap';
    m.onclick = e => { if(e.target===m) m.remove(); };
    m.innerHTML = `
      <div class="jprofit-modal">
        <div class="jprofit-modal-hd">
          <div>
            <div style="font-size:16px;font-weight:700">📈 Arðsemi verks</div>
            <div style="font-size:12px;color:var(--ink3)">${esc(jobNum?'Verk '+jobNum:'')} ${esc(customer||'')}</div>
          </div>
          <button onclick="document.getElementById('jprofit-modal')?.remove()" style="background:none;border:none;font-size:18px;cursor:pointer;color:#64748b">✕</button>
        </div>

        <div class="jprofit-section">Tekjur</div>
        <div class="fg" style="margin-bottom:12px">
          <label class="fl">Reikningsupphæð (kr án VSK) — slá inn handvirkt</label>
          <input class="fi" type="number" id="jp-revenue" min="0" step="1"
            value="${storedRev||''}" placeholder="0"
            oninput="JobProfit._recalc()">
        </div>

        <div class="jprofit-section">Kostnaður</div>
        <div id="jp-breakdown">
          ${_buildBreakdown(timeMins, laborCost, expTotal, hourlyRate, storedRev)}
        </div>

        <div style="margin-top:16px;border-top:1px solid var(--brd,#e2e8f0);padding-top:12px">
          <div style="font-size:11px;color:var(--ink3);margin-bottom:6px">
            Tímagjald: <strong>${fmtKr(hourlyRate)}/klst</strong> ·
            <a href="#" style="color:var(--blu,#3b82f6);text-decoration:none" onclick="event.preventDefault();JobProfit._setRate()">Breyta</a>
          </div>
          <div style="font-size:11px;color:var(--ink3)">
            Skráðir tímar: ${fmtHours(timeMins)} · Skráð útgjöld: ${fmtKr(expTotal)}
          </div>
        </div>

        <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px">
          <button class="btn btn-outline" onclick="document.getElementById('jprofit-modal')?.remove()">Loka</button>
        </div>
      </div>`;
    m.dataset.timeMins   = timeMins;
    m.dataset.expTotal   = expTotal;
    m.dataset.laborCost  = laborCost;
    m.dataset.jobKey     = jobNum||jobId||'';
    document.body.appendChild(m);
  }

  function _buildBreakdown(timeMins, laborCost, expTotal, hourlyRate, revenue) {
    const totalCost = laborCost + expTotal;
    const profit    = revenue - totalCost;
    const margin    = revenue > 0 ? Math.round(profit/revenue*100) : null;
    const isProfit  = profit >= 0;

    const maxBar = Math.max(revenue, totalCost, 1);

    const revBar  = `<div style="font-size:12px;margin-bottom:2px;display:flex;justify-content:space-between"><span style="color:var(--ink3)">Tekjur</span><span style="font-weight:600;color:#16a34a">${fmtKr(revenue)}</span></div>
      <div class="jprofit-bar-track"><div class="jprofit-bar-fill" style="width:${(revenue/maxBar*100).toFixed(1)}%;background:#16a34a"></div></div>`;
    const labBar  = `<div style="font-size:12px;margin-bottom:2px;display:flex;justify-content:space-between"><span style="color:var(--ink3)">Vinnulaun (${fmtHours(timeMins)})</span><span style="font-weight:600;color:#3b82f6">${fmtKr(laborCost)}</span></div>
      <div class="jprofit-bar-track"><div class="jprofit-bar-fill" style="width:${(laborCost/maxBar*100).toFixed(1)}%;background:#3b82f6"></div></div>`;
    const expBar  = expTotal>0 ? `<div style="font-size:12px;margin-bottom:2px;display:flex;justify-content:space-between"><span style="color:var(--ink3)">Útgjöld</span><span style="font-weight:600;color:#f59e0b">${fmtKr(expTotal)}</span></div>
      <div class="jprofit-bar-track"><div class="jprofit-bar-fill" style="width:${(expTotal/maxBar*100).toFixed(1)}%;background:#f59e0b"></div></div>` : '';

    const profitBlock = revenue>0 ? `
      <div class="jprofit-profit-row" style="background:${isProfit?'#f0fdf4':'#fef2f2'};color:${isProfit?'#16a34a':'#dc2626'}">
        <span>${isProfit?'✓ Hagnaður':'✗ Tap'}</span>
        <span>${fmtKr(Math.abs(profit))}${margin!==null?' ('+Math.abs(margin)+'%)':''}</span>
      </div>` : `<div class="jprofit-profit-row" style="background:#f8fafc;color:#64748b"><span>Slá inn tekjur til að sjá arðsemi</span><span>—</span></div>`;

    return revBar+labBar+expBar+profitBlock;
  }

  function _recalc() {
    const m = document.getElementById('jprofit-modal');
    if (!m) return;
    const rev       = parseFloat(document.getElementById('jp-revenue')?.value||0)||0;
    const timeMins  = parseInt(m.dataset.timeMins)||0;
    const expTotal  = parseFloat(m.dataset.expTotal)||0;
    const laborCost = parseFloat(m.dataset.laborCost)||0;
    const hourlyRate= getHourlyRate();
    const key       = m.dataset.jobKey;
    if (key) localStorage.setItem(`job_rev_${key}`, rev);
    const bd = document.getElementById('jp-breakdown');
    if (bd) bd.innerHTML = _buildBreakdown(timeMins, laborCost, expTotal, hourlyRate, rev);
  }

  function _setRate() {
    const cur = getHourlyRate();
    const val = prompt('Tímagjald tæknimanns (kr/klst):', cur);
    if (val===null) return;
    const n = parseInt(val)||12000;
    localStorage.setItem('job_hourly_rate', n);
    // Re-open by triggering recalc with new rate
    _recalc();
  }

  // ── Inject "📈 Arðsemi" button into job detail panels ────────────────────
  const _obs = new MutationObserver(() => {
    // Target panels with a job ID or job num attribute
    document.querySelectorAll('[data-job-id]:not([data-profit-injected])').forEach(row => {
      const jobId  = row.dataset.jobId;
      const jobNum = row.dataset.num || row.dataset.jobNum || '';
      const cust   = row.dataset.customer || '';
      if (!jobId) return;
      row.dataset.profitInjected = '1';
      const actions = row.querySelector('.row-actions, .job-actions');
      if (!actions) return;
      const btn = document.createElement('button');
      btn.className = 'btn btn-ghost btn-sm';
      btn.title = 'Arðsemigreining';
      btn.innerHTML = '📈';
      btn.onclick = e => { e.stopPropagation(); JobProfit.open(jobId, jobNum, cust); };
      actions.appendChild(btn);
    });
  });
  _obs.observe(document.body, { childList:true, subtree:true });

  window.JobProfit = { open, _recalc, _setRate };
  console.log('[job-profitability] installed');
})();
/* === END JOB PROFITABILITY === */
