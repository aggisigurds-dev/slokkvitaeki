// sw.js — minimal service worker.
//
// Its only job is to make the app installable as a PWA (so "Add to Home Screen"
// gives a real full-screen app with our icon, not a Chrome shortcut). It does
// NOT cache anything — every request goes straight to the network — so users can
// never be served stale code from a service-worker cache.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => { /* network passthrough — no caching */ });
