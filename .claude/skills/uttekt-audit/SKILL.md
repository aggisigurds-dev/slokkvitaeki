---
name: uttekt-audit
description: Samræmisúttekt Slökkvitækis — ber saman magn á tækjaúttektarlista (uttaeki), magn í úttektarskýrslu (arsskodun_report_facts) og magn á reikningi (solur) fyrir hvert skoðað fyrirtæki árs; allt stemmir = grænt merki, annað fer á „skoða sérstaklega"-lista. Notaðu þegar Agnar biður um audit, samræmi, „passar magnið", „stemmir þetta", „stemmir árið", „samræmi ársins", „farðu yfir árið", „hvort rétt skýrsla sé við hvert", eða vill uppfæra docs/SAMRAEMI-<ár>.md. Líka fyrir stakt fyrirtæki („stemmir Afltak?"). Kveikjuorð: audit, samræmi, stemmir, passar magnið, fölsk staðreynd, false-fact, falskt grænt, arsskodun_report_facts. Afrit af sömu villu → villuleit / variant-analysis.
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
   `Í lagi` + i_vinnslu teljast — fjögur orð yfir lifandi tæki; talning á `active`
   einni sér sleppti heilum félögum 03.11.2026). Tenging við fyrirtæki: `lower(trim(client)) =
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
   **„Enginn reikningur" er ekki niðurstaða fyrr en líka er lesið:** `stolpi_reikningar` á `kt10` (allt fyrir
   07.05.2026; opið við yfirtöku telst greitt fyrri eigendum), `credit_of` (kredit + endurgerð) og
   `customer_documents` með `invoice_number`. Án þess reyndust 103 af 148 „skoðað án reiknings" rangar (11.2026).
   Félag með fleiri en einn stað á kt fer um skill `rekstrarfelog-parun`, ekki þessa pörun.
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

**„TILLAGA"-flöggin eru ekki sönnun (mælt 03.11.2026).** Af þeim sem nefndu aðra
kennitölu og voru opnuð höfðu 5 af 5 rangt fyrir sér (vörðurinn las kt úr ANNARRI
skrá með líkt heiti). Skýrsla er ekki sögð röng fyrr en PDF-ið er opnað:

1. Sækja skrána úr Storage (bucket `samningar`, `storage_path`) og `pdftotext -enc UTF-8 -layout`.
2. Lesa hausinn: nafn, heimilisfang, kt og mánuður/ár úttektar.
3. Bera útdráttinn saman við skýrslur réttu félagsins (sami texti = afrit).

Þrjár gerðir fundust (docs/ARSSKODUN-AUDIT-20261103.md): skýrsla á röngu félagi sem
er afrit af skjali á réttu félagi · rétt félag en rangt ár (afrit) · skjal sem er
alls ekki skýrsla (reikningur í skýrsluhólfi).

## Þegar röng skýrsla er leiðrétt — `is_duplicate` eitt og sér dugar EKKI

Mælt 10.11.2026 (átta skjöl voru merkt afrit og stóðu samt áfram á röngu ári):

- 199 `dedupBucket` felur afrit AÐEINS ef raunskjal stendur eftir í sama (ár, þjónusta)
  hópi. Afrit sem er EINA skjal ársins birtist áfram. 153 `docYearsP` síar afrit alls ekki.
- Rétta leiðin: færa afritið þangað sem raunskjalið er — `fyrirtaeki_id` OG
  `customer_base_id` á rétta félagið, eða `year` á rétt ár — og halda `is_duplicate` +
  `dup_of`. Þá tæmist ranga árið og afritið felst við hlið raunskjalsins.
- `document_pairs`-röðin á gamla (félag, ár) verður eftir sem `vantar_reikning` og lítur
  út eins og órukkuð skoðun. Triggerinn `auto_pair_customer_document` býr til ný pör
  en eyðir aldrei gömlum og sleppir afritum. Afrita parið í `backup_<dags>_…` og eyða.
- Sannprófun: telja skýrslur (alls / ekki afrit) og pör á BÁÐUM (félag, ár) — ranga
  hliðin á að vera 0/0/0, rétta hliðin með a.m.k. eitt raunskjal.

Sama gildir um reikning sem er færður: athuga fyrst hvort hann sé þegar til á réttu
félagi (`invoice_number`), annars birtist hann tvisvar.

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
