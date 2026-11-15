// Próf: Ráðgjafinn (netlify/functions/_radgjafinn.cjs) — söfnun úr pósti/reikningum, kallið á Claude, vörðurinn sem hendir
// atriðum án heimildar, skrifin/minnið og starfsmanna-hliðið. Stub-fetch fyrir Supabase og Claude — ekkert lifandi snert.
// Keyrsla: node --test test/
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
const post = (id, msg, folder, fra, nafn, efni, texti, dagar) => ({ id, message_id: msg, folder, sender_email: fra, sender_name: nafn, subject: efni, body_preview: texti, snippet: '', received_at: dag(dagar) });

function heimur() {
  return {
    postar: {
      'heimaleiga.is': [
        post(1, 'm1', 'INBOX', 'stub-a@heimaleiga.is', 'Dimka', 'Skoðun Midtown', 'Getið þið komið á þriðjudag?\n\nOn Mon, 10 Nov 2026 Agnar wrote:\n> gamall texti', 1),
        post(2, 'm1', 'INBOX', 'stub-a@heimaleiga.is', 'Dimka', 'Skoðun Midtown', 'tvítak sama message_id', 1),
        post(3, 'm2', 'SENT', 'okkar@slokkvitaeki.is', 'Agnar', 'Re: Reikningur', 'Sendum leiðréttan reikning í dag.', 3),
        post(4, 'm3', 'INBOX', 'stub-b@heimaleiga.is', '', 'Ný eign', 'Bætist við í desember.', 20),
      ],
      'centerhotels.com': [
        post(10, 'c1', 'INBOX', 'stub-c@centerhotels.com', 'Melissa', 'Skýrslur', 'Hvenær koma skýrslurnar?', 2),
        ...[1, 2, 3, 4, 5, 6, 7].map((i) => post(10 + i, 'c' + (i + 1), 'SENT', 'okkar@slokkvitaeki.is', 'Agnar', 'Eldra ' + i, 'texti ' + i, 20 + i)),
      ],
    },
    base: { heimaleiga: [{ id: 101 }, { id: 102 }], center: [{ id: 146 }] },
    solur: [
      { id: 1, customer_nafn: 'Midtown', samtals: 50000, created_at: dag(40), krafa_sent_at: dag(38), paid_at: null, status: 'lokid', is_credit: false, hidden: false },
      { id: 2, customer_nafn: 'Máni', samtals: 30000, created_at: dag(10), krafa_sent_at: null, dk_invoice_id: 'D9', paid_at: null, status: 'lokid', is_credit: false, hidden: false },
      { id: 3, customer_nafn: 'Ógilt', samtals: 999999, created_at: dag(5), krafa_sent_at: dag(5), paid_at: null, status: 'void', is_credit: false, hidden: false },
      { id: 4, customer_nafn: 'Kredit', samtals: -20000, created_at: dag(5), krafa_sent_at: dag(5), paid_at: null, status: 'lokid', is_credit: true, hidden: false },
      { id: 5, customer_nafn: 'Ósent', samtals: 70000, created_at: dag(5), krafa_sent_at: null, paid_at: null, status: 'lokid', is_credit: false, hidden: false },
      { id: 6, customer_nafn: 'Greitt', samtals: 40000, created_at: dag(20), krafa_sent_at: dag(19), paid_at: dag(4), status: 'lokid', is_credit: false, hidden: false },
    ],
    charlize: [{ fact: 'Heimaleiga fékk sérkjör 30.10.2026', created_at: dag(16) }],
    forgangsmal: [{ id: 9, title: 'Center: reikningar á bið', summary: '1.206.646 kr bíða', customer_nafn: 'Center Hotels', created_at: dag(6) }],
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
    const u = new URL(url), tafla = u.pathname.replace('/rest/v1/', ''), q = u.searchParams;
    if (opt.bila && opt.bila(tafla, method)) return svar({ message: 'stub-bilun' }, 500);
    if (tafla === 'app_kv' && method === 'POST') { h.kv[body.key] = body.value; return svar(null); }
    if (tafla === 'app_kv') { const k = q.get('key').replace('eq.', ''); return svar(h.kv[k] ? [{ value: h.kv[k] }] : []); }
    if (tafla === 'automation_runs') { (h.runs = h.runs || []).push(body); return svar(null); }
    if (tafla === 'email_digest') {
      const len = Object.keys(h.postar).find((d) => q.get('or').includes(d));
      const fra = q.get('received_at').replace('gte.', '');
      return svar(h.postar[len].filter((p) => p.received_at >= fra).sort((a, b) => b.received_at.localeCompare(a.received_at)));
    }
    if (tafla === 'customers_base') return svar(q.get('rekstrarfelag') ? h.base.heimaleiga : h.base.center);
    if (tafla === 'solur' && q.get('customer_base_id')) return svar(q.get('customer_base_id').includes('101') ? h.solur : []);
    if (tafla === 'solur') return svar(h.greitt_sl);
    if (tafla === 'invoices') return svar(h.greitt_bh);
    if (tafla === 'v_charlize_active') return svar(q.get('fact').includes('heimaleig') ? h.charlize : []);
    if (tafla === 'thjonustubeidni') return svar(h.forgangsmal);
    throw new Error('óþekkt slóð ' + tafla);
  };
  return kall;
}

const GOTT = {
  fyrirsogn: 'Svaraðu Center um skýrslurnar og innheimtu Midtown.',
  heimaleiga: { stada: 'Dimka bíður svars um skoðun.', frettir: [
    { texti: 'Dimka vill skoðun á Midtown á þriðjudag.', heimildir: ['H1'] },
    { texti: 'Uppspunnin frétt án heimildar.', heimildir: ['H99'] },
    { texti: 'Leiðréttur reikningur sendur.', heimildir: ['H2', 'HR'] },
  ] },
  center: { stada: 'Melissa spyr um skýrslur.', frettir: [{ texti: 'Melissa spyr hvenær skýrslurnar koma.', heimildir: ['C1'] }] },
  rad: [
    { titill: 'Svara Melissu', af_hverju: 'Samband og reikningar á bið.', fyrsta_skref: 'Senda dagsetningu.', heimildir: ['C1', 'F1'] },
    { titill: 'Innheimta Midtown', af_hverju: '50.000 kr 38 daga.', fyrsta_skref: 'Hringja.', heimildir: ['HR'] },
    { titill: 'Ráð án heimildar', af_hverju: 'x', fyrsta_skref: 'y', heimildir: [] },
    { titill: 'Fjórða ráðið', af_hverju: 'x', fyrsta_skref: 'y', heimildir: ['G'] },
    { titill: 'Fimmta ráðið', af_hverju: 'x', fyrsta_skref: 'y', heimildir: ['G'] },
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

test('safna: reikningastaða hópsins með sömu skilgreiningu og 489 (sent, ógreitt, ekki ógilt/kredit/falið)', async () => {
  const h = heimur(); stub(h);
  const r = (await R.safna({ nu: NU })).hopar.heimaleiga.reikningar;
  assert.equal(r.id, 'HR');
  assert.equal(r.ogreitt_fjoldi, 2, 'Midtown (krafa send) + Máni (dk_invoice_id); ógilt, kredit, ósent og greitt utan');
  assert.equal(r.ogreitt_kr, 80000);
  assert.equal(r.ogreitt_elsta_dagar, 38);
  assert.deepEqual(r.ogreitt_staerstu.map((x) => x.nafn), ['Midtown', 'Máni']);
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

test('stadfesta: atriðum án gildrar heimildar hent, ókunn auðkenni síuð, mest 4 fréttir og 3 ráð', async () => {
  const h = heimur(); stub(h);
  const f = await R.safna({ nu: NU });
  const s = R.stadfesta(GOTT, f);
  assert.deepEqual(s.heimaleiga.frettir.map((x) => x.texti), ['Dimka vill skoðun á Midtown á þriðjudag.', 'Leiðréttur reikningur sendur.']);
  assert.deepEqual(s.rad.map((x) => x.titill), ['Svara Melissu', 'Innheimta Midtown', 'Fjórða ráðið']);
  assert.equal(s.hent, 3, 'frétt H99 + ráð án heimildar + fimmta ráðið');
  assert.deepEqual(s.rad[0].heimildir, ['C1', 'F1']);
  assert.deepEqual(Object.keys(s.postar).sort(), ['C1', 'H1', 'H2'], 'aðeins póstar sem eru notaðir');
  assert.equal(s.postar.H1.efni, 'Skoðun Midtown'); assert.equal(s.postar.H1.dags, NU.toISOString().slice(0, 10).replace(/\d\d$/, (d) => String(d - 1).padStart(2, '0')));
});

test('skrifa: vistar nýjasta + sögu + staðreyndir og skráir í automation_runs', async () => {
  const h = heimur(); stub(h);
  const rec = await R.skrifa({ kalladAf: 'morgun', nu: NU });
  assert.equal(rec.rad.length, 3);
  assert.equal(h.kv.radgjafinn.nyjast.fyrirsogn, GOTT.fyrirsogn);
  assert.equal(h.kv.radgjafinn.saga.length, 1);
  assert.equal(h.kv.radgjafinn.sidasta_villa, null);
  assert.ok(h.kv.radgjafinn_gogn.stadreyndir.hopar.heimaleiga, 'staðreyndirnar geymdar sér');
  assert.equal(h.kv.radgjafinn.nyjast.stadreyndir, undefined, 'staðreyndirnar fara ekki á skjáinn');
  assert.equal(h.runs[0].job_name, 'radgjafinn'); assert.equal(h.runs[0].status, 'ok');
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
  assert.ok(m.skrifad_at);
});

test('skrifa: bilun heldur síðustu góðu skrifunum, skráir villuna og kastar', async () => {
  const h = heimur(); stub(h);
  await R.skrifa({ kalladAf: 'morgun', nu: NU });
  const gomul = h.kv.radgjafinn.nyjast.skrifad_at;
  stub(h, { claude: () => ({ ok: false, status: 500, json: async () => ({ error: { message: 'bilað' } }) }) });
  await assert.rejects(R.skrifa({ kalladAf: 'morgun', nu: NU }), /Claude 500/);
  assert.equal(h.kv.radgjafinn.nyjast.skrifad_at, gomul, 'síðustu góðu skrifin standa');
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
  const h = heimur(); stub(h);
  await R.skrifa({ kalladAf: 'morgun', nu: NU });
  const G = require('../netlify/functions/radgjafinn.cjs');
  const r = await G.handler({ httpMethod: 'GET', queryStringParameters: {}, headers: {} });
  assert.equal(r.statusCode, 200);
  assert.equal(JSON.parse(r.body).nyjast.fyrirsogn, GOTT.fyrirsogn);
  assert.equal((await G.handler({ httpMethod: 'POST', headers: {} })).statusCode, 405);
  const slodir = ['../netlify/functions/radgjafinn.cjs', '../netlify/functions/_portal.cjs'].map((p) => require.resolve(p));
  const gomul = slodir.map((p) => require.cache[p]);
  slodir.forEach((p) => delete require.cache[p]);
  process.env.HUB_STAFF_PASSWORD = 'prof-lykilord';
  try {
    const kall = stub(h);
    const G2 = require('../netlify/functions/radgjafinn.cjs');
    assert.equal((await G2.handler({ httpMethod: 'GET', queryStringParameters: {}, headers: {} })).statusCode, 401);
    assert.equal(kall.length, 0, 'ekkert lesið án innskráningar');
  } finally {
    delete process.env.HUB_STAFF_PASSWORD;
    slodir.forEach((p, i) => { delete require.cache[p]; if (gomul[i]) require.cache[p] = gomul[i]; });
  }
});
