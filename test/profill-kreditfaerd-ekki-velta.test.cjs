// Próf: kreditfærður reikningur er ekki velta á fyrirtækjaspjaldinu (23.11.2026, 500-profill-i).
//   node --test test/profill-kreditfaerd-ekki-velta.test.cjs
//
// AF HVERJU: Agnar bað um að R-001340 yrði afturkölluð og bakfærð og R-001341 stæði í staðinn. Eftir það sýndi spjaldið
// „Viðskipti 2026: 78.680 kr“ (39.340 tvisvar) meðan „alls 104.378 kr“ var rétt — talan var lesin úr hreyfingalistanum (403) og
// taldi yfirstrikaða (.kredit) röð með. Ársskoðun og „alls“ drógu kreditinn rétt frá. Það sem má ALDREI gerast:
//   1. kreditfærð röð (.kredit) telst hvorki í veltu líðandi árs né fyrra árs;
//   2. „Síðasta úttekt“ velur aldrei kreditfærðan reikning;
//   3. sama regla gildir á símaleiðinni (ársblokkir, .sk-svc-card).
// Öll gögn eru tilbúin (repóið er opinbert).
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const SRC = fs.readFileSync(path.join(__dirname, '..', 'js/patches/500-profill-i.js'), 'utf8').replace(/\r\n/g, '\n');

// Veltulykkjan sjálf, tekin ÚR 500 og keyrð — ekki afrit, svo prófið mælir kóðann sem fer í loftið.
function velta(hreyf, ar) {
  const m = /d\.hreyf\.forEach\(function \(r\) \{ if \(r\.kredit\) return;[^\n]*\}\);/.exec(SRC);
  assert.ok(m, 'veltulykkjan fannst ekki í 500 (eða hún sleppir ekki kreditfærðum röðum)');
  const h = { d: { hreyf }, ar, slt: 0, bkr: 0, fyrra: 0 };
  vm.runInNewContext('var slt = 0, bkr = 0, fyrra = 0;\n' + m[0] + '\nthis.ut = { slt: slt, bkr: bkr, fyrra: fyrra };', Object.assign(h, { RegExp }));
  return h.ut;
}
const R = (teg, dags, upph, kredit, hluti) => ({ teg, dags, nr: 'R-x', upph, greitt: false, kredit: !!kredit, hluti: hluti || 0 });

test('kreditfærð röð telst ekki með: R-001340 (kreditfærð) + R-001341 = 39.340, ekki 78.680', () => {
  const u = velta([R('Úttekt', '23/11/2026', 39340, false), R('Úttekt', '23/11/2026', 39340, true), R('Úttekt', '04/12/2025', 34509, false)], 2026);
  assert.equal(u.slt, 39340);
  assert.equal(u.bkr, 0);
  assert.equal(u.fyrra, 34509);
});

test('kreditfærð röð frá fyrra ári telst ekki heldur í samanburðinn', () => {
  const u = velta([R('Úttekt', '04/12/2025', 34509, false), R('Úttekt', '10/03/2025', 20000, true)], 2026);
  assert.equal(u.fyrra, 34509);
  assert.equal(u.slt, 0);
});

test('ókreditfærðar raðir telja eins og áður (brunakerfi sér, slökkvitæki sér)', () => {
  const u = velta([R('Úttekt', '01/02/2026', 10000), R('Brunakerfi', '05/02/2026', 7000), R('Úttekt', '01/02/2025', 3000)], 2026);
  assert.deepEqual({ ...u }, { slt: 10000, bkr: 7000, fyrra: 3000 });
});

test('hreyfingalínan ber .kredit + .s-kredit (borðaleið) og símaleiðin .sk-doc.inv.kredit (span, ekki a — rýni 23.11)', () => {
  assert.match(SRC, /kredit: !!sel\(r, '\.kredit'\), hluti: kreditHluti\(sel\(r, '\.s-kredit'\)\)/);
  assert.match(SRC, /kredit: !!sel\(c, '\.sk-doc\.inv\.kredit'\), hluti: kreditHluti\(sel\(c, '\.s-kredit'\)\)/);
  assert.equal(/a\.sk-doc\.inv\.kredit/.test(SRC), false, 'a.sk-doc.inv.kredit gat aldrei passað — merkið er á span');
});

test('„Síðasta úttekt“ velur aldrei kreditfærðan reikning', () => {
  assert.match(SRC, /var su = d\.hreyf\.filter\(function \(r\) \{ return \/úttekt\/i\.test\(r\.teg\) && r\.upph && !r\.kredit; \}\)\[0\] \|\| d\.hreyf\.filter\(function \(r\) \{ return r\.upph && !r\.kredit; \}\)\[0\];/);
});

test('kreditað að hluta dregst frá (−N kr), aldrei undir 0, og „Síðasta úttekt“ er óbreytt', () => {
  const u = velta([R('Úttekt', '01/02/2026', 10000, false, 4000), R('Úttekt', '02/02/2026', 500, false, 900), R('Úttekt', '03/03/2025', 8000, false, 3000)], 2026);
  assert.equal(u.slt, 6000, '10.000 − 4.000 + max(0, 500 − 900)');
  assert.equal(u.fyrra, 5000);
});

test('kreditHluti les tölu úr „kreditað að hluta −N kr“ (punktar sem þúsundaskil)', () => {
  const m = /var kreditHluti = function \(e\) \{[^\n]*\};/.exec(SRC);
  assert.ok(m, 'kreditHluti fannst ekki');
  const ctx = { txt: (e) => e.t, parseInt, Math };
  vm.runInNewContext(m[0] + '\nthis.f = kreditHluti;', ctx);
  assert.equal(ctx.f({ t: 'kreditað að hluta −39.340 kr' }), 39340);
  assert.equal(ctx.f(null), 0);
  assert.equal(ctx.f({ t: 'ekkert' }), 0);
});
