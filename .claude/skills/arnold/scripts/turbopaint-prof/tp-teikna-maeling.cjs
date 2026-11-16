// Hökt í veggjateikningu á framleiðslu, án skrifa: rammatími (rAF-bil) og löng verk meðan músin hreyfist í
// (a) Velja-tóli yfir veggjum, (b) Teikna vegg með „Smella á línu" Á, (c) Teikna vegg með „Smella á línu" AF,
// (d) dregið í enda veggjar, (e) heill veggur færður. MERKI=fyrir|eftir.
const { chromium } = require('C:/projects/luna-bridge/node_modules/playwright');
const BASE = process.env.BASE || 'https://slokkvitaeki.vercel.app';
const CID = process.env.CID || '532', HAED = process.env.HAED || 'hc532x170aa', MERKI = process.env.MERKI || 'fyrir';
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1600, height: 1000 } });
  await ctx.route('**/*', r => { const q = r.request(); if (/supabase\.co/.test(q.url()) && !['GET', 'HEAD', 'OPTIONS'].includes(q.method())) return r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }); return r.continue(); });
  await ctx.addInitScript(() => {
    window.__lt = []; window.__fr = []; window.__maela = false;
    try { new PerformanceObserver((l) => { for (const e of l.getEntries()) if (window.__maela) window.__lt.push(Math.round(e.duration)); }).observe({ entryTypes: ['longtask'] }); } catch (_) {}
    let sidast = 0; const lykkja = (t) => { if (window.__maela && sidast) window.__fr.push(t - sidast); sidast = t; requestAnimationFrame(lykkja); }; requestAnimationFrame(lykkja);
  });
  const p = await ctx.newPage(); const villur = [];
  p.on('pageerror', e => villur.push(String(e).slice(0, 160)));
  await p.goto(BASE + '/kjarni/turbopaint?uttekt=' + CID + '&haed=' + HAED, { waitUntil: 'domcontentloaded' });
  let stodugt = 0;
  for (let i = 0; i < 300 && stodugt < 4; i++) { const ok = await p.evaluate((haed) => { const st = window.__tpStore && window.__tpStore.getState(); return !!(st && st.hydrated && !st.importProgress && st.objects.some(o => o.type === 'image' && o.uttekt && o.uttekt.haedId === haed)); }, HAED); stodugt = ok ? stodugt + 1 : 0; await p.waitForTimeout(1500); }
  await p.locator('[role="tab"][title^="Aðeins veggirnir"]').first().click();
  await p.waitForTimeout(3000);
  // þysja inn á miðja teikningu svo veggir séu undir músinni
  await p.evaluate(() => { const s = window.__tpStore.getState(); const pl = s.objects.find(o => o.type === 'image' && o.uttekt); const sc = 0.45; s.setCamera({ scale: sc, x: 700 - (pl.x + pl.width * 0.5) * sc, y: 550 - (pl.y + pl.height * 0.62) * sc }); });
  await p.waitForTimeout(1500);
  const maela = async (nafn, fn) => {
    await p.evaluate(() => { window.__lt.length = 0; window.__fr.length = 0; window.__maela = true; });
    await fn();
    const r = await p.evaluate(() => { window.__maela = false; const f = window.__fr.slice().sort((a, b) => a - b); const q = (x) => f.length ? Math.round(f[Math.min(f.length - 1, Math.floor(f.length * x))]) : 0; return { rammar: f.length, p50: q(0.5), p95: q(0.95), p99: q(0.99), mest: Math.round(f[f.length - 1] || 0), yfir33: f.filter(x => x > 33).length, yfir50: f.filter(x => x > 50).length, lt: window.__lt.length, ltMest: Math.max(0, ...window.__lt) }; });
    console.log(MERKI, nafn.padEnd(34), JSON.stringify(r));
  };
  const sveipa = async (skref = 220) => { for (let i = 0; i < skref; i++) { const t = i / skref; await p.mouse.move(380 + 620 * (0.5 - 0.5 * Math.cos(t * Math.PI * 4)), 300 + 420 * t); } };
  // (a) Velja-tól
  await maela('a) Velja-tól, sveimað', () => sveipa());
  // (b) Teikna vegg, smella á línu Á
  const teikna = p.locator('button', { hasText: 'Teikna vegg' }).first();
  await teikna.click(); await p.waitForTimeout(500);
  const smellaA = await p.evaluate(() => { const c = Array.from(document.querySelectorAll('label')).find(l => /Smella á línu teikningarinnar/.test(l.innerText)); const i = c && c.querySelector('input'); return i ? i.checked : null; });
  await maela('b) Teikna, smella á línu ' + (smellaA ? 'Á' : 'AF') + ', sveimað', () => sveipa());
  // dreginn veggur (mús niðri)
  await maela('b2) Teikna, dregið (mús niðri)', async () => { await p.mouse.move(500, 400); await p.mouse.down(); for (let i = 0; i < 150; i++) await p.mouse.move(500 + i * 3, 400 + Math.sin(i / 10) * 30); await p.keyboard.press('Escape'); await p.mouse.up(); });
  // (c) smella á línu AF
  await p.evaluate(() => { const c = Array.from(document.querySelectorAll('label')).find(l => /Smella á línu teikningarinnar/.test(l.innerText)); const i = c && c.querySelector('input'); if (i) i.click(); });
  await p.waitForTimeout(400);
  await maela('c) Teikna, smella á línu víxlað, sveimað', () => sveipa());
  await p.evaluate(() => { const c = Array.from(document.querySelectorAll('label')).find(l => /Smella á línu teikningarinnar/.test(l.innerText)); const i = c && c.querySelector('input'); if (i) i.click(); });
  // (d) dregið í enda veggjar / (e) veggur færður: Velja-tól, finna vegg á skjánum
  await p.locator('button', { hasText: 'Velja' }).first().click(); await p.waitForTimeout(400);
  const v = await p.evaluate(() => { const s = window.__tpStore.getState(); const cam = s.camera; const cv = document.querySelector('canvas').getBoundingClientRect(); for (const o of s.objects) { if (!o.veggur || !o.points) continue; const P = o.points; const x0 = (o.x || 0) + P[0], y0 = (o.y || 0) + P[1], x1 = (o.x || 0) + P[P.length - 2], y1 = (o.y || 0) + P[P.length - 1]; const S = (x, y) => [x * cam.scale + cam.x + cv.left, y * cam.scale + cam.y + cv.top]; const a = S(x0, y0), e = S(x1, y1); const inni = (q) => q[0] > 330 && q[0] < 1250 && q[1] > 220 && q[1] < 860; if (inni(a) && inni(e) && Math.hypot(a[0] - e[0], a[1] - e[1]) > 80) return { a, e, id: o.id }; } return null; });
  if (v) {
    await p.mouse.click((v.a[0] + v.e[0]) / 2, (v.a[1] + v.e[1]) / 2); await p.waitForTimeout(300);
    await maela('d) endi veggjar dreginn', async () => { await p.mouse.move(v.e[0], v.e[1]); await p.mouse.down(); for (let i = 0; i < 150; i++) await p.mouse.move(v.e[0] + Math.sin(i / 12) * 60, v.e[1] + i * 0.6); await p.mouse.up(); });
    await p.evaluate(() => window.__tpStore.getState().undo && window.__tpStore.getState().undo());
    await maela('e) heill veggur færður', async () => { const mx = (v.a[0] + v.e[0]) / 2, my = (v.a[1] + v.e[1]) / 2; await p.mouse.move(mx, my); await p.mouse.down(); for (let i = 0; i < 150; i++) await p.mouse.move(mx + Math.sin(i / 12) * 60, my + i * 0.5); await p.mouse.up(); });
    await p.evaluate(() => window.__tpStore.getState().undo && window.__tpStore.getState().undo());
  } else console.log('fann engan vegg á skjánum fyrir d/e');
  console.log('villur:', villur.slice(0, 3));
  await b.close();
})().catch((e) => { console.error('VILLA', e.message); process.exit(1); });
