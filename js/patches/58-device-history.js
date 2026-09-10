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

    /* 10.09.2026 — ÞETTA SPJALD HAFÐI ALDREI SÝNT NEITT.
     *
     * Það voru þrjár villur ofan í hvor annarri, allar staðfestar á lifandi
     * skema 10.09.2026:
     *
     *  1) `skodunar_saga` var síuð á `uttaeki_id` og raðað á `dagsetning`.
     *     HVORUGUR dálkurinn er til. Taflan er: id, unit_id, date, tech,
     *     result, pressure, weight, notes, created_at.  → 400 í hvert sinn.
     *
     *  2) Reitirnir sem birtust (`taeknimadur`, `athugasemd`, `kostnadur`)
     *     tilheyra `afyllingar`, ALLT ANNARRI töflu — sem er tóm (0 raðir).
     *     Spjaldið var m.ö.o. skrifað eftir röngu skema frá byrjun. Þess vegna
     *     var „Heildarkostnaður" alltaf 0 kr: `kostnadur` er ekki til á
     *     `skodunar_saga` og verður aldrei reiknanlegur þaðan. Reiturinn er
     *     tekinn út frekar en að sýna falska núllið.
     *
     *  3) `verkdagbok` var join-uð á `equipment_ids` / `equipment_id`. Hvorugur
     *     er til, og það er ekki stafsetningarvilla: `verkdagbok` er
     *     DAGBÓK PER FYRIRTÆKI (fyrirtaeki, job_date, duft/lettvatn/kolsyra
     *     stærðir og fjöldi) — hún geymir ENGA tilvísun í einstakt tæki.
     *     Tengingin er því ekki til í skemanu og fyrirspurnin er felld niður.
     *     Ef Agnar vill tæki-tengda dagbók þarf nýjan dálk; ekki skálda hann.
     *
     * `_gk_audit` raðirnar (1.829 af 1.834) eru vélrænar vörður-færslur, ekki
     * skoðanir — sama útilokun og js/detailview.js:74 notar.
     */
    const safe = async p => { try { return await p; } catch (e) { return { data:[], error:e }; } };
    const hist = await safe(
      SB.from('skodunar_saga').select('*')
        .eq('unit_id', device.id).neq('result','_gk_audit')
        .order('date',{ascending:false}).limit(100)
    );

    const inspections = (hist.data || []);
    const histErr = hist.error || null;

    document.getElementById('dh-body').innerHTML = `
      <div class="dh-stats">
        <div class="dh-stat"><div class="lbl">Síðasta skoðun</div><div class="val">${fmtDate(device.last_insp)}</div></div>
        <div class="dh-stat"><div class="lbl">Næsta skoðun</div><div class="val">${fmtDate(device.next_insp)}</div></div>
        <div class="dh-stat"><div class="lbl">Skoðanir alls</div><div class="val">${inspections.length}</div></div>
        <div class="dh-stat"><div class="lbl">Staða</div><div class="val">${esc(device.status||'—')}</div></div>
      </div>
      <h3 style="margin:18px 0 10px;font-size:14px">📋 Saga</h3>
      ${histErr ? `<div style="padding:14px;background:#fef2f2;border:1px solid #fecaca;color:#991b1b;border-radius:8px">⚠️ Gat ekki lesið skoðunarsögu: ${esc(histErr.message||String(histErr))}</div>`
       : inspections.length ? `<div class="dh-timeline">
        ${inspections.map(r=>`<div class="dh-tl-item">
          <div class="dh-tl-date">${fmtDate(r.date)}</div>
          <div class="dh-tl-title">🔧 Skoðun ${r.tech?'· '+esc(r.tech):''}${r.result?' — '+esc(r.result):''}</div>
          ${r.notes?`<div class="dh-tl-meta">${esc(r.notes)}</div>`:''}
          ${(r.pressure||r.weight)?`<div class="dh-tl-meta">${r.pressure?'Þrýstingur: '+esc(r.pressure):''}${(r.pressure&&r.weight)?' · ':''}${r.weight?'Þyngd: '+esc(r.weight):''}</div>`:''}
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
