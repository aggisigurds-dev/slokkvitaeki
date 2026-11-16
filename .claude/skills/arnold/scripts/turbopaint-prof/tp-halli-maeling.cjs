// Mælir löng verk (longtask > 50 ms) á aðalþræði TurboPaint frá því Veggir-flipinn er opnaður (hallamælingin fer þá í gang)
// á framleiðslu, án skrifa. Keyrt fyrir og eftir PR (halli í þræði).
const { chromium } = require('C:/projects/luna-bridge/node_modules/playwright');
const BASE = process.env.BASE || 'https://slokkvitaeki.vercel.app';
const CID = process.env.CID || '219', HAED = process.env.HAED || 'hc219x4b8e2';
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1600, height: 1000 } });
  await ctx.route('**/*', r => { const q = r.request(); if (/supabase\.co/.test(q.url()) && !['GET', 'HEAD', 'OPTIONS'].includes(q.method())) return r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }); return r.continue(); });
  await ctx.addInitScript(() => {
    window.__lt = []; window.__con = [];
    const oe = console.error.bind(console), ow = console.warn.bind(console); console.error = (...a) => { window.__con.push('E ' + a.map(String).join(' ').slice(0, 160)); oe(...a); }; console.warn = (...a) => { window.__con.push('W ' + a.map(String).join(' ').slice(0, 160)); ow(...a); };
    try { new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__lt.push({ t: Math.round(e.startTime), ms: Math.round(e.duration) }); }).observe({ entryTypes: ['longtask'] }); } catch (_) {}
  });
  const p = await ctx.newPage();
  await p.goto(BASE + '/kjarni/turbopaint?uttekt=' + CID + '&haed=' + HAED, { waitUntil: 'domcontentloaded' });
  for (let i = 0; i < 120; i++) { const ok = await p.evaluate(() => !!(window.__tpStore && window.__tpStore.getState().hydrated && window.__tpStore.getState().objects.some(o => o.type === 'image'))); if (ok) break; await p.waitForTimeout(1000); }
  await p.waitForTimeout(8000);
  const t0 = await p.evaluate(() => { window.__lt.length = 0; return performance.now(); });
  await p.locator('[role="tab"][title^="Aðeins veggirnir"]').first().click();
  // stillingin „Halli blaðsins" — opna hana ef hún er samanbrotin
  await p.waitForTimeout(1500);
  const sk = p.locator('[data-veggir-skekkja]').first();
  if (await sk.count()) { const btn = sk.locator('button').first(); if (await btn.count()) await btn.click().catch(() => {}); }
  // villur úr þræðinum (console) og fyrsta svar hans
  for (const ms of [4000, 10000, 16000]) { await p.waitForTimeout(ms); const tx = await p.evaluate(() => (document.querySelector('[data-veggir-skekkja]') || {}).innerText || ''); console.log('  @' + Math.round(performance.now()) + ':', tx.replace(/\s+/g, ' ').slice(0, 110)); }
  const con = await p.evaluate(() => window.__con || []);
  console.log('console (villur/þráður):', JSON.stringify(con.slice(0, 6)));
  const lt = await p.evaluate(() => window.__lt.slice());
  const texti = await p.evaluate(() => (document.querySelector('[data-veggir-skekkja]') || {}).innerText || '');
  console.log('halli-texti:', texti.replace(/\s+/g, ' ').slice(0, 160));
  const stor = lt.filter(x => x.ms >= 100);
  console.log('löng verk eftir Veggir-smell (≥100 ms):', stor.length, JSON.stringify(stor.slice(0, 12)), '| lengsta:', Math.max(0, ...lt.map(x => x.ms)), 'ms | fjöldi ≥50 ms:', lt.length);
  await b.close();
})().catch((e) => { console.error('VILLA', e.message); process.exit(1); });
