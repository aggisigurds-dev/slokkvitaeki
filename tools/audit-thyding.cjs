#!/usr/bin/env node
'use strict';
/* ÞÝÐING — skrá sem þýðist ekki deyr ÞEGJANDI í vafranum.
 *
 * Af hverju þessi vörður er til (20.11.2026): í athugasemd inni í CSS-sniðstreng í
 * js/patches/56-global-search.js stóð orðið order innan bakkviða. Bakkviðið lokaði sniðstrengnum,
 * restin af skránni varð að rugli og hún þýddist ekki. Afleiðingin í vafranum: PLÁSTURINN ER
 * EINFALDLEGA EKKI TIL. Enginn hnappur, engin leit, engin villa sem notandinn sér — aðeins lína
 * í villuskránni sem enginn les. Hver plástur er sín eigin skrá, svo hinir 150 halda áfram og
 * ekkert bendir til þess að eitthvað vanti.
 *
 * Prófin gripu þetta tilvik (24 féllu í einu), en aðeins af því að 56 á sér próf. Flestar skrár
 * eiga ekkert próf. Þessi vörður les hverja einustu skrá og þýðir hana — án þess að KEYRA hana.
 *
 * Mælir: js/**.js og netlify/functions/*.cjs hér og í systur-repóinu (Brunahólf, sé það við hliðina).
 * Vafraskrár eru þýddar sem venjulegt skriftumál, Netlify-föllin sem CommonJS-eining (`require`,
 * `module` o.s.frv. mega standa). Ekkert er keyrt: vm.Script þýðir aðeins.
 *
 * GRÆNT þegar allar skrár þýðast. RAUTT = skrá sem er dauð í loftinu. Þýðingarvilla á sér engan
 * LEYFT-lista — hún er alltaf villa. Það eina sem er sleppt eru aðkeypt söfn (SLEPPA, bundið við
 * skráarheiti) og möppur sem eru ekki okkar kóði; sá listi má aldrei vaxa til að þagga niður rautt.
 *
 * Keyrsla:  node tools/audit-thyding.cjs
 */
const fs = require('fs');
const path = require('path');
const vm = require('node:vm');
const { execFileSync } = require('node:child_process');

const ROOT = path.join(__dirname, '..');

function finnaSystur() {
  const frambod = [
    process.env.BRUNAHOLF_ROOT,
    path.join(ROOT, '..', 'brunaholf'),
    path.join(ROOT, '.sister', 'brunaholf'),
  ].filter(Boolean);
  return frambod.find((p) => fs.existsSync(path.join(p, 'netlify', 'functions'))) || null;
}

// Aðkeypt söfn eru ekki á okkar ábyrgð og sum eru þjöppuð í eina línu sem tekur tíma að þýða.
// Söfnin eru bundin við SKRÁARHEITIÐ, ekki undirstreng í slóðinni: „js/patches/4xx-xlsx-utflutningur.js"
// hefði annars verið sleppt ÞEGJANDI — og skrá sem vörður sleppir er skrá sem enginn mælir.
const SLEPPA = /(^|\/)(node_modules|dist|graphify-out|vendor|backups|_attic|\.git|\.sister|test-results|\.claude)(\/|$)|\.min\.js$|(^|\/)(jspdf|pdf\.worker|leaflet|qrcode|html2canvas|xlsx)[\w.-]*\.(js|cjs|mjs)$/i;

function skrar(rot, undir, endir) {
  const ut = [];
  (function ganga(dir, dypt) {
    let efni;
    try { efni = fs.readdirSync(dir, { withFileTypes: true }); } catch (_) { return; }
    for (const e of efni) {
      const full = path.join(dir, e.name);
      const rel = path.relative(rot, full).split(path.sep).join('/');
      if (SLEPPA.test(rel)) continue;
      if (e.isDirectory()) { if (dypt < 8) ganga(full, dypt + 1); continue; }
      if (endir.test(e.name)) ut.push(rel);
    }
  })(path.join(rot, undir), 0);
  return ut;
}

// Rótar-package.json segir `"type": "module"`, svo .js-skrá undir netlify/functions er ES-eining
// (import/export á efsta borði). vm.Script þýðir aðeins venjulegt skriftumál, svo þær fara um
// `node --check`, sem les sömu reglu og Node sjálft. Vafraskrárnar í js/ eru EKKI einingar —
// þær eru sendar í <script> og mega því ekki fara þessa leið.
function thydaEiningu(full) {
  try {
    // timeout: --check þýðir aðeins og hangir ekki í reynd, en hangandi próf hefur gert CI rautt
    // í þessu repói áður (test/vord.test.js, 17.11.2026). Ódýr vörn.
    execFileSync(process.execPath, ['--check', full], { stdio: ['ignore', 'ignore', 'pipe'], timeout: 15000 });
    return null;
  } catch (e) {
    const ut = String((e && e.stderr) || e.message || '');
    const m = ut.match(/^(?:.*?):(\d+)\n[\s\S]*?\n(\w*Error: .*)$/m) || ut.match(/(\w*Error: .*)/);
    return { villa: (m && (m[2] || m[1])) || ut.split('\n').slice(0, 2).join(' ').trim(), lina: m && m[2] ? Number(m[1]) : null };
  }
}

function thyda(rot, rel, einingarhjupur) {
  const full = path.join(rot, rel);
  let txt;
  try { txt = fs.readFileSync(full, 'utf8'); } catch (e) { return { rel, villa: 'las ekki: ' + e.message }; }
  if (!txt.trim()) return null;
  // Node fjarlægir #!-línuna þegar skrá er hlaðin; vm.Script gerir það ekki. Skipt út fyrir
  // auða línu (ekki felld burt) svo línunúmer í villuboðum haldist rétt.
  if (txt.charCodeAt(0) === 35 && txt.charCodeAt(1) === 33) txt = txt.replace(/^[^\n]*/, '');
  // CommonJS-skrár vísa í require/module/exports á efsta borði — þær eru þýddar eins og Node gerir,
  // inni í falli með sömu breytunöfnum. Ekkert er keyrt, svo hjúpurinn hefur engin áhrif önnur.
  const kodi = einingarhjupur ? '(function (exports, require, module, __filename, __dirname) {\n' + txt + '\n});' : txt;
  try {
    new vm.Script(kodi, { filename: full });
    return null;
  } catch (e0) {
    // ES-eining fellur alltaf á vm.Script („Unexpected token 'export'"). Væri það talið villa
    // yrði vörðurinn RAUÐUR Á RÉTTUM KÓÐA daginn sem slík skrá kemur undir js/ — og rautt CI er
    // póstur til Agnars. Fallið er því endurtekið með node --check, sem les sömu reglu og Node.
    // Þetta getur aðeins breytt fölsku rauðu í grænt, aldrei öfugt.
    if (/Unexpected token 'export'|Cannot use import statement|await is only valid/.test(e0.message || '')) {
      const r = thydaEiningu(full);
      return r ? Object.assign({ rel }, r) : null;
    }
    const e = e0;
    const lina = (e.stack || '').split('\n').find((l) => l.indexOf(full) > -1) || '';
    const nr = (lina.match(/:(\d+)(?::\d+)?$/) || [])[1];
    return { rel, villa: e.message, lina: nr ? Number(nr) - (einingarhjupur ? 1 : 0) : null };
  }
}

function mæla(rot, merki) {
  const brot = [];
  let talid = 0;
  for (const rel of skrar(rot, 'js', /\.(js|mjs)$/)) {
    talid++;
    const f = thyda(rot, rel, false);
    if (f) brot.push(Object.assign({ repo: merki }, f));
  }
  for (const rel of skrar(rot, path.join('netlify', 'functions'), /\.(cjs|js|mjs)$/)) {
    talid++;
    const f = /\.cjs$/.test(rel)
      ? thyda(rot, rel, true)
      : (() => { const r = thydaEiningu(path.join(rot, rel)); return r && Object.assign({ rel }, r); })();
    if (f) brot.push(Object.assign({ repo: merki }, f));
  }
  for (const undir of ['tools', 'test']) {
    for (const rel of skrar(rot, undir, /\.cjs$/)) {
      talid++;
      const f = thyda(rot, rel, true);
      if (f) brot.push(Object.assign({ repo: merki }, f));
    }
  }
  return { talid, brot };
}

const SYSTIR = finnaSystur();
const minn = mæla(ROOT, 'sl');
const henn = SYSTIR ? mæla(SYSTIR, 'bh') : { talid: 0, brot: [] };
const brot = minn.brot.concat(henn.brot);
const talid = minn.talid + henn.talid;

if (brot.length) {
  for (const f of brot) console.log(`   ✗ ${f.repo} ${f.skra || f.rel}${f.lina ? ':' + f.lina : ''}  ${f.villa}`);
  console.log(`RAUTT þýðing: ${brot.length} skrá/skrár þýðast ekki. Í vafranum þýðir það að plásturinn ` +
    'ER EKKI TIL — enginn hnappur, engin virkni, engin villa sem notandinn sér. Lagaðu strax; ' +
    'þýðingarvilla á sér engan undanþágulista.');
  process.exit(1);
}
console.log(`✅ GRÆNT þýðing: ${talid} skrár þýðast` +
  (SYSTIR ? ' · Brunahólf lesið með' : ' · ⚠ Brunahólf ekki við hliðina — aðeins þetta repó lesið'));
