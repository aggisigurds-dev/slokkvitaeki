// geocode-all-background.js — one-shot server-side bulk geocoder.
//
// Fills the shared `geocode_cache` for every company address that isn't cached
// yet, so Leiðsögn pins drop for everyone without each browser slowly grinding
// through Nominatim. Netlify *background* function (name ends in -background):
// returns 202 immediately and runs up to 15 minutes.
//
// Trigger once:  GET https://slokkvitaeki.netlify.app/api/geocode-all
// (Re-running is safe — it skips addresses already in the cache.)
//
// Reuses the exact Nominatim variant logic from geocode.js. Polite 1.1s throttle.

const SUPABASE_URL = 'https://osfdzskyvisifcwyjkuk.supabase.co';
const SUPABASE_KEY = 'sb_publishable_YVpznM5EK01qOdevQwOcIg_rMjTkT7f';
const CC = 'is';
const THROTTLE_MS = 1100;
const MAX_PER_RUN = 600;
const TIME_BUDGET_MS = 14 * 60 * 1000;

const SB = { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` };

async function getCompanyAddresses() {
  // Distinct non-blank fyrirtaeki addresses (the cache is shared, so geocoding
  // all of them is harmless and benefits every view).
  const r = await fetch(`${SUPABASE_URL}/rest/v1/fyrirtaeki?select=heimilisfang`, { headers: SB });
  const rows = r.ok ? await r.json() : [];
  const set = new Set();
  for (const x of rows) { const a = (x.heimilisfang || '').trim(); if (a) set.add(a); }
  return [...set];
}

async function getCachedQueries() {
  const set = new Set();
  let from = 0; const page = 1000;
  while (true) {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/geocode_cache?select=query`, {
      headers: { ...SB, Range: `${from}-${from + page - 1}` },
    });
    if (!r.ok) break;
    const rows = await r.json();
    if (!Array.isArray(rows) || !rows.length) break;
    rows.forEach(x => { if (x.query) set.add(x.query); });
    if (rows.length < page) break;
    from += page;
  }
  return set;
}

// --- identical address-cleaning to geocode.js ---
function cleanVariants(orig) {
  const out = []; const seen = new Set();
  const add = v => { const t = (v || '').trim(); if (t && !seen.has(t)) { seen.add(t); out.push(t); } };
  let s = orig
    .replace(/\bRvk\.?\b/gi, 'Reykjavík')
    .replace(/\bGrb\.?\b/gi, 'Garðabær')
    .replace(/\bHfj\.?\b/gi, 'Hafnarfjörður')
    .replace(/\bKóp\.?\b/gi, 'Kópavogur')
    .replace(/\bReykkjavík\b/gi, 'Reykjavík');
  add(s);
  const m = s.match(/^(.*?\b\d{3}\s+[A-Za-zÁÉÍÓÚÝÆÖÞÐáéíóúýæöþð]+).*/);
  if (m && m[1] !== s) add(m[1]);
  const comma = s.indexOf(',');
  if (comma > 0) add(s.slice(0, comma));
  const street = s.replace(/[,].*$/, '').replace(/\s+(\d{3})\s+.*$/, ' $1');
  add(street);
  return out;
}

async function tryNominatim(query) {
  const target = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=${CC}&q=${encodeURIComponent(query)}`;
  try {
    const r = await fetch(target, {
      headers: {
        'User-Agent': 'Slokkvitaeki/1.0 (+https://slokkvitaeki.netlify.app)',
        'Accept': 'application/json',
        'Accept-Language': 'is',
      },
    });
    if (!r.ok) return null;
    const data = await r.json();
    if (!data || !data.length) return null;
    const hit = data[0];
    const lat = parseFloat(hit.lat), lon = parseFloat(hit.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
    return { lat, lon, display_name: hit.display_name || '' };
  } catch (_) { return null; }
}

async function writeCache(q, lat, lon, displayName) {
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/geocode_cache`, {
      method: 'POST',
      headers: { ...SB, 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates' },
      body: JSON.stringify({ query: q, lat, lng: lon, display_name: displayName || null, source: 'bulk' }),
    });
  } catch (_) {}
}

exports.handler = async () => {
  const start = Date.now();
  const [addrs, cached] = await Promise.all([getCompanyAddresses(), getCachedQueries()]);
  const todo = addrs.filter(a => !cached.has(a)).slice(0, MAX_PER_RUN);
  let done = 0, hit = 0;
  for (const addr of todo) {
    if (Date.now() - start > TIME_BUDGET_MS) break;
    let res = null;
    for (const v of cleanVariants(addr)) { res = await tryNominatim(v); if (res) break; }
    if (res) { await writeCache(addr, res.lat, res.lon, res.display_name); hit++; }
    done++;
    if (done < todo.length) await new Promise(r => setTimeout(r, THROTTLE_MS));
  }
  console.log(`[geocode-all] candidates=${todo.length} processed=${done} geocoded=${hit}`);
  return { statusCode: 200, body: JSON.stringify({ candidates: todo.length, processed: done, geocoded: hit }) };
};
