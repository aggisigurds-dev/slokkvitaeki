---
name: uttekt-audit
description: Samræmisúttekt Slökkvitækis — ber saman magn á tækjaúttektarlista (uttaeki), magn í úttektarskýrslu (arsskodun_report_facts) og magn á reikningi (solur) fyrir hvert skoðað fyrirtæki árs; allt stemmir = grænt merki, annað fer á „skoða sérstaklega"-lista. Notaðu þegar Agnar biður um audit, samræmi, „passar magnið", „stemmir þetta", „farðu yfir árið", „hvort rétt skýrsla sé við hvert", eða vill uppfæra docs/SAMRAEMI-<ár>.md. Líka fyrir stakt fyrirtæki („stemmir Afltak?").
---

# Úttektar-audit — magn á þremur stöðum == grænt

Markmiðið: fyrir hvert fyrirtæki sem telst skoðað á árinu eiga þrjár heimildir að
segja sömu tölu — **tækjalistinn í kerfinu**, **úttektarskýrslan** og
**reikningurinn**. Stemmi allt → ✅ grænt. Stemmi ekki → línan fer á
misræmislistann og Agnar skoðar hana sérstaklega. Aldrei „laga" gögn sjálfkrafa
— þetta skill er LESTUR EINGÖNGU; öll leiðrétting er ákvörðun Agnars.

Fyrirmynd að skilum: `docs/SAMRAEMI-2026.md` (hakanlegur ☐-listi, raðað eftir
alvarleika, forsendur neðst). Uppfærðu/skrifaðu `docs/SAMRAEMI-<ár>.md` og
committaðu — þá syncist listinn á allar vélar.

## Heimildirnar þrjár (+ ársmerkið)

Supabase-verkefni `osfdzskyvisifcwyjkuk` (execute_sql gegnum MCP).

1. **Tækjalistinn**: `uttaeki` þar sem `status != 'urelt'` (active + ok +
   i_vinnslu teljast). Tenging við fyrirtæki: `lower(trim(client)) =
   lower(trim(fyrirtaeki.nafn))`, `deleted_at IS NULL`; tvítekin nöfn → lægsta id.
   Gróf flokkun: slökkvitæki (Léttvatn/CO₂/Duft/ABC), brunaslöngur
   (Brunaslanga/Slönguskápur), reykskynjarar.
2. **Skýrslan**: `arsskodun_report_facts.total_devices` fyrir `report_year = <ár>`
   (PK fyrirtaeki_id). Skýrsla með 0 tæki er nær alltaf parse-villa, ekki tómt hús.
3. **Reikningurinn**: `solur` með `vidskiptategund = 'uttekt'` og
   `status != 'void'`; summa línumagns þjónustulína — línur sem byrja á
   **Yfirferð/Hleðsla/Nýtt** (EKKI Akstur, EKKI Skýrslugerð). Kredit-reikningar
   dragast frá sjálfkrafa (neikvætt magn). Tenging: customer_id → fyrirtaeki.id,
   fallback kennitala (þoldu með/án bandstriks).
4. **Ársmerkið** (til hliðsjónar í töfluna): `year_factcheck` (co_id, year,
   status human/claude/gap) og `app_settings.settings->'arsskodun_customers'-><id>
   ->'last_year_inspected'`.

„Skoðað á árinu" = uttaeki með last_insp á árinu EÐA facts-röð fyrir árið.

## Grænt merki

```
kerfislisti == skýrsla == reikningsmagn  →  ✅
```

Frávik ±0 er krafan. Í UI er hliðstæðan þegar til: árs-merkið á Fyrirtæki í
Þjónustu (187) og pillan á prófílnum (199) verða græn þegar BÆÐI skýrsla og
reikningur eru á skrá — en magn-samanburðurinn er þessa skills.

## Þekktar gildrur — EKKI telja sem frávik

- **Reikningsflæðið byrjaði 29.5.2026**: „enginn reikningur" fyrir skoðanir
  jan–apríl 2026 er eðlilegt. Fyrir eldri ár er reiknings-samanburður við Payday
  (customer_documents doc_type='reikningur'), ekki solur.
- **Rekstrarfélög** (15 í app_settings): reikningur á móðurfélag birtist ekki hjá
  starfsstöð — Grillvagns/Vélsmiðju-mynstrið (reikningur >> tæki) er oft þetta.
- **Tvítekin fyrirtæki** blása upp talningar (dæmi: Efnalaugin Björg 232+1419,
  Steypustöðin Hólabrú 1496+1727).
- Stakar „Reykskynjari"-línur án Yfirferð/Hleðsla-forskeytis teljast ekki með
  einföldu reglunni — ±1–2 möguleg vantalning.

## Auka-tékk: er RÉTT skýrsla pöruð?

`customer_documents` (doc_type='uttektarskyrsla') ber oft kennitölu í notes
(`\d{6}-\d{4}`). Dragðu hana út og berðu saman við kt fyrirtækisins sem röðin er
tengd. Misræmi = líklega röng pörun (dæmi: doc 972 hjá Afltak bar kt
Sjúkraþjálfunar Afls). ~26% skjala bera kt í notes; hin eru ósannreynanleg svona.
85+ eldri tilvik eru þegar for-flögguð í notes („TILLAGA …"/„ótengt") — teldu þau
ekki sem ný.

## Skil

1. **Tafla A**: fyrirtæki með magn-ósamræmi — dálkar: ☐ | fyrirtæki (id) | kerfi |
   skýrsla | reikningur | ársmerki | hvað er ósamræmið. Alvarlegast efst.
2. **Samantekt**: skoðuð alls / fullkomlega samræmd / frávik / algengustu mynstur.
3. **Listi C**: skoðuð án reiknings (aðeins tímabil sem reikningsflæðið var til) —
   stærstu tækjafjöldarnir efst (það eru stærstu órukkuðu upphæðirnar).
4. **Listi E**: kt-mispöruð skjöl (aðeins NÝ, óflögguð).
5. **Forsendur** alltaf neðst — sömu talningarreglur og hér að ofan svo keyrslur
   séu samanburðarhæfar milli ára.

Fyrir stakt fyrirtæki: sama aðferð, eitt id, og sýndu línurnar úr öllum þremur
heimildum hlið við hlið svo Agnar sjái nákvæmlega hvar munar.
