---
name: deploy
description: >
  How to ship a change to slokkvitaeki.netlify.app safely — the git-push-only
  deploy discipline, why `node deploy.js` is forbidden (it silently wipes every
  serverless function), how the build-dist bundling works, why PR deploy-previews
  equal production, and how to revert a bad deploy. Use whenever you are about to
  commit/push/deploy the Slökkvitæki app, when a deploy looks wrong or stale, or
  when onboarding a machine to the deploy flow.
  Kveikjuorð: deploy, ýta, git push, deploy.js (bannað), revert.
---

# Deploy — Slökkvitæki ehf web app

The app is edited from **4 machines**, each running Claude Code or Cursor. The single source
of truth is `master` on GitHub. Deploy = commit + push. Nothing else.

## The one rule (07.09.2026: push samstillir, `[deploy]` birtir)
```bash
git pull origin master     # ALWAYS first — never deploy stale code over a teammate
# …edit, test locally (preview_start slokkvitaeki-dev), commit as Agnar…
git push origin master     # samstillir vélarnar fjórar — EKKERT deploy
git commit --allow-empty -m "[deploy] hvað fer út" && git push   # birtir — EINU SINNI í lok verks
```
Hvert framleiðslu-deploy kostar 15 Netlify-krítur (≈ 10 sent); 1.031 deploy á 20 dögum
(hver ýting = deploy) keyptu $10 pakka daglega. `deploy.yml` keyrir því aðeins þegar
haus-commit ýtingar ber `[deploy]`, handvirkt (Run workflow), eða í morgunkeyrslu kl.
06:10 UTC sem deployar aðeins ef live `build.json` ≠ HEAD. Keyrslan gerir `build-dist.js`
→ `netlify-cli` og birtir **static-síðuna og föllin saman, atómískt**. Netlify's own Git
build is switched off for production (`[context.production] ignore = "exit 0"`), so PR
deploy-previews still build there but production comes only from Actions.

## ⚠️ NEVER run `node deploy.js`
It uploads only the *static* files from one machine and **silently deletes every
serverless function** (`kt-lookup`, `geocode`, `email-send`, `postur-reply`, …) —
breaking kennitala lookup, maps, email and every `/api/*` until the next
`git push` rebuilds them. It also overwrites the live site with whatever stale code
that machine holds. The script is guarded to refuse to run; keep it that way.

## build-dist bundling (grep gotcha)
`build-dist.js` bundles ~280 `js/patches/*.js` into 6 minified bundles. esbuild
writes Icelandic broddstafir as `\uXXXX` escapes, so a raw `grep` for `„Sækja"` on
`dist/` finds nothing. To confirm a string shipped, unicode-escape the needle:
```bash
python3 -c "print('Sækja'.encode('unicode_escape').decode())"   # -> S\xe6kja
```
then grep the bundle for that, or grep the source `js/patches/` instead.

## Verify a deploy landed
- **Functions/logic**: grep the built bundle (unicode-escaped) or hit the `/api/*`
  route directly.
- **UI in an iframe/app-page**: pages are cache-busted with `?v=<Date.now()>`; a
  page that shows a version stamp (e.g. `UTGAFA`) is the fastest way to see whether
  the browser is on the new build. Bump such a stamp on every change.

## Revert a bad deploy
Each push is a Netlify deploy id. Restore a known-good one:
```bash
curl -X POST -H "Authorization: Bearer $NETLIFY_TOKEN" \
  https://api.netlify.com/api/v1/sites/$NETLIFY_SITE/deploys/$DEPLOY_ID/restore
```
`NETLIFY_SITE = d22039b2-75f2-4206-b543-7c6176f2d181`. Then fix forward on `master`
— a restore is a stopgap, not a commit.

## If CI is down and you MUST deploy by hand
Use the SAME command CI uses (never `deploy.js`), so functions come along:
```bash
node build-dist.js
npx netlify-cli@latest deploy --prod --dir=dist --functions=netlify/functions \
  --site=d22039b2-75f2-4206-b543-7c6176f2d181
```
