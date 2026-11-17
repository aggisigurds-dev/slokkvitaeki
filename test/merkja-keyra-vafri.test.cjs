// Próf: vafrahluti „Merkja og keyra“ (js/patches/519-merkja-keyra.js) í vm, eins og test/bord-afgreidsla.test.cjs gerir við 511.
//   node --test test/merkja-keyra-vafri.test.cjs
// Það sem má ALDREI bila (óháð rýni 17.11.2026):
//   · 401 / 403 / 500 / netvilla → EIN fyrirspurn, ekki endalaus lykkja (teikna → html → hlada → teikna …);
//     mælt fyrir lagfæringu: 400 fyrirspurnir og 400 endurteikningar á 250 ms;
//   · lokað (401/403) er sagt í einni línu, ekki þagað; villa líka; ný tilraun aðeins eftir mínútu;
//   · merkið og glugginn: aðeins hjá Agnari og aðeins þegar þjónninn hleypti inn; 8 hök; texti úr gögnum afmáður.
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const SKRA = path.join(__dirname, '..', 'js', 'patches', '519-merkja-keyra.js');
const KODI = fs.readFileSync(SKRA, 'utf8');
const bida = (ms) => new Promise((r) => setTimeout(r, ms));

// Hleður 519 ferska. `svar` = () → { status, json } eða kastar (netvilla). Thjonustubord5.render kallar html() eins og 368
// gerir í hverri teikningu — þannig kæmi lykkjan fram. Endurteikningar eru taldar og stöðvaðar við 500 (öryggisventill prófsins).
function hlada(svar, { nu = 'Agnar' } = {}) {
  const kollud = [], tal = { teikn: 0 }, tost = [];
  const heimur = { setTimeout, clearTimeout, console, Date, Promise, JSON, Math, Object, Array, Map, Set, String, Number };
  heimur.window = heimur;
  heimur.setInterval = () => 0; heimur.clearInterval = () => {};
  heimur.document = { hidden: false, addEventListener() {}, getElementById: () => ({ classList: { contains: () => true } }) };
  heimur.fetch = (url, opts) => {
    kollud.push({ url, method: (opts && opts.method) || 'GET', body: opts && opts.body ? JSON.parse(opts.body) : null });
    let s; try { s = svar(url, opts); } catch (e) { return Promise.reject(e); }
    return Promise.resolve({ status: s.status, json: () => Promise.resolve(s.json) });
  };
  heimur.Samthykkja = { nu: () => nu };
  heimur.Bord368 = { toast: (t, v) => tost.push({ t, v: !!v }), root: () => null };
  heimur.Thjonustubord5 = { render: () => { if (++tal.teikn > 500) return; heimur.MerkjaKeyra.html(nu); } };
  vm.runInNewContext(KODI, heimur, { filename: SKRA });
  return { MK: heimur.MerkjaKeyra, kollud, tal, tost, heimur };
}
const GOGN = (yfir) => Object.assign({ ok: true, claude_virkt: true, merkingar: [
  { id: 1, mal_id: 11, merki: 'veit_ekki', stada: 'merkt', heiti: 'Veit ekki' },
  { id: 2, mal_id: 12, merki: 'snooze', stada: 'blundar', due_at: '2026-11-20T08:00:00Z' },
  { id: 3, mal_id: 13, merki: 'keyra', stada: 'vantar_svar', umferd: 'u1', astaeda: '<img src=x onerror=alert(1)>', mal_titill: '<b>titill</b>' }],
  teljari: { merkt: 1, i_keyrslu: 0, klarad: 0, vantar_svar: 1, blundar: 1, umferd: 'u1', buin: true, lokid_at: '2026-11-17T21:00:00Z' } }, yfir || {});

for (const [heiti, svar, vaent] of [
  ['401 (ekki innskráður)', () => ({ status: 401, json: { error: 'Innskráning' } }), /aðeins fyrir innskráðan stjórnanda \(401\)/],
  ['403 (annað hlutverk valdi „Ég er: Agnar“)', () => ({ status: 403, json: { error: 'Admin' } }), /aðeins fyrir innskráðan stjórnanda \(403\)/],
  ['500 (fallið brást)', () => ({ status: 500, json: { error: 'Supabase 500' } }), /náði ekki í merkingarnar: Supabase 500/],
  ['503 (hliðið hikstar)', () => ({ status: 503, json: {} }), /náði ekki í merkingarnar: Villa 503/],
  ['netvilla', () => { throw new Error('Failed to fetch'); }, /Netvilla: Failed to fetch/],
]) {
  test('#1 ' + heiti + ' → EIN fyrirspurn og ein lína á skjánum, engin lykkja', async () => {
    const { MK, kollud, tal } = hlada(svar);
    MK.html('Agnar');                 // fyrsta teikning borðsins
    await bida(250);
    assert.strictEqual(kollud.length, 1, 'fyrirspurnir: ' + kollud.length + ' (endurteikningar ' + tal.teikn + ')');
    assert.ok(tal.teikn <= 2, 'endurteikningar: ' + tal.teikn);
    const h = MK.html('Agnar');
    assert.match(h, vaent);
    assert.strictEqual(kollud.length, 1, 'teikning strax á eftir sækir ekki aftur');
    assert.strictEqual(MK.merki({ id: 11 }), '', 'ekkert merki á línum án aðgangs');
    // Ný tilraun eftir mínútu — ein
    MK.S.sott = Date.now() - 61000;
    MK.html('Agnar'); await bida(50);
    assert.strictEqual(kollud.length, 2);
  });
}

test('200: ein fyrirspurn; teljari, ▶ Keyra og ljós; merkið á línum; texti úr gögnum afmáður', async () => {
  const { MK, kollud, tal } = hlada(() => ({ status: 200, json: GOGN() }));
  MK.html('Agnar'); await bida(250);
  assert.strictEqual(kollud.length, 1);
  assert.ok(tal.teikn <= 2);
  assert.strictEqual(kollud[0].url, '/api/afgreidsla?merkingar=1');
  const h = MK.html('Agnar');
  assert.match(h, /<b>1<\/b>merkt/); assert.match(h, /<b>1<\/b>vantar svör/);
  assert.match(h, /data-t5="mk-keyra"[^>]*>▶ Keyra \(1\)/);
  assert.match(h, /mk-led" data-l="buin_vs"/, 'ljósið: umferð búin, vantar svör');
  assert.ok(!/<img src=x/.test(h) && !/<b>titill<\/b>/.test(h), 'texti úr gögnunum má aldrei verða að HTML');
  assert.match(MK.merki({ id: 11 }), /data-t5="mk-opna" data-id="11" data-s="merkt"[^>]*>\?<\/button>/);
  assert.match(MK.merki({ id: 12 }), /💤 20\.11/);
  assert.match(MK.merki({ id: 99 }), />◇<\/button>/, 'ómerkt lína fær lágstemmt ◇');
});

test('glugginn: opnast undir línunni með 8 hökum; snooze býður dagsetningar (engin innsláttur); comment valfrjálst', async () => {
  const { MK } = hlada(() => ({ status: 200, json: GOGN() }));
  MK.html('Agnar'); await bida(100);
  const el = (t5, id, v) => ({ dataset: Object.assign({ t5, id: String(id) }, v ? { v } : {}) });
  assert.strictEqual(MK.gluggi({ id: 99 }), '', 'lokaður þar til smellt er');
  MK.smellur(el('mk-opna', 99));
  const g = MK.gluggi({ id: 99 });
  for (const v of ['ja', 'nei', 'keyra', 'snooze', 'veit_ekki', 'rannsaka', 'comment', 'yfirfara']) assert.match(g, new RegExp('data-v="' + v + '"'));
  assert.ok(!/<textarea/.test(g), 'enginn textareitur nema beðið sé um comment');
  MK.smellur(el('mk-merki', 99, 'snooze'));
  const gs = MK.gluggi({ id: 99 });
  assert.strictEqual((gs.match(/data-t5="mk-snooze"/g) || []).length, 4);
  assert.match(gs, /type="date" data-mk-dags="99"/);
  MK.smellur(el('mk-merki', 99, 'comment'));
  assert.match(MK.gluggi({ id: 99 }), /<textarea data-mk="ath" data-id="99"/);
});

test('aðrir en Agnar: ekkert teiknað og ekkert sótt', async () => {
  const { MK, kollud } = hlada(() => ({ status: 200, json: GOGN() }), { nu: 'Anni' });
  assert.strictEqual(MK.html('Anni'), '');
  await bida(50);
  assert.strictEqual(kollud.length, 0);
  assert.strictEqual(MK.merki({ id: 11 }), '');
});
