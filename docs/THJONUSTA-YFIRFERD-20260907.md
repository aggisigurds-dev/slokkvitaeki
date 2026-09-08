# Hverjir eiga í raun heima í þjónustu — yfirferð 07.09.2026

> **Staða: FRAMKVÆMT 08.09.2026. Öll 36 tekin úr þjónustu.**
>
> Agnar fór sjálfur yfir úrtak (NSN tæki, Klettás, Hugheimur) og staðfesti:
> *„þeir sem ég kíkti á voru að virðist bara með búðarsölur og kerfið að halda
> að þetta væru úttektar invoice… má bara taka þau öll úr þjónustu."*
>
> `er_i_thjonustu = false` sett á 36 — en **eitt var sett aftur inn samdægurs**,
> sjá „Villa sem netið greip" hér að neðan. Endanlega fóru **35** út og í þjónustu
> fór **úr 683 í 648**. Öll 5.242 tækin standa eftir.
> Þrjú félög án sönnunar standa eftir og það eru systkinastaðirnir sem haldið var
> eftir viljandi.
>
> **Afturköllun:** afritið er í töflunni `backup_thjonusta_ut_20260908` (36 raðir
> með fyrri stöðu). Til að bakka öllu:
> `update fyrirtaeki f set er_i_thjonustu = b.er_i_thjonustu from backup_thjonusta_ut_20260908 b where b.id = f.id;`
>
> **Rótin sem eftir stendur:** búðarsölur hengjast í úttektarreitinn á
> fyrirtækjasíðunni (NSN tæki sýndi R-108215 sem „Slökkvitækjaþjónusta 2026"
> þótt engin tæki væru skráð). Það er sjálfstæð villa og hún er ólöguð.

## Af hverju listinn er til

Agnar 07.09.2026: *„Það var einhverntímann flutt inn í þjónustu allir sem hafa
átt einhverja millifærslu eða greiðslu til fyrirtækisins, er ennþá að reyna
sortera þá út."*

`er_i_thjonustu` er því **ekki merki um þjónustu** heldur um að einhver hafi
einhvern tímann borgað. 684 félög bera flaggið. Þessi yfirferð flokkar þau öll
eftir því hvaða sönnun um raunverulega þjónustu er til.

Reglan sem greinir á milli er Agnars sjálfs, sett sama dag:

> *„Ef það stendur ekki Akstur eða skýrslugerð þá er reikningurinn líklega bara
> úr búð."*

Hvort tveggja segir að farið hafi verið á staðinn. Reikningur án beggja er
búðarsala og gerir kaupandann ekki að þjónustukúnna.

## Flokkunin — öll 684

| Sönnun | Félög | Tæki |
|---|---|---|
| A · Þjónustusamningur | 147 | 1.178 |
| B · Úttektarskýrsla til (skráð eða skjal) | 477 | 4.052 |
| C · Úttektarreikningur (Akstur/skýrslugerð) | 19 | 27 |
| D · Tæki skráð, engin úttekt | 2 | 10 |
| E · Aðeins sala eða skjal — engin þjónusta | 30 | 0 |
| F · Engin virkni yfirhöfuð | 9 | 0 |

**645 af 684 (94%) eiga raunverulega þjónustusögu.** Kandídatarnir eru 39, og
ekkert þeirra á eitt einasta tæki skráð.

Þrír þeirra eru **systkinastaðir kúnna sem eru sannarlega í þjónustu** — nýir
staðir sem bíða fyrstu úttektar. Þeir eiga að standa:

- Center Hótel - Hlaðvarpinn (10 systkini í þjónustu)
- Vélrás - Gullhella
- Vélrás - Klettagarðar

Eftir standa **36 kandídatar**.

## Kandídatarnir 36

### Virkir 2026 — búðarkúnnar samkvæmt reglunni (21)

| Félag | fid | Síðasta spor |
|---|---|---|
| Fjörukráin ehf | 1589 | 03.09.2026 |
| Hugheimur ehf. | 509 | 02.09.2026 |
| Hjallabraut 35-43, húsfélag | 1500 | 23.07.2026 |
| Reising Byggingarfélag ehf. | 1624 | 10.07.2026 |
| Meistaralagnir ehf | 1218 | 27.05.2026 |
| Rótin, félagasamtök | 1514 | 06.05.2026 |
| kt 250996-2849 | 1537 | 05.05.2026 |
| Bílaverkst. Kjartans-Þorgeirs sf | 1507 | 30.04.2026 |
| Hilmar Már Gunnlaugsson | 1519 | 28.04.2026 |
| NSN tæki ehf. | 580 | 27.04.2026 |
| Suðurbraut 2, húsfélag | 1509 | 16.04.2026 |
| Einar Örn Reynisson | 1189 | 15.04.2026 |
| Oscuro ehf | 1505 | 14.04.2026 |
| Habitar Fasteignir ehf | 1515 | 31.03.2026 |
| Amrika ehf | 1522 | 19.03.2026 |
| Klettás ehf | 1520 | 17.03.2026 |
| Waldorfskólinn í Lækjarbotnum | 1512 | 09.03.2026 |
| Greining, endurskoðun ehf | 1513 | 19.02.2026 |
| HG kranar ehf. | 782 | 12.02.2026 |
| Íslandspóstur ohf | 1525 | 28.01.2026 |
| Mini Market ehf | 1511 | 19.01.2026 |

### Sofandi síðan 2021–2023 (6)

| Félag | fid | Síðasta spor |
|---|---|---|
| Húsfélagið Álfaskeið 82-84 | 854 | 12.04.2023 |
| Húsfélagið Ásakór 1 og 3 | 592 | 10.05.2022 |
| Bílskýli Flétturima 10-16 | 805 | 14.03.2022 |
| Álfholt 2c, húsfélag | 514 | 08.12.2021 |
| Gerplustræti 6-12, húsfélag | 846 | 19.04.2021 |
| Flétturimi 14, húsfélag | 786 | 31.03.2021 |

### Ekkert spor — hvorki sala, skjal né skýrsla (9)

Tannlæknastofa Skipholti 50d (1638) · Gullhamrar (1644) ·
Húsfélagið Sléttuhrauni 24 (1640) · Highland Base Kerlingarfjöll ehf (818) ·
Rentur Fagraberg 18 (1637) · Húsfélagið Sléttuvegur 9 (1641) ·
Art Hostel ehf. (827) · Húsfélagið Barónstígur 47 (1636) ·
Benedikt Þórisson (839)

## ⚠️ Fjögur nöfn sem á að staldra við

**Íslandspóstur ohf**, **Highland Base Kerlingarfjöll**, **Art Hostel** og
**Waldorfskólinn í Lækjarbotnum** eru stórir staðir sem *ættu* að hafa
brunavarnir. Séu þeir raunverulegir þjónustukúnnar þá vantar okkur skjölin
þeirra — og þá er þetta **gagnagat, ekki búðarkúnni**. Ekki taka þá út án þess
að fletta upp hvort úttekt hafi verið gerð utan kerfis.

## Hvað var þegar búið að gera í fyrri áfanga

Dálkurinn `fyrirtaeki.is_bank_only` er til og ber **154 raðir** — greiðendur úr
banka sem áttu hvorki kennitölu, tæki né samning. Þeir eru faldir úr öllum sýnum
nema sinni eigin síu („🏦 Greiðendur (bank)" í patch 157) og aðeins **einn**
þeirra ber `er_i_thjonustu`. Sú merking er afturkræf — flaggið, ekki eyðing.

**Enginn af þessum 36 er í þeim hópi.** Þeir eru næsta lag: þeir eiga kennitölu
og skjöl, en enga þjónustusönnun.

## Tvær gildrur sem kostuðu tíma við þessa yfirferð

1. **`fyrirtaeki.created_at` er innflutningsdagur, ekki skráningardagur.** Öll
   félög bera dagsetningu á bilinu 2026-04 til 2026-09 (þegar appið var byggt) —
   2026-05 eitt og sér ber 496 félög. Sía á „nýskráð eftir X" gefur því
   merkingarlausa niðurstöðu sem lítur sannfærandi út: fyrsta atrenna mín gaf
   **0 kandídata** og virtist rétt. Notaðu fyrstu raunverulegu virkni í staðinn
   (`min` af `solur.created_at`, `customer_documents.doc_date`,
   `arsskodun_report_facts.report_year`).
2. **„Engin úttekt í kerfinu" er ekki sama og „engin úttekt".** Fjórir kúnnar
   litu út fyrir að vera búðarkúnnar en eiga endurtekna reikninga 2024–2026
   (Hugheimur með sjö). Þeirra reikningar eru aðeins skráðir sem skjöl með
   R-10xxxx-númerum, ekki lesnir sem úttektir. Það mælir skort á gögnum hjá
   okkur, ekki skort á þjónustu.

## ⛔ Villa sem öryggisnetið greip — lesist

`audit-fk-join.cjs` fór RAUTT strax eftir aðgerðina og greip **mína villu**:

> `#1638 Tannlæknastofa Skipholti 50d (by-name 4, by-fid 0)`

Félagið **á fjögur virk tæki**. Þau voru bara ekki tengd með `fyrirtaeki_id`
heldur með nafni í `uttaeki.client`. Öll flokkunin hér að ofan taldi tæki með
`where u.fyrirtaeki_id = f.id` — og **sá þau því ekki**. Félagið var flokkað sem
sönnunarlaust og tekið úr þjónustu að ósekju.

**Lagað samdægurs:** félagið sett aftur í þjónustu og tækin fjögur (TMP-AVUBXM,
TMP-2LFKS8, TMP-V2ZAEK, TMP-D4E7KE) tengd með auðkenni. Null-FK bakslagið fór
úr 4 í 0 og allar 27 úttektir eru grænar.

**Lærdómurinn, sem gildir um hverja einustu tækjatalningu:** tæki tengjast
fyrirtæki á TVO vegu — `uttaeki.fyrirtaeki_id` OG `uttaeki.client` á nafni.
Talning sem lítur aðeins á FK sýnir núll hjá félagi sem á tæki. Hin 35 voru
sannreynd á báðum leiðum eftir á; ekkert þeirra bar nafntengd tæki.

## Hvað var gert 08.09.2026

36 fengu `er_i_thjonustu = false`, eitt var sett aftur inn (sjá að ofan), svo
**35 fóru út: 683 → 648 í þjónustu**, 5.242 tæki óhreyfð. Fjögur nöfnin sem varað var við hér að ofan fóru út með hinum að ósk
Agnars — hann fór yfir úrtak sjálfur og staðfesti mynstrið. Reynist eitthvert
þeirra vera raunverulegur þjónustukúnni er það ein lína til baka úr
`backup_thjonusta_ut_20260908`.

## Það sem stendur eftir

**Rótin er ólöguð:** búðarsala getur hengt sig í úttektarreit ársins á
fyrirtækjasíðunni. NSN tæki sýndi `R-108215` sem „Slökkvitækjaþjónusta 2026"
með grænum haka þótt félagið eigi engin tæki og reikningurinn sé búðarsala.
Það er ástæðan fyrir að þessi 36 litu út eins og þjónustukúnnar í viðmótinu.
Þangað til það er lagað mun sama misskilningi safnast upp aftur.

Reglan sem greinir á milli er þegar til í kóðanum (`tools/lesa-reikninga-drive.cjs`
— „Skýrslugerð og vottun" EÐA „Akstur"); hún þarf að rata inn í pörunina á
fyrirtækjasíðunni.

## 🔁 Framhald 08.09.2026 — 41 draugar sem hreinsunin náði ekki

Daginn eftir hreinsunina stóð Agnar frammi fyrir Ársskoðunarborðinu og sá 711
fyrirtæki þar sem `er_i_thjonustu = true` bar aðeins **649**. Amrika, Art Hostel,
NSN tæki, Íslandspóstur og „Test fyrirtæki" voru öll þarna enn — félög sem hann
hafði sjálfur tekið úr þjónustu.

**Ástæðan er tvískrifun sem bulk-SQL braut.** Takkinn „⬇ Úr þjónustu"
(`280-company-service-toggle.js`) skrifar á TVO staði:

1. `fyrirtaeki.er_i_thjonustu = false` — dálkurinn, per-röð
2. `app_settings.arsskodun_customers[id] = { subscribed:false, removed_from_service_at }`

Hreinsunin 08.09 var keyrð sem SQL-uppfærsla og snerti **aðeins fyrsta liðinn**.
`inService()` í `153-arsskodun.js` telur félag áfram í þjónustu ef blobbið segir
`subscribed: true` (arfleifð frá 2026-06-02, „fallback during the transition"),
og úrtöku-neitunin þar fyrir ofan krefst `subscribed !== true` — svo hún gat ekki
gripið inn í. Félögin komu því öll aftur við næstu hleðslu.

Fjögur til viðbótar (Hugheimur, NSN tæki, HG kranar, Art Hostel) báru
`removed_from_service_at: 2026-07-23` **en samt** `subscribed: true` — sama
gildra, eldri dagsetning.

**Lagað 08.09.2026:** blobbið stimplað eins og takkinn sjálfur gerir
(`subscribed:false` + `removed_from_service_at`) fyrir **41 félag** sem uppfylltu
ÖLL þessi skilyrði:

- `er_i_thjonustu = false` (meðvituð úrtaka — dálkurinn er aldrei NULL, mælt)
- engin lifandi tæki í `uttaeki` (`status != 'urelt'`)
- engin tæki í blob-`equipment`
- enginn brunakerfissamningur (`brunakerfi_customers`)

Þrjátíu félög með `er_i_thjonustu = false` **en lifandi tæki** voru VILJANDI
látin í friði (Þangbakki 8-10 með 55 tæki, Húsfélagið Ásholt 2 með 34, Hótel
Atlantic apartments með 32 …). Tækin eru sönnun sem á að skoða, ekki hunsa.

**Mælt í viðmótinu:** borðið fór úr **711 → 670**, og „🚫 Án mánaðar" úr
**93 → 53**. Eftir standa 53 raunverulegir þjónustukúnnar sem vantar
skoðunarmánuð — vinnulisti, ekki rusl.

**Afturköllun:** heilt afrit af `app_settings.settings` fyrir aðgerð er í
`C:\Users\Slokkvitaeki\backup_app_settings_20260908_fyrir-draugahreinsun.json`
(1,4 MB). Til að bakka: PATCH-a `app_settings?id=eq.1` með `settings` úr afritinu.

### ⚠️ Af hverju kóða-lagfæring var EKKI valin

Fyrsta hugmyndin var að láta `er_i_thjonustu === false` einfaldlega slökkva á
blob-merkinu í `inService()`. **Mæling stöðvaði það:** 30 félög með lifandi tæki
hefðu horfið af borðinu. Önnur hugmynd — að hætta að lesa `subscribed` úr
blobbinu — hefði brotið áskriftartakkann í `158-vidsk-detail.js`, sem skrifar
`subscribed: true` **án** þess að snerta dálkinn; nýskráður kúnni hefði aldrei
birst. Gagna-lagfæring sem notar sömu vél og takkinn var eina leiðin sem braut
ekkert.

### Það sem stendur eftir eftir þessa aðgerð

- **`v_thjonustu_tolur.allar_i_thjonustu` segir 682** meðan dálkurinn ber 649 og
  listinn 670. Hausinn á Ársskoðun les þá tölu, svo hann sýnir enn hærri tölu en
  listinn undir honum. Viewið er server-megin og var ekki snert.
- **„Test fyrirtæki" (1404)** er enn á borðinu — það ber 6 lifandi tæki og fellur
  því undir vörnina hér að ofan. Þarf handvirka ákvörðun.
- **Garðyrkjufélag Íslands (1198)** stendur eftir á brunakerfissamningi. Rétt.

## 📋 Ársskoðunarborðið 08.09.2026 — mánuðir, tóm tækjalisti, Hide

Agnar: *„sjá til að taflan virkar. og setja inn mánuðina og tóma tækjalista eða
henda út félögum eða setja í Hide."*

### Taflan virkar — prófað, ekki lesið

⚡-hamurinn (`#_ars-ovr`) opnar þrjá ritla á röðinni. Allir prófaðir í viðmótinu:

| Reitur | Prófun | Niðurstaða |
|---|---|---|
| Mánuður | Danshöllin → Maí → ↺ Hreinsa | Vistast (`inspect_month:5` + `manual:true`), hreinsast aftur í „—" |
| Tæki | Danshöllin → Léttvatn 3 → 0 | Vistast (3 SLT, 20þ ÁÆTL), afturkallast |
| 🕶 Hide (nýtt) | Test fyrirtæki fela → sýna | 670 → 669 → 670, birtist í „🕶 Faldir" |

### 🕶 Hide — eitt merki, báðar síður

Nýi takkinn skrifar `fyrirtaeki.ovisst` — **sama dálk og „🕶 Óvissir (faldir)"
í patch 157**. Félag sem er falið í Allir viðskiptavinir á ekki að standa eftir
á vinnulistanum í Ársskoðun, og öfugt.

Þrennt var meðvitað valið:

1. **Per-röð skrif, ekki settings-blobbið.** Blobbið er last-write-wins og fjórar
   vélar vinna samtímis — sama gildra og felldi félög úr þjónustu áður (patch 198/280).
2. **Faldir hverfa aldrei úr leit.** Sama regla og gildir um slepptu: kúnni sem
   hverfur úr leit án skýringar lætur leitina líta út fyrir að vera bilaða
   (mælt 28.07.2026 á stöðusíunni).
3. **Ekkert var falið sjálfkrafa.** Sjá ástæðuna hér að neðan.

### Hvað var fyllt

- **15 mánuðir úr dagsetningu úttektarskjals** → blob `inspect_month` +
  `manudur_ur_skjali` (uppruninn rekjanlegur). Álfaskeið 78-80 mars, Crinis apríl,
  Eignarekstur júní, Fótaaðgerðarstofa apríl, Jörfabakki 32 ágúst, Sólvangsvegur 1
  júní, Flétturimi 16 janúar, Leifsgata 10 júlí, Pad Thai apríl, Prennsýn apríl,
  Sigrún Júlía júlí, Stefanía maí, Austurberg 2 janúar, kt 531014-1620 apríl,
  kt 660312-0800 apríl.
- **7 félög úr úttektarskýrslunni sjálfri** (`arsskodun_report_facts`, tækjatala
  og/eða mánuður): Hellas 2 · Breiðvangur 9 4 · Soffía Jónsdóttir 16 + feb ·
  Sléttahraun 9 · Herbergjaleiga 5 · Snóker 3 · K Apartments 41 + des.
  **`report_year` var ekki snert** — engin readiness-breyting.
- Haldið eftir: **Pure Deli** (51 tæki — bíður staðfestingar Agnars á að skýrslan
  eigi við réttan stað) og **fimm skýrslur þar sem kt í PDF-inu stemmir ekki**
  við félagið sem skjalið er tengt (m.a. Austurberg 2: PDF les 511115-1400,
  félagið ber 470486-7169).

„🚫 Án mánaðar" fór úr **53 í 36**.

### ⛔ Af hverju ekkert var falið eða tekið út sjálfkrafa

Master-mappan var talin upp í heild (`/api/drive-filelist`, **1.494 skrár**) og
öll 63 félögin á vinnulistanum leituð uppi á kennitölu OG nafni.

**Fjörutíu og eitt þeirra á enga skrá þar.** Og af 36 úttektarskýrslu-skjölum
sem skráð eru á þennan hóp bera **26 hvorki `drive_file_id` né `storage_path`** —
Drive-hlekkirnir voru dauðir og fjarlægðir 30.07.2026.

Verra: athugasemdirnar sýna að tengingin var **nafnaágiskun sem kerfið sjálft
merkti vafasama**:

- `K.Rickter.pdf` → **K-50 ehf.**
- `Lyfja Selfossi september 2023.pdf` → **SE ehf.** („fundna skráin segir kt
  531095-2279 (= Lyfja hf.) en röðin er tengd SE ehf")
- `Fiskbúð Suðurlands.pdf` → **Heilbrigðisstofnun Suðurlands**

**Þar með er `report_year` hjá þessum hópi ekki traust heimild — þar á meðal sex
2026-stimplar.** Þeir mála græn ár á fyrirtæki sem enginn veit hvort voru skoðuð.

Þess vegna voru þessi 27 **ekki** falin og ekki tekin út: þau líta ekki út eins
og rusl, þau líta út eins og félög sem vantar skjölin sín. Að fela þau væri að
fela gagnagatið, ekki loka því. Heilbrigðisstofnun Suðurlands er ekki búðarkúnni.

### Listinn sem bíður ákvörðunar (27)

**Með skýrsluár sem byggir á nafnaágiskun (17)** — Fasteignasalan Garður (2026) ·
Húsfélag Laufvangur 18 (2026) · K-50 (2026) · Pitstop þjónustan (2026) ·
Suðurvangur 19a (2026) · Tveir hressir (2026) · Drífa (2025) · Friðfinnur
v/bílaverkst (2025) · Hjördís dagmamma (2025) · KAT (2025) · Miðleiti 8,10 og 12
(2024) · SE ehf (2024) · Engjahlíð 5 (2023) · Heilbrigðisstofnun Suðurlands (2023) ·
Húsfélag Laufásvegur 10 (2023) · Kytra (2023) · Pure North (2023)

**Engin skýrsla, engin skrá (10)** — Bílastjarnan · Danshöllin · Eyesland
Spönginni · Húsfélagið Kjarrhólmi 18 · Laugavegur 11 · Lindaberg · María
Ingibjörg Kristinsdóttir · Móðurást · Ragnheiður B Valgarðsdóttir · Reykjaklettur

**Halda óbreyttum (6):** Garðyrkjufélag Íslands og JM Veitingar (brunakerfis-
samningur) · Center Hótel Hlaðvarpinn, Heimaleiga EA Law Practice, Vélrás
Gullhella, Vélrás Klettagarðar (systkinastaðir sem bíða fyrstu úttektar).

## 🧰 „Um 40 eru ekki með nein tæki í prófíl" — 08.09.2026

Mælt: **59** af 670 á borðinu bera engin tæki (var 61 áður en gamla-skýrslu-
reglan hér að neðan var lagfærð). Ástæðurnar eru fjórar og aðeins ein þeirra
er „vantar gögn".

| Ástæða | Fjöldi |
|---|---|
| Ekkert hvergi — engin tæki, engin skýrsla, ekkert skjal | 34 |
| Skýrsluröð til en hún ber 0 tæki | 24 |
| Öll tæki merkt `urelt` | 1 |
| ~~Gömul skýrsla sem borðið hunsaði~~ **lagað** | ~~2~~ |

### Lagað: gömul skýrsla fyllir tóman lista

Ferskleika-vörnin (`report_year >= 2025`, sett 16.07.2026) er til að gömul
skýrsla feli ekki tæki sem eru til **í dag**. Eigi félagið engin lifandi tæki
hefur hún ekkert að verja — og þá er gamla talan eina heimildin sem til er.
Skilyrðinu bætt við `|| !units.length`.

Mælt á öllum grunninum fyrirfram: **9 félög fá tölu í stað núlls, ekkert félag
sem á lifandi tæki breytist.** Á borðinu: Hjarðarból 12, Soffía Jónsdóttir 16
(sýnir nú „14 SLT 2 BSL 74þ ÁÆTL" þar sem áður stóð „0 SLT — ÁÆTL").

### ⚠️ Sex skýrslur eru skráðar á RANGT félag

PDF-in voru lesin og kennitalan í þeim borin saman við félagið sem skjalið
hangir á. Hver einasta „misræmis"-kennitala reyndist eiga sér raunverulegt
annað félag í grunninum:

| Skjalið hangir á | PDF segir kt | Kt tilheyrir í raun |
|---|---|---|
| 499 Austurberg 2, húsfélag | 511115-1400 | **291 Húsfélagið Austurberg 2-4-6** (á 6 tæki) |
| 578 Hjarðarból ehf | 641097-2099 | **697 Grasnytjar ehf Hjarðarbóli** (á 12 tæki) |
| 721 Nethylur ehf | 600169-6619 | **447 Heimilisiðnaðarfélag Íslands** (á 4 tæki) |
| 835 Húsfélagið Laugavegi 42 | 510117-0690 | **Heimaleiga** (10 staðir) |
| 1264 Þvottahúsið A. Smith | 681290-2499 | **743 Terma ehf** (á 6 tæki) |
| 1416 S&L ehf. | 470202-3940 | **1631 Laugavegur 11 / 1632 Gerðuberg** |

Austurberg-skýrslan segir sjálf í „Annað": *„Öll slökkvitæki í stigagangi 2-4
og 6 yfirfarin"* — hún á ótvírætt við 291, ekki 499.

Tvö skjalanna eru **ekki einu sinni úttektarskýrslur**: skjalið á S&L er
þjónustusamningur Laugavegar 11, og skjalið á Lindaberg (603) er
brunaviðvörunarkerfis-skýrsla. Þess vegna las lesarinn 0 tæki — það voru engin
slökkvitæki í skjalinu.

### 🧬 Nítján af 59 eiga systkinaröð sem BER tækin

Þetta er stærsta einstaka skýringin á tómum prófíl: félagið er skráð tvisvar og
tækin sitja á hinni röðinni.

- 1409 Álfaskeið 78-80, húsfélag → **257 Húsfélagið Álfaskeið 78** (6 tæki)
- 1612 Bílabúð Benna - Fiskislóð → **532 Bílabúð Benna ehf** (17)
- 1760 Bílaleiga Flugleiða, Hertz - Flugvellir 11 → **265 Bílaleiga Flugleiða, Hertz** (6)
- 656 Húsfélagið Flétturima 16 → **301 Flétturima** (15)
- 603 Lindaberg ehf. → **208 Lindaberg ehf (T-10)** (8)
- 578 Hjarðarból ehf → **697 Grasnytjar ehf Hjarðarbóli** (12)

Systkinastaðir sem eiga að standa aðskildir (Center Hótel, Vélrás) eru líka í
þessum hópi og eru ekki tvítekning.

### Eitt til viðbótar

**160 Húsfélag Sólvangsvegur 1** á þrjú ABC Duft 6 kg sem eru **öll merkt
`urelt`** þótt þau beri `last_insp 2025-05-15` og `next_insp 2026-05-15`. Það er
eina félagið í öllum grunninum í þeirri stöðu — lítur út eins og slys. Ekki
snert; bíður ákvörðunar.
