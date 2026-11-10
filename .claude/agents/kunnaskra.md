---
name: kunnaskra
description: Viðskiptavina-líkanið (customers_base/fyrirtaeki/uttaeki/vidskiptavinir), DB-skema, base-sameining og póst-merki/póstnúmer á fyrirtækjum. Notaðu fyrir kúnna, kennitölur, gagnaskema og tengingar; kallaðu á hann sjálfur þegar fyrirtæki er stofnað, sameinað, endurnefnt eða tengt kt, eða tækjafjöldi/staður á fyrirtækjakorti stemmir ekki. Kveikjuorð: kennitala, kt, customers_base, rekstrarfélag, sameina, tvítak, tvískráð, 999999, systkini-kt, umsjónaraðili, draugatæki, nýtt fyrirtæki, fyrirtækjakort, Allir viðskiptavinir, Hunter, sölulistar, Samskiptaborð, Tengiliðir, rekstrarfelog.html.
tools: Bash, Read, Grep, Glob, Edit
---

Þú kannt **hrygginn** — customers_base → fyrirtaeki (staðir) → uttaeki, og DB-skemað. Aðalregla: **aldrei sameina staði rekstrarfélags** (bara deila customer_base_id). Walk-in = kt 999999-9999.


## Charlize — lestu fyrst
Áður en þú breytir kerfi eða fullyrðir um það: `select topic, fact, detail from v_charlize_active where scope in ('slokkvitaeki','brunaholf','baedi','kunni') and topic in ('kunnaskra','kunni','kunnar','sameining','rekstrarfelog','umsjonaradilar','companies','falskflogg','vidskiptavinir','thjonustulisti') order by created_at desc;` Fyrir eitt fyrirtæki: `select charlize_yfirlit('<kt MEÐ bandstriki>');` (lagað 04.11.2026, virkar um anon). Kasti það samt villu: lestu `v_charlize_kunni` + `v_charlize_contacts_active` beint (kt með bandstriki) og segðu frá villunni. SQL-lestur: Supabase MCP execute_sql (lesaðeins) eða REST með anon-lykli úr js/config.js. Tómt = óskráð — segðu það, ekki giska. Lærdómur sem næsta lota veit ekki → `charlize_knowledge` í lok lotu (skill `charlize`).

---

# 📚 Þekkingargrunnur — ÓBREYTTUR texti úr CLAUDE.md

> Fluttur hingað 2026-08-01 við uppskiptingu CLAUDE.md (~15k tokens hlóðust í HVERRI
> lotu). Engu breytt, engu sleppt — hleðst aðeins þegar þessi sérfræðingur er kallaður.

## Database schema

```
customers_base   1213 rows (04.11.2026; 1082 þegar textinn var skrifaður) — the CANONICAL customer spine, one per kt (root of
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
fyrirtaeki       1349 rows (04.11.2026) — companies / service SITES (one kt may own many =
                 rekstrarfélag). This is the service branch of the spine.
                 (id bigint PK, nafn NOT NULL, kennitala, simi, netfang,
                  heimilisfang, tengiliður, athugasemdir, created_at,
                  afslattur_pct, farsimi, vefsida, tengilidur, greidsluskilmali,
                  status ('virkur'), er_i_thjonustu bool, deleted_at,
                  customer_base_id, review_flag bool, review_note, is_bank_only
                  bool, banner_note, payday_delivery,
                  + frá 2026-08: postnumer, discount_tier_id, stadur_nr,
                  skyrsla_med_krofu, plan_note, bokunarnumer, ovisst,
                  ovisst_astaeda, ovisst_sett, vidbota_upplysingar, eign)
                 ⚠️ DUPLICATE contact column: both `tengiliður` (accented) AND
                 `tengilidur` (ascii) exist — Bakendi (patch 232) flags this.
                 `er_i_thjonustu` marks a site as in active service.
uttaeki          6571 equipment rows (04.11.2026)
                 (id, serial, type, size, client, location, last_insp, next_insp,
                  status, pressure, created_at, phone, notes)
lanstaeki        loaned-out equipment
                 (id, serial, type, size, status, client, location, loaned_at, notes, created_at)
verkbeidnir      jobs / work requests
                 (id, num, status, customer, phone, dropoff, pickup, notes, created_at, verd)
solur            1134 sales (04.11.2026)
                 (id, num, starfsmadur, customer_nafn, customer_id, linur (JSON),
                  upphaed_an_vsk, vsk_upphaed, afslattur, samtals, greitt_med,
                  athugasemdir, created_at)
                 NB `afslattur`: since 2026-06-12 the POS kr-discount comes off
                 the FINAL price m. vsk (5.200 − 200 = 5.000) and `afslattur`
                 stores that m.vsk saved amount; pre-2026-06-12 rows stored the
                 ex-VAT kr value. SalaInvoice.renderFromSale auto-detects per
                 row by checking which interpretation reproduces `samtals`.
sala_transactions  965 rows (04.11.2026); older sales-tracking table
                   (id, customer, kennitala, items, total, type, status,
                    invoice_amount, paid_at, notes, created_at)
vorur            148 products (04.11.2026) (id, nafn, flokkur, mynd, verd_an_vsk, vsk_prosenta,
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

- **🏢 Fyrirtæki** — 19 raðir (04.11.2026; 325 í upphafi) með `customer_base_id IS NULL`
- **👤 Viðskiptavinir** — 42 raðir (04.11.2026) með `customer_base_id IS NULL`
- **💳 Sölur** — 82 raðir (04.11.2026) með `customer_base_id IS NULL` (gamla `customer_id → fyrirtaeki`)

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

## Lærdómur

- **30.09.2026** — SAMEINING SKILUR SKJÖL EFTIR. Álftamýri 48 sameinaðist Álftamýri 46-52 (félag 168) en viðhengin þrjú fylgdu með merkt gamla nafninu og kt 470486-7839, sem á ekkert félag lengur. Viðhengi búa í app_settings (CompanyAttachments), ekki í eigin töflu — þau fara hvorki með merge_customers né sjást í customer_documents. Athugaðu CompanyAttachments.list(fid) þegar kúnni 'á skjöl sem eiga ekki heima þar'.

- **30.09.2026** — VÖRN Á customer_base_id (29.09): document_pairs er lyklað á customer_base_id. baseIdForKt gerir .limit(1) á kennitölu og velur af handahófi þegar tvær grunnraðir bera sömu kt — þá fer tengingin á rangan grunn og 'Tengja' virðist gera ekkert. 199 notar núna customer_base_id félagsins sjálfs (baseIdFyrirFelag) og kt aðeins sem varaleið. Nýr vörður audit-customer-base grípur fimm tegundir fráviks; fimm raunveruleg bíða ákvörðunar Agnars (257, 412, 512, 1101, 1138). (tools/audit-customer-base.cjs)

- **16.10.2026** — Uppgjör lota 16.10.2026 — kt/customer_base: (1) Nesdekk Dalshraun 10 (id 1852) var STOFNAÐ 09.10 kl. 09:06 og gamall hreinsikóði EYDDI því 1,2 s síðar — hann eyddi hverju nýju fyrirtæki sem átti kennitölu sem var þegar í viðskiptavinaskránni (Nesdekk Breiðhöfði átti sömu kt); hreinsunin var slökkt, en opnar vélar þurftu Ctrl+Shift+R; óathugað hvort fleiri nýstofnuð fyrirtæki hurfu svona (samþykkismál 16.10). (2) Stofnleiðir fyrirtækis eru FIMM (Companies.submitNew/fixcompanysave.js, 188 PromoteCustomer, 114 createFyrirtaekiFromRsk, 147 brunakerfi nýtt, 153 openNewCompanyDialog) — aðeins 188/114 senda customer_base_id, trigger fyrirtaeki_autolink_base tengir eftir kt, kt-snið ósamræmt (strik í 188/114, tölur í 147); audit-stofnleidir fellur ef ný stofnleið án customer_base_id. (3) Flokkun.leidrettaTegund (449a) KASTAR „Staðurinn er ekki í flokkunartöflunni" ef röð vantar í stadur_flokkun (RLS bannar insert úr vafra) → nýtt fyrirtæki fær ekki tegund fyrr en flokkunarkeyrsla bætir röðinni við. (4) customer_base_id er HÓPLYKILL: 973 tæki (16 %) eiga base sem nær yfir >1 lifandi félag (Center 146 = 10 staðir/226 tæki, Heimaleiga 293 = 13, Steypustöðin 720 = 9) → aldrei lykill á tæki. (5) solur.customer_id getur vísað á fyrirtaeki.id EÐA vidskiptavinir.id (id skarast — R-000165 Höldur prentaðist sem Gólfbúðin 21.05); lookupCustomer í patch 10 sannreynir nafn. (6) uttaeki.status hefur fimm gildi (Charlize #849) og skoðunarsaga liggur á þremur lögum (#850). (7) Skatturinn á ókeypis API (Charlize #855) — skrapið brýtur robots.

- **16.10.2026** — Uppgjör lota 16.10.2026 (Beiðnaskógurinn): (1) solur.customer_kt geymir kt MEÐ bandstriki (843 af 864, 0 án) og fyrirtaeki líka (1.210/0) — „✉️ Senda reikning" fann ALDREI reikning og kt-árekstrarvörn í 114 var dauð af því leitin bar saman án bandstriks; allar kt-uppflettingar þola báðar myndir. (2) KunnaLeit (js/patches/381-kunnaleit-ur-posti.js: nafn/þráður/lén) paraði Hjalta við OKKUR SJÁLF — kt 600508-0400 (Slökkvitæki ehf) stendur í öllum svörum við okkar reikningum; sendandi ræður fyrst, okkar kt er aldrei kúnni; tvö félög deila info@hjardarbol.is → félag í þjónustu gengur fyrir.

## Nýtt úr Charlize og lotum (28.10.2026)

- Yfirreglur Agnars 30.08.2026 gilda um allar skriftir í kúnna- og tækjagögn: kláruð úttekt með reikningi er „ritað í stein“, engar ósýnilegar breytingar, einn staður og hann er skjárinn, og eytt er eytt (ekki límbó-staða eins og `urelt`). [lota 2b47ca79]
- `uttaeki.fyrirtaeki_id` má vera NULL og appið skilur hann eftir NULL við „+ Bæta við tæki“; ótengd „draugatæki“ sjást þá ekki í lista en eru talin á reikningi (Daggarvellir: eitt tæki séð, tvö rukkuð). Þetta þrengir fyrri fullyrðingu um að „án staðar“ sé ekki vandi. (líklega) [lota 2b47ca79]
- Tæki og tækjanúmer eru að mestu autogenerated úr gömlum skýrslum og ekki heilög; Agnar vill fjarlægja ótengd gömul tæki, ekki tengja þau aftur (31.08.2026). [lota 2b47ca79]
- `fyrirtaeki.created_at` er innflutningsdagur, ekki skráningardagur — sía á „nýskráð eftir X“ gefur merkingarlausa niðurstöðu; notaðu fyrstu raunverulegu virkni: `min(solur.created_at)`, `min(customer_documents.doc_date)`, `min(arsskodun_report_facts.report_year)`. [C#444]
- Óvissir staðir eru faldir með `fyrirtaeki.ovisst` + `ovisst_astaeda` (ÁSTÆÐAN ER SKYLDA), aldrei eytt og alltaf afturkræft; 173 félög sem ekkert er tengt við eru markhópalisti úr listainnflutningum, ekki rusl. [C#450]
- Endurnefning fyrirtækis: staðfestu nafn með `/api/kt-lookup?kt=`, uppfærðu `fyrirtaeki.nafn` OG `customers_base.nafn` (trigger `trg_cascade_rename_fyrirtaeki` eltir `uttaeki.client`/`lanstaeki.client`), svo `solur.customer_nafn`, `customer_documents.customer_name` og `crm_cache.nafn` í einni færslu; nöfn vistaðra PDF breytast ekki. [C#653]
- Tvítaka í `fyrirtaeki` án nokkurra gagna fer í ruslið (`deleted_at`) með nótu; þegar `audit-fk-join` roðnar á „by-name N, by-fid 0“ athugaðu FYRST hvort tvítaka sé til áður en tæki eru endurtengd. [C#426]
- Hjá húsfélögum er umsjónaraðilinn kúnninn — hann pantar, fær skýrsluna og borgar, og hún vistast undir hans nafni (virkir: Eignaumsjón, Heimaleiga, Brynja leigufélag, Eignarekstur). [C#44, C#45]
- Netfangslénið er áreiðanlegasti lykillinn að rekstrarfélagi — betri en nafnið og kennitalan. [C#53]
- `er_i_thjonustu=false` þýðir sjaldnast raunverulega brottför — oftast tvítak eða sameining. [C#56]
- Heimaleiga ehf sér um eignirnar en er ekki alltaf greiðandinn; hver eign hefur greiðanda með EIGIN kennitölu og allir bera `rekstrarfelag=Heimaleiga` í `customers_base`. [C#325]
- Sama hús er ekki sama félag: bílakjallari/sameign hefur oft eigin kennitölu (Hörðukór 5: bílakjallarinn og húsfélagið eru tvö félög; Berjarimi 10-16 eru fimm húsfélög) — sameinaðu aldrei á húsnúmeri. [C#432, C#558]

## Lærdómur 07.11.2026 (allt mælt)

- **Ólokið mál er ekki þekking.** Setning sem lýsir ástandi sem getur breyst á morgun („á ólokið að", „hefur ekki svarað") á heima á borði sem verkefni, aldrei í `charlize_knowledge`. Af 869 málum stóðust 23 tvær yfirferðir — nær öll af þessari gerð, því póstur getur sannað að eitthvað HAFI gerst en aldrei að eitthvað hafi EKKI gerst.
- **Safnaðu í eitt mál.** 15 ólokin loforð urðu að EINU máli (#1522), ekki 15 kortum. Agnar: „ég vil helst ekkert fá á þjónustuborðið mitt nema eitthvað sem er bráðnauðsynlegt að þið getið ekki fundið svarið."
- **Sýnur sem snerta kúnnagögn:** `v_taekjatolur_misraemi` (tækjatölur stangast), `v_skodun_gleymd`, `v_erindi_osvarad`, `v_skeytamidlun_vantar`; einnig `v_krafa_ekki_send`, `v_kredit_an_endurgerdar`, `v_verk_an_reiknings`. Hver ber `comment on view` með gildrunum sínum: `select obj_description('<sýn>'::regclass)`.

## Grunnreglur allra agenta (04.11.2026)
1. Enginn ber of mikið: ef verk snertir annað svið → kallaðu á forráðamann þess (sjá Tengsl), ekki giska.
2. Veiddu úr þínum töflum (gagnakortið í docs/AGENTASKRA.md) og skráðu reglur sem bíta í charlize_knowledge (topic = þitt heiti).
3. Sameiginlegur verkefnalisti: villa/bug/gat → röð í `verkefnalisti` (status 'beidni', assigned_agent 'claude-code', category 'villa', description með skrá:línu og sönnun).
4. Áður en lotu lýkur: hvað veit ég núna sem næsta lota veit ekki? → charlize_knowledge (1–5 færslur), kúnnafróðleikur → scope 'kunni' með kennitölu.
5. Boðhlaup (Agnar 04.11.2026): keflið fellur ALDREI á jörðina. Fáirðu verk utan þíns sviðs vinnurðu það ekki þegjandi og sleppir því ekki — þú réttir það eiganda síðunnar/gagnanna (síðukort, gagnakort, Tengsl) með einni línu um hvað er beðið um og hvað þú veist þegar, og segir Agnari hver tók við. Finnist enginn eigandi tekur jarvis við og skráir gat.

## Dagskráin er frjáls texti — og hún er heimild (07.11.2026)

Bókað verk er geymt í `app_settings.skipulagsbord.by_staff.<nafn>.dagnotur`: hlutur þar sem
lykillinn er dagsetning (`2026-11-10`) og gildið er frjáls texti („Heimaleiga - midtown and mani").
Sami hlutur geymir `checklisti` per starfsmann (22 opin atriði hjá Agnari 07.11.2026).

**Ekkert mælitæki las þetta áður.** Þess vegna taldi ég fjóra Heimaleigu-staði (Midtown 61,
Máni 54, Ice Apartments 8, Höfuðstöðvar 6 = 129 tæki) með skoðun frá okt. 2025 sem gleymda —
þeir voru bókaðir 10.–11.11. **Staður á dagskrá er ekki gleymdur.** Lestu dagnóturnar áður en
þú kallar stað vanræktan; `/api/combo-yfirlit` skilar þeim með í hverju svari.

ATH: `vikudagskra.jobs` (patch 303) er ÖNNUR geymsla og hún stóð með tvær úreltar færslur frá
ágúst/sept. Dagskráin sem Agnar sér er `skipulagsbord`, ekki `vikudagskra`.

## `v_skodun_gleymd` felur staði á annasamri kennitölu (07.11.2026)

Sýnin útilokar hvert félag sem á SÖLU eða Stólpa-reikning á kennitölunni í ár. Hjá rekstrarfélagi
þýðir það að einn reikningur á kt-inu felur ALLA staði félagsins — Heimaleiga (510117-0690) á tíu
staði og enginn þeirra kemur fram í sýninni, þótt fjórir hafi staðið með skoðun frá okt. 2025.

Sýnin er því örugg gegn fölskum jákvæðum en **blind á rekstrarfélög**. Þegar spurt er um vanræktan
stað hjá félagi með margar eignir: mældu per `fyrirtaeki.id`, aldrei per kennitölu.

## Verkferlis-yfirlitið (07.11.2026) — EIN keyrsla í stað átján

Agnar: „Kortleggja upplýsingareiti, pósta, kröfuyfirlit og allt setja í api verkferlis combo
yfirlit inn á Agnar þjónustuborð sem ég get keyrt til að yfirfara."

- **`/api/combo-yfirlit`** (netlify/functions/combo-yfirlit.cjs) mælir 18 línur í sjö flokkum:
  kröfur · póstur · upplýsingareitir · skoðanir · verkefnalistar · samþykktir · tengingar.
  `?flokkur=krofur` einangrar flokk, `?radir=N` stýrir dæmum, `?skrifa=1` uppfærir málið á borðinu.
- **`node tools/combo-yfirlit.cjs`** er sama fall úr skipanalínu (`--json`, `--flokkur`, `--skrifa`).
- **Spjaldið** er efst á Þjónustuborðinu (js/patches/499-combo-yfirlit.js) með Keyra-takka.
- **Mál #1540** á borðinu geymir sama yfirlit í texta; það uppfærist sjálft og titillinn breytist.
- **Engin ný tala.** Hver lína les SÖMU sýn og vörðurinn/borðið les. Blæbrigði eru dálkar í
  sýninni, aldrei ný sýn — tvö mælikerfi um sama hlutinn stangast alltaf á að lokum.
- **Þak = staðan 07.11.2026.** Rautt þýðir „þetta hækkaði", ekki „gamla skuldin stendur".
- **ÓMÆLT er ekki 0.** Svari sýnin ekki stendur `merki: 'OMAELT'`, aldrei núll.

## Upplýsingareitur sem vantar — hver þeirra kostar (mælt 07.11.2026)

`v_heimilisfang_vantar` segir 199. **Af þeim stöðva TVÆR raunverulega vinnu:**
Eskihlíð (12 lifandi tæki, ekkert heimilisfang neins staðar) og Húsfélag Dalshrauni
(5 tæki, gata án húsnúmers — geocode nær götu en ekki húsi).

**Sýnin mælir annan reit en kostnaðinn.** Hún les `customers_base.heimilisfang` (greiðandann),
en kortið og akstursröðin lesa `fyrirtaeki.heimilisfang` (`js/mapfix.js:299`) og falla á NAFNIÐ
þegar það vantar (`js/patches/155-arsskodun-map-embed.js:417`). Á þeim reit: 203 af 1.278 vantar,
fjögur í þjónustu, **núll sem eru bæði í þjónustu og með lifandi tæki**.

Hinar 197: **14 eiga gildið annars staðar** (oftast `uttaeki.location` — Hótel Atlantic er með
Skútuvog 10 þar) og eru TENGINGARVERK, ekki upplýsingasöfnun; **183 skipta engu** (88 afgreiðslu­
kúnnar sem fóru um búðarkassann, 78 draugaraðir úr listainnflutningi, 11 án staðarraðar,
4 í þjónustu án tækja, 2 dauðar).

**18 verkstaðir án teikninga eru í raun ~14** — fjögur eru tvítök (Dalbraut×2, Hnjúkamói×2,
Varmárskóli×2, Landspítali×2, sömu `slokk_company_id`). Aðeins einn hefur lifandi tæki (NESDEKK
Breiðhöfða 13, 18 tæki) og hann á ÞEGAR teikningu í `bunadargreining` — ótengt, ekki vantar.
Sjö hafa ekkert heimilisfang og því enga leið að aðaluppdrætti.

## `arsskodun_report_facts` er EIN RÖÐ PER FÉLAG (staðfest 08.11.2026)

674 raðir, 674 félög, pkey er `fyrirtaeki_id` einn og sér. Taflan geymir **síðustu lesnu skýrsluna,
ekki sögu**. Þrennt leiðir af því:

1. **Félag sem er skoðað tvisvar á ári tapar fyrri skýrslunni.** Vélrás Álhella: febrúar 24 tæki
   (skjal 9976) yfirskrifað af ágúst 9 tækjum (skjal 9745) — Ársskoðun sýnir 9 þar sem 24 voru
   yfirfarin. Fjögur tæki fengu meira að segja yfirferð tvisvar á árinu.
2. **`report_year` segir ekki hvað röðin nær yfir** — hún ber ár nýjustu skýrslunnar. Eldri ár eru
   hvergi í töflunni; sagan er í `app_settings.arsskodun_customers[fid].history`.
3. **Flutningur milli félaga er UPPFÆRSLA, ekki innsetning.** `insert` rekst á pkey móttakandans.
   Þegar Hveragerðissóknar-skýrslan var færð af Gerð ehf. á Hveragerðiskirkju (07.11.2026) þurfti
   að uppfæra röð kirkjunnar og eyða hinni — og aldrei með eldra skjali en það sem fyrir er.

## Tíu listar halda opnu verki — og þeir skarast (mælt 08.11.2026)

| Listi | Opið | Athugið |
|---|---|---|
| `thjonustubeidni` | 421 | þar af 145 samþykki á Agnar |
| `app_problems` | 400 óleyst | |
| `verkefnalisti` | 111 | |
| `invoice_drafts` | 94 | 56 draft + 38 overdue |
| `villur` | 30 | |
| `verkbeidnir` | **32** | sjá viðvörun |
| `sara_yfirferd` | 20 bíður | |
| `factcheck_akvardanir` | 13 ósvöruð | |
| checklistar (skipulagsbord) | 28 | |
| `krofu_verkferli` | 7 | |

**VIÐVÖRUN UM `verkbeidnir`:** listinn virðist 885 ef síað er á stöðuheiti sem maður giskar á.
Raunverulegu gildin eru **collected 743 · eytt 110 · ready 21 · received 11**, og `collected`
þýðir að kúnninn ER BÚINN AÐ SÆKJA tækið — lokastaða, ekki opið verk. Rétt tala er **32**.
Kanónan stendur í `tools/audit-verk-stada.cjs`: received · inprogress · ready · collected · done · eytt.
Þetta er sama villan og yfirferðin fann hjá öðrum: sía á giskuðum gildum í stað þess að telja
hvaða gildi eru til.

### Skörunin sem mældist

**TÓLF af þrettán ósvöruðum `factcheck_akvardanir` eiga tvíbura á Þjónustuborðinu:**
#4↔#1434 · #6↔#1533/#1535 · #7↔#1437 · #8↔#1438 · #9↔#1439+#1414 · #10↔#1542 ·
#11↔#1440 · #12↔#1441 · #13↔#1442 · #14↔#1443 · #15↔#1444 · #16↔#1445. Aðeins #5 á engan.
**Svar á öðrum staðnum hreyfir ekki hinn.**

Það kostaði mig samdægurs: ég stofnaði #1542 með Gullsmára 5 sem NÝJUM fundi þegar factcheck #10
frá 01.11 geymdi hann með nákvæmlega sömu tölum (9 × 4.346 = 39.114 án vsk), og #1445 er
factcheck #16 orðrétt. **Leitaðu í factcheck ÁÐUR en þú kallar fund nýjan.**

**35 reikningsnúmer koma fyrir í tveimur eða fleiri opnum málum.** Flest eðlilegt (yfirlitsmál
telja upp marga), en þrennt eru öfugar aðgerðir á sama hlut: R-000356 (#1368 senda ↔ #1407
bakfæra), R-000407 (#987 stofna ↔ #1407 bakfæra), og 24 staðir (#909 úr þjónustu ↔ #1532 í skoðun).

**Tvö pör sem eru sama aðgerðin:** #1377 (má Bjarndís senda skjal B?) og #1378 (sendu skjal B) —
og hvorugt getur gerst því skjalið er ekki til. **Ein háðsemi:** #1414 býr til drög „með 20%
samningsafslætti" sem #1394 er enn að ákveða hvort eigi að vera til.

Vörður: `tools/audit-skorun-lista.cjs` (A=9 · B=35 · C=0). Hann sér aðeins skörun sem R-númer
afhjúpa — sama spurning án reikningsnúmers sleppur í gegn.

## Undantekning frá „hver kennitala fær skráningu": afgreiðsla án stofnunar (10.11.2026)

Reglan frá 09.09.2026 stendur: kassinn (`js/pos.js`, checkout) stofnar `customers_base` + `fyrirtaeki` fyrir hverja óþekkta 10 stafa kennitölu.
**Ein viljandi undantekning:** „+ Afgreiðsla án stofnunar" í leit Sölu (114) → `solur.an_stofnunar = true`; salan ber raun-kt í `customer_kt`
en `customer_id` og `customer_base_id` eru tóm og ENGIN röð verður til í `customers_base` / `fyrirtaeki` / `vidskiptavinir`.
- **Sala með kt en án base er því ekki lengur alltaf bilun** — lestu `an_stofnunar` áður en þú „lagar" slíka röð eða bakfyllir.
  Án merkis er hún áfram bilun í auto-stofnun (`pos_kunni_otengd` í `app_problems`).
- Triggerinn `solur_fill_base_id` STOFNAR EKKI: hann tengir aðeins ef kennitalan er þegar til (einkvæm) í `customers_base`. Komi sami
  einstaklingur síðar inn sem skráður kúnni tengjast nýjar sölur sjálfar; eldri merktar sölur ekki.
- `audit-solu-id` undanskilur merktar sölur aðeins ef `greitt_med = 'greitt_sidar'`; `v_gengid_inn_osott` telur þær með gengið-inn (30 daga mörk).
- Mælt 10.11.2026 (viðmið með uppgerðum skrifum): sama sala ÁN merkis → `customers_base`-insert + `fyrirtaeki`-insert með nafninu „Viðskiptavinur".
- **Greitt síðar án viðskiptavinar er eðlilegt** (Agnar 10.11): einstaklingur greiðir við afhendingu og fær ekki sendan reikning. Það er
  „óskráður viðskiptavinur", ekki vöntun á skráningu.
