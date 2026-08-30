#!/usr/bin/env node
'use strict';
/**
 * Þjónustuvefur — Brunaslöngur eiga að teljast eins og í Center Hótel sýnishorninu.
 *   Plaza skýrsla 83 tæki þar af 39 slöngur → 44 SLT + 39 BSL
 *   Arnarhvoll slöngur óvirkar í tækjaskrá en 8 á skýrslu → 8 BSL
 *   Framendi má ekki harðkóða Brunaslöngur sem „—"
 */
const fs = require('fs');
const path = require('path');
const { pickHose, slokkMinusHose } = require('../netlify/functions/_gatt-eq.cjs');

const root = path.join(__dirname, '..');
let failed = 0;
function ok(name, cond, detail) {
  if (cond) console.log('  OK  ' + name);
  else { failed++; console.log('  FAIL ' + name + (detail ? ' — ' + detail : '')); }
}

ok('Plaza: report 39 wins over live 35', pickHose(39, 35) === 39);
ok('Arnarhvoll: report 8 when live is 0', pickHose(8, 0) === 8);
ok('live fallback when report is 0', pickHose(0, 5) === 5);
ok('live fallback when report is missing', pickHose(null, 5) === 5);
ok('no hoses → null (em dash, not 0)', pickHose(0, 0) === null);
ok('Plaza slökkvitæki 83 − 39 = 44', slokkMinusHose(83, 39) === 44);
ok('Arnarhvoll 20 − 8 = 12', slokkMinusHose(20, 8) === 12);
ok('Skjaldbreið 3 with no hoses stays 3', slokkMinusHose(3, null) === 3);
ok('missing total stays null', slokkMinusHose(null, 8) === null);

const portal = fs.readFileSync(path.join(root, 'gatt/portal.js'), 'utf8');
ok('portal maps brunaslongur_alls into the Brunaslöngur card',
  /k: 'Brunaslöngur',\s*v: s\.brunaslongur_alls/.test(portal));
ok('portal does not hardcode Brunaslöngur as a dash',
  !/k: 'Brunaslöngur',\s*v: '—'/.test(portal));
ok('portal passes building.slo through',
  /sl: b\.taeki, slo: b\.slo/.test(portal));
ok('normalize does not drop hoses with slo: null',
  !/sl: b\.taeki, slo: null/.test(portal));

const gatt = fs.readFileSync(path.join(root, 'netlify/functions/gatt.js'), 'utf8');
ok('gatt.js loads _gatt-eq helper', /require\('\.\/_gatt-eq\.cjs'\)/.test(gatt));
ok('gatt.js reads report equipment.brunaslongur', /eq\.brunaslongur/.test(gatt));
ok('gatt.js falls back to v_uttaeki_fid_rollup bsl', /v_uttaeki_fid_rollup/.test(gatt));
ok('gatt.js returns brunaslongur_alls', /brunaslongur_alls/.test(gatt));
ok('gatt.js returns building.slo', /\bslo:/.test(gatt));

console.log(failed ? '\nFAIL ' + failed : '\nOK');
process.exit(failed ? 1 : 0);
