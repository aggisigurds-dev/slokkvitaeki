#!/usr/bin/env node
'use strict';
/* ÞEMAÐ ER FROSIÐ — ekkert má kveikja á dökku þema aftur.
 *
 * Agnar 10.09.2026: „Þetta eru leifar á þemastillingu sem ég lét búa til
 * einhverntíman f. slökkvitæki. Búinn að reyna finna alla afganga og eyða þeim.
 * En þetta er eins og zombie. Vill ekki drepast."
 *
 * HVERS VEGNA HANN VILDI EKKI DREPAST: ekkert varnaði honum að koma aftur.
 * Agnar fraus þemað 17.08.2026 (patch 220, „Brunastál er eina grunnstillingin"),
 * en frystingin var YFIRLÝSING — ekki þvingun. Hver ný lota gat bætt við
 * þemaskipti, dökkum breytum eða prefers-color-scheme-rofa, og þá vöknuðu
 * sofandi CSS-reglur sem enginn hafði hreinsað.
 *
 * Það gerðist í reynd: 66-dark-mode.js lifði frystinguna af og tæki sem einu
 * sinni fengu 🌙-högg sátu FÖST í dökku þema að eilífu — per tæki, þess vegna
 * virtist það handahófskennt (síminn bilaður, tölvan í lagi). Sjá haus 220.
 *
 * Þessi vörður er þvingunin sem vantaði.
 *
 * HVAÐ ER BANNAÐ
 *   • að setja data-theme="dark" (eða á breytu sem getur orðið "dark")
 *   • þemaskiptifall: setTheme/cycleTheme/toggleTheme sem tekur við gildi
 *   • prefers-color-scheme sem SKIPTIR um þema
 *
 * HVAÐ ER LEYFT — og af hverju vörðurinn má ekki flagga því
 *   • gatt/ notar data-theme fyrir ÞEMU PER VIÐSKIPTAHÓP (steel/cream úr
 *     portal_users.theme). Það er raunverulegur eiginleiki gáttarinnar, ekki
 *     ljóst/dökkt-rofi, og hann verður að standa.
 *   • prefers-color-scheme sem VER: media-query sem þvingar `color-scheme:
 *     only light` er nákvæmlega rétta vörnin gegn Chrome Android (css/app.css
 *     og patch 318). Bannað er að SKIPTA, ekki að VERJA.
 *   • mockups/, claude/, docs/ — ekki hluti af appinu.
 *
 * Keyrsla:  node tools/audit-thema-frosid.cjs
 * Les aðeins kóða — engin gagnatenging.
 */
const fs = require('fs');
const path = require('path');

const ROT = path.join(__dirname, '..');
const SKODA = ['js', 'js/patches', 'css'];
// gatt/ er undanskilið að ofangreindri ástæðu — það er eiginleiki, ekki leifar.
const SLEPPA_SLOD = /node_modules|[\\/]dist[\\/]|[\\/]backups[\\/]|graphify-out|_attic|[\\/]mockups[\\/]|[\\/]claude[\\/]|[\\/]docs[\\/]|[\\/]gatt[\\/]|\.min\.(js|css)$/;

function skrar(rot, undir) {
  const ut = [];
  for (const u of undir) {
    const p = path.join(rot, u);
    if (!fs.existsSync(p)) continue;
    for (const f of fs.readdirSync(p)) {
      const fp = path.join(p, f);
      if (SLEPPA_SLOD.test(fp)) continue;
      try { if (!fs.statSync(fp).isFile()) continue; } catch { continue; }
      if (!/\.(js|css)$/.test(f)) continue;
      ut.push(fp);
    }
  }
  return ut;
}

const brot = [];
const slod = f => path.relative(ROT, f).replace(/\\/g, '/');

for (const f of skrar(ROT, SKODA)) {
  let txt;
  try { txt = fs.readFileSync(f, 'utf8'); } catch { continue; }
  // Athugasemdir mega NEFNA dökkt þema — þær kveikja ekki á neinu. Haus patch 220,
  // þessi vörður og hreinsunar-athugasemdirnar í 231/287 gera það allar.
  // Fyrsta útgáfa strippaði aðeins línur sem BYRJA á // og flaggaði því sínar eigin
  // skýringar. Vörður sem gelgir að ósekju verður þaggaður — svo hér eru
  // blokkarathugasemdir og línuathugasemdir fjarlægðar úr öllum textanum fyrst,
  // en línunúmerin varðveitt með því að skipta þeim út fyrir jafnmörg bil.
  const geymaLinur = s => s.replace(/[^\n]/g, ' ');
  const hreinnTxt = txt
    .replace(/\/\*[\s\S]*?\*\//g, geymaLinur)
    .replace(/(^|[^:])\/\/[^\n]*/g, (m0, p1) => p1 + geymaLinur(m0.slice(p1.length)));
  const linur = hreinnTxt.split('\n');

  linur.forEach((l, i) => {
    const hreint = l;
    if (!hreint.trim()) return;

    // 1. Setja data-theme á dökkt
    if (/setAttribute\s*\(\s*['"]data-theme['"]\s*,\s*['"]dark['"]/.test(hreint) ||
        /data-theme\s*=\s*['"]dark['"]/.test(hreint)) {
      brot.push({ f, i: i + 1, hvad: 'setur data-theme="dark"', txt: hreint.trim().slice(0, 76) });
    }

    // 2. Þemaskiptifall sem tekur við gildi. `function setTheme()` án viðfangs
    //    er no-op og í lagi (sbr. brunaholf/js/theme.js eftir frystingu).
    if (/\b(setTheme|cycleTheme|toggleTheme)\s*=\s*function\s*\(\s*[A-Za-z_$]/.test(hreint) ||
        /\bfunction\s+(setTheme|cycleTheme|toggleTheme)\s*\(\s*[A-Za-z_$]/.test(hreint)) {
      brot.push({ f, i: i + 1, hvad: 'þemaskiptifall með viðfangi', txt: hreint.trim().slice(0, 76) });
    }
  });

  // 3. prefers-color-scheme sem SKIPTIR frekar en VER.
  //    Lesum líkama hverrar media-query og athugum hvort hann setji color-scheme
  //    (vörn) eða skilgreini dökkar breytur / data-theme (skipti).
  const re = /@media[^{]*prefers-color-scheme\s*:\s*dark[^{]*\{/g;
  let m;
  while ((m = re.exec(txt)) !== null) {
    let j = m.index + m[0].length - 1, djupt = 0, byrjun = j;
    for (; j < txt.length && j < byrjun + 6000; j++) {
      if (txt[j] === '{') djupt++;
      else if (txt[j] === '}') { djupt--; if (djupt === 0) break; }
    }
    const likami = txt.slice(byrjun, j);
    const ver = /color-scheme\s*:\s*(only\s+)?light/.test(likami);
    const skiptir = /data-theme/.test(likami) || /--(bg|surface|ink1|card)\s*:/.test(likami);
    if (!ver || skiptir) {
      const lina = txt.slice(0, m.index).split('\n').length;
      brot.push({ f, i: lina, hvad: 'prefers-color-scheme SKIPTIR um þema (má aðeins VERJA)',
        txt: m[0].trim().slice(0, 76) });
    }
  }
}

if (brot.length) {
  brot.slice(0, 10).forEach(b => console.log(`   ${slod(b.f)}:${b.i}  ${b.hvad}\n      ${b.txt}`));
  console.log('RED: ' + brot.length + ' brot á þemafrystingunni. Þemað er Brunastál, fast, ' +
    'síðan 17.08.2026 — sjá js/patches/220-theme-system.js. Dökkt þema kemur ekki aftur ' +
    'nema Agnar biðji um það, og þá er þessi vörður uppfærður fyrst.');
  process.exit(1);
}

console.log('✅ GRÆNT þemafrysting: ekkert kveikir á dökku þema (gatt/ undanskilið — ' +
  'þar er data-theme viðskiptahópa-eiginleiki, ekki ljóst/dökkt-rofi)');
