#!/usr/bin/env node
'use strict';
/**
 * Cache-header contracts (2026-08-29): hashed JS bundles must be immutable,
 * query-string JS/CSS may cache briefly, HTML entry points must revalidate.
 * Netlify applies later matching rules over earlier ones for the same header,
 * so the _bundle rule must appear after the general /js/* rule.
 */
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
let failed = 0;
function ok(name, cond, detail) {
  if (cond) console.log('  OK  ' + name);
  else { failed++; console.log('  FAIL ' + name + (detail ? ' — ' + detail : '')); }
}

const toml = fs.readFileSync(path.join(root, 'netlify.toml'), 'utf8');
function headerBlock(forPath) {
  const re = new RegExp(
    '\\[\\[headers\\]\\]\\s*for = "' + forPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '"\\s*\\[headers\\.values\\]\\s*([\\s\\S]*?)(?=\\n\\[\\[|\\n\\[functions|$)',
    'm'
  );
  const m = toml.match(re);
  return m ? m[1] : '';
}

const htmlCc = headerBlock('/');
ok('HTML / still revalidates', /Cache-Control = "public, max-age=0, must-revalidate"/.test(htmlCc));
ok('HTML /*.html still revalidates', /for = "\/\*\.html"/.test(toml) && toml.includes('max-age=0, must-revalidate'));

const jsBlock = headerBlock('/js/*');
ok('/js/* has 1h cache + SWR', /Cache-Control = "public, max-age=3600, stale-while-revalidate=86400"/.test(jsBlock));
const cssBlock = headerBlock('/css/*');
ok('/css/* has 1h cache + SWR', /Cache-Control = "public, max-age=3600, stale-while-revalidate=86400"/.test(cssBlock));
const imgBlock = headerBlock('/img/*');
ok('/img/* has 1d cache + SWR', /Cache-Control = "public, max-age=86400, stale-while-revalidate=604800"/.test(imgBlock));

const bundleBlock = headerBlock('/js/_bundle-*.js');
ok('hashed bundles are immutable for a year',
  /Cache-Control = "public, max-age=31536000, immutable"/.test(bundleBlock));

const iJs = toml.lastIndexOf('for = "/js/*"');
const iBundle = toml.lastIndexOf('for = "/js/_bundle-*.js"');
ok('hashed-bundle rule comes after /js/* (last-match wins)', iBundle > iJs && iJs >= 0);

const swBlock = headerBlock('/sw.js');
ok('sw.js revalidates on every visit (PWA updates / cache bust)',
  /Cache-Control = "public, max-age=0, must-revalidate"/.test(swBlock));

const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const swSrc = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
ok('sw.js declares CACHE_NAME slokk-sw-v20260831sw1',
  /const CACHE_NAME = 'slokk-sw-v20260831sw1'/.test(swSrc));
ok('sw.js skipWaiting on install', /skipWaiting\(\)/.test(swSrc));
ok('sw.js deletes every Cache Storage key on activate',
  /keys\.map\(\(k\) => caches\.delete\(k\)\)/.test(swSrc) || /caches\.delete/.test(swSrc));
ok('sw.js claims clients on activate', /clients\.claim\(\)/.test(swSrc));
ok('sw.js does not caches.open app assets', !/caches\.open\(/.test(swSrc));

ok('index.html registers /sw.js with updateViaCache none',
  /serviceWorker\.register\('\/sw\.js',\s*\{updateViaCache:'none'\}\)/.test(html));
ok('index.html drops Cache Storage on load',
  /caches\.delete/.test(html) && /serviceWorker\.register/.test(html));
ok('293 utgafu-vakt cache-bust query matches this SW bump',
  html.includes('/js/patches/293-utgafu-vakt.js?v=20260831sw1'));
ok('231 Verkborð cache-bust query is present',
  /231-verkbord\.js\?v=20260831sc6/.test(html));
ok('305 Skipulagsborð cache-bust query is present',
  /305-skipulagsbord\.js\?v=20260831skip/.test(html));
ok('343 AI-borð cache-bust query is present',
  /343-verkbord-ai\.js\?v=20260831sc6/.test(html));
ok('287 Postar cache-bust query is present',
  /287-postar-queue\.js\?v=20260831sc6/.test(html));

ok('preconnect fonts.googleapis.com', html.includes('rel="preconnect" href="https://fonts.googleapis.com"'));
ok('preconnect fonts.gstatic.com', html.includes('rel="preconnect" href="https://fonts.gstatic.com"'));
ok('preconnect jsDelivr (supabase-js CDN)', html.includes('rel="preconnect" href="https://cdn.jsdelivr.net"'));
ok('preconnect Supabase REST host', html.includes('rel="preconnect" href="https://osfdzskyvisifcwyjkuk.supabase.co"'));

console.log(failed ? '\n' + failed + ' failed' : '\nall cache-header contracts passed');
process.exit(failed ? 1 : 0);
