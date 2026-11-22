// Próf: Brunastál V2 er HUD-þema, ekki bakgrunnur einn.
//   node --test test/brunastal-v2.test.cjs
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const SRC = fs.readFileSync(path.join(ROOT, 'js/patches/524-brunastal-v2.js'), 'utf8');
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
          style: { cssText: '' },
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

test('V2 er HUD: gler, tafla, appelsína — ekki bakgrunnur einn', () => {
  assert.ok(SRC.includes('bstal-glass'));
  assert.ok(SRC.includes('#view-arsskodun table'));
  assert.ok(SRC.includes('#ff8a1f'));
  assert.ok(SRC.includes('/img/bstal-v2/stal.jpg'));
  assert.ok(SRC.includes('/img/bstal-v2/rammi.png'));
  assert.ok(SRC.includes('Poppins'));
  assert.ok(SRC.includes('data-thm-preset="brunastal"'));
  assert.ok(SRC.includes('data-bstal-v2'));
});

test('rofi fer efst í Stílstjóra, ekki í Sýn-rönd né Bakgrunnar', () => {
  assert.ok(SRC.includes("getElementById(PANEL_ID)"));
  assert.ok(SRC.includes('insertBefore'));
  assert.ok(!SRC.includes('addBg'));
  assert.ok(!SRC.includes('pe-toolbar'));
});

test('sjálfgefið C', () => {
  const { html } = hlaða('', {});
  assert.equal(html.hasAttribute('data-bstal-v2'), false);
});

test('?bstal=v2 forskoðar', () => {
  const { html } = hlaða('?bstal=v2', {});
  assert.equal(html.getAttribute('data-bstal-v2'), '1');
});

test('skipta("v2") vistar á þjón', async () => {
  const { ctx, html, stillingar } = hlaða('', {});
  const ok = await ctx.window.BrunastalV2.skipta('v2');
  assert.equal(ok, true);
  assert.equal(stillingar.brunastal_utgafa, 'v2');
  assert.equal(html.getAttribute('data-bstal-v2'), '1');
});

test('index.html lóðar 524', () => {
  assert.ok(/524-brunastal-v2\.js\?v=20261122/.test(INDEX));
});
