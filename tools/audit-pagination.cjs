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

// Töflur sem eru (eða verða fljótt) yfir 1000 raðir.
// Mælt 10.09.2026: fyrirtaeki 1460 · customers_base 1142 · thjonustubeidni 854
// · arsskodun_report_facts 649. Síðustu tvær eru UNDIR þakinu en teljast með —
// thjonustubeidni á 146 raðir eftir í klettinn og enginn tekur eftir því daginn
// sem hún fer yfir. Það er einmitt mynstrið sem þessi vörður á að stöðva.
const BIG = ['email_digest', 'ajour_registrations', 'uttaeki', 'timavera_entries',
             'customer_documents', 'geocode_cache', 'fyrirtaeki', 'customers_base',
             'thjonustubeidni', 'arsskodun_report_facts', 'solur'];

// Mældar undanþágur — fyrirspurnir sem skila örugglega vel undir 1000 röðum.
// Hver færsla ber ástæðu svo hægt sé að endurmeta þegar gögnin vaxa.
const ALLOW = [
  [/status['"]\s*,\s*['"]geymsla/,            'geymsla = 7 raðir'],
  [/is_bank_only/,                            'is_bank_only = 218 raðir'],
  [/gte\(\s*['"]next_insp/,                   'dagsetningargluggi (~408 raðir)'],
  [/gte\(\s*['"]last_insp/,                   'dagsetningargluggi (vikuskýrsla)'],
  [/gte\(\s*['"]created_at/,                  'aðeins nýlegar raðir'],
  [/eq\(\s*['"]year['"]/,                     'eitt ár (~547 raðir)'],
  [/not\(\s*['"]netfang['"]\s*,\s*['"]is['"]/, 'm/netfang = 620 raðir'],
  [/like\(\s*['"]serial['"]/,                 'eitt raðnúmera-forskeyti'],
  [/ilike\(\s*['"]client['"]|client\.ilike|client\.eq/, 'eitt fyrirtæki'],
  [/eq\(\s*['"]client['"]/,                   'tæki EINS fyrirtækis'],
  [/ilike\(\s*['"]nafn['"]/,                  'nafnaleit (fá svör)'],
  [/custFilter/,                              'leitarsía notanda'],
  [/orParts|ors\.join/,                       'afmarkað við sýnileg fyrirtæki'],
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
    if (/\.range\(|\.limit\(|maybeSingle\(|\.single\(/.test(ctx)) continue;  // blaðsíðuflett
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
const ofstor = [];
for (const f of files) {
  const src = fs.readFileSync(f, 'utf8');
  let mm;
  FAST.lastIndex = 0;
  while ((mm = FAST.exec(src)) !== null) {
    const bad = (+mm[2]) - (+mm[1]) + 1;
    if (bad <= 1000) continue;
    const fyrir = src.slice(Math.max(0, mm.index - 900), mm.index);
    const t = [...fyrir.matchAll(/\.from\(\s*['"]([a-z_0-9]+)['"]\s*\)/g)].pop();
    ofstor.push({ file: f.split(path.sep).join('/'),
                  line: src.slice(0, mm.index).split('\n').length,
                  tbl: t ? t[1] : '(óþekkt)', bad });
  }
}
if (ofstor.length) {
  console.log('❌ audit-pagination: ' + ofstor.length +
    ' fyrirspurn(ir) biðja um FLEIRI en 1000 raðir í einum glugga — og fá 1000:\n');
  ofstor.sort((a, b) => b.bad - a.bad).forEach(h =>
    console.log('  bað um ' + String(h.bad).padStart(5) + '  ' + h.tbl.padEnd(24) +
                h.file + ':' + h.line));
  console.log('\nPostgREST sker í 1000 og segir EKKI frá. Blaðsíðuflettu í staðinn:');
  console.log('    DB.fetchAll((from, to) => <fyrirspurn>.range(from, to))');
  console.log('RED: fastur gluggi > 1000 er alltaf rangur — engin grunnlína á þessari reglu.');
  process.exit(1);
}

// Þekktar, fyrirliggjandi fyrirspurnir 2026-08-20 (skráðar í docs/ORYGGISNET.md).
// RED AÐEINS ef fjöldinn VEX — þ.e. NÝ ópöguð fyrirspurn bætist við. Lækkaðu þegar
// þær fyrirliggjandi eru fetchAll-vafðar. (2 líta út fyrir að vera raunverulegar:
// 03-vidsk-revamp fyrirtaeki-allt, 274 customer_documents eftir doc_type.)
const BASELINE = 4;
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
