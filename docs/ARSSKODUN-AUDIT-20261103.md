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

## 4. Næstu skref (bíða Agnars)

1. #1395 og #1396 á borðinu.
2. Opna PDF-in á listanum í kafla 3 og para við rétt félag (aðferð: skill `rekstrarfelog-parun`, para eftir innihaldi).
3. Ákveða hvað gera á við 16 tóm félög, einkum Reitir (10 staðir óvirkir í þjónustulista).

Kóði: 199 sýnir ekki lengur tómt 🔥 Brunakerfisþjónusta-spjald hjá félagi sem hefur aldrei haft brunakerfi
(skjal eða reikning á neinu ári, né á áskriftarlista `brunakerfi_customers`).
