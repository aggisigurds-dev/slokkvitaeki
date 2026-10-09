#!/usr/bin/env node
/* VÖRÐUR: FLOKKUN VIÐSKIPTAVINA (09.10.2026) — handval og sjálfvirkt mega aldrei blandast.
 *
 * Grunnregla flokkunarinnar (teikning-greining/flokkun/tafla_tillaga.md): „sjálfvirk flokkun skrifar aldrei yfir það sem
 * manneskja hefur skráð. Hún á sína dálka, handvalið á sína, og gildið sem appið sýnir er coalesce(handval, sjálfvirkt)."
 * Hin hliðin er jafn mikilvæg og er það sem þessi vörður ver: VAFRINN skrifar aldrei í sjálfvirku dálkana. Geri hann
 * það, skrifar næsta sjálfvirka keyrsla yfir handskráninguna (eða öfugt) og enginn sér það — gildið lítur rétt út.
 *
 * Fall (exit 1) ef eitthvert þessara brotnar:
 *   1. Einhver skrá í js/ (önnur en 449a) SKRIFAR í stadur_flokkun / stadur_kerfi — öll skrif fara um window.Flokkun.
 *   2. 449a skrifar aðra dálka en handvalsdálkana:
 *        stadur_flokkun → tegund_handval, handval_af, handval_at
 *        stadur_kerfi   → til_stadar, thjonustuadili, verd_ar, samningur_til, athugasemd, skrad_af (+ lykillinn)
 *      þ.e. sjálfvirkur dálkur (tegund_sjalfvirk, vissa, m2_sjalfvirkt, haedir_sjalfvirkt, skylt_sjalfvirkt, visbending,
 *      smaatridi, uppruni …) stendur sem lykill í hlut, í hornklofa-úthlutun eða í hvítlistanum (KERFI_REITIR /
 *      FLOKKUN_REITIR) í skrá sem snertir töflurnar.
 *   3. `uppruni` er sent úr vafranum (trigger stadur_kerfi_snert og sjálfgildi þjónsins eiga hann).
 *   4. Innsetning í stadur_flokkun eða eyðing úr hvorri töflu í js/.
 *   5. Viðmótin (449b Flokkun-flipinn, 450 prófílspjaldið) lesa töflurnar beint í stað sýnanna, eða 449a les hráu
 *      töflurnar til birtingar (hrá tafla má aðeins standa í skriftar-kalli).
 *   6. 421 endurteiknar allan prófílinn eftir vistun í stadur_kerfi / stadur_flokkun (vantar í SJALFTEIKNA — hopp).
 *   7. index.html hleður ekki 449a, 449, 449b og 450 (með ?v).
 *
 * Statískt (ekkert net). Athugasemdir strippaðar með tools/_athugasemdir.cjs — skýringin er ekki brotið.
 *   node tools/audit-flokkun.cjs [--rot <mappa>]
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { anAthugasemdaJs } = require('./_athugasemdir.cjs');

const iRot = process.argv.indexOf('--rot');
const ROT = iRot > 0 ? path.resolve(process.argv[iRot + 1]) : path.join(__dirname, '..');
const GOGN = 'js/patches/449a-flokkun-gogn.js';
const VIDMOT = ['js/patches/449b-flokkun-sia.js', 'js/patches/450-kerfi-thjonusta.js', 'js/patches/449-reglur.js'];
const TOFLUR = ['stadur_flokkun', 'stadur_kerfi'];
const LEYFT = {
  stadur_flokkun: ['tegund_handval', 'handval_af', 'handval_at'],
  stadur_kerfi: ['til_stadar', 'thjonustuadili', 'verd_ar', 'samningur_til', 'athugasemd', 'skrad_af'],
};
const SJALFVIRKT = [
  // stadur_flokkun
  'tegund_sjalfvirk', 'vissa', 'rokstudningur', 'isat', 'm2_sjalfvirkt', 'm2_heimild', 'haedir_sjalfvirkt', 'haedir_heimild',
  'byggingarar', 'taeki', 'flokkad_at', 'flokkun_utgafa',
  // stadur_kerfi
  'skylt_sjalfvirkt', 'visbending', 'smaatridi', 'tillaga_sjalfvirk', 'uppruni', 'uppfaert',
];

const villur = [];
const lesa = (rel) => { try { return fs.readFileSync(path.join(ROT, rel), 'utf8'); } catch (_) { return null; } };
const linaVid = (s, i) => s.slice(0, i).split('\n').length;

function jsSkrar() {
  const ut = [];
  (function ganga(dir) {
    let nofn; try { nofn = fs.readdirSync(path.join(ROT, dir)); } catch (_) { return; }
    for (const n of nofn) {
      const rel = dir + '/' + n;
      const st = fs.statSync(path.join(ROT, rel));
      if (st.isDirectory()) { if (!/node_modules|_bundle|vendor/.test(n)) ganga(rel); }
      else if (/\.js$/.test(n) && !/^_bundle-/.test(n) && !/\.min\.js$/.test(n)) ut.push(rel);
    }
  })('js');
  return ut;
}

// Ein fyrirspurn: frá .from( að næsta .from( eða ; í línulok (sama skipting og audit-pagination)
function segment(src, i) {
  let seg = src.slice(i, i + 900).split(/;\s*\n/)[0];
  const k = seg.slice(6).search(/\.from\(\s*['"`]/);
  if (k >= 0) seg = seg.slice(0, 6 + k);
  return seg;
}
const SKRIF = /\.(insert|update|upsert|delete)\s*\(/;

const skrar = jsSkrar();
let snertir = 0;
for (const rel of skrar) {
  const hratt = lesa(rel);
  if (hratt == null) continue;
  const src = anAthugasemdaJs(hratt);
  const erGogn = rel === GOGN;
  const erVidmot = VIDMOT.includes(rel);
  // 1 + 4 · .from('stadur_flokkun' | 'stadur_kerfi')
  const re = /\.from\(\s*['"`](stadur_flokkun|stadur_kerfi)['"`]\s*\)/g;
  let m;
  while ((m = re.exec(src))) {
    snertir++;
    const seg = segment(src, m.index);
    const lina = rel + ':' + linaVid(src, m.index);
    const skrif = SKRIF.exec(seg);
    if (erVidmot) villur.push(lina + ': viðmótið les/skrifar ' + m[1] + ' beint — fer um window.Flokkun (449a) og sýnirnar v_' + m[1]);
    else if (!erGogn && skrif) villur.push(lina + ': skrif (' + skrif[1] + ') í ' + m[1] + ' utan 449a — öll skrif flokkunar fara um window.Flokkun');
    if (erGogn && !skrif) villur.push(lina + ': 449a les hráu töfluna ' + m[1] + ' — birting les sýnina v_' + m[1] + ' (tegund/skylt/tækifæri reiknuð þar)');
    if (skrif && skrif[1] === 'delete') villur.push(lina + ': eyðing úr ' + m[1] + ' úr vafranum');
    if (skrif && m[1] === 'stadur_flokkun' && /insert|upsert/.test(skrif[1])) villur.push(lina + ': innsetning í stadur_flokkun úr vafranum (RLS leyfir hana ekki; sjálfvirka keyrslan á raðirnar)');
  }
  // Bein REST-slóð (keepalive við lokun o.þ.h.)
  const reSlod = /rest\/v1\/(stadur_flokkun|stadur_kerfi)\b/g;
  while ((m = reSlod.exec(src))) {
    snertir++;
    if (!erGogn) villur.push(rel + ':' + linaVid(src, m.index) + ': bein REST-slóð á ' + m[1] + ' utan 449a');
  }
  // 2 + 3 · sjálfvirkir dálkar sem lykill / úthlutun í skrá sem snertir töflurnar
  if (/(^|[^_a-z])stadur_(flokkun|kerfi)/.test(src) || erGogn) {   // hráu töflurnar, ekki sýnirnar v_stadur_*
    for (const d of SJALFVIRKT) {
      const lykill = new RegExp('[{,]\\s*[\'"]?' + d + '[\'"]?\\s*:(?!:)', 'g');
      const uthlutun = new RegExp('(\\.' + d + '|\\[\\s*[\'"]' + d + '[\'"]\\s*\\])\\s*=(?!=)', 'g');
      for (const r2 of [lykill, uthlutun]) {
        let x;
        while ((x = r2.exec(src))) villur.push(rel + ':' + linaVid(src, x.index) + ': sjálfvirki dálkurinn „' + d + '" er skrifaður (' + x[0].trim().slice(0, 40) + ')');
      }
    }
  }
}

// 2 · hvítlistarnir í 449a
const gogn = lesa(GOGN);
if (gogn == null) villur.push(GOGN + ': vantar — gagnalag flokkunar');
else {
  const g = anAthugasemdaJs(gogn);
  const listi = (nafn) => { const x = new RegExp('const\\s+' + nafn + '\\s*=\\s*\\[([^\\]]*)\\]').exec(g); return x ? (x[1].match(/['"]([a-z_]+)['"]/g) || []).map((s) => s.slice(1, -1)) : null; };
  const kr = listi('KERFI_REITIR'), fr = listi('FLOKKUN_REITIR');
  if (!kr) villur.push(GOGN + ': KERFI_REITIR (hvítlisti skriftar á stadur_kerfi) fannst ekki');
  else kr.filter((d) => !LEYFT.stadur_kerfi.includes(d)).forEach((d) => villur.push(GOGN + ': KERFI_REITIR leyfir „' + d + '" — ekki handvalsdálkur'));
  if (!fr) villur.push(GOGN + ': FLOKKUN_REITIR fannst ekki');
  else fr.filter((d) => !LEYFT.stadur_flokkun.includes(d)).forEach((d) => villur.push(GOGN + ': FLOKKUN_REITIR leyfir „' + d + '" — ekki handvalsdálkur'));
  // Skrif í stadur_kerfi verða að fara um hvítlistann (hreinsaKerfisGogn) og lesa .error + raðafjölda
  if (!/function\s+hreinsaKerfisGogn[\s\S]{0,400}KERFI_REITIR\.forEach/.test(g)) villur.push(GOGN + ': hreinsaKerfisGogn síar ekki lengur á KERFI_REITIR');
  if (!/upsert\(rod[\s\S]{0,200}\)[\s\S]{0,120}if \(r\.error\)/.test(g)) villur.push(GOGN + ': upsert í stadur_kerfi les ekki r.error');
  if (!/update\(gogn\)\.eq\('fyrirtaeki_id', fid\)\.select\([\s\S]{0,80}if \(r\.error\)[\s\S]{0,200}r\.data\.length !== 1/.test(g)) villur.push(GOGN + ': leiðrétting tegundar staðfestir ekki að EIN röð breyttist (update sem snertir 0 raðir skilar ekki villu)');
  // 5 · 449a les sýnirnar
  for (const v of ['v_stadur_flokkun', 'v_stadur_kerfi']) if (!new RegExp("\\.from\\(\\s*['\"]" + v + "['\"]\\s*\\)").test(g)) villur.push(GOGN + ': les ekki ' + v);
}
// 5 · viðmótin fara um gagnalagið
for (const [rel, kall] of [['js/patches/449b-flokkun-sia.js', /F\(\)\.allt\(/], ['js/patches/450-kerfi-thjonusta.js', /F\(\)\.stadur\(/]]) {
  const s = lesa(rel);
  if (s == null) { villur.push(rel + ': vantar'); continue; }
  const k = anAthugasemdaJs(s);
  if (!kall.test(k)) villur.push(rel + ': les ekki gögnin um window.Flokkun (sýnirnar)');
  // Engin bein fyrirspurn í viðmótinu (.from(…) — lestur eða skrif): allt um gagnalagið. (Map.delete o.þ.h. er ekki skrif.)
  const bein = /\.from\(\s*['"`]([a-z_]+)['"`]\s*\)/.exec(k);
  if (bein) villur.push(rel + ':' + linaVid(k, bein.index) + ': bein fyrirspurn á ' + bein[1] + ' — viðmótið fer um window.Flokkun (lestur úr sýnum, skrif um vistaKerfi / leidrettaTegund)');
}
// 6 · 421 lætur spjaldið teikna sig sjálft
{
  const s = lesa('js/patches/421-profill-lifandi.js');
  const x = s && /const SJALFTEIKNA = \/\^\(([^)]*)\)\$\//.exec(s);
  if (!x) villur.push('js/patches/421-profill-lifandi.js: SJALFTEIKNA fannst ekki');
  else for (const t of TOFLUR) if (!x[1].split('|').includes(t)) villur.push('js/patches/421-profill-lifandi.js: SJALFTEIKNA vantar ' + t + ' — vistun í Kerfi og þjónustu myndi rífa allan prófílinn (hopp)');
}
// 7 · hlaðið í index.html
{
  const h = (lesa('index.html') || '').replace(/<!--[\s\S]*?-->/g, '');   // svæfður <script> í athugasemd telst ekki hlaðinn
  for (const f of ['449a-flokkun-gogn', '449-reglur', '449b-flokkun-sia', '450-kerfi-thjonusta']) {
    if (!new RegExp('<script[^>]+/js/patches/' + f + '\\.js\\?v=[0-9a-z]+').test(h)) villur.push('index.html: ' + f + '.js er ekki hlaðið (með ?v)');
  }
  const i = (f) => h.indexOf('/js/patches/' + f + '.js');
  if (i('449a-flokkun-gogn') > -1 && i('449b-flokkun-sia') > -1 && i('449a-flokkun-gogn') > i('449b-flokkun-sia')) villur.push('index.html: 449a verður að hlaðast á undan 449b');
}

if (villur.length) {
  console.log('RAUTT FLOKKUN — ' + villur.length + ' brot:');
  villur.forEach((v) => console.log('  · ' + v));
  process.exit(1);
}
console.log('GRÆNT FLOKKUN — ' + snertir + ' snertingar við stadur_flokkun/stadur_kerfi, allar í 449a og aðeins handvalsdálkar; uppruni aldrei sendur; 449b/450 lesa sýnirnar; 421 lætur spjaldið teikna sig sjálft.');
process.exit(0);
