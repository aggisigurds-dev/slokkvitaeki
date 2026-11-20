// Sendiföll Slökkvitækis á bak við starfsmannahlið (Powerplan lota 13, 17.11.2026). Það sem má aldrei bila:
//   1. payday-push, email-send, sms-send, sms-sjalfvirkt: óinnskráður → 401 og EKKERT útflæði (Payday, Resend, Twilio,
//      kúnnagögn); fölsuð kaka → 401; notendaskráin niðri → 503 (lokað, aldrei opið); innskráður starfsmaður → óbreytt.
//   2. Innri tóki (x-sl-toki, 'sl-innri|'): opnar AÐEINS email-send (einu sendifallið sem þjónar kalla á án köku).
//      Rangur, útrunninn, póst-tóki eða hub-tóki → 401.
//   3. Kallarar keyrðir staðbundið með allt útflæði stíflað: gatt-vikupostur, payday-sync-cron og gatt-admin („send")
//      kalla á email-send — beiðnin sem þau búa til er spiluð inn í email-send og kemst í gegn; afgreidsla.cjs kallar á
//      payday-push í ferli með hausum vafrans (kakan fylgir) og kemst í gegn; vafraplástrarnir kalla á sama uppruna
//      (afstæð slóð, kakan fylgir) og enginn sleppir kökunni.
// Keyrsla: node --test test/sendifoll-hlid.test.cjs
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const ROT = path.join(__dirname, '..');
const SB = 'http://stub.invalid';
Object.assign(process.env, {
  SUPABASE_URL: SB, SUPABASE_SERVICE_ROLE_KEY: 'stub', PAYDAY_CLIENT_ID: 'gervi', PAYDAY_CLIENT_SECRET: 'gervi',
  PAYDAY_API_BASE: 'http://payday.invalid', RESEND_API_KEY: 'gervi', TWILIO_SID: 'ACgervi', TWILIO_TOKEN: 'gervi', TWILIO_FROM: '+3540000000',
  URL: 'https://slokkvitaeki.netlify.app',
});
delete process.env.HUB_STAFF_PASSWORD;
delete process.env.EDGE_SHARED_KEY;

const LEYND = 'stub-leynd', V = '2026-11-01';
const STILLING = { id: 1, pw_hash: 'stub-hash', session_secret: LEYND, pw_changed_at: V, krefjast_slokk: true, krefjast: true };
const NOTANDI = { id: 7, virkur: true, notandanafn: 'PR', nafn: 'Prufa', rola: 'Starfsmaður' };
const ST = { nidri: false, ut: [] };   // ut: allt útflæði sem fór (Payday, Resend, Twilio, Supabase-gögn utan notendaskrár)
const svar = (j, s = 200) => ({ ok: s < 400, status: s, headers: new Headers({ 'content-type': 'application/json' }),
  json: async () => j, text: async () => (typeof j === 'string' ? j : JSON.stringify(j)), arrayBuffer: async () => new ArrayBuffer(0) });
const hausar = (o) => { const h = new Headers((o && o.headers) || {}); const u = {}; h.forEach((v, k) => { u[k] = v; }); return u; };

// Allt net hermt. Notendaskráin svarar (nema ST.nidri); allt annað er skráð í ST.ut og svarað með tómu.
global.fetch = async (url, o = {}) => {
  const u = String(typeof url === 'string' || url instanceof URL ? url : url.url);
  if (u.startsWith(SB + '/rest/v1/hub_adgangar_stilling')) { if (ST.nidri) throw new Error('niðri'); return svar([STILLING]); }
  if (u.startsWith(SB + '/rest/v1/hub_adgangar')) {
    if (ST.nidri) throw new Error('niðri');
    const id = Number(String(new URL(u).searchParams.get('id') || '').replace('eq.', ''));
    return svar(id === NOTANDI.id ? [NOTANDI] : []);
  }
  ST.ut.push({ url: u, method: (o && o.method) || 'GET', headers: hausar(o), body: o && o.body });
  if (u.includes('api.resend.com')) return svar({ id: 'gervi-resend' });
  if (u.includes('api.twilio.com')) return svar({ sid: 'SMgervi', status: 'queued', to: '+3546991234' });
  if (u.includes('payday.invalid')) return svar({ access_token: 'gervi', expires_in: 3600 });
  if (u.includes('/api/email-send')) return svar({ id: 'gervi' });   // kallarar: svarið skiptir ekki máli, beiðnin er skráð
  if (u.includes('/rest/v1/portal_users')) return svar([{ id: 'u1', email: 'kunni@gervi.is', display_name: 'Gervifélag', slug: 'gervi', base_id: 5 }]);
  return svar([]);
};
const nytt = () => { ST.ut = []; ST.nidri = false; };
const utan = (re) => ST.ut.filter((x) => re.test(x.url));

const b64 = (buf) => Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
function kaka(leynd = LEYND) {
  const nu = Math.floor(Date.now() / 1000);
  const payload = b64(JSON.stringify({ uid: 7, nn: 'PR', v: V, iat: nu, exp: nu + 3600 }));
  return 'hub_user=' + encodeURIComponent(payload + '.' + b64(crypto.createHmac('sha256', leynd).update(payload).digest()));
}
const tilgangsToki = (tilgangur, leynd = LEYND, m = Math.floor(Date.now() / 60000)) =>
  m + '.' + crypto.createHmac('sha256', leynd).update(tilgangur + '|' + m).digest('hex');
const HOST = 'slokkvitaeki.netlify.app';

const HUB = require('../netlify/functions/hub-adgangar.cjs');
const PP = require('../netlify/functions/payday-push.cjs');
const esm = async (f) => (await import(pathToFileURL(path.join(ROT, 'netlify/functions', f)).href)).default;
const beidni = (slod, { method = 'GET', h = {}, body } = {}) =>
  new Request('https://' + HOST + slod, { method, headers: { host: HOST, origin: 'https://' + HOST, 'content-type': 'application/json', ...h }, body });

// ── 1. payday-push ────────────────────────────────────────────────────────────────────────────────────────────────
test('payday-push: óinnskráður 401 og ekkert til Payday né sölugagna; fölsuð kaka 401; notendaskrá niðri 503', async () => {
  nytt();
  const an = await PP.handler({ httpMethod: 'POST', headers: { host: HOST }, body: JSON.stringify({ sale_id: 1 }) });
  assert.equal(an.statusCode, 401);
  assert.match(an.body, /need_login/);
  assert.equal(ST.ut.length, 0, 'ekkert útflæði án innskráningar');
  const falsad = await PP.handler({ httpMethod: 'POST', headers: { host: HOST, cookie: kaka('röng-leynd') }, body: JSON.stringify({ sale_id: 1 }) });
  assert.equal(falsad.statusCode, 401);
  const probe = await PP.handler({ httpMethod: 'GET', headers: { host: HOST }, queryStringParameters: { probe: '1' } });
  assert.equal(probe.statusCode, 401, 'auth-prófið (GET probe) er líka lokað');
  ST.nidri = true;
  const nidri = await PP.handler({ httpMethod: 'POST', headers: { host: HOST, cookie: kaka() }, body: JSON.stringify({ sale_id: 1 }) });
  assert.equal(nidri.statusCode, 503, 'notendaskráin svarar ekki → lokað, aldrei opið');
  assert.equal(ST.ut.length, 0);
});

test('payday-push: innskráður starfsmaður kemst í gegn óbreytt (sama svar og áður við GET án probe)', async () => {
  nytt();
  const r = await PP.handler({ httpMethod: 'GET', headers: { host: HOST, cookie: kaka() }, queryStringParameters: {} });
  assert.equal(r.statusCode, 400);
  assert.match(r.body, /probe=1/);
});

test('payday-push: innri tóki (x-sl-toki) opnar EKKI — enginn þjónn kallar hingað án köku', async () => {
  nytt();
  const t = await HUB.innriToki();
  assert.ok(t);
  const r = await PP.handler({ httpMethod: 'POST', headers: { host: HOST, [HUB.INNRI_HAUS]: t }, body: JSON.stringify({ sale_id: 1 }) });
  assert.equal(r.statusCode, 401);
  assert.equal(ST.ut.length, 0);
});

test('afgreidsla.cjs → payday-push í ferli: hausar vafrans (kakan) fylgja og hliðið hleypir í gegn', async () => {
  // afgreidsla.cjs sendaKrofu: h = Object.assign({}, event.headers) (+ x-eldklar-key ef sett) → PP.handler({ headers: h }).
  const src = fs.readFileSync(path.join(ROT, 'netlify/functions/afgreidsla.cjs'), 'utf8');
  assert.match(src, /const h = Object\.assign\(\{\}, \(event && event\.headers\) \|\| \{\}\);[\s\S]{0,200}PP\.handler\(\{ httpMethod: 'POST', headers: h/,
    'afgreidsla verður að senda hausa vafrans (kökuna) áfram til payday-push');
  nytt();
  const vafri = { host: HOST, cookie: kaka(), 'content-type': 'application/json' };
  const h = Object.assign({}, vafri);
  const r = await PP.handler({ httpMethod: 'GET', headers: h, queryStringParameters: {} });
  assert.equal(r.statusCode, 400, 'kemst framhjá hliðinu (400 = GET án probe, ekki 401)');
  const anKoku = await PP.handler({ httpMethod: 'GET', headers: { host: HOST }, queryStringParameters: {} });
  assert.equal(anKoku.statusCode, 401);
});

// ── 2. email-send ─────────────────────────────────────────────────────────────────────────────────────────────────
test('email-send: óinnskráður 401 (GET og POST) og ekkert til Resend', async () => {
  const ES = await esm('email-send.js');
  nytt();
  assert.equal((await ES(beidni('/api/email-send'))).status, 401);
  const r = await ES(beidni('/api/email-send', { method: 'POST', body: JSON.stringify({ from: 'a@b.is', to: ['c@d.is'], subject: 's', html: 'h' }) }));
  assert.equal(r.status, 401);
  assert.equal(r.headers.get('access-control-allow-origin'), '*', 'CORS-hausar fylgja 401');
  assert.equal(utan(/resend/).length, 0);
  ST.nidri = true;
  assert.equal((await ES(beidni('/api/email-send', { h: { cookie: kaka() } }))).status, 503);
});

test('email-send: innskráður starfsmaður sendir óbreytt (eitt kall til Resend, sama meginmál)', async () => {
  const ES = await esm('email-send.js');
  nytt();
  const g = await ES(beidni('/api/email-send', { h: { cookie: kaka() } }));
  assert.equal(g.status, 200);
  assert.deepEqual(await g.json(), { stillt: true });
  const r = await ES(beidni('/api/email-send', { method: 'POST', h: { cookie: kaka() }, body: JSON.stringify({ from: 'eldklar@eldklar.is', to: ['c@d.is'], subject: 's', html: 'h' }) }));
  assert.equal(r.status, 200);
  const re = utan(/resend/);
  assert.equal(re.length, 1);
  assert.equal(JSON.parse(re[0].body).subject, 's');
});

test('email-send: gildur innri tóki opnar; rangur, útrunninn, póst-tóki og hub-tóki → 401', async () => {
  const ES = await esm('email-send.js');
  const H = HUB.INNRI_HAUS;
  const tilfelli = [
    ['gildur', await HUB.innriToki(), 200],
    ['röng leynd', tilgangsToki('sl-innri', 'röng-leynd'), 401],
    ['útrunninn (20 mín)', tilgangsToki('sl-innri', LEYND, Math.floor(Date.now() / 60000) - 20), 401],
    ['póst-tóki', tilgangsToki('postur-senda'), 401],
    ['hub-tóki', tilgangsToki('hub-api'), 401],
    ['rusl', 'abc.def', 401],
  ];
  for (const [nafn, t, vaent] of tilfelli) {
    nytt();
    const r = await ES(beidni('/api/email-send', { method: 'POST', h: { [H]: t }, body: JSON.stringify({ from: 'a@b.is', to: ['c@d.is'], subject: 's', html: 'h' }) }));
    assert.equal(r.status, vaent, nafn);
    assert.equal(utan(/resend/).length, vaent === 200 ? 1 : 0, nafn + ': Resend');
  }
});

// ── 3. sms-send og sms-sjalfvirkt ─────────────────────────────────────────────────────────────────────────────────
test('sms-send: óinnskráður 401 og ekkert til Twilio; innri tóki opnar ekki; innskráður sendir óbreytt', async () => {
  const SS = await esm('sms-send.js');
  const smsBody = JSON.stringify({ to: '6991234', body: 'prufa' });
  nytt();
  assert.equal((await SS(beidni('/api/sms-send', { method: 'POST', body: smsBody }))).status, 401);
  assert.equal((await SS(beidni('/api/sms-send'))).status, 401, 'stöðu-GET líka lokað');
  assert.equal((await SS(beidni('/api/sms-send', { method: 'POST', h: { [HUB.INNRI_HAUS]: await HUB.innriToki() }, body: smsBody }))).status, 401);
  assert.equal(utan(/twilio/).length, 0);
  nytt();
  const r = await SS(beidni('/api/sms-send', { method: 'POST', h: { cookie: kaka() }, body: smsBody }));
  assert.equal(r.status, 200);
  assert.equal(utan(/twilio/).length, 1);
});

test('sms-sjalfvirkt: forskoðun (nöfn og símanúmer kúnna) lokuð óinnskráðum; innskráður fær hana', async () => {
  const SJ = await esm('sms-sjalfvirkt.js');
  nytt();
  const an = await SJ(beidni('/api/sms-sjalfvirkt'));
  assert.equal(an.status, 401);
  assert.equal(ST.ut.length, 0, 'engin kúnnagögn lesin án innskráningar');
  nytt();
  const r = await SJ(beidni('/api/sms-sjalfvirkt', { h: { cookie: kaka() } }));
  assert.notEqual(r.status, 401);
  assert.notEqual(r.status, 503);
  assert.equal(utan(/twilio/).length, 0, 'forskoðunin sendir aldrei');
});

// ── 4. Kallarar án köku (þjónn-í-þjón, áætluð föll) — keyrðir staðbundið, beiðnin spiluð inn í email-send ──────────
async function spilaInnIEmailSend(kall) {
  const ES = await esm('email-send.js');
  const h = Object.assign({}, kall.headers);
  delete h['content-length'];
  ST.ut = ST.ut.filter((x) => x !== kall);
  return ES(new Request('https://' + HOST + '/api/email-send', { method: 'POST', headers: h, body: kall.body }));
}

test('gatt-vikupostur (áætlað, mánudaga): sendir innri tóka og email-send hleypir því í gegn', async () => {
  nytt();
  const GV = require('../netlify/functions/gatt-vikupostur.cjs');
  const svar0 = await GV.sendaFelagi({ id: 'u1', base_id: 5, active: true, syn: { vikupostur: true }, email: 'kunni@gervi.is', display_name: 'Gervifélag', slug: 'gervi' }, { thvinga: true, origin: 'https://' + HOST });
  assert.equal(svar0.ok, true, JSON.stringify(svar0));
  const kall = utan(/\/api\/email-send/);
  assert.equal(kall.length, 1, 'eitt kall á email-send');
  assert.ok(kall[0].headers[HUB.INNRI_HAUS], 'innri tóki fylgir');
  const r = await spilaInnIEmailSend(kall[0]);
  assert.equal(r.status, 200);
  assert.equal(utan(/resend/).length, 1);
});

test('payday-sync-cron (áætlað 10/15): innri tóki á email-send, payday-sync-paid og payday-pull-slokk; email-send hleypir í gegn', async () => {
  nytt();
  const fyrri = global.fetch;
  global.fetch = async (url, o) => {
    const u = String(url);
    if (u.includes('/rpc/rukkun_eftirlit')) return svar({ void_greitt: { alls: 1, daemi: [{ num: 'R-1' }] } });
    return fyrri(url, o);
  };
  try {
    delete require.cache[require.resolve('../netlify/functions/payday-sync-cron.cjs')];
    await require('../netlify/functions/payday-sync-cron.cjs').handler();
  } finally { global.fetch = fyrri; }
  for (const re of [/\/api\/payday-sync-paid/, /\/api\/payday-pull-slokk/]) {
    const k = utan(re);
    assert.equal(k.length, 1, String(re));
    assert.ok(k[0].headers[HUB.INNRI_HAUS], String(re) + ' ber innri tóka');
  }
  const pk = utan(/\/api\/email-send/);
  assert.ok(pk.length >= 1, 'eftirlitspóstur fór á email-send');
  assert.ok(pk[0].headers[HUB.INNRI_HAUS]);
  const r = await spilaInnIEmailSend(pk[0]);
  assert.equal(r.status, 200);
  // Sömu beiðnir cron-fallsins spilaðar inn í payday-sync-paid og payday-pull-slokk: hliðið hleypir í gegn (Payday hermt).
  for (const [re, f] of [[/\/api\/payday-sync-paid/, 'payday-sync-paid.cjs'], [/\/api\/payday-pull-slokk/, 'payday-pull-slokk.cjs']]) {
    const k = utan(re)[0];
    const svarF = await require('../netlify/functions/' + f).handler({ httpMethod: 'POST', headers: Object.assign({ host: HOST }, k.headers), queryStringParameters: {}, body: k.body });
    assert.notEqual(svarF.statusCode, 401, f + ': kall cron-fallsins hafnað');
    assert.notEqual(svarF.statusCode, 503, f);
  }
});

test('payday-sync-paid og payday-pull-slokk: probe/dry óinnskráð → 401 og ekkert til Payday; rangur tóki 401; starfsmaður og innri tóki komast í gegn', async () => {
  for (const f of ['payday-sync-paid.cjs', 'payday-pull-slokk.cjs']) {
    const F = require('../netlify/functions/' + f);
    const kalla = (h, method = 'GET') => F.handler({ httpMethod: method, headers: Object.assign({ host: HOST }, h), queryStringParameters: { probe: '1' }, body: '' });
    nytt();
    assert.equal((await kalla({})).statusCode, 401, f + ' óinnskráður');
    assert.equal((await kalla({}, 'POST')).statusCode, 401, f + ' POST óinnskráður');
    assert.equal((await kalla({ [HUB.INNRI_HAUS]: tilgangsToki('sl-innri', 'röng-leynd') })).statusCode, 401, f + ' rangur tóki');
    assert.equal((await kalla({ [HUB.INNRI_HAUS]: tilgangsToki('postur-senda') })).statusCode, 401, f + ' póst-tóki');
    assert.equal(utan(/payday\.invalid/).length, 0, f + ': ekkert til Payday án innskráningar');
    for (const h of [{ cookie: kaka() }, { [HUB.INNRI_HAUS]: await HUB.innriToki() }]) {
      nytt();
      const r = await kalla(h);
      assert.notEqual(r.statusCode, 401, f + ' ' + Object.keys(h)[0]);
      assert.notEqual(r.statusCode, 503, f + ' ' + Object.keys(h)[0]);
      assert.ok(utan(/payday\.invalid/).length >= 1, f + ': komst að Payday-kallinu (hermt)');
    }
  }
});

test('gatt-admin „send" (starfsmaður sendir aðgang): innri tóki á email-send; email-send hleypir í gegn', async () => {
  nytt();
  const GA = require('../netlify/functions/gatt-admin.cjs');
  const r0 = await GA.handler({ httpMethod: 'POST', headers: { host: HOST, cookie: kaka() }, queryStringParameters: {}, body: JSON.stringify({ action: 'send', id: 'u1' }) });
  assert.equal(r0.statusCode, 200, r0.body);
  const kall = utan(/\/api\/email-send/);
  assert.equal(kall.length, 1);
  assert.ok(kall[0].headers[HUB.INNRI_HAUS]);
  const r = await spilaInnIEmailSend(kall[0]);
  assert.equal(r.status, 200);
  const anKoku = await GA.handler({ httpMethod: 'POST', headers: { host: HOST }, queryStringParameters: {}, body: JSON.stringify({ action: 'send', id: 'u1' }) });
  assert.equal(anKoku.statusCode, 401, 'gatt-admin sjálft er áfram lokað');
});

// ── 5. Vafraplástrarnir: sami uppruni, kakan fylgir ───────────────────────────────────────────────────────────────
test('vafrakallarar sendifallanna kalla á afstæða slóð og enginn sleppir kökunni (credentials: omit)', () => {
  const NOFN = ['payday-push', 'email-send', 'sms-send', 'sms-sjalfvirkt', 'payday-sync-paid', 'payday-pull-slokk'];
  const skrar = [];
  const ganga = (d) => { for (const f of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, f.name); if (f.isDirectory()) ganga(p); else if (/\.(js|html)$/.test(f.name)) skrar.push(p); } };
  ganga(path.join(ROT, 'js'));
  for (const f of fs.readdirSync(ROT)) if (/\.html$/.test(f)) skrar.push(path.join(ROT, f));
  let fundid = 0;
  for (const p of skrar) {
    const t = fs.readFileSync(p, 'utf8');
    if (!NOFN.some((n) => t.includes('/api/' + n) || t.includes('functions/' + n))) continue;
    fundid++;
    assert.doesNotMatch(t, /credentials\s*:\s*['"]omit['"]/, path.relative(ROT, p) + ' sleppir kökunni');
    assert.doesNotMatch(t, /https?:\/\/[^'"`\s]*\/api\/(payday-push|email-send|sms-send|sms-sjalfvirkt|payday-sync-paid|payday-pull-slokk)/, path.relative(ROT, p) + ' kallar á annan uppruna');
  }
  assert.ok(fundid >= 10, 'kallarar fundust (' + fundid + ')');
});
