#!/usr/bin/env node
/* VÖRÐUR — nýtt stöðugildi á tæki dettur þegjandi út úr síum.
 *
 * VILLAN, mæld 01.09.2026: `uttaeki.status` ber FJÖGUR gildi —
 *     active 4891 · urelt 482 · „Í lagi" 154 · ok 74
 * en sjö kóðastaðir sía á `.eq('status','active')`. Þau 228 tæki sem bera
 * „Í lagi" eða „ok" eru því ÓSÝNILEG þar, og FJÓRTÁN fyrirtæki eiga ekkert
 * `active` — þau litu út fyrir að vera alveg tóm. Bríetartún (48 tæki),
 * Dalbrekka (48) og bílskúrinn (16) eru þar á meðal.
 *
 * Patch 129 ber athugasemd um nákvæmlega þetta: „server-side
 * .eq('status','active'), which silently dropped any unit" — einhver hitti á
 * það og lagaði á EINUM stað. Hinir sex standa.
 *
 * Rótin er ekki sían heldur það að stöðugildi bætist við án þess að nokkur
 * viti. Þessi vörður fellur rautt þegar það gerist, svo næsta gildi hverfi
 * ekki þegjandi eins og þessi tvö gerðu.
 *
 * Hann er EKKI mælikvarði á hvort síurnar séu réttar — hann segir aðeins að
 * gildin séu þau sömu og þegar þær voru skrifaðar. Það er það sem hægt er að
 * vaka yfir vélrænt.
 */
const fs = require('fs');
const path = require('path');

const rot = path.join(__dirname, '..');
const cfg = fs.readFileSync(path.join(rot, 'js/config.js'), 'utf8');
const URL_ = (cfg.match(/SUPABASE_URL\s*=\s*["']([^"']+)/) || [])[1];
const KEY = (cfg.match(/SUPABASE_KEY\s*=\s*["']([^"']+)/) || [])[1];
const H = { apikey: KEY, Authorization: 'Bearer ' + KEY };

// Mælt 01.09.2026. Bætist gildi við á að SKOÐA hvort síurnar sjö eigi að
// hleypa því í gegn — og bæta því hér fyrst þá.
const THEKKT = new Set(['active', 'urelt', 'Í lagi', 'ok']);
// Gildi sem þýða „úr notkun". Allt annað telst í notkun.
const UR_NOTKUN = new Set(['urelt']);

(async () => {
  let rows = [], from = 0;
  for (;;) {
    const r = await fetch(`${URL_}/rest/v1/uttaeki?select=fyrirtaeki_id,status&order=id&offset=${from}&limit=1000`, { headers: H });
    if (!r.ok) throw new Error(`${r.status} ${(await r.text()).slice(0, 160)}`);
    const d = await r.json();
    if (!d.length) break;
    rows = rows.concat(d);
    if (d.length < 1000) break;
    from += 1000;
  }

  const talning = new Map();
  rows.forEach(u => { const s = u.status == null ? '(null)' : u.status; talning.set(s, (talning.get(s) || 0) + 1); });
  const nyGildi = [...talning.keys()].filter(s => !THEKKT.has(s));

  // Fyrirtæki sem eiga tæki í notkun EN ekkert 'active' — ósýnileg þeim
  // kóðastöðum sem sía á 'active'.
  const iNotkun = new Set(), medActive = new Set();
  rows.forEach(u => {
    if (u.fyrirtaeki_id == null) return;
    const k = String(u.fyrirtaeki_id);
    if (!UR_NOTKUN.has(u.status)) iNotkun.add(k);
    if (u.status === 'active') medActive.add(k);
  });
  const osynileg = [...iNotkun].filter(k => !medActive.has(k));

  if (nyGildi.length) {
    console.log('❌ NÝTT stöðugildi á uttaeki.status\n');
    nyGildi.forEach(s => console.log(`   • "${s}"  ${talning.get(s)} tæki  — engin sía veit af því`));
    console.log('\n   Sjö kóðastaðir sía á .eq(status,\'active\'). Nýtt gildi sem er');
    console.log('   í notkun hverfur þar þegjandi. Ákveddu hvort það eigi að teljast');
    console.log('   í notkun og bættu því þá í THEKKT hér og í síurnar.');
    process.exitCode = 1;
    return;
  }

  console.log(`✅ Stöðugildi óbreytt — ${[...talning.entries()].map(([s, n]) => s + ' ' + n).join(' · ')}`);
  console.log(`   ${osynileg.length} fyrirtæki eiga tæki í notkun en ekkert "active"`);
  console.log('   (ósýnileg þeim kóða sem síar á active — þekkt, ekki nýtt).');
})().catch(e => { console.log('❌ Vörðurinn keyrði ekki: ' + e.message); process.exitCode = 1; });
