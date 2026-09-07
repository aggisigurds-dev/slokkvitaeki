# Afhakað úr vinnslu — 85 falskar „í vinnslu" heimsóknir

Slökkvitæki ehf · 6. september 2026 · afrit: `backup_20260906_berar_ferdir` · Þjónustuborðsverkefni #855. Skýrsla Cowork-lotu; gagnvirka útgáfan með hökum er [afhakad-vinnsla-2026-09-06.html](afhakad-vinnsla-2026-09-06.html) — hökin þar vistast aðeins í vafranum, ekki í grunninum.

## Hvað var gert

85 fyrirtæki stóðu sem „í vinnslu" án þess að nokkur vinna væri undir. Þau eru nú afhökuð. 148 raunverulegar ferðir standa óhreyfðar.

| 85 afhakað | 148 standa eftir | 6.019.763 falskar kr | 77 í þjónustu |
|---|---|---|---|

## Af hverju — sannreynt, ekki ágiskun

Hver ferð er JSON-hlutur. Raunveruleg ferð geymir `units` (tækjaval), `skodunaradili`, `skodun_dagsetning`, `notes`. Þessir 85 hlutir geymdu eingöngu `_deleted`, `_ts` og `computed` — reiknaða samtölu og ekkert annað. Enginn ýtti á neitt. Þetta var galli í appinu: patch 227 speglaði hvert einasta localStorage-skrif í skýið, svo það eitt að opna fyrirtæki bjó til „ferð". Gallinn var lagaður 18.08.2026 (`silentSet` í `227-trip-cloud-sync.js`). Sönnunin: allar 85 eru stimplaðar á bilinu 29.07.2026 18:15 – 17.08.2026 18:23. Ekki ein einasta eftir að lagfæringin kom. Raunverulegu ferðirnar 148 spanna 19.06 – 04.09.

Engu tapað: `computed` reiknast upp á nýtt í hvert sinn sem fyrirtæki er opnað. Afrit samt tekið: `backup_20260906_inspection_trips` (heill blob) og `backup_20260906_berar_ferdir` (lína á hvert fyrirtæki með fullu JSON).

## Það sem þú þarft að skoða

Upphæðirnar voru falskar en listinn er raunverulegur — þetta eru fyrirtæki sem voru opnuð í appinu í júlí/ágúst. Spurningin á hverja línu: er ársskoðunin raunverulega ógerð þarna?

- **Á vinnublaði:** Húsfélagið Gullsmára 5 (#327), Húsfélag Gullsmári 5 (#1287, tvítak) og Stjörnusól (#228) eiga raunverulega úttekt sem á eftir að klára/rukka.
- **Engin virk tæki:** fjórtán fyrirtæki eiga ekkert virkt tæki í tækjaskránni þótt appið hafi reiknað verð — annaðhvort status-gallinn („Í lagi" / „ok" / urelt) eða tómt fyrirtæki. #1628 er ekki lengur til.

| Fyrirtæki | Kennitala | Opnað | Reiknuð tæki | Virk tæki | Fölsk upphæð | Síðasta úttekt | Athuga |
|---|---|---|---|---|---|---|---|
| Sléttuvegur 19-21-23 (#454) | 660307-0600 | 14.08.2026 | 73 | 73 | 346.587 | — | — |
| Heimaleiga - S30 Apartments (#243) | 711096-2059 | 03.08.2026 | 65 | 65 | 225.680 | — | — |
| Heilsustofnun NLFÍ (#207) | 480269-6919 | 08.08.2026 | 62 | 62 | 221.660 | — | — |
| Heimaleiga - Máni Apartments (#869) | 510117-0690 | 14.08.2026 | 61 | 61 | 212.995 | 09.08.2026 | úttektarsala 2026 |
| Heimaleiga - Midtown Hotel (#1486) | 510117-0690 | 30.07.2026 | 61 | 61 | 212.995 | 09.08.2026 | úttektarsala 2026 |
| Steypustöðin - Borgarnesi (#623) | 660707-0420 | 11.08.2026 | 40 | 36 | 171.031 | — | — |
| Húsfélagið Álftamýri 24-30 (#259) | 620185-0439 | 01.08.2026 | 51 | 51 | 168.385 | — | — |
| Húsfélagið Ásholt 2 (#853) | 530391-1089 | 03.08.2026 | 34 | 34 | 160.590 | — | ekki í þjónustu |
| Dra ehf (#1334) | 651003-2560 | 31.07.2026 | 37 | 0 | 154.065 | — | engin virk tæki |
| Heimaleiga - Icelandic Apartments (#1622) | 681013-0830 | 03.08.2026 | 40 | 40 | 141.980 | — | — |
| Aspafell 2-12 (#487) | 670575-0479 | 30.07.2026 | 30 | 30 | 135.433 | — | — |
| Stálsmiðjan-Framtak ehf. (#545) | 430801-2520 | 30.07.2026 | 27 | 27 | 135.142 | — | — |
| Nýbýlavegur 4-8 ehf (#468) | 560124-1390 | 04.08.2026 | 27 | 27 | 122.103 | — | — |
| Center Hótel - Grandi (#197) | 450905-1430 | 05.08.2026 | 25 | 25 | 122.023 | 31.08.2026 | úttektarsala 2026 |
| Colas - Gulhella 1 (skrifstofa/HQ) (#1616) | 420187-1499 | 07.08.2026 | 24 | 24 | 105.752 | — | — |
| AFL Starfsgreinafélag (#901) | 560101-3090 | 04.08.2026 | 25 | 25 | 105.710 | — | — |
| Skaftahlíð 4-10, húsfélag (#848) | 681178-0159 | 10.08.2026 | 29 | 27 | 102.392 | — | — |
| Húsfélagið Gullsmári 9 (#690) | 640796-2439 | 03.08.2026 | 20 | 0 | 101.010 | — | engin virk tæki, ekki í þjónustu |
| Hótel Varmaland (#494) | 541218-2110 | 13.08.2026 | 20 | 20 | 98.679 | — | — |
| Sláturfélag Suðurlands (#484) | 600269-2089 | 10.08.2026 | 19 | 19 | 96.380 | — | — |
| Húsfélagið Gullsmára 5 (#327) | 611096-2329 | 30.07.2026 | 19 | 19 | 95.770 | — | á vinnublaði |
| Colas - Álfhella (#1490) | 420187-1499 | 10.08.2026 | 17 | 17 | 92.611 | — | — |
| Húsfélag Gullsmári 5 (#1287) | 611096-2329 | 30.07.2026 | 18 | 0 | 91.715 | — | á vinnublaði, engin virk tæki, ekki í þjónustu |
| Colas - Gullhella (#218) | 420187-1499 | 10.08.2026 | 16 | 16 | 89.291 | — | — |
| Iðnó menningarhús (#703) | 520521-2320 | 17.08.2026 | 19 | 19 | 89.099 | — | — |
| Armar (#260) | 550698-2779 | 12.08.2026 | 18 | 18 | 86.081 | — | — |
| Steypustöðin - Hringhellu (#608) | 660707-0420 | 17.08.2026 | 18 | 22 | 84.604 | — | — |
| Steypustöðin - Vatnskarðsnámur (#414) | 531093-2409 | 11.08.2026 | 10 | 10 | 74.440 | — | — |
| Húsfélagið Drekavellir 18 (#248) | 620806-1020 | 03.08.2026 | 15 | 15 | 72.230 | — | — |
| VR-5 ehf. (#470) | 491209-1270 | 08.08.2026 | 13 | 13 | 71.374 | 17.08.2026 | úttektarsala 2026 |
| Leiguval ehf vegna (#712) | 691294-4209 | 30.07.2026 | 11 | 11 | 70.524 | — | — |
| Blástur og málun (#1173) | 090171-3569 | 04.08.2026 | 12 | 0 | 67.501 | — | engin virk tæki |
| Austurberg 2, húsfélag (#499) | 470486-7169 | 17.08.2026 | 12 | 0 | 67.178 | — | engin virk tæki |
| Snyrtistofan Gyðjan ehf (#1233) | 471097-2339 | 13.08.2026 | 13 | 13 | 65.514 | — | — |
| Húsfélagið Strandvegur 2-10 (#295) | 690306-1310 | 07.08.2026 | 13 | 13 | 65.264 | — | — |
| Partýbær ehf. (#533) | 440413-1100 | 14.08.2026 | 17 | 0 | 63.129 | — | engin virk tæki, ekki í þjónustu |
| Vélsmiðja Orms og Víglundar - Kaplahraun (#1629) | 480998-2789 | 03.08.2026 | 10 | 0 | 62.060 | 24.06.2026 | engin virk tæki, úttektarsala 2026 |
| Flétturimi 10, húsfélag (#784) | 540994-2939 | 03.08.2026 | 13 | 13 | 61.804 | — | — |
| Bílaverkstæði Högna (#211) | 201158-2659 | 12.08.2026 | 12 | 12 | 59.976 | — | — |
| Burknavellir 1A (#673) | 600204-2970 | 13.08.2026 | 6 | 6 | 58.518 | — | — |
| Hagstál (#692) | 630301-2380 | 13.08.2026 | 8 | 8 | 57.417 | — | — |
| Húsfélagið Kórsölum 3 (#293) | 440402-3480 | 12.08.2026 | 11 | 11 | 53.992 | — | — |
| Þúsund Fjalir ehf (#455) | 591199-3159 | 07.08.2026 | 7 | 7 | 46.041 | — | — |
| Húsfélagið Hverfisgata 82 (#460) | 670991-1729 | 30.07.2026 | 11 | 0 | 46.041 | — | engin virk tæki, ekki í þjónustu |
| Tunguvegur 19 (#365) | 660897-2329 | 30.07.2026 | 9 | 9 | 44.657 | — | — |
| Colas - Óseyrarbraut (#1493) | 420187-1499 | 10.08.2026 | 6 | 6 | 44.605 | — | — |
| (fyrirtæki ekki lengur til) (#1628) | — | 29.07.2026 | 10 | 0 | 43.648 | — | engin virk tæki, fyrirtæki ekki til |
| Steypustöðin - Þorlákshöfn (#620) | 660707-0420 | 03.08.2026 | 8 | 8 | 43.215 | — | — |
| Framsýn menntun (#475) | 630615-0890 | 04.08.2026 | 7 | 7 | 43.021 | — | — |
| Steypustöðin - Hólabrú, Hvalfjörður (#1727) | 660707-0420 | 11.08.2026 | 6 | 0 | 42.284 | — | engin virk tæki |
| AGES ehf. (#808) | 480411-1530 | 30.07.2026 | 6 | 6 | 41.986 | — | — |
| Míla ehf. (#1414) | 460207-1690 | 05.08.2026 | 7 | 7 | 41.334 | — | — |
| Álfaskeið (#290) | 430680-0139 | 05.08.2026 | 9 | 9 | 38.229 | — | — |
| ABC BARNAHJÁLP (#1175) | 690688-1589 | 30.07.2026 | 7 | 7 | 36.885 | — | — |
| Heimaleiga - Ice Apartments (#1484) | 510117-0690 | 30.07.2026 | 8 | 8 | 35.551 | 09.08.2026 | úttektarsala 2026 |
| Húsfélagið Austurberg 2-4-6 (#291) | 511115-1400 | 17.08.2026 | 6 | 6 | 34.844 | — | — |
| Heimaleiga - Bríetartún 9-11 (#1487) | 510117-0690 | 29.07.2026 | 8 | 8 | 34.844 | 09.08.2026 | úttektarsala 2026 |
| Ferðafélag Íslands (#179) | 530169-3759 | 09.08.2026 | 8 | 7 | 34.176 | — | — |
| Kvikkfix (#412) | 480601-2620 | 30.07.2026 | 6 | 6 | 33.128 | — | — |
| Babalú (#488) | 460608-0150 | 12.08.2026 | 6 | 6 | 31.794 | — | — |
| Versus bílaréttingar og sprautun (#1399) | 580506-1860 | 17.08.2026 | 3 | 3 | 30.268 | — | — |
| Granítsteinar (#153) | 610305-0750 | 17.08.2026 | 5 | 5 | 29.073 | 19.06.2026 | úttektarsala 2026 |
| Heimaleiga - Laugavegur 46 (#305) | 641115-0100 | 03.08.2026 | 6 | 6 | 28.855 | — | — |
| Húsfélagið Álfabakki 12 (#127) | 640189-2319 | 04.08.2026 | 5 | 5 | 27.739 | — | — |
| Bílaleiga Flugleiða, Hertz (#265) | 471299-2439 | 07.08.2026 | 6 | 6 | 27.611 | — | — |
| Center Hótel - Þingholt Apartments (#200) | 450905-1430 | 03.08.2026 | 5 | 5 | 27.590 | 31.08.2026 | úttektarsala 2026 |
| Þverholt 24 (#498) | 600991-1169 | 31.07.2026 | 5 | 5 | 27.590 | — | — |
| Three sisters - Ægisgata 4 (#194) | 660716-0330 | 30.07.2026 | 5 | 5 | 27.590 | — | — |
| Húsfélag Írabakka 34 (#1169) | 600685-0589 | 04.08.2026 | 6 | 6 | 26.511 | — | — |
| Þvottahúsið A. Smith ehf (#1264) | 460788-1969 | 03.08.2026 | 4 | 4 | 24.979 | — | — |
| Húsfélagið Akurvellir 1, Hafnarfirði (#438) | 561106-0450 | 12.08.2026 | 4 | 4 | 23.684 | — | — |
| Klúbburinn Geysir (#381) | 501097-2259 | 30.07.2026 | 4 | 4 | 23.684 | — | — |
| Hegri fjárfestingar ehf (#395) | 540513-1550 | 07.08.2026 | 4 | 4 | 23.684 | — | ekki í þjónustu |
| Stjörnusól (#228) | 421015-0740 | 17.08.2026 | 3 | 3 | 23.424 | — | á vinnublaði |
| Devitos pizza ehf (#221) | 420403-2320 | 12.08.2026 | 3 | 3 | 19.927 | — | — |
| Indverska Matarfélagið (#1369) | 510613-0310 | 10.08.2026 | 3 | 0 | 19.927 | — | engin virk tæki |
| Íslensk hollusta ehf. (#588) | 601005-1150 | 07.08.2026 | 3 | 3 | 19.778 | — | ekki í þjónustu |
| Pizzan - Fjarðargata (#317) | 681016-1200 | 13.08.2026 | 3 | 3 | 19.778 | 19.08.2026 | úttektarsala 2026 |
| RENTUR starfsemi ehf (#729) | 531120-0190 | 09.08.2026 | 3 | 3 | 19.778 | — | — |
| Mai Thai ehf (#314) | 680921-0240 | 12.08.2026 | 3 | 3 | 19.778 | — | — |
| Aurum ehf (#331) | 631199-2329 | 12.08.2026 | 2 | 2 | 15.872 | — | — |
| Garðabær (#1197) | 570169-6109 | 14.08.2026 | 2 | 0 | 15.872 | — | engin virk tæki |
| Húsfélagið Álfholt 2c (#442) | 440900-3210 | 03.08.2026 | 2 | 2 | 15.872 | — | — |
| Korner (#1375) | 441199-2827 | 12.08.2026 | 1 | 1 | 11.966 | — | — |
| Alta ehf (#480) | 630401-3130 | 30.07.2026 | 1 | 1 | 11.966 | — | — |
