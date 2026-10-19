// Búnaðargreining Álfhellu 9 (Kvarnir ehf., 1871) → bunadargreining (ein virk röð). Hætt ef virk röð er til.
const fs = require('fs');
const cfg = fs.readFileSync('C:/Users/Slokkvitaeki/slokkvitaeki/js/config.js', 'utf8');
const U = cfg.match(/SUPABASE_URL\s*=\s*['"]([^'"]+)/)[1], K = cfg.match(/SUPABASE_KEY\s*=\s*['"]([^'"]+)/)[1];
const h = { apikey: K, Authorization: 'Bearer ' + K, 'Content-Type': 'application/json' };
const B = JSON.parse(fs.readFileSync(__dirname + '/bunadur.json', 'utf8'));
const HF = 'https://teikningar.hafnarfjordur.is/data/';

function kaflar(skra) {
  const ut = []; let k = null;
  for (const l of fs.readFileSync(__dirname + '/' + skra, 'utf8').trim().split(/\r?\n/)) {
    if (l.startsWith('## ')) { k = { fyrirsogn: l.slice(3), texti: [], lykill: false }; ut.push(k); continue; }
    if (!k) { k = { fyrirsogn: '', texti: [], lykill: false }; ut.push(k); }
    if (l.startsWith('!')) { k.lykill = true; k.texti.push(l.slice(1)); } else k.texti.push(l);
  }
  return ut.map((x) => ({ fyrirsogn: x.fyrirsogn, texti: x.texti.join('\n'), lykill: x.lykill }));
}

(async () => {
  const til = await (await fetch(U + '/rest/v1/bunadargreining?company_id=eq.1871&fjarlaegt_at=is.null&select=id', { headers: h })).json();
  if (til.length) throw new Error('virk greining er þegar til (id ' + til[0].id + ') — ekkert skrifað');
  const [bord] = await (await fetch(U + '/rest/v1/teikning_bord?company_id=eq.1871&select=haedir', { headers: h })).json();
  const merki = {};
  for (const hd of bord.haedir) for (const m of hd.markers || []) if (m.audkenni) merki[m.audkenni] = { unitId: m.unitId, haed_id: hd.id };
  const BUN = { Slökkvitæki: 'Handslökkvitæki', Brunaslanga: 'Slöngukefli', Brunaviðvörunarkerfi: 'Stjórnstöð brunaviðvörunarkerfis' };
  const tki = B.tki.map((t) => ({
    audkenni: t.id, bunadur: BUN[t.tegund] || t.tegund,
    tegund: t.tegund === 'Brunaslanga' ? 'Slöngukefli (ÍST EN 671-1)' : t.tegund === 'Brunaviðvörunarkerfi' ? null : t.blad === 'mhl02' ? '6 L léttvatn' : '6 L léttvatn (tillaga — mhl 01 tilgreinir ekki)',
    stadur: t.stadur, mhl: t.blad === 'mhl02' ? '02' : '01', haed: t.blad === 'mhl02' ? 'Mhl. 02' : t.haed === '2. hæð' ? '2. hæð (milliloft)' : '1. hæð',
    haed_id: (merki[t.id] || {}).haed_id || null, unitId: (merki[t.id] || {}).unitId || null, x: t.x, y: t.y,
    upplysingar: t.tegund === 'Brunaviðvörunarkerfi',
    heimild: t.blad === 'mhl02' ? 'Aðaluppdráttur mhl 02, 15/07/2026 (SLT)' : 'Aðaluppdráttur mhl 01, 27/05/2020 (' + (t.tegund === 'Brunaslanga' ? 'BS' : t.tegund === 'Brunaviðvörunarkerfi' ? 'BV' : 'S') + ')',
  }));
  tki.push({ audkenni: 'CO2', bunadur: 'Handslökkvitæki', tegund: '5 kg kolsýra', stadur: 'Við aðalrafmagnstöflu mhl 02 — taflan er ekki merkt á teikningu; staðsetja á staðnum',
    mhl: '02', haed: 'Mhl. 02', haed_id: null, unitId: null, x: null, y: null, upplysingar: false, heimild: 'Brunavarnir mhl 02 (Brunahönnun slf, mál 26-116): „5 kg kolsýra við aðalrafmagnstöflu"' });
  const rod = {
    company_id: 1871, landnr: 203357, heimilisfang: 'Álfhella 9, 221 Hafnarfjörður', stada: 'tillaga', af: 'Claude (Arnold) — lesið af aðaluppdráttum',
    tki,
    texti: [
      { mhl: '01', titill: 'Samantekt á brunavörnum hússins — mhl 01', heimild: 'Byggingarlýsing á aðaluppdrætti mhl 01 (PPverk), samþ. 27/05/2020', kaflar: kaflar('brunavarnir_mhl01.txt') },
      { mhl: '02', titill: 'Brunavarnir — mhl 02', heimild: 'Greinargerð Brunahönnunar slf (mál 26-116, júlí 2026) á aðaluppdrætti mhl 02, 15/07/2026', kaflar: kaflar('brunavarnir_mhl02_hreint.txt') },
    ],
    heimildir: [
      { titill: 'Mhl 01 — Grunnmynd 1. og 2. hæðar, sniðmyndir (PPverk)', dags: '2020-05-27', slod: HF + 'B20200527_Alfhella_9_002.pdf', gildir: true, athugasemd: 'Gildandi — breyting á innra skipulagi 2020; tækin lesin hér (S, BS, BV)' },
      { titill: 'Mhl 01 — Afstöðumynd, skráningartafla og byggingarlýsing (PPverk)', dags: '2020-05-27', slod: HF + 'B20200527_Alfhella_9_.pdf', gildir: true, athugasemd: 'Brunavarnatexti mhl 01; 733 m² (1. hæð 600 + milliloft 133), ein eign 0101' },
      { titill: 'Mhl 02 — Aðaluppdráttur [innsiglaður] (Smári Björnsson)', dags: '2026-07-15', slod: HF + encodeURIComponent('[INNSIGLAÐ] Álfhella 9, aðaluppdráttur mhl 02.pdf'), gildir: true, athugasemd: 'Nýtt hús 420 m², vigur-PDF; SLT lesin úr textalagi' },
      { titill: 'Mhl 01 — Grunnmynd 1. og 2. hæðar (VEGA, upphafleg)', dags: '2012-06-07', slod: HF + '20130322_Alfhella_9_002.pdf', gildir: false, athugasemd: 'Eldri útgáfa sama húss — leyst af hólmi 27/05/2020 (4 S + 1 BS; milliloft 96 m²). Ekki merkt úrelt í safni bæjarins.' },
    ],
    athugasemdir: [
      'Tvö hús á lóðinni: mhl 01 (eldra, 1. hæð + milliloft, 733 m²) og mhl 02 (nýtt 2026, smiðja/verkstæði/þvottur, 420 m²).',
      'Kolsýrutæki 5 kg við aðalrafmagnstöflu mhl 02 er ekki á teikningunni — staðsetja á staðnum.',
      'Mhl 01 tilgreinir ekki tegund handslökkvitækja — 6 L léttvatn er tillaga.',
      'Ef tækin í mhl 01 eru enn eftir 2012-teikningunni (4 S + 1 BS) vantar 3 slökkvitæki og 1 slöngu miðað við gildandi hönnun 2020 (7 S + 2 BS).',
      'Mhl 02 skal felldur undir þjónustusamning mhl 01 (handslökkvitæki, reykskynjarar, leiðar- og neyðarlýsing). Reykskynjarar mhl 02: 6 á teikningu (a.m.k. 1 á 80 m²).',
    ],
    samantekt: { slokkvitaeki: 12, slongur: 2, mhl: [{ mhl: '01', m2: 733, haedir: '1. hæð + milliloft' }, { mhl: '02', m2: 420, haedir: 'ein hæð' }] },
    skyrsla: { id: 'a_1792403276320_jdtegm', name: 'Álfhella 9 - brunavarnir og staðsetning slökkvitækja.pdf', path: 'company_attachments/1871/1792403276320__lfhella_9_-_brunavarnir_og_sta_setning_sl_kkvit_kja.pdf' },
  };
  const r = await fetch(U + '/rest/v1/bunadargreining', { method: 'POST', headers: Object.assign({ Prefer: 'return=representation' }, h), body: JSON.stringify(rod) });
  const j = await r.json();
  if (!r.ok) throw new Error(r.status + ' ' + JSON.stringify(j).slice(0, 300));
  console.log('vistað id', j[0].id, '·', j[0].tki.length, 'atriði ·', j[0].texti.map((t) => t.mhl + ': ' + t.kaflar.length + ' kaflar').join(' · '));
})().catch((e) => { console.error('VILLA ' + e.message); process.exit(1); });
