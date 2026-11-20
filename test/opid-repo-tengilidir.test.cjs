// Opið repó: engin netföng eða símanúmer einstaklinga í agent-skrám rekstrarfélaganna (lota 9 umferð 2, 17.11.2026,
// Verkefnalisti 219523ff). Kerfisrýni 15.11 (PR #978) fann 8+2 netföng og 4+4 símanúmeralínur í heimaleiga.md og
// center-hotel.md — repóið er opinbert. Gögnin eru í kúnnaminni (charlize_knowledge #2673, #2674); skrárnar vísa þangað.
// Leyfð eru aðeins sameiginleg hlutverkahólf (reikningar@, bokhald@, info@ …) og okkar eigin netföng.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const SKRAR = ['.claude/agents/heimaleiga.md', '.claude/agents/center-hotel.md'];
const LEYFD = /^(reikningar|bokhald|info|sala|reservations|postur|eldklar|slokkvitaeki|noreply|no-reply)@/i;

function brot(texti) {
  const ut = [];
  for (const m of texti.matchAll(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[a-z]{2,}/g)) if (!LEYFD.test(m[0])) ut.push('netfang ' + m[0]);
  for (const m of texti.matchAll(/(?<![\w-])[a-z][a-z.]{1,20}@(?=[\s,;)/]|$)/gm)) if (!LEYFD.test(m[0])) ut.push('stytt netfang ' + m[0]);
  for (const m of texti.matchAll(/(?<![\d.-])(?:\+354[ -]?)?[4-8]\d{2}[ -]?\d{4}(?![\d.-])/g)) ut.push('sími ' + m[0]);
  return ut;
}

for (const s of SKRAR) {
  test(s + ': engin netföng eða símanúmer einstaklinga', () => {
    assert.deepStrictEqual(brot(fs.readFileSync(path.join(__dirname, '..', s), 'utf8')), []);
  });
}

test('prófið grípur netfang, stytt netfang og símanúmer einstaklings', () => {
  assert.deepStrictEqual(brot('**Jón** (jon@daemi.is, 696 3636)'), ['netfang jon@daemi.is', 'sími 696 3636']);
  assert.deepStrictEqual(brot('sjálfgefið jon@ eins og aðrir'), ['stytt netfang jon@']);
  assert.deepStrictEqual(brot('reikningar@eignaumsjon.is og kt 540119-0660, R-107527'), []);
});
