// NavFix v2: route planner using Leaflet popupopen event (reliable)
(function(){
  'use strict';
  var STORAGE_KEY = '_slokk_route';
  var hookedMap = null;

  function readRoute(){
    try { var v = localStorage.getItem(STORAGE_KEY); return v ? JSON.parse(v) : []; } catch(e){ return []; }
  }
  function saveRoute(r){
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(r)); } catch(e){}
  }
  function addToRoute(coId, name, addr, lat, lng){
    var r = readRoute();
    if(r.find(function(x){return String(x.id) === String(coId);})) return;
    r.push({id:coId, name:name, addr:addr, lat:lat, lng:lng});
    saveRoute(r);
    renderPanel();
  }
  function removeFromRoute(coId){
    var r = readRoute().filter(function(x){return String(x.id) !== String(coId);});
    saveRoute(r);
    renderPanel();
  }
  function clearRoute(){ saveRoute([]); renderPanel(); }

  function launchNav(){
    var r = readRoute();
    if(!r.length) return;
    if(r.length === 1){
      window.open('https://www.google.com/maps/dir/?api=1&destination=' + r[0].lat + ',' + r[0].lng + '&travelmode=driving', '_blank');
    } else {
      var dest = r[r.length-1];
      var waypoints = r.slice(0, -1).map(function(s){return s.lat + ',' + s.lng;}).join('|');
      var url = 'https://www.google.com/maps/dir/?api=1&destination=' + dest.lat + ',' + dest.lng + '&waypoints=' + encodeURIComponent(waypoints) + '&travelmode=driving';
      window.open(url, '_blank');
    }
  }

  function renderPanel(){
    var view = document.getElementById('view-field');
    if(!view) return;
    var panel = document.getElementById('navfix-panel');
    var route = readRoute();
    if(!panel){
      panel = document.createElement('div');
      panel.id = 'navfix-panel';
      panel.style.cssText = 'margin:12px 0;padding:12px;background:#fff;border:1px solid #e2e8f0;border-radius:8px;font-family:system-ui,sans-serif';
      var mapContainer = view.querySelector('#field-map-container, .leaflet-container');
      var anchor = mapContainer ? mapContainer.closest('div[class*="card"]') || mapContainer.parentElement : null;
      if(anchor && anchor.parentElement){
        anchor.parentElement.insertBefore(panel, anchor.nextSibling);
      } else {
        view.appendChild(panel);
      }
    }
    if(route.length === 0){
      panel.style.display = 'none';
      return;
    }
    panel.style.display = '';
    var html = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">' +
               '<div style="font-weight:700;color:#0f172a">Áætlaðar heimsóknir (' + route.length + ')</div>' +
               '<button class="navfix-clear" style="background:#fee;color:#dc2626;border:1px solid #fcc;padding:4px 10px;border-radius:6px;font-size:12px;cursor:pointer">Hreinsa</button>' +
               '</div>';
    html += '<ol style="margin:0;padding:0 0 0 22px;list-style:decimal">';
    route.forEach(function(stop){
      html += '<li style="padding:6px 0;display:flex;justify-content:space-between;align-items:center;gap:8px">' +
              '<div style="flex:1"><b>' + stop.name + '</b><br><span style="color:#64748b;font-size:12px">' + (stop.addr || '') + '</span></div>' +
              '<button class="navfix-remove" data-id="' + stop.id + '" style="background:none;color:#94a3b8;border:none;font-size:18px;cursor:pointer;padding:4px 8px" title="Fjarlægja">×</button>' +
              '</li>';
    });
    html += '</ol>';
    html += '<button class="navfix-go" style="margin-top:10px;width:100%;background:#1a7f4b;color:white;border:none;padding:12px;border-radius:8px;font-weight:700;font-size:15px;cursor:pointer">' + String.fromCodePoint(0x1F697) + '  Leggja af stað</button>';
    panel.innerHTML = html;
    panel.querySelector('.navfix-clear').onclick = function(){ if(confirm('Hreinsa lista?')) clearRoute(); };
    panel.querySelector('.navfix-go').onclick = launchNav;
    Array.from(panel.querySelectorAll('.navfix-remove')).forEach(function(b){
      b.onclick = function(){ removeFromRoute(b.getAttribute('data-id')); };
    });
  }

  // Inject 🚗 button when a popup opens (uses Leaflet event - bulletproof)
  function injectButton(popupContent, marker){
    if(!popupContent) return; if(popupContent.querySelector('.navfix-add-btn')) return;
    var link = popupContent.querySelector('.mapfix-co-link');
    if(!link) return;
    
    var coId = link.getAttribute('data-co-id');
    var name = link.textContent.trim();
    var addrEl = popupContent.querySelector('span[style*="color:#666"], span[style*="color:#64748b"], div[style*="color:#666"], div[style*="color:#64748b"]');
    var addr = addrEl ? addrEl.textContent.trim() : '';
    var lat = '', lng = '';
    if(marker && marker.getLatLng){
      var ll = marker.getLatLng();
      lat = ll.lat;
      lng = ll.lng;
    }
    var btn = document.createElement('button');
    btn.className = 'navfix-add-btn';
    btn.setAttribute('data-co-id', coId);
    btn.setAttribute('data-name', name);
    btn.setAttribute('data-addr', addr);
    btn.setAttribute('data-lat', lat);
    btn.setAttribute('data-lng', lng);
    btn.title = 'Bæta í áætlun';
    btn.style.cssText = 'background:none;border:1px solid #cbd5e1;border-radius:6px;padding:2px 8px;margin-left:8px;cursor:pointer;font-size:16px;vertical-align:middle';
    btn.textContent = String.fromCodePoint(0x1F697);
    var route = readRoute();
    if(route.find(function(x){return String(x.id) === String(coId);})){
      btn.textContent = '✓';
      btn.disabled = true;
      btn.style.background = '#dcfce7';
      btn.style.borderColor = '#86efac';
    }
    btn.onclick = function(e){
      e.preventDefault();
      e.stopPropagation();
      addToRoute(coId, name, addr, lat, lng);
      btn.textContent = '✓';
      btn.disabled = true;
      btn.style.background = '#dcfce7';
      btn.style.borderColor = '#86efac';
    };
    link.parentNode.insertBefore(btn, link.nextSibling);
  }

  function hookMap(){
    var map = window._slokk_map;
    if(!map) return false;
    if(map === hookedMap) return true;
    map.on('popupopen', function(e){
      var popup = e.popup;
      var marker = e.target && e.target instanceof L.Marker ? e.target : (e.layer || null);
      // Sometimes target is map; find the source marker via popup._source
      if(!marker || !marker.getLatLng){
        marker = popup && popup._source ? popup._source : null;
      }
      var el = popup ? popup.getElement() : null;
      if(!el) return;
      var content = el.querySelector('.leaflet-popup-content');
      if(content){
        // Tiny delay so any other DOM mutations finish
        setTimeout(function(){ injectButton(content, marker); }, 30);
      }
    });
    hookedMap = map;
    console.log('[NavFix v2] Hooked map popupopen event');
    return true;
  }

  function init(){
    // Hook map as soon as it appears
    var hookIv = setInterval(function(){
      if(hookMap()) clearInterval(hookIv);
    }, 300);
    // Render panel when on field view
    setInterval(function(){
      var view = document.getElementById('view-field');
      if(view && view.classList.contains('active') && !document.getElementById('navfix-panel')){
        renderPanel();
      }
    }, 800);
    // Re-hook map if app rebuilds it
    setInterval(function(){
      if(window._slokk_map && window._slokk_map !== hookedMap){
        hookMap();
      }
    }, 1500);
    console.log('[NavFix v2] Ready');
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();