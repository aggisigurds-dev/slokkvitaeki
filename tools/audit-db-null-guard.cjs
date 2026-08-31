#!/usr/bin/env node
/* VÖRÐUR — `DB.sb` notað áður en tengingin er til.
 *
 * VILLAN, mæld en ekki ágiskuð. Villuvöktun Brunahólfs
 * (brunaholf.netlify.app/.netlify/functions/villur) hafði skráð:
 *
 *   "Uncaught TypeError: Cannot read properties of null (reading 'from')"
 *   32 atvik · 2026-08-30 13:48 → 2026-08-31 20:37 · slód /
 *   stafli: f → l → HTMLDocument.<anonymous> → switchView
 *
 * Uppruni: js/pos.js `loadAll()` kallaði `DB.sb.from('vorur')`. `DB.sb` er
 * NULL þangað til `DB.init()` klárast. Fallið var með `.catch()` — en það
 * greip ekki neitt, því `DB.sb.from` kastar SYNKRÓNT áður en loforðakeðjan
 * verður til. Villan slapp því út óhöndluð í hvert sinn sem einhver skipti
 * yfir á Sölu áður en tengingin var komin upp.
 *
 * SAMA MYNSTUR sást tvisvar sama dag: Staðan-síðan (345) sýndi varanlega
 * „Gagnagrunnstenging ekki tilbúin" af sömu ástæðu. Þetta er ekki einstök
 * villa heldur villuFLOKKUR.
 *
 * ÞESSI VÖRÐUR fellur rautt ef vörnin hverfur úr pos.js. Það er það sem gerir
 * „sama villan á ekki geta gerst nema einu sinni" satt — texti um að hafa
 * lagað eitthvað stöðvar ekki endurtekningu, vörður gerir það.
 *
 * Hann telur líka upp önnur `DB.sb.from(`-köll sem hafa enga vörn í sinni
 * skrá. Þau eru EKKI látin falla rautt — mörg þeirra keyra aðeins eftir
 * notendasmell, löngu eftir að tengingin er komin. Þau eru vaktlisti, og að
 * segja það hreint út er réttara en að þykjast hafa athugað þau.
 */
const fs = require('fs');
const path = require('path');

const rot = path.join(__dirname, '..');
const les = f => fs.readFileSync(path.join(rot, f), 'utf8');
const fails = [];

/* ── 1. Vörnin í pos.js loadAll() ──────────────────────────────────────── */
const pos = les('js/pos.js');
const i = pos.indexOf('function loadAll()');
if (i < 0) {
  fails.push('js/pos.js: loadAll() fannst ekki — vörðurinn getur ekki staðfest vörnina.');
} else {
  // Aðeins fallið sjálft er skoðað, ekki öll skráin: vörn einhvers staðar
  // annars staðar ver ekki þetta kall.
  const bolur = pos.slice(i, i + 1400);
  const hefurVorn = /if\s*\(\s*!window\.DB\s*\|\|\s*!DB\.sb\s*\)/.test(bolur);
  const kallar = /DB\.sb\.from\(/.test(bolur);
  if (kallar && !hefurVorn) {
    fails.push(
      'js/pos.js loadAll() kallar DB.sb.from() ÁN null-varnar.\n'
      + '    Þetta er nákvæmlega villan sem gaf 32 atvik 30.–31.08.2026:\n'
      + '    "Cannot read properties of null (reading \'from\')" á switchView.\n'
      + '    .catch() dugar EKKI — DB.sb.from kastar synkrónt á undan keðjunni.\n'
      + '    Settu aftur inn:  if (!window.DB || !DB.sb) return Promise.resolve();');
  }
}

/* ── 2. Vaktlisti: önnur köll án varnar í sinni skrá ───────────────────── */
function jsSkrar(d, ut) {
  for (const n of fs.readdirSync(path.join(rot, d))) {
    const p = d + '/' + n;
    const st = fs.statSync(path.join(rot, p));
    if (st.isDirectory()) jsSkrar(p, ut);
    else if (n.endsWith('.js')) ut.push(p);
  }
  return ut;
}
const vaktlisti = [];
for (const f of jsSkrar('js', [])) {
  const s = les(f);
  if (!/DB\.sb\.from\(/.test(s)) continue;
  if (/!DB\.sb|DB\.sb\s*&&|await\s+DB\.init|DB\.ready|!window\.DB/.test(s)) continue;
  vaktlisti.push(f);
}

if (fails.length) {
  console.log('❌ DB.sb null-vörn BROTIN\n');
  fails.forEach(f => console.log('  • ' + f));
  process.exit(1);
}

console.log('✅ DB.sb null-vörn heldur — js/pos.js loadAll() ver sig.');
if (vaktlisti.length) {
  console.log(`   Vaktlisti (${vaktlisti.length} skrár kalla DB.sb.from() án sýnilegrar varnar,`);
  console.log('   flestar aðeins eftir notendasmell — ekki fellt rautt, en óathugað):');
  vaktlisti.slice(0, 8).forEach(f => console.log('     ' + f));
  if (vaktlisti.length > 8) console.log(`     … og ${vaktlisti.length - 8} til viðbótar`);
}
process.exit(0);
