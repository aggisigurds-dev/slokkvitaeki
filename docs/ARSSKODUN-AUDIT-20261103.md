# Ársskoðun — audit á fyrirtækjum í þjónustu (mælt 03.11.2026 kl. 18:01)

Tilefni: Agnar sá Gerð ehf. í Ársskoðun með skýrslu frá „Hveragerðissókn" og ekkert annað.
Mælt beint úr Supabase, aðeins lesið. Engu breytt nema tveimur samþykkismálum á borðinu (#1395, #1396).

Mælikvarði „í þjónustu" = `fyrirtaeki.er_i_thjonustu = true` (sama flagg og 153 `inService`): **635 félög**.

## Gildra í mælingunni

Tækjastaða í `uttaeki` hefur fjögur orðaforða: `active`, `ok`, `Í lagi`, `urelt`. Talning á `active` einni sér
sýndi 51 félag án tækja og hefði ranglega sleppt Gerð ehf. (hennar tæki eru `ok`). Hér eru „lifandi tæki" öll
sem eru ekki `urelt`.

## 1. Gerð ehf. (id 795, kt 530116-0180) — STAÐFEST rangt

- Eina viðskiptasagan: Stólpa 103951, 19.07.2023, 5.865 kr, greitt 02.08.2023, og tölvupóstur 31.07.2023.
- Þrjár skýrslur, allar annarra: 2022 = Skúbb ehf. (kt 640317-0940, á id 832), 2023 = Hveragerðiskirkja
  (afrit, þegar merkt), 2024 = „Hveragerðissókn, 810 Hveragerði" (PDF opnaður; 4 léttvatn + 1 brunaslanga, nóv 2024).
- 5 tæki (4 léttvatn 6 L + 1 slanga, síðast skoðuð 01.11.2024, búin til 14.07.2026) eru nákvæmlega tækjasett
  þeirrar skýrslu. Hveragerðiskirkja (id 1354, kt 410571-0489) á sama sett og enga 2024-skýrslu.
- Engin sala, enginn samningur, engir Payday-reikningar.
- Á borðið: **#1395** (færa skýrslu 755 á kirkjuna) og **#1396** (Gerð úr þjónustu, tækin merkt úrelt).
  Gamalt mál #784 („finna kt") er svarað af #1395.

## 2. Félög í þjónustu með engin lifandi tæki (42 af 635, auk 4 óvirkra)

| Flokkur | Fjöldi | Félög |
|---|---|---|
| Ekkert til (engin tæki, skýrsla, reikningur né samningur) | 16 | Dra ehf, Mission á Íslandi, Rauði kross Íslands, Húsfélagið Kjarrhólmi 18, Danshöllin, Reykjaklettur, 10 × Reitir (id 1854–1863, status óvirkur) |
| Nýr samningur, fyrsta úttekt ógerð (eðlilegt) | 5 | Reykjavíkurvegur, D27, RB Rúm, Rentur Fagraberg 18, Cafe Catalina |
| Reikningar en engin tæki né skýrsla | 11 | Hjallabraut 3 (tvær raðir, sama kt), Suðurvangur 19, Pétur Ólafsson byggverktakar, Barónstígur 43, Skaftahlíð 4-10 húsfélag, Álfaskeið 78-80, Reising, Vélrás Gullhella, Vélrás Klettagarðar, Steypustöðin Keflavíkurflugvelli |
| Engin lifandi tæki en skýrsla/gögn til | 10 | Hlíðasmári 15, 17 og 19, Flétturimi 16, Nethylur, Center Hótel Þverholt og Hlaðvarpinn, Sætoppur, Akrotiri, Istanbul Market |
| Tæki til en félag merkt óvirkt | 4 | Garðyrkjufélag Íslands, Stefanía Unnarsdóttir, THG Arkitektar, Þemasnyrting |

Athugasemdir (mælt, ekki ályktað):
- Reitir 10 staðir: stofnaðir 11.10.2026, `status = óvirkur` en `er_i_thjonustu = true`. Mótsögn í röðinni sjálfri.
- Dra ehf (37 tæki, öll `urelt`) á skýrslu 2024 sem hangir á Downtown Reykjavík Apartments (id 490, 34 lifandi tæki).
  Líklega sama félag tvískráð. ÓMÆLT: ekki borið saman við Ajour.
- Vélrás og Steypustöðin Keflavík: tækin liggja á systurstöðum, sjá `systkiniMedTaeki` í 153. Ekki gallar.

## 3. Skýrslur á röngu félagi — grunur, EKKI staðfest

Eldri vörður (TILLAGA-athugasemd frá 09.07.2026) merkti skýrslur þar sem skráin segir aðra kennitölu en félagið:
71 röð alls, 55 á félögum í þjónustu, **17 sem eru ekki merkt afrit** á 14 félögum. PDF-skjöl þeirra eru ekki opnuð.

| Félag (id) | Ár | Skráin segir |
|---|---|---|
| Bílaverkstæði Högna (211) | 2023 | Rekstrarfélag Norðurturnsins |
| Heimilisiðnaðarfélag Íslands (447) | 2025 | Nethylur ehf (sama hús, Nethylur 2e) |
| Herbergjaleiga (737) | 2023 | Hegri fjárfestingar ehf (Smiðsbúð 3) |
| Húsfélag Árakur 5 (145) | 2026 | Breiðvangur 9 |
| K Apartments (1413) | 2025 | Heimaleiga Bríetartún 9-11 |
| K.Ricter (450) | 2024 | Aðalskoðun |
| Leirubakki 14 (360) | 2024 | Húsfélagið Leirubakka 4 |
| Míla ehf. (1414) | 2025 | Húsfélagið Suðurlandsbraut 30 |
| Nýji tónlistarskólinn (217) | 2024 | Húsfélagið Kórsölum 3 |
| Spörvar (214) | 2024 | Lindaberg ehf |
| Stakkholt ehf (1172) | 2024 og 2025 | AFL Starfsgreinafélag (önnur raðan er reikningur 105893) |
| Stálsmiðjan-Framtak (545) | 2024 | Vélsmiðja Orms og Víglundar Slippurinn RVK |
| Tannlæknastofan Bæjarhrauni (149) | 2026 | Tannlæknastofan Prófíll Hlíðasmára 17 |
| Þórarinna Söebech (1265) | 2023 | Húsfélagið Háteigsvegi 3 |

Auk þess skýrslur þar sem nafn skýrslunnar er allt annað en félagsins (athuga hvort sama hús eða rangt):
Downtown Reykjavík Apartments 2024 (Dra ehf), Herbergjaleiga 2024 (Granitsmiðjan), Hlöllabátar 2010 (Fen 2010 ehf),
Ræstitækni 2023 (Húsfélagaþjónustan), Prentun ehf 2023 (Stafræn Prentsmiðja), Við sjóinn 2024 (Vogarcamping),
Húsfélagið Laugavegi 42 2026 (Heimaleiga ehf), Húsfélagið Álftamýri 24-30 2022 (nafnið „febrúar").

ATH: einfaldur nafnasamanburður gaf mikið af falsjákvæðum (punktar og stafsetning: Bíll.is, K.Ricter, Interroll).
Þær raðir eru ekki taldar hér. Enginn af þessum 14 + 8 er staðfestur fyrr en PDF-ið er opnað.

## 3b. PDF-in opnuð (03.11.2026 kl. 18:09) — kafli 3 hér að ofan er úreltur

24 skjöl lesin (pdftotext úr Storage, innihald borið saman við önnur skjöl). Eldri vörðurinn (TILLAGA-athugasemdir)
hafði RANGT fyrir sér í 5 af 5 tilvikum þar sem hann nefndi aðra kennitölu (Nýji tónlistarskólinn, Leirubakki 14,
Spörvar, Húsfélag Árakur 5, Tannlæknastofan Bæjarhrauni). Ekki treysta þeim athugasemdum.

**Skýrsla á röngu félagi, nákvæmt afrit af skjali á réttu félagi** (borð #1397–#1401):
K.Ricter 2024 (= Herbergjaleiga) · Míla 2025 (= Húsfélagið Suðurlandsbraut 30) · Þórarinna Söebech 2023
(= Húsfélagið Háteigsvegi 3) · K Apartments 2023 (= Heimaleiga Blue Mountain) · Stálsmiðjan-Framtak 2024 (= Slippurinn RVK).
Afleiðing: röngu félögin sýna „komið“ fyrir ár sem aldrei var skoðað.

**Rétt félag, rangt ár, afrit** (#1402–#1404): Nýji tónlistarskólinn 2024 (skýrslan er mars 2025, til þrisvar),
Spörvar 2024 (apríl 2025), Leirubakki 14 2024 (júní 2026).

**Annað** (#1405, #1406): Stakkholt ehf. skjal 331 er Stólpa-reikningur 105893 á kt húsfélagsins (Bílakjallari), ekki skýrsla.
Hlöllabátar skjal 2993 merkt 2010, er apríl 2023 (Fen 2010 ehf., Ingólfstorg).

**Stemmir við félagið (engin aðgerð):** Húsfélag Árakur 5, Tannlæknastofan Bæjarhrauni, Heimilisiðnaðarfélag Íslands,
Við sjóinn (Word-skjal, ekki PDF), Prentun ehf, Ræstitækni (sama kt og Húsfélagaþjónustan), Húsfélagið Álftamýri 24-30,
Húsfélagið Laugavegi 42 (heimilisfang stemmir, kt er Heimaleigu), Herbergjaleiga 2023 (sama hús, eldri kt 540513-1550).

**Ómælt:** skjöl 384, 517 og 836 hafa enga skrá hvorki í Storage né á Drive. Downtown Reykjavík Apartments (490, kt 691003-2560)
og Dra ehf (1334, kt 651003-2560) eru í sama grunni 815 á sama heimilisfangi; kt eru einum staf frá hvor annarri. Hvort er rétt er ómælt.

## 4. Framkvæmt 04.11.2026

Agnar samþykkti í spjalli („Já, öll tíu“). Mál #1395–#1406 framkvæmd og lokuð. Mælt eftir: Gerð ehf. ekki í þjónustu,
5 tæki `urelt`, ekkert skjal sem ekki er afrit; skjal 755 á Hveragerðiskirkju; skjöl 190, 466, 834, 831, 267, 215, 325, 250
merkt afrit (`dup_of` bendir á skrána sem stendur); skjal 331 reikningur á Húsfélagið Stakkholt 2-4 (Bílakjallari); skjal
2993 ár 2023. Hveragerðiskirkju-tækin 5 skráð síðast skoðuð 01.11.2024. Ekkert eytt.

## 4b. Endurmælt 10.11.2026 — afritsmerkingin dugði ekki, lagað

Gögnin frá 04.11 stóðu óbreytt, en átta skýrslur sem voru merktar afrit birtust áfram á röngu félagi/ári:
199 `dedupBucket` felur afrit aðeins þegar raunskjal er í sama árshópi, 153 síar afrit ekki, og gömlu
`document_pairs`-raðirnar stóðu sem `vantar_reikning`.

Lagað: afritin 190, 466, 834, 831, 267 færð á rétta félagið (737, 463, 422, 1483, 165); afritin 215, 325, 250
fengu rétt ár (2025, 2025, 2026); skjal 331 merkt afrit af 2772 (reikningur 105893 var þegar til á húsfélaginu);
11 úrelt pör eytt (afrit í `backup_20261110_arsskodun_pairs`). Talið eftir: 0 skýrslur og 0 pör á öllum ellefu
röngum (félag, ár); a.m.k. ein raunskýrsla á öllum tíu réttum.

Ný mál: **#1584** Míla ehf. (7 tæki afrituð úr skýrslu Húsfélagsins Suðurlandsbraut 30) og **#1585** K Apartments
(41 tæki afrituð úr skýrslu Blue Mountain; þrotabú 2024). Sama mynstur og Gerð. Verkefnalisti: 70 pör á
afritsskýrslu og 33 á skýrslu annars félags í kerfinu öllu.

Birtingin staðfest í Chrome Agnars 10.11.2026 kl. 21:05 (lifandi síða, commit 6625622, Skjöl-spjald prófílsins lesið):
ranga árið er horfið hjá öllum tíu (K.Ricter, Míla, Þórarinna, K Apartments, Stálsmiðjan 2024/2025/2023; Nýji
tónlistarskólinn, Spörvar, Leirubakki 14 án 2024; Stakkholt ehf án 2024; Hlöllabátar með 2023, án 2010). Réttu
félögin sýna skýrsluna á réttu ári og afritið er falið. Ekkert Brunakerfis-spjald á þessum félögum; G14 (204)
sýnir sín þrjú. Ársskoðunarlistinn sjálfur var síaður og ekki lesinn — Gerð utan hans staðfest með `inService`-
reglunni (er_i_thjonustu false, engin röð í arsskodun_customers, 0 lifandi tæki). Skjáskot náðist ekki.
Slippurinn RVK 2024 og Nýji tónlistarskólinn 2025 sýna TVÆR skýrslur (1469+1604, 383+1638) — var þannig fyrir.

## 5. Næstu skref (bíða Agnars)

1. Ákveða hvað gera á við 16 tóm félög, einkum Reitir (10 staðir óvirkir í þjónustulista).

Kóði: 199 sýnir ekki lengur tómt 🔥 Brunakerfisþjónusta-spjald hjá félagi sem hefur aldrei haft brunakerfi
(skjal eða reikning á neinu ári, né á áskriftarlista `brunakerfi_customers`).
