/* Viðhengi svarsins birtist sem TENGILL á sama skjal og sendingin sækir (18.11.2026).
 * Agnar: „geturðu þá sýnt þarna í svarinu skjalið svo ég geti alltaf opnað það og staðfest“.
 * Slóðin endar í href hjá honum, svo aðeins http(s) eða Drive-auðkenni má komast í gegn. */
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const A = require('../netlify/functions/afgreidsla.cjs');
const slod = A._vidhengiSlod;

test('vidhengiSlod: opin slóð og Drive-skrá fá tengil, annað ekki', () => {
  const u = 'https://osfdzskyvisifcwyjkuk.supabase.co/storage/v1/object/public/samningar/drive-afrit/reikningur/470/2509_R-108282.pdf';
  assert.strictEqual(slod({ filename: 'Reikningur 108282 - VR-5 ehf.pdf', url: u, contentType: 'application/pdf' }), u);
  assert.strictEqual(slod({ filename: 'skyrsla.pdf', driveId: '1AbC_dEf-GhIjKlMnOp' }), 'https://drive.google.com/file/d/1AbC_dEf-GhIjKlMnOp/view');
  // base64-viðhengi (teiknað í vafra) á enga slóð — nafnið birtist eitt.
  assert.strictEqual(slod({ filename: 'reikningur.pdf', content: 'JVBERi0x' }), null);
  for (const v of [null, undefined, {}, { filename: 'x.pdf' }, { url: '' }, { url: 42 }, { driveId: '' }, { driveId: 'stutt' }]) {
    assert.strictEqual(slod(v), null, JSON.stringify(v));
  }
});

test('vidhengiSlod: hættulegar slóðir komast ALDREI í href', () => {
  for (const url of ['javascript:alert(1)', 'data:text/html,<script>1</script>', '//annar-vefur.is/x.pdf', '/afstaed/slod.pdf',
    'ftp://x.is/a.pdf', 'https://x.is/a.pdf" onclick="alert(1)', "https://x.is/a'.pdf", 'https://x.is/a b.pdf', 'https://x.is/<b>.pdf', ' https://x.is/a.pdf']) {
    assert.strictEqual(slod({ filename: 'a.pdf', url }), null, url);
  }
  // Drive-auðkenni er aðeins stafir, tölur, _ og - : ekkert sem brýtur slóðina.
  for (const driveId of ['abc/../../etc', 'abc?x=1&y=2zzzz', '"><script>alert(1)', 'abc def ghi jkl']) {
    assert.strictEqual(slod({ filename: 'a.pdf', driveId }), null, driveId);
  }
});

test('allar þrjár sýnir teikna viðhengið gegnum vidhengiHtml — engin stendur eftir með nöfnin ein', () => {
  const rot = path.join(__dirname, '..');
  for (const f of ['afgreidsla.html', 'js/patches/511-bord-afgreidsla.js', 'js/patches/515-tilbuin-simi.js']) {
    const s = fs.readFileSync(path.join(rot, f), 'utf8');
    assert.ok(/var vidhengiHtml = function/.test(s), f + ': vidhengiHtml vantar');
    assert.ok(!/esc\((?:p|v\.post)\.vidhengi\.join/.test(s), f + ': teiknar enn nöfnin ein (esc(...vidhengi.join))');
    assert.ok(/vidhengi_opna/.test(s), f + ': les ekki vidhengi_opna');
  }
  // Þjónninn sendir vidhengi_opna OG heldur gamla vidhengi-listanum (eldri sýn í skyndiminni brotnar ekki).
  const srv = fs.readFileSync(path.join(rot, 'netlify/functions/afgreidsla.cjs'), 'utf8');
  assert.ok(/vidhengi: \(g\.vidhengi \|\| \[\]\)\.map\(\(v\) => v\.filename\)/.test(srv), 'gamli vidhengi-listinn á að standa');
  assert.ok(/vidhengi_opna: \(g\.vidhengi \|\| \[\]\)\.filter\(Boolean\)\.map/.test(srv), 'vidhengi_opna vantar í o.post');
});

test('vidhengiHtml í vafra: tengill þegar slóð er til, nafn annars, og ekkert óflúið kemst í HTML', () => {
  // Sækir fallið úr 511 og keyrir það með sömu esc/opnaHtml og skráin skilgreinir.
  const s = fs.readFileSync(path.join(__dirname, '..', 'js/patches/511-bord-afgreidsla.js'), 'utf8');
  const escM = s.match(/var esc = function[\s\S]*?\n  \};|var esc = function[^\n]*\n/);
  const opnaM = s.match(/var opnaHtml = function \(s\) \{[\s\S]*?\n  \};/);
  const vidM = s.match(/var vidhengiHtml = function \(p\) \{[\s\S]*?\n  \};/);
  assert.ok(escM && opnaM && vidM, 'náði ekki föllunum úr 511');
  const vidhengiHtml = new Function(escM[0] + '\n' + opnaM[0] + '\n' + vidM[0] + '\nreturn vidhengiHtml;')();
  const u = 'https://x.supabase.co/storage/v1/object/public/s/a.pdf';
  const h = vidhengiHtml({ vidhengi: ['Reikningur 108282 - VR-5 ehf.pdf'], vidhengi_opna: [{ nafn: 'Reikningur 108282 - VR-5 ehf.pdf', url: u }] });
  assert.ok(h.includes('href="' + u + '"') && h.includes('target="_blank"') && h.includes('rel="noopener"'), h);
  assert.ok(h.includes('Reikningur 108282 - VR-5 ehf.pdf'), h);
  // Engin slóð → nafnið eitt, enginn tengill.
  const n = vidhengiHtml({ vidhengi: ['teiknad.pdf'], vidhengi_opna: [{ nafn: 'teiknad.pdf', url: null }] });
  assert.ok(n.includes('teiknad.pdf') && !n.includes('<a '), n);
  // Eldri þjónn (ekkert vidhengi_opna) → sama og áður.
  assert.strictEqual(vidhengiHtml({ vidhengi: ['a.pdf', 'b.pdf'] }), 'a.pdf, b.pdf');
  // Nafn með HTML er flúið, og javascript:-slóð verður aldrei að tengli.
  const x = vidhengiHtml({ vidhengi: ['x'], vidhengi_opna: [{ nafn: '<img src=x onerror=alert(1)>', url: 'javascript:alert(1)' }] });
  assert.ok(!x.includes('<img') && !x.includes('<a ') && !x.includes('javascript:'), x);
});
