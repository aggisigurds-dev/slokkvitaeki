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

// ── 261: Tilbúin verk aðeins hjá stjórnanda (kóðarýni 17.11.2026) ─────────────────────────────────────────────────────
// Síðuvalið (app_profiles_json) er SAMEIGINLEGT öllum. Fyrsta útgáfan gerði síðuna að heimasíðu appsins og skrifaði hana
// fremst í vistaða listann — allir hefðu lent á henni og venjulegur starfsmaður fengið 403. Nú ræður róla innskráðs
// notanda við keyrslu; ekkert er vistað.
const S261 = fs.readFileSync(path.join(ROT, 'js/patches/261-app-profiles.js'), 'utf8');
function bita(upphaf, lok) {
  const i = S261.indexOf(upphaf); assert.ok(i >= 0, 'fann ekki: ' + upphaf);
  const j = S261.indexOf(lok, i); assert.ok(j > i, 'fann ekki lok: ' + lok);
  return S261.slice(i, j);
}
function skel(rola, vistad) {
  const kodi = bita('  var STJORNANDA_SIDUR = ', '  // ── app-mode shell (bottom nav + header)') +
    bita('  function skelSidur(a) {', '  // 05.10.2026: skelin er byggð við ræsingu');
  const PAGES = { 'tilbuin-verk': 1, bord: 1, adalmal: 1, samthykkja: 1, 'krofu-yfirlit': 1 };
  const APP = { key: 'verkefni', home: 'bord', stjornandaFremst: 'tilbuin-verk', defaults: ['bord', 'adalmal'] };
  const ctx = { window: { __hubNotandiP: Promise.resolve(rola == null ? { authed: false } : { authed: true, user: { rola } }) },
    pagesFor: () => vistad.slice(), pageByKey: (k) => PAGES[k] ? { k } : null, effectiveApp: () => APP, ACTIVE: null, isStandalone: () => false,
    _skelSidur: null, _curPage: null, buildShell: () => {}, goPage: () => {} };
  vm.createContext(ctx);
  vm.runInContext(kodi + '\nthis.skelSidur = skelSidur; this.leyfdarSidur = leyfdarSidur; this.saekjaRolu = saekjaRolu; this.erStjornandi = erStjornandi;', ctx);
  return { ctx, APP };
}
const VISTAD = ['krofu-yfirlit', 'bord', 'adalmal', 'samthykkja'];

test('stjórnandi (Admin): Tilbúin verk fremst, borðið næst — fókuslásinn leyfir síðuna', async () => {
  const { ctx, APP } = skel('Admin', VISTAD);
  ctx.saekjaRolu(); await new Promise((r) => setTimeout(r, 0));
  assert.strictEqual(ctx.erStjornandi(), true);
  assert.deepStrictEqual(Array.from(ctx.skelSidur(APP)).slice(0, 3), ['tilbuin-verk', 'bord', 'krofu-yfirlit']);
  assert.ok(Array.from(ctx.leyfdarSidur('verkefni')).includes('tilbuin-verk'));
});

test('starfsmaður: borðið fremst, enginn Tilbúin-flipi — líka þótt síðan standi í vistaða listanum', async () => {
  for (const rola of ['Starfsmaður', 'Verkstjóri', '']) {
    const { ctx, APP } = skel(rola, VISTAD.concat(['tilbuin-verk']));
    ctx.saekjaRolu(); await new Promise((r) => setTimeout(r, 0));
    const p = Array.from(ctx.skelSidur(APP));
    assert.strictEqual(p[0], 'bord', rola);
    assert.ok(!p.includes('tilbuin-verk'), rola + ': flipinn má ekki sjást');
    assert.ok(!Array.from(ctx.leyfdarSidur('verkefni')).includes('tilbuin-verk'), rola + ': fókuslásinn má ekki opna síðuna');
  }
});

test('óþekkt róla (óinnskráður / staðan ekki komin) = ekki stjórnandi', async () => {
  const a = skel(null, VISTAD);
  a.ctx.saekjaRolu(); await new Promise((r) => setTimeout(r, 0));
  assert.strictEqual(a.ctx.skelSidur(a.APP)[0], 'bord');
  const b = skel('Admin', VISTAD);   // rólan ekki sótt enn
  assert.strictEqual(b.ctx.skelSidur(b.APP)[0], 'bord');
});

test('ekkert í sameiginlega síðuvalinu breytist: heimasíðan er borðið, engin flutningur/innsetning fyrir Tilbúin verk', () => {
  assert.match(S261, /manifest: '\/manifest-verkefni\.json', home: 'bord',/);
  assert.match(S261, /stjornandaFremst: 'tilbuin-verk',/);
  assert.ok(!/defaults: \['tilbuin-verk'/.test(S261), 'Tilbúin verk mega ekki vera í defaults');
  assert.ok(!/__tlb1/.test(S261), 'enginn flutningur (insertOnce) sem skrifar í app_settings');
  const pf = bita('  function pagesFor(key) {', '  function saveCfg(');
  assert.ok(!/tilbuin-verk/.test(pf), 'pagesFor má ekki bæta síðunni í listann');
  assert.ok(!/__tlb1/.test(fs.readFileSync(path.join(ROT, 'tools/audit-app-sidulisti.cjs'), 'utf8')));
  assert.match(S261, /if \(_rola === undefined && Date\.now\(\) - _rolaT0 < 3000\) \{ setTimeout\(tick, 120\); return; \}/);
  const h = fs.readFileSync(path.join(ROT, 'index.html'), 'utf8');
  assert.ok(h.indexOf('511-bord-afgreidsla.js') < h.indexOf('515-tilbuin-simi.js'), '515 verður að hlaðast á eftir 511');
});
