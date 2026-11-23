'use strict';
/* Breytt hnit berast á ALLAR vélar (Agnar 23.11.2026: „svo þetta geti virkað og vistast allstaðar“).
 * Hleður raunverulegu skrána (156) í vm með gervi-vafra og prófar `GeocodePrewarm.saekjaBreytt()` á hegðun, ekki á stöfum. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const SRC = fs.readFileSync(path.join(__dirname, '..', 'js', 'patches', '156-geocode-prewarm.js'), 'utf8');

function umhverfi(opt) {
  opt = opt || {};
  const geymsla = Object.assign({}, opt.geymsla || {});
  const kall = [];
  const timers = [];
  const listeners = {};
  const window = {
    SUPABASE_URL: 'https://x.supabase.co', SUPABASE_KEY: 'k',
    addEventListener() {},
    Leidsogn: { refresh() { window._lRef = (window._lRef || 0) + 1; } },
  };
  const document = { hidden: !!opt.falid, addEventListener(n, f) { listeners[n] = f; } };
  const fetch = async (url, init) => {
    kall.push({ url, init });
    const svar = opt.svor ? opt.svor.shift() : null;
    if (svar instanceof Error) throw svar;
    if (svar && svar.status) return { ok: false, status: svar.status, json: async () => ({}) };
    return { ok: true, status: 200, json: async () => (svar || []) };
  };
  const ctx = {
    window, document, fetch, console: { log() {}, warn() {}, error() {} },
    setTimeout: (f, ms) => { timers.push({ f, ms }); return timers.length; }, clearTimeout() {},
    localStorage: { getItem: (k) => (k in geymsla ? geymsla[k] : null), setItem: (k, v) => { geymsla[k] = String(v); }, removeItem: (k) => { delete geymsla[k]; } },
    Date, JSON, Math, Array, Object, Number, String, isFinite, encodeURIComponent, Promise, Error, Map, Set,
  };
  vm.runInNewContext(SRC, ctx, { filename: '156-geocode-prewarm.js' });
  return { G: window.GeocodePrewarm, window, document, geymsla, kall, timers, listeners, gc: () => JSON.parse(geymsla._slokk_gc || '{}') };
}

const NYTT = { query: '__co__:424', lat: 64.1334000838826, lng: -21.9042216365276, display_name: null, updated_at: '2026-11-23T16:04:30.787731+00:00' };

test('vél sem átti GAMLAN pinna fær nýja pinnann (staðbundið vann áður alltaf)', async () => {
  const h = umhverfi({ geymsla: { _slokk_gc: JSON.stringify({ '__co__:424': { lat: 64.1, lng: -21.9, display_name: 'gamall' }, 'Annað 1': { lat: 64.2, lng: -21.8 } }) }, svor: [[NYTT]] });
  const u = await h.G.saekjaBreytt();
  assert.equal(u.ok, true);
  assert.equal(u.breytt, 1);
  const gc = h.gc();
  assert.equal(gc['__co__:424'].lat, NYTT.lat);
  assert.equal(gc['__co__:424'].lng, NYTT.lng);
  assert.equal(gc['Annað 1'].lat, 64.2, 'óskyldir lyklar haldast');
  assert.equal(h.window._lRef, 1, 'opið kort er endurteiknað');
});

test('beiðnin er aðeins „nýrra en stimpillinn“ — fyrsta sinn frá upphafsdegi, síðan frá vistuðum stimpli', async () => {
  const h = umhverfi({ svor: [[NYTT], []] });
  await h.G.saekjaBreytt();
  assert.match(h.kall[0].url, /\/rest\/v1\/geocode_cache\?select=query,lat,lng,display_name,updated_at&updated_at=gt\.2026-11-23T00%3A00%3A00%2B00%3A00&order=updated_at\.asc,query\.asc&limit=1000&offset=0$/);
  assert.equal(h.kall[0].init.headers.apikey, 'k');
  // stimpillinn = nýjasta röð − 10 s (röð úr langri færslu sem lauk seint tapast ekki)
  assert.equal(h.geymsla._slokk_gc_stamp, new Date(Date.parse('2026-11-23T16:04:30.787Z') - 10000).toISOString());
  await h.G.saekjaBreytt();
  assert.ok(h.kall[1].url.includes('updated_at=gt.' + encodeURIComponent(h.geymsla._slokk_gc_stamp)), 'önnur umferð notar vistaða stimpilinn');
});

test('óbreytt hnit (sama röð sótt aftur) telst ekki breyting og kortið er ekki endurteiknað', async () => {
  const h = umhverfi({ geymsla: { _slokk_gc: JSON.stringify({ '__co__:424': { lat: NYTT.lat, lng: NYTT.lng, display_name: null } }) }, svor: [[NYTT]] });
  const u = await h.G.saekjaBreytt();
  assert.equal(u.ok, true);
  assert.equal(u.breytt, 0);
  assert.equal(h.window._lRef, undefined);
});

test('ný vél (tómt localStorage) fær nýju hnitin og heldur nafni sem fylgdi', async () => {
  const h = umhverfi({ svor: [[{ ...NYTT, display_name: 'Stigahlíð 6' }]] });
  const u = await h.G.saekjaBreytt();
  assert.equal(u.breytt, 1);
  assert.equal(h.gc()['__co__:424'].display_name, 'Stigahlíð 6');
});

test('bilun (HTTP 401/500 og netvilla) hreyfir hvorki stimpil né gögn og kastar ekki', async () => {
  for (const svar of [{ status: 401 }, { status: 500 }, new Error('net')]) {
    const h = umhverfi({ geymsla: { _slokk_gc: JSON.stringify({ a: { lat: 1, lng: 2 } }), _slokk_gc_stamp: '2026-11-23T10:00:00.000Z' }, svor: [svar] });
    const u = await h.G.saekjaBreytt();
    assert.equal(u.ok, false);
    assert.equal(h.geymsla._slokk_gc_stamp, '2026-11-23T10:00:00.000Z');
    assert.deepEqual(h.gc(), { a: { lat: 1, lng: 2 } });
  }
});

test('röð með ógild hnit er hunsuð en stimpillinn heldur áfram', async () => {
  const h = umhverfi({ svor: [[{ query: 'x', lat: null, lng: 1, updated_at: '2026-11-23T17:00:00+00:00' }, { query: 'y', lat: 'a', lng: 1, updated_at: '2026-11-23T17:00:01+00:00' }, NYTT]] });
  const u = await h.G.saekjaBreytt();
  assert.equal(u.breytt, 1);
  assert.deepEqual(Object.keys(h.gc()), ['__co__:424']);
});

test('síðuskipting: 1000 raðir → næsta síða með offset, sami stimpill á báðum síðum', async () => {
  const síða1 = Array.from({ length: 1000 }, (_, i) => ({ query: 'k' + i, lat: 64 + i / 1e5, lng: -21, updated_at: '2026-11-23T16:00:00+00:00' }));
  const h = umhverfi({ svor: [síða1, [NYTT]] });
  const u = await h.G.saekjaBreytt();
  assert.equal(u.lesid, 1001);
  assert.match(h.kall[1].url, /offset=1000$/);
  assert.equal(h.kall[0].url.split('updated_at=gt.')[1].split('&')[0], h.kall[1].url.split('updated_at=gt.')[1].split('&')[0]);
});

test('tvö kall í einu deila einni beiðni; ræsing eftir 4 s og aftur þegar flipinn birtist eftir hlé', async () => {
  const h = umhverfi({ svor: [[NYTT], [], []] });
  const p1 = h.G.saekjaBreytt(), p2 = h.G.saekjaBreytt();
  await Promise.all([p1, p2]);
  assert.equal(h.kall.length, 1, 'samtímis kall sameinast');
  const boot = h.timers.find((t) => t.ms === 4000);
  assert.ok(boot, 'ræsing 4 s eftir load');
  h.listeners.visibilitychange();   // < 5 mín. frá síðustu umferð → engin ný beiðni
  assert.equal(h.kall.length, 1);
});

test('falinn flipi við ræsingu: engin beiðni þá, en næsta birting sækir', async () => {
  const h = umhverfi({ falid: true, svor: [[NYTT]] });
  h.timers.find((t) => t.ms === 4000).f();
  assert.equal(h.kall.length, 0, 'falinn flipi sækir ekki við ræsingu');
  h.document.hidden = false;
  h.listeners.visibilitychange();   // birtist: ræsing gekk ekki, svo engin 5 mín. bið
  await new Promise((r) => setImmediate(r));
  assert.equal(h.kall.length, 1);
});

test('sækir EKKI /api/geocode og er óháð _cancelled (431 má ekki drepa þetta)', () => {
  const m = /async function saekjaBreytt|function saekjaBreytt\(\) \{[\s\S]*?\n  \}\n/.exec(SRC);
  assert.ok(m, 'saekjaBreytt fannst ekki');
  assert.equal(/api\/geocode|_cancelled/.test(m[0]), false);
  assert.match(m[0], /rest\/v1\/geocode_cache/);
});

test('vörn gegn endurtekinni gömlu hegðun: staðbundið vinnur ekki lengur fyrir BREYTT hnit (en enn fyrir óbreytt)', async () => {
  const h = umhverfi({ geymsla: { _slokk_gc: JSON.stringify({ 'Stigahlíð 10, 105 Reykjavík': { lat: 64.1, lng: -21.9 } }) }, svor: [[NYTT]] });
  await h.G.saekjaBreytt();
  const gc = h.gc();
  assert.ok(gc['Stigahlíð 10, 105 Reykjavík'], 'gamli heimilisfangslykillinn er ekki snertur (hann bar annað heimilisfang)');
  assert.equal(gc['__co__:424'].lat, NYTT.lat);
});

test('magnupphleðsla staðbundinna hnita (syncLocalToShared) má aldrei yfirskrifa töfluna — annars dreifist gamall pinni á allar vélar', () => {
  const m = /async function syncLocalToShared\(\) \{[\s\S]*?\n  \}\n/.exec(SRC);
  assert.ok(m, 'syncLocalToShared fannst ekki');
  const kod = m[0].replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  assert.match(kod, /Prefer: 'resolution=ignore-duplicates'/);
  assert.equal(/merge-duplicates/.test(kod), false);
});

