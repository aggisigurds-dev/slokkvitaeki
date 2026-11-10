// ÖRGJÖRVI Í KYRRSTÖÐU á einu borði (sjálfgefið Vörur): skriftutími á 20 s. Viðmið: 970 ms fyrir #939, 150 ms eftir (31.10.2026).
// Keyrsla: [HUB_USER=<kaka>] NODE_PATH=/opt/node22/lib/node_modules node tools/maelingar/kyrrd-cpu.cjs — stoppar á innskráningarhliðinu.
// CPU í kyrrstöðu á borði (Vörur) fyrir og eftir opnun prófíls — sannar/afsannar að 467 vekji DomKynslod-skannana. Les aðeins.
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', proxy: { server: process.env.HTTPS_PROXY, bypass: '192.0.2.2' } });
  const context = await b.newContext({ ignoreHTTPSErrors: true, viewport: { width: 1600, height: 1000 } });
  // Valfrjálst: lögmæt seta eigandans (HttpOnly-kakan hub_user) — aðeins ef hann lætur hana í té. ÓPRÓFAÐ 10.11.2026.
  if (process.env.HUB_USER) await context.addCookies([{ name: 'hub_user', value: process.env.HUB_USER, domain: 'slokkvitaeki.netlify.app', path: '/', httpOnly: true, secure: true, sameSite: 'Lax' }]);
  await context.addInitScript(() => {
    try { Navigator.prototype.sendBeacon = function () { return true; }; } catch (_) {}
    const f = window.fetch; window.fetch = function (u, o) { return (o && o.keepalive) ? Promise.resolve(new Response('lokað')) : f.apply(this, arguments); };
  });
  let writes = 0;
  await context.route('**/*', async (route) => {
    const r = route.request(), m = r.method();
    if (m !== 'GET' && m !== 'HEAD' && m !== 'OPTIONS') { writes++; return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }); }
    for (let i = 0; i < 3; i++) { try { const resp = await route.fetch({ timeout: 60000 }); return route.fulfill({ response: resp }); } catch (e) { if (i === 2) return route.abort(); } }
  });
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page); await cdp.send('Performance.enable');
  const met = async () => { const { metrics } = await cdp.send('Performance.getMetrics'); const o = {}; for (const m of metrics) o[m.name] = m.value; return o; };
  await page.goto('https://slokkvitaeki.netlify.app/#verkbord', { waitUntil: 'domcontentloaded', timeout: 180000 });
  await page.waitForFunction(() => /innskraning/.test(location.pathname) || (window.__hula && window.App && window.DomKynslod), null, { timeout: 120000 });
  if (await page.evaluate(() => /innskraning/.test(location.pathname))) { console.log('HLIÐ LOKAÐ: /api/hub-adgangar svaraði gate:true + authed:false og appið sendi vafrann á ' + page.url().slice(0, 120) + ' — EKKERT MÆLT (innskráningar krafist; ekki farið framhjá).', 'SKRIF HLERUÐ', writes); await context.close(); await b.close(); process.exit(2); }
  await page.waitForTimeout(12000);
  async function fasi(nafn, ms) {
    await page.evaluate(() => { const D = window.DomKynslod; if (!D.__o) { D.__o = D.breytt; D.__c = {}; D.breytt = function (k) { const r = D.__o.call(D, k); if (r) D.__c[k] = (D.__c[k] || 0) + 1; return r; }; } D.__c = {};
      window.__hn = 0; window.__hmo && window.__hmo.disconnect(); const NMO = window.__NativeMutationObserver || MutationObserver;
      window.__hmo = new NMO((ms) => { window.__hn += ms.length; }); window.__hmo.observe(document.documentElement, { subtree: true, childList: true, attributes: true, characterData: true }); });
    const a = await met(); await page.waitForTimeout(ms); const z = await met();
    const r = await page.evaluate(() => ({ breytt: Object.entries(window.DomKynslod.__c).sort((a, b) => b[1] - a[1]), n: window.__hn, hsp: !!document.getElementById('_hsp-spjald') }));
    const d = (k) => Math.round((z[k] - a[k]) * 1000);
    console.log(`\n== ${nafn} (${ms / 1000} s): Script ${d('ScriptDuration')} ms · Task ${d('TaskDuration')} ms · Layout ${d('LayoutDuration')} ms · Style ${d('RecalcStyleDuration')} ms · DOM-breytingar ${r.n} · _hsp-spjald til: ${r.hsp}`);
    console.log('   DomKynslod.breytt()=true per lykil: ' + r.breytt.length + ' lyklar, ' + r.breytt.reduce((s, x) => s + x[1], 0) + ' umferðir · efstu: ' + JSON.stringify(r.breytt.slice(0, 8)));
  }
  await page.evaluate(() => App.switchView('vorur')); await page.waitForTimeout(8000);
  await fasi('Vörur — enginn prófíll opnaður enn', 30000);
  await page.evaluate(() => window._openCompanySafe(192)); await page.waitForTimeout(10000);
  await page.evaluate(() => App.switchView('vorur')); await page.waitForTimeout(8000);
  await fasi('Vörur — eftir að prófíll 192 var opnaður', 30000);
  console.log('SKRIF HLERUÐ', writes);
  await context.close(); await b.close();
})().catch((e) => { console.error('BRAST', e); process.exit(1); });
