#!/usr/bin/env node
/* LES ÚTTEKTARSKÝRSLUR ÚR DRIVE — tækjatala per tegund, ár og mánuður.
 *
 * Systurtól `tools/lesa-reikninga-drive.cjs`. Saman loka þau tríóinu: skýrslan
 * (tæknimaðurinn á staðnum), reikningurinn (afgreiðslan) og prófíllinn (skráin).
 *
 * SNIÐIÐ er fast og vélritað — staðfest á Kirkjuvöllum 2024:
 *
 *   Skýrsla vegna úttektar á brunaslöngum, slökkvitækjum … hjá
 *   fyrirtækinu Kirkjuvellir 9 221 Hafnarfirði. Kt 551007-1890
 *   Tæki voru yfirfarin af Slökkvitæki ehf í nóvember 2024
 *   Slökkvitæki léttvatn 6-9 ltr. Fjöldi: 19 Í lagi: já
 *   Slökkvitæki duft 2 kg.        Fjöldi: x  Í lagi: x
 *   Brunaslöngur                  Fjöldi: 2  Í lagi: já
 *
 * ÞRENNT SEM ÞARF AÐ VARAST:
 *   1. „x" í Fjöldi þýðir EKKERT TIL STAÐAR — það er núll, ekki vantandi gildi.
 *      Sé því ruglað saman verður tækjatalan of há eða röðin fellur út.
 *   2. `CO₂` brotnar yfir línur í PDF-textanum („Co" / „2" / „2 kg.") af því
 *      niðurskrifaða tvistið er sérstakur textahnútur. Línulesari sem gerir ráð
 *      fyrir einni línu per tegund missir báðar CO2-tegundirnar.
 *   3. Ártalið í skráarheitinu er ekki treystandi (sama gildra og á
 *      reikningunum); mánuður OG ár eru lesin úr textanum sjálfum.
 *
 * Lyklarnir eru þeir sömu og `arsskodun_report_facts.equipment` notar, svo
 * úttakið fellur beint að töflunni.
 *
 * SKRIFAR EKKERT. JSON á stdout (pdf-parse skrifar viðvaranir á undan — klipptu
 * frá fyrsta '[').
 *
 *   node tools/lesa-skyrslur-drive.cjs <skrar.json> [--takmarka N]
 */
const fs = require('fs');
const pdf = require('pdf-parse');

const SKJAL = 'https://brunaholf.netlify.app/api/skjal?id=';

const MANUDIR = ['janúar', 'febrúar', 'mars', 'apríl', 'maí', 'júní',
                 'júlí', 'ágúst', 'september', 'október', 'nóvember', 'desember'];

/* Tegundirnar í þeirri röð sem þær standa í skýrslunni. Mynstrin eru viljandi
   laus í endann — „Slökkvitæki léttvatn 6-9 ltr." og „Léttvatn 6 ltr." eiga
   bæði að hitta. CO2 fær sérmeðferð vegna línubrotsins. */
const TEGUNDIR = [
  ['lettvatn',       /l[ée]ttvatn/i],
  ['duft2',          /duft\s*2\s*kg/i],
  ['duft6_12',       /duft\s*6\s*-?\s*12\s*kg/i],
  ['co2_2',          /co\s*2?\s*2\s*kg/i],
  ['co2_5',          /co\s*2?\s*5\s*kg/i],
  ['brunaslongur',   /brunasl[öo]ng/i],
  ['eldvarnarteppi', /eldvarnarteppi/i],
  ['reykskynjarar',  /reykskynjar/i],
];

function lesaSkyrslu(texti) {
  // Fella niðurskrifaða tvistið inn í línuna á undan svo „Co\n2\n 5 kg." verði
  // ein lesanleg lína. Án þessa detta báðar CO2-tegundirnar út.
  const flatt = texti.replace(/Co\s*\n\s*2\s*\n?/gi, 'Co2 ').replace(/[ \t]+/g, ' ');
  const linur = flatt.split('\n').map(s => s.trim()).filter(Boolean);

  /* KENNITALAN: bréfhaus skýrslunnar ber kennitölu SLÖKKVITÆKIS SJÁLFS
     (600508-0400, „Helluhrauni 10 … kt. 600508-0400") og hún stendur FREMST.
     Fyrsta hittið er því alltaf rangt — allar skýrslur mældust á félagið sjálft
     í fyrstu prufu. Kennitala kúnnans kemur á eftir „hjá fyrirtækinu <nafn>. Kt".
     Leitað er að henni fyrst; annars fyrsta kennitölu sem er EKKI okkar eigin. */
  const OKKAR_KT = '6005080400';
  let kt = (flatt.match(/fyrirt[æa]kinu[^\n]{0,120}?Kt\.?\s*(\d{6}-?\d{4})/i) || [])[1] || null;
  if (!kt) {
    const oll = flatt.match(/\b\d{6}-?\d{4}\b/g) || [];
    kt = oll.map(x => x.replace('-', '')).find(x => x !== OKKAR_KT) || null;
  }
  if (kt) { const d = kt.replace('-', ''); kt = d.length === 10 ? d.slice(0, 6) + '-' + d.slice(6) : kt; }

  let ar = null, manudur = null;
  const m = flatt.match(/yfirfarin af Sl[öo]kkvit[æa]ki ehf\s+í\s+([a-záéíóúýþæðö]+)\s+(\d{4})/i);
  if (m) {
    manudur = MANUDIR.findIndex(x => x === m[1].toLowerCase()) + 1 || null;
    ar = +m[2];
  } else {
    const m2 = flatt.match(/yfirfarin[^\n]{0,40}?(\d{4})/i);
    if (m2) ar = +m2[1];
  }

  /* Hver tegundarlína ber „Fjöldi: <tala|x>". Talan er lesin af SÖMU línu og
     tegundarheitið — ekki leitað víðar, því annars gleypir ein tegund töluna
     frá þeirri næstu þegar lína vantar. */
  const bunadur = {};
  TEGUNDIR.forEach(([lykill]) => { bunadur[lykill] = 0; });
  let fannstEinhver = false;

  linur.forEach(lina => {
    const f = lina.match(/Fj[öo]ldi:\s*(\d+|x|X)/);
    if (!f) return;
    const gildi = /^[xX]$/.test(f[1]) ? 0 : +f[1];
    for (const [lykill, mynstur] of TEGUNDIR) {
      if (mynstur.test(lina)) {
        bunadur[lykill] += gildi;
        fannstEinhver = true;
        break;                                   // fyrsta hittið ræður
      }
    }
  });

  const total = Object.values(bunadur).reduce((a, b) => a + b, 0);
  const annad = (flatt.match(/Anna[ðd]:\s*([^\n]{0,400})/i) || [])[1] || null;
  const athugasemdir = (flatt.match(/Athugasemdir:\s*([^\n]{0,400})/i) || [])[1] || null;

  return {
    kt, ar, manudur,
    equipment: bunadur,
    total_devices: total,
    fann_taekjalinur: fannstEinhver,
    annad: annad && annad.trim() ? annad.trim() : null,
    athugasemdir: athugasemdir && athugasemdir.trim() ? athugasemdir.trim() : null,
  };
}

(async () => {
  const skraPath = process.argv[2];
  const takIdx = process.argv.indexOf('--takmarka');
  const tak = takIdx > 0 ? +process.argv[takIdx + 1] : Infinity;
  if (!skraPath) { console.error('Notkun: node tools/lesa-skyrslur-drive.cjs <skrar.json> [--takmarka N]'); process.exit(1); }

  const allar = JSON.parse(fs.readFileSync(skraPath, 'utf8'));
  // tmp-ocr-skrárnar eru vinnuafurð OCR-tilrauna og bera enga skýrslu.
  const skyrslur = allar.filter(f => !/^tmp-ocr-/i.test(f.title || '')).slice(0, tak);

  const ut = [];
  for (const f of skyrslur) {
    try {
      const r = await fetch(SKJAL + encodeURIComponent(f.id));
      if (!r.ok) { ut.push({ id: f.id, title: f.title, villa: 'HTTP ' + r.status }); continue; }
      const buf = Buffer.from(await r.arrayBuffer());
      const p = await pdf(buf);
      const les = lesaSkyrslu(p.text);
      /* Sumar skýrslur (t.d. Ölfusborgir) bera enga kennitölu í textanum.
         Skráarheitið ber hana þá — og ólíkt DAGSETNINGUNNI, sem lýgur, er
         kennitalan í heitinu áreiðanleg. Merkt svo það sjáist hvaðan hún kom. */
      if (!les.kt) {
        const uh = (f.title || '').match(/(\d{6}-\d{4})/);
        if (uh) { les.kt = uh[1]; les.kt_ur_heiti = true; }
      }
      ut.push(Object.assign({ id: f.id, title: f.title }, les));
    } catch (e) {
      ut.push({ id: f.id, title: f.title, villa: String((e && e.message) || e).slice(0, 140) });
    }
  }
  process.stdout.write(JSON.stringify(ut, null, 1));
})();
