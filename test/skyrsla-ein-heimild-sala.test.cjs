// Skýrslan sem fylgir kröfu ræðst af SÖLUNNI á sendistund — ein heimild (17.11.2026).
// Keyrsla: node --test test/skyrsla-ein-heimild-sala.test.cjs
//
// Agnar 17.11.2026: „Mátt reyna laga þetta svo það sé ekki alltaf vesen.“ Prófin hér:
//   1. kjarninn (_skyrsla-solu.cjs): val og dómur — kt, nafn, staður, tæki, ár; rekstrarfélag sem greiðir fyrir stað;
//   2. payday-push á HERMDU neti: slóð úr vafranum er hunsuð (gamla tengingin), athugunarhamur kallar aldrei á Payday,
//      lögmætur greiðandi ≠ staður er ekki stöðvaður, nafn EÐA kt eitt og sér stöðvar ekki, „senda samt" virkar;
//   3. 516 SkyrslaSolu í hermdum vafra: breyting á sölu → spurt → „Búa til skýrslu" → CIR_NY + 168 opnað;
//   4. gagnavörðurinn (tools/audit-skyrsla-solu.cjs --profa).
// Gervikennitölur (ekki raunfélög). Ekkert raunkall, ekkert sent.
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const fs = require('node:fs');
const vm = require('node:vm');
const { execFileSync } = require('node:child_process');

const ROT = path.join(__dirname, '..');
const SS = require(path.join(ROT, 'netlify/functions/_skyrsla-solu.cjs'));
const API = 'https://payday.gervi', SB = 'https://gervi.supabase.co';
const KT_A = '681299-0099', KT_B = '691299-0079', KT_C = '671299-0059';
const ar = String(new Date().getFullYear());

const sk = (kt, nafn, ms, stadur) => ({ id: 'a' + ms, kind: 'skyrsla', year: ar, uploaded_at: new Date(ms).toISOString(),
  name: nafn + ' - Gervigata 1 - ' + kt + ' - ' + ar + ' - október - úttektarskýrsla - #' + (stadur || 9) + '.pdf',
  path: 'company_attachments/' + (stadur || 9) + '/' + ms + '_Gervi_-_' + kt + '_-_' + ar + '_-_uttektarskyrsla.pdf' });
const sala = (o) => Object.assign({ id: 92001, num: 'R-GERVI-2', customer_kt: KT_B, customer_nafn: 'Nýja félagið ehf', customer_base_id: 5, customer_id: 9,
  samtals: 12400, status: 'final', source: 'uttekt', created_at: new Date().toISOString(),
  linur: [{ qty: 2, desc: 'Yfirferð · Léttvatnstæki 6L. yfirferð' }, { qty: 1, desc: 'Skýrslugerð' }] }, o || {});

// ── 1. Kjarninn ───────────────────────────────────────────────────────────────────────────────────
test('kjarni: velur skýrslu á kt sölunnar, nýjasta, aldrei leysta af hólmi; dæmir gamla kt + nafn sem STÖÐVUN', () => {
  const gamla = sk(KT_A, 'Gamla félagið', Date.now() - 40 * 864e5), ny = sk(KT_B, 'Nýja félagið ehf', Date.now() - 864e5);
  assert.strictEqual(SS.velja(sala(), [gamla, ny], null), ny);
  assert.strictEqual(SS.velja(sala(), [Object.assign({}, ny, { leyst_af: 'x' }), gamla], null), gamla);
  const r = SS.bera(sala(), gamla, { site: { nafn: 'Nýja félagið ehf', kennitala: KT_B } });
  assert.strictEqual(r.stemmir, false); assert.strictEqual(r.stodvar, true);
  assert.deepStrictEqual(r.misraemi.map((m) => m.svid), ['kt', 'nafn']);
  assert.match(SS.skilabod(r), /Búa til úttektarskýrslu/);
  assert.strictEqual(SS.bera(sala(), ny, { site: { nafn: 'Nýja félagið ehf', kennitala: KT_B } }).stemmir, true);
});
test('kjarni: annar greiðandi en staðurinn (rekstrarfélag) — skýrsla á kt og nafni STAÐARINS stemmir', () => {
  const s = sala({ customer_kt: KT_C, customer_nafn: 'Rekstrarfélagið hf' });
  const r = SS.bera(s, sk(KT_B, 'Nýja félagið ehf', Date.now()), { site: { nafn: 'Nýja félagið ehf', kennitala: KT_B }, base: { nafn: 'Rekstrarfélagið hf', kennitala: KT_C } });
  assert.strictEqual(r.stemmir, true, JSON.stringify(r.misraemi));
});
test('kjarni: nafn — félagaform og greinarmerki skipta ekki máli; handhlaðið skjal án kt/nafns er „óvíst", ekki rautt', () => {
  assert.strictEqual(SS.nafnStemmir('Nýja félagið ehf', 'Nýja félagið ehf.'), true);
  assert.strictEqual(SS.nafnStemmir('Gervilind', 'Gervilind 13-15,húsfélag'), true);
  assert.strictEqual(SS.nafnStemmir('Kaffibúð Gervi', 'Kaffihús Gervi ehf.'), false);
  const hand = { kind: 'skyrsla', year: ar, name: '1784888835152_Gervi_-_Gata_7_-_5 (1).pdf', path: 'company_attachments/9/1_x.pdf', uploaded_at: new Date().toISOString() };
  assert.strictEqual(SS.bera(sala(), hand, { site: { nafn: 'Nýja félagið ehf', kennitala: KT_B } }).stemmir, true);
});
test('kjarni: tækjum bætt við (salan > skýrslan) → misræmi „taeki" — aðeins ef tölurnar eru úr ÞESSARI skýrslu', () => {
  const ms = Date.now() - 864e5, s = sala({ linur: [{ qty: 5, desc: 'Yfirferð · Léttvatnstæki 6L. yfirferð' }] });
  const ferskt = { total_devices: 2, report_year: +ar, parsed_at: new Date(ms + 60e3).toISOString() };
  const r = SS.bera(s, sk(KT_B, 'Nýja félagið ehf', ms), { facts: ferskt });
  assert.deepStrictEqual(r.misraemi.map((m) => [m.svid, m.stodvar]), [['taeki', false]]);
  const gamaltFacts = { total_devices: 2, report_year: +ar, parsed_at: new Date(ms - 30 * 864e5).toISOString() };
  assert.strictEqual(SS.bera(s, sk(KT_B, 'Nýja félagið ehf', ms), { facts: gamaltFacts }).stemmir, true, 'eldri tölur en skýrslan dæma ekki');
  assert.strictEqual(SS.taekiISolu([{ qty: 2, desc: 'Léttvatnstæki 6L. yfirferð' }, { qty: 1, desc: 'Akstur' }, { qty: 1, desc: 'Skýrslugerð' }]), 2);
});

// ── 2. payday-push á hermdu neti ──────────────────────────────────────────────────────────────────
function svar(status, body, bytes) {
  const t = typeof body === 'string' ? body : JSON.stringify(body);
  return { ok: status >= 200 && status < 300, status, json: async () => JSON.parse(t), text: async () => t, arrayBuffer: async () => (bytes || Buffer.from('%PDF-gervi')).buffer };
}
function net(st) {
  const log = [];
  const f = async (url, opt) => {
    url = String(url); opt = opt || {}; const m = (opt.method || 'GET').toUpperCase(); log.push({ url, m });
    if (url.startsWith(API)) {
      if (url.includes('/customers?ssn=')) return svar(200, []);
      if (url.endsWith('/customers') && m === 'POST') return svar(200, { id: 'pd-kunni-1' });
      if (url.includes('/invoices') && m === 'POST') return svar(200, { id: 'pd-inv-1', number: 777 });
      return svar(200, {});
    }
    if (url.includes('/rest/v1/app_kv')) return svar(200, m === 'GET' ? [{ value: { access_token: 'gervi', exp_ts: Date.now() + 1e8 } }] : {});
    if (url.includes('/rest/v1/solur?id=eq.') && m === 'GET') return svar(200, [st.sala]);
    if (url.includes('/rest/v1/solur') && m === 'PATCH') return svar(200, [{ id: st.sala.id }]);
    if (url.includes('/rest/v1/solur')) return svar(200, []);
    if (url.includes('/rest/v1/app_settings')) return svar(200, [{ settings: { company_attachments: { 9: st.vidhengi } } }]);
    if (url.includes('/rest/v1/customer_documents')) return svar(200, st.skjol || []);
    if (url.includes('/rest/v1/arsskodun_report_facts')) return svar(200, st.facts ? [st.facts] : []);
    if (url.includes('/storage/v1/object/samningar/')) return st.storageVilla ? svar(400, 'ekki til') : svar(200, '', Buffer.from('%PDF-gervi'));
    if (url.includes('/rest/v1/customers_base')) return svar(200, [st.base || { id: 5, nafn: st.sala.customer_nafn, kennitala: st.sala.customer_kt, netfang: null }]);
    if (url.includes('/rest/v1/fyrirtaeki')) return svar(200, [st.site || { id: 9, nafn: st.sala.customer_nafn, kennitala: st.sala.customer_kt, netfang: null, heimilisfang: 'Gervigata 1' }]);
    if (url.includes('/rest/v1/thjonustubeidni') && m === 'GET') return svar(200, []);
    if (url.includes('/rest/v1/thjonustubeidni')) return svar(201, [{ id: 4242 }]);
    if (url.includes('/rest/v1/app_problems')) return svar(m === 'GET' ? 200 : 201, m === 'GET' ? [] : '');
    return svar(200, []);
  };
  return { f, log };
}
async function keyra(st, body) {
  const { f, log } = net(st);
  const upp = globalThis.fetch; globalThis.fetch = f;
  try {
    Object.assign(process.env, { SUPABASE_URL: SB, SUPABASE_SERVICE_ROLE_KEY: 'gervi', PAYDAY_CLIENT_ID: 'gervi', PAYDAY_CLIENT_SECRET: 'gervi', PAYDAY_API_BASE: API });
    delete process.env.EDGE_SHARED_KEY;
    // Lota 13 (17.11.2026): payday-push krefst innskráðs starfsmanns. Notendaskráin (hub-adgangar GET) er hermd: kaka → inni.
    const HUB = require(path.join(ROT, 'netlify/functions/hub-adgangar.cjs'));
    HUB.handler = async (e) => ({ statusCode: 200, body: JSON.stringify(/hub_user=/.test(String((e.headers || {}).cookie || '')) ? { authed: true, user: { nafn: 'Prufa', rola: 'Starfsmaður' } } : { authed: false, user: null }) });
    const p = path.join(ROT, 'netlify/functions/payday-push.cjs'); delete require.cache[require.resolve(p)];
    const res = await require(p).handler({ httpMethod: 'POST', headers: { cookie: 'hub_user=prufa' }, body: JSON.stringify(Object.assign({ sale_id: st.sala.id }, body || {})) });
    let j = {}; try { j = JSON.parse(res.body); } catch (_) {}
    return { res, j, payday: log.filter((x) => x.url.startsWith(API)), nidurhal: log.filter((x) => x.url.includes('/storage/v1/object/samningar/')).map((x) => decodeURIComponent(x.url)) };
  } finally { globalThis.fetch = upp; }
}

test('payday-push: slóð úr vafranum (report_storage_path) er HUNSUÐ — skýrslan ræðst af sölunni á sendistund', async () => {
  const gamla = sk(KT_A, 'Gamla félagið', Date.now() - 40 * 864e5), ny = sk(KT_B, 'Nýja félagið ehf', Date.now() - 60e3);
  const r = await keyra({ sala: sala(), vidhengi: [gamla, ny] }, { report_storage_path: gamla.path });
  assert.strictEqual(r.res.statusCode, 200, JSON.stringify(r.j));
  assert.ok(r.nidurhal.length >= 1 && r.nidurhal.every((u) => u.includes(KT_B) && !u.includes(KT_A)), 'sótt: ' + r.nidurhal.join(' | '));
});
test('payday-push skyrsla_athugun: dómurinn án Payday-kalls og án niðurhals — sama val og sendingin', async () => {
  const gamla = sk(KT_A, 'Gamla félagið', Date.now() - 40 * 864e5);
  const r = await keyra({ sala: sala(), vidhengi: [gamla] }, { skyrsla_athugun: true });
  assert.strictEqual(r.res.statusCode, 200, JSON.stringify(r.j));
  assert.strictEqual(r.j.athugun, true); assert.strictEqual(r.j.fylgir, true); assert.strictEqual(r.j.customer_id, 9);
  assert.strictEqual(r.j.skyrsla.stemmir, false); assert.strictEqual(r.j.skyrsla.stodvar, true);
  assert.strictEqual(r.j.skyrsla.lysing.kt, KT_A);
  assert.strictEqual(r.payday.length, 0, 'ekkert til Payday'); assert.strictEqual(r.nidurhal.length, 0, 'ekkert niðurhal');
  const r2 = await keyra({ sala: sala(), vidhengi: [gamla, sk(KT_B, 'Nýja félagið ehf', Date.now())] }, { skyrsla_athugun: true });
  assert.strictEqual(r2.j.skyrsla.stemmir, true, JSON.stringify(r2.j.skyrsla));
});
test('payday-push: annar greiðandi en staðurinn er EKKI stöðvaður; nafn eitt og sér (sama kt) er viðvörun, ekki stöðvun', async () => {
  const rf = await keyra({ sala: sala({ customer_kt: KT_C, customer_nafn: 'Rekstrarfélagið hf' }), vidhengi: [sk(KT_B, 'Nýja félagið ehf', Date.now())],
    site: { id: 9, nafn: 'Nýja félagið ehf', kennitala: KT_B, netfang: null, heimilisfang: 'Gervigata 1' },
    base: { id: 5, nafn: 'Rekstrarfélagið hf', kennitala: KT_C, netfang: null } }, { dry: true });
  assert.strictEqual(rf.res.statusCode, 200, JSON.stringify(rf.j));
  const rn = await keyra({ sala: sala(), vidhengi: [sk(KT_B, 'Allt annað nafn', Date.now())] }, { dry: true });
  assert.strictEqual(rn.res.statusCode, 200, JSON.stringify(rn.j));
  assert.deepStrictEqual(rn.j.skyrsla.misraemi.map((m) => [m.svid, m.stodvar]), [['nafn', false]]);
});

// ── Rekstrarfélög og greiðandaskipti (stjórnlotan 17.11.2026) ───────────────────────────────────
// Raundæmi (nafnlaust): eign fór af einum greiðanda á annan (kt staðarins breyttist, nafnið ekki); eign sem
// rekstrarfélag rekur rukkast á annað félag; húsfélag með umsjónarfélag; stafsetningarafbrigði sama staðar.
test('rekstrarfélag/greiðandaskipti: skýrsla STAÐARINS á kt fyrri greiðanda og sama nafni → EKKI stöðvuð (viðvörun)', async () => {
  const stadur = { id: 9, nafn: 'Gervileiga - Gervigata 16', kennitala: KT_C, netfang: null, heimilisfang: 'Gervigata 16' };
  const skyrsla = sk(KT_A, 'Gervileiga ehf', Date.now() - 100 * 864e5);
  skyrsla.name = 'Gervileiga ehf - Gervigata 16,, ' + KT_A + ' - ' + ar + ' - mars -.pdf';   // eldra skráarnafnasnið, eins og raundæmið
  const r = await keyra({ sala: sala({ customer_kt: KT_C, customer_nafn: 'Greiðandinn ehf.' }), vidhengi: [skyrsla], site: stadur,
    base: { id: 5, nafn: 'Greiðandinn ehf.', kennitala: KT_C, netfang: null } }, {});
  assert.strictEqual(r.res.statusCode, 200, JSON.stringify(r.j));
  assert.strictEqual(r.payday.filter((x) => x.url.includes('/invoices')).length, 1, 'krafan fór (hermt)');
  const ath = await keyra({ sala: sala({ customer_kt: KT_C, customer_nafn: 'Greiðandinn ehf.' }), vidhengi: [skyrsla], site: stadur }, { skyrsla_athugun: true });
  assert.strictEqual(ath.j.skyrsla.stodvar, false);
  assert.deepStrictEqual(ath.j.skyrsla.misraemi.map((m) => m.svid), ['kt']);
});
test('stafsetningarafbrigði sama staðar („Gervilundur" / „Gervalundur 13-15, húsfélag") + kt fyrri greiðanda → ekki stöðvað', () => {
  assert.strictEqual(SS.nafnStemmir('Gervilundur', 'Gervalundur 13-15,húsfélag'), true);
  assert.strictEqual(SS.nafnStemmir('Kaffibúð Gervi', 'Kaffihús Gervi ehf.'), false, 'ólík orð eru ekki stafsetningarvilla');
  const r = SS.bera(sala({ customer_nafn: 'Gervalundur 13-15,húsfélag' }), sk(KT_A, 'Gervilundur', Date.now()), { site: { nafn: 'Gervalundur 13-15,húsfélag', kennitala: KT_B } });
  assert.strictEqual(r.stodvar, false, JSON.stringify(r.misraemi));
});
test('staðurinn SJÁLFUR skipti um kt OG nafn → 409; „staðfesta og senda samt" (force_skyrsla) → sent, skráð í svarinu', async () => {
  const st = { sala: sala(), vidhengi: [sk(KT_A, 'Gamla félagið', Date.now() - 40 * 864e5)] };
  const nei = await keyra(st, {});
  assert.strictEqual(nei.res.statusCode, 409, JSON.stringify(nei.j)); assert.strictEqual(nei.j.gate, 'skyrsla_stemmir');
  assert.match(nei.j.error, /staðfestu og sendu samt/);
  assert.strictEqual(nei.payday.filter((x) => x.url.includes('/invoices')).length, 0);
  const ja = await keyra(st, { force_skyrsla: true });
  assert.strictEqual(ja.res.statusCode, 200, JSON.stringify(ja.j));
  assert.strictEqual(ja.j.skyrsla_yfirskrifud, true);
  assert.strictEqual(ja.payday.filter((x) => x.url.includes('/invoices')).length, 1);
});
test('166: „senda samt" — hak í rauða reitnum og spurning við 409 skyrsla_stemmir; sendingin ber force_skyrsla aðeins ef hakað/staðfest', () => {
  const k = fs.readFileSync(path.join(ROT, 'js/patches/166-krofu-yfirlit.js'), 'utf8');
  assert.match(k, /id="_ky-sk-samt"/);
  assert.match(k, /force_skyrsla: !!\(wrap\.querySelector\('#_ky-sk-samt'\) && wrap\.querySelector\('#_ky-sk-samt'\)\.checked\)/);
  assert.match(k, /j\.gate === 'skyrsla_stemmir'\) \{[\s\S]{0,700}okText: 'Senda samt', cancelText: 'Hætta við'[\s\S]{0,300}senda\(\{ force_skyrsla: true \}\)/);
});
test('payday-push: skjalaröð ársins (customer_documents) án viðhengis fer um SAMA dóm', async () => {
  const skjal = { storage_path: 'samningar/company_attachments/9/1_gomul.pdf', year: +ar, doc_date: ar + '-10-07',
    notes: 'Gamla félagið - Gervigata 1 - ' + KT_A + ' - ' + ar + ' - október - úttektarskýrsla - #9.pdf' };
  const r = await keyra({ sala: sala(), vidhengi: [], skjol: [skjal] }, { dry: true });
  assert.strictEqual(r.res.statusCode, 409, JSON.stringify(r.j)); assert.strictEqual(r.j.gate, 'skyrsla_stemmir');
});

// ── 3. 516 SkyrslaSolu í hermdum vafra ───────────────────────────────────────────────────────────
function vafri(svarAthugunar, confirmSvar) {
  const doc = new EventTarget();
  const skra = { fetch: [], confirm: [], open: [], toast: [] };
  const ctx = {
    console: { log() {}, warn() {} }, setTimeout, clearTimeout, document: doc, CustomEvent,
    fetch: async (url, o) => { skra.fetch.push({ url, body: JSON.parse(o.body) }); return { ok: true, json: async () => svarAthugunar }; },
    Confirm: { show: async (msg, opt) => { skra.confirm.push({ msg, opt }); return confirmSvar; } },
    Toast: { show: (t) => skra.toast.push(t) },
    CompanyInspectionReport: { open: async (coId) => { skra.open.push({ coId, ny: ctx.CIR_NY }); } },
  };
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(ROT, 'js/patches/516-skyrsla-solu.js'), 'utf8'), ctx);
  return { ctx, doc, skra };
}
const bida = () => new Promise((r) => setTimeout(r, 30));
const athSvar = (o) => Object.assign({ ok: true, athugun: true, sale_id: 92001, num: 'R-GERVI-2', customer_id: 9, fylgir: true, send: false,
  skyrsla: { stemmir: false, stodvar: true, misraemi: [{ svid: 'kt', stodvar: true, texti: 'Skýrslan er á kennitölu ' + KT_A + ', en salan er á ' + KT_B + '.' }], lysing: { kt: KT_A, dags: ar + '-10-07' } } }, o || {});

test('516: Vista í ritlinum (sale-edited) → athugun hjá payday-push → „Búa til skýrslu" → CIR_NY + 168 opnað', async () => {
  const v = vafri(athSvar(), true);
  v.doc.dispatchEvent(new CustomEvent('sale-edited', { detail: { id: 92001, finalize: false } }));
  await bida();
  assert.deepStrictEqual(v.skra.fetch.map((x) => x.body), [{ sale_id: 92001, skyrsla_athugun: true }]);
  assert.strictEqual(v.skra.confirm.length, 1); assert.match(v.skra.confirm[0].msg, /stemmir ekki lengur/);
  assert.strictEqual(v.skra.confirm[0].opt.okText, 'Búa til skýrslu');
  assert.strictEqual(v.skra.open.length, 1); assert.strictEqual(v.skra.open[0].coId, 9);
  assert.strictEqual(String(v.skra.open[0].ny && v.skra.open[0].ny.coId), '9', 'CIR_NY sett áður en 168 opnast');
});
test('516: ekkert spurt þegar skýrslan stemmir, salan er send, eða aðeins árið/viðbót stemma ekki; „Seinna" opnar ekkert', async () => {
  for (const o of [{ skyrsla: { stemmir: true, stodvar: false, misraemi: [], lysing: {} } }, { send: true },
    { skyrsla: { stemmir: false, stodvar: false, misraemi: [{ svid: 'ar', stodvar: false, texti: 'x' }], lysing: {} } }, { fylgir: false }]) {
    const v = vafri(athSvar(o), true);
    v.doc.dispatchEvent(new CustomEvent('sala-breytt', { detail: { id: 92001 } }));
    await bida();
    assert.strictEqual(v.skra.confirm.length, 0, JSON.stringify(o));
  }
  const nei = vafri(athSvar(), false);
  nei.doc.dispatchEvent(new CustomEvent('sale-edited', { detail: { id: 92001 } }));
  await bida();
  assert.strictEqual(nei.skra.open.length, 0); assert.strictEqual(nei.skra.toast.length, 1);
});
test('516: endurgerð (önnur úttekt ársins, alltafNy) býður nýja skýrslu líka þegar sú gamla stemmir', async () => {
  const v = vafri(athSvar({ skyrsla: { stemmir: true, stodvar: false, misraemi: [], lysing: { dags: ar + '-06-01' } } }), true);
  await v.ctx.SkyrslaSolu.eftirBreytingu(92001, 'endurgerd', { alltafNy: true, texti: 'Þetta var önnur úttekt ársins (gervi).' });
  assert.strictEqual(v.skra.confirm.length, 1); assert.match(v.skra.confirm[0].msg, /önnur úttekt ársins/);
  assert.strictEqual(v.skra.open.length, 1);
});

// ── 4. Leiðirnar fara um sama fallið + gagnavörðurinn ────────────────────────────────────────────
test('allar leiðir: 165 og 488 kalla á SkyrslaSolu; 168 virðir CIR_NY og merkir eldri skýrslu (eyðir engu)', () => {
  const k = (f) => fs.readFileSync(path.join(ROT, 'js/patches', f), 'utf8');
  assert.match(k('165-visit-workflow.js'), /SkyrslaSolu\.eftirBreytingu\(saleId/);
  assert.match(k('488-vidbotar-uttekt.js'), /async function nySkyrsla\(coId\)[\s\S]{0,200}SkyrslaSolu\.endurnyja\(coId, \{ astaeda: 'vidbot' \}\)/);
  const c = k('168-company-inspection-report.js');
  assert.match(c, /const _ny = !!\(window\.CIR_NY && String\(window\.CIR_NY\.coId\) === String\(co\.id\)/);
  assert.match(c, /if \(auto && !_vb && !_ny\) \{/);
  assert.doesNotMatch(c, /CompanyAttachments\.delete\(/, '168 eyðir engri skýrslu');
  const idx = fs.readFileSync(path.join(ROT, 'index.html'), 'utf8');
  assert.match(idx, /\/js\/patches\/516-skyrsla-solu\.js\?v=/);
});
test('gagnavörðurinn: sjálfprófið (--profa) stenst — rautt á gamla kt/nafn/tæki, grænt á réttri og leystri af hólmi', () => {
  const ut = execFileSync(process.execPath, [path.join(ROT, 'tools/audit-skyrsla-solu.cjs'), '--profa'], { encoding: 'utf8' });
  assert.match(ut, /✅ sjálfspróf/);
});
test('142: „sale-edited" ber auðkenni sölunnar (close() núllar _sale — áður fór alltaf id: null og enginn vissi hvaða sala breyttist)', () => {
  const k = fs.readFileSync(path.join(ROT, 'js/patches/142-sale-editor.js'), 'utf8');
  const i = k.indexOf('const _vistadId = _sale && _sale.id;');
  assert.ok(i > 0, 'auðkennið lesið');
  const eftir = k.slice(i, i + 700);
  assert.ok(eftir.indexOf('close();') > 0 && eftir.indexOf('close();') < eftir.indexOf("new CustomEvent('sale-edited'"), 'lesið á undan close()');
  assert.match(eftir, /new CustomEvent\('sale-edited', \{ detail: \{ id: _vistadId, finalize \} \}\)/);
});
test('516: kt EÐA nafn eitt og sér (nýr greiðandi) truflar ekki — engin spurning eftir Vista', async () => {
  const v = vafri(athSvar({ skyrsla: { stemmir: false, stodvar: false, misraemi: [{ svid: 'kt', stodvar: false, texti: 'x' }], lysing: {} } }), true);
  v.doc.dispatchEvent(new CustomEvent('sale-edited', { detail: { id: 92001 } }));
  await bida();
  assert.strictEqual(v.skra.confirm.length, 0);
});

// ── Óháð rýni 17.11.2026: galli 1 (Drive-viðhengi án path), galli 3 (nýjasta gengur fyrir), niðurhal brestur, galli 2 (texti) ──
const drive = (ms, nafn) => ({ id: 'd' + ms, kind: 'skyrsla', year: ar, uploaded_at: new Date(ms).toISOString(), external: true, drive_id: 'gervi-drive-' + ms,
  name: (nafn || 'Nýja félagið ehf') + ' - ' + KT_B + ' - ' + ar + ' - úttektarskýrsla.pdf' });
const skjalAr = { storage_path: 'samningar/company_attachments/9/5_skjal_arsins.pdf', year: +ar, doc_date: ar + '-06-01',
  notes: 'Nýja félagið ehf - Gervigata 1 - ' + KT_B + ' - ' + ar + ' - júní - úttektarskýrsla - #9.pdf' };
test('galli 1: nýjasta viðhengi ársins er Drive-tengill (ekkert path) → skjalaröð ársins fylgir, ALDREI krafa án skýrslu', async () => {
  assert.strictEqual(SS.velja(sala(), [drive(Date.now())], null, Object.assign({ uppruni: 'skjal' }, skjalAr)).storage_path, skjalAr.storage_path);
  const r = await keyra({ sala: sala(), vidhengi: [drive(Date.now())], skjol: [skjalAr] }, {});
  assert.strictEqual(r.res.statusCode, 200, JSON.stringify(r.j));
  assert.ok(r.nidurhal.length === 1 && r.nidurhal[0].includes('5_skjal_arsins'), 'sótt: ' + r.nidurhal.join(' | '));
  assert.ok(r.j.attached_report, 'skýrsla fylgdi');
});
test('galli 1: skýrsla ársins (skjalaröð) gengur fyrir sækjanlegri skýrslu ANNARS árs', () => {
  const fyrra = Object.assign(sk(KT_B, 'Nýja félagið ehf', Date.now() - 400 * 864e5), { year: String(+ar - 1) });
  const v = SS.velja(sala(), [fyrra], null, Object.assign({ uppruni: 'skjal' }, skjalAr));
  assert.strictEqual(v.storage_path, skjalAr.storage_path);
  assert.strictEqual(SS.velja(sala(), [fyrra], null, null), fyrra, 'annað ár aðeins sem síðasta úrræði');
});
test('galli 3: nýrri handhlaðin skýrsla gengur fyrir eldri sjálfgerðri — líka þótt sú eldri beri kt sölunnar', () => {
  const eldriApp = sk(KT_B, 'Nýja félagið ehf', Date.now() - 150 * 864e5);
  const nyrriHand = { id: 'h1', kind: 'skyrsla', year: ar, uploaded_at: new Date(Date.now() - 10 * 864e5).toISOString(), path: 'company_attachments/9/2_leidrett.pdf', name: 'Leiðrétt samsetning.pdf' };
  assert.strictEqual(SS.velja(sala(), [eldriApp, nyrriHand], null, null), nyrriHand);
});
test('niðurhal valinnar skýrslu brestur → 409 skyrsla_nidurhal (aldrei þegjandi án skýrslu); „án skýrslu" sendir', async () => {
  const st = { sala: sala(), vidhengi: [sk(KT_B, 'Nýja félagið ehf', Date.now())], storageVilla: true };
  const nei = await keyra(st, {});
  assert.strictEqual(nei.res.statusCode, 409, JSON.stringify(nei.j)); assert.strictEqual(nei.j.gate, 'skyrsla_nidurhal');
  assert.match(nei.j.error, /EKKI send/);
  assert.strictEqual(nei.payday.filter((x) => x.url.includes('/invoices')).length, 0);
  const an = await keyra(st, { attach_report: false });
  assert.strictEqual(an.res.statusCode, 200, JSON.stringify(an.j));
  const k = fs.readFileSync(path.join(ROT, 'js/patches/166-krofu-yfirlit.js'), 'utf8');
  assert.match(k, /j\.gate === 'skyrsla_nidurhal'\) \{[\s\S]{0,500}okText: 'Senda án skýrslu'[\s\S]{0,300}senda\(\{ attach_report: false \}\)/);
});
test('galli 2: handskrifaður texti — geymdur með skýrslunni, tekinn úr fyrri skýrslu á annarri vél, ALDREI sjálfvirk vistun án hans', () => {
  const k = fs.readFileSync(path.join(ROT, 'js/patches/168-company-inspection-report.js'), 'utf8');
  const k111 = fs.readFileSync(path.join(ROT, 'js/patches/111-company-attachments.js'), 'utf8');
  assert.match(k, /const _textiHer = !!\(String\(trip\.notes/);
  assert.match(k, /if \(_fyrri && _fyrri\.texti && typeof _fyrri\.texti === 'object'\) \{[\s\S]{0,400}textiUppruni = 'fyrri'/);
  assert.match(k, /\} else if \(_fyrri\) \{\s*textiUppruni = 'ovist'/);
  assert.match(k, /if \(ctx && ctx\.textiUppruni === 'ovist'\) \{\s*if \(auto\) \{ _cirTextiBordi\(\); return; \}/);
  assert.match(k, /okText: 'Vista samt', cancelText: 'Hætta við'/);
  assert.match(k, /CompanyAttachments\.upload\(co\.id, file, \{ year: ar, kind: 'skyrsla', texti: \(ctx && ctx\.texti\) \|\| null \}\)/);
  assert.match(k111, /texti: \(opts && opts\.texti && typeof opts\.texti === 'object'\) \? \{/);
  // ovist-athugunin kemur Á EFTIR „þegar til"-skilyrðinu — venjuleg opnun eldri skýrslu á skrifstofuvél breytist ekki
  assert.ok(k.indexOf("if (ctx && ctx.textiUppruni === 'ovist')") > k.indexOf('if (auto && !_vb && !_ny) {'));
});
