/* Skanna QR button in Geymsla view - scan a sticker, find matching uttaeki, open Breyta */
(function(){'use strict';
function ensureBtn(){
  var view=document.getElementById('view-geymsla');
  if(!view)return;
  if(view.querySelector('#_gys_btn'))return;
  var skra=Array.from(view.querySelectorAll('button')).find(function(b){return /Skrá tæki/.test(b.textContent.trim());});
  if(!skra)return;
  var btn=document.createElement('button');
  btn.id='_gys_btn';
  btn.type='button';
  btn.className='btn btn-sm';
  btn.style.cssText='background:#7c3aed;color:#fff;border:none;padding:8px 14px;border-radius:8px;font-weight:600;font-size:13px;cursor:pointer;margin-left:6px;display:inline-flex;align-items:center;gap:5px;';
  btn.innerHTML='📷 Skanna QR';
  btn.title='Skannaðu QR á tæki til að opna eða breyta';
  btn.onclick=function(e){
    e.preventDefault();e.stopPropagation();
    if(typeof window.openQRScanner!=='function'){alert('QR skanni ekki tilbúinn. Endurhladdu síðunni.');return;}
    window.openQRScanner(async function(serial){
      // Look up uttaeki by serial
      try {
        var r=await DB.sb.from('uttaeki').select('*').eq('serial',serial).limit(1);
        if(r.error){alert('Villa við leit: '+r.error.message);return;}
        if(!r.data || r.data.length===0){
          if(confirm('Engin tæki fannst með raðnúmer ' + serial + '.\n\nVilltu skrá nýtt tæki með þessu raðnúmeri?')){
            // Open Skrá tæki modal and prefill serial
            var skra=Array.from(document.querySelectorAll('button')).find(function(b){return /Skrá tæki/.test(b.textContent.trim()) && b.offsetHeight>0;});
            if(skra)skra.click();
            setTimeout(function(){
              var inputs=document.querySelectorAll('input');
              for(var i=0;i<inputs.length;i++){
                var lbl=inputs[i].previousElementSibling;
                if(lbl && /Raðnúmer/i.test(lbl.textContent||'')){inputs[i].value=serial;inputs[i].dispatchEvent(new Event('input',{bubbles:true}));break;}
              }
            },400);
          }
          return;
        }
        var unit=r.data[0];
        // Found! Try to scroll to its row and open Breyta
        var rows=document.querySelectorAll('#view-geymsla tbody tr');
        var foundRow=null;
        rows.forEach(function(tr){if(tr.textContent.indexOf(serial)>=0)foundRow=tr;});
        if(foundRow){
          foundRow.scrollIntoView({behavior:'smooth',block:'center'});
          foundRow.style.background='#fef3c7';
          setTimeout(function(){foundRow.style.background='';},2000);
          // Click its Breyta button
          var br=foundRow.querySelector('button.btn, button[class*="breyta"]');
          var breytaBtn=Array.from(foundRow.querySelectorAll('button')).find(function(b){return /Breyta/.test(b.textContent.trim());});
          if(breytaBtn){setTimeout(function(){breytaBtn.click();},600);}
        } else {
          alert('Tæki '+serial+' fannst í gagnagrunni en ekki í geymslulista.\nStaða: '+(unit.status||'óþekkt'));
        }
      } catch(e){
        console.error('[GeymslaScan]',e);
        alert('Villa: '+e.message);
      }
    });
  };
  // Insert after Skrá tæki
  if(skra.parentNode){skra.parentNode.insertBefore(btn,skra.nextSibling);}
  console.log('[GeymslaScan] button injected');
}
setInterval(ensureBtn,1500);
setTimeout(ensureBtn,800);
})();