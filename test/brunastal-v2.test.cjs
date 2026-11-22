// Próf: Brunastál V2-yfirlag (524) — leturlögnin úr mockupinu, ekki ný síða.
//   node --test test/brunastal-v2.test.cjs
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const SRC = fs.readFileSync(path.join(ROOT, 'js/patches/524-brunastal-v2.js'), 'utf8');
const TOKENS = JSON.parse(fs.readFileSync(path.join(ROOT, 'css/theme-handoff/brunastal-v2.tokens.json'), 'utf8'));
const INDEX = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

function hlaða(search, stillingar) {
  const attrs = Object.create(null);
  const nodes = Object.create(null);
  const html = {
    getAttribute: k => (Object.prototype.hasOwnProperty.call(attrs, k) ? attrs[k] : null),
    setAttribute: (k, v) => { attrs[k] = String(v); },
    removeAttribute: k => { delete attrs[k]; },
    hasAttribute: k => Object.prototype.hasOwnProperty.call(attrs, k)
  };
  const ctx = {
    window: null,
    document: {
      documentElement: html,
      body: {},
      head: { appendChild(el) { if (el && el.id) nodes[el.id] = el; } },
      getElementById: id => nodes[id] || null,
      createElement() {
        return {
          id: '', textContent: '', className: '', innerHTML: '',
          addEventListener() {},
          querySelectorAll() { return []; },
          setAttribute() {},
          getAttribute() { return null; },
          classList: { toggle() {} }
        };
      },
      querySelector() { return null; },
      addEventListener() {}
    },
    location: { search: search || '' },
    MutationObserver: class { observe() {} },
    URLSearchParams,
    setTimeout() { return 0; },
    clearTimeout() {}
  };
  ctx.window = ctx;
  ctx.window.AppSettings = {
    path: k => stillingar[k],
    save: async (p) => { Object.assign(stillingar, p); return true; },
    onChange() {},
    load: async () => stillingar
  };
  vm.createContext(ctx);
  vm.runInContext(SRC, ctx);
  return { ctx, html, stillingar };
}

test('tókenar: Space Grotesk / Sora / Space Mono og rauður accent mockupsins', () => {
  assert.equal(TOKENS.fonts.ui, 'Space Grotesk');
  assert.equal(TOKENS.fonts.wordmark, 'Sora');
  assert.equal(TOKENS.fonts.mono, 'Space Mono');
  assert.equal(TOKENS.fonts.display, 'Playfair Display');
  assert.equal(TOKENS.colors.accent, '#c92a2a');
  assert.ok(TOKENS.gradients.btn.includes('#971515'));
});

test('524 notar mockup-letrið með !important, ekki IBM Plex', () => {
  assert.ok(SRC.includes('"Space Grotesk"'));
  assert.ok(SRC.includes('"Sora"'));
  assert.ok(SRC.includes('"Space Mono"'));
  assert.ok(SRC.includes('"Playfair Display"'));
  assert.ok(SRC.includes("font-family:' + ui + '!important"));
  assert.ok(!(SRC.split('\n').filter(l => !/^\s*\*/.test(l) && !/^\s*\/\*/.test(l)).join('\n').includes('IBM Plex')),
    'IBM Plex má ekki vera í virkum CSS');
});

test('yfirlag eins og 507: data-bstal-v2, engin Theme.set, ekkert 11-preseta', () => {
  assert.ok(SRC.includes('data-bstal-v2'));
  assert.ok(!/Theme\.set\(/.test(SRC));
  assert.ok(!/data-thm-preset/.test(SRC));
  assert.ok(!/localStorage/.test(SRC));
  assert.ok(/AppSettings\.save/.test(SRC));
  assert.ok(SRC.includes('brunastal_utgafa'));
});

test('sjálfgefið C — ekkert attribut án vals', () => {
  const { html } = hlaða('', {});
  assert.equal(html.hasAttribute('data-bstal-v2'), false);
});

test('?bstal=v2 forskoðar án AppSettings', () => {
  const { html } = hlaða('?bstal=v2', {});
  assert.equal(html.getAttribute('data-bstal-v2'), '1');
});

test('vistað v2 á þjóninum kveikir yfirlagið', () => {
  const { html } = hlaða('', { brunastal_utgafa: 'v2' });
  assert.equal(html.getAttribute('data-bstal-v2'), '1');
});

test('skipta("v2") vistar á þjón og kveikir', async () => {
  const { ctx, html, stillingar } = hlaða('', {});
  const ok = await ctx.window.BrunastalV2.skipta('v2');
  assert.equal(ok, true);
  assert.equal(stillingar.brunastal_utgafa, 'v2');
  assert.equal(html.getAttribute('data-bstal-v2'), '1');
});

test('skipta("c") slokknar', async () => {
  const { ctx, html } = hlaða('', { brunastal_utgafa: 'v2' });
  assert.equal(html.getAttribute('data-bstal-v2'), '1');
  await ctx.window.BrunastalV2.skipta('c');
  assert.equal(html.hasAttribute('data-bstal-v2'), false);
});

test('index.html lóðar 524 á eftir Stílstjóra', () => {
  const i324 = INDEX.indexOf('324-stilla-utlit-afgreidsla.js');
  const i524 = INDEX.indexOf('524-brunastal-v2.js');
  assert.ok(i324 > 0 && i524 > i324);
  assert.ok(/524-brunastal-v2\.js\?v=20261122/.test(INDEX));
});
