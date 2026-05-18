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

  // Pull CONTRACT customers — fyrirtækjaþjónustu OR brunakerfi. These
  // are the addresses the team actually drives to. Non-contract companies
  // (~133 walk-in / sales records) don't need to be on the map and don't
  // need pre-geocoding. User's instruction 2026-05-18: "the map does not
  // need to read all the address only those that have contracts for us
  // to service at there location."
  function getArsCustomers() {
    const companies = (window.Companies && Companies.list) || null;
    const arsMap = (window.AppSettings && window.AppSettings.path && window.AppSettings.path('arsskodun_customers')) || null;
    const bruMap = (window.AppSettings && window.AppSettings.path && window.AppSettings.path('brunakerfi_customers')) || null;
    if (!companies) return null;
    if (!arsMap && !bruMap) return null;
    return companies.filter(c => {
      const ars = arsMap && arsMap[String(c.id)];
      const bru = bruMap && bruMap[String(c.id)];
      // Include if subscribed to either service. arsskodun needs equipment
      // (the legacy "is contract holder" flag); brunakerfi just needs a row.
      return (ars && ars.equipment) || bru;
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
      // Fire-and-forget bulk upload of any existing localStorage entries
      // to the shared Supabase cache. Doesn't block the pre-warm.
      syncLocalToShared();
      // Wait a bit more for any concurrent UI to settle
      setTimeout(runPrewarm, 2000);
      return;
    }
    setTimeout(waitForData, 500);
  }

  // One-time bulk upload of existing localStorage cache to the shared
  // Supabase cache (table: geocode_cache). Without this, the 100+
  // addresses already resolved on this PC stay local — other PCs
  // would have to re-geocode them. This step makes the shared cache
  // benefit retroactive. Runs once per browser session, guarded by
  // localStorage flag. Bulk insert in one round-trip; upsert via
  // Prefer: resolution=merge-duplicates so concurrent uploads from
  // multiple PCs don't conflict.
  const SYNC_FLAG = '_slokk_gc_synced_v1';
  async function syncLocalToShared() {
    if (localStorage.getItem(SYNC_FLAG)) return;
    if (!window.SUPABASE_URL || !window.SUPABASE_KEY) return;
    const gc = readGc();
    const entries = Object.entries(gc).filter(([k, v]) =>
      typeof k === 'string' && k.length >= 3 &&
      v && typeof v.lat === 'number' && typeof v.lng === 'number'
    );
    if (!entries.length) {
      localStorage.setItem(SYNC_FLAG, '1');
      return;
    }
    const rows = entries.map(([query, c]) => ({
      query, lat: c.lat, lng: c.lng,
      display_name: c.display_name || null,
      source: 'local-sync',
    }));
    try {
      const r = await fetch(window.SUPABASE_URL + '/rest/v1/geocode_cache', {
        method: 'POST',
        headers: {
          apikey: window.SUPABASE_KEY,
          Authorization: 'Bearer ' + window.SUPABASE_KEY,
          'Content-Type': 'application/json',
          Prefer: 'resolution=merge-duplicates',
        },
        body: JSON.stringify(rows),
      });
      if (r.ok) {
        console.log('[geocode-prewarm] synced', rows.length, 'local entries to shared cache');
        localStorage.setItem(SYNC_FLAG, '1');
      } else {
        console.warn('[geocode-prewarm] sync failed', r.status);
      }
    } catch (e) {
      console.warn('[geocode-prewarm] sync error', e);
    }
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
