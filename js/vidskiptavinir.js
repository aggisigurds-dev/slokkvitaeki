/* Viðskiptavinir tab — individuals (kennitala-based) with service history */
(function(){'use strict';
var _state={search:'',sortBy:'name',sortDir:'asc'};
var _injected=false;

function isIndividualKt(kt){
  if(!kt)return false;
  var c=String(kt).replace(/[^0-9]/g,'');
  if(c.length<6)return false;
  var day=parseInt(c.substring(0,2),10);
  return day>=1 && day<=31;
}
function fmtKt(kt){if(!kt)return '';var c=String(kt).replace(/[^0-9]/g,'');return c.length>=10?c.slice(0,6)+'-'+c.slice(6,10):c;}
function fmtDate(d){if(!d)return '—';var dt=new Date(d);if(isNaN(dt))return '—';return String(dt.getDate()).padStart(2,'0')+'/'+String(dt.getMonth()+1).padStart(2,'0')+'/'+dt.getFullYear();}
function escHtml(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}

async function loadIndividuals(){
  var r=await DB.sb.from('verkbeidnir').select('id,num,customer,phone,notes,dropoff,pickup,created_at').order('created_at',{ascending:false});
  var byKt={};
  (r.data||[]).forEach(function(j){
    if(!j.notes)return;
    var m=j.notes.match(/Kt:\s*(\d{6}-?\d{4})/i);
    if(!m)return;
    var kt=m[1].replace(/-/g,'');
    if(!isIndividualKt(kt))return;
    if(!byKt[kt]) byKt[kt]={kennitala:kt, name:j.customer||'Óþekkt', phone:j.phone||'', jobs:[], lastDate:null};
    byKt[kt].jobs.push(j);
    if(!byKt[kt].lastDate || j.created_at>byKt[kt].lastDate){byKt[kt].lastDate=j.created_at;}
    if(j.customer && (!byKt[kt].name || byKt[kt].name==='Óþekkt'))byKt[kt].name=j.customer;
    if(j.phone && !byKt[kt].phone)byKt[kt].phone=j.phone;
  });
  // 2026-06-09: also pull rows straight from the `vidskiptavinir` table so
  // Sala-created customers (incl. company kennitölur the verkbeiðni scan skips)
  // show up here and can be promoted to Fyrirtækjaþjónusta.
  try{
    var vr=await DB.sb.from('vidskiptavinir')
      .select('id,nafn,kennitala,simi,netfang,heimilisfang,athugasemdir,created_at,deleted_at')
      .is('deleted_at',null);
    (vr.data||[]).forEach(function(c){
      var kt=String(c.kennitala||'').replace(/[^0-9]/g,'');
      if(kt.length<10)return;
      if(!byKt[kt])byKt[kt]={kennitala:kt, name:c.nafn||'Óþekkt', phone:c.simi||'', jobs:[], lastDate:c.created_at||null};
      var p=byKt[kt];
      if((!p.name||p.name==='Óþekkt')&&c.nafn)p.name=c.nafn;
      if(!p.phone&&c.simi)p.phone=c.simi;
      if(!p.lastDate)p.lastDate=c.created_at||null;
      p.vidsk_id=c.id;
      p.netfang=c.netfang||p.netfang||'';
      p.heimilisfang=c.heimilisfang||p.heimilisfang||'';
      p.athugasemdir=c.athugasemdir||p.athugasemdir||'';
    });
  }catch(e){console.warn('[Vidskiptavinir] table load',e);}
  return Object.values(byKt);
}

async function showHistory(person){
  var ov=document.createElement('div');
  ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:10000;display:flex;align-items:center;justify-content:center;padding:20px;';
  var box=document.createElement('div');
  box.style.cssText='background:#fff;border-radius:14px;width:680px;max-width:95vw;max-height:90vh;overflow:hidden;display:flex;flex-direction:column;box-shadow:0 12px 40px rgba(0,0,0,.3);';
  var hdr='<div style="padding:16px 20px;border-bottom:1px solid #e5e7eb;display:flex;justify-content:space-between;align-items:flex-start;gap:12px">'+
    '<div><h2 style="margin:0 0 4px 0;font-size:18px">'+escHtml(person.name)+'</h2><div style="font-size:12px;color:#6b7280;font-family:monospace">Kt: '+fmtKt(person.kennitala)+(person.phone?' · '+escHtml(person.phone):'')+'</div></div>'+
    '<div style="display:flex;gap:8px;align-items:center;flex-shrink:0">'+
      '<button id="_vk_promote" style="padding:8px 12px;border:1px solid #16a34a;background:#16a34a;color:#fff;border-radius:8px;cursor:pointer;font-size:12.5px;font-weight:700;white-space:nowrap">⬆ Gera að fyrirtæki í þjónustu</button>'+
      '<button id="_vk_x" style="background:none;border:none;font-size:20px;cursor:pointer;color:#6b7280">✕</button>'+
    '</div></div>';
  // Get all units associated with this person's verkbeiðnir
  var jobIds=person.jobs.map(function(j){return j.id;});
  var unitsRes=await DB.sb.from('verklidur').select('*').in('job_id',jobIds);
  var unitsByJob={};
  (unitsRes.data||[]).forEach(function(u){if(!unitsByJob[u.job_id])unitsByJob[u.job_id]=[];unitsByJob[u.job_id].push(u);});
  var bodyHtml='<div style="padding:18px 20px;overflow-y:auto;flex:1">';
  bodyHtml+='<h3 style="margin:0 0 12px 0;font-size:14px;color:#374151">Þjónustusaga ('+person.jobs.length+' verk)</h3>';
  person.jobs.forEach(function(j){
    bodyHtml+='<div style="border:1px solid #e5e7eb;border-radius:10px;padding:12px 14px;margin-bottom:10px;background:#f9fafb">';
    bodyHtml+='<div style="display:flex;justify-content:space-between;margin-bottom:6px"><div style="font-weight:700;color:#111">#'+escHtml(j.num)+'</div><div style="font-size:11px;color:#6b7280">'+fmtDate(j.created_at)+'</div></div>';
    if(j.dropoff)bodyHtml+='<div style="font-size:12px;color:#374151">Móttekið: '+fmtDate(j.dropoff)+(j.pickup?' · Afhent: '+fmtDate(j.pickup):'')+'</div>';
    var units=unitsByJob[j.id]||[];
    if(units.length>0){
      bodyHtml+='<div style="margin-top:8px;padding-top:8px;border-top:1px dashed #e5e7eb">';
      units.forEach(function(u){
        bodyHtml+='<div style="font-size:12px;color:#374151;display:flex;justify-content:space-between;padding:3px 0"><div><code style="background:#fff;padding:1px 6px;border-radius:3px;font-size:11px">'+escHtml(u.serial||'-')+'</code> '+escHtml(u.type||'')+(u.size?' · '+escHtml(u.size):'')+'</div><div style="color:#6b7280">'+escHtml(u.service||u.status||'')+'</div></div>';
      });
      bodyHtml+='</div>';
    }
    if(j.notes)bodyHtml+='<div style="font-size:11px;color:#6b7280;margin-top:6px;font-style:italic">'+escHtml(j.notes)+'</div>';
    bodyHtml+='</div>';
  });
  bodyHtml+='</div>';
  box.innerHTML=hdr+bodyHtml;
  ov.appendChild(box);document.body.appendChild(ov);
  function close(){ov.remove();}
  document.getElementById('_vk_x').onclick=close;
  ov.onclick=function(e){if(e.target===ov)close();};
  var pb=document.getElementById('_vk_promote');
  if(pb){pb.onclick=function(){
    if(!window.PromoteCustomer||typeof PromoteCustomer.run!=='function'){alert('Promote-einingin er ekki hlaðin.');return;}
    PromoteCustomer.run({
      kennitala: person.kennitala,
      nafn: person.name,
      simi: person.phone,
      netfang: person.netfang,
      heimilisfang: person.heimilisfang,
      athugasemdir: person.athugasemdir,
      vidsk_id: person.vidsk_id
    }, { onDone: function(){ close(); } });
  };}
}

function applySort(rows){
  var dir=_state.sortDir==='asc'?1:-1;
  rows.sort(function(a,b){
    var av,bv;
    if(_state.sortBy==='name'){av=a.name.toLowerCase();bv=b.name.toLowerCase();}
    else if(_state.sortBy==='kt'){av=a.kennitala;bv=b.kennitala;}
    else if(_state.sortBy==='jobs'){av=a.jobs.length;bv=b.jobs.length;}
    else if(_state.sortBy==='last'){av=a.lastDate||'';bv=b.lastDate||'';}
    else {av=a.name.toLowerCase();bv=b.name.toLowerCase();}
    if(av<bv)return -1*dir;if(av>bv)return 1*dir;return 0;
  });
  return rows;
}
function applySearch(rows){
  if(!_state.search)return rows;
  var q=_state.search.toLowerCase();
  return rows.filter(function(r){return r.name.toLowerCase().indexOf(q)>=0 || r.kennitala.indexOf(q.replace(/-/g,''))>=0 || (r.phone||'').indexOf(q)>=0;});
}

async function renderView(){
  var v=document.getElementById('view-vidskiptavinir');
  if(!v)return;
  v.innerHTML='<div style="padding:20px;color:#6b7280">Hleður...</div>';
  var people=await loadIndividuals();
  var visible=applySort(applySearch(people.slice()));
  var html='<div style="padding:0 0 20px 0">';
  html+='<div style="display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:14px"><div><h1 style="margin:0;font-size:22px;color:#111">Viðskiptavinir</h1><div style="font-size:12px;color:#6b7280;margin-top:2px">'+visible.length+' / '+people.length+' viðskiptavinir</div></div></div>';
  html+='<div style="display:flex;gap:10px;margin-bottom:10px;align-items:center;flex-wrap:wrap"><input id="_vk_search" placeholder="🔎 Leita eftir nafni, kennitölu eða síma..." value="'+escHtml(_state.search)+'" style="flex:1;min-width:200px;padding:10px 14px;border:1.5px solid #e5e7eb;border-radius:9px;font-size:14px;background:#fff"><button id="_vk_clear" style="background:#f3f4f6;border:none;border-radius:8px;padding:9px 14px;font-size:13px;cursor:pointer;color:#374151">Hreinsa</button></div>';
  if(visible.length===0){
    html+='<div style="padding:60px 20px;text-align:center;color:#9ca3af;background:#f9fafb;border-radius:10px"><div style="font-size:48px;margin-bottom:14px">👥</div><h3 style="margin:0 0 6px 0;color:#374151;font-weight:600">Engir viðskiptavinir með kennitölu enn</h3><div style="font-size:13px">Þegar þú skráir nýja verkbeiðni og setur inn kennitölu birtast einstaklingar hér.</div></div>';
  } else {
    var thStyle='cursor:pointer;text-align:center;padding:12px 10px;font-size:11px;color:#6b7280;text-transform:uppercase;font-weight:700;user-select:none';
    var thLeft='cursor:pointer;text-align:left;padding:12px 14px;font-size:11px;color:#6b7280;text-transform:uppercase;font-weight:700;user-select:none';
    html+='<table style="width:100%;border-collapse:collapse;font-size:13px;background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.06)"><thead><tr style="background:#f9fafb;border-bottom:2px solid #e5e7eb"><th data-sort="name" style="'+thLeft+'">Nafn</th><th data-sort="kt" style="'+thLeft+'">Kennitala</th><th style="'+thLeft+'">Sími</th><th data-sort="jobs" style="'+thStyle+'">Verk</th><th data-sort="last" style="'+thLeft+'">Síðasta heimsókn</th><th style="text-align:right;padding:12px 14px"></th></tr></thead><tbody>';
    visible.forEach(function(r){
      html+='<tr data-kt="'+r.kennitala+'" style="border-bottom:1px solid #f3f4f6;cursor:pointer" onmouseover="this.style.background=\'#f9fafb\'" onmouseout="this.style.background=\'\'">';
      html+='<td style="padding:12px 14px;font-weight:600;color:#111">'+escHtml(r.name)+'</td>';
      html+='<td style="padding:12px 14px;font-family:monospace;color:#374151">'+fmtKt(r.kennitala)+'</td>';
      html+='<td style="padding:12px 14px;color:#374151">'+(r.phone?'<a href="tel:'+r.phone.replace(/[^0-9+]/g,'')+'" style="color:#2563eb;text-decoration:none" onclick="event.stopPropagation()">'+escHtml(r.phone)+'</a>':'-')+'</td>';
      html+='<td style="padding:12px 10px;text-align:center;font-weight:700">'+r.jobs.length+'</td>';
      html+='<td style="padding:12px 14px;color:#374151">'+fmtDate(r.lastDate)+'</td>';
      html+='<td style="padding:12px 14px;text-align:right;color:#9ca3af">›</td>';
      html+='</tr>';
    });
    html+='</tbody></table>';
  }
  html+='</div>';
  v.innerHTML=html;
  var inp=document.getElementById('_vk_search');
  if(inp){inp.addEventListener('input',function(e){_state.search=e.target.value;renderView();});}
  var clr=document.getElementById('_vk_clear');
  if(clr){clr.onclick=function(){_state.search='';renderView();};}
  v.querySelectorAll('th[data-sort]').forEach(function(th){th.onclick=function(){var k=th.dataset.sort;if(_state.sortBy===k){_state.sortDir=_state.sortDir==='asc'?'desc':'asc';}else{_state.sortBy=k;_state.sortDir=k==='name'?'asc':'desc';}renderView();};});
  v.querySelectorAll('tr[data-kt]').forEach(function(tr){tr.onclick=function(){var kt=tr.dataset.kt;var p=people.find(function(x){return x.kennitala===kt;});if(p)showHistory(p);};});
}

function injectTabAndView(){
  if(_injected)return;
  // Find Fyrirtæki nav button
  var fyr=Array.from(document.querySelectorAll('.vnav-btn')).find(function(b){return b.dataset.view==='companies';});
  if(!fyr)return;
  // Don't add twice
  if(fyr.parentElement.querySelector('[data-view="vidskiptavinir"]'))return;
  var btn=document.createElement('button');
  btn.className=fyr.className;
  btn.dataset.view='vidskiptavinir';
  btn.innerHTML=fyr.innerHTML.replace(/Fyrirt[æa]ki/i,'Viðskiptavinir');
  // Try to swap inner icon to people emoji
  var svgs=btn.querySelectorAll('svg');
  if(svgs.length>0){var sp=document.createElement('span');sp.style.cssText='display:inline-flex;width:18px;height:18px;align-items:center;justify-content:center;font-size:14px';sp.textContent='👥';svgs[0].parentNode.replaceChild(sp,svgs[0]);}
  btn.onclick=function(){
    // Hide all views; show ours
    document.querySelectorAll('[id^=view-]').forEach(function(v){v.style.display='none';});
    var v=document.getElementById('view-vidskiptavinir');
    if(!v){
      v=document.createElement('div');
      v.id='view-vidskiptavinir';
      v.className='view';
      v.style.cssText='padding:20px';
      // Find a sibling view to mount next to
      var ref=document.getElementById('view-companies');
      if(ref&&ref.parentNode)ref.parentNode.insertBefore(v,ref.nextSibling);
      else document.body.appendChild(v);
    }
    v.style.display='';
    v.classList.add('active');
    document.querySelectorAll('[id^=view-]').forEach(function(other){if(other!==v)other.classList.remove('active');});
    document.querySelectorAll('.vnav-btn').forEach(function(b){b.classList.remove('active');});
    btn.classList.add('active');
    renderView();
  };
  fyr.parentNode.insertBefore(btn,fyr.nextSibling);
  _injected=true;
  // When user clicks any other vnav-btn, hide our view
  document.querySelectorAll('.vnav-btn').forEach(function(b){
    if(b===btn)return;
    var origClick=b.onclick;
    b.addEventListener('click',function(){var v=document.getElementById('view-vidskiptavinir');if(v)v.style.display='none';btn.classList.remove('active');});
  });
  console.log('[Vidskiptavinir] tab injected');
}
setInterval(injectTabAndView,1500);
setTimeout(injectTabAndView,800);
window.openVidskiptavinir=function(){var v=document.querySelector('[data-view="vidskiptavinir"]');if(v)v.click();};
console.log('[Vidskiptavinir] module loaded');
})();