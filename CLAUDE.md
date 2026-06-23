# CLAUDE.md — Slökkvitæki ehf web app

This file is read by Claude Code at the start of every session in this folder.
It contains everything Claude Code needs to know to be useful immediately.

---

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

- **Hosting**: Netlify (static site, no build step)
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

## Database schema

```
vidskiptavinir   (id, kennitala, nafn, simi, netfang, heimilisfang, athugasemdir, created_at)
fyrirtaeki       95+ companies, customer-like columns
uttaeki          306+ equipment rows
                 (id, serial, type, size, client, location, last_insp, next_insp,
                  status, pressure, created_at, phone, notes)
lanstaeki        loaned-out equipment
                 (id, serial, type, size, status, client, location, loaned_at, notes, created_at)
verkbeidnir      jobs / work requests
                 (id, num, status, customer, phone, dropoff, pickup, notes, created_at, verd)
solur            25+ sales as of 2026-05-01
                 (id, num, starfsmadur, customer_nafn, customer_id, linur (JSON),
                  upphaed_an_vsk, vsk_upphaed, afslattur, samtals, greitt_med,
                  athugasemdir, created_at)
                 NB `afslattur`: since 2026-06-12 the POS kr-discount comes off
                 the FINAL price m. vsk (5.200 − 200 = 5.000) and `afslattur`
                 stores that m.vsk saved amount; pre-2026-06-12 rows stored the
                 ex-VAT kr value. SalaInvoice.renderFromSale auto-detects per
                 row by checking which interpretation reproduces `samtals`.
sala_transactions  32 rows; older sales-tracking table
                   (id, customer, kennitala, items, total, type, status,
                    invoice_amount, paid_at, notes, created_at)
vorur            11 products (id, nafn, flokkur, mynd, verd_an_vsk, vsk_prosenta,
                              birgdir, virkt, lysing)
verkdagbok       (id uuid PK, created_at, job_date, fyrirtaeki, athugasemdir,
                  duft_size/h/y, lettvatn_size/h/y, kolsyra_size/h/y,
                  done bool, archived bool, archived_at)
```

---

## Setup status (all done)

- ✅ `js/patch-master.js` split into `js/patches/*.js`
- ✅ `verkdagbok_attachments` table + `verkdagbok-attachments` storage bucket exist in Supabase
- ⚠️ `deploy.js` is DEPRECATED & guarded off — it wipes the serverless functions. Deploy via `git push` → GitHub Actions ONLY (see Deploy workflow)
- ✅ Private GitHub repo at `aggisigurds-dev/slokkvitaeki`

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

## URL routing (deep links) — `js/patches/218-url-routing.js`

Views are deep-linkable by an ascii page name in the hash, e.g.
`slokkvitaeki.netlify.app/#leidsogn` (Leiðsögn), `#sala`, `#afgreidsla`.
The router wraps `App.switchView` (the nav fn in `js/modal.js`) to mirror the
current view into `location.hash` via `replaceState`, and applies an incoming
`#slug` on boot + on `hashchange`. `ALIAS` (in the patch) maps pretty ascii
slugs → internal view ids (`leidsogn→field`, `afgreidsla→counter`,
`fyrirtaeki→companies`, `tekjur→income`, `bokhald→bokhalds-yfirlit`, …); any
view without an alias is linkable by its own id (`#vorur`, `#companies`).
It ignores `key=value` hashes (`#device=`, `#portal=`, `#tab=`) and the legacy
`#view-…` form. Patch **154** (last-view-memory) was made to yield to any clean
slug hash so a deep link is not overridden by the remembered last view — keep
that cooperation if you touch either file. Add new pretty names to `ALIAS`.

## Bílstjóri (Drivers app) — `js/patches/219-bilstjori.js`

Mobile-first driver page (`view-bilstjori`, slug `#bilstjori`/`#drivers`). Fuses
Leiðsögn (patch 161) + Fyrirtæki í þjónustu + the `uttaeki` inspection model and
**reads/writes the same stores** (no parallel data):
- **Driving list** — in-service customers needing work (Útrunnið / Þessi mánuður /
  🚩 Áríðandi), coloured by the SAME `statusFor` rule as Leiðsögn (computed from
  `arsskodun_customers[id]` via `AppSettings`). "📋 Dagsins verk" vs "🏢 Allir í
  þjónustu" toggle + search.
- **Company sheet** — "🧭 Keyra þangað" (Google Maps, reuses the `_slokk_gc`
  geocode cache + `Leidsogn.addToRoute/launchNav`), tel: call, shared
  **minnispunktar** + an 🚨 **urgent** message (both saved to
  `arsskodun_customers[id]` via `AppSettings.save`, so they sync office↔driver and
  appear in Leiðsögn), and the **tækjalisti**: each tæki has a tap-to-roll chip
  ⚪ Óskoðað → 🟢 Yfirfarið → 🔵 Á verkstæði, writing `uttaeki.status`
  (+`last_insp`/`next_insp` on Yfirfarið — same columns `DB.addInspection`/patch 90
  write; `loaned` = á verkstæði/hleðsla).
- "✅ Tekið út" sets `field_inspected_year` (the amber "tekið út — skjöl eftir"
  state the office report flow then turns green). "🚗 Keyra leið dagsins" routes
  the due list via Leiðsögn.

Mobile rules applied: ≥44px targets, ≥16px text, primary actions in the bottom
thumb-zone, stack nav (top-left back), loading/error/offline (DB.cache) states.
Wired like patch 161 (sidebar button + `App.switchView('bilstjori')` hook + mirrors
`#bilstjori` into the hash). Linkable via patch 218 ALIAS. Full-screen: the view is
appended to `<body>` (so the `position:fixed` overlay isn't trapped by the content
panel's transformed ancestor) at `z-index:1000`, and `body.bs-active` hides the
sidebar; the company sheet sits at `z-index:1100`.

**Locked driver mode (`?driver`)**: the share link + the PWA `start_url` are
`/?driver`. When that param is present (`LOCKED`), the app opens straight into
Bílstjóri, drops the ✕ exit button, and any `App.switchView` away snaps back —
so a driver can only see Bílstjóri. The office keeps full access via the bare URL.
It's a focus lock, not security (client-side, anon Supabase key). The 🔗 button and
the boot deep-link re-assert (outlasts the sala.js boot-lander) live here too.

## Verkborð (unified work board) — `js/patches/231-verkbord.js`

One tool that replaces the cluster of overlapping top-of-sidebar lists
(Verkefni #145 · Þjónustuverk #172 · Beiðnir/Þjónustuver #182 · Eftirfylgni
#194) and folds in Verkdagbók #04. Slug `#verkbord` (and `#verkefni` → same).

- **Data: BEINT í `thjonustubeidni`** (the same table Beiðnir #182 already uses —
  no new table). Reads `select('*').is('deleted_at',null)`, inserts via quick-add,
  `update().eq('id',…)`, soft-delete sets `deleted_at`. Verkdagbók entries are read
  **live** from `verkdagbok` (done=false, archived=false) as read-through pseudo-rows
  (`id='vd:<uuid>'`, type `verkdagbok`) — clicking opens Verkdagbók to edit; ✓ writes
  `verkdagbok.done`. Structure of #04 is preserved (not copied/flattened).
- **Fast capture** front-and-center: type + Enter inserts a `thjonustubeidni` row
  (`status:'nytt'`, `source:'beint'`). One-tap type chips (Tilboð/Póstur/Skýrsla/
  Heimsókn/Annað → `type`).
- **Queues**: Í dag (important OR due≤today) · Allt opið · Lokað, + type-filter chips.
  Sort = áríðandi → útrunnið → gjalddagi → forgangur → nýjast. `due_at` drives the
  overdue (red) pill via `dueInfo()`.
- **TYPES** map includes the legacy #182 keys (`skodun_tilbod`/`nyr_samningur`/
  `uttekt_eftirfylgni`) so old rows still chip correctly; `TYPE_GROUP` maps filter →
  real type values.
- **AI**: reuses the existing `/api/tv-summary` (Haiku) endpoint — shows cached
  `summary` and a per-item ✨ Tillaga button. Deeper/auto AI is phase 2 (the schema
  already has `summary`; no migration was needed).
- **Migration** (explicit, idempotent): „⬇︎ Flytja inn úr gömlu" imports OPEN items
  from `AppSettings.todo` (cards) + `AppSettings.thjonustuverk` (cases), deduped by
  `channel_ref='imp:verkefni:<id>'`/`'imp:tverk:<id>'`. Beiðnir already live in the
  table; Eftirfylgni is derived state (not imported).
- **Retire-old (once, reversible)**: on first open, adds
  `['verkefni','thjonustuverk','thjonustuver','eftirfylgni']` to `sidebar_hidden`
  and prepends `verkbord` to a custom `sidebar_order` if one exists, guarded by
  `settings.verkbord.retired_v1`. Un-hide anytime in Stillingar → Valmynd. Old
  patches/data are untouched. Placed at the **top** of the sidebar via patch 68's
  ORDER (`['Verkborð']` first).
- Wired the 3 standard spots: `<script>` in index.html (after 230), `App.switchView`
  hook (`patchSwitchView`), and patch 218 ALIAS. `window.Verkbord = {open,reload,importOld}`.

## Bakendi (gagnalíkans-stjórnborð) — `js/patches/232-bakendi.js`

Admin / „backend" page over the data model. View `view-bakendi`, deep-link
`#bakendi` (patch 218 ALIAS). Five tabs:
- **📊 Yfirlit** — per-table row counts + „gagnaheilsa" cards (clickable → jump
  to the relevant tab): fyrirtæki without kt, úttæki not linked to
  `customers_base`, orphan client strings, viðskiptavinir without kt.
- **🔗 Client-greining** — data genealogy: every `uttaeki.client` free-text
  string classified 🟢 linked to `customers_base` / 🟡 name-match only / 🔴
  orphan, with search + filter; links through to the company page.
- **🏢 Rekstrarfélög** — rollup from `customers_base.rekstrarfelag` + equipment
  count; links to the Rekstrarfélög page.
- **🗺️ Skema** — the data model + FK relationships with live row counts; flags
  the `tengiliður`/`tengilidur` duplicate column on `fyrirtaeki`.
- **🛠️ Endurhönnun** — known data problems + suggestions, and a live „vantar
  kennitölu" list (sorted by equipment count — those that own tæki first).

**Data: four read-only Postgres views** (created 2026-06-22, `SELECT` to `anon`):
`v_bakendi_overview` · `v_bakendi_uttaeki_clients` · `v_bakendi_rekstrarfelog` ·
`v_bakendi_missing_kt`. The frontend only does `DB.sb.from(view).select('*')` —
no writes, no schema change.

Wiring mirrors kerfi-registry (221): new `view-bakendi` div, cloned sidebar
button, `App.switchView` patched for the `#bakendi` deep-link + boot re-assert.
`window.Bakendi = {open, reload}`. NB built in a parallel session as patch 231,
then renumbered to **232** because Verkborð (#196) landed on slot 231 first.

## Sjálfvirk PDF-vistun úttektar-skjala — `js/patches/233-uttekt-pdf-autosave.js` (+168/165)

Þegar **úttektarskýrsla** er búin til (patch 168, „📄 Búa til úttektarskýrslu") eða
**heimsókn kláruð með reikningi** (patch 165 `finalizeVisit`, „✓ Klára heimsókn") er
skjalið teiknað sem PDF (jsPDF vektor-texti) og vistað **SJÁLFKRAFA** sem ársmerkt
fyrirtækjaviðhengi gegnum `CompanyAttachments.upload(coId, file, {year, kind})` →
birtist strax í „Skjöl & viðhengi" árstöflunni (patch 199), í úttektarskýrslu-
(`kind:'skyrsla'`) eða reikningsdálki (`kind:'reikningur'`) ársins.

- **Skráarheiti:** `<Fyrirtæki> - <kt> - <ár> - úttektarskýrsla.pdf` ·
  `<Fyrirtæki> - <kt> - <ár> - R-xxxxxx.pdf`.
- **Reikningurinn** er teiknaður í patch 233 (`window.UttektInvoicePdf.saveForSale(coId, sale)`)
  — sækir nafn+kt úr `fyrirtaeki`, línur/tölur úr `solur`-röðinni; seljandi
  Slökkvitæki ehf kt 600508-0400.
- Patch 168 fær líka **rétt skráarheiti á handvirka „💾 Vista" takkanum** + sjálfvirka
  vistun við opnun, með **tvíritunarvörn** (sleppir sjálfvirkri vistun ef
  úttektarskýrsla ársins er þegar til; reikningur ef R-númerið er þegar vistað).
- **NB geymslustaður:** vistast í Supabase `samningar` bucket (sama og handvirk
  viðhengi patch 111), **EKKI í Google Drive „Allt" möppuna** — þessi vefur hefur
  ekki Drive-aðgang (engin googleapis/OAuth Netlify-function). Drive-pörunin lifir í
  Brunahólf-appinu (sjá „Laga pörun í Brunahólf →" hlekkinn á skjalaspjaldinu). Ef
  á að lenda í Drive þarf að flytja Drive-OAuth + upload-function úr Brunahólf.

## Related projects (in case Agnar mentions them)

- **Brunahólf** — sister business, separate ecosystem (Google Sheets + Apps Script
  + Tímavera + Ajour). See COWORK-brunaholf.md if relevant.
- **Slökkvitæki app** — this project. Pure code, lives on Netlify + Supabase.
