'use strict';
// ============ COUNTER ============
var Counter = {
  sel: null,
  render: function() { this.renderList(); if(this.sel) this.select(this.sel); else if(DB.getActiveJobs().length) this.select(DB.getActiveJobs()[0].id); },
  renderList: function() {
    var jobs=DB.getActiveJobs(), el=document.getElementById('job-list');
    if(!el) return;
    if(!jobs.length) { el.innerHTML='<div class="empty-state" style="padding:30px 16px"><div class="es-sub">Engar verkbeiðnir</div></div>'; }
    else el.innerHTML=jobs.map(function(j) {
      var a=Counter.sel===j.id?' active':'';
      return '<div class="jli'+a+'" onclick="Counter.select('+j.id+')"><div class="jli-dot '+U.dc(j.status)+'"></div><div><div class="jli-num">'+U.e(j.num)+'</div><div class="jli-name">'+U.e(j.customer)+'</div><div class="jli-meta">'+j.units.length+' slökkvitæki</div>'+U.badge(j.status)+'</div></div>';
    }).join('');
    var rdy=DB.getReadyJobs(), rel=document.getElementById('sidebar-ready');
    if(!rel) return;
    if(!rdy.length) { rel.innerHTML=''; return; }
    rel.innerHTML='<div class="sidebar-ready-title">Tilbúið til afhendingar</div>'+rdy.map(function(j) {
      return '<div class="ready-item"><div><div class="ready-name">'+U.e(j.customer)+'</div><div class="ready-meta">'+U.e(j.num)+' · '+j.units.length+' slökkvitæki</div></div><button class="btn btn-sm btn-success" onclick="Counter.markCollected('+j.id+')">Sótt ✓</button></div>';
    }).join('');
    document.getElementById('alert-badge').textContent = DB.getOverdue().length + DB.getDue().length;
  },
  select: function(id) {
    this.sel=id; var job=DB.getJob(id); if(!job) return;
    this.renderList(); this.renderDetail(job); this.renderPrintAside(job);
  },
  renderDetail: function(job) {
    var el=document.getElementById('counter-main'); if(!el) return;
    var html='<div class="jd-header"><div><div class="jd-title">'+U.e(job.customer)+' <span style="font-family:var(--mono);font-size:15px;color:var(--ink3)">'+U.e(job.num)+'</span></div><div class="jd-sub">Móttekið '+U.fd(job.dropoff)+'</div></div>';
    html+='<div class="jd-actions">'+U.badge(job.status)+'<span id="jd-pay-badge" style="display:inline-flex;align-items:center;padding:3px 10px;border-radius:8px;font-size:12px;font-weight:600;background:#f1f5f9;color:#64748b">… greiðslustaða …</span>';
    if(job.status!=='collected') html+='<button class="btn btn-outline btn-sm" onclick="Print.showJob(DB.getJob('+job.id+'))"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>Prenta</button>';
    if(job.status==='ready') html+='<button class="btn btn-success btn-sm" onclick="Counter.markCollected('+job.id+')">Sótt ✓</button>';
    html+='</div></div>';
    html+='<div class="info-grid"><div class="ic"><div class="ic-lbl">Sími</div><div class="ic-val">'+U.e(job.phone)+'</div></div><div class="ic"><div class="ic-lbl">Móttökudagur</div><div class="ic-val">'+U.fd(job.dropoff)+'</div></div>';
    if(job.notes) html+='<div class="ic ic-span"><div class="ic-lbl">Athugasemdir</div><div class="ic-val" style="color:var(--ink2)">'+U.e(job.notes)+'</div></div>';
    html+='</div>';
    html+='<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px"><span style="font-size:14px;font-weight:600">Slökkvitæki í verki</span><span style="font-family:var(--mono);font-size:11px;background:var(--bg2);padding:2px 8px;border-radius:8px;color:var(--ink2)">'+job.units.length+' stk.</span></div>';
    html+='<div class="tcard"><table class="dtbl"><thead><tr><th>Raðnúmer</th><th>Tegund</th><th>Stærð</th><th>Þjónusta</th><th>Staða</th><th></th></tr></thead><tbody>';
    job.units.forEach(function(u) {
      html+='<tr><td><span class="ser">'+U.e(u.serial)+'</span></td><td>'+U.e(u.type)+'</td><td>'+U.e(u.size||'')+'</td><td>'+U.e(u.service)+'</td><td>'+U.badge(u.status)+'</td><td><button class="btn btn-ghost btn-sm" onclick="Print.showQR({serial:\''+U.e(u.serial)+'\',type:\''+U.e(u.type)+'\',size:\''+U.e(u.size||'')+'\',client:\''+U.e(job.customer)+'\',next_insp:\''+U.e(job.pickup)+'\'})" title="Prenta QR"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:13px;height:13px"><path d="M4 6V4h2"/><path d="M4 18v2h2"/><path d="M20 6V4h-2"/><path d="M20 18v2h-2"/><line x1="4" y1="12" x2="20" y2="12"/></svg></button></td></tr>';
    });
    html+='</tbody></table></div>';
    el.innerHTML=html;
    Counter._fillPayBadge(job);
  },
  // 2026-05-31 (S2): show clear paid/unpaid status on the pickup (sótt) window,
  // so staff can tell at a glance whether a customer already paid (e.g. by card
  // at drop-off) before handing the equipment back.
  _payLabel: function(m){
    m=String(m||'').toLowerCase().trim();
    var map={kort:'Kort',reidufe:'Reiðufé','reiðufé':'Reiðufé',pening:'Reiðufé',peningur:'Reiðufé',millifaersla:'Millifærsla','millifærsla':'Millifærsla',posi:'Kort',greitt_sidar:'Greitt síðar',greitt_sidar_pickup:'Greitt v/afhendingu',reikningur:'Reikningur',inneign:'Inneign'};
    return map[m]||m||'';
  },
  _fillPayBadge: async function(job){
    var badge=document.getElementById('jd-pay-badge');
    if(!badge) return;
    var saleNum=(job&&job.num)?String(job.num).replace(/-V\d+$/, ''):null;
    if(!saleNum||!DB.sb){ badge.style.display='none'; return; }
    var sale=null;
    try{
      var r=await DB.sb.from('solur').select('id,num,samtals,greitt_med,paid_at,status').eq('num',saleNum).order('created_at',{ascending:false}).limit(1);
      if(r&&r.data&&r.data.length) sale=r.data[0];
    }catch(e){ badge.style.display='none'; return; }
    if(!sale){ badge.style.display='none'; return; }
    // greitt_med is stored inconsistently (kort/Kort/reidufe/Pening…) and card/cash
    // sales often DON'T set paid_at — so the payment METHOD is the source of truth.
    // Immediate methods are paid at point of sale; greitt_sidar is unpaid until
    // collected; reikningur is billed on invoice.
    var gm=String(sale.greitt_med||'').toLowerCase().trim();
    var paid=!!sale.paid_at;
    var amt=Math.round(sale.samtals||0).toLocaleString('is-IS');
    var immediate=['kort','reidufe','reiðufé','reidufé','pening','peningur','posi','millifaersla','millifærsla'];
    var label,bg,fg;
    if(gm==='reikningur'){ label='🧾 Á reikningi · '+amt+' kr'; bg='#dbeafe'; fg='#1e40af'; }
    else if(immediate.indexOf(gm)!==-1 || paid){ label='✓ Greitt'+(gm?' ('+Counter._payLabel(gm)+')':'')+' · '+amt+' kr'; bg='#dcfce7'; fg='#166534'; }
    else if(gm==='greitt_sidar'){ label='⚠ Ógreitt — greiðist v/afhendingu · '+amt+' kr'; bg='#fef3c7'; fg='#92400e'; }
    else { label='⚠ Ógreitt · '+amt+' kr'; bg='#fee2e2'; fg='#991b1b'; }
    badge.textContent=label;
    badge.style.cssText='display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:8px;font-size:12px;font-weight:700;background:'+bg+';color:'+fg;
  },
  renderPrintAside: function(job) {
    var el=document.getElementById('print-aside'); if(!el) return;
    var u=job.units[0];
    // 2026-05-12: Redesigned to better match what actually prints:
    //   • Miðar = 17×54mm label with QR + name + phone (Brother PT-P750W)
    //   • Kvittun = total receipt with all line items + total amount
    var phone = U.e(job.phone || '');
    var labelW = 180, labelH = 56; // visual proxy for 17×54mm
    var qrSvg = QR.svg(u.serial, 44);
    var custName = U.e(job.customer || '');
    var html='<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--ink3);margin-bottom:12px">Aðgerðir</div>';
    // 2026-05-14: "✏️ Breyta sölu" — opens the universal Sale Editor on the
    // parent sale of this verkbeiðni (R-NNN). Customer / lines / prices /
    // discounts editable until status='final'.
    html += '<button class="btn btn-primary btn-sm" style="width:100%;justify-content:center;margin-bottom:10px;background:#2563eb;border-color:#2563eb" ' +
      'onclick="window.SaleEditor && SaleEditor.openFromJob(\''+ U.e(job.num) +'\')">' +
      '✏️ Breyta sölu (R-' + U.e(String(job.num||'').replace(/-V\d+$/,'').replace(/^R-/,'')) + ')' +
    '</button>';

    // 2026-05-12: Removed the custom 17×54 preview. The label design is
    // chosen at order finalisation in the cart (greiðsla dialog), so the
    // aside just needs a print shortcut — no mock here that could diverge
    // from the actual print layout.
    html += '<div class="pa-block"><div class="pa-hd">' +
      '<svg viewBox="0 0 24 24"><rect x="3" y="6" width="18" height="12" rx="2"/></svg>' +
      '<span class="pa-hd-title">Miðar (×'+job.units.length+')</span></div>' +
      '<div class="pa-body">' +
        '<div style="text-align:center;color:#64748b;font-size:11px;padding:4px 6px 8px">Miðasnið er valið við greiðslu</div>' +
        '<button class="btn btn-primary btn-sm" style="width:100%;justify-content:center" onclick="Print.showJob(DB.getJob('+job.id+'))">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>' +
          'Prenta '+job.units.length+' miða' +
        '</button>' +
      '</div></div>';

    // ── Kvittun (total receipt preview) ─────────────────────────────
    // Sum the total cost using verkbeidnir.verd if available, else parsed
    // from the units' service descriptions × estimate.
    var totalKr = 0;
    if (job.verd) totalKr = +job.verd * (job.units.length || 1);
    else {
      job.units.forEach(function(u2){ totalKr += (+u2.verd || 0); });
    }
    var fmtKr = function(n){ return Math.round(+n||0).toLocaleString('is-IS') + ' kr'; };
    var unitRows = job.units.map(function(u2){
      var serDisp = String(u2.serial||'').replace(/^TMP-/, '').slice(-8);
      return '<div style="display:flex;justify-content:space-between;gap:6px;padding:3px 0;font-size:11px;border-bottom:1px dotted #e2e8f0">' +
        '<span style="color:#64748b;font-family:monospace;flex-shrink:0">'+serDisp+'</span>' +
        '<span style="text-align:right;color:#0f172a;font-weight:500;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+U.e(u2.service||'')+'</span>' +
      '</div>';
    }).join('');

    html += '<div class="pa-block" style="margin-top:11px"><div class="pa-hd gray">' +
      '<svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8" fill="none"/></svg>' +
      '<span class="pa-hd-title">Heildarkvittun</span></div>' +
      '<div class="pa-body" style="font-size:12px">' +
        '<div style="text-align:center;font-weight:700;color:#0f172a;font-size:13px;margin-bottom:2px">Slökkvitæki ehf</div>' +
        '<div style="text-align:center;color:#64748b;font-size:10px;margin-bottom:8px">Brunakerfi · 565-4080</div>' +
        '<div style="display:flex;justify-content:space-between;font-size:11px;padding:4px 0;border-bottom:1px solid #e2e8f0">' +
          '<span style="color:#64748b">Verk</span>' +
          '<span style="font-family:monospace;font-weight:600">'+U.e(job.num)+'</span>' +
        '</div>' +
        '<div style="display:flex;justify-content:space-between;font-size:11px;padding:4px 0;border-bottom:1px solid #e2e8f0">' +
          '<span style="color:#64748b">Viðskiptavinur</span>' +
          '<span style="font-weight:600;color:#0f172a">'+custName+'</span>' +
        '</div>' +
        '<div style="display:flex;justify-content:space-between;font-size:11px;padding:4px 0;border-bottom:1px solid #e2e8f0;margin-bottom:6px">' +
          '<span style="color:#64748b">Móttekið</span>' +
          '<span>'+U.fd(job.dropoff)+'</span>' +
        '</div>' +
        '<div style="font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.04em;margin:6px 0 3px">Tæki ('+job.units.length+')</div>' +
        '<div style="background:#f8fafc;border-radius:6px;padding:6px 8px;max-height:120px;overflow-y:auto">' + unitRows + '</div>' +
        (totalKr > 0
          ? '<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 4px 4px;margin-top:6px;border-top:2px solid #0f172a">' +
              '<span style="font-weight:700;color:#0f172a">SAMTALS</span>' +
              '<span style="font-size:15px;font-weight:800;color:#0f172a;font-variant-numeric:tabular-nums">'+fmtKr(totalKr)+'</span>' +
            '</div>'
          : '<div style="text-align:center;color:#94a3b8;font-size:10px;margin-top:8px;font-style:italic">Verð ekki skráð á verkbeiðni</div>'
        ) +
        '<div style="text-align:center;color:#94a3b8;font-size:10px;margin-top:8px;font-style:italic">Við hringum þegar tilbúið</div>' +
        '<button class="btn btn-outline btn-sm" style="width:100%;justify-content:center;margin-top:10px" onclick="Print.showJob(DB.getJob('+job.id+'))">Prenta kvittun</button>' +
      '</div></div>';

    el.innerHTML=html;
  },
  openNew: function() {
    var d=document.getElementById('nj-drop'), p=document.getElementById('nj-pick');
    d.value=U.today();
    // Pickup defaults from AppSettings.almennt.default_pickup_offset_days (Stillingar → Almennt).
    var offsetDays=1;
    try{var v=window.AppSettings&&window.AppSettings.path('almennt.default_pickup_offset_days');if(Number.isFinite(+v)&&+v>0)offsetDays=+v;}catch(e){}
    var pd=new Date(); pd.setDate(pd.getDate()+offsetDays);
    p.value=pd.toISOString().slice(0,10);
    ['nj-name','nj-phone','nj-notes'].forEach(function(id){document.getElementById(id).value='';});
    document.getElementById('nj-rows').innerHTML=''; this.addRow();
    Modal.open('modal-newjob');
  },
  addRow: function() {
    var r=document.createElement('div'); r.className='unit-row-form';
    r.innerHTML='<select><option>ABC Duft</option><option>CO₂</option><option>Vatn</option><option>Froðu</option><option>Blautt efni</option></select><input placeholder="6 kg"/><select><option>Hlaðning</option><option>Skoðun</option><option>Viðgerð</option><option>Hlaðning + Skoðun</option></select><button class="rm-btn" onclick="this.parentElement.remove()">✕</button>';
    document.getElementById('nj-rows').appendChild(r);
  },
  submitNew: async function() {
    var name=document.getElementById('nj-name').value.trim();
    if(!name) { Toast.show('Vinsamlegast sláðu inn nafn'); return; }
    var rows=document.querySelectorAll('#nj-rows .unit-row-form');
    if(!rows.length) { Toast.show('Bættu við að minnsta kosti einu slökkvitæki'); return; }
    var units=[]; rows.forEach(function(r){var s=r.querySelectorAll('select'),i=r.querySelector('input'); units.push({type:s[0].value,size:i.value||'6 kg',service:s[1].value});});
    var btn=document.querySelector('#modal-newjob .btn-primary'); btn.disabled=true; btn.textContent='Vista…';
    var job=await DB.createJob({num:U.nextJobNum(),customer:name,phone:document.getElementById('nj-phone').value,dropoff:document.getElementById('nj-drop').value,pickup:document.getElementById('nj-pick').value,notes:document.getElementById('nj-notes').value,verd:(document.getElementById('nj-verd')||{}).value||'',units});
    btn.disabled=false; btn.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>Stofna + Prenta';
    Modal.close('modal-newjob');
    if(job) { Counter.sel=job.id; Counter.render(); setTimeout(function(){Print.showJob(job);},200); Toast.show('Verk '+job.num+' stofnað ✓'); }
  },
  markCollected: async function(id) {
    var job = DB.getJob(id);
    var saleNum = (job && job.num) ? String(job.num).replace(/-V\d+$/, '') : null;
    // For Greitt síðar items: confirm payment was received BEFORE marking as
    // collected. Prevents accidentally letting the customer leave without paying.
    var pendingSale = null;
    if (saleNum && DB.sb) {
      try {
        var r = await DB.sb.from('solur')
          .select('id,num,samtals,greitt_med,paid_at')
          .eq('num', saleNum)
          .eq('greitt_med', 'greitt_sidar')
          .is('paid_at', null)
          .maybeSingle();
        if (r && r.data) pendingSale = r.data;
      } catch (e) { /* non-fatal */ }
    }
    if (pendingSale) {
      var amt = Math.round(pendingSale.samtals || 0).toLocaleString('is-IS');
      // 2026-05-10 (B5+): native confirm freezes browser. Use Confirm.show.
      var ok = await Confirm.show(
        '💰 Greiðsla móttekin?\n\n'+
        'Þetta verk var greitt síðar (Greitt við afhendingu).\n'+
        'Upphæð: ' + amt + ' kr\n\n'+
        'Smelltu Já ef þú hefur fengið greiðsluna núna.\n'+
        'Smelltu Hætta við ef ekki — verkið er þá ekki merkt sem sótt.'
      );
      if (!ok) return;
    }
    DB.updateJobStatus(id,'collected');
    Counter.sel=null;
    Toast.show('Verk merkt sem sótt ✓');
    // Mark the matching solur as paid (Greitt síðar → paid on pickup)
    if (saleNum && DB.sb) {
      try {
        await DB.sb.from('solur')
          .update({ paid_at: new Date().toISOString(), paid_method: 'greitt_sidar_pickup' })
          .eq('num', saleNum)
          .eq('greitt_med', 'greitt_sidar')
          .is('paid_at', null);
      } catch (e) { /* non-fatal */ }
    }
  },
  editVerd: async function(id) {
    var job=DB.getJob(id); if(!job) return;
    var cur=job.verd?String(parseFloat(job.verd)):'';
    var val=prompt('Verð á verki (kr):',cur);
    if(val===null) return;
    var num=parseFloat(val.replace(/[^0-9.]/g,''))||0;
    if(DB.online) await DB.sb.from('verkbeidnir').update({verd:num}).eq('id',id);
    job.verd=num;
    var el=document.getElementById('verd-display-'+id);
    if(el) el.textContent=num?num.toLocaleString('is')+' kr':'—';
    Toast.show('Verð uppfært: '+num.toLocaleString('is')+' kr ✓');
    App.refreshAll();
  }
};

// ============ WORKSHOP ============
var Workshop = {
  sel: null,
  render: function() {
    var el=document.getElementById('workshop-queue'); if(!el) return;
    var jobs=DB.getWorkshopJobs();
    var html='<div style="padding:16px"><div class="ws-queue-hd"><div><div class="ws-queue-title">Verkröð</div><div class="ws-queue-sub">'+jobs.length+' verk í bið · '+U.fd(U.today())+'</div></div><button class="btn btn-outline btn-sm" onclick="Field.openScan()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:13px;height:13px"><path d="M4 6V4h2"/><path d="M4 18v2h2"/><path d="M20 6V4h-2"/><path d="M20 18v2h-2"/><line x1="4" y1="12" x2="20" y2="12"/></svg>Skanna tæki</button></div>';
    if(!jobs.length) html+='<div class="empty-state"><div class="es-icon">🎉</div><div class="es-title">Verkröð tóm</div><div class="es-sub">Engin verk í vinnslu</div></div>';
    else html+=jobs.map(function(j) {
      var a=Workshop.sel===j.id?' active':''; var done=j.units.filter(function(u){return u.status==='done';}).length;
      return '<div class="qcard'+a+'" onclick="Workshop.select('+j.id+')"><div class="qcard-top"><div class="qcard-info"><div class="qcard-num">'+U.e(j.num)+'</div><div class="qcard-cust">'+U.e(j.customer)+'</div><div class="qcard-meta">Móttekið '+U.fd(j.dropoff)+' · '+done+'/'+j.units.length+' lokið</div></div>'+U.badge(j.status)+'</div><div class="qcard-chips">'+j.units.map(function(u){var d=u.status==='done'; return '<div class="chip'+(d?' done':'')+'">'+( d?'<svg style="width:11px;height:11px;stroke:var(--grn);fill:none;flex-shrink:0" viewBox="0 0 24 24" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>':''  )+'<span class="chip-ser">'+U.e((u.serial.match(/[^-]+$/)||[u.serial])[0])+'</span><span class="chip-tp">'+U.e(u.type)+'</span></div>';}).join('')+'</div></div>';
    }).join('');
    html+='</div>'; el.innerHTML=html;
    if(this.sel) this.renderDetail(DB.getJob(this.sel));
  },
  select: function(id) {
    this.sel=id; this.render();
  },
  renderDetail: function(job) {
    var el=document.getElementById('workshop-detail'); if(!el||!job) return;
    var html='<div class="ws-scroll"><div class="ws-title">'+U.e(job.customer)+'</div><div class="ws-sub">'+U.e(job.num)+' · '+job.units.length+' slökkvitæki · Móttekið '+U.fd(job.dropoff)+'</div>';
    html+=job.units.map(function(u) {
      var done=u.status==='done';
      return '<div class="ws-row"><div class="ws-info"><div class="ws-ser">'+U.e(u.serial)+'</div><div class="ws-name">'+U.e(u.type)+' · '+U.e(u.size||'')+'</div><div class="ws-svc">'+U.e(u.service)+'</div></div><div class="ws-acts"><button class="ws-scan" onclick="Workshop.scanUnit('+job.id+','+u.id+')"><svg viewBox="0 0 24 24" stroke-width="2"><path d="M4 6V4h2"/><path d="M4 18v2h2"/><path d="M20 6V4h-2"/><path d="M20 18v2h-2"/><line x1="4" y1="12" x2="20" y2="12"/></svg>Skanna</button><div class="ws-chk'+(done?' done':'')+'" onclick="Workshop.toggleUnit('+job.id+','+u.id+')" title="Lokið"><svg viewBox="0 0 24 24" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg></div></div></div>';
    }).join('');
    html+='</div><div class="ws-footer"><button class="btn btn-success" style="width:100%;justify-content:center" onclick="Workshop.markReady('+job.id+')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>Merkja sem tilbúið</button><div class="ws-hint">Afgreiðsla fær tilkynningu og hringir í viðskiptavin</div></div>';
    el.innerHTML=html;
  },
  toggleUnit: async function(jid, uid) { await DB.updateUnitStatus(jid, uid, 'done'); },
  scanUnit: function(jid, uid) { Toast.show('Skanna QR kóðann á slökkvitækinu…'); setTimeout(function(){ DB.updateUnitStatus(jid,uid,'done'); Toast.show('✓ Tæki skannað og merkt sem lokið'); },900); },
  markReady: async function(id) { await DB.updateJobStatus(id,'ready'); Workshop.sel=null; Toast.show('Verk tilbúið · Afgreiðsla getur hringt í viðskiptavin 📞'); }
};

// ============ FIELD ============
var Field = {
  result: 'pass',
  unit: null,
  render: function() {
    var ov=DB.getOverdue(), du=DB.getDue(), sc=DB.cache.schedule, hi=DB.cache.history;
    var ae=document.getElementById('field-alerts');
    if(ae) ae.innerHTML='<div class="fcol-title">Útrunnið <span class="fcol-count">'+ov.length+'</span></div>'+
      (ov.length?ov.map(function(u){return '<div class="alert-card ov"><div class="ac-serial">'+U.e(u.serial)+'</div><div class="ac-name">'+U.e(u.client)+'</div><div class="ac-meta">'+U.e(u.location||'')+(u.next_insp?' · Útrunnið '+U.fd(u.next_insp):'')+'</div><div class="ac-acts"><button class="btn btn-primary btn-sm" onclick="Field.openInspect(DB.getUnit('+u.id+'))">Skrá skoðun</button><button class="btn btn-outline btn-sm" onclick="Print.showQR(DB.getUnit('+u.id+'))">Prenta QR</button></div></div>';}).join(''):'<div class="empty-state" style="padding:20px"><div class="es-sub">Engin útrunnin tæki 🎉</div></div>')+
      '<div class="fcol-title" style="margin-top:16px">Gjaldfallið <span class="fcol-count">'+du.length+'</span></div>'+
      (du.length?du.map(function(u){return '<div class="alert-card due"><div class="ac-serial">'+U.e(u.serial)+'</div><div class="ac-name">'+U.e(u.client)+'</div><div class="ac-meta">Næsta skoðun: '+U.fd(u.next_insp)+'</div><div class="ac-acts"><button class="btn btn-outline btn-sm" onclick="Field.openInspect(DB.getUnit('+u.id+'))">Skrá skoðun</button></div></div>';}).join(''):'<div class="empty-state" style="padding:20px"><div class="es-sub">Engin tæki gjaldfallin</div></div>');
    var se=document.getElementById('field-schedule');
    if(se) se.innerHTML='<div class="fcol-title">Næstu heimsóknir <span class="fcol-count">'+sc.length+'</span></div>'+
      (sc.length?sc.map(function(s){var d=new Date(s.date+'T00:00:00');var mo=['jan','feb','mar','apr','maí','jún','júl','ágú','sep','okt','nóv','des'];return '<div class="sched-card"><div class="sched-date"><div class="sched-day">'+d.getDate()+'</div><div class="sched-mon">'+mo[d.getMonth()]+'</div></div><div class="sched-info"><div class="sched-client">'+U.e(s.client)+'</div><div class="sched-meta">'+s.time+' · '+s.tech+' · '+s.units+' tæki</div></div>'+U.badge('scheduled')+'</div>';}).join(''):'<div class="empty-state" style="padding:20px"><div class="es-sub">Engar áætlaðar heimsóknir</div></div>');
    var he=document.getElementById('field-history');
    if(he) he.innerHTML='<div class="fcol-title">Skoðunarsaga <span class="fcol-count">'+hi.length+'</span></div>'+
      (hi.length?hi.map(function(h){return '<div class="hist-card"><div class="hist-top"><div class="hist-name">'+U.e(h.client)+'</div>'+U.badge(h.result)+'</div><div class="hist-meta">'+U.fd(h.date)+(h.tech?' · '+U.e(h.tech):'')+'</div>'+(h.notes?'<div class="hist-notes">'+(function(n){try{var o=JSON.parse(n);var acts={insert:'Bætt við',update:'Uppfærð',delete:'Eytt'};var tbl={verkbeidnir:'verkbeiðni',verklidur:'þjónustulínu',uttaeki:'tæki',fyrirtaeki:'fyrirtæki',vorur:'vöru',solur:'sölu'};if(o.d)return U.e(o.d);var a=acts[o.a]||o.a||'';var t=tbl[o.t]||o.t||'';return U.e([a,t?'→ '+t:''].filter(Boolean).join(' '));}catch(e){return U.e(n);}})(h.notes)+'</div>':'')+'</div>';}).join(''):'');
  },
  openScan: function() { document.getElementById('scan-serial').value=''; document.getElementById('scan-result').innerHTML=''; Modal.open('modal-scan'); setTimeout(function(){document.getElementById('scan-serial').focus();},300); },
  doLookupCode: function(code) { document.getElementById('scan-serial').value = code; this.doLookup(); },
  doLookup: function() {
    var s=document.getElementById('scan-serial').value.trim(); if(!s){Toast.show('Sláðu inn raðnúmer');return;}
    var u=DB.findBySerial(s), el=document.getElementById('scan-result');
    if(!u){el.innerHTML='<div class="scan-notfound">Ekkert tæki fannst með raðnúmerið: <strong>'+U.e(s)+'</strong></div>'; return;}
    el.innerHTML='<div class="scan-found"><div class="ub-ser">'+U.e(u.serial)+'</div><div class="ub-name">'+U.e(u.client)+'</div><div class="ub-sub">'+U.e(u.type)+' · '+U.e(u.size||'')+' · '+U.badge(u.status)+'</div><div style="display:flex;gap:8px;margin-top:10px"><button class="btn btn-outline btn-sm" onclick="Modal.close(\'modal-scan\');Print.showQR(DB.getUnit('+u.id+'))">Prenta QR</button><button class="btn btn-primary btn-sm" onclick="Modal.close(\'modal-scan\');Field.openInspect(DB.getUnit('+u.id+'))">Skrá skoðun</button></div></div>';
  },
  openInspect: function(u) {
    if(!u) return; this.unit=u; this.result='pass';
    document.getElementById('inspect-badge').innerHTML='<div class="ub-ser">'+U.e(u.serial)+'</div><div class="ub-name">'+U.e(u.client)+'</div><div class="ub-sub">'+U.e(u.type)+' · '+U.e(u.size||'')+(u.location?' · '+U.e(u.location):'')+'</div>';
    document.getElementById('ip-pressure').value=u.pressure||''; document.getElementById('ip-notes').value=''; document.getElementById('ip-weight').selectedIndex=0;
    this.setResult('pass'); Modal.open('modal-inspect');
  },
  setResult: function(r) { this.result=r; document.getElementById('rb-pass').classList.toggle('active',r==='pass'); document.getElementById('rb-fail').classList.toggle('active',r==='fail'); },
  submitInspect: async function() {
    if(!this.unit) return;
    var u=this.unit;
    await DB.addInspection(u.id,{result:this.result,pressure:document.getElementById('ip-pressure').value,weight:document.getElementById('ip-weight').value,notes:document.getElementById('ip-notes').value});
    Modal.close('modal-inspect');
    Toast.show((this.result==='pass'?'✓ Skoðun í lagi · ':'✗ Skoðun mistókst · ')+'QR miði prentaður');
    setTimeout(function(){Print.showQR(DB.getUnit(u.id));},400);
  },
  openAddUnit: function() {
    var t=U.today(), n=(parseInt(t.slice(0,4))+1)+t.slice(4);
    document.getElementById('au-inst').value=t; document.getElementById('au-next').value=n;
    ['au-type','au-size','au-client','au-loc'].forEach(function(id){var el=document.getElementById(id);if(el.tagName==='INPUT')el.value='';});
    Modal.open('modal-addunit');
  },
  submitAddUnit: async function() {
    var client=document.getElementById('au-client').value.trim();
    if(!client){Toast.show('Sláðu inn staðsetningu');return;}
    // 2026-08-30 (regla 0): fyrirtækis-id fylgir nú með úr Companies.addUnit.
    var _f=document.getElementById('modal-addunit');
    var _co=_f&&_f.dataset.coId?parseInt(_f.dataset.coId,10):null;
    var u=await DB.addUnit({type:document.getElementById('au-type').value,size:document.getElementById('au-size').value||'6 kg',client,location:document.getElementById('au-loc').value,inst:document.getElementById('au-inst').value,next:document.getElementById('au-next').value,fyrirtaeki_id:(_co||null)});
    Modal.close('modal-addunit'); Field.render();
    setTimeout(function(){Print.showQR(u);},200);
    // Regla 2 — allt sjáanlegt: tækist ekki að tengja tækið á það að SJÁST,
    // ekki verða þögull draugur sem birtist síðar á reikningi.
    if(u && u.fyrirtaeki_id==null){
      Toast.show('⚠ Tæki skráð ('+u.serial+') EN ÓTENGT fyrirtæki — opnaðu fyrirtækið og skráðu það þaðan');
    } else {
      Toast.show('Tæki skráð · '+u.serial);
    }
  }
};

// ============ APP ============
var App = {
  view: 'counter',
  init: function() { DB.init(); },
  switchView: function(v) {
    this.view=v;
    document.querySelectorAll('.view').forEach(function(el){el.classList.remove('active');});
    document.querySelectorAll('.vnav-btn').forEach(function(el){el.classList.remove('active');});
    var vEl=document.getElementById('view-'+v); if(vEl) vEl.classList.add('active');
    var btn=document.querySelector('.vnav-btn[data-view="'+v+'"]'); if(btn) btn.classList.add('active');
    if(v==='companies'&&typeof Companies!=='undefined')Companies.load();
    if(v==='settings'&&typeof Settings!=='undefined')Settings.load();
    if(v==='income'&&typeof Income!=='undefined')Income.render();
  },
  refreshAll: function() {
    Counter.render(); Workshop.render(); Field.render();
    if(this.view==='companies'&&typeof Companies!=='undefined')Companies.render();
    if(this.view==='income'&&typeof Income!=='undefined')Income.render();
    document.getElementById('alert-badge').textContent = DB.getOverdue().length + DB.getDue().length;
  }
};
document.addEventListener('DOMContentLoaded', function() { App.init(); });