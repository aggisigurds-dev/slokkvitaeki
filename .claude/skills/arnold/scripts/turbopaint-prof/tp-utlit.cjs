// Útlit í 3D á framleiðslu, án skrifa: opna hæð → 3D → Útlit-reitur til? velja parket + veggjalit → vistast í uttekt.utlit3d á borðinu?
// sviðið endurbyggist án villna? Skjáskot reynt (WebGL í SwiftShader getur tímað út — ekki krafa).
const { chromium } = require('C:/projects/luna-bridge/node_modules/playwright');
const path = require('path');
const BASE = process.env.BASE || 'https://slokkvitaeki.vercel.app';
const CID = process.env.CID || '532', HAED = process.env.HAED || 'hc532x170aa';
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const ctx = await b.newContext({ viewport: { width: 1700, height: 950 } });
  const skrif = [];
  await ctx.route('**/*', r => { const q = r.request(); if (/supabase\.co/.test(q.url()) && !['GET', 'HEAD', 'OPTIONS'].includes(q.method())) { skrif.push(q.method() + ' ' + q.url().replace(/\?.*$/, '').slice(-40)); return r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }); } return r.continue(); });
  const p = await ctx.newPage(); const villur = [];
  p.on('pageerror', e => villur.push(String(e).slice(0, 160)));
  await p.goto(BASE + '/kjarni/turbopaint?uttekt=' + CID + '&haed=' + HAED, { waitUntil: 'domcontentloaded' });
  for (let i = 0; i < 120; i++) { const ok = await p.evaluate(() => !!(window.__tpStore && window.__tpStore.getState().hydrated && window.__tpStore.getState().objects.some(o => o.type === 'image'))); if (ok) break; await p.waitForTimeout(1000); }
  await p.waitForTimeout(5000);
  const smellt = await p.evaluate(() => { const k = Array.from(document.querySelectorAll('[data-greining-stika-takki="3d"]')); const syn = k.find(e => e.getBoundingClientRect().width > 0) || k[0]; if (!syn) return 'enginn 3D-takki'; syn.click(); return k.length + ' takkar, smellt á ' + (syn.getBoundingClientRect().width > 0 ? 'sýnilegan' : 'falinn'); });
  console.log('3D-takki:', smellt);
  for (let i = 0; i < 60; i++) { if (await p.locator('[data-utlit3d-golf]').count()) break; await p.waitForTimeout(1000); }
  const til = await p.locator('[data-utlit3d-golf]').count();
  console.log('Útlit-reitur í 3D:', til ? 'til' : 'VANTAR');
  if (!til) { console.log('villur:', villur.slice(0, 4)); await p.screenshot({ path: path.join(require('os').tmpdir(), 'utlit-vantar.png') }).catch(() => {}); await b.close(); process.exit(2); }
  await p.selectOption('[data-utlit3d-golf]', 'parket');
  await p.waitForTimeout(500);
  await p.locator('[data-utlit3d-veggir]').fill('#dfe6ee');
  await p.waitForTimeout(6000);
  const st = await p.evaluate(() => window.__tpStore.getState().objects.filter(o => o.type === 'image' && o.uttekt).map(o => o.uttekt.utlit3d));
  console.log('uttekt.utlit3d á borðinu:', JSON.stringify(st));
  console.log('villur:', villur.slice(0, 4), '| skrif gripin:', skrif.length);
  try { await p.screenshot({ path: path.join(require('os').tmpdir(), 'utlit-3d.png'), timeout: 20000 }); console.log('skjáskot: utlit-3d.png í tímabundnu möppunni'); } catch (e) { console.log('skjáskot tímaði út (WebGL í SwiftShader) — ekki krafa'); }
  await b.close();
  process.exit(st.length && st.every(u => u && u.golf === 'parket' && u.veggir === '#dfe6ee') ? 0 : 1);
})().catch((e) => { console.error('VILLA', e.message); process.exit(1); });
