/**
 * Geocode proxy — server-side wrapper around Nominatim (OpenStreetMap).
 *
 * Why a proxy:
 *   1. Nominatim doesn't send CORS headers, so a browser fetch is blocked.
 *   2. Nominatim's usage policy requires a real User-Agent identifying the app
 *      and won't accept that header from browser JS anyway (UA is forbidden).
 *
 * Endpoint:
 *   GET /api/geocode?q=<address>
 *   →  { lat, lon, display_name, source }   (200) when found
 *   →  { error: 'not-found' }                (404) when no match
 *   →  { error: ... }                        (500) on upstream error
 *
 * The response is cached for 24 h on Netlify's edge so repeated lookups for
 * the same address are cheap.
 */
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
    return new Response(JSON.stringify({
      lat: parseFloat(hit.lat),
      lon: parseFloat(hit.lon),
      display_name: hit.display_name || '',
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
