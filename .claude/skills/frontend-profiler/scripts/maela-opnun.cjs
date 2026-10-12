// CPU-prófíll á opnun fyrirtækjaprófíls úr Ársskoðun (staðbundið, óbúntaðir pappar → hver skrá sést). Skrif hleruð.
// Keyrsla (Claude Code remote): í rót repo-sins `python3 -m http.server 8787 --bind 0.0.0.0` (bakgrunnur), síðan
//   PDIR=/tmp/ut/ IDS=193,1316 NODE_PATH=/opt/node22/lib/node_modules node .claude/skills/frontend-profiler/scripts/maela-opnun.cjs
// IP gámsins (`hostname -I`) í BASE ef hún er ekki 192.0.2.2. Greining: greina-cpu.cjs / greina-lotur.cjs á cpu-<id>.cpuprofile.
const { chromium } = require('playwright');
const fs = require('fs');
const BASE = process.env.BASE || 'http://192.0.2.2:8787/';
const IDS = (process.env.IDS || '193,1316').split(',').map(Number);
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', proxy: { server: process.env.HTTPS_PROXY, bypass: '192.0.2.2' } });
  const context = await b.newContext({ ignoreHTTPSErrors: true, viewport: { width: 1600, height: 1000 } });
  await context.route('**/*', async (route) => {
    const r = route.request(), u = r.url(), m = r.method();
    if (m !== 'GET' && m !== 'HEAD' && m !== 'OPTIONS' && (u.includes('supabase.co') || u.includes('/api/') || u.includes('/.netlify/'))) return route.fulfill({ status: 200, contentType: 'application/json', body: u.includes('/rpc/') ? 'null' : '[]' });
    if (u.startsWith(BASE) && /\/(\.netlify\/functions|api)\//.test(u)) { try { const resp = await route.fetch({ url: u.replace(BASE, 'https://slokkvitaeki.netlify.app/'), timeout: 60000 }); return route.fulfill({ response: resp }); } catch (_) { return route.abort(); } }
    if (u.startsWith('http://192.0.2.2')) return route.continue();
    for (let i = 0; i < 3; i++) { try { const resp = await route.fetch({ timeout: 60000 }); return route.fulfill({ response: resp }); } catch (e) { if (i === 2) return route.abort(); } }
  });
  const page = await context.newPage();
  let iFlugi = 0, sidastaNet = Date.now();
  page.on('request', (r) => { if (/supabase\.co|\/api\/|\.netlify\/functions/.test(r.url())) { iFlugi++; sidastaNet = Date.now(); } });
  const lokid = (r) => { if (/supabase\.co|\/api\/|\.netlify\/functions/.test(r.url())) { iFlugi = Math.max(0, iFlugi - 1); sidastaNet = Date.now(); } };
  page.on('requestfinished', lokid); page.on('requestfailed', lokid);
  await page.addInitScript(() => {
    window.__lt = []; window.__sidMut = performance.now(); try { performance.setResourceTimingBufferSize(3000); } catch (_) {}   // 475 skriftur fylla sjálfgefna 250-biðminnið
    try { new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__lt.push({ s: e.startTime, d: e.duration }); }).observe({ type: 'longtask', buffered: true }); } catch (_) {}
    const byrja = () => new MutationObserver(() => { window.__sidMut = performance.now(); }).observe(document.documentElement, { childList: true, subtree: true, attributes: true, characterData: true });
    if (document.documentElement) byrja(); else document.addEventListener('DOMContentLoaded', byrja);
  });
  async function bidaKyrrstodu(kyrr, thak) { const t0 = Date.now(); while (Date.now() - t0 < thak) { const s = await page.evaluate(() => performance.now() - window.__sidMut); if (s >= kyrr && iFlugi === 0 && Date.now() - sidastaNet >= kyrr) return { ms: Date.now() - t0, thak: false }; await page.waitForTimeout(100); } return { ms: Date.now() - t0, thak: true }; }
  await page.goto(BASE + '#arsskodun', { waitUntil: 'domcontentloaded', timeout: 180000 });
  await page.waitForSelector('#view-arsskodun ._ars-row[data-co-id]', { timeout: 150000 });
  console.log('Ársskoðun hlaðin; kyrrstaða', JSON.stringify(await bidaKyrrstodu(1500, 90000)));
  console.log('ÚTGÁFA', JSON.stringify(await page.evaluate(() => performance.getEntriesByType('resource').map((e) => e.name).filter((n) => /409-samraeming|411-thett/.test(n)).map((n) => n.split('/').pop()))));
  const cdp = await context.newCDPSession(page);
  await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', { interval: 500 });
  for (const id of IDS) {
    await page.evaluate(() => App.switchView('arsskodun')); await bidaKyrrstodu(1000, 30000);
    const t0 = await page.evaluate(() => performance.now());
    await cdp.send('Profiler.start');
    await page.evaluate((i) => window._openCompanySafe(i), id);
    await page.waitForFunction((i) => { const m = document.getElementById('companies-main'); return window.Companies && Companies.currentId === i && m && m.querySelector('.co-banner'); }, id, { timeout: 30000 });
    const k = await bidaKyrrstodu(1000, 40000);
    const { profile } = await cdp.send('Profiler.stop');
    const lt = await page.evaluate((t) => window.__lt.filter((x) => x.s >= t), t0);
    fs.writeFileSync((process.env.PDIR || './') + `cpu-${id}.cpuprofile`, JSON.stringify(profile));
    // Sjálfstími per hnút
    const byId = new Map(profile.nodes.map((n) => [n.id, n])); const self = new Map();
    for (let i = 0; i < profile.samples.length; i++) self.set(profile.samples[i], (self.get(profile.samples[i]) || 0) + (profile.timeDeltas[i] || 0) / 1000);
    const parent = new Map(); for (const n of profile.nodes) for (const c of (n.children || [])) parent.set(c, n.id);
    const skra = (u) => (u || '').replace(BASE, '').replace(/\?.*$/, '') || '(innbyggt)';
    const perSkra = {}, perFall = {}, inclSkra = {};
    for (const [nid, ms] of self) {
      const n = byId.get(nid), cf = n.callFrame; const s = cf.url ? skra(cf.url) : cf.functionName || '(?)';
      perSkra[s] = (perSkra[s] || 0) + ms;
      const f = s + ' ' + (cf.functionName || '(nafnlaust)') + ':' + (cf.lineNumber + 1); perFall[f] = (perFall[f] || 0) + ms;
      // Inclusive per skrá: hver pappaskrá í kallakeðjunni fær tímann einu sinni
      const sed = new Set(); let p = nid; while (p != null) { const pn = byId.get(p); if (pn && pn.callFrame.url && /js\//.test(pn.callFrame.url)) sed.add(skra(pn.callFrame.url)); p = parent.get(p); }
      for (const x of sed) inclSkra[x] = (inclSkra[x] || 0) + ms;
    }
    const alls = [...self.values()].reduce((a, b) => a + b, 0);
    const top = (o, n) => Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, v]) => Math.round(v) + ' ms  ' + k);
    console.log(`\n=== id=${id} — kyrrstaða ${k.ms} ms ${k.thak ? '(ÞAK)' : ''} · langar tasks ${lt.length}, samtals ${Math.round(lt.reduce((a, x) => a + x.d, 0))} ms · sýni samtals ${Math.round(alls)} ms ===`);
    console.log('-- SJÁLFSTÍMI per skrá/flokk --\n ' + top(perSkra, 22).join('\n '));
    console.log('-- INNIFALINN tími per pappaskrá (skráin einhvers staðar í kallakeðjunni) --\n ' + top(inclSkra, 30).join('\n '));
    console.log('-- SJÁLFSTÍMI per fall --\n ' + top(perFall, 30).join('\n '));
  }
  await b.close();
})().catch((e) => { console.error('MÆLING BRAST', e); process.exit(1); });
