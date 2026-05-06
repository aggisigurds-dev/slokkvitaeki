/* === ALHEIMSLEIT / GLOBAL SEARCH (Cmd+K) v1 === */
(() => {
  if (window.__globalSearchInstalled) return;
  window.__globalSearchInstalled = true;

  function getSB(){ return window.DB && window.DB.sb; }
  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}

  if (!document.getElementById('gs-style')) {
    const s=document.createElement('style'); s.id='gs-style';
    s.textContent=`
      .gs-overlay{position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.5);display:none;align-items:flex-start;justify-content:center;padding-top:80px}
      .gs-overlay.show{display:flex}
      .gs-modal{background:#fff;border-radius:12px;width:600px;max-width:calc(100vw - 32px);box-shadow:0 24px 64px rgba(0,0,0,.3);overflow:hidden}
      .gs-input{width:100%;padding:18px 20px;border:none;font-size:18px;outline:none;border-bottom:1px solid #e2e8f0;box-sizing:border-box}
      .gs-results{max-height:60vh;overflow:auto}
      .gs-group{padding:8px 0;border-top:1px solid #f1f5f9}
      .gs-group:first-child{border-top:none}
      .gs-group-hd{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#64748b;padding:6px 20px;display:flex;justify-content:space-between}
      .gs-item{padding:10px 20px;cursor:pointer;font-size:13px}
      .gs-item:hover,.gs-item.selected{background:#eff6ff;color:#1d4ed8}
      .gs-item .meta{font-size:11px;color:#94a3b8;margin-top:2px}
      .gs-empty{padding:40px;text-align:center;color:#94a3b8;font-size:13px}
      .gs-hint{padding:8px 20px;font-size:11px;color:#94a3b8;background:#f8fafc;display:flex;justify-content:space-between}
      .gs-hint kbd{background:#e2e8f0;padding:1px 5px;border-radius:3px;font-family:monospace;font-size:10px}
    `;
    document.head.appendChild(s);
  }

  let results = [];
  let selectedIdx = 0;

  function ensureModal(){
    if (document.getElementById('gs-modal')) return;
    const m=document.createElement('div');
    m.id='gs-modal'; m.className='gs-overlay';
    m.innerHTML=`<div class="gs-modal">
      <input class="gs-input" id="gs-input" placeholder="🔍 Leita í kerfinu... (viðskiptavinum, reikningum, verkum, tækjum)" autocomplete="off">
      <div class="gs-results" id="gs-results"><div class="gs-empty">Sláðu inn leitarstreng</div></div>
      <div class="gs-hint"><span><kbd>↑</kbd> <kbd>↓</kbd> Velja · <kbd>Enter</kbd> Opna · <kbd>Esc</kbd> Loka</span><span>Cmd+K / Ctrl+K</span></div>
    </div>`;
    m.onclick = e => { if(e.target===m) close(); };
    document.body.appendChild(m);
    const inp=document.getElementById('gs-input');
    let to=null;
    inp.addEventListener('input', () => { clearTimeout(to); to=setTimeout(()=>search(inp.value), 200); });
    inp.addEventListener('keydown', e => {
      if (e.key==='Escape') close();
      else if (e.key==='ArrowDown') { e.preventDefault(); selectedIdx=Math.min(selectedIdx+1, results.length-1); renderResults(); }
      else if (e.key==='ArrowUp') { e.preventDefault(); selectedIdx=Math.max(selectedIdx-1, 0); renderResults(); }
      else if (e.key==='Enter') { e.preventDefault(); openResult(results[selectedIdx]); }
    });
  }

  function open(){ ensureModal(); document.getElementById('gs-modal').classList.add('show'); setTimeout(()=>document.getElementById('gs-input').focus(),50); }
  function close(){ const m=document.getElementById('gs-modal'); if(m){m.classList.remove('show'); document.getElementById('gs-input').value=''; results=[]; selectedIdx=0;} }

  async function search(q){
    if (!q || q.length<2) { document.getElementById('gs-results').innerHTML='<div class="gs-empty">Sláðu inn a.m.k. 2 stafi</div>'; results=[]; return; }
    const SB=getSB(); if(!SB) return;
    const safe = async p => { try { return await p; } catch (e) { return { data:[], error:e }; } };
    const [co, inv, job, dev, qt] = await Promise.all([
      safe(SB.from('fyrirtaeki').select('id,nafn,kennitala,heimilisfang').or(`nafn.ilike.%${q}%,kennitala.ilike.%${q}%,heimilisfang.ilike.%${q}%`).limit(8)),
      safe(SB.from('solur').select('id,num,company_nafn,samtals,created_at').or(`num.ilike.%${q}%,company_nafn.ilike.%${q}%`).limit(8)),
      safe(SB.from('verkbeidnir').select('id,num,company_nafn,status').or(`num.ilike.%${q}%,company_nafn.ilike.%${q}%`).limit(8)),
      safe(SB.from('uttaeki').select('id,nr,fyrirtaeki,tegund').or(`nr.ilike.%${q}%,fyrirtaeki.ilike.%${q}%`).limit(8)),
      safe(SB.from('tilbod').select('id,num,company_nafn,samtals').or(`num.ilike.%${q}%,company_nafn.ilike.%${q}%`).limit(5))
    ]);
    results=[];
    (co.data||[]).forEach(r=>results.push({type:'co',icon:'🏢',title:r.nafn,meta:r.kennitala||r.heimilisfang||'',action:'vidskiptavinir'}));
    (inv.data||[]).forEach(r=>results.push({type:'inv',icon:'📄',title:`${r.num||'#'+r.id} — ${r.company_nafn||''}`,meta:r.samtals?Math.round(r.samtals).toLocaleString()+' kr':'',action:'sala-list'}));
    (job.data||[]).forEach(r=>results.push({type:'job',icon:'🔧',title:`${r.num||'#'+r.id} — ${r.company_nafn||''}`,meta:r.status||'',action:'verkbeidnir'}));
    (dev.data||[]).forEach(r=>results.push({type:'dev',icon:'🔥',title:`${r.nr||'#'+r.id} — ${r.tegund||''}`,meta:r.fyrirtaeki||'',action:'thjonustutaeki'}));
    (qt.data||[]).forEach(r=>results.push({type:'qt',icon:'📝',title:`${r.num||'#'+r.id} — ${r.company_nafn||''}`,meta:r.samtals?Math.round(r.samtals).toLocaleString()+' kr':'',action:'tilbod'}));
    selectedIdx=0;
    renderResults();
  }

  function renderResults(){
    const root=document.getElementById('gs-results');
    if (!results.length) { root.innerHTML='<div class="gs-empty">Engar niðurstöður</div>'; return; }
    const groups={co:'🏢 Viðskiptavinir',inv:'📄 Reikningar',job:'🔧 Verk',dev:'🔥 Þjónustutæki',qt:'📝 Tilboð'};
    let html=''; let prevType=null; let idx=0;
    results.forEach(r => {
      if (r.type !== prevType) { if (prevType) html+='</div>'; html+=`<div class="gs-group"><div class="gs-group-hd">${groups[r.type]||r.type}</div>`; prevType=r.type; }
      html+=`<div class="gs-item ${idx===selectedIdx?'selected':''}" data-idx="${idx}"><div>${esc(r.icon)} ${esc(r.title)}</div>${r.meta?`<div class="meta">${esc(r.meta)}</div>`:''}</div>`;
      idx++;
    });
    if (prevType) html+='</div>';
    root.innerHTML=html;
    root.querySelectorAll('.gs-item').forEach(el => el.onclick = ()=>openResult(results[parseInt(el.dataset.idx)]));
    const sel=root.querySelector('.gs-item.selected'); if(sel) sel.scrollIntoView({block:'nearest'});
  }

  function openResult(r){
    if (!r) return;
    if (window.App && window.App.switchView) window.App.switchView(r.action);
    close();
  }

  document.addEventListener('keydown', e => {
    if ((e.metaKey||e.ctrlKey) && e.key==='k') { e.preventDefault(); open(); }
  });

  // Inject button into topbar
  function ensureBtn(){
    if (document.getElementById('gs-trigger')) return;
    const topbar = document.querySelector('.topbar') || document.querySelector('header');
    if (!topbar) return;
    const btn = document.createElement('button');
    btn.id='gs-trigger';
    btn.title='Alheimsleit (Ctrl+K)';
    btn.style.cssText='background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.15);border-radius:8px;padding:6px 12px;color:rgba(255,255,255,.85);cursor:pointer;font-size:13px;display:flex;align-items:center;gap:6px;margin:0 6px';
    btn.innerHTML='🔍 Leita... <kbd style="background:rgba(255,255,255,.15);padding:1px 5px;border-radius:3px;font-family:monospace;font-size:10px">⌘K</kbd>';
    btn.onclick=open;
    topbar.appendChild(btn);
  }
  setTimeout(ensureBtn, 1500);

  window.GlobalSearch = { open, close, search };
  console.log('[global-search] installed');
})();
