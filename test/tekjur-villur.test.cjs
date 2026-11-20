// Próf á tveimur reiknivillum í tekjum (lota 4, 17.11.2026). Keyrsla: node --test test/tekjur-villur.test.cjs
//
// AF HVERJU:
//   1. 489 Vinnusamantekt: `lokid` var fjarlægt í 3bc9aab4 en tekjumælingin kallaði enn á það → ReferenceError og
//      tekjuflísin á Þjónustuborði sýndi villu í stað talna.
//   2. js/tekjur.js (Tekjur-síðan): samtölur og súlurit töldu BAKFÆRÐAR (void) sölur með.
// Reglan sem má aldrei bila: final-sölur ÁN VSK; kreditnótur (neikvæðar) dragast frá; bakfært og drög teljast ekki;
// kreditnóta á bakfærða sölu telst ekki (hún jafnar út sölu sem er þegar úti).
// Gögnin hér eru tilbúin (engin raunveruleg nöfn, kennitölur eða upphæðir — repóið er opið).
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const F = 'final';

// Tekur tekjumælingu 489 út úr skránni (frá `const erKredit` til loka tekjurManadar) og keyrir hana í lokuðu umhverfi —
// sannar að hún keyrir án ReferenceError og telur rétt.
function tekjurManadar489() {
  const src = fs.readFileSync(path.join(__dirname, '..', 'js', 'patches', '489-vinnusamantekt.js'), 'utf8');
  const a = src.indexOf('  const erKredit = ');
  const b = src.indexOf('  function taekiManadar(');
  assert.ok(a > 0 && b > a, 'tekjumæling 489 finnst í skránni');
  const kodi = 'const manudur = (af = 0) => { const d = new Date(); return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + af, 1)); };\n'
    + src.slice(a, b) + '\nthis.tekjurManadar = tekjurManadar;';
  const ctx = {};
  vm.runInNewContext(kodi, ctx, { filename: '489-tekjur' });
  return ctx.tekjurManadar;
}

test('489: tekjumælingin keyrir (engin ReferenceError) og telur án VSK, kredit frá, bakfært og kredit á bakfært úti', () => {
  const tm = tekjurManadar489();
  const nu = new Date();
  const iMan = new Date(Date.UTC(nu.getUTCFullYear(), nu.getUTCMonth(), 1, 12)).toISOString();
  const fyrri = new Date(Date.UTC(nu.getUTCFullYear(), nu.getUTCMonth() - 1, 15)).toISOString();
  const rows = [
    { id: 1, status: F, upphaed_an_vsk: 1000, samtals: 1240, created_at: iMan, vidskiptategund: 'uttekt' },
    { id: 2, status: F, upphaed_an_vsk: -200, samtals: -248, created_at: iMan, is_credit: true, credit_of: 1 },   // kredit dregst frá
    { id: 3, status: F, upphaed_an_vsk: -500, samtals: -620, created_at: iMan, is_credit: true, credit_of: 9 },   // kredit á bakfærða → úti
    { id: 4, status: 'drog', upphaed_an_vsk: 7000, samtals: 8680, created_at: iMan },                              // drög úti
    { id: 5, status: F, upphaed_an_vsk: 300, samtals: 372, created_at: fyrri, vidskiptategund: 'bud' },
  ];
  const r = tm(rows, [{ id: 9 }]);
  assert.equal(r.nu.all, 800, 'líðandi mánuður: 1000 − 200 (án VSK)');
  assert.equal(r.nu.uttekt, 1000);
  assert.equal(r.nu.n, 1, 'fjöldi telur aðeins reikninga, ekki kreditnótur');
  assert.equal(r.fyrri.all, 300);
  assert.equal(r.fyrri.nb, 1);
  // Án lista yfir bakfært (lestur brást): kreditnótan telst — mælingin hrynur samt ekki.
  assert.equal(tm(rows, undefined).nu.all, 300);
});

test('tekjur.js: bakfærðar sölur og kreditnótur á bakfærða sölu teljast ekki í samtölum', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'js', 'tekjur.js'), 'utf8');
  assert.match(src, /credit_of/, 'credit_of er sótt svo kredit á bakfærða sölu þekkist');
  assert.doesNotMatch(src, /var totalEx = _sales\.reduce/, 'samtalan „Án VSK" les ekki lengur allar sölur');
  const win = {};
  vm.runInNewContext(src, { window: win, console: { log() {}, warn() {}, error() {} }, document: { readyState: 'complete', getElementById() { return null; }, querySelector() { return null; }, addEventListener() {} }, setTimeout, clearTimeout, setInterval() {} }, { filename: 'tekjur.js' });
  const g = win.TekjurReglur;
  assert.ok(g && typeof g.gildar === 'function', 'TekjurReglur.gildar er til');
  const r = g.gildar([{ id: 1, status: F }, { id: 2, status: F, credit_of: 9 }, { id: 3, status: F, credit_of: 1 }, { id: 9, status: 'void' }, { id: 4, status: 'drog' }], [9]);
  assert.deepEqual(r.map((x) => x.id), [1, 3]);
});
