// Próf: Markmið (16.11.2026) — framvinda (_markmid-reikna.cjs) og fallið (markmid.cjs): hliðið, skref, gögn, handvirk
// tala, mæling, viðhengi og samtímis skrif. Stub-fetch með gervigagnagrunni og -geymslu; ekkert lifandi snert.
// Keyrsla: node --test test/markmid.test.cjs
'use strict';
process.env.SUPABASE_URL = 'http://stub.invalid';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'stub';
delete process.env.HUB_STAFF_PASSWORD;
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const R = require('../netlify/functions/_markmid-reikna.cjs');
const F = require('../netlify/functions/markmid.cjs');

// ── Framvinda ────────────────────────────────────────────────────────────────────────────────────────────────────
test('framvinda: mælt niður á við — leiðin frá grunnlínu að marki', () => {
  assert.equal(R.framvinda({ maeling: 'x', upphaf: 80, nu: 80, mark: 0 }), 0);
  assert.equal(R.framvinda({ maeling: 'x', upphaf: 80, nu: 20, mark: 0 }), 0.75);
  assert.equal(R.framvinda({ maeling: 'x', upphaf: 260, nu: 155, mark: 50 }), 0.5);
  assert.equal(R.framvinda({ maeling: 'x', upphaf: 80, nu: 95, mark: 0 }), 0, 'versnun fer ekki undir 0');
  assert.equal(R.framvinda({ maeling: 'x', upphaf: 80, nu: -5, mark: 0 }), 1, 'fer ekki yfir 100 %');
  assert.equal(R.versnad({ upphaf: 80, nu: 95 }), true);
  assert.equal(R.versnad({ upphaf: 80, nu: 70 }), false);
});

test('framvinda: mælt upp á við og handvirkt', () => {
  assert.equal(R.framvinda({ maeling: 'x', stefna: 'upp', upphaf: 0, nu: 1, mark: 1 }), 1);
  assert.equal(R.framvinda({ handvirkt: true, stefna: 'upp', upphaf: 0, nu: 9, mark: 27 }), 1 / 3);
  assert.equal(R.versnad({ stefna: 'upp', upphaf: 10, nu: 4 }), true);
  assert.equal(R.tegund({ handvirkt: true }), 'handvirkt');
});

test('framvinda: skref, lokið og ómælt', () => {
  const skref = [{ done: true }, { done: false }, { done: true }, { done: false }];
  assert.equal(R.framvinda({ skref }), 0.5);
  assert.equal(R.framvinda({ skref, stada: 'lokid' }), 1, 'lokið er alltaf 100 %');
  assert.equal(R.framvinda({ skref: [] }), null, 'engin skref og ekkert mælt → ómælt, ekki 0');
  assert.equal(R.framvinda({ maeling: 'x', upphaf: null, nu: null, mark: 0, skref }), 0.5, 'mæling ókomin → skrefin ráða');
});

test('flokkar: samantekt í röð, ómæld talin sér', () => {
  const f = R.flokkar([
    { flokkur: 'A', maeling: 'x', upphaf: 10, nu: 5, mark: 0 },
    { flokkur: 'B', skref: [] },
    { flokkur: 'A', skref: [{ done: true }], stada: 'lokid' },
  ]);
  assert.deepEqual(f.map((x) => x.heiti), ['A', 'B']);
  assert.equal(f[0].framvinda, 0.75);
  assert.equal(f[0].lokid, 1);
  assert.equal(f[1].framvinda, null);
  assert.equal(f[1].omaeld, 1);
});

// ── Fallið ───────────────────────────────────────────────────────────────────────────────────────────────────────
const b64 = (buf) => Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
function hubToki(leynd, uid, v) {
  const nu = Math.floor(Date.now() / 1000);
  const payload = b64(JSON.stringify({ uid, nn: 'AG', v, iat: nu, exp: nu + 3600 }));
  return payload + '.' + b64(crypto.createHmac('sha256', leynd).update(payload).digest());
}
const HUB = { stilling: { id: 1, pw_hash: 'h', session_secret: 'leynd', pw_changed_at: '2026-11-01', krefjast_slokk: true, krefjast: false },
  user: { id: 7, virkur: true, notandanafn: 'AG', nafn: 'Agnar', rola: 'Admin' } };
const INN = { cookie: 'hub_user=' + encodeURIComponent(hubToki('leynd', 7, '2026-11-01')) };

function heimur(opt = {}) {
  let klukka = 0;
  const tst = () => `2026-11-16T02:00:${String(klukka++).padStart(2, '0')}.000Z`;
  const db = {
    markmid: [
      { id: 1, flokkur: 'Peningar', rod: 10, titill: 'Mælt', maeling: 'drog_opin_30d', handvirkt: false, stefna: 'nidur', upphaf: 54, mark: 0, nu: 54, skref: [{ id: 's1', t: 'Flokka', done: false }], athugasemdir: [], vidhengi: [], vl: [], stada: 'opid', updated_at: tst() },
      { id: 2, flokkur: 'Póstur', rod: 20, titill: 'Handvirkt', maeling: null, handvirkt: true, stefna: 'upp', upphaf: 0, mark: 27, nu: 0, skref: [], athugasemdir: [], vidhengi: [], vl: [], stada: 'opid', updated_at: tst() },
    ],
    markmid_maelingar: [],
  };
  const kall = [];
  const geymsla = {};
  const svar = (d, s = 200) => ({ ok: s < 400, status: s, json: async () => d, text: async () => (d == null ? '' : JSON.stringify(d)) });
  const passar = (row, q) => [...q.entries()].every(([k, v]) => {
    if (['select', 'order', 'limit'].includes(k)) return true;
    if (v === 'not.is.null') return row[k] != null;
    if (v.startsWith('neq.')) return String(row[k]) !== v.slice(4);
    if (v.startsWith('eq.')) return String(row[k]) === decodeURIComponent(v.slice(3));
    throw new Error('sía ' + k);
  });
  global.fetch = async (url, o = {}) => {
    url = String(url);
    const m = o.method || 'GET';
    const u = new URL(url);
    kall.push({ path: u.pathname, m, q: Object.fromEntries(u.searchParams) });
    if (u.pathname.startsWith('/storage/v1/object/sign/')) { const b = JSON.parse(o.body); return svar(b.paths.map((p) => ({ path: p, signedURL: '/object/sign/markmid/' + p + '?token=t' }))); }
    if (u.pathname.startsWith('/storage/v1/object/markmid/')) { geymsla[u.pathname] = o.body; return svar({ Key: u.pathname }); }
    if (u.pathname === '/storage/v1/object/markmid') { return svar([]); }
    if (u.host === 'brunaholf.netlify.app') {
      if (opt.ytraBilad) return svar({ error: 'niðri' }, 503);
      if (u.pathname === '/api/veidin') return svar({ baseline: { gleymd_felog: 56 }, nuna: { gleymd_felog: 103, rukkud_an_skyrslu: 35 } });
      if (u.pathname === '/api/oryggisnet') return svar({ talning: { graent: 126, rautt: 1, villa: 2, thaggadir: 12 } });
      return svar(null, 404);
    }
    const t = u.pathname.replace('/rest/v1/', '');
    if (t === 'hub_adgangar_stilling') return svar([HUB.stilling]);
    if (t === 'hub_adgangar') return svar([HUB.user]);
    if (t === 'rpc/markmid_maela') { const b = JSON.parse(o.body); return svar(b.p_lykill === 'drog_opin_30d' ? (opt.maeling ?? 40) : null); }
    const rows = db[t];
    if (m === 'GET') return svar(rows.filter((r) => passar(r, u.searchParams)).map((r) => JSON.parse(JSON.stringify(r))));
    if (m === 'POST') { const r = { id: rows.length + 1, ...JSON.parse(o.body) }; rows.push(r); return svar([r]); }
    if (m === 'PATCH') {
      if (opt.annadSkrifar && t === 'markmid' && opt.annadSkrifar.n-- > 0) { const x = rows.find((r) => r.id === 1); x.updated_at = tst(); }
      const hit = rows.filter((r) => passar(r, u.searchParams));
      hit.forEach((r) => Object.assign(r, JSON.parse(o.body), t === 'markmid' ? { updated_at: tst() } : {}));
      return svar(hit.map((r) => ({ ...r })));
    }
    throw new Error('óþekkt ' + m);
  };
  return { db, kall, geymsla };
}
const kalla = (method, body, headers = INN) => F.handler({ httpMethod: method, queryStringParameters: {}, headers, body: body ? JSON.stringify(body) : undefined })
  .then((r) => ({ status: r.statusCode, d: r.body ? JSON.parse(r.body) : null }));

test('fall: lokað án innskráningar', async () => {
  const h = heimur();
  assert.equal((await kalla('GET', null, {})).status, 401);
  assert.ok(!h.kall.some((k) => k.path.includes('/markmid')));
});

test('fall: GET skilar framvindu, flokkum og sögu', async () => {
  heimur();
  const r = await kalla('GET');
  assert.equal(r.status, 200);
  assert.deepEqual(r.d.flokkar.map((f) => f.heiti), ['Peningar', 'Póstur']);
  assert.equal(r.d.markmid[0].framvinda, 0);
  assert.equal(r.d.markmid[0].tegund, 'maelt');
});

test('fall: skref, athugasemd og staða — nafn og tími skráð; fyrsta hak setur í vinnu', async () => {
  const h = heimur();
  const r = await kalla('POST', { action: 'skref', id: 1, skref_id: 's1', done: true });
  assert.equal(r.status, 200);
  assert.equal(h.db.markmid[0].skref[0].done, true);
  assert.equal(h.db.markmid[0].skref[0].af, 'Agnar');
  assert.equal(h.db.markmid[0].stada, 'i_vinnu');
  assert.equal((await kalla('POST', { action: 'skref', id: 1, skref_id: 'rugl', done: true })).status, 404);
  await kalla('POST', { action: 'skref_nytt', id: 1, texti: 'Nýtt skref' });
  assert.equal(h.db.markmid[0].skref.length, 2);
  await kalla('POST', { action: 'athugasemd', id: 1, texti: 'Reikningur Eimskips fannst' });
  assert.equal(h.db.markmid[0].athugasemdir[0].af, 'Agnar');
  assert.equal((await kalla('POST', { action: 'athugasemd', id: 1, texti: '   ' })).status, 400);
  await kalla('POST', { action: 'stada', id: 1, stada: 'lokid' });
  assert.equal(h.db.markmid[0].lokid_af, 'Agnar');
  assert.equal((await kalla('POST', { action: 'stada', id: 1, stada: 'rugl' })).status, 400);
});

test('fall: handvirk tala aðeins á handvirk markmið; skráist í sögu', async () => {
  const h = heimur();
  assert.equal((await kalla('POST', { action: 'nu', id: 2, gildi: '9' })).status, 200);
  assert.equal(h.db.markmid[1].nu, 9);
  assert.equal(h.db.markmid[1].upphaf, 0, 'grunnlínan stendur þótt talan breytist');
  assert.equal(h.db.markmid_maelingar.length, 1);
  assert.equal((await kalla('POST', { action: 'nu', id: 1, gildi: 3 })).status, 400, 'mælt markmið er ekki slegið inn');
  assert.equal(h.db.markmid[0].nu, 54);
});

test('fall: mæling notar SQL-fallið, uppfærir nu og skráir sögu; grunnlínan stendur', async () => {
  const h = heimur({ maeling: 40 });
  const r = await kalla('POST', { action: 'maela' });
  assert.equal(r.status, 200);
  assert.deepEqual(r.d.maelt, [{ id: 1, gildi: 40 }]);
  assert.equal(h.db.markmid[0].nu, 40);
  assert.equal(h.db.markmid[0].upphaf, 54, 'grunnlínan breytist aldrei');
  assert.equal(h.db.markmid_maelingar.length, 1);
});

test('fall: viðhengi — leyfðar tegundir, stærðarþak, vistað og eytt', async () => {
  const h = heimur();
  const png = Buffer.from('89504e470d0a1a0a', 'hex').toString('base64');
  assert.equal((await kalla('POST', { action: 'vidhengi', id: 1, nafn: 'a.exe', tegund: 'application/x-msdownload', b64: png })).status, 400);
  assert.equal((await kalla('POST', { action: 'vidhengi', id: 1, nafn: 'tómt.png', tegund: 'image/png', b64: '' })).status, 400);
  const stor = Buffer.alloc(4 * 1024 * 1024 + 1).toString('base64');
  assert.equal((await kalla('POST', { action: 'vidhengi', id: 1, nafn: 'stor.png', tegund: 'image/png', b64: stor })).status, 413);
  const r = await kalla('POST', { action: 'vidhengi', id: 1, nafn: 'Skjáskot 1.png', tegund: 'image/png', b64: 'data:image/png;base64,' + png });
  assert.equal(r.status, 200);
  const v = h.db.markmid[0].vidhengi[0];
  assert.match(v.slod, /^1\/\d+-Skjaskot_1\.png$/);
  assert.ok(r.d.markmid.vidhengi[0].url.includes('/storage/v1/object/sign/markmid/'));
  assert.equal((await kalla('POST', { action: 'vidhengi_eyda', id: 1, vid_id: v.id })).status, 200);
  assert.equal(h.db.markmid[0].vidhengi.length, 0);
});

test('fall: önnur vél skrifaði á milli — reynt aftur á nýjustu útgáfunni, ekkert týnist', async () => {
  const h = heimur({ annadSkrifar: { n: 1 } });
  const r = await kalla('POST', { action: 'athugasemd', id: 1, texti: 'Á milli' });
  assert.equal(r.status, 200);
  assert.equal(h.db.markmid[0].athugasemdir.length, 1);
  const p = h.kall.filter((k) => k.m === 'PATCH' && k.path.endsWith('/markmid'));
  assert.equal(p.length, 2, 'fyrsta skrift hafnað, önnur tókst');
  assert.ok(p.every((k) => k.q.updated_at), 'skilyrt á updated_at');
});

test('fall: ytri mælingar (J.A.R.V.I.S.) — sama tala, heimild sótt einu sinni, bilun verður aldrei 0', async () => {
  const h = heimur();
  h.db.markmid.push(
    { id: 3, flokkur: 'Meginmarkmið', rod: 1, titill: 'Gleymd félög', maeling: 'ytra:veidin:gleymd_felog', stefna: 'nidur', upphaf: 56, mark: 0, nu: 56, skref: [], athugasemdir: [], vidhengi: [], vl: [], stada: 'opid', updated_at: 'x' },
    { id: 4, flokkur: 'Meginmarkmið', rod: 2, titill: 'Rukkuð án skýrslu', maeling: 'ytra:veidin:rukkud_an_skyrslu', stefna: 'nidur', upphaf: 45, mark: 0, nu: 45, skref: [], athugasemdir: [], vidhengi: [], vl: [], stada: 'opid', updated_at: 'y' },
    { id: 5, flokkur: 'Kerfið', rod: 3, titill: 'Öryggisnet', maeling: 'ytra:oryggisnet:brotnir', stefna: 'nidur', upphaf: 3, mark: 0, nu: 3, skref: [], athugasemdir: [], vidhengi: [], vl: [], stada: 'opid', updated_at: 'z' });
  const r = await kalla('POST', { action: 'maela' });
  assert.equal(r.status, 200);
  const g = Object.fromEntries(r.d.maelt.map((x) => [x.id, x.gildi]));
  assert.equal(g[3], 103); assert.equal(g[4], 35); assert.equal(g[5], 3, 'rautt + villa');
  assert.equal(h.db.markmid.find((m) => m.id === 3).upphaf, 56, 'grunnlína veiðinnar (30.07) stendur');
  assert.equal(h.kall.filter((k) => k.path === '/api/veidin').length, 1, 'veiðin sótt einu sinni fyrir tvö markmið');
  const b = heimur({ ytraBilad: true });
  b.db.markmid.push({ id: 3, flokkur: 'M', rod: 1, titill: 'G', maeling: 'ytra:veidin:gleymd_felog', stefna: 'nidur', upphaf: 56, mark: 0, nu: 70, skref: [], athugasemdir: [], vidhengi: [], vl: [], stada: 'opid', updated_at: 'x' });
  const rb = await kalla('POST', { action: 'maela', id: 3 });
  assert.equal(rb.d.maelt[0].villa, 'Mælingin skilaði engu');
  assert.equal(b.db.markmid.find((m) => m.id === 3).nu, 70, 'heimild niðri → talan stendur, verður ekki 0');
});
