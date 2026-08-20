---
name: kunnaskra
description: Viðskiptavina-líkanið (customers_base/fyrirtaeki/vidskiptavinir), DB-skema, base-sameining, kerfis-kort og póst-merki/póstnúmer á fyrirtækjum. Notaðu fyrir kúnna, kennitölur, gagnaskema og tengingar.
tools: Bash, Read, Grep, Glob, Edit
---

Þú kannt **hrygginn** — customers_base → fyrirtaeki (staðir) → uttaeki, og DB-skemað. Aðalregla: **aldrei sameina staði rekstrarfélags** (bara deila customer_base_id). Walk-in = kt 999999-9999.


---

# 📚 Þekkingargrunnur — ÓBREYTTUR texti úr CLAUDE.md

> Fluttur hingað 2026-08-01 við uppskiptingu CLAUDE.md (~15k tokens hlóðust í HVERRI
> lotu). Engu breytt, engu sleppt — hleðst aðeins þegar þessi sérfræðingur er kallaður.

## Database schema

```
customers_base   1082 rows — the CANONICAL customer spine, one per kt (root of
                 the data model; fyrirtaeki/vidskiptavinir/solur link to it)
                 (id bigint PK, kennitala NOT NULL, nafn, simi, netfang,
                  heimilisfang, greidsluskilmali, source_v_id, source_f_id,
                  created_at, payment_method, payment_terms, retention_pct,
                  retention_notes, contact_email, contact_phone, general_notes,
                  last_payment_at, rekstrarfelag)
                 `rekstrarfelag` groups multiple sites under one operator —
                 NEVER merge rekstrarfélög sites, only share customer_base_id.
                 `source_v_id`/`source_f_id` = the vidskiptavinir/fyrirtaeki row
                 the base was seeded from.
vidskiptavinir   individual customers
                 (id, kennitala, nafn, simi, netfang, heimilisfang, athugasemdir,
                  created_at, afslattur_pct, farsimi, vefsida, tengilidur,
                  greidsluskilmali, customer_base_id, deleted_at)
fyrirtaeki       1358 rows — companies / service SITES (one kt may own many =
                 rekstrarfélag). This is the service branch of the spine.
                 (id bigint PK, nafn NOT NULL, kennitala, simi, netfang,
                  heimilisfang, tengiliður, athugasemdir, created_at,
                  afslattur_pct, farsimi, vefsida, tengilidur, greidsluskilmali,
                  status ('virkur'), er_i_thjonustu bool, deleted_at,
                  customer_base_id, review_flag bool, review_note, is_bank_only
                  bool, banner_note, payday_delivery)
                 ⚠️ DUPLICATE contact column: both `tengiliður` (accented) AND
                 `tengilidur` (ascii) exist — Bakendi (patch 232) flags this.
                 `er_i_thjonustu` marks a site as in active service.
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

## Póst-merki + Póstnúmer á „Fyrirtæki í þjónustu" (patch 153) — 2026-07-31

Tvær viðbætur á árssoðun-listann (patch 153) til að hjálpa við þjónustuna, því
við förum bara einu sinni á ári til hvers kúnna:

- **📩 Póst-stöðumerki v2 — umferðarljós (`js/patches/295-company-mail-badge.js`, 2026-08-20)** —
  🔴🟡🟢 merki á Fyrirtæki í þjónustu (mánaðar-yfirlitinu): **🔴 rautt** = síðasta
  póstsamskipti frá kúnna ÓSVARAÐ · **🟡 gult** = mikilvægt/möguleg breyting í póstsögu
  (uppsögn/flutt/eigendaskipti/gjaldþrot/kvörtun/bilun/áríðandi) EÐA handvirkt merkt ·
  **🟢 grænt** = við eigum póstsögu við kúnnann (INN eða ÚT-póst — í sambandi) · ekkert = engin samskipti. Röð:
  rautt > gult > grænt. Gögn úr Brunahólfs-endapunktinum **`/api/company-mail`**
  (`netlify/functions/company-mail.js`, service role, þjónar báðum öppunum) sem skilar
  per `fyrirtaeki_id`: `unreplied` + `important` + `signals[]` ({type,subject,received_at}).
  **Mátun:** rautt er STRANGT (nákvæmt netfang per bygging, aldrei giskað; deilt netfang
  sleppt). Gult (signals) er VÍÐARA — netfang→lögaðili→allar byggingar hans (company-mail
  `detectSignals()` leitarorð, skannar allan gluggann, ekki bara nýjasta). **Grænt er
  VÍÐAST** — hver kúnni sem við eigum póstsögu við (INN `sender_email` EÐA ÚT `to_addresses`),
  base-level EN aðeins single-site svo eina in-service byggingin er ótvíræð; multi-site
  rekstrarfélög fá grænt bara af nákvæmri per-bygginga-mátun (systur aldrei ranglega). ⚠️ Hrá
  leitarorða-talning á „cancel/uppsögn" er MJÖG hávær (fundarafbókanir/áskriftir); raun-
  lífsferils-pósta á kúnna eru fáir (~2/ár) — sjá Charlize, ekki hræðast hráar tölur.
  DEKORERAÐ með MutationObserver (patch 153 ósnert, cache 20 mín). Smellur → spjald með
  „⚠️ MERKI Í PÓSTSÖGU" (lífsferils-merki lituð sér) + nýjasta pósti + „↩️ Svara" +
  „⭐ Mikilvægt" (handvirkt gult) + „🔕 Slökkva rautt". **Flögg per fyrirtæki í**
  `arsskodun_customers[<id>]`: `mail_off` (slökkva rautt), `mail_important` (kveikja gult)
  — deep-merge AppSettings, samstillist. Public: `window.CompanyMail =
  {show, status, data, setMuted, setImportant, refresh}`. **Víðtæk græn þekja KOMIN
  (2026-08-20, brunaholf company-mail):** grænar byggingar leiddar úr `felag_samskipti`
  SJÁLFU gegnum `tv_history_sites(days)` RPC (SECURITY DEFINER, kallað í parallel úr
  company-mail) — sama mátun og Þjónustuver póstar, svo skjáirnir reka ekki í sundur; auk
  in-JS single-site fallback ef RPC bregst. ⚠️ „185 lögaðilar" er ALL-TIME; í 365d-glugga á
  felag AÐEINS ~96 byggingar með póstsögu (hitt var substring-tálmynd). Patch 295-KÓÐINN er
  óbreyttur — bara fleiri grænar `byId`-færslur að baki.
- **📍 Póstnúmer (patch 153 + `14-companies-openedit.js`)** — nýr ADDITIVE dálkur
  **`fyrirtaeki.postnumer` (text)** svo raða/sía megi eftir póstnúmeri fyrir
  akstursleiðir ÁN þess að snerta free-text `heimilisfang`. Bakfylltur úr
  heimilisfangi (síðasti 3-stafa tóki í bilinu 100–902; 582 þjónustu-fyrirtæki).
  Breyta-glugginn (`Companies.openEdit`) fékk „📍 Póstnúmer"-reit (auto-fylltur úr
  heimilisfangi ef tómur, `pcFromAddr`), vistast í `postnumer`. Listinn sýnir
  póstnúmers-pillu í heimilisfang-dálknum, „📍 Póstnúmer" í röðunar-fellilistanum
  (`SORT_COMPARATORS.postnumer`, numeric asc) og leitin matchar póstnúmer.
- **Heimilisfang-hausinn raðar eftir póstnúmeri (2026-07-31)** — dálkahausinn
  „Heimilisfang 📍" er nú `data-sort="postnumer"` (var `address`) svo smellur raðar
  eftir póstnúmeri með ▲/▼ ör eins og aðrir hausar (fyrir akstursleiðir); dropdown-ið
  heldur líka sínu póstnúmer-vali.
- **Mánaðar-sían er FJÖL-VAL + „🚫 Án mánaðar" (2026-07-31, ósk Agnars)** —
  `state.months` (fylki, geymt í `arsskodun_months`; flyst yfir úr gamla eins-mánaðar
  `arsskodun_month`). Smellur á mánuð VÍXLAR honum (má velja nokkra saman); „Allir"
  hreinsar valið; nýr chip aftast **„🚫 Án mánaðar" (0)** sýnir fyrirtæki án skráðs
  skoðunarmánaðar (`monthCounts[0]`). Sían: `inspect_month` í valinu, eða 0-chip →
  þau sem hafa engan mánuð. `monthFilterLabel()` gefur samsett merki („Jan, Feb 2026").

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

## Gagnalíkan viðskiptavina (the spine) + 🗺️ Kerfis-kort — SAMEIGINLEGT með Brunahólf

Slökkvitæki + Brunahólf deila EINUM Supabase — viðskiptavina-líkanið er hryggur:
**`customers_base`** (canonical, einn per kt · `rekstrarfelag`) → **`fyrirtaeki`**
(staðir; einn kt getur átt marga = rekstrarfélag; `er_i_thjonustu`; **aldrei
sameina staði rekstrarfélags**) → **`uttaeki`** (tæki — **auto-generuð placeholder,
skipta ekki máli, „án staðar" er ekki vandi**). **`customer_documents`** (skýrslur/
reikningar/samningar úr Drive, keyed base+`fyrirtaeki_id`+`year`; ein ársskýrsla
per (staður,ár); reikningar á R-nr; `is_duplicate`). **`solur`** + **`payday_
invoices_slokk`** (kt digits-only) tengjast eftir **kt**. Walk-in = kt `999999-9999`.

**Forgangsröð kúnna-taflna (Agnar 2026-07-30):** AÐAL-viðskiptavinirnir eru
**`customers_base`** („Allir viðskiptavinir", kanóníski hryggurinn) og **`fyrirtaeki`
með `er_i_thjonustu=true`** („Fyrirtæki í þjónustu" — þjónustukúnnarnir sem reksturinn
snýst um). **`vidskiptavinir` er LÆGSTA þrepið** (einstaklingar/legacy) — ekki nota
sem aðal-uppflettingu eða fyrsta svar við „hvar eru viðskiptavinirnir".

**🗺️ Kerfis-kort** — lifandi einnar-síðu yfirlit yfir ALLA viðskiptavini + tengingar
+ heilsu (2023–2026 skjöl per ár, ótengd/tvítök/án-kt flögg). Á **brunaholf.netlify.
app/kerfiskort.html** (Brunahólf-megin, því skjöl/Drive-tólin lifa þar). Sýnin
`v_kerfi_kort` + endapunktur `/api/kerfi-kort`. Tengingar lagaðar í Brunahólf-Bakendi
(Skýrslu-stöð, Kt-samræming, Hreinsi-borð, Drive-flokkun). **Á slökkvitæki-hlið**
birtast skjöl+Payday á fyrirtækja-prófílnum í „📁 Skjöl & viðhengi" (patch 199).

