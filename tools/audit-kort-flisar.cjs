#!/usr/bin/env node
/* VÖRÐUR — kortaflísar verða að koma frá þjónustu sem svarar okkur ÁN lykils.
 *
 * VILLAN, fundin 16.09.2026: Agnar sá öll kort tóm — í staðinn fyrir kortið stóð
 * „403 · Access blocked · App is not following the tile usage policy of
 * OpenStreetMap's volunteer-run servers". OSM hafði lokað á appið og skilar þeirri
 * mynd með stöðu **200** á hverja einustu flís, svo ekkert kall féll og ekkert log
 * sagði frá — kortið var einfaldlega ólæsilegt í Ársskoðun, Leiðsögn, Bílstjóra,
 * Aksturslista og handvirku hnitaleitinni.
 *
 * FYRSTA TILRAUN var CARTO (`basemaps.cartocdn.com`). Flísarnar komu með stöðu 200 og
 * réttri stærð — en prentaðar með „API KEY REQUIRED" þvert yfir kortið. Það sást EKKI
 * í tölum, aðeins á skjámynd. Þess vegna er reglan: flísabreyting telst ekki prófuð
 * fyrr en kortið hefur verið SKOÐAÐ, ekki bara talið.
 *
 * NÚNA: Esri World Street Map (server.arcgisonline.com) — enginn lykill, íslensk
 * örnefni, prófað í z12–z18 yfir Reykjavík og Hafnarfjörð.
 *
 * ÞESSI VÖRÐUR fellur rautt ef kóðastaður fer aftur á OSM-flísar eða á CARTO án lykils.
 * Kyrrstæður lestur — ekkert net — svo hann keyri líka í pre-push.
 *
 *   node tools/audit-kort-flisar.cjs
 */
const fs = require('fs');
const path = require('path');

const rot = path.join(__dirname, '..');
const SLEPPA = new Set(['node_modules', 'dist', 'graphify-out', '_attic', 'backups', '.git', 'tools']);
const MYNSTUR = /tile\.openstreetmap\.(?:org|de)|tiles\.wmflabs\.org|basemaps\.cartocdn\.com/;
const GRUNNLINA = 0;

const skrar = [];
(function ganga(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    if (SLEPPA.has(e.name)) continue;
    const p = path.join(d, e.name);
    if (e.isDirectory()) ganga(p);
    else if (/\.(js|cjs|mjs|html)$/.test(e.name)) skrar.push(p);
  }
})(rot);

const fundid = [];
for (const f of skrar) {
  const linur = fs.readFileSync(f, 'utf8').split(/\r?\n/);
  linur.forEach((l, i) => {
    if (MYNSTUR.test(l)) fundid.push(`${path.relative(rot, f).replace(/\\/g, '/')}:${i + 1}  ${l.trim().slice(0, 90)}`);
  });
}

if (fundid.length > GRUNNLINA) {
  console.log(`❌ Kortaflísar frá þjónustu sem svarar okkur ekki: ${fundid.length} (grunnlína ${GRUNNLINA})\n`);
  console.log('   OSM lokaði á appið 16.09.2026 („Access blocked"-mynd) og CARTO prentar');
  console.log('   „API KEY REQUIRED" yfir flísarnar án lykils. Bæði skila stöðu 200, svo');
  console.log('   kortið verður ólæsilegt án þess að nokkurt kall falli.');
  console.log('   Rétta slóðin: https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}');
  console.log('   Höfundarmerki: Flísar © Esri, HERE, Garmin, © OpenStreetMap contributors\n');
  fundid.slice(0, 10).forEach(h => console.log('   ' + h));
  process.exit(1);
}

console.log(`✅ Kortaflísar heilar — enginn kóðastaður sækir flísar á lokaða eða lykil-kræfa þjónustu (${skrar.length} skrár skoðaðar).`);
process.exit(0);
