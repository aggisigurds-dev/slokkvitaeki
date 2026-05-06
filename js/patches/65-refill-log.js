/* === ÁFYLLINGARBÓK / REFILL LOG v1 === */
/* Logs CO2/dry-powder refills per device, with quantities used.
 *
 * SQL:
 *   CREATE TABLE IF NOT EXISTS afyllingar (
 *     id BIGSERIAL PRIMARY KEY,
 *     uttaeki_id BIGINT,
 *     uttaeki_nr TEXT,
 *     dagsetning DATE NOT NULL DEFAULT CURRENT_DATE,
 *     efni TEXT,        -- 'CO2' | 'thurrduft' | 'vatn' | 'froda'
 *     magn_kg NUMERIC,
 *     kostnadur NUMERIC DEFAULT 0,
 *     taeknimadur TEXT,
 *     athugasemd TEXT,
 *     created_at TIMESTAMPTZ DEFAULT NOW()
 *   );
 */
(() => {
  if (window.__refillInstalled) return;
  window.__refillInstalled = true;

  function getSB(){ return window.DB && window.DB.sb; }
  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function fmtDate(d){if(!d)return'—';const x=new Date(d);return x.getDate()+'.'+(x.getMonth()+1)+'.'+x.getFullYear();}
  function fmtKr(n){if(!n&&n!==0)return'—';const s=Math.round(n).toString();const r=[];let t=s;while(t.length>3){r.unshift(t.slice(-3));t=t.slice(0,-3);}r.unshift(t);return r.join('.')+' kr';}

  let entries = [];

  function ensureNav(){
    if (document.querySelector('.vnav-btn[data-view="afyllingar"]')) return;
    const sample = document.querySelector('.vnav-btn[data-view="utgjold"]') || document.querySelector('.vnav-btn[data-view="birgdir"]');
    if (!sample) return;
    const btn = sample.cloneNode(false);
    btn.className = sample.className.replace(/\bactive\b/g,'').trim();
    btn.dataset.view = 'afyllingar';
    btn.textContent = '♻️ Áfyllingar';
    btn.onclick = () => window.App && window.App.switchView('afyllingar');
    sample.parentElement.insertBefore(btn, sample.nextSibling);
  }
  function ensureView(){
    if (document.getElementById('view-afyllingar')) return;
    const sample = document.getElementById('view-utgjold') || document.getElementById('view-birgdir') || document.getElementById('view-sala');
    if (!sample || !sample.parentElement) return;
    const v = document.createElement('div');
    v.id = 'view-afyllingar';
    v.className = sample.className.replace(/\bactive\b/g,'').trim();
    v.innerHTML = '<main id="af-main" class="main-panel"></main>';
    sample.parentElement.appendChild(v);
  }
  function patchSwitch(){
    if (!window.App || window.App._afPatch) return;
    const orig = window.App.switchView;
    window.App.switchView = function(view){
      if (view==='afyllingar'){
        ensureView();
        document.querySelectorAll('[id^="view-"]').forEach(v=>{ v.style.display='none'; v.classList.remove('active'); });
        const v=document.getElementById('view-afyllingar');
        if (v){ v.style.display='block'; v.classList.add('active'); }
        document.querySelectorAll('.vnav-btn').forEach(b=>b.classList.toggle('active', b.dataset.view==='afyllingar'));
        load(); return;
      }
      orig.apply(this, arguments);
    };
    window.App._afPatch = true;
  }

  async function load(){
    const main = document.querySelector('#view-afyllingar #af-main');
    if (!main) return;
    main.innerHTML = '<div style="padding:30px;text-align:center;color:#94a3b8">Hleður...</div>';
    const SB = getSB(); if (!SB) return;
    const { data, error } = await SB.from('afyllingar').select('*').order('dagsetning',{ascending:false}).limit(500);
    if (error) {
      if (/relation .* does not exist/i.test(error.message)) {
        main.innerHTML = '<div style="padding:30px;text-align:center">⚠️ Taflan vantar — keyrðu MIGRATION.sql</div>';
        return;
      }
      main.innerHTML = `<div style="padding:30px;text-align:center;color:#dc2626">${esc(error.message)}</div>`;
      return;
    }
    entries = data || [];
    render();
  }

  function render(){
    const main = document.querySelector('#view-afyllingar #af-main');
    if (!main) return;
    const byEfni = {};
    entries.forEach(e => {
      const k = e.efni || '—';
      if (!byEfni[k]) byEfni[k] = { kg:0, kr:0, n:0 };
      byEfni[k].kg += parseFloat(e.magn_kg)||0;
      byEfni[k].kr += parseFloat(e.kostnadur)||0;
      byEfni[k].n++;
    });

    main.innerHTML = `
      <div style="max-width:1180px;margin:0 auto">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;flex-wrap:wrap;gap:8px">
          <div>
            <h1 style="margin:0;font-size:20px">♻️ Áfyllingarbók</h1>
            <div style="font-size:13px;color:#64748b">Skráning áfyllinga á slökkvitæki (CO₂, þurrduft, o.fl.)</div>
          </div>
          <button class="btn btn-primary" onclick="RefillLog._open()">+ Ný áfylling</button>
        </div>

        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:10px;margin-bottom:18px">
          ${Object.entries(byEfni).map(([k,d])=>`
            <div style="background:#fff;border-radius:10px;padding:12px;box-shadow:0 1px 3px rgba(0,0,0,.04)">
              <div style="font-size:11px;color:#64748b;text-transform:uppercase">${esc(k)}</div>
              <div style="font-size:18px;font-weight:700;margin-top:2px">${d.kg.toFixed(1)} kg</div>
              <div style="font-size:11px;color:#94a3b8">${d.n} áfyllingar · ${fmtKr(d.kr)}</div>
            </div>`).join('')}
        </div>

        ${entries.length ? `<table style="width:100%;border-collapse:collapse;background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.04);font-size:13px">
          <thead><tr style="background:#f8fafc">
            <th style="padding:10px;text-align:left;font-size:11px;text-transform:uppercase;color:#64748b">Dags</th>
            <th style="padding:10px;text-align:left;font-size:11px;text-transform:uppercase;color:#64748b">Tæki</th>
            <th style="padding:10px;text-align:left;font-size:11px;text-transform:uppercase;color:#64748b">Efni</th>
            <th style="padding:10px;text-align:right;font-size:11px;text-transform:uppercase;color:#64748b">Magn (kg)</th>
            <th style="padding:10px;text-align:right;font-size:11px;text-transform:uppercase;color:#64748b">Kostnaður</th>
            <th style="padding:10px;text-align:left;font-size:11px;text-transform:uppercase;color:#64748b">Tæknim.</th>
            <th></th>
          </tr></thead>
          <tbody>${entries.map(e=>`<tr style="border-top:1px solid #f1f5f9">
            <td style="padding:8px 10px">${fmtDate(e.dagsetning)}</td>
            <td style="padding:8px 10px;font-weight:600">${esc(e.uttaeki_nr||'')}</td>
            <td style="padding:8px 10px">${esc(e.efni||'')}</td>
            <td style="padding:8px 10px;text-align:right">${(e.magn_kg||0).toFixed(1)}</td>
            <td style="padding:8px 10px;text-align:right">${fmtKr(e.kostnadur)}</td>
            <td style="padding:8px 10px">${esc(e.taeknimadur||'')}</td>
            <td style="padding:8px 10px"><button class="btn btn-sm btn-outline" onclick="RefillLog._delete(${e.id})">🗑</button></td>
          </tr>`).join('')}</tbody>
        </table>` : '<div style="padding:30px;text-align:center;color:#94a3b8">Engar áfyllingar skráðar</div>'}
      </div>`;
  }

  function _open(){
    const today = new Date().toISOString().slice(0,10);
    const m = document.createElement('div');
    m.id='af-modal';
    m.style.cssText='position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;padding:16px';
    m.onclick = e => { if(e.target===m) m.remove(); };
    m.innerHTML = `
      <div style="background:#fff;border-radius:14px;padding:22px;max-width:480px;width:100%">
        <h3 style="margin:0 0 12px">+ Ný áfylling</h3>
        <div style="display:grid;gap:8px">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
            <div><label style="font-size:11px;color:#64748b">Dagsetning</label>
              <input type="date" id="af-date" value="${today}" style="width:100%;padding:6px;border:1px solid #e2e8f0;border-radius:6px;box-sizing:border-box"></div>
            <div><label style="font-size:11px;color:#64748b">Tæki nr</label>
              <input type="text" id="af-nr" placeholder="SK-1234" style="width:100%;padding:6px;border:1px solid #e2e8f0;border-radius:6px;box-sizing:border-box"></div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px">
            <div><label style="font-size:11px;color:#64748b">Efni</label>
              <select id="af-efni" style="width:100%;padding:6px;border:1px solid #e2e8f0;border-radius:6px">
                <option value="CO2">CO₂</option>
                <option value="thurrduft">Þurrduft</option>
                <option value="vatn">Vatn</option>
                <option value="froda">Froða</option>
                <option value="annad">Annað</option>
              </select></div>
            <div><label style="font-size:11px;color:#64748b">Magn (kg)</label>
              <input type="number" id="af-kg" step="0.1" min="0" style="width:100%;padding:6px;border:1px solid #e2e8f0;border-radius:6px;box-sizing:border-box"></div>
            <div><label style="font-size:11px;color:#64748b">Kostn. (kr)</label>
              <input type="number" id="af-kr" min="0" style="width:100%;padding:6px;border:1px solid #e2e8f0;border-radius:6px;box-sizing:border-box"></div>
          </div>
          <div><label style="font-size:11px;color:#64748b">Tæknimaður</label>
            <input type="text" id="af-tech" value="${esc(localStorage.getItem('cfg_default_tech')||'')}" style="width:100%;padding:6px;border:1px solid #e2e8f0;border-radius:6px;box-sizing:border-box"></div>
          <div><label style="font-size:11px;color:#64748b">Athugasemd</label>
            <textarea id="af-note" rows="2" style="width:100%;padding:6px;border:1px solid #e2e8f0;border-radius:6px;box-sizing:border-box"></textarea></div>
        </div>
        <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:14px">
          <button class="btn btn-outline" onclick="document.getElementById('af-modal').remove()">Hætta við</button>
          <button class="btn btn-primary" onclick="RefillLog._save()">Vista</button>
        </div>
      </div>`;
    document.body.appendChild(m);
    setTimeout(() => document.getElementById('af-nr')?.focus(), 50);
  }

  async function _save(){
    const SB = getSB();
    const rec = {
      dagsetning: document.getElementById('af-date').value,
      uttaeki_nr: document.getElementById('af-nr').value.trim(),
      efni: document.getElementById('af-efni').value,
      magn_kg: parseFloat(document.getElementById('af-kg').value)||0,
      kostnadur: parseFloat(document.getElementById('af-kr').value)||0,
      taeknimadur: document.getElementById('af-tech').value.trim(),
      athugasemd: document.getElementById('af-note').value.trim()
    };
    if (!rec.magn_kg) { alert('Sláðu inn magn'); return; }
    // Try resolving uttaeki_id from nr
    if (rec.uttaeki_nr) {
      const { data: dev } = await SB.from('uttaeki').select('id').eq('nr', rec.uttaeki_nr).limit(1).single();
      if (dev) rec.uttaeki_id = dev.id;
    }
    const { error } = await SB.from('afyllingar').insert(rec);
    if (error) { alert('Villa: '+error.message); return; }
    document.getElementById('af-modal').remove();
    load();
  }

  async function _delete(id){
    if (!confirm('Eyða áfyllingu?')) return;
    await getSB().from('afyllingar').delete().eq('id', id);
    load();
  }

  function init(){ ensureNav(); ensureView(); patchSwitch(); }
  setTimeout(init, 1000);
  setTimeout(init, 2500);

  window.RefillLog = { load, _open, _save, _delete };
  console.log('[refill-log] installed');
})();
