/* === TÆKNIMENN + SKÍRTEINI / TECHNICIANS + CERTIFICATIONS v1 === */
/* SQL:
 *   ALTER TABLE taeknimenn ADD COLUMN IF NOT EXISTS hire_date DATE;
 *   ALTER TABLE taeknimenn ADD COLUMN IF NOT EXISTS hourly_rate NUMERIC;
 *   ALTER TABLE taeknimenn ADD COLUMN IF NOT EXISTS phone TEXT;
 *   ALTER TABLE taeknimenn ADD COLUMN IF NOT EXISTS email TEXT;
 *   ALTER TABLE taeknimenn ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT TRUE;
 *
 *   CREATE TABLE IF NOT EXISTS skirteini (
 *     id BIGSERIAL PRIMARY KEY,
 *     taeknimadur_id BIGINT,
 *     taeknimadur_nafn TEXT,
 *     skirteini_nafn TEXT NOT NULL,
 *     utgefandi TEXT,
 *     gefid_ut DATE,
 *     rennur_ut DATE,
 *     athugasemd TEXT,
 *     created_at TIMESTAMPTZ DEFAULT NOW()
 *   );
 */
(() => {
  if (window.__techsInstalled) return;
  window.__techsInstalled = true;

  function getSB(){ return window.DB && window.DB.sb; }
  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function fmtDate(d){if(!d)return'—';const x=new Date(d);return x.getDate()+'.'+(x.getMonth()+1)+'.'+x.getFullYear();}
  function daysFrom(d){return Math.round((new Date(d) - new Date())/86400000);}

  let techs = [];
  let certs = [];

  function ensureNav(){
    if (document.querySelector('.vnav-btn[data-view="taeknimenn"]')) return;
    const sample = document.querySelector('.vnav-btn[data-view="timar"]');
    if (!sample) return;
    const btn = sample.cloneNode(false);
    btn.className = sample.className.replace(/\bactive\b/g,'').trim();
    btn.dataset.view = 'taeknimenn';
    btn.textContent = '👥 Tæknimenn';
    btn.onclick = () => window.App && window.App.switchView('taeknimenn');
    sample.parentElement.insertBefore(btn, sample.nextSibling);
  }
  function ensureView(){
    if (document.getElementById('view-taeknimenn')) return;
    const sample = document.getElementById('view-timar') || document.getElementById('view-sala');
    if (!sample || !sample.parentElement) return;
    const v = document.createElement('div');
    v.id = 'view-taeknimenn';
    v.className = sample.className.replace(/\bactive\b/g,'').trim();
    v.innerHTML = '<main id="tm-main" class="main-panel"></main>';
    sample.parentElement.appendChild(v);
  }
  function patchSwitch(){
    if (!window.App || window.App._tmPatch) return;
    const orig = window.App.switchView;
    window.App.switchView = function(view){
      if (view==='taeknimenn'){
        ensureView();
        document.querySelectorAll('[id^="view-"]').forEach(v=>{ v.style.display='none'; v.classList.remove('active'); });
        const v=document.getElementById('view-taeknimenn');
        if (v){ v.style.display='block'; v.classList.add('active'); }
        document.querySelectorAll('.vnav-btn').forEach(b=>b.classList.toggle('active', b.dataset.view==='taeknimenn'));
        load(); return;
      }
      orig.apply(this, arguments);
    };
    window.App._tmPatch = true;
  }

  async function load(){
    const main = document.querySelector('#view-taeknimenn #tm-main');
    if (!main) return;
    main.innerHTML = '<div style="padding:30px;text-align:center;color:#94a3b8">Hleður...</div>';
    const SB = getSB(); if (!SB) return;
    const safe = async p => { try { return await p; } catch (e) { return { data:[], error:e }; } };
    const [tRes, cRes] = await Promise.all([
      safe(SB.from('taeknimenn').select('*').order('nafn')),
      safe(SB.from('skirteini').select('*').order('rennur_ut',{ascending:true}))
    ]);
    techs = tRes.data || [];
    certs = cRes.data || [];
    if (cRes.error && /relation .* does not exist/i.test(cRes.error.message||'')) {
      main.innerHTML = '<div style="padding:30px;text-align:center">⚠️ Skírteini-tafla vantar — keyrðu MIGRATION.sql</div>';
      return;
    }
    render();
  }

  function render(){
    const main = document.querySelector('#view-taeknimenn #tm-main');
    if (!main) return;
    const today = new Date(); today.setHours(0,0,0,0);
    const expiring = certs.filter(c => c.rennur_ut && new Date(c.rennur_ut) <= new Date(today.getTime()+90*86400000));

    main.innerHTML = `
      <div style="max-width:1180px;margin:0 auto">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;flex-wrap:wrap;gap:8px">
          <div>
            <h1 style="margin:0;font-size:20px">👥 Tæknimenn</h1>
            <div style="font-size:13px;color:#64748b">Starfsmenn og þeirra fagskírteini</div>
          </div>
          <div style="display:flex;gap:6px">
            <button class="btn btn-outline" onclick="Technicians._addCert()">+ Skírteini</button>
            <button class="btn btn-primary" onclick="Technicians._addTech()">+ Tæknimann</button>
          </div>
        </div>

        ${expiring.length ? `<div style="background:#fef3c7;border:1px solid #fde68a;border-radius:10px;padding:12px;margin-bottom:14px">
          <strong>⚠️ ${expiring.length} skírteini renna út innan 90 daga:</strong>
          ${expiring.map(c=>`<div style="font-size:13px;margin-top:4px">${esc(c.taeknimadur_nafn||'')} — ${esc(c.skirteini_nafn)} ${c.rennur_ut?`(rennur ${fmtDate(c.rennur_ut)})`:''}</div>`).join('')}
        </div>`:''}

        <h2 style="margin:18px 0 10px;font-size:14px">Tæknimenn</h2>
        ${techs.length ? `<table style="width:100%;border-collapse:collapse;background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.04)">
          <thead><tr style="background:#f8fafc">
            <th style="padding:10px;text-align:left;font-size:11px;text-transform:uppercase;color:#64748b">Nafn</th>
            <th style="padding:10px;text-align:left;font-size:11px;text-transform:uppercase;color:#64748b">Sími</th>
            <th style="padding:10px;text-align:left;font-size:11px;text-transform:uppercase;color:#64748b">Ráðningardagur</th>
            <th style="padding:10px;text-align:right;font-size:11px;text-transform:uppercase;color:#64748b">Tímakaup</th>
            <th style="padding:10px;text-align:left;font-size:11px;text-transform:uppercase;color:#64748b">Skírteini</th>
            <th></th>
          </tr></thead>
          <tbody>${techs.map(t=>{
            const myCerts = certs.filter(c => c.taeknimadur_id===t.id || (c.taeknimadur_nafn||'').toLowerCase()===(t.nafn||'').toLowerCase());
            return `<tr style="border-top:1px solid #f1f5f9">
              <td style="padding:10px"><strong>${esc(t.nafn||'')}</strong>${t.email?`<div style="font-size:11px;color:#94a3b8">${esc(t.email)}</div>`:''}</td>
              <td style="padding:10px;font-size:13px">${esc(t.phone||'—')}</td>
              <td style="padding:10px;font-size:13px">${fmtDate(t.hire_date)}</td>
              <td style="padding:10px;font-size:13px;text-align:right">${t.hourly_rate?Math.round(t.hourly_rate).toLocaleString()+' kr':'—'}</td>
              <td style="padding:10px;font-size:11px">${myCerts.length?myCerts.map(c=>{
                const d = c.rennur_ut?daysFrom(c.rennur_ut):null;
                const color = d===null?'#64748b':(d<0?'#dc2626':d<90?'#f59e0b':'#16a34a');
                return `<span style="display:inline-block;padding:1px 6px;background:#f1f5f9;border-radius:99px;margin:1px;color:${color}">${esc(c.skirteini_nafn)}</span>`;
              }).join(''):'—'}</td>
              <td style="padding:10px;font-size:11px"><button class="btn btn-sm btn-outline" onclick="Technicians._editTech(${t.id})">✏️</button></td>
            </tr>`;
          }).join('')}</tbody>
        </table>` : '<div style="padding:30px;text-align:center;color:#94a3b8">Engir tæknimenn enn</div>'}

        <h2 style="margin:24px 0 10px;font-size:14px">Skírteini</h2>
        ${certs.length ? `<table style="width:100%;border-collapse:collapse;background:#fff;border-radius:10px;overflow:hidden">
          <thead><tr style="background:#f8fafc">
            <th style="padding:10px;text-align:left;font-size:11px;text-transform:uppercase;color:#64748b">Tæknimaður</th>
            <th style="padding:10px;text-align:left;font-size:11px;text-transform:uppercase;color:#64748b">Skírteini</th>
            <th style="padding:10px;text-align:left;font-size:11px;text-transform:uppercase;color:#64748b">Útgefandi</th>
            <th style="padding:10px;text-align:left;font-size:11px;text-transform:uppercase;color:#64748b">Gefið út</th>
            <th style="padding:10px;text-align:left;font-size:11px;text-transform:uppercase;color:#64748b">Rennur út</th>
            <th></th>
          </tr></thead>
          <tbody>${certs.map(c=>{
            const d = c.rennur_ut?daysFrom(c.rennur_ut):null;
            const color = d===null?'#64748b':(d<0?'#dc2626':d<90?'#f59e0b':'#16a34a');
            return `<tr style="border-top:1px solid #f1f5f9">
              <td style="padding:10px;font-size:13px"><strong>${esc(c.taeknimadur_nafn||'')}</strong></td>
              <td style="padding:10px;font-size:13px">${esc(c.skirteini_nafn||'')}</td>
              <td style="padding:10px;font-size:13px">${esc(c.utgefandi||'—')}</td>
              <td style="padding:10px;font-size:13px">${fmtDate(c.gefid_ut)}</td>
              <td style="padding:10px;font-size:13px;color:${color};font-weight:${d!==null&&d<90?'700':'400'}">${fmtDate(c.rennur_ut)}${d!==null?` <small>(${d<0?-d+'d í tímadrögun':d+'d')</small>`:''}</td>
              <td style="padding:10px"><button class="btn btn-sm btn-outline" onclick="Technicians._delCert(${c.id})">🗑</button></td>
            </tr>`;
          }).join('')}</tbody>
        </table>` : '<div style="padding:20px;text-align:center;color:#94a3b8">Engin skírteini skráð</div>'}
      </div>`;
  }

  async function _addTech(id){
    const t = id ? techs.find(x=>x.id===id) : {};
    const nafn = prompt('Nafn:', t.nafn||''); if (!nafn) return;
    const phone = prompt('Sími:', t.phone||'')||'';
    const email = prompt('Netfang:', t.email||'')||'';
    const hire = prompt('Ráðningardagur (YYYY-MM-DD):', t.hire_date||'')||null;
    const rate = prompt('Tímakaup (kr):', t.hourly_rate||'')||0;
    const SB = getSB();
    const rec = { nafn, phone, email, hire_date:hire, hourly_rate:parseFloat(rate)||0, active:true };
    if (id) await SB.from('taeknimenn').update(rec).eq('id', id);
    else await SB.from('taeknimenn').insert(rec);
    load();
  }
  async function _editTech(id){ _addTech(id); }

  async function _addCert(){
    const techNafn = prompt('Tæknimaður (nafn):'); if (!techNafn) return;
    const skirteini = prompt('Skírteini nafn (t.d. „Brunavarnir námskeið"):'); if (!skirteini) return;
    const utgefandi = prompt('Útgefandi:')||'';
    const gefid = prompt('Gefið út (YYYY-MM-DD):')||null;
    const rennur = prompt('Rennur út (YYYY-MM-DD):')||null;
    const tech = techs.find(x=>(x.nafn||'').toLowerCase()===techNafn.toLowerCase());
    const SB = getSB();
    await SB.from('skirteini').insert({
      taeknimadur_id: tech?tech.id:null,
      taeknimadur_nafn: techNafn,
      skirteini_nafn: skirteini,
      utgefandi, gefid_ut:gefid, rennur_ut:rennur
    });
    load();
  }
  async function _delCert(id){ if (!confirm('Eyða?')) return; await getSB().from('skirteini').delete().eq('id', id); load(); }

  function init(){ ensureNav(); ensureView(); patchSwitch(); }
  setTimeout(init, 1000);
  setTimeout(init, 2500);

  window.Technicians = { load, _addTech, _editTech, _addCert, _delCert };
  console.log('[technicians] installed');
})();
