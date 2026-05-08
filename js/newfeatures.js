'use strict';
window.closeFP=function(){var m=document.getElementById('modal-floorplan');if(m){m.style.display='none';m.classList.remove('open');}};
window.showToast=function(msg,err){var t=document.createElement('div');t.textContent=msg;t.style.cssText='position:fixed;bottom:28px;left:50%;transform:translateX(-50%) translateY(16px);background:'+(err?'#dc2626':'#1a7f4b')+';color:white;padding:11px 22px;border-radius:10px;font-size:14px;font-weight:600;z-index:9999;box-shadow:0 4px 20px rgba(0,0,0,.25);opacity:0;transition:all .25s ease;pointer-events:none;white-space:nowrap;';document.body.appendChild(t);requestAnimationFrame(function(){t.style.opacity='1';t.style.transform='translateX(-50%) translateY(0)';});setTimeout(function(){t.style.opacity='0';t.style.transform='translateX(-50%) translateY(12px)';setTimeout(function(){t.remove();},300);},2800);};
window.printUnitQR=function(serial,line1,line2){var svg='';try{var q=qrcode(0,'M');q.addData(serial);q.make();svg=q.createSvgTag({scalable:true,margin:2});svg=svg.replace(/width="[^"]*"/,'width="180"').replace(/height="[^"]*"/,'height="180"');}catch(e){}var w=window.open('','_blank','width=380,height=520');if(!w){showToast('Leyfdu popup til ad prenta',true);return;}w.document.write('<!DOCTYPE html><html><head><meta charset="UTF-8"><title>QR</title><style>body{margin:0;padding:20px;font-family:system-ui,sans-serif;display:flex;flex-direction:column;align-items:center;}.card{border:2.5px solid #1a1f2e;border-radius:12px;padding:16px 20px;text-align:center;width:220px;}.brand{font-size:11px;font-weight:800;color:#c93c1d;letter-spacing:.1em;text-transform:uppercase;margin-bottom:10px;}.serial{font-size:15px;font-weight:700;font-family:monospace;margin:8px 0 4px;}.meta{font-size:11px;color:#8891a0;margin:2px 0;}.sep{border-top:2px dashed #ddd;margin:18px 0 12px;}.pbtn{width:100%;padding:11px;background:#c93c1d;color:white;border:none;border-radius:8px;font-size:15px;font-weight:700;cursor:pointer;}@media print{.sep,.pbtn{display:none!important;}}<\/style><\/head><body><div class="card"><div class="brand">Slokkvitaeki ehf<\/div>'+(svg||'<div style="width:180px;height:180px;background:#f5f5f5;display:flex;align-items:center;justify-content:center;margin:0 auto;font-size:11px;color:#999;">'+serial+'<\/div>')+'<div class="serial">'+serial+'<\/div>'+(line1?'<div class="meta">'+line1+'<\/div>':'')+(line2?'<div class="meta">'+line2+'<\/div>':'')+'<\/div><div class="sep"><\/div><button class="pbtn" onclick="window.print()">Prenta QR<\/button><\/body><\/html>');w.document.close();setTimeout(function(){w.print();},400);};
window.openJobEdit=function(jobId){var job=DB.cache&&DB.cache.jobs&&DB.cache.jobs.find(function(j){return j.id===jobId;});if(!job)return;var old=document.getElementById('_jeM');if(old)old.remove();var m=document.createElement('div');m.id='_jeM';m.className='modal open';m.style.zIndex='2000';var opts=['received:Mottekid','in_progress:I vinnslu','ready:Tilbuid','collected:Sott'].map(function(s){var p=s.split(':');return '<option value="'+p[0]+'"'+(job.status===p[0]||job.stada===p[0]?' selected':'')+'>'+p[1]+'<\/option>';}).join('');m.innerHTML='<div class="modal-box" style="max-width:540px;border-radius:14px;"><div class="modal-hd" style="display:flex;align-items:center;justify-content:space-between;padding:20px 24px 14px;"><div><h2 style="font-size:17px;font-weight:700;margin:0;">Breyta verki<\/h2><div style="font-size:12px;color:var(--ink3,#8891a0);margin-top:2px;">'+(job.nafn||'')+' '+(job.verk_nr?'#'+job.verk_nr:job.num||('#'+job.id))+'<\/div><\/div><button onclick="document.getElementById(&quot;_jeM&quot;).remove()" style="background:#f0f0f2;border:none;border-radius:50%;width:30px;height:30px;font-size:16px;cursor:pointer;">X<\/button><\/div><div style="padding:0 24px 24px;display:flex;flex-direction:column;gap:14px;"><div><label style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--ink3,#8891a0);display:block;margin-bottom:5px;">Athugasemdir<\/label><textarea id="_jeN" rows="4" style="width:100%;border:1px solid var(--brd,#e4e6ea);border-radius:8px;padding:10px 12px;font-size:13px;resize:vertical;font-family:inherit;box-sizing:border-box;">'+(job.notes||job.athugasemdir||'')+'<\/textarea><\/div><div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;"><div><label style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--ink3,#8891a0);display:block;margin-bottom:5px;">Verd (kr)<\/label><input id="_jeP" type="number" value="'+(job.verd||'')+'" style="width:100%;border:1px solid var(--brd,#e4e6ea);border-radius:8px;padding:9px 12px;font-size:14px;box-sizing:border-box;"><\/div><div><label style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--ink3,#8891a0);display:block;margin-bottom:5px;">Stada<\/label><select id="_jeS" style="width:100%;border:1px solid var(--brd,#e4e6ea);border-radius:8px;padding:9px 12px;font-size:13px;background:white;box-sizing:border-box;">'+opts+'<\/select><\/div><\/div><div style="display:flex;justify-content:flex-end;gap:10px;"><button onclick="document.getElementById(&quot;_jeM&quot;).remove()" style="padding:9px 18px;border:1px solid var(--brd,#e4e6ea);border-radius:8px;background:white;cursor:pointer;font-size:13px;">Haetta vid<\/button><button onclick="saveJobEdit(&quot;'+jobId+'&quot;)" style="padding:9px 20px;background:#c93c1d;color:white;border:none;border-radius:8px;font-weight:600;font-size:13px;cursor:pointer;">Vista<\/button><\/div><\/div><\/div>';document.body.appendChild(m);setTimeout(function(){var el=document.getElementById('_jeN');if(el)el.focus();},50);};
window.saveJobEdit=async function(jobId){var notes=document.getElementById('_jeN').value;var price=document.getElementById('_jeP').value;var stat=document.getElementById('_jeS').value;var upd={notes:notes,status:stat};if(price!=='')upd.verd=parseFloat(price)||0;var res=await DB.sb.from('verkbeidnir').update(upd).eq('id',jobId);if(res.error){alert('Villa: '+res.error.message);return;}if(DB.cache&&DB.cache.jobs){var j=DB.cache.jobs.find(function(x){return x.id===jobId;});if(j){j.notes=notes;j.status=stat;if(price!=='' && price!==undefined)j.verd=parseFloat(price)||0;}}document.getElementById('_jeM').remove();showToast('Uppfært ✓');try{Counter.openJob&&Counter.openJob(jobId);}catch(e){}try{Workshop.load&&Workshop.load();}catch(e){}};
setTimeout(function _nfInit(){
if(typeof FloorPlan!=='undefined'){var _oFP=FloorPlan.open.bind(FloorPlan);FloorPlan.open=function(){_oFP.apply(FloorPlan,arguments);setTimeout(function(){var fp=document.getElementById('modal-floorplan');if(!fp)return;fp.querySelectorAll('button').forEach(function(b){if(b.textContent.trim()==='X'||b.classList.contains('modal-x')||b.textContent.trim()==='Loka'){b.onclick=null;b.addEventListener('click',function(e){e.stopPropagation();closeFP();},true);}});fp.onclick=function(e){if(e.target===fp)closeFP();};var wrap=document.getElementById('fp-main');var canvas=document.getElementById('fp-canvas');if(wrap&&canvas&&!wrap._zi){wrap._zi=true;var s=1,px=0,py=0,pan=false,lx=0,ly=0;function ap(){canvas.style.transformOrigin='0 0';canvas.style.transform='translate('+px+'px,'+py+'px) scale('+s+')';}function cl(v,a,b){return Math.min(b,Math.max(a,v));}function upd(){var b=document.getElementById('_fzb');if(b)b.textContent=Math.round(s*100)+'%';}wrap.addEventListener('wheel',function(e){e.preventDefault();var r=wrap.getBoundingClientRect(),mx=e.clientX-r.left,my=e.clientY-r.top;var f=e.deltaY<0?1.15:0.87,ns=cl(s*f,0.1,10);px=mx-(mx-px)*(ns/s);py=my-(my-py)*(ns/s);s=ns;ap();upd();},{passive:false});wrap.addEventListener('mousedown',function(e){if(e.button!==0)return;pan=true;lx=e.clientX;ly=e.clientY;wrap.style.cursor='grabbing';});document.addEventListener('mousemove',function(e){if(!pan)return;px+=e.clientX-lx;py+=e.clientY-ly;lx=e.clientX;ly=e.clientY;ap();});document.addEventListener('mouseup',function(){if(pan){pan=false;wrap.style.cursor='grab';}});wrap.style.cursor='grab';wrap.style.overflow='hidden';wrap.style.userSelect='none';wrap.style.position='relative';var ctrl=document.createElement('div');ctrl.style.cssText='position:absolute;bottom:10px;right:10px;display:flex;gap:4px;z-index:100;';var badge=document.createElement('span');badge.id='_fzb';badge.textContent='100%';badge.style.cssText='background:rgba(0,0,0,.6);color:white;font-size:11px;font-weight:700;padding:4px 9px;border-radius:6px;min-width:44px;text-align:center;line-height:24px;pointer-events:none;';function mkB(t,fn){var b=document.createElement('button');b.textContent=t;b.style.cssText='background:rgba(0,0,0,.6);color:white;border:none;border-radius:6px;width:30px;height:30px;cursor:pointer;font-size:17px;font-weight:700;display:flex;align-items:center;justify-content:center;';b.addEventListener('click',function(e){e.stopPropagation();fn();});return b;}ctrl.appendChild(mkB('-',function(){s=cl(s*.8,0.1,10);ap();upd();}));ctrl.appendChild(badge);ctrl.appendChild(mkB('+',function(){s=cl(s*1.25,0.1,10);ap();upd();}));ctrl.appendChild(mkB('[]',function(){s=1;px=0;py=0;ap();upd();}));wrap.appendChild(ctrl);if(!document.getElementById('_fpMSt')){var st=document.createElement('style');st.id='_fpMSt';st.textContent='.fp-marker{width:10px!important;height:10px!important;border-radius:50%!important;border:2px solid white!important;box-shadow:0 1px 4px rgba(0,0,0,.4)!important;cursor:pointer!important;transition:transform .15s!important;}.fp-marker:hover{transform:scale(1.6)!important;z-index:50!important;}';document.head.appendChild(st);}}},300);};} 
if(typeof Counter!=='undefined'&&Counter.openJob){var _oCO=Counter.openJob.bind(Counter);Counter.openJob=function(jobId){_oCO(jobId);setTimeout(function(){var hd=document.querySelector('.det-hd');if(!hd||hd.querySelector('.je-btn'))return;var b=document.createElement('button');b.className='je-btn';b.textContent='Breyta';b.style.cssText='padding:7px 14px;background:#f5f5f7;border:1px solid #e4e6ea;border-radius:7px;font-size:12px;font-weight:600;cursor:pointer;color:#404550;white-space:nowrap;';b.onclick=function(){openJobEdit(jobId);};var acts=hd.querySelector('.det-acts');if(acts)acts.insertBefore(b,acts.firstChild);},250);};}
if(typeof Workshop!=='undefined'&&Workshop.load){var _oWL=Workshop.load.bind(Workshop);Workshop.load=function(){_oWL();setTimeout(function(){var jobs=DB.cache&&DB.cache.jobs||[];document.querySelectorAll('.ws-job,.job-item,[data-job-id]').forEach(function(card){if(card.querySelector('.ws-note-chip'))return;var idEl=card.querySelector('.job-num,.ji-num,[data-job-id]');if(!idEl)return;var txt=(idEl.dataset.jobId||idEl.textContent.trim()).replace(/[#]/g,'');var job=jobs.find(function(j){return j.id===txt||j.id.slice(-6)===txt;});if(job&&job.athugasemdir&&job.athugasemdir.trim()){var chip=document.createElement('div');chip.className='ws-note-chip';chip.style.cssText='font-size:10px;color:#92400e;background:#fffbeb;border:1px solid #fcd34d;border-radius:4px;padding:2px 7px;margin-top:5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';chip.textContent='Note: '+job.athugasemdir.slice(0,50);card.appendChild(chip);}});},500);};}
var BLUE='padding:3px 8px;background:#eff6ff;border:1px solid #93c5fd;border-radius:5px;color:#1d4ed8;font-size:10px;font-weight:600;cursor:pointer;white-space:nowrap;margin-left:4px;';
var GREEN='padding:3px 8px;background:#edfaf3;border:1px solid #a7e8c5;border-radius:5px;color:#1a7f4b;font-size:10px;font-weight:600;cursor:pointer;white-space:nowrap;margin-left:4px;';
function _iQR(){document.querySelectorAll('.lan-table tbody tr,.gy-table tbody tr').forEach(function(row){if(row.querySelector('.qr-btn'))return;var c=row.querySelectorAll('td');if(c.length<3)return;var serial=c[0].textContent.trim();var type=c[1]?c[1].textContent.trim():'';var size=c[2]?c[2].textContent.trim():'';var isGy=!!row.closest('.gy-table');var owner=isGy&&c[3]?c[3].textContent.trim():'';var last=c[c.length-1];var b=document.createElement('button');b.className='qr-btn';b.textContent='QR';b.style.cssText=isGy?GREEN:BLUE;b.addEventListener('click',function(e){e.stopPropagation();printUnitQR(serial,type+(size?' - '+size:''),owner||null);});last.appendChild(b);});}
new MutationObserver(function(ms){if(ms.some(function(m){return Array.from(m.addedNodes).some(function(n){return n.nodeType===1&&(n.tagName==='TR'||n.tagName==='TBODY'||(n.querySelector&&n.querySelector('tr')));});}))setTimeout(_iQR,150);}).observe(document.body,{childList:true,subtree:true});
setTimeout(_iQR,1000);
(function(){
var _done=false,_map=null,_gc=window._mapGc=(function(){try{var s=localStorage.getItem("_slokk_gc");return s?JSON.parse(s):{};}catch(e){return{};}}());
function _col(u){if(!u||!u.length)return'#9ca3af';var now=new Date(),eT=new Date(now.getFullYear(),now.getMonth()+1,0),eN=new Date(now.getFullYear(),now.getMonth()+2,0);var c='#1a7f4b',hd=false;u.forEach(function(x){var d=x.next_insp;if(!d)return;hd=true;var dt=new Date(d);if(dt<=eT)c='#dc2626';else if(dt<=eN&&c!=='#dc2626')c='#b45309';});return hd?c:'#9ca3af';}
async function _geo(addr){
  if(_gc[addr])return _gc[addr];
  // Look up address from fyrirtaeki table
  var qAddr=addr;
  try{
    var coRes=await DB.sb.from('fyrirtaeki').select('nafn,heimilisfang').eq('nafn',addr).limit(1);
    if(coRes.data&&coRes.data[0]&&coRes.data[0].heimilisfang)qAddr=coRes.data[0].heimilisfang;
  }catch(e){}
  try{var r=await fetch('/api/geocode?q='+encodeURIComponent(qAddr));if(!r.ok){return null;}var d=await r.json();if(d&&typeof d.lat==='number'&&typeof d.lon==='number'){var p={lat:d.lat,lng:d.lon};_gc[addr]=p;try{localStorage.setItem("_slokk_gc",JSON.stringify(_gc));}catch(e){}return p;}}catch(e){}return null;}
// 2026-05-07: SLOKK v7 _markers disabled. It was rendering its own L.marker
// circles on top of mapfix.js's status markers, producing visual duplicates
// ("þykkir grænir punktar" the user reported). mapfix.js owns map markers
// now and re-renders on its own interval (see mapfix.js: setInterval(tick,500)).
async function _markers(){
  if(!_map)return;
  // Sweep any leftover CircleMarker layers from older sessions.
  _map.eachLayer(function(l){
    if(l instanceof L.CircleMarker)_map.removeLayer(l);
  });
}
function _build(mc){mc.style.height='360px';mc.style.width='100%';_map=window._slokk_map=L.map(mc).setView([64.1355,-21.8954],11);L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'\xa9 OpenStreetMap',maxZoom:19}).addTo(_map);var lg=L.control({position:'bottomleft'});lg.onAdd=function(){var d=L.DomUtil.create('div');d.style.cssText='background:white;padding:8px 12px;border-radius:8px;font-size:11px;border:1px solid #e4e6ea;line-height:1.9;box-shadow:0 2px 8px rgba(0,0,0,.1);';d.innerHTML='<b style="font-size:9px;color:#888;text-transform:uppercase;letter-spacing:.06em;">Staða skoðun</b><br><span style="color:#dc2626;">\u25cf</span> Útrunni<br><span style="color:#b45309;">\u25cf</span> Rennur út<br><span style="color:#1a7f4b;">\u25cf</span> Í lagi<br><span style="color:#9ca3af;">\u25cf</span> Engar dagsetningar';return d;};lg.addTo(_map);window.FieldMap={map:_map,refresh:_markers};(window._slokk_markers||_markers)();}
function _inject(){
var ex=document.getElementById('field-map-container');
if(ex){var fvC=document.getElementById('view-field');if(fvC&&fvC.contains(ex)){_done=true;return;}var wr=ex.parentElement;if(wr&&wr!==document.body&&!wr.id)wr.remove();else ex.remove();}
if(_done)return;
var fv=document.getElementById('view-field');if(!fv||!fv.classList.contains('active'))return;
var body=fv.querySelector('.field-body');if(!body)return;
_done=true;
var outer=document.createElement('div');outer.style.cssText='padding:10px 20px 0;';
var hd=document.createElement('div');hd.style.cssText='display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;';
var ttl=document.createElement('span');ttl.style.cssText='font-size:13px;font-weight:700;color:#404550;';ttl.textContent='Kort \u2014 \xdej\xf3nustusv\xe6\xf0i';
var rb=document.createElement('button');rb.textContent='\u21bb Uppf\xe6ra';rb.style.cssText='font-size:11px;padding:3px 10px;border:1px solid #e4e6ea;border-radius:6px;background:white;cursor:pointer;color:#555;';rb.onclick=function(){if(typeof window._slokk_markers==='function')window._slokk_markers();};
hd.appendChild(ttl);hd.appendChild(rb);
var mc=document.createElement('div');mc.id='field-map-container';mc.style.cssText='width:100%;height:300px;border-radius:10px;border:1px solid #e4e6ea;overflow:hidden;background:#f8f9fa;';
outer.appendChild(hd);outer.appendChild(mc);
fv.insertBefore(outer,body);
setTimeout(function(){if(typeof L!=='undefined'){_build(mc);}else{var lc=document.createElement('link');lc.rel='stylesheet';lc.href='https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';document.head.appendChild(lc);var ls=document.createElement('script');ls.src='https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';ls.onload=function(){_build(mc);};document.head.appendChild(ls);}},200);
}
new MutationObserver(function(ms){if(_done)return;for(var i=0;i<ms.length;i++){if(ms[i].type==='attributes'&&ms[i].target.id==='view-field'){setTimeout(_inject,300);return;}}}).observe(document.body,{subtree:true,attributes:true,attributeFilter:['class']});
document.addEventListener('click',function(){if(!_done)setTimeout(_inject,400);});
setTimeout(_inject,900);
// 2026-05-07: Legacy circle-marker renderer disabled. The thick green dots it
// drew were duplicating the smaller status markers from mapfix.js, so we now
// just clear any leftover CircleMarkers and let mapfix.js own the map.
window._slokk_markers=async function(){
  var map=window._slokk_map;
  if(!map)return;
  // Sweep stale CircleMarker layers (left over from older sessions or browser
  // restoration). mapfix.js uses L.marker with divIcon, NOT CircleMarker, so
  // this only removes the legacy dots.
  map.eachLayer(function(l){if(l instanceof L.CircleMarker)map.removeLayer(l);});
};
window._slokk_refresh=function(){window._slokk_markers&&window._slokk_markers();};
(function(){
  var _origSwitch=App.switchView.bind(App);
  App.switchView=function(view){
    _origSwitch(view);
    if(view==="field"){
      setTimeout(function(){window._slokk_markers&&window._slokk_markers();},1800);
    }
  };
})();
}());
console.log('[NewFeatures v4] Ready');


    // WORKSHOP NOTES
    (function(){
      function awn(){
        var jobs=DB.cache&&DB.cache.jobs||[];
        document.querySelectorAll('.qcard').forEach(function(card){
          if(card.querySelector('.ws-note'))return;
          var ne=card.querySelector('.qcard-num');if(!ne)return;
          var num=ne.textContent.trim().replace(/[^0-9]/g,'');
          var cardTxt=ne.textContent.trim();var job=jobs.find(function(j){return j.num===cardTxt||(j.num&&j.num===('#'+String(j.verk_nr)))||String(j.verk_nr)===num;});
          var noteText=job&&(job.athugasemdir||job.notes||'');if(!job||!noteText.trim())return;
          var n=document.createElement('div');n.className='ws-note';
          n.textContent='\uD83D\uDCDD '+noteText.slice(0,120)+(noteText.length>120?'\u2026':'');
          var eb=document.createElement('button');eb.textContent='Breyta verki';
          eb.style.cssText='margin-left:8px;padding:2px 8px;font-size:10px;background:#fff;border:1px solid #fcd34d;border-radius:4px;cursor:pointer;color:#92400e;vertical-align:middle;';
          (function(jid){eb.onclick=function(e){e.stopPropagation();openJobEdit(jid);};}(job.id));
          n.appendChild(eb);
          var ch=card.querySelector('.qcard-chips');
          if(ch)ch.after(n);else card.appendChild(n);
        });
      }
      new MutationObserver(function(ms){
        if(ms.some(function(m){return Array.from(m.addedNodes).some(function(nd){
          return nd.nodeType===1&&((nd.classList&&nd.classList.contains('qcard'))||(nd.querySelector&&nd.querySelector('.qcard')));
        });}))setTimeout(awn,200);
      }).observe(document.body,{childList:true,subtree:true});
      if(typeof Workshop!=='undefined'&&Workshop.render){var _wr=Workshop.render.bind(Workshop);Workshop.render=function(){_wr.apply(Workshop,arguments);setTimeout(awn,400);};}
      setTimeout(awn,2000);
    }());

    // UNIT EDIT (DOM-based, no innerHTML)
    window.openUnitEdit=function(uid){
      var u=Field&&Field.unit;if(!u)return;
      var old=document.getElementById('_ueM');if(old)old.remove();
      var m=document.createElement('div');m.id='_ueM';m.className='modal open';m.style.zIndex='2000';
      var box=document.createElement('div');box.className='modal-box';box.style.cssText='max-width:500px;border-radius:14px;';
      function el(tag,css,txt){var e=document.createElement(tag);if(css)e.style.cssText=css;if(txt!==undefined)e.textContent=txt;return e;}
      function lbl(t){return el('label','font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--ink3,#8891a0);display:block;margin-bottom:5px;',t);}
      function inp(id,type,ph){var i=document.createElement('input');i.id=id;i.type=type||'text';if(ph)i.placeholder=ph;i.style.cssText='width:100%;border:1px solid #e4e6ea;border-radius:8px;padding:9px 12px;font-size:14px;box-sizing:border-box;';return i;}
      function wrap(l,e){var d=document.createElement('div');d.appendChild(lbl(l));d.appendChild(e);return d;}
      var hd=el('div','display:flex;align-items:center;justify-content:space-between;padding:20px 24px 14px;');
      var htxt=document.createElement('div');
      htxt.appendChild(el('h2','font-size:17px;font-weight:700;margin:0;','Breyta t\u00e6ki'));
      htxt.appendChild(el('div','font-size:12px;color:var(--ink3,#8891a0);',u.serial||u.radnumer||''));
      var xbtn=el('button','background:#f0f0f2;border:none;border-radius:50%;width:30px;height:30px;font-size:16px;cursor:pointer;','X');
      xbtn.onclick=function(){document.getElementById('_ueM').remove();};
      hd.appendChild(htxt);hd.appendChild(xbtn);
      var body=el('div','padding:0 24px 24px;display:flex;flex-direction:column;gap:13px;');
      var inpL=inp('_ueL','text','T.d. G\u00f3lfplan B');
      var inpN=document.createElement('textarea');inpN.id='_ueN';inpN.rows=3;inpN.placeholder='S\u00e9rstakar athugasemdir...';inpN.style.cssText='width:100%;border:1px solid #e4e6ea;border-radius:8px;padding:9px 12px;font-size:13px;resize:vertical;font-family:inherit;box-sizing:border-box;';
      var inpD=inp('_ueD','date');
      var inpS=document.createElement('select');inpS.id='_ueS';inpS.style.cssText='width:100%;border:1px solid #e4e6ea;border-radius:8px;padding:9px 12px;font-size:13px;background:white;box-sizing:border-box;';
      [['active','Virkt'],['inactive','\u00d3virkt'],['scrapped','Skrota\u00f0']].forEach(function(op){var o=document.createElement('option');o.value=op[0];o.textContent=op[1];inpS.appendChild(o);});
      body.appendChild(wrap('Sta\u00f0setning',inpL));
      body.appendChild(wrap('Athugasemdir',inpN));
      var grid=el('div','display:grid;grid-template-columns:1fr 1fr;gap:12px;');
      grid.appendChild(wrap('N\u00e6sta sko\u00f0un',inpD));
      grid.appendChild(wrap('Sta\u00f0a',inpS));
      body.appendChild(grid);
      var btns=el('div','display:flex;justify-content:flex-end;gap:10px;padding-top:4px;');
      var cancelB=el('button','padding:9px 18px;border:1px solid #e4e6ea;border-radius:8px;background:white;cursor:pointer;font-size:13px;','H\u00e6tta vi\u00f0');
      cancelB.onclick=function(){document.getElementById('_ueM').remove();};
      var saveB=el('button','padding:9px 20px;background:#c93c1d;color:white;border:none;border-radius:8px;font-weight:600;font-size:13px;cursor:pointer;','Vista breytingar');
      saveB.onclick=function(){saveUnitEdit(uid);};
      btns.appendChild(cancelB);btns.appendChild(saveB);body.appendChild(btns);
      box.appendChild(hd);box.appendChild(body);m.appendChild(box);document.body.appendChild(m);
      setTimeout(function(){
        inpL.value=u.location||u.stadsetning||u.stadseting||'';
        inpN.value=u.notes||u.athugasemdir||'';
        inpD.value=(u.next_insp||u['naesta_sk\u00f3\u00f0un']||u.naesta_skoethun||u.naesta_sk||'').slice(0,10);
        inpS.value=u.status||'active';inpL.focus();
      },60);
    };
    window.saveUnitEdit=async function(uid){
      var loc=document.getElementById('_ueL').value,notes=document.getElementById('_ueN').value,stat=document.getElementById('_ueS').value,date=document.getElementById('_ueD').value;
      var upd={notes:notes,status:stat,location:loc};if(date)upd['next_insp']=date;
      var res=await DB.sb.from('uttaeki').update(upd).eq('id',uid);
      if(res.error){alert('Villa: '+res.error.message);return;}
      document.getElementById('_ueM').remove();showToast('T\u00e6ki uppf\u00e6rt \u2713');
      try{if(Field.render)Field.render();}catch(e){}
    };

    // Edit button in unit panel
    (function(){
      new MutationObserver(function(){
        var p=document.querySelector('.fld-panel,.fld-detail,[class*="fld-det"]');
        if(!p||p.querySelector('.unit-edit-btn'))return;
        var u=Field&&Field.unit;if(!u||!u.id)return;
        var hd=p.querySelector('.det-hd,.fld-hd');if(!hd)return;
        var btn=document.createElement('button');btn.className='unit-edit-btn';btn.innerHTML='\u270F Breyta t\u00e6ki';
        (function(id){btn.onclick=function(){openUnitEdit(id);};}(u.id));hd.appendChild(btn);
      }).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class','style']});
    }());

    // Floor plan: 10MB + 8000px
    if(typeof FloorPlan!=='undefined'){
      var _hu=FloorPlan.handleUpload.bind(FloorPlan);
      FloorPlan.handleUpload=function(e){
        var f=e&&e.target&&e.target.files&&e.target.files[0];
        if(f&&f.size>10*1024*1024){showToast('H\u00e1mark skr\u00e1arst\u00e6r\u00f0 er 10MB',true);return;}
        _hu(e);
      };
      var _rc=FloorPlan._renderCanvas.bind(FloorPlan);
      FloorPlan._renderCanvas=function(){
        var main=document.getElementById('fp-main'),canvas=document.getElementById('fp-canvas');
        if(!main||!canvas||!this.bgImage){_rc();return;}
        var img=this.bgImage,iw=img.naturalWidth||img.width||main.offsetWidth,ih=img.naturalHeight||img.height||main.offsetHeight;
        var ratio=Math.min(1,8000/Math.max(iw,ih)),cw=Math.round(iw*ratio),ch=Math.round(ih*ratio);
        canvas.width=cw;canvas.height=ch;
        var sc=Math.min((main.offsetWidth-10)/cw,(main.offsetHeight-10)/ch);
        canvas.style.width=(cw*sc)+'px';canvas.style.height=(ch*sc)+'px';
        var ctx=canvas.getContext('2d');ctx.clearRect(0,0,cw,ch);ctx.drawImage(img,0,0,cw,ch);
        var plan=this.plans&&this.plans[this.companyId];
        if(plan&&plan.markers){var mr=Math.max(6,Math.round(cw/400));plan.markers.forEach(function(mk){var mx=(mk.x||0)*cw,my=(mk.y||0)*ch;ctx.beginPath();ctx.arc(mx,my,mr,0,2*Math.PI);ctx.fillStyle=mk.color||'#c93c1d';ctx.fill();ctx.strokeStyle='white';ctx.lineWidth=Math.max(2,mr/3);ctx.stroke();});}
      };
    }
  
},800);

/* ============================================================
   SLOKK PATCHES v6 - Company profile floor plan + Logo
   ============================================================ */
(function() {

/* 1. PERSIST: Convert blob URLs to data URLs on FloorPlan.save */
var _origFpSave = FloorPlan.save.bind(FloorPlan);
FloorPlan.save = function() {
  var self = this, cid = this.companyId;
  var plan = this.plans[cid] || {};
  if (plan.imageUrl && plan.imageUrl.startsWith('blob:')) {
    var i = new Image();
    i.onload = function() {
      try {
        var c = document.createElement('canvas');
        var w = Math.min(i.naturalWidth, 1600), h = Math.round(i.naturalHeight * w / i.naturalWidth);
        c.width = w; c.height = h;
        c.getContext('2d').drawImage(i, 0, 0, w, h);
        plan.imageUrl = c.toDataURL('image/jpeg', 0.75);
      } catch(e) {}
      _origFpSave.call(self);
    };
    i.onerror = function() { _origFpSave.call(self); };
    i.src = plan.imageUrl;
  } else { _origFpSave.call(self); }
};

/* 2. COMPANY PROFILE: inject large zoomable floor plan above unit list */
var _origOpenDetail = Companies.openDetail.bind(Companies);
Companies.openDetail = function(id) {
  _origOpenDetail(id);
  setTimeout(function() { _coFpInject(id); }, 300);
};

function _coFpInject(id) {
  var el = document.getElementById('companies-main');
  if (!el) return;
  var prev = document.getElementById('co-fp-section');
  if (prev) prev.remove();
  var fp = FloorPlan.plans[id] || {};
  if (!fp.imageUrl) {
    try { var r = localStorage.getItem('fp_'+id); if (r) fp = JSON.parse(r); } catch(e) {}
  }
  if (!fp.imageUrl) return;
  var kids = Array.from(el.children);
  var ins = null;
  for (var i = 0; i < kids.length; i++) {
    var k = kids[i];
    if (k.children.length >= 2) {
      var sp = k.querySelector('span');
      if (sp && /tæki|Tæki/.test(sp.textContent)) { ins = k; break; }
    }
  }
  if (!ins) ins = kids[Math.min(3, kids.length - 1)];
  var sec = document.createElement('div');
  sec.id = 'co-fp-section';
  sec.style.cssText = 'margin:4px 0 16px;background:#fff;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.06);';
  var hdr = document.createElement('div');
  hdr.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:9px 14px;border-bottom:1px solid #f0f0f0;background:#fafafa;';
  var title = document.createElement('span');
  title.style.cssText = 'font-size:11px;font-weight:600;color:#6b7280;letter-spacing:.06em;text-transform:uppercase;';
  title.textContent = 'Teikning';
  hdr.appendChild(title);
  var ctrl = document.createElement('div');
  ctrl.style.cssText = 'display:flex;align-items:center;gap:5px;';
  ctrl.innerHTML = '<button id="coFpZo" style="border:1px solid #d1d5db;border-radius:5px;width:26px;height:26px;background:#fff;cursor:pointer;font-size:15px;line-height:1;">−</button><span id="coFpLbl" style="min-width:42px;text-align:center;font-size:11px;color:#6b7280;line-height:26px;">100%</span><button id="coFpZi" style="border:1px solid #d1d5db;border-radius:5px;width:26px;height:26px;background:#fff;cursor:pointer;font-size:15px;line-height:1;">+</button><button id="coFpRst" style="border:1px solid #d1d5db;border-radius:5px;padding:0 8px;height:26px;background:#fff;cursor:pointer;font-size:11px;color:#374151;">↺</button>';
  hdr.appendChild(ctrl); sec.appendChild(hdr);
  var vp = document.createElement('div');
  vp.id = 'coFpVp';
  vp.style.cssText = 'height:300px;overflow:hidden;position:relative;cursor:grab;background:#f1f3f5;';
  var cv = document.createElement('canvas');
  cv.id = 'coFpCv';
  cv.style.cssText = 'position:absolute;top:0;left:0;transform-origin:0 0;';
  vp.appendChild(cv); sec.appendChild(vp);
  el.insertBefore(sec, ins);
  var img = new Image();
  img.onload = function() {
    var W = vp.offsetWidth||640, H=300, iw=img.naturalWidth, ih=img.naturalHeight;
    cv.width=iw; cv.height=ih;
    var ctx=cv.getContext('2d'); ctx.drawImage(img,0,0);
    (fp.markers||[]).forEach(function(m){
      var mx=(m.x||.5)*iw,my=(m.y||.5)*ih;
      ctx.save(); ctx.beginPath(); ctx.arc(mx,my,14,0,2*Math.PI);
      ctx.fillStyle='rgba(220,38,38,0.8)'; ctx.fill();
      ctx.strokeStyle='#fff'; ctx.lineWidth=3; ctx.stroke(); ctx.restore();
    });
    var bs=W/iw, st={s:bs,tx:0,ty:0,bs:bs,iw:iw,ih:ih,W:W,H:H};
    function ap(){cv.style.width=(iw*st.s)+'px';cv.style.height=(ih*st.s)+'px';cv.style.transform='translate('+st.tx+'px,'+st.ty+'px)';var l=document.getElementById('coFpLbl');if(l)l.textContent=Math.round(st.s/st.bs*100)+'%';}
    function cl(){var cw=iw*st.s,ch=ih*st.s;st.tx=Math.min(0,Math.max(st.W-cw,st.tx));st.ty=Math.min(0,Math.max(st.H-ch,st.ty));}
    ap();
    var zi=document.getElementById('coFpZi'),zo=document.getElementById('coFpZo'),zr=document.getElementById('coFpRst');
    if(zi)zi.onclick=function(){st.s=Math.min(st.bs*6,st.s+st.bs*.3);cl();ap();};
    if(zo)zo.onclick=function(){st.s=Math.max(st.bs*.4,st.s-st.bs*.3);cl();ap();};
    if(zr)zr.onclick=function(){st.s=st.bs;st.tx=0;st.ty=0;ap();};
    vp.addEventListener('wheel',function(e){e.preventDefault();st.s=Math.max(st.bs*.4,Math.min(st.bs*6,st.s+(e.deltaY>0?-0.1:0.1)*st.bs));cl();ap();},{passive:false});
    var drag=null;
    vp.addEventListener('mousedown',function(e){drag={x:e.clientX-st.tx,y:e.clientY-st.ty};vp.style.cursor='grabbing';});
    document.addEventListener('mousemove',function(e){if(!drag)return;st.tx=e.clientX-drag.x;st.ty=e.clientY-drag.y;cl();ap();});
    document.addEventListener('mouseup',function(){if(!drag)return;drag=null;var v=document.getElementById('coFpVp');if(v)v.style.cursor='grab';});
  };
  img.onerror=function(){var s=document.getElementById('co-fp-section');if(s)s.remove();};
  img.src=fp.imageUrl;
}

/* 3. LOGO: Upgrade sidebar brand logo */
(function(){
  function patch(){
    var logo=document.querySelector('.brand-logo');
    if(!logo||logo.dataset.v6)return;
    logo.dataset.v6='1';
    logo.innerHTML='<svg viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg" style="width:40px;height:40px;filter:drop-shadow(0 2px 5px rgba(0,0,0,.25));"><rect width="36" height="36" rx="9" fill="#c93c1d"/><rect x="14" y="3" width="8" height="4" rx="2" fill="white" opacity=".95"/><rect x="15.5" y="7" width="5" height="2" rx="1" fill="white" opacity=".6"/><rect x="11.5" y="9" width="13" height="20" rx="4" fill="white"/><rect x="13.5" y="12" width="9" height="4" rx="1.5" fill="#c93c1d"/><rect x="14" y="21" width="8" height="5" rx="1.5" fill="#c93c1d" opacity=".5"/><rect x="14.5" y="28.5" width="7" height="3.5" rx="1.75" fill="white" opacity=".85"/><circle cx="25" cy="15" r="3.5" fill="#f59e0b" stroke="white" stroke-width="1.5"/></svg>';
  }
  patch();
  new MutationObserver(patch).observe(document.body,{childList:true,subtree:true});
})();

})(); /* end SLOKK v6 */


/* ============================================================
   SLOKK PATCHES v7 - Schedule color coding + map geo fix
   ============================================================ */
(function() {

/* Color-code schedule date boxes in NÆSTU HEIMSÓKNIR */
function colorSchedDates() {
  var now = new Date();
  var thisYear = now.getFullYear();
  var thisMon = now.getMonth(); // 0-indexed
  var nextMon = (thisMon + 1) % 12;
  var nextMonYear = thisMon === 11 ? thisYear + 1 : thisYear;

  document.querySelectorAll('.sched-card').forEach(function(card) {
    var dayEl = card.querySelector('.sched-day');
    var monEl = card.querySelector('.sched-mon');
    var dateEl = card.querySelector('.sched-date');
    if (!dayEl || !monEl || !dateEl) return;
    if (dateEl.dataset.colored) return;
    dateEl.dataset.colored = '1';

    // Try to get date from data or parse from display text
    var monText = monEl.textContent.trim().toLowerCase();
    var dayNum = parseInt(dayEl.textContent.trim(), 10);

    // Month name map (Icelandic)
    var monMap = {jan:0,feb:1,mar:2,apr:3,maí:4,jún:5,júl:6,ágú:7,sep:8,okt:9,nóv:10,des:11};
    var monNum = monMap[monText];
    if (monNum === undefined) return;

    // Determine year (assume current or next year)
    var yr = thisYear;
    if (monNum < thisMon) yr = thisYear + 1;

    // Classify
    if (yr === thisYear && monNum === thisMon) {
      dateEl.classList.add('sd-red');
    } else if ((yr === thisYear && monNum === nextMon) || (yr === nextMonYear && monNum === nextMon)) {
      dateEl.classList.add('sd-orange');
    } else {
      dateEl.classList.add('sd-green');
    }
  });
}

// Run immediately and watch for DOM changes
colorSchedDates();
var _schedObs = new MutationObserver(function(muts) {
  muts.forEach(function(m) {
    if (m.addedNodes.length) colorSchedDates();
  });
});
_schedObs.observe(document.body, {childList: true, subtree: true});

/* Fix map geocoding — update company addresses to geocode correctly */
/* Patch MapModule._geocode to use Nominatim with Iceland bias */
if (window.MapModule && MapModule._geocode) {
  var _origGeo = MapModule._geocode.bind(MapModule);
  MapModule._geocode = function(address, cb) {
    // Proxy via Netlify function (browser can't hit Nominatim directly)
    var query = encodeURIComponent(address);
    fetch('/api/geocode?q=' + query)
      .then(function(r) { return r.ok ? r.json() : null; })
      .then(function(data) {
        if (data && typeof data.lat === 'number' && typeof data.lon === 'number') cb(data.lat, data.lon);
        else _origGeo(address, cb);
      })
      .catch(function() { _origGeo(address, cb); });
  };
}

  window._slokk_markers=_markers;
  window._slokk_refresh=function(){if(window._slokk_markers)window._slokk_markers();};
})(); /* end SLOKK v7 */


/* SLOKK v8 - Auto-load map markers when field view opens */
(function(){
  var _lastFieldActive = false;
  setInterval(function(){
    var fv = document.getElementById("view-field");
    var active = fv && fv.style.display !== "none" && fv.offsetHeight > 0;
    if (active && !_lastFieldActive && window._slokk_markers && window._slokk_map) {
      setTimeout(function(){ window._slokk_markers(); }, 800);
    }
    _lastFieldActive = !!active;
  }, 1000);
})(); /* end SLOKK v8 */
