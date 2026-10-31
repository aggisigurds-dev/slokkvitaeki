// PDF í Viðhengi fyrirtækis með appinu sjálfu (CompanyAttachments.upload, 111) — aðeins þau tvö skrif hleypt í gegn.
// node vista_vidhengi.cjs <cid> <skrá.pdf> <nafn í Viðhengi — ekkert ártal>
const fs = require('fs');
const LB = [process.env.LUNA_BRIDGE, 'C:/Users/Slokkvitaeki/luna-bridge', 'C:/projects/luna-bridge'].filter(Boolean).find((p) => fs.existsSync(p + '/node_modules/playwright'));
if (!LB) { console.error('VILLA: luna-bridge/node_modules/playwright fannst ekki — settu LUNA_BRIDGE'); process.exit(1); }
const { chromium } = require(LB + '/node_modules/playwright');
const CID = String(+process.argv[2]), SKRA = process.argv[3], NAFN = process.argv[4];
if (!+CID || !fs.existsSync(SKRA) || !NAFN || /\b20[2-3]\d\b/.test(NAFN)) { console.error('VILLA: cid, skrá og nafn án ártals'); process.exit(1); }
(async () => {
  const b = await chromium.launch({ headless: true });
  const ctx = await b.newContext();
  const leyft = [], hafnad = [];
  await ctx.route('**/*', (route) => {
    const r = route.request(), u = r.url();
    if (['GET', 'HEAD', 'OPTIONS'].includes(r.method()) || !/supabase\.co/.test(u)) return route.continue();
    const body = r.postData() || '';
    let ok = u.includes('/storage/v1/object/samningar/company_attachments/' + CID + '/');
    if (!ok && /rpc\/app_settings_merge/.test(u)) {
      // aðeins viðhengjafylki ÞESSA fyrirtækis (111 sendir þröngan patch: { company_attachments: { <cid>: [...] } })
      ok = body.includes('company_attachments') && body.includes('"' + CID + '":[') && (body.match(/"\d+":\[/g) || []).length === 1;
    }
    if (ok) { leyft.push(r.method() + ' ' + u.replace(/^https:\/\/[^/]+/, '').slice(0, 90)); return route.continue(); }
    hafnad.push(r.method() + ' ' + u.replace(/^https:\/\/[^/]+/, '').slice(0, 90));
    return route.fulfill({ status: 403, body: '{"message":"lokað"}', contentType: 'application/json' });
  });
  const p = await ctx.newPage();
  await p.goto('https://slokkvitaeki.netlify.app/', { waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => window.CompanyAttachments && window.AppSettings && AppSettings.save && window.DB && DB.sb, null, { timeout: 90000 });
  await p.waitForTimeout(4000);
  const fyrir = await p.evaluate((cid) => CompanyAttachments.list(cid).map((f) => f.name), +CID);
  if (fyrir.includes(NAFN)) { console.log('þegar til — ekkert gert'); await b.close(); return; }
  const meta = await p.evaluate(async ({ b64, nafn, cid }) => {
    window.alert = (m) => { window.__alert = m; };
    const bin = atob(b64), u8 = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    const m = await CompanyAttachments.upload(cid, new File([u8], nafn, { type: 'application/pdf' }));
    return { m, alert: window.__alert || null };
  }, { b64: fs.readFileSync(SKRA).toString('base64'), nafn: NAFN, cid: +CID });
  console.log('META ' + JSON.stringify(meta.m ? { id: meta.m.id, name: meta.m.name, path: meta.m.path } : null), meta.alert || '');
  console.log('leyft:', leyft, '\nhafnað:', hafnad);
  await b.close();
})().catch((e) => { console.error('VILLA', e.message); process.exit(1); });
