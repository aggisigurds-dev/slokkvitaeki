# Customer documentation tracker + Cowork dig-brief

A per-customer **documentation-completeness counter** for Slökkvitæki service
customers, plus the brief for Cowork to find the missing documents scattered
across machines, Drive, and email.

Two goals at once:
1. **See the gaps** — which customers are missing which documents (Cowork's hunt list).
2. **Spot junk** — a service customer with *zero* of everything is a strong
   "shouldn't be here" candidate, feeding the customer-DB cleanup step.

> Status: **spec only.** The `customer_documents` table is a new (additive)
> table — it is **not** created yet. Creating it is gated on the standing rule:
> backup first + Agnar's go-ahead. Nothing has been written to the DB.

---

## 1. The expected-document rule

Per **service customer** (`fyrirtæki í þjónustu`):

- **1× Samningur** — one-time, at sign-up. No year; just present/absent.
- **Per service year** (sign-up year → current year, e.g. 2024 / 2025 / 2026):
  - **1× Úttektarskýrsla** (yearly inspection report)
  - **1× Reikningur** (yearly invoice)

```
complete  =  has Samningur
             AND  for every year Y in signup_year..currentYear:
                    has Úttektarskýrsla(Y)  AND  has Reikningur(Y)

gaps      =  the specific (doc_type, year) cells still missing
             → exactly Cowork's hunt list
```

The **sign-up year comes from the Samningur** (`signed_at`). For customers with
no contract found yet we don't know their start year — so the *first* thing to
find per customer is the samningur, which then sets how many yearly
úttektir/reikningar to expect.

**Scope:** service customers only. Regular cash customers (`vidskiptavinir`) are
out of scope — no contracts, no yearly cadence.

Display shape (same as the `brunakerfi.html` ledger, which already runs 2024–26):

| Customer | Samningur | 2024 Úttekt / Reikn | 2025 Úttekt / Reikn | 2026 Úttekt / Reikn |
|---|---|---|---|---|

---

## 2. Where the documents actually are

They are **not** in this database today (the DB holds ~30 contract rows and
almost no service invoices — Slökkvitæki invoices from dkPlus). They are
scattered across:

- **3 different computers** (loose folders)
- **Google Drive** — `Brunakerfi/{Samningar, Skýrslur, Reikningar}` + the
  top-level `Skýrslur` inspection archive
- **Email** — `bokhald@eldklar.is` / `eldklar.is`, `bokhald@brunaholf.is`
- **dkPlus** — issued reikningar

This is why a counter built today would read "everyone empty": the data lives
exactly in those scattered places. **Consolidation is the goal** — get every doc
off the individual machines (which get switched off) into Drive + recorded here,
so it's durable.

---

## 3. The store — `customer_documents` table (proposed)

```
customer_documents
  id              bigserial PK
  customer_base_id bigint FK -> customers_base(id)
  doc_type        text   -- 'samningur' | 'uttektarskyrsla' | 'reikningur'
  year            int    -- NULL for the one-time samningur
  drive_file_id   text   -- canonical home (see filing rule)
  storage_path    text   -- optional, if stored in Supabase instead
  source          text   -- where it was FOUND: 'gdrive' | 'computer-1' |
                          --   'computer-2' | 'computer-3' | 'email' | 'dkplus'
  found_by        text
  found_at        timestamptz default now()
  amount          numeric -- for reikningur (OCR'd), optional
  notes           text
```

**Filing rule — any source normalises into one linkable home:**

| Found on… | Action |
|---|---|
| Google Drive | link it — record the `fileId` |
| A computer folder / email | **upload into the canonical Drive folder first**, then record the resulting `fileId` |

| Doc | Canonical Drive home | Recorded as |
|---|---|---|
| Samningur | `Brunakerfi/Samningar` | `doc_type=samningur`, `year=null` |
| Úttektarskýrsla | `Brunakerfi/Skýrslur` | `doc_type=uttektarskyrsla`, `year=YYYY` |
| Reikningur | `Brunakerfi/Reikningar` | `doc_type=reikningur`, `year=YYYY` |

`source` still records the *origin* machine/place, so we can track sweep coverage
("Computer 1 done, Computer 2 half, Computer 3 not started").

---

## 4. The counter — `customer_doc_status` view (proposed)

Rolls `customer_documents` up per service customer into:
`has_samningur`, per-year `has_uttekt` / `has_reikningur`, an **expected vs.
found** completeness score, and a **list of missing cells**. Surfaced in **"Allir
viðskiptavinir"** with a **sort by least-documented**, so the worst gaps — and
the zero-doc "shouldn't-be-here" rows — float to the top.

---

## 5. Cowork dig-brief

**Sweep, per source** (3 computers → Drive folders → email → dkPlus), and for
each document found, capture enough to map + file it:

- **Customer name + kennitala** (kt is what maps to `customer_base_id`)
- **doc_type** (samningur / uttektarskyrsla / reikningur)
- **year** (for úttekt + reikningur)
- **file location** (Drive fileId, or the local path/email id so it can be
  uploaded to Drive)
- **source** (which machine / Drive / email / dkplus)
- for reikningar: **amount + kt** (OCR scanned PDFs — same as the brunakerfi
  ledger flow)

**Report-back format** (so it ingests cleanly): one row per document —
`kennitala, customer_name, doc_type, year, source, drive_file_id_or_path, amount, notes`.
With kt + name each find maps to a customer automatically.

**Coverage:** mark each source as it's swept so we can see what's left across the
3 machines.

---

## 6. Current gap snapshot (read-only, 2026-06-04)

562 service customers (`er_i_thjonustu`, not deleted):

| Missing in DB… | Count |
|---|---:|
| Samningur | 547 |
| Reikningur | 546 |
| Úttektarskýrsla / inspection record | 561 |
| **All three (nothing recorded)** | **530** |
| Not yet linked to `customers_base` | 43 |

These are **recording gaps, not proof of absence** — the documents are on the 3
computers / Drive / email / dkPlus. The point of this tracker is to turn that
scattered pile into a counted, consolidated, durable record.
