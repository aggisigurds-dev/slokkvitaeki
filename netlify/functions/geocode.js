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

  // 2. Cache miss — call Nominatim.
  try {
    const target = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=${encodeURIComponent(cc)}&q=${encodeURIComponent(q)}`;
    const r = await fetch(target, {
      headers: {
        'User-Agent': 'Slokkvitaeki/1.0 (+https://slokkvitaeki.netlify.app)',
        'Accept': 'application/json',
        'Accept-Language': 'is',
      },
    });
    if (!r.ok) {
      return new Response(JSON.stringify({ error: `nominatim ${r.status}` }), {
        status: 502,
        headers: cors(),
      });
    }
    const data = await r.json();
    if (!data || !data.length) {
      return new Response(JSON.stringify({ error: 'not-found', q }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', ...cors(), 'Cache-Control': 'public, max-age=3600' },
      });
    }
    const hit = data[0];
    const lat = parseFloat(hit.lat);
    const lon = parseFloat(hit.lon);
    const displayName = hit.display_name || '';

    // 3. Write-back to shared cache for next time (fire-and-forget — don't
    //    block the response on the cache write).
    writeCache(q, lat, lon, displayName);

    return new Response(JSON.stringify({
      lat,
      lon,
      display_name: displayName,
      source: 'nominatim',
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
