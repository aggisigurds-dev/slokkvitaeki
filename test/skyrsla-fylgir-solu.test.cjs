// Úttektarskýrslan sem fylgir kröfu verður að vera um sama greiðanda (17.11.2026). Keyrsla: node --test test/skyrsla-fylgir-solu.test.cjs
//
// AF HVERJU: tveir reikningar endurgerðir á NÝJA kennitölu eftir kredit (raunmál 16.11) — eina úttektarskýrsla ársins var
// sú gamla (gamalt nafn, gömul kt) og payday-push festi FYRSTU skýrslu ársins við kröfuna. Prófið keyrir handler
// payday-push á HERMDU neti (Supabase + Payday svara úr gervigögnum; ekkert raunkall, ekkert sent).
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');

const ROT = path.join(__dirname, '..');
const API = 'https://payday.gervi', SB = 'https://gervi.supabase.co';
const KT_GAMLA = '681299-0099', KT_NY = '691299-0079';   // gervi-kennitölur (ekki raunfélög), sama form og skráarnöfn 168
const ar = String(new Date().getFullYear());

function svar(status, body, bytes) {
  const t = typeof body === 'string' ? body : JSON.stringify(body);
  return { ok: status >= 200 && status < 300, status, json: async () => JSON.parse(t), text: async () => t,
    arrayBuffer: async () => (bytes || Buffer.from('%PDF-gervi')).buffer };
}
const skyrsla = (kt, ms, nafn) => ({ kind: 'skyrsla', year: ar, uploaded_at: new Date(ms).toISOString(),
  name: (nafn || 'Gervifélag') + ' - Gervigata 1 - ' + kt + ' - ' + ar + ' - október - úttektarskýrsla - #9.pdf',
  path: 'company_attachments/9/' + ms + '_Gervi_-_' + kt + '_-_' + ar + '_-_uttektarskyrsla_-_9.pdf' });

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
    if (url.includes('/rest/v1/customer_documents')) return svar(200, []);
    if (url.includes('/storage/v1/object/samningar/')) return svar(200, '', Buffer.from('%PDF-gervi'));
    if (url.includes('/rest/v1/customers_base')) return svar(200, [{ id: 5, nafn: 'Gervifélag ehf', kennitala: st.sala.customer_kt, netfang: null }]);
    if (url.includes('/rest/v1/fyrirtaeki')) return svar(200, [{ id: 9, nafn: 'Gervifélag ehf', kennitala: st.sala.customer_kt, netfang: null, heimilisfang: 'Gervigata 1' }]);
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
    const p = path.join(ROT, 'netlify/functions/payday-push.cjs'); delete require.cache[require.resolve(p)];
    const res = await require(p).handler({ httpMethod: 'POST', headers: {}, body: JSON.stringify(Object.assign({ sale_id: st.sala.id }, body || {})) });
    let j = {}; try { j = JSON.parse(res.body); } catch (_) {}
    return { res, j, reikningar: log.filter((x) => x.url.startsWith(API) && x.url.includes('/invoices') && x.m === 'POST'),
      nidurhal: log.filter((x) => x.url.includes('/storage/v1/object/samningar/')).map((x) => decodeURIComponent(x.url)) };
  } finally { globalThis.fetch = upp; }
}
const sala = (kt) => ({ id: 91001, num: 'R-GERVI-1', customer_kt: kt, customer_nafn: 'Gervifélag ehf', customer_base_id: 5, customer_id: 9,
  samtals: 12400, status: 'final', source: 'uttekt', created_at: new Date().toISOString(), linur: [{ nafn: 'Yfirferð', magn: 1, verd: 10000 }] });

test('endurgerður reikningur á nýja kt + aðeins gamla skýrslan → sending STÖÐVUÐ með skýrum skilaboðum (líka dry)', async () => {
  const st = { sala: sala(KT_NY), vidhengi: [skyrsla(KT_GAMLA, Date.now() - 40 * 864e5)] };
  for (const body of [{ dry: true }, {}]) {
    const r = await keyra(st, body);
    assert.strictEqual(r.res.statusCode, 409, JSON.stringify(r.j));
    assert.strictEqual(r.j.gate, 'skyrsla_stemmir');
    assert.match(r.j.error, new RegExp(KT_GAMLA + '.*' + KT_NY));
    assert.match(r.j.error, /Búa til úttektarskýrslu/);
    assert.strictEqual(r.reikningar.length, 0, 'ekkert má fara til Payday');
  }
});

test('ný skýrsla á réttri kt til → hún fylgir, líka þótt gamla sé á undan í listanum', async () => {
  const gamla = skyrsla(KT_GAMLA, Date.now() - 40 * 864e5, 'Gamla nafnið ehf'), ny = skyrsla(KT_NY, Date.now() - 60e3);
  const st = { sala: sala(KT_NY), vidhengi: [gamla, ny] };
  const r = await keyra(st, {});   // hermd sending — sannreynir HVAÐA skrá var sótt og fest
  assert.strictEqual(r.res.statusCode, 200, JSON.stringify(r.j));
  assert.strictEqual(r.reikningar.length, 1);
  assert.ok(r.nidurhal.length >= 1 && r.nidurhal.every((u) => u.includes(KT_NY)), 'sótt: ' + r.nidurhal.join(' | '));
  assert.ok(r.j.attached_report && r.j.attached_report.name.includes(KT_NY), JSON.stringify(r.j.attached_report));
});

test('send án skýrslu (attach_report:false) er áfram leyfð — hliðið stöðvar aðeins RANGA skýrslu', async () => {
  const st = { sala: sala(KT_NY), vidhengi: [skyrsla(KT_GAMLA, Date.now() - 40 * 864e5)] };
  const r = await keyra(st, { dry: true, attach_report: false });
  assert.strictEqual(r.res.statusCode, 200, JSON.stringify(r.j));
});

test('rétt skýrsla eins og áður (sama kt) → engin breyting á hegðun', async () => {
  const st = { sala: sala(KT_NY), vidhengi: [skyrsla(KT_NY, Date.now() - 864e5)] };
  const r = await keyra(st, { dry: true });
  assert.strictEqual(r.res.statusCode, 200, JSON.stringify(r.j));
});

// ── Viðmótið: sendiglugginn (166) og „Klára heimsókn" (165) ────────────────────────────────────
const fs = require('node:fs');
const K166 = fs.readFileSync(path.join(ROT, 'js/patches/166-krofu-yfirlit.js'), 'utf8');
const K165 = fs.readFileSync(path.join(ROT, 'js/patches/165-visit-workflow.js'), 'utf8');
test('166: listavísirinn velur skýrslu á sömu kt, nýjustu og aldrei leysta af hólmi; sendiglugginn spyr ÞJÓNINN (ein heimild)', () => {
  assert.match(K166, /const hit = cand\.find\(a => ktS\.length === 10 && ktN\(a\) === ktS\) \|\| cand\[0\];/);
  assert.match(K166, /\.sort\(\(a, b\) => String\(\(b && b\.uploaded_at\) \|\| ''\)\.localeCompare/);
  assert.match(K166, /async function synaSkyrslu\(box, sale\)[\s\S]{0,300}SkyrslaSolu\.athuga\(sale\.id\)/);
  assert.doesNotMatch(K166, /report_storage_path:/, 'engin slóð úr vafranum fer með sendingunni');
});
test('165: eftir „Klára heimsókn" fer nýja salan um SkyrslaSolu (516) — aldrei sjálfvirkt, Vista ekki blokkað', () => {
  const i = K165.indexOf('const _fv = await finalizeVisit(ctx);');
  assert.ok(i > 0 && /close\(\);\s*bendaANyjaSkyrslu\(ctx\.coId, _fv && _fv\.saleId\);/.test(K165.slice(i, i + 200)), 'kall eftir lokun reiknings');
  assert.match(K165, /async function bendaANyjaSkyrslu\(coId, saleId\)[\s\S]{0,500}SkyrslaSolu\.eftirBreytingu\(saleId/);
  assert.match(K165, /return \{ saleId, saleNum \};/);
});

test('skýrsla merkt „leyst af hólmi" (leyst_af) fylgir ALDREI kröfu, þótt hún sé nýjust og á réttri kt', async () => {
  const msR = Date.now() - 864e5, msU = Date.now() - 60e3;
  const rett = skyrsla(KT_NY, msR);
  const urelt = Object.assign(skyrsla(KT_NY, msU), { leyst_af: 'ný skýrsla.pdf', leyst_af_dags: new Date().toISOString() });
  const r = await keyra({ sala: sala(KT_NY), vidhengi: [urelt, rett] }, {});
  assert.strictEqual(r.res.statusCode, 200, JSON.stringify(r.j));
  assert.ok(r.nidurhal.length >= 1 && r.nidurhal.every((u) => u.includes('/' + msR + '_') && !u.includes('/' + msU + '_')), 'sótt: ' + r.nidurhal.join(' | '));
});

// ── Skýrslugerðin (168) og skjalalistinn (111) ─────────────────────────────────────────────────
const K168 = fs.readFileSync(path.join(ROT, 'js/patches/168-company-inspection-report.js'), 'utf8');
const K111 = fs.readFileSync(path.join(ROT, 'js/patches/111-company-attachments.js'), 'utf8');
test('168: gömul skýrsla á ANNARRI kt stöðvar ekki nýja skýrslu („✓ Vistuð" aðeins ef sama kt) og Vista er aldrei óvirkt þar', () => {
  const i = K168.indexOf('if (auto && !_vb && !_ny) {');
  assert.ok(i > 0);
  const vordur = K168.slice(i, K168.indexOf('const orig = _cirSaveBtn', i));
  assert.match(vordur, /_samaKt = a => _ktCo\.length !== 10 \|\| !_ktN\(a\) \|\| _ktN\(a\) === _ktCo/);
  assert.match(vordur, /String\(a\.year\) === ar && _samaKt\(a\)\)/);
  assert.doesNotMatch(vordur, /_cirSaveBtn\.disabled = true/, 'handvirki Vista-takkinn má ekki verða óvirkur');
});
test('168 + 111: ný skýrsla merkir eldri skýrslur ársins „leyst af hólmi" — engu eytt, afturkræft', () => {
  assert.match(K168, /\} else if \(!_vb && meta\.id\) \{[\s\S]{0,900}CompanyAttachments\.supersede\(co\.id, eldri\.map\(a => a\.id\), meta\.name \|\| fname\)/);
  const s = K111.slice(K111.indexOf('async function supersede('), K111.indexOf('window.CompanyAttachments = {'));
  assert.match(s, /f\.leyst_af = String\(byName/);
  assert.doesNotMatch(s, /deleteAttachment|removeIds|\.remove\(/, 'supersede má aldrei eyða');
  assert.match(K111, /supersede: supersede,/);
  assert.match(K111, /lab: 'Skoðun \(úrelt\)'/);
  assert.match(K166, /a\.kind === 'skyrsla' && !a\.leyst_af && String\(a\.year/);
});
