# Hverjir eiga í raun heima í þjónustu — yfirferð 07.09.2026

> **Staða: FRAMKVÆMT 08.09.2026. Öll 36 tekin úr þjónustu.**
>
> Agnar fór sjálfur yfir úrtak (NSN tæki, Klettás, Hugheimur) og staðfesti:
> *„þeir sem ég kíkti á voru að virðist bara með búðarsölur og kerfið að halda
> að þetta væru úttektar invoice… má bara taka þau öll úr þjónustu."*
>
> `er_i_thjonustu = false` sett á öll 36 auðkennin hér að neðan. **Í þjónustu fór
> úr 683 í 647**, og öll 5.242 tækin standa eftir — ekkert þeirra 36 bar tæki.
> Þrjú félög án sönnunar standa eftir og það eru systkinastaðirnir sem haldið var
> eftir viljandi.
>
> **Afturköllun:** afritið er í töflunni `backup_thjonusta_ut_20260908` (36 raðir
> með fyrri stöðu). Til að bakka öllu:
> `update fyrirtaeki f set er_i_thjonustu = b.er_i_thjonustu from backup_thjonusta_ut_20260908 b where b.id = f.id;`
>
> **Rótin sem eftir stendur:** búðarsölur hengjast í úttektarreitinn á
> fyrirtækjasíðunni (NSN tæki sýndi R-108215 sem „Slökkvitækjaþjónusta 2026"
> þótt engin tæki væru skráð). Það er sjálfstæð villa og hún er ólöguð.

## Af hverju listinn er til

Agnar 07.09.2026: *„Það var einhverntímann flutt inn í þjónustu allir sem hafa
átt einhverja millifærslu eða greiðslu til fyrirtækisins, er ennþá að reyna
sortera þá út."*

`er_i_thjonustu` er því **ekki merki um þjónustu** heldur um að einhver hafi
einhvern tímann borgað. 684 félög bera flaggið. Þessi yfirferð flokkar þau öll
eftir því hvaða sönnun um raunverulega þjónustu er til.

Reglan sem greinir á milli er Agnars sjálfs, sett sama dag:

> *„Ef það stendur ekki Akstur eða skýrslugerð þá er reikningurinn líklega bara
> úr búð."*

Hvort tveggja segir að farið hafi verið á staðinn. Reikningur án beggja er
búðarsala og gerir kaupandann ekki að þjónustukúnna.

## Flokkunin — öll 684

| Sönnun | Félög | Tæki |
|---|---|---|
| A · Þjónustusamningur | 147 | 1.178 |
| B · Úttektarskýrsla til (skráð eða skjal) | 477 | 4.052 |
| C · Úttektarreikningur (Akstur/skýrslugerð) | 19 | 27 |
| D · Tæki skráð, engin úttekt | 2 | 10 |
| E · Aðeins sala eða skjal — engin þjónusta | 30 | 0 |
| F · Engin virkni yfirhöfuð | 9 | 0 |

**645 af 684 (94%) eiga raunverulega þjónustusögu.** Kandídatarnir eru 39, og
ekkert þeirra á eitt einasta tæki skráð.

Þrír þeirra eru **systkinastaðir kúnna sem eru sannarlega í þjónustu** — nýir
staðir sem bíða fyrstu úttektar. Þeir eiga að standa:

- Center Hótel - Hlaðvarpinn (10 systkini í þjónustu)
- Vélrás - Gullhella
- Vélrás - Klettagarðar

Eftir standa **36 kandídatar**.

## Kandídatarnir 36

### Virkir 2026 — búðarkúnnar samkvæmt reglunni (21)

| Félag | fid | Síðasta spor |
|---|---|---|
| Fjörukráin ehf | 1589 | 03.09.2026 |
| Hugheimur ehf. | 509 | 02.09.2026 |
| Hjallabraut 35-43, húsfélag | 1500 | 23.07.2026 |
| Reising Byggingarfélag ehf. | 1624 | 10.07.2026 |
| Meistaralagnir ehf | 1218 | 27.05.2026 |
| Rótin, félagasamtök | 1514 | 06.05.2026 |
| kt 250996-2849 | 1537 | 05.05.2026 |
| Bílaverkst. Kjartans-Þorgeirs sf | 1507 | 30.04.2026 |
| Hilmar Már Gunnlaugsson | 1519 | 28.04.2026 |
| NSN tæki ehf. | 580 | 27.04.2026 |
| Suðurbraut 2, húsfélag | 1509 | 16.04.2026 |
| Einar Örn Reynisson | 1189 | 15.04.2026 |
| Oscuro ehf | 1505 | 14.04.2026 |
| Habitar Fasteignir ehf | 1515 | 31.03.2026 |
| Amrika ehf | 1522 | 19.03.2026 |
| Klettás ehf | 1520 | 17.03.2026 |
| Waldorfskólinn í Lækjarbotnum | 1512 | 09.03.2026 |
| Greining, endurskoðun ehf | 1513 | 19.02.2026 |
| HG kranar ehf. | 782 | 12.02.2026 |
| Íslandspóstur ohf | 1525 | 28.01.2026 |
| Mini Market ehf | 1511 | 19.01.2026 |

### Sofandi síðan 2021–2023 (6)

| Félag | fid | Síðasta spor |
|---|---|---|
| Húsfélagið Álfaskeið 82-84 | 854 | 12.04.2023 |
| Húsfélagið Ásakór 1 og 3 | 592 | 10.05.2022 |
| Bílskýli Flétturima 10-16 | 805 | 14.03.2022 |
| Álfholt 2c, húsfélag | 514 | 08.12.2021 |
| Gerplustræti 6-12, húsfélag | 846 | 19.04.2021 |
| Flétturimi 14, húsfélag | 786 | 31.03.2021 |

### Ekkert spor — hvorki sala, skjal né skýrsla (9)

Tannlæknastofa Skipholti 50d (1638) · Gullhamrar (1644) ·
Húsfélagið Sléttuhrauni 24 (1640) · Highland Base Kerlingarfjöll ehf (818) ·
Rentur Fagraberg 18 (1637) · Húsfélagið Sléttuvegur 9 (1641) ·
Art Hostel ehf. (827) · Húsfélagið Barónstígur 47 (1636) ·
Benedikt Þórisson (839)

## ⚠️ Fjögur nöfn sem á að staldra við

**Íslandspóstur ohf**, **Highland Base Kerlingarfjöll**, **Art Hostel** og
**Waldorfskólinn í Lækjarbotnum** eru stórir staðir sem *ættu* að hafa
brunavarnir. Séu þeir raunverulegir þjónustukúnnar þá vantar okkur skjölin
þeirra — og þá er þetta **gagnagat, ekki búðarkúnni**. Ekki taka þá út án þess
að fletta upp hvort úttekt hafi verið gerð utan kerfis.

## Hvað var þegar búið að gera í fyrri áfanga

Dálkurinn `fyrirtaeki.is_bank_only` er til og ber **154 raðir** — greiðendur úr
banka sem áttu hvorki kennitölu, tæki né samning. Þeir eru faldir úr öllum sýnum
nema sinni eigin síu („🏦 Greiðendur (bank)" í patch 157) og aðeins **einn**
þeirra ber `er_i_thjonustu`. Sú merking er afturkræf — flaggið, ekki eyðing.

**Enginn af þessum 36 er í þeim hópi.** Þeir eru næsta lag: þeir eiga kennitölu
og skjöl, en enga þjónustusönnun.

## Tvær gildrur sem kostuðu tíma við þessa yfirferð

1. **`fyrirtaeki.created_at` er innflutningsdagur, ekki skráningardagur.** Öll
   félög bera dagsetningu á bilinu 2026-04 til 2026-09 (þegar appið var byggt) —
   2026-05 eitt og sér ber 496 félög. Sía á „nýskráð eftir X" gefur því
   merkingarlausa niðurstöðu sem lítur sannfærandi út: fyrsta atrenna mín gaf
   **0 kandídata** og virtist rétt. Notaðu fyrstu raunverulegu virkni í staðinn
   (`min` af `solur.created_at`, `customer_documents.doc_date`,
   `arsskodun_report_facts.report_year`).
2. **„Engin úttekt í kerfinu" er ekki sama og „engin úttekt".** Fjórir kúnnar
   litu út fyrir að vera búðarkúnnar en eiga endurtekna reikninga 2024–2026
   (Hugheimur með sjö). Þeirra reikningar eru aðeins skráðir sem skjöl með
   R-10xxxx-númerum, ekki lesnir sem úttektir. Það mælir skort á gögnum hjá
   okkur, ekki skort á þjónustu.

## Næsta skref þegar Agnar ákveður

- **Taka úr þjónustu:** `update fyrirtaeki set er_i_thjonustu = false where id in (…)`
  — afturkræft, og listinn hér að ofan er afritið.
- **Eða fela eins og bankagreiðendur:** `is_bank_only = true`, sem heldur
  kennitölu og skjölum en tekur þá úr sýnunum.
- **Fyrst:** fletta upp fjórum nöfnunum að ofan.
