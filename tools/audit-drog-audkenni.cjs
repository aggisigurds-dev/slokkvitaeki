#!/usr/bin/env node
'use strict';
/* REIKNINGSDRÖG — kennitala má aldrei standa í nafnreit, og drög mega ekki klofna.
 *
 * Af hverju þessi vörður er til (09.09.2026). Agnar var að senda út reikninga með
 * yfirmanni sínum og sagði:
 *   „Ég var þarna að setja inn verkkaupann og kennitölu. Ýtti á vista, fór útaf og
 *    aftur inn og þá hafði allt dottið út… ég gæti orðið rekinn fyrir að týna gögnum."
 *
 * Gögnin týndust ekki. Þau fóru á rangan stað, þögult:
 *
 *   netlify/functions/invoice-drafts.js:107  on_conflict=worksite_name,work_month
 *
 * Auðkenni dragsins var NAFN VERKSTAÐARINS — ritanlegur reitur (#gr-ws í hubbnum).
 * Breyttist hann um einn staf hitti PATCH-ið enga röð og féll í gegn á INSERT: nýtt
 * drag varð til og það gamla sat óbreytt eftir. Útgáfuvörnin (expected_updated_at)
 * notaði sömu síu og þagði því líka. Lagað sama dag — auðkennið er nú `id`.
 *
 * Tvennt fannst í gögnunum þann dag:
 *   drag 322  worksite_name = "Veislan - Veitingaeldhús ehf."  customer_name = "4212202040"
 *   drag  10  Vesturgata 22, customer_name = "431087-1389", status overdue, 682.367 kr
 *             — fór ÚT sem reikningur með kennitölu þar sem nafn kúnnans átti að standa.
 *
 * ENGIN GRUNNLÍNA. Kennitala í nafnreit er aldrei rétt og fer á reikning sem fer á
 * viðskiptavin. Það er ekki gömul skuld sem má frysta — það er röng útgáfa.
 * Þekktu tvö tilvikin eru NAFNGREIND hér að neðan svo listinn geti aðeins styst.
 *
 * Keyrsla:  node tools/audit-drog-audkenni.cjs
 * Read-only. Notar publishable-lykilinn úr js/config.js (RLS).
 */
const fs = require('fs');
const path = require('path');

// Þekkt og skjalfest 09.09.2026. Þau mega standa; NÝTT tilvik gerir vörðinn rauðan.
const THEKKT = [10];

const rot = path.join(__dirname, '..');
const cfg = fs.readFileSync(path.join(rot, 'js/config.js'), 'utf8');
const URL_ = (cfg.match(/SUPABASE_URL\s*=\s*["']([^"']+)/) || [])[1];
const KEY = (cfg.match(/SUPABASE_KEY\s*=\s*["']([^"']+)/) || [])[1];
const H = { apikey: KEY, Authorization: 'Bearer ' + KEY };

function fail(msg) { console.log('RED: ' + msg); process.exit(1); }

const ER_KT = v => /^\s*\d{6}-?\d{4}\s*$/.test(String(v || ''));

(async () => {
  const r = await fetch(URL_ + '/rest/v1/invoice_drafts?select=id,worksite_name,customer_name,' +
    'work_month,status,total_m_vsk,hours_dagvinna,updated_at&order=id.asc', { headers: H });
  if (!r.ok) throw new Error('invoice_drafts -> ' + r.status);
  const drog = await r.json();

  const villur = [];

  // 1. Kennitala í nafnreit — beint á leið á reikning.
  //    `void` og `merged` eru undanskilin: þau fara aldrei út, svo þau eru ekki
  //    áhætta. (Drag 322 var ógilt 09.09.2026 eftir að verkkaupinn var færður á
  //    drag 299 í rétta dálka — röðin er geymd til að hægt sé að rekja málið.)
  const lifandi = d => d.status !== 'void' && d.status !== 'merged';
  const kt = drog.filter(d =>
    lifandi(d) && !THEKKT.includes(d.id) && (ER_KT(d.worksite_name) || ER_KT(d.customer_name)));
  for (const d of kt.slice(0, 8)) {
    console.log(`   drag ${d.id}  ${d.status}  ${Math.round(d.total_m_vsk || 0)} kr` +
      `  verkstaður="${d.worksite_name}"  verkkaupi="${d.customer_name}"`);
  }
  if (kt.length) villur.push(`${kt.length} drög bera KENNITÖLU í nafnreit`);

  // 2. Klofin drög: sami mánuður, sömu tímar og sama upphæð, tvö nöfn. Það er
  //    fingrafarið af gamla nafn-auðkenninu — sama verkið á tveimur stöðum.
  const lyklar = new Map();
  for (const d of drog) {
    if (d.status === 'void' || d.status === 'merged') continue;
    const t = Number(d.total_m_vsk) || 0;
    if (!t) continue;
    const lykill = d.work_month + '|' + Math.round(t) + '|' + (Number(d.hours_dagvinna) || 0);
    if (!lyklar.has(lykill)) lyklar.set(lykill, []);
    lyklar.get(lykill).push(d);
  }
  const klofin = [...lyklar.values()].filter(hopur =>
    hopur.length > 1 && new Set(hopur.map(d => d.worksite_name)).size > 1);
  for (const hopur of klofin.slice(0, 5)) {
    console.log('   klofið: ' + hopur.map(d => `${d.id}="${d.worksite_name}"`).join('  ·  ') +
      `  (${hopur[0].work_month}, ${Math.round(hopur[0].total_m_vsk)} kr)`);
  }
  if (klofin.length) villur.push(`${klofin.length} hópar líta út eins og KLOFIN drög (sama verk, tvö nöfn)`);

  if (villur.length) {
    fail(villur.join(' · ') + '. Auðkenni dragsins er `id`, aldrei nafnið — ' +
      'sjá netlify/functions/invoice-drafts.js og haus þessa varðar.');
  }

  console.log(`✅ GRÆNT drög: ${drog.length} drög — engin kennitala í nafnreit, engin klofin drög` +
    (THEKKT.length ? ` (${THEKKT.length} þekkt undanskilið: drag ${THEKKT.join(', ')})` : ''));
})().catch(e => fail(e.message));
