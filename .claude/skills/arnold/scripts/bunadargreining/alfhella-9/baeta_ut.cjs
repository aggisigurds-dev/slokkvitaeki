// Álfhella 9 (1871): ÚT-merki (mhl 01, 2020) og reykskynjarar (mhl 02, 2026) í greininguna; BV → flokkur brunakerfi.
const fs = require('fs');
const cfg = fs.readFileSync('C:/Users/Slokkvitaeki/slokkvitaeki/js/config.js', 'utf8');
const U = cfg.match(/SUPABASE_URL\s*=\s*['"]([^'"]+)/)[1], K = cfg.match(/SUPABASE_KEY\s*=\s*['"]([^'"]+)/)[1];
const h = { apikey: K, Authorization: 'Bearer ' + K, 'Content-Type': 'application/json' };
const F = JSON.parse(fs.readFileSync(__dirname + '/ut_brunakerfi.json', 'utf8'));
// ÚT á mhl 01: sameina tvítekningar (≤ 70 dílar), staðir lesnir af blaðinu
const ut = []; for (const f of F.filter((f) => f.k === 'ÚT')) if (!ut.some((u) => u.haed === f.haed && Math.hypot(u.x - f.x, u.y - f.y) < 70)) ut.push(f);
const nafnUT = (f) => {
  if (f.haed === '2. hæð') return ['Flóttaleið innanhúss', 'Milliloft — við stiga niður (útgangur af millilofti)'];
  if (f.x > 3000) return ['Útidyr', 'Lager/geymsla (0102), gafl — útgangur'];
  if (f.y < 2700 && f.x < 1300) return ['Útidyr', '0101 atvinnu-/iðnaðarhúsnæði — efri útgangur (við björgunarstiga)'];
  if (f.y < 3100) return ['Útidyr', 'Kaffistofa (0103) — flóttahurð'];
  if (f.x < 1150) return ['Útidyr', '0101 atvinnu-/iðnaðarhúsnæði — neðri útgangur (við BV)'];
  return ['Útidyr', 'Ræsting / inntök — útgangur (við BS1)'];
};
const haedId = { '1. hæð': 'hc1871x1h01', '2. hæð': 'hc1871x2h01', 'Mhl. 02': 'hc1871x1h02' };
// reykskynjarar mhl 02 — rými eftir hæð á blaðinu (smiðja efst, verkstæði/geymsla miðja, þvottur neðst)
const rymi = (y) => y < 1870 ? 'Smiðja (131,7 m²)' : y < 2550 ? 'Verkstæði/geymsla (146 m²)' : 'Þvottur (94,7 m²)';
(async () => {
  const [g] = await (await fetch(U + '/rest/v1/bunadargreining?company_id=eq.1871&fjarlaegt_at=is.null&select=*', { headers: h })).json();
  if (g.tki.some((t) => t.flokkur === 'flotti')) throw new Error('ÚT þegar í greiningunni — ekkert gert');
  const ny = [];
  ut.sort((a, b) => (a.haed > b.haed ? 1 : -1) || a.y - b.y || a.x - b.x).forEach((f, i) => {
    const [teg, st] = nafnUT(f);
    ny.push({ audkenni: 'ÚT' + (i + 1), bunadur: 'Útgangur (ÚT-merki)', flokkur: 'flotti', upplysingar: true, tegund: teg, stadur: st, mhl: '01', haed: f.haed === '2. hæð' ? '2. hæð (milliloft)' : '1. hæð',
      blad: haedId[f.haed], bx: f.x, by: f.y, x: f.x, y: f.y, heimild: 'Aðaluppdráttur mhl 01, 27/05/2020 ([ÚT] merktur útgangur)' });
  });
  F.filter((f) => f.k === 'R' && f.blad === 'mhl02').sort((a, b) => a.y - b.y || a.x - b.x).forEach((f, i) => {
    ny.push({ audkenni: 'R' + (i + 1), bunadur: 'Reykskynjari', flokkur: 'brunakerfi', upplysingar: true, tegund: 'Reykskynjari (a.m.k. 1 á 80 m² skv. brunahönnun)', stadur: rymi(f.y), mhl: '02', haed: 'Mhl. 02',
      blad: haedId['Mhl. 02'], bx: f.x, by: f.y, x: f.x, y: f.y, heimild: 'Aðaluppdráttur mhl 02, 15/07/2026 („R")' });
  });
  const tki = g.tki.map((t) => (t.audkenni === 'BV' ? Object.assign(t, { flokkur: 'brunakerfi' }) : t)).concat(ny);
  const tel = (f) => ny.filter(f).length;
  const samantekt = Object.assign({}, g.samantekt, { utgangar: tel((t) => t.tegund === 'Útidyr'), flottaleidir: tel((t) => t.flokkur === 'flotti' && t.tegund !== 'Útidyr'), reykskynjarar: tel((t) => t.bunadur === 'Reykskynjari') });
  const rod = { tki, samantekt, updated_at: new Date().toISOString(),
    athugasemdir: g.athugasemdir.concat([`Útgangar (ÚT á aðaluppdrætti mhl 01): ${samantekt.utgangar} útidyr á 1. hæð, ${samantekt.flottaleidir} á millilofti (stigi). Mhl 02 sýnir útganga með örvum en engin ÚT-merki.`,
      `Brunaviðvörunarkerfi mhl 01: stjórnstöð (BV) í 0101 við útgang; engir reykskynjarar teiknaðir á aðaluppdrætti mhl 01. Mhl 02: ${samantekt.reykskynjarar} reykskynjarar á teikningu (2 í smiðju, 2 í verkstæði, 2 í þvotti). Engar brunakerfisteikningar (séruppdrættir) í safni bæjarins.`]) };
  const r = await fetch(U + '/rest/v1/bunadargreining?id=eq.' + g.id + '&updated_at=eq.' + encodeURIComponent(g.updated_at), { method: 'PATCH', headers: Object.assign({ Prefer: 'return=representation' }, h), body: JSON.stringify(rod) });
  const j = await r.json(); if (!r.ok || !j.length) throw new Error(r.status + ' ' + JSON.stringify(j).slice(0, 200));
  console.log('1871:', j[0].tki.length, 'atriði ·', JSON.stringify(j[0].samantekt));
  ny.forEach((t) => console.log(' ', t.audkenni, t.haed, t.stadur));
})().catch((e) => { console.error('VILLA ' + e.message); process.exit(1); });
