// Prófíll Kvarna (1871) staðbundið (eða lifandi með argv[2]): spjöldin 456 með búnaðarlista + stór sýn. Öll skrif lokuð.
const path = require('path');
const { chromium } = require('C:/Users/Slokkvitaeki/luna-bridge/node_modules/playwright');
const BASE = process.argv[2] || 'http://localhost:5599';
(async () => {
  const b = await chromium.launch({ headless: true });
  const ctx = await b.newContext({ viewport: { width: 1500, height: 1000 } });
  const skrif = [];
  await ctx.route('**/*', (route) => {
    const r = route.request(), u = r.url();
    if (!['GET', 'HEAD', 'OPTIONS'].includes(r.method()) && /supabase\.co\/(rest|storage)/.test(u) && !/rpc\/(get_|v_|les)/.test(u)) { skrif.push(r.method() + ' ' + u.slice(0, 100)); return route.fulfill({ status: 403, body: '{"message":"próf"}', contentType: 'application/json' }); }
    if (BASE.includes('localhost') && /\/(\.netlify\/functions|api)\//.test(new URL(u).pathname) && u.startsWith(BASE)) return route.fetch({ url: u.replace(BASE, 'https://slokkvitaeki.netlify.app') }).then((res) => route.fulfill({ response: res }), () => route.abort());
    return route.continue();
  });
  const p = await ctx.newPage();
  const villur = []; p.on('pageerror', (e) => villur.push(e.message));
  await p.goto(BASE + '/#company/1871', { waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => document.querySelector('#co-fp-hdir .cfh-k'), null, { timeout: 90000 });
  await p.waitForTimeout(6000);
  const uppl = await p.evaluate(() => {
    const g = document.getElementById('co-fp-hdir');
    g.scrollIntoView({ block: 'start' });
    return [...g.querySelectorAll('.cfh-k')].map((k) => ({ haus: k.querySelector('.cfh-h').innerText.replace(/\s+/g, ' '), raðir: [...k.querySelectorAll('.cfh-l li')].map((li) => li.innerText.replace(/\s+/g, ' ')), mynd: !!k.querySelector('.cfh-m canvas') }));
  });
  console.log(JSON.stringify(uppl, null, 1));
  // 14 px stílstjóragildran: engin ný hnút má passa
  console.log('nth-gildra:', await p.evaluate(() => [...document.querySelectorAll('#co-fp-hdir *')].filter((e) => e.matches('html div > div:nth-of-type(1) > div:nth-of-type(1) > span:nth-of-type(1)')).length));
  await p.waitForTimeout(800);
  await p.screenshot({ path: path.join(__dirname, 'listi_kort.png') });
  await p.click('#co-fp-hdir .cfh-k .cfh-m');
  await p.waitForSelector('#cfh-stort .cfh-s-m canvas', { timeout: 30000 });
  await p.waitForTimeout(800);
  await p.screenshot({ path: path.join(__dirname, 'listi_stort.png') });
  console.log('stór sýn listi:', await p.evaluate(() => document.querySelectorAll('#cfh-stort .cfh-l li').length));
  console.log('villur:', villur.length ? villur.slice(0, 5) : 'engar', '· skrif gripin:', skrif.length ? skrif : 'engin');
  await b.close();
})().catch((e) => { console.error('VILLA', e.message); process.exit(1); });
