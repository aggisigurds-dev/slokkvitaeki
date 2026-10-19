// Álfaborg (661): ÚT-merki, stjórnstöð/útstöð og brunakerfi Voltorku (2020) í greininguna — myndir í turbopaint-fötuna.
const fs = require('fs');
const env = Object.fromEntries(fs.readFileSync('C:/Users/Slokkvitaeki/luna-bridge/.env', 'utf8').split(/\r?\n/).filter((l) => /^[A-Z_]+=/.test(l)).map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).replace(/^["']|["']$/g, '')]));
const SU = env.SUPABASE_URL, SK = env.SUPABASE_SERVICE_ROLE_KEY;
const cfg = fs.readFileSync('C:/Users/Slokkvitaeki/slokkvitaeki/js/config.js', 'utf8');
const U = cfg.match(/SUPABASE_URL\s*=\s*['"]([^'"]+)/)[1], K = cfg.match(/SUPABASE_KEY\s*=\s*['"]([^'"]+)/)[1];
const h = { apikey: K, Authorization: 'Bearer ' + K, 'Content-Type': 'application/json' };
const NY = JSON.parse(fs.readFileSync(__dirname + '/nyir_tki.json', 'utf8')).map((t) => Object.assign(t, { stadur: String(t.stadur || '').replace(/,\s*$/, '').replace(/ — úr (.*),$/, ' — úr $1') }));
const BL = JSON.parse(fs.readFileSync(__dirname + '/ny_blod.json', 'utf8'));
(async () => {
  for (const b of BL) {
    const p = 'bunadargreining/661/brunakerfi-' + b.id.slice(2) + '-haed-voltorka-2020-03-02.jpg';
    const r = await fetch(SU + '/storage/v1/object/turbopaint/' + p, { method: 'POST', headers: { apikey: SK, Authorization: 'Bearer ' + SK, 'Content-Type': 'image/jpeg', 'x-upsert': 'true' }, body: fs.readFileSync(__dirname + '/bk_' + b.id.slice(2) + '.jpg') });
    if (!r.ok) throw new Error('upload ' + r.status + ' ' + (await r.text()).slice(0, 150));
    b.mynd = SU + '/storage/v1/object/public/turbopaint/' + p;
  }
  const [g] = await (await fetch(U + '/rest/v1/bunadargreining?company_id=eq.661&fjarlaegt_at=is.null&select=*', { headers: h })).json();
  if (g.tki.some((t) => t.flokkur)) throw new Error('brunakerfi/ÚT þegar í greiningunni — ekkert gert');
  const tel = (f) => NY.filter(f).length;
  const samantekt = Object.assign({}, g.samantekt, {
    utgangar: tel((t) => t.flokkur === 'flotti' && t.tegund === 'Útidyr'), flottaleidir: tel((t) => t.flokkur === 'flotti' && t.tegund !== 'Útidyr'),
    reykskynjarar: tel((t) => t.bunadur === 'Reykskynjari'), hitaskynjarar: tel((t) => t.bunadur === 'Hitaskynjari'), handbodar: tel((t) => t.bunadur === 'Brunahandboði'),
  });
  const rod = {
    tki: g.tki.concat(NY), teikningar: g.teikningar.concat(BL), samantekt,
    athugasemdir: g.athugasemdir.concat([
      `Útgangar (ÚT-merki á aðaluppdrætti 2025): ${samantekt.utgangar} útidyr og ${samantekt.flottaleidir} flóttaleiðir innanhúss.`,
      `Brunaviðvörunarkerfi: stjórnstöð og yfirlitsmynd við anddyri dúkasníðslu (suðurhlið), útstöð við aðalinngang. Brunakerfisteikningar Voltorku (02.03.2020) sýna ${samantekt.reykskynjarar} reykskynjara, ${samantekt.hitaskynjarar} hitaskynjara og ${samantekt.handbodar} handboða — teiknað FYRIR breytingu 2025, svo staðsetningar geta hafa breyst (línuskynjarar bætast við í lagerum skv. brunahönnun 2025). Táknin lesin sjálfvirkt (sniðmát úr skýringum); bjöllur, neyðarljós og ÚT-ljós ekki talin.`,
    ]),
    heimildir: g.heimildir.concat([{ titill: 'Brunakerfi og neyðarlýsing 1.h og 2.h — Voltorka ehf (BN055104 bl. 13–16, teikn. 350-01-01/02, 350-02-03/04)', dags: '2020-03-02', slod: null, gildir: false, athugasemd: 'Séruppdráttur rafhönnuðar fyrir innréttingu 2020 — eldri en breytingin 2025; R/H/HB lesin af honum.' }]),
    updated_at: new Date().toISOString(),
  };
  const r = await fetch(U + '/rest/v1/bunadargreining?id=eq.' + g.id + '&updated_at=eq.' + encodeURIComponent(g.updated_at), { method: 'PATCH', headers: Object.assign({ Prefer: 'return=representation' }, h), body: JSON.stringify(rod) });
  const j = await r.json(); if (!r.ok || !j.length) throw new Error(r.status + ' ' + JSON.stringify(j).slice(0, 200));
  console.log('661:', j[0].tki.length, 'atriði ·', j[0].teikningar.length, 'blöð ·', JSON.stringify(j[0].samantekt));
})().catch((e) => { console.error('VILLA ' + e.message); process.exit(1); });
