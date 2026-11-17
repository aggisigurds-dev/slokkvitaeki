// Próf: Afgreiðsla sendir NÝJAN póst (ekki svar) aðeins þegar verkið ber `nytt: true`; ágiskuð netföng standa sýnileg.
//   node --test test/afgreidsla-nyr-postur.test.cjs
// Það sem má ALDREI bila: póstur án þráðar og án `nytt: true` stöðvast áfram („Þráður óþekktur").
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const A = require('../netlify/functions/afgreidsla.cjs');

const grunnur = { account: 'eldklar@eldklar.is', to: ['vidtakandi@example.is'], subject: 'Úttektarskýrsla', texti: 'Góðan dag,\n\nMeðfylgjandi er skýrslan.\n\nKveðja' };

test('nýr póstur með nytt:true → engin þráðar-athugun stöðvar hann', async () => {
  const r = await A._athuga({ tegund: 'tolvupostur', gogn: Object.assign({ nytt: true }, grunnur) });
  assert.strictEqual(r.urelt, null);
  assert.ok(r.ok, JSON.stringify(r.athuganir));
  assert.ok(r.athuganir.some((x) => /Nýr póstur/.test(x.texti)));
});

test('póstur án þráðar og án nytt → stöðvast áfram (óbreytt regla)', async () => {
  const r = await A._athuga({ tegund: 'tolvupostur', gogn: Object.assign({}, grunnur) });
  assert.strictEqual(r.ok, false);
  assert.ok(r.athuganir.some((x) => /Þráður óþekktur/.test(x.texti) && x.ok === false));
});

test('nytt má ekki vera sannleiksgildi af öðrum toga (strengur "true") — aðeins true', async () => {
  const r = await A._athuga({ tegund: 'tolvupostur', gogn: Object.assign({ nytt: 'true' }, grunnur) });
  assert.strictEqual(r.ok, false);
});

test('ágiskað netfang birtist sem sýnileg athugun', async () => {
  const r = await A._athuga({ tegund: 'tolvupostur', gogn: Object.assign({ nytt: true, agiskun: ['Bokhald@Example.is'] }, grunnur) });
  assert.ok(r.ok);
  assert.ok(r.athuganir.some((x) => /ÁGISKUN/.test(x.texti) && /bokhald@example\.is/.test(x.texti)));
});

test('ófyllt eyða stöðvar nýjan póst eins og svar', async () => {
  const r = await A._athuga({ tegund: 'tolvupostur', gogn: Object.assign({}, grunnur, { nytt: true, texti: 'Afhending [DAGUR]' }) });
  assert.strictEqual(r.ok, false);
});
