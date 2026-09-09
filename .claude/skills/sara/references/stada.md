# Staða keyrslunnar

_Uppfært **09.09.2026**. Uppfærðu þessa skrá í lok hverrar lotu._

> **Þessi skrá lýgur hraðar en nokkur önnur.** Útgáfan frá 31.07. taldi 11 fyrirtæki
> „Eftir" — öll ellefu voru búin þegar að var gáð sex vikum síðar. **Mældu alltaf á
> móti gagnagrunninum áður en þú treystir listanum hér að neðan.** Fyrirspurnin er
> neðst í skránni.

## Blað A og B — LOKIÐ

Öll ellefu fyrirtækin sem stóðu eftir 31.07. eru merkt **Búið 2026**:

**Blað A:** BGT (1642) · Stjörnu-Oddi (374) · Njálsgata 87 (723) · Center Hótel
Skjaldbreið (198) · Bæjarlind 12 (601) · Spörvar (214)
**Blað B:** Bros (672) · Prentun ehf (1129) · Aðalhreinsir Drífa (391) ·
Classicgarage (675) · Kleppsvegur (710)

Fyrri lotan (13 fyrirtæki, staðfest 31.07.) stendur óbreytt.

## SARA-BORÐIÐ er nú staðan — ekki þessi skrá

Frá 09.09.2026 lifir biðröðin í Supabase-töflunni **`sara_yfirferd`** og birtist á
Þjónustuborðinu (spjaldið „📋 SARA · VINNUBLÖÐ", patch `364-sara-yfirferd.js`).
Þessi kafli er afrit sem úreldist; **taflan er heimildin**.

```sql
select id, fyrirtaeki, stada, spurning
from sara_yfirferd where stada in ('bidur','samthykkt') order by rod;
```

### Hakið er grænt ljós — bíddu eftir því

Agnar 09.09.2026: *„check mark sem ég get sett sem þú mátt þá klára að gera skýrsluna
og invoicið.. ég síðan sendi hana af stað í kröfuyfirlit"*.

- `stada = 'bidur'` → **snertu ekkert.** Skrifaðu tillöguna í borðið og bíddu.
- `stada = 'samthykkt'` → Agnar hefur hakað við. Núna má klára skýrsluna og setja
  „í vinnslu". **Ekki „Klára heimsókn"** — hann sendir sjálfur í kröfuyfirlit.
- `stada = 'klarad'` → afgreitt, felst af borðinu.

Hann breytir **fjölda og verði beint í borðinu** áður en hann hakar. Lestu því
`linur`, `akstur`, `skyrslugerd` og `texti` úr töflunni *þegar hakið kemur* — ekki það
sem þú lagðir til í upphafi. Athugasemdareiturinn (`athugasemd`) er skilaboð til þín.

### Bíður — mælt 09.09.2026 (sjö vinnublöð)

| Fyrirtæki | id | Hvað stendur út af |
|---|---|---|
| **Hagstál** | 692 | Tilbúið. 8/8 stemma, 20.08.2026 skráð, Hákon, allt á yfirferð. Eftir: hökun, texti, staðfesta lista, í vinnslu. ≈ 43.228 kr. Slöngurnar eru án stærðar — verð miðað við 30 m. |
| **Álfaborg** | 661 | Þrjú ónýt tæki (2×9 L léttvatn, kolsýra, duft) — skrá ⊘ eða taka út? 9 L er ekki til í kerfinu. Heimilisfang leiðrétt í Skútuvog 4, en **öll 16 tækin bera enn „Skútuvogi 6"**. |
| **Endurskoðun og reikningshald** | 1190 | Blaðið segir 6 tæki (3 slöngur + 3 léttvatn), kerfið á 2 og enga slöngu. kt á blaði 581216 vs 581219 í kerfi. |
| **Naust Marine** | 659 | Blaðið nefnir CO₂ 2 kg sem er ekki til; „búið að minnka við sig". Hvað var raunverulega yfirfarið? |
| **Hótel Hjarðarból** | 697? | 697 (Grasnytjar, 12 tæki) eða 578 (Hjarðarból ehf, tómt)? |
| **Kirkjan Þorlákshöfn** | — | Finnst ekki í kerfinu. Stofna? Kennitölu vantar. |
| **„Sumarbústaðir" — blað 5** | — | Ekkert fyrirtækjanafn á blaðinu. 37 léttvatnstæki. Hvaða fyrirtæki? |

### Klárað 09.09.2026

Árskógar 6-8 (856) R-000907 · Jarðefnaiðnaður (358) R-000906 ·
Skinney-Þinganes (363) R-000904 · Steypustöðin Þorlákshöfn (620) R-000903.

### Eldri bið — enn óafgreitt

| Fyrirtæki | id | Staða | Hvað vantar |
|---|---|---|---|
| **Bæjarlind 12** | 601 | ✅ Búið | **engin skýrsla, enginn reikningur.** Þrepin segja `reikningur+uttekt` en hvorugt er til. 20 tæki. Falskt grænt. |
| **Tjarnarból 2** | 388 | ⏳ Í vinnslu | skýrsla til (10 tæki) en **enginn reikningur**. Skráin sagði 44.858 kr í júlí — engin sala finnst 2026. |
| **Njálsgata 87** | 723 | ✅ Búið | reikningur R-000671 (48.645 kr, „7 tæki") **en 0 tæki á tækjalista.** Hvað var rukkað? |
| **Tunguvegur 19** | 365 | ⏳ Í vinnslu | óljósa blaðið enn óafgreitt, 9 tæki, engin sala |

**Leyst síðan 31.07.:** Steinhella 14 (1625) fékk 8 tæki og reikning; Hamraborg 20 (645)
níu tæki og reikning; Gullsmári 11 (650) átján tæki og reikning.

### Cowork-málin á Þjónustuborðinu

Cowork skrifaði 06.09.2026 nítján „Úttektarskýrsla — X" mál í `thjonustubeidni`
(`source='cowork'`) þar sem lesturinn af blaðinu stendur í `notes` undir hausunum
`■ LESIÐ AF BLAÐI`, `■ TÆKJALISTI Í KERFINU` og `■ NIÐURSTAÐA`, með skanni af blaðinu
sem viðhengi. Þau eru enn ólesin inn í `sara_yfirferd` — **næsta verk**.

```sql
select id, title, fyrirtaeki_id, notes from thjonustubeidni
where deleted_at is null and archived_at is null
  and source = 'cowork' and title ilike 'Úttektarskýrsla%';
```

## Gildra sem fannst 09.09.2026 — reikningur á RÖNGU customer_id

`R-000532` (Steinhella 14, 37.768 kr, kt 440912-0360) ber `customer_id = 1103`, sem er
**„Bláa sjoppan"** — allt annað fyrirtæki. Hann finnst aðeins gegnum `customer_base_id`
(1051). Nafn og kt á reikningnum eru rétt svo hann rukkast rétt, en **hver uppfletting sem
joinar á `customer_id` eignar hann röngum kúnna** — og fyrirtæki lítur út fyrir að vera
órukkað þegar það er það ekki.

**Þess vegna: leitaðu ALLTAF að sölum á BÁÐUM lyklum.**

```sql
select * from solur where customer_id = <fid> or customer_base_id = <bid>;
```

## Fyrirspurnin sem segir sannleikann

```sql
with ars as (
  select key::bigint id, value v
  from app_settings, jsonb_each(settings->'arsskodun_customers') where id = 1
)
select f.id, f.nafn,
  case when (a.v->>'last_year_inspected')  = '2026' then 'BUID'
       when (a.v->>'field_inspected_year') = '2026' then 'I VINNSLU'
       else 'OSNERT' end as stada,
  coalesce((select string_agg(k,'+' order by k)
            from jsonb_each(coalesce(a.v->'steps_2026','{}'::jsonb)) x(k,val)
            where val = 'true'::jsonb), '-') as threp,
  (select count(*) from uttaeki u where u.fyrirtaeki_id = f.id) as taeki,
  (select count(*) from arsskodun_report_facts r
     where r.fyrirtaeki_id = f.id and r.report_year = 2026) as skyrsla,
  (select count(*) from solur s
     where s.customer_id = f.id or s.customer_base_id = f.customer_base_id) as solur
from fyrirtaeki f left join ars a on a.id = f.id
where f.id in (…) and f.deleted_at is null;
```

**Merkið um falskt grænt:** `stada = BUID` en `skyrsla = 0` eða `solur = 0`.

## Í kerfinu

- `294-uttektartexti.js` í framleiðslu; „✨ Búa til texta"-hnappurinn kom í `15be32b`.
- **Orðalagsuppfærslan er enn ekki komin inn** — hnappurinn skrifar áfram „Öll tæki
  yfirfarin… fengu hleðslu og fulla áfyllingu". Sjá `husmal.md` fyrir réttu myndina.
- Staða per tæki lendir í **`uttaeki.service_choice`** (`yfirferd` · `hledsla` · `nyitt`).
  Mælt 09.09.2026: 2.259 `yfirferd`, 163 `hledsla`, 2 `nyitt`, 3.668 tóm.
