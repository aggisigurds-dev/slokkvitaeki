# Fact-check yfirferðin — fjórar heimildir og reglurnar sem gilda

> Skrifað 08.09.2026 eftir heils dags yfirferð með Agnari. Þetta er
> **vinnulýsingin**, ekki einskiptisskýrsla: næsta lota á að geta keyrt sama
> fact-check upp á nýtt án þess að Agnar endurtaki neitt.
>
> Skyld skjöl: [`THJONUSTA-YFIRFERD-20260907.md`](THJONUSTA-YFIRFERD-20260907.md)
> (hverjir eiga heima í þjónustu) · Charlize-efnin `uttekt`, `thjonustulisti`,
> `taeki` · agentinn `sara-coworker` kafli 6.

## Heimildirnar fjórar

Agnar 07.09.2026: *„í fact check ferlinu … við erum með þjónustusamningamöppu,
úttektar invoices allt 2025 og jan-maí 2026, trigger orð í skjölum Akstur og
skýrslugerð, úttektarskýrslu master."*

| # | Heimild | Hvar | Staða 08.09.2026 |
|---|---|---|---|
| 1 | **Þjónustusamningar** | Drive `1hu405fCw01mYtYSn4BqIPvhtPCPuzmwM` | 98% skráðir — 116 af 118 sem finnast í kerfinu |
| 2 | **Úttektarreikningar** | Drive: 2025 `1Nkf8Btc…` · jan–maí 2026 `17VbRbche…` | 436 lesnir, 0 villur; 149 raðir skrifaðar í `uttekt_reikningur_facts` |
| 3 | **Úttektarskýrslur** | Drive master `1VSRRw6O8U6lU8WzZxA8CkLtrAmiU07mg` (~1500 skjöl) | Lesnar af multitool í brunahólf → `app_settings.arsskodun_customers` |
| 4 | **Prófíllinn** | `uttaeki` | Afleidd heimild. Aldrei sannleikur — sjá heimildaröðina |

## Heimildaröðin — tæknimaðurinn ræður

Agnar 07.09.2026: *„Tæknimaður hefur alltaf rétt fyrir sér. Þið hafið endalaust
verið að fikta í tækjaskránni og ekkert að marka hana. Hún bara fylgir
skýrslunni eða invoice."*

1. **SKÝRSLAN** — tæknimaðurinn taldi á staðnum. Sannleikurinn.
2. **REIKNINGURINN** — næstbest þegar engin skýrsla er til.
3. **TÆKJASKRÁIN** — afleidd. Stemmi hún ekki við skýrsluna er **prófíllinn**
   rangur, aldrei öfugt.

Multitool-bakendinn orðar sömu reglu í kóða (`brunaholf/netlify/functions/skyrsla-bunadur.js`):
*„The uttaeki table is auto-generated junk, so the report PDF is the real source."*

## Reglurnar sem greina á milli

**ÚTTEKT eða BÚÐARSALA** — Agnar: *„ef það stendur ekki Akstur eða skýrslugerð
þá er reikningurinn líklega bara úr búð."* Hvort tveggja segir að farið hafi
verið á staðinn. Mælt: af 40 sem fyrri reglan (aðeins „Skýrslugerð og vottun")
flokkaði sem búðarsölu báru **36 Akstur** — þau voru útkallsverk. Af 436
reikningum eru aðeins **fjórir** raunverulegar búðarsölur.

**TALNINGIN** — yfirferð + hleðsla + sala **lögð saman**. Prófað á 188 pörum:
sú regla gefur 61% samræmi, án hleðslu 40%, aðeins yfirferð 39%, hæsta-af 48%.
Hleðsla er viðbót, ekki tvítalning.

**REYKSKYNJARAR eru taldir í skýrslunni en ALDREI rukkaðir.** Furugrund 73:
skýrsla 10 (4 léttvatn + 6 skynjarar), reikningur 4 — hvort tveggja rétt.
Leiðréttingin færir samræmið úr 61% í 71%. Allar aðrar tegundir ERU rukkaðar;
að draga þær frá versnar samræmið.

**CO₂ 100 gr. og gjaldalínur eru ekki tæki.** Bílaverkstæði Íslands mældist með
51 „tæki" út á 50 CO₂-hylki og eitt byrjunargjald — á 2 tækja stað.

**PARAÐU VIÐ HÆSTA reikning ársins, ekki summu allra.** Hreyfill á þrjá
úttektarreikninga 2026 sem gefa summu 31 á móti skýrslu upp á 15.

**FJÖLSTAÐA-KÚNNA MÁ ALDREI PARA Á KENNITÖLU.** Center Hótel 2025: 220 tæki á
reikningum á móti 5 í einu skráðu skýrslunni — ekkert að, bara tíu staðir án
skráðrar skýrslu. Einstaða-kúnninn er eini hópurinn þar sem talan er ótvíræð.

Allar þrjár leiðréttingarnar saman: **61% → 75%** (137/183 einstaða-pör).

## Tólin

| Tól | Hvað það gerir |
|---|---|
| `tools/trio.cjs` | Mælitækið: prófíll vs skýrsla vs reikningur. `--listi`, `--fid`, `--skra`, `--saga` |
| `tools/lesa-reikninga-drive.cjs` | Les reikninga-PDF gegnum `/api/skjal`, skilar tækjatölu + nr + dags + tegund |
| `tools/bera-saman-reikninga.cjs` | Ber saman við skýrslur á kt + ári. Ber allar þrjár leiðréttingarnar |
| `tools/skra-reikninga-facts.cjs` | Skrifar í `uttekt_reikningur_facts`. Þurrkeyrsla sjálfgefin |
| `tools/lesa-skyrslur-drive.cjs` | Les úttektarskýrslu-PDF. Óþarft í bili (sjá tvær geymslur) en nauðsynlegt fyrir 2023–2024 |
| `brunaholf` `/api/skyrsla-bunadur` | Multitool-lesarinn sem fyllti `arsskodun_customers` |

## ⚠️ Tvær geymslur fyrir sömu skýrslu

Þetta er stærsta gildran í öllu kerfinu og hún kostaði ranga markaðsgreiningu:

- **`app_settings.arsskodun_customers`** — 855 félög, saga per ár (2025–2026),
  tækjafjöldi per tegund, mánuður, „Annað"-texti, upprunaskrá. Fyllt af
  multitool í brunahólf.
- **`arsskodun_report_facts`** — **ein röð per félag** (lykillinn er
  `fyrirtaeki_id` EINN, ekki fyrirtaeki_id+ár). Geymir NÝJUSTU skýrsluna.
  Þetta er taflan sem tríóið og tilbúið-ljósin lesa.

Þær voru ekki í takt. 08.09.2026 áttu **62 félög nýrri skýrslu í
`arsskodun_customers`** en í `arsskodun_report_facts`, og 2 vantaði alveg.

**Afleiðingin var mælanleg:** af 219 félögum sem mældust „komin fram yfir"
höfðu **59 verið skoðuð 2026** — gögnin lágu bara í hinni töflunni. Sú tala
rataði inn í markaðsgreiningu sem lagði til að hringja í 219 kúnna; réttur
listi er 160.

**Lagað 08.09.2026:** 2 nýjar raðir + 62 uppfærðar. 2026-skýrslur 291 → 354,
fram-yfir 219 → 160. Afrit: `backup_report_facts_20260908`.

**Regla héðan í frá:** áður en „óskoðaður" listi er notaður í nokkuð —
áminningar, símtöl, markaðssetningu — **berðu geymslurnar tvær saman fyrst.**

## Gildrur sem kostuðu tíma þennan dag

1. **`fyrirtaeki.created_at` er innflutningsdagur, ekki skráningardagur.** Öll
   félög bera 2026-04..09. Sía á „nýskráð eftir X" gefur 0 kandídata og lítur
   sannfærandi út. Notaðu fyrstu raunverulegu virkni.
2. **Tæki tengjast félagi á TVO vegu** — `uttaeki.fyrirtaeki_id` OG
   `uttaeki.client` (nafn). Talning sem lítur aðeins á FK sýnir núll hjá félagi
   sem á tæki. `audit-fk-join.cjs` greip þetta (Tannlæknastofa Skipholti 50d).
3. **Skráarheiti á Drive ljúga um dagsetningu.** Þrír reikningar í
   „2025"-möppunni eru frá 2024; Ölfusborgir-skýrsla heitir 2025 en er apríl
   2024. Reikningsnúmerið og textinn ljúga ekki.
4. **Bréfhaus skýrslunnar ber kennitölu Slökkvitækis sjálfs** (600508-0400).
   Fyrsta kt-hittið er því alltaf rangt — allar skýrslur lentu á félaginu sjálfu
   í fyrstu prufu.
5. **`[deploy]` þarf í commit-skilaboð** frá 07.09.2026, og `[skip ci]` er lesið
   hvar sem er í skilaboðunum — líka inni í prósa.

## Það sem stendur eftir

- **Rótin ólöguð:** búðarsala getur hengt sig í úttektarreit ársins á
  fyrirtækjasíðunni (NSN tæki sýndi R-108215 sem „Slökkvitækjaþjónusta 2026"
  þótt félagið eigi engin tæki). Reglan Akstur/skýrslugerð er til í
  `lesa-reikninga-drive.cjs` — hún þarf að rata inn í þá pörun.
- **2023–2024 skýrslur** eru hvergi nema í PDF-unum. `arsskodun_customers` nær
  aðeins aftur til 2025. `lesa-skyrslur-drive.cjs` er tilbúið fyrir þá keyrslu.
- **46 einstaða-frávik af 183** eiga sér enga sameiginlega skýringu lengur;
  27 þeirra skeika 1–2 tækjum.
- **Samskiptaupplýsingar og punktar í athugasemdum** á fyrirtækjaprófílnum eru
  ósnertur brunnur (Agnar 08.09.2026).

## ⚠️ Ný og endurvakin félög

Agnar 08.09.2026: *„sum ný eða endurvakin."* Félag án sögu er ekki sjálfkrafa
brottfall — það getur verið nýskráð eða endurvakið eftir hlé. Notaðu **fyrstu
raunverulegu virkni** til að greina á milli og **taktu aldrei félag úr þjónustu
á þeirri forsendu einni að sögu vanti.**
