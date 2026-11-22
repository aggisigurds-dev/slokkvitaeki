// Próf: Brunastál V2 dökk navy HUD (524) + vikudagsetning sem Ajour-flís (523).
//   node --test test/brunastal-v2.test.cjs
'use strict';
const test = require('node:test');
const assert = require('node:assert');
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

test('tókenar: Poppins, appelsínugul eldglóð, navy — ekki rauður C-accent', () => {
  assert.equal(TOKENS.fonts.ui, 'Poppins');
  assert.equal(TOKENS.colors.accent, '#ff8a1f');
  assert.equal(TOKENS.colors.navy, '#071018');
  assert.ok(TOKENS.assets.rammi.includes('bstal-v2/rammi'));
});

test('524 notar Poppins og navy HUD, ekki IBM Plex né Space Grotesk sem UI', () => {
  assert.ok(SRC.includes('Poppins'));
  assert.ok(SRC.includes('#ff8a1f'));
  assert.ok(SRC.includes('/img/bstal-v2/bordi.png'));
  assert.ok(SRC.includes('/img/bstal-v2/stal.jpg'));
  assert.equal((SRC.match(/Space Grotesk/g) || []).length, 1, 'Space Grotesk aðeins í athugasemd um ranga tilraun');
  const virkur = SRC.split('\n').filter(l => !/^\s*\*/.test(l) && !/^\s*\/\*/.test(l)).join('\n');
  assert.ok(!virkur.includes('IBM Plex'));
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
  for (const f of ['rammi.png', 'bordi.png', 'stal.jpg', 'eldglod.jpg', 'bygging.jpg']) {
    assert.ok(fs.existsSync(path.join(ROOT, 'img/bstal-v2', f)), f);
  }
});

test('index.html lóðar 524', () => {
  assert.ok(/524-brunastal-v2\.js\?v=20261122/.test(INDEX));
});
