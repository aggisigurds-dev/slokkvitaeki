# Samræmisúttekt 2026 — tækjalisti ↔ úttektarskýrsla ↔ reikningur ↔ ársmerki

_Endurkeyrt 2026-08-29 (lestur eingöngu) ofan á úttektina 2026-08-17. Regla Agnars: ef það kemur mismatch frá einhverjum af þessum atriðum, þá þarf að skoða það sérstaklega. Hakaðu í ☐ þegar tilvik er afgreitt._

Sjá einnig `docs/LIVE-AUDIT-2026-08-29.md` fyrir öryggi, öryggisnet og heilsu vefsins.

## Samantekt

- **284 fyrirtæki teljast skoðuð 2026** (273 með þátta-skýrslu í `arsskodun_report_facts`).
- **82 fullkomlega samræmd** (allar þrjár heimildir til og stemma). Var 45 þann 17. ágúst.
- **19 með magn-ósamræmi** þar sem allar þrjár tölurnar eru til (listi A). Var 34.
- **17 án úttektar-reiknings** frá lok maí, hvorki á `customer_id` né kennitölu (listi C). Var 18.
- **1 nýtt skjal** með ranga kennitölu-pörun síðan 17. ágúst (listi E: doc 611) ofan á óleystu Pitstop/Galtalind/júlí-tilvikin.
- ATH: solur-úttektarflæðið byrjaði **29.5.2026**. „Enginn reikningur" fyrir jan–apríl er eðlilegt, ekki frávik.
- Fækkunin 309 → 284 skoðuð er að mestu nafna-pörun: tæki undir `client` sem á ekki `fyrirtaeki.nafn` (Bríetartún 9-11, Skaftahlíð 4-10, o.fl.) telja ekki með.

## A · Magn-ósamræmi (19) — allar þrjár heimildir til, stemma ekki

Raðað eftir stærsta fráviki.

| ☐ | Fyrirtæki | Kerfi | Skýrsla | Reikningur | Ósamræmi |
|---|---|---|---|---|---|
| ☐ | Þangbakki 8-10,húsfélag (1261) | 55 | 55 | **0** (2 sölur) | Reikningur kreditaður að fullu, nettó 0 |
| ☐ | Grillvagninn ehf Flugumýri 8 (641) | 21 | 21 | **58** (3 sölur) | Líklega margar starfsstöðvar á einum reikningi |
| ☐ | Vélsmiðja Orms og Víglundar - Skútuhraun (288) | 0 | 6 | **35** | Samsafnaður reikningur / tæki undir öðru client-nafni |
| ☐ | Húsf. Miðleiti 2-6 (119) | **30** | 15 | 15 | Kerfið telur tvöfalt á móti skýrslu og reikningi |
| ☐ | Pizzan - Njarðvík (621) | 8 | 8 | **14** (2 sölur) | Tvírukkun eða tvær sölur |
| ☐ | Bílabúð Benna ehf (532) | **13** | 17 | 17 | Kerfið vantar 4 |
| ☐ | E fasteignafélag v/Dugguvogur 57 (1748) | **8** | 4 | 4 | Kerfið telur tvöfalt |
| ☐ | Húsfélagið Strandasel 9-11 (1410) | 7 | 7 | **3** | 4 (líklega reykskynjarar) ekki á reikningi |
| ☐ | Húsfélagið Skipholti 50d (701) | 4 | 4 | **8** (2 sölur) | Tvírukkun? |
| ☐ | Kólus ehf (467) | 23 | 23 | **20** | 3 vantar á reikning |
| ☐ | Hólmasker (699) | 6 | 6 | **9** | Reikningur 3 umfram |
| ☐ | Miklatorg hf (Ikea) (186) | 73 | 73 | **71** | 2 vantar á reikning |
| ☐ | Kleppsvegur (710) | 23 | 23 | **21** | 2 vantar á reikning |
| ☐ | ProLan ehf. (1495) | 10 | 10 | **8** | 2 vantar á reikning |
| ☐ | Vélafl ehf (748) | 18 | 18 | **19** | 1 umfram á reikningi |
| ☐ | Viðburðarverksmiðjan (746) | 18 | 18 | **17** | 1 vantar á reikning |
| ☐ | Íslenski endurskoðendur (752) | 3 | 3 | **4** | 1 umfram á reikningi |
| ☐ | Lemon (278) | 3 | 3 | **4** | 1 umfram á reikningi |
| ☐ | Prinsinn (128) | 1 | 1 | **0** (2 sölur) | Kreditað niður í 0 |

Afskráð úr A síðan 17. ágúst (nú stemma eða vantar reikning og lenda þá á C): Steypustöðin Malarhöfði/Hringhella, Ferðafélag Íslands, Austurberg 2, Mannheimar, Verkvík, Eskivellir 5, Vélrás Álhella, Nýsmíði/Granítsteinar, Hellas, Veghús 1, Árakur 5, Kaplaskjólsvegur 65, Tannlæknastofan Bæjarhrauni, Ellý Ósk, Snóker og Poolstofan.

## C · Skoðuð 2026 en enginn úttektar-reikningur (frá lok maí) — 17

Hvorki `solur.customer_id` né kennitala fann úttektarsölu. Stærstu fyrst.

| ☐ | Fyrirtæki | Kerfi | Skýrsla | last_insp / mán |
|---|---|---|---|---|
| ☐ | Stálsmiðjan-Framtak ehf. (545) | 27 | — | 14.07 |
| ☐ | Kirkjuvellir (708) | 19 | — | 01.08 |
| ☐ | JDÓ ehf. (1611) | 15 | 15 | júl |
| ☐ | Berjarimi 1-7 (481) | 8 | 8 | jún |
| ☐ | Húsfélagið Steinhella 14 (1625) | 8 | 8 | jún |
| ☐ | ABC BARNAHJÁLP (1175) | 7 | 7 | júl |
| ☐ | Klúbburinn Geysir (381) | 4 | 4 | júl |
| ☐ | Pallett kaffihús (158) | 4 | 4 | maí |
| ☐ | Megin lögmannsstofa (222) | 3 | 3 | 18.08 |
| ☐ | Bleksmiðjan (392) | 3 | — | 01.08 |
| ☐ | Húsf. Veghús 1 (139) | 2 | 2 | jún |
| ☐ | Húsfélag Árakur 5 (145) | 2 | 2 | maí |
| ☐ | Þemasnyrting (151) | 0 | 1 | maí |
| ☐ | Steypustöðin ehf. Hólabrú Hvalfjörður (1496) | 0 | 6 | jún |
| ☐ | Húsfélagið Eskivellir 5 (377) | 0 | 0 | júl |
| ☐ | Húsfélagið Njálsgata 87 (723) | 0 | 0 | ágú |
| ☐ | Húsfélagið Írabakki 26 (751) | 0 | 0 | jún |

Féll af C síðan 17. ágúst (reikningur finnst nú, eða kt-pörun): Brynja Sléttuvegur 7, Skaftahlíð 4-10, Austurberg 20/2, Bílabúð Benna Fiskislóð, Heimaleiga Freyjugata 16, RB Rúm. Heimaleiga og Center-staðir rukkast á móðurfélag og teljast því ekki hér.

## E · Röng kennitala á skjali

Nýtt síðan 17. ágúst merkt **NÝTT**. Eldri óleyst halda sér. 85+ eldri tilvik merkt „TILLAGA" / „ótengt" í notes eru ekki talin.

| ☐ | Doc | Fyrirtæki | Ár | Kt í skjali | Eigandi kt |
|---|---|---|---|---|---|
| ☐ | **611 NÝTT** | Sléttahraun 19-21 (735) | 2026 | 491209-1270 | Vélrás / VR-5 (fleiri starfsstöðvar sama kt) |
| ☐ | 656 | Pitstop þjónustan (543) | 2026 | 540994-2269 | Aðalskoðun — endurtengt 17.07 en ber enn ranga kt |
| ☐ | 6068 | Galtalind 13-15 (684) | 2026 | 710797-2429 | Finnst ekki — „Galtarlind", líklega annað húsfélag |
| ☐ | 1545 | VR-5 ehf. (470) | 2025 | 912091-2709 | Finnst ekki |
| ☐ | 1720 | Jaðarleiti (704) | 2025 | 611117-0109 | fyrirtaeki segir 611117-0190 — stafavíxl |
| ☐ | 2112 | Skaftahlíð 4-10 (848) | 2024 | 671178-0159 | Tvær fyrirtaeki-raðir sama húsfélags með sitt hvora kt |

Óleyst úr júlí-yfirferð: doc 485 (Árakur 5 ↔ Breiðvangur 9), doc 752 (Kjarrhólmi 8 ↔ 4), doc 809 (Bæjarhraun ↔ Prófíll).

## Ópöruð tækjanöfn (teljast ekki inn í 284)

`uttaeki.client` án `fyrirtaeki.nafn` (status ≠ urelt): **Bríetartún 9-11 húsfélag** (48) · **Húsfélag Skaftahlíð 4-10** (27) · Húsfélagið Álftamýri 36 (7) · Indverska matarfélagið ehf (3) · Heilsuvitund Sjúkraþjálfun (2) · Agnar Sigurðsson (1) · `sdfasdf` (1, rusl) · 4 tæki með tómt client.

## Forsendur

Tæki = `uttaeki` status ≠ urelt; nafntenging `lower(trim(client)) = lower(trim(fyrirtaeki.nafn))`, `deleted_at IS NULL`, tvítekin nöfn → lægsta id. Skýrsla = `arsskodun_report_facts.total_devices` fyrir `report_year = 2026`. Reikningar = `solur` `vidskiptategund='uttekt'` `status≠void`; þjónustulínur = `desc` byrjar á Yfirferð/Hleðsla/Nýtt (ekki akstur/skýrslugerð); kredit dregst frá (neikvætt magn). Listi A krefst allra þriggja talna. Listi C: engin úttektarsala á `customer_id` **né** kennitölu, og skoðun í maí eða síðar. Rekstrarfélaga-reikningar á móðurfélagi birtast ekki hjá starfsstöð (skýrir Grillvagn/Vélsmiðju). Skjala-kt er dregin úr `customer_documents.notes` með `\d{6}-\d{4}`; aðeins óflögguð.
