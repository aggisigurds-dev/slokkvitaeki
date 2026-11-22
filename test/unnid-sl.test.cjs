// Próf á Slökkvitækis-„Unnið“ (22.11.2026, reglur Agnars 21.–22.11). Keyrsla: timeout 90 node --test test/unnid-sl.test.cjs
//
// AF HVERJU: gamla reglan taldi sölu á söludegi. Agnar: skoðanir (ársþjónusta, brunakerfi, slökkvikerfi) telja í mánuði
// skoðunarinnar skv. skýrslunni — þótt ógreiddar — og hleðsla af verkstæði þegar tækið er merkt done og sent í afgreiðslu
// (verkbeidnir.klart_at). Það sem má aldrei bila:
//   1. samtölur allra mánaða = samtölur gömlu reglunnar (sala er færð til, aldrei bætt við eða týnd);
//   2. engin skýrsla / óviss skýrsla / áætluð verkstæðistekja er MERKT, aldrei falin og aldrei 0;
//   3. V-hluti verkstæðis telst ekki tvisvar (salan telur afganginn);
//   4. bakfært telst aldrei, kreditnóta fylgir upprunasölunni;
//   5. ár sem er út fyrir bil (2027-08 á skýrslu frá 2026) er leiðrétt; svarið geymir aðeins samtölur (engin nöfn).
// Gögnin eru tilbúin (engin raunveruleg nöfn, kennitölur eða upphæðir — repóið er opið).
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const T = require('../netlify/functions/_tekjur.cjs');
const U = require('../netlify/functions/_unnid-sl.cjs');

const NU = '2026-11-22T10:00:00Z';
let nid = 100;
const sala = (o) => ({ id: ++nid, num: 'R-' + String(nid).padStart(6, '0'), status: 'final', vidskiptategund: 'uttekt', credit_of: null, upphaed_an_vsk: 1000,
  created_at: '2026-11-20T10:00:00Z', customer_base_id: 7, customer_id: 70, linur: [], ...o });
const skyrsla = (o) => ({ id: ++nid, doc_type: 'uttektarskyrsla', doc_date: '2026-11-20', customer_base_id: 7, fyrirtaeki_id: 70, is_duplicate: false, skodun_ar_man: null,
  notes: 'Prófunarfyrirtæki - 0000000000 - 2026 - nóvember - úttektarskýrsla - #1.pdf', ...o });
const nafn = (ar, man) => `Prófunarfyrirtæki - 0000000000 - ${ar} - ${man} - úttektarskýrsla - #1.pdf`;
const lin = (desc, qty, p = 100) => ({ desc, qty, unit_price_ex_vat: p });
const reikna = (g, nu = NU) => U.unnidManudir({ solur: [], voidIds: [], skyrslur: [], verkbeidnir: [], verklidir: [], ...g }, nu);
const heild = (r) => Object.values(r.man).reduce((a, x) => a + Object.values(x.kr).reduce((b, v) => b + v, 0), 0) + r.annad.i_vinnslu_kr + r.annad.fyrir_yfirtoku_kr;

test('skoðunarmánuður: síðbúin skýrsla — Framkvæmd „júní“ á skýrslu sem er gerð í nóvember fer á júní, ekki nóvember (9 %-tilvikið)', () => {
  const s = sala({ upphaed_an_vsk: 50000 });
  const r = reikna({ solur: [s], skyrslur: [skyrsla({ notes: nafn(2026, 'júní') })] });
  assert.equal(r.man['2026-06'].kr.arsthjonusta, 50000);
  assert.equal(U.manudSamantekt(r.man['2026-11']).samtals.kr, 0, 'engar TEKJUR í nóvember — salan er færð, ekki afrituð');
  assert.equal(r.man['2026-06'].mat.an_skyrslu_kr, 0, 'skýrsla fannst');
  assert.equal(r.man['2026-06'].mat.oviss_kr, 0);
  // „skýrslur sendar“ telja eftir raunverulegum kláradegi: skýrslan klárast í nóvember (síðbúin: skoðun í júní)
  assert.equal(r.man['2026-11'].mat.skyrslur_klaradar, 1); assert.equal(r.man['2026-11'].mat.skyrslur_sidbuin, 1);
  assert.equal(U.manudSamantekt(r.man['2026-11']).skodanir.skyrslur_klaradar, 1);
  assert.equal(U.manudSamantekt(r.man['2026-11']).skodanir.kr, 0, 'nóvember á engar skoðunartekjur — aðeins skýrslan klárast þar');
  // skýrslan gerð í mánuðinum á eftir skoðuninni
  const s2 = sala({ created_at: '2026-10-30T10:00:00Z', upphaed_an_vsk: 7000, customer_base_id: 8, customer_id: 80 });
  const r2 = reikna({ solur: [s2], skyrslur: [skyrsla({ customer_base_id: 8, fyrirtaeki_id: 80, doc_date: '2026-11-02', notes: nafn(2026, 'október') })] });
  assert.equal(r2.man['2026-10'].kr.arsthjonusta, 7000);
});

test('skoðunarmánuður: staðlaði dálkurinn skodun_ar_man gengur fyrir skráarnafni; án hvors tveggja: dagsetning skýrslunnar', () => {
  const a = U.skodunarManudur(skyrsla({ skodun_ar_man: '2026-09', notes: nafn(2026, 'júní') }), 'uttekt');
  assert.deepEqual([a.man, a.heimild], ['2026-09', 'skodun_ar_man']);
  const b = U.skodunarManudur(skyrsla({ notes: 'Handvirkt viðhengt: skjal.pdf' }), 'uttekt');
  assert.deepEqual([b.man, b.heimild], ['2026-11', 'skjaladags']);
  // brunakerfi/slökkvikerfi: doc_date ER skoðunardagur (notes bera ekki mánuð)
  const c = U.skodunarManudur({ doc_type: 'brunakerfi', doc_date: '2026-07-28', notes: 'Skoðunarskýrsla 26-0002 - 2026 - brunakerfi-skoðunarskýrsla.pdf' }, 'brunakerfi');
  assert.equal(c.man, '2026-07');
  assert.equal(U.manudNumer('Nóvember'), 11); assert.equal(U.manudNumer('ágúst'), 8); assert.equal(U.manudNumer('jún'), 6); assert.equal(U.manudNumer('xx'), null);
});

test('ár út fyrir bil: 2027-08 á skýrslu frá 2026 verður 2026-08; áramót: desember á skýrslu í janúar er árið á undan; fjarlægur mánuður ekki giskaður', () => {
  const a = U.skodunarManudur(skyrsla({ doc_date: '2026-08-03', notes: nafn(2027, 'ágúst') }), 'uttekt');
  assert.equal(a.man, '2026-08'); assert.equal(a.leidrett, true);
  const b = U.skodunarManudur(skyrsla({ doc_date: '2027-01-04', notes: nafn(2027, 'desember') }), 'uttekt');
  assert.equal(b.man, '2026-12'); assert.equal(b.leidrett, true);
  // mánuður eftir skýrsludag sem ekkert ár rýmir (ág → „september“) — dagsetning skýrslunnar, merkt leiðrétt, ekki september fyrra árs
  const c = U.skodunarManudur(skyrsla({ doc_date: '2026-08-03', notes: nafn(2026, 'september') }), 'uttekt');
  assert.equal(c.man, '2026-08'); assert.equal(c.leidrett, true);
  // í gegnum söluna: leiðréttingin telst
  const r = reikna({ solur: [sala({ created_at: '2026-08-03T10:00:00Z', upphaed_an_vsk: 900 })], skyrslur: [skyrsla({ doc_date: '2026-08-03', notes: nafn(2027, 'ágúst') })] });
  assert.equal(r.man['2026-08'].kr.arsthjonusta, 900); assert.equal(r.man['2026-08'].mat.leidrett_fjoldi, 1);
});

test('engin skýrsla: mánuður sölunnar, merkt „án skýrslu“ (kr og fjöldi) — aldrei falið og aldrei 0', () => {
  const r = reikna({ solur: [sala({ upphaed_an_vsk: 42000 })] });
  assert.equal(r.man['2026-11'].kr.arsthjonusta, 42000);
  assert.equal(r.man['2026-11'].mat.an_skyrslu_kr, 42000); assert.equal(r.man['2026-11'].mat.an_skyrslu_fjoldi, 1);
  const s = U.manudSamantekt(r.man['2026-11']);
  assert.equal(s.skodanir.an_skyrslu_kr, 42000); assert.equal(s.skodanir.kr, 42000);
  // skýrsla annars kúnna eða utan gluggans (−45/+3 d) tengist ekki
  const r2 = reikna({ solur: [sala({ upphaed_an_vsk: 500 })], skyrslur: [
    skyrsla({ customer_base_id: 99, fyrirtaeki_id: 990, notes: nafn(2026, 'júní') }),
    skyrsla({ doc_date: '2026-09-01', notes: nafn(2026, 'ágúst') }),                       // 80 d á undan
    skyrsla({ doc_date: '2026-11-30', notes: nafn(2026, 'júní') }),                        // 10 d á eftir
    skyrsla({ is_duplicate: true, notes: nafn(2026, 'júní') }),                            // afrit
  ] });
  assert.equal(r2.man['2026-11'].mat.an_skyrslu_kr, 500);
  assert.equal(r2.man['2026-06'], undefined);
});

test('margar skýrslur: sami skoðunarmánuður á öllum → öruggt; ólíkir → nærtækasta og merkt „óviss“', () => {
  const s = sala({ upphaed_an_vsk: 800 });
  const sama = reikna({ solur: [s], skyrslur: [skyrsla({ notes: nafn(2026, 'júní') }), skyrsla({ doc_date: '2026-11-18', notes: nafn(2026, 'júní') })] });
  assert.equal(sama.man['2026-06'].kr.arsthjonusta, 800); assert.equal(sama.man['2026-06'].mat.oviss_kr, 0, 'öruggt');
  const ols = reikna({ solur: [s], skyrslur: [skyrsla({ doc_date: '2026-11-10', notes: nafn(2026, 'júní') }), skyrsla({ doc_date: '2026-11-19', notes: nafn(2026, 'júlí') })] });
  assert.equal(ols.man['2026-07'].kr.arsthjonusta, 800, 'nærtækasta skýrslan (19.11 á móti sölu 20.11)');
  assert.equal(ols.man['2026-07'].mat.oviss_kr, 800, 'óviss — merkt');
  // sama kúnna grein (customer_base_id) án fyrirtaeki_id á skýrslunni
  const cb = reikna({ solur: [s], skyrslur: [skyrsla({ fyrirtaeki_id: null, notes: nafn(2026, 'júní') })] });
  assert.equal(cb.man['2026-06'].kr.arsthjonusta, 800);
  // bæði auðkenni til → fyrirtaeki_id/customer_id ráða: útibú með eigin skýrslu fær ekki skýrslu systurútibús
  const utibu = reikna({ solur: [s], skyrslur: [skyrsla({ fyrirtaeki_id: 71, notes: nafn(2026, 'júní') })] });
  assert.equal(utibu.man['2026-11'].mat.an_skyrslu_kr, 800);
});

test('kredit og void: bakfært telst aldrei, kreditnóta fylgir upprunasölunni (mánuður og tæki), kredit á bakfærða sölu telst ekki', () => {
  const org = sala({ id: 1, upphaed_an_vsk: 1000, created_at: '2026-10-05T10:00:00Z', linur: [lin('Yfirferð · A', 4), lin('Hleðsla · B', 2), lin('Akstur', 1)] });
  const kr = sala({ id: 2, credit_of: 1, upphaed_an_vsk: -250, created_at: '2026-11-18T10:00:00Z', linur: [lin('Yfirferð · A', -1)] });
  const fyrirVoid = sala({ id: 3, status: 'void', upphaed_an_vsk: 9999 });
  const kredVoid = sala({ id: 4, credit_of: 3, upphaed_an_vsk: -9999 });
  const drog = sala({ id: 5, status: 'drog', upphaed_an_vsk: 777 });
  const r = reikna({ solur: [org, kr, fyrirVoid, kredVoid, drog], voidIds: [3], skyrslur: [skyrsla({ doc_date: '2026-10-06', notes: nafn(2026, 'október') })] }, NU);
  // skýrslan er −45/+3 d frá sölu 05.10 → 06.10 er innan; salan er eina með skýrslu (kredit fylgir)
  assert.equal(r.man['2026-10'].kr.arsthjonusta, 750, 'kredit −250 dregið frá í mánuði upprunasölunnar, ekki í nóvember');
  assert.equal(r.man['2026-11'], undefined);
  assert.deepEqual(r.man['2026-10'].taeki_skodanir, { yfirferd: 3, hledsla: 2, nytt: 0 }, 'neikvæð qty á kreditnótu lækkar tækin');
  assert.equal(heild(r), 750, 'void, kredit á void og drög teljast ekki');
  // upprunasalan finnst ekki (eldri en gagnasafnið) → kredit á eigin degi
  const r2 = reikna({ solur: [sala({ id: 9, credit_of: 8000, upphaed_an_vsk: -100 })] });
  assert.equal(r2.man['2026-11'].kr.arsthjonusta, -100, 'eigin dagur og flokkur eftir tegund sölu');
});

test('verkstæði: V-hlutinn (verd ÷ 1,24) telst á klart_at, salan telur afganginn á söludegi — ekkert tvítalið; tæki úr verkliðum', () => {
  const s = sala({ id: 10, vidskiptategund: 'bud', upphaed_an_vsk: 10000, created_at: '2026-10-29T10:00:00Z', linur: [lin('Hleðsla · Duft 2 kg', 1, 4000), lin('CO₂ 100 gr.', 26, 100), lin('Slökkvitæki nýtt', 1, 3400)] });
  // verd m. VSK 4960 = 4000 án VSK; 3224 = 2600 án VSK → V = 6600, afgangur 3400
  const vb = [
    { id: 71, num: s.num + '-V1', status: 'collected', verd: 4960, klart_at: '2026-11-03T08:00:00Z' },
    { id: 72, num: s.num + '-V2', status: 'ready', verd: 3224, klart_at: '2026-11-04T08:00:00Z' },
  ];
  const vl = [{ job_id: 71, service: 'Duft 2 kg. ABC hleðsla', status: 'done' }, { job_id: 72, service: 'CO₂ 100 gr. × 26 (samtals)', status: 'done' }, { job_id: 72, service: 'Önnur þjónusta', status: 'done' },
    // eydd, ónýt (kreditfærð) og aðeins móttekin tæki eru EKKI unnin tæki (rýni 22.11: annars ~15 % of há hleðsla)
    { job_id: 71, service: 'Duft 6 kg. ABC hleðsla', status: 'eytt' }, { job_id: 71, service: 'Duft 6 kg. ABC hleðsla', status: 'broken' },
    { job_id: 71, service: 'Duft 6 kg. ABC hleðsla', status: 'received' }, { job_id: 72, service: 'Duft 2 kg. ABC yfirferð', status: 'done', eytt_at: '2026-11-05T00:00:00Z' }];
  const r = reikna({ solur: [s], verkbeidnir: vb, verklidir: vl });
  assert.equal(Math.round(r.man['2026-11'].kr.verkstaedi), 6600, 'V-hlutinn á klart_at (nóvember)');
  assert.equal(Math.round(r.man['2026-10'].kr.verslun), 3400, 'afgangurinn á söludegi (október)');
  assert.equal(Math.round(heild(r)), 10000, 'samtals óbreytt — ekkert tvítalið');
  assert.deepEqual(r.man['2026-11'].taeki_verkstaedi, { yfirferd: 0, hledsla: 27, nytt: 0 }, '1 hleðsla + 26 CO₂-hylki; „Önnur þjónusta“ er ekki tæki');
  assert.equal(r.man['2026-11'].mat.aaetlad_verk_kr, 0, 'klart_at til → ekki áætlað');
});

test('verkstæði: klart_at tómt → söludagur, merkt „áætlað“; í vinnslu telst ekki enn; eytt telst ekki; afsláttur kvarðar V-hlutann', () => {
  const s = sala({ id: 20, vidskiptategund: 'bud', upphaed_an_vsk: 3000, created_at: '2026-11-10T10:00:00Z', linur: [lin('Hleðsla · X', 1, 4000)] });
  // lína 4000 → sala 3000 (25 % afsláttur) → V (3224/1,24 = 2600 án VSK) kvarðað í 1950
  const vb = (st, klart) => [{ id: 81, num: s.num + '-V1', status: st, verd: 4960, klart_at: klart }];
  const eldri = reikna({ solur: [s], verkbeidnir: vb('collected', null), verklidir: [{ job_id: 81, service: 'Duft 2 kg. ABC hleðsla' }] });
  assert.equal(Math.round(eldri.man['2026-11'].kr.verkstaedi), 3000, 'allt V (4000 án VSK × 0,75) á söludegi');
  assert.equal(Math.round(eldri.man['2026-11'].mat.aaetlad_verk_kr), 3000, 'merkt áætlað');
  assert.equal(eldri.man['2026-11'].mat.aaetlad_taeki, 1);
  const ivinnslu = reikna({ solur: [s], verkbeidnir: vb('inprogress', null) });
  assert.equal(Math.round(ivinnslu.annad.i_vinnslu_kr), 3000, 'í vinnslu — bíður');
  assert.equal(ivinnslu.man['2026-11'], undefined, 'ekki í neinum mánuði enn');
  const eytt = reikna({ solur: [s], verkbeidnir: vb('eytt', null) });
  assert.equal(eytt.man['2026-11'].kr.verslun, 3000, 'eytt verkbeiðni færir ekkert — salan stendur öll á söludegi');
  assert.equal(eytt.annad.i_vinnslu_kr, 0);
});

test('verkstæði: V-hluti sem stemmir ekki við söluna → salan öll á söludegi, talin „óstemmd“ (ekki giskað)', () => {
  const s = sala({ id: 30, vidskiptategund: 'bud', upphaed_an_vsk: 2000, created_at: '2026-10-20T10:00:00Z', linur: [lin('Hleðsla · X', 1, 2000)] });
  const r = reikna({ solur: [s], verkbeidnir: [{ id: 91, num: s.num + '-V1', status: 'collected', verd: 6200, klart_at: '2026-11-05T08:00:00Z' }] });   // V = 5000 án VSK > 2000
  assert.equal(r.man['2026-10'].kr.verslun, 2000); assert.equal(r.man['2026-11'], undefined);
  assert.equal(r.annad.ostemmt_fjoldi, 1); assert.equal(r.annad.ostemmt_kr, 2000);
  // sala upp á 0 kr með V-hluta hefur ekkert til að stemma — ekki talin „óstemmd“ (rýni 22.11)
  const n = sala({ id: 31, vidskiptategund: 'bud', upphaed_an_vsk: 0, created_at: '2026-10-21T10:00:00Z' });
  const r0 = reikna({ solur: [n], verkbeidnir: [{ id: 92, num: n.num + '-V1', status: 'collected', verd: 1240, klart_at: null }] });
  assert.equal(r0.annad.ostemmt_fjoldi, 0); assert.equal(heild(r0), 0);
});

test('brunakerfi: skýrslan finnst á fyrirtaeki_id (customer_base_id tómt) og fer á skoðunarmánuð; engin skýrsla → merkt „án skýrslu“; slökkvikerfi sama regla', () => {
  const bk = (o) => sala({ vidskiptategund: 'brunakerfi', created_at: '2026-10-05T10:00:00Z', upphaed_an_vsk: 200000, customer_base_id: 146, customer_id: 195, ...o });
  const mk = (o) => ({ id: ++nid, doc_type: 'brunakerfi', doc_date: '2026-07-29', customer_base_id: null, fyrirtaeki_id: 195, is_duplicate: false, notes: 'Skoðunarskýrsla 26-0003 - 2026 - brunakerfi-skoðunarskýrsla.pdf', ...o });
  const a = reikna({ solur: [bk()], skyrslur: [mk()] });
  assert.equal(a.man['2026-07'].kr.brunakerfi, 200000, '68 d á undan sölu — innan 150 d gluggans');
  assert.equal(a.man['2026-10'], undefined);
  // systurútibú (annað customer_id) fær ekki skýrsluna þótt customer_base_id sé sameiginlegt
  const b = reikna({ solur: [bk({ customer_id: 199 })], skyrslur: [mk({ customer_base_id: 146 })] });
  assert.equal(b.man['2026-10'].mat.an_skyrslu_kr, 200000);
  assert.equal(b.man['2026-10'].kr.brunakerfi, 200000);
  // slökkvikerfi: eigin skýrslutegund
  const sk = sala({ vidskiptategund: 'slokkvikerfi', created_at: '2026-10-05T10:00:00Z', upphaed_an_vsk: 29000, customer_id: 494, customer_base_id: 421 });
  const c = reikna({ solur: [sk], skyrslur: [{ id: 1, doc_type: 'slokkvikerfi', doc_date: '2026-09-22', fyrirtaeki_id: 494, customer_base_id: null, is_duplicate: false }, mk({ fyrirtaeki_id: 494 })] });
  assert.equal(c.man['2026-09'].kr.slokkvikerfi, 29000, 'brunakerfisskýrsla á sama kúnna verður ekki notuð fyrir slökkvikerfi');
});

test('skoðun fyrir yfirtöku (fyrir 05.2026) fer í „utan mælingar“ — aldrei hent, aldrei í mánuðaröðinni', () => {
  const r = reikna({ solur: [sala({ created_at: '2026-06-05T10:00:00Z', upphaed_an_vsk: 5000 })], skyrslur: [skyrsla({ doc_date: '2026-06-05', notes: nafn(2026, 'apríl') })] });
  assert.equal(r.annad.fyrir_yfirtoku_kr, 5000);
  assert.equal(Object.keys(r.man).filter((m) => m < '2026-05').length, 0, 'enginn mánuður fyrir yfirtöku í röðinni');
  assert.equal(Object.values(r.man).reduce((a, x) => a + Object.values(x.kr).reduce((b, v) => b + v, 0), 0), 0, 'engar tekjur í mánuðaröðinni — aðeins í „utan mælingar“');
});

test('samtals: mánaðatölur + í vinnslu + utan mælingar = samtölur gömlu reglunnar (sala færð til, aldrei bætt við); aðeins samtölur í svarinu', () => {
  const solur = [
    sala({ id: 1, upphaed_an_vsk: 1000, created_at: '2026-08-02T10:00:00Z' }),
    sala({ id: 2, vidskiptategund: 'bud', upphaed_an_vsk: 5000, created_at: '2026-10-29T10:00:00Z', linur: [lin('Hleðsla · X', 1, 5000)] }),
    sala({ id: 3, upphaed_an_vsk: 3000, created_at: '2026-11-20T10:00:00Z', customer_id: 71, customer_base_id: 7 }),
    sala({ id: 4, credit_of: 1, upphaed_an_vsk: -400, created_at: '2026-11-21T10:00:00Z' }),
    sala({ id: 5, vidskiptategund: 'ovisst', upphaed_an_vsk: 100, created_at: '2026-11-21T10:00:00Z' }),
  ];
  const r = reikna({ solur, skyrslur: [skyrsla({ customer_id: 71, fyrirtaeki_id: 71, notes: nafn(2026, 'september') })],
    verkbeidnir: [{ id: 1, num: solur[1].num + '-V1', status: 'collected', verd: 6200, klart_at: '2026-11-02T08:00:00Z' }] });
  const gamalt = T.slokkvitaekiManudir(solur, []);
  assert.equal(Math.round(heild(r)), Object.values(gamalt).reduce((a, b) => a + b, 0));
  const t = U.unnidTolur(r, NU);
  assert.equal(t.manudur, '2026-11'); assert.equal(t.fyrri_man, '2026-10');
  assert.equal(t.manudur_til_dags.verkstaedi.kr, 5000); assert.equal(t.fyrri_manudur.verslun.kr, 0);
  assert.equal(t.ar_til_dags_kr, 3000 + 5000 + 1000 - 400 + 100, 'ár til dags frá yfirtöku = sama heild');
  assert.doesNotMatch(JSON.stringify(t), /customer|nafn|kt/i, 'aðeins samtölur — og engin orð með „kt“ í svarinu');
  assert.equal(U.unnidTolur(reikna({}, '2026-05-10T00:00:00Z'), '2026-05-10T00:00:00Z').fyrri_manudur, null, 'apríl er ómældur — null');
});

test('kredit án frumsölu er TALIÐ (Agnar 22.11.2026: nóta fylgir frumsölu): finnst ekki → eigin dagur og kredit_an_frumsolu; úr g.frumsolur → mánuður frumsölunnar; is_credit án credit_of talið', () => {
  const a = reikna({ solur: [sala({ id: 61, credit_of: 7777, upphaed_an_vsk: -100, created_at: '2026-11-05T10:00:00Z' }), sala({ id: 62, is_credit: true, upphaed_an_vsk: -50, created_at: '2026-11-06T10:00:00Z' })] });
  assert.equal(a.annad.kredit_an_frumsolu, 2); assert.equal(a.man['2026-11'].kr.arsthjonusta, -150);
  const b = reikna({ solur: [sala({ id: 63, credit_of: 8888, upphaed_an_vsk: -100, created_at: '2026-11-05T10:00:00Z' })], frumsolur: [{ id: 8888, created_at: '2026-08-14T10:00:00Z' }] });
  assert.equal(b.annad.kredit_an_frumsolu, 0); assert.equal(b.man['2026-08'].kr.arsthjonusta, -100, 'á mánuð frumsölunnar'); assert.equal(b.man['2026-11'], undefined);
  assert.equal(U.unnidTolur(a, NU).kredit_an_frumsolu, 2);
});
