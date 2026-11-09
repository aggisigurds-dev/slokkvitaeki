# Fyrirtækjaprófíll — hönnun I (patch 500) — eiginleikaskrá og samanburður

*09.11.2026. Rofi: `?prof=2` í slóðinni (engin vafra-geymsla; slóðin heldur honum meðan flett er; vafra-staðar-vörðurinn audit-vafrastada er grænn). Aðeins Brunastál á tölvu.*
*Aðferð: framsetning eingöngu. Patch 500 les sama DOM og gamli prófíllinn teiknar og keyrir `click()` á upprunalegu takkana
(umboð). Engin skrif, enginn nýr gagnagrunnslestur, enginn hnútur fluttur frá öðrum patch.*

## 1. Skrá yfir það sem gamli prófíllinn gerir (tekin ÁÐUR en nokkru var breytt)

| Hluti | Patch | Les | Skrifar | Staða í nýja prófílnum |
|---|---|---|---|---|
| Efsta röð: Til baka, stöðuplata, Póstafrit ✕ | 405-efsta-rod | `fyrirtaeki.er_i_thjonustu`, póststillingar | Póstafrit-rofi (405/403) | ✓ Til baka + plata í haus; Póstafrit í ⋯ (umboð) |
| Merkja mikilvægt / Endurnýja | 405, 295 | — | `_imp-toggle` (mikilvægt) | ✓ ⋯-valmynd (umboð) |
| Breyta | 91/405 | `fyrirtaeki` | `fyrirtaeki` (upprunalegi glugginn, Vista) | ✓ „Breyta" í haus (prófað: opnar sama `_pm_modal`) |
| ⋯: Þjónustusamningur, Nýtt, Taka úr/Setja í þjónustu, Eyða | 405/280/281/160 | — | þjónustustaða, nýtt-merki, eyðing (Confirm) | ✓ ⋯-valmynd (umboð → sömu handlerar og Confirm) |
| Nafn, kt, K/1819/FS, Gátt-hlekkur, rekstrarfélags-flaga | 402/363/486/175 | `.co-banner-*` | — | ✓ haus (Gátt aðeins þegar 486 teiknar hlekk) |
| Heimilisfang · sími · netfang (+N) | 363/402 | `fyrirtaeki` | — | ✓ „Staður og samband"; „+N" er umboð fyrir `_anf-takki` |
| Loftmynd (Google/Já, × , 📷) | 402/co-mynd | `bygging/<id>/google-*` | 📷 hleður upp (verkbord-files) | ✓ mynd í glugga (lesin); × / 📷 / hlekkir í gamla bannernum (▸ Breyta/bæta við) |
| Hús (hæðir, m², byggt, jarðhæð/kjallari), Einingar (stigag., íb., herb., eignir), Tæki, Aðkoma, Tengiliður, Aðkoma nánar, Kóði, Merki, Afsláttur, Lánstæki | 363/411 | `app_settings.banner_upplysingar` | sama (inline-reitir) | ✓ lesið í „Húsið"/„Þjónusta og kjör"; **breytanlegir reitir óbreyttir í gamla bannernum** (takki „Breyta / bæta við upplýsingum" sýnir hann); Lánstæki sýnt hvergi (regla) |
| Athugasemd (textarea) + Sýna allt | 411 | `app_settings` | sama | ✓ í gamla bannernum (sami takki) |
| Búnaðargreining, Teikning, Hreyfingaryfirlit, Brunaáætlun, Rýmingaráætlun, Greining fasteignar | 474/405/370/464/451 | — | — | ✓ umboð: Búnaðargreining + Hreyfingar í glugga; Opna teikningu / Nánari greining / Greining fasteignar / Rýmingaráætlun / Brunaáætlun í Teikningar-flipa |
| Samskipti (286): teljarar, Svara, Nýr póstur, Póstsaga, Meira, strip, flísar, nýjasti póstur, mikilvægt | 286/359/405 | `postur` | mikilvægt-merki, svör (póstleiðin) | ✓ óbreytt kort **(ekki þrískipt — sjá „Ekki gert")** |
| Kerfi og þjónusta (flokkar, Opna) | 450 | `kerfi_*` | — | ✓ flipar „Brunakerfisþjónusta" og „Aðrar þjónustur" |
| Byggingarupplýsingar (Uppfæra, Greining fasteignar) | 468/451 | `fasteign_greining` | — | ✓ flipinn „Byggingarupplýsingar" |
| ＋ Nýr staður, + Bæta við tæki | features/404 | — | `fyrirtaeki`/`uttaeki` | ✓ flipinn „Aðrar þjónustur" |
| Hleðsluspá | 467 | `uttaeki`, skjöl | — | ✓ flipinn „Slökkvitækjaþjónusta" (sami hnútur) |
| Úttekt og skýrsla/reikningur (tækjalisti, Merkja skoðun, úttektartexti, Búa til skýrslu, verð, Klára heimsókn) | 404/412/ctc | `uttaeki`, `verkbeidnir` | allt sem fyrr | ✓ flipinn „Slökkvitækjaþjónusta" (sami hnútur) |
| Viðbótarupplýsingar (vbu) | 488 | — | — | ✓ „Slökkvitækjaþjónusta" |
| Skjöl og viðhengi (ár, skýrsla/reikningur, pörun, viðhengi, SKOÐUN-mánuður) | 403/199 | `customer_documents` | pörun, viðhengi | ✓ flipinn „Skjöl og reikningar" (sami hnútur) |
| Afslættir & verð (hópur, %, tilboðsverð) | 413 | `fyrirtaeki.afslattur_pct`, afsláttarhópar | Vista | ✓ flipinn „Sérkjör" |
| Teikningaborð (hæðaspjöld, Búnaðargreining-myndir) | 456/477/485 | `teikning_bord`, `bunadargreining` | — | ✓ flipinn „Teikningar" (sömu hnútar) |

## 2. Hver reitur í glugganum og hvaðan hann er lesinn

| Reitur | Heimild (sama og gamli prófíllinn) | Ef heimild vantar |
|---|---|---|
| Nafn / kt / merki / „Í þjónustu" | `.co-banner-name/-kt`, `.b405-plata` | — |
| Heimilisfang / sími / netfang | `.co-banner-facts` (363) | falið |
| Tengiliður | bupp-reitur „Tengiliður" (363) | falið |
| Hæðir / íbúðir / herbergi / stigagangar / m² / byggt | bupp-reitir (363, `banner_upplysingar`) | falið |
| Rekstrarfélag | flaga `[data-rf-opna]` (175) | falið |
| Afsláttur | `._bupp-afsl` (363, `fyrirtaeki.afslattur_pct`) — ekkert „á félaginu" skrifað við hann | falið ef „—" |
| Síðasta | mánuður úr `.sk-month-pill` (199) + hæsta „Yfirfarið ’ÁÁ" úr tækjalista (404) | aðeins ár ef mánuður vantar; annars falið |
| Næsta | lægsta „næsta DD/MM/ÁÁÁÁ" úr tækjalista (404) = `uttaeki.next_insp` | falið |
| Staða („Í lagi"/„N útrunnin") | **afleidd:** engin tæki með næsta < í dag ⇒ „Í lagi" | merki falið ef engin næsta-dagsetning |
| Búnaður: slökkvitæki | „N slökkvitæki" í haus tækjalista (404) | falið |
| Búnaður: brunaslöngur / reykskynjarar | flokkahausar tækjalista (aðeins ef til) | falið |
| Fyrirtækjaskrá (heimilisfang, starfsemi) | **engin heimild í prófílnum í dag** | **ÓMÆLT — falið** |
| Einingar í brunakerfi | **engin heimild** | **ÓMÆLT — falið** |
| Samningur („Í gildi") | tilraun til að lesa 403-kort reyndist óáreiðanleg (kortin bera ekki stöðu) | **fjarlægt, ekki sýnt** |

## 3. Samanburður gamalt ↔ nýtt (09.11.2026, localhost, lifandi gögn, lesið)

| Fyrirtæki | Heimilisfang/sími/netfang | Hús (hæðir/m²/stigag./íb.) | Afsláttur | Tæki | Næsta / mánuður | Niðurstaða |
|---|---|---|---|---|---|---|
| 443 Heimaleiga – Bríetartún 9-11 | = | 12 / 12.298 / 2 / 97 = | 25% = | 48 = | 01/12/2026 (DB `min(next_insp)` = 2026-12-01 ✓) · desember = | ✓ sama |
| 193 Center Hótel – Plaza (margir staðir/80 tæki í DB) | = (4 netföng +18) | 7 / – / 2 / – = | „hópur: Center Hotels" = | gamli listinn tómur við lestur ⇒ ekkert sýnt | mánuður ágúst = | ✓ sama (rekstrarfélag „Center Hótel" bætist við úr flögu) |
| 117 Hamborgara búllan (2 tæki, fá gögn) | = (aðeins netfang) | ekkert = | „—" ⇒ falið | – | – | ✓ sama, engir tómir reitir |
| 857 Heimaleiga – EA Law (úr þjónustu) | = | – | „tilboðsverð (2)" = | – | – | ✓ sama; plata „ÚR ÞJÓNUSTU" |
| 1645 Heimaleiga – Dalbrekka bílskúr | = | 8 hæðir = | 25% = | – | júlí = | ✓ sama |
| 186 Miklatorg (IKEA) | = | – | – | – | maí = | ✓ sama |

*Athugið:* tækjalisti gamla prófílsins skilaði „Engin tæki" fyrir 193/186/1645 þótt `uttaeki` hafi 80/73/16 raðir á `fyrirtaeki_id` — það er
hegðun gamla prófílsins á localhost (þekkt: listinn sækir með öðrum lykli) og nýi glugginn speglar hana. Ekki breytt hér.

## 4. Ekki gert / ósannreynt

- **Samskiptaboxið er ekki þrískipt.** Tilraun með CSS-grind á `._samskipti-card` braut núverandi uppsetningu (haus og kort eru lögð út með eigin flex/absolute); hún var dregin til baka. Núverandi Samskipti-spjald (teljarar, takkar, flísar, nýjasti póstur) er óbreytt og sýnilegt. Þrískipting krefst þess að 286 sjálfur sé aðlagaður — fyrirspurn til Agnars: má breyta 286 (eða fær 500 að teikna sitt eigið kort úr sömu gögnum)?
- **Sími (375 px) og aðrar skjástillingar:** patch 500 virkar aðeins á tölvu í Brunastáli; sími heldur gamla prófílnum.
- **Samtal-reitur (svara beint í kassanum):** ekki gerður — „Svara"-takkinn í Samskiptum er óbreyttur.
- Fyrirtækjaskrá-reitur, Rekstrarfélag fyrir fyrirtæki án flögu, einingar í brunakerfi: engin heimild, falið.
- „Skoðun — staða" er afleidd (útrunnin tæki), ekki lesin úr sérstökum reit.
- „Aðrar þjónustur" hefur enga eigin gagnalíkan í kóðanum: flipinn sýnir „Kerfi og þjónusta" (450) (sami hnútur og í Brunakerfisþjónustu) og „Nýr staður". Spurning til Agnars um hvað á að vera hér.
- Ekki prófað: vistun úr Breyta/Sérkjör/Athugasemd (engin skrif í prófi — umboð keyra sama kóða og áður), prentun, bakk-hegðun, 375 px.

## 5. Viðbót 09.11.2026 (sein): Athugasemd og regla „engu eytt"

- **Athugasemd** er ein mjó lína neðst í glugganum (✎ „Athugasemd… (vistast sjálfkrafa)"). Hún er umboð: skrifar í `.co-banner-note` og kallar á `input` svo `Companies.onBannerNoteInput(id, texti)` vistar á sama stað og áður (prófað með upptökutæki, ekkert vistað). Gamli reiturinn er áfram í bannernum.
- **Reglan „ekki eyða reitum"**: enginn reitur er fjarlægður. Hver er annaðhvort sýndur í glugga/flipa eða falinn þar til gögn eru skráð og nást þá með „Breyta / bæta við upplýsingum" (gamli bannerinn, allir reitir og takkar óbreyttir) eða í flipanum sem hann tilheyrir (kafli 1, dálkurinn „Staða"). „Samningur"-línan í glugganum var tekin út aðeins sem YFIRLITSLÍNA (óáreiðanleg lestur); samningskortin sjálf eru óbreytt í flipanum „Skjöl og reikningar".
