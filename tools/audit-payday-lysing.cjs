#!/usr/bin/env node
'use strict';
/* PAYDAY-LÝSINGIN BER EKKI INNRI BÓKHALDSMERKI.
 *
 * Af hverju (12.09.2026, Verkefnalisti c091f2ff): payday-push.js setti sölunótuna (solur.athugasemdir)
 * óhreinsaða í description kröfunnar. Sótt-slóðin (121) skrifar innri merki aftast í nótuna —
 * „Kt: 570585-0379 [Sótt 2026-08-24] Afsláttur úr sölu: −8091 kr Greiðsla: reikningur" — og þau
 * prentuðust á Payday-reikning kúnnans (Payday #249, Colas 04.09.). Mælt 12.09.: 42 reikningar frá
 * 01.06. báru merkin, 3 ósendir. PDF-reikningurinn (10) og Sótt-glugginn (121) klipptu þau þegar.
 *
 * Mælir (án nets): hreinsaNotu() í payday-push.js — tekin beint úr skránni milli merkjanna
 * hreinsaNotu:byrjun/endir — á raundæmum. Og að description sé byggð úr hreinsuðu nótunni.
 * Með --gogn: keyrir líka á allar sölunótur frá 01.06. og telur hvort merki standi eftir.
 * GRUNNLINA 0. Hækkaðu hana aldrei til að fá grænt.
 *
 * Keyrsla:  node tools/audit-payday-lysing.cjs          (--gogn = raungögn úr Supabase)
 */
const fs = require('fs');
const path = require('path');

const GRUNNLINA = 0;
const rot = path.join(__dirname, '..');
const skra = fs.readFileSync(path.join(rot, 'netlify/functions/payday-push.js'), 'utf8');
const brot = [];

// 1) description byggð úr hreinsuðu nótunni
if (!/const\s+_notes\s*=\s*hreinsaNotu\(\s*sale\.athugasemdir\s*\)/.test(skra)) brot.push('_notes er ekki hreinsaNotu(sale.athugasemdir)');
if (!/description:\s*\[_vegna,\s*_notes\]/.test(skra)) brot.push('description er ekki lengur [_vegna, _notes] — athugaðu hvaðan nótan kemur');

// 2) fallið sjálft, tekið úr skránni
const m = skra.match(/\/\*\s*hreinsaNotu:byrjun\s*\*\/([\s\S]*?)\/\*\s*hreinsaNotu:endir\s*\*\//);
let hreinsaNotu = null;
if (!m) brot.push('merkin hreinsaNotu:byrjun/endir fundust ekki í payday-push.js');
else {
  try { hreinsaNotu = new Function(m[1] + '\nreturn hreinsaNotu;')(); }
  catch (e) { brot.push('hreinsaNotu þýðist ekki: ' + e.message); }
}

// Merki sem mega aldrei standa í lýsingu kröfu
const MERKI = /\bKt:\s*\d{6}-?\d{4}|\[Sótt|\bGreiðsla:\s*\w|\bPayday\s*#\s*\d+\s*(?:PAID|SENT|CREDIT|CANCELL?ED|DRAFT)|\bSótt\s*✓|\((?:leiðrétt|leidrett)/i;

// Raundæmi (athugasemdir úr solur, 12.09.2026) → það sem á að standa eftir
const DAEMI = [
  ['Spori sprengja\nKt: 410200-3170\n\n[Sótt 2026-09-10]\nGreiðsla: reikningur', 'Spori sprengja'],
  ['deild5 · Beiðni nr: deild5\nKt: 420187-1499\n\n[Sótt 2026-09-04]\nGreiðsla: reikningur', 'deild5 · Beiðni nr: deild5'],
  ['\nKt: 540108-1290\n\n[Sótt 2026-09-10]\nGreiðsla: reikningur', ''],
  ['\nKt: 570585-0379\n\n[Sótt 2026-08-24]\nAfsláttur úr sölu: −8091 kr\nGreiðsla: reikningur', ''],
  ['Sótt ✓ (leiðrétt 31.07 — var ranglega merkt „Drög — bíður"). Payday #6 PAID.', ''],
  ['Beiðni nr: 9847265', 'Beiðni nr: 9847265'],
  // Netvörður 12.09.: án þessara tveggja hélst vörðurinn grænn þótt [Sótt]- eða dags-klippingin væri tekin út.
  ['\n\n[Sótt 2026-05-29]\nAthugasemd: greitt við komu\nGreiðsla: kort', ''],
  ['[2026-06-24 10:13] greitt með peningi', ''],
  ['Verk: skipt um slöngu\nAfhent á staðnum', 'Verk: skipt um slöngu\nAfhent á staðnum'],
  [null, ''],
];
if (hreinsaNotu) {
  for (const [inn, vaent] of DAEMI) {
    const ut = hreinsaNotu(inn);
    if (ut !== vaent) brot.push('hreinsaNotu(' + JSON.stringify(inn) + ') = ' + JSON.stringify(ut) + ', átti að vera ' + JSON.stringify(vaent));
  }
}

async function gogn() {
  const cfg = fs.readFileSync(path.join(rot, 'js/config.js'), 'utf8');
  const URL_ = (cfg.match(/SUPABASE_URL\s*=\s*["']([^"']+)/) || [])[1];
  const KEY = (cfg.match(/SUPABASE_KEY\s*=\s*["']([^"']+)/) || [])[1];
  const H = { apikey: KEY, Authorization: 'Bearer ' + KEY };
  let rows = [], from = 0;
  for (;;) {
    const r = await fetch(`${URL_}/rest/v1/solur?select=id,num,athugasemdir&athugasemdir=not.is.null&created_at=gte.2026-06-01&order=id&offset=${from}&limit=1000`, { headers: H });
    if (!r.ok) throw new Error(r.status + ' ' + (await r.text()).slice(0, 160));
    const d = await r.json();
    rows = rows.concat(d);
    if (d.length < 1000) break;
    from += 1000;
  }
  let medMerkjum = 0, eftir = 0, breytt = 0;
  const synishorn = [];
  for (const row of rows) {
    const inn = row.athugasemdir || '';
    const ut = hreinsaNotu(inn);
    if (MERKI.test(inn)) medMerkjum++;
    if (ut !== inn.trim()) breytt++;
    if (MERKI.test(ut)) { eftir++; if (synishorn.length < 5) synishorn.push(row.num + ': ' + JSON.stringify(ut).slice(0, 120)); }
  }
  console.log('  raungögn: ' + rows.length + ' sölunótur frá 01.06. · ' + medMerkjum + ' með merkjum · ' + breytt + ' breytast · ' + eftir + ' með merki eftir hreinsun');
  synishorn.forEach(s => console.log('    ' + s));
  return eftir;
}

(async () => {
  let fjoldi = brot.length;
  if (hreinsaNotu && process.argv.includes('--gogn')) fjoldi += await gogn();
  if (fjoldi > GRUNNLINA) {
    console.log('❌ RAUTT payday-lýsing: ' + fjoldi + ' brot (grunnlína ' + GRUNNLINA + ')');
    brot.forEach(b => console.log('  - ' + b));
    process.exit(1);
  }
  console.log('✅ GRÆNT payday-lýsing: sölunótan fer hreinsuð á Payday-kröfuna (' + DAEMI.length + ' raundæmi)');
})().catch(e => { console.log('❌ RAUTT payday-lýsing: ' + e.message); process.exit(1); });
