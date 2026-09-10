# Verð, akstur og varahlutir

## Akstursreglan

**Fari eitthvað tæki í hleðslu verður akstur `2 ×`.** Hleðsla þýðir að tækið er
tekið á verkstæðið og skilað aftur — tvær ferðir. Sé allt yfirfarið á staðnum stendur
akstur í `1`.

Reiturinn er neðst í reikningsblokkinni, við hliðina á Skýrslugerð.

### Upphæðirnar — EIN heimild, ekki þessi skrá

`window.SlokkVisitDefaults` í `129-company-total-cost.js`: **akstur 3.600 kr, skýrslugerð
5.600 kr, hvort tveggja ÁN VSK.** Bæði kostnaðartaflan og reikningsleiðin (165) lesa þaðan.

Þessi skrá sagði 3.000/3.500 fram til 09.09.2026 og var úrelt: Sara-borðið afritaði þær
tölur og sagði Hagstál 43.228 kr þar sem appið sagði **48.136**. **Lestu breytuna, ekki
töfluna.** Sama gildir um öll verð hér: þau eru til viðmiðunar, appið á síðasta orðið.

### Án vsk vs m/vsk

Reikningurinn færir **einingaverð ÁN VSK** og leggur 24% ofan á — líka á akstur og
skýrslugerð. Verðin í töflunni hér að neðan eru m/vsk til viðmiðunar; deildu með 1,24
til að fá töluna sem fer í reitinn.

Sé akstur þegar handstilltur hærri en 2 — t.d. af því tækin voru sótt í einni ferð og skilað
í annarri — láttu hann í friði.

## Varahlutir í vörulistanum

Þessir eru til og eiga að fara á reikninginn gegnum **„+ Bæta við vöru eða þjónustu"**,
ekki sem sér tæki.

| Vara | M/vsk | Án vsk | Notkun |
|---|---|---|---|
| Úðastútur brunaslanga 19 m.m. (**¾"**) | 8.400 kr | 6.774 kr | **sjálfgefinn** stútur á brunaslöngu |
| Brunaslöngustútur **1"** | 10.540 kr | 8.500 kr | stærri stútur — aðeins þegar verð/stærð er tekið fram |
| Krani slökkvitæki | 3.300 kr | 2.661 kr | skipt um krana á slökkvitæki |
| Þrýstimælir | 2.391 kr | 1.928 kr | nýr þrýstimælir |
| Slanga fyrir 5 kg kolsýrutæki | 2.666 kr | 2.150 kr | slanga *inni í* kolsýrutæki |
| Stanga fyrir Duft/Léttvatn | 2.030 kr | — | slanga *inni í* dufti/léttvatni |

**Stútur — hvor á að velja:** þetta eru TVÆR stærðir, ekki tvítak.
- **¾" (19 m.m.) er sjálfgefinn** — notaðu hann þegar „haus" eða „stútur" er nefnt án nánari lýsingar.
- **1"** aðeins þegar stærðin er tekin fram, eða þegar verðið á blaðinu passar við hann
  (t.d. Distica: „2 hausar — 20.666 kr" = 2 × 1" stútur).

Athugið muninn á slöngum: **brunaslanga** er slangan á vegg, **slanga/stanga fyrir tæki** er
barkinn inni í slökkvitækinu sjálfu. Vinnublöðin nota „slanga" um hvort tveggja — lestu samhengið.

## Þjónustuverð (til viðmiðunar)

| Þjónusta | M/vsk | Án vsk |
|---|---|---|
| Léttvatnstæki 6L hleðsla | 8.410 kr | 6.782 kr |
| Léttvatnstæki 6L yfirferð | 3.906 kr | 3.150 kr |
| Duft 6 kg ABC hleðsla | 8.410 kr | 6.782 kr |
| Duft 6 kg ABC yfirferð | 4.200 kr | 3.387 kr |
| CO₂ 2 kg hleðsla | 4.216 kr | 3.400 kr |
| CO₂ 2 kg yfirferð | 4.055 kr | 3.270 kr |
| CO₂ 5 kg hleðsla | 8.556 kr | 6.900 kr |
| CO₂ 5 kg yfirferð | 4.055 kr | 3.270 kr |
| Yfirferð brunaslanga | 5.389 kr | 4.346 kr |
| Yfirferð reykskynjari | 2.909 kr | 2.346 kr |
| Skoðunargjald / skýrslugerð | 2.500–3.500 kr | |

## Ný tæki verðlagast sjálfkrafa

Ekki leita að verði á nýju tæki og ekki setja það í „Bæta við vöru". Þegar tæki er stofnað á
tækjaborðinu (t.d. 6L léttvatnstæki) og sett á stöðuna **Nýtt**, reiknar reiknivélin verðið
sjálfkrafa út frá **verslunarverðinu** — sömu verð og sjást á Sölu-síðunni.

Sjálfgefið er alltaf verslunarverð nema fyrirtækið sé með annan samning (`afslattur_pct` eða
tilboðsverð í `company_pricing`), og þá tekur reiknivélin tillit til þess sjálf. Sara þarf því
hvorki að fletta upp tækjaverði né handreikna afslátt — bara stofna tækið, velja Nýtt, og láta
kerfið um restina.

## Stærðir sem verðlagast

Ekki allar samsetningar tegundar og stærðar eiga sér þjónustulínu. Velji maður ranga stærð
kemur viðvörun í „Bæta við tæki"-glugganum og línan verðleggst ekki.

- **Duft yfirferð:** aðeins 6 kg og 9 kg. `2 kg yfirferð` verðlagast ekki.
- **Brunaslanga:** það er **AÐEINS EITT verð** á yfirferð, hver sem lengdin er. „30 m" er
  bara sjálfgefna merkingin. Agnar 09.09.2026: *„við erum bara með eitt verð á yfirferð á
  brunaslöngum sem varð þá bara að 30m default, veit ekki raun lengdina."*
  **Ekki spyrja um lengd á slöngu** — það er engin ákvörðun þar.
- Tilgreini vinnublaðið enga stærð á ÖÐRUM tækjum, veldu þá sem verðlagast og **segðu
  Agnari frá valinu**.

## Reykskynjarar — rafhlaðan er innifalin

**„Yfirferð Reykskynjari“ ber rafhlöðuna.** Agnar 10.09.2026: *„það er innifalið
rafhlaða í reykskynjara yfirferð.“*

Vinnublöð skrifa þetta gjarnan sem *„skipti um 2 skynjara og batterí í 1“*. Þá eru
skynjararnir tveir ný tæki (vara úr verðskránni) og „batterí í 1“ er **ein yfirferð** —
ekki varahlutasala. `9V Rafhlaða` (466 kr án vsk) fer aðeins á reikning þegar rafhlaða
er seld ein og sér, án yfirferðar.

Ódýrasti reykskynjarinn í listanum heitir **`Reykskynjari 2`** (2.195 kr án vsk);
hinir eru `Reykskynjari` 3.621 og `Reykskynjari 3` 5.363. Segi blaðið „ódýrasti“, er
það sá fyrstnefndi.

## Afslættir

Sérverð (tilboðsverð) er endanlegt — prósentuafsláttur nær aðeins á línur án sérverðs.
56 félög eru með fastan `afslattur_pct`, 24 með tilboðsverð í `AppSettings.company_pricing`.
Sara á ekki að hrófla við afslætti; hann reiknast sjálfkrafa.
