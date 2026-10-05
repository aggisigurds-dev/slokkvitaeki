#!/usr/bin/env node
/**
 * VÖRÐUR: ALLIR SÍMAR FÁ SÖMU ÚTGÁFU — BREITT ÚTLIT Í APP-HAM (index.html <head> + viewport-verðirnir)
 *
 * Agnar 05.10.2026: „einn starfsmaður er með fasta einhverja gamla útfærslu af brunakerfis skoðun" · „aðalútgáfan er
 * ekki svona grá" · „vil ekki gráu útgáfuna, það á bara að nota núverandi útgáfu af appinu".
 * Öppin eru hönnuð á síma í „Tölvusíðu"-ham Chrome (layout 980 px). Sími sem var EKKI í þeim ham fékk mjóa varaútlitið
 * (385: spjöld, 418: engin Brunastál-húð undir 901 px) — stilling í Chrome á hverjum síma réð útgáfunni.
 * Nú setur <head> viewport-ið á 980 px á snertisíma í app-ham og geymir það í window.__HUB_VP.
 *
 * Gildran sem þessi vörður ver: SEX patchar neyða viewport-ið aftur á width=device-width (166, 261, 331, 333, 336, 410)
 * og tveir þeirra (336, 410) telja tölulega breidd „læsingu" og skrifa yfir hana. Gleymi einn þeirra window.__HUB_VP
 * hoppar síminn milli útlita. Mælt í hermun (E:\pascal-profun\breidd-prof.cjs): venjulegur sími 412 dp endar á
 * innerWidth 980, króm 2,38, tafla + 418-húð — sama og Tölvusíðu-hamur — og viewport-ið stendur 15 s síðar.
 * Les aðeins kóðann (ekkert net, engir lyklar).
 */
const fs = require('fs');
const path = require('path');
const rot = path.join(__dirname, '..');
const les = p => fs.readFileSync(path.join(rot, p), 'utf8').replace(/\r/g, '');
const villur = [];
const krefst = (src, re, skilabod) => { if (!re.test(src)) villur.push(skilabod); };

const idx = les('index.html');
const iMeta = idx.indexOf('<meta name="viewport"'), iHub = idx.indexOf("window.__HUB_VP = 'width=980, user-scalable=yes, viewport-fit=cover';"), iDefer = idx.indexOf('<script defer');
if (iMeta < 0 || iHub < 0) villur.push('index.html: <head> verður að setja window.__HUB_VP = width=980 á snertisíma í app-ham');
else if (!(iMeta < iHub && iHub < iDefer)) villur.push('index.html: breiddin verður að vera ákveðin STRAX á eftir viewport-meta og á undan öllum defer-skriftum — annars er fyrsta uppsetning mjó og verðirnir lesa tómt gildi');
krefst(idx, /if \(!app \|\| app === 'bilstjori'\) return;/, 'index.html: breitt útlit á aðeins við í app-ham og ALDREI í Bílstjóranum (219 er hannaður mjór)');
krefst(idx, /if \(localStorage\.getItem\('simi_breidd'\) === 'mjo'\) return;/, 'index.html: ?breidd=mjo (localStorage.simi_breidd) verður að slökkva á breiða útlitinu á því tæki');
krefst(idx, /matchMedia\('\(pointer: coarse\)'\)\.matches \|\| \(\(navigator\.maxTouchPoints \|\| 0\) > 1 && matchMedia\('\(hover: none\)'\)\.matches\)/, 'index.html: snertitæki verður að vera skilgreint eins og touchPrimary í 353 — annars eru breiddin og króm-skalinn ósammála');
krefst(idx, /if \(\(window\.innerWidth \|\| 0\) >= 901\) return;/, 'index.html: sími sem er þegar breiður (Tölvusíðu-hamur) á að vera ósnertur');

// hver vörður verður að lesa valið
[['js/patches/166-krofu-yfirlit.js', /const open = window\.__HUB_VP \|\| 'width=device-width/],
 ['js/patches/261-app-profiles.js', /var HUB_VP = window\.__HUB_VP \|\| 'width=device-width/],
 ['js/patches/331-ars-phone-skjar.js', /const ZOOM = window\.__HUB_VP \|\| 'width=device-width[^\n]*\n\s*const HUB_VP = window\.__HUB_VP \|\| 'width=device-width/],
 ['js/patches/333-app-page-zoom.js', /const HUB_VP = window\.__HUB_VP \|\| 'width=device-width/],
 ['js/patches/336-viewport-brunaholf-zoom.js', /const HUB_VP = window\.__HUB_VP \|\| 'width=device-width/],
 ['js/patches/410-simi-yfirferd.js', /const OPEN = window\.__HUB_VP \|\| 'width=device-width/]
].forEach(([p, re]) => krefst(les(p), re, p.replace('js/patches/', '') + ': viewport-vörðurinn verður að nota window.__HUB_VP þegar það er sett — annars skrifar hann width=device-width yfir breiða útlitið'));
// tveir telja tölulega breidd læsingu — valið verður að vera undanþegið
krefst(les('js/patches/336-viewport-brunaholf-zoom.js'), /if \(window\.__HUB_VP && c === String\(window\.__HUB_VP\)\.toLowerCase\(\)\.replace\(\/\\s\+\/g, ''\)\) return false;/, '336: locked() má ekki telja breiða útlitið (width=980) læsingu — sync() skrifaði það þá aftur við hverja keyrslu');
krefst(les('js/patches/410-simi-yfirferd.js'), /if \(window\.__HUB_VP && c === window\.__HUB_VP\) return false;/, '410: vpLaest() má ekki telja breiða útlitið (width=980) læsingu');
// nýr vörður á viewport-ið sem þekkir ekki valið? (harðkóðað width=device-width skrifað á meta utan þekktu skránna)
const thekkt = new Set(['166-krofu-yfirlit.js', '219-bilstjori.js', '261-app-profiles.js', '331-ars-phone-skjar.js', '333-app-page-zoom.js', '336-viewport-brunaholf-zoom.js', '410-simi-yfirferd.js']);
const dir = path.join(rot, 'js', 'patches');
fs.readdirSync(dir).filter(f => /\.js$/.test(f) && !thekkt.has(f)).forEach(f => {
  const s = fs.readFileSync(path.join(dir, f), 'utf8');
  if (/name=["']?viewport/.test(s) && /setAttribute\(\s*['"]content['"]/.test(s)) villur.push(f + ': skrifar á viewport-meta — verður að nota window.__HUB_VP (breitt útlit á síma) og bætast á listann í þessum verði');
});

if (villur.length) { console.log('RED  SÍMI-BREIDD — ' + villur.length + ' brot:\n  · ' + villur.join('\n  · ')); process.exit(1); }
console.log('SÍMI-BREIDD GRÆNT — <head> velur 980 px á snertisíma í app-ham (ekki Bílstjóri, ekki ?breidd=mjo) og allir sex viewport-verðirnir virða valið.');
process.exit(0);
