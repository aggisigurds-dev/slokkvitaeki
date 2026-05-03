/* Afgreiðsla sidebar search filter */
(function(){'use strict';
function inject(){
  var sidebar=document.getElementById('counter-sidebar');
  if(!sidebar || document.getElementById('_srch_box'))return;
  var hdr=sidebar.querySelector('[class*="sidebar-hdr"],[class*="sidebar-head"],[class*="vb-hdr"],h2,h3');
  if(!hdr)hdr=sidebar.firstElementChild;
  if(!hdr)return;
  var wrap=document.createElement('div');
  wrap.style.cssText='padding:6px 8px 2px;';
  var inp=document.createElement('input');
  inp.id='_srch_box';
  inp.type='text';
  inp.placeholder='🔎 Leita í verkbeiðnum...';
  inp.style.cssText='width:100%;padding:7px 10px;border:1.5px solid rgba(255,255,255,.18);border-radius:8px;background:rgba(255,255,255,.1);color:#fff;font-size:12.5px;box-sizing:border-box;outline:none;';
  inp.addEventListener('input',function(){
    var q=inp.value.toLowerCase().trim();
    var cards=sidebar.querySelectorAll('.jli,.vb-card,[class*="job-"]');
    cards.forEach(function(c){
      var txt=(c.textContent||'').toLowerCase();
      c.style.display = (!q || txt.indexOf(q)>=0) ? '' : 'none';
    });
  });
  // clear on Escape
  inp.addEventListener('keydown',function(e){if(e.key==='Escape'){inp.value='';inp.dispatchEvent(new Event('input'));}});
  wrap.appendChild(inp);
  hdr.parentNode.insertBefore(wrap, hdr.nextSibling);
}
// Retry until sidebar exists
var _t=setInterval(function(){if(document.getElementById('counter-sidebar')){inject();if(document.getElementById('_srch_box'))clearInterval(_t);}},800);
console.log('[SearchBox] loaded');
})();