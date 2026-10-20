// Heimaleiga - Máni Apartments, Laugavegur 18 (fyrirtæki 869, 3.–6. hæð): Búnaðargreining úr aðaluppdráttum 24.04.2018 (blöð 3/7 og 4/7).
// ÚT-merki lesin af skönnun (gridded nærmyndir + yfirlag). Slökkvitæki/brunakerfi eru ekki teiknuð og 54 tæki eru skráð → engin Nýtt-merki, teikning_bord ósnert.
// node vista.cjs --prufa → ekkert skrifað.
const fs = require('fs');
const cfg = fs.readFileSync('C:/Users/Slokkvitaeki/slokkvitaeki/js/config.js', 'utf8');
const U = cfg.match(/SUPABASE_URL\s*=\s*['"]([^'"]+)/)[1], K = cfg.match(/SUPABASE_KEY\s*=\s*['"]([^'"]+)/)[1];
const h = { apikey: K, Authorization: 'Bearer ' + K, 'Content-Type': 'application/json', Prefer: 'return=representation' };
const PRUFA = process.argv.includes('--prufa'), CID = 869;
const G = JSON.parse(fs.readFileSync(__dirname + '/gogn.json', 'utf8'));
const HN = { 3: '3. hæð', 4: '4. hæð', 5: '5. hæð', 6: '6. hæð' };
const SLOD = 'https://skjalasafn.reykjavik.is/fotoweb/archives/5000-A%C3%B0aluppdr%C3%A6ttir/A%C3%B0aluppdr%C3%A6ttir/2018/06/';

(async () => {
  const [row] = await (await fetch(U + '/rest/v1/teikning_bord?company_id=eq.' + CID + '&select=*', { headers: h })).json();
  if (!row) throw new Error('engin teikning_bord-röð');
  const hd = {}; row.haedir.forEach((x, i) => { const n = parseInt(x.nafn, 10); hd[n] = x; });
  for (const n of [3, 4, 5, 6]) if (!hd[n] || !hd[n].image_url || !hd[n].skurdur || !hd[n].frum) throw new Error('hæð ' + n + ' vantar á Teikningu');
  const til = await (await fetch(U + '/rest/v1/bunadargreining?company_id=eq.' + CID + '&fjarlaegt_at=is.null&select=id', { headers: h })).json();
  const UPPF = process.argv.includes('--uppfaera');   // lagar tki í röð sem þegar er til (id úr til[0])
  if (til.length && !UPPF) throw new Error('virk greining til (id ' + til[0].id + ')');
  if (UPPF && !til.length) throw new Error('engin virk greining til að uppfæra');

  const its = G.items.slice().sort((a, b) => a.haed - b.haed || a.by - b.by || a.bx - b.bx);
  its.forEach((i, k) => { i.audkenni = 'ÚT' + (k + 1); });
  const blad = (n) => hd[n].nafn && /01575/.test(decodeURIComponent(hd[n].image_url)) ? 'blað 3/7' : 'blað 4/7';
  const tki = its.map((i) => ({
    audkenni: i.audkenni, bunadur: 'Útgangur (ÚT-merki)', tegund: 'Útljós og neyðarlýsing', stadur: i.stadur, mhl: '', haed: HN[i.haed], haed_id: hd[i.haed].id, unitId: null,
    x: Math.round(i.bx), y: Math.round(i.by), bx: Math.round(i.bx), by: Math.round(i.by), blad: hd[i.haed].id,
    upplysingar: true, flokkur: 'flotti', heimild: 'Aðaluppdráttur samþ. 24.04.2018 (' + blad(i.haed) + '), ÚT-merki (skönnun)',
  }));
  const samantekt = { slokkvitaeki: 0, slongur: 0, utgangar: tki.length, flottaleidir: 0, reykskynjarar: 0, hitaskynjarar: 0, handbodar: 0, stjornstodvar: 0, mhl: [] };

  const BL = 'Skýringar á aðaluppdrætti Laugavegs 18, blað 3/7 og 4/7 (verk 200801003, rev. C 12.03.2018), samþ. 24.04.2018';
  const texti = [{ mhl: '', titill: 'Brunamál — Laugavegur 18, 3.–6. hæð', heimild: BL, kaflar: [
    { fyrirsogn: 'Brunaviðvörun', texti: 'Sjálfvirkt brunaviðvörunarkerfi er í öllu húsinu.', lykill: true },
    { fyrirsogn: 'Flóttaleiðir, útljós og neyðarlýsing', texti: 'Flóttaleiðir eru sýndar með brotinni ör. ÚT-merki táknar útljós og neyðarlýsingu. Rýmisskilum og böðum breytt í 03-02 og 03-12 (3. hæð), 04-05 og 04-06 (4. hæð), 05-04, 05-11 og 05-12 (5. hæð); bætt við tengigangi að Vegamótastíg 5-7 vegna flóttaleiða.', lykill: true },
    { fyrirsogn: 'Opnun milli húsa', texti: 'Kvöð um tímabundna opnun milli húsa (Laugavegur 18 og Vegamótastígur 7), vegna flóttaleiða — breyting C, 12.03.2018.', lykill: true },
    { fyrirsogn: 'Brunahólfun', texti: 'Veggir EI60 eða meira, hurðir EIS30/EICS30; lagnastokkur EI30 með eldvarnarloku í stokk; hæðarskil REI60 (E90 við stiga). 6. hæð: EI60 veggur milli eignarhluta, reykræsing í þaki (reykluga 100×100 cm).', lykill: false },
    { fyrirsogn: 'Björgunarop', texti: 'Hverfigluggar á 3. til 6. hæðar eru allir björgunarop.', lykill: false },
    { fyrirsogn: 'Klæðningar og loftræsing', texti: 'Allar nýjar klæðningar eru í flokki 1. Í öllum gluggalausum rýmum (geymslur, snyrtingar) er vélræn loftræsing; nýjar lagnir eru í niðurhengdum loftum í öllu húsinu.', lykill: false },
  ] }];
  const heimildir = [
    { titill: 'Aðaluppdrættir — grunnmynd 3. og 4. hæðar (blað 3/7, 103 C)', dags: '2018-04-24', slod: SLOD + '2018-04-2401575.tif.info', gildir: true, athugasemd: 'Gildandi — samþykkt 24.04.2018 (verk 200801003, Albína Thordarson). ÚT-merki lesin hér (skönnun); slökkvitæki eru ekki teiknuð.' },
    { titill: 'Aðaluppdrættir — grunnmynd 5. og 6. hæðar (blað 4/7, 104 C)', dags: '2018-04-24', slod: SLOD + '2018-04-2401574.tif.info', gildir: true, athugasemd: 'Gildandi — samþykkt 24.04.2018 (verk 200801003). ÚT-merki lesin hér (skönnun).' },
  ];
  const athugasemdir = [
    'Slökkvitæki og slöngur eru ekki teiknuð á blöðin — 54 skráð léttvatnstæki (6 L) eru í kerfinu en engin hefur staðsetningu.',
    'ÚT-merki (útljós og neyðarlýsing) lesin af skönnun, staðfest með yfirlagi: 3. hæð 3, 4. hæð 4, 5. hæð 4, 6. hæð 3 = 14.',
    'Gildandi teikning er aðaluppdráttur samþ. 24.04.2018 (blað 3/7 og 4/7, rev. C 12.03.2018 — opnað milli Laugavegs 18 og Vegamótastígs 7 vegna flóttaleiða). Áskilin lokaúttekt byggingarfulltrúa og samþykki heilbrigðiseftirlits.',
    'Sjálfvirkt brunaviðvörunarkerfi er í öllu húsinu (skv. skýringum á blaðinu) en skynjarar, handboðar og stjórnstöð eru ekki teiknuð — brunakerfisteikning rafhönnuðar er ekki á aðaluppdráttunum; fá hana hjá þjónustuaðila kerfisins.',
    'Tækin fá stað á Teikningu með því að draga þau af tækjaræmunni, hæð fyrir hæð. 165.BR1 krefst ≥ 2 handslökkvitækja á hæð og gönguleiðar ≤ 25 m; fjöldinn (54) er langt umfram lágmarkið, staðsetningin ræður hvort 25 m næst.',
    'Skráin (54 léttvatn) stemmir ekki við júlí-2025 úttektina sem fyrirtækjaskráin tengir við Mána (52 léttvatn + 1 CO₂ 5 kg + 1 brunaslanga) — ekki leiðrétt hér.',
    'Hverfigluggar á 3.–6. hæð eru allir björgunarop (BO á blöðunum) — ekki skráð sem búnaður.',
  ];
  const teikningar = [3, 4, 5, 6].map((n) => ({ id: hd[n].id, nafn: HN[n] + ' — aðaluppdráttur 2018 (' + blad(n) + ')', mynd: hd[n].image_url, frum: hd[n].frum, skurdur: hd[n].skurdur, heimild: 'Aðaluppdráttur samþ. 24.04.2018 (skönnun)' }));
  const grein = { company_id: CID, landnr: 101417, heimilisfang: 'Laugavegur 18, 101 Reykjavík (3.–6. hæð)', stada: 'tillaga', af: 'Claude (Arnold) — ÚT lesin af skönnun, handlesið af nærmyndum', tki, texti, heimildir, athugasemdir, samantekt, teikningar, skyrsla: null };
  console.log('tki', tki.length, JSON.stringify(samantekt), '· hæðir', teikningar.map((t) => t.id + ' ' + t.nafn).join(' | '));
  console.log('ÚT á hæð', JSON.stringify([3, 4, 5, 6].map((n) => tki.filter((t) => t.haed === HN[n]).length)));
  if (PRUFA) { console.log('PRUFA — ekkert skrifað'); return; }
  if (UPPF) {
    const r3 = await fetch(U + '/rest/v1/bunadargreining?id=eq.' + til[0].id + '&fjarlaegt_at=is.null', { method: 'PATCH', headers: h, body: JSON.stringify({ tki, texti, heimildir, athugasemdir, samantekt, teikningar }) });
    const j3 = await r3.json(); if (!r3.ok || !j3.length) throw new Error('uppfæra: ' + r3.status + ' ' + JSON.stringify(j3).slice(0, 300));
    console.log('uppfært id', j3[0].id, '·', j3[0].tki.length, 'atriði · skemmdir stafir:', (JSON.stringify(j3[0]).match(/�/g) || []).length);
    return;
  }
  const r2 = await fetch(U + '/rest/v1/bunadargreining', { method: 'POST', headers: h, body: JSON.stringify(grein) });
  const j2 = await r2.json(); if (!r2.ok) throw new Error('bunadargreining: ' + r2.status + ' ' + JSON.stringify(j2).slice(0, 300));
  console.log('greining id', j2[0].id, '·', j2[0].tki.length, 'atriði');
})().catch((e) => { console.error('VILLA ' + e.message); process.exit(1); });
