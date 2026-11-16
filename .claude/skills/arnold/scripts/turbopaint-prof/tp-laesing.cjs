// Sannreynir á framleiðslu, án skrifa: (1) veggjaritillinn læsir EKKI laginu „Teikning" sjálfkrafa (PR #292);
// (2) eftir PR #296: opnun úttektarhæðar býr EKKI til borð (engin POST í turbopaint_boards / geymslu) fyrr en breytt er.
const { chromium } = require('C:/projects/luna-bridge/node_modules/playwright');
const BASE = process.env.BASE || 'https://slokkvitaeki.vercel.app';
const CID = process.env.CID || '532', HAED = process.env.HAED || 'hc532x170aa';
const BREYTA = process.env.BREYTA === '1';
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1600, height: 1000 } });
  const skrif = [];
  await ctx.route('**/*', r => {
    const q = r.request(), u = q.url(), m = q.method();
    if (/supabase\.co/.test(u) && !['GET', 'HEAD', 'OPTIONS'].includes(m)) { skrif.push(m + ' ' + u.replace(/\?.*$/, '').replace(/^https:\/\/[^/]+/, '')); return r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }); }
    return r.continue();
  });
  const p = await ctx.newPage(); const villur = [];
  p.on('pageerror', e => villur.push(String(e).slice(0, 160)));
  await p.goto(BASE + '/kjarni/turbopaint?uttekt=' + CID + '&haed=' + HAED, { waitUntil: 'domcontentloaded' });
  for (let i = 0; i < 120; i++) { const ok = await p.evaluate(() => !!(window.__tpStore && window.__tpStore.getState().hydrated && window.__tpStore.getState().objects.some(o => o.type === 'image'))); if (ok) break; await p.waitForTimeout(1000); }
  await p.waitForTimeout(4000);
  const st = () => p.evaluate(() => { const s = window.__tpStore.getState(); const sk = window.__tpSkodun ? window.__tpSkodun.getState() : null; return { nafn: s.name, hlutir: s.objects.length, laest: (s.layers || []).map(l => l.id + ':' + (l.locked ? 'LÆST' : 'opið')).join(' '), skodun: sk ? { virk: sk.virk, uttekt: sk.uttekt } : null, sync: s.syncState }; });
  console.log('opnað:', JSON.stringify(await st()));
  console.log('skrif við opnun:', skrif.length, skrif);
  // Veggir-flipinn → ritillinn opnast
  const tab = p.locator('[role="tab"][title^="Aðeins veggirnir"]').first();
  if (await tab.count()) { await tab.click(); await p.waitForTimeout(2000); console.log('ritill opinn:', JSON.stringify(await st())); }
  const ritillVirkur = await p.evaluate(() => !!document.querySelector('[data-veggir-hus], [data-veggir-skekkja-sjalf]'));
  console.log('veggjaritill virkur:', ritillVirkur);
  if (BREYTA) {
    // fyrsta breytingin: einn veggur færður um 1 px gegnum store-ið (sama og dráttur) — á að búa borðið til
    const fyrir = skrif.length;
    await p.evaluate(() => { const s = window.__tpStore.getState(); const v = s.objects.find(o => o.type === 'line' || o.type === 'polyline') || s.objects.find(o => o.type !== 'image'); if (!v) return; s.commitHistory && s.commitHistory(); s.patchObject(v.id, { x: (v.x || 0) + 1 }, true); });
    await p.waitForTimeout(6000);
    console.log('eftir breytingu:', JSON.stringify(await st()));
    console.log('skrif eftir breytingu:', skrif.slice(fyrir));
  }
  console.log('villur:', villur.slice(0, 4));
  await b.close();
})().catch((e) => { console.error('VILLA', e.message); process.exit(1); });
