/* ÞjónustuVerkstæði (190): sönnun um úttekt ársins í „Á dagskrá“ (18.11.2026).
 * Agnar: „bætt þarna inn á þjónustuverkstæði síðunni, tengingu, til að hjálpa mér að útkljá þau mál“.
 * Félög sem bera merki um að úttekt ársins sé þegar gerð raðast efst, með vísbendingarnar á röðinni og takka til að
 * setja þau í vinnslu eða merkja búin. Ekkert er merkt sjálfkrafa.
 * Keyrsla: node --test test/verkstaedi-sonnun.test.cjs */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const SRC = fs.readFileSync(path.join(__dirname, '..', 'js', 'patches', '190-thjonustu-verkstaedi.js'), 'utf8');
const AR = 2026;

// Föllin dregin úr skránni og keyrð með lágmarksumhverfi (sama esc og btn og skráin notar).
function ur190() {
  const sonnun = SRC.match(/\n  function sonnun\(r\) \{[\s\S]*?\n  \}/);
  const flis = SRC.match(/^\s*const snFlis = [^\n]*$/m);
  const haus = SRC.match(/^\s*const snHaus = [^\n]*$/m);
  const rodir = SRC.match(/\n    function drawerRows\(list, withStart\) \{[\s\S]*?\n    \}/);
  const btn = SRC.match(/^\s*function btn\(bg, tx, bd\) \{[^\n]*$/m);
  assert.ok(sonnun && flis && haus && rodir && btn, 'náði ekki sonnun/snFlis/snHaus/drawerRows/btn úr 190');
  const esc = "const esc = s => String(s == null ? '' : s).replace(/[&<>\"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;', \"'\": '&#39;' }[c]));";
  return new Function('curYear', [esc, btn[0], sonnun[0], flis[0], haus[0], rodir[0]].join('\n') + '\nreturn { sonnun, drawerRows };')(AR);
}
const F = ur190();
const kort = (o) => Object.assign({ id: 1, nafn: 'Félag', units: 0, doneDocs: false, docs: null, hasReik: false, skodud: null }, o);

test('sonnun: hver vísbending fyrir sig, sterkasta fyrst, og ekkert þegar ekkert er til', () => {
  assert.deepEqual(F.sonnun(kort({})), []);
  assert.deepEqual(F.sonnun(null), []);
  assert.deepEqual(F.sonnun(kort({ docs: { skyrsla: null, reik: null } })), []);
  assert.deepEqual(F.sonnun(kort({ skodud: { n: 0, sidast: '' } })), []);
  const allt = F.sonnun(kort({ docs: { skyrsla: { doc_type: 'uttektarskyrsla' } }, hasReik: true, skodud: { n: 3, sidast: '2026-09-24' } }));
  assert.deepEqual(allt.map((x) => x.k), ['skyrsla', 'reik', 'taeki']);
  assert.equal(allt[0].t, '📝 Skýrsla 2026');
  assert.equal(allt[1].t, '🧾 Reikningur 2026');
  assert.equal(allt[2].t, '🔧 3 tæki skoðuð 24.09.');
  assert.match(allt[2].tt, /vísbending, ekki staðfesting/);            // skoðunardagur getur komið úr innflutningi
  assert.equal(F.sonnun(kort({ skodud: { n: 1, sidast: '2026-11-11' } }))[0].t, '🔧 1 tæki skoðað 11.11.');
  assert.equal(F.sonnun(kort({ skodud: { n: 2, sidast: '' } }))[0].t, '🔧 2 tæki skoðuð');
});

test('Á dagskrá: félög með sönnun raðast efst undir fyrirsögn, hin á eftir', () => {
  const listi = [
    kort({ id: 10, nafn: 'Engin merki' }),
    kort({ id: 11, nafn: 'Aðeins tæki', skodud: { n: 4, sidast: '2026-09-02' } }),
    kort({ id: 12, nafn: 'Fullt par', doneDocs: true, docs: { skyrsla: {}, reik: {} }, hasReik: true }),
    kort({ id: 13, nafn: 'Aðeins skýrsla', docs: { skyrsla: {} } }),
  ];
  const h = F.drawerRows(listi, true);
  const rod = (nafn) => h.indexOf('>' + nafn);
  assert.match(h, /LÍKLEGA BÚIN — merki um úttekt 2026 eru til · 3/);
  assert.match(h, /ENGIN MERKI UM ÚTTEKT 2026 · 1/);
  // Röðin: fullt par, svo hluta-sönnun (í upphaflegri röð), svo þau sem ekkert bera.
  assert.ok(rod('Fullt par') < rod('Aðeins tæki') && rod('Aðeins tæki') < rod('Aðeins skýrsla') && rod('Aðeins skýrsla') < rod('Engin merki'), h);
  assert.ok(h.indexOf('LÍKLEGA BÚIN') < rod('Fullt par') && h.indexOf('ENGIN MERKI') > rod('Aðeins skýrsla') && h.indexOf('ENGIN MERKI') < rod('Engin merki'));
});

test('Á dagskrá: takkarnir ráðast af sönnuninni — og ekkert merkist sjálfkrafa', () => {
  const h = F.drawerRows([
    kort({ id: 10, nafn: 'Engin merki' }),
    kort({ id: 11, nafn: 'Aðeins tæki', skodud: { n: 4, sidast: '2026-09-02' } }),
    kort({ id: 12, nafn: 'Fullt par', doneDocs: true, docs: { skyrsla: {}, reik: {} }, hasReik: true }),
  ], true);
  const takkar = (id) => [...h.matchAll(new RegExp('data-act="([a-z]+)" data-id="' + id + '"', 'g'))].map((m) => m[1]);
  assert.deepEqual(takkar(10), ['start']);                       // óbreytt: „▶ Hefja vinnslu“
  assert.deepEqual(takkar(11), ['open', 'start', 'buid']);       // hluta-sönnun: opna og staðfesta, svo í vinnslu EÐA búið — Agnar velur
  assert.deepEqual(takkar(12), ['removedone']);                  // fullt par: „✔️ Fjarlægja“ eins og áður
  assert.match(h, /data-sonnun="1" style="flex-wrap:wrap;row-gap:6px"><span class="nm">Aðeins tæki/);
  assert.match(h, /🔧 4 tæki skoðuð 02\.09\./);
  assert.ok(!/data-sonnun="\d+"><span class="nm">Engin merki/.test(h));
  // Röð án sönnunar er NÁKVÆMLEGA eins og fyrir breytinguna.
  assert.ok(h.includes('<div class="sv-drawer-row"><span class="nm">Engin merki</span>'), h.slice(-400));
});

test('óbreytt þegar engin sönnun er til, og „Búið í ár“-skúffan er ósnert', () => {
  const an = F.drawerRows([kort({ id: 1, nafn: 'A' }), kort({ id: 2, nafn: 'B', units: 7 })], true);
  assert.ok(!/LÍKLEGA BÚIN|ENGIN MERKI|sv-drawer-sub|sv-sn/.test(an), an);
  assert.match(an, /🧯 7/);
  const buid = F.drawerRows([kort({ id: 3, nafn: 'C', docs: { skyrsla: {} }, hasReik: true, skodud: { n: 2, sidast: '2026-05-05' } })], false);
  assert.ok(!/LÍKLEGA BÚIN|sv-sn|data-sonnun/.test(buid), buid);        // sönnun á aðeins við „Á dagskrá“
  assert.match(buid, /data-act="open" data-id="3"/);
  assert.equal(F.drawerRows([], true), '<div class="sv-drawer-row"><span class="mn">Ekkert hér.</span></div>');
});

test('nafn og vísbendingar eru flúin', () => {
  const h = F.drawerRows([kort({ id: 9, nafn: '<img src=x onerror=alert(1)>', skodud: { n: 2, sidast: '2026-01-01"><script>' } })], true);
  assert.ok(!/<img|<script/.test(h), h);
});

test('190 er tengt: tækin eru sótt einu sinni, spjaldið ber vísbendingarnar og flísin telur þær', () => {
  assert.match(SRC, /if \(!_skodLoaded\) \{ _skodLoaded = true; loadSkodud\(\); \}/);
  assert.match(SRC, /\.select\('fyrirtaeki_id,last_insp'\)\.gte\('last_insp', curYear \+ '-01-01'\)/);
  assert.match(SRC, /hasReik: hasReik,/);
  assert.match(SRC, /skodud: _skodByCo \? \(_skodByCo\.get\(String\(co\.id\)\) \|\| null\) : null,/);
  assert.match(SRC, /const dSonnun = b\.dagskra\.filter\(r => r\.doneDocs \|\| sonnun\(r\)\.length\)\.length;/);
  // Sóknarvilla má ekki verða að „0 tæki skoðuð“: catch skilar án þess að setja kortið.
  const l = SRC.match(/async function loadSkodud\(\) \{[\s\S]*?\n  \}/)[0];
  assert.match(l, /\} catch \(_\) \{ return; \}/);
  // „✓ Búið“ í skúffunni notar sömu aðgerð og spjöldin (markBuid) — engin ný skrifleið.
  assert.match(SRC, /else if \(act === 'buid'\) markBuid\(id\);/);
});
