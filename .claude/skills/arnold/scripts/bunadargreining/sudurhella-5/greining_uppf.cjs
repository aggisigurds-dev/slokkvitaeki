// Greining 4 (1875): björgunarop út (Agnar 20.10.2026), ný skýrsla tengd, samantekt leiðrétt. Aðeins þessi röð, engin eyðing á rökum nema BO-færslum úr tki.
const fs = require('fs');
const cfg = fs.readFileSync('C:/Users/Slokkvitaeki/slokkvitaeki/js/config.js', 'utf8');
const U = cfg.match(/SUPABASE_URL\s*=\s*['"]([^'"]+)/)[1], K = cfg.match(/SUPABASE_KEY\s*=\s*['"]([^'"]+)/)[1];
const h = { apikey: K, Authorization: 'Bearer ' + K, 'Content-Type': 'application/json', Prefer: 'return=representation' };
(async () => {
  const [g] = await (await fetch(U + '/rest/v1/bunadargreining?id=eq.4&company_id=eq.1875&fjarlaegt_at=is.null&select=*', { headers: h })).json();
  if (!g) throw new Error('greining 4 fannst ekki');
  const tki = g.tki.filter((t) => t.bunadur !== 'Björgunarop');
  const samantekt = Object.assign({}, g.samantekt); delete samantekt.bjorgunarop;
  samantekt.flottaleidir = tki.filter((t) => t.tegund === 'Flóttaleið innanhúss').length;
  samantekt.utgangar = tki.filter((t) => t.flokkur === 'flotti' && t.tegund === 'Útidyr').length;
  const texti = (g.texti || []).map((t) => Object.assign({}, t, { kaflar: (t.kaflar || []).filter((k) => !/Björgunarop/.test(k.fyrirsogn || '')) }));
  const athugasemdir = (g.athugasemdir || []).map((a) => a.replace('; björgunarop 6 á millilofti', '').replace(/ ; björgunarop 6 á millilofti/, ''));
  const skyrsla = { id: 'a_1792499544201_aey33g', name: 'Suðurhella 5 - búnaðargreining (ein síða).pdf', path: 'company_attachments/1875/1792499544201_Su_urhella_5_-_b_na_argreining_ein_s_a_.pdf' };
  const r = await fetch(U + '/rest/v1/bunadargreining?id=eq.4&company_id=eq.1875', { method: 'PATCH', headers: h, body: JSON.stringify({ tki, samantekt, texti, athugasemdir, skyrsla, updated_at: new Date().toISOString() }) });
  const j = await r.json(); if (!r.ok || !j.length) throw new Error(r.status + ' ' + JSON.stringify(j).slice(0, 200));
  console.log('vistað: tki', g.tki.length, '→', j[0].tki.length, '· samantekt', JSON.stringify(j[0].samantekt), '· skýrsla', j[0].skyrsla.name);
  console.log('athugasemd 6:', j[0].athugasemdir[5]);
})().catch((e) => { console.error('VILLA', e.message); process.exit(1); });
