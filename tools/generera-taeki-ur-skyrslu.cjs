#!/usr/bin/env node
/* GENERERA TÆKI ÚR SKÝRSLU — fyrir félög sem sýna NÚLL en eiga skýrslu.
 *
 * Agnar 02.09.2026: „þá þarf bara að generate tæki sem passa við report eða
 * invoice" — og fyrr: „full af virkum fyrirtækjum sem sýna 0 en ættu auðvitað
 * að synca við seinasta invoice/report magntölur, með bara nýjum auto
 * generation tækjum."
 *
 * ÞETTA ER ÓHÆTT VEGNA ÞESS AÐ `uttaeki` ER TELJARI, EKKI SKRÁ. Raðnúmer eru
 * sjálfgenerað (TMP-NNNN) og bera enga sögu; talan per fyrirtæki er það eina
 * sem skiptir máli, og hún á að stemma við nýjustu úttektarskýrslu.
 * `arsskodun_report_facts` er ein röð per stað — nýjasta skýrslan — og
 * `equipment` þar er sundurliðunin sem tæknimaðurinn taldi upp.
 *
 * HVAÐ ÞAÐ SNERTIR EKKI
 *   · Félög sem eiga ÞEGAR tæki. Þau eru aldrei snert, hvorki til að bæta við
 *     né fjarlægja. Rangar tölur á félagi sem á tæki eru sérstakt mál og krefjast
 *     dóms um hvort skýrslan eða prófíllinn sé nýrri.
 *   · Félög sem eru EKKI í þjónustu. Að búa til tæki á sofandi skráningu býr til
 *     tölu sem enginn viðheldur.
 *
 * DAGSETNINGAR eru leiddar af skýrslunni sjálfri: `last_insp` = report_year +
 * inspect_month, `next_insp` = ári síðar (árleg yfirferð, byggingarreglugerð).
 * Sé skýrslan gömul verða tækin STRAX útrunnin — það er RÉTT og það er
 * upplýsingin: félagið er á eftir. Tólið prentar þau áhrif á útrunna-teljarann
 * áður en nokkuð er skrifað svo talan komi ekki á óvart.
 *
 * Keyrsla:
 *   node tools/generera-taeki-ur-skyrslu.cjs           (þurrkeyrsla)
 *   node tools/generera-taeki-ur-skyrslu.cjs --keyra   (skrifar)
 *   node tools/generera-taeki-ur-skyrslu.cjs --fid 626 (eitt félag)
 */
const fs = require('fs');
const path = require('path');

const rot = path.join(__dirname, '..');
const cfg = fs.readFileSync(path.join(rot, 'js/config.js'), 'utf8');
const URL_ = (cfg.match(/SUPABASE_URL\s*=\s*["']([^"']+)/) || [])[1];
const KEY = (cfg.match(/SUPABASE_KEY\s*=\s*["']([^"']+)/) || [])[1];
const H = { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json' };

const KEYRA = process.argv.includes('--keyra');
const EITT = (process.argv.indexOf('--fid') >= 0) ? parseInt(process.argv[process.argv.indexOf('--fid') + 1], 10) : null;

// Orðaforðinn eins og hann ER í gögnunum (mælt 02.09.2026, 5.101 tæki í notkun).
// Aldrei búa til ný afbrigði — „CO₂" með undirskrifuðu tvíu er til í 5 röðum og
// er villa sem á ekki að fjölga.
const KORT = {
  lettvatn:       { type: 'Léttvatn',       size: '6 L'  },   // 2861 raðir
  brunaslongur:   { type: 'Brunaslanga',    size: null   },   //  617
  reykskynjarar:  { type: 'Reykskynjari',   size: null   },   //  570
  duft6_12:       { type: 'ABC Duft',       size: '6 kg' },   //  384
  co2_5:          { type: 'CO2',            size: '5 kg' },   //  297
  co2_2:          { type: 'CO2',            size: '2 kg' },   //  194
  duft2:          { type: 'ABC Duft',       size: '2 kg' },   //   28
  eldvarnarteppi: { type: 'Eldvarnarteppi', size: null   },   //   16
};

async function sb(slod, valkostir) {
  const r = await fetch(`${URL_}/rest/v1/${slod}`, { headers: H, ...(valkostir || {}) });
  if (!r.ok) throw new Error(`${(valkostir && valkostir.method) || 'GET'} ${slod.slice(0, 70)} → ${r.status} ${(await r.text()).slice(0, 200)}`);
  const t = await r.text();
  return t ? JSON.parse(t) : [];
}
async function allar(q) {
  let ut = [], f = 0;
  for (;;) { const d = await sb(`${q}&offset=${f}&limit=1000`); if (!d.length) break; ut = ut.concat(d); if (d.length < 1000) break; f += 1000; }
  return ut;
}

(async () => {
  const [rf, ut, co] = await Promise.all([
    allar('arsskodun_report_facts?select=fyrirtaeki_id,report_year,total_devices,equipment,inspect_month&order=fyrirtaeki_id'),
    allar('uttaeki?select=fyrirtaeki_id,status,serial&order=id'),
    allar('fyrirtaeki?select=id,nafn,er_i_thjonustu&deleted_at=is.null&order=id'),
  ]);

  const T = new Map();
  ut.forEach(u => { if (u.fyrirtaeki_id != null && u.status !== 'urelt') T.set(u.fyrirtaeki_id, (T.get(u.fyrirtaeki_id) || 0) + 1); });
  const N = new Map(co.map(c => [c.id, c]));

  const verk = [];
  rf.forEach(r => {
    const c = N.get(r.fyrirtaeki_id);
    if (!c || c.er_i_thjonustu !== true) return;          // aðeins í þjónustu
    if ((T.get(r.fyrirtaeki_id) || 0) > 0) return;         // á þegar tæki — aldrei snert
    const alls = +r.total_devices || 0;
    if (!alls) return;
    if (EITT && c.id !== EITT) return;
    const e = r.equipment || {};
    const linur = Object.entries(KORT)
      .map(([lykill, v]) => ({ ...v, n: +e[lykill] || 0 })).filter(x => x.n > 0);
    const summa = linur.reduce((a, x) => a + x.n, 0);
    verk.push({ c, r, alls, linur, summa, missir: alls - summa });
  });

  if (!verk.length) { console.log('Ekkert að gera — engin félög í þjónustu með skýrslu en engin tæki.'); return; }

  // næsta lausa TMP-númer
  let haest = 0;
  ut.forEach(u => { const m = /^TMP-(\d+)$/.exec(String(u.serial || '')); if (m) haest = Math.max(haest, +m[1]); });

  const idag = new Date().toISOString().slice(0, 10);
  let utrunnin = 0, alls = 0;
  const radir = [];
  verk.forEach(v => {
    const man = Math.min(12, Math.max(1, +v.r.inspect_month || 6));
    const last = `${v.r.report_year}-${String(man).padStart(2, '0')}-01`;
    const next = `${+v.r.report_year + 1}-${String(man).padStart(2, '0')}-01`;
    if (next < idag) utrunnin += v.summa;
    v.last = last; v.next = next;
    v.linur.forEach(l => { for (let i = 0; i < l.n; i++) radir.push({
      fyrirtaeki_id: v.c.id, client: v.c.nafn, type: l.type, size: l.size,
      status: 'active', last_insp: last, next_insp: next, serial: 'TMP-' + (++haest),
      notes: `Generað 02.09.2026 úr úttektarskýrslu ${v.r.report_year}`,
    }); });
    alls += v.summa;
  });

  console.log(`${verk.length} félög í þjónustu eiga skýrslu en ENGIN tæki\n`);
  verk.sort((a, b) => b.summa - a.summa).forEach(v => console.log(
    `   fid ${String(v.c.id).padEnd(6)}${String(v.summa).padStart(3)} tæki  skýrsla ${v.r.report_year}`
    + `  →${v.next < idag ? ' ÚTRUNNIN' : '         '}  ${v.c.nafn.slice(0, 34).padEnd(35)}`
    + v.linur.map(l => l.n + '× ' + l.type + (l.size ? ' ' + l.size : '')).join(', ').slice(0, 46)
    + (v.missir ? `   ⚠ skýrslan segir ${v.alls}, sundurliðun ${v.summa}` : '')));

  console.log(`\n   ${alls} tæki alls · ${utrunnin} þeirra strax útrunnin (skýrslan eldri en ár)`);
  const misr = verk.filter(v => v.missir);
  if (misr.length) console.log(`   ⚠ ${misr.length} félög þar sem heildartalan og sundurliðunin stangast á — sundurliðunin ræður`);
  console.log(`   Raðnúmer: TMP-${haest - alls + 1} … TMP-${haest}`);

  if (!KEYRA) { console.log('\nÞurrkeyrsla — ekkert skrifað. Bættu við --keyra.'); return; }

  const bakk = path.join(__dirname, `bakk-generud-taeki-${idag}.json`);
  fs.writeFileSync(bakk, JSON.stringify({ verk: verk.map(v => ({ fid: v.c.id, nafn: v.c.nafn, fjoldi: v.summa, ar: v.r.report_year })), radir }, null, 1), 'utf8');

  const bunar = [];
  for (let i = 0; i < radir.length; i += 200) {
    const b = await sb('uttaeki', { method: 'POST', headers: { ...H, Prefer: 'return=representation' }, body: JSON.stringify(radir.slice(i, i + 200)) });
    bunar.push(...b);
  }
  console.log(`\n✅ ${bunar.length} tæki skráð · afrit: ${path.relative(rot, bakk)}`);
  console.log(`   Bakkað með:  DELETE FROM uttaeki WHERE notes = 'Generað 02.09.2026 úr úttektarskýrslu …' (sjá afritið)`);

  // ── sannreyn: stemmir hvert félag nú við skýrsluna sína? ─────────────────
  const eftir = await allar('uttaeki?select=fyrirtaeki_id,status&order=id');
  const E = new Map();
  eftir.forEach(u => { if (u.fyrirtaeki_id != null && u.status !== 'urelt') E.set(u.fyrirtaeki_id, (E.get(u.fyrirtaeki_id) || 0) + 1); });
  const skakkt = verk.filter(v => (E.get(v.c.id) || 0) !== v.summa);
  console.log(skakkt.length
    ? `⚠ ${skakkt.length} félög stemma EKKI eftir á: ${skakkt.map(v => v.c.id).join(', ')}`
    : `✅ Öll ${verk.length} félögin stemma nú við sundurliðun skýrslunnar.`);
})().catch(e => { console.log('❌ ' + e.message); process.exitCode = 1; });
