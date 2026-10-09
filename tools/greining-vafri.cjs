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
const SYND = -987654321;

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
const STADBUNDIN = { 'bygging-uppl': 'netlify/functions/bygging-uppl.js', 'fasteign-opin': 'netlify/functions/fasteign-opin.js' };
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
    s.listen(5599, '127.0.0.1', () => res(s));
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
  await ctx.route(/127\.0\.0\.1:5599\/(\.netlify\/functions|api)\//, async (route) => {
    const req = route.request();
    const u = new URL(req.url());
    const m = /^\/(?:\.netlify\/functions|api)\/([a-z0-9-]+)/.exec(u.pathname);
    if (m && STADBUNDIN[m[1]]) return route.continue();
    if (!['GET', 'HEAD'].includes(req.method())) {
      if (m && m[1] === 'husmynd') return route.fulfill({ response: await route.fetch({ url: LIFANDI + u.pathname + u.search }) });   // les aðeins
      skra.gripid.push({ nafn, stutt: req.method() + ' ' + u.pathname, body: (req.postData() || '').slice(0, 300), t: Date.now() });
      return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    }
    try { return route.fulfill({ response: await route.fetch({ url: LIFANDI + u.pathname + u.search, timeout: 45000 }) }); }
    catch (e) { return route.fulfill({ status: 502, contentType: 'application/json', body: JSON.stringify({ error: 'próf: ' + e.message }) }); }
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
  await page.goto('http://127.0.0.1:5599/index.html#greining/' + encodeURIComponent(adr), { waitUntil: 'domcontentloaded' });
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
  const mynd = await page.$('#_gr451 [data-gr-ljos], #_gr451 .gr-mynd[data-gr-a="blad"]');
  if (mynd) {
    await mynd.scrollIntoViewIfNeeded().catch(() => {});
    await mynd.click().catch(() => {});
    await page.waitForTimeout(1200);
    const ljos = await page.$('#gr-ljos');
    const forsk = await page.$('#tfs');
    check(nafn + ': smellur á teikningu stækkar hana (ljóskassi eða forskoðun 384)', !!ljos || !!forsk, 'hvorugt opnaðist');
    if (vp === 1600) await page.screenshot({ path: path.join(OUT, vp + '-' + slug(adr) + '-stokkun.png') }).catch(() => {});
    if (ljos) await page.click('#gr-ljos [data-gr-loka]').catch(() => {});
    if (forsk) await page.keyboard.press('Escape').catch(() => {});
    await page.waitForTimeout(500);
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
  const breiddir = process.argv.includes('--bara-auka') ? [] : BARA ? [+BARA] : [1600, 980, 375];
  for (const vp of breiddir) {
    const husin = [...new Set(vp === 1600 ? HUS : HUS.slice(0, 3).concat(HUS.filter((h) => /Skútuvogur 2|Nónhæð 6/.test(h))))];
    for (const adr of husin) {
      try { nidur.push(await profaHus(b, adr, vp, skra)); } catch (e) { check(vp + ' ' + adr + ': prófið keyrði', false, e.message); }
    }
  }
  const AUKA = !process.argv.includes('--engin-auka');
  // Sala → hlekkur → #greining
  if (AUKA) {
    console.log('\n── Sala-hlekkurinn ──');
    const ctx = await samhengi(b, 'sala', 1600, skra);
    const page = await ctx.newPage();
    await page.goto('http://127.0.0.1:5599/index.html#sala', { waitUntil: 'domcontentloaded' });
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
    await page.goto('http://127.0.0.1:5599/index.html', { waitUntil: 'domcontentloaded' });
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
    await page.goto('http://127.0.0.1:5599/index.html#greining/' + encodeURIComponent('Skútuvogur 2, 104 Reykjavík'), { waitUntil: 'domcontentloaded' });
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
  // OCR-beiðni (aðeins með --ocr): fyrir prófhús með ólesnu skjali
  if (MED_OCR) {
    console.log('\n── OCR á skrifstofutölvunni (ein beiðni) ──');
    const ctx = await samhengi(b, 'ocr', 1600, skra);
    const page = await ctx.newPage();
    await page.goto('http://127.0.0.1:5599/index.html#greining/' + encodeURIComponent(arg('ocr-hus', 'Berjavellir 6, 221 Hafnarfjörður')), { waitUntil: 'domcontentloaded' });
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
