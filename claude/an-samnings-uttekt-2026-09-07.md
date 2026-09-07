# Án samnings — en með úttektarskýrslu eða úttektarreikning 2025–2026

Slökkvitæki ehf · 7. september 2026 · unnið úr Allir viðskiptavinir (157) + skjalagrunni. Gagnvirka útgáfan: [an-samnings-uttekt-2026-09-07.html](an-samnings-uttekt-2026-09-07.html). **Engu breytt** — listinn er til yfirferðar; 🔥-takkinn á síðunni setur í þjónustu.

## Staða 07.09.2026 kl. 12:30 — 36 sett aftur í þjónustu

Að ósk Agnars („mátt kannski bara setja fyrirtækin aftur í þjónustu, ég hendi þeim aftur út þegar ég er búinn að skoða þau betur") voru **36 fyrirtæki** sett í þjónustu ( +  í stillingum + færsla í ). Afrit fyrir: . **Sleppt (5):** Gára ehf. (aukaþjónusta með skipakúta, óregluleg búðarsala), GK-bílar ehf. (rútufyrirtæki, koma með slatta á sumrin), Partýbær ehf. (annar greiðandi sem á heima í þjónustu), Staðgreitt (staðgreiðslukúnninn) og ICS ehf. (bank-greiðandi). Þau eru merkt ⏸ í töflunni.

## Hvernig var leitað

- **Án samnings** = eins og síðan skilgreinir það: ekki `er_i_thjonustu`, engin skráning í fyrirtækjaþjónustu/brunakerfi/ferðaþjónustu í stillingum, engin virk tæki. 441 slíkir (bank-greiðendur faldir).
- **Úttektarskýrsla 2025/26**: `customer_documents` doc_type uttektarskyrsla á `fyrirtaeki_id` (tvítök sleppt).
- **Úttektarreikningur 2025/26**: (a) reikningur í skjalagrunni flokkaður `uttekt` (eða óflokkaður); (b) sala í appinu með línu sem inniheldur **Akstur** eða **Skýrslugerð** (reglan þín — sýnin `v_solur_uttektarreikningar`); (c) `uttekt_reikningur_facts` (Skýrslugerð vörunr. 060).
- **Fyrirvari:** Payday-reikningar (R-10xxxx) eru í grunninum án reikningslína — „Akstur" er ekki hægt að staðfesta fyrir þá nema með flokkun skjalagrunnsins. Sölur appsins (R-000xxx) og 060-staðreyndir eru staðfestar á línu.

## Niðurstaða: 41 fyrirtæki (5 með skýrslu, 36 bara með reikning)

| # | Fyrirtæki | kt | Staða | Skýrsla | Úttektarreikningar | Sala / annað | Athuga |
|---|---|---|---|---|---|---|---|
| 1 | [Þemasnyrting ehf](https://slokkvitaeki.netlify.app/#company/1262) | 450106-1860 | óvirkur | Úttektarskýrsla 2026 (viðhengi á prófíl, maí 2026) | R-000356 · 2026 · úttekt · 15.686 kr | Sala appsins með línunum Yfirferð · Skýrslugerð · Akstur | Skýrsla + Akstur-reikningur 2026, samt „óvirkur" og án þjónustu |
| 2 | [Húsfélagið Flétturima 16](https://slokkvitaeki.netlify.app/#company/656) | 610493-2389 | virkur | Úttektarskýrsla 2026 (uttekt-master, 100% samsvörun) | — | — | Skýrsla 2026 en enginn reikningur skráður |
| 3 | [Suðurvangur 19a, húsfélag](https://slokkvitaeki.netlify.app/#company/512) | 410390-1759 | virkur | Úttektarskýrsla 2026 (uttekt-master, 90%) | — | — | Skýrsla 2026 en enginn reikningur skráður |
| 4 | [K-50 ehf.](https://slokkvitaeki.netlify.app/#company/847) | 551217-1830 | virkur | Úttektarskýrsla 2026 (uttekt-master, 86% — merkt til yfirferðar: „K.Ric…") | R-107430 · 2025 · búð · 64.864 kr | — | Skýrslan gæti verið rangt pöruð (86%) — athuga |
| 5 | [Staðgreitt](https://slokkvitaeki.netlify.app/#company/593) | 999999-9999 | virkur | Úttektarskýrsla 2025 (uttekt-master, 95% — „Aðalsk…") | R-000402, R-000403 · 2026 · úttekt · 37.009 + 23.684 kr · R-108170 · 2026 · 5.200 kr · 7 búðarreikningar | — | Staðgreiðslu-kúnninn (999999-9999). Skýrslan á líklega heima hjá Aðalskoðun — rangt pöruð |
| 6 | [Gára ehf.](https://slokkvitaeki.netlify.app/#company/518) | 420993-2269 | virkur | — | R-000840 · 2026 · óvisst · 240.760 kr | Sala appsins með Akstur-línu (vidskiptategund „óvisst") | Akstur í línu = úttektarreikningur skv. reglu — 240 þús. kr án skýrslu og án þjónustu |
| 7 | [Álfaskeið 78-80, húsfélag](https://slokkvitaeki.netlify.app/#company/1409) | 421008-1240 | virkur | — | R-108063 · 2026 · úttekt · 63.612 kr | — | — |
| 8 | [Amrika ehf](https://slokkvitaeki.netlify.app/#company/1522) | 520916-0670 | virkur | — | R-108022 · 2026 · 25.219 kr · R-108025 · 2026 · 14.296 kr (+ kreditreikningur 108024) | — | — |
| 9 | [Art Hostel ehf.](https://slokkvitaeki.netlify.app/#company/827) | 650504-2750 | virkur | — | R-108072 · 2026 · úttekt · 39.216 kr | — | — |
| 10 | [Bílaverkst. Kjartans-Þorgeirs sf](https://slokkvitaeki.netlify.app/#company/1507) | 700388-1239 | virkur | — | R-108261 · 2026 · úttekt · 9.870 kr | — | — |
| 11 | [Crinis ehf](https://slokkvitaeki.netlify.app/#company/1510) | 580784-0549 | virkur | — | R-106490 · 2025 · 7.304 kr · R-108106 · 2026 · 8.313 kr | — | Tvö ár í röð — árleg yfirferð í reynd |
| 12 | [Fótaaðgerðarstofa Reykjavíkur ehf.](https://slokkvitaeki.netlify.app/#company/1504) | 701006-2910 | virkur | — | R-106788 · 2025 · 7.304 kr · R-108237 · 2026 · 8.313 kr | — | Tvö ár í röð — árleg yfirferð í reynd |
| 13 | [kt 531014-1620](https://slokkvitaeki.netlify.app/#company/1570) | 531014-1620 | virkur ⚑ | — | R-106739 · 2025 · 7.304 kr · R-108238 · 2026 · 8.313 kr | — | Tvö ár í röð — nafn vantar (kt-stubbur) |
| 14 | [GK-bílar ehf.](https://slokkvitaeki.netlify.app/#company/526) | 540102-6860 | virkur | — | R-107557, R-107558, R-107575, R-114926 · 2025 · úttekt · 33.912 kr hver | — | Fjórir úttektarreikningar 2025, ekkert 2026 — dottinn út? |
| 15 | [kt 650184-0259](https://slokkvitaeki.netlify.app/#company/1531) | 650184-0259 | virkur ⚑ | — | R-106990 · 2025 · 159.833 kr (skráður tvisvar) · R-114925 · 2025 · 159.833 kr | Skýrslugerð (vörunr. 060) staðfest í uttekt_reikningur_facts | Stór úttekt 2025, nafn vantar (kt-stubbur), ekkert 2026 |
| 16 | [Partýbær ehf.](https://slokkvitaeki.netlify.app/#company/533) | 440413-1100 | virkur | — | R-106296 · 2025 · úttekt · 341.673 kr | Skýrslugerð (vörunr. 060) staðfest í uttekt_reikningur_facts | Stór úttekt 2025, ekkert 2026 — dottinn út? |
| 17 | [Meistaralagnir ehf](https://slokkvitaeki.netlify.app/#company/1218) | 620408-0420 | óvirkur | — | R-107321 · 2025 · úttekt · 50.624 kr | — | „Óvirkur" en úttekt 2025 |
| 18 | [Highland Base Kerlingarfjöll ehf](https://slokkvitaeki.netlify.app/#company/818) | 690508-0950 | virkur | — | R-107136 · 2025 · úttekt · 43.904 kr | — | Ekkert 2026 |
| 19 | [Sigrún Júlía Kristjánsdóttir](https://slokkvitaeki.netlify.app/#company/1557) | 460720-1170 | virkur ⚑ | — | R-107060 · 2025 · úttekt · 14.160 kr | — | Einstaklingur — merkt til yfirferðar |
| 20 | [Hugheimur ehf.](https://slokkvitaeki.netlify.app/#company/509) | 540108-1290 | virkur | — | R-107738 · 2026 · úttekt · 50.413 kr · R-108068 · 2026 · 9.166 kr · 4 búðarreikningar 2025 | Drög R-000864 (5× duft yfirferð) opin í appinu | — |
| 21 | [Mini Market ehf](https://slokkvitaeki.netlify.app/#company/1511) | 470214-1040 | virkur | — | R-107730 · 2026 · úttekt · 48.067 kr | — | — |
| 22 | [Suðurbraut 2, húsfélag](https://slokkvitaeki.netlify.app/#company/1509) | 621096-2309 | virkur | — | R-114928 · 2026 · úttekt · 59.239 kr (skráður tvisvar) | — | Tvítak í skjalagrunni |
| 23 | [Waldorfskólinn í Lækjarbotnum](https://slokkvitaeki.netlify.app/#company/1512) | 610797-2029 | virkur | — | R-107985 · 2026 · úttekt · 25.229 kr | — | — |
| 24 | [NSN tæki ehf.](https://slokkvitaeki.netlify.app/#company/580) | 670504-3950 | virkur | — | R-108215 · 2026 · úttekt · 21.195 kr · 2 búðarreikningar 2025 | — | — |
| 25 | [kt 660312-0800](https://slokkvitaeki.netlify.app/#company/1594) | 660312-0800 | virkur ⚑ | — | R-108220 · 2026 · úttekt · 17.559 kr | — | Nafn vantar (kt-stubbur) |
| 26 | [Oscuro ehf](https://slokkvitaeki.netlify.app/#company/1505) | 500317-1670 | virkur | — | R-108164 · 2026 · úttekt · 16.819 kr | — | — |
| 27 | [HG kranar ehf.](https://slokkvitaeki.netlify.app/#company/782) | 431109-0930 | virkur | — | R-107863 · 2026 · úttekt · 13.610 kr · R-106273 · 2025 · búð · 19.200 kr | — | — |
| 28 | [Greining, endurskoðun ehf](https://slokkvitaeki.netlify.app/#company/1513) | 710101-3610 | virkur | — | R-107869 · 2026 · 8.410 kr · R-107882 · 2026 · 3.906 kr | — | — |
| 29 | [Habitar Fasteignir ehf](https://slokkvitaeki.netlify.app/#company/1515) | 690923-1220 | virkur | — | R-108079 · 2026 · úttekt · 8.410 kr | — | — |
| 30 | [Íslandspóstur ohf](https://slokkvitaeki.netlify.app/#company/1525) | 701296-6139 | virkur | — | R-107767 · 2026 · úttekt · 8.410 kr | — | — |
| 31 | [Rótin, félagasamtök](https://slokkvitaeki.netlify.app/#company/1514) | 500513-0470 | virkur | — | R-108293 · 2026 · úttekt · 8.410 kr | — | — |
| 32 | [Prennsýn](https://slokkvitaeki.netlify.app/#company/1163) | 691208-0440 | virkur | — | R-108110 · 2026 · úttekt · 8.607 kr | — | — |
| 33 | [Móðurást ehf.](https://slokkvitaeki.netlify.app/#company/803) | 440414-0440 | virkur | — | R-108136 · 2026 · úttekt · 8.313 kr | — | — |
| 34 | [Pad Thai Noodles ehf.](https://slokkvitaeki.netlify.app/#company/850) | 510422-3330 | virkur | — | R-108131 · 2026 · úttekt · 8.313 kr | — | — |
| 35 | [Stefanía Unnarsdóttir](https://slokkvitaeki.netlify.app/#company/1235) | 030273-6139 | óvirkur | — | R-108236 · 2026 · úttekt · 8.313 kr | — | Einstaklingur, „óvirkur" |
| 36 | [Einar Örn Reynisson](https://slokkvitaeki.netlify.app/#company/1189) | 191168-4539 | óvirkur | — | R-108168 · 2026 · úttekt · 5.200 kr | — | Einstaklingur, „óvirkur" |
| 37 | [Klettás ehf](https://slokkvitaeki.netlify.app/#company/1520) | 671000-2340 | virkur | — | R-108008 · 2026 · úttekt · 4.712 kr | — | — |
| 38 | [Hilmar Már Gunnlaugsson](https://slokkvitaeki.netlify.app/#company/1519) | 130797-3349 | virkur | — | R-108240 · 2026 · úttekt · 3.906 kr | — | Einstaklingur |
| 39 | [kt 250996-2849](https://slokkvitaeki.netlify.app/#company/1537) | 250996-2849 | virkur ⚑ | — | R-108280 · 2026 · úttekt · 3.906 kr | — | Nafn vantar (kt-stubbur) |
| 40 | [Fjörukráin ehf](https://slokkvitaeki.netlify.app/#company/1589) | 630490-1119 | virkur ⚑ | — | R-000869 · 2026 · óflokkaður · 3.380 kr · R-114922 · 2025 · búð · 17.000 kr | — | Lítill óflokkaður reikningur — líklega búð, ekki úttekt |
| 41 | [ICS ehf.](https://slokkvitaeki.netlify.app/#company/886) | 641122-0760 | virkur | — | R-107831, R-108197, R-108206, R-108248 · 2026 · úttekt · 16.500–42.889 kr · 18 búðarreikningar 2025–26 | Falinn sem „Greiðandi (bank)" — sést ekki í listanum | Bank-greiðandi með fjóra úttektarreikninga 2026 |

## Mynstur sem sést

- **Sömu smáu upphæðirnar** 7.304 kr (2025) → 8.313 kr (2026), 8.410 kr, 3.906 kr: eitt tæki yfirfarið + akstur. Þetta eru raunverulegir árlegir kúnnar með eitt–tvö tæki — þeir eiga heima í þjónustu ef þú vilt fá þá aftur á dagskrá 2027.
- **Tvö ár í röð** (Crinis, Fótaaðgerðarstofan, kt 531014-1620): árleg yfirferð í reynd án þess að vera skráð.
- **Stórir 2025-reikningar án 2026** (Partýbær 341 þús., kt 650184-0259 160 þús., GK-bílar 4×34 þús., Meistaralagnir, Highland Base): líklega dottnir út — eða úttekt 2026 ógerð.
- **Fjórir kt-stubbar** („kt 250996-2849" o.fl.) eru með úttektarreikninga — vantar nafnið úr RSK.
- **Skýrslur án reiknings** (Flétturima 16, Suðurvangur 19a): skýrsla 2026 til en enginn reikningur skráður — annaðhvort órukkað eða reikningurinn óskráður.
- **Tvær skýrslur líklega rangt paraðar**: Staðgreitt ← „Aðalsk…" (95%) og K-50 ← „K.Ric…" (86%).
