// Próf: Birgðir í Brunastáli C + spjaldasýn á síma (útlitslota 17.11.2026, verk 87c972cf og a65d87c2).
//   node --test test/birgdir-utlit.test.cjs
// Það sem má ekki bila:
//   · engin emoji í listanum sjálfum (flipar, takkar, raðir, spjöld, tóm staða) — Brunastál C bannar þau; tákn eru inline SVG;
//   · sýnin (Tafla | Spjöld) er geymd á þjóninum per tækjaflokk (Vidmot.lesaTaeki/setjaTaeki), aldrei í localStorage;
//   · sjálfgefið: spjöld á síma, tafla á tölvu;
//   · spjaldatakkarnir (stjarna, ± Nota) eru 44 px og vinna hamarsregluna í appham (gervi-auðkennin fjögur).
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const SRC = fs.readFileSync(path.join(__dirname, '..', 'js/patches/36-stock-management.js'), 'utf8');
const EMOJI = /[\u{1F300}-\u{1FAFF}☀-⛿⭐⬇]/u;

const fallBody = (nafn) => {
  const i = SRC.indexOf('function ' + nafn + '(');
  assert.ok(i >= 0, 'fann ekki ' + nafn);
  const lok = SRC.indexOf('\n  }\n', i);
  return SRC.slice(i, lok);
};
const anToast = (t) => t.split('\n').filter((l) => !/Toast\.show|^\s*\/\//.test(l)).join('\n');

test('engin emoji í flipum, titli, takkarönd, röðum eða spjöldum', () => {
  for (const f of ['render', 'rod', 'spjald']) {
    const b = anToast(fallBody(f));
    const m = b.match(EMOJI);
    assert.ok(!m, f + ' ber emoji: ' + (m && m[0]));
  }
  const hamir = SRC.slice(SRC.indexOf('const HAMIR = ['), SRC.indexOf('];', SRC.indexOf('const HAMIR = [')));
  assert.ok(!EMOJI.test(hamir), 'HAMIR-heitin bera emoji');
  assert.ok(!EMOJI.test(SRC.match(/const PANTA = '[^']*'/)[0]), 'PANTA-heitið ber emoji');
});

test('tákn eru inline SVG (currentColor) — ekki myndir eða leturtákn', () => {
  assert.ok(/const ik = \(n, st, fyllt\) => `<svg class="stk-ik" viewBox="0 0 24 24"/.test(SRC));
  for (const n of ['eldur', 'bjalla', 'lykill', 'pera', 'stjarna', 'nidur', 'tengill', 'penni', 'rusl', 'kassi', 'tafla', 'spjold']) {
    assert.ok(new RegExp("\\b" + n + ": '<path").test(SRC), 'táknið ' + n + ' vantar');
  }
});

test('sýnin er geymd á þjóninum per tækjaflokk (Vidmot), sjálfgefið spjöld á síma', () => {
  const s = fallBody('synin');
  assert.ok(/Vidmot\.taeki\(\) === 'simi'\) sjalfg = 'spjold'/.test(s), 'sjálfgefið á síma á að vera spjöld');
  assert.ok(/Vidmot\.lesaTaeki\(SYN_V, sjalfg\)/.test(s));
  const t = fallBody('setjaSyn');
  assert.ok(/Vidmot\.setjaTaeki\(SYN_V, v\)/.test(t));
  assert.ok(!/localStorage/.test(s + t), 'sýnin má ekki fara í localStorage');
  assert.ok(/_setSyn\(v\)\s*\{ setjaSyn\(v\); \}/.test(SRC), 'Stock._setSyn vantar');
});

test('spjaldið: nafn + mynd, magn, kaup/sala/álagning í einni línu, stjarna og ± Nota', () => {
  const b = fallBody('spjald');
  for (const k of ['stk-spj-mynd', 'stk-spj-nafn', 'stk-spj-magn', 'stk-spj-verd', 'Stock.togglePanta(', 'Stock.openNota(']) assert.ok(b.includes(k), k + ' vantar í spjaldið');
  assert.ok(/Kaup <b>/.test(b) && /Sala <b>/.test(b) && /Álagning <b/.test(b));
  assert.ok(!/<input/.test(b), 'spjaldið sýnir — breytingar á verði og magni fara um töfluna og ± Nota');
});

test('44 px snertifletir sem vinna hamarinn (fjögur gervi-auðkenni + !important)', () => {
  assert.ok(/const V = '#view-birgdir:not\(#_stk1\):not\(#_stk2\):not\(#_stk3\):not\(#_stk4\) ';/.test(SRC));
  assert.ok(/\.stk-spj-tk\{height:44px!important;min-height:44px!important/.test(SRC));
  assert.ok(/html\[data-viewmode="mobile"\] ' \+ V \+ '\.stk-rofi button\{height:44px!important/.test(SRC), 'rofinn á að vera 44 px á síma');
});

test('útgáfumerki 36 hækkað', () => {
  const h = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const m = /36-stock-management\.js\?v=(\d{8})/.exec(h);
  assert.ok(m && m[1] >= '20261117');
});
