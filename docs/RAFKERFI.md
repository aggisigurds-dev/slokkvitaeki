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

**Efnisyfirlit**

| Kafli | Efni |
|---|---|
| 0 | Orðabók |
| 1 | Mánuðar-rofi (SOURCE) vs FILTER |
| 2 | Ársskoðun `._yr` perur |
| 3 | 🧾 reiknings-perur |
| 4 | Chips, KPI, labels |
| 5 | Vörðu raflínur |
| 6 | `data-elon` stimpill |
| 7 | Floor plan (skrár) |
| **8** | **Annotated circuits — Center Hotels (Agnar-skot)** |
| **9** | **Útreikningar** (verð, VSK, afslættir, KPI, TÆKI, FULLBÚIÐ) |
| **10** | **Skjala-tengingar** (allur staðurinn) |
| **11** | **Hver eiginleiki — uppruni** (öll borð/síður) |
| **12** | **SOURCE vs FILTER** (mánaðar-rásin í tveimur hæðum) |

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

Hidden id á öllum: `data-elon="ELON|fid=<id>|y=<year>|k=<state>|src=<…>"`. Fid kemur úr `tr[data-co-id]`, `a[data-coid]`, eða `._dyg-section[data-co-id]`. Ársreitir / FULLBÚIÐ / SKOÐUN fá aðeins tölulegt `fyrirtaeki.id` (tómt fid er ekki stimplað). Board KPI / FILTER / POS CALC nota `fid=board`.

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
data-elon = ELON|fid=<id>|y=<year>|k=<state>|src=<facts|docs|solur|pairs|month|switch|uttaeki|afslattur>|role=<ROLE>
title     = ELON · f193 · 2026 · both · src=facts · YEAR CELL
```

Dæmi:

```
ELON|fid=193|y=2026|k=penda|src=month|role=YEAR CELL
ELON · f193 · 2026 · penda · src=month · YEAR CELL

ELON|fid=193|y=2026|k=inv-only|src=solur|role=YEAR CELL     ← ætti EKKI að kvikna á Plaza R-107802
ELON · f193 · 2026 · inv-only · src=solur · YEAR CELL

ELON|fid=1488|y=2026|k=both|src=pairs|role=YEAR CELL        ← Hamraborg 7 klarad
ELON · f1488 · 2026 · both · src=pairs · YEAR CELL

ELON|fid=11|y=|k=switch|src=switch|role=SOURCE SWITCH      ← 📅 Ágú á Center Hotels
ELON · f11 · — · switch · src=switch · SOURCE SWITCH

ELON|fid=11|y=|k=month|src=month|role=SOURCE               ← SKOÐUN Ágú (ekki filter)
ELON · f11 · — · month · src=month · SOURCE

ELON|fid=board|y=8|k=filter|src=month|role=FILTER          ← chip Ágú 32
ELON · board · 8 · filter · src=month · FILTER

ELON|fid=board|y=2026|k=total|src=solur|role=CALC           ← POS #pos-totals (ekki fyrirtæki)
ELON · board · 2026 · total · src=solur · CALC

ELON|fid=11|y=2026|k=both|src=pairs|role=FULLBÚIÐ
ELON · f11 · 2026 · both · src=pairs · FULLBÚIÐ
```

`src` merking:
- `facts` — `arsskodun_report_facts` / `year_factcheck` / `v_thjonustu_tolur` / `isDoneYear`
- `docs` — `customer_documents` skýrsla eða ársmerkt viðhengi
- `solur` — `solur.customer_id` eða `v_uttekt_ar`
- `pairs` — `document_pairs` klarad / 🧾 bundle / FULLBÚIÐ
- `month` — skoðunarmánuður ræður lit (penda/now, `._mo`, `.rf-next`) eða FILTER telur SOURCE
- `switch` — notandinn snéri 📅-rofanum (`.sk-month-pill`)
- `uttaeki` — TÆKI `eqGroups` (SLT/BSL/RS)
- `afslattur` — `fyrirtaeki.afslattur_pct` / hópur / tilboð

`data-elon-role` (SOURCE vs FILTER — kafli 12):
- `SOURCE` / `SOURCE SWITCH` — per-staður `inspect_month`
- `FILTER` — mánaðar-chips + stöðu-tabs (skrifa ekki inspect_month)
- `YEAR CELL` / `YEAR CELL LED` — `._yr` / `.rf-yr`
- `FULLBÚIÐ` / `VANTAR` / `Í VINNSLU` — `.sk-svc-st`
- `STAÐA EFTIR ÁRI` — `.sk-pill`
- `TÆKI` / `KPI` / `CALC` / `DOT` / `STATUS`

### Hvar 317 stimplar

| Veljari | Athugasemd |
|---|---|
| `#view-arsskodun a._yr, #view-arsskodun span._yr` | Ársreitir. `data-fid` `data-year` `data-state` |
| `#view-arsskodun a._yr` | Ársreitir look-A. `data-fid` `data-year` `data-state` |
| `#view-arsskodun span._mo` | **SOURCE** — per-company `inspect_month` (SKOÐUN Ágú) |
| `._ars-mo` | **FILTER** — mánaðar-síu chips (Ágú 32). Ekki SOURCE |
| `._ars-st` | **FILTER** — stöðu-síur (Allt / Búið / Forgangur / Óvíst / Aldrei / Nýtt / Í vinnslu / Aksturslisti) |
| `span._st` | Röð-staða (Skoðað / Í vinnslu / Á eftir) |
| `._ars-statgrid > div`, `._ars-summary` | KPI + samantekt |
| `._devs`, `._devs > div` | TÆKI 2 SLT / BSL / RS |
| `.rf-bundle-tag, .rf-yr, .rf-pill, .rf-sum-chip, .rf-next` | Rekstrarfélög 🧾 + chips |
| `.sk-month-pill` | **SOURCE SWITCH** (📅 Ágú / 17 Ágú í titli ef uttaeki-dagur) |
| `.sk-pill` | STAÐA EFTIR ÁRI árs-pills ('26') |
| `.sk-svc-st` | ✓ FULLBÚIÐ / 1 AF 2 VANTAR / Í VINNSLU |
| `.sk-dot` | grænn/gulur punktur skýrsla↔reikningur |
| `.sk-yr-label, .sk-doc` | árs-haus + skjala-chips |
| `._afsl-step, ._cad-inp` | Afslættir & verð % (`role=CALC`) |
| `#pos-totals` | POS-samtala (`role=CALC`) |

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


---

## 8. Annotated circuits — Center Hotels (Agnar-skot 2026-08-26)

Tvö skjálög Agnars. Pink = árs-rás. Blue = mánaðar-rás. **Ekki rugla SOURCE og FILTER.**

### 8.1 Kúnnasíða — Center Hotels (prófíll, `#companies` + patch 199)

```
STAÐA EFTIR ÁRI  [23] [24] [25] [26]     📅 Ágú          ← .sk-month-pill SOURCE
                      pink ↑              blue ↑
                         │                   │
                         │                   └── inspect_month = 8
                         │                       (title getur borið uttaeki-dag, t.d. 17.8.)
                         ▼
2026 🧯 Slökkvitækjaþjónusta     🔥 Brunakerfisþjónusta
      ✓ FULLBÚIÐ   .sk-svc-st.ok    ⏳ Í VINNSLU     ← ÖNNUR rás (brunakerfi)
      ● skýrsla   (hasRep)          (svc.kind=brunakerfi)
      ● reikningur R-000803         EKKI sama FULLBÚIÐ
        189.054 kr  (hasInv)
```

| Pera á skotinu | Veljari | Switch | Wire | `src` |
|---|---|---|---|---|
| Grænt **'26'** í STAÐA EFTIR ÁRI | `.sk-pill.both` / `.ok` `data-yr=2026` | skjöl ársins | `pill()` `199:443+`: `hasReport && hasInv` → both | `pairs`/`docs` |
| **✓ FULLBÚIÐ** | `.sk-svc-st.ok` | sama | `svcCardExpanded` `199:1118`: `hasRep && hasInv` | `pairs` |
| Grænir punktar skýrsla + R-000803 | `.sk-dot.ok` + `.sk-doc` | `customer_documents` per **fid** + `document_pairs` | `resolved[y+'\|uttekt'].inv` | `docs`/`solur` |
| **1 AF 2 VANTAR** (2025/2024) | `.sk-svc-st.part` | eitt af tveimur vantar | `hasRep XOR hasInv` `199:1119` | `docs` |
| **📅 Ágú** (merkt 17 Ágú) | `.sk-month-pill` | SOURCE SWITCH | `loadInspectMonth` `199:754` → blob/facts/uttaeki | `switch` |
| 🔥 Í VINNSLU | `.sk-svc-st.prog` á **brunakerfi**-korti | önnur þjónusta | `SERVICES[1].kind='brunakerfi'` `199:970` | `docs` |

**FULLBÚIÐ formúla (n-of-2):** `n = (hasRep?1:0) + (hasInv?1:0)`. 2/2 = FULLBÚIÐ. 1/2 = VANTAR. 0/2 + þetta ár = Í VINNSLU. Brunakerfi telur **sína** skýrslu+reikning, aldrei slökkvitækja-parið.

R-000803 á Center: `solur.num` / `customer_documents.invoice_number`, lyklað á **fyrirtaeki_id** staðarins (ekki öll Center-hótel).

### 8.2 Ársskoðun-tafla (sama félag, önnur hæð)

```
FILTER chips (ekki SOURCE):   [Jún 57] [Júl 33] [Ágú 32] …     ← ._ars-mo  state.months
FILTER status:                Forgangur / Óvíst / Aldrei / …   ← ._ars-st  state.status

Röð Center:   [26 both + i.rep + i.inv]     [Ágú]      [2 SLT]
              pink  ._yr.both                blue ._mo   ._devs
```

| Pera | Er | Er EKKI |
|---|---|---|
| **Ágú 32** (rauð valin chip) | FILTER: `state.months ∋ 8`, talan = `monthCounts[8]` | Ekki `inspect_month` einstaks félags |
| **Ágú** í SKOÐUN-dálki | SOURCE-pera: `c._ars.inspect_month === 8` | Ekki sían. Rauður texti = núverandi almanaksmánuður |
| Grænt **26** + punktar | Árs-pera `187 yrCls` both + `._dd > u > i.rep/inv` | **Ekki** FULLBÚIÐ-textinn. `._yr.both` = skýrsla **eða** klarad-par; FULLBÚIÐ = n-of-2 á prófíl (kafli 13.2) |

Vír SOURCE → SKOÐUN: kafli 1.3. Vír '26' prófíll → '26' tafla: sama fid+ár, 199 `pill` vs 187 `yrCls` (bæði lesa skjöl/pör, 187 bætir Look-A + mánuðar-penda).

---

## 9. Útreikningar (formúla → reitur → pera)

VSK sjálfgefið **24%** (`× 1.24`). Sumir `vorur.vsk_prosenta` = 11. Íslenskt snið: `1.234 kr`.

### 9.1 Ársskoðun — áætlað virði og TÆKI

| Útkoma | Formúla | Reitir | Pera |
|---|---|---|---|
| Flokkur tækis | `categoryOf(type,size)` → lettvatn/duft2/duft6_12/co2_2/co2_5/brunaslongur/reykskynjarar/… | `uttaeki.type/size` eða `arsskodun_report_facts.equipment` (fersk ≥2025) eða blob `equipment_manual` | — |
| **SLT** | `lettvatn+duft2+duft6_12+co2_2+co2_5` | `eqGroups` `153:518–525` | TÆKI `._devs b` + `i` SLT |
| **BSL** | `brunaslongur` | sama | BSL |
| **RS** | `reykskynjarar` | sama | RS |
| Árseiningaverð flokks | `round(yfirferð_an_vsk × 1.24)` — **engin hleðsla** í ársáætlun | `vorur.verd_an_vsk` (nafn-match) else FB_Y `153:629–672` | — |
| `estimated_yearly` | `Σ(n_cat × PRICE[cat]) + 4340 + 3720 × akstur_multiplier` | SKYRSLUGERD=4340 (3500+24%), AKSTUR_UNIT=3720 (3000+24%) `153:90–93, 377` | ÁÆTL í TÆKI; KPI „≈ Áætlað virði" |
| KPI Fjöldi / í ársskoðun | `v_thjonustu_tolur` — **ekki** JS-summa | view `153:234, 1393–1396` | `._ars-statgrid` 1 |
| KPI Búið *ár* | stóra: `isDoneYear` fjöldi; undir: `v_thjonustu_tolur.buid_2026` | `153:835–845, 1480` | spjald 2 |
| KPI Eftir *ár* | `v_thjonustu_tolur.eftir_2026` | view | spjald 3 |
| **Ágú 32** | `count(c._ars.inspect_month === 8)` meðal `arsAll` | `monthCounts[m]` `153:1353` | FILTER chip `._ars-mo` |
| `isDoneYear` | `klaradCur` → true; else `fc==='gap'` false; `fc==='human'` true; else `last_year_inspected === curYear` | `document_pairs` + `year_factcheck` + blob `153:835` | `._st--done`, Búið-sía |

### 9.2 FULLBÚIÐ / n-of-m (prófíll)

| Útkoma | Formúla | Reitir | Pera |
|---|---|---|---|
| `hasRep` | `svc.repMap[y].length > 0` | `customer_documents` `doc_type` uttektarskyrsla **eða** brunakerfi, síað á `fyrirtaeki_id` | `.sk-dot.ok` skýrsla |
| `hasInv` | `resolved[y+'\|'+kind].inv` | `document_pairs` stored **eða** ótvírætt 1+1 auto-link `199:974–1005` | `.sk-dot.ok` reikningur |
| **✓ FULLBÚIÐ** | `hasRep && hasInv` | ofan | `.sk-svc-st.ok` |
| **1 AF 2 VANTAR** | `(hasRep \|\| hasInv) && !(hasRep && hasInv)` | ofan | `.sk-svc-st.part` |
| STAÐA EFTIR ÁRI both | `hasReport && hasInv` (slökkvitæki-dálkur ársins) | `pill()` `199:443` | `.sk-pill.both` |
| Upphæð á chip | `customer_documents.amount` eða `solur.samtals` | R-000803 dæmi: 189.054 kr | `.sk-doc.inv` |

### 9.3 Afslættir & verð (kúnnasíða + Sala)

Stigi 307 (efsta virka þrep ræður í Sölu): **Tilboðsverð > Afsláttarhópur > Sjálfvirkt %**.

| Útkoma | Formúla | Reitir | Pera |
|---|---|---|---|
| Sjálfvirkt % | `fyrirtaeki.afslattur_pct` (ritað 255; afritað á allar kt-raðir) | `fyrirtaeki.afslattur_pct` | `._cad-inp`, `._afsl-step` „20%" |
| Hópur | `discount_tier_id` → 6 flokka-prósentur | `discount_tiers` + 296 | hópa-fellilisti |
| Tilboðsverð | `company_pricing[]` per línu, ENDANLEGT | AppSettings `company_pricing` (113/129) | 💰 kafli |
| POS línu-verð | `qty × unit_price_ex_vat`; VSK = `× vsk_pct/100` (sjálfgefið 24, stundum 11) | `vorur` / körfulína | karfa |
| POS % afsláttur | fyrst af `ex` án VSK: `pctDisc = ex × discount_pct/100` | `state.discount_pct` ← `afslattur_pct` (255) | körfu-samtala |
| POS kr afsláttur | af **lokaverði m. vsk** (5.200−200=5.000) | `state.discount`; `solur.afslattur` geymir m.vsk sparnað síðan 2026-06-12 | sama |
| Hópur vs almennt | línu-`disc_pct` úr hópi; körfu-% **vigtað** niður svo ekki tvisvar | `js/discount-engine.js` | — |
| Rekstrarfélög gullkassi | `realSum + round(estMix × 1.24)` | heimsókn 129 + tæki×yfirferð×(1−afsláttur) `175:1939` | `.rf-gold` |

**Kennitölu-gildra:** `lookupKt` velur **hæsta** `afslattur_pct` á kt. Rekstrarfélög deila kt — 255 afritar % á allar staðarraðir.

### 9.4 Reikningur OUT (aðeins skráð — Elon breytir ekki)

`SalaInvoice` / `10`: línur × verð + VSK-hlutfall. `233` PDF. `254` sendir. Tómur/0 kr → vörð kastar. `payday-push` per-lína + kredit `discount_pct=0`.

---

## 10. Skjala-tengingar (allur staðurinn)

Lykill **alltaf** `fyrirtaeki_id` (fid). Kennitala aðeins þegar kt á **einn** stað (orphan).

| Tengsl | Tafla | Lykill | Pera |
|---|---|---|---|
| Úttektarskýrsla | `customer_documents` `doc_type='uttektarskyrsla'` | `fyrirtaeki_id` + `year` | 199 skýrslu-chip; 187 `locMap` → `._yr.both`; 175 `liveDocs` |
| Brunakerfisskýrsla | sama `doc_type='brunakerfi'` | fid + year | 199 🔥 kort; 175 `getBruIndex`; **má ekki** mála slökkvitækja-`._yr` |
| Reikningur (Drive/Stolpi) | `doc_type='reikningur'` + `vidskiptategund` | fid (+ `invoice_number`) | 199 reiknings-chip; 187 `hasReikYear` aðeins 🧾 **við skýrslu** |
| Reikningur (POS) | `solur` | `customer_id` = fid, `num`, `vidskiptategund` | inv-only via `hasConfirmedInvYear`; R-númer |
| Úttekt staðfest án skýrslu | `v_uttekt_ar` `heimild='reikningur'` | fid + `ar` | `._yr.inv-only` |
| Par skýrsla↔reikningur | `document_pairs` `status='klarad'` `service_type` uttekt\|brunakerfi | **fid** + year + kind | FULLBÚIÐ; 🧾; `._yr.both` via `pairMap`; `isDoneYear` |
| Viðhengi | AppSettings `company_attachments[fid]` | fid + `year` + `kind` | `._yr-att`; má **ekki** vera reikningur sem grænt |
| Drive kt-vítt | AppSettings `uttekt_files[kt]` | kt, **aðeins** ef `ktCount≤1` | 187 fallback |
| Fact-check | `year_factcheck` | `co_id`+year `human\|claude\|gap` | LED `.lit`; gap trompar skjöl; klarad trompar gap |
| Payday spegill | `payday_invoices_slokk` | `reference` = `solur.num` | 175 PD-merki per stað |

**199 `filterDocsToLocation`:** fid-merkt skjal → aðeins sá staður. Reikningar/samningar án fid → sýndir á öllum kt-stöðum (félagsvíðir). Skýrslur án fid → address-gisk úr `notes`.

Auto-par (`199:1004`): nákvæmlega 1 skýrsla + 1 reikningur + engin hin þjónusta → `matched_by:'exact'`, `status:'klarad'`. Tvírætt → „🔗 Tengja handvirkt", ekkert gisk.

---

## 11. Hver eiginleiki — uppruni (öll borð)

Slug → `js/patches/218-url-routing.js`. Gesture = hvernig Agnar opnar.

| Borð / pera | Slug / view | Patch / skrá | Tafla | Gesture |
|---|---|---|---|---|
| **Ársskoðun** | `#arsskodun` | **153** + **187** | fyrirtaeki, uttaeki, facts, docs, pairs | Sidebar / Öpp Fjármál |
| Ársskoðun `._yr` | sama | 187 | sjá kafla 2 | listi |
| Ársskoðun SKOÐUN | sama | 153 `._mo` | inspect_month keðja | listi |
| Ársskoðun TÆKI | sama | 153 `eqGroups` | uttaeki / facts | listi |
| Ársskoðun síur | sama | 153 `._ars-st` `._ars-mo` | `state.*` localStorage | smellur FILTER |
| **Rekstrarfélög** | `#rekstrarfelog` | **175** + 312 | fyrirtaeki, docs, pairs, CanonStadur | Sidebar |
| 🧾 bundle | sama | 175 `bundleTag` | document_pairs per fid | accordion |
| **Kúnnasíða / Fyrirtæki** | `#fyrirtaeki` / `#companies` | 158 + **199** + 111 + 307 | fyrirtaeki, docs | smellur nafn |
| STAÐA EFTIR ÁRI | sama | 199 `.sk-pill` | docs + pairs | tvísmellur fc |
| 📅 SOURCE | sama | 199 `.sk-month-pill` | arsskodun_customers | smellur → select |
| FULLBÚIÐ / VANTAR | sama | 199 `.sk-svc-st` | hasRep/hasInv | accordion árs |
| Afslættir % | sama | **255** + **296** + **307** + 113 | afslattur_pct, discount_tiers, company_pricing | kassi ofan á spjaldi |
| **POS / Sala** | `#sala` | `js/pos.js` + **114** + 07 + 10 | solur, vorur, fyrirtaeki | Afgreiðsla/Sala |
| **Kröfur** | `#krofu-yfirlit` | **166** | solur `greitt_med=reikningur` | sidebar / Öpp |
| **Fjármál Öpp** | `/?app=fjarmal` `#opp` | **261** + **315** | — | 📱 Öpp → Fjármál |
| **Bókhald** | `#bokhald` | Bókhalds yfirlit patches | solur | sidebar |
| **Tekjur** | `#tekjur` | `js/tekjur.js` + 304 | solur | sidebar |
| **Kort / Leiðsögn** | `#leidsogn` | `js/mapfix.js` + `kort` | fyrirtaeki coords | sidebar |
| **QR / prentun** | ýmsir | `js/qr*.js` + `prentun` | uttaeki.serial | skanni / miðar |
| **Verkborð** | `#verkbord` | 231 + 287-crm | thjonustubeidni o.fl. | sidebar |
| **Bakendi** | `#bakendi` | **232** | kerfis-tól | sidebar |
| **Bílstjóri** | `#bilstjori` | driver patches | akstur | `?driver` / Öpp |
| **Aksturslisti** | `#aksturslisti` | **267** + **268** | blob akstur 1/2/3 | Ársskoðun 🚗 + sidebar |
| **Verkstæði / Afgreiðsla** | `#verkstaedi` `#afgreidsla` | index + 190 | uttaeki, verkbeidnir | nav |
| **Brunakerfi yfirlit** | `#brunakerfi` | **272** + 273 + 274 | brunakerfi_* , docs | sidebar |
| **Aðstoðarmiðstöð** | `#adstod` | `adstod` agent | watchlist | sidebar |
| **Banner Sími/Tafla/Skjár** | `html[data-viewmode]` | **166** + **263** + **314** + **316** | — | 📱 í borða |
| **Póstur** | `#postur` | 240 + 254 + 308 | email | Reikninga-póstur |
| **Stillingar** | `#stillingar` | 300 + 301 | AppSettings | sidebar |
| **Kennitala-gildra** | Sala checkout | **121** + pos.js | solur.customer_kt | **vörð** |
| **Invoice OUT** | Sala senda/prenta | **10 / 233 / 254** | solur | **vörð** — Elon snertir ekki |
| **Payday** | cron + Kröfu 🔄 | `payday-push.js` | solur | **vörð** |
| **Öryggisnet** | — | **309** + `tools/audit-all.cjs` | app_problems | `netvordur` |

---

## 12. SOURCE vs FILTER (tvær hæðir, einn mánuður)

Agnar merkti bæði **Ágú 32** og **Ágú** í SKOÐUN. Það eru **ekki** sami vírinn.

| | SOURCE | FILTER |
|---|---|---|
| Hvað | Gildi á **einum stað** | Sýn yfir **lista** |
| UI | 📅 `.sk-month-pill` á prófíl; `span._mo` í SKOÐUN | `._ars-mo` „Ágú 32"; `._ars-st` Allt/Búið/… |
| Geymsla | `arsskodun_customers[fid].inspect_month` (+ keðja kafla 1.2) | `localStorage` `state.months` / `state.status` |
| Tala 32 | — | `monthCounts[8]` = fjöldi staða með SOURCE=8 |
| Rauður texti Ágú | almanaksmánuður = SOURCE þessa staðar | chip rauð/valin = FILTER virkur |
| 317 `data-elon-role` | `SOURCE` / `SOURCE SWITCH` | `FILTER` |
| Ræður `._yr.penda` vs `now`? | **Já** (187 `notDue`) | Nei |

```
[📅 SOURCE SWITCH 199] ──inspect_month──▶ [SKOÐUN ._mo 153] ──notDue──▶ [._yr penda|now]
                                              │
                                              └── monthCounts[m] ──▶ [FILTER chip Ágú 32]
```

Smellur á FILTER felur raðir; hann **skrifar ekki** inspect_month. Smellur á SOURCE skrifar blob og **allir** perur sem lesa `_ars.inspect_month` uppfærast.

---

## 13. Known faults (as-built audit 2026-08-26)

Úttekt gegn live `187`/`153`/`175`/`199`/`317` á `cursor/elon-musk-blueprint-226e` (+ master sem inniheldur Plaza-lagnirnar). **Engin kóða-lagfæring** — þetta er bilanalisti. Fid = `fyrirtaeki.id`.

### 13.1 Already patched (not live)

| Pera | Rangt áður | Vír nú | Staða |
|---|---|---|---|
| Plaza **193** `._yr` 2026 blátt | Drive `customer_documents` **9868** R-107802 (Stolpi) fór í `hasReikYear` → `inv-only` | `hasConfirmedInvYear` = `v_uttekt_ar` **eða** `solur.customer_id` (`187:72–75`). `yrCls` notar `hasInvOnly` (`187:462`). `showInvLed` án skýrslu = confirmed only (`187:425`) | **documented-and-patched.** Skjalið er **áfram í DB** |
| Plaza Sími grænt 2026 frá Klöpp/Grandi | `_docYears` ORaði allar `customer_base` úttektarskýrslur á 11 Center-hótel | `byBase` = aðeins munaðir (engin fid) `153:268–271`; neytt aðeins ef base á ≤1 stað `153:358–361` | **documented-and-patched.** Hótel **ekki** sameinuð |
| Brunakerfi-PDF málar slökkvitækja-`._yr` | `isReportKind` tók `kind==='brunakerfi'` (Arnarhvoll) | `187:34–37` — kind aðeins úttektarskýrsla; heiti með `brunakerfi` útilokað | **documented-and-patched** |
| Rekstrarfélög 🧾 án skýrslu | par á base/kt | `yrMiniSl`: `bundled && state==='done'` `175:1607`; pör per fid `175:1668–1715` | **checks out** — 🧾 kviknar ekki á Plaza 2026 |

### 13.2 Dual circuits that a staffer can read as one bulb

Þetta er **ekki** Plaza-vír yfir stað. Þetta **er** rangmerking ef Agnar treystir þremur perum sem sömu perunni.

| Pera | Rofi / vír | Getur **ósamst** við |
|---|---|---|
| Ársskoðun `._yr.both` | 187 `yrCls`: `isKlarad` **eða** `effRep` (locMap/viðhengi). Skýrsla **án** reiknings = grænt | 199 FULLBÚIÐ (`hasRep && hasInv` `199:1080`) sýnir þá **1 AF 2 VANTAR** |
| STAÐA EFTIR ÁRI `.sk-pill` | `pill()` `199:443`: `hasReport && hasInv` úr `repByY`/`invByY` (Drive-reikningur **telur**). Aths. `199:445` segir ranglega „sama regla og `_yr both`" | `._yr.both` þarf ekki reikning; `._yr.inv-only` getur kviknað af `last_year_inspected` (`187:455–462`) án þess að pillan verði `claude`/`both` |
| ✓ FULLBÚIÐ | n-of-2 á **þjónustukortinu** (úttekt vs brunakerfi sitt hvor) | `._yr.both` (listi) og `.sk-pill.both` (árshluti) |

**Röðun þegar þau rekast:** listinn (`187 yrCls`) ræður „fórum við?"; FULLBÚIÐ ræður „er búntið tvískipt á prófíl?"; pillan er skjala-talning + fact-check, ekki Look-A.

**📅 SOURCE vs SKOÐUN vs FILTER** — ekki bug, sjá kafla 1.2 og 12. 199 `loadInspectMonth` (`199:726–742`) les **ekki** `v_skodunar_manudur`. 153/187/síu-chips gera það. Prófíll getur sýnt `📅 mánuður?` á stað sem SKOÐUN sýnir Ágú (44 staðir, mánuður aðeins úr úttektarreikningi). **Rank:** manual > blob > facts > `v_skodunar_manudur` > `uttaeki.next_insp`. 175 næsta-dagur er **önnur** keðja (CanonStadur 312).

### 13.3 Tracer leftover (317) — pera rétt, stimpill getur logið

- `srcOfYr`: `inv-only` → alltaf `src=solur` líka þegar rofinn var `last_year_inspected` eða `year_factcheck=claude`.
- `._ars-mo` FILTER: `y=` mánaðarnúmer (`data-month`), ekki ár. `fid=board`.
- `.sk-doc.inv` → `src=solur` líka fyrir Drive-einn reikning.
- POS `#pos-totals` er `role=CALC` `fid=board` — ekki tómt fid og ekki ársreitur.

Hover `data-elon` er vísbending, ekki sönnun. Lesa `file:line` í köflum 1–3.

### 13.4 Residual data (not a display wire)

- Plaza **9868** / R-107802 situr áfram á fid **193**, `vidskiptategund=uttekt`. Kveikir **ekki** inv-only. Getur enn birtst sem reiknings-chip á prófíl og, **ef** 2026-skýrsla bætist við, auto-parast (`199:1004`) → FULLBÚIÐ á Stolpi-reikningi.
- `filterDocsToLocation` (`199:272–281`): reikningur/samningur **án** fid → sýndur á **öllum** kt-stöðum. 9868 **hefur** fid=193 → Plaza only. Ómerkt Drive-reikningur = fail-open á Center-systkinum (prófíls-chip, ekki `._yr`).


