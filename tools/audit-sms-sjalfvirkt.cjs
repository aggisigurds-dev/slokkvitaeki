#!/usr/bin/env node
/* VÖRÐUR — sjálfvirk SMS-áminning sendir aldrei kúnna tvisvar og aldrei óbeðin.
 *
 * Keyrir kjarnann (netlify/functions/_sms-sjalfvirkt.cjs) og sms-send.js á GERVIGÖGNUM með fölsuðu neti og
 * gervi-Supabase sem hermir einkvæma lykilinn (job_id, UTC-dagur), PATCH og síur — ekkert raunverulegt SMS,
 * enginn raunverulegur lestur. Sannar:
 *   1. Forskoðun (commit=false) gerir aðeins GET: skrifar og sendir ALDREI.
 *   2. Slökkt á sjálfvirkni (sjálfgefið) → ekkert sent þótt verk séu gjaldgeng.
 *   3. Kveikt: nýtt verk fær fyrsta skilaboð; endurtekning aðeins eftir bilið; hámark endurtekninga virt;
 *      of gamalt, ógilt númer, SMS fyrir <20 klst, handvirkt SMS og 3 misheppnaðar tilraunir → sleppt.
 *   4. EITT SMS Á NÚMER: kúnni með 3 tilbúin verk fær eitt í keyrslu — og ekki annað á hin daginn eftir.
 *   5. Hámark 10 sendingar per keyrslu; endurtekin keyrsla sendir engum tvisvar.
 *   6. FAIL-CLOSED: svar sem nær 1000 raða þakinu stöðvar keyrsluna (ekkert sent).
 *   7. „PENDING Á UNDAN": óvíst útkoma (tímamörk) skilur röðina eftir pending og verkið er ALDREI endursent.
 *   8. ATÓMÍSKT CLAIM: tvær samhliða keyrslur senda aðeins einu sinni á hvert verk.
 *   9. Verk sem er afhent á meðan keyrt er fær ekkert (endurathugað fyrir sendingu).
 *  10. Ekki hægt að skrá sögu → ekkert sent (claim mistekst → stöðvað).
 *  11. sms-send.js: hafnar röngum uppruna (403) og fer eftir mínútu- og sólarhringsþaki (429).
 *  12. Textarnir í kjarnanum eru þeir sömu og í 33-sms-reminder.js; kveikt er ekki sjálfgefið; cron er skráð.
 * Gervinet, ekkert raunverulegt net — keyrir líka í pre-push.
 *
 *   node tools/audit-sms-sjalfvirkt.cjs
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
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

// Gervi-Supabase + Twilio. o.twilio: fall (n) → 'ok' | 'ovist' | 'hafnad'.
function gervi(o) {
  const st = { verk: o.verk.map(v => ({ ...v })), saga: (o.saga || []).map((r, i) => ({ id: 1000 + i, uppruni: 'sjalfvirkt', ...r })),
    log: o.log || {}, virkt: !!o.virkt, nextId: 5000, twilio: [], oll: [], skrif: 0 };
  const tw = o.twilio || (() => 'ok');
  const dag = (iso) => iso.slice(0, 10);
  const lista = (v) => String(v).replace(/^\(|\)$/g, '').split(',').map(x => decodeURIComponent(x).replace(/^"|"$/g, ''));
  global.fetch = async (url, init) => {
    url = String(url); const metod = (init && init.method) || 'GET';
    st.oll.push(metod + ' ' + url.replace(/\?.*/, ''));
    const json = (b, s) => ({ ok: (s || 200) < 400, status: s || 200, json: async () => b });
    const q = new URL(url).searchParams;
    if (url.includes('/rest/v1/app_settings')) {
      return json([{ sj: { virkt: st.virkt, ...(o.stillingar || {}) }, tg: {}, snid: null, simi: '5654080', log: st.log }]);
    }
    if (url.includes('/rest/v1/verkbeidnir')) {
      let rod = st.verk.filter(v => v.status === 'ready' && !v.eytt_at);
      const id = q.get('id'); if (id) rod = rod.filter(v => 'eq.' + v.id === id);
      return json(o.verkFjoldi ? Array.from({ length: o.verkFjoldi }, (_, i) => ({ id: i, num: 'X', customer: 'x', phone: '6991234', dropoff: dagsetning(3) })) : rod);
    }
    if (url.includes('/rest/v1/sms_saga') && metod === 'GET') {
      let rod = st.saga.slice();
      const stj = q.get('status'); if (stj && stj.startsWith('in.')) { const l = lista(stj.slice(3)); rod = rod.filter(r => l.includes(r.status)); }
      const jid = q.get('job_id'); if (jid && jid.startsWith('in.')) { const l = lista(jid.slice(3)).map(Number); rod = rod.filter(r => l.includes(r.job_id)); }
      const til = q.get('til'); if (til && til.startsWith('in.')) { const l = lista(til.slice(3)); rod = rod.filter(r => l.includes(r.til)); }
      const fra = q.get('created_at'); if (fra && fra.startsWith('gte.')) rod = rod.filter(r => Date.parse(r.created_at) >= Date.parse(fra.slice(4)));
      const lim = parseInt(q.get('limit') || '1000', 10);
      if (o.sagaFjoldi) rod = Array.from({ length: o.sagaFjoldi }, (_, i) => ({ job_id: 1, til: '+3546991234', status: 'sent', created_at: dagaSidan(50) }));
      return json(rod.slice(0, lim).map(r => ({ id: r.id, job_id: r.job_id, til: r.til, status: r.status, created_at: r.created_at })));
    }
    if (url.includes('/rest/v1/sms_saga') && metod === 'POST') {
      if (o.sagaBilar) return json({}, 500);
      const b = JSON.parse(init.body);
      const r = { id: st.nextId++, created_at: new Date(NU).toISOString(), ...b };
      if (b.uppruni === 'sjalfvirkt' && ['pending', 'sent'].includes(b.status) &&
          st.saga.some(x => x.uppruni === 'sjalfvirkt' && ['pending', 'sent'].includes(x.status) && x.job_id === b.job_id && dag(x.created_at) === dag(r.created_at))) return json({}, 409);
      st.saga.push(r); st.skrif++;
      return json([{ id: r.id }], 201);
    }
    if (url.includes('/rest/v1/sms_saga') && metod === 'PATCH') {
      const id = Number(q.get('id').replace('eq.', '')); const r = st.saga.find(x => x.id === id);
      if (!r) return json({}, 404); Object.assign(r, JSON.parse(init.body)); return json({}, 204);
    }
    if (url.includes('api.twilio.com')) {
      st.twilio.push(String(init.body));
      const n = st.twilio.length, mode = tw(n, String(init.body));
      if (mode === 'ovist') throw new Error('The operation was aborted due to timeout');
      if (mode === 'hafnad') return json({ message: 'The number is unverified' }, 400);
      return json({ sid: 'SMgervi' + n }, 201);
    }
    throw new Error('óvænt net: ' + metod + ' ' + url);
  };
  return st;
}
const verk = (id, aldur, simi) => ({ id, num: 'V' + id, customer: 'Kúnni ' + id, status: 'ready', phone: simi === undefined ? String(6000000 + id) : simi, dropoff: dagsetning(aldur) });
const sentFjoldi = (g) => g.saga.filter(r => r.uppruni === 'sjalfvirkt' && ['sent', 'pending'].includes(r.status)).length;
const enginTvo = (g) => { const t = g.saga.filter(r => r.uppruni === 'sjalfvirkt' && ['sent', 'pending'].includes(r.status)).map(r => r.job_id + '|' + r.created_at.slice(0, 10)); return new Set(t).size === t.length; };

(async () => {
  console.log('SMS sjálfvirkt — gervikeyrslur');

  // 1. forskoðun
  let g = gervi({ virkt: true, verk: [verk(1, 3)] });
  let u = await K.keyra({ commit: false, nu: NU });
  athuga(u.aaetlad.length === 1 && g.twilio.length === 0 && g.skrif === 0, '1. forskoðun finnur verkið en sendir og skrifar EKKERT');
  athuga(g.oll.every(x => x.startsWith('GET ')), '1b. forskoðun gerir aðeins GET-köll');

  // 2. slökkt
  g = gervi({ virkt: false, verk: [verk(1, 3)] });
  u = await K.keyra({ commit: true, nu: NU });
  athuga(g.twilio.length === 0 && g.skrif === 0 && u.stodvad, '2. slökkt á sjálfvirkni → ekkert sent, ekkert skrifað');
  athuga(K.stillingar(undefined).virkt === false && K.SJALFGILDI_STILLINGAR.virkt === false, '2b. sjálfgefið er SLÖKKT');

  // 3. fjölbreytt verk
  g = gervi({
    virkt: true,
    verk: [verk(1, 3), verk(2, 40), verk(3, 20), verk(4, 12), verk(5, 25), verk(6, 3, 'ekki-simi'), verk(7, 10), verk(8, 1), verk(9, 4)],
    saga: [
      { job_id: 3, til: '+3546000003', status: 'sent', created_at: dagaSidan(9) },
      { job_id: 4, til: '+3546000004', status: 'sent', created_at: dagaSidan(0, 5) },
      { job_id: 5, til: '+3546000005', status: 'sent', created_at: dagaSidan(30) }, { job_id: 5, til: '+3546000005', status: 'sent', created_at: dagaSidan(23) },
      { job_id: 5, til: '+3546000005', status: 'sent', created_at: dagaSidan(16) }, { job_id: 5, til: '+3546000005', status: 'sent', created_at: dagaSidan(9) },
      { job_id: 9, til: '+3546000009', status: 'failed', created_at: dagaSidan(3) }, { job_id: 9, til: '+3546000009', status: 'failed', created_at: dagaSidan(2) },
      { job_id: 9, til: '+3546000009', status: 'failed', created_at: dagaSidan(1) }
    ],
    log: { 7: dagaSidan(2) }
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
  athuga(/fyrsta skilaboð eftir/.test(astaedur[8] || ''), '3h. of nýtt verk bíður');
  athuga(/misheppna/.test(astaedur[9] || ''), '3i. 3 misheppnaðar tilraunir → sleppt (engin hamering á biluð númer)');
  athuga(g.saga.filter(r => r.uppruni === 'sjalfvirkt' && r.status === 'sent' && r.twilio_sid).length === 2, '3j. hver sending skráð sent með Twilio-auðkenni');

  // 4. eitt SMS á númer
  g = gervi({ virkt: true, verk: [verk(11, 6, '6991111'), verk(12, 5, '6991111'), verk(13, 4, '6991111'), verk(14, 5, '6992222')] });
  u = await K.keyra({ commit: true, nu: NU });
  athuga(u.send.length === 2 && g.twilio.length === 2, '4a. kúnni með 3 verk fær EITT SMS (alls 2 send á 2 númer) — send: ' + u.send.length);
  const NU2 = NU + 86400000;      // daginn eftir
  const u2 = await K.keyra({ commit: true, nu: NU2 });
  athuga(u2.send.length === 0, '4b. daginn eftir fær kúnninn EKKI annað SMS vegna hinna verkanna — send: ' + u2.send.length);

  // 5. hámark + endurtekning
  g = gervi({ virkt: true, verk: Array.from({ length: 15 }, (_, i) => verk(100 + i, 5)) });
  u = await K.keyra({ commit: true, nu: NU });
  athuga(u.send.length === K.HAMARK_PER_KEYRSLU && g.twilio.length === K.HAMARK_PER_KEYRSLU, '5a. hámark ' + K.HAMARK_PER_KEYRSLU + ' sendingar per keyrslu');
  await K.keyra({ commit: true, nu: NU });
  await K.keyra({ commit: true, nu: NU });
  athuga(enginTvo(g) && sentFjoldi(g) === 15, '5b. eftir 3 keyrslur í röð fengu allir 15 EITT SMS, enginn tvö (alls ' + sentFjoldi(g) + ')');

  // 6. fail-closed við þak
  g = gervi({ virkt: true, verk: [verk(1, 3)], sagaFjoldi: 1000 });
  let kastadi = false; try { await K.keyra({ commit: true, nu: NU }); } catch (e) { kastadi = /þaki/.test(e.message); }
  athuga(kastadi && g.twilio.length === 0, '6a. saga nær 1000 raða þaki → stöðvað, ekkert sent');
  g = gervi({ virkt: true, verk: [verk(1, 3)], verkFjoldi: 1000 });
  kastadi = false; try { await K.keyra({ commit: false, nu: NU }); } catch (e) { kastadi = /þaki/.test(e.message); }
  athuga(kastadi, '6b. verkalisti nær þaki → stöðvað (líka í forskoðun)');

  // 7. óvíst útkoma
  g = gervi({ virkt: true, verk: [verk(21, 5), verk(22, 5)], twilio: () => 'ovist' });
  u = await K.keyra({ commit: true, nu: NU });
  const pend = g.saga.filter(r => r.status === 'pending').length;
  athuga(g.twilio.length === 1 && pend === 1 && /óvíst/.test(u.stodvad || ''), '7a. tímamörk → röðin helst pending, keyrslan stöðvuð eftir EINA tilraun');
  g.twilio.length = 0;
  const u3 = await K.keyra({ commit: true, nu: NU + 3600000 });
  athuga(!u3.send.find(x => x.id === 21) && !u3.aaetlad.find(x => x.id === 21), '7b. verkið með óvísa útkomu er ALDREI endursent (pending telst sent)');

  // 8. samhliða keyrslur
  g = gervi({ virkt: true, verk: [verk(31, 5), verk(32, 5), verk(33, 5)] });
  const [a1, a2] = await Promise.all([K.keyra({ commit: true, nu: NU }), K.keyra({ commit: true, nu: NU })]);
  athuga(g.twilio.length === 3 && enginTvo(g), '8. tvær samhliða keyrslur → hvert verk sent EINU sinni (send alls ' + g.twilio.length + ')');

  // 9. afhent á meðan
  g = gervi({ virkt: true, verk: [verk(41, 5), verk(42, 5)] });
  let nFetch = 0; const orig = global.fetch;
  global.fetch = async (url, init) => {
    if (String(url).includes('/rest/v1/verkbeidnir?id=eq.41')) { g.verk[0].status = 'collected'; }
    return orig(url, init);
  };
  u = await K.keyra({ commit: true, nu: NU });
  athuga(!u.send.find(x => x.id === 41) && u.send.find(x => x.id === 42), '9. verk sem var afhent á meðan fær ekkert (endurathugað fyrir sendingu)');

  // 10. saga vistast ekki
  g = gervi({ virkt: true, verk: [verk(51, 5), verk(52, 5)], sagaBilar: true });
  u = await K.keyra({ commit: true, nu: NU });
  athuga(g.twilio.length === 0 && u.stodvad, '10. ekki hægt að skrá claim → ekkert sent');

  // 11. sms-send.js
  const smsSend = (await import(pathToFileURL(path.join(rot, 'netlify/functions/sms-send.js')).href)).default;
  const bidja = (hdr, n) => smsSend(new Request('https://slokkvitaeki.netlify.app/api/sms-send', { method: 'POST', headers: { 'content-type': 'application/json', ...hdr }, body: JSON.stringify({ to: '6991234', body: 'prufa' }) }));
  g = gervi({ virkt: false, verk: [] });
  let r1 = await bidja({ origin: 'https://evil.example' });
  athuga(r1.status === 403 && g.twilio.length === 0, '11a. röng upprunavefsíða → 403, ekkert sent');
  r1 = await bidja({});
  athuga(r1.status === 403 && g.twilio.length === 0, '11b. enginn Origin/Referer → 403');
  r1 = await bidja({ origin: 'https://slokkvitaeki.netlify.app' });
  athuga(r1.status === 200 && g.twilio.length === 1, '11c. úr appinu → sent');
  g = gervi({ virkt: false, verk: [], saga: Array.from({ length: 10 }, () => ({ til: '+3546991234', status: 'sent', uppruni: 'stjornbord', created_at: new Date().toISOString() })) });
  r1 = await bidja({ origin: 'https://slokkvitaeki.netlify.app' });
  athuga(r1.status === 429 && g.twilio.length === 0, '11d. 10 SMS á síðustu mínútu → 429, ekkert sent');

  // 12. textar, sjálfgefið, cron
  const s33 = fs.readFileSync(path.join(rot, 'js/patches/33-sms-reminder.js'), 'utf8');
  const lesa = (re) => { const m = s33.match(re); return m ? m[1] : null; };
  const osott33 = lesa(/osott:\s*\{[^}]*?texti:\s*'([^']+)'/s);
  const tilb33 = (lesa(/const DEFAULT_TEMPLATE =\s*((?:\s*'[^']*'\s*\+?)+);/s) || '').match(/'([^']*)'/g);
  const tilb33texti = tilb33 ? tilb33.map(x => x.slice(1, -1)).join('') : null;
  athuga(osott33 === K.SJALFGILDI.osott, '12a. „ósótt“-textinn er sá sami í 33 og í kjarnanum');
  athuga(tilb33texti === K.SJALFGILDI_TILBUID, '12b. „tilbúið“-textinn er sá sami í 33 og í kjarnanum');
  const toml = fs.readFileSync(path.join(rot, 'netlify.toml'), 'utf8');
  athuga(/\[functions\."sms-sjalfvirkt-cron"\]\s*\n\s*schedule\s*=/.test(toml), '12c. cron er skráð í netlify.toml');
  athuga(/_sms-sjalfvirkt\.cjs/.test((toml.match(/included_files\s*=\s*\[[^\]]*\]/) || [''])[0]), '12d. kjarninn er í included_files');
  const http = fs.readFileSync(path.join(rot, 'netlify/functions/sms-sjalfvirkt.js'), 'utf8');
  athuga(/req\.method !== 'GET'/.test(http) && /commit:\s*false/.test(http) && !/commit:\s*true/.test(http), '12e. HTTP-fallið er GET-eingöngu og alltaf þurrt');
  const cron = fs.readFileSync(path.join(rot, 'netlify/functions/sms-sjalfvirkt-cron.cjs'), 'utf8');
  athuga(/commit:\s*true/.test(cron), '12f. aðeins cron-fallið keyrir með commit');
  const sj33a = fs.readFileSync(path.join(rot, 'js/patches/33a-sms-stjornbord.js'), 'utf8');
  const m33a = sj33a.match(/const SJ_SJALFGILT = \{[^}]*\}/);
  const m33acjs = Object.entries(K.SJALFGILDI_STILLINGAR).every(([k, v]) => new RegExp(k + ':\\s*' + v).test(m33a ? m33a[0] : ''));
  athuga(m33acjs, '12g. sjálfgildi stillinga í 33a og kjarnanum eru þau sömu');

  console.log(rautt ? '\n❌ ' + rautt + ' atriði rauð' : '\n✅ Sjálfvirkt SMS: kúnni fær aldrei tvö, aldrei óbeðið (gervikeyrslur).');
  process.exit(rautt ? 1 : 0);
})().catch(e => { console.log('  RED villa í prófun: ' + (e && e.stack || e)); process.exit(1); });
