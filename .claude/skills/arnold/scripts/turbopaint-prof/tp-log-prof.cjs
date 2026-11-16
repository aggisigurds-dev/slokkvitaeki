// Virknipróf eftir lagaskiptinguna (teikningin í eigin Konva-lagi), framleiðsla, án skrifa:
//  1) lögin: fjöldi laga, mynd í sínu lagi, veggir/tákn í hinu, röð rétt (mynd undir)
//  2) tákn dregið með músinni → hnit breytast    3) veggur valinn í Slökkvitækjaham (smellur) → selectedIds
//  4) myndin valin (smellur á autt svæði blaðsins) → Transformer festist á hana    5) útflutningur: stage.toDataURL skilar mynd með efni
//  6) skjáskot
const { chromium } = require('C:/projects/luna-bridge/node_modules/playwright');
const path = require('path');
const BASE = process.env.BASE || 'https://slokkvitaeki.vercel.app';
const CID = process.env.CID || '532', HAED = process.env.HAED || 'hc532x170aa';
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1600, height: 1000 } });
  await ctx.route('**/*', r => { const q = r.request(); if (/supabase\.co/.test(q.url()) && !['GET', 'HEAD', 'OPTIONS'].includes(q.method())) return r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }); return r.continue(); });
  const p = await ctx.newPage(); const villur = [];
  p.on('pageerror', e => villur.push(String(e).slice(0, 200)));
  p.on('console', m => { if (m.type() === 'error' || /Konva/.test(m.text())) villur.push(m.type() + ': ' + m.text().slice(0, 160)); });
  await p.goto(BASE + '/kjarni/turbopaint?uttekt=' + CID + '&haed=' + HAED, { waitUntil: 'domcontentloaded' });
  let stodugt = 0;
  for (let i = 0; i < 300 && stodugt < 4; i++) { const ok = await p.evaluate((haed) => { const st = window.__tpStore && window.__tpStore.getState(); return !!(st && st.hydrated && !st.importProgress && st.objects.some(o => o.type === 'image' && o.uttekt && o.uttekt.haedId === haed)); }, HAED); stodugt = ok ? stodugt + 1 : 0; await p.waitForTimeout(1500); }
  await p.waitForTimeout(3000);
  const stage = () => p.evaluate(() => { const st = window.__tpKit.getRegisteredStage(); const s = window.__tpStore.getState(); const L = st.getLayers(); return { log: L.length, born: L.map(l => l.getChildren().length), myndIlagi: L.findIndex(l => l.find('Image').some(n => n.width() > 1000)), fyrstaAnnad: (() => { const o = s.objects.find(x => x.type !== 'image'); if (!o) return -1; const n = st.findOne('#' + o.id); return n ? L.indexOf(n.getLayer()) : -2; })(), strigar: document.querySelectorAll('.kjarni-stage canvas').length }; });
  console.log('1) lög:', JSON.stringify(await stage()));
  // 2) tákn dregið
  const takn = await p.evaluate(() => { const s = window.__tpStore.getState(); const cam = s.camera; const cv = document.querySelector('.kjarni-stage canvas').getBoundingClientRect(); const o = s.objects.find(x => x.type === 'symbol' && !x.locked); if (!o) return null; return { id: o.id, x: o.x, y: o.y, sx: (o.x + (o.size || 40) / 2) * cam.scale + cam.x + cv.left, sy: (o.y + (o.size || 40) / 2) * cam.scale + cam.y + cv.top }; });
  if (takn && takn.sx > 60 && takn.sx < 1300 && takn.sy > 150 && takn.sy < 900) {
    await p.mouse.move(takn.sx, takn.sy); await p.mouse.down(); for (let i = 1; i <= 12; i++) await p.mouse.move(takn.sx + i * 4, takn.sy + i * 2); await p.mouse.up(); await p.waitForTimeout(500);
    const e = await p.evaluate((id) => { const o = window.__tpStore.getState().objects.find(x => x.id === id); return { x: o.x, y: o.y }; }, takn.id);
    console.log('2) tákn dregið:', Math.round(takn.x) + ',' + Math.round(takn.y), '→', Math.round(e.x) + ',' + Math.round(e.y), (Math.abs(e.x - takn.x) > 5 ? '✓ færðist' : '✗ færðist EKKI'));
    await p.evaluate(() => window.__tpStore.getState().undo && window.__tpStore.getState().undo());
  } else console.log('2) ekkert tákn á skjánum (sleppt)', JSON.stringify(takn));
  // 3) myndin valin: smellur á autt horn blaðsins → Transformer
  const mynd = await p.evaluate(() => { const s = window.__tpStore.getState(); const cam = s.camera; const cv = document.querySelector('.kjarni-stage canvas').getBoundingClientRect(); const pl = s.objects.find(o => o.type === 'image' && o.uttekt); return { id: pl.id, sx: (pl.x + pl.width * 0.03) * cam.scale + cam.x + cv.left, sy: (pl.y + pl.height * 0.5) * cam.scale + cam.y + cv.top, locked: !!pl.locked }; });
  await p.mouse.click(mynd.sx, mynd.sy); await p.waitForTimeout(500);
  const val = await p.evaluate((id) => { const st = window.__tpKit.getRegisteredStage(); const tr = st.find('Transformer'); return { valin: window.__tpStore.getState().selectedIds.includes(id), transformerar: tr.length, hnutar: tr.map(t => t.nodes().length) }; }, mynd.id);
  console.log('3) myndin valin með smelli:', JSON.stringify(val), '| læst:', mynd.locked);
  await p.keyboard.press('Escape');
  // 4) útflutningur stage
  const ut = await p.evaluate(() => { const st = window.__tpKit.getRegisteredStage(); const url = st.toDataURL({ pixelRatio: 0.5 }); return { lengd: url.length, png: url.startsWith('data:image/png') }; });
  console.log('4) stage.toDataURL:', JSON.stringify(ut));
  await p.screenshot({ path: path.join(require('os').tmpdir(), 'log-prof.png') });
  console.log('villur:', JSON.stringify(villur.slice(0, 5)));
  await b.close();
})().catch((e) => { console.error('VILLA', e.message); process.exit(1); });
