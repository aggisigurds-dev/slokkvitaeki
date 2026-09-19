/**
 * Manifest fyrir NOTENDA-BÚIN öpp (/app/<key>/) — 06.09.2026.
 *
 *   GET /api/app-manifest?key=xarsskodunskjar
 *   → application/manifest+json með id/start_url/scope = /app/<key>/
 *
 * Nafn, tákn, litur og lýsing eru sótt ÚR GRUNNINUM (app_settings.settings →
 * custom_apps_json + app_profiles_overrides_json, sömu lyklar og 261 notar), svo
 * slóðin þarf aðeins lykilinn. Það skiptir máli: <head>-veljarinn í index.html
 * setur <link rel=manifest> á þessa slóð SAMSTUNDIS við hleðslu (áður benti hann á
 * aðal-manifestið, id „/", þar til 261 skipti eftir ræsingu — Chrome sótti stundum
 * manifestið á undan og þá „vann" fyrsta appið sem sett var upp: „sum öppin
 * stangast á og get bara haft fyrsta sem ég installaði"). Fyrirspurnar-breytur
 * (name/emoji/color/dark/blurb) eru leyfðar sem yfirskrift (prófun / grunnur niðri).
 *
 * Innbyggðu öppin eiga kyrrstæð manifest-*.json + eigin PNG-tákn; hér er táknið
 * aðal-app-táknið (img/icon-192/512.png). Engin skrif. Ekkert leyndarmál í svari.
 */
export default async (req) => {
  const u = new URL(req.url);
  const q = u.searchParams;
  const key = String(q.get('key') || '').toLowerCase();
  if (!/^[a-z]{1,24}$/.test(key)) return j(400, { error: 'key' });

  // 19.09.2026 (Agnar: „finn ekki lengur option að breyta tákni á eldri öppunum, og opnunarlit"): INNBYGGÐU öppin
  // (fjarmal, verkefni, brunaholf, brunakerfi, bilstjori, boss) áttu kyrrstæð manifest-*.json, svo tákn og litir
  // sem Agnar valdi í „🎨 Tákn · litur · síður" náðu ALDREI á heimaskjáinn né opnunarskjáinn (Fjármál var stillt á
  // #0000ff í grunninum en manifestið sagði áfram #0e7a4f). Nú er kyrrstæða manifestið GRUNNUR og yfirskriftin
  // (app_profiles_overrides_json) lögð ofan á. id/start_url/scope eru ÓBREYTT — sama uppsetta appið uppfærist.
  // Náist yfirskriftin ekki er kyrrstæða manifestinu skilað óbreyttu (aldrei verra en áður).
  if (BUILTIN.has(key)) return builtin(req, key);

  let app = null;
  try { app = await fromDb(key); } catch (_) { app = null; }

  const name = clean(q.get('name'), 45) || (app && clean(app.name, 45)) || key;
  const blurb = clean(q.get('blurb'), 120) || (app && clean(app.blurb, 120)) || ('Notenda-búið app — ' + name);
  const color = hex(q.get('color')) || (app && hex(app.color) !== '#334155' && hex(app.color)) || '#0b0b0d';
  const dark = hex(q.get('dark')) || (app && hex(app.dark) !== '#0f172a' && hex(app.dark)) || '#000000';
  const short = clean(q.get('short'), 12) || name.split(' · ')[0].slice(0, 12);
  const path = '/app/' + key + '/';

  const manifest = {
    id: path,
    name,
    short_name: short,
    description: blurb,
    start_url: path,
    scope: path,
    display: 'standalone',
    orientation: 'portrait',
    background_color: dark,
    theme_color: color,
    lang: 'is',
    icons: ikonar(app),
  };
  return new Response(JSON.stringify(manifest, null, 2), {
    status: 200,
    headers: {
      'content-type': 'application/manifest+json; charset=utf-8',
      'cache-control': 'public, max-age=60',
      'x-app-source': app ? 'db' : 'fallback',
    },
  });
};

const BUILTIN = new Set(['fjarmal', 'verkefni', 'brunaholf', 'brunakerfi', 'bilstjori', 'boss']);
async function builtin(req, key) {
  let base = null;
  try { const r = await fetch(new URL('/manifest-' + key + '.json', req.url)); if (r.ok) base = await r.json(); } catch (_) { base = null; }
  if (!base) return j(502, { error: 'grunn-manifest náðist ekki' });
  let o = {};
  try { o = (await overrides())[key] || {}; } catch (_) { o = {}; }
  const m = Object.assign({}, base);
  const name = clean(o.name, 45);
  if (name) { m.name = name; m.short_name = name.split(' · ')[0].slice(0, 12); }
  if (clean(o.blurb, 120)) m.description = clean(o.blurb, 120);
  if (hex(o.color)) m.theme_color = hex(o.color);
  if (hex(o.dark)) m.background_color = hex(o.dark);
  const ik = ikonSett(o.ikon);
  if (ik) m.icons = ik;
  const breytt = ['name', 'blurb', 'color', 'dark', 'ikon'].some((k) => o[k]);
  return new Response(JSON.stringify(m, null, 2), {
    status: 200,
    headers: { 'content-type': 'application/manifest+json; charset=utf-8', 'cache-control': 'public, max-age=300', 'x-app-source': breytt ? 'builtin+db' : 'builtin' },
  });
}
async function overrides() {
  const URL_ = process.env.SUPABASE_URL, KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!URL_ || !KEY) return {};
  const r = await fetch(URL_ + '/rest/v1/app_settings?id=eq.1&select=settings', { headers: { apikey: KEY, Authorization: 'Bearer ' + KEY } });
  if (!r.ok) return {};
  const rows = await r.json();
  const st = (Array.isArray(rows) && rows[0] && rows[0].settings) || {};
  return parseJson(st.app_profiles_overrides_json, {}) || {};
}
// Tákn úr safninu: PNG 192/512 (any + maskable) úr img/app-tokn/png/ (tools/app-tokn-png.cjs) + SVG. Android (WebAPK)
// þarf PNG; með SVG einu („sizes: any") fékk heimaskjárinn í besta falli almennt tákn.
function ikonSett(f) {
  if (!(typeof f === 'string' && /^[0-9]{2}-[a-z0-9-]{1,40}\.svg$/.test(f))) return null;
  const b = '/img/app-tokn/png/' + f.slice(0, -4);
  return [
    { src: b + '-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
    { src: b + '-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    { src: b + '-192-maskable.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
    { src: b + '-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    { src: '/img/app-tokn/' + f, sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
  ];
}

// app_settings (id=1).settings: custom_apps_json = '[{key,name,emoji,color,dark,blurb,defaults}]',
// app_profiles_overrides_json = '{key:{name,emoji,color,dark,blurb}}' — 261 CUSTOM_KEY / OV_KEY.
async function fromDb(key) {
  const URL_ = process.env.SUPABASE_URL, KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!URL_ || !KEY) return null;
  const r = await fetch(`${URL_}/rest/v1/app_settings?id=eq.1&select=settings`, {
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
  });
  if (!r.ok) return null;
  const rows = await r.json();
  const s = (Array.isArray(rows) && rows[0] && rows[0].settings) || {};
  const list = parseJson(s.custom_apps_json, []);
  const ov = parseJson(s.app_profiles_overrides_json, {});
  const a = Array.isArray(list) ? list.find((x) => x && x.key === key) : null;
  if (!a) return null;
  const o = (ov && ov[key]) || {};
  return { name: o.name || a.name, emoji: o.emoji || a.emoji, color: o.color || a.color, dark: o.dark || a.dark, blurb: o.blurb || a.blurb, ikon: o.ikon || a.ikon || null };
}
// 2026-09-08 (Agnar: „opna á tákn gallery"): appið getur borið tákn úr
// img/app-tokn/. Þá á heimaskjás-táknið að vera ÞAÐ, ekki aðal-logóið — annars
// líta öll uppsett öpp eins út og notandinn finnur ekki sitt.
// Skráarheitið er sannreynt hér (aðeins NN-nafn.svg) svo fyrirspurn geti ekki
// vísað út fyrir möppuna.
function ikonar(app) {
  const sett = ikonSett(app && app.ikon);
  if (sett) return sett;
  return [
    { src: '/img/icon-192.png?v=flame1', sizes: '192x192', type: 'image/png', purpose: 'any' },
    { src: '/img/icon-512.png?v=flame1', sizes: '512x512', type: 'image/png', purpose: 'any' },
    { src: '/img/icon-192.png?v=flame1', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
    { src: '/img/icon-512.png?v=flame1', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ];
}
function parseJson(v, fallback) {
  if (v == null) return fallback;
  if (typeof v !== 'string') return v;
  try { return JSON.parse(v); } catch (_) { return fallback; }
}
// Stýristafir (kóði < 32) og <> fjarlægð — engin regex-escape-sæti, þau brotnuðu í flutningi.
function clean(s, max) {
  const str = String(s == null ? '' : s);
  let out = '';
  for (const ch of str) {
    const c = ch.charCodeAt(0);
    if (c < 32 || ch === '<' || ch === '>') continue;
    out += ch;
  }
  return out.trim().slice(0, max);
}
function hex(s) {
  const m = String(s || '').trim().match(/^#?([0-9a-f]{6})$/i);
  return m ? '#' + m[1].toLowerCase() : null;
}
function j(status, body) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8' } });
}

export const config = { path: '/api/app-manifest' };
