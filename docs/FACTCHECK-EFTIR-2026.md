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
