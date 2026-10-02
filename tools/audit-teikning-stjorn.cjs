#!/usr/bin/env node
/**
 * VÖRÐUR: hæðir / Skýrari veggir / 3D verða að festast á TEIKNINGA-
 * gluggann eftir að FloorPlan.open rífur hann (cab96432 remount).
 */
const fs = require('fs');
const path = require('path');
const rot = path.join(__dirname, '..');
const src = fs.readFileSync(path.join(rot, 'js/patches/383-teikning-hreinsa-3d.js'), 'utf8');
const html = fs.readFileSync(path.join(rot, 'index.html'), 'utf8');
const villur = [];
const krefst = (re, msg) => { if (!re.test(src)) villur.push(msg); };

krefst(/_festModal/, '383 verður að muna gluggahnútinn, ekki aðeins félagsnúmer');
krefst(/function vaktGlugga/, '383 þarf vakt á nýjan #modal-floorplan');
krefst(/fp-hreinsa-btn/, '383 verður að búa til Skýrari veggir');
krefst(/fp-3d-btn/, '383 verður að búa til 3D');
krefst(/fp-haedir/, '383 verður að búa til hæðaflipa');
krefst(/width:auto!important/, 'hausinn má ekki vera 560px — annars hverfjast aukahnappanir');
krefst(/Opna í TurboPaint/, '383 verður að hafa Opna í TurboPaint');
krefst(/kjarni\.vercel\.app\/kjarni\/turbopaint/, 'TurboPaint-slóð á kjarni.vercel.app');
krefst(/TeiknTurboPaint/, '383 verður að birta TeiknTurboPaint API');
krefst(/vaktAfturkomu/, '383 sækir merki sjálfkrafa þegar TurboPaint-flipinn skilar');
if (!/383-teikning-hreinsa-3d\.js\?v=20261002(sja|takntp|eyda|att|staerd)/.test(html)) {
  villur.push('index.html: 383 vantar ?v=20261002sja');
}

if (villur.length) {
  console.log('TEIKNING-STJORN RAUDT — ' + villur.length + ' vantar:');
  villur.forEach(v => console.log('  · ' + v));
  process.exit(1);
}
console.log('TEIKNING-STJORN GRÆNT — 383 festir hæðir, Skýrari veggir og 3D eftir remount.');
process.exit(0);
