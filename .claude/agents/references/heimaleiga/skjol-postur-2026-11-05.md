# Heimaleiga-hópurinn — skjöl, póstur, samskiptasaga og Þjónustuborð

Lesaðeins-rannsókn 05.11.2026. Heimildir: Supabase (email_digest, postfang_tengsl, samskipti_tengd, samskipti_stada, postsaga_otengd, contact_log, customer_info, cowork_postsvor, email_actions, sms_saga, customer_documents, document_pairs, tilbod, thjonustusamningar, thjonustubeidni, customers_base, fyrirtaeki) og Google Drive (search_files). Engu breytt.

Kennitölur/viðskiptavinir (customers_base.id → fyrirtaeki.id):
- 293 Heimaleiga ehf 510117-0690 → 269 Höfuðstöðvar Grensásvegur 14 · 1483 Blue Mountain (Urðarhvarf 2) · 869 Máni · 1486 Midtown Hotel · 1488 Iceland Comfort (Hamraborg 7) · 1484 Ice Apartments (Laugavegur 1) · 443 Bríetartún 9-11 íbúðir · 1485 Freyjugata 16 · 1621 Dalbrekka 4-6 · 1645 Dalbrekka 4-6 bílskúr
- 784 Aegina ehf 681013-0830 → 1622 Icelandic Apartments (Urðarhvarf 4)
- 394 Bríetartún 9-11 húsfélag 540119-0660 → 1487 (sameign)
- 681 EA Law Practice 650222-0400 → 857 (greiðandi f. Freyjugötu, ekki verkstaður)
- 1210 Eldsalir ehf 491117-1840 → 1851 Hamraborg 7 jarðhæð
- 308 G14 ehf 510809-0170 → 204 (húseigandi Grensásvegar 14; brunakerfi + úttekt)
- 769 Mannheimar ehf 680169-6409 → 626 Grettisgata 62 (TYR Apartments)
- 676 S&H Invest ehf 641115-0100 → 305 Laugavegur 46 (46heima)
- 866 S30 ehf 711096-2059 → 243 Ármúli 13A
- 303 SAB ehf 510496-2489 → enginn fyrirtaeki-staður. ATH: Guðmundur Ásgeirsson (landstakkur.is) sagði 28.05.2025 að eigandi Urðarhvarfs 2 héti „U2 ehf. kt. 510496-2489" — sama kt og SAB ehf í grunninum. Reikningur R-104473 (des 2023, Urðarhvarf 2) var á þá kt.
- 586 Húsfélagið Laugavegi 42 611096-2599 → 835 Iðun apartments (rekstrarfelag=Eignaumsjón en contact_email dimka@)

---

## A) PÓSTUR OG SAMSKIPTASAGA

### A.0 Fjöldi og umfang

email_digest, leit: sender/to inniheldur heimaleiga.is EÐA subject/body/snippet nefnir Heimaleig*/Dimka/Máni/Midtown/Blue Mountain/Icelandic Apartments/Iceland Comfort/Ice Apartments/S30/Bríetartún/Dalbrekka/Eldsalir/Aegina; account ≠ aggisigurds@gmail.com.

| Hólf / mappa | Treffir | Þar af Heimaleigu-tengt | Fyrst | Síðast |
|---|---|---|---|---|
| eldklar@eldklar.is / INBOX | 170 | ~136 | 2022-05-13 (Bríetartún 11) | 2026-11-04 |
| eldklar@eldklar.is / SENT | 73 | 73 | 2025-09-01 | 2026-11-02 |
| bokhald@eldklar.is / SENT | 1 | 1 | 2026-06-03 | 2026-06-03 |

34 INBOX-treffir eru hávaði frá Eignaumsjón um önnur húsfélög (Álftamýri, Stakkholt, Jaðarleiti, Kríuhólar, Kórsalir, Flétturimi, Jörfabakki, Álfaskeið, Tungusel, Kirkjulundur, Stigahlíð, Gullsmári, Eskivellir, Dalbrekka 2-14, fréttabréf 2019–2025) — sleppt úr tímalínu.

Gloppur í digest: SENT nær aðeins frá 01.09.2025 (eldra: svör Þórðar 2024–25 sjást bara í tilvitnunum). Vantar í INBOX pósta Dimku 02.04.2026, 08.04.2026 (pöntun Dalbrekka 4-6), 09.04.2026, 14.04.2026, 30.04.2026 og 04.05.2026 (sjást aðeins í tilvitnunum í SENT). Payday-reikningspóstur 05.10.2026 („Reikningur") er ekki í SENT.

postfang_tengsl: 236 tengingar á @heimaleiga.is (dimka, vidhald, eva, erna, solvi, robert, asgeir, eythor), fyrsta 24.11.2022, síðasta 04.11.2026 — samsvarar email_digest, engin viðbót.

Hver er hver hjá Heimaleigu (úr póstum):
- Dimka Dimitrova, Operations Coordinator (dimka@ og vidhald@heimaleiga.is, 449 4949) — pantar skoðanir, gefur aðgangskóða, segir hver greiðir hvern reikning, biður um skýrslur.
- Eva Mareksdóttir (eva@) — samskipti við Slökkvilið (mál 25-6977), verð/kjör, fundur 28.10.2026, samþykki tilboðs 04.11.2026, undirritun skýrslna.
- Erna Ósk Ingvarsdóttir, COO/rekstrarstjóri (erna@, 691 9687) — tilboð í yfirfærslu 2025, skýrslur til slökkviliðs, spurði um neyðarlýsingu/rennihurðir/rýmingaræfingu.
- Sölvi Melax, CEO (solvi@, 848 2696) — þjónustusamningur Grensásvegur 14 (2024), ákvað 26.01.2026 að Heimaleiga greiði Bríetartúns-íbúðaúttektina.
- Róbert Melax (robert@) — Urðarhvarf 2 2025, varatengiliður í fríi Ernu.
- Eyþór Ingason, Maintenance Specialist (eythor@, 662 6580) — verðfyrirspurn 2024, tók öðru tilboði.
- Ásgeir (asgeir@) — Grettisgata 62, nóv 2022.
- Utan Heimaleigu: Guðmundur Ásgeirsson gudmundur@landstakkur.is (eigandi Urðarhvarfs 2), Alvin alvin@fylgi.is (bókhald Aegina), Ingi Guðjónsson ingi@kaskur.is (Eldsalir), v@waterfrontconsult.com (S&H Invest), mannheimar.ehf@gmail.com, gjaldkeri@eignaumsjon.is (Bríetartún 9-11 húsfélag og Húsfélagið Laugavegi 42).
- Okkar megin: Haukur, Þórður (til feb 2026), Axel (2022), Frank Höybye (apr 2026), Elías (maí 2026), Agnar (júl–sept 2026), Bjarndís Sól Helenudóttir (okt–nóv 2026).

### A.1 Tímalína (dags · hólf/mappa · frá → til · efni · inntak) — heimild [digest] nema annað sé tekið fram

2022
- 2022-05-13 · eldklar/INBOX · Willig@simnet.is → eldklar · Re: Skýrsla · Haukur sendi „skýrsluna vegna íbúða í Bríetartúni 11" (Bríetartún 11.docx); Willi þakkar. 24.05: Willi hefur „fengið öll leyfi", biður um 2 tæki + eldvarnarteppi í Haukanesi 6 (ótengt).
- 2022-11-24 · INBOX · asgeir@ → eldklar · Yfirferð slökkvitækja Grettisgötu 62 · ≥10 tæki, frestur hjá slökkviliðinu; bæði gangur og íbúðir; mæla sér mót með dags fyrirvara. Axel býður þriðjudag kl 10 → „Flott, stefnum á það."

2024
- 2024-09-11 (tilvitnun) · SENT (ekki í digest) · Þórður → eythor@ · Verð á þjónustu · VERÐ: yfirferð léttvatn 6L 2.600 · hleðsla 4.600 · yfirferð brunaslöngur 3.300 · ný tæki 20% afsl · akstur 3.600 · skýrslugerð 3.500 (án vsk) — „sömu verð og stóru hótelkeðjurnar".
- 2024-09-18 · INBOX · eythor@ → eldklar · Re: Verð á þjónustu · „við fengum betra tilboð annarsstaðar og munum því taka því."
- 2024-11-07 · INBOX · solvi@ → eldklar · Þjónustusamningur fyrir Grensásveg 14 · óskar þjónustusamnings um slökkvitæki og brunaslöngur, kaupandi Heimaleiga ehf 5101170690, tækin nýyfirfarin, næsta skoðun september 2025. 12:49 „Hvernig á ég að staðfesta?" 13:25 sendir undirritað (IMG_1842.jpg) → customer_documents #10343 (samningur 2024).
- 2024-11-07 · INBOX · solvi@ → eldklar · Samstarf og verðskrá · ~500 íbúðir í skammtímaleigu; biður um verð „ef/þegar til skipta kæmi". Svar fannst ekki í digest.

2025
- 2025-05-28 · INBOX · gudmundur@landstakkur.is → eldklar, robert@ · Urðarhvarf 2 · úttekt á tækjum og slöngum; félagið U2 ehf kt 510496-2489; sími 862 0182.
- 2025-06-04 · INBOX · robert@ → dimka@ (cc eldklar) · Re: Fw: Vegna máls nr 25-3955 - Urðarhvarf 2 · Þórður skoðar öll tæki í BMA, þarf aðstoð runners; Dimka samhæfir, tímakóði fyrir íbúðir eftir kl 10 daginn eftir.
- 2025-06-04 · INBOX · erna@ → eldklar · Tilboð í yfirfærslu · TILBOÐSBEIÐNI: tvær byggingar með útrunnin tæki — ICA Hamraborg 7 (~40 herbergi + ~14 sameign) í forgangi, og Midtown Hotel + Máni (Laugavegur 18B/Grettisgata 7, ~70 herb.).
- 2025-06-05 · INBOX · erna@ → eldklar, dimka@ · Re: Tilboð · „Frábært takk og samþykkt" — tilboð Þórðar (texti ekki í digest) SAMÞYKKT; Dimka ráðstafar, forgangur ICA. 06.06 „Glæsilegt, takk!"
- 2025-06-17 · INBOX · dimka@ → erna@/eldklar · Re: Tilboð · hvenær verður heimsóknin? 18.06: föstudag fyrir bæði Hamraborg 7 og Laugaveg 18B; aðgangskóðar gefnir; byrja eftir kl 10.
- 2025-06-30 · INBOX · erna@ → eldklar · Re: Tilboð · biður um skýrslu fyrir Urðarhvarf 4 til slökkviliðs; spyr um eldvarnarteppi. 01.07 Þórður (tilvitnun): Urðarhvarf 2 búið (ekki 4), Hamraborg klár, Laugavegur búinn, skýrslur koma í vikunni, seljum eldvarnarteppi. 02.07 Erna: farið þið í Urðarhvarf í næstu viku? fóruð þið yfir sameign ICA (öll tæki að renna út skv. eigin eldvarnareftirliti)?
- 2025-07-07 (tilvitnun) · Þórður → Erna · skýrsla Hamraborg 7 send; Laugavegur á morgun.
- 2025-07-09 · INBOX · erna@ → eldklar, vidhald@ · Re: Skýrsla fyrir Hamraborg 7 · biður um Urðarhvarf 2 líka (ruglar svo saman — vill skýrslu BMA Urðarhvarf 2); SPYR hvort við sjáum um: leiðar-/neyðarlýsingu (vantar staðfestingu á prófun), rennihurðir/rafmagnshurðir (vantar þjónustusamning og staðfestingu á virkni við straumrof/eldboð), rýmingaræfingu (óskjalfest). Svar við þessu fannst ekki í digest.
- 2025-07-11 · INBOX · erna@ · minnir á BMA-skýrslu; 20:43 „Snilld takk fyrir" — BMA Urðarhvarf 2 skýrsla komin; Þórður í sumarfrí, Dimka tekur við.
- 2025-07-15, 07-16, 08-13 · INBOX · dimka@ → eldklar · ítrekar (×3) hvenær Urðarhvarf 4 verði skoðað; Erna í fríi til 11.08 (Róbert varamaður).
- 2025-08-14 · INBOX · vidhald@ → eldklar · Yearly inspection … Grensásvegur 14 · árleg skoðun höfuðstöðva. Sama dag staðfestir Dimka: Urðarhvarf 4 mán 18.08 kóði 10385# og Grensásvegur 14 18.08 — „Please bill to Heimaleiga ehf. (5101170690)"; leiðréttir svo: Urðarhvarf 2 Icelandic Apartments, „billing information is different". Guðmundur (landstakkur) 19:09: „We own Urdarhvarf 2 not number 4. You have to bill someone else :)". 22.08: Grensásvegur 14 staðfest mán 25.08, kóði 4884#.
- 2025-09-01 · SENT · Þórður → vidhald@ · Skýrsla fyrir Urðarhvarf 4 · SKÝRSLA SEND. 14:26 · Skýrsla fyrir Grensásveg 14 · SKÝRSLA SEND.
- 2025-09-10 · INBOX · dimka@ → eldklar · Re: Skýrsla f. Hamraborg 7 · FÆRA REIKNING: Urðarhvarf 4 var rukkað á Heimaleigu, biður um Aegina ehf (6810130830) „as per my previous email". SENT 11:39 Haukur: nýr reikningur á Aegina + kreditreikningur (R-107299 −236.889 / R-107300 236.889). Dimka: „That's great". → afgreitt.
- 2025-10-20 · INBOX · vidhald@ → eldklar · Laugavegur 18 fire extinguisher update · eftir símtal: útrunnin tæki í Mána — 1 í lobby, 2 á 2. hæð (1 útrunnið, 1 brotið handfang), 5 á 3. hæð, 2 á 5. hæð, 4 útrunnar brunaslöngur; kóði 51130# miðvikudag.
- 2025-10-27, 10-29 · INBOX · vidhald@ · biður (×2) um skýrslu eftir skoðun/skipti í síðustu viku, „need to send it to the inspector soon". SENT 27.10 „send á morgun"; 29.10 10:38 „sorry, wasn't in office"; 29.10 13:40 · SENT · „New updated report for laugavegur 18" · SKÝRSLA SEND. 30.10 Dimka: bæta nöfnunum Midtown Hotel og Mani Apartments við → SENT 15:31 „I have added Mitown hotel to the report".
- 2025-11-06 · INBOX · vidhald@ → eldklar · Fire extinguisher inspection, Laugavegur 1B, ICE apartments · PÖNTUN: skoða/uppfæra öll tæki. 13.11 kóði 77179# sameign.
- 2025-11-13 · INBOX · dimka@ → eldklar · Bríetartún 9 and 11, fire extinguishers check common areas · eftir símtal: kóðar 5300# (nr 9) og 4893# (nr 11) — sameign.
- 2025-11-14 · INBOX · alvin@fylgi.is → eldklar · Request invoice · afrit af reikningi Aegina ehf, greiddur 01.10.2025, 237.184 kr; 14.11 Haukur sendi úr bókhaldskerfi; „Got it".
- 2025-11-26 · INBOX · vidhald@ · biður um skoðunarskýrslu fyrir ICE complex.
- 2025-11-27 · SENT · Haukur → eva@ · vegna Laugavegur 1B · „vegna veikinda starfsmanna" ekki náð að klára Laugaveg 1B; staðfest að farið verði í verkið mánudag 1. desember (fyrst misritað „1 janúar", leiðrétt). Eva framsendir til shs@eldvarnaeftirlit.is (mál 25-6977); SHS: „kom ekki skýrslan vegna slökkvitækja" → Eva útskýrir veikindi → „Móttekið".
- 2025-12-01 · SENT · Þórður → eva@ · Re: vegna Laugavegur 1B · „Hér kemur skýrslan fyrir Laugaveg 1" · SKÝRSLA SEND; einnig til vidhald@ („Inspection file for Laugavegur 1"). Eva sendir SHS „ice apartments (heimaleiga) 2025.pdf" og biður um lokun máls; SHS: „móttekið og skráð".
- 2025-12-11 · SENT · Þórður → dimka@ · Bríetatún · „Should we go to Bríetatún next week?" 12.12 · SENT → eva@ · Vegna Bríetartún · „eigum alltaf eftir að yfirfara öll slökkvitæki í herbergjum í Bríetartúni" → Eva: Dimka hefur samband. Dimka: þriðjudag.
- 2025-12-15 · INBOX · dimka@ · Re: Bríetatún · kóðar (5300#/8600#/íbúðir 12210#), íbúðalisti nr 9 (35 íbúðir) og nr 11 (13 íbúðir); „Billing information - Bríetartún 9-11, húsfélag, 540119-0660". SENT: helming þriðjudag, rest miðvikudag. 16.12 Dimka: byrja eftir kl 10.
- 2025-12-16 · INBOX · dimka@ → eldklar · Receipt address · hvaða eign á kvittunin við (DisplayDocument (1).pdf)? SENT: „Laugavegur 1B". 22.12 Dimka: þessi (19055570020.pdf) er ICE Laugavegur 1B — „double check the previous one". 06.01.2026 ítrekað (án texta).
- 2025-12-19 · SENT · Þórður → dimka@ · Skýrsla Bríetatún · „Report for Brietatún 9-11" · SKÝRSLA SEND.
- 2025-12-19 · INBOX · dimka@ → eldklar · Fire extinguisher inspection, Grettisgata 62. TYR Apartments · PÖNTUN: 8 íbúðir + 2 sameignarrými.
- 2025-12-22 · INBOX · dimka@ · Re: Bríetatún (viðh. 19055581100.pdf) · FÆRA REIKNING: „bill the service to Bríetartún 9-11, húsfélag, 540119-0660 … I can see it now under Heimaleiga. I will reject it in my system." Ítrekað 06.01.2026.

2026
- 2026-01-05 · INBOX/SENT · dimka@ ↔ Þórður · Grettisgata 62 · „Happy New Year! … anytime soon?" → á morgun. Dimka: „Please bill this to Mannheimar ehf. (6801696409), email mannheimar.ehf@gmail.com", kóði 69029#, byrja eftir 10. SENT „Will do".
- 2026-01-13 · INBOX · dimka@ → eldklar · Armuli 13A, fire extinguishers and hoses update · PÖNTUN: sameign + 51 íbúðir, „Buyer of the service is S30 ehf. (7110962059)". 16.01: náði ekki í síma; þriðjudag 20.01 (brunatæknir á staðnum sama dag), kóði 87733#, „Please bill the service to S30 ehf."
- 2026-01-14 · INBOX · dimka@ · biður um skýrslu Grettisgötu 62 („need to send it to the authorities"). SENT „Yes, I will." 15.01 · SENT · „Report for Grettisgata 62" · SKÝRSLA SEND. 16.01 „thank you very much!"
- 2026-01-21 · INBOX · gjaldkeri@eignaumsjon.is → eldklar · Slökkvitæki ehf … Bríetartún 9-11, húsfélag (V26-022363) · krafa 193.600 að nálgast eindaga, reikningur ekki borist. 22.01: formaður húsfélags spyr hvort þetta sé sameign. SENT 22.01 Haukur sendir skýrsluna. solvi@ 22.01: „Sameignar eða einstakra íbúða :)". SENT 23.01 Þórður: „Þessi reikningur er fyrir íbúðir Heimaleigu. Reikningur var gefinn út á sameign að beiðni Dimku."
- 2026-01-26 · INBOX · solvi@ → eldklar · „Ertu til í að færa á Heimaleigu og ég samþykki þar? … Bara ekki húsfélagið sem á að greiða." SENT Haukur: „bakfæri ég reikninginn á kt.540119-0660 og stofna hann á kt.510117-0690. Mátt staðfesta." Sölvi: „Já, rétt." (R-107758 193.600 á Heimaleigu 26.01.2026.)
- 2026-01-29 · INBOX · dimka@ → eldklar · Laugavegur 42, fire extingusher update · PÖNTUN: 5 íbúðir. Haukur: mið 4. feb. Dimka: „Please bill this to Heimaleiga." 03.02 kóðar (F2442F/97095#), íbúðir 201, 202, 302 o.fl. (Idunn apartments).
- 2026-01-29 · SENT · Þórður → dimka@ · „Raport for Ármúli 13A" · SKÝRSLA SEND. (R-107778 235.915 á S30 29.01.)
- 2026-02-03 · INBOX · gjaldkeri@eignaumsjon.is · Bríetartún 9-11 (V26-022363) · „Að sögn stjórnar húsfélagsins á að fella niður neðangreinda kröfu" (viðh. Bríetartún 9-11 2025.pdf). SENT Haukur: „endilega fella út þessa kröfu þar sem hún átti að fara á annan greiðanda."
- 2026-02-09 · INBOX · dimka@ · biður um kvittun og skýrslu Laugavegs 42. SENT „á morgun". 11.02 · SENT · Haukur · „report/attached document for apartments Laugavegur 42" · SKÝRSLA SEND. Dimka 11.02: „bill it under the kennitala 6110962599 and send me the receipt" → SENT „Will do". (R-107860 61.390 á Húsfélagið Laugavegi 42 11.02; R-107909 66.176 26.02 á kt Heimaleigu skv. customer_documents #10284 — sjá B.)
- 2026-02-18 · [thjonustubeidni #161/#1327] · Eignaumsjón: Húsfélagið Laugavegi 42 — reikningur vantar fyrir kröfu (V26-…); lokað sama dag.
- 2026-03-06 · INBOX · vidhald@ → eldklar · Laugavegur 46, fire extingusher update · PÖNTUN: 5 íbúðir + 2 sameignarrými. Haukur: næsta vika. 10.03: á morgun eftir 10; 2 inngangar (46heima Apartments), kóði 6258563#; „Please bill the service to S&H Invest ehf. (6411150100), email: v@waterfrontconsult.com".
- 2026-03-13 · INBOX · vidhald@ → eldklar · Freyjugata 16, fire extinguishers update · PÖNTUN: 4 íbúðir + lítil sameign. 18.03 ítrekun „will you have time for this?" → SENT: á morgun 10:30 eða mán/þri. 19.03: þriðjudag eftir 10, kóði 10138#. 23.03 SENT framsent til elioz869@gmail.com (starfsmaður).
- 2026-04-02 (tilvitnun, vantar í INBOX) · dimka@ · Re: Skýrsla Bríetatún · „could you please change the details of this invoice and bill …" → 08.04 SENT Haukur: „Yes, I already did that." (R-108130 193.600 á húsfélagið 08.04.)
- 2026-04-08 (tilvitnun, vantar í INBOX) · dimka@ · Heimaleiga order, Dalbrekka 4-6 fire extinguishers update · PÖNTUN. 09.04 SENT Haukur: mið 15. apríl? 09.04 SENT framsent til Frank. 14.04 SENT: hentar 15.04? Dimka (tilvitnun): „still waiting for the owners'…" → „No problem".
- 2026-04-15 · INBOX · gjaldkeri@eignaumsjon.is · Bríetartún 9-11 (V26-121156) · krafa að nálgast eindaga, reikningur ekki borist → SENT: sendi reikninginn. 16.04: færa eindaga um viku → SENT: eindagi 24. apríl.
- 2026-04-20 · SENT · Haukur → dimka@ · Re: Skýrsla Bríetatún · „I don't understand this. Do you really want me to make another invoice for Heimaleiga which I already have made a credit for???" 30.04 SENT Frank: „What is the news about this??" Dimka (tilvitnun 30.04): „Unfortunately, the Husfelag has not approved this" → SENT Frank: „no problem, we'll change the account :)" (R-108266 193.600 á Heimaleigu + kredit 108265 á húsfélag.)
- 2026-05-04 · SENT · Haukur → anninn76@gmail.com · Fwd/Re: Heimaleiga order, Dalbrekka · innanhúss: „Fyrirtæki sem að opnar ekki pósthólfið sitt er einskis virði…" (pirringur yfir ósvöruðum pósti Dimku 04.05). 05.05 SENT Haukur → Dimka: „Apologies for the late reply. Yes, we can come this week."
- 2026-05-06/07 · INBOX/SENT · Dimka ↔ Elías · Dalbrekka · föstudag (08.05) kl 12 (fært úr 10). Dimka 07.05: „Please bill the service for Dalbrekka 4-6 to Heimaleiga ehf. It should include only the hallways with the apartments, not the underground parking. Then at Armuli 13, it's the hose next to room 305, please bill this service to S30 ehf." Kóði 52117#.
- 2026-05-26, 05-29, 07-14, 07-29 · INBOX · dimka@ · Re: Heimaleiga order, Dalbrekka · „Could you please send me the report after the inspection?" (×4).
- 2026-06-01, 07-14 · INBOX · dimka@ · Re: Tilboð í yfirfærslu · „send me the report for Hamraborg 7 from last year" (×2).
- 2026-06-02 · INBOX · dimka@ · Re: Laugavegur 46 · „send the invoice to the company owner … enter the invoice into the electronic invoicing system using his kennitala." 03.06 · bokhald/SENT · bokhald@ → dimka@ · Nóta (Nóta-20260603120851.pdf).
- 2026-07-24 · SENT · eldklar → dimka@ · Úttektarskýrsla — Heimaleiga - Hamraborg 7 · (sjálfvirkt sniðmát). Dimka: „the file is empty". SENT 16:00: „here is working report for hamraborg 7 from 2025" · SKÝRSLA SEND (7 vikum eftir beiðni). 27.07 „Perfect".
- 2026-07-24 · INBOX · eva@ → eldklar · fyrirspurn á tilboði - Heimaleiga · VERÐ: vill yfirsýn yfir kjör, „nýta þjónustuna töluvert". 28.07 · SENT · Agnar · kjör í dag: yfirferð slökkvitækja 2.700 + vsk/tæki, hleðsla 4.400 + vsk/tæki, … (afgangur ekki í digest).
- 2026-08-05 · INBOX · eva@ → eldklar · Re: fyrirspurn · SPURNING: „Þarf að hlaða slökkvitæki á fimm ára fresti, eða er því skipt út … ?" — SVAR FANNST EKKI í digest (cowork_postsvor #50 status „ósvarað").
- 2026-08-06 · SENT · eldklar → dimka@ (og aggisigurds@) · Úttektarskýrsla — Dalbrekka 4-6 - Bílskúr + Reikningur R-000705 · 07.08 Dimka: „blank page" → SENT Agnar 14:47 „working version" · SKÝRSLA SEND. 07.08 12:32 · SENT → aggisigurds@gmail.com aðeins · „Úttektarskýrsla 2026" f. Hamraborg 7 — ekki send á Heimaleigu í þessum pósti.
- 2026-09-25 · INBOX · dimka@ → eldklar · Urðarhvarf 4, fire extingusher update · staðfestir skoðun þri 29.09 kl 10–15, kóði 6336#, „Billing details: Aegina ehf. (6810130830)". SENT Agnar: „we will be there".
- 2026-10-05 (ekki í SENT) · Payday → dimka@ · Reikningur (R-001029 52.519 Hamraborg 7 á Heimaleigu).
- 2026-10-06 · INBOX · dimka@ → eldklar · Re: Reikningur · FÆRA REIKNING: „bill the service to Eldsalir ehf. (4911171840) and send the invoices to this email: ingi@kaskur.is" (R-001109 52.519 á Eldsalir 08.10). Póstur til ingi@kaskur.is fannst ekki í digest.
- 2026-10-22 · SENT · Bjarndís → eva@ · Fundur vegna samstarfs og þjónustu · eftir símtal: fundur um samstarfið. Eva: mið kl 10 á Grensásvegi 7 með Ernu. Fundarboð (Google Meet), 26.10 fært í 9:30 (Grensásvegur 7). 27.10 · INBOX · aggisigurds@gmail.com → eldklar · „Heimaleiga Center hotel fundir — verð, saga, yfirlit".
- 2026-10-28 · SENT · Bjarndís → eva@ · Eftirfylgni eftir fund · biður um upplýsingar um þjónustu sem þau eru með í dag og vilja tilboð í (brunakerfi, sprinkler, neyðarlýsing o.fl.) ásamt grófri verðmynd; LOFAR betra tilboði á slökkvitækjaþjónustu en því sem þegar var sent.
- 2026-10-29 · INBOX · eva@ → eldklar · Re: Eftirfylgni · VERÐSAMANBURÐUR (Brunahólf núv. / annað fyrirtæki): yfirferð léttvatn 6-9L 2.700 / 2.032; CO₂ 3.270 / 2.032; slönguhjól 2.700 / 3.071; hleðsla léttvatn 4.400 / 4.446; skýrslugerð 3.500 / 0; akstur 3.000 / 2.411; vinna – / 7.776. Heildarkostnaður annars fyrirtækis ~27% lægri í einni byggingu. BEIÐNI: „skoða þá reikninga sem þú nefndir á fundinum að hefðu verið ofrukkaðir … staðfest hver var greiðandi hvers reiknings og tekið saman hvaða fjárhæðir" → inneignarnóta eða endurgreiðsla. SPURNINGAR: neyðarlýsing (kjör), brunakerfi (hvað felst í yfirferð, kostnaður), sprinkler (vöktun, …).
- 2026-10-30 · SENT · Bjarndís → eva@ · SÉRKJÖR (án vsk): yfirferð léttvatns-/dufttækis 2.000 · CO₂ 2.000 · brunaslönguhjól 2.500 · reykskynjari 1.500 · hleðsla léttvatn/duft 4.350 · akstur 2.400 · skýrslugerð 0 · ný tæki 25% afsl. LOFAR yfirliti yfir greiðendur og fjárhæðir (ofrukkað). Biður Evu um núverandi verð á neyðarlýsingu/brunakerfum/sprinkler til samanburðar.
- 2026-10-30 · INBOX · eva@ · „Verðin líta vel út!" · SPYR: hvernig er verkferlið við yfirferð sprinklerkerfis, brunakerfa og neyðarlýsingar, hvað felst í því? — SVAR FANNST EKKI (02.11 segir Bjarndís „er að vinna í þeim atriðum").
- 2026-11-02 · INBOX · eva@ → eldklar · Skýrsla fyrir Hamraborg 7 - Heimaleiga · KVÖRTUN FRÁ SLÖKKVILIÐI: skýrslan um yfirferð júlí 2026 óundirrituð. SENT 10:58 Bjarndís: undirritað skjal sent, biðst velvirðingar; „er að vinna í atriðunum í hinum tölvupóstinum". Eva: „Ekkert stress … heyrumst varðandi hinn póstinn."
- 2026-11-04 · INBOX · eva@ → eldklar · Re: Eftirfylgni · SAMÞYKKI: „Ég er búin að fara yfir tilboðið varðandi yfirfærslu á slökkvitækjunum og brunaslöngunum og erum við mjög sátt … Við samþykkjum því tilboðið." (afgangur: enn að skoða hin — sprinkler/brunakerfi/neyðarlýsing, skv. #1471). Ósvarað 05.11.

### A.2 Samskiptasaga í grunninum (aðrar töflur)

- contact_log: ekkert fannst fyrir fyrirtaeki-id Heimaleigu-staða né texta „heimaleig/dimka".
- customer_info: ekkert fannst fyrir kennitölurnar 11 né @heimaleiga.is.
- sms_saga: ekkert fannst (nöfn, texti, símanúmer 449 4949 / 848 2696).
- email_actions: ekkert fannst fyrir Heimaleigu-pósta.
- postsaga_otengd: aðeins fid 1851 (Hamraborg 7 jarðhæð — Eldsalir): kt_hit=1, nafn_hit=0, addr_hit=34, postar=35, síðast 02.11.2026.
- samskipti_tengd (reiknað 05.11.2026 05:35, fjöldi pósta · síðasti): 1488 Iceland Comfort 52 · 02.11.2026 | 1484 Ice Apartments 47 · 07.08.2026 | 869 Máni 38 · 07.08 | 443 Bríetartún íbúðir 32 · 07.08 | 269 Höfuðstöðvar 28 · 07.08 | 1483 Blue Mountain 28 · 07.08 | 1485 Freyjugata 27 · 07.08 | 1486 Midtown 23 · 07.08 | 1645 bílskúr 23 · 07.08 | 1621 Dalbrekka 23 · 07.08 | 626 Grettisgata 18 · 16.01.2026 | 835 Laugavegur 42 16 · 18.02.2026 | 243 Ármúli 16 · 14.07.2026 | 1622 Icelandic Apts 16 · 25.09.2026 | 1487 Bríetartún sameign 15 · 16.04.2026 | 305 Laugavegur 46 10 · 02.06.2026 | 204 G14 2 · 17.03.2026. Ekkert fyrir 857 (EA Law) og 1851 (Eldsalir — sjá postsaga_otengd).
- samskipti_stada (allar handled_by „Claude (yfirferð 07.10.2026)", 07.10.2026 02:01): 1645, 869, 1483, 1484, 1487, 1485, 1488, 1621, 1486, 269 → „Svarað: síðasti póstur 25.09 er þakkir eftir svar Agnars; Þjónustuborðsmál 1097/735/704/715/688 lokuð" · 305 → „Svarað: spurning 02.06 (reikningur á eiganda) — Þjónustuborðsmál #20 merkt svarað 25.09" · 243 → „Svarað: skýrslubeiðni 14.07 — #696 lokað; eldri (#25, #35) í geymslu 10.07". ATH: staðan er frá 07.10 og nær ekki yfir pósta Evu 29.10–04.11.
- cowork_postsvor (6 raðir): #1 „Skýrsla f. Hamraborg 7" (dimka, Senda skýrslu) klárað · #2 „Skýrsla f. Dalbrekka 4-6" (Senda skýrslu) klárað · #3 „Laugavegur 46 — reikningur á eiganda + rafrænt á hans kt" (R-108135 28.835 á 641115-0100) ÓSVARAÐ · #4 „Bríetartún 9-11 — bakfæra af húsfélags-kt á Heimaleiga" ÓSVARAÐ · #50 „Fyrirspurn um verð og kjör (Eva), 05.08.2026" ÓSVARAÐ · #81 „Re: Reikningur — breyta greiðanda í Eldsalir ehf., 12.10.2026" ÓSVARAÐ (dróg: cancel original, issue new).

### A.3 Samantekt á beiðnum Heimaleigu um greiðanda (færa reikning)

| Dags | Staður | Beðið um greiðanda | Niðurstaða í skjölum |
|---|---|---|---|
| 14.08.2025 | Grensásvegur 14 | Heimaleiga ehf | R-107256/R-107267 (sept 2025) ✔ |
| 14.08/10.09.2025 | Urðarhvarf 4 | Aegina ehf | R-107254 (Heimaleiga) → kredit R-107299, nýr R-107300 Aegina ✔ |
| 15.12/22.12.2025, 06.01.2026 | Bríetartún 9-11 íbúðir | húsfélag 540119-0660 | R-107757 kredit, R-107758 Heimaleiga (26.01); Sölvi 26.01: Heimaleiga greiðir; R-108130 húsfélag (08.04) → húsfélag hafnaði 30.04 → kredit 108265 + R-108266 Heimaleiga. Mál #1329: Heimaleiga virðist hafa greitt ~122.659 kr tvisvar — ÓLEYST |
| 05.01.2026 | Grettisgata 62 | Mannheimar ehf | R-107718 56.802 ✔ |
| 13/16.01.2026 | Ármúli 13A | S30 ehf | R-107778 235.915 ✔ |
| 29.01 → 11.02.2026 | Laugavegur 42 | fyrst Heimaleiga, svo 611096-2599 | R-107860 61.390 á húsfélagið 11.02 ✔; R-107909 66.176 á Heimaleigu 26.02 (#1289 „kreditfæra" lokað) — athuga hvort tvírukkað |
| 10.03/02.06.2026 | Laugavegur 46 | S&H Invest ehf, rafrænt | R-108135 28.835 08.04 ✔; „Nóta" send 03.06 |
| 07.05.2026 | Dalbrekka 4-6 | Heimaleiga ehf — „only the hallways … not the underground parking" | R-000683 177.419 (gangar) og R-000705 66.551 (BÍLSKÚR) bæði á Heimaleigu — bílskúrsreikningur gengur gegn fyrirmælum Dimku, enginn póstur um að það hafi verið rætt |
| 07.05.2026 | Ármúli 13, slanga v. herb. 305 | S30 ehf | enginn 2026-reikningur á S30 eftir janúar; mál #1311 lokað 02.11 án lýsingar — óvíst hvort gert/rukkað |
| 25.09.2026 | Urðarhvarf 4 | Aegina ehf | R-001053 151.900 ✔ |
| 06.10.2026 | Hamraborg 7 jarðhæð | Eldsalir ehf, reikningar á ingi@kaskur.is | R-001109 52.519 Eldsalir ✔; kredit á R-001029 (Heimaleiga) fannst ekki í customer_documents; póstur til ingi@kaskur.is fannst ekki |

---

## B) SKJÖL

### B.1 customer_documents — fjöldi per viðskiptavin / doc_type / ár (n, þar af afrit)

- 293 Heimaleiga ehf: reikningur 2023: 1 · 2025: 12 (2 afrit) · 2026: 9 | samningur 2024: 1 | uttektarskyrsla 2023: 2 (1 afrit) · 2025: 11 (3 afrit) · 2026: 5
- 784 Aegina: reikningur 2025: 3 (1 afrit) · 2026: 1 | uttektarskyrsla 2023: 1 · 2025: 1 · 2026: 1
- 394 Bríetartún húsfélag: reikningur 2025: 2 (1 afrit) · 2026: 5 (1 afrit) | engar skýrslur (sameignarskýrslan 2025 er skráð á 293/1487)
- 308 G14: brunakerfi 2023: 2 (1 afrit) · 2024: 2 · 2026: 1 | reikningur 2023: 2 · 2024: 2 · 2026: 2 | samningur (án árs): 2 (1 afrit) | uttektarskyrsla 2023: 1 · 2024: 1 · 2026: 2 (1 afrit)
- 586 Laugavegur 42 húsfélag: reikningur 2026: 1 | uttektarskyrsla 2026: 3 (2 afrit)
- 676 S&H Invest: reikningur 2026: 1 | uttektarskyrsla 2026: 1
- 769 Mannheimar: reikningur 2026: 1 | uttektarskyrsla 2026: 2 (1 afrit)
- 866 S30: reikningur 2026: 1 | uttektarskyrsla 2026: 2 (1 afrit)
- 1210 Eldsalir: reikningur 2026: 1 | uttektarskyrsla 2026: 1
- 681 EA Law Practice: ekkert skjal (aðeins par #1276 með reikning R-108092 sem er Freyjugata).
- 303 SAB ehf: ekkert skjal.

### B.2 Úttektarskýrslur (id · cb · year · skodun_ar_man · tæki alls · fid · file_name)

- 5838 · 293 · 2023 · 2023-12 · 41 · 1483 · Urðarhvarf 2 Blue Montain Apartments 2023 (1) …  (afrit: 7876)
- 7877 · 784 · 2023 · 2023-06 · 51 · 1622 · Ur arhvarf 4 icelandic Apartments …
- 1356 · 308 · 2023 · 2023-11 · 7 · 204 · G14 ehf - Grensásvegur 14 … 2023
- 2159 · 308 · 2024 · 2024-11 · 7 · 204 · G14 ehf - Grensásvegur 14 … 2024
- 1437 · 293 · 2025 · 2025-06 · 38 · 1483 · Heimaleiga Urðarhvarf - Urðarhvarf 2 … 2025
- 495 · 293 · 2025 · 2025-06 · 15 · 1488 · Hamraborg 7 2025(1).pdf  (afrit: 1788, 5 tæki)
- 1523 · 293 · 2025 · 2025-07 · 54 · 869 · Máni Apartments - Laugarvegur 18 … júlí 2025  (afrit: 5929)
- 408 · 293 · 2025 · 2025-08 · 6 · 269 · Heimaleiga ehf Grensásvegur 14(1).pdf
- 366 · 784 · 2025 · 2025-08 · 40 · 1622 · Heimaleiga ehf Urðarhvarf 4(1).pdf
- 1669 · 293 · 2025 · 2025-10 · 61 · 1486 · Máni Apartments og Midtown Hotel - Laugarvegur 18 (allt húsið; mál #1290 leggur til 10 tæki á Midtown)
- 1735 · 293 · 2025 · 2025-10 · 8 · 1484 · Ice Apartments Reykjavík - Laugavegur 1 … 2025  (afrit: 9206)
- 1866 · 293 · 2025 · 2025-10 · 8 · 1487 · Heimaleiga Bríetartún - Bríetartún 9 og 11 (sameign) … 2025
- 1934 · 293 · 2025 · 2025-12 · 48 · 443 · Bríetartún 9-11 - húsfélag … 540119-0660 (íbúðir; doc_date 17.12.2025)
- 3021 · 769 · 2026 · 2026-01 · (null) · 626 · Mannheimar ehf - Grettisgata 62 … 2026  (afrit: 9390)
- 670 · 866 · 2026 · 2026-01 · 65 · 243 · S30 Heimaleiga - Ármúla 13A … 2026  (afrit: 2002)
- 2161 · 308 · 2026 · 2026-02 · (null) · 204 · G14 ehf - Grensásvegur 14 - febrúar 2026  (afrit: 6553)
- 7275 · 586 · 2026 · 2026-02 · 10 · 835 · Heimaleiga Laugavegur - Laugavegur 42 … 2026  (afrit: 9215, 9864)
- 1955 · 293 · 2026 · 2026-03 · 5 · 1485 · Heimaleiga Freyjugata - Freyjugata 16 … 2026
- 1913 · 676 · 2026 · 2026-03 · 6 · 305 · Heimaleiga ehf. - Laugavegur 46 … 641115-0100 … 2026
- 9280 · 293 · 2026 · 2026-05 · 48 · 1621 · Heimaleiga - Dalbrekka 4-6 … (doc_date 03.08.2026)
- 9315 · 293 · 2026 · 2026-07 · 16 · 1645 · Heimaleiga - Dalbrekka 4-6 - Bílskúr … (06.08.2026)
- 9370 · 293 · 2026 · 2026-07 · 42 · 1483 · Heimaleiga - Urðarhvarf 2 … 2026 - ágúst (09.08.2026)
- 9853 · 293 · 2026 · 2026-07 · 15 · 1488 · (file_name null) Hamraborg 7 júlí 2026 — 12 léttvatn, 1 CO₂, 2 slöngur
- 10132 · 1210 · 2026 · 2026-09 · (null) · 1851 · Hamraborg 7, jarðhæð — Eldsalir ehf. … (24.09.2026, R-001109)
- 10093 · 784 · 2026 · 2026-09 · (null) · 1622 · (file_name null) Icelandic Apartments - Urðarhvarf 4 … 681013-0830 (29.09.2026)

Samningar/tilboð í customer_documents: 10343 · 293 · samningur 2024 · „Heimaleiga ehf - Grensásvegur 14 - 510117-0690 - þjónustusamningur" (undirrituð mynd IMG_1842.jpg úr pósti Sölva 07.11.2024, ekkert drive_file_id) · 2160 (+afrit 8878) · 308 · samningur · „G14 ehf - 510809-0170 - brunakerfissamningur.pdf". Engin skjöl af gerðinni tilboð.

Töflur tilbod og thjonustusamningar: EKKERT FANNST fyrir neina kennitöluna, company_id eða nafn „Heimaleig". Þ.e. hvorki sérkjaratilboðið 30.10.2026, samþykkið 04.11.2026, tilboðið júní 2025 né þjónustusamningurinn 07.11.2024 eru skráð þar.

### B.3 Reikningar í customer_documents (stutt)

293 Heimaleiga: R-104473 159.820 (06.12.2023, Urðarhvarf 2, á SAB-kt) · R-106967 139.562 (18.06.2025, Urðarhvarf 2) · R-107031 107.140 (07.07.2025, Hamraborg 7) · R-107052 233.418 (11.07.2025, Máni) · R-107254 236.889 (01.09.2025, Urðarhvarf 4 — afrit, sjá 784) · R-107255 25.570 (01.09.2025, búð) · R-107256 32.573 + R-107266 −32.573 + R-107267 27.900 (sept 2025, HQ) · R-107457 65.317 (29.10.2025, Midtown) · R-107527 53.143 (17.11.2025, Bríetartún sameign) · R-107528 55.664 (17.11.2025, Ice Apartments) · R-107758 193.600 (26.01.2026, Bríetartún íbúðir) · R-107909 66.176 (26.02.2026, Laugavegur 42 á kt Heimaleigu) · R-108092 25.487 (07.04.2026, Freyjugata) · R-108266 193.600 (2026, Bríetartún íbúðir, endurútgefinn) · R-000683 177.419 (03.08.2026, Dalbrekka) · R-000705 66.551 (06.08.2026, bílskúr) · R-000712 58.987 (07.08.2026, Hamraborg 7) · R-000719 217.744 (09.08.2026, Urðarhvarf 2) · R-001029 52.519 (24.09.2026, Hamraborg 7 jarðhæð — fært á Eldsalir)
784 Aegina: R-107299 −236.889 (kredit) · R-107300 236.889 (10.09.2025) · R-001053 151.900 (29.09.2026)
394 Bríetartún húsfélag: R-107757 −193.600 kredit (19.12.2025) · R-108130 193.600 (08.04.2026) · kredit 108265 · 2 ótölusett kreditskjöl (6808, 9480) · 9444 afrit
586: R-107860 61.390 (11.02.2026) | 676: R-108135 28.835 (08.04.2026) | 769: R-107718 56.802 | 866: R-107778 235.915 (29.01.2026) | 1210: R-001109 52.519 (08.10.2026)
308 G14: R-104402 74.896 + R-104403 33.218 (28.11.2023) · R-106012 75.516 + R-106013 28.878 (25.11.2024) · R-107992 80.487 + R-107993 50.362 (10.03.2026)

### B.4 document_pairs — staða og hvað vantar

Klárað (klarad): 1424 (293/1483 2023) · 1479 (1486 2025) · 1426 (1484 2025) · 1347 (269 2025) · 1427 (869 2025) · 793 (443 2025) · 1440 (784/1622 2025) · 1415 (1488 2025) · 1450 (1483 2025) · 1005 (1621 2026) · 1410 (1488 2026) · 1413 (1645 2026) · 1285 (1483 2026) · 1296 (1485 2026) · 131/130 (G14 2023) · 1010/1283 (G14 2026) · 768 (394/1487 2025) · 1090 (586 2026) · 1119 (676 2026) · 1276 (681 2026, reikningur eingöngu) · 1142 (769 2026) · 1614 (784 2026) · 1170 (866 2026) · 1630 (1210 2026).

Opin / gölluð:
- #124 (293/1622, 2023) og #1679 (784/1622, 2023): vantar_reikning — Urðarhvarf 4 skýrsla 2023 (7877), enginn reikningur 2023 fundinn. Tvö pör um sömu skýrslu. (Þjónustuborð #785 „Tengja … Icelandic 2023" nytt/geymt.)
- #1425 (293/269, 2026 uttekt): vantar_skyrslu — Höfuðstöðvar Grensásvegur 14: engin skýrsla 2026 (síðast ág. 2025, 6 tæki; samningur sagði næstu skoðun sept). Engin skoðun 2026 bókuð í pósti.
- #1329 (394/1487, 2026 uttekt): vantar_skyrslu — Bríetartún 9-11 sameign: engin 2026-skoðun (síðast okt/nóv 2025).
- #1297 (293/835, 2026): vantar_reikning — merkt „afrit af pari 1090", úrelt.
- #1305 (293/1483, 2026 brunakerfi): vantar_reikning — athugasemd segir losa (R-000719 er úttekt), úrelt.
- #863 (676/305, 2025): vantar_reikning — skjalið var fært á Ice Apartments, úrelt.
- #1455 (784/1622, 2025): vantar_skyrslu — „afrit af pari 1440", úrelt.
- #474/#473 (G14 2024 uttekt + brunakerfi): vantar_reikning — EN reikningar R-106013 (uttekt, doc 3904) og R-106012 (brunakerfi, doc 3902) frá 25.11.2024 eru til í customer_documents og ótengdir → vantar aðeins pörun.

Skýrslur sem vantar miðað við skoðunarlotu (ekki til 2026-skýrsla): Grensásvegur 14 HQ (sept 2026), Máni + Midtown Laugavegur 18 (okt 2026), Ice Apartments Laugavegur 1 (nóv 2026), Bríetartún sameign (nóv 2026) og íbúðir (des 2026) — sbr. Þjónustuborð #1374 „4 hús (131 tæki) áttu að fara í skoðun í október". Engin skýrsla neins staðar fyrir SAB ehf (303) og EA Law (681) — þau eru greiðendur, ekki staðir.

Skýrslur sem ekki fannst póstur um að hafi verið sendar á Heimaleigu: Laugavegur 46 (mars 2026, 1913), Freyjugata 16 (mars 2026, 1955), Dalbrekka 4-6 gangar (9280 — aðeins bílskúrsskýrslan fór í pósti 06/07.08), Urðarhvarf 4 sept 2026 (10093), Hamraborg 7 jarðhæð (10132, Eldsalir), Hamraborg 7 júlí 2026 (9853 — fór aðeins á aggisigurds@ 07.08; Slökkviliðið hafði hana samt 02.11, undirrituð útgáfa send Evu 02.11).

### B.5 Google Drive — „Heimaleiga"

Leit fullText contains 'Heimaleiga' (3 síður, ~100 treffir; hætt þegar OCR-textaskrár 0001xx.txt tóku við). Mappa „Heimaleiga" 1oVWDoAtxKXzYEE29f__uHBc2Y2GRBiHT (í 1H6izhb24L5Rp2m7XMgt1ss-MkcLltf5O) með undirmöppu „reikningar" 1kCt7PQKLcVZqcDG0xdrP75JMmLOLdsIg — innihald möppunnar ekki fulllistað (pageToken).

Skrár í Drive sem EKKI eru í customer_documents (drive_file_id passar ekki) — 50 af 76 skoðuðum, nær allar afrit:
- Reikningar (afrit): R-107758 ×7 (14Qb8…, 1IKQt…, 1PgW7…, 1mxbH…, 1BC0h…, 13Etz…, 1kA97…), R-108135 ×8 (1b7r0…, 13FFE…, 1tP9U…, 1Er5u…, 17ZPQ…, 1UARq…, 1PAeO…, 14VQ_…), S30 R-107778 ×4 (1DXyM…, 1_d1j…, 1ni6M…, 1_Qh5…), R-107254/236.889 ×4 (1npAn…, 15Lof…, 1kpDa…, 1kA97…), R-108266 ×2 (1py2n…, 1GIUq…), „2026 193.600" ×2 (13byn…, 1gOKl…), R-000683 (1Fjmk…), „Grensásvegi 14 2025 233.418" (1Bzjg… — upphæð R-107052 Máni), „Grensásvegi 14 2025 55.664" (1HnPJ… — upphæð R-107528 Ice Apts).
- Skýrslur (afrit): Grensásvegur 14 2025 ×4 (1YuZN…, 1ca5l…, 1_vcZ…, 1lwpE…-skráð), Urðarhvarf 4 2025 ×3 (108oI…, 10n2U…, 14Ote…), ice apartments (heimaleiga) 2025 ×6 (1hejo…, 11_jG…, 1phAZ…, 1LIcI…, 1DGdc… + 004291_04_…), Laugavegur 42 feb 2026 ×4 (1VlRS…, 1ylER…, 1CYDc…, 1OmAF…), Laugavegur 46 2026 ×3 (14tu-…, 1vKKj…, 1d3gH…), Freyjugata 16 2026 ×3 (1xKPi…, 1ShKQ…, 1cjNL…), „Heimaleiga ehf - Grensásvegi 14 - 2026 - mars - #269.pdf" (1YED4…, 167.910 B = sama stærð og Freyjugötuskýrslan → líklega rangnefnt afrit, ekki HQ-skýrsla 2026).
- Google Doc „Rekstrarfélög" (1me_oLwtj4IEYsK6iHk0uRqhWAgXai5wvIn9zM-Nun5c, 03.08.2026) — ekki lesið.
Engin ný skýrsla eða samningur fannst í Drive sem ekki er þegar í grunninum undir öðru ID.

---

## C) ÞJÓNUSTUBORÐ (thjonustubeidni)

Leit: customer_base_id í hópnum, fyrirtaeki_id Heimaleigu-staða, eða titill/nafn nefnir Heimaleigu/staðina — 140 raðir (61 fyrst, 79 síðar). Þar af ~70 sjálfvirk póstinnflutningsmál (status nytt, archived) sem spegla þræðina í A.1.

OPIN mál (status nytt, ekki geymd/eydd):
- #1290 (26.10, fid 1486, Agnar) Midtown Hotel / Máni: fækka tækjum Midtown úr 61 í 10? — tillaga: samþykkja.
- #1329 (26.10, fid 443, Agnar) Heimaleiga ehf: ofgreitt um ~122.659 kr (Bríetartún greitt tvisvar) — inneign eða endurgreiðsla? Hreyfingaryfirlit kt 510117-0690 lokastaða −159.997 kr.
- #1344 (27.10, fid 269, Agnar) Höfuðstöðvar: taka 2 brunaslöngur af tækjaskrá (taldar hjá G14)?
- #1374 (01.11, Agnar) Heimaleiga: 4 hús (131 tæki — Bríetartún sameign 8, Ice 8, Máni 54, Midtown 61) áttu að fara í skoðun í október — hvenær?
- #1377 (02.11, fid 269, Agnar) Yfirlit ofrukkaðra reikninga til Evu (18 reikningar, 8 greiðendur, 45.519 án vsk / 56.444 m/vsk) — má Bjarndís senda skjal B?
- #1378 (02.11, fid 269, Bjarndís) Senda Evu yfirlit yfir greiðendur og fjárhæðir (lofað 30.10) — bíður ✓ á #1377; drög að pósti tilbúin.
- #1451 (04.11, Agnar) Laugavegur 42 (Iðun): slökkvitæki vantar enn í íbúð 201 (athugasemd úr skýrslu feb 2026 óleyst).
- #1470 (04.11, brýnt) og #1487 (05.11, brýnt) AI-tillaga: undirrita (og senda) skýrslu Hamraborgar 7 — ATH: undirritað skjal var sent Evu 02.11 10:58 (SENT 70800); #1476 sama efni lokað 04.11. #1470/#1487 líta út fyrir að vera tvítekningar.
- #1471 (04.11) AI-tillaga: Heimaleiga samþykkti tilboð um yfirfærslu tækja og slangna (enn að skoða sprinkler/brunakerfi/neyðarlýsingu).
- #1472 (04.11) AI-tillaga: bæta Evu Mareksdóttur við sem tengilið (á skrá er aðeins Dimka).
- #785 (09.08, Charlize, nytt en geymt) Tengja úttektarskýrslu Icelandic Apartments 2023.
- Tengd Hamraborg 7 en aðrir leigjendur: #1032 Zsazsa Hár 23, #1031 MOMO, #1030 Cornelli — vinnublöð „staðfesta lestur" (nytt).

LOKUÐ Heimaleigu-mál (úrval, með lokunardegi): 1323 Urðarhvarf 2 úttekt f. eiganda (18.06.2025) · 1291 Urðarhvarf 2 v. máls slökkviliðs (18.06.2025) · 1292/1293 yfirferð útrunninna tækja Hamraborg 7 / Máni, tilboð samþykkt (09.07/11.07.2025) · 1324 eldvarnarteppi + sameign ICA (11.07.2025) · 1325 fyrirspurn neyðarlýsing o.fl. (11.07.2025) · 1314 Urðarhvarf 4 (01.09.2025) · 1294 skýrsla BMA (11.07.2025) · 1295 árleg skoðun HQ (01.09.2025) · 1315 rukka Aegina (10.09.2025) · 1296 útrunnin tæki í Mána (30.10.2025) · 1297 Ice Apartments (01.12.2025) · 1298 Bríetartún sameign (17.11.2025) · 1326 staðfesting f. eldvarnaeftirlit 25-6977 (01.12.2025) · 1299 Bríetartún íbúðir (19.12.2025) · 1300 hvaða eign á kvittun (06.01.2026) · 1317 TYR/Grettisgata (15.01.2026) · 1301 hver greiðir íbúðaúttekt Bríetartúns (30.04.2026) · 1310 Ármúli 13A (29.01.2026) · 1321/1322 Eignaumsjón reikningur vantar (03.02/16.04.2026) · 1302 Iðun Laugavegur 42 (11.02.2026) · 1327 Húsfélagið Laugavegi 42 reikningur (18.02.2026) · 1312 46heima (08.04.2026) · 1303 Freyjugata (07.04.2026) · 1304/1305 Dalbrekka gangar/bílskúr (07.08.2026) · 1311 brunaslanga Ármúla (02.11.2026, án lýsingar) · 1306 skýrsla Dalbrekka (07.08.2026) · 1307 skýrsla Hamraborg 7 2025 (24.07.2026) · 1313 reikningur til eiganda Laugavegs 46 (03.06.2026) · 1308 verð og kjör Heimaleigu (02.11.2026) · 1316 Urðarhvarf 4 29.09 (29.09.2026) · 1309 rukka Eldsali (08.10.2026) · 1258/1260/1333/1334 fundur 28.10 · 1289 Laugavegur 42 kreditfæra R-107909 á Heimaleigu · 1318 Bríetartún snúa skránni við (26.10.2026) · 1383/1476 skýrsla Hamraborg 7 undirritun (04.11.2026) · 1184 Eldsalir R-001109 (valdi ranga …) · 1152/1199 Iceland Comfort tækjafjöldi · 1191 Heimaleiga og 21 kt á mörgum stöðum · 1195 Hamraborg 7 jarðhæð tækjalisti · 1400 K Apartments 2023-skýrsla er Blue Mountain · 943 EA Law er greiðandi · 1028 vinnublað S30 · 650/663/455/581(eytt)/687/688/696/704/706/715/716/730/734/735/741/753 eldri póst-/athugasemdamál (lokuð).
