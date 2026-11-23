// Próf: viðvörun þegar nafn, heimilisfang eða kt fyrirtækis breytist (23.11.2026, patch 527 + sql/2026-11-23_audkenni_vidvorun.sql).
//   node --test test/audkenni-vidvorun.test.cjs
//
// AF HVERJU (Agnar 23.11.2026): „þetta á líka við heimilisfang og nafn fyrirtækis .. þá má ekkert fara í rugl við það, settu einhverskonar
// viðvörun, varnir svo það gerist aldrei.“ Það sem má ALDREI bila:
//   1. vistun stöðvast aldrei — kall sem bregst, kastar eða skilar engu gefur null/ekkert, aldrei villu út í eyðublaðið;
//   2. viðvörunin skrifar ekkert í grunninn (aðeins lesfallið audkenni_afleidingar) og breytir engum sölum;
//   3. eftir vistun eru GÖMLU gildin send og nýju gildin lesin úr grunninum (annars sæist ekkert ósent með gömlu auðkennin);
//   4. texti úr grunninum fer aldrei í innerHTML.
// Öll gögn eru tilbúin (repóið er opinbert).
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROT = path.join(__dirname, '..');
const lesa = (s) => fs.readFileSync(path.join(ROT, s), 'utf8').replace(/\r\n/g, '\n');
const SRC = lesa('js/patches/527-audkenni-vidvorun.js');
const SQL = lesa('sql/2026-11-23_audkenni_vidvorun.sql');
const P14 = lesa('js/patches/14-companies-openedit.js');
const INDEX = lesa('index.html');

// Lágmarks-DOM: nóg til að sjá hvað 527 býr til.
function fakeDocument() {
  const elements = [];
  const mk = (tag) => {
    const e = { tag, style: { cssText: '' }, children: [], _text: '', attrs: {}, listeners: {}, parentNode: null, id: '', type: '' };
    Object.defineProperty(e, 'textContent', { get() { return e._text + e.children.map((c) => c.textContent).join(''); }, set(v) { e._text = String(v); e.children = []; } });
    e.appendChild = (c) => { c.parentNode = e; e.children.push(c); return c; };
    e.setAttribute = (k, v) => { e.attrs[k] = v; };
    e.addEventListener = (n, f) => { (e.listeners[n] = e.listeners[n] || []).push(f); };
    e.remove = () => { if (e.parentNode) e.parentNode.children = e.parentNode.children.filter((c) => c !== e); e.parentNode = null; };
    elements.push(e);
    return e;
  };
  const body = mk('body');
  return {
    body, elements,
    createElement: mk,
    getElementById(id) { const f = (n) => (n.id === id ? n : n.children.map(f).find(Boolean)); return f(body) || null; }
  };
}
function hlada(sbKall) {
  const document = fakeDocument();
  const window = {};
  const kall = [];
  const sb = { rpc: async (nafn, arg) => { kall.push({ nafn, arg }); return sbKall ? sbKall(nafn, arg) : { data: null }; } };
  vm.runInNewContext(SRC, { window, document, setTimeout: () => 0, String, Array, Object }, { filename: '527-audkenni-vidvorun.js' });
  return { A: window.AudkenniVidvorun, document, sb, kall };
}

const GAMLI = { nafn: 'Stigahlíð 10, húsfélag', kennitala: '520391-1859', heimilisfang: 'Stigahlíð 10, 105 Reykjavík', customer_base_id: 327 };

test('munur: kt aðeins þegar báðar eru 10 stafa og ólíkar; nafn og heimilisfang þurfa gildi báðum megin', () => {
  const { A } = hlada();
  assert.deepEqual({ ...A.munur(GAMLI, { ...GAMLI, kennitala: '470815-0270' }) }, { kt: true, nafn: false, heimilisfang: false });
  assert.deepEqual({ ...A.munur(GAMLI, { ...GAMLI, kennitala: '5203911859' }) }, { kt: false, nafn: false, heimilisfang: false }, 'sama kt án bandstriks er engin breyting');
  assert.equal(A.munur(GAMLI, { ...GAMLI, kennitala: '12345' }).kt, false, 'hálfskrifuð kt er ekki breyting');
  assert.equal(A.munur(GAMLI, { ...GAMLI, nafn: 'Stigahlíð 6-12, húsfélag' }).nafn, true);
  assert.equal(A.munur(GAMLI, { ...GAMLI, nafn: '' }).nafn, false, 'tómt nafn er ekki nafnabreyting');
  assert.equal(A.munur({ ...GAMLI, heimilisfang: '' }, { ...GAMLI, heimilisfang: 'Nýtt 1' }).heimilisfang, false, 'að fylla út tómt heimilisfang er ekki breyting sem brýtur neitt');
  assert.equal(A.munur(null, null).kt, false);
});

test('athuga eftir vistun: gömlu gildin eru send, nýju gildin eru EKKI send (grunnurinn les þau sjálfur)', async () => {
  const { A, sb, kall } = hlada(() => ({ data: { breytt: true, tharf_adgerd: ['1 ósendur reikningur ber enn gamla nafn'], gert_sjalfkrafa: ['Nafnið færist …'] } }));
  const res = await A.athuga(sb, 424, GAMLI, { nafn: 'X' }, true);
  assert.equal(kall.length, 1);
  assert.equal(kall[0].nafn, 'audkenni_afleidingar');
  assert.equal(kall[0].arg.p_gamalt_kt, '520391-1859');
  assert.equal(kall[0].arg.p_gamall_base, 327);
  assert.equal('p_nytt_nafn' in kall[0].arg, false, 'nýtt gildi á ekki að fara með eftir vistun');
  assert.deepEqual(res.tharf, ['1 ósendur reikningur ber enn gamla nafn']);
});

test('athuga fyrir vistun: nýju gildin úr eyðublaðinu eru send', async () => {
  const { A, sb, kall } = hlada(() => ({ data: { breytt: true, tharf_adgerd: [], gert_sjalfkrafa: ['x'] } }));
  await A.athuga(sb, 424, GAMLI, { nafn: 'Nýtt nafn', kennitala: '470815-0270', heimilisfang: 'Nýtt 1' }, false);
  assert.equal(kall[0].arg.p_nytt_nafn, 'Nýtt nafn');
  assert.equal(kall[0].arg.p_nytt_kt, '470815-0270');
  assert.equal(kall[0].arg.p_nytt_heimilisfang, 'Nýtt 1');
});

test('athuga: bilun, villa, kast og „ekkert breytt“ gefa null — aldrei villu (ALLTAF LEYFA VISTUN)', async () => {
  for (const fn of [() => ({ error: { message: 'x' } }), () => { throw new Error('net'); }, () => ({ data: { breytt: false } }), () => ({ data: null }), () => undefined]) {
    const { A, sb } = hlada(fn);
    assert.equal(await A.athuga(sb, 1, GAMLI, GAMLI, true), null);
  }
  const { A } = hlada();
  assert.equal(await A.athuga(null, 1, GAMLI, GAMLI, true), null, 'enginn sb');
  assert.equal(await A.athuga({}, 1, GAMLI, GAMLI, true), null, 'sb án rpc');
});

test('eftirVistun: ekkert kall þegar ekkert af þremur auðkennunum breyttist', async () => {
  const { A, sb, kall, document } = hlada(() => ({ data: { breytt: true, tharf_adgerd: ['x'], gert_sjalfkrafa: [] } }));
  const r = await A.eftirVistun(sb, 424, GAMLI, { ...GAMLI, simi: '555' });
  assert.equal(r, null);
  assert.equal(kall.length, 0);
  assert.equal(document.getElementById('audkenni-vidvorun'), null);
});

test('eftirVistun: viðvörunarkassi með „Skilið“ þegar eitthvað þarf mannshönd; texti aðeins sem textContent', async () => {
  const { A, sb, document } = hlada(() => ({ data: { breytt: true, tharf_adgerd: ['Úttektarskýrsla ársins ber gamla nafn <b>'], gert_sjalfkrafa: ['Nafnið færist …'] } }));
  const res = await A.eftirVistun(sb, 424, GAMLI, { ...GAMLI, nafn: 'Stigahlíð 6-12, húsfélag' });
  assert.ok(res && res.tharf.length === 1);
  const box = document.getElementById('audkenni-vidvorun');
  assert.ok(box, 'kassinn varð til');
  assert.match(box.textContent, /þarf mannshönd/);
  assert.match(box.textContent, /⚠ Úttektarskýrsla ársins ber gamla nafn <b>/, 'texti er sýndur sem texti, ekki túlkaður sem HTML');
  const takki = box.children.find((c) => c.tag === 'button');
  assert.ok(takki && /Skilið/.test(takki.textContent));
  takki.listeners.click[0]();
  assert.equal(document.getElementById('audkenni-vidvorun'), null, '„Skilið“ lokar kassanum');
});

test('eftirVistun: ekkert sýnt þegar grunnurinn segir að ekkert þurfi að gera og ekkert hafi færst', async () => {
  const { A, sb, document } = hlada(() => ({ data: { breytt: true, tharf_adgerd: [], gert_sjalfkrafa: [] } }));
  assert.equal(await A.eftirVistun(sb, 424, GAMLI, { ...GAMLI, nafn: 'Annað' }), null);
  assert.equal(document.getElementById('audkenni-vidvorun'), null);
});

test('527: skráin skrifar ekkert í grunninn og notar aldrei innerHTML', () => {
  assert.equal(/innerHTML|outerHTML|insertAdjacentHTML/.test(SRC), false);
  assert.equal(/\.(insert|update|upsert|delete)\(/.test(SRC), false, 'aðeins rpc á lesfall');
  assert.equal((SRC.match(/\.rpc\(/g) || []).length, 1);
  assert.match(SRC, /'audkenni_afleidingar'/);
});

test('14-companies-openedit kallar á 527 í try/catch á báðum stöðum og notar fersku röðina (co) sem „gamalt“', () => {
  assert.match(P14, /try \{ if \(window\.AudkenniVidvorun\) window\.AudkenniVidvorun\.festaVidForm\(\{ sb: window\.DB && DB\.sb, id: id, co: co, lesaForm: lesaForm \}\); \} catch \(_\) \{\}/);
  assert.match(P14, /try \{ if \(window\.AudkenniVidvorun\) window\.AudkenniVidvorun\.eftirVistun\(sb, id, co, r\.data\); \} catch \(_\) \{\}/);
  assert.equal(/await window\.AudkenniVidvorun/.test(P14), false, 'vistun bíður aldrei eftir viðvöruninni');
  const i14 = INDEX.indexOf('patches/14-companies-openedit.js');
  const i527 = INDEX.indexOf('patches/527-audkenni-vidvorun.js');
  assert.ok(i14 > 0 && i527 > i14, '527 er skráð í index.html');
});

test('SQL: kveikjan fangar villur, sölur eru aldrei uppfærðar, aðeins kt/nafn/heimilisfang vekja hana', () => {
  assert.match(SQL, /exception when others then[\s\S]*?raise warning 'trg_audkenni_vidvorun/);
  assert.equal(/update public\.solur\b/i.test(SQL), false, 'sölur eru aldrei færðar af grunninum');
  assert.match(SQL, /after update of nafn, heimilisfang, kennitala on public\.fyrirtaeki/);
  assert.match(SQL, /for each row when \(old\.nafn is distinct from new\.nafn or old\.heimilisfang is distinct from new\.heimilisfang or old\.kennitala is distinct from new\.kennitala\)/);
  assert.match(SQL, /kt_breyting_virkt\(\)/, 'sami rofi og kt-keðjan');
  assert.match(SQL, /not exists \(select 1 from public\.solur c where c\.credit_of = s\.id/, 'kreditfærðar sölur teljast ekki ósendar');
  assert.match(SQL, /btrim\(coalesce\(cb\.heimilisfang, ''\)\) in \(''/, 'greiðandi með annað heimilisfang er ekki yfirskrifaður');
  assert.match(SQL, /revoke all on function public\.audkenni_kvitta/);
});
