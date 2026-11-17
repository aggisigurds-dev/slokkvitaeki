// Reiknings-PDF fylgir SÖLUNNI (517, 17.11.2026). Keyrsla: node --test test/reikningur-pdf-fylgir-solu.test.cjs
//
// Agnar 17.11.2026: „það er ennþá vitlaus kennitala á bölv reikningnum“. Það sem opnaðist var PDF-afrit kreditfærða
// reikningsins á gömlu kennitölunni; nýja salan átti sitt eigið, rétt PDF. Það sem má ALDREI bila:
//   1. PDF-afrit sölu = nákvæmlega sama R-númer (aldrei fyrsta skjal ársins, aldrei hlutstrengur), ekki leyst af hólmi;
//   2. kreditfærður reikningur er þekktur af solur (credit_of EÐA kredit_a) og er aldrei „gildandi reikningur“;
//   3. Afgreiðslan merkir tengil á kreditfærðan reikning (áður „Reikningur R-… (PDF)“ eins og hver annar);
//   4. tölvupóstur sendir aldrei vistað PDF sem stemmir ekki við söluna, og aldrei kreditfærðan reikning;
//   5. ósend sala sem breyttist fær nýtt PDF á kt SÖLUNNAR; það gamla merkt „leyst af hólmi“ — engu eytt;
//   6. þjónsafritið (_reikningur-solu.cjs) er nákvæmlega sama skrá og vafrinn keyrir (517).
// Gervigögn: engin raunnöfn né raunkennitölur.
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROT = path.join(__dirname, '..');
process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'https://gervi.supabase.co';   // afgreidsla.cjs les slóðina við hleðslu
// package.json er "type": "module" — .js er ESM í node; þjónsafritið (.cjs, sama skrá) er það sem node keyrir
const RS = require('../netlify/functions/_reikningur-solu.cjs');

const KT_GAMLA = '0101010190', KT_NYJA = '0202020290';
const salaNy = { id: 2, num: 'R-009002', customer_id: 77, customer_kt: '020202-0290', customer_nafn: 'Nýja búðin ehf.', samtals: 36685, status: 'final',
  created_at: '2026-11-16T15:51:36Z', linur: [{ nafn: 'Skýrslugerð', magn: 1, verd: 4600, vsk: 24 }, { nafn: 'Akstur', magn: 2, verd: 7200, vsk: 24 }] };
const vidhengi = [
  { id: 'a1', kind: 'reikningur', name: 'Gamla búðin - 010101-0190 - 2026 - R-009001 - #77.pdf', path: 'company_attachments/77/1_gamla.pdf', uploaded_at: '2026-10-07T10:00:00Z' },
  { id: 'a2', kind: 'reikningur', name: 'Nýja búðin ehf. - 020202-0290 - 2026 - R-009002 - #77.pdf', path: 'company_attachments/77/2_nyja.pdf', uploaded_at: '2026-11-16T10:00:00Z' },
];

test('1. velja: nákvæmlega R-númer sölunnar — aldrei fyrsta skjal ársins, aldrei hlutstrengur, ekki leyst af hólmi', () => {
  assert.strictEqual(RS.velja(salaNy, vidhengi, []).id, 'a2');
  assert.strictEqual(RS.velja({ num: 'R-009001' }, vidhengi, []).id, 'a1');
  assert.strictEqual(RS.velja({ num: 'R-000900' }, [{ kind: 'reikningur', name: 'X - R-0009001.pdf', path: 'p' }], []), null, 'hlutstrengur telst ekki');
  assert.strictEqual(RS.velja(salaNy, [Object.assign({}, vidhengi[1], { leyst_af: 'nýtt' })], []), null);
  // skjalaröðin er varaleið (sama R-númer, ekki tvítak) og gefur upphæðina
  const v = RS.velja(salaNy, [], [{ id: 5, doc_type: 'reikningur', invoice_number: 'R-009001', storage_path: 'x' }, { id: 6, doc_type: 'reikningur', invoice_number: 'R-009002', storage_path: 'samningar/y', amount: 36685 }]);
  assert.strictEqual(v.skjal.id, 6);
});

test('2. kreditMap: credit_of EÐA kredit_a — ógild kreditnóta telst ekki', () => {
  const solur = [{ id: 1, num: 'R-009001' }, { id: 2, num: 'R-009002' }];
  assert.deepStrictEqual(RS.kreditMap([{ num: 'R-009003', credit_of: 1, is_credit: true }], solur), { 'R-009001': 'R-009003' });
  assert.deepStrictEqual(RS.kreditMap([{ num: 'R-009003', kredit_a: 'R-009001', is_credit: true }], solur), { 'R-009001': 'R-009003' });
  assert.deepStrictEqual(RS.kreditMap([{ num: 'R-009003', credit_of: 1, is_credit: true, status: 'void' }], solur), {});
});

test('3. bera: kt og R-númer stöðva, upphæð og nafn vara, kreditfærð sala stöðvar', () => {
  assert.strictEqual(RS.bera(salaNy, RS.velja(salaNy, vidhengi, []), {}).stemmir, true);
  const gamaltAfrit = Object.assign({}, vidhengi[1], { name: 'Gamla búðin - 010101-0190 - 2026 - R-009002 - #77.pdf' });
  const d1 = RS.bera(salaNy, gamaltAfrit, {});
  assert.strictEqual(d1.stemmir, false);
  assert.ok(d1.misraemi.some((m) => m.svid === 'kt' && m.stodvar));
  assert.ok(RS.urelt(d1));
  const d2 = RS.bera(salaNy, Object.assign({}, vidhengi[1], { skjal: { amount: 37925 } }), {});
  assert.ok(d2.stemmir && d2.misraemi.some((m) => m.svid === 'upphaed' && !m.stodvar) && RS.urelt(d2), 'upphæð breyttist → nýtt PDF, en ekki rautt');
  const d3 = RS.bera({ num: 'R-009001', customer_kt: KT_GAMLA }, vidhengi[0], { kredit: 'R-009003' });
  assert.strictEqual(d3.stemmir, false);
  assert.match(d3.misraemi[0].texti, /kreditfærður með R-009003/);
});

test('4. þjónsafritið er nákvæmlega sama skrá og vafrinn keyrir', () => {
  const a = fs.readFileSync(path.join(ROT, 'js/patches/517-reikningur-solu.js'), 'utf8');
  const b = fs.readFileSync(path.join(ROT, 'netlify/functions/_reikningur-solu.cjs'), 'utf8');
  assert.strictEqual(b, a, 'netlify/functions/_reikningur-solu.cjs verður að vera afrit af js/patches/517-reikningur-solu.js (cp)');
  const html = fs.readFileSync(path.join(ROT, 'index.html'), 'utf8');
  assert.match(html, /517-reikningur-solu\.js\?v=/);
});

// ── Afgreiðsla: tengill á kreditfærðan reikning er merktur ────────────────────────────────────────────────
test('5. Afgreiðsla: „Reikningur R-… (PDF)“ á kreditfærða söluna segir KREDITFÆRÐUR (sá nýi ekki)', async () => {
  const P = require('../netlify/functions/_portal.cjs');
  const orig = P.sbGet;
  P.sbGet = async (qs) => {
    const svar = (d) => ({ ok: true, status: 200, json: async () => d, text: async () => JSON.stringify(d) });
    if (/^solur\?select=id,num&id=in/.test(qs)) return svar([{ id: 1, num: 'R-009001' }, { id: 2, num: 'R-009002' }, { id: 4, num: 'R-009004' }]);
    if (/^solur\?select=id,num(,samtals)?&num=in/.test(qs)) return svar([{ id: 1, num: 'R-009001', samtals: 1000 }, { id: 2, num: 'R-009002', samtals: 2000 }, { id: 4, num: 'R-009004', samtals: 8432 }]);
    if (/^solur\?select=num,credit_of/.test(qs)) return svar([{ num: 'R-009003', credit_of: 1, kredit_a: 'R-009001', is_credit: true, status: 'final', samtals: -1000 },
      { num: 'R-009005', credit_of: 4, is_credit: true, status: 'final', samtals: -1426 }]);
    if (/^customer_documents/.test(qs)) return svar([{ id: 10, invoice_number: 'R-009001', storage_path: 'samningar/a.pdf' }, { id: 11, invoice_number: 'R-009002', storage_path: 'samningar/b.pdf' }, { id: 12, invoice_number: 'R-009004', storage_path: 'samningar/c.pdf' }]);
    return svar([]);
  };
  try {
    const A = require('../netlify/functions/afgreidsla.cjs');
    assert.ok(A._leysaTilvisanir, 'afgreidsla.cjs flytur út _leysaTilvisanir');
    const leysa = await A._leysaTilvisanir([{ tegund: 'sala', id: 1 }, { tegund: 'sala', id: 2 }, { tegund: 'sala', id: 4 }]);
    const gamall = leysa({ tegund: 'sala', id: 1 }), nyr = leysa({ tegund: 'sala', id: 2 });
    const hluti = leysa({ tegund: 'sala', id: 4 });
    assert.match(hluti.texti, /R-009004 \(PDF\) — kreditað að hluta \(−1\.426 kr, R-009005\)/, 'hlutakredit: gildir, kreditið nefnt');
    assert.strictEqual(hluti.kreditfaert, null);
    assert.match(gamall.texti, /R-009001 \(PDF\) — KREDITFÆRÐUR með R-009003, gildir ekki/);
    assert.strictEqual(gamall.kreditfaert, 'R-009003');
    assert.strictEqual(nyr.texti, 'Reikningur R-009002 (PDF)');
  } finally { P.sbGet = orig; }
});

// ── Vafrahermir fyrir 254 og 233 ──────────────────────────────────────────────────────────────────────────
function gerviSb(gogn, skrar) {
  // gogn: { solur:[], customer_documents:[], fyrirtaeki:[] } — síur eq/in/or einfaldar; skrar: skráð update/insert
  function bygg(tafla) {
    const st = { tafla, sia: [], op: 'select', gildi: null, einn: false };
    const b = {
      select() { return b; }, order() { return b; }, limit() { return b; }, range() { return b; },
      eq(k, v) { st.sia.push((r) => String(r[k]) === String(v)); return b; },
      in(k, v) { st.sia.push((r) => v.map(String).includes(String(r[k]))); return b; },
      or() { return b; }, is() { return b; }, neq() { return b; }, gt() { return b; },
      maybeSingle() { st.einn = true; return b; }, single() { st.einn = true; return b; },
      update(g) { st.op = 'update'; st.gildi = g; return b; }, insert(g) { st.op = 'insert'; st.gildi = g; return b; },
      then(res, rej) {
        const rows = (gogn[tafla] || []).filter((r) => st.sia.every((f) => f(r)));
        if (st.op !== 'select') { skrar.push({ tafla, op: st.op, gildi: st.gildi, rows: rows.map((r) => r.id) }); return Promise.resolve({ data: st.op === 'insert' ? [{ id: 999 }] : rows.map((r) => ({ id: r.id })), error: null }).then(res, rej); }
        return Promise.resolve({ data: st.einn ? (rows[0] || null) : rows, error: null }).then(res, rej);
      },
    };
    return b;
  }
  return { from: bygg, storage: { from: () => ({ getPublicUrl: (p) => ({ data: { publicUrl: 'https://x/' + p } }), remove: async () => ({}) }) } };
}
function gerviJsPDF(texti) {
  return function () {
    const doc = new Proxy({}, { get(_, k) {
      if (k === 'text') return (s) => { texti.push(String(s)); return doc; };
      if (k === 'splitTextToSize') return (s) => [String(s)];
      if (k === 'output') return () => new Blob([texti.join('\n')], { type: 'application/pdf' });
      if (k === 'getTextWidth') return () => 10;
      if (k === 'internal') return { pageSize: { getWidth: () => 210, getHeight: () => 297 } };
      return () => doc;
    } });
    return doc;
  };
}
function vafri({ gogn, vidhengi: vid, kreditnotur = [] }) {
  const skrar = [], upp = [], supersede = [], texti = [], fetchSkra = [];
  const sb = gerviSb(Object.assign({ solur: [] }, gogn), skrar);
  // saekjaKredit les solur: kreditnótur eru í solur-töflunni með is_credit
  const solurOll = (gogn.solur || []).concat(kreditnotur);
  sb.from = ((upprunalegt) => (t) => t === 'solur' ? gerviSb({ solur: solurOll }, skrar).from('solur') : upprunalegt(t))(sb.from);
  const win = {
    DB: { sb }, Toast: { show() {} }, logProblem() {}, SUPABASE_URL: 'https://gervi.supabase.co', addEventListener() {},
    jspdf: { jsPDF: gerviJsPDF(texti) },
    CompanyAttachments: {
      list: () => vid,
      upload: async (coId, file, opts) => { upp.push({ coId, name: file.name, opts, size: file.size }); return { path: 'company_attachments/' + coId + '/3_ny.pdf', name: file.name }; },
      supersede: async (coId, ids, nafn) => { supersede.push({ coId, ids, nafn }); return true; },
      getPublicUrl: async (p) => 'https://gervi/' + p,
    },
    UttektInvoicePdf: null,
  };
  const ctx = {
    window: win, document: { addEventListener() {}, dispatchEvent() {}, createElement: () => ({ getContext: () => ({}) }), head: { appendChild() {} } },
    console: { log() {}, warn() {}, error() {} }, Blob, File, FileReader: class { readAsDataURL(b) { b.arrayBuffer().then((ab) => { this.result = 'data:application/pdf;base64,' + Buffer.from(ab).toString('base64'); this.onloadend(); }); } },
    Image: class { set src(_) { setTimeout(() => this.onerror && this.onerror(), 0); } }, CustomEvent: class { constructor(t, o) { this.type = t; this.detail = o && o.detail; } },
    fetch: async (u, o) => { fetchSkra.push({ u, o }); if (o && o.method === 'HEAD') return { ok: true, headers: { get: () => String((upp[upp.length - 1] || {}).size || '') } }; if (/brunaholf/.test(u)) return { ok: false, status: 503, json: async () => ({}) }; return { ok: true, blob: async () => new Blob(['VISTAD-AFRIT']) }; },
    AbortController, setTimeout: (f) => setTimeout(f, 0), clearTimeout, Promise, Date, Math, JSON, String, Number, Object, Array, RegExp, Error, Set, Map, Buffer,
  };
  ctx.window.document = ctx.document;
  vm.createContext(ctx);
  for (const f of ['517-reikningur-solu.js', '233-uttekt-pdf-autosave.js', '254-receipt-sender.js']) {
    vm.runInContext('(function(window){' + fs.readFileSync(path.join(ROT, 'js/patches', f), 'utf8').replace(/^﻿/, '') + '\n}).call(window, window);', ctx, { filename: f });
  }
  // skrárnar vísa á `window.X` OG bert `X` — gerum hnattrænu nöfnin aðgengileg
  for (const k of Object.keys(win)) ctx[k] = win[k];
  return { win, ctx, skrar, upp, supersede, texti, fetchSkra };
}

test('6. tölvupóstur (254): vistað PDF á gamalli kt fylgir EKKI — PDF teiknað úr sölunni; kreditfærður → ekkert PDF', async () => {
  const urelt = [{ id: 'a9', kind: 'reikningur', name: 'Gamla búðin - 010101-0190 - 2026 - R-009002 - #77.pdf', path: 'company_attachments/77/9_gamalt.pdf' }];
  const V = vafri({ gogn: { solur: [salaNy], fyrirtaeki: [{ id: 77, nafn: 'Nýja búðin ehf.', kennitala: KT_NYJA }], customer_documents: [] }, vidhengi: urelt });
  const r = await V.win.ReceiptSender.invoiceAttachment(2);
  assert.ok(r && r.content, 'skilar PDF');
  const efni = Buffer.from(r.content, 'base64').toString('utf8');
  assert.notStrictEqual(efni, 'VISTAD-AFRIT', 'úrelta afritið (gömul kt) má ekki fara í póst');
  assert.match(efni, /kt\. 020202-0290/, 'PDF teiknað úr sölunni ber kt sölunnar');

  const K = vafri({ gogn: { solur: [Object.assign({}, salaNy, { id: 1, num: 'R-009001', customer_kt: '010101-0190' })], customer_documents: [] }, vidhengi: [vidhengi[0]],
    kreditnotur: [{ id: 3, num: 'R-009003', credit_of: 1, kredit_a: 'R-009001', is_credit: true, status: 'final' }] });
  assert.strictEqual(await K.win.ReceiptSender.invoiceAttachment(1), null, 'kreditfærður reikningur fer aldrei í póst');
});

test('7. vistun (233): ósend sala á nýrri kt → nýtt PDF á kt sölunnar, gamla „leyst af hólmi", röðin færð, engu eytt', async () => {
  const gamaltAfrit = { id: 'a9', kind: 'reikningur', name: 'Gamla búðin - 010101-0190 - 2026 - R-009002 - #77.pdf', path: 'company_attachments/77/9_gamalt.pdf' };
  const V = vafri({ gogn: {
    solur: [salaNy], fyrirtaeki: [{ id: 77, nafn: 'Nýja búðin ehf.', kennitala: KT_NYJA }],
    customer_documents: [{ id: 50, invoice_number: 'R-009002', storage_path: 'samningar/company_attachments/77/9_gamalt.pdf', amount: 36685, doc_type: 'reikningur' }],
  }, vidhengi: [gamaltAfrit] });
  const m = await V.win.UttektInvoicePdf.saveForSale(77, salaNy, {});
  assert.ok(m && m.path, 'nýtt afrit vistað (gamla kóðinn sleppti: „afrit með R-númerinu er til")');
  assert.strictEqual(V.upp.length, 1);
  assert.match(V.upp[0].name, /^Nýja búðin ehf\. - 020202-0290 - 2026 - R-009002 - #77\.pdf$/);
  assert.ok(V.texti.some((t) => t === 'kt. 020202-0290'), 'PDF-ið prentar kt sölunnar');
  assert.deepStrictEqual(V.supersede.map((x) => x.ids), [['a9']], 'gamla afritið merkt leyst af hólmi');
  const upd = V.skrar.find((x) => x.tafla === 'customer_documents' && x.op === 'update');
  assert.ok(upd && upd.gildi.storage_path === 'samningar/company_attachments/77/3_ny.pdf', 'skjalaröðin bendir á nýja afritið');
  assert.match(upd.gildi.notes, /eldra PDF-afrit .*9_gamalt\.pdf/, 'gamla slóðin skráð — afturkræft');
  assert.ok(!V.skrar.some((x) => x.op === 'delete'), 'engu eytt');

  // stemmir afritið → ekkert gert; send sala → ekkert gert
  const S = vafri({ gogn: { solur: [salaNy], fyrirtaeki: [{ id: 77, nafn: 'Nýja búðin ehf.', kennitala: KT_NYJA }], customer_documents: [] }, vidhengi: [vidhengi[1]] });
  assert.strictEqual(await S.win.UttektInvoicePdf.saveForSale(77, salaNy, {}), null);
  const T = vafri({ gogn: { solur: [], fyrirtaeki: [{ id: 77, nafn: 'Nýja búðin ehf.', kennitala: KT_NYJA }], customer_documents: [] }, vidhengi: [gamaltAfrit] });
  assert.strictEqual(await T.win.UttektInvoicePdf.saveForSale(77, Object.assign({}, salaNy, { krafa_sent_at: '2026-11-17T10:00:00Z' }), {}), null, 'sendur reikningur: afritið stendur');
  assert.strictEqual(T.upp.length + S.upp.length, 0);
});

test('8. PDF-ið prentar þann sem salan rukkar (kt sölunnar), ekki kt staðarins', () => {
  const V = vafri({ gogn: {}, vidhengi: [] });
  const k = V.win.UttektInvoicePdf.kaupandi({ customer_kt: '020202-0290', customer_nafn: 'Greiðandinn ehf.' }, { nafn: 'Staðurinn', kennitala: KT_GAMLA, heimilisfang: 'Gata 1' });
  assert.deepStrictEqual(JSON.parse(JSON.stringify(k)), { nafn: 'Greiðandinn ehf.', kennitala: KT_NYJA, heimilisfang: '' });
  const k2 = V.win.UttektInvoicePdf.kaupandi({ customer_kt: '010101-0190', customer_nafn: 'x' }, { nafn: 'Staðurinn', kennitala: KT_GAMLA, heimilisfang: 'Gata 1' });
  assert.strictEqual(k2.nafn, 'Staðurinn');
});

test('9. fyrirtækjaspjaldið (199), pörin (311/253) og gáttin nota kreditregluna', () => {
  const s199 = fs.readFileSync(path.join(ROT, 'js/patches/199-doc-year-grid.js'), 'utf8');
  assert.match(s199, /ReikningurSolu\.saekjaKredit/);
  assert.match(s199, /invArr=invArr\.filter\(function\(x\)\{ return !\(x && x\._kredit\); \}\)/, 'kreditfærður reikningur er aldrei valinn sem reikningur ársins');
  // Óháð rýni 17.11 (2): parið er ALDREI skrifað við opnun spjalds — kredit_skipti aðeins í smell-hlustaranum, með staðfestingu og hver.
  const iSmelli = s199.indexOf("var ksEl=e.target.closest('[data-kredit-skipti]')");
  assert.ok(iSmelli > 0, 'tillögutakkinn hefur smell-hlustara');
  const kallKredit = [...s199.matchAll(/savePair\([^;]*?matched_by: 'kredit_skipti'/g)].map((m) => m.index);
  assert.ok(kallKredit.length === 1 && kallKredit[0] > iSmelli, 'savePair(kredit_skipti) aðeins í smell-hlustaranum');
  assert.match(s199.slice(iSmelli, iSmelli + 2500), /Confirm\.show|confirm\(/);
  assert.match(s199.slice(iSmelli, iSmelli + 2500), /festur af '\+hver/);
  for (const f of ['311-doc-pairs-band.js', '253-sala-customer-history.js']) assert.match(fs.readFileSync(path.join(ROT, 'js/patches', f), 'utf8'), /if \(_kred\[s\.num\]\) return;/, f);
  const g = fs.readFileSync(path.join(ROT, 'netlify/functions/gatt.cjs'), 'utf8');
  assert.match(g, /select=num,credit_of,kredit_a,status,is_credit,samtals/, 'gáttin sækir kreditnóturnar sjálfar, með upphæð');
});

// ── Óháð rýni 17.11.2026 (2): HLUTAKREDIT er ekki kreditfærsla ──────────────────────────────────────────────
test('10. kreditStada: aðeins fullt kredit fellir reikning — hluti gildir (R-000911- og R-001025-líkur)', () => {
  const solur = [{ id: 1, num: 'R-009011', samtals: '8432' }, { id: 2, num: 'R-009025', samtals: '29047' }, { id: 3, num: 'R-009030', samtals: '10000' }, { id: 4, num: 'R-009040', samtals: '0' }];
  const kn = [{ num: 'R-009012', credit_of: 1, is_credit: true, samtals: '-1426' },          // 1.426 af 8.432
              { num: 'R-009026', credit_of: 2, is_credit: true, samtals: '-16820' },         // 16.820 af 29.047
              { num: 'R-009031', credit_of: 3, is_credit: true, samtals: '-6000' },          // tvær nótur = full upphæð
              { num: 'R-009032', kredit_a: 'R-009030', is_credit: true, samtals: '-4000' },
              { num: 'R-009041', credit_of: 4, is_credit: true, samtals: '-8410' }];         // yfirkredit á 0-reikning
  assert.deepStrictEqual(RS.kreditMap(kn, solur), { 'R-009030': 'R-009031, R-009032', 'R-009040': 'R-009041' });
  const st = RS.kreditStada(kn, solur);
  assert.strictEqual(st['R-009011'].full, false); assert.strictEqual(st['R-009011'].kreditad, 1426);
  assert.strictEqual(st['R-009025'].full, false); assert.strictEqual(st['R-009025'].kreditad, 16820);
  assert.strictEqual(st['R-009030'].full, true);
});

test('11. kúnnavefurinn (gatt.cjs): hlutakreditaður reikningur stendur með athugasemd; fullt kreditaður hverfur', () => {
  process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'https://gervi.supabase.co';
  const G = require('../netlify/functions/gatt.cjs');
  const rows = [{ id: 1, num: 'R-009011', status: 'final', is_credit: false, samtals: '8432' }, { id: 2, num: 'R-009025', status: 'final', is_credit: false, samtals: '29047' },
                { id: 3, num: 'R-009030', status: 'final', is_credit: false, samtals: '10000' }];
  const kn = [{ num: 'R-009012', credit_of: 1, is_credit: true, status: 'final', samtals: '-1426' }, { num: 'R-009026', credit_of: 2, is_credit: true, status: 'final', samtals: '-16820' },
              { num: 'R-009031', credit_of: 3, is_credit: true, status: 'final', samtals: '-10000' }];
  const ut = G._kreditSia([{ nr: 'R-009011' }, { nr: 'R-009025' }, { nr: 'R-009030' }], rows, kn);
  assert.deepStrictEqual(ut.map((i) => i.nr), ['R-009011', 'R-009025']);
  assert.deepStrictEqual(ut[0].kreditad_ad_hluta, { upphaed: 1426, notur: ['R-009012'] });
  assert.deepStrictEqual(ut[1].kreditad_ad_hluta, { upphaed: 16820, notur: ['R-009026'] });
  const portal = fs.readFileSync(path.join(ROT, 'gatt/portal.js'), 'utf8');
  assert.match(portal, /Kreditað að hluta: /, 'framendinn sýnir kreditið');
});

test('12. allir sem spyrja um kredit sækja upphæðirnar (annars telst hluti fullt)', () => {
  const les = (f) => fs.readFileSync(path.join(ROT, f), 'utf8');
  assert.match(les('js/patches/517-reikningur-solu.js'), /select\('num,credit_of,kredit_a,status,is_credit,samtals'\)/);
  assert.match(les('js/patches/517-reikningur-solu.js'), /select\('id,num,samtals'\)/);
  assert.match(les('netlify/functions/afgreidsla.cjs'), /select=num,credit_of,kredit_a,status,is_credit,samtals/);
  assert.match(les('netlify/functions/afgreidsla.cjs'), /select=id,num,samtals&num=in/);
  assert.match(les('netlify/functions/gatt.cjs'), /select=id,num,status,is_credit,credit_of,kredit_a,samtals/);
  for (const t of ['tools/audit-reikningur-solu.cjs', 'tools/endurspilun-reikningur-pdf.cjs']) assert.match(les(t), /credit_of,kredit_a,status,is_credit,samtals/, t);
});
