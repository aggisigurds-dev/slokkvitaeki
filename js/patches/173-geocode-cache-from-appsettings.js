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

  /* 08.10.2026 (yfirferð): `readLocal` þáttaði ALLT skyndiminnið upp á nýtt í hverju kalli.
   * Mælt: 0,60 ms fyrir 70 kB á skrifborði, 2–4 ms á síma — og kallið kemur nú við hverja
   * vistun í appinu (`onChange`), sem eru 290 kallstaðir í 74 skrám. Papp 156 leysir þetta
   * þegar með `_gcRaw`/`_gcObj`: þátta aðeins þegar hrái strengurinn hefur breyst. Sama
   * mynstur hér — 0,60 ms verða 0,003 ms þegar enginn skrifaði á milli. Engin hegðunarbreyting. */
  let _raw = null, _obj = null;
  function readLocal() {
    try {
      const raw = localStorage.getItem(GC_KEY) || '{}';
      if (raw === _raw && _obj) return _obj;
      _raw = raw; _obj = JSON.parse(raw);
      return _obj;
    } catch (_) { return {}; }
  }
  function writeLocal(c) {
    try { const raw = JSON.stringify(c); localStorage.setItem(GC_KEY, raw); _raw = raw; _obj = c; } catch (_) {}
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

  /* 08.10.2026 — ÁSKRIFTIN VAR DAUÐUR KÓÐI, OG TÍMAMÆLARNIR FALDI ÞAÐ.
   *
   * Tvennt var að. Hið fyrra lagaði ég 07.10: hér stóð `onChange('geocode_cache', fn)` en
   * `onChange(fn)` í papp 85 tekur EITT viðfang og hleypir aðeins föllum að. Hið síðara sást
   * ekki fyrr en við yfirferð: **173 er hlaðinn á undan 85** (index.html 508 á móti 596, báðir
   * `defer` → skjalaröð), svo `window.AppSettings` er `undefined` þegar þessi lína er lesin.
   * Vörðurinn `if (window.AppSettings && …)` var því ósannur og áskriftin ALDREI skráð —
   * hvor útgáfan sem var. Það sem lét prófin virka voru þrír `setTimeout` (3/8/20 s), þ.e.
   * ágiskun um hvenær ferskar stillingar bærust.
   *
   * RÓTIN er að áskriftin var skráð við eval, áður en það sem á að áskrifa sig að er til.
   * `tryMerge` bíður ÞEGAR eftir `AppSettings` — svo allt á heima þar:
   *   · samruni strax (staðbundna afritið sem er komið),
   *   · `onChange` skráð ÞÁ, þegar fallið er raunverulega til,
   *   · og `load()` hengt á — það er dedupe-að í 85 (`_loadP`), svo það bætir ENGRI beiðni
   *     við og leysist nákvæmlega þegar ferskar stillingar eru komnar í minni.
   * Þrír tímamælar falla út: engin ágiskun, og virkar líka á neti þar sem 20 s dugðu ekki.
   */
  function tengjaVidStillingar(attempt) {
    attempt = attempt || 0;
    const AS = window.AppSettings;
    if (AS && typeof AS.path === 'function') {
      if (getServerCache()) mergeFromServer();                 // það sem þegar er komið
      try { if (typeof AS.onChange === 'function') AS.onChange(mergeFromServer); } catch (_) {}
      try { if (typeof AS.load === 'function') AS.load().then(mergeFromServer, () => {}); } catch (_) {}
      return;
    }
    if (attempt > 60) return;   // ~30 s og svo hætt — 85 kemur seinna í skjalaröðinni
    setTimeout(() => tengjaVidStillingar(attempt + 1), 500);
  }
  tengjaVidStillingar();

  // Expose for debugging / forced refresh.
  window._slokk_mergeGeocodeFromAppSettings = mergeFromServer;
})();
