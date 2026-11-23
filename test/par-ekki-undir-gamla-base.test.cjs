// Próf: sjálfvirk pörun skrifar ekki par undir GAMLA greiðandanum (23.11.2026, 199-doc-year-grid).
//   node --test test/par-ekki-undir-gamla-base.test.cjs
//
// AF HVERJU: eftir kt-breytingu á spjaldi #424 (greiðandi 327 → 1295) hélt opinn vafri gömlu spjaldaröðinni. Þegar spjaldið var opnað
// þar skrifaði sjálfvirka pörunin (autoSave í 199) par 1742 undir 327 — tvítak ofan á par 775 sem kt-keðjan hafði þegar fært.
// Það sem má ALDREI gerast:
//   1. sjálfvirka leiðin skrifar par fyrir greiðanda sem er ekki lengur greiðandi staðarins (ferska stöðu les hún úr grunninum);
//   2. vitum við ekki svarið (villa, kast, enginn greiðandi á staðnum) er skrifað eins og áður — leiðin er best-effort, ALLTAF LEYFA VISTUN;
//   3. handvirk „🔗 Tengja“ breytist ekki: hún kallar áfram beint á savePair.
// Öll gögn eru tilbúin (repóið er opinbert).
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const SRC = fs.readFileSync(path.join(__dirname, '..', 'js/patches/199-doc-year-grid.js'), 'utf8').replace(/\r\n/g, '\n');

// Fallið sjálft, tekið ÚR 199 og keyrt — ekki afrit.
function hladaFall(sbSvar) {
  const m = /async function baseErFersk\(baseId, coId\)\{[\s\S]*?\n  \}\n/.exec(SRC);
  assert.ok(m, 'baseErFersk fannst ekki í 199');
  const kall = [];
  const sb = { from: (t) => ({ select: (c) => ({ eq: (k, v) => ({ maybeSingle: async () => { kall.push({ t, c, k, v }); return sbSvar(); } }) }) }) };
  const ctx = { SB: () => sb, Number };
  vm.runInNewContext(m[0] + '\nthis.fall = baseErFersk;', ctx);
  return { fall: ctx.fall, kall };
}

test('ferskur greiðandi → leyft; gamall greiðandi → sleppt', async () => {
  const f = hladaFall(() => ({ data: { customer_base_id: 1295 } }));
  assert.equal(await f.fall(1295, 424), true);
  assert.equal(await f.fall(327, 424), false, 'spjaldið hélt gamla greiðandanum 327');
  assert.deepEqual({ ...f.kall[0] }, { t: 'fyrirtaeki', c: 'customer_base_id', k: 'id', v: 424 });
});

test('talan er borin saman sem tala (streng 1295 og tala 1295 teljast eins)', async () => {
  const f = hladaFall(() => ({ data: { customer_base_id: '1295' } }));
  assert.equal(await f.fall(1295, 424), true);
});

test('óvissa leyfir skrif: villa, kast, enginn greiðandi á staðnum, enginn spjaldsnúmer', async () => {
  for (const svar of [() => ({ error: { message: 'x' } }), () => { throw new Error('net'); }, () => ({ data: null }), () => ({ data: { customer_base_id: null } })]) {
    const f = hladaFall(svar);
    assert.equal(await f.fall(327, 424), true);
  }
  const f = hladaFall(() => ({ data: { customer_base_id: 1295 } }));
  assert.equal(await f.fall(327, null), true, 'án fyrirtaeki_id er ekkert að bera saman við');
  assert.equal(f.kall.length, 0);
});

test('sjálfvirka leiðin fer um baseErFersk; handvirku savePair-köllin eru óbreytt', () => {
  assert.match(SRC, /baseErFersk\(b0, c0\)\.then\(function\(ok\)\{\s*\n\s*if\(ok\) savePair\(b0, y0, k0, c0, p0\);/);
  assert.match(SRC, /\}\)\(baseId, y, svc\.kind, coId, \{ report_doc_id: rep\.id, invoice_doc_id: inv\.id, status:'klarad', matched_by:'exact' \}\);/);
  const beint = SRC.split('\n').filter((l) => /\bsavePair\(/.test(l) && !/async function savePair/.test(l) && !/^\s*\/\//.test(l));
  // 1 í innri skilgreiningu pörunarleiðarinnar (if(ok) savePair(b0, …)) + handvirku kallastaðirnir
  assert.ok(beint.some((l) => /if\(ok\) savePair\(b0/.test(l)));
  assert.ok(beint.filter((l) => !/if\(ok\) savePair\(b0/.test(l)).length >= 2, 'handvirku köllin eru enn á sínum stað');
});
