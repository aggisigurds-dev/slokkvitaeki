// Próf: V4-útlit Þjónustuborðsins (26.11.2026) — rofinn [Boss | V2 | V4] og afmörkun V4-skinnsins.
//   node --test test/bord-thema-v4.test.cjs
//
// AF HVERJU (Agnar 26.11.2026: „Já, smíða V4"): V4 er V2-uppsetningin með dökku skinni (535). Það sem má ALDREI bila:
//   1. val notandans fer á ÞJÓNINN sem thjonustubord5.by_staff.<nafn>.thema = 'v4' (vélarnar eru fjórar);
//   2. V4 telst 'bh2' í thema() — eldri kallarar (368) sjá V2-uppsetninguna — en utgafa() greinir 'v4' frá 'bh2';
//   3. hýsillinn fær data-thema="bh2" + data-v4 í V4, aðeins data-thema í V2, hvorugt í Boss — í ÖLLUM sex skiptunum;
//   4. hver einasta V4-regla er undir :host([data-thema="bh2"][data-v4]) — Boss og V2 breytast ekki um eina línu.
// Engin gögn úr kerfinu (repóið er opinbert).
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROT = path.join(__dirname, '..');
const lesa = (s) => fs.readFileSync(path.join(ROT, s), 'utf8');

// Keyrir 535 + 507 í hreinu samhengi með gervi-AppSettings sem man það sem var vistað.
function umhverfi(opts = {}) {
  const geymt = {};
  const vistanir = [];
  const AppSettings = {
    path(k) { return k.split('.').reduce((o, x) => (o == null ? undefined : o[x]), geymt); },
    async save(obj) {
      vistanir.push(JSON.parse(JSON.stringify(obj)));
      if (opts.save) return opts.save(obj);
      const fletta = (a, b) => { for (const k of Object.keys(b)) { if (b[k] && typeof b[k] === 'object') { a[k] = a[k] || {}; fletta(a[k], b[k]); } else a[k] = b[k]; } };
      fletta(geymt, obj);
      return true;
    },
  };
  const head = { appendChild() {} };
  const document = { getElementById: () => ({}), createElement: () => ({}), head };
  const ctx = { AppSettings, document, console };
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(lesa('js/patches/535-bord-thema-v4.js'), ctx);
  vm.runInContext(lesa('js/patches/507-bord-thema-bh2.js'), ctx);
  return { T: ctx.ThbThemaBh2, V4: ctx.ThbThemaV4, vistanir, geymt };
}

function hysill() {
  const a = new Map();
  return {
    a,
    getAttribute: (k) => (a.has(k) ? a.get(k) : null),
    setAttribute: (k, v) => a.set(k, String(v)),
    removeAttribute: (k) => a.delete(k),
    hasAttribute: (k) => a.has(k),
    toggleAttribute(k, on) { if (on === undefined) on = !a.has(k); if (on) a.set(k, ''); else a.delete(k); return on; },
  };
}

const merki = (h) => ({ thema: h.getAttribute('data-thema'), v4: h.hasAttribute('data-v4') });
const ASTAND = {
  boss: { thema: null, v4: false },
  bh2: { thema: 'bh2', v4: false },
  v4: { thema: 'bh2', v4: true },
};

test('V4 vistast á þjóninum sem "v4" og thema()/utgafa() segja rétt', async () => {
  const { T, vistanir } = umhverfi();
  assert.equal(T.thema('Agnar'), '');
  assert.equal(T.utgafa('Agnar'), '');
  let teiknad = 0;
  const ok = await T.skipta('Agnar', 'v4', () => { teiknad++; });
  assert.equal(ok, true);
  assert.deepEqual(vistanir, [{ thjonustubord5: { by_staff: { Agnar: { thema: 'v4' } } } }]);
  assert.equal(T.thema('Agnar'), 'bh2', 'V4 er V2-uppsetning — eldri kallarar fá bh2');
  assert.equal(T.utgafa('Agnar'), 'v4');
  assert.ok(teiknad >= 1, 'rofinn teiknar strax');
  // Annar starfsmaður óbreyttur.
  assert.equal(T.utgafa('Anni'), '');
});

test('Öll sex skiptin Boss ↔ V2 ↔ V4 vista og stilla hýsilinn rétt', async () => {
  const leidir = [['boss', 'bh2'], ['bh2', 'v4'], ['v4', 'boss'], ['boss', 'v4'], ['v4', 'bh2'], ['bh2', 'boss']];
  for (const [fra, til] of leidir) {
    const { T, vistanir } = umhverfi();
    const h = hysill();
    if (fra !== 'boss') await T.skipta('Agnar', fra);
    T.stilla(h, 'Agnar');
    assert.deepEqual(merki(h), ASTAND[fra], 'upphafsstaða ' + fra);
    const fyrir = vistanir.length;
    const ok = await T.skipta('Agnar', til);
    assert.equal(ok, true, fra + '→' + til);
    assert.equal(vistanir.length, fyrir + 1, fra + '→' + til + ' á að vista (V2↔V4 má ekki stöðvast á gamla bh2-samanburðinum)');
    assert.equal(vistanir[vistanir.length - 1].thjonustubord5.by_staff.Agnar.thema, til);
    T.stilla(h, 'Agnar');
    assert.deepEqual(merki(h), ASTAND[til], fra + '→' + til);
  }
});

test('Sama val aftur vistar ekki', async () => {
  const { T, vistanir } = umhverfi();
  await T.skipta('Agnar', 'v4');
  await T.skipta('Agnar', 'v4');
  assert.equal(vistanir.length, 1);
});

test('Rofinn hefur þrjá takka og V4 er þrýstur þegar V4 er valið', async () => {
  const { T } = umhverfi();
  await T.skipta('Agnar', 'v4');
  const html = T.rofi('Agnar');
  const takkar = [...html.matchAll(/data-v="([a-z0-9]+)" aria-pressed="(true|false)"/g)].map((m) => m[1] + ':' + m[2]);
  assert.deepEqual(takkar, ['boss:false', 'bh2:false', 'v4:true']);
  assert.match(html, /data-t5="thema"/, '368 hlustar á data-t5="thema"');
});

test('Biðval: V4 sýnist strax áður en þjónninn svarar, og hverfur ef vistun mistekst', async () => {
  let leysa;
  const { T } = umhverfi({ save: () => new Promise((r) => { leysa = r; }) });
  const h = hysill();
  const p = T.skipta('Agnar', 'v4', () => T.stilla(h, 'Agnar'));
  assert.equal(T.utgafa('Agnar'), 'v4', 'biðvalið gildir strax');
  assert.deepEqual(merki(h), ASTAND.v4, 'hýsillinn skiptir strax');
  leysa(false);                     // þjónninn neitar
  assert.equal(await p, false);
  assert.equal(T.utgafa('Agnar'), '', 'mistókst → aftur í Boss');
  assert.deepEqual(merki(h), ASTAND.boss, 'og hýsillinn með');
});

test('Hver einasta V4-regla er afmörkuð við :host([data-thema="bh2"][data-v4])', () => {
  const { V4, T } = umhverfi();
  const css = V4.css();
  const V = ':host([data-thema="bh2"][data-v4])';
  // Fletjum @container/@media: tökum innihald þeirra og prófum hverja reglu.
  const reglur = [];
  const ganga = (txt) => {
    let i = 0;
    while (i < txt.length) {
      const opn = txt.indexOf('{', i);
      if (opn < 0) break;
      const sel = txt.slice(i, opn).trim();
      // finnum samsvarandi lokun
      let d = 1, j = opn + 1;
      while (j < txt.length && d) { if (txt[j] === '{') d++; else if (txt[j] === '}') d--; j++; }
      const innra = txt.slice(opn + 1, j - 1);
      if (sel.startsWith('@')) ganga(innra);
      else reglur.push(sel);
      i = j;
    }
  };
  ganga(css);
  assert.ok(reglur.length > 150, 'V4 á að hafa margar reglur (' + reglur.length + ')');
  for (const sel of reglur) {
    // Skiptum á kommum utan sviga (selector-listi).
    let d = 0, byrjun = 0;
    const hlutar = [];
    for (let k = 0; k < sel.length; k++) {
      const c = sel[k];
      if (c === '(') d++; else if (c === ')') d--; else if (c === ',' && d === 0) { hlutar.push(sel.slice(byrjun, k)); byrjun = k + 1; }
    }
    hlutar.push(sel.slice(byrjun));
    for (const h of hlutar) assert.ok(h.trim().startsWith(V), 'óafmörkuð V4-regla: ' + h.trim().slice(0, 120));
  }
  // 507 skilar V4 aftast í yfirlagi sínu (svo V4 gangi framar V2-reglum með sömu sértækni).
  const allt = T.css();
  assert.ok(allt.endsWith(css), 'V4 á að vera aftast í ThbThemaBh2.css()');
});

test('V2-yfirlagið sjálft er óbreytt að efni (aðeins V4 bætist aftast)', () => {
  const { T, V4 } = umhverfi();
  const allt = T.css();
  const v2 = allt.slice(0, allt.length - V4.css().length);
  assert.ok(!v2.includes('[data-v4]'), 'V2-hlutinn má ekki vísa í data-v4');
  assert.match(v2, /\.seg\.modeseg\{flex:1 1 auto;/, 'V2 heldur breidd hamaraðarinnar (samthykkja-snooze.test)');
});

test('index.html hleður 535 á undan 507 og 507 á undan 368', () => {
  const html = lesa('index.html');
  const i535 = html.indexOf('/js/patches/535-bord-thema-v4.js?v=');
  const i507 = html.indexOf('/js/patches/507-bord-thema-bh2.js?v=');
  const i368 = html.indexOf('/js/patches/368-thjonustubord5.js?v=');
  assert.ok(i535 > 0 && i507 > 0 && i368 > 0, 'allar þrjár skriftur í index.html með ?v=');
  assert.ok(i535 < i507 && i507 < i368, 'röðin 535 → 507 → 368 (368 les CSS-ið einu sinni þegar skuggarótin verður til)');
});
