// HOPP VIÐ PRÓFÍLOPNUN, rammi fyrir ramma — hvaða hnútar færast, hvenær (ms eftir opnun) og um hve marga px.
// Keyrsla: W=1600 [IDS=192,227,269] [HUB_USER=<kaka>] NODE_PATH=/opt/node22/lib/node_modules node tools/maelingar/hopp.cjs
// Viðmið: 12.10.2026 eftir 462 CLS 0,001–0,009; 31.10.2026 0,21 / 0,34 / 0,07 (192/227/269) — orsakir 286 (beinagrind 280 → ~500 px),
// 485 (felur Teikningar-línuna seint), 477 (144 px frátekin) — 485 og 477 eru EKKI í SKREF-lista 462. Sími þarf enn farsímastillingar
// (W=412 breytir aðeins breiddinni). Stoppar á innskráningarhliðinu (exit 2). Aðeins lestur. Sjá skill allsherjar-uttekt.
// Hvaða hnútur hoppar við opnun prófíls? Les aðeins; öll skrif hleruð, sendBeacon/keepalive óvirk.
const { chromium } = require('playwright');
const IDS = (process.env.IDS || '192,227,269').split(',').map(Number);
const W = +(process.env.W || 1600);
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', proxy: { server: process.env.HTTPS_PROXY, bypass: '192.0.2.2' } });
  const context = await b.newContext({ ignoreHTTPSErrors: true, viewport: { width: W, height: 1000 } });
  // Valfrjálst: lögmæt seta eigandans (HttpOnly-kakan hub_user) — aðeins ef hann lætur hana í té. ÓPRÓFAÐ 10.11.2026.
  if (process.env.HUB_USER) await context.addCookies([{ name: 'hub_user', value: process.env.HUB_USER, domain: 'slokkvitaeki.netlify.app', path: '/', httpOnly: true, secure: true, sameSite: 'Lax' }]);
  await context.addInitScript(() => {
    try { Navigator.prototype.sendBeacon = function () { return true; }; } catch (_) {}
    const f = window.fetch; window.fetch = function (u, o) { return (o && o.keepalive) ? Promise.resolve(new Response('lokað')) : f.apply(this, arguments); };
  });
  let writes = 0;
  await context.route('**/*', async (route) => {
    const r = route.request(), m = r.method();
    if (m !== 'GET' && m !== 'HEAD' && m !== 'OPTIONS') { writes++; return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }); }
    for (let i = 0; i < 3; i++) { try { const resp = await route.fetch({ timeout: 60000 }); return route.fulfill({ response: resp }); } catch (e) { if (i === 2) return route.abort(); } }
  });
  const page = await context.newPage();
  page.on('pageerror', (e) => console.log('PAGEERROR', e.message.slice(0, 200)));
  await page.goto('https://slokkvitaeki.netlify.app/#verkbord', { waitUntil: 'domcontentloaded', timeout: 180000 });
  await page.waitForFunction(() => /innskraning/.test(location.pathname) || (window.__hula && window.App && window.Companies), null, { timeout: 120000 });
  if (await page.evaluate(() => /innskraning/.test(location.pathname))) { console.log('HLIÐ LOKAÐ: /api/hub-adgangar svaraði gate:true + authed:false og appið sendi vafrann á ' + page.url().slice(0, 120) + ' — EKKERT MÆLT (innskráningar krafist; ekki farið framhjá).', 'SKRIF HLERUÐ', writes); await context.close(); await b.close(); process.exit(2); }
  await page.waitForTimeout(8000);
  await page.evaluate(() => App.switchView('companies'));
  await page.waitForTimeout(6000);
  for (const id of IDS) {
    const res = await page.evaluate(async (id) => {
      const NMO = window.__NativeMutationObserver || MutationObserver;
      const desc = (x) => x.tagName.toLowerCase() + (x.id ? '#' + x.id : '') + (typeof x.className === 'string' && x.className.trim() ? '.' + x.className.trim().split(/\s+/).slice(0, 3).join('.') : '');
      const t0 = performance.now(); const ev = [];
      const mo = new NMO((ms) => { const t = Math.round(performance.now() - t0); for (const m of ms) {
        for (const n of m.addedNodes) if (n.nodeType === 1 && n.closest && n.closest('#companies-main')) ev.push({ t, a: '+', n: desc(n), p: desc(m.target) });
        for (const n of m.removedNodes) if (n.nodeType === 1) { if (m.target.closest && m.target.closest('#companies-main')) ev.push({ t, a: '-', n: desc(n), p: desc(m.target) }); }
      } });
      mo.observe(document.getElementById('companies-main'), { childList: true, subtree: true });
      const SEL = '#companies-main > *, .co-banner > *, .co-banner-left > *, .co-banner-right > *, .co-bupp > *, .co-banner-left > * > *';
      let prev = new Map(); const ch = []; const hashes = [];
      const snap = () => { const m = new Map(); const nn = {}; document.querySelectorAll(SEL).forEach((el) => { const d = desc(el); nn[d] = (nn[d] || 0) + 1; m.set(d + '#' + nn[d], { h: el.offsetHeight, y: Math.round(el.getBoundingClientRect().top) }); }); return m; };
      window._openCompanySafe(id);
      hashes.push(location.hash);
      await new Promise((res) => { const loop = () => { const t = Math.round(performance.now() - t0); const s = snap();
        for (const [k, v] of s) { const p = prev.get(k); if (!p) { if (v.h > 4) ch.push({ t, k, ny: v.h, y: v.y }); } else if (Math.abs(p.h - v.h) > 4) ch.push({ t, k, h: p.h + '→' + v.h, y: v.y }); }
        for (const [k, p] of prev) if (!s.has(k) && p.h > 4) ch.push({ t, k, farinn: p.h });
        prev = s; if (t < 7000) requestAnimationFrame(loop); else res(); }; requestAnimationFrame(loop); });
      mo.disconnect(); hashes.push(location.hash);
      return { hashes, ch: ch.filter((c) => c.t > 50), ev: ev.filter((e) => e.t > 50 && !/^(span|b|i|svg|path|small|strong|em|td|tr|option)/.test(e.n)).slice(0, 120) };
    }, id);
    console.log('\n===== ' + id + ' hash ' + res.hashes.join(' → '));
    console.log('-- hæðarbreytingar (eftir 50 ms) --'); for (const c of res.ch.slice(0, 60)) console.log(JSON.stringify(c));
    console.log('-- inn/út hnútar (eftir 50 ms) --'); for (const e of res.ev.slice(0, 80)) console.log(JSON.stringify(e));
    await page.waitForTimeout(3000);
  }
  console.log('SKRIF HLERUÐ', writes);
  await context.close(); await b.close();
})().catch((e) => { console.error('BRAST', e); process.exit(1); });
