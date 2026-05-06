/* === KORT MEÐ VIÐSKIPTAVINUM / CUSTOMER MAP v1 === */
/* Loads Leaflet from CDN + uses Nominatim (OpenStreetMap) for free geocoding.
 * Caches geocoded coordinates in localStorage to avoid re-geocoding.
 */
(() => {
  if (window.__custMapInstalled) return;
  window.__custMapInstalled = true;

  function getSB(){ return window.DB && window.DB.sb; }
  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}

  let leafletPromise = null;
  function loadLeaflet(){
    if (leafletPromise) return leafletPromise;
    leafletPromise = new Promise(resolve => {
      const css = document.createElement('link');
      css.rel='stylesheet'; css.href='https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(css);
      const s = document.createElement('script');
      s.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      s.onload = () => resolve(window.L);
      document.head.appendChild(s);
    });
    return leafletPromise;
  }

  function getCache(){
    try { return JSON.parse(localStorage.getItem('geocode_cache')||'{}'); } catch(e){ return {}; }
  }
  function saveCache(c){ localStorage.setItem('geocode_cache', JSON.stringify(c)); }

  async function geocode(addr){
    if (!addr) return null;
    const cache = getCache();
    if (cache[addr]) return cache[addr];
    try {
      const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(addr+', Iceland')}`);
      const j = await r.json();
      if (j[0]) {
        const c = [parseFloat(j[0].lat), parseFloat(j[0].lon)];
        cache[addr] = c; saveCache(cache);
        return c;
      }
    } catch(e){}
    return null;
  }

  function ensureNav(){
    if (document.querySelector('.vnav-btn[data-view="kort"]')) return;
    const sample = document.querySelector('.vnav-btn[data-view="vidskiptavinir"]') || document.querySelector('.vnav-btn[data-view="ferd"]');
    if (!sample) return;
    const btn = sample.cloneNode(false);
    btn.className = sample.className.replace(/\bactive\b/g,'').trim();
    btn.dataset.view = 'kort';
    btn.textContent = '🗺 Kort';
    btn.onclick = () => window.App && window.App.switchView('kort');
    sample.parentElement.insertBefore(btn, sample.nextSibling);
  }
  function ensureView(){
    if (document.getElementById('view-kort')) return;
    const sample = document.getElementById('view-vidskiptavinir') || document.getElementById('view-sala');
    if (!sample || !sample.parentElement) return;
    const v = document.createElement('div');
    v.id = 'view-kort';
    v.className = sample.className.replace(/\bactive\b/g,'').trim();
    v.innerHTML = '<main id="km-main" class="main-panel"></main>';
    sample.parentElement.appendChild(v);
  }
  function patchSwitch(){
    if (!window.App || window.App._kmPatch) return;
    const orig = window.App.switchView;
    window.App.switchView = function(view){
      if (view==='kort'){
        ensureView();
        document.querySelectorAll('[id^="view-"]').forEach(v=>{ v.style.display='none'; v.classList.remove('active'); });
        const v=document.getElementById('view-kort');
        if (v){ v.style.display='block'; v.classList.add('active'); }
        document.querySelectorAll('.vnav-btn').forEach(b=>b.classList.toggle('active', b.dataset.view==='kort'));
        load(); return;
      }
      orig.apply(this, arguments);
    };
    window.App._kmPatch = true;
  }

  let mapInstance = null;

  async function load(){
    const main = document.querySelector('#view-kort #km-main');
    if (!main) return;
    main.innerHTML = `
      <div style="max-width:1280px;margin:0 auto">
        <h1 style="margin:0 0 6px;font-size:20px">🗺 Viðskiptavinir á korti</h1>
        <div style="font-size:13px;color:#64748b;margin-bottom:14px">Smelltu á punkt til að sjá viðskiptavin · Geocoding tekur tíma fyrir nýjar færslur</div>
        <div id="km-map" style="height:600px;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.05);background:#e2e8f0"></div>
        <div id="km-status" style="font-size:12px;color:#64748b;margin-top:6px">Hleður Leaflet...</div>
      </div>`;

    await loadLeaflet();
    const SB = getSB(); if (!SB) return;
    const { data } = await SB.from('fyrirtaeki').select('id,nafn,heimilisfang,kennitala').limit(500);
    const co = (data||[]).filter(c => c.heimilisfang);

    const status = document.getElementById('km-status');
    if (mapInstance) { mapInstance.remove(); mapInstance = null; }
    mapInstance = window.L.map('km-map').setView([64.13, -21.95], 10);
    window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap'
    }).addTo(mapInstance);

    let plotted = 0, missing = 0;
    for (let i=0;i<co.length;i++){
      const c = co[i];
      status.textContent = `Hleður... ${i+1}/${co.length} (${plotted} settir á kort)`;
      const coord = await geocode(c.heimilisfang);
      if (coord) {
        const marker = window.L.marker(coord).addTo(mapInstance);
        marker.bindPopup(`<strong>${esc(c.nafn||'')}</strong>${c.kennitala?'<br><small>kt. '+esc(c.kennitala)+'</small>':''}<br><small>${esc(c.heimilisfang||'')}</small>`);
        plotted++;
      } else missing++;
      // Throttle Nominatim (1 req/sec is the policy)
      if (!getCache()[c.heimilisfang]) await new Promise(r => setTimeout(r, 1100));
    }
    status.textContent = `✓ ${plotted} viðskiptavinir á korti${missing?` · ${missing} fundust ekki`:''}`;
  }

  function init(){ ensureNav(); ensureView(); patchSwitch(); }
  setTimeout(init, 1000);
  setTimeout(init, 2500);

  window.CustomerMap = { load, geocode };
  console.log('[customer-map] installed');
})();
