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

// ── Eyðublaðið: eitt samhengi fyrir allar opnanir (rýni 23.11: hlustarar báru viðmiðið úr FYRSTU opnun) ──
function domMed() {
  const mk = (tag) => {
    const e = { tag, style: { cssText: '', display: '' }, children: [], _text: '', attrs: {}, listeners: {}, parentNode: null, id: '', type: '' };
    Object.defineProperty(e, 'textContent', { get() { return e._text + e.children.map((c) => c.textContent).join(''); }, set(v) { e._text = String(v); e.children = []; } });
    Object.defineProperty(e, 'parentElement', { get() { return e.parentNode; } });
    Object.defineProperty(e, 'nextSibling', { get() { const p = e.parentNode; if (!p) return null; const i = p.children.indexOf(e); return p.children[i + 1] || null; } });
    e.appendChild = (c) => { c.parentNode = e; e.children.push(c); return c; };
    e.insertBefore = (c, ref) => { c.parentNode = e; const i = ref ? e.children.indexOf(ref) : -1; if (i < 0) e.children.push(c); else e.children.splice(i, 0, c); return c; };
    e.setAttribute = (k, v) => { e.attrs[k] = v; };
    e.addEventListener = (n, f) => { (e.listeners[n] = e.listeners[n] || []).push(f); };
    e.remove = () => { if (e.parentNode) e.parentNode.children = e.parentNode.children.filter((c) => c !== e); e.parentNode = null; };
    e.closest = () => e.parentNode;
    e.querySelector = (sel) => { const f = (n) => n.children.map((c) => (c.tag === sel ? c : f(c))).find(Boolean); return f(e) || null; };
    e.fire = async (nafn) => { for (const f of e.listeners[nafn] || []) await f(); };
    return e;
  };
  const body = mk('body');
  const doc = { body, createElement: mk, getElementById(id) { const f = (n) => (n.id === id ? n : n.children.map(f).find(Boolean)); return f(body) || null; } };
  const modal = mk('div'); modal.id = 'modal-nyfyrirtaeki'; body.appendChild(modal);
  modal.opinn = true;
  modal.classList = { contains: (c) => (c === 'open' ? modal.opinn : false) };
  const h2 = mk('h2'); h2.textContent = 'Breyta fyrirtæki'; modal.appendChild(h2);
  const reitir = {};
  ['nf-nafn', 'nf-kt', 'nf-heimilisfang'].forEach((id) => {
    const row = mk('div'); modal.appendChild(row);
    const inp = mk('input'); inp.id = id; row.appendChild(inp); reitir[id] = inp;
  });
  return { doc, modal, h2, reitir };
}
function hladaForm(svar) {
  const d = domMed();
  const window = {};
  const kall = [];
  const sb = { rpc: async (n, a) => { kall.push(a); return svar ? svar(a) : { data: { breytt: true, tharf_adgerd: ['viðvörun fyrir #' + a.p_id], gert_sjalfkrafa: [] } }; } };
  const vaktir = [];
  function MutationObserver(cb) { this.cb = cb; this.observe = (el, o) => { vaktir.push({ el, o, cb }); }; }
  vm.runInNewContext(SRC, { window, document: d.doc, setTimeout: () => 0, String, Array, Object, MutationObserver }, { filename: '527-audkenni-vidvorun.js' });
  return { A: window.AudkenniVidvorun, d, sb, kall, vaktir };
}
const FA = { nafn: 'Félag A', kennitala: '111111-1111', heimilisfang: 'A-gata 1', customer_base_id: 1 };
const FB = { nafn: 'Félag B', kennitala: '222222-2222', heimilisfang: 'B-gata 2', customer_base_id: 2 };
const setForm = (d, o) => { d.reitir['nf-nafn'].value = o.nafn; d.reitir['nf-kt'].value = o.kennitala; d.reitir['nf-heimilisfang'].value = o.heimilisfang; };
const lesaFrom = (d) => () => ({ nafn: d.reitir['nf-nafn'].value, kennitala: d.reitir['nf-kt'].value, heimilisfang: d.reitir['nf-heimilisfang'].value });

test('eyðublað: annað fyrirtækið er borið saman við SJÁLFT SIG, ekki það fyrsta (stöðugt samhengi)', async () => {
  const { A, d, sb, kall } = hladaForm();
  A.festaVidForm({ sb, id: 1, co: FA, lesaForm: lesaFrom(d) });
  setForm(d, { ...FA, nafn: 'Félag A ehf.' });
  await d.reitir['nf-nafn'].fire('change');
  assert.equal(kall.length, 1);
  assert.equal(kall[0].p_id, 1);
  assert.match(d.doc.getElementById('audkenni-forskodun').textContent, /viðvörun fyrir #1/);
  // opna fyrirtæki B — reitirnir fylltir með gildum B, óbreytt
  A.festaVidForm({ sb, id: 2, co: FB, lesaForm: lesaFrom(d) });
  assert.equal(d.doc.getElementById('audkenni-forskodun').textContent, '', 'ný opnun hreinsar fyrri viðvörun');
  assert.equal(d.doc.getElementById('audkenni-forskodun').style.display, 'none');
  setForm(d, FB);
  await d.reitir['nf-nafn'].fire('change');
  await d.reitir['nf-heimilisfang'].fire('blur');
  assert.equal(kall.length, 1, 'óbreytt fyrirtæki B kallar ekki á grunninn (gamla villan bar það saman við A og sýndi falska viðvörun)');
  // raunveruleg breyting á B
  setForm(d, { ...FB, heimilisfang: 'B-gata 9' });
  await d.reitir['nf-heimilisfang'].fire('change');
  assert.equal(kall.length, 2);
  assert.equal(kall[1].p_id, 2);
  assert.equal(kall[1].p_gamalt_heimilisfang, 'B-gata 2');
  assert.equal(kall[1].p_gamalt_nafn, 'Félag B');
  assert.match(d.doc.getElementById('audkenni-forskodun').textContent, /viðvörun fyrir #2/);
});

test('eyðublað: „Nýtt fyrirtæki“-gluggi (annar titill) fær enga forskoðun og engin kall', async () => {
  const { A, d, sb, kall } = hladaForm();
  A.festaVidForm({ sb, id: 1, co: FA, lesaForm: lesaFrom(d) });
  d.h2.textContent = 'Nýtt fyrirtæki';                       // glugginn endurnotaður án þess að lokunar-takkinn keyrði
  setForm(d, { nafn: 'Alveg nýtt', kennitala: '333333-3333', heimilisfang: 'C-gata 3' });
  await d.reitir['nf-nafn'].fire('change');
  assert.equal(kall.length, 0);
  const h = d.doc.getElementById('audkenni-forskodun');
  assert.ok(!h || (h.style.display === 'none' && h.textContent === ''));
  assert.equal(A._samhengi(), null, 'samhengið er hreinsað');
});

test('eyðublað: haetta() (glugga lokað) hreinsar samhengið og viðvörunina', async () => {
  const { A, d, sb, kall } = hladaForm();
  A.festaVidForm({ sb, id: 1, co: FA, lesaForm: lesaFrom(d) });
  setForm(d, { ...FA, nafn: 'Breytt' });
  await d.reitir['nf-nafn'].fire('change');
  assert.equal(d.doc.getElementById('audkenni-forskodun').style.display, 'block');
  A.haetta();
  assert.equal(d.doc.getElementById('audkenni-forskodun').style.display, 'none');
  await d.reitir['nf-nafn'].fire('change');
  assert.equal(kall.length, 1, 'ekkert kall eftir að glugginn var lokaður');
});

test('allar breytileiðir fyrirtækis kalla á viðvörunina í try/catch og bíða aldrei eftir henni', () => {
  const stadir = {
    'js/patches/00-legacy.js': /AudkenniVidvorun\.eftirVistun\(window\.DB\.sb, companyId, c, Object\.assign\(\{\}, c, update\)\)/,
    'js/patches/147-brunakerfi.js': /AudkenniVidvorun\.eftirVistun\(SB, coId, co, Object\.assign\(\{\}, co, updateRec\)\)/,
    'js/patches/153-arsskodun.js': /AudkenniVidvorun\.eftirVistun\(SB, coId, c, Object\.assign\(\{\}, c, patch\)\)/,
    'js/patches/157-allir-vidskiptavinir.js': /AudkenniVidvorun\.eftirVistun\(SB, coId, gamalt, Object\.assign\(\{\}, gamalt, upd\)\)/,
    'js/patches/14-companies-openedit.js': /AudkenniVidvorun\.eftirVistun\(sb, id, co, r\.data\)/
  };
  for (const [f, re] of Object.entries(stadir)) {
    const t = lesa(f);
    assert.match(t, re, f);
    assert.equal(/await\s+(window\.)?AudkenniVidvorun/.test(t), false, f + ' bíður ekki eftir viðvöruninni');
  }
  assert.match(lesa('js/patches/157-allir-vidskiptavinir.js'), /const gamalt = company \? Object\.assign\(\{\}, company\) : null;[^\n]*\n\s*if \(company\) Object\.assign\(company, upd\);/, '157: viðmiðið er tekið ÁÐUR en listaröðin er yfirskrifuð');
  assert.match(lesa('js/patches/14-companies-openedit.js'), /function restore\(\) \{\n\s*try \{ if \(window\.AudkenniVidvorun\) window\.AudkenniVidvorun\.haetta\(\); \} catch \(_\) \{\}/);
});

test('eyðublað: glugginn lokast með því að smella á bakgrunn (Modal.closeAll, restore() keyrir ekki) → samhengið hreinsast', async () => {
  const { A, d, sb, kall, vaktir } = hladaForm();
  A.festaVidForm({ sb, id: 1, co: FA, lesaForm: lesaFrom(d) });
  assert.equal(vaktir.length, 1, 'aðeins EINN hnútur vaktaður (glugginn), ekkert body-vítt');
  assert.equal(vaktir[0].el.id, 'modal-nyfyrirtaeki');
  assert.deepEqual(Array.from(vaktir[0].o.attributeFilter), ['class', 'style']);
  setForm(d, { ...FA, nafn: 'Breytt' });
  await d.reitir['nf-nafn'].fire('change');
  assert.equal(kall.length, 1);
  d.modal.opinn = false;                                   // Modal.closeAll fjarlægir class „open“ en h2 stendur enn „Breyta fyrirtæki“
  vaktir[0].cb();
  assert.equal(A._samhengi(), null);
  assert.equal(d.doc.getElementById('audkenni-forskodun').style.display, 'none');
  d.modal.opinn = true;                                    // „Nýtt fyrirtæki“ opnað í sama glugga með gamla titlinum
  setForm(d, { nafn: 'Nýtt', kennitala: '999999-9999', heimilisfang: 'X 1' });
  await d.reitir['nf-heimilisfang'].fire('change');
  assert.equal(kall.length, 1, 'engin forskoðun um gamla fyrirtækið inni í nýja formi');
});

test('eyðublað: gluggi sem er lokaður gefur enga forskoðun þótt samhengið sé enn til (virkur() skoðað við hverja keyrslu)', async () => {
  const { A, d, sb, kall } = hladaForm();
  A.festaVidForm({ sb, id: 1, co: FA, lesaForm: lesaFrom(d) });
  d.modal.opinn = false;
  setForm(d, { ...FA, nafn: 'Breytt' });
  await d.reitir['nf-nafn'].fire('change');
  assert.equal(kall.length, 0);
});

test('00-legacy-glugginn: viðvörunin kemur beint undir heimilisfangsreitnum og tengist hverjum nýjum glugga fyrir sig', async () => {
  const { A, d, sb, kall } = hladaForm();
  const box = d.doc.createElement('div'); d.doc.body.appendChild(box);
  const mkInp = (id) => { const i = d.doc.createElement('input'); i.id = id; box.appendChild(i); return i; };
  const lNafn = mkInp('_ed_nafn'), lKt = mkInp('_ed_kt'), lAddr = mkInp('_ed_addr'); const lSimi = mkInp('_ed_simi');
  Object.assign(lNafn, { value: FA.nafn }); Object.assign(lKt, { value: FA.kennitala }); Object.assign(lAddr, { value: FA.heimilisfang });
  let lifir = true;
  A.festaVidForm({ sb, id: 7, co: { ...FA, customer_base_id: 55 }, lesaForm: () => ({ nafn: lNafn.value, kennitala: lKt.value, heimilisfang: lAddr.value }),
    ids: { nafn: '_ed_nafn', kt: '_ed_kt', heimilisfang: '_ed_addr' }, eftir: lAddr, virkur: () => lifir });
  const i = box.children.indexOf(lAddr);
  assert.equal(box.children[i + 1].id, 'audkenni-forskodun', 'viðvörunin er næsta systkini heimilisfangsreitsins');
  assert.equal(box.children[i + 2], lSimi, 'og á undan næsta reit');
  lNafn.value = 'Nýtt nafn';
  await lNafn.fire('change');
  assert.equal(kall.length, 1);
  assert.equal(kall[0].p_id, 7);
  assert.equal(kall[0].p_gamall_base, 55, 'gamli greiðandinn er sendur með');
  assert.match(box.children[i + 1].textContent, /viðvörun fyrir #7/);
  lifir = false;                                           // glugginn fjarlægður (m.remove())
  lNafn.value = 'Enn annað';
  await lNafn.fire('change');
  assert.equal(kall.length, 1, 'enginn kall eftir að glugginn hvarf');
  assert.equal(A._samhengi(), null);
});

test('forskoðun: rpc sem kastar eða skilar rusli veldur aldrei villu út úr hlustara', async () => {
  const { A, d, sb } = hladaForm();
  sb.rpc = async () => { throw new Error('net'); };
  A.festaVidForm({ sb, id: 1, co: FA, lesaForm: lesaFrom(d) });
  setForm(d, { ...FA, nafn: 'Breytt' });
  await d.reitir['nf-nafn'].fire('change');                // ef þetta kastaði félli prófið
  assert.equal(d.doc.getElementById('audkenni-forskodun').style.display, 'none');
});

test('breytileiðir: 00-legacy tengir forskoðunina við sinn glugga og 147 sækir customer_base_id', () => {
  const L = lesa('js/patches/00-legacy.js');
  assert.match(L, /AudkenniVidvorun\.festaVidForm\(\{ sb:window\.DB\.sb, id:companyId, co:c, lesaForm:lesa, ids:\{nafn:'_ed_nafn',kt:'_ed_kt',heimilisfang:'_ed_addr'\}, eftir:document\.getElementById\('_ed_addr'\), virkur:function\(\)\{ return document\.body\.contains\(m\); \} \}\)/);
  assert.match(lesa('js/patches/147-brunakerfi.js'), /select\('id,nafn,kennitala,simi,heimilisfang,netfang,athugasemdir,tengiliður,customer_base_id'\)\.in\('id', ids\)/);
});

test('SQL: gamli greiðandinn óþekktur → ekkert giskað (oviss), rofinn sést í viðvöruninni, ógildar sölur teljast ekki skuld, kt_breyting_faera lokuð anon', () => {
  assert.match(SQL, /elsif kt_br then gr := 'oviss';/);
  assert.match(SQL, /gbase := case when p_gamall_base is not null then p_gamall_base when kt_br then null else f\.customer_base_id end;/);
  assert.match(SQL, /Sjálfvirka keðjan er SLÖKKT/);
  assert.match(SQL, /s\.status <> 'void' and coalesce\(s\.hidden, false\) = false/);
  assert.match(SQL, /revoke all on function public\.kt_breyting_faera\(bigint, bigint, text, text, boolean\) from public, anon, authenticated;/);
  assert.match(SQL, /create or replace function public\.kt_breyting_virkt\(\) returns boolean\nlanguage sql stable security definer set search_path to 'public'/);
});
