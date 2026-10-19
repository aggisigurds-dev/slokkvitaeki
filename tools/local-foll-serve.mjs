// local-foll-serve — staðbundinn prófunarþjónn: static-skrár + Netlify-föllin ÚR ÞESSU TRÉ.
//
// 19.10.2026. `npx serve` (launch.json) kann engin föll, svo /.netlify/functions/* skilaði 404 og viðmót sem
// hvílir á föllum (Greining fasteignar 451, Teikningar 374/384) var óprófanlegt staðbundið. Hér er hvert fall
// í netlify/functions/<nafn>.js (Netlify v2: `export default async (req) => Response`) flutt inn beint og keyrt
// á sömu rót sem /.netlify/functions/<nafn> og /api/<nafn>. Fall sem er ekki til hér (eða er .cjs / background)
// er sent áfram á framleiðsluna, svo síðan hleðst heil. Ekkert er skrifað — föllin sem breyta gögnum (POST) eru
// líka send áfram óbreytt; prófaðu þau ekki héðan nema þú ætlir að skrifa í framleiðslugögnin.
//
//   node tools/local-foll-serve.mjs            # http://localhost:5612
//   PORT=5610 node tools/local-foll-serve.mjs
//
// launch.json: „foll-dev" ræsir þetta fyrir preview_start.

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FOLL = path.join(ROT, 'netlify', 'functions');
const PORT = Number(process.env.PORT) || 5612;
const LIVE = process.env.LIVE_ROT || 'https://slokkvitaeki.netlify.app';

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.webmanifest': 'application/manifest+json', '.txt': 'text/plain; charset=utf-8', '.pdf': 'application/pdf', '.map': 'application/json' };

const foll = new Map();
async function fall(nafn) {
  if (foll.has(nafn)) return foll.get(nafn);
  const skra = path.join(FOLL, nafn + '.js');
  let m = null;
  if (fs.existsSync(skra)) {
    try { m = (await import(pathToFileURL(skra).href)).default || null; }
    catch (e) { console.error('[foll] ' + nafn + ' hlóðst ekki:', e.message); m = null; }
  }
  foll.set(nafn, typeof m === 'function' ? m : null);
  return foll.get(nafn);
}

async function lesaBuk(req) {
  if (req.method === 'GET' || req.method === 'HEAD') return undefined;
  const b = [];
  for await (const c of req) b.push(c);
  return Buffer.concat(b);
}

async function senda(res, svar) {
  res.statusCode = svar.status;
  svar.headers.forEach((v, k) => { if (k.toLowerCase() !== 'content-encoding' && k.toLowerCase() !== 'transfer-encoding') res.setHeader(k, v); });
  if (!svar.body) return res.end();
  const buf = Buffer.from(await svar.arrayBuffer());
  res.setHeader('content-length', String(buf.length));
  res.end(buf);
}

async function afram(req, res, url, buk) {
  const r = await fetch(LIVE + url.pathname + url.search, {
    method: req.method,
    headers: Object.fromEntries(Object.entries(req.headers).filter(([k]) => !['host', 'connection', 'content-length', 'accept-encoding'].includes(k))),
    body: buk,
    redirect: 'manual',
  });
  return senda(res, r);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost:' + PORT);
  try {
    const m = /^\/(?:\.netlify\/functions|api)\/([A-Za-z0-9_-]+)\/?$/.exec(url.pathname);
    if (m) {
      const buk = await lesaBuk(req);
      const f = await fall(m[1]);
      if (f) {
        const headers = new Headers();
        for (const [k, v] of Object.entries(req.headers)) if (typeof v === 'string') headers.set(k, v);
        const inn = new Request('http://localhost:' + PORT + '/.netlify/functions/' + m[1] + url.search, { method: req.method, headers, body: buk });
        const t0 = Date.now();
        const svar = await f(inn, {});
        console.log('[foll] ' + req.method + ' ' + m[1] + url.search.slice(0, 80) + ' → ' + svar.status + ' (' + (Date.now() - t0) + ' ms)');
        return senda(res, svar);
      }
      console.log('[afram] ' + req.method + ' ' + url.pathname);
      return afram(req, res, url, buk);
    }
    let p = decodeURIComponent(url.pathname);
    if (p.endsWith('/')) p += 'index.html';
    const skra = path.join(ROT, p);
    if (!skra.startsWith(ROT)) { res.statusCode = 403; return res.end(); }
    if (fs.existsSync(skra) && fs.statSync(skra).isFile()) {
      res.setHeader('content-type', MIME[path.extname(skra).toLowerCase()] || 'application/octet-stream');
      res.setHeader('cache-control', 'no-store');
      return fs.createReadStream(skra).pipe(res);
    }
    return afram(req, res, url, await lesaBuk(req));
  } catch (e) {
    console.error('[villa]', url.pathname, e.message);
    res.statusCode = 502; res.setHeader('content-type', 'application/json'); res.end(JSON.stringify({ error: e.message }));
  }
});
server.listen(PORT, () => console.log('local-foll-serve á http://localhost:' + PORT + ' — föll úr ' + FOLL + ', annað frá ' + LIVE));
