# Heimaleiga — fact sheet (staða 02.11.2026)

Fundurinn **28.10.2026 kl. 9:30** (Grensásvegur 7, 3. hæð; Eva + Erna) var haldinn: #1258 lokað 29.10 („staðfestur og liðinn; svarað 28.10"). **Hvað var sagt á fundinum er ÓMÆLT** — engin fundargerð í kerfinu.
Undirbúningsgögn: `ut/heimaleiga-fundur-20261028/` (varnarblad, fundarprepp, baeklingur, ef-thau-spyrja). Gátt: `?c=heimaleiga-ehf`, stutt slóð `/heimaleiga` og `/g/<slug>`.

## Gátt (mælt 02.11.2026)
- 28 reikningar í gátt (JSON `/api/gatt?c=heimaleiga-ehf`). `portal_users.heimaleiga-ehf`: **pass_hash = null** → gáttin er opin án lykilorðs; `falin_reikningar = [R-107909]`.
- Agnar 27.10: „Heimaleiga heldur læsingu (lykilorð)" — ekki virkjað enn. **Læsa aðeins þegar hann segir það** (var læst fyrir mistök 27.10, opnuð aftur). Starfsfólk okkar þarf aðeins innskráningu á slokkvitaeki.netlify.app.
- Kerfi-dálkur, „Óskráð kerfi"-sía og Áætlun-dálkur Kostnaðaryfirlits voru teknir út (Agnar 27.10). Kostnaðaryfirlit sýnir 3 ár (2024–2026): 2023-reikningar (G14 R-104402/104403 + R-104473, alls 267.934 kr) sjást þar ekki — **ekki spurt/ákveðið** hvort 2023-dálkur eigi að koma (`gatt/vidbot.js` `kostnadurPerEign`, breytir ÖLLUM gáttum).
- Sérlén `gatt.brunaholf.is` á Netlify-verkefninu **brunaholf-gatt** beið DNS hjá hýsingar.is (27.10). Aldrei setja sérlén á slokkvitaeki-verkefnið (sjá minni project_gatt_heimaleiga_greining_20261025).

## Grunnur
- Höfuðfélag `customers_base.id` 293, kt **510117-0690** (`rekstrarfelag='Heimaleiga'`). Hópurinn (`baseHopur`):
  303 SAB ehf. (510496-2489) · 308 G14 ehf (510809-0170) · 394 Bríetartún 9-11 · 676 S&H Invest (Laugavegur 46) · 681 EA Law Practice ·
  769 Mannheimar · 784 Aegina (Icelandic Apartments) · 866 S30 (Ármúli 13A) · 1210 Eldsalir (Hamraborg 7). S&H og S30 hafa eigin gáttir.
- 18 byggingar í gátt (Blue Montain Urðarhvarf 2, Icelandic Apartments Urðarhvarf 4, Dalbrekka 4-6 + bílskúr, Máni Laugavegur 18,
  Midtown Vegamótastígur 9, Ice Apartments Laugavegur 1, Iceland Comfort Hamraborg 7, Freyjugata 16, Mannheimar Grettisgata 62, G14/Höfuðstöðvar
  Grensásvegur 14, Bríetartún tvö, Laugavegur 42 húsfélag (Iðun), Hamraborg 7 jarðhæð Eldsalir …).
- Samningskjör (portal `stillingar.serkjor`): yfirferð 2.700, hleðsla 4.400, slanga 2.500, skýrslugerð 3.500, akstur 3.000 (án vsk); ný tæki 25 % afsláttur.
  2026 reikningar nær alveg á þessu; frávik 12.020 kr án vsk á sex reikningum (CO₂ 5 kg 3.270, slöngur 2.700, R-001053/R-001109 skýrslugerð 5.600/akstur 3.600).
- **G14 ehf. ≠ Heimaleiga.** G14 ehf. (Aflakór 3 Kóp.) á húsið Grensásvegur 14, með eigin brunakerfissamning (16.03.2026, skjal 2160) og reikninga 2023/2024/2026 á eigin kt. Heimaleiga er LEIGJANDI (Höfuðstöðvar, samningur 07.11.2024, skjal 10343). Tvær skráningar í sama húsi halda sér (Agnar 27.10: „held G14 áfram"). `tools/sameina-stad.cjs` neitar (ólíkar kt). Hvort G14 eigi að vera í gáttarhópnum og taka 2 slöngur af Höfuðstöðvum = **#1344, ákvörðun Agnars, ekkert breytt**. Skoðunarmánuður G14 færður 11→2 (feb) 02.11 eftir ósk Agnars (afrit `backup_20261102_g14_stigahlid`); Höfuðstöðvar halda ágúst.

## Reikningar og skýrslur
- 28 reikningar í gátt (2023 3 · 2024 2 · 2025 9 · 2026 14), allir greiddir. Stólpi-saga kt 510117-0690 hefst 18.06.2025 (R-106967).
- Falið viljandi: **R-107909** (Laugavegur 42, 66.176). **Agnar 27.10: ekki kreditfært** — tvírukkunin „var að öllum líkindum gerð upp við fyrri eigendur"; kreditfæra STRAX ef Heimaleiga nefnir það. #1289 lokað 29.10. R-107909 er Stólpa-reikningur, ekki í `solur`. Kreditpör R-107254/107299, R-107256/107266, R-107758/108129 sýnd ekki.
- G14 „opið við yfirtöku" = greitt (fyrri eigandi tók við).
- 2023: G14 R-104402/104403 · **R-104473 SAB ehf. 159.820 kr → Blue Montain** (skjal 10342, pörun ályktuð, ekki sönnuð á krónu). Kt 510496-2489 er eigandi Urðarhvarfs 2 (erindi #1323: U2 ehf, grunnurinn SAB ehf.); póstur 17.11.2023 við Albert Sveinsson; skýrsla des 2023. Reikningurinn er til EIGANDA hússins, ekki Heimaleigu.
- Skýrslur: 2023 Blue Montain (36 tæki + 5 slöngur, des 2023), Icelandic Apartments (51 tæki, jún 2023), G14 (brunakerfi nóv 2023), Höfuðstöðvar 859 (er í raun G14-brunakerfisskrá); aðrar byggingar frá 2025/2026.

## 2024 — „voru ekki fleiri en G14?" (mælt 29.10, Agnar efaðist)
Stólpi er heill fyrir 2024 (1.584 reikn.). Á kt hópsins aðeins G14 R-106012/R-106013 (25.11.2024, á G14 ehf.). Heimaleiga hafnaði verðum 11.09.2024 (Eyþór Ingason 18.09: „fengu betra tilboð annarsstaðar"); Sölvi bað um samning fyrir Grensásveg 14 07.11.2024 og sagðist hafa ~500 íbúðir, vildi aðeins verð. Fyrsti reikningur á Heimaleigu ehf. 18.06.2025. Eldri vinna: Grettisgata 62 des 2022 (docx í Drive 1l0tk0fHRD-3qNUuD0r2LFkVWXJu8H-36, ekki í kerfinu), Icelandic Apartments 26.06.2023 (hugsanlega Volt ehf. R-103884 203.220 kr sama dag — ÓTENGT, óstaðfest). **Eina leiðin til að þetta sé rangt: bygging rukkuð á kt eiganda utan hópsins (eins og R-104473)** — beðið um byggingar-/eigandanöfn frá Agnari, ekkert svar enn.

## Opið (Þjónustuborð, mælt 02.11)
- #1290 Midtown/Máni = sama hús (Laugavegur 18), ~50 tæki tvítalin — nytt, Agnar.
- #1319 Stólpi mars–maí: 87 reikn. „greidd" með ~81 % — nytt, Agnar.
- #1329 Bríetartún greitt tvisvar (~122.659 kr) — nytt, uppfært 01.11; bankayfirlit 0528-26-006005 (jan–jún 2026) vantar enn.
- #1344 G14 slöngur · #1374 4 hús (131 tæki) áttu að fara í skoðun í október — nytt.
- #1308 Verð og kjör, #1311 slanga Ármúli 13 — „svarað" (ekki lokað; engin staðfesting á að slangan hafi verið uppfærð).
- Hvort SAB-pörun við Blue Montain á að standa (spyrja Albert/Dimku um hleðslur).
