/* Defensive wrapper for Companies.submitNew - adds toast feedback + reliable list refresh */
(function(){'use strict';
function showToast(msg,kind){
  var t=document.createElement('div');
  var bg = kind==='err' ? '#dc2626' : kind==='ok' ? '#10b981' : '#374151';
  t.style.cssText='position:fixed;top:20px;left:50%;transform:translateX(-50%);background:'+bg+';color:#fff;padding:14px 22px;border-radius:10px;z-index:99999;font-weight:600;font-size:14px;box-shadow:0 4px 16px rgba(0,0,0,.3);max-width:90vw;';
  t.textContent=msg;
  document.body.appendChild(t);
  setTimeout(function(){t.style.transition='opacity .4s';t.style.opacity='0';setTimeout(function(){t.remove();},500);}, 2800);
}
function wrap(){
  if(!window.Companies || !Companies.submitNew){setTimeout(wrap,300);return;}
  if(Companies.submitNew._wrapped){return;}
  Companies.submitNew = async function(){
    var btn = Array.from(document.querySelectorAll('button')).find(function(b){return /Vista fyrirtæki/.test(b.textContent.trim()) && b.offsetHeight>0;});
    if(btn){btn.disabled=true;btn.style.opacity='.6';btn.dataset._origText=btn.textContent;btn.textContent='Vistar...';}
    function restoreBtn(){if(btn){btn.disabled=false;btn.style.opacity='';if(btn.dataset._origText){btn.textContent=btn.dataset._origText;}}}
    try {
      var nafn = (document.getElementById('nf-nafn')||{}).value || '';
      nafn = nafn.trim();
      if(!nafn){restoreBtn();showToast('Sláðu inn nafn','err');return;}
      var data = {
        nafn: nafn,
        kennitala: ((document.getElementById('nf-kt')||{}).value||'').trim(),
        simi: ((document.getElementById('nf-simi')||{}).value||'').trim(),
        netfang: ((document.getElementById('nf-netfang')||{}).value||'').trim(),
        tengiliður: ((document.getElementById('nf-tengiliður')||{}).value||'').trim(),
        heimilisfang: ((document.getElementById('nf-heimilisfang')||{}).value||'').trim(),
        athugasemdir: ((document.getElementById('nf-athugasemdir')||{}).value||'').trim()
      };
      if(!window.DB || !DB.online || !DB.sb){
        restoreBtn();showToast('Engin nettenging','err');return;
      }
      var r = await DB.sb.from('fyrirtaeki').insert(data).select().single();
      if(r.error){
        restoreBtn();showToast('Villa: '+(r.error.message||r.error),'err');console.error('[saveCompany]',r.error);return;
      }
      // Success: push to list, close modal, refresh view
      if(Companies.list && Array.isArray(Companies.list)){Companies.list.push(r.data);}
      try { if(Companies.render) Companies.render(); } catch(e){console.warn(e);}
      // Close modal
      var modal=document.getElementById('modal-nyfyrirtaeki');
      if(modal){modal.classList.remove('open');modal.style.display='none';}
      else if(window.Modal && Modal.close){try{Modal.close('modal-nyfyrirtaeki');}catch(e){}}
      // Clear inputs
      ['nf-nafn','nf-kt','nf-simi','nf-netfang','nf-tengiliður','nf-heimilisfang','nf-athugasemdir'].forEach(function(id){var el=document.getElementById(id);if(el)el.value='';});
      restoreBtn();
      showToast('✓ '+nafn+' vistað','ok');
      // Force list refresh on next tick
      setTimeout(function(){
        if(window.App && App.switchView){App.switchView('companies');}
      }, 200);
    } catch(e){
      restoreBtn();
      showToast('Villa: '+(e.message||e),'err');
      console.error('[saveCompany] threw',e);
    }
  };
  Companies.submitNew._wrapped=true;
  console.log('[FixCompanySave] wrapped Companies.submitNew');
}
wrap();
})();