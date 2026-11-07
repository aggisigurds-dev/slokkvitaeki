#!/usr/bin/env node
'use strict';
/* Öryggisnet — TENGINGAR MEGA EKKI SLITNA (07.11.2026).
 *
 * Ótengd röð er ósýnileg röð. Tæki án viðskiptamanns mælist ekki í tekjuspá, sala án hans
 * ratar ekki á kúnnaspjaldið, og erindi án fyrirtækis á sér engan eiganda og enga mælingu.
 * Ekkert af þessu gefur villu — það hverfur bara hljóðlega úr öllum tölum.
 *
 * MÆLT 07.11.2026, áður en lagfært var:
 *     287 lifandi tæki án customer_base_id   → öll tengd (erfðu frá eigin fyrirtæki)
 *      85 sölur án customer_base_id          → 79 tengdar á ótvíræðri kennitölu, 6 eftir
 *     236 opin erindi án fyrirtækis          → rannsökuð sérstaklega
 *      33 fyrirtæki án customer_base_id      → engin passaði á kennitölu, bíða Agnars
 *       5 sölur á kennitölu sem finnst hvergi í fyrirtaeki
 * Afrit af því sem var lagfært: tafla `backup_20261107_tengingar`.
 *
 * Vörðurinn ver ÁFRAMHALDIÐ: hér eftir á ekkert NÝTT að slitna. Grunnlínan er staðan eftir
 * lagfæringu, og vörðurinn fer rauður þegar talan HÆKKAR — ekki þegar gamla skuldin stendur.
 * Read-only; skrifar aldrei í gögn.
 */
const fs = require('fs');
const path = require('path');

// ── GRUNNLÍNA (mæld 07.11.2026 EFTIR lagfæringu) ──────────────────────────────
const BASELINE_DAGS = '07.11.2026';
const MORK = [
  { heiti: 'lifandi tæki án viðskiptamanns', tafla: 'uttaeki',
    sia: 'customer_base_id=is.null&status=neq.urelt', thak: 0,
    gera: 'Tengdu við customer_base_id fyrirtækisins sem tækið stendur á (uttaeki.fyrirtaeki_id → fyrirtaeki.customer_base_id).' },
  { heiti: 'sölur án viðskiptamanns', tafla: 'solur',
    sia: 'customer_base_id=is.null&status=neq.void', thak: 6,
    gera: 'Tengdu á ÓTVÍRÆÐRI kennitölu (ein base per kt). Sé kt á fleiri en einni base — rekstrarfélag — þarf Agnar að velja staðinn.' },
  // 29 tengd 07.11.2026 (póstur 3 · kennitala 8 · ótvírætt nafn 18). Af þeim 207 sem eftir standa
  // eiga ~93 engan kúnna (kerfis- og fjármálamál) og ~52 eru birgjar eða fjöldapóstur.
  { heiti: 'opin erindi án fyrirtækis', tafla: 'thjonustubeidni',
    sia: 'deleted_at=is.null&status=neq.lokad&fyrirtaeki_id=is.null&customer_base_id=is.null', thak: 207,
    gera: 'Tengdu um póstinn í channel_ref, kennitölu í texta, eða ótvírætt nafn. Almennt lén (gmail, simnet) sannar ekkert, og netfang sem er á mörgum stöðum (dimka@heimaleiga.is er á 15) sannar ekkert heldur.' },
  // EYDDAR RAÐIR TELJAST EKKI. Af 33 voru 15 með deleted_at og lifandi röð á sömu base — dauð röð
  // er ekki slitin tenging. Eftir standa 18 lifandi, öll með TÓMA kennitölu, svo engin þeirra var
  // tengjanleg á kt (mælt 07.11.2026).
  { heiti: 'lifandi fyrirtæki án viðskiptamanns', tafla: 'fyrirtaeki',
    sia: 'customer_base_id=is.null&deleted_at=is.null', thak: 18,
    gera: 'Öll 18 hafa TÓMA kennitölu — þau verða ekki tengd fyrr en hún fæst. Þarf ákvörðun Agnars: stofna base, tengja handvirkt, eða merkja dauða röð.' },
];

const CFG = fs.readFileSync(path.join(__dirname, '..', 'js', 'config.js'), 'utf8');
const nad = (re) => { const m = re.exec(CFG); return m ? m[1] : null; };
const URL_ = nad(/SUPABASE_URL\s*=\s*['"]([^'"]+)/);
const KEY = nad(/SUPABASE_KEY\s*=\s*['"]([^'"]+)/);
if (!URL_ || !KEY) { console.log('RED: fann ekki SUPABASE_URL/KEY í js/config.js'); process.exit(1); }

async function telja(tafla, sia) {
  const r = await fetch(URL_ + '/rest/v1/' + tafla + '?select=id&' + sia + '&limit=1',
    { method: 'HEAD', headers: { apikey: KEY, Authorization: 'Bearer ' + KEY, Prefer: 'count=exact' } });
  if (!r.ok) throw new Error(tafla + ' -> ' + r.status);
  const n = parseInt(String(r.headers.get('content-range') || '').split('/')[1], 10);
  if (!Number.isFinite(n)) throw new Error(tafla + ': content-range vantar');
  return n;
}

(async () => {
  const raud = [];
  const linur = [];
  for (const m of MORK) {
    const n = await telja(m.tafla, m.sia);
    linur.push('   ' + (n > m.thak ? '✗' : '✓') + ' ' + m.heiti + ': ' + n + ' (þak ' + m.thak + ')');
    if (n > m.thak) raud.push({ m, n });
  }
  if (raud.length) {
    console.log('RED: ' + raud.length + ' tengingaflokkur/-ar hafa SLITNAÐ frá ' + BASELINE_DAGS);
    linur.forEach((l) => console.log(l));
    raud.forEach(({ m, n }) => console.log('HVAÐ Á AÐ GERA (' + m.heiti + ', ' + (n - m.thak) + ' ný): ' + m.gera));
    console.log('Afrit af lagfæringu dagsins: backup_20261107_tengingar. Ekki hækka þakið til að þagga niður í verðinum.');
    process.exitCode = 1;
  } else {
    console.log('OK — engar nýjar slitnar tengingar frá ' + BASELINE_DAGS + '.');
    linur.forEach((l) => console.log(l));
  }
})().catch((e) => { console.log('RED: audit-tengingar sprakk: ' + e.message); process.exitCode = 1; });
