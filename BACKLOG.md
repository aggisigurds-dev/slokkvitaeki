# BACKLOG

Open issues observed during the patch-master.js split + first clean deploy
(2026-05-03). Listed roughly low-to-high effort. Add to this file as new
issues come up — future Claude Code sessions will read it on session start.

---

## 1. Phantom JS files in `/js/` returning 3.4 KB HTML 404 stubs

`index.html` loads these five scripts, all of which respond `200 OK` with
~3449 bytes of `<!DOCTYPE html>...` (Netlify's 404 page) instead of real
JavaScript:

- `js/print.js`
- `js/counter.js`
- `js/workshop.js`
- `js/field.js`
- `js/app.js`

The `<script src=...>` tag treats the HTML as JS, so each one throws a
parse error in the console. Investigate whether these files are still
referenced by anything in the codebase. Likely action: remove the script
tags from `index.html` (they're at lines 280–284). If any code actually
needs them, recreate the missing files.

## 2. `_markers is not defined` in `newfeatures.js`

`js/newfeatures.js:40` references `_markers` as a fallback inside a
button click handler:

```js
rb.onclick = function(){(window._slokk_markers || _markers)();};
```

But `_markers` is declared inside a different scope (assigned to
`window._slokk_markers` on line 401). When the button fires before that
assignment runs, the bare `_markers` lookup throws `ReferenceError`.
Fix: drop the bare `_markers` fallback (rely on `window._slokk_markers`
only), or hoist the function so both references resolve.

## 3. `manifest.json` and `favicon.ico` return 404 on the live site

`index.html:10` has `<link rel="manifest" href="manifest.json"/>` but no
`manifest.json` exists in the repo. Browsers also auto-request
`/favicon.ico`, which 404s. Either create the two files (preferred —
gives the app a real PWA manifest + icon), or remove the manifest link
and add an empty `<link rel="icon" href="data:,">` to silence the
favicon request.

## 4. Malformed SVG path in `pos.js`

`js/pos.js:18`, in the cart icon SVG, has a broken `d` attribute:

```html
<path d="M3 4h2l2.5 11h11/>21 7H6"/>
```

Note the stray `/>` mid-string. Looks like an HTML-escaped `>` (U+003E)
got accidentally baked into the path during a copy-paste. The intended
shopping-cart `d` is likely `M3 4h2l2.5 11h11l2.5-7H6` (or similar).
Browsers silently render a partial cart and log an SVG warning.

## 5. Hardcoded Netlify token in `deploy.js`

`deploy.js:19-20` falls back to a hardcoded `NETLIFY_TOKEN` and
`NETLIFY_SITE` if the env vars are unset. Before pushing this repo to
GitHub (even private), rotate the token at
https://app.netlify.com/user/applications and remove the fallback —
require the env var and exit clearly if missing. Document the env var
in `WINDOWS-SETUP.md` (or a new `.env.example`).

## 6. Supabase `GoTrueClient` double-init warning

Console warns "Multiple GoTrueClient instances detected in the same
browser context" on every page load. Means `supabase.createClient()` is
being called more than once. Grep the codebase for `createClient(` —
keep the canonical one in `js/db.js` (`DB.sb`) and replace any others
with `window.DB.sb`. Likely culprits: `v9.js` (realtime channels), or
one of the older patches now in `js/patches/`. Not blocking today
because the app is anon-only, but will cause auth-session races as soon
as login is added.

## 7. Deprecated `apple-mobile-web-app-capable` meta tag

`index.html` uses `<meta name="apple-mobile-web-app-capable" ...>`,
which Chrome logs as deprecated. Replace with (or add alongside)
`<meta name="mobile-web-app-capable" content="yes">`. Iceland's
primary device for this app is a Samsung S26 (Android), so the
Apple-specific tag isn't doing useful work anyway.

## 8. `.claude/` leak from earlier deploy *(fixed in deploy.js, scrubbed by redeploy)*

The first deploy after the split (deploy id `69f6a766...`) accidentally
published `/.claude/settings.local.json` because `deploy.js`'s
`SKIP_DIRS` list didn't exclude `.claude/`. The leaked file contained
Claude Code permission grants — no tokens or credentials, but
exposed development context. Fix landed: `.claude` added to
`SKIP_DIRS` in `deploy.js`, and a follow-up deploy removed the file
from the active manifest (verified `/.claude/settings.local.json`
returns 404 after the redeploy).

Item kept here as a record + reminder: when adding new
filesystem-walking deploy logic, mirror `.gitignore` semantics or
maintain an explicit allowlist instead of a denylist.
