---
name: vasinn
description: Kíkja í Vasann — app-síðan þar sem Agnar límir skjáskot, tekur myndir, hleður upp skrám og talar inn hljóðskilaboð handa Claude. Notaðu þegar Agnar segir „kíktu í vasann", „lestu úr vasanum", „hvað er í vasanum", „ég setti þetta í vasann", „er eitthvað í vasanum" eða vísar í skjáskot/mynd/skrá/upptöku sem hann „setti inn" án þess að hengja hana við spjallið.
---

# Vasinn

Vasinn er app-síða (`js/patches/491-vasinn.js`, `#vasinn`, í Öpp → Þjónustuborð) þar sem Agnar stingur inn því sem hann
vill að Claude skoði: skjáskot (líma), myndir úr myndavél, skrár, hljóðskilaboð (með sjálfvirku afriti) og texta, með
valfrjálsri skýringu. Gögnin: tafla `vasinn` + fata `vasinn` í Supabase (Slökkvitæki-verkefnið).

## Lesa

```bash
node tools/vasinn.cjs
```

Listar ÓLESNA hluti og sækir skrárnar á disk (`%TEMP%/vasinn/vasi-<id>.<ext>`). Opnaðu hverja mynd/PDF með Read og
lýstu því sem sést. Hljóð: notaðu **afritið** (sjálfvirk talgreining, is-IS) — það getur verið ófullkomið; sé það
óskýrt, segðu Agnari hvað þú skildir og spurðu. `--allt` sýnir líka lesna hluti (30 d.), `--id N` einn hlut, `--json`
vélrænt.

## Vinna úr

Skýringin segir hvað á að gera („setja í kostnað", „svara þessu", „muna þetta"). Sé engin skýring: lýstu innihaldinu
stutt og spurðu hvað hann vilji gera, nema það sé augljóst (reikningur → kostnaðarflæðið, póstur → erindi, o.s.frv.).
Gildir sömu reglur og annars: ekkert sent út, engum reikningi breytt, engin krafa stofnuð án þess að Agnar segi til.

## Stimpla lesið

Þegar þú hefur lesið og gert það sem átti að gera:

```bash
node tools/vasinn.cjs --lesid 12,13 --svar "Reikningur frá Byko settur í kostnað · skjáskotið var villan í Sótt-glugganum, lagað"
```

Hluturinn færist þá undir „Claude hefur lesið" á síðunni með svarinu þínu, svo Agnar sjái í símanum að það komst til skila.
Stimplaðu AÐEINS það sem þú raunverulega las — ólesið er loforð um að það bíði.
