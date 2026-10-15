/**
 * Mynd af húsi — Borgarvefsjá, loftmynd 2018. Enginn lykill.
 *
 *   POST /api/husmynd
 *   { address }
 *   → { ok:true, image:<base64>, contentType, attribution, heimild:'borgarvefsja-2018' }
 *   → { ok:false, error:'engin-mynd'|'timi', message }
 *
 * 15.10.2026: sé Netlify-env GOOGLE_MAPS_API_KEY sett er Google Street View reynt FYRST
 * (heimild 'google-streetview'); loftmyndin hér að neðan er varaleiðin. Places er ekki kallað.
 * Já.is er ekki skrapað. Reykjavík: Borgarvefsjá, loftmynd 17.7.2018.
 * Kópavogur, Garðabær og Hafnarfjörður: loftmynd af map.is (Loftmyndir,
 * WMS án lykils). Hún sýnir húsið að ofan. Hún er ekki götumynd.
 *
 * Staðfangaskrá (EPSG:3057) finnur punktinn. Ein útflutningsmynd, miðuð á
 * punktinn. Utan þekju eða hvít skilað telst engin mynd. Vafrinn kallar
 * einu sinni og vistar svarið.
 */
const WFS = 'https://geo.fasteignaskra.is/ws/geoserver/wfs';
const EXPORT =
  'https://borgarvefsja.reykjavik.is/arcgis/rest/services/Borgarvefsja/Loftmynd/MapServer/export';
const HEIMILD = 'borgarvefsja-2018';
const ATTR = 'Borgarvefsjá · loftmynd 17.7.2018';
const MAPIS_LOFT = 'https://ts1.map.is/mapcache/';
const MAPIS_HEIMILD = 'mapis-loftmynd';
const MAPIS_ATTR = 'Loftmynd · map.is';
const MAPIS_POST = new Set([200, 201, 202, 203, 210, 211, 212, 225, 220, 221]);
// fullExtent á Loftmynd-þjónustunni, mælt 2026-10-01.
const EXTENT = { xmin: 344000, ymin: 392000, xmax: 384000, ymax: 427000 };
const MIN_BYTES = 12000;

// ── Google Street View (15.10.2026, Agnar: „setja myndir á allt sem er tómt og sem er loftmyndir") ──
// Lykillinn er Netlify-env GOOGLE_MAPS_API_KEY (Street View Static API eitt, enginn referrer — þjónn).
// Vanti hann er allt eins og áður: loftmynd. Metadata-kallið er ókeypis og segir hvort götumynd sé til
// áður en myndin (gjaldfærð) er sótt. Staðsetningin er hnit Staðfangaskrár (EPSG:3057 → WGS84), ekki
// textinn — Google miðar myndavélina sjálft á punktinn frá næsta myndatökustað.
const SV_HEIMILD = 'google-streetview';
const SV_ATTR = 'Google Street View';
const SV_MIN_BYTES = 6000;

// ISN93 / EPSG:3057 (Lambert conformal conic 2SP á GRS80) → WGS84. EPSG:9802 andhverfa.
function isn93TilWgs84(x, y) {
  const a = 6378137, f = 1 / 298.257222101, e = Math.sqrt(2 * f - f * f);
  const d2r = Math.PI / 180;
  const lat0 = 65 * d2r, lon0 = -19 * d2r, lat1 = 64.25 * d2r, lat2 = 65.75 * d2r, x0 = 500000, y0 = 500000;
  const m = (p) => Math.cos(p) / Math.sqrt(1 - e * e * Math.sin(p) * Math.sin(p));
  const t = (p) => Math.tan(Math.PI / 4 - p / 2) / Math.pow((1 - e * Math.sin(p)) / (1 + e * Math.sin(p)), e / 2);
  const n = (Math.log(m(lat1)) - Math.log(m(lat2))) / (Math.log(t(lat1)) - Math.log(t(lat2)));
  const F = m(lat1) / (n * Math.pow(t(lat1), n));
  const r0 = a * F * Math.pow(t(lat0), n);
  const dx = x - x0, dy = r0 - (y - y0);
  const r = Math.sign(n) * Math.sqrt(dx * dx + dy * dy);
  const tt = Math.pow(r / (a * F), 1 / n);
  const theta = Math.atan2(dx, dy);
  const lon = theta / n + lon0;
  let lat = Math.PI / 2 - 2 * Math.atan(tt);
  for (let i = 0; i < 8; i++) lat = Math.PI / 2 - 2 * Math.atan(tt * Math.pow((1 - e * Math.sin(lat)) / (1 + e * Math.sin(lat)), e / 2));
  return { lat: lat / d2r, lng: lon / d2r };
}

// Stefna (gráður) frá myndatökustað að húsinu — myndavélin á að horfa á húsið, ekki niður götuna.
function stefna(lat1, lng1, lat2, lng2) {
  const d2r = Math.PI / 180;
  const y = Math.sin((lng2 - lng1) * d2r) * Math.cos(lat2 * d2r);
  const x = Math.cos(lat1 * d2r) * Math.sin(lat2 * d2r) - Math.sin(lat1 * d2r) * Math.cos(lat2 * d2r) * Math.cos((lng2 - lng1) * d2r);
  return (Math.atan2(y, x) / d2r + 360) % 360;
}

// Fyrsta prófun (Lokastígur 28A, 15.10.2026) skilaði INNANHÚSS-ljóshvolfi frá notanda (© Sigursteinn …) þótt
// source=outdoor væri sett. Aðeins opinberar Google-myndir (copyright „© Google") eru teknar; finnist engin á
// punktinum er leitað í hringi (20 og 40 m) — metadata-köllin eru ókeypis — og myndin svo sótt með pano-auðkenni
// og stefnu að húsinu.
const SV_HLIDRANIR = [[0, 0], [20, 0], [-20, 0], [0, 20], [0, -20], [40, 0], [-40, 0], [0, 40], [0, -40], [28, 28], [-28, 28], [28, -28], [-28, -28]];

async function streetView(lat, lng, signal, key) {
  const k = '&key=' + encodeURIComponent(key);
  let md = null;
  for (const [de, dn] of SV_HLIDRANIR) {
    const la = lat + dn / 111320;
    const lo = lng + de / (111320 * Math.cos(lat * Math.PI / 180));
    const meta = await fetch('https://maps.googleapis.com/maps/api/streetview/metadata?location=' + la.toFixed(6) + ',' + lo.toFixed(6) + '&radius=50&source=outdoor' + k, { signal });
    const m = await meta.json().catch(() => null);
    if (m && m.status === 'OK' && m.pano_id && /google/i.test(String(m.copyright || '')) && m.location) { md = m; break; }
  }
  if (!md) return null;
  const h = stefna(+md.location.lat, +md.location.lng, lat, lng);
  const r = await fetch('https://maps.googleapis.com/maps/api/streetview?size=640x400&pano=' + encodeURIComponent(md.pano_id)
    + '&heading=' + h.toFixed(1) + '&fov=80&pitch=4&return_error_code=true' + k, { signal });
  const tegund = (r.headers.get('content-type') || '').toLowerCase();
  const bytes = new Uint8Array(await r.arrayBuffer());
  if (!r.ok || tegund.indexOf('image/') !== 0 || bytes.length < SV_MIN_BYTES) return null;
  return { bytes, contentType: tegund.split(';')[0] || 'image/jpeg', date: String(md.date || ''), pano: String(md.pano_id || '') };
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

function tilB64(bytes) {
  if (typeof Buffer !== 'undefined') return Buffer.from(bytes).toString('base64');
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    s += String.fromCharCode.apply(null, bytes.subarray(i, Math.min(i + 0x8000, bytes.length)));
  }
  return btoa(s);
}

function erJpeg(bytes) {
  return bytes && bytes.length >= MIN_BYTES && bytes[0] === 0xff && bytes[1] === 0xd8;
}

function innan(x, y) {
  return x >= EXTENT.xmin && x <= EXTENT.xmax && y >= EXTENT.ymin && y <= EXTENT.ymax;
}

function postnrUr(address) {
  const t = String(address || '');
  const eftir = t.split(',').slice(1).join(' ');
  const m = /\b(\d{3})\b/.exec(eftir) || /\b(\d{3})\b/.exec(t);
  const n = m ? +m[1] : 0;
  return n >= 100 && n <= 999 ? n : 0;
}

function gataAlias(address) {
  const s = String(address || '');
  if (!/uhraun/i.test(s)) return null;
  const next = s.replace(/uhraun/gi, (m) => (m[0] === 'U' ? 'A' : 'a') + m.slice(1));
  return next === s ? null : next;
}

async function stadfang(address, signal, dyp) {
  const s = String(address || '').replace(/\s+/g, ' ').trim();
  const m = /^([^0-9,]+?)\s+(\d{1,4})\s*([A-Za-zÁÐÉÍÓÚÝÞÆÖáðéíóúýþæö])?(?=[\s,\-–]|$)/.exec(s);
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
    const url = `${WFS}?service=WFS&version=1.1.0&request=GetFeature`
      + '&typename=fasteignaskra:VSTADF_ALLT&outputFormat=application/json&maxFeatures=8'
      + `&srsName=EPSG:3057&CQL_FILTER=${encodeURIComponent(cql(mb, mp))}`;
    const r = await fetch(url, {
      headers: { 'User-Agent': 'Slokkvitaeki/1.0 (+https://slokkvitaeki.netlify.app)' },
      signal,
    });
    if (!r.ok) continue;
    const d = await r.json().catch(() => null);
    let fs = (d && Array.isArray(d.features) ? d.features : [])
      .filter((f) => f && f.geometry && Array.isArray(f.geometry.coordinates) && f.geometry.coordinates.length >= 2);
    if (postnr) fs = fs.filter((f) => +((f.properties || {}).POSTNR) === postnr);
    if (!fs.length) continue;
    if (!postnr && fs.length > 1) continue;
    const vil = bokst.toUpperCase();
    const skor = (x) => (String(x || '').toUpperCase() === vil ? 0 : (String(x || '') ? 2 : 1));
    fs.sort((a, b) => skor((a.properties || {}).BOKST) - skor((b.properties || {}).BOKST));
    const f = fs[0];
    const x = +f.geometry.coordinates[0];
    const y = +f.geometry.coordinates[1];
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    return { x, y };
  }
  if (dyp) return null;
  const alt = gataAlias(address);
  if (!alt || alt === String(address)) return null;
  return stadfang(alt, signal, 1);
}

async function mapisLoftmynd(x, y, signal) {
  const dx = 48;
  const dy = 34;
  const bbox = `${x - dx},${y - dy},${x + dx},${y + dy}`;
  const url = MAPIS_LOFT
    + '?SERVICE=WMS&REQUEST=GetMap&LAYERS=myndkort&STYLES=&FORMAT=image/jpeg'
    + '&SRS=EPSG:3057&WIDTH=640&HEIGHT=448&BBOX=' + bbox;
  const r = await fetch(url, {
    headers: {
      'User-Agent': 'Slokkvitaeki/1.0 (+https://slokkvitaeki.netlify.app)',
      Referer: 'https://www.map.is/hafnarfjordur/',
    },
    signal,
  });
  const tegund = (r.headers.get('content-type') || '').toLowerCase();
  const bytes = new Uint8Array(await r.arrayBuffer());
  if (!r.ok || tegund.indexOf('image/jpeg') !== 0 || !erJpeg(bytes)) return null;
  return bytes;
}

async function loftmynd(x, y, signal) {
  const dx = 42;
  const dy = 30;
  const bbox = `${x - dx},${y - dy},${x + dx},${y + dy}`;
  const url = EXPORT
    + `?bbox=${bbox}&bboxSR=3057&imageSR=3057&size=640,448&format=jpg&layers=show:0&f=image`;
  const r = await fetch(url, {
    headers: { 'User-Agent': 'Slokkvitaeki/1.0 (+https://slokkvitaeki.netlify.app)' },
    signal,
  });
  const tegund = (r.headers.get('content-type') || '').toLowerCase();
  const bytes = new Uint8Array(await r.arrayBuffer());
  if (!r.ok || tegund.indexOf('image/jpeg') !== 0 || !erJpeg(bytes)) return null;
  return bytes;
}

export default async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors() });
  if (req.method !== 'POST') return j(405, { ok: false, error: 'post', message: 'Aðeins POST' });

  const edge = String(process.env.EDGE_SHARED_KEY || '').trim();
  if (edge) {
    const got = String(req.headers.get('x-eldklar-key') || '').trim();
    if (got !== edge) return j(401, { ok: false, error: 'unauthorized', message: 'Ekki heimild' });
  }

  let body = {};
  try { body = await req.json(); } catch (_) { body = {}; }
  const address = String((body && body.address) || '').trim().slice(0, 180);
  if (!address || !/\d/.test(address)) {
    return j(200, { ok: false, error: 'engin-mynd', message: 'Engin mynd af húsi' });
  }

  const svKey = String(process.env.GOOGLE_MAPS_API_KEY || '').trim();
  const vilja = String((body && body.vilja) || '');   // 'streetview' = aðeins götumynd, engin loftmynd til vara (bakfylling 367)
  const signal = AbortSignal.timeout(svKey ? 12000 : 8000);
  const mapis = MAPIS_POST.has(postnrUr(address));
  try {
    const p = await stadfang(address, signal);
    if (!p) {
      return j(200, { ok: false, error: 'engin-mynd', message: 'Engin mynd af húsi', heimild: vilja === 'streetview' ? SV_HEIMILD : (mapis ? MAPIS_HEIMILD : HEIMILD) });
    }
    if (svKey) {
      const w = isn93TilWgs84(p.x, p.y);
      const sv = await streetView(w.lat, w.lng, signal, svKey).catch(() => null);
      if (sv) {
        return j(200, {
          ok: true,
          image: tilB64(sv.bytes),
          contentType: sv.contentType,
          attribution: SV_ATTR + (sv.date ? ' · ' + sv.date : ''),
          heimild: SV_HEIMILD,
          dags: sv.date,
          hnit: { lat: w.lat, lng: w.lng },
        });
      }
    }
    if (vilja === 'streetview') {
      return j(200, { ok: false, error: 'engin-mynd', message: svKey ? 'Engin götumynd á þessum stað' : 'GOOGLE_MAPS_API_KEY vantar á Netlify', heimild: SV_HEIMILD });
    }
    if (mapis) {
      const loft = await mapisLoftmynd(p.x, p.y, signal);
      if (!loft) {
        return j(200, { ok: false, error: 'engin-mynd', message: 'Engin mynd af húsi', heimild: MAPIS_HEIMILD });
      }
      return j(200, {
        ok: true,
        image: tilB64(loft),
        contentType: 'image/jpeg',
        attribution: MAPIS_ATTR,
        heimild: MAPIS_HEIMILD,
      });
    }
    if (!innan(p.x, p.y)) {
      return j(200, { ok: false, error: 'engin-mynd', message: 'Engin mynd af húsi', heimild: HEIMILD });
    }
    const bytes = await loftmynd(p.x, p.y, signal);
    if (!bytes) {
      return j(200, { ok: false, error: 'engin-mynd', message: 'Engin mynd af húsi', heimild: HEIMILD });
    }
    return j(200, {
      ok: true,
      image: tilB64(bytes),
      contentType: 'image/jpeg',
      attribution: ATTR,
      heimild: HEIMILD,
    });
  } catch (e) {
    if (e && (e.name === 'TimeoutError' || e.name === 'AbortError')) {
      return j(200, { ok: false, error: 'timi', message: mapis ? 'Loftmyndin svaraði ekki í tæka tíð' : 'Borgarvefsjá svaraði ekki í tæka tíð' });
    }
    return j(200, { ok: false, error: 'engin-mynd', message: 'Engin mynd af húsi', heimild: mapis ? MAPIS_HEIMILD : HEIMILD });
  }
};

export const config = { path: '/api/husmynd' };
