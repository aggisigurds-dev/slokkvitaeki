/* Slökkvitæki v9 — Edit buttons + Language switcher + Dashboard + Floor plans */
(function init() {
  if (typeof DB === 'undefined' || typeof App === 'undefined') return setTimeout(init, 300);

  /* ── TRANSLATIONS ───────────────────────────────────────────── */
  var _lang = localStorage.getItem('_slokk_lang') || 'is';
  var T = {
    is: { edit:'Breyta', save:'Vista', cancel:'Hætta við', del:'Eyða',
      serial:'Raðnúmer', type:'Tegund', size:'Stærð', loc:'Staðsetning',
      nextInsp:'Næsta skoðun', pressure:'Þrýstingur (bar)', notes:'Athugasemdir',
      editUnit:'Breyta tæki', editLoan:'Breyta lánstæki',
      delConfirm:'Eyða þessu tæki endanlega?', lang:'EN',
      status:'Staða', vidtaki:'Viðtaki',
      laus:'Til ráðstöfunar', verkstadi:'Í verkstæði', utleigt:'Útleigt',
      dashboard:'Yfirlit', customer:'Viðskiptavinur', phone:'Sími', geymslaSection:'Geymsla — fráteknar eininar' },
    en: { edit:'Edit', save:'Save', cancel:'Cancel', del:'Delete',
      serial:'Serial No.', type:'Type', size:'Size', loc:'Location',
      nextInsp:'Next Inspection', pressure:'Pressure (bar)', notes:'Notes',
      editUnit:'Edit Unit', editLoan:'Edit Loan Unit',
      delConfirm:'Delete this unit permanently?', lang:'IS',
      status:'Status', vidtaki:'Recipient',
      laus:'Available', verkstadi:'In Workshop', utleigt:'On Loan',
      dashboard:'Dashboard', customer:'Customer', phone:'Phone', geymslaSection:'Storage — reserved units' }
  };
  function t(k) { return (T[_lang]||T.is)[k]||k; }
  window._slokk_t = t;
  window._slokk_getLang = function(){ return _lang; };

  /* ── NAV TRANSLATIONS ───────────────────────────────────────── */
  var navPairs = [
    ['Afgreiðsla','Dispatch'],['Verkstæði','Workshop'],['Þjónustutæki','Field Units'],
    ['Fyrirtæki','Companies'],['Tekjur','Revenue'],['Stillingar','Settings'],
    ['Lánstæki','Loan Units'],['Geymsla','Storage'],['Yfirlit','Dashboard'],
    ['DAGLEG VINNA','DAILY WORK'],['SKRÁR','RECORDS'],['BIRGÐIR','INVENTORY']
  ];
  function applyNav() {
    var nav = document.querySelector('.view-nav, .sidebar');
    if (!nav) return;
    navPairs.forEach(function(p) {
      var from = _lang==='en' ? p[0] : p[1], to = _lang==='en' ? p[1] : p[0];
      nav.querySelectorAll('span,div').forEach(function(el) {
        if (el.children.length===0 && el.textContent.trim()===from) el.textContent=to;
      });
    });
  }

  /* ── LANGUAGE BUTTON ────────────────────────────────────────── */
  function buildLangBtn() {
    if (document.getElementById('_slokk_langbtn')) return;
    var btn = document.createElement('button');
    btn.id = '_slokk_langbtn';
    btn.textContent = t('lang');
    btn.title = 'Switch language / Skipta um tungumál';
    btn.onclick = function() {
      _lang = _lang==='is' ? 'en' : 'is';
      localStorage.setItem('_slokk_lang', _lang);
      btn.textContent = t('lang');
      document.querySelectorAll('._slokk_edit_btn').forEach(function(b){ b.textContent=t('edit'); });
      // Update dashboard button label
      var db = document.getElementById('_dash_nav');
      if (db) { var sp = db.querySelector('span'); if(sp) sp.textContent = t('dashboard'); }
      applyNav();
    };
    document.body.appendChild(btn);
  }

  /* ── DASHBOARD ──────────────────────────────────────────────── */
  // 2026-05-16: v9.js's legacy "Dashboard" sidebar button was injected
  // without a data-view attribute, which made it a rogue duplicate of
  // patch 34's "Yfirlit" view button (when both labels resolved to
  // "Yfirlit" in Icelandic). It also bypassed patch 88's
  // hidden_nav_views preference. Patch 34 (with proper data-view="yfirlit")
  // is the canonical dashboard now — this builder is a no-op. Clean up
  // any existing rogue node so the sidebar reorders cleanly.
  function buildDashBtn() {
    var stale = document.getElementById('_dash_nav');
    if (stale) {
      var sep = stale.nextElementSibling;
      stale.remove();
      // Remove the trailing divider too (height:1px style)
      if (sep && sep.style && /height:\s*1px/.test(sep.style.cssText || '')) sep.remove();
    }
    // showDashboard is still callable from anywhere via window if needed,
    // but no nav button is auto-created.
  }

  function showDashboard() {
    var ex = document.getElementById('_dash_modal'); if(ex){ ex.remove(); return; }
    var units = DB.cache.units || [];
    var jobs = DB.cache.jobs || [];
    var _today = new Date().toISOString().substring(0,10);
    var overdue = units.filter(function(u){ return u.status==='active' && u.next_insp && u.next_insp<_today; }).length;
    var ok = units.filter(function(u){ return u.status==='active' && u.next_insp && u.next_insp>=_today; }).length;
    var inStorage = units.filter(function(u){ return u.status==='geymsla'; }).length;
    var inProg = jobs.filter(function(j){ return j.status==='inprogress'||j.status==='received'; }).length;
    var ready = jobs.filter(function(j){ return j.status==='ready'; }).length;
    var fieldUnits = units.length - inStorage;

    var ov = document.createElement('div');
    ov.id = '_dash_modal';
    ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:9000;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(3px);';

    function kpi(icon, val, label, bg, col) {
      return '<div style="background:'+bg+';border-radius:14px;padding:18px 14px;text-align:center;min-width:0;">'+
        '<div style="font-size:22px;margin-bottom:2px;">'+icon+'</div>'+
        '<div style="font-size:26px;font-weight:800;color:'+col+';">'+val+'</div>'+
        '<div style="font-size:11px;font-weight:600;color:'+col+';opacity:.75;margin-top:2px;">'+label+'</div>'+
      '</div>';
    }

    ov.innerHTML =
      '<div style="background:#fff;border-radius:20px;padding:30px;width:800px;max-width:96vw;max-height:90vh;overflow-y:auto;box-shadow:0 28px 80px rgba(0,0,0,.35);">'+
        '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:22px;">'+
          '<div><h2 style="margin:0;font-size:21px;font-weight:800;color:#111;">'+t('dashboard')+'</h2>'+
            '<p style="margin:3px 0 0;font-size:12px;color:#999;">'+new Date().toLocaleDateString('is-IS',{day:'numeric',month:'long',year:'numeric'})+' · Slökkvitæki ehf</p></div>'+
          '<button id="_dash_close" style="border:none;background:#f3f4f6;border-radius:10px;padding:7px 14px;font-size:13px;font-weight:600;cursor:pointer;color:#374151;">✕ Loka</button>'+
        '</div>'+

        // KPI row
        '<div style="display:grid;grid-template-columns:repeat(5,1fr);gap:12px;margin-bottom:20px;">'+
          kpi('🔴', overdue, _lang==='en'?'Overdue':'Útrunni', '#fee2e2', '#dc2626')+
          kpi('✅', ok, _lang==='en'?'OK units':'Í lagi', '#d1fae5', '#059669')+
          kpi('🔧', inProg, _lang==='en'?'In workshop':'Í vinnslu', '#fef3c7', '#d97706')+
          kpi('📦', inStorage, _lang==='en'?'In storage':'Í geymslu', '#ede9fe', '#7c3aed')+
          kpi('🚚', ready, _lang==='en'?'Ready pickup':'Tilbúið', '#dbeafe', '#2563eb')+
        '</div>'+

        // Two column layout
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">'+

          // Left: upcoming visits
          '<div style="background:#f9fafb;border-radius:14px;padding:18px;">'+
            '<h3 style="margin:0 0 12px;font-size:14px;font-weight:700;color:#111;">'+(_lang==='en'?'Upcoming Visits':'Næstu heimsóknir')+'</h3>'+
            '<div id="_dash_visits"><div style="color:#aaa;font-size:12px;">Hleður...</div></div>'+
          '</div>'+

          // Right: stats
          '<div style="background:#f9fafb;border-radius:14px;padding:18px;">'+
            '<h3 style="margin:0 0 12px;font-size:14px;font-weight:700;color:#111;">'+(_lang==='en'?'Overview':'Yfirlit')+'</h3>'+
            '<div style="display:grid;gap:8px;">'+
              _statRow('🏢', _lang==='en'?'Companies':'Fyrirtæki', (function(){var s={};units.forEach(function(u){if(u.client)s[u.client]=1;});return Object.keys(s).length;})())+
              _statRow('🧯', _lang==='en'?'Field units':'Þjónustutæki', fieldUnits+' tæki')+
              _statRow('🔗', _lang==='en'?'Loan units':'Lánstæki', '<span id="_dash_loan">…</span>')+
              _statRow('💰', _lang==='en'?'Revenue (jobs)':'Tekjur (verk)', '<span id="_dash_rev">hleður...</span>')+
              _statRow('📋', _lang==='en'?'Active jobs':'Virk verk', jobs.length+' verk')+
            '</div>'+
          '</div>'+
        '</div>'+

        // Bottom: company status bar
        '<div style="margin-top:16px;background:#f9fafb;border-radius:14px;padding:18px;">'+
          '<h3 style="margin:0 0 12px;font-size:14px;font-weight:700;color:#111;">'+(_lang==='en'?'Company Status':'Staða fyrirtækja')+'</h3>'+
          '<div id="_dash_companies" style="display:grid;grid-template-columns:repeat(5,1fr);gap:10px;"></div>'+
        '</div>'+

        // Geymsla section — storage units with customer/phone
        '<div style="margin-top:16px;background:#f9fafb;border-radius:14px;padding:18px;">'+
          '<h3 style="margin:0 0 12px;font-size:14px;font-weight:700;color:#111;">'+t('geymslaSection')+'</h3>'+
          '<div id="_dash_geymsla" style="display:grid;gap:8px;"><div style="color:#aaa;font-size:12px;">Hleður...</div></div>'+
        '</div>'+
      '</div>';

    document.body.appendChild(ov);
    ov.onclick = function(e){ if(e.target===ov) ov.remove(); };
    document.getElementById('_dash_close').onclick = function(){ ov.remove(); };

    // Load loan-unit count (real, not hardcoded)
    DB.sb.from('lanstaeki').select('id').then(function(r){
      var el = document.getElementById('_dash_loan');
      if (!el) return;
      el.textContent = ((r.data||[]).length) + ' tæki';
    });

    // Load visits
    DB.sb.from('dagskra').select('*').gte('date',new Date().toISOString().substring(0,10)).order('date').limit(6).then(function(r){
      var el = document.getElementById('_dash_visits');
      if (!el) return;
      var visits = r.data || [];
      // 2026-06-28: escape every user-controlled string into innerHTML (unit
      // client / serial / type). Previously a customer name with HTML in
      // it would inject into the dashboard's "upcoming visits" widget.
      var _e=(window.U&&U.e)?U.e:function(s){return String(s==null?'':s).replace(/[&<>"']/g,function(ch){return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[ch];});};
      if (!visits.length) { var _td=new Date().toISOString().substring(0,10),_d60=new Date(Date.now()+60*86400000).toISOString().substring(0,10);var _due=(DB.cache.units||[]).filter(function(u){return u.status==='active' && u.next_insp && u.next_insp<=_d60;}).sort(function(a,b){return (a.next_insp||'').localeCompare(b.next_insp||'');}).slice(0,6);if(!_due.length){ el.innerHTML='<p style="color:#aaa;font-size:12px;margin:0;">'+(_lang==='en'?'No upcoming visits':'Engar heimsóknir')+'</p>'; return; }el.innerHTML=_due.map(function(u){var ov=u.next_insp<_td;var col=ov?'#dc2626':'#b45309';var dt=new Date(u.next_insp).toLocaleDateString('is',{day:'numeric',month:'short'});return '<div style="display:flex;justify-content:space-between;align-items:center;padding:7px 0;border-bottom:1px solid #f3f4f6"><div style="min-width:0;flex:1"><div style="font-weight:600;color:#111;font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+_e(u.client||u.serial)+'</div><div style="color:#666;font-size:11px">'+_e(u.serial||'')+(u.type?' · '+_e(u.type):'')+'</div></div><div style="color:'+col+';font-size:12px;font-weight:600;white-space:nowrap;margin-left:8px">'+(ov?(_lang==='en'?'Overdue ':'Útrunnið '):'')+dt+'</div></div>';}).join('');return; }
      var monthColors = {'04':'#dc2626','05':'#d97706','06':'#059669','07':'#059669'};
      el.innerHTML = visits.map(function(v){
        var d=new Date(v.date); var m=v.date.slice(5,7);
        var col = monthColors[m]||'#059669';
        var ds = d.getDate()+'.'+(d.getMonth()+1)+'.';
        return '<div style="display:flex;gap:10px;align-items:center;padding:6px 0;border-bottom:1px solid #eee;">'+
          '<div style="background:'+col+';color:#fff;font-size:11px;font-weight:700;border-radius:6px;padding:3px 8px;white-space:nowrap;">'+ds+'</div>'+
          '<div style="min-width:0;"><div style="font-weight:600;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">'+_e(v.client)+'</div>'+
          '<div style="font-size:11px;color:#888;">'+_e(v.time)+' · '+_e(v.tech)+'</div></div>'+
        '</div>';
      }).join('');
    });

    // Load revenue
    DB.sb.from('verkbeidnir').select('verd,status').then(function(r){
      var el = document.getElementById('_dash_rev');
      if (!el) return;
      var total = (r.data||[]).reduce(function(s,j){ return s+(parseFloat(j.verd)||0); },0);
      el.textContent = total>0 ? Math.round(total).toLocaleString('is-IS')+' kr' : '0 kr';
    });

    // Company statuses — from the already-loaded cache (no second full uttaeki fetch;
    // the old re-fetch also omitted next_insp, so its overdue count was always 0)
    (function(){
      var el = document.getElementById('_dash_companies');
      if (!el) return;
      var byComp = {};
      var _td = new Date().toISOString().substring(0,10);
      units.forEach(function(u){
        if (!byComp[u.client]) byComp[u.client]={ok:0,overdue:0,total:0};
        byComp[u.client].total++;
        if (u.status==='active' && u.next_insp && u.next_insp<_td) byComp[u.client].overdue++;
        else if (u.status==='active' && u.next_insp && u.next_insp>=_td) byComp[u.client].ok++;
      });
      var companies = Object.keys(byComp).filter(function(c){return c;}).sort(function(a,b){
        var A=byComp[a], B=byComp[b];
        return (B.overdue-A.overdue) || (B.total-A.total);
      }).slice(0,5);
      if (!companies.length) { el.innerHTML='<p style="color:#aaa;font-size:12px;margin:0;grid-column:1/-1;">'+(_lang==='en'?'No companies':'Engin fyrirtæki')+'</p>'; return; }
      el.innerHTML = companies.map(function(co){
        var stats = byComp[co]||{ok:0,overdue:0,total:0};
        var hasIssue = stats.overdue > 0;
        var abbr = co.split(' ').map(function(w){return w[0];}).join('').slice(0,2).toUpperCase();
        return '<div style="background:#fff;border-radius:10px;padding:12px;text-align:center;border:2px solid '+(hasIssue?'#fecaca':'#d1fae5')+';">'+
          '<div style="width:32px;height:32px;border-radius:8px;background:'+(hasIssue?'#dc2626':'#059669')+';color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:12px;margin:0 auto 6px;">'+abbr+'</div>'+
          '<div style="font-size:10px;font-weight:600;color:#374151;line-height:1.3;margin-bottom:4px;">'+co.split(' ').slice(0,2).join(' ')+'</div>'+
          '<div style="font-size:11px;color:'+(hasIssue?'#dc2626':'#059669')+';font-weight:700;">'+(hasIssue?stats.overdue+' útrunni':'Í lagi')+'</div>'+
        '</div>';
      }).join('');
    })();

    // Load Geymsla units with customer+phone
    DB.sb.from('uttaeki').select('serial,type,size,client,phone,location,next_insp').eq('status','geymsla').order('serial').then(function(r){
      var el = document.getElementById('_dash_geymsla');
      if (!el) return;
      var items = r.data || [];
      if (!items.length) { el.innerHTML='<p style="color:#aaa;font-size:12px;margin:0;">Engin tæki í geymslu</p>'; return; }
      el.innerHTML = items.map(function(u){
        var hasCustomer = u.client && u.client !== 'Slökkvitæki ehf';
        var bg = hasCustomer ? '#fef3c7' : '#fff';
        var border = hasCustomer ? '#fcd34d' : '#e5e7eb';
        return '<div style="display:flex;align-items:center;gap:12px;background:'+bg+';border:1px solid '+border+';border-radius:10px;padding:10px 14px;">'+
          '<div style="background:#7c3aed;color:#fff;font-size:10px;font-weight:700;border-radius:6px;padding:4px 8px;white-space:nowrap;">'+u.serial+'</div>'+
          '<div style="flex:1;min-width:0;">'+
            '<div style="font-weight:600;font-size:12px;color:#111;">'+u.type+' '+(u.size||'')+(hasCustomer ? ' → <span style="color:#92400e;">'+u.client+'</span>' : '')+'</div>'+
            '<div style="font-size:11px;color:#666;margin-top:2px;">'+(u.location||'')+(u.phone ? ' · 📞 '+u.phone : '')+'</div>'+
          '</div>'+
        '</div>';
      }).join('');
    });
  }

  function _statRow(icon, label, val) {
    return '<div style="display:flex;justify-content:space-between;align-items:center;background:#fff;border-radius:9px;padding:10px 14px;border:1px solid #e5e7eb;">'+
      '<span style="font-size:13px;color:#374151;">'+icon+' '+label+'</span>'+
      '<span style="font-weight:700;font-size:14px;color:#111;">'+val+'</span>'+
    '</div>';
  }

  /* ── FLOOR PLAN GENERATORS ──────────────────────────────────── */
  function generateFloorPlan(companyId) {
    if (localStorage.getItem('fp_'+companyId)) return; // already exists
    var canvas = document.createElement('canvas');
    canvas.width = 900; canvas.height = 520;
    var ctx = canvas.getContext('2d');
    var units = (DB.cache.units||[]).filter(function(u){
      var map = {6:'Ríkisútvarpið', 7:'Kópavogsbær', 8:'Sundlaug Laugardals'};
      return u.client === map[companyId];
    });

    if (companyId===6) _drawRUV(ctx, units, canvas);
    else if (companyId===7) _drawKopavogur(ctx, units, canvas);
    else if (companyId===8) _drawSundlaug(ctx, units, canvas);

    var fpData = {
      imageUrl: canvas.toDataURL('image/jpeg', 0.85),
      markers: units.map(function(u,i){
        var positions = [[0.15,0.35],[0.55,0.25],[0.8,0.6]];
        return { x:(positions[i]||[0.5,0.5])[0], y:(positions[i]||[0.5,0.5])[1], serial:u.serial, label:u.location||'Óþekktur staður' };
      })
    };
    localStorage.setItem('fp_'+companyId, JSON.stringify(fpData));
  }

  function _floorBase(ctx, title, address) {
    ctx.fillStyle='#f8f5f1'; ctx.fillRect(0,0,900,520);
    ctx.fillStyle='#222'; ctx.font='bold 14px Arial'; ctx.fillText(title,20,22);
    ctx.font='10px Arial'; ctx.fillStyle='#666'; ctx.fillText(address,20,36);
  }

  function _room(ctx, x,y,w,h, label, sub, col) {
    ctx.fillStyle=col||'#e8e4dc'; ctx.fillRect(x,y,w,h);
    ctx.strokeStyle='#555'; ctx.lineWidth=1.5; ctx.strokeRect(x,y,w,h);
    ctx.fillStyle='#333'; ctx.font='bold 10px Arial'; ctx.textAlign='center';
    ctx.fillText(label,x+w/2,y+h/2-(sub?4:0));
    if(sub){ctx.font='9px Arial';ctx.fillStyle='#666';ctx.fillText(sub,x+w/2,y+h/2+9);}
    ctx.textAlign='left';
  }

  function _fe(ctx, x,y,serial,col) {
    ctx.save();
    ctx.beginPath();ctx.arc(x,y,12,0,2*Math.PI);
    ctx.fillStyle=col||'#dc2626';ctx.fill();
    ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.stroke();
    ctx.fillStyle='#fff';ctx.font='bold 9px Arial';ctx.textAlign='center';
    ctx.fillText('FE',x,y+3);
    ctx.textAlign='left';
    ctx.fillStyle=col;ctx.font='bold 8px Arial';
    ctx.fillText(serial,x+15,y+4);
    ctx.restore();
  }

  function _legend(ctx) {
    ctx.fillStyle='#f0ede8';ctx.fillRect(620,462,250,40);
    ctx.strokeStyle='#ccc';ctx.lineWidth=1;ctx.strokeRect(620,462,250,40);
    ctx.beginPath();ctx.arc(635,472,6,0,2*Math.PI);ctx.fillStyle='#dc2626';ctx.fill();
    ctx.fillStyle='#333';ctx.font='9px Arial';ctx.fillText('Útrunni / þarf skoðun',646,476);
    ctx.beginPath();ctx.arc(635,489,6,0,2*Math.PI);ctx.fillStyle='#16a34a';ctx.fill();
    ctx.fillText('Í lagi',646,493);
  }

  function _drawRUV(ctx, units, canvas) {
    _floorBase(ctx,'RÍKISÚTVARPIÐ — AÐALBYGGING','Efstaleiti 1, 150 Reykjavík');
    ctx.strokeStyle='#222';ctx.lineWidth=4;ctx.strokeRect(50,55,820,430);
    ctx.fillStyle='#ede8e0';ctx.fillRect(50,55,820,430);

    _room(ctx,50,55,200,120,'Fréttastofa','Studio A','#e0ead8');
    _room(ctx,260,55,180,120,'Hljóðver 1','Tónlistarútvarp','#e0ead8');
    _room(ctx,450,55,200,120,'Hljóðver 2','Dagskrárgerð','#e0ead8');
    _room(ctx,660,55,210,120,'Stjórnherbergi','Master control','#f0e8dc');
    _room(ctx,50,185,150,100,'Klippiherbergi','Myndvinnsla','#dde8ee');
    _room(ctx,210,185,220,100,'Skrifstofur','Ritstjórn','#f0ece0');
    _room(ctx,440,185,220,100,'Stjórnendur','Management','#f0ece0');
    _room(ctx,670,185,200,100,'Fundarherbergi','Ráðstefna','#ede9fe');

    // Corridor
    ctx.fillStyle='#d8d4cc';ctx.fillRect(50,290,820,50);
    ctx.strokeStyle='#888';ctx.lineWidth=1;ctx.strokeRect(50,290,820,50);
    ctx.fillStyle='#888';ctx.font='italic 10px Arial';ctx.textAlign='center';
    ctx.fillText('Aðalgangur — 1. hæð',460,318);ctx.textAlign='left';

    _room(ctx,50,350,200,130,'Sendistöð A','Útsendingarstöð','#e0ead8');
    _room(ctx,260,350,200,130,'Tæknigeymsl.','Búnaðarverslun','#e8e4dc');
    _room(ctx,470,350,200,130,'Eldhús','Starfskaffi','#f0e8e0');
    _room(ctx,680,350,190,130,'Afgreiðsla','Móttaka','#f0ece0');

    // FE markers
    var cols = {ok:'#16a34a', overdue:'#dc2626'};
    var pos = [[80,370],[460,110],[700,230]];
    units.forEach(function(u,i){
      var p=pos[i]||[460,400];
      _fe(ctx,p[0],p[1],u.serial,cols[u.status]||'#dc2626');
    });
    _legend(ctx);
  }

  function _drawKopavogur(ctx, units, canvas) {
    _floorBase(ctx,'KÓPAVOGSBÆR — RÁÐHÚS','Tjarnargata 11, 200 Kópavogur');
    ctx.strokeStyle='#222';ctx.lineWidth=4;ctx.strokeRect(50,55,820,430);
    ctx.fillStyle='#ede8e0';ctx.fillRect(50,55,820,430);

    _room(ctx,50,55,260,160,'Borgaraþjónusta','Afgreiðsla','#e0ead8');
    _room(ctx,320,55,200,160,'Bæjarstjóri','Stjórnarherb.','#f0e8dc');
    _room(ctx,530,55,180,160,'Fundarherbergi','Bæjarstjórn','#ede9fe');
    _room(ctx,720,55,150,160,'Skjalastofan','Geymsla','#e8e4dc');

    ctx.fillStyle='#d8d4cc';ctx.fillRect(50,220,820,45);
    ctx.strokeStyle='#888';ctx.lineWidth=1;ctx.strokeRect(50,220,820,45);
    ctx.fillStyle='#888';ctx.font='italic 10px Arial';ctx.textAlign='center';
    ctx.fillText('Miðgangur',460,246);ctx.textAlign='left';

    _room(ctx,50,270,200,210,'Íþróttaráð','Þjónustutorg','#e0ead8');
    _room(ctx,260,270,200,210,'Tæknideild','Mannvirkjagr.','#dde8ee');
    _room(ctx,470,270,200,210,'Félagsþjónusta','Velferðarmál','#e0ead8');
    _room(ctx,680,270,190,210,'Þjónustuver','Borgaraþjónusta','#e0ead8');

    // Staircase
    ctx.fillStyle='#c8d0c0';ctx.fillRect(260,55,60,165);
    ctx.strokeStyle='#666';ctx.lineWidth=1;ctx.strokeRect(260,55,60,165);
    for(var i=0;i<7;i++){ctx.beginPath();ctx.moveTo(260,75+i*20);ctx.lineTo(320,75+i*20);ctx.stroke();}
    ctx.fillStyle='#666';ctx.font='8px Arial';ctx.textAlign='center';ctx.fillText('STIGI',290,205);ctx.textAlign='left';

    var cols = {ok:'#16a34a', overdue:'#dc2626'};
    var pos = [[100,300],[380,100],[700,350]];
    units.forEach(function(u,i){
      var p=pos[i]||[460,400];
      _fe(ctx,p[0],p[1],u.serial,cols[u.status]||'#dc2626');
    });
    _legend(ctx);
  }

  function _drawSundlaug(ctx, units, canvas) {
    _floorBase(ctx,'SUNDLAUG LAUGARDALS — JARÐHÆÐ','Sundlaugavegur 105, 104 Reykjavík');
    ctx.strokeStyle='#222';ctx.lineWidth=4;ctx.strokeRect(50,55,820,430);
    ctx.fillStyle='#e8f4f8';ctx.fillRect(50,55,820,430); // Light blue background

    // Main pool - indoor
    ctx.fillStyle='#b8ddf0';
    ctx.fillRect(180,80,450,220);
    ctx.strokeStyle='#4a9fc0';ctx.lineWidth=2;ctx.strokeRect(180,80,450,220);
    ctx.fillStyle='#2a7fa0';ctx.font='bold 12px Arial';ctx.textAlign='center';
    ctx.fillText('Innilaug',405,185);ctx.font='9px Arial';ctx.fillStyle='#4a9fc0';
    ctx.fillText('25m × 12m — 8 brautir',405,200);ctx.textAlign='left';

    // Hot tubs / Whirlpools
    ctx.fillStyle='#fde68a';
    ctx.beginPath();ctx.ellipse(700,130,60,50,0,0,2*Math.PI);ctx.fill();
    ctx.strokeStyle='#d97706';ctx.lineWidth=2;ctx.stroke();
    ctx.fillStyle='#92400e';ctx.font='bold 9px Arial';ctx.textAlign='center';
    ctx.fillText('Heitur',700,125);ctx.fillText('pottur',700,138);ctx.textAlign='left';

    // Children pool
    ctx.fillStyle='#bfdbfe';
    ctx.fillRect(50,80,120,120);
    ctx.strokeStyle='#3b82f6';ctx.lineWidth=2;ctx.strokeRect(50,80,120,120);
    ctx.fillStyle='#1d4ed8';ctx.font='bold 9px Arial';ctx.textAlign='center';
    ctx.fillText('Barnaból',110,140);ctx.textAlign='left';

    // Facilities
    _room(ctx,50,220,120,100,'Sturtur','Karlmenn','#e8e4dc');
    _room(ctx,50,330,120,100,'Sturtur','Konur','#f0e8f0');
    _room(ctx,640,230,230,80,'Búningsklefar','M/K','#e8e4dc');
    _room(ctx,640,320,230,100,'Þjónusta','Starfsmenn','#f0ece0');
    _room(ctx,180,320,450,80,'Saunaherb.','Gufubað + sauna','#f5ede0');
    _room(ctx,180,410,450,65,'Kaffistofan','Veitingastaður','#fef3c7');
    _room(ctx,640,430,230,55,'Geymsla','Tæki og búnaður','#e8e4dc');
    _room(ctx,50,440,120,45,'Inngang.','Aðalinngang','#f0ece0');

    // Lane markers in pool
    ctx.strokeStyle='rgba(0,100,160,0.3)';ctx.lineWidth=1;
    for(var lane=0;lane<7;lane++){ctx.beginPath();ctx.moveTo(180,110+lane*27);ctx.lineTo(630,110+lane*27);ctx.stroke();}

    var cols = {ok:'#16a34a', overdue:'#dc2626'};
    var pos = [[80,345],[620,60],[700,300]];
    units.forEach(function(u,i){
      var p=pos[i]||[460,400];
      _fe(ctx,p[0],p[1],u.serial,cols[u.status]||'#dc2626');
    });
    _legend(ctx);
  }

  function generateAllFloorPlans() {
    [6,7,8].forEach(function(id){ setTimeout(function(){ generateFloorPlan(id); }, id*200); });
  }

  /* ── MODAL HELPERS ──────────────────────────────────────────── */
  function lbl(){ return 'font-size:12px;font-weight:600;color:#555;display:block;margin-bottom:5px;'; }
  function inp(x){ return 'width:100%;padding:9px 12px;border:1.5px solid #e5e7eb;border-radius:9px;font-size:14px;box-sizing:border-box;'+(x||''); }
  function fld(id,label,val,type) {
    return '<div><label style="'+lbl()+'">'+label+'</label>'+
      '<input id="'+id+'" type="'+(type||'text')+'" value="'+String(val||'').replace(/"/g,'&quot;')+'" style="'+inp()+'"/></div>';
  }
  function modalWrap(title,body,footer) {
    return '<div style="background:#fff;border-radius:16px;padding:30px;width:500px;max-width:95vw;box-shadow:0 24px 64px rgba(0,0,0,.3);max-height:90vh;overflow-y:auto;">'+
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:22px;">'+
        '<h3 style="margin:0;font-size:18px;font-weight:700;color:#111;">'+title+'</h3>'+
        '<button id="_em_x" style="border:none;background:none;font-size:24px;cursor:pointer;color:#999;line-height:1;">&times;</button>'+
      '</div><div style="display:grid;gap:14px;">'+body+'</div><div style="margin-top:22px;">'+footer+'</div></div>';
  }
  function openOv(html) {
    var ex=document.getElementById('_slokk_em'); if(ex) ex.remove();
    var ov=document.createElement('div');
    ov.id='_slokk_em';
    ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:10000;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(2px);';
    ov.innerHTML=html;
    document.body.appendChild(ov);
    function close(){ ov.remove(); }
    document.getElementById('_em_x').onclick=close;
    var can=document.getElementById('_em_can'); if(can) can.onclick=close;
    ov.onclick=function(e){ if(e.target===ov) close(); };
    return {ov:ov, close:close};
  }

  /* ── EDIT MODAL uttaeki ─────────────────────────────────────── */
  window._slokk_editUnit = function(uid) {
    var unit=(DB.cache.units||[]).find(function(u){return u.id===uid;});
    if(!unit){ DB.sb.from('uttaeki').select('*').eq('id',uid).single().then(function(r){if(r.data)_showUnit(r.data);}); return; }
    _showUnit(unit);
  };
  function _showUnit(u) {
    // 2026-05-19: was hardcoded to ['ABC Duft','CO2','Vatn','Froðuefni','Halon']
    // — units with type 'Duft', 'Brunaslanga', 'Léttvatn', 'Reykskynjari',
    // 'Eldvarnateppi' etc. silently lost their type on edit because the
    // dropdown didn't include them. Expanded base list + always inject the
    // unit's own current type so it survives a round-trip save.
    var BASE_TYPES = ['Duft','ABC Duft','CO₂','CO2','Léttvatn','Vatn','Froðuefni','Halon','Brunaslanga','Reykskynjari','Eldvarnateppi'];
    var types = BASE_TYPES.slice();
    if (u.type && types.indexOf(u.type) < 0) types.unshift(u.type);
    var typeOpts=types.map(function(tp){
      return '<option'+(u.type===tp?' selected':'')+'>'+tp+'</option>';
    }).join('');
    var body=fld('_em_ser',t('serial'),u.serial)+
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">'+
        '<div><label style="'+lbl()+'">'+t('type')+'</label><select id="_em_typ" style="'+inp()+'">'+typeOpts+'</select></div>'+
        fld('_em_siz',t('size'),u.size,'text')+
      '</div>'+
      fld('_em_loc',t('loc'),u.location)+
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">'+
        fld('_em_cli',t('customer'),u.client||'')+
        fld('_em_phn',t('phone'),u.phone||'','tel')+
      '</div>'+
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">'+
        fld('_em_nxt',t('nextInsp'),u.next_insp||'','date')+
        fld('_em_pre',t('pressure'),u.pressure||'','number')+
      '</div>'+
      '<div><label style="'+lbl()+'">'+t('notes')+'</label><textarea id="_em_not" rows="2" style="'+inp('resize:vertical;')+'">'+(u.notes||'')+'</textarea></div>';
    var footer='<div style="display:flex;justify-content:space-between;">'+
      '<button id="_em_del" style="padding:10px 16px;background:#fff;border:1.5px solid #dc2626;color:#dc2626;border-radius:9px;font-weight:600;cursor:pointer;">'+t('del')+'</button>'+
      '<div style="display:flex;gap:10px;">'+
        '<button id="_em_can" style="padding:10px 18px;background:#f5f5f7;border:none;color:#374151;border-radius:9px;font-weight:600;cursor:pointer;">'+t('cancel')+'</button>'+
        '<button id="_em_sav" style="padding:10px 24px;background:#2563eb;border:none;color:#fff;border-radius:9px;font-weight:700;cursor:pointer;">'+t('save')+'</button>'+
      '</div></div>';
    var m=openOv(modalWrap(t('editUnit'),body,footer));
    document.getElementById('_em_sav').onclick=async function(){
      var b=this; b.textContent='...'; b.disabled=true;
      var upd={serial:document.getElementById('_em_ser').value.trim(),type:document.getElementById('_em_typ').value,
        size:document.getElementById('_em_siz').value.trim(),location:document.getElementById('_em_loc').value.trim(),
        client:document.getElementById('_em_cli').value.trim(),
        phone:document.getElementById('_em_phn').value.trim(),
        next_insp:document.getElementById('_em_nxt').value||null,
        pressure:parseInt(document.getElementById('_em_pre').value)||null,
        notes:document.getElementById('_em_not').value.trim()};
      var r=await DB.sb.from('uttaeki').update(upd).eq('id',u.id);
      if(r.error){alert(r.error.message);b.textContent=t('save');b.disabled=false;return;}
      if(DB.cache.units){var i=DB.cache.units.findIndex(function(x){return x.id===u.id;});if(i>=0)Object.assign(DB.cache.units[i],upd);}
      m.close();
      try{Companies&&Companies.currentId&&Companies.openDetail(Companies.currentId);}catch(e){}
      setTimeout(inject,600);
    };
    document.getElementById('_em_del').onclick=async function(){
      if(!await Confirm.show(t('delConfirm')))return;
      await DB.sb.from('uttaeki').delete().eq('id',u.id);
      if(DB.cache.units)DB.cache.units=DB.cache.units.filter(function(x){return x.id!==u.id;});
      m.close();
    };
  }

  /* ── EDIT MODAL lanstaeki ───────────────────────────────────── */
  window._slokk_editLoan = function(lid) {
    DB.sb.from('lanstaeki').select('*').eq('id',lid).single().then(function(r){if(r.data)_showLoan(r.data);});
  };
  function _showLoan(u) {
    // 2026-05-19: same fix as _showUnit — preserve all in-use type families.
    var BASE_TYPES = ['Duft','ABC Duft','CO₂','CO2','Léttvatn','Vatn','Froðuefni','Halon','Brunaslanga','Reykskynjari','Eldvarnateppi'];
    var types = BASE_TYPES.slice();
    if (u.type && types.indexOf(u.type) < 0) types.unshift(u.type);
    var typeOpts=types.map(function(tp){
      return '<option'+(u.type===tp?' selected':'')+'>'+tp+'</option>';
    }).join('');
    var staOpts=[['til_radstofunar',t('laus')],['verkstadi',t('verkstadi')],['utleigt',t('utleigt')]].map(function(s){
      return '<option value="'+s[0]+'"'+(u.status===s[0]?' selected':'')+'>'+s[1]+'</option>';
    }).join('');
    var body=fld('_em_ser',t('serial'),u.serial)+
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">'+
        '<div><label style="'+lbl()+'">'+t('type')+'</label><select id="_em_typ" style="'+inp()+'">'+typeOpts+'</select></div>'+
        fld('_em_siz',t('size'),u.size,'text')+
      '</div>'+
      fld('_em_cli',t('vidtaki'),u.client||'')+
      fld('_em_loc','Staðsetning',u.location||'')+
      '<div><label style="'+lbl()+'">'+t('status')+'</label><select id="_em_sta" style="'+inp()+'">'+staOpts+'</select></div>'+
      fld('_em_nxt',t('nextInsp'),u.next_insp||'','date')+
      '<div><label style="'+lbl()+'">'+t('notes')+'</label><textarea id="_em_not" rows="2" style="'+inp('resize:vertical;')+'">'+(u.notes||'')+'</textarea></div>';
    var footer='<div style="display:flex;justify-content:flex-end;gap:10px;">'+
      '<button id="_em_can" style="padding:10px 18px;background:#f5f5f7;border:none;color:#374151;border-radius:9px;font-weight:600;cursor:pointer;">'+t('cancel')+'</button>'+
      '<button id="_em_sav" style="padding:10px 24px;background:#2563eb;border:none;color:#fff;border-radius:9px;font-weight:700;cursor:pointer;">'+t('save')+'</button>'+
    '</div>';
    var m=openOv(modalWrap(t('editLoan'),body,footer));
    document.getElementById('_em_sav').onclick=async function(){
      var b=this; b.textContent='...'; b.disabled=true;
      var upd={serial:document.getElementById('_em_ser').value.trim(),type:document.getElementById('_em_typ').value,
        size:document.getElementById('_em_siz').value.trim(),client:document.getElementById('_em_cli').value.trim(),
        location:document.getElementById('_em_loc').value.trim(),status:document.getElementById('_em_sta').value,
        next_insp:document.getElementById('_em_nxt').value||null,notes:document.getElementById('_em_not').value.trim()};
      var r=await DB.sb.from('lanstaeki').update(upd).eq('id',u.id);
      if(r.error){alert(r.error.message);b.textContent=t('save');b.disabled=false;return;}
      m.close();
      try{var lv=document.getElementById('view-lanstaeki');if(lv&&lv.style.display!=='none')App.switchView('lanstaeki');}catch(e){}
      setTimeout(inject,600);
    };
  }

  /* ── INJECT EDIT BUTTONS ────────────────────────────────────── */
  var _loanCache=null;
  function getLoan(cb){
    if(_loanCache){cb(_loanCache);return;}
    // inject() runs from a MutationObserver that can fire BEFORE the Supabase
    // client exists, so DB.sb was still null on early passes → this threw
    // "Cannot read properties of null (reading 'from')" twice on every page load
    // AND aborted the rest of the caller (the lánstæki edit buttons + the
    // buildDashBtn() call that follows inject()). Bail out quietly instead; the
    // observer re-runs inject() on the next DOM mutation, by which point the
    // client is ready. The callback is idempotent (it skips rows that already
    // have a button), so a later pass fills them in.
    if(!window.DB || !DB.sb) return;
    DB.sb.from('lanstaeki').select('id,serial').then(function(r){_loanCache=r.data||[];cb(_loanCache);});
  }
  function makeBtn(uid,table){
    var b=document.createElement('button');
    b.className='_slokk_edit_btn';
    b.textContent=t('edit');
    b.setAttribute('data-uid',uid);
    b.setAttribute('data-tbl',table);
    b.onclick=function(e){
      e.stopPropagation();
      var id=parseInt(this.getAttribute('data-uid'));
      if(this.getAttribute('data-tbl')==='lanstaeki') window._slokk_editLoan(id);
      else window._slokk_editUnit(id);
    };
    return b;
  }

  function inject(){
    var units=DB.cache.units||[];
    // Company detail rows (uttaeki)
    document.querySelectorAll('#companies-main table tbody tr').forEach(function(row){
      if(row.querySelector('._slokk_edit_btn')) return;
      var cells=row.querySelectorAll('td'); if(cells.length<2) return;
      var serial=cells[0].textContent.trim();
      var unit=units.find(function(u){return u.serial===serial;});
      if(!unit) return;
      cells[cells.length-1].appendChild(makeBtn(unit.id,'uttaeki'));
    });
    // Geymsla rows (uttaeki with status=geymsla)
    document.querySelectorAll('#view-geymsla table tbody tr').forEach(function(row){
      if(row.querySelector('._slokk_edit_btn')) return;
      var fc=row.querySelector('td'); if(!fc) return;
      var serial=fc.textContent.trim();
      var unit=units.find(function(u){return u.serial===serial;});
      if(!unit) return;
      var last=row.querySelector('td:last-child'); if(!last) return;
      last.appendChild(makeBtn(unit.id,'uttaeki'));
    });
    // Lánstæki rows
    getLoan(function(loans){
      document.querySelectorAll('.dtbl tbody tr, #view-lanstaeki table tbody tr').forEach(function(row){
        if(row.querySelector('._slokk_edit_btn[data-tbl="lanstaeki"]')) return;
        var serEl=row.querySelector('.ser'); if(!serEl) return;
        var serial=serEl.textContent.trim();
        var loan=loans.find(function(l){return l.serial===serial;});
        if(!loan) return;
        var last=row.querySelector('td:last-child'); if(!last) return;
        last.appendChild(makeBtn(loan.id,'lanstaeki'));
      });
    });
  }
  window._slokk_injectBtns=inject;

  /* ── PERIODIC INJECTION ─────────────────────────────────────── */
  var _cnt=0, _ti=setInterval(function(){
    if(document.hidden) return;   // don't churn while the tab/screen is in the background
    inject();
    buildDashBtn();
    if(++_cnt>=30){clearInterval(_ti);setInterval(function(){ if(document.hidden) return; inject(); buildDashBtn(); },5000);}
  },1500);

  /* ── MUTATION OBSERVER ─────────────────────────────────────── */
  var _db2=null;
  new MutationObserver(function(muts){
    if(document.hidden) return;
    if(muts.some(function(m){return m.addedNodes.length>0;})){
      clearTimeout(_db2);_db2=setTimeout(function(){ if(!document.hidden){ inject(); buildDashBtn(); } },250);
    }
  }).observe(document.body,{childList:true,subtree:true});

  /* ── INIT ───────────────────────────────────────────────────── */
  buildLangBtn();
  buildDashBtn();
  applyNav();
  setTimeout(function(){ inject(); buildDashBtn(); generateAllFloorPlans(); },600);

  

  /* ── ENHANCEMENTS: Aldur fix / Realtime / Search / Mobile / Print ─── */

  // 1. Fix "Aldur" column on Geymsla page - show months since last_insp
  function fixGeymslaAge() {
    var rows = document.querySelectorAll('#view-geymsla tbody tr');
    if (!rows.length) return;
    var units = DB.cache.units || [];
    rows.forEach(function(row){
      var fc = row.querySelector('td');
      if (!fc) return;
      var serial = fc.textContent.trim();
      var u = units.find(function(x){ return x.serial === serial; });
      if (!u) return;
      var cells = row.querySelectorAll('td');
      // Aldur is typically second-to-last or a specific position; find the one showing "mán."
      cells.forEach(function(c){
        if (c.textContent.includes('mán.') || c.textContent.trim() === '0 mán.') {
          var since = u.last_insp || u.created_at;
          if (!since) { c.textContent = '—'; return; }
          var months = Math.floor((new Date() - new Date(since)) / (1000*60*60*24*30));
          c.textContent = months + ' mán.';
          c.style.color = months > 24 ? '#dc2626' : months > 12 ? '#d97706' : '#059669';
        }
      });
    });
  }

  // 2. Realtime sync via Supabase subscriptions
  // 2026-05-11: DISABLED — db.js subscribeRealtime now handles this with
  // a debounced + table-aware approach. Running both subscribed the same
  // tables in parallel, multiplying the cost of every DB write.
  function setupRealtime() {
    if (true) return; // disabled — see db.js for canonical subscription
    if (window._rtReady || !DB.sb.channel) return;
    window._rtReady = true;
    ['uttaeki','verkbeidnir','lanstaeki','dagskra','fyrirtaeki'].forEach(function(tbl){
      DB.sb.channel('rt_'+tbl)
        .on('postgres_changes', { event:'*', schema:'public', table:tbl }, function(p){
          console.log('[rt]', tbl, p.eventType);
          // Refresh cache on change
          if (tbl === 'uttaeki') {
            DB.fetchAll(function(from,to){ return DB.sb.from('uttaeki').select('*').order('client').order('id').range(from,to); }).then(function(_rows){  // page through 1000-row cap; sama röðun og loadAll svo cache haldist eins
              DB.cache.units = _rows;
              // Trigger UI refresh
              try { if (App.refreshCurrentView) App.refreshCurrentView(); } catch(e){}
            });
          }
        }).subscribe();
    });
    console.log('[v9] realtime subscriptions active');
  }

  // 3. Search boxes - inject into views
  function injectSearchBoxes() {
    // Geymsla search
    var gv = document.getElementById('view-geymsla');
    if (gv && !gv.querySelector('._slokk_search')) {
      var hdr = gv.querySelector('h1, h2, .view-header, header') || gv.firstChild;
      if (hdr && hdr.parentNode) {
        var inp = document.createElement('input');
        inp.className = '_slokk_search';
        inp.placeholder = 'Leita að raðnúmeri, stað eða viðskiptavini...';
        inp.style.cssText = 'width:100%;max-width:500px;padding:10px 14px;margin:10px 0 16px;border:1.5px solid #e5e7eb;border-radius:9px;font-size:13px;box-sizing:border-box;';
        inp.oninput = function(){
          var q = this.value.toLowerCase();
          gv.querySelectorAll('tbody tr').forEach(function(r){
            r.style.display = r.textContent.toLowerCase().includes(q) ? '' : 'none';
          });
        };
        hdr.parentNode.insertBefore(inp, hdr.nextSibling);
      }
    }
    // Þjónustutæki search
    var tv = document.getElementById('view-field') || document.getElementById('view-uttaeki');
    if (tv && !tv.querySelector('._slokk_search')) {
      var hdr2 = tv.querySelector('h1, h2, .view-header, header') || tv.firstChild;
      if (hdr2 && hdr2.parentNode) {
        var inp2 = document.createElement('input');
        inp2.className = '_slokk_search';
        inp2.placeholder = 'Leita að raðnúmeri, tegund, stað...';
        inp2.style.cssText = 'width:100%;max-width:500px;padding:10px 14px;margin:10px 0 16px;border:1.5px solid #e5e7eb;border-radius:9px;font-size:13px;box-sizing:border-box;';
        inp2.oninput = function(){
          var q = this.value.toLowerCase();
          tv.querySelectorAll('tbody tr').forEach(function(r){
            r.style.display = r.textContent.toLowerCase().includes(q) ? '' : 'none';
          });
        };
        hdr2.parentNode.insertBefore(inp2, hdr2.nextSibling);
      }
    }
  }

  // 4. Mobile hamburger menu - toggle sidebar on small screens
  function setupMobileNav() {
    if (document.getElementById('_slokk_hamb')) return;
    if (window.innerWidth > 768) return;
    var btn = document.createElement('button');
    btn.id = '_slokk_hamb';
    btn.innerHTML = '☰';
    btn.style.cssText = 'position:fixed;top:12px;left:12px;z-index:8000;width:40px;height:40px;background:#1a1f2e;color:#fff;border:none;border-radius:8px;font-size:22px;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.3);';
    btn.onclick = function(){
      var nav = document.querySelector('.view-nav');
      if (!nav) return;
      var cur = getComputedStyle(nav).transform;
      if (cur === 'matrix(1, 0, 0, 1, -260, 0)' || nav.style.transform === 'translateX(-260px)') {
        nav.style.transform = 'translateX(0)';
      } else {
        nav.style.transform = 'translateX(-260px)';
      }
    };
    document.body.appendChild(btn);
    // Inject mobile CSS
    var st = document.createElement('style');
    st.textContent = '@media(max-width:768px){.view-nav{position:fixed;top:0;left:0;height:100vh;z-index:7999;transition:transform .25s;box-shadow:4px 0 12px rgba(0,0,0,.2);}.view-main{margin-left:0!important;padding-left:12px!important;padding-top:60px!important;}#_slokk_langbtn{bottom:12px!important;right:12px!important;left:auto!important;}}';
    document.head.appendChild(st);
  }

  // 5. Print dashboard button
  function addPrintBtn() {
    var modal = document.getElementById('_dash_modal');
    if (!modal || document.getElementById('_dash_print')) return;
    var close = document.getElementById('_dash_close');
    if (!close) return;
    var btn = document.createElement('button');
    btn.id = '_dash_print';
    btn.innerHTML = '🖨️ Prenta';
    btn.style.cssText = 'border:none;background:#2563eb;color:#fff;border-radius:10px;padding:7px 14px;font-size:13px;font-weight:600;cursor:pointer;margin-right:8px;';
    btn.onclick = function(){
      var c = modal.querySelector('div');
      if (!c) return;
      var w = window.open('','_blank','width=900,height=700');
      w.document.write('<html><head><title>Yfirlit - Slökkvitæki ehf</title><style>body{font-family:system-ui,sans-serif;padding:30px;color:#111;} h2{margin-top:0;} @media print{button{display:none;}}</style></head><body>');
      w.document.write(c.innerHTML.replace(/id="_dash_close"/,'style="display:none"').replace(/id="_dash_print"/,'style="display:none"'));
      w.document.write('<script>setTimeout(function(){window.print();},400);<\/script></body></html>');
      w.document.close();
    };
    close.parentNode.insertBefore(btn, close);
  }

  // 6. Kennitala display in company detail
  function showKennitala() {
    if (!window.Companies || !Companies.currentId) return;
    var cm = document.getElementById('companies-main');
    if (!cm) return;
    if (cm.querySelector('._slokk_kt')) return;
    DB.sb.from('fyrirtaeki').select('kennitala').eq('id', Companies.currentId).single().then(function(r){
      if (!r.data || !r.data.kennitala) return;
      var h1 = cm.querySelector('h1, h2');
      if (!h1) return;
      var span = document.createElement('div');
      span.className = '_slokk_kt';
      span.style.cssText = 'font-size:12px;color:#888;margin-top:4px;';
      span.textContent = 'Kennitala: '+r.data.kennitala;
      h1.parentNode.insertBefore(span, h1.nextSibling);
    });
  }

  // Run all on interval (skip while the tab/screen is backgrounded)
  setInterval(function(){
    if(document.hidden) return;
    fixGeymslaAge();
    injectSearchBoxes();
    setupMobileNav();
    addPrintBtn();
    showKennitala();
  }, 3000);
  setTimeout(setupRealtime, 1500);

  console.log('[v9] ready + enhancements | lang:',_lang);
})();
