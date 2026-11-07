// Heilt skot af EIGNASÍÐU Þjónustugáttarinnar úr STAÐBUNDNU tré (07.11.2026 — mockup-grindin).
//   node ut/gatt-eign-local-png.cjs <slóð> <breidd> <úttak.png> [eignIndex]
// Dæmi: node ut/gatt-eign-local-png.cjs "http://localhost:5599/gatt/?demo=1&theme=premium" 1440 ut/eign-1440.png 0
// Lesaðeins: allt sem er ekki GET/HEAD/OPTIONS fær 204, svo prófun skrifar aldrei á þjón.
// Skúffan er fixed með innri skruni (.dr-body overflow:auto) — hér er hún losuð og teygð í fulla hæð
// áður en skotið er tekið af henni einni, svo ekkert að baki slæðist með.
const fs = require('fs');
const LB = ['C:/Users/Slokkvitaeki/luna-bridge', 'C:/projects/luna-bridge'].find((p) => fs.existsSync(p + '/node_modules/playwright'));
const { chromium } = require(LB + '/node_modules/playwright');
const URL = process.argv[2], W = +process.argv[3] || 1440, UT = process.argv[4], IX = process.argv[5] == null ? 0 : +process.argv[5];
if (!URL || !UT) { console.error('node ut/gatt-eign-local-png.cjs <slóð> <breidd> <úttak.png> [eignIndex]'); process.exit(1); }
(async () => {
  const b = await chromium.launch({ headless: true });
  const ctx = await b.newContext({ viewport: { width: W, height: 1100 }, deviceScaleFactor: 2, locale: 'is-IS' });
  const p = await ctx.newPage();
  await p.route('**/*', (r) => { const m = r.request().method(); if (m === 'GET' || m === 'HEAD' || m === 'OPTIONS') return r.continue(); return r.fulfill({ status: 204, body: '' }); });
  await p.goto(URL + (URL.indexOf('?') > -1 ? '&' : '?') + 't=' + Date.now(), { waitUntil: 'domcontentloaded', timeout: 90000 });
  await p.waitForSelector('#portal:not(.hidden)', { timeout: 60000 });
  await p.waitForTimeout(2500);
  if (await p.evaluate(() => document.querySelector('.drawer.hidden') && !!window.Gatt)) {
    await p.evaluate((i) => window.Gatt.openDrawer(i), IX);
  }
  await p.waitForSelector('.drawer:not(.hidden) .dr-body', { timeout: 60000 });
  await p.waitForTimeout(5000);   // myndir, teikningar, Leaflet-flísar
  const m = await p.evaluate(async () => {
    document.querySelectorAll('.toast,.open-ribbon,.demo-ribbon,[class*="ribbon"]').forEach((t) => { t.style.display = 'none'; });
    const d = document.querySelector('.drawer:not(.hidden)'), body = d.querySelector('.dr-body');
    for (let y = 0; y < body.scrollHeight; y += 800) { body.scrollTop = y; await new Promise((r) => setTimeout(r, 120)); }
    body.scrollTop = 0;
    d.style.position = 'absolute'; d.style.top = '0'; d.style.left = '0'; d.style.right = 'auto'; d.style.bottom = 'auto';
    d.style.height = 'auto'; d.style.maxHeight = 'none'; d.style.animation = 'none';
    body.style.overflow = 'visible'; body.style.height = 'auto'; body.style.maxHeight = 'none'; body.style.flex = 'none';
    document.body.style.overflow = 'visible';
    await new Promise((r) => setTimeout(r, 900));
    return { h: d.getBoundingClientRect().height, nafn: (d.querySelector('.dr-tt h3') || {}).textContent || '', sw: body.scrollWidth, cw: body.clientWidth };
  });
  await p.setViewportSize({ width: W, height: Math.min(Math.ceil(m.h) + 10, 16000) });
  await p.waitForTimeout(900);
  await (await p.$('.drawer:not(.hidden)')).screenshot({ path: UT, type: 'png' });
  console.log(JSON.stringify({ ut: UT, breidd: W, eign: m.nafn.trim(), haed: Math.ceil(m.h), skrunbreidd: m.sw, synileg: m.cw, bytes: fs.statSync(UT).size }));
  await b.close();
})().catch((e) => { console.error('VILLA', e.message); process.exit(1); });
