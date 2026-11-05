# Heimaleiga-hópurinn — saga úr lotum, Charlize og verkefnalistum

Safnað 05.11.2026, LESAÐEINS. Heimildir: charlize_knowledge (95 raðir pössuðu), charlize_inbox (27), charlize_contacts (8), factcheck_bord (13), verkefnalisti (27), thjonustubeidni (9 valin mál), lotu-afrit (JSONL í `C:\Users\Notandi\.claude\projects\*`), og lifandi töflur `fyrirtaeki`/`uttaeki`.
Ekkert fannst í: agent_notes, cowork_review_notes, artifact_listar (atridi er tómt fylki í öllum 17 röðum).

---

## 1. Charlize — charlize_knowledge (allar scope/status)

Fyrsta Heimaleigu-færslan er 07.08.2026; þéttasta vinnan 20.–30.08, 01.09, 06.10, 26.10 og 02.11. Engin rað er merkt inactive; tvær superseded (#174, #181, #743) og tvær wrong (#179, #306).

### 1a. Uppbygging hópsins (hvaða kt, hvaða staðir)
| id | dags | status | staðreynd (stytt) |
|---|---|---|---|
| #45 / #44 | 07.08 | active | Heimaleiga er virkur umsjónaraðili; hjá húsfélögum er umsjónaraðilinn kúnninn („Heimaleiga - Hamraborg 7“). |
| #151 | 20.08 | active | Heimaleiga er rekstrarfélag; fjórar stöðvar með annan greiðanda: Urðarhvarf 4→Aegina, Laugavegur 46→S&H Invest, Freyjugata 16→EA Law, Ármúli 13A→S30. Urðarhvarf 2 ÓLEYST (Aegina eða U2 ehf 510496-2489). |
| #153 | 20.08 | active | Vörumerki: Hamraborg 7=Iceland Comfort (ICA), Urðarhvarf 2=Blue Mountain, Urðarhvarf 4=Icelandic Apartments, Laugavegur 42=Iðun, Laugavegur 1B=Ice Apartments, Laugavegur 46=46heima, Ármúli 13A=S30, Laugavegur 18=Midtown+Máni. |
| #154 | 20.08 | active | Ármúli 13 (sameign) og 13A (S30, 65 tæki) eru sitt hvor staðurinn. |
| #170 | 21.08 | active | Hópurinn er SJÖ kennitölur: Heimaleiga (13 stöðvar), S30, S&H Invest, Aegina, EA Law, Mannheimar (Grettisgata 62 + Norðurstígur 5a), SAB/U2 510496-2489. |
| #182 | 21.08 | active | Norðurstígur 5a (fid 1746) tekinn út úr hópnum að ósk Agnars; R-107718 fært á Grettisgötu 62. |
| #197 | 22.08 | active | Þrjár tómar raðir fjarlægðar 21.08: Aegina (greiðandi), SAB/U2 (Naustavör 18), Ármúli 13 sameign (ágiskun). Afrit backup_hl_tomar_rodir_20260821. |
| #325 / #326 | 01.09 | active | HEIMALEIGU-KORTIÐ staðfest af Agnari 01.09 með níu reikningum: Heimaleiga ehf (base 293) 10 staðir; greiðendur með eigin kt: G14 (Grensásvegur 14), EA Law (Freyjugata 16), Bríetartún húsfélag 540119-0660, Aegina (BÆÐI Urðarhvarf 2 OG 4), S30, S&H Invest, Mannheimar, SAB (engin stöð — eyða). Heimaleiga sjálf greiðir Laugaveg 42 og Mána. Níu greiðendur, 17 stöðvar, 443 tæki. |
| #350 | 02.09 | active | GREIÐANDI = hausinn á PDF. R-106967 Urðarhvarf 2 stílaður á Heimaleigu, R-107300 Urðarhvarf 4 á Aegina. Tillaga um að færa Blue Mountain á Aegina var RÖNG og felld. |
| #1128 / #1129 | 01.09 (skráð 04.11) | active | Greiðandi án tækja (EA Law, SAB) = greiðandi, ekki þjónustustaður. Grensásvegur 14 = tveir staðir (Höfuðstöðvar skoðun 3, G14 skoðun 11). |
| #909 | 26.10 | active | Rekstrarfélög og gáttin lesa bæði customers_base.rekstrarfelag og AppSettings.rekstrarfelog[].buildings — Laugavegur 42 birtist líka hjá Heimaleigu. |
| #1045 | 25.10/04.11 | active | Opin spurning: á gátt Heimaleigu að sýna allt rekstrarfélagið (17 staði) eða hvert félag fyrir sig. |
| #1574 | 04.11 | active | Gáttir (base 293 Heimaleiga, 676 S&H, 866 S30 o.fl.) eru opnar án lykilorðs; /heimaleiga stuttslóð í netlify.toml. |

### 1b. Laugavegur 18 — Máni (fid 869) og Midtown (fid 1486)
| id | dags | staðreynd |
|---|---|---|
| #152 | 20.08 | TVÖ aðskilin verk sem má ALDREI sameina: Midtown 1.–2. hæð (61 tæki, okt-skoðun), Máni 3.–6. hæð (54 tæki, júlí-skoðun; 52 léttvatn + 1 CO2 + 1 slanga). Okt-skýrslan heitir „Máni Apartments og Midtown Hotel“ en tilheyrir Midtown. |
| #147 | 20.08 | Stafsetningarvillan „Laugarvegur 18“ var EINA aðgreiningin; leyst 20.08 með viljandi aðgreiningu „(Máni, 3.–6. hæð)“ / „(1.–2. hæð)“. |
| #285 / #286 | 30.08 | Pörun: Máni 1427 = skýrsla 1523 + R-107052. arsskodun_report_facts: 869←1523/54/júlí, 1486←1669/61/okt. |
| #288 | 30.08 | „Máni-skýrslan 2025 er 54 tæki (júlí). Skráin er enn 61 tæki með sama mix og Midtown — ekki sameina húsin og ekki eyða tækjum án skýrslu.“ Summa á að vera 115, ekki 122. |
| #431 | 07.09 | Tvítaka-samanburður: „Heimaleiga Máni/Midtown 61+61 tæki á sama stað“ skráð sem tvítak innan lista, bíður Agnars. |
| #621 | 20.09 | Falskt grænt 2026 (steps_2026 stimplað án sönnunar) fjarlægt af 869, 1484, 1486, 1487, 1622; lyi 2026→2025 á 1486. |
| #746 | 05.10 | Teikningar settar upp: 869 Máni (3.–6. hæð Laugavegur 18), 1486 Midtown (Vegamótastígur 7-9) — VAFI: tæki 1486 bera staðinn Laugavegur 18 (1.–2. hæð). |
| #764 | 06.10 | OPIÐ FJÁRMÁL: Midtown Hotel okt 2025 61 tæki ENGINN reikningur. |
| #822 | 14.10 | Vegamótastígur 9 (Midtown) finnst ekki í Staðfangaskrá. |
| #854 | 16.10 | Midtown = 61 herbergi skv. Agnari 09.10 (Vegamótastígur 7–9, rekið með Laugavegi 18/18B). |
| #907 | 20.10 | Búnaðargreining Mána (id 7): 14 tæki lesin af teikningum (3+4+4+3); 54 léttvatn skráð án staðar. |

### 1c. Bríetartún 9-11 (fid 443 og 1487)
| id | dags | staðreynd |
|---|---|---|
| #194 | 22.08 | TVÖ verk í sama húsi: Heimaleiga (okt 2025, 4 léttvatn + 4 slöngur, sameign) og húsfélagið 540119-0660 (des 2025, 48 léttvatn í íbúðum). 56 tæki alls. |
| #195 | 22.08 | Fjórir reikningar á 193.600 kr eru SAMA verkið (des 2025): R-107643 → R-107757 → R-107758 … |
| #278 | 29.08 | Tækjanöfn án fyrirtaeki-raðar: Bríetartún 9-11 (48). |
| #330/#331/#364 | 01.–03.09 | status-sían 'active' faldi Bríetartún 48 (status „Í lagi“), Dalbrekka 48, bílskúr 16; lagað í kóða 01.09 og í view 03.09. |
| #332 | 01.09 | fid 443 endurnefnt „Heimaleiga - Brietartun 9-11 (husfelag)“ 01.09; 48 tæki báru gamla nafnið, samræmt sama dag. |
| #908 | 26.10 | SNÚIÐ VIÐ eftir pósta+PDF: des-2025 (48 íbúðatæki, skýrsla 1934) var ÍBÚÐIR Heimaleigu (Sölvi CEO 26.01: Heimaleiga greiðir), okt-2025 (8 tæki, skýrsla 1866, R-107527) var SAMEIGN pantað af Dimku. Keðjan …→R-108266 greitt 29.05.2026 156.262 af 193.600 (krafa skráð 80 %, mismunur 37.338 óskýrður). Storage-afrit 1934 var okt-skýrslan — endurafritað. |
| #909 | 26.10 | 443 = íbúðir Heimaleigu (48), 1487 = sameign húsfélagsins (8); afrit backup_20261026_brietartun. |
| #910 | 26.10 | Netföng Bríetartúns víxluð (443 dimka@, 1487 reikningar@eignaumsjon.is). |

### 1d. Grensásvegur 14 / Höfuðstöðvar (fid 269) og G14 (fid 204)
- #150 (20.08): kredit-mynstur: R-107256 (32.573) → kredit R-107266 → R-107267 (27.900).
- #179 (21.08, merkt WRONG): 7 „G14 ehf“ tæki fjarlægð (afrit backup_grensas_g14_20260821) — síðar afturkallað; #190/#325/#1129 staðfesta G14 sem sérstakan stað með 7 tæki.
- #190 (21.08): tvítalning í appinu (Heimaleiga 6 + G14 7 sýndu bæði 13) — gögn rétt, kóðavilla.
- #286 (30.08): 269 bar 2026-fakta úr Freyjugötu-skýrslu 1955; leiðrétt 269←408/2025.
- #765 (06.10): 408 lesið = Höfuðstöðvar 2025: 3 lv, 1 co2, 2 slöngur ágú = R-107256. R-107256 (26.269) og R-107267 (22.500) sömu línur — tvírukkun/endurútgáfa?
- #785 (10.10): HQ #269 bar Mána-tölur → 6 (2025).
- #536 (12.09): 7 reikningsstaðreyndir á HQ #269 meðan skjalið er tengt stað.
- factcheck_bord #116 (01.11): skjal 859 (G14 brunakerfisskýrsla 23.11.2023) fært af 269 á 204, merkt tvítak af 6396.

### 1e. Aðrir staðir
- Urðarhvarf 4 (fid 1622): #169 (21.08) R-107254 á Heimaleigu → kredit R-107299 → R-107300 á Aegina 10.09.2025 236.889 kr; PDF fært á 1622, customer_base_id áfram Aegina. #1295 (04.11): Dimka staðfesti 25.09.2026 að Urðarhvarf 4 fari á Aegina.
- Urðarhvarf 2 (fid 1483): #151 óleyst Aegina/U2; #326 segir Aegina; #350 (02.09) mælt: R-106967 stílaður á Heimaleigu → Urðarhvarf 2 UNDIR Heimaleigu. #913 (27.10): R-104473 SAB ehf. líklega Blue Montain (skjal 10342).
- Laugavegur 42 / Iðun (fid 835): #173/#174 (21.08) tvískráð 10+10, húsfélagið (IDA-raðnúmer, R-107860) heldur; #196 (22.08) greiðandi ræður → húsfélagið 611096-2599; #1289 (04.11) Dimka bað 11.02.2026 um kt 6110962599. Þjónustuborðsmál #1289 (26.10): kreditfæra R-107909? → Agnar 27.10: EKKI kreditfært (gert upp við fyrri eigendur).
- Laugavegur 46 (fid 305): #181/#284 skjal 9206 „ice_apartments_heimaleiga_2025.pdf“ fært á Ice Apartments 1484 30.08. #1291: reikningar á S&H Invest (Dimka 10.03.2026, 5 íbúðir + 2 sameignir).
- Freyjugata 16 (fid 1485) / EA Law (fid 857): #287/#309 R-108092 á EA Law „Vegna Freyjugötu 16“ → liggur á 1485; #536 + mál #943 (12.09): 4 tvítalin tæki á #857; #1293 Dimka 13.03 og 18.03.2026.
- Hamraborg 7 / Iceland Comfort (fid 1488): #47 skýrsla send 24.07.2026; #149 R-107031 passar júní-skýrslu; lota 05.10: 24.09 var 11 tækjum eytt af prófílnum og tæki leigjenda á jarðhæð sett í staðinn, R-001029 (52.519) ósend — „hver á að borga?“; mál #1124 (07.10) T=S 5/15; #1199 leyst 26.10 (15 tæki úr skýrslu 9853, R-000712 stemmir); #1297 skýrsla júlí 2026 óundirrituð, Slökkviliðið gerði athugasemd, Eva bað um úrbætur 02.11.
- Eldsalir ehf (kt 491117-1840, fid 1851 „Hamraborg 7, jarðhæð“): inbox #382/#945 (pending) Dimka bað 06.10.2026 um að reikningar fari á Eldsalir, ingi@kaskur.is; mál #1116 lokað: Eldsalir stofnað 08.10, R-001109 (52.519) send 09.10, greidd 22.10.
- Dalbrekka 4-6 (1621) + bílskúr (1645): #306/#307 (01.09) R-000683 = 44 léttvatn (43 yfirferðir + 1 hleðsla, leiðrétt af Agnari); #330 faldi 48+16; #1064 teikniblaði skipt milli 1621 og 1645.
- Mannheimar (fid 626): #182 — aðeins Grettisgata 62.

### 1f. Viðskipti / verð / samskipti
- #840 (16.10): v_kunni_netfong: Heimaleiga 0→46 póstar.
- #910 (26.10): umsjonarpostur_tengsl: 135 af 166 Heimaleigu-póstum síðan 2025 á eign.
- #911 (26.10): 91 skýrslu-PDF Heimaleigu + Center lesin, 84 stemma.
- #913 (27.10): Stólpi-gluggi frá 2023-01-01; opið_vid_yfirtoku=greitt.
- #944 (02.11): OFRUKKAÐ: einingaverð yfir samningi (2.700/4.400/2.500/3.500/3.000/-25 %) á 18 reikningum jún 2025–okt 2026 = 45.519 kr án vsk á 8 greiðendur (Heimaleiga 20.703, S30 9.654, Eldsalir 8.539, Aegina 3.300, Mannheimar 1.108, Húsfélagið L42 1.108, EA Law 554, S&H 554). Ný kjör Bjarndísar 30.10 (2.000/2.000/2.500/1.500/4.350/2.400/0/-25 %) gilda fram í tímann. Ekki í B: R-107909, Bríetartún-tvígreiðsla (banki ÓMÆLT), 80 %-skráning.
- #950 (03.11): Hunter sá ekki Heimaleigu-þráðinn 28/10–02/11.
- #1287/#1288 (04.11): Dimka Dimitrova dimka@heimaleiga.is +354 449 4949 (líka vidhald@); Eva Mareksdóttir eva@ +354 696 3636 (tilboð/verð/samstarf, með Ernu rekstrarstjóra); fundur 28.10.2026 kl. 09:30 á Grensásvegi 7.
- #1215–1217, #1471 („Búnaður Heimaleigu 22.10“): reglugerðar-lærdómar.

## 2. charlize_inbox (27 raðir)
Allar approved-raðir eru þegar komnar í charlize_knowledge (#64→1045, #181→1136, #237→1574, #299–302→1215–1217/1471, #307–308→1128–1129, #376–381→1287–1295).
PENDING (ekki samþykkt enn):
- #382 og #945 (04.–05.11): Þjónusta Heimaleigu á að reikningsfærast á Eldsalir ehf (4911171840), ingi@kaskur.is — beiðni Dimku 06.10.2026 (póstur 60397). ATH: orðalagið „þjónusta Heimaleigu“ er víðara en mál #1116 (sem afgreiddi EINN reikning fyrir Hamraborg 7 jarðhæð).
- #898 Veiðin: Bríetartún 443 — R-107758 á staðnum, engin skoðun 2026; yfirfara tvíbókaða R-108130/R-108266.
- #903 Veiðin: Höfuðstöðvar 269 — „kanna með Evu hvort Grensásvegur 14 sé sjálfstæður staður eða tvítak“ (stangast á við #1129).
- #904 Veiðin: Máni 869 — „uppfæra tækjafjölda í 54 eftir skýrslu 1523“ (er þegar 54 í grunni, sjá kafla 7).
- #905 Veiðin: Ice Apartments 1484 — skoðun 2026 vantar.
- #906 Veiðin: Midtown 1486 — „deilir raðnúmerum og heimilisfangi með Mána“ (RANGT í dag, sjá kafla 7); „Midtown (1.-2. hæð, 52 tæki)“.
- #909 Veiðin: EA Law 857 — tæki skoðuð 01.04.2026, skýrsla á 1485?
- #944: reikningar fyrir Dalbrekka 4-6 og Hamraborg 7 ekki tilgreindir í póstum.
- #947: lofað nýju tilboði eftir fund 28.10; Eva bað 29.10 um verðsamanburð + tilboð í neyðarlýsingu, brunakerfi, sprinkler, pípara.
- #950: Heimaleiga samþykkti 04.11.2026 tilboð um yfirferð slökkvitækja og brunaslönguhjóla (staðfesting Evu), hin tilboðin í skoðun.
- #951: sérkjör 2.700/4.400 + vsk (gefin 28.07.2026, uppfærð 30.10).

## 3. charlize_contacts (@heimaleiga.is, kt 510117-0690)
approved: Róbert Melax (robert@, 2025-05→06), Eva Mareksdóttir (eva@, 18 færslur, 2025-11→2026-08), Sölvi Melax (solvi@, 10 færslur, 2024-11→2026-01), Erna Ósk Ingvarsdóttir (erna@, 11), Eyþór Ingason (eythor@, 2024-09), Ásgeir Ólafsson (asgeir@, 2022-11).
pending: dimka@heimaleiga.is (hlutverk rekstur), vidhald@heimaleiga.is (húsvörður) — báðar frá 07.08.2026, aldrei samþykktar þótt Dimka sé aðaltengiliðurinn.

## 4. factcheck_bord (13 raðir) — Heimaleiga nefnd
- #19 (23.08 cowork): staðar-fellilisti í Skýrslu-stöð of þröngur — Heimaleiga borgar fyrir staði á eigin kt (Laugavegur 42 fid 835, Bríetartún).
- #20 (23.08 cowork): „Heimaleiga ehf - 510117-0690 - 2026“ reyndist Laugavegur 42 (Iðun) — tvítak; skýrslan nefnir að slökkvitæki VANTAR í íbúð 201.
- #16/#21 (23.08 code): tækjateljari paraði á földuðu client-nafni (153-arsskodun) — PR #706.
- #44 (28.08 cowork): tækja-endurbygging nætur 28.08 BÖKKUÐ; Heimaleiga hefur tæki dreifð á active OG „Í lagi“/ok.
- #49 (31.08 natalie): 5 Heimaleigu-staðir án eigin 2026-skýrslu á fyrirtaeki_id (systkina-kt).
- #116 (01.11 code): skjal 859 fært 269→204 (G14 brunakerfi), afrit #26.
- #54/#60/#62/#74/#100: næturvaktir — engin Heimaleigu-ákvörðun framkvæmd.

## 5. LOTUR (fyrri Claude-lotur)
Transcript-leitin skilar einum bút per lotu; afritin voru grep-uð. Lotan „Heimaleiga verðgreining [e7c797]“ er fjar-/Remote-Control-lota og EKKERT afrit af henni finnst á þessari vél.

| dags | lota (sessionId) | hvað var gert/ákveðið um Heimaleigu |
|---|---|---|
| 2026-06-29 | „Greeting“ (989affd5, archived) | Póstsamantekt: Dimka 01.06 „Re: Tilboð í yfirfærslu“ + biður um skýrslu síðasta árs fyrir Hamraborg 7; 02.06 „Re: Laugavegur 46 fire extinguisher update“. |
| 2026-07-15/16 | „main local“ (4d755db8) | Prentlisti með Heimaleigu-raðir rauðar (forgangur); Heimaleiga „með 8 staði“ opnaði sömu kt-víðu Drive-skýrsluna. |
| 2026-07-21/22 | „Site theme…“, „Organice bug fix“ (archived) | Verkborð: mál 22 Dimka „Re: Tilboð í yfirfærslu“, mál 688 „Skýrsla fyrir Hamraborg 7 (frá í fyrra)“ (14.07). |
| 2026-07-28 | 3de57db5 (C:\Users\Notandi) | Villa 1: Máni 61 + Midtown 61 sýndu bæði „122“ — mælt: gögnin hrein (61/61, sitt hvor client), kóði telur eftir client-nafni; Villa 4: Heimaleiga úr 21 röð í 19 (Midtown hotel/Hotel → #1486, „Bríetartún 9 og 11“/„9-11“ → #1487, Laugavegur 1 sameinað). PR #494. |
| 2026-07-29 | „Luna greeting“ (a234ef79) | rekstrarfelog-seed: Heimaleiga {domain heimaleiga.is, emails dimka@, erna@, buildings [kt 6810130830 …]}; sama 122-villa nefnd. |
| 2026-08-06/07 | „Verkbok upgrade“, „Vikudagskrá“, fe668f62 | Verkbók/Þjónustuborð: haus „★ Dimka Dimitrova · Re: Tilboð í yfirfærslu“, „Heimaleiga — Tilboð í yfirferslu · skýrsla fyrir Hamraborg 7“ (PR #603). |
| 2026-08-19 | (artifact) | Artifact „Heimaleiga — rekstrarfélag“ https://claude.ai/artifact/UhCyVy7KtvLXSKTQTjUcRs búinn til. |
| 2026-08-30/31 | 2b47ca79 (C:\projects) | 18 fyrirtæki með falin tæki í ok/„Í lagi“ — Dalbrekka 48, Bríetartún 48; S30 R-107778 (235.915) lifir aðeins sem Drive-skjal; Agnar: nafn á sölu ≠ starfsstöð er meinlaust hjá Heimaleigu (rekstrarfélag vs staður). |
| 2026-09-07 | „GitHub connection“ (7acf714c) | Charlize-skráning #170 („sjö kennitölur… dimka@“); Bríetartún 48 raðir „listi vantar tæki → skráð aftur“. |
| 2026-09-23 | 17c4cd7a (C:\projects) | Höfuðstöðvar 269: prófíll 5, skýrsla 2026 segir 10, reikningur 2025 4/2/0 — bíður Agnars. |
| 2026-10-02/04 | 6db7868a „HT-2.10 Design“ | Agnar: „Just compact the heimaleiga better“ → fyrirtækjasíðan þjöppuð (37a179c), prófað á Heimaleiga - G14. |
| 2026-10-05 | e9205308 (C:\projects) | Teikningar: Máni 3.–6., Midtown kj+1.–5., Bríetartún kj+1.; Iceland Comfort: „24.09 var 11 tækjum eytt af prófílnum og tæki leigjenda á jarðhæð sett í staðinn, R-001029 ósend — hver á að borga, Heimaleiga fyrir alla eða skipt?“ (ÁKVÖRÐUN BEÐIN). Undiragent: 1488 „do NOT lower the copy“ (R-000712 = 15 tæki). |
| 2026-10-06 | e9205308 | Rekstrarfélögin þrjú rennd gegnum Para eftir magni (Agnar: „renna Center Hótel, Heimaleigu og Aðalskoðun“); Midtown okt 2025 61 tæki enginn reikningur; Heimaleiga HQ sama kt-leki og Aðalskoðun. |
| 2026-10-07 | 6db7868a | Þjónustuborðsmál #1124 stofnað (T=S Iceland Comfort 5/15). |
| 2026-10-10 | 6db7868a | Tvöfaldar gáttir eytt: `s-h-invest-ehf-heimaleiga-laugavegur-46-2`, `s30-ehf-heimaleiga-armuli-13a-2`. |
| 2026-10-13/14 | 731f63e0 „HT 13.10“ | Hleðsluspá: Midtown 57 tæki til hleðslu, Bríetartún 24; hópgreining (greina-hop) 16 Heimaleigu-staðir; Midtown (Vegamótastígur 9) finnst ekki í Staðfangaskrá; Laugavegur 16 og Dalbrekka 4-6 þurfa val á matshluta. |
| 2026-10-21 | 877c9427 | Agnar: „continue with greiningar for heimaleiga and center hotels“ → 22 af 25 stöðum með vistaða búnaðargreiningu (tillaga); Iceland Comfort greining id 29 lokið; Bríetartún húsfélag (verk 11) ekki snert því sama hús greint undir 443 með 43 atriðum. |
| 2026-10-23 | 6db7868a | Ekki lagað: gátt Heimaleigu ehf sýnir 10 staði en rekstrarfélagið er 10 félög/17 staðir; S30 og S&H með eigin gáttir; 5 staðir í engri gátt. |
| 2026-10-29 | 1636c75e (Downloads) | Agent „systkini Heimaleiga“: engin týnd 2026-skýrsla; skoðunarmánuðir okt–des hjá 443, 869, 1484, 1486, 269 — ekki á gjalddaga; Midtown og Máni deila 2025-skýrslu. Gmail-hólfið geymir aðeins sjálfvirk afrit (Hamraborg 7, Dalbrekka bílskúr). |
| 2026-10-29 | 2ef635f0 (Downloads) „Veiðin hunt“ | Agnar hafði 27.10 ÁKVEÐIÐ: R-107909 (Laugavegur 42) EKKI kreditfært — gert upp við fyrri eigendur, skráð í varnarblað (mál #1289 lokað 29.10); tvígreiðslur 11.02 og 19.09.2025 merktar villa og teknar út. Tillaga #1290 (Midtown 61→10) stenst ekki (54+10=64≠61) → sett „opið“. Fundurinn 28.10 var HALDINN (færður á 9:30, eftirfylgni send), ekki aflýstur eins og #1334/#1329 segja. Þjónustuborðsmál „hlaða á 5 ára fresti?“ lokað — rætt á fundinum. Eva 29.10 16:16 bíður tilboðs eftir verðsamanburð. |
| 2026-11-01 | 1636c75e | Agnar: „859 og 1024 má færa á réttan stað“ → 859 fært 269→204 (G14 brunakerfi, tvítak af 6396). |
| 2026-11-02 | d6c764f7 / e481e429 „Aðalmál“ | Vikuyfirlit #1376 liður 7: fundur 28.10 haldinn (Bjarndís), sérkjör send 30.10, Eva „verðin líta vel út“ en óviss um fyrirkomulag greiðenda; 4 hús (131 tæki) áttu í skoðun í október — mál #1374 spyr hvenær. Bíður: frágangur samnings. |
| 2026-11-04 | 9c6b6014 „Tekjuvaktin“ | Mál #1116 lokað: „Eldsalir ehf. stofnað 08.10, R-001109 (52.519 kr) send 09.10 og greidd 22.10“. |

## 6. VERKEFNI
### verkefnalisti (27 raðir nefna hópinn — þær sem skipta máli)
| staða | stofnað | titill | kjarni |
|---|---|---|---|
| klarad 11.09 | 28.07 | HEIMALEIGA: Freyjugata 16 og Dalbrekka 4-6 — engar skýrslur til | 25.08: skýrslurnar ERU til (Freyjugata doc 1955 mars 2026; Dalbrekka úttekt+reikn.). |
| beidni (opið) | 28.07 | HEIMALEIGA: Laugavegur 42 (Iðun) — vantar slökkvitæki í íbúð 201 | Útkall; 03.11 ENNÞÁ OPIÐ (fid 835). |
| klarad 22.08 | 28.07 | REKSTRARFÉLÖG: tvíteknar byggingar-raðir | Laugavegur 18 sem 3–4 raðir, Laugavegur 42 tvisvar → PR #494. |
| klarad 22.08 | 28.07 | VILLA: tækjafjöldi = summa á kt | Máni 61 + Midtown 61 = „122“ → PR #527. |
| sleppt | 30.07 | FALSKT GRÆNT: skýrsla annars staðar sýnd á HQ-röð (Heimaleiga LAGAÐ) | Unnið sem mál #1191 09.10. |
| beidni | 08.08 | Staðarnúmer (stadur_nr) | Heimaleiga 12 staðir á einni kt — kt ekki einkvæm. |
| klarad 25.08 | 22.08 | Tækjatenging: customer_base_id í joinið | Höfuðstöðvar 13→6 (PR #415). |
| klarad 11.09 | 22.08 | Sameina 10 tvítekin félög | sameining 24.08, Natalie-reglan. |
| klarad 11.09 | 29.08 | Rekstrarfélög: tækjaskiptingin sama uppspretta og Ársskoðun | e3c7f31. |
| sleppt | 11.09 | Rekstrarfélög: 4 tækjatölur víkja (CO2 á EA Law, Heimaleiga HQ) | v_stadur_yfirlit sleppir kreditfærðum. |
| beidni | 02.11 | Kostnaðaryfirlit gáttar sýnir aðeins 2024–2026 | Mælt 27.10 á gátt Heimaleigu: R-104402/3 G14 og R-104473 Blue Montain (2023) vantar. |

### Þjónustuborðsmál (thjonustubeidni) sem nefna hópinn
#943 lokað (EA Law tvítalin), #1124 lokað (Iceland Comfort 5/15), #1191 lokað (kt-leki Grensásvegur), #1289 lokað 29.10 (R-107909 ekki kreditfært), #1290 NÝTT/opið (Midtown 61→10?), #1329 NÝTT (ofgreitt ~122.659 kr, Bríetartún greitt tvisvar — inneign eða endurgreiðsla?), #1116 lokað (Eldsalir), #1374 (hvenær skoðun 4 húsa), #1376 vikuyfirlit.

### artifact_listar
Ekkert — titlar nefna ekki Heimaleigu og `atridi` er tómt fylki í öllum 17 röðum.

## 7. GRUNNURINN (fyrirtaeki + uttaeki, mælt 05.11.2026)
Dálkar: `fyrirtaeki(id,nafn,kennitala,heimilisfang,customer_base_id,status,er_i_thjonustu,stadur_nr,…)`, `uttaeki(id,serial,type,size,client,location,last_insp,status,customer_base_id,fyrirtaeki_id,…)`. Tæki talin með `status is distinct from 'urelt'`.

| fid | nafn | kt / base | tæki (í notkun) | mix | raðnúmer / created |
|---|---|---|---|---|---|
| 269 | Höfuðstöðvar, Grensásvegur 14 | 510117-0690 / 293 | 6 | LV 3, slanga 2, CO2 1 | FC269-* (09.10.2026) |
| 204 | G14 ehf, Grensásvegur 14 | 510809-0170 / 308 | 7 | LV 5, slanga 2 | AE20260626I-00013..19 (21.08) |
| 869 | Máni Apartments, Laugavegur 18 (3.–6. hæð) | 510117-0690 / 293 | **54** | LV 54 | FC869-lettvatn-1..54 (23.08.2026), last_insp 2025-10-01 |
| 1486 | Midtown Hotel, Vegamótastígur 9 (tæki: Laugavegur 18 1.–2. hæð) | 510117-0690 / 293 | **61** | LV 56, slanga 4, CO2 1 | AE20260728-01209..01269 (28.07.2026), last_insp 2025-10-01 |
| 443 | Bríetartún 9-11 (íbúðir) | 510117-0690 / 293 | 48 | LV 48 (status „Í lagi“) | AE20260821-BT001..048 |
| 1487 | Bríetartún 9-11 (húsfélag, sameign) | 540119-0660 / 394 | 8 | slanga 4, LV 4 | AE20260621H-0132..0139 |
| 1483 | Blue Mountain, Urðarhvarf 2 | 510117-0690 / 293 | 42 | LV 37, slanga 5 | AE20260728/AE20260821 |
| 1622 | Icelandic Apartments, Urðarhvarf 4 | 681013-0830 (Aegina) / 784 | 40 | LV 40 | TMP-4260..4299 |
| 1484 | Ice Apartments, Laugavegur 1 | 510117-0690 / 293 | 8 | LV 7, CO2 1 | |
| 1485 | Freyjugata 16 | 510117-0690 / 293 | 5 | LV 4, CO2 1 | |
| 857 | EA Law Practice, Skipholt 50D | 650222-0400 / 681 | 0 (4 urelt) | — | er_i_thjonustu=false |
| 1488 | Iceland Comfort, Hamraborg 7 | 510117-0690 / 293 | 15 | LV 12, slanga 2, CO2 1 | |
| 1851 | Hamraborg 7, jarðhæð — Eldsalir ehf. | 491117-1840 / 1210 | 5 | LV 5 | |
| 1621 | Dalbrekka 4-6 | 510117-0690 / 293 | 48 | LV 44, CO2 4 | |
| 1645 | Dalbrekka 4-6 (bílskúr) | 510117-0690 / 293 | 16 | LV 7, slanga 6, duft 2, CO2 1 | |
| 626 | Mannheimar, Grettisgata 62 | 680169-6409 / 769 | 8 (16 alls, 8 urelt) | LV 8 | |
| 243 | S30 Apartments, Ármúli 13A | 711096-2059 / 866 | 65 | LV 58, slanga 7 | |
| 305 | Laugavegur 46 | 641115-0100 (S&H) / 676 | 6 | LV 5, CO2 1 | |
| 835 | Húsfélagið Laugavegi 42 (Iðun) | 611096-2599 / 586 | 10 | LV 9, duft 6 kg 1 | IDA-2602-* |
| 916 | S&H Invest ehf. | kt null, base null | 0 | — | er_i_thjonustu=false (draugaröð) |

Samtals í notkun á þessum 20 röðum: 452 (443 í Charlize #326 01.09 + Eldsalir 5 + G14/annað).

**Máni vs Midtown:** EKKI sami tækjalisti lengur. Máni 869 = 54 léttvatn með FC869-raðnúmerum (búin til 23.08.2026), Midtown 1486 = 61 (56 LV + 4 slöngur + 1 CO2) með AE20260728-raðnúmerum. **Engin raðnúmer eru sameiginleg** (join á serial milli 869 og 1486 skilar 0 röðum). Heimilisföng eru viljandi aðgreind („(3.–6. hæð)“ / „(1.–2. hæð)“), en fyrirtaeki.heimilisfang hjá 1486 er Vegamótastígur 9 meðan uttaeki.location segir Laugavegur 18. Minnið #288 (30.08) „skráin er enn 61 með sama mix“ og #431 (07.09) „61+61“ og inbox #906 (04.11) „deilir raðnúmerum“ eru ÚRELT miðað við grunninn í dag — ATH að created_at 23.08 á FC869-röðunum stangast á við dagsetningu #288, svo annaðhvort voru raðirnar endursmíðaðar með eldri stimpli eða #288 lýsti öðru (t.d. facts/blob) en uttaeki.
Ekkert tvískráð milli Máni og Midtown; Máni-mixið (54 LV) passar ekki júlí-skýrslunni skv. #152 (52 LV + 1 CO2 + 1 slanga).

---

## Tímalína ákvarðana (dags · hvað · heimild)
- 2026-06-01/02 · Dimka biður um tilboð í yfirfærslu + Hamraborg 7 skýrslu; Laugavegur 46 uppfærsla · lota 989affd5, verkborð mál 22/688
- 2026-02-11 · Dimka: Laugavegur 42 rukkist á kt 6110962599 (húsfélagið) · CK #1289 (póstur 15732)
- 2026-03-10 · Dimka: Laugavegur 46 á S&H Invest · CK #1291
- 2026-03-13/18 · Dimka: Freyjugata 16 á EA Law Practice · CK #1293
- 2026-07-28 · Heimaleiga-raðir í rekstrarfélagasýn sameinaðar 21→19 (Midtown ×2, Bríetartún ×2) · lota 3de57db5, PR #494
- 2026-07-28 · Sérkjör 2.700/4.400 + vsk gefin · inbox #951
- 2026-08-20 · Máni/Midtown aðgreind með viljandi heimilisfangi; ALDREI sameina · CK #147, #152
- 2026-08-21 · Norðurstígur 5a tekinn úr hópnum (Agnar); Aegina/SAB/Ármúli 13-sameign tómar raðir fjarlægðar; Laugavegur 42 Heimaleigu-afrit (AE-raðnr) eytt, húsfélagið heldur · CK #182, #197, #174
- 2026-08-22 · Bríetartún = tvö verk (Heimaleiga sameign 8 / húsfélag íbúðir 48) · CK #194 (snúið við 26.10)
- 2026-08-30 · Skjal 9206 fært á Ice Apartments; pörun Heimaleigu lagfærð með UPDATE ekki DELETE; facts 869←1523/54, 1486←1669/61 · CK #284–#288
- 2026-09-01 · Agnar staðfestir Heimaleigu-kortið (9 greiðendur, 17 stöðvar, 443 tæki); Aegina greiðir BÆÐI Urðarhvarf 2 og 4; yfirferð+hleðsla = sitthvort tæki (Dalbrekka 44) · CK #325, #326, #307
- 2026-09-02 · Tillaga um að færa Blue Mountain (Urðarhvarf 2) á Aegina FELLD — R-106967 stílaður á Heimaleigu · CK #350
- 2026-09-20 · Falskt grænt 2026 fjarlægt af 869/1484/1486/1487/1622 · CK #621
- 2026-09-24 · Iceland Comfort: 11 tæki tekin af prófíl, tæki leigjenda á jarðhæð sett inn; R-001029 ósend · lota e9205308 (05.10)
- 2026-10-06 · Dimka: reikningar á Eldsalir ehf, ingi@kaskur.is · inbox #382 (pending)
- 2026-10-08/09 · Eldsalir ehf stofnað, R-001109 send 09.10, greidd 22.10 · mál #1116
- 2026-10-09 · Midtown = 61 herbergi skv. Agnari; HQ #269 leiðrétt í 6 (2025) · CK #854, #785
- 2026-10-21 · Búnaðargreiningar Heimaleigu/Center keyrðar (Agnar: „continue…“), 22/25 vistaðar sem tillaga · lota 877c9427
- 2026-10-26 · Bríetartún SNÚIÐ VIÐ: 443 = íbúðir Heimaleigu (48), 1487 = sameign húsfélags (8); Hamraborg 7 facts 15 · CK #908/#909, mál #1199
- 2026-10-27 · Agnar: R-107909 (Laugavegur 42) EKKI kreditfærður — gert upp við fyrri eigendur; tvígreiðslur 2025 merktar villa · lota 2ef635f0, mál #1289
- 2026-10-28 · Fundur með Heimaleigu (Eva/Erna, Bjarndís) HALDINN kl. 9:30 · lota 2ef635f0, #1376
- 2026-10-30 · Ný sérkjör Bjarndísar send (2.000/2.000/2.500/1.500/…) · CK #944
- 2026-11-01 · Skjal 859 fært af HQ 269 á G14 204 (Agnar: „má færa“) · factcheck_bord #116
- 2026-11-02 · Ofrukkun mæld: 45.519 kr án vsk á 18 reikningum · CK #944
- 2026-11-04 · Eva staðfestir: Heimaleiga samþykkir tilboð um yfirferð slökkvitækja + brunaslönguhjóla · inbox #950

## Mótsagnir
1. **Fjöldi kennitalna:** #170 (21.08) „SJÖ kennitölur“ · #326 (01.09) níu greiðendur · beiðnin/gáttarlota 23.10 „10 félög með 17 staði“ · Eldsalir (okt) bætist við sem 10./11. — ekkert eitt yfirlit telur alla (Heimaleiga, Aegina, Bríetartún-húsfélag, EA Law, Eldsalir, G14, Mannheimar, S&H, S30, SAB, Húsfélagið L42 = 11 kt í grunni í dag).
2. **Urðarhvarf 2 greiðandi:** #151 „óleyst Aegina/U2“ · #326 (Agnar 01.09) „Aegina BÆÐI 2 og 4“ · #350 (02.09, mælt á PDF) R-106967 stílaður á Heimaleigu → undir Heimaleigu · #913 (27.10) R-104473 (2023) SAB ehf. líklega Blue Montain. Grunnurinn: 1483 undir Heimaleigu 293.
3. **Bríetartún — hver á hvað:** #194 (22.08) Heimaleiga=sameign 8, húsfélag=íbúðir 48 · #908/#909 (26.10) ÖFUGT: Heimaleiga=íbúðir 48 (443), húsfélag=sameign 8 (1487). Grunnurinn fylgir 26.10. Mál #1329 (ofgreitt ~122.659) og #908 (156.262 af 193.600, mismunur 37.338) gefa ólíkar tölur um tvígreiðsluna; banki ÓMÆLT.
4. **Máni tækjalisti:** #288 (30.08) „enn 61 með sama mix og Midtown“, #431 (07.09) „61+61“, inbox #906 (04.11) „deilir raðnúmerum“ · grunnurinn í dag: 54 vs 61, engin sameiginleg raðnúmer, FC869-raðir stimplaðar 23.08 (fyrir #288). Skýrsla 2025 (#152) segir 52 LV + 1 CO2 + 1 slanga en skráin er 54 LV.
5. **Midtown tækjafjöldi:** 61 (skýrsla okt 2025, #152/#286) · mál #1290 tillaga 61→10 · inbox #906 „52 tæki“ · lota 29.10: 54+10=64≠61 → opið.
6. **Midtown heimilisfang:** fyrirtaeki = Vegamótastígur 9 (finnst ekki í Staðfangaskrá, #822) · uttaeki.location = Laugavegur 18 (1.–2. hæð) · #854 Vegamótastígur 7–9 „rekið með Laugavegi 18/18B“.
7. **G14 tækin:** #179 (21.08) 7 tæki fjarlægð sem gömul — merkt WRONG; #190/#325/#1129 staðfesta G14 sem sérstakan stað með 7 tæki (eru í grunni í dag).
8. **Grensásvegur 14 sjálfstæður?** #1129 (01.09) tveir aðskildir staðir · inbox #903 (04.11 Veiðin) „kanna hvort tvítak“.
9. **Fundur 28.10:** mál #1334/#1329 „aflýst“ · lota 29.10 + #1376: haldinn kl. 9:30.
10. **Höfuðstöðvar 269 tækjafjöldi:** prófíll 5 (23.09) · skýrsla 2026 „10“ (23.09) · 6 úr skýrslu 408/2025 (10.10) · grunnur 6.
11. **Eldsalir umfang:** mál #1116 afgreiddi einn reikning (Hamraborg 7 jarðhæð) · inbox #382/#945 (pending) segir „þjónusta Heimaleigu“ almennt eigi að fara á Eldsalir — ekki staðfest af Agnari.
12. **Iceland Comfort tækjatala:** 24.09 lækkuð í 5 (11 eytt) · 05.10 undiragent „do NOT lower the copy“ (15) · 26.10 facts 15 · grunnur 15 + Eldsalir 5 sér.
