# Customer data model — Brunahólf / Slökkvitæki

Shared Supabase project `osfdzskyvisifcwyjkuk`. This is the canonical write-up
of how customers (and everything hanging off them) are wired today, what's
healthy, what's risky, and the target model + order of work.

- **Source:** Cowork's read-only analysis of all 58 tables (FK graph mapped),
  2026-06-04.
- **Verification:** Code re-ran the decision-critical counts read-only on the
  same date (see [§5](#5-read-only-verification-code)). Nothing has been written
  to the DB.

---

## 1. How it's wired today (the reality)

Everything hangs off one root — **`customers_base`** (870 customers, 1 per
kennitala, **0 duplicates**). Five/six thin layers branch off it. These are
confirmed FK relationships, not intentions.

### Layer 1 — Identity (the root)
`customers_base` is the payer. Three tables point straight at it:

| Table | Rows | Linked to base | Note |
|---|---:|---|---|
| `vidskiptavinir` | 359 | 336 linked, **23 unlinked** | kt-less cash customers |
| `fyrirtaeki` | 1.097 | 772 linked, **325 unlinked** ⚠️ | carries `er_i_thjonustu` |
| `customer_worksite_map` | 70 sites | `base_id → base` | Rekstrarfélög: 1 kt → many sites |
| `customer_info` | 33 | — | was meant to fold into base; still standalone |

### Layer 2 — Service / contracts (status on top of the root)
This is **not** the same as the `fyrirtaeki` table — it's the service branch:

- `fyrirtaeki.er_i_thjonustu = true` → **566 active service customers** (519 base-linked)
- `thjonustusamningar` (27–30 rows) — formal contracts: frequency, `next_due`, amount, signature
- `seasonal_job` (0 jobs yet) → `customer_base_id → base` — route/drop-off seasonal work
- Ferðaþjónusta = a flexible service variant with no fixed contract

### Layer 3 — Equipment (fleet)
- `uttaeki` (**5.702** units) → `customer_base_id` (4.572 linked ≈ **80%**, 1.130 to go),
  `worksite_id → worksite_map` (**0 linked yet**), `seasonal_job_id → seasonal_job`
- `skodunar_saga` (1.748 inspections) → `unit_id → uttaeki` ✅ live history
- `taeki_events` (**0 rows**) → `unit_id` + `seasonal_job_id` — chain-of-custody event
  table is **built** (event, custody_status, tech, at) but **unused**
- `lanstaeki` + `lanstaeki_saga` — 12 loaners, separate unit
- Lookup dupes: `taekjategundir` (6) vs `taekjategundier` (5); `thjonustategundir`
  vs `thjonustategundier`. `uttaeki.type` is **free text** — no `type_id` FK.

### Layer 4 — Jobs / operations
- `verkbeidnir` (289 requests) → `verklidur` (286 lines, `job_id` + `uttaeki_id`)
- `akstursdagbok`, `timavera_entries` (3.907), `verkdagbok`, `dagskra`, `taeknimenn`

### Layer 5 — Sales / finance (the tangle)
Several parallel "invoice" systems overlap here:

- `solur` (182) — self-referencing `credit_of` for credit notes; **DOUBLE customer
  link**: `customer_id → fyrirtaeki` (old) **and** `customer_base_id → base` (new)
- `invoices` (250) + `invoice_drafts` (76 → `payday_invoice_id`)
- `redder_invoices` (58) + `redder_line_items` (117)
- `sala_transactions` (149), `bank_transactions` (840)
- `thjonustusamningar` (30)

### Layer 6 — Email / integration
- `email_digest` (28.093) → `email_actions` (`email_id`, now bigint ✅)
- `ajour_registrations` (15.517), `google_oauth`, `audit_log` (1.959)

---

## 2. What works well

- **The root is solid.** 870, 0 dups, link columns present and populated on all
  main branches.
- **The equipment key has arrived** — `uttaeki.customer_base_id` ~80% backfilled;
  same pattern as the customer cleanup.
- **Chain-of-custody skeleton exists** (`taeki_events` + `custody_status` on
  `uttaeki`) — just unused so far.
- **Multi-site (Rekstrarfélög) is wired** — `customer_worksite_map` +
  `uttaeki.worksite_id` FK in place.
- **Seasonal-jobs table exists** with the right columns.

---

## 3. Problems, ranked by risk

1. **⚠️ No backup.** No `backup_2026*` table in the DB. Hard gate before anything
   destructive.
2. **Double customer link on `solur`** (`customer_id → fyrirtaeki` vs
   `customer_base_id`). The old FK blocks a clean `fyrirtaeki` demote; 23 rows
   have both set, **93 sales still unlinked** to base.
3. **325 unlinked `fyrirtaeki` + 23 unlinked `vidskiptavinir`** — junk, dupes, or
   kt-less. Needs review (**not** blind delete).
4. **Many parallel sales/invoice systems** (`solur` / `invoices` / `redder` /
   `sala_transactions`). No single source of truth. Ties into the §2 kröfuyfirlit
   consolidation already in progress.
5. **Duplicate lookup tables** (`taekjategund*` / `thjonustategund*`) and
   free-text `uttaeki.type` with no FK — §5d undone.
6. **RLS disabled** on core tables (`customers_base`, `fyrirtaeki`, `uttaeki`,
   `solur`, `seasonal_job`, `vidskiptavinir`, `verkbeidnir` …) — anon-readable.
   ~26 tables. Standard security item.
7. **`customer_info` (33) and `worksite_id` (0 linked)** — half-finished: a table
   that was meant to fold in still lives; the worksite FK exists but is unfilled.

---

## 4. Target model + order

**Goal:** one root (`customers_base`) holding identity; everything else = thin
layers referencing it with a single key. No double paths, one source of truth
for sales.

**Principle:** the identity merge is *done*. What's left is removing duplication
and double paths — **not** rebuilding.

**Order (safest first, destructive last). Every destructive step is gated on
backup + read-only confirmation from Cowork:**

1. **Backup first.** Fresh snapshot of all tables. Nothing destructive before it exists.
2. **Finish `solur → base`** (93 unlinked), then remove the old
   `customer_id → fyrirtaeki` FK once everything rolls through `customer_base_id`.
   This unlocks the `fyrirtaeki` demote.
3. **Point all app reads at `customers_base`** (dropdowns/lists) — zero risk, do early.
4. **Demote `fyrirtaeki` + `vidskiptavinir`** to thin service-extensions: keep
   `er_i_thjonustu`, `status`, `deleted_at`, `customer_base_id` + equipment/
   attachment links; drop duplicated identity (nafn/kt/sími/netfang…). Keep the
   "in service" status + contract links — that's the service data.
5. **Review the 325 + 23 unlinked** as a cleanup list in "Allir viðskiptavinir" —
   mark live/junk, never blind-delete (the ICS/Hjallabraut lesson).
6. **Merge lookup tables** into one canonical (`taekjategundir`), add
   `uttaeki.type_id` FK, map the free text — §5d.
7. **Activate `taeki_events`** in the Móttaka flow (received → … → delivered) and
   backfill `uttaeki.worksite_id` for multi-site customers.
8. **Sales source-of-truth decision:** make §2 kröfuyfirlit the single overview;
   decide whether `solur` or `invoices` is canonical and retire the other
   (reversibly first).
9. **RLS as its own task:** enable + policies on core tables (separate from the
   demote, not mixed in).

---

## 5. Read-only verification (Code)

Re-ran the decision-critical counts on 2026-06-04 — all SELECT, nothing written:

| Check | Result |
|---|---|
| `customers_base` rows / dups | 870 / 0 |
| `customers` + `customer_id_map` views | both exist |
| `solur` total / unlinked to base / both keys set | 182 / **93** / **23** |
| `uttaeki` total / with `customer_base_id` / with `worksite_id` | 5.702 / 4.572 / **0** |
| Duplicate lookup tables | `taekjategundir`+`taekjategundier`, `thjonustategundir`+`thjonustategundier` all present |
| `taeki_events` rows | 0 |
| `customer_info` rows | 33 |
| `er_i_thjonustu` lives on | `fyrirtaeki` |
| `fyrirtaeki` / `vidskiptavinir` unlinked to base | 325 / 23 |

Minor drift vs. Cowork's figures: `solur` is 182 total here vs. 174 (the extra 8
are non-`final`/void rows); the 23/93 split matches exactly.

---

## 6. Diagram — root + two families (corrected)

```mermaid
erDiagram
    customers_base ||--o{ vidskiptavinir         : "source_v_id"
    customers_base ||--o{ fyrirtaeki             : "source_f_id"
    customers_base ||--o{ customer_worksite_map  : "base_id"
    customers_base ||--o{ seasonal_job           : "customer_base_id"
    customers_base ||--o{ uttaeki                : "customer_base_id (~80%)"
    customers_base ||--o{ solur                  : "customer_base_id (new)"
    fyrirtaeki     ||..o{ solur                  : "customer_id (OLD — to drop)"
    fyrirtaeki     ||--o{ thjonustusamningar     : "service contracts"
    customer_worksite_map ||--o{ uttaeki         : "worksite_id (0 linked)"
    uttaeki        ||--o{ skodunar_saga          : "unit_id"
    uttaeki        ||--o{ taeki_events           : "unit_id (0 rows)"
    verkbeidnir    ||--o{ verklidur              : "job_id + uttaeki_id"

    customers_base {
        bigint  id PK
        text    kennitala UK "1 per kt, 0 dups"
        text    nafn
        int     source_v_id "back-link"
        int     source_f_id "back-link"
    }
    fyrirtaeki {
        bigint  id PK
        bigint  customer_base_id FK
        bool    er_i_thjonustu "service layer"
        text    "...identity cols → drop on demote"
    }
    solur {
        bigint  id PK
        bigint  customer_base_id FK "new"
        bigint  customer_id FK "old → fyrirtaeki, to drop"
        bigint  credit_of FK "self (credit notes)"
    }
```

> A hand-drawn SVG (`Brunaholf-Customerbase-Diagram.svg`) also exists on the
> Verkborð side; if it lands in the repo, link it here. This Mermaid version is
> the text-tracked equivalent.
