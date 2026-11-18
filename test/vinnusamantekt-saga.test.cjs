/* Upp eða niður í mælum Vinnusamantektar (18.11.2026).
 * Agnar: „hafa líka þarna í kössunum nýtt í dag hvort talan fer upp eða niður“.
 * Tvennt prófað: fallið /api/vinnusamantekt-saga (hlið, hreinsun, viðmið) og rökfræðin í 489 (talaGildi, breyting).
 * Keyrsla: node --test test/vinnusamantekt-saga.test.cjs */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const SB = 'http://stub.invalid';
Object.assign(process.env, { SUPABASE_URL: SB, SUPABASE_SERVICE_ROLE_KEY: 'stub', URL: 'https://slokkvitaeki.netlify.app' });
delete process.env.HUB_STAFF_PASSWORD;

const LEYND = 'stub-leynd', V = '2026-11-01';
const STILLING = { id: 1, pw_hash: 'stub-hash', session_secret: LEYND, pw_changed_at: V, krefjast_slokk: true, krefjast: true };
const NOTANDI = { id: 7, virkur: true, notandanafn: 'PR', nafn: 'Prufa', rola: 'Admin' };
const ST = { rodir: [], skrif: [], lestur: [] };
const svar = (j, s = 200) => ({ ok: s < 400, status: s, headers: new Headers({ 'content-type': 'application/json' }), json: async () => j, text: async () => JSON.stringify(j) });
global.fetch = async (url, o = {}) => {
  const u = String(url);
  if (u.startsWith(SB + '/rest/v1/hub_adgangar_stilling')) return svar([STILLING]);
  if (u.startsWith(SB + '/rest/v1/hub_adgangar')) { const id = Number(String(new URL(u).searchParams.get('id') || '').replace('eq.', '')); return svar(id === NOTANDI.id ? [NOTANDI] : []); }
  if (u.startsWith(SB + '/rest/v1/rpc/vs_saga_skra')) { ST.skrif.push(JSON.parse(o.body)); return svar(1); }
  if (u.startsWith(SB + '/rest/v1/vinnusamantekt_saga')) { ST.lestur.push(u); return svar(ST.rodir); }
  throw new Error('óvænt kall í prófi: ' + u);
};
const b64 = (buf) => Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
function kaka() {
  const nu = Math.floor(Date.now() / 1000), payload = b64(JSON.stringify({ uid: 7, nn: 'PR', v: V, iat: nu, exp: nu + 3600 }));
  return 'hub_user=' + encodeURIComponent(payload + '.' + b64(crypto.createHmac('sha256', LEYND).update(payload).digest()));
}
const F = require('../netlify/functions/vinnusamantekt-saga.cjs');
const kalla = async (method, body, medKoku = true) => {
  const r = await F.handler({ httpMethod: method, headers: Object.assign({ host: 'slokkvitaeki.netlify.app' }, medKoku ? { cookie: kaka() } : {}), body: body == null ? null : (typeof body === 'string' ? body : JSON.stringify(body)) });
  let d = null; try { d = JSON.parse(r.body); } catch (_) {}
  return { status: r.statusCode, d };
};
const dagur = (af) => new Date(Date.now() + af * 864e5).toISOString().slice(0, 10);

test('hliðið: óinnskráður fær 401 og ekkert er lesið né skrifað', async () => {
  ST.skrif = []; ST.lestur = [];
  assert.equal((await kalla('GET', null, false)).status, 401);
  assert.equal((await kalla('POST', { maelingar: [{ id: 'villur', gildi: 28 }] }, false)).status, 401);
  assert.equal(ST.skrif.length + ST.lestur.length, 0);
  assert.equal((await kalla('DELETE', null)).status, 405);
  // Innskráður starfsmaður sem er EKKI stjórnandi: 403, hvorki lestur né skrif (sagan stýrir örvunum hjá Agnari).
  NOTANDI.rola = 'Starfsmaður';
  try {
    assert.equal((await kalla('GET')).status, 403);
    assert.equal((await kalla('POST', { maelingar: [{ id: 'villur', gildi: 1 }] })).status, 403);
    assert.equal(ST.skrif.length + ST.lestur.length, 0);
  } finally { NOTANDI.rola = 'Admin'; }
});

test('hreinsa: aðeins þekkt auðkenni og endanlegar tölur, hver mæling einu sinni, þak á fjölda', () => {
  const h = F._hreinsa([
    { id: 'villur', gildi: 28, tala: '28 ólíkar', sev: 'alv' },
    { id: 'villur', gildi: 99 },                                  // tvítekið → sleppt
    { id: 'Villur', gildi: 1 }, { id: 'a b', gildi: 1 }, { id: '', gildi: 1 }, { id: 'x'.repeat(61), gildi: 1 },
    { id: 'strengur', gildi: '28' }, { id: 'nan', gildi: NaN }, { id: 'inf', gildi: Infinity }, { id: 'risi', gildi: 1e14 },
    null, 'rusl', 42,
    { id: 'tekjur', gildi: 2.04999, tala: 'x'.repeat(200), sev: 'bull' },
  ]);
  assert.deepEqual(h.map((x) => x.id), ['villur', 'tekjur']);
  assert.deepEqual(h[0], { id: 'villur', gildi: 28, tala: '28 ólíkar', sev: 'alv' });
  assert.equal(h[1].gildi, 2.05); assert.equal(h[1].tala.length, 80); assert.equal(h[1].sev, '');
  assert.equal(F._hreinsa(Array.from({ length: 500 }, (_, i) => ({ id: 'm' + i, gildi: i }))).length, 80);
  assert.deepEqual(F._hreinsa(null), []); assert.deepEqual(F._hreinsa('x'), []);
});

test('vidmid: nýjasta röð FYRRI daga á hverja mælingu, og fyrsta gildi dagsins í dag', () => {
  const iDag = '2026-11-18';
  const v = F._vidmid([
    { dags: '2026-11-18', maeling: 'villur', gildi: 24, fyrst_gildi: 28 },
    { dags: '2026-11-17', maeling: 'villur', gildi: 30, fyrst_gildi: 31 },
    { dags: '2026-11-15', maeling: 'villur', gildi: 12, fyrst_gildi: 12 },
    { dags: '2026-11-14', maeling: 'postur', gildi: 5, fyrst_gildi: 9 },   // borðið var ekki opnað 15.–17.: eldri dagur gildir
    { dags: '2026-11-19', maeling: 'postur', gildi: 99, fyrst_gildi: 99 }, // framtíð (klukkuskekkja) telst aldrei
    { dags: '2026-11-18', maeling: 'tekjur', gildi: 2.1, fyrst_gildi: 2 }, // aðeins til í dag
    null, { maeling: 'x' },
  ], iDag);
  assert.deepEqual(v.fyrri, { villur: { gildi: 30, dags: '2026-11-17' }, postur: { gildi: 5, dags: '2026-11-14' } });
  assert.deepEqual(v.fyrst, { villur: 28, tekjur: 2 });
});

test('POST skráir hreinsaðar tölur á daginn í dag (UTC) og skilar viðmiðunum', async () => {
  ST.skrif = []; ST.lestur = [];
  ST.rodir = [{ dags: dagur(0), maeling: 'villur', gildi: 24, fyrst_gildi: 28 }, { dags: dagur(-1), maeling: 'villur', gildi: 30, fyrst_gildi: 30 }];
  const r = await kalla('POST', { maelingar: [{ id: 'villur', gildi: 24, tala: '24 ólíkar', sev: 'alv' }, { id: 'RANGT', gildi: 1 }] });
  assert.equal(r.status, 200);
  assert.deepEqual(ST.skrif, [{ p_dags: dagur(0), p_maelingar: [{ id: 'villur', gildi: 24, tala: '24 ólíkar', sev: 'alv' }] }]);
  assert.equal(r.d.skrad, 1); assert.equal(r.d.i_dag, dagur(0));
  assert.deepEqual(r.d.fyrri, { villur: { gildi: 30, dags: dagur(-1) } });
  assert.deepEqual(r.d.fyrst, { villur: 28 });
  // Ekkert nothæft í beiðninni → 400 og ekkert skrifað.
  ST.skrif = [];
  assert.equal((await kalla('POST', { maelingar: [{ id: 'RANGT', gildi: 1 }] })).status, 400);
  assert.equal((await kalla('POST', '{ekki json')).status, 400);
  assert.equal(ST.skrif.length, 0);
  // GET les aðeins.
  assert.equal((await kalla('GET')).status, 200);
  assert.equal(ST.skrif.length, 0);
});

/* ── Rökfræðin í 489, dregin úr skránni og keyrð ── */
const SRC = fs.readFileSync(path.join(__dirname, '..', 'js', 'patches', '489-vinnusamantekt.js'), 'utf8');
function ur489(saga) {
  const esc = SRC.match(/^\s*const esc = [^\n]*$/m);
  const tg = SRC.match(/function talaGildi\(tala\) \{[\s\S]*?\n  \}/);
  const ft = SRC.match(/^\s*const fraTexti = [^\n]*$/m);
  const isF = SRC.match(/^\s*const is = \(n, a\) => [^\n]*$/m);
  const br = SRC.match(/function breyting\(id, tala\) \{[\s\S]*?\n  \}/);
  const bh = SRC.match(/const breytingHtml = \(id, tala, klasi\) => \{[\s\S]*?\n  \};/);
  assert.ok(esc && tg && ft && isF && br && bh, 'náði ekki föllunum úr 489');
  return new Function('SAGA', [esc[0], tg[0], ft[0], isF[0], br[0], bh[0]].join('\n') + '\nreturn { talaGildi, breyting, breytingHtml };')(saga);
}

test('talaGildi: fyrsta talan í strengnum, íslenskt snið — og upphæð ALLTAF í krónum', () => {
  const { talaGildi } = ur489({ fyrri: {}, fyrst: {} });
  const g = (t) => { const x = talaGildi(t); return x ? [x.g, x.aukast, x.ein, x.studull] : null; };
  assert.deepEqual(g('2,0 m.kr'), [2000000, 1, 'm.kr', 1e6]);
  assert.deepEqual(g('950.000 kr'), [950000, 0, 'kr', 1]);          // sama mæling undir milljón — sama eining í grunni
  assert.deepEqual(g('47.302 kr'), [47302, 0, 'kr', 1]);
  assert.deepEqual(g('1.206.643 kr.'), [1206643, 0, 'kr', 1]);
  assert.deepEqual(g('12 þ.kr'), [12000, 0, 'þ.kr', 1e3]);
  assert.deepEqual(g('11 · 8,3 m.kr'), [11, 0, '', 1]);             // fyrsta talan er fjöldinn, ekki upphæðin
  assert.deepEqual(g('2 · 47.302 kr'), [2, 0, '', 1]);
  assert.deepEqual(g('438 af 646'), [438, 0, '', 1]);
  assert.deepEqual(g('16 af 19'), [16, 0, '', 1]);
  assert.deepEqual(g('28 ólíkar'), [28, 0, '', 1]);
  assert.deepEqual(g('5 þessa viku'), [5, 0, '', 1]);
  assert.deepEqual(g('91 ný · 63 hlaðin · 87 yfirfarin'), [91, 0, '', 1]);
  // kr()/mkr() skrifa Unicode-mínus (U+2212): neikvæð tala má ekki lesast jákvæð.
  assert.deepEqual(g('\u22123,7 m.kr'), [-3700000, 1, 'm.kr', 1e6]);
  assert.deepEqual(g('-3,7 m.kr'), [-3700000, 1, 'm.kr', 1e6]);
  assert.deepEqual(g('\u221212.500 kr'), [-12500, 0, 'kr', 1]);
  for (const t of ['—', '', null, undefined, 'ekki mælt', '…']) assert.equal(g(t), null, String(t));
});

test('breyting: borið saman við fyrri dag; fyrsta daginn við fyrstu mælingu dagsins; annars ekkert', () => {
  const gaer = dagur(-1);
  const f = ur489({ fyrri: { villur: { gildi: 30, dags: gaer }, postur: { gildi: 5, dags: '2026-11-14' }, tekjur: { gildi: 1900000, dags: gaer }, bord: { gildi: 161, dags: gaer } }, fyrst: { nytt: 7, villur: 28 } });
  let b = f.breyting('villur', '24 ólíkar');                       // fyrri dagur vinnur yfir fyrstu mælingu dagsins
  assert.deepEqual([b.d, b.att, b.texti, b.stutt], [-6, 'nidur', '▼ 6 frá í gær', '▼ 6']);
  b = f.breyting('postur', '8 þessa viku');                         // borðið var ekki opnað í gær → dagsetning í stað „í gær“
  assert.deepEqual([b.att, b.texti], ['upp', '▲ 3 frá 14.11.']);
  b = f.breyting('tekjur', '2,0 m.kr');                             // aukastafir og eining fylgja
  assert.deepEqual([b.att, b.texti], ['upp', '▲ 0,1 m.kr frá í gær']);
  b = f.breyting('bord', '161');
  assert.deepEqual([b.att, b.texti, b.stutt], ['eins', 'óbreytt frá í gær', '']);
  b = f.breyting('nytt', '9 ný');                                   // engin fyrri saga → frá fyrstu mælingu dagsins
  assert.deepEqual([b.att, b.texti], ['upp', '▲ 2 í dag']);
  assert.equal(f.breyting('okunn', '12'), null);                    // ekkert viðmið → ekkert merki
  assert.equal(f.breyting('villur', '—'), null);                    // ómælt → ekkert merki
});

test('breyting: upphæð sem skiptir um einingu milli daga er borin saman í krónum (rýni 18.11.2026)', () => {
  const gaer = dagur(-1);
  const f = ur489({ fyrri: { a: { gildi: 900000, dags: gaer }, b: { gildi: 990000, dags: gaer }, c: { gildi: 1200000, dags: gaer },
    d: { gildi: -3700000, dags: gaer }, e: { gildi: 47302, dags: gaer } }, fyrst: {} });
  // Í gær „900.000 kr“, í dag „1,2 m.kr“: +300.000 kr — EKKI 1,2 − 900000.
  let b = f.breyting('a', '1,2 m.kr');
  assert.deepEqual([b.d, b.att, b.stutt], [300000, 'upp', '▲ 0,3 m.kr']);
  // Breyting sem hyrfi í námundun („0,0 m.kr“) er sýnd í krónum.
  b = f.breyting('b', '1,0 m.kr');
  assert.deepEqual([b.d, b.att, b.stutt], [10000, 'upp', '▲ 10.000 kr']);
  // Yfir mörkin í hina áttina: í gær 1,2 m.kr, í dag „950.000 kr“.
  b = f.breyting('c', '950.000 kr');
  assert.deepEqual([b.d, b.att, b.stutt], [-250000, 'nidur', '▼ 250.000 kr']);
  // Neikvæð tala með Unicode-mínus: −3,7 → −2,0 er HÆKKUN.
  b = f.breyting('d', '\u22122,0 m.kr');
  assert.deepEqual([b.d, b.att, b.stutt], [1700000, 'upp', '▲ 1,7 m.kr']);
  b = f.breyting('e', '50.000 kr');
  assert.deepEqual([b.d, b.att, b.stutt], [2698, 'upp', '▲ 2.698 kr']);
});

test('breytingHtml: mælirinn fær fullan texta, röðin stutta ör, óbreytt röð ekkert — og allt flúið', () => {
  const gaer = dagur(-1);
  const f = ur489({ fyrri: { villur: { gildi: 30, dags: gaer }, bord: { gildi: 161, dags: gaer } }, fyrst: {} });
  const m = f.breytingHtml('villur', '24 ólíkar', 'vs-mcd');
  assert.match(m, /^<span class="vs-mcd" data-att="nidur" title="Lækkaði um 6 frá í gær">▼ 6 frá í gær<\/span>$/);
  assert.match(f.breytingHtml('villur', '24 ólíkar', 'vs-d'), /^<span class="vs-d" data-att="nidur" title="[^"]+">▼ 6<\/span>$/);
  assert.match(f.breytingHtml('bord', '161', 'vs-mcd'), /data-att="eins"[^>]*>óbreytt frá í gær</);
  assert.equal(f.breytingHtml('bord', '161', 'vs-d'), '');           // röð sem stendur í stað fær ekkert merki
  assert.equal(f.breytingHtml('okunn', '5', 'vs-mcd'), '');
  // Þótt birtingarstrengur bæri HTML kemst aðeins talan og einingin í merkið.
  const x = f.breytingHtml('villur', '24 <img src=x onerror=alert(1)>', 'vs-mcd');
  assert.ok(x.length > 0 && !/<img|onerror/.test(x), x);
});

test('489 er tengt: sendir eftir mælingu, teiknar í mæli og röð, og sagan getur aldrei fellt samantektina', () => {
  assert.match(SRC, /S\.res = res;\s*\n\s*sagaSenda\(\);/, 'sagaSenda á að keyra eftir hverja mælingu');
  assert.match(SRC, /fetch\('\/api\/vinnusamantekt-saga', \{ method: 'POST', credentials: 'same-origin'/);
  assert.match(SRC, /breytingHtml\(a\.m\.id, a\.r\.tala, 'vs-mcd'\)/, 'mælirinn sýnir breytingu aðaltölunnar');
  assert.match(SRC, /breytingHtml\(m\.id, r\.tala, 'vs-d'\)/, 'röðin sýnir breytinguna');
  const s = SRC.match(/async function sagaSenda\(\) \{[\s\S]*?\n  \}/)[0];
  assert.match(s, /try \{[\s\S]*\} catch \(_\) \{\}/, 'netvilla má ekki kastast upp');
  assert.match(s, /if \(!r\.ok\) return;/, '401/500 → engin saga, engin villa');
});
