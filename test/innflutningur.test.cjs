// Próf: Innflutningur (Birgðir → Innflutningur, 16.11.2026) — útreikningurinn (_innflutningur-reikna.cjs) og fallið
// (innflutningur.cjs): hliðið, vistun, forskoðun, færsla á vörur og afturköllun. Stub-fetch með gervigagnagrunni;
// ekkert lifandi snert. Keyrsla: node --test test/innflutningur.test.cjs
'use strict';
process.env.SUPABASE_URL = 'http://stub.invalid';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'stub';
delete process.env.HUB_STAFF_PASSWORD;
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const R = require('../netlify/functions/_innflutningur-reikna.cjs');
const F = require('../netlify/functions/innflutningur.cjs');

// Tilbúin sending (repóið er opinbert: engin raunveruleg innkaupsverð). Reiknað í höndunum:
//   erlent 100×20 + 50×40 + 200×5 = 5.000 €; greitt 700.000 kr (gengi 140); kostnaður 140.000 + 10.000 + 0 = 150.000
//   A: 280.000 + 60.000 = 340.000 / 100 = 3.400 · B: 340.000 / 50 = 6.800 · C: 140.000 + 30.000 = 170.000 / 200 = 850
const TE = () => ({
  tilvisun: 'PROF-1', birgir: 'Birgir A', mynt: 'EUR', gengi: 140, vorur_isk: 700000, skipting: 'verd',
  linur: [
    { vara_id: 1, heiti: 'Vara A', magn: 100, einingaverd: 20 },
    { vara_id: 2, heiti: 'Vara B', magn: 50, einingaverd: 40 },
    { vara_id: 3, heiti: 'Vara C', magn: 200, einingaverd: 5 },
  ],
  kostnadur: [
    { heiti: 'Flutningur', upphaed: 140000, tegund: 'kostnadur' },
    { heiti: 'Úrvinnslugjald', upphaed: 10000, tegund: 'kostnadur' },
    { heiti: 'Tollur', upphaed: 0, tegund: 'kostnadur' },
    { heiti: 'Innanlandsgjöld', upphaed: null, tegund: 'kostnadur' },
    { heiti: 'VSK við innflutning', upphaed: 200000, tegund: 'innskattur' },
    { heiti: 'Vátrygging', upphaed: 7000, tegund: 'ekki' },
  ],
});
const VORUR = () => [
  { id: 1, nafn: 'Vara A', flokkur: 'Slökkvitæki', birgdir: 150, kostnadarverd: null },
  { id: 2, nafn: 'Vara B', flokkur: 'Slökkvitæki', birgdir: 40, kostnadarverd: null },
  { id: 3, nafn: 'Vara C', flokkur: 'Slökkvitæki', birgdir: 400, kostnadarverd: 1000 },
  { id: 90, nafn: 'Ársskoðun', flokkur: 'Þjónusta', birgdir: null, kostnadarverd: null },
];

// ── Útreikningurinn ──────────────────────────────────────────────────────────────────────────────────────────────

test('tala: íslensk innsláttarsnið', () => {
  assert.equal(R.tala('2.270.919'), 2270919);
  assert.equal(R.tala('2.270.919 kr'), 2270919);
  assert.equal(R.tala('491923'), 491923);
  assert.equal(R.tala('491.923'), 491923, 'þrír stafir á eftir punkti = þúsundaskil');
  assert.equal(R.tala('21,60'), 21.6);
  assert.equal(R.tala('1.234,5'), 1234.5);
  assert.equal(R.tala('144,2'), 144.2);
  assert.equal(R.tala('21.6'), 21.6, 'eldri gögn með punkti sem aukastaf');
  assert.equal(R.tala(21.6), 21.6);
  assert.equal(R.tala(''), null);
  assert.equal(R.tala(null), null);
  assert.equal(R.tala('abc'), null);
});

test('reikna: tilbúna sendingin gefur handreiknuðu tölurnar, upp á krónu', () => {
  const r = R.reikna(TE());
  assert.equal(r.heild, 850000);
  assert.equal(r.kostnadur_alls, 150000);
  assert.equal(r.innskattur, 200000, 'VSK við innflutning er innskattur, ekki kostnaður');
  assert.equal(r.magn, 350);
  assert.equal(r.gengi, 140, 'gengið sem greiðslan gefur');
  assert.deepEqual(r.linur.map((l) => Math.round(l.kostnadarverd)), [3400, 6800, 850]);
  // Línurnar summast í greiðsluna + kostnaðinn — ekkert týnist í skiptingunni.
  assert.equal(Math.round(r.linur.reduce((a, l) => a + l.samtals, 0)), 850000);
  assert.deepEqual(r.omaeldir, ['Innanlandsgjöld']);
  assert.ok(r.vantar.includes('Ómælt: Innanlandsgjöld'));
});

test('reikna: ómældur liður er gat, ekki 0 — og „ekki"-liður er aldrei talinn', () => {
  const s = TE();
  const an = R.reikna(s);
  s.kostnadur[3].upphaed = 40000;
  const med = R.reikna(s);
  assert.equal(med.kostnadur_alls - an.kostnadur_alls, 40000);
  assert.deepEqual(med.omaeldir, []);
  s.kostnadur[5].upphaed = 999999;
  assert.equal(R.reikna(s).kostnadur_alls, med.kostnadur_alls, 'vátrygging (ekki) hefur engin áhrif');
});

test('reikna: skipting eftir fjölda, og fjöldi þegar ekkert verð er skráð', () => {
  const s = TE();
  s.skipting = 'fjoldi';
  const r = R.reikna(s);
  const alagStk = 150000 / 350;
  r.linur.forEach((l) => assert.ok(Math.abs(l.alag / l.magn - alagStk) < 1e-6));
  const t = { gengi: 0, linur: [{ vara_id: 1, magn: 2, einingaverd: 0 }, { vara_id: 2, magn: 2, einingaverd: 0 }], kostnadur: [{ heiti: 'F', upphaed: 100 }] };
  const rt = R.reikna(t);
  assert.equal(rt.skipting, 'fjoldi');
  assert.deepEqual(rt.linur.map((l) => l.alag), [50, 50], 'kostnaðurinn týnist ekki þó verð vanti');
});

test('reikna: án greiddrar upphæðar er gengið notað; vantar segir frá tómum línum', () => {
  const s = TE();
  s.vorur_isk = null;
  s.gengi = 150;
  assert.equal(R.reikna(s).vorur_isk, 5000 * 150);
  const t = R.reikna({ linur: [{ heiti: 'X', magn: null, einingaverd: 5 }], kostnadur: [] });
  assert.ok(t.vantar.some((v) => /ekki tengd vöru/.test(v)));
  assert.ok(t.vantar.some((v) => /magn vantar/.test(v)));
  assert.ok(R.reikna({}).vantar.includes('Engar vörulínur'));
});

test('hreinsa: aðeins þekktir reitir, takmörk, óþekkt tegund verður kostnaður', () => {
  const h = R.hreinsa({ tilvisun: '  ', stada: 'faert', faersla: { x: 1 }, skipting: 'rugl', dags: '30.07.2026',
    linur: [{ vara_id: '12', magn: '180', einingaverd: '10,30', hack: 1 }, { vara_id: -3 }], kostnadur: [{ heiti: 'F', upphaed: '1.000', tegund: 'rugl' }] });
  assert.equal(h.tilvisun, 'Ný sending');
  assert.equal(h.skipting, 'verd');
  assert.equal(h.dags, null, 'aðeins ISO-dagsetning');
  assert.ok(!('stada' in h) && !('faersla' in h), 'staða og færsla koma aldrei úr vafranum');
  assert.deepEqual(h.linur[0], { vara_id: 12, heiti: null, magn: 180, einingaverd: 10.3 });
  assert.equal(h.linur[1].vara_id, null);
  assert.deepEqual(h.kostnadur[0], { heiti: 'F', upphaed: 1000, tegund: 'kostnadur' });
});

test('medalverd: eldri stykki = lager − sending nema henni sé bætt við', () => {
  // Vara C: 400 á lager telja sendinguna (200) → 200 eldri á 1.000 og 200 nýjar á 850
  assert.equal(R.medalverd({ birgdir: 400, kostnadarverd: 1000, magn: 200, nytt: 850, baeta: false }), 925);
  assert.equal(R.medalverd({ birgdir: 400, kostnadarverd: 1000, magn: 200, nytt: 850, baeta: true }), 950);
  assert.equal(R.medalverd({ birgdir: 100, kostnadarverd: null, magn: 50, nytt: 10 }), 10, 'ekkert eldra verð → nýtt');
  assert.equal(R.medalverd({ birgdir: -1, kostnadarverd: 500, magn: 100, nytt: 10 }), 10, 'neikvæður lager → nýtt');
});

test('aaetlun: sjálfgefið nýtt á tómt kaupverð, óbreytt þar sem verð er til; sameinar línur á sömu vöru', () => {
  const r = R.reikna(TE());
  const p = R.aaetlun(r, {}, VORUR());
  assert.deepEqual(p.linur.map((l) => [l.vara_id, l.kostn_eftir]), [[1, 3400], [2, 6800]]);
  assert.ok(!p.linur.some((l) => l.vara_id === 3), 'vara með kaupverð heldur því nema valið sé');
  const m = R.aaetlun(r, { 3: { kaupverd: 'medal' }, 1: { kaupverd: 'obreytt', baeta: true } }, VORUR());
  assert.equal(m.linur.find((l) => l.vara_id === 3).kostn_eftir, 925);
  const a = m.linur.find((l) => l.vara_id === 1);
  assert.equal(a.kostn_eftir, null, 'óbreytt tómt verð helst tómt');
  assert.equal(a.birgdir_eftir, 250);
  const tvaer = R.reikna({ vorur_isk: 300, linur: [{ vara_id: 1, magn: 1, einingaverd: 1 }, { vara_id: 1, magn: 2, einingaverd: 1 }], kostnadur: [] });
  const t = R.aaetlun(tvaer, {}, VORUR());
  assert.equal(t.linur.length, 1); assert.equal(t.linur[0].magn, 3); assert.equal(t.linur[0].kostn_eftir, 100);
  assert.deepEqual(R.aaetlun(R.reikna({ vorur_isk: 1, linur: [{ vara_id: 777, magn: 1, einingaverd: 1 }] }), {}, VORUR()).sleppt[0].vara_id, 777);
});

test('hreyfingar: ein röð per vöru, líka vara sem heldur eldra kaupverði; útreikningurinn fylgir', () => {
  const r = R.reikna({ ...TE(), id: 9, dags: '2026-07-30' });
  const p = R.aaetlun(r, {}, VORUR());
  const h = R.hreyfingar({ ...TE(), id: 9, dags: '2026-07-30' }, r, p.linur, VORUR(), 'Agnar');
  assert.deepEqual(h.map((x) => x.vara_id), [1, 2, 3]);
  assert.deepEqual(h.map((x) => x.kostnadarverd), [3400, 6800, 850]);
  assert.deepEqual(h.map((x) => [x.vorur_kr, x.alag_kr]), [[2800, 600], [5600, 1200], [700, 150]]);
  assert.deepEqual(h.map((x) => [x.kostn_fyrir, x.kostn_eftir]), [[null, 3400], [null, 6800], [1000, 1000]], 'vara C heldur 1.000 en sagan sýnir 850');
  assert.deepEqual(h.map((x) => x.utreikningur.kaupverd), ['nytt', 'nytt', 'obreytt']);
  assert.ok(Math.abs(h.reduce((a, x) => a + x.utreikningur.hlutur, 0) - 1) < 1e-9, 'hlutdeildin summast í heild');
  assert.equal(h[0].einingaverd, 20); assert.equal(h[0].gengi, 140); assert.equal(h[0].magn, 100);
  assert.equal(h[0].tilvisun, 'PROF-1'); assert.equal(h[0].innflutningur_id, 9); assert.equal(h[0].dags, '2026-07-30'); assert.equal(h[0].skrad_af, 'Agnar');
  assert.equal(h[0].utreikningur.kostnadur_alls, 150000); assert.equal(h[0].utreikningur.heild, 850000);
  assert.deepEqual(h[0].utreikningur.omaeldir, ['Innanlandsgjöld']);
  assert.equal(h[0].utreikningur.lidir.length, 6);
  assert.equal(h[2].birgdir_fyrir, 400); assert.equal(h[2].birgdir_eftir, 400);
});

// ── Fallið ───────────────────────────────────────────────────────────────────────────────────────────────────────

const b64 = (buf) => Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
function hubToki(leynd, uid, v) {
  const nu = Math.floor(Date.now() / 1000);
  const payload = b64(JSON.stringify({ uid, nn: 'AG', v, iat: nu, exp: nu + 3600 }));
  return payload + '.' + b64(crypto.createHmac('sha256', leynd).update(payload).digest());
}
const HUB = { stilling: { id: 1, pw_hash: 'stub-hash', session_secret: 'stub-leynd', pw_changed_at: '2026-11-01', krefjast_slokk: true, krefjast: false },
  user: { id: 7, virkur: true, notandanafn: 'AG', nafn: 'Agnar', rola: 'Starfsmaður' } };
const INN = { cookie: 'hub_user=' + encodeURIComponent(hubToki('stub-leynd', 7, '2026-11-01')) };

function heimur() {
  const db = { innflutningur: [], vorur: VORUR(), vorur_hreyfingar: [], sala: [] };
  let nid = 1, klukka = 0;
  const kall = [];
  const svar = (data, status = 200) => ({ ok: status < 400, status, json: async () => data, text: async () => (data == null ? '' : JSON.stringify(data)) });
  const passar = (row, q) => [...q.entries()].every(([k, v]) => {
    if (['select', 'order', 'limit'].includes(k)) return true;
    if (v === 'is.null') return row[k] == null;
    if (v.startsWith('in.(')) return v.slice(4, -1).split(',').map(Number).includes(Number(row[k]));
    if (v.startsWith('eq.')) { const x = v.slice(3); return row[k] != null && (String(row[k]) === x || (x !== '' && !isNaN(x) && Number(row[k]) === Number(x))); }
    throw new Error('óþekkt sía ' + k + '=' + v);
  });
  global.fetch = async (url, o = {}) => {
    url = String(url);
    const method = o.method || 'GET';
    const body = o.body ? JSON.parse(o.body) : null;
    const u = new URL(url), tafla = u.pathname.replace('/rest/v1/', ''), q = u.searchParams;
    kall.push({ tafla, method, q: Object.fromEntries(q), body });
    if (tafla === 'hub_adgangar_stilling') return svar([HUB.stilling]);
    if (tafla === 'hub_adgangar') { const id = Number(String(q.get('id') || '').replace('eq.', '')); return svar(HUB.user.id === id ? [HUB.user] : []); }
    if (tafla === 'rpc/vara_solusaga') return svar(db.sala.filter((x) => x.vara_id === body.p_vara).map(({ vara_id, ...r }) => r));
    const rows = db[tafla];
    if (!rows) throw new Error('óþekkt tafla ' + tafla);
    if (method === 'POST' && Array.isArray(body)) { const nyjar = body.map((b) => ({ id: nid++, afturkallad_at: null, created_at: `2026-11-16T00:02:${String(klukka++).padStart(2, '0')}Z`, ...b })); rows.push(...nyjar); return svar(nyjar, 201); }
    if (method === 'GET') return svar(rows.filter((r) => passar(r, q)).map((r) => JSON.parse(JSON.stringify(r))));
    if (method === 'POST') { const r = { id: nid++, stada: 'drog', faersla: null, saga: [], ...body, updated_at: `2026-11-16T00:00:${String(klukka++).padStart(2, '0')}Z` }; rows.push(r); return svar([r]); }
    if (method === 'PATCH') {
      const hit = rows.filter((r) => passar(r, q));
      hit.forEach((r) => Object.assign(r, body, tafla === 'innflutningur' ? { updated_at: `2026-11-16T00:01:${String(klukka++).padStart(2, '0')}Z` } : {}));
      return svar(hit.map((r) => ({ ...r })));
    }
    if (method === 'DELETE') { const hit = rows.filter((r) => passar(r, q)); db[tafla] = rows.filter((r) => !hit.includes(r)); return svar(hit); }
    throw new Error('óþekkt aðferð');
  };
  return { db, kall };
}
const saekja = (q, headers = INN) => F.handler({ httpMethod: 'GET', queryStringParameters: q, headers })
  .then((r) => ({ status: r.statusCode, d: r.body ? JSON.parse(r.body) : null }));
const kalla = (method, body, headers = INN) => F.handler({ httpMethod: method, queryStringParameters: {}, headers, body: body ? JSON.stringify(body) : undefined })
  .then((r) => ({ status: r.statusCode, d: r.body ? JSON.parse(r.body) : null }));

test('fall: lokað án innskráningar; enginn gagnagrunnslestur á innflutningi', async () => {
  const h = heimur();
  const r = await kalla('GET', null, {});
  assert.equal(r.status, 401);
  assert.equal(r.d.need_login, true);
  assert.ok(!h.kall.some((k) => k.tafla === 'innflutningur' || k.tafla === 'vorur'));
  assert.equal((await kalla('POST', { action: 'faera', id: 1 }, {})).status, 401);
});

test('fall: vista stofnar drög, GET skilar reikningi og felur þjónustuvörur; hver vistaði skráist', async () => {
  const h = heimur();
  const ny = await kalla('POST', { action: 'vista', sending: TE() });
  assert.equal(ny.status, 200);
  assert.equal(Math.round(ny.d.sending.reikningur.heild), 850000);
  assert.equal(h.db.innflutningur[0].breytt_af, 'Agnar');
  assert.equal(h.db.innflutningur[0].saga[0].adgerd, 'stofnud');
  const g = await kalla('GET');
  assert.equal(g.status, 200);
  assert.equal(g.d.sendingar.length, 1);
  assert.ok(!g.d.vorur.some((v) => v.flokkur === 'Þjónusta'));
});

test('fall: vistun hafnað ef önnur vél breytti á meðan (updated_at), og eftir færslu', async () => {
  const h = heimur();
  const { d } = await kalla('POST', { action: 'vista', sending: TE() });
  const s = d.sending;
  const ok = await kalla('POST', { action: 'vista', sending: { ...s, birgir: 'A' } });
  assert.equal(ok.status, 200);
  const gamalt = await kalla('POST', { action: 'vista', sending: { ...s, birgir: 'B' } });   // gamla updated_at
  assert.equal(gamalt.status, 409);
  assert.equal(gamalt.d.sending.birgir, 'A', 'nýjasta útgáfan er send til baka');
  assert.equal(h.db.innflutningur[0].birgir, 'A');
});

test('fall: forskoðun skrifar ekkert; ómældur kostnaður krefst staðfestingar; færsla skrifar skilyrt', async () => {
  const h = heimur();
  const { d } = await kalla('POST', { action: 'vista', sending: TE() });
  const id = d.sending.id;
  const f = await kalla('POST', { action: 'faera', id, val: { 3: { kaupverd: 'medal' } }, forskoda: true });
  assert.equal(f.status, 200);
  assert.equal(f.d.aaetlun.linur.length, 3);
  assert.ok(!h.kall.some((k) => k.tafla === 'vorur' && k.method === 'PATCH'), 'forskoðun skrifar ekki');
  const an = await kalla('POST', { action: 'faera', id, val: { 3: { kaupverd: 'medal' } } });
  assert.equal(an.status, 400);
  assert.deepEqual(an.d.omaeldir, ['Innanlandsgjöld']);
  const r = await kalla('POST', { action: 'faera', id, val: { 3: { kaupverd: 'medal' }, 2: { baeta: true } }, omaelt_ok: true });
  assert.equal(r.status, 200);
  const v = (i) => h.db.vorur.find((x) => x.id === i);
  assert.equal(v(1).kostnadarverd, 3400); assert.equal(v(2).kostnadarverd, 6800); assert.equal(v(3).kostnadarverd, 925);
  assert.equal(v(2).birgdir, 90, '40 + 50');
  assert.equal(v(1).birgdir, 150, 'magni er aðeins bætt við þar sem valið er');
  const patch = h.kall.filter((k) => k.tafla === 'vorur' && k.method === 'PATCH');
  assert.ok(patch.every((k) => k.q.kostnadarverd && k.q.birgdir), 'hver skrift er skilyrt á lesið gildi');
  assert.equal(patch.find((k) => k.q.id === 'eq.3').q.kostnadarverd, 'eq.1000');
  const s = h.db.innflutningur[0];
  assert.equal(s.stada, 'faert'); assert.equal(s.faersla.af, 'Agnar'); assert.deepEqual(s.faersla.omaeldir, ['Innanlandsgjöld']);
  assert.equal((await kalla('POST', { action: 'faera', id, omaelt_ok: true })).status, 409, 'ekki fært tvisvar');
  assert.equal((await kalla('POST', { action: 'vista', sending: { ...s, birgir: 'X' } })).status, 409, 'ekki breytt eftir færslu');
  assert.equal((await kalla('POST', { action: 'eyda', id })).status, 409, 'færðri sendingu er ekki eytt');
});

test('fall: breyting frá annarri vél á milli lestrar og skriftar er sögð, ekki yfirskrifuð', async () => {
  const h = heimur();
  const { d } = await kalla('POST', { action: 'vista', sending: TE() });
  const sottVorur = global.fetch;
  global.fetch = async (url, o) => {   // önnur vél setur kaupverð á vöru B rétt eftir lesturinn
    const r = await sottVorur(url, o);
    if (String(url).includes('/vorur?id=in.')) h.db.vorur.find((x) => x.id === 2).kostnadarverd = 5000;
    return r;
  };
  const r = await kalla('POST', { action: 'faera', id: d.sending.id, omaelt_ok: true });
  assert.equal(r.status, 200);
  assert.equal(h.db.vorur.find((x) => x.id === 2).kostnadarverd, 5000, 'verð hinnar vélarinnar stendur');
  assert.deepEqual(r.d.faersla.arekstrar.map((a) => a.vara_id), [2]);
  assert.ok(!r.d.faersla.linur.some((l) => l.vara_id === 2));
});

test('fall: afturköllun skilar kaupverði þar sem engu var breytt síðan og dregur frá viðbætt magn (sala stendur)', async () => {
  const h = heimur();
  const { d } = await kalla('POST', { action: 'vista', sending: TE() });
  const id = d.sending.id;
  await kalla('POST', { action: 'faera', id, val: { 2: { baeta: true }, 3: { kaupverd: 'nytt' } }, omaelt_ok: true });
  const v = (i) => h.db.vorur.find((x) => x.id === i);
  v(2).birgdir -= 5;                  // 5 seldust eftir færsluna
  v(1).kostnadarverd = 3999;          // einhver breytti vöru A handvirkt
  const r = await kalla('POST', { action: 'afturkalla', id });
  assert.equal(r.status, 200);
  assert.equal(v(2).kostnadarverd, null); assert.equal(v(2).birgdir, 35, '40 + 50 − 5 seld − 50 = 35');
  assert.equal(v(3).kostnadarverd, 1000, 'eldra kaupverð kemur aftur');
  assert.equal(v(1).kostnadarverd, 3999, 'handvirk breyting stendur');
  assert.ok(r.d.sleppt.some((x) => x.vara_id === 1));
  const s = h.db.innflutningur[0];
  assert.equal(s.stada, 'drog'); assert.equal(s.faersla, null);
  assert.deepEqual(s.saga.map((x) => x.adgerd), ['stofnud', 'faert', 'afturkallad']);
  assert.equal((await kalla('POST', { action: 'eyda', id })).status, 200, 'drögum má eyða');
  assert.equal(h.db.innflutningur.length, 0);
});

test('fall: ógild gögn og aðgerðir', async () => {
  heimur();
  assert.equal((await kalla('POST', { action: 'faera', id: 'x' })).status, 400);
  assert.equal((await kalla('POST', { action: 'faera', id: 55 })).status, 404);
  assert.equal((await kalla('POST', { action: 'rugl' })).status, 400);
  assert.equal((await kalla('PUT')).status, 405);
  const r = await F.handler({ httpMethod: 'POST', headers: INN, body: '{ekki json' });
  assert.equal(r.statusCode, 400);
});

test('fall: færsla skrifar hreyfingu á hverja vöru, afturköllun merkir þær, og ?vara= skilar listanum með sölu', async () => {
  const h = heimur();
  h.db.sala.push({ vara_id: 1, manudur: '2026-10', magn: 12, an_vsk: 120000 }, { vara_id: 2, manudur: '2026-10', magn: 1, an_vsk: 1 });
  const { d } = await kalla('POST', { action: 'vista', sending: { ...TE(), dags: '2026-07-30' } });
  const id = d.sending.id;
  const f = await kalla('POST', { action: 'faera', id, omaelt_ok: true });
  assert.equal(f.status, 200); assert.equal(f.d.hreyfingar_villa, null);
  assert.deepEqual(h.db.vorur_hreyfingar.map((x) => [x.vara_id, x.kostnadarverd, x.kostn_eftir]), [[1, 3400, 3400], [2, 6800, 6800], [3, 850, 1000]]);
  assert.ok(h.db.vorur_hreyfingar.every((x) => x.innflutningur_id === id && x.skrad_af === 'Agnar' && x.tegund === 'innflutningur'));
  const s = await saekja({ vara: '1' });
  assert.equal(s.status, 200);
  assert.equal(s.d.vara.nafn, 'Vara A'); assert.equal(s.d.vara.kostnadarverd, 3400);
  assert.equal(s.d.hreyfingar.length, 1); assert.equal(s.d.hreyfingar[0].magn, 100);
  assert.deepEqual(s.d.sala, [{ manudur: '2026-10', magn: 12, an_vsk: 120000 }]); assert.equal(s.d.sala_villa, false);
  assert.equal((await saekja({ vara: '777' })).status, 404);
  assert.equal((await saekja({ vara: 'x' })).status, 400);
  assert.equal((await saekja({ vara: '1' }, {})).status, 401, 'sagan er á bak við starfsmannahliðið');
  await kalla('POST', { action: 'afturkalla', id });
  assert.ok(h.db.vorur_hreyfingar.every((x) => x.afturkallad_at), 'afturköllun eyðir engu, merkir');
  assert.equal(h.db.vorur_hreyfingar.length, 3);
});

test('fall: bregðist hreyfingaskriftin stendur færslan og svarið segir frá', async () => {
  const h = heimur();
  const { d } = await kalla('POST', { action: 'vista', sending: TE() });
  delete h.db.vorur_hreyfingar;
  const f = await kalla('POST', { action: 'faera', id: d.sending.id, omaelt_ok: true });
  assert.equal(f.status, 200);
  assert.ok(f.d.hreyfingar_villa, 'villan er sögð');
  assert.equal(h.db.vorur.find((x) => x.id === 1).kostnadarverd, 3400);
  assert.equal(h.db.innflutningur[0].stada, 'faert');
});
