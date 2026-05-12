/* QR Scanner v3 — close-focus + tap-to-focus + zoom + torch for tiny QR labels */
(function(){'use strict';
if(!document.getElementById('_qs_anim')){
  var st=document.createElement('style');
  st.id='_qs_anim';
  st.textContent='@keyframes _qsPing{0%{transform:scale(.5);opacity:1}100%{transform:scale(1.6);opacity:0}}';
  document.head.appendChild(st);
}
var _jsqr=null;
function loadJsQR(){
  return new Promise(function(res,rej){
    if(window.jsQR){_jsqr=window.jsQR;res();return;}
    var s=document.createElement('script');
    s.src='https://cdnjs.cloudflare.com/ajax/libs/jsQR/1.4.0/jsQR.min.js';
    s.onload=function(){_jsqr=window.jsQR;res();};
    s.onerror=function(){rej(new Error('Get ekki hlaðið QR lesara'));};
    document.head.appendChild(s);
  });
}
function canUseCamera(){
  if(!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia){
    return {ok:false, reason:'browser', msg:'Þessi vafri styður ekki myndavél.'};
  }
  var proto=location.protocol;
  var host=location.hostname;
  if(proto!=='https:' && host!=='localhost' && host!=='127.0.0.1'){
    return {ok:false, reason:'http', msg:'Myndavél krefst HTTPS — opnaðu síðuna í gegnum https://'};
  }
  return {ok:true};
}
function permissionMsg(err){
  var n=err && err.name || '';
  if(n==='NotAllowedError' || n==='PermissionDeniedError') return 'Myndavél hafnað. Leyfðu aðgang að myndavél í stillingum vafra og reyndu aftur.';
  if(n==='NotFoundError' || n==='DevicesNotFoundError') return 'Engin myndavél fannst.';
  if(n==='NotReadableError' || n==='TrackStartError') return 'Myndavélin er upptekin af öðru forriti.';
  if(n==='OverconstrainedError' || n==='ConstraintNotSatisfiedError') return 'Myndavél styður ekki þessar stillingar. Reyni aftur með lægri kröfum...';
  if(n==='SecurityError') return 'Öryggisvilla — myndavél krefst HTTPS.';
  if(n==='AbortError') return 'Aðgangur að myndavél var rofinn.';
  return 'Villa við að opna myndavél: '+(err && err.message || n || 'óþekkt');
}
function showManualFallback(callback, errorMsg){
  var ov=document.createElement('div');
  ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:10000;display:flex;align-items:center;justify-content:center;padding:20px;';
  var box=document.createElement('div');
  box.style.cssText='background:#fff;border-radius:14px;width:420px;max-width:95vw;display:flex;flex-direction:column;box-shadow:0 12px 40px rgba(0,0,0,.3);';
  var warn=errorMsg?'<div style="padding:12px 14px;margin:16px 20px 0 20px;background:#fef3c7;border:1px solid #fde68a;border-radius:9px;font-size:12px;color:#92400e">⚠ '+errorMsg+'</div>':'';
  box.innerHTML='<div style="padding:16px 20px;border-bottom:1px solid #e5e7eb;display:flex;justify-content:space-between;align-items:center"><h2 style="margin:0;font-size:17px">🔍 Fletta upp</h2><button id="_qs_x" style="background:none;border:none;font-size:20px;cursor:pointer;color:#6b7280">✕</button></div>'+
    warn+
    '<div style="padding:18px 20px"><label style="display:block;font-size:11px;color:#6b7280;text-transform:uppercase;font-weight:700;margin-bottom:4px">Raðnúmer</label><input id="_qs_serial" type="text" placeholder="t.d. GY-0012" autofocus style="width:100%;padding:12px 14px;border:1.5px solid #e5e7eb;border-radius:9px;font-size:15px;box-sizing:border-box;font-family:monospace;text-transform:uppercase"><div id="_qs_err" style="font-size:12px;color:#dc2626;min-height:16px;margin-top:6px"></div></div>'+
    '<div style="padding:14px 20px;border-top:1px solid #e5e7eb;display:flex;gap:10px;justify-content:flex-end"><button id="_qs_cancel" style="background:#f3f4f6;border:none;padding:10px 18px;border-radius:9px;cursor:pointer;font-size:14px;color:#374151">Hætta við</button><button id="_qs_retry" style="background:#2563eb;color:#fff;border:none;padding:10px 18px;border-radius:9px;cursor:pointer;font-size:14px">📷 Reyna aftur</button><button id="_qs_ok" style="background:#dc2626;color:#fff;border:none;padding:10px 18px;border-radius:9px;cursor:pointer;font-weight:600;font-size:14px">Fletta upp</button></div>';
  ov.appendChild(box);document.body.appendChild(ov);
  function close(){ov.remove();}
  document.getElementById('_qs_x').onclick=close;
  document.getElementById('_qs_cancel').onclick=close;
  ov.onclick=function(e){if(e.target===ov)close();};
  document.getElementById('_qs_retry').onclick=function(){close();openScanner(callback);};
  var inp=document.getElementById('_qs_serial');
  var errEl=document.getElementById('_qs_err');
  function submit(){
    var v=inp.value.trim().toUpperCase();
    if(!v){errEl.textContent='Sláðu inn raðnúmer';return;}
    close();callback(v);
  }
  document.getElementById('_qs_ok').onclick=submit;
  inp.addEventListener('keypress',function(e){if(e.key==='Enter')submit();});
  setTimeout(function(){inp.focus();},50);
}
async function openScanner(callback){
  if(!callback){
    callback=function(serial){
      if(window.showUnitDetail){try{window.showUnitDetail(serial);}catch(e){console.error(e);}}
      else if(window.DB && DB.getUnit){try{var u=DB.getUnit(serial);console.log('Unit:',u);}catch(e){}}
      else alert('Fann raðnúmer: '+serial);
    };
  }
  var cap=canUseCamera();
  if(!cap.ok){
    showManualFallback(callback, cap.msg);
    return;
  }
  try { await loadJsQR(); } catch(e){ showManualFallback(callback, e.message); return; }
  // Build modal with video
  var modal=document.createElement('div');
  modal.id='_qs_modal';
  modal.style.cssText='position:fixed;inset:0;background:#000;z-index:10001;display:flex;flex-direction:column;';
  var topbar='<div style="position:fixed;top:0;left:0;right:0;height:56px;background:rgba(0,0,0,.8);color:#fff;display:flex;justify-content:space-between;align-items:center;padding:0 16px;z-index:2"><div style="font-weight:600;font-size:15px">🔍 Fletta upp — beindu að QR kóða</div><button id="_qs_close" style="background:#fff;color:#000;border:none;padding:8px 16px;border-radius:8px;cursor:pointer;font-weight:600;font-size:14px">Hætta við</button></div>';
  var viewport='<div style="flex:1;display:flex;align-items:center;justify-content:center;padding:56px 0 80px 0"><video id="_qs_video" playsinline autoplay muted style="width:100%;max-width:480px;max-height:70vh;object-fit:cover;border-radius:8px"></video></div>';
  var bottombar='<div style="position:fixed;bottom:0;left:0;right:0;padding:16px;background:rgba(0,0,0,.8);color:#fff;text-align:center;z-index:2"><button id="_qs_manual" style="background:#fff;color:#000;border:none;padding:10px 22px;border-radius:8px;cursor:pointer;font-weight:600;font-size:14px">⌨️ Slá inn raðnúmer</button></div>';
  modal.innerHTML=topbar+viewport+bottombar;
  document.body.appendChild(modal);
  var video=document.getElementById('_qs_video');
  var canvas=document.createElement('canvas');
  var ctx=canvas.getContext('2d');
  var stream=null, scanId=null, done=false;
  function cleanup(){
    done=true;
    if(scanId)cancelAnimationFrame(scanId);
    if(stream){try{stream.getTracks().forEach(function(t){t.stop();});}catch(e){}}
    if(modal.parentNode)modal.parentNode.removeChild(modal);
  }
  document.getElementById('_qs_close').onclick=cleanup;
  document.getElementById('_qs_manual').onclick=function(){cleanup();showManualFallback(callback);};
  function tryGetStream(constraints){
    return navigator.mediaDevices.getUserMedia(constraints);
  }
  // Try environment camera first, fall back to any camera. Request continuous
  // autofocus and high resolution so small QR labels stay sharp at close range.
  var primary={video:{
    facingMode:{ideal:'environment'},
    width:{ideal:1920},
    height:{ideal:1080},
    advanced:[
      {focusMode:'continuous'},
      {focusDistance:0.1}
    ]
  },audio:false};
  var fallback={video:{facingMode:{ideal:'environment'}},audio:false};
  var fallback2={video:true,audio:false};
  tryGetStream(primary).catch(function(e){
    console.warn('[QR] primary constraints failed:',e.name,'retrying without advanced');
    return tryGetStream(fallback);
  }).catch(function(e){
    console.warn('[QR] fallback failed:',e.name,'retrying with any camera');
    return tryGetStream(fallback2);
  }).then(function(s){
    if(done)return;
    stream=s;
    video.srcObject=s;
    return video.play();
  }).then(function(){
    if(done)return;
    // Build controls AFTER a short delay so getCapabilities() is populated.
    // We always show the controls (best-effort applyConstraints); if a
    // particular capability isn't supported the click silently no-ops.
    setTimeout(function(){
      if(done)return;
      var track=stream.getVideoTracks()[0];
      if(!track)return;
      var caps={};
      try { caps=track.getCapabilities ? track.getCapabilities() : {}; } catch(_){}
      console.log('[QR] camera capabilities:', caps);

      // 1. Continuous autofocus + minimum focus distance for close-range scanning.
      var adv=[];
      if(caps.focusMode && caps.focusMode.indexOf('continuous')>=0) adv.push({focusMode:'continuous'});
      if(caps.focusDistance && caps.focusDistance.min) adv.push({focusDistance:caps.focusDistance.min});
      if(adv.length){
        track.applyConstraints({advanced:adv}).catch(function(e){console.warn('[QR] focus apply:',e.name,e.message);});
      }

      // 2. Tap-to-focus — works on most Android Chrome with rear cam.
      video.addEventListener('click', function(ev){
        var r=video.getBoundingClientRect();
        var x=Math.max(0,Math.min(1,(ev.clientX-r.left)/r.width));
        var y=Math.max(0,Math.min(1,(ev.clientY-r.top)/r.height));
        var advTap=[{focusMode:'continuous'}];
        if(caps.pointsOfInterest!==undefined) advTap.push({pointsOfInterest:[{x:x,y:y}]});
        track.applyConstraints({advanced:advTap}).catch(function(e){console.warn('[QR] tap-focus:',e.name,e.message);});
        var ping=document.createElement('div');
        ping.style.cssText='position:fixed;left:'+(ev.clientX-26)+'px;top:'+(ev.clientY-26)+'px;width:52px;height:52px;border:2px solid #fff;border-radius:50%;pointer-events:none;z-index:99;animation:_qsPing .55s ease-out;box-shadow:0 0 12px rgba(255,255,255,.7)';
        document.body.appendChild(ping);
        setTimeout(function(){ping.remove();},550);
      });

      // 3. Zoom controls — always visible. If applyConstraints throws we hide them.
      var zmin=(caps.zoom && caps.zoom.min) || 1;
      var zmax=(caps.zoom && caps.zoom.max) || 4;
      var zstep=(caps.zoom && caps.zoom.step) || 0.1;
      var z=document.createElement('div');
      z.id='_qs_zoom';
      z.style.cssText='position:fixed;left:50%;bottom:80px;transform:translateX(-50%);background:rgba(0,0,0,.7);border-radius:28px;padding:8px 14px;display:flex;align-items:center;gap:10px;z-index:3;color:#fff;font-size:13px;box-shadow:0 4px 14px rgba(0,0,0,.4)';
      z.innerHTML='<button id="_qs_zout" style="background:#fff;color:#000;border:none;width:38px;height:38px;border-radius:50%;font-size:20px;font-weight:700;cursor:pointer">−</button>'+
                 '<span id="_qs_zlbl" style="min-width:42px;text-align:center;font-variant-numeric:tabular-nums;font-weight:700">1.0×</span>'+
                 '<button id="_qs_zin" style="background:#fff;color:#000;border:none;width:38px;height:38px;border-radius:50%;font-size:20px;font-weight:700;cursor:pointer">+</button>';
      modal.appendChild(z);
      var curZoom=zmin;
      try { var s0=track.getSettings(); if(s0 && s0.zoom) curZoom=s0.zoom; } catch(_){}
      function setZoom(nz){
        nz=Math.min(zmax,Math.max(zmin,nz));
        track.applyConstraints({advanced:[{zoom:nz}]}).then(function(){
          curZoom=nz;
          var lbl=document.getElementById('_qs_zlbl');
          if(lbl) lbl.textContent=curZoom.toFixed(1)+'×';
        }).catch(function(e){
          console.warn('[QR] zoom not supported:',e.name);
          var zEl=document.getElementById('_qs_zoom'); if(zEl) zEl.style.display='none';
        });
      }
      document.getElementById('_qs_zin').onclick=function(){setZoom(curZoom + Math.max(zstep, (zmax-zmin)/10));};
      document.getElementById('_qs_zout').onclick=function(){setZoom(curZoom - Math.max(zstep, (zmax-zmin)/10));};

      // 4. Torch toggle — always visible; hidden if applyConstraints rejects.
      var torchOn=false;
      var tBtn=document.createElement('button');
      tBtn.id='_qs_torch';
      tBtn.style.cssText='position:fixed;right:14px;top:70px;background:rgba(0,0,0,.7);color:#fff;border:1px solid #fff;border-radius:24px;padding:9px 16px;font-size:14px;font-weight:600;cursor:pointer;z-index:3;box-shadow:0 4px 12px rgba(0,0,0,.4)';
      tBtn.textContent='🔦 Ljós';
      tBtn.onclick=function(){
        torchOn=!torchOn;
        tBtn.style.background=torchOn?'#fbbf24':'rgba(0,0,0,.7)';
        tBtn.style.color=torchOn?'#0f172a':'#fff';
        track.applyConstraints({advanced:[{torch:torchOn}]}).catch(function(e){
          console.warn('[QR] torch not supported:',e.name);
          tBtn.style.display='none';
        });
      };
      modal.appendChild(tBtn);

      // 5. Hint label so user knows tap-to-focus is available.
      var hint=document.createElement('div');
      hint.style.cssText='position:fixed;left:0;right:0;bottom:140px;text-align:center;color:#fff;font-size:13px;z-index:2;text-shadow:0 1px 3px rgba(0,0,0,.7);pointer-events:none';
      hint.textContent='👆 Smelltu á QR-merkið til að fókusera';
      modal.appendChild(hint);
      setTimeout(function(){if(hint && hint.parentNode) hint.style.transition='opacity .5s'; hint && (hint.style.opacity='0');}, 4000);
    }, 600);
    var lastScan=0;
    function scan(ts){
      if(done)return;
      try{
        if(!lastScan || (ts-lastScan)>=100){
          lastScan=ts;
          if(video.readyState===video.HAVE_ENOUGH_DATA && video.videoWidth>0){
            var vw=video.videoWidth, vh=video.videoHeight;
            if(canvas.width!==vw || canvas.height!==vh){canvas.width=vw;canvas.height=vh;}
            ctx.drawImage(video,0,0,vw,vh);
            try{
              var img=ctx.getImageData(0,0,vw,vh);
              var code=_jsqr(img.data,img.width,img.height,{inversionAttempts:'dontInvert'});
              if(code && code.data){cleanup();callback(code.data);return;}
            }catch(e){console.warn('[QR] decode error',e);}
          }
        }
      }catch(outer){console.warn('[QR] scan loop error (continuing):',outer);}
      scanId=requestAnimationFrame(scan);
    }
    scanId=requestAnimationFrame(scan);
  }).catch(function(err){
    console.error('[QR] camera error:',err);
    cleanup();
    showManualFallback(callback, permissionMsg(err));
  });
}
window.openQRScanner=openScanner;
console.log('[QRScan v3] loaded — close focus, tap-to-focus, zoom, torch');
})();