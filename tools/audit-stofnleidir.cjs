#!/usr/bin/env node
/* Öryggisnet — allar leiðir sem STOFNA fyrirtæki verða að vera sammála (2026-09-30).
 *
 * Agnar: „finna alla takka sem hægt er að stofna fyrirtæki og ath hvort allir
 * virka rétt og skrá fyrirtæki með customer id … lendi einstaka sinnum í
 * einhverju id bulli" · „raun best að finna alla takka sem eiga að gera það
 * sama og bera þá saman og samræma."
 *
 * TÍU staðir í appinu setja inn í `fyrirtaeki`, og þeir eru EKKI sammála um
 * hvað ný röð þarf að bera. Mælt 30.09.2026:
 *
 *   customer_base_id   6 af 10 setja hann — features.js (venjulega vistunin!),
 *                      fixcompanysave, 147 og 151 gera það ekki
 *   stadur_nr          2 af 10 (175 og pos.js)
 *
 * HVAÐ ÞETTA KOSTAR: `document_pairs` er lyklað á customer_base_id. Félag án
 * hans getur ekki parað skýrslu við reikning og „🔗 Tengja" virðist gera
 * ekkert — nákvæmlega bilunin sem fannst á Álftamýri 29.09.
 *
 * HEIÐARLEG TAKMÖRKUN, MÆLD: þetta er EKKI að gerast á nýjum félögum í dag.
 * 82 félög stofnuð frá 01.09.2026 eiga öll sitt base_id; þau 19 sem vantar
 * hann eru frá maí–júlí og bera ÖLL enga kennitölu — og án kennitölu er engin
 * grunnröð til að benda á. Vörðurinn er því varnarlína, ekki viðbragð við
 * núverandi leka. Hann fellur þegar NÝ stofnleið bætist við sem hunsar reitinn.
 *
 * Aðeins lestur. Ekkert net.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
function fail(msg) { console.log('RED: ' + msg); process.exit(1); }

// Hve margar línur á undan innsetningunni teljast til hennar (þar er hluturinn byggður).
const SAMHENGI = 46;

// Leiðir sem MEGA sleppa base_id, hver með mældri ástæðu.
const UNDANTHEGNAR = {
  'js/fixcompanysave.js': 'eldra afrit af Companies.save — sama vistun, sami hlutur',
};

function finnaInnsetningar() {
  const ut = [];
  (function ganga(d) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) { if (!/node_modules|\.git|dist/.test(p)) ganga(p); continue; }
      if (!e.name.endsWith('.js')) continue;
      const src = fs.readFileSync(p, 'utf8');
      const re = /from\(\s*['"]fyrirtaeki['"]\s*\)\s*\.insert\(/g;
      let m;
      while ((m = re.exec(src))) {
        const lina = src.slice(0, m.index).split('\n').length;
        const linur = src.split('\n');
        const blokk = linur.slice(Math.max(0, lina - SAMHENGI), lina + 8).join('\n');
        ut.push({
          skra: path.relative(ROOT, p).replace(/\\/g, '/'),
          lina,
          base: /customer_base_id/.test(blokk),
          kt: /kennitala/.test(blokk),
        });
      }
    }
  })(path.join(ROOT, 'js'));
  return ut;
}

const leidir = finnaInnsetningar();
if (!leidir.length) fail('fann enga innsetningu í `fyrirtaeki` — hefur leitin bilað?');

console.log('   ' + leidir.length + ' leiðir stofna fyrirtæki:');
leidir.forEach((l) => console.log('     ' + (l.base ? '·' : '✗') + ' ' +
  (l.skra.split('/').pop() + ':' + l.lina).padEnd(40) +
  'base_id ' + (l.base ? 'JÁ ' : 'NEI') + ' · kt ' + (l.kt ? 'JÁ' : 'NEI')));

const vantar = leidir.filter((l) => !l.base && !UNDANTHEGNAR[l.skra]);

// BASELINE: leiðirnar þrjár sem vantaði base_id 30.09.2026. Þær eru
// EFTIRSTÖÐULISTI, ekki samþykki — lækkaðu töluna þegar hver er samræmd.
//   js/features.js                          venjulega „vista fyrirtæki"
//   js/patches/147-brunakerfi.js            nýr staður í brunakerfi
//   js/patches/151-brunakerfi-doc-import.js skjalainnflutningur
const BASELINE = 3;

if (vantar.length > BASELINE) {
  vantar.forEach((l) => console.log('     ❗ ' + l.skra + ':' + l.lina + ' setur ekki customer_base_id'));
  fail('NÝ stofnleið setur ekki customer_base_id (' + vantar.length + ' > ' + BASELINE + '). ' +
    'Félag án grunns getur ekki parað skýrslu við reikning — „Tengja" virðist þá gera ekkert.');
}

console.log('✅ GRÆNT stofnleiðir: ' + leidir.length + ' leiðir · ' + vantar.length +
  ' án base_id (<= eftirstöðulisti ' + BASELINE + ') · engin NÝ bættist við.');
