// Próf: Brunastál V2 er bakgrunnur í Stílstjóra, ekki HUD-rofi.
//   node --test test/brunastal-v2.test.cjs
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const SRC = fs.readFileSync(path.join(ROOT, 'js/patches/524-brunastal-v2.js'), 'utf8');
const PE = fs.readFileSync(path.join(ROOT, 'js/patches/262-page-editor.js'), 'utf8');
const INDEX = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

test('524 skráir bakgrunn í Stílstjóra, engan C|V2-rofa', () => {
  assert.ok(SRC.includes("PageEditor.addBg"));
  assert.ok(SRC.includes('V2 Brunastál'));
  assert.ok(SRC.includes('/img/bstal-v2/stal.jpg'));
  assert.ok(!SRC.includes('pe-toolbar'));
  assert.ok(!SRC.includes('data-bstal-utg'));
  assert.ok(!SRC.includes('data-bstal-v2'));
});

test('262 addBg og bakgrunnur málar .view svo 230 hylur hann ekki', () => {
  assert.ok(PE.includes('addBg:'));
  assert.ok(PE.includes('html[data-thm-preset="brunastal"] .view'));
  assert.ok(PE.includes('html[data-thm-preset="brunastal"] body .view'));
});

test('524 kallar addBg þegar PageEditor er til', () => {
  const calls = [];
  const ctx = {
    window: null,
    document: {
      readyState: 'complete',
      addEventListener() {}
    }
  };
  ctx.window = ctx;
  ctx.window.PageEditor = { addBg: (n, c) => calls.push([n, c]) };
  vm.createContext(ctx);
  vm.runInContext(SRC, ctx);
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], 'V2 Brunastál');
  assert.ok(calls[0][1].includes('stal.jpg'));
});

test('index.html lóðar 524 og 262', () => {
  assert.ok(/524-brunastal-v2\.js\?v=20261122/.test(INDEX));
  assert.ok(/262-page-editor\.js\?v=20261122/.test(INDEX));
});

test('eign stal.jpg er til', () => {
  assert.ok(fs.existsSync(path.join(ROOT, 'img/bstal-v2', 'stal.jpg')));
});
