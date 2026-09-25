/* QR Tag - attach a scanned QR code to an existing lánstæki or geymsla item */
(function(){'use strict';
function findSerialInput(modal){
  // Try common id/name patterns first
  var candidates=['_el_serial','_eu_serial','lt-serial','gy-serial','serial'];
  for(var i=0;i<candidates.length;i++){
    var el=modal.querySelector('#'+candidates[i]);if(el)return el;
  }
  // Fall back to finding by label text
  var labels=modal.querySelectorAll('label,.fl,[class*="label"]');
  for(var j=0;j<labels.length;j++){
    if(/Raðnúmer/i.test(labels[j].textContent)){
      var next=labels[j].nextElementSibling;
      if(next){
        if(next.tagName==='INPUT')return next;
        var inp=next.querySelector('input');if(inp)return inp;
      }
      // Try parent's input
      var par=labels[j].parentElement;
      if(par){var pi=par.querySelector('input');if(pi && pi!==labels[j])return pi;}
    }
  }
  return null;
}
function injectTengja(modal){
  if(modal.dataset._qtInjected==='1')return;
  var serialInput=findSerialInput(modal);
  if(!serialInput)return;
  // Build wrapper around input
  if(serialInput.dataset._qtWrapped==='1')return;
  var btn=document.createElement('button');
  btn.type='button';
  btn.className='_qt_btn';
  btn.innerHTML='📷 Skanna';
  btn.title='Skanna QR kóða og tengja við þetta tæki';
  btn.style.cssText='margin-left:6px;padding:8px 12px;background:#7c3aed;color:#fff;border:none;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;vertical-align:middle;display:inline-flex;align-items:center;gap:4px;white-space:nowrap;';
  btn.onclick=function(e){
    e.preventDefault();e.stopPropagation();
    if(typeof window.openQRScanner!=='function'){alert('QR skanni ekki tilbúinn');return;}
    window.openQRScanner(function(scanned){
      serialInput.value=scanned;
      serialInput.dispatchEvent(new Event('input',{bubbles:true}));
      serialInput.dispatchEvent(new Event('change',{bubbles:true}));
      // Flash green briefly
      var oldBorder=serialInput.style.border;
      serialInput.style.border='2px solid #10b981';
      setTimeout(function(){serialInput.style.border=oldBorder;},1000);
    });
  };
  // Position: wrap input in flex div with button next to it
  var parent=serialInput.parentElement;
  if(parent){
    var wrap=document.createElement('div');
    wrap.style.cssText='display:flex;gap:0;align-items:center;';
    serialInput.style.flex='1';
    parent.insertBefore(wrap,serialInput);
    wrap.appendChild(serialInput);
    wrap.appendChild(btn);
  }
  serialInput.dataset._qtWrapped='1';
  modal.dataset._qtInjected='1';
  console.log('[QRTag] injected on modal',modal.id||modal.className);
}
function scanModals(tops){
  // Look for any currently open edit modal containing Raðnúmer
  var candidates=document.querySelectorAll('.modal.open, [id^="modal-"].open, [role="dialog"]:not([style*="display: none"])');
  // Also plain open overlays we built (div with z-index) — aðeins þau börn body sem breyttust
  var overlays=(tops||[]).filter(function(el){
    if(!el.isConnected||el.parentElement!==document.body)return false;
    if(el.tagName!=='DIV')return false;
    if(el.dataset&&el.dataset._qtInjected)return false;
    if(el.classList&&(el.classList.contains('view')||el.classList.contains('topbar')))return false;
    if(!el.querySelector('input'))return false;          // ódýrt: ekkert inntak → ekkert Raðnúmer-reit
    var cs=getComputedStyle(el);
    if(cs.position!=='fixed')return false;
    if(parseInt(cs.zIndex,10)<100)return false;
    return /Breyta|Raðnúmer/i.test(el.textContent||'');
  });
  var all=[].concat(Array.from(candidates),overlays);
  all.forEach(function(m){
    if(m.dataset&&m.dataset._qtInjected)return;
    // Make sure it has Raðnúmer label
    if(/Raðnúmer/i.test(m.textContent||'')) injectTengja(m);
  });
}
// 25.09.2026 (afköst): áður keyrði scanModals við HVERJA class/style-breytingu hvar
// sem er í body (getComputedStyle á ÖLL börn body + textContent á yfirlögum) og auk
// þess á 1,5 s fresti — 2,7 s af 20 s aðalþráðar á Ársskoðun. Nú: aðeins börn body
// sem breyttust (eða modalar), mest einu sinni á 250 ms, og engin sífelld klukka.
var _qtT=null, _qtTops=new Set(), _qtModal=false;
function schedScan(){ if(_qtT)return; _qtT=setTimeout(function(){ _qtT=null; var t=Array.from(_qtTops); _qtTops.clear(); var m=_qtModal; _qtModal=false; if(t.length||m) scanModals(t); },250); }
function note(m){
  var t=m.target;
  if(t===document.body){
    for(var i=0;i<m.addedNodes.length;i++){ var n=m.addedNodes[i]; if(n.nodeType===1){ _qtTops.add(n); } }
    return m.addedNodes.length>0;
  }
  if(t.nodeType!==1)return false;
  if(t.closest&&t.closest('.modal,[id^="modal-"],[role="dialog"]')){ _qtModal=true; return true; }
  // Finna efsta forföður (barn body). Breytingar inni í sýnum og topbar skipta engu hér.
  var top=t;
  while(top.parentElement&&top.parentElement!==document.body)top=top.parentElement;
  if(top.parentElement!==document.body)return false;
  if(top.classList&&(top.classList.contains('view')||top.classList.contains('topbar')))return false;
  _qtTops.add(top); return true;
}
var mo=new MutationObserver(function(ms){ var any=false; for(var i=0;i<ms.length;i++){ if(note(ms[i]))any=true; } if(any)schedScan(); });
mo.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class','style']});
console.log('[QRTag] module loaded');
})();