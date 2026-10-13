#!/usr/bin/env node
'use strict';
/* SVÆFÐUR PATCHI MÁ ALDREI VAKNA
 *
 * Af hverju hann er til (05.10.2026): patchi er settur í dvala með því að kommenta
 * <script>-merkið hans út í index.html. En `build-dist.js` leitaði <script>-merkja með
 * reglu sem sá EKKI athugasemdir — svo svæfður patchi var meðhöndlaður eins og lifandi
 * skrifta: staðbundin `src`, ekkert `async`, tómt meginmál = „bundleable". Hann gat því
 * lent inni í bundle og BYRJAÐ AÐ KEYRA AFTUR.
 *
 * Fjórir patchar eru í dvala. Einn þeirra er `demoseed.js`, sem sáði sýnishornsvörum
 * („Slökkvitæki 6kg ABC Duft" o.fl.) aftur inn í vörutöfluna — einmitt afritin sem
 * Agnar bað um að eyða. Annar er `24-contact-log.js`. Mælt 05.10.2026: enginn þeirra
 * hafði lekið inn í bundle — en það var HENDING, ekki vörn. Hrina af stærð 1 er send
 * út óbreytt, svo kommentmerkin umluktu hann áfram. Tveir svæfðir hlið við hlið, eða
 * svæfður næst á undan lifandi skriftu með sömu defer-stöðu, hefðu orðið hrina af
 * stærð ≥2 og farið í bundle — og þá vaknað við næsta deploy, án þess að nokkur sæi.
 *
 * REGLAN: athugasemdir eru ÓGAGNSÆJAR fyrir bundlarann. <script> inni í athugasemd er
 * texti, aldrei skrifta. Tvöfalt athugað hér: (1) statískt í build-dist.js, (2) ef
 * dist/ er byggt, að efni svæfðra skráa sé hvergi í bundlunum.
 *
 * Keyrsla: node tools/audit-svaefdir-patchar.cjs
 * Statískur hluti þarf hvorki net né lykla; dist-hlutinn er sleppt sé dist/ óbyggt.
 */
const fs = require('fs');
const path = require('path');

const rot = path.join(__dirname, '..');
const les = (p) => { try { return fs.readFileSync(path.join(rot, p), 'utf8'); } catch (_) { return ''; } };

const villur = [];
const bd = les('build-dist.js');

// ── 1. Statískt: sér bundlarinn athugasemdir? ───────────────────────────────
if (!bd) {
  villur.push('build-dist.js fannst ekki — vörðurinn getur ekki dæmt');
} else {
  const hefurSvid = /<!--\[\\s\\S\]\*\?-->|<!--[\s\S]{0,12}-->/.test(bd) && /kommentasvid|iKommenti/.test(bd);
  const sleppir = /if \(iKommenti\(m\.index\)\) continue;/.test(bd);
  if (!hefurSvid || !sleppir) {
    villur.push('build-dist.js: fann ekki vörnina sem sleppir <script> inni í athugasemd ' +
                '(`iKommenti(m.index)` í tagRe-lykkjunni). Án hennar getur svæfður patchi lent í bundle ' +
                'og byrjað að keyra aftur — demoseed.js sáði vörum sem Agnar bað um að eyða.');
  }
}

// ── 2. Hverjir eru í dvala? ─────────────────────────────────────────────────
const html = les('index.html');
const svaefd = [];
if (html) {
  const kre = /<!--[\s\S]*?-->/g; let k;
  while ((k = kre.exec(html))) {
    const sre = /<script\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/g; let s;
    while ((s = sre.exec(k[0]))) svaefd.push(s[1].split('?')[0].replace(/^\//, ''));
  }
}
const einstakir = [...new Set(svaefd)];

// ── 3. Ef dist/ er byggt: er efni þeirra hvergi í bundlunum? ───────────────
let bundlar = [];
try {
  bundlar = fs.readdirSync(path.join(rot, 'dist', 'js'))
    .filter(f => /^_bundle-.*\.js$/.test(f))
    .map(f => ({ nafn: 'dist/js/' + f, efni: fs.readFileSync(path.join(rot, 'dist', 'js', f), 'latin1') }));
} catch (_) { /* dist óbyggt — statíski hlutinn stendur samt */ }

// 13.10.2026: merkið verður að vera EINKVÆMT fyrir skrána. Áður var tekinn strengurinn í miðri skránni, og fyrir
// fimm skrár var hann almennur ("width=900,height=1100" er líka í pos.js, 11 og 165; "text-align:right;font-weight:700;"
// í 197, 27 og 418) — prófið sagði þá svæfðu pappana vaknaða þótt einkvæm auðkenni þeirra (__vertidInstalled o.fl.)
// fyndust hvergi í bundlunum. Nú er valinn sá strengur næst miðju sem kemur hvergi annars staðar fyrir í js/ né
// index.html; finnist enginn slíkur er skráin ekki dæmd (sagt frá því) frekar en að dæma á almennum streng.
const allarAdrar = (() => {
  const ut = [];
  const ganga = (d) => { let e = []; try { e = fs.readdirSync(path.join(rot, d), { withFileTypes: true }); } catch (_) {} e.forEach(x => {
    const p = d + '/' + x.name;
    if (x.isDirectory()) { if (!/^(node_modules|dist|vendor)$/.test(x.name)) ganga(p); }
    else if (/\.js$/.test(x.name)) ut.push({ p, efni: les(p) });
  }); };
  ganga('js');
  ut.push({ p: 'index.html', efni: html });
  return ut;
})();
const oalkvaemir = [];
let skodadir = 0;
if (bundlar.length) {
  einstakir.forEach(f => {
    const s = les(f);
    if (!s) return;                        // skráin er ekki til (t.d. 145) — getur ekki vaknað
    // Sérkennilegur strengur næst MIÐRI skránni sem kemur hvergi annars staðar fyrir: nafnið eitt kemur fyrir í
    // athugasemdum annarra, og almennir strengir (stílar, gluggastærðir) í öðrum, lifandi pöppum.
    // Aðeins strengir sem minnkun (esbuild) skilur eftir óbreytta: hreint ASCII, engar gæsalappir né lausnarstafir —
    // esbuild skrifar broddstafi sem \uXXXX og samræmir tilvitnanir (mælt: this.style.transform='' úr öðrum pappa).
    // Athugasemdir fyrst burt — esbuild fjarlægir þær, svo strengur úr athugasemd finnst aldrei í bundle (mælt: 04, 23, 45).
    const kodi = s.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[\s;{}()])\/\/[^\n]*/g, '$1');
    const strengir = (kodi.match(/'[^'\n]{20,60}'|"[^"\n]{20,60}"/g) || []).map(x => x.slice(1, -1))
      .filter(x => /^[A-Za-z0-9 _.,:;!?()\-\/#%=+*@&|<>\[\]{}]+$/.test(x) && /[A-Za-z]{4}/.test(x));
    // Uppsetningarverðir (window.__xxxInstalled o.fl.) eru eiginleikanöfn — minnkun styttir þau ekki, svo þau eru
    // áreiðanlegustu merkin og fara fremst. Regex á hráan kóða getur gripið bil MILLI tveggja strengja (mælt: 45).
    const verdir = [...new Set((kodi.match(/window\.(__[A-Za-z0-9_]{6,})/g) || []).map(x => x.slice(7)))];
    if (!strengir.length && !verdir.length) { oalkvaemir.push(f); return; }
    const midja = Math.floor(strengir.length / 2);
    // Texti með bilum (skilaboð, heiti) lifir minnkun óbreyttur; kóðabútar milli strengja gera það ekki (virkt:true →
    // virkt:!0 — mælt á demoseed.js). Fleiri bil fyrst, svo nálægð við miðju.
    const bil = (x) => (x.match(/ /g) || []).length;
    const rodud = verdir.concat(strengir.map((x, i) => [x, Math.abs(i - midja)])
      .sort((a, b) => (bil(b[0]) >= 2) - (bil(a[0]) >= 2) || a[1] - b[1]).map(x => x[0]));
    // allt að þrjú einkvæm merki — finnist EITT þeirra í bundle er patchinn vaknaður
    const merkin = rodud.filter(x => !allarAdrar.some(o => o.p !== f && o.efni.indexOf(x) > -1)).slice(0, 4);
    if (!merkin.length) { oalkvaemir.push(f); return; }
    skodadir++;
    const fannst = bundlar.filter(b => merkin.some(m => b.efni.indexOf(Buffer.from(m, 'utf8').toString('latin1')) > -1));
    if (fannst.length) {
      villur.push('SVÆFÐUR PATCHI ER VAKNAÐUR: ' + f + ' er í ' + fannst.map(x => x.nafn).join(', ') +
                  ' þótt <script>-merki hans sé kommentað út í index.html.');
    }
  });
}

console.log('SVÆFÐIR PATCHAR — ' + einstakir.length + ' í dvala' +
            (bundlar.length ? ', ' + skodadir + ' bornir við ' + bundlar.length + ' bundle' : ' (dist óbyggt — aðeins statísk athugun)'));
if (oalkvaemir.length) console.log('  ⚠ ekki dæmdir (enginn einkvæmur strengur): ' + oalkvaemir.join(', '));
if (!villur.length) {
  console.log('✅ GRÆNT: athugasemdir eru ógagnsæjar fyrir bundlarann og enginn svæfður patchi er í bundle.');
  process.exit(0);
}
villur.forEach(v => console.log('  ❌ ' + v));
console.log('\nRED: ' + villur.length + ' atriði. Patchi sem vaknar skrifar í gögnin án þess að nokkur bað um það.');
process.exit(1);
