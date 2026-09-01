#!/usr/bin/env node
/* Mælir upp á nýtt HVERJA tölu í docs/STADREYNDIR.md sem hægt er að mæla.
 *
 * HVERS VEGNA: skjalið er safnað úr mörgum lotum yfir mánuði. Það segir sjálft
 * „tölur merktar (DB 2026-07-30) eldast; reglurnar sjálfar eldast ekki" — en
 * enginn hafði mælt þær aftur. 01.09.2026 fundust FIMM fullyrðingar í því sem
 * voru ekki bara gamlar heldur RANGAR (status-sían, app_settings-lyklar,
 * þjónustu-gloppurnar, Þverholt-úttektirnar, Þemasnyrting).
 *
 * Skjal sem á að stöðva endurtekningar er verra en gagnslaust ef það geymir
 * ósannar tölur: það lætur næstu lotu endurtaka villuna með tilvitnun.
 *
 * Keyrsla:  node tools/stadreyndir-yfirferd.cjs
 * Skilar töflu: fullyrðing · skjalið segir · mælt núna · dómur.
 */
const fs = require('fs');
const path = require('path');

const rot = path.join(__dirname, '..');
const cfg = fs.readFileSync(path.join(rot, 'js/config.js'), 'utf8');
const URL_ = (cfg.match(/SUPABASE_URL\s*=\s*["']([^"']+)/) || [])[1];
const KEY = (cfg.match(/SUPABASE_KEY\s*=\s*["']([^"']+)/) || [])[1];
const H = { apikey: KEY, Authorization: 'Bearer ' + KEY };

async function allar(q) {
  let ut = [], f = 0;
  for (;;) {
    const r = await fetch(`${URL_}/rest/v1/${q}&offset=${f}&limit=1000`, { headers: H });
    if (!r.ok) throw new Error(`${q.slice(0, 40)} → ${r.status} ${(await r.text()).slice(0, 120)}`);
    const d = await r.json();
    if (!d.length) break;
    ut = ut.concat(d);
    if (d.length < 1000) break;
    f += 1000;
  }
  return ut;
}
async function telja(q) {
  const r = await fetch(`${URL_}/rest/v1/${q}`, { headers: { ...H, Prefer: 'count=exact', Range: '0-0' } });
  if (!r.ok) throw new Error(`${q.slice(0, 40)} → ${r.status}`);
  return +(r.headers.get('content-range') || '').split('/')[1] || 0;
}

const K = s => String(s || '').replace(/\D/g, '');
const nidur = [];
function skra(kafli, fullyrding, skjal, maelt, athugasemd) {
  let domur;
  if (skjal === null) domur = 'NÝTT';
  else if (skjal === maelt) domur = 'STENST';
  else {
    const d = Math.abs(maelt - skjal) / Math.max(1, Math.abs(skjal));
    domur = d > 0.25 ? 'REKUR MIKIÐ' : 'rekur';
  }
  nidur.push({ kafli, fullyrding, skjal, maelt, domur, athugasemd: athugasemd || '' });
}

(async () => {
  const [base, co, vsk, ut, docs, solur, pdSlokk, invoices, digest] = await Promise.all([
    allar('customers_base?select=id,kennitala&order=id'),
    allar('fyrirtaeki?select=id,nafn,kennitala,er_i_thjonustu,deleted_at,customer_base_id,netfang,simi&order=id'),
    allar('vidskiptavinir?select=id,kennitala&order=id'),
    allar('uttaeki?select=id,fyrirtaeki_id,status&order=id'),
    allar('customer_documents?select=id,doc_type,year,fyrirtaeki_id,customer_base_id,is_duplicate&order=id'),
    telja('solur?select=id'),
    telja('payday_invoices_slokk?select=id'),
    telja('invoices?select=id').catch(() => -1),
    telja('email_digest?select=id').catch(() => -1),
  ]);

  const lifandi = co.filter(c => !c.deleted_at);
  const eydd = co.filter(c => c.deleted_at);
  const ithj = lifandi.filter(c => c.er_i_thjonustu === true);

  // ── §1 Viðskiptavina-líkanið ──────────────────────────────────────────────
  skra('1', 'customers_base raðir', 1082, base.length);
  skra('1', 'customers_base án kennitölu', 0, base.filter(b => !K(b.kennitala)).length);
  skra('1', 'fyrirtaeki lifandi', 1214, lifandi.length);
  skra('1', 'fyrirtaeki soft-deleted', 143, eydd.length);
  skra('1', 'staðir í þjónustu', 655, ithj.length);
  skra('1', 'aðgreind félög í þjónustu (kt)', 601, new Set(ithj.map(c => K(c.kennitala)).filter(Boolean)).size);
  skra('1', 'vidskiptavinir raðir', 414, vsk.length);
  const ktBase = new Set(base.map(b => K(b.kennitala)).filter(Boolean));
  const ktVsk = new Set(vsk.map(v => K(v.kennitala)).filter(Boolean));
  skra('1', 'kt sem lifa EINGÖNGU í vidskiptavinir', 8, [...ktVsk].filter(k => !ktBase.has(k)).length);
  skra('1', 'walk-in 999999-9999 base-raðir', 1, base.filter(b => K(b.kennitala) === '9999999999').length);
  skra('1', 'uttaeki alls', 5843, ut.length);
  skra('1', 'uttaeki ÁN staðar (fyrirtaeki_id null)', 5648, ut.filter(u => u.fyrirtaeki_id == null).length);
  skra('1', 'lifandi fyrirtaeki ótengd base', 179, lifandi.filter(c => c.customer_base_id == null).length);

  // rekstrarfélaga-taflan
  const perKt = new Map();
  lifandi.forEach(c => { const k = K(c.kennitala); if (k) perKt.set(k, (perKt.get(k) || 0) + 1); });
  [['Heimaleiga', '5101170690', 11], ['Pizzan', '6810161200', 11], ['Center Hótel', '4509051430', 10],
   ['Steypustöðin', '6607070420', 7], ['Endurvinnslan', '6107891299', 5], ['Colas Ísland', '4201871499', 4],
   ['Aðalskoðun', '5409942269', 4]].forEach(([n, kt, gam]) =>
    skra('1', 'rekstrarfélag: ' + n + ' staðir', gam, perKt.get(kt) || 0));

  // ── §2 Skjöl ──────────────────────────────────────────────────────────────
  const teg = t => docs.filter(d => d.doc_type === t).length;
  skra('2', 'customer_documents: uttektarskyrsla', 1726, teg('uttektarskyrsla'));
  skra('2', 'customer_documents: reikningur', 1353, teg('reikningur'));
  skra('2', 'customer_documents: samningur', 336, teg('samningur'));
  skra('2', 'customer_documents: brunakerfi', 75, teg('brunakerfi'));
  const ar = (t, y) => docs.filter(d => d.doc_type === t && +d.year === y);
  skra('2', 'úttektarskýrslur 2026', 294, ar('uttektarskyrsla', 2026).length);
  skra('2', 'úttektarskýrslur 2025', 415, ar('uttektarskyrsla', 2025).length);
  skra('2', 'reikningar 2026', 588, ar('reikningur', 2026).length);
  skra('2', 'reikningar 2025', 325, ar('reikningur', 2025).length);
  const ithjIds = new Set(ithj.map(c => c.id));
  const medSkyrslu = y => new Set(ar('uttektarskyrsla', y).map(d => d.fyrirtaeki_id).filter(i => ithjIds.has(i))).size;
  skra('2', 'þjónustustaðir með 2026-skýrslu', 243, medSkyrslu(2026));
  skra('2', 'þjónustustaðir með 2025-skýrslu', 274, medSkyrslu(2025));
  skra('2', 'netfang á þjónustustöðum', 457, ithj.filter(c => (c.netfang || '').trim()).length);
  skra('2', 'sími á þjónustustöðum', 188, ithj.filter(c => (c.simi || '').trim()).length);

  // ── §3 Sölur ──────────────────────────────────────────────────────────────
  skra('3', 'solur raðir', 575, solur);
  skra('3', 'payday_invoices_slokk raðir', 171, pdSlokk);
  if (invoices >= 0) skra('3', 'invoices (Brunahólf AR)', 435, invoices);

  // ── §4 Póstur ─────────────────────────────────────────────────────────────
  if (digest >= 0) skra('4', 'email_digest raðir', 30724, digest);

  // ── §0 Endurheimtin ───────────────────────────────────────────────────────
  const skjalMedFid = new Set(docs.filter(d => d.fyrirtaeki_id != null).map(d => d.fyrirtaeki_id));
  const ktMedSkjal = new Set();
  lifandi.forEach(c => { if (skjalMedFid.has(c.id)) { const k = K(c.kennitala); if (k) ktMedSkjal.add(k); } });
  const ktIThj = new Set(ithj.map(c => K(c.kennitala)).filter(Boolean));
  skra('0', 'félög með skjöl en ENGINN staður í þjónustu', 56, [...ktMedSkjal].filter(k => !ktIThj.has(k)).length);

  // ── prenta ────────────────────────────────────────────────────────────────
  const b = { 'STENST': 0, 'rekur': 0, 'REKUR MIKIÐ': 0, 'NÝTT': 0 };
  nidur.forEach(r => b[r.domur]++);
  console.log('YFIRFERÐ Á docs/STADREYNDIR.md — mælt ' + new Date().toISOString().slice(0, 10));
  console.log('Tölurnar í skjalinu eru merktar (DB 2026-07-30).\n');
  console.log('  §  ' + 'fullyrðing'.padEnd(44) + 'skjalið'.padStart(8) + 'núna'.padStart(9) + '   dómur');
  console.log('  ' + '─'.repeat(78));
  let kafli = null;
  nidur.forEach(r => {
    if (r.kafli !== kafli) { kafli = r.kafli; console.log(''); }
    const merki = r.domur === 'STENST' ? '✓' : r.domur === 'rekur' ? '·' : '⚠';
    console.log('  ' + r.kafli + '  ' + r.fullyrding.slice(0, 43).padEnd(44)
      + String(r.skjal).padStart(8) + String(r.maelt).padStart(9) + '   ' + merki + ' ' + r.domur);
  });
  console.log('\n  ' + '─'.repeat(78));
  console.log(`  ${b['STENST']} standast · ${b['rekur']} reka lítið · ${b['REKUR MIKIÐ']} reka MIKIÐ (>25%)`);
  console.log('\n  „Rekur" er ekki villa — tölur eldast og skjalið segir það sjálft.');
  console.log('  ⚠-línur eru þær sem eru orðnar svo skakkar að ályktun byggð á þeim');
  console.log('  yrði röng. Þær á að endurmæla í skjalinu eða fjarlægja.');
})().catch(e => { console.log('❌ ' + e.message); process.exitCode = 1; });
