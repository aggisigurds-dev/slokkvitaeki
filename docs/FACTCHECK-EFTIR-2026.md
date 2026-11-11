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

## Lota 9 — 10 félög (11.11.2026, ekkert skrifað í gögn félaga)
**Síðasta félag: 1136. Næst: sæti 86 í röðinni (póstnúmer, nafn) — `rn between 86 and 95` í SQL-ígildi síunnar (sæti 85 = 1136).**

| id | Félag | A | B | C | D | E | F | G |
|---|---|---|---|---|---|---|---|---|
| 824 | Goddi ehf | passar | **kt í skýrslu 471497-2549**; rétt er 470497-2549 (ásláttarvilla, feb 2024) | til | í lagi (húsið, skilti) | passar 1 LV + 1 duft 6 kg (2024; tvö `urelt` tvítök); **nóta „Búið að fara" — enginn reikningur né skýrsla eftir 02.2024 finnst** | netfang skráð, sést ekki í pósti | starfandi |
| 409 | Hamborgarabúlla Tómasar, Dalvegi 18 | kt er HBT ehf. (lögheimili Hafnarfirði) | passar (sept 2025) | til | **engin mynd** (færsla án slóðar) | passar 3 LV + 1 CO₂2; reikningur 107388 úttekt | netfang skráð, sést ekki í pósti | **nóta „farnir yfir til Öryggismiðstöðvarinnar" en mál #1502 segir „skráð í þjónustu, bóka skoðun" — stangast á** |
| 448 | Hótel Kríunes | kt Kríunes ehf; **heimilisfang „Elliðavatn" er ekki staðfang** (Fyrirtækjaskrá: Kríunesi v/Vatnsenda) | passar (des 2025) | **enginn** | engin mynd | listi = skýrsla (14 LV + 2 CO₂2 + 3 duft 6 kg + 5 slöngur); **reikningur 107593 rukkar 6 slöngur og ekkert duft** | staðfest (skýrsla send 11.09.2026) | starfandi; des |
| 700 | Húsastóll Lux.apartments | kt Húsastóll ehf. (lögheimili Garðabæ), staður Dalbrekku 18 | passar (des 2024; ekki komist í íbúðir 101 og 106) | cache: **Dalbrekka 17** | **RÖNG MYND: sýnir dekkjaverkstæði** (`google-maps-skjamynd`) | passar 6 LV (2024); **engin skoðun 2025**; nóta „bóka tíma" | netfang skráð; síðasti póstur 2021 | starfandi |
| 205 | Húsfélag Hlíðasmára 17 | passar; **póstnúmer raðar 200, Fyrirtækjaskrá 201** | engin slökkvitækjaskýrsla | til | engin mynd | engin tæki; reikningur 107308 (09.2025) er ársskoðun brunakerfis | póstur 09.2026 um úttekt á brunakerfi | **brunakerfiskúnni, ekki slökkvitæki (nótan segir það); á máli #1446** |
| 709 | Húsfélag Karhólma 8 | kt rétt (Kjarrhólmi 8, húsfélag); **ritvilla í nafni**. **Önnur röð, #866, heitir líka „Kjarrhólmi 8, húsfélag" en ber kt 470576-2949 sem er Kjarrhólmi 4 í Fyrirtækjaskrá** | passar (nóv 2024; skýrslan skrifar líka „Karhólma") | til | í lagi (inngangur og blokk) | passar 2 LV (2024); **nóta „Búið að fara (í júní)": úttektin 29.06.2026 (R-000445, 2 duft 6 kg) er skráð á #866 / kt Kjarrhólma 4 — ómælt í hvoru húsinu tækin eru** | **netfang raðar tilheyrir tengilið Kjarrhólma 14** (annað húsfélag) | starfandi |
| 190 | Húsfélagið Hlíðasmára 19 | passar; **póstnúmer 200 á móti 201** | engin slökkvitækjaskýrsla | til | handsett – ósnert | engin tæki; `document_pairs` brunakerfi 2025 og 2026 „vantar reikning" | staðfest (05.2026, myndir af brunastöðvum) | brunakerfiskúnni; nóta „Hringja og athuga" |
| 440 | Húsfélagið Vallarbraut 5 | **rangur bær: röðin segir 200 Kópavogur; Fyrirtækjaskrá, skýrsla og geokóðun segja 220 Hafnarfjörður** | passar (des 2025) | til (Hafnarfjörður) | engin mynd | passar 3 LV; reikningur 107596 úttekt | netfang skráð; aðeins auglýsingapóstur finnst á því | starfandi; des |
| 441 | Húsfélagið Vallarbraut 7 | **rangur bær: 200 Kópavogur → 220 Hafnarfjörður** (sömu heimildir) | passar (des 2025) | til (Hafnarfjörður) | engin mynd | passar 2 LV; reikningur 107597 úttekt | sama netfang og 440 | starfandi; des; tvö óskyld auglýsingamál (#375, #420) hanga á röðinni |
| 1136 | Ískraft | **kt raðar er félag afskráð 21.09.2000** | **skýrsla annars staðar: „Húsasmiðjan ehf (v/Ískraft), Eyravegi 42, 800 Selfossi"** (feb 2023), engin kt | punktur á Smiðjuvegi 5 — rangur staður ef þjónustan er á Selfossi | bílskúrshurð — léleg | 2 LV (2023); ekkert síðan | ekkert netfang | **röng kt og rangur staður; ekkert hjá okkur síðan 02.2023 — ákvörðun Agnars** |

### Aukafundur lotu 9 — Kjarrhólmi 14 (#774, ekki á listanum)
Póstur frá tengilið húsfélagsins 25.08.2026: „7 samtengjanlegir reykskynjarar, 2 léttvatnsslökkvitæki (við skiptum út
dufttækjunum sem voru fyrir) og 1 lítið kolsýrutæki" — biður um reikning og árlegt eftirlit frá júní–júlí 2027.
R-000892 (07.09.2026, 71.227 kr) og skýrslan (maí 2026) bera aðeins 7 reykskynjara + vinnu + skýrslugerð + akstur;
tækjaskráin sömuleiðis. **Léttvatnstækin tvö og kolsýrutækið finnast hvorki á reikningi, skýrslu né lista.**

## Leiðrétt 11.11.2026 — Vallarbraut 5 og 7 í 220 Hafnarfjörð

Agnar samþykkti. Raðir 440 og 441: „200 Kópavogur“ → „220 Hafnarfjörður“, póstnúmer 220. Afrit í
`backup_20261111_sannreyna_heimilisfang`, review_note á báðum röðum, lesið til baka (220 á báðum, sían enn 168).

Röðin hliðraðist um tvö sæti: 1136 er nú sæti 83, og 440/441 eru í sætum 127 og 128 (þegar yfirfarin, sleppa þeim þar).
**Næsta lota: `rn between 84 and 93`** (id 1373, 1123, 718, 1531, 468, 452, 478, 729, 743, 1106).

## Leiðrétt 11.11.2026 — Hótel Kríunes (448) á Kríunesveg 12

Agnar gaf heimilisfangið: Kríunesvegur 12, Vatnsenda, við Elliðavatn í Kópavogi. Röð 448: „Elliðavatn 200 Kópavogur“ →
„Kríunesvegur 12, 203 Kópavogur“, póstnúmer 203 (úr OpenStreetMap; Fyrirtækjaskrá skráir lögheimilið í 200). Afrit í
`backup_20261111_sannreyna_heimilisfang`, review_note á röðinni, lesið til baka, sían enn 168. Punktur og húsmynd enn ósett.

Röðin hliðraðist um eitt sæti í viðbót: 448 er nú sæti 105 (þegar yfirfarið, sleppa).
**Næsta lota: `rn between 83 and 92`** (id 1373, 1123, 718, 1531, 468, 452, 478, 729, 743, 1106).

## Lota 10 — sæti 83–92 (11.11.2026)

| id | Félag | A kt↔nafn↔hf | B skýrsla | C/D punktur og mynd | E tæki | F/G póstur og staða | Frávik |
|---|---|---|---|---|---|---|---|
| 1373 | Kjarrhólmi 34 | PASSAR (húsfélag) | Nýjasta skýrsla 2023, kt rétt. **SKÝRSLU 2025 VANTAR** (úttektarreikn. 107688, 30.12.2025, með skýrslugerð og akstri) | Punktur réttur, götumynd í lagi | Listi 3 LV + 5 RS; reikn. 2025: 3 LV + 4 RS | Ekkert netfang, enginn póstur. Starfandi. Engin úttekt 2024 | Skýrsla 2025 vantar; RS 5/4 |
| 1123 | Landmótun | PASSAR | Skýrsla des. 2023, kt rétt | Punktur réttur, götumynd Hamraborg 12 | Listi = skýrsla (2 LV + 2 CO₂). Búðarsala R-000563 (16.07.2026): 1 duft 6 kg + 1 LV nýtt, ekki á lista | Ekkert netfang. Engin úttekt 2024 né 2025. Reikn. 104581 (04.01.2024, 21.385 kr.) „opið við yfirtöku“ | Tvö ár án skoðunar; ný tæki ekki á lista; opinn reikn. frá yfirtöku |
| 718 | Marpól | Nafn og kt rétt; lögheimili í Fyrirtækjaskrá er Garðatorg 2b, 210 | Skýrsla des. 2024, kt rétt | Punktur réttur; götumynd sýnir Marpól-skiltið | Listi = skýrsla (6 LV) | Netfang skráð, síðasti póstur 2021. Engin úttekt 2025 | 2025 sleppt |
| 1531 | Menja ehf. | PASSAR | Engin skýrsla í report_facts. Reikn. 106990 (24.06.2025) er úttekt | Handsett mynd, ÓSNERT | Listi 7 LV + 2 CO₂; reikn. 2025 ber 5 LV + 2 CO₂. R-000831 (27.08.2026): yfirferð 1 duft 2 kg + 1 LV, án aksturs og skýrslu = verkstæðisþjónusta, ekki úttekt | Netfang staðfest (33 póstar, síðast 27.08.2026). document_pairs segir „2026 vantar skýrslu“ | Listi ≠ reikn.; duft 2 kg ekki á lista; 2026 ranglega talið úttekt |
| 468 | Nýbýlavegur 4-8 ehf | Nafn og kt rétt; lögheimili Hegranes 26, 210 (stendur líka í skýrslu). Staðurinn er Nýbýlavegur 4, 6 og 8 | Skýrsla feb. 2025, kt rétt | Punktur réttur, götumynd Nýbýlavegur 4 | Listi = skýrsla (17 LV, 5 duft 2 kg, 5 teppi) | Netfang staðfest. Skoðunarmánuður skráður 11, skýrslan segir febrúar. Engin úttekt 2026. Mál #1465 opið. document_pairs „2025 vantar reikning“ þótt 106416 sé til | Mánuður 11 ≠ febrúar; 2026 ógert; pörun röng |
| 452 | Nýja Kökuhúsið | PASSAR | Skýrsla des. 2025, kt rétt | Punktur réttur; götumynd sýnir fjölbýlishlið, skilti sést ekki (ÓMÆLT hvort rétt hlið) | Listi = skýrsla = reikn. (1 LV + 2 CO₂) | Netfang staðfest (2024). Starfandi, á tíma í desember | Ekkert |
| 478 | Púst hjá Einari | Nafn og kt rétt; heimilisfangið „Smiðjuvegi“ án númers. Skiltið á myndinni segir Smiðjuvegi 50; lögheimili Sunnusmári 12, 201 | Skýrsla mars 2025, kt rétt | **RANGUR PUNKTUR**: geokóðun lendir á Smiðjuvegi 76. Myndin (Maps-skjámynd) er rétt | Listi = skýrsla (1 LV + 2 duft 6 kg); reikn. 106580 rukkar „Yfirferð Duft 2 kg“ ×2 | Netfang skráð, sést hvergi í pósti. Mál #973 opið (merkt tekið út 2026, engin heimsókn sést) | Húsnúmer vantar; punktur rangur; reikn. tegund ≠ skýrsla |
| 729 | RENTUR starfsemi ehf | PASSAR (lögheimili Þinghólsbraut 3) | Skýrsla des. 2024, kt rétt, en **TÆKIN ERU ANNARS STAÐAR**: íbúðir í Drangsskarði 11b og Hádegisskarði 20, 221 Hafnarfirði | Punktur og mynd sýna íbúðarhús á Þinghólsbraut, ekki staðina þar sem tækin eru | Listi = skýrsla (3 LV). R-000645 (28.07.2026): 2 hleðslur + 1 nýtt LV, án aksturs = búðarsala | Netfang staðfest (19 póstar). Engin úttekt 2025 | Röðin bendir á skrifstofu, ekki tækjastað; 2025 sleppt |
| 743 | Terma ehf | Nafn og kt rétt; lögheimili Dverghamrar 38, 112 | Skýrsla nóv. 2024, kt rétt. Athugasemd: brunaslanga lekur í slönguhjóli, þarf lagfæringu | Punktur réttur, götumynd iðnaðarhús | Listi = skýrsla (4 LV, 1 duft 2 kg, 1 slanga) | Netfang staðfest (2023). Engin úttekt 2025. ÓMÆLT hvort slangan var löguð | 2025 sleppt; slönguathugasemd opin |
| 1106 | Búllan Dalvegi | Kt 700305-0660 = Hamborgarabúllan ehf., lögheimili Kringlan. Röðin er á Dalvegi 16a, 201 | **ÖNNUR KT Í SKÝRSLU**: skýrslan 2025 á röðinni er fyrir Hamborgarabúllu Tómasar, Dalvegi 18, kt röð 409 | Punktur Dalvegur 16A; Maps-skjámynd sýnir Búlluna (rétt) | Listi = skýrslan (3 LV + 1 CO₂), sömu 4 tæki og mál #1502 nefnir á 409 | Netfang skráð, sést hvergi í pósti. Nóta: „hættir í þjónustu“. Engir reikningar á þessa kt síðan 2023 (báðir kreditfærðir). Mál #1503 opið | Líklegt tvítak við 409: sami staður, sama skýrsla, tvær kt |

Húsmyndir skoðaðar: 1373, 1123, 718, 468, 452, 729, 743 (götumyndir), 478 og 1106 (Maps-skjámyndir, báðar réttar). 1531 er handsett og ósnert.

**Staða: 95 af 168 yfirfarin, 82 með frávik. Síðasta félag: 1106. Næst: `rn between 93 and 102`** (sæti 92 = 1106; sleppa 448, 440 og 441 aftar á listanum).

## Lagfært 11.11.2026 — sex afturkræfar leiðréttingar með sönnun

Agnar: „eitthvað sem þú getur lagfært“. Aðeins það sem heimild sannar og hægt er að bakka. Afrit af röðunum í
`backup_20261111_sannreyna_heimilisfang`, review_note á hverri röð, allt lesið til baka, sían enn 168.

| id | Félag | Var | Er nú | Heimild |
|---|---|---|---|---|
| 478 | Púst hjá Einari | „Smiðjuvegi 200 Kópavogi“ | „Smiðjuvegi 50, 200 Kópavogi“ | Skilti og húsnúmer á húsmynd félagsins |
| 205 | Húsfélag Hlíðasmára 17 | póstnr. 200 | 201 | Fyrirtækjaskrá |
| 190 | Húsfélagið Hlíðasmára 19 | póstnr. 200 | 201 | Fyrirtækjaskrá |
| 709 | Húsfélag Kjarrhólma 8 | nafn „Húsfélag Karhólma 8“ | „Húsfélag Kjarrhólma 8“ | Fyrirtækjaskrá og heimilisfang raðarinnar |
| 468 | Nýbýlavegur 4-8 ehf | skoðunarmánuður 11 | 2 (febrúar) | Skýrsla feb. 2025, last_skodun, reikn. R-106416 |
| 468 | Nýbýlavegur 4-8 ehf | document_pairs #809 „vantar_reikning“ | „klarad“, reikningsskjal #2836 tengt | R-106416 (03.03.2025) er úttekt með skýrslugerð og akstri |

Ekki lagfært (þarf ákvörðun eða gögn sem vantar): tvítak 1106/409, RENTUR tækjastaður, Menja 2026-parið (verkstæðisþjónusta talin úttekt),
rangar húsmyndir 669/444/700, Kjarrhólmi 8 og #866, Ískraft, netfangið á 709.

Röðin hliðraðist (205 og 190 fóru í 201). **Næsta lota, tíu óyfirfarin í röð: id 410, 1734, 601, 188, 833, 385, 1396, 1397, 212, 1135**
(sæti 91–102 að frátöldum 205 og 190). Alltaf sleppa id sem eru þegar í skjalinu.

## Lota 11 — tíu félög í 201–203 (11.11.2026)

| id | Félag | A kt↔nafn↔hf | B skýrsla | C/D punktur og mynd | E tæki | F/G póstur og staða | Frávik |
|---|---|---|---|---|---|---|---|
| 410 | Hlíðarsmári 8 | **NAFN ANNAÐ**: kt 590269-6709 er Skjólgarður ehf. í Fyrirtækjaskrá (sama hús). Nafnið ritað „Hlíðarsmári“ | Skýrsla sept. 2025 á „Hlíðarsmári 8 Húsfélag“, sama kt | Punktur réttur; Maps-skjámynd sýnir fiskverslun í húsinu (rétt hús) | Listi = skýrsla (2 LV, 2 CO₂, 1 slanga); reikn. 107385 rukkar 2 slöngur | Ekkert netfang á röð (tengiliður er í máli #1504). Skoðunarmánuður skráður 10, skýrslan segir september | Kt er ehf., ekki húsfélag; slöngur 1/2; mánuður 10 ≠ 9 |
| 1734 | Húnar ehf. | Nafn og kt rétt; lögheimili Stararimi 53, 112. Staður Bæjarlind 12 | Engin skýrsla á röðinni. Húsaskýrslan júní 2025 (á röð 601) nær yfir leigjandann: 2 LV endurhlaðin + 4 ný | Enginn punktur í geocode_cache; götumynd sýnir Bæjarlind 12 | Listi 6 LV = reikn. 106989 (4 ný + 2 yfirferð). **Sömu 6 tæki eru líka talin á lista húsfélagsins (601)** | Ekkert netfang. Nóta: leigjandinn hættur, ath. með húseiganda | Tæki tvítalin; leigjandi farinn; óvíst hvort tækin eru enn á staðnum |
| 601 | Húsfélagið Bæjarlind 12 | Nafn og kt rétt; lögheimili Krókháls 5a, 110 (umsjónarfélag) | Skýrsla júní 2025, engin kt í skýrslunni; nær yfir allt húsið (bílakjallara, sameign, tvo leigjendur) | Punktur réttur, götumynd rétt | Listi 20 tæki = öll skýrslan. Reikn. húsfélagsins 107074 ber 7 tæki; hin fóru á Húna (106989) og Menju (106990) | Netfang umsjónarfélags staðfest. Úttekt 2026 gerð (vinnublöð 29.07.) en órukkuð: mál #901 opið. document_pairs „2025 vantar reikning“ þótt 107074 sé til | Listi telur tæki þriggja greiðenda; 2026 órukkað (#901); pörun röng |
| 188 | Húsfélagið Hlíðasmára 15 | PASSAR | Engin slökkvitækjaskýrsla; brunakerfiskúnni | Handsett mynd, ÓSNERT; punktur réttur | Engin tæki skráð | Slökkvitækjasamningur undirr. 13.05.2026, fyrsta úttekt ógerð. Við sendum 30.09.2026 „hvenær hentar?“; ekkert svar sést | Fyrsta úttekt samkvæmt samningi ógerð; ósvarað síðan 30.09. |
| 833 | Lautasmári 45, húsfélag | PASSAR | Skýrsla nóv. 2023, kt rétt | Punktur réttur, götumynd fjölbýli | Listi = skýrsla (2 LV + 5 RS); reikn. 2023 rukkaði aðeins 2 LV | Netfang staðfest (2024). Engin úttekt 2024 né 2025 | Tvö ár án skoðunar |
| 385 | Réttingaverkstæði Jóa ehf | PASSAR | Skýrsla júlí 2025, kt rétt | Punktur réttur; **ENGIN MYND** | Listi = skýrsla = reikn. 107067 | Nóta: „farnir til Securitas“. Reikn. 107827 (05.02.2026, 16.532 kr.) án lína, ÓMÆLT hvað hann var. Netfang sést í pósti 2023 | Líklega hættir; röðin telst enn í þjónustu |
| 1396 | Tannlæknastofan Prófíll | Kt = Prófíll ehf., lögheimili Gullakur 7, 210. **Heimilisfang raðar er aðeins „201 Kópavogi“**; gatan (Hlíðasmári 17) stendur í nafninu | Skýrsla des. 2023, kt rétt, Hlíðasmára 17 | **RANGUR PUNKTUR** (geokóðun lendir á Menntaskólanum í Kópavogi); engin mynd | Listi = skýrsla = reikn. 104559 (1 LV, 1 CO₂ 5 kg, 1 slanga) | Ekkert netfang, enginn póstur. Engin úttekt 2024 né 2025 | Gata vantar; punktur rangur; tvö ár án skoðunar |
| 1397 | Tannlæknastofan Smárinn | Kt rétt (Hlíðasmára 14 í Fyrirtækjaskrá). **Heimilisfang raðar er aðeins „201 Kópavogi“** | Skýrsla des. 2023, kt rétt, Hlíðasmára 14 | **RANGUR PUNKTUR** (sami og 1396); engin mynd | Listi = skýrsla (3 LV, 3 CO₂, 1 slanga) | Ekkert netfang. Búðarsala R-000827 (26.08.2026, skilti). Engin úttekt 2024 né 2025 | Gata vantar; punktur rangur; tvö ár án skoðunar |
| 212 | Hjálparsveit skáta | Nafn og kt rétt; heimilisfang „Kópavogi 202“ er pósthólf, ekki staðfang | Skýrsla des. 2025, kt rétt. Tækin komu á verkstæðið | **RANGUR PUNKTUR** (sami og 1396); engin mynd | Listi = skýrsla (30 LV, 1 CO₂ 2 kg, 1 CO₂ 5 kg). Skýrslan segir tvö CO₂ 5 kg dæmd ónýt | Netfang staðfest (des. 2025). Starfandi, á tíma í desember | Staðfang vantar; punktur rangur |
| 1135 | Álnavörubúðin | Kt = Umboðssalan Art ehf., lögheimili Gulaþing 30 (íbúðarhús) | Skýrsla sept. 2023 á „Umboðssalan ART/Álnavörubúðin“, kt rétt | Punktur og mynd sýna íbúðarhús, ekki verslun | Listi = skýrsla (2 LV, 1 duft 6 kg, 1 slanga) | Nóta: flutt á Selfoss. Engin úttekt síðan 2023 | **STAÐUR FLUTTUR**; röðin telst enn í þjónustu |

Bæjarlind 12 er eitt hús með þrjá greiðendur (601 húsfélag, 1734 Húnar, 1531 Menja) og eina skýrslu. Tækjalisti 601 ber öll 20 tækin.

Húsmyndir skoðaðar: 410, 1734, 601, 833, 1135. Mynd 188 er handsett og ósnert. Fjórar raðir án myndar: 385, 1396, 1397, 212.

**Staða: 105 af 168 yfirfarin, 92 með frávik. Síðasta félag: 1135. Næst: tíu næstu óyfirförnu á eftir 1135 í röðinni (póstnúmer, nafn)**; sleppa 448, 440 og 441.

## Lota 12 — tíu félög í 203–210 (11.11.2026)

| id | Félag | A kt↔nafn↔hf | B skýrsla | C/D punktur og mynd | E tæki | F/G póstur og staða | Frávik |
|---|---|---|---|---|---|---|---|
| 1846 | Fríkirkjan Kefas | PASSAR | Engin skýrsla, enginn reikningur | Punktur réttur; handsett mynd, ÓSNERT | Listi 11 tæki (5 LV, 4 CO₂, 2 slöngur) er lýsing tengiliðs 30.09.2026, ekki úttekt | Netfang staðfest. Þeir báðu um eftirlitssamning 30.09.2026; síðasti póstur er frá þeim. Mál #1570 opið | Samningur og tilboð ósent síðan 30.09.; talin í þjónustu án úttektar |
| 430 | H210 ehf | Nafn og kt rétt; lögheimili Hlíðarás 21, 221. Staður Turnahvarf 6L | Skýrsla nóv. 2025, kt rétt | Geokóðun lendir á Turnahvarfi 6A; **ENGIN MYND** | Listi = skýrsla (2 LV, 1 duft 6 kg, 2 RS); reikn. 107542 rukkar aðeins 2 LV | Ekkert netfang. Á tíma núna í nóvember | Duft og RS órukkuð 2025; netfang vantar |
| 504 | Dagar hf. | PASSAR (höfuðstöðvar Lyngási 17) | **SKÝRSLA ANNARS STAÐAR**: jan. 2024, Drangahraun 1b, 220 Hafnarfirði | Punktur og mynd sýna höfuðstöðvar, ekki tækjastað | Listi 3 LV = skýrsla 2024. Reikn. 106006 (21.11.2024) var með 5 LV, CO₂ og slöngu og var kreditfærður að fullu | Nóta: „bara kreditreikningar“. Enginn póstur á netfangið. document_pairs „2025 vantar skýrslu“ byggir á kreditreikningi | Engin greidd úttekt síðan feb. 2024; röð bendir á rangan stað |
| 679 | Efnalaug Garðabæjar | Kt rétt; nafn í skrá „Efnalaug Garðabæ ehf.“; „Garðartorg“ ritvilla | Skýrsla nóv. 2024, kt rétt | Punktur réttur; **ENGIN MYND** | Listi = skýrsla (1 LV + 2 CO₂ 5 kg) | Ekkert netfang. Engin úttekt 2025 | 2025 sleppt; netfang vantar |
| 1337 | Faglitun ehf | PASSAR | Skýrsla okt. 2023, kt rétt | Punktur réttur, götumynd í lagi | Listi = skýrsla (2 LV, 1 duft 6 kg, 1 CO₂ 5 kg) | Ekkert netfang. Engin úttekt 2024 né 2025 | Tvö ár án skoðunar |
| 1197 | Garðabær | Kt = sveitarfélagið, Garðatorgi 7 | **SKÝRSLA ANNARS STAÐAR**: maí 2023, Starfsmannafélag Garðabæjar vegna sumarhúsa í Reykjaskógi; engin kt í skýrslu | Punktur og mynd sýna Garðatorg, ekki sumarhúsin | Listi 2 LV; skýrsla 2 LV + 2 duft 6 kg + 8 RS. Reikn. 107731 (19.01.2026) er búðarsala á 1 LV, „opið við yfirtöku“ | Ekkert netfang. Skráð „skoðað 2026“ og document_pairs „2026 vantar skýrslu“ út á búðarsölu | Búðarsala talin úttekt; tækin eru í sumarhúsum; listi ≠ skýrsla |
| 445 | Geyslatækni | Kt rétt; nafn ritað „Geyslatækni“, í skrá „Geislatækni ehf, Laserþjónustan“ | Skýrsla des. 2025, kt rétt | Geokóðun lendir á Suðurhrauni 12A (röð segir 12c); götumynd iðnaðarhús | Listi = skýrsla = reikn. 107676 | Netfang skráð, síðasti póstur 2018. Á tíma í desember | Ritvilla í nafni |
| 687 | Granitsmiðjan | Kt rétt; tvær raðir á kt (687 og 737 „Herbergjaleiga“, sama hús) | Nýjasta skýrsla nóv. 2024. Engin skýrsla 2025: reikn. 107683 (30.12.2025) ber yfirferð og akstur en enga skýrslugerð | Enginn punktur í geocode_cache; götumynd í lagi | Listi 2 LV + 1 slanga (+2 LV úrelt); reikn. 2025: 1 LV + 1 slanga | **ÓSVARAÐ**: 10.11.2026 spyr tengiliður hvort R-001286 (51.976 kr., gefinn út á röð 737) sé úttekt á þeirra rými; man ekki eftir heimsókn. Mál #1581 | Spurning um reikning ósvöruð; year_factcheck segir ranglega „líklega hættur“ |
| 449 | JFK fasteignir | PASSAR (lögheimili Lynghólum 10, íbúðarhús) | Skýrsla des. 2025, kt rétt, en **TÆKIN ERU ANNARS STAÐAR**: Tjarnarvellir 3, 221 Hafnarfirði (hótel og líkamsrækt) | Punktur og mynd sýna íbúðarhús, ekki tækjastað | Listi = skýrsla = reikn. 107583 (19 LV, 4+2 CO₂, 7 slöngur) | Netfang staðfest (2024). Á tíma í desember | Röðin bendir á lögheimili, ekki tækjastað |
| 450 | K.Ricter | Kt rétt; nafn ritað „K.Ricter“, í skrá „K. Richter hf.“ | Skýrsla des. 2025, kt rétt | Enginn punktur í geocode_cache; götumynd sýnir skilti félagsins | Listi = skýrsla (2 LV + 1 duft 6 kg); reikn. 107686 ber yfirferð á 1 dufti og 1 nýtt duft 6 kg | Netfang staðfest. Mál #232 opið (bað um hreyfingalista 16.01.2026) | Ritvilla í nafni; nýtt dufttæki ekki á lista (eða skipt út, ÓMÆLT) |

Bætt við mál #1581 (Granítsmiðjan, þegar merkt skilaboð): hvaða reikningur þetta er og á hvaða röð hann var gefinn út.

Húsmyndir skoðaðar: 504, 1337, 1197, 445, 687, 449, 450. Mynd 1846 er handsett og ósnert. Án myndar: 430, 679.

**Staða: 115 af 168 yfirfarin, 102 með frávik. Síðasta félag: 450. Næst: tíu næstu óyfirförnu á eftir 450 í röðinni (póstnúmer, nafn).**

## Lota 13 — tíu félög í 210–220 (11.11.2026)

| id | Félag | A kt↔nafn↔hf | B skýrsla | C/D punktur og mynd | E tæki | F/G póstur og staða | Frávik |
|---|---|---|---|---|---|---|---|
| 432 | Kirkjulundur 12-14 | Nafn og kt rétt; lögheimili pósthólf umsjónarfélags | Þrjár skýrslur nóv. 2025 (nr. 12, nr. 14, bílakjallari). Lesin: bílakjallari, kt rétt, 2 LV + 2 slöngur í lagi; póstnr. ritað 110 | Geokóðun finnur aðeins götuna; götumynd fjölbýli | Listi 6 LV virk + 2 slöngur **merktar úreltar** þótt skýrslan segi þær í lagi. Reikn. 107533 ber líka 24 hleðslur (tæki íbúa) | Netfang umsjónarfélags staðfest. Mál #356 opið síðan nóv. 2025. Á tíma í nóvember | Slöngur ranglega úreltar; gamalt mál opið |
| 1733 | Norðurbrú 1, húsfélag | PASSAR | **SKÝRSLU VANTAR**: reikn. 106713 (05.05.2025) er úttekt með skýrslugerð, engin skýrsla á röðinni | Punktur réttur; handsett mynd, ÓSNERT | Listi 13 LV = reikn. 2025 (13 hleðslur). Tækin bera skoðunardag 31.08.2026 en engin heimsókn finnst (mál #963) | Ekkert netfang. Skoðunarmánuður skráður 8, úttekt 2025 var í maí | Skýrsla 2025 vantar; 2026 óljóst (#963); mánuður 8 ≠ 5 |
| 1132 | TBI ehf | PASSAR (lögheimili Garðahraun 2) | **SKÝRSLA ANNARS STAÐAR**: sept. 2023, Austurvegi, 800 Selfossi | Punktur og mynd sýna Garðahraun 2, ekki tækjastað | Listi = skýrsla (2 LV) | Netfang skráð, enginn póstur. Engin úttekt síðan 2023 | Tækin eru á Selfossi; tvö ár án skoðunar |
| 165 | Vélsmiðja Orms og Víglundar – Slippurinn RVK | Rekstrarfélag, þrír staðir á kt: A á ekki við | Skýrsla maí 2025, kt rétt, Vesturhrauni 1. Skráarnafnið segir ranglega „Skútuhraun 9 … #288“ | Handsett mynd, ÓSNERT; punktur réttur | Listi = skýrsla 2025 (3 LV, 11 duft, 2 CO₂ 5 kg, 8 slöngur). R-000411 (24.06.2026, 168.953 kr.) ber tvo staði (mál #1416) | 2026 rukkað án skýrslu. Reikn. 107981 og 108002 „opið við yfirtöku“. Nóta: ný tæki ófarin á staðinn | Skýrsla 2026 vantar; #1416 og #1002 opin; opnir reikn. frá yfirtöku |
| 1399 | Versus bílaréttingar og sprautun | Kt rétt; röð segir Suðurhrauni 2a, Fyrirtækjaskrá og skýrsla segja 2 | Skýrsla des. 2024, kt rétt | Punktur Suðurhraun 2; götumynd iðnaðarhús | Listi = skýrsla = reikn. 106182 (2 duft, 1 slanga) | Ekkert netfang. Úttekt des. 2024 var rukkuð í jan. 2025 og talin sem 2025; engin úttekt í des. 2025 | Tímabil 2025 sleppt; húsnúmer 2a/2 |
| 676 | Danco | PASSAR | Skýrsla des. 2024, kt rétt | Enginn punktur í geocode_cache; götumynd í lagi | Listi = skýrsla (2 LV + 2 slöngur) | Netfang skráð, enginn póstur. Engin úttekt 2025 | 2025 sleppt |
| 1141 | Filtertækni ehf (Kvikkfix) | PASSAR | Skýrsla nóv. 2023 lesin, kt rétt. Viðhengi „úttektarskýrsla 2025“ vísar á Drive-skjal sem opnast ekki: ÓMÆLT | Geokóðun finnur aðeins götuna; **ENGIN MYND** | Listi = skýrsla 2023 | Ekkert netfang. Enginn reikningur síðan 04.12.2023. document_pairs „2025 vantar reikning“ | Ef skýrslan 2025 er raunveruleg er úttektin órukkuð; annars tvö ár án skoðunar |
| 475 | Framsýn menntun | Nafn og kt rétt; röð og Fyrirtækjaskrá segja Reykjavíkurveg 50 | **HEIMILISFANG ANNAÐ Í SKÝRSLU**: mars 2025, Flatahraun 7 | Punktur og mynd sýna Reykjavíkurveg 50 (matvöruverslun á jarðhæð) | Listi = skýrsla = reikn. 106500 | Netfang skráð, enginn póstur. Skoðunarmánuður mars, engin úttekt 2026 | 2026 ógert; óvíst hvort tækin eru á Flatahrauni 7 |
| 442 | Húsfélagið Álfholt 2c | Kt rétt; í skrá „Álfholt 2a,b,c, húsfélag“, lögheimili pósthólf | Skýrsla des. 2025, kt rétt | Enginn punktur í geocode_cache; götumynd fjölbýli | Listi = skýrsla = reikn. 107670 (2 LV) | Netfang umsjónarfélags staðfest. Á tíma í desember | Ekkert |
| 439 | Húsfélagið Flatahrauni 1 | PASSAR | Skýrsla des. 2025, kt rétt | Punktur réttur, götumynd fjölbýli | Listi = skýrsla = reikn. 107594 (14 LV, 2 CO₂ 5 kg, 12 slöngur, 11 RS) | Netfang skráð, enginn póstur. Nótan á röðinni er „Bara test“ | Ekkert (prufunóta á röð) |

Húsmyndir skoðaðar: 432, 1132, 1399, 676, 475, 442, 439. Myndir 1733 og 165 eru handsettar og ósnertar. Án myndar: 1141.

**Staða: 125 af 168 yfirfarin, 110 með frávik. Síðasta félag: 439. Næst: tíu næstu óyfirförnu á eftir 439 í röðinni (póstnúmer, nafn).**
