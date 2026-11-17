// Tóki að föllum Brunahólfs (Powerplan lota 13, 17.11.2026). Það sem má aldrei bila:
//   1. /api/bh-toki: án innskráningar appsins → 401 og ENGINN tóki; innskráður → tóki sem Brunahólf tekur gildan
//      (HMAC af session_secret með tilganginum 'hub-api|', sama og brunaholf/netlify/functions/_vord.js);
//   2. póst-tóki og hub-tóki eru ólíkir (annar opnar ekki hinn);
//   3. _bh-toki.cjs: aðeins köll á brunaholf.netlify.app/api|/.netlify/functions fá hausinn — aldrei önnur hýsing;
//   4. 512-bh-bru.js: fetch appsins á föll Brunahólfs fær _hubtoki; annað óbreytt; innfelld Brunahólfs-síða fær tókann
//      með postMessage, skeyti frá öðrum uppruna fá ekkert; bilar /api/bh-toki fer kallið samt.
// Keyrsla: node --test test/bh-toki.test.cjs
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

process.env.SUPABASE_URL = 'http://stub.invalid';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'stub';
delete process.env.HUB_STAFF_PASSWORD;

const LEYND = 'stub-leynd', V = '2026-11-01';
const STILLING = { id: 1, pw_hash: 'stub-hash', session_secret: LEYND, pw_changed_at: V, krefjast_slokk: false, krefjast: true };
const NOTANDI = { id: 7, virkur: true, notandanafn: 'PR', nafn: 'Prufa', rola: 'Starfsmaður' };
const UT = [];
const svar = (j, s = 200) => ({ ok: s < 400, status: s, json: async () => j, text: async () => JSON.stringify(j) });
global.fetch = async (url, o = {}) => {
  const u = String(typeof url === 'string' || url instanceof URL ? url : url.url);
  if (u.startsWith('http://stub.invalid/rest/v1/')) {
    const tafla = u.slice('http://stub.invalid/rest/v1/'.length).split('?')[0];
    const q = new URL(u).searchParams;
    if (tafla === 'hub_adgangar_stilling') return svar([STILLING]);
    if (tafla === 'hub_adgangar') { const id = Number(String(q.get('id') || '').replace('eq.', '')); return svar(id === NOTANDI.id ? [NOTANDI] : []); }
    return svar([]);
  }
  UT.push({ url: u, toki: new Headers(o.headers || {}).get('x-hub-toki') });
  return svar({ ok: true });
};

const b64 = (buf) => Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
function kaka(leynd = LEYND, uid = 7, v = V, gildirSek = 3600) {
  const nu = Math.floor(Date.now() / 1000);
  const payload = b64(JSON.stringify({ uid, nn: 'PR', v, iat: nu, exp: nu + gildirSek }));
  return 'hub_user=' + encodeURIComponent(payload + '.' + b64(crypto.createHmac('sha256', leynd).update(payload).digest()));
}
// Staðfesting eins og brunaholf/_vord.js gerir hana
function bhTekurGildan(t) {
  const [mStr, sig] = String(t).split('.'); const m = Number(mStr), nu = Math.floor(Date.now() / 60000);
  if (!Number.isInteger(m) || m < nu - 10 || m > nu + 1) return false;
  return sig === crypto.createHmac('sha256', LEYND).update('hub-api|' + m).digest('hex');
}

const BT = require('../netlify/functions/bh-toki.cjs');
const HUB = require('../netlify/functions/hub-adgangar.cjs');

test('/api/bh-toki: án innskráningar 401 og enginn tóki; fölsuð kaka 401; innskráður starfsmaður fær gildan tóka', async () => {
  const an = await BT.handler({ httpMethod: 'GET', headers: {}, queryStringParameters: {} });
  assert.equal(an.statusCode, 401);
  assert.ok(!/toki"\s*:\s*"\d/.test(an.body));
  assert.equal((await BT.handler({ httpMethod: 'GET', headers: { cookie: kaka('röng-leynd') }, queryStringParameters: {} })).statusCode, 401);
  const ok = await BT.handler({ httpMethod: 'GET', headers: { cookie: kaka(), host: 'slokkvitaeki.netlify.app' }, queryStringParameters: {} });
  assert.equal(ok.statusCode, 200, ok.body);
  const j = JSON.parse(ok.body);
  assert.ok(bhTekurGildan(j.toki), 'Brunahólf tekur tókann gildan');
  assert.ok(j.gildir_ms > 0 && j.gildir_ms <= 10 * 60000);
  assert.equal((await BT.handler({ httpMethod: 'POST', headers: { cookie: kaka() }, queryStringParameters: {} })).statusCode, 405);
});

test('hub-tóki og póst-tóki eru ólíkir', async () => {
  const h = await HUB.hubApiToki(), p = await HUB.posturToki();
  assert.ok(h && p && h !== p);
  assert.ok(bhTekurGildan(h));
  assert.ok(!bhTekurGildan(p));
});

test('_bh-toki.cjs: aðeins föll á brunaholf.netlify.app fá hausinn', async () => {
  const B = require('../netlify/functions/_bh-toki.cjs');
  UT.length = 0;
  await fetch('https://brunaholf.netlify.app/api/krofu-greidslur?ar=2026');
  await fetch('https://brunaholf.netlify.app/.netlify/functions/email-send', { method: 'POST', headers: { 'content-type': 'application/json' } });
  await fetch('https://illt.example/api/krofu-greidslur');
  await fetch('https://brunaholf.netlify.app/index.html');
  assert.ok(bhTekurGildan(UT[0].toki));
  assert.ok(bhTekurGildan(UT[1].toki));
  assert.equal(UT[2].toki, null);
  assert.equal(UT[3].toki, null);
  assert.equal(B.erBhFall('https://brunaholf.netlify.app.illt.example/api/x'), false);
});

// ── vafraplásturinn 512 í sýndarglugga ─────────────────────────────────────────────────────────────────────────
const KODI = fs.readFileSync(path.join(__dirname, '..', 'js', 'patches', '512-bh-bru.js'), 'utf8');
const BH = 'https://brunaholf.netlify.app';
const GILDUR = '29000000.' + 'b'.repeat(64);
function gluggi({ tokiSvar = { toki: GILDUR, gildir_ms: 540000 }, tokiStada = 200 } = {}) {
  const kollud = [], hlustar = [];
  const w = {
    location: { href: 'https://slokkvitaeki.netlify.app/', origin: 'https://slokkvitaeki.netlify.app' },
    URL, Headers, Request, Promise,
    addEventListener(t, f) { if (t === 'message') hlustar.push(f); },
    fetch: async (input) => {
      const u = String(typeof input === 'string' || input instanceof URL ? input : input.url);
      kollud.push(u);
      if (u === '/api/bh-toki') return { ok: tokiStada === 200, status: tokiStada, json: async () => tokiSvar };
      return { ok: true, status: 200 };
    },
  };
  w.window = w;
  vm.runInNewContext(KODI, w);
  return { w, kollud, hlustar };
}
test('512: fetch á föll Brunahólfs fær _hubtoki (einu sinni sóttur); annað óbreytt', async () => {
  const g = gluggi();
  await g.w.fetch('https://brunaholf.netlify.app/api/krofu-yfirlit-bru?ar=2026');
  await g.w.fetch('https://brunaholf.netlify.app/api/worksites');
  await g.w.fetch('/api/postur-senda');
  await g.w.fetch('https://brunaholf.netlify.app/jarvis.html');
  assert.equal(g.kollud.filter(u => u === '/api/bh-toki').length, 1);
  const bh = g.kollud.filter(u => u.startsWith(BH + '/api/'));
  assert.ok(bh.every(u => new URL(u).searchParams.get('_hubtoki') === GILDUR));
  assert.equal(new URL(bh[0]).searchParams.get('ar'), '2026');
  assert.ok(g.kollud.includes('/api/postur-senda'));
  assert.ok(g.kollud.includes(BH + '/jarvis.html'));
});
test('512: bilar /api/bh-toki (401) fer kallið samt, óbreytt', async () => {
  const g = gluggi({ tokiStada: 401, tokiSvar: { need_login: true } });
  await g.w.fetch('https://brunaholf.netlify.app/api/worksites');
  assert.ok(g.kollud.includes(BH + '/api/worksites'));
});
test('512: innfelld Brunahólfs-síða fær tókann; annar uppruni fær ekkert', async () => {
  const g = gluggi();
  const svor = [];
  const source = { postMessage: (d, o) => svor.push({ d, o }) };
  g.hlustar.forEach(f => f({ origin: 'https://illt.example', source, data: { type: 'hub-toki', id: 'a1' } }));
  g.hlustar.forEach(f => f({ origin: BH, source, data: { type: 'hub-toki', id: 'b2' } }));
  await new Promise(r => setTimeout(r, 20));
  assert.equal(svor.length, 1);
  assert.equal(svor[0].o, BH);
  assert.equal(svor[0].d.type, 'hub-toki-svar');
  assert.equal(svor[0].d.id, 'b2');
  assert.equal(svor[0].d.toki, GILDUR);
});
