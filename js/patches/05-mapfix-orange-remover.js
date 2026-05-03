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
