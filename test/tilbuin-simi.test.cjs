// Próf: Tilbúin verk — símasíðan (515, 17.11.2026). Keyrsla: node --test test/tilbuin-simi.test.cjs
//
// AF HVERJU: síðan FRAMKVÆMIR verk (sendir póst, sendir kröfu) úr símanum. Það sem má aldrei bila:
//   1. EIN heimild — síðan á enga eigin sendileið: aðaltakkinn ber data-baf="framkvaema" sem 511 (sama fall og borðið)
//      tekur við, með sömu tveggja smella staðfestingu; engin fetch-köll í 515;
//   2. eyður í hornklofum ([AFHENDINGARDAGUR]) og óstaðfest ágiskun stöðva takkann (disabled) og sjást rauðar;
//   3. eyðureglan er SÚ SAMA og þjónsins (EYDA í afgreidsla.cjs);
//   4. röðin: VIP → peningar → forgangur þjónsins → virði;
//   5. 511 lætur síðuna vita af breytingum þótt borðið (Bord368) sé ekki til (síminn);
//   6. VIP-merkið á þjóninum notar sömu pörun og VIP-vaktin (netfang, lén, kt — aldrei almennt lén).
// Öll gögn tilbúin (example.is), engin raunveruleg nöfn, símanúmer eða upphæðir.
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROT = path.join(__dirname, '..');
const K511 = fs.readFileSync(path.join(ROT, 'js/patches/511-bord-afgreidsla.js'), 'utf8');
const K515 = fs.readFileSync(path.join(ROT, 'js/patches/515-tilbuin-simi.js'), 'utf8');

function heimur(svor) {
  const kollud = [];
  const w = { setTimeout, clearTimeout, console, Toast: { show: (t) => w._tost.push(t) }, _tost: [] };
  w.fetch = (url, opts) => {
    const body = opts && opts.body ? JSON.parse(opts.body) : null;
    kollud.push({ url, method: (opts && opts.method) || 'GET', body });
    const s = svor ? svor((opts && opts.method) || 'GET', body) : { status: 200, json: { tilbuin: [] } };
    return Promise.resolve({ status: s.status, json: () => Promise.resolve(s.json) });
  };
  w.window = w;
  vm.runInNewContext(K511, w, { filename: '511' });
  vm.runInNewContext(K515, w, { filename: '515' });
  return { w, A: w.BordAfgreidsla, T: w.TilbuinSimi, kollud };
}
const verk = (y) => Object.assign({ id: 1, tegund: 'tolvupostur', titill: 'Svar', takki: 'Senda svarið', hvad_gerist: 'Svarið fer.', ok: true,
  af_hverju: [{ texti: 'Kúnninn spurði' }], athuganir: [{ texti: 'Í lagi', ok: true }], virdi_kr: null, forgangur: 50, vip: null,
  post: { account: 'posthus@example.is', to: ['kunni@example.is'], cc: [], subject: 'Re: Fyrirspurn', texti: 'Góðan dag.', vidhengi: [] } }, y || {});

test('eyðureglan er sú sama og þjónsins (afgreidsla.cjs EYDA)', () => {
  const thjonn = fs.readFileSync(path.join(ROT, 'netlify/functions/afgreidsla.cjs'), 'utf8').match(/const EYDA = \/(.+)\/;/)[1];
  const { T } = heimur();
  assert.strictEqual(T.EYDA.source, thjonn);
  assert.deepStrictEqual(Array.from(T.eydur('Afhent [AFHENDINGARDAGUR], [AFHENDINGARDAGUR] og [nafn]')), ['[AFHENDINGARDAGUR]', '[nafn]']);
  assert.strictEqual(T.eydur('Engar eyður hér.').length, 0);
});

test('röðin: VIP efst, svo peningar, svo forgangur, svo virði', () => {
  const { T } = heimur();
  const l = [
    verk({ id: 1, forgangur: 10 }),                                   // annað, hæsti forgangur
    verk({ id: 2, tegund: 'krafa', virdi_kr: 20000, forgangur: 50 }), // peningar
    verk({ id: 3, virdi_kr: 90000, forgangur: 50 }),                  // peningar, meira virði
    verk({ id: 4, vip: { felag: 'Dæmi', hvernig: 'netfang' }, forgangur: 90 }),
    verk({ id: 5, virdi_kr: 50000, forgangur: 20 }),                  // peningar, hærri forgangur
  ];
  assert.deepStrictEqual(T.rada(l).map((v) => v.id), [4, 5, 3, 2, 1]);
});

test('síur og teljarar eftir tegund', () => {
  const { T } = heimur();
  const l = [verk({ id: 1 }), verk({ id: 2, tegund: 'simtal' }), verk({ id: 3, tegund: 'simtal' }), verk({ id: 4, tegund: 'krafa' })];
  assert.deepStrictEqual(T.sia(l, 'simtal').map((v) => v.id), [2, 3]);
  assert.strictEqual(T.sia(l, 'allt').length, 4);
  const t = T.teljarar(l);
  assert.strictEqual(t.allt, 4); assert.strictEqual(t.simtal, 2); assert.strictEqual(t.krafa, 1); assert.strictEqual(t.tolvupostur, 1);
});

test('stöðvanir: eyða, ágiskun og fallin athugun stöðva — hreint verk ekki', () => {
  const { T } = heimur();
  assert.match(T.stodvun(verk(), 'Afhending [AFHENDINGARDAGUR]'), /Fylltu inn \[AFHENDINGARDAGUR\]/);
  assert.match(T.stodvun(verk({ ok: false, athuganir: [{ texti: 'ÁGISKUN', ok: false, agiskun: 'bokhald@example.is' }] }), 'Hreint'), /Ágiskað netfang: bokhald@example\.is/);
  assert.match(T.stodvun(verk({ ok: false }), 'Hreint'), /Athugun stóðst ekki/);
  assert.strictEqual(T.stodvun(verk(), 'Góðan dag.'), null);
});

test('spjaldið: aðaltakkinn er 511-takkinn (data-baf="framkvaema") og óvirkur meðan eyða stendur', () => {
  const { A, T } = heimur();
  A.S.tilbuin = [verk({ post: Object.assign(verk().post, { texti: 'Afhent [AFHENDINGARDAGUR].' }) })];
  const m = T._spjald(A.S.tilbuin[0], A);
  assert.match(m, /<button type="button" class="ts-go" data-baf="framkvaema" data-id="1" disabled>/);
  assert.match(m, /Fylltu inn: <code>\[AFHENDINGARDAGUR\]<\/code>/);
  assert.match(m, /data-baf-texti="1" data-ritun="1"/);      // sami innsláttarreitur og borðið — drögin fara í S.textaDrog
  // Eyðan fyllt í drögunum → takkinn virkur, sami texti og fer út
  A.S.textaDrog[1] = 'Afhent 20. nóvember.';
  assert.match(T._spjald(A.S.tilbuin[0], A), /class="ts-go" data-baf="framkvaema" data-id="1">Senda svarið</);
});

test('tveggja smella staðfesting er 511: fyrri smellur vopnar, seinni framkvæmir — með textanum úr drögunum', async () => {
  const { A, T, kollud } = heimur((m, b) => (m === 'POST' ? { status: 200, json: { ok: true } } : { status: 200, json: { tilbuin: [] } }));
  A.S.tilbuin = [verk()];
  A.S.textaDrog[1] = 'Breyttur texti.';
  const takki = { getAttribute: (k) => ({ 'data-baf': 'framkvaema', 'data-id': '1' })[k] };
  const smella = () => A.smellur({ target: { closest: () => takki } });
  assert.strictEqual(smella(), null);
  assert.strictEqual(kollud.filter((k) => k.method === 'POST').length, 0, 'fyrri smellur má ekki senda');
  assert.match(T._spjald(A.S.tilbuin[0], A), /Ýttu aftur til að staðfesta/);
  await smella();
  const p = kollud.filter((k) => k.method === 'POST');
  assert.strictEqual(p.length, 1);
  assert.deepStrictEqual({ id: p[0].body.id, adgerd: p[0].body.adgerd, texti: p[0].body.texti }, { id: 1, adgerd: 'framkvaema', texti: 'Breyttur texti.' });
  assert.strictEqual(p[0].url, '/api/afgreidsla');
});

test('515 á enga eigin sendileið: engin fetch, XMLHttpRequest né /api-slóð í skránni', () => {
  const an = K515.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
  assert.ok(!/fetch\s*\(|XMLHttpRequest|\/api\//.test(an), 'símasíðan á aðeins að nota 511');
});

test('511 lætur síðuna vita án borðsins (síminn) og toast fer á Toast.show', async () => {
  const { A, w } = heimur(() => ({ status: 200, json: { tilbuin: [verk({ id: 7 })] } }));
  let n = 0; A.vakta(() => { n++; });
  await A.uppfaera();
  assert.ok(n >= 1, 'vaktarinn var ekki kallaður');
  assert.strictEqual(A.S.tilbuin.length, 1);
  assert.strictEqual(A.finna(7).id, 7);
});

test('símtal: smellanlegt númer (tel:) og handritið', () => {
  const { A, T } = heimur();
  const v = verk({ id: 3, tegund: 'simtal', post: undefined, simtal: { hverjum: 'Jón í Dæmi ehf', simi: '555 0100', handrit: 'Segja að skýrslan sé tilbúin.' } });
  A.S.tilbuin = [v];
  const m = T._spjald(v, A);
  assert.match(m, /href="tel:5550100"/);
  assert.match(m, /Segja að skýrslan sé tilbúin\./);
  assert.match(m, /Hringja í Jón í Dæmi ehf/);
});

test('VIP-merkið á þjóninum: sama pörun og VIP-vaktin', () => {
  const Af = require(path.join(ROT, 'netlify/functions/afgreidsla.cjs'));
  const V = require(path.join(ROT, 'netlify/functions/_vip-postur.cjs'));
  const visir = V.byggjaVisi([{ id: 1, nafn: 'Dæmi ehf', kennitala: '5001012340', netfang: 'skrifstofa@daemi.example.is', vip: true }], []);
  assert.deepStrictEqual(Af._vipFyrir({ to: ['skrifstofa@daemi.example.is'] }, 'tolvupostur', visir), { felag: 'Dæmi ehf', hvernig: 'netfang' });
  assert.deepStrictEqual(Af._vipFyrir({ to: ['annar@daemi.example.is'] }, 'tolvupostur', visir), { felag: 'Dæmi ehf', hvernig: 'lén' });
  assert.deepStrictEqual(Af._vipFyrir({ kennitala: '500101-2340' }, 'simtal', visir), { felag: 'Dæmi ehf', hvernig: 'kennitala' });
  assert.strictEqual(Af._vipFyrir({ to: ['einhver@gmail.com'] }, 'tolvupostur', visir), null);
  assert.strictEqual(Af._vipFyrir({ to: ['skrifstofa@daemi.example.is'] }, 'tolvupostur', null), null);
});

test('261: síðan er í PAGES, heimasíða Þjónustuborðs-appsins og fremst í vistuðum lista (insertOnce __tlb1)', () => {
  const s = fs.readFileSync(path.join(ROT, 'js/patches/261-app-profiles.js'), 'utf8');
  assert.match(s, /\{ k: 'tilbuin-verk',\s+label: 'Tilbúin verk/);
  assert.match(s, /manifest: '\/manifest-verkefni\.json', home: 'tilbuin-verk'/);
  assert.match(s, /defaults: \['tilbuin-verk', 'bord', /);
  assert.match(s, /insertOnce\('__tlb1',\s+'tilbuin-verk', null, 'verkefni'\)/);
  assert.match(s, /var ki = afterKey === null \? -2 : arr\.indexOf\(afterKey\);\s+arr\.splice\(ki === -2 \? 0 :/);
  const a = fs.readFileSync(path.join(ROT, 'tools/audit-app-sidulisti.cjs'), 'utf8');
  assert.match(a, /__tlb1: 1/);
  const h = fs.readFileSync(path.join(ROT, 'index.html'), 'utf8');
  assert.ok(h.indexOf('511-bord-afgreidsla.js') < h.indexOf('515-tilbuin-simi.js'), '515 verður að hlaðast á eftir 511');
});

test('261 skelSidur: heimasíðan fremst; sé hún tekin út fer varaheimasíðan (borðið) fremst, ekki fyrsta vistaða síðan', () => {
  const s = fs.readFileSync(path.join(ROT, 'js/patches/261-app-profiles.js'), 'utf8');
  const i = s.indexOf('function skelSidur(a) {'), j = s.indexOf('\n  }\n', i);
  const skel = (listi) => new Function('pagesFor', s.slice(i, j + 4) + '; return skelSidur;')(() => listi.slice());
  const app = { key: 'verkefni', home: 'tilbuin-verk', homeVara: 'bord', defaults: [] };
  assert.deepStrictEqual(skel(['krofu-yfirlit', 'sala', 'bord', 'tilbuin-verk'])(app).slice(0, 2), ['tilbuin-verk', 'krofu-yfirlit']);
  assert.deepStrictEqual(skel(['krofu-yfirlit', 'sala', 'bord'])(app)[0], 'bord');
  assert.deepStrictEqual(skel(['krofu-yfirlit', 'sala'])(app)[0], 'krofu-yfirlit');
});
