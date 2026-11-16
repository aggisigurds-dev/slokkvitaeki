// Keyrir Greininguna (sjálfvirka verkferlið án EI/tækja) á úttektarhæð á framleiðslu með útlínu hússins setta beint í
// borðið (uttekt.husUtlina = skurður hæðarinnar, 1 % inn fyrir) — án þess að vista. VEL=1 hleypir verkbeiðni veggjavélarinnar
// (automation_triggers INSERT) í gegn; öll önnur skrif eru gripin.
const { chromium } = require('C:/projects/luna-bridge/node_modules/playwright');
const path = require('path');
const BASE = process.env.BASE || 'https://slokkvitaeki.vercel.app';
const CID = process.env.CID || '219', HAED = process.env.HAED || 'hc219x4b8e2', MERKI = process.env.MERKI || 'greina';
const UTLINA = process.env.UTLINA !== '0';
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1600, height: 1000 } });
  const skrif = [];
  await ctx.route('**/*', r => {
    const q = r.request(), u = q.url(), m = q.method();
    if (/supabase\.co/.test(u) && !['GET', 'HEAD', 'OPTIONS'].includes(m)) {
      if (process.env.VEL === '1' && m === 'POST' && /\/rest\/v1\/automation_triggers/.test(u)) { skrif.push('LEYFT automation_triggers'); return r.continue(); }
      skrif.push(m); return r.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    }
    return r.continue();
  });
  const p = await ctx.newPage(); const villur = [];
  p.on('pageerror', e => villur.push(String(e).slice(0, 160)));
  await p.goto(BASE + '/kjarni/turbopaint?uttekt=' + CID + '&haed=' + HAED, { waitUntil: 'domcontentloaded' });
  // bíða þar til hæðin sjálf er komin á borðið og innflutningi lokið — stöðugt í 5 mælingar (síðasta borðið birtist fyrst)
  let stodugt = 0;
  for (let i = 0; i < 300 && stodugt < 5; i++) {
    const ok = await p.evaluate((haed) => { const st = window.__tpStore && window.__tpStore.getState(); return !!(st && st.hydrated && !st.importProgress && st.objects.some(o => o.type === 'image' && o.uttekt && o.uttekt.haedId === haed)); }, HAED);
    stodugt = ok ? stodugt + 1 : 0;
    await p.waitForTimeout(2000);
  }
  if (stodugt < 5) { console.log('HÆÐIN KOM EKKI á borðið'); await b.close(); process.exit(2); }
  await p.locator('[role="tab"][title^="Aðeins veggirnir"]').first().click();
  await p.waitForTimeout(2000);
  if (UTLINA) {
    const u = await p.evaluate(() => {
      const s = window.__tpStore.getState(); const pl = s.objects.find(o => o.type === 'image' && o.uttekt); const t = pl.uttekt;
      const sk = t.skurdur && t.skurdur.w > 8 ? t.skurdur : { x: 0, y: 0, w: t.frumB, h: t.frumH };
      const x0 = pl.x + (sk.x / t.frumB) * pl.width, y0 = pl.y + (sk.y / t.frumH) * pl.height, w = (sk.w / t.frumB) * pl.width, h = (sk.h / t.frumH) * pl.height, m = 0.01;
      const ut = [x0 + w * m, y0 + h * m, x0 + w * (1 - m), y0 + h * m, x0 + w * (1 - m), y0 + h * (1 - m), x0 + w * m, y0 + h * (1 - m)];
      s.patchObject(pl.id, { uttekt: { ...t, husUtlina: ut } }, false);
      return { sk, ut: ut.map(Math.round) };
    });
    console.log('útlína sett (borðhnit):', JSON.stringify(u.ut), '| skurður hæðar:', JSON.stringify(u.sk));
  }
  await p.click('[data-greining-takki]');
  await p.waitForTimeout(1500);
  for (const h of ['ei', 'taeki']) { const c = p.locator('[data-greining-hopur="' + h + '"]'); if (await c.count() && await c.isChecked()) await c.uncheck(); }
  await p.click('[data-greining-keyra]');
  let buid = false;
  for (let i = 0; i < 500 && !buid; i++) { await p.waitForTimeout(2000); buid = await p.evaluate(() => /Fann \d+ veggi/.test(document.body.innerText)); }
  await p.waitForTimeout(3000);
  const t = await p.evaluate(() => document.body.innerText);
  const NL = String.fromCharCode(10);
  t.split(NL).filter((x) => /Veggjavél|þunnir|utan húss|Skorið að|Húsið fundið|Skurður hæðarinnar|skurðurinn heldur|Fann \d+ veggi|sameinaðir|hillur|hurðir ·|Veggir \d+/.test(x)).slice(0, 12).forEach((x) => console.log('  ', x.trim().slice(0, 260)));
  // loka spjaldinu og sýna allt húsið
  await p.keyboard.press('Escape'); await p.waitForTimeout(500);
  const lok = p.locator('[aria-label="Loka"], button:has-text("×")').first(); if (await lok.count()) await lok.click().catch(() => {});
  await p.evaluate(() => { const s = window.__tpStore.getState(); const pl = s.objects.find(o => o.type === 'image' && o.uttekt); const sc = Math.min(1300 / pl.width, 780 / pl.height); s.setCamera({ scale: sc, x: 40 - pl.x * sc, y: 150 - pl.y * sc }); });
  await p.waitForTimeout(1500);
  await p.screenshot({ path: path.join(require('os').tmpdir(), MERKI + '.png') });
  console.log('skrif:', skrif.length, JSON.stringify(skrif.filter(x => /LEYFT/.test(x))), '| villur:', villur.slice(0, 3));
  await b.close();
})().catch((e) => { console.error('VILLA', e.message); process.exit(1); });
