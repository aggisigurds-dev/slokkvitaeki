/* Kennitala field — injects kennitala input into #modal-newjob with auto-lookup */
(function(){'use strict';
var _companies=null,_loadTime=0;
async function loadCompanies(){
  if(_companies && Date.now()-_loadTime<30000) return _companies;
  _loadTime=Date.now();
  _companies=await DB.fetchAll(function(from,to){ return DB.sb.from('fyrirtaeki').select('nafn,kennitala,simi,heimilisfang').range(from,to); });  // page through 1000-row cap
  return _companies;
}
function fmtKt(v){var s=String(v||'').replace(/[^0-9]/g,'');if(s.length<=6)return s;return s.slice(0,6)+'-'+s.slice(6,10);}
function cleanKt(v){return String(v||'').replace(/[^0-9]/g,'');}
async function lookupKt(raw){
  var c=cleanKt(raw);if(c.length<7)return null;
  var companies=await loadCompanies();
  return companies.find(function(x){return cleanKt(x.kennitala)===c;})||null;
}
function injectField(modal){
  if(modal.dataset._ktInjected==='1')return;
  var bd=modal.querySelector('.modal-bd');if(!bd)return;
  var phoneInput=modal.querySelector('#nj-phone');if(!phoneInput)return;
  var phoneLabel=null;
  var node=phoneInput;
  while(node && node.parentElement){node=node.parentElement;if(node===bd)break;var prev=node.previousElementSibling;if(prev && prev.tagName==='LABEL'){phoneLabel=prev;break;}if(node.previousElementSibling && node.previousElementSibling.querySelector && node.previousElementSibling.querySelector('label')){phoneLabel=node.previousElementSibling;break;}}
  var nameInput=modal.querySelector('#nj-name');
  var anchor=nameInput?nameInput.parentElement:phoneInput.parentElement;
  while(anchor && anchor.parentElement && anchor.parentElement!==bd){anchor=anchor.parentElement;}
  var label=document.createElement('label');label.className='fl';label.textContent='Kennitala';label.style.display='block';label.style.marginTop='10px';
  var input=document.createElement('input');input.className='fi';input.id='nj-kennitala';input.type='text';input.placeholder='123456-7890';input.maxLength=11;input.inputMode='numeric';input.style.width='100%';input.style.boxSizing='border-box';
  var hint=document.createElement('div');hint.id='nj-kt-hint';hint.style.cssText='font-size:11px;color:#6b7280;margin-top:3px;min-height:14px;';
  anchor.parentElement.insertBefore(label,anchor);
  anchor.parentElement.insertBefore(input,anchor);
  anchor.parentElement.insertBefore(hint,anchor);
  input.addEventListener('input',function(e){
    var v=fmtKt(e.target.value);
    e.target.value=v;
    hint.textContent='';hint.style.color='#6b7280';
    var c=cleanKt(v);
    if(c.length===10){
      lookupKt(c).then(function(co){
        if(co){
          hint.textContent='✓ '+co.nafn+(co.heimilisfang?' — '+co.heimilisfang:'');
          hint.style.color='#059669';
          var ni=modal.querySelector('#nj-name');if(ni && !ni.value){ni.value=co.nafn;ni.dispatchEvent(new Event('input',{bubbles:true}));}
          var pi=modal.querySelector('#nj-phone');if(pi && !pi.value && co.simi){pi.value=co.simi;pi.dispatchEvent(new Event('input',{bubbles:true}));}
        } else {
          hint.textContent='Kennitala fannst ekki í kerfinu — skráð sem ný';
          hint.style.color='#f59e0b';
        }
      });
    }
  });
  // Hook into save — prepend kennitala to notes when form is submitted
  var saveBtn=modal.querySelector('button.btn-primary, button[class*="primary"], #nj-save, button[id*="save"]');
  if(!saveBtn){
    var footer=modal.querySelector('.modal-ft');
    if(footer){
      var btns=footer.querySelectorAll('button');
      for(var i=0;i<btns.length;i++){if(/Stofna|Vista|Save/i.test(btns[i].textContent)){saveBtn=btns[i];break;}}
    }
  }
  if(saveBtn && !saveBtn.dataset._ktHook){
    saveBtn.dataset._ktHook='1';
    saveBtn.addEventListener('click',function(){
      var ktVal=input.value.trim();
      if(!ktVal)return;
      var notes=modal.querySelector('#nj-notes, textarea[id*="note"], textarea[placeholder*="Valfrjálst"]');
      if(notes){
        var cur=notes.value||'';
        if(cur.indexOf('Kt:')<0){
          notes.value='Kt: '+ktVal+(cur?'\n'+cur:'');
          notes.dispatchEvent(new Event('input',{bubbles:true}));
          notes.dispatchEvent(new Event('change',{bubbles:true}));
        }
      }
    },true);
  }
  modal.dataset._ktInjected='1';
  console.log('[KennitalaField] injected');
}
function observe(){
  var mo=new MutationObserver(function(muts){
    var m=document.getElementById('modal-newjob');
    if(m && m.classList.contains('open') && m.dataset._ktInjected!=='1'){setTimeout(function(){injectField(m);},30);}
  });
  mo.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
  setInterval(function(){var m=document.getElementById('modal-newjob');if(m && m.classList.contains('open') && m.dataset._ktInjected!=='1')injectField(m);},1200);
}
observe();
console.log('[KennitalaField] module loaded');
})();