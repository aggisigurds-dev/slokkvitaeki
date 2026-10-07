#!/usr/bin/env node
/**
 * Vafrapróf: „Nýtt"-merki í Teikning-glugganum (2D + 3D) — Agnar 07.10.2026, Álfaborg 661.
 *
 * Keyrir RAUNVERULEGA appið (index.html) af þessu vinnutré á localhost (lítill kyrrstöðuþjónn hér inni) og opnar
 * Teikning-gluggann fyrir 661. teikning_bord er SVARAÐ með gögnunum sem TurboPaint vistaði í prófi (gripin, aldrei
 * skrifuð — kjarni tools/turbopaint-slt-brsl.cjs → vistun-661.json). VÖRÐUR: öll skrif (allt nema GET/HEAD/OPTIONS) í
 * Supabase og Netlify-föll eru gripin og svarað 200 — ekkert fer út; í lokin staðfest. Lestur fer í gegn (tæki, myndin).
 *   1. 2D: Nýtt-merkin teiknast (434) — tegundin sem tákn + miðinn „Nýtt · <tegund>"; upplýsingalínan í tækjalistanum
 *      „Nýtt (óskráð): N — N ný tæki í biðstöðu, bíða samþykkis: …"
 *   2. 3D (383 undirbua): Nýtt-merkin eru með — miði „Nýtt · <tegund>", indígó, líkan tegundarinnar
 *   3. Vista í Teikningu (gripið): Nýtt-merkin og allir reitir þeirra (nytt / tegund / stada) lifa vistunina af
 *   node tools/teikning-nytt-vafri.cjs <vistun-661.json> [úttaksmappa]
 */
const fs = require('fs');
const path = require('path');
const http = require('http');
let chromium;
try { ({ chromium } = require('playwright')); } catch (_) { ({ chromium } = require(path.join(__dirname, '../../luna-bridge/node_modules/playwright'))); }
const ROT = path.join(__dirname, '..');
const VISTUN = process.argv[2];
const OUT = process.argv[3] || path.join(process.cwd(), 'teikning-nytt-myndir');
if (!VISTUN || !fs.existsSync(VISTUN)) { console.error('Vantar vistun-661.json (úr kjarni tools/turbopaint-slt-brsl.cjs)'); process.exit(2); }
fs.mkdirSync(OUT, { recursive: true });
const gogn = JSON.parse(fs.readFileSync(VISTUN, 'utf8'));
const CID = gogn.company_id || 661;
const ok = [], bad = [];
const check = (n, c, x) => { (c ? ok : bad).push(n); console.log((c ? '  ✓ ' : '  ✗ ') + n + (c ? '' : '   ← ' + x)); };

const TEG = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json', '.woff2': 'font/woff2', '.jpg': 'image/jpeg' };
function thjonn() {
  return new Promise((res) => {
    const s = http.createServer((req, svar) => {
      let p = decodeURIComponent(req.url.split('?')[0]);
      if (p === '/') p = '/index.html';
      const f = path.join(ROT, p);
      if (!f.startsWith(ROT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { svar.writeHead(404); svar.end(); return; }
      svar.writeHead(200, { 'content-type': TEG[path.extname(f)] || 'application/octet-stream', 'cache-control': 'no-store' });
      fs.createReadStream(f).pipe(svar);
    });
    s.listen(0, '127.0.0.1', () => res(s));
  });
}

(async () => {
  const srv = await thjonn();
  const BASE = 'http://127.0.0.1:' + srv.address().port;
  const b = await chromium.launch({ headless: true });
  const ctx = await b.newContext({ viewport: { width: 1600, height: 950 } });
  const gripid = [], skrifVafra = [], errs = [];
  let vistad = null;
  // VÖRÐUR: öll skrif í Supabase (REST / geymsla / rpc) gripin
  const grip = (route) => {
    const req = route.request();
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method())) return route.fallback();
    gripid.push(req.method() + ' ' + req.url().replace(/\?.*$/, ''));
    if (/teikning_bord/.test(req.url())) { try { vistad = JSON.parse(req.postData() || 'null'); } catch (_) {} }
    return route.fulfill({ status: 200, contentType: 'application/json', body: /teikning_bord/.test(req.url()) ? JSON.stringify([{ company_id: CID }]) : '[]' });
  };
  await ctx.route(/supabase\.co\/(rest|storage)\/v1\//, grip);
  // teikning_bord 661 = gögnin sem TurboPaint vistaði (gripin í kjarni-prófinu)
  await ctx.route(/supabase\.co\/rest\/v1\/teikning_bord/, async (route) => {
    const req = route.request();
    if (!['GET', 'HEAD'].includes(req.method())) return grip(route);
    if (!new RegExp('company_id=eq\\.' + CID + '\\b').test(req.url())) return route.fallback();
    const res = await route.fetch();
    let j; try { j = await res.json(); } catch (_) { return route.fulfill({ response: res }); }
    const rows = Array.isArray(j) ? j : [j];
    for (const r of rows) if (r && (r.haedir || r.markers)) { r.haedir = JSON.parse(JSON.stringify(gogn.haedir)); r.markers = gogn.markers; }
    const headers = { ...res.headers() }; delete headers['content-length']; delete headers['content-encoding'];
    return route.fulfill({ status: res.status(), headers, body: JSON.stringify(j) });
  });
  // Netlify-föll (teikn-mynd o.fl.): lestur sóttur af lifandi síðunni; skrif gripin
  await ctx.route(/\/\.netlify\/functions\//, async (route) => {
    const req = route.request();
    if (!['GET', 'HEAD'].includes(req.method())) { gripid.push(req.method() + ' ' + req.url().replace(/\?.*$/, '')); return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' }); }
    const u = new URL(req.url());
    const res = await route.fetch({ url: 'https://slokkvitaeki.netlify.app' + u.pathname + u.search });
    return route.fulfill({ response: res });
  });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errs.push(e.message.split('\n')[0]));
  page.on('request', (r) => { if (!['GET', 'HEAD', 'OPTIONS'].includes(r.method())) skrifVafra.push(r.method() + ' ' + r.url().replace(/\?.*$/, '')); });
  await page.goto(BASE + '/index.html', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.FloorPlan && typeof FloorPlan.open === 'function' && window.DB && DB.sb && window.TeiknMerking && window.TeiknTakn && window.TeiknBord, null, { timeout: 120000 });
  await page.waitForTimeout(3000);
  // Teikning-glugginn fyrir 661 — sama kall og „Teikning"-takkinn á prófílnum (features.js opnaTeikningu)
  const einingar = await page.evaluate(async (cid) => {
    const r = await DB.sb.from('uttaeki').select('*').eq('fyrirtaeki_id', cid);
    const u = (r.data || []).map((x) => Object.assign({ client: 'Álfaborg' }, x));
    FloorPlan.load(cid);
    FloorPlan.open(cid, 'Álfaborg', u);
    return u.length;
  }, CID);
  console.log('tæki staðarins:', einingar);
  await page.waitForFunction((cid) => { const p = FloorPlan.plans && FloorPlan.plans[cid]; return p && Array.isArray(p.haedir) && p.haedir.length && FloorPlan.bgImage; }, CID, { timeout: 120000 });
  await page.waitForTimeout(4000);
  const h1 = gogn.haedir[0];
  const nyttVaent = (h1.markers || []).filter((m) => m.nytt);
  const s2d = await page.evaluate(() => {
    const p = FloorPlan.plans[FloorPlan.companyId];
    const n = (p.markers || []).filter((m) => window.TeiknMerking.erNytt(m));
    const lina = document.getElementById('fp-nytt');
    return { nytt: n.length, tegundir: n.map((m) => m.tegund), lina: lina && !lina.hidden ? lina.textContent : null, nafn: n[0] ? null : null };
  });
  console.log('2D:', JSON.stringify(s2d));
  check('2D: Nýtt-merkin eru á hæðinni í Teikning-glugganum (' + nyttVaent.length + ')', s2d.nytt === nyttVaent.length && nyttVaent.length > 0, JSON.stringify(s2d));
  check('tækjalistinn: „Nýtt (óskráð): N — N ný tæki í biðstöðu, bíða samþykkis: …"', !!s2d.lina && new RegExp('^Nýtt \\(óskráð\\): ' + nyttVaent.length + ' — ' + nyttVaent.length + ' ný tæki í biðstöðu, bíða samþykkis: ').test(s2d.lina), s2d.lina);
  // 2D-teikningin: dílar í indígó (#4f46e5) — miðinn „Nýtt · <tegund>" var teiknaður á strigann
  const indigo = await page.evaluate(() => {
    const c = document.getElementById('fp-canvas'); if (!c) return -1;
    const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    let n = 0; for (let i = 0; i < d.length; i += 4) if (Math.abs(d[i] - 79) < 20 && Math.abs(d[i + 1] - 70) < 20 && Math.abs(d[i + 2] - 229) < 24) n++;
    return n;
  });
  check('2D: miðinn „Nýtt · <tegund>" teiknaður (indígó dílar á striganum)', indigo > 200, indigo);
  await page.screenshot({ path: path.join(OUT, '11_teikning_2d_nytt.png') });
  // 3D — tilbúin (leiðrétt) hæð opnast SJÁLF í 3D (383 sjalfgefid3d); annars er smellt á 3D-takkann
  const takki = page.locator('.fp-3d-btn').first();
  check('3D-takkinn er til', (await takki.count()) === 1, await takki.count());
  await page.waitForTimeout(3000);
  if (!(await page.evaluate(() => !!document.getElementById("fp-3d")))) await takki.click();
  await page.waitForFunction(() => window.TeiknBord && TeiknBord.syn3d && TeiknBord.syn3d(), null, { timeout: 240000 }).catch(() => {});
  await page.waitForTimeout(6000);
  const s3d = await page.evaluate(() => {
    const s = window.TeiknBord && TeiknBord.syn3d && TeiknBord.syn3d();
    let sena = null;
    try { sena = s && s.blenderSena ? s.blenderSena({ myndHamark: 0 }) : null; } catch (e) { sena = { villa: String(e) }; }
    const txt = JSON.stringify(sena || {});
    const midar = (txt.match(/Nýtt · [A-Za-zÁÉÍÓÚÝÞÆÖáéíóúýþæöð0-9 ]+/g) || []);
    return { til: !!s, midar: midar.length, synishorn: midar.slice(0, 4), indigo: (txt.match(/#4f46e5/gi) || []).length, lengd: txt.length };
  });
  console.log('3D:', JSON.stringify(s3d));
  check('3D: Nýtt-merkin eru í senunni með miðanum „Nýtt · <tegund>"', s3d.midar >= nyttVaent.length, JSON.stringify(s3d));
  await page.screenshot({ path: path.join(OUT, '12_teikning_3d_nytt.png') });
  await page.keyboard.press('Escape').catch(() => {});
  await page.waitForTimeout(800);
  // Vista í Teikningu (gripið): Nýtt-merkin lifa
  const nGrip = gripid.length;
  await page.evaluate(() => { if (window.TeiknMerking && TeiknMerking.vistaAdThjoni) TeiknMerking.vistaAdThjoni(); });
  for (let i = 0; i < 40 && !vistad; i++) await page.waitForTimeout(250);
  const vh = vistad && Array.isArray(vistad.haedir) ? vistad.haedir.find((h) => h.id === h1.id) : null;
  const eftir = vh ? (vh.markers || []).filter((m) => m.nytt) : [];
  check('Vista í Teikningu (gripið): öll Nýtt-merkin og reitir þeirra lifa (nytt / tegund / stada / n:-unitId)', !!vh && eftir.length === nyttVaent.length && eftir.every((m) => m.tegund && m.stada === 'bid' && /^n:/.test(m.unitId)), JSON.stringify({ vh: !!vh, eftir: eftir.length, vaent: nyttVaent.length, grip: gripid.length - nGrip }));
  const oll = vh ? vistad.haedir.flatMap((h) => (h.markers || []).map((m) => String(m.unitId))) : [];
  check('ekkert unitId tvisvar yfir hæðir eftir vistun Teikningar', new Set(oll).size === oll.length, '');
  // vörður
  const sloppid = skrifVafra.filter((r) => !gripid.includes(r) && !/127\.0\.0\.1/.test(r));
  console.log('skrif vafrans:', skrifVafra.length, '· gripin:', gripid.length);
  check('ENGIN skrif fóru út (öll gripin)', sloppid.length === 0, JSON.stringify(sloppid.slice(0, 5)));
  const villur = errs.filter((e) => !/ResizeObserver|Failed to fetch|NetworkError|Load failed/.test(e));
  if (villur.length) console.log('síðuvillur:', villur.slice(0, 5));
  console.log('\n' + ok.length + ' í lagi, ' + bad.length + ' brást');
  await b.close();
  srv.close();
  process.exit(bad.length ? 1 : 0);
})().catch((e) => { console.error('VILLA', e); process.exit(2); });
