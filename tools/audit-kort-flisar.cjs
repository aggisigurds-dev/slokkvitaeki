#!/usr/bin/env node
/* VÖRÐUR — kortaflísar mega ekki koma frá sjálfboðaliðaþjónum OSM.
 *
 * VILLAN, fundin 16.09.2026: Agnar sá öll kort tóm — í staðinn fyrir kortið stóð
 * „403 · Access blocked · App is not following the tile usage policy of
 * OpenStreetMap's volunteer-run servers". OSM lokaði á appið og skilar þeirri mynd
 * með stöðu **200** á hverja einustu flís, svo ekkert kall féll og ekkert log sagði
 * frá — kortið var einfaldlega ólæsilegt í Ársskoðun, Leiðsögn, Bílstjóra,
 * Aksturslista og handvirku hnitaleitinni.
 *
 * Sjö kóðastaðir báðu um `{s}.tile.openstreetmap.org`. Það form (undirlén a/b/c) er
 * úrelt hjá OSM og stefna þeirra bannar sjálfvirka fjöldanotkun á þeim þjónum.
 * Flísarnar koma nú frá CARTO (`basemaps.cartocdn.com`), sem er CDN og ætlað þessu.
 *
 * ÞESSI VÖRÐUR fellur rautt ef einhver kóðastaður fer aftur á OSM-flísar. Mælt með
 * kyrrstæðum lestri — ekkert net — svo hann keyri líka í pre-push.
 *
 *   node tools/audit-kort-flisar.cjs
 */
const fs = require('fs');
const path = require('path');

const rot = path.join(__dirname, '..');
const SLEPPA = new Set(['node_modules', 'dist', 'graphify-out', '_attic', 'backups', '.git', 'tools']);
const MYNSTUR = /tile\.openstreetmap\.(?:org|de)|tiles\.wmflabs\.org/;
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
  console.log(`❌ Kortaflísar af OSM-þjóni: ${fundid.length} (grunnlína ${GRUNNLINA})\n`);
  console.log('   OSM lokaði á appið 16.09.2026 og skilar „Access blocked"-mynd með stöðu 200,');
  console.log('   svo kortið verður ólæsilegt án þess að nokkurt kall falli.');
  console.log('   Rétta slóðin: https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png');
  console.log('   Höfundarmerki: © OpenStreetMap contributors © CARTO\n');
  fundid.slice(0, 10).forEach(h => console.log('   ' + h));
  process.exit(1);
}

console.log(`✅ Kortaflísar heilar — enginn kóðastaður sækir flísar á sjálfboðaliðaþjóna OSM (${skrar.length} skrár skoðaðar).`);
process.exit(0);
