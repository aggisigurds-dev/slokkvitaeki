// Lokaathugun reiknings (17.11.2026). Keyrsla: node --test test/reikningur-lokaathugun.test.cjs
//
// AF HVERJU: 16.11 var reikningur kreditfærður og endurgerður á nýja kennitölu. Salan varð rétt, en úttektarskýrslan og
// reiknings-PDF-ið sem fylgdu voru áfram þau gömlu. tools/reikningur-lokaathugun.cjs ber söluna, reiknings-PDF-ið og
// skýrsluna saman; verkferlið í .claude/agents/sala-reikningar.md segir ekkert búið fyrr en það skilar 0.
//
// Gervigögn (gervi-kennitölur sem standast vartölu, ekkert raunfélag). Síðasta prófið les lifandi gögn um R-001307
// (aðeins lestur) og sleppur ef netið næst ekki; það prentar aldrei kt eða nöfn.
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const fs = require('node:fs');

const ROT = path.join(__dirname, '..');
const T = require(path.join(ROT, 'tools', 'reikningur-lokaathugun.cjs'));
const RS_SLOD = [path.join(ROT, 'netlify', 'functions', '_reikningur-solu.cjs'), path.join(ROT, 'js', 'patches', '517-reikningur-solu.js')].find((f) => fs.existsSync(f));
const RS = RS_SLOD ? require(RS_SLOD) : null;
const anRS = RS ? false : 'reglan 517 (_reikningur-solu.cjs) er ekki á þessari grein — PDF-prófin bíða hennar';

const KT = '691299-0079', KT_GAMLA = '681299-0099';
const ar = String(new Date().getFullYear());

function reikningsTexti(o) {
  o = o || {};
  return ['Brunahólf Slökkvitæki ehf. VSK nr. 98107', 'Kt. 600508-0400', 'Helluhrauni 10', '220 Hafnarfirði',
    o.nafn || 'Gervifélag ehf.', 'Gervigata 1', '101 Reykjavík', 'kt. ' + (o.kt || KT), 'Reikningur ' + (o.rnum || 'R-900001'),
    'Dagsetning: 10/11/' + ar, 'VÖRUNR. LÝSING FJÖLDI EININGAV. M.VSK UPPHÆÐ VSK',
    'Yfirferð · Léttvatnstæki 6L. yfirferð 2 3.720 kr 6.000 kr 2', 'Skýrslugerð 1 5.704 kr 4.600 kr 2', 'Akstur 1 4.464 kr 3.600 kr 2',
    'Samtals fyrir Vsk.: 14.200 kr', 'Til greiðslu : ' + (o.til || '17.608') + ' kr'].join('\n');
}
function skyrsluTexti(o) {
  o = o || {};
  return ['Helluhrauni 10, 220 Hafnarfjörður', 'Sími: 565 4080, kt. 600508-0400',
    'Skýrsla vegna úttektar á brunaslöngum, slökkvitækjum og öðrum búnaði (ef við á) hjá fyrirtækinu',
    (o.nafn || 'Gervifélag ehf.') + ', Gervigata 1, 101 Reykjavík kt: ' + (o.kt || KT),
    'Slökkvitæki léttvatn 6-9 ltr. Fjöldi: ' + (o.taeki == null ? 2 : o.taeki) + ' Í lagi: Já', 'Slökkvitæki duft 2 kg. Fjöldi: x Í lagi: x',
    'Annað:', o.annad == null ? 'Öll slökkvitæki yfirfarin og vottuð í lagi.' : o.annad, 'Athugasemdir:', o.ath == null ? 'Engar athugasemdir' : o.ath,
    'Fyrir hönd Slökkvitæki ehf', o.undir || 'Gervi Skoðunarmaður'].join('\n');
}

// Hreint gervimál: allt stemmir. Hvert próf breytir einu atriði.
function gogn(breyt) {
  const sale = { id: 1, num: 'R-900001', status: 'final', is_credit: false, source: 'uttekt', customer_id: 9, customer_base_id: 5,
    customer_kt: KT, customer_nafn: 'Gervifélag ehf.', greitt_med: 'reikningur', afslattur: '0', created_at: ar + '-11-10T10:00:00Z',
    linur: [{ qty: 2, desc: 'Yfirferð · Léttvatnstæki 6L. yfirferð', vsk_pct: 24, unit_price_ex_vat: 3000 },
      { qty: 1, desc: 'Skýrslugerð', vsk_pct: 24, unit_price_ex_vat: 4600 }, { qty: 1, desc: 'Akstur', vsk_pct: 24, unit_price_ex_vat: 3600 }],
    upphaed_an_vsk: '14200', vsk_upphaed: '3408', samtals: '17608', dk_invoice_id: null, krafa_sent_at: null, invoiced_at: null };
  const g = {
    sale, base: { id: 5, kennitala: KT, nafn: 'Gervifélag ehf.' }, site: { id: 9, nafn: 'Gervifélag ehf.', kennitala: KT },
    svd: { skyrslugerd: 4600 }, vorurByNafn: new Map([['léttvatnstæki 6l. yfirferð', { id: 1, verd_an_vsk: '3000.4' }]]),
    kredit: {}, rs: RS, live517: false, par: null, facts: null, kunni: [], vidbot: false, send: false,
    vidhengi: [
      { id: 'r1', kind: 'reikningur', name: 'Gervifélag ehf. - ' + KT + ' - ' + ar + ' - R-900001 - #9.pdf', path: 'company_attachments/9/2_r.pdf', year: ar, uploaded_at: ar + '-11-10T10:01:00Z' },
      { id: 's1', kind: 'skyrsla', name: 'Gervifélag ehf. - Gervigata 1 - ' + KT + ' - ' + ar + ' - nóvember - úttektarskýrsla - #9.pdf', path: 'company_attachments/9/3_s.pdf',
        year: ar, uploaded_at: ar + '-11-10T10:02:00Z', texti: { annad: 'Öll slökkvitæki yfirfarin og vottuð í lagi.', athugasemdir: 'Engar athugasemdir' } }],
    skjolReikn: [{ id: 11, doc_type: 'reikningur', invoice_number: 'R-900001', amount: 17608, storage_path: 'samningar/company_attachments/9/2_r.pdf' }],
    skjalSkyrsla: null, forsk: { id: 1, litur: 'graent', rautt: [], gult: [] },
    pdfTexti: reikningsTexti(), skTexti: skyrsluTexti(),
  };
  return breyt ? breyt(g) || g : g;
}
const rod = (res, hlid) => res.rodur.find((r) => r.hlid === hlid);
const hefur = (arr, re) => arr.some((x) => re.test(x));

test('hreint mál: sala, reiknings-PDF og skýrsla stemma → stemmir (tafla með þremur röðum)', { skip: anRS }, () => {
  const r = T.daema(gogn());
  assert.deepStrictEqual(r.villur, [], r.villur.join(' | '));
  assert.strictEqual(r.stemmir, true);
  assert.deepStrictEqual(r.rodur.map((x) => [x.hlid, x.stemmir]), [['Sala', true], ['Reiknings-PDF', true], ['Úttektarskýrsla', true]]);
  assert.match(T.prenta(r), /NIÐURSTAÐA: STEMMIR/);
});

test('reglan 517 vantar → ÓDÆMT, aldrei „stemmir"', () => {
  const r = T.daema(gogn((g) => { g.rs = null; }));
  assert.strictEqual(r.stemmir, false);
  assert.ok(hefur(r.odaemt, /517/), r.odaemt.join(' | '));
  assert.match(T.prenta(r), /verkið er EKKI búið/);
});

test('R-001307-mynstrið: parið á spjaldinu bendir á kreditfærðan reikning → reiknings-PDF STEMMIR EKKI meðan 517 er ekki í loftinu', { skip: anRS }, () => {
  const g = gogn((g) => { g.kredit = { 'R-900000': 'R-900002' }; g.par = { id: 77, invoice_number: 'R-900000' };
    g.vidhengi.push({ id: 'r0', kind: 'reikningur', name: 'Gamla ehf. - ' + KT_GAMLA + ' - ' + ar + ' - R-900000 - #9.pdf', path: 'company_attachments/9/1_r.pdf', year: ar }); });
  const r = T.daema(g);
  assert.strictEqual(rod(r, 'Reiknings-PDF').stemmir, false);
  assert.ok(hefur(r.villur, /^Reiknings-PDF: á fyrirtækjaspjaldinu opnast R-900000/), r.villur.join(' | '));
  assert.ok(hefur(r.villur, /^Eldri skjöl: PDF R-900000/), 'kreditfærða PDF-ið ómerkt á að vera villa');
  // Þegar 517 er í loftinu leiðir appið kreditstöðuna af solur: parið verður ⚠ og gamla PDF-ið telst merkt.
  const r2 = T.daema(Object.assign(g, { live517: true }));
  assert.strictEqual(rod(r2, 'Reiknings-PDF').stemmir, true, r2.villur.join(' | '));
  assert.ok(hefur(r2.vidvaranir, /parið ársins/));
  assert.strictEqual(r2.stemmir, true);
});

test('innihald PDF-sins: önnur kt, annað R-númer eða gömul upphæð → villa (skráarnafnið eitt dugar ekki)', { skip: anRS }, () => {
  const kt = T.daema(gogn((g) => { g.pdfTexti = reikningsTexti({ kt: KT_GAMLA }); }));
  assert.ok(hefur(kt.villur, /^Reiknings-PDF: kennitala í PDF-inu 681299-0099/), kt.villur.join(' | '));
  const nr = T.daema(gogn((g) => { g.pdfTexti = reikningsTexti({ rnum: 'R-900009' }); }));
  assert.ok(hefur(nr.villur, /segir „Reikningur R-900009"/));
  // Mælt 17.11.2026: sala breytt 7 mín eftir að PDF-ið var vistað — PDF-ið bar gömlu upphæðina.
  const up = T.daema(gogn((g) => { g.pdfTexti = reikningsTexti({ til: '21.848' }); }));
  assert.ok(hefur(up.villur, /„Til greiðslu" í PDF-inu 21\.848 kr ≠ sölunnar 17\.608 kr/), up.villur.join(' | '));
  const olesid = T.daema(gogn((g) => { g.pdfTexti = null; g.pdfLesturVilla = 'pdftotext vantar'; }));
  assert.ok(hefur(olesid.vidvaranir, /innihald PDF-sins ólesið/));
  assert.strictEqual(olesid.stemmir, true, 'ólesið innihald er ⚠, ekki villa — skráarnafn og skjalaröð stemma');
});

test('salan: afsláttur á tvo vegu, verð utan verðlista, röng samtala og ógild kt → villa', () => {
  const tveir = T.daema(gogn((g) => { g.sale.linur[0].discount_pct = 10; g.sale.afslattur = '500'; }));
  assert.ok(hefur(tveir.villur, /afsláttur á TVO vegu/));
  const verd = T.daema(gogn((g) => { g.sale.linur[1].unit_price_ex_vat = 5600; g.sale.upphaed_an_vsk = '15200'; g.sale.vsk_upphaed = '3648'; g.sale.samtals = '18848'; g.pdfTexti = reikningsTexti({ til: '18.848' }); g.skjolReikn[0].amount = 18848; }));
  assert.ok(hefur(verd.villur, /„Skýrslugerð" 5\.600 kr en verðskrá \(Skýrslugerð\) 4\.600 kr/), verd.villur.join(' | '));
  const samt = T.daema(gogn((g) => { g.sale.samtals = '17700'; }));
  assert.ok(hefur(samt.villur, /^Sala: samtala 17\.700 kr ≠ línurnar 17\.608 kr/));
  const kt = T.daema(gogn((g) => { g.sale.customer_kt = '691299-0089'; }));
  assert.ok(hefur(kt.villur, /stenst ekki vartölu/));
});

test('greiðandi: kt sölu ≠ kt greiðanda í skránni → villa; nafn staðarins á kt annars félags → aðeins ⚠', () => {
  const ann = T.daema(gogn((g) => { g.base = { id: 5, kennitala: KT_GAMLA, nafn: 'Gervifélag ehf.' }; }));
  assert.ok(hefur(ann.villur, /^Greiðandi: kt sölunnar .* ≠ kt greiðandans/));
  const rekstr = T.daema(gogn((g) => { g.base = { id: 5, kennitala: KT, nafn: 'Móðurfélag hf.' }; }));
  assert.ok(!hefur(rekstr.villur, /^Greiðandi/), rekstr.villur.join(' | '));
  assert.ok(hefur(rekstr.vidvaranir, /salan ber nafn staðarins/));
});

test('skýrslan: gömul kt og nafn, of fá tæki, texti sem tapaðist → villa; ný undirritun → ⚠', () => {
  const gomul = T.daema(gogn((g) => { g.vidhengi[1].name = 'Gamla ehf. - Gervigata 1 - ' + KT_GAMLA + ' - ' + ar + ' - október - úttektarskýrsla - #9.pdf';
    g.skTexti = skyrsluTexti({ kt: KT_GAMLA, nafn: 'Gamla ehf.' }); }));
  assert.strictEqual(rod(gomul, 'Úttektarskýrsla').stemmir, false);
  assert.ok(hefur(gomul.villur, /^Úttektarskýrsla: Skýrslan er á kennitölu/), gomul.villur.join(' | '));
  const taeki = T.daema(gogn((g) => { g.skTexti = skyrsluTexti({ taeki: 1 }); }));
  assert.ok(hefur(taeki.villur, /skýrslan telur 1 tæki en salan 2/));
  const tapad = T.daema(gogn((g) => { g.eldriSk = { id: 's0' }; g.eldriSkTexti = skyrsluTexti({ annad: 'Eitt tæki dæmt ónýtt og fjarlægt.', undir: 'Annar Maður' }); }));
  assert.ok(hefur(tapad.villur, /handskrifaður texti úr eldri skýrslunni tapaðist: „Eitt tæki dæmt ónýtt/), tapad.villur.join(' | '));
  assert.ok(hefur(tapad.vidvaranir, /undirritun\/skoðunaraðili breyttist/));
  const vidhengiTexti = T.daema(gogn((g) => { g.vidhengi[1].texti.athugasemdir = 'Slanga lekur við tengi.'; }));
  assert.ok(hefur(vidhengiTexti.villur, /textinn „Slanga lekur við tengi\." er á viðhenginu en ekki í PDF-inu/));
  const engin = T.daema(gogn((g) => { g.vidhengi = g.vidhengi.filter((a) => a.kind !== 'skyrsla'); g.skTexti = null; }));
  assert.ok(hefur(engin.villur, /engin úttektarskýrsla finnst/));
});

test('eldri skýrsla ársins sem ekki er leyst af hólmi og er um annað auðkenni → villa', () => {
  const r = T.daema(gogn((g) => { g.vidhengi.push({ id: 's0', kind: 'skyrsla', name: 'Gamla ehf. - Gervigata 1 - ' + KT_GAMLA + ' - ' + ar + ' - október - úttektarskýrsla - #9.pdf',
    path: 'company_attachments/9/0_s.pdf', year: ar, uploaded_at: ar + '-10-01T10:00:00Z' }); }));
  assert.ok(hefur(r.villur, /^Eldri skjöl: önnur skýrsla ársins .* er ekki merkt leyst af hólmi og er um annað auðkenni/), r.villur.join(' | '));
  const leyst = T.daema(gogn((g) => { g.vidhengi.push({ id: 's0', kind: 'skyrsla', leyst_af: 'x', name: 'Gamla ehf. - ' + KT_GAMLA + ' - ' + ar + ' - úttektarskýrsla - #9.pdf', path: 'x', year: ar }); }));
  assert.deepStrictEqual(leyst.villur, [], leyst.villur.join(' | '));
});

test('sendiglugginn: rauð forskoðun, þegar send, ekki í Kröfuyfirliti → villa; gult → ⚠', () => {
  const rautt = T.daema(gogn((g) => { g.forsk = { rautt: ['Ógild kennitala'], gult: ['Ekkert netfang'] }; }));
  assert.ok(hefur(rautt.villur, /^Sendigluggi: ⛔ Ógild kennitala/));
  assert.ok(hefur(rautt.vidvaranir, /^Sendigluggi: ⚠ Ekkert netfang/));
  const send = T.daema(gogn((g) => { g.sale.dk_invoice_id = 'x'; g.forsk = null; }));
  assert.ok(hefur(send.villur, /krafan er þegar SEND/));
  assert.deepStrictEqual(T.daema(gogn((g) => { g.sale.dk_invoice_id = 'x'; g.forsk = null; g.send = true; })).villur, [], '--send: athugun eftir sendingu');
  const ekki = T.daema(gogn((g) => { g.sale.greitt_med = 'kort'; }));
  assert.ok(hefur(ekki.villur, /sést ekki í Kröfuyfirliti/));
  const kred = T.daema(gogn((g) => { g.kredit = { 'R-900001': 'R-900005' }; }));
  assert.ok(hefur(kred.villur, /^Sala: R-900001 er kreditfærður/));
});

test('lesarar PDF-texta: kt seljandans er aldrei tekin sem kt kúnna', () => {
  const p = T.lesaReikningsTexta(reikningsTexti());
  assert.deepStrictEqual([p.rnum, p.kts, p.til_greidslu], ['R-900001', ['6912990079'], 17608]);
  const s = T.lesaSkyrsluTexta(skyrsluTexti({ taeki: 3 }));
  assert.deepStrictEqual([s.kts, s.taeki], [['6912990079'], 3]);
  assert.match(s.hand, /Öll slökkvitæki yfirfarin/);
  assert.strictEqual(T.ktGild('691299-0079'), true);
  assert.strictEqual(T.ktGild('691299-0089'), false);
});

// Lifandi gögn (aðeins lestur): R-001307 eins og hún stendur. Parið ársins á staðnum bendir á kreditfærða reikninginn
// (mælt 17.11.2026), svo reiknings-PDF-röðin á að FALLA þar til 517 er í loftinu eða parið lagað. Prentar engar kt/nöfn.
test('LIFANDI: R-001307 — reiknings-PDF fellur meðan parið bendir á kreditfærðan reikning og 517 er ekki í loftinu', { skip: anRS || (process.env.LOKAATHUGUN_AN_NETS ? 'LOKAATHUGUN_AN_NETS' : false) }, async (t) => {
  let g;
  try { g = await T.saekja('R-001307', { send: false }); } catch (e) { t.skip('netið náðist ekki: ' + String(e.message).slice(0, 60)); return; }
  g.send = !!(g.sale.dk_invoice_id || g.sale.krafa_sent_at || g.sale.invoiced_at);
  const r = T.daema(g);
  const parKredit = !!(g.par && g.par.invoice_number && g.par.invoice_number !== 'R-001307' && g.kredit[g.par.invoice_number]);
  const aEftirFalla = parKredit && g.live517 !== true;
  assert.strictEqual(rod(r, 'Reiknings-PDF').stemmir, !aEftirFalla,
    'Reiknings-PDF-röðin: ' + (aEftirFalla ? 'átti að falla (parið bendir á ' + g.par.invoice_number + ', 517 í loftinu: ' + g.live517 + ')' : 'átti að standast') +
    ' · villur: ' + r.villur.map((v) => v.replace(/\d{6}-?\d{4}/g, 'KT').split(':')[0]).join(', '));
  if (aEftirFalla) assert.strictEqual(r.stemmir, false, 'heildin má ekki segja „stemmir" meðan PDF-röðin fellur');
});
