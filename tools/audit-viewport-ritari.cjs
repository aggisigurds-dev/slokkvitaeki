#!/usr/bin/env node
/* VÖRÐUR — meta[name=viewport] á EINN ritara.
 *
 * 336 (SlokkViewportUnlock.sync) skrifar content. Aðrir papppar kalla sync().
 * index.html má setja upphafsgildið einu sinni í <head> (áður en pappparnir keyra).
 * Nýr setAttribute('content') við hliðina á viewport-leit = 980↔412 flökt.
 *
 *   node tools/audit-viewport-ritari.cjs
 */
const fs = require('fs');
const path = require('path');

const rot = path.join(__dirname, '..');
const LEYFI = new Set([
  'js/patches/336-viewport-brunaholf-zoom.js',
  'index.html',
]);

function skrár(dir, út) {
  for (const name of fs.readdirSync(dir)) {
    if (name === 'node_modules' || name === 'dist' || name === 'graphify-out' || name === '.git') continue;
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) skrár(p, út);
    else if (/\.(js|cjs|mjs|html)$/.test(name)) út.push(p);
  }
}

const allar = [];
skrár(rot, allar);
const brot = [];

for (const abs of allar) {
  const rel = path.relative(rot, abs).split(path.sep).join('/');
  if (LEYFI.has(rel)) continue;
  if (rel.startsWith('tools/')) continue;
  const text = fs.readFileSync(abs, 'utf8');
  const kodi = text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  const leitar = /meta\[name=["']viewport["']\]|setAttribute\(\s*["']name["']\s*,\s*["']viewport["']\)/.test(kodi);
  const skrif = /setAttribute\(\s*["']content["']/.test(kodi);
  if (leitar && skrif) brot.push(rel);
}

const html = fs.readFileSync(path.join(rot, 'index.html'), 'utf8');
const htmlKodi = html.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
const htmlSkrif = (htmlKodi.match(/querySelector\(\s*['"]meta\[name=["']viewport["']\]['"]\s*\)[\s\S]{0,400}?setAttribute\(\s*['"]content['"]/g) || []).length;
if (htmlSkrif !== 1) brot.push('index.html (' + htmlSkrif + ' viewport-skrif, á að vera 1)');

const eigandi = fs.readFileSync(path.join(rot, 'js/patches/336-viewport-brunaholf-zoom.js'), 'utf8');
if (!/function sync\(/.test(eigandi) || !/setAttribute\(\s*['"]content['"]/.test(eigandi)) {
  brot.push('336 vantar sync() sem skrifar content');
}
if (!/SlokkViewportUnlock\s*=\s*\{[^}]*sync/.test(eigandi)) {
  brot.push('336 vantar SlokkViewportUnlock.sync');
}

if (brot.length) {
  console.log('RED: viewport á fleiri en einn ritara:\n  ' + brot.join('\n  '));
  process.exit(1);
}
console.log('GREEN: viewport-ritari — aðeins 336 skrifar, index.html einu sinni í head');
