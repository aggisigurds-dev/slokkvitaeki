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
  const kortF = SRC.match(/\n  function skodudKort\(rows, ar, iDag\) \{[\s\S]*?\n  \}/);
  assert.ok(sonnun && flis && haus && rodir && btn && kortF, 'náði ekki sonnun/snFlis/snHaus/drawerRows/btn/skodudKort úr 190');
  const esc = "const esc = s => String(s == null ? '' : s).replace(/[&<>\"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;', \"'\": '&#39;' }[c]));";
  // mkMerki / mkGluggi (Merkja og keyra, 519-eintak verkstæðisins): tóm sjálfgefið — eins og hjá öllum öðrum en Agnari.
  return new Function('curYear', ['let _buidSpurt = null; let _mk = { merki: () => "", gluggi: () => "" };',
    'const mkMerki = (r) => _mk.merki(r), mkGluggi = (r) => _mk.gluggi(r);', esc, btn[0], sonnun[0], kortF[0], flis[0], haus[0], rodir[0]].join('\n') +
    '\nreturn { sonnun, drawerRows, skodudKort, spyrja: (id) => { _buidSpurt = id; }, mk: (o) => { _mk = o || { merki: () => "", gluggi: () => "" }; } };')(AR);
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

test('sonnun: 1. dagur mánaðar = aðeins mánuðurinn var skráður → mánuðurinn sýndur, aldrei dagur sem enginn skráði', () => {
  // Mælt í raungögnum 18.11.2026: 2.483 af 4.319 tækjum með skoðun á árinu bera 1. dag mánaðar.
  const feb = F.sonnun(kort({ skodud: { n: 5, sidast: '2026-02-01' } }))[0];
  assert.equal(feb.t, '🔧 5 tæki skoðuð í febrúar');
  assert.ok(!/01\.02\./.test(feb.t + feb.tt), feb.tt);
  assert.match(feb.tt, /síðast í febrúar — aðeins mánuðurinn er skráður/);
  assert.equal(F.sonnun(kort({ skodud: { n: 1, sidast: '2026-06-01' } }))[0].t, '🔧 1 tæki skoðað í júní');
  // Raunverulegur dagur stendur óbreyttur, líka 10. og 31.
  assert.equal(F.sonnun(kort({ skodud: { n: 3, sidast: '2026-10-31' } }))[0].t, '🔧 3 tæki skoðuð 31.10.');
  assert.match(F.sonnun(kort({ skodud: { n: 3, sidast: '2026-10-31' } }))[0].tt, /\(síðast 31\.10\.\)/);
  // Gallaður dagur → engin dagsetning, aldrei „undefined“ eða „NaN“.
  for (const d of ['2026-13-01', 'rusl', '2026-02', null, undefined]) {
    const x = F.sonnun(kort({ skodud: { n: 2, sidast: d } }))[0];
    assert.ok(!/undefined|NaN|null/.test(x.t + x.tt), d + ' → ' + x.t + ' | ' + x.tt);
  }
  assert.equal(F.sonnun(kort({ skodud: { n: 2, sidast: 'rusl' } }))[0].t, '🔧 2 tæki skoðuð');
  for (const d of ['2026-13-01', '2026-00-10', '2026-05-00', '2026-05-40']) assert.equal(F.sonnun(kort({ skodud: { n: 2, sidast: d } }))[0].t, '🔧 2 tæki skoðuð', d);
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
  assert.deepEqual(takkar(11), ['open', 'start', 'buidspyrja']);  // hluta-sönnun: opna og staðfesta, svo í vinnslu EÐA búið — Agnar velur
  assert.deepEqual(takkar(12), ['removedone']);                  // fullt par: „✔️ Fjarlægja“ eins og áður
  assert.match(h, /data-sonnun="1" style="flex-wrap:wrap;row-gap:6px"><span class="nm">Aðeins tæki/);
  assert.match(h, /🔧 4 tæki skoðuð 02\.09\./);
  assert.ok(!/data-sonnun="\d+"><span class="nm">Engin merki/.test(h));
  // Röð án sönnunar er NÁKVÆMLEGA eins og fyrir breytinguna.
  assert.ok(h.includes('<div class="sv-drawer-row"><span class="nm">Engin merki</span>'), h.slice(-400));
});

test('„✓ Búið“ í skúffunni þarf TVO smelli: fyrri smellur vopnar aðeins þá röð', () => {
  const listi = [kort({ id: 11, nafn: 'A', skodud: { n: 4, sidast: '2026-09-02' } }), kort({ id: 14, nafn: 'B', hasReik: true })];
  const takkar = (h, id) => [...h.matchAll(new RegExp('data-act="([a-z]+)" data-id="' + id + '"', 'g'))].map((m) => m[1]);
  const fyrir = F.drawerRows(listi, true);
  assert.ok(!/data-act="buid"/.test(fyrir), 'enginn takki má merkja búið í einum smelli');
  F.spyrja(14);
  const eftir = F.drawerRows(listi, true);
  assert.deepEqual(takkar(eftir, 14), ['open', 'start', 'buid']);
  assert.deepEqual(takkar(eftir, 11), ['open', 'start', 'buidspyrja']);   // hin röðin er óvopnuð
  assert.match(eftir, /Staðfesta búið/);
  F.spyrja(null);
  assert.ok(!/data-act="buid"/.test(F.drawerRows(listi, true)));
  // Smellahlustunin: fyrri smellur merkir EKKERT, seinni kallar á markBuid og afvopnar; skúffurofinn afvopnar líka.
  assert.match(SRC, /else if \(act === 'buidspyrja'\) \{ _buidSpurt = id; render\(\); \}/);
  assert.match(SRC, /else if \(act === 'buid'\) markBuid\(id\);/);
  // Endurrýni: HVER smellur á spjaldatakka afvopnar fyrst (Í vinnslu → Afmerkja skilaði annars vopnaðri röð).
  const hl = SRC.slice(SRC.indexOf("v.querySelectorAll('._sv-act')"));
  const afv = hl.indexOf('_buidSpurt = null;'), fyrsta = hl.indexOf("if (act === 'open')");
  assert.ok(afv > 0 && fyrsta > 0 && afv < fyrsta, 'afvopnun verður að standa á undan aðgerðunum í smellahlustuninni');
  assert.match(SRC, /_openBuid = !_openBuid;\r?\n\s*_buidSpurt = null;/);
});

test('skodudKort: aðeins raunveruleg skoðun telst — ekki nýskráning, úrelt tæki, annað ár né dagur fram í tímann', () => {
  const I = '2026-11-18';
  const m = F.skodudKort([
    { fyrirtaeki_id: 7, last_insp: '2026-09-24', status: 'active', created_at: '2024-03-01T10:00:00+00:00' },
    { fyrirtaeki_id: 7, last_insp: '2026-10-02', status: 'Í lagi', created_at: '2024-03-01T10:00:00+00:00' },
    { fyrirtaeki_id: 7, last_insp: '2026-10-05', status: 'urelt', created_at: '2024-03-01T10:00:00+00:00' },      // úrelt
    { fyrirtaeki_id: 7, last_insp: '2026-10-09', status: 'active', created_at: '2026-10-09T08:12:00+00:00' },     // nýskráð þann dag
    { fyrirtaeki_id: 7, last_insp: '2026-12-01', status: 'active', created_at: '2024-03-01T10:00:00+00:00' },     // fram í tímann
    { fyrirtaeki_id: 7, last_insp: '2025-12-30', status: 'active', created_at: '2024-03-01T10:00:00+00:00' },     // annað ár
    { fyrirtaeki_id: 8, last_insp: '2026-02-01', status: null, created_at: null },
    { fyrirtaeki_id: 9, last_insp: '2026-05-05', status: 'URELT', created_at: null },
    { fyrirtaeki_id: null, last_insp: '2026-05-05' }, { fyrirtaeki_id: 10, last_insp: 'rusl' }, null,
  ], 2026, I);
  assert.deepEqual([...m.keys()].sort(), ['7', '8']);
  assert.deepEqual(m.get('7'), { n: 2, sidast: '2026-10-02' });
  assert.deepEqual(m.get('8'), { n: 1, sidast: '2026-02-01' });
  assert.equal(F.skodudKort(null, 2026, I).size, 0);
  // Dagurinn í dag telst (skoðað í morgun), morgundagurinn ekki.
  assert.equal(F.skodudKort([{ fyrirtaeki_id: 1, last_insp: I, created_at: '2020-01-01T00:00:00Z' }], 2026, I).size, 1);
  assert.equal(F.skodudKort([{ fyrirtaeki_id: 1, last_insp: '2026-11-19', created_at: '2020-01-01T00:00:00Z' }], 2026, I).size, 0);
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
  assert.match(SRC, /\.select\('fyrirtaeki_id,last_insp,status,created_at'\)\.gte\('last_insp', curYear \+ '-01-01'\)\.lte\('last_insp', iDag\)/);
  assert.match(SRC, /_skodByCo = skodudKort\(rows, curYear, iDag\);/);
  assert.match(SRC, /hasReik: hasReik,/);
  assert.match(SRC, /skodud: _skodByCo \? \(_skodByCo\.get\(String\(co\.id\)\) \|\| null\) : null,/);
  assert.match(SRC, /const dSonnun = b\.dagskra\.filter\(r => r\.doneDocs \|\| sonnun\(r\)\.length\)\.length;/);
});

/* ── Merkja og keyra á verkstæðinu (18.11.2026): merkið á hverri „Á dagskrá“-röð og spjaldi, glugginn undir ───────── */
test('Á dagskrá: ◇-merkið stendur á undan tökkunum og glugginn UNDIR röðinni; „Búið í ár“ fær hvorugt', () => {
  const listi = [kort({ id: 10, nafn: 'Engin merki' }), kort({ id: 11, nafn: 'Aðeins tæki', skodud: { n: 4, sidast: '2026-09-02' } }), kort({ id: 12, nafn: 'Fullt par', doneDocs: true, docs: { skyrsla: {}, reik: {} }, hasReik: true })];
  F.mk({ merki: (r) => '<button class="mk-m" data-t5="mk-opna" data-id="' + r.id + '">◇</button>', gluggi: (r) => (r.id === 11 ? '<div class="mk-g">GLUGGI</div>' : '') });
  try {
    const h = F.drawerRows(listi, true);
    for (const id of [10, 11, 12]) {
      const m = h.indexOf('data-t5="mk-opna" data-id="' + id + '"'), t = h.indexOf('class="_sv-act"', m);
      assert.ok(m > 0 && t > m, 'merkið á röð ' + id + ' á að standa á undan tökkunum');
    }
    assert.strictEqual((h.match(/data-t5="mk-opna"/g) || []).length, 3, 'eitt merki á röð');
    // Glugginn kemur beint á eftir lokun raðarinnar sem á hann — ekki inni í henni (röðin er flex-lína).
    assert.match(h, /data-act="buidspyrja" data-id="11"[^<]*>✓ Búið<\/button><\/span><\/div><div class="mk-g">GLUGGI<\/div>/);
    const b = F.drawerRows([kort({ id: 3, nafn: 'C' })], false);
    assert.ok(!/mk-m|mk-g/.test(b), '„Búið í ár“ er ekki merkt: ' + b);
  } finally { F.mk(null); }
});

test('190 er tengt við Merkja og keyra: eigið eintak (verkstaedi / fyrirtaeki_id), aðeins hjá Agnari, smellir og teljari', () => {
  const st = SRC.slice(SRC.indexOf('function mkv()'), SRC.indexOf('const mkBar ='));
  assert.match(st, /MK\.buaTil\(\{ bord: 'verkstaedi', lykill: 'fyrirtaeki_id', view: VIEW_ID, sedLykill: 'merkja_sed_verkst',/);
  // Gátin: `ma` er sjálfgefna gátin úr 519 (n === 'Agnar') og má ekki yfirskrifa; `nu` kemur frá INNSKRÁÐA notandanum
  // (mkHver), ekki „Ég er“-valinu sem er sjálfgefið „Agnar“ á tækjum þar sem enginn hefur valið (350).
  assert.ok(!/\bma:/.test(st), 'eintak verkstæðisins má ekki yfirskrifa aðgangsgátina');
  assert.match(st, /nu: \(\) => mkHver\(\),/);
  assert.match(SRC, /const MK_MA = \[1, 10\];/, 'aðeins Agnar (uid 1) og Lota (uid 10)');
  assert.ok(!/Samthykkja/.test(SRC.slice(SRC.indexOf('const mkHver = '), SRC.indexOf('const mkMerki = '))), 'gátin má ekki byggja á „Ég er“-valinu');
  assert.match(SRC, /const mkBar = \(\) => \{ try \{ const m = mkv\(\); return m \? m\.html\(mkHver\(\)\) : ''; \} catch \(_\) \{ return ''; \} \};/);
  assert.match(st, /teikna: \(\) => \{ const v = viewEl\(\); if \(v && v\.classList\.contains\('active'\)\) render\(\); \},/, 'teiknar aðeins virka sýn');
  assert.match(st, /opna: \(id\) => openCompany\(id\),/);
  // Teljarinn stendur ofan við listana; smellir á mk-* fara til eintaksins og stöðva bólun (spjaldið má ekki opnast).
  assert.match(SRC, /\n      mkBar\(\) \+ dagskraDrawer \+ buidDrawer \+ body \+ '<\/div>';/);
  assert.match(SRC, /v\.querySelectorAll\('\[data-t5\^="mk-"\]'\)\.forEach\(el => el\.addEventListener\('click', e => \{ e\.stopPropagation\(\); const m = mkv\(\); if \(m\) m\.smellur\(el, e\); \}\)\);/);
  // Öll þrjú spjaldaútlitin (listi, spjöld, breitt) bera merkið í takkaröðinni og gluggann undir henni.
  for (const f of ['vinnslaActs', 'spjActs', 'vinnslaActsWide']) {
    const k = SRC.slice(SRC.indexOf('function ' + f + '(r) {'));
    const b = k.slice(0, k.indexOf('\n  }'));
    assert.ok(/mkMerki\(r\)/.test(b) && /'<\/div>' \+ mkGluggi\(r\);/.test(b), f + ' vantar merkið eða gluggann');
  }
});

test('190 + 519 saman í vm: verkstæðið býr til SITT eintak og sækir SÍNAR merkingar — og aðeins innskráður Agnar (eða Lota) sér það', async () => {
  const vm = require('node:vm');
  const K519 = fs.readFileSync(path.join(__dirname, '..', 'js', 'patches', '519-merkja-keyra.js'), 'utf8');
  const st = SRC.slice(SRC.indexOf('  const MK_MA = '), SRC.indexOf('  function note(r) {'));
  const kollud = [], haus = [];
  const h = { setTimeout, clearTimeout, console, Date, Promise, JSON, Math, Object, Array, Map, Set, String, Number };
  h.window = h; h.setInterval = () => 0; h.clearInterval = () => {};
  h.document = { hidden: false, addEventListener() {}, getElementById: (id) => (id === '_sv-mk' ? (haus.length ? {} : null) : { classList: { contains: () => true } }),
    createElement: () => ({}), head: { appendChild: (e) => haus.push(e) } };
  h.fetch = (url, o) => { kollud.push({ url, body: o && o.body ? JSON.parse(o.body) : null }); return Promise.resolve({ status: 200, json: () => Promise.resolve({ ok: true, claude_virkt: true,
    merkingar: [{ id: 1, bord: 'verkstaedi', fyrirtaeki_id: 1934, merki: 'yfirfara', stada: 'merkt' }], teljari: { merkt: 1 } }) }); };
  h.Samthykkja = { nu: () => 'Agnar' };   // „Ég er“-valið segir ALLTAF Agnar hér (sjálfgefið á óvalinni tölvu) — það má ekki ráða
  let innskradur = { notandi: { id: 3, nafn: 'Annar stjórnandi', rola: 'Admin' }, skoda: null };
  h.Adgangsstyring = { stada: () => innskradur };
  let teikn = 0;
  vm.runInNewContext(K519 + '\n;(() => { const VIEW_ID = "view-thjonustu-verkstaedi"; const toast = () => {}; const viewEl = () => ({ classList: { contains: () => true } });' +
    ' const openCompany = () => {}; const render = () => { window.__teikn(); };\n' + st + '\n window.__v = { mkMerki, mkGluggi, mkBar, mkv }; })();', Object.assign(h, { __teikn: () => { teikn++; } }), { filename: '190+519' });
  // Annar stjórnandi (uid 3) á tölvu þar sem „Ég er“ stendur á Agnar: EKKERT teiknað og EKKERT sótt.
  assert.strictEqual(h.__v.mkBar(), ''); assert.strictEqual(h.__v.mkMerki({ id: 1934 }), '');
  await new Promise((r) => setTimeout(r, 40));
  assert.strictEqual(kollud.length, 0, 'ekkert má sækja fyrir aðra en Agnar');
  // Agnar sjálfur (uid 1) innskráður.
  innskradur = { notandi: { id: 1, nafn: 'Agnar', rola: 'Admin' }, skoda: null };
  assert.strictEqual(h.__v.mkMerki({ id: 1934 }), '', 'ekkert merki fyrr en þjónninn hefur hleypt inn');
  assert.strictEqual(h.__v.mkBar(), '');                      // fyrsta teikning ræsir sóknina
  await new Promise((r) => setTimeout(r, 80));
  assert.deepStrictEqual(kollud.map((k) => k.url), ['/api/afgreidsla?merkingar=1&bord=verkstaedi']);
  assert.ok(teikn >= 1, 'sóknin endurteiknar verkstæðið');
  assert.match(h.__v.mkBar(), /▶ Keyra \(1\)/);
  assert.match(h.__v.mkMerki({ id: 1934 }), /data-t5="mk-opna" data-id="1934" data-s="merkt"/);
  assert.strictEqual(h.MerkjaKeyra.verkstaedi, h.__v.mkv());
  assert.strictEqual(haus.length, 1, 'útlitið sett einu sinni');
  // Lota (uid 10) má prófa; „Skoða sem“, annar notandi, óinnskráð eða Adgangsstyring ókomin → ekkert.
  innskradur = { notandi: { id: 10 }, skoda: null };
  assert.match(h.__v.mkBar(), /▶ Keyra/);
  for (const x of [{ notandi: { id: 1 }, skoda: { id: 5 } }, { notandi: { id: 6 }, skoda: null }, { notandi: null, skoda: null }, null]) {
    innskradur = x;
    assert.strictEqual(h.__v.mkBar(), '', JSON.stringify(x)); assert.strictEqual(h.__v.mkMerki({ id: 1934 }), '', JSON.stringify(x));
  }
  delete h.Adgangsstyring;
  assert.strictEqual(h.__v.mkBar(), ''); assert.strictEqual(h.__v.mkMerki({ id: 1934 }), '');
});

/* ── Sóknin sjálf, keyrð (ekki strengjaleit): loadSkodud úr skránni með gervi-DB, gervi-klukku og talningu á render ── */
function sokn(DB) {
  const l = SRC.match(/\n  async function loadSkodud\(\) \{[\s\S]*?\n  \}/);
  const bid = SRC.match(/^\s*const skodBid = [^\n]*$/m);
  const kortF = SRC.match(/\n  function skodudKort\(rows, ar, iDag\) \{[\s\S]*?\n  \}/);
  assert.ok(l && bid && kortF, 'náði ekki loadSkodud/skodBid/skodudKort úr 190');
  const timar = [], st = { render: 0, varad: 0 };
  const api = new Function('window', 'DB', 'curYear', 'setTimeout', 'render', 'console',
    ['let _skodByCo = null, _skodLoaded = true, _skodTilraun = 0;', bid[0], kortF[0], l[0],
      'return { loadSkodud, skodBid, kort: () => _skodByCo, hladid: () => _skodLoaded, tilraun: () => _skodTilraun };'].join('\n'))(
    { get DB() { return DB.til ? DB : undefined; } }, DB, AR, (fn, ms) => { timar.push({ fn, ms }); }, () => { st.render++; }, { warn: () => { st.varad++; } });
  return { api, timar, st };
}
const RADIR = [{ fyrirtaeki_id: 7, last_insp: AR + '-03-04', status: 'active', created_at: '2024-01-01T00:00:00+00:00' }];

test('skodBid: 2, 4, 8, 16, 32 s — svo hætt', () => {
  const { api } = sokn({ til: false });
  assert.deepEqual([0, 1, 2, 3, 4, 5, 6].map(api.skodBid), [2000, 4000, 8000, 16000, 32000, null, null]);
});

test('loadSkodud: síðan opnuð BEINT á verkstæðinu — gagnatengingin er ekki til við fyrstu teikningu, sóknin reynir sjálf aftur', async () => {
  // Mælt í loftinu 18.11.2026 (c717f43): flísarnar birtust fyrst eftir mínútu. Nú: ný tilraun eftir 2 s án nýrrar teikningar.
  const DB = { til: false, sb: null, fetchAll: async () => RADIR };
  const { api, timar, st } = sokn(DB);
  await api.loadSkodud();
  assert.equal(api.kort(), null, 'bilun má aldrei verða að tómu korti („0 tæki skoðuð“)');
  assert.equal(st.render, 0, 'ekkert teiknað við bilun');
  assert.equal(timar.length, 1); assert.equal(timar[0].ms, 2000);
  assert.equal(api.hladid(), true, 'render() má ekki ræsa aðra sókn samhliða þeirri sem bíður');
  DB.til = true; DB.sb = {};                      // tengingin komin
  await timar[0].fn();                            // klukkan slær
  assert.deepEqual(api.kort().get('7'), { n: 1, sidast: AR + '-03-04' });
  assert.equal(st.render, 1, 'teiknað einu sinni þegar gögnin koma');
  assert.equal(timar.length, 1, 'engin frekari tilraun eftir að sóknin tókst');
  assert.equal(api.tilraun(), 0);
});

test('loadSkodud: viðvarandi bilun — fimm sjálfvirkar tilraunir, svo aðeins við teikningu að mínútu liðinni (aldrei lykkja)', async () => {
  const DB = { til: true, sb: {}, fetchAll: async () => { throw new Error('netvilla'); } };
  const { api, timar, st } = sokn(DB);
  await api.loadSkodud();
  for (let i = 0; i < 5; i++) await timar[i].fn();
  assert.deepEqual(timar.map((t) => t.ms), [2000, 4000, 8000, 16000, 32000, 60000]);
  assert.equal(api.kort(), null); assert.equal(st.render, 0);
  assert.equal(api.hladid(), true);
  await timar[5].fn();                            // mínúta liðin: flaggið losnar, næsta TEIKNING ræsir nýja sókn
  assert.equal(api.hladid(), false); assert.equal(api.tilraun(), 0);
  assert.equal(timar.length, 6, 'mínútuklukkan ræsir ekki sókn sjálf');
  assert.equal(st.varad, 6, 'hver bilun sést í console (áður þögul)');
});

test('loadSkodud: fetchAll vantar → sama leið og bilun, ekkert kastast út', async () => {
  const DB = { til: true, sb: {} };
  const { api, timar } = sokn(DB);
  await api.loadSkodud();
  assert.equal(api.kort(), null); assert.equal(timar[0].ms, 2000);
});
