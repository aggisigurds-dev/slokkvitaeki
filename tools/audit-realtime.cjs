#!/usr/bin/env node
/* VÖRÐUR — tafla í RT_TABLES sem er EKKI í supabase_realtime-útgáfunni.
 *
 * VILLAN, fundin 01.09.2026: nýjar töflur lenda ekki sjálfkrafa í
 * `supabase_realtime`. Áskrift á töflu sem er utan útgáfunnar sendir ALDREI
 * neitt — og gefur engin villuboð. Hún lítur út eins og hún virki.
 *
 * Það kom í ljós við að prófa nýtt spjall, og afhjúpaði tvennt í viðbót:
 *   • `thjonustubeidni` var bætt í RT_TABLES sama dag til að laga
 *     „Þjónustuborðið syncast ekki milli tölva". Sú lagfæring hefði EKKI
 *     virkað — hún hefði verið ýtt út, litið rétt út og gert ekkert.
 *   • `vidskiptavinir` hafði verið í RT_TABLES en aldrei í útgáfunni, svo
 *     `Vidskiptavinir.load()` var aldrei kallað af breytingu. Þögul dauð
 *     áskrift, líklega mánuðum saman.
 *
 * Þessi vörður ber RT_TABLES í js/db.js saman við útgáfuna sjálfa og fellur
 * rautt ef tafla er í öðru en ekki hinu. Hann þarf `sql_rt_tofluskra`-view því
 * anon-lykillinn kemst ekki í pg_publication_tables; sé viewið ekki til segir
 * hann það hreint út í stað þess að þykjast hafa athugað.
 *
 * Lagfæring þegar hann fellur:
 *     alter publication supabase_realtime add table <tafla>;
 */
const fs = require('fs');
const path = require('path');

const rot = path.join(__dirname, '..');
const cfg = fs.readFileSync(path.join(rot, 'js/config.js'), 'utf8');
const URL_ = (cfg.match(/SUPABASE_URL\s*=\s*["']([^"']+)/) || [])[1];
const KEY = (cfg.match(/SUPABASE_KEY\s*=\s*["']([^"']+)/) || [])[1];
const H = { apikey: KEY, Authorization: 'Bearer ' + KEY };

// RT_TABLES lesið úr kóðanum sjálfum — ekki afritað hingað, svo listarnir
// geti ekki rekið í sundur.
function rtTables() {
  const db = fs.readFileSync(path.join(rot, 'js/db.js'), 'utf8');
  const m = db.match(/RT_TABLES\s*=\s*\[([^\]]+)\]/);
  if (!m) return null;
  return m[1].split(',').map(s => s.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean);
}

(async () => {
  const rt = rtTables();
  if (!rt) {
    console.log('❌ Fann ekki RT_TABLES í js/db.js — vörðurinn getur ekki borið saman.');
    process.exitCode = 1; return;
  }

  const r = await fetch(`${URL_}/rest/v1/sql_rt_tofluskra?select=tablename`, { headers: H });
  if (!r.ok) {
    // Óathugað á að segjast óathugað. Ekki grænt.
    console.log('⚠ Kemst ekki í útgáfuskrána (' + r.status + ').');
    console.log('   Viewið `sql_rt_tofluskra` vantar. Búðu það til:');
    console.log("     create view sql_rt_tofluskra as");
    console.log("       select tablename from pg_publication_tables where pubname='supabase_realtime';");
    console.log("     grant select on sql_rt_tofluskra to anon;");
    console.log('   RT_TABLES í kóða: ' + rt.join(', '));
    console.log('   Þangað til er ÓSANNREYNT hvort áskriftirnar séu lifandi.');
    process.exitCode = 1; return;
  }

  const iUtgafu = new Set((await r.json()).map(x => x.tablename));
  const vantar = rt.filter(t => !iUtgafu.has(t));

  if (vantar.length) {
    console.log(`❌ ${vantar.length} tafla(r) í RT_TABLES eru EKKI í supabase_realtime\n`);
    vantar.forEach(t => console.log('   • ' + t + '  — áskriftin sendir aldrei neitt'));
    console.log('\n   Lagfæring:');
    vantar.forEach(t => console.log('     alter publication supabase_realtime add table ' + t + ';'));
    process.exitCode = 1; return;
  }

  console.log(`✅ Realtime heldur — allar ${rt.length} töflur í RT_TABLES eru í útgáfunni.`);
})().catch(e => { console.log('❌ Vörðurinn keyrði ekki: ' + e.message); process.exitCode = 1; });
