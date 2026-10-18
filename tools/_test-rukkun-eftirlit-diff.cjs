// Próf á netlify/functions/_rukkun-eftirlit-diff.cjs — keyrt með: node tools/_test-rukkun-eftirlit-diff.cjs
const assert = require('assert');
const K = require('../netlify/functions/_rukkun-eftirlit-diff.cjs');
let n = 0;
const t = (nafn, f) => { f(); n++; console.log('  ✔', nafn); };
const nu = new Date('2026-10-18T10:00:00Z'); // sunnudagur
const eftirlit = (o) => Object.assign({
  doc_nr_a_fleiri_felog: { alls: 1, daemi: [{ invoice_number: 'R-000165', felog: 2 }] },
  tvinotud_num: { alls: 0, daemi: [] },
  rukkad_ekki_final: { alls: 0, daemi: [] },
  void_greitt: { alls: 2, daemi: [{ num: 'R-000176' }, { num: 'R-000211' }] },
  byte_eins_tvitok: { alls: 0, daemi: [] },
  rukkad_an_kt: 0,
  rukkad_an_netfangs: { alls: 1, daemi: [{ num: 'R-000463' }] },
  felog_an_afhendingar: 596,
  greitt_sidar_gamalt: { alls: 0, daemi: [] },
  sott_ekki_final: { alls: 0, daemi: [] },
}, o || {});

console.log('rukkun-eftirlit-diff');
const grunn = K.mynd(eftirlit());
t('fyrsta keyrsla (engin fyrri) → grunnlína, ekki „allt nýtt"', () => {
  const p = K.buaTilPost(null, grunn, nu);
  assert.strictEqual(p.tegund, 'grunnlina'); assert.ok(p.senda);
  assert.ok(!/ný frávik/.test(p.efni.replace('hér eftir aðeins NÝ frávik', '')));
});
t('óbreytt staða → enginn póstur', () => {
  const p = K.buaTilPost(Object.assign({ t: 0 }, grunn), K.mynd(eftirlit()), nu);
  assert.strictEqual(p.senda, false); assert.strictEqual(p.tegund, 'ekkert');
});
t('nýtt atriði → aðeins það nýja er talið upp, gamalt aðeins sem fjöldi', () => {
  const cur = K.mynd(eftirlit({ void_greitt: { alls: 3, daemi: [{ num: 'R-000176' }, { num: 'R-000211' }, { num: 'R-000999' }] } }));
  const p = K.buaTilPost(Object.assign({ t: Date.parse('2026-10-17T10:00:00Z') }, grunn), cur, nu);
  assert.strictEqual(p.tegund, 'nytt');
  assert.ok(p.efni.includes('1 ný frávik'), p.efni);
  assert.ok(p.html.includes('R-000999'));
  assert.ok(!p.html.includes('R-000176'), 'gamalt atriði má ekki vera talið upp');
  assert.ok(!p.html.includes('R-000463'), 'gamalt atriði úr öðrum gátlista má ekki vera talið upp');
  assert.ok(p.html.includes('Óbreytt frá áður'));
});
t('leyst atriði koma fram en kalla ekki á póst ein og sér', () => {
  const cur = K.mynd(eftirlit({ void_greitt: { alls: 1, daemi: [{ num: 'R-000176' }] } }));
  assert.strictEqual(K.buaTilPost(Object.assign({ t: 0 }, grunn), cur, nu).senda, false);
  const s = K.samanburdur(grunn, cur); assert.strictEqual(s.leystAlls, 1); assert.deepStrictEqual(s.leyst.void_greitt, ['R-000211']);
});
t('vikulegt: mánudagur án nýs → staða án atriða; án vikulegt → þögn', () => {
  const p = K.buaTilPost(Object.assign({ t: 0 }, grunn), K.mynd(eftirlit()), nu, { vikulegt: true });
  assert.strictEqual(p.tegund, 'vikulegt'); assert.ok(p.efni.includes('vikuleg'));
});
t('tölu-gátlistar: hækkun er ný, lækkun er leyst', () => {
  const upp = K.samanburdur(grunn, K.mynd(eftirlit({ rukkad_an_kt: 2 }))); assert.strictEqual(upp.nyAlls, 2);
  const nidur = K.samanburdur(grunn, K.mynd(eftirlit({ felog_an_afhendingar: 590 }))); assert.strictEqual(nidur.leystAlls, 6); assert.strictEqual(nidur.nyAlls, 0);
});
t('gamla hreina fylkja-formið er stutt áfram', () => {
  const m = K.mynd({ void_greitt: [{ num: 'R-1' }, { num: 'R-2' }] });
  assert.deepStrictEqual(m.lyklar.void_greitt, ['R-1', 'R-2']);
});
t('cap: mörg ný atriði eru stytt með „í viðbót"', () => {
  const stort = { void_greitt: { alls: 60, daemi: Array.from({ length: 60 }, (_, i) => ({ num: 'R-' + i })) } };
  const p = K.buaTilPost(Object.assign({ t: 0 }, grunn), K.mynd(eftirlit(stort)), nu);
  assert.ok(p.html.includes('í viðbót'));
});
t('HTML-sleppi: nöfn með < og & brjóta ekki póstinn', () => {
  const cur = K.mynd(eftirlit({ byte_eins_tvitok: { alls: 1, daemi: [{ num_a: 'R-1', num_b: 'R-2', customer_nafn: 'A & B <ehf>' }] } }));
  const p = K.buaTilPost(Object.assign({ t: 0 }, grunn), cur, nu);
  assert.ok(p.html.includes('A &amp; B &lt;ehf&gt;'));
});
console.log(n + ' próf standast');
