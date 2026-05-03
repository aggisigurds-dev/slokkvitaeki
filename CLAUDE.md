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

There was no Git repo before this folder was created. The codebase was built
incrementally over many Claude.ai sessions where each patch was streamed into
the live site through the browser, because the sandbox couldn't reach
api.netlify.com directly. All accumulated patches live in **one giant file**:
`js/patch-master.js` (~456 KB).

Each patch is wrapped:
```
/* === FOO PATCH NAME v1 === */
(() => { ... })();
/* === END FOO PATCH NAME === */
```

Recent patches in patch-master.js:
- `BOKHALDS YFIRLIT v1.1` — accounting overview view + CSV export
- `SALA RECEIPT REDESIGN v1` — A4 invoice popup
- `MAPFIX KILL DOTS v2` — removes orange overlay-pane SVG circles
- `VERKDAGBOK ATTACHMENTS v1` — file attachments (SQL pending)
- `POS FIXES v4`, `QR LABEL CUSTOMER v2`, etc.

**First-session priority**: split `js/patch-master.js` into `js/patches/*.js`,
one file per `=== ... === / === END ... ===` block. Update `index.html`
to include each new file. Then commit. The big file is hard to navigate and
diff; this makes future work much easier.

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

## Pending work (first sessions)

**1. Split patch-master.js** — top priority. Each `/* === NAME === */ ... /* === END NAME === */` block becomes its own file under `js/patches/`. Update `index.html` script tags. Verify nothing breaks. Commit.

**2. Run Supabase SQL for Verkdagbok attachments** — never executed. SQL is stored in `window.VdAttachments.setupSQL` at runtime. Needs to run in Supabase SQL Editor:
```sql
CREATE TABLE verkdagbok_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id uuid REFERENCES verkdagbok(id) ON DELETE CASCADE,
  filename text, storage_path text, public_url text,
  mime_type text, size_bytes bigint,
  uploaded_at timestamptz DEFAULT now()
);
CREATE INDEX ON verkdagbok_attachments(entry_id);
ALTER TABLE verkdagbok_attachments ENABLE ROW LEVEL SECURITY;
CREATE POLICY anon_all ON verkdagbok_attachments FOR ALL TO anon USING (true) WITH CHECK (true);
-- Then in Storage UI: create bucket "verkdagbok-attachments" (public),
-- with anon SELECT/INSERT/DELETE policies.
```

**3. Set up real deploy script** — `deploy.js` is included in this folder (uses Netlify API directly via Node.js fetch). Run with `node deploy.js`.

**4. Optional**: connect to a private GitHub repo for backup + history.

---

## Deploy workflow (NEW — replaces the old browser dance)

```powershell
# from project folder
node deploy.js
```

The script:
1. Reads all files in the project folder
2. Computes SHA-1 hashes
3. POSTs a deploy spec to Netlify API
4. PUTs only changed files
5. Confirms deploy succeeded

Old workflow was: gzip+base64 the patch, stream chunked into a browser tab, build a fetch() orchestrator inside that tab. That's no longer needed — Node.js can hit api.netlify.com directly.

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

- **Brunahólf** — sister business, separate ecosystem (Google Sheets + Apps Script
  + Tímavera + Ajour). See COWORK-brunaholf.md if relevant.
- **Slökkvitæki app** — this project. Pure code, lives on Netlify + Supabase.
