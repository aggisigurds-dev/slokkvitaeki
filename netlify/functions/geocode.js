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
 *   →  { found: false, error: 'not-found' }                      (200) when no match
 *   →  { error: 'upstream', ... }                                (502) on upstream error
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

// Staðfangaskrá HMS — opið WFS, enginn lykill. Sama heimild og
// netlify/functions/hus-upplysingar.js notar fyrir bannerinn.
const WFS_STADFANG = 'https://geo.fasteignaskra.is/ws/geoserver/wfs';

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

async function writeCache(q, lat, lon, displayName, source) {
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
      body: JSON.stringify({ query: q, lat, lng: lon, display_name: displayName || null, ...(source ? { source } : {}) }),
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

  // ── Staðfangaskrá HMS (16.09.2026) ────────────────────────────────────────
  // Nominatim ræður ekki við íslenskt þágufall og giskar þá á samnefnda götu í
  // öðrum landshluta: „Fjarðargötu 17 220 Hafnarfirði" lenti á 65,874/−23,485 —
  // Fjarðargötu á Flateyri — og níu staðir sátu þannig á röngum stað á kortinu.
  // Staðfangaskrá ber götuheitið saman í NEFNIFALLI OG ÞÁGUFALLI (HEITI_NF /
  // HEITI_TGF) og skilar hnitum staðfangsins sjálfs í EPSG:4326.
  // Öryggi: sé póstnúmer þekkt verður svarið að bera SAMA póstnúmer; sé það
  // óþekkt er svarið aðeins tekið gilt þegar það er ótvírætt (ein niðurstaða).
  // Annars fellur leitin áfram á Nominatim eins og áður.
  async function tryStadfangaskra(query) {
    try {
      const s = String(query).replace(/\s+/g, ' ').trim();
      const m = /^([^0-9,]+?)\s+(\d{1,4})\s*([A-Za-zÁÐÉÍÓÚÝÞÆÖáðéíóúýþæö])?(?=[\s,]|$)/.exec(s);
      if (!m) return null;
      const gata = m[1].replace(/[.,]+$/, '').trim();
      const husnr = +m[2];
      const bokst = (m[3] || '').trim();
      const pn = s.slice(m[0].length).match(/\b(\d{3})\b/);
      const postnr = pn ? +pn[1] : null;
      if (gata.length < 3 || !husnr) return null;
      const esc = (x) => String(x).replace(/'/g, "''");
      const cql = (medBokst, medPostnr) => {
        const b = [`(HEITI_NF ILIKE '${esc(gata)}' OR HEITI_TGF ILIKE '${esc(gata)}')`, `HUSNR=${husnr}`];
        if (medBokst && bokst) b.push(`BOKST ILIKE '${esc(bokst)}'`);
        if (medPostnr && postnr) b.push(`POSTNR=${postnr}`);
        return b.join(' AND ');
      };
      const tilraunir = [];
      if (bokst && postnr) tilraunir.push([true, true]);
      if (postnr) tilraunir.push([false, true]);
      if (bokst) tilraunir.push([true, false]);
      tilraunir.push([false, false]);
      for (const [mb, mp] of tilraunir) {
        const url = `${WFS_STADFANG}?service=WFS&version=1.1.0&request=GetFeature`
          + `&typename=fasteignaskra:VSTADF_ALLT&outputFormat=application/json&maxFeatures=10`
          + `&srsName=EPSG:4326&CQL_FILTER=${encodeURIComponent(cql(mb, mp))}`;
        const r = await fetch(url, { headers: { 'User-Agent': 'Slokkvitaeki/1.0 (+https://slokkvitaeki.netlify.app)' } });
        if (!r.ok) continue;
        const d = await r.json().catch(() => null);
        let fs = (d && Array.isArray(d.features) ? d.features : [])
          .filter((f) => f && f.geometry && Array.isArray(f.geometry.coordinates) && f.geometry.coordinates.length >= 2);
        if (postnr) fs = fs.filter((f) => +((f.properties || {}).POSTNR) === postnr);
        if (!fs.length) continue;
        if (!postnr && fs.length > 1) continue;      // óvíst án póstnúmers — láta Nominatim um það
        const f = fs[0], p = f.properties || {};
        const lon = +f.geometry.coordinates[0], lat = +f.geometry.coordinates[1];
        if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
        const heiti = `${p.HEITI_NF || gata} ${p.HUSNR || husnr}${p.BOKST || ''}`.trim();
        const stadur = [p.POSTNR, p.SVFHEITI || p.SVEITARFELAG || p.SVF_HEITI || ''].filter(Boolean).join(' ').trim();
        return { lat, lon, display_name: [heiti, stadur].filter(Boolean).join(', ') };
      }
      return null;
    } catch (_) { return null; }
  }

  try {
    const stadfang = await tryStadfangaskra(q);
    if (stadfang) {
      await writeCache(q, stadfang.lat, stadfang.lon, stadfang.display_name, 'stadfangaskra');
      return new Response(JSON.stringify({ ...stadfang, source: 'stadfangaskra' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...cors(), 'Cache-Control': 'public, max-age=86400' },
      });
    }
    const variants = cleanVariants(q);
    let hit = null;
    let usedVariant = q;
    let upstreamErr = null;   // 2026-07-16: track upstream failures separately
    let sawRealMiss = false;  // at least one variant got a REAL empty result
    for (const v of variants) {
      const res = await tryNominatim(v);
      if (res && res.error) { upstreamErr = res.error; continue; }
      if (res && Number.isFinite(res.lat) && Number.isFinite(res.lon)) {
        hit = res;
        usedVariant = v;
        break;
      }
      sawRealMiss = true;
    }
    if (!hit) {
      // 2026-07-16 FIX (root cause of "every lookup 404s"): a Nominatim
      // upstream failure (403/429 rate-limit, 5xx) used to fall through to
      // the SAME 404 "not-found" as a genuine no-match — AND that 404 carried
      // Cache-Control public,max-age=3600, so the Netlify edge cached the
      // failure per-address for an hour. One rate-limited burst (e.g. the
      // map geocoding hundreds of customers) made every address lookup
      // return 404 site-wide until the caches expired. Now: upstream errors
      // → 502 + no-store (never cached, callers can retry); only a REAL
      // empty Nominatim result → 404 (cacheable — the address truly
      // doesn't resolve).
      if (upstreamErr && !sawRealMiss) {
        return new Response(JSON.stringify({ error: 'upstream', detail: upstreamErr, q }), {
          status: 502,
          headers: { 'Content-Type': 'application/json', ...cors(), 'Cache-Control': 'no-store' },
        });
      }
      // Genuine no-match: return 200 (not 404) with found:false. A 404 to a
      // client-side fetch() prints a red "Failed to load resource: 404" in every
      // browser console (the two unresolvable addresses did this on EVERY driver/
      // finance load). Callers already treat "no numeric lat" as no-result, so a
      // 200 is behaviourally identical but silent. Still cacheable for an hour
      // (the address truly doesn't resolve).
      return new Response(JSON.stringify({ found: false, error: 'not-found', q, tried: variants }), {
        status: 200,
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
