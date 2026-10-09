#!/usr/bin/env node
/**
 * Vafrapróf: „Greining fasteignar" (451) í gegnum viðmótið — eigin static-þjónn á vinnutrénu, Playwright.
 *
 *   node tools/greining-vafri.cjs [--ut <mappa>] [--hus "Fiskislóð 41, 101 Reykjavík|…"] [--bara 1600|980|375] [--ocr]
 *
 * Föllin bygging-uppl og fasteign-opin keyra STAÐBUNDIÐ (ný í þessari grein); önnur föll fara á lifandi síðuna (aðeins GET,
 * og POST /api/husmynd sem les aðeins). ÖLL skrif í Supabase og föll eru GRIPIN og svarað 200 — nema þau sem síðan á
 * sjálf að gera: skyndiminnisröð í fasteign_greining (tegund 'eign') og, með --ocr, EIN OCR-beiðni (workflow
 * 'bygging-ocr') fyrir prófhús. „Setja í Teikningu" er prófað á viðskiptavini án hæða (1237) með ÖLL skrif gripin og
 * innihaldið skoðað; Teikning-hnappurinn á 1404 (Test fyrirtæki), skrif gripin.
 *
 * Mælt fyrir hvert hús og breidd: allir hlutar komnir (enginn „sæki"), tölur í spjöldunum, engin lárétt skrun,
 * engar console-villur, layout-shift í spjöldunum EFTIR að hvert þeirra birtist, og 0 skrif frá sýndarprófílnum við
 * opnun, smelli og 30 s kyrrstöðu (Sydarvordur.gripid / .adrir + netið).
 */
const fs = require('fs');
const path = require('path');
const http = require('http');
const { pathToFileURL } = require('url');
let chromium, devices;
try { ({ chromium, devices } = require('playwright')); } catch (_) { ({ chromium, devices } = require('C:/Users/Slokkvitaeki/luna-bridge/node_modules/playwright')); }
const ROT = path.join(__dirname, '..');
const arg = (n, d) => { const i = process.argv.indexOf('--' + n); return i >= 0 ? process.argv[i + 1] : d; };
const OUT = arg('ut', path.join(process.cwd(), 'greining-myndir'));
const BARA = arg('bara', '');
const MED_OCR = process.argv.includes('--ocr');
const LIFANDI = 'https://slokkvitaeki.netlify.app';
fs.mkdirSync(OUT, { recursive: true });
// --ser-ut <mappa>: skjámyndir myndræna hlutans (Samantekt, Teikningar, Sjá allar, Rekstur)
const SER_UT = arg('ser-ut', '');
if (SER_UT) fs.mkdirSync(SER_UT, { recursive: true });
// --fsk-ut <mappa>: skjámyndir Teikningar-spjaldsins (forskoðun) og stóru myndarinnar
const FSK_UT = arg('fsk-ut', '');
if (FSK_UT) fs.mkdirSync(FSK_UT, { recursive: true });
const SYND = -987654321;
// --port: annar prófþjónn (npx serve) getur setið á 5599
const PORT = +arg('port', 5599);

const HUS = (arg('hus', '') ? arg('hus').split('|') : [
  'Fiskislóð 41, 101 Reykjavík',
  'Laugavegur 120, 105 Reykjavík',
  'Berjavellir 6, 221 Hafnarfjörður',
  'Skútuvogur 4, 104 Reykjavík',
  'Skútuvogur 2, 104 Reykjavík',
  'Nónhæð 6, 210 Garðabær',
  'Nónhæð 10, 210 Garðabær',
  'Hlíðasmári 17, 201 Kópavogur',
]);
const ok = [], bad = [];
const check = (n, c, x) => { (c ? ok : bad).push(n); console.log((c ? '  ✓ ' : '  ✗ ') + n + (c ? '' : '   ← ' + (x == null ? '' : String(x).slice(0, 400)))); };

const TEG = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.md': 'text/markdown; charset=utf-8', '.webmanifest': 'application/manifest+json', '.woff2': 'font/woff2', '.jpg': 'image/jpeg', '.ico': 'image/x-icon' };
const STADBUNDIN = { 'bygging-uppl': 'netlify/functions/bygging-uppl.js', 'fasteign-opin': 'netlify/functions/fasteign-opin.js', 'seruppdrattir': 'netlify/functions/seruppdrattir.js' };
const _fall = {};
async function fall(nafn) { if (!_fall[nafn]) _fall[nafn] = (await import(pathToFileURL(path.join(ROT, STADBUNDIN[nafn])).href)).default; return _fall[nafn]; }
function thjonn() {
  return new Promise((res) => {
    const s = http.createServer(async (req, svar) => {
      try {
        const u = new URL(req.url, 'http://x');
        const m = /^\/(?:\.netlify\/functions|api)\/([a-z0-9-]+)/.exec(u.pathname);
        if (m && STADBUNDIN[m[1]]) {
          const f = await fall(m[1]);
          const r = await f(new Request('http://127.0.0.1' + req.url, { method: req.method }));
          const h = {}; r.headers.forEach((v, k) => { h[k] = v; });
          svar.writeHead(r.status, h); svar.end(Buffer.from(await r.arrayBuffer())); return;
        }
        let p = decodeURIComponent(u.pathname);
        if (p === '/') p = '/index.html';
        const f = path.join(ROT, p);
        if (!f.startsWith(ROT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { svar.writeHead(404); svar.end(); return; }
        svar.writeHead(200, { 'content-type': TEG[path.extname(f)] || 'application/octet-stream', 'cache-control': 'no-store' });
        fs.createReadStream(f).pipe(svar);
      } catch (e) { svar.writeHead(500); svar.end(String(e && e.message)); }
    });
    s.listen(PORT, '127.0.0.1', () => res(s));
  });
}

function leyftSkrif(req, skra) {
  const u = req.url();
  let body = null;
  try { body = JSON.parse(req.postData() || 'null'); } catch (_) { body = null; }
  const radir = Array.isArray(body) ? body : body ? [body] : [];
  if (/\/rest\/v1\/fasteign_greining/.test(u) && req.method() === 'POST') return radir.length >= 1 && radir.every((r) => r && r.tegund === 'eign' && /^eign:\d+/.test(r.lykill));
  if (MED_OCR && /\/rest\/v1\/automation_triggers/.test(u) && req.method() === 'POST' && !skra.ocrSend) {
    const okr = radir.length === 1 && radir[0].workflow === 'bygging-ocr' && radir[0].status === 'bida';
    if (okr) skra.ocrSend = true;
    return okr;
  }
  return false;
}

async function samhengi(b, nafn, vp, skra) {
  const opts = vp === 375 ? Object.assign({}, devices['Pixel 7'], { viewport: { width: 375, height: 812 } }) : { viewport: { width: vp, height: vp === 980 ? 1900 : 950 } };
  const ctx = await b.newContext(opts);
  await ctx.route(/supabase\.co\/(rest|storage|functions)\/v1\//, (route) => {
    const req = route.request();
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method())) return route.fallback();
    const stutt = req.method() + ' ' + req.url().replace(/^.*\/(rest|storage|functions)\/v1\//, '').replace(/\?.*$/, '');
    if (/987654321/.test(req.url() + (req.postData() || ''))) skra.syndNet.push(nafn + ' ' + stutt);
    if (leyftSkrif(req, skra)) { skra.ut.push(nafn + ' ' + stutt); return route.continue(); }
    skra.gripid.push({ nafn, stutt, body: (req.postData() || '').slice(0, 600), t: Date.now() });
    return route.fulfill({ status: 200, contentType: 'application/json', body: /\/storage\//.test(req.url()) ? '{"Key":"x"}' : '[]' });
  });
  await ctx.route(new RegExp('127\\.0\\.0\\.1:' + PORT + '/(\\.netlify/functions|api)/'), async (route) => {
    const req = route.request();
    const u = new URL(req.url());
    const m = /^\/(?:\.netlify\/functions|api)\/([a-z0-9-]+)/.exec(u.pathname);
    if (m && STADBUNDIN[m[1]]) return route.continue();
    if (!['GET', 'HEAD'].includes(req.method())) {
      // les aðeins — samhengið getur lokast meðan svarið er á leiðinni (loftmynd Eignarinnar + 367): þá er beiðnin látin falla
      if (m && m[1] === 'husmynd') { try { return await route.fulfill({ response: await route.fetch({ url: LIFANDI + u.pathname + u.search, timeout: 45000 }) }); } catch (_) { return route.fulfill({ status: 502, contentType: 'application/json', body: '{}' }).catch(() => {}); } }
      skra.gripid.push({ nafn, stutt: req.method() + ' ' + u.pathname, body: (req.postData() || '').slice(0, 300), t: Date.now() });
      return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    }
    try { return route.fulfill({ response: await route.fetch({ url: LIFANDI + u.pathname + u.search, timeout: 45000 }) }); }
    catch (e) { return route.fulfill({ status: 502, contentType: 'application/json', body: JSON.stringify({ error: 'próf: ' + e.message }) }).catch(() => {}); }
  });
  // lifandi TurboPaint aldrei opnað
  await ctx.route(/kjarni\.vercel\.app\/kjarni/, (route) => route.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>TurboPaint (próf)</title>' }));
  return ctx;
}

async function bidaKyrr(page, ms) {
  const t0 = Date.now();
  for (;;) {
    const s = await page.evaluate(() => { const st = window.Greining451 && Greining451.stada(); if (!st || !st.parts) return null; return Object.values(st.parts).filter((x) => x && x.stada === 'saeki').length; }).catch(() => null);
    if (s === 0) return Date.now() - t0;
    if (Date.now() - t0 > ms) return -1;
    await page.waitForTimeout(400);
  }
}

async function profaHus(b, adr, vp, skra) {
  const nafn = vp + ' ' + adr.split(',')[0];
  console.log('\n── ' + nafn + ' ──');
  const ctx = await samhengi(b, nafn, vp, skra);
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push('pageerror: ' + e.message.split('\n')[0]));
  page.on('console', (m) => { if (m.type() === 'error') { const t = m.text(); if (!/Failed to load resource|favicon|net::ERR/.test(t)) errs.push('console: ' + t.slice(0, 200)); } });
  // 451 grípur villur í teikningu spjalds og skrifar console.warn — það er villa í prófinu (spjald sem teiknast ekki)
  page.on('console', (m) => { if (m.type() === 'warning' && /\[451\] teikna /.test(m.text())) errs.push('451-teikning: ' + m.text().slice(0, 200)); });
  // layout-shift: skráð með hnútum, svo hægt sé að telja aðeins tilfærslur INNI í spjöldunum eftir að þau birtust
  await page.addInitScript(() => {
    window.__gls = [];
    const birtT = new WeakMap();   // hvenær hvert spjald fékk birt efni (data-birt)
    // Rammaklukka: tími hvers rAF-ramma. Spjald telst „sýnt“ fyrir færslu ef a.m.k. einn heill rammi var málaður milli
    // birtingar og færslu (fastur ms-þröskuldur dugði ekki: 2480 px krafnatafla tók 51 ms og „50 ms“ taldi hana gamla).
    const rammar = window.__rammar = [];
    (function lykkja() { rammar.push(performance.now()); if (rammar.length > 6000) rammar.splice(0, 3000); requestAnimationFrame(lykkja); })();
    const milliRamma = (R, T) => { let n = 0; for (let i = rammar.length - 1; i >= 0; i--) { const t = rammar[i]; if (t <= R) break; if (t <= T) n++; } return n; };
    window.__kort = []; { const t0 = performance.now(); let sid = ''; const iv = setInterval(() => { const g = document.getElementById('_gr451'); if (g) { const x = [...g.querySelectorAll(':scope > .gr-spjald')].map((k) => (k.dataset.gr || '?') + (k.querySelector('[data-birt]') ? '*' : '') + k.offsetHeight).join(','); if (x !== sid) { window.__kort.push([Math.round(performance.now()), x]); sid = x; } } if (performance.now() - t0 > 30000) clearInterval(iv); }, 40); }
    try { new MutationObserver((ms) => { const t = performance.now(); for (const m of ms) if (m.target.dataset && m.target.dataset.birt && !birtT.has(m.target)) birtT.set(m.target, t); }).observe(document, { subtree: true, attributes: true, attributeFilter: ['data-birt'] }); } catch (_) {}
    try {
      new PerformanceObserver((l) => {
        for (const e of l.getEntries()) {
          if (e.hadRecentInput) continue;
          // inni = BIRT efni spjalds færðist (umgjörð og staðgenglar teljast ekki — plássið er frátekið þar til gögnin koma).
          // Hver uppspretta er flokkuð eftir ástandinu FYRIR rammann: spjald sem var staðgengill og fékk efni í sama ramma
          // telst ekki (athugunin keyrir eftir rammann). Mælt 09.10 á 980 px: öll spjöldin birtust saman á ~11 s og 0,13 taldist
          // „inni“ af því EIN örsmá uppspretta (760×14) lá í eldra spjaldi. Gildinu er því skipt á uppspretturnar í hlutfalli
          // við flatarmál (fyrri + núverandi rammi), eins og áhrifahlutinn í CLS.
          const flatar = (r) => Math.max(0, r.width) * Math.max(0, r.height);
          let alls = 0, inniA = 0, berA = 0;
          const birtFyrir = [];
          for (const s of (e.sources || [])) {
            const n = s.node && s.node.nodeType === 1 ? s.node : s.node && s.node.parentElement;
            const k = n && n.closest && n.closest('.gr-spjald');
            const b = k && k.querySelector('[data-gr-buk][data-birt]');
            const aldur = b ? (birtT.has(b) ? milliRamma(birtT.get(b), e.startTime) : 99) : -1;   // rammar milli birtingar og færslu
            const a = flatar(s.previousRect) + flatar(s.currentRect);
            birtFyrir.push(b ? (birtT.has(b) ? aldur + ' römmum' : 'óskráð') : '-');
            alls += a; if (aldur >= 2) inniA += a;
            // umgjörð (#_gr451, #companies-main …) sem færðist MEÐ birtu efni innanborðs — vafrinn nefnir aðeins efsta hnútinn
            else if (aldur < 0 && n && n.querySelectorAll && [...n.querySelectorAll('[data-gr-buk][data-birt]')].some((x) => !birtT.has(x) || milliRamma(birtT.get(x), e.startTime) >= 2)) berA += a;
          }
          const vInni = alls > 0 ? e.value * inniA / alls : 0, vBer = alls > 0 ? e.value * berA / alls : 0;
          window.__gls.push({ t: e.startTime, v: vInni, vBer, vAlls: e.value, inni: vInni > 0, nodes: (e.sources || []).map((s) => s.node && (s.node.id || s.node.className || s.node.nodeName)).slice(0, 4),
            // hvert færðist hnúturinn (x,y,breidd,hæð) og hve löngu áður spjald hans var birt
            faersla: (e.sources || []).slice(0, 3).map((s) => [s.previousRect, s.currentRect].map((r) => Math.round(r.x) + ',' + Math.round(r.y) + ' w' + Math.round(r.width) + ' h' + Math.round(r.height)).join('>')).join(' | ') + ' · alls ' + e.value.toFixed(4) + ' · birt fyrir ' + birtFyrir.slice(0, 3).join('/') });
        }
      }).observe({ type: 'layout-shift', buffered: true });
    } catch (_) {}
  });
  const t0 = Date.now();
  await page.goto('http://127.0.0.1:' + PORT + '/index.html#greining/' + encodeURIComponent(adr), { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#_gr451', { timeout: 90000 }).catch(() => {});
  const komid = !!(await page.$('#_gr451'));
  check(nafn + ': síðan opnaðist (#greining → sýndarprófíll + spjöld)', komid, 'ekkert #_gr451');
  if (!komid) { await page.screenshot({ path: path.join(OUT, 'villa-' + vp + '-' + slug(adr) + '.png') }); await ctx.close(); return null; }
  const tSidur = Date.now() - t0;
  const kyrr = await bidaKyrr(page, 75000);
  check(nafn + ': allir hlutar kláruðust (enginn „sæki")', kyrr >= 0, 'enn að sækja eftir 75 s');
  await page.waitForTimeout(2500);
  const g = await page.evaluate((SYND) => {
    const G = window.Greining451; const d = G && G.gogn();
    const k = document.getElementById('_gr451');
    const sp = [...k.querySelectorAll('.gr-spjald')].map((s) => ({ l: s.dataset.gr, stada: (s.querySelector('[data-gr-stada]') || {}).textContent, texti: (s.querySelector('[data-gr-buk]') || {}).innerText.slice(0, 300) }));
    const main = document.getElementById('companies-main');
    const se = document.scrollingElement;
    const lar = Math.max(se.scrollWidth - se.clientWidth, main.scrollWidth - main.clientWidth);
    const breidari = [...document.querySelectorAll('#companies-main *')].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.right > window.innerWidth + 1 && getComputedStyle(e).position !== 'fixed'; }).slice(0, 5).map((e) => (e.id || '') + '.' + String(e.className || '').slice(0, 40) + ' ' + Math.round(e.getBoundingClientRect().right));
    const leit = document.querySelector('.co-banner-id .gr-leit .gr-inn');
    return {
      virkt: G.stada().virkt, hash: location.hash, listiHefurSynd: (Companies.list || []).some((c) => +c.id === SYND),
      parts: d && d.parts, eign: d && d.bygg && d.bygg.eign, m2: d && d.bygg && d.bygg.m2, m2_birt: d && d.bygg && d.bygg.m2_birt, rummal: d && d.bygg && d.bygg.rummal_m3,
      haedir: d && d.bygg && d.bygg.haedir, eignir: d && d.bygg && d.bygg.eignir, ar: d && d.bygg && d.bygg.byggingarar, olesin: d && d.bygg && (d.bygg.olesin || []).length,
      heimildir: d && d.bygg && (d.bygg.heimildir || []).length, bv: d && d.bygg && d.bygg.brunavarnir ? Object.keys(d.bygg.brunavarnir.efni || {}).length : 0,
      hja: d && d.hja ? d.hja.listi.map((r) => r.co.id + ':' + r.co.nafn + ':' + r.taeki + ':' + (r.bord && r.bord.haedir ? r.bord.haedir.length : 0)) : null,
      teikn: d && d.teikn ? { bord: (d.teikn.bord || []).length, dr: d.teikn.dr ? d.teikn.dr.length : null, grunn: (d.teikn.grunn || []).length, anBords: (d.teikn.anBords || []).map((c) => c.id) } : null,
      tegund: d && d.tegund, aaetlun: d && d.aaetlun ? d.aaetlun.alls : null, opin: d && d.opin ? { lod: d.opin.lod, ein: d.opin.einingar, rek: ((d.opin.rekstur && d.opin.rekstur.listi) || []).filter((x) => x.nafn && x.osm_tag && x.osm_tag.k !== 'building').map((x) => x.nafn), villur: d.opin.villur } : null,
      rekstur: d && d.rekstur ? d.rekstur.felog.map((f) => f.nafn + (f.skra ? ' [' + (f.skra.isat || []).join(',') + ']' : ' (engin skrá: ' + f.villa + ')')) : null,
      spjold: sp, lar, breidari, leitGildi: leit && leit.value, nafnBorda: (document.querySelector('#companies-main .co-banner-name') || {}).textContent,
      synilegirSkrifTakkar: [...document.querySelectorAll('#companies-main [data-co-id] button, #companies-main .co-banner-right textarea, #companies-main #_co-endurnyja')].filter((e) => e.getBoundingClientRect().width > 0).length,
      gls: window.__gls || [],
      kort: window.__kort || [],
      rammar: (window.__rammar || []).length,
      gripidVordur: (window.Sydarvordur && Sydarvordur.gripid.length) || 0,
      adrir: (window.Sydarvordur && Sydarvordur.adrir.slice()) || [],
    };
  }, SYND);
  console.log('   síða: ' + tSidur + ' ms · kyrr eftir ' + kyrr + ' ms · eign ' + JSON.stringify(g.eign && { l: g.eign.label, landnr: g.eign.landnr, svf: g.eign.svf }));
  console.log('   bygg: m2=' + g.m2 + ' birt=' + g.m2_birt + ' rúmm=' + g.rummal + ' hæðir=' + JSON.stringify(g.haedir && { o: g.haedir.ofanjardar, k: g.haedir.kjallari, n: (g.haedir.listi || []).length }) + ' eignir=' + g.eignir + ' ár=' + g.ar + ' skjöl=' + g.heimildir + ' ólesin=' + g.olesin + ' brunavarnir=' + g.bv);
  console.log('   hjá okkur: ' + JSON.stringify(g.hja) + ' · teikn: ' + JSON.stringify(g.teikn) + ' · tegund: ' + JSON.stringify(g.tegund && { t: g.tegund.tegund, rok: g.tegund.rok }) + ' · ≈ tæki ' + g.aaetlun);
  console.log('   opin: ' + JSON.stringify(g.opin) + ' · rekstur: ' + JSON.stringify(g.rekstur));
  g.spjold.forEach((s) => console.log('   [' + s.l + '] ' + String(s.stada || '').trim() + ' | ' + String(s.texti || '').replace(/\s+/g, ' ').slice(0, 160)));
  check(nafn + ': sýndarprófíll virkur, slóð #greining/…', g.virkt && /^#greining\//.test(g.hash), g.hash);
  check(nafn + ': heimilisfangið í hausreitnum', g.leitGildi === adr, g.leitGildi);
  check(nafn + ': engir skrif-takkar sjáanlegir á sýndarprófílnum', g.synilegirSkrifTakkar === 0, g.synilegirSkrifTakkar);
  check(nafn + ': engin lárétt skrun', g.lar <= 1, g.lar + ' px · ' + JSON.stringify(g.breidari));
  const villuhlutar = Object.entries(g.parts || {}).filter(([, v]) => v && v.stada === 'villa').map(([k, v]) => k + ': ' + v.villa);
  if (villuhlutar.length) console.log('   hlutar með villu (sýnd á síðunni sem villa, ekki tómt): ' + JSON.stringify(villuhlutar));
  // layout-shift inni í spjöldunum eftir að síðan varð kyrr
  check(nafn + ': mælingin gild — rAF gengur (' + g.rammar + ' rammar)', g.rammar > 60, 'rAF stöðvað: layout-shift-flokkunin væri falskt grænt');
  const innri = g.gls.filter((x) => x.inni);
  const cls = innri.reduce((s, x) => s + x.v, 0);
  console.log('   layout-shift inni í spjöldum: ' + innri.length + ' tilvik, samtals ' + cls.toFixed(4) + ' ' + JSON.stringify(innri.map((x) => [Math.round(x.t), +x.v.toFixed(4), x.nodes.join('/').slice(0, 80)])));
  const ber = g.gls.reduce((s, x) => s + (x.vBer || 0), 0);
  console.log('   layout-shift umgjörð sem bar birt spjöld (borðinn/síðan fyrir ofan stækkaði): ' + ber.toFixed(4) + ' ' + JSON.stringify(g.gls.filter((x) => x.vBer > 0.0005).map((x) => [Math.round(x.t), +x.vBer.toFixed(4), x.nodes.join('/').slice(0, 60)])));
  g.gls.filter((x) => x.v >= 0.005 || x.vBer >= 0.005).forEach((x) => { console.log('     færsla ' + Math.round(x.t) + ' ms: ' + x.faersla); g.kort.filter((k) => Math.abs(k[0] - x.t) < 400).forEach((k) => console.log('       spjöld ' + k[0] + ' ms: ' + k[1])); });

  // ── smellir (skrif-vörður): tegund, ljóskassi, forskoðun, 363-hlekkur, vinnumynd, „Setja í Teikningu"-takki sýnilegur ──
  const fyrir = skra.gripid.length, fyrirUt = skra.ut.length;
  const glsFyrir = (await page.evaluate(() => (window.__gls || []).length));
  const SEL = '#_gr451 select[data-gr-a="tegund"]';
  if (await page.$(SEL)) {
    const opts = await page.$$eval(SEL + ' option', (o) => o.map((x) => x.value));
    const upph = await page.$eval(SEL, (s) => s.value);
    await page.selectOption(SEL, opts[Math.min(3, opts.length - 1)]); await page.waitForTimeout(500);
    const breytt = await page.evaluate(() => { const g = window.Greining451.gogn(); return g && g.tegund ? g.tegund.tegund : null; });
    check(nafn + ': handval tegundar breytir kröfutöflunni (aðeins útlit)', breytt === opts[Math.min(3, opts.length - 1)], breytt);
    await page.selectOption(SEL, upph); await page.waitForTimeout(300);
  }
  // ── Teikningar: forskoðun (smámyndir latt, heiti hæða, stór mynd með örvum) ──
  // Fyrst: hve margar PDF-forskoðanir byrjuðu ÁÐUR en spjaldið sást (latt = aðeins þær sem sjást, + biðröð 2)
  const fskFyrir = await page.evaluate(() => {
    const k = document.querySelector('#_gr451 [data-gr="teikn"]'); const vh = innerHeight;
    const iSjonmali = (e, m) => { if (e.closest('details:not([open])')) return false; const r = e.getBoundingClientRect(); if (!r.width) return false; let t = Math.max(-m, r.top), b = Math.min(innerHeight + m, r.bottom); for (let a = e.parentElement; a && a !== document.documentElement; a = a.parentElement) { if (/(auto|scroll|hidden|clip)/.test(getComputedStyle(a).overflowY)) { const q = a.getBoundingClientRect(); t = Math.max(t, q.top - m); b = Math.min(b, q.bottom + m); } } return b - t > 4; };   // skrunílát klippa og lokað <details> felur (IntersectionObserver sér hvort tveggja; rect lokaðs details-efnis lýgur)
    const synileg = k ? [...k.querySelectorAll('[data-gr-fskm][data-pdf]')].filter((e) => iSjonmali(e, 250)).length : 0;
    // latt = enginn PDF-reitur Teikningar-spjaldsins utan sjónmáls hefur farið af stað (data-fsk-byrjad setur 451 við ræsingu)
    const utanByrjad = k ? [...k.querySelectorAll('[data-gr-fskm][data-pdf][data-fsk-byrjad]')].filter((e) => !iSjonmali(e, 400)).length : 0;
    return { f: window.Greining451 && Greining451.forsk ? Greining451.forsk() : { byrjad: 0, mest: 0 }, synileg, utanByrjad };
  });
  const fsk = await page.evaluate(async () => {
    const k = document.querySelector('#_gr451 [data-gr="teikn"]'); if (!k || !window.Greining451.forsk) return null;
    k.scrollIntoView({ block: 'start' });
    const t0 = Date.now();
    // bíða: PDF-biðröðin tóm OG hver sýnileg smámynd búin að hlaðast (smámyndir skjalasafnsins koma frá FotoWeb, ekki biðröðinni)
    const vh = innerHeight;
    const iSjonmali = (e, m) => { if (e.closest('details:not([open])')) return false; const r = e.getBoundingClientRect(); if (!r.width) return false; let t = Math.max(-m, r.top), b = Math.min(innerHeight + m, r.bottom); for (let a = e.parentElement; a && a !== document.documentElement; a = a.parentElement) { if (/(auto|scroll|hidden|clip)/.test(getComputedStyle(a).overflowY)) { const q = a.getBoundingClientRect(); t = Math.max(t, q.top - m); b = Math.min(b, q.bottom + m); } } return b - t > 4; };   // skrunílát klippa (IntersectionObserver sér það líka)
    const synilegir = () => [...k.querySelectorAll('[data-gr-fskm], .gr-skurdur, .gr-3d-flis')].filter((e) => iSjonmali(e, 0));
    const buin = (e) => { const im = e.querySelector(':scope > img'); return !!(im && im.complete && im.naturalWidth > 0); };
    for (;;) {
      await new Promise((r) => setTimeout(r, 400));
      const f = Greining451.forsk();
      if ((f.virk === 0 && f.bid === 0 && Date.now() - t0 > 1500 && synilegir().every(buin)) || Date.now() - t0 > 45000) break;
    }
    await new Promise((r) => setTimeout(r, 500));
    const reitir = synilegir();
    const hladnar = reitir.filter(buin).length;
    return {
      f: Greining451.forsk(), synilegir: reitir.length, hladnar,
      vaentir: (() => { const t = (Greining451.gogn() || {}).teikn; return !!(t && ((t.dr && t.dr.length) || (t.bord && t.bord.length))); })(),
      heiti: [...k.querySelectorAll('.gr-fsk-heiti, .gr-haed-haus')].map((x) => (x.firstChild ? x.firstChild.textContent : x.textContent).trim()).slice(0, 16),
      pdfReitir: [...k.querySelectorAll('*')].filter((e) => !e.children.length && /^(PDF|TEIKNING)$/.test(e.textContent.trim())).length,
      smelltu: k.querySelectorAll('.gr-pdf-bida').length,
      teljari: ([...document.querySelectorAll('#_gr451 [data-gr="samantekt"] .gr-punktar li')].map((x) => x.textContent).find((x) => /^Teikningar/.test(x)) || '').replace(/^Teikningar/, ''),
    };
  });
  if (fsk) {
    console.log('   teikningar: ' + JSON.stringify({ heiti: fsk.heiti, synilegir: fsk.synilegir, hladnar: fsk.hladnar, forsk: fsk.f }) + ' · samantekt: ' + fsk.teljari);
    check(nafn + ': Teikningar — engir „PDF“-reitir og ekkert „smelltu til að birta“', fsk.pdfReitir === 0 && fsk.smelltu === 0, fsk.pdfReitir + ' / ' + fsk.smelltu);
    if (fsk.synilegir) check(nafn + ': forskoðun hlaðin á sýnilegum blöðum (' + fsk.hladnar + '/' + fsk.synilegir + ')', fsk.hladnar >= Math.ceil(fsk.synilegir * 0.8), fsk.hladnar + '/' + fsk.synilegir + ' ' + JSON.stringify(fsk.f));
    check(nafn + ': PDF-forskoðun latt og mest 2 í einu (hámark ' + fsk.f.mest + '; ' + fskFyrir.utanByrjad + ' reitir utan sjónmáls farnir af stað áður en spjaldið sást)', fsk.f.mest <= 2 && fskFyrir.utanByrjad === 0, JSON.stringify(fskFyrir));
    if (fsk.vaentir) check(nafn + ': Teikningar-spjaldið sýnir blöð (' + fsk.heiti.length + ' heiti)', fsk.heiti.length > 0, 'ekkert heiti — spjaldið teiknaðist ekki');
    if (fsk.heiti.length) check(nafn + ': hæðir og blöð bera heiti (Kjallari / N. hæð / …)', fsk.heiti.some((h) => /hæð|Kjallari|Grunnmynd|Þak|Ris|Milligólf|Designer-3D/.test(h)), JSON.stringify(fsk.heiti));
    if (fsk.vaentir) check(nafn + ': Samantekt telur hæðir í teikningum', /hæð|grunnmynd|engar fundust|engin gildandi/.test(fsk.teljari), fsk.teljari);
    // „Eldri útgáfur“: lokað þar til smellt er — þá fyrst hlaðast smámyndirnar (latt)
    const eldri = await page.$('#_gr451 [data-gr="teikn"] details.gr-eldri > summary');
    if (eldri) {
      const fyrir = await page.evaluate(() => { const d = document.querySelector('#_gr451 [data-gr="teikn"] details.gr-eldri'); return [...d.querySelectorAll('[data-gr-fskm] > img')].filter((i) => i.complete && i.naturalWidth > 0).length; });
      await eldri.scrollIntoViewIfNeeded().catch(() => {}); await eldri.click().catch(() => {});
      await page.waitForFunction(() => { const d = document.querySelector('#_gr451 [data-gr="teikn"] details.gr-eldri'); const im = [...d.querySelectorAll('[data-gr-fskm] > img')]; return im.length && im.every((i) => i.complete); }, null, { timeout: 30000 }).catch(() => {});
      const eftir = await page.evaluate(() => { const d = document.querySelector('#_gr451 [data-gr="teikn"] details.gr-eldri'); return { opin: d.open, myndir: [...d.querySelectorAll('[data-gr-fskm] > img')].filter((i) => i.naturalWidth > 0).length, flisar: d.querySelectorAll('[data-gr-fskm]').length }; });
      check(nafn + ': „Eldri útgáfur“ hleðst fyrst við smell (' + fyrir + ' myndir fyrir, ' + eftir.myndir + '/' + eftir.flisar + ' eftir)', fyrir === 0 && eftir.opin && eftir.myndir > 0, JSON.stringify({ fyrir, eftir }));
      await eldri.click().catch(() => {});
    }
    if (FSK_UT) { const el = await page.$('#_gr451 [data-gr="teikn"]'); if (el && vp !== 1600) { await el.evaluate((k) => k.scrollIntoView({ block: 'start' })); await page.waitForTimeout(400); await page.screenshot({ path: path.join(FSK_UT, vp + '-' + slug(adr) + '-teikningar.png') }).catch(() => {}); } else if (el) await el.screenshot({ path: path.join(FSK_UT, vp + '-' + slug(adr) + '-teikningar.png') }).catch((e) => console.log('   (skjámynd teikninga brást: ' + e.message.split('\n')[0] + ')')); }
  }
  // ── Myndrænt (Agnar 09.10.2026: „ekki bara textar") — forsíðumynd, ræma, tákn kerfa, Aðrar teikningar, Sjá allar,
  //    tveir hlutar Teikningar-spjaldsins, Rekstur (okkar skrá fyrst, Já.is-hnappur, OSM merkt úrelt), skemmd blöð
  {
    const m = await page.evaluate(async () => {
      const bida = (ms) => new Promise((r) => setTimeout(r, ms));
      const k = document.getElementById('_gr451'); const g = window.Greining451.gogn() || {};
      const t = g.teikn || {}; const vidsk = !!(g.hja && g.hja.listi && g.hja.listi.length);
      const sam = k.querySelector('[data-gr="samantekt"]');
      sam.scrollIntoView({ block: 'start' }); await bida(1500);
      const hero = sam.querySelector('.gr-hero');
      const heroImg = hero && hero.querySelector('img');
      const ut = {
        vidsk, dr: !!t.dr, bord: (t.bord || []).length,
        hero: hero ? { h: Math.round(hero.getBoundingClientRect().height), mynd: !!(heroImg && heroImg.complete && heroImg.naturalWidth > 0), tom: hero.classList.contains('gr-hero-tom') } : null,
        raema: sam.querySelectorAll('.gr-raema .gr-fsk').length,
        kerfi: sam.querySelectorAll('.gr-kerfi .gr-kt').length, kerfiTakn: sam.querySelectorAll('.gr-kerfi img.gr-takn').length, kerfiTexti: (sam.querySelector('.gr-kerfi') || {}).textContent || '',
        hlutar: [...k.querySelectorAll('[data-gr="teikn"] .gr-hluti-haus span')].map((x) => x.textContent),
        adrar: [...k.querySelectorAll('[data-gr="teikn"] .gr-adrar .gr-fsk-heiti')].map((x) => x.textContent),
        rekstur: [...k.querySelectorAll('[data-gr="rekstur"] .ssp-skilti')].map((x) => x.textContent.slice(0, 40)),
        ja: !!k.querySelector('[data-gr="rekstur"] a[href^="https://ja.is/?q="]'),
        osmVarud: /getur verið úrelt/.test((k.querySelector('[data-gr="rekstur"]') || {}).textContent || ''),
        osm: !!(g.opin && g.opin.rekstur), osmBid: !!(g.opin && g.opin.reksturBid),
        skjalBygg: !!k.querySelector('[data-gr="bygg"] .gr-skjal-fl .gr-fsk'), takaBygg: !!(g.bygg && g.bygg.skraningartafla),
        haus: !!document.querySelector('#companies-main .co-banner-id .gr-haus-mynd'),
        hausMynd: !!document.querySelector('#companies-main .co-banner-id .gr-haus-mynd img'),
        monoFalid: (() => { const mo = document.querySelector('#companies-main .co-banner-id > .co-banner-mono'); return !mo || getComputedStyle(mo).display === 'none'; })(),
        skemmdT: t.skemmd || 0,
      };
      const d = k.querySelector('[data-gr="teikn"] details.gr-allar');
      if (d) {
        const fyrir = [...d.querySelectorAll('[data-gr-fskm] > img')].filter((i) => i.complete && i.naturalWidth > 0).length;
        d.open = true; d.scrollIntoView({ block: 'start' });
        const t0 = Date.now();
        while (Date.now() - t0 < 20000) { await bida(500); const v = window.Greining451.forsk(); const syn = [...d.querySelectorAll('[data-gr-fskm]')].filter((e) => { const r = e.getBoundingClientRect(); return r.width && r.top < innerHeight && r.bottom > 0; }); if (v.virk === 0 && v.bid === 0 && syn.every((e) => { const im = e.querySelector(':scope > img'); return (im && im.complete) || /Skemmt|Engin/.test(e.textContent); })) break; }
        ut.allar = { fyrir, hopar: [...d.querySelectorAll('.gr-allar-haus')].map((x) => x.textContent), myndir: [...d.querySelectorAll('[data-gr-fskm] > img')].filter((i) => i.complete && i.naturalWidth > 0).length, skemmt: d.querySelectorAll('.gr-fsk-skemmt').length, fj: d.querySelectorAll('.gr-fsk').length };
      }
      return ut;
    });
    console.log('   myndrænt: ' + JSON.stringify(m).slice(0, 900));
    if (m.hero) check(nafn + ': Samantekt — forsíðumynd í föstum kassa (' + m.hero.h + ' px' + (m.hero.mynd ? ', mynd hlaðin' : m.hero.tom ? ', engin mynd tiltæk' : '') + ')', m.hero.h >= 180 && (m.hero.mynd || m.hero.tom), JSON.stringify(m.hero));
    else check(nafn + ': Samantekt — forsíðumynd', false, 'enginn .gr-hero');
    if (m.dr || m.bord) check(nafn + ': Samantekt — ræma með teikningum (' + m.raema + ')', m.raema > 0, String(m.raema));
    check(nafn + ': Samantekt — tákn kerfa með stöðu (' + m.kerfi + ' kerfi, ' + m.kerfiTakn + ' tákn úr TeiknTakn)', m.kerfi > 0 ? m.kerfiTakn > 0 : /tegund|Engin skyld/.test(m.kerfiTexti), m.kerfiTexti.slice(0, 80));
    check(nafn + ': Teikningar — ' + (m.vidsk ? 'tveir hlutar (Í notkun hjá okkur · Úr skjalasafni)' : 'aðeins „Úr skjalasafni“ (ekki viðskiptavinur)'), m.vidsk ? (m.hlutar[0] === 'Í notkun hjá okkur' && m.hlutar.includes('Úr skjalasafni')) : (m.hlutar.length === 1 && m.hlutar[0] === 'Úr skjalasafni'), JSON.stringify(m.hlutar));
    if (m.dr) check(nafn + ': „Aðrar teikningar“ — 1–5 valin blöð (' + m.adrar.join(', ') + ')', m.adrar.length >= 1 && m.adrar.length <= 5, JSON.stringify(m.adrar));
    if (m.allar) {
      check(nafn + ': „Sjá allar“ — ekkert hlaðið lokað, flokkað með haus og fjölda (' + m.allar.hopar.length + ' flokkar, ' + m.allar.fj + ' blöð)', m.allar.fyrir === 0 && m.allar.hopar.length > 0 && m.allar.hopar.every((h) => /\d/.test(h)), JSON.stringify({ fyrir: m.allar.fyrir, hopar: m.allar.hopar }));
      check(nafn + ': „Sjá allar“ opnað — smámyndir hlaðast (' + m.allar.myndir + ' hlaðnar' + (m.allar.skemmt ? ', ' + m.allar.skemmt + ' skemmd' : '') + ')', m.allar.myndir > 0, JSON.stringify(m.allar));
      if (m.skemmdT) check(nafn + ': skemmd blöð sýnd sem skemmd (' + m.allar.skemmt + '/' + m.skemmdT + ')', m.allar.skemmt === m.skemmdT, JSON.stringify(m.allar));
      if (SER_UT) { const el = await page.$('#_gr451 [data-gr="teikn"] details.gr-allar'); if (el) await el.screenshot({ path: path.join(SER_UT, vp + '-' + slug(adr) + '-sja-allar.png') }).catch(() => {}); }
      await page.evaluate(() => { const d = document.querySelector('#_gr451 [data-gr="teikn"] details.gr-allar'); if (d) d.open = false; });
    }
    if (m.takaBygg) check(nafn + ': Byggingarupplýsingar — skráningartaflan sjálf við tölurnar', m.skjalBygg, String(m.skjalBygg));
    check(nafn + ': Rekstur — Já.is-hnappur (ekkert sótt sjálfvirkt)', m.ja, String(m.ja));
    if (m.vidsk) check(nafn + ': Rekstur — okkar félög á heimilisfanginu fyrst', /^Hjá okkur á heimilisfanginu/.test(m.rekstur[0] || ''), JSON.stringify(m.rekstur));
    if (m.osm) check(nafn + ': Rekstur — OpenStreetMap merkt „getur verið úrelt“ og aftast', m.osmVarud && /OpenStreetMap/.test(m.rekstur[m.rekstur.length - 1] || ''), JSON.stringify(m.rekstur));
    check(nafn + ': haus — mynd af húsinu í stað upphafsstafanna (sama pláss)', m.haus && m.monoFalid, JSON.stringify({ haus: m.haus, mynd: m.hausMynd, monoFalid: m.monoFalid }));
    if (SER_UT) {
      for (const [lyk, heiti] of [['samantekt', 'samantekt'], ['teikn', 'teikningar'], ['rekstur', 'rekstur'], ['bygg', 'byggingar'], ['krofur', 'krofur']]) {
        const el = await page.$('#_gr451 [data-gr="' + lyk + '"]');
        if (!el) continue;
        if (vp === 1600) await el.screenshot({ path: path.join(SER_UT, vp + '-' + slug(adr) + '-' + heiti + '.png') }).catch(() => {});
        else if (lyk === 'samantekt' || lyk === 'teikn') { await el.evaluate((x) => x.scrollIntoView({ block: 'start' })); await page.waitForTimeout(500); await page.screenshot({ path: path.join(SER_UT, vp + '-' + slug(adr) + '-' + heiti + '.png') }).catch(() => {}); }
      }
    }
  }
  const mynd = (await page.$('#_gr451 [data-gr="teikn"] [data-gr-a="fsk"]')) || (await page.$('#_gr451 [data-gr-ljos]'));
  if (mynd) {
    await mynd.scrollIntoViewIfNeeded().catch(() => {});
    await mynd.click().catch(() => {});
    await page.waitForTimeout(1500);
    const ljos = await page.$('#gr-ljos');
    check(nafn + ': smellur á teikningu opnar stóra mynd', !!ljos, 'ekkert #gr-ljos');
    if (ljos) {
      const lesa = () => page.evaluate(() => ({ t: (document.querySelector('#gr-ljos .gr-ltitill') || {}).textContent || '', n: (document.querySelector('#gr-ljos .gr-lteljari') || {}).textContent || '' }));
      const a = await lesa();
      await page.waitForFunction(() => { const im = document.querySelector('#gr-ljos .gr-lb img'); return im && !im.hidden && im.naturalWidth > 0; }, null, { timeout: 40000 }).catch(() => {});
      const synd = await page.evaluate(() => { const im = document.querySelector('#gr-ljos .gr-lb img'); return !!(im && !im.hidden && im.naturalWidth > 0); });
      check(nafn + ': stóra myndin birtist („' + a.t + '“)', synd, 'myndin hlóðst ekki á 40 s');
      if (FSK_UT && vp !== 980) await page.screenshot({ path: path.join(FSK_UT, vp + '-' + slug(adr) + '-stor-mynd.png') }).catch(() => {});
      if (/^\d+\s*\/\s*\d+$/.test(a.n) && !/^1\s*\/\s*1$/.test(a.n)) {
        await page.keyboard.press('ArrowRight'); await page.waitForTimeout(700);
        const b = await lesa();
        check(nafn + ': ör (→) flettir í næstu teikningu (' + a.n + ' „' + a.t + '“ → ' + b.n + ' „' + b.t + '“)', /^2\s*\//.test(b.n), JSON.stringify([a, b]));
        await page.click('#gr-ljos .gr-lor.v').catch(() => {}); await page.waitForTimeout(500);
        const c = await lesa();
        check(nafn + ': vinstri ör (takki) fer til baka', /^1\s*\//.test(c.n), JSON.stringify(c));
      }
      if (vp === 1600) await page.screenshot({ path: path.join(OUT, vp + '-' + slug(adr) + '-stokkun.png') }).catch(() => {});
      await page.keyboard.press('Escape'); await page.waitForTimeout(400);
      check(nafn + ': Esc lokar stóru myndinni', !(await page.$('#gr-ljos')), 'enn opin');
    }
    await page.waitForTimeout(300);
  }
  // „Skoða í TurboPaint" (kjarni PR #181): lítið tákn á smámyndum „Úr skjalasafni", takki í stóra skoðaranum — aldrei við
  // hæðir „Í notkun hjá okkur"; slóðin ber frumslóð blaðsins (pdf.info/tif.info/bein PDF) og titil; opnast í nýjum flipa
  {
    const TPR = /^https:\/\/kjarni\.vercel\.app\/kjarni\/turbopaint\?skoda=[^&]+&titill=/;
    const tp = await page.evaluate(() => {
      const k = document.querySelector('#_gr451 [data-gr="teikn"]'); if (!k) return null;
      const allir = [...k.querySelectorAll('.gr-fsk-tp[data-tp]')].map((x) => x.getAttribute('data-tp'));
      return { allir, iNotkun: k.querySelectorAll('.gr-haed .gr-fsk-tp, .gr-tp .gr-fsk-tp').length, utanTeikn: document.querySelectorAll('#_gr451 [data-gr]:not([data-gr="teikn"]) .gr-fsk-tp').length };
    });
    if (tp && tp.allir.length) {
      const skoda = (() => { try { return new URL(tp.allir[0]).searchParams.get('skoda') || ''; } catch (_) { return ''; } })();
      check(nafn + ': „Skoða í TurboPaint“ á smámyndum skjalasafnsins (' + tp.allir.length + ') — sniðmát kjarna, frumslóð blaðsins', tp.allir.every((u) => TPR.test(u)) && /^https?:\/\/.+\.(pdf|tif)(\.info)?$|^https?:\/\/.+\.pdf/i.test(skoda), tp.allir[0] + ' · skoda=' + skoda);
      check(nafn + ': ekkert TurboPaint-tákn við hæðir „Í notkun hjá okkur“ né utan Teikninga', tp.iNotkun === 0 && tp.utanTeikn === 0, JSON.stringify({ iNotkun: tp.iNotkun, utanTeikn: tp.utanTeikn }));
      // stóri skoðarinn: takkinn sést með sömu slóð; smellur á litla táknið opnar nýjan flipa (próf-stubbur, ekkert lifandi)
      const fl = await page.$('#_gr451 [data-gr="teikn"] .gr-fsk:has(.gr-fsk-tp)');
      if (fl) {
        await fl.scrollIntoViewIfNeeded().catch(() => {});
        await fl.click({ position: { x: 20, y: 20 } }).catch(() => {}); await page.waitForTimeout(800);
        const lt = await page.evaluate(() => { const a = document.querySelector('#gr-ljos [data-gr-ltp]'); return a ? { synd: !a.hidden && a.offsetWidth > 0, href: a.getAttribute('href') || '', target: a.getAttribute('target') } : null; });
        check(nafn + ': stóri skoðarinn — „Skoða í TurboPaint“ sést og opnar nýjan flipa', !!(lt && lt.synd && TPR.test(lt.href) && lt.target === '_blank'), JSON.stringify(lt));
        await page.keyboard.press('Escape'); await page.waitForTimeout(300);
        const takn = await fl.$('.gr-fsk-tp');
        if (takn) {
          const [nyr] = await Promise.all([ctx.waitForEvent('page', { timeout: 6000 }).catch(() => null), takn.click().catch(() => {})]);
          check(nafn + ': smellur á TurboPaint-táknið opnar kjarna í nýjum flipa (stóri skoðarinn opnast ekki)', !!(nyr && /kjarni\.vercel\.app\/kjarni\/turbopaint\?skoda=/.test(nyr.url())) && !(await page.$('#gr-ljos')), nyr ? nyr.url().slice(0, 140) : 'enginn flipi');
          if (nyr) await nyr.close().catch(() => {});
          if (await page.$('#gr-ljos')) { await page.keyboard.press('Escape'); await page.waitForTimeout(300); }
        }
      }
      // hæð „Í notkun hjá okkur" í stóra skoðaranum: enginn TurboPaint-takki
      const hd = await page.$('#_gr451 [data-gr="teikn"] .gr-haed [data-gr-a="fsk"]');
      if (hd) {
        await hd.scrollIntoViewIfNeeded().catch(() => {}); await hd.click().catch(() => {}); await page.waitForTimeout(800);
        const lt = await page.evaluate(() => { const a = document.querySelector('#gr-ljos [data-gr-ltp]'); return a ? { hidden: a.hidden } : null; });
        check(nafn + ': hæð „Í notkun hjá okkur“ í stóra skoðaranum — enginn TurboPaint-takki', !!(lt && lt.hidden), JSON.stringify(lt));
        await page.keyboard.press('Escape'); await page.waitForTimeout(300);
      }
    }
  }
  const vm = await page.$('#_gr451 [data-gr-a="vm"]');
  if (vm) { await vm.click().catch(() => {}); await page.waitForTimeout(500); }
  const lnk = await page.$('#companies-main.gr-sydar ._bupp-teikn');
  if (lnk && vp === 1600) {
    await lnk.click().catch(() => {});
    await page.waitForTimeout(2500);
    const tfs = await page.$('#tfs');
    const tp = await page.evaluate(() => { const b = [...document.querySelectorAll('#tfs button,#tfs a')].find((x) => /TurboPaint/.test(x.textContent || '')); return b ? (b.getAttribute('href') || b.getAttribute('data-href') || 'takki') : null; });
    check(nafn + ': 363-teikningahlekkur opnar forskoðun án félags (engin uttekt=-987654321)', !!tfs, 'enginn #tfs');
    if (tfs) await page.keyboard.press('Escape').catch(() => {});
    await page.waitForTimeout(400);
    void tp;
  }
  // skrif-vörðurinn sjálfur: bein skrif á sýndarfyrirtækið eiga að stöðvast ÁÐUR en þau fara á netið
  const vordur = await page.evaluate(async (SYND) => {
    const r1 = await DB.sb.from('fyrirtaeki').update({ banner_note: 'próf' }).eq('id', SYND).select('id');
    const r2 = await DB.sb.from('uttaeki').insert({ fyrirtaeki_id: SYND, serial: 'PROF', type: 'Léttvatn' }).select('id');
    let r3 = null; try { r3 = await fetch('/api/husmynd-x', { method: 'POST', body: JSON.stringify({ co: SYND }) }).then((r) => r.status); } catch (e) { r3 = 'villa'; }
    try { if (Companies.saveBannerNote) await Companies.saveBannerNote(SYND, 'próf'); } catch (_) {}
    return { r1: r1.error && r1.error.code, r2: r2.error && r2.error.code, r3, gripid: Sydarvordur.gripid.length };
  }, SYND);
  check(nafn + ': sýndarvörðurinn stöðvar bein skrif (update/insert/fetch) á -987654321', vordur.r1 === 'SYNDARVORDUR' && vordur.r2 === 'SYNDARVORDUR' && vordur.r3 === 403, JSON.stringify(vordur));
  // 30 s kyrrstaða
  await page.waitForTimeout(30000);
  const eftir = skra.gripid.slice(fyrir).filter((x) => x.nafn === nafn);
  const adrir = await page.evaluate(() => (window.Sydarvordur && Sydarvordur.adrir.slice()) || []);
  check(nafn + ': 0 skrif á þjóninn frá sýndarprófílnum (smellir + 30 s kyrrstaða)', eftir.length === 0, JSON.stringify(eftir.map((x) => x.stutt + ' ' + x.body.slice(0, 120))));
  check(nafn + ': engin beiðni með -987654321 náði netinu', !skra.syndNet.some((x) => x.startsWith(nafn)), JSON.stringify(skra.syndNet));
  console.log('   leyfð skrif síðunnar sjálfrar: ' + JSON.stringify(skra.ut.slice(fyrirUt).filter((x) => x.startsWith(nafn))) + ' · önnur skrif skráð af verðinum meðan sýndarprófíllinn var opinn: ' + JSON.stringify(adrir.map((a) => a.adferd + ' ' + a.slod)));
  const glsEftir = await page.evaluate((n) => (window.__gls || []).slice(n), glsFyrir);
  const glsInni = glsEftir.filter((x) => x.inni).reduce((s, x) => s + x.v, 0);
  console.log('   layout-shift inni í spjöldum við smelli/kyrrstöðu: ' + glsInni.toFixed(4) + ' ' + JSON.stringify(glsEftir.filter((x) => x.inni).map((x) => [Math.round(x.t), +x.v.toFixed(4), x.nodes.join('/').slice(0, 80)])));
  check(nafn + ': engar console-villur', errs.length === 0, JSON.stringify(errs.slice(0, 6)));

  // skjámynd af allri síðunni (#companies-main skrunar sjálft — opnað tímabundið fyrir myndina)
  const haed = await page.evaluate(() => { const m = document.getElementById('companies-main'); m.scrollTop = 0; window.scrollTo(0, 0); document.querySelectorAll('#_gr451 details[open]').forEach((d) => { d.open = false; }); return Math.ceil(m.getBoundingClientRect().top + m.scrollHeight + 40); });
  await page.setViewportSize({ width: vp, height: Math.min(16000, Math.max(haed, 900)) });
  await page.waitForTimeout(900);
  await page.screenshot({ path: path.join(OUT, vp + '-' + slug(adr) + '.png'), timeout: 90000 }).catch((e) => console.log('   (skjámynd mistókst: ' + e.message.slice(0, 80) + ')'));
  await ctx.close();
  return { nafn, g, cls, errs, eftir: eftir.length };
}
const slug = (s) => String(s).split(',')[0].normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ð/g, 'd').replace(/þ/g, 'th').replace(/æ/g, 'ae').replace(/ö/g, 'o').replace(/[^A-Za-z0-9]+/g, '-').toLowerCase();

(async () => {
  const srv = await thjonn();
  const b = await chromium.launch({ headless: true });
  const skra = { ut: [], gripid: [], syndNet: [] };
  const nidur = [];
  const breiddir = (process.argv.includes('--bara-auka') || process.argv.includes('--bara-faera')) ? [] : BARA ? [+BARA] : [1600, 980, 375];
  for (const vp of breiddir) {
    const husin = [...new Set(vp === 1600 ? HUS : HUS.slice(0, 3).concat(HUS.filter((h) => /Skútuvogur 2|Nónhæð 6/.test(h))))];
    for (const adr of husin) {
      try { nidur.push(await profaHus(b, adr, vp, skra)); } catch (e) { check(vp + ' ' + adr + ': prófið keyrði', false, e.message); }
    }
  }
  const AUKA = !process.argv.includes('--engin-auka') && !process.argv.includes('--bara-faera');
  // Sala → hlekkur → #greining
  if (AUKA) {
    console.log('\n── Sala-hlekkurinn ──');
    const ctx = await samhengi(b, 'sala', 1600, skra);
    const page = await ctx.newPage();
    await page.goto('http://127.0.0.1:' + PORT + '/index.html#sala', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#view-sala a.gr-sala-hl', { timeout: 60000 }).catch(() => {});
    const a = await page.$('#view-sala a.gr-sala-hl');
    check('Sala: hlekkurinn „Greining fasteignar" er á söluborðinu', !!a, 'fannst ekki');
    if (a) {
      await a.click();
      await page.waitForSelector('#_gr451', { timeout: 60000 }).catch(() => {});
      check('Sala: smellur opnar #greining (sýndarprófíll með reit í hausnum)', !!(await page.$('#companies-main.gr-sydar .gr-leit .gr-inn')) && /^#greining/.test(await page.evaluate(() => location.hash)), await page.evaluate(() => location.hash));
      await page.screenshot({ path: path.join(OUT, 'sala-hlekkur-greining.png') }).catch(() => {});
      // reiturinn: tillögur + Sækja
      await page.fill('.gr-leit .gr-inn', 'Skútuvog');
      await page.waitForTimeout(1800);
      const till = await page.$$eval('.gr-leit .gr-till', (x) => x.map((y) => y.textContent));
      check('Haus: tillögur birtast meðan slegið er inn', till.length > 0, JSON.stringify(till));
      await page.screenshot({ path: path.join(OUT, 'haus-tillogur.png') }).catch(() => {});
      await page.fill('.gr-leit .gr-inn', 'Fiskislóð 41, 101 Reykjavík');
      await page.click('.gr-leit .gr-saekja');
      await page.waitForTimeout(1500);
      check('Haus: Sækja flettir upp nýju heimilisfangi (slóð + nafn borðans)', /Fiski/.test(decodeURIComponent(await page.evaluate(() => location.hash))) && /Fiskislóð 41/.test(await page.evaluate(() => (document.querySelector('#companies-main .co-banner-name') || {}).textContent || '')), await page.evaluate(() => location.hash));
      // „Opna prófíl" → raunverulegur #company/1612 og sýndarröðin farin
      await bidaKyrr(page, 60000);
      const op = await page.$('#_gr451 a[data-gr-a="profill"][data-id="1612"]');
      if (op) {
        await op.click();
        await page.waitForTimeout(3500);
        const st = await page.evaluate((SYND) => ({ hash: location.hash, synd: (Companies.list || []).some((c) => +c.id === SYND), klasi: document.getElementById('companies-main').classList.contains('gr-sydar'), banner: (document.querySelector('#companies-main .co-banner-name') || {}).textContent }), SYND);
        check('„Opna prófíl" opnar raunverulega prófílinn #company/1612 og sýndarröðin fer úr listanum', st.hash === '#company/1612' && !st.synd && !st.klasi && /Bílabúð Benna/.test(st.banner || ''), JSON.stringify(st));
      } else check('„Opna prófíl" á Fiskislóð 41', false, 'enginn hlekkur á 1612');
    }
    await ctx.close();
  }
  // Teikning → hnappurinn „Greining fasteignar" (1404, skrif gripin)
  if (AUKA) {
    console.log('\n── Teikning → Greining fasteignar (1404) ──');
    const ctx = await samhengi(b, 'teikning', 1600, skra);
    const page = await ctx.newPage();
    await page.goto('http://127.0.0.1:' + PORT + '/index.html', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.Companies && Companies.list && Companies.list.length > 100 && window.FloorPlan && window.DB && DB.sb, null, { timeout: 90000 });
    await page.evaluate(async () => { await DB._primeCompany(1404); Companies.opnaTeikningu(1404); });
    await page.waitForSelector('#modal-floorplan .fp-greining-btn', { timeout: 20000 }).catch(() => {});
    const t = await page.$('#modal-floorplan .fp-greining-btn');
    check('Teikning: lítill hnappur „Greining fasteignar" í haus gluggans', !!t, 'fannst ekki');
    if (t) {
      await page.screenshot({ path: path.join(OUT, 'teikning-hnappur.png') }).catch(() => {});
      await t.click();
      await page.waitForSelector('#_gr451', { timeout: 60000 }).catch(() => {});
      const h = await page.evaluate(() => decodeURIComponent(location.hash));
      check('Teikning: hnappurinn opnar #greining fyrir heimilisfang félagsins (Langamýri 22a)', /^#greining\/Langamýri 22a/i.test(h), h);
    }
    await ctx.close();
  }
  // „Setja í Teikningu" — á 1237 (Straumhvarf, Skútuvogi 2: viðskiptavinur án hæða). ÖLL skrif gripin, líka teikning_bord.
  // (1404 dugar ekki hér: 374 flettir „Langamýri 22a, 210" upp sem Langamýri 22a á Selfossi og finnur ekkert safn.)
  if (AUKA) {
    console.log('\n── „Setja í Teikningu" (1237, öll skrif gripin) ──');
    const ctx = await samhengi(b, 'setja', 1600, skra);
    const page = await ctx.newPage();
    await page.goto('http://127.0.0.1:' + PORT + '/index.html#greining/' + encodeURIComponent('Skútuvogur 2, 104 Reykjavík'), { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#_gr451', { timeout: 90000 }).catch(() => {});
    await bidaKyrr(page, 75000);
    const s = await page.$('#_gr451 [data-gr-a="setja"][data-id="1237"]');
    check('„Setja í Teikningu" birtist fyrir viðskiptavin án hæða (1237 Straumhvarf, Skútuvogi 2)', !!s, 'enginn takki');
    if (s) {
      await s.click();
      await page.waitForSelector('#fp-fah', { state: 'visible', timeout: 90000 }).catch(() => {});
      await page.waitForFunction(() => document.querySelector('#fp-fah [data-fah="baeta"]'), null, { timeout: 120000 }).catch(() => {});
      const fah = await page.evaluate(() => { const o = document.getElementById('fp-fah'); return o ? { synilegt: o.style.display !== 'none', haedir: o.querySelectorAll('input[data-val]').length, texti: (o.innerText || '').slice(0, 200) } : null; });
      check('„Setja í Teikningu" opnar Teikningu 1237 og tillögu „Finna allt húsið" (383)', !!fah && fah.synilegt && fah.haedir > 0, JSON.stringify(fah));
      await page.screenshot({ path: path.join(OUT, 'setja-i-teikningu-1237.png') }).catch(() => {});
      const fyrirS = skra.gripid.length;
      const b2 = await page.$('#fp-fah [data-fah="baeta"]');
      if (b2) {
        await b2.click(); await page.waitForTimeout(1500);
        const vista = await page.$('#modal-floorplan .modal-ft .btn-primary');
        if (vista) { await vista.click(); await page.waitForTimeout(4000); }
        const tb = skra.gripid.slice(fyrirS).filter((x) => /teikning_bord/.test(x.stutt));
        const allt = skra.gripid.slice(fyrirS).map((x) => x.stutt);
        let gott = false, lysing = JSON.stringify(allt);
        if (tb.length) { try { const r = JSON.parse(tb[tb.length - 1].body + (tb[tb.length - 1].body.length >= 600 ? '' : '')); gott = r.company_id === 1237; } catch (_) { gott = /"company_id":1237/.test(tb[tb.length - 1].body); } lysing = tb.map((x) => x.stutt + ' ' + x.body.slice(0, 160)).join(' | '); }
        check('Vista í Teikningu fer um TeiknVistun (upsert á teikning_bord, company_id 1237) — GRIPIÐ, ekkert vistað', tb.length >= 1 && gott && allt.every((x) => !/teikning_bord/.test(x) || true), lysing);
      }
    }
    await ctx.close();
  }
  // ── „Færa í prófíl" / „Greining" á prófílnum / „Stofna sem viðskiptavin" (452) ──
  // Raunveruleg skrif AÐEINS á 1404 (Test fyrirtæki): app_settings_merge sem snertir eingöngu banner_upplysingar[1404]
  // og banner_upplysingar_uppruni[1404]. Allt annað gripið. Ekkert fyrirtæki stofnað: innsetningin í fyrirtaeki fær
  // falsað svar (id 9990001) og þjónustuskrifin eru gripin og borin saman við leið kerfanna sjálfra.
  const FAERA = !process.argv.includes('--engin-faera') && (AUKA || process.argv.includes('--bara-faera'));
  const STOFNA_UT = arg('stofna-ut', '');
  if (STOFNA_UT) fs.mkdirSync(STOFNA_UT, { recursive: true });
  const mynd = async (page, nafn) => { if (STOFNA_UT) await page.screenshot({ path: path.join(STOFNA_UT, nafn) }).catch(() => {}); };
  if (FAERA) {
    console.log('\n── Færa í prófíl + Greining-takkinn (1404 — raunveruleg skrif aðeins þar) ──');
    const ctx = await samhengi(b, 'faera', 1600, skra);
    const raun = [], adrar = [];
    await ctx.route(/supabase\.co\/rest\/v1\/rpc\/app_settings_merge/, async (route) => {
      const req = route.request(); if (req.method() !== 'POST') return route.fallback();
      let p = null; try { p = JSON.parse(req.postData() || '{}').p_patch; } catch (_) {}
      const keys = p && typeof p === 'object' ? Object.keys(p) : [];
      const bara1404 = keys.length > 0 && keys.every((k) => /^banner_upplysingar(_uppruni)?$/.test(k) && p[k] && typeof p[k] === 'object' && Object.keys(p[k]).length > 0 && Object.keys(p[k]).every((c) => c === '1404'));
      if (bara1404) { raun.push((req.postData() || '').slice(0, 240)); return route.continue(); }
      adrar.push('rpc app_settings_merge ' + (req.postData() || '').slice(0, 160));
      return route.fulfill({ status: 200, contentType: 'application/json', body: 'null' });
    });
    await ctx.route(/supabase\.co\/rest\/v1\/stadur_flokkun/, async (route) => {
      const req = route.request(); if (req.method() === 'GET' || req.method() === 'HEAD') return route.fallback();
      if (req.method() === 'PATCH' && /fyrirtaeki_id=eq\.1404(&|$)/.test(req.url())) { raun.push('PATCH stadur_flokkun 1404 ' + (req.postData() || '').slice(0, 120)); return route.continue(); }
      adrar.push(req.method() + ' stadur_flokkun ' + req.url().split('?')[1]); return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    });
    const page = await ctx.newPage();
    const villur = [];
    page.on('pageerror', (e) => villur.push(e.message.split('\n')[0]));
    page.on('dialog', (d) => d.dismiss().catch(() => {}));
    await page.goto('http://127.0.0.1:' + PORT + '/index.html#company/1404', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('button._greining-takki[data-co="1404"]', { timeout: 60000 }).catch(() => {});
    const takki = await page.$('button._greining-takki[data-co="1404"]');
    check('Prófíll 1404: lítill „Greining“-takki í Hús-línunni (432)', !!takki, 'fannst ekki');
    const REIT = ['haedir', 'kjallari', 'm2', 'eignir', 'stiga', 'byggar'];
    const fyrir = await page.evaluate((R) => R.reduce((o, r) => { o[r] = window.BannerUpplysingar ? BannerUpplysingar.gildi(1404, r) : null; return o; }, {}), REIT);
    console.log('   1404 fyrir: ' + JSON.stringify(fyrir));
    if (takki) {
      const hFyrir = await page.evaluate(() => (document.querySelector('#companies-main .co-banner') || {}).offsetHeight);
      await takki.click();
      await page.waitForSelector('#gr-faera .gr-ftafla, #gr-faera .gr-fvar', { timeout: 60000 }).catch(() => {});
      const s = await page.evaluate(() => ({ dlg: !!document.getElementById('gr-faera'), hash: location.hash, full: (document.querySelector('#gr-faera [data-f="full"]') || {}).getAttribute ? document.querySelector('#gr-faera [data-f="full"]').getAttribute('href') : null, banner: (document.querySelector('#companies-main .co-banner') || {}).offsetHeight }));
      check('„Greining“ opnar glugga INNI á prófílnum (slóðin helst #company/1404) með „Opna fulla greiningu“ → #greining/…', s.dlg && /^#company\/1404/.test(s.hash) && /^#greining\//.test(s.full || ''), JSON.stringify(s));
      check('„Greining“-takkinn breytir ekki hæð borðans (fast pláss í Hús-línunni)', s.banner === hFyrir, hFyrir + ' → ' + s.banner);
      await mynd(page, '1600-greining-takki-1404.png');
      await page.click('#gr-faera [data-f="loka"]').catch(() => {});
    }
    // árekstur: „Hæðir" fyllt með öðru gildi en sjálfsótta (prófunargildi á 1404) — má ALDREI yfirskrifast
    const setti = !fyrir.haedir;
    if (setti) await page.evaluate(() => BannerUpplysingar.vistaReit(1404, 'haedir', '9'));
    const atrekstur = setti ? '9' : fyrir.haedir;
    // 1404 („Langamýri 22a, 210") flettist upp á Selfossi í skránum — glugginn fær gögn Berjavalla 6 til að prófa skrifin
    await page.evaluate(() => GreiningFaera.opnaProfil(1404, { adr: 'Berjavellir 6, 221 Hafnarfjörður' }));
    await page.waitForSelector('#gr-faera .gr-ftafla', { timeout: 60000 }).catch(() => {});
    const rodir = await page.evaluate(() => [...document.querySelectorAll('#gr-faera .gr-ftafla tbody tr')].map((tr) => ({ t: tr.innerText.replace(/\s+/g, ' ').trim(), cb: !!tr.querySelector('input[type=checkbox]'), hak: !!tr.querySelector('input[type=checkbox]:checked') })));
    console.log('   raðir: ' + JSON.stringify(rodir.map((r) => (r.cb ? (r.hak ? '[x] ' : '[ ] ') : '    ') + r.t.slice(0, 90))));
    const hR = rodir.find((r) => /^Hæðir/.test(r.t));
    check('Fylltur reitur („Hæðir" = ' + atrekstur + ') sýnir bæði gildin og ber engan hak — aldrei yfirskrift', !!hR && !hR.cb && /stangast á|eins/.test(hR.t), JSON.stringify(hR));
    await mynd(page, '1600-faera-val.png');
    const valin = rodir.filter((r) => r.hak).length;
    if (valin) {
      await page.click('#gr-faera [data-f="baeta"]');
      await page.waitForSelector('#gr-faera [data-f="stadfesta"]', { timeout: 5000 }).catch(() => {});
      const listi = await page.$$eval('#gr-faera .gr-flisti li', (x) => x.map((y) => y.textContent));
      check('Ein staðfesting: listinn yfir það sem breytist (' + listi.length + ' atriði)', listi.length === valin, JSON.stringify(listi));
      await mynd(page, '1600-faera-stadfesting.png');
      await page.click('#gr-faera [data-f="stadfesta"]');
      await page.waitForFunction(() => /vistuð á prófílnum/.test((document.querySelector('#gr-faera .gr-fath') || {}).textContent || ''), null, { timeout: 30000 }).catch(() => {});
      await page.waitForTimeout(1500);
      const eftir = await page.evaluate((R) => R.reduce((o, r) => { o[r] = BannerUpplysingar.gildi(1404, r); return o; }, {}), REIT);
      const merki = await page.evaluate(() => { try { BannerUpplysingar.haldaVid(); } catch (_) {} return [...document.querySelectorAll('#companies-main .co-bupp ._bupp-sjalf:not([hidden])')].map((m) => m.dataset.reitur + ': ' + m.title.slice(0, 70)); });
      console.log('   1404 eftir: ' + JSON.stringify(eftir) + ' · 🏛 ' + JSON.stringify(merki));
      check('Tómu reitirnir fylltust (m² 2971, eignir 24) um vistunarleið prófílsins (363 vistaReit → app_settings_merge, ' + raun.length + ' raunskrif á 1404)', eftir.m2 === '2971' && eftir.eignir === '24' && raun.length > 0, JSON.stringify(eftir));
      check('„Hæðir" óbreytt (' + atrekstur + ') — fylltur reitur ekki yfirskrifaður', eftir.haedir === atrekstur, eftir.haedir);
      check('🏛 með uppruna við sjálfsóttu reitina á prófílnum', merki.some((m) => /^m2:.*Skráningartafla/.test(m)), JSON.stringify(merki));
      await page.click('#gr-faera [data-f="loka"]').catch(() => {});
      await page.evaluate(() => { const v = document.querySelector('#companies-main .co-bupp ._bupp-vixl'); if (v && /Fleiri/.test(v.textContent)) v.click(); });
      await page.waitForTimeout(400);
      await page.waitForSelector('#companies-main .co-bupp ._bupp-sjalf:not([hidden])', { timeout: 8000 }).catch(() => {}); await page.evaluate(() => { const m = document.querySelector('#companies-main .co-bupp ._bupp-sjalf:not([hidden])') || document.querySelector('#companies-main .co-bupp'); if (m) m.scrollIntoView({ block: 'center' }); });
      await page.waitForTimeout(300); await mynd(page, '1600-profill-1404-eftir.png');
      // hreinsun: 1404 eins og það var
      await page.evaluate(async ({ R, f }) => { for (const r of R) { if (BannerUpplysingar.gildi(1404, r) !== (f[r] || '')) await BannerUpplysingar.vistaReit(1404, r, f[r] || ''); if (BannerUpplysingar.uppruni(1404, r)) await BannerUpplysingar.vistaUppruna(1404, r, null); } }, { R: REIT, f: fyrir });
      await page.waitForTimeout(800);
      const hreint = await page.evaluate((R) => R.reduce((o, r) => { o[r] = BannerUpplysingar.gildi(1404, r); return o; }, {}), REIT);
      check('1404 hreinsað eftir prófið (reitirnir eins og fyrir)', REIT.every((r) => (hreint[r] || '') === (fyrir[r] || '')), JSON.stringify(hreint));
    } else check('Færa í prófíl: eitthvað hakað sjálfgefið', false, JSON.stringify(rodir));
    // tegund rekstrar → stadur_flokkun.tegund_handval (449a leidrettaTegund) — aðeins ef ekkert handval er til; 1404 hreinsað
    {
      const tegFyrir = await page.evaluate(async () => { try { const f = await Flokkun.stadur(1404); return f && f.flokkun ? { handval: f.flokkun.tegund_handval || null, tegund: f.flokkun.tegund || null } : null; } catch (e) { return { villa: e.message }; } });
      console.log('   1404 flokkun fyrir: ' + JSON.stringify(tegFyrir));
      const nyTeg = tegFyrir && tegFyrir.tegund === 'skrifstofa' ? 'verslun_litil' : 'skrifstofa';
      await page.evaluate((t) => GreiningFaera.opna(1404, { adr: 'próf', bygg: {}, tegund: { tegund: t, heiti: t, rok: 'próf (greining-vafri)' } }), nyTeg);
      await page.waitForSelector('#gr-faera .gr-ftafla', { timeout: 20000 }).catch(() => {});
      const tr = await page.evaluate(() => { const r = document.querySelector('#gr-faera .gr-ftafla tbody tr'); return r ? { t: r.innerText.replace(/\s+/g, ' '), cb: !!r.querySelector('input[type=checkbox]') } : null; });
      if (tegFyrir && tegFyrir.handval) {
        check('Tegund: handval er til á 1404 (' + tegFyrir.handval + ') → enginn hak, ekkert yfirskrifað', tr && !tr.cb, JSON.stringify(tr));
      } else if (tegFyrir && !tegFyrir.villa && tr && tr.cb) {
        await page.check('#gr-faera .gr-ftafla tbody tr input[type=checkbox]');
        await page.click('#gr-faera [data-f="baeta"]'); await page.click('#gr-faera [data-f="stadfesta"]');
        await page.waitForFunction(() => /vistuð á prófílnum/.test((document.querySelector('#gr-faera .gr-fath') || {}).textContent || ''), null, { timeout: 20000 }).catch(() => {});
        const eftirT = await page.evaluate(async () => { const f = await Flokkun.stadur(1404); return f && f.flokkun ? f.flokkun.tegund_handval : null; });
        check('Tegund rekstrar vistaðist sem handval um Flokkun.leidrettaTegund (' + eftirT + ')', eftirT === nyTeg, String(eftirT));
        await page.evaluate(async () => { try { await Flokkun.leidrettaTegund(1404, null); } catch (_) {} });
        const hreinT = await page.evaluate(async () => { const f = await Flokkun.stadur(1404); return f && f.flokkun ? f.flokkun.tegund_handval : 'enginn'; });
        check('Tegund 1404 hreinsuð (handval aftur autt)', !hreinT, String(hreinT));
      } else check('Tegund: staða röðarinnar lesin (' + JSON.stringify(tegFyrir) + ')', !!tr, JSON.stringify(tr));
      await page.click('#gr-faera [data-f="loka"]').catch(() => {});
    }
    check('Færa í prófíl: engin skrif á önnur félög (gripin: ' + adrar.length + ')', !adrar.some((x) => /banner_upplysingar/.test(x)), JSON.stringify(adrar.slice(0, 4)));
    // úr Greiningu fasteignar: „Færa í prófíl" við viðskiptavininn í Hjá okkur (1404 á Langamýri 22a) — sami gluggi
    await page.goto('http://127.0.0.1:' + PORT + '/index.html#greining/' + encodeURIComponent('Langamýri 22a, 210 Garðabær'), { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#_gr451 [data-gr-a="faera"][data-id="1404"]', { timeout: 90000 }).catch(() => {});
    const fb = await page.$('#_gr451 [data-gr-a="faera"][data-id="1404"]');
    check('Greining fasteignar: „Færa í prófíl“ við viðskiptavininn (1404) í Hjá okkur', !!fb, 'fannst ekki');
    if (fb) { await fb.scrollIntoViewIfNeeded().catch(() => {}); await fb.click(); await page.waitForSelector('#gr-faera .gr-ftafla, #gr-faera .gr-fvar', { timeout: 30000 }).catch(() => {});
      const t = await page.evaluate(() => (document.querySelector('#gr-faera .ssp-titill') || {}).textContent || '');
      check('„Færa í prófíl“ opnar sama glugga (' + t + ')', /Færa í prófíl/.test(t), t); await mynd(page, '1600-faera-ur-greiningu.png'); await page.click('#gr-faera [data-f="loka"]').catch(() => {}); }
    check('Færa í prófíl: engar síðuvillur', !villur.length, JSON.stringify(villur.slice(0, 3)));
    await ctx.close();
    // sími (375): „Greining“-glugginn á prófílnum — aðeins lestur
    { const c3 = await samhengi(b, 'faera-simi', 375, skra); const p3 = await c3.newPage();
      await p3.goto('http://127.0.0.1:' + PORT + '/index.html#company/1404', { waitUntil: 'domcontentloaded' });
      await p3.waitForSelector('button._greining-takki', { timeout: 60000 }).catch(() => {});
      const tk = await p3.$('button._greining-takki'); check('375: „Greining“-takkinn á prófílnum', !!tk, 'fannst ekki');
      await p3.evaluate(() => GreiningFaera.opnaProfil(1404, { adr: 'Berjavellir 6, 221 Hafnarfjörður' }));
      await p3.waitForSelector('#gr-faera .gr-ftafla', { timeout: 60000 }).catch(() => {});
      const lar = await p3.evaluate(() => { const d = document.getElementById('gr-faera'); return d ? d.scrollWidth - d.clientWidth : -1; });
      check('375: glugginn passar á símann (engin lárétt skrun)', lar >= 0 && lar <= 1, String(lar)); await mynd(p3, '375-greining-gluggi.png');
      await c3.close(); }

    console.log('\n── Stofna sem viðskiptavin (ekkert stofnað — innsetning og þjónustuskrif gripin) ──');
    const ctx2 = await samhengi(b, 'stofna', 1600, skra);
    const ins = [], thj = [];
    const FALS = 9990001;
    await ctx2.route(/supabase\.co\/rest\/v1\/fyrirtaeki(\?|$)/, async (route) => {
      const req = route.request();
      if (req.method() === 'POST') { let body = {}; try { body = JSON.parse(req.postData() || '{}'); } catch (_) {} ins.push(body); return route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify(Object.assign({ id: FALS, created_at: new Date().toISOString() }, body)) }); }
      if (req.method() === 'PATCH') { thj.push('PATCH fyrirtaeki ' + decodeURIComponent((req.url().split('?')[1] || '')) + ' ' + (req.postData() || '')); return route.fulfill({ status: 204, body: '' }); }
      if (req.method() === 'GET' && /Prófunarfélag/.test(decodeURIComponent(req.url())) && ins[1]) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([Object.assign({ id: FALS }, ins[1])]) });
      return route.fallback();
    });
    await ctx2.route(/supabase\.co\/rest\/v1\/(rpc\/app_settings_merge|override_log|slokkvikerfi)/, async (route) => {
      const req = route.request(); if (req.method() === 'GET' || req.method() === 'HEAD') return route.fallback();
      thj.push(req.method() + ' ' + req.url().replace(/^.*\/v1\//, '').split('?')[0] + ' ' + (req.postData() || '').slice(0, 260));
      return route.fulfill({ status: 200, contentType: 'application/json', body: 'null' });
    });
    // (a) venjulega leiðin: „+ Nýtt fyrirtæki" → „Vista fyrirtæki"
    const NAFN = 'Prófunarfélag Greiningar ehf', ADR = 'Nónhæð 6, 210 Garðabær';
    const p1 = await ctx2.newPage();
    await p1.goto('http://127.0.0.1:' + PORT + '/index.html#companies', { waitUntil: 'domcontentloaded' });
    await p1.waitForFunction(() => window.Companies && Companies.openNew && document.querySelector('#nf-nafn'), null, { timeout: 60000 }).catch(() => {});
    await p1.evaluate(() => Companies.openNew());
    await p1.fill('#nf-nafn', NAFN); await p1.fill('#nf-heimilisfang', ADR);
    await p1.click('#modal-nyfyrirtaeki .modal-ft .btn-primary');
    await p1.waitForTimeout(2500);
    const venjuleg = ins[0] || null;
    await p1.close();
    // (b) Greining fasteignar → „Stofna sem viðskiptavin"
    const p2 = await ctx2.newPage();
    const v2 = [];
    p2.on('pageerror', (e) => v2.push(e.message.split('\n')[0]));
    p2.on('dialog', (d) => d.accept().catch(() => {}));   // 158 spyr með confirm() — „já" eins og notandinn
    await p2.goto('http://127.0.0.1:' + PORT + '/index.html#greining/' + encodeURIComponent(ADR), { waitUntil: 'domcontentloaded' });
    await p2.waitForSelector('#_gr451 [data-gr-a="stofna"]', { timeout: 90000 }).catch(() => {});
    const st = await p2.$('#_gr451 [data-gr-a="stofna"]');
    check('„Stofna sem viðskiptavin“ í Hjá okkur (ekki viðskiptavinur á staðnum)', !!st, 'fannst ekki');
    if (st) {
      await st.scrollIntoViewIfNeeded().catch(() => {}); await st.click();
      await p2.waitForSelector('#gr-faera [data-f="nafn"]', { timeout: 10000 }).catch(() => {});
      // tvískráning: kennitala sem er þegar til (1404) → viðvörun og „Stofna" læst þar til „Stofna samt"
      const kt1404 = await p2.evaluate(() => { const c = (Companies.list || []).find((x) => +x.id === 1404); return c ? c.kennitala : ''; });
      if (kt1404) {
        await p2.fill('#gr-faera [data-f="kt"]', kt1404);
        const tv = await p2.evaluate(() => ({ var: !!document.querySelector('#gr-faera .gr-fvar'), laest: document.querySelector('#gr-faera [data-f="stofna"]').disabled }));
        check('Tvískráning: sama kennitala og 1404 → viðvörun og „Stofna" læst þar til „Stofna samt"', tv.var && tv.laest, JSON.stringify(tv));
        await mynd(p2, '1600-stofna-tviskraning.png');
        await p2.fill('#gr-faera [data-f="kt"]', '');
      }
      await p2.fill('#gr-faera [data-f="nafn"]', NAFN);
      await p2.fill('#gr-faera [data-f="adr"]', ADR);
      for (const k of ['ars', 'bru', 'slokk']) await p2.check('#gr-faera [data-thj="' + k + '"]');
      const an = await p2.isChecked('#gr-faera [data-thj="an"]');
      check('Þjónustuval: „Án þjónustu" hverfur þegar þjónusta er valin', !an, String(an));
      await mynd(p2, '1600-stofna-form.png');
      await p2.click('#gr-faera [data-f="stofna"]');
      await p2.waitForFunction(() => /Næstu skref/i.test((document.querySelector('#gr-faera .ssp-titill') || {}).textContent || ''), null, { timeout: 30000 }).catch(() => {});
      const nyja = ins[1] || null;
      const eins = !!(venjuleg && nyja && JSON.stringify(Object.keys(venjuleg).sort()) === JSON.stringify(Object.keys(nyja).sort()) && Object.keys(venjuleg).every((k) => venjuleg[k] === nyja[k]));
      check('Stofnun = SAMA beiðni og „+ Nýtt fyrirtæki“ (fyrirtaeki-innsetning, sömu dálkar og gildi)', eins, JSON.stringify({ venjuleg, nyja }));
      check('Engin önnur innsetning í fyrirtaeki (1 + 1)', ins.length === 2, String(ins.length));
      const hash = await p2.evaluate(() => location.hash);
      check('Eftir stofnun opnast nýi prófíllinn og „Næstu skref“ (þjónusta + Færa í prófíl)', /^#company\/9990001/.test(hash) && !!(await p2.$('#gr-faera [data-f="faera"]')), hash);
      await mynd(p2, '1600-stofna-naestu-skref.png');
      // Ársskoðun: „Setja í þjónustu" á prófílnum (280) → Confirm → skrif
      const fyrirArs = thj.length;
      if (await p2.$('#gr-faera [data-f="ars"]')) {
        await p2.click('#gr-faera [data-f="ars"]');
        await p2.waitForSelector('#_cfm-ok', { timeout: 8000 }).catch(() => {});
        await mynd(p2, '1600-stofna-ars-confirm.png');
        await p2.click('#_cfm-ok').catch(() => {});
        await p2.waitForTimeout(2500);
      }
      const ars = thj.slice(fyrirArs);
      console.log('   ársskoðun-skrif: ' + JSON.stringify(ars.map((x) => x.slice(0, 140))));
      check('Ársskoðun um 280 („Setja í þjónustu“): er_i_thjonustu + arsskodun_customers.subscribed + override_log á 9990001', ars.some((x) => /PATCH fyrirtaeki id=eq\.9990001 .*"er_i_thjonustu":true/.test(x)) && ars.some((x) => /arsskodun_customers.*"9990001".*"subscribed":true/.test(x)) && ars.some((x) => /override_log.*9990001/.test(x)), JSON.stringify(ars));
      // Brunakerfi: „+ Bæta við fyrirtæki" (147) → leitin forfyllt → smellur á röðina → saveOne (ÞRÖNGUR patch)
      await p2.waitForSelector('#gr-faera [data-f="bru"]', { timeout: 15000 }).catch(() => {});
      const fyrirBru = thj.length;
      if (await p2.$('#gr-faera [data-f="bru"]')) {
        await p2.click('#gr-faera [data-f="bru"]');
        await p2.waitForFunction((n) => (document.getElementById('_bk-a-search') || {}).value === n, NAFN, { timeout: 20000 }).catch(() => {});
        await p2.waitForSelector('._bk-a-row', { timeout: 15000 }).catch(() => {});
        await mynd(p2, '1600-stofna-brunakerfi.png');
        const rod = await p2.$('._bk-a-row');
        if (rod) { await rod.click(); await p2.waitForTimeout(2500); }
        await p2.evaluate(() => { const d = document.getElementById('_bk-edit-dlg'); if (d) d.remove(); });
      }
      const bru = thj.slice(fyrirBru);
      console.log('   brunakerfi-skrif: ' + JSON.stringify(bru.map((x) => x.slice(0, 160))));
      check('Brunakerfi um 147 („+ Bæta við fyrirtæki“, saveOne): þröngur patch — aðeins brunakerfi_customers[9990001]', bru.some((x) => /brunakerfi_customers":\{"9990001":\{[^}]*"co_id":9990001/.test(x)) && !bru.some((x) => /brunakerfi_customers":\{"(?!9990001")\d+"/.test(x)), JSON.stringify(bru));
      // aftur á prófíl nýja félagsins → Næstu skref birtast aftur
      await p2.evaluate(() => { location.hash = '#company/9990001'; });
      // Slökkvikerfi: „＋ Nýtt kerfi" (385) opnast með fyrirtækið í leitinni — notandinn klárar þar
      await p2.waitForSelector('#gr-faera [data-f="slokk"]', { timeout: 20000 }).catch(() => {});
      if (await p2.$('#gr-faera [data-f="slokk"]')) {
        await p2.click('#gr-faera [data-f="slokk"]');
        await p2.waitForFunction((n) => (document.getElementById('_skn-leit') || {}).value === n, NAFN, { timeout: 15000 }).catch(() => {});
        const leit = await p2.evaluate(() => (document.getElementById('_skn-leit') || {}).value || '');
        check('Slökkvikerfi um 385 („＋ Nýtt kerfi“): glugginn opinn með fyrirtækið í leitinni — ekkert vistað fyrr en „Skrá kerfi“', leit === NAFN, leit);
        await mynd(p2, '1600-stofna-slokkvikerfi.png');
        await p2.click('#_skn-haetta').catch(() => {});
      } else check('Slökkvikerfi: takkinn í Næstu skrefum', false, 'fannst ekki');
      check('Engin slökkvikerfis-innsetning án „Skrá kerfi" (gripið: ' + thj.filter((x) => /slokkvikerfi/.test(x)).length + ')', !thj.some((x) => /^POST slokkvikerfi/.test(x)), JSON.stringify(thj.filter((x) => /slokkvikerfi/.test(x))));
      check('Stofna: engar síðuvillur', !v2.length, JSON.stringify(v2.slice(0, 3)));
    }
    await ctx2.close();
  }
  // OCR-beiðni (aðeins með --ocr): fyrir prófhús með ólesnu skjali
  if (MED_OCR) {
    console.log('\n── OCR á skrifstofutölvunni (ein beiðni) ──');
    const ctx = await samhengi(b, 'ocr', 1600, skra);
    const page = await ctx.newPage();
    await page.goto('http://127.0.0.1:' + PORT + '/index.html#greining/' + encodeURIComponent(arg('ocr-hus', 'Berjavellir 6, 221 Hafnarfjörður')), { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#_gr451', { timeout: 90000 }).catch(() => {});
    await bidaKyrr(page, 75000);
    const t = await page.$('#_gr451 [data-gr-a="ocr"]');
    check('OCR: „Lesa skjölin" birtist þegar ólesin skjöl eru til', !!t, 'enginn takki');
    if (t) {
      await t.click();
      const t0 = Date.now();
      let sidast = '';
      for (;;) {
        const s = await page.evaluate(() => { const g = window.Greining451.gogn(); const k = document.querySelector('#_gr451 .gr-framvinda'); return { txt: k ? k.textContent : '', parts: g && g.parts.bygg && g.parts.bygg.stada }; });
        if (s.txt !== sidast) { console.log('   ' + Math.round((Date.now() - t0) / 1000) + ' s ' + s.txt); sidast = s.txt; }
        if (!s.txt && Date.now() - t0 > 8000) break;
        if (Date.now() - t0 > 20 * 60000) break;
        await page.waitForTimeout(3000);
      }
      await page.screenshot({ path: path.join(OUT, 'ocr-lokid.png'), fullPage: false }).catch(() => {});
    }
    await ctx.close();
  }
  await b.close(); srv.close();
  fs.writeFileSync(path.join(OUT, 'nidurstodur.json'), JSON.stringify({ ok, bad, nidur: nidur.filter(Boolean).map((x) => ({ nafn: x.nafn, cls: x.cls, eftir: x.eftir, villur: x.errs, g: Object.assign({}, x.g, { gls: undefined, spjold: x.g.spjold }) })), skrif: skra }, null, 1));
  console.log('\n' + ok.length + ' ✓ · ' + bad.length + ' ✗');
  if (bad.length) { console.log('BRESTIR:\n  ' + bad.join('\n  ')); process.exit(1); }
})().catch((e) => { console.error(e); process.exit(1); });
