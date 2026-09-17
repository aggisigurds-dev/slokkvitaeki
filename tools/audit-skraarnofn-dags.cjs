#!/usr/bin/env node
/**
 * audit-skraarnofn-dags — SKRÁARNAFN MÁ EKKI BERA SKÁSTRIK.
 *
 * Af hverju þessi vörður er til (17.09.2026):
 *   Dagsetningarsniðið var samræmt í DD/MM/YYYY. Í `275-sala-tilbod.js` var sama
 *   fallið, `today()`, notað á TVEIMUR stöðum: á tilboðið sjálft (birting — rétt)
 *   OG í nafn PDF-viðhengisins:
 *
 *       const fname = 'Tilboð - ' + kúnni + ' - ' + today() + '.pdf';
 *
 *   Póstforrit lesa grunnnafn viðhengis eftir SÍÐASTA '/'. Kúnninn hefði því fengið
 *   skjal sem heitir „2026.pdf". Sendingin stöðvast ekki — `254` telur bæti, ekki
 *   nafn — svo þetta hefði bilað hljóðlaust og aðeins sést hjá viðtakandanum.
 *   Netvörður greip það áður en það fór út.
 *
 * Reglan sem vörðurinn ver:
 *   Dagsetning sem fer í SKRÁARNAFN notar bandstrik eða punkt, aldrei skástrik.
 *   Birting og skráarnafn eru aðskilin (sjá `todaySkra()` í 275).
 *
 * Aðferð: finnur í hverri skrá þau föll sem smíða dagsetningu MEÐ skástriki, og
 * flaggar svo hverja línu sem byggir skráarnafn og kallar á eitt þeirra.
 *
 * GRUNNLÍNA = 0. Hún má aldrei hækka — sjá docs/ORYGGISNET.md.
 */
const fs = require('fs');
const path = require('path');
const cp = require('child_process');

const ROT = path.resolve(__dirname, '..');
const GRUNNLINA = 0;

const skrar = cp.execSync('git ls-files', { cwd: ROT, encoding: 'utf8' })
  .split('\n')
  .filter((f) => /\.(js|html)$/.test(f))
  .filter((f) => !/(^|\/)(_attic|node_modules|dist)\//.test(f))
  .filter((f) => !/(min\.js|jspdf)/.test(f));

// Lína sem býr til skráarnafn.
const SKRAARNAFN = /(filename|fname|fileName|attachmentName|skraarnafn|nafnSkra)\s*[:=]|['"`]\.(pdf|csv|xlsx|docx|png|jpg|zip)['"`]|download\s*=/i;
// Lína sem smíðar dagsetningu með skástriki.
const SKASTRIKSDAGS = /(getDate\(\)|getMonth\(\)|m\[3\]|\$\{d+\})[^;\n]{0,80}['"`]\/['"`]/;

const fundin = [];
for (const rel of skrar) {
  let txt;
  try { txt = fs.readFileSync(path.join(ROT, rel), 'utf8'); } catch (_) { continue; }
  const linur = txt.split('\n');

  // 1. Föll í þessari skrá sem skila dagsetningu með skástriki.
  const skastriksFoll = new Set();
  linur.forEach((l) => {
    if (!SKASTRIKSDAGS.test(l)) return;
    let m = /function\s+([A-Za-z_$][\w$]*)\s*\(/.exec(l);
    if (!m) m = /(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=/.exec(l);
    if (m) skastriksFoll.add(m[1]);
  });

  // 2. Skráarnafns-línur sem kalla á þau — eða smíða dagsetninguna beint í nafninu.
  linur.forEach((l, i) => {
    if (!SKRAARNAFN.test(l)) return;
    const beint = SKASTRIKSDAGS.test(l);
    const kallad = [...skastriksFoll].filter((f) => new RegExp('\\b' + f + '\\s*\\(').test(l));
    if (!beint && !kallad.length) return;
    fundin.push({ rel, nr: i + 1, texti: l.trim().slice(0, 150), hvad: beint ? 'dagsetning smíðuð í nafninu' : 'kallar á ' + kallad.join(', ') });
  });
}

if (fundin.length > GRUNNLINA) {
  console.log(`❌ RAUTT skráarnöfn: ${fundin.length} skráarnöfn geta borið skástrik (grunnlína ${GRUNNLINA}).`);
  console.log('   Póstforrit klippa nafnið eftir síðasta "/" — viðhengið heitir þá bara árið.');
  console.log('   Lagfæring: aðskildu birtingu og skráarnafn (t.d. today().replace(/\\//g, "-")).\n');
  fundin.forEach((f) => console.log(`   ${f.rel}:${f.nr}  [${f.hvad}]\n      ${f.texti}`));
  process.exit(1);
}
console.log(`✅ GRÆNT skráarnöfn: ekkert skráarnafn ber dagsetningu með skástriki (${skrar.length} skrár lesnar).`);
