/**
 * Mynd af húsi að utan — Places-forsíðumynd, annars Street View.
 *
 *   POST /api/husmynd
 *   { lat, lng, address }
 *   → { ok:true, image:<base64>, contentType, attribution, heimild:'places'|'streetview' }
 *   → { ok:false, error:'vantar-lykil'|'vantar-hnit'|'engin-mynd'|'google'|'timi', message }
 *
 * Lykillinn er Netlify-env GOOGLE_MAPS_API_KEY. Hann fer aldrei í vafrann og
 * er aldrei skráður. Fallið kallar ekki /api/geocode — vafrinn sendir hnit sem
 * eru þegar til. Prófíll kallar hingað einu sinni þegar engin mynd er vistuð
 * og geymir svarið (líka vantar-lykil) svo næsta opnun kalli ekki aftur.
 *
 * Places API (New) textaleit + places.photos[0] er forsíðumyndin sem Google
 * Maps sýnir. Street View Static (source=outdoor) er aðeins varaleið þegar
 * engin forsíðumynd er innan við ~150 m. Loftmynd er ekki varaleið.
 */
const LYKILNAFN = 'GOOGLE_MAPS_API_KEY';

function lesaLykil() {
  try {
    if (typeof Netlify !== 'undefined' && Netlify.env && typeof Netlify.env.get === 'function') {
      const v = Netlify.env.get(LYKILNAFN);
      if (v && String(v).trim()) return String(v).trim();
    }
  } catch (_) {}
  return String(process.env[LYKILNAFN] || '').trim();
}

function cors() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, x-eldklar-key',
  };
}
function j(status, obj) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...cors() },
  });
}
function hreinsa(s) {
  return String(s || '')
    .replace(/key=[^&\s"']+/gi, 'key=***')
    .replace(/AIza[0-9A-Za-z\-_]{10,}/g, '***')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 240);
}
function skilabod(msg) {
  const s = hreinsa(msg);
  if (/API key not valid|API_KEY_INVALID|REQUEST_DENIED/i.test(s)) return 'Google hafnaði lyklinum';
  if (/not been used|SERVICE_DISABLED|PERMISSION_DENIED|not enabled/i.test(s)) return 'Places eða Street View er ekki virkt á lyklinum';
  if (!s || s.charAt(0) === '{') return 'Google hafnaði kallinu';
  return s;
}

function metrar(aLat, aLng, bLat, bLng) {
  const R = 6371000;
  const dLat = (bLat - aLat) * Math.PI / 180;
  const dLng = (bLng - aLng) * Math.PI / 180;
  const s = Math.sin(dLat / 2) ** 2
    + Math.cos(aLat * Math.PI / 180) * Math.cos(bLat * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
}

function tilB64(buf) {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  if (typeof Buffer !== 'undefined') return Buffer.from(bytes).toString('base64');
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    s += String.fromCharCode.apply(null, bytes.subarray(i, Math.min(i + 0x8000, bytes.length)));
  }
  return btoa(s);
}

function erMynd(bytes, tegund) {
  if (!bytes || bytes.length < 32 || bytes.length > 3_000_000) return false;
  const t = String(tegund || '').toLowerCase();
  if (t.indexOf('image/') !== 0) return false;
  const b = bytes;
  const jpeg = b[0] === 0xff && b[1] === 0xd8;
  const png = b[0] === 0x89 && b[1] === 0x50;
  const webp = b[0] === 0x52 && b[1] === 0x49;
  return jpeg || png || webp;
}

function hofundar(photo) {
  const listi = (photo && photo.authorAttributions) || [];
  const nofn = [];
  for (let i = 0; i < listi.length && nofn.length < 2; i++) {
    const n = listi[i] && listi[i].displayName;
    if (n) nofn.push(String(n));
  }
  return nofn.length ? ('© Google · ' + nofn.join(', ')) : '© Google';
}

async function googleTexti(r) {
  let t = '';
  try { t = await r.text(); } catch (_) {}
  return hreinsa(t);
}

async function saekjaBytes(url, headers, signal) {
  const r = await fetch(url, { headers, signal, redirect: 'follow' });
  const tegund = (r.headers.get('content-type') || '').split(';')[0].trim();
  if (!r.ok) {
    const t = await googleTexti(r);
    const villa = new Error(t || ('Google ' + r.status));
    villa.status = r.status;
    throw villa;
  }
  const buf = new Uint8Array(await r.arrayBuffer());
  if (!erMynd(buf, tegund)) {
    const villa = new Error('Google skilaði ekki mynd');
    villa.status = r.status;
    throw villa;
  }
  return { bytes: buf, contentType: tegund || 'image/jpeg' };
}

async function placesMynd(key, lat, lng, address, signal) {
  const r = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': key,
      'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.photos',
    },
    body: JSON.stringify({
      textQuery: address || (lat + ',' + lng),
      languageCode: 'is',
      regionCode: 'IS',
      pageSize: 5,
      locationBias: {
        circle: { center: { latitude: lat, longitude: lng }, radius: 120 },
      },
    }),
    signal,
  });
  if (!r.ok) {
    const t = await googleTexti(r);
    const villa = new Error(t || ('Places ' + r.status));
    villa.status = r.status;
    throw villa;
  }
  const data = await r.json();
  const places = Array.isArray(data.places) ? data.places : [];
  let best = null;
  for (let i = 0; i < places.length; i++) {
    const p = places[i];
    const photos = p && p.photos;
    if (!photos || !photos.length || !photos[0].name) continue;
    const loc = p.location || {};
    if (typeof loc.latitude !== 'number' || typeof loc.longitude !== 'number') continue;
    const d = metrar(lat, lng, loc.latitude, loc.longitude);
    if (d > 150) continue;
    if (!best || d < best.d) best = { d, photo: photos[0] };
  }
  if (!best) return null;
  const name = String(best.photo.name);
  const slod = name.endsWith('/media') ? name : (name + '/media');
  const url = 'https://places.googleapis.com/v1/' + slod.replace(/^\//, '')
    + '?maxHeightPx=800&maxWidthPx=1200&skipHttpRedirect=true';
  const pr = await fetch(url, { headers: { 'X-Goog-Api-Key': key }, signal });
  if (!pr.ok) {
    const t = await googleTexti(pr);
    const villa = new Error(t || ('Places-mynd ' + pr.status));
    villa.status = pr.status;
    throw villa;
  }
  const tegund = (pr.headers.get('content-type') || '').toLowerCase();
  let bytes;
  let contentType = 'image/jpeg';
  if (tegund.indexOf('application/json') >= 0 || tegund.indexOf('text/') >= 0) {
    const meta = await pr.json();
    if (!meta || !meta.photoUri) return null;
    const img = await saekjaBytes(meta.photoUri, {}, signal);
    bytes = img.bytes;
    contentType = img.contentType;
  } else {
    const buf = new Uint8Array(await pr.arrayBuffer());
    if (!erMynd(buf, tegund)) return null;
    bytes = buf;
    contentType = tegund.split(';')[0].trim() || 'image/jpeg';
  }
  return {
    bytes,
    contentType,
    attribution: hofundar(best.photo),
    heimild: 'places',
  };
}

async function streetView(key, lat, lng, signal) {
  const loc = encodeURIComponent(lat + ',' + lng);
  const metaUrl = 'https://maps.googleapis.com/maps/api/streetview/metadata?location='
    + loc + '&source=outdoor&radius=40&key=' + encodeURIComponent(key);
  const mr = await fetch(metaUrl, { signal });
  let meta = {};
  try { meta = await mr.json(); } catch (_) { meta = {}; }
  const stada = String(meta.status || '');
  if (stada === 'ZERO_RESULTS' || stada === 'NOT_FOUND') return null;
  if (stada !== 'OK') {
    const villa = new Error(hreinsa(meta.error_message || stada || 'Street View'));
    villa.status = mr.status;
    throw villa;
  }
  const imgUrl = 'https://maps.googleapis.com/maps/api/streetview?size=640x480&location='
    + loc + '&source=outdoor&radius=40&fov=80&pitch=8&return_error_code=true&key=' + encodeURIComponent(key);
  const img = await saekjaBytes(imgUrl, {}, signal);
  const att = hreinsa(meta.copyright || '');
  return {
    bytes: img.bytes,
    contentType: img.contentType,
    attribution: att && att.indexOf('Google') >= 0 ? att : '© Google',
    heimild: 'streetview',
  };
}

export default async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors() });
  if (req.method !== 'POST') return j(405, { ok: false, error: 'post', message: 'Aðeins POST' });

  const edge = String(process.env.EDGE_SHARED_KEY || '').trim();
  if (edge) {
    const got = String(req.headers.get('x-eldklar-key') || '').trim();
    if (got !== edge) return j(401, { ok: false, error: 'unauthorized', message: 'Ekki heimild' });
  }

  const key = lesaLykil();
  if (!key) {
    return j(200, {
      ok: false,
      error: 'vantar-lykil',
      message: 'Vantar lykil (' + LYKILNAFN + ')',
    });
  }

  let body = {};
  try { body = await req.json(); } catch (_) { body = {}; }
  const lat = Number(body && body.lat);
  const lng = Number(body && body.lng);
  const address = String((body && body.address) || '').trim().slice(0, 180);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return j(200, { ok: false, error: 'vantar-hnit', message: 'Vantar hnit' });
  }

  const signal = AbortSignal.timeout(8000);
  let placesVilla = null;
  try {
    const p = await placesMynd(key, lat, lng, address, signal);
    if (p) {
      return j(200, {
        ok: true,
        image: tilB64(p.bytes),
        contentType: p.contentType,
        attribution: p.attribution,
        heimild: p.heimild,
      });
    }
  } catch (e) {
    if (e && e.name === 'TimeoutError') {
      return j(200, { ok: false, error: 'timi', message: 'Google svaraði ekki í tæka tíð' });
    }
    placesVilla = e;
  }

  try {
    const s = await streetView(key, lat, lng, signal);
    if (s) {
      return j(200, {
        ok: true,
        image: tilB64(s.bytes),
        contentType: s.contentType,
        attribution: s.attribution,
        heimild: s.heimild,
      });
    }
  } catch (e) {
    if (e && e.name === 'TimeoutError') {
      return j(200, { ok: false, error: 'timi', message: 'Google svaraði ekki í tæka tíð' });
    }
    const skil = placesVilla || e;
    return j(200, { ok: false, error: 'google', message: skilabod(skil && skil.message) });
  }

  if (placesVilla) {
    return j(200, { ok: false, error: 'google', message: skilabod(placesVilla.message) });
  }
  return j(200, { ok: false, error: 'engin-mynd', message: 'Engin mynd af húsi að utan' });
};

export const config = { path: '/api/husmynd' };
