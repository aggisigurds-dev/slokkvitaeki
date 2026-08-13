/* === GEOCODE CACHE FROM APPSETTINGS v1 (2026-05-25) ===
 *
 * The map (Leiðsögn, Ársskoðun-embed, etc.) reads coords from a
 * per-browser localStorage cache `_slokk_gc`. When the user opens the
 * app in a fresh browser (or after clearing storage) the cache is empty
 * and the map shows ~150 missing pins while patch 156's background
 * prewarm slowly fills it at 1.5 s/address — that's ~4 minutes of
 * "📍 Engin staðsetning" before pins drop.
 *
 * This patch piggybacks a SERVER-SIDE geocode cache stored under
 * AppSettings.geocode_cache and merges it into localStorage on every
 * page load. The cache is generated once by a backfill script and
 * extended whenever a new address gets geocoded (patch 156 also writes
 * to AppSettings now — wired below).
 *
 * Schema:
 *   AppSettings.geocode_cache = { "<address>": {"lat": Number, "lng": Number}, ... }
 *
 * Merge rules:
 *   - LocalStorage keys win if both have a value (user's edits stay sticky)
 *   - New keys from AppSettings get added immediately
 *   - Doesn't try to invalidate stale entries (handled by re-geocoding)
 */
(() => {
  if (window.__geocodeCacheFromAppSettingsInstalled) return;
  window.__geocodeCacheFromAppSettingsInstalled = true;

  const GC_KEY = '_slokk_gc';

  function readLocal() {
    try { return JSON.parse(localStorage.getItem(GC_KEY) || '{}'); } catch (_) { return {}; }
  }
  function writeLocal(c) {
    try { localStorage.setItem(GC_KEY, JSON.stringify(c)); } catch (_) {}
  }

  function getServerCache() {
    if (!window.AppSettings || typeof window.AppSettings.path !== 'function') return null;
    const blob = window.AppSettings.path('geocode_cache');
    return (blob && typeof blob === 'object') ? blob : null;
  }

  function mergeFromServer() {
    const server = getServerCache();
    if (!server) return { merged: 0, total: 0 };
    const local = readLocal();
    let merged = 0;
    let total = 0;
    for (const key in server) {
      total++;
      const v = server[key];
      if (!v || typeof v.lat !== 'number' || typeof v.lng !== 'number') continue;
      if (local[key]) continue;   // local wins
      local[key] = v;
      merged++;
    }
    if (merged > 0) {
      writeLocal(local);
      console.log('[geocode-merge] +' + merged + ' coords from AppSettings (' + total + ' available)');
      // Nudge any open map to refresh
      try {
        if (window._slokk_refresh) window._slokk_refresh();
        if (window.MapModule && typeof window.MapModule.refresh === 'function') window.MapModule.refresh();
      } catch (_) {}
    }
    return { merged, total };
  }

  // Wait for AppSettings to be ready, then merge.
  function tryMerge(attempt) {
    attempt = attempt || 0;
    if (window.AppSettings && typeof window.AppSettings.path === 'function') {
      const r = getServerCache();
      if (r) { mergeFromServer(); return; }
    }
    if (attempt > 30) return;   // give up after ~15 s
    setTimeout(() => tryMerge(attempt + 1), 500);
  }
  tryMerge();

  // Re-merge whenever AppSettings reload (patches save it periodically).
  if (window.AppSettings && typeof window.AppSettings.onChange === 'function') {
    window.AppSettings.onChange('geocode_cache', mergeFromServer);
  }

  // Expose for debugging / forced refresh.
  window._slokk_mergeGeocodeFromAppSettings = mergeFromServer;
})();
