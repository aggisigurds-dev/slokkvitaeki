#!/usr/bin/env node
/* VÖRÐUR — stefna mælis ræður áttinni, ekki formerkið eitt.
 *
 * VILLAN sem þetta ver gegn var mín eigin, 01.09.2026. `saga()` var skrifað
 * með athugasemdinni „öll þessi tala er vandamál: hækkun = verra". Það var
 * satt um mælana 50 sem þessi skrá reiknar sjálf — en RANGT um 8 sem koma úr
 * Veiðinni í Brunahólfi:
 *
 *   veidin_stadir_med_2026_skyrslu   298   fjölgun er ÞEKJA, ekki afturför
 *   veidin_bundle_por                109   kláruð pör, fleiri = betra
 *   veidin_felog_med_netfang         404   fleiri netföng = betra
 *
 * Hefði það staðið hefði viðvörunin blikkað RAUTT þegar skýrslum fjölgaði —
 * þ.e. hrópað á framförum. Viðvörun sem gerir það er verri en engin viðvörun,
 * því hún kennir manni að hunsa hana.
 *
 * ÞESSI VÖRÐUR keyrir raunverulega rökfræðina úr ai-context.js (`saga` er flutt
 * út þess vegna) á tilbúnum mælipunktum og staðfestir að áttin snúist rétt í
 * öllum þremur tilvikum. Hann prófar hegðun, ekki texta.
 */
const path = require('path');
const url = require('url');

const skra = path.join(__dirname, '..', 'netlify', 'functions', 'ai-context.js');

const TILVIK = [
  // [mælir, stefna sem búist er við, fyrir, eftir, vænt átt]
  ['i_thjonustu_an_taekja',          'laegra_betra', 260, 275, 'VERRI'],
  ['i_thjonustu_an_taekja',          'laegra_betra', 260, 240, 'betri'],
  ['veidin_stadir_med_2026_skyrslu', 'haerra_betra', 298, 310, 'betri'],
  ['veidin_stadir_med_2026_skyrslu', 'haerra_betra', 298, 280, 'VERRI'],
  ['veidin_stadir_i_thjonustu',      'hlutlaus',     651, 700, 'hlutlaus'],
  ['veidin_stadir_i_thjonustu',      'hlutlaus',     651, 600, 'hlutlaus'],
  ['veidin_bundle_por',              'haerra_betra', 109, 140, 'betri'],
  ['thar_af_fyllanleg_ur_reikningi', 'hlutlaus',      56,  90, 'hlutlaus'],
];

(async () => {
  const mod = await import(url.pathToFileURL(skra).href);
  if (typeof mod.saga !== 'function') {
    console.log('❌ `saga` er ekki flutt út úr netlify/functions/ai-context.js.');
    console.log('   Án þess er ekki hægt að prófa átt-rökfræðina og vörðurinn er blindur.');
    process.exit(1);
  }

  const fails = [];
  for (const [maelir, staefnaVaent, fyrir, eftir, attVaent] of TILVIK) {
    const log = {
      maelingar: [
        { dags: '2026-08-30T09:00:00.000Z', tolur: { [maelir]: fyrir } },
        { dags: '2026-08-31T09:00:00.000Z', tolur: { [maelir]: eftir } },
      ],
      faerslur: [],
    };
    const h = mod.saga(log).hreyfing.find(x => x.maelikvardi === maelir);
    if (!h) { fails.push(`${maelir}: engin hreyfing skilað`); continue; }
    if (h.stefna !== staefnaVaent) {
      fails.push(`${maelir}: stefna "${h.stefna}", vænt "${staefnaVaent}"`);
    }
    if (h.att !== attVaent) {
      fails.push(`${maelir} ${fyrir}→${eftir}: átt "${h.att}", vænt "${attVaent}"`
        + (attVaent === 'betri' && h.att === 'VERRI'
            ? '  ← viðvörun myndi hrópa á FRAMFÖRUM' : ''));
    }
  }

  // Hlutlausir mælar mega aldrei rata í viðvörunarlistann, í hvora áttina sem er.
  const log2 = {
    maelingar: [
      { dags: '2026-08-30T09:00:00.000Z', tolur: { veidin_stadir_i_thjonustu: 651, veidin_bundle_por: 109 } },
      { dags: '2026-08-31T09:00:00.000Z', tolur: { veidin_stadir_i_thjonustu: 700, veidin_bundle_por: 140 } },
    ],
    faerslur: [],
  };
  const vidv = mod.saga(log2).vidvorun.map(v => v.maelikvardi);
  if (vidv.length) fails.push(`viðvörun kviknaði á hlutlausum/batnandi mælum: ${vidv.join(', ')}`);

  if (fails.length) {
    console.log('❌ Stefnu-rökfræðin BROTIN\n');
    fails.forEach(f => console.log('  • ' + f));
    process.exit(1);
  }
  console.log(`✅ Stefna heldur — ${TILVIK.length} tilvik, báðar áttir, hlutlausir þegja.`);
  process.exit(0);
})().catch(e => {
  console.log('❌ Vörðurinn keyrði ekki: ' + e.message);
  process.exit(1);
});
