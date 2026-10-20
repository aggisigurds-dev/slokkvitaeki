// Garðyrkjufélag Íslands, Síðumúli 1 (fyrirtæki 1198): hæðirnar þrjár af aðaluppdrætti 2020-12-08 á Teikningu (+ 6 „Nýtt“-tillögur um handslökkvitæki)
// og Búnaðargreining (ÚT lesið af blaði, „!“ brunakerfistákn, tillögur). node vista.cjs --prufa → ekkert skrifað.
const fs = require('fs');
const cfg = fs.readFileSync('C:/Users/Slokkvitaeki/slokkvitaeki/js/config.js', 'utf8');
const U = cfg.match(/SUPABASE_URL\s*=\s*['"]([^'"]+)/)[1], K = cfg.match(/SUPABASE_KEY\s*=\s*['"]([^'"]+)/)[1];
const h = { apikey: K, Authorization: 'Bearer ' + K, 'Content-Type': 'application/json', Prefer: 'return=representation' };
const PRUFA = process.argv.includes('--prufa'), CID = 1198;
const G = JSON.parse(fs.readFileSync(__dirname + '/gogn.json', 'utf8'));
const FRUM = { b: 6006, h: 4289 };
const HN = { 1: '1. hæð', 2: '2. hæð', 3: '3. hæð' };
const rid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const RVK = 'https://skjalasafn.reykjavik.is/fotoweb/archives/';

(async () => {
  const [row] = await (await fetch(U + '/rest/v1/teikning_bord?company_id=eq.' + CID + '&select=*', { headers: h })).json();
  if (!row) throw new Error('engin teikning_bord-röð');
  if ((row.haedir || []).some((x) => (x.markers || []).length || (x.veggir || []).length)) throw new Error('Teikningin hefur merki/veggi — ekki yfirskrifað án samráðs');
  const til = await (await fetch(U + '/rest/v1/bunadargreining?company_id=eq.' + CID + '&fjarlaegt_at=is.null&select=id', { headers: h })).json();
  if (til.length) throw new Error('virk greining til (id ' + til[0].id + ')');
  const myndSlod = row.haedir[1].image_url;                  // 2020-12-0822403.pdf (Vinnsla 1) — sama blað og 2. hæð notaði
  if (!/2020-12-0822403/.test(decodeURIComponent(myndSlod))) throw new Error('2. hæð notar ekki 2020-blaðið: ' + myndSlod);
  const ids = { 1: row.haedir[0].id, 2: row.haedir[1].id, 3: 'hc1198x3' + rid().slice(0, 6) };
  console.log('röð', row.updated_at, '· fyrir:', row.haedir.map((x) => x.nafn + ' ' + decodeURIComponent(x.image_url).split('/').pop()).join(' | '));

  // auðkenni: S (tillögur) · ÚT · BK
  const tel = { sl: 0, flotti: 0, brunakerfi: 0 }, FOR = { sl: 'S', flotti: 'ÚT', brunakerfi: 'BK' };
  const its = G.items.slice().sort((a, b) => a.haed - b.haed || a.sy - b.sy || a.sx - b.sx);
  its.forEach((i) => { tel[i.flokkur]++; i.audkenni = FOR[i.flokkur] + tel[i.flokkur]; if (i.flokkur === 'sl') i.unitId = 'n:lettvatn:' + rid(); });

  const markers = (hh) => its.filter((i) => i.haed === hh && i.flokkur === 'sl').map((i) => ({ unitId: i.unitId, x: Math.round(i.bx), y: Math.round(i.by), nytt: true, tegund: 'Léttvatn', stada: 'bid', audkenni: i.audkenni, stadur: i.stadur + ' — tillaga' }));
  const haedir = [1, 2, 3].map((n) => ({ id: ids[n], nafn: HN[n], image_url: myndSlod, markers: markers(n), veggir: [], pdfVeggir: [], frum: FRUM, skurdur: G.skurdur[String(n)], sjalf: false, thett: true, syn: { a: false, fest: true }, stimpilStaerd: 22 }));

  const BUN = { sl: 'Handslökkvitæki', flotti: 'Útgangur (ÚT-merki)', brunakerfi: 'Brunaviðvörunarkerfi („!“-tákn)' };
  const tki = its.map((i) => {
    const e = { audkenni: i.audkenni, bunadur: BUN[i.flokkur], tegund: '', stadur: i.stadur, mhl: '02', haed: HN[i.haed], haed_id: ids[i.haed], unitId: i.unitId || null,
      x: Math.round(i.bx), y: Math.round(i.by), bx: Math.round(i.bx), by: Math.round(i.by), blad: ids[i.haed] };
    if (i.flokkur === 'sl') { e.tegund = 'Léttvatn (tillaga — slökkvitæki eru ekki teiknuð: „staðsett í samráði við SHS“)'; e.heimild = 'Tillaga Arnolds: 2 handslökkvitæki á hæð við stigagang og útgang (165.BR1)'; }
    else if (i.flokkur === 'flotti') { e.tegund = 'Útidyr / flóttaleið'; e.upplysingar = true; e.flokkur = 'flotti'; e.heimild = 'Aðaluppdráttur 2020-12-08, ÚT-merki (skönnun)'; }
    else { e.tegund = '„!“ í ramma — stjórnstöð/útstöð (skýring vantar á blaðinu)'; e.upplysingar = true; e.flokkur = 'brunakerfi'; e.heimild = 'Aðaluppdráttur 2020-12-08, „!“-tákn (skönnun)'; }
    return e;
  });
  const telTki = (f) => tki.filter(f).length;
  const samantekt = { slokkvitaeki: telTki((t) => t.bunadur === 'Handslökkvitæki'), slongur: 0, utgangar: telTki((t) => t.flokkur === 'flotti'), flottaleidir: 0, reykskynjarar: 0, hitaskynjarar: 0, handbodar: 0, stjornstodvar: telTki((t) => t.flokkur === 'brunakerfi'), mhl: [] };

  const D = RVK + '5000-A%C3%B0aluppdr%C3%A6ttir/A%C3%B0aluppdr%C3%A6ttir/';
  const BL = 'Byggingarlýsing á aðaluppdrætti Síðumúla 1 (matshluti 02, reyndarteikningar), samþ. 08.12.2020';
  const texti = [{ mhl: '02', titill: 'Brunamál — Síðumúli 1', heimild: BL, kaflar: [
    { fyrirsogn: 'Klæðningar', texti: 'Allar klæðingar verða í flokki 1, nema klæðning lofts 3. hæðar sem er panelklæðning í flokki 2.', lykill: false },
    { fyrirsogn: 'Útljós og neyðarlýsing', texti: 'ÚT- ljós og neyðarlýsing eru við allar rýmingarleiðir.', lykill: true },
    { fyrirsogn: 'Brunaviðvörun', texti: 'Í húsinu er samtengd brunaviðvörunar- og öryggiskerfi.', lykill: true },
    { fyrirsogn: 'Slökkvitæki', texti: 'Slökkvitæki af viðeigandi gerð verða staðsett í samráði við SHS.', lykill: true },
    { fyrirsogn: 'Viðbótarrökstuðningur brunahönnuðar', texti: 'Ekki þykir ástæða til að endurnýja klæðningu lofts 3.hæðar og ekki þykir heldur ástæða til að setja brunavarnagler á gler sem snýr að útistiga; bæði af þeim ástæðum að breytingarnar nú snúa aðeins að bættum flóttaleiðum og hólfunum í eldra húsnæði.', lykill: false },
  ] }];
  const heimildir = [
    { titill: 'Aðaluppdrættir — afstöðumynd, byggingarlýsing, grunnmyndir 1.–3. hæðar, snið (matshluti 02, reyndarteikningar)', dags: '2020-12-08', slod: D + 'Vinnsla%201/2020-12-0822403.pdf.info', gildir: true, athugasemd: 'Gildandi — samþykkt 08.12.2020. ÚT-merki og „!“-tákn lesin hér (skönnun); slökkvitæki eru ekki teiknuð.' },
    { titill: 'Aðaluppdrættir — útlit', dags: '2020-12-08', slod: D + 'Vinnsla%201/2020-12-0822404.pdf.info', gildir: true, athugasemd: 'Útlitsmyndir sama setts.' },
    { titill: 'Aðaluppdrættir — nýir inngangar og nýtt skipulag, 1. og 2. hæð, snið (THG)', dags: '2016-12-13', slod: null, gildir: false, athugasemd: 'Eldri — sama skipulag; leyst af hólmi með reyndarteikningum 2020.' },
    { titill: 'Grunnmynd jarðhæðar (eldri hús, 1984)', dags: '1984-05-30', slod: null, gildir: false, athugasemd: 'Eldra blað sem Teikning staðarins notaði fyrir 1. hæð — ekki gildandi.' },
    { titill: 'Séruppdrættir Garðyrkjufélags Íslands, Síðumúla 1 (grunnmynd jarðhæðar, lagnir/loftræsting — LOTA)', dags: '2022-11-30', slod: RVK + '5004-S%C3%A9ruppdr%C3%A6ttir/Verkfr%C3%A6%C3%B0iteikningar/BN050450-568-0001.pdf.info', gildir: null, athugasemd: 'Aðeins skoðaðar á yfirlitsmynd — sýna ekki brunakerfi eða slökkvibúnað.' },
  ];
  const athugasemdir = [
    'Gildandi teikning er aðaluppdráttur 08.12.2020 (matshluti 02, 1.–3. hæð á einu blaði). Teikning staðarins notaði áður 1984-blað fyrir 1. hæð — skipt út; hæðirnar eru nú skornar af 2020-blaðinu.',
    'Slökkvitæki eru EKKI teiknuð — byggingarlýsingin segir „staðsett í samráði við SHS“. Merkin S1–S6 (2 á hæð, við stigagang og útgang) eru TILLAGA Arnolds skv. 165.BR1 (≥ 2 tæki á hæð, gönguleið ≤ 25 m) — staðfesta á staðnum.',
    'Brunaviðvörunarkerfi: tvö „!“-tákn á 1. hæð (Andyri og við stigagang) — skýring er ekki á blaðinu; í öðrum blöðum er „!“ stjórnstöð/útstöð. Engir skynjarar, handboðar eða bjöllur eru teiknaðar og brunakerfisteikning rafhönnuðar finnst ekki í skjalasafninu (séruppdrættir Síðumúla 1 eru lagna-, raf-, burðarvirkis- og útlitsblöð 1981–2022) — fá hana hjá þjónustuaðila kerfisins.',
    'ÚT-merki: 6 á 1. hæð, 5 á 2. hæð, 4 á 3. hæð = 15 (lesin af skönnun, staðfest með yfirlagi).',
    'Skráð eru 3 tæki á staðinn (2 léttvatn 6 L, 1 CO₂ 2 kg), ekkert með staðsetningu. Hvaða hæðir Garðyrkjufélag Íslands notar er óstaðfest — greiningin nær yfir allt húsið.',
    '3. hæð: Eldhús 7,8 m² við kaffistofu — eldvarnarteppi er ekki skylda í slíku rými (Arnold) en er ráðlegging 165.BR1.',
  ];
  const teikningar = [1, 2, 3].map((n) => ({ id: ids[n], nafn: HN[n] + ' — aðaluppdráttur 2020', mynd: myndSlod, frum: FRUM, skurdur: G.skurdur[String(n)], heimild: 'Aðaluppdráttur samþ. 08.12.2020 (skönnun)' }));
  const grein = { company_id: CID, landnr: 103784, heimilisfang: 'Síðumúla 1, 108 Reykjavík', stada: 'tillaga', af: 'Claude (Arnold) — ÚT og „!“ lesin af skönnun, slökkvitæki tillögur', tki, texti, heimildir, athugasemdir, samantekt, teikningar, skyrsla: null };
  console.log('merki á borði:', haedir.map((x) => x.nafn + ' ' + x.markers.length).join(' · '), '· tki', tki.length, JSON.stringify(samantekt));
  if (PRUFA) { console.log('PRUFA — ekkert skrifað'); return; }
  const r1 = await fetch(U + '/rest/v1/teikning_bord?company_id=eq.' + CID + '&updated_at=eq.' + encodeURIComponent(row.updated_at), { method: 'PATCH', headers: h, body: JSON.stringify({ haedir, image_url: myndSlod, markers: haedir[0].markers, updated_by: 'Claude (Búnaðargreining)', updated_at: new Date().toISOString() }) });
  const j1 = await r1.json(); if (!r1.ok || !j1.length) throw new Error('teikning_bord: ' + r1.status + ' ' + JSON.stringify(j1).slice(0, 200) + ' (röðinni breytt á meðan?)');
  console.log('teikning_bord vistað:', j1[0].haedir.map((x) => x.nafn + ' ' + x.markers.length).join(' · '));
  const r2 = await fetch(U + '/rest/v1/bunadargreining', { method: 'POST', headers: h, body: JSON.stringify(grein) });
  const j2 = await r2.json(); if (!r2.ok) throw new Error('bunadargreining: ' + r2.status + ' ' + JSON.stringify(j2).slice(0, 300));
  console.log('greining id', j2[0].id, '·', j2[0].tki.length, 'atriði');
})().catch((e) => { console.error('VILLA ' + e.message); process.exit(1); });
