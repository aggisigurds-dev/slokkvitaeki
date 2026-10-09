# Fjölbýli og húsfélög — sameignin

Agnar 08.10.2026: „mörg húsfélögin með íbúðir í fjölbýli. Þá eru slökkvitækin oftast bara með slökkvitæki og
reykskynjara í sameign sem er þá bara stigagangurinn upp og kjallari ef slíkur er."

## Reglan um staðsetningu

- Húsfélag sér um **sameign**; íbúðir eru séreign. (Hver ber ábyrgð á búnaði inni í íbúðum hefur ekki verið
  flett upp í lögum um fjöleignarhús 26/1994 — gerðu það áður en þú fullyrðir.)
- **Sameign:** stigagangar/stigahús, anddyri, gangar, kjallari (geymslugangur, hjóla- og vagnageymsla, þvottahús,
  þurrkherbergi, tæknirými/inntak, sorp), sameiginleg bílgeymsla.
- Slökkvitæki húsfélags: í stigagangi (við inngang / á stigapöllum, sama stað á öllum hæðum) og í kjallara.
- Reykskynjarar í sameign: stigagangar og kjallari (sjá `bunadur.md`, gr. 9.4.2–9.4.3).
- **Neyðarlýsing í fjölbýli (fl. 3, gr. 9.4.12):** skylda í stigahúsum **yfir fjórar hæðir**, í **gluggalausum**
  stigahúsum og göngum (líka í kjallara), við lyftur/lyftuvélar og í tæknirýmum. **Sameiginleg bílgeymsla = fl. 1** →
  neyðarlýsing á öllum flóttaleiðum. Óljóst hvort kjallari telst með í hæðafjölda. Sjá `neydarlysing.md` §1.3.

## Í appinu (Teikning)

- **446-teikning-sameign.js:** greinir stigahús, ganga og kjallara — stigar lesnir úr myndinni (líka hringstigar og
  skástigar) og staðfestir milli hæða; heiti úr textalagi PDF þar sem það er til. Takkinn **„Sameign"** (aðeins á
  fjölbýlum) deyfir íbúðir í 2D, vinnumynd og 3D. Mælt 08.10 á 7 húsum: stigahús 75 rétt / 0 röng / 8 vantar.
- 3+ hæðir staflast eftir stigunum í 3D; **Designer-3D sneiðmynd** sýnir allar hæðir með opinni framhlið og lýstum
  stigahúsum.
- **„Finna allt húsið"** sækir öll grunnmyndablöð (líka „2.–4. hæð" og snið) og leggur til hæðir.

## Prófhús

Berjavellir 6 (489, 6 hæðir, Hafnarfjörður) · Laugavegur 18 / Heimaleiga Máni (869) · Aspafell 2–12 (487) ·
Þverholt 24 (498) · Heimaleiga 1484, 1486 (Vegamótastígur), 1487 (Bríetartún).
