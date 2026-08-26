# Rafkerfi — as-built teikning (electrical as-built)

> Byggingarstjóri: **Elon Musk** (`.claude/agents/elon-musk.md`).
> Fyrsta verk: lesa þetta skjal. **Aldrei** endurstíla `._yr` gradienta.
> **Aldrei** sameina hótel á kennitölu. **Aldrei** keyra `node deploy.js`.
> Vörðu raflínur: kalla á `netvordur` áður en þú snertir þær (`docs/ORYGGISNET.md`).

Þetta er as-built af **perunum** (pixels), **rofum** (switches), **vírum** (wires)
og **tengiboxum** (junction boxes / `data-elon`) í Slökkvitæki-appinu.
Þegar pera bilar: hover `title` → `data-elon` → kafli hér → `file:line`.

---

## 0. How to read this drawing

| Hugtak | Merking |
|---|---|
| **Switch** | UI-stýring eða DB-reitur sem notandi/kerfi snýr. Dæmi: 📅 skoðunarmánuður á kúnnasíðu. |
| **Wire** | Kóðaleið + tafla/dálkur sem ber merkið. Dæmi: `AppSettings.arsskodun_customers.inspect_month` → `_ars.inspect_month` → `187` `notDue`. |
| **Bulb** | Pixel sem kviknar. Dæmi: Ársskoðun `._yr`, Rekstrarfélög 🧾, mánaðar-chip, `._st--*`. |
| **Junction box** | Falinn númeramiði (`data-elon` + `title`) svo hægt sé að rekja bilaða peru. Patch **317**. |

Rás: **switch → wire → junction → bulb**. Vitlaus litur = slæmur vír eða rangur rofi, ekki „CSS-vandamál“. Look-A gradientarnir í `153` `_ars-mock-css` eru **frosnir**.

---

## 1. THE MONTH SWITCH (aðal-dæmi Agnars)

### 1.1 Switch UI — kúnnasíða, neðst við skýrslur og reikninga

**Skrá:** `js/patches/199-doc-year-grid.js`

| Hvað | file:line |
|---|---|
| Les mánuð (`loadInspectMonth`) | `199:754–771` |
| Teiknar 📅-pillu (`monthPillHtml` → `.sk-month-pill`) | `199:772–776` |
| Setur pilluna í „📊 Staða eftir ári"-röndina (við árs-pills + skýrslur/reikninga) | `199:935` (sækir monthInfo), innsetning `199:1156` (`sk-strip` + `monthPillHtml`) |
| Smellur opnar `<select data-month-sel>` og **vistar** | `199:1198–1240` |
| CSS (útlit pillu, **ekki** `._yr`) | `199:1584–1587` |

Rofinn er `<button class="sk-month-pill" data-month-edit="1">`. Manual override fær klasann `.manual` (gul strikalína). Tómur rofi: `.empty` + textinn `📅 mánuður?`.

**Vistun:** `AppSettings.save({ arsskodun_customers: { [coId]: { inspect_month, inspect_month_manual } } })`.
`inspect_month_manual:true` þegar notandi velur mánuð; `{inspect_month:0, inspect_month_manual:false}` við „↺ Hreinsa yfirskrift".
Skráð í `override_log` (`field:'inspect_month'`, `page:'doc-year-grid'`).

Sami rofi lifi á **Ársskoðun** (annar UI, sama blob):

| Hvað | file:line |
|---|---|
| SKOÐUN-dálkur (`span._mo`) | `153:2884` |
| Inline-val (`ovrEditMonth`) — ⚡ override-hamur | `153:1213–1246`, smellur `153:1680` |
| Modal-val (`select._ars-month-edit`) | `153:2980`, vista `153:3282` |

### 1.2 Rankaðar heimildir (manual override vs derived)

**153 `loadAll` — MÁNAÐAR-FORGANGSREGLA** (`153:410–446`):

1. **`inspect_month_manual`** (blob, Agnar ýtti á rofann) — trompar allt.
2. **blob `inspect_month`** (geymt gildi, líka án `_manual` merkingar) — skýrsla má **aldrei** yfirskrifa (dæmi: fyrirtaeki 604, mars).
3. **`arsskodun_report_facts.inspect_month`** — fyllir **aðeins eyðu**.
4. **`v_skodunar_manudur`** (`heimild` = `'skyrsla'` eða `'reikningur'`) — fyllir eyðu. 44 staðir eiga mánuð sem kemur **aðeins** úr úttektar-reikningi (Norðurbrú 1 → maí). `153:241`, `153:425–432`.
5. **`uttaeki.next_insp`** (elsta dagsetning per `fyrirtaeki_id`) — síðasta vörn. `153:442–446`. Flag: `_ars._month_from_uttaeki`.

**199 `loadInspectMonth`** (`199:754–771`) er **styttri** keðja (prófíllinn):

1. blob `inspect_month` 1–12 → `{source:'blob', manual: inspect_month_manual}`
2. `arsskodun_report_facts` nýjasta ár → `{source:'report'}`
3. `uttaeki.next_insp` per `fyrirtaeki_id` → `{source:'uttaeki'}`
4. annars `null` (📅 mánuður?)

199 les **ekki** `v_skodunar_manudur` beint. 153 gerir það. Þess vegna á Ársskoðun-listinn stundum mánuð sem prófíllinn sýndi ekki uns blob/facts/uttaeki náði. 187 les **sömu samsettu** tölu og SKOÐUN-dálkurinn (`Arsskodun._cache.list → _ars.inspect_month`), ekki 199-keðjuna eina.

### 1.3 Wires FROM the switch TO the bulbs

```
[ .sk-month-pill  199 ] ──vista──▶ AppSettings.arsskodun_customers[fid].inspect_month
                                         │
                                         ├──▶ 153 SKOÐUN-dálkur (._mo) + mánaðar-síu chips (._ars-mo)
                                         ├──▶ 175 næsta-skoðun (CanonStadur / brunakerfi_customers.inspect_month)
                                         └──▶ 187 yrCls notDue  →  ._yr.penda (gull)  vs  ._yr.now (rautt)
```

**Ársskoðun mánaðar-dálkur (153)**
- Les: `c._ars.inspect_month` (`153:2884`).
- Núverandi almanaksmánuður → rauður texti á `._mo`.
- Manual → punktur + punktalína (`manualMark`, `153:1210`).
- Sían `._ars-mo` telur sömu tölu (`153:1353`, chips `153:1532`).

**Rekstrarfélög mánaðar-sýn (175)**
- Slökkvitæki: `CanonStadur.nextDateOf` (patch **312**) — AÐEINS canonical (skýrsla/reikningur), aldrei nafna-strengs-dagsetning. `175:1008–1011`.
- Brunakerfi: `brunakerfi_customers[fid].inspect_month` (`175:1042, 1065`).
- Pera: `.rf-next` / `.rf-sum-next` (`175:1868–1886`) — liðið = rautt, ókomið = á áætlun.

**Year cell gold `penda` vs red `now` (187)** — mánuðurinn ræður **þessu ári**:

```
187:360–367   _arsMonthById[fid] = Arsskodun._cache.list[]._ars.inspect_month
187:448       _im = _arsMonthById || blob.inspect_month
187:449       notDue = isNow && !(_im > 0 && _im < _curMonth)
              // AÐEINS liðinn mánuður er „á eftir". Yfirstandandi mánuður = gull.
187:460/463   isGap/tómt þetta ár → penda (gull) ef notDue, annars now (rautt)
```

Desember-skoðun í ágúst = gull. Mars-skoðun í ágúst = rautt. Agnar: *„Des-skoðun, we dont have to go yet."*

### 1.4 Töflur

| Tafla / blob | Dálkur / lykill | Hlutverk |
|---|---|---|
| `AppSettings.arsskodun_customers` | `inspect_month`, `inspect_month_manual` | Rofi + override |
| `arsskodun_report_facts` | `fyrirtaeki_id`, `inspect_month`, `report_year` | Skýrslu-mánuður |
| `v_skodunar_manudur` | `fyrirtaeki_id`, `inspect_month`, `heimild` | Sameinað skýrsla+reikningur |
| `uttaeki` | `fyrirtaeki_id`, `next_insp` | Afleiddur mánuður |
| `fyrirtaeki` | `id` = **fid**, `kennitala`, `stadur_nr` | Staðurinn (ekki kt ein) |
| `brunakerfi_customers` | `inspect_month` | 175 brunakerfis-mánuður |

---

## 2. YEAR CELL BULBS (Ársskoðun `._yr`)

CSS (Look-A, **FROSIÐ** — Elon endurstílar þetta aldrei): `153:2711–2760` (`_ars-mock-css`).
Merkjalógik: `187` `yrCls` `187:437–465`. Innsetning: `187` `process()` á `tr._ars-row`.

### 2.1 Look-A ástönd

| Klasar | Litur | Merking | Hvað kveikir |
|---|---|---|---|
| `._yr.both` (+ `now` eða `on`) | **grænt** | skýrsla + (par eða skjal) | `isKlarad` **eða** `effRep` (Drive/`locMap` eða ársmerkt viðhengi sem er skýrsla) |
| `._yr.now` (án both/penda/inv-only) | **rautt** | þetta ár, ekkert par enn, mánuður liðinn | `isNow && !notDue` og engin skýrsla/reikningur/par |
| `._yr.penda` | **gull** | þetta ár, mánuður ekki liðinn | `notDue` (mánuður ≥ núverandi) |
| `._yr.inv-only` | **blátt** | reikningur án skýrslu | **eftir Plaza:** `hasConfirmedInvYear` = `v_uttekt_ar` **eða** `solur.customer_id`. **Ekki** Drive-einn, **ekki** brunakerfi. Einnig `year_factcheck=claude` eða `last_year_inspected===y` |
| `._yr.lit::before` | LED-glóð | fact-check `human` | `year_factcheck.status='human'` — **ekki** sjálfkrafa með grænu |
| `._dd > u > i.rep` | grænn örpunktur | skýrsla á skrá | `hasRep` |
| `._dd > u > i.inv` | blár örpunktur | 🧾 | `showInvLed`: með skýrslu/klarad → `hasReikYear`; án skýrslu → `hasConfirmedInvYear` |

`gap`-flagg (`year_factcheck.status='gap'`) trompar skjala-ágiskun (Steypustöðin 2026 var græn með reiknings-PDF). `klarad`-par trompar `gap` (Hamraborg 7).

### 2.2 Allar heimildir sem geta kveikt reit

| Heimild | Lykill | Hvað kveikir | file:line |
|---|---|---|---|
| `153` `_ars._docYears` | `customer_documents` `doc_type='uttektarskyrsla'` per `fyrirtaeki_id` (+ base aðeins ef einn staður) | sönnun á Óvíst-flipa; **brunakerfi í `bruByCo` má EKKI mála slökkvitæki** | `153:219–247`, `153:323–331` |
| `187` `locMap` | `customer_documents` úttektarskýrsla per fid (Drive **eða** `storage_path`) | grænt `both` + smellur opnar skjal | `187` `loadLoc` |
| `187` `uttekt_files` | AppSettings, lyklað á **kt** | aðeins ef kt á **einn** stað | `187` `process` `u = locRec[y] \|\| (ktCount<=1 ? rec[y] : null)` |
| `187` `company_attachments` | `isReportKind` — **ekki** reikningur/samningur; Plaza-grein: **ekki** `brunakerfi` | grænt ef skýrsla | `187` `findReportAtt` |
| `187` `hasReikYear` / `reikMap` | `customer_documents` `doc_type='reikningur'` per fid + unique-kt orphan + `solur` | 🧾 **við hlið skýrslu** | `187:63–70`, `loadReik` |
| `187` `hasConfirmedInvYear` | `v_uttekt_ar` `heimild='reikningur'` **eða** `solur.customer_id` | **inv-only blátt** | `187:72–76` |
| `187` `pairMap` | `document_pairs` `service_type='uttekt'` `status='klarad'` per fid | grænt `both`, trompar gap | `187` `loadPairs` |
| `187` `fcMap` | `year_factcheck` | `human`→LED+both; `claude`→inv-only; `gap`→penda/now | `187` `loadFc` |
| `187` blob `last_year_inspected` | `arsskodun_customers` | heimsókn merkt, skjöl vantar → inv-only (ekki rautt) | `187:455` |
| `v_uttekt_ar` | fid + ár + `heimild` | staðfest úttekt með reikningi | `187` `loadInv` |
| `solur` | `customer_id` = fid, `vidskiptategund` ≠ bud/brunakerfi | POS-staðfesting | `187` `loadReik` `bySolurCo` |

**Plaza-regla (2026-08-26):** Drive-einn reikningur málar **ekki** inv-only. 🧾 við skýrslu má kvikna af `reikMap.byCo`; blái reiturinn má ekki.

---

## 3. INVOICE 🧾 BULBS (Rekstrarfélög + Ársskoðun)

### 3.1 Lykillinn er staður, ekki kennitala

`customer_documents.fyrirtaeki_id` + `vidskiptategund` — **ekki** kt-vítt.

`doc_type` er alltaf `'reikningur'` fyrir slökkvitæki **og** brunakerfi. Raunverulegi merkimiðinn er `vidskiptategund`: `uttekt` · `brunakerfi` · `bud` · `ovisst`.

Óþekkt/`ovisst` = **fail-open** (Hamraborg 7 má ekki slokkna). `bud` og `brunakerfi` kveikja **ekki** slökkvitækja-🧾.

### 3.2 175 / 199 tegund-split

**199** (`199:392–394`, `SERVICES` `199:970–973`):
- 🧯 Slökkvitækjaþjónusta (`kind:'uttekt'`, `repByY`)
- 🔥 Brunakerfisþjónusta (`kind:'brunakerfi'`, `bruByY`)
- Reikningur sem er þegar tekinn af hinni þjónustunni er frátekinn (Afltak-lexían).

**175** (`175:1668–1715`):
- `document_pairs` lyklað á `fyrirtaeki_id` (ekki `customer_base_id` — Heimaleiga base 293 kveikti 🧾 á öll 10 húsin).
- Pör án staðar: aðeins þegar kt á **einn** stað hér.
- `vidskiptategund` á `invoice_doc_id`: `bud` droppað; `brunakerfi` aðeins á brunakerfis-strimli; `uttekt` aðeins á slökkvitækja-strimli.
- 🧾 (`bundleTag`, `175:1543`) sýnist **aðeins** þegar skýrsla er `done` **og** par er bundið (`yrMiniSl` `bundled && state==='done'`, `175:1607`).

Rekstrarfélög 🧾 = „reikningur **þessa** árs **þessarar** þjónustu er paraður við skýrsluna". Ekki „einhver reikningur er til í Drive".

### 3.3 Plaza false bulb — case file

| Reitur | Gildi |
|---|---|
| Staður | Center Hótel **Plaza**, `fyrirtaeki.id` **193** |
| Skjal | `customer_documents` **9868** |
| Númer | **R-107802** |
| Uppruni | **Stolpi** (01.02.26, hleðsla/yfirferð — **ekki** ársúttektin) |
| Merki | `doc_type=reikningur`, `vidskiptategund=uttekt`, `fyrirtaeki_id=193` |

**Af hverju það var rangt:** `187` `reikMap.byCo[193]` innihélt 2026 af Drive-skjalinu. `hasReikYear` var notað bæði fyrir 🧾-punkt **og** `inv-only` klasann. Engin 2026-skýrsla á Plaza → Ársskoðun málaði **blátt** „úttekt gerð, skýrsla vantar". Rekstrarfélög/prófíll sýndu ekkert blátt (engin skýrsla → engin 🧾). Starfsmaður les blátt sem „farið var".

**Hvernig 187 síar núna:**
- `hasReikYear` = Drive-úttektarreikningur per fid (🧾 við hlið skýrslu) **eða** POS.
- `hasConfirmedInvYear` = `invMap` (`v_uttekt_ar.heimild='reikningur'`) **eða** `reikMap.bySolurCo` (`solur.customer_id`).
- `yrCls` inv-only notar **`hasInvOnly`**, ekki `hasReikYear` (`187:462`).
- `showInvLed` án skýrslu = `hasConfirmedInvYear` (`187:425`). Plaza R-107802 er ekki í `solur` og ekki í `v_uttekt_ar` → LED slokknar.
- `isUttektInvoiceTeg` sleppir `brunakerfi`/`bud` (`187:200–203`).

Pör voru **ekki** eydd. Invoice OUT / payday / kt-save ósnert.

### 3.4 Site identity

Rekstrarfélög = **kennitála + `stadur_nr`**. Nr. eitt er ekki einkvæmt (Plaza nr. 2 hjá Center ≠ Máni nr. 2 hjá Heimaleigu). Innri lykill er samt `fyrirtaeki.id`.

`175 companyForBld` (`175:704–751`, commit `004ddd4` og 2026-08-25 kt+nr):
1. `b.co_id` pinninn trompar allt.
2. Einkvæmt nafn.
3. Einkvæm kt.
4. Fjölstaða: `kennitala` + `stadur_nr`. **Aldrei** `hits[0]`.

Payday `accountingCost` `"kt nr. N"` aðeins þegar staður er treystur. POS giskar ekki `.limit(1)` á fyrsta hótel. Sjá `docs/ORYGGISNET.md` + `audit-stadur-nr.cjs` / `audit-rekstrarfelog-sites.cjs`.

---

## 4. LABELS, SUMMARIES, COLOR CHANGING

Fyrir hverja peru: switch, wire, bulb, hidden id (317 stimplar `data-elon`).

| Pera | Switch | Wire | Bulb | Junction (`src=`) |
|---|---|---|---|---|
| Ársskoðun `._yr` | mánuður + skjöl + pör + fc | 187 `yrCls` | look-A pill 52×20 | `facts`/`docs`/`solur`/`pairs`/`month` |
| Ársskoðun `._yr::before` LED | fact-check human | `year_factcheck` | glóandi depill | `facts` |
| Ársskoðun `._dd > u > i` | skýrsla / reikningur | locMap + showInvLed | tveir örpunktar | `docs` / `solur` |
| Staða `._st--done/--work/--skip/--late/--plan` | Skoðað / Í vinnslu / Sleppt / Á eftir / Á dagskrá | `153` `isDoneYear` + mánuður + `last_year_inspected` | status-chip `153:2902` | `facts` / `month` |
| Mánuður `._mo` | blob/facts/view/uttaeki | `_ars.inspect_month` | SKOÐUN-dálkur `153:2884` | `month` |
| Síu-chips `._ars-mo` | notandi velur mánuði | `state.months` + `monthCounts` | `153:1532` | `month` |
| KPI `._ars-statgrid` | — | `v_thjonustu_tolur` + `isDoneYear` | Fjöldi / Búið / Eftir / Áætlað `153:1468` | `facts` |
| Samantekt `._ars-summary` | núverandi sía | `filteredAars` | `153:1595` | `facts` |
| 199 `.sk-month-pill` | **SOURCE SWITCH** | `loadInspectMonth` → blob | 📅 pilla | `switch` |
| 199 `.sk-pill` (Staða eftir ári) | fact-check + bæði skjöl | `pill()` `199:443+` | árs-chip both/ok/gap/claude | `docs`/`facts`/`pairs` |
| 199 `.sk-svc-st` | skýrsla+reikningur á korti | `hasRep`/`hasInv` | ✓ FULLBÚIÐ / 1 AF 2 / Í VINNSLU | `pairs`/`docs` |
| 199 `.sk-yr-label` | fc + both | `sk-yr-ok/-gap/-claude/-now` | árs-haus | `facts`/`docs` |
| 199 `.sk-doc` chips | vidskiptategund | `customer_documents` + `solur` | 🧯/🔥/🏪 reikningsmerki | `docs`/`solur` |
| 175 `.rf-bundle-tag` 🧾 | document_pairs + tegund | `pairByCo[fid][year\|uttekt]` | 🧾 í horni pillu | `pairs` |
| 175 `.rf-yr--*` | skýrsla / due / overdue | `yrMiniSl` / `yrMiniBr` | compact ártölur | `docs`/`month` |
| 175 `.rf-pill--done/--pending/--overdue/--bru` | yfirlit félags | `n2026`/`nNeed`/`nOverdue` | accordion-haus `175:1431` + chiprow `175:1958` | `facts` |
| 175 `.rf-sum-chip` / `.rf-sum-next` | collapsed-röð | tæki + ár + next | accordion-samantekt | `month`/`docs` |
| 175 `.rf-next` | CanonStadur / bru.month | next date vs today | næsta skoðun | `month` |

Hidden id á öllum: `data-elon="ELON|fid=<id>|y=<year>|k=<state>|src=<…>"`. Fid kemur úr `tr[data-co-id]`, `a[data-coid]`, eða `._dyg-section[data-co-id]`.

---

## 5. GUARDED POWER LINES (do not cut)

Lestu `docs/ORYGGISNET.md` og kallaðu **`netvordur`** (`subagent_type: netvordur`) **áður** en þú snertir:

| Lína | Skrár | Hvað hún ver |
|---|---|---|
| Invoice OUT | `10-sala-receipt-redesign.js`, `233-uttekt-pdf-autosave.js`, `254-receipt-sender.js` | Tómur/0 kr reikningur fer ekki í póst. Vörn á **OUT**, aldrei á vistun. |
| Kennitala | `121-pickup-checkout.js`, `js/pos.js` | Innslegin kt dettur ekki í `999999-9999`. |
| Rukkun | `netlify/functions/payday-push.js` | Per-línu afsláttur + kredit `discount_pct=0`. `accountingCost` = `"kt nr. N"` aðeins ef `_siteTrusted`. |
| Readiness | `153-arsskodun.js`, `187-inservice-row-reports.js` | Ársreitir, `isDoneYear`, inv-dot per stað, tæki per `uttaeki.fyrirtaeki_id`. |
| Registry | `309-problem-registry.js` | `window.logProblem` — engin þögul bilun, engin persónu-kt í log. |
| POS afsláttur | `114-unified-pos-search.js` | `discount_pct` skrifast strax; kt með og án bandstriks. |

`node tools/audit-all.cjs` **fyrir og eftir**. Grænt = óhætt. Rautt = CUTS-A-WIRE.

Elon **skráir** þessar línur. Elon **breytir þeim ekki** án netvarðar.

---

## 6. TRACE STAMP CONVENTION

**Patch:** `js/patches/317-elon-trace.js` (MutationObserver, engin Look-A CSS).

### Format

```
data-elon = ELON|fid=<id>|y=<year>|k=<state>|src=<facts|docs|solur|pairs|month|switch>
title     = ELON · f193 · 2026 · both · src=facts
```

Dæmi:

```
ELON|fid=193|y=2026|k=penda|src=month
ELON · f193 · 2026 · penda · src=month

ELON|fid=193|y=2026|k=inv-only|src=solur     ← ætti EKKI að kvikna á Plaza R-107802
ELON · f193 · 2026 · inv-only · src=solur

ELON|fid=1488|y=2026|k=both|src=pairs        ← Hamraborg 7 klarad
ELON · f1488 · 2026 · both · src=pairs

ELON|fid=193|y=|k=aug|src=switch            ← 📅 SOURCE SWITCH á prófíl
ELON · f193 · — · switch · src=switch
```

`src` merking:
- `facts` — `arsskodun_report_facts` / `year_factcheck` / `v_thjonustu_tolur` / `isDoneYear`
- `docs` — `customer_documents` skýrsla eða ársmerkt viðhengi
- `solur` — `solur.customer_id` eða `v_uttekt_ar`
- `pairs` — `document_pairs` klarad / 🧾 bundle
- `month` — skoðunarmánuður ræður lit (penda/now, `._mo`, `.rf-next`)
- `switch` — notandinn snéri 📅-rofanum (`.sk-month-pill`)

### Hvar 317 stimplar

| Veljari | Athugasemd |
|---|---|
| `#view-arsskodun a._yr, #view-arsskodun span._yr` | Ársreitir. `data-fid` `data-year` `data-state` |
| `#view-arsskodun ._mo, ._ars-mo, ._st, ._ars-statgrid > div, ._ars-summary` | mánuður, staða, KPI |
| `.rf-bundle-tag, .rf-yr, .rf-pill, .rf-sum-chip, .rf-sum-next, .rf-next` | Rekstrarfélög 🧾 + chips |
| `.sk-month-pill` | SOURCE SWITCH |
| `.sk-pill, .sk-svc-st, .sk-yr-label, .sk-doc` | prófíls-skýrslur/reikningar |

Stimplar eru **faldir** (data-attrs + title-hover). **Engin** `background`/`color`/`box-shadow` á `._yr`.

### How a future agent traces a failed bulb

1. Hover peruna — `title` byrjar á `ELON · f<fid> · <ár> · <state> · src=<…>`.
2. Lesa `data-elon` (pipe-snið, stöðugt fyrir grep).
3. Opna **þennan kafla** sem passar `src` + `k`.
4. Fara á `file:line` í kafla 1–4 / 7.
5. Staðfesta gögn: `fyrirtaeki.id = fid` (ekki kt), svo taflan í `src`.
6. Ef pera er á vörðu línu → `netvordur` áður en lagfært.

---

## 7. FLOOR PLAN of key files

| Skrá | Hvað hún er í húsinu |
|---|---|
| **187** `js/patches/187-inservice-row-reports.js` | Ársreitirnir. `yrCls`, `hasReikYear`, `hasConfirmedInvYear`, Plaza-sía, LED, punktar. **Readiness-lína.** |
| **153** `js/patches/153-arsskodun.js` | Fyrirtæki í þjónustu. Mánuðar-keðja, SKOÐUN-dálkur, KPI, `._st`, **Look-A CSS** (`_ars-mock-css`). **Readiness-lína. CSS frosið.** |
| **175** `js/patches/175-rekstrarfelog.js` | Rekstrarfélög. `companyForBld` (kt+nr), 🧾 bundle, tegund-split, accordion. |
| **199** `js/patches/199-doc-year-grid.js` | Kúnnasíða: skýrslur/reikningar + **📅 SOURCE SWITCH**. |
| **114** `js/patches/114-unified-pos-search.js` | POS-leit + afsláttur. Giskar ekki fyrsta hótel. |
| **309** `js/patches/309-problem-registry.js` | `window.logProblem`. |
| **121** `js/patches/121-pickup-checkout.js` | Kt-vistun á sókn. **Kennitölu-lína.** |
| **pos.js** `js/pos.js` | Checkout-resolver, kt úr nafnareit. **Kennitölu-lína.** |
| **10 / 233 / 254** | Reikningur teiknaður / PDF vistuð / póstur sendur. **Invoice OUT. Elon snertir ekki.** |
| **261** `js/patches/261-app-profiles.js` | Öpp-skel (`body.appmode`). Form-tappar 50px — 314 þrengir lista, ekki form. |
| **263** `js/patches/263-mobile-baseline.js` | Almennur síma-grunnur. Útilokar Ársskoðun/Kröfu/POS. |
| **166** `js/patches/166-krofu-yfirlit.js` | Kröfu yfirlit + `data-viewmode` (Sími/Tafla/Skjár). |
| **315** `js/patches/315-fjarmal-app-compact.js` | Fjármál-app þéttingarlag. |
| **314** `js/patches/314-arsskodun-mobile-compact.js` | Ársskoðun sími: sama desktop-tafla, **án** look-A endurstíls. |
| **314** `js/patches/314-simi-compact-layer.js` | Sameiginlegt Sími/Öpp þéttingarlag. Frozen: `theme-scoped.css`. Out of scope: `._yr` gradientar. |
| **316** `js/patches/316-simi-boards.js` | Sími borð + Öpp chrome (launcher, botn-nav, Bakendi/Akstur/Verkdagbók). Out of scope: Plaza `._yr`. |
| **317** `js/patches/317-elon-trace.js` | Falinn sporstimpill. Þetta skjal í kóða. |
| **312** `js/patches/312-canon-stadur.js` | Canonical tækjafjöldi + næsta skoðun. 175 les það. |
| **theme.css / `css/theme-scoped.css`** | **FROSIÐ** (2026-08-17). Auto-generated, ekki handvirkt. Brunastál alltaf á. Sjá `thema`. |
| **`css/mobile.css`** | Gildra: `.view table { display:block !important }` (`css/mobile.css:67–69`). Brýtur `table-layout` / dálka-breidd á síma. 314/263 vinna **utan** þessa eða override-a. **Ekki** setja Ársskoðun-töfluna undir þetta án þess að vita af því. |

### Hvernig húsið er raðað

```
index.html  (script-röð)
  114 POS-leit
  121 kt-sókn          ── kennitölu-lína
  153 Ársskoðun        ── readiness + Look-A CSS
  166 Kröfu + viewmode
  175 Rekstrarfélög
  187 ársreitir        ── readiness + Plaza-sía
  199 prófíll + 📅 SWITCH
  10 / 233 / 254       ── invoice OUT
  261 Öpp  263 baseline
  314 compact ×2   315 fjármál   316 borð
  317 ELON TRACE       ── junction boxes (eftir 316)
```

---

## Viðauki — Plaza checklist (þegar blátt kviknar rangt)

1. Hover: er `src=solur` eða `src=docs`?
2. `fid` — er þetta réttur staður (193 Plaza ≠ 11 Center-systkini)?
3. Er röð í `solur` með `customer_id=fid` og `vidskiptategund` ekki bud/brunakerfi?
4. Er röð í `v_uttekt_ar` með `heimild='reikningur'`?
5. Ef aðeins `customer_documents` Drive (Stolpi) → **á ekki** að vera inv-only. Skoða `hasConfirmedInvYear` `187:72`.
6. Sameinaðu **aldrei** hótelin til að „laga" peruna.
