// CPU-prófíll af „endi veggjar dreginn" á framleiðslu (án skrifa): hvaða föll éta tímann? Prentar efstu sjálftíma-föllin
// með slóð:lína:dálkur og 160 stafa kóðabút úr búntinu á þeim stað (búntið er minnkað — búturinn segir hvað fallið er).
const { chromium } = require('C:/projects/luna-bridge/node_modules/playwright');
const BASE = process.env.BASE || 'https://slokkvitaeki.vercel.app';
const CID = process.env.CID || '532', HAED = process.env.HAED || 'hc532x170aa';
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1600, height: 1000 } });
  await ctx.route('**/*', r => { const q = r.request(); if (/supabase\.co/.test(q.url()) && !['GET', 'HEAD', 'OPTIONS'].includes(q.method())) return r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }); return r.continue(); });
  const p = await ctx.newPage();
  await p.goto(BASE + '/kjarni/turbopaint?uttekt=' + CID + '&haed=' + HAED, { waitUntil: 'domcontentloaded' });
  let stodugt = 0;
  for (let i = 0; i < 300 && stodugt < 4; i++) { const ok = await p.evaluate((haed) => { const st = window.__tpStore && window.__tpStore.getState(); return !!(st && st.hydrated && !st.importProgress && st.objects.some(o => o.type === 'image' && o.uttekt && o.uttekt.haedId === haed)); }, HAED); stodugt = ok ? stodugt + 1 : 0; await p.waitForTimeout(1500); }
  await p.locator('[role="tab"][title^="Aðeins veggirnir"]').first().click();
  await p.waitForTimeout(3000);
  await p.evaluate(() => { const s = window.__tpStore.getState(); const pl = s.objects.find(o => o.type === 'image' && o.uttekt); const sc = 0.45; s.setCamera({ scale: sc, x: 700 - (pl.x + pl.width * 0.5) * sc, y: 550 - (pl.y + pl.height * 0.62) * sc }); });
  await p.waitForTimeout(1500);
  const v = await p.evaluate(() => { const s = window.__tpStore.getState(); const cam = s.camera; const cv = document.querySelector('canvas').getBoundingClientRect(); for (const o of s.objects) { if (!o.veggur || !o.points) continue; const P = o.points; const x0 = (o.x || 0) + P[0], y0 = (o.y || 0) + P[1], x1 = (o.x || 0) + P[P.length - 2], y1 = (o.y || 0) + P[P.length - 1]; const S = (x, y) => [x * cam.scale + cam.x + cv.left, y * cam.scale + cam.y + cv.top]; const a = S(x0, y0), e = S(x1, y1); const inni = (q) => q[0] > 330 && q[0] < 1250 && q[1] > 220 && q[1] < 860; if (inni(a) && inni(e) && Math.hypot(a[0] - e[0], a[1] - e[1]) > 80) return { a, e, id: o.id }; } return null; });
  if (!v) { console.log('enginn veggur'); await b.close(); return; }
  await p.mouse.click((v.a[0] + v.e[0]) / 2, (v.a[1] + v.e[1]) / 2); await p.waitForTimeout(400);
  const cdp = await ctx.newCDPSession(p);
  await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', { interval: 500 }); await cdp.send('Profiler.start');
  const t0 = Date.now();
  await p.mouse.move(v.e[0], v.e[1]); await p.mouse.down();
  for (let i = 0; i < 80; i++) await p.mouse.move(v.e[0] + Math.sin(i / 12) * 60, v.e[1] + i * 0.6);
  await p.mouse.up();
  const ms = Date.now() - t0;
  const { profile } = await cdp.send('Profiler.stop');
  const dragTeg = await p.evaluate((id) => { const o = window.__tpStore.getState().objects.find(x => x.id === id); return o ? o.points.slice(-2) : null; }, v.id);
  await p.evaluate(() => window.__tpStore.getState().undo && window.__tpStore.getState().undo());
  // sjálftími per fall
  const byId = new Map(profile.nodes.map(n => [n.id, n])); const self = new Map();
  const dt = profile.timeDeltas; profile.samples.forEach((id, i) => self.set(id, (self.get(id) || 0) + (dt[i] || 0)));
  const agg = new Map();
  for (const [id, us] of self) { const n = byId.get(id); const f = n.callFrame; const k = (f.functionName || '(anon)') + ' ' + f.url.replace(/^https?:\/\/[^/]+/, '').slice(-46) + ':' + f.lineNumber + ':' + f.columnNumber; const a = agg.get(k) || { us: 0, f }; a.us += us; agg.set(k, a); }
  const top = [...agg.entries()].sort((a, b) => b[1].us - a[1].us).slice(0, 18);
  const heild = [...self.values()].reduce((a, x) => a + x, 0);
  console.log('dráttur 80 hreyfingar:', ms, 'ms | endi veggjar eftir drátt:', JSON.stringify(dragTeg), '| sýni samtals', Math.round(heild / 1000), 'ms');
  const skrar = new Map();
  for (const [k, a] of top) {
    let butur = '';
    const f = a.f;
    if (/^https?:/.test(f.url) && f.lineNumber >= 0) {
      try { if (!skrar.has(f.url)) skrar.set(f.url, await (await ctx.request.get(f.url)).text()); const lin = skrar.get(f.url).split('\n')[f.lineNumber] || ''; butur = lin.slice(Math.max(0, f.columnNumber - 20), f.columnNumber + 170).replace(/\s+/g, ' '); } catch (_) {}
    }
    console.log(String(Math.round(a.us / 1000)).padStart(6), 'ms ', k.slice(0, 90)); if (butur) console.log('          ↳', butur);
  }
  await b.close();
})().catch((e) => { console.error('VILLA', e.message); process.exit(1); });
