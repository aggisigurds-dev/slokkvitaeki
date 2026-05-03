/* Mobile nav v3 - bulletproof inline styles, doesn't depend on external CSS */
(function(){'use strict';
function isMobile(){return window.innerWidth<=900;}
function styleEl(el,css){for(var k in css){el.style.setProperty(k,css[k]);}}
function ensureBackdrop(){
  var bd=document.getElementById('_mnav_bd');
  if(!bd){
    bd=document.createElement('div');
    bd.id='_mnav_bd';
    bd.style.cssText='position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.45);z-index:8998;display:none;-webkit-tap-highlight-color:transparent;';
    bd.addEventListener('click',closeNav,false);
    document.body.appendChild(bd);
  }
  return bd;
}
function ensureBtn(){
  var btn=document.getElementById('_mnav_btn');
  if(!btn){
    btn=document.createElement('button');
    btn.id='_mnav_btn';
    btn.type='button';
    btn.setAttribute('aria-label','Valmynd');
    btn.innerHTML='☰';
    btn.addEventListener('click',function(e){e.preventDefault();e.stopPropagation();if(document.body.classList.contains('mobile-nav-open'))closeNav();else openNav();},false);
    document.body.appendChild(btn);
  }
  // Apply inline styles every tick - no CSS dependency
  var show=isMobile();
  btn.style.cssText='display:'+(show?'flex':'none')+';position:fixed;top:10px;left:'+(document.body.classList.contains('mobile-nav-open')?'270px':'10px')+';width:44px;height:44px;background:#fff;border:1px solid #e5e7eb;border-radius:10px;z-index:9999;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 2px 10px rgba(0,0,0,.15);font-size:22px;padding:0;line-height:1;color:#111;transition:left .2s;';
  return btn;
}
function applyTopbarStyles(){
  var tb=document.querySelector('.topbar');
  if(!tb)return;
  if(isMobile()){
    var open=document.body.classList.contains('mobile-nav-open');
    tb.style.setProperty('position','fixed','important');
    tb.style.setProperty('top','0','important');
    tb.style.setProperty('left','0','important');
    tb.style.setProperty('bottom','0','important');
    tb.style.setProperty('height','100vh','important');
    tb.style.setProperty('width','260px','important');
    tb.style.setProperty('z-index','9000','important');
    tb.style.setProperty('overflow-y','auto','important');
    tb.style.setProperty('transform',open?'translateX(0)':'translateX(-100%)','important');
    tb.style.setProperty('transition','transform .25s ease','important');
    tb.style.setProperty('box-shadow','2px 0 24px rgba(0,0,0,.25)','important');
    // Push views to full width
    document.querySelectorAll('.view').forEach(function(v){v.style.setProperty('margin-left','0','important');v.style.setProperty('padding-top','60px','important');});
  }
}
function openNav(){
  document.body.classList.add('mobile-nav-open');
  document.body.style.overflow='hidden';
  ensureBackdrop().style.display='block';
  ensureBtn().innerHTML='✕';
  applyTopbarStyles();
  ensureBtn();
}
function closeNav(){
  document.body.classList.remove('mobile-nav-open');
  document.body.style.overflow='';
  ensureBackdrop().style.display='none';
  var b=document.getElementById('_mnav_btn');if(b)b.innerHTML='☰';
  applyTopbarStyles();
  ensureBtn();
}
// Auto-close when nav-item tapped
document.addEventListener('click',function(e){
  if(!isMobile())return;
  if(!document.body.classList.contains('mobile-nav-open'))return;
  var navBtn=e.target && e.target.closest && e.target.closest('.vnav-btn');
  if(navBtn)setTimeout(closeNav,150);
},false);
document.addEventListener('keydown',function(e){if(e.key==='Escape' && document.body.classList.contains('mobile-nav-open'))closeNav();});
window.addEventListener('resize',function(){if(!isMobile() && document.body.classList.contains('mobile-nav-open'))closeNav();applyTopbarStyles();ensureBtn();});
function init(){ensureBackdrop();ensureBtn();applyTopbarStyles();}
init();
setInterval(init,1500);
console.log('[MobileNav v3] loaded - inline styles, isMobile='+isMobile()+' innerWidth='+window.innerWidth);
})();