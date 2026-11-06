// _gatt-myndir.cjs — myndir og skjöl Þjónustugáttarinnar í einkamáls-bucketinu `gatt` (service-lykill eingöngu).
//
//   lesaDataUrl(s, hamark)  → { buf, mime, ext } eða null  (data:image/jpeg;base64,… — aðeins jpeg/png/webp/pdf/…)
//   hlada(path, buf, mime)  → true/false                    (POST /storage/v1/object/gatt/<path>)
//   undirrita(paths, sek)   → { path: fullSlod }            (POST /storage/v1/object/sign/gatt — ein sókn fyrir allar)
//
// Vafrinn fær ALDREI hráa bucket-slóð: gatt.cjs undirritar við hverja GET (10 mín) og slóðin dugar aðeins þeim sem
// þegar var auðkenndur fyrir félagið. Myndir eru smækkaðar í vafranum (≤1600 px, JPEG) áður en þær koma hingað.

const P = require('./_portal.cjs');

const BUCKET = 'gatt';
const MIME = {
  'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'application/pdf': 'pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'text/plain': 'txt', 'text/csv': 'csv',
};

function lesaDataUrl(s, hamark) {
  const m = /^data:([a-z0-9.+\/-]+);base64,([A-Za-z0-9+\/=\s]+)$/i.exec(String(s || ''));
  if (!m) return null;
  const mime = m[1].toLowerCase();
  if (!MIME[mime]) return null;
  let buf;
  try { buf = Buffer.from(m[2].replace(/\s+/g, ''), 'base64'); } catch (_) { return null; }
  if (!buf.length || buf.length > (hamark || 6 * 1024 * 1024)) return null;
  return { buf, mime, ext: MIME[mime] };
}

async function hlada(path, buf, mime) {
  const r = await fetch(`${P.SUPABASE_URL}/storage/v1/object/${BUCKET}/${path.split('/').map(encodeURIComponent).join('/')}`, {
    method: 'POST',
    headers: { apikey: P.SUPABASE_KEY, Authorization: `Bearer ${P.SUPABASE_KEY}`, 'Content-Type': mime, 'x-upsert': 'false' },
    body: buf,
  });
  return r.ok;
}

async function eyda(paths) {
  if (!paths.length) return true;
  const r = await fetch(`${P.SUPABASE_URL}/storage/v1/object/${BUCKET}`, {
    method: 'DELETE',
    headers: { apikey: P.SUPABASE_KEY, Authorization: `Bearer ${P.SUPABASE_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ prefixes: paths }),
  });
  return r.ok;
}

async function undirrita(paths, sek) {
  const out = {};
  const L = [...new Set((paths || []).filter(Boolean))];
  if (!L.length) return out;
  try {
    const r = await fetch(`${P.SUPABASE_URL}/storage/v1/object/sign/${BUCKET}`, {
      method: 'POST',
      headers: { apikey: P.SUPABASE_KEY, Authorization: `Bearer ${P.SUPABASE_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ expiresIn: sek || 600, paths: L }),
    });
    if (!r.ok) return out;
    (await r.json()).forEach((x) => { if (x && x.signedURL && !x.error) out[x.path] = `${P.SUPABASE_URL}/storage/v1${x.signedURL}`; });
  } catch (_) {}
  return out;
}

function nafnOruggt(s) {
  return String(s || 'skjal').normalize('NFC').replace(/[^\p{L}\p{N} ._-]+/gu, '_').replace(/\s+/g, ' ').trim().slice(0, 80) || 'skjal';
}


// ── Aðalbanner þjónustugáttarinnar (06.11.2026, Agnar: „breyta um aðalbannerinn sem sést þá hjá öllum") ──
// EIN sameiginleg stilling á þjóninum: app_kv['gatt_banner'] = { path, w, h, at, af } + myndin í bucketinu gatt undir
// banner-global/. Sýnileg öllum gáttum (gatt.cjs undirritar við hverja GET); aðeins stjórnborðið skrifar (requireStaff).
async function globalBanner(sek) {
  try {
    const r = await P.sbGet('app_kv?key=eq.gatt_banner&select=value&limit=1');
    if (!r.ok) return null;
    const v = ((await r.json())[0] || {}).value;
    if (!v || !v.path) return null;
    const u = (await undirrita([v.path], sek || 3600))[v.path];
    return u ? { url: u, path: v.path, at: v.at || null, af: v.af || null } : null;
  } catch (_) { return null; }
}
async function skrifaGlobalBanner(value) {
  const r = await fetch(`${P.SUPABASE_URL}/rest/v1/app_kv?on_conflict=key`, {
    method: 'POST',
    headers: { apikey: P.SUPABASE_KEY, Authorization: `Bearer ${P.SUPABASE_KEY}`, 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify({ key: 'gatt_banner', value: value || {}, updated_at: new Date().toISOString() }),
  });
  return r.ok;
}

module.exports = { BUCKET, MIME, lesaDataUrl, hlada, eyda, undirrita, nafnOruggt, globalBanner, skrifaGlobalBanner };
