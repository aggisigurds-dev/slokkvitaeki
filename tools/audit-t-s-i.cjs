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
  /* 23.10.2026 — Agnar: „sérðu afhverju sum af nýju fyrirtækjunum sýna 0 í
   * tækjalista". Rótin var EKKI í afleiðslunni hér að ofan heldur í því hvaðan
   * tækin voru lesin: ræsi-skyndiminnið (360) hýðir DB.cache.units úr IndexedDB
   * og setur `_unitsComplete`, þótt myndin geti verið daga gömul. Fyrirtæki sem
   * fékk tækin sín eftir að myndin var tekin á engar raðir í henni.
   *
   * MÆLT á lifandi síðu þennan dag: 6.466 raðir í minni, NÚLL fyrir Lýsi (1872,
   * 13 tæki í grunni) og ProLan Suðurhellu 5 (1875, 7), réttar 10 fyrir Nesdekk
   * Dalshraun (1853). Skilin lágu nákvæmlega við aldur myndarinnar. Hermt í
   * vafra: með merkinu lesnu 13/7/10, án þess 0/0/10 með „⚠ afrit 13"/„afrit 7"
   * — nákvæmlega skjáskot Agnars.
   *
   * `_unitsFromSnapshot` greinir afritið frá alvöru heildarsókn og db.js hreinsar
   * það um leið og sóknin lendir. Fjórir staðir urðu að lesa það; hyrfi skilyrðið
   * aftur myndi borðið mála 0 á hvert nýtt félag þar til myndin endurnýjast. */
  if (!/DB\._unitsComplete && !DB\._unitsFromSnapshot/.test(ars))
    fail('153 heilTaekiIMinni: les ekki `_unitsFromSnapshot`. Þá gildir daga gamalt '
       + 'ræsi-skyndiminni sem heildarmynd og hvert félag sem varð til eftir hana '
       + 'sýnir 0 SLT/BSL/RS með „⚠ afrit N" — mælt 23.10.2026 á Lýsi og ProLan.');
  for (const [p, heiti] of [
    ['js/patches/15-sidebar-counts.js', '15 (hliðarstiku-merkið)'],
    ['js/patches/431-uppferslubord.js', '431 (uppfærsluborðið)'],
    ['js/mapfix.js', 'mapfix (opnun prófíls af korti)']
  ]) {
    if (!/_unitsFromSnapshot/.test(fs.readFileSync(path.join(rot, p), 'utf8')))
      fail(heiti + ': les ekki `_unitsFromSnapshot` — treystir afrits-myndinni sem '
         + 'heildarmynd, sama villa og 153 bar. Hún er ein rót, ekki fjórar.');
  }

  if (!/_ars\._blobMisraemi\s*=\s*true/.test(ars))
    fail('153: misræmið milli tóms prófíls og afritsins er ekki lengur merkt (_blobMisraemi) — það á að SJÁST.');
  if (!/_ars\._blobEq\s*=\s*manual\.equipment/.test(ars))
    fail('153: afritið er ekki geymt (_blobEq). Það má aldrei hverfa þögult — aðeins víkja fyrir lifandi tölunni.');
  if (!/_ars\._misraemi \|\| c\._ars\._blobMisraemi/.test(ars))
    fail('153: „⚠ Stemmir ekki"-sían nær ekki yfir afrits-misræmið — þá er ekki hægt að finna það.');

  // ── 23.09.2026: TVÆR ÁTTIR, TVÖ ÓLÍK SVÖR ───────────────────────────────────
  // Gagna-mælingin hér að neðan hafði enga áttarskyn og því tvö ólík vandamál undir
  // einni rauðri tölu. Mælt á LIFANDI félögum þennan dag: 612 stemmdu, 26 voru með
  // STÆRRI prófíl en afrit og 12 með minni (3 tómir + 9 skammir).
  //
  //   T > S  tæki skráð í felti eftir að afritið var tekið. Gögnin eru RÉTT; afritið
  //          er úrelt. Þetta gerðist á hverjum úttektardegi og var eina ástæðan fyrir
  //          fimm „NÝ brot" 21.09. Vörður sem gelgir í hvert sinn sem unnið er verður
  //          þaggaður — rótin er löguð í 224, ekki þögguð hér.
  //   T < S  tækin vantar á prófílinn. ÞETTA er kvörtun Agnars og má aldrei hverfa.
  //
  // Báðar brautirnar eru festar hér svo hvorug geti dottið út þegjandi.
  const ut = fs.readFileSync(path.join(rot, 'js/patches/224-uttekt-taeki.js'), 'utf8');
  if (!/patch\.equipment\s*=\s*_eq/.test(ut))
    fail('224: staðfesting tækjalistans uppfærir ekki lengur skýrslu-afritið (patch.equipment). '
       + 'Án þess fer T og S í sundur við HVERJA úttekt og vörðurinn verður hávaði.');
  if (!/_u\.length\s*>=\s*_afrit/.test(ut))
    fail('224: skilyrðið „aðeins upp á við" er farið. Staðfesting má ALDREI lækka afritið — '
       + 'þá máist ⚠-merkið yfir tæki sem vantar á prófílinn út með einum smelli.');
  if (!/categoryOf,\s*version:/.test(ars))
    fail('153: categoryOf er ekki lengur deilt út — 224 myndi flokka tækin með eigin afriti '
       + 'af körfunum og búa til misræmið sem það á að loka.');
  if (!/_ars\._blobStutt\s*=\s*units\.length/.test(ars))
    fail('153: SKAMMUR prófíll (0 < T < S) er ekki lengur merktur (_blobStutt). Hann sást hvergi '
       + 'fyrir 23.09.2026 — níu lifandi félög, þar á meðal 5 tæki á móti 54.');

  // ── 14.10.2026: ÚTTEKTIN ER TALNINGIN ────────────────────────────────────────
  // Þriðja áttin sem hvorug braut að ofan náði: tæki FJARLÆGT í úttekt. 224 lækkar
  // afritið aldrei, svo sex félög (414, 463, 465, 660, 1142, 1366) urðu NÝ brot eftir
  // úttektir 12.–13.10. þótt prófíll = reikningur = véllesin skýrsla í öllum sex.
  // 165 lætur afritið nú fylgja úttekt sem tók HVERT tæki prófílsins. Skilyrðin eru
  // það sem gerir lækkunina örugga — hverfi eitt þeirra gæti ein úttekt með „Sleppa"
  // máð út tæki sem vantar á prófílinn, sem er nákvæmlega það sem 224 ver.
  const vw = fs.readFileSync(path.join(rot, 'js/patches/165-visit-workflow.js'), 'utf8');
  if (!/if \(saleId\) \{\s*try \{ await afritEftirUttekt\(coId, visit, saleNum\)/.test(vw))
    fail('165: úttekt uppfærir ekki lengur skýrslu-afritið eftir reikning (afritEftirUttekt). '
       + 'Þá stendur S hátt eftir hverja úttekt sem fjarlægir tæki og vörðurinn verður hávaði.');
  if (!/visit\.servicedIds\.length !== units\.length\) return/.test(vw))
    fail('165: afritEftirUttekt krefst ekki lengur að HVERT tæki hafi verið þjónustað. '
       + 'Úttekt með „Sleppa" er ekki talning og má aldrei lækka afritið.');
  if (!/Number\(u\.fyrirtaeki_id\) !== Number\(coId\)\)\) return/.test(vw))
    fail('165: afritEftirUttekt telur nafna-tæki (fyrirtaeki_id null) með — T gerir það ekki, svo S og T fara í sundur.');
  if (!/if \(cur\.equipment_manual\) return/.test(vw))
    fail('165: afritEftirUttekt virðir ekki handvirku töluna (equipment_manual) — hún á að vinna yfir allt.');
  // Gamlir hópalyklar (slt/bsl/rs) í afritinu: eqGroups tekur þá fram yfir fínflokkana. Fái þeir ekki
  // null þegar fínflokkar eru skrifaðir ofan á, verður S = gamla summan + nýja (Pitstop 543: 8 á móti 4).
  for (const [skra, txt] of [['165', vw], ['224', ut]]) {
    if (!/AFRIT_FLOKKAR\.indexOf\(k\) < 0\) eq\[k\] = null|_FLOKKAR\.indexOf\(k\)\s*<\s*0\)\s*_eq\[k\]\s*=\s*null/.test(txt))
      fail(skra + ': gamlir hópalyklar (slt/bsl/rs) í skýrslu-afritinu eru ekki núllaðir (null) þegar fínflokkar eru skrifaðir — S tvítelur.');
  }
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
