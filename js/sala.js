// sala.js stub — creates view-sala + Sala nav button. POS v3 handles rendering.
(function(){
  'use strict';
  function ensureViewSala(){
    if(!document.getElementById('view-sala')){
      var v = document.createElement('section');
      v.id = 'view-sala'; v.className = 'view';
      var ref = document.getElementById('view-counter') || document.body.firstChild;
      if(ref && ref.parentElement){ ref.parentElement.insertBefore(v, ref); }
      else { document.body.appendChild(v); }
    }
  }
  function injectSalaNav(){
    var nav = document.querySelector('nav.view-nav');
    if(!nav) return;
    if(document.querySelector('[data-view="sala"]')) return;
    var btn = document.createElement('button');
    btn.className = 'vnav-btn';
    btn.setAttribute('data-view','sala');
    btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><rect x="1" y="3" width="15" height="13" rx="2"/><path d="M16 8h4a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6"/><circle cx="8" cy="21" r="1"/><circle cx="18" cy="21" r="1"/><line x1="5" y1="7" x2="12" y2="7"/><line x1="5" y1="10" x2="10" y2="10"/></svg> <span>Sala</span>';
    btn.style.cssText = 'display:flex;align-items:center;gap:8px';
    btn.onclick = function(){ App.switchView('sala'); };
    var daglegLabel = Array.from(nav.querySelectorAll('.nav-section-label')).find(function(d){return d.textContent.trim()==='Dagleg vinna';});
    if(daglegLabel && daglegLabel.nextElementSibling){
      nav.insertBefore(btn, daglegLabel.nextElementSibling);
    } else {
      var afgreidsla = document.querySelector('[data-view="counter"]');
      if(afgreidsla) nav.insertBefore(btn, afgreidsla);
      else nav.appendChild(btn);
    }
  }
  function setSalaAsLanding(){
    // Land on Sala by default. Skip if another view is already active (user
    // may have clicked something during page load) or if the URL hash points
    // somewhere else.
    var anyActive = document.querySelector('.view.active');
    if (anyActive) return;
    if (location.hash && /^#?view-/.test(location.hash)) return;
    // 2026-07-28: vörnin náði AÐEINS yfir gamla „#view-…"-formið, svo hreinu
    // slug-hössin sem patch 218 býr til (#rekstrarfelog, #bakendi, #verkbord …)
    // fóru beint í gegn og lentu á Sölu. Sama regla og 154/218 nota: hash án
    // '=' og án '/' er beiðni notandans um ákveðna síðu.
    var h = (location.hash || '').replace(/^#/, '');
    if (h && h.indexOf('=') === -1 && h.indexOf('/') === -1) return;
    if (window.App && typeof App.switchView === 'function') {
      App.switchView('sala');
    }
  }
  function init(){
    ensureViewSala(); injectSalaNav();
    // Defer landing to next tick so all view-creators (sala.js itself + any
    // patch that injects views) have run before we activate one.
    setTimeout(setSalaAsLanding, 0);
  }
  if(document.readyState === 'loading'){ document.addEventListener('DOMContentLoaded', init); }
  else { init(); }
  console.log('[sala.js stub v3] view-sala + nav + default landing');
})();
