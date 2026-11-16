// Löng verk (longtask) á aðalþræði TurboPaint Í OPNUN úttektarhæðar (innflutningur blaðsins) á framleiðslu, án skrifa.
// Tekur líka skjáskot af borðinu (2D) til sjónræns samanburðar fyrir/eftir. Keyrt fyrir og eftir PR (TIF-lok í þræði).
const { chromium } = require('C:/projects/luna-bridge/node_modules/playwright');
const path = require('path');
const BASE = process.env.BASE || 'https://slokkvitaeki.vercel.app';
const CID = process.env.CID || '219', HAED = process.env.HAED || 'hc219x4b8e2', MERKI = process.env.MERKI || 'fyrir';
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1600, height: 1000 } });
  await ctx.route('**/*', r => { const q = r.request(); if (/supabase\.co/.test(q.url()) && !['GET', 'HEAD', 'OPTIONS'].includes(q.method())) return r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }); return r.continue(); });
  await ctx.addInitScript(() => {
    window.__lt = []; window.__con = [];
    const oi = console.info.bind(console); console.info = (...a) => { const t = a.map(String).join(' '); if (/\[skonnun\]/.test(t)) window.__con.push(t.slice(0, 200)); oi(...a); };
    try { new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__lt.push({ t: Math.round(e.startTime), ms: Math.round(e.duration) }); }).observe({ entryTypes: ['longtask'] }); } catch (_) {}
  });
  const p = await ctx.newPage();
  await p.goto(BASE + '/kjarni/turbopaint?uttekt=' + CID + '&haed=' + HAED, { waitUntil: 'domcontentloaded' });
  let komin = 0, stodugt = 0;
  for (let i = 0; i < 400 && stodugt < 4; i++) {
    const ok = await p.evaluate((haed) => { const st = window.__tpStore && window.__tpStore.getState(); return !!(st && st.hydrated && !st.importProgress && st.objects.some(o => o.type === 'image' && o.uttekt && o.uttekt.haedId === haed)); }, HAED);
    if (ok && !stodugt) komin = await p.evaluate(() => Math.round(performance.now()));
    stodugt = ok ? stodugt + 1 : 0;
    await p.waitForTimeout(1000);
  }
  await p.waitForTimeout(4000);
  const r = await p.evaluate(() => { const s = window.__tpStore.getState(); const m = s.objects.find(o => o.type === 'image' && o.uttekt); return { lt: window.__lt.slice(), con: window.__con.slice(), mynd: m ? { w: Math.round(m.width), h: Math.round(m.height) } : null, hlutir: s.objects.length, nafn: s.name, skodun: window.__tpSkodun ? window.__tpSkodun.getState().virk : null }; });
  const stor = r.lt.filter(x => x.ms >= 100);
  console.log(MERKI, '| hæðin á borði eftir', komin, 'ms | mynd', JSON.stringify(r.mynd), '| hlutir', r.hlutir, '|', r.nafn, '| skoðun', r.skodun);
  console.log('  löng verk ≥100 ms:', stor.length, JSON.stringify(stor), '| samtals', stor.reduce((a, x) => a + x.ms, 0), 'ms | lengsta', Math.max(0, ...r.lt.map(x => x.ms)), 'ms');
  console.log('  [skonnun]:', r.con.slice(0, 3).join(' || ').slice(0, 300));
  await p.screenshot({ path: path.join(require('os').tmpdir(), 'opnun-' + MERKI + '.png') });
  await b.close();
})().catch((e) => { console.error('VILLA', e.message); process.exit(1); });
