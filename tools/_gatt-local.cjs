// Prófunarþjónn fyrir gáttina (22.10.2026): kyrrstæðar skrár úr repóinu + lestur (GET) úr raunverulegu /api, SKRIF eru hermd (ekkert vistast).
// Notkun: node tools/_gatt-local.cjs [port]   →   http://localhost:5598/gatt/?c=<slug>
// TEXTI=<json> bætir skýrslutexta (docId → texti) við svarið svo viðmótið sjáist áður en bakendinn er birtur.
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..'), PROD = 'https://slokkvitaeki.netlify.app', PORT = Number(process.argv[2] || 5598);
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.json': 'application/json', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.pdf': 'application/pdf' };
let TEXTI = {}; try { if (process.env.TEXTI) TEXTI = JSON.parse(fs.readFileSync(process.env.TEXTI, 'utf8')); } catch (_) {}
const simErindi = []; let simId = 90000;
// DEMOER=1: sýnishorn af erindum á öllum stigum (Móttekið → Í vinnslu → Svarað → Lokið) svo útlitið sjáist
const d = (n) => new Date(Date.now() - n * 864e5).toISOString();
if (process.env.DEMOER) simErindi.push(
  { id: 9101, fid: 197, titill: 'Verkbeiðni — Auka herbergi / viðbót við kerfi', lysing: 'Auka herbergi / viðbót við kerfi\nStaðsetning: Norðurendi, 30 ný herbergi\nÞarf að vera tilbúið fyrir öryggisúttekt.', stada: 'lokid', tegund: 'verkbeidni', dags: d(220), uppf: d(205), lokid: d(205), lokid_lysing: 'Brunakerfi prófað 12/03 og tengt við nýja álmu. Sjá skýrslu og reikning.', visun: [{ t: 'skyrsla', docId: 6431, txt: 'Brunakerfi mars 2026' }, { t: 'reikningur', nr: 'R-108001', txt: 'Grandi' }], abyrgd: 'okkar' },
  { id: 9102, fid: 201, titill: 'Gagnabeiðni — Staðfesting á reyklosun', lysing: 'Staðfesting á reyklosun\nÞarf að skila til byggingarfulltrúa 13. maí.', stada: 'svarad', tegund: 'gogn', dags: d(160), svarad: d(159), svar: 'Reyklosun er yfirfarin og skráð á brunakerfisskýrslu Laugavegar 08/10/2026. Skýrslan er hér undir vísun.', visun: [{ t: 'skyrsla', docId: 10130, txt: 'Brunakerfi október 2026' }], abyrgd: 'okkar' },
  { id: 9103, fid: 201, titill: 'Fyrirspurn — Spurning um reikning R-000800', lysing: 'Spurning um reikning R-000800 (Laugavegur): Hvers vegna var komið aftur í ágúst?', stada: 'i_vinnslu', tegund: 'fyrirspurn', dags: d(3), visun: [{ t: 'reikningur', nr: 'R-000800', txt: 'Laugavegur' }], abyrgd: 'okkar' },
  { id: 9104, fid: 193, titill: 'Annað — Aðgangur fyrir bókara', lysing: 'Viljum bæta bókara við reikningapóst.', stada: 'mottekid', tegund: 'annad', dags: d(0), visun: [], abyrgd: 'okkar' }
);

http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://x');
  try {
    if (u.pathname.startsWith('/api/')) {
      if (req.method === 'GET') {
        const r = await fetch(PROD + req.url);
        const buf = Buffer.from(await r.arrayBuffer());
        const ct = r.headers.get('content-type') || 'application/json';
        if (u.pathname === '/api/gatt' && r.ok && /json/.test(ct)) {
          const j = JSON.parse(buf.toString('utf8'));
          (j.reports || []).forEach((x) => { if (TEXTI[x.docId] && !x.texti) x.texti = TEXTI[x.docId]; });
          (j.buildings || []).forEach((b) => (b.saga || []).forEach((e) => { if (TEXTI[e.docId] && !e.x) e.x = TEXTI[e.docId]; }));
          j.erindi = (j.erindi || []).concat(simErindi);
          res.writeHead(r.status, { 'content-type': ct }); res.end(JSON.stringify(j)); return;
        }
        res.writeHead(r.status, { 'content-type': ct }); res.end(buf); return;
      }
      let body = ''; for await (const c of req) body += c;
      let b = {}; try { b = JSON.parse(body || '{}'); } catch (_) {}
      const KT = { fyrirspurn: 'Fyrirspurn', gogn: 'Gagnabeiðni', reikningur: 'Reikningur', annad: 'Annað', verkbeidni: 'Verkbeiðni', thjonusta: 'Beiðni um þjónustu' };
      const kind = KT[b.kind] ? b.kind : 'fyrirspurn';
      const e = { id: ++simId, fid: b.site_id || null, titill: KT[kind] + (b.titill ? ' — ' + b.titill : ''), lysing: b.lysing || null, stada: 'mottekid', rstada: 'nytt', tegund: kind, dags: new Date().toISOString(), visun: b.visun || [], abyrgd: 'okkar' };
      simErindi.push(e);
      console.log('SIMULATED POST', req.url, JSON.stringify(b).slice(0, 200));
      res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify({ ok: true, row: {}, mal: e.id, erindi: e })); return;
    }
    let p = decodeURIComponent(u.pathname); if (p.endsWith('/')) p += 'index.html';
    const f = path.join(ROOT, p);
    if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end('404'); return; }
    const ext = path.extname(f);
    if (ext === '.html' && u.searchParams.get('tab')) {   // ?tab=erindi smellir á flipann eftir hleðslu (fyrir skjámyndir)
      const tab = JSON.stringify(u.searchParams.get('tab')), clk = JSON.stringify(u.searchParams.get('click') || '');
      const code = '(function(){var tab=' + tab + ',clk=' + clk + ';var t=document.querySelector("nav .tab[data-view=" + JSON.stringify(tab) + "]");if(t)t.click();setTimeout(function(){if(clk){var d=document.querySelector(clk);if(d)d.click();}},400);})()';
      const inj = '<script>setTimeout(function(){' + code + '},3000);</scr' + 'ipt>';
      res.writeHead(200, { 'content-type': MIME['.html'], 'cache-control': 'no-store' });
      res.end(fs.readFileSync(f, 'utf8').replace('</body>', inj + '</body>')); return;
    }
    res.writeHead(200, { 'content-type': MIME[ext] || 'application/octet-stream', 'cache-control': 'no-store' });
    fs.createReadStream(f).pipe(res);
  } catch (e) { res.writeHead(500); res.end(String(e)); }
}).listen(PORT, () => console.log('gatt local on ' + PORT));
