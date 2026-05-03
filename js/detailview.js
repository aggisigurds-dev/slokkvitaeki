/* Unit Detail view — full history lookup by serial number.
   Shows tæki info, customer (with kennitala), inspection history, work orders.
   Invoke: window.showUnitDetail(serial) from anywhere. */
(function(){
  'use strict';

  function fmtDate(d){
    if (!d) return '—';
    var dt = new Date(d);
    return dt.toLocaleDateString('is-IS');
  }

  function daysUntil(d){
    if (!d) return null;
    var now = new Date();
    now.setHours(0,0,0,0);
    var target = new Date(d);
    target.setHours(0,0,0,0);
    return Math.round((target - now) / (86400*1000));
  }

  function escHtml(s){ return String(s==null?'':s).replace(/[&<>"']/g, function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];}); }

  function fmtKennitala(k){
    if (!k) return '—';
    var s = String(k).replace(/[^0-9]/g,'');
    return s.length === 10 ? s.slice(0,6)+'-'+s.slice(6) : s;
  }

  function statusBadge(status){
    var colors = {
      active: '#10b981', geymsla: '#8b5cf6', urelt: '#dc2626',
      loaned: '#f59e0b', 'í geymslu': '#8b5cf6',
      received: '#3b82f6', tilbúið: '#10b981', complete: '#6b7280'
    };
    var c = colors[(status||'').toLowerCase()] || '#6b7280';
    return '<span style="background:'+c+';color:#fff;padding:3px 8px;border-radius:6px;font-size:11px;font-weight:600;">'+escHtml(status||'—')+'</span>';
  }

  async function fetchUnit(serial){
    var s = serial.trim();
    var r = await DB.sb.from('uttaeki').select('*').eq('serial', s).maybeSingle();
    if (r.error) throw r.error;
    return r.data;
  }

  async function fetchCustomer(clientName){
    if (!clientName) return null;
    var r = await DB.sb.from('fyrirtaeki').select('*').eq('nafn', clientName).maybeSingle();
    return r.data;
  }

  async function fetchInspections(unitId){
    if (!unitId) return [];
    var r = await DB.sb.from('skodunar_saga').select('*').eq('unit_id', unitId).neq('result','_gk_audit').order('date', {ascending:false}).limit(100);
    return r.data || [];
  }

  async function fetchWorkOrders(serial, client){
    var r = await DB.sb.from('verklidur').select('id,job_id,serial,service,status,tech').eq('serial', serial).limit(50);
    var liduIds = (r.data||[]).map(function(v){return v.job_id;}).filter(Boolean);
    if (!liduIds.length) {
      // Fallback: verkbeidnir by customer
      if (!client) return {items:[], jobs:[]};
      var jr = await DB.sb.from('verkbeidnir').select('*').eq('customer', client).order('created_at',{ascending:false}).limit(30);
      return {items: [], jobs: jr.data || []};
    }
    var jobs = await DB.sb.from('verkbeidnir').select('*').in('id', liduIds).order('created_at',{ascending:false});
    return {items: r.data, jobs: jobs.data || []};
  }

  async function showUnitDetail(serial){
    if (!serial) return;
    // Close any existing
    var existing = document.getElementById('_ud_modal');
    if (existing) existing.remove();

    // Show loading modal
    var modal = document.createElement('div');
    modal.id = '_ud_modal';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:9600;display:flex;align-items:flex-start;justify-content:center;padding:20px;overflow-y:auto;';
    modal.innerHTML = `<div id="_ud_box" style="background:#fff;border-radius:14px;width:100%;max-width:900px;padding:24px;box-shadow:0 12px 40px rgba(0,0,0,.3);">
      <div style="text-align:center;padding:40px;color:#888;">
        <div style="font-size:18px;">Leita að <strong>${escHtml(serial)}</strong>...</div>
      </div>
    </div>`;
    document.body.appendChild(modal);
    modal.onclick = function(e){ if (e.target === modal) modal.remove(); };

    try {
      var unit = await fetchUnit(serial);
      if (!unit) {
        document.getElementById('_ud_box').innerHTML = `
          <div style="display:flex;justify-content:space-between;align-items:center;padding-bottom:14px;border-bottom:2px solid #1a1f2e;margin-bottom:16px;">
            <h2 style="margin:0;font-size:20px;">🔍 Tæki fannst ekki</h2>
            <button id="_ud_close" style="background:#f3f4f6;border:none;border-radius:8px;padding:8px 14px;font-size:13px;cursor:pointer;">✕ Loka</button>
          </div>
          <p style="color:#666;font-size:14px;">Ekkert tæki fannst með raðnúmerið: <code style="background:#f3f4f6;padding:2px 8px;border-radius:4px;">${escHtml(serial)}</code></p>
          <p style="color:#666;font-size:13px;margin-top:18px;">Viltu skrá þetta sem nýtt tæki?</p>
          <button id="_ud_new" style="background:#2563eb;color:#fff;border:none;border-radius:9px;padding:10px 18px;font-size:14px;font-weight:600;cursor:pointer;">➕ Skrá sem nýtt</button>
        `;
        document.getElementById('_ud_close').onclick = function(){ modal.remove(); };
        document.getElementById('_ud_new').onclick = function(){
          modal.remove();
          if (window.openScanMode) window.openScanMode();
        };
        return;
      }

      var customer = await fetchCustomer(unit.client);
      var inspections = await fetchInspections(unit.id);
      var wo = await fetchWorkOrders(unit.serial, unit.client);
      renderDetail(unit, customer, inspections, wo, modal);
    } catch (e) {
      document.getElementById('_ud_box').innerHTML = '<p style="color:#dc2626;padding:30px;text-align:center;">Villa: '+escHtml(e.message||e)+'</p>';
    }
  }

  function renderDetail(unit, customer, inspections, wo, modal){
    var daysLeft = daysUntil(unit.next_insp);
    var dueColor = daysLeft === null ? '#888' : daysLeft < 0 ? '#dc2626' : daysLeft < 30 ? '#f59e0b' : '#10b981';
    var dueText = daysLeft === null ? 'Engin dagsetning' : daysLeft < 0 ? (Math.abs(daysLeft)+' dagar fram yfir') : (daysLeft+' dagar eftir');

    var lastInspRow = inspections[0];

    var box = document.getElementById('_ud_box');
    box.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:14px;border-bottom:2px solid #1a1f2e;margin-bottom:16px;gap:12px;">
        <div style="flex:1;">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:4px;">
            <code style="font-size:22px;font-weight:700;background:#f3f4f6;padding:4px 12px;border-radius:8px;">${escHtml(unit.serial)}</code>
            ${statusBadge(unit.status)}
          </div>
          <div style="font-size:14px;color:#555;">${escHtml(unit.type||'—')} ${escHtml(unit.size||'')} · ${escHtml(unit.location||'—')}</div>
        </div>
        <button id="_ud_close" style="background:#f3f4f6;border:none;border-radius:8px;padding:8px 14px;font-size:13px;cursor:pointer;flex-shrink:0;">✕ Loka</button>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px;">
        <div style="background:#f9fafb;padding:14px;border-radius:10px;">
          <div style="font-size:11px;color:#888;text-transform:uppercase;font-weight:600;margin-bottom:8px;">Næsta skoðun</div>
          <div style="font-size:18px;font-weight:700;color:#111;">${fmtDate(unit.next_insp)}</div>
          <div style="font-size:13px;color:${dueColor};font-weight:600;margin-top:4px;">${dueText}</div>
        </div>
        <div style="background:#f9fafb;padding:14px;border-radius:10px;">
          <div style="font-size:11px;color:#888;text-transform:uppercase;font-weight:600;margin-bottom:8px;">Þrýstingur</div>
          <div style="font-size:18px;font-weight:700;color:#111;">${unit.pressure ? escHtml(unit.pressure)+' bar' : '—'}</div>
          <div style="font-size:13px;color:#888;margin-top:4px;">Síðast skoðað: ${fmtDate(unit.last_insp)}</div>
        </div>
      </div>

      <div style="background:#fff;border:1.5px solid #e5e7eb;border-radius:10px;padding:14px;margin-bottom:16px;">
        <div style="font-size:12px;color:#888;text-transform:uppercase;font-weight:600;margin-bottom:10px;">👤 Viðskiptavinur</div>
        ${customer ? `
          <div style="font-size:16px;font-weight:700;margin-bottom:8px;">${escHtml(customer.nafn)}</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;font-size:13px;">
            <div><span style="color:#888;">Kennitala:</span> <code style="background:#f3f4f6;padding:1px 7px;border-radius:4px;">${fmtKennitala(customer.kennitala)}</code></div>
            <div><span style="color:#888;">Sími:</span> <a href="tel:${escHtml(customer.simi||'')}" style="color:#2563eb;text-decoration:none;">${escHtml(customer.simi||'—')}</a></div>
            <div><span style="color:#888;">Netfang:</span> <a href="mailto:${escHtml(customer.netfang||'')}" style="color:#2563eb;text-decoration:none;">${escHtml(customer.netfang||'—')}</a></div>
            <div><span style="color:#888;">Tengiliður:</span> ${escHtml(customer.tengiliður||'—')}</div>
          </div>
          ${customer.heimilisfang ? '<div style="margin-top:8px;font-size:13px;"><span style="color:#888;">Heimilisfang:</span> '+escHtml(customer.heimilisfang)+'</div>' : ''}
        ` : `
          <div style="font-size:15px;font-weight:600;">${escHtml(unit.client||'—')}</div>
          ${unit.phone ? '<div style="font-size:13px;margin-top:6px;color:#888;">Sími: <a href="tel:'+escHtml(unit.phone)+'" style="color:#2563eb;">'+escHtml(unit.phone)+'</a></div>' : ''}
          <div style="font-size:12px;color:#f59e0b;margin-top:8px;">⚠ Ekki skráð í fyrirtækjaskrá</div>
        `}
      </div>

      <div style="background:#fff;border:1.5px solid #e5e7eb;border-radius:10px;padding:14px;margin-bottom:16px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
          <div style="font-size:12px;color:#888;text-transform:uppercase;font-weight:600;">📋 Skoðunarsaga (${inspections.length})</div>
        </div>
        ${inspections.length ? `
          <table style="width:100%;border-collapse:collapse;font-size:12px;">
            <thead><tr style="background:#f9fafb;">
              <th style="text-align:left;padding:8px;border-bottom:1px solid #e5e7eb;">Dagsetning</th>
              <th style="text-align:left;padding:8px;border-bottom:1px solid #e5e7eb;">Tæknimaður</th>
              <th style="text-align:left;padding:8px;border-bottom:1px solid #e5e7eb;">Niðurstaða</th>
              <th style="text-align:left;padding:8px;border-bottom:1px solid #e5e7eb;">Þrýstingur</th>
              <th style="text-align:left;padding:8px;border-bottom:1px solid #e5e7eb;">Athugasemdir</th>
            </tr></thead>
            <tbody>${inspections.map(function(i){
              return '<tr style="border-bottom:1px solid #f3f4f6;">'+
                '<td style="padding:8px;white-space:nowrap;">'+fmtDate(i.date)+'</td>'+
                '<td style="padding:8px;">'+escHtml(i.tech||'—')+'</td>'+
                '<td style="padding:8px;">'+escHtml(i.result||'—')+'</td>'+
                '<td style="padding:8px;">'+(i.pressure?escHtml(i.pressure)+' bar':'—')+'</td>'+
                '<td style="padding:8px;color:#555;">'+escHtml(i.notes||'—')+'</td>'+
              '</tr>';
            }).join('')}</tbody>
          </table>
        ` : '<p style="color:#888;font-size:13px;padding:16px;text-align:center;">Engar skoðanir skráðar</p>'}
      </div>

      <div style="background:#fff;border:1.5px solid #e5e7eb;border-radius:10px;padding:14px;margin-bottom:16px;">
        <div style="font-size:12px;color:#888;text-transform:uppercase;font-weight:600;margin-bottom:10px;">🛠 Verkbeiðnir (${wo.jobs.length})</div>
        ${wo.jobs.length ? `
          <div style="display:flex;flex-direction:column;gap:8px;">
            ${wo.jobs.map(function(j){
              return '<div style="padding:10px;border:1px solid #e5e7eb;border-radius:8px;display:flex;justify-content:space-between;align-items:center;">'+
                '<div>'+
                  '<div style="font-weight:600;">'+escHtml(j.num||'—')+'  ·  '+escHtml(j.customer||'—')+'</div>'+
                  '<div style="font-size:12px;color:#888;margin-top:2px;">Móttekið: '+fmtDate(j.dropoff||j.created_at)+' · Afhending: '+fmtDate(j.pickup)+'</div>'+
                '</div>'+
                '<div>'+statusBadge(j.status)+'</div>'+
              '</div>';
            }).join('')}
          </div>
        ` : '<p style="color:#888;font-size:13px;padding:16px;text-align:center;">Engar verkbeiðnir</p>'}
      </div>

      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        <button id="_ud_insp" style="flex:1;min-width:140px;background:#2563eb;color:#fff;border:none;border-radius:9px;padding:10px 14px;font-size:13px;font-weight:600;cursor:pointer;">📋 Skrá nýja skoðun</button>
        ${unit.status === 'urelt' ? 
          '<button id="_ud_unretire" style="flex:1;min-width:140px;background:#10b981;color:#fff;border:none;border-radius:9px;padding:10px 14px;font-size:13px;font-weight:600;cursor:pointer;">✓ Endurvirkja</button>' :
          '<button id="_ud_retire" style="flex:1;min-width:140px;background:#dc2626;color:#fff;border:none;border-radius:9px;padding:10px 14px;font-size:13px;font-weight:600;cursor:pointer;">🗑 Merkja úrelt</button>'
        }
        <button id="_ud_print" style="flex:1;min-width:140px;background:#8b5cf6;color:#fff;border:none;border-radius:9px;padding:10px 14px;font-size:13px;font-weight:600;cursor:pointer;">🖨 Prenta merki</button><button id="_ud_qr_settings" title="Stillingar QR merkis" style="background:#e5e7eb;color:#111;border:none;border-radius:9px;padding:10px 14px;font-size:14px;cursor:pointer;flex:0 0 auto;">⚙</button>
      </div>
    `;

    document.getElementById('_ud_close').onclick = function(){ modal.remove(); };
    document.getElementById('_ud_insp').onclick = function(){ alert('Kemur næst: skrá nýja skoðun beint héðan'); };
    document.getElementById('_ud_print').onclick = function(){ if (window.printQRLabel) window.printQRLabel(unit); else alert('QR einingin er ekki tiltæk'); };
    var qrSettingsBtn = document.getElementById('_ud_qr_settings');
    if (qrSettingsBtn) qrSettingsBtn.onclick = function(){ if (window.openQRSettings) window.openQRSettings(); };
    var retireBtn = document.getElementById('_ud_retire');
    var unretireBtn = document.getElementById('_ud_unretire');
    if (retireBtn) retireBtn.onclick = async function(){
      if (!confirm('Merkja '+unit.serial+' sem úrelt?')) return;
      await DB.sb.from('uttaeki').update({status:'urelt'}).eq('id', unit.id);
      modal.remove();
      showUnitDetail(unit.serial);
    };
    if (unretireBtn) unretireBtn.onclick = async function(){
      if (!confirm('Endurvirkja '+unit.serial+'?')) return;
      await DB.sb.from('uttaeki').update({status:'active'}).eq('id', unit.id);
      modal.remove();
      showUnitDetail(unit.serial);
    };
  }

  function openLookup(){
    var existing = document.getElementById('_ud_lookup');
    if (existing) existing.remove();
    var m = document.createElement('div');
    m.id = '_ud_lookup';
    m.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:9500;display:flex;align-items:center;justify-content:center;padding:20px;';
    m.innerHTML = `<div style="background:#fff;border-radius:14px;padding:24px;width:100%;max-width:420px;">
      <h2 style="margin:0 0 6px;font-size:18px;">🔍 Fletta upp tæki</h2>
      <p style="margin:0 0 16px;color:#666;font-size:13px;">Skannaðu QR eða sláðu inn raðnúmer</p><button id="_ud_qr_scan" style="width:100%;background:#7c3aed;color:#fff;border:none;border-radius:10px;padding:14px;font-size:15px;font-weight:700;cursor:pointer;margin-bottom:10px;box-shadow:0 2px 6px rgba(124,58,237,.3);">📷 Skanna QR</button><div style="text-align:center;font-size:11px;color:#888;margin:6px 0;">— eða —</div>
      <input id="_ud_inp" placeholder="t.d. SÆ-2024-8834" autofocus style="width:100%;padding:14px;border:1.5px solid #e5e7eb;border-radius:10px;font-size:16px;font-family:monospace;box-sizing:border-box;">
      <div style="display:flex;gap:8px;margin-top:12px;">
        <button id="_ud_cancel" style="flex:1;background:#f3f4f6;color:#111;border:none;border-radius:9px;padding:11px;font-size:13px;font-weight:600;cursor:pointer;">Hætta</button>
        <button id="_ud_go" style="flex:2;background:#2563eb;color:#fff;border:none;border-radius:9px;padding:11px;font-size:13px;font-weight:700;cursor:pointer;">🔎 Fletta upp</button>
      </div>
    </div>`;
    document.body.appendChild(m);
    var inp = document.getElementById('_ud_inp');
    inp.focus();
    function go(){
      var v = inp.value.trim();
      m.remove();
      if (v) showUnitDetail(v);
    }
    document.getElementById('_ud_go').onclick = go;
    document.getElementById('_ud_cancel').onclick = function(){ m.remove(); };
    inp.onkeydown = function(e){ if (e.key==='Enter') go(); if (e.key==='Escape') m.remove(); };
    m.onclick = function(e){ if (e.target===m) m.remove(); };
    var qrBtn = document.getElementById('_ud_qr_scan');
    if (qrBtn) qrBtn.onclick = function(){ m.remove(); if (window.openQRScanner) window.openQRScanner(); else alert('QR skanni ekki til'); };
  }

  
    window.showUnitDetail = showUnitDetail;
  window.openUnitLookup = openLookup;

  // Inject lookup button into sidebar (next to Yfirlit)
  function injectLookupBtn(){
    if (document.getElementById('_ud_sidebar_btn')) return;
    // Find any Yfirlit/Dashboard button by scanning all .vnav-btn
    var allBtns = document.querySelectorAll('.vnav-btn');
    if (!allBtns.length) return;
    var yfirlit = null;
    for (var i=0;i<allBtns.length;i++){
      if (/Yfirlit|Dashboard/i.test(allBtns[i].textContent)) { yfirlit = allBtns[i]; break; }
    }
    if (!yfirlit) yfirlit = allBtns[0]; // fallback to first nav item
    // Clone the tag type (button or a) to match existing nav style
    var btn = document.createElement(yfirlit.tagName);
    btn.id = '_ud_sidebar_btn';
    btn.className = yfirlit.className.replace(/\s*active\s*/g,'');
    if (btn.tagName === 'A') btn.href = '#';
    btn.innerHTML = '<span style="width:18px;display:inline-block;margin-right:6px;">🔍</span>Fletta upp';
    btn.onclick = function(e){ e.preventDefault(); openLookup(); };
    yfirlit.parentNode.insertBefore(btn, yfirlit.nextSibling);
  }

  // Also make serial codes clickable everywhere
  function makeSerialsClickable(){
    var codes = document.querySelectorAll('code, .serial-code, [class*="serial"]');
    Array.prototype.forEach.call(codes, function(c){
      if (c._ud_hooked) return;
      var txt = c.textContent.trim();
      if (!/^[A-ZÆÖÁÉÝÚÍÓÐÞ]{2,4}-?\d{4}-?\d{3,4}/.test(txt)) return;
      c._ud_hooked = true;
      c.style.cursor = 'pointer';
      c.title = 'Smelltu til að fletta upp';
      c.addEventListener('click', function(e){
        e.stopPropagation();
        showUnitDetail(txt.replace(/\s+/g,''));
      });
    });
  }

  setInterval(injectLookupBtn, 2000);
  setInterval(makeSerialsClickable, 2500);
  console.log('[Detail] module loaded');
})();
