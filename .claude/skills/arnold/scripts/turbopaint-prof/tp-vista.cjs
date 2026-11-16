// „Vista í úttekt" á framleiðslu eftir breytingar kvöldsins (opnun í skoðun / beint): fer vistunin af stað? Skrifin eru GRIPIN
// (ekkert vistast) en skráð: við viljum sjá skrif í turbopaint_boards (borðið verður til) OG teikning_bord (hæðin).
const { chromium } = require('C:/projects/luna-bridge/node_modules/playwright');
const BASE = process.env.BASE || 'https://slokkvitaeki.vercel.app';
const CID = process.env.CID || '532', HAED = process.env.HAED || 'hc532x170aa';
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1600, height: 1000 } });
  const skrif = [];
  await ctx.route('**/*', r => { const q = r.request(), u = q.url(), m = q.method(); if (/supabase\.co/.test(u) && !['GET', 'HEAD', 'OPTIONS'].includes(m)) { skrif.push(m + ' ' + u.replace(/\?.*$/, '').replace(/^https:\/\/[^/]+/, '').slice(0, 60)); return r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }); } return r.continue(); });
  const p = await ctx.newPage(); const villur = [];
  p.on('pageerror', e => villur.push(String(e).slice(0, 160)));
  await p.goto(BASE + '/kjarni/turbopaint?uttekt=' + CID + '&haed=' + HAED, { waitUntil: 'domcontentloaded' });
  let stodugt = 0;
  for (let i = 0; i < 300 && stodugt < 4; i++) { const ok = await p.evaluate((haed) => { const st = window.__tpStore && window.__tpStore.getState(); return !!(st && st.hydrated && !st.importProgress && st.objects.some(o => o.type === 'image' && o.uttekt && o.uttekt.haedId === haed)); }, HAED); stodugt = ok ? stodugt + 1 : 0; await p.waitForTimeout(1500); }
  const st0 = await p.evaluate(() => ({ skodun: window.__tpSkodun.getState().virk, hlutir: window.__tpStore.getState().objects.length }));
  console.log('opnað:', JSON.stringify(st0), '| skrif við opnun:', skrif.length);
  await p.waitForTimeout(7000);   // opnunar-toastið („Ýttu á Vista í úttekt…") farið
  const takkar = p.locator('button', { hasText: 'Vista í úttekt' });
  console.log('takkar með „Vista í úttekt":', await takkar.count());
  await takkar.first().click(); await p.waitForTimeout(10000);
  const texti = await p.evaluate(() => document.body.innerText.replace(/\s+/g, ' '));
  const m = texti.match(/(Vistað[^.]{0,120}|Ekkert var skrifað[^.]{0,80}|Vistun brást[^.]{0,120})/);
  console.log('eftir „Vista í úttekt": skoðun', await p.evaluate(() => window.__tpSkodun.getState().virk), '| skilaboð:', m ? m[0] : '(engin fundin)');
  console.log('skrif gripin:', JSON.stringify(skrif));
  console.log('villur:', villur.slice(0, 3));
  await b.close();
})().catch((e) => { console.error('VILLA', e.message); process.exit(1); });
