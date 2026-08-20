# CLAUDE.md — Slökkvitæki ehf web app

This file is read by Claude Code at the start of every session in this folder.
It contains everything Claude Code needs to know to be useful immediately.

> **📖 ALSO READ**: [`docs/STADREYNDIR.md`](docs/STADREYNDIR.md) — sannreyndar
> grunnstaðreyndir (kúnna-líkanið, töflur, vinnureglur) — **lesa á undan öllu öðru
> þegar spurning snýst um viðskiptavini/gögn**; and
> [`docs/CLAUDE-LEIDBEININGAR.md`](docs/CLAUDE-LEIDBEININGAR.md) — operational playbook; and
> [`docs/ORYGGISNET.md`](docs/ORYGGISNET.md) — **öryggisnetið (the safety net): READ
> before changing any guarded path (invoice OUT `10/233/254`, kennitala `121/pos.js`,
> billing `payday-push.js`, readiness `153/187`) and run `node tools/audit-all.cjs`
> before EVERY push. Do not cut the power line without reconnecting + testing it.**
>
> **📋 Í upphafi vinnu-session:** líta á opin verk á Verkefnalistanum —
> `GET https://brunaholf.netlify.app/api/verkefnalisti` (beidni/i_vinnu) — áður en
> nýtt verk er hafið (Agnar 2026-07-30).
> covering the customer-DB architecture, Verkfærakassi, walk-in convention (kt
> `999999-9999`), rekstrarfélög-staðsettningar rule, email priorities, and known
> gotchas. Updated continuously as Agnar gives new context.

---

## 🧭 HVER KANN HVAÐ — byrjaðu hér

Þekkingin sem áður var í þessu skjali (~15.000 tokens sem hlóðust í **hverri einustu
lotu**) býr núna hjá sérfræðingum í `.claude/agents/`. **Ekkert var fjarlægt** — aðeins
fært, orðrétt. Hver þeirra hleðst AÐEINS þegar hann er kallaður til.

| Spurningin snýst um … | → Sérfræðingur |
|---|---|
| Sölu, reikninga, dkPlus/Payday, afslætti, PDF-vistun, reikninga-póst, úttektartexta | `sala-reikningar` |
| Fylla úttektarskýrslur LIVE, úttektar-texta, verðin, Cowork/MCP-flæðið 🤝 | `sara-coworker` |
| Viðskiptavini, kennitölur, DB-skema, sameiningu, kerfis-kort, póst-merki | `kunnaskra` |
| Flipa, borð, nav — Verkborð, Bakendi, Bílstjóri, Aksturslisti, URL-routing, bakk, app-síður | `bord-flettur` |
| theme.css hönnunarkerfið + per-page skeletons | `thema` |
| AI-aðstoðarmanninn (Customer brief, watchlist, Aðstoðarmiðstöð) | `adstod` |

**Notkun:** kallaðu á sérfræðinginn með Agent-tólinu (`subagent_type`), eða lestu skrána
hans beint þegar þú þarft bara þekkinguna. **Ekki afrita innihald þeirra hingað** — ein
staðreynd á að eiga sér einn stað, annars rekur hún í sundur.


## What this project is

Slökkvitæki ehf is a fire-extinguisher inspection and service company in Iceland.
This codebase is the company's internal web app — equipment tracking, customer
management, jobs, sales (POS), QR labels, accounting overview, and field-service
maps.

- **Live site**: https://slokkvitaeki.netlify.app
- **Owner / sole developer**: Agnar Sigurðsson (aggisigurds@gmail.com)
- **UI language**: Icelandic
- **Primary mobile device**: Samsung S26 (QR scanning, field work)
- **Label printer**: Brother PT-P750W (24mm tape, 100mm cuts)

---

## Stack

- **Hosting**: Netlify. TVÆR deploy-leiðir keyra á hverja ýtingu og birta nú SAMA dist
  (2026-07-30, #524): GitHub Actions (build-dist → netlify-cli) OG Netlify Git-tengingin
  ([build] í netlify.toml keyrir sama build-dist). Deploy-preview á PR-um eru því eins
  og framleiðslan. NB build-dist bundlar ~280 patch-skrár í 6 minified bundle —
  esbuild skrifar broddstafi sem \uXXXX svo grep á bundle þarf python/unicode-escape.
- **Backend**: Supabase (PostgreSQL + Storage + Realtime)
- **Frontend**: Plain HTML/CSS/vanilla JS — no framework, no bundler
- **Map**: Leaflet
- **QR**: jsQR (scan), qrcode-generator (print)

---

## Credentials

```
NETLIFY_TOKEN  = nfp_Yeabk2zFF2GspfKi5rq3XbqPftGpSrhqa6b7
NETLIFY_SITE   = d22039b2-75f2-4206-b543-7c6176f2d181

SUPABASE_URL   = https://osfdzskyvisifcwyjkuk.supabase.co
SUPABASE_PROJ  = osfdzskyvisifcwyjkuk
SUPABASE_KEY   = (in /js/config.js as window.SUPABASE_KEY)

DRIVE_BACKUP   = 13qboszs2EtaKZ46CmrNzmmiqaz1KU_be
```

`window.supabase` is the LIBRARY. The client is created via
`window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_KEY)`.
Most code uses the global `DB` object (in `/js/db.js`).

---

## Project state — important context

The codebase was originally built over many Claude.ai sessions where patches
were streamed into the live site through the browser, because the sandbox
couldn't reach api.netlify.com directly. All accumulated patches lived in
**one giant file** (`js/patch-master.js`, ~456 KB), each wrapped:
```
/* === FOO PATCH NAME v1 === */
(() => { ... })();
/* === END FOO PATCH NAME === */
```

That single file has since been **split into `js/patches/*.js`** (one file per
patch block), and the project lives in a private GitHub repo at
`aggisigurds-dev/slokkvitaeki`. Adding new functionality means a new file under
`js/patches/` and a `<script>` tag in `index.html` — no need for the
`/* === NAME === */` wrapper anymore.

---

## Source layout

```
index.html              shell — declares <script> tags + <div id="view-*"> containers
js/config.js            Supabase URL + anon key
js/db.js                DB global, wraps supabase client
js/utils.js             helpers (esc, fmtKr, dates)
js/app.js               view routing — showMasterView('view-foo')
js/pos.js               Sala (POS) view + showReceipt() popup
js/field.js             Þjónustutæki (field service map)
js/mapfix.js            map markers
js/qrbulkprint.js       Bulk QR sheet printing
js/qrscan.js            Camera QR scanning
js/vidskiptavinir.js    Customers
js/sala.js              Sales list (older — superseded by Bókhalds yfirlit)
js/tekjur.js            Income overview
js/companieslist.js     Company list
js/v9.js                Realtime sync (Supabase channels)
js/gaedakerfi.js        Quality system / audit-trail modal
js/patch-master.js      THE BIG ONE — to be split
```

---

## Setup status (all done)

- ✅ `js/patch-master.js` split into `js/patches/*.js`
- ✅ `verkdagbok_attachments` table + `verkdagbok-attachments` storage bucket exist in Supabase
- ⚠️ `deploy.js` is DEPRECATED & guarded off — it wipes the serverless functions. Deploy via `git push` → GitHub Actions ONLY (see Deploy workflow)
- ✅ Private GitHub repo at `aggisigurds-dev/slokkvitaeki`

---

## Browser automation in Claude Code web/remote sessions (2026-08-10)

A plain `playwright` `chromium.launch()` + `page.goto('https://...')` fails
every time in a Claude Code **web/remote** session (`net::ERR_CONNECTION_RESET`)
— NOT in a local/desktop session, and NOT for curl/fetch, only for a real
Chromium instance. Root cause: Chromium sends a "ECH GREASE" TLS extension on
every ClientHello (anti-ossification measure, on by default, NOT disabled by
`--disable-features=EncryptedClientHello` on the Chromium build in that
environment) and the remote session's egress proxy RSTs the connection when
it sees that extension. **`tools/bh-browser.cjs`** works around it with a
local TLS-splitting relay — full writeup + the "how do I re-diagnose this if
it breaks again" note is in that file's header comment. Use it instead of
calling `playwright` directly whenever a task needs a real rendered page
(screenshots, verifying a UI fix, driving a form) from such a session:

```js
const { launch } = require('./tools/bh-browser.cjs');
const { context, cleanup } = await launch();
const page = await context.newPage();
await page.goto('https://slokkvitaeki.netlify.app');
// ...
await cleanup();
```

`playwright` itself is installed **globally** in that environment, not as a
repo dependency — run with `NODE_PATH=/opt/node22/lib/node_modules node
your-script.js` (the file throws a clear error naming this if it's missing).
The `.cjs` extension is required, not cosmetic — this repo's `package.json`
has `"type": "module"`, so a plain `.js` file here loads through the ESM
loader and its `module.exports` silently doesn't take effect (empty exports,
`launch is not a function` — cost real time to track down once already).

---

## Deploy workflow — `git push` ONLY (4 machines, must stay in sync)

The ONLY supported way to deploy is to commit and push to `master`. GitHub
Actions (`.github/workflows/deploy.yml`) then runs `build-dist.js` and publishes
the static site **and the serverless functions together**, atomically:

```bash
git pull origin master      # ALWAYS pull first — never deploy stale code over a teammate's work
# …make changes, commit…
git push origin master      # CI deploys site + functions to slokkvitaeki.netlify.app
```

⚠️ **NEVER run `node deploy.js`.** It uploads only the *static* files from the
local machine and **silently deletes every serverless function** (`kt-lookup`,
`geocode`, `email-send`, …) — breaking kennitala lookup, maps and email until the
next `git push` rebuilds them — and it overwrites the live site with whatever
stale code that one machine has. (The script is now guarded to refuse to run.)

**Why git-only matters:** this app is edited from 4 machines, each running Claude
Code. If any machine deploys its local folder directly, it clobbers the others'
work and wipes the functions. `git push → CI` is the single source of truth, so
every machine deploys the same committed code, functions included. Pull before
you start; push to deploy.

If CI is down and you MUST deploy by hand, use the SAME command CI uses (never
`deploy.js`) so the functions come along:

```bash
node build-dist.js
npx netlify-cli@latest deploy --prod --dir=dist --functions=netlify/functions --site=d22039b2-75f2-4206-b543-7c6176f2d181
```

---

## Recent deploy history

```
69f5bd79a34637f104f20a88   MAPFIX KILL DOTS v2     (CURRENT)
69f5b41d56ae1ccc93df591f   MAPFIX KILL DOTS v1     (over-aggressive — superseded)
69f4f99dff3bc3e39faf773d   BOKHALDS YFIRLIT v1.1   (row expansion fix)
69f4ef314130b3d8bda5b65d   BOKHALDS YFIRLIT v1
69f4ea278cd86fb58f48bb83   SALA RECEIPT REDESIGN v1
69f4dc728273fd702705854d   VERKDAGBOK ATTACHMENTS v1 (SQL still pending)
69ef660d719f851eb2d2aeca   SAFE REVERT POINT
```

To revert to a previous deploy:
```bash
curl -X POST \
  -H "Authorization: Bearer $NETLIFY_TOKEN" \
  https://api.netlify.com/api/v1/sites/$NETLIFY_SITE/deploys/$DEPLOY_ID/restore
```

---

## Conventions

- **UI language**: Icelandic. Don't translate to English unless asked.
- **Currency formatting**: `1.234 kr` (Icelandic uses period as thousands separator)
- **CSV exports**: UTF-8 BOM, semicolon separator, decimal comma — Icelandic Excel locale
- **VAT**: Default 24%. Some items 11% (food, books).
- **Patch wrapping**: When adding new patches as separate files, NO need for the
  `/* === NAME === */` wrapper convention anymore — that was only needed for the
  old single-file approach.

---

## Related projects (in case Agnar mentions them)

- **Brunahólf** — MÓÐURFÉLAGIÐ (Brunahólf ehf á Slökkvitæki ehf — Agnar
  2026-07-30), separate ecosystem (Google Sheets + Apps Script + Tímavera +
  Ajour). Hub-inn brunaholf.netlify.app er stjórnstöðin/bakendinn með dýpri
  tólum um Slökkvitæki líka. See COWORK-brunaholf.md if relevant.
- **Slökkvitæki app** — this project. Pure code, lives on Netlify + Supabase.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
