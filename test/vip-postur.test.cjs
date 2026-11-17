// Próf: VIP-vaktlistinn (lota 8, 17.11.2026) — pörun sendanda við VIP-félag, „ósvarað“-reglan og klukkan.
//   node --test test/vip-postur.test.cjs
// Það sem má ALDREI bila: (1) svar í Sent slekkur klukkuna; (2) nafn í texta gerir póst ekki að VIP-pósti;
// (3) almenn lén (gmail …) og okkar eigin lén para aldrei; (4) hólf sem lesarinn segir fast er merkt óvíst, ekki „ósvarað“.
// Öll gögn hér eru tilbúin (example.is / example.com) — engin kúnnagögn í repóinu.
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const V = require('../netlify/functions/_vip-postur.cjs');
const F = require('../netlify/functions/vip-postur.cjs');

const RADIR = [
  { id: 10, nafn: 'Leiga - Höfuðstöðvar', kennitala: '111111-1111', netfang: 'skrifstofa@leiga.example.is, bokari@leiga.example.is', vip: true, vip_svartimi_min: 60 },
  { id: 11, nafn: 'Leiga - Stúdíó', kennitala: '111111-1111', netfang: 'skrifstofa@leiga.example.is', vip: true, vip_svartimi_min: 60 },
  { id: 20, nafn: 'Dekk, Dalvegur', kennitala: '2222222222', netfang: 'dekk@dekk.example.is', vip: true, vip_svartimi_min: 30 },
  { id: 21, nafn: 'Dekk, Dekkjalager', kennitala: '2222222222', netfang: 'jon@gmail.com', vip: true, vip_svartimi_min: 30 },
];
const TENGL = [
  { kennitala: '111111-1111', netfang: 'anna@leiga.example.is', len: 'leiga.example.is', status: 'approved' },
  { kennitala: '2222222222', netfang: 'ny@nyttlen.example.com', len: 'nyttlen.example.com', status: 'approved' },
  { kennitala: '2222222222', netfang: 'grunad@grunad.example.com', len: 'grunad.example.com', status: 'pending' },
];
const visir = V.byggjaVisi(RADIR, TENGL);
const NU = new Date('2026-11-17T10:00:00Z');
let seq = 1;
const inn = (o) => Object.assign({ id: seq++, message_id: '<m' + seq + '@x>', account: 'eldklar@eldklar.is', folder: 'INBOX', thread_id: 't1', sender_name: 'Anna', sender_email: 'anna@leiga.example.is', subject: 'Spurning', body_preview: 'Halló', received_at: '2026-11-17T09:30:00Z', labels: [] }, o);

test('félög: eitt á kennitölu, heiti = sameiginlegt upphaf, klippt að orðabili', () => {
  const n = visir.felog.map((f) => f.nafn).sort();
  assert.deepStrictEqual(n, ['Dekk', 'Leiga']);
  assert.strictEqual(visir.felog.find((f) => f.nafn === 'Dekk').svartimi, 30);
});

test('pörun: nákvæmt netfang, lén félags, lén úr samþykktum tengilið, kennitala í texta', () => {
  assert.strictEqual(V.para(inn({ sender_email: 'bokari@leiga.example.is' }), visir).hvernig, 'netfang');
  assert.strictEqual(V.para(inn({ sender_email: 'nyr.starfsmadur@leiga.example.is' }), visir).hvernig, 'lén');
  assert.strictEqual(V.para(inn({ sender_email: 'x@nyttlen.example.com' }), visir).felag.nafn, 'Dekk');
  const kt = V.para(inn({ sender_email: 'someone@annad.example.com', subject: 'Vegna kt. 222222-2222' }), visir);
  assert.strictEqual(kt.hvernig, 'kennitala');
});

test('rekstrarfélag: póstur af léni félagsins er VIP þótt staðurinn hafi annan greiðanda', () => {
  const r = V.para(inn({ sender_email: 'umsjon@leiga.example.is', subject: 'Íbúðir við Dæmigötu — reikningur á húsfélagið' }), visir);
  assert.ok(r && r.felag.nafn === 'Leiga');
});

test('pörun ALDREI: nafn í texta, almennt lén (gmail), okkar eigin lén, ósamþykktur tengiliður', () => {
  assert.strictEqual(V.para(inn({ sender_email: 'birgir@annad.example.com', subject: 'Reikningur vegna Leiga - Höfuðstöðvar' }), visir), null);
  assert.strictEqual(V.para(inn({ sender_email: 'einhver@gmail.com' }), visir), null, 'gmail.com af jon@gmail.com má ekki verða lén félagsins');
  assert.ok(V.para(inn({ sender_email: 'jon@gmail.com' }), visir), 'en nákvæma netfangið parar');
  assert.strictEqual(V.para(inn({ sender_email: 'agnar@eldklar.is', subject: 'kt 111111-1111' }), visir), null);
  assert.strictEqual(V.para(inn({ sender_email: 'a@grunad.example.com' }), visir), null);
});

test('klukka: grænt < 40 mín, gult 40–59, rautt ≥ 60; svartími félags gildir', () => {
  const k = (min, sv) => V.klukka(new Date(NU.getTime() - min * 60000).toISOString(), NU, sv).litur;
  assert.strictEqual(k(0), 'graent'); assert.strictEqual(k(39), 'graent');
  assert.strictEqual(k(40), 'gult'); assert.strictEqual(k(59), 'gult');
  assert.strictEqual(k(60), 'rautt'); assert.strictEqual(k(600), 'rautt');
  assert.strictEqual(k(19, 30), 'graent'); assert.strictEqual(k(20, 30), 'gult'); assert.strictEqual(k(30, 30), 'rautt');
  assert.strictEqual(V.lengd(5), '5 mín.'); assert.strictEqual(V.lengd(65), '1 klst. 5 mín.'); assert.strictEqual(V.lengd(3000), '2 d.');
});

test('ósvarað: aðeins VIP-þræðir; svar í Sent slekkur klukkuna', () => {
  const a = inn({ thread_id: 'tA' }), b = inn({ thread_id: 'tB', sender_email: 'annar@ovip.example.com' });
  const sent = { id: 5000, folder: 'SENT', account: 'eldklar@eldklar.is', thread_id: 'tA', sender_email: 'eldklar@eldklar.is', to_addresses: 'anna@leiga.example.is', received_at: '2026-11-17T09:45:00Z' };
  const an = V.thraedir([a, b], {}, visir, NU);
  assert.strictEqual(an.length, 1); assert.strictEqual(an[0].bidur, true); assert.strictEqual(an[0].litur, 'graent'); assert.strictEqual(an[0].min, 30);
  const med = V.thraedir([a, b, sent], {}, visir, NU);
  assert.strictEqual(med[0].bidur, false);
});

test('ósvarað: svar til sendandans úr hólfi án thread_id slekkur líka; eldra svar gerir það ekki', () => {
  const a = inn({ account: 'slokkvitaeki@brunaholf.is', thread_id: null });
  const seinna = { id: 5001, folder: 'SENT', account: 'slokkvitaeki@brunaholf.is', thread_id: null, sender_email: 'slokkvitaeki@brunaholf.is', to_addresses: 'Anna <anna@leiga.example.is>', received_at: '2026-11-17T09:50:00Z', subject: 'Annað efni' };
  const fyrr = Object.assign({}, seinna, { id: 5002, received_at: '2026-11-17T08:00:00Z' });
  assert.strictEqual(V.thraedir([a, fyrr], {}, visir, NU)[0].bidur, true);
  assert.strictEqual(V.thraedir([a, fyrr, seinna], {}, visir, NU)[0].bidur, false);
});

test('ósvarað: svarað-skráning, svarad_at á máli, mál lokað eftir póstinn, 🟢 Lokið, falið', () => {
  const a = inn({ id: 900 });
  const r = (ctx, x) => V.thraedir([x || a], ctx, visir, NU)[0].bidur;
  assert.strictEqual(r({ activity: new Set([a.message_id]) }), false);
  assert.strictEqual(r({ mal: new Map([['900', { id: 1, svarad_at: '2026-11-17T09:40:00Z' }]]) }), false);
  assert.strictEqual(r({ mal: new Map([['900', { id: 1, svarad_at: '2026-11-17T09:00:00Z' }]]) }), true, 'svar á undan póstinum telst ekki');
  assert.strictEqual(r({ mal: new Map([['900', { id: 1, status: 'lokad', updated_at: '2026-11-17T09:35:00Z' }]]) }), false);
  assert.strictEqual(r({}, inn({ labels: ['🟢 Lokið'] })), false);
  assert.strictEqual(r({ falid: new Set([a.message_id]) }), false);
});

test('ósvarað: sjálfvirkur sendandi og reikningur frá birgi bíða ekki svars', () => {
  assert.strictEqual(V.thraedir([inn({ sender_email: 'noreply@leiga.example.is' })], {}, visir, NU)[0].bidur, false);
  assert.strictEqual(V.thraedir([inn({ subject: 'Reikningur nr 4411' })], {}, visir, NU)[0].bidur, false);
  assert.strictEqual(V.thraedir([inn({ subject: 'Re: Reikningur nr 4411' })], {}, visir, NU)[0].bidur, true, 'svar um reikning er spurning til okkar');
});

test('þráður erfir VIP: svar frá gmail í þræði sem VIP-félag hóf', () => {
  const a = inn({ thread_id: 'tC', received_at: '2026-11-17T08:00:00Z' });
  const b = inn({ thread_id: 'tC', sender_email: 'gestur@gmail.com', received_at: '2026-11-17T09:00:00Z' });
  const t = V.thraedir([a, b], {}, visir, NU)[0];
  assert.ok(t.bidur); assert.match(t.hvernig, /þráður/); assert.strictEqual(t.fra, 'gestur@gmail.com');
});

test('óvíst hólf: lesari segir slokkvitaeki@ fast → merkt óvíst, Gmail í lagi', () => {
  const nu = new Date('2026-11-17T04:00:00Z');
  const o = F._ovisstHolf([
    { lesari: 'gmail-ingest', sidast: '2026-11-17T02:35:00Z', stada: 'ok' },
    { lesari: 'luna-bridge', sidast: '2026-11-17T03:55:00Z', stada: 'error', skilabod: '0 ný í þessari keyrslu. FÖST PÓSTHÓLF: slokkvitaeki@brunaholf.is (ekkert nýtt í 85 klst).' },
  ], [{ holf: 'slokkvitaeki@brunaholf.is', sidast_lesid: '2026-11-16T00:01:47Z' }], nu);
  assert.ok(o['slokkvitaeki@brunaholf.is'] && /fast/.test(o['slokkvitaeki@brunaholf.is']));
  assert.strictEqual(o['eldklar@eldklar.is'], undefined);
  const t = V.thraedir([inn({ account: 'slokkvitaeki@brunaholf.is', thread_id: null })], { ovisst: o }, visir, nu)[0];
  assert.ok(t.bidur && t.ovisst);
  const engin = F._ovisstHolf([], [], nu);
  assert.ok(engin['eldklar@eldklar.is'], 'enginn gmail-ingest í 3 klst. → Gmail-hólfin óviss');
});
