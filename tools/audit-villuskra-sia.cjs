#!/usr/bin/env node
'use strict';
/* VILLUSKRÁ — SÍAN MÁ ALDREI ÞAGGA VIÐSKIPTAATVIK
 *
 * Af hverju hann er til (05.10.2026): `app_problems` var orðin ólæsileg. Á 30 dögum
 * báru 751 færslur `Claude/` í user-agent — agentar (ég sjálfur og aðrar lotur) að
 * prófa síðuna — og 184 komu frá höfuðlausum X11-vafra. Níu af hverjum tíu merkjum
 * voru hávaði, svo enginn las listann, og þar undir lágu 21 `payday_xml_hafnad` og
 * 10 `sala_krafa_an_kunna` sem eru peningar.
 *
 * Fyrsta útfærslan mín ætlaði að sía á TÆKI — sleppa öllu frá agenta-UA. Mælingin
 * stoppaði það: X11-vafrinn bar LÍKA `payday_xml_hafnad` ×2. Sía á tæki hefði hent
 * raunverulegu viðskiptaatviki þegjandi, og það er verra en hávaðinn.
 *
 * REGLAN: sían í 309 (`SJALFGRIPID`) má aðeins innihalda tegundir sem vafrinn grípur
 * SJÁLFKRAFA — `js_error` og `promise_rejection` úr window-hlustörunum. Tegund sem
 * kóðinn skráir vísvitandi með `logProblem('eitthvad_failed', …)` er alltaf atvik sem
 * einhver valdi að skrá, og má ALDREI hverfa af því að vélmenni var við lyklaborðið.
 *
 * Rautt þegar: tegund sem er skráð einhvers staðar utan hlustaranna er komin í
 * SJALFGRIPID, eða sían er orðin að tækjasíu (THROUN/VELMENNI notað án tegundar).
 *
 * Keyrsla: node tools/audit-villuskra-sia.cjs
 * Static — þarf hvorki net né lykla.
 */
const fs = require('fs');
const path = require('path');

const rot = path.join(__dirname, '..');
const SKRA = 'js/patches/309-problem-registry.js';
const s = (() => { try { return fs.readFileSync(path.join(rot, SKRA), 'utf8'); } catch (_) { return ''; } })();

const villur = [];
if (!s) villur.push(SKRA + ': skráin fannst ekki — vörðurinn getur ekki dæmt');

// ── 1. Hvað er í síunni? ────────────────────────────────────────────────────
const mSia = s.match(/var\s+SJALFGRIPID\s*=\s*\{([^}]*)\}/);
if (!mSia && s) {
  villur.push(SKRA + ': fann ekki `SJALFGRIPID` — hefur sían verið endurnefnd? ' +
              'Hún er eini staðurinn sem vörðurinn getur dæmt, svo endurnefning má ekki vera þegjandi.');
}
const siadar = mSia
  ? (mSia[1].match(/[A-Za-z_][A-Za-z0-9_]*(?=\s*:)/g) || [])
  : [];

// ── 2. Hvaða tegundir grípur vafrinn sjálfkrafa? ────────────────────────────
// Svæðið frá fyrsta window.addEventListener til loka skrárinnar — þar liggja
// error/unhandledrejection-hlustararnir og ekkert annað skráir þar.
const iHlust = (() => {
  const i = s.indexOf("window.addEventListener('error'");
  return i < 0 ? '' : s.slice(i);
})();
if (s && !iHlust) {
  villur.push(SKRA + ": fann ekki window.addEventListener('error') — sjálfvirka griparnir eru farnir, " +
              'þá á sían ekkert erindi lengur.');
}
const teg = (txt) => {
  const ut = new Set();
  const re = /logProblem\(\s*'([a-z_]+)'/g;
  let m; while ((m = re.exec(txt))) ut.add(m[1]);
  return ut;
};
const sjalfgripnar = teg(iHlust);

// ── 3. Hvaða tegundir skráir kóðinn VÍSVITANDI, annars staðar? ──────────────
const MOPPUR = ['js', 'netlify/functions', 'tools'];
const skrar = [];
(function safna(d) {
  let f = []; try { f = fs.readdirSync(path.join(rot, d), { withFileTypes: true }); } catch (_) { return; }
  f.forEach(e => {
    const p = d + '/' + e.name;
    if (e.isDirectory()) { if (e.name !== 'node_modules' && e.name !== 'dist') safna(p); return; }
    if (/\.(js|cjs|mjs)$/.test(e.name)) skrar.push(p);
  });
})('');
const visvitandi = new Map();   // tegund → skrár
skrar.filter(p => MOPPUR.some(m => p.replace(/^\//, '').startsWith(m))).forEach(p => {
  let t = ''; try { t = fs.readFileSync(path.join(rot, p), 'utf8'); } catch (_) { return; }
  // Hlustara-svæðið í 309 er sjálfvirkt, ekki vísvitandi — sleppum því.
  if (p.replace(/^\//, '') === SKRA) t = iHlust ? t.slice(0, t.indexOf(iHlust)) : t;
  teg(t).forEach(k => {
    if (!visvitandi.has(k)) visvitandi.set(k, []);
    visvitandi.get(k).push(p.replace(/^\//, ''));
  });
});

// ── 4. Dómurinn ─────────────────────────────────────────────────────────────
siadar.forEach(k => {
  if (visvitandi.has(k)) {
    villur.push('`' + k + '` er í SJALFGRIPID en kóðinn skráir hana VÍSVITANDI í ' +
                visvitandi.get(k).join(', ') + ' — vísvitandi skráning er atvik sem einhver valdi ' +
                'að skrá og má ekki þagga af því að vélmenni var við lyklaborðið.');
  } else if (sjalfgripnar.size && !sjalfgripnar.has(k)) {
    villur.push('`' + k + '` er í SJALFGRIPID en hún kemur ekki úr window-hlustörunum — ' +
                'sían á aðeins við tegundir sem vafrinn grípur sjálfkrafa.');
  }
});

// Sían verður að vera OG-tengd við tegund, aldrei tækið eitt.
if (s && !/VELMENNI\s*&&\s*SJALFGRIPID\[/.test(s)) {
  villur.push(SKRA + ': vélmenna-vörnin er ekki lengur `VELMENNI && SJALFGRIPID[kind]` — ' +
              'sía á tæki eingöngu hendir viðskiptaatvikum (X11-vafrinn bar payday_xml_hafnad ×2).');
}

console.log('VILLUSKRÁ — SÍAN (' + siadar.length + ' tegundir síaðar, ' +
            visvitandi.size + ' vísvitandi tegundir í kóðanum)');
if (!villur.length) {
  console.log('✅ GRÆNT: sían tekur aðeins ' + (siadar.join(', ') || '—') +
              ' — sjálfvirku griparnir — og er tegundarbundin, ekki tækjabundin.');
  process.exit(0);
}
villur.forEach(v => console.log('  ❌ ' + v));
console.log('\nRED: ' + villur.length + ' atriði. Þögguð viðskiptaatvik sjást ekki fyrr en einhver spyr.');
process.exit(1);
