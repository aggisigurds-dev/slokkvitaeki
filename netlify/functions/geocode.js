/**
 * Geocode proxy — server-side wrapper around Nominatim, with shared
 * Supabase-backed cache so all PCs/phones share resolved addresses.
 *
 * Why a proxy:
 *   1. Nominatim doesn't send CORS headers, so a browser fetch is blocked.
 *   2. Nominatim's usage policy requires a real User-Agent identifying the app
 *      and won't accept that header from browser JS anyway (UA is forbidden).
 *
 * Why a shared cache:
 *   Each browser has its own _slokk_gc localStorage cache, so opening the
 *   map on a fresh PC re-geocodes 295 customers from scratch (~7 min wait).
 *   With the geocode_cache Supabase table, the first PC writes resolved
 *   addresses; every other PC/phone reads from it for free.
 *
 * Endpoint:
 *   GET /api/geocode?q=<address>
 *   →  { lat, lon, display_name, source: 'cache'|'nominatim' }   (200) when found
 *   →  { error: 'not-found' }                                    (404) when no match
 *   →  { error: ... }                                            (500) on upstream error
 *
 * Cache lookup: keyed by exact query string (after .trim()). Misses fall
 * through to Nominatim. Successful Nominatim lookups are written back to
 * the cache asynchronously (response not blocked).
 *
 * Table setup: see sql/geocode_cache.sql — run once in the Supabase
 * dashboard. If the table doesn't exist (PGRST205), the function silently
 * falls back to the no-cache path; nothing breaks.
 */
const SUPABASE_URL = 'https://osfdzskyvisifcwyjkuk.supabase.co';
const SUPABASE_KEY = 'sb_publishable_YVpznM5EK01qOdevQwOcIg_rMjTkT7f';

async function readCache(q) {
  try {
    const u = `${SUPABASE_URL}/rest/v1/geocode_cache?query=eq.${encodeURIComponent(q)}&select=lat,lng,display_name&limit=1`;
    const r = await fetch(u, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
    });
    if (!r.ok) return null;
    const rows = await r.json();
    if (!Array.isArray(rows) || !rows.length) return null;
    const hit = rows[0];
    if (typeof hit.lat !== 'number' || typeof hit.lng !== 'number') return null;
    return { lat: hit.lat, lon: hit.lng, display_name: hit.display_name || '' };
  } catch (_) { return null; }
}

async function writeCache(q, lat, lon, displayName) {
  try {
    const u = `${SUPABASE_URL}/rest/v1/geocode_cache`;
    await fetch(u, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        // Upsert on PK conflict so concurrent writes don't error.
        Prefer: 'resolution=merge-duplicates',
      },
      body: JSON.stringify({ query: q, lat, lng: lon, display_name: displayName || null }),
    });
  } catch (_) {}
}

export default async (req) => {
  const url = new URL(req.url);
  const q = (url.searchParams.get('q') || '').trim();
  const cc = (url.searchParams.get('cc') || 'is').trim(); // country code, default Iceland
  if (!q) {
    return new Response(JSON.stringify({ error: 'Missing q' }), {
      status: 400,
      headers: cors(),
    });
  }

  // 0. Typeahead suggestions — return up to 6 matches for an autocomplete UI
  //    (manual-geocode tool, patch 178). Never cached: the query is partial as
  //    the user types, so caching would pollute the exact-match cache.
  if (url.searchParams.get('suggest')) {
    try {
      const target = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=0&limit=6&countrycodes=${encodeURIComponent(cc)}&q=${encodeURIComponent(q)}`;
      const r = await fetch(target, {
        headers: {
          'User-Agent': 'Slokkvitaeki/1.0 (+https://slokkvitaeki.netlify.app)',
          'Accept': 'application/json',
          'Accept-Language': 'is',
        },
      });
      const data = r.ok ? await r.json() : [];
      const results = (Array.isArray(data) ? data : [])
        .map(h => ({ display_name: h.display_name, lat: parseFloat(h.lat), lon: parseFloat(h.lon) }))
        .filter(x => Number.isFinite(x.lat) && Number.isFinite(x.lon));
      return new Response(JSON.stringify({ results }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...cors(), 'Cache-Control': 'public, max-age=3600' },
      });
    } catch (e) {
      return new Response(JSON.stringify({ results: [] }), {
        status: 200, headers: { 'Content-Type': 'application/json', ...cors() },
      });
    }
  }

  // 1. Shared Supabase cache — instant hit if any PC has resolved this before.
  const cached = await readCache(q);
  if (cached) {
    return new Response(JSON.stringify({
      lat: cached.lat,
      lon: cached.lon,
      display_name: cached.display_name,
      source: 'cache',
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...cors(), 'Cache-Control': 'public, max-age=86400' },
    });
  }

  // 2. Cache miss — call Nominatim. Try multiple cleaned-up variants of
  //    the address — many Icelandic addresses in this dataset have typos
  //    (Reykkjavík), abbreviations (Grb / Grb. for Garðabær), double
  //    postcodes (e.g. "110 Reykjavík, 222 Hafnarfirði"), or missing
  //    street names. We try the original first, then progressively simpler
  //    fallbacks.
  function cleanVariants(orig) {
    const out = [];
    const seen = new Set();
    function add(v) {
      const t = (v || '').trim();
      if (!t || seen.has(t)) return;
      seen.add(t); out.push(t);
    }
    // Expand common abbreviations / fix typos
    let s = orig
      .replace(/\bRvk\.?\b/gi, 'Reykjavík')
      .replace(/\bGrb\.?\b/gi, 'Garðabær')
      .replace(/\bHfj\.?\b/gi, 'Hafnarfjörður')
      .replace(/\bKóp\.?\b/gi, 'Kópavogur')
      .replace(/\bReykkjavík\b/gi, 'Reykjavík');
    add(s);

    // If string has multiple postcodes, drop everything after the first one
    // ("Grjóthálsi 10 110 Reykjavík, 222 Hafnarfirði" → "Grjóthálsi 10 110 Reykjavík")
    const m = s.match(/^(.*?\b\d{3}\s+[A-Za-zÁÉÍÓÚÝÆÖÞÐáéíóúýæöþð]+).*/);
    if (m && m[1] !== s) add(m[1]);

    // Strip after first comma
    const comma = s.indexOf(',');
    if (comma > 0) add(s.slice(0, comma));

    // Just the street name + first postcode region (drop apartment/floor info)
    const street = s.replace(/[,].*$/, '').replace(/\s+(\d{3})\s+.*$/, ' $1');
    add(street);

    return out;
  }

  async function tryNominatim(query) {
    const target = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=${encodeURIComponent(cc)}&q=${encodeURIComponent(query)}`;
    const r = await fetch(target, {
      headers: {
        'User-Agent': 'Slokkvitaeki/1.0 (+https://slokkvitaeki.netlify.app)',
        'Accept': 'application/json',
        'Accept-Language': 'is',
      },
    });
    if (!r.ok) return { error: `nominatim ${r.status}` };
    const data = await r.json();
    if (!data || !data.length) return null;
    const hit = data[0];
    return {
      lat: parseFloat(hit.lat),
      lon: parseFloat(hit.lon),
      display_name: hit.display_name || ''
    };
  }

  try {
    const variants = cleanVariants(q);
    let hit = null;
    let usedVariant = q;
    for (const v of variants) {
      const res = await tryNominatim(v);
      if (res && !res.error && Number.isFinite(res.lat) && Number.isFinite(res.lon)) {
        hit = res;
        usedVariant = v;
        break;
      }
    }
    if (!hit) {
      return new Response(JSON.stringify({ error: 'not-found', q, tried: variants }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', ...cors(), 'Cache-Control': 'public, max-age=3600' },
      });
    }

    // 3. Write-back to shared cache for next time (fire-and-forget — don't
    //    block the response on the cache write). Cache under the ORIGINAL
    //    query so future lookups with the same (malformed) string hit cache.
    writeCache(q, hit.lat, hit.lon, hit.display_name);

    return new Response(JSON.stringify({
      lat: hit.lat,
      lon: hit.lon,
      display_name: hit.display_name,
      source: 'nominatim',
      matched_variant: usedVariant !== q ? usedVariant : undefined,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...cors(), 'Cache-Control': 'public, max-age=86400' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e && e.message) || e) }), {
      status: 500,
      headers: cors(),
    });
  }
};

function cors() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

export const config = { path: '/api/geocode' };
