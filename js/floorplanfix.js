// FloorPlanFix v2: corrects coords + overlays markers on existing #co-fp-section canvas
(function(){
  'use strict';

  function waitForFP(cb){
    var attempts = 0;
    var iv = setInterval(function(){
      attempts++;
      if(window.FloorPlan && window.FloorPlan._renderCanvas){
        clearInterval(iv);
        cb();
      } else if(attempts > 60){ clearInterval(iv); }
    }, 200);
  }

  function patchedRender(){
    var main = document.getElementById('fp-main');
    var canvas = document.getElementById('fp-canvas');
    if(!main || !canvas || !this.bgImage) return;
    var img = this.bgImage;
    var iw = img.naturalWidth || img.width || main.offsetWidth;
    var ih = img.naturalHeight || img.height || 400;
    var cw = iw, ch = ih;
    canvas.width = cw;
    canvas.height = ch;
    var sc = Math.min((main.offsetWidth-10)/cw, (main.offsetHeight-10)/ch);
    if(sc > 0 && isFinite(sc)){
      canvas.style.width = (cw*sc) + 'px';
      canvas.style.height = (ch*sc) + 'px';
    }
    var ctx = canvas.getContext('2d');
    ctx.clearRect(0,0,cw,ch);
    ctx.drawImage(img,0,0,cw,ch);
    var plan = this.plans && this.plans[this.companyId];
    if(plan && plan.markers && plan.markers.length){
      var mr = Math.max(8, Math.round(cw/120));
      plan.markers.forEach(function(mk){
        var x = mk.x || 0, y = mk.y || 0;
        var mx, my;
        if(x > 1 || y > 1){ mx = x; my = y; }
        else { mx = x * cw; my = y * ch; }
        ctx.beginPath();
        ctx.arc(mx, my, mr, 0, 2*Math.PI);
        ctx.fillStyle = mk.color || '#c93c1d';
        ctx.fill();
        ctx.strokeStyle = 'white';
        ctx.lineWidth = Math.max(2, mr/3);
        ctx.stroke();
      });
    }
  }

  var currentCoId = null;
  function hookCompanies(){
    if(!window.Companies || !window.Companies.openDetail) return false;
    var orig = window.Companies.openDetail;
    if(orig._fpfixHooked) return true;
    window.Companies.openDetail = function(id){
      currentCoId = id;
      if(window.FloorPlan && window.FloorPlan.plans && !window.FloorPlan.plans[id]){
        try {
          var raw = localStorage.getItem('fp_'+id);
          if(raw){ window.FloorPlan.plans[id] = JSON.parse(raw); }
        } catch(e){}
      }
      return orig.apply(this, arguments);
    };
    window.Companies.openDetail._fpfixHooked = true;
    return true;
  }

  function overlayMarkers(){
    if(!currentCoId) return;
    var section = document.getElementById('co-fp-section');
    if(!section) return;
    var canvas = section.querySelector('canvas');
    if(!canvas || !canvas.width || !canvas.height) return;
    if(window.FloorPlan && window.FloorPlan.plans && !window.FloorPlan.plans[currentCoId]){
      try {
        var raw = localStorage.getItem('fp_'+currentCoId);
        if(raw){ window.FloorPlan.plans[currentCoId] = JSON.parse(raw); }
      } catch(e){}
    }
    var plan = window.FloorPlan && window.FloorPlan.plans ? window.FloorPlan.plans[currentCoId] : null;
    if(!plan || !plan.markers || !plan.markers.length) return;
    if(canvas.dataset.fpfixCoid === String(currentCoId) && canvas.dataset.fpfixMarked === '1') return;
    var ctx = canvas.getContext('2d');
    var cw = canvas.width, ch = canvas.height;
    var mr = Math.max(10, Math.round(cw/100));
    plan.markers.forEach(function(mk){
      var x = mk.x || 0, y = mk.y || 0;
      var mx, my;
      if(x > 1 || y > 1){ mx = x; my = y; }
      else { mx = x * cw; my = y * ch; }
      ctx.beginPath();
      ctx.arc(mx, my, mr, 0, 2*Math.PI);
      ctx.fillStyle = mk.color || '#c93c1d';
      ctx.fill();
      ctx.strokeStyle = 'white';
      ctx.lineWidth = Math.max(2, mr/3);
      ctx.stroke();
    });
    canvas.dataset.fpfixCoid = String(currentCoId);
    canvas.dataset.fpfixMarked = '1';
    Array.from(section.querySelectorAll('*')).forEach(function(el){
      if(el.children.length === 0 && /^TEIKNING\s*$/i.test(el.textContent.trim())){
        el.textContent = 'TEIKNING · ' + plan.markers.length + ' staðsetningar';
      }
    });
  }

  function watchOverlay(){
    setInterval(function(){
      var view = document.getElementById('view-companies');
      if(!view || !view.classList.contains('active')) return;
      var section = document.getElementById('co-fp-section');
      if(!section) return;
      var canvas = section.querySelector('canvas');
      if(!canvas) return;
      try {
        if(canvas.dataset.fpfixCoid !== String(currentCoId)){
          canvas.dataset.fpfixMarked = '';
        }
        overlayMarkers();
      } catch(e){}
    }, 600);
  }

  function cleanupOldThumbs(){
    setInterval(function(){
      Array.from(document.querySelectorAll('.fpfix-thumb')).forEach(function(el){
        el.parentNode && el.parentNode.removeChild(el);
      });
    }, 800);
  }

  function init(){
    waitForFP(function(){
      window.FloorPlan._renderCanvas = patchedRender;
      console.log('[FloorPlanFix v2] Patched _renderCanvas + overlay watcher');
    });
    var hookIv = setInterval(function(){
      if(hookCompanies()) clearInterval(hookIv);
    }, 200);
    watchOverlay();
    cleanupOldThumbs();
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();