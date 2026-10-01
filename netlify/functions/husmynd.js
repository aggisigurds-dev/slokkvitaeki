/**
 * Mynd af húsi — Borgarvefsjá, loftmynd 2018. Enginn lykill.
 *
 *   POST /api/husmynd
 *   { address }
 *   → { ok:true, image:<base64>, contentType, attribution, heimild:'borgarvefsja-2018' }
 *   → { ok:false, error:'engin-mynd'|'timi', message }
 *
 * GOOGLE_MAPS_API_KEY er ekki til. Places og Street View eru ekki kallað.
 * Já.is er ekki skrapað. Heimildin er sama ArcGIS-þjónusta og Borgarvefsjá
 * birtir (Loftmynd 17.7.2018). Hún sýnir húsið að ofan, oft með vegg þegar
 * húsið er hátt. Götumynd að utan fæst ekki án lykils.
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
// fullExtent á Loftmynd-þjónustunni, mælt 2026-10-01.
const EXTENT = { xmin: 344000, ymin: 392000, xmax: 384000, ymax: 427000 };
const MIN_BYTES = 12000;

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

async function stadfang(address, signal) {
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
  return null;
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

  const signal = AbortSignal.timeout(8000);
  try {
    const p = await stadfang(address, signal);
    if (!p || !innan(p.x, p.y)) {
      return j(200, { ok: false, error: 'engin-mynd', message: 'Engin mynd af húsi' });
    }
    const bytes = await loftmynd(p.x, p.y, signal);
    if (!bytes) {
      return j(200, { ok: false, error: 'engin-mynd', message: 'Engin mynd af húsi' });
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
      return j(200, { ok: false, error: 'timi', message: 'Borgarvefsjá svaraði ekki í tæka tíð' });
    }
    return j(200, { ok: false, error: 'engin-mynd', message: 'Engin mynd af húsi' });
  }
};

export const config = { path: '/api/husmynd' };
