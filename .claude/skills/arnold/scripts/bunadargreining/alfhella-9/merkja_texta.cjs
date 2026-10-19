// Kvarnir ehf. (1871): auðkenni (S1, BS1, SLT1 …) og staður úr bunadur.json á Nýtt-merkin — ekkert annað breytist.
// Parað á hæð + næsta punkt (merkin voru búin til úr sömu skrá). Skrifað aðeins ef röðin er óbreytt (updated_at).
const fs = require('fs');
const cfg = fs.readFileSync('C:/Users/Slokkvitaeki/slokkvitaeki/js/config.js', 'utf8');
const U = cfg.match(/SUPABASE_URL\s*=\s*['"]([^'"]+)/)[1], K = cfg.match(/SUPABASE_KEY\s*=\s*['"]([^'"]+)/)[1];
const h = { apikey: K, Authorization: 'Bearer ' + K, 'Content-Type': 'application/json' };
const B = JSON.parse(fs.readFileSync(__dirname + '/bunadur.json', 'utf8'));
const HAED = { hc1871x1h01: ['mhl01', '1. hæð'], hc1871x2h01: ['mhl01', '2. hæð'], hc1871x1h02: ['mhl02', 'Mhl. 02'] };
const PRUFA = process.argv.includes('--prufa');
(async () => {
  const [row] = await (await fetch(U + '/rest/v1/teikning_bord?company_id=eq.1871&select=haedir,markers,updated_at,updated_by', { headers: h })).json();
  if (!row) throw new Error('engin röð');
  console.log('röð', row.updated_at, row.updated_by);
  let n = 0;
  for (const hd of row.haedir) {
    const [blad, haed] = HAED[hd.id] || [];
    if (!blad) { console.log('óþekkt hæð — ósnert', hd.id, hd.nafn); continue; }
    const tki = B.tki.filter((t) => t.blad === blad && t.haed === haed && t.tegund !== 'Brunaviðvörunarkerfi');
    const notad = new Set();
    for (const m of hd.markers || []) {
      let best = null, bd = 1e9;
      tki.forEach((t, i) => { if (notad.has(i)) return; const d = Math.hypot(t.x - m.x, t.y - m.y); if (d < bd) { bd = d; best = i; } });
      if (best == null || bd > 40) { console.log('  ópörað', hd.nafn, m.unitId, Math.round(bd)); continue; }
      notad.add(best);
      m.audkenni = tki[best].id; m.stadur = tki[best].stadur; n++;
      console.log('  ', hd.nafn.padEnd(10).slice(0, 10), m.audkenni.padEnd(5), m.stadur, '(' + Math.round(bd) + ' px)');
    }
  }
  const markers = row.haedir[0].markers;   // efsti markers speglar fyrstu hæð
  if (PRUFA) { console.log('prufa — ekkert skrifað,', n, 'merki pöruð'); return; }
  const r = await fetch(U + '/rest/v1/teikning_bord?company_id=eq.1871&updated_at=eq.' + encodeURIComponent(row.updated_at), {
    method: 'PATCH', headers: Object.assign({ Prefer: 'return=representation' }, h),
    body: JSON.stringify({ haedir: row.haedir, markers, updated_by: 'Claude', updated_at: new Date().toISOString() }) });
  const j = await r.json();
  if (!r.ok) throw new Error(r.status + ' ' + JSON.stringify(j).slice(0, 300));
  if (!j.length) throw new Error('röðinni var breytt á meðan — ekkert skrifað');
  console.log('vistað:', n, 'merki fengu auðkenni + stað ·', j[0].haedir.map((x) => x.nafn + ' ' + x.markers.filter((m) => m.audkenni).length + '/' + x.markers.length).join(' · '));
})().catch((e) => { console.error('VILLA ' + e.message); process.exit(1); });
