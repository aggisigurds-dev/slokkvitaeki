# CLAUDE.md — Slökkvitæki ehf web app

This file is read by Claude Code at the start of every session in this folder.
It contains everything Claude Code needs to know to be useful immediately.

> **📖 ALSO READ**: [`docs/CLAUDE-LEIDBEININGAR.md`](docs/CLAUDE-LEIDBEININGAR.md) — operational playbook
> covering the customer-DB architecture, Verkfærakassi, walk-in convention (kt
> `999999-9999`), rekstrarfélög-staðsettningar rule, email priorities, and known
> gotchas. Updated continuously as Agnar gives new context.

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

## Bakk-takkinn — ÞRÍR patchar, ekki blanda þeim saman

Bakk er leyst á þremur aðskildum lögum. Áður en þú breytir einhverju hér:
lestu öll þrjú, því þau grípa sama atburðinn.

- **`18-nav-history.js` — AFVIRKJAÐUR (`return` í línu 23, síðan 2026-05-12).**
  Hann rændi innbyggðu „Til baka"-tökkunum og keyrði þá gegnum eigin stafla sem
  fór úr takti við það sem var raunverulega á skjánum („Til baka gerir ekkert"
  gallinn; patchar 100 + 136 voru bara til að afvopna hann). **Ekki endurvekja.**
- **`276-brunakerfi-back.js` — bakk lokar efsta LAGI** (gluggar, form, ritlar,
  verðlista-ritill, greiðsluglugginn …). Ýtir færslum **án** slóðarbreytingar.
  Í uppsettu öppunum (`/app/<key>/`) er læst buffer svo bakk loki aldrei appinu;
  Bílstjórinn á sitt eigið `armBack` í 219.
- **`277-nav-back.js` — bakk fer á fyrri SÍÐU í appinu** (2026-07-22, ósk
  Agnars: bakk „turned off the program" hversu langt sem maður var kominn inn).
  Ástæðan: 218 og 235 skrifa slóðina viljandi með `replaceState`, svo appið bjó
  ALDREI til bakk-færslu — `history.length` stóð í stað hvað sem flakkað var.
  277 vefur EKKI utan um `switchView`/`setHash`; hann tekur eftir því þegar
  slóðin breytist eftir notenda-aðgerð án þess að sagan lengist og endurgerir þá
  skrifin sem alvöru færslu. Þess vegna nær hann líka yfir borð-patchana sem
  skrifa sinn eigin hash (219/231/232/239). Beðið er eftir að slóðin sitji kyrr
  (~240ms) svo tveggja-skrefa skrif 235 (`#fyrirtaeki` → `#company/293`) gefi
  EINA færslu en ekki tvær.

Lögin stafla rétt: 276 situr ofan á 277, svo bakk lokar fyrst opnum glugga og
fer svo á fyrri síðu. **Ef þú bætir `pushState` við einhvers staðar annars
staðar skaltu athuga hvort 277 sé þegar búinn að því** — annars fær ein aðgerð
tvær færslur og notandinn þarf að ýta tvisvar á bakk.

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

**Locked driver mode (`?driver` / `/app/bilstjori/`)**: the share link + the PWA
`start_url` are `/app/bilstjori/` (own manifest `manifest-bilstjori.json` with
`id`/`scope`/`start_url` `/app/bilstjori/` + own icons `img/app-bilstjori-*.png`,
so it installs as a SEPARATE app from the main one — whose `manifest.json` has
`"id": "/"` + `start_url "/"`); `/?driver` stays a valid legacy alias. When that param is present (`LOCKED`), the app opens straight into
Bílstjóri, drops the ✕ exit button, and any `App.switchView` away snaps back —
so a driver can only see Bílstjóri. The office keeps full access via the bare URL.
It's a focus lock, not security (client-side, anon Supabase key). The 🔗 button and
the boot deep-link re-assert (outlasts the sala.js boot-lander) live here too.

## Aksturslisti (vakt-yfirlit skrifstofu) — `js/patches/268-aksturslisti-vakt.js`

Sjálfstæð skrifstofu-síða (view `view-aksturslisti`, slug `#aksturslisti`/`#vakt`,
hliðarstiku-hnappur „🚚 Aksturslisti") — les-only yfir `bilstjori_vakt` (patch 219)
+ `arsskodun_customers` (akstur 1/2/3) + `uttaeki`. Fjórir hlutar: **🗺️
Akstursleiðir** (3 leiðir + fyrirtækin á þeim, N/M kláruð, gráir→grænir strikaðir),
**🔧 Á verkstæði — á eftir að skila** (`uttaeki.status='loaned'` grúppað per
`client`), **👷 Starfsmenn í dag** (samantektar-spjöld: 🏢 fyrirtæki · 🟢 yfirfarið
· 🔵 verkstæði · ✅ kláruð · Σ), **kort** (síðasta staðsetning + slóð dagsins per
starfsmaður) og **🧭 Rakning dagsins** (tímaröð aðgerða). Verkstæðis-lífsferill: „Á verkstæði"-hlutinn er nú **gagnvirkur** — hvert tæki
(`uttaeki.status='loaned'`) fær verkstjóra-þrep gegnum `custody_status`: null
(Nýkomið) → `komid` (Komið á verkstæði) → `tilbuid` (+ `service_choice`
hladid/onytt/nytt) → `farid` (Farið af verkstæði → „Bíður skila hjá bílstjóra").
Bílstjóri (219) skilar: 🔵 Á verkstæði-chip → tapp → 🟢 Yfirfarið (status='ok',
hreinsar custody_status/service_choice), svo tækið dettur af verkstæðis-borðinu.
Bílstjóri fékk líka 🗑 **eyða-tæki** takka (leiðrétting þegar skýrsla var mistalin).
Dags-val (◀ Í dag ▶) +
starfsmanna-sía + 60s auto-refresh. Wiring: script í index.html (eftir 267),
`App.switchView`-hook, patch 218 ALIAS (`aksturslisti`/`vakt`), klónaður
hliðarstiku-hnappur. `window.Aksturslisti = {open, reload}`.

**Vakt — starfsmanna-nafn + dagleg virkni + staðsetning (2026-07-14):** driver
picks their name (`EMPLOYEES = ['Hákon','Binni','Elías']`, stored `localStorage
.bs_employee`; locked-boot prompts if unset, office can skip). Every action is
logged to Supabase table **`bilstjori_vakt`** (`employee, action, co_id, co_nafn,
uttaeki_id, lat, lng, created_at`; RLS off, anon full) via `logAct(action,opts)`
with best-effort `navigator.geolocation` (watchPosition). Actions: `visit`
(openCompany), `yfirfarid`/`verkstaedi` (tæki chip-roll), `company_done` (Klára
úttekt), `ping` (every 4 min). A **„📊 DAGURINN Í DAG"** band on the main list
(`#_bs-vakt`, `renderVakt`) shows per-driver today: 🏢 distinct fyrirtæki · 🟢
yfirfarið · 🔵 á verkstæði · Σ heild · last-seen; polls every 60s so the office
sees all drivers live. Each driver's last-known position draws a coloured
name-marker on the map (`_driverMarkers`, `_vaktGeo`). API: `window.Bilstjori
= {…, renderVakt, pickEmp, getEmp}`.

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
- **Þjónustuver-samruni (2026-07-10, ósk Agnars — „nota bara borðið fyrir öll
  samskipti"):** Verkborð er nú EINI þjónustuverið. Quick-skráningarlínan fékk
  fyrirtækjareit (datalist úr `fyrirtaeki`, tengir `customer_base_id` við nafna-
  match) + lita-tegundarchippa + „⚙ Fleiri valkostir" (skráir OG opnar ritilinn
  strax). „✉️ Sækja tölvupóst" chip endurnýtir póst-innsogið úr Þjónustuveri
  (`Thjonustuver.ingestEmail`, exportað úr 182 — sama `thjonustubeidni`-tafla,
  idempotent á `channel_ref='email:<id>'`). **Svara beint af borðinu:** email-
  beiðnir (`source='email'` / `channel_ref` byrjar á `email:`) fá „✉️ Svara"-takka
  í ritlinum → `replyToBeidni` flettir upp `email_digest`-röðinni og kallar
  `ReikningaPostur.replyTo(m)` (exportað úr 240) — sami Claude-uppkast (`/api/
  postur-reply`) + Resend-sending (`/api/email-send`) og í Reikninga-pósti.
  `replyTo` er sjálf-innihaldið (sprautar sína `#_rp-modal` stíla, festir á
  `<body>`, tengir sendanda-netfang → kúnna fyrir reikninga-samhengi). Röðunar-
  chippar (⭐ Snjallröðun / 🕒 Nýjast efst) og sýn-rofi (☰ Þétt / ▤ Ítarlegt).
  **Sími-fyrst (2026-07-10, eftir „algjörlega ónothæft"-kvörtun):** stjórn-
  borðið fyllti heilan símaskjá áður en fyrsta verkefnið sást → allar chippa-
  raðir eru nú EIN skrunanleg lína (`.vb-scroll`, nowrap+overflow-x) í stað
  5-línu veggja. Fyrsta útgáfan faldi aukahlutina bak við fókus/„⚙ Meira" en
  Agnar hafnaði því („settu aftur tögin… eða revert") — ALLT er sýnilegt, bara
  þjappað. show() speglar líka `#verkbord` í hash sjálft — 231-switchView-
  wrapperinn skammhleypir framhjá 218-speglinum svo hash sat áður fast á #sala.
  **Þjónustuborð v2 (2026-07-10, eftir greiningu + „now you are head office
  CRM manager"):** Full endursmíði ofan á Verkefni/Pósthólf-skiptinguna.
  Biðraðir: **📥 Innhólf** (email, `promoted_at IS NULL`, `archived_at IS
  NULL`) · **📋 Verkefni** (handvirkt + fært yfir) · **✓ Lokað**. Innhólfið er
  í köflum: „🔴 Bíða svars" (ósvarað, ELSTU efst, biðdagar á chippa) → „Svarað
  & upplýsingar" → „📦 Sýna eldri póst (N í geymslu)". Morgunlína efst í
  stjórnborðinu („X póstar bíða svars · Y verk í dag · Z fram yfir") og
  badge-inn telur wait+idag. **Flokkarnir fimm** (`thjonustubeidni.flokkur`,
  additive: tilbod/thjonusta/brunakerfi/rukkun/samskipti + null=Annað) voru
  áður aðal-sían og eigin (ljós) chippa-tegund á röðum. **2026-07-22 (PR #456,
  ósk Agnars „það sýnir tvær tegundir af tögum") var þetta sameinað í EITT
  merkjakerfi:** flokkurinn hefur enga eigin chippa-tegund og engan fellilista
  í ritlinum lengur, heldur er þýddur yfir í sitt eigið MERKI gegnum
  `FLOKK_TO_TAG` (rukkun → „Eftir að rukka") og birtist fremst sem venjulegur
  dökk-metal chip. `rowChips(r)` = flokks-merkið ∪ `dispTags(r)` og er notað
  fyrir chippa, síur, talningar OG hökin í ritlinum, svo hak og chip segja
  alltaf það sama; `tagtoggle` hreinsar flokkinn þegar slökkt er á merki sem
  hann leiðir af sér. TÖG-sían tekur nú FLEIRI en eitt merki (`state.fTags`
  fylki, sameining, „✕ Hreinsa"). `flokkChip`/`TAG_TO_FLOKK` eru horfin og
  flokka-sían (`fFlokk`) er óvirk — hún átti enga hnappa en las samt vistað
  gildi úr localStorage, sem hefði síað borðið án leiðar til að slökkva.
  `flokkur`-dálkurinn sjálfur stendur óbreyttur í grunninum. „Svarað"-greining:
  `svarad_at` (sett þegar svar er SENT af borðinu — 240 `replyTo` kallar
  `m._onSent`) EÐA `threadLatest.mine` (SENT-ingest gerir það satt). Aðgerðir:
  📋 Færa/↩, 📦 Í geymslu/↩ Út, ✓ Klára verk, 📞 Hringja (tel:-hlekkur úr
  fyrsta símanúmeri), ✉️ Svara, 🧾 Fyrri viðskipti. **CRM-forvinnsla í grunni
  (2026-07-10):** 348 tómar browser-extension raðir eyddar úr email_digest;
  70 beiðnir tengdar við customers_base (kt→netfang→lén ladder); allar opnar
  flokkaðar í flokkana fimm (leitarorð/merki/tegund); 406 gamlar póst-raðir í
  geymslu (`archived_at`, ekkert eytt); 75 opin atriði FLUTT INN úr gömlu
  listunum (145 todo-spjöld + 172 þjónustuverk-mál, `channel_ref
  imp:verkefni:/imp:tverk:`, merki/forgangur/fyrirtæki fylgdu); AI-samantekt
  (tv-summary) á öll virk verk; 1 „✅ líklega búið" (greitt í Payday).
  **Sent-póstur:** luna-bridge les nú SENT-möppur (PR #4) og brunaholf
  gmail-ingest tekur `folder=sent` (PR #225, + tómra-pósta vörn í
  email-ingest-browser og folder-varðir á lesendum); 240 síar `.neq('folder',
  'SENT')` svo eigin svör birtist ekki sem „Til að svara", en 231
  loadThreadLatest les SENT viljandi (svarað-greining). Fyrirtækjareiturinn í
  skráningarlínunni tekur líka KENNITÖLU: 10 tölustafir → `/api/kt-lookup`
  (RSK) → opinbera nafnið fyllist og kt+heimilisfang fara í nótur
  (`state.addRsk`).

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
reads stay view-based — but **2026-06-23** the „Vantar kennitölu" list (Endurhönnun tab) is inline-editable: type a kt + „Vista" → `saveMissingKt` writes it to the source table (`fyrirtaeki`/`vidskiptavinir`/`customers_base`, `update({kennitala}).eq('id',…)`) and drops the row + decrements the count. No schema change.

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
  sem **vektor-eftirmynd af prent-forskoðuninni** (SalaInvoice): logo + seljandi
  (branding úr `AppSettings`), kaupandi m/ heimilisfang+kt, reiknings-haus
  (dags./greiðsluskilmáli/starfsmaður), línutafla (Vörunr./Lýsing/Fjöldi/Einingav./
  Upphæð/VSK-kóði) og „Samtals fyrir Vsk" + VSK-sundurliðun per taxta + „Til
  greiðslu" + reglugerðar-fótur. Sækir nafn+kt+**heimilisfang** úr `fyrirtaeki`,
  línur/tölur úr `solur`-röðinni; seljandi Slökkvitæki ehf kt 600508-0400.
  **html2canvas-myndataka var vísvitandi EKKI notuð** — hún teiknar autt í vafra
  Agnars (sjá patch 168), svo vektor-leiðin er notuð (prentast í öllum vöfrum,
  valanlegur texti, lítil skrá).
- **Afsláttur á hvern lið (2026-07-08, patch 129+165):** Afsl.-dálkur (%) í
  Heildarkostnaðar-töflunni — þjónustulínur geymast í trip-state `line_disc`
  (lykill `svc|<tegund>|<stærð>|<kind>`), extras á `extras[i].disc_pct`. Línu-
  samtala = fjöldi × round(verð×(1−afsl%)); per-stk sýnist óbreytt. Reikningurinn
  (165 `scrapeCostRows`/`buildLinur`) les Afsl.-reitinn og setur AFSLÁTTAÐ
  einingaverð + „· −X% afsl." í línulýsinguna — flæðir þannig rétt í solur/
  SalaInvoice/PDF (233) án schema-breytinga. Heildar-afslátturinn (%) er áfram
  til og leggst OFAN Á línuafslætti.
- **Totals-leiðrétting (patch 165 `finalizeVisit`):** salan er nú vistuð með
  `upphaed_an_vsk`/`vsk_upphaed`/`samtals` **reiknuð beint úr `linur`**
  (`totalsFromLinur` = sama stærðfræði og SalaInvoice prentar), EKKI lengur skafin
  úr patch-129 DOM-inu (`readTotalsFromSection` fjarlægt). Eldra skröpið setti VSK-
  upphæðina sem heildartölu (vsk_upphaed=0, samtals = án-vsk × 0,24) — sást á
  Bókhalds-yfirliti; 7 raðir (R-000356/357/358/363/365/371/372) voru líka
  leiðréttar í gagnagrunni úr `linur`.
- Patch 168 fær líka **rétt skráarheiti á handvirka „💾 Vista" takkanum** + sjálfvirka
  vistun við opnun, með **tvíritunarvörn** (sleppir sjálfvirkri vistun ef
  úttektarskýrsla ársins er þegar til; reikningur ef R-númerið er þegar vistað).
- **NB geymslustaður:** vistast í Supabase `samningar` bucket (sama og handvirk
  viðhengi patch 111), **EKKI í Google Drive „Allt" möppuna** — þessi vefur hefur
  ekki Drive-aðgang (engin googleapis/OAuth Netlify-function). Drive-pörunin lifir í
  Brunahólf-appinu (sjá „Laga pörun í Brunahólf →" hlekkinn á skjalaspjaldinu). Ef
  á að lenda í Drive þarf að flytja Drive-OAuth + upload-function úr Brunahólf.

## Afsláttar-samræming (úttekt 2026-07-08) — 121/142/165/233

Full-system discount audit found & fixed three writer bugs. **The one supported
convention for sale-level discounts is the POS one:** `linur` carry FULL unit
prices, `afslattur` = kr saved off the FINAL price m. vsk (gross), `samtals` =
brúttó − afslattur, `upphaed_an_vsk`/`vsk_upphaed` scaled proportionally (VSK
takes the rounding remainder so ex+vsk === samtals). Per-line discounts are
instead BAKED into `unit_price_ex_vat` with a „· −X% afsl." desc suffix (the
165 convention). NEVER both bake into lines AND store `afslattur` — that's the
double-discount bug; and never store per-line `discount_pct` together with
`afslattur > 0` (renderFromSale case B drops both).

- **121 (Sótt)**: used to scale lines AND store afslattur (reprints double-
  discounted), and silently DROPPED the draft's POS discount. Now: lines stay
  full, `afslattur` = draft-afsl + pickup-% on the remainder; preview shows
  „Afsláttur úr sölu". 16 pre-fix rows were repaired in DB (afslattur→0, their
  linur already carried the discount).
- **165 (Klára heimsókn)**: the patch-129 GLOBAL Afsláttur (%) was never read —
  invoice saved at full price while the table showed the discounted total. Now
  `collectVisit` reads `trip.discount_pct` and `totalsFromLinur(linur, g)`
  stores it as gross `afslattur` (same math as the table: netto = brúttó×(1−g)).
- **142 (SaleEditor)**: recompute ignored `afslattur` and the save omitted it —
  any save wiped the discount out of samtals but left the stale column (print ≠
  bókhald). Now an „Afsláttur (kr m. vsk)" field, initialized from the gap
  brúttó−samtals (handles both gross and legacy ex-VAT rows; 0 for already-
  broken rows so saving heals them), applied+saved like POS. If line
  `discount_pct` + kr-afsl are combined, line discounts are baked at save.
- **233 (PDF)**: gross-mode now scales the per-rate VSK buckets by the discount
  factor (like SalaInvoice totalsByRate) — archived PDFs no longer overstate VAT.

2026-07-09 status: the "fixes 4-7" batch closed the rest of the audit list —
renderFromSale line-disc + kreditreikningur print, dk-push (brunahólf solur.js
now carries afslattur/discount_pct/vsk_pct, payday-push discount via #250),
pos.js kr-input comma/dot parse, and lookupKt max-wins (mitigated at the WRITE
sites: 158 + 255 mirror afslattur_pct to every fyrirtaeki/vidskiptavinir row
sharing the kt, so lowering propagates). Patch 227 trip-resurrect was ALSO
fixed in #317 (removeItem → cloud tombstone `_deleted:true`, newest-wins).
The discount-audit list is fully closed.

## Customer-base sameining — `js/patches/236-customer-sameining.js`

Sjálfstæð síða (view `view-sameining`, slug `#sameining`, hliðarstiku-hnappur
„🔗 Sameining") sem klárar **`customer_base_id` FK-tengingu** sem byrjaði 2026-06-04
en var hálf-flutt. Þrír undirflipar:

- **🏢 Fyrirtæki** — 325 raðir með `customer_base_id IS NULL`
- **👤 Viðskiptavinir** — 23 raðir með `customer_base_id IS NULL`
- **💳 Sölur** — 93 raðir með `customer_base_id IS NULL` (gamla `customer_id → fyrirtaeki`)

Suggestion engine flaggar TILLÖGU per röð:
- 🟢 high = nákvæmt kt-match (digits-only í gegnum `ktDigits()`)
- 🟡 med = nákvæmt nafn-match (case-fold + NFD)
- 🟠 low = fuzzy nafn (Levenshtein ≤ 2 og lengd ≥ 4)
- 🔴 none = enginn match → býður „🆕 Ný base"

Aðgerðir per röð: 🔗 Tengja · 🔍 Leita · 🆕 Ný base · × Sleppa.
**Bulk-takkar**: „🚀 Tengja allt augljóst" (high+med í einum batch),
„🚶 Sameina alla walk-ins" (allir með kt `999999-9999` eða án kt → eitt
canonical base).

**Walk-in convention** (Agnar 2026-06-29): POS-walk-ins (greiðir og fer)
eiga ALLIR að lenda á einni base-röð með kt `999999-9999` (snið með striki).
Patch býr til/finnur þá base (`'Walk-in / nafnlaus sala'`) með upsert.

**Rekstrarfélög með margar staðsettningar** (Agnar 2026-06-29): Sameining MÁ
ALDREI eyða eða sameina staðsettningar — bara setja sama `customer_base_id`.
Tólið sýnir „📍 N staðsettningar" badge þegar sama kt birtist í 2+ röðum og
banner-note efst. Notar EKKI patch 157 `doMerge()` (sem á við þegar tvær raðir
ÆTTU að vera sömu, sem á ekki við um rekstrarfélög-staðsettningar).

**Útitækjanúmer** (Agnar 2026-06-29): `uttaeki.serial` er auto-generated placeholder
— má eyða/breyta/skrifa yfir án afleiðinga. Serial-árekstrar við úttækjatilfærslu
eru ekki vandi.

Wiring: nýr `<script>` í index.html (eftir 235), `App.switchView('sameining')`
hook, patch 218 ALIAS update fyrir `#sameining` deep-link, klónaður
hliðarstiku-hnappur frá Bakendi. `window.Sameining = {open, reload}`.

## Aðstoðarmaður (Fasi 1) — `js/patches/237-customer-brief.js` + `238-adstod-banner.js`

Fyrsta lag af „AI-aðstoðarmaður" vísíóninni (Agnar 2026-06-29). Sjá fulla
útlistun í `docs/CLAUDE-LEIDBEININGAR.md` §10.

**Patch 237 — Customer brief:**
- Lítill litaður **dot** (🔴 rauður = áríðandi skilaboð · 🟠 amber = forgangur ≥3)
  birtist ÞIN á þeim kúnna-röðum sem þurfa athygli. Engir dotar á hreinum.
- Smella → popup með „Síðasta úttekt 11 mán síðan · 14 tæki · 2 útrunnin · ✓ greitt upp"
- `quickFlag()` keyrir synchronously á AppSettings (engin DB-call)
- Full `compute()` pullar úr fyrirtaeki/uttaeki/solur með 5-mín cache
- Mutation observer decorerar alla `[data-co-id]` raðir
- companieslist.js fékk 2-lína breytingu til að setja data-co-id á <tr>
- Public API: `window.CustomerBrief = { compute, show, invalidate, close, quickFlag, refreshFlags, setDotsHidden, getDotsHidden }`

**Patch 238 — 🤖 Aðstoðar-spjald í banner:**
- 🤖 takki festur í Brunastál-banner **rétt fyrir klukkuna** (sjá `.bb-clockbox`)
- Rauður badge sýnir fjölda opinna watchlist-punkta
- Smella → popover (`#_ad-panel`) með:
  - „Sýna dots á kúnnum" toggle (stýrir patch 237)
  - „🔔 Mín watchlist" listi
  - „➕ Bæta við punkti" form með 4 flokk-chip-um:
    - 🔔 Áminning · 🎯 Mynstur · ⚖️ Regla · 🐛 Bug
- Form: flokkur (chip) + titill (skylda) + valkv. target (kt/sendandi) + valkv. lýsing
- Geymsla: localStorage `adstod_watchlist_v1`
- ⤓ „Flytja út" til JSON
- Þegar Brunastál er slökkt: 🤖 birtist fljótandi við 🔥 restore-takka
- MutationObserver endurtengir 🤖 takka þegar banner er endurbyggt
- Public API: `window.AdstodHub = { open, close, toggle, addWatch, removeWatch, listWatch, exportJSON }`

**Næstu fasar (planað):**
- Fasi 2: brunaholf `/api/adstod-run` (Claude Sonnet) les watchlist + DB-state, skrifar tip í `adstod_tips` Supabase tafla
- Fasi 3: „hugsanaský" — reglur breyta hegðun AI í næstu yfirferð
- Fasi 4: Domain analyzers (duplicate sölur/reikningar, mikilvægir póstar, tilboð úr fyrirspurnum)

## Aðstoðarmiðstöð — `js/patches/239-adstodarmidstod.js`

Fasi 1B af Aðstoðarmaður-vísíón (Agnar 2026-06-29). Sjálfstæð síða
`view-adstodarmidstod`, slug `#adstod`, hliðarstiku-hnappur „🤖 Aðstoðarmiðstöð".

Reglu-byggðir analyzers (engin AI-call) sem safna ábendingum á einn stað:

- **🚨 Áríðandi** — kúnnar með `arsskodun_customers[id].urgent` eða `priority >= 3`
- **🔄 Líklegir tvítekningar** — `solur` með sömu `customer_id` + sömu daginn + samtals innan 5%
  (lestir síðustu 60 daga, `status='final'`, limit 2000)
- **📋 Sölu-drög > 7 daga gömul** — `solur.status='draft'` og `created_at` eldra en 7 daga
- **🧯 Útrunnin tæki** — fyrirtæki með ≥4 `uttaeki` þar sem `next_insp <= í dag`
- **🤖 Watchlist** — forwarder fyrir punkta úr patch 238 `adstod_watchlist_v1`

Hver röð: titill + sub-lína + aðgerðir („Opna" → kúnna/sölu, 😴 „Snooze 24 klst" → localStorage `adstod_snoozed_v1`).

Snooze er per-tip ID — fellur sjálfvirkt úr þegar TTL rennur út. Stillingin ber yfir milli session-a en hreinsast við read.

Wiring eins og 236/232: nýr view-div, klónaður hliðarstiku-hnappur frá Bakendi/Sameining, App.switchView hook, patch 218 ALIAS update. Public API: `window.Adstod = { open, reload }`.

**Þegar Fasi 2 kemur**: AI-tips bætast við sem fyrsta section efst (þvert á reglu-byggðu sectionirnar). Reglu-byggðu sectionirnar verða áfram til staðar sem öryggisnet ef AI-keyrslan fellur.

## Reikninga-póstur (reikninga-póst-hjálpari) — `js/patches/240-reikninga-postur.js`

Sjálfstæð síða (view `view-reikninga-postur`, slug `#reikninga-postur`/`#postur`,
hliðarstiku-hnappur „📧 Reikninga-póstur") sem les póst-hólfið **eldklar@eldklar.is**
(+ bokhald@eldklar.is) BEINT úr shared `email_digest` (engin ný tenging) og tengir
hvern póst við kúnna/reikning svo „hver spurði um hvaða reikning" sé á einum stað.

- **Tenging (áreiðanlegast fyrst):** (1) kt í efni/texta → `custByKt` · (2)
  sendandi-netfang → `custByEmail` (AÐEINS einkvæm netföng; deildir umboðsmanna-
  póstar eins og `gjaldkeri@eignaumsjon.is` sem senda fyrir mörg húsfélög eru
  útilokaðir) · (3) R-númer (`R-0\d{5}`) → sala → kúnni (fallback).
- **Flokkar:** 📥 Til að svara (innhólf, spurningar efst) · 🧾 Sendir reikningar
  (delivery@payday.is afrit) · Allt. `isSystem` felur noreply/rsk/microsoft o.fl.

**Tier 2/3 aðgerðir per póst** (2026-07-03, PR #265):
- **✉️ Senda** — velur einn af reikningum kúnnans (`solur` eftir `customer_kt`),
  teiknar hann sem PDF gegnum `UttektInvoicePdf.buildInvoiceBlob` (patch 233) og
  sendir gegnum `/api/email-send` (Resend) á hvaða netfang sem er (forfyllt með
  sendanda). Tómt ástand er heiðarlegt: húsfélög sem eru rukkuð í dkPlus/Payday
  eiga engar `solur`-raðir → „Engir reikningar fundust".
- **✏️ Breyta** — opnar reikninginn í sölu-ritli (`SaleEditor.openById/openByNum`,
  patch 142). Birtist aðeins þegar R-númer tengdist (`m.sale`).
- **🤖 Svar** — Claude semur STUTT íslenskt uppkast að svari gegnum NÝ Netlify-
  function **`netlify/functions/postur-reply.js`** (`/api/postur-reply`, Haiku,
  ANTHROPIC_API_KEY server-side) út frá póstinum + nýlegum reikningum kúnnans.
  4 stýri-chip (Sendi reikning / Bið um uppl. / Leiðrétti reikning / Staðfesti
  greiðslu). Uppkastið er ritstýranlegt → 📋 Afrita eða 📤 Senda svar (Resend).
  **Skrifstofan yfirfer ALLTAF áður en sent er** — endpoint semur bara uppkast.

- **Sendandi:** `localStorage.email_from` (fallback `Slökkvitæki ehf
  <reikningar@eldklar.is>`) — VERÐUR að vera á staðfestu Resend-léni (eldklar.is).
**Handvirk merking + minnispunktur** (2026-07-03): „🏷️ Merkja" takki á hverjum
pósti opnar modal þar sem hægt er að (1) setja **flokk handvirkt** — þ.á m. nýja
**„🧾 Senda kröfu"** flokkinn (`SENDA_KROFU`, cls `fire`, orange) sem er MANUAL-only
(aldrei sjálf-greindur) — handvirkur flokkur kemur í stað sjálfvirka `tagFor()`
gizksins og birtist í flokka-síuröðinni + sem litað merki á kortinu; og (2) skrifa
**minnispunkt** sem birtist sem 📝 lína á kortinu. Geymt í nýrri Supabase-töflu
**`reikninga_postur_meta`** (`message_id` PK, `manual_tag`, `note`, `updated_at`;
RLS OFF, anon select/insert/update/delete) — samstillist milli tækja. `metaFor(m)`
leysir per samtal (öll `_threadIds`). Public: `saveMeta(message_id, manual_tag, note)`.

- **Modal** er bætt á `<body>` (utan `.view`) svo patch 245 skinnið snerti það ekki.
- Wiring eins og 239: view-div, klónaður hliðarstiku-hnappur, App.switchView hook,
  patch 218 ALIAS (`postur`/`reikningapostur`). Public API `window.ReikningaPostur
  = { open, reload }`. Verður READ→WRITE með Tier 2/3 (var read-only í v1).

## Theme refactor — `theme.css` + per-page skeletons (IN PROGRESS, 2026-07-03)

Re-skinning pages to Agnar's class-based design system, replacing an earlier
mistaken pass where I invented a dark metallic "title BAR" that is **not** in the
comps (it caused black-on-black regressions). The correct look = plain title on a
dark→grey page band, metallic 3D stat cards, filled pills, dark-header data table.

- **Source of truth:** `css/theme-handoff/` — `theme.css` (the whole system as
  named classes), `README.md` (recipe + class cheat-sheet), and per-page
  `*.skeleton.html` (class-only markup with `{{PLACEHOLDERS}}`). Full pixel
  reference = `brunaholf-theme-handoff/reference-pages/*.dc.html` (in the v3 zip
  Agnar uploaded; extracted copy under scratchpad). Ask Agnar (via Claude design)
  for a new page's skeleton — he generates them.
- **Scoping (critical):** do NOT load `theme.css` globally — its class names
  (`.btn` 75 files, `.pill` 12, `.chip` 19, …) collide with the app. Instead
  `css/theme-scoped.css` = `theme.css` auto-prefixed under `.thm` (regenerate from
  theme.css with the prefix transform; keep the `@import`/`:root` global). Linked
  once in `index.html <head>`. Each rebuilt page wraps its content in
  `<div class="thm"><div class="app-page"><main class="app-main">…`.
- **Per-page recipe (mechanical):** keep the patch's data/logic + every event-hook
  class (`._hr-*` etc.); replace ONLY the render markup with the skeleton's theme
  classes. Title `.page-title` (plain, white, on the band — NO boxed bar). Cards
  `.stat-card`(+`--green/amber/red/hero`). `.pill--*`, `.chip--*`, `.btn--*`,
  actions `.abtn5`, table `.data-table-wrap>.data-table-scroll>table.data-table`.
  Reset the view so the band shows: `#view-X{padding:0!important;background:transparent!important}`.
  Bump the `?v=` on BOTH `theme-scoped.css` and the edited patch in index.html.
- **GOTCHA — patch 245 (Brunastál content-skin) fights theme.css.** It paints
  `.view .stat-card`, `.view input`, and `.view [class*="-card"]{background:#fff!important}`.
  That **substring** selector matches `stat-card__value`/`__label` (they contain
  "-card") and whitens them → an invisible "white box" (this is the "two
  backgrounds" Agnar flagged). Fix = higher-specificity overrides in
  theme-scoped.css: `.thm .app-page .stat-card .stat-card__value{background:transparent!important;border:0!important}`
  and the hero card `.thm .app-page .stat-card.stat-card--hero{background:<blue>!important}`.
- **Gradient (Agnar 2026-07-03):** `.app-page` holds dark longer + darker —
  `linear-gradient(180deg,#060607 0px,#060607 240px,#8e949e 660px,#9198a3 100%)`
  (in both `theme.css` and `theme-scoped.css`).
- **Verify:** render skeleton+theme.css standalone (fill placeholders) = the
  target; screenshot the live preview with Playwright and compare. Navigate via a
  **sidebar `.vnav-btn` click** (board/ledger pages don't render via
  `App.switchView` alone). Chromium `/opt/pw-browsers/chromium-1194`,
  `--no-sandbox --ignore-certificate-errors`, `proxy:{server:HTTPS_PROXY}`,
  `localStorage slokk_theme={preset:'brunastal'}`, `waitUntil:'load'`.
- **Done:** Hreyfingarlisti (patch 167) fully on theme.css ✓. ÞjónustuVerkstæði
  (patch 190) header → plain title + coloured stat **pills** (matches its comp) ✓.
  Kröfu yfirlit (#166, 2026-07-09) — chrome on theme.css: `.thm .app-page`
  wrapper (also around loading/error states), `.page-title` + `__tools` (month
  nav/sort/search keep their `.ky-navbtn` Brunastál overrides), `.stat-row` with
  4 `.stat-card` (hero/amber/green), view-filter buttons → `.filter-chip`; the
  grouped-by-company cards + kyAbtn action rows + bulk bar kept UNTOUCHED
  (money-critical, heavily iterated — v5 lesson) ✓.
- **Also done (2026-07-09):** Vörur (core `js/vorur.js` — page-title band,
  tabs → `.filter-chip`, category headers as dark translucent pills so they read
  on both the dark and grey parts of the band), Tekjur (`js/tekjur.js` —
  page-title + 4 `.stat-card`), Allir viðskiptavinir (157 — page-title band,
  counts line in `<p>` with light accents). Each injects its own
  `#view-X{padding:0;background:transparent}` reset style.
- **Skipped on purpose:** Rekstrarfélög (175) — it has its OWN dark design
  (`html[data-thm-dark]` view-background + `.rf-card` rules) integrated with the
  theme presets; wrapping it in the `.thm` band would fight that. Convert only
  together with a redesign of that page.
- **Next:** Fyrirtæki í Þjónustu (153) + remaining pages, one per skeleton.
- **Cleanup DONE (2026-07-09, #322):** the wrong dark title BARs #260 stamped
  onto Vörur/Tekjur/Allir/Rekstrarfélög/Bókhald were replaced with plain
  theme-token titles (var(--ink1)/var(--ink3)), and `260-global-titlebar.js`
  (which prepended the bar to every other Brunastál view, incl. Fyrirtæki í
  Þjónustu) is hibernated — script tag commented out like 152. The proper
  theme.css conversion still proceeds page by page as above.

## Payday-spegill — `payday_invoices_slokk` + `netlify/functions/payday-pull-slokk.js` (2026-07-10)

Payday gefur reikningum SÍN eigin númer — kúnnar hringja og nefna Payday-númerið
en hluti krafna er stofnaður beint í Payday (bókari/mánaðaruppgjör) og á enga
`solur`-röð → fannst ekki í kerfinu. Lausnin:
- **`payday_invoices_slokk`** (Supabase): spegill af ÖLLUM reikningum
  Slökkvitæki-Payday-aðgangsins (payday_id [upsert-lykill], number, kt,
  customer_name, amount_total, created/due/paid_date, status, reference,
  description). AÐSKILIN frá `invoices` (sem er Brunahólfs-Payday — Skuldunautar/
  Krófur-talnaverk mega ekki blandast).
- **`/api/payday-pull-slokk`** — `?probe=1` (auth-test) · `?dry=1` · `?all=1`
  (ALLT, fyrsta keyrslan) · sjálfgefið síðustu 180 dagar. Sömu creds og
  payday-push/payday-sync-paid (deilir token-cache `payday_oauth_slokk`).
  **payday-sync-cron** (10:00 + 15:00) keyrir spegilinn daglega á eftir
  greiðslu-samstillingunni.
- **Patch 253 (Fyrri viðskipti)**: Payday-kröfur kúnnans (eftir kt) fléttast
  í listann — fjólublá „PD <númer> · Payday"-röð með gjalddaga/stöðu; sölur
  sem fóru gegnum payday-push (solur.dk_invoice_id = payday id/númer) fá
  PD-merkið á SÍNA röð í stað tvítekningar. Samantektarlínan sýnir
  „+ N Payday-kröfur · X kr".

## Gagnalíkan viðskiptavina (the spine) + 🗺️ Kerfis-kort — SAMEIGINLEGT með Brunahólf

Slökkvitæki + Brunahólf deila EINUM Supabase — viðskiptavina-líkanið er hryggur:
**`customers_base`** (canonical, einn per kt · `rekstrarfelag`) → **`fyrirtaeki`**
(staðir; einn kt getur átt marga = rekstrarfélag; `er_i_thjonustu`; **aldrei
sameina staði rekstrarfélags**) → **`uttaeki`** (tæki — **auto-generuð placeholder,
skipta ekki máli, „án staðar" er ekki vandi**). **`customer_documents`** (skýrslur/
reikningar/samningar úr Drive, keyed base+`fyrirtaeki_id`+`year`; ein ársskýrsla
per (staður,ár); reikningar á R-nr; `is_duplicate`). **`solur`** + **`payday_
invoices_slokk`** (kt digits-only) tengjast eftir **kt**. Walk-in = kt `999999-9999`.

**🗺️ Kerfis-kort** — lifandi einnar-síðu yfirlit yfir ALLA viðskiptavini + tengingar
+ heilsu (2023–2026 skjöl per ár, ótengd/tvítök/án-kt flögg). Á **brunaholf.netlify.
app/kerfiskort.html** (Brunahólf-megin, því skjöl/Drive-tólin lifa þar). Sýnin
`v_kerfi_kort` + endapunktur `/api/kerfi-kort`. Tengingar lagaðar í Brunahólf-Bakendi
(Skýrslu-stöð, Kt-samræming, Hreinsi-borð, Drive-flokkun). **Á slökkvitæki-hlið**
birtast skjöl+Payday á fyrirtækja-prófílnum í „📁 Skjöl & viðhengi" (patch 199).

## Related projects (in case Agnar mentions them)

- **Brunahólf** — sister business, separate ecosystem (Google Sheets + Apps Script
  + Tímavera + Ajour). See COWORK-brunaholf.md if relevant.
- **Slökkvitæki app** — this project. Pure code, lives on Netlify + Supabase.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
