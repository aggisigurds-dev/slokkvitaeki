// Próf: Pósthólfa-stikan (522) og þjónninn hennar (/api/postholf), 19.11.2026.
//   node --test test/postholf.test.cjs
//
// AF HVERJU (Agnar 19.11.2026): „maður þarf kannski að hafa litla stiku sem sýnir hvenær var lesið úr hverju póstfangi
// og hvort virki. Og refresh á þeim.“ Það sem má ALDREI bila:
//   1. „lesið“ er mælt á KEYRSLUM lesarans, ekki á póstinum. email_digest.fetched_at hækkar aðeins þegar nýtt skeyti
//      kemur, svo hólf sem er lesið á kortersfresti en fær engan póst leit út eins og það hefði legið ólesið í tvo
//      daga — þannig stóð „⚠ slokkvitaeki@ ólesið síðan 17.11“ á borðinu þótt lesarinn hefði keyrt 140 sinnum;
//   2. ↻ stendur AÐEINS á hólfum sem hægt er að lesa héðan (Gmail í skýinu). Takki sem gerir ekkert er verri en enginn;
//   3. endurlestur krefst innskráningar — hann sogar póst inn í grunninn;
//   4. stikan þegir aldrei um bilun: lesari sem er hættur að keyra fær rautt ljós og skýringu.
// Öll gögn eru tilbúin (repóið er opinbert).
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROT = path.join(__dirname, '..');
const lesa = (s) => fs.readFileSync(path.join(ROT, s), 'utf8').replace(/\r\n/g, '\n');
const F = require('../netlify/functions/postholf.cjs');

const NU = new Date('2026-11-19T15:00:00Z');
const keyrsla = (job, source, minSidan, detail, status) => ({ job_name: job, source, status: status || 'success',
  started_at: new Date(NU.getTime() - minSidan * 60000).toISOString(), detail });
const BRIDGE = '0 ný í þessari keyrslu (bokhald@brunaholf.is:0, Brunaholf@brunaholf.is:2, eldklar@eldklar.is:0, slokkvitaeki@brunaholf.is:0, bokhald@eldklar.is:0).';

test('hólfalistinn: Gmail-hólfin ein fá endurlestur', () => {
  const g = F.HOLF.filter((h) => h.endurlestur).map((h) => h.holf);
  assert.deepEqual(g, ['eldklar@eldklar.is', 'bokhald@eldklar.is'], 'aðeins hólfin sem skýið les');
  for (const h of F.HOLF.filter((x) => !x.endurlestur)) assert.equal(h.lesari, 'luna-bridge', h.holf + ' er lesið á vélunum');
  assert.ok(F.HOLF.every((h) => h.stytt && h.hlutverk && h.bil_min > 0));
});

test('„lesið“ kemur úr keyrslum lesarans — ekki úr póstinum', () => {
  const h = F.HOLF.find((x) => x.holf === 'slokkvitaeki@brunaholf.is');
  // Hólfið fékk engan póst í tvo daga en lesarinn keyrði fyrir einni mínútu og nefnir það.
  const les = F._lesidUr([keyrsla('luna-bridge', 'luna-bridge:DESKTOP-M5FO3I6', 1, BRIDGE)], h);
  assert.equal(les.nefnt, true, 'hólfið er nefnt í keyrslunni');
  assert.equal(les.vel, 'DESKTOP-M5FO3I6', 'vélarheitið er hreinsað af forskeytinu');
  // Keyrsla sem brást má ekki telja sem lestur; sú næsta á undan sem heppnaðist gildir.
  const blandad = [keyrsla('luna-bridge', 'luna-bridge:skrifstofa', 1, BRIDGE, 'error'), keyrsla('luna-bridge', 'luna-bridge:skrifstofa', 20, BRIDGE)];
  assert.equal(Math.round((NU - Date.parse(F._lesidUr(blandad, h).at)) / 60000), 20);
  // Enginn lesari: ekkert svar, og þá segir stikan frá því (sjá næsta próf).
  assert.equal(F._lesidUr([], h), null);
  // Keyrsla annars lesara telst ekki.
  assert.equal(F._lesidUr([keyrsla('gmail-ingest', 'schedule', 1, 'eldklar@eldklar.is')], h), null);
});

test('þrjú þrep, mæld á bilinu sem lesarinn á að keyra á', async () => {
  const P = require('../netlify/functions/_portal.cjs');
  const upphaflegt = P.sbGet;
  // sbGet skilar RESPONSE, ekki röðum. Fyrsta útgáfan gleymdi .json() og stikan varð öll rauð í loftinu þótt prófið
  // væri grænt — af því að prófið hermdi eftir röðum. Hermunin er því Response-lík, eins og alvaran.
  const svar = (keyrslur) => (qs) => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(/automation_runs/.test(qs) ? keyrslur : []) });
  try {
    // luna-bridge á 15 mín. fresti: 10 mín. = í lagi, 40 mín. = seinn, 5 klst. = villa.
    for (const [min, vaent] of [[10, 'ok'], [40, 'seinn'], [300, 'villa']]) {
      P.sbGet = svar([keyrsla('luna-bridge', 'luna-bridge:skrifstofa', min, BRIDGE)]);
      const r = await F._stada(NU);
      const h = r.holf.find((x) => x.holf === 'slokkvitaeki@brunaholf.is');
      assert.equal(h.stada, vaent, min + ' mín. → ' + vaent);
      assert.ok(h.skyring.length > 10, 'skýringin fylgir alltaf');
      // Gmail-hólfin bera sama mælikvarða en sitt eigið bil (120 mín.) og eiga engan luna-bridge-lestur hér.
      assert.equal(r.holf.find((x) => x.holf === 'eldklar@eldklar.is').stada, 'villa', 'enginn gmail-ingest → rautt');
    }
    P.sbGet = svar([]);
    const tomt = await F._stada(NU);
    assert.ok(tomt.holf.every((h) => h.stada === 'villa' && h.lesid_at === null), 'engin keyrsla = rautt á öllum, aldrei þögn');
  } finally { P.sbGet = upphaflegt; }
});

test('stikan (522): ljós, ↻ aðeins þar sem það virkar, og smellir skila sér', () => {
  const heimur = { console, setTimeout, clearTimeout, fetch: () => new Promise(() => {}), document: { createElement: () => ({}) } };
  heimur.window = heimur;
  vm.runInNewContext(lesa('js/patches/522-postholf.js'), heimur);
  const PH = heimur.Postholf;
  PH.S.sott = true; PH.S.at = Date.now();
  PH.S.gogn = { holf: [
    { holf: 'eldklar@eldklar.is', stytt: 'eldklar@', hlutverk: 'Aðalhólf', lesari: 'gmail-ingest', bil_min: 120, endurlestur: true, lesid_at: '2026-11-19T14:35:00Z', lesid_min: 25, vel: 'schedule', nyjasti_postur: '2026-11-19T13:53:00Z', sidasta_solarhring: 7, stada: 'ok', skyring: 'Lesið reglulega' },
    { holf: 'slokkvitaeki@brunaholf.is', stytt: 'slokkvitaeki@', hlutverk: 'Útköll', lesari: 'luna-bridge', bil_min: 15, endurlestur: false, lesid_at: '2026-11-19T14:59:00Z', lesid_min: 1, vel: 'skrifstofa', nyjasti_postur: null, sidasta_solarhring: 0, stada: 'villa', skyring: 'Lesarinn þegir' },
  ], lesarar: [] };
  const h = PH.html();
  assert.match(h, /data-t5="ph-lesa" data-h="eldklar@eldklar\.is"/, 'Gmail-hólfið fær ↻');
  assert.ok(!/data-t5="ph-lesa" data-h="slokkvitaeki@brunaholf\.is"/.test(h), 'Thunderbird-hólfið fær ENGAN ↻');
  assert.match(h, /data-s="villa"/, 'rautt ljós á hólfinu sem þegir');
  assert.match(h, /class="ph _vand"/, 'stikan sjálf merkir að eitthvað sé að');
  assert.match(h, /ph-t">14:35</, 'tíminn sem lesarinn las, ekki tími póstsins');
  // Smellur opnar smáatriðin og lokar þeim aftur; sami smellur fer aldrei til 368.
  const fals = (a, hh) => ({ getAttribute: (n) => (n === 'data-t5' ? a : n === 'data-h' ? hh : null) });
  assert.equal(PH.smellur(fals('ph-opna', 'slokkvitaeki@brunaholf.is')), true);
  assert.equal(PH.S.opid, 'slokkvitaeki@brunaholf.is');
  const opid = PH.html();
  assert.match(opid, /luna-bridge á skrifstofa · á 15 mín\. fresti/);
  assert.match(opid, /lesið af luna-bridge á vélunum þínum/, 'sagt hvers vegna ekkert ↻ er');
  assert.match(opid, /enginn skráður/, 'enginn póstur er sagður enginn póstur, ekki „?“');
  assert.equal(PH.smellur(fals('ph-opna', 'slokkvitaeki@brunaholf.is')), true);
  assert.equal(PH.S.opid, null);
  assert.equal(PH.smellur(fals('eitthvad-annad', '')), false, 'annarra manna smellir fara áfram');
});

test('368 teiknar stikuna og sendir ph-smelli áfram; endurlestur krefst innskráningar', () => {
  const t = lesa('js/patches/368-thjonustubord5.js');
  assert.match(t, /window\.Postholf \? Postholf\.html\(\) : ''/);
  assert.match(t, /a\.indexOf\('ph-'\) === 0 && window\.Postholf/);
  const s = lesa('netlify/functions/postholf.cjs');
  assert.match(s, /const g = await H\.krefjastStarfsmanns\(event\);/, 'POST (endurlestur) er bak við innskráningu');
  assert.match(s, /if \(event\.httpMethod === 'GET'\)[\s\S]{0,200}stada\(new Date\(\)\)/, 'GET er aðeins lestur');
  assert.match(s, /if \(!h\.endurlestur\) return P\.json\(400/, 'þjónninn neitar líka — ekki bara viðmótið');
  assert.match(lesa('index.html'), /522-postholf\.js\?v=/, 'skráin er hlaðin af síðunni');
});
