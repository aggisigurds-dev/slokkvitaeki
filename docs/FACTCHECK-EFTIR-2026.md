# Factcheck á „Eftir 2026" — vinnuskjal

Byrjað 11.11.2026. Plan: sjö próf per félag (A kt↔nafn/heimilisfang · B kt↔skýrsla · C geopunktur ·
D húsmynd · E tækjalisti↔skýrsla/reikningur · F netfang/samskipti · G starfandi).
Netföng og símar eru EKKI skráð hér (opinbert repó) — þau eru í `charlize_contacts`.

Staða mengis: 168-listinn er ekki enn lesinn af skjánum (innskráning þarf í vafrann); prufan er fimm efstu.

## Hvar gögnin búa (kortlagt 11.11)
- Húsmynd: `app_settings.settings.co_bygging_mynd[id]` — `uppspretta`: handvirkt (75) · google-streetview (503) ·
  google-maps-skjamynd (66) · borgarvefsja-2018 (51, loftmynd) · mapis-loftmynd (7) · gatt (8). Punkturinn sem
  myndin var sótt á er í sömu færslu (`hnit`).
- Punktur: `geocode_cache` (fyrirspurn = heimilisfangsstrengur). Röð með heimilisfang „101 Reykjavík" fær miðju
  póstnúmersins (64.145981, -21.9422367) — sami punktur á 749 og 1325.
- Kt skýrslu: aðeins í PDF-inu (lesið um Drive `drive_file_id`); eldri skýrslur (2023) geta verið án kt.
- Fyrirtækjaskrá: `fyrirtaekjaskra_stada` (sótt 18.–19.10.2026).

## Prufa — 5 félög (11.11.2026, ekkert skrifað í gögn)

| id | Félag | A | B | C | D | E | F | G |
|---|---|---|---|---|---|---|---|---|
| 749 | Ægir Bar Laugarvegur | kt rétt (Ægir 101 ehf.); **götu vantar** (Laugavegur 2) | passar (nóv 2024) | **rangur** (miðja 101) | loftmynd af röngum punkti | passar 3 LV + 1 CO₂5 (skýrsla 2024); reikn. 2025 til, **skýrsla 2025 vantar** | staðfest | starfandi |
| 1325 | Bláa lónið (verslun) | kt = Bláa Lónið Ísland ehf., Garðabæ; **götu vantar** (Laugavegi 15) | **engin kt í skýrslu** (apr 2023) | **rangur** (miðja 101) | loftmynd af röngum punkti | passar 1 LV + 1 CO₂2 (2023); ekkert síðan | **ekkert fannst** | félag skráð; ekkert lífsmerki hjá okkur síðan 04.2023 |
| 200 | Center Hótel – Þingholt Apartments | á ekki við (rekstrarfélag, 13 staðir) | passar (des 2025) | til (úr cache; óháð mæling ómæld) | gáttarmynd af götunni, í lagi | passar 5 LV (skýrsla des 2025); reikn. R-107606 ber „Aðalstræti 6" í skráarnafni — innihald ólesið | staðfest | starfandi |
| 1418 | Ferðamálastofa | nafn passar; **heimilisfang annað**: okkar Lækjargötu 3, Fyrirtækjaskrá + skýrsla 2023 Geirsgötu 9 | passar (nóv 2023); skýrsla 2024 finnst ekki í Drive | **rangur** (fylgir Lækjargötu 3) | **innimynd** (ekki húsið) | passar 2 LV + 1 CO₂2 + 1 CO₂5 (2023); 2024-skýrsla ólesin | staðfest; reikningar eiga að fara rafrænt um Fjársýslu | starfandi (ríkisstofnun) |
| 1201 | Gyllti kötturinn ehf | passar | passar (nóv 2023) | til (úr cache) | götumynd sýnir sund, ekki framhlið | passar 1 LV (2023); ekkert síðan | staðfest (bókari hjá bókhaldsstofu) | félag skráð; ekkert hjá okkur síðan 12.2023 |

### Leiðrétt 11.11.2026 (Agnar: „já endilega leiðréttu")
Heimilisfang, afrit í `backup_20261111_sannreyna_heimilisfang`, lína í `review_note`, lesið til baka:
749 „101 Reykjavík" → Laugavegur 2 · 1325 „101 Reykjavík" → Laugavegur 15 · 1418 Lækjargötu 3 → Geirsgata 9
(ferdamalastofa.is segir Geirsgata 9 í dag).

### Götumyndir sóttar um `/api/husmynd` á leiðréttum heimilisföngum — ENGIN vistuð
749: innimynd úr fataverslun (ónothæf) · 1325: horn á grænu bárujárnshúsi við göngugötuna (nothæf ef þetta er nr. 15 —
óstaðfest) · 1418: gluggalítill veggur og bílastæði (léleg) · 1201: sama sund og áður. Fallið velur næsta panó, ekki
framhliðina; betri mynd þarf handvalið sjónarhorn í Google Maps.

Aukafundir: ferðanóta 1201 er prufutexti („dfgdfgdf…"); 749 á 4 `urelt` tvítök í tækjaskrá (teljast ekki).

## Mengið (staðfest 11.11.2026)
Sían endurgerð í SQL (aðild: `er_i_thjonustu` eða blobb · ekki búið: `document_pairs` klarad / `year_factcheck` /
`last_year_inspected=2026` · ekki ❓ Óvíst · ekki falið) gefur **168**, sama og skjárinn. Heildin mælist 661 á móti 664
á skjá og Búið 452 á móti 453 (brunakerfis-aðild er ekki í SQL-ígildinu) — mengið getur því vikið um 1–3 félög.
Röð: póstnúmer, svo nafn (sama og skjárinn; fyrstu sex stemma). **Síðasta félag lotu 2: 533 Partýbær. Næst: 599 Prikið.**

## Lota 2 — 10 félög (11.11.2026, ekkert skrifað í gögn)

| id | Félag | A | B | C | D | E | F | G |
|---|---|---|---|---|---|---|---|---|
| 1484 | Heimaleiga – Ice Apartments | á ekki við (Heimaleiga); kt raðar 480702-2390 = **365 hf.** | **önnur kt í skýrslu: 510117-0690** (okt 2025) | passar | handsett – ósnert | passar 7 LV + 1 CO₂5 | staðfest (Heimaleiga, 10.11.2026); skoðun 2026 fyrirhuguð 11.11 | starfandi |
| 869 | Heimaleiga – Máni Apartments | á ekki við; kt raðar 680396-2219 = **Laugaverk ehf.** | **önnur kt: 510117-0690** (júlí 2025) | passar | handsett – ósnert | **listi ≠ skýrsla**: listi 54 LV · skýrsla 52 LV + 1 CO₂5 + 1 slanga | staðfest; skoðun 2026 lokið 10.11 skv. pósti, skýrsla ókomin | starfandi |
| 1486 | Heimaleiga – Midtown Hotel | á ekki við; kt raðar 630693-2419 = **IHC ehf.** | **önnur kt: 510117-0690**; skýrslan (okt 2025) heitir „Máni Apartments og Midtown Hotel, Laugarvegur 18" — **nær yfir tvo staði** | passar | í lagi (allt húsið, skilti) | passar 56 LV + 1 CO₂5 + 4 slöngur — en sama skýrsla nær yfir Mána (54 þar): **tvítalning ómæld** | staðfest; skoðun 2026 lokið 10.11 | starfandi |
| 1153 | Húsfélag Garðarstræti 6 | passar (ritvilla í nafni: „Garðarstræti") | passar (nóv 2023) | til (cache) | nærmynd af inngangi, húsnúmer sést | passar 4 LV; ekkert síðan 11.2023 | **ekkert fannst** | húsfélag skráð; ekkert hjá okkur síðan 2023 |
| 1363 | Húsfélagið Laufásvegi 10 | passar (aukakomma í nafni) | **önnur kt í skýrslu: 530108-0739**; rétt er 530181-0739 (Fyrirtækjaskrá + reikningur 104428) — ásláttarvilla í skýrslu 2023 | passar | nærmynd af inngangi, húsið sést ekki | passar 4 LV + 5 reykskynjarar; ekkert síðan 12.2023 | **ekkert fannst** | húsfélag skráð; ekkert síðan 2023 |
| 785 | ICE Hótels ehf. | nafn passar; lögheimili er pósthólf, staður Vatnsstíg 9a (skýrsla) | passar (ágúst 2023) | til (cache) | í lagi (húsið frá götu) | passar 2 LV + 1 duft 2 kg; ekkert skoðað síðan 08.2023 | staðfest; þjónustusamningur sendur 04.11.2026 | starfandi |
| 703 | Iðnó menningarhús | kt = RVK Tjörn ehf. (staðfest í pósti 04.03.2026), staður Vonarstræti 3 | passar (apríl 2024) | passar | í lagi | passar 9 LV + 2 CO₂2 + 4 CO₂5 + 4 slöngur | staðfest; **05.03.2026 afturkallaði kúnninn heimsóknina — Securitas tók verkið; tekið af vinnulista 06.03** | starfandi — **þjónustustaða: Agnars** |
| 706 | Kaffi 22 (Kíkí) | kt = 22 Kaffi ehf. (staðfest í pósti 30.10.2024), staður Laugavegur 22 | passar (nóv 2024) | til (cache segir 22A) | **innimynd** | passar 5 LV + 1 CO₂5; engin skoðun 2025 | staðfest (sami tengiliður og Ægir/Iðnó/Prikið) | starfandi |
| 1631 | Laugavegur 11 | kt = Eignarhaldsfél. Gerðuberg ehf. (nóta á röð segir það); nafn er heiti staðar | engin skýrsla | passar | loftmynd | **ekkert til**: engin tæki, skýrsla né reikningur; samningur samþykktur 06.12.2024 | staðfest (12.2024) | skráð; **aldrei skoðað frá samningi** |
| 533 | Partýbær ehf. | passar | engin skýrsla | **rangur** (cache: Hverfisgata 112, 105) | engin mynd | engin tæki; reikningur 106296 (03.02.2025, greiddur) | staðfest | starfandi; **nóta á röð: „bara greiðandi fyrir Viðburðarverksmiðjuna — taka út"** |

## Lota 3 — 10 félög (11.11.2026). Eina skrifið: mælilína bætt við opið mál #66 (Prikið)
**Síðasta félag: 1557. Næst: sæti 26 í röðinni (póstnúmer, nafn) — offset 25 í SQL-ígildi síunnar.**

| id | Félag | A | B | C | D | E | F | G |
|---|---|---|---|---|---|---|---|---|
| 599 | Prikið ehf | kt rétt (lögheimili Hverfisgata 105, staður Bankastræti 12) | passar (nóv 2024) | passar | í lagi (húsið með skilti) | passar 3 LV (2024) — **skoðað um 20.04.2026 skv. okkar pósti („tæki og slöngur"), engin skýrsla 2026 og enginn reikningur eftir R-107506 (13.11.2025)** | staðfest; samningur staðfestur 06.05.2026 | starfandi — sjá mál #66 |
| 704 | Jaðarleiti (húsfélag, Eignaumsjón) | passar (lögheimili pósthólf umsjónarfélags) | **kt í skýrslu 2025: 611117-0109**; rétt er 611117-0190 (ásláttarvilla) | passar | í lagi | **listi ≠ skýrsla 2025**: listi 4 CO₂5, skýrsla (okt 2025) 3 CO₂5; LV 4 og slöngur 3 stemma. Skýrsla + reikningur R-107469 (30.10.2025) til en `last_year_inspected` = 2024 | netfang er reikningamóttaka umsjónarfélags; síðasti póstur 02.2023 | starfandi |
| 454 | Sléttuvegur 19-21-23 (húsfélag) | passar | passar (des 2025) | passar | handsett – ósnert | passar 37 LV + 36 slöngur; reikningur R-107649 | skráð, síðast í pósti 2021 | starfandi; skoðunarmánuður des — réttilega eftir |
| 121 | Egilsborg (Sólar) | kt = Egilsborg ehf. (lögheimili Hafnarfirði), staður Kleppsmýrarvegi 8 | passar (maí 2025); tvær skýrslur 2025 skráðar | til (cache) | bílskúrshurð, nærmynd — slök | passar 5 LV; reikningur R-106893 (05.2025) | staðfest (05.2024) | starfandi |
| 1618 | Endurvinnslan – Köllunarklettsvegur | á ekki við (5 staðir á kt) | passar (des 2025) | til; cache og myndpunktur víkja um ~150 m (ómælt hvor er réttur) | **bakdyr og ruslatunnur, skilti annars félags** | **listi ≠ skýrsla**: skýrsla 4 LV + 1 CO₂5 + 1 slanga; listi vantar CO₂5 | staðfest (annar tengiliður 2023) | starfandi |
| 579 | Fagkaup ehf. | passar (Klettagörðum 25) | **skýrsla annars staðar**: „Hagblikk ehf/Fagkaup, Smiðjuvegi 4c, 200 Kópavogi" (nóv 2024) | punktur og mynd eru á Klettagörðum — **rangur staður ef þjónustan er á Smiðjuvegi 4c** | hliðarveggur, slök | passar 1 LV + 2 CO₂5 (2024); reikningur R-107753 (26.01.2026, 5.200 kr) er ekki úttekt | staðfest | starfandi |
| 640 | Í réttum ramma | heimilisfang rangt sniðið („104 Skútuvogi 12f"); **Fyrirtækjaskrá: Lágmúla 5, 108** | passar (okt 2023); `report_facts` vísar á 2018-skrána en ber árið 2023 | til (Skútuvogur 12) | handsett – ósnert | passar 2 LV + 1 slanga (2023); ekkert síðan | skráð, síðast í pósti 02.2021 | félag skráð; **flutt? ómælt**; ekkert hjá okkur síðan 10.2023 |
| 712 | Leiguval ehf vegna (Kleppsmýrarvegur 8) | kt rétt; nafn raðar er stýft („vegna") | passar (jan 2024) | til | sama mynd og 121 | passar 6 LV + 4 duft 6 kg + 1 slanga (2024) | staðfest (01.2024) | starfandi; **sama heimilisfang og 121 — ekkert síðan 01.2024, ómælt hvort Sólar tók við** |
| 1737 | einstaklingur, Langholtsvegi 48 | einstaklingur (engin fyrirtækjaskrá) | engin skýrsla | til | engin mynd | 1 LV; reikningur R-106327 (02.2025) | ekkert netfang | **á einstaklingur með eitt tæki heima á þjónustulistanum? Agnars** |
| 1557 | röð með mannsnafni, Tranavogur 5 | **nafn annað: kt er Julla ehf.** (Tranavogi 5) | engin skýrsla | til | í lagi (húsið frá götu) | 1 duft 6 kg; reikningur R-107060 (07.2025) | staðfest (07.2026) | starfandi |

## Lota 4 — 10 félög (11.11.2026, ekkert skrifað í gögn félaga)
**Síðasta félag: 425. Næst: sæti 36 í röðinni (póstnúmer, nafn) — offset 35 í SQL-ígildi síunnar.**

| id | Félag | A | B | C | D | E | F | G |
|---|---|---|---|---|---|---|---|---|
| 122 | Skúlason & Jónsson ehf | nafn passar; lögheimili Lundi 8-12 Kópavogi, staður Skútuvogi 6 (skýrsla + skilti á mynd) | passar (maí 2024) | til | í lagi (húsið með skilti) | passar 2 LV; engin skoðun 2025, ekkert síðan 06.2024 | netfang skráð en sést hvergi í pósti | starfandi |
| 901 | AFL Starfsgreinafélag | kt rétt; lögheimili Reyðarfirði, staður Stakkholt 3 | passar (apríl 2024) | til | hlið fjölbýlis, enginn inngangur — tæp | passar 25 LV (2024); reikningur 04.2025 en engin skýrsla 2025 | **ekkert netfang** | **á máli #1593** (farið 2026, tæki á verkstæði, enginn reikningur) |
| 1627 | Center Hótel – Þverholt 14 | á ekki við (11 staðir á kt) | engin skýrsla frá okkur (skjalaröð 15.02.2026 án skráar = skoðun Öryggismiðstöðvarinnar) | til | í lagi (inngangur, húsnúmer 14) | engin tæki skráð | staðfest (10.2026) | starfandi; **nóta: fyrsta skoðun okkar er feb. 2027 — stendur samt á „Eftir 2026"** |
| 490 | Downtown Reykjavík Apartments | kt = DRA ehf., heimilisfang passar | passar (okt 2025) | til | handsett – ósnert | passar 33 LV + 1 slanga; reikningur R-107518 | netfang skráð en sést ekki í pósti | starfandi |
| 476 | Fræðslumiðstöð atvinnulífsins | passar | passar (mars 2025) | til | í lagi | passar 1 LV + 1 CO₂2 + 1 slanga; **skoðunarmánuður mars, ekki farið 2026** | netfang skráð en sést ekki í pósti | starfandi |
| 446 | Hamrahlíð 21 (húsfélag 21–25) | nafn passar; **heimilisfang raðar er „- 25 105 Reykjavík"** (ætti Hamrahlíð 21–25) | passar (des 2025) | **enginn** (heimilisfang ógilt) | loftmynd | passar 8 LV + 14 reykskynjarar; reikn. 107650 greiddur með millifærslu 30.12.2025 skv. kúnna | staðfest (01.2026) | starfandi; skoðunarmánuður des — réttilega eftir |
| 1487 | Heimaleiga – Bríetartún 9-11 (húsfélag, sameign) | á ekki við (Heimaleiga); kt raðar = húsfélagið | **önnur kt í skýrslu: 510117-0690 (Heimaleiga)** — sameignarskýrslan (okt 2025) | cache-heiti vísar á annað (hárgreiðslustofa) — ómælt | handsett – ósnert | passar 4 LV + 4 slöngur; reikn. R-107527 á Heimaleigu | reikningamóttaka umsjónarfélags | starfandi |
| 443 | Heimaleiga – Bríetartún 9-11 (íbúðir) | á ekki við; kt raðar = Heimaleiga | **önnur kt í skýrslu: 540119-0660 (húsfélagið)** — íbúðaskýrslan (des 2025). **Kt eru víxlaðar milli skýrslnanna tveggja** | til | skjámynd úr Google Maps — ekki skoðuð í lotunni | passar 48 LV, en tækin bera stöðuna „Í lagi" (ekki `active`); reikningurinn 193.600 fór þrisvar milli greiðenda og var loks greiddur af Heimaleigu 08.04.2026 | staðfest (11.2026) | starfandi; mál #1329 |
| 424 | Húsfélagið Stigahlíð 10 (Eignarekstur) | passar (lögheimili hjá umsjónarfélagi) | passar (nóv 2025) | ekkert í cache | í lagi (inngangur, húsnúmer 10) | passar 3 LV + 6 reykskynjarar | reikningamóttaka umsjónarfélags; síðast 12.2023 | starfandi |
| 425 | Húsfélagið Stigahlíð 26 (Eignaumsjón) | passar | passar (nóv 2025); `report_facts` vísar á Drive-skrá sem finnst ekki, rétta skráin er til | ekkert í cache | nærmynd af inngangi, ekkert húsnúmer | passar 4 LV + 6 reykskynjarar | reikningamóttaka umsjónarfélags; síðast 12.2025 | starfandi |

## Lota 5 — 10 félög (11.11.2026, ekkert skrifað í gögn félaga)
**Síðasta félag: 395. Næst: sæti 46 í röðinni (póstnúmer, nafn) — offset 45 í SQL-ígildi síunnar.**

| id | Félag | A | B | C | D | E | F | G |
|---|---|---|---|---|---|---|---|---|
| 1524 | NR5 ehf | nafn passar; **heimilisfang „Lautargata 5, 105 Reykjavík" — geokóðun lendir á Lautargötu 5 í Urriðaholti, Garðabæ** (lögheimili Holtsvegi 55, 210) | engin skýrsla | punktur í Garðabæ, póstnúmer raðar 105 | handsett – ósnert | **LEIÐRÉTT 11.11:** R-108161 (14.04.2026) er BÚÐARSALA, ekki úttekt — línur: 3 ný Léttvatn 6 L + 1 nýtt CO₂ 5 kg, hvorki Akstur né Skýrslugerð; `last_insp` 14.04 á tækjunum er reikningsdagurinn (tæki stofnuð 01.09 upp úr reikningi). Fyrsta úttekt ógerð; nóta nefnir „um 16 tæki", enginn tækjalisti | netfang skráð; tilboð sent 09.04.2026 | starfandi; **á máli #805** (nýr samningur 2026, fyrsta úttekt) |
| 399 | Samhengi endurskoðun | kt = Samhengi ehf.; lögheimili Stigahlíð 62, staður Skipholti 50d | passar (ágúst 2025) | til | engin mynd | passar 2 LV + 1 slanga | netfang skráð | **nóta: „þessir hættir, tannlæknastofa kom í staðinn" — á máli #1505** |
| 1265 | röð með mannsnafni og persónukt, Háteigsvegur 3 | **nafn og kt annað: skýrslan, tækin og reikningarnir tilheyra Húsfélaginu Háteigsvegi 3 (kt 461009-1660), sem á sína eigin röð #422 í þjónustu** | **önnur kt í skýrslu: 461009-1660** (nóv 2025) | til | bakhlið og bílastæði — tæp | 5 LV + 4 reykskynjarar = skýrsla húsfélagsins; reikningar 106149 og 107569 eru á kt húsfélagsins | póstur um húsfélagið fer um umsjónarfélag (12.2025) | **tvítak af #422 — ákvörðun Agnars** |
| 642 | húsf. Boðagrandi 1 | passar; heimilisfang rangt sniðið („107 Boðagrandi 1") | passar (des 2024) | til | loftmynd | passar 3 LV (2024); **reikningur 107690 (30.12.2025, greiddur; línur: Yfirferð 3 LV + Skýrslugerð + Akstur = úttekt) en skýrslu 2025 vantar** og síðasta skoðunarár er óskráð | ekkert netfang; síðasti póstur 2018 | starfandi |
| 403 | Húsfélagið Keilugranda 10 | passar | passar (sept 2025) | til | í lagi (húsið frá götu) | passar 3 LV + 3 reykskynjarar; skoðunarmánuður sept, ekki farið 2026 | **ekkert netfang** | starfandi |
| 480 | Alta ehf | passar (ritvilla „Reykkjavík" í heimilisfangi og í skýrslu) | passar (apríl 2025) | cache-heiti segir „Síminn Ármúla 25" — ómælt hvort punkturinn er á nr. 32 | í lagi (framhlið) | passar 2 LV; skoðunarmánuður apríl, ekki farið 2026 | netfang skráð, sést ekki í pósti | starfandi |
| 1111 | Félag skipstjórnarmanna | passar (skrifstofa Grensásvegi 13) | **skýrsla annars staðar: „Bústaðir Laugarvatni"** (maí 2023), engin kt í skýrslu | punktur og mynd eru á skrifstofunni, **ekki á þjónustustaðnum** | bakhlið/bílastæði á röngum stað | passar 4 LV + 19 reykskynjarar + 4 teppi (2023); ekkert síðan 06.2023 | ekkert netfang; síðasti póstur 02.2023 | félag skráð; ekkert hjá okkur í tvö og hálft ár |
| 1112 | Grant Thornton | passar | passar (des 2024) | til | **innimynd** | passar 2 LV + 2 CO₂2; engin skoðun 2025 | ekkert netfang | starfandi |
| 778 | Háaleitisbraut 54, húsfélag (Fjöleignir) | passar (lögheimili pósthólf umsjónarfélags) | passar (des 2023); skýrsluskrárnar báðar merktar tvítök | til | í lagi (inngangur og hús) | passar 5 LV + 7 reykskynjarar; ekkert síðan 12.2023 | umsjónarfélag; samningspóstur 05.2024 | starfandi |
| 395 | Hegri fjárfestingar ehf (viðbót lotu 6: reikningur 107682, 30.12.2025, ber 5 LV + 1 CO₂2 + 1 slöngu — sömu tölur og `report_facts` des 2025) | kt rétt; lögheimili Hegranesi 26 Garðabæ, staður Ármúli 34; **nóta: „fluttir"** | passar (ágúst 2025, „vegna Ármúli 34") | til | loftmynd | listi 4 LV = skýrsla ágúst 2025; **`report_facts` segir des 2025, 5 LV + 1 CO₂2 + 1 slanga + 3 reykskynjarar — stemmir ekki við skrána sem það vísar á** (þrír reikningar 2025; skýrsla fyrir Nýbýlaveg 4-8 send sama dag) | staðfest (09.2025) | starfandi; flutt? ómælt |

## Lota 6 — 10 félög (11.11.2026, ekkert skrifað í gögn félaga)
**Síðasta félag: 830. Næst: sæti 56 í röðinni (póstnúmer, nafn) — `rn between 56 and 65` í SQL-ígildi síunnar.**
Ný regla notuð (Agnar 11.11): reikningur er úttekt aðeins með Akstur eða Skýrslugerð; annars búðarsala.
Línur lesnar úr `reikningslinur` (Stólpi) og `solur.linur` (`desc`, `qty`).

| id | Félag | A | B | C | D | E | F | G |
|---|---|---|---|---|---|---|---|---|
| 269 | Heimaleiga – Höfuðstöðvar | á ekki við (8 staðir á kt); röðin segir Grensásvegur 7 (nóta: nýflutt af nr. 14, 3. hæð, 3 tæki), Fyrirtækjaskrá enn nr. 14 | kt ekki í skýrslu; skýrslan (ágúst 2025) er fyrir **Grensásveg 14** — gamla staðinn | ekkert í cache | handsett – ósnert | listi = skýrsla 2025 (3 LV + 1 CO₂5 + 2 slöngur) en **nótan segir 3 tæki á nýja staðnum**; slöngurnar á máli #1344. „Síðasta skoðun 2026-febrúar" í athugasemd er röng: reikningur 107909 (26.02.2026) er „vegna húsnæðis Laugavegur 42" og skráður á #835 | staðfest (fundur 28.10.2026) | starfandi; engin skoðun 2026 á höfuðstöðvum |
| 1890 | Istanbul Market ehf. | passar | engin úttektarskýrsla (brunakerfiskúnni) | til | nærmynd af inngangi, skilti sést varla — tæp | engin slökkvitæki skráð; R-001219 (26.10.2026) er brunakerfisskoðun með skýrslu og akstri, `document_pairs` brunakerfi 2026 klárað | staðfest (02.11.2026, samningur í vinnslu) | starfandi; **stendur á „Eftir 2026" þótt eina þjónustan (brunakerfi) sé búin** |
| 1623 | Stálskip ehf. | passar | engin skýrsla | cache segir „16X" | **léleg** (bílastæði og skúr, húsið í fjarska) | 1 LV + 3 reykskynjarar; **R-000573 (17.07.2026) er BÚÐARSALA** (1 hleðsla + 3 nýir reykskynjarar, hvorki akstur né skýrsla) — `document_pairs` segir samt „úttekt 2026, vantar skýrslu" | ekkert netfang, enginn póstur | starfandi; aldrei skoðað á staðnum |
| 365 | Tunguvegur 19 | **nafn er heimilisfang; kt er Óm íbúðir ehf.** (lögheimili Hlyngerði 4) | passar (maí 2025) | cache tómt | handsett – ósnert | listi = skýrsla (7 LV + 1 CO₂5 + 1 duft 2 kg); **reikningur 106879 ber 6 hleðslur LV + 2 hleðslur duft 6–12 kg** — tegund víkur frá skýrslu | **ekkert netfang**; nóta: eigandi sjaldan við, vantar símanúmer | starfandi; skoðunarmánuður maí, ekki farið 2026 |
| 1138 | Þorsteinn Bergmann | passar (Þorsteinn Bergmann ehf, Akurgerði 23) | **önnur kt í skýrslu: 520402-4031**; rétt er 520402-4030 (ásláttarvilla, skýrsla okt 2023). Skýrslan segir „102 Rvk" — annað en lögheimilið | til (Akurgerði 23) | **léleg** (veggur og gluggar) | listi 1 LV (2023); **R-000582 (20.07.2026) er BÚÐARSALA**: 2 ný LV + 2 teppi, ekki á lista | ekkert netfang | starfandi; engin úttekt síðan 10.2023; **hvar eru tækin (102 eða 108)? ómælt** |
| 166 | Húsfélag Dvergabakki 32 | passar | passar (júní 2024) | til | hlið blokkar, enginn inngangur — tæp | passar 3 LV + 5 reykskynjarar; reikningur 105356 (06.2024, úttekt, greiddur) | netfang skráð; síðasti póstur 2020 | **nóta: „líklegast komin úr þjónustu, fékk ekki reikning og fór í Mótus" — ákvörðun Agnars**; ekkert síðan 06.2024 |
| 417 | Húsfélagið Dalsel 12 (Eignaumsjón) | passar (lögheimili pósthólf umsjónarfélags) | passar (nóv 2025) | til | **léleg** (steyptur veggur og handrið, húsið sést ekki) | passar 4 LV + 6 reykskynjarar; R-107600 úttekt greidd — `document_pairs` 2025 segir samt „vantar reikning" | reikningamóttaka umsjónarfélags (07.2026) | starfandi; skoðunarmánuður nóv — kominn tími |
| 453 | Seljabraut 42 (Eignaumsjón) | passar | passar (des 2025); **báðar skýrsluskrár 2025 merktar tvítök** | cache tómt | í lagi (húsið frá götu, nr. 42 sést) | passar 3 LV + 3 reykskynjarar; **R-000178 (22.05.2026) er BÚÐARSALA**: 2 duft 2 kg, ekki á lista | reikningamóttaka umsjónarfélags | starfandi; skoðunarmánuður des — réttilega eftir |
| 479 | Þjóðdansafélag Reykjavíkur | passar | passar (mars 2025) | til | inngangur 14a milli tveggja verslana — nothæf | passar 1 LV + 1 slanga; reikningur 106489 úttekt | staðfest (skýrsla send 20.03.2025) | starfandi; skoðunarmánuður mars, nóta „enginn á staðnum / sumarfrí — taka upp í haust" |
| 830 | Eignarekstur ehf. (Heiðarási 22) | nafn passar; **lögheimili Krókhálsi 5A**, röðin á Heiðarási 22 (íbúðarhús á mynd) | engin skýrsla | til | í lagi sem mynd (hús nr. 22) | listi 3 LV + 1 slanga; **eini reikningurinn (106991, 163.097 kr) var kreditfærður að fullu sama dag (107073)** | netfang umsjónarfélags, virkt (10.2026, um önnur hús) | **nóta: „Ekki í þjónustu. Vitleysa" — stendur samt á listanum; ákvörðun Agnars** |

## Lota 7 — 10 félög (11.11.2026, ekkert skrifað í gögn félaga)
**Síðasta félag: 435. Næst: sæti 66 í röðinni (póstnúmer, nafn) — `rn between 66 and 75` í SQL-ígildi síunnar.**

| id | Félag | A | B | C | D | E | F | G |
|---|---|---|---|---|---|---|---|---|
| 447 | Heimilisiðnaðarfélag Íslands | passar | passar (des 2025) | til (cache: Nethylur 2) | nærmynd af inngangi, skilti annars félags — tæp (sama mynd og 717 og 721) | listi = skýrsla (3 LV + 1 CO₂5), reikningur 107599 úttekt; **R-000166 (21.05.2026) er BÚÐARSALA: 10 hleðslur á dufti 2 kg — þau 10 tæki eru hvorki á lista né í skýrslu** | staðfest (05.2024) | starfandi; skoðunarmánuður des — réttilega eftir |
| 420 | Húsfélagið Hraunbæ 36 | passar | passar (nóv 2025) | til | í lagi (blokkin frá götu) | passar 3 LV + 4 reykskynjarar; reikningur 107572 úttekt | netfang skráð; síðasti póstur 12.2023 | starfandi; skoðunarmánuður nóv — kominn tími |
| 431 | Iðufell (húsfélag Iðufelli 4) | nafn stýft; **póstnúmer raðar 110, Fyrirtækjaskrá 111** (skýrslan segir líka 110) | passar (nóv 2025) | til (Efra-Breiðholt) | loftmynd | passar 5 LV + 5 reykskynjarar; reikningur 107564 úttekt | netfang skráð; síðasti póstur 10.2023 | starfandi; nóv — kominn tími |
| 434 | Kríuhólar 2 (Eignaumsjón) | passar; **póstnúmer raðar 110** (Hólahverfi er 111 — ekki mælt í skrá, cache tómt) | passar (nóv 2025) | ekkert í cache | loftmynd | listi = skýrsla (9 LV + 8 reykskynjarar + 1 slanga); **reikningur 107560 rukkar 9 reykskynjara**; reikningur 107877 (18.02.2026, 16.819 kr, opinn við yfirtöku) — línur og skjal finnast ekki | reikningamóttaka umsjónarfélags (07.2026) | starfandi; nóv — kominn tími |
| 717 | Lögmenn Árbæ | passar (Lögmenn Árbæ slf) | passar (des 2024) | til | sama mynd og 447 — tæp | passar 1 LV; **reikningur 107598 (09.12.2025: yfirferð + akstur = úttekt) en skýrslu 2025 vantar**; síðasta skoðunarár skráð 2024 | **ekkert netfang** | starfandi; des — réttilega eftir |
| 544 | Martex-Batik ehf | passar | **kt í skýrslu stýfð: „66707-1740"** (rétt 660707-1740), des 2025 | til | í lagi (allt húsið, skilti) | passar 8 LV (8 `urelt` tvítök teljast ekki); reikningur 107651 úttekt | netfang skráð, sést ekki í pósti; póstur 01.2024 um „Batik ehf." á annarri kt | starfandi; des — réttilega eftir |
| 1414 | Míla | passar (Míla hf.) | ómælt — á máli | til | í lagi (húsið frá bílastæði) | 3 LV + 4 slöngur (talin afrit af tækjum annars húsfélags) | ekkert netfang | **á máli #1584** (taka úr þjónustu); nóta „fluttir eitthvað" |
| 721 | Nethylur ehf | kt rétt; lögheimili Gylfaflöt 22, staður „Nethyl 2 sameign 2. hæð" | passar (des 2024) | til | sama mynd og 447 — tæp | **engin tæki á lista** (skýrsla 2024: 2 LV + 2 CO₂2); reikningur 106115 kreditfærður (106904) | ekkert netfang | **innheimtupóstur 04.02.2025: greiðandi kannast ekki við kröfuna, „kominn nýr eigandi að eigninni"; krafan felld niður 04.06.2025 — ákvörðun Agnars** (`document_pairs` segir samt 2025 klárað) |
| 728 | Renniverkstæði Ægirs | nafn: Fyrirtækjaskrá „Ægis" | passar (nóv 2024) | til | húsið frá götu en **skilti annars félags** — ómælt hvort þetta er nr. 11 | passar 3 duft 6 kg (2024); reikningur 105990 (11.2024), línur vantar; **ekkert 2025** | **ekkert netfang, enginn póstur** | félag skráð; ekkert hjá okkur síðan 11.2024 |
| 435 | Reykás 31 (húsfélag) | passar | passar (nóv 2025) | til | í lagi (húsið frá götu) | listi 3 LV; **reykskynjarar: skýrslutextinn og reikningur 107561 nefna 3 yfirfarna reykskynjara en fjöldareitur skýrslunnar er „x" og þeir eru ekki á lista** | **ekkert netfang** | starfandi; nóv — kominn tími |

### Leiðrétt 11.11.2026 (Agnar: „já") — póstnúmer
431 „Iðufell 4, 110 Reykjavík" → 111 (Fyrirtækjaskrá) · 434 „Kríuhólar 2, 110 Reykjavík" → 111 (Hólahverfi; ekki mælt í skrá).
Afrit í `backup_20261111_sannreyna_heimilisfang`, lína í `review_note`, lesið til baka. **Röðin (póstnúmer, nafn) hliðrast
við þetta: 431 og 434 færast aftur í 111-hópinn. Sæti frá og með 69 eru óbreytt, en næsta lota á að sleppa hverju id
sem er þegar í þessu skjali, ekki treysta sætisnúmerinu einu.**

## Lota 8 — 10 félög (11.11.2026)
**Síðasta félag: 1417. Næst: sæti 76 í röðinni (póstnúmer, nafn) — `rn between 76 and 85` í SQL-ígildi síunnar.**

| id | Félag | A | B | C | D | E | F | G |
|---|---|---|---|---|---|---|---|---|
| 669 | Húsfélag Blikhólar 2 (Eignaumsjón) | passar; **ritvilla í nafni og heimilisfangi: „Blikhólar"** (Fyrirtækjaskrá: Blikahólar 2) | passar (des 2024) | til (Blikahólar 2) | **RÖNG MYND: sýnir Breiðholtslaug** (`google-maps-skjamynd`) | passar 4 LV + 9 reykskynjarar (2024); reikningur 106152 (12.2024), línur vantar; **engin skoðun 2025** | reikningamóttaka umsjónarfélags (07.2026) | starfandi; skoðunarmánuður des |
| 433 | Húsfélagið Krummahólar 4 | passar | passar (nóv 2025) | cache tómt | í lagi (blokkin, bílskúr fremst) | passar 9 LV + 15 reykskynjarar; reikningur 107566 úttekt | staðfest (þjónustusamningur 14.01.2026; mál #236 opið) | starfandi; nóv — kominn tími |
| 649 | Húsfélagið Vesturberg 96 | passar; **heimilisfang rangt sniðið („111 Vesturberg 96")** | passar (des 2023) | til | loftmynd | listi 3 LV (2023); **reikningur 107081 (16.07.2025): 4 ný léttvatnstæki + akstur, engin yfirferð né skýrslugerð** — tækjalisti ekki uppfærður, engin skýrsla 2024 né 2025 | staðfest (tilboð 24.07.2025) | starfandi; des |
| 436 | Torfufell 50 | passar (lögheimili pósthólf umsjónarfélags) | passar (nóv 2025); skýrsluskrárnar merktar tvítök | cache tómt | í lagi (inngangur, nr. 50) | 4 LV + 3 reykskynjarar = skýrsla; **2 af 4 LV bera stöðuna `loaned` og nótan segir „2 tæki á verkstæði"** — ómælt síðan hvenær | reikningamóttaka umsjónarfélags | starfandi; nóv — kominn tími |
| 1735 | Eyesland Spönginni | **kt er Provision ehf.** (lögheimili Grandagarði 13); **heimilisfang án húsnúmers („Spönginni")** | engin skýrsla | cache: Borgarbókasafnið Spönginni | loftmynd | 1 LV; reikningur 106957 (16.06.2025: yfirferð + akstur = úttekt) án skýrslu; **nóta „Búið að fara (í maí)" — enginn reikningur né skýrsla 2026 finnst** | ekkert netfang, enginn póstur | starfandi |
| 784 | Flétturimi 10, húsfélag (Eignaumsjón) | passar | engin skýrsla í gögnum | til | bakhlið með sólpöllum — tæp | **öll tæki `urelt`** (11 LV + 2 slöngur, síðast 03.2023); síðasti reikningur 03.2022; **nóta „Búið að fara" — ekkert 2026 finnst** | reikningamóttaka umsjónarfélags | húsfélag skráð; ekkert hjá okkur síðan 2023 — **ákvörðun Agnars** |
| 451 | Nesskip | passar | passar (des 2025) | cache tómt | **léleg** (gluggaveggur, enginn inngangur) | passar 1 LV + 1 CO₂2; reikningur 107691 úttekt | netfang skráð, sést ekki í pósti | starfandi; des |
| 745 | Við sjóinn ehf (Vogar) | passar | passar (ágúst 2024); `report_facts` vísar á aðra Drive-skrá en skjalið | til | íbúðarhús bak við girðingu — ómælt hvort þetta er þjónustustaðurinn (tjaldsvæði) | passar 7 LV (2024); reikningur 105683 úttekt; **ekkert 2025** | netfang skráð, sést ekki í pósti | félag skráð; ekkert hjá okkur síðan 08.2024 |
| 444 | Eldum Rétt | passar | passar (des 2025) | til | **RÖNG MYND: sýnir BYKO** (`google-maps-skjamynd`) | passar 3 LV + 2 CO₂2 + 1 slanga; reikningur 107653 úttekt | netfang skráð, sést ekki í pósti | **á máli #1499** (skráð aftur í þjónustu, bóka desember) — nótan á röðinni segir enn „ekki lengur í þjónustu" |
| 1417 | Furugrund 72, húsfélag (Eignarekstur) | passar (lögheimili hjá umsjónarfélagi) | passar (des 2023) | til | inngangur **nr. 74** fremst á mynd — tæp | listi 3 LV (2023); **reikningur 107678 (30.12.2025) úttekt á 4 LV + 4 reykskynjurum, en skýrslu 2025 vantar** og listinn er óuppfærður | staðfest (10.2026); **á máli #1484** (bókari vantar reikninga) | starfandi; des |
