// sw.js — PWA installability + cache bust v20260831sw1
//
// Chrome requires a service worker for "Add to Home Screen" to install a real
// app (otherwise it is a Chrome shortcut). This worker does NOT cache app
// code. Every request goes to the network.
//
// CACHE_NAME is bumped whenever office PCs must drop leftover Cache Storage
// (old 231 / 305 / 343 / 287). Changing this file's bytes is what makes
// browsers install a new worker (skipWaiting + clients.claim). On activate
// we delete EVERY Cache Storage bucket, including names we never created,
// so a machine that once ran a caching worker cannot keep serving stale
// Verkborð forever.
const CACHE_NAME = 'slokk-sw-v20260831sw1';

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    try {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    } catch (_) { /* Cache Storage unavailable */ }
    try { await self.clients.claim(); } catch (_) { /* ignore */ }
    // Keep CACHE_NAME referenced so the string cannot be tree-shaken out of
    // the file (browsers compare SW bytes; the version must stay in the body).
    void CACHE_NAME;
  })());
});

self.addEventListener('fetch', () => {
  // Network passthrough. Do not call event.respondWith, so the browser uses
  // its normal HTTP cache (hashed _bundle-*.js, ?v= patches). Cache Storage
  // is never written.
});
