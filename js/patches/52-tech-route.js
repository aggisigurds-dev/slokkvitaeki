/* === DAGSKRÁ TÆKNIMANNS / DAILY TECH ROUTE v1 === */
/* Mobile-friendly daily route view: list of jobs/calendar entries for today,
 * with one-tap Google Maps link to navigate to each address.
 *
 * No SQL — reads dagbok + verkbeidnir.
 * New nav button "📍 Dagskrá".
 */
(() => {
  if (window.__techRouteInstalled) return;
  window.__techRouteInstalled = true;

  function getSB(){ return window.DB && window.DB.sb; }
  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function fmtTime(d){if(!d)return'';const x=new Date(d);return String(x.getHours()).padStart(2,'0')+':'+String(x.getMinutes()).padStart(2,'0');}

  if (!document.getElementById('route-style')) {
    const s = document.createElement('style');
    s.id = 'route-style';
    s.textContent = `
      #view-dagskratm .rt-wrap { max-width:780px; margin:0 auto; }
      #view-dagskratm .rt-day { background:linear-gradient(135deg,#3b82f6,#1d4ed8); color:#fff; border-radius:14px; padding:20px; margin-bottom:14px; }
      #view-dagskratm .rt-day h1 { margin:0; font-size:22px }
      #view-dagskratm .rt-day .sub { opacity:.85; font-size:13px; margin-top:4px; }
      #view-dagskratm .rt-stop { background:#fff; border-radius:12px; padding:14px; margin-bottom:10px; border-left:4px solid #cbd5e1; box-shadow:0 1px 3px rgba(0,0,0,.04); }
      #view-dagskratm .rt-stop.done { opacity:.6; border-left-color:#16a34a; }
      #view-dagskratm .rt-stop .time { font-weight:700; color:#0f172a; font-size:15px; }
      #view-dagskratm .rt-stop .title { font-weight:600; margin-top:2px; }
      #view-dagskratm .rt-stop .addr { color:#64748b; font-size:13px; margin-top:4px; }
      #view-dagskratm .rt-stop .actions { display:flex; gap:6px; margin-top:10px; flex-wrap:wrap; }
      #view-dagskratm .rt-empty { background:#fff; border-radius:12px; padding:40px; text-align:center; color:#94a3b8; }
      #view-dagskratm .rt-period { display:flex; gap:6px; margin-bottom:14px; }
      #view-dagskratm .rt-period button { flex:1; padding:8px; border:1px solid #e2e8f0; background:#fff; border-radius:8px; font-size:13px; cursor:pointer; }
      #view-dagskratm .rt-period button.active { background:#3b82f6; color:#fff; border-color:#3b82f6; }
    `;
    document.head.appendChild(s);
  }

  let stops = [];
  let when = 'today'; // 'today' | 'tomorrow' | 'week'

  function ensureNav() {
    if (document.querySelector('.vnav-btn[data-view="dagskratm"]')) return;
    const sample = document.querySelector('.vnav-btn[data-view="dagbok"]') || document.querySelector('.vnav-btn[data-view="ferd"]');
    if (!sample) return;
    const btn = sample.cloneNode(false);
    btn.className = sample.className.replace(/\bactive\b/g,'').trim();
    btn.dataset.view = 'dagskratm';
    btn.textContent = '📍 Dagskrá tæknimanns';
    btn.onclick = () => window.App && window.App.switchView('dagskratm');
    sample.parentElement.insertBefore(btn, sample.nextSibling);
  }
  function ensureView() {
    if (document.getElementById('view-dagskratm')) return;
    const sample = document.getElementById('view-dagbok') || document.getElementById('view-sala');
    if (!sample || !sample.parentElement) return;
    const v = document.createElement('div');
    v.id = 'view-dagskratm';
    v.className = sample.className.replace(/\bactive\b/g,'').trim();
    v.innerHTML = '<main id="rt-main" class="main-panel"></main>';
    sample.parentElement.appendChild(v);
  }
  function patchSwitch() {
    if (!window.App || window.App._rtPatch) return;
    const orig = window.App.switchView;
    window.App.switchView = function(view){
      if (view === 'dagskratm') {
        ensureView();
        document.querySelectorAll('[id^="view-"]').forEach(v=>{ v.style.display='none'; v.classList.remove('active'); });
        const v = document.getElementById('view-dagskratm');
        if (v) { v.style.display='block'; v.classList.add('active'); }
        document.querySelectorAll('.vnav-btn').forEach(b=>b.classList.toggle('active', b.dataset.view==='dagskratm'));
        load(); return;
      }
      orig.apply(this, arguments);
    };
    window.App._rtPatch = true;
  }

  async function load() {
    const main = document.querySelector('#view-dagskratm #rt-main');
    if (!main) return;
    const SB = getSB(); if (!SB) return;
    const today = new Date(); today.setHours(0,0,0,0);
    let from, to;
    if (when==='today') { from=today; to=new Date(today); to.setDate(to.getDate()+1); }
    else if (when==='tomorrow') { from=new Date(today); from.setDate(from.getDate()+1); to=new Date(from); to.setDate(to.getDate()+1); }
    else { from=today; to=new Date(today); to.setDate(to.getDate()+7); }

    const { data: cal } = await SB.from('dagbok')
      .select('*').gte('scheduled_start', from.toISOString()).lt('scheduled_start', to.toISOString())
      .order('scheduled_start', { ascending:true });
    stops = cal || [];

    const dayName = new Date().toLocaleDateString('is-IS', { weekday:'long', day:'numeric', month:'long' });

    main.innerHTML = `
      <div class="rt-wrap">
        <div class="rt-day">
          <h1>📍 ${when==='today'?'Í dag':when==='tomorrow'?'Á morgun':'Vikan'}</h1>
          <div class="sub">${dayName} · ${stops.length} stoppistöð${stops.length===1?'':'var'}</div>
        </div>
        <div class="rt-period">
          <button class="${when==='today'?'active':''}" onclick="TechRoute._when('today')">Í dag</button>
          <button class="${when==='tomorrow'?'active':''}" onclick="TechRoute._when('tomorrow')">Á morgun</button>
          <button class="${when==='week'?'active':''}" onclick="TechRoute._when('week')">Vikan</button>
        </div>
        ${stops.length ? stops.map(s => `
          <div class="rt-stop ${s.status==='done'?'done':''}">
            <div class="time">${fmtTime(s.scheduled_start)}${s.scheduled_end?' – '+fmtTime(s.scheduled_end):''}</div>
            <div class="title">${esc(s.title||'')}</div>
            ${s.company_nafn?`<div class="addr">🏢 ${esc(s.company_nafn)}</div>`:''}
            ${s.notes?`<div class="addr" style="margin-top:6px;font-size:12px">${esc(s.notes)}</div>`:''}
            <div class="actions">
              ${s.company_nafn?`<a class="btn btn-sm btn-outline" target="_blank" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(s.company_nafn+' Iceland')}">🗺 Maps</a>`:''}
              ${s.status!=='done'?`<button class="btn btn-sm btn-primary" onclick="TechRoute._done(${s.id})">✓ Lokið</button>`:''}
              <button class="btn btn-sm btn-outline" onclick="TechRoute._reschedule(${s.id})">↻ Færa</button>
            </div>
          </div>`).join('') : '<div class="rt-empty">🌴 Engar færslur — frí?</div>'}
      </div>`;
  }

  function _when(p){ when=p; load(); }
  async function _done(id){ await getSB().from('dagbok').update({status:'done'}).eq('id',id); load(); }
  async function _reschedule(id){
    const v = prompt('Ný dagsetning og tími (YYYY-MM-DD HH:MM):');
    if (!v) return;
    await getSB().from('dagbok').update({scheduled_start:new Date(v).toISOString()}).eq('id',id);
    load();
  }

  function init(){ ensureNav(); ensureView(); patchSwitch(); }
  setTimeout(init, 1000);
  setTimeout(init, 2500);
  window.TechRoute = { load, _when, _done, _reschedule };
  console.log('[tech-route] installed');
})();
