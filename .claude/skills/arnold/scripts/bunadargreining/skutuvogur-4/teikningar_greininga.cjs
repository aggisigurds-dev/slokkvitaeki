// Blöð greininganna („sér teikning", Agnar 19.10.2026): bunadargreining.teikningar + tki[].blad/bx/by.
// 661: hrein 2025-blöð í turbopaint-fötunni (bx/by = pt × 120/72). 1871: blöðin sem greiningin las = hæðir Teikningar.
const fs = require('fs');
const cfg = fs.readFileSync('C:/Users/Slokkvitaeki/slokkvitaeki/js/config.js', 'utf8');
const U = cfg.match(/SUPABASE_URL\s*=\s*['"]([^'"]+)/)[1], K = cfg.match(/SUPABASE_KEY\s*=\s*['"]([^'"]+)/)[1];
const h = { apikey: K, Authorization: 'Bearer ' + K, 'Content-Type': 'application/json' };
const les = async (q) => (await fetch(U + '/rest/v1/' + q, { headers: h })).json();
const skrifa = async (id, gogn) => {
  const r = await fetch(U + '/rest/v1/bunadargreining?id=eq.' + id, { method: 'PATCH', headers: Object.assign({ Prefer: 'return=representation' }, h), body: JSON.stringify(Object.assign(gogn, { updated_at: new Date().toISOString() })) });
  const j = await r.json(); if (!r.ok || !j.length) throw new Error(id + ' ' + r.status + ' ' + JSON.stringify(j).slice(0, 200)); return j[0];
};
(async () => {
  // ── 661 ──
  const B = JSON.parse(fs.readFileSync(__dirname + '/blod.json', 'utf8')), S = JSON.parse(fs.readFileSync(__dirname + '/blod_slodir.json', 'utf8'));
  const H = Object.fromEntries(JSON.parse(fs.readFileSync(__dirname + '/hannad.json', 'utf8')).map((u) => [u.audkenni, u]));
  const [g2] = await les('bunadargreining?company_id=eq.661&fjarlaegt_at=is.null&select=id,tki');
  const t661 = [
    { id: 'b1', nafn: '1. hæð — aðaluppdr. 2025 (blað 10-02)', mynd: S.h1, frum: { b: B.h1.b, h: B.h1.h }, skurdur: B.h1.skurdur, heimild: 'Teikningasett samþ. 09/12/2025, USK25050395' },
    { id: 'b2', nafn: '2. hæð — aðaluppdr. 2025 (blað 10-03)', mynd: S.h2, frum: { b: B.h2.b, h: B.h2.h }, skurdur: B.h2.skurdur, heimild: 'Teikningasett samþ. 09/12/2025, USK25050395' },
  ];
  const tki2 = g2.tki.map((t) => { const u = H[t.audkenni]; return u ? Object.assign(t, { blad: u.pg === 3 ? 'b1' : 'b2', bx: Math.round(u.x25 * B.h1.k), by: Math.round(u.y25 * B.h1.k) }) : t; });
  const r2 = await skrifa(g2.id, { teikningar: t661, tki: tki2 });
  console.log('661:', r2.teikningar.length, 'blöð ·', r2.tki.filter((t) => t.blad).length + '/' + r2.tki.length, 'á blaði');
  // ── 1871 ──
  const [g1] = await les('bunadargreining?company_id=eq.1871&fjarlaegt_at=is.null&select=id,tki');
  const [bord] = await les('teikning_bord?company_id=eq.1871&select=haedir');
  const t1871 = bord.haedir.map((x) => ({ id: x.id, nafn: x.nafn + (x.id === 'hc1871x1h02' ? ' (aðaluppdr. 2026)' : ' — mhl 01 (aðaluppdr. 2020)'), mynd: x.image_url, frum: x.frum, skurdur: x.skurdur, heimild: x.id === 'hc1871x1h02' ? 'Aðaluppdráttur mhl 02 [innsiglaður], 15/07/2026' : 'Aðaluppdráttur mhl 01, Grunnmynd 1. og 2. hæðar (PPverk), samþ. 27/05/2020' }));
  const eftirHaed = { '1. hæð': 'hc1871x1h01', '2. hæð (milliloft)': 'hc1871x2h01', 'Mhl. 02': 'hc1871x1h02' };
  const tki1 = g1.tki.map((t) => (t.x == null ? t : Object.assign(t, { blad: t.haed_id || eftirHaed[t.haed] || null, bx: t.x, by: t.y })));
  const r1 = await skrifa(g1.id, { teikningar: t1871, tki: tki1 });
  console.log('1871:', r1.teikningar.length, 'blöð ·', r1.tki.filter((t) => t.blad).length + '/' + r1.tki.length, 'á blaði');
})().catch((e) => { console.error('VILLA ' + e.message); process.exit(1); });
