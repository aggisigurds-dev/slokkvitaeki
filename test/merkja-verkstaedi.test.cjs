// Próf: „Merkja og keyra“ á ÞjónustuVerkstæðinu (190, 18.11.2026) — línan er FÉLAG, ekki mál.
//   node --test test/merkja-verkstaedi.test.cjs
// Agnar: „bætt þarna inn á þjónustuverkstæði síðunni, tengingu, til að hjálpa mér að útkljá þau mál“ → „Bæði“.
// Það sem má ALDREI bila:
//   · borðin eru aðskilin: merki á verkstæðinu fer aldrei í umferð Þjónustuborðsins (og öfugt), og 519 helst óbreytt;
//   · agentinn fær gögn ÞESSA STAÐAR (fyrirtaeki_id) — verkstæðisstöðu, skjöl, sölur, tæki — mæld, ekki giskuð;
//   · sókn sem bregst verður „ÓMÆLT“, aldrei „ekkert til“;
//   · nýskráð og úrelt tæki teljast ekki skoðuð — SAMA talning og flísarnar á verkstæðinu (skodudKort í 190);
//   · niðurstaðan verður tilbúið verk í Afgreiðslu með heimildum sem opnast; ekkert fer út.
// Enginn gagnagrunnur og ekkert net: gervi-PostgREST (test/_fake-postgrest.cjs); Claude-kallið er stubbað, gagnasöfnunin EKKI.
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

const REG = { list: [
  { type: 'agent', name: 'elon-musk', emoji: '🚀', lysing: 'Ársskoðun og þjónustuverk', kveikjuord: ['ársskoðun'], aldrei: ['Sameina hótel á kt'], skrar: [{ repo: 'slokkvitaeki' }] },
  { type: 'agent', name: 'rukkari', emoji: '💰', lysing: 'Kröfur', kveikjuord: ['krafa', 'ógreitt'], aldrei: ['Senda kröfu'], skrar: [{ repo: 'slokkvitaeki' }] },
  { type: 'agent', name: 'jarvis', emoji: 'J', lysing: 'Stjórinn', kveikjuord: ['jarvis'], aldrei: [], skrar: [] },
], pages: [{ id: 'thjonustu-verkstaedi', titill: 'ÞjónustuVerkstæði', eigandi: 'elon-musk', kveikjuord: [] }] };

const AR = new Date().getFullYear();
const D = (mm, dd) => AR + '-' + mm + '-' + dd;
const FELAG = { id: 1934, nafn: 'Húsfélagið Prufugata 10', kennitala: '5601973149', heimilisfang: 'Prufugata 10', netfang: null, er_i_thjonustu: true, deleted_at: null,
  banner_note: 'Hringja í formann, sími 555 1234' };
const GRUNNUR = () => ({
  fyrirtaeki: [FELAG, { id: 1935, nafn: 'Systurfélag sömu kt', kennitala: '5601973149', deleted_at: null }, { id: 77, nafn: 'Eytt félag', deleted_at: '2026-01-01T00:00:00Z' }],
  thjonustubeidni: [{ id: 1934, title: 'Mál með sama númer og félagið', status: 'nytt' }],
  customer_documents: [
    { id: 501, fyrirtaeki_id: 1934, doc_type: 'uttektarskyrsla', year: AR, doc_date: D('09', '24'), invoice_number: null, amount: null, vidskiptategund: null, created_at: D('09', '25') + 'T10:00:00+00:00', is_duplicate: false },
    { id: 502, fyrirtaeki_id: 1934, doc_type: 'reikningur', year: AR, doc_date: D('09', '26'), invoice_number: 'R-001234', amount: 48900, vidskiptategund: 'uttekt', created_at: D('09', '26') + 'T10:00:00+00:00', is_duplicate: false },
    { id: 503, fyrirtaeki_id: 1934, doc_type: 'reikningur', year: AR, doc_date: D('03', '02'), invoice_number: 'R-000900', amount: 120000, vidskiptategund: 'brunakerfi', created_at: D('03', '02') + 'T10:00:00+00:00', is_duplicate: false },
    { id: 504, fyrirtaeki_id: 1934, doc_type: 'uttektarskyrsla', year: AR, doc_date: D('09', '24'), created_at: D('09', '27') + 'T10:00:00+00:00', is_duplicate: true },   // tvítekið → ekki talið
    { id: 505, fyrirtaeki_id: 1935, doc_type: 'uttektarskyrsla', year: AR, created_at: D('05', '05') + 'T10:00:00+00:00', is_duplicate: false },                              // SYSTKINI á sömu kt
  ],
  solur: [
    { id: 9001, num: 'R-001234', customer_id: 1934, customer_nafn: 'Húsfélagið Prufugata 10', samtals: 48900, created_at: D('09', '26') + 'T09:00:00+00:00', status: 'open', is_credit: false, hidden: false, krafa_sent_at: D('09', '26') + 'T12:00:00+00:00', paid_at: null, vidskiptategund: 'uttekt', greitt_med: 'reikningur' },
    { id: 9002, num: 'R-000900', customer_id: 1934, customer_nafn: 'Húsfélagið Prufugata 10', samtals: 120000, created_at: D('03', '02') + 'T09:00:00+00:00', status: 'paid', is_credit: false, hidden: false, paid_at: D('03', '20') + 'T00:00:00+00:00', vidskiptategund: 'brunakerfi', greitt_med: 'reikningur' },
    { id: 9003, num: 'R-001100', customer_id: 1934, customer_nafn: 'Húsfélagið Prufugata 10', samtals: -48900, created_at: D('08', '01') + 'T09:00:00+00:00', status: 'credit', is_credit: true, hidden: false, vidskiptategund: 'uttekt', greitt_med: 'reikningur' },
    { id: 9004, num: 'R-005555', customer_id: 1935, customer_nafn: 'Systurfélag sömu kt', samtals: 99000, created_at: D('06', '06') + 'T09:00:00+00:00', status: 'open', is_credit: false, hidden: false, vidskiptategund: 'uttekt', greitt_med: 'reikningur' },
  ],
  uttaeki: [
    { id: 1, fyrirtaeki_id: 1934, last_insp: D('09', '24'), status: 'active', created_at: '2024-03-01T10:00:00+00:00' },
    { id: 2, fyrirtaeki_id: 1934, last_insp: D('09', '24'), status: 'Í lagi', created_at: '2024-03-01T10:00:00+00:00' },
    { id: 3, fyrirtaeki_id: 1934, last_insp: D('09', '24'), status: 'urelt', created_at: '2024-03-01T10:00:00+00:00' },             // úrelt
    { id: 4, fyrirtaeki_id: 1934, last_insp: D('10', '09'), status: 'active', created_at: D('10', '09') + 'T08:12:00+00:00' },      // nýskráð þann dag
    { id: 5, fyrirtaeki_id: 1934, last_insp: (AR - 1) + '-09-01', status: 'active', created_at: '2024-03-01T10:00:00+00:00' },     // skoðað í fyrra
    { id: 6, fyrirtaeki_id: 1935, last_insp: D('05', '05'), status: 'active', created_at: '2024-03-01T10:00:00+00:00' },            // systkini
  ],
});
const STADA = { co_id: 1934, inspect_month: 9, listi_stadfest_ar: AR, field_inspected_year: 0, last_year_inspected: 0, ['steps_' + AR]: { taekjalisti: true, uttekt: true, reikningur: false }, sv_note: 'GAMALL reitur sem á ekki að vinna' };

// Gervið + RPC-ið verkst_stada (gervið kann ekki rpc). `brotid` lætur valdar töflur bregðast.
function setja(fraeVid, { stada = STADA, brotid = [] } = {}) {
  const fake = F.bua(fraeVid || GRUNNUR());
  const aftur = F.tengja(P, fake);
  const g0 = P.sbGet, p0 = P.sbPost;
  P.sbGet = async (qs) => { if (brotid.includes(qs.split('?')[0])) return { ok: false, status: 500, json: async () => ({}), text: async () => 'bilun' }; return g0(qs); };
  P.sbPost = async (t, body) => {
    if (t === 'rpc/verkst_stada') return brotid.includes('rpc') ? { ok: false, status: 500, json: async () => ({}), text: async () => 'bilun' }
      : { ok: true, status: 200, json: async () => (Number(body.p_id) === 1934 ? stada : null), text: async () => '' };
    return p0(t, body);
  };
  return { fake, aftur };
}
const SVAR_UTSKYRING = (heim) => ({ svar: { svar: 'Úttekt ársins er gerð: skýrsla er til og reikningur var sendur. Reikningurinn er ógreiddur.',
  stadreyndir: [{ texti: 'Úttektarskýrsla ársins er skráð á staðinn', heimildir: [heim.skyrsla] }, { texti: 'Reikningur R-001234 var sendur', heimildir: [heim.sala] }],
  tillaga: { tegund: 'ekkert', titill: '', lysing: '', post_id: '', texti: '' }, omaelt: [] }, model: 'stub' });

/* ── Borðin eru aðskilin ─────────────────────────────────────────────────────── */
test('bordAf: aðeins „verkstaedi“ er verkstæðið — allt annað (líka ekkert) er Þjónustuborðið, svo 519 helst óbreytt', () => {
  assert.strictEqual(M.bordAf('verkstaedi'), 'verkstaedi');
  for (const x of [undefined, null, '', 'thjonustubord', 'Verkstaedi', 'verkstaedi ', 'bull', 0, {}]) assert.strictEqual(M.bordAf(x), 'thjonustubord', String(x));
});

test('vista: merki á félagi skráist á verkstæðið með fyrirtaeki_id — og rekst ekki á mál með sama númer', async () => {
  const { fake, aftur } = setja();
  try {
    const f = await M.vista({ bord: 'verkstaedi', fyrirtaeki_id: 1934, merki: 'yfirfara' }, 'Agnar');
    assert.deepStrictEqual([f.bord, f.lina, f.fyrirtaeki_id, f.mal_id, f.mal_titill, f.stada], ['verkstaedi', 'fyrirtaeki:1934', 1934, null, 'Húsfélagið Prufugata 10', 'merkt']);
    // Mál #1934 á Þjónustuborðinu er ÖNNUR lína — bæði standa.
    const m = await M.vista({ mal_id: 1934, merki: 'keyra' }, 'Agnar');
    assert.deepStrictEqual([m.bord, m.lina, m.mal_id, m.fyrirtaeki_id], ['thjonustubord', 'mal:1934', 1934, undefined]);
    assert.strictEqual(fake.T.bord_merkingar.filter((x) => x.stada === 'merkt').length, 2);
    // Hvort borð sér aðeins sitt.
    assert.deepStrictEqual((await M.listi('Agnar', 'verkstaedi')).map((x) => x.lina), ['fyrirtaeki:1934']);
    assert.deepStrictEqual((await M.listi('Agnar')).map((x) => x.lina), ['mal:1934']);
    const s = M.synilegt(f);
    assert.deepStrictEqual([s.bord, s.fyrirtaeki_id, s.mal_id], ['verkstaedi', 1934, null]);
    // Nýtt merki á sama félagi leysir eldra af hólmi (engu eytt); null tekur það af.
    await M.vista({ bord: 'verkstaedi', fyrirtaeki_id: 1934, merki: 'rannsaka' }, 'Agnar');
    assert.deepStrictEqual(fake.T.bord_merkingar.filter((x) => x.fyrirtaeki_id === 1934).map((x) => [x.merki, x.stada]), [['yfirfara', 'tekid_af'], ['rannsaka', 'merkt']]);
    assert.strictEqual(await M.vista({ bord: 'verkstaedi', fyrirtaeki_id: 1934, merki: null }, 'Agnar'), null);
    assert.ok(fake.T.bord_merkingar.filter((x) => x.fyrirtaeki_id === 1934).every((x) => x.stada === 'tekid_af'));
    assert.ok(!fake.skrif.some((x) => x.m === 'DELETE'));
  } finally { aftur(); }
});

test('vista: óþekkt eða eytt félag, eða félag án númers → hafnað og EKKERT skráð', async () => {
  const { fake, aftur } = setja();
  try {
    await assert.rejects(() => M.vista({ bord: 'verkstaedi', fyrirtaeki_id: 424242, merki: 'keyra' }, 'Agnar'), (e) => e.kodi === 404 && /Félagið fannst ekki/.test(e.message));
    await assert.rejects(() => M.vista({ bord: 'verkstaedi', fyrirtaeki_id: 77, merki: 'keyra' }, 'Agnar'), (e) => e.kodi === 404);
    await assert.rejects(() => M.vista({ bord: 'verkstaedi', merki: 'keyra' }, 'Agnar'), /ekki rétt tilgreind/);
    // mal_id má ekki lauma sér inn sem félag á verkstæðinu.
    await assert.rejects(() => M.vista({ bord: 'verkstaedi', mal_id: 1934, merki: 'keyra' }, 'Agnar'), /ekki rétt tilgreind/);
    await assert.rejects(() => M.vista({ bord: 'verkstaedi', fyrirtaeki_id: 1934, merki: 'snooze' }, 'Agnar'), /þarf dagsetningu/);
    assert.strictEqual(fake.skrif.filter((x) => x.m === 'POST').length, 0);
  } finally { aftur(); }
});

test('keyra: ▶ Keyra á verkstæðinu sendir AÐEINS félögin; merki Þjónustuborðsins standa (og öfugt)', async () => {
  const { fake, aftur } = setja();
  L.stilla(REG);
  try {
    await M.vista({ bord: 'verkstaedi', fyrirtaeki_id: 1934, merki: 'yfirfara' }, 'Agnar');
    await M.vista({ mal_id: 1934, merki: 'keyra' }, 'Agnar');
    const kv = [];
    const r = await M.keyra('Agnar', { bord: 'verkstaedi', kveikja: async (id, n) => kv.push([id, n]) });
    assert.deepStrictEqual([r.sent, r.bida, r.nei], [1, 0, 0]);
    const rod = fake.T.bord_merkingar.find((x) => x.id === kv[0][0]);
    assert.deepStrictEqual([rod.bord, rod.fyrirtaeki_id, rod.stada], ['verkstaedi', 1934, 'i_keyrslu']);
    // Síðuheitið í textanum réttir keflið EIGANDA síðunnar (boðhlaupsreglan), ekki jarvis.
    assert.deepStrictEqual([rod.agent, !!rod.agent_leid.gat], ['elon-musk', false]);
    assert.strictEqual(fake.T.bord_merkingar.find((x) => x.lina === 'mal:1934').stada, 'merkt', 'mál Þjónustuborðsins fór EKKI með');
    // Og öfugt: umferð Þjónustuborðsins (ekkert bord) tekur málið en snertir ekki félagið.
    const kv2 = [];
    await M.keyra('Agnar', { kveikja: async (id, n) => kv2.push([id, n]) });
    assert.deepStrictEqual(kv2.map(([id]) => fake.T.bord_merkingar.find((x) => x.id === id).lina), ['mal:1934']);
    // Teljari hvors borðs telur aðeins sitt.
    assert.strictEqual(M.teljari(await M.listi('Agnar', 'verkstaedi')).i_keyrslu, 1);
    assert.strictEqual(M.teljari(await M.listi('Agnar')).i_keyrslu, 1);
  } finally { aftur(); L.stilla(null); }
});

test('Nei á félagi → skráð á línuna EINA: engin varanleg ákvörðun hjá Charlize, enginn agent (óháð rýni 18.11.2026)', async () => {
  // Charlize-færsla „Ekki leggja þetta til aftur“ án árs og efnis læsist inn í öll mál sem nefna nafn félagsins og rennur
  // aldrei út — næsta ár gæti agent vikið sér undan lögmætri úttektarvinnu. Á Þjónustuborðinu (mál) er hún óbreytt.
  const { fake, aftur } = setja();
  L.stilla(REG);
  try {
    await M.vista({ bord: 'verkstaedi', fyrirtaeki_id: 1934, merki: 'nei', athugasemd: 'Sagt upp' }, 'Agnar');
    const r = await M.keyra('Agnar', { bord: 'verkstaedi', kveikja: async () => { throw new Error('á ekki að ræsa agent'); } });
    assert.deepStrictEqual([r.sent, r.nei], [0, 1]);
    assert.strictEqual((fake.T.charlize_knowledge || []).length, 0, 'engin Charlize-færsla fyrir Nei á félagi');
    const rod = fake.T.bord_merkingar.find((x) => x.fyrirtaeki_id === 1934);
    assert.deepStrictEqual([rod.stada, rod.agent, rod.athugasemd], ['klarad', null, 'Sagt upp']);
    assert.match(rod.nidurstada.svar, /Nei skráð á félagið — ekkert unnið og ekkert sent agent/);
    assert.ok(!/Charlize \(#/.test(rod.nidurstada.svar));
    assert.deepStrictEqual([...new Set(fake.skrif.map((s) => s.t))], ['bord_merkingar']);
    // Mál á Þjónustuborðinu: Nei verður ÁFRAM ákvörðun hjá Charlize.
    await M.vista({ mal_id: 1934, merki: 'nei' }, 'Agnar');
    await M.keyra('Agnar', { kveikja: async () => {} });
    assert.strictEqual(fake.T.charlize_knowledge.length, 1);
    assert.match(fake.T.charlize_knowledge[0].fact, /NEI við mál #1934 á Þjónustuborðinu/);
  } finally { aftur(); L.stilla(null); }
});

test('tiltekt: borðið fer í slóð og er ALLTAF annað föstu gildanna, hver sem kallar', async () => {
  const { fake, aftur } = setja();
  try {
    await M.tiltekt('Agnar', new Date(), 'verkstaedi&stada=eq.merkt');
    await M.tiltekt('Agnar', new Date(), 'verkstaedi');
    assert.deepStrictEqual(fake.skrif.map((s) => (s.qs.match(/bord=eq\.([^&]*)/) || [])[1]), ['thjonustubord', 'verkstaedi']);
  } finally { aftur(); }
});

test('margar sölur: aðeins reikningssölur eru lesnar (eins og 190) og náist mörkin er það SAGT, ekki þagað', async () => {
  const g = GRUNNUR();
  // 5 kortasölur (búð) og MORK_SOLUR reikningssölur til viðbótar → mörkin nást.
  for (let i = 0; i < 5; i++) g.solur.push({ id: 7000 + i, num: 'R-00700' + i, customer_id: 1934, customer_nafn: 'x', samtals: 1000, created_at: D('10', '0' + (i + 1)) + 'T09:00:00+00:00', status: 'paid', is_credit: false, hidden: false, vidskiptategund: 'bud', greitt_med: 'kort' });
  for (let i = 0; i < CL.MORK_SOLUR; i++) g.solur.push({ id: 8000 + i, num: 'R-008' + String(i).padStart(3, '0'), customer_id: 1934, customer_nafn: 'x', samtals: 2000, created_at: D('01', '15') + 'T09:00:00+00:00', status: 'open', is_credit: false, hidden: false, vidskiptategund: 'uttekt', greitt_med: 'reikningur' });
  const { aftur } = setja(g);
  try {
    const gogn = (await CL.safna({ texti: 'Úttekt', hluti_heiti: 'ÞjónustuVerkstæði' }, { id: null, title: 'x' }, '', { fyrirtaeki: FELAG })).gogn.gogn;
    const so = gogn.find((x) => 'uttektarreikningar_arsins' in x);
    assert.match(so.klippt, /talan gæti verið of lág/);
    assert.ok(!gogn.some((x) => /^R-00700/.test(String(x.sala || ''))), 'kortasala (búð) á ekki heima í úttektargögnunum');
    // Án klippingar er reiturinn ekki til (ekki „klippt: false“ sem agent gæti mislesið).
    const { aftur: a2 } = setja();
    try { assert.ok(!('klippt' in JSON.parse(JSON.stringify((await CL.safna({ texti: 'Úttekt', hluti_heiti: 'x' }, { id: null, title: 'x' }, '', { fyrirtaeki: FELAG })).gogn.gogn.find((x) => 'uttektarreikningar_arsins' in x))))); } finally { a2(); }
  } finally { aftur(); }
});

/* ── Gögnin sem agentinn fær: raunveruleg söfnun á gervigrunni ─────────────────── */
async function umferd(merki = 'yfirfara', ath) {
  await M.vista(Object.assign({ bord: 'verkstaedi', fyrirtaeki_id: 1934, merki }, ath ? { athugasemd: ath } : {}), 'Agnar');
  const kv = [];
  await M.keyra('Agnar', { bord: 'verkstaedi', kveikja: async (id, n) => kv.push([id, n]) });
  return kv[0];
}
const eftir = (gogn, f) => gogn.gogn.filter(f);

test('vinnaMerki á félagi: agentinn fær verkstæðisstöðu, skjöl, sölur og tæki ÞESSA STAÐAR — mælt, og systkini á sömu kt fylgja ekki', async () => {
  const { fake, aftur } = setja();
  const fyrr = { kalla: CL.kalla };
  L.stilla(REG);
  try {
    const [id, nonce] = await umferd('yfirfara', 'Er þetta ekki búið?');
    let fengid = null, kerfi = '';
    CL.kalla = async (gogn, o) => {
      fengid = gogn; kerfi = o.kerfiAuki;
      const K = gogn.gogn.find((x) => x.skjal === 'úttektarskýrsla'), S = gogn.gogn.find((x) => x.sala === 'R-001234');
      return SVAR_UTSKYRING({ skyrsla: K.id, sala: S.id });
    };
    const r = await M.vinnaMerki(id, nonce);
    assert.deepStrictEqual([r.ok, r.marktaekt], [true, true]);

    // Kerfisviðbótin: félag á verkstæðinu, ekki lína á Þjónustuborðinu — og reglan um „búið“.
    assert.match(kerfi, /FÉLAG Á ÞJÓNUSTUVERKSTÆÐINU \(fyrirtæki #1934\)/);
    assert.ok(!/LÍNA Á ÞJÓNUSTUBORÐINU|mál #null/.test(kerfi), kerfi);
    assert.match(kerfi, /ALDREI til að merkja „búið“ nema skýrsla EÐA reikningur ársins sé í gögnunum/);
    assert.match(kerfi, /Þar sem fyrirmælin segja „málið“ er átt við ÚTTEKT ÁRSINS hjá þessu félagi/);
    assert.match(kerfi, /ÞÚ VINNUR SEM AGENTINN 🚀 elon-musk/); assert.match(kerfi, /Sameina hótel á kt/);
    assert.match(fengid.fyrirmaeli, /YFIRFARA/); assert.match(fengid.fyrirmaeli, /ATHUGASEMD AGNARS: Er þetta ekki búið\?/);
    assert.deepStrictEqual([fengid.atridi.hluti, fengid.mal.id], ['ÞjónustuVerkstæði', null]);

    // Félagið sjálft FREMST, sótt eftir id; félagskennitalan óhulin (lögaðili), systkinið ekki með.
    const Fs = eftir(fengid, (x) => /^F\d/.test(x.id));
    assert.deepStrictEqual([Fs.length, Fs[0].fyrirtaeki_id, Fs[0].kennitala, Fs[0].i_thjonustu], [1, 1934, '5601973149', true]);

    // Verkstæðisstaðan: á dagskrá; hökuð og afhökuð skref aðgreind; athugasemdin með HULINN síma.
    const st = fengid.gogn.find((x) => x.verkstaedisstada);
    assert.match(st.verkstaedisstada, /á dagskrá/);
    assert.deepStrictEqual(st.skref_hokud, ['Tækjalisti staðfestur', 'Úttekt búin']);
    assert.deepStrictEqual(st.skref_afhokud, ['Reikningur sendur']);
    assert.deepStrictEqual([st.skodunarmanudur, st.taekjalisti_stadfestur_ar], [9, AR]);
    assert.ok(/Hringja í formann/.test(st.athugasemd) && !/555 1234/.test(st.athugasemd) && !/GAMALL/.test(st.athugasemd), st.athugasemd);   // banner_note vinnur

    // Skjöl: tvítekið skjal og skjal systkinis teljast ekki; brunakerfisreikningur er EKKI úttektarreikningur.
    const sk = fengid.gogn.find((x) => 'uttektarskyrsla_arsins' in x);
    assert.deepStrictEqual([sk.uttektarskyrsla_arsins, sk.uttektarreikningur_arsins_i_skjolum, sk.uttektarskyrsla_i_fyrra, sk.fjoldi_skjala], [true, true, false, 3]);
    const Ks = eftir(fengid, (x) => /^K\d/.test(x.id));
    assert.deepStrictEqual(Ks.map((x) => [x.skjal, x.reikningsnumer, x.uttektarreikningur]).sort(), [['reikningur', 'R-000900', false], ['reikningur', 'R-001234', true], ['úttektarskýrsla', null, null]].sort());

    // Sölur: aðeins þessa staðar; kredit og brunakerfi teljast ekki sem úttektarreikningur ársins.
    const so = fengid.gogn.find((x) => 'uttektarreikningar_arsins' in x);
    assert.deepStrictEqual([so.uttektarreikningar_arsins, so.thar_af_sendir, so.thar_af_greiddir], [1, 1, 0]);
    const Ss = eftir(fengid, (x) => /^S\d/.test(x.id));
    assert.deepStrictEqual(Ss.map((x) => x.sala).sort(), ['R-000900', 'R-001100', 'R-001234']);
    assert.ok(!JSON.stringify(fengid).includes('R-005555') && !JSON.stringify(fengid).includes('Systurfélag'), 'systkini á sömu kt má ekki leka inn');
    const s1234 = Ss.find((x) => x.sala === 'R-001234');
    assert.deepStrictEqual([s1234.dags, s1234.samtals_kr, s1234.uttektarreikningur, s1234.ogild, !!s1234.krafa_send, s1234.greidd], [D('09', '26'), 48900, true, false, true, null]);
    assert.strictEqual(Ss.find((x) => x.sala === 'R-001100').ogild, true);

    // Tæki: 4 virk (úrelt talið sér), 2 skoðuð á árinu, 1 nýskráð — ekki 3 né 4.
    const tk = fengid.gogn.find((x) => 'skodud_a_arinu' in x);
    assert.deepStrictEqual([tk.taeki_virk, tk.taeki_urelt, tk.skodud_a_arinu, tk.nyskrad_a_arinu, tk.sidasta_skodun], [4, 1, 2, 1, D('09', '24')]);
    assert.match(tk.ath, /EKKI staðfesting/);

    // Niðurstaðan: tilbúið verk í Afgreiðslu sem nefnir félagið, með heimildum sem OPNAST (skjal + sala). Ekkert fer út.
    const rod = fake.T.bord_merkingar.find((x) => x.id === id);
    assert.deepStrictEqual([rod.stada, rod.agent], ['klarad', 'elon-musk']);
    const a = fake.T.afgreidsla.find((x) => x.id === rod.afgreidsla_id);
    assert.deepStrictEqual([a.stada, a.tegund, a.takki, a.gogn.fyrirtaeki_id, a.gogn.mal_id], ['tilbuid', 'verk', 'Lesið — loka', 1934, null]);
    assert.strictEqual(a.titill, 'Yfirfara: Húsfélagið Prufugata 10');
    assert.match(a.af_hverju[0].heimild, /ÞjónustuVerkstæði · fyrirtæki #1934/);
    assert.deepStrictEqual(a.af_hverju.slice(1).map((x) => x.opna), [{ tegund: 'skjal', id: 501 }, { tegund: 'sala', id: 9001 }]);
    assert.ok(!/null|undefined/.test(a.titill + JSON.stringify(a.af_hverju)), JSON.stringify(a.af_hverju));
    assert.deepStrictEqual([...new Set(fake.skrif.map((s) => s.t))].sort(), ['afgreidsla', 'bord_merkingar', 'odin_urskurdir']);
  } finally { aftur(); Object.assign(CL, fyrr); L.stilla(null); }
});

test('verkstæðisstaðan segir rétt frá: í vinnslu og búið í ár', async () => {
  for (const [stada, re] of [[{ field_inspected_year: AR, last_year_inspected: 0 }, /Í VINNSLU/], [{ field_inspected_year: 0, last_year_inspected: AR }, /merkt BÚIÐ í ár/], [null, /á dagskrá/]]) {
    const { aftur } = setja(null, { stada });
    try {
      const s = await CL.safna({ texti: 'Úttekt', hluti_heiti: 'ÞjónustuVerkstæði' }, { id: null, title: 'x' }, '', { fyrirtaeki: FELAG });
      assert.match(s.gogn.gogn.find((x) => x.verkstaedisstada).verkstaedisstada, re);
    } finally { aftur(); }
  }
});

test('sókn sem bregst verður ÓMÆLT — aldrei „engin skýrsla“ eða „0 tæki“', async () => {
  const { aftur } = setja(null, { brotid: ['customer_documents', 'uttaeki', 'rpc'] });
  try {
    const s = await CL.safna({ texti: 'Úttekt', hluti_heiti: 'ÞjónustuVerkstæði' }, { id: null, title: 'x' }, '', { fyrirtaeki: FELAG });
    const g = s.gogn.gogn;
    const om = g.filter((x) => x.omaelt).map((x) => x.lysing);
    assert.deepStrictEqual(om.sort(), ['Skjöl ' + (AR - 1) + '–' + AR + ' — ÓMÆLT', 'Tæki á staðnum — ÓMÆLT', 'Verkstæðisstaða ' + AR + ' — ÓMÆLT'].sort());
    assert.ok(!g.some((x) => 'uttektarskyrsla_arsins' in x), 'engin fullyrðing um skýrslu þegar skjölin náðust ekki');
    assert.ok(!g.some((x) => 'skodud_a_arinu' in x || 'verkstaedisstada' in x));
    // Það sem náðist stendur: sölurnar.
    assert.strictEqual(g.find((x) => 'uttektarreikningar_arsins' in x).uttektarreikningar_arsins, 1);
    assert.ok(g.filter((x) => x.omaelt).every((x) => /Dragðu enga ályktun/.test(x.omaelt)));
  } finally { aftur(); }
});

test('félag án gagna: engin skjöl, engar sölur, engin tæki — sagt sem mæld núll, ekki ÓMÆLT', async () => {
  const { aftur } = setja({ fyrirtaeki: [FELAG] }, { stada: null });
  try {
    const g = (await CL.safna({ texti: 'Úttekt', hluti_heiti: 'ÞjónustuVerkstæði' }, { id: null, title: 'x' }, '', { fyrirtaeki: FELAG })).gogn.gogn;
    assert.ok(!g.some((x) => x.omaelt));
    assert.deepStrictEqual([g.find((x) => 'uttektarskyrsla_arsins' in x).uttektarskyrsla_arsins, g.find((x) => 'uttektarreikningar_arsins' in x).uttektarreikningar_arsins,
      g.find((x) => 'skodud_a_arinu' in x).taeki_virk, g.find((x) => 'skodud_a_arinu' in x).sidasta_skodun], [false, 0, 0, null]);
  } finally { aftur(); }
});

test('mál á Þjónustuborðinu fær EKKI úttektargögn og kerfisviðbótin er óbreytt (bakfærsluvörn)', async () => {
  const { fake, aftur } = setja();
  const fyrr = { kalla: CL.kalla };
  L.stilla(REG);
  try {
    await M.vista({ mal_id: 1934, merki: 'veit_ekki' }, 'Agnar');
    const kv = []; await M.keyra('Agnar', { kveikja: async (id, n) => kv.push([id, n]) });
    let fengid = null, kerfi = '';
    CL.kalla = async (gogn, o) => { fengid = gogn; kerfi = o.kerfiAuki; return { svar: { svar: 'x', stadreyndir: [], tillaga: { tegund: 'ekkert', titill: '', lysing: '', post_id: '', texti: '' }, omaelt: ['ekkert'] }, model: 'stub' }; };
    await M.vinnaMerki(kv[0][0], kv[0][1]);
    assert.match(kerfi, /LÍNA Á ÞJÓNUSTUBORÐINU \(mál #1934\)/); assert.ok(!/ÞJÓNUSTUVERKSTÆÐINU/.test(kerfi));
    assert.ok(!fengid.gogn.some((x) => /^[UK]\d/.test(x.id)), 'engin úttektargögn á málslínu');
    assert.deepStrictEqual([fengid.mal.id, fengid.atridi.hluti], [1934, 'Þjónustuborð']);
    assert.strictEqual(fake.T.bord_merkingar[0].fyrirtaeki_id, undefined);
  } finally { aftur(); Object.assign(CL, fyrr); L.stilla(null); }
});

/* ── Sama talning og flísarnar á verkstæðinu ─────────────────────────────────── */
test('taekjatalning (þjónn) = skodudKort (190, vafri) á sömu röðum', () => {
  const SRC = fs.readFileSync(path.join(__dirname, '..', 'js', 'patches', '190-thjonustu-verkstaedi.js'), 'utf8');
  const kortF = SRC.match(/\n  function skodudKort\(rows, ar, iDag\) \{[\s\S]*?\n  \}/);
  assert.ok(kortF, 'náði ekki skodudKort úr 190');
  const skodudKort = new Function(kortF[0] + '\nreturn skodudKort;')();
  const I = D('11', '18');
  const radir = GRUNNUR().uttaeki.filter((u) => u.fyrirtaeki_id === 1934).concat([
    { fyrirtaeki_id: 1934, last_insp: D('12', '31'), status: 'active', created_at: '2024-01-01T00:00:00Z' },   // fram í tímann
    { fyrirtaeki_id: 1934, last_insp: D('02', '01'), status: null, created_at: null },
    { fyrirtaeki_id: 1934, last_insp: 'rusl', status: 'active', created_at: null }, { fyrirtaeki_id: 1934, last_insp: null, status: 'URELT' },
  ]);
  const v = skodudKort(radir, AR, I).get('1934'), t = CL.taekjatalning(radir, AR, I);
  assert.deepStrictEqual([t.skodud, t.sidast], [v.n, v.sidast]);
  assert.deepStrictEqual([t.skodud, t.sidast, t.urelt, t.nyskrad], [3, D('09', '24'), 2, 1]);
  assert.deepStrictEqual(CL.taekjatalning(null, AR, I), { virk: 0, urelt: 0, skodud: 0, nyskrad: 0, sidast: '' });
});

test('erUttektTeg: sama regla og verkstæðið (190) — brunakerfi, búð og slökkvikerfi eru ekki slökkvitækjaúttekt', () => {
  const SRC = fs.readFileSync(path.join(__dirname, '..', 'js', 'patches', '190-thjonustu-verkstaedi.js'), 'utf8');
  const f = SRC.match(/\n  function isUttektInvoiceTeg\(teg\) \{[\s\S]*?\n  \}/);
  const is190 = new Function(f[0] + '\nreturn isUttektInvoiceTeg;')();
  for (const t of ['brunakerfi', 'Brunakerfi', 'bud', 'slokkvikerfi', 'vatnsudakerfi', 'uttekt', '', null, undefined, 'ovisst', 'annad']) assert.strictEqual(CL.erUttektTeg(t), is190(t), String(t));
});
