// Hleður yfirlag/*.jpg upp í turbopaint/bgr-yfirlag/<félag>/<blað>-<hash>.jpg og skrifar bunadargreining.yfirlag (virk röð) AÐEINS fyrir félögin í yfirlag_listi.json
//   node hladaupp.cjs            — ATH: yfirskrifar yfirlag-fylki þessara félaga (hin félögin ósnert)
const fs = require('fs'), crypto = require('crypto');
const cfg = fs.readFileSync('C:/Users/Slokkvitaeki/slokkvitaeki/js/config.js', 'utf8');
const U = (cfg.match(/SUPABASE_URL\s*=\s*['"]([^'"]+)/) || [])[1], K = (cfg.match(/SUPABASE_KEY\s*=\s*['"]([^'"]+)/) || [])[1];
const H = { apikey: K, Authorization: 'Bearer ' + K };
(async () => {
  const L = JSON.parse(fs.readFileSync('yfirlag_listi.json', 'utf8'));
  const perC = {};
  for (const o of L) {
    const buf = fs.readFileSync(o.f), hash = crypto.createHash('sha1').update(buf).digest('hex').slice(0, 8);
    const path = `bgr-yfirlag/${o.cid}/${o.id}-${hash}.jpg`;
    const r = await fetch(`${U}/storage/v1/object/turbopaint/${path}`, { method: 'POST', headers: Object.assign({ 'Content-Type': 'image/jpeg', 'x-upsert': 'true' }, H), body: buf });
    if (!r.ok) { console.log('UPPHLEÐSLA MISTÓKST', path, r.status, (await r.text()).slice(0, 100)); process.exit(1); }
    (perC[o.cid] = perC[o.cid] || []).push({ haed: o.label, haed_id: o.id, url: `${U}/storage/v1/object/public/turbopaint/${path}`, sl: o.tel.sl || 0, bs: o.tel.bs || 0, ut: o.tel.ut || 0, r: o.tel.r || 0, till_sl: (o.till && o.till.sl) || 0, till_bs: (o.till && o.till.bs) || 0, skrad: o.skrad || 0, at: new Date().toISOString().slice(0, 10) });
    process.stdout.write('.');
  }
  console.log();
  for (const cid of Object.keys(perC)) {
    const q = await fetch(`${U}/rest/v1/bunadargreining?company_id=eq.${cid}&fjarlaegt_at=is.null&select=id`, { headers: H });
    for (const row of await q.json()) {
      const p = await fetch(`${U}/rest/v1/bunadargreining?id=eq.${row.id}`, { method: 'PATCH', headers: Object.assign({ 'Content-Type': 'application/json', Prefer: 'return=minimal' }, H), body: JSON.stringify({ yfirlag: perC[cid] }) });
      console.log('félag', cid, 'röð', row.id, p.status, perC[cid].length, 'myndir');
    }
  }
})();
