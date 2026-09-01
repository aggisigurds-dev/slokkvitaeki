#!/usr/bin/env node
/* VÖRÐUR — stöðusían á tækjum. Tvennt vaktað, af tveimur ólíkum ástæðum.
 *
 * VILLAN, mæld og lagfærð 01.09.2026: `uttaeki.status` ber FJÖGUR gildi —
 *     active 4891 · urelt 482 · „Í lagi" 154 · ok 74
 * en TUTTUGU OG TVEIR kóðastaðir síuðu á `active` einu (sex fyrirspurnir
 * server-megin, sextán samanburðir JS-megin á `DB.cache.units`). Þau 228 tæki
 * sem bera „Í lagi" eða „ok" voru því ósýnileg þar, og SJÖTJÁN fyrirtæki áttu
 * tæki sem hurfu — fjórtán þeirra áttu ekkert `active` og litu út fyrir að
 * vera ALVEG TÓM: Bríetartún (48 tæki), Dalbrekka (48), bílskúrinn (16),
 * Dra ehf (37), Iceland Comfort (15).
 *
 * Patch 129 bar athugasemd um nákvæmlega þetta: „server-side
 * .eq('status','active'), which silently dropped any unit" — einhver hitti á
 * það og lagaði á EINUM stað. Hinir tuttugu og einn stóðu í meira en ár.
 *
 * Röksemdin fyrir lagfæringunni var mæld, ekki ályktuð: hjá SEX af fyrirtækjunum
 * sautján fór afleidda tækjatalan að stemma við arsskodun-blobbinn sem þegar
 * var réttur. Sían var villan, ekki gögnin. `153` bar meira að segja
 * lagfæringuna hálfa síðan 2026-08-10 — `loadNextInspByFid` notaði
 * `status != 'urelt'` með rökstuðningi í athugasemd, en systurfallið
 * `loadActiveUnitsByFid` við hliðina á því síaði enn á `active`.
 *
 * ── HVAÐ ER VAKTAÐ ────────────────────────────────────────────────────────
 *
 * 1. GÖGNIN: bætist FIMMTA stöðugildið við fellur vörðurinn. Rótin er ekki
 *    sían heldur það að gildi bætist við án þess að nokkur viti — næsta gildi
 *    má ekki hverfa þegjandi eins og þessi tvö gerðu.
 *
 * 2. KÓÐINN: afturför. Þetta er ekki fræðilegur ótti — villan var lagfærð á
 *    einum stað 2024 og skreið samt aftur inn á tuttugu og einn. Vörðurinn
 *    skannar upprunann og fellur ef NÝ sía á 'active' birtist. Það sem MÁ
 *    standa er talið upp í LEYFT hér að neðan, hvert með ástæðu.
 *
 * Vörðurinn er EKKI mælikvarði á hvort hver sía sé rétt — hann segir að
 * gildin séu óbreytt og að engin ný sía hafi laumast inn. Það er það sem
 * hægt er að vaka yfir vélrænt.
 */
const fs = require('fs');
const path = require('path');

const rot = path.join(__dirname, '..');
const cfg = fs.readFileSync(path.join(rot, 'js/config.js'), 'utf8');
const URL_ = (cfg.match(/SUPABASE_URL\s*=\s*["']([^"']+)/) || [])[1];
const KEY = (cfg.match(/SUPABASE_KEY\s*=\s*["']([^"']+)/) || [])[1];
const H = { apikey: KEY, Authorization: 'Bearer ' + KEY };

// Mælt 01.09.2026. Bætist gildi við á að SKOÐA hvort síurnar eigi að hleypa
// því í gegn — og bæta því hér fyrst þá.
const THEKKT = new Set(['active', 'urelt', 'Í lagi', 'ok']);
// Gildi sem þýða „úr notkun". Allt annað telst í notkun.
const UR_NOTKUN = new Set(['urelt']);

// ── Kóðaskönnun ────────────────────────────────────────────────────────────
// Síur á 'active': PostgREST (`status=eq.active`), supabase-js (`.eq('status',
// 'active')`) og JS-megin samanburður (`u.status === 'active'`).
const SIA_MYNSTUR = [
  /status\s*=\s*eq\.active/g,
  /\.eq\(\s*['"]status['"]\s*,\s*['"]active['"]\s*\)/g,
  /\.status\s*===?\s*['"]active['"]/g,
  /['"]active['"]\s*===?\s*\w+\.status/g,
];

// Það sem MÁ standa — hvert með ástæðu. Lykill: skrá + textabrot.
const LEYFT = [
  {
    skra: 'js/patches/00-legacy.js',
    inniheldur: '<select id="_dv_status">',
    hversvegna: 'teiknar stöðu-fellilista tækis (selected-merking), ekki sía',
  },
  {
    skra: 'tools/audit-status-gildi.cjs',
    inniheldur: 'medActive.add(k)',
    hversvegna: 'vörðurinn sjálfur telur active viljandi til að finna fyrirtækin sem eiga ekkert',
  },
];

const SKANNA = ['js', 'tools', 'netlify/functions'];
const SLEPPA = new Set(['dist', 'node_modules', '.git', 'graphify-out']);

function skrarnar(dir, ut) {
  let e;
  try { e = fs.readdirSync(dir, { withFileTypes: true }); } catch (_) { return ut; }
  for (const f of e) {
    if (SLEPPA.has(f.name)) continue;
    const p = path.join(dir, f.name);
    if (f.isDirectory()) skrarnar(p, ut);
    else if (/\.(js|cjs|mjs)$/.test(f.name)) ut.push(p);
  }
  return ut;
}

// Athugasemdir LÝSA villunni — bæði þessi vörður og trio-mælirinn vitna
// orðrétt í `.eq('status','active')` í hausnum sínum. Blokk-athugasemd verður
// að hverfa í heild, ekki bara fyrsta línan: annars féll vörðurinn á sjálfum
// sér og á tveimur skjölum sem gerðu ekkert rangt. Línuskil eru varðveitt svo
// línunúmerin haldist rétt.
function anAthugasemda(s) {
  return s.replace(/\/\*[\s\S]*?\*\//g, m => m.replace(/[^\n]/g, ' '));
}

function leitaISkra(p) {
  const rel = path.relative(rot, p).replace(/\\/g, '/');
  const linur = anAthugasemda(fs.readFileSync(p, 'utf8')).split('\n');
  const fundid = [];
  linur.forEach((lina, i) => {
    if (/^\s*\/\//.test(lina)) return;   // heil lína sem er athugasemd
    for (const m of SIA_MYNSTUR) {
      m.lastIndex = 0;
      if (!m.test(lina)) continue;
      const undanthegid = LEYFT.some(l => l.skra === rel && lina.includes(l.inniheldur));
      if (undanthegid) return;
      fundid.push({ skra: rel, lina: i + 1, texti: lina.trim().slice(0, 110) });
      return;
    }
  });
  return fundid;
}

(async () => {
  // ── 1) Gögnin ────────────────────────────────────────────────────────────
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

  // Fyrirtæki sem eiga tæki í notkun EN ekkert 'active'. Þessi tala er ekki
  // villa lengur — hún er ástæðan til að engin sía megi þrengjast aftur.
  const iNotkun = new Set(), medActive = new Set();
  rows.forEach(u => {
    if (u.fyrirtaeki_id == null) return;
    const k = String(u.fyrirtaeki_id);
    if (!UR_NOTKUN.has(u.status)) iNotkun.add(k);
    if (u.status === 'active') medActive.add(k);
  });
  const anActive = [...iNotkun].filter(k => !medActive.has(k));

  // ── 2) Kóðinn ────────────────────────────────────────────────────────────
  const siur = [];
  SKANNA.forEach(d => skrarnar(path.join(rot, d), []).forEach(p => siur.push(...leitaISkra(p))));

  // ── Niðurstaða ───────────────────────────────────────────────────────────
  if (nyGildi.length) {
    console.log('❌ NÝTT stöðugildi á uttaeki.status\n');
    nyGildi.forEach(s => console.log(`   • "${s}"  ${talning.get(s)} tæki  — engin sía veit af því`));
    console.log('\n   Ákveddu hvort það eigi að teljast í notkun. Sé svarið já, bættu því');
    console.log('   í THEKKT hér — og gættu að því að engin sía útiloki það.');
    process.exitCode = 1;
    return;
  }

  if (siur.length) {
    console.log(`❌ AFTURFÖR — ${siur.length} ${siur.length === 1 ? 'sía síar' : 'síur sía'} aftur á status='active'\n`);
    siur.forEach(f => console.log(`   ${f.skra}:${f.lina}\n     ${f.texti}`));
    console.log(`\n   ${anActive.length} fyrirtæki eiga tæki í notkun en EKKERT 'active' — sía á`);
    console.log(`   'active' lætur þau líta út fyrir að vera tóm. Notaðu status != 'urelt'.`);
    console.log(`   Sé sían rétt (t.d. teiknar stöðu frekar en að sía), skráðu hana í LEYFT.`);
    process.exitCode = 1;
    return;
  }

  console.log(`✅ Stöðugildi óbreytt — ${[...talning.entries()].map(([s, n]) => s + ' ' + n).join(' · ')}`);
  console.log(`   Engin sía á 'active' í kóða (22 lagaðar 01.09.2026, 1 leyfð: stöðu-fellilisti).`);
  console.log(`   ${anActive.length} fyrirtæki eiga tæki í notkun en ekkert "active" — þau sjást nú.`);
})().catch(e => { console.log('❌ Vörðurinn keyrði ekki: ' + e.message); process.exitCode = 1; });
