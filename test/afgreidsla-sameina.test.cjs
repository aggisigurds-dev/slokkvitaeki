// Próf á rökfræði 'sameina'-tegundarinnar (netlify/functions/_afgreidsla-sameina.cjs). Keyrsla:
//   node --test test/afgreidsla-sameina.test.cjs
//
// Það sem má ALDREI bila:
//   1. „Sameina og birta" verður óvirkt (urelt) ef verkið er ekki lengur í yfirferð eða sameining er þegar í gangi;
//   2. skjáskot-slóð verður aðeins að mynd ef hún er https (aldrei data:/javascript:/annar vefur);
//   3. höfnun skrifar feedback OG setur verkið aftur í 'beidni' á assigned_agent 'vakt' (vaktin les feedback fyrst næst);
//   4. „Sameina og birta" skrifar beiðni í automation_triggers með réttum workflow og gögnum.
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const SAM = require('../netlify/functions/_afgreidsla-sameina.cjs');

// Inndælt `lesa(qs)`: svarar eftir töflu í fyrirspurninni.
function lesaMed({ verk = [], trig = [] } = {}) {
  return (qs) => {
    if (/^verkefnalisti/.test(qs)) return Promise.resolve(verk);
    if (/^automation_triggers/.test(qs)) return Promise.resolve(trig);
    return Promise.resolve([]);
  };
}
const gott = { verk_id: 'abc-123', grein: 'vakt/abc123', vefur: 'slokkvitaeki', lysing: 'Bætti við línu', sannprof: 'node --test, fail 0' };

test('athuganir: verk í yfirferð, engin sameining í gangi → allt ok, ekki úrelt', async () => {
  const r = await SAM.sameinaAthuganir(gott, lesaMed({ verk: [{ status: 'i_yfirferd', title: 'x' }] }));
  assert.strictEqual(r.urelt, null);
  assert.ok(r.a.every((x) => x.ok), 'allar athuganir í lagi: ' + JSON.stringify(r.a));
});

test('athuganir: verk ekki lengur í yfirferð → úrelt', async () => {
  const klarad = await SAM.sameinaAthuganir(gott, lesaMed({ verk: [{ status: 'klarad' }] }));
  assert.match(klarad.urelt, /þegar klárað/);
  const beidni = await SAM.sameinaAthuganir(gott, lesaMed({ verk: [{ status: 'beidni' }] }));
  assert.match(beidni.urelt, /ekki lengur í yfirferð/);
  const horfid = await SAM.sameinaAthuganir(gott, lesaMed({ verk: [] }));
  assert.match(horfid.urelt, /finnst ekki/);
});

test('athuganir: sameining þegar í gangi → úrelt (engin tvísending)', async () => {
  const r = await SAM.sameinaAthuganir(gott, lesaMed({ verk: [{ status: 'i_yfirferd' }], trig: [{ id: 9, status: 'running' }] }));
  assert.match(r.urelt, /þegar í gangi/);
});

test('athuganir: grein verður að vera vakt/… (aldrei master), gildur vefur', async () => {
  const vont = await SAM.sameinaAthuganir({ verk_id: 'v', grein: 'master', vefur: 'uu' }, lesaMed({ verk: [{ status: 'i_yfirferd' }] }));
  const greinOk = vont.a.find((x) => /^Grein/.test(x.texti));
  const vefOk = vont.a.find((x) => /^Vefur/.test(x.texti));
  assert.strictEqual(greinOk.ok, false, 'master er ekki gild vakt-grein');
  assert.strictEqual(vefOk.ok, false, 'óþekktur vefur');
  const ngrein = await SAM.sameinaAthuganir({ grein: 'vakt/x', vefur: 'slokkvitaeki' }, lesaMed({}));
  assert.match(ngrein.urelt, /verk_id vantar/);
});

test('synilegt: skjáskot aðeins https; hættulegar slóðir verða null', () => {
  assert.strictEqual(SAM.synilegt({ skjaskot_url: 'javascript:alert(1)' }).skjaskot_url, null);
  assert.strictEqual(SAM.synilegt({ skjaskot_url: 'http://x/y.png' }).skjaskot_url, null);
  assert.strictEqual(SAM.synilegt({ skjaskot_url: '//annar/x.png' }).skjaskot_url, null);
  assert.strictEqual(SAM.synilegt({ skjaskot_url: 'data:image/png;base64,AAAA' }).skjaskot_url, null);
  const s = SAM.synilegt(gott);
  assert.strictEqual(s.skjaskot_url, null, 'engin skjáskot-slóð í gögnunum → null');
  const med = SAM.synilegt(Object.assign({}, gott, { skjaskot_url: 'https://x.supabase.co/storage/v1/object/public/verkefnalisti/result/1.png' }));
  assert.match(med.skjaskot_url, /^https:\/\//);
  assert.strictEqual(med.grein, 'vakt/abc123');
  assert.ok(med.verk_slod && /verkefnalisti\.html/.test(med.verk_slod.url));
});

test('triggerBody: réttur workflow + gögn fyrir sameininguna', () => {
  const b = SAM.triggerBody(gott, 'Agnar', 42);
  assert.strictEqual(b.workflow, 'verkefna-sameina');
  assert.strictEqual(b.status, 'bida');
  assert.deepStrictEqual(b.gogn, { verk_id: 'abc-123', grein: 'vakt/abc123', vefur: 'slokkvitaeki', afgreidsla_id: 42 });
  assert.match(b.requested_by, /^afgreidsla:Agnar/);
});

test('hafnaFeedback: feedback bætist tímastimplað, verk aftur í beidni á assigned_agent vakt', () => {
  const nu = new Date('2026-11-16T19:30:00Z');
  const r = SAM.hafnaFeedback({ feedback: '[eldra] gamalt' }, 'Verðið á að vera 120.000', 'Agnar', nu);
  assert.match(r.feedback, /\[eldra\] gamalt\n\[2026-11-16 19:30\] Hafnað á borðinu \(Agnar\): Verðið á að vera 120\.000/);
  assert.deepStrictEqual(r.patch, { feedback: r.feedback, status: 'beidni', assigned_agent: 'vakt' });
  // tóm athugasemd fær skiljanlegan texta, ekki tómt
  assert.match(SAM.hafnaFeedback({}, '', 'Agnar', nu).feedback, /\(engin athugasemd\)/);
});

test('adalgrein: brunaholf→main, annars master', () => {
  assert.strictEqual(SAM.adalgrein('brunaholf'), 'main');
  assert.strictEqual(SAM.adalgrein('slokkvitaeki'), 'master');
  assert.strictEqual(SAM.adalgrein(undefined), 'master');
});
