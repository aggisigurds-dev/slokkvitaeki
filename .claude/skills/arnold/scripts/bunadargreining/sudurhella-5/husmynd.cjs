// Finnur slóð húsmyndarinnar á prófíl 1875 (sama mynd og sést í borðanum) — aðeins lestur
const { chromium } = require('C:/Users/Slokkvitaeki/luna-bridge/node_modules/playwright');
(async () => {
  const b = await chromium.launch({ headless: true });
  const ctx = await b.newContext({ viewport: { width: 1500, height: 1100 } });
  await ctx.route('**/*', (route) => { const r = route.request(); if (!['GET', 'HEAD', 'OPTIONS'].includes(r.method()) && /supabase\.co/.test(r.url())) return route.fulfill({ status: 200, body: '[]', contentType: 'application/json' }); return route.continue(); });
  const p = await ctx.newPage();
  await p.goto('https://slokkvitaeki.netlify.app/#company/1875', { waitUntil: 'domcontentloaded' });
  await p.waitForSelector('.co-banner', { timeout: 120000 });
  await p.waitForTimeout(9000);
  const imgs = await p.evaluate(() => [...document.querySelectorAll('.co-banner img, .co-mynd img, .co-banner [style*="background-image"]')].map((e) => ({ tag: e.tagName, cls: e.className, src: e.currentSrc || e.src || (e.getAttribute('style') || '').slice(0, 300), w: e.naturalWidth, h: e.naturalHeight })));
  console.log(JSON.stringify(imgs, null, 1));
  await b.close();
})().catch((e) => { console.error('VILLA', e.message); process.exit(1); });
