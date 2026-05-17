/* === GEOCODE PRE-WARM v1 ===
 *
 * Background pre-warm of the geocode cache (_slokk_gc) at page load.
 * Resolves the "map is slow on first open" problem reported on
 * 2026-05-17: opening the embedded Ársskoðun map for the first time
 * triggers an in-foreground queue at 1.1s/customer — for 21+ customers
 * that's ≥24 seconds of progress-banner wait.
 *
 * Strategy:
 *   • Wait until Arsskodun._cache.list is populated (poll 500ms).
 *   • Filter to Ársskoðun customers (those with _ars.equipment) — the
 *     only set the embedded map shows.
 *   • Drop customers already in _slokk_gc by name OR address.
 *   • Geocode the rest silently in background at 1500ms throttle
 *     (a bit slower than patch 155's visible queue to be polite when
 *     both run concurrently).
 *   • Pause/stop when patch 155 starts a visible queue (which means
 *     the user opened the map — its queue takes over).
 *   • Resume after the visible queue finishes for any addresses still
 *     missing.
 *   • Silent — no UI surface. Just fills the cache so when the user
 *     toggles the map the first time, most pins drop instantly.
 *
 * Cap: 200 customers per session. Beyond that, the visible queue still
 *      handles the rest on demand. This bounds the background work
 *      and keeps Nominatim happy.
 */
(() => {
  if (window.__geocodePrewarmInstalled) return;
  window.__geocodePrewarmInstalled = true;

  const GC_CACHE_KEY = '_slokk_gc';   // SHARED with mapfix.js + patch 155
  const THROTTLE_MS  = 1500;          // slower than visible queue (1100ms)
  const MAX_PREWARM  = 400;           // cap per session (≥ all ars customers)

  let _cancelled = false;
  let _done = 0;
  let _started = false;

  const readGc  = () => { try { return JSON.parse(localStorage.getItem(GC_CACHE_KEY) || '{}'); } catch(e) { return {}; } };
  const writeGc = c  => { try { localStorage.setItem(GC_CACHE_KEY, JSON.stringify(c)); } catch(e) {} };

  async function geocodeOne(address) {
    if (!address || address.length < 3) return null;
    try {
      const r = await fetch('/api/geocode?q=' + encodeURIComponent(address));
      if (!r.ok) return null;
      const d = await r.json();
      if (d && typeof d.lat === 'number' && typeof d.lon === 'number') return { lat: d.lat, lng: d.lon };
    } catch(e) {}
    return null;
  }

  // Pull Ársskoðun-relevant customers WITHOUT requiring patch 153 to have
  // navigated to the view first (which is when its own _cache.list populates).
  // We combine Companies.list (all 444 customers, loaded at app boot) with
  // AppSettings.path('arsskodun_customers') (the per-customer ars metadata).
  // Only customers that appear in BOTH AND have ars.equipment are returned.
  function getArsCustomers() {
    const companies = (window.Companies && Companies.list) || null;
    const arsMap = (window.AppSettings && window.AppSettings.path && window.AppSettings.path('arsskodun_customers')) || null;
    if (!companies || !arsMap) return null;
    return companies.filter(c => {
      const ars = arsMap[String(c.id)];
      return ars && ars.equipment;
    });
  }

  function getMissing() {
    const customers = getArsCustomers();
    if (!customers) return null;
    const gc = readGc();
    const arsMap = (window.AppSettings && window.AppSettings.path && window.AppSettings.path('arsskodun_customers')) || {};
    const currentMonth = (new Date()).getMonth() + 1; // 1..12
    return customers
      .filter(c => {
        const addr = c.heimilisfang || c.nafn;
        if (!addr) return false;
        if (gc[c.nafn]) return false;
        if (c.heimilisfang && gc[c.heimilisfang]) return false;
        return true;
      })
      // Prioritize current-month customers — they're the ones the user is
      // most likely to filter to first thing in the morning.
      .sort((a, b) => {
        const am = +((arsMap[String(a.id)] || {}).inspect_month) || 99;
        const bm = +((arsMap[String(b.id)] || {}).inspect_month) || 99;
        const aPrio = (am === currentMonth) ? 0 : (am < currentMonth ? 2 : 1);
        const bPrio = (bm === currentMonth) ? 0 : (bm < currentMonth ? 2 : 1);
        if (aPrio !== bPrio) return aPrio - bPrio;
        return am - bm;
      });
  }

  // Pause pre-warm while the visible queue (patch 155's runGeocodeQueue) runs.
  // We detect it via window.__arsMapEmbedInstalled + the progress bar element,
  // OR by checking if patch 155 has set _queueState (it does, but it's in
  // closure scope — instead we look at the visible progress DOM).
  function isVisibleQueueActive() {
    return !!document.getElementById('_arsmap-progress');
  }

  async function runPrewarm() {
    if (_started) return;
    _started = true;
    const missing = getMissing();
    if (!missing || !missing.length) return;
    const work = missing.slice(0, MAX_PREWARM);
    console.log('[geocode-prewarm] starting silent pre-warm for', work.length, 'customers');
    for (let i = 0; i < work.length; i++) {
      if (_cancelled) break;
      // Yield to the visible queue if user opened the map
      while (isVisibleQueueActive() && !_cancelled) {
        await new Promise(r => setTimeout(r, 1000));
      }
      if (_cancelled) break;
      const co = work[i];
      // Re-check cache — visible queue might have geocoded this in the meantime
      const gc = readGc();
      if (gc[co.nafn] || (co.heimilisfang && gc[co.heimilisfang])) {
        _done++;
        continue;
      }
      const addr = co.heimilisfang || co.nafn;
      const coord = await geocodeOne(addr);
      if (coord) {
        const gc2 = readGc();
        gc2[co.nafn] = coord;
        if (co.heimilisfang) gc2[co.heimilisfang] = coord;
        writeGc(gc2);
      }
      _done++;
      if (i < work.length - 1) {
        await new Promise(r => setTimeout(r, THROTTLE_MS));
      }
    }
    console.log('[geocode-prewarm] done — geocoded', _done, 'addresses (cap', MAX_PREWARM, ')');
  }

  function waitForData() {
    if (_cancelled) return;
    const customers = getArsCustomers();
    if (customers && customers.length) {
      // Wait a bit more for any concurrent UI to settle
      setTimeout(runPrewarm, 2000);
      return;
    }
    setTimeout(waitForData, 500);
  }

  // Cancel on tab close to avoid orphan fetches (browsers handle this anyway,
  // but it's nice to be explicit).
  window.addEventListener('beforeunload', () => { _cancelled = true; });

  // Start after DOM is ready. Customer data load is async (Supabase) so
  // waitForData polls until the list is populated.
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', waitForData);
  } else {
    waitForData();
  }

  // Expose for debugging
  window.GeocodePrewarm = {
    status: () => ({ started: _started, done: _done, cancelled: _cancelled }),
    cancel: () => { _cancelled = true; }
  };

  console.log('[geocode-prewarm v1] installed');
})();
/* === END GEOCODE PRE-WARM === */
