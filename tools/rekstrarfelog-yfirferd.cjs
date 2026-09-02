#!/usr/bin/env node
/* REKSTRARFÉLÖG — hreinsun og fact-check (Agnar 01.09.2026).
 *
 * TVENNT ÓLÍKT SEM ER AUÐVELT AÐ RUGLA SAMAN:
 *
 *   A. EIN KENNITALA · MARGAR STARFSSTÖÐVAR — eitt lögaðili sem rekur marga
 *      staði (Heimaleiga 510117-0690, Center Hótel 450905-1430). Auðkenni
 *      staðar er kennitala + `fyrirtaeki.stadur_nr`. ALDREI sameina þessa staði.
 *
 *   B. `customers_base.rekstrarfelag` — MERKI á base-röð, þvert á kennitölur.
 *      Eignaumsjón ber 65 base-raðir sem hver er SITT húsfélag með SÍNA
 *      kennitölu. Þetta er umsjónaraðili, ekki eitt félag.
 *
 * `docs/STADREYNDIR.md` §1 telur þau í sömu töflu („Eignaumsjón 69 · Heimaleiga
 * 11") og það er villandi: fyrsta talan er merki yfir 65 kennitölur, hin er
 * einn lögaðili með 11 staði. Þessi yfirferð heldur þeim aðskildum.
 *
 * Keyrsla:  node tools/rekstrarfelog-yfirferd.cjs
 *           node tools/rekstrarfelog-yfirferd.cjs <kt|nafn>   (eitt félag)
 */
const fs = require('fs');
const path = require('path');

const rot = path.join(__dirname, '..');
const cfg = fs.readFileSync(path.join(rot, 'js/config.js'), 'utf8');
const URL_ = (cfg.match(/SUPABASE_URL\s*=\s*["']([^"']+)/) || [])[1];
const KEY = (cfg.match(/SUPABASE_KEY\s*=\s*["']([^"']+)/) || [])[1];
const H = { apikey: KEY, Authorization: 'Bearer ' + KEY };
const SIA = (process.argv[2] || '').toLowerCase();

async function allar(q) {
  let ut = [], f = 0;
  for (;;) {
    const r = await fetch(`${URL_}/rest/v1/${q}&offset=${f}&limit=1000`, { headers: H });
    if (!r.ok) throw new Error(`${q.slice(0, 40)} → ${r.status}`);
    const d = await r.json();
    if (!d.length) break;
    ut = ut.concat(d);
    if (d.length < 1000) break;
    f += 1000;
  }
  return ut;
}
const K = s => String(s || '').replace(/\D/g, '');

(async () => {
  const [co, base, ut, docs] = await Promise.all([
    allar('fyrirtaeki?select=id,nafn,kennitala,stadur_nr,er_i_thjonustu,deleted_at,customer_base_id,heimilisfang&order=id'),
    allar('customers_base?select=id,nafn,kennitala,rekstrarfelag&order=id'),
    allar('uttaeki?select=fyrirtaeki_id,status,client&order=id'),
    allar('customer_documents?select=fyrirtaeki_id,doc_type,year&order=id'),
  ]);

  const lifandi = co.filter(c => !c.deleted_at);
  const baseById = new Map(base.map(b => [b.id, b]));

  // tæki og skjöl per stað — talan er það sem skiptir máli (uttaeki er teljari)
  const taeki = new Map(), skjol = new Map();
  ut.forEach(u => { if (u.fyrirtaeki_id != null && u.status !== 'urelt') taeki.set(u.fyrirtaeki_id, (taeki.get(u.fyrirtaeki_id) || 0) + 1); });
  docs.forEach(d => { if (d.fyrirtaeki_id != null) skjol.set(d.fyrirtaeki_id, (skjol.get(d.fyrirtaeki_id) || 0) + 1); });
  const nafnDrift = new Map();
  ut.forEach(u => { if (u.fyrirtaeki_id != null && u.status !== 'urelt') {
    const c = lifandi.find(x => x.id === u.fyrirtaeki_id);
    if (c && (u.client || '') !== c.nafn) nafnDrift.set(c.id, (nafnDrift.get(c.id) || 0) + 1);
  } });

  // ── A. ein kennitala · margar starfsstöðvar ────────────────────────────────
  const perKt = new Map();
  lifandi.forEach(c => { const k = K(c.kennitala); if (!k) return; if (!perKt.has(k)) perKt.set(k, []); perKt.get(k).push(c); });
  const fjolstada = [...perKt.entries()].filter(([, s]) => s.length > 1)
    .sort((a, b) => b[1].length - a[1].length);

  const flogg = [];
  console.log('═══ A. EIN KENNITALA · MARGAR STARFSSTÖÐVAR ═══');
  console.log(`    ${fjolstada.length} kennitölur bera fleiri en einn lifandi stað\n`);
  console.log('    ' + 'félag'.padEnd(34) + 'kt'.padEnd(12) + 'staðir'.padStart(7)
    + 'í þjón.'.padStart(8) + 'tæki'.padStart(6) + 'skjöl'.padStart(7) + '   athugasemd');
  console.log('    ' + '─'.repeat(94));

  fjolstada.forEach(([kt, stadir]) => {
    const b = stadir.map(s => baseById.get(s.customer_base_id)).find(Boolean);
    const nafn = (b && b.nafn) || stadir[0].nafn.split(' - ')[0];
    if (SIA && !(kt.includes(SIA) || nafn.toLowerCase().includes(SIA))) return;

    const ithj = stadir.filter(s => s.er_i_thjonustu === true).length;
    const t = stadir.reduce((a, s) => a + (taeki.get(s.id) || 0), 0);
    const sk = stadir.reduce((a, s) => a + (skjol.get(s.id) || 0), 0);

    // ── athuganir per félag ────────────────────────────────────────────────
    const a = [];
    const nr = stadir.map(s => s.stadur_nr);
    const anNr = nr.filter(x => x == null).length;
    if (anNr) a.push(anNr + ' án stadur_nr');
    const tvi = nr.filter(x => x != null);
    const tviTalning = new Map();
    tvi.forEach(x => tviTalning.set(x, (tviTalning.get(x) || 0) + 1));
    const tvitekid = [...tviTalning.entries()].filter(([, n]) => n > 1);
    if (tvitekid.length) a.push('tvítekið nr: ' + tvitekid.map(([n, c]) => n + '×' + c).join(','));
    const basar = new Set(stadir.map(s => s.customer_base_id));
    if (basar.size > 1) a.push(basar.size + ' ólík customer_base_id');
    if (basar.has(null) || basar.has(undefined)) a.push('stað(ir) án base');
    const drift = stadir.filter(s => nafnDrift.has(s.id)).length;
    if (drift) a.push(drift + ' með nafn-rek á tækjum');
    const tomir = stadir.filter(s => !(taeki.get(s.id) || 0) && !(skjol.get(s.id) || 0) && s.er_i_thjonustu !== true).length;
    if (tomir) a.push(tomir + ' tómir (engin tæki/skjöl, ekki í þjónustu)');
    // nafna-samræmi: bera allir staðir sama forskeyti?
    const forsk = new Set(stadir.map(s => s.nafn.split(/\s+[-–]\s+/)[0].trim().toLowerCase()));
    if (forsk.size > 1) a.push(forsk.size + ' ólík nafna-forskeyti');

    if (a.length) flogg.push({ kt, nafn, stadir, a });
    console.log('    ' + nafn.slice(0, 33).padEnd(34) + kt.padEnd(12)
      + String(stadir.length).padStart(7) + String(ithj).padStart(8)
      + String(t).padStart(6) + String(sk).padStart(7)
      + (a.length ? '   ⚠ ' + a.join(' · ') : '   ✓'));
  });

  // ── B. rekstrarfelag-merkið ───────────────────────────────────────────────
  console.log('\n═══ B. MERKIÐ `customers_base.rekstrarfelag` — þvert á kennitölur ═══');
  const merki = new Map();
  base.forEach(b => { if (b.rekstrarfelag) { if (!merki.has(b.rekstrarfelag)) merki.set(b.rekstrarfelag, []); merki.get(b.rekstrarfelag).push(b); } });
  console.log(`    ${merki.size} merki á ${[...merki.values()].reduce((a, x) => a + x.length, 0)} base-röðum\n`);
  console.log('    ' + 'merki'.padEnd(30) + 'base-raðir'.padStart(11) + 'ólíkar kt'.padStart(11) + '   eðli');
  console.log('    ' + '─'.repeat(72));
  [...merki.entries()].sort((a, b) => b[1].length - a[1].length).forEach(([m, rows]) => {
    const kts = new Set(rows.map(r => K(r.kennitala)).filter(Boolean));
    const edli = kts.size > 1 ? 'UMSJÓNARAÐILI (margar kt)' : 'eitt félag';
    console.log('    ' + m.slice(0, 29).padEnd(30) + String(rows.length).padStart(11)
      + String(kts.size).padStart(11) + '   ' + edli);
  });

  // fjölstaða-hópar ÁN merkis
  const merktKt = new Set();
  [...merki.values()].flat().forEach(b => { const k = K(b.kennitala); if (k) merktKt.add(k); });
  const anMerkis = fjolstada.filter(([kt]) => !merktKt.has(kt));
  console.log(`\n    ${anMerkis.length} fjölstaða-kennitölur bera EKKERT rekstrarfelag-merki:`);
  anMerkis.slice(0, 15).forEach(([kt, s]) => {
    const b = s.map(x => baseById.get(x.customer_base_id)).find(Boolean);
    console.log('      ' + String(s.length).padStart(3) + ' staðir  ' + kt + '  ' + ((b && b.nafn) || s[0].nafn).slice(0, 44));
  });
  if (anMerkis.length > 15) console.log('      … og ' + (anMerkis.length - 15) + ' til viðbótar');

  // ── samantekt ─────────────────────────────────────────────────────────────
  console.log('\n═══ SAMANTEKT ═══');
  console.log(`    ${fjolstada.length} fjölstaða-félög · ${flogg.length} þeirra með athugasemd`);
  const telja = {};
  flogg.forEach(f => f.a.forEach(x => { const k = x.replace(/^\d+ /, '').replace(/:.*$/, ''); telja[k] = (telja[k] || 0) + 1; }));
  Object.entries(telja).sort((a, b) => b[1] - a[1]).forEach(([k, n]) => console.log(`      ${String(n).padStart(3)}  ${k}`));
})().catch(e => { console.log('❌ ' + e.message); process.exitCode = 1; });
