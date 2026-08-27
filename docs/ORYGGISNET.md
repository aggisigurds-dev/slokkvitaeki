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
| **A Drive/URL-hosted invoice is sendable — and never sent empty** | `254` `_okAtts` telur `content`(>256) **/ `driveId` / `url`** gild; `gmail-send` neitar (422 `ATTACHMENTS_FAILED`) leysist umbeðið viðhengi ekki | `blank_invoice_blocked`, `send_failed` | `audit-attachment-forms.cjs` |
| **An entered kennitala is never dropped to `999999‑9999`** | `121` saves `customer_kt` on both save paths; `js/pos.js` extracts a kt typed into the name field | *(kt signals to come)* | `audit-kt-trap.cjs` |
| **POS fastur afsláttur skilar sér í körfuna** | `lookupKt` sækir kt **með og án** bandstriks (sama `.or` og checkout); 114 skrifar `discount_pct` strax; `pickBest` heldur pönnuðum `co_id` | — | `audit-pos-kt-discount.cjs` |
| **POS search doesn't silently drop customers past 1000 rows** | `DB.fetchAll` pagination on the big tables | — | `audit-pagination.cjs` |
| **Per‑line discount + credit notes bill Payday correctly** | `payday-push.js` per‑line gate + credit `discount_pct=0` strip | `send_failed` (token) | *verified vs 697 live sales; audit TODO* |
| **GET cannot mark invoices paid or upsert the Payday mirror** | `payday-sync-paid` / `payday-pull-slokk`: GET is always dry; POST is the only commit (cron + Kröfu 🔄) | — | `audit-payday-get.cjs` |
| **The tæki→starfsstöð FK join hides no live in‑service customer** | `153` counts devices by `uttaeki.fyrirtaeki_id` (not folded client‑name); soft‑deleted excluded at `153:162` | `uttaeki_null_fid` | `audit-fk-join.cjs` |
| **Rekstrarfélaga-staðir hrúgast ekki saman á kennitölu** | `175` live-raðir bera `co_id = fyrirtaeki.id`; `companyForBld` giskar aldrei `hits[0]`; `document_pairs` lyklað á `fyrirtaeki_id` (ekki base) | — | `audit-rekstrarfelog-sites.cjs` |
| **Rekstrarfélög = kennitala + staðurinnúmer** | `payday-push` `accountingCost` `"kt nr. N"` aðeins þegar `_siteTrusted`; POS giskar ekki `.limit(1)` á fyrsta hótel | — | `audit-stadur-nr.cjs` |
| **Ársskoðun blár reiknings-punktur er per stað + úttekt** | `187` `hasReikYear`: `byCo` + unique-kt orphan; `hasConfirmedInvYear` = `v_uttekt_ar` / POS `solur.customer_id` (ekki Drive-einn); `vidskiptategund` sleppir brunakerfi/búð | — | `audit-arsskodun-inv-dot.cjs` |
| **Ársskoðun 🧾 er úttekt, ekki brunakerfi** | `187` `isUttektInvoiceTeg` + pair-skip; `isReportKind` telur ekki brunakerfi-PDF; `199` `invUtByY`/`invBrByY`; `175` `tegByInv` | — | `audit-arsskodun-inv-dot.cjs` / `audit-rekstrarfelog-sites.cjs` |

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
- **2026‑08‑20** — Doc‑open links (`153`/`187`) storage‑first + authed proxy: report &
  attachment chips route through Brunahólf `/api/skjal` (server‑OAuth streams the PDF
  inline) instead of raw `drive.google.com/file/d/` links that 404 on un‑shared files.
  Part of the cross‑app "fix‑it‑once" sweep (26 files, both apps → the one live proxy).
  netvordur SAFE (measured 1231==1231 rows keep a link, 0 lost); audit‑all 3/3. Pure
  open‑URL change — no readiness/OUT/kt/save touched.
- **2026-08-21** — Sala/Sótt fix cluster (netvordur SAFE, audit-all 3/3):
  **Sótt prepaid banner** (`121`, 8d2ba49): the GREITT "greitt fyrirfram" gate had been
  flipped to `!!paid_at` (08-20), lighting green on 187 reikningur sales (bank-sync
  stamps paid_at) so tæki went out óuppgerð; display gate reverted to a denylist
  (paid_at AND greitt_med ∉ {reikningur, greitt síðar}), settlement `prepaid=!!paid_at`
  left intact so no paid sale is disturbed. **POS name corruption**
  (`pos.js`/`00-legacy`, 422449f): real kt + empty name saved "kt: <kt>" as the NAME →
  only the kt reached label/Verkstæði/Afgreiðsla, then it dropped; now falls back to
  'Viðskiptavinur' (kt stays in customer_kt) + 00-legacy blanks a kt-placeholder before
  the vidskiptavinir upsert so it can't clobber a real name; kt-trap invariant unchanged.
  **Editor discount un-bake** (`142`, f56ce35): un-bakes POS "· −N% afsl." lines on load
  so the per-line % shows in drafts/edits and re-entry can't double-apply; print==booking
  verified, bounded ≤~1 kr re-save drift on drafts. **Phone at Sala** (`114`, 5cd173a):
  editable Sími box on the selected-customer card → state.customer.simi. Non-guarded same
  day: label-print phone field (`139`, #17) + rekstrarfélög upload-key sanitise (`111`, #18).
- **2026‑08‑23 — Factcheck Task 1: tæki→starfsstöð FK join** (`153`, `199`, PR #706):
  `153-arsskodun.js` taldi tæki per fyrirtæki með fólduðu client‑nafni
  (`uttaeki.client == fyrirtaeki.nafn`) → tvítaldi fjölstaða‑rekstrarfélög (Bílabúð
  Benna sýndi 13 tæki á báðum Krókhálsi og Fiskislóð). Fært á beina FK‑ið
  `uttaeki.fyrirtaeki_id` (`loadActiveUnitsByFid`/`loadNextInspByFid`, `hasUnits`
  `153:302`); `199` skoðunarmánaðar‑fallback samræmt (base→fyrirtaeki_id). Vörður:
  readiness‑settið óbreytt á lifandi gögnum (in‑service OLD 683 = NEW 683, 0 drop‑outs
  — netvörður hermdi tvisvar), soft‑eydd fyrirtæki síuð burt (`153:162`), null‑FK virk
  tæki (36, entry 13) talin + `logProblem('uttaeki_null_fid')` svo þau sjáist á
  Kerfisheilsu uns Cowork tengir þau. Nýtt audit `audit-fk-join.cjs` (BASELINE 0) sannar
  að enginn lifandi kúnni detti úr þjónustu vegna joinsins; `audit-all` nú 4/4 grænt.
- **2026‑08‑24 — Ein uppspretta skoðunarmánaðar (`312 CanonStadur`).** Skoðunarmánuður
  fyrirtækis birtist á 5 flötum (`175` Rekstrarfélög, `185` Í þjónustu, `companieslist`,
  `89` mánaðar‑röð, `77` gjaldfallið) og hver reiknaði sinn eigin úr nafna‑strengs
  `min(uttaeki.next_insp)` → ólíkar niðurstöður (Center Hótel Arnarhvoll sýndi janúar
  í stað ágúst; rangur mánuður = gleymd skoðun = brunahætta). Nýr sameiginlegur brunnur
  `js/patches/312-canon-stadur.js` (`window.CanonStadur`) les `v_stadur_yfirlit`
  (skýrsla/reikningur, ein röð per `fyrirtaeki_id`) EINU SINNI; `nextDateOf(id)` skilar
  mánuði AÐEINS úr skýrslu/reikningi, annars `null` (aldrei nafna‑strengs‑dagsetning).
  Allir 5 flötir + `199` prófíllinn lesa nú sama stað. Vörður: `logProblem`
  (`canon_stadur_load_failed`/`canon_stadur_empty`) svo þögult tap sjáist á Kerfisheilsu;
  nýtt audit `audit-canon-stadur.cjs` (BASELINE 0) sannar á lifandi gögnum að ekkert
  fyrirtæki með þekktan skýrslu-/reikningsmánuð tapi honum í viewinu (0/658; 589 í
  þjónustu með mánuð, 69 án → birtast sem gloppur í Ársskoðun `153`, ekki þögult horfin).
  `audit-all` nú 5/5 grænt. Varðir vírar (`153/187`, `10/233/254`, `121`, `payday-push`)
  ósnertir.
- **2026‑08‑25 — GET má ekki skrifa Payday.** `payday-sync-paid` og
  `payday-pull-slokk` skrifuðu á óinnskráð GET (paid_at / payday_invoices_slokk
  spegill). GET er nú alltaf dry-run; POST er eina skrifleiðin. Cron
  (`payday-sync-cron`) POSTar báða leggina. `payday-push.js` ósnert. Nýtt
  audit `audit-payday-get.cjs` + `audit-brunakerfi-stada.cjs` (`audit-all` 7/7).
  Sama lota: Brunakerfi yfirlit Staða sýnir ✅ Skoðað YYYY AÐEINS þegar
  `customer_documents` á brunakerfi-skýrslu það ár (`272` `r.years`), ekki
  `last_year_inspected` (Ársskoðunar-flagg).
- **2026‑08‑25 — Brunakerfi Staða krefst skýrslu-skrár.** Fyrsta `r.years`
  leiðréttingin taldi tóm `'#'` og HTML-rusl sem skýrslu. `272` `hasReport`
  krefst nú `http…` URL (PDF/Drive), hafnar `'#'` og `.html`. Center Hótel
  Klöpp / Laugavegur / Plaza halda áfram 2025-skýrslu + Ársskoðunar-flaggi
  2026 án þess að Staða ljúgi „Skoðað 2026". `audit-brunakerfi-stada.cjs`
  uppfært. `153/187` ósnert.
- **2026‑08‑25 — Rekstrarfélög: ein eign = einn `fyrirtaeki.id`.** Ein kennitala
  á margar eignir (Heimaleiga, Center Hótel). `175` týndi `id` við live-hleðslu
  og mátaði aftur á nafni/kt — Hotel Grandi, 🧾-leki á öll systkini, Payday
  ótengt stað. Nú: `co_id` pinnaður, engin `hits[0]`-gisk, `document_pairs` og
  R/PD-númer per stað (`solur.customer_id`). Staðirnir eru **aldrei sameinaðir**.
  `payday-push.js` ósnert. Audit `audit-rekstrarfelog-sites.cjs`.
- **2026‑08‑25 — Ársskoðun 🧾-punktar per stað.** `187` `reikMap` var lyklað á
  kennitölu svo einn 2026-reikningur á Center Hótel kveikti bláan punkt á öllum
  11 hótelunum (Hlaðvarpinn, Þverholt 14, Arnarhvoll, …). Nú `reikByCo` á
  `fyrirtaeki_id`; base-only reikningar gilda aðeins þegar base á einn stað.
  `isReportKind` telur ekki `brunakerfi` sem úttektarskýrslu. Invoice OUT /
  payday / kt-save ósnert. Audit `audit-rekstrarfelog-sites.cjs` (187 source).
- **2026‑08‑25 — Reikningar per þjónusta, ekki einn pottur.** `doc_type` er
  alltaf `reikningur` fyrir slökkvitæki OG brunakerfi; merkið er
  `vidskiptategund`. Ársskoðun `187`/`153` sleppir `brunakerfi`/`bud` af
  úttektar-🧾 og `klarad`-grænu (Grandi 2026 par 1295 → R-108001). Prófíll
  `199` skiptir í `invUtByY`/`invBrByY` (óþekkt → úttektarkortið aðeins).
  Rekstrarfélög `175` kveikir ekki 🧾 þegar par og reikningur stangast á.
  Gátt merkir þjónustu. Pörin sjálf eru **ekki** eydd. Invoice OUT / payday /
  kt-save ósnert. Audit `audit-rekstrarfelog-sites.cjs` (`isUttektInvoiceTeg`).
- **2026‑08‑25 — POS fastur afsláttur í körfu.** `lookupKt` spurði aðeins
  tölustafa-kt; DB geymir bandstrik (`420187-1499`) → 0 raðir → RSK 0% yfirskrifaði
  15% Colas Gullhellu. Nú: tveggja-forma `.or` (eins og checkout), 114 skrifar
  `discount_pct` strax, `pickBest` heldur völdum stað. `payday-push` / `totals()`
  / 10/233/254 ósnert. Audit `audit-pos-kt-discount.cjs`.
- **2026‑08‑25 — Ársskoðun blár punktur = reikningur *þessa* staðar.** `187`
  `loadReik` lyklaði `customer_documents` reikning á kennitölu, svo einn
  Center Hótel-reikningur málaði bláan punkt á öll 11 hótel (Hlaðvarpinn /
  Þverholt 14 / Þingholt Apartments 2024+ án eigin reiknings). Nú:
  `hasReikYear` per `fyrirtaeki_id` (+ unique-kt orphan). Skoðað/klarad/
  `isDoneYear` ósnert. Audit `audit-arsskodun-inv-dot.cjs`.
- **2026‑08‑25 — Rekstrarfélög: kennitala + nr.** Agnar: nota númerakerfið
  *með* kennitölunni. `stadur_nr` eitt er ekki einkvæmt (Plaza nr. 2 ≠ Máni
  nr. 2). Payday `accountingCost` verður `"450905-1430 nr. 8"` þegar staður
  er treystur; POS hættir að `.limit(1)` festa reikning á fyrsta hótel
  kennitölunnar; 114 sýnir `kt · nr. N`; 175 parar kt+nr. Audit
  `audit-stadur-nr.cjs`.
- **2026‑08‑26 — Ársskoðun 🧾 = slökkvitækjaúttekt, ekki brunakerfi.** `doc_type`
  er alltaf `reikningur` fyrir báðar þjónustur; merkið er `vidskiptategund`.
  `187` `isUttektInvoiceTeg` sleppir `brunakerfi`/`bud` af `reikMap.byCo` (master
  site-keyed maps, not #728 `reikByCo`). `loadPairs`/`153` `klaradCurP` sleppa
  uttekt+klarad pörum sem vísa á brunakerfis-reikning (Grandi R-108001).
  `isReportKind` telur ekki brunakerfi-PDF sem úttektarskýrslu (Arnarhvoll 2026).
  `199` skiptir í `invUtByY`/`invBrByY`. `175` kt·nr helst; `tegByInv` bætist.
  Pörin sjálf eru **ekki** eydd. Invoice OUT / payday / kt-save ósnert.
- **2026‑08‑26 — Plaza false flag: Drive-einn reikningur málar ekki inv-only.**
  Center Hótel Plaza (193) átti `customer_documents` 9868 / R-107802 (Stolpi
  01.02.26, hleðsla) merktan `uttekt` á staðnum — Rekstrarfélög/prófíls-pillur
  rétt án blás, Ársskoðun kveikti LED af `reikMap.byCo`. Nú: 🧾 við skýrslu =
  site-keyed úttekt; inv-only = `v_uttekt_ar` eða `solur.customer_id`.
  `153` `_docYears` tekur ekki lengur allar base-skýrslur inn á hvert systkini
  (Plaza Sími málaðist grænt 2026 af Klöpp/Grandi). Invoice OUT / payday / kt-save ósnert.
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
