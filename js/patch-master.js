/* patch-master.js — unified patches for slokkvitaeki
 * Sections:
 *   0. Helpers (esc, fmtKr, toast, fmtDate)
 *   1. Map / banner / sala-img cosmetic fixes
 *   2. Modal.js renderPrintAside crash guard      [FIX #3]
 *   3. Mobile sidebar with hamburger menu          [FIX #1]
 *   4. POS state accessor (state.lines/etc.)       [FIX #4 helper]
 *   5. "Setja í Reikning" wired to POS state       [FIX #4]
 *   6. Barcode entry on POS sale                   [FIX #6]
 *   7. Hook GREIÐA -> sala_transactions            [FIX #5]
 *   8. Master views: Viðskiptavinir + Reikningar
 *   9. Viðskiptavinir editable inline              [FIX #2]
 *  10. Tekjur period filter
 *  11. Nav wiring & init
 */
(function(){
'use strict';
/* ===== JOBS REALTIME FIX (Afgrei\u00f0sla sync) ===== */
/* The original db.js subscribes to 'realtime:changes' and calls DB.loadAll() on any change.
 * In practice this callback never fires (likely because v9.js's per-table channels
 * supersede it). Result: when Sala POS creates a verkbei\u00f0ni, the cache stays stale
 * and Afgrei\u00f0sla doesn't show the new job until manual page reload.
 *
 * Fix: subscribe directly to verkbei\u00f0nir/uttaeki/lanstaeki changes and call DB.loadAll()
 * with a debounce, then re-render Counter/Workshop/Field views.
 */
(function(){
  var attempts = 0;
  function trySetup(){
    attempts++;
    if(!window.DB || !window.DB.sb || !window.DB.sb.channel || !window.DB.loadAll){
      if(attempts < 30) setTimeout(trySetup, 500);
      return;
    }
    if(window._pmJobsRTReady) return;
    window._pmJobsRTReady = true;

    var refreshTimer = null;
    function debouncedRefresh(reason){
      if(refreshTimer) clearTimeout(refreshTimer);
      refreshTimer = setTimeout(function(){
        refreshTimer = null;
        console.log('[pm-rt] refreshing cache (', reason, ')');
        try {
          var p = window.DB.loadAll();
          if(p && p.then){
            p.then(function(){
              try { if(window.App && window.App.refreshAll) window.App.refreshAll(); } catch(e){}
            });
          } else {
            // Fallback if loadAll isn't async
            setTimeout(function(){
              try { if(window.App && window.App.refreshAll) window.App.refreshAll(); } catch(e){}
            }, 1500);
          }
        } catch(e){ console.warn('[pm-rt] loadAll failed:', e); }
      }, 500);
    }

    // Subscribe to verkbei\u00f0nir, uttaeki, lanstaeki changes
    ['verkbeidnir', 'uttaeki', 'lanstaeki', 'fyrirtaeki', 'vidskiptavinir'].forEach(function(tbl){
      try {
        window.DB.sb.channel('pm_rt_' + tbl)
          .on('postgres_changes', { event:'*', schema:'public', table:tbl }, function(payload){
            debouncedRefresh(tbl + ' ' + payload.eventType);
          })
          .subscribe(function(status){
            if(status === 'SUBSCRIBED') console.log('[pm-rt] subscribed to', tbl);
          });
      } catch(e){ console.warn('[pm-rt] subscribe failed for', tbl, e); }
    });

    console.log('[pm-rt] jobs realtime fix active');
  }
  // Wait for DB to be ready then attach
  trySetup();
})();

/* ===== CAMERA FOCUS FIX (for QR scanner) ===== */
/* Strategy: phone cameras default to a locked focus that often locks far away.
 * We override by locking focus to a NEAR distance (good for QR scanning hand-held).
 * Priority order:
 *   1. Manual focus locked at minimum focusDistance (closest possible)
 *   2. Continuous auto-focus (if manual not supported)
 *   3. Leave camera alone (fallback)
 * Tap on the video to cycle through focus distances.
 */
(function(){
  if(!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return;
  if(navigator.mediaDevices._patchedFocus) return;
  navigator.mediaDevices._patchedFocus = true;

  var origGUM = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);

  function applyNearFocus(track){
    if(!track || !track.getCapabilities) return Promise.resolve();
    var caps = {};
    try { caps = track.getCapabilities() || {}; } catch(e){ return Promise.resolve(); }
    var focusModes = caps.focusMode || [];
    var advanced = [];

    // Strategy 1: manual focus locked at near distance (closest)
    if(focusModes.indexOf && focusModes.indexOf('manual') >= 0 && caps.focusDistance){
      var minDist = caps.focusDistance.min;
      var maxDist = caps.focusDistance.max;
      // Use the closest focus distance the camera supports
      // (typically 0.1m on phones — ideal for ~10–20cm QR scanning)
      // EXTRA MICRO: lock at the absolute closest the camera supports.
      // For most phones, focusDistance.min \u2248 0.1 (10cm) and that is the
      // tightest macro available. We use min directly for sharpest near-focus.
      var nearDist = minDist;
      // If browser exposes 0 as min, that means infinity-near (impossible) \u2014 use a small positive
      if(typeof nearDist !== 'number' || nearDist <= 0) nearDist = 0.05;
      advanced.push({focusMode: 'manual', focusDistance: nearDist});
      track._lastNearDist = nearDist;
      track._focusRange = {min: minDist, max: maxDist};
      console.log('[camera-focus] locked at focusDistance:', nearDist, 'range:', minDist, '-', maxDist);
    }
    // Strategy 2: continuous (auto-refocus on whatever's centered)
    else if(focusModes.indexOf && focusModes.indexOf('continuous') >= 0){
      advanced.push({focusMode: 'continuous'});
    }
    // Strategy 3: single-shot trigger
    else if(focusModes.indexOf && focusModes.indexOf('single-shot') >= 0){
      advanced.push({focusMode: 'single-shot'});
    }

    if(!advanced.length) return Promise.resolve();
    return track.applyConstraints({advanced: advanced}).catch(function(e){
      console.log('[camera-focus] applyConstraints failed:', e.message);
    });
  }

  navigator.mediaDevices.getUserMedia = function(constraints){
    // SAFE MODE: do NOT mutate upfront constraints (some cameras reject
    // manual focusMode and return OverconstrainedError, breaking the scanner).
    // We only apply focus hints AFTER the stream is live, with silent fallback.
    return origGUM(constraints).then(function(stream){
      // Wait briefly for track to stabilize, then apply near focus
      // Wait long enough for video frames to render before fiddling with focus.
      // This prevents 'white screen' caused by re-config during stream startup.
      setTimeout(function(){
        var tracks = stream.getVideoTracks();
        tracks.forEach(function(track){ applyNearFocus(track); });
      }, 1500);
      // Re-apply periodically in case the camera drifts back to far focus
      // (every 5s is gentle enough to avoid disrupting active scanning)
      var reapplyInterval = setInterval(function(){
        var tracks = stream.getVideoTracks();
        if(!tracks.length || tracks[0].readyState !== 'live'){
          clearInterval(reapplyInterval);
          return;
        }
        applyNearFocus(tracks[0]);
      }, 5000);
      // Stop reapplying when stream ends
      stream.addEventListener('inactive', function(){ clearInterval(reapplyInterval); });
      // Wire tap-to-cycle-focus on the video element
      setTimeout(function(){ wireTapToFocus(stream); }, 400);
      return stream;
    });
  };

  function wireTapToFocus(stream){
    var videos = Array.from(document.querySelectorAll('video'));
    videos.forEach(function(v){
      if(v.srcObject !== stream || v._tapFocusWired) return;
      v._tapFocusWired = true;
      v.style.cursor = 'pointer';
      v.title = 'Smelltu til a\u00f0 endurfokusera';
      v.addEventListener('click', function(){
        try {
          var track = stream.getVideoTracks()[0];
          if(!track || !track.getCapabilities) return;
          var caps = track.getCapabilities();
          var focusModes = caps.focusMode || [];
          if(focusModes.indexOf('manual') >= 0 && caps.focusDistance){
            // Cycle focus distance: near → mid → near (loop)
            var min = caps.focusDistance.min, max = caps.focusDistance.max;
            var range = max - min;
            var current = track._lastNearDist || min;
            var next;
            // Cycle: closest \u2192 a bit farther \u2192 medium \u2192 closest again
            if(current <= min + range * 0.05) next = min + range * 0.2; // closest \u2192 a bit farther
            else if(current <= min + range * 0.3) next = min + range * 0.5; // farther \u2192 medium
            else next = min; // medium \u2192 closest
            track._lastNearDist = next;
            track.applyConstraints({advanced:[{focusMode:'manual', focusDistance: next}]}).catch(function(){});
            console.log('[camera-focus] cycled to focusDistance:', next);
          } else if(focusModes.indexOf('single-shot') >= 0){
            track.applyConstraints({advanced:[{focusMode:'single-shot'}]}).catch(function(){});
          } else if(focusModes.indexOf('continuous') >= 0){
            track.applyConstraints({advanced:[{focusMode:'continuous'}]}).catch(function(){});
          }
        } catch(err){}
      });
    });
  }
})();

/* ===== 0. HELPERS ===== */
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function fmtKr(n){return Math.round(n||0).toLocaleString('is-IS');}
function fmtDate(s){if(!s)return'';try{var d=new Date(s);return d.toLocaleDateString('is-IS');}catch(e){return s;}}
function toast(m,c,ms){
  var t=document.createElement('div');
  t.style.cssText='position:fixed;top:80px;left:50%;transform:translateX(-50%);background:'+(c||'#1e293b')+';color:#fff;padding:14px 22px;border-radius:10px;box-shadow:0 4px 20px rgba(0,0,0,.3);z-index:99999;font-weight:600;font-size:14px';
  t.textContent=m;
  document.body.appendChild(t);
  setTimeout(function(){t.style.opacity='0';t.style.transition='opacity .3s';},(ms||2200)-300);
  setTimeout(function(){t.remove();},ms||2200);
}

/* ===== 1. COSMETIC FIXES ===== */
function fixSalaImg(){
  if(document.getElementById('_mIS'))return;
  var s=document.createElement('style');
  s.id='_mIS';
  s.textContent='#view-sala .pos-prod img{object-fit:contain!important;background:#fff!important;border-radius:8px;padding:4px}';
  document.head.appendChild(s);
}
function fixBanner(){
  // Hide setup banner if config looks valid
  var b=document.getElementById('setup-banner');
  if(!b)return;
  if(window.SUPABASE_URL && window.SUPABASE_URL.indexOf('http')===0 && window.SUPABASE_ANON_KEY && window.SUPABASE_ANON_KEY.length>20){
    b.style.display='none';
  }
}

/* ===== 2. MODAL.JS CRASH GUARD ===== [FIX #3] */
/* The error: TypeError: Cannot read properties of undefined (reading 'service')
 * at modal.js:50 in renderPrintAside, called from select() during render().
 * The buggy module is actually `Counter` (modal.js exports Counter, Workshop, Field
 * as globals — NOT a single window.Modal). We wrap each module's renderPrintAside
 * and select to no-op when called with undefined. */
function patchOneModule(modName){
  var mod = window[modName];
  if(!mod || mod._patched) return false;

  // Wrap renderPrintAside so undefined input is safe
  if(typeof mod.renderPrintAside === 'function'){
    var orig = mod.renderPrintAside.bind(mod);
    mod.renderPrintAside = function(job){
      try {
        if(!job || typeof job !== 'object') return; // silently no-op
        if(job.service === undefined) job.service = '';
        return orig(job);
      } catch(e) {
        /* silently skip - bug in modal.js when no jobs loaded */
      }
    };
  }

  // Wrap select() similarly
  if(typeof mod.select === 'function'){
    var origSelect = mod.select.bind(mod);
    mod.select = function(job){
      try {
        if(!job) return;
        return origSelect(job);
      } catch(e) {
        /* silently skip */
      }
    };
  }

  mod._patched = true;
  return true;
}
function patchModalCrash(){
  // The module names found in modal.js: Counter (the buggy one), Workshop, Field
  var any = false;
  ['Counter','Workshop','Field','Modal'].forEach(function(name){
    if(patchOneModule(name)) any = true;
  });
  return any;
}



/* ===== CLONE BANNER TO COUNTER + WORKSHOP TABS ===== */
function addBannerToOtherTabs(){
  var sourceBanner = document.querySelector('#view-sala .pos-banner');
  if(!sourceBanner) return;
  var bannerHTML = sourceBanner.outerHTML;
  ['counter','workshop'].forEach(function(viewId){
    var view = document.getElementById('view-' + viewId);
    if(!view) return;
    if(view.querySelector('.pos-banner')) return; // already has one
    var wrap = document.createElement('div');
    wrap.innerHTML = bannerHTML;
    var banner = wrap.firstElementChild;
    if(!banner) return;
    view.insertBefore(banner, view.firstChild);
    // Ensure layout stacks vertically with banner on top
    view.style.flexDirection = 'column';
    banner.style.width = '100%';
    banner.style.flexShrink = '0';
  });
}

/* ===== FIRE PARTICLES (banner enhancement) ===== */
function setupFireParticles(){
  var banners = document.querySelectorAll('.pos-banner');
  banners.forEach(function(banner){
    if(banner.querySelector('.fire-particle-canvas')) return;
    var canvas = document.createElement('canvas');
    canvas.className = 'fire-particle-canvas';
    canvas.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none;z-index:1;opacity:0.85';
    if(getComputedStyle(banner).position === 'static') banner.style.position = 'relative';
    banner.insertBefore(canvas, banner.firstChild);
    Array.from(banner.children).forEach(function(child){
      if(child !== canvas && getComputedStyle(child).position === 'static'){
        child.style.position = 'relative';
        child.style.zIndex = '2';
      }
    });
    var ctx = canvas.getContext('2d');
    var particles = [];
    var W = 0, H = 0;
    function resize(){
      var rect = banner.getBoundingClientRect();
      if(rect.width === 0) return;
      var dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      W = rect.width; H = rect.height;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    function spawn(){
      particles.push({
        x: Math.random() * W, y: H + 5,
        vx: (Math.random() - 0.5) * 0.4,
        vy: -(0.5 + Math.random() * 1.5),
        life: 0, maxLife: 60 + Math.random() * 60,
        size: 1 + Math.random() * 2.5,
        hue: 15 + Math.random() * 25
      });
    }
    var running = true;
    function frame(){
      if(!running) return;
      var rect = banner.getBoundingClientRect();
      if(rect.width > 0 && (Math.abs(rect.width - W) > 1 || Math.abs(rect.height - H) > 1)) resize();
      if(rect.width === 0){ requestAnimationFrame(frame); return; }
      if(particles.length < 50) spawn();
      if(Math.random() < 0.7) spawn();
      ctx.clearRect(0, 0, W, H);
      for(var i = particles.length - 1; i >= 0; i--){
        var p = particles[i]; p.life++;
        p.x += p.vx; p.y += p.vy;
        p.vy *= 0.99;
        p.vx += (Math.random() - 0.5) * 0.05;
        if(p.life > p.maxLife || p.y < -10){ particles.splice(i, 1); continue; }
        var t = p.life / p.maxLife;
        var alpha = (1 - t) * 0.9;
        var lightness = 60 + (1-t) * 30;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (1 - t * 0.3), 0, Math.PI * 2);
        ctx.fillStyle = 'hsla(' + p.hue + ', 100%, ' + lightness + '%, ' + alpha + ')';
        ctx.shadowBlur = 8;
        ctx.shadowColor = 'hsla(' + p.hue + ', 100%, 50%, ' + alpha + ')';
        ctx.fill();
      }
      ctx.shadowBlur = 0;
      requestAnimationFrame(frame);
    }
    frame();
    window.addEventListener('resize', resize);
  });
}

/* ===== 3. MOBILE SIDEBAR ===== [FIX #1] */
function setupMobileSidebar(){
  if(document.getElementById('_mobnav_style'))return;
  var st=document.createElement('style');
  st.id='_mobnav_style';
  st.textContent =
    '@media (max-width: 820px){' +
      'aside.sidebar{position:fixed!important;top:0;left:0;height:100vh;width:84vw;max-width:320px;z-index:9990;' +
        'transform:translateX(-100%);transition:transform .25s ease;box-shadow:2px 0 24px rgba(0,0,0,.4);}' +
      'aside.sidebar.is-open{transform:translateX(0);}' +
      'body.has-mobnav .topbar{padding-left:54px;}' +
      '#_mobnav_btn{display:flex!important;}' +
      '#_mobnav_back{display:none;}' +
      'body.has-mobnav-open #_mobnav_back{display:block;}' +
      // Make Sala POS layout single-column on phones
      '#view-sala .pos-grid,#view-sala [class*="grid"]{grid-template-columns:1fr!important;}' +
      // Keep main content full width
      '.main-panel{width:100%!important;}' +
    '}' +
    '#_mobnav_btn{display:none;position:fixed;top:10px;left:10px;z-index:9995;width:40px;height:40px;border:none;' +
      'border-radius:8px;background:#0f172a;color:#fff;font-size:22px;cursor:pointer;align-items:center;' +
      'justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,.4);}' +
    '#_mobnav_btn:active{transform:scale(.95);}' +
    '#_mobnav_back{position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9989;display:none;}'+'body.has-mobnav-open #_mobnav_back{display:block;}';
  document.head.appendChild(st);

  // Hamburger button
  var btn=document.createElement('button');
  btn.id='_mobnav_btn';
  btn.setAttribute('aria-label','Opna valmynd');
  btn.innerHTML='&#9776;';
  document.body.appendChild(btn);

  // Backdrop
  var back=document.createElement('div');
  back.id='_mobnav_back';
  document.body.appendChild(back);

  document.body.classList.add('has-mobnav');

  function closeNav(){
    var sb=document.querySelector('aside.sidebar');
    if(sb)sb.classList.remove('is-open');
    document.body.classList.remove('has-mobnav-open');
  }
  function openNav(){
    var sb=document.querySelector('aside.sidebar');
    if(sb)sb.classList.add('is-open');
    document.body.classList.add('has-mobnav-open');
  }
  btn.addEventListener('click',function(e){
    e.stopPropagation();
    var sb=document.querySelector('aside.sidebar');
    if(sb && sb.classList.contains('is-open'))closeNav();
    else openNav();
  });
  back.addEventListener('click',closeNav);

  // Close when a nav button is tapped on mobile
  document.addEventListener('click',function(e){
    var t=e.target.closest('.vnav-btn, button[onclick*="switchView"], a.vnav-btn');
    if(t && window.matchMedia('(max-width: 820px)').matches){
      setTimeout(closeNav,120);
    }
  });
}

/* ===== 4. POS STATE ACCESSOR ===== [FIX #4 helper] */
/* The POS module is an IIFE with `var state` — not exposed globally.
 * We instrument it by hooking the render function once it's available,
 * so we can capture a reference to its state object. */
var _posState = null;
function capturePOSState(){
  // The POS render function calls buildTotalsHTML which reads state internally.
  // We can't reach into the closure directly, but we can read totals from the rendered DOM
  // if rendered by POS, OR we can hook `pos-checkout` which has state in its closure scope.
  // Pragmatic approach: extract the values from the rendered POS dom, but use the
  // structured #pos-totals data attributes that we'll add via patch.

  // First try: see if POS module exposes state somewhere
  if(window.POS && window.POS.state){_posState=window.POS.state;return _posState;}
  if(window._posStateRef){_posState=window._posStateRef;return _posState;}

  // Fallback: inject a hook by overriding addEventListener once on pos-checkout
  // This won't get state, so we extract from DOM data attributes instead.
  return null;
}

/* Read totals reliably from #pos-totals DOM.
 * Even though it's still parsing, the totals box has a stable structure with the
 * total in the LAST .row (or last text containing "Samtals"). We look for explicit
 * data attributes first, fall back to text parse. */
function readPOSTotal(){
  var pt=document.getElementById('pos-totals');
  if(!pt)return 0;
  // 1) Preferred: data attribute set by patched render (see hook below)
  if(pt.dataset && pt.dataset.total){
    var v=parseFloat(pt.dataset.total);
    if(!isNaN(v))return v;
  }
  // 2) Fallback: parse last "Samtals" row
  var rows=pt.querySelectorAll('*');
  var last=0;
  for(var i=0;i<rows.length;i++){
    var r=rows[i];
    if(r.children.length<3 && r.textContent.indexOf('Samtals')>-1){
      var m=r.textContent.match(/([\d.]+)\s*kr/i);
      if(m)last=parseFloat(m[1].replace(/\./g,''));
    }
  }
  return last;
}
function readPOSLines(){
  // Try state first
  var s=capturePOSState();
  if(s && Array.isArray(s.lines))return s.lines.slice();
  // Fallback: parse #pos-lines DOM
  var pl=document.getElementById('pos-lines');
  if(!pl)return [];
  var lines=[];
  pl.querySelectorAll('[data-line]').forEach(function(li){
    try{lines.push(JSON.parse(li.dataset.line));}catch(e){}
  });
  // Final fallback: structural scrape
  if(!lines.length){
    pl.querySelectorAll('.pos-line, [class*="line"]').forEach(function(li){
      var txt=li.textContent || '';
      var price=(txt.match(/([\d.]+)\s*kr/i)||[])[1];
      lines.push({name:txt.split(/\s\d+/)[0].trim().substring(0,40), price: price?parseFloat(price.replace(/\./g,'')):0, qty:1});
    });
  }
  return lines;
}
function readPOSCustomer(){
  var s=capturePOSState();
  if(s && s.customer)return s.customer;
  // Fallback to inputs
  var nafn=document.getElementById('pos-nafn');
  var simi=document.getElementById('pos-simi');
  var kt=document.getElementById('pos-kt');
  return {
    nafn: nafn?nafn.value:'',
    simi: simi?simi.value:'',
    kennitala: kt?kt.value:''
  };
}

/* Hook POS render to write totals to a data attribute every render */
function hookPOSRender(){
  // Best-effort: monkey-patch via observing #pos-totals
  // Each render replaces #pos-totals innerHTML; we observe and re-write data-total.
  var pt=document.getElementById('pos-totals');
  if(!pt || pt._observed)return;
  pt._observed=true;
  var obs=new MutationObserver(function(){
    // Recompute total from textual content and stamp it
    var total=0;
    var rows=pt.querySelectorAll('*');
    for(var i=0;i<rows.length;i++){
      var r=rows[i];
      if(r.children.length<3 && r.textContent.indexOf('Samtals')>-1){
        var m=r.textContent.match(/([\d.]+)\s*kr/i);
        if(m){total=parseFloat(m[1].replace(/\./g,''));}
      }
    }
    if(pt.dataset.total!==String(total)){
      pt.dataset.total=String(total);
    }
  });
  obs.observe(pt,{childList:true,subtree:true,characterData:true});
}

/* ===== 5. SETJA Í REIKNING (uses POS state) ===== [FIX #4] */
function addInvBtn(){
  var co=document.getElementById('pos-checkout');
  if(!co || document.getElementById('pos-invoice'))return;
  var b=document.createElement('button');
  b.id='pos-invoice';
  b.type='button';
  b.textContent='\uD83D\uDCCB Setja \u00ed Reikning';
  b.style.cssText='margin-top:8px;width:100%;padding:14px;border:1px solid #475569;border-radius:10px;background:#1e293b;color:#cbd5e1;font-weight:600;cursor:pointer;font-size:15px';
  b.addEventListener('click',doInv);
  co.parentNode.insertBefore(b, co.nextSibling);
}
function doInv(){
  if(!window.DB || !window.DB.sb){toast('\u274c Ekki tengt','#dc2626');return;}
  var lines = readPOSLines();
  var total = readPOSTotal();
  var customer = readPOSCustomer();

  if(!total || total<=0){toast('Engar v\u00f6rur \u00ed k\u00f6rfu','#dc2626');return;}
  if(!customer.kennitala && !customer.nafn){
    toast('Vantar vi\u00f0skiptavin','#dc2626');return;
  }

  var payload = {
    customer: customer.nafn || ('Vi\u00f0skiptavinur ' + (customer.kennitala||'')),
    kennitala: customer.kennitala || null,
    items: lines,
    total: total,
    invoice_amount: total,
    type: 'invoice',
    status: 'open',
    notes: '',
    created_at: new Date().toISOString()
  };

  window.DB.sb.from('sala_transactions').insert(payload).select().single().then(function(r){
    if(r.error){toast('\u274c '+r.error.message,'#dc2626');return;}
    toast('\u2705 Reikningur stofna\u00f0ur','#16a34a');
    // Optionally clear the POS state
    var clearBtn = document.querySelector('#pos-clear, [onclick*="clear"]');
    if(clearBtn)clearBtn.click();
  });
}

/* ===== 6. BARCODE ENTRY ON SALE ===== [FIX #6] */
/* When a sale completes via GREIÐA, prompt for serial numbers of any
 * fire-extinguisher products in the cart and link them to the customer. */
function promptForBarcodes(saleData, customerInfo){
  // Determine which line items look like extinguishers
  var lines = saleData.items || saleData.linur || [];
  var extLines = lines.filter(function(l){
    var n=(l.name||l.desc||l.heiti||'').toLowerCase();
    // Match only NEW fire extinguisher products (Slökkvitæki...), not refills (Áfylling) or service items
    if(/\u00e1fylling|\u00e1rssko\u00f0un|vi\u00f0hald|vi\u00f0ger\u00f0|veggfesting|eldvarna|reykskynjari/i.test(n)) return false;
    return /sl(\u00f6|o)kkvit\u00e6ki|extinguisher/i.test(n);
  });
  if(!extLines.length)return Promise.resolve();

  return new Promise(function(resolve){
    var modal=document.createElement('div');
    modal.id='barcode-entry-modal';
    modal.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:99998;display:flex;align-items:center;justify-content:center;padding:16px;';
    var box=document.createElement('div');
    box.style.cssText='background:#0f172a;border-radius:14px;padding:24px;max-width:480px;width:100%;color:#cbd5e1;max-height:90vh;overflow:auto;';
    var html='<h3 style="margin:0 0 8px;color:#fff">\uD83D\uDD22 Skr\u00e1\u00f0u ra\u00f0n\u00famer t\u00e6kja</h3>'+
      '<p style="margin:0 0 16px;font-size:13px;opacity:.7">Tengja \u00f6ll keypt sl\u00f6kkvit\u00e6ki vi\u00f0 vi\u00f0skiptavininn. Smelltu \u00e1 "Sleppa" til a\u00f0 hoppa yfir t\u00e6ki.</p>';
    extLines.forEach(function(line, idx){
      var qty = line.qty || line.fjoldi || 1;
      var name = esc(line.name || line.heiti || ('T\u00e6ki ' + (idx+1)));
      for(var q=0; q<qty; q++){
        html += '<div style="margin-bottom:12px;padding:12px;background:#1e293b;border-radius:8px">'+
          '<div style="font-size:13px;margin-bottom:6px;font-weight:600">' + name + ' ('+ (q+1) +'/' + qty + ')</div>' +
          '<div style="display:flex;gap:6px;align-items:stretch">'+
          '<input type="text" class="bc-serial" data-name="' + name + '" placeholder="Ra\u00f0n\u00famer / strikamerki" style="flex:1;padding:10px;border:1px solid #334155;border-radius:6px;background:#0f172a;color:#fff;font-size:14px">' +
          '<button type="button" class="bc-scan" title="Skanna QR/strikamerki" style="padding:0 14px;background:#7c3aed;color:#fff;border:none;border-radius:6px;font-size:18px;cursor:pointer;flex-shrink:0">\uD83D\uDCF7</button>'+
        '</div>' +
        '</div>';
      }
    });
    html += '<div style="display:flex;gap:8px;margin-top:8px">' +
      '<button id="bc-skip" style="flex:1;padding:12px;border:1px solid #475569;border-radius:8px;background:transparent;color:#94a3b8;cursor:pointer">Sleppa</button>' +
      '<button id="bc-save" style="flex:2;padding:12px;border:none;border-radius:8px;background:#16a34a;color:#fff;font-weight:600;cursor:pointer">Vista t\u00e6ki</button>' +
    '</div>';
    box.innerHTML=html;
    modal.appendChild(box);
    document.body.appendChild(modal);

    var skip=function(){modal.remove();resolve();};
    box.querySelector('#bc-skip').addEventListener('click',skip);
    // Wire scan buttons — each one scans into its sibling input
    box.querySelectorAll('.bc-scan').forEach(function(btn){
      btn.addEventListener('click',function(){
        if(typeof window.openQRScanner!=='function'){toast('QR skanni ekki ti\u00f0b\u00fainn','#dc2626');return;}
        var inp = btn.parentElement.querySelector('.bc-serial');
        if(!inp) return;
        window.openQRScanner(function(scanned){
          inp.value = (scanned||'').trim();
          inp.dispatchEvent(new Event('input',{bubbles:true}));
          // Flash green
          var oldBorder = inp.style.border;
          inp.style.border = '2px solid #10b981';
          setTimeout(function(){inp.style.border = oldBorder;}, 1000);
        });
      });
    });

    box.querySelector('#bc-save').addEventListener('click',function(){
      var inputs=box.querySelectorAll('.bc-serial');
      var inserts=[];
      inputs.forEach(function(inp){
        var serial=(inp.value||'').trim();
        if(!serial)return;
        var nm=inp.dataset.name||'';
        // Map product name to type/size if possible
        var type='ABC';
        if(/co2|co\u00b2/i.test(nm))type='CO2';
        else if(/vatn/i.test(nm))type='Vatn';
        else if(/froa|fro\u00f0u/i.test(nm))type='Fro\u00f0u';
        else if(/blautt/i.test(nm))type='Blautt';
        var sizeMatch=nm.match(/(\d+)\s?(kg|l)/i);
        var size=sizeMatch?(sizeMatch[1]+sizeMatch[2]):'';
        inserts.push({
          serial: serial,
          type: type,
          size: size,
          client: customerInfo.nafn||'',
          phone: customerInfo.simi||'',
          location: '',
          status: 'active',
          last_insp: new Date().toISOString().slice(0,10),
          next_insp: new Date(new Date().setFullYear(new Date().getFullYear()+1)).toISOString().slice(0,10),
          notes: 'Selt ' + new Date().toLocaleDateString('is-IS')
        });
      });
      if(!inserts.length){skip();return;}
      window.DB.sb.from('uttaeki').insert(inserts).then(function(r){
        if(r.error){
          toast('\u274c ' + r.error.message,'#dc2626');
        } else {
          toast('\u2705 ' + inserts.length + ' t\u00e6ki skr\u00e1\u00f0','#16a34a');
        }
        modal.remove();
        resolve();
      });
    });
  });
}

/* ===== 7. HOOK GREIÐA -> sala_transactions ===== [FIX #5] */
function hookGreida(){
  var co=document.getElementById('pos-checkout');
  if(!co || co._greida_hooked)return;
  co._greida_hooked=true;

  // Wrap with a capture-phase listener that runs BEFORE POS's own handler
  // so we can capture the cart before checkout clears it.
  var snapshot=null;
  co.addEventListener('click',function(){
    snapshot={
      lines: readPOSLines(),
      total: readPOSTotal(),
      customer: readPOSCustomer(),
      ts: Date.now()
    };
  }, true); // capture phase

  // Listen for the toast/confirmation that POS shows after a successful sale.
  // The most reliable signal is the `solur` table getting a new row. We watch
  // by polling once after click for ~3s, looking for a new `solur` row that
  // matches the snapshot total.
  co.addEventListener('click',function(){
    if(!snapshot)return;
    var snap=snapshot;
    snapshot=null;

    var attempts=0;
    var poll=setInterval(function(){
      attempts++;
      if(attempts>15){clearInterval(poll);return;}
      if(!window.DB || !window.DB.sb){return;}

      // Look for a solur row newer than snapshot.ts with matching total
      window.DB.sb.from('solur')
        .select('*')
        .gte('created_at', new Date(snap.ts - 5000).toISOString())
        .eq('samtals', Math.round(snap.total))
        .order('created_at', {ascending: false})
        .limit(1)
        .then(function(r){
          if(r.data && r.data.length){
            clearInterval(poll);
            var sale = r.data[0];
            // 1) Mirror to sala_transactions as type:'sale'
            window.DB.sb.from('sala_transactions').insert({
              customer: sale.customer_nafn || snap.customer.nafn || '',
              kennitala: snap.customer.kennitala || null,
              items: sale.linur || snap.lines,
              total: sale.samtals,
              invoice_amount: sale.samtals,
              type: 'sale',
              status: 'paid',
              paid_at: sale.created_at,
              notes: 'POS sala #' + (sale.num || sale.id),
              created_at: sale.created_at
            }).then(function(){/*fire-and-forget*/});


            // 1b) Upsert customer into vidskiptavinir registry.
            // IMPORTANT: don't overwrite an existing customer's name with the
            // auto-generated 'Vidskiptavinur 111111-1119' fallback. Only update
            // when we have a real name to add or no record exists.
            var custKt = (snap.customer.kennitala||'').trim();
            var custNafn = (sale.customer_nafn || snap.customer.nafn || '').trim();
            if(custKt || custNafn){
              if(custKt){
                // Check if customer already exists with a name
                window.DB.sb.from('vidskiptavinir').select('id,nafn').eq('kennitala', custKt).limit(1)
                  .then(function(existing){
                    var existingRow = existing && existing.data && existing.data[0];
                    var existingHasRealName = existingRow && existingRow.nafn && !/^Vi(\u00f0|d)skiptavinur\s/.test(existingRow.nafn);
                    if(existingHasRealName && !custNafn){
                      // Existing has a real name and we have nothing better \u2014 don't touch.
                      return;
                    }
                    var payload = {
                      kennitala: custKt,
                      nafn: custNafn || (existingRow && existingRow.nafn) || ('Vi\u00f0skiptavinur ' + custKt),
                      simi: snap.customer.simi || null
                    };
                    window.DB.sb.from('vidskiptavinir').upsert(payload, {onConflict:'kennitala'}).then(function(){});
                  });
              } else if(custNafn){
                // No kt, just insert by name
                window.DB.sb.from('vidskiptavinir').insert({nafn:custNafn, simi:snap.customer.simi||null}).then(function(){});
              }
            }

            // 1c) Fix verkbeiðnir customer field if it shows just kennitala.
            // pos.js inserts verkbeiðnir with customer="kt: 111111-1119" when only kt was given.
            // Look up the real name (or use what we already have) and update the row.
            (function(){
              var saleNum = sale.num; // e.g. '#2026-40644'
              if(!saleNum) return;
              var realName = custNafn;
              // If we don't have a name, look it up in vidskiptavinir by kt
              var lookup = (function(){
                if(realName) return Promise.resolve(realName);
                if(!custKt) return Promise.resolve('');
                return window.DB.sb.from('vidskiptavinir')
                  .select('nafn').eq('kennitala', custKt).limit(1).single()
                  .then(function(r){ return (r && r.data && r.data.nafn) || ''; })
                  .catch(function(){ return ''; });
              })();
              lookup.then(function(name){
                if(!name) return; // nothing to update
                // Update verkbeiðnir rows whose num starts with this sale's num
                window.DB.sb.from('verkbeidnir')
                  .update({customer: name, phone: snap.customer.simi || null})
                  .like('num', saleNum+'-V%')
                  .then(function(r){
                    if(r && !r.error){
                      // Trigger a UI refresh so Afgrei\u00f0sla shows the new name immediately
                      try { if(window.DB.loadAll) window.DB.loadAll(); } catch(e){}
                    }
                  });
              });
            })();
            // 2) Prompt for barcodes/serials
            promptForBarcodes(sale, {
              nafn: sale.customer_nafn || snap.customer.nafn || '',
              simi: snap.customer.simi || '',
              kennitala: snap.customer.kennitala || ''
            });
          }
        });
    },300);
  });
}

/* ===== 8. MASTER VIEWS (Viðskiptavinir + Reikningar) ===== */
function ensureView(id){
  var v=document.getElementById('view-'+id);
  if(!v){
    v=document.createElement('section');
    v.id='view-'+id;
    v.className='view';
    v.style.padding='24px';
    document.querySelector('.main-panel').appendChild(v);
  }
  return v;
}
function showView(id){
  document.querySelectorAll('.view').forEach(function(v){v.style.display='none';});
  var v=document.getElementById('view-'+id);
  if(v)v.style.display='block';
}

/* ===== 9. VIÐSKIPTAVINIR — editable inline ===== [FIX #2] */
function openVidModal(){
  // Remove any existing modal
  var ex=document.getElementById('vid-master-modal');
  if(ex)ex.remove();

  var m=document.createElement('div');
  m.id='vid-master-modal';
  m.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:9990;display:flex;align-items:flex-start;justify-content:center;padding:60px 16px 16px;overflow:auto';
  var d=document.createElement('div');
  d.style.cssText='background:#0f172a;border-radius:14px;max-width:1100px;width:100%;color:#cbd5e1;padding:24px;';
  d.innerHTML='<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px"><h2 style="margin:0;color:#fff">\uD83D\uDC65 Vi\u00f0skiptavinir</h2><button id="_vid_close" style="padding:8px 14px;border:1px solid #475569;border-radius:8px;background:transparent;color:#94a3b8;cursor:pointer">Loka</button></div><div id="_vid_table">Hle\u00f0ur\u2026</div>';
  m.appendChild(d);
  document.body.appendChild(m);

  d.querySelector('#_vid_close').addEventListener('click',function(){m.remove();});
  m.addEventListener('click',function(e){if(e.target===m)m.remove();});

  loadVidTable();
}

/* ===== CUSTOMER DEVICES (uttaeki link) ===== */
// Load count of extinguishers for a customer and update the cell.
// Match by client name OR kennitala (uttaeki.client is a free-text field, often holds name).
function loadDeviceCountFor(cust, holder){
  if(!cust || !window.DB || !window.DB.sb) return;
  var cell = holder.querySelector('.vc-tcount[data-id="'+cust.id+'"]');
  if(!cell) return;
  // Build OR query: match by name (case-insensitive) or kennitala
  var orParts = [];
  if(cust.nafn) orParts.push('client.ilike.'+escapeForOr(cust.nafn));
  if(cust.kennitala) orParts.push('client.eq.'+cust.kennitala);
  if(!orParts.length){ cell.textContent='0'; return; }
  window.DB.sb.from('uttaeki').select('id', {count:'exact', head:true}).or(orParts.join(',')).then(function(r){
    if(r.error){ cell.textContent='?'; cell.title=r.error.message; return; }
    cell.textContent = String(r.count || 0);
    if((r.count||0) === 0) cell.style.color='#64748b';
  });
}

// Helper to escape commas/parens in PostgREST .or() filter values
function escapeForOr(s){
  // Wrap in double quotes and escape any inner quotes
  return '"' + String(s).replace(/"/g,'\\"') + '"';
}

// Open a modal showing all of a customer's fire extinguishers, with option to add more.
function openCustomerDevicesModal(cust){
  if(!cust) return;
  var modal = document.createElement('div');
  modal.id = 'customer-devices-modal';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:99996;display:flex;align-items:center;justify-content:center;padding:16px;';
  var box = document.createElement('div');
  box.style.cssText = 'background:#0f172a;border-radius:14px;padding:24px;max-width:760px;width:100%;color:#cbd5e1;max-height:90vh;overflow:auto;';
  box.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">'+
    '<h3 style="margin:0;color:#fff">\uD83D\uDD27 T\u00e6ki: '+esc(cust.nafn||cust.kennitala||'Vi\u00f0skiptavinur')+'</h3>'+
    '<button id="_cdm_close" style="padding:6px 14px;border:1px solid #475569;border-radius:6px;background:transparent;color:#cbd5e1;cursor:pointer">Loka</button>'+
    '</div>'+
    '<div id="_cdm_body" style="min-height:60px">Hle\u00f0ur\u2026</div>'+
    '<div style="margin-top:16px;display:flex;gap:8px">'+
      '<button id="_cdm_add" style="flex:1;padding:12px;border:none;border-radius:8px;background:#16a34a;color:#fff;font-weight:600;cursor:pointer">+ B\u00e6ta t\u00e6ki vi\u00f0</button>'+
    '</div>';
  modal.appendChild(box);
  document.body.appendChild(modal);
  function close(){ if(modal.parentNode) modal.parentNode.removeChild(modal); }
  box.querySelector('#_cdm_close').addEventListener('click', close);
  modal.addEventListener('click', function(e){ if(e.target===modal) close(); });

  // Load devices
  function reload(){
    var bodyEl = box.querySelector('#_cdm_body');
    bodyEl.innerHTML = '<div style="opacity:.6;padding:12px">Hle\u00f0ur\u2026</div>';
    var orParts = [];
    if(cust.nafn) orParts.push('client.ilike.'+escapeForOr(cust.nafn));
    if(cust.kennitala) orParts.push('client.eq.'+cust.kennitala);
    if(!orParts.length){ bodyEl.innerHTML='<div style="opacity:.6">Engin auðkenni \u00e1 vi\u00f0skiptavin</div>'; return; }
    window.DB.sb.from('uttaeki').select('*').or(orParts.join(',')).order('next_insp',{ascending:true}).then(function(r){
      if(r.error){ bodyEl.innerHTML='<div style="color:#dc2626">Villa: '+esc(r.error.message)+'</div>'; return; }
      var devs = r.data || [];
      if(!devs.length){ bodyEl.innerHTML='<div style="opacity:.6;padding:20px;text-align:center">Engin t\u00e6ki skr\u00e1\u00f0 \u00e1 \u00feennan vi\u00f0skiptavin</div>'; return; }
      var h = '<div style="background:#1e293b;border-radius:8px;overflow:hidden"><table style="width:100%;border-collapse:collapse;font-size:13px">'+
        '<thead><tr style="background:#0b1120;border-bottom:1px solid rgba(255,255,255,.1)">'+
        '<th style="padding:10px;text-align:left">Ra\u00f0n\u00famer</th>'+
        '<th style="padding:10px;text-align:left">Tegund</th>'+
        '<th style="padding:10px;text-align:left">St\u00e6r\u00f0</th>'+
        '<th style="padding:10px;text-align:left">Sta\u00f0setning</th>'+
        '<th style="padding:10px;text-align:left">N\u00e6sta sko\u00f0un</th>'+
        '</tr></thead><tbody>';
      devs.forEach(function(d){
        h += '<tr style="border-bottom:1px solid rgba(255,255,255,.05)">'+
          '<td style="padding:10px;font-family:monospace;font-weight:600;color:#fbbf24">'+esc(d.serial||'-')+'</td>'+
          '<td style="padding:10px">'+esc(d.type||'-')+'</td>'+
          '<td style="padding:10px">'+esc(d.size||'-')+'</td>'+
          '<td style="padding:10px">'+esc(d.location||'-')+'</td>'+
          '<td style="padding:10px">'+esc(d.next_insp||'-')+'</td>'+
          '</tr>';
      });
      h += '</tbody></table></div>';
      bodyEl.innerHTML = h;
    });
  }
  reload();

  // Add device button
  box.querySelector('#_cdm_add').addEventListener('click', function(e){
    e.preventDefault();
    e.stopPropagation();
    openAddDeviceModal(cust, function(){ reload(); });
  });
}

// Modal to add a new uttaeki record for a specific customer
function openAddDeviceModal(cust, onSaved){
  var modal = document.createElement('div');
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:99997;display:flex;align-items:center;justify-content:center;padding:16px;';
  var box = document.createElement('div');
  box.style.cssText = 'background:#0f172a;border-radius:14px;padding:24px;max-width:480px;width:100%;color:#cbd5e1;max-height:90vh;overflow:auto;';
  box.innerHTML = '<h3 style="margin:0 0 16px;color:#fff">+ B\u00e6ta t\u00e6ki vi\u00f0 '+esc(cust.nafn||cust.kennitala||'')+'</h3>'+
    '<div style="margin-bottom:12px"><label style="display:block;font-size:12px;margin-bottom:4px;opacity:.7">Ra\u00f0n\u00famer *</label>'+
      '<div style="display:flex;gap:6px">'+
        '<input id="_ad_serial" type="text" placeholder="Ra\u00f0n\u00famer" style="flex:1;padding:10px;border:1px solid #334155;border-radius:6px;background:#0f172a;color:#fff;font-size:14px">'+
        '<button type="button" id="_ad_scan" title="Skanna" style="padding:0 14px;background:#7c3aed;color:#fff;border:none;border-radius:6px;font-size:18px;cursor:pointer;flex-shrink:0">\uD83D\uDCF7</button>'+
      '</div>'+
    '</div>'+
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">'+
      '<div><label style="display:block;font-size:12px;margin-bottom:4px;opacity:.7">Tegund</label>'+
        '<select id="_ad_type" style="width:100%;padding:10px;border:1px solid #334155;border-radius:6px;background:#0f172a;color:#fff;font-size:14px">'+
          '<option value="ABC">ABC Duft</option>'+
          '<option value="CO2">CO\u00b2</option>'+
          '<option value="Vatn">Vatn</option>'+
          '<option value="Fro\u00f0u">Fro\u00f0u</option>'+
          '<option value="Blautt">Blautt</option>'+
        '</select></div>'+
      '<div><label style="display:block;font-size:12px;margin-bottom:4px;opacity:.7">St\u00e6r\u00f0</label>'+
        '<input id="_ad_size" type="text" placeholder="6kg" style="width:100%;padding:10px;border:1px solid #334155;border-radius:6px;background:#0f172a;color:#fff;font-size:14px"></div>'+
    '</div>'+
    '<div style="margin-bottom:12px"><label style="display:block;font-size:12px;margin-bottom:4px;opacity:.7">Sta\u00f0setning</label>'+
      '<input id="_ad_loc" type="text" placeholder="t.d. Eldh\u00fas, kj\u00e1llari" style="width:100%;padding:10px;border:1px solid #334155;border-radius:6px;background:#0f172a;color:#fff;font-size:14px"></div>'+
    '<div style="display:flex;gap:8px;margin-top:16px">'+
      '<button id="_ad_cancel" style="flex:1;padding:12px;border:1px solid #475569;border-radius:8px;background:transparent;color:#94a3b8;cursor:pointer">H\u00e6tta vi\u00f0</button>'+
      '<button id="_ad_save" style="flex:2;padding:12px;border:none;border-radius:8px;background:#16a34a;color:#fff;font-weight:600;cursor:pointer">Vista t\u00e6ki</button>'+
    '</div>';
  modal.appendChild(box);
  document.body.appendChild(modal);
  function close(){ if(modal.parentNode) modal.parentNode.removeChild(modal); }
  box.querySelector('#_ad_cancel').addEventListener('click', close);
  modal.addEventListener('click', function(e){ if(e.target===modal) close(); });
  // Scan handler
  box.querySelector('#_ad_scan').addEventListener('click', function(e){
    e.preventDefault();
    e.stopPropagation();
    if(typeof window.openQRScanner!=='function'){toast('QR skanni ekki ti\u00f0b\u00fainn','#dc2626');return;}
    window.openQRScanner(function(scanned){
      var inp = box.querySelector('#_ad_serial');
      inp.value = (scanned||'').trim();
      inp.style.border = '2px solid #10b981';
      setTimeout(function(){inp.style.border='1px solid #334155';},1000);
    });
  });
  // Save handler
  box.querySelector('#_ad_save').addEventListener('click', function(e){
    e.preventDefault();
    e.stopPropagation();
    var serial = (box.querySelector('#_ad_serial').value||'').trim();
    if(!serial){ toast('Vinsamlega skr\u00e1\u00f0u ra\u00f0n\u00famer','#dc2626'); return; }
    var payload = {
      serial: serial,
      type: box.querySelector('#_ad_type').value,
      size: (box.querySelector('#_ad_size').value||'').trim(),
      location: (box.querySelector('#_ad_loc').value||'').trim(),
      client: cust.nafn || ('Vi\u00f0skiptavinur '+(cust.kennitala||'')),
      phone: cust.simi || null,
      status: 'active',
      last_insp: new Date().toISOString().slice(0,10),
      next_insp: new Date(new Date().setFullYear(new Date().getFullYear()+1)).toISOString().slice(0,10),
      notes: 'B\u00e6tt vi\u00f0 handvirkt '+new Date().toLocaleDateString('is-IS')
    };
    window.DB.sb.from('uttaeki').insert(payload).then(function(r){
      if(r.error){ toast('\u274c '+r.error.message,'#dc2626'); return; }
      toast('\u2705 T\u00e6ki skr\u00e1\u00f0','#16a34a');
      close();
      if(typeof onSaved==='function') onSaved();
    });
  });
}
function loadVidTable(){
  if(!window.DB || !window.DB.sb)return;
  window.DB.sb.from('vidskiptavinir').select('*').order('created_at',{ascending:false}).then(function(r){
    var holder=document.getElementById('_vid_table');
    if(!holder)return;
    if(r.error){holder.innerHTML='<div style="color:#dc2626">Villa: '+esc(r.error.message)+'</div>';return;}
    var rows=r.data||[];
    if(!rows.length){holder.innerHTML='<div style="opacity:.6;padding:20px;text-align:center">Engir vi\u00f0skiptavinir skr\u00e1\u00f0ir</div>';return;}
    var h='<div style="background:#1e293b;border-radius:12px;overflow:hidden">'+
      '<table style="width:100%;border-collapse:collapse;font-size:14px">'+
      '<thead><tr style="border-bottom:1px solid rgba(255,255,255,.1);background:#0f172a">'+
      '<th style="padding:12px;text-align:left">Nafn</th>'+
      '<th style="padding:12px;text-align:left">Kennitala</th>'+
      '<th style="padding:12px;text-align:left">S\u00edmi</th>'+
      '<th style="padding:12px;text-align:left">Heimilisfang</th>'+
      '<th style="padding:12px;text-align:left">Netfang</th>'+
      '<th style="padding:12px;text-align:center;width:90px">T\u00e6ki</th>'+
      '<th style="padding:12px;width:280px"></th>'+
      '</tr></thead><tbody>';
    rows.forEach(function(c){
      var needsName = !c.nafn || /^Vi(\u00f0|d)skiptavinur/.test(c.nafn);
      h+='<tr data-id="'+c.id+'" style="border-bottom:1px solid rgba(255,255,255,.05)">'+
        '<td class="vc-nafn" style="padding:12px;'+(needsName?'color:#f59e0b':'')+'">'+esc(c.nafn||'(\u00f3nefnt)')+'</td>'+
        '<td class="vc-kt" style="padding:12px;font-family:monospace;font-size:12px">'+esc(c.kennitala||'')+'</td>'+
        '<td class="vc-simi" style="padding:12px">'+esc(c.simi||'-')+'</td>'+
        '<td class="vc-heim" style="padding:12px">'+esc(c.heimilisfang||'-')+'</td>'+
        '<td class="vc-net" style="padding:12px">'+esc(c.netfang||'-')+'</td>'+
        '<td class="vc-tcount" data-id="'+c.id+'" style="padding:12px;text-align:center;font-weight:600;color:#fbbf24">\u2026</td>'+
        '<td style="padding:12px;text-align:right;white-space:nowrap"><button class="vc-view" data-id="'+c.id+'" style="padding:6px 10px;border:none;border-radius:6px;background:#0d9488;color:#fff;cursor:pointer;font-size:12px;font-weight:600;margin-right:4px">\uD83D\uDD27 T\u00e6ki</button><button class="vc-add-device" data-id="'+c.id+'" style="padding:6px 10px;border:none;border-radius:6px;background:#7c3aed;color:#fff;cursor:pointer;font-size:12px;font-weight:600;margin-right:4px">+ T\u00e6ki</button><button class="vc-edit" data-id="'+c.id+'" style="padding:6px 10px;border:none;border-radius:6px;background:#2563eb;color:#fff;cursor:pointer;font-size:12px;font-weight:600">\u270f\ufe0f Breyta</button></td>'+
      '</tr>';
    });
    h+='</tbody></table></div>';
    holder.innerHTML=h;

    holder.querySelectorAll('.vc-edit').forEach(function(btn){
      btn.addEventListener('click',function(){
        var id=btn.dataset.id;
        var row=holder.querySelector('tr[data-id="'+id+'"]');
        if(!row)return;
        editVidRow(row, rows.find(function(x){return String(x.id)===String(id);}));
      });
    });
    // Wire 'Skoda taeki' buttons
    holder.querySelectorAll('.vc-view').forEach(function(btn){
      btn.addEventListener('click',function(){
        var id=btn.dataset.id;
        var cust = rows.find(function(x){return String(x.id)===String(id);});
        if(cust) openCustomerDevicesModal(cust);
      });
    });
    // Wire 'Add device directly' buttons — skip the device-list modal, go straight to add
    holder.querySelectorAll('.vc-add-device').forEach(function(btn){
      btn.addEventListener('click',function(){
        var id=btn.dataset.id;
        var cust = rows.find(function(x){return String(x.id)===String(id);});
        if(cust) openAddDeviceModal(cust, function(){ loadDeviceCountFor(cust, holder); });
      });
    });
    // Load device counts asynchronously
    rows.forEach(function(c){
      loadDeviceCountFor(c, holder);
    });
  });
}
function editVidRow(tr, c){
  // Replace the readable cells with inputs
  tr.querySelector('.vc-nafn').innerHTML='<input class="ed-nafn" value="'+esc(c.nafn||'')+'" style="width:100%;padding:6px;border:1px solid #475569;border-radius:6px;background:#0f172a;color:#fff;font-size:13px">';
  tr.querySelector('.vc-simi').innerHTML='<input class="ed-simi" value="'+esc(c.simi||'')+'" style="width:100%;padding:6px;border:1px solid #475569;border-radius:6px;background:#0f172a;color:#fff;font-size:13px">';
  tr.querySelector('.vc-heim').innerHTML='<input class="ed-heim" value="'+esc(c.heimilisfang||'')+'" style="width:100%;padding:6px;border:1px solid #475569;border-radius:6px;background:#0f172a;color:#fff;font-size:13px">';
  tr.querySelector('.vc-net').innerHTML='<input class="ed-net" value="'+esc(c.netfang||'')+'" style="width:100%;padding:6px;border:1px solid #475569;border-radius:6px;background:#0f172a;color:#fff;font-size:13px">';
  var actCell = tr.querySelector('td:last-child');
  actCell.innerHTML='<button class="vc-save" style="padding:6px 10px;border:none;border-radius:6px;background:#16a34a;color:#fff;cursor:pointer;font-size:12px;font-weight:600;margin-right:4px">Vista</button><button class="vc-cancel" style="padding:6px 10px;border:1px solid #475569;border-radius:6px;background:transparent;color:#94a3b8;cursor:pointer;font-size:12px">H\u00e6tta</button>';

  actCell.querySelector('.vc-cancel').addEventListener('click',function(){loadVidTable();});
  actCell.querySelector('.vc-save').addEventListener('click',function(){
    var update={
      nafn: tr.querySelector('.ed-nafn').value.trim() || null,
      simi: tr.querySelector('.ed-simi').value.trim() || null,
      heimilisfang: tr.querySelector('.ed-heim').value.trim() || null,
      netfang: tr.querySelector('.ed-net').value.trim() || null
    };
    window.DB.sb.from('vidskiptavinir').update(update).eq('id', c.id).then(function(r){
      if(r.error){toast('\u274c '+r.error.message,'#dc2626');return;}
      toast('\u2705 Vista\u00f0','#16a34a');
      loadVidTable();
    });
  });
}

/* ===== 10. REIKNINGAR MODAL ===== */
function openReikModal(){
  var ex=document.getElementById('reik-master-modal');
  if(ex)ex.remove();
  var m=document.createElement('div');
  m.id='reik-master-modal';
  m.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:9990;display:flex;align-items:flex-start;justify-content:center;padding:60px 16px 16px;overflow:auto';
  var d=document.createElement('div');
  d.style.cssText='background:#0f172a;border-radius:14px;max-width:1100px;width:100%;color:#cbd5e1;padding:24px;';
  d.innerHTML='<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px"><h2 style="margin:0;color:#fff">\uD83D\uDCCB Reikningar</h2><button id="_reik_close" style="padding:8px 14px;border:1px solid #475569;border-radius:8px;background:transparent;color:#94a3b8;cursor:pointer">Loka</button></div><div id="_reik_table">Hle\u00f0ur\u2026</div>';
  m.appendChild(d);
  document.body.appendChild(m);
  d.querySelector('#_reik_close').addEventListener('click',function(){m.remove();});
  m.addEventListener('click',function(e){if(e.target===m)m.remove();});

  if(!window.DB || !window.DB.sb)return;
  window.DB.sb.from('sala_transactions').select('*').order('created_at',{ascending:false}).then(function(r){
    var holder=document.getElementById('_reik_table');
    if(!holder)return;
    if(r.error){holder.innerHTML='<div style="color:#dc2626">Villa: '+esc(r.error.message)+'</div>';return;}
    var rows=r.data||[];
    var open=rows.filter(function(x){return x.status!=='paid';});
    var paid=rows.filter(function(x){return x.status==='paid';});
    var html='';
    if(open.length){
      html+='<h3 style="color:#fff;margin:0 0 8px">\u23f3 \u00d3greitt</h3>'+invTbl(open,true);
    }
    if(paid.length){
      html+='<h3 style="color:#fff;margin:24px 0 8px">\u2705 Greitt</h3>'+invTbl(paid,false);
    }
    if(!html){
      html='<div style="opacity:.6;padding:40px;text-align:center">Engir reikningar enn</div>';
    }
    holder.innerHTML=html;
    holder.querySelectorAll('.mk-paid').forEach(function(btn){
      btn.addEventListener('click',function(){markPaid(btn.dataset.id, parseFloat(btn.dataset.amt));});
    });
  });
}
function invTbl(invs, withAct){
  if(!invs.length)return '<div style="padding:20px;opacity:.5;text-align:center">Engir reikningar</div>';
  var h='<div style="background:#1e293b;border-radius:12px;overflow:hidden"><table style="width:100%;border-collapse:collapse;font-size:14px"><thead><tr style="border-bottom:1px solid rgba(255,255,255,.1)"><th style="padding:12px;text-align:left">Nafn</th><th style="padding:12px;text-align:left">Kennitala</th><th style="padding:12px;text-align:left">Tegund</th><th style="padding:12px;text-align:right">Upph\u00e6\u00f0</th><th style="padding:12px">Dagsetning</th>'+(withAct?'<th style="padding:12px"></th>':'')+'</tr></thead><tbody>';
  invs.forEach(function(inv){
    var typeLabel = inv.type==='sale'?'\uD83D\uDCB0 Sala':'\uD83D\uDCCB Reikningur';
    h+='<tr style="border-bottom:1px solid rgba(255,255,255,.05)"><td style="padding:12px">'+esc(inv.customer||'')+'</td><td style="padding:12px;font-family:monospace;font-size:12px">'+esc(inv.kennitala||'')+'</td><td style="padding:12px">'+typeLabel+'</td><td style="padding:12px;text-align:right;font-weight:600">'+fmtKr(inv.invoice_amount||inv.total||0)+' kr</td><td style="padding:12px;font-size:12px;opacity:.7">'+fmtDate(inv.created_at)+'</td>';
    if(withAct){
      h+='<td style="padding:12px;text-align:right"><button class="mk-paid" data-id="'+inv.id+'" data-amt="'+(inv.invoice_amount||inv.total||0)+'" style="padding:6px 12px;border:none;border-radius:6px;background:#16a34a;color:#fff;font-size:12px;font-weight:600;cursor:pointer">\u2705 Mark a\u00f0 greitt</button></td>';
    }
    h+='</tr>';
  });
  h+='</tbody></table></div>';
  return h;
}
function markPaid(id, amt){
  if(!confirm('Stadfesta gretslu?'))return;
  window.DB.sb.from('sala_transactions').update({status:'paid',invoice_amount:amt,paid_at:new Date().toISOString()}).eq('id',id).select().single().then(function(r){
    if(r.error){toast('\u274c Villa','#dc2626');return;}
    toast('\u2705 Reikningur grei\u00f0ur','#16a34a');
    setTimeout(openReikModal,300);
  });
}

/* ===== 11. NAV WIRING ===== */
function wireNav(){
  // Capture-phase listener so it runs before vidskiptavinir.js intercepts
  if(document._nav_wired)return;
  document._nav_wired=true;
  document.addEventListener('click', function(e){
    var t = e.target;
    if(!t)return;
    var btn = t.closest && (t.closest('button.vnav-btn') || t.closest('a.vnav-btn'));
    if(!btn)return;
    var view = btn.dataset.view || btn.getAttribute('data-view') || (btn.textContent||'').trim();
    if(/Vi\u00f0skipta|Vidskipta|vidskiptavinir/i.test(view)){
      e.preventDefault();
      e.stopPropagation();
      openVidModal();
    } else if(/Reikning/i.test(view)){
      e.preventDefault();
      e.stopPropagation();
      openReikModal();
    }
  }, true);
}


/* ===== ADD REIKNINGAR NAV BUTTON ===== */
function addReikNavButton(){
  // Skip if already added
  if(document.getElementById('_reik_nav_btn')) return;
  // Find Vidskiptavinir button to insert after it
  var allBtns = Array.from(document.querySelectorAll('button.vnav-btn'));
  var vidBtn = allBtns.find(function(b){return /Vi(\u00f0|d)skipta/i.test(b.textContent||'');});
  if(!vidBtn) return;
  var btn = document.createElement('button');
  btn.id = '_reik_nav_btn';
  btn.className = vidBtn.className; // copy styling
  btn.type = 'button';
  btn.innerHTML = '\uD83D\uDCCB Reikningar';
  btn.addEventListener('click', function(e){
    e.preventDefault();
    e.stopPropagation();
    if(typeof openReikModal === 'function') openReikModal();
    else if(typeof window.openReikModal === 'function') window.openReikModal();
  });
  vidBtn.parentNode.insertBefore(btn, vidBtn.nextSibling);
}

/* ===== INIT ===== */
function initAll(){
  fixSalaImg();
  addBannerToOtherTabs();
  setupFireParticles();
  addReikNavButton();
  fixBanner();
  setupMobileSidebar();
  patchModalCrash();
  hookPOSRender();
  addInvBtn();
  hookGreida();
  wireNav();
}

// expose
window.markPaid = markPaid;
window.showMasterView = showView;
window.openVidModal = openVidModal;
window.openReikModal = openReikModal;
window._readPOSTotal = readPOSTotal;
window._readPOSLines = readPOSLines;

// Run init multiple times to catch late-loading components
if(document.readyState==='loading'){
  document.addEventListener('DOMContentLoaded', initAll);
} else {
  initAll();
}
setTimeout(initAll, 500);
setTimeout(initAll, 1500);
setTimeout(initAll, 3000);

// Watch the DOM for late renders. When the user navigates to the Sala view,
// pos-checkout gets rendered fresh and we need to (re-)attach the
// "Setja í Reikning" button and the GREIÐA hook. A lightweight observer
// on document.body handles this without polling.
(function(){
  var lastPosCheckout = null;
  var debounceTimer = null;
  function checkAndInit(){
  addBannerToOtherTabs();
  setupFireParticles();
  addReikNavButton();
    var co = document.getElementById('pos-checkout');
    if(co && co !== lastPosCheckout){
      lastPosCheckout = co;
      // Reset hooks because the element is new
      try { delete co._greida_hooked; } catch(e) {}
      addInvBtn();
      hookPOSRender();
      hookGreida();
    }
  }
  function onMutate(){
    if(debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(checkAndInit, 50);
  }
  if(document.body){
    var obs = new MutationObserver(onMutate);
    obs.observe(document.body, {childList: true, subtree: true});
  } else {
    document.addEventListener('DOMContentLoaded', function(){
      var obs = new MutationObserver(onMutate);
      obs.observe(document.body, {childList: true, subtree: true});
    });
  }
})();

// Also re-run patchModalCrash whenever DB.loadAll triggers a refresh
if(window.DB && window.DB.loadAll){
  var origLoadAll = window.DB.loadAll.bind(window.DB);
  window.DB.loadAll = function(){
    patchModalCrash();
    return origLoadAll.apply(window.DB, arguments);
  };
}

console.log('[patch-master] loaded with all fixes');


/* ===== TRIPLE FIX BLOCK ===== */

/* === FIX 1: Hide orange .fcol-count badges (esp. when count is 0) === */
(function(){
  var s = document.createElement('style');
  s.id = '_pm_hide_orange_dots';
  s.textContent = ''+
    /* Make zero-count badges invisible (no orange dot when count is 0) */
    '.fcol-count:empty, .fcol-count[data-zero="1"] { display: none !important; }'+
    /* Soften the badge style for non-zero counts: keep them informative but not orange */
    '.fcol-count { background: #475569 !important; color: #fff !important; font-weight: 600 !important; }';
  document.head.appendChild(s);
  // Also tag any .fcol-count whose textContent is '0' so the [data-zero] selector hides them.
  // Run periodically to catch re-renders by Field.render().
  function tagZeros(){
    document.querySelectorAll('.fcol-count').forEach(function(el){
      if(String(el.textContent||'').trim()==='0') el.setAttribute('data-zero','1');
      else el.removeAttribute('data-zero');
    });
  }
  setInterval(tagZeros, 1500);
  setTimeout(tagZeros, 200);
  console.log('[pm] orange-dot fix active');
})();

/* (Fix 2 QR clamp removed — was interfering with printer's default page handling) */

/* === FIX 3: Even tighter camera focus (sub-min override) === */
/* The current applyNearFocus uses focusDistance=min. If users still report focus too far,
 * we override it to try multiple very-near values before falling back to min. Some Android
 * cameras accept sub-min values for true macro mode.
 */
(function(){
  // Wait for getUserMedia to be wrapped (the main camera fix runs early in patch-master)
  function waitForGUMWrapped(cb, attempts){
    attempts = attempts || 0;
    if(attempts > 30) return;
    if(navigator.mediaDevices && navigator.mediaDevices.getUserMedia._pmWrapped){
      cb(); return;
    }
    setTimeout(function(){ waitForGUMWrapped(cb, attempts+1); }, 200);
  }
  // We don't actually need to wait \u2014 we add OUR own post-stream hook that aggressively re-applies
  // ultra-near focus a moment after stream resolves.
  if(!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return;
  var origGUM = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
  navigator.mediaDevices.getUserMedia = function(constraints){
    return origGUM(constraints).then(function(stream){
      // Wait long enough for the existing camera-focus fix to run, then go even closer
      setTimeout(function(){
        try {
          var tracks = stream.getVideoTracks();
          if(!tracks.length) return;
          var track = tracks[0];
          if(!track.getCapabilities) return;
          var caps = track.getCapabilities() || {};
          var modes = caps.focusMode || [];
          if((modes.indexOf?modes.indexOf('manual'):-1) < 0 || !caps.focusDistance) return;
          var min = caps.focusDistance.min;
          // Try a sequence: 0 \u2192 0.05 \u2192 0.1 \u2192 min. The camera will accept the closest one.
          var candidates = [0.05, 0.08, 0.1, min].filter(function(v){return typeof v==='number';});
          // Remove duplicates while preserving order
          var seen = {};
          candidates = candidates.filter(function(v){if(seen[v])return false;seen[v]=true;return true;});
          // Try each in order; first acceptance wins
          function tryNext(i){
            if(i >= candidates.length) return;
            var v = candidates[i];
            track.applyConstraints({advanced:[{focusMode:'manual', focusDistance:v}]})
              .then(function(){
                track._pmFocus = v;
                console.log('[pm-cam] ultra-micro focus accepted at:', v, '(min reported:', min, ')');
              })
              .catch(function(e){
                // This value rejected, try next
                console.log('[pm-cam] focusDistance', v, 'rejected, trying next');
                tryNext(i+1);
              });
          }
          tryNext(0);
        } catch(e){
          console.warn('[pm-cam] ultra-micro focus error:', e);
        }
      }, 2500); // after the existing 1500ms delay + a bit more
      return stream;
    });
  };
  console.log('[pm-cam] ultra-micro focus hook installed');
})();



/* ===== MAP FIXES + FYRIRTAEKI BLOCK ===== */

/* FIX A: Map coords from Google Places + force-clear old markers */
(function(){
  Object.keys(localStorage).forEach(function(k){if(k.startsWith("fp_"))localStorage.removeItem(k);});
  var O=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k&&k.startsWith&&k.startsWith("fp_"))return;return O.call(this,k,v);};
  // FORCE replace geocode cache with Google Places data
  var C={};
  function a(n,lat,lng){C[n]={lat:lat,lng:lng};}
  a("Hamborgara b\u00fallan geirsg\u00f6tu",64.1509,-21.9450);a("Geirsg\u00f6ta 1",64.1509,-21.9450);
  a("H\u00fasf. V/b\u00edlageymslu",64.1267,-21.8950);a("H\u00fasf. Mi\u00f0leiti 2-6",64.1267,-21.8950);a("Mi\u00f0leiti 2-6",64.1267,-21.8950);
  a("B.Racing",64.1387,-21.8477);a("S\u00fa\u00f0avogi 40",64.1387,-21.8477);
  a("Egilsborg(S\u00f3lar)",64.1340,-21.8447);a("Kleppsm\u00fdrarv.8",64.1340,-21.8447);
  a("Sk\u00falason & J\u00f3nsson ehf",64.1387,-21.8477);a("Sk\u00fatuvogi 6",64.1387,-21.8477);
  a("H\u00fasf. H\u00e1t\u00fan 8",64.1418,-21.8988);a("H\u00e1t\u00fan 8",64.1418,-21.8988);
  a("H\u00fasf\u00e9lag Kaplaskj\u00f3lsv.65",64.1452,-21.9662);a("Kaplaskj\u00f3lsv.65",64.1452,-21.9662);
  a("H\u00fasf. St\u00f3rager\u00f0i 20",64.1287,-21.8850);a("St\u00f3rager\u00f0i 20",64.1287,-21.8850);
  a("Klifurf\u00e9lag Rvk",64.1362,-21.8779);a("\u00c1rm\u00fala 23",64.1362,-21.8779);
  a("H\u00fasf\u00e9lagi\u00f0 \u00c1lfabakki 12",64.1086,-21.8433);a("\u00c1lfabakki 12",64.1086,-21.8433);
  a("Prinsinn",64.1088,-21.8425);a("\u00de\u00f6nglabakka 6",64.1088,-21.8425);
  a("H\u00fasf\u00e9lag Tungusel 1-7",64.0994,-21.8513);a("Tungusel 1-7",64.0994,-21.8513);
  a("H\u00fasf\u00e9lag Hraunb\u00e6 64",64.1180,-21.7957);a("Hraunb\u00e6 64",64.1180,-21.7957);
  a("Bilasmi\u00f0urinn",64.1306,-21.8244);a("Eldsh\u00f6f\u00f0i 19",64.1306,-21.8244);
  a("B\u00edltak",64.1288,-21.8176);a("St\u00f3rh\u00f6f\u00f0a 16",64.1288,-21.8176);
  a("Prinsinn Hraunb\u00e6",64.1180,-21.7957);a("Hraunb\u00e6 121",64.1180,-21.7957);
  a("H\u00fasf. Rj\u00fapufell 27",64.1004,-21.8163);a("Rj\u00fapufell 27",64.1004,-21.8163);
  a("H\u00fasf. M\u00f6\u00f0rufell 3",64.0997,-21.8136);a("M\u00f6\u00f0rufell 3",64.0997,-21.8136);
  a("Biob\u00fa ehf",64.1435,-21.7998);a("Gylfafl\u00f6t 24",64.1435,-21.7998);
  a("H\u00fasf. Berjarimi 16",64.1422,-21.7941);a("Berjarimi 16",64.1422,-21.7941);
  a("H\u00fasf. Berjarimi 10-16",64.1422,-21.7945);a("Berjarimi 10-16",64.1422,-21.7945);
  a("H\u00fasf. Vegh\u00fas 1",64.1385,-21.7736);a("Vegh\u00fas 1",64.1385,-21.7736);
  a("Sj\u00fakra\u00fej\u00e1lfun Grafarvogs",64.1503,-21.7853);a("Sp\u00f6nginni 37",64.1503,-21.7853);
  a("GG optic",64.1503,-21.7855);a("Sp\u00f6nginni",64.1503,-21.7855);
  a("Alur blikksmi\u00f0ja ehf",64.1107,-21.8460);a("Smi\u00f0juvegi 58",64.1107,-21.8460);
  a("H\u00fasf\u00e9lagi\u00f0 Furugrund 73",64.1155,-21.8751);a("Furugrund 73",64.1155,-21.8751);
  a("G.\u00c1.K b\u00edlaspr.r\u00e9ttingar",64.1086,-21.8500);a("Skemmuvegi 20 Bl\u00e1 gata",64.1086,-21.8500);
  a("H\u00fasf\u00e9lag \u00c1rakur 5",64.1086,-21.8440);a("\u00c1rakur 5",64.1086,-21.8440);
  a("H\u00e1rgrst R\u00fan",64.0882,-21.9189);a("B\u00f3khaldsfej. J\u00fal\u00ed\u00f6nu ehf.",64.0882,-21.9190);a("Gar\u00f0atorgi 7",64.0882,-21.9189);
  a("Distica",64.0802,-21.9271);a("Su\u00f0urhraun 10",64.0802,-21.9271);
  a("Tannl\u00e6knast.",64.0768,-21.9392);a("B\u00e6jarhrauni 2",64.0768,-21.9392);
  a("Carita-Snyrting ehf",64.0802,-21.9433);a("\u00demasnyrting",64.0803,-21.9434);a("Dalshrauni 11",64.0802,-21.9433);
  a("N\u00fdsm\u00ed\u00f0i (Gran\u00edtsteinar)",64.0761,-21.9452);a("Gran\u00edtsteinar",64.0762,-21.9453);a("Helluhraun 2",64.0761,-21.9452);
  a("H\u00fasf\u00e9lag Hjallabraut 3",64.0784,-21.9537);a("Hjallabraut 3",64.0784,-21.9537);
  a("H\u00fasf\u00e9lag Hjallabraut 6",64.0785,-21.9535);a("Hjallabraut 6",64.0785,-21.9535);
  a("Hafi\u00f0 fiskverslun",64.0581,-21.9796);a("Eyrartr\u00f6\u00f0 13",64.0581,-21.9796);
  a("H\u00fasf\u00e9lag \u00c1lfaskei\u00f0 102",64.0733,-21.9427);a("\u00c1lfaskei\u00f0 102",64.0733,-21.9427);
  a("Pallett kaffi\u00fas",64.0630,-21.9580);a("Strandg\u00f6tu 75",64.0630,-21.9580);
  a("S\u00e6toppur",64.0625,-21.9755);a("L\u00f3nsbraut 6",64.0625,-21.9755);
  a("H\u00fasf\u00e9lag S\u00f3lvangsvegur 1",64.0698,-21.9397);a("S\u00f3lvangsvegur 1",64.0698,-21.9397);
  a("H\u00fasf. Eskivellir 1",64.0466,-21.9818);a("Eskivellir 1",64.0466,-21.9818);
  a("Ell\u00fd \u00d3sk Erlingsd. (dagm)",64.0456,-21.9690);a("Fl\u00e9ttuv\u00f6llum 10",64.0456,-21.9690);
  a("B\u00edlapartasalan",64.1648,-21.6774);a("V\u00f6luteig 8",64.1648,-21.6774);
  a("Almenna b\u00edlaverkst\u00e6\u00f0i\u00f0",64.1323,-21.8702);a("Skeifunni 5",64.1323,-21.8702);
  a("St\u00e1lsmi\u00f0jan Framtak",64.0810,-21.9318);a("Vesturhrauni 1",64.0810,-21.9318);
  a("H\u00fasf\u00e9lag Dvergabakki 32",64.1091,-21.8319);a("Dvergabakki 32",64.1091,-21.8319);
  a("Herbergjaleiga (2h.BJB)",64.0759,-21.9456);a("Flatahraun 7",64.0759,-21.9456);
  a("H\u00fasf\u00e9lag \u00c1lftam\u00fdri 48",64.1344,-21.8954);a("\u00c1lftam\u00fdri 48",64.1344,-21.8954);
  // FORCE-replace cache (not merge) to fix old wrong coords
  localStorage.setItem("_slokk_gc",JSON.stringify(C));
  // Block L.circleMarker to kill old orange dots from newfeatures.js
  // mapfix uses L.marker+L.divIcon so is NOT affected
  if(window.L && L.circleMarker){
    var _origCM = L.circleMarker;
    L.circleMarker = function(latlng, opts){
      // Return a dummy marker that does nothing
      return {addTo:function(){return this;},bindPopup:function(){return this;},on:function(){return this;},remove:function(){},setLatLng:function(){return this;},setStyle:function(){return this;},getLatLng:function(){return latlng;}};
    };
    console.log("[pm] L.circleMarker blocked - old orange dots killed");
  }
  console.log("[pm] map: FORCE-set "+Object.keys(C).length+" Google Places coords");
})();

/* FIX B: Prevent Sala from adding customers to Fyrirt\u00e6ki table */
/* pos.js auto-creates fyrirtaeki entries for new kennitala customers.
 * The user only wants them in vi\u00f0skiptavinir. We clean up after the sale.
 */
(function(){
  // After each pm-rt verkbeidnir event (which fires after a sale),
  // check for fyrirtaeki rows created in the last 30s that match a
  // vidskiptavinir kennitala, and delete them.
  var lastCleanup = 0;
  function cleanupFyrirtaeki(){
    if(Date.now() - lastCleanup < 10000) return; // max once per 10s
    lastCleanup = Date.now();
    if(!window.DB || !window.DB.sb) return;
    var cutoff = new Date(Date.now() - 30000).toISOString();
    // Find fyrirtaeki entries created very recently
    window.DB.sb.from('fyrirtaeki').select('id,kennitala,created_at')
      .gte('created_at', cutoff)
      .then(function(r){
        if(!r.data || !r.data.length) return;
        // For each, check if the same kennitala exists in vidskiptavinir
        r.data.forEach(function(f){
          if(!f.kennitala) return;
          window.DB.sb.from('vidskiptavinir').select('id')
            .eq('kennitala', f.kennitala)
            .limit(1)
            .then(function(vr){
              if(vr.data && vr.data.length){
                // Exists in vidskiptavinir \u2014 delete from fyrirtaeki
                window.DB.sb.from('fyrirtaeki').delete().eq('id', f.id)
                  .then(function(){
                    console.log('[pm] removed duplicate fyrirt\u00e6ki entry id='+f.id+' kt='+f.kennitala);
                  });
              }
            });
        });
      });
  }
  // Hook into pm-rt refresh cycle
  var origRefreshAll = window.App && window.App.refreshAll;
  if(origRefreshAll){
    window.App.refreshAll = function(){
      origRefreshAll.apply(window.App, arguments);
      cleanupFyrirtaeki();
    };
  }
  // Also run once on load to clean up any existing duplicates
  setTimeout(cleanupFyrirtaeki, 5000);
  console.log('[pm] fyrirt\u00e6ki cleanup active');
})();

/* FIX C: Map filter buttons (Ra\u00f0ur/Appels\u00ednugulur/Allir) */
(function(){
  var filterState = 'all'; // 'all', 'red', 'orange', 'green'
  function injectFilterUI(){
    var view = document.getElementById('view-field');
    if(!view) return false;
    if(document.getElementById('_pm_map_filter')) return true; // already injected
    var toolbar = view.querySelector('.field-toolbar');
    if(!toolbar) return false;
    var div = document.createElement('div');
    div.id = '_pm_map_filter';
    div.style.cssText = 'display:flex;gap:6px;margin:8px 0;flex-wrap:wrap;';
    div.innerHTML = '<span style="font-size:11px;font-weight:700;text-transform:uppercase;color:#94a3b8;letter-spacing:.05em;line-height:28px;margin-right:4px">Kort:</span>'+
      '<button class="_mf_btn" data-filter="all" style="padding:4px 12px;border:1px solid #475569;border-radius:6px;background:#1e293b;color:#fff;font-size:12px;cursor:pointer;font-weight:600">Allir</button>'+
      '<button class="_mf_btn" data-filter="red" style="padding:4px 12px;border:1px solid #dc2626;border-radius:6px;background:transparent;color:#dc2626;font-size:12px;cursor:pointer;font-weight:600">\u26a0 \u00datrunnir</button>'+
      '<button class="_mf_btn" data-filter="orange" style="padding:4px 12px;border:1px solid #b45309;border-radius:6px;background:transparent;color:#b45309;font-size:12px;cursor:pointer;font-weight:600">\u23f0 Gjaldfallnir</button>'+
      '<button class="_mf_btn" data-filter="green" style="padding:4px 12px;border:1px solid #1a7f4b;border-radius:6px;background:transparent;color:#1a7f4b;font-size:12px;cursor:pointer;font-weight:600">\u2705 \u00cd lagi</button>';
    toolbar.after(div);
    // Wire click handlers
    div.querySelectorAll('._mf_btn').forEach(function(btn){
      btn.addEventListener('click', function(){
        filterState = btn.dataset.filter;
        // Update button styles
        div.querySelectorAll('._mf_btn').forEach(function(b){
          if(b.dataset.filter === filterState){
            b.style.background = b.dataset.filter==='all'?'#1e293b':b.dataset.filter==='red'?'#dc2626':b.dataset.filter==='orange'?'#b45309':'#1a7f4b';
            b.style.color = '#fff';
          } else {
            b.style.background = 'transparent';
            b.style.color = b.dataset.filter==='all'?'#cbd5e1':b.dataset.filter==='red'?'#dc2626':b.dataset.filter==='orange'?'#b45309':'#1a7f4b';
          }
        });
        applyFilter();
      });
    });
    return true;
  }
  function applyFilter(){
    var map = window._slokk_map;
    if(!map) return;
    // mapfix stores markers in its state object. Access via the IIFE's closure isn't possible,
    // so we iterate ALL Leaflet layers and show/hide based on the marker's color.
    map.eachLayer(function(layer){
      if(!(layer instanceof L.Marker)) return;
      var el = layer.getElement && layer.getElement();
      if(!el) return;
      // Look up company status from popup content
      var popup = layer.getPopup && layer.getPopup();
      var pc = popup ? (typeof popup.getContent==='function'?popup.getContent():'') : '';
      if(typeof pc!=='string') pc='';
      var nm = pc.match(/>([^<]{2,})<\//) || [];
      var companyName = nm[1]||'';
      if(!companyName) return;
      var units = (window.DB&&DB.cache&&DB.cache.units)||[];
      var _today = new Date().toISOString().substring(0,10);
      var _d30 = new Date(Date.now()+30*86400000).toISOString().substring(0,10);
      var cu = units.filter(function(u){return u.status==='active'&&u.client===companyName;});
      var isRed=false,isOrange=false,isGreen=false;
      if(cu.length){var od=cu.some(function(u){return u.next_insp&&u.next_insp<_today;});var du=cu.some(function(u){return u.next_insp&&u.next_insp>=_today&&u.next_insp<=_d30;});isRed=od;isOrange=!od&&du;isGreen=!od&&!du;}
      var bg = isRed?'red':isOrange?'orange':isGreen?'green':'gray';
      var show = true;
      if(filterState === 'red') show = isRed; // #dc2626 = rgb(220,38,38)
      else if(filterState === 'orange') show = isOrange; // #b45309 = rgb(180,83,9)
      else if(filterState === 'green') show = isGreen; // #1a7f4b = rgb(26,127,75)
      // else 'all' = show everything
      if(el.style) el.style.display = show ? '' : 'none';
    });
  }
  // Inject filter UI when field view becomes visible
  setInterval(function(){
    var view = document.getElementById('view-field');
    if(!view) return;
    var s = getComputedStyle(view);
    if(s.display === 'none') return;
    injectFilterUI();
  }, 1000);
  console.log('[pm] map filter UI active');
})();



/* ===== SCANNER UNIFICATION: Route Scanner.open through openQRScanner ===== */
/* scanner.js (Scanner.open) is camera-only and doesn't support USB barcode scanners.
 * qrscan.js (openQRScanner) has a text-input fallback where USB scanners can type.
 * This override makes ALL Scanner.open calls use openQRScanner instead,
 * so Sala POS scan and any other Scanner.open callers get USB support.
 */
(function(){
  function hookScanner(){
    if(!window.Scanner || !window.Scanner.open || window.Scanner._pmUnified) return false;
    var origOpen = window.Scanner.open.bind(window.Scanner);
    window.Scanner.open = function(callback){
      if(typeof window.openQRScanner === 'function'){
        console.log('[pm] Scanner.open routed through openQRScanner (USB compatible)');
        window.openQRScanner(callback);
      } else {
        origOpen(callback);
      }
    };
    window.Scanner._pmUnified = true;
    console.log('[pm] Scanner unified — all scan buttons now support USB barcode scanners');
    return true;
  }
  // Try immediately and retry periodically (Scanner may load after patch-master)
  if(!hookScanner()){
    var attempts = 0;
    var iv = setInterval(function(){
      attempts++;
      if(hookScanner() || attempts > 30) clearInterval(iv);
    }, 500);
  }
})();


/* ===== FYRIRTÆKI DELETE BUTTON ===== */
(function(){
  function addDeleteBtn(){
    var main = document.getElementById('companies-main');
    if(!main) return;
    // Only on detail view (has 'Breyta' button)
    var editBtn = main.querySelector('button[onclick*="openEdit"]');
    if(!editBtn || main.querySelector('._pm_delete_btn')) return;
    // Show athugasemdir (notes) under company name
    var nameDiv = main.querySelector('div[style*="font-size:21px"]');
    if(nameDiv && !main.querySelector('._pm_notes_display')){
      var m2 = editBtn.getAttribute('onclick').match(/openEdit\((\d+)\)/);
      if(m2 && window.Companies && Companies.list){
        var co = Companies.list.find(function(x){return x.id===parseInt(m2[1],10);});
        if(co){
          // Show LIVE device count from DB
          var nd = document.createElement('div');
          nd.className = '_pm_notes_display';
          nd.style.cssText = 'margin-top:6px;padding:8px 12px;background:#dbeafe;border:1px solid #60a5fa;border-radius:8px;font-size:13px;color:#1e40af;font-weight:500;';
          nd.textContent = '\u23F3 Hle\u00f0ur...';
          nameDiv.parentNode.insertBefore(nd, nameDiv.nextSibling);
          // Fetch actual counts
          window.DB.sb.from('uttaeki').select('type').eq('client',co.nafn).then(function(r){
            if(!r.data){nd.textContent='\uD83D\uDCCB Engin t\u00e6ki skr\u00e1\u00f0';return;}
            var sk=0,re=0,br=0;
            r.data.forEach(function(u){
              if(u.type&&u.type.indexOf('Reyk')>=0) re++;
              else if(u.type&&u.type.indexOf('Bruna')>=0) br++;
              else sk++;
            });
            var parts=[];
            if(sk) parts.push('\uD83E\uDDEF Sl\u00f6kkvit\u00e6ki: '+sk);
            if(re) parts.push('\uD83D\uDEA8 Reyksk: '+re);
            if(br) parts.push('\uD83D\uDE92 Sl\u00f6ngur: '+br);
            nd.textContent = parts.length ? parts.join('  |  ') : '\uD83D\uDCCB Engin t\u00e6ki skr\u00e1\u00f0';
            if(co.athugasemdir){
              // Show notes below counts if they contain non-count info
              var notes = co.athugasemdir.replace(/Sl\u00f6kkvit\u00e6ki:\s*\d+/g,'').replace(/Reyksk:\s*\d+/g,'').replace(/Sl\u00f6ngur:\s*\d+/g,'').replace(/[|]/g,'').trim();
              if(notes && notes.length > 2){
                var nn = document.createElement('div');
                nn.style.cssText = 'font-size:11px;color:#78350f;margin-top:4px;';
                nn.textContent = notes;
                nd.appendChild(nn);
              }
            }
          });
        }
      }
    }
    // Extract company id from the edit button onclick
    var m = editBtn.getAttribute('onclick').match(/openEdit\((\d+)\)/);
    if(!m) return;
    var coId = parseInt(m[1],10);
    // Add delete button
    var btn = document.createElement('button');
    btn.className = 'btn btn-outline btn-sm _pm_delete_btn';
    btn.style.cssText = 'color:#dc2626;border-color:#dc2626;';
    btn.textContent = '\uD83D\uDDD1\uFE0F Ey\u00f0a';
    btn.onclick = function(e){
      e.stopPropagation();
      var name = main.querySelector('.company-initials');
      var nameText = name ? name.parentElement.querySelector('div[style*="font-size:21px"]') : null;
      var label = nameText ? nameText.textContent : 'fyrirt\u00e6ki #'+coId;
      if(!confirm('Ertu viss um a\u00f0 ey\u00f0a "'+label+'"?\n\n\u00deetta er ekki h\u00e6gt a\u00f0 afturkalla.')) return;
      // Delete ALL related records, then delete company
      Promise.all([
        window.DB.sb.from('solur').delete().eq('customer_id', coId),
        window.DB.sb.from('verkbeidnir').delete().eq('customer', coId),
        window.DB.sb.from('sala_transactions').delete().eq('kennitala', coId.toString())
      ]).catch(function(){}).then(function(){
        return window.DB.sb.from('fyrirtaeki').delete().eq('id', coId);
      }).then(function(r){
        if(r.error){ alert('Villa: '+r.error.message); return; }
        // Refresh companies list
        if(window.Companies){
          window.DB.sb.from('fyrirtaeki').select('*').order('nafn').then(function(lr){
            if(lr.data) Companies.list = lr.data;
            Companies.render();
          });
        }
      });
    };
    editBtn.parentNode.insertBefore(btn, editBtn.nextSibling);
  }
  // Watch for detail view rendering
  var mo = new MutationObserver(function(){ addDeleteBtn(); });
  var target = document.getElementById('view-companies');
  if(target) mo.observe(target, {childList:true, subtree:true});
  else setTimeout(function(){
    var t = document.getElementById('view-companies');
    if(t) mo.observe(t, {childList:true, subtree:true});
  }, 3000);
  console.log('[pm] fyrirt\u00e6ki delete button active');
})();


/* ===== GEYMSLA + LANSTAEKI + VORUR FIXES ===== */

/* PATCH 1: Extend shelf picker G20 -> G40 */
(function(){
  // Intercept the shelf dialog rendering. The original creates options G1-G20.
  // We replace with G1-G40 after the dialog appears.
  var mo = new MutationObserver(function(){
    var sel = document.getElementById('_sg_shelf');
    if(!sel || sel.dataset._pmExtended) return;
    sel.dataset._pmExtended = '1';
    // Rebuild options G1-G40
    var html = '';
    for(var i=1;i<=40;i++) html += '<option value="G'+i+'">G'+i+'</option>';
    sel.innerHTML = html;
    console.log('[pm] shelf picker extended to G40');
  });
  mo.observe(document.body, {childList:true, subtree:true});
  console.log('[pm] shelf G40 extension active');
})();

/* PATCH 2: Lánstæki Geymsla column — editable dropdowns G1-G40 */
(function(){
  var _lanCache = null;
  async function loadLanCache(){
    try{
      var r = await window.DB.sb.from('lanstaeki').select('id,serial,location');
      if(r.data){
        _lanCache = {};
        r.data.forEach(function(d){ _lanCache[d.serial] = {id:d.id, loc:d.location||''}; });
      }
    }catch(e){ console.warn('[pm-lan] load err:',e); }
  }
  async function decorateLanstaeki(){
    var v = document.getElementById('view-lanstaeki');
    if(!v || getComputedStyle(v).display==='none') return;
    var table = v.querySelector('table');
    if(!table || table.dataset._pmLanGey) return;
    table.dataset._pmLanGey = '1';
    await loadLanCache();
    if(!_lanCache) return;
    // Add GEYMSLA header — insert before the last header (button column)
    var headerRow = table.querySelector('thead tr');
    if(!headerRow) return;
    var ths = headerRow.querySelectorAll('th');
    var lastTh = ths[ths.length-1];
    var newTh = document.createElement('th');
    newTh.textContent = 'Geymsla';
    newTh.style.cssText = 'font-size:11px;font-weight:700;text-transform:uppercase;color:#64748b;letter-spacing:.06em;padding:12px 8px;';
    headerRow.insertBefore(newTh, lastTh);
    // Add GEYMSLA cell to each body row
    var rows = table.querySelectorAll('tbody tr');
    rows.forEach(function(row){
      var cells = row.querySelectorAll('td');
      if(cells.length < 2) return;
      var serial = cells[0] ? cells[0].textContent.trim() : '';
      var data = _lanCache[serial] || {};
      var lastCell = cells[cells.length-1];
      var td = document.createElement('td');
      td.style.cssText = 'padding:8px;';
      // Create editable dropdown
      var sel = document.createElement('select');
      sel.dataset.serial = serial;
      sel.style.cssText = 'padding:3px 6px;border:1px solid #e5e7eb;border-radius:4px;font-size:12px;font-weight:600;background:#f9fafb;cursor:pointer;min-width:60px;';
      sel.innerHTML = '<option value="">-</option>';
      for(var g=1;g<=40;g++){
        var opt = document.createElement('option');
        opt.value = 'G'+g;
        opt.textContent = 'G'+g;
        if(data.loc === 'G'+g) opt.selected = true;
        sel.appendChild(opt);
      }
      sel.onchange = function(){
        var s = this.dataset.serial;
        var val = this.value || null;
        window.DB.sb.from('lanstaeki').update({location:val}).eq('serial',s).then(function(r){
          if(r.error) alert('Villa: '+r.error.message);
          else console.log('[pm-lan] shelf updated: '+s+' -> '+val);
        });
      };
      td.appendChild(sel);
      row.insertBefore(td, lastCell);
    });
    console.log('[pm-lan] geymsla column added with '+rows.length+' dropdowns');
  }
  setInterval(function(){
    var v = document.getElementById('view-lanstaeki');
    if(!v || getComputedStyle(v).display==='none') return;
    var table = v.querySelector('table');
    if(table && !table.dataset._pmLanGey) decorateLanstaeki();
  }, 1000);
  console.log('[pm] lanstaeki geymsla column active');
})();

/* PATCH 3: Fix Geymsla view — read location (not shelf), add kennitala, editable shelf */
(function(){
  var _geyCache = null;
  var _ktMap = null;
  async function loadGeymslaData(){
    if(_geyCache && _ktMap) return;
    try{
      var r = await window.DB.sb.from('uttaeki').select('serial,phone,location,client').eq('status','geymsla');
      if(r.data){
        _geyCache = {};
        r.data.forEach(function(u){
          if(u.serial){ var loc=u.location||''; var gM=loc.match(/G(\d+)/); var sh=gM?'G'+gM[1]:''; _geyCache[u.serial]={phone:u.phone,shelf:sh,client:u.client}; }
        });
      }
      var kr = await window.DB.sb.from('vidskiptavinir').select('nafn,kennitala');
      if(kr.data){
        _ktMap = {};
        kr.data.forEach(function(d){ if(d.nafn) _ktMap[d.nafn] = d.kennitala||''; });
      }
    }catch(e){ console.warn('[pm-gey] load err:',e); }
  }
  async function fixGeymslaTable(){
    var gv = document.getElementById('view-geymsla');
    if(!gv || getComputedStyle(gv).display==='none') return;
    var table = gv.querySelector('table');
    if(!table) return;
    var _rc=table.querySelectorAll('tbody tr').length;
    var _dc=table.querySelectorAll('._pm_shelf_select').length;
    if(_dc>=_rc && _rc>0) return;
    await loadGeymslaData();
    if(!_geyCache) return;
    // Fix GEYMSLA column values (geymslacols.js fails because it queries 'shelf' which doesn't exist)
    // The column headers are already added by geymslacols.js or exist natively
    var rows = table.querySelectorAll('tbody tr');
    rows.forEach(function(row){
      var cells = row.querySelectorAll('td');
      if(cells.length < 3) return;
      var serial = cells[0]?cells[0].textContent.trim():'';
      var data = _geyCache[serial] || {};
      // Find GEYMSLA cell — it's the last cell or the one with '-' added by geymslacols
      // Also add kennitala under customer name
      for(var ci=0; ci<cells.length; ci++){
        var cellText = cells[ci].textContent.trim();
        // Fix Geymsla column (usually shows '-' or is empty)
        if(cells[ci].querySelector('code[style*="background"]') || (ci >= cells.length-2 && cellText === '-' && !cells[ci].dataset._pmFixed)){
          cells[ci].dataset._pmFixed = '1';
          if(data.shelf){
            cells[ci].innerHTML = '<select data-serial="'+serial+'" class="_pm_shelf_select" style="padding:2px 6px;border:1px solid #e5e7eb;border-radius:4px;font-size:12px;font-weight:600;background:#f3f4f6;cursor:pointer"></select>';
            var sel = cells[ci].querySelector('select');
            sel.innerHTML = '<option value="">-</option>';
            for(var g=1;g<=40;g++) sel.innerHTML += '<option value="G'+g+'"'+(data.shelf==='G'+g?' selected':'')+'>G'+g+'</option>';
            sel.onchange = function(){ updateShelf(this.dataset.serial, this.value); };
          } else {
            cells[ci].innerHTML = '<select data-serial="'+serial+'" class="_pm_shelf_select" style="padding:2px 6px;border:1px solid #e5e7eb;border-radius:4px;font-size:12px;color:#999;cursor:pointer"><option value="">-</option></select>';
            var sel = cells[ci].querySelector('select');
            for(var g=1;g<=40;g++) sel.innerHTML += '<option value="G'+g+'">G'+g+'</option>';
            sel.onchange = function(){ updateShelf(this.dataset.serial, this.value); };
          }
          break;
        }
      }
      // Add kennitala under customer name
      if(_ktMap){
        for(var ci=0; ci<cells.length; ci++){
          var name = cells[ci].textContent.trim();
          if(_ktMap[name] && !cells[ci].dataset._pmKt){
            cells[ci].dataset._pmKt = '1';
            var small = document.createElement('div');
            small.style.cssText = 'font-size:10px;color:#94a3b8;font-family:monospace;';
            small.textContent = 'kt: '+_ktMap[name];
            cells[ci].appendChild(small);
          }
        }
      }
    });
  }
  async function updateShelf(serial, value){
    window.DB.sb.from('uttaeki').update({location:value||null}).eq('serial',serial).then(function(){
      console.log('[pm-gey] shelf saved: '+serial+' -> '+value);
      _geyCache = null;
    }).catch(function(e){ alert('Villa: '+e.message); });
  }
  setInterval(function(){
    var gv = document.getElementById('view-geymsla');
    if(!gv || getComputedStyle(gv).display==='none') return;
    var table = gv.querySelector('table');
    if(table && !table.dataset._pmGeyFixed) fixGeymslaTable();
  }, 1000);
  console.log('[pm] geymsla location fix + kennitala + editable shelf active');
})();

/* PATCH 4: V\u00f6rur og \u00fej\u00f3nusta - white background, fit window */
(function(){
  if(!document.getElementById('_pm_vorur_css')){
    var css = document.createElement('style');
    css.id = '_pm_vorur_css';
    css.textContent = '#view-vorur{background:#fff !important;min-height:100vh;padding:0 !important}#view-vorur>div{max-width:100% !important;padding:12px 16px !important;box-sizing:border-box !important}#view-vorur>div>div[style*="grid"]{grid-template-columns:repeat(auto-fill,180px) !important;gap:12px !important;justify-content:center !important}#view-vorur .vorur-card,#view-vorur>div>div>div{background:#fff !important;border:1px solid #e2e8f0 !important;border-radius:10px !important;box-shadow:0 1px 4px rgba(0,0,0,0.06) !important;overflow:hidden !important;width:180px !important;box-sizing:border-box !important}#view-vorur img{width:100% !important;height:140px !important;object-fit:contain !important;display:block !important;background:#fff !important;padding:8px !important;box-sizing:border-box !important}#view-vorur>div>div{max-width:100% !important;overflow:hidden !important}@media(max-width:768px){#view-vorur>div>div[style*="grid"]{grid-template-columns:repeat(auto-fill,150px) !important;gap:8px !important}#view-vorur .vorur-card,#view-vorur>div>div>div{width:150px !important}#view-vorur img{height:110px !important}}';
    document.head.appendChild(css);
  }
  console.log('[pm] vorur styling fix active');
})();


/* ===== REFILL DATE (Umfylling) FEATURE ===== */
/* Fire extinguishers: inspected yearly, REFILLED every 5 years.
 * Refill date stored in uttaeki.notes as 'UMFYLLING:YYYY-MM-DD'
 * UI shows last refill + next refill (last+5yr) in company equipment list.
 */
(function(){
  function parseRefill(notes){
    if(!notes) return null;
    var m = notes.match(/UMFYLLING:(\d{4}-\d{2}-\d{2})/);
    return m ? m[1] : null;
  }
  function nextRefill(lastDate){
    if(!lastDate) return null;
    var d = new Date(lastDate);
    d.setFullYear(d.getFullYear()+5);
    return d.toISOString().substring(0,10);
  }
  function addRefillColumn(){
    // Find equipment tables in company detail view
    var main = document.getElementById('companies-main');
    if(!main) return;
    var tables = main.querySelectorAll('table');
    tables.forEach(function(table){
      if(table.dataset._pmRefill) return;
      // Check if this is an equipment table (has 'Raðnúmer' or 'Serial' header)
      var ths = table.querySelectorAll('th');
      var isEquipTable = Array.from(ths).some(function(th){return /ra\u00f0n|serial|n\u00famer/i.test(th.textContent);});
      if(!isEquipTable) return;
      table.dataset._pmRefill = '1';
      // Add 'Umfylling' header
      var headerRow = table.querySelector('thead tr');
      if(!headerRow) return;
      var newTh = document.createElement('th');
      newTh.textContent = 'Umfylling';
      newTh.style.cssText = 'font-size:11px;font-weight:700;text-transform:uppercase;color:#64748b;padding:8px 6px;white-space:nowrap;';
      headerRow.appendChild(newTh);
      // Add refill cell to each row
      var rows = table.querySelectorAll('tbody tr');
      rows.forEach(function(row){
        var cells = row.querySelectorAll('td');
        if(cells.length < 2) return;
        var serial = cells[0]?cells[0].textContent.trim():'';
        // Get notes from DB cache or fetch
        var td = document.createElement('td');
        td.style.cssText = 'padding:4px 6px;font-size:12px;white-space:nowrap;';
        td.dataset.serial = serial;
        td.className = '_pm_refill_cell';
        td.innerHTML = '<input type="date" style="font-size:11px;padding:2px 4px;border:1px solid #e5e7eb;border-radius:4px;width:120px;" data-serial="'+serial+'" class="_pm_refill_input">';
        row.appendChild(td);
      });
      // Load refill data for all serials
      loadRefillData(table);
    });
  }
  async function loadRefillData(table){
    var inputs = table.querySelectorAll('._pm_refill_input');
    var serials = Array.from(inputs).map(function(inp){return inp.dataset.serial;});
    if(!serials.length) return;
    try{
      var r = await window.DB.sb.from('uttaeki').select('serial,notes').in('serial',serials);
      if(r.data){
        r.data.forEach(function(u){
          var refDate = parseRefill(u.notes);
          var inp = table.querySelector('input[data-serial="'+u.serial+'"]');
          if(inp && refDate){
            inp.value = refDate;
            var next = nextRefill(refDate);
            var today = new Date().toISOString().substring(0,10);
            var label = document.createElement('div');
            label.style.cssText = 'font-size:10px;margin-top:2px;'+(next<today?'color:#dc2626;font-weight:700;':'color:#64748b;');
            label.textContent = 'N\u00e6sta: '+next;
            inp.parentNode.appendChild(label);
          }
        });
      }
    }catch(e){ console.warn('[pm-refill] load err:',e); }
    // Wire change handlers
    inputs.forEach(function(inp){
      inp.onchange = function(){
        saveRefillDate(this.dataset.serial, this.value);
      };
    });
  }
  async function saveRefillDate(serial, date){
    try{
      // Get current notes
      var r = await window.DB.sb.from('uttaeki').select('notes').eq('serial',serial).single();
      var notes = (r.data && r.data.notes) || '';
      // Remove old UMFYLLING if present
      notes = notes.replace(/UMFYLLING:\d{4}-\d{2}-\d{2}\s*/,'').trim();
      // Add new
      if(date) notes = 'UMFYLLING:'+date + (notes?' '+notes:'');
      await window.DB.sb.from('uttaeki').update({notes:notes}).eq('serial',serial);
      console.log('[pm-refill] saved '+serial+' -> '+date);
    }catch(e){ alert('Villa: '+e.message); }
  }
  // Watch for equipment tables appearing
  var mo = new MutationObserver(function(){ addRefillColumn(); });
  var vc = document.getElementById('view-companies');
  if(vc) mo.observe(vc, {childList:true, subtree:true});
  else setTimeout(function(){
    var vc2 = document.getElementById('view-companies');
    if(vc2) mo.observe(vc2, {childList:true, subtree:true});
  }, 3000);
  console.log('[pm] refill date feature active');
})();


/* ===== FIX: Company list table row click handlers ===== */
(function(){
  function wireRowClicks(){
    var table = document.querySelector('._cl_table');
    if(!table || table.dataset._pmRowClicks) return;
    table.dataset._pmRowClicks = '1';
    var rows = table.querySelectorAll('tbody tr');
    rows.forEach(function(row){
      if(row.onclick) return; // already has handler
      row.onclick = function(){
        var nameCell = row.querySelector('td');
        if(!nameCell) return;
        var name = nameCell.textContent.trim();
        if(!name || !window.Companies || !Companies.list) return;
        var co = Companies.list.find(function(c){return c.nafn === name;});
        if(co) Companies.openDetail(co.id);
      };
    });
    console.log('[pm] company row clicks wired: '+rows.length+' rows');
  }
  // Watch for table rendering
  var mo = new MutationObserver(function(){
    var table = document.querySelector('._cl_table');
    if(table && !table.dataset._pmRowClicks) wireRowClicks();
  });
  var vc = document.getElementById('view-companies');
  if(vc) mo.observe(vc, {childList:true, subtree:true});
  // Also run on interval as fallback
  setInterval(function(){
    var vc = document.getElementById('view-companies');
    if(!vc || getComputedStyle(vc).display==='none') return;
    var table = vc.querySelector('._cl_table');
    if(table && !table.dataset._pmRowClicks) wireRowClicks();
  }, 1000);
  console.log('[pm] company row click fix active');
})();


/* ===== FINANCIAL DASHBOARD: VSK breakdown, CSV export, revenue by type ===== */
(function(){
  var _finInjected = false;
  async function injectFinanceDash(){
    var main = document.getElementById('income-main');
    if(!main || _finInjected) return;
    if(main.querySelector('._pm_fin')) return;
    _finInjected = true;
    // Fetch all solur records
    var r = await window.DB.sb.from('solur').select('*').order('created_at',{ascending:false});
    if(!r.data) return;
    var sales = r.data;
    // Group by month
    var months = {};
    var byType = {};
    var byPayment = {};
    sales.forEach(function(s){
      var d = s.created_at.substring(0,7); // YYYY-MM
      if(!months[d]) months[d] = {count:0, total:0, vsk:0, anVsk:0};
      months[d].count++;
      months[d].total += s.samtals||0;
      months[d].vsk += s.vsk_upphaed||0;
      months[d].anVsk += s.upphaed_an_vsk||0;
      // By service type
      (s.linur||[]).forEach(function(l){
        var name = l.nafn||'\u00d3\u00feekkt';
        if(!byType[name]) byType[name] = {qty:0, total:0};
        byType[name].qty += l.qty||1;
        byType[name].total += (l.verd||0)*(l.qty||1);
      });
      // By payment method
      var pm = s.greitt_med||'\u00d3\u00feekkt';
      if(!byPayment[pm]) byPayment[pm] = {count:0, total:0};
      byPayment[pm].count++;
      byPayment[pm].total += s.samtals||0;
    });
    // Build HTML
    var html = '<div class="_pm_fin" style="margin-top:24px;border-top:2px solid #e5e7eb;padding-top:20px">';
    html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px"><h3 style="font-size:17px;font-weight:700;margin:0">\uD83D\uDCCA Skattskilayfirlit</h3><button id="_pm_csv_export" style="padding:8px 16px;background:#2563eb;color:#fff;border:none;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer">\u2B07\uFE0F Sækja CSV</button></div>';
    // Monthly table
    html += '<table style="width:100%;border-collapse:collapse;font-size:13px;background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.06);margin-bottom:20px"><thead><tr style="background:#f9fafb;border-bottom:2px solid #e5e7eb"><th style="text-align:left;padding:10px 12px;font-size:11px;text-transform:uppercase;color:#6b7280">M\u00e1nu\u00f0ur</th><th style="text-align:center;padding:10px 8px;font-size:11px;text-transform:uppercase;color:#6b7280">F\u00e6rslur</th><th style="text-align:right;padding:10px 12px;font-size:11px;text-transform:uppercase;color:#6b7280">\u00c1n VSK</th><th style="text-align:right;padding:10px 12px;font-size:11px;text-transform:uppercase;color:#6b7280">VSK 24%</th><th style="text-align:right;padding:10px 12px;font-size:11px;text-transform:uppercase;color:#2563eb;font-weight:700">Samtals</th></tr></thead><tbody>';
    var sortedMonths = Object.keys(months).sort().reverse();
    var grandTotal = 0, grandVsk = 0, grandAnVsk = 0;
    sortedMonths.forEach(function(m){
      var d = months[m];
      grandTotal += d.total; grandVsk += d.vsk; grandAnVsk += d.anVsk;
      var monthName = ['jan','feb','mar','apr','ma\u00ed','j\u00fan','j\u00fal','\u00e1g\u00fa','sep','okt','n\u00f3v','des'][parseInt(m.substring(5,7))-1];
      html += '<tr style="border-bottom:1px solid #f3f4f6"><td style="padding:10px 12px;font-weight:600">'+monthName+' '+m.substring(0,4)+'</td><td style="padding:10px 8px;text-align:center">'+d.count+'</td><td style="padding:10px 12px;text-align:right">'+d.anVsk.toLocaleString('is')+' kr</td><td style="padding:10px 12px;text-align:right;color:#dc2626">'+d.vsk.toLocaleString('is')+' kr</td><td style="padding:10px 12px;text-align:right;font-weight:700">'+d.total.toLocaleString('is')+' kr</td></tr>';
    });
    html += '<tr style="background:#f0f9ff;border-top:2px solid #2563eb"><td style="padding:10px 12px;font-weight:700">SAMTALS</td><td style="padding:10px 8px;text-align:center;font-weight:700">'+sales.length+'</td><td style="padding:10px 12px;text-align:right;font-weight:700">'+grandAnVsk.toLocaleString('is')+' kr</td><td style="padding:10px 12px;text-align:right;font-weight:700;color:#dc2626">'+grandVsk.toLocaleString('is')+' kr</td><td style="padding:10px 12px;text-align:right;font-weight:700;font-size:15px">'+grandTotal.toLocaleString('is')+' kr</td></tr>';
    html += '</tbody></table>';
    // Revenue by type
    html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">';
    html += '<div style="background:#fff;border-radius:10px;padding:16px;box-shadow:0 1px 3px rgba(0,0,0,.06)"><div style="font-size:13px;font-weight:700;color:#6b7280;margin-bottom:8px">Eftir tegund</div>';
    Object.keys(byType).sort(function(a,b){return byType[b].total-byType[a].total;}).forEach(function(t){
      html += '<div style="display:flex;justify-content:space-between;padding:4px 0;font-size:13px;border-bottom:1px solid #f9fafb"><span>'+t+' <span style="color:#999">('+byType[t].qty+'x)</span></span><span style="font-weight:600">'+byType[t].total.toLocaleString('is')+' kr</span></div>';
    });
    html += '</div>';
    // Payment method
    html += '<div style="background:#fff;border-radius:10px;padding:16px;box-shadow:0 1px 3px rgba(0,0,0,.06)"><div style="font-size:13px;font-weight:700;color:#6b7280;margin-bottom:8px">Grei\u00f0slum\u00e1ti</div>';
    Object.keys(byPayment).forEach(function(p){
      var label = p==='kort'?'\uD83D\uDCB3 Kort':p==='reikningur'?'\uD83D\uDCCB Reikningur':p==='millifaersla'?'\uD83C\uDFE6 Millif\u00e6rsla':'\uD83D\uDCB0 '+p;
      html += '<div style="display:flex;justify-content:space-between;padding:4px 0;font-size:13px;border-bottom:1px solid #f9fafb"><span>'+label+' <span style="color:#999">('+byPayment[p].count+')</span></span><span style="font-weight:600">'+byPayment[p].total.toLocaleString('is')+' kr</span></div>';
    });
    html += '</div></div></div>';
    main.insertAdjacentHTML('beforeend', html);
    // CSV Export button
    document.getElementById('_pm_csv_export').onclick = function(){
      var csv = 'Dagsetning,Vi\u00f0skiptavinur,Li\u00f0ur,Magn,Ver\u00f0,\u00c1n VSK,VSK,Samtals,Grei\u00f0slum\u00e1ti\n';
      sales.forEach(function(s){
        (s.linur||[]).forEach(function(l){
          csv += s.created_at.substring(0,10)+',';
          csv += '"'+(s.customer_nafn||'').replace(/"/g,'""')+'",';
          csv += '"'+(l.nafn||'').replace(/"/g,'""')+'",';
          csv += (l.qty||1)+',';
          csv += (l.verd||0)+',';
          csv += (s.upphaed_an_vsk||0)+',';
          csv += (s.vsk_upphaed||0)+',';
          csv += (s.samtals||0)+',';
          csv += (s.greitt_med||'')+'\n';
        });
      });
      var blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'slokkvitaeki_tekjur_'+new Date().toISOString().substring(0,7)+'.csv';
      a.click();
      URL.revokeObjectURL(url);
    };
    console.log('[pm] financial dashboard injected: '+sales.length+' sales');
  }
  setInterval(function(){
    var v = document.getElementById('view-income');
    if(!v || getComputedStyle(v).display==='none') return;
    injectFinanceDash();
  }, 1000);
  console.log('[pm] financial dashboard active');
})();


/* ===== IMPROVEMENTS: Dashboard stats, quick-inspect, batch operations ===== */

/* Quick-Inspect: Mark all company devices as inspected today */
(function(){
  function addQuickInspect(){
    var main = document.getElementById('companies-main');
    if(!main) return;
    var editBtn = main.querySelector('button[onclick*="openEdit"]');
    if(!editBtn || main.querySelector('._pm_quick_inspect')) return;
    // Get company ID
    var m = editBtn.getAttribute('onclick').match(/openEdit\((\d+)\)/);
    if(!m) return;
    var coId = parseInt(m[1],10);
    var co = window.Companies && Companies.list ? Companies.list.find(function(c){return c.id===coId;}) : null;
    if(!co) return;
    // Add quick-inspect button
    var btn = document.createElement('button');
    btn.className = 'btn btn-primary btn-sm _pm_quick_inspect';
    btn.style.cssText = 'background:#16a34a;margin-left:6px;';
    btn.textContent = '\u2705 Merkja sko\u00f0un';
    btn.title = 'Merkja \u00f6ll t\u00e6ki sem sko\u00f0u\u00f0 \u00ed dag';
    btn.onclick = async function(e){
      e.stopPropagation();
      var today = new Date().toISOString().substring(0,10);
      var nextYear = new Date();
      nextYear.setFullYear(nextYear.getFullYear()+1);
      var next = nextYear.toISOString().substring(0,10);
      if(!confirm('Merkja \u00f6ll t\u00e6ki hj\u00e1 "'+co.nafn+'" sem sko\u00f0u\u00f0 \u00ed dag?\n\nS\u00ed\u00f0asta sko\u00f0un: '+today+'\nN\u00e6sta sko\u00f0un: '+next)) return;
      btn.disabled = true;
      btn.textContent = '\u23f3 Uppf\u00e6ri...';
      try{
        var r = await window.DB.sb.from('uttaeki').update({last_insp:today, next_insp:next, status:'active'}).eq('client',co.nafn);
        if(r.error) throw r.error;
        btn.textContent = '\u2705 Uppf\u00e6rt!';
        btn.style.background = '#22c55e';
        // Refresh detail after 1s
        setTimeout(function(){Companies.openDetail(coId);},1000);
      }catch(err){
        alert('Villa: '+(err.message||err));
        btn.disabled = false;
        btn.textContent = '\u2705 Merkja sko\u00f0un';
      }
    };
    editBtn.parentNode.insertBefore(btn, editBtn.nextSibling.nextSibling);
  }
  var mo = new MutationObserver(function(){ addQuickInspect(); });
  var vc = document.getElementById('view-companies');
  if(vc) mo.observe(vc, {childList:true, subtree:true});
  console.log('[pm] quick-inspect button active');
})();

/* Yfirlit Dashboard: Today's stats, overdue count, upcoming this week */
(function(){
  var _dashInjected = false;
  async function injectDashboard(){
    // Find the Yfirlit/overview section
    var yf = document.querySelector('.stat-grid4, .overview-stats');
    if(!yf || _dashInjected) return;
    var parent = yf.parentNode;
    if(parent.querySelector('._pm_dash')) return;
    _dashInjected = true;
    // Fetch summary data
    try{
      var today = new Date().toISOString().substring(0,10);
      var d7 = new Date(Date.now()+7*86400000).toISOString().substring(0,10);
      var d30 = new Date(Date.now()+30*86400000).toISOString().substring(0,10);
      var units = await window.DB.sb.from('uttaeki').select('id,next_insp,status,client').eq('status','active');
      if(!units.data) return;
      var all = units.data;
      var overdue = all.filter(function(u){return u.next_insp && u.next_insp < today;});
      var thisWeek = all.filter(function(u){return u.next_insp && u.next_insp >= today && u.next_insp <= d7;});
      var thisMonth = all.filter(function(u){return u.next_insp && u.next_insp >= today && u.next_insp <= d30;});
      var ok = all.filter(function(u){return !u.next_insp || u.next_insp > d30;});
      // Companies with overdue
      var overdueCompanies = {};
      overdue.forEach(function(u){if(u.client)overdueCompanies[u.client]=true;});
      var thisMonthCompanies = {};
      thisMonth.forEach(function(u){if(u.client)thisMonthCompanies[u.client]=true;});
      var html = '<div class="_pm_dash" style="margin:16px 0;display:grid;grid-template-columns:repeat(4,1fr);gap:10px">';
      html += '<div style="background:#fef2f2;border-radius:12px;padding:14px;text-align:center;border:1px solid #fecaca"><div style="font-size:11px;color:#dc2626;font-weight:600;text-transform:uppercase">\u26a0 \u00datrunnin</div><div style="font-size:28px;font-weight:800;color:#dc2626">'+overdue.length+'</div><div style="font-size:11px;color:#ef4444">'+Object.keys(overdueCompanies).length+' fyrirt\u00e6ki</div></div>';
      html += '<div style="background:#fff7ed;border-radius:12px;padding:14px;text-align:center;border:1px solid #fed7aa"><div style="font-size:11px;color:#ea580c;font-weight:600;text-transform:uppercase">\u23f0 \u00deennan m\u00e1nu\u00f0</div><div style="font-size:28px;font-weight:800;color:#ea580c">'+thisMonth.length+'</div><div style="font-size:11px;color:#f97316">'+Object.keys(thisMonthCompanies).length+' fyrirt\u00e6ki</div></div>';
      html += '<div style="background:#f0fdf4;border-radius:12px;padding:14px;text-align:center;border:1px solid #bbf7d0"><div style="font-size:11px;color:#16a34a;font-weight:600;text-transform:uppercase">\u2705 \u00cd lagi</div><div style="font-size:28px;font-weight:800;color:#16a34a">'+ok.length+'</div><div style="font-size:11px;color:#22c55e">af '+all.length+' t\u00e6kjum</div></div>';
      html += '<div style="background:#eff6ff;border-radius:12px;padding:14px;text-align:center;border:1px solid #bfdbfe"><div style="font-size:11px;color:#2563eb;font-weight:600;text-transform:uppercase">\uD83D\uDCCA Samtals</div><div style="font-size:28px;font-weight:800;color:#2563eb">'+all.length+'</div><div style="font-size:11px;color:#3b82f6">virk t\u00e6ki</div></div>';
      html += '</div>';
      yf.insertAdjacentHTML('afterend', html);
      console.log('[pm] dashboard injected: '+all.length+' units, '+overdue.length+' overdue');
    }catch(e){ console.warn('[pm-dash]',e); }
  }
  // Try to inject on first view
  setTimeout(injectDashboard, 2000);
  console.log('[pm] dashboard enhancement active');
})();


/* ===== MOBILE RESPONSIVE: Sala POS + general mobile fixes ===== */
(function(){
  var css = document.createElement('style');
  css.id = '_pm_mobile_css';
  css.textContent = '\n' +
    '/* Sala POS: stack columns on mobile */\n' +
    '@media (max-width: 768px) {\n' +
    '  #view-sala > div:nth-child(2) {\n' +
    '    grid-template-columns: 1fr !important;\n' +
    '    gap: 8px !important;\n' +
    '    padding: 0 8px 8px !important;\n' +
    '    min-height: auto !important;\n' +
    '  }\n' +
    '  /* Cart panel: remove sticky, full width */\n' +
    '  #view-sala > div:nth-child(2) > div:last-child > div {\n' +
    '    position: static !important;\n' +
    '    max-height: none !important;\n' +
    '  }\n' +
    '  /* Product grid: smaller cards */\n' +
    '  #view-sala [style*="minmax(130px"] {\n' +
    '    grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)) !important;\n' +
    '    gap: 6px !important;\n' +
    '  }\n' +
    '  /* Banner: wrap on mobile */\n' +
    '  .pos-banner {\n' +
    '    flex-wrap: wrap !important;\n' +
    '    gap: 6px !important;\n' +
    '    padding: 8px !important;\n' +
    '  }\n' +
    '  .pos-banner > * {\n' +
    '    font-size: 12px !important;\n' +
    '  }\n' +
    '  /* Customer info panel */\n' +
    '  #view-sala input, #view-sala select {\n' +
    '    font-size: 16px !important; /* prevent iOS zoom on focus */\n' +
    '  }\n' +
    '  /* Scan button bigger touch target */\n' +
    '  #pos-scan {\n' +
    '    min-height: 44px !important;\n' +
    '    font-size: 14px !important;\n' +
    '  }\n' +
    '  /* General: smaller padding on cards */\n' +
    '  #view-sala [style*="padding:16px"] {\n' +
    '    padding: 10px !important;\n' +
    '  }\n' +
    '}\n' +
    '\n' +
    '/* Also fix other views for mobile */\n' +
    '@media (max-width: 768px) {\n' +
    '  /* Companies table: scroll horizontal */\n' +
    '  ._cl_table { display: block; overflow-x: auto; }\n' +
    '  /* Fyrirtæki detail: stack */\n' +
    '  #view-companies [style*="grid-template-columns"] {\n' +
    '    grid-template-columns: 1fr !important;\n' +
    '  }\n' +
    '  /* Lánstæki/Geymsla tables: scroll */\n' +
    '  #view-lanstaeki table, #view-geymsla table {\n' +
    '    display: block; overflow-x: auto; white-space: nowrap;\n' +
    '  }\n' +
    '  /* Nav buttons: smaller text */\n' +
    '  .vnav-btn { font-size: 12px !important; padding: 8px 10px !important; }\n' +
    '  /* General cards: tighter padding */\n' +
    '  .main-panel { padding: 8px !important; }\n' +
    '  .tcard { padding: 10px !important; }\n' +
    '  /* Map: full height on mobile */\n' +
    '  .leaflet-container { min-height: 50vh !important; }\n' +
    '  /* Geymsla dropdown: bigger on mobile */\n' +
    '  ._pm_shelf_select, #view-geymsla select, #view-lanstaeki select {\n' +
    '    min-width: 80px !important;\n' +
    '    min-height: 40px !important;\n' +
    '    font-size: 14px !important;\n' +
    '    padding: 6px 10px !important;\n' +
    '    border-radius: 6px !important;\n' +
    '  }\n' +
    '  /* Geymsla table: give more room to dropdown column */\n' +
    '  #view-geymsla table th:last-child, #view-geymsla table td:last-child {\n' +
    '    min-width: 90px !important;\n' +
    '    padding: 6px !important;\n' +
    '  }\n' +
    '  /* Geymsla/Lanstaeki: hide less important columns on mobile */\n' +
    '  #view-geymsla table th:nth-child(5), #view-geymsla table td:nth-child(5),\n' +
    '  #view-geymsla table th:nth-child(6), #view-geymsla table td:nth-child(6) {\n' +
    '    display: none !important;\n' +
    '  }\n' +
    '}\n';
  if(!document.getElementById('_pm_mobile_css')) document.head.appendChild(css);
  console.log('[pm] mobile responsive CSS injected');
})();


/* ===== VORUR IMAGE LIGHTBOX ===== */
(function(){
  var css=document.createElement('style');css.id='_pm_lb_css';
  css.textContent='._pm_img_wrap{position:relative !important;display:block !important}._pm_zoom_btn{position:absolute !important;top:6px !important;right:6px !important;width:28px !important;height:28px !important;background:rgba(0,0,0,0.55) !important;color:#fff !important;border:none !important;border-radius:50% !important;font-size:14px !important;cursor:pointer !important;display:flex !important;align-items:center !important;justify-content:center !important;opacity:0 !important;transition:opacity .2s !important;z-index:2 !important;padding:0 !important}._pm_img_wrap:hover ._pm_zoom_btn{opacity:1 !important}@media(max-width:768px){._pm_zoom_btn{opacity:0.7 !important;width:32px !important;height:32px !important}}._pm_lightbox{position:fixed !important;inset:0 !important;background:rgba(0,0,0,0.85) !important;z-index:99999 !important;display:flex !important;align-items:center !important;justify-content:center !important;padding:20px !important;cursor:zoom-out !important}._pm_lightbox img{max-width:90vw !important;max-height:90vh !important;object-fit:contain !important;background:#fff !important;border-radius:8px !important;box-shadow:0 4px 24px rgba(0,0,0,0.4) !important;padding:12px !important}._pm_lb_x{position:absolute !important;top:16px !important;right:20px !important;color:#fff !important;font-size:28px !important;cursor:pointer !important;background:rgba(0,0,0,0.5) !important;border:none !important;border-radius:50% !important;width:40px !important;height:40px !important;display:flex !important;align-items:center !important;justify-content:center !important}';
  if(!document.getElementById('_pm_lb_css'))document.head.appendChild(css);
  function addZoom(){var v=document.getElementById('view-vorur');if(!v||getComputedStyle(v).display==='none')return;v.querySelectorAll('img').forEach(function(img){if(img.dataset._pmZ)return;img.dataset._pmZ='1';var w=document.createElement('div');w.className='_pm_img_wrap';img.parentNode.insertBefore(w,img);w.appendChild(img);var b=document.createElement('button');b.className='_pm_zoom_btn';b.innerHTML='\uD83D\uDD0D';b.onclick=function(e){e.preventDefault();e.stopPropagation();var lb=document.createElement('div');lb.className='_pm_lightbox';lb.innerHTML='<button class="_pm_lb_x">&times;</button><img src="'+img.src+'">';lb.onclick=function(){lb.remove();};document.body.appendChild(lb);};w.appendChild(b);});}
  setInterval(addZoom,1000);
  console.log('[pm] vorur lightbox active');
})();


/* ===== HIDE Gaedakerfi + Fix Geymsla ===== */
(function(){
  function hideGaedakerfi(){
    // Hide any element containing Gaedakerfi text (the yellow IDAN krafa bar)
    document.querySelectorAll('[style*="fff3cd"], [style*="FFF3CD"]').forEach(function(el){
      if(el.textContent.indexOf('akerfi')>=0 || el.textContent.indexOf('IDAN')>=0){
        el.style.display='none';
      }
    });
  }
  function fixGeymsla(){
    var v = document.getElementById('view-geymsla');
    if(!v || getComputedStyle(v).display==='none') return;
    // Hide 'Skanna nytt taeki' button (purple background)
    v.querySelectorAll('button').forEach(function(btn){
      if(btn.textContent.indexOf('nýtt tæki')>=0 || btn.textContent.indexOf('nytt taeki')>=0){
        btn.style.display='none';
      }
    });
    // Ensure Simi column shows phone numbers
    var table = v.querySelector('table');
    if(!table || table.dataset._pmSimiFix) return;
    table.dataset._pmSimiFix='1';
    // Find SIMI column index
    var ths = table.querySelectorAll('th');
    var simiIdx = -1;
    ths.forEach(function(th,i){if(/S[ÍI]MI|simi|S\u00cdMI/i.test(th.textContent))simiIdx=i;});
    if(simiIdx < 0) return;
    // Load phone numbers from uttaeki
    var rows = table.querySelectorAll('tbody tr');
    var serials = [];
    rows.forEach(function(r){var c=r.querySelectorAll('td');if(c[0])serials.push(c[0].textContent.trim());});
    if(!serials.length) return;
    window.DB.sb.from('uttaeki').select('serial,phone').in('serial',serials).then(function(r){
      if(!r.data) return;
      var phoneMap = {};
      r.data.forEach(function(u){if(u.phone)phoneMap[u.serial]=u.phone;});
      rows.forEach(function(row){
        var cells = row.querySelectorAll('td');
        var serial = cells[0]?cells[0].textContent.trim():'';
        if(phoneMap[serial] && cells[simiIdx]){
          var existing = cells[simiIdx].textContent.trim();
          if(!existing || existing==='-'){
            cells[simiIdx].textContent = phoneMap[serial];
            cells[simiIdx].style.color = '#1e293b';
          }
        }
      });
    });
  }
  setInterval(function(){hideGaedakerfi();fixGeymsla();}, 1000);
  console.log('[pm] gaedakerfi hidden + geymsla simi fix active');
})();


/* ===== COMPANY EDIT MODAL ===== */
(function(){
  // CSS for modal
  var css=document.createElement('style');css.id='_pm_edit_css';
  css.textContent='._pm_modal{position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px}._pm_modal_box{background:#fff;border-radius:12px;padding:24px;max-width:500px;width:100%;max-height:90vh;overflow-y:auto;box-shadow:0 8px 32px rgba(0,0,0,0.2)}._pm_modal h3{margin:0 0 16px;font-size:18px;color:#1a2332}._pm_modal label{display:block;font-size:12px;font-weight:600;color:#64748b;margin:10px 0 4px;text-transform:uppercase}._pm_modal input,._pm_modal textarea{width:100%;padding:8px 12px;border:1px solid #e2e8f0;border-radius:6px;font-size:14px;box-sizing:border-box}._pm_modal textarea{height:60px;resize:vertical}._pm_modal_btns{margin-top:16px;display:flex;gap:8px;justify-content:flex-end}._pm_modal_btns button{padding:8px 20px;border-radius:6px;font-size:14px;font-weight:600;cursor:pointer;border:none}._pm_save{background:#059669;color:#fff}._pm_cancel{background:#f1f5f9;color:#475569}';
  if(!document.getElementById('_pm_edit_css'))document.head.appendChild(css);

  function openEditModal(companyId){
    window.DB.sb.from('fyrirtaeki').select('*').eq('id',companyId).single().then(function(r){
      if(!r.data){alert('Fyrirtaeki ekki fundid');return;}
      var c=r.data;
      var m=document.createElement('div');m.className='_pm_modal';
      m.innerHTML='<div class="_pm_modal_box"><h3>Breyta: '+c.nafn+'</h3>'+
        '<label>Nafn</label><input id="_ed_nafn" value="'+(c.nafn||'')+'">'+
        '<label>Kennitala</label><input id="_ed_kt" value="'+(c.kennitala||'')+'">'+
        '<label>S\u00edmi</label><input id="_ed_simi" value="'+(c.simi||'')+'">'+
        '<label>Netfang (t\u00f6lvup\u00f3stur)</label><input id="_ed_email" value="'+(c.netfang||'')+'">'+
        '<label>Heimilisfang</label><input id="_ed_addr" value="'+(c.heimilisfang||'')+'">'+
        '<label>Tengilid\u00f0ur</label><input id="_ed_contact" value="'+(c.tengiliður||'')+'">'+
        '<label>Athugasemdir</label><textarea id="_ed_notes">'+(c.athugasemdir||'')+'</textarea>'+
        '<div class="_pm_modal_btns"><button class="_pm_cancel">H\u00e6tta vid</button><button class="_pm_save">Vista</button></div></div>';
      document.body.appendChild(m);
      m.querySelector('._pm_cancel').onclick=function(){m.remove();};
      m.onclick=function(e){if(e.target===m)m.remove();};
      m.querySelector('._pm_save').onclick=function(){
        var update={
          nafn:document.getElementById('_ed_nafn').value.trim(),
          kennitala:document.getElementById('_ed_kt').value.trim(),
          simi:document.getElementById('_ed_simi').value.trim(),
          netfang:document.getElementById('_ed_email').value.trim(),
          heimilisfang:document.getElementById('_ed_addr').value.trim(),
          tengiliður:document.getElementById('_ed_contact').value.trim(),
          athugasemdir:document.getElementById('_ed_notes').value.trim()
        };
        window.DB.sb.from('fyrirtaeki').update(update).eq('id',companyId).then(function(res){
          if(res.error){alert('Villa: '+res.error.message);return;}
          m.remove();
          // Reload detail page
          if(window.Companies&&window.Companies.openDetail) window.Companies.openDetail(companyId);
          else location.reload();
        });
      };
    });
  }
  window._pmEditCompany = openEditModal;

  // Hook Breyta buttons in company detail view
  // Wrap openDetail to track current company ID
  function wrapOpenDetail(){
    if(!window.Companies||!window.Companies.openDetail||window.Companies.openDetail._pmW) return;
    var orig=window.Companies.openDetail;
    window.Companies.openDetail=function(id){
      window._currentCompanyId=id;
      return orig.apply(this,arguments);
    };
    window.Companies.openDetail._pmW=true;
  }
  setInterval(wrapOpenDetail,500);

  function hookBreytaButtons(){
    var btns=document.querySelectorAll('button');
    btns.forEach(function(btn){
      if(btn.textContent.trim()==='Breyta' && !btn.dataset._pmHooked){
        // Skip per-row Breyta buttons (inside tables or next to serial numbers)
        if(btn.closest('tr') || btn.closest('table')) return;
        // Only hook company-level Breyta (near top of detail page)
        var parent = btn.closest('#view-fyrirtaeki,#view-companies,[class*="detail"],[class*="company"]');
        if(!parent) return;
        btn.dataset._pmHooked='1';
        btn.addEventListener('click',function(e){
          e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
          var id=window._currentCompanyId;
          if(id) openEditModal(id);
          else alert('Veldu fyrirtaeki fyrst');
        },true);
      }
    });
  }
  setInterval(hookBreytaButtons,1000);
  console.log('[pm] company edit modal active');
})();


/* ===== ÓNÝTT STATUS FEATURE ===== */
(function(){
  // CSS for ónýtt badge and status dropdown
  var css=document.createElement('style');css.id='_pm_onytt_css';
  css.textContent='._pm_onytt{background:#fecaca !important;color:#991b1b !important;font-weight:600;padding:2px 8px;border-radius:4px;font-size:11px;text-decoration:line-through}._pm_status_sel{padding:3px 6px;border:1px solid #e5e7eb;border-radius:4px;font-size:12px;cursor:pointer;font-weight:500}._pm_status_sel.active{background:#d1fae5;color:#065f46}._pm_status_sel.geymsla{background:#dbeafe;color:#1e40af}._pm_status_sel.onytt{background:#fecaca;color:#991b1b}._pm_status_sel.ok{background:#d1fae5;color:#065f46}._pm_status_sel.i_vinnslu{background:#fef3c7;color:#92400e}._pm_i_vinnslu{background:#fef3c7 !important;color:#92400e !important;font-weight:600;padding:2px 8px;border-radius:4px;font-size:11px}';
  if(!document.getElementById('_pm_onytt_css'))document.head.appendChild(css);

  // Replace plain status text with styled badges + dropdown
  function enhanceStatusCells(){
    // Find equipment tables in company detail views
    var tables = document.querySelectorAll('table');
    tables.forEach(function(table){
      if(table.dataset._pmStatusDone) return;
      // Check if this table has STAÐA column
      var ths = table.querySelectorAll('th');
      var statusIdx = -1;
      ths.forEach(function(th,i){
        if(/STA[ÐD]A|stada/i.test(th.textContent)) statusIdx=i;
      });
      if(statusIdx < 0) return;
      
      var rows = table.querySelectorAll('tbody tr');
      if(!rows.length) return;
      table.dataset._pmStatusDone='1';
      
      rows.forEach(function(row){
        var cells = row.querySelectorAll('td');
        if(!cells[statusIdx]) return;
        var cell = cells[statusIdx];
        var serial = cells[0] ? cells[0].textContent.trim() : '';
        if(!serial) return;
        var currentStatus = cell.textContent.trim().toLowerCase();
        
        // Style ónýtt specially
        if(currentStatus === 'i_vinnslu'){
          cell.innerHTML = '<span class="_pm_i_vinnslu">\u00cd vinnslu</span>';
          row.style.opacity = '0.8';
        }
        if(currentStatus === 'onytt' || currentStatus === '\u00f3n\u00fdtt'){
          cell.innerHTML = '<span class="_pm_onytt">\u00d3n\u00fdtt</span>';
          row.style.opacity = '0.6';
        }
        
        // Add status dropdown to the row (small button after status)
        if(!row.querySelector('._pm_status_sel') && cells[statusIdx]){
          var sel = document.createElement('select');
          sel.className = '_pm_status_sel '+currentStatus;
          sel.innerHTML = '<option value="active"'+(currentStatus==='active'?' selected':'')+'>Active</option>'+
            '<option value="geymsla"'+(currentStatus==='geymsla'||currentStatus==='\u00ed geymslu'?' selected':'')+'>\u00cd geymslu</option>'+
            '<option value="ok"'+(currentStatus==='ok'||currentStatus==='\u00ed lagi'?' selected':'')+'>\u00cd lagi</option>'+
            '<option value="i_vinnslu"'+(currentStatus==='i_vinnslu'?' selected':'')+'>\u00cd vinnslu</option><option value="onytt"'+(currentStatus==='onytt'||currentStatus==='\u00f3n\u00fdtt'?' selected':'')+'>\u00d3n\u00fdtt</option>';
          sel.dataset.serial = serial;
          sel.onchange = function(){
            var newStatus = this.value;
            var s = this.dataset.serial;
            this.className = '_pm_status_sel '+newStatus;
            window.DB.sb.from('uttaeki').update({status:newStatus}).eq('serial',s).then(function(r){
              if(r.error) alert('Villa: '+r.error.message);
              else {
                // Update visual
                if(newStatus==='onytt'){
                  cell.innerHTML = '<span class="_pm_onytt">\u00d3n\u00fdtt</span>';
                  row.style.opacity='0.6';
                } else {
                  row.style.opacity='1';
                }
              }
            });
          };
          // Insert after the status badge
          cell.appendChild(document.createTextNode(' '));
          cell.appendChild(sel);
        }
      });
    });
  }
  setInterval(enhanceStatusCells, 2000);
  console.log('[pm] onytt status feature active');
})();


/* ===== DEVICE DETAIL MODAL — click a taeki row to view/edit ===== */
(function(){
  var css=document.createElement('style');css.id='_pm_dev_css';
  css.textContent='._pm_dev_row{cursor:pointer}._pm_dev_row:hover{background:#f8fafc !important}' +
    '._pm_dev_modal{position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:99999;display:flex;align-items:center;justify-content:center;padding:16px}' +
    '._pm_dev_box{background:#fff;border-radius:12px;padding:20px 24px;max-width:480px;width:100%;max-height:90vh;overflow-y:auto;box-shadow:0 8px 32px rgba(0,0,0,0.2)}' +
    '._pm_dev_box h3{margin:0 0 4px;font-size:18px;color:#1a2332}' +
    '._pm_dev_box .sub{color:#64748b;font-size:13px;margin-bottom:14px}' +
    '._pm_dev_box label{display:block;font-size:11px;font-weight:600;color:#64748b;margin:8px 0 3px;text-transform:uppercase;letter-spacing:0.5px}' +
    '._pm_dev_box input,._pm_dev_box select,._pm_dev_box textarea{width:100%;padding:7px 10px;border:1px solid #e2e8f0;border-radius:6px;font-size:13px;box-sizing:border-box}' +
    '._pm_dev_box textarea{height:50px;resize:vertical}' +
    '._pm_dev_box .row2{display:grid;grid-template-columns:1fr 1fr;gap:10px}' +
    '._pm_dev_btns{margin-top:14px;display:flex;gap:8px;justify-content:flex-end}' +
    '._pm_dev_btns button{padding:7px 18px;border-radius:6px;font-size:13px;font-weight:600;cursor:pointer;border:none}' +
    '._pm_dev_save{background:#059669;color:#fff}._pm_dev_del{background:#dc2626;color:#fff;margin-right:auto}._pm_dev_cancel{background:#f1f5f9;color:#475569}';
  if(!document.getElementById('_pm_dev_css'))document.head.appendChild(css);

  function openDeviceModal(serial){
    window.DB.sb.from('uttaeki').select('*').eq('serial',serial).single().then(function(r){
      if(!r.data){alert('Taeki ekki fundid: '+serial);return;}
      var d=r.data;
      var m=document.createElement('div');m.className='_pm_dev_modal';
      m.innerHTML='<div class="_pm_dev_box">' +
        '<h3>'+serial+'</h3>' +
        '<div class="sub">'+(d.client||'Enginn eigandi')+' &mdash; '+(d.type||'')+' '+(d.size||'')+'</div>' +
        '<div class="row2">' +
          '<div><label>Ra\u00f0n\u00famer</label><input id="_dv_serial" value="'+(d.serial||'')+'" readonly style="background:#f1f5f9"></div>' +
          '<div><label>Sta\u00f0a</label><select id="_dv_status"><option value="active"'+(d.status==='active'?' selected':'')+'>Active</option><option value="ok"'+(d.status==='ok'?' selected':'')+'>\u00cd lagi</option><option value="geymsla"'+(d.status==='geymsla'?' selected':'')+'>\u00cd geymslu</option><option value="i_vinnslu"'+(d.status==='i_vinnslu'?' selected':'')+'>\u00cd vinnslu</option><option value="onytt"'+(d.status==='onytt'?' selected':'')+'>\u00d3n\u00fdtt</option></select></div>' +
        '</div>' +
        '<div class="row2">' +
          '<div><label>Tegund</label><input id="_dv_type" value="'+(d.type||'')+'"></div>' +
          '<div><label>St\u00e6r\u00f0</label><input id="_dv_size" value="'+(d.size||'')+'"></div>' +
        '</div>' +
        '<div class="row2">' +
          '<div><label>Vi\u00f0skiptavinur</label><input id="_dv_client" value="'+(d.client||'')+'"></div>' +
          '<div><label>S\u00edmi</label><input id="_dv_phone" value="'+(d.phone||'')+'"></div>' +
        '</div>' +
        '<div class="row2">' +
          '<div><label>Sta\u00f0setning</label><input id="_dv_location" value="'+(d.location||'')+'"></div>' +
          '<div><label>\u00derysting</label><input id="_dv_pressure" value="'+(d.pressure||'')+'"></div>' +
        '</div>' +
        '<div class="row2">' +
          '<div><label>S\u00ed\u00f0asta sko\u00f0un</label><input id="_dv_lastinsp" type="date" value="'+(d.last_insp||'')+'"></div>' +
          '<div><label>N\u00e6sta sko\u00f0un</label><input id="_dv_nextinsp" type="date" value="'+(d.next_insp||'')+'"></div>' +
        '</div>' +
        '<label>Athugasemdir</label><textarea id="_dv_notes">'+(d.notes||'').replace(/</g,'&lt;')+'</textarea>' +
        '<div class="_pm_dev_btns"><button class="_pm_dev_del">Ey\u00f0a t\u00e6ki</button><button class="_pm_dev_cancel">H\u00e6tta vi\u00f0</button><button class="_pm_dev_save">Vista</button></div>' +
      '</div>';
      document.body.appendChild(m);
      m.onclick=function(e){if(e.target===m)m.remove();};
      m.querySelector('._pm_dev_cancel').onclick=function(){m.remove();};
      m.querySelector('._pm_dev_save').onclick=function(){
        var upd={
          status:document.getElementById('_dv_status').value,
          type:document.getElementById('_dv_type').value.trim(),
          size:document.getElementById('_dv_size').value.trim(),
          client:document.getElementById('_dv_client').value.trim(),
          phone:document.getElementById('_dv_phone').value.trim(),
          location:document.getElementById('_dv_location').value.trim(),
          pressure:document.getElementById('_dv_pressure').value.trim(),
          last_insp:document.getElementById('_dv_lastinsp').value||null,
          next_insp:document.getElementById('_dv_nextinsp').value||null,
          notes:document.getElementById('_dv_notes').value.trim()
        };
        window.DB.sb.from('uttaeki').update(upd).eq('serial',serial).then(function(res){
          if(res.error){alert('Villa: '+res.error.message);return;}
          m.remove();
          if(window._currentCompanyId && window.Companies) window.Companies.openDetail(window._currentCompanyId);
        });
      };
      m.querySelector('._pm_dev_del').onclick=function(){
        if(!confirm('Eyda taeki '+serial+'?')) return;
        window.DB.sb.from('uttaeki').delete().eq('serial',serial).then(function(res){
          if(res.error){alert('Villa: '+res.error.message);return;}
          m.remove();
          if(window._currentCompanyId && window.Companies) window.Companies.openDetail(window._currentCompanyId);
        });
      };
    });
  }
  window._pmOpenDevice = openDeviceModal;

  // Make equipment table rows clickable
  function hookDeviceRows(){
    var tables = document.querySelectorAll('table');
    tables.forEach(function(table){
      var ths = table.querySelectorAll('th');
      var hasSerial = false;
      ths.forEach(function(th){if(/RA[ÐD]N|serial/i.test(th.textContent))hasSerial=true;});
      if(!hasSerial) return;
      var rows = table.querySelectorAll('tbody tr');
      rows.forEach(function(row){
        if(row.dataset._pmDevHook) return;
        row.dataset._pmDevHook='1';
        row.classList.add('_pm_dev_row');
        var serial = row.querySelector('td') ? row.querySelector('td').textContent.trim() : '';
        if(!serial) return;
        row.addEventListener('click',function(e){
          if(e.target.tagName==='SELECT'||e.target.tagName==='BUTTON'||e.target.tagName==='INPUT'||e.target.tagName==='A') return;
          openDeviceModal(serial);
        });
      });
    });
  }
  setInterval(hookDeviceRows, 2000);
  console.log('[pm] device detail modal active');
})();


/* ===== COMPANY MEMO BOX (fixed: finds company by name) ===== */
(function(){
  var css=document.createElement('style');css.id='_pm_memo_css';
  css.textContent='._pm_memo_wrap{margin:12px 0 16px;padding:12px 16px;background:#eff6ff;border:1px solid #93c5fd;border-radius:10px}._pm_memo_wrap label{display:block;font-size:12px;font-weight:700;color:#1e40af;margin-bottom:6px;text-transform:uppercase}._pm_memo_ta{width:100%;min-height:60px;padding:8px 10px;border:1px solid #bfdbfe;border-radius:6px;font-size:13px;resize:vertical;font-family:inherit;box-sizing:border-box;background:#f8faff}._pm_memo_saved{font-size:11px;color:#059669;margin-left:8px;opacity:0;transition:opacity .3s}';
  if(!document.getElementById('_pm_memo_css'))document.head.appendChild(css);

  // Find company ID by looking at the page heading
  function findCompanyId(){
    // 1. Check if already set
    if(window._currentCompanyId) return Promise.resolve(window._currentCompanyId);
    // 2. Find company name from the page heading (h1/h2 near Til baka)
    var headings = document.querySelectorAll('h1,h2,h3,[class*="name"],[class*="title"]');
    var companyName = null;
    headings.forEach(function(h){
      var text = h.textContent.trim();
      // Skip generic headings
      if(text.length > 3 && text.length < 100 && !/Geymsla|Verkbei|Tekjur|Sala|Vorur|Sl\u00f6kkvi/i.test(text)){
        if(!companyName) companyName = text;
      }
    });
    if(!companyName) return Promise.resolve(null);
    // 3. Look up in DB by name
    return window.DB.sb.from('fyrirtaeki').select('id').eq('nafn',companyName).single().then(function(r){
      if(r.data){
        window._currentCompanyId = r.data.id;
        return r.data.id;
      }
      // Try partial match
      return window.DB.sb.from('fyrirtaeki').select('id').ilike('nafn','%'+companyName.substring(0,10)+'%').limit(1).then(function(r2){
        if(r2.data && r2.data.length){
          window._currentCompanyId = r2.data[0].id;
          return r2.data[0].id;
        }
        return null;
      });
    });
  }

  function addMemoBox(){
    var tables = document.querySelectorAll('table');
    tables.forEach(function(table){
      var ths=table.querySelectorAll('th');
      var hasSerial=false;
      ths.forEach(function(th){if(/RA[\u00d0D]N|serial/i.test(th.textContent))hasSerial=true;});
      if(!hasSerial) return;
      if(table.parentNode.querySelector('._pm_memo_wrap')) return;
      // Create memo box now, load data async
      var wrap=document.createElement('div');wrap.className='_pm_memo_wrap';
      wrap.innerHTML='<label>\u2709 Minn\u00f3 / Athugasemdir <span class="_pm_memo_saved" id="_memo_saved">\u2713 Vista\u00f0!</span></label><textarea class="_pm_memo_ta" id="_pm_memo_input" placeholder="Skrifa\u00f0u athugasemdir h\u00e9r..."></textarea>';
      table.parentNode.insertBefore(wrap,table);
      var ta=document.getElementById('_pm_memo_input');
      // Load saved text
      findCompanyId().then(function(cid){
        if(!cid){ta.placeholder='Engin fyrirt\u00e6ki tengt';ta.disabled=true;return;}
        wrap.dataset.cid=cid;
        window.DB.sb.from('fyrirtaeki').select('athugasemdir').eq('id',cid).single().then(function(r){
          if(r.data && r.data.athugasemdir) ta.value=r.data.athugasemdir;
        });
      });
      // Auto-save
      var timer;
      ta.addEventListener('input',function(){
        clearTimeout(timer);
        timer=setTimeout(function(){
          var cid=wrap.dataset.cid||window._currentCompanyId;
          if(!cid) return;
          window.DB.sb.from('fyrirtaeki').update({athugasemdir:ta.value}).eq('id',cid).then(function(r){
            if(!r.error){
              var s=document.getElementById('_memo_saved');
              if(s){s.style.opacity='1';setTimeout(function(){s.style.opacity='0';},2000);}
            }
          });
        },1500);
      });
    });
  }
  setInterval(addMemoBox,2000);
  console.log('[pm] company memo box active');
})();


/* ===== BATCH SELECT+UPDATE ===== */
(function(){
  var css=document.createElement('style');css.id='_pm_batch_css';
  css.textContent='._pm_cb{width:18px;height:18px;cursor:pointer;accent-color:#2563eb}._pm_batch_bar{position:sticky;top:0;z-index:100;background:#1e40af;color:#fff;padding:8px 16px;border-radius:8px;margin-bottom:10px;display:flex;align-items:center;gap:12px;font-size:13px;font-weight:500;box-shadow:0 2px 8px rgba(0,0,0,0.15)}._pm_batch_bar select{padding:4px 8px;border-radius:4px;border:none;font-size:12px}._pm_batch_bar button{padding:5px 14px;border-radius:6px;border:none;font-weight:600;font-size:12px;cursor:pointer}._pm_b_apply{background:#fbbf24;color:#92400e}._pm_b_close{background:rgba(255,255,255,0.2);color:#fff}';
  if(!document.getElementById('_pm_batch_css'))document.head.appendChild(css);
  function addCB(){
    document.querySelectorAll('table').forEach(function(t){
      var ths=t.querySelectorAll('th');var ok=false;
      ths.forEach(function(th){if(/RA[\u00d0D]N|serial/i.test(th.textContent))ok=true;});
      if(!ok||t.dataset._pmCb) return;t.dataset._pmCb='1';
      var thR=t.querySelector('thead tr');if(!thR) return;
      var cbTh=document.createElement('th');cbTh.style.cssText='width:30px;text-align:center';
      var aCb=document.createElement('input');aCb.type='checkbox';aCb.className='_pm_cb';aCb.title='Velja allt';
      aCb.onchange=function(){t.querySelectorAll('tbody ._pm_cb').forEach(function(c){c.checked=aCb.checked;});updBar(t);};
      cbTh.appendChild(aCb);thR.insertBefore(cbTh,thR.firstChild);
      t.querySelectorAll('tbody tr').forEach(function(row){
        var td=document.createElement('td');td.style.cssText='text-align:center';
        var cb=document.createElement('input');cb.type='checkbox';cb.className='_pm_cb';
        var sCell=row.querySelector('td');cb.dataset.serial=sCell?sCell.textContent.trim():'';
        cb.onchange=function(){updBar(t);};td.appendChild(cb);row.insertBefore(td,row.firstChild);
      });
    });
  }
  function updBar(t){
    var cked=t.querySelectorAll('tbody ._pm_cb:checked');
    var bar=t.parentNode.querySelector('._pm_batch_bar');
    if(!cked.length){if(bar)bar.remove();return;}
    if(!bar){bar=document.createElement('div');bar.className='_pm_batch_bar';t.parentNode.insertBefore(bar,t);}
    var srs=[];cked.forEach(function(c){if(c.dataset.serial)srs.push(c.dataset.serial);});
    bar.innerHTML='<span>'+srs.length+' valin</span><select id="_pb_act"><option value="">Veldu...</option><option value="active">\u2192 Active</option><option value="ok">\u2192 \u00cd lagi</option><option value="geymsla">\u2192 \u00cd geymslu</option><option value="i_vinnslu">\u2192 \u00cd vinnslu</option><option value="onytt">\u2192 \u00d3n\u00fdtt</option><option value="inspect">\u2713 Sko\u00f0a\u00f0 \u00ed dag</option></select><button class="_pm_b_apply">Uppf\u00e6ra</button><button class="_pm_b_close">\u00d7</button>';
    window._pbSrs=srs;
    bar.querySelector('._pm_b_apply').onclick=function(){
      var act=document.getElementById('_pb_act').value;if(!act){alert('Veldu a\u00f0ger\u00f0');return;}
      var upd={};
      if(act==='inspect'){var d=new Date().toISOString().split('T')[0];var ny=new Date();ny.setFullYear(ny.getFullYear()+1);upd={last_insp:d,next_insp:ny.toISOString().split('T')[0]};}
      else upd={status:act};
      window.DB.sb.from('uttaeki').update(upd).in('serial',window._pbSrs).then(function(r){
        if(r.error){alert('Villa: '+r.error.message);return;}
        alert(window._pbSrs.length+' t\u00e6ki uppf\u00e6r\u00f0!');if(window._currentCompanyId&&window.Companies)window.Companies.openDetail(window._currentCompanyId);else location.reload();
      });
    };
    bar.querySelector('._pm_b_close').onclick=function(){t.querySelectorAll('._pm_cb').forEach(function(c){c.checked=false;});bar.remove();};
  }
  setInterval(addCB,2000);
  console.log('[pm] batch select active');
})();

/* ===== ENHANCED COMPANY INFO ===== */
(function(){
  function enhance(){
    var grids=document.querySelectorAll('.info-grid');
    grids.forEach(function(box){
      if(box.dataset._pmInfo) return;
      // Check it has Simi/Netfang labels
      if(box.textContent.indexOf('S\u00edmi')<0) return;
      box.dataset._pmInfo='1';
      var cid=window._currentCompanyId;if(!cid) return;
      window.DB.sb.from('fyrirtaeki').select('*').eq('id',cid).single().then(function(r){
        if(!r.data) return;var c=r.data;
        box.style.cssText='display:grid;grid-template-columns:1fr 1fr 1fr;gap:0;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;margin:0 0 16px;font-size:13px;background:#fff';
        box.className='info-grid _pm_info_enhanced';
        var fields=[['Kennitala',c.kennitala],['S\u00edmi',c.simi],['Heimilisfang',c.heimilisfang],['Netfang',c.netfang],['Tengilid\u00f0ur',c.tengili\u00f0ur],['Athugasemdir',(c.athugasemdir||'').substring(0,60)]];
        box.innerHTML='';
        fields.forEach(function(f,i){
          var d=document.createElement('div');
          d.style.cssText='padding:8px 12px;'+(i<3?'border-bottom:1px solid #f1f5f9;':'');
          d.innerHTML='<div style="font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px">'+f[0]+'</div><div style="margin-top:2px;color:#1e293b;font-weight:500">'+(f[1]||'\u2014')+'</div>';
          box.appendChild(d);
        });
      });
    });
  }
  setInterval(enhance,2000);
  console.log('[pm] enhanced company info active');
})();
})();

/* === SALA SUITE v3 (2026-04-30) === */

/* =============================================================
   SALA — Móttaka tækis frá viðskiptavin
   =============================================================
   Flow:
     1) Search vidskiptavinir + fyrirtaeki (autocomplete)
        -> "+ Nýr viðskiptavinur" if no match
     2) Intake form: add 1..N tæki
        -> on serial blur: lookup uttaeki, prefill if found
        -> mode toggle: one verkbeiðni for all  vs  one per tæki
     3) Submit:
        -> upsert uttaeki rows (status='Móttekið', location='Verkstæði')
        -> insert verkbeiðni(r) with auto-incremented num
        -> success modal with ticket number(s)

   Append to patch-master.js, or load as separate <script defer>.
   Self-contained: own styles, own modal infra, no external deps
   beyond window.sb (Supabase JS client).
   ============================================================= */
(() => {
  const TAG = '[sala-mottaka]';
  const log  = (...a) => console.log(TAG, ...a);
  const warn = (...a) => console.warn(TAG, ...a);

  /* ---------- Supabase access ---------- */
  const sb = () => window.sb || window.supabase || null;
  async function waitForSB(timeoutMs = 15000) {
    const t0 = Date.now();
    while (!sb() && Date.now() - t0 < timeoutMs) {
      await new Promise(r => setTimeout(r, 100));
    }
    return sb();
  }

  /* ---------- Styles ---------- */
  const STYLE_ID = 'sala-mottaka-style';
  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const css = `
      .sm-overlay { position:fixed; inset:0; background:rgba(0,0,0,.55); z-index:9000;
        display:flex; align-items:flex-start; justify-content:center; padding:16px; overflow-y:auto; }
      .sm-modal { background:#fff; border-radius:12px; max-width:720px; width:100%;
        box-shadow:0 20px 60px rgba(0,0,0,.3); margin:24px auto; }
      .sm-head { padding:14px 18px; border-bottom:1px solid #e5e7eb;
        display:flex; align-items:center; justify-content:space-between; gap:8px; }
      .sm-head h3 { margin:0; font-size:17px; }
      .sm-x { background:none; border:none; font-size:26px; line-height:1; cursor:pointer; color:#6b7280; padding:2px 8px; }
      .sm-body { padding:14px 18px; }
      .sm-foot { padding:12px 18px; border-top:1px solid #e5e7eb;
        display:flex; gap:8px; justify-content:flex-end; flex-wrap:wrap; }
      .sm-input, .sm-select { width:100%; padding:10px 12px; border:1px solid #d1d5db;
        border-radius:8px; font-size:14px; box-sizing:border-box; background:#fff; }
      .sm-input:focus, .sm-select:focus { outline:none; border-color:#2563eb;
        box-shadow:0 0 0 3px rgba(37,99,235,.15); }
      .sm-row { display:flex; gap:8px; flex-wrap:wrap; }
      .sm-row > * { flex:1 1 140px; }
      .sm-label { display:block; font-size:12px; font-weight:600; color:#374151; margin:0 0 4px; }
      .sm-results { max-height:340px; overflow-y:auto; border:1px solid #e5e7eb; border-radius:8px; margin-top:8px; }
      .sm-result { padding:10px 12px; border-bottom:1px solid #f3f4f6; cursor:pointer;
        display:flex; justify-content:space-between; align-items:center; gap:8px; }
      .sm-result:last-child { border-bottom:none; }
      .sm-result:hover, .sm-result.active { background:#f3f4f6; }
      .sm-result-main { flex:1; min-width:0; }
      .sm-result-name { font-weight:600; }
      .sm-result-meta { font-size:12px; color:#6b7280; margin-top:2px; }
      .sm-badge { padding:2px 8px; border-radius:10px; font-size:11px; font-weight:600; white-space:nowrap; }
      .sm-badge-cust  { background:#dbeafe; color:#1e40af; }
      .sm-badge-comp  { background:#fef3c7; color:#92400e; }
      .sm-badge-known { background:#d1fae5; color:#065f46; }
      .sm-badge-new   { background:#e0e7ff; color:#3730a3; }
      .sm-btn { padding:10px 14px; border-radius:8px; border:1px solid #d1d5db; background:#fff;
        cursor:pointer; font-size:14px; font-weight:500; }
      .sm-btn:hover { background:#f9fafb; }
      .sm-btn-pri { background:#2563eb; color:#fff; border-color:#2563eb; }
      .sm-btn-pri:hover { background:#1d4ed8; }
      .sm-btn-pri:disabled { background:#9ca3af; border-color:#9ca3af; cursor:not-allowed; }
      .sm-btn-danger { color:#b91c1c; border-color:#fecaca; }
      .sm-btn-danger:hover { background:#fef2f2; }
      .sm-toolbtn { padding:10px 14px; border-radius:8px; border:1px solid #2563eb;
        background:#2563eb; color:#fff; cursor:pointer; font-weight:600; font-size:14px; }
      .sm-tile { background:#f9fafb; border:1px solid #e5e7eb; border-radius:10px; padding:12px; margin-bottom:8px; }
      .sm-tile-head { display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; gap:8px; }
      .sm-tile-title { font-weight:600; }
      .sm-empty { text-align:center; color:#6b7280; padding:20px; font-size:13px; }
      .sm-customer-card { background:#eff6ff; border:1px solid #bfdbfe; border-radius:8px;
        padding:12px; margin-bottom:14px; display:flex; justify-content:space-between; align-items:center; gap:8px; }
      .sm-radios { display:flex; gap:8px; flex-wrap:wrap; margin-bottom:14px; }
      .sm-radio { flex:1 1 200px; border:1px solid #d1d5db; border-radius:8px; padding:10px 12px;
        cursor:pointer; display:flex; gap:10px; align-items:center; background:#fff; }
      .sm-radio.active { background:#eff6ff; border-color:#2563eb; }
      .sm-radio input { margin:0; }
      .sm-success { background:#d1fae5; border:1px solid #10b981; border-radius:8px; padding:18px; text-align:center; }
      .sm-success-title { font-size:18px; font-weight:700; color:#065f46; margin-bottom:6px; }
      .sm-success-num { font-family:ui-monospace,Menlo,Consolas,monospace; font-size:24px;
        color:#065f46; font-weight:700; letter-spacing:.5px; }
      .sm-err { background:#fee2e2; border:1px solid #fca5a5; color:#991b1b;
        padding:10px; border-radius:8px; margin:8px 0; font-size:13px; }
      .sm-spacer-sm { height:6px; }
      .sm-spacer-md { height:10px; }
      @media (max-width: 600px) {
        .sm-overlay { padding:0; }
        .sm-modal { margin:0 auto; border-radius:0; min-height:100vh; max-width:100%; }
        .sm-head, .sm-body, .sm-foot { padding-left:14px; padding-right:14px; }
        .sm-row > * { flex:1 1 100%; }
        .sm-foot { position:sticky; bottom:0; background:#fff; }
      }
    `;
    const s = document.createElement('style');
    s.id = STYLE_ID;
    s.textContent = css;
    document.head.appendChild(s);
  }

  /* ---------- Modal infra ---------- */
  let activeOverlay = null;
  function closeModal() {
    if (activeOverlay) { activeOverlay.remove(); activeOverlay = null; }
  }
  function openModal(title, contentEl, footerEls = []) {
    closeModal();
    injectStyles();
    const overlay = document.createElement('div');
    overlay.className = 'sm-overlay';
    overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
    const modal = document.createElement('div');
    modal.className = 'sm-modal';
    modal.innerHTML = `
      <div class="sm-head"><h3></h3><button class="sm-x" type="button" aria-label="Loka">×</button></div>
      <div class="sm-body"></div>
      ${footerEls.length ? '<div class="sm-foot"></div>' : ''}
    `;
    modal.querySelector('h3').textContent = title;
    modal.querySelector('.sm-x').addEventListener('click', closeModal);
    modal.querySelector('.sm-body').appendChild(contentEl);
    if (footerEls.length) {
      const foot = modal.querySelector('.sm-foot');
      footerEls.forEach(e => foot.appendChild(e));
    }
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    activeOverlay = overlay;
    // Esc to close
    const onKey = e => {
      if (e.key === 'Escape') { closeModal(); document.removeEventListener('keydown', onKey); }
    };
    document.addEventListener('keydown', onKey);
    return modal;
  }

  /* ---------- Helpers ---------- */
  function debounce(fn, ms) {
    let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
  }
  function el(tag, props = {}, children = []) {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(props)) {
      if (v == null || v === false) continue;
      if (k === 'class') e.className = v;
      else if (k === 'style' && typeof v === 'object') Object.assign(e.style, v);
      else if (k === 'style') e.setAttribute('style', v);
      else if (k === 'on') for (const [ev, h] of Object.entries(v)) e.addEventListener(ev, h);
      else if (k === 'html') e.innerHTML = v;
      else if (k === 'text') e.textContent = v;
      else if (k in e && typeof e[k] !== 'object') {
        try { e[k] = v; } catch { e.setAttribute(k, v); }
      } else e.setAttribute(k, v);
    }
    (Array.isArray(children) ? children : [children]).forEach(c => {
      if (c == null || c === false) return;
      e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return e;
  }
  const todayISO = () => new Date().toISOString().slice(0, 10);

  /* ---------- Data layer ---------- */
  async function searchCustomers(q) {
    const c = sb();
    if (!c) return { vidsk: [], fyrir: [] };
    const like = `%${q.replace(/[%_]/g, m => '\\' + m)}%`;
    const [vRes, fRes] = await Promise.all([
      c.from('vidskiptavinir')
        .select('id,nafn,kennitala,simi,netfang,heimilisfang')
        .or(`nafn.ilike.${like},kennitala.ilike.${like},simi.ilike.${like}`)
        .limit(8),
      c.from('fyrirtaeki')
        .select('*')
        .or(`nafn.ilike.${like},kennitala.ilike.${like}`)
        .limit(8)
        .then(r => r, () => ({ data: [] })),
    ]);
    return {
      vidsk: vRes && vRes.data ? vRes.data : [],
      fyrir: fRes && fRes.data ? fRes.data : [],
    };
  }

  async function lookupTaeki(serial) {
    const c = sb();
    if (!c || !serial) return null;
    const { data } = await c.from('uttaeki')
      .select('*')
      .eq('serial', serial.trim())
      .limit(1);
    return data && data[0] ? data[0] : null;
  }

  async function nextVerkNum() {
    const c = sb();
    if (!c) return Date.now();
    const { data } = await c.from('verkbeidnir')
      .select('num')
      .order('num', { ascending: false })
      .limit(1);
    const top = data && data[0] && Number(data[0].num);
    return Number.isFinite(top) ? top + 1 : 1001;
  }

  async function createIntake({ customer, items, mode }) {
    const c = sb();
    if (!c) throw new Error('Engin Supabase tenging');

    const customerName  = customer.nafn || customer.name || '—';
    const customerPhone = customer.simi || '';
    const dropoff = todayISO();
    const startNum = await nextVerkNum();

    // 1) Upsert tæki
    const taekiResults = [];
    for (const it of items) {
      const payload = {
        serial:   it.serial.trim(),
        type:     it.type   || null,
        size:     it.size   || null,
        client:   customerName,
        phone:    customerPhone || null,
        location: 'Verkstæði',
        status:   'Móttekið',
        notes:    it.notes  || null,
      };
      if (it.existingId) {
        const { error } = await c.from('uttaeki').update(payload).eq('id', it.existingId);
        if (error) throw error;
        taekiResults.push({ ...it, id: it.existingId });
      } else {
        const { data, error } = await c.from('uttaeki').insert(payload).select().single();
        if (error) throw error;
        taekiResults.push({ ...it, id: data.id });
      }
    }

    // 2) Verkbeiðni rows
    const fmt = t => `${t.serial}${t.type ? ' / ' + t.type : ''}${t.size ? ' / ' + t.size : ''}${t.notes ? ' — ' + t.notes : ''}`;
    const verkRows = mode === 'one'
      ? [{
          num: startNum,
          status: 'Í vinnslu',
          customer: customerName,
          phone: customerPhone || null,
          dropoff,
          notes: taekiResults.map(fmt).join('\n'),
        }]
      : taekiResults.map((t, i) => ({
          num: startNum + i,
          status: 'Í vinnslu',
          customer: customerName,
          phone: customerPhone || null,
          dropoff,
          notes: fmt(t),
        }));

    const { data: verkData, error: verkErr } = await c.from('verkbeidnir').insert(verkRows).select();
    if (verkErr) throw verkErr;
    return { verk: verkData || verkRows, taeki: taekiResults };
  }

  async function createCustomer(p) {
    const c = sb();
    const { data, error } = await c.from('vidskiptavinir').insert({
      nafn:      (p.nafn || '').trim(),
      kennitala: (p.kennitala || '').trim() || null,
      simi:      (p.simi || '').trim() || null,
      netfang:   (p.netfang || '').trim() || null,
    }).select().single();
    if (error) throw error;
    return data;
  }

  /* ---------- UI: customer search ---------- */
  function openSearch() {
    injectStyles();
    const body = el('div');
    const input = el('input', {
      class: 'sm-input',
      type: 'search',
      placeholder: 'Nafn, kennitala eða sími…',
      autocomplete: 'off',
      inputMode: 'search',
    });
    const results = el('div', { class: 'sm-results' });
    results.appendChild(el('div', { class: 'sm-empty', text: 'Sláðu inn til að leita' }));

    body.append(
      el('label', { class: 'sm-label', text: 'Leita að viðskiptavini eða fyrirtæki' }),
      input,
      results,
    );

    function renderResults(rows) {
      results.innerHTML = '';
      if (!rows.length) {
        results.appendChild(el('div', { class: 'sm-empty', text: 'Engar niðurstöður — prófaðu „+ Nýr viðskiptavinur"' }));
        return;
      }
      rows.forEach(r => {
        const node = el('div', {
          class: 'sm-result',
          on: { click: () => {
            closeModal();
            if (typeof window.salaOnCustomerPicked === 'function') window.salaOnCustomerPicked(r);
            else openIntake(r);
          } },
        }, [
          el('div', { class: 'sm-result-main' }, [
            el('div', { class: 'sm-result-name', text: r.nafn || r.name || '—' }),
            el('div', { class: 'sm-result-meta',
              text: [r.kennitala, r.simi].filter(Boolean).join(' · ') }),
          ]),
          el('span', {
            class: 'sm-badge ' + (r._kind === 'fyrir' ? 'sm-badge-comp' : 'sm-badge-cust'),
            text: r._kind === 'fyrir' ? 'Fyrirtæki' : 'Viðskiptavinur',
          }),
        ]);
        results.appendChild(node);
      });
    }

    const doSearch = debounce(async (q) => {
      q = (q || '').trim();
      if (q.length < 2) {
        results.innerHTML = '';
        results.appendChild(el('div', { class: 'sm-empty', text: 'Sláðu inn að minnsta kosti 2 stafi' }));
        return;
      }
      results.innerHTML = '';
      results.appendChild(el('div', { class: 'sm-empty', text: 'Leita…' }));
      try {
        const { vidsk, fyrir } = await searchCustomers(q);
        const all = [
          ...vidsk.map(v => ({ ...v, _kind: 'vidsk' })),
          ...fyrir.map(f => ({ ...f, _kind: 'fyrir' })),
        ];
        renderResults(all);
      } catch (e) {
        warn('search err', e);
        results.innerHTML = '';
        results.appendChild(el('div', { class: 'sm-err', text: 'Villa: ' + (e.message || e) }));
      }
    }, 220);

    input.addEventListener('input', () => doSearch(input.value));
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        const first = results.querySelector('.sm-result');
        if (first) first.click();
      }
    });

    const newBtn = el('button', {
      class: 'sm-btn',
      text: '+ Nýr viðskiptavinur',
      on: { click: () => { closeModal(); openNewCustomer(input.value.trim()); } },
    });
    const cancelBtn = el('button', { class: 'sm-btn', text: 'Loka', on: { click: closeModal } });

    openModal('Móttaka tækis — leita', body, [newBtn, cancelBtn]);
    setTimeout(() => input.focus(), 50);
  }

  /* ---------- UI: new customer ---------- */
  function openNewCustomer(prefillName = '') {
    const body = el('div');
    const f = {
      nafn:      el('input', { class: 'sm-input', placeholder: 'Fullt nafn', value: prefillName, required: true }),
      kennitala: el('input', { class: 'sm-input', placeholder: '000000-0000', inputMode: 'numeric' }),
      simi:      el('input', { class: 'sm-input', placeholder: '+354 …', type: 'tel' }),
      netfang:   el('input', { class: 'sm-input', placeholder: 'tölvupóstur', type: 'email' }),
    };
    body.append(
      el('label', { class: 'sm-label', text: 'Nafn *' }), f.nafn, el('div', { class: 'sm-spacer-sm' }),
      el('label', { class: 'sm-label', text: 'Kennitala' }), f.kennitala, el('div', { class: 'sm-spacer-sm' }),
      el('label', { class: 'sm-label', text: 'Sími' }), f.simi, el('div', { class: 'sm-spacer-sm' }),
      el('label', { class: 'sm-label', text: 'Netfang' }), f.netfang,
    );
    const errBox = el('div'); body.appendChild(errBox);

    const back = el('button', {
      class: 'sm-btn',
      text: '← Til baka',
      on: { click: () => { closeModal(); openSearch(); } },
    });
    const save = el('button', {
      class: 'sm-btn sm-btn-pri',
      text: 'Vista og halda áfram',
      on: { click: async () => {
        errBox.innerHTML = '';
        if (!f.nafn.value.trim()) {
          errBox.appendChild(el('div', { class: 'sm-err', text: 'Nafn er nauðsynlegt' }));
          return;
        }
        save.disabled = true;
        try {
          const c = await createCustomer({
            nafn: f.nafn.value, kennitala: f.kennitala.value,
            simi: f.simi.value, netfang: f.netfang.value,
          });
          closeModal();
          if (typeof window.salaOnCustomerPicked === 'function') {
            window.salaOnCustomerPicked({ ...c, _kind: 'vidsk' });
          } else {
            openIntake({ ...c, _kind: 'vidsk' });
          }
        } catch (e) {
          save.disabled = false;
          errBox.appendChild(el('div', { class: 'sm-err', text: 'Villa: ' + (e.message || e) }));
        }
      }},
    });
    openModal('Nýr viðskiptavinur', body, [back, save]);
    setTimeout(() => f.nafn.focus(), 50);
  }

  /* ---------- UI: intake ---------- */
  function openIntake(customer) {
    const body = el('div');
    const items = [];

    /* Customer card */
    body.appendChild(el('div', { class: 'sm-customer-card' }, [
      el('div', {}, [
        el('div', { style: 'font-weight:600', text: customer.nafn || customer.name || '—' }),
        el('div', { style: 'font-size:12px;color:#374151',
          text: [customer.kennitala, customer.simi].filter(Boolean).join(' · ') }),
      ]),
      el('button', {
        class: 'sm-btn',
        text: 'Breyta',
        on: { click: () => { closeModal(); openSearch(); } },
      }),
    ]));

    /* Mode toggle */
    let mode = 'one';
    const radios = el('div', { class: 'sm-radios' });
    const rOne = el('div', { class: 'sm-radio active' }, [
      el('input', { type: 'radio', name: 'sm-mode', checked: true }),
      el('div', {}, [
        el('div', { style: 'font-weight:600', text: 'Eitt verk fyrir allt' }),
        el('div', { style: 'font-size:12px;color:#6b7280', text: 'Ein verkbeiðni nær yfir öll tæki' }),
      ]),
    ]);
    const rEach = el('div', { class: 'sm-radio' }, [
      el('input', { type: 'radio', name: 'sm-mode' }),
      el('div', {}, [
        el('div', { style: 'font-weight:600', text: 'Eitt verk per tæki' }),
        el('div', { style: 'font-size:12px;color:#6b7280', text: 'Sjálfstætt verkbeiðni-númer á hvert tæki' }),
      ]),
    ]);
    function setMode(m) {
      mode = m;
      rOne.classList.toggle('active', m === 'one');
      rEach.classList.toggle('active', m === 'each');
      rOne.querySelector('input').checked = (m === 'one');
      rEach.querySelector('input').checked = (m === 'each');
    }
    rOne.addEventListener('click', () => setMode('one'));
    rEach.addEventListener('click', () => setMode('each'));
    radios.append(rOne, rEach);
    body.appendChild(radios);

    /* Tæki list */
    const list = el('div'); body.appendChild(list);

    function renderItems() {
      list.innerHTML = '';
      if (!items.length) {
        list.appendChild(el('div', { class: 'sm-empty', text: 'Engin tæki — bættu við hér að neðan.' }));
        return;
      }
      items.forEach((it, idx) => {
        const tile = el('div', { class: 'sm-tile' });

        const badges = [];
        if (it.existingId) badges.push(el('span', { class: 'sm-badge sm-badge-known', text: 'Þekkt' }));
        else if (it.serial && it._lookedUp) badges.push(el('span', { class: 'sm-badge sm-badge-new', text: 'Nýtt' }));

        tile.appendChild(el('div', { class: 'sm-tile-head' }, [
          el('div', { class: 'sm-tile-title', text: 'Tæki ' + (idx + 1) }),
          el('div', { style: 'display:flex;gap:8px;align-items:center' }, [
            ...badges,
            el('button', {
              class: 'sm-btn sm-btn-danger',
              text: '×',
              title: 'Fjarlægja',
              on: { click: () => { items.splice(idx, 1); renderItems(); } },
            }),
          ]),
        ]));

        const serialIn = el('input', { class: 'sm-input', placeholder: 'Raðnúmer / serial', value: it.serial || '' });
        const typeIn   = el('input', { class: 'sm-input', placeholder: 'Tegund (CO2, ABC, vatns…)', value: it.type || '' });
        const sizeIn   = el('input', { class: 'sm-input', placeholder: 'Stærð (kg/L)', value: it.size || '' });
        const notesIn  = el('input', { class: 'sm-input', placeholder: 'Athugasemd', value: it.notes || '' });

        serialIn.addEventListener('input', () => { it.serial = serialIn.value; });
        typeIn  .addEventListener('input', () => { it.type   = typeIn.value;   });
        sizeIn  .addEventListener('input', () => { it.size   = sizeIn.value;   });
        notesIn .addEventListener('input', () => { it.notes  = notesIn.value;  });

        // Lookup on blur or Enter
        const doLookup = async () => {
          const v = (serialIn.value || '').trim();
          if (!v) return;
          try {
            const found = await lookupTaeki(v);
            it._lookedUp = true;
            if (found) {
              it.existingId = found.id;
              if (!it.type) { it.type = found.type || ''; typeIn.value = it.type; }
              if (!it.size) { it.size = found.size || ''; sizeIn.value = it.size; }
            } else {
              it.existingId = null;
            }
            renderItems();
          } catch (e) { warn('lookup err', e); }
        };
        serialIn.addEventListener('blur', doLookup);
        serialIn.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); doLookup(); }});

        tile.append(
          el('label', { class: 'sm-label', text: 'Raðnúmer' }), serialIn,
          el('div', { class: 'sm-spacer-sm' }),
          el('div', { class: 'sm-row' }, [
            el('div', {}, [el('label', { class: 'sm-label', text: 'Tegund' }), typeIn]),
            el('div', {}, [el('label', { class: 'sm-label', text: 'Stærð'  }), sizeIn]),
          ]),
          el('div', { class: 'sm-spacer-sm' }),
          el('label', { class: 'sm-label', text: 'Athugasemd' }), notesIn,
        );
        list.appendChild(tile);
      });
    }

    body.appendChild(el('button', {
      class: 'sm-btn',
      style: 'width:100%;margin-top:8px',
      text: '+ Bæta við tæki',
      on: { click: () => { items.push({ serial: '', type: '', size: '', notes: '', existingId: null }); renderItems(); } },
    }));

    const errBox = el('div'); body.appendChild(errBox);

    // Start with one row
    items.push({ serial: '', type: '', size: '', notes: '', existingId: null });
    renderItems();

    const cancel = el('button', { class: 'sm-btn', text: 'Hætta við', on: { click: closeModal } });
    const submit = el('button', {
      class: 'sm-btn sm-btn-pri',
      text: 'Stofna verkbeiðni',
      on: { click: async () => {
        errBox.innerHTML = '';
        const valid = items.filter(it => (it.serial || '').trim());
        if (!valid.length) {
          errBox.appendChild(el('div', { class: 'sm-err', text: 'Bættu við að minnsta kosti einu tæki með raðnúmeri' }));
          return;
        }
        submit.disabled = true;
        submit.textContent = 'Vistar…';
        try {
          const result = await createIntake({ customer, items: valid, mode });
          showSuccess(result, customer);
        } catch (e) {
          submit.disabled = false;
          submit.textContent = 'Stofna verkbeiðni';
          errBox.appendChild(el('div', { class: 'sm-err', text: 'Villa: ' + (e.message || e) }));
        }
      }},
    });

    openModal('Móttaka tækis', body, [cancel, submit]);
  }

  /* ---------- UI: success ---------- */
  function showSuccess(result, customer) {
    const nums = (result.verk || []).map(v => v.num).join(', ');
    const body = el('div');
    body.appendChild(el('div', { class: 'sm-success' }, [
      el('div', { class: 'sm-success-title', text: 'Verkbeiðni stofnuð' }),
      el('div', { class: 'sm-success-num', text: '#' + nums }),
      el('div', { style: 'margin-top:8px', text: customer.nafn || customer.name || '' }),
      el('div', { style: 'font-size:13px;color:#065f46',
        text: result.taeki.length + ' tæki móttekin · ' + todayISO() }),
    ]));

    const newOne = el('button', {
      class: 'sm-btn',
      text: 'Ný móttaka',
      on: { click: () => { closeModal(); openSearch(); } },
    });
    const done = el('button', {
      class: 'sm-btn sm-btn-pri',
      text: 'Loka',
      on: { click: () => {
        closeModal();
        document.dispatchEvent(new CustomEvent('mottaka:done', { detail: { ...result, customer } }));
        if (typeof window.salaOnIntakeDone === 'function') {
          try { window.salaOnIntakeDone(customer, result); } catch (e) {}
        }
      }},
    });
    openModal('Tilbúið', body, [newOne, done]);
  }

  /* ---------- Entry button ---------- */
  function ensureButton() {
    if (document.getElementById('sm-mottaka-btn')) return;

    const candidates = [
      '#sala', '#sala-section', '[data-section="sala"]',
      '.sala', '.sala-page', '#salaTab', '[data-tab="sala"]',
    ];
    let host = null;
    for (const sel of candidates) {
      const n = document.querySelector(sel);
      if (n && n.offsetParent !== null) { host = n; break; }
    }

    const btn = el('button', {
      id: 'sm-mottaka-btn',
      class: 'sm-toolbtn',
      type: 'button',
      text: '📥 Móttaka tækis',
      on: { click: openSearch },
    });

    if (host) {
      btn.style.margin = '8px 0 12px';
      host.insertBefore(btn, host.firstChild);
    } else {
      // FAB fallback
      btn.style.position = 'fixed';
      btn.style.right = '16px';
      btn.style.bottom = '16px';
      btn.style.zIndex = '8000';
      btn.style.boxShadow = '0 6px 20px rgba(37,99,235,.35)';
      document.body.appendChild(btn);
    }
  }

  /* ---------- Boot ---------- */
  async function boot() {
    injectStyles();
    await waitForSB(15000);
    ensureButton();
    // Re-attach if SPA re-renders the Sala area
    let raf = null;
    const obs = new MutationObserver(() => {
      if (raf) return;
      raf = requestAnimationFrame(() => { raf = null; ensureButton(); });
    });
    obs.observe(document.body, { childList: true, subtree: true });
    log('ready');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  /* ---------- Public API ---------- */
  window.SalaMottaka = {
    open: openSearch,
    openCustomer: openIntake,
    openNewCustomer,
    version: '1.0.0',
  };
})();
/* =============================================================
   SALA DASHBOARD — extends sala-mottaka.js
   =============================================================
   Adds two buttons next to "📥 Móttaka tækis":
     - 📋 Móttekið í dag  → list today's verkbeiðnir, drill in
     - 📦 Afgreiðsla       → search any verk and complete pickup

   Verk detail modal supports two state actions:
     - ✓ Tilbúið          → status='Tilbúið'
     - 📦 Skrá afhendingu → status='Afhent', pickup=today,
                            linked uttaeki status='Sótt'

   Auto-refreshes today list when sala-mottaka fires
   `mottaka:done`. Reuses .sm-* styles from sala-mottaka.js.
   ============================================================= */
(() => {
  const TAG = '[sala-dashboard]';
  const log  = (...a) => console.log(TAG, ...a);
  const warn = (...a) => console.warn(TAG, ...a);

  const sb = () => window.sb || window.supabase || null;
  const todayISO = () => new Date().toISOString().slice(0, 10);

  async function waitFor(check, timeoutMs = 20000, interval = 150) {
    const t0 = Date.now();
    while (Date.now() - t0 < timeoutMs) {
      const r = check();
      if (r) return r;
      await new Promise(r => setTimeout(r, interval));
    }
    return null;
  }

  /* ---------- Modal infra (independent so this file works alone) ---------- */
  let activeOverlay = null;
  function closeModal() {
    if (activeOverlay) { activeOverlay.remove(); activeOverlay = null; }
  }
  function openModal(title, contentEl, footerEls = []) {
    closeModal();
    const overlay = document.createElement('div');
    overlay.className = 'sm-overlay';
    overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
    const modal = document.createElement('div');
    modal.className = 'sm-modal';
    modal.innerHTML = `
      <div class="sm-head"><h3></h3><button class="sm-x" type="button" aria-label="Loka">×</button></div>
      <div class="sm-body"></div>
      ${footerEls.length ? '<div class="sm-foot"></div>' : ''}
    `;
    modal.querySelector('h3').textContent = title;
    modal.querySelector('.sm-x').addEventListener('click', closeModal);
    modal.querySelector('.sm-body').appendChild(contentEl);
    if (footerEls.length) {
      const foot = modal.querySelector('.sm-foot');
      footerEls.forEach(e => foot.appendChild(e));
    }
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    activeOverlay = overlay;
    const onKey = e => { if (e.key === 'Escape') { closeModal(); document.removeEventListener('keydown', onKey); }};
    document.addEventListener('keydown', onKey);
    return modal;
  }

  function el(tag, props = {}, children = []) {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(props)) {
      if (v == null || v === false) continue;
      if (k === 'class') e.className = v;
      else if (k === 'style' && typeof v === 'object') Object.assign(e.style, v);
      else if (k === 'style') e.setAttribute('style', v);
      else if (k === 'on') for (const [ev, h] of Object.entries(v)) e.addEventListener(ev, h);
      else if (k === 'html') e.innerHTML = v;
      else if (k === 'text') e.textContent = v;
      else if (k in e && typeof e[k] !== 'object') {
        try { e[k] = v; } catch { e.setAttribute(k, v); }
      } else e.setAttribute(k, v);
    }
    (Array.isArray(children) ? children : [children]).forEach(c => {
      if (c == null || c === false) return;
      e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return e;
  }

  /* ---------- Data ---------- */
  async function fetchTodayVerk() {
    const c = sb();
    if (!c) return [];
    const { data, error } = await c.from('verkbeidnir')
      .select('*')
      .eq('dropoff', todayISO())
      .order('num', { ascending: false });
    if (error) { warn(error); return []; }
    return data || [];
  }

  async function fetchVerkBySearch(q) {
    const c = sb();
    if (!c) return [];
    const like = `%${q.replace(/[%_]/g, m => '\\' + m)}%`;
    const filters = [];
    if (!isNaN(Number(q)) && q.trim() !== '') filters.push(`num.eq.${Number(q)}`);
    filters.push(`customer.ilike.${like}`);
    filters.push(`phone.ilike.${like}`);
    const { data, error } = await c.from('verkbeidnir')
      .select('*')
      .or(filters.join(','))
      .order('num', { ascending: false })
      .limit(50);
    if (error) { warn(error); return []; }
    return data || [];
  }

  async function updateVerkStatus(id, patch) {
    const c = sb();
    const { error } = await c.from('verkbeidnir').update(patch).eq('id', id);
    if (error) throw error;
  }

  async function updateTaekiStatus(serial, status) {
    const c = sb();
    const { error } = await c.from('uttaeki').update({ status }).eq('serial', serial);
    if (error) throw error;
  }

  function parseSerialsFromNotes(notes) {
    return (notes || '').split('\n')
      .map(line => {
        const t = line.trim();
        if (!t) return null;
        // Format from sala-mottaka: "SERIAL / type / size — note"
        const m = t.match(/^([^\s/—]+)/);
        return m ? m[1] : null;
      })
      .filter(s => s);
  }

  /* ---------- UI helpers ---------- */
  function statusBadgeClass(s) {
    s = (s || '').toLowerCase();
    if (s.includes('afh') || s.includes('sótt')) return 'sm-badge-comp';
    if (s.includes('tilb')) return 'sm-badge-known';
    if (s.includes('mótt') || s.includes('vinns')) return 'sm-badge-cust';
    return 'sm-badge-new';
  }

  function verkRow(v, onClick) {
    return el('div', {
      class: 'sm-result',
      on: { click: () => onClick(v) },
    }, [
      el('div', { class: 'sm-result-main' }, [
        el('div', { class: 'sm-result-name', text: '#' + (v.num ?? '—') + '  ·  ' + (v.customer || '—') }),
        el('div', { class: 'sm-result-meta',
          text: [v.phone, v.dropoff].filter(Boolean).join(' · ') }),
      ]),
      el('span', { class: 'sm-badge ' + statusBadgeClass(v.status), text: v.status || '—' }),
    ]);
  }

  /* ---------- UI: today list ---------- */
  let todayRefreshHandler = null;
  function openTodayList() {
    const body = el('div');
    const list = el('div', { class: 'sm-results' });
    body.appendChild(list);

    const refresh = async () => {
      list.innerHTML = '';
      list.appendChild(el('div', { class: 'sm-empty', text: 'Sæki…' }));
      const rows = await fetchTodayVerk();
      list.innerHTML = '';
      if (!rows.length) {
        list.appendChild(el('div', { class: 'sm-empty', text: 'Engar verkbeiðnir í dag' }));
        return;
      }
      rows.forEach(v => list.appendChild(verkRow(v, x => { closeModal(); openVerkDetail(x, openTodayList); })));
    };

    const refreshBtn = el('button', { class: 'sm-btn', text: '↻ Endurnýja', on: { click: refresh }});
    const closeBtn   = el('button', { class: 'sm-btn', text: 'Loka', on: { click: closeModal }});
    openModal('Móttekið í dag', body, [refreshBtn, closeBtn]);
    refresh();

    // Hook mottaka:done (cleanup on overlay removal)
    if (todayRefreshHandler) document.removeEventListener('mottaka:done', todayRefreshHandler);
    todayRefreshHandler = () => refresh();
    document.addEventListener('mottaka:done', todayRefreshHandler);
    const cleanup = () => {
      if (todayRefreshHandler) {
        document.removeEventListener('mottaka:done', todayRefreshHandler);
        todayRefreshHandler = null;
      }
    };
    const obs = new MutationObserver(() => {
      if (!activeOverlay || !document.body.contains(activeOverlay)) {
        cleanup();
        obs.disconnect();
      }
    });
    obs.observe(document.body, { childList: true });
  }

  /* ---------- UI: verk detail ---------- */
  function openVerkDetail(v, onBack) {
    const body = el('div');

    body.appendChild(el('div', { class: 'sm-customer-card' }, [
      el('div', { style: 'min-width:0' }, [
        el('div', { style: 'font-weight:700;font-size:18px', text: '#' + (v.num ?? '—') }),
        el('div', { style: 'font-weight:600;margin-top:2px', text: v.customer || '—' }),
        el('div', { style: 'font-size:12px;color:#374151;margin-top:2px',
          text: [v.phone, v.dropoff && ('Móttekið ' + v.dropoff), v.pickup && ('Sótt ' + v.pickup)].filter(Boolean).join(' · ') }),
      ]),
      el('span', { class: 'sm-badge ' + statusBadgeClass(v.status), text: v.status || '—' }),
    ]));

    if (v.notes) {
      body.appendChild(el('div', { class: 'sm-tile' }, [
        el('div', { class: 'sm-tile-title', style: 'margin-bottom:6px', text: 'Tæki / athugasemd' }),
        el('div', { style: 'white-space:pre-wrap;font-size:13px;color:#374151', text: v.notes }),
      ]));
    }

    if (v.verd != null && v.verd !== '') {
      body.appendChild(el('div', {
        style: 'font-size:13px;color:#374151;margin:8px 0',
        text: 'Verð: ' + v.verd + ' kr',
      }));
    }

    const errBox = el('div'); body.appendChild(errBox);
    const status = (v.status || '').toLowerCase();
    const isAfhent = status.includes('afh') || status.includes('sótt');
    const isTilbuid = status.includes('tilb');

    const back = el('button', {
      class: 'sm-btn',
      text: '← Til baka',
      on: { click: () => { closeModal(); if (onBack) onBack(); } },
    });

    const ready = el('button', {
      class: 'sm-btn',
      text: '✓ Tilbúið',
      on: { click: async () => {
        errBox.innerHTML = '';
        ready.disabled = true;
        try {
          await updateVerkStatus(v.id, { status: 'Tilbúið' });
          closeModal();
          if (onBack) onBack();
        } catch (e) {
          ready.disabled = false;
          errBox.appendChild(el('div', { class: 'sm-err', text: 'Villa: ' + (e.message || e) }));
        }
      }},
    });

    const handover = el('button', {
      class: 'sm-btn sm-btn-pri',
      text: '📦 Skrá afhendingu',
      on: { click: async () => {
        errBox.innerHTML = '';
        handover.disabled = true;
        handover.textContent = 'Vistar…';
        try {
          await updateVerkStatus(v.id, { status: 'Afhent', pickup: todayISO() });
          // Best-effort: update linked uttaeki by serial parsed from notes
          const serials = parseSerialsFromNotes(v.notes);
          for (const s of serials) {
            try { await updateTaekiStatus(s, 'Sótt'); }
            catch (e) { warn('taeki status update failed for', s, e); }
          }
          closeModal();
          if (onBack) onBack();
        } catch (e) {
          handover.disabled = false;
          handover.textContent = '📦 Skrá afhendingu';
          errBox.appendChild(el('div', { class: 'sm-err', text: 'Villa: ' + (e.message || e) }));
        }
      }},
    });

    const buttons = [back];
    if (!isTilbuid && !isAfhent) buttons.push(ready);
    if (!isAfhent) buttons.push(handover);

    openModal('Verkbeiðni #' + (v.num ?? '—'), body, buttons);
  }

  /* ---------- UI: Afgreiðsla search ---------- */
  function openHandover() {
    const body = el('div');
    const input = el('input', {
      class: 'sm-input',
      type: 'search',
      placeholder: 'Verk #, nafn eða sími…',
      autocomplete: 'off',
      inputMode: 'search',
    });
    const results = el('div', { class: 'sm-results' });
    results.appendChild(el('div', { class: 'sm-empty', text: 'Sláðu inn til að leita' }));
    body.append(
      el('label', { class: 'sm-label', text: 'Finna verkbeiðni til afhendingar' }),
      input,
      results,
    );

    let timer;
    const doSearch = () => {
      clearTimeout(timer);
      timer = setTimeout(async () => {
        const q = input.value.trim();
        if (q.length < 2) {
          results.innerHTML = '';
          results.appendChild(el('div', { class: 'sm-empty', text: 'Sláðu inn að minnsta kosti 2 stafi' }));
          return;
        }
        results.innerHTML = '';
        results.appendChild(el('div', { class: 'sm-empty', text: 'Leita…' }));
        try {
          const rows = await fetchVerkBySearch(q);
          results.innerHTML = '';
          if (!rows.length) {
            results.appendChild(el('div', { class: 'sm-empty', text: 'Engar verkbeiðnir' }));
            return;
          }
          rows.forEach(v => results.appendChild(verkRow(v, x => {
            closeModal();
            openVerkDetail(x, openHandover);
          })));
        } catch (e) {
          warn('search err', e);
          results.innerHTML = '';
          results.appendChild(el('div', { class: 'sm-err', text: 'Villa: ' + (e.message || e) }));
        }
      }, 220);
    };
    input.addEventListener('input', doSearch);
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        const first = results.querySelector('.sm-result');
        if (first) first.click();
      }
    });

    const close = el('button', { class: 'sm-btn', text: 'Loka', on: { click: closeModal }});
    openModal('Afgreiðsla — finna verkbeiðni', body, [close]);
    setTimeout(() => input.focus(), 50);
  }

  /* ---------- Buttons attachment ---------- */
  function ensureButtons() {
    const moBtn = document.getElementById('sm-mottaka-btn');
    if (!moBtn || !moBtn.parentNode) return;

    const isFab = moBtn.style.position === 'fixed';

    // 📋 Móttekið í dag
    if (!document.getElementById('sm-today-btn')) {
      const btn = el('button', {
        id: 'sm-today-btn',
        class: 'sm-toolbtn',
        type: 'button',
        text: '📋 Móttekið í dag',
        style: isFab
          ? 'position:fixed;right:16px;bottom:72px;z-index:8000;background:#059669;border-color:#059669;box-shadow:0 6px 20px rgba(5,150,105,.35)'
          : 'margin-left:8px;background:#059669;border-color:#059669',
        on: { click: openTodayList },
      });
      if (isFab) document.body.appendChild(btn);
      else moBtn.parentNode.insertBefore(btn, moBtn.nextSibling);
    }

    // 📦 Afgreiðsla
    if (!document.getElementById('sm-handover-btn')) {
      const btn = el('button', {
        id: 'sm-handover-btn',
        class: 'sm-toolbtn',
        type: 'button',
        text: '📦 Afgreiðsla',
        style: isFab
          ? 'position:fixed;right:16px;bottom:128px;z-index:8000;background:#7c3aed;border-color:#7c3aed;box-shadow:0 6px 20px rgba(124,58,237,.35)'
          : 'margin-left:8px;background:#7c3aed;border-color:#7c3aed',
        on: { click: openHandover },
      });
      if (isFab) document.body.appendChild(btn);
      else {
        const todayBtn = document.getElementById('sm-today-btn');
        const ref = todayBtn || moBtn;
        ref.parentNode.insertBefore(btn, ref.nextSibling);
      }
    }
  }

  /* ---------- Boot ---------- */
  async function boot() {
    await waitFor(() => sb() && document.getElementById('sm-mottaka-btn'), 25000);
    ensureButtons();
    let raf = null;
    const obs = new MutationObserver(() => {
      if (raf) return;
      raf = requestAnimationFrame(() => { raf = null; ensureButtons(); });
    });
    obs.observe(document.body, { childList: true, subtree: true });
    log('ready');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  /* ---------- Public API ---------- */
  window.SalaDashboard = {
    today: openTodayList,
    handover: openHandover,
    detail: openVerkDetail,
    version: '1.0.0',
  };
})();
/* =============================================================
   SALA CUSTOMER 360 — central per-customer view
   =============================================================
   Hooks into sala-mottaka.js: when a customer is picked from
   search, this opens a unified status view with all actions.

   Status semantics used here (uses verkbeidnir.status as the
   single source of truth — no schema change required):
     'Móttekið' / 'Í vinnslu'  → tæki at workshop, work pending
     'Tilbúið'                 → ready for pickup
     'Afhent'                  → picked up but not billed
     'Selt'                    → direct sale (skipped workshop)
     'Greitt'                  → invoiced/billed (terminal)

   Same conventions for uttaeki.status with 'Sótt' as the
   picked-up terminal state.
   ============================================================= */
(() => {
  const TAG = '[sala-c360]';
  const log  = (...a) => console.log(TAG, ...a);
  const warn = (...a) => console.warn(TAG, ...a);

  const sb = () => window.sb || window.supabase || null;
  const todayISO = () => new Date().toISOString().slice(0, 10);
  const fmtKr = n => {
    if (n == null || n === '') return '—';
    const num = Number(n);
    if (!Number.isFinite(num)) return '—';
    return new Intl.NumberFormat('is-IS').format(num) + ' kr';
  };

  async function waitFor(check, timeoutMs = 25000, interval = 150) {
    const t0 = Date.now();
    while (Date.now() - t0 < timeoutMs) {
      const r = check(); if (r) return r;
      await new Promise(r => setTimeout(r, interval));
    }
    return null;
  }

  /* ---------- Modal infra (shares .sm-* styles with sala-mottaka) ---------- */
  let activeOverlay = null;
  function closeModal() {
    if (activeOverlay) { activeOverlay.remove(); activeOverlay = null; }
  }
  function openModal(title, contentEl, footerEls = []) {
    closeModal();
    const overlay = document.createElement('div');
    overlay.className = 'sm-overlay';
    overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
    const modal = document.createElement('div');
    modal.className = 'sm-modal';
    modal.innerHTML = `
      <div class="sm-head"><h3></h3><button class="sm-x" type="button" aria-label="Loka">×</button></div>
      <div class="sm-body"></div>
      ${footerEls.length ? '<div class="sm-foot"></div>' : ''}
    `;
    modal.querySelector('h3').textContent = title;
    modal.querySelector('.sm-x').addEventListener('click', closeModal);
    modal.querySelector('.sm-body').appendChild(contentEl);
    if (footerEls.length) {
      const foot = modal.querySelector('.sm-foot');
      footerEls.forEach(e => foot.appendChild(e));
    }
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    activeOverlay = overlay;
    const onKey = e => { if (e.key === 'Escape') { closeModal(); document.removeEventListener('keydown', onKey); }};
    document.addEventListener('keydown', onKey);
    return modal;
  }
  function el(tag, props = {}, children = []) {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(props)) {
      if (v == null || v === false) continue;
      if (k === 'class') e.className = v;
      else if (k === 'style' && typeof v === 'object') Object.assign(e.style, v);
      else if (k === 'style') e.setAttribute('style', v);
      else if (k === 'on') for (const [ev, h] of Object.entries(v)) e.addEventListener(ev, h);
      else if (k === 'html') e.innerHTML = v;
      else if (k === 'text') e.textContent = v;
      else if (k in e && typeof e[k] !== 'object') {
        try { e[k] = v; } catch { e.setAttribute(k, v); }
      } else e.setAttribute(k, v);
    }
    (Array.isArray(children) ? children : [children]).forEach(c => {
      if (c == null || c === false) return;
      e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return e;
  }

  /* ---------- C360-specific styles ---------- */
  const C360_STYLE_ID = 'sala-c360-style';
  function injectC360Styles() {
    if (document.getElementById(C360_STYLE_ID)) return;
    const css = `
      .c360-actions { display:grid; grid-template-columns:repeat(2, 1fr); gap:8px; margin:0 0 14px;
        position:sticky; top:0; background:#fff; padding:8px 0 10px; z-index:5; border-bottom:1px solid #e5e7eb; }
      .c360-act { padding:12px; border-radius:10px; border:1px solid #d1d5db; background:#fff;
        cursor:pointer; font-weight:600; font-size:14px; display:flex; align-items:center; justify-content:center; gap:6px; }
      .c360-act:hover { background:#f9fafb; }
      .c360-act-pri { background:#2563eb; color:#fff; border-color:#2563eb; }
      .c360-act-pri:hover { background:#1d4ed8; }
      .c360-act-warn { background:#fff7ed; color:#9a3412; border-color:#fed7aa; }
      .c360-act-warn:hover { background:#ffedd5; }
      .c360-act-bill { background:#10b981; color:#fff; border-color:#10b981; }
      .c360-act-bill:hover { background:#059669; }
      .c360-act:disabled { opacity:.5; cursor:not-allowed; }
      .c360-stats { display:flex; gap:8px; flex-wrap:wrap; margin-bottom:14px; }
      .c360-stat { flex:1 1 100px; background:#f9fafb; border:1px solid #e5e7eb; border-radius:8px;
        padding:10px 12px; font-size:13px; text-align:center; }
      .c360-stat-num { font-size:20px; font-weight:700; color:#111827; display:block; }
      .c360-stat-bill { background:#ecfdf5; border-color:#a7f3d0; color:#065f46; }
      .c360-stat-bill .c360-stat-num { color:#065f46; }
      .c360-section { margin-bottom:14px; }
      .c360-section-h { display:flex; justify-content:space-between; align-items:center;
        font-size:12px; font-weight:700; color:#374151; text-transform:uppercase;
        letter-spacing:.5px; padding:6px 0; border-bottom:1px solid #e5e7eb; margin-bottom:6px; }
      .c360-item { display:flex; justify-content:space-between; align-items:center;
        padding:8px 4px; border-bottom:1px solid #f3f4f6; gap:8px; }
      .c360-item:last-child { border-bottom:none; }
      .c360-item-main { flex:1; min-width:0; }
      .c360-item-title { font-weight:600; font-size:14px; }
      .c360-item-meta { font-size:11px; color:#6b7280; margin-top:2px; line-height:1.3; }
      .c360-item-right { text-align:right; flex-shrink:0; }
      .c360-bill-row { background:#fffbeb; border:1px solid #fde68a; border-radius:8px;
        padding:10px 12px; margin-bottom:14px; display:flex; justify-content:space-between; align-items:center; }
      .c360-bill-row strong { color:#92400e; }
      .c360-pickline { display:flex; align-items:center; gap:10px; padding:10px;
        border:1px solid #e5e7eb; border-radius:8px; margin-bottom:6px; cursor:pointer; }
      .c360-pickline.checked { background:#eff6ff; border-color:#2563eb; }
      .c360-pickline input[type="checkbox"] { width:18px; height:18px; flex-shrink:0; }
      .c360-saleline { display:grid; grid-template-columns:1fr 60px 90px 30px; gap:6px; align-items:center; margin-bottom:6px; }
      .c360-saleline .sm-input { padding:8px; font-size:13px; }
      .c360-invoice { font-family:ui-monospace,Menlo,Consolas,monospace; font-size:12px;
        background:#f9fafb; border:1px solid #e5e7eb; border-radius:8px; padding:12px;
        white-space:pre-wrap; max-height:300px; overflow-y:auto; }
      @media (max-width: 600px) {
        .c360-actions { grid-template-columns:repeat(2, 1fr); }
        .c360-saleline { grid-template-columns:1fr 50px 80px 28px; }
      }
    `;
    const s = document.createElement('style');
    s.id = C360_STYLE_ID;
    s.textContent = css;
    document.head.appendChild(s);
  }

  function statusBadgeClass(s) {
    s = (s || '').toLowerCase();
    if (s.includes('greitt'))  return 'sm-badge-comp';
    if (s.includes('afh') || s.includes('sótt')) return 'sm-badge-known';
    if (s.includes('selt'))    return 'sm-badge-comp';
    if (s.includes('tilb'))    return 'sm-badge-known';
    if (s.includes('mótt') || s.includes('vinns')) return 'sm-badge-cust';
    return 'sm-badge-new';
  }

  /* ---------- Data layer ---------- */
  async function fetchC360(customer) {
    const c = sb();
    if (!c) return { taeki: [], openVerks: [], billable: [], paid: [] };
    const name = customer.nafn || customer.name || '';
    if (!name) return { taeki: [], openVerks: [], billable: [], paid: [] };

    const [taekiRes, openRes, billRes, paidRes] = await Promise.all([
      c.from('uttaeki').select('*').eq('client', name)
        .in('status', ['Móttekið', 'Í vinnslu', 'Tilbúið'])
        .order('created_at', { ascending: false }),
      c.from('verkbeidnir').select('*').eq('customer', name)
        .in('status', ['Í vinnslu', 'Móttekið', 'Tilbúið'])
        .order('num', { ascending: false }),
      c.from('verkbeidnir').select('*').eq('customer', name)
        .in('status', ['Afhent', 'Selt'])
        .order('num', { ascending: false }),
      c.from('verkbeidnir').select('*').eq('customer', name)
        .eq('status', 'Greitt')
        .order('num', { ascending: false })
        .limit(20),
    ]);

    return {
      taeki:     taekiRes?.data || [],
      openVerks: openRes?.data  || [],
      billable:  billRes?.data  || [],
      paid:      paidRes?.data  || [],
    };
  }

  async function createSale({ customer, lines, total }) {
    const c = sb();
    if (!c) throw new Error('Engin Supabase tenging');
    // Get next num
    const { data: maxData } = await c.from('verkbeidnir')
      .select('num').order('num', { ascending: false }).limit(1);
    const nextNum = (maxData && maxData[0] && Number(maxData[0].num)) ?
      Number(maxData[0].num) + 1 : 1001;

    const notes = lines
      .map(l => `${l.qty} × ${l.desc} @ ${fmtKr(l.unit)} = ${fmtKr(l.qty * l.unit)}`)
      .join('\n');

    const { data, error } = await c.from('verkbeidnir').insert({
      num:      nextNum,
      status:   'Selt',
      customer: customer.nafn || customer.name,
      phone:    customer.simi || null,
      dropoff:  todayISO(),
      pickup:   todayISO(),
      notes,
      verd:     total,
    }).select().single();
    if (error) throw error;
    return data;
  }

  async function pickupVerks(verkIds, serialsByVerk) {
    const c = sb();
    if (!c) throw new Error('Engin Supabase tenging');
    const today = todayISO();

    // Update each verk to Afhent
    for (const id of verkIds) {
      const { error } = await c.from('verkbeidnir')
        .update({ status: 'Afhent', pickup: today })
        .eq('id', id);
      if (error) throw error;
    }
    // Update linked uttaeki
    const allSerials = Object.values(serialsByVerk).flat();
    for (const s of allSerials) {
      try {
        await c.from('uttaeki').update({ status: 'Sótt' }).eq('serial', s);
      } catch (e) { warn('taeki update fail', s, e); }
    }
  }

  async function markGreitt(verkIds, invoiceLabel) {
    const c = sb();
    if (!c) throw new Error('Engin Supabase tenging');
    for (const id of verkIds) {
      // Read current notes to prepend invoice marker
      const { data: row } = await c.from('verkbeidnir').select('notes').eq('id', id).single();
      const newNotes = invoiceLabel
        ? `[${invoiceLabel}] ` + (row?.notes || '')
        : row?.notes || null;
      const { error } = await c.from('verkbeidnir')
        .update({ status: 'Greitt', notes: newNotes })
        .eq('id', id);
      if (error) throw error;
    }
  }

  function parseSerialsFromNotes(notes) {
    return (notes || '').split('\n')
      .map(line => {
        const t = line.trim();
        if (!t) return null;
        const m = t.match(/^([^\s/—]+)/);
        return m ? m[1] : null;
      })
      .filter(Boolean);
  }

  /* ---------- UI: Customer 360 ---------- */
  function openCustomer360(customer) {
    injectC360Styles();
    const body = el('div');

    // Header
    body.appendChild(el('div', { class: 'sm-customer-card' }, [
      el('div', { style: 'min-width:0;flex:1' }, [
        el('div', { style: 'font-weight:700;font-size:17px',
          text: customer.nafn || customer.name || '—' }),
        el('div', { style: 'font-size:12px;color:#374151;margin-top:2px',
          text: [customer.kennitala, customer.simi, customer.netfang].filter(Boolean).join(' · ') }),
      ]),
      el('button', {
        class: 'sm-btn',
        text: 'Skipta',
        on: { click: () => { closeModal(); window.SalaMottaka?.open(); } },
      }),
    ]));

    // Action grid (sticky)
    const actGrid = el('div', { class: 'c360-actions' });
    const actAdd = el('button', {
      class: 'c360-act c360-act-pri', type: 'button',
      text: '📥 Bæta tæki',
      on: { click: () => {
        closeModal();
        window.SalaMottaka?.openCustomer?.(customer);
      }},
    });
    const actPickup = el('button', {
      class: 'c360-act', type: 'button',
      text: '📦 Afhenda',
      on: { click: () => openPickup(customer) },
    });
    const actSale = el('button', {
      class: 'c360-act', type: 'button',
      text: '🛒 Selja',
      on: { click: () => openSale(customer) },
    });
    const actInvoice = el('button', {
      class: 'c360-act c360-act-bill', type: 'button',
      text: '🧾 Reikningur',
      on: { click: () => openInvoice(customer) },
    });
    actGrid.append(actAdd, actPickup, actSale, actInvoice);
    body.appendChild(actGrid);

    // Bill summary
    const billRow = el('div'); body.appendChild(billRow);

    // Stats row
    const statsRow = el('div', { class: 'c360-stats' }); body.appendChild(statsRow);

    // Sections
    const taekiSec = el('div', { class: 'c360-section' });
    const openSec  = el('div', { class: 'c360-section' });
    const billSec  = el('div', { class: 'c360-section' });
    body.append(billSec, taekiSec, openSec);

    let lastData = null;
    const refresh = async () => {
      statsRow.innerHTML = '';
      statsRow.appendChild(el('div', { class: 'c360-stat',
        html: '<span class="c360-stat-num">…</span>Sæki gögn' }));
      const data = await fetchC360(customer);
      lastData = data;

      const billTotal = data.billable.reduce((s, v) => s + (Number(v.verd) || 0), 0);
      const hasBill = data.billable.length > 0;

      // Toggle action enable states
      actPickup.disabled = data.openVerks.length === 0 && !data.openVerks.some(v => (v.status || '').toLowerCase().includes('tilb'));
      actInvoice.disabled = !hasBill;

      // Bill row
      billRow.innerHTML = '';
      if (hasBill) {
        billRow.appendChild(el('div', { class: 'c360-bill-row' }, [
          el('div', {}, [
            el('div', { style: 'font-size:11px;text-transform:uppercase;letter-spacing:.5px;color:#92400e;font-weight:600',
              text: 'Til reiknings' }),
            el('div', { style: 'font-size:12px;color:#92400e;margin-top:2px',
              text: data.billable.length + ' verk · ekki á reikning' }),
          ]),
          el('strong', { style: 'font-size:20px', text: fmtKr(billTotal) }),
        ]));
      }

      // Stats
      statsRow.innerHTML = '';
      statsRow.append(
        el('div', { class: 'c360-stat',
          html: `<span class="c360-stat-num">${data.taeki.length}</span>Á verkstæði` }),
        el('div', { class: 'c360-stat',
          html: `<span class="c360-stat-num">${data.openVerks.length}</span>Verk í gangi` }),
        el('div', { class: 'c360-stat c360-stat-bill',
          html: `<span class="c360-stat-num">${data.billable.length}</span>Til reiknings` }),
      );

      // Billable section
      billSec.innerHTML = '';
      if (hasBill) {
        billSec.appendChild(el('div', { class: 'c360-section-h' }, [
          el('span', { text: 'Til reiknings' }),
          el('span', { style: 'font-weight:700;color:#065f46', text: fmtKr(billTotal) }),
        ]));
        data.billable.forEach(v => {
          const firstLine = (v.notes || '').split('\n')[0] || '';
          billSec.appendChild(el('div', { class: 'c360-item' }, [
            el('div', { class: 'c360-item-main' }, [
              el('div', { class: 'c360-item-title', text: '#' + v.num + ' · ' + (v.status || '') }),
              el('div', { class: 'c360-item-meta', text: firstLine.slice(0, 80) || '—' }),
              el('div', { class: 'c360-item-meta',
                text: 'Móttekið ' + (v.dropoff || '—') + (v.pickup ? ' · Sótt ' + v.pickup : '') }),
            ]),
            el('div', { class: 'c360-item-right' }, [
              el('div', { style: 'font-weight:700', text: fmtKr(v.verd) }),
            ]),
          ]));
        });
      }

      // Workshop tæki
      taekiSec.innerHTML = '';
      if (data.taeki.length) {
        taekiSec.appendChild(el('div', { class: 'c360-section-h' }, [
          el('span', { text: 'Á verkstæði' }),
          el('span', { text: data.taeki.length + ' tæki' }),
        ]));
        data.taeki.forEach(t => {
          taekiSec.appendChild(el('div', { class: 'c360-item' }, [
            el('div', { class: 'c360-item-main' }, [
              el('div', { class: 'c360-item-title', text: t.serial }),
              el('div', { class: 'c360-item-meta',
                text: [t.type, t.size, t.location].filter(Boolean).join(' · ') || '—' }),
            ]),
            el('span', { class: 'sm-badge ' + statusBadgeClass(t.status), text: t.status || '—' }),
          ]));
        });
      }

      // Open verks
      openSec.innerHTML = '';
      if (data.openVerks.length) {
        openSec.appendChild(el('div', { class: 'c360-section-h' }, [
          el('span', { text: 'Virk verk' }),
          el('span', { text: data.openVerks.length + ' verk' }),
        ]));
        data.openVerks.forEach(v => {
          const firstLine = (v.notes || '').split('\n')[0] || '';
          openSec.appendChild(el('div', { class: 'c360-item' }, [
            el('div', { class: 'c360-item-main' }, [
              el('div', { class: 'c360-item-title', text: '#' + v.num }),
              el('div', { class: 'c360-item-meta', text: firstLine.slice(0, 80) || '—' }),
              el('div', { class: 'c360-item-meta', text: 'Móttekið ' + (v.dropoff || '—') }),
            ]),
            el('span', { class: 'sm-badge ' + statusBadgeClass(v.status), text: v.status || '—' }),
          ]));
        });
      }

      if (!hasBill && !data.taeki.length && !data.openVerks.length) {
        openSec.appendChild(el('div', { class: 'sm-empty', text: 'Engin virk gögn — bættu við tækjum eða skráðu sölu' }));
      }
    };
    refresh();

    // Re-route hooks so re-entries land back here
    window.salaOnIntakeDone   = (cust) => setTimeout(() => openCustomer360(cust), 100);
    window.salaOnCustomerPicked = openCustomer360;

    const close = el('button', { class: 'sm-btn', text: 'Loka', on: { click: closeModal }});
    const refreshBtn = el('button', { class: 'sm-btn', text: '↻', title: 'Endurnýja',
      on: { click: refresh }});

    openModal('Staða viðskiptavinar', body, [refreshBtn, close]);
  }

  /* ---------- UI: Pickup ---------- */
  function openPickup(customer) {
    const body = el('div');
    body.appendChild(el('label', { class: 'sm-label', text: 'Veldu verk sem á að afhenda' }));

    const list = el('div'); body.appendChild(list);
    const errBox = el('div'); body.appendChild(errBox);
    const checked = new Set();
    let verks = [];

    const renderTotal = () => {
      const sum = verks.filter(v => checked.has(v.id))
        .reduce((s, v) => s + (Number(v.verd) || 0), 0);
      footerTotal.textContent = 'Valið: ' + checked.size + ' · ' + fmtKr(sum);
    };

    const refresh = async () => {
      list.innerHTML = '<div class="sm-empty">Sæki…</div>';
      const c = sb();
      const { data } = await c.from('verkbeidnir')
        .select('*').eq('customer', customer.nafn || customer.name || '')
        .in('status', ['Í vinnslu', 'Móttekið', 'Tilbúið'])
        .order('num', { ascending: false });
      verks = data || [];
      list.innerHTML = '';
      if (!verks.length) {
        list.appendChild(el('div', { class: 'sm-empty', text: 'Engin verk til afhendingar' }));
        return;
      }
      verks.forEach(v => {
        const isReady = (v.status || '').toLowerCase().includes('tilb');
        const row = el('div', {
          class: 'c360-pickline' + (isReady ? ' checked' : ''),
        }, [
          el('input', { type: 'checkbox', checked: isReady }),
          el('div', { style: 'flex:1;min-width:0' }, [
            el('div', { style: 'font-weight:600',
              text: '#' + v.num + ' · ' + (v.status || '') }),
            el('div', { style: 'font-size:12px;color:#6b7280',
              text: ((v.notes || '').split('\n')[0] || '').slice(0, 60) }),
          ]),
          el('div', { style: 'font-weight:600', text: fmtKr(v.verd) }),
        ]);
        if (isReady) checked.add(v.id);
        const cb = row.querySelector('input');
        const toggle = () => {
          if (cb.checked) { checked.add(v.id); row.classList.add('checked'); }
          else            { checked.delete(v.id); row.classList.remove('checked'); }
          renderTotal();
        };
        row.addEventListener('click', e => {
          if (e.target !== cb) cb.checked = !cb.checked;
          toggle();
        });
        cb.addEventListener('change', toggle);
        list.appendChild(row);
      });
      renderTotal();
    };

    const back = el('button', { class: 'sm-btn', text: '← Til baka',
      on: { click: () => { closeModal(); openCustomer360(customer); }}});
    const footerTotal = el('div', { style: 'flex:1;font-size:13px;color:#374151;align-self:center', text: '' });
    const submit = el('button', {
      class: 'sm-btn sm-btn-pri',
      text: 'Skrá afhendingu',
      on: { click: async () => {
        errBox.innerHTML = '';
        if (!checked.size) {
          errBox.appendChild(el('div', { class: 'sm-err', text: 'Veldu að minnsta kosti eitt verk' }));
          return;
        }
        submit.disabled = true; submit.textContent = 'Vistar…';
        try {
          const ids = Array.from(checked);
          const serialMap = {};
          verks.filter(v => checked.has(v.id)).forEach(v => {
            serialMap[v.id] = parseSerialsFromNotes(v.notes);
          });
          await pickupVerks(ids, serialMap);
          closeModal();
          openCustomer360(customer);
        } catch (e) {
          submit.disabled = false; submit.textContent = 'Skrá afhendingu';
          errBox.appendChild(el('div', { class: 'sm-err', text: 'Villa: ' + (e.message || e) }));
        }
      }},
    });

    openModal('Afhending — ' + (customer.nafn || customer.name || ''), body,
      [footerTotal, back, submit]);
    refresh();
  }

  /* ---------- UI: Sale ---------- */
  function openSale(customer) {
    const body = el('div');
    body.appendChild(el('label', { class: 'sm-label',
      text: 'Skráðu vörur sem viðskiptavinurinn er að kaupa (færist á reikning)' }));

    const lines = [];
    const list = el('div'); body.appendChild(list);
    const totalRow = el('div', {
      style: 'display:flex;justify-content:space-between;align-items:center;padding:10px 4px;border-top:2px solid #e5e7eb;margin-top:8px;font-weight:700;font-size:16px',
    }, [
      el('span', { text: 'Samtals' }),
      el('span', { id: 'sm-sale-total', text: fmtKr(0) }),
    ]);
    body.appendChild(totalRow);

    const calcTotal = () => lines.reduce((s, l) =>
      s + ((Number(l.qty) || 0) * (Number(l.unit) || 0)), 0);

    const renderLines = () => {
      list.innerHTML = '';
      if (!lines.length) {
        list.appendChild(el('div', { class: 'sm-empty', text: 'Engar línur — bættu við hér að neðan' }));
      }
      lines.forEach((l, idx) => {
        const desc = el('input', { class: 'sm-input', placeholder: 'Lýsing (t.d. CO2 6kg)', value: l.desc });
        const qty  = el('input', { class: 'sm-input', type: 'number', step: '1', min: '1', value: l.qty || 1, inputMode: 'numeric' });
        const unit = el('input', { class: 'sm-input', type: 'number', step: '1', placeholder: 'kr', value: l.unit, inputMode: 'numeric' });
        desc.addEventListener('input', () => { l.desc = desc.value; });
        qty .addEventListener('input', () => { l.qty  = Number(qty.value)  || 0; updateTotal(); });
        unit.addEventListener('input', () => { l.unit = Number(unit.value) || 0; updateTotal(); });
        const rm = el('button', {
          class: 'sm-btn sm-btn-danger', type: 'button', text: '×',
          on: { click: () => { lines.splice(idx, 1); renderLines(); updateTotal(); }},
        });
        list.appendChild(el('div', { class: 'c360-saleline' }, [desc, qty, unit, rm]));
      });
    };
    const updateTotal = () => {
      totalRow.querySelector('#sm-sale-total').textContent = fmtKr(calcTotal());
    };

    const addBtn = el('button', {
      class: 'sm-btn', type: 'button',
      style: 'width:100%;margin-top:8px',
      text: '+ Bæta við línu',
      on: { click: () => { lines.push({ desc: '', qty: 1, unit: 0 }); renderLines(); updateTotal(); }},
    });
    body.appendChild(addBtn);
    lines.push({ desc: '', qty: 1, unit: 0 });
    renderLines();

    const errBox = el('div'); body.appendChild(errBox);

    const back = el('button', { class: 'sm-btn', text: '← Til baka',
      on: { click: () => { closeModal(); openCustomer360(customer); }}});
    const submit = el('button', {
      class: 'sm-btn sm-btn-pri',
      text: 'Skrá sölu',
      on: { click: async () => {
        errBox.innerHTML = '';
        const valid = lines.filter(l => (l.desc || '').trim() && Number(l.unit) > 0);
        if (!valid.length) {
          errBox.appendChild(el('div', { class: 'sm-err',
            text: 'Bættu við að minnsta kosti einni línu með lýsingu og verði' }));
          return;
        }
        submit.disabled = true; submit.textContent = 'Vistar…';
        try {
          const total = calcTotal();
          await createSale({ customer, lines: valid, total });
          closeModal();
          openCustomer360(customer);
        } catch (e) {
          submit.disabled = false; submit.textContent = 'Skrá sölu';
          errBox.appendChild(el('div', { class: 'sm-err', text: 'Villa: ' + (e.message || e) }));
        }
      }},
    });

    openModal('Sala — ' + (customer.nafn || customer.name || ''), body, [back, submit]);
    setTimeout(() => list.querySelector('input')?.focus(), 50);
  }

  /* ---------- UI: Invoice ---------- */
  function openInvoice(customer) {
    const body = el('div');
    const list = el('div'); body.appendChild(list);
    const summary = el('div'); body.appendChild(summary);
    const errBox = el('div'); body.appendChild(errBox);

    let billable = [];
    let invoiceText = '';
    const checked = new Set();

    const buildInvoiceText = () => {
      const sel = billable.filter(v => checked.has(v.id));
      const total = sel.reduce((s, v) => s + (Number(v.verd) || 0), 0);
      const today = todayISO();
      const lines = [];
      lines.push('REIKNINGUR — Slökkvitæki ehf');
      lines.push('Dagsetning: ' + today);
      lines.push('');
      lines.push('Viðskiptavinur:');
      lines.push('  ' + (customer.nafn || customer.name || ''));
      if (customer.kennitala) lines.push('  Kt. ' + customer.kennitala);
      if (customer.heimilisfang) lines.push('  ' + customer.heimilisfang);
      if (customer.simi) lines.push('  Sími ' + customer.simi);
      if (customer.netfang) lines.push('  ' + customer.netfang);
      lines.push('');
      lines.push('─'.repeat(48));
      sel.forEach(v => {
        const dateStr = v.dropoff || v.pickup || '';
        lines.push(`#${v.num}  ${dateStr}  ${v.status}`);
        const noteLines = (v.notes || '').split('\n').filter(Boolean);
        noteLines.forEach(nl => lines.push('  ' + nl));
        lines.push('  '.repeat(20) + ' ' + fmtKr(v.verd).padStart(12));
        lines.push('');
      });
      lines.push('─'.repeat(48));
      lines.push('SAMTALS:'.padEnd(36) + fmtKr(total).padStart(12));
      lines.push('');
      lines.push('Greiðsluskilmálar: 14 dagar');
      return { text: lines.join('\n'), total, count: sel.length };
    };

    const renderSummary = () => {
      const r = buildInvoiceText();
      invoiceText = r.text;
      summary.innerHTML = '';
      summary.appendChild(el('div', { class: 'c360-bill-row' }, [
        el('div', {}, [
          el('div', { style: 'font-weight:600', text: r.count + ' verk valið' }),
          el('div', { style: 'font-size:12px;color:#92400e',
            text: 'Verður merkt sem Greitt eftir staðfestingu' }),
        ]),
        el('strong', { style: 'font-size:22px', text: fmtKr(r.total) }),
      ]));
      summary.appendChild(el('details', {}, [
        el('summary', { style: 'cursor:pointer;font-size:13px;color:#2563eb;padding:4px 0',
          text: 'Forskoða reiknings­texta' }),
        el('div', { class: 'c360-invoice', text: r.text }),
      ]));
    };

    const refresh = async () => {
      list.innerHTML = '<div class="sm-empty">Sæki…</div>';
      const c = sb();
      const { data } = await c.from('verkbeidnir')
        .select('*').eq('customer', customer.nafn || customer.name || '')
        .in('status', ['Afhent', 'Selt'])
        .order('num', { ascending: true });
      billable = data || [];
      list.innerHTML = '';
      if (!billable.length) {
        list.appendChild(el('div', { class: 'sm-empty', text: 'Ekkert til reiknings' }));
        summary.innerHTML = ''; return;
      }
      list.appendChild(el('label', { class: 'sm-label', text: 'Veldu hvað á að setja á reikning' }));
      billable.forEach(v => {
        checked.add(v.id);
        const firstLine = (v.notes || '').split('\n')[0] || '';
        const row = el('div', { class: 'c360-pickline checked' }, [
          el('input', { type: 'checkbox', checked: true }),
          el('div', { style: 'flex:1;min-width:0' }, [
            el('div', { style: 'font-weight:600',
              text: '#' + v.num + ' · ' + (v.status || '') + ' · ' + (v.dropoff || '') }),
            el('div', { style: 'font-size:12px;color:#6b7280',
              text: firstLine.slice(0, 70) }),
          ]),
          el('div', { style: 'font-weight:700', text: fmtKr(v.verd) }),
        ]);
        const cb = row.querySelector('input');
        const toggle = () => {
          if (cb.checked) { checked.add(v.id); row.classList.add('checked'); }
          else            { checked.delete(v.id); row.classList.remove('checked'); }
          renderSummary();
        };
        row.addEventListener('click', e => {
          if (e.target !== cb) cb.checked = !cb.checked;
          toggle();
        });
        cb.addEventListener('change', toggle);
        list.appendChild(row);
      });
      renderSummary();
    };

    const back = el('button', { class: 'sm-btn', text: '← Til baka',
      on: { click: () => { closeModal(); openCustomer360(customer); }}});

    const copy = el('button', {
      class: 'sm-btn', text: '📋 Afrita',
      on: { click: async () => {
        try {
          await navigator.clipboard.writeText(invoiceText);
          copy.textContent = '✓ Afritað';
          setTimeout(() => copy.textContent = '📋 Afrita', 1500);
        } catch {
          // Fallback
          const ta = el('textarea', { value: invoiceText, style: 'position:fixed;left:-9999px' });
          document.body.appendChild(ta); ta.select();
          try { document.execCommand('copy'); } catch {}
          ta.remove();
          copy.textContent = '✓ Afritað';
          setTimeout(() => copy.textContent = '📋 Afrita', 1500);
        }
      }},
    });

    const printBtn = el('button', {
      class: 'sm-btn', text: '🖨 Prenta',
      on: { click: () => {
        const w = window.open('', '_blank', 'width=720,height=900');
        if (!w) return;
        w.document.write('<pre style="font-family:ui-monospace,Menlo,Consolas,monospace;font-size:13px;padding:24px">' +
          invoiceText.replace(/[<>&]/g, ch => ({ '<':'&lt;', '>':'&gt;', '&':'&amp;' }[ch])) + '</pre>');
        w.document.close();
        setTimeout(() => w.print(), 300);
      }},
    });

    const finalize = el('button', {
      class: 'sm-btn sm-btn-pri c360-act-bill', text: '✓ Skrá reikning',
      on: { click: async () => {
        errBox.innerHTML = '';
        if (!checked.size) {
          errBox.appendChild(el('div', { class: 'sm-err', text: 'Ekkert valið' }));
          return;
        }
        if (!confirm('Skrá ' + checked.size + ' verk sem Greitt? Þetta er ekki auðveldlega afturkallað.')) return;
        finalize.disabled = true; finalize.textContent = 'Vistar…';
        try {
          const label = 'REIKN-' + todayISO().replace(/-/g, '').slice(2);
          await markGreitt(Array.from(checked), label);
          closeModal();
          openCustomer360(customer);
        } catch (e) {
          finalize.disabled = false; finalize.textContent = '✓ Skrá reikning';
          errBox.appendChild(el('div', { class: 'sm-err', text: 'Villa: ' + (e.message || e) }));
        }
      }},
    });

    openModal('Reikningur — ' + (customer.nafn || customer.name || ''),
      body, [back, copy, printBtn, finalize]);
    refresh();
  }

  /* ---------- Monthly billing dashboard ---------- */
  async function fetchMonthlyBillable() {
    const c = sb();
    if (!c) return [];
    const { data } = await c.from('verkbeidnir')
      .select('*')
      .in('status', ['Afhent', 'Selt'])
      .order('customer', { ascending: true });
    if (!data) return [];
    // Group by customer
    const byCust = new Map();
    data.forEach(v => {
      const k = v.customer || '—';
      if (!byCust.has(k)) byCust.set(k, { customer: k, phone: v.phone, items: [], total: 0 });
      const e = byCust.get(k);
      e.items.push(v);
      e.total += Number(v.verd) || 0;
    });
    return Array.from(byCust.values()).sort((a, b) => b.total - a.total);
  }

  function openMonthly() {
    const body = el('div');
    body.appendChild(el('label', { class: 'sm-label',
      text: 'Viðskiptavinir með ógreidd verk' }));
    const list = el('div'); body.appendChild(list);
    const totalRow = el('div', {
      style: 'display:flex;justify-content:space-between;padding:12px 4px;border-top:2px solid #e5e7eb;margin-top:8px;font-weight:700',
    }, [
      el('span', { text: 'Samtals (allt)' }),
      el('span', { id: 'sm-month-total', text: '—' }),
    ]);
    body.appendChild(totalRow);

    const refresh = async () => {
      list.innerHTML = '<div class="sm-empty">Sæki…</div>';
      const groups = await fetchMonthlyBillable();
      list.innerHTML = '';
      if (!groups.length) {
        list.appendChild(el('div', { class: 'sm-empty', text: 'Engin ógreidd verk' }));
        totalRow.querySelector('#sm-month-total').textContent = fmtKr(0);
        return;
      }
      groups.forEach(g => {
        list.appendChild(el('div', {
          class: 'sm-result',
          on: { click: () => {
            closeModal();
            openCustomer360({ nafn: g.customer, simi: g.phone });
          }},
        }, [
          el('div', { class: 'sm-result-main' }, [
            el('div', { class: 'sm-result-name', text: g.customer }),
            el('div', { class: 'sm-result-meta', text: g.items.length + ' verk' }),
          ]),
          el('div', { style: 'font-weight:700;color:#065f46', text: fmtKr(g.total) }),
        ]));
      });
      const grand = groups.reduce((s, g) => s + g.total, 0);
      totalRow.querySelector('#sm-month-total').textContent = fmtKr(grand);
    };

    const close = el('button', { class: 'sm-btn', text: 'Loka', on: { click: closeModal }});
    const refreshBtn = el('button', { class: 'sm-btn', text: '↻ Endurnýja', on: { click: refresh }});
    openModal('Til reiknings (allir viðskiptavinir)', body, [refreshBtn, close]);
    refresh();
  }

  /* ---------- Buttons ---------- */
  function ensureMonthlyButton() {
    const moBtn = document.getElementById('sm-mottaka-btn');
    if (!moBtn || !moBtn.parentNode) return;
    if (document.getElementById('sm-monthly-btn')) return;

    const isFab = moBtn.style.position === 'fixed';
    const btn = el('button', {
      id: 'sm-monthly-btn',
      class: 'sm-toolbtn',
      type: 'button',
      text: '🧾 Til reiknings',
      style: isFab
        ? 'position:fixed;right:16px;bottom:184px;z-index:8000;background:#10b981;border-color:#10b981;box-shadow:0 6px 20px rgba(16,185,129,.35)'
        : 'margin-left:8px;background:#10b981;border-color:#10b981',
      on: { click: openMonthly },
    });
    if (isFab) document.body.appendChild(btn);
    else {
      const last = document.getElementById('sm-handover-btn')
        || document.getElementById('sm-today-btn') || moBtn;
      last.parentNode.insertBefore(btn, last.nextSibling);
    }
  }

  /* ---------- Boot ---------- */
  async function boot() {
    await waitFor(() => sb() && document.getElementById('sm-mottaka-btn'), 25000);
    injectC360Styles();
    ensureMonthlyButton();
    let raf = null;
    const obs = new MutationObserver(() => {
      if (raf) return;
      raf = requestAnimationFrame(() => { raf = null; ensureMonthlyButton(); });
    });
    obs.observe(document.body, { childList: true, subtree: true });

    // Hook into sala-mottaka routing
    window.salaOnCustomerPicked = openCustomer360;
    log('ready');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  /* ---------- Public API ---------- */
  window.SalaCustomer360 = {
    open:     openCustomer360,
    pickup:   openPickup,
    sale:     openSale,
    invoice:  openInvoice,
    monthly:  openMonthly,
    version:  '1.0.0',
  };
})();
/* =============================================================
   SALA STALE — gömul tæki á verkstæði
   =============================================================
   Lists uttaeki rows still in workshop status (Móttekið /
   Í vinnslu / Tilbúið) older than a chosen threshold. Click any
   row to jump into that customer's Staða viðskiptavinar to
   resolve it.

   Threshold chips: 7 / 14 / 30 / 60 / 90 dagar. Default 30.
   ============================================================= */
(() => {
  const TAG = '[sala-stale]';
  const log  = (...a) => console.log(TAG, ...a);
  const warn = (...a) => console.warn(TAG, ...a);

  const sb = () => window.sb || window.supabase || null;
  async function waitFor(check, timeoutMs = 30000, interval = 150) {
    const t0 = Date.now();
    while (Date.now() - t0 < timeoutMs) {
      const r = check(); if (r) return r;
      await new Promise(r => setTimeout(r, interval));
    }
    return null;
  }
  const daysSince = iso => {
    if (!iso) return 0;
    const d = new Date(iso);
    if (isNaN(d.getTime())) return 0;
    return Math.floor((Date.now() - d.getTime()) / 86400000);
  };

  /* Modal (shares .sm-* and .c360-* styles already injected by other modules) */
  let activeOverlay = null;
  function closeModal() {
    if (activeOverlay) { activeOverlay.remove(); activeOverlay = null; }
  }
  function openModal(title, contentEl, footerEls = []) {
    closeModal();
    const overlay = document.createElement('div');
    overlay.className = 'sm-overlay';
    overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
    const modal = document.createElement('div');
    modal.className = 'sm-modal';
    modal.innerHTML = `
      <div class="sm-head"><h3></h3><button class="sm-x" type="button" aria-label="Loka">×</button></div>
      <div class="sm-body"></div>
      ${footerEls.length ? '<div class="sm-foot"></div>' : ''}
    `;
    modal.querySelector('h3').textContent = title;
    modal.querySelector('.sm-x').addEventListener('click', closeModal);
    modal.querySelector('.sm-body').appendChild(contentEl);
    if (footerEls.length) {
      const foot = modal.querySelector('.sm-foot');
      footerEls.forEach(e => foot.appendChild(e));
    }
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    activeOverlay = overlay;
    const onKey = e => { if (e.key === 'Escape') { closeModal(); document.removeEventListener('keydown', onKey); }};
    document.addEventListener('keydown', onKey);
    return modal;
  }
  function el(tag, props = {}, children = []) {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(props)) {
      if (v == null || v === false) continue;
      if (k === 'class') e.className = v;
      else if (k === 'style' && typeof v === 'object') Object.assign(e.style, v);
      else if (k === 'style') e.setAttribute('style', v);
      else if (k === 'on') for (const [ev, h] of Object.entries(v)) e.addEventListener(ev, h);
      else if (k === 'html') e.innerHTML = v;
      else if (k === 'text') e.textContent = v;
      else if (k in e && typeof e[k] !== 'object') {
        try { e[k] = v; } catch { e.setAttribute(k, v); }
      } else e.setAttribute(k, v);
    }
    (Array.isArray(children) ? children : [children]).forEach(c => {
      if (c == null || c === false) return;
      e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return e;
  }

  function statusBadgeClass(s) {
    s = (s || '').toLowerCase();
    if (s.includes('tilb')) return 'sm-badge-known';
    if (s.includes('mótt') || s.includes('vinns')) return 'sm-badge-cust';
    return 'sm-badge-new';
  }

  /* ---------- Data ---------- */
  async function fetchStale(minDays) {
    const c = sb();
    if (!c) return [];
    const cutoff = new Date(Date.now() - minDays * 86400000).toISOString();
    const { data, error } = await c.from('uttaeki')
      .select('*')
      .in('status', ['Móttekið', 'Í vinnslu', 'Tilbúið'])
      .lte('created_at', cutoff)
      .order('created_at', { ascending: true });
    if (error) { warn(error); return []; }
    return data || [];
  }

  async function findCustomerByName(name) {
    const c = sb();
    if (!c || !name) return null;
    try {
      const { data: v } = await c.from('vidskiptavinir')
        .select('*').eq('nafn', name).limit(1);
      if (v && v[0]) return { ...v[0], _kind: 'vidsk' };
    } catch (e) { warn(e); }
    try {
      const { data: f } = await c.from('fyrirtaeki')
        .select('*').eq('nafn', name).limit(1);
      if (f && f[0]) return { ...f[0], _kind: 'fyrir' };
    } catch (e) { warn(e); }
    return null;
  }

  /* ---------- UI ---------- */
  function openStale() {
    let minDays = 30;
    const body = el('div');

    /* Threshold chips */
    const chipBar = el('div', {
      style: 'display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px',
    });
    const dayOptions = [7, 14, 30, 60, 90];
    const chips = {};
    const activeStyle = 'background:#fee2e2;border-color:#dc2626;color:#991b1b;font-weight:700';
    const idleStyle = '';
    dayOptions.forEach(d => {
      const c = el('button', {
        class: 'sm-btn',
        type: 'button',
        text: '> ' + d + ' d',
        on: { click: () => {
          minDays = d;
          dayOptions.forEach(x => chips[x].setAttribute('style', x === minDays ? activeStyle : idleStyle));
          refresh();
        }},
      });
      if (d === minDays) c.setAttribute('style', activeStyle);
      chips[d] = c;
      chipBar.appendChild(c);
    });
    body.appendChild(chipBar);

    /* Summary */
    const summary = el('div', { class: 'c360-bill-row',
      style: 'background:#fef2f2;border-color:#fecaca;display:none' });
    body.appendChild(summary);

    /* List */
    const list = el('div', { class: 'sm-results' });
    body.appendChild(list);

    /* Group toggle */
    let grouped = false;
    const groupToggle = el('label', {
      style: 'display:flex;align-items:center;gap:6px;font-size:12px;color:#6b7280;margin:8px 0 4px;cursor:pointer',
    }, [
      el('input', { type: 'checkbox',
        on: { change: e => { grouped = e.target.checked; render(lastRows); }}}),
      el('span', { text: 'Hópa eftir viðskiptavin' }),
    ]);
    body.insertBefore(groupToggle, list);

    let lastRows = [];

    const groupByClient = rows => {
      const byClient = new Map();
      rows.forEach(t => {
        const k = t.client || '—';
        if (!byClient.has(k)) byClient.set(k, []);
        byClient.get(k).push(t);
      });
      return Array.from(byClient.entries())
        .map(([client, items]) => ({
          client,
          items,
          oldest: Math.max(...items.map(t => daysSince(t.created_at))),
          phone: items[0]?.phone,
        }))
        .sort((a, b) => b.oldest - a.oldest);
    };

    const goToCustomer = async (clientName, phone) => {
      closeModal();
      const c = await findCustomerByName(clientName);
      const cust = c || { nafn: clientName, simi: phone };
      if (window.SalaCustomer360 && typeof window.SalaCustomer360.open === 'function') {
        window.SalaCustomer360.open(cust);
      } else if (typeof window.salaOnCustomerPicked === 'function') {
        window.salaOnCustomerPicked(cust);
      } else {
        warn('No C360 available — cannot navigate');
      }
    };

    const render = rows => {
      list.innerHTML = '';
      summary.style.display = rows.length ? '' : 'none';
      summary.innerHTML = '';

      if (rows.length) {
        const uniqueClients = new Set(rows.map(t => t.client || '—')).size;
        summary.appendChild(el('div', {}, [
          el('div', { style: 'font-weight:700;font-size:16px;color:#991b1b',
            text: rows.length + ' tæki á verkstæði' }),
          el('div', { style: 'font-size:12px;color:#7f1d1d;margin-top:2px',
            text: 'Eldri en ' + minDays + ' dagar · ' + uniqueClients + ' viðskiptavinir' }),
        ]));
      }

      if (!rows.length) {
        list.appendChild(el('div', { class: 'sm-empty',
          text: 'Engin gömul tæki á þessu þrepi — fínt!' }));
        return;
      }

      if (grouped) {
        const groups = groupByClient(rows);
        groups.forEach(g => {
          const header = el('div', {
            class: 'sm-result',
            style: 'background:#fafafa;font-weight:700',
            on: { click: () => goToCustomer(g.client, g.phone) },
          }, [
            el('div', { class: 'sm-result-main' }, [
              el('div', { class: 'sm-result-name', text: g.client }),
              el('div', { class: 'sm-result-meta',
                text: g.items.length + ' tæki · elsta ' + g.oldest + ' dagar' }),
            ]),
            el('span', {
              class: 'sm-badge ' + (g.oldest >= 90 ? 'sm-badge-comp' : 'sm-badge-cust'),
              style: g.oldest >= 90 ? 'background:#fee2e2;color:#991b1b' : '',
              text: g.oldest + ' d',
            }),
          ]);
          list.appendChild(header);
          // Items as sub-rows
          g.items.forEach(t => {
            const d = daysSince(t.created_at);
            const sub = el('div', {
              class: 'sm-result',
              style: 'padding-left:24px;background:#fff',
            }, [
              el('div', { class: 'sm-result-main' }, [
                el('div', { style: 'font-weight:600;font-size:13px',
                  text: t.serial }),
                el('div', { class: 'sm-result-meta',
                  text: [t.type, t.size, t.location].filter(Boolean).join(' · ') || '—' }),
              ]),
              el('div', { style: 'text-align:right;flex-shrink:0' }, [
                el('div', { style: 'font-size:12px;font-weight:600;color:' + (d >= 90 ? '#991b1b' : '#9a3412'),
                  text: d + ' d' }),
                el('span', { class: 'sm-badge ' + statusBadgeClass(t.status),
                  style: 'font-size:10px',
                  text: t.status || '—' }),
              ]),
            ]);
            list.appendChild(sub);
          });
        });
      } else {
        rows.forEach(t => {
          const d = daysSince(t.created_at);
          const node = el('div', {
            class: 'sm-result',
            on: { click: () => goToCustomer(t.client, t.phone) },
          }, [
            el('div', { class: 'sm-result-main' }, [
              el('div', { class: 'sm-result-name',
                text: t.serial + ' · ' + (t.client || '—') }),
              el('div', { class: 'sm-result-meta',
                text: [t.type, t.size, t.location].filter(Boolean).join(' · ') || '—' }),
            ]),
            el('div', { style: 'text-align:right;flex-shrink:0;display:flex;flex-direction:column;gap:2px;align-items:flex-end' }, [
              el('div', {
                style: 'font-weight:700;font-size:14px;color:' + (d >= 90 ? '#991b1b' : '#9a3412'),
                text: d + ' dagar',
              }),
              el('span', { class: 'sm-badge ' + statusBadgeClass(t.status),
                text: t.status || '—' }),
            ]),
          ]);
          list.appendChild(node);
        });
      }
    };

    const refresh = async () => {
      list.innerHTML = '<div class="sm-empty">Sæki…</div>';
      summary.style.display = 'none';
      lastRows = await fetchStale(minDays);
      render(lastRows);
    };

    const close = el('button', { class: 'sm-btn', text: 'Loka', on: { click: closeModal }});
    const refreshBtn = el('button', { class: 'sm-btn', text: '↻ Endurnýja', on: { click: refresh }});
    openModal('Gömul tæki á verkstæði', body, [refreshBtn, close]);
    refresh();
  }

  /* ---------- Button ---------- */
  function ensureStaleButton() {
    const moBtn = document.getElementById('sm-mottaka-btn');
    if (!moBtn || !moBtn.parentNode) return;
    if (document.getElementById('sm-stale-btn')) return;

    const isFab = moBtn.style.position === 'fixed';
    const btn = el('button', {
      id: 'sm-stale-btn',
      class: 'sm-toolbtn',
      type: 'button',
      text: '🕰 Gömul tæki',
      style: isFab
        ? 'position:fixed;right:16px;bottom:240px;z-index:8000;background:#dc2626;border-color:#dc2626;box-shadow:0 6px 20px rgba(220,38,38,.35)'
        : 'margin-left:8px;background:#dc2626;border-color:#dc2626',
      on: { click: openStale },
    });

    if (isFab) {
      document.body.appendChild(btn);
    } else {
      const last = document.getElementById('sm-monthly-btn')
        || document.getElementById('sm-handover-btn')
        || document.getElementById('sm-today-btn')
        || moBtn;
      last.parentNode.insertBefore(btn, last.nextSibling);
    }
  }

  /* ---------- Boot ---------- */
  async function boot() {
    await waitFor(() => sb() && document.getElementById('sm-mottaka-btn'), 30000);
    ensureStaleButton();
    let raf = null;
    const obs = new MutationObserver(() => {
      if (raf) return;
      raf = requestAnimationFrame(() => { raf = null; ensureStaleButton(); });
    });
    obs.observe(document.body, { childList: true, subtree: true });
    log('ready');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  /* ---------- Public API ---------- */
  window.SalaStale = {
    open: openStale,
    fetch: fetchStale,
    version: '1.0.0',
  };
})();


/* === END SALA SUITE === */

/* === VIDSK TAB v1 (2026-04-30) === */

/* Viðskiptavinir tab — mirrors Fyrirtæki layout (header + search + list + cards),
   reads from `vidskiptavinir` table, joins counts from `uttaeki`, last visit from `verkbeidnir`.
   Click a customer → opens existing window.SalaCustomer360 hub. */
(() => {
  if (window.__VidskInstalled) { console.log('[Vidsk] already installed'); return; }
  window.__VidskInstalled = true;

  const sb = window.supabase || window.sb;
  if (!sb) { console.warn('[Vidsk] Supabase not ready, abort'); return; }

  const State = { customers: [], counts: {}, lastVisits: {}, search: '', loaded: false };

  // ---------- helpers ----------
  function esc(s) {
    return (s == null ? '' : String(s)).replace(/[&<>"']/g, c =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  function initials(s) {
    const p = (s || '').trim().split(/\s+/);
    return ((p[0] || '').charAt(0) + (p[1] || '').charAt(0)).toUpperCase() || '?';
  }
  function fmtDate(d) {
    if (!d) return '—';
    try { return new Date(d).toLocaleDateString('is-IS'); } catch (_) { return '—'; }
  }
  function daysAgo(d) {
    if (!d) return null;
    const ms = Date.now() - new Date(d).getTime();
    return Math.floor(ms / 86400000);
  }

  // ---------- data ----------
  async function loadData() {
    const [v, u, j] = await Promise.all([
      sb.from('vidskiptavinir').select('*').order('nafn'),
      sb.from('uttaeki').select('client'),
      sb.from('verkbeidnir').select('customer,dropoff,created_at'),
    ]);
    State.customers = v.data || [];
    State.counts = {};
    for (const r of (u.data || [])) {
      if (!r.client) continue;
      State.counts[r.client] = (State.counts[r.client] || 0) + 1;
    }
    State.lastVisits = {};
    for (const r of (j.data || [])) {
      const c = r.customer; if (!c) continue;
      const d = r.dropoff || r.created_at; if (!d) continue;
      if (!State.lastVisits[c] || d > State.lastVisits[c]) State.lastVisits[c] = d;
    }
    State.loaded = true;
  }

  // ---------- DOM ----------
  function ensureViewContainer() {
    if (document.getElementById('view-vidskiptavinir')) return;
    const tpl = document.getElementById('view-companies');
    if (!tpl || !tpl.parentElement) {
      console.warn('[Vidsk] no view-companies template, cannot inject');
      return;
    }
    const view = document.createElement('div');
    view.id = 'view-vidskiptavinir';
    view.className = 'view';
    view.hidden = true;
    view.innerHTML = '<main class="main-panel" id="vidsk-main"><div class="loading-state" style="padding:40px;text-align:center;color:#888;">Hleður viðskiptavinum…</div></main>';
    tpl.parentElement.appendChild(view);
  }

  function renameCompaniesTab() {
    const btn = document.querySelector('.vnav-btn[data-view="companies"]');
    if (!btn) return;
    const cur = (btn.textContent || '').trim();
    if (cur === 'Fyrirtæki' || cur === 'Fyrirtækjaþjónusta') {
      btn.textContent = 'Fyrirtækjaþjónusta';
    }
  }

  function wireNavButton() {
    const btn = document.querySelector('.vnav-btn[data-view="vidskiptavinir"]');
    if (!btn) return;
    if (btn.dataset.vkWired === '1') return;
    btn.dataset.vkWired = '1';
    btn.addEventListener('click', () => {
      if (window.App && App.switchView) App.switchView('vidskiptavinir');
    });
  }

  function hookSwitchView() {
    if (!window.App || !App.switchView || App.switchView.__vkHooked) return;
    const orig = App.switchView;
    App.switchView = function (name) {
      const r = orig.apply(this, arguments);
      if (name === 'vidskiptavinir') Vidskiptavinir.render();
      return r;
    };
    App.switchView.__vkHooked = true;
  }

  // ---------- render ----------
  function render() {
    const main = document.getElementById('vidsk-main');
    if (!main) return;

    if (!State.loaded) {
      loadData().then(render).catch(e => {
        main.innerHTML = '<div style="padding:24px;color:#c33;">Villa við að sækja gögn: ' + esc(e.message || e) + '</div>';
      });
      return;
    }

    const filt = State.search.trim().toLowerCase();
    const list = !filt ? State.customers : State.customers.filter(c =>
      (c.nafn || '').toLowerCase().includes(filt) ||
      (c.kennitala || '').toLowerCase().includes(filt) ||
      (c.simi || '').toLowerCase().includes(filt) ||
      (c.netfang || '').toLowerCase().includes(filt)
    );

    main.innerHTML =
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:12px;">' +
        '<div>' +
          '<div style="font-size:22px;font-weight:600;">Viðskiptavinir</div>' +
          '<div class="_cl_subtitle" style="margin-top:2px;">' + State.customers.length + ' skráðir</div>' +
        '</div>' +
        '<button class="btn btn-primary btn-sm" id="_vk_new">+ Nýr viðskiptavinur</button>' +
      '</div>' +

      '<div class="_cl_wrap">' +
        '<div style="display:flex;gap:8px;align-items:center;">' +
          '<input id="_vk_search" class="fi" type="text" placeholder="🔎 Leita að viðskiptavini..." value="' + esc(State.search) + '" style="flex:1;">' +
          '<button id="_vk_clear" class="btn btn-sm">Hreinsa</button>' +
        '</div>' +
        '<div class="_cl_subtitle" style="margin:8px 0 12px;">Listi · ' + list.length + ' / ' + State.customers.length + ' viðskiptavinir</div>' +
        '<table class="_cl_table">' +
          '<thead><tr>' +
            '<th>Nafn</th><th>Kennitala</th><th>Sími</th>' +
            '<th>Tæki</th><th>Síðasta heimsókn</th><th></th>' +
          '</tr></thead>' +
          '<tbody>' +
            (list.length === 0
              ? '<tr><td colspan="6" style="text-align:center;padding:24px;color:#888;">Engir viðskiptavinir fundust</td></tr>'
              : list.map(c => {
                  const cnt = State.counts[c.nafn] || 0;
                  const last = State.lastVisits[c.nafn];
                  const days = daysAgo(last);
                  const lastTxt = last
                    ? fmtDate(last) + (days != null ? '<br><span style="font-size:11px;color:#888;">' + days + ' dögum</span>' : '')
                    : '—';
                  return '<tr data-vk-name="' + esc(c.nafn) + '" style="cursor:pointer;">' +
                    '<td><strong>' + esc(c.nafn) + '</strong></td>' +
                    '<td>' + esc(c.kennitala || '—') + '</td>' +
                    '<td>' + esc(c.simi || '—') + '</td>' +
                    '<td>' + cnt + '</td>' +
                    '<td>' + lastTxt + '</td>' +
                    '<td style="color:#888;">›</td>' +
                  '</tr>';
                }).join('')
            ) +
          '</tbody>' +
        '</table>' +
      '</div>' +

      '<div class="company-grid" style="margin-top:20px;">' +
        list.map(c => {
          const cnt = State.counts[c.nafn] || 0;
          return '<div class="company-card" data-vk-name="' + esc(c.nafn) + '" style="cursor:pointer;">' +
            '<div class="company-card-top">' +
              '<div class="company-initials">' + esc(initials(c.nafn)) + '</div>' +
              '<div style="flex:1;min-width:0;">' +
                '<div class="company-name">' + esc(c.nafn) + '</div>' +
                (c.kennitala ? '<div style="font-size:12px;color:#888;margin-top:2px;">kt. ' + esc(c.kennitala) + '</div>' : '') +
              '</div>' +
            '</div>' +
            '<div class="company-card-bottom">' +
              '<span class="company-stat"><strong>' + cnt + '</strong> tæki</span>' +
              (c.simi ? '<span style="font-size:13px;color:#666;">📞 ' + esc(c.simi) + '</span>' : '') +
            '</div>' +
          '</div>';
        }).join('') +
      '</div>';

    // bind events for this render
    const search = main.querySelector('#_vk_search');
    if (search) {
      search.addEventListener('input', e => { State.search = e.target.value; render(); });
      // keep focus + caret position
      if (filt) {
        search.focus();
        const v = search.value; search.value = ''; search.value = v;
      }
    }
    const clr = main.querySelector('#_vk_clear');
    if (clr) clr.addEventListener('click', () => { State.search = ''; render(); });
    const nu = main.querySelector('#_vk_new');
    if (nu) nu.addEventListener('click', () => Vidskiptavinir.openNew());

    main.querySelectorAll('[data-vk-name]').forEach(el => {
      el.addEventListener('click', ev => {
        if (ev.target.closest('button, input, a')) return;
        Vidskiptavinir.openDetail(el.dataset.vkName);
      });
    });
  }

  // ---------- public API ----------
  const Vidskiptavinir = {
    async load() { await loadData(); render(); },
    async render() {
      ensureViewContainer();
      if (!State.loaded) { await loadData(); }
      render();
    },
    refresh() { State.loaded = false; return Vidskiptavinir.render(); },
    openDetail(name) {
      if (window.SalaCustomer360 && SalaCustomer360.open) {
        SalaCustomer360.open(name);
      } else if (window.Customer360 && Customer360.open) {
        Customer360.open(name);
      } else {
        alert('Staða viðskiptavinar (' + name + ') — eining ekki tilbúin');
      }
    },
    openNew() {
      // Delegate to Sala intake's "new customer" flow if available
      if (window.SalaMottaka && SalaMottaka.openNewCustomer) {
        SalaMottaka.openNewCustomer();
      } else if (window.SalaMottaka && SalaMottaka.open) {
        SalaMottaka.open();
      } else {
        alert('Nýr viðskiptavinur — opnaðu Sala flipann.');
      }
    },
  };
  window.Vidskiptavinir = Vidskiptavinir;

  // ---------- bootstrap ----------
  function init() {
    try {
      renameCompaniesTab();
      ensureViewContainer();
      wireNavButton();
      hookSwitchView();
      console.log('[Vidsk] initialized');
    } catch (e) { console.error('[Vidsk] init err', e); }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  // also re-attempt after a moment in case App / nav builds late
  setTimeout(init, 1500);
  setTimeout(init, 4000);
})();


/* === END VIDSK TAB === */

/* === VIDSK REVAMP v1 === */
/* Viðskiptavinir tab — list (table + cards) and detail page mirroring Fyrirtækjaþjónusta */
(() => {
  if (typeof window === 'undefined' || !window.supabase || !window.SUPABASE_URL || !window.SUPABASE_KEY) {
    console.warn('[VidskRevamp] supabase not ready, skipping');
    return;
  }

  const SB = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_KEY);

  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));

  const initials = nafn => {
    if (!nafn) return '?';
    const w = String(nafn).trim().split(/\s+/).filter(Boolean);
    if (!w.length) return '?';
    if (w.length === 1) return w[0].slice(0, 2).toUpperCase();
    return (w[0][0] + w[w.length - 1][0]).toUpperCase();
  };

  const fmtDate = s => {
    if (!s) return '—';
    try { const d = new Date(s); if (isNaN(d)) return '—';
      return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
    } catch(e) { return '—'; }
  };

  const ktPattern = /^kt[:\s]*[0-9]{6}-?[0-9]{4}\s*$/i;
  const isPlaceholderName = n => !n || ktPattern.test(n);
  const displayName = c => isPlaceholderName(c.nafn) ? (c.kennitala ? 'kt: ' + c.kennitala : '(nafnlaus viðskiptavinur)') : c.nafn;

  // Categorize equipment by type into Fyrirtæki-matching buckets
  const TYPE_EXT_RE = /(slökkvi|abc|kolsýr|duft|extinguish)/i;
  const TYPE_HOSE_RE = /(slöng|slang|hose|brunaslang|slönguskáp)/i;
  const TYPE_SMOKE_RE = /(reyk|smoke|brunabjall)/i;
  const categorize = type => {
    const t = (type || '').toString();
    if (TYPE_HOSE_RE.test(t)) return 'hose';
    if (TYPE_SMOKE_RE.test(t)) return 'smoke';
    if (TYPE_EXT_RE.test(t)) return 'ext';
    return 'other';
  };

  // -------- state --------
  const SORT_PRESETS = [
    { id: 'name-asc',     key: 'name',    dir:  1, label: 'Stafrófsröð (A → Ö)' },
    { id: 'total-desc',   key: 'total',   dir: -1, label: 'Flest tæki fyrst' },
    { id: 'created-desc', key: 'created', dir: -1, label: 'Nýjastir fyrst' },
    { id: 'created-asc',  key: 'created', dir:  1, label: 'Elstu fyrst' }
  ];

  let customers = [];
  let unitsByPhone = {};   // phone -> [units]
  let unitsByName = {};    // name -> [units]
  let searchTerm = '';
  let sortKey = 'name';
  let sortDir = 1;
  try {
    const saved = localStorage.getItem('vidsk_sort');
    const preset = SORT_PRESETS.find(p => p.id === saved);
    if (preset) { sortKey = preset.key; sortDir = preset.dir; }
  } catch (_) { /* no localStorage */ }
  let view = 'list';       // 'list' | 'detail'
  let detailCustomer = null;
  let detailUnits = [];
  let isLoading = false;
  const selectedIds = new Set();

  function persistSort() {
    try {
      const p = SORT_PRESETS.find(x => x.key === sortKey && x.dir === sortDir);
      if (p) localStorage.setItem('vidsk_sort', p.id);
      else localStorage.removeItem('vidsk_sort');
    } catch (_) {}
  }

  async function load() {
    isLoading = true;
    try {
      const { data: rows, error } = await SB.from('vidskiptavinir').select('*').order('nafn', { ascending: true });
      if (error) throw error;
      customers = rows || [];

      const phones = customers.map(c => c.simi).filter(Boolean);
      const names = customers.map(c => c.nafn).filter(Boolean);

      unitsByPhone = {};
      unitsByName = {};

      if (phones.length) {
        const { data: byPhone } = await SB.from('uttaeki').select('*').in('phone', phones);
        for (const u of byPhone || []) {
          const k = u.phone || '';
          if (k) (unitsByPhone[k] = unitsByPhone[k] || []).push(u);
        }
      }
      if (names.length) {
        const { data: byName } = await SB.from('uttaeki').select('*').in('client', names);
        for (const u of byName || []) {
          const k = u.client || '';
          // dedupe: only count by name if not already counted by phone
          if (k && !u.phone) (unitsByName[k] = unitsByName[k] || []).push(u);
        }
      }
      window.Vidskiptavinir.list = customers;
    } finally {
      isLoading = false;
    }
  }

  function unitsFor(c) {
    const a = c.simi ? (unitsByPhone[c.simi] || []) : [];
    const b = unitsByName[c.nafn] || [];
    return a.concat(b);
  }

  function counts(c) {
    const u = unitsFor(c);
    let ext = 0, hose = 0, smoke = 0, other = 0;
    for (const x of u) {
      const cat = categorize(x.type);
      if (cat === 'ext') ext++;
      else if (cat === 'hose') hose++;
      else if (cat === 'smoke') smoke++;
      else other++;
    }
    return { ext, hose, smoke, other, total: u.length };
  }

  function ensureMain() {
    const v = document.getElementById('view-vidskiptavinir');
    if (!v) return null;
    let m = document.getElementById('vidsk-main');
    if (!m) {
      v.innerHTML = '<main id="vidsk-main" class="main-panel"></main>';
      m = v.querySelector('#vidsk-main');
    }
    return m;
  }

  // -------- list view --------
  function compareCustomers(a, b) {
    const ca = counts(a), cb = counts(b);
    let av, bv;
    if (sortKey === 'name') { av = (a.nafn || '').toLowerCase(); bv = (b.nafn || '').toLowerCase(); }
    else if (sortKey === 'kt') { av = (a.kennitala || ''); bv = (b.kennitala || ''); }
    else if (sortKey === 'simi') { av = (a.simi || ''); bv = (b.simi || ''); }
    else if (sortKey === 'ext') { av = ca.ext; bv = cb.ext; }
    else if (sortKey === 'hose') { av = ca.hose; bv = cb.hose; }
    else if (sortKey === 'smoke') { av = ca.smoke; bv = cb.smoke; }
    else if (sortKey === 'total') { av = ca.total; bv = cb.total; }
    else if (sortKey === 'created') { av = a.created_at || ''; bv = b.created_at || ''; }
    else { av = (a.nafn || '').toLowerCase(); bv = (b.nafn || '').toLowerCase(); }
    if (av < bv) return -sortDir;
    if (av > bv) return sortDir;
    return 0;
  }

  function renderList() {
    const m = ensureMain();
    if (!m) return;
    if (isLoading && !customers.length) {
      m.innerHTML = '<div class="loading-state">Hleður viðskiptavinum…</div>';
      return;
    }

    const term = searchTerm.toLowerCase().trim();
    const filtered = (term
      ? customers.filter(c => [c.nafn, c.kennitala, c.simi, c.netfang]
          .some(f => (f || '').toString().toLowerCase().includes(term)))
      : customers.slice()
    ).sort(compareCustomers);

    const arrow = k => sortKey === k ? (sortDir === 1 ? ' ▲' : ' ▼') : ' ⇅';

    const headerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:12px;">
        <div>
          <div style="font-size:19px;font-weight:600;color:var(--text,#0f1117);">Viðskiptavinir</div>
          <div style="font-size:13px;font-weight:400;color:var(--text-muted,#8891a0);">${customers.length} skráðir</div>
        </div>
        <button class="btn btn-primary btn-sm" id="vk-new-btn">+ Nýr viðskiptavinur</button>
      </div>`;

    const currentPresetId = (SORT_PRESETS.find(p => p.key === sortKey && p.dir === sortDir) || {}).id || '';
    const sortOptionsHTML = SORT_PRESETS.map(p =>
      `<option value="${p.id}"${p.id === currentPresetId ? ' selected' : ''}>${esc(p.label)}</option>`
    ).join('') + (currentPresetId ? '' : '<option value="" selected>Sérsniðin röðun</option>');

    // Bulk action bar (visible only when selection > 0)
    const filteredIds = new Set(filtered.map(c => c.id));
    const selectedInFiltered = filtered.filter(c => selectedIds.has(c.id)).length;
    const allFilteredSelected = filtered.length > 0 && selectedInFiltered === filtered.length;
    const someSelected = selectedIds.size > 0;
    const bulkBarHTML = someSelected ? `
      <div style="display:flex;align-items:center;gap:8px;padding:10px 12px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:9px;margin-top:10px;flex-wrap:wrap;">
        <span style="font-weight:600;color:#1e40af;font-size:14px;">${selectedIds.size} valdir</span>
        <button class="btn btn-outline btn-sm" id="vk-bulk-clear">Hreinsa val</button>
        <div style="flex:1;min-width:0;"></div>
        <button class="btn btn-outline btn-sm" id="vk-bulk-csv">📥 Útflytja CSV</button>
        <button class="btn btn-outline btn-sm" id="vk-bulk-email">📧 Tölvupóstur</button>
        <button class="btn btn-outline btn-sm" id="vk-bulk-delete" style="color:#dc2626;border-color:#fca5a5;">🗑️ Eyða</button>
      </div>
    ` : '';

    const searchHTML = `
      <div class="_cl_wrap" style="margin-bottom:16px;">
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
          <input id="vk-search" type="search"
                 placeholder="🔎 Leita að viðskiptavini..."
                 value="${esc(searchTerm)}"
                 style="flex:1;min-width:180px;padding:10px 14px;border:1px solid #e5e7eb;border-radius:9px;font-size:14px;background:#fff;outline:none;">
          <select id="vk-sort"
                  style="padding:10px 12px;border:1px solid #e5e7eb;border-radius:9px;font-size:14px;background:#fff;outline:none;cursor:pointer;">
            ${sortOptionsHTML}
          </select>
          ${searchTerm ? '<button class="btn btn-outline btn-sm" id="vk-clear">Hreinsa</button>' : ''}
        </div>
        ${bulkBarHTML}
        <div class="_cl_subtitle" style="margin-top:8px;color:var(--text-muted,#8891a0);font-size:13px;">
          Listi · ${filtered.length} / ${customers.length} viðskiptavinir${someSelected ? ` · ${selectedIds.size} valdir` : ''}
        </div>
        <table class="_cl_table" style="width:100%;border-collapse:collapse;margin-top:10px;background:#fff;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;">
          <thead>
            <tr style="background:#f9fafb;">
              <th style="width:36px;padding:10px 8px;text-align:center;border-bottom:1px solid #e5e7eb;">
                <input type="checkbox" id="vk-sel-all" ${allFilteredSelected ? 'checked' : ''} ${selectedInFiltered > 0 && !allFilteredSelected ? 'data-indet="1"' : ''} style="cursor:pointer;width:16px;height:16px;">
              </th>
              <th data-sort="name" style="padding:10px 12px;text-align:left;font-size:13px;font-weight:600;cursor:pointer;border-bottom:1px solid #e5e7eb;">Viðskiptavinur${arrow('name')}</th>
              <th data-sort="kt" style="padding:10px 12px;text-align:left;font-size:13px;font-weight:600;cursor:pointer;border-bottom:1px solid #e5e7eb;">Kennitala${arrow('kt')}</th>
              <th data-sort="simi" style="padding:10px 12px;text-align:left;font-size:13px;font-weight:600;cursor:pointer;border-bottom:1px solid #e5e7eb;">Sími${arrow('simi')}</th>
              <th data-sort="ext" style="padding:10px 12px;text-align:right;font-size:13px;font-weight:600;cursor:pointer;border-bottom:1px solid #e5e7eb;">🧯 Slökkvi${arrow('ext')}</th>
              <th data-sort="hose" style="padding:10px 12px;text-align:right;font-size:13px;font-weight:600;cursor:pointer;border-bottom:1px solid #e5e7eb;">🚒 Slöngur${arrow('hose')}</th>
              <th data-sort="smoke" style="padding:10px 12px;text-align:right;font-size:13px;font-weight:600;cursor:pointer;border-bottom:1px solid #e5e7eb;">🚨 Reyk${arrow('smoke')}</th>
              <th data-sort="total" style="padding:10px 12px;text-align:right;font-size:13px;font-weight:600;cursor:pointer;border-bottom:1px solid #e5e7eb;">Samtals${arrow('total')}</th>
              <th style="padding:10px 12px;border-bottom:1px solid #e5e7eb;"></th>
            </tr>
          </thead>
          <tbody>
            ${filtered.length === 0
              ? `<tr><td colspan="9" style="padding:24px;text-align:center;color:#888;">${customers.length===0 ? 'Engir viðskiptavinir skráðir.' : 'Enginn viðskiptavinur passar við leit.'}</td></tr>`
              : filtered.map(c => {
                  const cc = counts(c);
                  const isSel = selectedIds.has(c.id);
                  return `
                  <tr class="vk-row" data-id="${esc(c.id)}" style="cursor:pointer;border-bottom:1px solid #f3f4f6;${isSel ? 'background:#f0f9ff;' : ''}">
                    <td class="vk-cb-cell" style="padding:10px 8px;text-align:center;">
                      <input type="checkbox" class="vk-sel-cb" data-id="${esc(c.id)}" ${isSel ? 'checked' : ''} style="cursor:pointer;width:16px;height:16px;">
                    </td>
                    <td style="padding:10px 12px;font-size:14px;font-weight:500;">${esc(displayName(c))}</td>
                    <td style="padding:10px 12px;font-size:13px;color:#555;">${esc(c.kennitala || '—')}</td>
                    <td style="padding:10px 12px;font-size:13px;color:#555;">${esc(c.simi || '—')}</td>
                    <td style="padding:10px 12px;font-size:14px;text-align:right;">${cc.ext}</td>
                    <td style="padding:10px 12px;font-size:14px;text-align:right;">${cc.hose}</td>
                    <td style="padding:10px 12px;font-size:14px;text-align:right;">${cc.smoke}</td>
                    <td style="padding:10px 12px;font-size:14px;text-align:right;font-weight:600;">${cc.total}</td>
                    <td style="padding:10px 12px;text-align:right;"><button class="btn btn-outline btn-sm vk-row-open" data-id="${esc(c.id)}">Opna</button></td>
                  </tr>`;
                }).join('')}
          </tbody>
        </table>
      </div>`;

    const cardsHTML = '<div class="company-grid">' + filtered.map(c => {
      const cc = counts(c);
      const pill = cc.total > 0
        ? '<span class="st st-ok">Í lagi</span>'
        : '<span class="st" style="background:rgba(0,0,0,0.04);color:var(--text-muted,#8891a0);">Nýr</span>';
      return `
        <div class="company-card vk-card" data-id="${esc(c.id)}">
          <div class="company-card-top">
            <div class="company-initials">${esc(initials(isPlaceholderName(c.nafn) ? (c.kennitala || '?') : c.nafn))}</div>
            <div style="flex:1;min-width:0;">
              <div class="company-name">${esc(displayName(c))}</div>
              ${pill}
            </div>
          </div>
          <div class="company-card-bottom">
            <span class="company-stat"><strong>${cc.total}</strong> tæki</span>
            <div style="display:flex;gap:6px;">
              <button class="btn btn-outline btn-sm vk-view-btn" data-id="${esc(c.id)}">Skoða</button>
              <button class="btn btn-primary btn-sm vk-add-btn" data-id="${esc(c.id)}">+ Tæki</button>
            </div>
          </div>
        </div>`;
    }).join('') + '</div>';

    m.innerHTML = headerHTML + searchHTML + cardsHTML;

    // Wire events
    const search = m.querySelector('#vk-search');
    if (search) search.addEventListener('input', e => {
      const cur = e.target.selectionStart;
      searchTerm = e.target.value;
      renderList();
      const re = m.querySelector('#vk-search');
      if (re) { re.focus(); try { re.setSelectionRange(cur, cur); } catch(_){} }
    });
    m.querySelector('#vk-clear')?.addEventListener('click', () => { searchTerm = ''; renderList(); });
    m.querySelector('#vk-new-btn')?.addEventListener('click', () => {
      if (window.SalaMottaka?.openNewCustomer) window.SalaMottaka.openNewCustomer();
    });

    // Sort dropdown
    m.querySelector('#vk-sort')?.addEventListener('change', e => {
      const preset = SORT_PRESETS.find(p => p.id === e.target.value);
      if (preset) {
        sortKey = preset.key;
        sortDir = preset.dir;
        persistSort();
        renderList();
      }
    });

    // Sort header clicks
    m.querySelectorAll('th[data-sort]').forEach(th => {
      th.addEventListener('click', () => {
        const k = th.dataset.sort;
        if (sortKey === k) sortDir = -sortDir;
        else { sortKey = k; sortDir = 1; }
        persistSort();
        renderList();
      });
    });

    // Selection: per-row checkboxes
    m.querySelectorAll('.vk-sel-cb').forEach(cb => {
      cb.addEventListener('click', e => e.stopPropagation());
      cb.addEventListener('change', () => {
        const id = cb.dataset.id;
        if (cb.checked) selectedIds.add(id);
        else selectedIds.delete(id);
        renderList();
      });
    });

    // Selection: select-all header checkbox
    const selAll = m.querySelector('#vk-sel-all');
    if (selAll) {
      if (selAll.dataset.indet === '1') selAll.indeterminate = true;
      selAll.addEventListener('click', e => e.stopPropagation());
      selAll.addEventListener('change', () => {
        if (selAll.checked) filtered.forEach(c => selectedIds.add(c.id));
        else filtered.forEach(c => selectedIds.delete(c.id));
        renderList();
      });
    }

    // Bulk action bar
    m.querySelector('#vk-bulk-clear')?.addEventListener('click', () => {
      selectedIds.clear();
      renderList();
    });

    m.querySelector('#vk-bulk-csv')?.addEventListener('click', () => {
      const sel = customers.filter(c => selectedIds.has(c.id));
      if (sel.length === 0) return;
      const cols = ['Nafn','Kennitala','Sími','Netfang','Heimilisfang','Athugasemdir','Slökkvi','Slöngur','Reyk','Samtals'];
      const esc2 = v => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
      const rows = [cols.map(esc2).join(',')];
      for (const c of sel) {
        const cc = counts(c);
        rows.push([c.nafn||'', c.kennitala||'', c.simi||'', c.netfang||'', c.heimilisfang||'', c.athugasemdir||'', cc.ext, cc.hose, cc.smoke, cc.total].map(esc2).join(','));
      }
      const csv = '\uFEFF' + rows.join('\r\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `vidskiptavinir_${new Date().toISOString().slice(0,10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    });

    m.querySelector('#vk-bulk-email')?.addEventListener('click', () => {
      const withEmail = customers.filter(c => selectedIds.has(c.id) && c.netfang);
      if (withEmail.length === 0) {
        alert('Enginn af völdum viðskiptavinum hefur netfang skráð.');
        return;
      }
      const skipped = selectedIds.size - withEmail.length;
      if (skipped > 0 && !confirm(`${withEmail.length} hafa netfang en ${skipped} ekki. Halda áfram með ${withEmail.length}?`)) return;
      const emails = withEmail.map(c => c.netfang).join(',');
      window.location.href = 'mailto:?bcc=' + encodeURIComponent(emails);
    });

    m.querySelector('#vk-bulk-delete')?.addEventListener('click', async () => {
      const ids = Array.from(selectedIds);
      const n = ids.length;
      const word = n === 1 ? 'viðskiptavini' : 'viðskiptavinum';
      if (!confirm(`Eyða ${n} ${word}?\n\nÞetta er ekki hægt að taka til baka.`)) return;
      const btn = m.querySelector('#vk-bulk-delete');
      if (btn) { btn.disabled = true; btn.textContent = 'Eyði…'; }
      let ok = 0, err = 0;
      for (const id of ids) {
        try {
          const { error } = await SB.from('vidskiptavinir').delete().eq('id', id);
          if (error) throw error;
          ok++;
          selectedIds.delete(id);
        } catch (e) {
          err++;
          console.error('[VidskRevamp] bulk delete failed for', id, e);
        }
      }
      await load();
      renderList();
      if (err > 0) alert(`Eyddi ${ok} en ${err} mistókust.`);
    });

    // Row clicks open detail (but not when clicking checkbox or buttons)
    m.querySelectorAll('.vk-row').forEach(row => {
      row.addEventListener('click', e => {
        if (e.target.closest('button')) return;
        if (e.target.closest('.vk-cb-cell')) return;
        if (e.target.matches('input[type="checkbox"]')) return;
        openDetailById(row.dataset.id);
      });
    });
    m.querySelectorAll('.vk-row-open').forEach(b => {
      b.addEventListener('click', e => { e.stopPropagation(); openDetailById(b.dataset.id); });
    });

    // Card clicks open detail
    m.querySelectorAll('.vk-card').forEach(card => {
      card.style.cursor = 'pointer';
      card.addEventListener('click', e => {
        if (e.target.closest('button')) return;
        openDetailById(card.dataset.id);
      });
    });
    m.querySelectorAll('.vk-view-btn').forEach(b => {
      b.addEventListener('click', e => { e.stopPropagation(); openDetailById(b.dataset.id); });
    });
    m.querySelectorAll('.vk-add-btn').forEach(b => {
      b.addEventListener('click', e => {
        e.stopPropagation();
        const c = customers.find(x => String(x.id) === String(b.dataset.id));
        if (c && window.SalaMottaka?.openCustomer) {
          window.SalaMottaka.openCustomer({ kind: 'vidskiptavinur', id: c.id, nafn: c.nafn, simi: c.simi, kennitala: c.kennitala });
        }
      });
    });
  }

  // -------- detail view --------
  function openDetailById(id) {
    const c = customers.find(x => String(x.id) === String(id));
    if (!c) return;
    detailCustomer = c;
    detailUnits = unitsFor(c).slice().sort((a,b) => (a.type||'').localeCompare(b.type||''));
    view = 'detail';
    renderDetail();
  }

  function renderDetail() {
    const m = ensureMain();
    if (!m || !detailCustomer) return;
    const c = detailCustomer;
    const cc = counts(c);
    const summary = `🧯 Slökkvi: ${cc.ext}  |  🚒 Slöngur: ${cc.hose}  |  🚨 Reyk: ${cc.smoke}` +
      (cc.other > 0 ? `  |  Annað: ${cc.other}` : '');

    const headerHTML = `
      <button class="btn btn-ghost btn-sm" id="vk-back" style="display:inline-flex;align-items:center;gap:6px;margin-bottom:12px;">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
        Til baka
      </button>
      <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:20px;flex-wrap:wrap;">
        <div style="display:flex;align-items:center;gap:14px;min-width:0;">
          <div class="company-initials" style="flex-shrink:0;">${esc(initials(isPlaceholderName(c.nafn) ? (c.kennitala || '?') : c.nafn))}</div>
          <div style="min-width:0;">
            <div class="company-name" style="font-size:18px;font-weight:600;">${esc(displayName(c))}</div>
            <div style="font-size:13px;color:var(--text-muted,#8891a0);margin-top:2px;">${summary}</div>
          </div>
        </div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;">
          <button class="btn btn-outline btn-sm" id="vk-edit">Breyta</button>
          <button class="btn btn-outline btn-sm" id="vk-delete">🗑️ Eyða</button>
          <button class="btn btn-outline btn-sm" id="vk-c360">Staða</button>
          <button class="btn btn-primary btn-sm" id="vk-add-tæki">+ Bæta við tæki</button>
        </div>
      </div>`;

    const infoRow = (label, value) => `
      <div style="display:contents;">
        <div style="padding:8px 12px;font-size:13px;color:var(--text-muted,#8891a0);background:#f9fafb;border-bottom:1px solid #f3f4f6;">${esc(label)}</div>
        <div style="padding:8px 12px;font-size:14px;color:var(--text,#0f1117);background:#fff;border-bottom:1px solid #f3f4f6;">${value || '<span style="color:#9ca3af;">—</span>'}</div>
      </div>`;
    const infoGridHTML = `
      <div class="info-grid" style="display:grid;grid-template-columns:180px 1fr;gap:1px;background:#e5e7eb;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;margin-bottom:20px;">
        ${infoRow('Nafn', esc(c.nafn || ''))}
        ${infoRow('Kennitala', esc(c.kennitala || ''))}
        ${infoRow('Sími', c.simi ? `<a href="tel:${esc(c.simi)}" style="color:#2563eb;text-decoration:none;">${esc(c.simi)}</a>` : '')}
        ${infoRow('Netfang', c.netfang ? `<a href="mailto:${esc(c.netfang)}" style="color:#2563eb;text-decoration:none;">${esc(c.netfang)}</a>` : '')}
        ${infoRow('Heimilisfang', esc(c.heimilisfang || ''))}
        ${infoRow('Athugasemdir', esc(c.athugasemdir || ''))}
      </div>`;

    const tableRows = detailUnits.length === 0
      ? `<tr><td colspan="7" style="padding:20px;text-align:center;color:#888;font-style:italic;">Engin tæki skráð</td></tr>`
      : detailUnits.map(u => `
          <tr style="border-bottom:1px solid #f3f4f6;">
            <td style="padding:8px 12px;font-size:13px;">${esc(u.type || '—')}</td>
            <td style="padding:8px 12px;font-size:13px;font-family:ui-monospace,monospace;">${esc(u.serial || '—')}</td>
            <td style="padding:8px 12px;font-size:13px;">${esc(u.size || '—')}</td>
            <td style="padding:8px 12px;font-size:13px;">${esc(u.location || '—')}</td>
            <td style="padding:8px 12px;font-size:13px;">${esc(fmtDate(u.last_insp))}</td>
            <td style="padding:8px 12px;font-size:13px;">${esc(fmtDate(u.next_insp))}</td>
            <td style="padding:8px 12px;font-size:13px;">${esc(u.status || '—')}</td>
          </tr>`).join('');

    const tcardHTML = `
      <div style="margin-bottom:8px;font-size:14px;font-weight:600;color:var(--text,#0f1117);">Tæki (${detailUnits.length})</div>
      <div class="tcard" style="background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:0;overflow:hidden;">
        <table class="dtbl" style="width:100%;border-collapse:collapse;">
          <thead>
            <tr style="background:#f9fafb;">
              <th style="padding:10px 12px;text-align:left;font-size:13px;font-weight:600;border-bottom:1px solid #e5e7eb;">Tegund</th>
              <th style="padding:10px 12px;text-align:left;font-size:13px;font-weight:600;border-bottom:1px solid #e5e7eb;">Raðnúmer</th>
              <th style="padding:10px 12px;text-align:left;font-size:13px;font-weight:600;border-bottom:1px solid #e5e7eb;">Stærð</th>
              <th style="padding:10px 12px;text-align:left;font-size:13px;font-weight:600;border-bottom:1px solid #e5e7eb;">Staðsetning</th>
              <th style="padding:10px 12px;text-align:left;font-size:13px;font-weight:600;border-bottom:1px solid #e5e7eb;">Sl. skoðun</th>
              <th style="padding:10px 12px;text-align:left;font-size:13px;font-weight:600;border-bottom:1px solid #e5e7eb;">Næsta skoðun</th>
              <th style="padding:10px 12px;text-align:left;font-size:13px;font-weight:600;border-bottom:1px solid #e5e7eb;">Staða</th>
            </tr>
          </thead>
          <tbody>${tableRows}</tbody>
        </table>
      </div>`;

    m.innerHTML = headerHTML + infoGridHTML + tcardHTML;

    // Wire
    m.querySelector('#vk-back')?.addEventListener('click', () => { view = 'list'; detailCustomer = null; renderList(); });
    m.querySelector('#vk-add-tæki')?.addEventListener('click', () => {
      if (window.SalaMottaka?.openCustomer) {
        window.SalaMottaka.openCustomer({ kind: 'vidskiptavinur', id: c.id, nafn: c.nafn, simi: c.simi, kennitala: c.kennitala });
      }
    });
    m.querySelector('#vk-c360')?.addEventListener('click', () => {
      if (c.nafn && window.SalaCustomer360?.open) window.SalaCustomer360.open(c.nafn);
    });
    m.querySelector('#vk-delete')?.addEventListener('click', async () => {
      if (!confirm('Eyða viðskiptavini "' + (c.nafn || c.kennitala || c.id) + '"?\n\nÞetta er ekki hægt að taka til baka.')) return;
      try {
        const { error } = await SB.from('vidskiptavinir').delete().eq('id', c.id);
        if (error) throw error;
        view = 'list'; detailCustomer = null;
        await load();
        renderList();
      } catch (e) { alert('Villa við eyðingu: ' + e.message); }
    });
    m.querySelector('#vk-edit')?.addEventListener('click', () => openEditModal(c));
  }

  // -------- edit modal --------
  function openEditModal(c) {
    const existing = document.getElementById('vk-edit-modal');
    if (existing) existing.remove();
    const html = `
      <div id="vk-edit-modal" class="modal sm-modal" style="display:flex;position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.5);align-items:center;justify-content:center;padding:16px;">
        <div style="background:#fff;border-radius:12px;max-width:500px;width:100%;max-height:90vh;overflow:auto;padding:20px;">
          <h3 style="margin:0 0 16px 0;font-size:18px;">Breyta viðskiptavini</h3>
          <div style="display:grid;gap:12px;">
            <label style="display:block;"><div style="font-size:13px;color:#555;margin-bottom:4px;">Nafn</div>
              <input id="vk-e-nafn" value="${esc(c.nafn || '')}" style="width:100%;padding:8px 10px;border:1px solid #e5e7eb;border-radius:6px;font-size:14px;"></label>
            <label style="display:block;"><div style="font-size:13px;color:#555;margin-bottom:4px;">Kennitala</div>
              <input id="vk-e-kt" value="${esc(c.kennitala || '')}" style="width:100%;padding:8px 10px;border:1px solid #e5e7eb;border-radius:6px;font-size:14px;"></label>
            <label style="display:block;"><div style="font-size:13px;color:#555;margin-bottom:4px;">Sími</div>
              <input id="vk-e-simi" value="${esc(c.simi || '')}" style="width:100%;padding:8px 10px;border:1px solid #e5e7eb;border-radius:6px;font-size:14px;"></label>
            <label style="display:block;"><div style="font-size:13px;color:#555;margin-bottom:4px;">Netfang</div>
              <input id="vk-e-netfang" value="${esc(c.netfang || '')}" style="width:100%;padding:8px 10px;border:1px solid #e5e7eb;border-radius:6px;font-size:14px;"></label>
            <label style="display:block;"><div style="font-size:13px;color:#555;margin-bottom:4px;">Heimilisfang</div>
              <input id="vk-e-addr" value="${esc(c.heimilisfang || '')}" style="width:100%;padding:8px 10px;border:1px solid #e5e7eb;border-radius:6px;font-size:14px;"></label>
            <label style="display:block;"><div style="font-size:13px;color:#555;margin-bottom:4px;">Athugasemdir</div>
              <textarea id="vk-e-notes" rows="3" style="width:100%;padding:8px 10px;border:1px solid #e5e7eb;border-radius:6px;font-size:14px;resize:vertical;">${esc(c.athugasemdir || '')}</textarea></label>
          </div>
          <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px;">
            <button class="btn btn-outline btn-sm" id="vk-e-cancel">Hætta við</button>
            <button class="btn btn-primary btn-sm" id="vk-e-save">Vista</button>
          </div>
        </div>
      </div>`;
    document.body.insertAdjacentHTML('beforeend', html);
    const modal = document.getElementById('vk-edit-modal');
    const close = () => modal.remove();
    modal.querySelector('#vk-e-cancel').addEventListener('click', close);
    modal.addEventListener('click', e => { if (e.target === modal) close(); });
    modal.querySelector('#vk-e-save').addEventListener('click', async () => {
      const upd = {
        nafn: modal.querySelector('#vk-e-nafn').value.trim() || null,
        kennitala: modal.querySelector('#vk-e-kt').value.trim() || null,
        simi: modal.querySelector('#vk-e-simi').value.trim() || null,
        netfang: modal.querySelector('#vk-e-netfang').value.trim() || null,
        heimilisfang: modal.querySelector('#vk-e-addr').value.trim() || null,
        athugasemdir: modal.querySelector('#vk-e-notes').value.trim() || null
      };
      try {
        const { error } = await SB.from('vidskiptavinir').update(upd).eq('id', c.id);
        if (error) throw error;
        close();
        await load();
        // Reopen detail with updated record
        const updated = customers.find(x => String(x.id) === String(c.id));
        if (updated) { detailCustomer = updated; detailUnits = unitsFor(updated); renderDetail(); }
        else { view = 'list'; renderList(); }
      } catch (e) { alert('Villa við vistun: ' + e.message); }
    });
  }

  async function refresh() {
    try {
      const m = ensureMain();
      if (m && !customers.length) m.innerHTML = '<div class="loading-state">Hleður viðskiptavinum…</div>';
      await load();
      if (view === 'detail' && detailCustomer) {
        const updated = customers.find(x => String(x.id) === String(detailCustomer.id));
        if (updated) { detailCustomer = updated; detailUnits = unitsFor(updated); renderDetail(); return; }
        view = 'list'; detailCustomer = null;
      }
      renderList();
    } catch (e) {
      const m = ensureMain();
      if (m) m.innerHTML = '<div style="padding:40px;text-align:center;color:#c00;">Villa við hleðslu viðskiptavina: ' + esc(e.message) + '</div>';
      console.error('[VidskRevamp] load error', e);
    }
  }

  window.Vidskiptavinir = {
    load, render: renderList, refresh,
    list: customers,
    openDetail: c => { if (c?.id) openDetailById(c.id); },
    openNew: () => window.SalaMottaka?.openNewCustomer?.(),
    version: 'revamp-5-bulk'
  };
  window.__VidskRevampInstalled = true;

  function showVidskiptaviniView() {
    document.querySelectorAll('.view.active').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.vnav-btn.active').forEach(b => b.classList.remove('active'));
    const v = document.getElementById('view-vidskiptavinir');
    const b = document.querySelector('.vnav-btn[data-view="vidskiptavinir"]');
    if (v) v.classList.add('active');
    if (b) b.classList.add('active');
    // Reset to list view when re-entering
    view = 'list'; detailCustomer = null;
    refresh();
    document.querySelectorAll('.vnav, [class*="drawer"], [class*="menu-open"]').forEach(el => {
      el.classList.remove('open', 'active', 'menu-open');
    });
  }

  const navClickInterceptor = (e) => {
    const target = e.target.closest && e.target.closest('.vnav-btn[data-view="vidskiptavinir"]');
    if (!target) return;
    e.stopImmediatePropagation();
    e.preventDefault();
    showVidskiptaviniView();
  };
  window.addEventListener('click', navClickInterceptor, true);
  document.addEventListener('click', navClickInterceptor, true);

  function maybeRefresh() {
    const v = document.getElementById('view-vidskiptavinir');
    if (v && v.classList.contains('active')) refresh();
  }
  setTimeout(maybeRefresh, 100);

  // Nav label enforcement
  function fixLabels() {
    const fyBtn = document.querySelector('.vnav-btn[data-view="companies"]');
    if (fyBtn && fyBtn.textContent.trim() !== 'Fyrirtækjaþjónusta') fyBtn.textContent = 'Fyrirtækjaþjónusta';
    const vkBtn = document.querySelector('.vnav-btn[data-view="vidskiptavinir"]');
    if (vkBtn && vkBtn.textContent.trim() !== 'Viðskiptavinir') vkBtn.textContent = 'Viðskiptavinir';
  }
  fixLabels();
  const navHost = document.querySelector('.vnav, nav') || document.body;
  try {
    new MutationObserver(() => fixLabels()).observe(navHost, { childList: true, subtree: true, characterData: true });
  } catch (e) { setInterval(fixLabels, 2000); }
})();
/* === END VIDSK REVAMP === */

/* === VERKDAGBOK v5 === */
/* Verkdagbók — polish: search, date grouping, stats bar, collapsible archived, autoresize, keyboard shortcuts */
(() => {
  if (typeof window === 'undefined' || !window.supabase || !window.SUPABASE_URL || !window.SUPABASE_KEY) {
    console.warn('[Verkdagbok] supabase not ready, skipping');
    return;
  }

  const SB = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_KEY);
  const DESKTOP_MIN = 900;
  const isDesktop = () => window.matchMedia('(min-width: ' + DESKTOP_MIN + 'px)').matches;

  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));

  const todayISO = () => {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
  };

  const MONTHS_IS = ['jan','feb','mar','apr','maí','jún','júl','ágú','sep','okt','nóv','des'];
  const fmtDateShort = s => {
    if (!s) return '';
    try { const d = new Date(s); if (isNaN(d)) return String(s);
      return d.getDate() + '. ' + MONTHS_IS[d.getMonth()];
    } catch(e) { return ''; }
  };
  const fmtDateTbl = s => {
    if (!s) return '';
    try { const d = new Date(s); if (isNaN(d)) return String(s);
      return d.getDate() + '. ' + (d.getMonth()+1) + ".'" + String(d.getFullYear()).slice(-2);
    } catch(e) { return ''; }
  };

  function dateBucketLabel(dateStr) {
    if (!dateStr) return 'Án dagsetningar';
    const today = new Date(); today.setHours(0,0,0,0);
    const d = new Date(dateStr); d.setHours(0,0,0,0);
    if (isNaN(d)) return 'Án dagsetningar';
    const diffMs = today - d;
    const diffDays = Math.round(diffMs / 86400000);
    if (diffDays === 0) return 'Í dag';
    if (diffDays === 1) return 'Í gær';
    if (diffDays === -1) return 'Á morgun';
    if (diffDays > 0 && diffDays <= 6) return diffDays + ' dögum síðan';
    if (diffDays < 0 && diffDays >= -6) return 'Eftir ' + (-diffDays) + ' daga';
    return d.getDate() + '. ' + MONTHS_IS[d.getMonth()] + (d.getFullYear() !== today.getFullYear() ? " '" + String(d.getFullYear()).slice(-2) : '');
  }

  // -------- state --------
  let entries = [];
  let isLoading = false;
  let tableMissing = false;
  let searchQuery = '';
  let archivedExpanded = false;

  async function load() {
    isLoading = true;
    tableMissing = false;
    try {
      const { data, error } = await SB.from('verkdagbok').select('*').order('created_at', { ascending: false });
      if (error) {
        if (/(could not find|relation .* does not exist|schema cache)/i.test(error.message || '')) {
          tableMissing = true;
        } else throw error;
      } else {
        entries = data || [];
      }
    } finally { isLoading = false; }
  }

  function ensureNavButton() {
    if (document.querySelector('.vnav-btn[data-view="verkdagbok"]')) return true;
    const sample = document.querySelector('.vnav-btn[data-view="vidskiptavinir"]') ||
                   document.querySelector('.vnav-btn[data-view="companies"]');
    if (!sample || !sample.parentElement) return false;
    const btn = sample.cloneNode(false);
    btn.className = sample.className.replace(/\bactive\b/g,'').trim();
    btn.dataset.view = 'verkdagbok';
    btn.textContent = '📔 Verkdagbók';
    sample.parentElement.insertBefore(btn, sample.nextSibling);
    return true;
  }

  function ensureViewContainer() {
    if (document.getElementById('view-verkdagbok')) return true;
    const sample = document.getElementById('view-vidskiptavinir') ||
                   document.getElementById('view-companies');
    if (!sample || !sample.parentElement) return false;
    const v = document.createElement('div');
    v.id = 'view-verkdagbok';
    v.className = sample.className.replace(/\bactive\b/g,'').trim();
    v.innerHTML = '<main id="vd-main" class="main-panel"></main>';
    sample.parentElement.appendChild(v);
    return true;
  }

  function ensureMain() { return document.querySelector('#view-verkdagbok #vd-main'); }

  const STYLES = `
    .vd-wrap { max-width:1180px; margin:0 auto; }
    .vd-section { font-size:12px; font-weight:600; color:#475569; margin:18px 0 10px; padding:0 0 0 10px; border-left:3px solid #cbd5e1; text-transform:uppercase; letter-spacing:0.05em; display:flex; align-items:center; gap:10px; }
    .vd-section.archived { color:#94a3b8; cursor:pointer; user-select:none; }
    .vd-section.archived .vd-chev { transition:transform .2s; }
    .vd-section.archived.expanded .vd-chev { transform:rotate(90deg); }
    .vd-section .count-pill { padding:1px 8px; background:#e2e8f0; color:#475569; border-radius:99px; font-size:10px; font-weight:600; }
    .vd-section.archived .count-pill { background:#f1f5f9; color:#94a3b8; }
    .vd-section .date-bucket { color:#0f172a; font-size:11px; }
    .vd-empty { background:#fff; border:1px dashed #cbd5e1; border-radius:12px; padding:28px; text-align:center; color:#94a3b8; font-size:13px; }
    .vd-skra-btn { padding:10px 20px; background:#2563eb; color:#fff; border:none; border-radius:8px; font-size:14px; font-weight:600; cursor:pointer; transition:background .15s, transform .1s; }
    .vd-skra-btn:hover { background:#1d4ed8; }
    .vd-skra-btn:active { transform:translateY(1px); }

    .vd-header { margin-bottom:12px; }
    .vd-header h1 { margin:0 0 4px 0; font-size:20px; font-weight:600; color:#0f172a; }
    .vd-header .sub { font-size:13px; color:#64748b; }

    /* Toolbar (search + stats) */
    .vd-toolbar { display:flex; align-items:center; gap:10px; margin:10px 0 14px; flex-wrap:wrap; }
    .vd-search { position:relative; flex:1; min-width:220px; }
    .vd-search input { width:100%; padding:9px 36px 9px 36px; border:1px solid #e2e8f0; border-radius:8px; font:inherit; font-size:14px; color:#0f172a; background:#fff; outline:none; transition:border-color .15s, background .15s; box-sizing:border-box; }
    .vd-search input:focus { border-color:#3b82f6; background:#f0f7ff; }
    .vd-search .vd-search-icon { position:absolute; left:11px; top:50%; transform:translateY(-50%); color:#94a3b8; pointer-events:none; font-size:14px; }
    .vd-search .vd-search-clear { position:absolute; right:8px; top:50%; transform:translateY(-50%); background:none; border:none; color:#94a3b8; cursor:pointer; padding:4px 8px; font-size:14px; line-height:1; border-radius:4px; }
    .vd-search .vd-search-clear:hover { background:#f1f5f9; color:#475569; }
    .vd-stats { display:flex; gap:6px; flex-shrink:0; }
    .vd-stat { background:#fff; border:1px solid #e2e8f0; border-radius:8px; padding:6px 12px; font-size:12px; color:#475569; display:inline-flex; align-items:center; gap:6px; }
    .vd-stat strong { color:#0f172a; font-weight:600; }
    .vd-stat.active { border-color:#bfdbfe; background:#eff6ff; color:#1d4ed8; }
    .vd-stat.active strong { color:#1d4ed8; }
    .vd-stat.done { border-color:#a7f3d0; background:#ecfdf5; color:#065f46; }
    .vd-stat.done strong { color:#065f46; }

    /* ===== Mobile / Card layout ===== */
    .vd-form-card { background:#fff; border:1px solid #e2e8f0; border-radius:12px; padding:16px; margin-bottom:18px; box-shadow:0 1px 2px rgba(15,23,42,0.04); }
    .vd-form-card label.lbl { display:block; font-size:11px; font-weight:600; color:#64748b; margin-bottom:5px; text-transform:uppercase; letter-spacing:0.04em; }
    .vd-form-card input[type=text], .vd-form-card input[type=date], .vd-form-card textarea {
      width:100%; padding:9px 11px; border:1px solid #e2e8f0; border-radius:8px;
      font:inherit; font-size:14px; color:#0f172a; background:#fff; outline:none; box-sizing:border-box;
      transition:border-color .15s, background .15s;
    }
    .vd-form-card input:focus, .vd-form-card textarea:focus { border-color:#3b82f6; background:#f0f7ff; }
    .vd-form-card textarea#vd-athugasemdir { font-size:15px; line-height:1.5; min-height:120px; resize:vertical; }
    .vd-meta-row { display:grid; grid-template-columns:140px 1fr; gap:10px; margin-bottom:12px; }
    @media (max-width:480px) { .vd-meta-row { grid-template-columns:1fr; gap:8px; } }
    .vd-eq-block { margin-top:14px; padding-top:14px; border-top:1px dashed #e2e8f0; }
    .vd-eq-row { display:grid; grid-template-columns:90px 1fr 38px 38px; gap:8px; align-items:center; margin-bottom:6px; font-size:13px; }
    .vd-eq-row .lbl-cell { font-weight:500; color:#334155; }
    .vd-eq-row input[type=text] { padding:7px 10px; border:1px solid #e2e8f0; border-radius:6px; font:inherit; font-size:13px; background:#fff; outline:none; }
    .vd-eq-row input[type=text]:focus { border-color:#3b82f6; background:#f0f7ff; }
    .vd-eq-row .cb-cell { display:flex; flex-direction:column; align-items:center; gap:1px; }
    .vd-eq-row .cb-cell input[type=checkbox] { width:18px; height:18px; cursor:pointer; margin:0; }
    .vd-eq-head { display:grid; grid-template-columns:90px 1fr 38px 38px; gap:8px; font-size:10px; color:#94a3b8; text-transform:uppercase; letter-spacing:0.05em; margin-bottom:6px; padding-left:2px; }
    .vd-eq-head > div:first-child { font-weight:600; color:#475569; }
    .vd-eq-head > .h, .vd-eq-head > .y { text-align:center; }
    .vd-skra-row { margin-top:14px; display:flex; justify-content:space-between; align-items:center; gap:10px; }
    .vd-skra-hint { font-size:11px; color:#94a3b8; }

    .vd-card { background:#fff; border:1px solid #e2e8f0; border-radius:12px; padding:14px; margin-bottom:8px;
               display:grid; grid-template-columns:auto 1fr auto; gap:12px; align-items:flex-start; transition:border-color .15s, background .15s, box-shadow .15s; }
    .vd-card:hover { border-color:#cbd5e1; box-shadow:0 1px 3px rgba(15,23,42,0.05); }
    .vd-card.done { background:#ecfdf5; border-color:#a7f3d0; }
    .vd-card.archived { background:#f8fafc; border-color:#e2e8f0; opacity:0.65; }
    .vd-card.archived:hover { opacity:0.85; }
    .vd-card.archived .vd-ath, .vd-card.archived .vd-fyr { text-decoration:line-through; }
    .vd-cb-col input[type=checkbox] { width:22px; height:22px; cursor:pointer; accent-color:#10b981; margin:0; }
    .vd-cb-col .vd-archived-mark { font-size:18px; color:#94a3b8; line-height:22px; }
    .vd-body { min-width:0; }
    .vd-ath { font-size:15px; line-height:1.5; color:#0f172a; font-weight:500; white-space:pre-wrap; word-break:break-word; }
    .vd-card.done .vd-ath { color:#065f46; }
    .vd-ath-empty { color:#94a3b8; font-style:italic; font-weight:400; }
    .vd-meta { font-size:12px; color:#64748b; margin-top:8px; line-height:1.6; }
    .vd-meta .vd-fyr { color:#334155; font-weight:600; }
    .vd-meta .vd-dot { color:#cbd5e1; margin:0 6px; }
    .vd-eq-pills { margin-top:6px; display:flex; flex-wrap:wrap; gap:4px; }
    .vd-eq-pill { display:inline-flex; align-items:center; gap:4px; padding:3px 9px; background:#f1f5f9; border-radius:99px; font-size:12px; color:#334155; }
    .vd-card.done .vd-eq-pill { background:#d1fae5; color:#065f46; }
    .vd-eq-pill .ck { font-size:10px; padding:1px 5px; background:#cbd5e1; border-radius:99px; color:#334155; font-weight:600; }
    .vd-card.done .vd-eq-pill .ck { background:#6ee7b7; color:#065f46; }
    .vd-actions { display:flex; flex-direction:column; gap:4px; flex-shrink:0; }
    .vd-actions button { padding:6px 10px; font-size:12px; line-height:1; min-height:0; border:1px solid #e2e8f0; background:#fff; border-radius:6px; cursor:pointer; color:#334155; transition:all .15s; white-space:nowrap; }
    .vd-actions button:hover { border-color:#94a3b8; background:#f8fafc; }
    .vd-actions button.primary { background:#2563eb; color:#fff; border-color:#2563eb; }
    .vd-actions button.primary:hover { background:#1d4ed8; border-color:#1d4ed8; }
    .vd-actions button.danger { color:#dc2626; }
    .vd-actions button.danger:hover { background:#fef2f2; border-color:#fca5a5; }
    @media (max-width:520px) {
      .vd-card { grid-template-columns:auto 1fr; padding:12px; gap:10px; }
      .vd-actions { grid-column:1/-1; flex-direction:row; flex-wrap:wrap; gap:4px; padding-top:6px; border-top:1px solid #e2e8f0; margin-top:2px; }
      .vd-actions button { flex:1; min-width:60px; padding:7px 8px; }
      .vd-actions button.danger { flex:0 0 auto; min-width:0; }
      .vd-form-card { padding:14px; }
      .vd-eq-row { grid-template-columns:80px 1fr 34px 34px; gap:6px; }
      .vd-eq-head { grid-template-columns:80px 1fr 34px 34px; gap:6px; }
    }

    /* ===== Desktop / Table (paper-form) layout ===== */
    .vd-tbl-wrap { background:#fff; border:1px solid #e2e8f0; border-radius:12px; overflow:hidden; box-shadow:0 1px 2px rgba(15,23,42,0.04); margin-bottom:14px; }
    .vd-tbl { width:100%; border-collapse:collapse; font-size:13px; background:#fff; }
    .vd-tbl th, .vd-tbl td { border:1px solid #e2e8f0; padding:7px 9px; vertical-align:top; }
    .vd-tbl thead th { background:#f8fafc; font-weight:600; font-size:11px; color:#475569; text-align:center; padding:8px 6px; text-transform:uppercase; letter-spacing:0.04em; border-color:#e2e8f0; }
    .vd-tbl thead th.left { text-align:left; }
    .vd-tbl tbody td { background:#fff; transition:background .15s; }
    .vd-tbl tbody tr:nth-child(even):not(.vd-form-row):not(.done):not(.archived) td { background:#fcfdff; }
    .vd-tbl input[type=text], .vd-tbl input[type=date], .vd-tbl textarea {
      width:100%; border:none; background:transparent; font:inherit; padding:2px 4px; outline:none;
      box-sizing:border-box; color:#0f172a; resize:none;
    }
    .vd-tbl textarea { font-family:inherit; min-height:46px; line-height:1.5; overflow:hidden; }
    .vd-tbl input:focus, .vd-tbl textarea:focus { background:#f0f7ff; border-radius:4px; }
    .vd-tbl input[type=checkbox] { width:18px; height:18px; cursor:pointer; margin:0; vertical-align:middle; }
    .vd-tbl .cc { text-align:center; width:34px; }
    .vd-tbl .sz { width:90px; }
    .vd-tbl .stat { text-align:center; width:30px; }
    .vd-tbl .dt { width:80px; white-space:nowrap; color:#64748b; font-size:12px; }
    .vd-tbl .ath-cell { min-width:280px; font-size:14px; line-height:1.5; color:#0f172a; white-space:pre-wrap; word-break:break-word; font-weight:500; }
    .vd-tbl .fyr-cell { min-width:160px; font-weight:500; color:#334155; }
    .vd-tbl .act { width:120px; white-space:nowrap; text-align:center; }

    .vd-tbl .vd-form-row td { background:#eff6ff !important; }
    .vd-tbl .vd-form-row .stat { color:#2563eb; }
    .vd-tbl .vd-row.done td { background:#ecfdf5 !important; }
    .vd-tbl .vd-row.done .ath-cell, .vd-tbl .vd-row.done .fyr-cell { color:#065f46; }
    .vd-tbl .vd-row.archived td { background:#f8fafc !important; color:#94a3b8; }
    .vd-tbl .vd-row.archived .ath-cell, .vd-tbl .vd-row.archived .fyr-cell { text-decoration:line-through; }
    .vd-tbl .vd-row:hover:not(.archived):not(.vd-form-row):not(.done) td { background:#f0f7ff !important; }
    .vd-tbl .vd-x { color:#1e293b; font-weight:700; font-size:15px; }
    .vd-tbl .circle { display:inline-block; width:12px; height:12px; border:1.5px solid #2563eb; border-radius:50%; }

    .vd-tbl .act button { padding:3px 7px; font-size:12px; margin:0 1px; border:1px solid #e2e8f0; background:#fff; border-radius:5px; cursor:pointer; color:#334155; line-height:1.2; transition:all .15s; }
    .vd-tbl .act button:hover { border-color:#94a3b8; background:#f8fafc; }
    .vd-tbl .act button.primary { background:#2563eb; color:#fff; border-color:#2563eb; }
    .vd-tbl .act button.primary:hover { background:#1d4ed8; }
    .vd-tbl .act button.danger { color:#dc2626; }
    .vd-tbl .act button.danger:hover { background:#fef2f2; border-color:#fca5a5; }
    .vd-tbl .skra-cell { padding:4px; }
    .vd-tbl .skra-cell button { padding:6px 12px; background:#2563eb; color:#fff; border:none; border-radius:6px; font-size:12px; font-weight:600; cursor:pointer; }
    .vd-tbl .skra-cell button:hover { background:#1d4ed8; }

    /* archived collapse */
    .vd-archived-block { transition:opacity .2s; }
    .vd-archived-block.collapsed { display:none; }

    /* date group separator */
    .vd-date-group { margin:14px 0 8px; }
    .vd-date-group:first-child { margin-top:0; }
  `;

  function injectStyles() {
    if (document.getElementById('vd-styles')) return;
    const s = document.createElement('style');
    s.id = 'vd-styles';
    s.textContent = STYLES;
    document.head.appendChild(s);
  }

  // ===== shared filter & grouping =====
  function matchesSearch(e, q) {
    if (!q) return true;
    const lc = q.toLowerCase();
    return (e.fyrirtaeki || '').toLowerCase().includes(lc) ||
           (e.athugasemdir || '').toLowerCase().includes(lc) ||
           (e.duft_size || '').toLowerCase().includes(lc) ||
           (e.lettvatn_size || '').toLowerCase().includes(lc) ||
           (e.kolsyra_size || '').toLowerCase().includes(lc) ||
           (e.job_date || '').includes(lc);
  }

  function groupByDate(list) {
    // preserve order, group by job_date label
    const groups = []; const seen = new Map();
    for (const e of list) {
      const key = e.job_date || '__none__';
      let g = seen.get(key);
      if (!g) {
        g = { key, label: dateBucketLabel(e.job_date), items: [] };
        seen.set(key, g); groups.push(g);
      }
      g.items.push(e);
    }
    return groups;
  }

  // ===== Mobile (card) renderers =====
  function formCardHTML() {
    return `
      <div class="vd-form-card">
        <div class="vd-meta-row">
          <div>
            <label class="lbl">Dags</label>
            <input type="date" id="vd-date" value="${todayISO()}">
          </div>
          <div>
            <label class="lbl">Fyrirtæki</label>
            <input type="text" id="vd-fyrirtaeki" placeholder="t.d. Trönuhraun 2">
          </div>
        </div>
        <div>
          <label class="lbl">Athugasemdir / verklýsing</label>
          <textarea id="vd-athugasemdir" placeholder="kt, sími, hvað á að gera..."></textarea>
        </div>
        <div class="vd-eq-block">
          <div class="vd-eq-head"><div>Tæki</div><div></div><div class="h">h</div><div class="y">y</div></div>
          <div class="vd-eq-row"><div class="lbl-cell">🧯 Duft</div>
            <input type="text" id="vd-duft-size" placeholder="t.d. 5kg × 2">
            <div class="cb-cell"><input type="checkbox" id="vd-duft-h"></div>
            <div class="cb-cell"><input type="checkbox" id="vd-duft-y"></div></div>
          <div class="vd-eq-row"><div class="lbl-cell">🚒 Léttvatn</div>
            <input type="text" id="vd-lettvatn-size" placeholder="t.d. 6L × 3">
            <div class="cb-cell"><input type="checkbox" id="vd-lettvatn-h"></div>
            <div class="cb-cell"><input type="checkbox" id="vd-lettvatn-y"></div></div>
          <div class="vd-eq-row"><div class="lbl-cell">☁️ Kolsýra</div>
            <input type="text" id="vd-kolsyra-size" placeholder="t.d. 5kg">
            <div class="cb-cell"><input type="checkbox" id="vd-kolsyra-h"></div>
            <div class="cb-cell"><input type="checkbox" id="vd-kolsyra-y"></div></div>
        </div>
        <div class="vd-skra-row">
          <span class="vd-skra-hint">Cmd/Ctrl+Enter = skrá</span>
          <button class="vd-skra-btn" id="vd-save-btn">+ Skrá</button>
        </div>
      </div>`;
  }

  function eqPillHTML(icon, size, h, y) {
    if (!size && !h && !y) return '';
    const marks = [];
    if (h) marks.push('<span class="ck">h</span>');
    if (y) marks.push('<span class="ck">y</span>');
    const sizeText = size ? esc(size) : '';
    return `<span class="vd-eq-pill">${icon}${sizeText ? ' ' + sizeText : ''}${marks.length ? ' ' + marks.join('') : ''}</span>`;
  }

  function entryCardHTML(e, isArchived) {
    const cls = ['vd-card'];
    if (e.done && !isArchived) cls.push('done');
    if (isArchived) cls.push('archived');
    const ath = e.athugasemdir
      ? `<div class="vd-ath">${esc(e.athugasemdir)}</div>`
      : `<div class="vd-ath vd-ath-empty">${esc(e.fyrirtaeki || '(engin athugasemd)')}</div>`;
    const metaParts = [];
    if (e.athugasemdir && e.fyrirtaeki) metaParts.push(`<span class="vd-fyr">${esc(e.fyrirtaeki)}</span>`);
    if (e.job_date) metaParts.push(esc(fmtDateShort(e.job_date)));
    const eqHTML = [
      eqPillHTML('🧯', e.duft_size, e.duft_h, e.duft_y),
      eqPillHTML('🚒', e.lettvatn_size, e.lettvatn_h, e.lettvatn_y),
      eqPillHTML('☁️', e.kolsyra_size, e.kolsyra_h, e.kolsyra_y)
    ].filter(Boolean).join('');
    const metaHTML = metaParts.length ? `<div class="vd-meta">${metaParts.join('<span class="vd-dot">·</span>')}</div>` : '';
    const eqWrap = eqHTML ? `<div class="vd-eq-pills">${eqHTML}</div>` : '';
    return `
      <div class="${cls.join(' ')}" data-id="${esc(e.id)}">
        <div class="vd-cb-col">${isArchived ? '<span class="vd-archived-mark">✓</span>' : `<input type="checkbox" class="vd-done-cb" data-id="${esc(e.id)}" ${e.done?'checked':''}>`}</div>
        <div class="vd-body">${ath}${metaHTML}${eqWrap}</div>
        <div class="vd-actions">
          ${!isArchived ? `
            <button class="vd-edit" data-id="${esc(e.id)}">✏️ Breyta</button>
            <button class="primary vd-archive" data-id="${esc(e.id)}">✓ Frágengið</button>
            <button class="danger vd-del" data-id="${esc(e.id)}">🗑️</button>
          ` : `
            <button class="vd-unarchive" data-id="${esc(e.id)}">↩ Endurvirkja</button>
            <button class="danger vd-del" data-id="${esc(e.id)}">🗑️</button>
          `}
        </div>
      </div>`;
  }

  // ===== Desktop (table) renderers =====
  function tableHead() {
    return `
      <thead>
        <tr>
          <th rowspan="2" class="stat"></th>
          <th rowspan="2" class="dt">Dags</th>
          <th rowspan="2" class="left">Fyrirtæki</th>
          <th rowspan="2" class="left">Athugasemdir</th>
          <th colspan="3">🧯 Duft</th>
          <th colspan="3">🚒 Léttvatn</th>
          <th colspan="3">☁️ Kolsýra</th>
          <th rowspan="2" class="act">Aðgerðir</th>
        </tr>
        <tr>
          <th class="sz">Stærð</th><th class="cc" title="Hleðsla">h</th><th class="cc" title="Yfirfara">y</th>
          <th class="sz">Stærð</th><th class="cc" title="Hleðsla">h</th><th class="cc" title="Yfirfara">y</th>
          <th class="sz">Stærð</th><th class="cc" title="Hleðsla">h</th><th class="cc" title="Yfirfara">y</th>
        </tr>
      </thead>`;
  }

  function formRowHTML() {
    return `
      <tr class="vd-form-row">
        <td class="stat"><span class="circle"></span></td>
        <td class="dt"><input type="date" id="vd-date" value="${todayISO()}"></td>
        <td class="fyr-cell"><input type="text" id="vd-fyrirtaeki" placeholder="Fyrirtæki..."></td>
        <td class="ath-cell"><textarea id="vd-athugasemdir" placeholder="Athugasemdir, kt, sími, ATH... (Cmd/Ctrl+Enter til að skrá)" rows="2"></textarea></td>
        <td class="sz"><input type="text" id="vd-duft-size" placeholder="5kg"></td>
        <td class="cc"><input type="checkbox" id="vd-duft-h"></td>
        <td class="cc"><input type="checkbox" id="vd-duft-y"></td>
        <td class="sz"><input type="text" id="vd-lettvatn-size" placeholder="6L"></td>
        <td class="cc"><input type="checkbox" id="vd-lettvatn-h"></td>
        <td class="cc"><input type="checkbox" id="vd-lettvatn-y"></td>
        <td class="sz"><input type="text" id="vd-kolsyra-size" placeholder="5kg"></td>
        <td class="cc"><input type="checkbox" id="vd-kolsyra-h"></td>
        <td class="cc"><input type="checkbox" id="vd-kolsyra-y"></td>
        <td class="skra-cell"><button id="vd-save-btn">+ Skrá</button></td>
      </tr>`;
  }

  function entryRowHTML(e, isArchived) {
    const cls = ['vd-row'];
    if (e.done && !isArchived) cls.push('done');
    if (isArchived) cls.push('archived');
    const X = '<span class="vd-x">✕</span>';
    return `
      <tr class="${cls.join(' ')}" data-id="${esc(e.id)}">
        <td class="stat">${isArchived
          ? '<span style="color:#94a3b8;font-size:14px;">✓</span>'
          : `<input type="checkbox" class="vd-done-cb" data-id="${esc(e.id)}" ${e.done?'checked':''}>`}</td>
        <td class="dt">${esc(fmtDateTbl(e.job_date))}</td>
        <td class="fyr-cell">${esc(e.fyrirtaeki || '')}</td>
        <td class="ath-cell">${esc(e.athugasemdir || '')}</td>
        <td class="sz">${esc(e.duft_size || '')}</td>
        <td class="cc">${e.duft_h ? X : ''}</td>
        <td class="cc">${e.duft_y ? X : ''}</td>
        <td class="sz">${esc(e.lettvatn_size || '')}</td>
        <td class="cc">${e.lettvatn_h ? X : ''}</td>
        <td class="cc">${e.lettvatn_y ? X : ''}</td>
        <td class="sz">${esc(e.kolsyra_size || '')}</td>
        <td class="cc">${e.kolsyra_h ? X : ''}</td>
        <td class="cc">${e.kolsyra_y ? X : ''}</td>
        <td class="act">
          ${!isArchived ? `
            <button class="vd-edit" data-id="${esc(e.id)}" title="Breyta">✏️</button>
            <button class="primary vd-archive" data-id="${esc(e.id)}" title="Frágengið">✓</button>
            <button class="danger vd-del" data-id="${esc(e.id)}" title="Eyða">🗑️</button>
          ` : `
            <button class="vd-unarchive" data-id="${esc(e.id)}" title="Endurvirkja">↩</button>
            <button class="danger vd-del" data-id="${esc(e.id)}" title="Eyða">🗑️</button>
          `}
        </td>
      </tr>`;
  }

  function setupNotInstalledHTML() {
    return `
      <div style="background:#fffbeb;border:1px solid #fcd34d;border-radius:12px;padding:20px;">
        <div style="font-size:15px;font-weight:600;color:#92400e;margin-bottom:8px;">⚠️ Verkdagbók er ekki sett upp</div>
        <div style="font-size:14px;color:#475569;line-height:1.5;margin-bottom:12px;">Þú þarft að keyra SQL-skipun í Supabase til að búa til <code>verkdagbok</code> töfluna.</div>
        <button class="vd-skra-btn" id="vd-retry" style="background:#475569;">Reyna aftur</button>
      </div>`;
  }

  function toolbarHTML(activeCount, doneTodayCount, archivedCount) {
    return `
      <div class="vd-toolbar">
        <div class="vd-search">
          <span class="vd-search-icon">🔍</span>
          <input type="text" id="vd-search" placeholder="Leita í færslum..." value="${esc(searchQuery)}" autocomplete="off">
          ${searchQuery ? '<button class="vd-search-clear" id="vd-search-clear" title="Hreinsa">✕</button>' : ''}
        </div>
        <div class="vd-stats">
          <div class="vd-stat active"><strong>${activeCount}</strong> virk</div>
          <div class="vd-stat done"><strong>${doneTodayCount}</strong> í dag</div>
          <div class="vd-stat"><strong>${archivedCount}</strong> frágengin</div>
        </div>
      </div>`;
  }

  function render() {
    const m = ensureMain();
    if (!m) return;
    if (isLoading && !entries.length && !tableMissing) {
      m.innerHTML = '<div style="padding:40px;text-align:center;color:#94a3b8;">Hleður…</div>';
      return;
    }
    injectStyles();

    const headerHTML = `
      <div class="vd-header">
        <h1>📔 Verkdagbók</h1>
        <div class="sub">Verkefni, athugasemdir og þjónusta sem bíður</div>
      </div>`;

    if (tableMissing) {
      m.innerHTML = '<div class="vd-wrap">' + headerHTML + setupNotInstalledHTML() + '</div>';
      m.querySelector('#vd-retry')?.addEventListener('click', refresh);
      return;
    }

    const allActive = entries.filter(e => !e.archived);
    const allArchived = entries.filter(e => e.archived);
    const today = todayISO();
    const doneToday = entries.filter(e => e.done && e.job_date === today && !e.archived).length;

    const filteredActive = searchQuery ? allActive.filter(e => matchesSearch(e, searchQuery)) : allActive;
    const filteredArchived = searchQuery ? allArchived.filter(e => matchesSearch(e, searchQuery)) : allArchived;

    const desktop = isDesktop();
    const groups = groupByDate(filteredActive);

    let activeHTML;
    if (filteredActive.length === 0) {
      activeHTML = `<div class="vd-empty">${searchQuery ? 'Engin færsla passar við leitina.' : 'Engin virk verkefni — skráðu nýtt að ofan'}</div>`;
    } else if (desktop) {
      // Desktop: each date group becomes its own table
      activeHTML = groups.map(g => `
        <div class="vd-date-group">
          <div class="vd-section">
            <span class="date-bucket">${esc(g.label)}</span>
            <span class="count-pill">${g.items.length}</span>
          </div>
          <div class="vd-tbl-wrap"><table class="vd-tbl">${tableHead()}<tbody>${g.items.map(e => entryRowHTML(e, false)).join('')}</tbody></table></div>
        </div>`).join('');
    } else {
      activeHTML = groups.map(g => `
        <div class="vd-date-group">
          <div class="vd-section">
            <span class="date-bucket">${esc(g.label)}</span>
            <span class="count-pill">${g.items.length}</span>
          </div>
          ${g.items.map(e => entryCardHTML(e, false)).join('')}
        </div>`).join('');
    }

    let archivedHTML = '';
    if (filteredArchived.length > 0) {
      const expanded = archivedExpanded || !!searchQuery;
      const inner = desktop
        ? `<div class="vd-tbl-wrap" style="opacity:0.75;"><table class="vd-tbl">${tableHead()}<tbody>${filteredArchived.map(e => entryRowHTML(e, true)).join('')}</tbody></table></div>`
        : filteredArchived.map(e => entryCardHTML(e, true)).join('');
      archivedHTML = `
        <div class="vd-section archived ${expanded ? 'expanded' : ''}" id="vd-archived-toggle">
          <span class="vd-chev">▶</span>
          <span>Frágengið</span>
          <span class="count-pill">${filteredArchived.length}</span>
        </div>
        <div class="vd-archived-block ${expanded ? '' : 'collapsed'}" id="vd-archived-block">${inner}</div>`;
    }

    let formHTML;
    if (desktop) {
      formHTML = `
        <div class="vd-section">Ný færsla</div>
        <div class="vd-tbl-wrap"><table class="vd-tbl">${tableHead()}<tbody>${formRowHTML()}</tbody></table></div>`;
    } else {
      formHTML = `
        <div class="vd-section">Ný færsla</div>
        ${formCardHTML()}`;
    }

    m.innerHTML = `
      <div class="vd-wrap">
        ${headerHTML}
        ${toolbarHTML(allActive.length, doneToday, allArchived.length)}
        ${formHTML}
        <div class="vd-section">${searchQuery ? 'Leitarniðurstöður · virk' : 'Virk verkefni'}</div>
        ${activeHTML}
        ${archivedHTML}
      </div>
    `;

    // wire up
    m.querySelector('#vd-save-btn')?.addEventListener('click', saveNew);
    m.querySelectorAll('.vd-done-cb').forEach(cb => cb.addEventListener('change', () => toggleDone(cb.dataset.id, cb.checked)));
    m.querySelectorAll('.vd-edit').forEach(b => b.addEventListener('click', () => openEdit(b.dataset.id)));
    m.querySelectorAll('.vd-del').forEach(b => b.addEventListener('click', () => deleteEntry(b.dataset.id)));
    m.querySelectorAll('.vd-archive').forEach(b => b.addEventListener('click', () => archiveEntry(b.dataset.id, true)));
    m.querySelectorAll('.vd-unarchive').forEach(b => b.addEventListener('click', () => archiveEntry(b.dataset.id, false)));

    // search
    const searchInput = m.querySelector('#vd-search');
    if (searchInput) {
      let debounce = null;
      searchInput.addEventListener('input', () => {
        clearTimeout(debounce);
        debounce = setTimeout(() => {
          searchQuery = searchInput.value.trim();
          render();
          // re-focus
          const newInput = ensureMain()?.querySelector('#vd-search');
          if (newInput) {
            newInput.focus();
            const v = newInput.value;
            newInput.setSelectionRange(v.length, v.length);
          }
        }, 200);
      });
    }
    m.querySelector('#vd-search-clear')?.addEventListener('click', () => {
      searchQuery = '';
      render();
      ensureMain()?.querySelector('#vd-search')?.focus();
    });

    // archived toggle
    m.querySelector('#vd-archived-toggle')?.addEventListener('click', () => {
      archivedExpanded = !archivedExpanded;
      const sec = m.querySelector('#vd-archived-toggle');
      const block = m.querySelector('#vd-archived-block');
      if (sec) sec.classList.toggle('expanded', archivedExpanded);
      if (block) block.classList.toggle('collapsed', !archivedExpanded);
    });

    // textarea autoresize
    const ath = m.querySelector('#vd-athugasemdir');
    if (ath) {
      const resize = () => { ath.style.height = 'auto'; ath.style.height = Math.max(46, ath.scrollHeight) + 'px'; };
      ath.addEventListener('input', resize);
      resize();
    }

    // keyboard: Cmd/Ctrl+Enter to save from any form input
    const formInputs = m.querySelectorAll('.vd-form-row input, .vd-form-row textarea, .vd-form-card input, .vd-form-card textarea');
    formInputs.forEach(el => {
      el.addEventListener('keydown', (ev) => {
        if ((ev.metaKey || ev.ctrlKey) && ev.key === 'Enter') {
          ev.preventDefault();
          saveNew();
        }
      });
    });
  }

  function readForm(scope, prefix) {
    const $ = id => scope.querySelector('#' + prefix + id);
    return {
      job_date: $('-date')?.value || todayISO(),
      fyrirtaeki: $('-fyrirtaeki')?.value.trim() || null,
      athugasemdir: $('-athugasemdir')?.value.trim() || null,
      duft_size: $('-duft-size')?.value.trim() || null,
      duft_h: !!$('-duft-h')?.checked,
      duft_y: !!$('-duft-y')?.checked,
      lettvatn_size: $('-lettvatn-size')?.value.trim() || null,
      lettvatn_h: !!$('-lettvatn-h')?.checked,
      lettvatn_y: !!$('-lettvatn-y')?.checked,
      kolsyra_size: $('-kolsyra-size')?.value.trim() || null,
      kolsyra_h: !!$('-kolsyra-h')?.checked,
      kolsyra_y: !!$('-kolsyra-y')?.checked
    };
  }

  async function saveNew() {
    const m = ensureMain();
    const form = readForm(m, 'vd');
    if (!form.fyrirtaeki && !form.athugasemdir) {
      alert('Sláðu inn fyrirtæki eða athugasemd áður en þú skráir.');
      return;
    }
    form.done = false; form.archived = false;
    try {
      const { error } = await SB.from('verkdagbok').insert(form);
      if (error) throw error;
      await load(); render();
    } catch (e) { alert('Villa við vistun: ' + e.message); }
  }

  async function toggleDone(id, done) {
    try {
      const { error } = await SB.from('verkdagbok').update({ done }).eq('id', id);
      if (error) throw error;
      const entry = entries.find(x => String(x.id) === String(id));
      if (entry) entry.done = done;
      render();
    } catch (e) { alert('Villa: ' + e.message); }
  }

  async function archiveEntry(id, archived) {
    try {
      const upd = { archived, archived_at: archived ? new Date().toISOString() : null };
      const { error } = await SB.from('verkdagbok').update(upd).eq('id', id);
      if (error) throw error;
      await load(); render();
    } catch (e) { alert('Villa: ' + e.message); }
  }

  async function deleteEntry(id) {
    const e = entries.find(x => String(x.id) === String(id));
    if (!confirm('Eyða þessari færslu varanlega?\n\n' + (e?.athugasemdir?.slice(0,80) || e?.fyrirtaeki || '(ónefnd)'))) return;
    try {
      const { error } = await SB.from('verkdagbok').delete().eq('id', id);
      if (error) throw error;
      await load(); render();
    } catch (e) { alert('Villa: ' + e.message); }
  }

  function openEdit(id) {
    const entry = entries.find(x => String(x.id) === String(id));
    if (!entry) return;
    const existing = document.getElementById('vd-edit-modal');
    if (existing) existing.remove();
    const html = `
      <div id="vd-edit-modal" class="modal" style="display:flex;position:fixed;inset:0;z-index:9999;background:rgba(15,23,42,0.5);align-items:flex-start;justify-content:center;padding:16px;overflow-y:auto;">
        <div class="vd-form-card" style="max-width:600px;width:100%;margin-top:30px;">
          <h3 style="margin:0 0 16px 0;font-size:17px;color:#0f172a;">Breyta færslu</h3>
          <div class="vd-meta-row">
            <div><label class="lbl">Dags</label><input type="date" id="ve-date" value="${esc(entry.job_date || todayISO())}"></div>
            <div><label class="lbl">Fyrirtæki</label><input type="text" id="ve-fyrirtaeki" value="${esc(entry.fyrirtaeki || '')}"></div>
          </div>
          <div><label class="lbl">Athugasemdir / verklýsing</label><textarea id="ve-athugasemdir" style="min-height:120px;font-size:15px;line-height:1.5;">${esc(entry.athugasemdir || '')}</textarea></div>
          <div class="vd-eq-block">
            <div class="vd-eq-head"><div>Tæki</div><div></div><div class="h">h</div><div class="y">y</div></div>
            <div class="vd-eq-row"><div class="lbl-cell">🧯 Duft</div><input type="text" id="ve-duft-size" value="${esc(entry.duft_size || '')}">
              <div class="cb-cell"><input type="checkbox" id="ve-duft-h" ${entry.duft_h?'checked':''}></div>
              <div class="cb-cell"><input type="checkbox" id="ve-duft-y" ${entry.duft_y?'checked':''}></div></div>
            <div class="vd-eq-row"><div class="lbl-cell">🚒 Léttvatn</div><input type="text" id="ve-lettvatn-size" value="${esc(entry.lettvatn_size || '')}">
              <div class="cb-cell"><input type="checkbox" id="ve-lettvatn-h" ${entry.lettvatn_h?'checked':''}></div>
              <div class="cb-cell"><input type="checkbox" id="ve-lettvatn-y" ${entry.lettvatn_y?'checked':''}></div></div>
            <div class="vd-eq-row"><div class="lbl-cell">☁️ Kolsýra</div><input type="text" id="ve-kolsyra-size" value="${esc(entry.kolsyra_size || '')}">
              <div class="cb-cell"><input type="checkbox" id="ve-kolsyra-h" ${entry.kolsyra_h?'checked':''}></div>
              <div class="cb-cell"><input type="checkbox" id="ve-kolsyra-y" ${entry.kolsyra_y?'checked':''}></div></div>
          </div>
          <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:18px;">
            <button id="ve-cancel" style="padding:9px 16px;background:#fff;border:1px solid #e2e8f0;border-radius:8px;font-size:14px;cursor:pointer;color:#334155;">Hætta við</button>
            <button class="vd-skra-btn" id="ve-save">Vista</button>
          </div>
        </div>
      </div>`;
    document.body.insertAdjacentHTML('beforeend', html);
    const modal = document.getElementById('vd-edit-modal');
    const close = () => modal.remove();
    modal.querySelector('#ve-cancel').addEventListener('click', close);
    modal.addEventListener('click', ev => { if (ev.target === modal) close(); });
    const saveFn = async () => {
      const upd = readForm(modal, 've');
      try {
        const { error } = await SB.from('verkdagbok').update(upd).eq('id', entry.id);
        if (error) throw error;
        close(); await load(); render();
      } catch (er) { alert('Villa við vistun: ' + er.message); }
    };
    modal.querySelector('#ve-save').addEventListener('click', saveFn);
    modal.querySelectorAll('input, textarea').forEach(el => {
      el.addEventListener('keydown', (ev) => {
        if ((ev.metaKey || ev.ctrlKey) && ev.key === 'Enter') { ev.preventDefault(); saveFn(); }
        if (ev.key === 'Escape') { close(); }
      });
    });
    // autoresize edit textarea
    const ath = modal.querySelector('#ve-athugasemdir');
    if (ath) {
      const resize = () => { ath.style.height = 'auto'; ath.style.height = Math.max(120, ath.scrollHeight) + 'px'; };
      ath.addEventListener('input', resize);
      setTimeout(resize, 0);
    }
  }

  async function refresh() {
    const m = ensureMain();
    if (m && !entries.length && !tableMissing) m.innerHTML = '<div style="padding:40px;text-align:center;color:#94a3b8;">Hleður…</div>';
    try { await load(); render(); }
    catch (e) {
      const m2 = ensureMain();
      if (m2) m2.innerHTML = '<div style="padding:40px;text-align:center;color:#dc2626;">Villa: ' + esc(e.message) + '</div>';
      console.error('[Verkdagbok]', e);
    }
  }

  function showVerkdagbokView() {
    document.querySelectorAll('.view.active').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.vnav-btn.active').forEach(b => b.classList.remove('active'));
    const v = document.getElementById('view-verkdagbok');
    const b = document.querySelector('.vnav-btn[data-view="verkdagbok"]');
    if (v) v.classList.add('active');
    if (b) b.classList.add('active');
    refresh();
    document.querySelectorAll('.vnav, [class*="drawer"], [class*="menu-open"]').forEach(el => {
      el.classList.remove('open', 'active', 'menu-open');
    });
  }

  // Re-render on viewport change between mobile/desktop
  let lastWasDesktop = isDesktop();
  let resizeTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      const nowDesktop = isDesktop();
      const view = document.getElementById('view-verkdagbok');
      if (nowDesktop !== lastWasDesktop && view && view.classList.contains('active')) {
        lastWasDesktop = nowDesktop;
        render();
      } else {
        lastWasDesktop = nowDesktop;
      }
    }, 200);
  });

  function init() { ensureNavButton(); ensureViewContainer(); }
  init();
  setTimeout(init, 100);
  setTimeout(init, 500);
  setTimeout(init, 1500);

  const interceptor = (e) => {
    const target = e.target.closest && e.target.closest('.vnav-btn[data-view="verkdagbok"]');
    if (!target) return;
    e.stopImmediatePropagation();
    e.preventDefault();
    showVerkdagbokView();
  };
  window.addEventListener('click', interceptor, true);
  document.addEventListener('click', interceptor, true);

  window.Verkdagbok = { load, render, refresh, list: entries, version: 'v5' };
  window.__VerkdagbokInstalled = true;
})();
/* === END VERKDAGBOK === */

/* === MAPFIX ORANGE REMOVER v1 === */
/* Removes the older/stale orange (#f97316) dots from the Þjónustutæki map.
   Preserves all other markers: blue car (#4C7BE1), yellow (#FFD500/#E0BC00),
   green OK (#16a34a), red overdue (#dc2626), and any leaflet-marker-pane pins. */
(() => {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (window.__mapfixOrangeInstalled) return;
  window.__mapfixOrangeInstalled = true;

  // 1. CSS: hide orange paths inside the field map's overlay-pane SVG.
  const STYLE_ID = 'mapfix-orange-style';
  if (!document.getElementById(STYLE_ID)) {
    const s = document.createElement('style');
    s.id = STYLE_ID;
    s.textContent = [
      '#field-map-container svg path[fill="#f97316"]',
      '#field-map-container svg path[fill="#F97316"]',
      '#field-map-container .leaflet-overlay-pane path[fill="#f97316"]',
      '#field-map-container .leaflet-overlay-pane path[fill="#F97316"]',
      '{ display: none !important; pointer-events: none !important; opacity: 0 !important; }'
    ].join(',\n').replace(/\{/, ' {');
    document.head.appendChild(s);
  }

  // 2. Active removal: walk the map and detach any matching paths now.
  const removeOrange = (root) => {
    if (!root || !root.querySelectorAll) return 0;
    let n = 0;
    const paths = root.querySelectorAll('svg path[fill="#f97316"], svg path[fill="#F97316"]');
    for (const p of paths) {
      try { p.parentNode?.removeChild(p); n++; } catch (e) {}
    }
    return n;
  };

  // 3. MutationObserver: catch any orange dots Leaflet adds later (zoom, pan, refresh).
  let observer = null;
  const watch = () => {
    const map = document.getElementById('field-map-container');
    if (!map || observer) return;
    removeOrange(map);
    observer = new MutationObserver((muts) => {
      // Throttle: only run once per tick
      let needsRun = false;
      for (const m of muts) {
        if (m.type === 'childList' && m.addedNodes.length) { needsRun = true; break; }
        if (m.type === 'attributes' && m.target?.tagName === 'path' && m.attributeName === 'fill') { needsRun = true; break; }
      }
      if (needsRun) removeOrange(map);
    });
    observer.observe(map, { childList: true, subtree: true, attributes: true, attributeFilter: ['fill'] });
  };

  // Try now and at intervals (the field view may load later)
  watch();
  setTimeout(watch, 500);
  setTimeout(watch, 1500);
  setTimeout(watch, 3000);

  // Also re-run when the user navigates to the field view
  const navHandler = () => {
    setTimeout(() => {
      watch();
      const map = document.getElementById('field-map-container');
      if (map) removeOrange(map);
    }, 300);
  };
  document.addEventListener('click', (e) => {
    const btn = e.target.closest && e.target.closest('.vnav-btn[data-view="field"], .vnav-btn');
    if (btn && /þjónust|þjonust|field/i.test(btn.textContent || btn.dataset.view || '')) {
      navHandler();
    }
  }, true);

  window.MapfixOrange = { remove: () => removeOrange(document.getElementById('field-map-container')), version: 'v1' };
})();
/* === END MAPFIX ORANGE REMOVER === */

/* === POS FIXES v4 === */
/* (1) Hide Gæðakerfi/Staðfesta block on Afgreiðsla view.
   (2) Auto-search on the Sala kennitala (#pos-kt) and name (#pos-nafn) inputs.
   (3) Custom sort for Áfylling cards in Sala #pos-services list:
       2kg ABC → 6kg ABC → 12kg ABC → 2kg CO₂ → 5kg CO₂ → Léttvatnstækis 6kg
       (other Áfylling and non-Áfylling services keep their original order).
   (4) Remove the 5 floating .sm-toolbtn buttons.
   (5) Hide the old .company-grid card layout at the bottom of Viðskiptavinir (Gömul tæki, Til reiknings,
       Afgreiðsla, Móttekið í dag, Móttaka tækis) entirely. */
(() => {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (window.__posFixesInstalled) return;
  window.__posFixesInstalled = true;

  // ---------- Styles ----------
  const STYLE_ID = 'pos-fixes-style';
  if (!document.getElementById(STYLE_ID)) {
    const s = document.createElement('style');
    s.id = STYLE_ID;
    s.textContent = `
      /* (1) hide Gæðakerfi/Staðfesta zone + old Viðskiptavinir card grid */
      ._gk_sig_zone { display: none !important; }
      #view-vidskiptavinir .company-grid { display: none !important; }
      /* (4) remove the 5 floating tool buttons */
      .sm-toolbtn { display: none !important; }
      body.has-mobnav { padding-bottom: 0 !important; }

      #pos-kt-suggestions {
        position: absolute; z-index: 9999;
        background: #fff; border: 1px solid #cbd5e1;
        border-radius: 8px;
        box-shadow: 0 6px 20px rgba(15,23,42,0.12);
        max-height: 320px; overflow-y: auto;
        min-width: 280px; max-width: 420px;
        font-size: 13px; padding: 4px 0;
      }
      #pos-kt-suggestions .pos-sug-item {
        padding: 8px 12px; cursor: pointer;
        border-bottom: 1px solid #f1f5f9;
        transition: background .1s;
      }
      #pos-kt-suggestions .pos-sug-item:last-child { border-bottom: none; }
      #pos-kt-suggestions .pos-sug-item:hover,
      #pos-kt-suggestions .pos-sug-item.active { background: #eff6ff; }
      #pos-kt-suggestions .pos-sug-name {
        font-weight: 600; color: #0f172a; line-height: 1.3;
      }
      #pos-kt-suggestions .pos-sug-meta {
        color: #64748b; font-size: 12px; margin-top: 2px;
      }
      #pos-kt-suggestions .pos-sug-empty {
        padding: 12px; color: #94a3b8; font-style: italic; text-align: center;
      }
    `;
    document.head.appendChild(s);
  }

  // ---------- (4) Active removal of .sm-toolbtn nodes ----------
  function removeToolButtons() {
    const btns = document.querySelectorAll('.sm-toolbtn');
    let n = 0;
    for (const b of btns) {
      try { b.parentNode?.removeChild(b); n++; } catch (e) {}
    }
    return n;
  }

  // ---------- (2) Auto-search ----------
  function getSB() {
    if (!window.supabase || !window.SUPABASE_URL || !window.SUPABASE_KEY) return null;
    if (!window.__posFixesSB) {
      window.__posFixesSB = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_KEY);
    }
    return window.__posFixesSB;
  }
  function removeBox() { document.getElementById('pos-kt-suggestions')?.remove(); }
  function fillFromMatch(m) {
    const ktInput = document.getElementById('pos-kt');
    const nafnInput = document.getElementById('pos-nafn');
    const simiInput = document.getElementById('pos-simi');
    if (ktInput && m.kennitala) ktInput.value = m.kennitala;
    if (nafnInput && m.nafn) nafnInput.value = m.nafn;
    if (simiInput && m.simi) simiInput.value = m.simi;
    [ktInput, nafnInput, simiInput].forEach(el => {
      if (!el) return;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    });
    removeBox();
  }
  function showBox(matches, anchorEl) {
    removeBox();
    if (!anchorEl) return;
    const box = document.createElement('div');
    box.id = 'pos-kt-suggestions';
    if (matches.length === 0) {
      const e = document.createElement('div');
      e.className = 'pos-sug-empty';
      e.textContent = 'Engin samsvörun';
      box.appendChild(e);
    } else {
      for (const m of matches) {
        const item = document.createElement('div');
        item.className = 'pos-sug-item';
        const name = document.createElement('div');
        name.className = 'pos-sug-name';
        name.textContent = m.nafn || '(ónefnt)';
        const meta = document.createElement('div');
        meta.className = 'pos-sug-meta';
        const parts = [];
        if (m.kennitala) parts.push(m.kennitala);
        if (m.simi) parts.push('📞 ' + m.simi);
        meta.textContent = parts.join(' · ');
        item.appendChild(name);
        item.appendChild(meta);
        item.addEventListener('mousedown', (e) => { e.preventDefault(); fillFromMatch(m); });
        box.appendChild(item);
      }
    }
    const r = anchorEl.getBoundingClientRect();
    box.style.left = (r.left + window.scrollX) + 'px';
    box.style.top = (r.bottom + window.scrollY + 4) + 'px';
    box.style.minWidth = Math.max(280, r.width) + 'px';
    document.body.appendChild(box);
  }
  let timer = null;
  let activeRequest = 0;
  function debouncedSearch(field, value, anchorEl) {
    clearTimeout(timer);
    const v = (value || '').trim();
    if (v.length < 2) { removeBox(); return; }
    timer = setTimeout(async () => {
      const SB = getSB();
      if (!SB) return;
      const reqId = ++activeRequest;
      try {
        let q;
        if (field === 'kt') {
          const digits = v.replace(/\D/g, '');
          if (digits.length < 2) { removeBox(); return; }
          q = SB.from('vidskiptavinir')
            .select('kennitala, nafn, simi')
            .or('kennitala.ilike.' + digits + '%,kennitala.ilike.' + digits.slice(0,6) + '-' + digits.slice(6) + '%')
            .limit(8);
        } else {
          q = SB.from('vidskiptavinir')
            .select('kennitala, nafn, simi')
            .ilike('nafn', '%' + v + '%')
            .limit(8);
        }
        const { data, error } = await q;
        if (reqId !== activeRequest) return;
        if (error) return;
        showBox(data || [], anchorEl);
      } catch (e) {}
    }, 180);
  }
  const BOUND = '__posFixesBound';
  function bindInputs() {
    const ktInput = document.getElementById('pos-kt');
    const nafnInput = document.getElementById('pos-nafn');
    if (ktInput && !ktInput[BOUND]) {
      ktInput[BOUND] = true;
      ktInput.setAttribute('autocomplete', 'off');
      ktInput.addEventListener('input', () => debouncedSearch('kt', ktInput.value, ktInput));
      ktInput.addEventListener('focus', () => {
        if (ktInput.value.trim().length >= 2) debouncedSearch('kt', ktInput.value, ktInput);
      });
      ktInput.addEventListener('blur', () => setTimeout(removeBox, 180));
      ktInput.addEventListener('keydown', (e) => { if (e.key === 'Escape') removeBox(); });
    }
    if (nafnInput && !nafnInput[BOUND]) {
      nafnInput[BOUND] = true;
      nafnInput.setAttribute('autocomplete', 'off');
      nafnInput.addEventListener('input', () => debouncedSearch('nafn', nafnInput.value, nafnInput));
      nafnInput.addEventListener('focus', () => {
        if (nafnInput.value.trim().length >= 2) debouncedSearch('nafn', nafnInput.value, nafnInput);
      });
      nafnInput.addEventListener('blur', () => setTimeout(removeBox, 180));
      nafnInput.addEventListener('keydown', (e) => { if (e.key === 'Escape') removeBox(); });
    }
  }

  // ---------- (3) Custom sort for Áfylling cards ----------
  function rankOf(text) {
    const t = (text || '').replace(/\s+/g, ' ');
    if (/Áfylling\s*2\s*kg\s*ABC/i.test(t)) return 1;
    if (/Áfylling\s*6\s*kg\s*ABC/i.test(t)) return 2;
    if (/Áfylling\s*12\s*kg\s*ABC/i.test(t)) return 3;
    if (/Áfylling\s*2\s*kg\s*CO/i.test(t)) return 4;
    if (/Áfylling\s*5\s*kg\s*CO/i.test(t)) return 5;
    if (/Áfylling\s*Léttvatns/i.test(t)) return 6;
    return null;
  }
  let isReordering = false;
  function reorderServices() {
    if (isReordering) return;
    const container = document.getElementById('pos-services');
    if (!container) return;
    const kids = Array.from(container.children);
    if (kids.length < 2) return;
    const decorated = kids.map((el, i) => {
      const r = rankOf(el.textContent);
      return { el, rank: r != null ? r : (100 + i), orig: i };
    });
    const target = decorated.slice().sort((a, b) => a.rank - b.rank || a.orig - b.orig);
    let already = true;
    for (let i = 0; i < target.length; i++) {
      if (target[i].el !== kids[i]) { already = false; break; }
    }
    if (already) return;
    isReordering = true;
    try {
      const frag = document.createDocumentFragment();
      for (const d of target) frag.appendChild(d.el);
      container.appendChild(frag);
    } finally {
      setTimeout(() => { isReordering = false; }, 0);
    }
  }

  // ---------- Init + watchers ----------
  function tick() {
    removeToolButtons();
    bindInputs();
    reorderServices();
  }
  tick();
  setTimeout(tick, 300);
  setTimeout(tick, 1000);
  setTimeout(tick, 2500);

  // Watch for late-rendered nodes
  const obs = new MutationObserver((muts) => {
    let needRemove = false;
    let touchedServices = false;
    for (const m of muts) {
      if (m.type === 'childList') {
        for (const n of m.addedNodes) {
          if (n.nodeType !== 1) continue;
          if (n.classList?.contains('sm-toolbtn')) { needRemove = true; }
          if (n.querySelector?.('.sm-toolbtn')) { needRemove = true; }
          if (n.id === 'pos-services' || n.querySelector?.('#pos-services')) { touchedServices = true; }
        }
      }
      if (m.target.id === 'pos-services' || m.target.closest?.('#pos-services')) { touchedServices = true; }
    }
    if (needRemove) removeToolButtons();
    bindInputs();
    if (touchedServices) reorderServices();
  });
  obs.observe(document.body, { childList: true, subtree: true });

  document.addEventListener('click', (e) => {
    if (e.target.id === 'pos-kt' || e.target.id === 'pos-nafn') return;
    if (e.target.closest('#pos-kt-suggestions')) return;
    removeBox();
  });

  window.PosFixes = {
    rebind: bindInputs,
    reorder: reorderServices,
    removeButtons: removeToolButtons,
    version: 'v4'
  };
})();
/* === END POS FIXES === */

/* === SALA CHECKOUT DIALOG v1 === */
/* Intercepts the GREIÐA button on Sala. Shows a modal with:
   - Payment method (Greitt með korti / Greitt með pening)
   - Optional: Prenta kvittun (receipt)
   - Optional: Prenta strikamerki fyrir tæki (barcode labels for the items)
   On confirm: optionally prints, then continues to the original sale flow.
   Cart lines starting with 🛒 = physical product (gets a barcode label).
   Cart lines starting with 🔧 = service (no label needed). */
(() => {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (window.__salaCheckoutInstalled) return;
  window.__salaCheckoutInstalled = true;

  const STYLE_ID = 'sala-checkout-style';
  const MODAL_ID = 'sala-pay-modal';

  // --- styles ---
  if (!document.getElementById(STYLE_ID)) {
    const s = document.createElement('style');
    s.id = STYLE_ID;
    s.textContent = `
      #${MODAL_ID} {
        position: fixed; inset: 0; z-index: 100000;
        display: flex; align-items: center; justify-content: center;
        font-family: inherit;
      }
      #${MODAL_ID} .scd-back {
        position: absolute; inset: 0; background: rgba(15,23,42,0.55);
      }
      #${MODAL_ID} .scd-card {
        position: relative; background: #fff; border-radius: 14px;
        box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        max-width: 460px; width: calc(100% - 32px);
        max-height: calc(100vh - 32px); overflow-y: auto;
      }
      #${MODAL_ID} .scd-head {
        display: flex; justify-content: space-between; align-items: center;
        padding: 16px 20px 12px; border-bottom: 1px solid #e2e8f0;
      }
      #${MODAL_ID} .scd-head h3 {
        margin: 0; font-size: 18px; color: #0f172a; font-weight: 600;
      }
      #${MODAL_ID} .scd-x {
        background: none; border: none; font-size: 24px; line-height: 1;
        color: #94a3b8; cursor: pointer; padding: 4px 8px; border-radius: 6px;
      }
      #${MODAL_ID} .scd-x:hover { background: #f1f5f9; color: #475569; }
      #${MODAL_ID} .scd-body { padding: 16px 20px; }
      #${MODAL_ID} .scd-amount {
        text-align: center; font-size: 32px; font-weight: 700; color: #0f172a;
        padding: 8px 0 20px; letter-spacing: -0.02em;
      }
      #${MODAL_ID} .scd-section { margin-bottom: 18px; }
      #${MODAL_ID} .scd-section:last-child { margin-bottom: 0; }
      #${MODAL_ID} .scd-section-title {
        font-size: 11px; font-weight: 600; color: #64748b;
        text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px;
      }
      #${MODAL_ID} .scd-methods {
        display: grid; grid-template-columns: 1fr 1fr; gap: 10px;
      }
      #${MODAL_ID} .scd-method {
        display: flex; flex-direction: column; align-items: center;
        gap: 6px; padding: 16px 10px;
        background: #f8fafc; border: 2px solid #e2e8f0;
        border-radius: 10px; cursor: pointer;
        font-family: inherit; font-size: 14px; font-weight: 600; color: #0f172a;
        transition: all .15s ease;
      }
      #${MODAL_ID} .scd-method:hover {
        background: #eff6ff; border-color: #3b82f6; transform: translateY(-1px);
      }
      #${MODAL_ID} .scd-method:active { transform: translateY(0); }
      #${MODAL_ID} .scd-method[data-method="kort"]:hover { border-color: #2563eb; }
      #${MODAL_ID} .scd-method[data-method="pening"]:hover { border-color: #16a34a; background: #f0fdf4; }
      #${MODAL_ID} .scd-icon { font-size: 28px; line-height: 1; }
      #${MODAL_ID} .scd-check {
        display: flex; align-items: center; gap: 10px;
        padding: 10px 12px; background: #f8fafc; border: 1px solid #e2e8f0;
        border-radius: 8px; cursor: pointer; font-size: 14px; color: #0f172a;
        margin-bottom: 6px; user-select: none; transition: background .15s;
      }
      #${MODAL_ID} .scd-check:hover { background: #eff6ff; }
      #${MODAL_ID} .scd-check input { width: 18px; height: 18px; cursor: pointer; margin: 0; }
      #${MODAL_ID} .scd-check.disabled { opacity: 0.5; cursor: not-allowed; }
      #${MODAL_ID} .scd-cart {
        background: #f8fafc; border-radius: 8px; padding: 10px 12px;
        font-size: 12px; color: #475569; max-height: 140px; overflow-y: auto;
      }
      #${MODAL_ID} .scd-cart-line {
        display: flex; justify-content: space-between; gap: 8px;
        padding: 3px 0; border-bottom: 1px dashed #e2e8f0;
      }
      #${MODAL_ID} .scd-cart-line:last-child { border-bottom: none; }
      #${MODAL_ID} .scd-cart-line .name { color: #0f172a; }
      #${MODAL_ID} .scd-cart-line .price { font-weight: 600; white-space: nowrap; }
      #${MODAL_ID} .scd-foot {
        padding: 12px 20px 16px; border-top: 1px solid #e2e8f0;
        display: flex; justify-content: flex-end; gap: 8px;
      }
      #${MODAL_ID} .scd-cancel {
        padding: 9px 18px; background: #fff; border: 1px solid #cbd5e1;
        border-radius: 8px; cursor: pointer; font-size: 14px; color: #475569;
        font-family: inherit;
      }
      #${MODAL_ID} .scd-cancel:hover { background: #f8fafc; border-color: #94a3b8; }
    `;
    document.head.appendChild(s);
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  // --- Read cart state from DOM ---
  function readCart() {
    const lines = Array.from(document.querySelectorAll('#pos-lines > div'));
    const items = [];
    for (const line of lines) {
      const txt = (line.innerText || line.textContent || '').replace(/\s+/g, ' ').trim();
      if (!txt) continue;
      // Parse: "🔧 Áfylling 2kg ABC Duft 1 × 4.194 kr − 1 + 5.200 kr ×"
      // Or:    "🛒 Slökkvitæki 6kg ABC Duft 1 × 9.000 kr − 1 + 11.160 kr ×"
      const isProduct = /^🛒/.test(txt);
      // Strip leading emoji
      let rest = txt.replace(/^[🛒🔧]\s*/, '');
      // Get the line total (last " 1.234 kr" before the trailing × button)
      const priceMatches = rest.match(/[\d.]+ kr/g) || [];
      const total = priceMatches[priceMatches.length - 1] || '';
      // Get qty (first "X ×" pattern OR via the "+" / "−" buttons)
      const qtyM = rest.match(/[−\-]\s*(\d+)\s*\+/);
      const qty = qtyM ? parseInt(qtyM[1], 10) : 1;
      // Name = everything before the first " 1 × " or " N × "
      const nameM = rest.match(/^(.+?)\s+\d+\s*×/);
      const name = (nameM ? nameM[1] : rest).trim();
      items.push({ isProduct, name, qty, total, raw: txt });
    }
    // Total from "Samtals: ... kr"
    let grandTotal = '';
    const totalEls = Array.from(document.querySelectorAll('#view-sala span, #view-sala div'))
      .filter(el => el.children.length === 0 && /^Samtals:/.test((el.textContent || '').trim()));
    if (totalEls.length > 0) {
      const parent = totalEls[0].parentElement;
      const parentTxt = (parent?.textContent || '').replace(/\s+/g, ' ').trim();
      const m = parentTxt.match(/Samtals:\s*([\d.]+\s*kr)/);
      if (m) grandTotal = m[1];
    }
    // Customer info
    const ktInput = document.getElementById('pos-kt');
    const nafnInput = document.getElementById('pos-nafn');
    const simiInput = document.getElementById('pos-simi');
    const customer = {
      kt: ktInput?.value.trim() || '',
      nafn: nafnInput?.value.trim() || '',
      simi: simiInput?.value.trim() || ''
    };
    return { items, grandTotal, customer };
  }

  // --- Modal ---
  function close() { document.getElementById(MODAL_ID)?.remove(); }

  function showDialog(originalBtn) {
    const cart = readCart();
    if (cart.items.length === 0) {
      alert('Karfan er tóm — bættu vörum við áður en greitt er.');
      return;
    }
    const productCount = cart.items.filter(i => i.isProduct).reduce((s, i) => s + i.qty, 0);
    const hasProducts = productCount > 0;
    close();

    const modal = document.createElement('div');
    modal.id = MODAL_ID;
    modal.innerHTML = `
      <div class="scd-back"></div>
      <div class="scd-card">
        <div class="scd-head">
          <h3>💰 Greiðsla</h3>
          <button class="scd-x" type="button" aria-label="Loka">×</button>
        </div>
        <div class="scd-body">
          <div class="scd-amount">${esc(cart.grandTotal || '0 kr')}</div>
          <div class="scd-section">
            <div class="scd-section-title">Greiðslumáti</div>
            <div class="scd-methods">
              <button class="scd-method" data-method="kort" type="button">
                <span class="scd-icon">💳</span>
                <span>Greitt með korti</span>
              </button>
              <button class="scd-method" data-method="pening" type="button">
                <span class="scd-icon">💵</span>
                <span>Greitt með pening</span>
              </button>
            </div>
          </div>
          <div class="scd-section">
            <div class="scd-section-title">Prenta</div>
            <label class="scd-check">
              <input type="checkbox" id="scd-receipt" checked>
              <span>🧾 Prenta kvittun</span>
            </label>
            <label class="scd-check ${hasProducts ? '' : 'disabled'}">
              <input type="checkbox" id="scd-barcodes" ${hasProducts ? '' : 'disabled'}>
              <span>🏷️ Prenta strikamerki fyrir tæki${hasProducts ? ' (' + productCount + ')' : ' (engin tæki í körfu)'}</span>
            </label>
          </div>
          <div class="scd-section">
            <div class="scd-section-title">Karfan (${cart.items.length})</div>
            <div class="scd-cart">
              ${cart.items.map(i => `<div class="scd-cart-line"><span class="name">${esc((i.qty > 1 ? i.qty + '× ' : '') + i.name)}</span><span class="price">${esc(i.total)}</span></div>`).join('')}
            </div>
          </div>
        </div>
        <div class="scd-foot">
          <button class="scd-cancel" type="button">Hætta við</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    modal.querySelector('.scd-back').addEventListener('click', close);
    modal.querySelector('.scd-x').addEventListener('click', close);
    modal.querySelector('.scd-cancel').addEventListener('click', close);

    modal.querySelectorAll('.scd-method').forEach(btn => {
      btn.addEventListener('click', () => {
        const method = btn.dataset.method;
        const doReceipt = modal.querySelector('#scd-receipt').checked;
        const doBarcodes = modal.querySelector('#scd-barcodes').checked && hasProducts;
        proceed(originalBtn, method, doReceipt, doBarcodes, cart);
      });
    });

    document.addEventListener('keydown', function escH(e) {
      if (e.key === 'Escape') { close(); document.removeEventListener('keydown', escH); }
    });
  }

  function proceed(originalBtn, method, doReceipt, doBarcodes, cart) {
    if (doReceipt) printReceipt(cart, method);
    if (doBarcodes) printBarcodes(cart);
    close();
    // Allow the original click to go through this time
    originalBtn.dataset.scdProceed = '1';
    setTimeout(() => originalBtn.click(), 50);
  }

  // --- Print Receipt ---
  function printReceipt(cart, method) {
    const win = window.open('', 'kvittun', 'width=420,height=700');
    if (!win) { alert('Vinsamlegast leyfðu sprettiglugga til að prenta kvittun.'); return; }
    const date = new Date().toLocaleString('is-IS', { dateStyle: 'short', timeStyle: 'short' });
    const methodLabel = method === 'kort' ? '💳 Greitt með korti' : '💵 Greitt með pening';
    const cust = cart.customer;
    const custLines = [];
    if (cust.nafn) custLines.push(esc(cust.nafn));
    if (cust.kt) custLines.push('kt: ' + esc(cust.kt));
    if (cust.simi) custLines.push('s: ' + esc(cust.simi));
    const itemsHTML = cart.items.map(i => `
      <div class="row">
        <div class="r-name">${esc((i.qty > 1 ? i.qty + '× ' : '') + i.name)}</div>
        <div class="r-price">${esc(i.total)}</div>
      </div>`).join('');
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Kvittun</title>
<style>
  body { font-family: -apple-system, sans-serif; font-size: 12px; margin: 0; padding: 14px; color: #000; }
  h2 { text-align: center; margin: 0 0 4px 0; font-size: 15px; }
  .sub { text-align: center; font-size: 11px; color: #333; }
  .line { border-top: 1px dashed #999; margin: 10px 0; }
  .cust { margin: 4px 0; padding-left: 4px; font-size: 11px; }
  .row { display: flex; justify-content: space-between; gap: 8px; padding: 3px 0; font-size: 12px; }
  .r-name { flex: 1; }
  .r-price { font-weight: 600; white-space: nowrap; }
  .total { display: flex; justify-content: space-between; font-size: 15px; font-weight: 700; padding: 6px 0 4px; }
  .method { text-align: center; font-weight: 600; padding: 6px 0; background: #f0f0f0; border-radius: 4px; margin: 8px 0; }
  .footer { text-align: center; font-size: 11px; color: #666; margin-top: 10px; }
  @media print { body { padding: 4px; } }
</style></head><body>
  <h2>Slökkvitæki ehf</h2>
  <div class="sub">Slökkvitækjaþjónusta</div>
  <div class="sub">Helluhraun 10, 220 Hafnarfirði</div>
  <div class="sub">Sími: 565-4080</div>
  <div class="sub">${esc(date)}</div>
  ${custLines.length ? '<div class="line"></div><div class="cust">' + custLines.join('<br>') + '</div>' : ''}
  <div class="line"></div>
  ${itemsHTML}
  <div class="line"></div>
  <div class="total"><span>Samtals</span><span>${esc(cart.grandTotal)}</span></div>
  <div class="method">${esc(methodLabel)}</div>
  <div class="footer">Takk fyrir viðskiptin!</div>
  <script>window.onload = () => setTimeout(() => window.print(), 200);<\/script>
</body></html>`;
    win.document.write(html);
    win.document.close();
  }

  // --- Print Barcode Labels ---
  // Generates one label per unit (qty expanded). Each label has:
  // serial (date-based), product name, and a QR code rendered via api.qrserver.com.
  // Layout: stacked cards, one per page-break, sized for Brother PT-P750W tape (24mm tall).
  function printBarcodes(cart) {
    const products = [];
    let counter = 0;
    const today = new Date();
    const yymmdd = String(today.getFullYear()).slice(-2) +
                   String(today.getMonth() + 1).padStart(2, '0') +
                   String(today.getDate()).padStart(2, '0');
    for (const it of cart.items) {
      if (!it.isProduct) continue;
      for (let q = 0; q < it.qty; q++) {
        counter++;
        const serial = 'SLT' + yymmdd + String(counter).padStart(3, '0');
        products.push({ serial, name: it.name });
      }
    }
    if (products.length === 0) return;
    const win = window.open('', 'strikamerki', 'width=380,height=700');
    if (!win) { alert('Vinsamlegast leyfðu sprettiglugga til að prenta strikamerki.'); return; }
    const labelsHTML = products.map(p => `
      <div class="lbl">
        <img class="qr" src="https://api.qrserver.com/v1/create-qr-code/?size=140x140&margin=0&data=${encodeURIComponent(p.serial)}" alt="${esc(p.serial)}">
        <div class="lbl-text">
          <div class="lbl-serial">${esc(p.serial)}</div>
          <div class="lbl-name">${esc(p.name)}</div>
          <div class="lbl-org">Slökkvitæki ehf · 565-4080</div>
        </div>
      </div>`).join('');
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Strikamerki</title>
<style>
  @page { margin: 4mm; }
  body { font-family: -apple-system, sans-serif; margin: 0; padding: 6px; color: #000; }
  .lbl {
    display: flex; align-items: center; gap: 10px;
    padding: 6px 8px; border: 1px solid #000; border-radius: 4px;
    margin-bottom: 6px; page-break-inside: avoid;
    width: 220px; min-height: 80px;
  }
  .qr { width: 70px; height: 70px; flex-shrink: 0; }
  .lbl-text { flex: 1; min-width: 0; }
  .lbl-serial { font-size: 14px; font-weight: 700; font-family: monospace; line-height: 1.1; }
  .lbl-name { font-size: 10px; color: #333; line-height: 1.2; margin-top: 3px; word-break: break-word; }
  .lbl-org { font-size: 8px; color: #666; margin-top: 3px; }
  .toolbar { padding: 6px; background: #f0f0f0; margin-bottom: 10px; text-align: center; font-size: 11px; }
  .toolbar button { padding: 6px 14px; font-size: 12px; cursor: pointer; margin: 0 4px; }
  @media print { .toolbar { display: none; } body { padding: 0; } }
</style></head><body>
  <div class="toolbar">
    ${products.length} strikamerki tilbúin · <button onclick="window.print()">🖨️ Prenta</button>
    <button onclick="window.close()">Loka</button>
  </div>
  ${labelsHTML}
  <script>
    // Wait for QR images to load before opening the print dialog.
    let imgs = Array.from(document.images);
    let loaded = 0;
    function maybePrint() {
      loaded++;
      if (loaded >= imgs.length) setTimeout(() => window.print(), 300);
    }
    if (imgs.length === 0) setTimeout(() => window.print(), 200);
    else imgs.forEach(img => {
      if (img.complete) maybePrint();
      else { img.addEventListener('load', maybePrint); img.addEventListener('error', maybePrint); }
    });
  <\/script>
</body></html>`;
    win.document.write(html);
    win.document.close();
  }

  // --- Click interception (capture phase) ---
  document.addEventListener('click', (e) => {
    const btn = e.target.closest && e.target.closest('#pos-checkout');
    if (!btn) return;
    if (btn.dataset.scdProceed === '1') {
      delete btn.dataset.scdProceed;
      return; // let the original handler run
    }
    e.stopImmediatePropagation();
    e.preventDefault();
    showDialog(btn);
  }, true);

  window.SalaCheckout = {
    show: () => { const b = document.getElementById('pos-checkout'); if (b) showDialog(b); },
    version: 'v1'
  };
})();
/* === END SALA CHECKOUT DIALOG === */

/* === QR LABEL CUSTOMER v2 === */
/* Adds a "🏷️ QR-miði (24×100mm)" workflow with a much larger, rotated QR
   for easier camera focus.
   - QR fills near-full 23mm × 23mm (was 22mm).
   - QR rotated 90° clockwise so its "top" (position-detection markers) faces
     inward toward the text — improves scanning angle on small thermal labels.
   - Generates a higher-resolution QR PNG (320px) for sharper edges.
   - Same workflow as v1: search customer → pick device → preview → print. */
(() => {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  // Re-installable: tear down any prior version cleanly
  document.getElementById('_qrlc_modal')?.remove();
  document.getElementById('qr-lc-style')?.remove();
  document.querySelector('.vnav-btn[data-qrlc]')?.remove();
  window.__qrLabelCustomerInstalled = true;

  function getSB() {
    if (!window.supabase || !window.SUPABASE_URL || !window.SUPABASE_KEY) return null;
    if (!window.__qrLcSB) {
      window.__qrLcSB = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_KEY);
    }
    return window.__qrLcSB;
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    }[c]));
  }

  function ensureQRLib() {
    return new Promise((resolve, reject) => {
      if (typeof window.QRCode !== 'undefined') return resolve();
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js';
      s.onload = () => resolve();
      s.onerror = () => reject(new Error('Could not load QR library'));
      document.head.appendChild(s);
    });
  }
  function qrPNG(text, size) {
    return new Promise(resolve => {
      const div = document.createElement('div');
      new window.QRCode(div, {
        text, width: size, height: size,
        colorDark: '#000000', colorLight: '#ffffff',
        correctLevel: window.QRCode.CorrectLevel.M
      });
      setTimeout(() => {
        const canvas = div.querySelector('canvas');
        const img = div.querySelector('img');
        if (canvas) resolve(canvas.toDataURL('image/png'));
        else if (img) resolve(img.src);
        else resolve('');
      }, 30);
    });
  }

  // ------- Styles ----------
  const STYLE_ID = 'qr-lc-style';
  const s = document.createElement('style');
  s.id = STYLE_ID;
  s.textContent = `
    #_qrlc_modal {
      position: fixed; inset: 0; z-index: 9998;
      background: rgba(15,23,42,.55);
      display: flex; align-items: flex-start; justify-content: center;
      padding: 30px 16px; overflow-y: auto;
      font-family: inherit;
    }
    #_qrlc_modal .qrlc-card {
      background: #fff; border-radius: 14px; padding: 22px;
      max-width: 560px; width: 100%;
      box-shadow: 0 20px 60px rgba(15,23,42,.25);
    }
    #_qrlc_modal h2 {
      margin: 0 0 4px; font-size: 18px; color: #0f172a;
      display: flex; align-items: center; gap: 8px;
    }
    #_qrlc_modal .qrlc-sub { font-size: 13px; color: #64748b; margin-bottom: 14px; }
    #_qrlc_modal label {
      display: block; font-size: 12px; font-weight: 600; color: #475569;
      margin: 12px 0 4px; text-transform: uppercase; letter-spacing: .04em;
    }
    #_qrlc_modal input[type=text],
    #_qrlc_modal input[type=tel],
    #_qrlc_modal select {
      width: 100%; padding: 9px 11px; border: 1px solid #e2e8f0; border-radius: 8px;
      font: inherit; font-size: 14px; color: #0f172a; background: #fff;
      outline: none; box-sizing: border-box; transition: border-color .15s, background .15s;
    }
    #_qrlc_modal input:focus, #_qrlc_modal select:focus {
      border-color: #3b82f6; background: #f0f7ff;
    }
    #_qrlc_modal .qrlc-search-results {
      max-height: 200px; overflow-y: auto;
      border: 1px solid #e2e8f0; border-radius: 8px; margin-top: 6px;
      background: #fff; display: none;
    }
    #_qrlc_modal .qrlc-search-results.open { display: block; }
    #_qrlc_modal .qrlc-sr-item {
      padding: 8px 12px; cursor: pointer;
      border-bottom: 1px solid #f1f5f9; font-size: 13px;
    }
    #_qrlc_modal .qrlc-sr-item:hover { background: #eff6ff; }
    #_qrlc_modal .qrlc-sr-item:last-child { border-bottom: none; }
    #_qrlc_modal .qrlc-sr-name { font-weight: 600; color: #0f172a; }
    #_qrlc_modal .qrlc-sr-meta { color: #64748b; font-size: 12px; }
    #_qrlc_modal .qrlc-empty { padding: 12px; color: #94a3b8; font-style: italic; text-align: center; font-size: 13px; }
    #_qrlc_modal .qrlc-preview-wrap {
      margin: 16px 0; padding: 14px;
      background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 10px;
    }
    #_qrlc_modal .qrlc-preview-cap { font-size: 11px; color: #64748b; text-align: center; margin-bottom: 8px; }
    #_qrlc_modal .qrlc-actions {
      display: flex; gap: 8px; justify-content: flex-end; margin-top: 16px;
    }
    #_qrlc_modal .qrlc-btn {
      padding: 9px 16px; border-radius: 8px; font-size: 14px; cursor: pointer;
      border: 1px solid #e2e8f0; background: #fff; color: #334155; font-weight: 500;
      transition: all .15s;
    }
    #_qrlc_modal .qrlc-btn:hover { border-color: #94a3b8; background: #f8fafc; }
    #_qrlc_modal .qrlc-btn.primary { background: #2563eb; color: #fff; border-color: #2563eb; }
    #_qrlc_modal .qrlc-btn.primary:hover:not(:disabled) { background: #1d4ed8; }
    #_qrlc_modal .qrlc-btn:disabled { opacity: .5; cursor: not-allowed; }
    #_qrlc_modal .qrlc-row2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }

    /* Preview at near-actual scale (96dpi → 24mm≈91px, 100mm≈378px). */
    .qrlc-label {
      width: 378px; height: 91px;
      background: #fff; border: 1px solid #cbd5e1;
      display: flex; align-items: stretch;
      margin: 0 auto;
      font-family: 'Helvetica Neue', Arial, sans-serif;
      overflow: hidden;
      box-sizing: border-box;
      padding: 2px;
    }
    .qrlc-label .ql-qr {
      flex: 0 0 87px;       /* ~23mm at 96dpi */
      padding: 0;
      display: flex; align-items: center; justify-content: center;
    }
    .qrlc-label .ql-qr img {
      width: 87px; height: 87px;        /* fill the 23mm box */
      transform: rotate(90deg);         /* rotate so QR top faces text */
      image-rendering: pixelated;
    }
    .qrlc-label .ql-text {
      flex: 1; padding: 0 4px 0 6px;
      display: flex; flex-direction: column; justify-content: center;
      min-width: 0;
    }
    .qrlc-label .ql-name {
      font-size: 15px; font-weight: 700; color: #000;
      line-height: 1.15; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .qrlc-label .ql-phone {
      font-size: 13px; color: #000; margin-top: 2px;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .qrlc-label .ql-line {
      font-size: 11px; color: #334155; margin-top: 1px;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .qrlc-label .ql-serial {
      font-size: 10px; color: #475569; margin-top: 3px; font-family: 'Courier New', monospace;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
  `;
  document.head.appendChild(s);

  function buildLabelHTML({ qrDataUrl, name, phone, serial, extra }) {
    return `
      <div class="qrlc-label">
        <div class="ql-qr">
          ${qrDataUrl ? `<img src="${qrDataUrl}" alt="QR">` : '<span style="font-size:10px;color:#94a3b8;">QR</span>'}
        </div>
        <div class="ql-text">
          <div class="ql-name">${esc(name || '—')}</div>
          ${phone ? `<div class="ql-phone">📞 ${esc(phone)}</div>` : ''}
          ${extra ? `<div class="ql-line">${esc(extra)}</div>` : ''}
          ${serial ? `<div class="ql-serial">${esc(serial)}</div>` : ''}
        </div>
      </div>`;
  }

  // ------- Print ----------
  function openPrintWindow(labelHTML) {
    const win = window.open('', '_blank', 'width=900,height=500');
    if (!win) { alert('Vinsamlegast leyfa popup glugga til að prenta.'); return; }
    win.document.open();
    win.document.write(`
      <!doctype html><html><head><meta charset="utf-8"><title>QR-miði 24×100mm</title>
      <style>
        @page { size: 100mm 24mm; margin: 0; }
        @media print {
          html, body { margin: 0; padding: 0; background: #fff; }
        }
        html, body { margin: 0; padding: 0; background: #fff;
          font-family: 'Helvetica Neue', Arial, sans-serif; }
        .sheet {
          width: 100mm; height: 24mm; box-sizing: border-box;
          padding: 0.5mm; display: flex; align-items: stretch;
          page-break-after: always;
        }
        .ql-qr {
          flex: 0 0 23mm; padding: 0;
          display: flex; align-items: center; justify-content: center;
        }
        .ql-qr img {
          width: 23mm; height: 23mm;
          transform: rotate(90deg);
          image-rendering: pixelated;
        }
        .ql-text {
          flex: 1; padding: 0 1.5mm 0 2mm;
          display: flex; flex-direction: column; justify-content: center;
          min-width: 0; overflow: hidden;
        }
        .ql-name { font-size: 13pt; font-weight: 700; color: #000;
          line-height: 1.1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .ql-phone { font-size: 11pt; color: #000; margin-top: .8mm;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .ql-line { font-size: 9pt; color: #000; margin-top: .5mm;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .ql-serial { font-size: 8pt; color: #333; margin-top: .8mm;
          font-family: 'Courier New', monospace;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        @media screen {
          body { padding: 18px; background: #f1f5f9; }
          .sheet { background: #fff; border: 1px solid #cbd5e1; margin: 0 auto 8px; }
        }
      </style>
      </head><body>
      ${labelHTML}
      <script>setTimeout(()=>{ try { window.focus(); window.print(); } catch(e){} }, 250);</script>
      </body></html>
    `);
    win.document.close();
  }
  function buildPrintLabel({ qrDataUrl, name, phone, serial, extra }) {
    return `
      <div class="sheet">
        <div class="ql-qr">${qrDataUrl ? `<img src="${qrDataUrl}">` : ''}</div>
        <div class="ql-text">
          <div class="ql-name">${esc(name || '—')}</div>
          ${phone ? `<div class="ql-phone">📞 ${esc(phone)}</div>` : ''}
          ${extra ? `<div class="ql-line">${esc(extra)}</div>` : ''}
          ${serial ? `<div class="ql-serial">${esc(serial)}</div>` : ''}
        </div>
      </div>`;
  }

  let state = { customer: null, devices: [], selectedDevice: null, qrSize: 320, searchTimer: null };

  async function searchCustomers(query) {
    const SB = getSB(); if (!SB) return [];
    const v = (query || '').trim();
    if (v.length < 2) return [];
    const digits = v.replace(/\D/g, '');
    let q;
    if (digits.length >= 2 && digits === v.replace(/-/g,'')) {
      q = SB.from('vidskiptavinir').select('kennitala, nafn, simi').or(
        'kennitala.ilike.' + digits + '%,kennitala.ilike.' + digits.slice(0,6) + '-' + digits.slice(6) + '%'
      ).limit(8);
    } else {
      q = SB.from('vidskiptavinir').select('kennitala, nafn, simi').ilike('nafn', '%' + v + '%').limit(8);
    }
    const { data, error } = await q;
    if (error) return [];
    return data || [];
  }

  async function loadDevicesForCustomer(customer) {
    const SB = getSB(); if (!SB) return [];
    const out = []; const name = customer.nafn;
    if (name) {
      const { data } = await SB.from('uttaeki').select('id, serial, type, size, client, location, phone').ilike('client', '%' + name + '%').limit(20);
      if (data) for (const r of data) out.push({ kind: 'uttaeki', ...r });
    }
    if (name) {
      const { data } = await SB.from('lanstaeki').select('id, serial, type, size, client, location').ilike('client', '%' + name + '%').limit(20);
      if (data) for (const r of data) out.push({ kind: 'lanstaeki', ...r });
    }
    const seen = new Set();
    return out.filter(d => { const k = d.kind + ':' + d.serial; if (seen.has(k)) return false; seen.add(k); return true; });
  }

  async function refreshPreview() {
    const previewEl = document.getElementById('_qrlc_preview');
    if (!previewEl) return;
    const printBtn = document.getElementById('_qrlc_print');

    const name = (document.getElementById('_qrlc_name')?.value || '').trim();
    const phone = (document.getElementById('_qrlc_phone')?.value || '').trim();
    const serial = (document.getElementById('_qrlc_serial')?.value || '').trim();
    const extra = (document.getElementById('_qrlc_extra')?.value || '').trim();

    if (printBtn) printBtn.disabled = !name && !phone && !serial;

    let qrText = serial || (state.customer?.kennitala) || ((name || '') + (phone ? ' ' + phone : '')).trim();
    if (!qrText) qrText = '—';

    let qrDataUrl = '';
    try { await ensureQRLib(); qrDataUrl = await qrPNG(qrText, state.qrSize); } catch (e) {}

    previewEl.innerHTML = buildLabelHTML({ qrDataUrl, name, phone, serial, extra });
    previewEl.dataset.qr = qrDataUrl;
    previewEl.dataset.name = name;
    previewEl.dataset.phone = phone;
    previewEl.dataset.serial = serial;
    previewEl.dataset.extra = extra;
  }

  function selectCustomer(c) {
    state.customer = c; state.devices = []; state.selectedDevice = null;
    document.getElementById('_qrlc_search').value = c.nafn || '';
    document.getElementById('_qrlc_results').classList.remove('open');
    document.getElementById('_qrlc_name').value = c.nafn || '';
    document.getElementById('_qrlc_phone').value = c.simi || '';
    document.getElementById('_qrlc_serial').value = '';
    document.getElementById('_qrlc_extra').value = '';
    const devSel = document.getElementById('_qrlc_device');
    devSel.innerHTML = '<option value="">— Hleður tækjum…</option>';
    devSel.disabled = true;
    loadDevicesForCustomer(c).then(devs => {
      state.devices = devs;
      devSel.innerHTML = '<option value="">— ekkert valið —</option>' +
        devs.map((d, i) => {
          const lbl = d.serial + (d.type ? ' · ' + d.type : '') + (d.size ? ' ' + d.size : '') + (d.location ? ' · ' + d.location : '') + (d.kind === 'lanstaeki' ? ' (lánstæki)' : '');
          return '<option value="' + i + '">' + esc(lbl) + '</option>';
        }).join('');
      devSel.disabled = false;
    });
    refreshPreview();
  }

  function selectDevice(idx) {
    const d = state.devices[idx];
    if (!d) { state.selectedDevice = null; return; }
    state.selectedDevice = d;
    document.getElementById('_qrlc_serial').value = d.serial || '';
    if (d.type || d.size) {
      document.getElementById('_qrlc_extra').value = [d.type, d.size].filter(Boolean).join(' ');
    }
    refreshPreview();
  }

  function openDialog() {
    closeDialog();
    state = { customer: null, devices: [], selectedDevice: null, qrSize: 320, searchTimer: null };
    const modal = document.createElement('div');
    modal.id = '_qrlc_modal';
    modal.innerHTML = `
      <div class="qrlc-card">
        <h2>🏷️ QR-miði 24 × 100 mm</h2>
        <div class="qrlc-sub">Stór QR-kóði (23×23mm) snúinn 90° til að auðvelda skönnun.</div>

        <label for="_qrlc_search">Leita að viðskiptavini</label>
        <input type="text" id="_qrlc_search" placeholder="Kennitala eða nafn (a.m.k. 2 stafir)…" autocomplete="off">
        <div id="_qrlc_results" class="qrlc-search-results"></div>

        <label for="_qrlc_device">Tæki (valfrjálst)</label>
        <select id="_qrlc_device" disabled><option value="">— veldu viðskiptavin fyrst —</option></select>

        <div class="qrlc-row2">
          <div>
            <label for="_qrlc_name">Nafn</label>
            <input type="text" id="_qrlc_name" placeholder="Nafn viðskiptavinar">
          </div>
          <div>
            <label for="_qrlc_phone">Sími</label>
            <input type="tel" id="_qrlc_phone" placeholder="Sími">
          </div>
        </div>
        <div class="qrlc-row2">
          <div>
            <label for="_qrlc_serial">Raðnúmer / SN</label>
            <input type="text" id="_qrlc_serial" placeholder="t.d. NEW-1234">
          </div>
          <div>
            <label for="_qrlc_extra">Auka lína (valfrjáls)</label>
            <input type="text" id="_qrlc_extra" placeholder="t.d. 6kg ABC Duft">
          </div>
        </div>

        <div class="qrlc-preview-wrap">
          <div class="qrlc-preview-cap">Forskoðun · 24 mm × 100 mm (QR snúinn 90°)</div>
          <div id="_qrlc_preview"></div>
        </div>

        <div class="qrlc-actions">
          <button class="qrlc-btn" id="_qrlc_cancel">Hætta við</button>
          <button class="qrlc-btn primary" id="_qrlc_print" disabled>🖨 Prenta</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    const search = document.getElementById('_qrlc_search');
    const results = document.getElementById('_qrlc_results');
    search.focus();
    search.addEventListener('input', () => {
      clearTimeout(state.searchTimer);
      const v = search.value.trim();
      if (v.length < 2) { results.classList.remove('open'); results.innerHTML = ''; return; }
      state.searchTimer = setTimeout(async () => {
        const matches = await searchCustomers(v);
        if (matches.length === 0) {
          results.innerHTML = '<div class="qrlc-empty">Engin samsvörun</div>';
        } else {
          results.innerHTML = matches.map((m, i) =>
            `<div class="qrlc-sr-item" data-i="${i}">
               <div class="qrlc-sr-name">${esc(m.nafn || '(ónefnt)')}</div>
               <div class="qrlc-sr-meta">${esc(m.kennitala || '')}${m.simi ? ' · 📞 ' + esc(m.simi) : ''}</div>
             </div>`
          ).join('');
          results.querySelectorAll('.qrlc-sr-item').forEach(el => {
            el.addEventListener('mousedown', (ev) => {
              ev.preventDefault();
              const i = +el.dataset.i;
              selectCustomer(matches[i]);
            });
          });
        }
        results.classList.add('open');
      }, 180);
    });
    search.addEventListener('blur', () => setTimeout(() => results.classList.remove('open'), 200));

    document.getElementById('_qrlc_device').addEventListener('change', (e) => {
      const v = e.target.value;
      if (v === '') { state.selectedDevice = null; return; }
      selectDevice(+v);
    });

    ['_qrlc_name', '_qrlc_phone', '_qrlc_serial', '_qrlc_extra'].forEach(id => {
      document.getElementById(id).addEventListener('input', () => {
        clearTimeout(state.searchTimer);
        state.searchTimer = setTimeout(refreshPreview, 120);
      });
    });

    document.getElementById('_qrlc_cancel').addEventListener('click', closeDialog);
    modal.addEventListener('click', (e) => { if (e.target === modal) closeDialog(); });
    document.addEventListener('keydown', escHandler);

    document.getElementById('_qrlc_print').addEventListener('click', async () => {
      const previewEl = document.getElementById('_qrlc_preview');
      const ds = previewEl.dataset;
      const labelHTML = buildPrintLabel({
        qrDataUrl: ds.qr || '', name: ds.name, phone: ds.phone, serial: ds.serial, extra: ds.extra
      });
      openPrintWindow(labelHTML);
    });

    refreshPreview();
  }
  function escHandler(e) { if (e.key === 'Escape') closeDialog(); }
  function closeDialog() {
    document.getElementById('_qrlc_modal')?.remove();
    document.removeEventListener('keydown', escHandler);
  }

  function ensureNavButton() {
    if (document.querySelector('.vnav-btn[data-qrlc]')) return;
    const existing = Array.from(document.querySelectorAll('.vnav-btn'))
      .find(b => /Prenta\s*QR/i.test(b.textContent));
    if (!existing || !existing.parentElement) return;
    const btn = document.createElement('button');
    btn.className = existing.className.replace(/\bactive\b/g, '').trim();
    btn.setAttribute('data-qrlc', '1');
    btn.textContent = '🏷️ QR-miði (24×100mm)';
    btn.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); openDialog(); });
    existing.parentElement.insertBefore(btn, existing.nextSibling);
  }

  ensureNavButton();
  setTimeout(ensureNavButton, 500);
  setTimeout(ensureNavButton, 1500);
  const obs = new MutationObserver(() => ensureNavButton());
  obs.observe(document.body, { childList: true, subtree: true });

  window.QrLabelCustomer = { open: openDialog, version: 'v2' };
})();
/* === END QR LABEL CUSTOMER === */

/* === VERKDAGBOK ATTACHMENTS v1 === */
/* Adds files & photos to Verkdagbok entries:
   - 📷 Take photo (back camera on phone) and 📎 Attach files in the edit modal
   - Uploads to Supabase Storage bucket "verkdagbok-attachments"
   - Records each attachment in verkdagbok_attachments table
   - Image thumbnails in a grid; click to open full-size in new tab
   - Delete with confirm
   - 📎 N badge on cards/rows that have attachments */
(() => {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (window.__vdAttachmentsInstalled) return;
  window.__vdAttachmentsInstalled = true;

  const BUCKET = 'verkdagbok-attachments';

  function getSB() {
    if (!window.supabase || !window.SUPABASE_URL || !window.SUPABASE_KEY) return null;
    if (!window.__vdaSB) {
      window.__vdaSB = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_KEY);
    }
    return window.__vdaSB;
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    }[c]));
  }

  // ----- Styles -----
  const STYLE_ID = 'vda-style';
  if (!document.getElementById(STYLE_ID)) {
    const s = document.createElement('style');
    s.id = STYLE_ID;
    s.textContent = `
      .vda-section {
        margin: 16px 0 0; padding-top: 14px;
        border-top: 1px dashed #e2e8f0;
      }
      .vda-section h4 {
        font-size: 11px; font-weight: 600; color: #475569;
        text-transform: uppercase; letter-spacing: .04em;
        margin: 0 0 8px;
      }
      .vda-buttons { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 10px; }
      .vda-btn {
        padding: 8px 14px; border: 1px solid #e2e8f0; border-radius: 8px;
        background: #fff; cursor: pointer; font-size: 13px; color: #334155;
        display: inline-flex; align-items: center; gap: 6px;
        transition: all .15s; font-family: inherit;
      }
      .vda-btn:hover:not(:disabled) { border-color: #94a3b8; background: #f8fafc; }
      .vda-btn:disabled { opacity: .5; cursor: not-allowed; }
      .vda-btn.primary { background: #2563eb; color: #fff; border-color: #2563eb; }
      .vda-btn.primary:hover:not(:disabled) { background: #1d4ed8; }
      .vda-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(96px, 1fr));
        gap: 8px;
      }
      .vda-tile {
        position: relative; aspect-ratio: 1;
        border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;
        background: #f8fafc; cursor: pointer; transition: border-color .15s;
      }
      .vda-tile:hover { border-color: #94a3b8; }
      .vda-tile img {
        width: 100%; height: 100%; object-fit: cover; display: block;
      }
      .vda-tile.file {
        display: flex; flex-direction: column; align-items: center;
        justify-content: center; padding: 8px; text-align: center;
        font-size: 10px; color: #475569; word-break: break-word;
      }
      .vda-tile.file .icon { font-size: 28px; margin-bottom: 4px; }
      .vda-tile.file .name {
        line-height: 1.2; max-height: 36px; overflow: hidden;
        display: -webkit-box; -webkit-line-clamp: 3;
        -webkit-box-orient: vertical;
      }
      .vda-tile .del {
        position: absolute; top: 4px; right: 4px;
        width: 24px; height: 24px; border-radius: 50%;
        background: rgba(15,23,42,0.7); color: #fff; border: none;
        cursor: pointer; font-size: 12px; line-height: 1;
        display: flex; align-items: center; justify-content: center;
        opacity: 0; transition: opacity .15s, background .15s;
      }
      .vda-tile:hover .del, .vda-tile:active .del { opacity: 1; }
      .vda-tile .del:hover { background: #dc2626; opacity: 1; }
      @media (hover: none) { .vda-tile .del { opacity: .85; } }
      .vda-empty {
        padding: 20px; text-align: center; color: #94a3b8;
        font-style: italic; font-size: 12px;
        border: 1px dashed #e2e8f0; border-radius: 8px;
      }
      .vda-loading {
        padding: 16px; color: #64748b; font-size: 13px; text-align: center;
        border: 1px dashed #e2e8f0; border-radius: 8px;
      }
      .vda-setup {
        background: #fffbeb; border: 1px solid #fcd34d; border-radius: 8px;
        padding: 12px; font-size: 12px; color: #92400e;
      }
      .vda-setup strong { display: block; margin-bottom: 4px; }
      .vda-setup pre {
        background: #fff; padding: 10px; border-radius: 4px;
        font-size: 10px; line-height: 1.4; overflow-x: auto;
        max-height: 240px; margin: 8px 0 4px;
        font-family: 'Courier New', monospace; color: #0f172a;
      }
      .vda-setup .copy-btn {
        background: #475569; color: #fff; border: none;
        padding: 6px 12px; border-radius: 6px; font-size: 12px;
        cursor: pointer; margin-top: 4px;
      }
      .vda-setup .copy-btn:hover { background: #334155; }
      .vda-badge {
        background: #e0e7ff; color: #3730a3;
        padding: 2px 7px; border-radius: 99px;
        font-size: 11px; margin-left: 6px;
        display: inline-flex; align-items: center; gap: 3px;
        font-weight: 600;
      }
    `;
    document.head.appendChild(s);
  }

  // ----- Setup SQL -----
  const SETUP_SQL = [
    "-- Verkdagbók viðhengi: keyrðu þetta einu sinni í Supabase SQL Editor",
    "",
    "-- 1) Storage bucket (public)",
    "insert into storage.buckets (id, name, public)",
    "values ('verkdagbok-attachments', 'verkdagbok-attachments', true)",
    "on conflict (id) do update set public = true;",
    "",
    "-- 2) Storage policies for anon role",
    "drop policy if exists \"vda_anon_select\" on storage.objects;",
    "drop policy if exists \"vda_anon_insert\" on storage.objects;",
    "drop policy if exists \"vda_anon_delete\" on storage.objects;",
    "create policy \"vda_anon_select\" on storage.objects for select to anon, authenticated using (bucket_id = 'verkdagbok-attachments');",
    "create policy \"vda_anon_insert\" on storage.objects for insert to anon, authenticated with check (bucket_id = 'verkdagbok-attachments');",
    "create policy \"vda_anon_delete\" on storage.objects for delete to anon, authenticated using (bucket_id = 'verkdagbok-attachments');",
    "",
    "-- 3) Attachments table",
    "create table if not exists verkdagbok_attachments (",
    "  id uuid primary key default gen_random_uuid(),",
    "  entry_id uuid references verkdagbok(id) on delete cascade,",
    "  filename text,",
    "  storage_path text not null,",
    "  public_url text,",
    "  mime_type text,",
    "  size_bytes bigint,",
    "  uploaded_at timestamptz default now()",
    ");",
    "create index if not exists vda_entry_idx on verkdagbok_attachments(entry_id);",
    "",
    "alter table verkdagbok_attachments enable row level security;",
    "drop policy if exists \"vda_open_select\" on verkdagbok_attachments;",
    "drop policy if exists \"vda_open_insert\" on verkdagbok_attachments;",
    "drop policy if exists \"vda_open_delete\" on verkdagbok_attachments;",
    "create policy \"vda_open_select\" on verkdagbok_attachments for select to anon, authenticated using (true);",
    "create policy \"vda_open_insert\" on verkdagbok_attachments for insert to anon, authenticated with check (true);",
    "create policy \"vda_open_delete\" on verkdagbok_attachments for delete to anon, authenticated using (true);"
  ].join('\n');

  // ----- API -----
  let setupOK = null; // null = unknown, true = ready, false = needs SQL
  async function checkSetup() {
    if (setupOK !== null) return setupOK;
    const SB = getSB();
    if (!SB) return false;
    try {
      const { error } = await SB.from('verkdagbok_attachments').select('id').limit(1);
      setupOK = !error;
    } catch (e) { setupOK = false; }
    return setupOK;
  }

  async function uploadFile(entryId, file) {
    const SB = getSB();
    const ts = Date.now();
    const safeName = (file.name || 'file').replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80);
    const path = entryId + '/' + ts + '-' + safeName;
    const { error: upErr } = await SB.storage.from(BUCKET).upload(path, file, {
      contentType: file.type || 'application/octet-stream',
      upsert: false
    });
    if (upErr) throw upErr;
    const { data: urlData } = SB.storage.from(BUCKET).getPublicUrl(path);
    const publicUrl = urlData?.publicUrl || '';
    const { error: insErr } = await SB.from('verkdagbok_attachments').insert({
      entry_id: entryId,
      filename: file.name,
      storage_path: path,
      public_url: publicUrl,
      mime_type: file.type || null,
      size_bytes: file.size
    });
    if (insErr) throw insErr;
  }

  async function listAttachments(entryId) {
    const SB = getSB();
    const { data, error } = await SB
      .from('verkdagbok_attachments')
      .select('*')
      .eq('entry_id', entryId)
      .order('uploaded_at', { ascending: true });
    if (error) throw error;
    return data || [];
  }

  async function deleteAttachment(att) {
    const SB = getSB();
    try { await SB.storage.from(BUCKET).remove([att.storage_path]); } catch(e) {}
    const { error } = await SB.from('verkdagbok_attachments').delete().eq('id', att.id);
    if (error) throw error;
  }

  // ----- UI rendering -----
  function tileHTML(att) {
    const isImage = (att.mime_type || '').startsWith('image/');
    const ext = ((att.filename || '').split('.').pop() || '').toLowerCase();
    let icon = '📎';
    if (ext === 'pdf') icon = '📄';
    else if (['doc','docx'].includes(ext)) icon = '📝';
    else if (['xls','xlsx','csv'].includes(ext)) icon = '📊';
    else if (['mp4','mov','webm','avi'].includes(ext)) icon = '🎬';
    return `
      <div class="vda-tile ${isImage ? 'image' : 'file'}" data-id="${esc(att.id)}" data-url="${esc(att.public_url || '')}">
        ${isImage
          ? `<img src="${esc(att.public_url)}" alt="${esc(att.filename || '')}" loading="lazy">`
          : `<div class="icon">${icon}</div><div class="name">${esc(att.filename || 'skrá')}</div>`}
        <button class="del" data-id="${esc(att.id)}" title="Eyða">✕</button>
      </div>`;
  }

  function listHTML(attachments) {
    if (!attachments.length) {
      return '<div class="vda-empty">Engin viðhengi enn — taktu mynd eða veldu skrá að ofan</div>';
    }
    return '<div class="vda-grid">' + attachments.map(tileHTML).join('') + '</div>';
  }

  function setupHTML() {
    return `
      <div class="vda-setup">
        <strong>⚠️ Viðhengi-uppsetning vantar</strong>
        Keyrðu þessa SQL skipun einu sinni í Supabase SQL Editor (síðan endurhladdu þessa síðu):
        <pre id="vda-setup-sql">${esc(SETUP_SQL)}</pre>
        <button class="copy-btn" id="vda-copy-sql">📋 Afrita SQL</button>
      </div>`;
  }

  function sectionHTML() {
    return `
      <div class="vda-section">
        <h4>📎 Skjöl og myndir</h4>
        <div class="vda-buttons">
          <button type="button" class="vda-btn primary" id="vda-photo-btn">📷 Taka mynd</button>
          <button type="button" class="vda-btn" id="vda-file-btn">📎 Velja skrá</button>
        </div>
        <input type="file" id="vda-photo-input" accept="image/*" capture="environment" multiple style="display:none">
        <input type="file" id="vda-file-input" multiple style="display:none">
        <div id="vda-list"><div class="vda-loading">Hleður…</div></div>
      </div>`;
  }

  // ----- Wire up an injected section -----
  async function wireSection(section, entryId) {
    const listEl = section.querySelector('#vda-list');
    const photoBtn = section.querySelector('#vda-photo-btn');
    const fileBtn = section.querySelector('#vda-file-btn');
    const photoInput = section.querySelector('#vda-photo-input');
    const fileInput = section.querySelector('#vda-file-input');

    if (!(await checkSetup())) {
      listEl.innerHTML = setupHTML();
      photoBtn.disabled = true;
      fileBtn.disabled = true;
      const copyBtn = listEl.querySelector('#vda-copy-sql');
      copyBtn?.addEventListener('click', async () => {
        try { await navigator.clipboard.writeText(SETUP_SQL); copyBtn.textContent = '✓ Afritað'; setTimeout(() => copyBtn.textContent = '📋 Afrita SQL', 1500); }
        catch (e) { alert('Gat ekki afritað — veldu SQL textann handvirkt og afritaðu.'); }
      });
      return;
    }

    let attachments = [];
    async function refresh() {
      try {
        attachments = await listAttachments(entryId);
        listEl.innerHTML = listHTML(attachments);
        wireTiles();
      } catch (e) {
        listEl.innerHTML = '<div class="vda-empty" style="color:#dc2626;">Villa: ' + esc(e.message) + '</div>';
      }
    }

    function wireTiles() {
      listEl.querySelectorAll('.vda-tile').forEach(tile => {
        tile.addEventListener('click', (ev) => {
          if (ev.target.classList.contains('del')) return;
          const url = tile.dataset.url;
          if (url) window.open(url, '_blank');
        });
      });
      listEl.querySelectorAll('.vda-tile .del').forEach(b => {
        b.addEventListener('click', async (ev) => {
          ev.stopPropagation();
          const id = b.dataset.id;
          const att = attachments.find(a => a.id === id);
          if (!att) return;
          if (!confirm('Eyða "' + (att.filename || 'skránni') + '"?')) return;
          try { await deleteAttachment(att); await refresh(); }
          catch (e) { alert('Villa við að eyða: ' + e.message); }
        });
      });
    }

    async function handleFiles(files) {
      if (!files || !files.length) return;
      const arr = Array.from(files);
      photoBtn.disabled = true; fileBtn.disabled = true;
      listEl.innerHTML = '<div class="vda-loading">Hleður upp ' + arr.length + ' skrá' + (arr.length > 1 ? 'm' : '') + '…</div>';
      let failed = 0;
      for (const f of arr) {
        try { await uploadFile(entryId, f); }
        catch (e) { console.error('upload failed', e); failed++; }
      }
      photoBtn.disabled = false; fileBtn.disabled = false;
      if (failed > 0) alert(failed + ' af ' + arr.length + ' skrá tókust ekki að hlaða upp.');
      await refresh();
      photoInput.value = ''; fileInput.value = '';
    }

    photoBtn.addEventListener('click', () => photoInput.click());
    fileBtn.addEventListener('click', () => fileInput.click());
    photoInput.addEventListener('change', () => handleFiles(photoInput.files));
    fileInput.addEventListener('change', () => handleFiles(fileInput.files));

    await refresh();
  }

  // ----- Hook into the Verkdagbok edit modal -----
  let pendingEditId = null;
  document.addEventListener('click', (e) => {
    const btn = e.target.closest && e.target.closest('.vd-edit');
    if (btn) pendingEditId = btn.dataset.id;
  }, true);

  async function injectIntoModal(modal) {
    if (!modal || modal.querySelector('.vda-section')) return;
    const entryId = pendingEditId;
    pendingEditId = null;
    if (!entryId) return;
    // Find the action button row (the div containing #ve-cancel)
    const cancelBtn = modal.querySelector('#ve-cancel');
    if (!cancelBtn) return;
    const actionsRow = cancelBtn.parentElement;
    if (!actionsRow) return;
    // Build section
    const wrap = document.createElement('div');
    wrap.innerHTML = sectionHTML();
    const section = wrap.firstElementChild;
    actionsRow.parentElement.insertBefore(section, actionsRow);
    await wireSection(section, entryId);
  }

  const obs = new MutationObserver(muts => {
    for (const m of muts) {
      for (const n of m.addedNodes) {
        if (n.nodeType !== 1) continue;
        if (n.id === 'vd-edit-modal') { injectIntoModal(n); }
        else if (n.querySelector) {
          const found = n.querySelector('#vd-edit-modal');
          if (found) injectIntoModal(found);
        }
      }
    }
  });
  obs.observe(document.body, { childList: true, subtree: true });

  // Also handle if modal is already open at install time
  setTimeout(() => {
    const m = document.getElementById('vd-edit-modal');
    if (m) injectIntoModal(m);
  }, 100);

  // ----- Card / row badges (count of attachments) -----
  let badgeCounts = new Map();
  let badgeRefreshTimer = null;
  async function loadBadgeCounts() {
    if (!(await checkSetup())) return;
    const SB = getSB();
    try {
      const { data } = await SB.from('verkdagbok_attachments').select('entry_id').limit(2000);
      const m = new Map();
      for (const r of (data || [])) m.set(r.entry_id, (m.get(r.entry_id) || 0) + 1);
      badgeCounts = m;
      paintBadges();
    } catch (e) {}
  }
  function paintBadges() {
    if (!badgeCounts.size) return;
    document.querySelectorAll('#view-verkdagbok .vd-card[data-id], #view-verkdagbok .vd-row[data-id]').forEach(el => {
      el.querySelectorAll('.vda-badge').forEach(b => b.remove());
      const c = badgeCounts.get(el.dataset.id);
      if (!c) return;
      const badge = document.createElement('span');
      badge.className = 'vda-badge';
      badge.textContent = '📎 ' + c;
      // Card layout: append to .vd-meta or .vd-body
      const card = el.classList.contains('vd-card');
      if (card) {
        let meta = el.querySelector('.vd-meta');
        if (!meta) {
          meta = document.createElement('div');
          meta.className = 'vd-meta';
          el.querySelector('.vd-body')?.appendChild(meta);
        }
        meta.appendChild(badge);
      } else {
        // Row: append to fyr-cell
        const cell = el.querySelector('.fyr-cell');
        if (cell) cell.appendChild(badge);
      }
    });
  }
  function scheduleBadgeRefresh() {
    clearTimeout(badgeRefreshTimer);
    badgeRefreshTimer = setTimeout(loadBadgeCounts, 250);
  }
  // Refresh badges when verkdagbok view re-renders
  const vdObs = new MutationObserver(muts => {
    for (const m of muts) {
      if (m.target.id === 'vd-main' || m.target.closest?.('#vd-main')) {
        scheduleBadgeRefresh(); return;
      }
      for (const n of m.addedNodes) {
        if (n.nodeType === 1 && (n.id === 'vd-main' || n.querySelector?.('.vd-card, .vd-row'))) {
          scheduleBadgeRefresh(); return;
        }
      }
    }
  });
  vdObs.observe(document.body, { childList: true, subtree: true });
  setTimeout(loadBadgeCounts, 1000);
  setTimeout(loadBadgeCounts, 3000);

  window.VdAttachments = {
    refresh: loadBadgeCounts,
    setupSQL: SETUP_SQL,
    version: 'v1'
  };
})();
/* === END VERKDAGBOK ATTACHMENTS === */

/* === SALA RECEIPT REDESIGN v1 === */
/* Re-styles the Sala "Kvittun" popup to look like a proper A4 invoice
   (matching reikningur.jpg in Drive: top-left logo + name, top-right address,
   bill-to + invoice-meta side-by-side, items table with rule lines on header
   only, totals block bottom-right, signature line + regulation footnote).
   - Hooks window.open to detect any popup whose title starts with "Kvittun"
   - Extracts data from the already-rendered DOM, so it survives pos.js changes
   - Rewrites <head> + <body> with new HTML/CSS, keeps print() shortcut */
(() => {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (window.__salaReceiptRedesignInstalled) return;
  window.__salaReceiptRedesignInstalled = true;

  const origOpen = window.open;
  window.open = function() {
    const win = origOpen.apply(window, arguments);
    if (win) tryRewrite(win);
    return win;
  };

  function tryRewrite(win) {
    let attempts = 0;
    const tick = () => {
      attempts++;
      let title = '';
      let hasReceipt = false;
      try {
        if (!win || win.closed) return;
        title = (win.document && win.document.title) || '';
        const body = win.document && win.document.body;
        hasReceipt = !!(body && body.querySelector('.receipt'));
      } catch (e) { /* cross-origin, retry */ }
      if (/^kvittun/i.test(title) && hasReceipt) {
        // Wait a beat to ensure full content is written
        setTimeout(() => { try { rewrite(win); } catch (e) { console.warn('[receipt redesign]', e); } }, 60);
        return;
      }
      if (attempts < 50) setTimeout(tick, 80);
    };
    setTimeout(tick, 50);
  }

  function fmtKr(n) {
    if (n == null || isNaN(n)) return '';
    return Math.round(n).toLocaleString('is-IS').replace(/,/g, '.') + ' kr';
  }
  function fmtAmt(n) {
    if (n == null || isNaN(n)) return '';
    return Math.round(n).toLocaleString('is-IS').replace(/,/g, '.');
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    }[c]));
  }

  function extractData(doc) {
    const r = doc.querySelector('.receipt');
    const data = { num: '', date: '', customer: '', phone: '', notes: '' };

    // Pull info pairs from .receipt-info: each direct child <div> has a <span>label</span> + value
    const cells = r.querySelectorAll('.receipt-info > div');
    cells.forEach(cell => {
      const span = cell.querySelector('span');
      if (!span) return;
      const label = span.textContent.replace(/[:\s]+$/, '').trim().toLowerCase();
      const value = cell.textContent.replace(span.textContent, '').trim();
      if (/kvittun/.test(label)) data.num = value;
      else if (/dagsetn/.test(label)) data.date = value;
      else if (/(viðskipt|customer)/.test(label)) data.customer = value;
      else if (/(sími|phone)/.test(label)) data.phone = value;
    });
    // Fallback: title also has the number
    if (!data.num) {
      const m = (doc.title || '').match(/kvittun\s+(\S+)/i);
      if (m) data.num = m[1];
    }

    // Lines from the items table — tolerate 3-col (desc/qty/total) or wider layouts
    const rows = r.querySelectorAll('table tbody tr, table tr');
    const lines = [];
    rows.forEach(tr => {
      const tds = tr.querySelectorAll('td');
      if (tds.length < 3) return;
      // Last cell = total, second-to-last = qty, first = desc
      const desc = tds[0].textContent.trim();
      const qtyTxt = tds[tds.length - 2].textContent.trim();
      const totalTxt = tds[tds.length - 1].textContent.trim();
      const qty = parseFloat(qtyTxt.replace(/[^\d.,-]/g, '').replace(',', '.')) || 0;
      const lineTotalIncVat = parseFloat(totalTxt.replace(/[^\d.,-]/g, '').replace(/\./g, '').replace(',', '.')) || 0;
      // Back out 24% VAT to get "ex" line and unit price (most items use 24% — best-effort)
      const lineEx = lineTotalIncVat / 1.24;
      const unitEx = qty > 0 ? lineEx / qty : lineEx;
      // Find the description's reference span if present
      const refSpan = tds[0].querySelector('span');
      const refText = refSpan ? refSpan.textContent.trim() : '';
      const cleanDesc = refText ? desc.replace(refText, '').trim() : desc;
      lines.push({
        ref: refText,
        desc: cleanDesc,
        qty,
        unitEx,
        lineEx,
        lineInc: lineTotalIncVat,
        vskCode: '2'
      });
    });
    data.lines = lines;

    // Totals: extract from .totals block — there are .total-row entries and .grand-total
    const totalEls = r.querySelectorAll('.totals .total-row, .totals .grand-total');
    let subEx = 0, vsk = 0, total = 0;
    totalEls.forEach(el => {
      const txt = el.textContent.toLowerCase();
      // Last number in the line is the value
      const m = el.textContent.match(/([\d.,]+)\s*kr?\s*$/i) || el.textContent.match(/([\d.,]+)\s*$/);
      if (!m) return;
      const v = parseFloat(m[1].replace(/\./g, '').replace(',', '.')) || 0;
      if (/(samtals|án vsk|fyrir vsk|undirsamtals|subtotal)/.test(txt)) subEx = v;
      else if (/(vsk|skattur|vat)/.test(txt) && !/(með|inc)/.test(txt)) vsk = v;
      else if (/(til greiðslu|samtals.*greiðs|total|alls)/.test(txt) || el.classList.contains('grand-total')) total = v;
    });
    if (!total && (subEx || vsk)) total = subEx + vsk;
    if (!subEx && lines.length) subEx = lines.reduce((s, l) => s + l.lineEx, 0);
    if (!vsk && total && subEx) vsk = total - subEx;
    if (!total && lines.length) total = lines.reduce((s, l) => s + l.lineInc, 0);
    data.subEx = subEx;
    data.vsk = vsk;
    data.total = total;

    return data;
  }

  function buildHTML(data) {
    const linesHTML = data.lines.map(l => {
      return `<tr>
        <td class="num-col">${esc(l.ref || '')}</td>
        <td class="desc-col">${esc(l.desc)}</td>
        <td class="qty-col">${l.qty ? l.qty.toLocaleString('is-IS', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : ''}</td>
        <td class="unit-col">${fmtAmt(l.unitEx)}</td>
        <td class="amt-col">${fmtAmt(l.lineEx)}</td>
        <td class="vsk-col">${esc(l.vskCode || '')}</td>
      </tr>`;
    }).join('');

    return `
      <div class="no-print">
        <button onclick="window.print()" class="btn-primary">🖨 Prenta reikning</button>
        <button onclick="window.close()" class="btn-secondary">Loka</button>
      </div>

      <div class="sheet">
        <header class="hdr">
          <div class="hdr-left">
            <div class="logo-circle">
              <svg viewBox="0 0 48 48" width="44" height="44" aria-hidden="true">
                <circle cx="24" cy="24" r="24" fill="#000"/>
                <path d="M24 9c-2 5-4 7-6 11-2.5 5 0 11 6 14-3-2-3-6 0-9 1.5 2 3 4 3 7 4-2 6-6 6-11 0-4-3-7-5-9 0 3-1 5-3 5 1-3 0-6-1-8z" fill="#fff"/>
              </svg>
            </div>
            <div class="hdr-co">
              <div class="co-name">Slökkvitæki ehf</div>
              <div class="co-tag">Brunakerfi</div>
              <div class="co-kt">Kt. 600508-0400</div>
            </div>
          </div>
          <div class="hdr-right">
            <div>Slökkvitæki ehf &nbsp;&nbsp;<strong>VSK nr. 98107</strong></div>
            <div>Helluhrauni 10</div>
            <div>220 Hafnarfjörður</div>
          </div>
        </header>

        <div class="meta-row">
          <div class="bill-to">
            <div class="cust-name">${esc(data.customer || '—')}</div>
          </div>
          <div class="invoice-meta">
            <div class="inv-title-row">
              <em>Reikningur</em>
              <span class="inv-num">${esc(data.num || '')}</span>
            </div>
            <div class="inv-meta-grid">
              <div class="lbl">Dagsetning:</div><div class="val">${esc(data.date || '')}</div>
              <div class="lbl">Greiðsl.skilm.:</div><div class="val">Krafa í banka 10 dagar</div>
              <div class="lbl">Afh.skilm.:</div><div class="val">Skilmáli1</div>
              <div class="lbl">Starfsmaður:</div><div class="val">Haukur Valdimarsson</div>
              <div class="lbl">Tilvísun:</div><div class="val">${esc(data.phone || '')}</div>
              <div class="lbl">Raðnr.:</div><div class="val">${esc(data.num || '')}</div>
            </div>
          </div>
        </div>

        <table class="items">
          <thead>
            <tr>
              <th class="num-col">Vörunúmer</th>
              <th class="desc-col">Lýsing</th>
              <th class="qty-col">Fjöldi</th>
              <th class="unit-col">Einingaverð</th>
              <th class="amt-col">Upphæð</th>
              <th class="vsk-col">VSK</th>
            </tr>
          </thead>
          <tbody>${linesHTML}</tbody>
        </table>

        <div class="spacer"></div>

        <div class="totals-block">
          <div class="totals-line">
            <span class="lbl">Samtals fyrir Vsk.:</span>
            <span class="amt">${fmtAmt(data.subEx)}</span>
          </div>
          <div class="totals-line">
            <span class="lbl">2 = Sala með 24,0% Vsk: ${fmtAmt(data.subEx)},00</span>
            <span class="amt">${fmtAmt(data.vsk)}</span>
          </div>
          <div class="totals-line grand">
            <span class="lbl">Til greiðslu :</span>
            <span class="amt">${fmtAmt(data.total)}</span>
          </div>
        </div>

        <div class="footer">
          <div class="signature">
            <span class="lbl">Móttekið/Greitt:</span>
            <span class="line"></span>
          </div>
          <div class="disclaimer">Þessi reikningur er rafrænt ytra frumgagn skv. reglugerð nr. 505/2013.</div>
        </div>
      </div>
    `;
  }

  const NEW_CSS = `
    @page { size: A4; margin: 0; }
    @media print {
      .no-print { display: none !important; }
      body { background: #fff !important; padding: 0 !important; }
      .sheet { box-shadow: none !important; margin: 0 !important; padding: 18mm 16mm !important; }
    }
    html, body {
      font-family: Arial, Helvetica, 'Helvetica Neue', sans-serif;
      background: #f1f5f9;
      margin: 0;
      padding: 24px 16px;
      color: #000;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .no-print {
      max-width: 800px;
      margin: 0 auto 18px;
      text-align: center;
    }
    .no-print button {
      padding: 11px 22px;
      border-radius: 8px;
      font: inherit;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      border: none;
      margin: 0 4px;
    }
    .btn-primary { background: #1a7f4b; color: #fff; }
    .btn-primary:hover { background: #156c40; }
    .btn-secondary { background: #fff; color: #334155; border: 1px solid #cbd5e1 !important; }
    .btn-secondary:hover { background: #f8fafc; }

    .sheet {
      background: #fff;
      max-width: 800px;
      margin: 0 auto;
      padding: 22mm 16mm 18mm;
      box-shadow: 0 4px 24px rgba(15,23,42,.08);
      font-size: 10pt;
      line-height: 1.4;
      color: #000;
      min-height: 270mm;
      display: flex;
      flex-direction: column;
      box-sizing: border-box;
    }

    .hdr {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 22px;
    }
    .hdr-left {
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .logo-circle {
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: #000;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .hdr-co {
      line-height: 1.05;
    }
    .co-name {
      font-size: 22pt;
      font-weight: 800;
      letter-spacing: -0.01em;
    }
    .co-tag {
      font-size: 22pt;
      font-weight: 800;
      letter-spacing: -0.01em;
    }
    .co-kt {
      font-size: 7.5pt;
      color: #444;
      margin-top: 3px;
      letter-spacing: 0.04em;
    }
    .hdr-right {
      text-align: right;
      font-size: 10pt;
      line-height: 1.6;
      padding-top: 4px;
    }

    .meta-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
      margin: 18px 0 26px;
    }
    .bill-to { font-size: 10pt; line-height: 1.7; }
    .cust-name { font-size: 11pt; font-weight: 400; }
    .cust-line { color: #000; }
    .cust-ref { margin-top: 14px; font-size: 9pt; }

    .invoice-meta { font-size: 10pt; }
    .inv-title-row {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      border-bottom: 1px solid #000;
      padding-bottom: 4px;
      margin-bottom: 8px;
    }
    .inv-title-row em {
      font-style: italic;
      font-size: 18pt;
      font-weight: 700;
      letter-spacing: -0.01em;
    }
    .inv-num {
      font-size: 14pt;
      font-weight: 700;
    }
    .inv-meta-grid {
      display: grid;
      grid-template-columns: auto 1fr;
      gap: 1px 14px;
      font-size: 10pt;
    }
    .inv-meta-grid .lbl { color: #000; }
    .inv-meta-grid .val { text-align: right; }

    .items {
      width: 100%;
      border-collapse: collapse;
      margin: 6px 0 0;
      font-size: 10pt;
    }
    .items thead th {
      text-align: left;
      font-weight: 700;
      border-top: 0.6pt solid #000;
      border-bottom: 0.6pt solid #000;
      padding: 4px 6px;
      font-size: 9.5pt;
    }
    .items th.num-col { width: 9%; }
    .items th.desc-col { width: 36%; }
    .items th.qty-col { width: 9%; text-align: right; }
    .items th.unit-col { width: 16%; text-align: right; }
    .items th.amt-col { width: 18%; text-align: right; }
    .items th.vsk-col { width: 6%; text-align: right; padding-right: 0; }
    .items td {
      padding: 4px 6px;
      vertical-align: top;
      font-size: 10pt;
    }
    .items td.num-col { color: #000; }
    .items td.qty-col, .items td.unit-col, .items td.amt-col, .items td.vsk-col {
      text-align: right;
      white-space: nowrap;
    }
    .items td.vsk-col { padding-right: 0; }

    .spacer { flex: 1 1 auto; min-height: 30mm; }

    .totals-block {
      margin-top: 12px;
      margin-left: 45%;
      font-size: 10.5pt;
    }
    .totals-line {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      padding: 5px 0;
      border-top: 0.6pt solid #000;
    }
    .totals-line .amt { font-weight: 700; padding-left: 16px; white-space: nowrap; }
    .totals-line.grand {
      font-weight: 700;
      border-bottom: 0.6pt solid #000;
      padding: 7px 0;
    }

    .footer {
      margin-top: 18px;
      font-size: 9pt;
    }
    .signature {
      display: flex;
      align-items: baseline;
      gap: 8px;
    }
    .signature .lbl { white-space: nowrap; }
    .signature .line {
      flex: 1;
      max-width: 260px;
      border-bottom: 0.6pt solid #000;
      height: 1.2em;
    }
    .disclaimer {
      margin-top: 16px;
      font-size: 8pt;
      color: #444;
    }
  `;

  function rewrite(win) {
    const doc = win.document;
    let data;
    try { data = extractData(doc); }
    catch (e) { console.warn('[receipt redesign] extract failed', e); return; }
    if (!data || (!data.num && !data.lines.length)) return;

    // Replace head: keep title, replace styles
    const oldStyles = doc.querySelectorAll('style, link[rel=stylesheet]');
    oldStyles.forEach(s => s.remove());
    const styleEl = doc.createElement('style');
    styleEl.textContent = NEW_CSS;
    doc.head.appendChild(styleEl);

    // Replace body
    doc.body.innerHTML = buildHTML(data);
    doc.title = 'Reikningur ' + (data.num || '');
  }

  window.SalaReceiptRedesign = { rewrite, version: 'v1' };
})();
/* === END SALA RECEIPT REDESIGN === */

/* === BOKHALDS YFIRLIT v1.1 === */
/* Detailed accounting overview of every sale in the system.
   - New nav button "📊 Bókhalds yfirlit" + dedicated view
   - Period filter (date range with quick presets), customer/product search,
     payment-method and salesperson dropdowns
   - Summary cards: total sales, ex-VAT, VSK 24%, VSK 11%, # sales, # customers
   - Sortable table (num/date/customer/staff/lines/ex/vsk/total/payment)
   - Click any row → expands line-item detail (qty, vsk%, unit price ex VAT,
     line total ex/inc VAT, product reference)
   - CSV export: summary (one row per sale) and detailed (one row per line item)
     with UTF-8 BOM, semicolon separator, Icelandic decimal comma — opens
     directly in Excel
   - Pulls from solur table (joins vidskiptavinir for kennitala/contact info) */
(() => {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (window.__bokhaldsInstalled) return;
  window.__bokhaldsInstalled = true;

  const VIEW_ID = 'view-bokhalds-yfirlit';

  function getSB() {
    if (!window.supabase || !window.SUPABASE_URL || !window.SUPABASE_KEY) return null;
    if (!window.__byaSB) window.__byaSB = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_KEY);
    return window.__byaSB;
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    }[c]));
  }
  function fmtKr(n) {
    if (n == null || isNaN(n)) return '';
    return Math.round(n).toLocaleString('is-IS').replace(/,/g, '.') + ' kr';
  }
  function fmtNum(n) {
    if (n == null || isNaN(n)) return '';
    return Math.round(n).toLocaleString('is-IS').replace(/,/g, '.');
  }
  function fmtDate(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d)) return '';
    return d.getDate().toString().padStart(2,'0') + '.' + (d.getMonth()+1).toString().padStart(2,'0') + '.' + d.getFullYear() + ' ' + d.getHours().toString().padStart(2,'0') + ':' + d.getMinutes().toString().padStart(2,'0');
  }
  function fmtDateOnly(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d)) return '';
    return d.getFullYear() + '-' + (d.getMonth()+1).toString().padStart(2,'0') + '-' + d.getDate().toString().padStart(2,'0');
  }
  function csvFmt(n) {
    // Icelandic: decimal comma, no thousands separator
    if (n == null || isNaN(n)) return '';
    return Math.round(n * 100) / 100 + '';
  }
  function ktFromName(name) {
    // "Vidskiptavinur 150486-2389" → "150486-2389"
    const m = (name || '').match(/(\d{6}-?\d{4})/);
    return m ? m[1] : '';
  }

  // ----- Styles -----
  const STYLE_ID = 'bokhalds-style';
  if (!document.getElementById(STYLE_ID)) {
    const s = document.createElement('style');
    s.id = STYLE_ID;
    s.textContent = `
      #${VIEW_ID} { padding: 0; }
      #${VIEW_ID} .by-wrap {
        max-width: 1400px; margin: 0 auto; padding: 20px 16px 40px;
        font-family: inherit; color: #0f172a;
      }
      #${VIEW_ID} .by-header {
        display: flex; justify-content: space-between; align-items: flex-end;
        gap: 20px; margin-bottom: 16px; flex-wrap: wrap;
      }
      #${VIEW_ID} .by-header h1 {
        margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.01em;
        display: flex; align-items: center; gap: 10px;
      }
      #${VIEW_ID} .by-sub {
        font-size: 13px; color: #64748b; margin-top: 4px;
      }
      #${VIEW_ID} .by-summary {
        display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
        gap: 10px; margin-bottom: 18px;
      }
      #${VIEW_ID} .by-card {
        background: #fff; border: 1px solid #e2e8f0; border-radius: 10px;
        padding: 12px 14px; line-height: 1.2;
      }
      #${VIEW_ID} .by-card .lbl {
        font-size: 10px; color: #64748b; font-weight: 600;
        text-transform: uppercase; letter-spacing: 0.04em;
      }
      #${VIEW_ID} .by-card .val {
        font-size: 20px; font-weight: 700; margin-top: 4px; color: #0f172a;
      }
      #${VIEW_ID} .by-card .sub {
        font-size: 11px; color: #64748b; margin-top: 2px;
      }
      #${VIEW_ID} .by-card.accent { background: #eff6ff; border-color: #bfdbfe; }
      #${VIEW_ID} .by-card.accent .val { color: #1d4ed8; }
      #${VIEW_ID} .by-card.warn { background: #fef3c7; border-color: #fde68a; }
      #${VIEW_ID} .by-card.warn .val { color: #92400e; }

      #${VIEW_ID} .by-filters {
        background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px;
        padding: 10px 12px; margin-bottom: 12px;
      }
      #${VIEW_ID} .by-row {
        display: flex; gap: 8px; flex-wrap: wrap; align-items: center;
        margin: 4px 0;
      }
      #${VIEW_ID} .by-row label {
        font-size: 11px; color: #475569; font-weight: 600;
        min-width: 60px; text-transform: uppercase; letter-spacing: 0.04em;
      }
      #${VIEW_ID} .by-input {
        padding: 6px 10px; border: 1px solid #cbd5e1; border-radius: 6px;
        font: inherit; font-size: 13px; background: #fff; color: #0f172a;
        outline: none;
      }
      #${VIEW_ID} .by-input:focus { border-color: #3b82f6; }
      #${VIEW_ID} .by-search { flex: 1; min-width: 180px; }
      #${VIEW_ID} .by-preset {
        background: #fff; border: 1px solid #cbd5e1; border-radius: 6px;
        padding: 6px 10px; font: inherit; font-size: 12px; cursor: pointer;
        color: #475569;
      }
      #${VIEW_ID} .by-preset:hover { background: #f1f5f9; border-color: #94a3b8; }
      #${VIEW_ID} .by-preset.active { background: #2563eb; color: #fff; border-color: #2563eb; }

      #${VIEW_ID} .by-actions {
        display: flex; gap: 8px; flex-wrap: wrap; align-items: center;
        margin: 12px 0;
      }
      #${VIEW_ID} .by-btn {
        padding: 8px 14px; border: 1px solid #cbd5e1; border-radius: 8px;
        background: #fff; cursor: pointer; font-size: 13px; color: #334155;
        font-family: inherit; font-weight: 500;
      }
      #${VIEW_ID} .by-btn:hover { background: #f8fafc; border-color: #94a3b8; }
      #${VIEW_ID} .by-btn.primary {
        background: #2563eb; color: #fff; border-color: #2563eb;
      }
      #${VIEW_ID} .by-btn.primary:hover { background: #1d4ed8; }
      #${VIEW_ID} .by-count {
        font-size: 12px; color: #64748b; margin-left: auto;
      }

      #${VIEW_ID} .by-table-wrap {
        background: #fff; border: 1px solid #e2e8f0; border-radius: 10px;
        overflow: hidden;
      }
      #${VIEW_ID} table.by-table {
        width: 100%; border-collapse: collapse; font-size: 13px;
      }
      #${VIEW_ID} .by-table thead th {
        background: #f8fafc; text-align: left; padding: 10px 12px;
        font-size: 11px; font-weight: 700; color: #475569;
        text-transform: uppercase; letter-spacing: 0.04em;
        border-bottom: 1px solid #e2e8f0;
        cursor: pointer; user-select: none; white-space: nowrap;
      }
      #${VIEW_ID} .by-table thead th:hover { background: #f1f5f9; }
      #${VIEW_ID} .by-table th .arr { color: #94a3b8; margin-left: 4px; font-size: 10px; }
      #${VIEW_ID} .by-table th.sorted .arr { color: #2563eb; }
      #${VIEW_ID} .by-table th.num-col { text-align: right; }
      #${VIEW_ID} .by-table tbody td {
        padding: 9px 12px; border-bottom: 1px solid #f1f5f9;
        vertical-align: top;
      }
      #${VIEW_ID} .by-table tbody td.num-col {
        text-align: right; font-variant-numeric: tabular-nums;
      }
      #${VIEW_ID} .by-table tbody tr.by-sale-row { cursor: pointer; transition: background .12s; }
      #${VIEW_ID} .by-table tbody tr.by-sale-row:hover { background: #f8fafc; }
      #${VIEW_ID} .by-table tbody tr.by-sale-row.expanded { background: #eff6ff; }
      #${VIEW_ID} .by-table tbody tr.by-sale-row.expanded td { border-bottom: none; }
      #${VIEW_ID} .by-table tbody tr.by-detail-row td {
        background: #f8fafc; padding: 0; border-bottom: 1px solid #e2e8f0;
      }
      #${VIEW_ID} .by-detail-inner {
        padding: 12px 16px;
      }
      #${VIEW_ID} .by-detail-table {
        width: 100%; border-collapse: collapse; font-size: 12px;
        background: #fff; border-radius: 6px; overflow: hidden;
        border: 1px solid #e2e8f0;
      }
      #${VIEW_ID} .by-detail-table th {
        background: #f1f5f9; padding: 6px 10px; text-align: left;
        font-size: 10px; font-weight: 700; color: #64748b;
        text-transform: uppercase; letter-spacing: 0.04em;
      }
      #${VIEW_ID} .by-detail-table th.num-col { text-align: right; }
      #${VIEW_ID} .by-detail-table td { padding: 6px 10px; border-top: 1px solid #f1f5f9; }
      #${VIEW_ID} .by-detail-table td.num-col { text-align: right; font-variant-numeric: tabular-nums; }
      #${VIEW_ID} .by-detail-meta {
        display: flex; gap: 24px; flex-wrap: wrap; margin-bottom: 10px;
        font-size: 12px;
      }
      #${VIEW_ID} .by-detail-meta .item .lbl {
        font-size: 10px; color: #64748b; text-transform: uppercase; letter-spacing: 0.04em;
        font-weight: 600; display: block;
      }
      #${VIEW_ID} .by-detail-meta .item .val { color: #0f172a; font-weight: 500; }

      #${VIEW_ID} .by-empty {
        padding: 60px 20px; text-align: center; color: #94a3b8;
        font-style: italic;
      }
      #${VIEW_ID} .by-loading {
        padding: 40px 20px; text-align: center; color: #64748b;
      }
      #${VIEW_ID} .by-payment-pill {
        display: inline-block; padding: 2px 8px; border-radius: 99px;
        font-size: 11px; font-weight: 600; background: #e0e7ff; color: #3730a3;
      }
      #${VIEW_ID} .by-payment-pill.kort { background: #d1fae5; color: #065f46; }
      #${VIEW_ID} .by-payment-pill.reidufe { background: #fef3c7; color: #92400e; }
      #${VIEW_ID} .by-payment-pill.reikn { background: #ede9fe; color: #5b21b6; }
      #${VIEW_ID} .by-num-cell {
        font-family: 'SF Mono', Menlo, Consolas, monospace; font-size: 12px;
      }

      @media print {
        body * { visibility: hidden; }
        #${VIEW_ID}, #${VIEW_ID} * { visibility: visible; }
        #${VIEW_ID} { position: absolute; left: 0; top: 0; width: 100%; }
        #${VIEW_ID} .by-actions, #${VIEW_ID} .by-filters { display: none; }
        #${VIEW_ID} .by-table thead th { background: #f1f5f9 !important; -webkit-print-color-adjust: exact; }
      }
    `;
    document.head.appendChild(s);
  }

  // ----- View HTML -----
  function buildViewHTML() {
    return `
      <main class="main-panel">
        <div class="by-wrap">
          <div class="by-header">
            <div>
              <h1>📊 Bókhalds yfirlit</h1>
              <div class="by-sub">Yfirlit yfir allar sölur með VSK-sundurliðun og útflutningi til CSV fyrir bókhald og skattaskil</div>
            </div>
          </div>

          <div class="by-summary" id="by-summary"></div>

          <div class="by-filters">
            <div class="by-row">
              <label>Tímabil</label>
              <input type="date" id="by-from" class="by-input" title="Frá dagsetningu">
              <span style="color:#94a3b8;font-size:12px;">→</span>
              <input type="date" id="by-to" class="by-input" title="Til dagsetningar">
              <button class="by-preset" data-preset="all">Allt</button>
              <button class="by-preset" data-preset="today">Í dag</button>
              <button class="by-preset" data-preset="thisWeek">Þessa viku</button>
              <button class="by-preset" data-preset="thisMonth">Þennan mánuð</button>
              <button class="by-preset" data-preset="lastMonth">Síðasta mánuð</button>
              <button class="by-preset" data-preset="thisYear">Þetta ár</button>
              <button class="by-preset" data-preset="lastYear">Síðasta ár</button>
            </div>
            <div class="by-row">
              <label>Leita</label>
              <input type="search" id="by-search" class="by-input by-search" placeholder="Salnúmer, viðskiptavinur, vöruheiti, kennitala…">
              <select id="by-payment" class="by-input"><option value="">— Allar greiðslur —</option></select>
              <select id="by-staff" class="by-input"><option value="">— Allir starfsmenn —</option></select>
            </div>
          </div>

          <div class="by-actions">
            <button class="by-btn primary" id="by-csv-summary">📥 CSV samantekt</button>
            <button class="by-btn primary" id="by-csv-detailed">📥 CSV sundurliðað</button>
            <button class="by-btn" id="by-print">🖨 Prenta</button>
            <button class="by-btn" id="by-refresh">🔄 Endurnýja</button>
            <span class="by-count" id="by-count"></span>
          </div>

          <div class="by-table-wrap">
            <table class="by-table">
              <thead>
                <tr>
                  <th data-sort="num">Sala<span class="arr"></span></th>
                  <th data-sort="date" class="sorted">Dags.<span class="arr">▼</span></th>
                  <th data-sort="customer">Viðskiptavinur<span class="arr"></span></th>
                  <th data-sort="staff">Starfsm.<span class="arr"></span></th>
                  <th data-sort="lines" class="num-col">Lín.<span class="arr"></span></th>
                  <th data-sort="ex" class="num-col">Án VSK<span class="arr"></span></th>
                  <th data-sort="vsk" class="num-col">VSK<span class="arr"></span></th>
                  <th data-sort="total" class="num-col">Samtals<span class="arr"></span></th>
                  <th data-sort="payment">Greitt</th>
                </tr>
              </thead>
              <tbody id="by-tbody">
                <tr><td colspan="9"><div class="by-loading">Hleður sölum…</div></td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </main>
    `;
  }

  // ----- State -----
  let allSales = [];
  let customerMap = new Map(); // id -> { kennitala, simi, netfang, ... }
  let productMap = new Map();  // id -> { nafn, ... }
  let filtered = [];
  let sortKey = 'date';
  let sortDir = 'desc';
  const expanded = new Set();
  let activePreset = 'all';

  // ----- Data load -----
  async function loadAllSales() {
    const SB = getSB();
    if (!SB) throw new Error('Supabase not initialized');
    const [salesRes, custRes, prodRes] = await Promise.all([
      SB.from('solur').select('id,num,starfsmadur,customer_nafn,customer_id,linur,upphaed_an_vsk,vsk_upphaed,afslattur,samtals,greitt_med,athugasemdir,created_at').order('created_at', { ascending: false }),
      SB.from('vidskiptavinir').select('id,kennitala,nafn,simi,netfang'),
      SB.from('vorur').select('id,nafn,flokkur')
    ]);
    if (salesRes.error) throw salesRes.error;
    allSales = (salesRes.data || []).map(s => {
      const linur = Array.isArray(s.linur) ? s.linur : [];
      // Recompute totals from linur for safety (fallback to stored values)
      const stEx = linur.reduce((a, l) => a + ((+l.qty||0) * (+l.unit_price_ex_vat||0)), 0);
      const stVsk = linur.reduce((a, l) => a + ((+l.qty||0) * (+l.unit_price_ex_vat||0) * ((+l.vsk_pct||0)/100)), 0);
      return {
        id: s.id,
        num: s.num || '',
        date: s.created_at,
        customer: s.customer_nafn || '',
        customer_id: s.customer_id,
        staff: s.starfsmadur || '',
        lines: linur,
        ex: s.upphaed_an_vsk != null ? +s.upphaed_an_vsk : stEx,
        vsk: s.vsk_upphaed != null ? +s.vsk_upphaed : stVsk,
        afslattur: +s.afslattur || 0,
        total: s.samtals != null ? +s.samtals : (stEx + stVsk),
        payment: s.greitt_med || '',
        notes: s.athugasemdir || ''
      };
    });
    customerMap = new Map((custRes.data || []).map(c => [c.id, c]));
    productMap = new Map((prodRes.data || []).map(p => [p.id, p]));
  }

  function getKt(sale) {
    if (sale.customer_id && customerMap.has(sale.customer_id)) {
      return customerMap.get(sale.customer_id).kennitala || '';
    }
    return ktFromName(sale.customer);
  }

  // ----- Filters -----
  function getRangeFromInputs() {
    const fromEl = document.getElementById('by-from');
    const toEl = document.getElementById('by-to');
    return {
      from: fromEl?.value || '',
      to: toEl?.value || ''
    };
  }
  function applyFilters() {
    const { from, to } = getRangeFromInputs();
    const q = (document.getElementById('by-search')?.value || '').trim().toLowerCase();
    const pay = document.getElementById('by-payment')?.value || '';
    const staff = document.getElementById('by-staff')?.value || '';
    const fromTs = from ? new Date(from + 'T00:00:00').getTime() : -Infinity;
    const toTs = to ? new Date(to + 'T23:59:59').getTime() : Infinity;
    filtered = allSales.filter(s => {
      const ts = new Date(s.date).getTime();
      if (ts < fromTs || ts > toTs) return false;
      if (pay && s.payment !== pay) return false;
      if (staff && s.staff !== staff) return false;
      if (q) {
        const hay = [s.num, s.customer, s.staff, s.notes, getKt(s),
          ...s.lines.map(l => (l.desc||'') + ' ' + (l.ref||''))].join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }

  // ----- Presets -----
  function applyPreset(preset) {
    activePreset = preset;
    const now = new Date();
    let from = '', to = '';
    const fmt = d => d.getFullYear() + '-' + (d.getMonth()+1).toString().padStart(2,'0') + '-' + d.getDate().toString().padStart(2,'0');
    switch (preset) {
      case 'today':
        from = to = fmt(now); break;
      case 'thisWeek': {
        const day = (now.getDay() + 6) % 7; // monday = 0
        const monday = new Date(now); monday.setDate(now.getDate() - day);
        from = fmt(monday); to = fmt(now); break;
      }
      case 'thisMonth':
        from = fmt(new Date(now.getFullYear(), now.getMonth(), 1));
        to = fmt(now); break;
      case 'lastMonth': {
        const f = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const t = new Date(now.getFullYear(), now.getMonth(), 0);
        from = fmt(f); to = fmt(t); break;
      }
      case 'thisYear':
        from = fmt(new Date(now.getFullYear(), 0, 1));
        to = fmt(now); break;
      case 'lastYear':
        from = fmt(new Date(now.getFullYear() - 1, 0, 1));
        to = fmt(new Date(now.getFullYear() - 1, 11, 31)); break;
      case 'all':
      default:
        from = ''; to = '';
    }
    const fromEl = document.getElementById('by-from');
    const toEl = document.getElementById('by-to');
    if (fromEl) fromEl.value = from;
    if (toEl) toEl.value = to;
    document.querySelectorAll('#'+VIEW_ID+' .by-preset').forEach(b => {
      b.classList.toggle('active', b.dataset.preset === preset);
    });
  }

  // ----- Sort -----
  function sortSales() {
    const key = sortKey;
    const dir = sortDir === 'asc' ? 1 : -1;
    const get = {
      num: s => s.num,
      date: s => s.date,
      customer: s => (s.customer || '').toLowerCase(),
      staff: s => (s.staff || '').toLowerCase(),
      lines: s => s.lines.length,
      ex: s => s.ex,
      vsk: s => s.vsk,
      total: s => s.total,
      payment: s => (s.payment || '').toLowerCase()
    }[key];
    filtered.sort((a, b) => {
      const av = get(a), bv = get(b);
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === 'number') return (av - bv) * dir;
      return (av < bv ? -1 : av > bv ? 1 : 0) * dir;
    });
  }

  // ----- Render -----
  function renderSummary() {
    const cards = [];
    const totalSamtals = filtered.reduce((a, s) => a + (s.total || 0), 0);
    const totalEx = filtered.reduce((a, s) => a + (s.ex || 0), 0);
    // Per-rate VSK breakdown
    const byRate = new Map();
    for (const s of filtered) {
      for (const l of s.lines) {
        const rate = +l.vsk_pct || 0;
        const lineEx = (+l.qty||0) * (+l.unit_price_ex_vat||0);
        const lineVsk = lineEx * (rate/100);
        const cur = byRate.get(rate) || { ex: 0, vsk: 0 };
        cur.ex += lineEx; cur.vsk += lineVsk;
        byRate.set(rate, cur);
      }
    }
    const customers = new Set();
    for (const s of filtered) {
      customers.add(s.customer_id || s.customer || '');
    }
    cards.push({ lbl: 'Heildarsala', val: fmtKr(totalSamtals), cls: 'accent', sub: filtered.length + (filtered.length === 1 ? ' sala' : ' sölur') });
    cards.push({ lbl: 'Án VSK', val: fmtKr(totalEx) });
    // VSK by rate
    const sortedRates = [...byRate.keys()].sort((a,b) => b - a);
    for (const rate of sortedRates) {
      const v = byRate.get(rate);
      cards.push({ lbl: 'VSK ' + rate + '%', val: fmtKr(v.vsk), sub: 'af ' + fmtKr(v.ex) });
    }
    cards.push({ lbl: 'Viðskiptavinir', val: customers.size + '', sub: filtered.length ? Math.round(filtered.length / customers.size * 10) / 10 + ' sölur að meðaltali' : '' });
    const html = cards.map(c =>
      '<div class="by-card' + (c.cls ? ' ' + c.cls : '') + '">'
      + '<div class="lbl">' + esc(c.lbl) + '</div>'
      + '<div class="val">' + esc(c.val) + '</div>'
      + (c.sub ? '<div class="sub">' + esc(c.sub) + '</div>' : '')
      + '</div>'
    ).join('');
    document.getElementById('by-summary').innerHTML = html;
  }

  function payClass(p) {
    const x = (p || '').toLowerCase();
    if (/kort/.test(x)) return 'kort';
    if (/reiðu|reidu/.test(x)) return 'reidufe';
    if (/reikn/.test(x)) return 'reikn';
    return '';
  }

  function renderTable() {
    const tbody = document.getElementById('by-tbody');
    if (!tbody) return;
    if (!filtered.length) {
      tbody.innerHTML = '<tr><td colspan="9"><div class="by-empty">Engar sölur fundust á völdu tímabili</div></td></tr>';
      document.getElementById('by-count').textContent = '';
      return;
    }
    document.getElementById('by-count').textContent = filtered.length + ' sölur';
    const rows = [];
    for (const s of filtered) {
      const isOpen = expanded.has(String(s.id));
      rows.push(
        '<tr class="by-sale-row' + (isOpen ? ' expanded' : '') + '" data-id="' + esc(s.id) + '">'
        + '<td class="by-num-cell">' + esc(s.num) + '</td>'
        + '<td>' + esc(fmtDate(s.date)) + '</td>'
        + '<td>' + esc(s.customer || '—') + (getKt(s) ? '<div style="font-size:11px;color:#64748b;">' + esc(getKt(s)) + '</div>' : '') + '</td>'
        + '<td>' + esc(s.staff || '') + '</td>'
        + '<td class="num-col">' + s.lines.length + '</td>'
        + '<td class="num-col">' + fmtNum(s.ex) + '</td>'
        + '<td class="num-col">' + fmtNum(s.vsk) + '</td>'
        + '<td class="num-col" style="font-weight:700;">' + fmtNum(s.total) + '</td>'
        + '<td><span class="by-payment-pill ' + payClass(s.payment) + '">' + esc(s.payment || '—') + '</span></td>'
        + '</tr>'
      );
      if (isOpen) {
        rows.push('<tr class="by-detail-row"><td colspan="9">' + renderDetail(s) + '</td></tr>');
      }
    }
    tbody.innerHTML = rows.join('');
    // Row toggle is wired via delegation on tbody (in init), not per-row
  }

  function renderDetail(sale) {
    const lineRows = sale.lines.map(l => {
      const qty = +l.qty || 0;
      const unitEx = +l.unit_price_ex_vat || 0;
      const rate = +l.vsk_pct || 0;
      const lineEx = qty * unitEx;
      const lineVsk = lineEx * (rate / 100);
      const lineInc = lineEx + lineVsk;
      const product = l.product_id ? productMap.get(l.product_id) : null;
      return `<tr>
        <td>${esc(l.product_id != null ? '#' + l.product_id : '')}</td>
        <td>${esc(l.desc || (product ? product.nafn : ''))}${l.ref ? ' <span style="color:#94a3b8;font-size:11px;">· ' + esc(l.ref) + '</span>' : ''}</td>
        <td>${esc(l.type || '')}</td>
        <td class="num-col">${qty.toLocaleString('is-IS')}</td>
        <td class="num-col">${fmtNum(unitEx)}</td>
        <td class="num-col">${rate}%</td>
        <td class="num-col">${fmtNum(lineEx)}</td>
        <td class="num-col">${fmtNum(lineVsk)}</td>
        <td class="num-col" style="font-weight:600;">${fmtNum(lineInc)}</td>
      </tr>`;
    }).join('');
    return `
      <div class="by-detail-inner">
        <div class="by-detail-meta">
          <div class="item"><span class="lbl">Salnúmer</span><span class="val">${esc(sale.num)}</span></div>
          <div class="item"><span class="lbl">Dagsetning</span><span class="val">${esc(fmtDate(sale.date))}</span></div>
          <div class="item"><span class="lbl">Kennitala</span><span class="val">${esc(getKt(sale) || '—')}</span></div>
          <div class="item"><span class="lbl">Starfsmaður</span><span class="val">${esc(sale.staff || '—')}</span></div>
          <div class="item"><span class="lbl">Greiðsluaðferð</span><span class="val">${esc(sale.payment || '—')}</span></div>
          ${sale.afslattur ? `<div class="item"><span class="lbl">Afsláttur</span><span class="val">${fmtKr(sale.afslattur)}</span></div>` : ''}
          ${sale.notes ? `<div class="item"><span class="lbl">Athugasemd</span><span class="val">${esc(sale.notes)}</span></div>` : ''}
        </div>
        <table class="by-detail-table">
          <thead>
            <tr>
              <th>Vöru-ID</th>
              <th>Lýsing</th>
              <th>Tegund</th>
              <th class="num-col">Magn</th>
              <th class="num-col">Ein.verð án VSK</th>
              <th class="num-col">VSK %</th>
              <th class="num-col">Lína án VSK</th>
              <th class="num-col">VSK upph.</th>
              <th class="num-col">Lína m. VSK</th>
            </tr>
          </thead>
          <tbody>${lineRows}</tbody>
        </table>
      </div>
    `;
  }

  function renderSortHeaders() {
    document.querySelectorAll('#'+VIEW_ID+' .by-table thead th').forEach(th => {
      const k = th.dataset.sort;
      const arr = th.querySelector('.arr');
      if (k === sortKey) {
        th.classList.add('sorted');
        if (arr) arr.textContent = sortDir === 'asc' ? '▲' : '▼';
      } else {
        th.classList.remove('sorted');
        if (arr) arr.textContent = '';
      }
    });
  }

  function renderAll() {
    sortSales();
    renderSortHeaders();
    renderSummary();
    renderTable();
  }

  function populateFilterDropdowns() {
    const pays = new Set(), staffs = new Set();
    for (const s of allSales) {
      if (s.payment) pays.add(s.payment);
      if (s.staff) staffs.add(s.staff);
    }
    const paySel = document.getElementById('by-payment');
    const staffSel = document.getElementById('by-staff');
    if (paySel) {
      const cur = paySel.value;
      paySel.innerHTML = '<option value="">— Allar greiðslur —</option>' +
        [...pays].sort().map(p => '<option value="' + esc(p) + '">' + esc(p) + '</option>').join('');
      paySel.value = cur;
    }
    if (staffSel) {
      const cur = staffSel.value;
      staffSel.innerHTML = '<option value="">— Allir starfsmenn —</option>' +
        [...staffs].sort().map(p => '<option value="' + esc(p) + '">' + esc(p) + '</option>').join('');
      staffSel.value = cur;
    }
  }

  // ----- CSV Export -----
  function csvField(v) {
    if (v == null) return '';
    const s = String(v);
    if (/[";\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  }
  function downloadCSV(filename, header, rows) {
    const sep = ';';
    const lines = [header.join(sep), ...rows.map(r => r.map(csvField).join(sep))];
    const csv = '\ufeff' + lines.join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1000);
  }
  function exportSummaryCSV() {
    const header = ['Salnúmer','Dagsetning','Tími','Viðskiptavinur','Kennitala','Starfsmaður','Fjöldi lína','Án VSK','VSK','Afsláttur','Samtals','Greitt með','Athugasemdir'];
    const rows = filtered.map(s => {
      const d = new Date(s.date);
      return [
        s.num,
        fmtDateOnly(s.date),
        d.getHours().toString().padStart(2,'0') + ':' + d.getMinutes().toString().padStart(2,'0'),
        s.customer,
        getKt(s),
        s.staff,
        s.lines.length,
        csvFmt(s.ex).replace('.', ','),
        csvFmt(s.vsk).replace('.', ','),
        csvFmt(s.afslattur).replace('.', ','),
        csvFmt(s.total).replace('.', ','),
        s.payment,
        s.notes
      ];
    });
    const today = fmtDateOnly(new Date().toISOString());
    downloadCSV('bokhalds-yfirlit-samantekt-' + today + '.csv', header, rows);
  }
  function exportDetailedCSV() {
    const header = ['Salnúmer','Dagsetning','Tími','Viðskiptavinur','Kennitala','Starfsmaður','Vöru-ID','Vörutegund','Lýsing','Tilvísun','Magn','Ein.verð án VSK','Lína án VSK','VSK %','VSK upphæð','Lína m. VSK','Greitt með','Athugasemdir'];
    const rows = [];
    for (const s of filtered) {
      const d = new Date(s.date);
      const hm = d.getHours().toString().padStart(2,'0') + ':' + d.getMinutes().toString().padStart(2,'0');
      const date = fmtDateOnly(s.date);
      const kt = getKt(s);
      for (const l of s.lines) {
        const qty = +l.qty || 0;
        const unitEx = +l.unit_price_ex_vat || 0;
        const rate = +l.vsk_pct || 0;
        const lineEx = qty * unitEx;
        const lineVsk = lineEx * (rate / 100);
        const lineInc = lineEx + lineVsk;
        rows.push([
          s.num, date, hm,
          s.customer, kt, s.staff,
          l.product_id != null ? l.product_id : '',
          l.type || '',
          l.desc || '',
          l.ref || '',
          qty.toString().replace('.', ','),
          csvFmt(unitEx).replace('.', ','),
          csvFmt(lineEx).replace('.', ','),
          rate,
          csvFmt(lineVsk).replace('.', ','),
          csvFmt(lineInc).replace('.', ','),
          s.payment, s.notes
        ]);
      }
    }
    const today = fmtDateOnly(new Date().toISOString());
    downloadCSV('bokhalds-yfirlit-sundurlidad-' + today + '.csv', header, rows);
  }

  // ----- Init / wiring -----
  let initialized = false;
  async function init() {
    if (initialized) return;
    initialized = true;
    try {
      await loadAllSales();
    } catch (e) {
      const tbody = document.getElementById('by-tbody');
      if (tbody) tbody.innerHTML = '<tr><td colspan="9"><div class="by-empty" style="color:#dc2626;">Villa við að sækja sölur: ' + esc(e.message) + '</div></td></tr>';
      return;
    }
    populateFilterDropdowns();

    const onChange = () => { applyFilters(); renderAll(); };
    document.getElementById('by-from')?.addEventListener('change', () => { activePreset = 'custom'; document.querySelectorAll('#'+VIEW_ID+' .by-preset').forEach(b => b.classList.remove('active')); onChange(); });
    document.getElementById('by-to')?.addEventListener('change', () => { activePreset = 'custom'; document.querySelectorAll('#'+VIEW_ID+' .by-preset').forEach(b => b.classList.remove('active')); onChange(); });
    document.getElementById('by-search')?.addEventListener('input', onChange);
    document.getElementById('by-payment')?.addEventListener('change', onChange);
    document.getElementById('by-staff')?.addEventListener('change', onChange);

    document.querySelectorAll('#'+VIEW_ID+' .by-preset').forEach(b => {
      b.addEventListener('click', () => { applyPreset(b.dataset.preset); onChange(); });
    });

    document.querySelectorAll('#'+VIEW_ID+' .by-table thead th[data-sort]').forEach(th => {
      th.addEventListener('click', () => {
        const k = th.dataset.sort;
        if (sortKey === k) sortDir = sortDir === 'asc' ? 'desc' : 'asc';
        else { sortKey = k; sortDir = (k === 'date' || k === 'total' || k === 'ex' || k === 'vsk' || k === 'lines') ? 'desc' : 'asc'; }
        renderAll();
      });
    });

    document.getElementById('by-csv-summary')?.addEventListener('click', exportSummaryCSV);
    document.getElementById('by-csv-detailed')?.addEventListener('click', exportDetailedCSV);
    document.getElementById('by-print')?.addEventListener('click', () => window.print());
    document.getElementById('by-refresh')?.addEventListener('click', async () => {
      const btn = document.getElementById('by-refresh');
      btn.disabled = true; btn.textContent = '🔄 Hleður…';
      try { await loadAllSales(); populateFilterDropdowns(); applyFilters(); renderAll(); }
      finally { btn.disabled = false; btn.textContent = '🔄 Endurnýja'; }
    });

    // Delegated row-click handler — survives every renderTable() rebuild
    const tbody = document.getElementById('by-tbody');
    if (tbody) {
      tbody.addEventListener('click', (e) => {
        const tr = e.target.closest('.by-sale-row');
        if (!tr || !tbody.contains(tr)) return;
        const id = tr.dataset.id;
        if (expanded.has(id)) expanded.delete(id);
        else expanded.add(id);
        renderTable();
      });
    }

    applyPreset('all');
    applyFilters();
    renderAll();
  }

  // ----- View injection / nav -----
  function ensureView() {
    if (document.getElementById(VIEW_ID)) return;
    const views = document.querySelectorAll('.view');
    if (!views.length) return;
    const last = views[views.length - 1];
    const view = document.createElement('section');
    view.id = VIEW_ID;
    view.className = 'view';
    view.innerHTML = buildViewHTML();
    last.parentNode.insertBefore(view, last.nextSibling);
  }
  function ensureNavButton() {
    if (document.querySelector('.vnav-btn[data-bokhalds]')) return;
    const tekjurBtn = Array.from(document.querySelectorAll('.vnav-btn'))
      .find(b => /Tekjur/i.test(b.textContent));
    if (!tekjurBtn || !tekjurBtn.parentElement) return;
    const btn = document.createElement('button');
    btn.className = tekjurBtn.className.replace(/\bactive\b/g, '').trim();
    btn.setAttribute('data-bokhalds', '1');
    btn.setAttribute('data-view', 'bokhalds-yfirlit');
    btn.textContent = '📊 Bókhalds yfirlit';
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      switchToView();
    });
    tekjurBtn.parentElement.insertBefore(btn, tekjurBtn.nextSibling);
  }
  function switchToView() {
    ensureView();
    document.querySelectorAll('.view.active').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.vnav-btn.active').forEach(b => b.classList.remove('active'));
    const view = document.getElementById(VIEW_ID);
    if (view) view.classList.add('active');
    const btn = document.querySelector('.vnav-btn[data-bokhalds]');
    if (btn) btn.classList.add('active');
    setTimeout(init, 50);
  }

  ensureView();
  ensureNavButton();
  setTimeout(() => { ensureView(); ensureNavButton(); }, 500);
  setTimeout(() => { ensureView(); ensureNavButton(); }, 1500);
  const navObs = new MutationObserver(() => { ensureView(); ensureNavButton(); });
  navObs.observe(document.body, { childList: true, subtree: true });

  window.BokhaldsYfirlit = {
    open: switchToView,
    refresh: async () => { await loadAllSales(); populateFilterDropdowns(); applyFilters(); renderAll(); },
    version: 'v1.1'
  };
})();
/* === END BOKHALDS YFIRLIT === */

/* === MAPFIX KILL DOTS v2 === */
/* Removes the bigger orange (#f97316 / rgb(249,115,22)) SVG circle dots
   from the Þjónustutæki map's leaflet-overlay-pane.

   These are SVG <path> elements (radius 14 = 28px diameter) that are NOT
   filterable — they stay visible regardless of the green/red/all/overdue
   filter buttons. They live in .leaflet-overlay-pane SVG, not in the
   leaflet-marker-pane where the small HTML equipment dots and the car GPS
   icon live.

   This patch:
   1. Removes #f97316 SVG paths now and on every future SVG mutation
   2. Adds a CSS rule hiding any matching path immediately
   3. Does NOT touch the small HTML `.mapfix-marker` dots (small equipment
      pins — these are what the user wants to keep)
   4. Does NOT touch red `#dc2626` or green `#16a34a` paths (status filter
      indicators — Útrunnir / Í lagi)
   5. Does NOT touch the car GPS icon (rendered as small `#4C7BE1` /
      `#FFD500` / `#E0BC00` rectangles, very different fill colors) */
(() => {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (window.__mapfixKillDotsV2Installed) return;
  window.__mapfixKillDotsV2Installed = true;

  const ORANGE_FILLS = ['#f97316', '#F97316', 'rgb(249, 115, 22)', 'rgb(249,115,22)'];
  const STYLE_ID = 'mapfix-kill-dots-v2-style';

  function ensureStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const s = document.createElement('style');
    s.id = STYLE_ID;
    // Selector chain — every variant of how Leaflet may write the fill attribute
    s.textContent = [
      '#field-map-container .leaflet-overlay-pane svg path[fill="#f97316"],',
      '#field-map-container .leaflet-overlay-pane svg path[fill="#F97316"],',
      '#field-map-container .leaflet-overlay-pane svg path[stroke="#f97316"],',
      '#field-map-container .leaflet-overlay-pane svg path[stroke="#F97316"],',
      '.leaflet-overlay-pane svg path[fill="#f97316"],',
      '.leaflet-overlay-pane svg path[fill="#F97316"] {',
      '  display: none !important;',
      '  opacity: 0 !important;',
      '  pointer-events: none !important;',
      '  visibility: hidden !important;',
      '  fill: transparent !important;',
      '  stroke: transparent !important;',
      '  fill-opacity: 0 !important;',
      '  stroke-opacity: 0 !important;',
      '}'
    ].join('\n');
    document.head.appendChild(s);
  }

  function isOrangePath(el) {
    if (!el || el.tagName !== 'path') return false;
    const fill = el.getAttribute('fill') || '';
    const stroke = el.getAttribute('stroke') || '';
    if (ORANGE_FILLS.indexOf(fill) >= 0) return true;
    if (ORANGE_FILLS.indexOf(stroke) >= 0) return true;
    return false;
  }

  // Active sweep — detach existing orange paths from their parent <g>.
  function sweep(root) {
    const map = root || document.getElementById('field-map-container');
    if (!map) return 0;
    const overlay = map.querySelector('.leaflet-overlay-pane');
    if (!overlay) return 0;
    let removed = 0;
    overlay.querySelectorAll('svg path').forEach(p => {
      if (isOrangePath(p)) {
        try { p.parentNode && p.parentNode.removeChild(p); removed++; } catch (e) {}
      }
    });
    return removed;
  }

  // Watch the overlay-pane SVG for newly-added orange paths.
  let obs = null;
  function ensureObserver() {
    if (obs) return;
    const map = document.getElementById('field-map-container');
    if (!map) return;
    const overlay = map.querySelector('.leaflet-overlay-pane');
    if (!overlay) return;
    obs = new MutationObserver(muts => {
      let needsSweep = false;
      for (const m of muts) {
        for (const n of m.addedNodes) {
          if (n.nodeType === 1) {
            if (isOrangePath(n)) { needsSweep = true; break; }
            if (n.querySelector && n.querySelector('path[fill="#f97316"], path[fill="#F97316"]')) {
              needsSweep = true; break;
            }
          }
        }
        // Also watch attribute changes — Leaflet may set the d attr later.
        if (m.type === 'attributes' && m.target && isOrangePath(m.target)) {
          needsSweep = true;
        }
        if (needsSweep) break;
      }
      if (needsSweep) sweep(map);
    });
    obs.observe(overlay, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['fill', 'stroke', 'd']
    });
  }

  function run() {
    ensureStyle();
    sweep();
    ensureObserver();
  }

  run();
  setTimeout(run, 200);
  setTimeout(run, 1000);
  setTimeout(run, 3000);

  // Re-arm when the user switches into the field/Þjónustutæki view.
  document.addEventListener('click', e => {
    const t = e.target.closest && e.target.closest('button, a, [data-view]');
    if (!t) return;
    if (/Þjónustutæki|view-field/i.test((t.textContent || '') + ' ' + (t.dataset?.view || ''))) {
      setTimeout(run, 200);
      setTimeout(run, 800);
      setTimeout(run, 2000);
    }
  }, true);

  // Also re-sweep on filter button clicks (Allir / Útrunnir / Gjaldfallnir / Í lagi
  // / Uppfæra — they recreate paths in overlay-pane).
  document.addEventListener('click', e => {
    const t = e.target;
    if (!t || !t.classList) return;
    if (t.classList.contains('_mf_btn') || /Uppfæra/.test(t.textContent || '')) {
      setTimeout(() => sweep(), 80);
      setTimeout(() => sweep(), 400);
      setTimeout(() => sweep(), 1200);
    }
  }, true);

  window.MapfixKillDots = {
    sweep: () => sweep(),
    rearm: run,
    version: 'v2'
  };
})();
/* === END MAPFIX KILL DOTS === */

