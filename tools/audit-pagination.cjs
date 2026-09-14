#!/usr/bin/env node
/* audit-pagination — finnur Supabase-fyrirspurnir sem geta lent á 1000-raða þakinu.
 *
 * PostgREST skilar að HÁMARKI 1000 röðum sjálfgefið ("Max rows" í Supabase API
 * stillingum). Fyrirspurn án .range() á töflu með fleiri en 1000 raðir skilar
 * ÞÖGULT bara fyrstu 1000 — engin villa, engin viðvörun, bara gögn sem vantar.
 *
 * Þetta beit okkur 2026-07-20. Dæmi sem fundust og voru lagfærð:
 *   • fyrirtækjalistinn taldi 1000 af 6.385 tækjum (84% vantaði)
 *   • Stjórnstöðin sá 1000 af 3.749 tækjum á gjalddaga (73% vantaði)
 *   • ársskoðunar-árdálkurinn sýndi „vantar" fyrir ~690 fyrirtæki
 *
 * Rétta lausnin er ALDREI að hækka þakið í Supabase — það hægir á öllu og færir
 * bara klettinn. Blaðsíðuflettu í staðinn:
 *     DB.fetchAll((from, to) => <fyrirspurn>.range(from, to))
 *
 * Keyrsla:  node tools/audit-pagination.cjs [mappa]      (sjálfgefið "js")
 * Skilar 0 ef ekkert grunsamlegt finnst, annars 1 (nothæft í CI).
 *
 * ATH: uppfærðu BIG þegar tafla fer yfir ~1000 raðir:
 *   select relname, n_live_tup from pg_stat_user_tables
 *    where schemaname='public' and n_live_tup > 900 order by n_live_tup desc;
 */
'use strict';
const fs = require('fs'), path = require('path');

// Töflur sem eru YFIR 1000 raðir í dag — fyrirspurn án .range() á þær tapar
// gögnum núna. Mælt 10.09.2026: fyrirtaeki 1460 (1311 óeydd) · customers_base 1142.
// 13.09.2026: thjonustubeidni fór yfir þakið — 1026 raðir (821 óeyddar); audit-rodafjoldi varð rauður.
const BIG = ['email_digest', 'ajour_registrations', 'uttaeki', 'timavera_entries',
             'customer_documents', 'geocode_cache', 'fyrirtaeki', 'customers_base', 'thjonustubeidni'];

/* NÆSTU Í RÖÐINNI — mælt 10.09.2026, ALLAR UNDIR ÞAKINU ENN:
 *     thjonustubeidni          854   (146 raðir eftir)
 *     solur                    806   (194 raðir eftir)
 *     arsskodun_report_facts   649   (351 raðir eftir — ein röð á fyrirtæki,
 *                                     svo þakið hennar er fjöldi fyrirtækja: 1311)
 *
 * ÉG SETTI ÞÆR INN Í BIG OG TÓK ÞÆR ÚT AFTUR — og það er þess virði að skrá
 * hvers vegna. Með þeim inni fór talningin úr 4 í 22. Þessar 18 eru ekki villur
 * í dag; töflurnar rúmast allar í einni síðu. Eini kosturinn til að halda þeim
 * inni hefði verið að hækka BASELINE úr 4 í 22 — og þar með að þagga niður
 * nákvæmlega jafn mörg raunveruleg tilvik og hún hefði afhjúpað. Baseline sem er
 * hækkuð til að fá grænt er ekki vörður, hún er slökkvari. (Sbr. audit-invoice-guard
 * sem stóð grænn á BASELINE = 40 yfir 40 tómum sölum.)
 *
 * ÞESSI HLIÐ ER NÚ MÆLD (10.09.2026): tools/audit-rodafjoldi.cjs telur þessar
 * þrjár töflur í hverri netkeyrslu og verður RAUÐUR daginn sem ein fer yfir 1000
 * — áður en fyrsta röðin týnist. Rétta lausnin var ekki að giska í kóða heldur
 * að MÆLA raðafjöldann; sá vörður þarf net og á því heima þar, ekki hér.
 *
 * Þegar tafla fer yfir 1000: færðu hana upp í BIG og lagaðu það sem hún flaggar.
 *   select relname, n_live_tup from pg_stat_user_tables
 *    where schemaname='public' and n_live_tup > 900 order by n_live_tup desc;
 */

// Mældar undanþágur — fyrirspurnir sem skila örugglega vel undir 1000 röðum.
// Hver færsla ber ástæðu svo hægt sé að endurmeta þegar gögnin vaxa.
const ALLOW = [
  [/status['"]\s*,\s*['"]geymsla/,            'geymsla = 7 raðir'],
  [/is_bank_only/,                            'is_bank_only = 218 raðir'],
  [/gte\(\s*['"]next_insp/,                   'dagsetningargluggi (~408 raðir)'],
  [/gte\(\s*['"]last_insp/,                   'dagsetningargluggi (vikuskýrsla)'],
  [/gte\(\s*['"]created_at/,                  'aðeins nýlegar raðir'],
  [/eq\(\s*['"]year['"]/,                     'eitt ár (~547 raðir)'],
  [/like\(\s*['"]serial['"]/,                 'eitt raðnúmera-forskeyti'],
  [/ilike\(\s*['"]client['"]|client\.ilike|client\.eq/, 'eitt fyrirtæki'],
  [/eq\(\s*['"]client['"]/,                   'tæki EINS fyrirtækis'],
  [/ilike\(\s*['"]nafn['"]/,                  'nafnaleit (fá svör)'],
  [/custFilter/,                              'leitarsía notanda'],
  [/orParts|ors\.join/,                       'afmarkað við sýnileg fyrirtæki'],
  // 10.09.2026 — síðustu fjórar „þekktu" fyrirspurnirnar, hver MÆLD. Þær stóðu á
  // BASELINE = 4: vörðurinn þagði um þessi fjögur tilvik og hefði þagað um fjögur
  // NÝ til viðbótar. Hver fær nú sína mældu ástæðu, og BASELINE fer í 0.
  // Kennitölu-færslan grípur AÐEINS nákvæmlega tvær kennitala.eq-greinar og ekkert
  // annað: .or('kennitala.eq.X,nafn.ilike.*Y*') er ekki afmarkað og sleppur ekki hér.
  [/\.or\(\s*['"]kennitala\.eq\.['"]\s*\+\s*[\w.$]+\s*\+\s*['"],kennitala\.eq\.['"]\s*\+\s*[\w.$]+\s*\)/,
                                              'ein kennitala í tveimur stafsetningum — mest 11 fyrirtæki á kt (175, 226)'],
  [/eq\(\s*['"]rekstrarfelag['"]/,            'eitt rekstrarfélag — stærsti hópur 65 raðir í customers_base (285)'],
  [/eq\(\s*['"]doc_type['"]\s*,\s*['"]samningur['"]/, 'samningar — 360 raðir ALLS í customer_documents (274); VEX — mælt í hverri keyrslu í audit-rodafjoldi'],
];

const root = process.argv[2] || 'js';
const files = [];
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) { if (!/node_modules|\.git|dist/.test(p)) walk(p); }
    else if (e.name.endsWith('.js')) files.push(p);
  }
})(root);

const risky = [];
for (const f of files) {
  const src = fs.readFileSync(f, 'utf8');
  const re = /\.from\(\s*['"]([a-z_]+)['"]\s*\)/g;
  let m;
  while ((m = re.exec(src))) {
    const tbl = m[1];
    if (!BIG.includes(tbl)) continue;
    // Horfum líka aðeins AFTUR fyrir — fyrirspurnin gæti verið vafin í fetchAll(...)
    const pre = src.slice(Math.max(0, m.index - 120), m.index);
    const seg = src.slice(m.index, m.index + 700).split(/;\s*\n/)[0];
    const ctx = pre + seg;
    if (/\.(insert|update|upsert|delete)\(/.test(seg)) continue;             // skriftir
    if (/\.range\(|\.limit\(|maybeSingle\(|\.single\(/.test(ctx)) continue;  // afmarkað — .limit(N>1000) grípur FAST-reglan neðar
    if (/fetchAll\s*\(/.test(pre)) continue;                                 // vafið í fetchAll
    // Handvirk undanþága: settu  // audit-pagination:ok — <ástæða>  beint fyrir ofan
    // fyrirspurn sem er afmörkuð í ÖÐRU skrefi (t.d. q = q.eq(...) síðar).
    if (/audit-pagination:ok/.test(pre) || /audit-pagination:ok/.test(seg)) continue;
    if (/count:\s*['"]exact['"]/.test(seg) && /head:\s*true/.test(seg)) continue; // bara talning
    if (/\.eq\(\s*['"](id|kennitala|kt|customer_base_id|fyrirtaeki_id|serial)['"]/.test(seg)) continue;
    if (/\.in\(/.test(seg)) continue;
    if (ALLOW.some(([re2]) => re2.test(seg))) continue;
    risky.push({ file: f.split(path.sep).join('/'), line: src.slice(0, m.index).split('\n').length,
                 tbl, seg: seg.replace(/\s+/g, ' ').slice(0, 140) });
  }
}

/* ── FASTUR GLUGGI STÆRRI EN ÞAKIÐ ───────────────────────────────────────────
 * Gatið sem hleypti villunni í loftið 10.09.2026.
 *
 * Fyrri útgáfa taldi HVAÐA `.range(` sem er sem blaðsíðuflettingu (lína ~76) og
 * hleypti því `.range(0, 2999)` beint í gegn. Það kall lítur út eins og vörn en
 * er það ekki: PostgREST sker í 1000 óháð því hvað beðið er um, skilar status
 * 200 og `content-range: 0-999/*`. Mælt á lifandi grunni sama dag —
 * `Range: 0-2999` á `fyrirtaeki` (1460 raðir) skilaði nákvæmlega 1000. Engin
 * villa. Þögult tap á 460 fyrirtækjum.
 *
 * Afleiðingin í reynd: Þjónustuborðið skrifaði `fyrirtaeki_id = null` fyrir
 * hvert fyrirtæki sem lenti utan fyrstu 1000 — „✏️ Tengja" virtist virka og
 * tengingin varð aldrei til. Fyrirtæki INNAN sneiðarinnar virkuðu, sem er
 * ástæðan fyrir að þetta leit út eins og duttlungar.
 *
 * REGLAN: fastur `.range(a, b)` þar sem b-a+1 > 1000 er ALLTAF rangur, óháð
 * töflu. Talan sjálf er yfirlýsing höfundarins um að hann búist við fleiri en
 * 1000 röðum — og hann fær þær aldrei. Annaðhvort skilar fyrirspurnin færri en
 * 1000 (þá er talan óþörf lygi) eða nákvæmlega 1000 (þá vantar gögn). Í báðum
 * tilvikum á að blaðsíðufletta. Engin ALLOW-undanþága á við hér, og þess vegna
 * er engin grunnlína á þessari reglu — hún er RAUÐ frá fyrsta broti.
 */
const FAST = /\.range\(\s*(\d+)\s*,\s*(\d+)\s*\)/g;
/* ── .limit(N) MEÐ N > 1000 — SAMA GILDRAN (14.09.2026) ───────────────────────
 * Aðalreglan að ofan telur hvert `.limit(` sem afmörkun og hleypti því
 * `.limit(5000)` í gegn. PostgREST sker þar líka í 1000, skilar 200 og segir
 * ekkert. Mælt á lifandi grunni 14.09.2026: 20 slík köll í js/, og fjögur voru
 * þegar að tapa röðum —
 *   • 153 v_skodunar_manudur .limit(3000): 1000 af 1.250 — allir staðir eftir
 *     id 1544 duttu úr uppflettingunni, og gatið stækkar með hverjum nýjum stað
 *   • 236 customers_base .limit(5000): 1000 af 1.152 — Sameining sá ekki 152
 *     grunna og bauð „🆕 Ný base" þar sem grunnur var þegar til
 *   • 27 fyrirtaeki .limit(2000) ×2: 1000 af 1.250 / 1.180 — nafnalistar Tilboðs
 *     og Sérverðs enduðu í „S"
 * Talan N > 1000 er sjálf yfirlýsing um að fleiri raðir séu væntanlegar, óháð
 * BIG-listanum. Sama regla og um fastan glugga: RAUTT frá fyrsta broti, engin
 * grunnlína, engin ALLOW. `.limit(N ≤ 1000)` er áfram lögmæt afmörkun.
 */
const FAST_LIMIT = /\.limit\(\s*(\d+)\s*\)/g;
const ofstor = [];
// Athugasemd sem LÝSIR villunni er ekki villan. Fyrsta útgáfa þessarar reglu
// flaggaði skýringarnar sem voru skrifaðar við hliðina á lagfæringunum í
// 231/358 — vörður sem gelgir að ósekju verður þaggaður. Því eru blokkar- og
// línuathugasemdir fjarlægðar fyrst, en línunúmerin varðveitt með því að skipta
// þeim út fyrir jafnmörg bil. Hreinsirinn les strengi, sniðmát og regex og er
// sameiginlegur fjórum vörðum — sjá haus tools/_athugasemdir.cjs (14.09.2026).
const { anAthugasemdaJs: anAthugasemda } = require('./_athugasemdir.cjs');
for (const f of files) {
  const src = anAthugasemda(fs.readFileSync(f, 'utf8'));
  const skra = (idx, bad, form) => {
    const fyrir = src.slice(Math.max(0, idx - 900), idx);
    const t = [...fyrir.matchAll(/\.from\(\s*['"]([a-z_0-9]+)['"]\s*\)/g)].pop();
    ofstor.push({ file: f.split(path.sep).join('/'),
                  line: src.slice(0, idx).split('\n').length,
                  tbl: t ? t[1] : '(óþekkt)', bad, form });
  };
  let mm;
  FAST.lastIndex = 0;
  while ((mm = FAST.exec(src)) !== null) {
    const bad = (+mm[2]) - (+mm[1]) + 1;
    if (bad > 1000) skra(mm.index, bad, '.range(' + mm[1] + ', ' + mm[2] + ')');
  }
  FAST_LIMIT.lastIndex = 0;
  while ((mm = FAST_LIMIT.exec(src)) !== null) {
    if (+mm[1] > 1000) skra(mm.index, +mm[1], '.limit(' + mm[1] + ')');
  }
}
if (ofstor.length) {
  console.log('❌ audit-pagination: ' + ofstor.length +
    ' fyrirspurn(ir) biðja um FLEIRI en 1000 raðir í einu kalli — og fá 1000:\n');
  ofstor.sort((a, b) => b.bad - a.bad).forEach(h =>
    console.log('  bað um ' + String(h.bad).padStart(5) + '  ' + h.tbl.padEnd(24) +
                (h.file + ':' + h.line).padEnd(48) + h.form));
  console.log('\nPostgREST sker í 1000 og segir EKKI frá — hvorki við .range() né .limit(). Blaðsíðuflettu í staðinn:');
  console.log('    DB.fetchAll((from, to) => <fyrirspurn>.order(<einkvæmur dálkur>).range(from, to))');
  console.log('RED: fastur gluggi eða .limit() yfir 1000 er alltaf rangur — engin grunnlína á þessari reglu.');
  process.exit(1);
}

// BASELINE 0 frá 10.09.2026. Stóð á 4 frá 20.08 og þaggaði fjórar þekktar
// fyrirspurnir í einu lagi — og hefði þaggað HVERJAR fjórar sem er, líka nýjar.
// Hver var mæld og fékk eigin ALLOW-færslu að ofan (175, 226, 285, 274); sú eina
// sem vex með rekstrinum (samningar) er mæld í hverri keyrslu í audit-rodafjoldi.
// Ný ópöguð fyrirspurn á BIG-töflu er nú RAUÐ frá fyrstu línu. Hækkaðu þetta
// ALDREI til að fá grænt: lagaðu fyrirspurnina, eða MÆLDU hana inn í ALLOW.
const BASELINE = 0;
if (!risky.length) {
  console.log('✅ audit-pagination: ekkert grunsamlegt (' + files.length + ' skrár skoðaðar).');
  process.exit(0);
}
console.log((risky.length > BASELINE ? '❌' : '⚠️ ') + ' audit-pagination: ' + risky.length + ' fyrirspurn(ir) gætu lent á 1000-raða þakinu:\n');
risky.forEach(h => console.log('  ' + h.tbl.padEnd(20) + h.file + ':' + h.line + '\n      ' + h.seg + '\n'));
console.log('Lagfæring:  DB.fetchAll((from, to) => <fyrirspurn>.range(from, to))');
if (risky.length > BASELINE) {
  console.log('RED: ' + risky.length + ' > baseline ' + BASELINE + ' — NÝ ópöguð fyrirspurn bættist við. Lagaðu hana (eða ALLOW ef örugglega <1000).');
  process.exit(1);
}
console.log('OK — ' + risky.length + ' þekktar (<= baseline ' + BASELINE + '); engin NÝ ópöguð fyrirspurn.');
process.exit(0);
