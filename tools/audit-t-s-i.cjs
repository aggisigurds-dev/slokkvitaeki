#!/usr/bin/env node
'use strict';
/* T = S = I — tækin á prófílnum eiga að vera jöfn úttektarskýrslunni og reikningnum.
 *
 * Regla Agnars, orðrétt 09.09.2026:
 *   "Aðal regla með það og fullkomið fact check að Tækin inn á prófíl er jafnt
 *    úttektarskýrslu og jafnt við invoice. T=S=I. Það sé líka grunnurinn sem
 *    restin af síðunni á að líta til."
 *
 * Af hverju vörðurinn er til: hann sagði "tækjalistinn hefur oft verið að detta út
 * úr fyrirtækjaprófílunum en samt sýna tölu á ársskoðunarsíðunni". Mæling staðfesti
 * það strax:
 *
 *   454 félög með skýrslutölu
 *   301 stemma  (T = S)
 *    43 PRÓFÍLL TÓMUR en skýrslan sýnir tölu   <- nákvæmlega kvörtunin
 *   110 báðar til en ósammála
 *   ---
 *   153 brot af 454.   T alls 3.813   S alls 4.456   =  643 tækja munur
 *
 * audit-taeki-profill.cjs er GRÆNN yfir þessu — hann staðfestir aðeins að prófíllinn
 * lesi uttaeki, hann ber aldrei saman við skýrsluna. T=S=I var hvergi þvingað.
 *
 * HVAÐ ER HVAÐ
 *   T  uttaeki á fyrirtaeki_id (status <> urelt)     — prófíllinn, raunverulegu tækin
 *   S  app_settings.arsskodun_customers[fid].equipment — talið upp úr úttektarskýrslu
 *   I  úttektarreikningur ársins                      — það sem var rukkað
 *
 * AÐFERÐ VIÐ GÖMLU SKULDINA
 * Grunnlína sem ein tala myndi fela 153 félög á bak við eitt númer, og það er
 * nákvæmlega þöggunin sem þessi verkfærakista á að lækna. Í staðinn er gamla
 * skuldin skrifuð sem NAFNGREINDUR listi í tools/_t-s-i-grunnlina.json:
 *   • nýtt misræmi  -> RAUTT strax
 *   • þekkt misræmi -> talið upp, fellir ekki, og listinn á að styttast
 * Þegar félag er lagað fellur það sjálfkrafa út. Listinn getur aldrei vaxið þögult.
 *
 * Keyrsla:  node tools/audit-t-s-i.cjs
 *           node tools/audit-t-s-i.cjs --skra-grunnlinu   (endurskrifar snjómyndina)
 * Read-only á gögnin. Notar publishable-lykilinn úr js/config.js (RLS).
 */
const fs = require('fs');
const path = require('path');

const rot = path.join(__dirname, '..');
const GRUNNLINA_SKRA = path.join(__dirname, '_t-s-i-grunnlina.json');
const cfg = fs.readFileSync(path.join(rot, 'js/config.js'), 'utf8');
const URL_ = (cfg.match(/SUPABASE_URL\s*=\s*["']([^"']+)/) || [])[1];
const KEY = (cfg.match(/SUPABASE_KEY\s*=\s*["']([^"']+)/) || [])[1];
const H = { apikey: KEY, Authorization: 'Bearer ' + KEY };

function fail(msg) { console.log('RED: ' + msg); process.exit(1); }

async function sb(slod) {
  const r = await fetch(URL_ + '/rest/v1/' + slod, { headers: H });
  if (!r.ok) throw new Error(slod.slice(0, 70) + ' -> ' + r.status);
  return r.json();
}

// ── KÓÐA-LEGGURINN (10.09.2026) ────────────────────────────────────────────────
// Gagna-mælingin ein og sér getur ALDREI varið lagfæringuna: afritið í
// arsskodun_customers stendur áfram (viljandi — 12 skrár skrifa í það og eyðing
// brýtur annað), svo þessi vörður mun telja sömu 225 félögin þótt síðan sé löguð.
// Það sem BREYTTIST er hvaðan Ársskoðun les töluna. Hér er sú braut fest:
// afleiðslan úr uttaeki verður að hlaupa LÍKA þegar prófíllinn er tómur, annars
// stendur gamla afritið eftir sem talan á borðinu — nákvæmlega einkennið sem
// Agnar lýsti („dettur út úr prófílnum en sýnir samt tölu á ársskoðunarsíðunni").
function kodaVordur() {
  const ars = fs.readFileSync(path.join(rot, 'js/patches/153-arsskodun.js'), 'utf8');
  if (!/if \(units\.length && !manual\.equipment_manual\) \{/.test(ars))
    fail('153: afleiðslan úr uttaeki (units) er horfin — prófíllinn er heimildin fyrir T.');
  if (!/\} else if \(!manual\.equipment_manual && manual\.equipment\) \{/.test(ars))
    fail('153: TÓMUR prófíll fellur aftur á skýrslu-afritið (arsskodun_customers.equipment). '
       + 'else-greinin sem lætur lifandi töluna gilda þótt hún sé 0 er farin — T=S brotið.');
  if (!/_ars\._blobMisraemi\s*=\s*true/.test(ars))
    fail('153: misræmið milli tóms prófíls og afritsins er ekki lengur merkt (_blobMisraemi) — það á að SJÁST.');
  if (!/_ars\._blobEq\s*=\s*manual\.equipment/.test(ars))
    fail('153: afritið er ekki geymt (_blobEq). Það má aldrei hverfa þögult — aðeins víkja fyrir lifandi tölunni.');
  if (!/_ars\._misraemi \|\| c\._ars\._blobMisraemi/.test(ars))
    fail('153: „⚠ Stemmir ekki"-sían nær ekki yfir afrits-misræmið — þá er ekki hægt að finna það.');
}

(async () => {
  const skraGrunnlinu = process.argv.includes('--skra-grunnlinu');
  if (!skraGrunnlinu) kodaVordur();

  // ---- S: skýrslutalan úr app_settings ------------------------------------
  const stillingar = await sb('app_settings?select=settings&limit=1');
  const ars = (stillingar[0] && stillingar[0].settings && stillingar[0].settings.arsskodun_customers) || {};

  const S = new Map();
  for (const [fid, gogn] of Object.entries(ars)) {
    const bunadur = gogn && gogn.equipment;
    if (!bunadur || typeof bunadur !== 'object') continue;
    const summa = Object.values(bunadur).reduce((a, b) => a + (Number(b) || 0), 0);
    S.set(String(fid), { summa, skyrsla: (gogn._skyrsla || '').slice(0, 60) });
  }

  // ---- T: raunveruleg tæki á prófílnum ------------------------------------
  const T = new Map();
  for (let fra = 0; ; fra += 1000) {
    const r = await fetch(URL_ + '/rest/v1/uttaeki?select=fyrirtaeki_id,status', {
      headers: { ...H, Range: `${fra}-${fra + 999}` }
    });
    const b = await r.json();
    if (!Array.isArray(b) || !b.length) break;
    for (const t of b) {
      if (t.status === 'urelt' || t.fyrirtaeki_id == null) continue;
      const k = String(t.fyrirtaeki_id);
      T.set(k, (T.get(k) || 0) + 1);
    }
    if (b.length < 1000) break;
  }

  // ---- Bera saman ---------------------------------------------------------
  const misraemi = [];
  for (const [fid, s] of S) {
    const t = T.get(fid) || 0;
    if (t !== s.summa) misraemi.push({ fid, T: t, S: s.summa, skyrsla: s.skyrsla });
  }
  misraemi.sort((a, b) => Math.abs(b.T - b.S) - Math.abs(a.T - a.S));

  if (skraGrunnlinu) {
    fs.writeFileSync(GRUNNLINA_SKRA, JSON.stringify({
      skrad: new Date().toISOString().slice(0, 10),
      skyring: 'Þekkt T<>S misræmi. Listinn á AÐEINS að styttast. Nýtt fid hér inn = RAUTT.',
      felog: misraemi.map(m => m.fid).sort()
    }, null, 1), 'utf8');
    console.log(`📌 Grunnlína skráð: ${misraemi.length} félög í ${path.basename(GRUNNLINA_SKRA)}`);
    return;
  }

  let thekkt = [];
  try { thekkt = JSON.parse(fs.readFileSync(GRUNNLINA_SKRA, 'utf8')).felog || []; }
  catch { fail('Grunnlínuskrá vantar. Keyrðu: node tools/audit-t-s-i.cjs --skra-grunnlinu'); }
  const thekktSet = new Set(thekkt.map(String));

  const nytt = misraemi.filter(m => !thekktSet.has(m.fid));
  const lagad = thekkt.filter(f => !misraemi.some(m => m.fid === String(f)));

  if (nytt.length) {
    nytt.slice(0, 10).forEach(m =>
      console.log(`   fyrirtaeki ${m.fid}: prófíll ${m.T} tæki, skýrsla ${m.S}` +
        (m.skyrsla ? `  (${m.skyrsla})` : '')));
    fail(`${nytt.length} NÝTT brot á T=S — félög sem stemmdu áður gera það ekki lengur. ` +
      `Þekkt frá fyrri mælingu: ${misraemi.length - nytt.length}.`);
  }

  const tomirProfilar = misraemi.filter(m => m.T === 0 && m.S > 0).length;
  console.log(`✅ GRÆNT T=S: ekkert nýtt misræmi. Þekkt eftir: ${misraemi.length} félög` +
    (tomirProfilar ? ` (${tomirProfilar} með tóman prófíl en tölu á Ársskoðun)` : '') +
    (lagad.length ? ` · ${lagad.length} lagað síðan grunnlínan var skráð 👏` : ''));

  // ── HVE MÖRG ÞEIRRA ERU LIFANDI? (10.09.2026) ───────────────────────────────
  // 225 er hrikaleg tala þangað til maður spyr hverjum hún tilheyrir. Mælt: 110 af
  // 862 færslum í arsskodun_customers vísa á fyrirtæki sem er EYTT eða ekki lengur
  // til í fyrirtaeki-töflunni. Þau geta ekki „lagast" — enginn prófíll er til að
  // stemma við. Talan sem eitthvað er hægt að gera við er sú sem stendur á borðinu.
  const cos = [];
  for (let fra = 0; ; fra += 1000) {
    const b = await sb(`fyrirtaeki?select=id,er_i_thjonustu,deleted_at&order=id&offset=${fra}&limit=1000`);
    if (!Array.isArray(b) || !b.length) break;
    cos.push(...b);
    if (b.length < 1000) break;
  }
  const coById = new Map(cos.map(c => [String(c.id), c]));
  let ekkiTil = 0, eytt = 0, lifandi = [];
  misraemi.forEach(m => {
    const c = coById.get(m.fid);
    if (!c) { ekkiTil++; return; }
    if (c.deleted_at) { eytt++; return; }
    lifandi.push(m);
  });
  const lifTomir = lifandi.filter(m => m.T === 0 && m.S > 0);
  console.log(`   af þeim: ${ekkiTil} á fyrirtæki sem ER EKKI TIL · ${eytt} á EYTT fyrirtæki · ` +
    `${lifandi.length} á lifandi fyrirtæki` +
    (lifTomir.length ? ` (þar af ${lifTomir.length} með tóman prófíl: ${lifTomir.map(m => m.fid).join(', ')})` : ''));
  console.log('   Ársskoðun sýnir LIFANDI töluna í öllum tilvikum — afritið stendur eftir í stillingunum,');
  console.log('   merkt „⚠ afrit N" á röðinni og finnanlegt undir síunni „⚠ Stemmir ekki".');

  // ── I-LEGGURINN — UPPLÝSANDI, EKKI JAFNA ────────────────────────────────────
  // T=S=I er ekki hægt að þvinga á I-legginn í dag og það á að standa hér svart á
  // hvítu í stað þess að láta eins og hann sé kominn: uttekt_reikningur_facts nær
  // aðeins yfir hluta kúnnahópsins, og reikningur fyrra árs á EKKI að vera jafn
  // tækjalistanum í dag (tæki bætast við og fara). Jafnan verður marktæk þegar
  // reikningur YFIRSTANDANDI árs er til fyrir staðinn — sú þekja er talin hér.
  try {
    const inv = [];
    for (let fra = 0; ; fra += 1000) {
      const b = await sb(`uttekt_reikningur_facts?select=fyrirtaeki_id,invoice_year,invoice_date,total_devices&order=fyrirtaeki_id&offset=${fra}&limit=1000`);
      if (!Array.isArray(b) || !b.length) break;
      inv.push(...b);
      if (b.length < 1000) break;
    }
    const ar = new Date().getFullYear();
    const staedir = new Set(inv.map(x => String(x.fyrirtaeki_id)));
    const iAr = new Map();
    inv.filter(x => +x.invoice_year === ar).forEach(x => iAr.set(String(x.fyrirtaeki_id), x));
    let stemma = 0, osamm = 0;
    for (const [fid, x] of iAr) {
      const t = T.get(fid) || 0;
      if (t === (+x.total_devices || 0)) stemma++; else osamm++;
    }
    const iThjonustu = cos.filter(c => !c.deleted_at && c.er_i_thjonustu === true).length;
    console.log(`ℹ️  I-leggurinn: uttekt_reikningur_facts nær yfir ${staedir.size} staði alls, ` +
      `þar af ${iAr.size} með reikning ${ar} — af ${iThjonustu} í þjónustu.`);
    console.log(`   T=I fyrir ${ar}: ${stemma} stemma · ${osamm} ósammála. ` +
      `Ekki þvingað: þekjan (${Math.round(iAr.size / Math.max(1, iThjonustu) * 100)}%) er of lítil til að jafna á.`);
  } catch (e) {
    console.log('ℹ️  I-leggurinn: uttekt_reikningur_facts ólesanleg (' + e.message + ') — T=I ómælt.');
  }
})().catch(e => fail(e.message));
