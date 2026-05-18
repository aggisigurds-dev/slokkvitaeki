/* === ARSSKODUN MAP EMBED v1 ===
 *
 * Embeds a Leaflet map into the "Fyrirtæki í Þjónustu" (Ársskoðun) page.
 * Replaces the cross-view-jump to Þjónustutæki with an in-page map.
 *
 * Behavior:
 *   • A "🗺️ Sýna kort" toggle appears between the filter chips and the
 *     customer list. Clicking expands a 380px Leaflet map above the list.
 *   • Pins are colored by status (overdue/due/done/unknown), driven from
 *     the same _ars data the list uses.
 *   • Pin click → scrolls the customer's row into view + flashes it.
 *   • Filter changes (month, status, search) re-render the list — we
 *     watch and refresh the pin set automatically.
 *   • Geocode cache is SHARED with mapfix.js via localStorage key
 *     `_slokk_gc` — addresses already resolved in view-field show pins
 *     here without re-geocoding.
 *   • Companies without a cached coord are geocoded on demand (only
 *     when the user explicitly asks via the modal's map button) — we
 *     do NOT bulk-geocode 444 customers on every map open.
 *
 * Modal button rewiring:
 *   The detail modal's "🗺️ Sjá á Þjónustutæki" button (and the
 *   `_ars-open-map` row buttons) used to call patch 153's openOnMap()
 *   which switched to view-field. We intercept those clicks in the
 *   capture phase and call our in-page focus instead — modal closes,
 *   map expands, pin opens. No view-switching, no 7-second wait, no
 *   confusing "front page" landing.
 *
 * Exposed: window.ArsMapEmbed = { focus(coId), toggle(open?),
 *                                  isOpen(), version }
 */
(() => {
  if (window.__arsMapEmbedInstalled) return;
  window.__arsMapEmbedInstalled = true;

  const LS_VISIBLE   = 'ars_map_visible';
  const GC_CACHE_KEY = '_slokk_gc';  // SHARED with mapfix.js

  let _map        = null;
  let _markers    = {};  // coId -> Leaflet marker
  let _leafletLP  = null;
  let _lastSig    = '';
  let _queueAbort = null;  // function to cancel running geocode queue
  let _queueState = null;  // { done, total, current } while running

  // ── localStorage helpers ────────────────────────────────────────────
  const isVisible = () => localStorage.getItem(LS_VISIBLE) === '1';
  const setVisible = v => localStorage.setItem(LS_VISIBLE, v ? '1' : '0');
  const readGc  = () => { try { return JSON.parse(localStorage.getItem(GC_CACHE_KEY) || '{}'); } catch(e) { return {}; } };
  const writeGc = c  => { try { localStorage.setItem(GC_CACHE_KEY, JSON.stringify(c)); } catch(e) {} };

  // ── Geocode one address via the Netlify proxy (same as mapfix.js) ──
  async function geocodeOne(address) {
    if (!address || address.length < 3) return null;
    try {
      const r = await fetch('/api/geocode?q=' + encodeURIComponent(address));
      if (!r.ok) return null;
      const d = await r.json();
      if (d && typeof d.lat === 'number' && typeof d.lon === 'number') return { lat: d.lat, lng: d.lon };
    } catch(e) { console.warn('[ars-map-embed] geocode failed', address, e); }
    return null;
  }

  // ── Status color for a company ─────────────────────────────────────
  // Uses the same logic as mapfix.js when uttaeki data is available;
  // falls back to Ársskoðun's inspect_month / last_year_inspected when
  // there are no uttaeki rows yet.
  function statusFor(co) {
    const units = (window.DB && window.DB.cache && window.DB.cache.units) || [];
    const _today = new Date().toISOString().slice(0,10);
    const _d30   = new Date(Date.now() + 30*86400000).toISOString().slice(0,10);
    const cu = units.filter(u => u.status === 'active' && u.client === co.nafn);
    if (cu.length) {
      let overdue=0, due=0, ok=0, noDate=0;
      cu.forEach(u => {
        if (!u.next_insp)                 noDate++;
        else if (u.next_insp < _today)    overdue++;
        else if (u.next_insp <= _d30)     due++;
        else                              ok++;
      });
      if (overdue) return { color: '#dc2626', label: 'Útrunnið', count: cu.length };
      if (due)     return { color: '#b45309', label: 'Rennur út', count: cu.length };
      if (noDate && !ok) return { color: '#6b7280', label: 'Engar dagsetningar', count: cu.length };
      return       { color: '#1a7f4b', label: 'Í lagi', count: cu.length };
    }
    // Fall back to _ars (Ársskoðun import) data
    const ars = co._ars || {};
    const curYear  = new Date().getFullYear();
    const curMonth = new Date().getMonth() + 1;
    if (+ars.last_year_inspected === curYear) return { color: '#1a7f4b', label: 'Búið ' + curYear, count: 0 };
    const m = +ars.inspect_month || 0;
    if (m > 0 && m < curMonth)          return { color: '#dc2626', label: 'Útrunnið', count: 0 };
    if (m > 0 && m <= curMonth + 2)     return { color: '#b45309', label: 'Næsti mánuður/tveir', count: 0 };
    if (m > 0)                          return { color: '#0f766e', label: 'Síðar á árinu', count: 0 };
    return { color: '#94a3b8', label: '—', count: 0 };
  }

  function makeIcon(color) {
    return L.divIcon({
      className: 'ars-map-marker',
      html: '<div style="background:'+color+';width:14px;height:14px;border-radius:50%;border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,0.4)"></div>',
      iconSize: [18, 18],
      iconAnchor: [9, 9]
    });
  }

  function popupHtml(co, status) {
    const addr = co.heimilisfang || '';
    const ars = co._ars || {};
    const months = ['jan','feb','mar','apr','maí','jún','júl','ágú','sep','okt','nóv','des'];
    const mn = +ars.inspect_month;
    const monthStr = mn >= 1 && mn <= 12 ? months[mn-1] : '';
    return '<div style="font:13px/1.45 system-ui,sans-serif;min-width:180px">' +
      '<div style="font-weight:700;font-size:14px;color:#0f172a">' + esc(co.nafn) + '</div>' +
      (addr ? '<div style="color:#64748b;font-size:12px;margin-top:2px">' + esc(addr) + '</div>' : '') +
      '<div style="margin-top:6px;display:flex;gap:8px;align-items:center;font-size:11.5px">' +
        '<span style="color:'+status.color+';font-weight:700">●</span> ' +
        '<span style="color:'+status.color+';font-weight:600">' + esc(status.label) + '</span>' +
        (monthStr ? ' <span style="color:#94a3b8">· skoðun: ' + monthStr + '</span>' : '') +
      '</div>' +
      '<div style="margin-top:8px"><button data-co-jump="'+co.id+'" style="padding:4px 10px;border:1px solid #cbd5e1;background:#fff;color:#0f172a;border-radius:6px;cursor:pointer;font:inherit;font-size:11px">Opna í lista</button></div>' +
    '</div>';
  }

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

  // ── Load Leaflet on demand ─────────────────────────────────────────
  function ensureLeaflet() {
    if (typeof L !== 'undefined') return Promise.resolve();
    if (_leafletLP) return _leafletLP;
    _leafletLP = new Promise(resolve => {
      const css = document.createElement('link');
      css.rel = 'stylesheet';
      css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(css);
      const sc = document.createElement('script');
      sc.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      sc.onload = () => resolve();
      document.head.appendChild(sc);
    });
    return _leafletLP;
  }

  async function buildMap(container) {
    await ensureLeaflet();
    if (_map) return _map;
    _map = L.map(container).setView([64.1355, -21.8954], 11);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
      maxZoom: 19
    }).addTo(_map);
    // Click-on-popup delegate (the "Opna í lista" button inside popups)
    _map.on('popupopen', e => {
      const root = e.popup.getElement();
      const btn = root && root.querySelector('[data-co-jump]');
      if (btn) btn.addEventListener('click', () => {
        const id = parseInt(btn.dataset.coJump, 10);
        if (id) highlightRow(id);
      }, { once: true });
    });
    return _map;
  }

  // ── Read filtered customer IDs from the rendered ars-main ──────────
  // Restricted to contract holders only — the map shows where we actually
  // drive to service customers. Non-contract companies (~133 walk-in
  // records) get cards on the list but no pins on the map. User instruction
  // 2026-05-18: "the map does not need to read all the address only those
  // that have contracts for us to service at there location."
  function getVisibleCoIds() {
    const main = document.getElementById('ars-main');
    if (!main) return [];
    const arsMap = (window.AppSettings && window.AppSettings.path && window.AppSettings.path('arsskodun_customers')) || {};
    const bruMap = (window.AppSettings && window.AppSettings.path && window.AppSettings.path('brunakerfi_customers')) || {};
    const isContract = (id) => {
      const ars = arsMap[String(id)];
      const bru = bruMap[String(id)];
      return !!((ars && ars.equipment) || bru);
    };
    const set = new Set();
    main.querySelectorAll('[data-co-id]').forEach(el => {
      const id = parseInt(el.dataset.coId, 10);
      if (id && isContract(id)) set.add(id);
    });
    return Array.from(set);
  }

  // ── Background queue: geocode missing visible customers ────────────
  // The existing geocode cache (_slokk_gc) was built up by the old
  // Þjónustutæki "Uppfæra" sweep. Many newly-imported Ársskoðun
  // customers aren't in it, so the map opens empty for them. This
  // queue fills the gaps in the background: 1 request per second
  // (Nominatim policy), updates the progress banner, drops each pin
  // as soon as its coord resolves.
  async function runGeocodeQueue(missing) {
    if (_queueAbort) return; // already running
    if (!missing.length) { hideProgress(); return; }
    let cancelled = false;
    _queueAbort = () => { cancelled = true; };
    _queueState = { done: 0, total: missing.length, currentName: '' };
    showProgress();
    for (let i = 0; i < missing.length && !cancelled; i++) {
      const co = missing[i];
      _queueState.currentName = co.nafn;
      _queueState.done = i;
      showProgress();
      const addr = co.heimilisfang || co.nafn;
      const coord = await geocodeOne(addr);
      if (cancelled) break;
      if (coord) {
        const gc = readGc();
        gc[co.nafn] = coord;
        if (co.heimilisfang) gc[co.heimilisfang] = coord;
        writeGc(gc);
        // Drop the pin live
        if (_map && !_markers[co.id]) {
          const status = statusFor(co);
          const m = L.marker([coord.lat, coord.lng], { icon: makeIcon(status.color) }).addTo(_map);
          m.bindPopup(popupHtml(co, status));
          _markers[co.id] = m;
        }
      }
      // Throttle: 1.1s to be polite to Nominatim
      if (i < missing.length - 1 && !cancelled) {
        await new Promise(r => setTimeout(r, 1100));
      }
    }
    _queueAbort = null;
    _queueState = null;
    hideProgress();
    // After full sweep, fit bounds to new set
    if (!cancelled && _map) {
      const pts = Object.values(_markers).map(m => m.getLatLng());
      if (pts.length > 1) {
        try { _map.fitBounds(L.latLngBounds(pts).pad(0.15)); } catch(e) {}
      }
    }
  }

  function showProgress() {
    let bar = document.getElementById('_arsmap-progress');
    if (!bar) {
      const panel = document.getElementById('_arsmap-panel');
      if (!panel) return;
      bar = document.createElement('div');
      bar.id = '_arsmap-progress';
      bar.style.cssText = 'padding:7px 12px;background:#fef3c7;border-bottom:1px solid #fde68a;display:flex;justify-content:space-between;align-items:center;font:12px/1.4 system-ui,sans-serif;color:#92400e';
      panel.insertBefore(bar, panel.firstChild);
    }
    if (!_queueState) return;
    bar.innerHTML =
      '<div>🔄 <strong>' + _queueState.done + ' af ' + _queueState.total + '</strong> staðsetningar — núna: ' + esc(_queueState.currentName || '') + '</div>' +
      '<button id="_arsmap-cancel" type="button" style="padding:3px 9px;background:#fff;border:1px solid #fcd34d;border-radius:5px;cursor:pointer;font:inherit;font-size:11px;color:#92400e">Hætta</button>';
    const cb = document.getElementById('_arsmap-cancel');
    if (cb) cb.addEventListener('click', () => { if (_queueAbort) _queueAbort(); hideProgress(); }, { once: true });
  }
  function hideProgress() {
    const bar = document.getElementById('_arsmap-progress');
    if (bar) bar.remove();
  }

  // ── Refresh pins to match the filtered set ─────────────────────────
  function refreshPins() {
    if (!_map) return;
    const ids = getVisibleCoIds();
    const idSet = new Set(ids);
    const list = (window.Arsskodun && window.Arsskodun._cache && window.Arsskodun._cache.list) || [];
    const byId = Object.fromEntries(list.map(c => [c.id, c]));
    const gc = readGc();

    // Remove markers no longer in filter
    Object.keys(_markers).forEach(id => {
      if (!idSet.has(+id)) {
        try { _map.removeLayer(_markers[id]); } catch(e) {}
        delete _markers[id];
      }
    });

    // Add markers for new visible (only if address is in geocode cache)
    const placed = [];
    ids.forEach(coId => {
      if (_markers[coId]) {
        placed.push(_markers[coId].getLatLng());
        return;
      }
      const co = byId[coId];
      if (!co) return;
      const coord = gc[co.nafn] || gc[co.heimilisfang || ''] || null;
      if (!coord) return;
      const status = statusFor(co);
      const m = L.marker([coord.lat, coord.lng], { icon: makeIcon(status.color) }).addTo(_map);
      m.bindPopup(popupHtml(co, status));
      _markers[coId] = m;
      placed.push(m.getLatLng());
    });

    if (placed.length > 1) {
      try { _map.fitBounds(L.latLngBounds(placed).pad(0.15)); } catch(e) {}
    } else if (placed.length === 1) {
      _map.setView(placed[0], 14);
    }

    // Identify missing-coord visible customers and queue them for background geocode.
    // Only triggers if not already running. Filter changes will cancel old queue and start a new one.
    const missing = ids
      .filter(id => !_markers[id])
      .map(id => byId[id])
      .filter(co => co && (co.heimilisfang || co.nafn));
    if (missing.length && !_queueAbort) {
      runGeocodeQueue(missing);
    } else if (missing.length === 0 && _queueAbort) {
      // Filter narrowed; nothing left to geocode → stop the existing queue
      _queueAbort();
    } else if (missing.length && _queueAbort) {
      // Filter changed mid-queue → restart with the new set
      _queueAbort();
      // Give the cancellation a tick to settle, then restart
      setTimeout(() => { if (!_queueAbort && _map && isVisible()) runGeocodeQueue(missing); }, 200);
    }
  }

  // ── Highlight row in the list ──────────────────────────────────────
  function highlightRow(coId) {
    const els = document.querySelectorAll('#ars-main [data-co-id="' + coId + '"]');
    if (!els.length) return;
    const el = els[0];
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const prev = el.style.background;
    el.style.transition = 'background 1.6s ease';
    el.style.background = '#fef3c7';
    setTimeout(() => { el.style.background = prev || ''; }, 1700);
  }

  // ── Focus on a specific company (called by modal/row buttons) ──────
  async function focusOnCompany(coId) {
    coId = parseInt(coId, 10);
    if (!coId) return;
    if (!isVisible()) {
      setVisible(true);
      await openPanel();
    }
    // Already pinned?
    const existing = _markers[coId];
    if (existing && _map) {
      _map.setView(existing.getLatLng(), 16, { animate: true });
      setTimeout(() => { try { existing.openPopup(); } catch(e) {} }, 350);
      return;
    }
    // Need to geocode this one
    const co = (window.Arsskodun && window.Arsskodun._cache && window.Arsskodun._cache.byId && window.Arsskodun._cache.byId[coId]);
    if (!co) return;
    const addr = co.heimilisfang || co.nafn;
    if (!addr) {
      toast('Þetta fyrirtæki er ekki með heimilisfang skráð.');
      return;
    }
    toast('Sæki staðsetningu fyrir ' + co.nafn + '…');
    const coord = await geocodeOne(addr);
    if (!coord) {
      toast('Ekki tókst að staðsetja "' + co.nafn + '". Athugaðu heimilisfangið.');
      return;
    }
    const gc = readGc();
    gc[co.nafn] = coord;
    if (co.heimilisfang) gc[co.heimilisfang] = coord;
    writeGc(gc);

    if (!_map) await openPanel();
    const status = statusFor(co);
    const m = L.marker([coord.lat, coord.lng], { icon: makeIcon(status.color) }).addTo(_map);
    m.bindPopup(popupHtml(co, status));
    _markers[coId] = m;
    _map.setView([coord.lat, coord.lng], 16, { animate: true });
    setTimeout(() => { try { m.openPopup(); } catch(e) {} }, 350);
  }

  function toast(msg) {
    if (window.Toast && Toast.show) return Toast.show(msg);
    const t = document.createElement('div');
    t.style.cssText = 'position:fixed;bottom:28px;left:50%;transform:translateX(-50%);background:#0f172a;color:#fff;padding:10px 18px;border-radius:8px;font:13px/1.4 system-ui,sans-serif;box-shadow:0 4px 14px rgba(0,0,0,.3);z-index:99999;max-width:360px;text-align:center';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 4500);
  }

  // ── Open / close the panel ─────────────────────────────────────────
  async function openPanel() {
    const panel = document.getElementById('_arsmap-panel');
    const btn   = document.getElementById('_arsmap-toggle');
    if (!panel) return;
    panel.style.display = 'block';
    if (btn) btn.textContent = '🗺️ Fela kort';
    const mc = document.getElementById('_arsmap-container');
    if (mc) {
      await buildMap(mc);
      setTimeout(() => {
        try { _map.invalidateSize(); } catch(e) {}
        refreshPins();
      }, 50);
    }
  }
  function closePanel() {
    const panel = document.getElementById('_arsmap-panel');
    const btn   = document.getElementById('_arsmap-toggle');
    if (panel) panel.style.display = 'none';
    if (btn) btn.textContent = '🗺️ Sýna kort';
  }
  async function toggle(open) {
    if (open === undefined) open = !isVisible();
    setVisible(open);
    if (open) await openPanel();
    else closePanel();
  }

  // ── Inject the toggle button + panel into ars-main ────────────────
  function inject() {
    const main = document.getElementById('ars-main');
    if (!main) return false;
    if (main.querySelector('#_arsmap-wrapper')) return true;
    // Anchor after the month-chip row
    const chips = main.querySelectorAll('._ars-mo');
    if (!chips.length) return false;
    const chipRow = chips[0].closest('div');
    if (!chipRow) return false;
    const wrap = document.createElement('div');
    wrap.id = '_arsmap-wrapper';
    wrap.style.cssText = 'margin:0 0 14px 0;';
    wrap.innerHTML =
      '<div style="display:flex;justify-content:flex-end;margin-bottom:6px">' +
        '<button id="_arsmap-toggle" type="button" style="padding:5px 12px;border:1px solid #cbd5e1;background:#fff;color:#0f172a;border-radius:8px;cursor:pointer;font:inherit;font-size:11.5px;font-weight:600">' + (isVisible() ? '🗺️ Fela kort' : '🗺️ Sýna kort') + '</button>' +
      '</div>' +
      '<div id="_arsmap-panel" style="display:' + (isVisible() ? 'block' : 'none') + ';background:#fff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden">' +
        '<div id="_arsmap-container" style="width:100%;height:380px;background:#f1f5f9"></div>' +
      '</div>';
    chipRow.parentNode.insertBefore(wrap, chipRow.nextSibling);
    document.getElementById('_arsmap-toggle').addEventListener('click', () => toggle());
    if (isVisible()) openPanel();
    return true;
  }

  // ── Watch for re-renders of ars-main; refresh pins on each ─────────
  function watch() {
    if (!inject()) { setTimeout(watch, 500); return; }
    const main = document.getElementById('ars-main');
    if (!main) return;
    new MutationObserver(() => {
      // Re-inject if our widget got wiped by a render
      if (!main.querySelector('#_arsmap-wrapper')) inject();
      // Refresh pins (only if map is open) when the visible-row set changes
      const sig = JSON.stringify(getVisibleCoIds());
      if (sig === _lastSig) return;
      _lastSig = sig;
      if (_map && isVisible()) refreshPins();
    }).observe(main, { childList: true });
  }

  // ── Intercept clicks on patch 153's map buttons → use embed instead
  // Capture phase so we beat patch 153's bubble-phase handler.
  document.addEventListener('click', e => {
    const btn = e.target && e.target.closest && e.target.closest('._ars-open-map, ._ars-go-map');
    if (!btn) return;
    const coId = btn.dataset.coId || (btn.closest('._ars-modal-bg') && btn.closest('._ars-modal-bg').dataset.coId);
    if (!coId) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    // Close any open modal first so the map is visible
    document.querySelectorAll('._ars-modal-bg').forEach(n => n.remove());
    focusOnCompany(coId);
  }, true);

  // ── Þjónustutæki sidebar nav: previously hidden by this patch, now
  // RESTORED. The user reported that forward-links into view-field's
  // Tæki management got hard to reach when the nav was hidden, and
  // refreshing the page landed on the Sala frontpage requiring full
  // re-navigation. The embedded map COMPLEMENTS view-field for
  // route-planning, but view-field is still where equipment-level
  // work happens. Both stay accessible.
  function unhideFieldNavOnce() {
    document.querySelectorAll('.vnav-btn[data-view="field"]').forEach(b => {
      if (b.style.display === 'none') b.style.display = '';
    });
  }
  function startUnhideFieldNavObserver() {
    const nav = document.querySelector('nav.view-nav, .view-nav');
    if (!nav) { setTimeout(startUnhideFieldNavObserver, 500); return; }
    unhideFieldNavOnce();
    // In case a stale localStorage state or another patch keeps trying
    // to hide it, undo on every mutation.
    new MutationObserver(() => { unhideFieldNavOnce(); }).observe(nav, { childList: true, subtree: true });
  }

  // ── Boot ───────────────────────────────────────────────────────────
  function boot() {
    const t = () => {
      if (document.getElementById('ars-main')) { watch(); return; }
      setTimeout(t, 500);
    };
    t();
    startUnhideFieldNavObserver();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  // ── Public API ─────────────────────────────────────────────────────
  window.ArsMapEmbed = {
    focus:  focusOnCompany,
    toggle,
    isOpen: isVisible,
    refresh: refreshPins,
    version: 'v1'
  };
  console.log('[ars-map-embed] v1 installed');
})();
/* === END ARSSKODUN MAP EMBED === */
