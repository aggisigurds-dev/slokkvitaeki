/* === IN-SERVICE CLIENTS (active uttaeki) v1 ===
 *
 * 2026-06-01: Source-of-truth for "is this company in service?" moved from the
 * manual `arsskodun_customers` snapshot to the real `uttaeki` equipment table
 * (see patch 153's Fyrirtæki í Þjónustu list). But two consumers still keyed
 * off the manual snapshot only:
 *   • patch 156 geocode-prewarm  → never geocoded uttaeki-only companies, so
 *   • patch 161 Leiðsögn         → ~199 of 439 in-service addresses had no pin.
 *
 * This tiny shared module loads ONCE at boot the set of company names that
 * have ≥1 active unit in `uttaeki`, folded the same way patch 153 does
 * (fyrirtaeki.nafn ↔ uttaeki.client). Both consumers ask `has(nafn)`.
 *
 *   window.InServiceClients.ready()  → Promise<Set<foldedName>>
 *   window.InServiceClients.has(nafn)→ boolean (false until loaded)
 *   window.InServiceClients.loaded() → boolean
 *   window.InServiceClients.onReady(fn)
 */
(() => {
  if (window.InServiceClients) return;

  // Same fold as patch 153 — keep identical so the in-service set matches the
  // Fyrirtæki í Þjónustu list exactly.
  function foldName(s) {
    return String(s || '').toLowerCase().trim()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/þ/g, 'th').replace(/ð/g, 'd').replace(/æ/g, 'ae').replace(/ö/g, 'o')
      .replace(/[.,]/g, '')          // 2026-06-02: keep identical to patch 153 — ignore
      .replace(/\s+/g, ' ').trim();  // punctuation so renames don't break the name match
  }

  let _set = null;            // Set<foldedName> with ≥1 active unit
  let _promise = null;
  const _listeners = [];

  async function fetchSet() {
    const out = new Set();
    if (!window.SUPABASE_URL || !window.SUPABASE_KEY) return out;
    try {
      let from = 0; const page = 1000;
      while (true) {
        const r = await fetch(
          window.SUPABASE_URL + '/rest/v1/uttaeki?select=client&status=eq.active',
          {
            headers: {
              apikey: window.SUPABASE_KEY,
              Authorization: 'Bearer ' + window.SUPABASE_KEY,
              Range: from + '-' + (from + page - 1),
            },
          }
        );
        if (!r.ok) break;
        const rows = await r.json();
        if (!Array.isArray(rows) || !rows.length) break;
        rows.forEach(x => { if (x && x.client) out.add(foldName(x.client)); });
        if (rows.length < page) break;
        from += page;
      }
    } catch (e) {
      console.warn('[inservice] fetch error', e);
    }
    return out;
  }

  function ready() {
    if (_promise) return _promise;
    _promise = fetchSet().then(s => {
      _set = s;
      console.log('[inservice] loaded', s.size, 'active-unit clients');
      _listeners.splice(0).forEach(fn => { try { fn(); } catch (_) {} });
      return s;
    });
    return _promise;
  }

  window.InServiceClients = {
    ready,
    has: nafn => (_set ? _set.has(foldName(nafn)) : false),
    loaded: () => _set !== null,
    onReady: fn => { if (_set) { try { fn(); } catch (_) {} } else _listeners.push(fn); },
  };

  // Eager load at boot — both consumers run after the customer list settles,
  // by which point this is almost always resolved.
  ready();

  console.log('[inservice-clients v1] installed');
})();
/* === END IN-SERVICE CLIENTS === */
