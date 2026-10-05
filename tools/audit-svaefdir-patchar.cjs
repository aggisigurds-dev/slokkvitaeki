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

let skodadir = 0;
if (bundlar.length) {
  einstakir.forEach(f => {
    const s = les(f);
    if (!s) return;                        // skráin er ekki til (t.d. 145) — getur ekki vaknað
    // Sérkennilegur strengur úr MIÐRI skránni: nafnið eitt kemur fyrir í athugasemdum annarra.
    const strengir = (s.match(/'[^'\n]{20,60}'|"[^"\n]{20,60}"/g) || []).map(x => x.slice(1, -1));
    if (!strengir.length) return;
    const merki = strengir[Math.floor(strengir.length / 2)];
    skodadir++;
    const fannst = bundlar.filter(b => b.efni.indexOf(Buffer.from(merki, 'utf8').toString('latin1')) > -1);
    if (fannst.length) {
      villur.push('SVÆFÐUR PATCHI ER VAKNAÐUR: ' + f + ' er í ' + fannst.map(x => x.nafn).join(', ') +
                  ' þótt <script>-merki hans sé kommentað út í index.html.');
    }
  });
}

console.log('SVÆFÐIR PATCHAR — ' + einstakir.length + ' í dvala' +
            (bundlar.length ? ', ' + skodadir + ' bornir við ' + bundlar.length + ' bundle' : ' (dist óbyggt — aðeins statísk athugun)'));
if (!villur.length) {
  console.log('✅ GRÆNT: athugasemdir eru ógagnsæjar fyrir bundlarann og enginn svæfður patchi er í bundle.');
  process.exit(0);
}
villur.forEach(v => console.log('  ❌ ' + v));
console.log('\nRED: ' + villur.length + ' atriði. Patchi sem vaknar skrifar í gögnin án þess að nokkur bað um það.');
process.exit(1);
