/* Sett í geymslu - adds button to Tilbúið til afhendingar tiles to move slow-pickup jobs to storage */
(function(){'use strict';
function showShelfDialog(jobId,jobLabel,onConfirm){
  var ov=document.createElement('div');
  ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:10000;display:flex;align-items:center;justify-content:center;padding:20px;';
  var box=document.createElement('div');
  box.style.cssText='background:#fff;border-radius:14px;width:420px;max-width:95vw;display:flex;flex-direction:column;box-shadow:0 12px 40px rgba(0,0,0,.3);';
  var opts='';
  for(var i=1;i<=20;i++){opts+='<option value="G'+i+'">G'+i+'</option>';}
  box.innerHTML='<div style="padding:16px 20px;border-bottom:1px solid #e5e7eb;display:flex;justify-content:space-between;align-items:center"><h2 style="margin:0;font-size:17px">📦 Sett í geymslu</h2><button id="_sg_x" style="background:none;border:none;font-size:20px;cursor:pointer;color:#6b7280">✕</button></div>'+
    '<div style="padding:18px 20px">'+
    '<p style="margin:0 0 14px 0;font-size:13px;color:#6b7280;line-height:1.5">'+jobLabel+'<br>Veldu hilluna sem tækin verða sett í.</p>'+
    '<label style="display:block;font-size:11px;color:#6b7280;text-transform:uppercase;font-weight:700;margin-bottom:4px">Hilla</label>'+
    '<select id="_sg_shelf" style="width:100%;padding:10px 12px;border:1.5px solid #e5e7eb;border-radius:9px;font-size:14px;background:#fff;box-sizing:border-box">'+opts+'</select>'+
    '<div id="_sg_status" style="font-size:12px;color:#6b7280;margin-top:8px;min-height:16px"></div>'+
    '</div>'+
    '<div style="padding:14px 20px;border-top:1px solid #e5e7eb;display:flex;gap:10px;justify-content:flex-end"><button id="_sg_cancel" style="background:#f3f4f6;border:none;padding:10px 18px;border-radius:9px;cursor:pointer;font-size:14px;color:#374151">Hætta við</button><button id="_sg_ok" style="background:#10b981;color:#fff;border:none;padding:10px 18px;border-radius:9px;cursor:pointer;font-weight:600;font-size:14px">📦 Sett í geymslu</button></div>';
  ov.appendChild(box);document.body.appendChild(ov);
  function close(){ov.remove();}
  document.getElementById('_sg_x').onclick=close;
  document.getElementById('_sg_cancel').onclick=close;
  ov.onclick=function(e){if(e.target===ov)close();};
  document.getElementById('_sg_ok').onclick=async function(){
    var shelf=document.getElementById('_sg_shelf').value;
    var st=document.getElementById('_sg_status');
    st.textContent='Vinn úr...';
    try{await onConfirm(shelf);st.textContent='✓ Tilbúið — flutt í geymslu '+shelf;setTimeout(close,1000);}catch(e){st.textContent='Villa: '+e.message;st.style.color='#dc2626';}
  };
}

async function moveJobToStorage(jobId,shelf){
  // Get job + its verklidur (line items)
  var jobRes=await DB.sb.from('verkbeidnir').select('*').eq('id',jobId).single();
  if(!jobRes.data)throw new Error('Verkbeiðni fannst ekki');
  var job=jobRes.data;
  // Get verklidur
  var lineRes=await DB.sb.from('verklidur').select('*').eq('job_id',jobId);
  var lines=lineRes.data||[];
  // For each line item, find or create the matching uttaeki row, set status=geymsla + location
  var loc='Geymsla - '+shelf;
  for(var i=0;i<lines.length;i++){
    var ln=lines[i];
    if(!ln.serial)continue;
    // Try to find matching uttaeki by serial
    var matchRes=await DB.sb.from('uttaeki').select('id').eq('serial',ln.serial);
    if(matchRes.data&&matchRes.data.length>0){
      // Update existing row
      await DB.sb.from('uttaeki').update({status:'geymsla',location:loc,client:job.customer,phone:job.phone||null}).eq('id',matchRes.data[0].id);
    } else {
      // Insert new uttaeki row for this line
      await DB.sb.from('uttaeki').insert({serial:ln.serial,type:ln.type||'Óþekkt',size:ln.size||'-',client:job.customer,location:loc,status:'geymsla',last_insp:new Date().toISOString().slice(0,10),next_insp:new Date(Date.now()+365*86400000).toISOString().slice(0,10),phone:job.phone||null,notes:'Flutt í geymslu úr verki #'+job.num});
    }
  }
  // Update job notes to reflect storage transfer
  var newNotes=(job.notes||'')+(job.notes?'\n':'')+'[Geymsla: '+shelf+' · '+(new Date()).toLocaleDateString('is-IS')+']';
  await DB.sb.from('verkbeidnir').update({notes:newNotes,status:'i_geymslu'}).eq('id',jobId);
  // Refresh UI
  if(window.App && App.refresh) App.refresh();
  else if(window.Counter && Counter.refresh) Counter.refresh();
  else setTimeout(function(){window.location.reload();},800);
}

function injectButtons(){
  var items=document.querySelectorAll('.ready-item');
  items.forEach(function(item){
    if(item.dataset._sgInjected==='1')return;
    var sott=item.querySelector('button.btn-success, button[class*="success"]');
    if(!sott)return;
    var oc=sott.getAttribute('onclick')||'';
    var m=oc.match(/markCollected\((\d+)\)/);
    if(!m)return;
    var jobId=parseInt(m[1],10);
    var nameEl=item.querySelector('.ready-name');
    var metaEl=item.querySelector('.ready-meta');
    var jobLabel=(nameEl?nameEl.textContent:'')+(metaEl?' · '+metaEl.textContent:'');
    var btn=document.createElement('button');
    btn.className='btn btn-sm';
    btn.style.cssText='background:#f59e0b;color:#fff;margin-left:4px;border:none;padding:6px 10px;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;';
    btn.title='Setja í geymslu (ef sækjandi er seinn)';
    btn.innerHTML='📦';
    btn.onclick=function(e){
      e.stopPropagation();
      showShelfDialog(jobId,jobLabel,function(shelf){return moveJobToStorage(jobId,shelf);});
    };
    sott.parentNode.insertBefore(btn,sott);
    item.dataset._sgInjected='1';
  });
}

var mo=new MutationObserver(injectButtons);
mo.observe(document.body,{childList:true,subtree:true});
setInterval(injectButtons,1500);
setTimeout(injectButtons,500);
console.log('[SettIGeymslu] loaded');
})();