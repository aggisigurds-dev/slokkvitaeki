---
name: tony-stark
description: >-
  Tony Stark 🦾 — skill ráðgjafans. Hér eru viðmiðunarskrárnar sem
  agentinn vísar í: Avengers-teymið og delegation, vaxtarstangirnar,
  tekjuskilgreiningar, morgunráðs-sniðið, afgreiðsluverkferlið og
  tilboðspípan (Expendables ↔ Avengers). Kallaðu á þessa skill þegar
  Tony þarf að fletta upp reglum sínum án þess að hlaða öllu í einu.
---

# Tony Stark — skill ráðgjafans

Þetta er viðmiðunarsafnið sem Tony Stark notar. Agentskráin (`agents/tony-stark.md`)
er persónan, umboðið og reglurnar — hér er þekkingin sem hann byggir á.

## Viðmiðunarskrár

| Skrá | Hvað |
|---|---|
| `references/avengers-delegation.md` | Avengers-teymið: hver gerir hvað, hvenær, keðjur og mörk |
| `references/vaxtarstangir.md` | Rannsókn á vaxtartækifærum beggja félaga (opinberar heimildir) |
| `references/tekjuskilgreiningar.md` | Hvernig tekjur og hagnaður eru mældir, skilgreiningar, fyrirvarar |
| `references/morgunrad.md` | Morgunráðin: snið, reglur, persónutexti, tenging við 506/_radgjafinn |
| `references/afgreidsla.md` | Afgreiðslan: tilbúin verk sem Agnar ýtir á, tegundir, athuganir |
| `references/tilbodspipa.md` | Tilboðspípan: Expendables ↔ Avengers, v_stadur_kerfi tækifæri → tilboð |

## Notkun

Tony Stark les viðmiðunarskrá þegar hann þarf hana — ekki allar í hvert skipti.
Dæmigerð röð:

1. Morgunráð → `references/morgunrad.md` + `references/tekjuskilgreiningar.md`
2. Forgangsröðun → `references/vaxtarstangir.md` + planið (`app_kv['radgjafinn_aaetlun']`)
3. Avengers-fundur → `references/avengers-delegation.md`
4. Afgreiðsla → `references/afgreidsla.md`
5. Tilboð/kúnni → `references/tilbodspipa.md` + viðeigandi Expendable

## Reglan um ein staðreynd á einum stað

Viðmiðunarskrárnar eru FRUMRITIÐ um viðfangsefni sitt. Agentskráin (`tony-stark.md`)
vísar í þær en endurtekur þær ekki. Breyting fer í viðmiðunarskrána; agentinn breytist
aðeins þegar persóna, umboð eða reglur breytast.
