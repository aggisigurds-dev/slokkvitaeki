/* Vinnusamantekt (489): raðirnar flæða í dálka og langur punktalisti brotnar saman (18.11.2026).
 * Agnar, með skjáskot af auðum flötum á Þjónustuborðinu: „geturðu raðað þessu eitthvað betur“.
 * Mælt á 1920 px skjá: 1.751 px → 1.054 px, allir fimm dálkar fylltir. */
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const SRC = fs.readFileSync(path.join(__dirname, '..', 'js', 'patches', '489-vinnusamantekt.js'), 'utf8');

test('útlit: hóparnir eru ekki lengur grid-reitir heldur dálkaflæði sem brýtur aldrei röð', () => {
  assert.ok(/'\.vs-grid\{columns:330px;column-gap:0;column-rule:[^}]+\}'/.test(SRC), '.vs-grid á að flæða í dálka');
  assert.ok(!/\.vs-grid\{display:grid/.test(SRC), 'gamla grid-reglan má ekki standa — hún teygði alla hópa í hæð þess hæsta');
  assert.ok(/\.vs-r\{[^}]*break-inside:avoid[^}]*\}/.test(SRC), 'röð má aldrei brotna milli dálka');
  assert.ok(/\.vs-g>h3\{[^}]*break-after:avoid[^}]*\}/.test(SRC), 'fyrirsögn hóps fylgir fyrstu röð sinni');
  // Sími: reglurnar fyrir ≤ 760 px standa óbreyttar (einn dálkur kemur af sjálfu sér, 330 px passar ekki tvisvar).
  assert.ok(/@media \(max-width:760px\)\{\.vs-n\{margin-left:0/.test(SRC), 'símareglurnar eiga að standa');
});

// radHtml dregið úr skránni og keyrt með lágmarksumhverfi.
function radHtmlFall(opna) {
  const esc = SRC.match(/^\s*const esc = [^\n]*$/m);
  const sev = SRC.match(/^\s*const SEV = [^\n]*$/m);
  const hamark = SRC.match(/^\s*const PUNKTA_HAMARK = [^\n]*$/m);
  const fall = SRC.match(/function radHtml\(m, r, falinn, mj\) \{[\s\S]*?\n  \}/);
  assert.ok(esc && sev && hamark && fall, 'náði ekki esc/SEV/PUNKTA_HAMARK/radHtml úr 489');
  return new Function('S', 'window', esc[0] + '\n' + sev[0] + '\n' + hamark[0] + '\n' + fall[0] + '\nreturn radHtml;')({ opna: opna || {} }, {});
}
const M = { id: 'verkferli', heiti: 'Verkferli tilbúin til keyrslu', slod: {} };
const rod = (n) => ({ sev: 'upp', tala: n + ' ferli', undir: 'án skýrslu', punktar: Array.from({ length: n }, (_, i) => ({ feitt: 'Ferli ' + (i + 1), texti: ' · lýsing' })) });
const fjoldi = (h) => (h.match(/<li><strong>/g) || []).length;

test('langur punktalisti: breiður skjár sýnir fjóra og hnapp sem opnar alla', () => {
  const h = radHtmlFall()(M, rod(13), false, false);
  assert.strictEqual(fjoldi(h), 4, 'aðeins fyrstu fjórir punktarnir');
  assert.ok(h.includes('Ferli 4') && !h.includes('Ferli 5<'), h.slice(0, 200));
  assert.match(h, /<li class="vs-meira"><button type="button" class="vs-fl" data-t5="vs-rad" data-id="verkferli" aria-expanded="false">▸ Sýna alla 13<\/button><\/li>/);
});

test('langur punktalisti: opnaður sýnir alla og hnappurinn býður að fækka', () => {
  const h = radHtmlFall({ verkferli: true })(M, rod(13), false, false);
  assert.strictEqual(fjoldi(h), 13);
  assert.match(h, /aria-expanded="true">▾ Sýna færri<\/button>/);
});

test('stuttur listi (≤ 6) er óbreyttur: allir punktar, enginn hnappur', () => {
  for (const n of [0, 1, 5, 6]) {
    const h = radHtmlFall()(M, rod(n), false, false);
    assert.strictEqual(fjoldi(h), n, n + ' punktar');
    assert.ok(!h.includes('vs-meira'), n + ' punktar eiga ekki að fá hnapp');
  }
  // 7 er fyrsti fjöldinn sem brotnar saman.
  assert.strictEqual(fjoldi(radHtmlFall()(M, rod(7), false, false)), 4);
});

test('sími: óbreytt — lokuð röð sýnir enga punkta, opin sýnir ALLA og engan „Sýna alla“-hnapp', () => {
  const lokud = radHtmlFall()(M, rod(13), false, true);
  assert.strictEqual(fjoldi(lokud), 0);
  assert.match(lokud, /class="vs-tog" data-t5="vs-rad" data-id="verkferli" aria-expanded="false"/);
  const opin = radHtmlFall({ verkferli: true })(M, rod(13), false, true);
  assert.strictEqual(fjoldi(opin), 13);
  assert.ok(!opin.includes('vs-meira'), 'síminn notar sinn eigin ▸-rofa');
});

test('heiti og punktar eru flúin eins og áður', () => {
  const h = radHtmlFall({ x: true })({ id: 'x', heiti: '<b>heiti</b>', slod: {} }, { sev: 'alv', tala: '1', punktar: ['<img src=x onerror=alert(1)>', { feitt: '<i>f</i>', texti: '<u>t</u>' }] }, false, false);
  assert.ok(!/<img|<b>heiti|<i>f|<u>t/.test(h), h);
});
