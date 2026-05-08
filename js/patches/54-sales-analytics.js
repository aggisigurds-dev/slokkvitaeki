/* === SÖLUYFIRLIT / SALES ANALYTICS v1 === */
/* Revenue charts, top customers, monthly breakdown.
 * No SQL — reads existing solur table.
 * New nav button "📈 Söluyfirlit".
 */
(() => {
  if (window.__salesAnalyticsInstalled) return;
  window.__salesAnalyticsInstalled = true;

  function getSB(){ return window.DB && window.DB.sb; }
  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function fmtKr(n){if(!n&&n!==0)return'—';const s=Math.round(n).toString();const r=[];let t=s;while(t.length>3){r.unshift(t.slice(-3));t=t.slice(0,-3);}r.unshift(t);return r.join('.')+' kr';}
  const M = ['jan','feb','mar','apr','maí','jún','júl','ágú','sep','okt','nóv','des'];

  if (!document.getElementById('sa-style')) {
    const s = document.createElement('style');
    s.id='sa-style';
    s.textContent = `
      #view-soluyfirlit .sa-wrap { max-width:1180px; margin:0 auto; }
      #view-soluyfirlit .sa-cards { display:grid; grid-template-columns:repeat(auto-fit, minmax(180px,1fr)); gap:12px; margin-bottom:18px; }
      #view-soluyfirlit .sa-card { background:#fff; border-radius:12px; padding:16px; box-shadow:0 1px 3px rgba(0,0,0,.05); }
      #view-soluyfirlit .sa-card .lbl { font-size:11px; color:#64748b; text-transform:uppercase; letter-spacing:.05em; }
      #view-soluyfirlit .sa-card .val { font-size:24px; font-weight:700; margin-top:4px; }
      #view-soluyfirlit .sa-card .delta.up { color:#16a34a; font-size:11px; }
      #view-soluyfirlit .sa-card .delta.down { color:#dc2626; font-size:11px; }
      #view-soluyfirlit .sa-bars { display:flex; gap:6px; align-items:flex-end; height:200px; padding:8px 0; }
      #view-soluyfirlit .sa-bar { flex:1; background:linear-gradient(180deg,#3b82f6,#1d4ed8); border-radius:6px 6px 0 0; min-height:2px; position:relative; cursor:pointer; }
      #view-soluyfirlit .sa-bar:hover { background:linear-gradient(180deg,#2563eb,#1e40af); }
      #view-soluyfirlit .sa-bar .lbl { position:absolute; bottom:-22px; left:0; right:0; text-align:center; font-size:11px; color:#64748b; }
      #view-soluyfirlit .sa-bar .val { position:absolute; top:-20px; left:0; right:0; text-align:center; font-size:10px; color:#0f172a; font-weight:600; }
      #view-soluyfirlit .sa-section { background:#fff; border-radius:12px; padding:18px; margin-bottom:14px; box-shadow:0 1px 3px rgba(0,0,0,.05); }
      #view-soluyfirlit .sa-section h2 { margin:0 0 12px; font-size:14px; }
      #view-soluyfirlit table { width:100%; border-collapse:collapse; font-size:13px; }
      #view-soluyfirlit th, #view-soluyfirlit td { padding:8px; text-align:left; border-bottom:1px solid #f1f5f9; }
      #view-soluyfirlit th { background:#f8fafc; font-weight:600; font-size:11px; text-transform:uppercase; color:#64748b; }
    `;
    document.head.appendChild(s);
  }

  function ensureNav() {
    if (document.querySelector('.vnav-btn[data-view="soluyfirlit"]')) return;
    const sample = document.querySelector('.vnav-btn[data-view="tekjur"]') || document.querySelector('.vnav-btn[data-view="aldur"]');
    if (!sample) return;
    const btn = sample.cloneNode(false);
    btn.className = sample.className.replace(/\bactive\b/g,'').trim();
    btn.dataset.view = 'soluyfirlit';
    btn.textContent = '📈 Söluyfirlit';
    btn.onclick = () => window.App && window.App.switchView('soluyfirlit');
    sample.parentElement.insertBefore(btn, sample.nextSibling);
  }
  function ensureView() {
    if (document.getElementById('view-soluyfirlit')) return;
    const sample = document.getElementById('view-tekjur') || document.getElementById('view-sala');
    if (!sample || !sample.parentElement) return;
    const v = document.createElement('div');
    v.id = 'view-soluyfirlit';
    v.className = sample.className.replace(/\bactive\b/g,'').trim();
    v.innerHTML = '<main id="sa-main" class="main-panel"></main>';
    sample.parentElement.appendChild(v);
  }
  function patchSwitch() {
    if (!window.App || window.App._saPatch) return;
    const orig = window.App.switchView;
    window.App.switchView = function(view){
      if (view === 'soluyfirlit') {
        ensureView();
        document.querySelectorAll('[id^="view-"]').forEach(v=>{ v.style.display='none'; v.classList.remove('active'); });
        const v = document.getElementById('view-soluyfirlit');
        if (v) { v.style.display='block'; v.classList.add('active'); }
        document.querySelectorAll('.vnav-btn').forEach(b=>b.classList.toggle('active', b.dataset.view==='soluyfirlit'));
        load(); return;
      }
      orig.apply(this, arguments);
    };
    window.App._saPatch = true;
  }

  async function load() {
    const main = document.querySelector('#view-soluyfirlit #sa-main');
    if (!main) return;
    main.innerHTML = '<div style="padding:30px;text-align:center;color:#94a3b8">Hleður...</div>';
    const SB = getSB(); if (!SB) return;
    const yearStart = new Date(); yearStart.setMonth(0,1); yearStart.setHours(0,0,0,0);
    const lastYear = new Date(yearStart); lastYear.setFullYear(lastYear.getFullYear()-1);
    const { data, error } = await SB.from('solur').select('id,num,customer_nafn,samtals,created_at')
      .gte('created_at', lastYear.toISOString()).order('created_at', { ascending:false });
    if (error) { main.innerHTML=`<div style="padding:30px;text-align:center;color:#dc2626">${esc(error.message)}</div>`; return; }

    const all = data || [];
    const thisYear = all.filter(s => new Date(s.created_at) >= yearStart);
    const prevYear = all.filter(s => new Date(s.created_at) < yearStart);

    // Monthly buckets for current year
    const monthly = Array(12).fill(0);
    const monthlyCount = Array(12).fill(0);
    thisYear.forEach(s => { const m = new Date(s.created_at).getMonth(); monthly[m] += parseFloat(s.samtals)||0; monthlyCount[m]++; });
    const maxBar = Math.max(...monthly, 1);

    // Top customers
    const byCo = {};
    thisYear.forEach(s => {
      const k = s.customer_nafn || '—';
      if (!byCo[k]) byCo[k] = { rev:0, cnt:0 };
      byCo[k].rev += parseFloat(s.samtals)||0;
      byCo[k].cnt++;
    });
    const top = Object.entries(byCo).sort((a,b)=>b[1].rev-a[1].rev).slice(0,10);

    const totalThis = thisYear.reduce((s,r)=>s+(parseFloat(r.samtals)||0),0);
    const totalPrev = prevYear.reduce((s,r)=>s+(parseFloat(r.samtals)||0),0);
    const delta = totalPrev>0 ? Math.round((totalThis-totalPrev)/totalPrev*100) : null;
    const avgInv = thisYear.length ? totalThis/thisYear.length : 0;

    main.innerHTML = `
      <div class="sa-wrap">
        <h1 style="margin:0 0 14px;font-size:20px">📈 Söluyfirlit ${new Date().getFullYear()}</h1>
        <div class="sa-cards">
          <div class="sa-card"><div class="lbl">Heildartekjur (þetta ár)</div><div class="val">${fmtKr(totalThis)}</div>${delta!==null?`<div class="delta ${delta>=0?'up':'down'}">${delta>=0?'▲':'▼'} ${Math.abs(delta)}% v. fyrra árs</div>`:''}</div>
          <div class="sa-card"><div class="lbl">Reikningar</div><div class="val">${thisYear.length}</div></div>
          <div class="sa-card"><div class="lbl">Meðalreikningur</div><div class="val">${fmtKr(avgInv)}</div></div>
          <div class="sa-card"><div class="lbl">Viðskiptavinir</div><div class="val">${Object.keys(byCo).length}</div></div>
        </div>

        <div class="sa-section">
          <h2>Tekjur eftir mánuðum</h2>
          <div class="sa-bars">${monthly.map((v,i)=>`
            <div class="sa-bar" style="height:${v/maxBar*100}%" title="${M[i]}: ${fmtKr(v)} (${monthlyCount[i]} rk)">
              <div class="val">${v>0?Math.round(v/1000)+'k':''}</div>
              <div class="lbl">${M[i]}</div>
            </div>`).join('')}</div>
          <div style="height:30px"></div>
        </div>

        <div class="sa-section">
          <h2>Top 10 viðskiptavinir (þetta ár)</h2>
          ${top.length ? `<table>
            <thead><tr><th>#</th><th>Viðskiptavinur</th><th style="text-align:right">Reikningar</th><th style="text-align:right">Tekjur</th><th style="text-align:right">Hlutfall</th></tr></thead>
            <tbody>${top.map(([k,d],i)=>`<tr>
              <td>${i+1}</td><td>${esc(k)}</td>
              <td style="text-align:right">${d.cnt}</td>
              <td style="text-align:right;font-weight:600">${fmtKr(d.rev)}</td>
              <td style="text-align:right;color:#64748b">${(d.rev/totalThis*100).toFixed(1)}%</td>
            </tr>`).join('')}</tbody>
          </table>` : '<div style="padding:20px;text-align:center;color:#94a3b8">Engin gögn enn</div>'}
        </div>
      </div>`;
  }

  function init(){ ensureNav(); ensureView(); patchSwitch(); }
  setTimeout(init, 1000);
  setTimeout(init, 2500);
  window.SalesAnalytics = { load };
  console.log('[sales-analytics] installed');
})();
