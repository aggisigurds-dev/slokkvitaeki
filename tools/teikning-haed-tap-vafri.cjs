// Endurskapar hæðatapið í Teikning-glugganum: „+ Hæð" og svo berst röð þjónsins (eins og 375 serverFetch gerir) —
// hverfur nýja hæðin? Keyrir RAUNVERULEGA appið af vinnutrénu (óbúntað index.html) á localhost; Netlify-föll og /api
// fara á lifandi vef; ÖLL skrif í Supabase gripin (fulfill) — ekkert vistast.
//   node teikn-haed-tap.cjs [cid]
const fs = require('fs'), path = require('path'), http = require('http');
const { chromium } = (() => { try { return require('playwright'); } catch (_) { return require(path.join(__dirname, '../../luna-bridge/node_modules/playwright')); } })();
const ROT = path.resolve(__dirname, '..');
const CID = +(process.argv[2] || 532);
const LIVE = 'https://slokkvitaeki.netlify.app';
const TEG = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json', '.woff2': 'font/woff2', '.jpg': 'image/jpeg' };
function thjonn() {
  return new Promise((res) => {
    const s = http.createServer((req, svar) => {
      let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/index.html';
      const f = path.join(ROT, p);
      if (!f.startsWith(ROT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { svar.writeHead(404); svar.end(); return; }
      svar.writeHead(200, { 'content-type': TEG[path.extname(f)] || 'application/octet-stream', 'cache-control': 'no-store' });
      fs.createReadStream(f).pipe(svar);
    });
    s.listen(0, '127.0.0.1', () => res(s));
  });
}
(async () => {
  const srv = await thjonn(); const BASE = 'http://127.0.0.1:' + srv.address().port;
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1500, height: 950 } });
  const skrif = [];
  await ctx.route(/supabase\.co\/(rest|storage)\/v1\//, (route) => {
    const q = route.request(), u = q.url(), m = q.method();
    if (['GET', 'HEAD', 'OPTIONS'].includes(m)) return route.fallback();
    skrif.push(m + ' ' + u.replace(/\?.*$/, '').slice(-50));
    return route.fulfill({ status: 200, contentType: 'application/json', body: /teikning_bord/.test(u) ? JSON.stringify([{ company_id: CID }]) : '[]' });
  });
  await ctx.route(/\/(\.netlify\/functions|api)\//, async (route) => {
    const q = route.request(), u = new URL(q.url());
    if (u.pathname === '/api/hub-adgangar') return route.fulfill({ status: 404, body: '' });   // innskráningarhliðið: 404 = opið eins og á vinnutrénu
    if (!['GET', 'HEAD'].includes(q.method())) { skrif.push(q.method() + ' ' + u.pathname); return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' }); }
    try { const r = await route.fetch({ url: LIVE + u.pathname + u.search }); return route.fulfill({ response: r }); } catch (e) { return route.abort(); }
  });
  const p = await ctx.newPage(); const villur = [];
  p.on('pageerror', e => villur.push(String(e).slice(0, 160)));
  await p.goto(BASE + '/index.html', { waitUntil: 'domcontentloaded' });
  let ok = false;
  for (let i = 0; i < 60; i++) { ok = await p.evaluate(() => !!(window.FloorPlan && typeof FloorPlan.open === 'function' && window.DB && DB.sb && window.TeiknBord)); if (ok) break; if (i === 9) console.log('  ræsing…', await p.evaluate(() => ({ FP: typeof window.FloorPlan, DB: typeof window.DB, TB: typeof window.TeiknBord, scripts: document.scripts.length, url: location.href, html: document.documentElement.outerHTML.slice(0, 260) }))); await p.waitForTimeout(1000); }
  if (!ok) { console.log('RÆSTIST EKKI'); console.log('villur:', villur.slice(0, 6)); await b.close(); srv.close(); process.exit(2); }
  await p.waitForTimeout(2000);
  // sama kall og „Teikning"-takkinn á prófílnum (features.js opnaTeikningu)
  await p.evaluate(async (cid) => { const r = await DB.sb.from('uttaeki').select('*').eq('fyrirtaeki_id', cid); const u = (r.data || []); FloorPlan.load(cid); FloorPlan.open(cid, 'Prófun', u); }, CID);
  const greina = () => p.evaluate((cid) => { const pl = FloorPlan.plans && FloorPlan.plans[cid]; const m = document.getElementById('modal-floorplan'); return { cid: FloorPlan.companyId, haedir: pl && Array.isArray(pl.haedir) ? pl.haedir.length : null, bg: !!FloorPlan.bgImage, modal: m ? m.className : 'enginn', ny: !!document.querySelector('[data-h="ny"]'), flipar: !!document.getElementById('fp-haedir'), texti: document.body.innerText.replace(/\s+/g, ' ').slice(0, 200) }; }, CID);
  let klar = false;
  for (let i = 0; i < 90; i++) { const g = await greina(); if (g.haedir > 1 && g.ny) { klar = true; break; } if (i % 10 === 9) console.log('  bíð…', JSON.stringify(g)); await p.waitForTimeout(1000); }
  if (!klar) { console.log('GLUGGINN KOM EKKI:', JSON.stringify(await greina())); await p.screenshot({ path: path.join(process.cwd(), 'teikn-haed-tap-villa.png') }); console.log('villur:', villur.slice(0, 5)); await b.close(); srv.close(); process.exit(2); }
  await p.waitForTimeout(3000);
  const stada = () => p.evaluate(() => { const hs = TeiknBord.haedir(); const v = TeiknBord.virk ? TeiknBord.virk() : 0; return { n: hs.length, nofn: hs.map(h => h.nafn), virk: v, virkId: hs[v] && hs[v].id, virkUrl: hs[v] && String(hs[v].image_url || '').slice(-30) }; });
  const s0 = await stada(); console.log('0) opnað:', JSON.stringify(s0));
  const smellt = await p.evaluate(() => { const alla = Array.from(document.querySelectorAll('[data-h="ny"]')); const b = alla.find(e => e.getBoundingClientRect().width > 0) || alla[0]; if (!b) return 'enginn takki'; b.click(); return alla.length + ' takkar, smellt á ' + (b.closest('#fp-haedir') ? '#fp-haedir' : b.parentElement.id || b.parentElement.className); });
  console.log('   + Hæð (smellur):', smellt); await p.waitForTimeout(800);
  if ((await stada()).n === s0.n) {
    // smellurinn kveikti ekki í hausalausum vafra — sama leið og handfangið: samstilla, push, virkja
    const leid = await p.evaluate(() => { if (TeiknBord.nyHaed) { const h = TeiknBord.nyHaed(); return 'TeiknBord.nyHaed() → ' + h.nafn; } const hs = TeiknBord.haedir(); TeiknBord.samstilla(); hs.push({ id: 'h' + Date.now().toString(36) + 'prof', nafn: (hs.length + 1) + '. hæð', image_url: null, markers: [], skurdur: null, veggir: [] }); return 'ýtt beint á listann (engin nyHaed)'; });
    console.log('   + Hæð:', leid); await p.waitForTimeout(500);
  }
  const s1 = await stada(); console.log('1) + Hæð:', JSON.stringify(s1));
  // röð þjónsins berst (eins og serverFetch / tryggjaHaedir / ↻ gera) — GET er leyft, sama röð og á þjóninum
  const r = await p.evaluate(async (cid) => { const r = await DB.sb.from('teikning_bord').select('markers,image_url,haedir,updated_at').eq('company_id', cid).limit(1); const row = r.data[0]; FloorPlan.__eftirSokn(cid, row); return row.haedir.length; }, CID);
  await p.waitForTimeout(500);
  const s2 = await stada(); console.log('2) röð þjónsins komin (' + r + ' hæðir á þjóni):', JSON.stringify(s2));
  const tap = s2.n < s1.n || s2.virkId !== s1.virkId;
  console.log(tap ? '✗ HÆÐATAP: nýja hæðin hvarf / virka hæðin færðist á ' + (s2.nofn[s2.virk] || '?') : '✓ nýja hæðin lifði röð þjónsins af og er enn virk');
  // 3) hæð sem ÖNNUR vél eyddi (vantar í nýja röð þjónsins) á að hverfa — og nýja hæðin hér á samt að lifa
  const s3 = await p.evaluate(async (cid) => { const r = await DB.sb.from('teikning_bord').select('markers,image_url,haedir,updated_at').eq('company_id', cid).limit(1); const row = r.data[0]; row.haedir = row.haedir.slice(1); FloorPlan.__eftirSokn(cid, row); const hs = TeiknBord.haedir(); const v = TeiknBord.virk(); return { n: hs.length, nofn: hs.map(h => h.nafn), virk: v, virkId: hs[v] && hs[v].id }; }, CID);
  console.log('3) önnur vél eyddi fyrstu hæð:', JSON.stringify(s3));
  const eytt = s3.n === s2.n - 1 && s3.virkId === s1.virkId && s3.nofn.indexOf(s0.nofn[0]) < 0;
  console.log(eytt ? '✓ eydda hæðin fór, nýja hæðin lifði' : '✗ eyðing annars staðar skilaði sér ekki rétt');
  console.log('skrif gripin:', skrif.length, skrif.slice(0, 3)); console.log('villur:', villur.slice(0, 4));
  await b.close(); srv.close();
  process.exit(tap || !eytt ? 1 : 0);
})().catch((e) => { console.error('VILLA', e.message); process.exit(2); });
