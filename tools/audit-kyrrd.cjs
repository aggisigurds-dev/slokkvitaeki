#!/usr/bin/env node
/**
 * VÖRÐUR: KYRRÐ — síðan má ekki vinna þegar enginn snertir hana (HT-3.10, 03.10.2026).
 *
 * Agnar 03.10.2026: „við þurfum að fara svo mikið fram og til baka inn á prófíla."
 *
 * MÆLT á lifandi síðu (Chrome 1600 px, hreinn prófíll, tools-laus Playwright-keyrsla) FYRIR lagfæringu:
 *     Fyrirtæki í þjónustu í KYRRSTÖÐU, 8 s gluggi      2.382–3.427 ms í löngum verkum (enginn snerti neitt)
 *     endurhleðsla á Fyrirtæki í þjónustu               36.880–42.046 ms í löngum verkum, eitt þeirra 8,7–13,6 s
 *     DOM á Fyrirtæki í þjónustu                        49.000 hnútar — 41.000 þeirra í sýnum sem sjást ekki
 *     stílumferðir við endurhleðslu                     160 stk = 17.183 ms, ~2.650 stök í hverri
 * og EFTIR (sama vél, sama aðferð, sömu gögn):
 *     kyrrstaða 0 ms · endurhleðsla 6.068–6.760 ms · DOM 8.100 · opna prófíl 4.830 → 1.410 ms · til baka 4.226 → 606 ms
 *
 * Fjórar rætur — hver þeirra er varin hér, því hver þeirra kemur aftur um leið og einhver gleymir henni:
 *
 * 1. SKRIF Á SAMA GILDI. Klukkan setti textContent = "21:12" á sekúndu fresti. Vafrinn skráir það sem DOM-breytingu,
 *    allar ~150 vaktir á document.body vakna og skanna síðuna. 440-kyrrd stöðvar slík skrif áður en þau ná DOM-inu.
 * 2. :has() Á RÓTINNI. `html:has(#view-sala.active) …`, `body:has(#cg-sk-trigger) …`, `html:is(…,:has(>body.appmode))`
 *    og `#companies-main:has(.co-banner) …` gera rótina (eða allan prófílinn) að akkeri sem HVER DOM-breyting ógildir;
 *    vafrinn endurreiknar þá stíl á öllum stökum sem einhver :has()-regla nefnir. Sömu skilyrði eru nú klasar sem
 *    440 heldur réttum með óinngjafaðri vakt (fyrir málun, engin millistaða).
 * 3. FALDAR SÝNIR SMÍÐAÐAR. Companies.render() teiknaði 1.217 spjöld + töflu (28.000 hnúta) og Field.render() 1.800
 *    spjöld (12.500 hnúta) inn í sýnir sem enginn sá; 174 fraus í 14 s við að sía spjöldin (las getComputedStyle
 *    strax á eftir skrifi, 1.217 sinnum).
 * 4. ÚTLITSLESTUR Í HVERJUM RAMMA. 409 (titill), 353 (zoom) og 341 (breidd hliðarstiku) lásu útlit eftir hverja
 *    DOM-breytingu; hver lestur þvingar fulla stílumferð.
 *
 * SOURCE-only, engin net-köll. Fall: exit 1.
 */
const fs = require('fs');
const path = require('path');

const ROT = path.join(__dirname, '..');
const lesa = rel => fs.readFileSync(path.join(ROT, rel), 'utf8');
const villur = [];
const krefst = (rel, re, skilabod) => {
  let t;
  try { t = lesa(rel); } catch (e) { villur.push(rel + ': vantar skrá — ' + skilabod); return; }
  if (!re.test(t)) villur.push(rel + ': ' + skilabod);
};
const bannar = (rel, re, skilabod) => {
  let t;
  try { t = lesa(rel); } catch (e) { return; }
  if (re.test(t)) villur.push(rel + ': ' + skilabod);
};

// ── 1 · skrifvörnin og klasavaktin eru til og hlaðnar á réttum stað ────────────────────────────────────────────────
const idx = lesa('index.html');
if (!/252-mo-throttle\.js[^\n]*\n(?:[^\n]*\n){0,2}[^\n]*<script src="\/js\/patches\/440-kyrrd\.js/.test(idx.replace(/\r/g, ''))) {
  villur.push('index.html: 440-kyrrd.js verður að hlaðast strax á eftir 252-mo-throttle.js (ekki defer) — annars vantar klasana við fyrstu teikningu');
}
krefst('js/patches/440-kyrrd.js', /Object\.defineProperty\(Node\.prototype, 'textContent'/, 'textContent-vörnin er farin — klukkan vekur aftur allar vaktir á sekúndu fresti');
krefst('js/patches/440-kyrrd.js', /Element\.prototype\.setAttribute = function/, 'setAttribute-vörnin er farin');
krefst('js/patches/440-kyrrd.js', /UNDANSKILID = \{[^}]*\bsrc: 1[^}]*\bhref: 1/, 'src/href verða að vera undanskilin skrifvörninni (sama gildi ENDURHLEÐUR iframe/mynd)');
for (const [klasi, hver] of [['syn-sala', '327/344'], ['hefur-cg', '391'], ['likami-app', '410/402'], ['co-opid', '338/402/411/412/413'], ['smx-hysill', '359']]) {
  krefst('js/patches/440-kyrrd.js', new RegExp("'" + klasi + "'"), '440 heldur ekki lengur klasanum ' + klasi + ' — reglurnar í ' + hver + ' hætta þá að gilda');
}
krefst('js/patches/440-kyrrd.js', /__NativeMutationObserver/, 'klasavaktin verður að vera ÓINNGJÖFUÐ (fyrir málun) — annars sést einn rammi með röngu útliti');
// rofinn má aðeins slökkva á skrifvörninni, ekki klösunum
(() => {
  let t; try { t = lesa('js/patches/440-kyrrd.js'); } catch (_) { return; }
  const iRofi = t.indexOf("localStorage.getItem('kyrrd_off')"), iKlasi = t.indexOf("setja('syn-sala'");
  if (iRofi < 0 || iKlasi < 0 || iKlasi > iRofi) villur.push('js/patches/440-kyrrd.js: kyrrd_off-rofinn má ekki standa Á UNDAN klasavaktinni — hann slökkti þá líka á reglum 327/344/391/410');
})();

// ── 2 · engin :has() á rótinni eða á #companies-main ───────────────────────────────────────────────────────────────
const AKKERI = /(?:^|[\s,'"`(])(?:html|body|:root)(?:\[[^\]]*\]|\.[\w-]+|#[\w-]+|:not\([^()]*\)|:is\([^()]*\))*:has\(|:has\(\s*>\s*body\b|#companies-main(?:\.[\w-]+)*:has\(/;
const skrar = [];
(function ganga(dir) {
  for (const n of fs.readdirSync(path.join(ROT, dir))) {
    const rel = dir + '/' + n;
    const st = fs.statSync(path.join(ROT, rel));
    if (st.isDirectory()) { if (n !== 'node_modules') ganga(rel); }
    else if (/\.(js|css)$/.test(n)) skrar.push(rel);
  }
})('js');
for (const n of fs.readdirSync(path.join(ROT, 'css'))) if (/\.css$/.test(n)) skrar.push('css/' + n);
for (const rel of skrar) {
  if (rel === 'js/patches/440-kyrrd.js') continue;
  const L = lesa(rel).split(/\r?\n/);
  let iBlokk = false;
  for (let i = 0; i < L.length; i++) {
    let l = L[i];
    const s = l.trim();
    if (iBlokk) { if (s.includes('*/')) iBlokk = false; continue; }
    if (s.startsWith('/*') && !s.includes('*/')) { iBlokk = true; continue; }
    if (s.startsWith('*') || s.startsWith('//') || s.startsWith('/*')) continue;
    l = l.replace(/(^|\s)\/\/.*$/, '');                // athugasemd aftast í línu
    if (AKKERI.test(l)) villur.push(rel + ':' + (i + 1) + ': :has() á <html>/<body>/#companies-main — hver DOM-breyting ógildir þá stíl alls skjalsins (eða alls prófílsins). Notaðu klasa sem 440-kyrrd heldur réttum. → ' + s.slice(0, 110));
  }
}

// ── 3 · faldar sýnir eru ekki smíðaðar ─────────────────────────────────────────────────────────────────────────────
krefst('js/features.js', /if \(_syn && !_syn\.classList\.contains\('active'\)\) \{ this\._gridStale = true; this\._vaktaSyn\(_syn\); return; \}/, 'Companies.render() teiknar aftur 28.000 hnúta inn í FALDA sýn');
krefst('js/features.js', /_vaktaSyn: function/, '_vaktaSyn vantar — listinn „Fyrirtæki" stæði auður þegar sýnin er opnuð (431 sleppir endursókn, enginn kallar á render)');
krefst('js/features.js', /if \(self\.currentId != null \|\| self\._detailOpen\(\)\) return;/, '_vaktaSyn má ekki teikna gridið þegar verið er að opna prófíl (currentId sett af _openCompanySafe)');
bannar('js/modal.js', /if\s*\(\s*!this\._fieldRendered\s*\|\|/, '„fyrsta teikning alltaf" er komin aftur — Þjónustutæki (12.500 hnútar) smíðuð inn í falda sýn við hverja ræsingu');
krefst('js/patches/174-fyrirtaeki-stada.js', /const verk = \[\];[\s\S]{0,900}verk\.forEach\(/, '174 verður að LESA öll spjöld fyrst og SKRIFA svo — víxlun las getComputedStyle eftir hvert skrif (14 s frysting)');

// ── 4 · útlitslestur ekki í hverjum ramma ──────────────────────────────────────────────────────────────────────────
krefst('js/patches/409-samraeming-sidna.js', /if \(cur && nu - sidastMat < 300\) cand = cur;/, '409 endurmetur merktan titil aftur í HVERJUM ramma (getBoundingClientRect → þvinguð stílumferð)');
krefst('js/patches/353-simi-krom-zoom.js', /const Z = \(\) => \(_z \|\| \(_z = active \? elZoom\(active\) : 1\)\);/, '353 mælir zoom aftur í hverri umferð, líka á tölvu þar sem það er ekki notað');
krefst('js/patches/341-ars-skjar-scroll-left.js', /if \(lykill === _railLykill && nu - _railT < 2000\) return _railW;/, '341 mælir breidd hliðarstikunnar aftur eftir hverja DOM-breytingu');

// ── 5 · púlsar sem skrifa: aðeins þegar gildið breytist ────────────────────────────────────────────────────────────
krefst('js/patches/15-sidebar-counts.js', /if \(LITIR\.some\(c => \(c === vil\) !== badge\.classList\.contains\(c\)\)\)/, '15 skiptir aftur um klasa á merkinu við hverja talningu (remove+add = tvær stílumferðir)');
krefst('js/mobilenav.js', /\/position:\\s\*fixed\/\.test\(btn\.style\.cssText\)/, 'mobilenav: vörnin verður að þola bilið í "position: fixed" — annars er stíllinn endurskrifaður í hverju tifi');
krefst('js/patches/331-ars-phone-skjar.js', /if \(document\.documentElement\.dataset\.arsSjon !== mode\)/, '331 skrifar data-ars-sjon á <html> í hverri umferð');
krefst('js/patches/169-logo-customization.js', /setTimeout\(poll, _tries\+\+ < 120 \? 800 : 2500\)/, '169: púlsinn má ekki hætta — logo-ramminn kæmi þá aldrei ef Stillingar eru opnaðar > 96 s eftir hleðslu');

// ── 6 · samanburður við innerHTML er ekki vörn (05.10.2026) ────────────────────────────────
// `if (t.innerHTML !== strengur) t.innerHTML = strengur` er ALLTAF satt þegar strengurinn ber <svg><path …/></svg> — vafrinn
// skilar <path …></path>. 405 endurskrifaði því Teikning-takkann í hverri umferð → endalaus vaktahringur á hverjum prófíl
// með teikningu (mælt á lifandi: 2.475 löng verk á 5 mín, tímamælar sveltir, sjálfvistun teikningagluggans fór aldrei af stað).
bannar('js/patches/405-efsta-rod.js', /t\.innerHTML !== label/, '405 ber innerHTML saman við eigin streng — alltaf ósatt jafnt, takkinn endurskrifaður í hverri umferð (endalaus hringur)');
krefst('js/patches/405-efsta-rod.js', /t\._b405Label !== label/, '405 verður að bera saman við strenginn sem var síðast settur (t._b405Label)');
krefst('js/patches/00-legacy.js', /if \(main\.dataset\._pmDeleteSkipped !== '1'\) main\.dataset\._pmDeleteSkipped = '1';/, '00-legacy skrifar data-_pm-delete-skipped á #companies-main í hverri umferð (eigindabreyting þótt gildið sé eins)');
// ── 7 · sá sem hlustar á eigin gám má ekki endursmíða innihald hans í hverri umferð (05.10.2026) ──────────
// 109 (teikningarborðinn á prófílnum) tæmdi yfirlag tækjapunktanna og smíðaði það aftur í hverri umferð, inni í
// #companies-main sem það vaktar sjálft: hringur á 250 ms fresti. Mælt á lifandi (Arnarhvoll, prófíll í kyrrstöðu):
// 81 DOM-breyting og 53 löng verk / 3.903 ms á 8 s. Nú er borið saman við fingrafar þess sem síðast var teiknað.
krefst('js/patches/109-floorplan-banner.js', /if \(overlay\._fpbSig === sig\) return;\s+overlay\._fpbSig = sig;\s+overlay\.innerHTML = '';/, '109 má aðeins endursmíða tækjapunkta borðans þegar fingrafarið (fyrirtæki, merki, stærðir) hefur breyst');
krefst('js/patches/109-floorplan-banner.js', /vp\.querySelectorAll\('\._fpb-empty'\)\.forEach\(e => e\.remove\(\)\);/, '109 verður að fjarlægja eldri „Engir tækjadottar“ reit áður en nýr er settur — annars hlaðast þeir upp');

if (villur.length) {
  console.log('RED  KYRRÐ — ' + villur.length + ' brot:\n  · ' + villur.join('\n  · '));
  process.exit(1);
}
console.log('KYRRÐ GRÆNT — skrifvörn + klasavakt hlaðnar, engin :has() á rót/prófíl (' + skrar.length + ' skrár lesnar), faldar sýnir ekki smíðaðar, útlitslestur ekki í hverjum ramma.');
process.exit(0);
