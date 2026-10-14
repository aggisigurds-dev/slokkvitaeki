#!/usr/bin/env node
'use strict';
/* Lekur hleruð skrif við lokun? — MAELINGAR.md kafli 17 (14.10.2026).
 *
 * Mæliskriftin hlera skrif með context.route() og falsa svarið. Þessi prófun sýnir að
 * keepalive-fetch og sendBeacon sem fara af stað við pagehide/visibilitychange ná samt
 * á þjóninn þegar síðunni er lokað eða hún endurhlaðin — og hvaða vörn heldur.
 *
 * Keyrsla (Claude Code remote):
 *   NODE_PATH=/opt/node22/lib/node_modules node tools/maelingar/leki-vid-lokun.cjs
 * Staðbundinn þjónn á IP gámsins (hostname -I) svo hann fari ekki um proxy-inn.
 * Snertir ekkert utan gámsins.
 */
const http = require('http');
const os = require('os');
const { chromium } = require('playwright');

const SIDA = `<!doctype html><html><body>leki<script>
addEventListener('pagehide', function () {
  try { fetch('/skrif?leid=pagehide-keepalive', { method: 'POST', keepalive: true, body: 'x' }); } catch (e) {}
  try { navigator.sendBeacon('/skrif?leid=beacon', 'x'); } catch (e) {}
});
addEventListener('visibilitychange', function () {
  if (document.visibilityState === 'hidden') { try { fetch('/skrif?leid=hidden-keepalive', { method: 'POST', keepalive: true, body: 'x' }); } catch (e) {} }
});
</script></body></html>`;

const IP = (Object.values(os.networkInterfaces()).flat().find(i => i && i.family === 'IPv4' && !i.internal) || {}).address || '127.0.0.1';
const komid = [];
const thjonn = http.createServer((req, res) => {
  if (req.method === 'POST') { komid.push(req.url.split('leid=')[1]); req.resume(); res.end('ok'); return; }
  res.setHeader('content-type', 'text/html; charset=utf-8'); res.end(SIDA);
});

(async () => {
  await new Promise(r => thjonn.listen(0, IP, r));
  const SLOD = `http://${IP}:${thjonn.address().port}/`;
  const nidurstada = {};
  for (const vorn of ['engin', 'setOffline', 'initScript']) {
    for (const hvernig of ['page.close', 'context.close', 'reload']) {
      const b = await chromium.launch(Object.assign(
        { executablePath: process.env.PW_CHROMIUM || '/opt/pw-browsers/chromium' },
        process.env.HTTPS_PROXY ? { proxy: { server: process.env.HTTPS_PROXY, bypass: IP } } : {}));
      const context = await b.newContext();
      if (vorn === 'initScript') await context.addInitScript(() => {
        try { navigator.sendBeacon = function () { return true; }; } catch (e) {}
        const f = window.fetch;
        window.fetch = function (u, o) { return (o && o.keepalive) ? Promise.resolve(new Response('lokað')) : f.apply(this, arguments); };
      });
      await context.route('**/*', route => {
        const m = route.request().method();
        return (m !== 'GET' && m !== 'HEAD' && m !== 'OPTIONS') ? route.fulfill({ status: 200, body: 'falsað' }) : route.continue();
      });
      const page = await context.newPage();
      await page.goto(SLOD);
      await page.waitForTimeout(400);
      const fyrir = komid.length;
      if (vorn === 'setOffline') await context.setOffline(true);
      if (hvernig === 'page.close') await page.close({ runBeforeUnload: true });
      if (hvernig === 'context.close') await context.close();
      if (hvernig === 'reload') { try { await page.reload({ timeout: 4000 }); } catch (e) {} }
      await new Promise(r => setTimeout(r, 1500));
      await b.close().catch(() => {});
      await new Promise(r => setTimeout(r, 800));
      const lak = komid.slice(fyrir);
      nidurstada[vorn + ' / ' + hvernig] = lak.length;
      console.log(vorn.padEnd(11), hvernig.padEnd(14), lak.length ? lak.length + ' lak: ' + lak.join(', ') : '0');
    }
  }
  thjonn.close();
  const initLak = Object.entries(nidurstada).filter(([k, n]) => k.startsWith('initScript') && n > 0);
  if (initLak.length) { console.log('RED: addInitScript-vörnin heldur ekki lengur — ' + initLak.map(([k]) => k).join(', ')); process.exit(1); }
  console.log('✅ addInitScript-vörnin heldur (0 lak í öllum þremur lokunarleiðum).');
})().catch(e => { console.log('RED: ' + (e && e.message || e)); try { thjonn.close(); } catch (_) {} process.exit(1); });
