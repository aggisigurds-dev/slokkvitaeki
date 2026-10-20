// Nýja skýrslan = „Prenta" Búnaðargreiningar (474) á lifandi síðu, vistuð sem PDF. Öll skrif lokuð.
// node pdf_ur_appinu.cjs <cid> <úttak.pdf> [BASE] [prenta|prenta-haedir]   (prenta = ein síða, prenta-haedir = hver hæð á sér blaði)
const { chromium } = require('C:/Users/Slokkvitaeki/luna-bridge/node_modules/playwright');
const CID = process.argv[2], UT = process.argv[3], BASE = process.argv[4] || 'https://slokkvitaeki.netlify.app', HAMUR = process.argv[5] || 'prenta', SEL = '#co-bgr [data-a="' + HAMUR + '"]';
(async () => {
  const b = await chromium.launch({ headless: true });
  const ctx = await b.newContext({ viewport: { width: 1500, height: 1050 } });
  await ctx.route('**/*', (route) => {
    const r = route.request();
    if (!['GET', 'HEAD', 'OPTIONS'].includes(r.method()) && /supabase\.co\/(rest|storage)/.test(r.url())) return route.fulfill({ status: 403, body: '{"message":"próf"}', contentType: 'application/json' });
    const u = r.url();
    if (BASE.includes('localhost') && u.startsWith(BASE) && /\/(\.netlify\/functions|api)\//.test(new URL(u).pathname)) return route.fetch({ url: u.replace(BASE, 'https://slokkvitaeki.netlify.app') }).then((res) => route.fulfill({ response: res }), () => route.abort());
    return route.continue();
  });
  const p = await ctx.newPage();
  await p.goto(BASE + '/#company/' + CID, { waitUntil: 'domcontentloaded' });
  await p.waitForFunction((s) => document.querySelector(s), SEL, { timeout: 90000 });
  await p.waitForTimeout(3000);
  const [pop] = await Promise.all([ctx.waitForEvent('page', { timeout: 60000 }), p.click(SEL)]);
  await pop.waitForFunction(() => document.querySelector('table') && [...document.images].every((i) => i.complete), null, { timeout: 180000 });
  await pop.waitForTimeout(1500);
  const uppl = await pop.evaluate(() => ({ titill: document.title, myndir: document.querySelectorAll('.mynd img').length, toflur: document.querySelectorAll('table').length, h2: [...document.querySelectorAll('h2')].map((h) => h.textContent).slice(0, 12) }));
  await pop.pdf({ path: UT, preferCSSPageSize: true, printBackground: true, displayHeaderFooter: true, headerTemplate: '<span></span>',
    footerTemplate: '<div style="font:7pt Segoe UI,Arial;color:#888;width:100%;padding:0 14mm;display:flex;justify-content:space-between"><span>Slökkvitæki ehf · Búnaðargreining</span><span>bls. <span class="pageNumber"></span>/<span class="totalPages"></span></span></div>' });
  console.log(JSON.stringify(uppl), require('fs').statSync(UT).size);
  await b.close();
})().catch((e) => { console.error('VILLA', e.message); process.exit(1); });
