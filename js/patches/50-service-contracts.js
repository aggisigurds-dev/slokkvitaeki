/* === ÞJÓNUSTUSAMNINGAR / SERVICE CONTRACTS v2 === */
/* Form designed to match the paper contract used by Slökkvitæki ehf:
 *   Þjónustusamningur · Hleðsla–Sala–Þjónusta · sími 565-4080
 *   Nafn / kt / Heimilisfang
 *   Umsjón með: ☐ Slökkvitækjum ☐ Reykskynjurum  Annað: ___
 *
 * Features:
 *   • Edit form matching paper layout
 *   • Print view (looks like the paper contract)
 *   • Photo upload of signed contract → Supabase 'samningar' bucket
 *   • Searchable list with status pills
 *
 * SQL: thjonustusamningar table + new columns in patch 50b.
 */
(() => {
  if (window.__contractsInstalled) { /* allow reinstall on patch upgrade */ }
  window.__contractsInstalled = true;

  const BUCKET = 'samningar';
  const COMPANY = {
    nafn: 'Slökkvitæki ehf',
    kt:   '600508-0400',
    heimilisfang: 'Helluhrauni 10, 220 Hafnarfirði',
    sími: '565-4080',
    netfang: 'eldklar@eldklar.is',
    vsknr: '98107',
    slogan: 'Hleðsla – Sala – Þjónusta',
    fineprint: 'Slökkvitæki ehf leggja áherslu á persónulega og vandaða þjónustu.'
  };

  function getSB(){ return window.DB && window.DB.sb; }
  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function fmtKr(n){if(!n&&n!==0)return'—';const s=Math.round(n).toString();const r=[];let t=s;while(t.length>3){r.unshift(t.slice(-3));t=t.slice(0,-3);}r.unshift(t);return r.join('.')+' kr';}
  function fmtDate(d){if(!d)return'—';const x=new Date(d);return String(x.getDate()).padStart(2,'0')+'.'+String(x.getMonth()+1).padStart(2,'0')+'.'+x.getFullYear();}
  function addMonths(d, m){const x=new Date(d);x.setMonth(x.getMonth()+m);return x.toISOString().slice(0,10);}

  let contracts = [];
  let searchQuery = '';
  let _pendingPhoto = null; // staged file for legacy import (before record exists)

  if (!document.getElementById('contract-style')) {
    const s = document.createElement('style');
    s.id = 'contract-style';
    s.textContent = `
      #view-samningar .ct-wrap { max-width:1180px; margin:0 auto; }
      #view-samningar .ct-search { padding:9px 12px; border:1px solid #e2e8f0; border-radius:8px; min-width:240px; flex:1; }
      #view-samningar table { width:100%; border-collapse:collapse; background:#fff; border-radius:10px; overflow:hidden; box-shadow:0 1px 3px rgba(0,0,0,.04); }
      #view-samningar th, #view-samningar td { padding:10px; text-align:left; font-size:13px; border-bottom:1px solid #f1f5f9; vertical-align:middle; }
      #view-samningar th { background:#f8fafc; font-weight:600; font-size:11px; text-transform:uppercase; letter-spacing:.05em; color:#64748b; }
      #view-samningar tr:hover td { background:#fafbfc; cursor:pointer; }
      .ct-soon { color:#f59e0b; font-weight:700; }
      .ct-overdue { color:#dc2626; font-weight:700; }
      .ct-tag { display:inline-block; padding:1px 7px; background:#eff6ff; color:#1d4ed8; border-radius:99px; font-size:10px; font-weight:600; margin-right:3px; }
      .ct-modal-wrap { position:fixed; inset:0; z-index:99999; display:flex; align-items:center; justify-content:center; background:rgba(0,0,0,.45); padding:16px; overflow:auto; }
      .ct-modal { background:#fff; border-radius:14px; padding:0; max-width:680px; width:100%; max-height:92vh; overflow:auto; box-shadow:0 24px 64px rgba(0,0,0,.3); }
      .ct-form-hd { background:#1e293b; color:#fff; padding:18px 22px; display:flex; justify-content:space-between; align-items:center; border-radius:14px 14px 0 0; }
      .ct-form-hd h3 { margin:0; font-size:16px; }
      .ct-form-bd { padding:22px; }
      .ct-paper { border:2px solid #0f172a; padding:24px; background:#fff; }
      .ct-paper-hd { text-align:center; margin-bottom:18px; }
      .ct-paper-hd .title { font-size:22px; font-weight:700; }
      .ct-paper-hd .brand { font-size:24px; font-weight:800; letter-spacing:0.5px; margin:6px 0; }
      .ct-paper-hd .slogan { font-size:14px; font-weight:600; }
      .ct-paper-hd .phone { font-size:14px; font-weight:600; margin-top:4px; }
      .ct-paper-row { display:grid; grid-template-columns:140px 1fr 60px 160px; gap:6px; align-items:center; margin-bottom:8px; font-size:14px; }
      .ct-paper-row label { color:#0f172a; font-weight:500; }
      .ct-paper-row input[type=text], .ct-paper-row input[type=date] { width:100%; padding:6px 8px; border:none; border-bottom:1px solid #0f172a; font:inherit; box-sizing:border-box; background:transparent; }
      .ct-paper-row input:focus { outline:none; background:#fef3c7; }
      .ct-paper-body { font-size:14px; line-height:1.6; margin:14px 0; }
      .ct-paper-checks { margin:14px 0; }
      .ct-paper-checks label { display:flex; gap:8px; align-items:center; margin:6px 0; cursor:pointer; }
      .ct-paper-checks input[type=checkbox] { width:18px; height:18px; }
      .ct-paper-sig { display:grid; grid-template-columns:200px 1fr; gap:8px; align-items:center; margin:10px 0; font-size:13px; }
      .ct-paper-sig .line { border-bottom:1px solid #0f172a; height:24px; }
      .ct-paper-foot { text-align:center; font-size:11px; color:#64748b; margin-top:18px; padding-top:12px; border-top:1px solid #cbd5e1; }
      .ct-actions { display:flex; gap:8px; justify-content:flex-end; padding:14px 22px; background:#f8fafc; border-radius:0 0 14px 14px; flex-wrap:wrap; }
      .ct-photo-wrap { margin-top:14px; padding:12px; background:#f8fafc; border-radius:8px; }
      .ct-photo-wrap img { max-width:100%; max-height:160px; border-radius:6px; display:block; margin-top:6px; }
      @media print {
        body * { visibility:hidden; }
        .ct-print-frame, .ct-print-frame * { visibility:visible; }
        .ct-print-frame { position:absolute; inset:0; padding:24px; background:#fff; }
        .ct-paper { border:2px solid #000; }
      }
    `;
    document.head.appendChild(s);
  }

  function ensureNav() {
    if (document.querySelector('.vnav-btn[data-view="samningar"]')) return;
    const sample = document.querySelector('.vnav-btn[data-view="tilbod"]');
    if (!sample) return;
    const btn = sample.cloneNode(false);
    btn.className = sample.className.replace(/\bactive\b/g,'').trim();
    btn.dataset.view = 'samningar';
    btn.textContent = '📑 Samningar';
    btn.onclick = () => window.App && window.App.switchView('samningar');
    sample.parentElement.insertBefore(btn, sample.nextSibling);
  }
  function ensureView() {
    if (document.getElementById('view-samningar')) return;
    const sample = document.getElementById('view-tilbod') || document.getElementById('view-sala');
    if (!sample || !sample.parentElement) return;
    const v = document.createElement('div');
    v.id = 'view-samningar';
    v.className = sample.className.replace(/\bactive\b/g,'').trim();
    v.innerHTML = '<main id="ct-main" class="main-panel"></main>';
    sample.parentElement.appendChild(v);
  }
  function patchSwitch() {
    if (!window.App || window.App._ctPatch) return;
    const orig = window.App.switchView;
    window.App.switchView = function(view){
      if (view === 'samningar') {
        ensureView();
        document.querySelectorAll('[id^="view-"]').forEach(v=>{ v.style.display='none'; v.classList.remove('active'); });
        const v = document.getElementById('view-samningar');
        if (v) { v.style.display='block'; v.classList.add('active'); }
        document.querySelectorAll('.vnav-btn').forEach(b=>b.classList.toggle('active', b.dataset.view==='samningar'));
        load(); return;
      }
      orig.apply(this, arguments);
    };
    window.App._ctPatch = true;
  }

  async function load() {
    const main = document.querySelector('#view-samningar #ct-main');
    if (!main) return;
    main.innerHTML = '<div style="padding:30px;text-align:center;color:#94a3b8">Hleður...</div>';
    const SB = getSB(); if (!SB) return;
    const { data, error } = await SB.from('thjonustusamningar').select('*').order('next_due', { ascending:true });
    if (error) {
      if (/relation .* does not exist/i.test(error.message)) {
        main.innerHTML = '<div style="padding:30px;text-align:center">⚠️ Taflan vantar — keyrðu MIGRATION.sql</div>';
        return;
      }
      main.innerHTML = `<div style="padding:30px;text-align:center;color:#dc2626">${esc(error.message)}</div>`;
      return;
    }
    contracts = data || [];
    render();
  }

  function filterContracts() {
    if (!searchQuery) return contracts;
    const q = searchQuery.toLowerCase();
    return contracts.filter(c =>
      (c.company_nafn||'').toLowerCase().includes(q) ||
      (c.kennitala||'').toLowerCase().includes(q) ||
      (c.heimilisfang||'').toLowerCase().includes(q) ||
      (c.thjonusta||'').toLowerCase().includes(q)
    );
  }

  function render() {
    const main = document.querySelector('#view-samningar #ct-main');
    if (!main) return;
    const totalRev = contracts.filter(c=>c.status==='virkur').reduce((s,c)=>s+(parseFloat(c.upphaed_an_vsk)||0)*(12/(c.tidni_man||12)),0);
    const filtered = filterContracts();

    main.innerHTML = `
      <div class="ct-wrap">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;flex-wrap:wrap;gap:8px">
          <div>
            <h1 style="margin:0;font-size:20px">📑 Þjónustusamningar</h1>
            <div style="font-size:13px;color:#64748b;margin-top:2px">Endurteknar áskriftir og þjónustur · árstekjur: <strong>${fmtKr(totalRev)}</strong></div>
          </div>
          <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
            <input type="text" class="ct-search" placeholder="🔍 Leita..." value="${esc(searchQuery)}" oninput="ServiceContracts._search(this.value)">
            <button class="btn btn-outline" onclick="ServiceContracts._open(null,'legacy')" title="Skanna eldri pappírssamninga inn í kerfið">📥 Eldri samningur</button>
            <button class="btn btn-primary" onclick="ServiceContracts._open()">+ Nýr samningur</button>
          </div>
        </div>
        ${filtered.length ? `
          <table>
            <thead><tr>
              <th>Viðskiptavinur</th><th>Heimilisfang</th><th>Umsjón með</th>
              <th>Tíðni</th><th>Næsta rukkun</th><th>Staða</th><th></th>
            </tr></thead>
            <tbody>${filtered.map(c=>{
              const days = c.next_due ? Math.round((new Date(c.next_due) - new Date())/86400000) : null;
              const cls = days===null?'':(days<0?'ct-overdue':(days<=14?'ct-soon':''));
              const tags = [];
              if (c.umsjon_slokkvitaeki) tags.push('🔥 Slökkvitæki');
              if (c.umsjon_reykskynjarar) tags.push('🚨 Reykskynjarar');
              if (c.umsjon_annad) tags.push('📋 '+esc(c.umsjon_annad));
              return `<tr onclick="ServiceContracts._open(${c.id})">
                <td>
                  <strong>${esc(c.company_nafn||'')}</strong>
                  ${c.kennitala?`<div style="font-size:11px;color:#94a3b8">kt. ${esc(c.kennitala)}</div>`:''}
                </td>
                <td style="font-size:12px">${esc(c.heimilisfang||'')}</td>
                <td style="font-size:11px">${tags.map(t=>`<span class="ct-tag">${t}</span>`).join('')}</td>
                <td>á ${c.tidni_man||12} mán</td>
                <td class="${cls}">${fmtDate(c.next_due)}${days!==null && days<=14?` <small>(${days<0?-days+'d':days+'d'})</small>`:''}</td>
                <td><span style="padding:2px 8px;border-radius:99px;font-size:11px;background:${c.status==='virkur'?'#dcfce7':'#f1f5f9'};color:${c.status==='virkur'?'#166534':'#64748b'}">${esc(c.status||'')}</span></td>
                <td onclick="event.stopPropagation()">
                  ${c.photo_url?`<a href="${esc(c.photo_url)}" target="_blank" title="Skoða undirritaðan samning">📷</a> `:''}
                  <button class="btn btn-sm btn-outline" onclick="ServiceContracts._bill(${c.id})" title="Marka rukkað">💰</button>
                  <button class="btn btn-sm btn-outline" onclick="ServiceContracts._delete(${c.id})" title="Eyða">🗑</button>
                </td>
              </tr>`;
            }).join('')}</tbody>
          </table>` : `<div style="padding:40px;text-align:center;color:#94a3b8">${searchQuery?'Engar færslur passa':'Engir samningar enn — smelltu á "+ Nýr samningur"'}</div>`}
      </div>`;
  }

  function _search(v) { searchQuery = v.trim(); render(); }

  // ── Open (new or edit) — paper-layout form ────────────────────────────────
  function _open(id, mode) {
    const c = id ? contracts.find(x=>x.id===id) : {};
    const isNew = !id;
    const isLegacy = mode === 'legacy';
    const today = new Date().toISOString().slice(0,10);
    // For legacy import default signed_at to one year ago
    const yearAgo = new Date(); yearAgo.setFullYear(yearAgo.getFullYear()-1);
    const defaultSigned = isLegacy ? yearAgo.toISOString().slice(0,10) : today;
    _pendingPhoto = null; // reset staged photo
    document.getElementById('ct-modal')?.remove();
    const m = document.createElement('div');
    m.id = 'ct-modal'; m.className = 'ct-modal-wrap';
    m.dataset.id = id || '';
    m.dataset.mode = mode || '';
    m.onclick = e => { if(e.target===m) m.remove(); };
    const title = isNew
      ? (isLegacy ? '📥 Skanna eldri samning' : 'Nýr þjónustusamningur')
      : 'Samningur við '+esc(c.company_nafn||'');
    m.innerHTML = `
      <div class="ct-modal">
        <div class="ct-form-hd" ${isLegacy?'style="background:#92400e"':''}>
          <h3>${isLegacy?'📥':'📑'} ${title}</h3>
          <button onclick="document.getElementById('ct-modal').remove()" style="background:none;border:none;color:#fff;font-size:18px;cursor:pointer">✕</button>
        </div>
        ${isLegacy?`<div style="background:#fef3c7;color:#92400e;padding:10px 22px;font-size:13px;border-bottom:1px solid #fde68a">
          📌 <strong>Eldri-samningur stilling:</strong> Þú getur tekið mynd af pappírssamningnum og skannað inn helstu upplýsingar.
          Myndin verður vistuð sjálfvirkt þegar þú smellir „Vista".
        </div>`:''}
        <div class="ct-form-bd">
          <div class="ct-print-frame">
            <div class="ct-paper" id="ct-paper">
              <div class="ct-paper-hd">
                <div style="display:flex;justify-content:flex-end;font-size:13px;margin-bottom:6px">
                  Dags: <input type="date" id="ct-signed" value="${esc(c.signed_at||defaultSigned)}" style="border:none;border-bottom:1px solid #0f172a;background:transparent;margin-left:6px">
                </div>
                <div class="title">Þjónustusamningur</div>
                <div class="brand">🔥 ${COMPANY.nafn}</div>
                <div class="slogan">${COMPANY.slogan}</div>
                <div class="phone">Sími: ${COMPANY.sími}</div>
              </div>

              <div style="font-size:13px;margin-bottom:8px">Hér með gera ${COMPANY.nafn} kt: ${COMPANY.kt} og</div>
              <div class="ct-paper-row">
                <label>Nafn:</label>
                <input type="text" id="ct-co" value="${esc(c.company_nafn||'')}" placeholder="Nafn fyrirtækis">
                <label style="text-align:right">kt:</label>
                <input type="text" id="ct-kt" value="${esc(c.kennitala||'')}" placeholder="000000-0000">
              </div>
              <div class="ct-paper-row" style="grid-template-columns:140px 1fr">
                <label>Heimilisfang:</label>
                <input type="text" id="ct-addr" value="${esc(c.heimilisfang||'')}" placeholder="Heimilisfang">
              </div>

              <div class="ct-paper-body">
                með sér þjónustusamning þess efnis að ${COMPANY.nafn} muni sjá um árlega þjónustu slökkvitækja og tengdum búnaði.
              </div>

              <div style="font-size:13px;font-weight:600;margin:12px 0 6px">Samningi þessum skal segja upp með minnst tveggja mánaða fyrirvara í síma ${COMPANY.sími} eða á e-mailinu ${COMPANY.netfang}</div>

              <div class="ct-paper-sig">
                <span>Fyrir hönd ${COMPANY.nafn}:</span>
                <div class="line"></div>
                <span>Fyrir hönd fyrirtækis/húsfélags:</span>
                <div class="line"></div>
              </div>

              <div class="ct-paper-checks">
                <div style="font-weight:600;margin-bottom:4px">Umsjón með:</div>
                <label><input type="checkbox" id="ct-um-sl" ${c.umsjon_slokkvitaeki?'checked':''}> Slökkvitækjum</label>
                <label><input type="checkbox" id="ct-um-rk" ${c.umsjon_reykskynjarar?'checked':''}> Reykskynjurum</label>
                <div class="ct-paper-row" style="grid-template-columns:80px 1fr;margin-top:6px">
                  <label>Annað:</label>
                  <input type="text" id="ct-um-an" value="${esc(c.umsjon_annad||'')}" placeholder="t.d. Brunakerfi">
                </div>
              </div>

              <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:18px;padding-top:12px;border-top:1px solid #cbd5e1">
                <div>
                  <label style="font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:.04em">Upphæð án VSK</label>
                  <input type="number" id="ct-amt" value="${esc(c.upphaed_an_vsk||'')}" min="0" placeholder="0" style="width:100%;padding:6px 8px;border:1px solid #e2e8f0;border-radius:6px;box-sizing:border-box">
                </div>
                <div>
                  <label style="font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:.04em">Tíðni (mánuðir)</label>
                  <input type="number" id="ct-freq" value="${esc(c.tidni_man||12)}" min="1" style="width:100%;padding:6px 8px;border:1px solid #e2e8f0;border-radius:6px;box-sizing:border-box">
                </div>
                <div>
                  <label style="font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:.04em">Næsta rukkun</label>
                  <input type="date" id="ct-due" value="${esc(c.next_due||today)}" style="width:100%;padding:6px 8px;border:1px solid #e2e8f0;border-radius:6px;box-sizing:border-box">
                </div>
                <div>
                  <label style="font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:.04em">Staða</label>
                  <select id="ct-status" style="width:100%;padding:6px 8px;border:1px solid #e2e8f0;border-radius:6px;box-sizing:border-box">
                    <option value="virkur" ${c.status==='virkur'||!c.status?'selected':''}>Virkur</option>
                    <option value="hættur" ${c.status==='hættur'?'selected':''}>Hættur</option>
                    <option value="frystur" ${c.status==='frystur'?'selected':''}>Frystur</option>
                  </select>
                </div>
              </div>

              <div class="ct-paper-foot">
                <em>${COMPANY.fineprint}</em><br>
                ${COMPANY.nafn}, ${COMPANY.heimilisfang}, vsknr.: ${COMPANY.vsknr}<br>
                Netfang: <em>${COMPANY.netfang}</em> · Sími ${COMPANY.sími}
              </div>
            </div>
          </div>

          <div class="ct-photo-wrap" ${isLegacy?'style="border:2px solid #f59e0b;background:#fffbeb"':''}>
            <div style="font-size:11px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:.04em;margin-bottom:6px">
              ${isLegacy?'📷 Mynd af pappírssamningnum (mikilvægt!)':'Mynd af undirrituðum samningi'}
            </div>
            <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
              <label class="btn ${isLegacy?'btn-primary':'btn-outline'}" style="cursor:pointer">
                📷 ${c.photo_url?'Skipta um mynd':(isLegacy?'Velja mynd / taka mynd':'Hlaða upp mynd')}
                <input type="file" accept="image/*" capture="environment" hidden onchange="ServiceContracts._photoChosen(event)">
              </label>
              ${c.photo_url?`<a href="${esc(c.photo_url)}" target="_blank" class="btn btn-outline">🔍 Skoða núverandi mynd</a>`:''}
              <span id="ct-photo-status" style="font-size:12px;color:#64748b"></span>
            </div>
            <div id="ct-photo-preview" style="margin-top:8px">
              ${c.photo_url?`<img src="${esc(c.photo_url)}" alt="Undirritaður samningur">`:''}
            </div>
          </div>
        </div>
        <div class="ct-actions">
          <button class="btn btn-outline" onclick="document.getElementById('ct-modal').remove()">Loka</button>
          ${id?`<button class="btn btn-outline" onclick="ServiceContracts._print(${id})">🖨 Prenta</button>`:''}
          ${isLegacy?`<button class="btn btn-outline" onclick="ServiceContracts._save(true)" title="Vista og opna nýjan eldri-samning">💾 Vista og næsta</button>`:''}
          <button class="btn btn-primary" onclick="ServiceContracts._save()">💾 Vista${id||isLegacy?'':' & opna prentun'}</button>
        </div>
      </div>`;
    document.body.appendChild(m);
    setTimeout(() => document.getElementById('ct-co')?.focus(), 50);
  }

  // Picks a file. If a record exists already (editing), upload immediately.
  // Otherwise stage the file and upload it after _save() inserts the record.
  function _photoChosen(ev) {
    const m = document.getElementById('ct-modal');
    const id = m && m.dataset.id;
    const f = ev.target.files && ev.target.files[0];
    if (!f) return;
    ev.target.value = '';
    if (id) {
      _uploadToExisting(parseInt(id), f);
    } else {
      _pendingPhoto = f;
      const reader = new FileReader();
      reader.onload = e => {
        const prev = document.getElementById('ct-photo-preview');
        if (prev) prev.innerHTML = `<img src="${e.target.result}" alt="Forsýn" style="max-width:100%;max-height:200px;border-radius:6px">`;
        const status = document.getElementById('ct-photo-status');
        if (status) status.textContent = `✓ ${f.name} (mun vistast við „Vista")`;
      };
      reader.readAsDataURL(f);
    }
  }

  async function _uploadToExisting(id, f) {
    const SB = getSB();
    const status = document.getElementById('ct-photo-status');
    if (status) status.textContent = '⏳ Hleð upp...';
    try {
      const ts = Date.now();
      const safe = (f.name||'samn').replace(/[^a-zA-Z0-9._-]/g,'_');
      const path = `samn_${id}/${ts}_${safe}`;
      const up = await SB.storage.from(BUCKET).upload(path, f, { contentType:f.type, upsert:false });
      if (up.error) throw up.error;
      const { data: pub } = SB.storage.from(BUCKET).getPublicUrl(path);
      await SB.from('thjonustusamningar').update({ photo_url: pub.publicUrl, photo_path: path }).eq('id', id);
      if (status) status.textContent = '✓ Vistað';
      load();
      setTimeout(() => _open(id), 400);
    } catch (e) {
      if (status) status.textContent = '⚠️ '+(e.message||e);
    }
  }

  async function _uploadPendingPhoto(recordId) {
    if (!_pendingPhoto) return null;
    const SB = getSB();
    const f = _pendingPhoto;
    const ts = Date.now();
    const safe = (f.name||'samn').replace(/[^a-zA-Z0-9._-]/g,'_');
    const path = `samn_${recordId}/${ts}_${safe}`;
    const up = await SB.storage.from(BUCKET).upload(path, f, { contentType:f.type, upsert:false });
    if (up.error) throw up.error;
    const { data: pub } = SB.storage.from(BUCKET).getPublicUrl(path);
    await SB.from('thjonustusamningar').update({ photo_url: pub.publicUrl, photo_path: path }).eq('id', recordId);
    _pendingPhoto = null;
    return pub.publicUrl;
  }

  async function _save(addAnother) {
    const m = document.getElementById('ct-modal');
    const id = m && m.dataset.id ? parseInt(m.dataset.id) : null;
    const mode = m && m.dataset.mode;
    const isLegacy = mode === 'legacy';
    const SB = getSB();
    const rec = {
      company_nafn: document.getElementById('ct-co').value.trim(),
      kennitala:    document.getElementById('ct-kt').value.trim(),
      heimilisfang: document.getElementById('ct-addr').value.trim(),
      umsjon_slokkvitaeki: document.getElementById('ct-um-sl').checked,
      umsjon_reykskynjarar: document.getElementById('ct-um-rk').checked,
      umsjon_annad: document.getElementById('ct-um-an').value.trim(),
      thjonusta:    'Árleg þjónusta',
      upphaed_an_vsk: parseFloat(document.getElementById('ct-amt').value)||0,
      tidni_man:    parseInt(document.getElementById('ct-freq').value)||12,
      next_due:     document.getElementById('ct-due').value,
      signed_at:    document.getElementById('ct-signed').value || null,
      status:       document.getElementById('ct-status').value
    };
    if (!rec.company_nafn) { alert('Sláðu inn nafn viðskiptavinar'); return; }
    let saved;
    if (id) {
      const { data, error } = await SB.from('thjonustusamningar').update(rec).eq('id', id).select().single();
      if (error) { alert('Villa: '+error.message); return; }
      saved = data;
    } else {
      const { data, error } = await SB.from('thjonustusamningar').insert(rec).select().single();
      if (error) { alert('Villa: '+error.message); return; }
      saved = data;
      // Upload staged photo if there is one
      if (_pendingPhoto && saved) {
        const status = document.getElementById('ct-photo-status');
        if (status) status.textContent = '⏳ Hleð upp mynd...';
        try { await _uploadPendingPhoto(saved.id); }
        catch (e) { alert('Mynd misheppnaðist: '+e.message); }
      }
    }
    document.getElementById('ct-modal').remove();
    await load();
    if (addAnother && isLegacy) {
      // Open a fresh legacy form for next entry
      setTimeout(() => _open(null, 'legacy'), 200);
      return;
    }
    if (!id && !isLegacy && saved) _print(saved.id);
  }

  function _print(id) {
    const c = contracts.find(x=>x.id===id) || (document.getElementById('ct-modal') && contracts.find(x=>x.id===parseInt(document.getElementById('ct-modal').dataset.id)));
    if (!c) { alert('Vistaðu fyrst'); return; }
    const w = window.open('', '_blank');
    if (!w) { alert('Leyfðu popup glugga til að prenta'); return; }
    const html = `<!doctype html><html lang="is"><head><meta charset="utf-8"><title>Þjónustusamningur ${esc(c.company_nafn||'')}</title>
<style>
  body { font-family: 'IBM Plex Sans', system-ui, sans-serif; padding:36px; max-width:680px; margin:0 auto; color:#0f172a; }
  .paper { border:2px solid #000; padding:32px; }
  .hd { text-align:center; margin-bottom:18px; }
  .hd .date { text-align:right; font-size:14px; margin-bottom:6px; }
  .hd .title { font-size:24px; font-weight:700; }
  .hd .brand { font-size:28px; font-weight:800; margin:8px 0; }
  .hd .slogan { font-size:14px; font-weight:600; }
  .hd .phone { font-size:14px; font-weight:700; margin-top:4px; }
  .row { display:grid; grid-template-columns:140px 1fr 60px 200px; gap:8px; align-items:baseline; margin:6px 0; font-size:14px; }
  .row .v { border-bottom:1px solid #000; padding:2px 4px; min-height:18px; font-weight:600; }
  .body { font-size:14px; line-height:1.6; margin:14px 0; }
  .term { font-weight:600; font-size:14px; margin:14px 0; }
  .sig { display:grid; grid-template-columns:240px 1fr; gap:8px; align-items:center; margin:14px 0; font-size:13px; }
  .sig .line { border-bottom:1px solid #000; height:30px; }
  .checks { margin:18px 0; }
  .checks .ck { display:flex; gap:8px; align-items:center; margin:6px 0; font-size:14px; }
  .checks .ck .box { width:18px; height:18px; border:1.5px solid #000; display:inline-flex; align-items:center; justify-content:center; font-weight:700; }
  .foot { text-align:center; font-size:11px; margin-top:24px; padding-top:14px; border-top:1px solid #000; }
  .foot em { font-style:italic; }
  @media print { body { padding:0; } }
</style>
</head><body>
<div class="paper">
  <div class="hd">
    <div class="date">Dags: <strong>${fmtDate(c.signed_at||c.created_at||new Date())}</strong></div>
    <div class="title">Þjónustusamningur</div>
    <div class="brand">🔥 ${COMPANY.nafn}</div>
    <div class="slogan">${COMPANY.slogan}</div>
    <div class="phone">Sími: ${COMPANY.sími}</div>
  </div>
  <div style="font-size:14px;margin-bottom:10px">Hér með gera ${COMPANY.nafn} kt: ${COMPANY.kt} og</div>
  <div class="row"><label>Nafn:</label><div class="v">${esc(c.company_nafn||'')}</div><label style="text-align:right">kt:</label><div class="v">${esc(c.kennitala||'')}</div></div>
  <div class="row" style="grid-template-columns:140px 1fr"><label>Heimilisfang:</label><div class="v">${esc(c.heimilisfang||'')}</div></div>
  <div class="body">með sér þjónustusamning þess efnis að ${COMPANY.nafn} muni sjá um árlega þjónustu slökkvitækja og tengdum búnaði.</div>
  <div class="term">Samningi þessum skal segja upp með minnst tveggja mánaða fyrirvara í síma ${COMPANY.sími} eða á e-mailinu <em>${COMPANY.netfang}</em></div>
  <div class="sig"><span>Fyrir hönd ${COMPANY.nafn}:</span><div class="line"></div><span>Fyrir hönd fyrirtækis/húsfélags:</span><div class="line"></div></div>
  <div class="checks">
    <div style="font-weight:600;margin-bottom:6px">Umsjón með:</div>
    <div class="ck"><span class="box">${c.umsjon_slokkvitaeki?'✕':''}</span> Slökkvitækjum</div>
    <div class="ck"><span class="box">${c.umsjon_reykskynjarar?'✕':''}</span> Reykskynjurum</div>
    <div class="row" style="grid-template-columns:80px 1fr"><label>Annað:</label><div class="v">${esc(c.umsjon_annad||'')}</div></div>
  </div>
  <div class="foot">
    <em>${COMPANY.fineprint}</em><br>
    ${COMPANY.nafn}, ${COMPANY.heimilisfang}, vsknr.: ${COMPANY.vsknr}<br>
    Netfang: <em>${COMPANY.netfang}</em> · Sími ${COMPANY.sími}
  </div>
</div>
<script>setTimeout(()=>window.print(),500);<\/script>
</body></html>`;
    w.document.write(html);
    w.document.close();
  }

  async function _bill(id) {
    const c = contracts.find(x=>x.id===id);
    if (!c) return;
    if (!await Confirm.show(`Marka sem rukkað og færa næstu rukkun fram um ${c.tidni_man||12} mán?`)) return;
    const SB = getSB();
    await SB.from('thjonustusamningar').update({
      last_billed: new Date().toISOString().slice(0,10),
      next_due: addMonths(c.next_due || new Date().toISOString().slice(0,10), c.tidni_man||12)
    }).eq('id', id);
    load();
  }

  async function _delete(id) {
    if (!await Confirm.show('Eyða þessum samning?')) return;
    await getSB().from('thjonustusamningar').delete().eq('id', id);
    load();
  }

  function init() { ensureNav(); ensureView(); patchSwitch(); }
  setTimeout(init, 1000);
  setTimeout(init, 2500);

  window.ServiceContracts = { load, _open, _save, _bill, _delete, _print, _search, _photoChosen };
  console.log('[service-contracts v2] installed');
})();
