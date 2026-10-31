// sena_ur_appi.cjs <cid> <úttaksmappa> [BASE] — opnar Teikningu félagsins í hausalausum Chromium, opnar 3D hverrar hæðar sem hefur veggjavinnu og
// kallar á blenderSena() (383) — sama sena og „Blender-mynd" takkinn í appinu sendir. Ein skrá á hæð: sena_<n>.json (+ yfirlit.json).
// Öll skrif lokuð. Hæð án veggja (engin veggjavinna í Teikningu) fær enga senu — Turbo segir það hreint út.
const fs = require('fs');
const path = require('path');
const LB = [process.env.LUNA_BRIDGE, 'C:/Users/Slokkvitaeki/luna-bridge', 'C:/projects/luna-bridge'].filter(Boolean).find((p) => fs.existsSync(p + '/node_modules/playwright'));
if (!LB) { console.error('VILLA: luna-bridge/node_modules/playwright fannst ekki — settu LUNA_BRIDGE'); process.exit(1); }
const { chromium } = require(LB + '/node_modules/playwright');
const CID = process.argv[2], UT = process.argv[3], BASE = process.argv[4] || 'https://slokkvitaeki.netlify.app';
if (!+CID || !UT) { console.error('notkun: node sena_ur_appi.cjs <cid> <úttaksmappa> [BASE]'); process.exit(2); }
fs.mkdirSync(UT, { recursive: true });
(async () => {
  const b = await chromium.launch({ headless: true, args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await b.newContext({ viewport: { width: 1500, height: 1000 } });
  await ctx.route('**/*', (route) => {
    const r = route.request(), u = r.url();
    if (!['GET', 'HEAD', 'OPTIONS'].includes(r.method()) && /supabase\.co\/(rest|storage)/.test(u)) return route.fulfill({ status: 200, body: '[]', contentType: 'application/json' });
    if (BASE.includes('localhost') && u.startsWith(BASE) && /\/(\.netlify\/functions|api)\//.test(new URL(u).pathname)) return route.fetch({ url: u.replace(BASE, 'https://slokkvitaeki.netlify.app') }).then((res) => route.fulfill({ response: res }), () => route.abort());
    return route.continue();
  });
  const p = await ctx.newPage(); const villur = [];
  p.on('pageerror', (e) => villur.push(e.message));
  await p.goto(BASE + '/#company/' + CID, { waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => window.Companies && Companies.opnaTeikningu && window.DB && DB.sb, null, { timeout: 120000 });
  await p.waitForTimeout(4000);
  await p.evaluate((c) => Companies.opnaTeikningu(+c), CID);
  await p.waitForFunction(() => window.TeiknBord && TeiknBord.haedir && (TeiknBord.haedir() || []).length, null, { timeout: 120000 });
  await p.waitForTimeout(5000);
  const haedir = await p.evaluate(() => (TeiknBord.haedir() || []).map((h, i) => ({ i, id: h.id, nafn: h.nafn, veggir: (h.veggjaLinur || []).length, leidrett: !!h.leidrett, vinnumynd: !!(h.vinnumynd && h.vinnumynd.url) })));
  console.log('hæðir:', JSON.stringify(haedir));
  const yfirlit = [];
  for (const h of haedir) {
    if (!h.veggir && !h.leidrett) { yfirlit.push({ nafn: h.nafn, id: h.id, sena: false, astaeda: 'engin veggjavinna í Teikningu' }); continue; }
    try {
      const r = await p.evaluate(async (id) => {
        const T = TeiknBord;
        if (document.getElementById('fp-3d')) { T.loka3d(); await new Promise((r) => setTimeout(r, 800)); }
        T.opna3d({ haedId: id });
        const t0 = Date.now();
        while (Date.now() - t0 < 90000) { const s = T.syn3d(); if (s && s.blenderSena && s.syna) break; await new Promise((r) => setTimeout(r, 500)); }
        const s = T.syn3d(); if (!s || !s.blenderSena) return { villa: '3D opnaðist ekki' };
        await new Promise((r) => setTimeout(r, 2500));
        const sena = s.blenderSena({ utlit: 'raunsaett', snid: undefined });
        T.loka3d();
        return sena ? { sena } : { villa: 'engin hæð sýnileg í 3D' };
      }, h.id);
      if (r.villa) { yfirlit.push({ nafn: h.nafn, id: h.id, sena: false, astaeda: r.villa }); console.log('  ', h.nafn, '—', r.villa); continue; }
      const fn = path.join(UT, 'sena_' + (h.i + 1) + '.json');
      fs.writeFileSync(fn, JSON.stringify(r.sena), 'utf8');
      const s0 = r.sena.haedir || [];
      yfirlit.push({ nafn: h.nafn, id: h.id, sena: true, skra: path.basename(fn), haedir: s0.map((x) => ({ nafn: x.nafn, veggir: (x.veggir || []).length, hurdir: (x.hurdir || []).length, gler: (x.gler || []).length, golf: x.golf && { x: x.golf.x, z: x.golf.z, w: x.golf.w, h: x.golf.h } })) });
      console.log('  ', h.nafn, '→', path.basename(fn), 'veggir', s0.map((x) => (x.veggir || []).length).join('+'));
    } catch (e) { yfirlit.push({ nafn: h.nafn, id: h.id, sena: false, astaeda: String(e.message || e).slice(0, 200) }); console.log('  ', h.nafn, 'VILLA', e.message); }
  }
  fs.writeFileSync(path.join(UT, 'yfirlit.json'), JSON.stringify({ cid: +CID, haedir: yfirlit, villur: villur.slice(0, 5) }, null, 1), 'utf8');
  await b.close();
})().catch((e) => { console.error('VILLA', e.message); process.exit(1); });
