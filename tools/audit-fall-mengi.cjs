#!/usr/bin/env node
/* audit-fall-mengi — tvö Netlify-föll mega aldrei fá sama skráamengi, og starfsmannahliðið má aldrei opnast.
 *
 * 1. SKRÁAMENGI. Netlify býr til búnt fyrir HVERJA skrá í netlify/functions (líka _portal.cjs o.fl.): skráin sjálf
 *    + allt sem hún krefst (require), endurkvæmt. Fái tvö föll nákvæmlega sama mengi fá þau sama digest, og Netlify
 *    keyrir þá bæði á EINU búnti. 15.11.2026 (deploy-preview #982): hringtenging _portal.cjs ↔ hub-adgangar.cjs gaf
 *    báðum menginu {_portal.cjs, hub-adgangar.cjs}; hub-adgangar keyrði búnt _portal (enginn handler) og svaraði 500
 *    — innskráning appsins hefði dottið út. Lagað með _starfshlid.cjs, sem krefst beggja án hringtengingar.
 *
 * 2. HLIÐIÐ LOKAÐ. P.requireStaff hleypti öllu í gegn meðan HUB_STAFF_PASSWORD var ekki sett, og það var aldrei
 *    sett — gatt-admin, hreyfingaryfirlit, verkbeidni-lokid og skrif vefverslunar voru opin öllum á netinu
 *    (Agnar 15.11.2026: „Já, lokaðu þeim"). Þessi vörður fellur hleypi requireStaff aftur inn án lykilorðs, eða kalli
 *    fall á hliðið án `await` (loforð er „satt" og yrði skilað sem svari).
 *
 * Les aðeins kóðann (ekkert net, engir lyklar) — keyrir líka í `audit-all --static`.
 */
const fs = require('fs');
const path = require('path');

const ROT = path.join(__dirname, '..');
const DIR = path.join(ROT, 'netlify', 'functions');
const RE_REQ = /require\(\s*['"](\.{1,2}\/[^'"]+)['"]\s*\)/g;
// Athugasemdir teljast ekki (búntarar Netlify lesa kóðann, ekki athugasemdir): /* … */-blokkir og heilar //-línur.
const anAths = (t) => t.replace(/\/\*[\s\S]*?\*\//g, (b) => b.replace(/[^\n]/g, ' ')).replace(/^[ \t]*\/\/.*$/gm, '');
const lesa = (f) => anAths(fs.readFileSync(f, 'utf8'));

function mengi(skra, sed) {
  const full = path.resolve(skra);
  if (sed.has(full) || !fs.existsSync(full)) return sed;
  sed.add(full);
  const t = lesa(full);
  const finna = [];
  let m;
  RE_REQ.lastIndex = 0;
  while ((m = RE_REQ.exec(t))) finna.push(m[1]);
  for (const r of finna) {
    let p = path.resolve(path.dirname(full), r);
    if (!fs.existsSync(p)) for (const e of ['.js', '.cjs', '.json']) if (fs.existsSync(p + e)) { p += e; break; }
    if (fs.existsSync(p) && fs.statSync(p).isFile()) mengi(p, sed);
  }
  return sed;
}

const villur = [];
const fallSkrar = fs.readdirSync(DIR).filter((f) => /\.(c?js|mjs)$/.test(f) && fs.statSync(path.join(DIR, f)).isFile());

// 1. sama skráamengi
const hopar = new Map();
for (const f of fallSkrar) {
  const lykill = [...mengi(path.join(DIR, f), new Set())].map((x) => path.relative(DIR, x).replace(/\\/g, '/')).sort().join(', ');
  if (!hopar.has(lykill)) hopar.set(lykill, []);
  hopar.get(lykill).push(f);
}
for (const [lykill, fll] of hopar) {
  if (fll.length > 1) villur.push(`sama skráamengi: ${fll.join(' + ')} ← {${lykill}} — Netlify keyrir þau á einu búnti (rjúfðu hringtenginguna)`);
}

// 2a. requireStaff hleypir engum inn án sameiginlega lykilorðsins
const portal = lesa(path.join(DIR, '_portal.cjs'));
const rs = /function\s+requireStaff\s*\([^)]*\)\s*\{([\s\S]*?)\n\}/.exec(portal);
if (!rs) villur.push('_portal.cjs: fann ekki requireStaff — uppfærðu vörðinn');
else if (/!\s*HUB_PW\s*\)\s*return\s+null/.test(rs[1]) || !/return\s+json\(\s*401/.test(rs[1])) {
  villur.push('_portal.cjs: requireStaff hleypir aftur inn án HUB_STAFF_PASSWORD (á að enda á 401)');
}
// 2b. alltaf beðið eftir hliðinu
for (const f of fallSkrar) {
  const t = lesa(path.join(DIR, f));
  const re = /(?:=|return)\s*(?!await\b)(P\.requireStaff|H\.krefjastStarfsmanns|krefjastStarfsmanns)\s*\(/g;
  let m;
  while ((m = re.exec(t))) {
    const lina = t.slice(0, m.index).split('\n').length;
    villur.push(`${f}:${lina}: ${m[1]}(…) kallað án await — loforðið yrði skilað sem svari`);
  }
}

if (villur.length) {
  console.log(`RED: ${villur.length} brot á fallabúntum / starfsmannahliði`);
  for (const v of villur) console.log('   • ' + v);
  process.exit(1);
}
console.log(`✅ GRÆNT fallabúnt + hlið: ${fallSkrar.length} föll, hvert með sitt skráamengi; starfsmannahliðið lokað sjálfgefið og alltaf beðið eftir því.`);
