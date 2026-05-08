/* === STJÓRNSTÖÐ / COMMAND CENTER v1 === */
(() => {
  if (window.__cmdCenterInstalled) return;
  window.__cmdCenterInstalled = true;

  function getSB(){ return window.DB && window.DB.sb; }
  function fmtKr(n){if(!n&&n!==0)return'—';const s=Math.round(n).toString();const r=[];let t=s;while(t.length>3){r.unshift(t.slice(-3));t=t.slice(0,-3);}r.unshift(t);return r.join('.')+' kr';}
  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}

  function ensureNav(){
    if (document.querySelector('.vnav-btn[data-view="stjornstod"]')) return;
    const sample = document.querySelector('.vnav-btn[data-view="counter"]') || document.querySelector('.vnav-btn[data-view="yfirlit"]');
    if (!sample) return;
    const btn = sample.cloneNode(false);
    btn.className = sample.className.replace(/\bactive\b/g,'').trim();
    btn.dataset.view = 'stjornstod';
    btn.textContent = '🎯 Stjórnstöð';
    btn.onclick = () => window.App && window.App.switchView('stjornstod');
    sample.parentElement.insertBefore(btn, sample.nextSibling);
  }
  function ensureView(){
    if (document.getElementById('view-stjornstod')) return;
    const sample = document.getElementById('view-counter') || document.getElementById('view-sala');
    if (!sample || !sample.parentElement) return;
    const v = document.createElement('div');
    v.id = 'view-stjornstod';
    v.className = sample.className.replace(/\bactive\b/g,'').trim();
    v.innerHTML = '<main id="cc-main" class="main-panel"></main>';
    sample.parentElement.appendChild(v);
  }
  function patchSwitch(){
    if (!window.App || window.App._ccPatch) return;
    const orig = window.App.switchView;
    window.App.switchView = function(view){
      if (view==='stjornstod'){
        ensureView();
        document.querySelectorAll('[id^="view-"]').forEach(v=>{ v.style.display='none'; v.classList.remove('active'); });
        const v=document.getElementById('view-stjornstod');
        if (v){ v.style.display='block'; v.classList.add('active'); }
        document.querySelectorAll('.vnav-btn').forEach(b=>b.classList.toggle('active', b.dataset.view==='stjornstod'));
        load(); return;
      }
      orig.apply(this, arguments);
    };
    window.App._ccPatch = true;
  }

  async function load(){
    const main = document.querySelector('#view-stjornstod #cc-main');
    if (!main) return;
    main.innerHTML = '<div style="padding:30px;text-align:center;color:#94a3b8">Hleður...</div>';
    const SB = getSB(); if (!SB) return;
    // Supabase query builders are thenables, not real Promises — they don't
    // have .catch(). Use async/try-catch instead so the wrapper works whether
    // the input is a Promise, a Postgrest query builder, or any thenable.
    const safe = async p => {
      try { return await p; }
      catch (e) { return { data: [], count: 0, error: e }; }
    };
    const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0,0,0,0);
    const today = new Date(); today.setHours(0,0,0,0);
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate()+1);
    const in30 = new Date(today); in30.setDate(in30.getDate()+30);

    const [revM, unpaid, openJobs, todayJobs, dueInsp, lowStock, contractsDue] = await Promise.all([
      safe(SB.from('solur').select('samtals,created_at').gte('created_at', monthStart.toISOString())),
      safe(SB.from('solur').select('id,samtals,customer_nafn').in('greitt_med',['reikningur','greitt_sidar']).is('paid_at',null)),
      safe(SB.from('verkbeidnir').select('id,num,customer,status').neq('status','done').neq('status','cancelled')),
      safe(SB.from('verkdagbok').select('id,fyrirtaeki,job_date,athugasemdir').gte('job_date', today.toISOString().slice(0,10)).lt('job_date', tomorrow.toISOString().slice(0,10)).order('job_date')),
      safe(SB.from('uttaeki').select('id,serial,client,next_insp').not('next_insp','is',null).lte('next_insp', in30.toISOString().slice(0,10))),
      safe(SB.from('birgdir').select('id,nafn,magn,lagmark').filter('magn','lt','lagmark')),
      safe(SB.from('thjonustusamningar').select('id,company_nafn,upphaed_an_vsk,next_due').lte('next_due', in30.toISOString().slice(0,10)).eq('status','virkur'))
    ]);

    const monthRev = (revM.data||[]).reduce((s,r)=>s+(parseFloat(r.samtals)||0),0);
    const unpaidTotal = (unpaid.data||[]).reduce((s,r)=>s+(parseFloat(r.samtals)||0),0);
    const techs = new Set((todayJobs.data||[]).map(r=>r.assigned_to).filter(Boolean));

    const greeting = (() => {
      const h = new Date().getHours();
      if (h < 5) return '🌙 Góða nótt';
      if (h < 12) return '☀️ Góðan daginn';
      if (h < 18) return '🌤 Góðan dag';
      return '🌆 Gott kvöld';
    })();

    const dayName = new Date().toLocaleDateString('is-IS', { weekday:'long', day:'numeric', month:'long', year:'numeric' });

    main.innerHTML = `
      <div style="max-width:1280px;margin:0 auto">
        <div style="margin-bottom:18px">
          <h1 style="margin:0;font-size:24px;font-weight:600">${greeting}</h1>
          <div style="font-size:14px;color:#64748b">${dayName}</div>
        </div>

        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px;margin-bottom:20px">
          ${cardHtml('💰', 'Tekjur þessa mánaðar', fmtKr(monthRev), '#16a34a', '#dcfce7')}
          ${cardHtml('⚠️', 'Útistandandi kröfur', fmtKr(unpaidTotal), '#dc2626', '#fee2e2', `${(unpaid.data||[]).length} reikningar`)}
          ${cardHtml('🔧', 'Verk í gangi', (openJobs.data||[]).length, '#3b82f6', '#dbeafe')}
          ${cardHtml('📍', 'Verk í dag', (todayJobs.data||[]).length, '#8b5cf6', '#ede9fe', `${techs.size} tæknimenn úti`)}
          ${cardHtml('🔥', 'Tæki sem þurfa skoðun', (dueInsp.data||[]).length, '#f59e0b', '#fef3c7', 'Næstu 30 daga')}
          ${cardHtml('📦', 'Lág-birgðir', (lowStock.data||[]).length, '#ec4899', '#fce7f3', (lowStock.data||[]).length?'Þarf að panta':'Allt í lagi')}
          ${cardHtml('📑', 'Samningar á rukkun', (contractsDue.data||[]).length, '#0ea5e9', '#e0f2fe', 'Næstu 30 daga')}
        </div>

        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(380px,1fr));gap:14px">
          <div class="cc-section">
            <h3>📍 Verk í dag</h3>
            ${(todayJobs.data||[]).length ? (todayJobs.data||[]).map(j=>`
              <div class="cc-row">
                <div><strong>${esc(j.athugasemdir||j.fyrirtaeki||'Verk')}</strong></div>
                <div style="font-size:12px;color:#64748b">${j.fyrirtaeki?'🏢 '+esc(j.fyrirtaeki):''}</div>
              </div>`).join('') : '<div class="cc-empty">🌴 Engin verk í dag</div>'}
            <button class="btn btn-outline btn-sm" style="margin-top:8px;width:100%" onclick="App.switchView('verkdagbok')">Sjá dagbók →</button>
          </div>

          <div class="cc-section">
            <h3>⚠️ Stærstu ógreiddu</h3>
            ${(unpaid.data||[]).slice(0,5).map(u=>`
              <div class="cc-row">
                <div><strong>${esc(u.customer_nafn||'')}</strong></div>
                <div style="font-size:13px;color:#dc2626;font-weight:600">${fmtKr(u.samtals)}</div>
              </div>`).join('') || '<div class="cc-empty">✓ Allt greitt</div>'}
            <button class="btn btn-outline btn-sm" style="margin-top:8px;width:100%" onclick="if(window.AgingReport&&AgingReport.open)AgingReport.open();else App.switchView('aging-report')">Aldursgreining →</button>
          </div>

          <div class="cc-section">
            <h3>🔥 Þjónustutæki sem þarfnast skoðunar</h3>
            ${(dueInsp.data||[]).slice(0,5).map(d=>`
              <div class="cc-row">
                <div><strong>${esc(d.serial||'')}</strong> ${esc(d.client||'')}</div>
                <div style="font-size:12px;color:#f59e0b">Næsta: ${esc(d.next_insp)}</div>
              </div>`).join('') || '<div class="cc-empty">✓ Allt á áætlun</div>'}
            <button class="btn btn-outline btn-sm" style="margin-top:8px;width:100%" onclick="App.switchView('field')">Þjónustuáætlun →</button>
          </div>

          <div class="cc-section">
            <h3>📦 Lág-birgðir</h3>
            ${(lowStock.data||[]).slice(0,5).map(s=>`
              <div class="cc-row">
                <div><strong>${esc(s.nafn||'')}</strong></div>
                <div style="font-size:12px;color:#ec4899">${s.magn||0} (lágmark ${s.lagmark||0})</div>
              </div>`).join('') || '<div class="cc-empty">✓ Engar lág-birgðir</div>'}
            <button class="btn btn-outline btn-sm" style="margin-top:8px;width:100%" onclick="App.switchView('birgdir')">Birgðir →</button>
          </div>
        </div>
      </div>`;

    if (!document.getElementById('cc-style')) {
      const s=document.createElement('style'); s.id='cc-style';
      s.textContent=`
        .cc-section{background:#fff;border-radius:12px;padding:16px;box-shadow:0 1px 3px rgba(0,0,0,.04)}
        .cc-section h3{margin:0 0 10px;font-size:13px;font-weight:700}
        .cc-row{padding:8px 0;border-bottom:1px solid #f1f5f9;display:flex;justify-content:space-between;align-items:flex-start;gap:8px}
        .cc-row:last-child{border-bottom:none}
        .cc-empty{padding:14px;text-align:center;color:#94a3b8;font-size:13px}
        .cc-tag{display:inline-block;padding:1px 6px;background:#eff6ff;color:#1d4ed8;border-radius:99px;font-size:10px;font-weight:600;margin-left:4px}
      `;
      document.head.appendChild(s);
    }
  }

  function cardHtml(icon, label, value, color, bg, sub){
    return `<div style="background:#fff;border-radius:12px;padding:16px;box-shadow:0 1px 3px rgba(0,0,0,.04);border-left:4px solid ${color}">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
        <div style="width:32px;height:32px;border-radius:8px;background:${bg};display:flex;align-items:center;justify-content:center;font-size:18px">${icon}</div>
        <div style="font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:.05em;font-weight:600">${esc(label)}</div>
      </div>
      <div style="font-size:24px;font-weight:700;color:${color}">${value}</div>
      ${sub?`<div style="font-size:11px;color:#94a3b8;margin-top:2px">${esc(sub)}</div>`:''}
    </div>`;
  }

  function init(){ ensureNav(); ensureView(); patchSwitch(); }
  setTimeout(init, 1000);
  setTimeout(init, 2500);

  window.CommandCenter = { load };
  console.log('[command-center] installed');
})();
