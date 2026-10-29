# Óskoðað fyrir Aksturslista — 29.10.2026

Lestur eingöngu: ég breytti engu í þessari yfirferð (nema leiðréttingunni á Grandi, sjá neðst). Gögn: `fyrirtaeki` (1.247 lifandi),
`app_settings.arsskodun_customers` / `brunakerfi_customers` (skoðunarmánuður = `inspect_month`), `uttaeki` (virk tæki = staða ≠ úrelt),
`solur`, `customer_documents`, opin mál á Þjónustuborði (`thjonustubeidni`).

## 1. Tölur

| Hópur | Fjöldi |
|---|---|
| Félög án skoðunarmánaðar (hvorki slökkvitæki né kerfi) | 615 |
| Félög án virkra tækja | 593 |
| **Hvort tveggja: án mánaðar OG án tækja** | **572** |
| — þar af EKKI í þjónustu (`er_i_thjonustu` = false) | 531 |
| — þar af MERKT í þjónustu | **41** |

### 531 sem eru ekki í þjónustu
| Flokkur | Fjöldi | Mín lesning |
|---|---|---|
| Engin sala, engin skjöl, engin tæki (tómar skeljar) | 329 | Dauðar færslur (flestar stofnaðar apr–ágú 2026 við innflutning; 151 með engin skjöl af neinu tagi). Engin ástæða til að þær séu á Aksturslista. Tillaga: leyfa Natalie að leggja til samruna/eyðingu, ekkert sjálfvirkt. |
| Sala 2025–26 en engin úttektarskýrsla | 177 | **Búðarsala** (hleðsla/kaup í búð), ekki þjónustukúnnar. Eiga ekki á Aksturslista. |
| Úttektarskýrsla fyrir 2025 (eldri) | 22 | Voru í þjónustu áður, farin. Ekki á Aksturslista nema þú viljir ná þeim til baka. |
| Úttektarskýrsla 2025–26 en engin tæki skráð | 1 | Skoða: þjónustuð en tækjaskrá tóm. |
| Aðeins brunakerfis-/slökkvikerfisskjöl | 2 | Kerfi, ekki slökkvitæki. |

### 41 sem eru MERKT í þjónustu en hafa hvorki mánuð né tæki
**A. Búðarsala með „í þjónustu"-merki (engin skýrsla, engin tæki) — 17 (+ Akrotiri sem er brunakerfi), líklega ranglega merkt:**
Húsfélag Hjallabraut 3 (#154, 1 sala) · KAT ehf. (#177) · Armar Vinnulyftur (#507) · Hugheimur (#509) · Skeljungur (#516) · GTS (#523) ·
Véltindar (#528) · Hópferðir GÞ (#529) · Höldur (#530) · Local Guide (#577) · Björgunarsveit Hafnarfjarðar (#789) · Blikksmiðurinn (#792) ·
Bílaverkstæði Jóhanns (#807) · Meistaralagnir (#1218, staða „óvirkur") · Tveir hressir (#1248) · Fjörukráin (#1589) · Reising Byggingarfélag (#1624) · Akrotiri (#1830, brunakerfi 2026).
Sama mynstur og Teitur Jónasson #169 og Hagvagnar þjónusta #547 (afskráð 20.10: „sala/tæki er ekki þjónusta").
*Þarf ákvörðun Agnars:* hver þeirra er í raun árlegur þjónustukúnni (t.d. Skeljungur, Höldur, Fjörukráin gætu átt tæki sem aldrei voru skráð)?

**B. Hafa SKÝRSLU en tækjaskrá tóm — þetta eru raunverulegir þjónustukúnnar, vantar bara skráningu:**
Suðurvangur 19 húsfélag (#512, skýrsla 2024, „tekið út 2026") · Drífa ehf (#602, skýrsla 2025) · Miðleiti 8,10 og 12 (#648, skýrsla 2024) · Sætoppur ehf (#1828, skýrsla 2025).
Úr skýrslunni má lesa mánuð og tækjatölur (`arsskodun_report_facts`/skjalið) — ég get lesið PDF-in og lagt til tæki og mánuð, ekkert skrifað fyrr en þú samþykkir.

**C. Engin saga (engin sala, engin skjöl) — 17:**
Lindaberg (#603) · D27 ehf (#776, `subscribed` false) · Húsfélagið Kjarrhólmi 18 (#1630, opið mál #807 án texta) · Danshöllin (#1633) og Reykjaklettur (#1635) — aðeins samningur 2025, engin þjónusta skráð ·
Rentur Fagraberg 18 (#1637, enginn kt) · Cafe Catalina (#1845) · Reitir fasteignafélag (kt 711208-0700) — 10 staðir #1854–#1863 (8 „óvirkir", 2 „virkir": Hilton Nordica #1857 og Dalshraun 1 #1861).
Reitir er rekstrarfélag/eignaumsjón: *vantar að vita hvað við gerum fyrir þá* (slökkvitæki? kerfi? ekkert?) áður en nokkuð fer á Aksturslista.

**D. Staðir með sölu en engin tæki:** Vélrás – Gullhella (#1740, 12 sölur 2026) og Center Hótel – Hlaðvarpinn (#1750, 11 sölur) — Hlaðvarpinn er staður brunakerfis (mál #954), Gullhella gæti átt 9 tækin úr ágústskýrslu Vélrásar (óstaðfest).

## 2. Opin mál þar sem stendur að bóka tíma / senda á þá
(úr opnum málum á Þjónustuborði og athugasemdum á félögum; „nytt" = ekki afgreitt)

**Bóka tíma / fara á staðinn**
- Stefán Magni Árnason — mál #1111, „Árleg yfirferð slökkvitækja": hann samþykkti 30.09 → bóka.
- Bílabúð Benna, Fiskislóð 41 — #1245 (laga brunastöðina) og #1339 (brunaþéttingar, vill verð).
- Húsfélag Dofrahella 2a–2e — #815 „Fara Dofrahella 2a-2e, úttekt þjónusta".
- Suðurvangur 10-12-14 — #1069 „eigum eftir að fara þangað, eru ekki á skrá".
- NR5 ehf, Lautargata 5 — #805 nýr samningur 2026, fyrsta úttekt.
- Tunguvegur 19 — #749 klára úttekt (1 léttvatn, nýtt heimilisfang, áður Stakkholt 3).
- Stararimi 53 — #674 vantar 3 ný tæki + uppsetning + teppi; **hringja í Björgu (6951284) áður en farið er**.
- Ásdís Ingólfsdóttir, Skipalón 16 — #726 setja upp 2–3 reykskynjara + sækja og hlaða tæki frá 2008.
- Miðhraun 15 (sale@varma.is) — #497 „kíkja á föstudaginn kl. 9".
- Stórhöfði 29, Kristófer 856-5524 — #675 hringja (enginn kúnni í kerfinu, líklega nýtt lead).
- Irent ehf — #808 hringja til baka (6165444), hvaða þjónustu hann er í.
- Ránargata (Three Sisters) — #678 senda póst hvort við getum komið fljótlega (brunakerfi).
- Húsfélagið Kjarrhólmi 14 (#774) — athugasemd: „eftir að senda gamlan reikning"; eldra mál (hringja í Rakel 8633025, bóka árlegt eftirlit + 7 reykskynjara, tilboð 71.355 kr) er skráð lokað.
- Stofna í kerfið + fylla úttekt (nýir staðir, ekki til í kerfinu): Goddi #767 · RB Rúm Skúlagötu 20 #762 · Húsfélag Sléttuvegur 2 #765 · Ranveig bílakjallari #766.
- Gullhamrar veitingar (#465) — banner: „senda á til að hitta" (vantar hvað).

**Senda á þá (skýrsla / reikningur / tilboð)**
- Ferðafélag Íslands #801 (sola@fi.is) og Hjálparsveit #802 (sandra.yr.andresdottir@hssk.is) — senda tilbúna úttektarskýrslu.
- Norðurbrú 1 húsfélag (#1733) — banner: „senda á þá, er innaní íbúðum"; mál #963: 13 tæki skoðuð 31.08 en engin skýrsla/reikningur.
- Klúbburinn Geysir #964, Pallett kaffihús #966 — skýrsla til en enginn reikningur (drög bíða samþykkis).
- AGES ehf #699 — vill gamla reikninga, gæti komið aftur í þjónustu. S&H Invest #20 — reikning á eiganda. Gjörvaverk #492 — reikning rafrænt. Hverfisgata 82 #694 — vilja skýrsluna.
- Tilboð: Þórarinn Gunnarsson #520 (6 duft + 1 CO₂) · Oddafell #477 (22 tæki + 1 duft) · Ármúli 32 #672 (brunakerfi) · Búseti #1227 · Brynja leigufélag #1228/#1204.

## 3. Hvað vantar að vita til að setja á Aksturslista
1. **Hverjir af 17 í hópi A eru raunverulega þjónustukúnnar?** Hinir fara úr þjónustu (afturkræft). Natalie tekur engan út sjálf.
2. **Hópur B (4 félög):** má ég lesa skýrslurnar og leggja til tæki + mánuð? Mánuður = mánuður síðustu skoðunar, aldrei færður.
3. **Reitir (10 staðir):** hvað gerum við fyrir þá?
4. **Opnu málin hér að ofan:** vantar oftast tengilið/tíma, ekki gögn — þau eru ekki félög án tækja heldur nýir eða óskráðir staðir.
5. **329 tómar skeljar:** leggja til samruna/eyðingu í Natalie-lotu (engin sjálfvirk lokun).
6. Af 615 félögum án mánaðar eru 43 með tæki en engan mánuð — það eru þau sem stoppa Aksturslista næst; ég á eftir að lista þau.

## 4. Mín mistök í lotunni (leiðrétt)
Prófun á skýrslu Grandi (#197) á staðbundnum þjóni skrifaði skoðunarmánuðinn 10 (október) í `arsskodun_report_facts` og í `arsskodun_customers[197]`
(ReportFactsSync keyrir við hverja opnun skýrslu, líka með stubbaðri upphleðslu). Settur aftur á 1 (janúar) 29.10 kl. 16:13.
**Aldrei opna skýrslu (168) á lifandi gögnum til prófunar án `CIR_VIDBOT.month`.**

## 5. 43 félög með tæki en ENGAN skoðunarmánuð (þau stöðva Aksturslista næst)
Tillaga um mánuð = mánuður `last_insp` tækjanna (regla Agnars: mánuður síðustu skoðunar, aldrei færður). Óstaðfest — dagsetningar sem enda á „-01" geta verið upphafsgildi; ég skrifa engan mánuð fyrr en þú samþykkir.

**22 í þjónustu (þessi skipta máli):**
Heimaleiga – Máni Apartments #869 (54 tæki, síðast 10.2025 → **10**) · K Apartments #1413 (41, 12.2025 → **12**) · Soffía Jónsdóttir #637 (16, 02.2024 → 2, gamalt) ·
Flétturimi 10 húsfélag #784 (13, 03.2023 → 3, gamalt) · Vélsmiðja – Kaplahraun #1629 (12, 11.2025 → **11**; sjá pörun) · Fríkirkjan Kefas #1846 (11, 09.2026 → **9**) ·
Nesdekk, Dalshraun 10 #1853 (10, 10.2026 → **10**) · Laugavegur 42 (Iðun) #835 (10, 02.2026 → **2**) · Menja ehf #1531 (9, 06.2025 → 6) · Steypustöðin – Hólabrú #1727 (6, 01.2026 → **1**) ·
BGT ehf #1642 (6, skýrsla 01.08.2026 → **8**) · Stakkholt ehf #1172 (5, 09.2026 → **9**) · Gerð ehf #795 (5, 11.2024 → 11, gamalt) · Stálskip #1623 (4, 07.2026 → **7**) ·
Vélrás – Sléttuhraun #1741 (4, 04.2026 → **4**) · Þvottahúsið A. Smith #1264 (4, 01.2023 → 1, gamalt) · Pitstop þjónustan #543 (4, 09.2026 → **9**) · Ingi Már Björnsson #1208 (2, 02.2026 → **2**) ·
Eyesland Spönginni #1735 (1, 06.2025 → 6) · Ragnheiður B Valgarðsdóttir #1737 (1, 02.2025 → 2) · Móðurást #803 (1, 04.2026 → **4**) · Húsfélag Laufvangur 18 #1151 (1, 03.2026 → **3**).
Feitletrað = skoðun 2026 (mánuðurinn er nýlegur og áreiðanlegastur); hin eru frá 2023–2025 og gætu verið úrelt.

**21 ekki í þjónustu** (flest með `last_insp` 20.04.2026 = magnuppfærsla): Hótel Atlantic apartments #1301 (32) · Hagvagnar þjónusta #547 (20, búðarsala skv. Agnari 20.10) ·
Hlíðablóm #1312 · Eskihlíð #1283 · Blástur og málun #1173 · Húsfélag Kaplahrauni 1 #1303 / 13 #1295 · Breytir #1289 · Test fyrirtæki #1404 · Húsfélag Dalshrauni #1308 · Hress hf #1269 ·
Teitur Jónasson #169 (afskráður) · Arkbing #1290 · Húsfélag Flatahrauni 5b #1309 · Suðurvangur 8 #1803 · Sextett #1288 · Greiðan #1310 · Háaleitisbraut 58-60 #1296 · Fótaaðgerðastofa #1282 · María Ingibjörg #1736 · Nielsen #1278.
Þetta eru tæki sem kerfið geymir en félagið er ekki í þjónustu — *spurning:* eiga tækin að standa eða eru þetta sótt/seld tæki?
