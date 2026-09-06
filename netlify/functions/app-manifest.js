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

  let app = null;
  try { app = await fromDb(key); } catch (_) { app = null; }

  const name = clean(q.get('name'), 45) || (app && clean(app.name, 45)) || key;
  const blurb = clean(q.get('blurb'), 120) || (app && clean(app.blurb, 120)) || ('Notenda-búið app — ' + name);
  const color = hex(q.get('color')) || (app && hex(app.color)) || '#334155';
  const dark = hex(q.get('dark')) || (app && hex(app.dark)) || '#0f172a';
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
    icons: [
      { src: '/img/icon-192.png?v=flame1', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/img/icon-512.png?v=flame1', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/img/icon-192.png?v=flame1', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/img/icon-512.png?v=flame1', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
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
  return { name: o.name || a.name, emoji: o.emoji || a.emoji, color: o.color || a.color, dark: o.dark || a.dark, blurb: o.blurb || a.blurb };
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
