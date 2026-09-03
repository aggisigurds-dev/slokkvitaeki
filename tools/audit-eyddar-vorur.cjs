#!/usr/bin/env node
/* Öryggisnet — vara sem Agnar EYDDI má ekki vera komin aftur í `vorur`.
 *
 * 03.09.2026: Agnar eyddi vörum yfir daginn og þær voru allar komnar aftur um
 * kvöldið. Rótin: sáningarpatcharnir tveir (66-pricelist-seed, 80-aux-products)
 * lásu „hverju var eytt" úr AppSettings.path('sala.deleted_product_names'), en
 * AppSettings hleðst ASYNKRÓNT úr app_settings og path() skilar innbyggða
 * sjálfgefna gildinu ([]) þangað til. Hvorugur beið eftir henni, svo lenti
 * sáning á undan hleðslunni var legsteinalistinn tómur og allt fór inn aftur.
 * Mælt: 24.08 ein röð, 02.09 ein, 03.09 kl. 17:11:39 ELLEFU raðir í einni lotu.
 *
 * Lagfæringin les legsteinana beint úr app_settings og sleppir sáningu ef sá
 * lestur bregst. Þessi audit sannar að hún haldi: engin röð í `vorur` má bera
 * nafn sem er á lista yfir eyddar vörur.
 *
 * BASELINE = 0. Falli hann er annaðhvort sáningin farin að hunsa legsteinana
 * aftur, eða einhver bjó vöruna til handvirkt undir sama nafni — í seinna
 * tilvikinu á að taka nafnið AF legsteinalistanum, ekki hækka baseline.
 */
const SUPA = 'https://osfdzskyvisifcwyjkuk.supabase.co';
const KEY  = 'sb_publishable_YVpznM5EK01qOdevQwOcIg_rMjTkT7f';

async function get(pathAndQuery) {
  const r = await fetch(`${SUPA}/rest/v1/${pathAndQuery}`, {
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}` }
  });
  return r.json();
}
const norm = s => String(s == null ? '' : s).trim().toLowerCase();

(async () => {
  const cfg = await get('app_settings?id=eq.1&select=settings');
  const sala = (cfg && cfg[0] && cfg[0].settings && cfg[0].settings.sala) || {};
  const dead = Array.isArray(sala.deleted_product_names) ? sala.deleted_product_names : [];
  if (!dead.length) {
    // Tómur listi er ekki grænt ljós — hann er nákvæmlega ástandið sem olli
    // vandanum. Segjum frá og föllum, svo enginn lesi þögn sem „allt í lagi".
    console.log('❌ RAUTT  sala.deleted_product_names er TÓMUR — legsteinarnir eru horfnir; sáningin myndi setja allt inn aftur.');
    process.exit(1);
  }
  const deadSet = new Set(dead.map(norm));
  const vorur = await get('vorur?select=id,nafn,created_at&order=id.asc');
  const back = (Array.isArray(vorur) ? vorur : []).filter(v => deadSet.has(norm(v.nafn)));

  if (!back.length) {
    console.log(`✅ OK — ${dead.length} eydd vöruheiti, ekkert þeirra er í \`vorur\`. Sáningin virðir legsteinana.`);
    return;
  }
  console.log(`❌ RAUTT  ${back.length} eydd vara/vörur eru komnar aftur í \`vorur\` (baseline 0):`);
  for (const v of back) {
    console.log(`     id ${v.id}  ${v.nafn}  (búin til ${String(v.created_at || '').slice(0, 16).replace('T', ' ')})`);
  }
  console.log('   → Athugaðu hvort sáningarpatchi hafi hlaupið á undan app_settings-lestrinum (66-pricelist-seed / 80-aux-products).');
  process.exit(1);
})();
