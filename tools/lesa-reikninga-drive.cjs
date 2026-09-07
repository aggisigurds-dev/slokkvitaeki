#!/usr/bin/env node
/* LES REIKNINGA ÚR DRIVE — tækjatala, reikningsnúmer og tegund úr PDF-inu sjálfu.
 *
 * Agnar 07.09.2026: „ég er með hverja einustu skýrslu invoice frá 2025 til mars
 * 2026, sem ættu að matcha 100%". Til að geta mælt það þarf tækjatalan að vera
 * lesin úr reikningunum — `uttekt_reikningur_facts` bar aðeins 2025 (301 raðir)
 * og ekkert frá 2026.
 *
 * ÞRJÁR REGLUR ERFÐAR ÚR tools/setja-inn-vantandi-2025.cjs — þær kostuðu vinnu
 * að læra og eru endurteknar hér svo þær glatist ekki:
 *
 *   1. SKRÁARHEITIÐ LÝGUR. Sjö af átján „vantandi" reikningum reyndust
 *      kreditnótur sem heitið sýndi sem jákvæða upphæð, þrjár frá röngu ári.
 *      Eini lykillinn sem lýgur ekki er REIKNINGSNÚMERIÐ inni í PDF-inu.
 *   2. „Skýrslugerð og vottun" á reikningnum er það sem gerir verkið að ÚTTEKT.
 *      Reikningur án hennar er búðarsala og á ekki heima í tríó-samanburðinum.
 *   3. „Vegna"-línan ber STAÐINN hjá viðskiptavinum með marga staði. Án hennar
 *      lendir skjalið á fyrsta húsinu undir kennitölunni.
 *
 * Tækjalínur eru greindar EINS OG Í tools/trio.cjs (sama orðaforðaregla): lína
 * telst tæki ef lýsingin nefnir tegund, og gjöld/fylgihlutir detta út.
 *
 * PDF-in eru sótt gegnum /api/skjal á brunaholf (Drive-skrár eru aðgangsstýrðar;
 * bein slóð dugar ekki). Skrifar EKKERT — skilar JSON á stdout.
 *
 *   node tools/lesa-reikninga-drive.cjs <skrar.json> [--takmarka N]
 */
const fs = require('fs');
const pdf = require('pdf-parse');

const SKJAL = 'https://brunaholf.netlify.app/api/skjal?id=';

function nafnlaus(s) {
  return String(s || '').toLowerCase()
    .replace(/[áàä]/g, 'a').replace(/[éè]/g, 'e').replace(/[íì]/g, 'i')
    .replace(/[óò]/g, 'o').replace(/[úù]/g, 'u').replace(/ý/g, 'y')
    .replace(/þ/g, 'th').replace(/æ/g, 'ae').replace(/ð/g, 'd').replace(/ö/g, 'o');
}

// Sama regla og trio.cjs: gjöld og fylgihlutir eru ekki tæki, og CO2 100 gr er
// búðarvara (Agnar: „við notum aldrei CO2 100gr í úttektum").
function taekiAfLinu(lysing) {
  const t = nafnlaus(lysing);
  if (/o-?hring|udastut|limmid|skilti|rafhlod|sjukra|gjald|\b100\s*gr|akstur|skyrslugerd|vottun|slanga fyrir/.test(t)) return null;
  if (/lettv|abf|frod/.test(t)) return 'lettvatn';
  if (/duft|abc|pfc/.test(t)) return 'duft';
  if (/co2|co₂|kolsyr/.test(t)) return 'co2';
  if (/brunaslang|slongu/.test(t)) return 'brunaslongur';
  if (/reykskynj/.test(t)) return 'reykskynjarar';
  if (/teppi|eldvarn/.test(t)) return 'eldvarnarteppi';
  return null;
}

/* SNIÐIÐ (staðfest á hráum pdf-parse texta 07.09.2026): dálkarnir koma EKKI í
   lesröð. Hver vörulína birtist sem þrennt í röð —
       "Yfirferð Léttvatn 6-9 ltr."   <- lýsing
       "42,0"                          <- fjöldi
       "2.700,0133"                    <- einingaverð + vörunúmer límd saman
   Þess vegna er lesið línu fyrir línu og parað lýsing↔næsta magnlína, í stað
   þess að reyna að lesa töfluna sem eina runu. */
function lesaReikning(texti) {
  const linurTexta = texti.split('\n').map(s => s.trim()).filter(Boolean);
  const flatt = texti.replace(/\s+/g, ' ');

  // Reikningsnúmerið stendur eitt á línu (sexstafa, byrjar á 1) — merkimiðinn
  // „Raðnr.:" er í öðrum textabálki og dugar ekki til að finna gildið.
  let nr = null;
  for (const l of linurTexta) { const m = l.match(/^(1\d{5})$/); if (m) { nr = m[1]; break; } }
  let dags = null;
  for (const l of linurTexta) {
    const m = l.match(/^(\d{2})\.(\d{2})\.(\d{2})$/);
    if (m) { dags = '20' + m[3] + '-' + m[2] + '-' + m[1]; break; }
  }
  let kt = null;
  for (const l of linurTexta) { const m = l.match(/^(\d{6}-\d{4})$/); if (m) { kt = m[1]; break; } }

  const uttekt = /Sk[ýy]rslugerð og vottun/i.test(flatt);
  const kredit = /kredit/i.test(flatt) && !/kreditf[æa]r/i.test(flatt);
  const vegna = (flatt.match(/Vegna:?\s+([A-ZÁÉÍÓÚÝÞÆÐÖ][^\n]{2,40}?)\s{2,}/i) || [])[1] || null;

  const linur = [];
  for (let i = 0; i < linurTexta.length - 1; i++) {
    const lysing = linurTexta[i];
    const magn = linurTexta[i + 1].match(/^(\d{1,4}),\d$/);
    if (!magn) continue;
    if (!/[A-Za-zÁÉÍÓÚÝÞÆÐÖáéíóúýþæðö]/.test(lysing)) continue;   // verður að vera texti
    if (/^(Til greiðslu|Afsláttur|Samtals|Móttekið|Sala með)/i.test(lysing)) continue;
    linur.push({ lysing, fjoldi: +magn[1], tegund: taekiAfLinu(lysing) });
  }
  const taeki = linur.filter(l => l.tegund);
  const total = taeki.reduce((a, l) => a + l.fjoldi, 0);

  return { nr, dags, kt, uttekt, kredit, vegna, total_devices: total, taekjalinur: taeki.length, linur };
}

(async () => {
  const skraPath = process.argv[2];
  const takIdx = process.argv.indexOf('--takmarka');
  const tak = takIdx > 0 ? +process.argv[takIdx + 1] : Infinity;
  if (!skraPath) { console.error('Notkun: node tools/lesa-reikninga-drive.cjs <skrar.json> [--takmarka N]'); process.exit(1); }

  const allar = JSON.parse(fs.readFileSync(skraPath, 'utf8'));
  const reikningar = allar.filter(f => /\d[\d.]*\s*kr/i.test(f.title)).slice(0, tak);

  const ut = [];
  for (const f of reikningar) {
    try {
      const r = await fetch(SKJAL + encodeURIComponent(f.id));
      if (!r.ok) { ut.push({ id: f.id, title: f.title, villa: 'HTTP ' + r.status }); continue; }
      const buf = Buffer.from(await r.arrayBuffer());
      const p = await pdf(buf);
      ut.push(Object.assign({ id: f.id, title: f.title, parentId: f.parentId }, lesaReikning(p.text)));
    } catch (e) {
      ut.push({ id: f.id, title: f.title, villa: String((e && e.message) || e).slice(0, 120) });
    }
  }
  process.stdout.write(JSON.stringify(ut, null, 1));
})();
