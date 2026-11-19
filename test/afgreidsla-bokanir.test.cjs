// Próf: sérflokkarnir „Bókanir“ og „Dagsverk“ í Afgreiðslunni (19.11.2026). Keyrsla: node --test test/afgreidsla-bokanir.test.cjs
//
// AF HVERJU (Agnar 19.11.2026): „Geturðu sett auka ham fyrir svona“ (bókunarpóstar og bókunarsímtöl) og síðar sama dag
// „svona auka dagsvinnuplatform“ (verk dagsins). Liður með gogn.flokkur = 'bokun' eða 'dagsverk' á sinn eigin flokk.
// Það sem má ALDREI bila:
//   1. liður í sérflokki sést AÐEINS í sínum flokki — ekki í „Allt“, ekki í tegundaflokkunum og ekki í hinum sérflokknum —
//      og önnur verk sjást aldrei í sérflokki;
//   2. teljararnir stemma við það sem hver flokkur sýnir;
//   3. þjónninn sækir sérflokkana sér, svo þeir ýti hinum verkunum ekki út fyrir 50-þakið (og öfugt), og hleypir aðeins
//      þekktum gildum í gegn sem flokki (gogn kemur frá agentum);
//   4. sama skilgreining gildir á borðinu (511), símasíðunni (515) og /afgreidsla.html;
//   5. tengill á tiltekið verk opnar flokk þess — aldrei annað verk.
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
const GOGN = [lidur(1, 'tolvupostur', 'bokun'), lidur(2, 'simtal', 'bokun'), lidur(3, 'tolvupostur'), lidur(4, 'simtal'), lidur(5, 'verk'), lidur(6, 'verk', 'annad'),
  lidur(7, 'verk', 'dagsverk'), lidur(8, 'simtal', 'dagsverk')];
const hreint = (h) => h.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
const flatt = (o) => JSON.parse(JSON.stringify(o));

test('flokkun: liður í sérflokki er AÐEINS í sínum flokki; „Allt“ og tegundaflokkarnir sýna hann aldrei', () => {
  const B = hlada511();
  const idI = (k) => GOGN.filter((v) => B.iFlokki(v, k)).map((v) => v.id);
  assert.deepEqual(idI('bokun'), [1, 2]);
  assert.deepEqual(idI('dagsverk'), [7, 8]);
  assert.deepEqual(idI('allt'), [3, 4, 5, 6], 'óþekkt flokksgildi („annad“) telst venjulegt verk');
  assert.deepEqual(idI('tolvupostur'), [3]); assert.deepEqual(idI('simtal'), [4], 'bókunar- og dagsverkasímtöl eru ekki í „Símtal“'); assert.deepEqual(idI('verk'), [5, 6]);
  assert.deepEqual(idI(undefined), [3, 4, 5, 6]); assert.deepEqual(idI(''), [3, 4, 5, 6]);
  assert.deepEqual(flatt(B.teljaFlokka(GOGN)), { allt: 4, bokun: 2, dagsverk: 2, tolvupostur: 1, simtal: 1, verk: 2 });
  assert.deepEqual(flatt(B.teljaFlokka([])), { allt: 0 }); assert.deepEqual(flatt(B.teljaFlokka(null)), { allt: 0 });
  assert.equal(B.erBokun(null), false); assert.equal(B.erBokun({ flokkur: 'Bokun' }), false, 'aðeins nákvæmlega „bokun“');
  assert.equal(B.serflokkur({ flokkur: 'dagsverk' }), 'dagsverk'); assert.equal(B.serflokkur({ flokkur: 'Dagsverk' }), null);
  // Heiti úr Object.prototype má aldrei verða að flokki (gogn kemur frá agentum).
  for (const x of ['constructor', 'toString', '__proto__', 'hasOwnProperty']) {
    assert.equal(B.serflokkur({ flokkur: x }), null, x);
    assert.deepEqual(GOGN.filter((v) => B.iFlokki(v, x)).map((v) => v.id), [], 'óþekktur flokkur „' + x + '“ sýnir ekkert sérflokksverk');
  }
});

test('borðið (511): samantekt og flokkahnappar telja sérflokkana sér, og listinn fylgir völdum flokki', () => {
  const B = hlada511();
  B.S.tilbuin = GOGN.slice(); B.S.at = Date.now(); B.S.loading = null;
  assert.equal(B.samantekt(), '4 tilbúin · 2 dagsverk · 1 póstur · 1 símtal · 2 verk · 2 bókanir');
  B.S.flokkur = 'allt';
  let h = B.listi();
  assert.match(h, /data-f="allt"[^>]*>Allt <b>4<\/b>/); assert.match(h, /data-f="bokun"[^>]*>Bókanir <b>2<\/b>/); assert.match(h, /data-f="dagsverk"[^>]*>Dagsverk <b>2<\/b>/);
  assert.match(h, /data-f="tolvupostur"[^>]*>Póstur <b>1<\/b>/); assert.match(h, /data-f="simtal"[^>]*>Símtal <b>1<\/b>/);
  assert.ok(h.indexOf('data-f="dagsverk"') < h.indexOf('data-f="tolvupostur"'), 'Dagsverk er fremst á eftir „Allt“');
  assert.ok(!/Prufufélag\s*[1278]\b/.test(hreint(h)), 'sérflokksverk sjást ekki í „Allt“');
  assert.ok(/Prufufélag\s*3\b/.test(hreint(h)), 'venjulegt verk sést í „Allt“');
  B.S.flokkur = 'bokun';
  h = hreint(B.listi());
  assert.ok(/Prufufélag\s*1\b/.test(h) && /Prufufélag\s*2\b/.test(h), 'bókanirnar sjást í „Bókanir“');
  assert.ok(!/Prufufélag\s*[3578]\b/.test(h), 'önnur verk og dagsverk sjást ekki í „Bókanir“');
  B.S.flokkur = 'dagsverk';
  h = hreint(B.listi());
  assert.ok(/Prufufélag\s*7\b/.test(h) && /Prufufélag\s*8\b/.test(h), 'dagsverkin sjást í „Dagsverk“');
  assert.ok(!/Prufufélag\s*[1235]\b/.test(h), 'önnur verk og bókanir sjást ekki í „Dagsverk“');
  B.S.tilbuin = [lidur(9, 'tolvupostur', 'bokun')];
  assert.equal(B.samantekt(), '0 tilbúin · 1 bókun', 'aðeins bókanir eftir: ekki „Allt afgreitt“');
  B.S.tilbuin = [lidur(9, 'verk', 'dagsverk')];
  assert.equal(B.samantekt(), '0 tilbúin · 1 dagsverk');
});

test('sama skilgreining á öllum þremur stöðum: borðið, símasíðan og /afgreidsla.html', () => {
  const skrar = { '511': lesa('js/patches/511-bord-afgreidsla.js'), '515': lesa('js/patches/515-tilbuin-simi.js'), html: lesa('afgreidsla.html') };
  const skilgr = (t) => (/var SERFLOKKAR = [^\n]+\n\s*var serflokkur = [^\n]+\n\s*var erBokun = [^\n]+\n\s*var iFlokki = [^\n]+\n\s*var teljaFlokka = [^\n]+\n\s*var serTexti = [^\n]+/.exec(t) || [''])[0].replace(/\s+/g, ' ');
  assert.ok(skilgr(skrar['511']).length > 300);
  assert.equal(skilgr(skrar['515']), skilgr(skrar['511'])); assert.equal(skilgr(skrar.html), skilgr(skrar['511']));
  for (const [n, t] of Object.entries(skrar)) {
    assert.match(t, /FLOKKAR = \['allt', 'dagsverk',[^\]]*'bokun'\]/, n + ': báðir sérflokkarnir eru á listanum');
    assert.ok(!/v\.tegund === S\.flokkur|v\.tegund === f;/.test(t), n + ': engin sía eftir tegund einni (hún hleypti sérflokksverkum í „Póstur“)');
    assert.match(t, /Bókanir/, n); assert.match(t, /Dagsverk/, n);
  }
  // /afgreidsla.html hleður 511 með nýjum skyndiminnislykli (annars fengi síðan gamla skrá án flokksins)
  assert.match(skrar.html, /511-bord-afgreidsla\.js\?v=20261119b/);
  new vm.Script([...skrar.html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]).join('\n'));   // síðan þáttast
});

test('þjónninn: sérflokkar sóttir sér með eigið þak; aðeins þekkt gildi fara í gegn sem flokkur', () => {
  const t = lesa('netlify/functions/afgreidsla.cjs');
  assert.match(t, /const SERFLOKKAR = \['dagsverk', 'bokun'\];/);
  assert.match(t, /stada=eq\.tilbuid&or=\(gogn->>flokkur\.is\.null,gogn->>flokkur\.not\.in\.\(' \+ SERFLOKKAR\.join\(','\) \+ '\)\)&order=forgangur\.asc,created_at\.asc&limit=50'/, 'önnur verk: sama 50-þak og áður, án sérflokka');
  assert.match(t, /stada=eq\.tilbuid&gogn->>flokkur=in\.\(' \+ SERFLOKKAR\.join\(','\) \+ '\)&order=forgangur\.asc,created_at\.asc&limit=100'/, 'sérflokkar: eigin fyrirspurn');
  assert.match(t, /flokkur: SERFLOKKAR\.includes\(g\.flokkur\) \? g\.flokkur : null/, 'ekkert annað gildi úr gogn verður flokkur í viðmótinu');
  assert.match(t, /const tilb = onnur\.concat\(ser\);/, 'venjulegu verkin fremst: sá sem les listann ósíaðan fær þau fyrst');
});

// Rýni 19.11.2026: tengill á tiltekið verk (Einkaritarinn 506 „Afgreiða ›“, /afgreidsla.html?v=<id>) setti flokkinn alltaf á
// „Allt“. Sérflokksverk er ekki þar, svo borðið sýndi ekkert og sér síðan valdi ANNAÐ verk með rauða takkanum.
test('tengill á sérflokksverk opnar flokk þess — aldrei annað verk', () => {
  const heimur = { setTimeout, clearTimeout, console, fetch: () => Promise.reject(new Error('ekkert net í prófi')) };
  let teiknad = 0;
  heimur.Bord368 = { opnaEiningu: (k) => k === 'tilbuin', render: () => { teiknad++; }, root: () => null, toast: () => {} };
  vm.runInNewContext(lesa('js/patches/511-bord-afgreidsla.js'), heimur);
  const B = heimur.BordAfgreidsla;
  B.S.tilbuin = GOGN.slice(); B.S.at = Date.now(); B.S.loading = null;
  assert.equal(B.opna(1), true); assert.equal(B.S.flokkur, 'bokun'); assert.equal(B.S.opid, 1);
  assert.ok(/Prufufélag\s*1\b/.test(hreint(B.listi())), 'bókunin sem beðið var um er í listanum');
  assert.equal(B.opna(7), true); assert.equal(B.S.flokkur, 'dagsverk'); assert.equal(B.S.opid, 7);
  assert.ok(/Prufufélag\s*7\b/.test(hreint(B.listi())), 'dagsverkið sem beðið var um er í listanum');
  assert.equal(B.opna(3), true); assert.equal(B.S.flokkur, 'allt', 'venjulegt verk opnast áfram í „Allt“'); assert.equal(B.S.opid, 3);
  B.S.flokkur = 'bokun';
  assert.equal(B.opna(999), true); assert.equal(B.S.flokkur, 'allt', 'verk sem er farið úr röðinni: „Allt“, ekkert opnað');
  assert.ok(teiknad >= 4);

  // /afgreidsla.html?v=<id>: sama regla, í frumkóða síðunnar (hún keyrir ekki utan vafra)
  const html = lesa('afgreidsla.html');
  assert.match(html, /if \(qv\) \{ S\.val = qv; var qs0 = serflokkur\(S\.tilbuin\.filter\(function \(x\) \{ return x\.id === qv; \}\)\[0\]\); if \(qs0\) S\.flokkur = qs0; \}/);
  assert.match(html, /if \(qf && FLOKKAR\.indexOf\(qf\) > -1\) S\.flokkur = qf;/, '?f=dagsverk og ?f=bokun opna flokkinn (tenglarnir á Aðalmálum)');
});

test('símasíðan (515) og Aðalmál (492): sérflokkar taldir sér og fara ekki í lista hinna verkanna', () => {
  const w = { setTimeout, clearTimeout, console, fetch: () => Promise.reject(new Error('ekkert net í prófi')) };
  w.window = w;
  vm.runInNewContext(lesa('js/patches/511-bord-afgreidsla.js'), w);
  vm.runInNewContext(lesa('js/patches/515-tilbuin-simi.js'), w);
  const A = w.BordAfgreidsla, T = w.TilbuinSimi;
  A.S.tilbuin = GOGN.slice(); A.S.at = 0; A.S.loading = null;
  assert.match(hreint(T._haus(A)), /4 tilbúin · 2 dagsverk · 2 bókanir/, 'hausinn sýnir sömu tölu og „Allt“');
  assert.deepEqual(T.sia(GOGN, 'dagsverk').map((v) => v.id), [7, 8]); assert.deepEqual(T.sia(GOGN, 'allt').map((v) => v.id), [3, 4, 5, 6]);
  assert.deepEqual(flatt(T.teljarar(GOGN)), { allt: 4, bokun: 2, dagsverk: 2, tolvupostur: 1, simtal: 1, verk: 2 });
  A.S.tilbuin = [lidur(9, 'simtal', 'bokun')];
  assert.match(hreint(T._haus(A)), /0 tilbúin · 1 bókun/, 'aðeins bókun eftir: ekki „Allt afgreitt“');
  A.S.tilbuin = [lidur(9, 'verk', 'dagsverk')];
  assert.match(hreint(T._haus(A)), /0 tilbúin · 1 dagsverk/);
  A.S.tilbuin = [];
  assert.match(hreint(T._haus(A)), /Allt afgreitt/);

  const a492 = lesa('js/patches/492-adalmal.js');
  assert.match(a492, /S\.af\.tilbuin = allt\.filter\(v => v\.flokkur !== 'bokun' && v\.flokkur !== 'dagsverk'\); S\.af\.bokanir = telja\('bokun'\); S\.af\.dagsverk = telja\('dagsverk'\);/);
  assert.match(a492, /href="\/afgreidsla\.html\?f=bokun"/); assert.match(a492, /href="\/afgreidsla\.html\?f=dagsverk"/);
});
