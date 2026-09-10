#!/usr/bin/env node
'use strict';
/* AUÐKENNI VANTAR — nýjar sölur og nýjar kennitöluskráningar verða að fá tengingu.
 *
 * Af hverju þessi vörður er til (09.09.2026): Agnar sagði „stofna viðskiptavin og
 * sölu, stundum stofnast þá ekki ID svo ég get ekki sent kröfu". Fyrsta mæling
 * sýndi hreint borð — en aðeins af því hann hafði setið daginn áður og HANDFYLLT
 * auðkenni á 396 af 803 sölum. Kerfið var ekki í lagi; manneskja hafði þrifið eftir því.
 *
 * Þegar grafið var dýpra fannst rótin, og hún er lifandi:
 *   fyrirtaeki      69 nýjar á 30 dögum →  0 án customer_base_id  ✅
 *   vidskiptavinir  48 nýjar á 30 dögum → 47 án customer_base_id  🔴
 *
 * Báðar POS-leiðirnar stofna viðskiptavin án tengingar við customers_base:
 *   js/pos.js:1477                      insert({nafn, kennitala, simi})
 *   js/patches/114-unified-pos-search.js:348  insert({nafn, kennitala, simi, netfang, heimilisfang})
 * og pos.js setur svo solur.customer_id á þann munaðarlausa lykil en aldrei
 * solur.customer_base_id — lykilinn sem rukkunin þarf.
 *
 * ENGIN GRUNNLÍNA — VILJANDI.
 * Aðrir verðir hér frysta gamlar bilaðar raðir sem grunnlínu og falla aðeins ef
 * talan hækkar. Það er lögmætt fyrir gamlar skuldir. Hér gengur það ekki: þetta
 * er ekki gömul skuld heldur verksmiðja sem framleiðir nýjar. Glugginn er stuttur
 * og krafan er NÚLL.
 *
 * ATH um grænt: sala sem var handlagfærð eftir á lítur eins út og sala sem varð
 * til rétt. Þess vegna telur vörðurinn sérstaklega þær sem hafa ALDREI verið
 * snertar síðan þær urðu til — það er eina talan sem sannar að kerfið virki sjálft.
 *
 * Keyrsla:  node tools/audit-solu-id.cjs
 * Read-only. Notar publishable-lykilinn úr js/config.js (RLS).
 */
const fs = require('fs');
const path = require('path');

const GLUGGI = 14;               // dagar aftur í tímann sem eru varðir
const rot = path.join(__dirname, '..');
const cfg = fs.readFileSync(path.join(rot, 'js/config.js'), 'utf8');
const URL_ = (cfg.match(/SUPABASE_URL\s*=\s*["']([^"']+)/) || [])[1];
const KEY = (cfg.match(/SUPABASE_KEY\s*=\s*["']([^"']+)/) || [])[1];
const H = { apikey: KEY, Authorization: 'Bearer ' + KEY };

const villur = [];
function fail(msg) { console.log('RED: ' + msg); process.exit(1); }

async function sb(slod) {
  const r = await fetch(URL_ + '/rest/v1/' + slod, { headers: H });
  if (!r.ok) throw new Error(slod.slice(0, 70) + ' -> ' + r.status);
  return r.json();
}

(async () => {
  const fra = new Date(Date.now() - GLUGGI * 864e5).toISOString().slice(0, 10);

  // ---- 1. Sölur -----------------------------------------------------------
  const solur = await sb(
    'solur?select=num,status,samtals,customer_nafn,customer_id,customer_base_id,' +
    'krafa_sent_at,created_at,updated_at&created_at=gte.' + fra + '&order=created_at.desc'
  );

  const orukkanlegar = solur.filter(s =>
    ['final', 'sott'].includes(s.status) && Number(s.samtals) > 0 &&
    !s.krafa_sent_at && s.customer_base_id == null);

  const soluAnAudkennis = solur.filter(s => s.customer_id == null || s.customer_base_id == null);

  if (orukkanlegar.length) {
    orukkanlegar.slice(0, 8).forEach(s =>
      console.log(`   ${s.num}  ${s.samtals} kr  ${s.customer_nafn || '(nafnlaus)'}  — ekkert customer_base_id`));
    villur.push(`${orukkanlegar.length} sala/sölur síðustu ${GLUGGI} daga er EKKI HÆGT AÐ RUKKA (vantar customer_base_id)`);
  } else if (soluAnAudkennis.length) {
    soluAnAudkennis.slice(0, 8).forEach(s =>
      console.log(`   ${s.num}  ${s.customer_nafn || '(nafnlaus)'}  ` +
        `${s.customer_id == null ? 'customer_id VANTAR ' : ''}` +
        `${s.customer_base_id == null ? 'customer_base_id VANTAR' : ''}`));
    villur.push(`${soluAnAudkennis.length} af ${solur.length} sölum síðustu ${GLUGGI} daga vantar auðkenni`);
  }

  // Handlagfærðar sölur líta út eins og heilbrigðar. Aðgreinum þær.
  const oskertar = solur.filter(s =>
    !s.updated_at || (new Date(s.updated_at) - new Date(s.created_at)) < 2 * 36e5).length;

  // ---- 2. Nýjar kennitöluskráningar ---------------------------------------
  // Regla Agnars 09.09.2026: „allar nýjar kennitöluskráningar eiga að fá id."
  //
  // Lausasala án kennitölu ("Staðgreitt", "Tóti") er UNDANSKILIN viljandi:
  // customers_base er lyklað á kennitölu, svo rót án kt væri merkingarlaus.
  // Vörður sem er rauður að ósekju endar þaggaður — og þöggun er sjúkdómurinn
  // sem þessi vörður á að lækna. Reglan bítur því aðeins þegar kt er til.
  const meKt = r => r.kennitala && String(r.kennitala).replace(/\D/g, '').length === 10;

  for (const tafla of ['fyrirtaeki', 'vidskiptavinir']) {
    const allarNyjar = await sb(
      tafla + '?select=id,nafn,kennitala,customer_base_id,created_at&created_at=gte.' +
      fra + '&order=created_at.desc'
    );
    const nyjar = allarNyjar.filter(meKt);
    const munadarlaus = nyjar.filter(r => r.customer_base_id == null);
    if (munadarlaus.length) {
      munadarlaus.slice(0, 6).forEach(r =>
        console.log(`   ${tafla}: ${r.nafn || '(nafnlaus)'} ${r.kennitala || '(engin kt)'} — ekkert customer_base_id`));
      villur.push(`${munadarlaus.length} af ${nyjar.length} nýjum í \`${tafla}\` eru munaðarlausar ` +
        '(engin tenging við customers_base)');
    }
  }

  // ---- 3. RANGT auðkenni er verra en ekkert -------------------------------
  // 10.09.2026. Vörðurinn hér að ofan finnur sölur sem VANTAR base_id. Í dag kom
  // í ljós verri villa: sölur sem BERA base_id — rangs greiðanda. Fimm fundust
  // (162.901 kr + 40.500), t.d. „Norður Travel Services ehf" sem hékk á Stálorku.
  // Krafa á þær hefði farið á rangan aðila. Vörðurinn hér að ofan kallaði þær
  // grænar af því reiturinn var ekki tómur.
  //
  // RÓTIN: solur.customer_id er lesið sem fyrirtaeki.id (svo gerir triggerinn
  // solur_fill_base_id, skref 1), en 114-unified-pos-search gat sett þar
  // vidskiptavinir.id — og 321 id-númer eru til í BÁÐUM töflum. Röng tafla gefur
  // þá base_id ALLT ANNARS kúnna. Kóðahliðin var lagfærð sama dag (361a00d).
  //
  // AF HVERJU ÞESSI VÖRÐUR MÆLIR ÁREKSTURINN EN EKKI BARA KT-MISRÆMI:
  // greiðandi er ekki alltaf sá sem verkið var unnið fyrir. Rekstrarfélag borgar
  // fyrir húsfélag; „Herbergjaleiga (2h.BJB)" er BJB sem greiðandi. Vörður sem
  // flaggaði hvert kt-misræmi yrði rauður á löglegu mynstri — og rauður vörður
  // sem lýgur verður þaggaður. Þess vegna er skilyrðið ÞRENNT og lýsir árekstri
  // sem getur aldrei verið viljandi:
  //   (a) customer_id finnst í vidskiptavinir MEÐ kennitölu sölunnar, OG
  //   (b) sama id finnst í fyrirtaeki með ANNARRI kennitölu, OG
  //   (c) base-lykill sölunnar er sá sem FYRIRTÆKIS-röðin ber.
  // Þá kom auðkennið sannanlega úr rangri töflu. Engin grunnlína.
  const meAlvoruKt = x => x && String(x).replace(/\D/g, '').length === 10;
  const solurAllar = await sb('solur?select=num,samtals,customer_nafn,customer_kt,' +
    'customer_id,customer_base_id,created_at&customer_id=not.is.null&order=created_at.desc');
  const cids = [...new Set(solurAllar.map(s => s.customer_id))];
  const bit = (tafla, hluti) => sb(tafla + '?select=id,nafn,kennitala,customer_base_id&id=in.(' +
    hluti.join(',') + ')');
  const kort = { fyrirtaeki: new Map(), vidskiptavinir: new Map() };
  for (const tafla of ['fyrirtaeki', 'vidskiptavinir']) {
    for (let i = 0; i < cids.length; i += 200) {
      for (const r of await bit(tafla, cids.slice(i, i + 200))) kort[tafla].set(r.id, r);
    }
  }
  const hreint = x => String(x || '').replace(/\D/g, '');
  const arekstur = solurAllar.filter(s => {
    if (!meAlvoruKt(s.customer_kt) || s.customer_base_id == null) return false;
    const v = kort.vidskiptavinir.get(s.customer_id);
    const f = kort.fyrirtaeki.get(s.customer_id);
    if (!v || !f || !meAlvoruKt(v.kennitala) || !meAlvoruKt(f.kennitala)) return false;
    return hreint(v.kennitala) === hreint(s.customer_kt) &&
           hreint(f.kennitala) !== hreint(s.customer_kt) &&
           s.customer_base_id === f.customer_base_id;
  });
  if (arekstur.length) {
    arekstur.slice(0, 8).forEach(s => {
      const f = kort.fyrirtaeki.get(s.customer_id);
      console.log(`   ${s.num}  ${s.samtals} kr  „${s.customer_nafn}" kt ${s.customer_kt}` +
        `  -> base ${s.customer_base_id} kom frá fyrirtaeki #${s.customer_id} „${f.nafn}" kt ${f.kennitala}`);
    });
    villur.push(`${arekstur.length} sala/sölur bera auðkenni RANGS greiðanda ` +
      '(customer_id lesið úr rangri töflu — sjá skref 3 í haus)');
  }

  if (villur.length) {
    fail(villur.join(' · ') +
      '. Sjá js/pos.js:1477 og js/patches/114-unified-pos-search.js:348 — hvorug setur customer_base_id.');
  }

  console.log(`✅ GRÆNT auðkenni: ${solur.length} sölur (${oskertar} óskertar frá stofnun) ` +
    `og allar nýskráningar síðustu ${GLUGGI} daga bera customer_base_id.`);
})().catch(e => fail(e.message));
