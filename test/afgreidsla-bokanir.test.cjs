// Próf: hamurinn „Bókanir“ í Afgreiðslunni (19.11.2026). Keyrsla: node --test test/afgreidsla-bokanir.test.cjs
//
// AF HVERJU (Agnar 19.11.2026, eftir að þrjú bókunardrög voru sett í Afgreiðsluna): „Geturðu sett auka ham fyrir svona“.
// Bókunarpóstar og bókunarsímtöl (gogn.flokkur = 'bokun') eiga sinn eigin flokk. Það sem má ALDREI bila:
//   1. bókun sést AÐEINS í „Bókanir“ — ekki í „Allt“ né tegundaflokkunum — og önnur verk sjást aldrei í „Bókanir“;
//   2. teljararnir stemma við það sem hver flokkur sýnir;
//   3. þjónninn sækir bókanir sér, svo þær ýti hinum verkunum ekki út fyrir 50-þakið (og öfugt), og hleypir aðeins
//      gildinu 'bokun' í gegn sem flokki (gogn kemur frá agentum);
//   4. sama skilgreining gildir á borðinu (511), símasíðunni (515) og /afgreidsla.html.
// Öll gögn eru tilbúin (repóið er opinbert).
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROT = path.join(__dirname, '..');
const lesa = (s) => fs.readFileSync(path.join(ROT, s), 'utf8').replace(/\r\n/g, '\n');
function hlada511() {
  const heimur = { setTimeout, clearTimeout, console, fetch: () => Promise.reject(new Error('ekkert net í prófi')) };
  vm.runInNewContext(lesa('js/patches/511-bord-afgreidsla.js'), heimur);
  return heimur.BordAfgreidsla;
}
const lidur = (id, tegund, flokkur) => ({ id, tegund, flokkur: flokkur || null, titill: 'Prufufélag ' + id + ': prufa', takki: 'Prufa', hvad_gerist: '', af_hverju: [], athuganir: [], ok: true,
  created_at: '2026-01-01T00:00:00Z', post: { account: 'a@example.is', to: ['b@example.is'], subject: 'x', texti: 'y' }, simtal: { hverjum: 'Jón', simi: '', handrit: '' }, verk: { lysing: '' } });
const GOGN = [lidur(1, 'tolvupostur', 'bokun'), lidur(2, 'simtal', 'bokun'), lidur(3, 'tolvupostur'), lidur(4, 'simtal'), lidur(5, 'verk'), lidur(6, 'verk', 'annad')];

test('flokkun: bókun er AÐEINS í „Bókanir“; „Allt“ og tegundaflokkarnir sýna hana aldrei', () => {
  const B = hlada511();
  const idI = (k) => GOGN.filter((v) => B.iFlokki(v, k)).map((v) => v.id);
  assert.deepEqual(idI('bokun'), [1, 2]);
  assert.deepEqual(idI('allt'), [3, 4, 5, 6], 'óþekkt flokksgildi („annad“) telst venjulegt verk');
  assert.deepEqual(idI('tolvupostur'), [3]); assert.deepEqual(idI('simtal'), [4]); assert.deepEqual(idI('verk'), [5, 6]);
  assert.deepEqual(idI(undefined), [3, 4, 5, 6]); assert.deepEqual(idI(''), [3, 4, 5, 6]);
  assert.deepEqual(JSON.parse(JSON.stringify(B.teljaFlokka(GOGN))), { allt: 4, bokun: 2, tolvupostur: 1, simtal: 1, verk: 2 });
  assert.deepEqual(JSON.parse(JSON.stringify(B.teljaFlokka([]))), { allt: 0 }); assert.deepEqual(JSON.parse(JSON.stringify(B.teljaFlokka(null))), { allt: 0 });
  assert.equal(B.erBokun(null), false); assert.equal(B.erBokun({ flokkur: 'Bokun' }), false, 'aðeins nákvæmlega „bokun“');
});

test('borðið (511): samantekt og flokkahnappar telja bókanir sér, og listinn fylgir völdum flokki', () => {
  const B = hlada511();
  B.S.tilbuin = GOGN.slice(); B.S.at = Date.now(); B.S.loading = null;
  assert.equal(B.samantekt(), '4 tilbúin · 1 póstur · 1 símtal · 2 verk · 2 bókanir');
  B.S.flokkur = 'allt';
  let h = B.listi();
  assert.match(h, /data-f="allt"[^>]*>Allt <b>4<\/b>/); assert.match(h, /data-f="bokun"[^>]*>Bókanir <b>2<\/b>/);
  assert.match(h, /data-f="tolvupostur"[^>]*>Póstur <b>1<\/b>/);
  assert.ok(!/Prufufélag 1:|Prufufélag 2:/.test(h.replace(/<[^>]+>/g, ' ')), 'bókanir sjást ekki í „Allt“');
  assert.ok(/Prufufélag\s*3/.test(h.replace(/<[^>]+>/g, ' ')), 'venjulegt verk sést í „Allt“');
  B.S.flokkur = 'bokun';
  h = B.listi().replace(/<[^>]+>/g, ' ');
  assert.ok(/Prufufélag\s*1/.test(h) && /Prufufélag\s*2/.test(h), 'bókanirnar sjást í „Bókanir“');
  assert.ok(!/Prufufélag\s*3|Prufufélag\s*5/.test(h), 'önnur verk sjást ekki í „Bókanir“');
  B.S.tilbuin = [lidur(9, 'tolvupostur', 'bokun')];
  assert.equal(B.samantekt(), '0 tilbúin · 1 bókun', 'aðeins bókanir eftir: ekki „Allt afgreitt“');
});

test('sama skilgreining á öllum þremur stöðum: borðið, símasíðan og /afgreidsla.html', () => {
  const skrar = { '511': lesa('js/patches/511-bord-afgreidsla.js'), '515': lesa('js/patches/515-tilbuin-simi.js'), html: lesa('afgreidsla.html') };
  const skilgr = (t) => (/var erBokun = [^\n]+\n\s*var iFlokki = [^\n]+\n\s*var teljaFlokka = [^\n]+/.exec(t) || [''])[0].replace(/\s+/g, ' ');
  assert.ok(skilgr(skrar['511']).length > 100);
  assert.equal(skilgr(skrar['515']), skilgr(skrar['511'])); assert.equal(skilgr(skrar.html), skilgr(skrar['511']));
  for (const [n, t] of Object.entries(skrar)) {
    assert.match(t, /FLOKKAR = \[[^\]]*'bokun'\]/, n + ': flokkurinn er á listanum');
    assert.ok(!/v\.tegund === S\.flokkur|v\.tegund === f;/.test(t), n + ': engin sía eftir tegund einni (hún hleypti bókunum í „Póstur“)');
    assert.match(t, /Bókanir/, n);
  }
  // /afgreidsla.html hleður 511 með nýjum skyndiminnislykli (annars fengi síðan gamla skrá án flokksins)
  assert.match(skrar.html, /511-bord-afgreidsla\.js\?v=20261119a/);
  new vm.Script([...skrar.html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]).join('\n'));   // síðan þáttast
});

test('þjónninn: bókanir sóttar sér með eigið þak; aðeins gildið „bokun“ fer í gegn sem flokkur', () => {
  const t = lesa('netlify/functions/afgreidsla.cjs');
  assert.match(t, /stada=eq\.tilbuid&or=\(gogn->>flokkur\.is\.null,gogn->>flokkur\.neq\.bokun\)&order=forgangur\.asc,created_at\.asc&limit=50/, 'önnur verk: sama 50-þak og áður, án bókana');
  assert.match(t, /stada=eq\.tilbuid&gogn->>flokkur=eq\.bokun&order=forgangur\.asc,created_at\.asc&limit=60/, 'bókanir: eigin fyrirspurn');
  assert.match(t, /flokkur: g\.flokkur === 'bokun' \? 'bokun' : null/, 'ekkert annað gildi úr gogn verður flokkur í viðmótinu');
  assert.match(t, /const tilb = bokanir\.concat\(onnur\);/);
});
