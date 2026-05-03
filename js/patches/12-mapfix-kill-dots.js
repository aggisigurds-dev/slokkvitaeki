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
