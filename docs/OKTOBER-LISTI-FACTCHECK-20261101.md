# Októberlistinn — factcheck, skýrslur, staðsetningar, póstur (01.11.2026)

Lestur eingöngu, ekkert skrifað. Listinn = `arsskodun_customers` með `inspect_month = 10`: 71 færsla.
60 lifandi félög í þjónustu (+ Narfakot #1906: mjúkeytt en `er_i_thjonustu` enn true), 10 úti (tekin út ágúst–okt).
Heimildir: `fyrirtaeki`, `uttaeki`, `solur`, `customer_documents`, `arsskodun_report_facts`, `thjonustubeidni`,
`email_digest` (eldklar@, Brunaholf@, bokhald@; ekki persónulegt Gmail).

## 1. Staðan í einni mynd
| Hópur | Fjöldi |
|---|---|
| Október-úttekt lokið: reikningur með „Skýrslugerð" + skýrsla í kerfinu + öll tæki með `last_insp` okt | 49 |
| Nesdekk Dalshraun 10 (#1853): tæki skráð 09.10, en enginn skýrsla og enginn slökkvitækjareikningur | 1 |
| Engin vinna 2026 þótt mánuður sé 10 | 10 (sjá kafla 5) |

## 2. Skýrslur ↔ tæki ↔ reikningar (fact-check)
- Tækjafjöldi á reikningi (yfirferð + hleðsla + nýtt) = tæki í tækjaskrá hjá öllum 49. Mismunur sem sást í fyrstu
  (Eyrarholt, Stelkshólar, Austurgata, Tjarnarból, ProLan) var reykskynjarar og ný tæki á reikningnum; taldi aftur: stemmir.
- Tvítekinn reikningur, báðir kreditfærðir (staðfest): Kvarnir R-001187 (82.966, aldrei sendur) á móti R-001203 (68.671, greiddur 26.10);
  Sjúkraþjálfun Selfoss R-001097 á móti R-001117 (kredit R-001118). Ekkert opið.
- **Óljóst: `arsskodun_report_facts`** hjá 38 af 49 var þáttað 14.–17.07 og tengt við októberskjalið (`source_doc_id`).
  Fjöldinn stemmir við tækjaskrá, en þær tölur sanna ekki innihald októberskýrslunnar. **PDF-in sjálf voru EKKI lesin** í þessari yfirferð — ÓMÆLT.
  Skýrslurnar eru gerðar úr tækjaskránni (`source=app`), svo gallar þar fara beint í þær.
- 50 októberskýrslur (49 félög): allar með skrá og virkan hlekk (`link_ok`), engin tvítak; **engin yfirfarin** (`reviewed = false`) og engin með `skyrsla_taeki_alls`.

## 3. Staðsetningar
- **210 af 373 tækjum** í októberúttektum eru með raðnúmer `TMP-…` og **enga staðsetningu** (tómt `location`). Þar á meðal:
  Steypustöðin Borgarnes 46, Krókur 77 36, Álfaborg 13, Lýsir 13, Kvarnir 12, Jeppasmiðjan 11, Nesdekk 10, Bortækni 9, ProLan 7,
  Helguvík 7, Eyrarholt 6, Selfoss 5, Fiskbúð 4, Japanskar 4. Skýrslan sýnir þau án staðsetningar og árið 2027 hefst á sömu óvissu.
- `next_insp` á öllum 373 er í okt 2027 (stemmir við mánuðinn).
- Heimilisfang án gatna eða misformað: Jeppasmiðjan Ljónsstöðum („801 Selfossi"), Bortækni („220 Stapahrauni 7,"), Í réttum ramma
  („104 Skútuvogi 12f"), Nýbýlavegur 14 (María, ekkert póstnúmer); „suðurbraut 26" er heitið og heimilisfangið (#1879).
- Engin geocode-færsla fannst fyrir ProLan (Suðurhella 5), Steypustöðina Borgarnes (Engjaás 2), Keflavíkurflugvöll og Suðurbraut 26 → fá ekki kortamerki fyrr en geocode keyrir.

## 4. Afhending, reikningar og póstur
- **Skýrslur sendar í tölvupósti** (sýnilegt í SENT): aðeins Selfosskirkja 07.10, Suðurbraut 26 27.10, Krókur 77 29.10 (+ reikningur til Japanskra véla 26.10).
  Hjá hinum er ekki hægt að sjá hvort skýrslan fór (Payday-póstur sést ekki í `email_digest`) — **ÓMÆLT**. 27 af 60 félögum hafa ekkert netfang á prófílnum.
- **Óútsendir reikningar:** Nesdekk R-001198 (brunakerfi, 364.807 kr, 22.10, `krafa_sent_at` tómt); Bíll.is R-001116 (28.664 kr, 09.10, mánuður 9);
  ICS ehf. R-001227 (pos, 27.000 kr).
- **Ógreitt eftir krafa fór út og 19–25 daga bið:** Fiskbúð Suðurlands 37.925 (07.10), Hárbeitt 15.314, Álfaskeið 86-88 40.503,
  Vallarbarð 3 15.314, Suðurvangur 19a 36.597 (öll 13.10). Hin ógreiddu eru yngri en 14 daga.
- **`paid_at` = 02.11.2026 (á morgun)** á fjórum reikningum: Þverholt 24, María, Húsfélagið Austurgata 26, Noon. Sennilega bankadagur úr Payday — vert að skoða áður en bókað er.
- **Hárbeitt (#1355):** mál #882 (opið síðan 11.09) — kennitalan 680499-3009 gæti verið rangt og greiðandi „Hárnet ehf." 680599-3009. Reikningurinn bíður ógreiddur.
- **Berjavellir 6:** formaður húsfélags (13.10) kvartaði að „Eldklár" mætti óumbeðið án vitundar stjórnar. Við svöruðum 14.10 (misskilningur um nafn,
  árssamningur). Reikningurinn greiddur 23.10. Hann fékk líka ábendingu um reykskynjara á göngum.
- **Tjarnarból (Eignaumsjón V26-278459, 27.10):** „Hver óskaði eftir þessu?" — svarað sama dag, reikningur greiddur 28.10.
  → Sama mynstur og Berjavellir: húsfélög sem hafa umsjónarfélag sjá krafa frá „Brunahólf Slökkvitæki" og þekkja ekki nafnið. Ábending: vísa í samninginn í reikningstexta eða skýrslupósti.
- **Kríuás 15 (#496):** Eignaumsjón sagði 26.10 að húsfélagið sé ekki lengur hjá þeim; reikningur fór á reikningar@eignaumsjon.is (greiddur 30.10). Netfang á prófíl autt. Mál #1361 opið.
- **Heimaleiga:** 06.10 bað Dimka um að reikningurinn færi á Eldsalir ehf. → kredit R-001108 (−52.519) og nýr R-001109 á Eldsalir (greiddur 22.10), netfang ingi@kaskur.is rétt skráð. Búið.
  Fundur með Heimaleigu var 28.10 (verð, saga, yfirlit); mál #1290 um Midtown 61 → 10 tæki bíður Agnars.
- Handprjónasambandið: mál #325 (des 2025) — ekki þjónusta í Borgartúni 31 (Öryggismiðstöðin); reikningurinn nær aðeins yfir Skólavörðustíg 19 (3 tæki).
- Lemmy Rockbar: skjalabeiðnir #402/#404 opnar síðan okt 2025.

## 5. Á listanum án október-vinnu (engin tæki skoðuð 2026)
| Félag | Staða |
|---|---|
| Heimaleiga: Bríetartún 9-11 #1487 (8 tæki), Ice Apartments #1484 (8), Máni #869 (54), Midtown #1486 (61) | Síðast skoðað okt 2025, `next_insp` 2026-10-01 → **í gjalddaga, ekki gert**. 4 hús, 131 tæki. Fundur 28.10 var haldinn. Bíður mál #1290 (Midtown) |
| Faglitun #1337, Í réttum ramma #640, Skúbb #832 | Síðasta skoðun 10.2023 (3 ár), engin sala; sjálfvirkt stofnað úr skýrslum/heildarlista. Á þetta að vera í þjónustu? |
| Þorsteinn Bergmann #1138 | Síðasta skýrsla 2023; aðeins pos-sala 20.07.2026 (37.655) — líkast búðarsala |
| Steypustöðin Keflavík #1888 | 0 tæki, engin vinna, `subscribed = true` |
| Istanbul Market #1890 | 0 tæki; R-001219 er brunakerfi (68.750, krafa 26.10) → ætti að vera á brunakerfislista, ekki slökkvitækja |
| Nesdekk Dalshraun 10 #1853 | 10 TMP-tæki með `last_insp` 09.10 án skýrslu og án slökkvitækjareiknings; R-001198 er brunakerfi (óútsendur) |
| Narfakot #1906 | mjúkeytt en `er_i_thjonustu` = true og í blobbanum |

Tekin út 28.08–22.10 (10): Batik, Blikk, Bókhald og uppgjör, DH veitingar, Hagblikk, Jáverk, K-50, Lína lokkafína, Pure Deli, Three sisters. Enginn þeirra með október-vinnu.

## 6. Unnið í október en á september-listanum (mánuður óbreyttur, samkvæmt reglu)
Hertz Flugvellir 11 (01.10), Brynja Hátún 10 (06.10, 92 tæki), Eldsalir (08.10), Bíll.is (09.10), Gullhamrar (12.10), Garðyrkjufélag (12.10), Vatnskarðsnámur (12.10).
Tækin hafa `next_insp` í okt 2027 en mánuðurinn er 9 — ábending, ekki breyting (reglan: mánuður = síðasta skoðun í fyrra).
Eins: Bílabúð Benna Fiskislóð (mán. 8, 5 tæki 20.10) og Dalbrekka 4-6 (mán. 8, 1 tæki 23.10).

## 7. Tillaga (bíður Agnars, ekkert gert)
1. Senda Nesdekk R-001198 (364.807) — eða halda aftur ef hann á að fara í annað ferli; Bíll.is R-001116 líka.
2. Skýrslupóstur: rúmlega 40 félög þar sem ekki sést að skýrslan hafi farið; 27 án netfangs → hringja eða fá netfang.
3. Staðsetningar og raðnúmer á 210 TMP-tækin (mest Steypustöðin Borgarnes og Krókur 77).
4. Heimaleiga: dagsetja skoðun fyrir 4 húsin (131 tæki).
5. Hárbeitt kennitala (#882), `paid_at` 02.11, Kríuás netfang (#1361).
