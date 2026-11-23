// Próf: málategundin „Ný kt félags“ í verkferilsglugganum (369) — Agnar 23.11.2026, Óðinn regla 50.
//   node --test test/krofu-ny-kt-felags.test.cjs
//
// AF HVERJU: „Láttu kerfið virka fyrir þetta ferli … kerfið þarf að geta þetta 100 %.“ Röðin er orð Agnars: FYRST ⊘ afturkalla í Payday,
// SÍÐAN ↩ bakfæra, kt félagsins færð, ný sala + ný skýrsla, salan ósend, Agnar sendir. Glugginn les hvert þrep ÚR GÖGNUNUM (ekki úr merki sem
// einhver man að setja). Það sem má ALDREI gerast:
//   1. þrep sýnist búið án þess að gögnin sýni það (afturkalla/bakfæra/kt/ný sala/ný skýrsla);
//   2. forathugun fellur eftir bakfærsluna (kreditfærð sala er á leiðinni, ekki „stenst ekki“);
//   3. nýja leiðin víkur gömlu „Færa á aðra kt.“ (hún er óbreytt) eða hverfur úr málalistanum/stofnforminu;
//   4. gömlu texti um að kredit kalli „aldrei á Payday“ standi — rangt síðan 08.10.2026 (26 afturkallar við FULLT kredit).
// Öll gögn eru tilbúin (repóið er opinbert; kennitölurnar eru gildar en tilbúnar).
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const SRC = fs.readFileSync(path.join(__dirname, '..', 'js/patches/369-krofu-vinnugluggi.js'), 'utf8').replace(/\r\n/g, '\n');

// threp og hjálparföllin sem það notar, tekin ÚR 369 og keyrð — ekki afrit.
function hladaThrep() {
  const grab = (re, nafn) => { const m = re.exec(SRC); assert.ok(m, nafn + ' fannst ekki í 369'); return m[0]; };
  const hlutir = [
    grab(/const tolur = [^\n]+\n/, 'tolur'),
    grab(/const ktBirt = [^\n]+\n/, 'ktBirt'),
    grab(/function ktGild\(s\) \{[\s\S]*?\n  \}\n/, 'ktGild'),
    grab(/const merktSend = [^\n]+\n/, 'merktSend'),
    grab(/const hefurLinur = [^\n]+\n/, 'hefurLinur'),
    grab(/function threp\(m, x, vf\) \{[\s\S]*?\n    return L;\n  \}\n/, 'threp')
  ].join('\n');
  const ctx = {};
  vm.runInNewContext(hlutir + '\nthis.threp = threp;', ctx);
  return ctx.threp;
}
const threp = hladaThrep();

const NY = '4708150270', GAMLA = '5203911859';
const M = { tegund: 'ny_kt', gognNy: { markkt: NY, marknafn: 'Stigahlíð 6-12, húsfélag', upphaflegt: { dk_invoice_id: 'PD-1' } } };
const SENT = { id: 1, num: 'R-1', status: 'final', customer_kt: '520391-1859', dk_invoice_id: 'PD-1', invoiced_at: '2026-11-23', krafa_sent_at: '2026-11-23', paid_at: null, created_at: '2026-11-23T12:00:00Z' };
const afturkallad = { ...SENT, dk_invoice_id: null, invoiced_at: null, krafa_sent_at: null };
const P = { status: 'SENT', number: '494', paid_date: null };
const NYSALA = { id: 3, num: 'R-3', customer_kt: '470815-0270', status: 'final', is_credit: false, krafa_sent_at: null, invoiced_at: null, dk_invoice_id: null };
const x0 = (o) => ({ idag: '2026-11-23', s: SENT, p: P, kreditfaert: false, kreditFullt: false, markBase: { id: 1295, nafn: 'Stigahlíð 6-12, húsfélag' },
  stadur: { nafn: 'Stigahlíð 10, húsfélag', kennitala: '520391-1859', er_i_thjonustu: true }, nySalaKt: null, nySkyrsla: null, ...(o || {}) });
const stada = (L, id) => { const t = L.find((z) => z.id === id); assert.ok(t, 'þrep vantar: ' + id); return t.ath; };

test('röðin er afturkalla → bakfæra → færa kt → ný sala → ný skýrsla → ósend → senda', () => {
  const L = threp(M, x0(), null);
  assert.deepEqual(Array.from(L, (z) => z.id), ['markkt', 'forathugun', 'markfelag', 'afturkalla', 'bakfaera', 'breyta_kt', 'ny_sala', 'ny_skyrsla', 'i_thjonustu', 'osend', 'senda']);
  const rod = Array.from(L, (z) => z.id);
  assert.ok(rod.indexOf('afturkalla') < rod.indexOf('bakfaera'), 'FYRST afturkalla, SÍÐAN bakfæra');
  assert.ok(rod.indexOf('bakfaera') < rod.indexOf('breyta_kt') && rod.indexOf('breyta_kt') < rod.indexOf('ny_sala') && rod.indexOf('ny_sala') < rod.indexOf('ny_skyrsla'));
  ['afturkalla', 'bakfaera', 'breyta_kt'].forEach((id) => assert.equal(L.find((z) => z.id === id).vardur, true, id + ' er varið þrep'));
  assert.equal(L.find((z) => z.id === 'senda').hver, 'agnar', 'lokasendingin er alltaf Agnars');
});

test('upphafsstaða: sent og ekkert gert — ekkert þrep sýnist búið nema undirbúningur', () => {
  const L = threp(M, x0(), null);
  assert.equal(stada(L, 'markkt'), true);
  assert.equal(stada(L, 'forathugun'), true);
  assert.equal(stada(L, 'markfelag'), true);
  ['afturkalla', 'bakfaera', 'breyta_kt', 'ny_sala', 'ny_skyrsla'].forEach((id) => assert.notEqual(stada(L, id), true, id + ' má ekki sýnast búið'));
  assert.notEqual(stada(L, 'senda'), true);
});

test('hvert þrep kviknar aðeins þegar gögnin sýna það', () => {
  // 1) afturkallað: sent-merkin farin
  let L = threp(M, x0({ s: afturkallad, p: { ...P, status: 'CANCELLED' } }), null);
  assert.equal(stada(L, 'afturkalla'), true);
  assert.notEqual(stada(L, 'bakfaera'), true);
  // 2) bakfært: kreditsala til
  L = threp(M, x0({ s: afturkallad, p: { ...P, status: 'CANCELLED' }, kreditfaert: true, kreditFullt: true }), null);
  assert.equal(stada(L, 'bakfaera'), true);
  assert.equal(stada(L, 'forathugun'), true, 'forathugun helst græn eftir bakfærsluna (kreditfærð sala á leiðinni)');
  assert.notEqual(stada(L, 'breyta_kt'), true);
  // 3) kt félagsins færð
  const stNy = { nafn: 'Stigahlíð 6-12, húsfélag', kennitala: '470815-0270', er_i_thjonustu: true };
  L = threp(M, x0({ s: afturkallad, kreditfaert: true, kreditFullt: true, stadur: stNy }), null);
  assert.equal(stada(L, 'breyta_kt'), true);
  assert.notEqual(stada(L, 'ny_sala'), true);
  // 4) ný sala á nýju kt (ósend)
  L = threp(M, x0({ s: afturkallad, kreditfaert: true, kreditFullt: true, stadur: stNy, nySalaKt: NYSALA }), null);
  assert.equal(stada(L, 'ny_sala'), true);
  assert.equal(stada(L, 'osend'), true);
  assert.notEqual(stada(L, 'ny_skyrsla'), true);
  assert.notEqual(stada(L, 'senda'), true);
  // 5) ný skýrsla
  L = threp(M, x0({ s: afturkallad, kreditfaert: true, kreditFullt: true, stadur: stNy, nySalaKt: NYSALA, nySkyrsla: { id: 9 } }), null);
  assert.equal(stada(L, 'ny_skyrsla'), true);
  // 6) Agnar sendi nýju kröfuna
  L = threp(M, x0({ s: afturkallad, kreditfaert: true, kreditFullt: true, stadur: stNy, nySalaKt: { ...NYSALA, krafa_sent_at: '2026-11-24', dk_invoice_id: 'PD-2' }, nySkyrsla: { id: 9 } }), null);
  assert.equal(stada(L, 'senda'), true);
  assert.equal(stada(L, 'osend'), true, 'áfanginn „ósend“ er liðinn — sent mál sýnir ekki „Ekki enn“');
});

test('kennitala nýs greiðanda ógild → þrep 1 fellur; gögn sem vantar eru „óvíst“, aldrei „búið“', () => {
  const L = threp({ ...M, gognNy: { markkt: '1234567890' } }, x0(), null);
  assert.equal(stada(L, 'markkt'), false);
  const L2 = threp(M, x0({ stadur: undefined, nySalaKt: undefined, nySkyrsla: undefined, markBase: undefined }), null);
  assert.equal(stada(L2, 'breyta_kt'), null);
  assert.equal(stada(L2, 'markfelag'), null);
  assert.notEqual(stada(L2, 'ny_sala'), true);
});

test('nýja leiðin er skráð alls staðar og gamla „Færa á aðra kt.“ er óbreytt', () => {
  assert.match(SRC, /const HANDVIRK = \{ faera_kt: 1, ny_kt: 1, krafa_ekki_stofnud: 1, annad: 1 \};/);
  assert.match(SRC, /const KT_TEG = \{ faera_kt: 1, ny_kt: 1 \};/);
  assert.match(SRC, /ny_kt:\s+\{ l: 'Ný kt félags'/);
  assert.match(SRC, /faera_kt: 1, ny_kt: 1,/, 'HOPUR');
  assert.match(SRC, /\['faera_kt', 'ny_kt', 'krafa_ekki_stofnud', 'annad'\]\.map/, 'stofnformið býður nýju leiðina');
  assert.match(SRC, /\(KT_TEG\[m\.tegund\] \? markHtml\(gl, lok\) : ''\)/);
  assert.match(SRC, /if \(KT_TEG\[m\.tegund\] && !ktGild\(/, 'vinnsla krefst gildrar kennitölu');
  assert.match(SRC, /if \(KT_TEG\[tegund\]\) \{\n\s*const kt = tolur\(gl\.drog\.f_kt\);/, 'stofnun máls vistar markkt');
  assert.match(SRC, /case 'faera_kt': \{\n\s*const mk = tolur\(g\.markkt\);/, 'gamla leiðin stendur óbreytt');
  assert.match(SRC, /uppfaera_solu/);
});

test('úreltur texti um Payday er leiðréttur (26 afturkallar kröfuna við FULLT kredit á ógreiddan reikning)', () => {
  assert.equal(/hún kallar aldrei á Payday/.test(SRC), false);
  assert.equal(/er röng leið — hún kallar ekki á Payday/.test(SRC), false);
  assert.match(SRC, /FULLT kredit afturkallar kröfuna í Payday/);
  assert.match(SRC, /ny_kt: '⚠-þrepin eru unnin í þessari röð og hvert lesið til baka \(orð Agnars 23\.11\.2026\): FYRST ⊘ Afturkalla í Payday, SÍÐAN ↩ Bakfæra/);
});

test('ny_kt sækir aðeins aukagögnin þegar málið er af þeirri gerð og tekur ekki tímasíu á skýrsluna', () => {
  assert.match(SRC, /const nyKt = m\.tegund === 'ny_kt' && fid && s;/);
  assert.match(SRC, /nyKt \? c\.from\('solur'\)[^\n]+\.neq\('id', s\.id\)/);
  assert.match(SRC, /nyKt \? c\.from\('customer_documents'\)[^\n]+\.eq\('doc_type', 'uttektarskyrsla'\)\.eq\('year', AR\(\)\)/);
  assert.equal(/eq\('doc_type', 'uttektarskyrsla'\)\.gte\('created_at'/.test(SRC), false, 'endurgerð skýrsla heldur skjalaröðinni — engin tímasía');
});

test('gögnin hafa síðasta orðið: „gert“-merki gerir aldrei þrep búið þegar gögnin segja nei', () => {
  const vf = { skref: { afturkalla: { gert: true }, bakfaera: { gert: true }, breyta_kt: { gert: true }, ny_sala: { gert: true }, ny_skyrsla: { gert: true } }, gogn: M.gognNy };
  // Sent, ekkert gert í raun — samt merkt af „agent“: ekkert þrep má sýnast búið
  const L = threp(M, x0({ nySalaKt: null, nySkyrsla: null }), vf);
  ['afturkalla', 'bakfaera', 'breyta_kt', 'ny_sala', 'ny_skyrsla'].forEach((id) => assert.equal(stada(L, id), false, id + ': gögnin segja nei, merkið ræður ekki'));
  // Gögn sem vantar (undefined) mega enn nota merkið sem varaleið
  const L2 = threp(M, x0({ s: afturkallad, stadur: undefined, nySalaKt: undefined, nySkyrsla: undefined }), vf);
  assert.equal(stada(L2, 'ny_sala'), true);
  assert.equal(stada(L2, 'ny_skyrsla'), true);
});

test('bakfærsla = FULLT kredit: hlutakredit er ekki „bakfært“ og forathugun grænkar ekki af því', () => {
  const greidd = { ...afturkallad, paid_at: '2026-11-23' };
  const L = threp(M, x0({ s: greidd, p: { ...P, status: 'CANCELLED' }, kreditfaert: true, kreditFullt: false }), null);
  assert.notEqual(stada(L, 'bakfaera'), true, 'hlutakredit er ekki bakfærsla');
  assert.notEqual(stada(L, 'forathugun'), true, 'forathugun grænkar ekki af hlutakredit (greidd sala stenst ekki forathugun)');
  const L2 = threp(M, x0({ s: afturkallad, p: { ...P, status: 'CANCELLED' }, kreditfaert: true, kreditFullt: true }), null);
  assert.equal(stada(L2, 'bakfaera'), true);
  assert.match(SRC, /x\.kreditFullt = !!\(s && !s\.is_credit && !rkr\.error && \(rkr\.data \|\| \[\]\)\.reduce\(/);
  assert.match(SRC, /select\('id,num,samtals'\)\.eq\('is_credit', true\)\.eq\('credit_of', s\.id\)/);
});

test('„í þjónustu á nýju kt“ er hlutlaust þar til kt er færð; „nýi greiðandinn“ er aldrei ✗ í eðlilegri stöðu', () => {
  let L = threp(M, x0(), null);                                   // kt enn gamla
  assert.equal(stada(L, 'i_thjonustu'), null);
  assert.equal(stada(L, 'markfelag'), true);
  L = threp(M, x0({ markBase: null }), null);                     // nýi greiðandinn ekki til enn (keðjan stofnar hann)
  assert.equal(stada(L, 'markfelag'), null, 'ekki ✗ — eðlilegt þar til kt er færð');
  const stNy = { nafn: 'F', kennitala: '470815-0270', er_i_thjonustu: true };
  L = threp(M, x0({ stadur: stNy }), null);
  assert.equal(stada(L, 'i_thjonustu'), true);
  L = threp(M, x0({ stadur: { ...stNy, er_i_thjonustu: false } }), null);
  assert.equal(stada(L, 'i_thjonustu'), false, 'kt færð en félagið ekki í þjónustu = raunveruleg villa');
});

test('SQL: tegundarskorðan leyfir ny_kt (annars „Málið stofnaðist ekki“)', () => {
  const sql = fs.readFileSync(path.join(__dirname, '..', 'sql/2026-11-23_krofu_verkferli_ny_kt.sql'), 'utf8');
  assert.match(sql, /'faera_kt','ny_kt','gleymt'/);
  assert.match(sql, /drop constraint if exists krofu_verkferli_tegund_check/);
});
