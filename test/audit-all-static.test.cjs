// Próf á --static-flokkun öryggisnetsins (17.11.2026). Keyrsla: node --test test/audit-all-static.test.cjs
//
// AF HVERJU: `--static` (pre-push-hookurinn og blokkerandi CI-þrepið) átti aðeins að keyra verði sem lesa
// KÓÐANN. Sían leit eingöngu eftir `fetch(` og hleypti þannig sjö gagnavörðum inn: einn sækir gögn um
// `node:https`, sex um sameiginlega hjálparann `_grunnlina-syn.cjs`. Gagnadrift (ósend krafa, gleymd skoðun …)
// felldi þá ýtingu kóða sem kom málinu ekkert við. Þetta próf hefði gripið það.
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const TOOLS = path.join(__dirname, '..', 'tools');
const { notarNet } = require(path.join(TOOLS, 'audit-all.cjs'));
const til = (f) => fs.existsSync(path.join(TOOLS, f));

test('gagnaverðir um node:https teljast EKKI kóða-verðir', () => {
  if (!til('audit-reikningstexti.cjs')) return;
  assert.strictEqual(notarNet('audit-reikningstexti.cjs'), true);
});

test('gagnaverðir um _grunnlina-syn.cjs (endurkvæmt) teljast EKKI kóða-verðir', () => {
  for (const f of ['audit-krafa-ekki-send.cjs', 'audit-kredit-an-endurgerdar.cjs', 'audit-skeytamidlun-vantar.cjs',
    'audit-skodun-gleymd.cjs', 'audit-taekjatolur-misraemi.cjs', 'audit-verk-an-reiknings.cjs']) {
    if (!til(f)) continue;
    assert.strictEqual(notarNet(f), true, f + ' les lifandi gögn um _grunnlina-syn.cjs');
  }
});

test('gervislóð í textastreng gerir vörð ekki að gagnaverði', () => {
  // Þessir nefna supabase.co eða SUPABASE_* en með gervigildum — þeir eru hreinir kóða-verðir.
  for (const f of ['audit-geocache-hemill.cjs', 'audit-sms-sjalfvirkt.cjs', 'audit-uttekt-afslattarhopur.cjs',
    'audit-vafrastada.cjs', 'audit-ein-heimild-krofur.cjs']) {
    if (!til(f)) continue;
    assert.strictEqual(notarNet(f), false, f + ' er kóða-vörður');
  }
});

test('hver vörður sem kallar fetch( beint er gagnavörður', () => {
  for (const f of fs.readdirSync(TOOLS).filter((x) => /^audit-.*\.cjs$/.test(x) && x !== 'audit-all.cjs')) {
    if (/fetch\s*\(/.test(fs.readFileSync(path.join(TOOLS, f), 'utf8'))) assert.strictEqual(notarNet(f), true, f);
  }
});

test('hjálpari án nets smitar ekki', () => {
  // _athugasemdir.cjs les aðeins kóðatexta; vörður sem notar hann (geocache-hemill) má ekki verða gagnavörður.
  if (til('_athugasemdir.cjs')) assert.strictEqual(notarNet('_athugasemdir.cjs'), false);
});

test('tímaút er endurkallað einu sinni og flökt fellir ekki netið', () => {
  // Gervi-öryggisnet í tímabundinni möppu. Hægi vörðurinn HANGIR í fyrstu keyrslu (býr til merkiskrá, bíður svo endalaust)
  // og svarar strax í endurkallinu (merkið er til) — óháð hraða vélarinnar. Fyrsta útgáfa prófsins svaf 1,2 s móti 0,6 s
  // fresti og flökti sjálf undir álagi (ræsing node > 1,8 s), sem er einmitt villan sem endurkallið á að lækna.
  // Áður (fastur 60 s frestur, ekkert endurkall) féll netið á slíku flökti.
  const os = require('node:os');
  const { spawnSync } = require('node:child_process');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'oryggisnet-'));
  const env = { ...process.env, AUDIT_FRESTUR_MS: '8000' };
  const haegur = (merki) => "const fs=require('fs');const m=" + JSON.stringify(merki) + ";" +
    "if(!fs.existsSync(m)){fs.writeFileSync(m,'1');setInterval(()=>{},1e9);}else{console.log('GRÆNT hægur');}";
  try {
    fs.copyFileSync(path.join(TOOLS, 'audit-all.cjs'), path.join(tmp, 'audit-all.cjs'));
    fs.writeFileSync(path.join(tmp, 'audit-haegur.cjs'), haegur(path.join(tmp, 'merki1')));
    fs.writeFileSync(path.join(tmp, 'audit-rautt.cjs'), "console.log('❌ RAUTT prufa');process.exit(1);");
    let r = spawnSync(process.execPath, [path.join(tmp, 'audit-all.cjs'), '--static'], { encoding: 'utf8', env });
    assert.match(r.stdout, /audit-haegur\.cjs\s+✅.*eftir tímaút — endurkallað/, r.stdout);
    assert.match(r.stdout, /audit-rautt\.cjs\s+❌/);
    assert.strictEqual(r.status, 1, 'raunverulegur rauður fellir enn netið');
    fs.unlinkSync(path.join(tmp, 'audit-rautt.cjs'));
    fs.writeFileSync(path.join(tmp, 'audit-haegur.cjs'), haegur(path.join(tmp, 'merki2')));
    r = spawnSync(process.execPath, [path.join(tmp, 'audit-all.cjs'), '--static'], { encoding: 'utf8', env });
    assert.strictEqual(r.status, 0, 'flökt eitt og sér fellir ekki netið: ' + r.stdout);
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});
