// Próf: VIP-borðinn á Þjónustuborðinu (513) í vm-samhengi — klukkan er sú sama og á þjóninum, tóma ástandið teiknast,
// innskráningarlaus (401) borði er ósýnilegur, og merkið á þráðum Tölvupósta kemur úr sömu gögnum.
//   node --test test/vip-vakt-bord.test.cjs
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const V = require('../netlify/functions/_vip-postur.cjs');

function hlada(fetchSvar) {
  const kallad = [];
  const win = {
    console, setTimeout: () => 0, setInterval: () => 0, Date, JSON, Math, Map, Set, Promise, Number, String, Array, Object, isFinite,
    navigator: {}, document: { visibilityState: 'visible', addEventListener() {}, createElement: () => ({}) },
    fetch: async (u) => { kallad.push(u); const s = fetchSvar(u); return { ok: s.status === 200, status: s.status, json: async () => s.body }; },
  };
  win.window = win;
  vm.createContext(win);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../js/patches/513-vip-vakt.js'), 'utf8'), win);
  return { win, kallad };
}
const NU = Date.now();
const thradur = (min, o) => Object.assign({ k: 't' + min, bidur: true, account: 'eldklar@eldklar.is', gmail: true, felag: 'Leiga', felagKt: '1111111111', coId: 10, hvernig: 'lén', svartimi: 60,
  mottekid: new Date(NU - min * 60000).toISOString(), fra_nafn: 'Anna', fra: 'anna@leiga.example.is', efni: 'Spurning ' + min, snippet: 'Halló', message_id: '<m' + min + '>', mal_id: null }, o);
const gogn = (thr) => ({ ok: true, felog: [{ nafn: 'Leiga', radir: 2, svartimi: 60 }], thraedir: thr, svarad: [{ k: 'gamall', felag: 'Leiga' }], inntak: { lesarar: [], holf: [] } });

test('klukka borðans = klukka þjónsins á öllu bilinu 0–200 mín. og með 30 mín. svartíma', () => {
  const { win } = hlada(() => ({ status: 200, body: gogn([]) }));
  const nu = new Date(NU);
  for (let m = 0; m <= 200; m++) for (const sv of [60, 30]) {
    const mt = new Date(NU - m * 60000).toISOString();
    assert.strictEqual(win.VipVakt._klukka(mt, nu, sv).litur, V.klukka(mt, nu, sv).litur, m + ' mín / ' + sv);
    assert.strictEqual(win.VipVakt._lengd(m), V.lengd(m));
  }
});

test('borðinn: ósvaraðir þræðir með klukku og lit, Svara á Gmail, Uppkast á M365, óvíst merkt', () => {
  const { win } = hlada(() => ({ status: 200, body: {} }));
  win.VipVakt._setja(gogn([thradur(75), thradur(45, { account: 'slokkvitaeki@brunaholf.is', gmail: false, ovisst: 'slokkvitaeki@ ólesið' }), thradur(5)]));
  const h = win.VipVakt.html('Agnar');
  assert.match(h, /3 ósvarað · 1 yfir tíma/);
  assert.strictEqual((h.match(/data-vipk=/g) || []).length, 3);
  assert.match(h, /data-litur="rautt"[^>]*>⏱ 1 klst\. 15 mín\./);
  assert.match(h, /data-litur="gult"/); assert.match(h, /data-litur="graent"/);
  assert.match(h, /data-vip="svara"/); assert.match(h, /data-vip="uppkast"/);
  assert.match(h, /⚠ Óvíst hvort svarað/);
});

test('tómt: ein lína „ekkert ósvarað“; innskráning vantar (401): ekkert teiknað', async () => {
  const a = hlada(() => ({ status: 200, body: {} }));
  a.win.VipVakt._setja(gogn([]));
  assert.match(a.win.VipVakt.html('Agnar'), /ekkert ósvarað/);
  const b = hlada(() => ({ status: 401, body: { error: 'Innskráning starfsmanns vantar', need_login: true } }));
  b.win.VipVakt.html('Agnar');              // fyrsta kall ræsir sóknina
  await new Promise((r) => setImmediate(r)); await new Promise((r) => setImmediate(r));
  assert.strictEqual(b.win.VipVakt.html('Agnar'), '');
  assert.ok(b.kallad.some((u) => u === '/api/vip-postur'));
});

test('merki á þræði í Tölvupóstum: ósvarað fær klukku, svarað VIP fær dauft merki, annað ekkert', () => {
  const { win } = hlada(() => ({ status: 200, body: {} }));
  win.VipVakt._setja(gogn([thradur(10)]));
  assert.match(win.VipVakt.chipHtml('t10'), /⚡ VIP.*data-vipk="t10"/);
  assert.match(win.VipVakt.chipHtml('gamall'), /_svarad/);
  assert.strictEqual(win.VipVakt.chipHtml('annar'), '');
  assert.strictEqual(win.VipVakt.osvarad('t10'), true); assert.strictEqual(win.VipVakt.osvarad('gamall'), false);
});
