// Heildarpróf á rukkunar-eftirlits-hluta payday-sync-cron.cjs með gervi-fetch (enginn póstur sendur, ekkert net).
// Keyrt með: node tools/_test-payday-sync-cron-eftirlit.cjs
const assert = require('assert');
process.env.SUPABASE_URL = 'https://x.test';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'k';
process.env.URL = 'https://app.test';
const { handler } = require('../netlify/functions/payday-sync-cron.cjs');

const mk = (voidNum) => ({
  doc_nr_a_fleiri_felog: { alls: 0, daemi: [] }, tvinotud_num: { alls: 0, daemi: [] }, rukkad_ekki_final: { alls: 0, daemi: [] },
  void_greitt: { alls: voidNum.length, daemi: voidNum.map(n => ({ num: n })) },
  byte_eins_tvitok: { alls: 0, daemi: [] }, rukkad_an_kt: 0, rukkad_an_netfangs: { alls: 0, daemi: [] },
  felog_an_afhendingar: 0, greitt_sidar_gamalt: { alls: 0, daemi: [] }, sott_ekki_final: { alls: 0, daemi: [] },
});

async function keyra({ eftirlit, state, rpcAlltOk = true, postOk = true, kvLesOk = true }) {
  const log = { posts: [], kvWrites: [], runs: [] };
  global.fetch = async (url, init) => {
    init = init || {};
    const ok = (body, status) => ({ ok: (status || 200) < 400, status: status || 200, json: async () => body, text: async () => JSON.stringify(body) });
    if (url.includes('/api/payday-sync-paid') || url.includes('/api/payday-pull-slokk')) return ok({});
    if (url.includes('/rpc/rukkun_eftirlit_allt')) return rpcAlltOk ? ok(eftirlit) : ok({ error: 'x' }, 404);
    if (url.includes('/rpc/rukkun_eftirlit')) return ok(eftirlit);
    if (url.includes('/rest/v1/app_kv?key=eq.')) return kvLesOk ? ok(state ? [{ value: state }] : []) : ok({}, 500);
    if (url.includes('/rest/v1/app_kv')) { log.kvWrites.push(JSON.parse(init.body)[0]); return ok({}); }
    if (url.includes('/api/email-send')) { const b = JSON.parse(init.body); log.posts.push(b); return postOk ? ok({}) : ok({ error: 'hafnad' }, 500); }
    if (url.includes('/rest/v1/automation_runs')) { log.runs.push(JSON.parse(init.body)[0]); return ok({}); }
    throw new Error('óvænt kall: ' + url);
  };
  const r = await handler();
  return Object.assign(log, { status: r.statusCode });
}

(async () => {
  let n = 0; const t = async (nafn, f) => { await f(); n++; console.log('  ✔', nafn); };
  console.log('payday-sync-cron · rukkunar-eftirlit');
  let state = null;
  await t('fyrsta keyrsla: grunnlína-póstur og samanburður vistaður', async () => {
    const l = await keyra({ eftirlit: mk(['R-1', 'R-2']), state: null });
    assert.strictEqual(l.posts.length, 1); assert.ok(l.posts[0].subject.includes('grunnlína'));
    assert.strictEqual(l.kvWrites.length, 1); state = l.kvWrites[0].value;
    assert.ok(/eftirlit: grunnlina/.test(l.runs[0].detail));
  });
  await t('sama staða aftur: enginn póstur', async () => {
    const l = await keyra({ eftirlit: mk(['R-1', 'R-2']), state });
    assert.strictEqual(l.posts.length, 0); assert.ok(/eftirlit: ekkert/.test(l.runs[0].detail));
  });
  await t('nýtt atriði: aðeins það nýja í póstinum', async () => {
    const l = await keyra({ eftirlit: mk(['R-1', 'R-2', 'R-3']), state });
    assert.strictEqual(l.posts.length, 1); assert.ok(l.posts[0].subject.includes('1 ný frávik'));
    assert.ok(l.posts[0].html.includes('R-3')); assert.ok(!l.posts[0].html.includes('R-1,'));
    state = l.kvWrites[0].value;
  });
  await t('póstur hafnaður: samanburður er EKKI uppfærður (nýja atriðið kemur aftur)', async () => {
    const fyrir = JSON.stringify(state);
    const l = await keyra({ eftirlit: mk(['R-1', 'R-2', 'R-3', 'R-4']), state, postOk: false });
    assert.strictEqual(l.posts.length, 1); assert.strictEqual(l.kvWrites.length, 0);
    assert.strictEqual(JSON.stringify(state), fyrir);
    assert.strictEqual(l.status, 200, 'greiðslusamstillingin má ekki falla');
  });
  await t('nýja fallið vantar: gamla leiðin sendir fullan póst (aldrei þögn)', async () => {
    const l = await keyra({ eftirlit: mk(['R-1']), state, rpcAlltOk: false });
    assert.strictEqual(l.posts.length, 1); assert.ok(l.posts[0].subject.startsWith('⚠ Rukkunar-eftirlit'));
    assert.strictEqual(l.kvWrites.length, 0);
  });
  await t('app_kv ólesanlegt: gamla leiðin (aldrei þögn)', async () => {
    const l = await keyra({ eftirlit: mk(['R-1']), state, kvLesOk: false });
    assert.strictEqual(l.posts.length, 1); assert.ok(l.posts[0].subject.startsWith('⚠ Rukkunar-eftirlit'));
  });
  console.log(n + ' próf standast');
})().catch(e => { console.error('✘', e && e.stack || e); process.exit(1); });
