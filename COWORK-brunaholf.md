# COWORK-brunaholf.md — Brunahólf operations handoff

This file is for Claude in Cowork. Open this in Cowork at the start of each
session so it has the full context.

---

## What Brunahólf is

Brunahólf is the operational/business side of Slökkvitæki ehf — the spreadsheets,
income tracking, time logs, sick-day registers, customer lists, and external
service connections used to run the business day to day. It's separate from the
Slökkvitæki **app** (which is code on Netlify + Supabase — see CLAUDE.md for
that one).

Brunahólf is mostly Google Sheets + Apps Script + Gmail + a couple of external
services (Tímavera, Ajour System).

---

## Key documents and IDs

| Name | What it is | Type | ID |
|------|------------|------|----|
| Bakskjal | Main backing/dashboard sheet — staff list, links hub, attendance | Sheet | `1oLbSjy9FCt-M_B8gRtglaq8EnyoUzAnUn94hi1U0cAE` |
| Brunaholf_Maelaborð_v3 | Operations dashboard | Sheet | `1OWvPOTn43e5aGLRLqtKXsxSHkI7ulkhtBIkN1fpIDEQ` |
| Tekjur (older) | Income overview | Sheet | `1cv3Q3UFXMR0D3KrdCZFYkhfVxnkvfzFYdRbxztH_NW8` |
| Brunaholf_Tekjur_v3.3_Jan-Apr_2026 | Current revenue tracker | Sheet | `16n-eLUdLHs-K7rkLb8vGiP8UROAMTmvNMuZqVU5ZHJ8` |
| Brunahólf verkfæri | Apps Script project (custom menu, hub, sickday form) | Script | `1nXtojzoJGnMdkbCgHzTXZ5jnRg3ewnDE-RUBd9Rb42_0fFC-IGajenL9` |
| Brunahólf | Drive folder root | Folder | `1CebzBKYdSj8NP4F-vEA5HepOULH-bwoT` |
| Slökkvitæki Backup folder | Code + CSV backups | Folder | `13qboszs2EtaKZ46CmrNzmmiqaz1KU_be` |

---

## External services

- **Tímavera** — https://app.timavera.is/ — time tracking
- **Ajour System** — https://brunaholf.ajoursystem.net/ — project management
- **Looker** — business intelligence dashboards
- **Procore** — https://procore.is — project management
- **Redder** — https://redder.is — purchasing

---

## Bakskjal structure

Critical tabs in the main backing sheet:
- **Starfsmannaupplýsingar** — staff list (col A = number, col B = name)
- **veikindi/Mæting** — sickday/attendance log (created by the verkfæri Apps Script,
  with navy headers and dropdown columns for status + workplace)

The custom menu **🛠️ Brunahólf** is added by the Apps Script project. Items:
- 🏠 Stjórnborð — opens the hub modal
- 📋 Skrá veikindi/mætingu — opens sickday registration form
- 📊 Yfirlit veikinda — quick stats per employee/month
- 🔄 Sækja tengla úr Bakskjali — auto-pulls dashboard URLs
- ⚙️ Stilla upp töflu — sets up dropdown validation + conditional formatting

---

## What Cowork is good for here

Things Cowork can do that regular Claude.ai cannot:

1. **Read your local CSV/Excel files directly** — drop a CSV into a folder,
   ask Cowork to analyze it. No re-uploading.
2. **Cross-reference Gmail invoices with spreadsheets** — pull invoice attachments
   from Gmail, match against `Brunaholf_Tekjur` rows, flag mismatches.
3. **Bulk-process Excel files** — monthly customer reports, year-over-year
   comparisons, customer churn analysis.
4. **Run Apps Script from local files** — edit `Code.gs` / `Hub.html` etc. in
   a local folder, then push them up via clasp (Apps Script CLI).
5. **Persistent context** — Cowork remembers the document structure between
   sessions so you don't re-explain every time.

---

## Suggested first session in Cowork

```
"Read COWORK-brunaholf.md. Connect to my Google Sheets via the Drive connector.
Then list the tabs in Bakskjal, Brunaholf_Maelaborð_v3, and the current Tekjur
sheet. Tell me if the structures look right based on what's in this doc."
```

Then for ongoing work, common tasks:

- **Monthly revenue reconciliation**: "Pull invoice attachments from Gmail with
  label X for last month, match each one against Brunaholf_Tekjur, list any
  invoices that aren't in the sheet yet."
- **Sickday report**: "Read the veikindi/Mæting tab and tell me total sick days
  per employee for [month]."
- **Customer list cleanup**: "Compare the customer list in Bakskjal with the
  Slökkvitæki app's `vidskiptavinir` table (here's the export CSV) — flag
  duplicates and missing kennitölur."
- **Apps Script changes**: "Open the Brunahólf verkfæri project (Code.gs,
  Hub.html, SickDay.html, Stats.html) — I want to add [feature]."

---

## Apps Script project install state (as of May 2026)

The Brunahólf verkfæri Apps Script was created earlier but installation is
manual (paste code into script.google.com). Source files live at:
`/Drive/Brunahólf/brunaholf-tools/` (or wherever you saved them).

Files:
- `Code.gs` — server-side, custom menu + sickday form handlers
- `Hub.html` — link hub modal
- `SickDay.html` — sickday registration form
- `Stats.html` — sickday statistics view
- `SETUP.md` — install instructions

If anything is missing, recreate from previous Claude.ai chat
"Google Sheets dashboard organization with AppScript" (April 27 2026).

---

## What NOT to do in Cowork

- Don't use Cowork for the Slökkvitæki app code — that lives on Netlify and is
  better handled by Claude Code with the deploy.js script.
- Don't grant Cowork write access to live Google Sheets unless you want it to
  modify them. Read-only is safer for analysis tasks.
