// Próf á tekjuliðum Slökkvitækis (fasi 3, 22.11.2026). Keyrsla: timeout 90 node --test test/tekjulidir.test.cjs
//
// AF HVERJU: Agnar vill sjá úr hverju tekjurnar eru gerðar. Það sem má aldrei bila:
//   1. EITT flokkunarfall, nákvæmlega flokkunin sem var mæld og samþykkt 22.11 (fyrsta samsvörun ræður; 05 Brunakerfi tekur alla söluna);
//   2. heildin = Σ solur final (afsláttur dreifist hlutfallslega á línur; „í vinnslu“ og „fyrir yfirtöku“ eru eigin dálkar, aldrei hent);
//   3. mánuðir fylgja „Unnið“ (skoðunarmánuður, klart_at, kredit á dag frumsölu) — sala færist milli mánaða, heildin ekki;
//   4. engin kúnnanöfn: stakar línur (texti sem kemur einu sinni fyrir og er ekki í vörulista) eru ekki sýndar hver fyrir sig.
// Gögnin eru tilbúin (engin raunveruleg nöfn, kennitölur eða upphæðir — repóið er opið).
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const TL = require('../netlify/functions/_tekjulidir.cjs');

const NU = '2026-11-22T10:00:00Z';
const VORUR = [
  { id: 1, nafn: 'Léttvatn 6 kg. AB Slökkvitæki', flokkur: 'Slökkvitæki', virkt: true },
  { id: 2, nafn: 'Duft 6 kg. ABC yfirferð', flokkur: 'Þjónusta', virkt: true },
  { id: 3, nafn: 'Duft 6 kg. ABC hleðsla', flokkur: 'Þjónusta', virkt: true },
  { id: 4, nafn: 'Skilti flöt', flokkur: 'Skilti, ljós og miðar', virkt: true },
  { id: 5, nafn: 'Slökkvitækjafesting', flokkur: 'Slökkvitækjafestingar', virkt: true },
  { id: 6, nafn: 'Vinna pr. Klst.', flokkur: 'Vinna og akstur', virkt: true },
  { id: 7, nafn: 'Dagleiga', flokkur: 'Leiga', virkt: true },
  { id: 8, nafn: 'Rafhlaða 9V', flokkur: 'Skynjarar og rafhlöður', virkt: true },
  { id: 9, nafn: 'CO₂ 5 kg. áfylling', flokkur: 'Þjónusta', virkt: true },
];
const kort = TL.vorurKort(VORUR);
const fl = (desc, vt, pid) => TL.flokkaLinu({ desc, product_id: pid }, vt || 'bud', pid != null ? TL.solulinaVara({ desc, product_id: pid }, kort) : TL.solulinaVara({ desc }, kort));

test('flokkun: allar 15 reglurnar, fyrsta samsvörun ræður — og leiðréttu mynstrin (reykskynjari…, skilti…, skoðunarmiðar, co2 kútur/tæki)', () => {
  assert.equal(fl('Yfirferð · Léttvatnstæki 6L. yfirferð'), '01');
  assert.equal(fl('Hleðsla · Duft 6 kg. ABC hleðsla'), '02');
  assert.equal(fl('Duft 6 kg. ABC yfirferð', 'bud', 2), '01', 'Þjónusta-vara með yfirferð');
  assert.equal(fl('Duft 6 kg. ABC hleðsla', 'bud', 3), '02', 'Þjónusta-vara með hleðsla');
  assert.equal(fl('Léttvatn 6 kg. AB Slökkvitæki', 'bud', 1), '03');
  assert.equal(fl('Nýtt · Duft 6 kg. ABC Slökkvitæki'), '04'); assert.equal(fl('Slökkvitæki lítið'), '04');
  assert.equal(fl('Skoðun á aðalstöð', 'brunakerfi'), '05'); assert.equal(fl('Akstur', 'brunakerfi'), '05', 'vt brunakerfi tekur ALLA söluna (líka akstur)');
  assert.equal(fl('Skýrslugerð'), '06'); assert.equal(fl('CO₂ 100 gr. × 26'), '07'); assert.equal(fl('CO2 kútur fullur'), '07'); assert.equal(fl('co2 tæki'), '07');
  assert.equal(fl('Akstur sækja nýtt'), '08'); assert.equal(fl('Vinna pr. Klst.', 'bud', 6), '09'); assert.equal(fl('Uppsetning'), '09'); assert.equal(fl('Útkall/þjónusta'), '09');
  assert.equal(fl('Reykskynjari · Reykskynjari 2'), '10'); assert.equal(fl('Rafhlaða 9V', 'bud', 8), '10');
  assert.equal(fl('Skilti flöt rauð sjálflýsandi'), '11'); assert.equal(fl('Skilti -V- rauð'), '11'); assert.equal(fl('Skoðunarmiðar'), '11'); assert.equal(fl('Skilti flöt', 'bud', 4), '11');
  assert.equal(fl('Dagleiga', 'bud', 7), '12'); assert.equal(fl('Slökkvitækjafesting', 'bud', 5), '13');
  assert.equal(fl('Skoðun slökkvikerfis', 'slokkvikerfi'), '14'); assert.equal(fl('Kapall'), '15'); assert.equal(fl('optiskur reykskynjari xp95'), '15', 'byrjar ekki á reykskynjari → 15 (eins og mælt var)');
  assert.equal(fl('Krani fyrir CO₂ flöskur'), '15', 'krani … er ekki CO₂ hylki');
  // röðin: yfirferð á undan skýrslu og akstri; „skýrslu“ á undan akstri
  assert.equal(fl('Yfirferð · skýrslu'), '01'); assert.equal(fl('Akstur vegna skýrslu'), '06');
  assert.equal(TL.FLOKKAR.length, 15); assert.equal(TL.HOPAR.length, 6);
  assert.deepEqual(TL.FLOKKAR.filter((f) => f.hopur === 'thjonusta').map((f) => f.id).sort(), ['01', '02', '06', '08']);
  assert.deepEqual(TL.FLOKKAR.filter((f) => f.hopur === 'vorur').map((f) => f.id).sort(), ['10', '11', '13', '15']);
});

let nid = 0;
const sala = (o) => ({ id: ++nid, num: 'R-' + String(nid).padStart(6, '0'), status: 'final', vidskiptategund: 'bud', credit_of: null, upphaed_an_vsk: 1000, created_at: '2026-11-10T10:00:00Z', customer_base_id: null, customer_id: null, linur: [], ...o });
const lin = (desc, qty, p, pid) => ({ desc, qty, unit_price_ex_vat: p, product_id: pid });
const g = (o) => ({ solur: [], voidIds: [], frumsolur: [], skyrslur: [], verkbeidnir: [], verklidir: [], vorur: VORUR, ...o });
const flo = (r, id) => r.flokkar.find((f) => f.id === id);

test('afsláttur dreifist hlutfallslega á línur; flokkarnir leggja upp í nákvæmlega upphæð sölunnar; stk í tækjaflokkum', () => {
  // lína 1000 + lína 1000 = 2000 án afsláttar; salan 1500 (25 % afsláttur)
  const s = sala({ upphaed_an_vsk: 1500, linur: [lin('Yfirferð · Léttvatnstæki 6L. yfirferð', 4, 250), lin('Akstur', 1, 1000)] });
  const r = TL.tekjulidir(g({ solur: [s] }), NU);
  assert.equal(flo(r, '01').samtals, 750); assert.equal(flo(r, '08').samtals, 750); assert.equal(flo(r, '01').stk, 4);
  assert.equal(r.samtals, 1500); assert.equal(r.heild_solur, 1500); assert.equal(r.stemmir, true);
  assert.equal(r.samtals_man['2026-11'], 1500);
  // sala án lína: öll upphæðin í flokk eftir sölutegund (brunakerfi → 05, annað → 15) — aldrei týnd
  const r2 = TL.tekjulidir(g({ solur: [sala({ upphaed_an_vsk: 400, vidskiptategund: 'brunakerfi' }), sala({ upphaed_an_vsk: 70 })] }), NU);
  assert.equal(flo(r2, '05').samtals, 400); assert.equal(flo(r2, '15').samtals, 70); assert.equal(r2.stemmir, true);
});

test('mánuðir fylgja „Unnið“: úttekt með síðbúinni skýrslu fer á skoðunarmánuð (allir flokkar hennar), kredit á dag frumsölu, í vinnslu og fyrir yfirtöku eigin dálkar — heildin óbreytt', () => {
  const ut = sala({ id: 900, vidskiptategund: 'uttekt', created_at: '2026-11-20T10:00:00Z', customer_base_id: 7, customer_id: 70, upphaed_an_vsk: 3000, linur: [lin('Yfirferð · A', 10, 200), lin('Hleðsla · B', 2, 400), lin('Skýrslugerð', 1, 200)] });
  const skyrsla = { id: 1, doc_type: 'uttektarskyrsla', doc_date: '2026-11-20', customer_base_id: 7, fyrirtaeki_id: 70, is_duplicate: false, notes: 'X - 000 - 2026 - júní - úttektarskýrsla - #1.pdf' };
  const kredit = sala({ id: 901, vidskiptategund: 'uttekt', credit_of: 900, created_at: '2026-11-21T10:00:00Z', upphaed_an_vsk: -300, linur: [lin('Yfirferð · A', -1, 200)] });
  // verkstæðissala: V-hluti ekki klár (í vinnslu)
  const bud = sala({ id: 902, num: 'R-009902', upphaed_an_vsk: 1000, linur: [lin('Hleðsla · Duft 6 kg. ABC hleðsla', 1, 1000)] });
  const vb = [{ id: 51, num: 'R-009902-V1', status: 'inprogress', verd: 1240, klart_at: null }];
  // skoðun fyrir yfirtöku (apríl)
  const gamalt = sala({ id: 903, vidskiptategund: 'uttekt', created_at: '2026-06-05T10:00:00Z', customer_base_id: 8, customer_id: 80, upphaed_an_vsk: 500, linur: [lin('Yfirferð · A', 1, 500)] });
  const sk2 = { id: 2, doc_type: 'uttektarskyrsla', doc_date: '2026-06-05', customer_base_id: 8, fyrirtaeki_id: 80, is_duplicate: false, notes: 'X - 000 - 2026 - apríl - úttektarskýrsla - #2.pdf' };
  const r = TL.tekjulidir(g({ solur: [ut, kredit, bud, gamalt], skyrslur: [skyrsla, sk2], verkbeidnir: vb }), NU);
  assert.equal(flo(r, '01').man['2026-06'], 2000 - 300, 'yfirferð ársþjónustunnar í JÚNÍ (skoðunarmánuður, ekki nóvember); nótan (−300, ein lína) á dag frumsölunnar');
  assert.equal(flo(r, '02').man['2026-06'], 800); assert.equal(flo(r, '06').man['2026-06'], 200);
  assert.equal(r.samtals_man['2026-06'], 3000 - 300, 'nótan fylgir frumsölunni: nettó 2.700 í júní');
  assert.equal(r.samtals_man['2026-11'] || 0, 0, 'ekkert í nóvember (salan og nótan færð til)');
  assert.equal(flo(r, '02').i_vinnslu, 1000, 'verkstæðishluti ekki klár → „á verkstæði“ (telst ekki enn)');
  assert.equal(r.i_vinnslu, 1000); assert.equal(r.fyrir_yfirtoku, 500, 'skoðun í apríl = fyrir yfirtöku');
  assert.equal(r.samtals + r.i_vinnslu + r.fyrir_yfirtoku, 3000 - 300 + 1000 + 500); assert.equal(r.heild, r.heild_solur); assert.equal(r.stemmir, true);
  // hópar leggja saman flokka þeirra
  const th = r.hopar.find((h) => h.id === 'thjonusta');
  assert.equal(th.samtals, flo(r, '01').samtals + flo(r, '02').samtals + flo(r, '06').samtals + flo(r, '08').samtals);
});

test('verkstæðishluti klár: færist á klart_at-mánuð og fer FYRST á hleðslu-/yfirferðarlínur sölunnar (afgangurinn hlutfallslega); sölutegundir sér', () => {
  const bud = sala({ id: 910, num: 'R-009910', created_at: '2026-10-29T10:00:00Z', upphaed_an_vsk: 1000, linur: [lin('Hleðsla · Duft 6 kg. ABC hleðsla', 1, 600), lin('Skilti flöt rauð', 1, 400)] });
  const vb = [{ id: 52, num: 'R-009910-V1', status: 'collected', verd: 744, klart_at: '2026-11-03T08:00:00Z' }];   // 600 án vsk
  const ut = sala({ id: 911, vidskiptategund: 'uttekt', created_at: '2026-11-02T10:00:00Z', upphaed_an_vsk: 2000, linur: [lin('Yfirferð · X', 10, 200)] });
  const r = TL.tekjulidir(g({ solur: [bud, ut], verkbeidnir: vb }), NU);
  assert.equal(Math.round(flo(r, '02').man['2026-11']), 600, 'V-hlutinn (600) á klart_at (nóvember)');
  assert.equal(Math.round(flo(r, '11').man['2026-10'] || 0) + Math.round(flo(r, '11').man['2026-11'] || 0), 400, 'afgangurinn (skilti) á söludegi (október)');
  assert.equal(r.solutegundir.find((t) => t.id === 'uttektir').man['2026-11'], 2000);
  assert.equal(r.solutegundir.find((t) => t.id === 'afgreidsla').samtals, 1000);
  assert.equal(r.stemmir, true);
  // V-hluti stærri en verkstæðislínurnar (900 af 1000): hleðslulínan öll (600), afgangur V (300) hlutfallslega á hinar línur (skilti 400 → 300 í nóvember)
  const bud2 = sala({ id: 912, num: 'R-009912', created_at: '2026-10-29T10:00:00Z', upphaed_an_vsk: 1000, linur: [lin('Hleðsla · Duft 6 kg. ABC hleðsla', 1, 600), lin('Skilti flöt rauð', 1, 400)] });
  const r2 = TL.tekjulidir(g({ solur: [bud2], verkbeidnir: [{ id: 53, num: 'R-009912-V1', status: 'collected', verd: 1116, klart_at: '2026-11-03T08:00:00Z' }] }), NU);   // 900 án vsk
  assert.equal(Math.round(flo(r2, '02').man['2026-11']), 600); assert.equal(Math.round(flo(r2, '11').man['2026-11']), 300); assert.equal(Math.round(flo(r2, '11').man['2026-10']), 100);
  assert.equal(r2.samtals, 1000); assert.equal(r2.stemmir, true);
});

test('topp 8: vörulistalínur og endurteknir textar sýndir, STAKAR ótengdar línur ekki (gætu verið nöfn); stk og kr dregin saman', () => {
  const linur = [lin('Nýtt · Léttvatn 6 kg. AB Slökkvitæki', 2, 100, 1), lin('Slökkvitæki Jóns Jónssonar', 1, 300)];     // vara í lista + einstök lína með texta
  const s = sala({ upphaed_an_vsk: 500, linur });
  const s2 = sala({ upphaed_an_vsk: 100, linur: [lin('Slökkvitæki Jóns Jónssonar', 1, 100)] });
  const r = TL.tekjulidir(g({ solur: [s, s2] }), NU);
  const t3 = flo(r, '03').topp, t4 = flo(r, '04').topp;
  assert.equal(t3[0].heiti, 'Léttvatn 6 kg. AB Slökkvitæki'); assert.equal(t3[0].stk, 2); assert.equal(t3[0].kr, 200);
  assert.equal(t4[0].heiti, 'Slökkvitæki Jóns Jónssonar', 'sami texti tvisvar → sýndur (kemur fyrir oftar en einu sinni)');
  const s3 = sala({ upphaed_an_vsk: 50, linur: [lin('Slökkvitæki Önnu Önnudóttur', 1, 50)] });
  const r2 = TL.tekjulidir(g({ solur: [s3] }), NU);
  assert.doesNotMatch(JSON.stringify(flo(r2, '04').topp), /Önnu/, 'stök ótengd lína er EKKI sýnd með texta');
  assert.match(JSON.stringify(flo(r2, '04').topp), /Stakar línur/);
  assert.equal(TL.toppFlokkar(r, '2026-11', 3)[0].id, flo(r, '03').samtals >= flo(r, '04').samtals ? '03' : '04');
  assert.ok(TL.SKILGREINING.almennt && TL.SKILGREINING.fyrirvarar && TL.SKILGREINING.manudir && TL.SKILGREINING.afslattur);
});

test('rýni 22.11: blönduð formerki með V-hluta tapa engu; „Ýmsar vörur“ sýndar aðeins ef n ≥ 2; raðir leggjast upp í rúnnuðum reitum', () => {
  // sala 80 kr: Skilti +100, Hleðsla −20 — allt sem V-hluti (klart_at í nóvember): heildin = salan, ekkert tapast
  const s = sala({ id: 950, num: 'R-009950', created_at: '2026-10-29T10:00:00Z', upphaed_an_vsk: 80, linur: [lin('Skilti flöt', 1, 100), lin('Hleðsla · Duft 6 kg. ABC hleðsla', 1, -20)] });
  const vb = [{ id: 60, num: 'R-009950-V1', status: 'collected', verd: 99.2, klart_at: '2026-11-03T08:00:00Z' }];   // 80 án vsk
  const r = TL.tekjulidir(g({ solur: [s], verkbeidnir: vb }), NU);
  assert.equal(r.samtals, 80); assert.equal(r.heild_solur, 80); assert.equal(r.stemmir, true);
  // „Ýmsar vörur“ (gætu borið heiti kúnna) — ein lína sýnd ekki með nafni
  const vorur2 = VORUR.concat([{ id: 77, nafn: 'Eitthvað Fyrirtæki ehf.', flokkur: 'Ýmsar vörur', virkt: true }]);
  const r2 = TL.tekjulidir({ ...g({ solur: [sala({ upphaed_an_vsk: 50, linur: [lin('Eitthvað Fyrirtæki ehf.', 1, 50, 77)] })] }), vorur: vorur2 }, NU);
  assert.doesNotMatch(JSON.stringify(r2), /Fyrirtæki/); assert.match(JSON.stringify(flo(r2, '13').topp), /Stakar línur/);
  // rúnun: Σ mánaða = samtals í hverjum flokki og alls
  const margar = Array.from({ length: 30 }, (_, i) => sala({ upphaed_an_vsk: 33.33, created_at: i % 2 ? '2026-10-10T10:00:00Z' : '2026-11-10T10:00:00Z', linur: [lin('Yfirferð · A', 3, 10.1), lin('Akstur', 1, 3.3)] }));
  const r3 = TL.tekjulidir(g({ solur: margar }), NU);
  for (const f of r3.flokkar) assert.equal(f.samtals, r3.manudir.reduce((a, m) => a + f.man[m], 0), f.id);
  assert.equal(r3.samtals, r3.manudir.reduce((a, m) => a + r3.samtals_man[m], 0)); assert.equal(r3.stemmir, true);
});

test('stk í tækjaflokkum tapast ekki þegar V-hluti nær yfir heilar línur (live-mæling 22.11: Hleðsla 1.176 á móti 1.186 áður en lagað)', () => {
  const bud = sala({ id: 960, num: 'R-009960', created_at: '2026-10-29T10:00:00Z', upphaed_an_vsk: 1000, linur: [lin('Hleðsla · Duft 6 kg. ABC hleðsla', 10, 60), lin('Yfirferð · Duft 2 kg. ABC yfirferð', 4, 100)] });
  const vb = [{ id: 61, num: 'R-009960-V1', status: 'collected', verd: 1240, klart_at: '2026-11-03T08:00:00Z' }];     // 1000 án vsk = öll salan
  const r = TL.tekjulidir(g({ solur: [bud], verkbeidnir: vb }), NU);
  assert.equal(flo(r, '02').stk, 10); assert.equal(flo(r, '01').stk, 4);
  assert.equal(Math.round(flo(r, '02').man['2026-11']), 600); assert.equal(r.samtals, 1000);
  // hluta-V: helmingur salan fer á klart_at-mánuð — stk skiptist en heildin helst
  const b2 = sala({ id: 961, num: 'R-009961', created_at: '2026-10-29T10:00:00Z', upphaed_an_vsk: 1000, linur: [lin('Hleðsla · Duft 6 kg. ABC hleðsla', 10, 100)] });
  const r2 = TL.tekjulidir(g({ solur: [b2], verkbeidnir: [{ id: 62, num: 'R-009961-V1', status: 'collected', verd: 620, klart_at: '2026-11-03T08:00:00Z' }] }), NU);   // 500 án vsk
  assert.equal(flo(r2, '02').stk, 10); assert.equal(Math.round(flo(r2, '02').man['2026-11']), 500); assert.equal(Math.round(flo(r2, '02').man['2026-10']), 500);
});
