// Álfaborg (661): (1) audkenni + stadur á merki Agnars sem standa á hönnunarstað (skilyrt á updated_at, ekkert annað
// breytist); (2) bunadargreining-röð. PDF-ið fer í Viðhengi með ../alfhella/vista_vidhengi.cjs-aðferðinni (sér skrifta).
const fs = require('fs');
const cfg = fs.readFileSync('C:/Users/Slokkvitaeki/slokkvitaeki/js/config.js', 'utf8');
const U = cfg.match(/SUPABASE_URL\s*=\s*['"]([^'"]+)/)[1], K = cfg.match(/SUPABASE_KEY\s*=\s*['"]([^'"]+)/)[1];
const h = { apikey: K, Authorization: 'Bearer ' + K, 'Content-Type': 'application/json' };
const G = JSON.parse(fs.readFileSync(__dirname + '/gogn.json', 'utf8'));
const BV = JSON.parse(fs.readFileSync(__dirname + '/brunavarnir_2025.json', 'utf8'));
const skyrsla = process.argv[2] ? JSON.parse(process.argv[2]) : null;
(async () => {
  const [row] = await (await fetch(U + '/rest/v1/teikning_bord?company_id=eq.661&select=haedir,markers,updated_at,updated_by', { headers: h })).json();
  if (row.updated_at !== '2026-10-15T09:14:41.393+00:00') throw new Error('Teikningu Álfaborgar var breytt síðan hún var lesin (' + row.updated_at + ' ' + row.updated_by + ') — ekkert skrifað');
  const para = Object.fromEntries(G.rodud.filter((t) => t.unitId).map((t) => [String(t.unitId), t]));
  let n = 0;
  for (const hd of row.haedir) for (const m of hd.markers || []) { const t = para[String(m.unitId)]; if (t && !m.audkenni) { m.audkenni = t.audkenni; m.stadur = t.stadur; n++; } }
  const r1 = await fetch(U + '/rest/v1/teikning_bord?company_id=eq.661&updated_at=eq.' + encodeURIComponent(row.updated_at), { method: 'PATCH', headers: Object.assign({ Prefer: 'return=representation' }, h),
    body: JSON.stringify({ haedir: row.haedir, markers: row.haedir[0].markers, updated_by: 'Claude (Búnaðargreining)', updated_at: new Date().toISOString() }) });
  const j1 = await r1.json(); if (!r1.ok || !j1.length) throw new Error('merki: ' + r1.status + ' ' + JSON.stringify(j1).slice(0, 200));
  console.log('merki:', n, 'fengu auðkenni ·', j1[0].haedir.map((x) => x.nafn + ' ' + x.markers.filter((m) => m.audkenni).map((m) => m.audkenni).join(',')).join(' | '));
  const til = await (await fetch(U + '/rest/v1/bunadargreining?company_id=eq.661&fjarlaegt_at=is.null&select=id', { headers: h })).json();
  if (til.length) throw new Error('virk greining til (id ' + til[0].id + ')');
  const RVK = 'https://skjalasafn.reykjavik.is/fotoweb/archives/5000-A%C3%B0aluppdr%C3%A6ttir/';
  const rod = {
    company_id: 661, landnr: 105166, heimilisfang: 'Skútuvogur 4, 104 Reykjavík', stada: 'tillaga', af: 'Claude (Arnold) — lesið af aðaluppdráttum 2025',
    tki: G.rodud,
    texti: [{ mhl: '02', titill: 'Brunavarnir — MHL 2 (verslun, lagerar, skrifstofur)', heimild: 'Byggingarlýsing á blaði 10-00, aðaluppdrættir samþ. 09/12/2025 (Brunahönnun slf, mál 14-111)', kaflar: BV }],
    heimildir: [
      { titill: 'Aðaluppdrættir — teikningasett 6 blöð (10-00 til 10-05)', dags: '2025-12-09', slod: null, gildir: true, athugasemd: 'Gildandi — samþ. byggingarfulltrúa 9. des. 2025, USK25050395; breytt notkun MHL 2 í verslun. Búnaðurinn lesinn hér (L / HST / BRSL).' },
      { titill: 'Grunnmynd 1. hæð (2022-10-1139929)', dags: '2022-10-11', slod: null, gildir: false, athugasemd: 'Eldri — Teikning staðarins í appinu notar enn þetta blað (fyrri notkun: verkstæði, þrif á bílum). Hönnunarstaðir varpaðir á það.' },
      { titill: 'Grunnmynd 2. hæð (2022-10-1139928)', dags: '2022-10-11', slod: null, gildir: false, athugasemd: 'Eldri — notað í Teikningu 2. hæðar.' },
    ],
    athugasemdir: G.ath,
    samantekt: { slokkvitaeki: G.hS, slongur: G.hB, mhl: [{ mhl: '02', m2: 3381.7, haedir: '1. hæð + 2. hæð' }] },
    skyrsla,
  };
  const r2 = await fetch(U + '/rest/v1/bunadargreining', { method: 'POST', headers: Object.assign({ Prefer: 'return=representation' }, h), body: JSON.stringify(rod) });
  const j2 = await r2.json(); if (!r2.ok) throw new Error(r2.status + ' ' + JSON.stringify(j2).slice(0, 300));
  console.log('greining id', j2[0].id, '·', j2[0].tki.length, 'atriði');
})().catch((e) => { console.error('VILLA ' + e.message); process.exit(1); });
