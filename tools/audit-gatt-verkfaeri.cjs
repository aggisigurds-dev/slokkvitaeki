#!/usr/bin/env node
/* VÖRÐUR — verkfæraskrá Þjónustugáttarinnar er á tveimur stöðum og þeir mega aldrei stangast á.
 *
 *   gatt/verkfaeri.js                     (vafrinn: gátt + gatt-admin; heiti, lýsingar, hópar)
 *   netlify/functions/_gatt-verkfaeri.cjs (þjónninn: lyklar, sjálfgefið, tilbúið)
 *
 * Rautt ef lykill er aðeins öðru megin, eða ef sjalfgefid/tilbuid stangast á. Kyrrstæður lestur, ekkert net.
 */
const fs = require('fs');
const path = require('path');
const rot = path.join(__dirname, '..');
const vef = fs.readFileSync(path.join(rot, 'gatt/verkfaeri.js'), 'utf8');
const sv = require(path.join(rot, 'netlify/functions/_gatt-verkfaeri.cjs'));
const vefL = [];
vef.replace(/\{\s*k:\s*'([a-z_]+)'[^}]*sjalfgefid:\s*(true|false)[^}]*tilbuid:\s*(true|false)/g, (m, k, s, t) => { vefL.push([k, s === 'true', t === 'true']); return m; });
const vefM = new Map(vefL.map((v) => [v[0], v])), svM = new Map(sv.VERKFAERI.map((v) => [v[0], v]));
const villur = [];
vefM.forEach((v, k) => { const s = svM.get(k); if (!s) villur.push('aðeins í vafra: ' + k); else if (s[1] !== v[1] || s[2] !== v[2]) villur.push('ósamræmi á ' + k + ' (sjalfgefid/tilbuid)'); });
svM.forEach((s, k) => { if (!vefM.has(k)) villur.push('aðeins á þjóni: ' + k); });
if (!vefL.length) villur.push('las engin verkfæri úr gatt/verkfaeri.js');
if (villur.length) { console.log('❌ Verkfæraskrá gáttarinnar stangast á: ' + villur.join(' · ')); process.exit(1); }
console.log('✅ Verkfæraskrá gáttarinnar samhljóða — ' + vefL.length + ' tól, ' + vefL.filter((v) => v[2]).length + ' tilbúin.');
