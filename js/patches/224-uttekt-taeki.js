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
    var bulk = '<div class="ut-bulk'+(n?' show':'')+'">'+
      '<span class="ut-bulk-cnt">'+n+' valin</span>'+
      '<button class="ut-bulk-act" data-bulk="yfirferd" data-co="'+coId+'">Allt → Yfirferð</button>'+
      '<button class="ut-bulk-act" data-bulk="hledsla" data-co="'+coId+'">Allt → Hleðsla</button>'+
      '<button class="ut-bulk-act" data-bulk="onytt" data-co="'+coId+'">🚫 Ónýtt</button>'+
      '<button class="ut-bulk-clear" data-co="'+coId+'" title="Hætta við val">✕</button>'+
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
    return bulk + head + body;
  }

  window.UttektTaeki = {
    buildHtml: function(coId, units){ return '<div class="ut-list" data-uw-co="'+coId+'">'+inner(coId, units)+'</div>'; },
    rerender: function(coId){
      var wrap = document.querySelector('.ut-list[data-uw-co="'+coId+'"]'); if(!wrap) return;
      var c = window.Companies && Companies.list && Companies.list.find(function(x){return x.id==coId;}); if(!c) return;
      wrap.innerHTML = inner(coId, DB.cache.units.filter(function(u){return u.client===c.nafn;}));
    }
  };

  function unitsFor(coId){ var c=Companies.list.find(function(x){return x.id==coId;}); return c?DB.cache.units.filter(function(u){return u.client===c.nafn;}):[]; }
  function recompute(){ try{ if(window.recomputeCompanyTotalCost) recomputeCompanyTotalCost(); }catch(_){} }

  document.addEventListener('click', function(e){
    var b;
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
    if((b=e.target.closest('.ut-bulk-clear'))){ _sel={}; UttektTaeki.rerender(+b.dataset.co); return; }
    if((b=e.target.closest('.ut-grp-h'))){ _collapsed[b.dataset.k]=!_collapsed[b.dataset.k]; UttektTaeki.rerender(+b.dataset.co); return; }
  });

  if (!document.getElementById('uttekt-taeki-css')) {
    var css = [
      '.ut-list{background:var(--surface);border:1px solid var(--brd);border-radius:12px;overflow:hidden;margin-bottom:14px}',
      /* two-column layout: tæki left, cost calculator right */
      '.uttekt-cols{display:flex;gap:16px;align-items:flex-start}',
      '.uttekt-col-l{flex:1;min-width:0}',
      '.uttekt-col-r{flex:0 0 440px;max-width:440px;min-width:0}',
      '#_ctc-section{margin:0 !important}',
      '.uttekt-col-r #_ctc-section table{font-size:11px}',
      '@media(max-width:1080px){.uttekt-cols{flex-direction:column}.uttekt-col-r{flex:1 1 auto;max-width:none;width:100%}}',
      '.ut-bulk{display:none;align-items:center;gap:8px;flex-wrap:wrap;padding:10px 15px;background:var(--ink1);color:#fff}',
      '.ut-bulk.show{display:flex}',
      '.ut-bulk-cnt{font-weight:800;font-size:13px}',
      '.ut-bulk-act{border:1px solid rgba(255,255,255,.25);background:rgba(255,255,255,.12);color:#fff;border-radius:8px;padding:6px 11px;font:inherit;font-size:12px;font-weight:700;cursor:pointer}',
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
      '.ut-svc.on{background:var(--brand);color:#fff}',
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
