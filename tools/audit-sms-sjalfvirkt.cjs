#!/usr/bin/env node
/* VÖRÐUR — sjálfvirk SMS-áminning sendir aldrei kúnna tvisvar og aldrei óbeðin.
 *
 * Keyrir kjarnann (netlify/functions/_sms-sjalfvirkt.cjs) á GERVIGÖGNUM með fölsuðu neti — ekkert
 * raunverulegt SMS, enginn Supabase-lestur. Sannar:
 *   1. Forskoðun (commit=false) skrifar og sendir ALDREI.
 *   2. Slökkt á sjálfvirkni (sjálfgefið) → ekkert sent þótt verk séu gjaldgeng.
 *   3. Kveikt: nýtt verk fær fyrsta skilaboð; endurtekning aðeins eftir bilið; hámark endurtekninga virt;
 *      verk sem er of gamalt, með ógilt númer, eða fékk SMS fyrir <20 klst sleppt; handvirkt SMS telur.
 *   4. Hámark 10 sendingar per keyrslu.
 *   5. Önnur keyrsla strax á eftir sendir EKKERT (sagan ræður) — kúnni fær ekki tvö.
 *   6. Sagan vistast ekki → keyrslan STÖÐVAST eftir fyrstu sendingu.
 *   7. Textarnir í kjarnanum eru þeir sömu og í 33-sms-reminder.js; kveikt er ekki sjálfgefið; cron er skráð.
 * Kyrrstæð skoðun + gervinet, ekkert raunverulegt net — keyrir líka í pre-push.
 *
 *   node tools/audit-sms-sjalfvirkt.cjs
 */
'use strict';
const fs = require('fs');
const path = require('path');
const rot = path.join(__dirname, '..');
const K = require(path.join(rot, 'netlify/functions/_sms-sjalfvirkt.cjs'));

let rautt = 0;
const ok = (m) => console.log('  OK  ' + m);
const bad = (m) => { console.log('  RED ' + m); rautt++; };
const athuga = (c, m) => (c ? ok(m) : bad(m));

process.env.SUPABASE_URL = 'https://gervi.supabase.test';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'gervi-lykill';
process.env.TWILIO_SID = 'ACgervi'; process.env.TWILIO_TOKEN = 'gervi'; process.env.TWILIO_FROM = '+3545550000';

const NU = Date.parse('2026-10-19T10:00:00Z');
const dagaSidan = (d, klst) => new Date(NU - d * 86400000 - (klst || 0) * 3600000).toISOString();
const dagsetning = (d) => dagaSidan(d).slice(0, 10);

// Fölsuð hlið: verk, saga, stillingar. fail = {saga:true} fellir skráningu sögu.
function gervi(o) {
  const st = { verk: o.verk, saga: (o.saga || []).slice(), log: o.log || {}, virkt: !!o.virkt, fail: o.fail || {},
    twilio: [], sagaSkrif: [], oll: [] };
  global.fetch = async (url, init) => {
    url = String(url); const metod = (init && init.method) || 'GET';
    st.oll.push(metod + ' ' + url.replace(/\?.*/, ''));
    const json = (b, s) => ({ ok: (s || 200) < 400, status: s || 200, json: async () => b });
    if (url.includes('/rest/v1/app_settings')) {
      return json([{ sj: { virkt: st.virkt, ...(o.stillingar || {}) }, tg: {}, snid: null, simi: '5654080', log: st.log }]);
    }
    if (url.includes('/rest/v1/verkbeidnir')) return json(st.verk);
    if (url.includes('/rest/v1/sms_saga') && metod === 'GET') return json(st.saga);
    if (url.includes('/rest/v1/sms_saga') && metod === 'POST') {
      if (st.fail.saga) return json({}, 500);
      const b = JSON.parse(init.body); st.sagaSkrif.push(b);
      if (b.status === 'sent') st.saga.push({ job_id: b.job_id, created_at: new Date(NU).toISOString() });
      return json({}, 201);
    }
    if (url.includes('api.twilio.com')) { st.twilio.push(String(init.body)); return json({ sid: 'SMgervi' + st.twilio.length }, 201); }
    throw new Error('óvænt net: ' + metod + ' ' + url);
  };
  return st;
}
const verk = (id, aldur, simi) => ({ id, num: 'V' + id, customer: 'Kúnni ' + id, phone: simi === undefined ? '6991234' : simi, dropoff: dagsetning(aldur) });

(async () => {
  console.log('SMS sjálfvirkt — gervikeyrslur');

  // 1. forskoðun skrifar ekkert
  let g = gervi({ virkt: true, verk: [verk(1, 3)] });
  let u = await K.keyra({ commit: false, nu: NU });
  athuga(u.aaetlad.length === 1 && g.twilio.length === 0 && g.sagaSkrif.length === 0, '1. forskoðun finnur verkið en sendir og skrifar EKKERT');
  athuga(g.oll.every(x => x.startsWith('GET ')), '1b. forskoðun gerir aðeins GET-köll');

  // 2. slökkt = ekkert sent
  g = gervi({ virkt: false, verk: [verk(1, 3)] });
  u = await K.keyra({ commit: true, nu: NU });
  athuga(g.twilio.length === 0 && u.stodvad, '2. slökkt á sjálfvirkni → ekkert sent þótt verk sé gjaldgengt');
  athuga(K.stillingar(undefined).virkt === false && K.SJALFGILDI_STILLINGAR.virkt === false, '2b. sjálfgefið er SLÖKKT');

  // 3. fjölbreytt verk
  g = gervi({
    virkt: true,
    verk: [verk(1, 3), verk(2, 40), verk(3, 20), verk(4, 12), verk(5, 25), verk(6, 3, 'ekki-simi'), verk(7, 10), verk(8, 1)],
    saga: [
      { job_id: 3, created_at: dagaSidan(9) },                          // 1 send fyrir 9 d → áminning nr 1
      { job_id: 4, created_at: dagaSidan(0, 5) },                       // fyrir 5 klst → sleppt
      { job_id: 5, created_at: dagaSidan(30) }, { job_id: 5, created_at: dagaSidan(23) },
      { job_id: 5, created_at: dagaSidan(16) }, { job_id: 5, created_at: dagaSidan(9) }   // 4 send = 3 endurtekningar → hámark
    ],
    log: { 7: dagaSidan(2) }                                            // handvirkt fyrir 2 d → bil ekki liðið
  });
  u = await K.keyra({ commit: true, nu: NU });
  const sendIds = u.send.map(x => x.id).sort();
  athuga(JSON.stringify(sendIds) === '[1,3]', '3a. aðeins nýtt verk (1) og áminning á verk 3 voru send — fékk: ' + JSON.stringify(sendIds));
  athuga(u.send.find(x => x.id === 1).tegund === 'tilbuid' && u.send.find(x => x.id === 3).tegund === 'osott', '3b. rétt tegund (tilbúið / ósótt)');
  const astaedur = Object.fromEntries(u.sleppt.map(x => [x.id, x.astaeda]));
  athuga(/eldra/.test(astaedur[2] || ''), '3c. of gamalt verk sleppt (skriðuvörn)');
  athuga(/klst/.test(astaedur[4] || ''), '3d. SMS fyrir <20 klst → sleppt');
  athuga(/hámarki/.test(astaedur[5] || ''), '3e. hámarki endurtekninga náð → sleppt');
  athuga(/ógilt/.test(astaedur[6] || ''), '3f. ógilt símanúmer sleppt');
  athuga(/næsta áminning/.test(astaedur[7] || ''), '3g. handvirkt SMS telst — bil ekki liðið');
  athuga(/fyrsta skilaboð eftir/.test(astaedur[8] || ''), '3h. of nýtt verk bíður (fyrsta eftir X daga)');
  athuga(g.sagaSkrif.filter(x => x.status === 'sent').length === 2 && g.sagaSkrif.every(x => x.uppruni === 'sjalfvirkt'), '3i. hver sending skráð í sms_saga (uppruni sjalfvirkt)');

  // 4. hámark per keyrslu
  g = gervi({ virkt: true, verk: Array.from({ length: 15 }, (_, i) => verk(100 + i, 5)) });
  u = await K.keyra({ commit: true, nu: NU });
  athuga(u.send.length === K.HAMARK_PER_KEYRSLU && g.twilio.length === K.HAMARK_PER_KEYRSLU, '4. hámark ' + K.HAMARK_PER_KEYRSLU + ' sendingar per keyrslu');

  // 5. önnur keyrsla sendir ekkert
  const send1 = g.twilio.length;
  u = await K.keyra({ commit: true, nu: NU });
  athuga(g.twilio.length >= send1 && u.send.every(x => x.id >= 100) && u.send.length <= 5, '5a. önnur keyrsla sendir aðeins þeim sem ekki fengu (≤5 eftir)');
  const sendtIds = g.sagaSkrif.filter(x => x.status === 'sent').map(x => x.job_id);
  athuga(new Set(sendtIds).size === sendtIds.length, '5b. ENGINN fékk tvö SMS í tveimur keyrslum í röð');
  u = await K.keyra({ commit: true, nu: NU });
  const sendtIds2 = g.sagaSkrif.filter(x => x.status === 'sent').map(x => x.job_id);
  athuga(new Set(sendtIds2).size === sendtIds2.length && sendtIds2.length === 15, '5c. þriðja keyrsla: allir 15 fengu EITT, enginn tvö');

  // 6. saga vistast ekki → stoppað
  g = gervi({ virkt: true, verk: [verk(201, 5), verk(202, 5), verk(203, 5)], fail: { saga: true } });
  u = await K.keyra({ commit: true, nu: NU });
  athuga(g.twilio.length === 1 && /tvísendingu/.test(u.stodvad || ''), '6. saga vistast ekki → stöðvað eftir EINA sendingu (' + g.twilio.length + ')');

  // 7. textar, sjálfgefið, cron
  const s33 = fs.readFileSync(path.join(rot, 'js/patches/33-sms-reminder.js'), 'utf8');
  const lesa = (re) => { const m = s33.match(re); return m ? m[1] : null; };
  const osott33 = lesa(/osott:\s*\{[^}]*?texti:\s*'([^']+)'/s);
  const tilb33 = (lesa(/const DEFAULT_TEMPLATE =\s*((?:\s*'[^']*'\s*\+?)+);/s) || '').match(/'([^']*)'/g);
  const tilb33texti = tilb33 ? tilb33.map(x => x.slice(1, -1)).join('') : null;
  athuga(osott33 === K.SJALFGILDI.osott, '7a. „ósótt“-textinn er sá sami í 33 og í kjarnanum');
  athuga(tilb33texti === K.SJALFGILDI_TILBUID, '7b. „tilbúið“-textinn er sá sami í 33 og í kjarnanum');
  const toml = fs.readFileSync(path.join(rot, 'netlify.toml'), 'utf8');
  athuga(/\[functions\."sms-sjalfvirkt-cron"\]\s*\n\s*schedule\s*=/.test(toml), '7c. cron er skráð í netlify.toml');
  athuga(/_sms-sjalfvirkt\.cjs/.test((toml.match(/included_files\s*=\s*\[[^\]]*\]/) || [''])[0]), '7d. kjarninn er í included_files');
  const http = fs.readFileSync(path.join(rot, 'netlify/functions/sms-sjalfvirkt.js'), 'utf8');
  athuga(/req\.method !== 'GET'/.test(http) && /commit:\s*false/.test(http) && !/commit:\s*true/.test(http), '7e. HTTP-fallið er GET-eingöngu og alltaf þurrt');
  const cron = fs.readFileSync(path.join(rot, 'netlify/functions/sms-sjalfvirkt-cron.cjs'), 'utf8');
  athuga(/commit:\s*true/.test(cron), '7f. aðeins cron-fallið keyrir með commit');

  console.log(rautt ? '\n❌ ' + rautt + ' atriði rauð' : '\n✅ Sjálfvirkt SMS: kúnni fær aldrei tvö, aldrei óbeðið (gervikeyrslur).');
  process.exit(rautt ? 1 : 0);
})().catch(e => { console.log('  RED villa í prófun: ' + (e && e.stack || e)); process.exit(1); });
