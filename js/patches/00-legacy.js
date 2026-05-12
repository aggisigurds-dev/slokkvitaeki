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
  // No-op: takkinn "Setja \u00ed Reikning" hefur veri\u00F0 fjarl\u00E6g\u00F0ur 2026-05-08.
  // \u00CDtarlegri \u00FAtsk\u00FDring: notandi smellir n\u00FAna \u00E1 gr\u00E6na "\u00C1fram" takkann
  // og velur "Setja \u00ed reikning" sem grei\u00F0slua\u00F0fer\u00F0 \u00ed checkout-modal-inum,
  // svo a\u00F0 sj\u00E1lfst\u00E6\u00F0ur takki ne\u00F0an vi\u00F0 var ru\u00F0ningur.
  // Fj\u00E6rl\u00E6gum hann \u00FArra ef hann var settur inn \u00E1\u00F0ur en patch-i\u00F0 deplodi.
  var existing = document.getElementById('pos-invoice');
  if (existing && existing.parentNode) existing.parentNode.removeChild(existing);
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
  // Reikningar modal should only show invoice-type rows (Setja í reikning + Greitt síðar).
  // Sales paid by card/cash (type='sale') belong in Bókhaldsyfirlit / Tekjur, not here.
  // 2026-05-09 (F-4): legacy modal var a\u00f0 querya `sala_transactions` t\u00f6flu \u2014
  // en n\u00fdjar s\u00f6lur fara n\u00fa \u00ed `solur`, svo bara einn forn r\u00f6\u00f0 birtist. Skiptum
  // yfir \u00ed `solur` me\u00f0 r\u00e9ttri filter: reikningur / greitt_sidar, ekki greiddar,
  // ekki dr\u00f6g.
  Promise.all([
    window.DB.sb.from('solur')
      .select('id,num,customer_nafn,customer_id,samtals,greitt_med,created_at,paid_at,status')
      .in('greitt_med',['reikningur','greitt_sidar'])
      .is('paid_at',null)
      .neq('status','drog')
      .order('created_at',{ascending:false}),
    window.DB.sb.from('vidskiptavinir').select('id,kennitala,nafn')
  ]).then(function(results){
    var sr=results[0], cr=results[1];
    var holder=document.getElementById('_reik_table');
    if(!holder)return;
    if(sr.error){holder.innerHTML='<div style="color:#dc2626">Villa: '+esc(sr.error.message)+'</div>';return;}
    var custMap={};
    (cr.data||[]).forEach(function(c){custMap[c.id]=c;});
    var rows=(sr.data||[]).map(function(s){
      var cust=s.customer_id && custMap[s.customer_id];
      return {
        id: s.id,
        customer: s.customer_nafn || (cust && cust.nafn) || '',
        kennitala: (cust && cust.kennitala) || '',
        type: s.greitt_med==='greitt_sidar' ? 'greitt_sidar' : 'reikningur',
        total: +s.samtals || 0,
        invoice_amount: +s.samtals || 0,
        created_at: s.created_at,
        status: 'open'
      };
    });
    var html='';
    if(rows.length){
      html+='<h3 style="color:#fff;margin:0 0 8px">\u23f3 \u00d3greitt</h3>'+invTbl(rows,true);
    } else {
      html='<div style="opacity:.6;padding:40px;text-align:center">Engir \u00f3greiddir reikningar</div>';
    }
    holder.innerHTML=html;
    holder.querySelectorAll('.mk-paid').forEach(function(btn){
      btn.addEventListener('click',function(){markPaid(btn.dataset.id, parseFloat(btn.dataset.amt));});
    });
    // 2026-05-09 (F-2): Kredit button wired to patch 26's CreditInvoice.open
    holder.querySelectorAll('.mk-credit').forEach(function(btn){
      btn.addEventListener('click', async function(){
        if (!window.CreditInvoice || !window.CreditInvoice.open) {
          alert('Kreditreikningur er ekki tilbúinn — endurhladdu síðunni.');
          return;
        }
        var id = btn.dataset.id;
        var sr = await window.DB.sb.from('solur')
          .select('id,num,customer_nafn,customer_id,samtals,greitt_med,linur,upphaed_an_vsk,vsk_upphaed,created_at')
          .eq('id', id).single();
        if (sr.error || !sr.data) { alert('Villa: '+(sr.error && sr.error.message || 'sala fannst ekki')); return; }
        var d = sr.data;
        window.CreditInvoice.open({
          id: d.id, num: d.num,
          customer: d.customer_nafn, customer_id: d.customer_id,
          total: +(d.samtals||0), ex: +(d.upphaed_an_vsk||0), vsk: +(d.vsk_upphaed||0),
          lines: Array.isArray(d.linur) ? d.linur : [],
          payment: d.greitt_med
        });
      });
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
      h+='<td style="padding:12px;text-align:right;white-space:nowrap"><button class="mk-paid" data-id="'+inv.id+'" data-amt="'+(inv.invoice_amount||inv.total||0)+'" style="padding:6px 12px;border:none;border-radius:6px;background:#16a34a;color:#fff;font-size:12px;font-weight:600;cursor:pointer;margin-right:6px">\u2705 Greitt</button>'
       +'<button class="mk-credit" data-id="'+inv.id+'" style="padding:6px 12px;border:1px solid #fed7aa;border-radius:6px;background:#fff7ed;color:#c2410c;font-size:12px;font-weight:600;cursor:pointer">\u21a9 Kredit</button></td>';
    }
    h+='</tr>';
  });
  h+='</tbody></table></div>';
  return h;
}
async function markPaid(id, amt){
  if(!await Confirm.show('Staðfesta greiðslu?'))return;
  // 2026-05-09 (F-4): markPaid uppfærir nú `solur`, ekki gamla
  // `sala_transactions` (samrænd Reikningar listanum sem nú les úr `solur`).
  window.DB.sb.from('solur').update({paid_at:new Date().toISOString(),paid_method:'reikningur'}).eq('id',id).select().single().then(function(r){
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
  // 2026-05-08: REMOVED destructive fp_ wipe + setItem block. They were
  // erasing every uploaded teikning at page load and silently dropping
  // new ones. Floor plans now persist correctly via FloorPlan.save →
  // localStorage.setItem("fp_<id>", ...).
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
  // Inject filter UI when field view becomes visible — one-shot on display change.
  function tryInject(){
    var view = document.getElementById('view-field');
    if(!view) return;
    if(getComputedStyle(view).display === 'none') return;
    injectFilterUI();
  }
  document.addEventListener('view-shown', function(e){
    if(e.detail && e.detail.name === 'field') setTimeout(tryInject, 100);
  });
  // Also observe view-field's class/style changes as a safety net
  var fv = document.getElementById('view-field');
  if(fv){
    new MutationObserver(tryInject).observe(fv, { attributes:true, attributeFilter:['style','class'] });
  }
  setTimeout(tryInject, 800);
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
    btn.onclick = async function(e){
      e.stopPropagation();
      var name = main.querySelector('.company-initials');
      var nameText = name ? name.parentElement.querySelector('div[style*="font-size:21px"]') : null;
      var label = nameText ? nameText.textContent : 'fyrirt\u00e6ki #'+coId;
      if(!await Confirm.show('Ertu viss um a\u00f0 ey\u00f0a "'+label+'"?\n\n\u00deetta er ekki h\u00e6gt a\u00f0 afturkalla.')) return;
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
    // 2026-05-07: rewrote to only target the actual card class (.vorur-card)
    // and not "any deep div under #view-vorur". The old depth-based selector
    // (#view-vorur>div>div>div) was matching the new category-section wrappers
    // and forcing them to width:180px, which broke the grouped layout.
    css.textContent =
      '#view-vorur{background:#fff !important;min-height:100vh;padding:0 !important}' +
      '#view-vorur > div{max-width:100% !important;padding:12px 16px !important;box-sizing:border-box !important}' +
      '#view-vorur .vorur-card{background:#fff !important;border:1px solid #e2e8f0 !important;border-radius:10px !important;box-shadow:0 1px 4px rgba(0,0,0,0.06) !important;overflow:hidden !important;box-sizing:border-box !important}' +
      '#view-vorur .vorur-card img{width:100% !important;height:140px !important;object-fit:contain !important;display:block !important;background:#fff !important;padding:8px !important;box-sizing:border-box !important}';
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
    var r = await window.DB.sb.from('solur').select('*').neq('status','drog').order('created_at',{ascending:false});
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
      if(!await Confirm.show('Merkja \u00f6ll t\u00e6ki hj\u00e1 "'+co.nafn+'" sem sko\u00f0u\u00f0 \u00ed dag?\n\nS\u00ed\u00f0asta sko\u00f0un: '+today+'\nN\u00e6sta sko\u00f0un: '+next)) return;
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
          // 2026-05-11: Replace the cell with JUST the dropdown — the
          // dropdown already shows the status visually (colored background),
          // having both produced a duplicate "Í vinnslu / Active" stack
          // that confused the user.
          cell.innerHTML = '';
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
      // 2026-05-08: ef nýja UnitDetail modal er hlaðinn (patch 101) þá notum
      // hann frekar — gamli „_pm_dev" modallinn er ófullkominn (vantar
      // sögu, athugasemdir-tímalína, áfyllingar o.fl.). UnitDetail er
      // sami modal og verkstæðismaður opnar með ✏️ Breyta hnappi á
      // tækjarúðum (patch 103). Föst sömu aðferð alls staðar.
      if (window.UnitDetail && typeof window.UnitDetail.open === 'function') {
        window.UnitDetail.open(d.id, 'uttaeki');
        return;
      }
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
      m.querySelector('._pm_dev_del').onclick=async function(){
        if(!await Confirm.show('Eyda taeki '+serial+'?')) return;
        window.DB.sb.from('uttaeki').delete().eq('serial',serial).then(function(res){
          if(res.error){alert('Villa: '+res.error.message);return;}
          m.remove();
          if(window._currentCompanyId && window.Companies) window.Companies.openDetail(window._currentCompanyId);
        });
      };
    });
  }
  window._pmOpenDevice = openDeviceModal;

  // Make equipment table rows clickable.
  // 2026-05-08: was reading first <td> as the serial — that broke on
  // Vidskiptavinir profile where column 1 is "Tegund" (type, e.g. "ABC Duft")
  // and column 2 is "Raðnúmer". Now we find the serial column dynamically by
  // matching the <th> text, then read the corresponding <td>.
  function hookDeviceRows(){
    var tables = document.querySelectorAll('table');
    tables.forEach(function(table){
      var ths = table.querySelectorAll('thead th');
      if (!ths.length) ths = table.querySelectorAll('th');
      var serialColIdx = -1;
      ths.forEach(function(th, i){
        if (serialColIdx < 0 && /RA[ÐD]N|serial/i.test(th.textContent)) serialColIdx = i;
      });
      if (serialColIdx < 0) return;
      var rows = table.querySelectorAll('tbody tr');
      rows.forEach(function(row){
        if (row.dataset._pmDevHook) return;
        row.dataset._pmDevHook = '1';
        row.classList.add('_pm_dev_row');
        var tds = row.querySelectorAll('td');
        var cell = tds[serialColIdx];
        var serial = cell ? cell.textContent.trim() : '';
        // Sanity check: serial should look like a unit code, not a type label
        if (!serial || serial === '—') return;
        row.addEventListener('click', function(e){
          if (e.target.tagName === 'SELECT' || e.target.tagName === 'BUTTON' ||
              e.target.tagName === 'INPUT' || e.target.tagName === 'A') return;
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
