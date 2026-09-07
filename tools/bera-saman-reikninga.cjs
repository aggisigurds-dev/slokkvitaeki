#!/usr/bin/env node
/* BER SAMAN LESNA REIKNINGA VIÐ ÚTTEKTARSKÝRSLURNAR — kt + ár.
 *
 * Agnar 07.09.2026: „ég er með hverja einustu skýrslu invoice frá 2025 til mars
 * 2026, sem ættu að matcha 100%". Þetta mælir hvort svo sé.
 *
 * Inntak: úttak `tools/lesa-reikninga-drive.cjs` (JSON á stdout, með
 * pdf-parse-viðvörunum framan við sem eru klipptar burt hér).
 *
 * PÖRUNIN er á KENNITÖLU + ÁRI, ekki fyrirtaeki_id, af ásettu ráði: reikningur
 * er stílaður á greiðandann en skýrslan skráð á staðinn, og hjá rekstrarfélögum
 * eru það ekki sömu auðkenni. Kennitalan brúar það.
 *
 * ÚTTEKT = reikningur sem ber „Skýrslugerð og vottun" EÐA „Akstur" (regla
 * Agnars 07.09.2026: „ef það stendur ekki Akstur eða skýrslugerð þá er
 * reikningurinn líklega bara úr búð"). Hvort tveggja segir að farið hafi verið
 * á staðinn. Búðarsölur eiga ekki heima í samanburðinum. Eitt eintak per
 * reikningsnúmer — Drive-afrit ((2)/(3)) tvítaka sama reikninginn.
 *
 * ÞRJÁR LEIÐRÉTTINGAR, allar MÆLDAR 07.09.2026 (einstaða-kúnnar, 184 pör):
 *   1. reykskynjarar dregnir frá skýrslunni (taldir, aldrei rukkaðir)  61%→71%
 *   2. hæsti reikningur ársins í stað summu allra                      71%→73%
 *   3. skýrslur sem lesa 0 tæki sleppt (gloppa, ekki mæling)           73%→75%
 *
 *   node tools/bera-saman-reikninga.cjs <lesnir.json> [--listi]
 */
const fs = require('fs');
const path = require('path');

const rot = path.join(__dirname, '..');
const cfg = fs.readFileSync(path.join(rot, 'js/config.js'), 'utf8');
const URL_ = (cfg.match(/SUPABASE_URL\s*=\s*["']([^"']+)/) || [])[1];
const KEY = (cfg.match(/SUPABASE_KEY\s*=\s*["']([^"']+)/) || [])[1];
const H = { apikey: KEY, Authorization: 'Bearer ' + KEY };

async function allar(slod) {
  let out = [], from = 0;
  for (;;) {
    const r = await fetch(URL_ + '/rest/v1/' + slod + (slod.includes('?') ? '&' : '?') +
      'limit=1000&offset=' + from, { headers: H });
    if (!r.ok) throw new Error(r.status + ' ' + (await r.text()).slice(0, 200));
    const d = await r.json();
    if (!d.length) break;
    out = out.concat(d);
    if (d.length < 1000) break;
    from += 1000;
  }
  return out;
}

(async () => {
  const inn = process.argv[2];
  const listi = process.argv.includes('--listi');
  if (!inn) { console.error('Notkun: node tools/bera-saman-reikninga.cjs <lesnir.json> [--listi]'); process.exit(1); }

  const raw = fs.readFileSync(inn, 'utf8');
  const lesnir = JSON.parse(raw.slice(raw.indexOf('[')));

  // Eitt eintak per reikningsnúmer, aðeins úttektir.
  const einstakir = new Map();
  lesnir.forEach(x => {
    if (x.villa || !x.uttekt || !x.kt || !x.dags || !x.nr) return;
    if (!einstakir.has(x.nr)) einstakir.set(x.nr, x);
  });

  /* HÆSTI reikningur ársins, ekki summa — mælt 07.09.2026. Kúnni með margar
     heimsóknir fær annars summu allra útkalla á móti EINNI árlegri skýrslu
     (Hreyfill: þrír reikningar 2026 = 31 á móti skýrslu upp á 15). Hæsti
     reikningurinn er sá sem ber árlegu úttektina. Mælt: summa 71%, hæsti 73%. */
  const reikn = new Map();                         // 'kt|ár' -> { taeki, nr:[] }
  einstakir.forEach(x => {
    const k = x.kt.replace(/-/g, '') + '|' + x.dags.slice(0, 4);
    const v = reikn.get(k) || { taeki: 0, nr: [] };
    v.taeki = Math.max(v.taeki, x.total_devices || 0);
    v.nr.push(x.nr);
    reikn.set(k, v);
  });

  const [co, facts] = await Promise.all([
    allar('fyrirtaeki?select=id,nafn,kennitala&deleted_at=is.null'),
    allar('arsskodun_report_facts?select=fyrirtaeki_id,report_year,total_devices,equipment'),
  ]);
  const ktAf = new Map(co.map(c => [c.id, String(c.kennitala || '').replace(/-/g, '')]));
  const nafnAf = new Map(co.map(c => [c.id, c.nafn]));

  /* REYKSKYNJARAR eru dregnir frá skýrslunni: þeir eru taldir í úttektinni en
     ALDREI rukkaðir (Furugrund 73: skýrsla 10 = 4 léttvatn + 6 skynjarar,
     reikningur 4 — hvort tveggja rétt). Mælt 07.09.2026: 61% → 71%. Aðrar
     tegundir eru rukkaðar; að draga þær frá versnar samræmið. */
  const sky = new Map();                           // 'kt|ár' -> { taeki, stadir:[] }
  facts.forEach(f => {
    if (f.total_devices == null) return;
    const kt = ktAf.get(f.fyrirtaeki_id);
    if (!kt) return;
    const k = kt + '|' + f.report_year;
    const v = sky.get(k) || { taeki: 0, stadir: [] };
    v.taeki += +f.total_devices - +((f.equipment && f.equipment.reykskynjarar) || 0);
    v.stadir.push(nafnAf.get(f.fyrirtaeki_id));
    sky.set(k, v);
  });

  /* EINSTAÐA vs FJÖLSTAÐA. Pörun á kennitölu leggur saman ALLA reikninga
     kennitölunnar en aðeins þær skýrslur sem eru til. Hjá fjölstaða-kúnna sem á
     ellefu hús og eina skráða skýrslu lítur það út eins og risafrávik þótt
     ekkert sé að (Center Hótel 2025: 220 á reikningum, 5 í einu skýrslunni).
     Einstaða-kúnninn er eini hópurinn þar sem talan er ótvíræð. */
  const stadirPerKt = new Map();
  co.forEach(c => {
    const kt = String(c.kennitala || '').replace(/-/g, '');
    if (!kt) return;
    stadirPerKt.set(kt, (stadirPerKt.get(kt) || 0) + 1);
  });

  let por = 0, stemmir = 0, porEin = 0, stemmirEin = 0;
  const vikja = [];
  reikn.forEach((r, k) => {
    const s = sky.get(k);
    if (!s) return;
    if (s.taeki === 0) return;      // skýrsla sem les 0 er gloppa, ekki mæling
    const kt = k.split('|')[0];
    const ein = (stadirPerKt.get(kt) || 1) === 1;
    por++;
    if (ein) porEin++;
    if (r.taeki === s.taeki) { stemmir++; if (ein) stemmirEin++; }
    else vikja.push({ k, reikn: r.taeki, sky: s.taeki, nr: r.nr, stadir: s.stadir, ein });
  });

  const arSund = {};
  reikn.forEach((r, k) => {
    const ar = k.split('|')[1];
    arSund[ar] = arSund[ar] || { reikningar: 0, med_skyrslu: 0, stemmir: 0 };
    arSund[ar].reikningar++;
    const s = sky.get(k);
    if (s) { arSund[ar].med_skyrslu++; if (s.taeki === r.taeki) arSund[ar].stemmir++; }
  });

  console.log('\nSAMANBURÐUR — úttektarreikningar á móti úttektarskýrslum (kt + ár)\n');
  console.log('  Einstakir úttektarreikningar lesnir: ' + einstakir.size);
  console.log('  kt+ár samsetningar með reikning:     ' + reikn.size);
  console.log('  ...þar af líka með skýrslu:          ' + por);
  console.log('  ...og TALAN STEMMIR:                 ' + stemmir +
              (por ? '   (' + Math.round(100 * stemmir / por) + '%)' : ''));
  console.log('  ...víkur:                            ' + vikja.length);
  console.log('\n  EINSTAÐA-kúnnar (ein starfsstöð undir kt — ótvíræð pörun):');
  console.log('    pör: ' + porEin + '   stemma: ' + stemmirEin +
              (porEin ? '   (' + Math.round(100 * stemmirEin / porEin) + '%)' : ''));
  console.log('  FJÖLSTAÐA-kúnnar (summa reikninga á móti þeim skýrslum sem TIL ERU):');
  console.log('    pör: ' + (por - porEin) + '   stemma: ' + (stemmir - stemmirEin) +
              ((por - porEin) ? '   (' + Math.round(100 * (stemmir - stemmirEin) / (por - porEin)) + '%)' : ''));
  console.log('\n  Eftir ári:');
  Object.keys(arSund).sort().forEach(a => {
    const v = arSund[a];
    console.log('    ' + a + ':  ' + String(v.reikningar).padStart(3) + ' reikningar · ' +
      String(v.med_skyrslu).padStart(3) + ' með skýrslu · ' + String(v.stemmir).padStart(3) + ' stemma' +
      (v.med_skyrslu ? '  (' + Math.round(100 * v.stemmir / v.med_skyrslu) + '%)' : ''));
  });

  if (listi && vikja.length) {
    console.log('\n  reikn.  skýrsla  munur   kt / ár        staðir      (E = einstaða)');
    console.log('  ──────  ───────  ─────   ───────────    ─────────────────────────');
    vikja.filter(v => !process.argv.includes('--einstada') || v.ein)
      .sort((a, b) => Math.abs(b.reikn - b.sky) - Math.abs(a.reikn - a.sky))
      .forEach(v => {
        process.stdout.write(v.ein ? 'E ' : '  ');
        console.log('  ' + String(v.reikn).padStart(6) + '  ' + String(v.sky).padStart(7) + '  ' +
          String(v.reikn - v.sky).padStart(5) + '   ' + v.k.replace('|', ' / ') + '   ' +
          [...new Set(v.stadir)].slice(0, 3).join(', ').slice(0, 60));
      });
  }
  console.log('');
})();
