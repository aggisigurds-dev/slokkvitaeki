# Tilboðspípan — Expendables ↔ Avengers og v_stadur_kerfi

## Yfirlit

Tilboðspípan tengir saman tvö teymi:
- **Expendables** (Arnold) — smíðar tilboðið (tæknilegt, verðlagt, samkvæmt regluverki)
- **Avengers** (Tony) — finnur kúnnann, verðleggur samkeppnishæft, selur og rukkar

## Flæðið

```
Tækifæri fundið (v_stadur_kerfi eða Spider-Man/Hunter)
  ↓
Tony ákveður hvort tilboð eigi að vera gert
  ↓
Arnold flokkar og sendir á réttan Expendable:
  - Dolph (brunaviðvörunarkerfi, EN 54)
  - Terry (sprinkler, EN 12845)
  - Wesley (slökkvikerfi eldhús, EN 16282)
  - Randy (teikning → tilboð, fjölkerfatilboð)
  ↓
Expendable smíðar tilboðið (reiknivél, verðlisti, skoðunaratriði)
  ↓
Tony yfirfer: er verðið samkeppnishæft? (Black Widow)
  ↓
Tilbúið verk á afgreidsla.html — Agnar sendir
```

## v_stadur_kerfi — tækifærin

View `v_stadur_kerfi` sýnir hvaða kerfi eru á hverjum stað og hvort þau eru í
þjónustu okkar eða annarra. Tækifæri flokkast:

| Tækifæri | Merking | Aðgerð |
|---|---|---|
| `a` | Skylt samkvæmt reglum + vantar | Tilboð í nýtt kerfi |
| `b` | Keppinautur á kerfið | Tilboð í yfirtöku þjónustu |
| `c` | Okkar kerfi, í þjónustu | Viðhalda, endurnýja samning |
| `d` | Óþarft / ekki skylt | Ekkert |

```sql
SELECT f.nafn, f.heimilisfang, sk.kerfi, sk.til_stadar, sk.taekifaeri, sk.thjonustuadili
FROM v_stadur_kerfi sk
JOIN fyrirtaeki f ON f.id = sk.fyrirtaeki_id
WHERE sk.taekifaeri IN ('a','b')
ORDER BY sk.kerfi, f.nafn;
```

## Fjölkerfatilboð

Stórir staðir (hótel, stofnanir, verslanir) þurfa oft mörg kerfi samtímis:
brunaviðvörun + sprinkler + neyðarljós + reyklosun. Randy Couture sameinar
tilboð margra Expendables í eitt.

**Geta afsláttarmódelið:** Agnar ákveður, en regla: fjölkerfi á sama stað fær
hærri afslátt en stök kerfi — endurheimtutilboð fá hagstæðari kjör en nýkúnnatilboð.

## Staðan (20.11.2026)

| Kerfi | Reiknivél | Verðlisti | Kúnnar skráðir |
|---|---|---|---|
| Brunaviðvörun (Dolph) | ✅ 200 (34 atriði) | Skel, vantar verð | Já |
| Sprinkler (Terry) | ❌ Vantar | 3 bráðabirgðaverð | Já, fáir |
| Slökkvikerfi (Wesley) | ❌ Vantar | Skel, vantar verð | Já |
| Fjölkerfa (Randy) | ❌ Vantar | — | — |

**Hindranir:**
1. Verðlistar (502) vantar raunverð — krefst Agnars
2. Sprinkler-reiknivél ekki smíðuð
3. Slökkvikerfi-reiknivél ekki smíðuð
4. Fjölkerfatilboðs-sniðmát ekki til

## Avengers-hlutverkið í pípunni

| Agent | Hlutverk í tilboðsferlinu |
|---|---|
| Spider-Man | Finnur kúnnann, endurheimtir gamla |
| Black Widow | Athugar samkeppnisverð — eru við samkeppnishæf? |
| Hawkeye | Athugar innkaupsverð — er framlegðin nóg? |
| Captain America | Skrifar kynningarpóst ef nýr kúnni |
| `logfraedingur` | Fer yfir samning ef stór |
| `endurskodandi` | VSK og bókhaldsatriði |

## Nýtt tilboð — verkferlið

1. **Finna tækifæri:** Spider-Man (Hunter) eða `v_stadur_kerfi` tækifæri a/b
2. **Flokka kerfi:** Arnold greinir teikningu eða notkunarflokk
3. **Smíða tilboð:** Viðeigandi Expendable (reiknivél + verðlisti + skoðunaratriði)
4. **Verðrýna:** Black Widow (keppinautar) + Hawkeye (innkaup/framlegð)
5. **Samþykkja:** Tony rýnir heildarverð og framsetningu
6. **Senda:** Verk á afgreidsla.html — Agnar ýtir á takka
