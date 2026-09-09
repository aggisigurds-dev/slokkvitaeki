# VERKLAG — hvernig við vinnum

*Skrifað 09.09.2026. Fyrir Agnar, ekki fyrir vélina.*

Þú sagðir: *„Ég veit ekkert lengur hvernig ég á að koma þessu í lag."*
Þetta skjal er svarið. Það er stutt viljandi.

---

## Reglan, í einni setningu

> **Ekkert er búið fyrr en það er mælt — og mælingin heldur áfram að keyra eftir á.**

Allt hitt í þessu skjali er útfærsla á þeirri einu setningu.

**Af hverju hún:** þú hefur skrifað réttu reglurnar þrisvar og engin þeirra var þvinguð:

| Reglan | Hvar hún var skrifuð | Hvað gerðist |
|---|---|---|
| „Keyrðu audit fyrir hverja ýtingu" | haus `tools/audit-all.cjs` | keyrði hvergi — engin hook, ekkert CI |
| „Skjámynd fylgir kláruðu verki" | `verkefnalisti`-skillin | virt í 26% tilfella (38 af 147) |
| „Lestu Charlize áður en þú byrjar" | CLAUDE.md regla #1 | hunsuð þar til þú gerðir hana að `SessionStart`-hook |

Þú fannst sjálfur af hverju, og skrifaðir það í `.claude/settings.json`:

> **„Tilmæli duga ekki; sjálfvirk keyrsla gerir það."**

Þess vegna: hver regla hér að neðan er annaðhvort **keyrð af vél** eða hún er ekki regla.

---

## Verkaskiptingin

### Það sem þú gerir

Fjögur atriði. Ekkert annað.

1. **Segir hvað er bilað** — í venjulegu tali. „Takkinn á Drög-síðunni gerir ekkert."
   Þú þarft ekki að greina það, finna skrána eða orða það tæknilega.
2. **Gefur eitt raundæmi** þegar ég bið um það — hvaða félag, hvaða reitur, hvaða síða.
   Eitt dæmi er meira virði en löng lýsing, því ég get elt það til enda.
3. **Svarar körfu C** — ákvarðanir sem enginn nema þú getur tekið (peningar, hvor talan
   er rétt, viðskiptamál). Þær koma fullbúnar: hvað er málið, tölurnar, valkostirnir,
   hverju ég mæli með. Þú átt að geta svarað án þess að opna neitt.
4. **Segir þegar eitthvað er vitlaust hjá mér.** Þú hefur gert það allan daginn í dag og
   það lagaði planið í hvert skipti.

### Það sem þú gerir EKKI

- Ekki leita að því hvar villan er.
- Ekki sannreyna hvort ég laga eitthvað — vörðurinn gerir það.
- Ekki muna hvað var ákveðið — það fer í skjal eða vörð, ekki í hausinn á þér.
- Ekki halda utan um listann. Það er mitt starf núna.

### Það sem ég geri

- Finn rótina, ekki einkennið.
- Skrifa vörð fyrir hverja villu **áður** en ég kalla hana lagaða.
- Prófa í viðmótinu — raunverulegur smellur, ekki `ok:true` úr API-i.
- Mæli áður en ég fullyrði. Ef minnið segir eitt og mælingin annað, vinnur mælingin.
- Segi upphátt þegar ég hafði rangt fyrir mér.

---

## Hringrásin — hvað gerist við hverja villu

```
  villa finnst
      ↓
  rót fundin  ─── ekki einkennið, ekki plásturinn
      ↓
  VÖRÐUR skrifaður  ─── tools/audit-<nafn>.cjs
      ↓                  hann á að vera RAUÐUR núna
  lagfæring
      ↓
  vörðurinn verður grænn  ─── það er sönnunin
      ↓
  systkinaleit  ─── variant-analysis: ein villa er aldrei ein
      ↓
  vörðurinn keyrir sjálfkrafa héðan í frá
```

**Skrefið sem vantaði alltaf er það næstsíðasta.** Þú átt 33 verði. Þeir voru allir
skrifaðir, enginn tengdur. Þess vegna komu sömu villurnar aftur.

### Vörður má aldrei þagga sig

Ellefu af 33 vörðum keyra gegn „grunnlínu" af biluðum röðum:

```
audit-invoice-guard.cjs  ✅  OK — 40 blank sales (<= baseline 40); guard holds.
```

Fertugu sölurnar eru sölur sem **ekki er hægt að rukka**. Vörðurinn átti að falla ef ein
fyndist. Í staðinn var talan skrifuð inn sem ásættanleg og þögnin varð varanleg.

> **Regla: grunnlína er aldrei hækkuð til að fá grænt.**
> Rauður vörður er niðurstaða, ekki óþægindi. Ef vörður er rauður og verkið er ekki
> hægt að klára strax, þá fær hann verk á listanum — ekki hærri grunnlínu.

---

## Stöðurnar á borðinu — hvað þær þýða raunverulega

| Staða | Hvað hún á að þýða | Hvað hún þýddi í reynd |
|---|---|---|
| `beidni` | óbyrjað | rétt |
| `i_vinnu` | einhver er á þessu **núna** | 19 af 30 höfðu ekki hreyfst í 30+ daga, 11 í 59 daga |
| `i_yfirferd` | búið, bíður þinnar staðfestingar | 18 af 26 gáfu þér ekkert til að skoða |
| `klarad` | búið og sannað | 109 af 147 áttu enga sönnun |

**Þrjár nýjar reglur sem laga þetta, og þær eru þvingaðar í kóða:**

1. **Klukka á `i_vinnu`.** Verk sem hreyfist ekki í 7 daga fer sjálfkrafa aftur í
   `beidni` með athugasemd um að það hafi sofnað.
   *Betra að sjá 200 óbyrjuð verk en 30 sem ljúga því að einhver sé að vinna.*
2. **Sönnunarskylda.** Verk kemst ekki í `i_yfirferd` eða `klarad` án skjámyndar úr
   viðmótinu **og** varðarins sem sannar að villuflokkurinn geti ekki endurtekið sig.
3. **Rauður vörður skrifar sig sjálfur** á listann með `flag=3`. Þú þarft ekki að fylgjast
   með neinu — það kemur til þín.

---

## Körfurnar þrjár — af hverju þú færð ekki lista

Þú sagðir: *„Ég græði rosalega lítið á því að fá fullt af post-it miðum krumpuðum og
límdum á vegg sem ég þarf að eyða hellings tíma í að reyna að fatta."*

Þess vegna fer ekkert verk beint til þín. Allt fer fyrst í eina af þremur körfum:

| Karfa | Hvað gerist | Hver |
|---|---|---|
| **A** | Ég geri það. Þú sérð það ekki aftur fyrr en það er búið og sannað. | ég |
| **B** | Dettur út — tvítekið, úrelt, eða þegar gert. Skýring skráð. | ég |
| **C** | Þarf þína ákvörðun. **Kemur fullbúið að ákvörðuninni.** | þú |

**Karfa C er mælikvarðinn á hvort þetta virki.** Ef hún er löng, eða ef eitthvað í henni
krefst þess að þú leitir, þá er ég að gera það rangt.

---

## Þegar eitthvað bilar hjá þér — ein leið

1. Segðu mér það í venjulegu tali. Eitt raundæmi ef þú hefur það.
2. Ég finn rótina og segi þér hvort það er ný villa eða systkini af þekktri.
3. Ef vörður var til og var grænn: **vörðurinn hafði rangt fyrir sér**, ekki þú.
   Hann mælir þá ranga hlið og verður endurskrifaður.
4. Þú færð tilkynningu þegar það er lagað, með skjámynd.

**Þú átt aldrei að þurfa að athuga hvort ég hafi raunverulega lagað eitthvað.**
Ef þú þarft þess, er ferlið bilað — ekki þú.

---

## Skipanirnar þínar

Þrjár. Þú þarft ekki fleiri.

```bash
node tools/audit-all.cjs
```
Öryggisnetið — 33 verðir. Grænt = engin þekkt villa hefur laumast inn aftur.
**Rautt er gott merki** ef við erum nýbúin að núlla grunnlínu: það þýðir að vörður
sem áður laug segir loksins satt.

```bash
node tools/minni.cjs --ferskt
```
Sækir ferska minnisstýribók. Keyrist sjálfkrafa við hverja lotu.

```bash
git push
```
Ýtir og samstillir vélarnar. **Birtir ekki** — birting krefst `[deploy]` í commit-inu,
því hvert deploy kostar krítur (15 per deploy ≈ 10 sent; 1.031 deploy 18.08–07.09).

---

## Reglur sem má aldrei brjóta

Þessar eru skrifaðar með blóði — hver þeirra kostaði raunverulegt tjón.

| Regla | Af hverju |
|---|---|
| **Aldrei `node deploy.js`** | Þurrkar út öll serverless-föllin þögult. Ýttu með git. |
| **Raunstaða fer aldrei í `app_settings`-blobb eða `localStorage`** | Það samstillist ekki milli vélanna fjögurra og heil-skrif éta vinnu annarra véla. |
| **Aldrei senda `stada` á `verkefnalisti`-API-ið** | Reiturinn heitir `status`. API-ið þegir yfir óþekktum reitum og skilar `ok:true` án þess að nokkuð gerist. |
| **Aldrei staðfesta viðmót með API-kalli** | Raunverulegur smellur og lestur á því sem sést. `ok:true` hefur logið margoft. |
| **Aldrei hækka grunnlínu á verði** | Sjá að ofan. |
| **Aldrei loka verki án sönnunar** | 109 af 147 „kláruðum" eiga enga. Helmingur af „búið" var ekki búið. |

---

## Minni er ekki sannleikur

Kerfið er fullt af geymdum staðreyndum: `STADREYNDIR.md`, `MINNISBOK.md`, Charlize,
`memory/`, `assistant_memory`. Hver þeirra var sönn þegar hún var skrifuð.
**Engin þeirra veit hvenær hún hætti að vera það.**

Tvö dæmi frá 09.09.2026, sama daginn:

- Þú last **138 óbyrjuð verk**. Gagnagrunnurinn sagði **172**. Talan þín var ekki röng —
  skjárinn telur rangt (17 af 26 flokkum fá engan hnapp).
- Ég sagði að vandinn væri ótengdir verðir. Svo **keyrði** ég þá: 33 grænir. Greiningin
  gjörbreyttist.

> **Regla: áður en nokkuð er fullyrt um stöðu — mæla.**
> Geymd staðreynd má nefna sem *„skráð þann X"*, aldrei sem *„staðan er"*.

---

## Hvernig þetta verður betra með tímanum

Þú spurðir um „samheldnari heila sem vinnur saman og þróast".

Hann er þegar til í pörtum — 49 agentar, ~40 skills, 33 verðir, þrjú repó. Það sem
vantar er ekki meiri geymsla. **Það sem vantar er geymsla sem leiðréttir sig sjálf.**

| Vantar | Lausn |
|---|---|
| Sameiginlegur staður fyrir mælingar | `oryggisnet_keyrslur` — agentar lesa mælingu í stað þess að giska |
| Eitthvað sem tekur eftir þegar staðreynd hættir að vera sönn | **Verðirnir.** Hver vörður *er* staðreynd skrifuð sem keyranleg prófun |
| Söguleg lína svo hægt sé að læra | Logið — hvenær vörður varð rauður og hvaða ýting olli því |

Hver villa sem finnst verður að verði. Hver vörður skrifar í logið. Næsti agent les
logið í stað þess að treysta á minni.

**Það er hvernig 49 agentar verða að einum heila** — ekki með fleiri agentum.

---

## Ef þú lest ekkert annað

1. Segðu mér hvað er bilað. Ekkert annað.
2. Ekkert er búið fyrr en vörður sannar það og heldur áfram að keyra.
3. Ef þú þarft að athuga hvort eitthvað hafi raunverulega verið lagað — þá er ferlið
   bilað, ekki þú.

*Sjá einnig: `docs/ORYGGISNET.md` (verðirnir), `docs/STADREYNDIR.md` (mældar staðreyndir),
`docs/TRIGGERS.md` (villumynstur og systkini), `docs/BEIDNIR.md` (beiðnaskráin).*
