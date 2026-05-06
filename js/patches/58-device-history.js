/* === ÞJÓNUSTUSAGA Á TÆKI / DEVICE HISTORY v1 === */
(() => {
  if (window.__deviceHistInstalled) return;
  window.__deviceHistInstalled = true;

  function getSB(){ return window.DB && window.DB.sb; }
  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function fmtDate(d){if(!d)return'—';const x=new Date(d);return x.getDate()+'.'+(x.getMonth()+1)+'.'+x.getFullYear();}
  function fmtKr(n){if(!n&&n!==0)return'—';const s=Math.round(n).toString();const r=[];let t=s;while(t.length>3){r.unshift(t.slice(-3));t=t.slice(0,-3);}r.unshift(t);return r.join('.')+' kr';}

  if (!document.getElementById('dh-style')) {
    const s=document.createElement('style'); s.id='dh-style';
    s.textContent=`
      .dh-modal-wrap{position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.5);padding:16px;overflow:auto}
      .dh-modal{background:#fff;border-radius:14px;padding:0;max-width:680px;width:100%;max-height:90vh;overflow:auto}
      .dh-hd{background:linear-gradient(135deg,#dc2626,#991b1b);color:#fff;padding:20px;border-radius:14px 14px 0 0}
      .dh-bd{padding:18px}
      .dh-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:8px;margin-bottom:14px}
      .dh-stat{background:#f8fafc;padding:10px;border-radius:8px}
      .dh-stat .lbl{font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:.05em}
      .dh-stat .val{font-size:15px;font-weight:700;margin-top:2px}
      .dh-timeline{position:relative;padding-left:20px;border-left:2px solid #e2e8f0}
      .dh-tl-item{margin-bottom:14px;position:relative}
      .dh-tl-item:before{content:'';position:absolute;left:-26px;top:4px;width:10px;height:10px;border-radius:50%;background:#3b82f6}
      .dh-tl-date{font-size:11px;color:#64748b;font-weight:600}
      .dh-tl-title{font-weight:600;margin-top:2px}
      .dh-tl-meta{font-size:12px;color:#475569;margin-top:2px}
    `;
    document.head.appendChild(s);
  }

  async function show(device){
    const SB = getSB(); if (!SB) return;
    document.getElementById('dh-modal')?.remove();
    const m=document.createElement('div'); m.id='dh-modal'; m.className='dh-modal-wrap';
    m.onclick=e=>{ if(e.target===m) m.remove(); };
    m.innerHTML = `
      <div class="dh-modal">
        <div class="dh-hd">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <div>
              <div style="font-size:11px;opacity:.85;text-transform:uppercase;letter-spacing:.05em">Þjónustusaga</div>
              <h2 style="margin:4px 0 0;font-size:20px">🔥 ${esc(device.nr||'#'+device.id)} — ${esc(device.tegund||'Slökkvitæki')}</h2>
              <div style="opacity:.85;font-size:13px;margin-top:2px">${esc(device.fyrirtaeki||'')}</div>
            </div>
            <button onclick="document.getElementById('dh-modal').remove()" style="background:rgba(255,255,255,.2);border:none;color:#fff;width:32px;height:32px;border-radius:8px;cursor:pointer;font-size:16px">✕</button>
          </div>
        </div>
        <div class="dh-bd" id="dh-body">Hleður sögu...</div>
      </div>`;
    document.body.appendChild(m);

    const safe = async p => { try { return await p; } catch (e) { return { data:[], error:e }; } };
    const [hist, vd] = await Promise.all([
      safe(SB.from('skodunar_saga').select('*').eq('uttaeki_id', device.id).order('dagsetning',{ascending:false})),
      safe(SB.from('verkdagbok').select('*').or(`equipment_ids.cs.{${device.id}},equipment_id.eq.${device.id}`).order('created_at',{ascending:false}).limit(20))
    ]);

    const inspections = hist.data || [];
    const diary = vd.data || [];

    const totalCost = inspections.reduce((s,r)=>s+(parseFloat(r.kostnadur)||0),0);

    document.getElementById('dh-body').innerHTML = `
      <div class="dh-stats">
        <div class="dh-stat"><div class="lbl">Síðasta skoðun</div><div class="val">${fmtDate(device.last_insp)}</div></div>
        <div class="dh-stat"><div class="lbl">Næsta skoðun</div><div class="val">${fmtDate(device.next_insp)}</div></div>
        <div class="dh-stat"><div class="lbl">Skoðanir alls</div><div class="val">${inspections.length}</div></div>
        <div class="dh-stat"><div class="lbl">Heildarkostnaður</div><div class="val">${fmtKr(totalCost)}</div></div>
      </div>
      <h3 style="margin:18px 0 10px;font-size:14px">📋 Saga</h3>
      ${inspections.length||diary.length ? `<div class="dh-timeline">
        ${inspections.map(r=>`<div class="dh-tl-item">
          <div class="dh-tl-date">${fmtDate(r.dagsetning)}</div>
          <div class="dh-tl-title">🔧 Skoðun ${r.taeknimadur?'· '+esc(r.taeknimadur):''}</div>
          ${r.athugasemd?`<div class="dh-tl-meta">${esc(r.athugasemd)}</div>`:''}
          ${r.kostnadur?`<div class="dh-tl-meta">Kostnaður: ${fmtKr(r.kostnadur)}</div>`:''}
        </div>`).join('')}
        ${diary.map(r=>`<div class="dh-tl-item">
          <div class="dh-tl-date">${fmtDate(r.created_at)}</div>
          <div class="dh-tl-title">📔 Verkdagbók</div>
          ${r.athugasemdir?`<div class="dh-tl-meta">${esc(r.athugasemdir)}</div>`:''}
        </div>`).join('')}
      </div>` : '<div style="padding:20px;text-align:center;color:#94a3b8">Engin saga skráð enn</div>'}`;
  }

  // Inject "📜 Saga" button on þjónustutæki rows
  const obs = new MutationObserver(() => {
    document.querySelectorAll('[data-uttaeki-id]:not([data-dh-injected]), [data-device-id]:not([data-dh-injected])').forEach(row => {
      const id = parseInt(row.dataset.uttaekiId || row.dataset.deviceId);
      if (!id) return;
      row.dataset.dhInjected='1';
      const actions = row.querySelector('.row-actions, .device-actions');
      if (!actions) return;
      const btn = document.createElement('button');
      btn.className='btn btn-ghost btn-sm';
      btn.title='Þjónustusaga';
      btn.innerHTML='📜';
      btn.onclick = async e => {
        e.stopPropagation();
        const SB=getSB(); if(!SB) return;
        const { data } = await SB.from('uttaeki').select('*').eq('id', id).single();
        if (data) show(data);
      };
      actions.appendChild(btn);
    });
  });
  obs.observe(document.body, { childList:true, subtree:true });

  window.DeviceHistory = { show };
  console.log('[device-history] installed');
})();
