/* Viðhengi svarsins birtist sem TENGILL á sama skjal og sendingin sækir (18.11.2026).
 * Agnar: „geturðu þá sýnt þarna í svarinu skjalið svo ég geti alltaf opnað það og staðfest“.
 * Slóðin kemur úr gogn.vidhengi (agentar skrifa) og endar í href hjá Agnari, sem sér aðeins skráarheitið.
 * Því: aðeins https á traustan hýsil eða hreint Drive-auðkenni; óþekktur vefur fær viðvörun, ekki tengil. */
'use strict';
process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'https://osfdzskyvisifcwyjkuk.supabase.co';   // hýsillinn í traustalistanum
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const A = require('../netlify/functions/afgreidsla.cjs');
const slod = A._vidhengiSlod, syn = A._vidhengiSyn;
const ROT = path.join(__dirname, '..');
const U = 'https://osfdzskyvisifcwyjkuk.supabase.co/storage/v1/object/public/samningar/drive-afrit/reikningur/470/2509_R-108282.pdf';

test('vidhengiSlod: eigin geymsla og Drive-skrá fá tengil, annað ekki', () => {
  assert.strictEqual(slod({ filename: 'Reikningur 108282 - VR-5 ehf.pdf', url: U, contentType: 'application/pdf' }), U);
  assert.strictEqual(slod({ filename: 'skyrsla.pdf', driveId: '1AbC_dEf-GhIjKlMnOp' }), 'https://drive.google.com/file/d/1AbC_dEf-GhIjKlMnOp/view');
  assert.strictEqual(slod({ filename: 'x.pdf', url: 'https://drive.google.com/file/d/1AbC_dEf-GhIjKlMnOp/view' }), 'https://drive.google.com/file/d/1AbC_dEf-GhIjKlMnOp/view');
  // base64-viðhengi (teiknað í vafra) á enga slóð — nafnið birtist eitt.
  assert.strictEqual(slod({ filename: 'reikningur.pdf', content: 'JVBERi0x' }), null);
  for (const v of [null, undefined, {}, { filename: 'x.pdf' }, { url: '' }, { url: 42 }, { driveId: '' }, { driveId: 'stutt' }]) {
    assert.strictEqual(slod(v), null, JSON.stringify(v));
  }
});

test('vidhengiSlod: hættulegar slóðir og ÓÞEKKTIR VEFIR komast aldrei í href', () => {
  for (const url of ['javascript:alert(1)', 'data:text/html,<script>1</script>', '//annar-vefur.is/x.pdf', '/afstaed/slod.pdf',
    'ftp://x.is/a.pdf', U.replace('https://', 'http://'), U + '" onclick="alert(1)', U + "'", U + ' b', U + '<b>', ' ' + U,
    // vefveiðar: réttur hýsill sem notandanafn, sem forskeyti annars léns, eða með aðgangsorði
    'https://evil.example/reikningur.pdf', 'https://osfdzskyvisifcwyjkuk.supabase.co@evil.example/r.pdf',
    'https://osfdzskyvisifcwyjkuk.supabase.co.evil.example/r.pdf', 'https://a:b@osfdzskyvisifcwyjkuk.supabase.co/r.pdf']) {
    assert.strictEqual(slod({ filename: 'a.pdf', url }), null, url);
  }
  // Drive-auðkenni er aðeins stafir, tölur, _ og - : ekkert sem brýtur slóðina.
  for (const driveId of ['abc/../../etc', 'abc?x=1&y=2zzzz', '"><script>alert(1)', 'abc def ghi jkl']) {
    assert.strictEqual(slod({ filename: 'a.pdf', driveId }), null, driveId);
  }
});

test('vidhengiSyn: óþekktur vefur fær VIÐVÖRUN með nafni vefsins í stað tengils', () => {
  assert.deepStrictEqual(syn({ filename: 'r.pdf', url: U }), { nafn: 'r.pdf', url: U });
  assert.deepStrictEqual(syn({ filename: 'r.pdf', content: 'JVBERi0x' }), { nafn: 'r.pdf', url: null });   // engin slóð = engin viðvörun
  const v = syn({ filename: 'r.pdf', url: 'https://evil.example/r.pdf' });
  assert.strictEqual(v.url, null);
  assert.match(v.nafn, /^r\.pdf — ⚠ slóð á evil\.example/);
  assert.strictEqual(syn({ url: U }).nafn, 'skjal');
});

test('þjónninn: vidhengi_opna bætist við, gamli listinn stendur og báðir þola null-stak', () => {
  const srv = fs.readFileSync(path.join(ROT, 'netlify/functions/afgreidsla.cjs'), 'utf8');
  assert.ok(/vidhengi: \(g\.vidhengi \|\| \[\]\)\.filter\(Boolean\)\.map\(\(v\) => v\.filename\)/.test(srv), 'gamli vidhengi-listinn á að standa og sía null');
  assert.ok(/vidhengi_opna: \(g\.vidhengi \|\| \[\]\)\.filter\(Boolean\)\.map\(vidhengiSyn\)/.test(srv), 'vidhengi_opna vantar í o.post');
  // Sendingin les g.vidhengi beint — birtingin má aldrei koma í staðinn.
  assert.ok(/attachments: g\.vidhengi \|\| \[\]/.test(srv), 'sendaPost á að senda g.vidhengi óbreytt');
});

// Föllin dregin úr HVERRI sýn og keyrð — útfærslurnar þrjár eru ekki eins (515 hefur enga opnaHtml).
function ur(skra) {
  const s = fs.readFileSync(path.join(ROT, skra), 'utf8');
  const esc = s.match(/^\s*var esc = function[^\n]*$/m);
  const opna = s.match(/var opnaHtml = function \(s\) \{[\s\S]*?\n  \};/);
  const vid = s.match(/var vidhengiHtml = function \(p\) \{[\s\S]*?\n  \};/);
  assert.ok(esc && vid, skra + ': náði ekki esc/vidhengiHtml');
  assert.ok(!/esc\((?:p|v\.post)\.vidhengi\.join/.test(s), skra + ': teiknar enn nöfnin ein (esc(...vidhengi.join))');
  return new Function(esc[0] + '\n' + (opna ? opna[0] : '') + '\n' + vid[0] + '\nreturn vidhengiHtml;')();
}
for (const skra of ['afgreidsla.html', 'js/patches/511-bord-afgreidsla.js', 'js/patches/515-tilbuin-simi.js']) {
  test('vidhengiHtml í ' + skra + ': tengill með slóð, nafn án hennar, ekkert óflúið í HTML', () => {
    const f = ur(skra);
    const h = f({ vidhengi: ['Reikningur 108282 - VR-5 ehf.pdf'], vidhengi_opna: [{ nafn: 'Reikningur 108282 - VR-5 ehf.pdf', url: U }] });
    assert.ok(h.includes('href="' + U + '"') && h.includes('target="_blank"') && h.includes('rel="noopener"'), h);
    assert.ok(h.includes('Reikningur 108282 - VR-5 ehf.pdf'), h);
    // Engin slóð → nafnið eitt, enginn tengill.
    const n = f({ vidhengi: ['teiknad.pdf'], vidhengi_opna: [{ nafn: 'teiknad.pdf', url: null }] });
    assert.ok(n.includes('teiknad.pdf') && !n.includes('<a '), n);
    // Eldri þjónn (ekkert vidhengi_opna) og tómt → sama birting og áður.
    assert.strictEqual(f({ vidhengi: ['a.pdf', 'b.pdf'] }), 'a.pdf, b.pdf');
    assert.strictEqual(f({ vidhengi: ['a.pdf'], vidhengi_opna: [] }), 'a.pdf');
    // Þótt þjónninn sendi rusl: nafn með HTML er flúið og hættuleg slóð verður aldrei að tengli.
    for (const url of ['javascript:alert(1)', 'data:text/html,x', '//annar-vefur.is/x', 'https://x.is/a" onmouseover="alert(1)']) {
      const x = f({ vidhengi: ['x'], vidhengi_opna: [{ nafn: '<img src=x onerror=alert(1)>', url }] });
      assert.ok(!x.includes('<img'), skra + ' óflúið nafn: ' + x);
      assert.ok(!/href="(?:javascript|data):/i.test(x) && !x.includes('href="//'), skra + ' hættulegur tengill: ' + x);
      assert.ok(!/" onmouseover="/.test(x), skra + ' braust út úr href: ' + x);
    }
  });
}
