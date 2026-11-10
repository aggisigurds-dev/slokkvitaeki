// MÆLING Á LIFANDI APPI — borð + prófílar: CLS, REST-köll (og tvítekin), langar tasks, DOM-breytingar/s í kyrrstöðu,
// pageerror/console.error, hvenær hulan lyftist. AÐEINS LESTUR: öll skrif fölsuð, sendBeacon/keepalive óvirk (MAELINGAR kafli 17).
// Keyrsla: MODE=desktop|phone [BOARDS=…] [OUT=/slóð/] [HUB_USER=<kaka>] NODE_PATH=/opt/node22/lib/node_modules node tools/maelingar/maela.cjs
// Viðmið 31.10.2026 (óinnskráð, hlið slökkt): hula 5.975 ms tölva / 4.028 ms sími · 135 REST-köll í ræsingu · 0 villur · CLS ≤ 0,012 á borðum.
// 10.11.2026: appið er á bak við innskráningu (krefjast_slokk) — skriftan hættir með exit 2 og „HLIÐ LOKAÐ" í stað þess að mæla
// innskráningarsíðuna (sú gildra skilaði „CLS 0, 0 REST" fyrir öll borð). Að svara hliðinu sjálf eða nota köku er ákvörðun Agnars.
// Sjá skill allsherjar-uttekt.
// Úttekt: Slökkvitæki í vafra (lifandi síða). AÐEINS LESTUR — öll skrif hleruð og fölsuð, sendBeacon/keepalive óvirk.
const { chromium } = require('playwright');
const fs = require('fs');
const MODE = process.env.MODE || 'desktop';
const OUT = process.env.OUT || (require('os').tmpdir() + '/maelingar-ut/');
try { require('fs').mkdirSync(OUT, { recursive: true }); } catch (_) {}
const TAG = process.env.TAG || '';
const BASE = 'https://slokkvitaeki.netlify.app/';
const BOARDS = (process.env.BOARDS || 'sala,counter,arsskodun,companies,P192,P227,P269,krofu-yfirlit,rekstrarfelog,bilstjori,vorur').split(',').filter(Boolean);
const API_RE = /supabase\.co|\/api\/|\.netlify\/functions|brunaholf\.netlify\.app/;
const t00 = Date.now();
const log = (...a) => { const s = `[${((Date.now() - t00) / 1000).toFixed(1)}s] ` + a.join(' '); console.log(s); };
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', proxy: { server: process.env.HTTPS_PROXY, bypass: '192.0.2.2' } });
  const ctxOpt = MODE === 'phone'
    ? { ignoreHTTPSErrors: true, viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2,
        userAgent: 'Mozilla/5.0 (Linux; Android 14; SM-S931B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36' }
    : { ignoreHTTPSErrors: true, viewport: { width: 1600, height: 1000 } };
  const context = await b.newContext(ctxOpt);
  // Valfrjálst: lögmæt seta eigandans (HttpOnly-kakan hub_user) — aðeins ef hann lætur hana í té. ÓPRÓFAÐ 10.11.2026.
  if (process.env.HUB_USER) await context.addCookies([{ name: 'hub_user', value: process.env.HUB_USER, domain: 'slokkvitaeki.netlify.app', path: '/', httpOnly: true, secure: true, sameSite: 'Lax' }]);
  // 1) Skrif-vörn (MAELINGAR §17): sendBeacon no-op, keepalive-fetch falsað — ÁÐUR en síðan hleðst.
  await context.addInitScript(() => {
    try { Navigator.prototype.sendBeacon = function () { return true; }; } catch (_) {}
    try { navigator.sendBeacon = function () { return true; }; } catch (_) {}
    const f = window.fetch;
    window.fetch = function (u, o) { return (o && o.keepalive) ? Promise.resolve(new Response('lokað')) : f.apply(this, arguments); };
  });
  // 2) Mælitæki
  await context.addInitScript(() => {
    if (window.top !== window) return;
    const M = window.__m = { gaps: [], ls: [], lt: [], n: 0, last: performance.now(), rec: false, keys: {}, veilT: null };
    try { performance.setResourceTimingBufferSize(5000); } catch (_) {}
    { let p = performance.now(); const tick = (t) => { const d = t - p; if (d > 50) M.gaps.push({ t: p, d }); p = t; requestAnimationFrame(tick); }; requestAnimationFrame(tick); }
    const desc = (x) => { if (!x) return '?'; if (x.nodeType !== 1) x = x.parentElement; if (!x) return '?';
      return x.tagName.toLowerCase() + (x.id ? '#' + x.id : '') + (x.className && typeof x.className === 'string' ? '.' + x.className.trim().split(/\s+/).slice(0, 2).join('.') : ''); };
    try { new PerformanceObserver((l) => { for (const e of l.getEntries()) M.ls.push({ t: e.startTime, v: e.value, hr: e.hadRecentInput, src: (e.sources || []).slice(0, 3).map((s) => desc(s.node) + ' ' + Math.round(s.previousRect.y) + '→' + Math.round(s.currentRect.y)) }); }).observe({ type: 'layout-shift', buffered: true }); } catch (_) {}
    try { new PerformanceObserver((l) => { for (const e of l.getEntries()) M.lt.push({ t: e.startTime, d: e.duration }); }).observe({ type: 'longtask', buffered: true }); } catch (_) {}
    const start = () => new MutationObserver((ms) => {
      M.n += ms.length; M.last = performance.now();
      if (M.veilT == null) { const v = document.getElementById('boot-veil'); if (!v || v.style.opacity === '0') M.veilT = performance.now(); }
      if (M.rec) for (const m of ms) { const x = m.target; const k = (x.nodeType === 1 ? desc(x) : (x.parentElement ? desc(x.parentElement) + '>' + x.nodeName : x.nodeName)) + ':' + m.type + (m.attributeName ? '[' + m.attributeName + ']' : ''); M.keys[k] = (M.keys[k] || 0) + 1; }
    }).observe(document.documentElement, { childList: true, subtree: true, attributes: true, characterData: true });
    if (document.documentElement) start(); else document.addEventListener('DOMContentLoaded', start);
  });
  // 3) Net: öll skrif fölsuð; GET sótt af Node (3 tilraunir).
  const writes = []; let board = 'boot';
  await context.route('**/*', async (route) => {
    const r = route.request(), m = r.method(), u = r.url();
    if (m !== 'GET' && m !== 'HEAD' && m !== 'OPTIONS') {
      let body = ''; try { body = (r.postData() || '').slice(0, 400); } catch (_) {}
      writes.push({ board, t: Date.now(), m, u: u.split('?')[0], q: (u.split('?')[1] || '').slice(0, 120), body: /villur|app_problems/.test(u) ? body : '', bodyLen: body.length });
      return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    }
    for (let i = 0; i < 3; i++) { try { const resp = await route.fetch({ timeout: 60000 }); return route.fulfill({ response: resp }); } catch (e) { if (i === 2) return route.abort(); } }
  });
  const page = await context.newPage();
  const reqs = [], errs = [], wss = [];
  let inflight = 0, lastNet = Date.now();
  page.on('request', (r) => { if (API_RE.test(r.url())) { inflight++; lastNet = Date.now(); reqs.push({ board, t: Date.now(), m: r.method(), u: r.url() }); } });
  const done = (r) => { if (API_RE.test(r.url())) { inflight = Math.max(0, inflight - 1); lastNet = Date.now(); } };
  page.on('requestfinished', done); page.on('requestfailed', (r) => { done(r); if (API_RE.test(r.url())) errs.push({ board, t: Date.now(), k: 'reqfailed', msg: r.method() + ' ' + r.url().slice(0, 160) + ' ' + (r.failure() || {}).errorText }); });
  page.on('response', (r) => { if (API_RE.test(r.url()) && r.status() >= 400) errs.push({ board, t: Date.now(), k: 'http' + r.status(), msg: r.request().method() + ' ' + r.url().slice(0, 200) }); });
  page.on('pageerror', (e) => errs.push({ board, t: Date.now(), k: 'pageerror', msg: String(e.message).slice(0, 300), st: String(e.stack || '').split('\n').slice(1, 3).join(' | ').slice(0, 300) }));
  page.on('console', (c) => { if (c.type() === 'error') errs.push({ board, t: Date.now(), k: 'console.error', msg: c.text().slice(0, 300), loc: (c.location() || {}).url ? String(c.location().url).split('/').pop().slice(0, 60) + ':' + c.location().lineNumber : '' }); });
  const wsSent = {};
  page.on('websocket', (w) => { wss.push({ board, u: w.url().slice(0, 80) }); w.on('framesent', (f) => { let ev = '?'; try { const j = JSON.parse(String(f.payload)); ev = Array.isArray(j) ? j[3] : (j.event || '?'); if (ev === 'phx_join') { const p = Array.isArray(j) ? j[4] : j.payload; const c = (p && p.config) || {}; ev += (c.broadcast && c.broadcast.self ? '+bself' : '') + (c.presence && c.presence.key ? '+presence' : '') + ':' + ((c.postgres_changes || []).length) + 'pg'; } } catch (_) {} wsSent[ev] = (wsSent[ev] || 0) + 1; }); });

  async function still(domQ, netQ, cap) {
    const t0 = Date.now();
    while (Date.now() - t0 < cap) {
      const s = await page.evaluate(() => performance.now() - window.__m.last).catch(() => 0);
      if (s >= domQ && inflight === 0 && Date.now() - lastNet >= netQ) return { ms: Date.now() - t0, cap: false };
      await page.waitForTimeout(100);
    }
    return { ms: Date.now() - t0, cap: true, inflight };
  }
  const TXT_RE = /(Sæki[^\n]{0,40}|Hleð[^\n]{0,40}|Loading[^\n]{0,30}|[^\n]{0,40}\b(?:Villa|villa kom|Error|undefined|NaN)\b[^\n]{0,40}|[^\n]{0,30}\bnull\b[^\n]{0,30}|Ekkert fannst[^\n]{0,30}|Engin gögn[^\n]{0,30})/g;
  async function textScan(sel) {
    return page.evaluate(({ sel, src }) => {
      const re = new RegExp(src, 'g');
      const el = document.querySelector(sel); if (!el) return { missing: true };
      const t = el.innerText || ''; const hits = {};
      for (const m of t.matchAll(re)) { const k = m[0].replace(/\s+/g, ' ').trim().slice(0, 90); hits[k] = (hits[k] || 0) + 1; }
      const vis = !!(el.offsetWidth || el.offsetHeight);
      return { len: t.length, vis, hits, h: el.scrollHeight, nodes: el.getElementsByTagName('*').length };
    }, { sel, src: TXT_RE.source });
  }
  async function kyrrd(ms) {
    await page.evaluate(() => { window.__m.keys = {}; window.__m.rec = true; window.__m.n0 = window.__m.n; });
    const r0 = reqs.length; await page.waitForTimeout(ms);
    const r = await page.evaluate(() => { const M = window.__m; M.rec = false; return { n: M.n - M.n0, top: Object.entries(M.keys).sort((a, b) => b[1] - a[1]).slice(0, 6) }; });
    return { perSec: +(r.n / (ms / 1000)).toFixed(1), top: r.top, reqsDuring: reqs.length - r0, reqList: reqs.slice(r0).map((x) => x.m + ' ' + x.u.replace(/^https:\/\/[^/]+/, '').slice(0, 110)).slice(0, 8) };
  }
  async function windowStats(pt0, wallT0) {
    const s = await page.evaluate((pt0) => { const M = window.__m;
      const ls = M.ls.filter((e) => e.t >= pt0 && !e.hr); const lt = M.lt.filter((e) => e.t >= pt0);
      return { cls: +ls.reduce((a, e) => a + e.v, 0).toFixed(4), nShift: ls.length, topShift: ls.sort((a, b) => b.v - a.v).slice(0, 3).map((e) => ({ v: +e.v.toFixed(4), at: Math.round(e.t - pt0), src: e.src })),
        ltN: lt.length, ltMax: Math.round(Math.max(0, ...lt.map((e) => e.d))), ltSum: Math.round(lt.reduce((a, e) => a + e.d, 0)), ltList: lt.map((e) => Math.round(e.t - pt0) + ':' + Math.round(e.d)).slice(0, 40), gapMax: Math.round(Math.max(0, ...M.gaps.filter((g) => g.t >= pt0).map((g) => g.d))), gapN: M.gaps.filter((g) => g.t >= pt0).length, gapSum: Math.round(M.gaps.filter((g) => g.t >= pt0).reduce((a, g) => a + g.d, 0)), domNodes: document.getElementsByTagName('*').length }; }, pt0);
    const rq = reqs.filter((r) => r.t >= wallT0);
    const by = {}; for (const r of rq) { const k = r.m + ' ' + r.u; by[k] = (by[k] || 0) + 1; }
    const dups = Object.entries(by).filter(([, n]) => n > 1).sort((a, b) => b[1] - a[1]);
    s.rest = rq.filter((r) => /supabase\.co\/rest/.test(r.u)).length; s.api = rq.length;
    s.dupKeys = dups.length; s.dupExtra = dups.reduce((a, [, n]) => a + n - 1, 0);
    s.dupTop = dups.slice(0, 5).map(([k, n]) => n + '× ' + k.replace(/^(\w+) https:\/\/[^/]+/, '$1 ').slice(0, 170));
    const tbl = {}; for (const r of rq) { const m = r.u.match(/rest\/v1\/([a-z_0-9]+)/); if (m) tbl[m[1]] = (tbl[m[1]] || 0) + 1; }
    s.topTables = Object.entries(tbl).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, n]) => k + ':' + n).join(' ');
    return s;
  }
  const result = { mode: MODE, boards: {} };
  // ===== RÆSING =====
  const tBoot = Date.now();
  await page.goto(BASE + '#verkbord', { waitUntil: 'domcontentloaded', timeout: 180000 });
  const kb = await still(1000, 1000, 90000);
  if (await page.evaluate(() => /innskraning/.test(location.pathname) || !window.App).catch(() => true)) {
    const adg = await page.evaluate(() => fetch('/api/hub-adgangar', { cache: 'no-store' }).then((r) => r.json()).catch((e) => String(e))).catch((e) => String(e));
    log('HLIÐ LOKAÐ: /api/hub-adgangar svaraði gate:true + authed:false og appið sendi vafrann á ' + page.url().slice(0, 120) + ' — EKKERT MÆLT (innskráningar krafist; ekki farið framhjá).', 'hub-adgangar:', JSON.stringify(adg), 'tími að kyrrstöðu á innskráningarsíðu:', kb.ms, 'ms', 'skrif hleruð:', writes.length);
    fs.writeFileSync(OUT + `nidurstodur-${MODE}${TAG}.json`, JSON.stringify({ mode: MODE, hlid: true, url: page.url(), adg, writes, reqs }, null, 1));
    await context.close(); await b.close(); process.exit(2);
  }
  const bootInfo = await page.evaluate(() => ({ hula: window.__hula || null, veilT: window.__m.veilT, vis: document.visibilityState, nav: (performance.getEntriesByType('navigation')[0] || {}).domContentLoadedEventEnd,
    build: (performance.getEntriesByType('resource').map((e) => e.name).find((n) => /_bundle/.test(n)) || '').split('/').pop(), active: [...document.querySelectorAll('.view')].filter((v) => v.offsetWidth).map((v) => v.id) }));
  const bs = await windowStats(0, tBoot);
  const clsAfterVeil = await page.evaluate(() => { const M = window.__m; const t = M.veilT || 0; const ls = M.ls.filter((e) => e.t >= t && !e.hr); return { cls: +ls.reduce((a, e) => a + e.v, 0).toFixed(4), top: ls.sort((a, b) => b.v - a.v).slice(0, 3).map((e) => ({ v: +e.v.toFixed(4), at: Math.round(e.t), src: e.src })) }; });
  const bk = await kyrrd(5000);
  const bt = await textScan('#view-verkbord');
  result.boards.boot = { still: kb, wallToStill: Date.now() - tBoot, ...bootInfo, ...bs, clsAfterVeil, kyrrd: bk, txt: bt };
  log('BOOT', JSON.stringify(result.boards.boot));
  // ===== BORÐ =====
  for (const B of BOARDS) {
    board = B;
    const wall0 = Date.now(); const pt0 = await page.evaluate(() => performance.now());
    let sync = null, sel;
    try {
      if (B === 'RF') {
        sel = '#view-rekstrarfelog';
        sync = await page.evaluate(() => { const a = performance.now(); window.openRekstrarfelog(); return Math.round(performance.now() - a); });
      } else if (B[0] === 'P') {
        const id = +B.slice(1); sel = '#companies-main';
        sync = await page.evaluate((i) => { const a = performance.now(); window._openCompanySafe(i); return Math.round(performance.now() - a); }, id);
        await page.waitForFunction((i) => { const m = document.getElementById('companies-main'); return window.Companies && Companies.currentId === i && m && m.querySelector('.co-banner'); }, id, { timeout: 45000 }).catch((e) => errs.push({ board, t: Date.now(), k: 'harness', msg: 'banner kom ekki: ' + e.message.slice(0, 80) }));
      } else {
        sel = '#view-' + B;
        sync = await page.evaluate((v) => { const a = performance.now(); App.switchView(v); return Math.round(performance.now() - a); }, B);
      }
    } catch (e) { errs.push({ board, t: Date.now(), k: 'harness', msg: e.message.slice(0, 200) }); }
    const k = await still(800, 1000, 45000);
    const st = await windowStats(pt0, wall0);
    const tx1 = await textScan(sel);
    const kd = await kyrrd(5000);
    const tx2 = await textScan(sel);
    const hang = Object.keys(tx2.hits || {}).filter((h) => /Sæki|Hleð|Loading/.test(h) && (tx1.hits || {})[h]);
    result.boards[B] = { sync, still: k, ...st, kyrrd: kd, txt: tx2, hangandi: hang };
    log(B, JSON.stringify(result.boards[B]));
    if (MODE === 'phone' || B === 'vorur' || B === 'bilstjori' || B === 'P192' || B === 'counter') await page.screenshot({ path: OUT + `skot-${MODE}-${B}.png` }).catch(() => {});
  }
  // Seinni sýn á virkt borð eftir lengri kyrrstöðu (lekur eitthvað á tíma?)
  board = 'eftir';
  const kLong = await kyrrd(+(process.env.LOKA || 15000));
  result.lokakyrrd = kLong;
  result.errs = errs; result.writes = writes; result.ws = wss; result.wsSent = wsSent; result.utgafa = await page.evaluate(() => fetch('/build.json', { cache: 'no-store' }).then((r) => r.json()).catch((e) => String(e))); result.reqTotal = reqs.length;
  fs.writeFileSync(OUT + `nidurstodur-${MODE}${TAG}.json`, JSON.stringify(result, null, 1));
  fs.writeFileSync(OUT + `reqs-${MODE}${TAG}.json`, JSON.stringify(reqs));
  log('LOKAKYRRÐ 15s', JSON.stringify(kLong));
  log('VILLUR', errs.length, JSON.stringify(errs).slice(0, 1500));
  log('SKRIF HLERUÐ (fölsuð, fóru EKKI út)', writes.length, writes.map((w) => w.board + ' ' + w.m + ' ' + w.u.replace(/^https:\/\/[^/]+/, '')).join(' | '));
  log('WS', wss.length, 'sendir rammar', JSON.stringify(wsSent), 'ÚTGÁFA', JSON.stringify(result.utgafa));
  await page.evaluate(() => 1);
  await context.close(); await b.close();
})().catch((e) => { console.error('MÆLING BRAST', e); process.exit(1); });
