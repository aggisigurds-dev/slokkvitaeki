// ProLan - Suðurhella 5 (fyrirtæki 1875): Búnaðargreining úr 2025-aðaluppdrættinum → (1) JPEG blöð í turbopaint-fötuna,
// (2) teikning_bord: tvær hæðir á rétta blaðinu + Nýtt-merki (slökkvitæki, slöngur) — skilyrt á updated_at,
// (3) bunadargreining-röð (ein virk). node vista.cjs --prufa  (ekkert skrifað)   |   node vista.cjs
const fs = require('fs'), path = require('path');
const env = Object.fromEntries(fs.readFileSync('C:/Users/Slokkvitaeki/luna-bridge/.env', 'utf8').split(/\r?\n/).filter((l) => /^[A-Z_]+=/.test(l)).map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).replace(/^["']|["']$/g, '')]));
const SU = env.SUPABASE_URL, SK = env.SUPABASE_SERVICE_ROLE_KEY;
const cfg = fs.readFileSync('C:/Users/Slokkvitaeki/slokkvitaeki/js/config.js', 'utf8');
const U = cfg.match(/SUPABASE_URL\s*=\s*['"]([^'"]+)/)[1], K = cfg.match(/SUPABASE_KEY\s*=\s*['"]([^'"]+)/)[1];
const h = { apikey: K, Authorization: 'Bearer ' + K, 'Content-Type': 'application/json' };
const PRUFA = process.argv.includes('--prufa');
const CID = 1875;
const HER = __dirname;
const I = JSON.parse(fs.readFileSync(path.join(HER, 'items.json'), 'utf8')).items;
const HF = 'https://teikningar.hafnarfjordur.is/data/';
const PDF25 = HF + encodeURIComponent('[INNSIGLAÐ] SUÐURHELLA 5 aðaluppdráttur.pdf');
const FRUM = { b: 6000, h: 4239 };
const SKURDUR = { 1: { x: 956, y: 566, w: 3951, h: 1837 }, 2: { x: 579, y: 378, w: 3851, h: 1586 } };
const HEITI = { '0101': 'Geymsla 152,6 m²', '0102': 'Geymsla 152,6 m²', '0103': 'Geymsla 152,6 m²', '0104': 'Geymsla 152,6 m²', '0105': 'Geymsla 103,7 m²', '0106': 'Geymsla 152,6 m²',
  '0107': 'milliloft, geymsla 50,3 m²', '0108': 'opið geymsluloft 50,3 m²', '0109': 'milliloft, geymsla 50,3 m²', '0110': 'milliloft, geymsla 25,4 m²', '0111': 'milliloft, smávörulager/bað', '0112': 'milliloft, geymsla 49,7 m²' };
const rid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const HEIMILD = 'Aðaluppdráttur 15 023, blað ';

(async () => {
  // ---------- 0) lestur ----------
  const [row] = await (await fetch(U + '/rest/v1/teikning_bord?company_id=eq.' + CID + '&select=*', { headers: h })).json();
  if (!row) throw new Error('engin teikning_bord-röð fyrir ' + CID);
  const til = await (await fetch(U + '/rest/v1/bunadargreining?company_id=eq.' + CID + '&fjarlaegt_at=is.null&select=id', { headers: h })).json();
  if (til.length) throw new Error('virk greining er þegar til (id ' + til[0].id + ')');
  const [h1, h2] = row.haedir;
  console.log('röð', row.updated_at, row.updated_by, '· hæðir', row.haedir.map((x) => x.id + ' ' + x.nafn + ' (' + (x.markers || []).length + ' merki)').join(' | '));
  if ((row.haedir || []).some((x) => (x.markers || []).length || (x.veggir || []).length)) throw new Error('Teikningin hefur merki/veggi — ekki yfirskrifað án samráðs');

  // ---------- 1) JPEG ----------
  const slodir = {};
  for (const n of [1, 2]) {
    const p = 'bunadargreining/' + CID + '/' + n + '-haed-adaluppdr-2025-09-17.jpg';
    slodir[n] = SU + '/storage/v1/object/public/turbopaint/' + p;
    if (PRUFA) continue;
    const r = await fetch(SU + '/storage/v1/object/turbopaint/' + p, { method: 'POST', headers: { apikey: SK, Authorization: 'Bearer ' + SK, 'Content-Type': 'image/jpeg', 'x-upsert': 'true' }, body: fs.readFileSync(path.join(HER, 'ut', 'blad_h' + n + '.jpg')) });
    if (!r.ok) throw new Error('upload ' + n + ' ' + r.status + ' ' + (await r.text()).slice(0, 150));
  }

  // ---------- 2) tæki ----------
  const hid = { 1: h1.id, 2: h2.id }, blad = { 1: 'b1', 2: 'b2' }, hnafn = { 1: '1. hæð', 2: '2. hæð (milliloft)' };
  const BLADNR = { 1: '1 (grunnmynd 1. hæðar, útg. F)', 2: '2 (grunnmynd 2. hæðar/millilofts, útg. E)' };
  const slf = I.filter((i) => i.flokkur === 'slokkvitaeki'), slg = I.filter((i) => i.flokkur === 'slanga');
  const tki = [];
  const nyttId = {};
  for (const it of slf.concat(slg)) nyttId[it.audkenni] = 'n:' + (it.flokkur === 'slanga' ? 'slanga' : 'duft') + ':' + rid();
  const parSlanga = (it) => slg.find((b) => b.haed === it.haed && b.rymi === it.rymi);
  const stadurTexti = (it) => {
    const r = it.rymi + ' ' + HEITI[it.rymi];
    if (it.flokkur === 'slokkvitaeki') {
      if (it.haed === 2) return r + ', við stigann niður';
      const fram = it.y > 600, b = parSlanga(it);
      return r + (fram ? ', framhlið við flóttahurð' + (b ? ' — við ' + b.audkenni : '') : ', bakhlið við flóttahurð/stiga');
    }
    if (it.flokkur === 'slanga') return r + ', framhlið við flóttahurð';
    if (it.flokkur === 'brunakerfi') return r + (it.haed === 2 ? ' (milliloft)' : '');
    if (it.flokkur === 'bjorgun') return r + ', björgunarop á bakhlið millilofts';
    if (it.flokkur === 'flotti') return it.tegund === 'Útgangur (ÚT)' ? (it.y > 600 ? 'Framhlið, rými ' + it.rymi : (it.y > 480 ? 'Flóttaleið innanhúss, rými ' + it.rymi : 'Bakhlið, rými ' + it.rymi)) : '';
    return '';
  };
  for (const it of I) {
    const tg = { slokkvitaeki: 'Duft 6 kg (tillaga — teikningin tilgreinir ekki tegund)', slanga: 'Slöngukefli 20 m (ÍST EN 671-1)', brunakerfi: 'Reykskynjari (brunaviðvörunarkerfi)', bjorgun: 'Björgunarop', flotti: 'Útidyr' }[it.flokkur];
    const bun = { slokkvitaeki: 'Handslökkvitæki', slanga: 'Slöngukefli', brunakerfi: 'Reykskynjari', bjorgun: 'Björgunarop', flotti: 'Útgangur (ÚT-merki)' }[it.flokkur];
    const e = { audkenni: it.audkenni, bunadur: bun, tegund: tg, stadur: stadurTexti(it), mhl: '01', haed: hnafn[it.haed], haed_id: hid[it.haed], unitId: nyttId[it.audkenni] || null,
      x: Math.round(it.bx), y: Math.round(it.by), bx: Math.round(it.bx), by: Math.round(it.by), blad: blad[it.haed],
      heimild: HEIMILD + BLADNR[it.haed] + ' (' + ({ slokkvitaeki: 'SL', slanga: 'BS 20m', brunakerfi: 'R', bjorgun: 'BO', flotti: 'ÚT' }[it.flokkur]) + ')' };
    if (it.flokkur === 'flotti') {
      e.flokkur = 'flotti'; e.upplysingar = true;
      if (it.y > 480 && it.y <= 600) { e.tegund = 'Flóttaleið innanhúss'; }
      e.stadur = stadurTexti(Object.assign({}, it, { tegund: 'Útgangur (ÚT)' }));
    }
    if (it.flokkur === 'bjorgun') { e.flokkur = 'flotti'; e.upplysingar = true; e.tegund = 'Björgunarop (ljósop 0,6 × 0,9–1,2 m)'; }
    if (it.flokkur === 'brunakerfi') { e.flokkur = 'brunakerfi'; e.upplysingar = true; }
    tki.push(e);
  }
  // röð: slökkvibúnaður fyrst, svo ÚT, brunakerfi
  const rod = { slokkvitaeki: 0, slanga: 1 };
  tki.sort((a, b) => ((a.flokkur ? 2 : rod[a.bunadur === 'Slöngukefli' ? 'slanga' : 'slokkvitaeki']) - (b.flokkur ? 2 : rod[b.bunadur === 'Slöngukefli' ? 'slanga' : 'slokkvitaeki'])) || 0);
  const tel = (f) => tki.filter(f).length;
  const samantekt = { slokkvitaeki: tel((t) => t.bunadur === 'Handslökkvitæki'), slongur: tel((t) => t.bunadur === 'Slöngukefli'),
    utgangar: tel((t) => t.flokkur === 'flotti' && t.tegund === 'Útidyr'), flottaleidir: tel((t) => t.tegund === 'Flóttaleið innanhúss'), bjorgunarop: tel((t) => t.bunadur === 'Björgunarop'),
    reykskynjarar: tel((t) => t.bunadur === 'Reykskynjari'), hitaskynjarar: 0, handbodar: 0,
    mhl: [{ mhl: '01', m2: 1317.6, haedir: '1. hæð + milliloft (6 bil)' }] };
  console.log('tæki:', tki.length, JSON.stringify(samantekt));
  console.log(' dæmi S1:', JSON.stringify(tki.find((t) => t.audkenni === 'S1')));
  console.log(' dæmi ÚT-flokkar:', [...new Set(tki.filter((t) => t.flokkur === 'flotti').map((t) => t.tegund))].join(' | '));

  // ---------- 3) teikning_bord ----------
  const nytt = (haed) => slf.concat(slg).filter((i) => i.haed === haed).map((i) => {
    const t = tki.find((x) => x.audkenni === i.audkenni);
    return { unitId: nyttId[i.audkenni], x: Math.round(i.bx), y: Math.round(i.by), nytt: true, tegund: i.flokkur === 'slanga' ? 'Brunaslanga' : 'Duft', stada: 'bid', audkenni: i.audkenni, stadur: t.stadur };
  });
  const haedir = [
    { id: h1.id, nafn: '1. hæð', image_url: '/.netlify/functions/teikn-mynd?url=' + encodeURIComponent(PDF25), markers: nytt(1), veggir: [], pdfVeggir: [], frum: FRUM, skurdur: SKURDUR[1], sjalf: false, thett: true, syn: { a: false, fest: true } },
    { id: h2.id, nafn: '2. hæð', image_url: slodir[2], markers: nytt(2), veggir: [], pdfVeggir: [], frum: FRUM, skurdur: SKURDUR[2], sjalf: false, thett: true, syn: { a: false, fest: true } },
  ];
  console.log('merki á borði:', haedir.map((x) => x.nafn + ' ' + x.markers.length).join(' · '));

  // ---------- 4) bunadargreining ----------
  const teikningar = [1, 2].map((n) => ({ id: blad[n], nafn: hnafn[n] + ' — aðaluppdráttur 15 023 (blað ' + n + ')', mynd: slodir[n], frum: FRUM, skurdur: SKURDUR[n], heimild: 'Aðaluppdráttur samþ. 17.09.2025 (útg. ' + (n === 1 ? 'F' : 'E') + ')' }));
  const BL = 'Byggingarlýsing á aðaluppdrætti 15 023 bl. 3 (Haukur Ásgeirsson, Verkfræðistofa Hauks Ásgeirssonar), samþ. 17.09.2025';
  const kafl = (f, t, l) => ({ fyrirsogn: f, texti: t, lykill: !!l });
  const texti = [{ mhl: '01', titill: 'Brunavarnir — Suðurhella 5 (geymslur/verkstæði, 6 bil, milliloft)', heimild: BL, kaflar: [
    kafl('Brunahólfun', 'Allir brunahólfandi veggir eru með klæðningu í flokki 1. og einangraðir með steinull eða staðsteyptir. Allar klæðningar í þjónustu/skrifstofu eru í flokki 1.'),
    kafl('Milligólf og stigar', 'Milligólf yfir geymslum er úr holplötum, stigar eru staðsteyptir. Milligólfið og stigi sé REI90.'),
    kafl('Brunaviðvörun', 'Fullgilt brunaviðvörunarkerfi er í húsinu, tengt stjórnstöð, sem skal upfylla leiðbeningum HMS og ÍST EN 54', true),
    kafl('Útljós og neyðarlýsing', 'Út og neyðarlýsing er í öllu húsinu.', true),
    kafl('Þak', 'Þak í verkstæðishluta skal hafa 5% m² af heildar þakfleti auðbrennanlega þakglugga.'),
    kafl('Milliloft', 'Opið milliloft er eingöngu til notkunar sem geymsla.'),
    kafl('Björgunarop (blað 2)', 'BJÖRGUNAROP, TOPPHENGDUR HLERI SKAL VERA HÆGT AÐ FESTA Í OPINNI STÖÐU ÞANNIG AÐ HÆGT SÉ AÐ KOMAST ÚT ÁN ÞESS AÐ ÞURFA AÐ HALDA HONUM OPNUM. MINNSTA LEYFANLEGT LJÓSOP ER 60CM Á BREIDD OG 90 CM Á HÆÐ. Á BJÖRGUNAROPI SKAL VERA BÚNAÐUR SEM HINDRAR AÐ BÖRN GETI OPNAÐ HANN Í MEIRA EN 89mm', true),
  ] }];
  const B16 = HF + 'B20161205_Sudurhella_5_';
  const heimildir = [
    { titill: 'Aðaluppdráttur — grunnmyndir 1. og 2. hæðar (millilofts), snið, útlit, skráningartafla (VHÁ/Ívar Hauksson)', dags: '2025-09-17', slod: PDF25, gildir: true, athugasemd: 'Gildandi — samþ. byggingarfulltrúa 17.09.2025 (útg. F 15.09.2025). Búnaðurinn lesinn hér (SL = handslökkvitæki, BS 20 m = brunaslanga, R, ÚT, BO).' },
    { titill: 'Grunnmynd 2. hæðar, snið, afstöðumynd (Verkfræðistofa Hauks Ásgeirssonar)', dags: '2016-09-14', slod: B16 + '002.pdf', gildir: false, athugasemd: 'Eldri — Teikning staðarins notaði þetta blað fyrir báðar hæðir. Milliloft og stigar breytt 2025; SL við stiga sama og nú.' },
    { titill: 'Grunnmynd 1. hæðar (stimplað af Slökkviliði Hafnarfjarðar)', dags: '2016-09-14', slod: B16 + '.pdf', gildir: false, athugasemd: 'Eldri útgáfa 1. hæðar — leyst af hólmi 2025.' },
    { titill: 'Útlit og byggingarlýsing (2016)', dags: '2016-09-14', slod: B16 + '003.pdf', gildir: false, athugasemd: 'Eldri — byggingarlýsing 2025 gildir.' },
    { titill: 'Raflagnateikningar, lágspenna (Rafal ehf)', dags: '2018-10-19', slod: HF + 'S20181121_Sudurhella_5_004.pdf', gildir: false, athugasemd: 'Skannaðar lagnateikningar 2018 — ekki lesnar; brunaviðvörunarkerfi skv. byggingarlýsingu 2025 (ÍST EN 54).' },
  ];
  heimildir[2].slod = HF + 'B20161205_Sudurhella_5_.pdf';
  const athugasemdir = [
    'Gildandi teikning er aðaluppdráttur samþykktur 17.09.2025 (útg. F/E). Teikning staðarins var á 2016-blaðinu (B20161205_…_002) fyrir báðar hæðir — eldri útgáfa; merkin eru nú sett á gildandi blöð.',
    'Handslökkvitæki (SL): 11 á 1. hæð (framhlið við hverja flóttahurð 6 + bakhlið 5) og 6 á millilofti (við stigann niður í hverju bili) = 17. Brunaslanga 20 m (BS): ein í hverju bili á framhlið (6).',
    'Bil 0104 hefur aðeins eitt slökkvitæki (framhlið) — ekkert SL teiknað við bakhliðarútganginn, ólíkt hinum bilunum. Athuga hjá hönnuði eða bæta við.',
    'Teikningin tilgreinir ekki tegund handslökkvitækja — Duft 6 kg er tillaga (geymslur/verkstæði, 165.BR1). Slöngukefli 20 m eru samkvæmt teikningu.',
    'Ekkert tæki er skráð á staðinn (uttaeki tómt) — öll tækin eru „Nýtt — í bið“ á Teikningu þar til þau eru skráð.',
    'Reykskynjarar (R): 10 á 1. hæð + 9 á millilofti = 19; ÚT 12 (6 við framhlið, 5 við bakhlið, 1 flóttaleið innanhúss í bili 0105); björgunarop 6 á millilofti. 6 „!“-tákn (stjórnstöð skv. skýringum) við bakhliðarútganga 1. hæðar eru ekki talin með (tákn, ekki texti).',
    'Skráðar eignir 0101, 0102, 0104, 0105, 0106 (skráningartafla) — 0103 vantar í töfluna en er á teikningu; 0113 er tæknirými (5,7 m²).',
  ];
  const grein = { company_id: CID, landnr: 204735, heimilisfang: 'Suðurhella 5, 221 Hafnarfjörður', stada: 'tillaga', af: 'Claude (Arnold) — lesið af aðaluppdrætti 2025 (textalag)',
    tki, texti, heimildir, athugasemdir, samantekt, teikningar, skyrsla: null };
  if (PRUFA) { console.log('PRUFA — ekkert skrifað'); return; }

  const r1 = await fetch(U + '/rest/v1/teikning_bord?company_id=eq.' + CID + '&updated_at=eq.' + encodeURIComponent(row.updated_at), { method: 'PATCH', headers: Object.assign({ Prefer: 'return=representation' }, h),
    body: JSON.stringify({ haedir, image_url: haedir[0].image_url, markers: haedir[0].markers, updated_by: 'Claude (Búnaðargreining)', updated_at: new Date().toISOString() }) });
  const j1 = await r1.json(); if (!r1.ok || !j1.length) throw new Error('teikning_bord: ' + r1.status + ' ' + JSON.stringify(j1).slice(0, 200) + ' (röðinni var breytt á meðan?)');
  console.log('teikning_bord vistað:', j1[0].haedir.map((x) => x.nafn + ' ' + x.markers.length + ' merki').join(' · '));
  const r2 = await fetch(U + '/rest/v1/bunadargreining', { method: 'POST', headers: Object.assign({ Prefer: 'return=representation' }, h), body: JSON.stringify(grein) });
  const j2 = await r2.json(); if (!r2.ok) throw new Error('bunadargreining: ' + r2.status + ' ' + JSON.stringify(j2).slice(0, 300));
  console.log('greining id', j2[0].id, '·', j2[0].tki.length, 'atriði');
})().catch((e) => { console.error('VILLA ' + e.message); process.exit(1); });
