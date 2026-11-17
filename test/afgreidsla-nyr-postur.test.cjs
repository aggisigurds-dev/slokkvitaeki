// Próf: Afgreiðsla sendir NÝJAN póst (ekki svar) aðeins þegar verkið ber `nytt: true` OG ekkert svar_vid; ágiskuð netföng
// stöðva þar til þau eru staðfest; hvert netfang í to/cc þarf uppruna.
//   node --test test/afgreidsla-nyr-postur.test.cjs
// Það sem má ALDREI bila:
//   · póstur án þráðar og án `nytt: true` stöðvast áfram („Þráður óþekktur");
//   · `nytt: true` á pósti sem ber svar_vid (svar án þráðar) stöðvast — nytt opnar ekki leið framhjá reglu 1 (kóðarýni 17.11.2026);
//   · óstaðfest ágiskun er RAUÐ (ok:false), ekki grænt ✓;
//   · netfang án uppruna sem er ekki merkt ágiskun stöðvar líka.
// Uppflettingunni (email_digest / fyrirtaeki / charlize_contacts) er skipt út — engin gagnagrunnstenging í prófum.
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const A = require('../netlify/functions/afgreidsla.cjs');

const THEKKT = { 'vidtakandi@example.is': 'í pósti', 'annar@example.is': 'í fyrirtækjaskrá' };
A._setjaUppruna(async (e) => THEKKT[e] || null);

const grunnur = { account: 'eldklar@eldklar.is', to: ['vidtakandi@example.is'], subject: 'Úttektarskýrsla', texti: 'Góðan dag,\n\nMeðfylgjandi er skýrslan.\n\nKveðja' };
const ath = (g) => A._athuga({ tegund: 'tolvupostur', gogn: Object.assign({}, grunnur, g) });
const finnaTexta = (r, re) => r.athuganir.find((x) => re.test(x.texti));

test('nýr póstur með nytt:true og ekkert svar_vid → engin þráðar-athugun stöðvar hann', async () => {
  const r = await ath({ nytt: true });
  assert.strictEqual(r.urelt, null);
  assert.ok(r.ok, JSON.stringify(r.athuganir));
  assert.ok(finnaTexta(r, /Nýr póstur/));
});

test('póstur án þráðar og án nytt → stöðvast áfram (óbreytt regla)', async () => {
  const r = await ath({});
  assert.strictEqual(r.ok, false);
  assert.ok(r.athuganir.some((x) => /Þráður óþekktur/.test(x.texti) && x.ok === false));
});

test('nytt:true en svar_vid sett (svar án þráðar, „Re:“) → stöðvast, ekkert sent', async () => {
  for (const sv of [{ message_id: '<a@b>' }, { digest_id: 44 }, { thread_id: 't1' }]) {
    const r = await ath({ nytt: true, subject: 'Re: Reikningur', svar_vid: sv });
    assert.strictEqual(r.ok, false, JSON.stringify(sv));
    assert.ok(r.athuganir.some((x) => /svar_vid/.test(x.texti) && x.ok === false), JSON.stringify(r.athuganir));
  }
});

test('nytt má ekki vera sannleiksgildi af öðrum toga (strengur "true") — aðeins true', async () => {
  const r = await ath({ nytt: 'true' });
  assert.strictEqual(r.ok, false);
});

test('óstaðfest ágiskun er RAUÐ og ber netfangið (fyrir takkana); staðfest ágiskun er græn', async () => {
  const r = await ath({ nytt: true, cc: ['Bokhald@Example.is'], agiskun: ['bokhald@example.is'] });
  assert.strictEqual(r.ok, false);
  const a = finnaTexta(r, /ÁGISKUN/);
  assert.ok(a && a.ok === false && a.agiskun === 'bokhald@example.is', JSON.stringify(r.athuganir));
  const s = await ath({ nytt: true, cc: ['bokhald@example.is'], agiskun: ['bokhald@example.is'], agiskun_stadfest: [{ netfang: 'bokhald@example.is', af: 'Agnar', at: '2026-11-17T09:00:00Z' }] });
  assert.ok(s.ok, JSON.stringify(s.athuganir));
  assert.ok(finnaTexta(s, /staðfest af Agnar/));
});

test('ágiskun tekin út: netfangið farið úr cc og agiskun → sendist án þess', async () => {
  const r = await ath({ nytt: true, cc: [], agiskun: [] });
  assert.ok(r.ok);
});

test('netfang í to/cc án uppruna og EKKI merkt ágiskun → stöðvar (gatið sem rýnin fann)', async () => {
  const r = await ath({ nytt: true, cc: ['laumulegt@ovist.example.com'] });
  assert.strictEqual(r.ok, false);
  assert.ok(r.athuganir.some((x) => /laumulegt@ovist\.example\.com/.test(x.texti) && /hvorki í pósti/.test(x.texti) && x.ok === false));
});

test('skráð heimild á verkinu dugar sem uppruni og er sýnd orðrétt; þekkt netföng talin saman', async () => {
  const r = await ath({ nytt: true, to: ['vefur@felag.example.is'], cc: ['annar@example.is'], heimildir_netfanga: { 'vefur@felag.example.is': 'Birt á vef félagsins' } });
  assert.ok(r.ok, JSON.stringify(r.athuganir));
  assert.ok(finnaTexta(r, /heimild skráð á verkið: Birt á vef félagsins/));
  assert.ok(finnaTexta(r, /Viðtakendur með uppruna: annar@example\.is \(í fyrirtækjaskrá\)/));
});

test('uppfletting bregst → stöðvar („Náði ekki að fletta upp“), aldrei opið', async () => {
  A._setjaUppruna(async () => { throw new Error('net'); });
  try {
    const r = await ath({ nytt: true });
    assert.strictEqual(r.ok, false);
    assert.ok(finnaTexta(r, /Náði ekki að fletta upp/));
  } finally { A._setjaUppruna(async (e) => THEKKT[e] || null); }
});

test('ófyllt eyða stöðvar nýjan póst eins og svar', async () => {
  const r = await ath({ nytt: true, texti: 'Afhending [DAGUR]' });
  assert.strictEqual(r.ok, false);
});
