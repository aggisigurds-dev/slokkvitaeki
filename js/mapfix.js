// MapFix v4 — cache-first instant rendering. Only geocodes on Uppfæra click.
(function(){
  'use strict';
  console.log('[MapFix v4] Script loaded');
  var CACHE_KEY = '_slokk_gc';
  var state = { rendered:{}, markers:{}, clickHooked:false, btnHooked:false };

  if(!document.getElementById('mapfix-legend-css')){
    var css = document.createElement('style');
    css.id = 'mapfix-legend-css';
    css.textContent = '.leaflet-bottom.leaflet-left{max-width:180px;opacity:0.88}.leaflet-bottom.leaflet-left > *{font-size:11px !important;padding:6px 8px !important;line-height:1.35;background:rgba(255,255,255,0.92) !important;box-shadow:0 1px 3px rgba(0,0,0,0.08) !important;border-radius:6px !important}';
    document.head.appendChild(css);
  }

  function readCache(){
    try { return JSON.parse(localStorage.getItem(CACHE_KEY)||'{}'); } catch(e){ return {}; }
  }
  function writeCache(c){
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(c)); } catch(e){}
  }

  function statusFor(units, companyName){
    var _today = new Date().toISOString().substring(0,10);
    var _d30 = new Date(Date.now()+30*86400000).toISOString().substring(0,10);
    var cu = units.filter(function(u){return u.status==='active' && u.client===companyName;});
    if(!cu.length) return {color:'#6b7280', label:'Engin tæki', count:0};
    var overdue=0, due=0, ok=0, noDate=0;
    cu.forEach(function(u){
      if(!u.next_insp){ noDate++; }
      else if(u.next_insp<_today){ overdue++; }
      else if(u.next_insp<=_d30){ due++; }
      else { ok++; }
    });
    if(overdue) return {color:'#dc2626', label:'Útrunnið', count:cu.length};
    if(due) return {color:'#b45309', label:'Rennur út', count:cu.length};
    if(noDate && !ok) return {color:'#6b7280', label:'Engar dagsetningar', count:cu.length};
    return {color:'#1a7f4b', label:'Í lagi', count:cu.length};
  }

  function makeMarker(map, company, coords, status){
    var icon = L.divIcon({
      className:'mapfix-marker',
      html:'<div style="background:'+status.color+';width:16px;height:16px;border-radius:50%;border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,0.3)"></div>',
      iconSize:[20,20],
      iconAnchor:[10,10]
    });
    var marker = L.marker([coords.lat, coords.lng], {icon:icon}).addTo(map);
    var popupHtml = '<div style="font-family:system-ui,sans-serif;line-height:1.5">' +
      '<a href="#" class="mapfix-co-link" data-co-id="'+company.id+'" style="font-weight:700;font-size:15px;color:#0d6efd;text-decoration:underline;cursor:pointer">'+(company.nafn||'')+'</a>' +
      '<br><span style="color:#666;font-size:13px">'+(company.heimilisfang||'')+'</span>' +
      '<div style="margin-top:4px;color:'+status.color+';font-size:13px;font-weight:600">'+status.label+'</div>' +
      '<div style="color:#666;font-size:12px">'+status.count+' tæki</div>' +
      '</div>';
    marker.bindPopup(popupHtml);
    return marker;
  }

  function hookClickDelegate(){
    if(state.clickHooked) return;
    document.addEventListener('click', function(e){
      var link = e.target.closest && e.target.closest('.mapfix-co-link');
      if(!link) return;
      e.preventDefault();
      var coId = link.getAttribute('data-co-id');
      if(coId && window.App && window.Companies){
        App.switchView('companies');
        setTimeout(function(){ Companies.openDetail(parseInt(coId,10)); }, 200);
      }
    });
    state.clickHooked = true;
  }

  function instantRender(){
    var map = window._slokk_map;
    if(!map){ return false; }
    if(!window.Companies || !Companies.list || !Companies.list.length){ return false; }
    var units = (DB.cache && DB.cache.units) || [];
    var cache = readCache();
    var rendered = 0;
    Companies.list.forEach(function(c){
      if(state.markers[c.id]) return;
      var coord = cache[c.nafn] || cache[c.heimilisfang||''] || null;
      if(!coord){ return; }
      var status = statusFor(units, c.nafn);
      var m = makeMarker(map, c, coord, status);
      state.markers[c.id] = m;
      state.rendered[c.id] = true;
      rendered++;
    });
    if(rendered){
      var pts = Object.values(state.markers).map(function(m){return m.getLatLng();});
      if(pts.length > 1){ map.fitBounds(L.latLngBounds(pts).pad(0.15)); }
    }
    hookClickDelegate();
    return rendered;
  }

  function clearMarkers(){
    var map = window._slokk_map;
    Object.values(state.markers).forEach(function(m){ try { map.removeLayer(m); } catch(e){} });
    state.markers = {};
    state.rendered = {};
  }

  async function geocodeAddress(address){
    if(!address || address.length < 3) return null;
    try {
      var url = 'https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=is&q='+encodeURIComponent(address);
      var r = await fetch(url, {headers:{'Accept-Language':'is'}});
      var data = await r.json();
      if(data && data.length){
        return {lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon)};
      }
    } catch(e){ console.warn('[MapFix] geocode failed for', address, e); }
    return null;
  }

  async function uppfaeraSweep(btn){
    var map = window._slokk_map;
    if(!map){ return; }
    var origText = btn ? btn.textContent : '';
    if(btn){ btn.textContent = '\u23F3 Uppfæri...'; btn.disabled = true; }
    var cache = readCache();
    var toGeocode = Companies.list.filter(function(c){
      return !(cache[c.nafn] || cache[c.heimilisfang||'']);
    });
    if(btn) btn.textContent = '\u23F3 '+toGeocode.length+' eftir...';
    for(var i=0;i<toGeocode.length;i++){
      var c = toGeocode[i];
      if(btn) btn.textContent = '\u23F3 '+(i+1)+'/'+toGeocode.length;
      var coord = await geocodeAddress(c.heimilisfang || c.nafn);
      if(coord){
        cache[c.nafn] = coord;
        if(c.heimilisfang) cache[c.heimilisfang] = coord;
        writeCache(cache);
      }
      await new Promise(function(res){ setTimeout(res, 1000); });
    }
    clearMarkers();
    instantRender();
    if(btn){ btn.textContent = origText||'\u21BB Uppfæra'; btn.disabled = false; }
  }

  function hookUppfaeraButton(){
    if(state.btnHooked) return false;
    var btns = Array.from(document.querySelectorAll('button')).filter(function(b){return /Uppf/.test(b.textContent);});
    if(!btns.length) return false;
    btns.forEach(function(btn){
      btn.addEventListener('click', function(e){ e.preventDefault(); e.stopImmediatePropagation(); uppfaeraSweep(btn); }, {capture:true});
    });
    state.btnHooked = true;
    console.log('[MapFix v4] Hooked Uppfaera button');
    return true;
  }

  function loadCompaniesIfNeeded(){
    if(window.Companies && Companies.list && Companies.list.length) return Promise.resolve();
    if(!window.DB || !DB.sb) return Promise.resolve();
    return DB.sb.from('fyrirtaeki').select('*').order('nafn').then(function(r){
      if(r.data && window.Companies){ Companies.list = r.data; }
    });
  }

  function tick(){
    var view = document.getElementById('view-field');
    if(!view || !view.classList.contains('active')) return;
    loadCompaniesIfNeeded().then(function(){
      if(!Object.keys(state.markers).length){
        var n = instantRender();
        if(n) console.log('[MapFix v4] Rendered', n, 'markers from cache');
      }
      hookUppfaeraButton();
    });
  }

  function init(){
    setInterval(tick, 500);
    tick();
    console.log('[MapFix v4] Init complete');
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();