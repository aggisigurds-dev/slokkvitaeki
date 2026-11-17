// Úttekt: „Staðfesta lista" heldur (álagspróf umferð 2, 17.11.2026). Keyrsla: node --test test/uttekt-listi-las.test.cjs
//
// AF HVERJU — mælt í vafra á Test fyrirtæki með öll skrif stífluð:
//   1. Tvísmellur á „Staðfesta lista" læsti og opnaði strax aftur: listinn stóð óstaðfestur en textinn var saminn.
//   2. Í Brunastál-útlitinu (fasta þemanu) hélt læsingin ekki: 404 setur pointer-events:unset á .ut-svc með hærri
//      specificity, svo staða tækis breyttist EFTIR staðfestingu (léttvatn yfirferð → hleðsla) og textinn varð rangur.
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const K = fs.readFileSync(path.join(__dirname, '..', 'js/patches/224-uttekt-taeki.js'), 'utf8');

test('tvísmellur á Staðfesta lista: annar smellur innan 700 ms hunsaður, á undan víxlun læsingarinnar', () => {
  const i = K.indexOf("if((b=e.target.closest('.ut-listlock'))){");
  assert.ok(i > 0, 'smellifall læsingarinnar fannst ekki');
  const bútur = K.slice(i, i + 1200);
  const vord = bútur.indexOf("if(nuT-(window.__utLasT||0)<700) return;");
  const vixl = bútur.indexOf("on?localStorage.removeItem(k):localStorage.setItem(k,'1')");
  assert.ok(vord > 0, 'tvísmellsvörn vantar');
  assert.ok(vixl > vord, 'vörnin verður að koma á undan víxluninni');
});

test('læsing listans vinnur Brunastál-regluna (pointer-events:none!important)', () => {
  const m = K.match(/'\.ut-list\.locked \.ut-svc,[^']*\{pointer-events:none!important;opacity:\.5\}'/);
  assert.ok(m, 'lásreglan verður að bera !important — annars núllar 404 hana í Brunastál');
  for (const k of ['.ut-svc', '.ut-onytt', '.ut-chk', '.ut-bulk-act']) assert.ok(m[0].includes('.ut-list.locked ' + k), k + ' vantar í lásinn');
});
