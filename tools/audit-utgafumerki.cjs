#!/usr/bin/env node
/* VÖRÐUR — skrá sem er birt STÖK verður að fá nýtt ?v-merki þegar henni er breytt.
 *
 * VILLAN, fundin 16.09.2026: `js/features.js` fékk tvo nýja hlekki í bannernum (Google Maps
 * á heimilisfangið, K á Keldan). Kóðinn fór í loftið — `curl` á lifandi skrána sýndi hann —
 * en bannerinn í appinu var óbreyttur, bæði eftir endurhleðslu og eftir að þjónustustarfinn
 * (service worker) hafði verið aftengdur. Ástæðan: skráin er birt sem
 * `/js/features.js?v=20260912coid` og Netlify sendir
 * `Cache-Control: public, max-age=3600, stale-while-revalidate=86400`. Breytist slóðin ekki
 * heldur vafrinn GÖMLU skránni í allt að sólarhring. Þetta er versta tegund villu: kóðinn er
 * réttur, birtingin tókst, vörðurinn var grænn — og notandinn sér samt ekki breytinguna.
 *
 * AÐEINS STAKAR SKRÁR: `build-dist.js` bunkar samliggjandi skriftur í `_bundle-N.<hash>.js`,
 * og hash-ið breytist sjálfkrafa með efninu. Skrárnar hér að neðan lenda hver í sínu lagi
 * (ein skrifta í keyrslu) og bera því sitt eigið ?v-merki. Listinn var lesinn af LIFANDI
 * index.html 16.09.2026 (`grep 'src="/js/' | grep -v _bundle`). Bætist skrá í þann hóp
 * þarf að bæta henni hér við.
 *
 *   node tools/audit-utgafumerki.cjs
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const rot = path.join(__dirname, '..');

// Stakar skriftur í framleiðslu — sjá hausinn.
const STAKAR = [
  'js/villuvakt.js',
  'js/features.js',
  'js/scanner.js',
  'js/demoseed.js',
  'js/patches/309-problem-registry.js',
  'js/patches/145-companies-diagnose.js',
  'js/patches/365-vistun-utskolun.js',
  'js/patches/369-krofu-vinnugluggi.js',
];

const html = fs.readFileSync(path.join(rot, 'index.html'), 'utf8');

function merkiFyrir(skra) {
  const re = new RegExp('src="/' + skra.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\?v=([^"]+)"');
  const m = html.match(re);
  return m ? m[1] : null;
}

function sidastBreytt(skra) {
  try {
    // 18.09.2026: í GRUNNUM klón (git clone --depth 1, sem actions/checkout gerir
    // sjálfgefið) er aðeins einn commit til, svo þetta skilar HEAD-dagsetningu
    // fyrir hverja skrá og vörðurinn fellir allt. Sjá `grunnurKlon` hér að neðan —
    // hann stöðvar vörðinn með skýringu í stað þess að dæma á röngum gögnum.
    return execFileSync('git', ['log', '-1', '--format=%cs', '--', skra], { cwd: rot, encoding: 'utf8' }).trim() || null;
  } catch (_) { return null; }
}

function merkiDags(merki) {
  // ms-tímastimpill fyrst: 1776797624642 lítur út eins og dagsetning fyrir regexinu neðar.
  if (/^\d{13}$/.test(merki)) return new Date(+merki).toISOString().slice(0, 10);
  const d = merki.match(/^(\d{4})(\d{2})(\d{2})/);
  if (d && +d[2] >= 1 && +d[2] <= 12 && +d[3] >= 1 && +d[3] <= 31) return d[1] + '-' + d[2] + '-' + d[3];
  return null;
}

const gomul = [], vantar = [], oskilj = [];
let skodad = 0;

for (const skra of STAKAR) {
  if (!fs.existsSync(path.join(rot, skra))) continue;
  const merki = merkiFyrir(skra);
  if (!merki) { vantar.push(skra); continue; }
  const dags = merkiDags(merki);
  if (!dags) { oskilj.push(`${skra} (?v=${merki})`); continue; }
  const breytt = sidastBreytt(skra);
  if (breytt === null) {
    console.log('ℹ️  git svarar ekki hér — vörðurinn sleppir samanburði (ekkert stöðvað).');
    process.exit(0);
  }
  skodad++;
  if (breytt > dags) gomul.push(`${skra}  ?v=${merki} (${dags}) en síðast breytt ${breytt}`);
}

// 18.09.2026 — GRUNNUR KLÓN GERIR ÞENNAN VÖRÐ BLINDAN.
// `git log -1 -- <skrá>` þarf sögu. Sé hún ekki til (depth 1) skilar hún HEAD
// fyrir allt og vörðurinn fellir hverja einustu stöku skriftu. Þá er rétt svar
// „ég get ekki mælt þetta", ekki „þetta er bilað".
function grunnurKlon() {
  try {
    return execFileSync('git', ['rev-parse', '--is-shallow-repository'], { cwd: rot, encoding: 'utf8' }).trim() === 'true';
  } catch (_) { return false; }
}
if (grunnurKlon()) {
  console.log('⚠ Sleppt: grunnur klón (depth 1) — git log hefur enga sögu per skrá, svo merkin eru ekki mælanleg. Notaðu fetch-depth: 0.');
  process.exit(0);
}
const nyttMerki = new Date().toISOString().slice(0, 10).replace(/-/g, '') + 'a';

if (gomul.length || vantar.length) {
  console.log(`❌ Útgáfumerki á eftir efninu: ${gomul.length + vantar.length}\n`);
  console.log('   Þessar skrár eru birtar STAKAR og vafrinn heldur gömlu útgáfunni í allt að');
  console.log('   sólarhring þegar slóðin breytist ekki (max-age=3600, stale-while-revalidate=86400).');
  console.log('   Notandinn sæi því ekki breytinguna þótt hún sé komin í loftið.');
  console.log('   Lagfæring: hækkaðu ?v-merkið í index.html, t.d. ?v=' + nyttMerki + '\n');
  gomul.forEach(g => console.log('   ' + g));
  vantar.forEach(v => console.log('   ' + v + '  — engin ?v-slóð í index.html (skráin er þá án stýringar)'));
  process.exit(1);
}

console.log(`✅ Útgáfumerki í lagi — ${skodad} stakar skriftur bera merki sem er jafn nýtt og efnið` +
  (oskilj.length ? ` (${oskilj.length} án læsilegrar dagsetningar: ${oskilj.join(', ')})` : '') + '.');
process.exit(0);
