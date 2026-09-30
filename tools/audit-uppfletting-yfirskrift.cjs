#!/usr/bin/env node
/* Öryggisnet — uppfletting má ekki eyða texta sem einhver skrifaði (2026-09-30).
 *
 * Agnar 30.09.2026: „enginn texti má tapast."
 *
 * HVAÐ GERÐIST. Í UI-yfirferð þessa dags skrifaði ég „MITT EIGIÐ NAFN sem má ekki
 * tapast" í nafnareitinn á „+ Nýtt fyrirtæki", sló svo inn kennitölu — og reiturinn
 * sagði „Ferdinand Hansen". Nafnið var þurrkað út þegjandi. Þannig varð líka til
 * fyrirtæki #1844 sem hét „1540 ehf." með heimilisfang úr ÞRIÐJA félaginu, tóma
 * kennitölu og ekkert customer_base_id — kímera úr þrem heimildum.
 *
 * Ástæðan var forsenda sem gilti ekki. `19-kennitala-lookup.js` hafði annað þrep í
 * `fill()` með athugasemdinni „Try filling even if has value if user explicitly
 * looked up" — en `doLookup` var líka kallað af `input`-atburði 300 ms eftir
 * innslátt, svo yfirskriftin gekk þegar ENGINN hafði smellt á neitt.
 *
 * RÉTTA MYNSTRIÐ VAR ÞEGAR TIL Í SAFNINU, í 114-unified-pos-search.js:
 *     if (data.nafn && !nafnInp.value.trim()) nafnInp.value = data.nafn;
 * — fyllir aðeins tóma reiti. 19 fylgir því núna fyrir sjálfvirku leiðina, og
 * yfirskrift við SMELL geymir fyrri gildin á „↶ Til baka".
 *
 * HVAÐ ÞESSI VÖRÐUR GERIR — OG GERIR EKKI. Hann festir þessar tvær útfærslur sem
 * eru sannreyndar réttar. Hann finnur EKKI almennt hverja uppfyllingu í appinu sem
 * gæti skrifað yfir reit; sú leit skilar of mörgum falskum jákvæðum til að vera
 * vörður. Hann fellur ef gátin er tekin úr annarri hvorri skránni.
 *
 * Aðeins lestur. Ekkert net.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
function fail(msg) { console.log('RED: ' + msg); process.exit(1); }
const les = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

// ── 1. patch 19: sjálfvirka leiðin má aldrei yfirskrifa ──────────────────────
const p19 = 'js/patches/19-kennitala-lookup.js';
let s19;
try { s19 = les(p19); } catch (_) { fail(p19 + ' er horfin — vörðurinn getur ekkert varið.'); }

// (a) doLookup verður að taka við „var þetta smellur?"
if (!/function doLookup\(\s*afSmelli\s*\)/.test(s19)) {
  fail(p19 + ': `doLookup` tekur ekki lengur við `afSmelli`. Án þess getur hún ekki greint ' +
    'smell frá innslætti — og þá eyðir innsláttur kennitölu texta sem notandinn skrifaði.');
}
// (b) innsláttarleiðin verður að senda false
if (!/setTimeout\(\s*\(\)\s*=>\s*doLookup\(\s*false\s*\)/.test(s19)) {
  fail(p19 + ': sjálfvirka leiðin (setTimeout eftir `input`) kallar ekki `doLookup(false)`. ' +
    'Hún má aðeins fylla TÓMA reiti.');
}
// (c) smell-leiðin verður að senda true
if (!/addEventListener\(\s*['"]click['"]\s*,\s*\(\)\s*=>\s*doLookup\(\s*true\s*\)/.test(s19)) {
  fail(p19 + ': „Fletta upp"-takkinn kallar ekki `doLookup(true)`. Þá fyllir hann aðeins tóma ' +
    'reiti og gerir ekki það sem notandinn bað um.');
}
// (d) gátin sjálf: ekkert yfirskrifað nema afSmelli
if (!/if\s*\(\s*!\s*afSmelli\s*\)\s*return\s*;/.test(s19)) {
  fail(p19 + ': gátin `if (!afSmelli) return;` er farin úr `fill()`. Hún er það EINA sem stoppar ' +
    'innslátt kennitölu frá að þurrka út nafn sem einhver skrifaði.');
}
// (e) afturköllunin
if (!/bjodaTilBaka/.test(s19) || !/Til baka/.test(s19)) {
  fail(p19 + ': „↶ Til baka" er farið. Yfirskrift við smell er þá óafturkallanleg og texti getur tapast.');
}

// ── 2. patch 114: fyllir aðeins tóma reiti ───────────────────────────────────
const p114 = 'js/patches/114-unified-pos-search.js';
let s114;
try { s114 = les(p114); } catch (_) { fail(p114 + ' er horfin.'); }
const tomGat = (s114.match(/&&\s*!\w+\.value\.trim\(\)/g) || []).length;
// Mælt 30.09.2026: 4 (nafn, sími, netfang, heimilisfang).
const VIDMID_114 = 4;
if (tomGat < VIDMID_114) {
  fail(p114 + ': aðeins ' + tomGat + ' af ' + VIDMID_114 + ' uppfyllingum gæta þess að reiturinn sé tómur ' +
    '(`&& !x.value.trim()`). Uppfletting í Sölu myndi þá skrifa yfir það sem afgreiðslan slö inn.');
}

console.log('✅ GRÆNT uppfletting-yfirskrift: 19 greinir smell frá innslætti (afSmelli) · ' +
  'innsláttur fyllir aðeins tóma reiti · „↶ Til baka" til staðar · 114 með ' + tomGat + ' tóm-gátir (>= ' + VIDMID_114 + ').');
