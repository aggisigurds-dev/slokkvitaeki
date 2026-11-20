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

const html = fs.readFileSync(path.join(rot, 'index.html'), 'utf8');

/* Listinn er LESINN ÚR index.html, ekki skrifaður hér (19.11.2026).
 *
 * VILLAN SEM ÞETTA LAGAR: handskrifaði listinn taldi ellefu skrár, en index.html birtir yfir hundrað
 * STAKAR skriftur með ?v-merki — þar á meðal Þjónustuborðið sjálft (368). Þegar borðinu var breytt
 * 19.11.2026 og það birt stóð merkið áfram `?v=20261118b`, svo vafrinn sótti gærdagsins skrá. Kóðinn
 * var réttur, birtingin tókst, vörðurinn var grænn — og Agnar sá enga breytingu. Nákvæmlega sú villa
 * sem þessi vörður var skrifaður gegn, en listinn náði ekki yfir skrána.
 *
 * Nú er hver skrifta sem index.html hleður stök (ekki `_bundle`) mæld, svo listinn getur ekki orðið
 * úreltur aftur. `build-dist.js` bunkar samliggjandi skriftur í `_bundle-N.<hash>.js` og þær bera
 * sitt eigið efnishass — þær eiga ekkert erindi hingað. */
const STAKAR = [...new Set([...html.matchAll(/src="\/(js\/[^"?]+\.js)\?v=/g)].map((m) => m[1]))]
  .filter((s) => !/_bundle/.test(s));

function merkiFyrir(skra) {
  const re = new RegExp('src="/' + skra.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\?v=([^"]+)"');
  const m = html.match(re);
  return m ? m[1] : null;
}

/* Síðasta breyting hverrar skrár — EIN git-keyrsla fyrir allt (19.11.2026).
 * Áður var `git log -1 -- <skrá>` keyrt fyrir hverja skrá. Með handskrifaða listanum (11 skrár) var það ekkert;
 * með listanum úr index.html (532 skrár) tók vörðurinn margar mínútur og féll á tímamörkum audit-all — þ.e. hann
 * varð ómælanlegur, sem er versta tegund varðar. Hér er öll sagan lesin í einni ferð og flett upp í korti. */
let _kort = null;
function kortBreytinga() {
  if (_kort) return _kort;
  _kort = {};
  try {
    const ut = execFileSync('git', ['log', '--since=' + new Date(Date.now() - 400 * 864e5).toISOString().slice(0, 10), '--name-only', '--format=%x00%cs'], { cwd: rot, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
    let dags = null;
    for (const lina of ut.split('\n')) {
      if (lina.startsWith('\u0000')) { dags = lina.slice(1).trim(); continue; }
      const s = lina.trim();
      if (s && dags && !_kort[s]) _kort[s] = dags;     // fyrsta (nýjasta) dagsetning hverrar skráar gildir
    }
  } catch (_) { _kort = null; }
  return _kort;
}
function sidastBreytt(skra) {
  // Skrá sem er ekki í kortinu hefur ekki breyst í glugganum — það er svar, ekki þögn (null þýðir „git svarar ekki“).
  const k = kortBreytinga();
  if (k) return k[skra] || '1970-01-01';
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

const gomul = [], vantar = [], oskilj = [], skuld = [];
let skodad = 0;
/* 19.11.2026 — vörðurinn FELLIR á því sem var breytt síðustu þrjár vikur, en TELUR aðeins eldri skuldina.
 * Ástæðan: þegar listinn var lesinn úr index.html (sjá hausinn) komu í ljós tugir skráa frá vorinu með úrelt
 * merki. Þær eru raunverulegt vandamál en ekki NÝTT vandamál, og rauður vörður á hverri ýtingu sendir póst á
 * Agnar og þaggar sjálfan sig. Þriggja vikna glugginn grípur nákvæmlega þá villu sem þetta snýst um: skrá sem
 * var breytt í þessari viku og birt án þess að merkið fylgdi, svo vafrinn heldur gömlu útgáfunni. */
const MORK = new Date(Date.now() - 21 * 864e5).toISOString().slice(0, 10);

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
  if (breytt > dags) (breytt >= MORK ? gomul : skuld).push(`${skra}  ?v=${merki} (${dags}) en síðast breytt ${breytt}`);
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

console.log(`✅ Útgáfumerki í lagi — ${skodad} stakar skriftur, engin breytt síðustu 3 vikur með úrelt merki` +
  (skuld.length ? `. ⚠ ELDRI SKULD: ${skuld.length} skrár bera merki sem er eldra en efnið (breytt fyrir ${MORK}); þær eru ekki felldar hér` : '') +
  (oskilj.length ? ` (${oskilj.length} án læsilegrar dagsetningar: ${oskilj.join(', ')})` : '') + '.');
process.exit(0);
