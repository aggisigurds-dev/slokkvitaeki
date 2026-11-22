// Próf: Brunastál V2 er bara bakgrunnur á .view (524). Ekkert HUD, ekkert [deploy].
//   node --test test/brunastal-v2.test.cjs
'use strict';
const test = require('node:test');
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const SRC = fs.readFileSync(path.join(ROOT, 'js/patches/524-brunastal-v2.js'), 'utf8');
const YR = fs.readFileSync(path.join(ROOT, 'js/patches/523-yfirsyn-rond.js'), 'utf8');
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
          id: '', textContent: '', className: '', innerHTML: '', rel: '', href: '',
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

test('eitt atriði: bakgrunnur .view, ekki HUD', () => {
  assert.ok(SRC.includes('.view{background:url('));
  assert.ok(SRC.includes('/img/bstal-v2/stal.jpg'));
  assert.ok(SRC.includes('#071018'));
  assert.ok(!SRC.includes('#bstal-banner'));
  assert.ok(!SRC.includes('btn-primary'));
  assert.ok(!SRC.includes('#view-arsskodun'));
  assert.ok(!SRC.includes('Poppins'));
  assert.ok(!SRC.includes('fonts.googleapis.com'));
  assert.equal((SRC.match(/\.view\{/g) || []).length, 1);
});

test('yfirlag: data-bstal-v2, engin Theme.set, ekkert localStorage', () => {
  assert.ok(SRC.includes('data-bstal-v2'));
  assert.ok(!/Theme\.set\(/.test(SRC));
  assert.ok(!/localStorage/.test(SRC));
  assert.ok(/AppSettings\.save/.test(SRC));
});

test('sjálfgefið C — ekkert attribut án vals', () => {
  const { html } = hlaða('', {});
  assert.equal(html.hasAttribute('data-bstal-v2'), false);
});

test('?bstal=v2 forskoðar án AppSettings', () => {
  const { html } = hlaða('?bstal=v2', {});
  assert.equal(html.getAttribute('data-bstal-v2'), '1');
});

test('skipta("v2") vistar á þjón og kveikir', async () => {
  const { ctx, html, stillingar } = hlaða('', {});
  const ok = await ctx.window.BrunastalV2.skipta('v2');
  assert.equal(ok, true);
  assert.equal(stillingar.brunastal_utgafa, 'v2');
  assert.equal(html.getAttribute('data-bstal-v2'), '1');
});

test('Vikan-dagsetning er yr-dags (Ajour-flís), án vsk er venjulegt em', () => {
  assert.ok(YR.includes("Vikan<em class=\"yr-dags\">"));
  assert.ok(YR.includes('.yr-kl em.yr-dags{'));
  assert.ok(YR.includes('#ff8a1f'));
  assert.ok(YR.includes('Greitt inn<em>m. vsk</em>'));
});

test('eignir V2 eru í img/bstal-v2', () => {
  assert.ok(fs.existsSync(path.join(ROOT, 'img/bstal-v2', 'stal.jpg')));
  assert.equal(TOKENS.colors.navy, '#071018');
  assert.ok(TOKENS.assets.stal.includes('bstal-v2/stal'));
});

test('index.html lóðar 524', () => {
  assert.ok(/524-brunastal-v2\.js\?v=20261122/.test(INDEX));
});
