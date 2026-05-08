/* === TILKYNNINGAMIÐSTÖÐ / NOTIFICATION CENTER v1 === */
/* Bell icon in topbar showing aggregated alerts:
 *   • Ógreiddir reikningar (overdue invoices > 30 days)
 *   • Þjónustutæki sem þarf að skoða (next_insp <= 30 days)
 *   • Lág-birgðir (birgdir.magn < lagmark)
 *   • Nýleg verk (verkbeidnir last 7 days)
 *   • Tilboð sem renna út (tilbod valid_until <= 7 days)
 *
 * No new SQL — reads existing tables.
 * Refreshes every 5 min and on tab focus.
 */
(() => {
  if (window.__notifInstalled) return;
  window.__notifInstalled = true;

  function getSB() { return window.DB && window.DB.sb; }
  function esc(s) { return String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function fmtKr(n) { if(!n&&n!==0)return'—'; const s=Math.round(n).toString(); const r=[]; let t=s; while(t.length>3){r.unshift(t.slice(-3));t=t.slice(0,-3);}r.unshift(t);return r.join('.')+' kr'; }
  function fmtDate(d) { if(!d)return''; const x=new Date(d); return x.getDate()+'.'+(x.getMonth()+1)+'.'+x.getFullYear(); }
  function daysFrom(d) { return Math.round((new Date(d) - new Date()) / 86400000); }

  let alerts = [];

  if (!document.getElementById('notif-style')) {
    const s = document.createElement('style');
    s.id = 'notif-style';
    s.textContent = `
      .notif-bell { position:relative; cursor:pointer; padding:8px 10px; border-radius:8px; background:none; border:none; color:inherit; font-size:18px; }
      .notif-bell:hover { background:rgba(255,255,255,.08); }
      .notif-badge { position:absolute; top:2px; right:2px; background:#dc2626; color:#fff; font-size:10px; font-weight:700; border-radius:9px; padding:1px 5px; min-width:14px; line-height:1.3; text-align:center; }
      .notif-panel { position:fixed; top:60px; right:16px; background:#fff; border-radius:12px; width:380px; max-width:calc(100vw - 32px); max-height:70vh; overflow:auto; box-shadow:0 16px 48px rgba(0,0,0,.25); z-index:99998; display:none; }
      .notif-panel.show { display:block; }
      .notif-panel-hd { padding:14px 16px; border-bottom:1px solid #e2e8f0; font-weight:700; display:flex; justify-content:space-between; align-items:center; }
      .notif-group { padding:10px 14px; border-bottom:1px solid #f1f5f9; }
      .notif-group:last-child { border-bottom:none; }
      .notif-group-hd { font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.05em; color:#64748b; margin-bottom:6px; display:flex; gap:8px; align-items:center; }
      .notif-item { padding:6px 0; font-size:13px; cursor:pointer; }
      .notif-item:hover { color:#3b82f6; }
      .notif-item .meta { font-size:11px; color:#94a3b8; margin-top:2px; }
      .notif-empty { padding:30px; text-align:center; color:#94a3b8; font-size:13px; }
      .notif-sev-high { color:#dc2626; }
      .notif-sev-med  { color:#f59e0b; }
    `;
    document.head.appendChild(s);
  }

  async function load() {
    const SB = getSB();
    if (!SB) return;
    // Supabase query builders are thenables (have .then) but not real
    // Promises (no .catch). Use try/catch around an await so this works
    // regardless of whether the input is a real Promise.
    const safe = async p => {
      try { return await p; }
      catch (e) { return { data: [], error: e }; }
    };
    const today = new Date(); today.setHours(0,0,0,0);
    const in30 = new Date(today); in30.setDate(in30.getDate()+30);
    const last7 = new Date(today); last7.setDate(last7.getDate()-7);

    const [unpaid, dueInsp, lowStock, recentJobs, expiringQuotes] = await Promise.all([
      safe(SB.from('solur').select('id,num,customer_nafn,samtals,created_at,paid_at,greitt_med').in('greitt_med',['reikningur','greitt_sidar']).is('paid_at',null).lte('created_at', new Date(Date.now()-30*86400000).toISOString())),
      safe(SB.from('uttaeki').select('id,serial,client,next_insp').not('next_insp','is',null).lte('next_insp', in30.toISOString().slice(0,10)).order('next_insp',{ascending:true})),
      safe(SB.from('birgdir').select('id,nafn,magn,lagmark,eining').filter('magn','lt','lagmark')),
      safe(SB.from('verkbeidnir').select('id,num,customer,created_at,status').gte('created_at', last7.toISOString()).order('created_at',{ascending:false}).limit(10)),
      safe(SB.from('tilbod').select('id,num,company_nafn,valid_until,status').eq('status','sent').not('valid_until','is',null).lte('valid_until', new Date(Date.now()+7*86400000).toISOString().slice(0,10)))
    ]);

    alerts = [
      { kind:'unpaid',  sev:'high', label:'Ógreiddir reikningar (>30 daga)', items: (unpaid.data||[]).map(r=>({
        title:`${r.num||'#'+r.id} — ${r.customer_nafn||''}`,
        meta:`${fmtKr(r.samtals)} · ${fmtDate(r.created_at)}`,
        click:()=> window.App && window.App.switchView('income')
      })) },
      { kind:'insp',    sev:'med',  label:'Þjónustutæki sem þarf að skoða', items: (dueInsp.data||[]).map(r=>{
        const d = daysFrom(r.next_insp);
        return { title:`${r.serial||'#'+r.id} — ${r.client||''}`,
          meta: d<0 ? `${-d} dögum yfir tíma` : (d===0?'Í dag':`Eftir ${d} daga`),
          click:()=> window.App && window.App.switchView('field')
        };
      }) },
      { kind:'stock',   sev:'med',  label:'Lág-birgðir', items: (lowStock.data||[]).map(r=>({
        title:`${r.nafn}`, meta:`${r.magn||0} ${r.eining||''} (lágmark ${r.lagmark||0})`,
        click:()=> window.App && window.App.switchView('birgdir')
      })) },
      { kind:'quotes',  sev:'med',  label:'Tilboð sem renna út', items: (expiringQuotes.data||[]).map(r=>({
        title:`${r.num||'#'+r.id} — ${r.company_nafn||''}`,
        meta:`Rennur út ${fmtDate(r.valid_until)}`,
        click:()=> window.App && window.App.switchView('tilbod')
      })) },
      { kind:'newjobs', sev:'low',  label:'Ný verk (síðustu 7 dagar)', items: (recentJobs.data||[]).map(r=>({
        title:`${r.num||'#'+r.id} — ${r.customer||''}`,
        meta:`${fmtDate(r.created_at)} · ${r.status||''}`,
        click:()=> window.App && window.App.switchView('counter')
      })) }
    ].filter(g => g.items.length > 0);

    render();
  }

  function totalCount() { return alerts.reduce((s,g)=>s+g.items.length, 0); }

  function ensureBell() {
    if (document.getElementById('notif-bell')) return;
    const topbar = document.querySelector('.topbar') || document.querySelector('header');
    if (!topbar) return;
    const btn = document.createElement('button');
    btn.id = 'notif-bell';
    btn.className = 'notif-bell';
    btn.title = 'Tilkynningar';
    btn.innerHTML = '🔔<span class="notif-badge" id="notif-badge" style="display:none">0</span>';
    btn.onclick = e => { e.stopPropagation(); togglePanel(); };
    topbar.appendChild(btn);

    const panel = document.createElement('div');
    panel.id = 'notif-panel';
    panel.className = 'notif-panel';
    panel.onclick = e => e.stopPropagation();
    document.body.appendChild(panel);

    document.addEventListener('click', () => panel.classList.remove('show'));
  }

  function togglePanel() {
    const p = document.getElementById('notif-panel');
    if (p) p.classList.toggle('show');
  }

  function render() {
    ensureBell();
    const badge = document.getElementById('notif-badge');
    const panel = document.getElementById('notif-panel');
    if (!badge || !panel) return;
    const count = totalCount();
    if (count > 0) { badge.style.display = ''; badge.textContent = count > 99 ? '99+' : count; }
    else badge.style.display = 'none';

    if (!alerts.length) {
      panel.innerHTML = `<div class="notif-panel-hd">🔔 Tilkynningar <span style="font-size:11px;color:#94a3b8;font-weight:400">Allt í lagi</span></div><div class="notif-empty">✨ Ekkert sem þarfnast athygli</div>`;
      return;
    }
    panel.innerHTML = `
      <div class="notif-panel-hd">🔔 Tilkynningar <span style="font-size:11px;color:#94a3b8;font-weight:400">${count} alls</span></div>
      ${alerts.map(g => `
        <div class="notif-group">
          <div class="notif-group-hd notif-sev-${g.sev}">${esc(g.label)} <span style="font-weight:400;color:#94a3b8">(${g.items.length})</span></div>
          ${g.items.slice(0,5).map((it,i) => `
            <div class="notif-item" data-g="${g.kind}" data-i="${i}">
              <div>${esc(it.title)}</div>
              <div class="meta">${esc(it.meta)}</div>
            </div>`).join('')}
          ${g.items.length>5?`<div style="font-size:11px;color:#94a3b8;margin-top:4px">… og ${g.items.length-5} til viðbótar</div>`:''}
        </div>`).join('')}`;
    panel.querySelectorAll('.notif-item').forEach(el => {
      el.onclick = () => {
        const g = alerts.find(x => x.kind===el.dataset.g);
        const it = g?.items[parseInt(el.dataset.i)];
        if (it && it.click) { it.click(); panel.classList.remove('show'); }
      };
    });
  }

  function init() { ensureBell(); load(); }
  setTimeout(init, 1500);
  setInterval(load, 5*60*1000);
  window.addEventListener('focus', load);

  window.Notifications = { load, render };
  console.log('[notifications] installed');
})();
