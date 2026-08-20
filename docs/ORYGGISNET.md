# Öryggisnetið — the Slökkvitæki safety net

> **Agnar's metaphor (read this first):** the safety system is one long power
> cable running through the whole building with 100 things wired to it. You
> **cannot cut the main line** without reconnecting it properly *and* running a
> begin‑to‑end test that it still holds. New features plug **into** the cable —
> they never bypass it.
>
> This file is the map of that cable and the rules that keep it whole.
> **Read it before changing any guarded path. Run `node tools/audit-all.cjs`
> before every push.**

The app is ~280 runtime patches with no framework and (historically) no tests,
which is why "fix one thing, two break." This net is the fix for *that*: make
failures impossible to ship silently, and make every guarantee testable in one
command. Extend it — never route around it.

---

## The three layers

1. **Guards** — code at a choke point that blocks the *bad outcome*. Guards live
   on the **OUT / review side, never on save** (`ALLTAF LEYFA VISTUN` — drafts
   must always persist). A guard blocks a blank invoice from *sending*, never
   from being *saved*.
2. **Registry** — `window.logProblem(kind, detail)` records every problem the
   instant it happens into Supabase `app_problems`. Nothing fails silently.
3. **Audits** — `tools/audit-*.cjs` prove the data invariants still hold. One
   runner, `tools/audit-all.cjs`, is the **begin‑to‑end test**.

Above them: the **scheduled sweep** (a Routine, 3×/day) reads the registry +
automation health and pings Agnar *only* when something needs him.

```
  user action ─▶ [ GUARD ] ─▶ safe outcome
                    │ blocked?
                    ▼
              window.logProblem ─▶ app_problems ─▶ 3×/day sweep ─▶ Agnar (only if needed)
                                        ▲
  tools/audit-all.cjs ── proves the invariants still hold ── run before every push
```

---

## What is bulletproofed today (2026‑08‑20)

| Protected outcome | Guard (code) | Registry signal | Audit |
|---|---|---|---|
| **No blank / 0‑kr invoice can be emailed to a customer** | `233` `buildInvoiceBlob` throws on empty lines; `254` `compose` refuses to send a missing/empty attachment | `blank_invoice_source`, `blank_invoice_blocked`, `send_failed` | `audit-invoice-guard.cjs` |
| **An entered kennitala is never dropped to `999999‑9999`** | `121` saves `customer_kt` on both save paths; `js/pos.js` extracts a kt typed into the name field | *(kt signals to come)* | `audit-kt-trap.cjs` |
| **POS search doesn't silently drop customers past 1000 rows** | `DB.fetchAll` pagination on the big tables | — | `audit-pagination.cjs` |
| **Per‑line discount + credit notes bill Payday correctly** | `payday-push.js` per‑line gate + credit `discount_pct=0` strip | `send_failed` (token) | *verified vs 697 live sales; audit TODO* |

---

## The rules — do not cut the power line

0. **Go through the map before you touch the network.** Any Claude session or
   agent about to edit a guarded path MUST first (a) read this file, (b) run the
   **`netvordur`** guardian agent to review the change (`subagent_type: netvordur`),
   and (c) get `node tools/audit-all.cjs` green — **before and after** the edit.
   Do not cut a wire you have not traced on the map. If `netvordur` says
   **CUTS-A-WIRE**, reconnect it before pushing. The guardian is the last barrier
   between a change and live customers.

1. **Never remove or weaken a guard** without a replacement guard **and**
   re‑running its audit green.
2. **Any change to a guarded path** — invoice OUT (`10` / `233` / `254`), kt save
   (`121` / `pos.js`), readiness (`153` / `187`), billing (`payday-push.js`) —
   **must keep the guard and run `node tools/audit-all.cjs` before pushing.**
3. **Every new feature that can fail must call `window.logProblem('kind',
   'detail')`** at the failure point. No silent failures. (Kinds are short slugs;
   detail is free text — **never a personal kennitala**.)
4. **Every new invariant gets a `tools/audit-<name>.cjs`** (copy an existing one).
   `audit-all.cjs` picks it up automatically — that's how the net grows.
5. **Guards never block a save.** OUT/review side only.
6. **Never log or store a personal kennitala** in the registry or in Charlize —
   kinds + context only. (Company kt on an invoice is fine; a *log line* is not.)

---

## The begin‑to‑end test

```bash
node tools/audit-all.cjs
```

Runs every `tools/audit-*.cjs`. **GREEN** = all invariants hold at their known
baseline. **RED** = a new violation appeared (a guard is leaking, or new bad data
was created) — investigate and fix **before** pushing. This is "run the test that
it will hold." Do it before every push and after adding any bulb.

Each data audit carries a `BASELINE` = the count of *already‑existing* bad rows on
2026‑08‑20 (e.g. 40 old blank sales, 10 old kt‑trap sales). The audit is green at
or below its baseline and red if the count **grows** — growth means the guard let
a new one through, or a new bad row was created that needs a look. Backfilling the
baseline rows and lowering the constant is how the net tightens over time.

---

## How to add a bulb (a new feature) without cutting the line

1. Build the feature.
2. If it can fail, wire `window.logProblem(kind, detail)` at each failure point.
3. If it introduces an invariant ("X must always be true"), add
   `tools/audit-X.cjs` (copy the pattern; set a `BASELINE`).
4. `node tools/audit-all.cjs` → green.
5. Push → PR → preview → merge. The 3×/day sweep now watches your new signal too.

---

## The wiring — where each piece lives

- **Registry:** `js/patches/309-problem-registry.js` (`window.logProblem` + auto
  `error`/`unhandledrejection` capture) → Supabase table `app_problems`, view
  `v_app_problems_open`. Loaded right after `db.js` so it sees every later patch.
- **Guards:** `js/patches/233-uttekt-pdf-autosave.js` (PDF), `254-receipt-sender.js`
  (send), `121-pickup-checkout.js` + `js/pos.js` (kt), `netlify/functions/payday-push.js`
  (billing).
- **Audits:** `tools/audit-*.cjs`, run together by `tools/audit-all.cjs`.
- **Sweep:** Routine `trig_013hqjttRBk7TqbrPum2MskF` — 3×/day (08/13/18), reads
  `v_app_problems_open` + `automation_runs`, opens a draft fix or pings Agnar only
  on need.
- **Guardian:** `.claude/agents/netvordur.md` — the `netvordur` subagent reviews any
  change to a guarded path against this map + `audit-all` and rules **SAFE** or
  **CUTS-A-WIRE**. It is Rule 0 above — the last barrier before live customers.
- **The map:** the visual power grid lives on Miro (recorded in Charlize, topic
  `kerfiskort`) — origins → flows → data → outputs, secured baseline in green,
  open risks in red. Keep it current when the wiring changes.
- **Memory:** Charlize (`charlize_knowledge`) — the 5 root causes + this net's
  lessons (scope `slokkvitaeki` / `kerfi`). Read before changing; write when you
  learn.

---

## Session log — what was made bulletproof

- **2026‑08‑20** — Net founded. Invoice‑OUT guard (blank/wrong/missing → blocked,
  live in prod, #660). Kennitala `999999` trap fixed at the source (#661).
  Problem registry + `window.logProblem` + 3×/day sweep (#661). Five root causes
  recorded in Charlize (invoice‑blank, kt‑trap, kt‑search, email‑token, red‑when‑ready,
  freeze). This doc + `audit-all.cjs` created.
- **2026‑08‑20** — Readiness (`153`) `inService()` **explicit‑removal veto**: a
  hand `⬇ Úr þjónustu` (removed_from_service_at + subscribed:false + er_i_thjonustu
  cleared) now STICKS. Before, the manual equipment blob and live `uttaeki` rows
  re‑qualified a removed company on every refresh, so it kept reappearing
  (Gullsmári 9 → competitor, would not go away). Veto is overridden by any
  re‑activation (er_i_thjonustu=true / subscribed=true — patch 158/198/280) and
  carves out a still‑live brunakerfi contract (`!bruMap`). netvordur SAFE, verified
  on live data (55/57 removed vetoed, 2 correctly escaped, 0 brunakerfi collisions).
- *Add a line here every time you make something bulletproof.*

---

## Still open (traced, not yet wired in)

- **Individual kennitala:** POS search reads `fyrirtaeki`+`vidskiptavinir` but not
  `customers_base`; RSK kt‑lookup is companies‑only (an individual's *name* can't be
  auto‑fetched — Þjóðskrá, no access). Fix: search `customers_base` by kt + a light
  "kt + name for this invoice" path. Touches the customer model → do carefully.
- **Phone on label from a company kt‑lookup:** looking a company up by kt gives no
  place to enter a phone that then prints on the Brother label (`Print.showJob` uses
  `phone`). Small, same area as above.
- **Email token watch:** Google send‑token expires weekly (OAuth app in "Testing").
  Needs a `-background` probe that mints a token and alerts over an independent channel.
- **Skýrslur freeze:** client‑side render cascade (whole `app_settings` blob cloned
  3–4× per finish + unpaginated 660‑card render). Central plumbing → careful.
