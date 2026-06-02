// MapFix v4 — cache-first instant rendering. Only geocodes on Uppfæra click.
(function(){
  'use strict';
  console.log('[MapFix v4] Script loaded');
  var CACHE_KEY = '_slokk_gc';
  var state = { rendered:{}, markers:{}, clickHooked:false, btnHooked:false };

  // Exposed helper: switch to companies view + open a specific company detail,
  // without racing against the async Companies.load() that App.switchView triggers.
  // Used by mapfix click delegate and other patches (13, 18, 77, modal "Opna fyrirtæki" buttons).
  window._openCompanySafe = function(coId){
    coId = parseInt(coId, 10);
    if (!coId || !window.App || !window.Companies) return;
    window.App.view = 'companies';
    document.querySelectorAll('.view').forEach(function(el){el.classList.remove('active');});
    document.querySelectorAll('.vnav-btn').forEach(function(el){el.classList.remove('active');});
    var vEl = document.getElementById('view-companies'); if(vEl) vEl.classList.add('active');
    var nb = document.querySelector('.vnav-btn[data-view="companies"]'); if(nb) nb.classList.add('active');
    var doOpen = function(){ if(window.Companies && Companies.openDetail) Companies.openDetail(coId); };
    if (window.Companies && Companies.list && Companies.list.length) {
      doOpen();
    } else if (window.Companies && typeof Companies.load === 'function') {
      Promise.resolve(Companies.load()).then(doOpen).catch(doOpen);
    } else {
      doOpen();
    }
  };

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
      if (window._openCompanySafe) window._openCompanySafe(coId);
    });
    state.clickHooked = true;
  }

  // Status for a contract customer whose equipment lives in
  // arsskodun_customers[id].equipment (category counts from the
  // 2025 Úttektarskýrsla import) — NOT in the uttaeki table.
  // We treat the totals as real registered tæki and color the pin
  // by inspection status (last_year_inspected + inspect_month).
  function arsContractStatus(ars, company) {
    var today = new Date();
    var curYear = today.getFullYear();
    var curMonth = today.getMonth() + 1;
    var eq = (ars && ars.equipment) || {};
    var totalCount = 0;
    Object.keys(eq).forEach(function(k){ totalCount += (+eq[k] || 0); });
    var m = +((ars||{}).inspect_month) || 0;
    var lastYr = +((ars||{}).last_year_inspected) || 0;
    var isDone = lastYr === curYear;
    var isOverdue = !isDone && m > 0 && m < curMonth;
    var isDueNow = !isDone && m === curMonth;
    if (isDone)    return { color:'#1a7f4b', label:'Í lagi (sk. ' + curYear + ')', count: totalCount };
    if (isOverdue) return { color:'#dc2626', label:'Útrunnið (skoda mb ' + m + ')', count: totalCount };
    if (isDueNow)  return { color:'#b45309', label:'Rennur út í mánuði', count: totalCount };
    if (m > 0)     return { color:'#475569', label:'Á dagskrá (mb. ' + m + ')', count: totalCount };
    return { color:'#475569', label:'Á samningi (engin dagsetning)', count: totalCount };
  }

  function instantRender(){
    var map = window._slokk_map;
    if(!map){ return false; }
    if(!window.Companies || !Companies.list || !Companies.list.length){ return false; }
    var units = (DB.cache && DB.cache.units) || [];
    var cache = readCache();
    // Pre-tally active units by client name and read the contract maps
    // so we know which companies belong on the map at all. Þjónustutæki
    // should show:
    //   • Companies with active uttaeki rows (the May 2026 import set)
    //   • Companies with a service contract (Fyrirtækjaþjónustu OR
    //     Brunakerfi) — even without unit records yet, the driver still
    //     drives to them; they just need their tæki logged.
    // Companies with neither are walk-in / sale-only and don't belong.
    var hasUnits = {};
    units.forEach(function(u){
      if (u.status === 'active') hasUnits[u.client] = true;
    });
    var arsMap = (window.AppSettings && window.AppSettings.path && window.AppSettings.path('arsskodun_customers')) || {};
    var bruMap = (window.AppSettings && window.AppSettings.path && window.AppSettings.path('brunakerfi_customers')) || {};
    var rendered = 0;
    Companies.list.forEach(function(c){
      if(state.markers[c.id]) return;
      var hasU = !!hasUnits[c.nafn];
      var ars = arsMap[String(c.id)];
      var bru = bruMap[String(c.id)];
      var hasContract = !!((ars && ars.equipment) || bru);
      if(!hasU && !hasContract) return; // skip walk-in only
      var coord = cache[c.nafn] || cache[c.heimilisfang||''] || null;
      if(!coord){ return; }
      var status;
      if (hasU) {
        // Has uttaeki rows — drive status from inspection dates
        status = statusFor(units, c.nafn);
      } else {
        // Contract holder with no INDIVIDUAL uttaeki rows, but the
        // arsskodun_customers entry has category-count equipment data
        // (from the 2025 Úttektarskýrsla import). That counts as real
        // registered tæki — just stored as totals not per-unit. Use
        // inspect_month + last_year_inspected to pick a meaningful
        // color, sum the equipment values for the popup count.
        status = arsContractStatus(ars, c);
      }
      var m = makeMarker(map, c, coord, status);
      state.markers[c.id] = m;
      state.rendered[c.id] = true;
      rendered++;
    });
    if(rendered){
      // Only fit bounds on the very first batch — re-running tick adds
      // new markers as the geocode cache fills, but we don't want the
      // map to keep jerking around. After the first fit, user controls
      // pan/zoom themselves.
      if(!state.boundsFit){
        var pts = Object.values(state.markers).map(function(m){return m.getLatLng();});
        if(pts.length > 1){
          map.fitBounds(L.latLngBounds(pts).pad(0.15));
          state.boundsFit = true;
        }
      }
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
      // Proxy via Netlify function — browser can't hit Nominatim directly (no CORS, no UA)
      var url = '/api/geocode?q='+encodeURIComponent(address);
      var r = await fetch(url);
      if (!r.ok) return null;
      var data = await r.json();
      if (data && typeof data.lat === 'number' && typeof data.lon === 'number') {
        return {lat: data.lat, lng: data.lon};
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
    return DB.fetchAll(function(from,to){ return DB.sb.from('fyrirtaeki').select('*').is('deleted_at', null).order('nafn').range(from,to); }).then(function(rows){  // page through 1000-row cap
      if(window.Companies){ Companies.list = rows; }
    });
  }

  function tick(){
    var view = document.getElementById('view-field');
    if(!view || !view.classList.contains('active')) return;
    loadCompaniesIfNeeded().then(function(){
      // Always re-run instantRender — it skips companies that already
      // have a marker (line 'if(state.markers[c.id]) return;'). This is
      // important because the geocode cache fills over time via the
      // shared-pull (~10s) and the background pre-warm (1.5s per
      // address). Without this, the first render might only see ~6
      // matching addresses and we'd never add the other ~250.
      var n = instantRender();
      if(n) console.log('[MapFix v4] Added', n, 'new markers (total', Object.keys(state.markers).length + ')');
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

  // Public API for deep-linking from other views (e.g. the new Fyrirtæki
  // page in patch 153). Call MapFix.focusCompany(coId) — it pans, zooms,
  // and opens the popup. Caller is responsible for switching to view-field
  // first; this helper retries while the map / markers are still loading.
  window.MapFix = window.MapFix || {};
  window.MapFix.focusCompany = function(coId, opts){
    coId = parseInt(coId, 10);
    opts = opts || {};
    var maxTries = opts.maxTries || 20;
    var zoom = opts.zoom != null ? opts.zoom : 16;
    var tries = 0;
    return new Promise(function(resolve){
      function attempt(){
        tries++;
        var map = window._slokk_map;
        var marker = map && state.markers && state.markers[coId];
        if(map && marker){
          try {
            map.setView(marker.getLatLng(), zoom, { animate: true });
            // Defer popup open until pan finishes so it lands centred.
            setTimeout(function(){ try { marker.openPopup(); } catch(_){} }, 350);
            resolve({ ok: true, marker: marker });
            return;
          } catch(e){ /* fall through to retry */ }
        }
        // Not ready yet — keep polling. instantRender() is called from
        // tick() every 500 ms once view-field is active.
        if(tries < maxTries){ setTimeout(attempt, 250); }
        else resolve({ ok: false, reason: !map ? 'no-map' : 'no-marker' });
      }
      attempt();
    });
  };
  // Expose marker map (read-only diagnostic; patches shouldn't mutate)
  window.MapFix.getMarkers = function(){ return state.markers; };
})();