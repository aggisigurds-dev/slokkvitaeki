# Morgunráðin — snið og reglur

## Hvar

Glugginn undir Vinnusamantekt á Þjónustuborði Agnars (`js/patches/506-radgjafinn.js`).
Skrifuð af `netlify/functions/_radgjafinn.cjs` (Claude API) kl. 06:45 UTC.

## Innihald

1. **Markmiðsröndin** — tekjur á móti markmiði, hagnaður (ef mælanlegur).
2. **Mest 10 ráð dagsins**, hvert með flokki:
   - `peningar` — kröfur, drög, ógreitt, skoðanir sem gleymdust
   - `áhætta` — eitthvað sem getur kostað ef ekkert er gert
   - `tækifæri` — ný sala, endurheimt, útboð
   - `umbót` — betri leið, flöskuháls, sóun
   - `plan` — staða atriðis úr 2 mánaða planinu
3. **Staða 2 mánaða plansins** — hvert atriði: á áætlun / á eftir / lokið.
4. **Fréttir úr póstinum** við Heimaleigu og Center Hotels (ef eitthvað nýtt).
5. **Ein betri leið** — djörf hugmynd eða einföldun.

## Sniðmátið (úr Tony-skýrslunni)

```
TOP 10 — peningar og tækifæri (dd.mm)
1. <titill> — af hverju (talan) · fyrsta skref · eigandi
…
PLANIÐ — staða hvers atriðis: á áætlun / á eftir / lokið, með sönnun.
HÆTTA AÐ GERA — eitt sem sóar tíma eða peningum, og sönnunin.
DJÖRF HUGMYND — ein stærri endurbót sem myndi breyta leiknum, og hvað fyrsta tilraunin kostar.
```

## Reglur

- Stutt. Engin emoji í texta sem fer á skjá. Ekkert sem Agnar þarf að lesa tvisvar.
- Persónutextinn í `_radgjafinn.cjs` (`KERFI`) á að passa við agentskrána — breytist rödd
  eða reglur, breyta báðum í sama commiti.
- Morgunráðin eru LESNIR af Agnari á símanum — stuttar línur, engin veggjakort.
- TOP 10 er hámark, ekki markmið. 5 góð ráð eru betri en 10 þunn.
- Tölur úr combo-yfirlitinu, ekki úr minni.
