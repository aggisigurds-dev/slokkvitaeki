// „Teikning greiningarinnar" (474): spjöld teiknuð, stór sýn með lista, prentun með blöðunum — skrif lokuð.
const path = require('path');
const { chromium } = require('C:/Users/Slokkvitaeki/luna-bridge/node_modules/playwright');
const BASE = process.argv[2] || 'http://localhost:5599';
(async () => {
  const b = await chromium.launch({ headless: true });
  const ctx = await b.newContext({ viewport: { width: 1500, height: 1050 } });
  const skrif = [];
  await ctx.route('**/*', (route) => {
    const r = route.request(), u = r.url();
    if (!['GET', 'HEAD', 'OPTIONS'].includes(r.method()) && /supabase\.co\/(rest|storage)/.test(u)) { skrif.push(r.method() + ' ' + u.replace(/^https:\/\/[^/]+/, '').slice(0, 70)); return route.fulfill({ status: 403, body: '{"message":"próf"}', contentType: 'application/json' }); }
    if (BASE.includes('localhost') && u.startsWith(BASE) && /\/(\.netlify\/functions|api)\//.test(new URL(u).pathname)) return route.fetch({ url: u.replace(BASE, 'https://slokkvitaeki.netlify.app') }).then((res) => route.fulfill({ response: res }), () => route.abort());
    return route.continue();
  });
  const p = await ctx.newPage();
  const villur = []; p.on('pageerror', (e) => villur.push(e.message)); p.on('console', (m) => { if (m.type() === 'error' && /tainted|CORS|cross-origin/i.test(m.text())) villur.push(m.text().slice(0, 150)); });
  for (const cid of [661, 1871]) {
    await p.goto(BASE + '/#company/' + cid, { waitUntil: 'domcontentloaded' });
    await p.waitForFunction(() => document.querySelector('#co-bgr .bgr-k'), null, { timeout: 90000 });
    await p.evaluate(() => document.querySelector('#co-bgr .bgr-bl').scrollIntoView({ block: 'center' }));
    await p.waitForFunction(() => [...document.querySelectorAll('#co-bgr .bgr-km')].every((m) => m.querySelector('canvas') || /náðist/.test(m.textContent)), null, { timeout: 120000 }).catch(() => {});
    const s = await p.evaluate(() => [...document.querySelectorAll('#co-bgr .bgr-k')].map((k) => k.querySelector('.bgr-kh').innerText.replace(/\s+/g, ' ') + ' → ' + (k.querySelector('canvas') ? 'teiknað ' + k.querySelector('canvas').width + 'px' : k.querySelector('.bgr-km').innerText)));
    console.log(cid, JSON.stringify(s));
    await p.screenshot({ path: path.join(__dirname, 'blod_' + cid + '.png') });
    await p.click('#co-bgr .bgr-k[data-bl="' + (cid === 661 ? 2 : 0) + '"]');
    await p.waitForSelector('#cfh-stort .cfh-s-m canvas', { timeout: 90000 });
    await p.waitForTimeout(600);
    console.log('  stór sýn:', await p.evaluate(() => document.querySelectorAll('#cfh-stort .cfh-l li').length + ' í lista · ' + document.querySelector('#cfh-stort .cfh-s-h').innerText.replace(/\s+/g, ' ').slice(0, 90)));
    await p.screenshot({ path: path.join(__dirname, 'blod_' + cid + '_stort.png') });
    await p.keyboard.press('Escape');
    if (cid === 661) {
      const [pop] = await Promise.all([ctx.waitForEvent('page', { timeout: 60000 }), p.click('#co-bgr [data-a="prenta"]')]);
      await pop.waitForFunction(() => document.querySelector('table'), null, { timeout: 90000 });
      console.log('  prenta:', JSON.stringify(await pop.evaluate(() => ({ myndir: document.querySelectorAll('.mynd img').length, titlar: [...document.querySelectorAll('.mynd h2')].map((h) => h.textContent) }))));
      await pop.close();
    }
  }
  console.log('villur:', villur.length ? villur.slice(0, 5) : 'engar', '· skrif gripin:', skrif.length ? skrif : 'engin');
  await b.close();
})().catch((e) => { console.error('VILLA', e.message); process.exit(1); });
