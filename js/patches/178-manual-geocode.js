/* === MANUAL GEOCODE v1 ===
 *
 * 2026-06-01: Many in-service addresses never resolve automatically — mangled
 * fragments ("101 Reykjavík"), street-only entries, or things Nominatim just
 * can't place. The background pre-warm (patch 156) can't fix those, so pins
 * stay missing on Leiðsögn.
 *
 * This adds a MANUAL tool, Google-Maps-style:
 *   • Type an address → live suggestions (Nominatim via /api/geocode?suggest=1).
 *   • Pick one → a draggable pin drops on a mini-map; drag to fine-tune.
 *   • Or click the map / paste "lat, lng" directly.
 *   • Save → writes the coordinate to the SHARED geocode_cache (keyed by both
 *     the company address and name) so every PC/phone gets the pin instantly,
 *     and refreshes the open maps.
 *
 * Entry points:
 *   • A banner on the Leiðsögn page: "⚠ N staðsetningar vantar — Laga handvirkt"
 *     → opens a manager listing every in-service company with no coordinate,
 *     with per-company manual fix + an "auto-geocode all" run with progress.
 *   • window.ManualGeocode.open(company), .openMissing()
 */
(() => {
  if (window.ManualGeocode) return;

  const GC_KEY = '_slokk_gc';
  const SB_URL = window.SUPABASE_URL;
  const SB_KEY = window.SUPABASE_KEY;
  const RVK = [64.1355, -21.8954];

  const readGc  = () => { try { return JSON.parse(localStorage.getItem(GC_KEY) || '{}'); } catch (_) { return {}; } };
  const writeGc = c  => { try { localStorage.setItem(GC_KEY, JSON.stringify(c)); } catch (_) {} };
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
  const path = k => (window.AppSettings && AppSettings.path && AppSettings.path(k)) || {};
  const $ = id => document.getElementById(id);

  // ── one-time styles ───────────────────────────────────────────────────────
  (function injectCss() {
    if ($('_mg-css')) return;
    const s = document.createElement('style');
    s.id = '_mg-css';
    s.textContent = `
      ._mg-ov{position:fixed;inset:0;background:rgba(15,23,42,.55);z-index:9998;display:flex;align-items:flex-start;justify-content:center;padding:24px;overflow:auto;font:14px system-ui,-apple-system,Segoe UI,Roboto,sans-serif}
      ._mg-ov._top{z-index:10000}
      ._mg-card{background:#fff;border-radius:14px;width:100%;max-width:560px;box-shadow:0 20px 60px rgba(0,0,0,.3);overflow:hidden;margin-top:30px}
      ._mg-hd{display:flex;align-items:center;gap:8px;padding:14px 16px;background:#0f172a;color:#fff;font-weight:700}
      ._mg-hd .x{margin-left:auto;background:transparent;border:0;color:#cbd5e1;font-size:18px;cursor:pointer;line-height:1}
      ._mg-body{padding:16px}
      ._mg-lbl{font-size:11.5px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.04em;margin-bottom:5px}
      ._mg-inp{width:100%;box-sizing:border-box;padding:9px 11px;border:1px solid #cbd5e1;border-radius:8px;font:inherit}
      ._mg-sug{position:absolute;left:0;right:0;top:calc(100% + 3px);background:#fff;border:1px solid #cbd5e1;border-radius:8px;box-shadow:0 10px 30px rgba(0,0,0,.18);max-height:240px;overflow:auto;z-index:5}
      ._mg-sug-item{padding:9px 11px;cursor:pointer;font-size:12.5px;border-bottom:1px solid #f1f5f9;line-height:1.35}
      ._mg-sug-item:hover,._mg-sug-item._hl{background:#eff6ff}
      ._mg-map{height:300px;border-radius:10px;border:1px solid #e2e8f0;margin-top:12px;background:#f1f5f9}
      ._mg-found{margin-top:10px;font-size:12.5px;color:#334155;min-height:18px}
      ._mg-ft{display:flex;align-items:center;gap:8px;padding:12px 16px;border-top:1px solid #eef2f7;background:#f8fafc}
      ._mg-btn{padding:8px 14px;border-radius:8px;border:1px solid #cbd5e1;background:#fff;cursor:pointer;font:inherit;font-weight:600}
      ._mg-btn.pri{background:#16a34a;color:#fff;border-color:#15803d}
      ._mg-btn.pri:disabled{background:#cbd5e1;border-color:#cbd5e1;cursor:not-allowed}
      ._mg-row{display:flex;align-items:center;gap:10px;padding:9px 14px;border-bottom:1px solid #f1f5f9;font-size:12.5px}
      ._mg-fab{position:fixed;bottom:18px;left:50%;transform:translateX(-50%);z-index:900;display:inline-flex;align-items:center;gap:8px;background:#b45309;color:#fff;border:0;border-radius:999px;padding:11px 18px;font:700 13px system-ui;box-shadow:0 8px 24px rgba(0,0,0,.28);cursor:pointer}
      ._mg-fab:hover{background:#92400e}
      ._mg-prog{height:7px;background:#e2e8f0;border-radius:4px;overflow:hidden;margin:8px 0}
      ._mg-prog>i{display:block;height:100%;background:#16a34a;width:0;transition:width .2s}
    `;
    document.head.appendChild(s);
  })();

  // ── Leaflet loader (shared idea with patch 161) ────────────────────────────
  let _lp = null;
  function ensureLeaflet() {
    if (window.L && window.L.map) return Promise.resolve();
    if (_lp) return _lp;
    _lp = new Promise(resolve => {
      if (!document.querySelector('link[href*="leaflet@1.9.4"]')) {
        const css = document.createElement('link');
        css.rel = 'stylesheet';
        css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(css);
      }
      const sc = document.createElement('script');
      sc.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      sc.onload = () => resolve();
      document.head.appendChild(sc);
    });
    return _lp;
  }

  // ── geocode helpers ────────────────────────────────────────────────────────
  async function suggest(q) {
    try {
      const r = await fetch('/api/geocode?suggest=1&q=' + encodeURIComponent(q));
      if (!r.ok) return [];
      const d = await r.json();
      return (d && d.results) || [];
    } catch (_) { return []; }
  }
  async function geocodeOne(q) {
    try {
      const r = await fetch('/api/geocode?q=' + encodeURIComponent(q));
      if (!r.ok) return null;
      const d = await r.json();
      if (d && typeof d.lat === 'number' && typeof d.lon === 'number') {
        return { lat: d.lat, lng: d.lon, display_name: d.display_name || '' };
      }
    } catch (_) {}
    return null;
  }

  async function saveCoord(co, coord, displayName) {
    const val = { lat: coord.lat, lng: coord.lng, display_name: displayName || null };
    const gc = readGc();
    if (co.heimilisfang) gc[co.heimilisfang] = val;
    gc[co.nafn] = val;
    writeGc(gc);
    if (SB_URL && SB_KEY) {
      const rows = [];
      if (co.heimilisfang) rows.push({ query: co.heimilisfang, lat: coord.lat, lng: coord.lng, display_name: displayName || null, source: 'manual' });
      rows.push({ query: co.nafn, lat: coord.lat, lng: coord.lng, display_name: displayName || null, source: 'manual' });
      try {
        await fetch(SB_URL + '/rest/v1/geocode_cache', {
          method: 'POST',
          headers: {
            apikey: SB_KEY, Authorization: 'Bearer ' + SB_KEY,
            'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates',
          },
          body: JSON.stringify(rows),
        });
      } catch (_) {}
    }
    refreshMaps();
  }
  function refreshMaps() {
    try { window.Leidsogn && window.Leidsogn.refresh && window.Leidsogn.refresh(); } catch (_) {}
    try { window.ArsMapEmbed && window.ArsMapEmbed.refresh && window.ArsMapEmbed.refresh(); } catch (_) {}
  }
  function toast(msg) {
    const t = document.createElement('div');
    t.textContent = msg;
    t.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#0f172a;color:#fff;padding:11px 18px;border-radius:10px;z-index:10001;font:600 13px system-ui;box-shadow:0 10px 30px rgba(0,0,0,.3)';
    document.body.appendChild(t);
    setTimeout(() => { t.style.transition = 'opacity .4s'; t.style.opacity = '0'; }, 2200);
    setTimeout(() => t.remove(), 2700);
  }

  // ── in-service / missing computation ───────────────────────────────────────
  function inServiceCompanies() {
    const cos = (window.Companies && Companies.list) || [];
    const arsMap = path('arsskodun_customers');
    const bruMap = path('brunakerfi_customers');
    return cos.filter(c => {
      const a = arsMap[String(c.id)];
      const b = bruMap[String(c.id)];
      return (a && a.equipment) || !!b || (window.InServiceClients && window.InServiceClients.has(c.nafn));
    });
  }
  function hasCoord(c) {
    const gc = readGc();
    if (gc[c.nafn]) return true;
    const ad = c.heimilisfang || '';
    if (ad && gc[ad]) return true;
    const st = ad.replace(/,?\s*\d{3}\s+.+$/, '').trim();
    if (st && gc[st]) return true;
    return false;
  }
  function missingCompanies() {
    return inServiceCompanies()
      .filter(c => !hasCoord(c))
      .sort((a, b) => String(a.nafn || '').localeCompare(String(b.nafn || ''), 'is'));
  }

  // ── single-company modal ────────────────────────────────────────────────────
  function open(co, onSaved) {
    const ov = document.createElement('div');
    ov.className = '_mg-ov _top';
    ov.innerHTML =
      '<div class="_mg-card" role="dialog">' +
        '<div class="_mg-hd">📍 Finna staðsetningu — <span>' + esc(co.nafn || '') + '</span><button class="x" title="Loka">✕</button></div>' +
        '<div class="_mg-body">' +
          '<div class="_mg-lbl">Leitaðu að heimilisfangi</div>' +
          '<div style="position:relative">' +
            '<input class="_mg-inp" id="_mg-addr" autocomplete="off" placeholder="t.d. Ármúli 23, Reykjavík">' +
            '<div class="_mg-sug" id="_mg-sug" style="display:none"></div>' +
          '</div>' +
          '<div class="_mg-map" id="_mg-map"></div>' +
          '<div class="_mg-found" id="_mg-found">Veldu úr tillögum, smelltu á kortið, eða límdu hnit.</div>' +
        '</div>' +
        '<div class="_mg-ft">' +
          '<button class="_mg-btn" id="_mg-paste">📋 Líma hnit</button>' +
          '<span style="flex:1"></span>' +
          '<button class="_mg-btn" id="_mg-cancel">Hætta</button>' +
          '<button class="_mg-btn pri" id="_mg-save" disabled>💾 Vista</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(ov);

    let _coord = null, _display = '';
    let map = null, marker = null;

    const addr = $('_mg-addr');
    const sug = $('_mg-sug');
    const found = $('_mg-found');
    const saveBtn = $('_mg-save');

    // Prefill with the existing coordinate if there is one (e.g. fine-tuning).
    const gc = readGc();
    const existing = (co.heimilisfang && gc[co.heimilisfang]) || gc[co.nafn] || null;
    if (existing && typeof existing.lat === 'number') { _coord = { lat: existing.lat, lng: existing.lng }; _display = existing.display_name || ''; }
    addr.value = co.heimilisfang || co.nafn || '';

    function close() { ov.remove(); }
    ov.addEventListener('click', e => { if (e.target === ov) close(); });
    ov.querySelector('.x').addEventListener('click', close);
    $('_mg-cancel').addEventListener('click', close);

    function updateFound() {
      saveBtn.disabled = !_coord;
      found.innerHTML = _coord
        ? '✅ <b>Hnit:</b> ' + _coord.lat.toFixed(5) + ', ' + _coord.lng.toFixed(5) + (_display ? ' · <span style="color:#64748b">' + esc(_display) + '</span>' : '')
        : 'Veldu úr tillögum, smelltu á kortið, eða límdu hnit.';
    }
    function setMarker(coord) {
      _coord = coord;
      if (map) {
        if (marker) marker.setLatLng([coord.lat, coord.lng]);
        else {
          marker = L.marker([coord.lat, coord.lng], { draggable: true }).addTo(map);
          marker.on('dragend', () => { const ll = marker.getLatLng(); _coord = { lat: ll.lat, lng: ll.lng }; _display = ''; updateFound(); });
        }
        map.setView([coord.lat, coord.lng], Math.max(map.getZoom() || 0, 15));
      }
      updateFound();
    }

    ensureLeaflet().then(() => {
      const el = $('_mg-map');
      if (!el) return;
      map = L.map(el).setView(_coord ? [_coord.lat, _coord.lng] : RVK, _coord ? 15 : 11);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap', maxZoom: 19 }).addTo(map);
      map.on('click', e => { _display = ''; setMarker({ lat: e.latlng.lat, lng: e.latlng.lng }); });
      if (_coord) setMarker(_coord);
      setTimeout(() => { try { map.invalidateSize(); } catch (_) {} }, 120);
    });
    updateFound();

    // ── autocomplete (debounced) ──
    let timer = null, lastQ = '', hl = -1;
    function hideSug() { sug.style.display = 'none'; hl = -1; }
    function renderSug(res) {
      if (!res.length) { hideSug(); return; }
      sug._res = res; hl = -1;
      sug.innerHTML = res.map((r, i) => '<div class="_mg-sug-item" data-i="' + i + '">' + esc(r.display_name) + '</div>').join('');
      sug.style.display = 'block';
    }
    addr.addEventListener('input', () => {
      clearTimeout(timer);
      const q = addr.value.trim();
      if (q.length < 3) { hideSug(); return; }
      timer = setTimeout(async () => {
        if (q === lastQ) return;
        lastQ = q;
        renderSug(await suggest(q));
      }, 450);
    });
    addr.addEventListener('keydown', e => {
      if (sug.style.display === 'none') return;
      const items = Array.from(sug.querySelectorAll('._mg-sug-item'));
      if (e.key === 'ArrowDown') { e.preventDefault(); hl = Math.min(hl + 1, items.length - 1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); hl = Math.max(hl - 1, 0); }
      else if (e.key === 'Enter' && hl >= 0) { e.preventDefault(); items[hl].click(); return; }
      else if (e.key === 'Escape') { hideSug(); return; }
      else return;
      items.forEach((it, i) => it.classList.toggle('_hl', i === hl));
    });
    sug.addEventListener('click', e => {
      const it = e.target.closest('._mg-sug-item');
      if (!it) return;
      const r = (sug._res || [])[+it.dataset.i];
      if (!r) return;
      _display = r.display_name || '';
      addr.value = r.display_name || addr.value;
      hideSug();
      setMarker({ lat: r.lat, lng: r.lon });
    });
    document.addEventListener('click', e => { if (!ov.contains(e.target) || (e.target !== addr && !sug.contains(e.target))) hideSug(); }, true);

    $('_mg-paste').addEventListener('click', () => {
      const raw = prompt('Límdu hnit (breidd, lengd):', _coord ? _coord.lat + ', ' + _coord.lng : '');
      if (!raw) return;
      const m = raw.match(/(-?\d+(?:[.,]\d+)?)\s*[,; ]\s*(-?\d+(?:[.,]\d+)?)/);
      if (!m) { alert('Gat ekki lesið hnit. Dæmi: 64.1466, -21.9426'); return; }
      const lat = parseFloat(m[1].replace(',', '.')), lng = parseFloat(m[2].replace(',', '.'));
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) { alert('Ógild hnit.'); return; }
      _display = 'Handvirk hnit';
      setMarker({ lat, lng });
    });

    saveBtn.addEventListener('click', async () => {
      if (!_coord) return;
      saveBtn.disabled = true; saveBtn.textContent = 'Vista…';
      await saveCoord(co, _coord, _display);
      toast('📍 Staðsetning vistuð fyrir ' + (co.nafn || ''));
      close();
      if (typeof onSaved === 'function') onSaved();
    });
  }

  // ── missing-locations manager ───────────────────────────────────────────────
  function openMissing() {
    const ov = document.createElement('div');
    ov.className = '_mg-ov';
    ov.innerHTML =
      '<div class="_mg-card" style="max-width:620px">' +
        '<div class="_mg-hd">📍 Staðsetningar sem vantar<button class="x" title="Loka">✕</button></div>' +
        '<div class="_mg-body" style="padding:0">' +
          '<div id="_mg-mtop" style="padding:13px 16px;border-bottom:1px solid #eef2f7;display:flex;align-items:center;gap:10px;flex-wrap:wrap">' +
            '<div id="_mg-mcount" style="font-weight:700;color:#0f172a"></div>' +
            '<span style="flex:1"></span>' +
            '<button class="_mg-btn pri" id="_mg-auto">🔍 Sjálfvirkt allar</button>' +
          '</div>' +
          '<div id="_mg-prog" class="_mg-prog" style="display:none;margin:0 16px"><i></i></div>' +
          '<div id="_mg-mlist" style="max-height:60vh;overflow:auto"></div>' +
        '</div>' +
      '</div>';
    document.body.appendChild(ov);

    let _cancelAuto = false;
    const close = () => { _cancelAuto = true; ov.remove(); };
    ov.addEventListener('click', e => { if (e.target === ov) close(); });
    ov.querySelector('.x').addEventListener('click', close);

    function render() {
      const list = missingCompanies();
      $('_mg-mcount').textContent = list.length + ' fyrirtæki án staðsetningar';
      const body = $('_mg-mlist');
      if (!list.length) {
        body.innerHTML = '<div style="padding:26px;text-align:center;color:#16a34a;font-weight:600">✅ Allar staðsetningar á kortinu!</div>';
        return;
      }
      body.innerHTML = list.map(c =>
        '<div class="_mg-row" data-id="' + c.id + '">' +
          '<div style="flex:1;min-width:0">' +
            '<div style="font-weight:600;color:#0f172a;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(c.nafn || '—') + '</div>' +
            '<div style="font-size:11px;color:#64748b;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' +
              (c.heimilisfang ? esc(c.heimilisfang) : '<span style="color:#dc2626">⚠ ekkert heimilisfang</span>') + '</div>' +
          '</div>' +
          '<button class="_mg-btn" data-act="fix" style="flex-shrink:0">✎ Setja</button>' +
        '</div>'
      ).join('');
      body.querySelectorAll('[data-act="fix"]').forEach(b => b.addEventListener('click', () => {
        const id = b.closest('._mg-row').dataset.id;
        const co = (window.Companies && Companies.list || []).find(x => String(x.id) === String(id));
        if (co) open(co, render);
      }));
    }
    render();

    let _running = false;
    const autoBtn = $('_mg-auto');
    autoBtn.addEventListener('click', async () => {
      if (_running) { _cancelAuto = true; return; }   // click while running = stop
      const list = missingCompanies().filter(c => c.heimilisfang);
      if (!list.length) return;
      _running = true; _cancelAuto = false;
      autoBtn.textContent = '⏹ Stöðva'; autoBtn.classList.remove('pri');
      const prog = $('_mg-prog'); prog.style.display = 'block';
      const bar = prog.querySelector('i');
      let done = 0, hit = 0;
      for (const c of list) {
        if (_cancelAuto) break;
        const res = await geocodeOne(c.heimilisfang);
        if (res) { await saveCoord(c, { lat: res.lat, lng: res.lng }, res.display_name); hit++; }
        done++;
        bar.style.width = Math.round(done / list.length * 100) + '%';
        $('_mg-mcount').textContent = 'Leita… ' + done + '/' + list.length + ' (fann ' + hit + ')';
        if (done < list.length && !_cancelAuto) await new Promise(r => setTimeout(r, 1200)); // Nominatim-polite
      }
      prog.style.display = 'none';
      autoBtn.textContent = '🔍 Sjálfvirkt allar'; autoBtn.classList.add('pri');
      _running = false;
      toast('Fann ' + hit + ' af ' + list.length + ' staðsetningum.');
      render();
    });
  }

  window.ManualGeocode = { open, openMissing, missingCount: () => missingCompanies().length };

  // ── entry point on the Leiðsögn page ────────────────────────────────────────
  // A FIXED floating pill — never shifts the page layout or flickers when
  // Leiðsögn re-renders (the old inline banner was injected above the map and
  // popped in/out each tick). Persistent element; we only toggle text + display.
  let _fab = null;
  function ensureFab() {
    if (_fab) return _fab;
    _fab = document.createElement('button');
    _fab.id = '_mg-fab';
    _fab.type = 'button';
    _fab.className = '_mg-fab';
    _fab.style.display = 'none';
    _fab.addEventListener('click', openMissing);
    document.body.appendChild(_fab);
    return _fab;
  }
  function updateFab() {
    const fab = ensureFab();
    const canvas = document.getElementById('_lds-mapcanvas');
    if (!canvas || canvas.offsetParent === null) { fab.style.display = 'none'; return; } // not on Leiðsögn
    let n = 0;
    try { n = missingCompanies().length; } catch (_) { fab.style.display = 'none'; return; }
    if (n === 0) { fab.style.display = 'none'; return; }
    fab.textContent = '📍 ' + n + ' staðsetningar vantar — Laga';
    fab.style.display = 'inline-flex';
  }
  setInterval(updateFab, 1500);

  console.log('[manual-geocode v1] installed');
})();
/* === END MANUAL GEOCODE === */
