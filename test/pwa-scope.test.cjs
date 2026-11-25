// Próf: hvert app á sitt scope og aðalappið gleypir ekki /app/.
//   node --test test/pwa-scope.test.cjs
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

test('aðalmanifestið er /pwa/ og svart, ekki scope /', () => {
  const m = JSON.parse(read('manifest.json'));
  assert.equal(m.id, '/');
  assert.equal(m.scope, '/pwa/');
  assert.equal(m.start_url, '/pwa/');
  assert.equal(m.theme_color.toLowerCase(), '#000000');
  assert.equal(m.display, 'standalone');
  assert.equal(m.handle_links, 'not-preferred');
  assert.ok(m.scope.endsWith('/'));
  assert.ok(m.start_url.startsWith(m.scope));
});

test('innbyggð öpp hafa aðskilið scope og svartan ramma', () => {
  const main = JSON.parse(read('manifest.json'));
  const files = fs.readdirSync(root).filter((f) => /^manifest-[a-z]+\.json$/.test(f) && f !== 'manifest-tonlist.json');
  assert.ok(files.length >= 8);
  const ids = new Set();
  for (const f of files) {
    const m = JSON.parse(read(f));
    assert.equal(m.display, 'standalone', f);
    assert.ok(m.scope.startsWith('/app/') && m.scope.endsWith('/'), f + ' scope');
    assert.ok(m.start_url.startsWith(m.scope), f + ' start_url');
    assert.equal(m.id, m.scope, f + ' id');
    assert.equal(m.theme_color.toLowerCase(), '#000000', f);
    assert.notEqual(m.scope, main.scope);
    assert.ok(!m.scope.startsWith(main.scope), f + ' má ekki liggja innan aðalscopes');
    assert.ok(!ids.has(m.id), 'tvítekið id ' + m.id);
    ids.add(m.id);
    const png = (m.icons || []).filter((i) => i.type === 'image/png' && /192/.test(i.sizes) && i.purpose === 'any');
    assert.ok(png.length >= 1, f + ' vantar 192 png');
  }
});

test('uppsetning inni í aðalappi opnar Chrome með intent, ekki target=_blank', () => {
  const src = read('js/patches/261-app-profiles.js');
  assert.match(src, /function uppsetjaApp\(key\)/);
  assert.match(src, /package=com\.android\.chrome/);
  assert.match(src, /S\.browser_fallback_url=/);
  assert.equal(src.includes('target="_blank" rel="noopener"'), false);
  assert.match(src, /a\[data-chrome\]/);
  assert.match(read('netlify.toml'), /from = "\/pwa"/);
  assert.match(read('index.html'), /theme-color" content="#000000"/);
  assert.match(read('js/patches/528-simi-rammi.js'), /slokk_stika_v1/);
  assert.match(read('netlify/functions/app-manifest.js'), /theme_color: '#000000'/);
});
