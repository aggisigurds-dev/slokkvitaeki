// Próf: „Merkja og keyra“ (519, lota 14, 17.11.2026) — merki á línum Þjónustuborðsins → Keyra → agent → Óðinn → tilbúið verk.
//   node --test test/merkja-keyra.test.cjs
// Það sem má ALDREI bila:
//   · „Veit ekki“ og „Rannsaka betur“ fara FREMST í röðina (verðmætustu merkin, ekki eyður);
//   · snooze án dagsetningar er hafnað (annars hverfur atriðið) og ekkert skráð;
//   · teljarinn telur merkt · í keyrslu · klárað · vantar svör fyrir SÍÐUSTU umferð og ljósið kviknar aðeins þegar hún er búin;
//   · dreifingin kemur úr leiðarvísinum (agents-registry) með sömu stigum og brunaholf/tools/router.cjs — ekki föstum lista;
//   · hálfsvar telst ALDREI klárað (vantar_svar með ástæðu); marktækt svar verður tilbúið verk í afgreidsla — ekkert fer út;
//   · gamalt/rangt nonce gerir ekkert.
// Enginn gagnagrunnur og ekkert net: _portal-föllunum er skipt út fyrir gervi-PostgREST (test/_fake-postgrest.cjs),
// Claude-kallinu og gagnasöfnuninni fyrir stubba.
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const F = require('./_fake-postgrest.cjs');
const P = require('../netlify/functions/_portal.cjs');
const CL = require('../netlify/functions/_adalmal-claude.cjs');
const L = require('../netlify/functions/_merkja-leid.cjs');
const M = require('../netlify/functions/_merkja.cjs');

// Lítil agentaskrá á sama sniði og data/agents-registry.json (list + pages).
const REG = { list: [
  { type: 'agent', name: 'postur', emoji: '✉', lysing: 'Póstur og svör', kveikjuord: ['póstur', 'svara pósti', 'ósvarað'], aldrei: ['Senda póst sjálfur'], skrar: [{ repo: 'brunaholf' }] },
  { type: 'agent', name: 'rukkari', emoji: '💰', lysing: 'Kröfur og innheimta', kveikjuord: ['krafa', 'ógreitt', 'innheimta'], aldrei: ['Senda kröfu'], skrar: [{ repo: 'slokkvitaeki' }] },
  { type: 'agent', name: 'jarvis', emoji: 'J', lysing: 'Stjórinn', kveikjuord: ['jarvis'], aldrei: [], skrar: [] },
], pages: [{ id: 'krofuyfirlit', titill: 'Kröfuyfirlit', eigandi: 'rukkari', kveikjuord: [] }] };

const NU = new Date('2026-11-17T21:00:00Z');
const m = (o) => Object.assign({ stada: 'merkt', merkt_at: '2026-11-17T20:00:00Z', lina: 'mal:' + (o.mal_id || 1) }, o);

/* ── Röðun ───────────────────────────────────────────────────────────── */
test('röðun: Veit ekki og Rannsaka betur fremst, svo Yfirfara, Athugasemd, Keyra, Já, Nei; elsta merki fyrst innan flokks', () => {
  const l = [
    m({ id: 1, merki: 'ja', forgangur: 45 }), m({ id: 2, merki: 'keyra' }), m({ id: 3, merki: 'rannsaka', merkt_at: '2026-11-17T20:30:00Z' }),
    m({ id: 4, merki: 'nei' }), m({ id: 5, merki: 'veit_ekki', merkt_at: '2026-11-17T20:10:00Z' }), m({ id: 6, merki: 'yfirfara' }), m({ id: 7, merki: 'comment' }),
  ];
  assert.deepStrictEqual(M.rodun(l).map((x) => x.id), [5, 3, 6, 7, 2, 1, 4]);
  // Forgangurinn er í merkinu sjálfu, ekki í því sem stendur í dálkinum (gömul röð með rangt gildi fer samt rétt).
  assert.deepStrictEqual(M.rodun([m({ id: 1, merki: 'keyra', forgangur: 1 }), m({ id: 2, merki: 'veit_ekki', forgangur: 99 })]).map((x) => x.id), [2, 1]);
});

/* ── Snooze ──────────────────────────────────────────────────────────── */
test('snooze: dagsetning SKYLDA, í framtíð og innan árs; dagur → kl. 08:00 þann dag', () => {
  assert.throws(() => M.snoozeDags('', NU), /þarf dagsetningu/);
  assert.throws(() => M.snoozeDags(null, NU), /þarf dagsetningu/);
  assert.throws(() => M.snoozeDags('2026-11-16', NU), /liðin/);
  assert.throws(() => M.snoozeDags('2028-01-01', NU), /eitt ár/);
  assert.throws(() => M.snoozeDags('bull', NU), /Ógild/);
  assert.strictEqual(M.snoozeDags('2026-11-20', NU), '2026-11-20T08:00:00.000Z');
  assert.ok(M.snoozeBuid({ stada: 'blundar', due_at: '2026-11-17T08:00:00Z' }, NU));
  assert.ok(!M.snoozeBuid({ stada: 'blundar', due_at: '2026-11-20T08:00:00Z' }, NU));
});

test('snooze án dagsetningar skráist ALDREI (ekkert skrifað)', async () => {
  const fake = F.bua({ thjonustubeidni: [{ id: 11, title: 'Mál', status: 'nytt' }] });
  const aftur = F.tengja(P, fake);
  try {
    await assert.rejects(() => M.vista({ mal_id: 11, merki: 'snooze' }, 'Agnar', NU), /þarf dagsetningu/);
    assert.strictEqual(fake.skrif.length, 0);
    const r = await M.vista({ mal_id: 11, merki: 'snooze', due_at: '2026-11-24' }, 'Agnar', NU);
    assert.strictEqual(r.stada, 'blundar');
    assert.strictEqual(r.due_at, '2026-11-24T08:00:00.000Z');
  } finally { aftur(); }
});

/* ── Teljari ─────────────────────────────────────────────────────────── */
test('teljari: merkt · í keyrslu · klárað · vantar svör (síðasta umferð) · ljós aðeins þegar umferð er búin', () => {
  const gomul = [m({ id: 1, stada: 'klarad', umferd: 'u1', keyrt_at: '2026-11-16T10:00:00Z' }), m({ id: 2, stada: 'vantar_svar', umferd: 'u1', keyrt_at: '2026-11-16T10:00:00Z' })];
  const ny = [m({ id: 3, stada: 'klarad', umferd: 'u2', keyrt_at: '2026-11-17T20:55:00Z', lokid_at: '2026-11-17T20:57:00Z' }), m({ id: 4, stada: 'i_keyrslu', umferd: 'u2', keyrt_at: '2026-11-17T20:55:00Z' })];
  const onnur = [m({ id: 5 }), m({ id: 6 }), m({ id: 7, stada: 'blundar', due_at: '2026-11-20T08:00:00Z' }), m({ id: 8, stada: 'tekid_af' })];
  let t = M.teljari(gomul.concat(ny, onnur), NU);
  assert.deepStrictEqual([t.merkt, t.i_keyrslu, t.klarad, t.vantar_svar, t.blundar, t.umferd, t.buin], [2, 1, 1, 0, 1, 'u2', false]);
  ny[1].stada = 'vantar_svar'; ny[1].lokid_at = '2026-11-17T20:58:00Z';
  t = M.teljari(gomul.concat(ny, onnur), NU);
  assert.deepStrictEqual([t.klarad, t.vantar_svar, t.i_keyrslu, t.buin, t.lokid_at], [1, 1, 0, true, '2026-11-17T20:58:00Z']);
  assert.strictEqual(M.teljari([], NU).buin, false);
});

/* ── Dreifing (leiðarvísirinn) ───────────────────────────────────────── */
test('dreifing: agent úr kveikjuorðum/síðukorti registry — enginn hittir → jarvis heldur keflinu (gat)', async () => {
  const g = L.undirbua(REG);
  assert.strictEqual((await L.leid('Póstur: ósvarað síðan 09.10 — svara pósti', { g })).agent, 'postur');
  assert.strictEqual((await L.leid('Krafa ógreitt síðan 20.09, innheimta', { g })).agent, 'rukkari');
  assert.strictEqual((await L.leid('Kröfuyfirlit sýnir ranga stöðu', { g })).agent, 'rukkari');   // síðuheiti → eigandi síðunnar
  const v = await L.leid('Kolsýru tæki', { g });
  assert.deepStrictEqual([v.agent, v.gat], ['jarvis', true]);
  const bil = await L.leid('Krafa ógreitt', { fetchFn: async () => ({ ok: false, status: 503 }), url: 'http://x' });
  assert.strictEqual(bil.agent, 'jarvis');
  assert.ok(bil.gat && /svaraði ekki/.test(bil.villa));
});

test('dreifing = brunaholf/tools/router.cjs (sömu agentar á sömu textum) — sleppt ef brunaholf-repóið er ekki við hliðina', (t) => {
  const rot = path.resolve(__dirname, '..', '..', 'brunaholf');
  const rf = path.join(rot, 'tools', 'router.cjs'), reg = path.join(rot, 'data', 'agents-registry.json');
  if (!fs.existsSync(rf) || !fs.existsSync(reg)) { t.skip('brunaholf ekki við hliðina'); return; }
  const R = require(rf), g = L.undirbua(JSON.parse(fs.readFileSync(reg, 'utf8')));
  const T = ['Hringja: húsfélag, reikningur fór aðeins sem krafa í banka. Félagið á ekkert netfang, svo enginn fékk reikninginn.',
    'Tilboð: verðbeiðni í brunavarnir og brunafrágang, ósvarað', 'Annað: bókhaldið spyr hvort reikning vanti, ósvarað',
    'Hringja: úttektarskýrslan fór ekki út, netfang vantar', 'Annað: Öryggi: tafla sem síðurnar keyra kóða úr er ólæst',
    'Annað: AI-tillaga: umsaminn afsláttur vantar á reikning', 'Skoðun & tilboð: Kolsýru tæki'];
  for (const x of T) assert.deepStrictEqual(L.greina(x, g).map((s) => s.agent), R.greina(x, path.resolve(rot, '..', 'slokkvitaeki')).valdir.map((s) => s.agent), x);
});

/* ── Mat Óðins ───────────────────────────────────────────────────────── */
const st = (n, h = 'F1') => Array.from({ length: n }, (_, i) => ({ texti: 'Staðreynd ' + i, heimildir: [h] }));
test('Óðinn: hálfsvar telst ALDREI klárað; marktækt verk/póstur/útskýring/vísun', () => {
  assert.strictEqual(M.metaSkil({ stada: 'villa', villa: 'Claude 529' }, 'keyra').marktaekt, false);
  const tom = M.metaSkil({ stada: 'tilbuid', svar: 'Fann ekkert', stadreyndir: [], tillaga: { tegund: 'ekkert' }, omaelt: ['Engin gögn um málið'] }, 'veit_ekki');
  assert.strictEqual(tom.marktaekt, false);
  assert.match(tom.astaeda, /fann ekkert/); assert.match(tom.astaeda, /Engin gögn/);
  const half = M.metaSkil({ stada: 'tilbuid', svar: 'Málið virðist snúast um reikning.', stadreyndir: st(1), tillaga: { tegund: 'ekkert' } }, 'keyra');
  assert.strictEqual(half.marktaekt, false); assert.match(half.astaeda, /Hálfsvar/);
  assert.strictEqual(M.metaSkil({ stada: 'tilbuid', svar: 'x', stadreyndir: st(1), hent: 4, tillaga: { tegund: 'verk', titill: 'Verk', lysing: 'Lýsing á verki sem er nógu löng' } }, 'keyra').marktaekt, false);
  assert.deepStrictEqual(M.metaSkil({ stada: 'tilbuid', svar: 'Gera X', stadreyndir: st(1), tillaga: { tegund: 'verk', titill: 'Verk', lysing: 'Lýsing' } }, 'keyra'), { marktaekt: true, tegund: 'verk' });
  assert.strictEqual(M.metaSkil({ stada: 'tilbuid', svar: 'Svar', stadreyndir: st(1), tillaga: { tegund: 'tolvupostur', texti: 'Góðan dag', post: { digest_id: 1 } } }, 'ja').tegund, 'tolvupostur');
  assert.strictEqual(M.metaSkil({ stada: 'tilbuid', svar: 'Þetta snýst um X. Y er búið, Z vantar samkvæmt gögnunum.', stadreyndir: st(2), tillaga: { tegund: 'ekkert' } }, 'veit_ekki').tegund, 'utskyring');
  assert.strictEqual(M.metaSkil({ stada: 'tilbuid', svar: 'Þetta snýst um X. Y er búið, Z vantar samkvæmt gögnunum.', stadreyndir: st(2), tillaga: { tegund: 'ekkert' } }, 'ja').marktaekt, false);
  assert.strictEqual(M.metaSkil({ stada: 'tilbuid', svar: 'Símtalið bíður þegar í Afgreiðslu #23.', stadreyndir: st(1, 'A1'), tillaga: { tegund: 'ekkert' } }, 'keyra').tegund, 'visun');
});

/* ── Enda í enda á gervigrunni: merkja → keyra → agent → Óðinn → tilbúið verk ── */
test('lykkjan: röð til agenta (Veit ekki fyrst), Nei → Charlize, hámark umferðar, marktækt → afgreidsla, hálfsvar → vantar_svar', async () => {
  const fake = F.bua({ thjonustubeidni: [
    { id: 21, title: 'Póstur: ósvarað frá kúnna, svara pósti', type: 'email', status: 'nytt' },
    { id: 22, title: 'Krafa ógreitt síðan 20.09', type: 'hringja', status: 'nytt' },
    { id: 23, title: 'Gamalt mál sem skiptir engu', type: 'annad', status: 'nytt' },
    { id: 24, title: 'Kolsýru tæki', type: 'skodun_tilbod', status: 'nytt' },
    { id: 25, title: 'Krafa ógreitt — annað', type: 'hringja', status: 'nytt' } ] });
  const aftur = F.tengja(P, fake);
  const fyrr = { safna: CL.safna, kalla: CL.kalla };
  L.stilla(REG);
  try {
    await M.vista({ mal_id: 21, merki: 'keyra' }, 'Agnar', NU);
    await M.vista({ mal_id: 22, merki: 'ja' }, 'Agnar', NU);
    await M.vista({ mal_id: 23, merki: 'nei', athugasemd: 'Skiptir engu' }, 'Agnar', NU);
    await M.vista({ mal_id: 24, merki: 'veit_ekki' }, 'Agnar', new Date(NU.getTime() + 60000));
    await M.vista({ mal_id: 25, merki: 'keyra' }, 'Agnar', NU);
    // Nýtt merki á sömu línu leysir eldra af hólmi — engu eytt.
    await M.vista({ mal_id: 25, merki: 'rannsaka' }, 'Agnar', NU);
    assert.deepStrictEqual(fake.T.bord_merkingar.filter((x) => x.mal_id === 25).map((x) => [x.merki, x.stada]), [['keyra', 'tekid_af'], ['rannsaka', 'merkt']]);

    const kveikt = [];
    const r = await M.keyra('Agnar', { kveikja: async (id, nonce) => { kveikt.push({ id, nonce }); }, hamark: 3, nu: new Date() });   // claude.at verður að vera ferskt (< 15 mín.)
    const malAf = (id) => fake.T.bord_merkingar.find((x) => x.id === id).mal_id;
    // Röðin: Rannsaka (25) og Veit ekki (24) fremst — jafnir, elsta merkið fyrst — svo Keyra (21); Já (22) bíður (hámark 3).
    assert.deepStrictEqual(kveikt.map((k) => malAf(k.id)), [25, 24, 21]);
    assert.deepStrictEqual([r.sent, r.bida, r.nei], [3, 1, 1]);
    const nei = fake.T.bord_merkingar.find((x) => x.mal_id === 23);
    assert.strictEqual(nei.stada, 'klarad');
    assert.ok(fake.T.charlize_knowledge.some((c) => c.topic === 'akvardanir-agnars' && /NEI við mál #23/.test(c.fact) && /Ekki leggja þetta til aftur/.test(c.fact)));
    const agentAf = (mal) => fake.T.bord_merkingar.find((x) => x.mal_id === mal && x.stada === 'i_keyrslu').agent;
    assert.deepStrictEqual([agentAf(21), agentAf(25), agentAf(24)], ['postur', 'rukkari', 'jarvis']);
    assert.strictEqual(fake.T.bord_merkingar.find((x) => x.mal_id === 22).stada, 'merkt');

    // Agentinn: gagnasöfnun og Claude stubbuð. 24 (Veit ekki) fær útskýringu, 21 verk, 25 hálfsvar.
    CL.safna = async () => ({ gogn: { gogn: [{ id: 'F1' }, { id: 'S1' }] }, kort: { F1: { lysing: 'Fyrirtæki X', opna: null }, S1: { lysing: 'Sala R-000001', opna: { tegund: 'sala', id: 1 } } } });
    const kerfi = [];
    CL.kalla = async (gogn, o) => {
      kerfi.push(o.kerfiAuki);
      const f = gogn.fyrirmaeli || '';
      if (/„Veit ekki“/.test(o.kerfiAuki + f)) return { svar: { svar: 'Málið snýst um kolsýrutæki sem kúnninn spurði um. Ekkert tilboð hefur farið.', stadreyndir: [{ texti: 'Kúnninn spurði', heimildir: ['F1'] }, { texti: 'Engin sala', heimildir: ['S1'] }], tillaga: { tegund: 'ekkert', titill: '', lysing: '', post_id: '', texti: '' }, omaelt: [] }, model: 'stub' };
      if (/„Rannsaka betur“/.test(o.kerfiAuki + f)) return { svar: { svar: 'Fann lítið.', stadreyndir: [{ texti: 'Ógrunduð staðhæfing', heimildir: ['Z9'] }], tillaga: { tegund: 'ekkert', titill: '', lysing: '', post_id: '', texti: '' }, omaelt: ['Engin krafa fannst í gögnunum'] }, model: 'stub' };
      return { svar: { svar: 'Svara kúnnanum og staðfesta tímann.', stadreyndir: [{ texti: 'Pósturinn bíður', heimildir: ['F1'] }], tillaga: { tegund: 'verk', titill: 'Svara kúnna um tíma', lysing: 'Lesa póstinn og útbúa svar með tímasetningu skoðunar.', post_id: '', texti: '' }, omaelt: [] }, model: 'stub' };
    };
    // Rangt nonce gerir ekkert.
    assert.deepStrictEqual(await M.vinnaMerki(kveikt[0].id, 'f'.repeat(32)), { ok: false, astaeda: 'engin gild beiðni' });
    for (const k of kveikt) await M.vinnaMerki(k.id, k.nonce);
    // Sama nonce aftur gerir ekkert (röðin er ekki lengur í keyrslu).
    assert.strictEqual((await M.vinnaMerki(kveikt[0].id, kveikt[0].nonce)).ok, false);

    const rod = (mal) => fake.T.bord_merkingar.find((x) => x.mal_id === mal && x.stada !== 'tekid_af');
    assert.ok(kerfi.every((x) => /LÍNA Á ÞJÓNUSTUBORÐINU/.test(x) && /ÞÚ VINNUR SEM AGENTINN/.test(x)));
    assert.ok(kerfi.some((x) => /postur/.test(x) && /Senda póst sjálfur/.test(x)), 'ALDREI-línur agentsins fara með: ' + JSON.stringify(kerfi));
    // 21 → verk → tilbúið verk sem setur á Verkefnalistann (assigned_agent = agentinn)
    const v21 = rod(21);
    assert.strictEqual(v21.stada, 'klarad');
    const a21 = fake.T.afgreidsla.find((a) => a.id === v21.afgreidsla_id);
    assert.deepStrictEqual([a21.stada, a21.tegund, a21.takki, a21.gogn.verkefnalisti.assigned_agent], ['tilbuid', 'verk', 'Setja á Verkefnalistann', 'postur']);
    // 24 (Veit ekki) → útskýring → „Lesið — loka“, fremst í Afgreiðslu (lægri forgangur)
    const v24 = rod(24), a24 = fake.T.afgreidsla.find((a) => a.id === v24.afgreidsla_id);
    assert.deepStrictEqual([v24.stada, a24.takki, a24.gogn.verkefnalisti], ['klarad', 'Lesið — loka', undefined]);
    assert.ok(a24.forgangur < a21.forgangur);
    // 25 (Rannsaka) → hálfsvar → vantar_svar með ástæðu, ekkert tilbúið verk
    const v25 = rod(25);
    assert.deepStrictEqual([v25.stada, v25.afgreidsla_id], ['vantar_svar', null]);
    assert.match(v25.astaeda, /fann ekkert/); assert.match(v25.astaeda, /Engin krafa fannst/);
    // Óðinn skráir úrskurð á hvert skil
    assert.deepStrictEqual(fake.T.odin_urskurdir.map((u) => u.urskurdur).sort(), ['til_agnars', 'undirbua_afgreidslu', 'undirbua_afgreidslu']);
    // Teljarinn: umferðin búin — 2 klárað (21, 24) + Nei (23), 1 vantar svar (25), 1 enn merkt (22)
    const t = M.teljari(fake.T.bord_merkingar);
    assert.deepStrictEqual([t.merkt, t.i_keyrslu, t.klarad, t.vantar_svar, t.buin], [1, 0, 3, 1, true]);
    // EKKERT fer út: aðeins innri töflur skrifaðar
    const toflur = [...new Set(fake.skrif.map((s) => s.t))].sort();
    assert.deepStrictEqual(toflur, ['afgreidsla', 'bord_merkingar', 'charlize_knowledge', 'odin_urskurdir']);
    // Vafrinn sér aldrei nonce
    assert.ok(fake.T.bord_merkingar.map(M.synilegt).every((x) => !JSON.stringify(x).includes(kveikt[0].nonce)));
  } finally { aftur(); Object.assign(CL, fyrr); L.stilla(null); }
});

test('merki á línu sem agent vinnur í er hafnað (409); taka af = tekid_af, engu eytt', async () => {
  const fake = F.bua({ thjonustubeidni: [{ id: 31, title: 'Mál', status: 'nytt' }],
    bord_merkingar: [{ id: 1, bord: 'thjonustubord', lina: 'mal:31', mal_id: 31, merki: 'keyra', merkt_af: 'Agnar', stada: 'i_keyrslu', keyrt_at: new Date().toISOString() }] });
  const aftur = F.tengja(P, fake);
  try {
    await assert.rejects(() => M.vista({ mal_id: 31, merki: 'nei' }, 'Agnar'), (e) => e.kodi === 409);
    fake.T.bord_merkingar[0].stada = 'merkt';
    assert.strictEqual(await M.vista({ mal_id: 31, merki: null }, 'Agnar'), null);
    assert.deepStrictEqual(fake.T.bord_merkingar.map((x) => x.stada), ['tekid_af']);
    assert.ok(!fake.skrif.some((s) => s.m === 'DELETE'));
  } finally { aftur(); }
});

test('afgreidsla.cjs: merkja/merkja_keyra fara um sama fall og sama rofa og „Biddu Claude“', async () => {
  const H = require('../netlify/functions/_radgjafinn-hlid.cjs'), HUB = require('../netlify/functions/hub-adgangar.cjs');
  const fyrr = { hlid: H.hlid, hub: HUB.handler };
  H.hlid = async () => null;
  HUB.handler = async () => ({ statusCode: 200, body: JSON.stringify({ user: { nn: 'Agnar' } }) });
  const fake = F.bua({ thjonustubeidni: [{ id: 41, title: 'Krafa ógreitt', status: 'nytt' }], app_kv: [{ key: 'adalmal_claude', value: { virkt: false } }] });
  const aftur = F.tengja(P, fake);
  const A = require('../netlify/functions/afgreidsla.cjs');
  const kall = async (b) => { const r = await A.handler({ httpMethod: 'POST', headers: {}, body: JSON.stringify(b) }); return { s: r.statusCode, j: JSON.parse(r.body) }; };
  try {
    let r = await kall({ adgerd: 'merkja', mal_id: 41, merki: 'veit_ekki' });
    assert.strictEqual(r.s, 200);
    assert.strictEqual(r.j.merking.merki, 'veit_ekki');
    assert.strictEqual(r.j.teljari.merkt, 1);
    r = await kall({ adgerd: 'merkja', mal_id: 41, merki: 'snooze' });
    assert.strictEqual(r.s, 400); assert.match(r.j.error, /dagsetningu/);
    // Rofinn af → ekkert keyrt, merkingin stendur
    r = await kall({ adgerd: 'merkja_keyra' });
    assert.strictEqual(r.s, 409);
    assert.strictEqual(fake.T.bord_merkingar.find((x) => x.stada !== 'tekid_af').stada, 'merkt');
    const g = await A.handler({ httpMethod: 'GET', headers: {}, queryStringParameters: { merkingar: '1' } });
    const gj = JSON.parse(g.body);
    assert.deepStrictEqual([g.statusCode, gj.merkingar.length, gj.claude_virkt], [200, 1, false]);
  } finally { aftur(); H.hlid = fyrr.hlid; HUB.handler = fyrr.hub; }
});

test('Já á póstmáli → drög að svari í Afgreiðslu (Agnar sendir) — sami póstsvars-smiður og „Biddu Claude“, ekkert sent', async () => {
  const fake = F.bua({ thjonustubeidni: [{ id: 51, title: 'Póstur: ósvarað', type: 'email', status: 'nytt' }],
    email_digest: [{ id: 7, account: 'eldklar@eldklar.is', folder: 'INBOX', sender_name: 'Kúnni', sender_email: 'kunni@example.is', subject: 'Spurning', received_at: '2026-11-17T10:00:00Z', thread_id: 't7', message_id: '<m7@x>', body_preview: 'Halló' }] });
  const aftur = F.tengja(P, fake);
  const fyrr = { safna: CL.safna, kalla: CL.kalla };
  L.stilla(REG);
  try {
    await M.vista({ mal_id: 51, merki: 'ja' }, 'Agnar');
    const k = [];
    await M.keyra('Agnar', { kveikja: async (id, nonce) => k.push([id, nonce]) });
    CL.safna = async () => ({ gogn: { gogn: [{ id: 'E1' }] }, kort: { E1: { lysing: 'Póstur 17.11 · Spurning', opna: { tegund: 'post', id: 7 }, hrar: { digest_id: 7 } } } });
    CL.kalla = async () => ({ svar: { svar: 'Svara kúnnanum.', stadreyndir: [{ texti: 'Kúnninn spurði', heimildir: ['E1'] }], tillaga: { tegund: 'tolvupostur', titill: '', lysing: '', post_id: 'E1', texti: 'Góðan dag,\n\nTakk fyrir póstinn — við komum á fimmtudag.\n\nKv.\nAgnar Sigurðsson\nBrunahólf Slökkvitæki ehf.' }, omaelt: [] }, model: 'stub' });
    await M.vinnaMerki(k[0][0], k[0][1]);
    const rod = fake.T.bord_merkingar.find((x) => x.mal_id === 51);
    const a = fake.T.afgreidsla.find((x) => x.id === rod.afgreidsla_id);
    assert.deepStrictEqual([rod.stada, a.tegund, a.lykill, a.created_by, a.gogn.to[0]], ['klarad', 'tolvupostur', 'svar:<m7@x>', 'merkja', 'kunni@example.is']);
    assert.ok(!fake.skrif.some((s) => /gmail|payday|sms|senda/i.test(s.t)));
  } finally { aftur(); Object.assign(CL, fyrr); L.stilla(null); }
});

/* ── Óháð rýni 17.11.2026 ─────────────────────────────────────────────── */
test('#2 föst keyrsla (> 20 mín.) telst vantar_svar: læsir ekki Keyra, ný merking og „Taka af“ virka, síðbúið svar skrifar ekki yfir', async () => {
  const gamalt = new Date(Date.now() - M.FAST_MS - 60000).toISOString(), nylegt = new Date(Date.now() - 60000).toISOString();
  const fake = F.bua({ thjonustubeidni: [{ id: 61, title: 'Mál A', status: 'nytt' }, { id: 62, title: 'Mál B', status: 'nytt' }],
    bord_merkingar: [
      { id: 1, bord: 'thjonustubord', lina: 'mal:61', mal_id: 61, merki: 'keyra', merkt_af: 'Agnar', stada: 'i_keyrslu', umferd: 'u1', keyrt_at: gamalt, claude: { stada: 'i_vinnslu', nonce: 'a'.repeat(32), at: gamalt } },
      { id: 2, bord: 'thjonustubord', lina: 'mal:62', mal_id: 62, merki: 'keyra', merkt_af: 'Agnar', stada: 'i_keyrslu', umferd: 'u1', keyrt_at: nylegt, claude: { stada: 'i_vinnslu', nonce: 'b'.repeat(32), at: nylegt } }] });
  const aftur = F.tengja(P, fake);
  try {
    // Hrein föll: föst röð telst vantar_svar strax, jafnvel áður en tiltekt hefur skrifað
    const t0 = M.teljari(fake.T.bord_merkingar);
    assert.deepStrictEqual([t0.i_keyrslu, t0.vantar_svar], [1, 1]);
    assert.strictEqual(M.synilegt(fake.T.bord_merkingar[0]).stada, 'vantar_svar');
    assert.match(M.synilegt(fake.T.bord_merkingar[0]).astaeda, /20 mín/);
    // listi() tekur til í grunninum; sú nýlega stendur
    await M.listi('Agnar');
    assert.deepStrictEqual(fake.T.bord_merkingar.map((x) => x.stada), ['vantar_svar', 'i_keyrslu']);
    // Ný merking á línu sem var föst gengur (ekki 409); „Taka af“ á henni líka
    const ny = await M.vista({ mal_id: 61, merki: 'veit_ekki' }, 'Agnar');
    assert.strictEqual(ny.stada, 'merkt');
    assert.strictEqual(await M.vista({ mal_id: 61, merki: null }, 'Agnar'), null);
    // Síðbúið svar á röð sem tiltekt merkti dauða skrifar ekki yfir (skilyrt á i_keyrslu)
    const r = await P.sbPatch(`bord_merkingar?id=eq.1&stada=eq.i_keyrslu&claude->>nonce=eq.${'a'.repeat(32)}`, { stada: 'klarad' }).then((x) => x.json());
    assert.strictEqual(r.length, 0);
    // Keyra er ekki læst af föstu röðinni: teljarinn sýnir aðeins þá nýlegu í keyrslu
    assert.strictEqual(M.teljari(await M.listi('Agnar')).i_keyrslu, 1);
  } finally { aftur(); }
});

test('#3 Keyra: málin sótt í EINNI fyrirspurn, leiðarvísirinn einu sinni, atriðin ræst samhliða; hámark 6', async () => {
  const mal = Array.from({ length: 9 }, (_, i) => ({ id: 70 + i, title: 'Krafa ógreitt ' + i, status: 'nytt' }));
  const fake = F.bua({ thjonustubeidni: mal });
  const aftur = F.tengja(P, fake);
  const lestur = [];
  const g0 = P.sbGet; P.sbGet = (qs) => { lestur.push(qs.split('?')[0]); return g0(qs); };
  try {
    for (const x of mal) await M.vista({ mal_id: x.id, merki: 'keyra' }, 'Agnar');
    lestur.length = 0;
    let saekt = 0;
    const g = L.undirbua(REG);
    const opid = new Set(); let mestSamtimis = 0;
    const r = await M.keyra('Agnar', { leidOpt: { fetchFn: async () => { saekt++; return { ok: true, json: async () => REG }; }, url: 'http://gervi/registry' },
      kveikja: async (id) => { opid.add(id); mestSamtimis = Math.max(mestSamtimis, opid.size); await new Promise((s) => setTimeout(s, 20)); opid.delete(id); } });
    assert.strictEqual(M.HAMARK_UMFERD, 6);
    assert.deepStrictEqual([r.sent, r.bida], [6, 3]);
    assert.strictEqual(lestur.filter((t) => t === 'thjonustubeidni').length, 1, 'málin í einni fyrirspurn');
    assert.ok(saekt <= 1, 'leiðarvísirinn sóttur í mesta lagi einu sinni');
    assert.ok(mestSamtimis > 1, 'atriðin ræst samhliða, ekki hvert á eftir öðru');
    void g;
  } finally { P.sbGet = g0; aftur(); L.stilla(null); }
});

test('lokað mál: agentinn vinnur ekkert — vantar_svar með ástæðu (sama og 492f)', async () => {
  const fake = F.bua({ thjonustubeidni: [{ id: 81, title: 'Mál', status: 'nytt' }] });
  const aftur = F.tengja(P, fake);
  const fyrr = { kalla: CL.kalla };
  L.stilla(REG);
  try {
    await M.vista({ mal_id: 81, merki: 'keyra' }, 'Agnar');
    const k = [];
    await M.keyra('Agnar', { kveikja: async (id, n) => k.push([id, n]) });
    fake.T.thjonustubeidni[0].status = 'lokad';
    let kallad = 0; CL.kalla = async () => { kallad++; throw new Error('á ekki að kalla'); };
    await M.vinnaMerki(k[0][0], k[0][1]);
    const rod = fake.T.bord_merkingar.find((x) => x.mal_id === 81);
    assert.deepStrictEqual([rod.stada, kallad], ['vantar_svar', 0]);
    assert.match(rod.astaeda, /lokað/);
  } finally { aftur(); Object.assign(CL, fyrr); L.stilla(null); }
});

test('óþekktur notandi (notandi() brást): ekkert vistast, 503', async () => {
  const H = require('../netlify/functions/_radgjafinn-hlid.cjs'), HUB = require('../netlify/functions/hub-adgangar.cjs');
  const fyrr = { hlid: H.hlid, hub: HUB.handler };
  H.hlid = async () => null;
  HUB.handler = async () => { throw new Error('hlið svarar ekki'); };
  const fake = F.bua({ thjonustubeidni: [{ id: 91, title: 'Mál', status: 'nytt' }] });
  const aftur = F.tengja(P, fake);
  const A = require('../netlify/functions/afgreidsla.cjs');
  try {
    const r = await A.handler({ httpMethod: 'POST', headers: {}, body: JSON.stringify({ adgerd: 'merkja', mal_id: 91, merki: 'ja' }) });
    assert.strictEqual(r.statusCode, 503);
    const g = await A.handler({ httpMethod: 'GET', headers: {}, queryStringParameters: { merkingar: '1' } });
    assert.strictEqual(g.statusCode, 503);
    assert.strictEqual((fake.T.bord_merkingar || []).length, 0);
  } finally { aftur(); H.hlid = fyrr.hlid; HUB.handler = fyrr.hub; }
});

/* ── Endurrýni 17.11.2026 ─────────────────────────────────────────────── */
test('E1 Keyra: atriði sem kastar (leiðarvísir eða PATCH) fellir EKKI umferðina — hin fara og eru talin', async () => {
  const mal = Array.from({ length: 4 }, (_, i) => ({ id: 100 + i, title: 'Krafa ógreitt ' + i, status: 'nytt' }));
  const fake = F.bua({ thjonustubeidni: mal });
  const aftur = F.tengja(P, fake);
  const leid0 = L.leid;
  L.stilla(REG);
  try {
    for (const x of mal) await M.vista({ mal_id: x.id, merki: 'keyra' }, 'Agnar');
    const radir = fake.T.bord_merkingar;
    // Leiðarvísirinn kastar á máli 101; PATCH-ið kastar á máli 102
    L.leid = async (texti, o) => { if (/ógreitt 1\b/.test(texti)) throw new Error('registry bilaði'); return leid0(texti, o); };
    const p0 = P.sbPatch;
    P.sbPatch = async (qs, body) => { const r = radir.find((x) => qs.startsWith('bord_merkingar?id=eq.' + x.id + '&')); if (r && r.mal_id === 102 && body.stada === 'i_keyrslu') throw new Error('Supabase 503'); return p0(qs, body); };
    const kveikt = [];
    const r = await M.keyra('Agnar', { kveikja: async (id) => kveikt.push(id) });
    P.sbPatch = p0;
    assert.strictEqual(r.sent, 3, JSON.stringify(r));
    const af = (mid) => radir.find((x) => x.mal_id === mid);
    assert.deepStrictEqual([af(100).stada, af(101).stada, af(102).stada, af(103).stada], ['i_keyrslu', 'i_keyrslu', 'merkt', 'i_keyrslu']);
    assert.deepStrictEqual([af(101).agent, !!af(101).agent_leid.gat], ['jarvis', true], 'leiðarvísir sem brást → jarvis heldur keflinu');
  } finally { L.leid = leid0; aftur(); L.stilla(null); }
});

async function umferdMedEinni(fake, mid, merki) {
  await M.vista({ mal_id: mid, merki }, 'Agnar');
  const k = [];
  await M.keyra('Agnar', { kveikja: async (id, n) => k.push([id, n]) });
  return k[0];
}
const VERK_SVAR = { svar: { svar: 'Gera X.', stadreyndir: [{ texti: 'Staðfest', heimildir: ['F1'] }], tillaga: { tegund: 'verk', titill: 'Verk sem þarf', lysing: 'Lýsing verksins sem er nógu löng', post_id: '', texti: '' }, omaelt: [] }, model: 'stub' };
const SAFNA = async () => ({ gogn: { gogn: [{ id: 'F1' }] }, kort: { F1: { lysing: 'Fyrirtæki X', opna: null } } });

test('E2 munaðarlaust verk: röð sem tiltekt felldi meðan agentinn vann → hvorki tilbúið verk né úrskurður', async () => {
  const fake = F.bua({ thjonustubeidni: [{ id: 111, title: 'Mál', status: 'nytt' }] });
  const aftur = F.tengja(P, fake);
  const fyrr = { safna: CL.safna, kalla: CL.kalla };
  L.stilla(REG);
  try {
    const [id, nonce] = await umferdMedEinni(fake, 111, 'keyra');
    CL.safna = SAFNA;
    CL.kalla = async () => { fake.T.bord_merkingar.find((x) => x.id === id).stada = 'vantar_svar'; return VERK_SVAR; };   // tiltekt á meðan
    const r = await M.vinnaMerki(id, nonce);
    assert.strictEqual(r.ok, false);
    assert.strictEqual((fake.T.afgreidsla || []).length, 0, 'ekkert munaðarlaust verk');
    assert.strictEqual((fake.T.odin_urskurdir || []).length, 0, 'enginn úrskurður');
  } finally { aftur(); Object.assign(CL, fyrr); L.stilla(null); }
});

test('E2b röðin deyr á sömu sekúndu og skilin skrást → verkið merkt úrelt og úrskurðurinn afturkallaður (engu eytt)', async () => {
  const fake = F.bua({ thjonustubeidni: [{ id: 112, title: 'Mál', status: 'nytt' }] });
  const aftur = F.tengja(P, fake);
  const fyrr = { safna: CL.safna, kalla: CL.kalla };
  L.stilla(REG);
  try {
    const [id, nonce] = await umferdMedEinni(fake, 112, 'keyra');
    CL.safna = SAFNA; CL.kalla = async () => VERK_SVAR;
    const p0 = P.sbPatch;
    P.sbPatch = async (qs, body) => { if (qs.startsWith('bord_merkingar?id=eq.' + id) && body.stada === 'klarad') fake.T.bord_merkingar.find((x) => x.id === id).stada = 'vantar_svar'; return p0(qs, body); };
    const r = await M.vinnaMerki(id, nonce);
    P.sbPatch = p0;
    assert.strictEqual(r.ok, false);
    assert.deepStrictEqual(fake.T.afgreidsla.map((a) => a.stada), ['urelt']);
    assert.ok(fake.T.odin_urskurdir[0].afturkallad_at, 'úrskurður afturkallaður');
    assert.ok(!fake.skrif.some((x) => x.m === 'DELETE'));
  } finally { aftur(); Object.assign(CL, fyrr); L.stilla(null); }
});

test('E3 mál í geymslu (archived_at) telst lokað: ekkert Claude-kall, vantar_svar', async () => {
  const fake = F.bua({ thjonustubeidni: [{ id: 113, title: 'Mál', status: 'nytt' }] });
  const aftur = F.tengja(P, fake);
  const fyrr = { kalla: CL.kalla };
  L.stilla(REG);
  try {
    const [id, nonce] = await umferdMedEinni(fake, 113, 'keyra');
    fake.T.thjonustubeidni[0].archived_at = new Date().toISOString();
    let kallad = 0; CL.kalla = async () => { kallad++; return VERK_SVAR; };
    await M.vinnaMerki(id, nonce);
    const rod = fake.T.bord_merkingar.find((x) => x.id === id);
    assert.deepStrictEqual([rod.stada, kallad], ['vantar_svar', 0]);
    assert.match(rod.astaeda, /geymslu/);
  } finally { aftur(); Object.assign(CL, fyrr); L.stilla(null); }
});

test('E4 tiltekt bregst: föst röð læsir samt ekki línuna — vista fellir hana beint og ný merking gengur', async () => {
  const gamalt = new Date(Date.now() - M.FAST_MS - 60000).toISOString();
  const fake = F.bua({ thjonustubeidni: [{ id: 114, title: 'Mál', status: 'nytt' }],
    bord_merkingar: [{ id: 1, bord: 'thjonustubord', lina: 'mal:114', mal_id: 114, merki: 'keyra', merkt_af: 'Agnar', stada: 'i_keyrslu', keyrt_at: gamalt }] });
  const aftur = F.tengja(P, fake);
  const p0 = P.sbPatch;
  P.sbPatch = async (qs, body) => { if (/keyrt_at=lt\./.test(qs)) throw new Error('tiltekt brást'); return p0(qs, body); };
  try {
    const ny = await M.vista({ mal_id: 114, merki: 'veit_ekki' }, 'Agnar');
    assert.strictEqual(ny.stada, 'merkt');
    assert.deepStrictEqual(fake.T.bord_merkingar.map((x) => x.stada), ['vantar_svar', 'merkt']);
  } finally { P.sbPatch = p0; aftur(); }
});
