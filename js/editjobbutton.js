/* Edit job button - injects Breyta into .jd-actions for verkbeiðnir */
(function(){'use strict';
var _modal=null;
async function findCurrentJobId(){
  if(window.Print && Print.job && Print.job.id) return Print.job.id;
  var hdr=document.querySelector('.jd-header .jd-title span');
  var num=null, numNoHash=null;
  if(hdr){
    var m=hdr.textContent.match(/(\d{4}-\d+)/);
    if(m){numNoHash=m[1]; num='#'+m[1];}
  }
  if(num && window.DB && DB.getJobs){
    var jobs=DB.getJobs();
    var j=jobs.find(function(x){return x.num===num || x.num===numNoHash;});
    if(j && j.id) return j.id;
  }
  if(num && window.DB && DB.sb){
    try{
      var r=await DB.sb.from('verkbeidnir').select('id').or('num.eq.'+num+',num.eq.'+numNoHash).limit(1);
      if(r && r.data && r.data.length>0 && r.data[0].id) return r.data[0].id;
    }catch(e){console.warn('[edit] sb lookup failed',e);}
  }
  var main=document.getElementById('counter-main');
  if(main && main.dataset && main.dataset.jobId) return parseInt(main.dataset.jobId,10);
  return null;
}
async function openEditModal(){
  var jobId=await findCurrentJobId();
  if(!jobId){alert('Get ekki fundið verkbeiðni');return;}
  DB.sb.from('verkbeidnir').select('*').eq('id',jobId).single().then(function(r){
    if(!r.data){alert('Verkbeiðni fannst ekki');return;}
    showEditForm(r.data);
  });
}
function showEditForm(job){
  if(_modal){_modal.remove();}
  var ov=document.createElement('div');
  ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:10000;display:flex;align-items:center;justify-content:center;padding:20px;';
  var box=document.createElement('div');
  box.style.cssText='background:#fff;border-radius:14px;width:560px;max-width:95vw;max-height:90vh;overflow:hidden;display:flex;flex-direction:column;box-shadow:0 12px 40px rgba(0,0,0,.3);';
  function fld(lbl,id,val,type){return '<div style="margin-bottom:14px"><label style="display:block;font-size:11px;color:#6b7280;text-transform:uppercase;font-weight:700;letter-spacing:.5px;margin-bottom:4px">'+lbl+'</label><input id="'+id+'" type="'+(type||'text')+'" value="'+(val==null?'':String(val).replace(/"/g,'&quot;'))+'" style="width:100%;padding:10px 12px;border:1.5px solid #e5e7eb;border-radius:9px;font-size:14px;box-sizing:border-box"></div>';}
  function ta(lbl,id,val){return '<div style="margin-bottom:14px"><label style="display:block;font-size:11px;color:#6b7280;text-transform:uppercase;font-weight:700;letter-spacing:.5px;margin-bottom:4px">'+lbl+'</label><textarea id="'+id+'" rows="3" style="width:100%;padding:10px 12px;border:1.5px solid #e5e7eb;border-radius:9px;font-size:14px;box-sizing:border-box;resize:vertical;font-family:inherit">'+(val==null?'':String(val).replace(/</g,'&lt;'))+'</textarea></div>';}
  box.innerHTML='<div style="padding:16px 20px;border-bottom:1px solid #e5e7eb;display:flex;justify-content:space-between;align-items:center"><h2 style="margin:0;font-size:17px">Breyta verkbeiðni '+job.num+'</h2><button id="_ej_x" style="background:none;border:none;font-size:20px;cursor:pointer;color:#6b7280">✕</button></div>'+
    '<div style="padding:20px;overflow-y:auto;flex:1">'+
      fld('Nafn viðskiptavinar','_ej_name',job.customer)+
      fld('Símanúmer','_ej_phone',job.phone)+
      '<div style="display:flex;gap:10px"><div style="flex:1">'+fld('Móttökudagur','_ej_drop',job.dropoff,'date')+'</div><div style="flex:1">'+fld('Afhendingardagur','_ej_pick',job.pickup,'date')+'</div></div>'+
      ta('Athugasemdir','_ej_notes',job.notes)+
      fld('Verð (kr)','_ej_verd',job.verd,'number')+
    '</div>'+
    '<div style="padding:14px 20px;border-top:1px solid #e5e7eb;display:flex;gap:10px;justify-content:flex-end"><button id="_ej_cancel" style="background:#f3f4f6;border:none;padding:10px 18px;border-radius:9px;cursor:pointer;font-size:14px;color:#374151">Hætta við</button><button id="_ej_save" style="background:#dc2626;color:#fff;border:none;padding:10px 18px;border-radius:9px;cursor:pointer;font-weight:600;font-size:14px">Vista breytingar</button></div>';
  ov.appendChild(box);document.body.appendChild(ov);_modal=ov;
  function close(){ov.remove();_modal=null;}
  document.getElementById('_ej_x').onclick=close;
  document.getElementById('_ej_cancel').onclick=close;
  ov.onclick=function(e){if(e.target===ov)close();};
  document.getElementById('_ej_save').onclick=function(){
    var update={
      customer:document.getElementById('_ej_name').value.trim(),
      phone:document.getElementById('_ej_phone').value.trim(),
      dropoff:document.getElementById('_ej_drop').value||null,
      pickup:document.getElementById('_ej_pick').value||null,
      notes:document.getElementById('_ej_notes').value.trim(),
      verd:parseInt(document.getElementById('_ej_verd').value,10)||0
    };
    DB.sb.from('verkbeidnir').update(update).eq('id',job.id).then(function(r){
      if(r.error){alert('Villa: '+r.error.message);return;}
      close();
      if(window.App && App.refresh) App.refresh();
      else if(window.location){window.location.reload();}
    });
  };
}
function injectButton(){
  var actions=document.querySelector('.jd-actions');
  if(!actions || actions.querySelector('._ej_btn')) return;
  var prenta=Array.from(actions.querySelectorAll('button')).find(function(b){return /Prenta/.test(b.textContent);});
  var btn=document.createElement('button');
  btn.className='_ej_btn btn btn-outline btn-sm';
  btn.style.cssText='margin-right:6px;display:inline-flex;align-items:center;gap:6px;';
  btn.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:13px;height:13px"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>Breyta';
  btn.onclick=openEditModal;
  if(prenta) prenta.parentNode.insertBefore(btn,prenta);
  else actions.appendChild(btn);
}
var mo=new MutationObserver(function(){injectButton();});
mo.observe(document.body,{childList:true,subtree:true});
setInterval(injectButton,1500);
injectButton();
console.log('[EditJobButton] loaded');
})();