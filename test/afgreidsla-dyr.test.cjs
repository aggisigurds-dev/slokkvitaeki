// Próf: DYR á liðum Afgreiðslunnar (18.11.2026). Keyrsla: node --test test/afgreidsla-dyr.test.cjs
//
// AF HVERJU (orð Agnars 18.11.2026): „Afgreiðslan virkar ekki, og ennþá næstum ekkert hægt að gera í flestum liðum þarna“ ·
// „Þetta er bara alls ekki vinnuborð“ · „Þetta á að vera portal, sendir mig þá þangað sem ég get gert eitthvað beint“ ·
// „Ég vil helst geta gert allt beint þaðan af borðinu, að ég þurfi ekki að ýta á hliðarstikuna og leita“.
// Af 50 liðum buðu 42 aðeins „Lesið — loka“, „Búið“ eða „Setja á Verkefnalistann“, þótt þeir bæru málsnúmer, reikningsnúmer,
// símanúmer og félög. Nú verða þau auðkenni DYR. Það sem má ALDREI bila:
//   1. dyr opna aðeins færslu sem STENDUR í liðnum og FINNST í grunninum — aldrei nafnagisk, aldrei rangt félag;
//   2. lokað eða eytt mál fær engar dyr; kennitala með fleiri en einn stað fær engar félagsdyr;
//   3. slóð sem er hvorki tel: né afstæð slóð á þennan vef verður ALDREI að tengli (gögnin koma frá agentum);
//   4. Gatt.opna tekur aðeins þekkta tegund og jákvæða heiltölu, og kallar á rétt opnunarfall;
//   5. bregðist uppflettingin koma liðirnir samt, án dyra.
// Öll gögn hér eru tilbúin (repóið er opinbert): engin raunveruleg nöfn, símanúmer eða upphæðir.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROT = path.join(__dirname, '..');
const D = require(path.join(ROT, 'netlify', 'functions', '_afgreidsla-dyr.cjs'));

/* Gervigrunnur: mál 1 opið (félag 10), mál 2 lokað, mál 3 eytt; sölur R-000111 (id 501, félag 10) og R-000222 (id 502,
 * félag 20); félög 10, 20, 30 til; kennitala 4101012340 á EINN stað (30), 5505051230 á TVO (20 og 21). */
const GRUNNUR = {
  thjonustubeidni: [{ id: 1, status: 'opid', deleted_at: null, archived_at: null, fyrirtaeki_id: 10 }, { id: 2, status: 'lokad', deleted_at: null, archived_at: null, fyrirtaeki_id: 10 },
    { id: 3, status: 'opid', deleted_at: '2026-01-01', archived_at: null, fyrirtaeki_id: 20 }],
  solur: [{ id: 501, num: 'R-000111', customer_id: 10 }, { id: 502, num: 'R-000222', customer_id: 20 }],
  verkbeidnir: [{ id: 900 }],
  fyrirtaeki: [{ id: 10, nafn: 'Prufufélag A ehf.', kennitala: '6001011230' }, { id: 20, nafn: 'Prufufélag B, Aðalgata 1', kennitala: '550505-1230' },
    { id: 21, nafn: 'Prufufélag B, Hliðargata 2', kennitala: '550505-1230' }, { id: 30, nafn: 'Prufufélag C <b>', kennitala: '410101-2340' }],
};
function gerviLesa(kollud = []) {
  return async (slod) => {
    kollud.push(slod);
    const tafla = slod.split('?')[0], m = /[?&](id|num|kennitala)=in\.\(([^)]*)\)/.exec(slod);
    const gildi = m ? m[2].split(',') : [];
    return (GRUNNUR[tafla] || []).filter((r) => !m || gildi.includes(String(r[m[1]])));
  };
}
const lidur = (yfir) => Object.assign({ id: 1, tegund: 'verk', titill: 'Prufa: ekkert auðkenni', takki: 'Lesið — loka', hvad_gerist: '', af_hverju: [], gogn: {} }, yfir);
const dyr = async (row) => D.dyrFyrir(row, await D.saekja([row], gerviLesa()));
const teg = (r) => r.dyr.map((d) => d.teg + ':' + d.id);

test('auðkenni: titillinn ræður — reikningur og mál sem standa í titlinum fara fremst; mest þrír reikningar', () => {
  const a = D.audkenni(lidur({ titill: 'Prufufélag: R-000111 ógreiddur (mál #1)', hvad_gerist: 'Sjá líka R-000222 og mál #2',
    af_hverju: [{ texti: 'R-000333 var greiddur' }], gogn: { mal_id: 7, kt: '410101-2340', lysing: 'R-000444' } }));
  assert.deepEqual(a.reikn, ['R-000111'], 'aðeins reikningurinn í titlinum — hinir eru samhengi');
  assert.deepEqual(a.mal, [7, 1], 'málið í gögnunum og titlinum — mál #2 í rökunum er samhengi og verður EKKI takki');
  assert.deepEqual(D.audkenni(lidur({ titill: 'Félag: úttekt unnin', hvad_gerist: 'Sjá mál #2 og mál #1' })).mal, [2, 1], 'nefni hvorki gögn né titill mál gildir textinn');
  assert.equal(a.kt, '4101012340');
  const b = D.audkenni(lidur({ titill: 'Fjórtán sölur telja sem útistandandi', hvad_gerist: 'R-000001 R-000002 R-000003 R-000004 R-000005' }));
  assert.deepEqual(b.reikn, ['R-000001', 'R-000002', 'R-000003']); assert.equal(b.fleiriReikn, 2);
  assert.deepEqual(D.audkenni(lidur({ gogn: { r_numer: 'R-000222', reikningar: ['R-000111', { num: 'R-000222' }, 'R-12', 'rusl'] } })).reikn, ['R-000222', 'R-000111']);
  assert.equal(D.audkenni(lidur({ gogn: { kt: '12345' } })).kt, '', 'ófullkomin kennitala er ekki notuð');
  assert.doesNotThrow(() => D.audkenni({}), 'tómur liður fellir ekkert');
});

test('símanúmer → tel:-slóð: íslenskt sjö stafa númer með eða án +354, bila og bandstriks; annað gefur ekkert', () => {
  assert.deepEqual(D.simaslod('555 1234'), { slod: 'tel:+3545551234', numer: '555 1234' });
  assert.equal(D.simaslod('+354 555-1234 (skiptiborð)').slod, 'tel:+3545551234');
  assert.equal(D.simaslod('5551234 eða 555 9999').slod, 'tel:+3545551234', 'fyrsta númerið');
  for (const x of ['+354 555 12 34', '+3545551234', '00354 555-1234', '555-12-34', '555 1234 555 9999']) assert.equal((D.simaslod(x) || {}).slod, 'tel:+3545551234', x);
  for (const x of ['', null, 'enginn sími', '12345', 'netfang@example.is', '+1 555 123 4567', '+45 55 51 23 45', 'kt 410101-2340']) assert.equal(D.simaslod(x), null, String(x));
  // Erlent númer má ALDREI verða að íslensku númeri (áður varð „+1 555 123 4567“ að tel:+3541234567).
});

test('símtalsliður: Hringja er FYRSTI takkinn, svo málið, reikningurinn og félagið sem reikningurinn tilheyrir', async () => {
  const r = await dyr(lidur({ tegund: 'simtal', titill: 'Prufufélag A: R-000111 ógreiddur', gogn: { simi: '555 1234', hverjum: 'Jón, bókhald (skrifstofa)', mal_id: 1 } }));
  assert.deepEqual(teg(r), ['simi:0', 'mal:1', 'sala:501', 'felag:10']);
  assert.equal(r.dyr[0].heiti, 'Hringja í Jón · 555 1234'); assert.equal(r.dyr[0].slod, 'tel:+3545551234');
  assert.deepEqual(r.dyr.slice(1).map((d) => d.slod), ['/?mal=1#bord', '/?opna=sala:501#bord', '/#company/10']);
  assert.deepEqual(r.dyr.slice(1).map((d) => d.heiti), ['Opna mál #1', 'Opna reikning R-000111', 'Opna Prufufélag A ehf.']);
});

test('ALDREI rangar dyr: lokað/eytt mál, reikningur sem finnst ekki, kennitala á tveimur stöðum, nafn eitt og sér', async () => {
  assert.deepEqual(teg(await dyr(lidur({ titill: 'X: sjá mál #2' }))), ['felag:10'], 'lokað mál fær engar dyr; félag málsins má opna');
  assert.deepEqual(teg(await dyr(lidur({ titill: 'X: sjá mál #2 og mál #3' }))), [], 'lokað og eytt mál með sitt hvort félagið: engar dyr');
  assert.deepEqual(teg(await dyr(lidur({ titill: 'X: R-999999 finnst ekki' }))), []);
  assert.deepEqual(teg(await dyr(lidur({ titill: 'Rekstrarfélag', gogn: { kt: '5505051230' } }))), [], 'tveir staðir á sömu kennitölu → engar félagsdyr');
  assert.deepEqual(teg(await dyr(lidur({ titill: 'Stakt félag', gogn: { kt: '410101-2340' } }))), ['felag:30'], 'ein samsvörun → dyr');
  assert.deepEqual(teg(await dyr(lidur({ titill: 'Prufufélag A ehf.: eitthvað þarf að gera' }))), [], 'nafn í titli er aldrei parað við félag');
  assert.deepEqual(teg(await dyr(lidur({ titill: 'Tveir reikningar: R-000111 og R-000222' }))), ['sala:501', 'sala:502'], 'tvö félög koma til greina → engar félagsdyr');
  assert.deepEqual(teg(await dyr(lidur({ titill: 'X', gogn: { fyrirtaeki_id: 99 } }))), [], 'félag sem er ekki til (eða eytt)');
});

test('dyr sem agent setur sjálfur (gogn.dyr): aðeins þekkt tegund, heiltala og færsla sem finnst', async () => {
  const r = await dyr(lidur({ titill: 'Úttekt unnin en enginn reikningur', gogn: { dyr: [
    { teg: 'gleymt', id: 10, heiti: 'Gleymst að rukka? — Prufufélag A' }, { teg: 'arsskodun', id: 20 }, { teg: 'krafa', id: 501 }, { teg: 'verkbeidni', id: 900 }, { teg: 'verkbeidni', id: 901 },
    { teg: 'felag', id: 99 }, { teg: 'sala', id: 777 }, { teg: 'slod', id: 1, slod: 'https://annar-vefur.example' }, { teg: 'mal', id: 2 }, { teg: 'mal', id: 'x' }, null, 'rusl'] } }));
  assert.deepEqual(teg(r), ['gleymt:10', 'arsskodun:20', 'krafa:501', 'verkbeidni:900'], 'verkbeiðni 901 er ekki til → engar dyr');
  assert.deepEqual(r.dyr.map((d) => d.slod), ['/?opna=gleymt:10#bord', '/?opna=arsskodun:20#bord', '/?opna=krafa:501#bord', '/?opna=verkbeidni:900#bord']);
  assert.equal(r.dyr[1].heiti, 'Opna ársskoðunina');
  assert.ok(r.dyr.every((d) => /^\/[?#]/.test(d.slod)), 'engin slóð út fyrir þennan vef');
});

test('listi af félögum: hver lína er dyr að sínu félagi; félag sem finnst ekki fær nafn en enga slóð', async () => {
  const r = await dyr(lidur({ titill: 'Úttektir útrunnar: þrjú félög', gogn: { felog: [
    { fyrirtaeki_id: 10, nafn: 'gamalt heiti', simi: '555-1234', sidasta_skodun: '2025-03-04T00:00:00', taeki_skrad: 7 },
    { fyrirtaeki_id: 99, nafn: 'Horfið félag', arsvelta_kr: 123456 }, { nafn: 'Án auðkennis' }, 'rusl', null] } }));
  assert.equal(r.listi.length, 3);
  assert.deepEqual(r.listi[0], { nafn: 'Prufufélag A ehf.', auka: 'Síðast skoðað 2025-03-04 · 7 tæki', teg: 'felag', id: 10, slod: '/#company/10', simi: 'tel:+3545551234', simanumer: '555 1234' });
  assert.deepEqual([r.listi[1].slod, r.listi[1].teg, r.listi[1].nafn], [null, null, 'Horfið félag']);
  assert.equal(r.listi[2].slod, null);
  const margir = await dyr(lidur({ gogn: { felog: Array.from({ length: 200 }, (_, i) => ({ fyrirtaeki_id: 10, nafn: 'F' + i })) } }));
  assert.equal(margir.listi.length, 80, 'þak á listann');
});

test('saekja: ein umferð fyrir alla liði, langur listi í bútum, og bilun í grunni gefur liði án dyra (ekkert kast)', async () => {
  const kollud = [];
  const rows = [lidur({ titill: 'A: R-000111 (mál #1)' }), lidur({ titill: 'B: R-000222', gogn: { kt: '410101-2340' } }),
    lidur({ gogn: { felog: Array.from({ length: 70 }, (_, i) => ({ fyrirtaeki_id: 1000 + i })) } }), lidur({ gogn: { felog: Array.from({ length: 80 }, (_, i) => ({ fyrirtaeki_id: 2000 + i })) } }),
    lidur({ gogn: { felog: Array.from({ length: 60 }, (_, i) => ({ fyrirtaeki_id: 3000 + i })) } })];
  const V = await D.saekja(rows, gerviLesa(kollud));
  assert.equal(kollud.filter((s) => s.startsWith('thjonustubeidni')).length, 1); assert.equal(kollud.filter((s) => s.startsWith('solur')).length, 1);
  assert.equal(kollud.filter((s) => s.startsWith('fyrirtaeki?select=id,nafn&')).length, 2, '212 félög → tveir bútar (150 í einu)');
  assert.ok(kollud.every((s) => s.length < 2500), 'engin slóð verður of löng');
  assert.ok(kollud.filter((s) => s.startsWith('fyrirtaeki')).every((s) => s.includes('deleted_at=is.null')), 'eydd félög eru aldrei dyr');
  assert.deepEqual(teg(D.dyrFyrir(rows[0], V)), ['mal:1', 'sala:501', 'felag:10']);
  const bilad = await D.saekja(rows, async () => { throw new Error('grunnurinn svarar ekki'); });
  assert.deepEqual(bilad, { mal: [], solur: [], ktFelog: [], felog: [], verkb: [] });
  assert.deepEqual(D.dyrFyrir(rows[0], bilad).dyr, []);
  assert.deepEqual(D.dyrFyrir(rows[0], null).dyr, [], 'engin uppfletting → engar dyr, ekkert kast');
});

/* ── Viðmótið: takkarnir sjálfir (511) ──────────────────────────────────────────────────────────── */
function hlada511(auka) {
  const heimur = Object.assign({ setTimeout, clearTimeout, console, fetch: () => Promise.reject(new Error('ekkert net í prófi')) }, auka || {});
  vm.runInNewContext(fs.readFileSync(path.join(ROT, 'js', 'patches', '511-bord-afgreidsla.js'), 'utf8'), heimur);
  return heimur.BordAfgreidsla;
}

test('takkarnir: fyrsti er aðaltakki, símtal hringir, appdyr bera data-gatt; hættuleg slóð verður aldrei tengill', () => {
  const B = hlada511();
  const h = B.snid.dyrHtml({ dyr: [{ teg: 'simi', id: 0, heiti: 'Hringja í Jón · 555 1234', slod: 'tel:+3545551234' }, { teg: 'mal', id: 1, heiti: 'Opna mál #1', slod: '/?mal=1#bord' },
    { teg: 'sala', id: 501, heiti: 'Opna <reikning>', slod: '/?opna=sala:501#bord' }, { teg: 'felag', id: 10, heiti: 'Ill slóð', slod: 'javascript:alert(1)' },
    { teg: 'felag', id: 11, heiti: 'Annar vefur', slod: '//annar-vefur.example/x' }, { teg: 'felag', id: 12, heiti: 'Full slóð', slod: 'https://annar-vefur.example/' },
    { teg: 'felag', id: 13, heiti: 'Gæsalappir', slod: '/#company/13" onclick="x' }, { teg: 'felag', id: 14, heiti: '', slod: '/#company/14' },
    { teg: 'felag', id: 15, heiti: 'Bakstrik', slod: '/\\annar-vefur.example/x' }, { teg: 'felag', id: 16, heiti: 'Bakstrik inni', slod: '/a\\b' }], fleiri_reikningar: 2 });
  assert.equal((h.match(/<a class="baf-dyr/g) || []).length, 3, 'aðeins þrjár öruggar dyr: ' + h);
  assert.match(h, /<a class="baf-dyr baf-dyr-a baf-dyr-s" href="tel:\+3545551234">/, 'símtalið er fyrst og aðaltakki, án data-gatt');
  assert.match(h, /href="\/\?mal=1#bord" data-gatt="mal:1"/); assert.match(h, /data-gatt="sala:501"/);
  assert.ok(h.includes('Opna &lt;reikning&gt;') && !h.includes('<reikning>'), 'heiti er alltaf afmáð');
  assert.ok(!/javascript:|annar-vefur|onclick/.test(h));
  assert.match(h, /\+2 reikningar nefndir í lýsingunni/);
  assert.equal(B.snid.dyrHtml({ dyr: [], listi: [] }), ''); assert.equal(B.snid.dyrHtml({}), ''); assert.equal(B.snid.dyrHtml(null), '');
  assert.ok(B.dyrCss().includes('.baf-dyr-a{'), 'stílarnir fylgja (símasíðan notar þá)');
  assert.equal(typeof B.dyrHtml, 'function', 'símasíðan (515) nær í dyrnar um api-ið');
});

test('félagalistinn: átta sýnileg, hin undir „Sýna hin N“; nafn án félags er texti, ekki tengill; linaHtml ber dyrnar efst', () => {
  const B = hlada511();
  const listi = Array.from({ length: 11 }, (_, i) => ({ nafn: 'Félag ' + i + ' <x>', auka: i ? '' : 'Síðast skoðað 2025-03-04', teg: 'felag', id: 100 + i, slod: '/#company/' + (100 + i),
    simi: i === 0 ? 'tel:+3545551234' : null, simanumer: i === 0 ? '555 1234' : null }));
  listi.push({ nafn: 'Horfið', auka: '', teg: null, id: 0, slod: null, simi: null });
  const h = B.snid.dyrHtml({ dyr: [], listi });
  assert.match(h, /12 félög — smelltu á nafn til að opna það/);
  assert.match(h, /<details><summary>Sýna hin 4<\/summary><ol start="9">/);
  assert.equal((h.match(/data-gatt="felag:\d+"/g) || []).length, 11);
  assert.match(h, /<span class="baf-dl-n baf-dl-x"[^>]*>Horfið<\/span>/);
  assert.match(h, /<a class="baf-dl-s" href="tel:\+3545551234"/);
  assert.ok(h.includes('Félag 0 &lt;x&gt;') && !h.includes('<x>'));
  const lina = B.snid.linaHtml({ tegund: 'verk', titill: 'X', created_at: '2026-01-01T00:00:00Z', dyr: [{ teg: 'mal', id: 1, heiti: 'Opna mál #1', slod: '/?mal=1#bord' }] });
  assert.ok(lina.indexOf('baf-dy') > -1 && lina.indexOf('baf-dy') < lina.indexOf('baf-strip'), 'dyrnar standa ofan við staðreyndalínuna');
});

/* ── Gáttin í appinu (521) ──────────────────────────────────────────────────────────────────────── */
function hlada521(yfir) {
  const kollud = [], hlustarar = {}, sagt = [];
  const stadur = { search: (yfir && yfir.search) || '', hash: '#bord', pathname: '/', get href() { return 'https://prufa.example/' + this.search + this.hash; } };
  const heimur = {
    console: { log() {}, warn() {} }, setTimeout: (f, ms) => setTimeout(f, Math.min(ms || 0, 5)), clearTimeout, URL, URLSearchParams, Date, Promise, Object, Number, String,
    location: stadur, history: { replaceState: (a, b, u) => { const x = new URL(u, 'https://prufa.example'); stadur.search = x.search; stadur.hash = x.hash; } },
    document: { readyState: 'complete', addEventListener: (n, f) => { hlustarar[n] = f; } },
    Toast: { show: (t) => sagt.push(t) }, App: { currentView: 'bord', switchView: (v) => kollud.push('switchView:' + v) },
    Bord368: { opnaMal: (id) => kollud.push('mal:' + id) }, _openCompanySafe: (id) => kollud.push('felag:' + id),
    OpnaSolu: { opna: async (id) => { kollud.push('sala:' + id); return { ok: id !== 404 }; } },
    KrofuVinnugluggi: { opnaSolu: (id) => kollud.push('krafa:' + id), opnaGleymt: (id) => kollud.push('gleymt:' + id) },
    Arsskodun: { openDetail: (id) => kollud.push('arsskodun:' + id) }, Verkspjald: { opna: (id) => kollud.push('verkbeidni:' + id) },
  };
  Object.assign(heimur, (yfir && yfir.heimur) || {});
  heimur.window = heimur;
  vm.runInNewContext(fs.readFileSync(path.join(ROT, 'js', 'patches', '521-gatt.js'), 'utf8'), heimur);
  return { G: heimur.Gatt, kollud, hlustarar, sagt, stadur, heimur };
}

test('Gatt.opna: hver tegund kallar á sitt opnunarfall; óþekkt tegund eða ógilt auðkenni gerir EKKERT', async () => {
  const { G, kollud, sagt } = hlada521();
  for (const t of ['mal', 'felag', 'sala', 'krafa', 'gleymt', 'arsskodun', 'verkbeidni']) assert.equal(await G.opna(t, 7), true, t);
  assert.deepEqual(kollud, ['mal:7', 'felag:7', 'sala:7', 'krafa:7', 'gleymt:7', 'arsskodun:7', 'verkbeidni:7']);
  for (const [t, id] of [['eyda', 7], ['constructor', 7], ['__proto__', 7], ['sala', 0], ['sala', -1], ['sala', '7;x'], ['sala', 1.5], ['', 7], [null, null]]) assert.equal(await G.opna(t, id), false, t + ':' + id);
  assert.equal(kollud.length, 7, 'ekkert opnunarfall kallað fyrir ógilt inntak');
  assert.equal(await G.opna('sala', 404), false); assert.deepEqual(sagt, [], 'OpnaSolu neitaði og sagði sjálft hvers vegna — Gáttin yfirskrifar skýringuna ekki');
  assert.deepEqual([G.slod('mal', 3), G.slod('felag', 4), G.slod('sala', 5)], ['/?mal=3#bord', '/#company/4', '/?opna=sala:5#bord']);
  assert.deepEqual([G.slod('sala', 5), G.slod('felag', 4), G.slod('mal', 3)], [D.slodFyrir('sala', 5), D.slodFyrir('felag', 4), D.slodFyrir('mal', 3)], 'sama slóðasnið og þjónninn býr til');
});

test('Gatt: /?opna=sala:12 við ræsingu opnar söluna og tekur færibreytuna úr slóðinni; rusl í slóð gerir ekkert', async () => {
  const a = hlada521({ search: '?opna=sala:12&x=1' });
  await new Promise((r) => setTimeout(r, 60));
  assert.deepEqual(a.kollud, ['sala:12']); assert.equal(a.stadur.search, '?x=1');
  for (const s of ['?opna=sala:abc', '?opna=eyda:5', '?opna=<script>', '?opna=sala:5:6', '']) {
    const b = hlada521({ search: s });
    await new Promise((r) => setTimeout(r, 40));
    assert.deepEqual(b.kollud, [], s);
  }
});

test('Gatt: smellur á data-gatt í appinu opnar færsluna á staðnum (engin endurhleðsla); annar smellur er látinn í friði', async () => {
  const { kollud, hlustarar } = hlada521();
  const smella = (gildi) => { const e = { stodvad: 0, preventDefault() { this.stodvad++; }, stopPropagation() {}, target: { closest: (s) => (gildi == null ? null : { getAttribute: () => gildi }) } }; hlustarar.click(e); return e.stodvad; };
  assert.equal(smella('krafa:501'), 1);
  await new Promise((r) => setTimeout(r, 30));
  assert.deepEqual(kollud, ['krafa:501']);
  // Þjónustuborðið (368) teiknar í opinni skuggarót: e.target er þá hýsillinn (#view-bord, án data-gatt) og takkinn sést
  // aðeins í composedPath()[0]. Án þess flakkaði tengillinn og appið endurhlóðst (rýni 18.11.2026).
  const iSkugga = { stodvad: 0, preventDefault() { this.stodvad++; }, stopPropagation() {}, target: { closest: () => null },
    composedPath: () => [{ closest: () => ({ getAttribute: () => 'mal:77' }) }, {}] };
  hlustarar.click(iSkugga);
  await new Promise((r) => setTimeout(r, 30));
  assert.equal(iSkugga.stodvad, 1, 'smellurinn er gripinn þótt takkinn sé í skuggarót');
  assert.deepEqual(kollud, ['krafa:501', 'mal:77']);
  for (const g of [null, 'krafa', 'eyda:5', 'krafa:x', 'krafa:5 onclick']) assert.equal(smella(g), 0, String(g));
  assert.equal(kollud.length, 2);
});

test('Gatt: opnunarfall sem hleðst seinna (búntarnir koma hver á eftir öðrum) er beðið eftir og svo kallað', async () => {
  const { G, kollud, heimur } = hlada521({ heimur: { Verkspjald: undefined } });
  const p = G.opna('verkbeidni', 9);
  await new Promise((r) => setTimeout(r, 30));
  assert.deepEqual(kollud, [], 'ekkert kallað á meðan fallið vantar');
  heimur.Verkspjald = { opna: (id) => kollud.push('verkbeidni:' + id) };   // búnturinn með 430 hlaðinn
  assert.equal(await p, true);
  assert.deepEqual(kollud, ['verkbeidni:9']);
});
