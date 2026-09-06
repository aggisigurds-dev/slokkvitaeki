/**
 * Manifest fyrir NOTENDA-BÚIN öpp (/app/<key>/) — 06.09.2026.
 *
 *   GET /api/app-manifest?key=xarsskodunskjar&name=Ársskoðun · Skjár&emoji=📱&color=%23334155&dark=%230f172a
 *   → application/manifest+json með id/start_url/scope = /app/<key>/
 *
 * Innbyggðu öppin (Fjármál, Boss, …) eiga kyrrstæð manifest-*.json + eigin PNG-tákn
 * í /img. Notenda-búin öpp (261 saveAsApp — „save as app page named …") höfðu
 * EKKERT manifest, svo Chrome bauð aldrei uppsetningu og „Setja upp" endaði alltaf
 * í ⋮-leiðbeiningunum (Agnar 06.09.2026: „get ekki installað Ársskoðun app á
 * heimaskjá"). 261 vísar <link rel=manifest> hingað fyrir þau; nafn, litur og
 * slóð eru appsins, táknið er aðal-app-táknið (img/icon-192/512.png).
 *
 * Engin gögn lesin eða skrifuð — hreint fall af fyrirspurninni. Ekkert leyndarmál.
 */
export default async (req) => {
  const u = new URL(req.url);
  const q = u.searchParams;
  const key = String(q.get('key') || '').toLowerCase();
  if (!/^[a-z]{1,24}$/.test(key)) return j(400, { error: 'key' });

  const name = clean(q.get('name'), 45) || key;
  const short = clean(q.get('short'), 12) || name.split(' · ')[0].slice(0, 12);
  const blurb = clean(q.get('blurb'), 120) || ('Notenda-búið app — ' + name);
  const color = hex(q.get('color')) || '#334155';
  const dark = hex(q.get('dark')) || '#0f172a';
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
      'cache-control': 'public, max-age=600',
    },
  });
};

function clean(s, max) {
  return String(s == null ? '' : s).replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, max);
}
function hex(s) {
  const m = String(s || '').trim().match(/^#?([0-9a-f]{6})$/i);
  return m ? '#' + m[1].toLowerCase() : null;
}
function j(status, body) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8' } });
}

export const config = { path: '/api/app-manifest' };
