# BACKLOG

Open issues observed during the patch-master.js split + first clean deploy
(2026-05-03). Listed roughly low-to-high effort.

---

## 1. Phantom JS files in `/js/` returning 3.4 KB HTML 404 stubs ✅ FIXED

`print.js`, `counter.js`, `workshop.js`, `field.js`, `app.js` were
referenced in the old index.html. The project's current `index.html` does
not reference any of these files — already removed.

## 2. `_markers is not defined` in `newfeatures.js` ✅ FIXED

`js/newfeatures.js:40` now uses
`if(typeof window._slokk_markers==='function')window._slokk_markers();`
— bare `_markers` fallback removed.

## 3. `manifest.json` and `favicon.ico` return 404 on the live site ✅ FIXED

`manifest.json` exists in the project root with inline SVG icons.
`index.html` has an inline `<link rel="icon" href="data:image/svg+xml,…">` —
no external favicon file needed.

## 4. Malformed SVG path in `pos.js` ✅ FIXED

`js/pos.js:18` cart icon path corrected to
`d="M3 4h2l2.5 11h11l2.5-7H6"`.

## 5. Hardcoded Netlify token in `deploy.js` ✅ FIXED

`deploy.js` requires `NETLIFY_TOKEN` env var and exits with a clear error
if missing. Only `NETLIFY_SITE` (non-secret site ID) has a default.

## 6. Supabase `GoTrueClient` double-init warning ✅ FIXED

`js/patches/03-vidsk-revamp.js` and `js/patches/04-verkdagbok.js` were
evaluating `supabase.createClient()` eagerly at script-load time (before
`DB.init()` runs). Converted to a lazy `getSB()` arrow function so the
canonical `window.DB.sb` is always used at call-time. All `SB.from()`
calls updated to `getSB().from()`.

## 7. Deprecated `apple-mobile-web-app-capable` meta tag ✅ FIXED

Removed from `index.html`. The standard `mobile-web-app-capable` remains.

## 8. `.claude/` leak from earlier deploy ✅ FIXED (recorded only)

`.claude` added to `SKIP_DIRS` in `deploy.js`. Follow-up deploy removed
the file from the active Netlify manifest.

---

All known backlog items resolved as of 2026-05-03.
