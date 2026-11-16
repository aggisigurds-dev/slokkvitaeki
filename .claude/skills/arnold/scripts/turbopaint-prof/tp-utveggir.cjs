// „Útveggir úr útlínu" á framleiðslu, án skrifa: opna hæð → Veggir → útlína (skurður hæðarinnar, 1 % inn) sett í borðið →
// Húsið-spjaldið → takkinn → veggir fyrir/eftir, ⌘Z tekur þá aftur, annar smellur bætir engu við (hliðarnar þaktar).
const { chromium } = require('C:/projects/luna-bridge/node_modules/playwright');
const path = require('path');
const BASE = process.env.BASE || 'https://slokkvitaeki.vercel.app';
const CID = process.env.CID || '219', HAED = process.env.HAED || 'hc219x4b8e2';
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1600, height: 1000 } });
  const skrif = [];
  await ctx.route('**/*', r => { const q = r.request(); if (/supabase\.co/.test(q.url()) && !['GET', 'HEAD', 'OPTIONS'].includes(q.method())) { skrif.push(q.method()); return r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }); } return r.continue(); });
  const p = await ctx.newPage(); const villur = [];
  p.on('pageerror', e => villur.push(String(e).slice(0, 160)));
  await p.goto(BASE + '/kjarni/turbopaint?uttekt=' + CID + '&haed=' + HAED, { waitUntil: 'domcontentloaded' });
  let stodugt = 0;
  for (let i = 0; i < 300 && stodugt < 4; i++) {
    const ok = await p.evaluate((haed) => { const st = window.__tpStore && window.__tpStore.getState(); return !!(st && st.hydrated && !st.importProgress && st.objects.some(o => o.type === 'image' && o.uttekt && o.uttekt.haedId === haed)); }, HAED);
    stodugt = ok ? stodugt + 1 : 0; await p.waitForTimeout(1500);
  }
  if (stodugt < 4) { console.log('HÆÐIN KOM EKKI'); await b.close(); process.exit(2); }
  await p.locator('[role="tab"][title^="Aðeins veggirnir"]').first().click();
  await p.waitForTimeout(2000);
  const veggir = () => p.evaluate(() => window.__tpStore.getState().objects.filter(o => o.veggur).length);
  await p.evaluate(() => {
    const s = window.__tpStore.getState(); const pl = s.objects.find(o => o.type === 'image' && o.uttekt); const t = pl.uttekt;
    const sk = t.skurdur && t.skurdur.w > 8 ? t.skurdur : { x: 0, y: 0, w: t.frumB, h: t.frumH };
    const x0 = pl.x + (sk.x / t.frumB) * pl.width, y0 = pl.y + (sk.y / t.frumH) * pl.height, w = (sk.w / t.frumB) * pl.width, h = (sk.h / t.frumH) * pl.height, m = 0.01;
    s.patchObject(pl.id, { uttekt: { ...t, husUtlina: [x0 + w * m, y0 + h * m, x0 + w * (1 - m), y0 + h * m, x0 + w * (1 - m), y0 + h * (1 - m), x0 + w * m, y0 + h * (1 - m)] } }, false);
  });
  await p.waitForTimeout(500);
  const hus = p.locator('[data-veggir-hus]').first();
  await hus.locator('button').first().click(); await p.waitForTimeout(600);
  const takki = p.locator('[data-veggir-hus-utveggir]');
  console.log('takkinn „Útveggir úr útlínu":', (await takki.count()) ? 'til' : 'VANTAR');
  if (!(await takki.count())) { console.log('villur:', villur.slice(0, 3)); await b.close(); process.exit(2); }
  const v0 = await veggir();
  await takki.click(); await p.waitForTimeout(800);
  const v1 = await veggir();
  const valdir = await p.evaluate(() => window.__tpStore.getState().selectedIds.length);
  await takki.click(); await p.waitForTimeout(800);
  const v2 = await veggir();
  console.log('veggir fyrir:', v0, '| eftir smell:', v1, '(+' + (v1 - v0) + ', valdir ' + valdir + ') | eftir annan smell:', v2, '(á að vera óbreytt)');
  await p.evaluate(() => { const s = window.__tpStore.getState(); const pl = s.objects.find(o => o.type === 'image' && o.uttekt); const sc = Math.min(1250 / pl.width, 760 / pl.height); s.setCamera({ scale: sc, x: 60 - pl.x * sc, y: 160 - pl.y * sc }); s.setSelected([]); });
  await p.waitForTimeout(1200);
  await p.screenshot({ path: path.join(require('os').tmpdir(), 'utveggir-' + CID + '.png') });
  await p.evaluate(() => window.__tpStore.getState().undo && window.__tpStore.getState().undo()); await p.waitForTimeout(600);
  const v3 = await veggir();
  console.log('eftir ⌘Z (undo):', v3, '(á að vera', v0 + ')');
  console.log('skrif gripin:', skrif.length, '| villur:', villur.slice(0, 3));
  await b.close();
  process.exit(v1 > v0 && v2 === v1 && v3 === v0 ? 0 : 1);
})().catch((e) => { console.error('VILLA', e.message); process.exit(1); });
