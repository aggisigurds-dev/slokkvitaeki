// Próf: þjónustusamningar í Þjónustugáttinni (Verkefnalisti 3ea52600, 17.11.2026). Keyrsla: node --test test/gatt-samningar.test.cjs
//
// AF HVERJU: Agnar 27.08: „would be good to have þjónustusamningar hér … linked from the companys profile like the others".
// Samningarnir lágu í customer_documents (doc_type 'samningur') en gáttin sýndi aðeins skýrslur og reikninga. Það sem má
// aldrei bila: samningur annars félags kemst aldrei í svarið (sama síun og skýrslur — docs er þegar síað á félagið), leigutaki
// sér enga samninga (eins og reikninga), tvítök sjást ekki, og PDF fer um gatt-doc (eignarhaldsprófun) — aldrei bein slóð.
// Föllin úr gatt/portal.js eru keyrð beint; öll gögn tilbúin (example).
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROT = path.join(__dirname, '..');
const PORTAL = fs.readFileSync(path.join(ROT, 'gatt/portal.js'), 'utf8');
const GATT = fs.readFileSync(path.join(ROT, 'netlify/functions/gatt.cjs'), 'utf8');

function fall(nafn) {
  const i = PORTAL.indexOf('function ' + nafn + '(');
  assert.ok(i >= 0, nafn + ' fannst ekki í gatt/portal.js');
  let k = PORTAL.indexOf('{', i), d = 0;
  for (; k < PORTAL.length; k++) {
    const c = PORTAL[k];
    if (c === "'" || c === '"') { const q = c; k++; while (k < PORTAL.length && PORTAL[k] !== q) { if (PORTAL[k] === '\\') k++; k++; } continue; }
    if (c === '/' && PORTAL[k + 1] === '/') { k = PORTAL.indexOf('\n', k); continue; }
    if (c === '{') d++;
    if (c === '}' && --d === 0) break;
  }
  return PORTAL.slice(i, k + 1);
}

test('bakendinn: samningar = doc_type samningur án tvítaka, PDF aðeins með docId, leigutaki fær enga', () => {
  assert.match(GATT, /const samningar = dedupeDocs\(docs\.filter\(\(d\) => d\.doc_type === 'samningur' && !d\.is_duplicate\)/);
  assert.match(GATT, /docId: \(d\.storage_path \|\| d\.drive_file_id\) \? d\.id : null/);
  assert.match(GATT, /samningar: leigutaki \? \[\] : samningar/);
  // `docs` er síað á félagið sjálft (filtQ) — samningarnir koma þaðan, ekki úr eigin fyrirspurn
  assert.ok(!/doc_type=eq\.samningur/.test(GATT), 'samningar mega ekki koma úr sérfyrirspurn framhjá félagssíuninni');
});

test('gatt-doc sannreynir eignarhald óháð tegund skjals (samningur opnast aðeins hjá eigin félagi)', () => {
  const doc = fs.readFileSync(path.join(ROT, 'netlify/functions/gatt-doc.cjs'), 'utf8');
  assert.match(doc, /SANNREYNIR að skjalið\s*\n?\/\/\s*tilheyri base_id|tilheyri base_id/);
  assert.ok(!/doc_type\s*(===|!==|in)/.test(doc), 'gatt-doc má ekki hvítlista tegundir — eignarhaldið ræður');
});

function skyrsluSamhengi(data, filter) {
  const html = { '#sk-body': '', '#sk-foot': '' };
  const ctx = {
    state: { data, demo: false },
    $: (s) => ({ get innerHTML() { return html[s]; }, set innerHTML(v) { html[s] = v; } }),
    esc: (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])),
    fmtDate: (d) => String(d || ''), skManTxt: (r) => String(r.dags || ''), vidbotHtml: () => '',
    tegundPilla: (t) => '<span class="tb">' + t + '</span>',
    docLink: (l, id) => '<a href="/api/gatt-doc?doc=' + id + '">' + l + '</a>',
    foot: () => {},
  };
  vm.createContext(ctx);
  vm.runInContext(fall('renderSkyrslur'), ctx);
  ctx.renderSkyrslur(filter);
  return html['#sk-body'];
}

test('Skjöl-sýnin: samningar eignarinnar koma á eftir skýrslunum, með PDF um gatt-doc', () => {
  const data = {
    reports: [{ docId: 11, dags: '2026-05-01', bygging: 'Prófgata 1', tegund: 'Slökkvitæki' }],
    samningar: [{ docId: 21, dags: '2025-01-15', bygging: 'Prófgata 1', heimilisfang: 'Prófgata 1, 101 Reykjavík' },
      { docId: 22, dags: '2024-03-01', bygging: 'Önnur gata 2', heimilisfang: '' },
      { docId: null, dags: '2023-01-01', bygging: 'Prófgata 1', heimilisfang: '' }],
  };
  const allt = skyrsluSamhengi(data, '');
  assert.strictEqual((allt.match(/class="sk-samn"/g) || []).length, 3);
  assert.ok(allt.indexOf('doc=11') < allt.indexOf('doc=21'), 'samningar á eftir skýrslunum');
  assert.match(allt, /Þjónustusamningur/);
  assert.match(allt, /skjal vantar/);   // samningur án skrár fær engan dauðan hlekk
  const sia = skyrsluSamhengi(data, 'Prófgata 1');
  assert.match(sia, /doc=21/);
  assert.ok(!/doc=22/.test(sia), 'samningur annarrar eignar má ekki koma í síaðri sýn');
});

test('Skjöl-sýnin: „Engar skýrslur skráðar" aðeins þegar hvorki skýrsla né samningur er til', () => {
  assert.match(skyrsluSamhengi({ reports: [], samningar: [] }, ''), /Engar skýrslur skráðar/);
  const bara = skyrsluSamhengi({ reports: [], samningar: [{ docId: 5, dags: '2025-01-01', bygging: 'X', heimilisfang: '' }] }, '');
  assert.ok(!/Engar skýrslur skráðar/.test(bara));
  assert.match(bara, /doc=5/);
});

test('heiti eigna samræmd: samningar fylgja eigninni eins og skýrslur og reikningar', () => {
  const ctx = { esc: (s) => s };
  vm.createContext(ctx);
  vm.runInContext(fall('gataSemHeiti'), ctx);
  const o = { account: { name: 'Dæmi ehf' },
    buildings: [{ nafn: 'Dæmi ehf', heimilisfang: 'Dæmigata 9, 110 Reykjavík' }, { nafn: 'Prófgata', heimilisfang: 'Prófgata 41' }],
    reports: [], invoices: [], samningar: [{ bygging: 'Dæmi ehf' }] };
  ctx.gataSemHeiti(o);
  assert.strictEqual(o.samningar[0].bygging, 'Dæmigata 9');
});

test('normalísering og eignasíðan bera samningana', () => {
  assert.match(PORTAL, /samningar: \(d\.samningar \|\| \[\]\)\.map\(function \(s\) \{ return \{ docId: s\.docId/);
  assert.match(PORTAL, /<h4>Þjónustusamningar <span class="cnt">/);
  const h = fs.readFileSync(path.join(ROT, 'gatt/index.html'), 'utf8');
  const m = /portal\.js\?v=(\d{8})/.exec(h);
  assert.ok(m && m[1] >= '20261117', 'útgáfumerki portal.js');
});
