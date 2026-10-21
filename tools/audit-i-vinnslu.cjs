#!/usr/bin/env node
'use strict';
/* Í VINNSLU — ein regla, einn fjöldi, alls staðar.
 *
 * Agnar, 21.10.2026, orðrétt:
 *   „þetta á allt að fylgjast saman... Á verkstæði - í vinnslu í ársskoðun -
 *    í vinnslu takkinn í company profile - á þjónustuverkstæði"
 *   „Setja vörð sem passar að fjöldinn á hverjum stað sé sá sami"
 *
 * AF HVERJU HANN ER TIL. Reglan var skrifuð upp aftur á hverjum stað — fjórar
 * skrár, sjö eintök — og þau voru þegar farin að reka í sundur. Dæmi sem kostaði
 * tíma og stendur skráð í 304 frá 16.10.2026: „Afmerkja" á ÞjónustuVerkstæðinu
 * setur `sv_force_unstarted`, en Fjármála-yfirlitið vissi ekki af því skilyrði og
 * taldi 270.710 kr sem borðið sýndi ekki. Það var ekki villa í einu eintaki —
 * það var afleiðing þess að eintökin voru mörg. Næsta skilyrði mun alltaf
 * gleymast í a.m.k. einu þeirra.
 *
 * ÞESS VEGNA MÆLIR ÞESSI VÖRÐUR KÓÐANN, EKKI BARA TÖLUNA. Gagnamæling ein og sér
 * getur ekki varið þetta: eftir lagfæringuna lesa allir sama fallið og talan verður
 * eðlilega sú sama — og hún yrði ÁFRAM sú sama daginn sem einhver afritar regluna
 * aftur inn í eina skrá, þangað til skilyrðin fara að skilja. Vörðurinn festir því
 * leiðina: 476 er eini staðurinn sem hugsar, hinir fjórir spyrja hann.
 *
 * HVAÐ ER PRÓFAÐ
 *   1. 476 er til og ber regluna í einu falli (`er` → `astaedur`).
 *   2. 153 · 165 · 190 · 304 kalla ÖLL `IVinnslu.er` — enginn þeirra reiknar sjálfur.
 *   3. Enginn þeirra ber eftir sig heila regluna (flagg + afmerkt/drög) utan varaleiðar.
 *   4. Allar þrjár leiðirnar ÚR vinnslu spyrja `spyrjaAdurEnTekidAf` fyrst.
 *   5. Efri hluti 190 telur óhreyft þýði — flísarnar og strimillinn geta ekki
 *      sagt sitt hvað um sama hlutinn (Agnar sama dag: „þetta ætti því að stemma").
 *   6. GÖGNIN: fjöldinn reiknaður úr Supabase með reglunni, og hann er birtur.
 *      Ein tala, nafngreind — svo drift sjáist í stað þess að hverfa.
 *
 * Keyrsla:  node tools/audit-i-vinnslu.cjs
 * Read-only. Notar publishable-lykilinn úr js/config.js (RLS).
 */
const fs = require('fs');
const path = require('path');

const rot = path.join(__dirname, '..');
const cfg = fs.readFileSync(path.join(rot, 'js/config.js'), 'utf8');
const URL_ = (cfg.match(/SUPABASE_URL\s*=\s*["']([^"']+)/) || [])[1];
const KEY = (cfg.match(/SUPABASE_KEY\s*=\s*["']([^"']+)/) || [])[1];
const H = { apikey: KEY, Authorization: 'Bearer ' + KEY };

const brot = [];
function krefja(satt, skilabod) { if (!satt) brot.push(skilabod); }
function lesa(p) { return fs.readFileSync(path.join(rot, p), 'utf8'); }

async function sb(slod) {
  const r = await fetch(URL_ + '/rest/v1/' + slod, { headers: H });
  if (!r.ok) throw new Error(slod.slice(0, 70) + ' -> ' + r.status);
  return r.json();
}

// ── 1. Kjarninn ────────────────────────────────────────────────────────────
const kjarni = lesa('js/patches/476-i-vinnslu-kjarni.js');
krefja(/window\.IVinnslu\s*=/.test(kjarni),
  '476: window.IVinnslu er ekki flutt út — enginn getur lesið regluna.');
krefja(/function astaedur\(coId\)/.test(kjarni),
  '476: `astaedur` er farin. Hún er reglan sjálf OG upptalningin í viðvöruninni; '
+ 'án hennar getur viðvörunin ekki sagt hvað heldur félaginu opnu.');
krefja(/function er\(coId\)\s*\{\s*return astaedur\(coId\)\.length > 0/.test(kjarni),
  '476: `er` reiknar ekki lengur út frá `astaedur`. Þá eru merkið og viðvörunin '
+ 'orðin tvær reglur aftur — nákvæmlega það sem þessi vörður á að hindra.');
krefja(/sv_force_unstarted/.test(kjarni) && /SavedReports/.test(kjarni) && /loaned/.test(kjarni),
  '476: eitt af þremur skilyrðum reglunnar (afmerkt · drög · tæki á verkstæði) '
+ 'er horfið úr kjarnanum.');
/* Vörnin gegn tómu svari er MANNVIRKI, ekki athugasemd: `_verkst` má aðeins
 * taka gildi eftir að sóknin heppnaðist. Hefði catch-greinin sett tómt kort
 * myndi HVERT félag segja „0 á verkstæði" eftir eina netvillu og vísirinn
 * slokkna á röngum forsendum. Prófað á kóðanum sjálfum — orðalag í athugasemd
 * er engin trygging (fyrsta útgáfa þessa varðar leitaði að texta og féll á
 * línuskiptingu, sem sannar punktinn). */
{
  const fin = kjarni.indexOf('} finally {');
  const cat = fin > 0 ? kjarni.lastIndexOf('} catch (_) {', fin) : -1;
  const c = cat > 0 ? [null, kjarni.slice(cat, fin)] : null;
  krefja(c && !/_verkst\s*=/.test(c[1]),
    '476: catch-greinin í `hlada` setur `_verkst`. Sóknarvilla má ALDREI framleiða '
  + 'tómt kort — þá segir hvert einasta félag „0 á verkstæði" og vísirinn slokknar '
  + 'á röngum forsendum. Láttu hana skilja fyrra gildið eftir.');
  krefja(/_verkst = m; _sottAt = Date\.now\(\);/.test(kjarni),
    '476: `_verkst` er ekki lengur sett á EINUM stað eftir heppnaða sókn.');
}

// ── 2. + 3. Lesendurnir fjórir ─────────────────────────────────────────────
const LESENDUR = [
  ['js/patches/153-arsskodun.js', '153 (Ársskoðun — sían og flagan)'],
  ['js/patches/165-visit-workflow.js', '165 (takkinn á fyrirtækjaprófílnum)'],
  ['js/patches/190-thjonustu-verkstaedi.js', '190 (ÞjónustuVerkstæðisborðið)'],
  ['js/patches/304-fjarmal-live.js', '304 (Skýrslur í vinnslu á Fjármála-yfirlitinu)']
];
for (const [p, heiti] of LESENDUR) {
  const t = lesa(p);
  krefja(/IVinnslu\.er/.test(t),
    heiti + ': kallar ekki IVinnslu.er — reiknar því sína eigin „í vinnslu"-reglu. '
  + 'Fjögur eintök af reglunni var upphaflega vandamálið.');
}

/* Eigin regla utan varaleiðar: flagg OG (afmerkt EÐA drög) í sömu skrá er
 * undirskrift heils eintaks. Varaleiðirnar mega standa — þær eru merktar og
 * keyra aðeins finnist 476 ekki — svo talið er hversu oft mynstrið kemur fyrir.
 * Fleiri en ein umferð þýðir að einhver hefur afritað regluna aftur inn. */
for (const [p, heiti] of LESENDUR) {
  const t = lesa(p);
  const flagg = (t.match(/field_inspected_year\D{0,24}===?\s*curYear|===?\s*curYear\D{0,24}field_inspected_year|\+e\.field_inspected_year === ar/g) || []).length;
  const hamark = p.indexOf('190-') >= 0 ? 6 : 4;
  krefja(flagg <= hamark,
    heiti + ': „field_inspected_year === curYear" kemur fyrir ' + flagg + ' sinnum '
  + '(þak ' + hamark + '). Það bendir til þess að reglan hafi verið afrituð inn aftur '
  + '— láttu skrána spyrja IVinnslu.er í staðinn.');
}

// ── 4. Leiðirnar ÚR vinnslu spyrja allar ───────────────────────────────────
const UT = [
  ['js/patches/153-arsskodun.js', '153 — hakið „☐ Í vinnslu" í töflunni'],
  ['js/patches/165-visit-workflow.js', '165 — „Í vinnslu"-takkinn á prófílnum'],
  ['js/patches/190-thjonustu-verkstaedi.js', '190 — „✕ Afmerkja" á borðinu']
];
for (const [p, heiti] of UT) {
  krefja(/IVinnslu\.spyrjaAdurEnTekidAf/.test(lesa(p)),
    heiti + ': tekur félag úr vinnslu ÁN þess að spyrja fyrst. Þá hverfur merkið '
  + 'meðan tækin standa enn á verkstæðinu og enginn fær að vita af því.');
}
krefja(/sottFyrirFelag/.test(lesa('js/patches/269-verkstaedi-loaned.js')),
  '269: `sottFyrirFelag` er farin — viðvörunin getur þá ekki merkt tækin sótt, '
+ 'og þá er hún bara kvörtun án útgönguleiðar.');
krefja(/await loadShop\(true\);\s*[\r\n]+\s*const minir/.test(lesa('js/patches/269-verkstaedi-loaned.js')),
  '269: `sottFyrirFelag` sækir ekki borðið fyrst. `close` les fyrra ástand tækisins '
+ 'úr _shop; sé það ósótt verður afhendingin ÓAFTURKALLANLEG (sjá örið frá 12.10.2026).');

/* ── 4b. Eini leyfilegi munurinn á tölunum er SAGÐUR ───────────────────────
 * MÆLT 21.10.2026: flagan sagði 31 og borðið 32 þótt reglan væri sú sama.
 * Munurinn var eitt FALIÐ félag (🕶) — Ársskoðun felur þau úr öllum sýnum nema
 * sinni eigin, og það á að standa. En ósýnilegur munur er einmitt það sem lét
 * Agnar hætta að treysta tölunum, svo hann verður að vera talinn og sagður.
 * Hyrfi sú skýring myndu tölurnar aftur líta út eins og þær stemmi ekki. */
krefja(/const ivinnsluFalid =/.test(lesa('js/patches/153-arsskodun.js')),
  '153: faldir í vinnslu eru ekki lengur taldir (ivinnsluFalid). Þá er munurinn '
+ 'milli flögunnar og ÞjónustuVerkstæðisins orðinn óútskýrður aftur.');
krefja(/ÞjónustuVerkstæðið telur þau með/.test(lesa('js/patches/153-arsskodun.js')),
  '153: titill flögunnar segir ekki lengur hvað talan á borðinu er. Munur sem er '
+ 'ekki sagður er ósamræmi í augum þess sem les.');

// ── 5. Efri hluti 190 telur óhreyft þýði ───────────────────────────────────
const b190 = lesa('js/patches/190-thjonustu-verkstaedi.js');
krefja(/const vn = _vinnslaRaw\.length/.test(b190),
  '190: stóra talan í hausnum er aftur farin að telja síaða listann. Þá segir '
+ 'gull-spjaldið eitt og strimillinn beint fyrir neðan annað um sama hlutinn.');
krefja(/const vCnt = k => _vinnslaRaw\.filter/.test(b190),
  '190: „Skýrsla eftir" / „Reikn. eftir" telja ekki sama þýði og strimillinn.');
krefja(/const vSiad = b\.vinnsla\.length/.test(b190),
  '190: niðurstaða síunnar á sinn eigin stað („N af M"). Hverfi hún er sían orðin ósýnileg.');

// ── 6. Gögnin ──────────────────────────────────────────────────────────────
(async function () {
  const ar = new Date().getFullYear();
  let talning = null;
  try {
    const stillingar = await sb('app_settings?select=settings&limit=1');
    const s = (stillingar && stillingar[0] && stillingar[0].settings) || {};
    const ars = s.arsskodun_customers || {};
    const ferdir = s.inspection_trips || {};
    const felog = await sb('fyrirtaeki?select=id&deleted_at=is.null&er_i_thjonustu=not.eq.false&limit=5000');
    const laun = await sb('uttaeki?select=fyrirtaeki_id&status=eq.loaned&fyrirtaeki_id=not.is.null&limit=5000');
    const verkst = new Map();
    laun.forEach(u => { const k = String(u.fyrirtaeki_id); verkst.set(k, (verkst.get(k) || 0) + 1); });

    /* Eftirlíking af reglunni. MÆLT 21.10.2026: fyrsta útgáfan hér sleppti
     * `finished`-prófi 228 og taldi 236 „óklárað drög" þar sem vafrinn taldi 18 —
     * KLÁRAÐAR ferðir sitja áfram í `inspection_trips` og eru ekki drög. Sama
     * gildra og vörðurinn sjálfur er til að verja: tvö eintök af reglu reka í
     * sundur. Þess vegna er talan hér borin saman við vafrann þegar hún er lesin,
     * ekki treyst blint. */
    const innihald = t => {
      if (!t || typeof t !== 'object') return false;
      const n = (t.units && typeof t.units === 'object') ? Object.keys(t.units).length : 0;
      return !!(n > 0 || (t.notes || '').trim() || (t.skodunaradili || '').trim() ||
        (t.skodun_manudur || '').trim() || (t.skodun_dagsetning || '').trim() ||
        (t.invoice_text || '').trim() || (t.athugasemdir_skyrsla || '').trim() ||
        (Array.isArray(t.extras) ? t.extras.length : 0) > 0 || (+t.discount_pct > 0));
    };
    /* DRÖGIN ERU VÍSVITANDI EKKI TALIN HÉR. Til að vita hvort vistuð ferð sé drög
     * eða kláruð þarf `finished` (228) og þar með `VisitYearLock.isComplete`, sem
     * les skýrslu-sannanir og viðhengi félagsins (271). Að endurrita þá keðju hér
     * væri ANNAÐ EINTAK af reglu — nákvæmlega það sem þessi vörður bannar, og
     * eintakið myndi reka í sundur eins og hin gerðu. Fyrsta útgáfa þessa varðar
     * gerði einmitt það og sagði 236 drög þar sem appið taldi 18.
     *
     * Hér er því talið NÁKVÆMLEGA það sem gögnin ein geta svarað: úttekt hafin og
     * tæki á verkstæði. Það er neðri mörk, og það er sagt sem slíkt. Appið bætir
     * drögunum við — og af því að allir fjórir staðir lesa sama fallið (festað hér
     * að ofan) geta þeir ekki sagt sitt hvað um þau heldur. */
    let nFlagg = 0, nVerkst = 0, n = 0;
    felog.forEach(f => {
      const k = String(f.id);
      const a = ars[k] || {};
      if (a.sv_force_unstarted) return;
      // Flaggið eitt gildir aðeins meðan árinu er ÓLOKIÐ (266 skilur það eftir
      // sem leifar); verkstæðið gengur framar lokuðu ári.
      const fl = +a.field_inspected_year === ar && +a.last_year_inspected !== ar;
      const vk = (verkst.get(k) || 0) > 0;
      if (fl) nFlagg++; if (vk) nVerkst++;
      if (fl || vk) n++;
    });
    const nDrog = null;
    talning = { n, nFlagg, nVerkst, nDrog, felog: felog.length };
  } catch (e) {
    // Mæling sem náðist ekki er EKKI græn staðreynd og ekki heldur rauð villa í
    // kóðanum — hún er sögð eins og hún er og kóða-leggurinn stendur einn.
    console.log('   (gagnamæling náðist ekki: ' + String((e && e.message) || e).slice(0, 80) + ')');
  }

  if (talning) {
    console.log('   Í vinnslu úr gögnunum: a.m.k. ' + talning.n + ' félög af ' + talning.felog
      + ' í þjónustu  (úttekt hafin ' + talning.nFlagg + ' · tæki á verkstæði ' + talning.nVerkst + ')');
    console.log('   Óklárað drög eru EKKI talin hér — sjá skýringu í kóðanum. Talan á skjánum');
    console.log('   er því hærri, og SÚ tala á að vera sú sama á öllum þremur stöðunum:');
    console.log('   🔧 Í vinnslu í Ársskoðun · bláa spjaldið á ÞjónustuVerkstæði · Skýrslur í vinnslu.');
  }

  if (brot.length) {
    console.log('RED: ' + brot.length + ' brot á „ein regla um í vinnslu":');
    brot.forEach(b => console.log('   • ' + b));
    process.exit(1);
  }
  console.log('✅ GRÆNT í-vinnslu: ein regla (476), fjórir lesendur spyrja hana, '
    + 'þrjár útgönguleiðir vara við og 190 telur eitt þýði.');
})();
