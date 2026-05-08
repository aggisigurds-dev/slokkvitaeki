/* === DASHBOARD / YFIRLIT v1 === */
/* Adds a "🏠 Yfirlit" overview screen as the app's landing view.
 * Shows live KPI cards pulled from Supabase, auto-refreshes every 60 s.
 *
 * Cards:
 *   Open jobs · Ready for pickup · Revenue this month vs last
 *   Unpaid invoices · Units due ≤30 days · Pending quotes
 *   Today's calendar events
 *
 * Nav: injected before the Afgreiðsla button (first in nav).
 * Default start view changed to 'yfirlit'.
 */
(() => {
  if (window.__dashboardInstalled) return;
  window.__dashboardInstalled = true;

  function getSB() { return window.DB && window.DB.sb; }
  function esc(s) { return String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function fmtKr(n) { if (!n && n!==0) return '—'; var s=Math.round(n).toString(); var r=[]; while(s.length>3){r.unshift(s.slice(-3));s=s.slice(0,-3);} r.unshift(s); return r.join('.')+' kr'; }
  function todayISO() { var d=new Date(); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }
  function startOfMonth(offset) { var d=new Date(); d.setDate(1); d.setMonth(d.getMonth()+offset); d.setHours(0,0,0,0); return d.toISOString(); }
  function fmtTime(iso) { if(!iso) return ''; var d=new Date(iso); return String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0'); }

  // ── CSS ───────────────────────────────────────────────────────────────────
  if (!document.getElementById('dash-style')) {
    const s = document.createElement('style');
    s.id = 'dash-style';
    s.textContent = `
      #view-yfirlit { background: var(--bg2,#f8fafc); overflow-y: auto; }
      .dash-wrap { max-width: 960px; margin: 0 auto; padding: 24px 20px 40px; }
      .dash-hello { font-size: 20px; font-weight: 700; color: var(--ink1,#1e293b); margin-bottom: 4px; }
      .dash-sub   { font-size: 13px; color: var(--ink3,#64748b); margin-bottom: 24px; }
      .dash-grid  { display: grid; grid-template-columns: repeat(auto-fill,minmax(200px,1fr)); gap: 14px; margin-bottom: 28px; }
      .dash-card  {
        background: var(--bg1,#fff); border: 1px solid var(--brd,#e2e8f0);
        border-radius: 12px; padding: 18px 20px; cursor: default;
        transition: box-shadow .15s;
      }
      .dash-card:hover { box-shadow: 0 4px 20px rgba(0,0,0,.08); }
      .dash-card-label { font-size: 11px; font-weight: 600; color: var(--ink3,#64748b); text-transform: uppercase; letter-spacing: .05em; margin-bottom: 8px; }
      .dash-card-val   { font-size: 28px; font-weight: 700; color: var(--ink1,#1e293b); line-height: 1; }
      .dash-card-sub   { font-size: 12px; color: var(--ink3,#64748b); margin-top: 6px; }
      .dash-card-trend { font-size: 11px; font-weight: 600; margin-top: 4px; }
      .dash-card-trend.up   { color: #16a34a; }
      .dash-card-trend.down { color: #dc2626; }
      .dash-card-trend.flat { color: #94a3b8; }
      .dash-card.warn  { border-color: #fde68a; background: #fffbeb; }
      .dash-card.alert { border-color: #fca5a5; background: #fef2f2; }
      .dash-card.good  { border-color: #86efac; background: #f0fdf4; }
      .dash-section-title { font-size: 13px; font-weight: 700; color: var(--ink2,#334155); margin-bottom: 10px; text-transform: uppercase; letter-spacing: .04em; }
      .dash-events { background: var(--bg1,#fff); border: 1px solid var(--brd,#e2e8f0); border-radius: 12px; overflow: hidden; margin-bottom: 28px; }
      .dash-event-row { display: flex; align-items: center; gap: 12px; padding: 10px 16px; border-bottom: 1px solid var(--bg2,#f1f5f9); font-size: 13px; }
      .dash-event-row:last-child { border-bottom: none; }
      .dash-event-time { font-size: 12px; font-weight: 600; color: var(--ink3,#64748b); min-width: 40px; }
      .dash-event-title { flex: 1; color: var(--ink1,#1e293b); font-weight: 500; }
      .dash-event-who  { font-size: 11px; color: var(--ink3,#64748b); }
      .dash-actions { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 28px; }
      .dash-act-btn {
        display: inline-flex; align-items: center; gap: 7px;
        padding: 10px 16px; background: var(--bg1,#fff);
        border: 1px solid var(--brd,#e2e8f0); border-radius: 10px;
        font: inherit; font-size: 13px; font-weight: 600; color: var(--ink1,#1e293b);
        cursor: pointer; transition: background .1s, box-shadow .1s;
      }
      .dash-act-btn:hover { background: var(--bg2,#f8fafc); box-shadow: 0 2px 8px rgba(0,0,0,.07); }
      .dash-refresh-row { display: flex; align-items: center; gap: 8px; font-size: 11px; color: var(--ink3,#64748b); margin-top: 8px; }
      .dash-spinner { animation: dash-spin 1s linear infinite; display: inline-block; }
      @keyframes dash-spin { to { transform: rotate(360deg); } }
    `;
    document.head.appendChild(s);
  }

  // ── Inject view div ───────────────────────────────────────────────────────
  if (!document.getElementById('view-yfirlit')) {
    const div = document.createElement('div');
    div.id = 'view-yfirlit';
    div.className = 'view';
    div.innerHTML = '<div class="dash-wrap"><div class="loading-state">Hleður yfirlit…</div></div>';
    const firstView = document.getElementById('view-counter');
    if (firstView) firstView.parentNode.insertBefore(div, firstView);
    else document.body.appendChild(div);
  }

  // ── Inject nav button ─────────────────────────────────────────────────────
  (function injectNav() {
    const nav = document.querySelector('.view-nav');
    if (!nav || nav.querySelector('[data-view="yfirlit"]')) return;
    const btn = document.createElement('button');
    btn.className = 'vnav-btn';
    btn.dataset.view = 'yfirlit';
    btn.onclick = () => App.switchView('yfirlit');
    btn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
        <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
      </svg>
      <span>Yfirlit</span>`;
    nav.insertBefore(btn, nav.firstChild);
  })();

  // ── Data loading ──────────────────────────────────────────────────────────
  async function loadData() {
    const SB = getSB();
    if (!SB) return null;
    const today = todayISO();
    const thisMonthStart = startOfMonth(0);
    const lastMonthStart = startOfMonth(-1);
    const in30Days = new Date(); in30Days.setDate(in30Days.getDate()+30);
    const in30ISO = in30Days.toISOString().slice(0,10);
    const tomorrowISO = new Date(Date.now()+86400000).toISOString().slice(0,10);

    const [jobs, solurThis, solurLast, units, quotes, events] = await Promise.all([
      SB.from('verkbeidnir').select('id,status,customer').neq('status','Afhent'),
      SB.from('solur').select('samtals,paid_at,greitt_med').gte('created_at', thisMonthStart),
      SB.from('solur').select('samtals').gte('created_at', lastMonthStart).lt('created_at', thisMonthStart),
      SB.from('þjonustutaeki').select('id,next_insp,serial,tegund,company_nafn').lte('next_insp', in30ISO).gte('next_insp', today),
      SB.from('tilbod').select('id,status').in('status',['draft','sent']),
      SB.from('dagbok').select('id,title,scheduled_start,assigned_to,status').gte('scheduled_start', today+'T00:00:00').lte('scheduled_start', tomorrowISO+'T23:59:59').neq('status','cancelled').order('scheduled_start')
    ]);

    const openJobs    = (jobs.data||[]).filter(j => j.status !== 'Afhent' && j.status !== 'Tilbúið');
    const readyJobs   = (jobs.data||[]).filter(j => j.status === 'Tilbúið');
    const thisRev     = (solurThis.data||[]).reduce((s,r) => s + (r.samtals||0), 0);
    const lastRev     = (solurLast.data||[]).reduce((s,r) => s + (r.samtals||0), 0);
    const unpaidCount = (solurThis.data||[]).filter(r => r.greitt_med==='reikningur' && !r.paid_at).length;
    const unpaidAmt   = (solurThis.data||[]).filter(r => r.greitt_med==='reikningur' && !r.paid_at).reduce((s,r) => s+(r.samtals||0), 0);
    const dueUnits    = (units.data||[]);
    const pendingQ    = (quotes.data||[]).filter(q => q.status==='sent').length;
    const todayEvents = (events.data||[]).filter(e => e.scheduled_start.startsWith(today));

    return { openJobs: openJobs.length, readyJobs: readyJobs.length,
             thisRev, lastRev, unpaidCount, unpaidAmt,
             dueUnits: dueUnits.length, pendingQ, todayEvents };
  }

  // ── Render ────────────────────────────────────────────────────────────────
  async function render(showSpinner) {
    const wrap = document.querySelector('#view-yfirlit .dash-wrap');
    if (!wrap) return;

    if (showSpinner) {
      const spin = wrap.querySelector('.dash-refresh-row .dash-spinner');
      if (spin) spin.style.display = 'inline-block';
    }

    const d = await loadData();

    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Góðan daginn' : hour < 17 ? 'Góðan dag' : 'Gott kvöld';
    const dayNames = ['Sunnudagur','Mánudagur','Þriðjudagur','Miðvikudagur','Fimmtudagur','Föstudagur','Laugardagur'];
    const now = new Date();
    const dateStr = dayNames[now.getDay()] + ', ' + now.getDate() + '. ' + ['jan','feb','mar','apr','maí','jún','júl','ágú','sep','okt','nóv','des'][now.getMonth()] + ' ' + now.getFullYear();

    if (!d) {
      wrap.innerHTML = `<div class="dash-hello">${greeting} 👋</div><div class="dash-sub">${dateStr}</div><div style="color:var(--ink3);font-size:13px">Gagngrunnur ekki tengdur.</div>`;
      return;
    }

    const revTrend = d.lastRev > 0 ? ((d.thisRev - d.lastRev) / d.lastRev * 100) : 0;
    const trendCls = revTrend > 2 ? 'up' : revTrend < -2 ? 'down' : 'flat';
    const trendTxt = revTrend > 0 ? `▲ ${Math.abs(revTrend).toFixed(0)}% frá síðasta mánuði` : revTrend < 0 ? `▼ ${Math.abs(revTrend).toFixed(0)}% frá síðasta mánuði` : '≈ Svipað og síðasta mánuður';

    const events = d.todayEvents.map(e => `
      <div class="dash-event-row">
        <span class="dash-event-time">${fmtTime(e.scheduled_start)}</span>
        <span class="dash-event-title">${esc(e.title)}</span>
        ${e.assigned_to ? `<span class="dash-event-who">${esc(e.assigned_to)}</span>` : ''}
      </div>`).join('') || '<div class="dash-event-row" style="color:var(--ink3)">Engar dagbókarfærslur í dag.</div>';

    wrap.innerHTML = `
      <div class="dash-hello">${greeting} 👋</div>
      <div class="dash-sub">${dateStr}</div>

      <div class="dash-grid">
        <div class="dash-card${d.openJobs > 5 ? ' warn' : ''}">
          <div class="dash-card-label">Opin verk</div>
          <div class="dash-card-val">${d.openJobs}</div>
          <div class="dash-card-sub">verkbeiðnir í vinnslu</div>
        </div>
        <div class="dash-card${d.readyJobs > 0 ? ' warn' : ''}">
          <div class="dash-card-label">Tilbúið til afhendingar</div>
          <div class="dash-card-val">${d.readyJobs}</div>
          <div class="dash-card-sub">bíða eftir viðskiptavini</div>
        </div>
        <div class="dash-card">
          <div class="dash-card-label">Tekjur þennan mánuð</div>
          <div class="dash-card-val" style="font-size:${d.thisRev>999999?'18':'22'}px">${fmtKr(d.thisRev)}</div>
          <div class="dash-card-trend ${trendCls}">${trendTxt}</div>
        </div>
        <div class="dash-card${d.unpaidCount > 0 ? ' alert' : 'good'}">
          <div class="dash-card-label">Ógreiddir reikningar</div>
          <div class="dash-card-val">${d.unpaidCount}</div>
          <div class="dash-card-sub">${d.unpaidCount ? fmtKr(d.unpaidAmt) + ' eftirstöðvar' : 'Allt greitt ✓'}</div>
        </div>
        <div class="dash-card${d.dueUnits > 0 ? ' warn' : ''}">
          <div class="dash-card-label">Skoðun á næstu 30 dögum</div>
          <div class="dash-card-val">${d.dueUnits}</div>
          <div class="dash-card-sub">þjónustutæki</div>
        </div>
        <div class="dash-card${d.pendingQ > 0 ? ' warn' : ''}">
          <div class="dash-card-label">Tilboð í bið</div>
          <div class="dash-card-val">${d.pendingQ}</div>
          <div class="dash-card-sub">sent — bíður svars</div>
        </div>
      </div>

      <div class="dash-section-title">📅 Dagbók í dag</div>
      <div class="dash-events">${events}</div>

      <div class="dash-section-title">Flýtileiðir</div>
      <div class="dash-actions">
        <button class="dash-act-btn" onclick="App.switchView('counter');Counter&&Counter.openNew&&Counter.openNew()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:14px;height:14px"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>Ný verkbeiðni
        </button>
        <button class="dash-act-btn" onclick="if(window.Tilbod&&Tilbod.open)Tilbod.open();else App.switchView('tilbod')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:14px;height:14px"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>Nýtt tilboð
        </button>
        <button class="dash-act-btn" onclick="if(window.CalendarView)CalendarView.open();else App.switchView('calendar')">
          📅 Opna dagbók
        </button>
        <button class="dash-act-btn" onclick="if(window.InspForecast)InspForecast.open();else App.switchView('insp-forecast')">
          📈 Þjónustuáætlun
        </button>
        <button class="dash-act-btn" onclick="if(window.AgingReport)AgingReport.open()">
          📬 Aldursgreining
        </button>
      </div>

      <div class="dash-refresh-row">
        <svg class="dash-spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:12px;height:12px;display:none"><path d="M21 12a9 9 0 11-9-9"/></svg>
        <span id="dash-last-updated">Uppfært ${now.getHours()}:${String(now.getMinutes()).padStart(2,'0')}</span>
        <button onclick="window.Dashboard.refresh()" style="background:none;border:none;font-size:11px;color:var(--blu,#3b82f6);cursor:pointer;padding:0 4px;font:inherit">↻ Uppfæra</button>
      </div>`;
  }

  // ── Auto-refresh ──────────────────────────────────────────────────────────
  let _refreshTimer;
  function startRefresh() {
    clearInterval(_refreshTimer);
    _refreshTimer = setInterval(() => {
      if (document.getElementById('view-yfirlit')?.classList.contains('active')) {
        render(true);
      }
    }, 60000);
  }

  document.addEventListener('view-shown', e => {
    if (e.detail === 'yfirlit') { render(false); startRefresh(); }
  });

  // Hook App.switchView to handle 'yfirlit'
  (function patchSwitchView() {
    if (typeof App === 'undefined') { setTimeout(patchSwitchView, 200); return; }
    if (App.switchView && App.switchView._dashPatch) return;
    const orig = App.switchView.bind(App);
    App.switchView = function(v) {
      if (v === 'yfirlit') {
        document.querySelectorAll('.view').forEach(el => el.classList.remove('active'));
        document.querySelectorAll('.vnav-btn').forEach(el => el.classList.toggle('active', el.dataset.view === 'yfirlit'));
        const vEl = document.getElementById('view-yfirlit');
        if (vEl) vEl.classList.add('active');
        document.dispatchEvent(new CustomEvent('view-shown', { detail: 'yfirlit' }));
        return;
      }
      orig(v);
    };
    App.switchView._dashPatch = true;
  })();

  // 2026-05-07: removed the auto-`switchView('yfirlit')` on DOMContentLoaded —
  // it overrode the user's chosen starting view (Stillingar → Útlit → Sjálfgefin
  // upphafssíða). Sala/Dashboard/etc. landing is now decided by patch 88
  // reading AppSettings.almennt.starting_view (defaults to 'sala').
  // To go to Yfirlit on load, set Stillingar → Útlit → Síða þegar app opnast = Yfirlit.

  window.Dashboard = { refresh: () => render(true) };
  console.log('[dashboard] installed');
})();
/* === END DASHBOARD === */
