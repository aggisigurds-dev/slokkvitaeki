// Próf: Ráðgjafinn (netlify/functions/_radgjafinn.cjs) — söfnun úr pósti/reikningum, kallið á Claude, vörðurinn sem hendir
// atriðum án heimildar, skrifin/minnið og starfsmanna-hliðið. Stub-fetch fyrir Supabase og Claude — ekkert lifandi snert.
// Keyrsla: node --test test/radgjafinn.test.cjs
'use strict';
process.env.SUPABASE_URL = 'http://stub.invalid';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'stub';
process.env.ANTHROPIC_API_KEY = 'stub-lykill';
delete process.env.HUB_STAFF_PASSWORD;
const test = require('node:test');
const assert = require('node:assert/strict');
const R = require('../netlify/functions/_radgjafinn.cjs');

const NU = new Date('2026-11-16T06:45:00Z');
const dag = (n) => new Date(NU - n * 864e5).toISOString();
const post = (id, msg, folder, fra, nafn, efni, texti, dagar, auka = {}) => ({ id, message_id: msg, account: 'stub@eldklar.is', folder, sender_email: fra,
  to_addresses: 'stub@eldklar.is', sender_name: nafn, subject: efni, body_preview: texti, snippet: '', received_at: dag(dagar), ...auka });
const TIL_H = { to_addresses: '"Stub" <stub-a@heimaleiga.is>' }, TIL_C = { to_addresses: 'stub-c@centerhotels.com' };

function heimur() {
  return {
    postar: {
      'heimaleiga.is': [
        post(1, 'm1', 'INBOX', 'stub-a@heimaleiga.is', 'Sigga', 'Skoðun Norðurhús', 'Getið þið komið á þriðjudag?\n\nOn Mon, 10 Nov 2026 Agnar wrote:\n> gamall texti', 1),
        post(2, 'm1', 'INBOX', 'stub-a@heimaleiga.is', 'Sigga', 'Skoðun Norðurhús', 'tvítak sama message_id', 1),
        post(3, 'm2', 'SENT', 'okkar@slokkvitaeki.is', 'Agnar', 'Re: Reikningur', 'Sendum leiðréttan reikning í dag.', 3, TIL_H),
        post(4, 'm3', 'INBOX', 'stub-b@heimaleiga.is', '', 'Ný eign', 'Bætist við í desember.', 20),
      ],
      'centerhotels.com': [
        post(10, 'c1', 'INBOX', 'stub-c@centerhotels.com', 'Jóna', 'Skýrslur', 'Hvenær koma skýrslurnar?', 2),
        ...[1, 2, 3, 4, 5, 6, 7].map((i) => post(10 + i, 'c' + (i + 1), 'SENT', 'okkar@slokkvitaeki.is', 'Agnar', 'Eldra ' + i, 'texti ' + i, 20 + i, TIL_C)),
      ],
    },
    base: { heimaleiga: [{ id: 101 }, { id: 102 }], center: [{ id: 146 }] },
    solur: [
      { id: 1, customer_nafn: 'Norðurhús', samtals: 50000, created_at: dag(40), krafa_sent_at: dag(38), paid_at: null, status: 'lokid', is_credit: false, hidden: false },
      { id: 2, customer_nafn: 'Suðurhús', samtals: 30000, created_at: dag(10), krafa_sent_at: null, dk_invoice_id: 'D9', paid_at: null, status: 'lokid', is_credit: false, hidden: false },
      { id: 3, customer_nafn: 'Ógilt', samtals: 999999, created_at: dag(5), krafa_sent_at: dag(5), paid_at: null, status: 'void', is_credit: false, hidden: false },
      { id: 4, customer_nafn: 'Kredit', samtals: -20000, created_at: dag(5), krafa_sent_at: dag(5), paid_at: null, status: 'lokid', is_credit: true, hidden: false },
      { id: 5, customer_nafn: 'Ósent', samtals: 70000, created_at: dag(5), krafa_sent_at: null, paid_at: null, status: 'lokid', is_credit: false, hidden: false },
      { id: 6, customer_nafn: 'Greitt', samtals: 40000, created_at: dag(20), krafa_sent_at: dag(19), paid_at: dag(4), status: 'lokid', is_credit: false, hidden: false },
    ],
    // v_krafa_ogreidd fyrir hópinn (16.11.2026): sýnin flokkar; kreditfærð og á bið teljast ekki sem innheimta.
    ogreidd_hops: [
      { num: 'R-N', customer_nafn: 'Norðurhús', samtals: 50000, dagar: 38, flokkur: 'innheimta' },
      { num: 'R-S', customer_nafn: 'Suðurhús', samtals: 30000, dagar: 10, flokkur: 'innheimta' },
      { num: 'R-K', customer_nafn: 'Kreditað', samtals: 999000, dagar: 60, flokkur: 'kreditfaert' },
      { num: 'R-B', customer_nafn: 'Á bið', samtals: 70000, dagar: 20, flokkur: 'a_bid' },
    ],
    charlize: [{ fact: 'Heimaleiga fékk sérkjör 30.10.2026', created_at: dag(16) }],
    forgangsmal: [{ id: 9, title: 'Center: reikningar á bið', summary: '900.000 kr bíða', customer_nafn: 'Center Hotels', created_at: dag(6) }],
    greitt_sl: [{ samtals: 40000, status: 'lokid', is_credit: false, greitt_med: 'reikningur' }, { samtals: 5000, status: 'lokid', is_credit: false, greitt_med: 'posi' }],
    greitt_bh: [{ upphaed_total: 1327046 }],
    kv: {},
  };
}

function stub(h, opt = {}) {
  const kall = [];
  const svar = (data, status = 200) => ({ ok: status < 400, status, json: async () => data, text: async () => JSON.stringify(data) });
  global.fetch = async (url, o = {}) => {
    url = String(url);
    const method = o.method || 'GET';
    const body = o.body ? JSON.parse(o.body) : null;
    kall.push({ url, method, body, headers: o.headers || {} });
    if (url.startsWith('https://api.anthropic.com/')) return opt.claude ? opt.claude(body, o.headers) : svar(claudeSvar(GOTT));
    if (url.includes('/.netlify/functions/')) return opt.fall ? opt.fall(url, o) : svar(null, 202);
    const u = new URL(url), tafla = u.pathname.replace('/rest/v1/', ''), q = u.searchParams;
    if (opt.kasta && opt.kasta(tafla, method)) throw new Error('stub-netvilla');
    if (opt.bila && opt.bila(tafla, method)) return svar({ message: 'stub-bilun' }, 500);
    if (tafla === 'app_kv' && method === 'POST') {
      const pref = String((o.headers || {}).Prefer || '');
      if (/ignore-duplicates/.test(pref)) { if (h.kv[body.key]) return svar([]); h.kv[body.key] = body.value; return svar([body]); }
      h.kv[body.key] = body.value; return svar(null);
    }
    if (tafla === 'app_kv' && method === 'PATCH') {
      const k = q.get('key').replace('eq.', ''), v = h.kv[k];
      const ok = v && [...q.entries()].every(([sl, gildi]) => {
        const m = sl.match(/^value->>(\w+)$/); if (!m) return true;
        const [op, x] = [gildi.slice(0, gildi.indexOf('.')), gildi.slice(gildi.indexOf('.') + 1)];
        return op === 'lt' && v[m[1]] != null && String(v[m[1]]) < x;
      });
      if (!ok) return svar([]);
      h.kv[k] = body.value; return svar([{ key: k, value: body.value }]);
    }
    if (tafla === 'app_kv') { const k = q.get('key').replace('eq.', ''); return svar(h.kv[k] ? [{ value: h.kv[k] }] : []); }
    if (tafla === 'automation_runs' && method === 'GET') return svar(h.runs_villur || []);
    if (tafla === 'automation_runs') { (h.runs = h.runs || []).push(body); return svar(null); }
    if (tafla === 'v_uttektarplan') return svar(h.uttektarplan || []);
    if (tafla === 'afgreidsla') return svar(h.akvardanir || []);
    const sida = (a) => { const off = Number(q.get('offset') || 0), lim = Number(q.get('limit') || 1000); return (a || []).slice(off, off + lim); };
    // 16.11.2026 (ein skilgreining): Tony les v_krafa_ogreidd; combo-yfirlit telur v_krafa_ekki_send_adgerd með content-range.
    if (tafla === 'v_krafa_ogreidd' && q.get('customer_base_id')) return svar(q.get('customer_base_id').includes('101') ? (h.ogreidd_hops || []) : []);
    if (tafla === 'v_krafa_ogreidd') return svar(sida(h.ogreidd || []));
    if (tafla === 'v_krafa_ekki_send_adgerd') { const d = h.adgerd || []; return { ...svar(d), headers: { get: (k) => (k.toLowerCase() === 'content-range' && h.adgerd ? '0-0/' + d.length : null) } }; }
    if (tafla === 'solur' && q.get('status') === 'eq.final') return svar(sida(h.tekjur_sl));
    if (tafla === 'solur' && q.get('status') === 'eq.void') return svar(sida(h.void_sl || []));
    // 17.11.2026 (lota 4): tekjur Brunahólfs eftir útgáfudegi — sían er or=(utgafudagur…,and(utgafudagur.is.null,gjalddagi…)).
    if (tafla === 'invoices' && (q.get('gjalddagi') || (q.get('or') || '').includes('utgafudagur'))) return svar(sida(h.tekjur_bh));
    if (tafla === 'email_digest') {
      const len = Object.keys(h.postar).find((d) => q.get('and').includes(d));
      assert.match(q.get('and'), /account\.ilike\."\*@eldklar\.is",account\.ilike\."\*@brunaholf\.is"/, 'SQL-sían takmarkar við pósthólf félaganna');
      const fra = q.get('received_at').replace('gte.', '');
      return svar(h.postar[len].filter((p) => p.received_at >= fra).sort((a, b) => b.received_at.localeCompare(a.received_at)));
    }
    if (tafla === 'customers_base') return svar(q.get('rekstrarfelag') ? h.base.heimaleiga : h.base.center);
    if (tafla === 'solur' && q.get('customer_base_id')) return svar(q.get('customer_base_id').includes('101') ? h.solur : []);
    if (tafla === 'solur') return svar(h.greitt_sl);
    if (tafla === 'invoices') return svar(h.greitt_bh);
    if (tafla === 'v_charlize_active') return svar(q.get('fact').includes('heimaleig') ? h.charlize : []);
    if (tafla === 'thjonustubeidni') return svar(h.forgangsmal);
    if (tafla === 'hub_adgangar_stilling') return svar(h.hub && h.hub.stilling ? [h.hub.stilling] : []);
    if (tafla === 'hub_adgangar') { const id = Number(String(q.get('id') || '').replace('eq.', '')); return svar(h.hub && h.hub.user && h.hub.user.id === id ? [h.hub.user] : []); }
    throw new Error('óþekkt slóð ' + tafla);
  };
  return kall;
}

const GOTT = {
  fyrirsogn: 'Svaraðu Center um skýrslurnar og innheimtu Norðurhús.',
  heimaleiga: { stada: 'Sigga bíður svars um skoðun.', frettir: [
    { texti: 'Sigga vill skoðun á Norðurhús á þriðjudag.', heimildir: ['H1'] },
    { texti: 'Uppspunnin frétt án heimildar.', heimildir: ['H99'] },
    { texti: 'Leiðréttur reikningur sendur.', heimildir: ['H2', 'HR'] },
  ] },
  center: { stada: 'Jóna spyr um skýrslur.', frettir: [{ texti: 'Jóna spyr hvenær skýrslurnar koma.', heimildir: ['C1'] }] },
  rad: [
    { titill: 'Svara Jónu', af_hverju: 'Samband og reikningar á bið.', fyrsta_skref: 'Senda dagsetningu.', heimildir: ['C1', 'F1'] },
    { titill: 'Innheimta Norðurhús', af_hverju: '50.000 kr 38 daga.', fyrsta_skref: 'Hringja.', heimildir: ['HR'] },
    { titill: 'Ráð án heimildar', af_hverju: 'x', fyrsta_skref: 'y', heimildir: [] },
    { titill: 'Fjórða ráðið', af_hverju: 'x', fyrsta_skref: 'y', heimildir: ['G'] },
    { titill: 'Fimmta ráðið', af_hverju: 'x', fyrsta_skref: 'y', heimildir: ['G'] },
  ],
  betri_leid: [
    { titill: 'Uppspunnin tillaga', nuna: 'x', betra: 'y', fyrsta_skref: 'z', heimildir: ['H77'] },
    { titill: 'Tillaga án „núna"', nuna: '', betra: 'b', fyrsta_skref: 'c', heimildir: ['C1'] },
    { titill: 'Tillaga án „betra"', nuna: 'a', betra: ' ', fyrsta_skref: 'c', heimildir: ['C1'] },
    { titill: '', nuna: 'a', betra: 'b', fyrsta_skref: 'c', heimildir: ['C1'] },
    { titill: 'Greiðandi staðfestur áður en reikningur fer', nuna: 'Leiðréttur reikningur þurfti að fara aftur til Heimaleigu.',
      betra: 'Greiðandi eignar staðfestur áður en reikningur er gerður.', fyrsta_skref: 'Fara yfir greiðendur á eignum Heimaleigu.', heimildir: ['H2', 'H3', 'HK1'] },
    { titill: 'Önnur gild tillaga', nuna: 'a', betra: 'b', fyrsta_skref: 'c', heimildir: ['C1'] },
  ],
};
const claudeSvar = (obj, o = {}) => ({ model: 'claude-opus-5-5', stop_reason: o.stop || 'end_turn', stop_details: o.det || null,
  content: [{ type: 'thinking', thinking: '' }, { type: 'text', text: typeof obj === 'string' ? obj : JSON.stringify(obj) }], usage: { input_tokens: 9000, output_tokens: 700 } });

test('safna: póstar hópanna, tvítök út, tilvitnanir út, engin netföng, stefna eftir möppu', async () => {
  const h = heimur(); stub(h);
  const f = await R.safna({ nu: NU });
  const hl = f.hopar.heimaleiga;
  assert.equal(hl.postur_14d, 2, 'tvítakið (sama message_id) talið einu sinni; 20 daga pósturinn utan 14 daga');
  assert.deepEqual(hl.postar.map((p) => p.id), ['H1', 'H2', 'H3'], 'færri en 6 innan 14 daga → síðustu póstarnir samt með');
  assert.equal(hl.postar[0].att, 'til okkar'); assert.equal(hl.postar[1].att, 'frá okkur');
  assert.ok(!/gamall texti|wrote:/.test(hl.postar[0].texti), 'tilvitnaði fyrri pósturinn hreinsaður');
  assert.equal(hl.postar[2].fra, 'heimaleiga.is', 'sendandi án nafns → lénið, aldrei netfangið');
  assert.ok(!JSON.stringify(f).includes('@'), 'ekkert netfang fer til Claude');
  const c = f.hopar.center;
  assert.equal(c.postur_14d, 1);
  assert.equal(c.postar.length, 6, 'rólegt hjá Center → 6 síðustu póstar');
  assert.deepEqual(f.omaelt, []);
});

test('safna: reikningastaða hópsins úr v_krafa_ogreidd (innheimta talin; á bið og kreditfært sér)', async () => {
  const h = heimur(); stub(h);
  const r = (await R.safna({ nu: NU })).hopar.heimaleiga.reikningar;
  assert.equal(r.id, 'HR');
  assert.equal(r.ogreitt_fjoldi, 2, 'Norðurhús (krafa send) + Suðurhús (dk_invoice_id); ógilt, kredit, ósent og greitt utan');
  assert.equal(r.ogreitt_kr, 80000);
  assert.equal(r.ogreitt_elsta_dagar, 38);
  assert.deepEqual(r.ogreitt_staerstu.map((x) => x.nafn), ['Norðurhús', 'Suðurhús']);
  assert.equal(r.a_bid_fjoldi, 1); assert.equal(r.a_bid_kr, 70000); assert.equal(r.kreditfaert_utilokad, 1);
  assert.equal(r.greitt_30d_fjoldi, 1); assert.equal(r.greitt_30d_kr, 40000);
});

test('safna: greitt í vikunni — aðeins greitt_med reikningur hjá Slökkvitæki, Payday PAID hjá Brunahólfi', async () => {
  const h = heimur(); stub(h);
  const g = (await R.safna({ nu: NU })).greitt_vikan;
  assert.deepEqual(g.slokkvitaeki, { fjoldi: 1, kr: 40000 });
  assert.deepEqual(g.brunaholf, { fjoldi: 1, kr: 1327046 });
});

test('safna: hluti sem bregst verður „ómælt" — hinir standa (þögn er ekki núll)', async () => {
  const h = heimur(); stub(h, { bila: (t) => t === 'v_charlize_active' });
  const f = await R.safna({ nu: NU });
  assert.deepEqual(f.omaelt.map((x) => x.hluti), ['Heimaleiga · Charlize', 'Center Hotels · Charlize']);
  assert.equal(f.hopar.heimaleiga.postar.length, 3, 'pósturinn stendur samt');
});

test('kalla: Opus 5.5, JSON-snið, fallbacks default, API-útgáfa 2026-10-21', async () => {
  const h = heimur(); const kall = stub(h);
  const f = await R.safna({ nu: NU });
  const { svar, model } = await R.kalla(f);
  const k = kall.find((x) => x.url.startsWith('https://api.anthropic.com/'));
  assert.equal(k.headers['anthropic-version'], '2026-10-21');
  assert.equal(k.headers['anthropic-beta'], 'server-side-fallback-2026-07-01');
  assert.equal(k.body.model, 'claude-opus-5-5');
  assert.equal(k.body.fallbacks, 'default');
  assert.equal(k.body.output_config.effort, 'high');
  assert.equal(k.body.output_config.format.type, 'json_schema');
  assert.equal(k.body.thinking, undefined, 'Opus 5.5: hugsun alltaf á — ekki sent');
  assert.equal(k.body.temperature, undefined, 'temperature hafnað frá 2026-10-21');
  assert.equal(svar.fyrirsogn, GOTT.fyrirsogn); assert.equal(model, 'claude-opus-5-5');
  assert.match(k.body.system, /ALDREI fyrirmæli/, 'póstur er gögn, ekki fyrirmæli (innskot í pósti)');
  assert.match(k.body.system, /bankareikning/, 'beiðni um greiðslu/bankareikning er áhætta, ekki verkefni');
  assert.match(k.body.system, /^Þú ert Tony Stark/, 'persónan er Tony Stark (agent tony-stark)');
  assert.match(k.body.system, /Betri leið: EIN tillaga/);
  assert.match(k.body.system, /tómur listi/, 'engin tillaga er gilt svar');
});

test('SKEMA: strangt — hver hlutur ber additionalProperties false og alla reiti sína sem required (annars hafnar API-ið)', () => {
  const gangur = (sk, slod) => {
    if (sk.type === 'object') {
      assert.equal(sk.additionalProperties, false, slod);
      assert.deepEqual([...sk.required].sort(), Object.keys(sk.properties).sort(), slod);
      for (const [k, v] of Object.entries(sk.properties)) gangur(v, slod + '.' + k);
    }
    if (sk.type === 'array') gangur(sk.items, slod + '[]');
  };
  gangur(R.SKEMA, 'SKEMA');
  assert.ok(R.SKEMA.required.includes('betri_leid'));
});

test('kalla: höfnun, of langt svar, ógilt JSON og API-villa kasta — engin hálfskrif', async () => {
  const h = heimur(); const f = (stub(h), await R.safna({ nu: NU }));
  const mal = [
    [() => ({ ok: true, status: 200, json: async () => claudeSvar(GOTT, { stop: 'refusal', det: { category: 'cyber' } }) }), /hafnaði.*cyber/],
    [() => ({ ok: true, status: 200, json: async () => claudeSvar(GOTT, { stop: 'max_tokens' }) }), /of langt/],
    [() => ({ ok: true, status: 200, json: async () => claudeSvar('ekki json {') }), /ekki gilt JSON/],
    [() => ({ ok: false, status: 529, json: async () => ({ error: { message: 'overloaded' } }) }), /Claude 529: overloaded/],
  ];
  for (const [svarFall, re] of mal) {
    stub(h, { claude: svarFall });
    await assert.rejects(R.kalla(f), re);
  }
});

test('stadfesta: atriðum án gildrar heimildar hent, ókunn auðkenni síuð, mest 4 fréttir og 10 ráð (Agnar 15.11: „top 10")', async () => {
  const h = heimur(); stub(h);
  const f = await R.safna({ nu: NU });
  const s = R.stadfesta(GOTT, f);
  assert.deepEqual(s.heimaleiga.frettir.map((x) => x.texti), ['Sigga vill skoðun á Norðurhús á þriðjudag.', 'Leiðréttur reikningur sendur.']);
  assert.deepEqual(s.rad.map((x) => x.titill), ['Svara Jónu', 'Innheimta Norðurhús', 'Fjórða ráðið', 'Fimmta ráðið']);
  assert.ok(s.rad.every((x) => x.flokkur === 'umbót'), 'ráð án gilds flokks fær „umbót"');
  assert.equal(s.betri_leid.titill, 'Greiðandi staðfestur áður en reikningur fer', 'fyrsta gilda tillagan; H77 er ekki til');
  assert.deepEqual(s.betri_leid.heimildir, ['H2', 'H3', 'HK1']);
  assert.equal(s.hent, 7, 'frétt H99 + ráð án heimildar + tillögur: H77, án „núna", án „betra", án titils, önnur gild (mest ein)');
  const tolf = Array.from({ length: 12 }, (_, i) => ({ flokkur: 'peningar', titill: 'Ráð ' + (i + 1), af_hverju: 'x', fyrsta_skref: 'y', heimildir: ['G'] }));
  const s12 = R.stadfesta({ ...GOTT, rad: tolf }, f);
  assert.equal(s12.rad.length, 10, 'mest 10 ráð');
  assert.equal(s12.rad[9].titill, 'Ráð 10');
  assert.equal(s12.hent, 7 - 1 + 2, 'ráð 11 og 12 teljast hent (GOTT-ráðið án heimildar er ekki lengur með)');
  assert.equal(s12.rad[0].flokkur, 'peningar');
  assert.deepEqual(s.rad[0].heimildir, ['C1', 'F1']);
  assert.deepEqual(Object.keys(s.postar).sort(), ['C1', 'H1', 'H2', 'H3'], 'aðeins póstar sem eru notaðir — H3 kemur úr betri leiðinni');
  assert.equal(s.postar.H1.efni, 'Skoðun Norðurhús'); assert.equal(s.postar.H1.dags, NU.toISOString().slice(0, 10).replace(/\d\d$/, (d) => String(d - 1).padStart(2, '0')));
});

// 19.11.2026 (traustmæling): reglan „peningaráð þarf MÆLDA heimild" stóð með `Pd+` — týnt bakskástrik. „P1" komst því
// aldrei í gegn og peningaráð með P-línu var hent ÞEGJANDI frá 15.11. Hér er hver mæld heimild prófuð, ekki aðeins O og G.
test('stadfesta: P-línur eru mældar heimildir (Pd+ var bakskástrikslaust og felldi þær allar)', async () => {
  const h = heimur(); stub(h);
  const f = await R.safna({ nu: NU });
  const rad = (heimildir) => [{ flokkur: 'peningar', titill: 'Peningaráð', af_hverju: 'x', fyrsta_skref: 'y', heimildir }];
  for (const hm of ['O', 'M', 'G', 'P1', 'P2', 'P12', 'HR', 'CR']) {
    const s = R.stadfesta({ ...GOTT, rad: rad([hm]), heimaleiga: { stada: '', frettir: [] }, center: { stada: '', frettir: [] }, betri_leid: null }, f);
    assert.equal(s.rad.length, 1, hm + ' á að teljast mæld heimild');
  }
  // Þekking ein og sér dugar áfram ekki á peningaráði — reglan sjálf er óbreytt.
  for (const hm of ['HK1', 'CK2', 'Pd']) {
    const s = R.stadfesta({ ...GOTT, rad: rad([hm]), heimaleiga: { stada: '', frettir: [] }, center: { stada: '', frettir: [] }, betri_leid: null }, f);
    assert.equal(s.rad.length, 0, hm + ' má ekki duga sem mæld heimild');
  }
});

test('stadfesta: engin betri leið (tómur listi, vantar eða ekki listi) → null, ekkert hent', async () => {
  const h = heimur(); stub(h);
  const f = await R.safna({ nu: NU });
  for (const bl of [[], undefined, 'ekki listi', null]) {
    const s = R.stadfesta({ ...GOTT, rad: [], heimaleiga: { stada: '', frettir: [] }, center: { stada: '', frettir: [] }, betri_leid: bl }, f);
    assert.equal(s.betri_leid, null, String(bl));
    assert.equal(s.hent, 0, String(bl));
  }
});

test('skrifa: vistar nýjasta + sögu + staðreyndir og skráir í automation_runs', async () => {
  const h = heimur(); stub(h);
  const rec = await R.skrifa({ kalladAf: 'morgun', nu: NU });
  assert.equal(rec.rad.length, 4, 'GOTT: 5 ráð, eitt án heimildar — mest 10');
  assert.equal(h.kv.radgjafinn.nyjast.fyrirsogn, GOTT.fyrirsogn);
  assert.equal(h.kv.radgjafinn.saga.length, 1);
  assert.equal(h.kv.radgjafinn.sidasta_villa, null);
  assert.ok(h.kv.radgjafinn_gogn.stadreyndir.hopar.heimaleiga, 'staðreyndirnar geymdar sér');
  assert.equal(h.kv.radgjafinn.nyjast.stadreyndir, undefined, 'staðreyndirnar fara ekki á skjáinn');
  assert.equal(h.runs[0].job_name, 'radgjafinn'); assert.equal(h.runs[0].status, 'ok');
  assert.match(h.runs[0].detail, /betri leið: já/);
  assert.equal(h.kv.radgjafinn.saga[0].betri_leid.titill, 'Greiðandi staðfestur áður en reikningur fer', 'sagan geymir betri leiðina');
});

test('skrifa: fyrri betri leiðir fara til Claude (fyrri_tillogur) svo Tony endurtaki sig ekki — einstakar, mest 7', async () => {
  const h = heimur(); stub(h);
  await R.skrifa({ kalladAf: 'agnar', nu: NU });
  const kall = stub(h);
  await R.skrifa({ kalladAf: 'morgun', nu: NU });
  const k = kall.find((x) => x.url.startsWith('https://api.anthropic.com/'));
  const gogn = JSON.parse(k.body.messages[0].content.split('Gögnin (JSON):\n')[1]);
  assert.deepEqual(gogn.fyrri_tillogur.map((x) => x.titill), ['Greiðandi staðfestur áður en reikningur fer']);
  assert.match(gogn.fyrri_tillogur[0].dags, /^\d{4}-\d\d-\d\d$/);
  const saga = Array.from({ length: 20 }, (_, i) => ({ skrifad_at: dag(i), betri_leid: i % 2 ? { titill: 'T' + i } : (i === 4 ? { titill: 'T1' } : null) }));
  assert.deepEqual(R.fyrriTillogur({ saga }).map((x) => x.titill), ['T1', 'T3', 'T5', 'T7', 'T9', 'T11', 'T13'],
    'T1 (aftur á degi 4) aðeins einu sinni; dagar án tillögu sleppt; mest 7');
  assert.deepEqual(R.fyrriTillogur({}), []);
  assert.deepEqual(R.fyrriTillogur(null), []);
});

test('skrifa: ↻ innan 5 mín gerir ekkert (Claude-kall kostar) — morgunskrifin fara alltaf', async () => {
  const h = heimur(); let kall = stub(h);
  await R.skrifa({ kalladAf: 'agnar' });
  kall = stub(h);
  const ut = await R.skrifa({ kalladAf: 'agnar' });
  assert.match(ut.sleppt, /minna en 5 mín/);
  assert.equal(kall.filter((k) => k.url.startsWith('https://api.anthropic.com/')).length, 0);
  kall = stub(h);
  const m = await R.skrifa({ kalladAf: 'morgun' });
  assert.ok(m.skrifad_at, 'morgunskrifin fara fram hjá 5 mín. biðinni');
  const m2 = await R.skrifa({ kalladAf: 'morgun' });
  assert.match(m2.sleppt, /morgunskrifin fóru fram fyrir minna en 60 mín/, 'tókinn gildir í 10 mín. — en mest ein heppnuð morgunkeyrsla á klst.');
});

test('skrifa: bilun heldur síðustu góðu skrifunum, skráir villuna og kastar', async () => {
  const h = heimur(); stub(h);
  await R.skrifa({ kalladAf: 'morgun', nu: NU });
  const gomul = h.kv.radgjafinn.nyjast.skrifad_at;
  h.kv.radgjafinn.nyjast.skrifad_at = new Date(Date.now() - 2 * 3600e3).toISOString();   // morgunskrifin voru fyrir 2 klst.
  const gomulBreytt = h.kv.radgjafinn.nyjast.skrifad_at;
  stub(h, { claude: () => ({ ok: false, status: 500, json: async () => ({ error: { message: 'bilað' } }) }) });
  await assert.rejects(R.skrifa({ kalladAf: 'morgun', nu: NU }), /Claude 500/);
  assert.ok(gomul);
  assert.equal(h.kv.radgjafinn.nyjast.skrifad_at, gomulBreytt, 'síðustu góðu skrifin standa');
  assert.equal(h.kv.radgjafinn.saga.length, 1, 'sagan stendur');
  assert.match(h.kv.radgjafinn.sidasta_villa.texti, /Claude 500: bilað/);
  assert.equal(h.runs.at(-1).status, 'error');
});

test('skrifa: prufa fer í sér lykla og snertir ekki það sem borðið sýnir', async () => {
  const h = heimur(); stub(h);
  await R.skrifa({ kalladAf: 'agnar', prufa: true, nu: NU });
  assert.ok(h.kv.radgjafinn_prufa.nyjast);
  assert.ok(h.kv.radgjafinn_gogn_prufa);
  assert.equal(h.kv.radgjafinn, undefined);
});

test('radgjafinn.cjs: GET skilar nýjasta; með HUB_STAFF_PASSWORD fæst 401 án innskráningar', async () => {
  const h = heimur(); h.hub = HUB(true); stub(h);
  await R.skrifa({ kalladAf: 'morgun', nu: NU });
  const G = require('../netlify/functions/radgjafinn.cjs');
  const r = await G.handler({ httpMethod: 'GET', queryStringParameters: {}, headers: kokur(hubToki('stub-leynd', 7, '2026-11-01')) });
  assert.equal(r.statusCode, 200);
  assert.equal(JSON.parse(r.body).nyjast.fyrirsogn, GOTT.fyrirsogn);
  assert.equal((await G.handler({ httpMethod: 'POST', headers: {} })).statusCode, 405);
  const slodir = ['../netlify/functions/radgjafinn.cjs', '../netlify/functions/_portal.cjs', '../netlify/functions/_radgjafinn-hlid.cjs',
    '../netlify/functions/hub-adgangar.cjs'].map((p) => require.resolve(p));
  const gomul = slodir.map((p) => require.cache[p]);
  slodir.forEach((p) => delete require.cache[p]);
  process.env.HUB_STAFF_PASSWORD = 'prof-lykilord';
  try {
    const kall = stub(h);
    const G2 = require('../netlify/functions/radgjafinn.cjs');
    assert.equal((await G2.handler({ httpMethod: 'GET', queryStringParameters: {}, headers: {} })).statusCode, 401);
    // Lokaða hliðið (#982, 15.11.2026) spyr notendaskrána (hub_adgangar*) hvort innskráning sé gild áður en það hafnar —
    // það er hliðið sjálft, ekki ráðgjafinn. Engin gögn ráðgjafans (app_kv, póstur, sölur …) mega lesast.
    assert.deepEqual(kall.filter((k) => !k.url.includes('/rest/v1/hub_adgangar')).map((k) => k.url), [], 'ekkert lesið úr ráðgjafanum án innskráningar');
  } finally {
    delete process.env.HUB_STAFF_PASSWORD;
    slodir.forEach((p, i) => { delete require.cache[p]; if (gomul[i]) require.cache[p] = gomul[i]; });
  }
});

// ── Hliðið (_radgjafinn-hlid.cjs): fallið er jafn lokað og appið ─────────────────────────────────────────────────────
const crypto = require('crypto');
const H = require('../netlify/functions/_radgjafinn-hlid.cjs');
const b64 = (buf) => Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
// Sama undirritun og signSession í hub-adgangar.cjs — prófið fer gegnum raunverulegan kóða hliðsins.
function hubToki(leynd, uid, v, gildirSek = 3600) {
  const nu = Math.floor(Date.now() / 1000);
  const payload = b64(JSON.stringify({ uid, nn: 'AG', v, iat: nu, exp: nu + gildirSek }));
  return payload + '.' + b64(crypto.createHmac('sha256', leynd).update(payload).digest());
}
const HUB = (krefjast) => ({ stilling: { id: 1, pw_hash: 'stub-hash', session_secret: 'stub-leynd', pw_changed_at: '2026-11-01', krefjast_slokk: krefjast, krefjast: false },
  user: { id: 7, virkur: true, notandanafn: 'AG', nafn: 'Agnar', rola: 'Admin' } });
const kokur = (t) => ({ cookie: 'annad=1; hub_user=' + encodeURIComponent(t) });
const G = () => require('../netlify/functions/radgjafinn.cjs');
const B = () => require('../netlify/functions/radgjafinn-background.cjs');
const M = () => require('../netlify/functions/radgjafinn-morgun.cjs');

test('hlið: kveikt innskráning → 401 án innskráningar, 401 með fölsuðum eða útrunnum tóka, 200 með gildri', async () => {
  const h = heimur(); h.hub = HUB(true); stub(h);
  await R.skrifa({ kalladAf: 'morgun', nu: NU });
  const sv = (headers) => G().handler({ httpMethod: 'GET', queryStringParameters: {}, headers });
  const an = await sv({});
  assert.equal(an.statusCode, 401); assert.equal(JSON.parse(an.body).need_login, true);
  assert.ok(!an.body.includes(GOTT.fyrirsogn), 'ekkert efni lekur í 401');
  assert.equal((await sv(kokur(hubToki('röng-leynd', 7, '2026-11-01')))).statusCode, 401, 'undirritað með rangri leynd');
  assert.equal((await sv(kokur(hubToki('stub-leynd', 7, '2026-10-01')))).statusCode, 401, 'lykilorði skipt síðan → ógilt');
  assert.equal((await sv(kokur(hubToki('stub-leynd', 7, '2026-11-01', -5)))).statusCode, 401, 'útrunninn');
  assert.equal((await sv(kokur(hubToki('stub-leynd', 99, '2026-11-01')))).statusCode, 401, 'notandi ekki til');
  const ok = await sv(kokur(hubToki('stub-leynd', 7, '2026-11-01')));
  assert.equal(ok.statusCode, 200); assert.equal(JSON.parse(ok.body).nyjast.fyrirsogn, GOTT.fyrirsogn);
});

test('hlið: rofinn opnar ekki — slökkt innskráning krefst samt stjórnanda; annað hlutverk 403; hliðið svarar ekki → 503', async () => {
  const h = heimur(); h.hub = HUB(false); stub(h);
  const sv = (headers) => G().handler({ httpMethod: 'GET', queryStringParameters: {}, headers });
  assert.equal((await sv({})).statusCode, 401, 'rofinn slökktur, engin innskráning → samt lokað');
  assert.equal((await sv(kokur(hubToki('stub-leynd', 7, '2026-11-01')))).statusCode, 200, 'stjórnandi kemst inn');
  h.hub.user.rola = 'Starfsmaður';
  const r403 = await sv(kokur(hubToki('stub-leynd', 7, '2026-11-01')));
  assert.equal(r403.statusCode, 403, 'starfsmaður sem velur „Agnar" á borðinu fær ekki gögnin');
  assert.ok(!/nyjast|fyrirsogn/.test(r403.body));
  h.hub.user.rola = 'Admin';
  h.hub = HUB(true); stub(h, { kasta: (t) => t === 'hub_adgangar_stilling' });
  const r = await G().handler({ httpMethod: 'GET', queryStringParameters: {}, headers: {} });
  assert.equal(r.statusCode, 503);
});

test('morguntóki: gildir í 10 mín., aðeins óbreyttur og aðeins með þjónustulyklinum', () => {
  const t0 = Date.parse('2026-11-16T06:45:10Z');
  const ev = (t) => ({ headers: { [H.MORGUN_HAUS]: t } });
  const t = H.morgunToki(t0);
  assert.ok(H.erMorgunKall(ev(t), t0));
  assert.ok(H.erMorgunKall(ev(t), t0 + 9 * 60000), '9 mín. síðar');
  assert.ok(!H.erMorgunKall(ev(t), t0 + 11 * 60000), '11 mín. síðar');
  assert.ok(!H.erMorgunKall(ev(H.morgunToki(t0 + 5 * 60000)), t0), 'úr framtíð');
  const [m, sig] = t.split('.');
  assert.ok(!H.erMorgunKall(ev(m + '.' + (sig[0] === 'a' ? 'b' : 'a') + sig.slice(1)), t0), 'breytt undirritun');
  assert.ok(!H.erMorgunKall(ev((Number(m) + 1) + '.' + sig), t0), 'önnur mínúta, sama undirritun');
  assert.ok(!H.erMorgunKall(ev(''), t0)); assert.ok(!H.erMorgunKall({}, t0)); assert.ok(!H.erMorgunKall(ev('x.y'), t0));
  const lykill = process.env.SUPABASE_SERVICE_ROLE_KEY;
  // Án lykils gæti hver sem er reiknað HMAC með tómum lykli — tóki sem er „rétt" undirritaður með '' má samt aldrei gilda.
  try { process.env.SUPABASE_SERVICE_ROLE_KEY = ''; assert.ok(!H.erMorgunKall(ev(H.morgunToki(t0)), t0), 'enginn lykill → aldrei'); }
  finally { process.env.SUPABASE_SERVICE_ROLE_KEY = lykill; }
});

test('background: ↻ án innskráningar skrifar ekkert; ↻ innskráður skrifar sem agnar; morgunkall skrifar sem morgun (aldrei prufa)', async () => {
  const h = heimur(); h.hub = HUB(true); let kall = stub(h);
  await B().handler({ httpMethod: 'POST', queryStringParameters: {}, headers: {} });
  assert.equal(kall.filter((k) => k.url.startsWith('https://api.anthropic.com/')).length, 0, 'ekkert Claude-kall án innskráningar');
  assert.equal(h.kv.radgjafinn, undefined);
  await B().handler({ httpMethod: 'POST', queryStringParameters: {}, headers: kokur(hubToki('stub-leynd', 7, '2026-11-01')) });
  assert.equal(h.kv.radgjafinn.nyjast.kallad_af, 'agnar');
  kall = stub(h);
  await B().handler({ httpMethod: 'POST', queryStringParameters: { prufa: '1' }, headers: { [H.MORGUN_HAUS]: H.morgunToki() } });
  assert.equal(h.kv.radgjafinn.nyjast.kallad_af, 'morgun', 'morgunkallið fer fram hjá 5 mín. biðinni og hliðinu');
  assert.equal(h.kv.radgjafinn_prufa, undefined, 'morgunkallið skrifar aldrei prufu');
});

test('radgjafinn-morgun: ræsir background með gildum tóka; bilun skráist í automation_runs og skilar 500', async () => {
  const h = heimur(); let sent = null;
  stub(h, { fall: (url, o) => { sent = { url, o }; return { ok: true, status: 202, json: async () => null, text: async () => '' }; } });
  const r = await M().handler({});
  assert.equal(r.statusCode, 200);
  assert.equal(sent.url, 'https://slokkvitaeki.netlify.app/.netlify/functions/radgjafinn-background');
  assert.equal(sent.o.method, 'POST');
  assert.ok(H.erMorgunKall({ headers: sent.o.headers }), 'tókinn sem fór stenst hliðið');
  stub(h, { fall: () => ({ ok: false, status: 500, json: async () => null, text: async () => '' }) });
  const r2 = await M().handler({});
  assert.equal(r2.statusCode, 500);
  assert.equal(h.runs.at(-1).status, 'error'); assert.match(h.runs.at(-1).detail, /fóru ekki af stað.*500/);
  stub(h, { fall: () => { throw new Error('stub-netvilla'); } });
  assert.equal((await M().handler({})).statusCode, 500);
  assert.match(h.runs.at(-1).detail, /stub-netvilla/);
});

// ── Kerfisrýni 15.11.2026: pósthólf, lén, persónugögn og lás ─────────────────────────────────────────────────────────
test('safna: aðeins pósthólf félaganna (eldklar.is, brunaholf.is) og netfang sem ENDAR á léni hópsins', async () => {
  const h = heimur();
  h.postar['heimaleiga.is'].push(
    post(30, 'x1', 'INBOX', 'stub-a@heimaleiga.is', 'Sigga', 'Í einkapósthólfi', 'einka', 1, { account: 'einka@gmail.com' }),
    post(31, 'x2', 'INBOX', 'heimaleiga.is.svik@gmail.com', 'Svik', 'Falskt lén', 'svik', 1),
    post(32, 'x3', 'INBOX', 'x@ekkiheimaleiga.is', 'Svik', 'Annað lén', 'svik', 1),
    post(33, 'x4', 'INBOX', 'stub-b@heimaleiga.is', 'Sigga', 'Úr Brunahólfs-hólfi', 'texti', 2, { account: 'stub@brunaholf.is' }),
    post(34, 'x5', 'INBOX', 'stub-d@post.heimaleiga.is', 'Sigga', 'Undirlén', 'texti', 2),
  );
  stub(h);
  const efni = (await R.safna({ nu: NU })).hopar.heimaleiga.postar.map((p) => p.efni);
  assert.ok(efni.includes('Úr Brunahólfs-hólfi'), 'brunaholf.is-hólfin með (þar er mest af póstinum)');
  assert.ok(efni.includes('Undirlén'), 'undirlén hópsins telst með');
  for (const ut of ['Í einkapósthólfi', 'Falskt lén', 'Annað lén']) assert.ok(!efni.includes(ut), ut);
  assert.ok(R.tilheyrir({ to_addresses: '"N" <a@heimaleiga.is>, b@annad.is' }, 'heimaleiga.is'));
  assert.ok(!R.tilheyrir({ sender_email: 'a@heimaleiga.is.x', to_addresses: '' }, 'heimaleiga.is'));
  assert.ok(!R.urPostholfi({ account: '' }) && !R.urPostholfi({ account: 'x@eldklar.is.annad.com' }));
});

test('safna: netföng, símanúmer, kennitölur og bankareikningar huldir áður en nokkuð fer til Claude', async () => {
  const h = heimur();
  h.postar['heimaleiga.is'].push(post(40, 'p1', 'INBOX', 'stub-a@heimaleiga.is', 'Sigga', 'Nýtt netfang: ny.adili@daemi.is',
    'Hringið í 555 1234 eða +354 699 1234, eða 8991234. Kt. 010203-3456 og 0102033456. Greiðið inn á 0133-26-012345.\nKv. sigga@daemi.is', 1));
  h.charlize = [{ fact: 'Tengiliður: anna@daemi.is, s. 699 4321', created_at: dag(3) }];
  h.forgangsmal = [{ id: 9, title: 'Hringja í 555 9876', summary: 'netfang: x@daemi.is', customer_nafn: 'Center Hotels', created_at: dag(6) }];
  const kall = stub(h);
  const f = await R.safna({ nu: NU });
  await R.kalla(f);
  const sent = kall.find((k) => k.url.startsWith('https://api.anthropic.com/')).body.messages[0].content;
  for (const leki of ['@', '555 1234', '699 1234', '8991234', '010203-3456', '0102033456', '0133-26-012345', '699 4321', '555 9876']) {
    assert.ok(!sent.includes(leki), 'lak til Claude: ' + leki);
  }
  for (const merki of ['[netfang]', '[sími]', '[kennitala]', '[bankareikningur]']) assert.ok(sent.includes(merki), merki);
});

test('hylja: öll algeng snið símanúmera, kennitalna, bankareikninga og netfanga eru hulin', () => {
  const snid = {
    '[sími]': ['555 1234', '+354 699 1234', '8991234', '8991234.', '8991234,', '699 12 34', '699.1234', '69 91 234', '699-1234', '+44 20 7946 0958'],
    '[kennitala]': ['010203-3456', '0102033456', '010203 3456'],
    '[bankareikningur]': ['0133-26-012345', '0133-26-12345', '133-26-012345', '0133 26 012345', 'IS14 0159 2600 7654 5510 7303 39'],
    '[netfang]': ['ny.adili@daemi.is', 'a@b.co.uk'],
  };
  for (const [merki, listi] of Object.entries(snid)) for (const t of listi) assert.equal(R.hylja('x ' + t + ' y'), 'x ' + merki + t.replace(/^.*?([.,]?)$/, '$1') + ' y', t);
});

test('hylja: upphæðir, dagsetningar og reikningsnúmer standa óbreytt (ekkert „[sími]" á peningum)', () => {
  for (const t of ['Reikningur R-001070 upp á 1.234.567 kr, 15.11.2026 kl. 10:30, 12 tæki, 2.500 kr/stk, póstnr. 220, 1234567 kr.',
    '5250000 kr', '5250000kr', '5250000 ISK', '5250000,50', '5250000.5', 'Reikningur 6012345', 'reikningur nr. 6012345', 'nr. 6012345', '#6012345', 'R-4001234',
    '2026-11-15', '1 234 567 kr', '12 000 000 kr', '08:00-16:00']) {
    assert.equal(R.hylja(t), t, t);
  }
});

test('stadfesta: texti sem fer á skjáinn er líka hulinn (vörn ef Claude afritar netfang eða símanúmer)', async () => {
  const h = heimur(); stub(h);
  const f = await R.safna({ nu: NU });
  const s = R.stadfesta({ ...GOTT, fyrirsogn: 'Hringdu í 555 1234 í dag', heimaleiga: { stada: 'Skrifaðu á a@b.is', frettir: [{ texti: 'Kt. 010203-3456 fylgdi', heimildir: ['H1'] }] } }, f);
  assert.equal(s.fyrirsogn, 'Hringdu í [sími] í dag');
  assert.equal(s.heimaleiga.stada, 'Skrifaðu á [netfang]');
  assert.equal(s.heimaleiga.frettir[0].texti, 'Kt. [kennitala] fylgdi');
});

test('lás: tvö samtímis ↻ gefa EITT Claude-kall', async () => {
  const h = heimur(); const kall = stub(h);
  const [a, b] = await Promise.all([R.skrifa({ kalladAf: 'agnar', nu: NU }), R.skrifa({ kalladAf: 'agnar', nu: NU })]);
  assert.equal(kall.filter((k) => k.url.startsWith('https://api.anthropic.com/')).length, 1);
  assert.equal([a, b].filter((x) => x.sleppt).length, 1);
});

test('lás: ↻ á meðan Claude bregst kallar ekki á Claude oftar en á 5 mín. fresti', async () => {
  const h = heimur();
  let kall = stub(h, { claude: () => ({ ok: false, status: 529, json: async () => ({ error: { message: 'overloaded' } }) }) });
  await assert.rejects(R.skrifa({ kalladAf: 'agnar', nu: NU }), /Claude 529/);
  const ut = await R.skrifa({ kalladAf: 'agnar', nu: NU });
  assert.match(ut.sleppt, /minna en 5 mín/);
  assert.equal(kall.filter((k) => k.url.startsWith('https://api.anthropic.com/')).length, 1);
});

test('lás: útrunninn lás (fall dó í miðju kalli) er tekinn yfir; virkur lás stöðvar líka morgunskrifin', async () => {
  const h = heimur(); stub(h);
  const fyrir = (min) => new Date(Date.now() - min * 60000).toISOString();
  h.kv.radgjafinn_las = { fra: fyrir(20), til: fyrir(10), kallad_af: 'agnar' };
  assert.ok((await R.skrifa({ kalladAf: 'agnar', nu: NU })).skrifad_at, 'útrunninn lás tekinn yfir');
  h.kv.radgjafinn_las = { fra: fyrir(1), til: new Date(Date.now() + 5 * 60000).toISOString(), kallad_af: 'agnar' };
  assert.match((await R.skrifa({ kalladAf: 'morgun', nu: NU })).sleppt, /önnur keyrsla er í gangi/);
});

test('lestrarvilla stöðvar skrifin: síðustu góðu skrifin og sagan standa, ekkert Claude-kall, villan skráð', async () => {
  const h = heimur(); stub(h);
  await R.skrifa({ kalladAf: 'agnar', nu: NU });
  const adur = JSON.stringify(h.kv.radgjafinn);
  h.kv.radgjafinn_las.fra = new Date(Date.now() - 10 * 60000).toISOString();   // 5 mín. biðin liðin
  const kall = stub(h, { bila: (t, m) => t === 'app_kv' && m === 'GET' });
  await assert.rejects(R.skrifa({ kalladAf: 'agnar', nu: NU }), /app_kv/);
  assert.equal(JSON.stringify(h.kv.radgjafinn), adur);
  assert.equal(kall.filter((k) => k.url.startsWith('https://api.anthropic.com/')).length, 0);
  assert.match(h.runs.at(-1).detail, /Las ekki fyrri skrif/);
});

// ── Ráðningin 15.11.2026: allur reksturinn, markmiðið (2× tekjur), top 10 og 2 mánaða planið ──────────────────────────
const PLAN = { utgafa: 1, samthykkt: false, timabil: { fra: '2026-11-16', til: '2027-01-15' },
  grunnlina: { samtals_a_manudi: 600000, maelt: '2026-11-15', markmid_fyrir: '2027-11' },
  atridi: [{ id: 'A1', titill: 'Gera hagnað mælanlegan', eigandi: 'bokari', maelikvardi: 'hagnaður á mánuði', markmid_vikur: 'v2: laun' },
    { id: 'A2', titill: 'Bóka gleymdar skoðanir', eigandi: 'spider-man', maelikvardi: 'skoðun gleymd', markmid_vikur: 'v4: −40' }] };
function heimurTekjur() {
  const h = heimur();
  const F = 'final';
  h.tekjur_sl = [
    { status: F, upphaed_an_vsk: 100000, created_at: '2026-10-05T10:00:00Z' }, { status: F, upphaed_an_vsk: -20000, created_at: '2026-10-07T10:00:00Z', credit_of: 1 },
    { status: F, upphaed_an_vsk: 50000, created_at: '2026-09-10T10:00:00Z' }, { status: F, upphaed_an_vsk: 70000, created_at: '2026-08-10T10:00:00Z' },
    { status: F, upphaed_an_vsk: 999, created_at: '2026-11-02T10:00:00Z' },
    // kreditnóta á BAKFÆRÐA sölu (777) telst ekki — upprunasalan er þegar úti (lota 4, 17.11.2026)
    { status: F, upphaed_an_vsk: -5000, created_at: '2026-10-08T10:00:00Z', credit_of: 777 },
  ];
  h.void_sl = [{ id: 777 }];
  h.tekjur_bh = [
    // útgefinn 31.10 með gjalddaga í nóvember → OKTÓBERTEKJA (útgáfudagur ræður, ekki gjalddagi)
    { hofudstoll: 1000000, gjalddagi: '2026-11-09', utgafudagur: '2026-10-31' }, { hofudstoll: 500000, gjalddagi: '2026-09-01' },
    { hofudstoll: 300000, gjalddagi: '2026-08-01' }, { hofudstoll: 200000, gjalddagi: '2026-04-01' },
  ];
  h.kv.radgjafinn_aaetlun = JSON.parse(JSON.stringify(PLAN));
  h.runs_villur = [
    { job_name: 'arnold-vaktin', status: 'error', started_at: dag(0.2), detail: 'hámarki snúninga náð' },
    { job_name: 'payday-sync', status: 'error', started_at: dag(0.3), detail: 'Payday 500' },
    { job_name: 'arnold-vaktin', status: 'error', started_at: dag(0.5), detail: 'hámarki snúninga náð' },
  ];
  // v_krafa_ogreidd flokkar sjálf (16.11.2026): R-3 kreditfærð, R-4 á bið (⏸), R-5 CANCELLED í Payday.
  h.ogreidd = [{ id: 501, samtals: 100000, dagar: 90, flokkur: 'innheimta' }, { id: 502, samtals: 20000, dagar: 10, flokkur: 'innheimta' },
    { id: 503, samtals: 999000, dagar: 80, flokkur: 'kreditfaert' }, { id: 504, samtals: 300000, dagar: 70, flokkur: 'a_bid' },
    { id: 505, samtals: 40000, dagar: 65, flokkur: 'payday_fellt' }];
  h.adgerd = [{ num: 'R-9', samtals: 23668 }];
  h.uttektarplan = [{ stada: 'utrunnid' }, { stada: 'utrunnid' }, { stada: 'thessi_manudur' }, { stada: 'framundan' }];
  return h;
}

test('tekjur: kreditnótur dregnar frá, síðustu 3 HEILU mánuðir, markmið = 2× grunnlína planins, líðandi mánuður utan meðaltals', async () => {
  const h = heimurTekjur(); stub(h);
  const f = await R.safna({ nu: NU });
  const m = f.markmid;
  assert.equal(m.id, 'M');
  assert.deepEqual(m.sidustu3.manudir, ['2026-08', '2026-09', '2026-10']);
  assert.equal(m.sidustu3.slokkvitaeki, 70000 + 50000 + 100000 - 20000, 'kreditnóta (neikvæð) dregin frá');
  assert.equal(m.sidustu3.brunaholf, 1800000);
  assert.equal(m.sidustu3.a_manudi, Math.round(2000000 / 3));
  assert.equal(m.markmid_a_manudi, 1200000);
  assert.equal(m.hlutfall_af_markmidi, Math.round((100 * Math.round(2000000 / 3)) / 1200000));
  const nov = m.manudir.find((x) => x.man === '2026-11');
  assert.equal(nov.hluti_manadar, true); assert.equal(nov.slokkvitaeki, 999);
  assert.equal(m.hagnadur, null, 'hagnaður er ómældur — null, aldrei 0');
  assert.match(m.skilgreining, /útgáfudegi/); assert.doesNotMatch(m.skilgreining, /gjalddaga/);
});

test('tekjur: mánuðir fyrir yfirtöku (05.2026) eru ÓMÆLDIR hjá Slökkvitæki — null, ekki 0, og ekki í meðaltali; ekkert plan → ekkert markmið', async () => {
  const h = heimurTekjur(); delete h.kv.radgjafinn_aaetlun; stub(h);
  const m = await R.tekjur(new Date('2026-07-16T06:45:00Z'), null);
  const apr = m.manudir.find((x) => x.man === '2026-04');
  assert.equal(apr.slokkvitaeki, null); assert.equal(apr.samtals, null); assert.equal(apr.brunaholf, 200000);
  assert.deepEqual(m.sidustu3.manudir, ['2026-05', '2026-06']);
  assert.equal(m.markmid_a_manudi, null, 'án grunnlínu er ekkert markmið reiknað');
  assert.equal(m.hlutfall_af_markmidi, null);
});

test('tekjur: tómur lestur er ÓMÆLDUR, ekki 0 — Brunahólf null þegar invoices skilar engu (aðgangsregla), ekkert markmiðshlutfall', async () => {
  const h = heimurTekjur(); h.tekjur_bh = []; stub(h);
  const m = await R.tekjur(new Date(NU), h.kv.radgjafinn_aaetlun);
  assert.ok(m.manudir.length && m.manudir.every((x) => x.brunaholf === null && x.samtals === null), 'Brunahólf og samtala null, aldrei 0');
  assert.ok(m.manudir.some((x) => x.slokkvitaeki > 0), 'Slökkvitæki mælist áfram');
  assert.deepEqual(m.sidustu3.manudir, []); assert.equal(m.sidustu3.a_manudi, null); assert.equal(m.hlutfall_af_markmidi, null);
});

test('safna: allur reksturinn — peningalínur (combo-yfirlit), sjálfvirkni sem brást, úttektarplan, planið; ómælt skráð, ekki 0', async () => {
  const h = heimurTekjur(); stub(h);
  const f = await R.safna({ nu: NU });
  assert.deepEqual(f.omaelt, []);
  assert.ok(f.peningar.length > 5 && f.peningar.every((p) => /^P\d+$/.test(p.id)));
  assert.ok(f.peningar.filter((p) => p.lykill !== 'krafa-ekki-send').every((p) => p.merki === 'OMAELT' && p.tala == null && p.kr == null), 'stub svarar ekki sýnunum → ÓMÆLT, aldrei 0');
  assert.deepEqual(f.kerfi.map((k) => [k.id, k.starf, k.villur]), [['K1', 'arnold-vaktin', 2], ['K2', 'payday-sync', 1]]);
  assert.deepEqual(f.taekifaeri.uttektir, { id: 'T1', utrunnid: 2, thessi_manudur: 1, framundan: 1, engin_dags: 0 });
  assert.deepEqual(f.aaetlun.atridi.map((x) => x.id), ['A1', 'A2']);
  assert.equal(f.aaetlun.samthykkt, false);
  // Mæling 15.11.2026: kreditfærð (credit_of) og CANCELLED í Payday út; á bið (⏸) sér — ekki innheimtumál.
  assert.equal(f.ogreitt.fjoldi, 2); assert.equal(f.ogreitt.kr, 120000); assert.equal(f.ogreitt.eldri_en_60_fjoldi, 1);
  assert.equal(f.ogreitt.a_bid_fjoldi, 1); assert.equal(f.ogreitt.a_bid_kr, 300000);
  assert.equal(f.ogreitt.kreditfaert_utilokad_fjoldi, 2, 'R-3 kreditfærð + R-5 CANCELLED í Payday');
  assert.equal(f.peningar.find((p) => p.lykill === 'kredit-an-endurgerdar'), undefined, 'ótraust lína fer ekki til Tonys');
  const kes = f.peningar.find((p) => p.lykill === 'krafa-ekki-send'); assert.equal(kes.tala, 1); assert.equal(kes.kr, 23668);
});

test('stadfesta: plan_stada — aðeins atriði planins, eitt á atriði, gild staða og gild heimild', async () => {
  const h = heimurTekjur(); stub(h);
  const f = await R.safna({ nu: NU });
  const s = R.stadfesta({ ...GOTT, plan_stada: [
    { id: 'A1', stada: 'á eftir', texti: 'Laun eru ekki komin í kerfið.', heimildir: ['M'] },
    { id: 'A1', stada: 'lokið', texti: 'tvítak', heimildir: ['M'] },
    { id: 'A9', stada: 'lokið', texti: 'ekki í planinu', heimildir: ['M'] },
    { id: 'A2', stada: 'kannski', texti: 'ógild staða', heimildir: ['T1'] },
    { id: 'A2', stada: 'á áætlun', texti: 'án gildrar heimildar', heimildir: ['X1'] },
  ] }, f);
  assert.deepEqual(s.plan_stada, [{ id: 'A1', stada: 'á eftir', texti: 'Laun eru ekki komin í kerfið.', heimildir: ['M'] }]);
  assert.equal(s.hent, 7 + 4);
  const ekkert = R.stadfesta({ ...GOTT, plan_stada: [{ id: 'A1', stada: 'lokið', texti: 'x', heimildir: ['M'] }] }, { ...f, aaetlun: null });
  assert.deepEqual(ekkert.plan_stada, [], 'ekkert plan → engin staða');
});

test('skrifa: markmiðsröndin og planið koma úr gögnunum (ekki texta Claude) og fara á skjáinn', async () => {
  const h = heimurTekjur(); stub(h);
  const rec = await R.skrifa({ kalladAf: 'agnar', nu: NU });
  assert.equal(rec.markmid.markmid_a_manudi, 1200000);
  assert.equal(rec.markmid.hagnadur, null);
  assert.deepEqual(rec.aaetlun.atridi.map((x) => x.id), ['A1', 'A2']);
  assert.ok(Array.isArray(rec.plan_stada));
  assert.equal(h.kv.radgjafinn.nyjast.markmid.sidustu3.samtals, 2000000);
});

test('SKEMA og KERFI: top 10 og plan_stada eru í sniðinu og reglunum; flokkarnir eru fimm', () => {
  assert.equal(R.MAX_RAD, 10);
  assert.ok(R.SKEMA.required.includes('plan_stada'));
  assert.deepEqual(R.SKEMA.properties.rad.items.properties.flokkur.enum, R.FLOKKAR_RADA);
  assert.match(R.KERFI, /MEST 10/); assert.match(R.KERFI, /tvöfalda tekjur og þrefalda hagnað/); assert.doesNotMatch(R.KERFI, /1 til 3/);
});

test('ákvarðanir Agnars (D1 …) koma úr Afgreiðslunni og reglurnar þrjár standa í KERFI (Agnar 15.11.2026)', async () => {
  const h = heimurTekjur();
  h.akvardanir = [{ titill: 'Kredit og nýr reikningur fyrir 1.000 kr vanrukkun', stada: 'ekki_thess_virdi', astaeda: 'Ekki þess virði', framkvaemt_at: dag(1), updated_at: dag(1) }];
  stub(h);
  const f = await R.safna({ nu: NU });
  assert.deepEqual(f.akvardanir.map((d) => [d.id, d.akvordun]), [['D1', 'ekki þess virði']]);
  assert.match(R.KERFI, /AÐEINS NÝJASTA SKEYTIÐ/); assert.match(R.KERFI, /ÁKVÖRÐUN STENDUR/); assert.match(R.KERFI, /ÞESS VIRÐI/);
  const s = R.stadfesta({ ...GOTT, rad: [{ flokkur: 'umbót', titill: 'Virða ákvörðun', af_hverju: 'x', fyrsta_skref: 'y', heimildir: ['D1'] }] }, f);
  assert.deepEqual(s.rad[0].heimildir, ['D1'], 'D-auðkenni eru gildar heimildir');
});

test('stadfesta: peningaráð þarf mælda heimild og hálfvissa er hent (Agnar 15.11.2026: „allt sé rannsakað vel")', async () => {
  const h = heimurTekjur(); stub(h);
  const f = await R.safna({ nu: NU });
  const s = R.stadfesta({ ...GOTT, rad: [
    { flokkur: 'peningar', titill: 'Rukka verk', af_hverju: 'Samþykkt verk virðist órukkað.', fyrsta_skref: 'x', heimildir: ['O'] },
    { flokkur: 'peningar', titill: 'Rukka verk B', af_hverju: 'Samþykkt 1,2 m.', fyrsta_skref: 'x', heimildir: ['HK1'] },
    { flokkur: 'peningar', titill: 'Innheimta gamlar kröfur', af_hverju: '1 krafa eldri en 60 daga.', fyrsta_skref: 'x', heimildir: ['O'] },
    { flokkur: 'tækifæri', titill: 'Svara Jónu', af_hverju: 'Spyr um skýrslur.', fyrsta_skref: 'x', heimildir: ['C1'] },
  ] }, f);
  assert.deepEqual(s.rad.map((x) => x.titill), ['Innheimta gamlar kröfur', 'Svara Jónu'], 'hálfvissa og peningaráð án mældrar heimildar fara út');
});
