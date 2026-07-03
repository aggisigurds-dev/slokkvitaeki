/* 224-uttekt-taeki.js — Stage 2 of the v6 design: the tæki list on the company
 * page as the v6 two-column rows (last report vs current service), grouped
 * collapsibly by type, with multi-select.
 *
 * Row order (per Agnar): icon · name/sub · "Frá síðustu skýrslur" chip │
 *   ✓ (skrá skoðun) · current-service segmented · 🚫 Ónýtt │ ▦ QR · ☑ velja(far right)
 *
 * Reuses ALL existing billing logic:
 *   • current service choice → window.UnitServicePicker.getChoice/setChoice
 *   • cost recompute         → window.recomputeCompanyTotalCost()
 *   • inspect / QR           → Field.openInspect / Print.showQR (DB.getUnit)
 * Companies.openDetail calls UttektTaeki.buildHtml(coId, units) instead of the
 * old <table> (falls back to it if this patch is absent). Patch 131's
 * <select>-into-table injection no-ops (no table); its API stays in use.
 */
(function () {
  if (window.UttektTaeki) return;

  function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g,function(c){return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c];}); }
  function fd(d){ try { return (window.U&&U.fd)?U.fd(d):''; } catch(_){ return ''; } }
  var CUR = new Date().getFullYear();

  var FAM = { duft:['🧯','Duft'], lettv:['💧','Léttvatn'], co2:['❄️','CO₂'],
              slanga:['🚒','Brunaslöngur'], reyk:['🚨','Reykskynjarar'], annad:['⚙️','Annað'] };
  var FAMORDER = ['duft','lettv','co2','slanga','reyk','annad'];
  function fam(type){
    var t=(type||'').toLowerCase();
    if(/duft|abc|pfc/.test(t)) return 'duft';
    if(/co2|co₂|kolsýr|kolsyr/.test(t)) return 'co2';
    if(/léttv|lettv|abf|vatn|water|froð|frod/.test(t)) return 'lettv';
    if(/brunaslang|brunaslöng|brunaslong|hose|slang/.test(t)) return 'slanga';
    if(/reykskynj|smoke|reyk/.test(t)) return 'reyk';
    return 'annad';
  }
  var SVC = [['yfirferd','Yfirferð'],['hledsla','Hleðsla'],['nyitt','Nýtt']];

  var _collapsed = {};   // coId+'|'+fam -> true
  var _sel = {};         // unitId -> true  (multi-select)
  var _done = {};        // unitId -> true  (yfirfarið toggle, this round)
  var _bulkDate = '';    // remembered date in the bulk "Uppfæra dags" picker

  // ── bulk QR print (selected units' real serials) ──────────────────────────
  function ensureQR(cb){
    if(window.QRCode){ cb(); return; }
    var s=document.createElement('script');
    s.src='https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js';
    s.onload=cb; s.onerror=function(){ alert('Gat ekki hlaðið QR-einingu (net?)'); };
    document.head.appendChild(s);
  }
  function qrPNG(text){
    var d=document.createElement('div');
    new QRCode(d,{text:String(text),width:200,height:200,correctLevel:QRCode.CorrectLevel.M});
    var cv=d.querySelector('canvas'), img=d.querySelector('img');
    return cv?cv.toDataURL('image/png'):(img?img.src:'');
  }
  function bulkPrintQR(uns){
    if(!uns.length) return;
    ensureQR(function(){
      var win=window.open('','qrbulk','width=900,height=1100');
      if(!win){ alert('Leyfðu sprettiglugga til að prenta QR-miða.'); return; }
      var cells=uns.map(function(u){
        return '<div style="display:inline-flex;flex-direction:column;align-items:center;border:1px dashed #aaa;border-radius:4px;padding:4mm 2mm;margin:2mm;width:42mm;break-inside:avoid">'+
          '<img src="'+qrPNG(u.serial)+'" style="width:36mm;height:36mm">'+
          '<div style="font-family:monospace;font-size:8pt;font-weight:700;margin-top:1mm">'+esc(u.serial||'')+'</div>'+
          '<div style="font-size:7pt;color:#555">'+esc((u.type||'')+(u.size?(' '+u.size):''))+'</div>'+
        '</div>';
      }).join('');
      win.document.write('<!DOCTYPE html><html><head><meta charset="utf-8"><title>QR miðar</title></head>'+
        '<body style="font-family:Arial;margin:8mm" onload="setTimeout(function(){window.print();},500)">'+
        '<div style="display:flex;flex-wrap:wrap">'+cells+'</div></body></html>');
      win.document.close();
    });
  }

  function getChoice(coId,u){ try{ return window.UnitServicePicker ? UnitServicePicker.getChoice(coId,u.id,u.type) : 'yfirferd'; }catch(_){ return 'yfirferd'; } }

  function lastChip(u){
    var y = u.last_insp ? parseInt(String(u.last_insp).slice(0,4),10) : 0;
    if(!y) return '<span class="ut-last none">Ný / óskoðuð</span>';
    // best-effort last-service label from the unit status (no per-unit service
    // history is stored): á verkstæði / hleðsla → Hleðsla, else Yfirfarið.
    var s = (u.status||'').toLowerCase();
    var hled = /loan|hle[ðd]sl|verkst|charge/.test(s);
    var lab = hled ? 'Hleðsla' : 'Yfirfarið';
    return '<span class="ut-last'+(hled?' h':'')+(y<CUR-1?' old':'')+'">↺ '+lab+' ’'+String(y).slice(-2)+'</span>';
  }

  function rowHtml(coId, u){
    var f = fam(u.type), cur = getChoice(coId,u), onytt = cur==='onytt', sel = !!_sel[u.id], done = !!_done[u.id];
    var segs = SVC.map(function(s){
      var on = (!onytt && cur===s[0]);
      return '<button class="ut-svc'+(on?' on':'')+'" data-co="'+coId+'" data-uid="'+u.id+'" data-v="'+s[0]+'">'+s[1]+'</button>';
    }).join('');
    return '<div class="ut-row'+(onytt?' onytt':'')+(sel?' sel':'')+'">'+
      '<input type="checkbox" class="ut-chk" data-co="'+coId+'" data-uid="'+u.id+'"'+(sel?' checked':'')+' title="Velja">'+
      '<div class="ut-ico '+f+'">'+FAM[f][0]+'</div>'+
      '<div class="ut-main"><div class="ut-t">'+esc(u.type)+(u.size?' '+esc(u.size):'')+'</div>'+
        '<div class="ut-sub">'+esc(u.serial||'')+(u.next_insp?' · næsta '+fd(u.next_insp):'')+'</div></div>'+
      '<div class="ut-right">'+
        '<div class="ut-lastcol">'+lastChip(u)+'</div>'+
        '<div class="ut-now">'+
          '<button class="ut-check'+(done?' on':'')+'" data-co="'+coId+'" data-uid="'+u.id+'" title="Merkja yfirfarið">✓</button>'+
          '<div class="ut-svcseg">'+segs+'</div>'+
          '<button class="ut-onytt'+(onytt?' on':'')+'" data-co="'+coId+'" data-uid="'+u.id+'" data-ty="'+esc(u.type)+'" title="Merkja ónýtt — ekki rukkað">🚫</button>'+
        '</div>'+
        '<div class="ut-far">'+
          '<button class="ut-act" onclick="Print.showQR(DB.getUnit('+u.id+'))" title="Prenta QR-miða">▦</button>'+
        '</div>'+
      '</div>'+
    '</div>';
  }

  function inner(coId, units){
    var n = units.filter(function(u){return _sel[u.id];}).length;
    var allSel = units.length>0 && n===units.length;
    // Bulk bar is ALWAYS visible (so "Velja allt" works on mobile too); the
    // actions appear once something is selected.
    var bulk = '<div class="ut-bulk show">'+
      '<button class="ut-selall" data-co="'+coId+'">'+(allSel?'☑ Hreinsa val':'☑ Velja allt')+'</button>'+
      '<span class="ut-bulk-cnt">'+n+' valin</span>'+
      (n ? (
        '<button class="ut-bulk-act" data-bulk="yfirferd" data-co="'+coId+'">→ Yfirferð</button>'+
        '<button class="ut-bulk-act" data-bulk="hledsla" data-co="'+coId+'">→ Hleðsla</button>'+
        '<button class="ut-bulk-act" data-bulk="onytt" data-co="'+coId+'">🚫 Ónýtt</button>'+
        '<button class="ut-bulk-size" data-co="'+coId+'" title="Breyta stærð á völdum tækjum (t.d. 6-9 ltr → 6 ltr)">📏 Breyta stærð</button>'+
        '<input type="date" class="ut-bulk-date" value="'+(_bulkDate||'')+'" title="Næsta skoðun">'+
        '<button class="ut-bulk-dateset" data-co="'+coId+'">🗓 Uppfæra dags</button>'+
        '<button class="ut-bulk-qr" data-co="'+coId+'">▦ Prenta QR</button>'+
        '<button class="ut-bulk-del" data-co="'+coId+'" title="Eyða völdum tækjum">🗑 Eyða</button>'+
        '<button class="ut-bulk-clear" data-co="'+coId+'" title="Hætta við val">✕</button>'
      ) : '')+
    '</div>';
    var groups = {};
    units.forEach(function(u){ var f=fam(u.type); (groups[f]=groups[f]||[]).push(u); });
    var head = '<div class="ut-head"><span class="sp"></span><span class="h-last">Frá síðustu skýrslur</span><span class="h-now">Þessi skoðun</span><span class="h-far"></span></div>';
    var body = '';
    FAMORDER.forEach(function(f){
      var arr = groups[f]; if(!arr||!arr.length) return;
      var key = coId+'|'+f, col = !!_collapsed[key];
      var selN = arr.filter(function(u){return _sel[u.id];}).length;
      body += '<div class="ut-grp">'+
        '<button class="ut-grp-h" data-k="'+key+'" data-co="'+coId+'">'+
          '<span class="ut-ico '+f+'" style="width:26px;height:26px;font-size:14px">'+FAM[f][0]+'</span>'+
          '<span class="ut-grp-nm">'+FAM[f][1]+'</span>'+
          '<span class="ut-grp-cnt">'+arr.length+' tæki'+(selN?' · '+selN+' valin':'')+'</span>'+
          '<span class="ut-grp-chev">'+(col?'▸':'▾')+'</span>'+
        '</button>'+
        (col?'':'<div class="ut-grp-body">'+arr.map(function(u){return rowHtml(coId,u);}).join('')+'</div>')+
      '</div>';
    });
    var locked = isUtLocked(coId);
    var lock = '<button class="ut-listlock'+(locked?' on':'')+'" data-co="'+coId+'" type="button">'+(locked?'🔒 Listi staðfestur — smelltu til að opna':'✅ Staðfesta lista')+'</button>';
    return bulk + head + body + lock;
  }

  window.UttektTaeki = {
    buildHtml: function(coId, units){ return '<div class="ut-list'+(isUtLocked(coId)?' locked':'')+'" data-uw-co="'+coId+'">'+inner(coId, units)+'</div>'; },
    rerender: function(coId){
      var wrap = document.querySelector('.ut-list[data-uw-co="'+coId+'"]'); if(!wrap) return;
      var c = window.Companies && Companies.list && Companies.list.find(function(x){return x.id==coId;}); if(!c) return;
      wrap.innerHTML = inner(coId, DB.cache.units.filter(function(u){return u.client===c.nafn;}));
    }
  };

  function isUtLocked(coId){ try{ return localStorage.getItem('sk_ut_lock_'+coId)==='1'; }catch(_){ return false; } }
  (function(){ if(document.getElementById('sk-utlock-css'))return; var s=document.createElement('style'); s.id='sk-utlock-css';
    s.textContent='.ut-listlock{display:block;width:100%;margin-top:12px;padding:13px;border-radius:12px;border:1px solid #c7ccd3;background:#eef1f4;color:#2b313a;font-weight:800;font-size:15px;font-family:inherit;cursor:pointer}'
      +'.ut-listlock.on{background:linear-gradient(180deg,#2f5d3f,#173524);color:#daffe8;border-color:#0e2417;box-shadow:inset 0 1px 0 rgba(255,255,255,.18),0 2px 6px rgba(0,0,0,.25)}'
      +'.ut-list.locked .ut-svc,.ut-list.locked .ut-onytt,.ut-list.locked .ut-check,.ut-list.locked .ut-chk,.ut-list.locked .ut-selall,.ut-list.locked .ut-bulk-act,.ut-list.locked .ut-bulk-size,.ut-list.locked .ut-bulk-date,.ut-list.locked .ut-bulk-dateset,.ut-list.locked .ut-bulk-qr,.ut-list.locked .ut-bulk-del,.ut-list.locked .ut-bulk-clear,.ut-list.locked .ut-grp-h{pointer-events:none;opacity:.5}';
    document.head.appendChild(s); })();
  function unitsFor(coId){ var c=Companies.list.find(function(x){return x.id==coId;}); return c?DB.cache.units.filter(function(u){return u.client===c.nafn;}):[]; }
  function recompute(){ try{ if(window.recomputeCompanyTotalCost) recomputeCompanyTotalCost(); }catch(_){} }

  document.addEventListener('click', function(e){
    var b;
    if((b=e.target.closest('.ut-listlock'))){
      var lco=+b.dataset.co, k='sk_ut_lock_'+lco, on=false;
      try{ on=localStorage.getItem(k)==='1'; }catch(_){}
      try{ on?localStorage.removeItem(k):localStorage.setItem(k,'1'); }catch(_){}
      var w=document.querySelector('.ut-list[data-uw-co="'+lco+'"]'); if(w) w.classList.toggle('locked', !on);
      UttektTaeki.rerender(lco); return;
    }
    if((b=e.target.closest('.ut-svc'))){
      try{ UnitServicePicker.setChoice(+b.dataset.co,+b.dataset.uid,b.dataset.v); }catch(_){}
      recompute(); UttektTaeki.rerender(+b.dataset.co); return;
    }
    if((b=e.target.closest('.ut-onytt'))){
      var co=+b.dataset.co, uid=+b.dataset.uid, cur='';
      try{ cur=UnitServicePicker.getChoice(co,uid,b.dataset.ty); }catch(_){}
      try{ UnitServicePicker.setChoice(co,uid, cur==='onytt'?'yfirferd':'onytt'); }catch(_){}
      recompute(); UttektTaeki.rerender(co); return;
    }
    if((b=e.target.closest('.ut-check'))){
      var duid=+b.dataset.uid, dco=+b.dataset.co;
      if(_done[duid]) delete _done[duid]; else _done[duid]=true;
      UttektTaeki.rerender(dco); return;
    }
    if(e.target.classList && e.target.classList.contains('ut-chk')){
      var cuid=+e.target.dataset.uid, cco=+e.target.dataset.co;
      if(e.target.checked) _sel[cuid]=true; else delete _sel[cuid];
      UttektTaeki.rerender(cco); return;
    }
    if((b=e.target.closest('.ut-bulk-act'))){
      var bco=+b.dataset.co, v=b.dataset.bulk;
      unitsFor(bco).forEach(function(u){ if(_sel[u.id]){ try{UnitServicePicker.setChoice(bco,u.id,v);}catch(_){} } });
      recompute(); UttektTaeki.rerender(bco); return;
    }
    if((b=e.target.closest('.ut-selall'))){
      var sco=+b.dataset.co; var us=unitsFor(sco);
      var allSel=us.length>0 && us.every(function(u){return _sel[u.id];});
      if(allSel){ us.forEach(function(u){ delete _sel[u.id]; }); }
      else { us.forEach(function(u){ _sel[u.id]=true; }); }
      UttektTaeki.rerender(sco); return;
    }
    if(e.target.classList && e.target.classList.contains('ut-bulk-date')){ _bulkDate=e.target.value; return; }
    if((b=e.target.closest('.ut-bulk-dateset'))){
      var nco=+b.dataset.co;
      var di=document.querySelector('.ut-bulk-date'); var nd=(di&&di.value)||_bulkDate;
      if(!nd){ alert('Veldu dagsetningu fyrst.'); return; }
      var nids=unitsFor(nco).filter(function(u){return _sel[u.id];}).map(function(u){return u.id;});
      if(!nids.length) return;
      (async function(){
        try{
          var sb=(window.DB&&DB.sb); if(!sb) throw new Error('Engin tenging');
          var r=await sb.from('uttaeki').update({next_insp:nd}).in('id', nids);
          if(r.error) throw r.error;
          if(window.DB&&DB.cache&&DB.cache.units){ DB.cache.units.forEach(function(u){ if(nids.indexOf(u.id)>=0) u.next_insp=nd; }); }
          UttektTaeki.rerender(nco);
          if(window.Toast&&Toast.show) Toast.show('🗓 Næsta skoðun uppfærð á '+nids.length+' tækjum');
        }catch(err){ alert('Villa: '+(err.message||err)); }
      })();
      return;
    }
    if((b=e.target.closest('.ut-bulk-size'))){
      var zco=+b.dataset.co;
      var zunits=unitsFor(zco).filter(function(u){return _sel[u.id];});
      if(!zunits.length) return;
      // Forfylla með núverandi stærð ef öll völdu tækin deila einni (annars autt).
      var zsizes={}; zunits.forEach(function(u){ zsizes[(u.size||'').trim()]=1; });
      var zcur=Object.keys(zsizes).length===1?Object.keys(zsizes)[0]:'';
      var nz=window.prompt('Ný stærð fyrir '+zunits.length+' valin tæki (t.d. „6 ltr"):', zcur);
      if(nz==null) return;                 // hætt við
      nz=String(nz).trim();
      var zids=zunits.map(function(u){return u.id;});
      (async function(){
        try{
          var sb=(window.DB&&DB.sb); if(!sb) throw new Error('Engin tenging');
          var r=await sb.from('uttaeki').update({size:nz}).in('id', zids);
          if(r.error) throw r.error;
          if(window.DB&&DB.cache&&DB.cache.units){ DB.cache.units.forEach(function(u){ if(zids.indexOf(u.id)>=0) u.size=nz; }); }
          UttektTaeki.rerender(zco);
          recompute();
          if(window.Toast&&Toast.show) Toast.show('📏 Stærð uppfærð á '+zids.length+' tækjum'+(nz?(' → '+nz):''));
        }catch(err){ alert('Villa: '+(err.message||err)); }
      })();
      return;
    }
    if((b=e.target.closest('.ut-bulk-qr'))){
      var qco=+b.dataset.co;
      var qus=unitsFor(qco).filter(function(u){return _sel[u.id];});
      if(qus.length) bulkPrintQR(qus);
      return;
    }
    if((b=e.target.closest('.ut-bulk-del'))){
      var dco=+b.dataset.co;
      var ids=unitsFor(dco).filter(function(u){return _sel[u.id];}).map(function(u){return u.id;});
      if(!ids.length) return;
      (async function(){
        var ok=(window.Confirm&&Confirm.show)?await Confirm.show('Eyða '+ids.length+' völdum tækjum? Þetta er ekki afturkræft.'):window.confirm('Eyða '+ids.length+' völdum tækjum?');
        if(!ok) return;
        try{
          var sb=(window.DB&&DB.sb); if(!sb) throw new Error('Engin tenging');
          // 2026-06-24: uttaeki.id is referenced by taeki_events.unit_id +
          // skodunar_saga.unit_id (FK, no cascade) — a bare delete throws
          // "violates foreign key constraint". Clear the children first (same
          // fix as the legacy per-company bulk delete in patch 00).
          var _childRes=await Promise.all([
            sb.from('taeki_events').delete().in('unit_id', ids),
            sb.from('skodunar_saga').delete().in('unit_id', ids)
          ]);
          var _childErr=_childRes.find(function(x){return x&&x.error;});
          if(_childErr) throw _childErr.error;
          var r=await sb.from('uttaeki').delete().in('id', ids);
          if(r.error) throw r.error;
          if(window.DB&&DB.cache&&DB.cache.units){ DB.cache.units=DB.cache.units.filter(function(u){return ids.indexOf(u.id)<0;}); }
          ids.forEach(function(id){ delete _sel[id]; delete _done[id]; });
          UttektTaeki.rerender(dco);
          try{ if(window.recomputeCompanyTotalCost) recomputeCompanyTotalCost(); }catch(_){}
          if(window.Toast&&Toast.show) Toast.show('🗑 '+ids.length+' tæki eytt');
        }catch(err){ alert('Villa við eyðingu: '+(err.message||err)); }
      })();
      return;
    }
    if((b=e.target.closest('.ut-bulk-clear'))){ _sel={}; UttektTaeki.rerender(+b.dataset.co); return; }
    if((b=e.target.closest('.ut-grp-h'))){ _collapsed[b.dataset.k]=!_collapsed[b.dataset.k]; UttektTaeki.rerender(+b.dataset.co); return; }
  });
  // Remember the bulk date across re-renders.
  document.addEventListener('change', function(e){
    if(e.target && e.target.classList && e.target.classList.contains('ut-bulk-date')) _bulkDate=e.target.value;
  });

  if (!document.getElementById('uttekt-taeki-css')) {
    var css = [
      /* Stál-grái stigullinn á ALLAR .view-síður. Tvær lög:
         1) almenn regla með „html body div.view[id^=view-]" — sértækni (0,2,3)
            slær báða þema-keppinauta (patch 229 og 230, báðar 0,2,1).
         2) ID-fallback fyrir dynamic views sem aðrir patches setja á (þjónustu-
            verkstæði var dökk eftir merge þrátt fyrir id^=view-). ID gefur (1,1,0). */
      'html body div.view[id^="view-"]{background:linear-gradient(180deg,#060607 0px,#060607 90px,#aeb4be 160px,#aeb4be 45%,#7b828d 100%)!important}',
      'html body #view-thjonustu-verkstaedi.view,'+
      'html body #view-bokhalds-yfirlit.view,'+
      'html body #view-thjonustuverk.view,'+
      'html body #view-beidnir.view,'+
      'html body #view-verkbord.view,'+
      'html body #view-bakendi.view,'+
      'html body #view-utlit.view,'+
      'html body #view-tilbod.view,'+
      'html body #view-vertid.view,'+
      'html body #view-vsk-report.view,'+
      'html body #view-bokhald-yfirferd.view,'+
      'html body #view-kerfi.view,'+
      'html body #view-vidsk-detail.view,'+
      'html body #view-hreyfingarlisti.view'+
        '{background:linear-gradient(180deg,#060607 0px,#060607 90px,#aeb4be 160px,#aeb4be 45%,#7b828d 100%)!important}',
      'html body [id^="view-"]>.main-panel{background:transparent!important}',
      /* 2026-06-28: text-on-gradient contrast fix.
         The gradient is BLACK 0→95 px then medium-grey 200 px+. Page titles
         were rendered as direct children of `.main-panel` using --ink1 (dark
         navy) → black-on-black on the dark band. Subtitles use --ink3
         (#8891a0) → invisible on grey. Catch the common page-header
         patterns and light them up. White cards INSIDE the view keep their
         own dark text — these selectors don't reach into cards because
         every patch's card uses a class (`card`, `tile`, `vb-row`,
         `ut-list`, …) or an inline `background:#fff` that we sidestep. */

      /* page TITLES — light on the dark band */
      'html body div.view[id^="view-"] main.main-panel > div > h1,'+
      'html body div.view[id^="view-"] main.main-panel > div > div > h1,'+
      'html body div.view[id^="view-"] main.main-panel > div > div > div > h1,'+
      'html body div.view[id^="view-"] main.main-panel > div > div:first-child > div[style*="font-size:19px"],'+
      'html body div.view[id^="view-"] main.main-panel > div > div:first-child > div[style*="font-size:21px"],'+
      'html body div.view[id^="view-"] main.main-panel > div > div:first-child > div[style*="font-size:22px"],'+
      'html body div.view[id^="view-"] main.main-panel > div:first-child > div:first-child > div[style*="font-size:19px"],'+
      'html body div.view[id^="view-"] main.main-panel > div > div > h2,'+
      'html body div.view[id^="view-"] > .bw-page-hdr,'+
      'html body div.view[id^="view-"] > .bw-page-hdr .bw-page-h1,'+
      'html body div.view[id^="view-"] > .bw-page-hdr .bw-page-sub,'+
      'html body div.view[id^="view-"] > .bw-page-hdr .bw-page-sub b,'+
      'html body div.view[id^="view-"] main.main-panel > div > div > .bw-page-h1,'+
      'html body div.view[id^="view-"] main.main-panel > div ._ars-sub'+
        '{color:#f5f5f7!important}',

      /* subtitle pattern: `<div style="font-size:13px;color:var(--ink3)">…</div>` */
      'html body div.view[id^="view-"] main.main-panel > div > div:first-child > div[style*="color:var(--ink3)"],'+
      'html body div.view[id^="view-"] main.main-panel > div > div > div[style*="color:var(--ink3)"]'+
        '{color:#d0d4da!important}',

      /* 2026-06-28 round 2: UPPERCASE LABELS sitting on the gradient
         (e.g. "STAÐA:", "KORT:", "MÁNUÐUR:") use --ink3 / #94a3b8 with
         text-transform:uppercase — wash out on grey. Force dark slate
         so they read on the medium-grey #9ba1ad body (light/Brunastál).
         Round-3 (2026-06-28): in DARK themes the gradient is still grey
         but the surrounding `.view` gets a dark overlay from patch 229
         (radial-gradient backdrop) — slate-700 starts to fight that.
         Override with a light slate in dark presets so it reads either
         way. */
      'html body div.view[id^="view-"] main.main-panel [style*="text-transform:uppercase"][style*="color:var(--ink3)"],'+
      'html body div.view[id^="view-"] main.main-panel [style*="text-transform:uppercase"][style*="color:#94a3b8"],'+
      'html body div.view[id^="view-"] > .bw-page-hdr [style*="text-transform:uppercase"]'+
        '{color:#1e293b!important}',
      'html[data-thm-dark="1"] body div.view[id^="view-"] main.main-panel [style*="text-transform:uppercase"][style*="color:var(--ink3)"],'+
      'html[data-thm-dark="1"] body div.view[id^="view-"] main.main-panel [style*="text-transform:uppercase"][style*="color:#94a3b8"],'+
      'html[data-thm-dark="1"] body div.view[id^="view-"] > .bw-page-hdr [style*="text-transform:uppercase"]'+
        '{color:#cbd5e1!important}',

      /* Empty-state pattern (Engin fyrirtæki / Engin tæki / …) — light
         themes use slate-700 so it shows on the grey gradient body;
         dark themes flip to slate-300 so it shows on the dark backdrop. */
      'html body div.view[id^="view-"] .empty-state,'+
      'html body div.view[id^="view-"] .empty-state .es-sub,'+
      'html body div.view[id^="view-"] .empty-state .es-title'+
        '{color:#1e293b!important}',
      'html[data-thm-dark="1"] body div.view[id^="view-"] .empty-state,'+
      'html[data-thm-dark="1"] body div.view[id^="view-"] .empty-state .es-sub,'+
      'html[data-thm-dark="1"] body div.view[id^="view-"] .empty-state .es-title'+
        '{color:#cbd5e1!important}',
      /* Same idea for the verkbord empty-state class (#view-verkbord .vb-empty)
         and its hint: round-2 hard-coded #1e293b which becomes invisible in
         dark themes. Flip to slate-300 there. */
      'html[data-thm-dark="1"] #view-verkbord .vb-empty,'+
      'html[data-thm-dark="1"] #view-verkbord .vb-hint{color:#cbd5e1!important}',
      '.ut-list{background:var(--surface);border:1px solid var(--brd);border-radius:12px;overflow:hidden;margin-bottom:14px}',
      /* two-column layout: tæki left, cost calculator right */
      '.uttekt-cols{display:flex;gap:16px;align-items:flex-start}',
      '.uttekt-col-l{flex:1;min-width:0}',
      '.uttekt-col-r{flex:0 0 560px;max-width:560px;min-width:0}',
      '#_ctc-section{margin:0 !important}',
      '.uttekt-col-r #_ctc-section table{font-size:12px}',
      /* aðeins meira loft í dálkum nú þegar hægri-spjaldið er 560px — Tegund/Stærð
         þarf ekki að línast í 3 línur lengur */
      '.uttekt-col-r #_ctc-section table th,.uttekt-col-r #_ctc-section table td{padding:8px 10px !important}',
      '@media(max-width:1240px){.uttekt-cols{flex-direction:column}.uttekt-col-r{flex:1 1 auto;max-width:none;width:100%}}',
      '.ut-bulk{display:none;align-items:center;gap:8px;flex-wrap:wrap;padding:10px 15px;background:var(--ink1);color:#fff}',
      '.ut-bulk.show{display:flex}',
      '.ut-bulk-cnt{font-weight:800;font-size:13px}',
      '.ut-bulk-act{border:1px solid rgba(255,255,255,.25);background:rgba(255,255,255,.12);color:#fff;border-radius:8px;padding:6px 11px;font:inherit;font-size:12px;font-weight:700;cursor:pointer}',
      '.ut-selall{border:1px solid rgba(255,255,255,.35);background:rgba(255,255,255,.12);color:#fff;border-radius:8px;padding:6px 11px;font:inherit;font-size:12px;font-weight:700;cursor:pointer}',
      '.ut-bulk-dateset,.ut-bulk-qr,.ut-bulk-size{border:1px solid rgba(255,255,255,.25);background:rgba(255,255,255,.12);color:#fff;border-radius:8px;padding:6px 11px;font:inherit;font-size:12px;font-weight:700;cursor:pointer}',
      '.ut-bulk-date{border:1px solid rgba(255,255,255,.3);background:rgba(255,255,255,.92);color:#0f172a;border-radius:8px;padding:5px 8px;font:inherit;font-size:12px}',
      '.ut-bulk-del{border:1px solid rgba(252,165,165,.6);background:rgba(220,38,38,.25);color:#fff;border-radius:8px;padding:6px 11px;font:inherit;font-size:12px;font-weight:700;cursor:pointer}',
      '.ut-bulk-clear{margin-left:auto;background:transparent;border:0;color:rgba(255,255,255,.7);font-size:16px;cursor:pointer}',
      '.ut-head{display:flex;align-items:center;padding:11px 15px 7px;border-bottom:1px solid var(--brd)}',
      '.ut-head .sp{flex:1}',
      '.ut-head .h-last{width:118px;text-align:right;font-size:9.5px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--ink3)}',
      '.ut-head .h-now{width:252px;margin-left:18px;padding-left:18px;font-size:9.5px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--ink3)}',
      '.ut-head .h-far{width:40px;margin-left:14px}',
      '@media(max-width:860px){.ut-head{display:none}}',
      '.ut-grp-h{width:100%;display:flex;align-items:center;gap:10px;padding:9px 15px;background:var(--bg);border:0;border-top:1px solid var(--brd);cursor:pointer;font:inherit;text-align:left}',
      '.ut-grp:first-child .ut-grp-h{border-top:0}',
      '.ut-grp-nm{font-weight:800;font-size:13.5px;color:var(--ink1)}',
      '.ut-grp-cnt{font-size:11.5px;color:var(--ink3);font-weight:600}',
      '.ut-grp-chev{margin-left:auto;color:var(--ink3);font-size:12px}',
      '.ut-row{display:flex;align-items:center;gap:12px;padding:10px 15px 10px 26px;border-top:1px solid var(--bg)}',
      '.ut-row.sel{background:var(--brand-lt,#eef4ff)}',
      '.ut-row.onytt{opacity:.55}.ut-row.onytt .ut-t{text-decoration:line-through}',
      '.ut-ico{flex:none;width:34px;height:34px;border-radius:9px;display:flex;align-items:center;justify-content:center;font-size:16px}',
      '.ut-ico.duft{background:#fdeecb}.ut-ico.lettv{background:#dbeafe}.ut-ico.co2{background:#e0e7ff}.ut-ico.slanga{background:#fde2dd}.ut-ico.reyk{background:#ede9fe}.ut-ico.annad{background:#eef0f2}',
      '.ut-main{flex:1;min-width:0}.ut-t{font-weight:700;font-size:13.5px;color:var(--ink1)}',
      '.ut-sub{font-size:11.5px;color:var(--ink3);margin-top:1px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '.ut-right{display:flex;align-items:center;flex:none}',
      '.ut-lastcol{width:118px;display:flex;justify-content:flex-end;flex:none}',
      '.ut-last{font-size:11px;font-weight:700;padding:3px 10px;border-radius:99px;white-space:nowrap;background:#eef0f2;color:var(--ink2)}',
      '.ut-last.h{background:#fdeecb;color:#9a5b1a}',
      '.ut-last.old{background:var(--red-bg,#fff0ed);color:var(--red,#c0341d)}',
      '.ut-last.none{background:transparent;color:var(--ink4);font-weight:600}',
      '.ut-now{display:flex;align-items:center;gap:7px;flex:none;width:252px;justify-content:flex-end;margin-left:18px;padding-left:18px;border-left:1px solid var(--brd)}',
      '.ut-svcseg{display:inline-flex;background:var(--bg);border:1px solid var(--brd);border-radius:9px;padding:3px;gap:2px}',
      '.ut-svc{border:0;background:transparent;font:inherit;font-size:11.5px;font-weight:700;color:var(--ink3);padding:5px 10px;border-radius:7px;cursor:pointer;white-space:nowrap}',
      /* 2026-06-25: active service pill — málm-blár, sama litur fyrir Yfirferð /
         Hleðsla / Nýtt (var áður brand-rauður og leit út eins og viðvörun). */
      '.ut-svc.on{background:linear-gradient(180deg,#60a5fa 0%,#2563eb 48%,#1e40af 52%,#1e3a8a 100%)!important;color:#fff!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.32),inset 0 -1px 0 rgba(0,0,0,.35),0 1px 2px rgba(0,0,0,.25);text-shadow:0 1px 1px rgba(0,0,0,.4);border:1px solid #1e3a8a!important}',
      '.ut-onytt{border:1px solid var(--brd);background:var(--surface);color:var(--ink3);border-radius:8px;padding:5px 8px;font-size:13px;cursor:pointer}',
      '.ut-onytt.on{background:var(--red-bg,#fff0ed);color:var(--red,#c0341d);border-color:var(--red-bd,#fca5a5)}',
      '.ut-far{display:flex;align-items:center;margin-left:14px;width:40px;justify-content:flex-end}',
      '.ut-act{border:1px solid var(--brd);background:var(--surface);color:var(--ink2);border-radius:8px;width:30px;height:30px;font-size:13px;cursor:pointer;display:inline-flex;align-items:center;justify-content:center}',
      '.ut-act:hover{border-color:var(--brand);color:var(--brand)}',
      '.ut-check{flex:none;width:40px;height:40px;border-radius:50%;border:2px solid var(--brd);background:var(--surface);color:var(--ink4);font-size:21px;font-weight:800;cursor:pointer;display:inline-flex;align-items:center;justify-content:center}',
      '.ut-check:hover{border-color:var(--grn,#15803d);color:var(--grn,#15803d)}',
      '.ut-check.on{background:var(--grn,#15803d);border-color:var(--grn,#15803d);color:#fff}',
      '.ut-chk{width:18px;height:18px;cursor:pointer;accent-color:var(--brand);flex:none}',
      '@media(max-width:860px){.ut-right{flex-wrap:wrap;justify-content:flex-end;gap:8px}.ut-now,.ut-lastcol,.ut-far{width:auto}.ut-now{border-left:0;margin-left:0;padding-left:0}}'
    ].join('\n');
    var st=document.createElement('style'); st.id='uttekt-taeki-css'; st.textContent=css; document.head.appendChild(st);
  }
  // Relocate the cost calculator (patch 129's #_ctc-notes + #_ctc-section) into
  // the right column slot so the page reads tæki(left) | notes+calculator(right)
  // like the v6 mockup. Both must move — moving only the section stranded the
  // "📝 Upplýsingar um úttekt" notes box at the very bottom of the page.
  function relocateCost(){
    var main=document.getElementById('companies-main'); if(!main) return;
    var slot=main.querySelector('#_ctc-slot'); if(!slot) return;
    var notes=main.querySelector('#_ctc-notes');
    var sec=main.querySelector('#_ctc-section');
    if(notes && notes.parentElement!==slot) slot.appendChild(notes); // notes first
    if(sec && sec.parentElement!==slot) slot.appendChild(sec);       // then the total/table
  }
  (function watchCost(){
    var main=document.getElementById('companies-main');
    if(!main){ setTimeout(watchCost, 700); return; }
    new MutationObserver(function(){ relocateCost(); }).observe(main, { childList:true });
    relocateCost();
  })();

  console.log('[patch-224] tæki-úttekt rows (Stage 2) + cost relocate installed');
})();
