// Hvað er teiknað við drátt á veggenda? Telur á framleiðslu (án skrifa): teikningar per Konva-lag ('draw'-atburður) og
// drawImage-köll eftir stærð upprunamyndar og strigans sem teiknað er á.
const { chromium } = require('C:/projects/luna-bridge/node_modules/playwright');
const BASE = process.env.BASE || 'https://slokkvitaeki.vercel.app';
const CID = process.env.CID || '532', HAED = process.env.HAED || 'hc532x170aa';
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1600, height: 1000 } });
  await ctx.route('**/*', r => { const q = r.request(); if (/supabase\.co/.test(q.url()) && !['GET', 'HEAD', 'OPTIONS'].includes(q.method())) return r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }); return r.continue(); });
  await ctx.addInitScript(() => {
    window.__di = {}; window.__telja = false;
    const orig = CanvasRenderingContext2D.prototype.drawImage;
    CanvasRenderingContext2D.prototype.drawImage = function (img, ...a) {
      if (window.__telja) { const w = img.naturalWidth || img.width || 0, h = img.naturalHeight || img.height || 0; const c = this.canvas; const k = (img.tagName || img.constructor.name) + ' ' + w + 'x' + h + ' → strigi ' + c.width + 'x' + c.height + (c.isConnected ? ' (í DOM' + (c.closest && c.closest('.kjarni-stage') ? ', stage' : '') + ')' : ' (laus)'); window.__di[k] = (window.__di[k] || 0) + 1; }
      return orig.call(this, img, ...a);
    };
  });
  const p = await ctx.newPage();
  await p.goto(BASE + '/kjarni/turbopaint?uttekt=' + CID + '&haed=' + HAED, { waitUntil: 'domcontentloaded' });
  let stodugt = 0;
  for (let i = 0; i < 300 && stodugt < 4; i++) { const ok = await p.evaluate((haed) => { const st = window.__tpStore && window.__tpStore.getState(); return !!(st && st.hydrated && !st.importProgress && st.objects.some(o => o.type === 'image' && o.uttekt && o.uttekt.haedId === haed)); }, HAED); stodugt = ok ? stodugt + 1 : 0; await p.waitForTimeout(1500); }
  await p.locator('[role="tab"][title^="Aðeins veggirnir"]').first().click();
  await p.waitForTimeout(3000);
  await p.evaluate(() => { const s = window.__tpStore.getState(); const pl = s.objects.find(o => o.type === 'image' && o.uttekt); const sc = 0.45; s.setCamera({ scale: sc, x: 700 - (pl.x + pl.width * 0.5) * sc, y: 550 - (pl.y + pl.height * 0.62) * sc }); });
  await p.waitForTimeout(1500);
  const v = await p.evaluate(() => { const s = window.__tpStore.getState(); const cam = s.camera; const cv = document.querySelector('canvas').getBoundingClientRect(); for (const o of s.objects) { if (!o.veggur || !o.points) continue; const P = o.points; const x0 = (o.x || 0) + P[0], y0 = (o.y || 0) + P[1], x1 = (o.x || 0) + P[P.length - 2], y1 = (o.y || 0) + P[P.length - 1]; const S = (x, y) => [x * cam.scale + cam.x + cv.left, y * cam.scale + cam.y + cv.top]; const a = S(x0, y0), e = S(x1, y1); const inni = (q) => q[0] > 330 && q[0] < 1250 && q[1] > 220 && q[1] < 860; if (inni(a) && inni(e) && Math.hypot(a[0] - e[0], a[1] - e[1]) > 80) return { a, e, id: o.id }; } return null; });
  await p.mouse.click((v.a[0] + v.e[0]) / 2, (v.a[1] + v.e[1]) / 2); await p.waitForTimeout(600);
  await p.evaluate(() => { const st = window.__tpKit.getRegisteredStage(); window.__lag = st.getLayers().map(() => 0); st.getLayers().forEach((l, i) => l.on('draw.telja', () => { if (window.__telja) window.__lag[i]++; })); window.__di = {}; window.__telja = true; });
  await p.mouse.move(v.e[0], v.e[1]); await p.mouse.down();
  for (let i = 0; i < 60; i++) await p.mouse.move(v.e[0] + Math.sin(i / 12) * 60, v.e[1] + i * 0.6);
  await p.mouse.up(); await p.waitForTimeout(500);
  const r = await p.evaluate(() => { window.__telja = false; const st = window.__tpKit.getRegisteredStage(); return { lag: window.__lag, born: st.getLayers().map(l => l.getChildren().length), di: window.__di, strigar: Array.from(document.querySelectorAll('canvas')).map(c => c.width + 'x' + c.height + (c.closest('.kjarni-stage') ? ' stage' : ' annað:' + ((c.parentElement && (c.parentElement.className || c.parentElement.id)) || '').toString().slice(0, 40))) }; });
  await p.evaluate(() => window.__tpStore.getState().undo && window.__tpStore.getState().undo());
  console.log('60 hreyfingar á veggenda — teikningar per lag (rúðunet, blað, annað):', JSON.stringify(r.lag), '| börn', JSON.stringify(r.born));
  console.log('drawImage-köll:'); Object.entries(r.di).sort((a, b) => b[1] - a[1]).slice(0, 12).forEach(([k, n]) => console.log('  ', String(n).padStart(5), k));
  console.log('strigar á síðunni:', JSON.stringify(r.strigar));
  await b.close();
})().catch((e) => { console.error('VILLA', e.message); process.exit(1); });
