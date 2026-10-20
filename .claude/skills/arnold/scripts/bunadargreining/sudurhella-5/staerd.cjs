// Suðurhella 5: merki á hæðum voru of stór (auto 56 px á 3951 px breiðum skurði) → stimpilStaerd 26 á báðum hæðum
const fs = require('fs');
const cfg = fs.readFileSync('C:/Users/Slokkvitaeki/slokkvitaeki/js/config.js', 'utf8');
const U = cfg.match(/SUPABASE_URL\s*=\s*['"]([^'"]+)/)[1], K = cfg.match(/SUPABASE_KEY\s*=\s*['"]([^'"]+)/)[1];
const h = { apikey: K, Authorization: 'Bearer ' + K, 'Content-Type': 'application/json', Prefer: 'return=representation' };
(async () => {
  const [row] = await (await fetch(U + '/rest/v1/teikning_bord?company_id=eq.1875&select=*', { headers: h })).json();
  console.log('röð', row.updated_at, row.updated_by, row.haedir.map((x) => x.nafn + ' ' + (x.markers || []).length + ' merki, stimpilStaerd=' + x.stimpilStaerd).join(' | '));
  row.haedir.forEach((x) => { x.stimpilStaerd = 26; });
  const r = await fetch(U + '/rest/v1/teikning_bord?company_id=eq.1875&updated_at=eq.' + encodeURIComponent(row.updated_at), { method: 'PATCH', headers: h,
    body: JSON.stringify({ haedir: row.haedir, updated_by: 'Claude (merkjastærð)', updated_at: new Date().toISOString() }) });
  const j = await r.json(); if (!r.ok || !j.length) throw new Error(r.status + ' ' + JSON.stringify(j).slice(0, 200) + ' — röðinni breytt á meðan (Agnar að vinna?)');
  console.log('vistað:', j[0].haedir.map((x) => x.nafn + ' ' + x.stimpilStaerd).join(' | '), j[0].updated_at);
})().catch((e) => { console.error('VILLA', e.message); process.exit(1); });
