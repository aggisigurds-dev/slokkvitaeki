// Ný skýrsla í Viðhengi í stað þeirrar gömlu (Agnar 19.10.2026: „setja nýju útgáfuna í staðinn og henda hinni").
// Gamla FÆRSLAN fer af listanum (company_attachments[cid]); gamla SKRÁIN er kyrr í geymslunni (ekkert harðeytt —
// endurheimtanleg). Notar appið sjálft (111 upload + AppSettings.save, sama þrönga patch og 111). Aðeins þau skrif út.
// node skipta_skyrslu.cjs <cid> <ný.pdf> <nafn án ártals> <id gömlu færslunnar>
const fs = require('fs');
const { chromium } = require('C:/Users/Slokkvitaeki/luna-bridge/node_modules/playwright');
const [CID, SKRA, NAFN, GAMALT] = process.argv.slice(2);
if (!+CID || !fs.existsSync(SKRA) || !NAFN || /\b20[2-3]\d\b/.test(NAFN) || !GAMALT) { console.error('VILLA: rök'); process.exit(1); }
(async () => {
  const b = await chromium.launch({ headless: true });
  const ctx = await b.newContext();
  const leyft = [], hafnad = [];
  await ctx.route('**/*', (route) => {
    const r = route.request(), u = r.url();
    if (['GET', 'HEAD', 'OPTIONS'].includes(r.method()) || !/supabase\.co/.test(u)) return route.continue();
    const body = r.postData() || '';
    const ok = u.includes('/storage/v1/object/samningar/company_attachments/' + CID + '/') ||
      (/rpc\/app_settings_merge/.test(u) && body.includes('company_attachments') && body.includes('"' + CID + '":[') && (body.match(/"\d+":\[/g) || []).length === 1);
    (ok ? leyft : hafnad).push(r.method() + ' ' + u.replace(/^https:\/\/[^/]+/, '').slice(0, 80));
    return ok ? route.continue() : route.fulfill({ status: 403, body: '{"message":"lokað"}', contentType: 'application/json' });
  });
  const p = await ctx.newPage();
  await p.goto('https://slokkvitaeki.netlify.app/', { waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => window.CompanyAttachments && window.AppSettings && AppSettings.save && window.DB && DB.sb, null, { timeout: 90000 });
  await p.waitForTimeout(4000);
  const ut = await p.evaluate(async ({ b64, nafn, cid, gamalt }) => {
    window.alert = (m) => { window.__alert = m; };
    const bin = atob(b64), u8 = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    const m = await CompanyAttachments.upload(cid, new File([u8], nafn, { type: 'application/pdf' }));
    if (!m) return { villa: window.__alert || 'upload brást' };
    // ferskt fylki af þjóninum, gamla færslan út, ný inni — sama og 111 saveCompanyAttachments(…, {removeIds})
    const r = await DB.sb.from('app_settings').select('att:settings->company_attachments').eq('id', 1).maybeSingle();
    const listi = ((r.data && r.data.att && r.data.att[String(cid)]) || []).filter((f) => f && f.id !== gamalt);
    if (!listi.some((f) => f.id === m.id)) listi.unshift(m);
    await AppSettings.save({ company_attachments: { [String(cid)]: listi } });
    const r2 = await DB.sb.from('app_settings').select('att:settings->company_attachments').eq('id', 1).maybeSingle();
    const eftir = (r2.data && r2.data.att && r2.data.att[String(cid)]) || [];
    return { ny: { id: m.id, name: m.name, path: m.path }, eftir: eftir.map((f) => f.name), fyrirtaeki: Object.keys((r2.data && r2.data.att) || {}).length };
  }, { b64: fs.readFileSync(SKRA).toString('base64'), nafn: NAFN, cid: +CID, gamalt: GAMALT });
  console.log('NIDURSTADA ' + JSON.stringify(ut));
  console.log('leyft:', leyft, '\nhafnað:', hafnad);
  await b.close();
})().catch((e) => { console.error('VILLA', e.message); process.exit(1); });
