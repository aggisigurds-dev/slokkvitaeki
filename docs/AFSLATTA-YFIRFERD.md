# Afslátta-yfirferð — sannreynt 2026-08-18

Yfirferð á öllum afsláttum í kerfinu og staðfesting á að þeir skili sér sjálfvirkt
bæði á Söluborði og í úttektarreiknivélinni (verkefni #31).

## Umfang

| Afsláttarháttur | Fjöldi fyrirtækja | Forgangur |
|---|---|---|
| Fastur afsláttur (`fyrirtaeki.afslattur_pct`) | 56 | lægstur — nær aðeins á línur án sérverðs/hóps |
| Tilboðsverð per vöru (`app_settings.company_pricing`) | 25 | hæstur — endanlegt verð |
| Afsláttarhópur (`discount_tiers`) | 10 (allir Center Hotels) | fast hópsverð > hóps-% > fastur |

Hópar alls: 1 (Center Hotels, með föstum verðum). 4 fyrirtæki hafa **bæði** fastan
afslátt OG tilboðsverð — löglegt: tilboðsverð á tilteknar vörur, fastur á restina.

## Gagnaheilleiki — hreint

- Engir munaðarlausir hóp-tenglar (fyrirtæki sem vísa á hóp sem er ekki til).
- Engir fastir afslættir utan 0–100%.
- Engir óvirkir hópar með tengd fyrirtæki.

## Forgangsröðin sannreynd (engin tvítalning)

`129-company-total-cost.js:839` — `discBaseEx = totalSubEx − overrideSubEx`: fasti
heildarafslátturinn reiknast **aðeins** af línum sem eru hvorki tilboðsverð né
hópsverð/-prósenta (`override || tierMark || tierPctMark` haldið utan við grunninn).
Viðmótið sýnir „(nær ekki á 💰 sérverðslínur)" þegar það á við. Sama regla á
Söluborði (`296 weightedFlat` + `discount-engine calculateCart`).

## Lifandi sannprófun

- **Center Hótel Klöpp (tier, fast verð)**: úttektarreiknivél sýndi 2.600/4.100/2.500
  kr (samningsverð) með uppruna-merki — staðfest 2026-08-17.
- **Ferðafélag Íslands (fastur 20% + tilboðsverð)**: úttektarreiknivél — afsláttarreitur
  20, afsláttarlína −7.430 kr, samtala lækkar 44.285 → 36.855 m/vsk. Rétt.
- Söluborðs-leiðin (296 applyCart + tilboðsverð 113/255) óbreytt — var alltaf virk;
  bilunin sem var lagfærð 2026-08-17 var úttektar-megin (129 náði ekki í hópinn).

## Niðurstaða

Allir þrír afsláttarhættir skila sér sjálfvirkt á báðum stöðum, handvirk yfirskrift
á staðnum virkar, og engin tvítalning verður. Yfirferð lokið.
