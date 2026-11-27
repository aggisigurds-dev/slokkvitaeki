// Próf: mockup-i-sidu — SKIPUN + dílamunur (22.11.2026).
// Keyrsla: node --test test/mockup-i-sidu.test.cjs
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { writePng, readPng, bera, skipunSnið, rokin, slug, main } = require('../tools/mockup-i-sidu.cjs');

function solid(w, h, r, g, b) {
  const buf = Buffer.alloc(w * h * 4, 255);
  for (let i = 0; i < w * h; i++) {
    buf[i * 4] = r; buf[i * 4 + 1] = g; buf[i * 4 + 2] = b;
  }
  return { width: w, height: h, data: buf };
}

test('PNG hringferð RGBA', () => {
  const src = solid(4, 3, 10, 20, 30);
  src.data[4] = 200;
  const bin = writePng(src.width, src.height, src.data);
  const back = readPng(bin);
  assert.equal(back.width, 4);
  assert.equal(back.height, 3);
  assert.equal(back.data[4], 200);
  assert.equal(back.data[5], 20);
});

test('bera: einn díll í grimu, rest kyrr', () => {
  const a = solid(8, 8, 0, 0, 0);
  const b = solid(8, 8, 0, 0, 0);
  b.data[0] = 255; // (0,0)
  const r = bera(a, b, { grima: { x: 0, y: 0, w: 2, h: 2 }, delta: 0 });
  assert.equal(r.hluti.breytt, 1);
  assert.equal(r.rest.breytt, 0);
  assert.ok(r.hluti.pct > 0);
  assert.equal(r.rest.pct, 0);
});

test('bera: breyting utan grimu telst rest', () => {
  const a = solid(8, 8, 0, 0, 0);
  const b = solid(8, 8, 0, 0, 0);
  const i = (7 * 8 + 7) * 4;
  b.data[i] = 255;
  const r = bera(a, b, { grima: { x: 0, y: 0, w: 2, h: 2 }, delta: 0 });
  assert.equal(r.hluti.breytt, 0);
  assert.equal(r.rest.breytt, 1);
});

test('SKIPUN hefur BREYTA HALDA HUNSA', () => {
  const md = skipunSnið({ nafn: 'haus', url: '#x', hluti: '.y' });
  assert.match(md, /## BREYTA/);
  assert.match(md, /## HALDA/);
  assert.match(md, /## HUNSA/);
  assert.match(md, /\.y/);
  assert.doesNotMatch(md, /image-to-code/i);
});

test('rokin --bera og --snið', () => {
  const b = rokin(['node', 'x', '--bera', 'a.png', 'b.png', '--grima', '1,2,3,4']);
  assert.equal(b.hamur, 'bera');
  assert.equal(b.a, 'a.png');
  assert.deepEqual(b.grima, { x: 1, y: 2, w: 3, h: 4 });
  const s = rokin(['node', 'x', '--snið', '--nafn', 'Haus', '--hluti', '.c']);
  assert.equal(s.hamur, 'snid');
  assert.equal(s.nafn, 'Haus');
});

test('slug og --snið skrifar möppu', () => {
  assert.equal(slug('Fyrirtæki Haus!'), 'fyrirtæki-haus');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mockup-'));
  const prev = process.cwd();
  process.chdir(tmp);
  try {
    const code = main(['node', 'x', '--snið', '--nafn', 'profun', '--url', '#c', '--hluti', '.x']);
    assert.equal(code, 0);
    const md = fs.readFileSync(path.join(tmp, '.design', 'mockup-profun', 'SKIPUN.md'), 'utf8');
    assert.match(md, /#c/);
  } finally {
    process.chdir(prev);
  }
});

test('--bera rest yfir þaki → exit 2', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mockup-'));
  const a = solid(4, 4, 0, 0, 0);
  const b = solid(4, 4, 255, 0, 0);
  fs.writeFileSync(path.join(tmp, 'a.png'), writePng(4, 4, a.data));
  fs.writeFileSync(path.join(tmp, 'b.png'), writePng(4, 4, b.data));
  const code = main(['node', 'x', '--bera', path.join(tmp, 'a.png'), path.join(tmp, 'b.png'), '--thak', '1']);
  assert.equal(code, 2);
});
