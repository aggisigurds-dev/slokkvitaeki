#!/usr/bin/env node
/* Skráir í kerfið þá 2025-reikninga úr Drive-möppunni sem raunverulega vantaði.
 *
 * FORSAGAN — og hvers vegna talan er fjórir en ekki átján:
 *
 * Fyrri samanburður sagði „18 einstök 2025-invoice vantar, 1.300.442 kr".
 * Sú tala stóðst ekki. Hún byggði á lyklinum KENNITALA + UPPHÆÐ úr
 * SKRÁARHEITINU, og þrennt brást við það:
 *
 *   1. Samanburðurinn sleppti VÍSVITANDI búðar-reikningum kerfismegin. Sjö
 *      þeirra „vantandi" voru þegar skráðir, bara með vidskiptategund='bud'.
 *   2. Kennitalan kerfismegin var leyst úr fyrirtaeki_id. Sé skjalið vistað á
 *      starfsstöð sem ber aðra kennitölu en greiðandinn — sem er reglan hjá
 *      rekstrarfélögum — fannst samsvörunin ekki þótt reikningurinn væri til.
 *   3. SKRÁARHEITIÐ LÝGUR. Sjö af átján voru KREDITNÓTUR sem heitið sýndi sem
 *      jákvæða upphæð, og þrjár þeirra eru frá 2024, ekki 2025. Stærsta
 *      „vantandi reikningnum", 341.673 kr, fylgdi kredit frá 21.10.2024.
 *      Hefði listanum verið treyst hefðu kreditnótur verið bókfærðar sem tekjur.
 *
 * Eini lykillinn sem lýgur ekki er REIKNINGSNÚMERIÐ inni í PDF-inu. Allar 18
 * skrárnar voru lesnar og bornar saman við customer_documents.invoice_number.
 * Fjórtán fundust. Fjórir ekki — og þeir eru þessir, allir jákvæðir reikningar
 * frá 2025, samtals 355.263 kr.
 *
 * VIDSKIPTATEGUND ræðst af línunni „Skýrslugerð og vottun" á reikningnum:
 * hún er það sem gerir verkið að úttekt með skýrslu. Staðgreitt-reikningurinn
 * ber hana ekki (aðeins Akstur + Hleðsla CO2) og telst því búðarsala — sem
 * fellur líka að kt 999999-9999, gengt-inn-konvensjóninni.
 *
 * STAÐSETNINGIN kemur úr „Vegna"-línu reikningsins hjá þeim tveimur
 * viðskiptavinum sem eiga marga staði. Án hennar væri ekki hægt að velja rétta
 * fyrirtaeki_id og skjalið lenti á röngu húsi.
 *
 * Aðalskoðunar-reikningurinn á ÞRJÁ eins Drive-afritun ((2) og (3) eru
 * Drive-nafngift á endurteknu upphali). Ein röð er skráð, ekki þrjár; hin
 * auðkennin fara í notes.
 *
 * Keyrsla:   node tools/setja-inn-vantandi-2025.cjs           (þurrkeyrsla)
 *            node tools/setja-inn-vantandi-2025.cjs --keyra   (skrifar)
 */
const fs = require('fs');
const path = require('path');

const rot = path.join(__dirname, '..');
const cfg = fs.readFileSync(path.join(rot, 'js/config.js'), 'utf8');
const URL_ = (cfg.match(/SUPABASE_URL\s*=\s*["']([^"']+)/) || [])[1];
const KEY = (cfg.match(/SUPABASE_KEY\s*=\s*["']([^"']+)/) || [])[1];
const H = { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json' };

const KEYRA = process.argv.includes('--keyra');
const MERKI = 'claude-drive-2025-vantandi-20260901';

// Lesið beint úr PDF-unum 01.09.2026. Upphæð = „Til greiðslu" af reikningnum.
const RADIR = [
  {
    invoice_number: 'R-106443', doc_date: '2025-03-06', amount: 25157,
    fyrirtaeki_id: 261,   // Aðalskoðun - Grjótháls — reikningurinn segir „Vegna Gjótháls"
    customer_base_id: 412, customer_name: 'Aðalskoðun hf.',
    vidskiptategund: 'uttekt',   // ber „Skýrslugerð og vottun"
    drive_file_id: '1bIc0ShtSWQfBC6e2u425n37CUf6ntsLq',
    file_name: 'Aðalskoðun - Pósthólf 393, 222 Hafnarfirði - 540994-2269 - 2025 - 25.157 kr.pdf',
    notes: 'Skráð 2026-09-01 úr Drive-möppu 2025. Vegna Gjótháls. Þrjú eins Drive-afrit: '
         + '1bIc0ShtSWQfBC6e2u425n37CUf6ntsLq, 1eVZJZXNgwOcmtsPwJCvhwxbbgTxIu6Gs, 1Z5-r2jUucjIFULVgW0bqXUivQCer9X3Z',
  },
  {
    invoice_number: 'R-107470', doc_date: '2025-10-30', amount: 29274,
    fyrirtaeki_id: 1327,  // Bæjarbakarí — einn staður
    customer_base_id: 903, customer_name: 'Bæjarbakarí ehf',
    vidskiptategund: 'uttekt',
    drive_file_id: '1JxuUwyirPp5Lds08iAo3UISCBuphyAyX',
    file_name: 'Bæjarbakarí - 690890-1439 - 2025 - 29.274 kr.pdf',
    notes: 'Skráð 2026-09-01 úr Drive-möppu 2025.',
  },
  {
    invoice_number: 'R-107257', doc_date: '2025-09-01', amount: 289900,
    fyrirtaeki_id: 193,   // Center Hótel - Plaza — reikningurinn segir „Vegna Plaza"
    customer_base_id: 146, customer_name: 'Miðbæjarhótel/Centerhotels ehf.',
    vidskiptategund: 'uttekt',
    drive_file_id: '1mKVcLgzEnNxxSxJIR5IhH_scw5I5u1Fc',
    file_name: 'Center Hótel - Aðalstræti 6, 101 Reykjavík - 450905-1430 - 2025 - 289.900 kr.pdf',
    notes: 'Skráð 2026-09-01 úr Drive-möppu 2025. Vegna Plaza — 33 yfirferðir léttvatn, 39 brunaslöngur.',
  },
  {
    invoice_number: 'R-107395', doc_date: '2025-10-03', amount: 10932,
    fyrirtaeki_id: 593,   // Staðgreitt (gengt inn, kt 999999-9999)
    customer_base_id: 870, customer_name: 'Staðgreitt',
    vidskiptategund: 'bud',      // engin „Skýrslugerð og vottun" — aðeins akstur + hleðsla
    drive_file_id: '1onr0hnKphXLMpi7oa-HXcMqMPLUtVaU8',
    file_name: 'Staðgreitt - 999999-9999 - 2025 - 10.932 kr.pdf',
    notes: 'Skráð 2026-09-01 úr Drive-möppu 2025.',
  },
];

(async () => {
  // ── Öryggisathugun: ekkert skrifað ef reikningsnúmerið er þegar til ──────
  // Sé þessi skrifta keyrð tvisvar má hún ekki búa til tvítök. Þetta er líka
  // vörnin gegn því að önnur vél hafi skráð þá í millitíðinni.
  const nr = RADIR.map(r => r.invoice_number.replace(/\D/g, ''));
  const r = await fetch(`${URL_}/rest/v1/customer_documents?select=id,invoice_number,year,amount`
    + `&or=(${nr.map(n => `invoice_number.eq.R-${n}`).join(',')})`, { headers: H });
  if (!r.ok) throw new Error(`${r.status} ${(await r.text()).slice(0, 200)}`);
  const til = await r.json();

  if (til.length) {
    console.log(`⛔ ${til.length} af ${RADIR.length} eru ÞEGAR í kerfinu — ekkert skrifað:\n`);
    til.forEach(d => console.log(`   röð ${d.id}  ${d.invoice_number}  ár ${d.year}  ${d.amount} kr`));
    console.log('\n   Fjarlægðu þá úr RADIR eða athugaðu hvort þeir séu réttir.');
    process.exitCode = 1;
    return;
  }

  const nyjar = RADIR.map(x => ({
    ...x,
    doc_type: 'reikningur',
    year: 2025,
    source: 'gdrive',
    found_by: MERKI,
    is_duplicate: false,
    reviewed: false,
  }));

  console.log(`${RADIR.length} raðir tilbúnar — samtals ${RADIR.reduce((s, x) => s + x.amount, 0).toLocaleString('de-DE')} kr\n`);
  nyjar.forEach(x => console.log(`   ${x.invoice_number}  ${x.doc_date}  ${String(x.amount).padStart(7)} kr  `
    + `fid ${x.fyrirtaeki_id}  ${x.vidskiptategund}  ${x.customer_name}`));

  if (!KEYRA) {
    console.log('\nÞurrkeyrsla — ekkert skrifað. Keyrðu með --keyra til að skrifa.');
    return;
  }

  const w = await fetch(`${URL_}/rest/v1/customer_documents`, {
    method: 'POST',
    headers: { ...H, Prefer: 'return=representation' },
    body: JSON.stringify(nyjar),
  });
  if (!w.ok) { console.log(`❌ Skrif brást: ${w.status} ${(await w.text()).slice(0, 300)}`); process.exitCode = 1; return; }
  const bjo = await w.json();

  // Afrit af því sem varð til — svo hægt sé að bakka nákvæmlega þessum röðum.
  const bakk = path.join(__dirname, 'bakk-vantandi-2025-2026-09-01.json');
  fs.writeFileSync(bakk, JSON.stringify(bjo, null, 1), 'utf8');

  console.log(`\n✅ ${bjo.length} raðir skráðar — id ${bjo.map(x => x.id).join(', ')}`);
  console.log(`   Afrit: ${path.relative(rot, bakk)}`);
  console.log(`   Bakkað með:  DELETE FROM customer_documents WHERE found_by = '${MERKI}';`);
})().catch(e => { console.log('❌ ' + e.message); process.exitCode = 1; });
