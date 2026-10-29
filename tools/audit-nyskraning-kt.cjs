#!/usr/bin/env node
/* Öryggisnet — kennitala sem er til er NOTUÐ við nýskráningu (2026-10-29, Krókur 77).
 *
 * ATVIKIÐ: „Nýtt fyrirtæki" stofnaði röð sem er ekki í þjónustu (sést ekki í Ársskoðun) og
 * „Nýr í þjónustu" stofnaði svo AÐRA röð á sömu kennitölu og sama nafni. Ekkert stoppaði það:
 * einkvæmi vísirinn (kt, stadur_nr) gildir ekki þegar nr er tómt, og skráningarformin þrjú
 * spurðu ekki hvort kennitalan væri til. Brunakerfis-formin (147/151) SÖGÐUST gera það en
 * vörnin var dauð — hún bar hreinar tölur saman við dálk sem geymir BANDSTRIK.
 *
 * Patch 490 er nú eina leiðin: leitaKt / athuga / finnaEdaStofnaStad / nyrStadur. Þessi vörður
 * heldur þremur hlutum:
 *
 *   1. HVER leið sem setur inn í `fyrirtaeki` ber vörnina (vísar í NyskraningVorn) EÐA er með
 *      eigin, rétta uppflettingu (`kennitala.eq.` í .or(), bandstrik OG tala) EÐA er á
 *      UNDANTHEGNAR með rökstuðningi. NÝ leið án þessa fellir bygginguna.
 *   2. Dauðar kennitöluleitir: `.eq('kennitala', <hrein tala>)` finnur aldrei röð (dálkarnir
 *      geyma bandstrik; kveikjan kt_normalize sér um það). Eftirstöðulisti (BASELINE) — ný
 *      dauð leit fellir; lækkaðu töluna þegar ein er löguð.
 *   3. Ársskoðun-kassinn („fannst ekki á þessum lista"): render() í 153 sameinar DOM og heldur
 *      hnútum sem hafa klasa sem kemur hvergi fyrir í nýja HTML-inu — kassinn stóð eftir þegar
 *      leitin var tæmd. Staðgengillinn (nv-ars) verður að vera alltaf í sniðinu.
 *
 * Aðeins lestur. Ekkert net.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = process.env.AUDIT_ROOT || path.join(__dirname, '..');   // AUDIT_ROOT: aðeins fyrir sjálfspróf varðarins
function fail(msg) { console.log('RED: ' + msg); process.exit(1); }
function lesa(rel) { return fs.readFileSync(path.join(ROOT, rel), 'utf8'); }

function skrar(dir, ut) {
  for (const f of fs.readdirSync(dir)) {
    if (f === 'node_modules' || f === 'backups' || f === '_attic' || f === 'dist') continue;
    const p = path.join(dir, f), st = fs.statSync(p);
    if (st.isDirectory()) skrar(p, ut); else if (/\.js$/.test(f)) ut.push(p);
  }
  return ut;
}
const allar = skrar(path.join(ROOT, 'js'), []).filter((p) => !/\.min\.js$/.test(p));

// ── 1. Stofnleiðir ────────────────────────────────────────────────────────────────────────────
const SAMHENGI = 60;   // línur á undan innsetningunni þar sem leitin á að sjást
const VORN = /NyskraningVorn|finnaEdaStofnaStad|leitaKt\b/;
const EIGIN_LEIT = /kennitala\.eq\./;   // .or('kennitala.eq.'+dash+',kennitala.eq.'+tala) — bæði sniðin

// Leiðir sem fá að standa án þess að vísa í patch 490, hver með mældri ástæðu.
const UNDANTHEGNAR = {
  'js/features.js': 'Nýtt fyrirtæki — vafið af Companies.submitNew í patch 490 (vefjaSubmitNew)',
  'js/fixcompanysave.js': 'sama vistun og features.js — sama vafning',
  'js/patches/188-promote-customer.js': 'ensureBase + doMergeFillBlanks: röð sem er til er sameinuð, ekki tvírituð',
  'js/patches/490-nyskraning-vorn.js': 'settaInnStad — kallað aðeins eftir leit (finnaKt/leitaKt) í athuga, finnaEdaStofnaStad og nyrStadur',
};

const leidir = [];
for (const p of allar) {
  const t = fs.readFileSync(p, 'utf8');
  const lin = t.split('\n');
  const re = /from\(\s*['"]fyrirtaeki['"]\s*\)\s*\.\s*(insert|upsert)\s*\(/g;
  let m;
  while ((m = re.exec(t))) {
    const n = t.slice(0, m.index).split('\n').length;   // 1-grunduð lína
    const glugginn = lin.slice(Math.max(0, n - 1 - SAMHENGI), n + 4).join('\n');
    const rel = path.relative(ROOT, p).replace(/\\/g, '/');
    leidir.push({ skra: rel, lina: n, vorn: VORN.test(glugginn), eigin: EIGIN_LEIT.test(glugginn) });
  }
}
if (!leidir.length) fail('fann enga innsetningu í `fyrirtaeki` — hefur leitin bilað?');

console.log('   ' + leidir.length + ' leiðir stofna fyrirtæki:');
leidir.forEach((l) => {
  const ok = l.vorn || l.eigin || UNDANTHEGNAR[l.skra];
  console.log('     ' + (ok ? '·' : '✗') + ' ' + (l.skra.split('/').pop() + ':' + l.lina).padEnd(42) +
    (l.vorn ? 'patch 490' : l.eigin ? 'eigin kt-leit' : UNDANTHEGNAR[l.skra] ? 'undanþága' : 'ENGIN VÖRN'));
});
const ovardar = leidir.filter((l) => !(l.vorn || l.eigin || UNDANTHEGNAR[l.skra]));
if (ovardar.length) {
  ovardar.forEach((l) => console.log('     ❗ ' + l.skra + ':' + l.lina + ' stofnar fyrirtæki án þess að athuga hvort kennitalan sé til'));
  fail('NÝ stofnleið án kennitöluvarnar (' + ovardar.length + '). Notaðu NyskraningVorn.athuga / finnaEdaStofnaStad / nyrStadur ' +
    '(js/patches/490-nyskraning-vorn.js) — annars verður til tvífari eins og Krókur 77.');
}

// Patch 490 verður sjálfur að vera til og vefja „Nýtt fyrirtæki" (features.js/fixcompanysave.js treysta á það).
const p490 = lesa('js/patches/490-nyskraning-vorn.js');
['vefjaSubmitNew', 'finnaEdaStofnaStad', 'leitaKt', 'arsFelaKassi'].forEach((f) => {
  if (!new RegExp('function ' + f + '\\b|async function ' + f + '\\b').test(p490)) fail('patch 490 vantar fallið ' + f + ' sem aðrar leiðir treysta á.');
});
if (!/490-nyskraning-vorn\.js\?v=/.test(lesa('index.html'))) fail('index.html hleður ekki patch 490 — „Nýtt fyrirtæki" er þá óvarið.');

// ── 2. Dauðar kennitöluleitir ───────────────────────────────────────────────────────────────────
// `.eq('kennitala', <ktClean|cleanKt|…>)` ber hreina tölu saman við dálk sem geymir bandstrik → finnur ALDREI röð.
const DAUD = /\.eq\(\s*['"]kennitala['"]\s*,\s*(ktClean|cleanKt|ktCleanFinal|ktDigits|ktd)\s*\)/g;
const dauðar = [];
// Athugasemdir teljast ekki (þær lýsa gömlu villunni, t.d. í 114 og 147/151) — línufjöldi helst óbreyttur.
function an_athugasemda(t) {
  return t.replace(/\/\*[\s\S]*?\*\//g, (s) => s.replace(/[^\n]/g, ' ')).replace(/(^|[^:'"\\])\/\/.*$/gm, '$1');
}
for (const p of allar) {
  const t = an_athugasemda(fs.readFileSync(p, 'utf8'));
  let m;
  while ((m = DAUD.exec(t))) dauðar.push(path.relative(ROOT, p).replace(/\\/g, '/') + ':' + t.slice(0, m.index).split('\n').length + '  (' + m[1] + ')');
}
// EFTIRSTÖÐULISTI, ekki samþykki — lækkaðu töluna þegar ein er löguð (110, 121 ×2, 142 þegar mælt 29.10.2026).
// 147 og 151 voru löguð í patch 490-lotunni og eru EKKI lengur hér.
const BASELINE_DAUDAR = 4;
console.log('   dauðar kt-leitir: ' + dauðar.length + ' (eftirstöðulisti ' + BASELINE_DAUDAR + ')');
if (dauðar.length > BASELINE_DAUDAR) {
  dauðar.forEach((d) => console.log('     ❗ ' + d));
  fail('NÝ dauð kennitöluleit (' + dauðar.length + ' > ' + BASELINE_DAUDAR + '): `.eq(\'kennitala\', <hrein tala>)` finnur aldrei röð því dálkurinn geymir bandstrik. ' +
    'Notaðu .or(\'kennitala.eq.\' + dash + \',kennitala.eq.\' + tala) eða NyskraningVorn.finnaKt.');
}
['js/patches/147-brunakerfi.js', 'js/patches/151-brunakerfi-doc-import.js'].forEach((f) => {
  const kodi = an_athugasemda(lesa(f));
  if (/\.eq\(\s*['"]kennitala['"]\s*,\s*kt/.test(kodi)) fail(f + ': kennitöluvörnin er dauð aftur (hrein tala borin saman við bandstrikað dálk).');
  if (!/NyskraningVorn\.leitaKt/.test(kodi)) fail(f + ': notar ekki NyskraningVorn.leitaKt — brunakerfis-skráningin leitar ekki að kennitölu sem er til.');
});

// ── 3. Ársskoðun-kassinn ──────────────────────────────────────────────────────────────────────────
const a153 = lesa('js/patches/153-arsskodun.js');
if (!/NyskraningVorn\.arsFelaKassi/.test(a153)) fail('153 kallar ekki á NyskraningVorn.arsFelaKassi — „fannst ekki á þessum lista" kassinn er horfinn.');
if (!/\$\{nvKassi\}/.test(a153)) fail('153: ${nvKassi} er ekki í sniðmáti render() — kassinn birtist ekki.');
if (!/KASSI_TOMUR\s*=\s*'<div class="nv-ars/.test(p490)) fail('patch 490: staðgengillinn KASSI_TOMUR (class="nv-ars") vantar — sameining DOM í 153 skilur kassann eftir þegar leitin er tæmd.');
const skilaTomu = (p490.match(/return KASSI_TOMUR/g) || []).length;
if (skilaTomu < 3) fail('patch 490: arsFelaKassi skilar \'\' í stað KASSI_TOMUR á ' + (3 - skilaTomu) + ' stað(i) — kassinn gamli stæði eftir.');
if (!/Arsskodun\s*=\s*\{[^}]*\bstate\b[^}]*\bsaveState\b[^}]*\bopenNewCompanyDialog\b/.test(a153)) fail('153 flytur ekki út state/saveState/openNewCompanyDialog — hnapparnir í kassanum (Hreinsa síur / Skrá nýtt) virka ekki.');

console.log('✅ GRÆNT nýskráning-kt: ' + leidir.length + ' stofnleiðir allar með kennitöluvörn · ' + dauðar.length + ' dauðar leitir (<= ' + BASELINE_DAUDAR + ') · Ársskoðun-kassinn heldur.');
