// Próf Einkaritarans (16.11.2026). Keyrsla: node --test test/einkaritari.test.cjs
//
// AF HVERJU: fyrsta útgáfan (#993) fór óprófuð í loftið með þrjár fyrirspurnir á dálka sem eru ekki til
// (invoices.customer_nafn, fyrirtaeki.i_thjonustu, v_charlize_active.updated_at) og samningahluta sem gleypti
// villuna og sýndi „0 kr, ekkert á bið". Agnar 16.11: „ennþá drasl ómælt … lagaðu þetta".
//
// Gervi-PostgREST hér ÞEKKIR dálka hverrar töflu (lesið úr information_schema 16.11.2026) og svarar 400 / 42703 á
// óþekktan dálk — í select, síu, röðun og or=(…) — nákvæmlega eins og gagnagrunnurinn. Ný fyrirspurn á dálk sem er
// ekki til fellir því prófið í stað þess að birtast Agnari sem „ómælt".
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

process.env.SUPABASE_URL = 'http://gervi.test';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'prufulykill';

const E = require('../netlify/functions/_einkaritari-stadreyndir.cjs');
const B = require('../netlify/functions/einkaritari-background.cjs');

const NU = new Date('2026-11-16T18:00:00Z');
const dag = (n) => new Date(+NU - n * 864e5).toISOString();

// Dálkar sem eru TIL (information_schema 16.11.2026) — aðeins þeir sem Einkaritarinn má nota.
const SKEMA = () => ({
  solur: ['id', 'num', 'samtals', 'status', 'is_credit', 'greitt_med', 'paid_at', 'krafa_sent_at', 'customer_base_id', 'created_at'],
  invoices: ['id', 'tilvisun', 'customer_name', 'upphaed_total', 'gjalddagi', 'eindagi', 'status', 'greidsla_date', 'source', 'utgafudagur'],
  fyrirtaeki: ['id', 'nafn', 'created_at', 'er_i_thjonustu', 'deleted_at', 'customer_base_id'],
  customers_base: ['id', 'nafn', 'kennitala', 'rekstrarfelag'],
  v_krafa_ogreidd: ['id', 'num', 'customer_nafn', 'customer_base_id', 'samtals', 'dagar', 'flokkur'],
  thjonustubeidni: ['id', 'title', 'summary', 'notes', 'customer_nafn', 'customer_base_id', 'created_at', 'tags', 'deleted_at', 'archived_at', 'status', 'lokid_at'],
  v_charlize_active: ['id', 'scope', 'topic', 'fact', 'created_at'],
  krofur_yfirlit_meta: ['inv_key', 'paid', 'hidden', 'note'],
  v_uttektarplan: ['fid', 'nafn', 'man', 'stada'],
  verkefnalisti: ['id', 'status', 'updated_at', 'created_at'],
  automation_runs: ['job_name', 'status', 'detail', 'started_at'],
  afgreidsla: ['id', 'tegund', 'titill', 'virdi_kr', 'stada'],
  app_settings: ['id', 'settings'],
  app_kv: ['key', 'value'],
});

function heimur() {
  return {
    skema: SKEMA(),
    kall: [],
    gogn: {
      customers_base: (q) => (q.get('rekstrarfelag') ? [{ id: 293 }, { id: 866 }] : [{ id: 146 }]),
      v_krafa_ogreidd: (q) => (String(q.get('customer_base_id')).includes('146')
        ? [{ id: 1, samtals: 400000, dagar: 25, flokkur: 'a_bid' }, { id: 2, samtals: 806646, dagar: 25, flokkur: 'a_bid' }, { id: 3, samtals: 50000, dagar: 70, flokkur: 'kreditfaert' }]
        : [{ id: 9, samtals: 30000, dagar: 12, flokkur: 'innheimta' }]),
      solur: (q) => {
        if (q.get('customer_base_id')) return [{ num: 'R-001109', samtals: 52519, paid_at: dag(25) }];
        if (q.get('krafa_sent_at')) return [{ samtals: 20000, status: 'final', is_credit: false }];
        return [{ samtals: 40000, status: 'final', is_credit: false, greitt_med: 'reikningur' }, { samtals: 5000, status: 'final', is_credit: false, greitt_med: 'posi' }];
      },
      invoices: (q) => {
        if (q.get('status') === 'eq.PAID') return [{ upphaed_total: 4798428 }];
        if (q.get('utgafudagur')) return [{ upphaed_total: 100000, utgafudagur: '2026-11-12' }];
        if (String(q.get('eindagi')).startsWith('lt.')) return [{ tilvisun: '360', upphaed_total: 3500000 }, { tilvisun: '87', upphaed_total: 200000 }];
        return [{ tilvisun: '378', customer_name: 'Landspítali', upphaed_total: 3959247, gjalddagi: '2026-10-19', eindagi: '2026-10-30' },
          { tilvisun: '388', customer_name: 'ÞG verktakar ehf.', upphaed_total: 4756347, gjalddagi: '2026-11-09', eindagi: '2026-11-16' }];
      },
      krofur_yfirlit_meta: () => [{ inv_key: 'payday|378', paid: true, hidden: false }, { inv_key: 'payday|87', paid: false, hidden: true }],
      fyrirtaeki: () => [{ id: 1946, nafn: 'Fjallasól ehf.', created_at: dag(4) }],
      thjonustubeidni: (q) => {
        if (q.get('tags')) return [{ id: 1629, title: 'Topp 10', created_at: dag(0), notes: 'Inngangur\n\nC · ÞAÐ SEM SKIPTIR MESTU AÐ GERA\n1. Fyrsta atriði 12.144.372 kr.\n2. Annað atriði\n\n— Athugasemd 16.11.2026: ekki atriði\n3. ekki talið' }];
        if (q.get('or') && q.get('or').includes('forgangsmal')) return [{ id: 1604, title: 'ÍAV – DABS', summary: 'tilboðsbeiðni', customer_nafn: 'ÍAV', created_at: dag(7), tags: ['forgangsmal'] }];
        if (q.get('or')) return [
          { id: 1633, title: 'Heimaleiga: fá reikninganetfang', created_at: dag(0), tags: ['erindi'] },
          { id: 1623, title: 'AI-tillaga: Heimaleiga: endurgreiða inneign', created_at: dag(1), tags: ['samthykki', 'ai:tillaga'] },
        ];
        return [{ id: 1 }, { id: 2 }];
      },
      v_charlize_active: (q) => (q.get('fact') ? [{ id: 5, fact: 'Center Hotels: reikningar á bið frá 22.10', scope: 'slokkvitaeki' }] : [{ id: 1 }, { id: 2 }, { id: 3 }]),
      v_uttektarplan: () => [{ stada: 'utrunnid' }, { stada: 'utrunnid' }, { stada: 'thessi_manudur' }, { stada: 'framundan' }],
      verkefnalisti: () => [{ id: 'a' }],
      automation_runs: () => [{ job_name: 'luna-bridge', status: 'error', detail: 'x' }],
      afgreidsla: () => [{ id: 24, tegund: 'verk', titill: 'Tindasel: 152,8 klst.', virdi_kr: 2075370 }, { id: 3, tegund: 'krafa', titill: 'Senda kröfu R-001281', virdi_kr: null }],
      app_settings: () => [{ settings: { skipulagsbord: { by_staff: { Anni: { dagnotur: { '2026-11-17': 'Verkfundur MFK kl. 9' } } } } } }],
      app_kv: () => [],
    },
  };
}

// Dálkar sem fyrirspurnin nefnir: select, síulyklar, order og or=(…).
function dalkar(q) {
  const ut = new Set();
  for (const [k, v] of q.entries()) {
    if (k === 'select') { v.split(',').forEach((c) => ut.add(c.trim().split('->')[0])); continue; }
    if (k === 'order') { v.split(',').forEach((c) => ut.add(c.trim().split('.')[0])); continue; }
    if (k === 'limit' || k === 'offset' || k === 'on_conflict') continue;
    if (k === 'or' || k === 'and') {
      // „(a.in.(1,2),b.ilike.*x*,c.cs.["y"])" → dálkur er orðið á undan fyrsta punkti í hverjum lið á efsta stigi.
      let dypt = 0, lidur = '';
      const lidir = [];
      for (const ch of v.replace(/^\(|\)$/g, '')) {
        if (ch === '(' || ch === '[') dypt++;
        if (ch === ')' || ch === ']') dypt--;
        if (ch === ',' && dypt === 0) { lidir.push(lidur); lidur = ''; } else lidur += ch;
      }
      if (lidur) lidir.push(lidur);
      lidir.forEach((l) => ut.add(l.trim().split('.')[0]));
      continue;
    }
    ut.add(k.split('->')[0]);
  }
  return [...ut].filter(Boolean);
}

function stub(h) {
  global.fetch = async (url, o = {}) => {
    const u = new URL(String(url));
    const tafla = u.pathname.replace('/rest/v1/', '');
    const svar = (data, status = 200) => ({ ok: status < 400, status, json: async () => data, text: async () => JSON.stringify(data), headers: { get: () => null } });
    if ((o.method || 'GET') !== 'GET') return svar(null, 201);
    h.kall.push({ tafla, slod: decodeURIComponent(u.search) });
    const til = h.skema[tafla];
    if (!til) return svar({ code: '42P01', message: `relation "${tafla}" does not exist` }, 404);
    const vantar = dalkar(u.searchParams).find((c) => !til.includes(c));
    if (vantar) return svar({ code: '42703', details: null, hint: null, message: `column ${tafla}.${vantar} does not exist` }, 400);
    const f = h.gogn[tafla];
    const rodir = f ? f(u.searchParams) : [];
    const off = Number(u.searchParams.get('offset') || 0), lim = Number(u.searchParams.get('limit') || 1000);
    return svar(rodir.slice(off, off + lim));
  };
}

test('safna: ALLT mælist á réttum dálkum — enginn hluti ómældur', async () => {
  const h = heimur(); stub(h);
  const f = await E.safna({ nu: NU });
  assert.deepStrictEqual(f.omaelt, [], 'ómælt: ' + JSON.stringify(f.omaelt));
  for (const k of ['greitt', 'sendar', 'nyir_i_thjonustu', 'samningar', 'aminningar', 'vikunnar', 'afgreidsla', 'adalmal']) assert.ok(f[k], k + ' vantar');
  assert.strictEqual(f.greitt.slokkvitaeki.kr, 40000, 'aðeins greitt_med=reikningur');
  assert.strictEqual(f.greitt.samtals.kr, 40000 + 4798428);
  assert.strictEqual(f.sendar.samtals.kr, 20000 + 100000);
  assert.deepStrictEqual(f.nyir_i_thjonustu.map((x) => x.nafn), ['Fjallasól ehf.']);
});

test('samningar: Center Hotels sýnir kröfur Á BIÐ (ekki „0 kr"), síðasta greiðsla úr solur, lokuð mál og AI-tillögur utan', async () => {
  const h = heimur(); stub(h);
  const s = (await E.safna({ nu: NU })).samningar;
  assert.deepStrictEqual(s.center.a_bid.fjoldi, 2);
  assert.strictEqual(s.center.a_bid.kr, 1206646);
  assert.strictEqual(s.center.ogreitt.fjoldi, 0, 'á bið og kreditfært er ekki innheimta');
  assert.strictEqual(s.heimaleiga.ogreitt.kr, 30000);
  assert.deepStrictEqual(s.heimaleiga.sidasta_greidsla, { num: 'R-001109', kr: 52519, dags: dag(25).slice(0, 10) });
  assert.deepStrictEqual(s.heimaleiga.opin_mal.map((m) => m.mal_id), [1633], 'AI-tillaga (tags ai:*) er ekki mál');
  assert.strictEqual(s.heimaleiga.ai_tillogur_sleppt, 1);
  const mal = h.kall.filter((k) => k.tafla === 'thjonustubeidni' && k.slod.includes('customer_base_id.in.'));
  assert.ok(mal.length === 2 && mal.every((k) => k.slod.includes('status=neq.lokad')), 'opin mál síuð á STÖÐU, ekki lokid_at');
  assert.ok(!mal.some((k) => k.slod.includes('lokid_at=is.null')));
});

test('samningar: fyrirspurn sem bregst er ÓMÆLT — aldrei núll', async () => {
  const h = heimur();
  h.skema.v_krafa_ogreidd = h.skema.v_krafa_ogreidd.filter((c) => c !== 'customer_base_id');   // líkir eftir dálkavillu
  stub(h);
  const f = await E.safna({ nu: NU });
  assert.match(f.samningar.center.omaelt, /42703|SB 400/);
  assert.strictEqual(f.samningar.center.ogreitt, undefined, 'engin tala þegar mælingin brást');
  assert.strictEqual(f.samningar.center.a_bid, undefined);
  assert.deepStrictEqual(f.omaelt.map((o) => o.hluti).sort(), ['samningar:center', 'samningar:heimaleiga']);
});

test('áminningar: reikningur merktur greiddur/falinn í Kröfuyfirliti er ekki áminning; dagskrá er LISTI', async () => {
  const h = heimur(); stub(h);
  const a = (await E.safna({ nu: NU })).aminningar;
  assert.deepStrictEqual(a.eindagar.map((x) => x.tilvisun), ['388'], '#378 er greiddur skv. banka (krofur_yfirlit_meta)');
  assert.strictEqual(a.eindagar[0].nafn, 'ÞG verktakar ehf.');
  assert.strictEqual(a.eindagar[0].dagar_fram_yfir, 0);
  assert.deepStrictEqual({ n: a.eindagar_eldri_en_60d.fjoldi, kr: a.eindagar_eldri_en_60d.kr }, { n: 1, kr: 3500000 }, '#87 falinn');
  assert.strictEqual(a.eindagar_merkt_greitt_eda_falid, 1);
  assert.deepStrictEqual(a.uttektir, { utrunnid: 2, thessi_manudur: 1 });
  assert.ok(Array.isArray(a.dagskra), 'dagskrá verður að vera listi (506 ítrar hana)');
  assert.deepStrictEqual(a.forgangsmal.map((m) => m.mal_id), [1604]);
});

test('adalmal og afgreidsla: númeruð atriði kafla C, áætlað virði merkt sem áætlun', async () => {
  const h = heimur(); stub(h);
  const f = await E.safna({ nu: NU });
  assert.strictEqual(f.adalmal.mal_id, 1629);
  assert.deepStrictEqual(f.adalmal.atridi.map((x) => x.nr), [1, 2], 'athugasemdir (—) og línur utan C eru ekki atriði');
  assert.deepStrictEqual(f.afgreidsla.map((x) => [x.afgreidsla_id, x.aaetlad_virdi_kr]), [[24, 2075370], [3, null]]);
  assert.ok(!('virdi_kr' in f.afgreidsla[0]));
});

test('stadfesta: kerfisvilla er aldrei atriði; auðkenni sannreynd; hálfvissu hent', () => {
  const f = { afgreidsla: [{ afgreidsla_id: 24 }], adalmal: { mal_id: 1629 }, samningar: { h: { opin_mal: [{ mal_id: 1633 }] } }, aminningar: { forgangsmal: [{ mal_id: 1604 }] } };
  const r = B.stadfesta({
    fyrirsogn: 'Áminningar eru ómældar vegna villu í kerfinu.',
    i_dag: [
      { titill: 'Laga fyrirspurn áminninga (invoices)', af_hverju: 'Villa 42703 á invoices.', adgerd: 'engin', audkenni: 0 },
      { titill: 'Tindasel: gera drög', af_hverju: '152,8 klst.', adgerd: 'afgreidsla', audkenni: 24 },
      { titill: 'Óþekkt verk', af_hverju: 'x', adgerd: 'afgreidsla', audkenni: 999 },
      { titill: 'Topp 10', af_hverju: 'x', adgerd: 'adalmal', audkenni: 7 },
      { titill: 'Opna mál', af_hverju: 'x', adgerd: 'mal', audkenni: 1604 },
      { titill: 'Óvíst', af_hverju: 'Þetta er líklega greitt.', adgerd: 'engin', audkenni: 0 },
    ],
    topp_vikunnar: [{ texti: 'Vikuyfirlitið er ÓMÆLT vegna villu 42703.', heimild: 'omaelt' }, { texti: 'Heklureitur greiddur.', heimild: 'Payday' }],
    samningar: {}, aminningar_texti: '',
  }, f);
  assert.strictEqual(r.fyrirsogn, '', 'fyrirsögn um kerfisvillu er hent');
  assert.deepStrictEqual(r.i_dag.map((x) => [x.titill, x.adgerd, x.audkenni]), [
    ['Tindasel: gera drög', 'afgreidsla', 24],
    ['Óþekkt verk', 'engin', 0],
    ['Topp 10', 'adalmal', 1629],
    ['Opna mál', 'mal', 1604],
  ]);
  assert.deepStrictEqual(r.topp_vikunnar.map((x) => x.texti), ['Heklureitur greiddur.']);
  assert.strictEqual(r.hent, 4);
});

test('506: tölurnar lesa lykla bakendans, takkar vísa á raunverulega staði, gamalt dagskrár-snið fellir ekki gluggann', () => {
  const win = {};
  const ctx = { window: win, document: { addEventListener() {}, getElementById() { return null; }, visibilityState: 'visible' }, console, setTimeout, clearTimeout, requestAnimationFrame() {}, Date, Math, JSON, Number, String, Array, Object, Promise, fetch: async () => ({}) };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', 'patches', '506-einkaritari.js'), 'utf8'), ctx);
  const K = win.Einkaritari;
  const t = K.toluHtml({
    greitt: { slokkvitaeki: { fjoldi: 7, kr: 480614 }, brunaholf: { fjoldi: 1, kr: 4798428 }, samtals: { fjoldi: 8, kr: 5279042, fyrri_kr: 1879928 } },
    sendar: { slokkvitaeki: { fjoldi: 13, kr: 654251 }, brunaholf: { fjoldi: 0, kr: 0 } },
    nyir_i_thjonustu: [{ nafn: 'Fjallasól ehf.' }],
  });
  assert.ok(!/ómælt/.test(t), 'mældar tölur mega ekki birtast sem ómælt: ' + t);
  assert.match(t, /Brunahólf 4\.798\.428 kr/);
  assert.match(t, /654\.251 kr/);
  assert.match(K.toluHtml({ greitt: null, sendar: null, nyir_i_thjonustu: null }), /ómælt/, 'null = ómælt, ekki 0');
  assert.match(K.takkiHtml({ adgerd: 'afgreidsla', audkenni: 24 }), /href="\/afgreidsla\.html\?v=24"/);
  assert.match(K.takkiHtml({ adgerd: 'afgreidsla', audkenni: 24 }), /data-t5="ek-afgr" data-id="24"/, 'verkið opnast á borðinu (511); href er varaleiðin');
  assert.match(K.takkiHtml({ adgerd: 'mal', audkenni: 1604 }), /data-t5="ek-mal" data-id="1604"/);
  assert.match(K.takkiHtml({ adgerd: 'adalmal', audkenni: 1629 }), /data-t5="ek-syn" data-v="adalmal"/);
  assert.strictEqual(K.takkiHtml({ adgerd: 'engin', audkenni: 0 }), '');
  assert.strictEqual(K.takkiHtml({ hlekkur: 'samningar › heimaleiga' }), '', 'gamli „hlekkurinn" verður aldrei að tengli');
  // Gamla sniðið á dagskrá var HLUTUR — for…of á honum felldi gluggann.
  assert.doesNotThrow(() => K.aminningarHtml('x', { dagskra: { merki: 'MAELT', naestu_dagar: [] }, eindagar: [{ nafn: 'A', kr: 1, eindagi: '2026-11-16', dagar_fram_yfir: 0 }], forgangsmal: [{ mal_id: 5, titill: 'B' }] }));
  assert.match(K.aminningarHtml('', { forgangsmal: [{ mal_id: 5, titill: 'B' }] }), /data-t5="ek-mal" data-id="5"/);
});
