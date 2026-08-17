# Kröfuyfirlit ↔ ársskoðun — samræming eintaka (truth-reglan)

_Rannsakað 2026-08-17 (agent, lestur eingöngu). Regla Agnars: **Kröfuyfirlits-
eintakið (solur, greitt_med='reikningur') er truth** — ársskoðunar-/prófílsýnin
aðlagast því. Kóðahlutinn er ÚTFÆRÐUR (sjá neðst); SQL-hlutinn er ÓKEYRÐUR og
bíður yfirferðar Agnars._

## Niðurstaða í hnotskurn

- Tilgáta Agnars staðfest: síðurnar lásu úr sitthvorum heimildum og prófíllinn
  lét Drive/skjala-eintakið vinna þegar bæði voru til.
- **„Slæma tímabilið" er ekki maí sjálfur heldur bakfyllingarnar 18.–19.7.2026**
  (`cowork-payday-backfill`, `cowork-regen`, `cowork-backfill`, `claude-code:fasi0`)
  sem bjuggu til eintök með misgóðum heimildum fyrir maí–júlí reikningana.
- **Ágúst er hreinn** (34/36 sölur með samhljóða eintak, 0 upphæða-misræmi) —
  núverandi flæði er traust.
- Umfang hjá í-þjónustu-hópnum: **≈35–40 raðir** (26 payday-númera raðir + 3
  regen + 2 fasi0 + 8 upphæða-misræmi).

## Mánaðartafla (í-þjónustu)

| Mánuður | Sölur | Sama upphæð | Önnur upphæð/NULL | Ekkert cd-eintak |
|---|---|---|---|---|
| maí | 13 | 10 | 0 | 3 |
| júní | 71 | 66 | 2 | 3 |
| júlí | 44 | 32 | 4 | 8 |
| **ágúst** | 36 | 34 | **0** | 2 |

## Verstu raundæmin

- **R-000528 Ferðafélag Íslands**: solur 59.520 ↔ skjal 39.680 (cowork-backfill)
- **R-000577 Hamraborg ehf**: solur 26.884 ↔ skjal 16.220 (drive-multitool)
- **R-000647 Armar ehf.**: solur 32.179 ↔ skjal 24.769
- **R-000230/430/532**: „Endurgerð úr reikningslínum" (cowork-regen), amount=NULL
  — R-000532 EKKI flögguð is_duplicate og birtist sem alvöru skjal
- **34 raðir með Payday-HLAUPANÚMERI** („17", „57"…) í invoice_number í stað
  R-númers — flestar tvískráning á kröfu sem er til undir réttu R-númeri
- **Steypustöðin R-000157**: sýnd GREITT ranglega — numKey-árekstur við Payday-
  hlaupanúmer 157 (= R-000158) — **LAGAÐ í kóða** (sjá neðst)

## ÓKEYRT SQL — bíður Agnars (afrit + flögg/leiðrétting, aldrei DELETE)

ATH skref 3 (upphæðirnar 8): agentinn varar við að stöku tilvik gæti verið
réttmæt endurútgáfa þar sem Drive-PDF-ið er hið útsenda skjal — **yfirfara röð
fyrir röð fyrst** (þetta eru bara 8).

```sql
-- 0) Afrit
create table backup_20260817_cd_samraeming as
  select * from customer_documents where doc_type='reikningur' and year=2026
    and (invoice_number !~* '^r' or found_by in ('cowork-regen','cowork-payday-backfill','cowork-backfill','claude-code:fasi0'));

-- 1) Payday-númera raðir → rétt R-númer úr speglinum
update customer_documents d
set invoice_number = p.reference,
    notes = coalesce(d.notes,'') || ' · samræming 2026-08-17: payday-númer ' || d.invoice_number || ' → ' || p.reference
from payday_invoices_slokk p
where d.doc_type='reikningur' and d.year=2026
  and d.invoice_number !~* '^r' and p.number = d.invoice_number
  and p.reference ~* '^r';

-- 1b) …og flagg sem afrit þegar rétt R-eintak er þegar til
update customer_documents d
set is_duplicate = true, dup_of = d2.id
from customer_documents d2
where d.doc_type='reikningur' and d.year=2026 and d.found_by='cowork-payday-backfill'
  and d2.doc_type='reikningur' and d2.id<>d.id and d2.customer_base_id=d.customer_base_id
  and d2.invoice_number=d.invoice_number and d2.found_by is distinct from 'cowork-payday-backfill';

-- 2) Endursmíðuð eintök (regen/fasi0) sem eiga solur-röð → flagg
update customer_documents d
set is_duplicate = true,
    notes = coalesce(d.notes,'') || ' · samræming: solur-eintak er rétthærra'
where d.doc_type='reikningur' and d.year=2026
  and d.found_by in ('cowork-regen','claude-code:fasi0')
  and exists (select 1 from solur s where s.greitt_med='reikningur'
    and (regexp_match(s.num,'(\d{2,})'))[1]::bigint = (regexp_match(coalesce(d.invoice_number,'x'),'(\d{2,})'))[1]::bigint);

-- 3) Upphæðir samræmdar við solur — YFIRFARA RÖÐ FYRIR RÖÐ FYRST (8 raðir)
update customer_documents d
set amount = s.samtals,
    notes = coalesce(d.notes,'') || ' · upphæð samræmd við solur (' || d.amount || ' → ' || s.samtals || ')'
from solur s
where d.doc_type='reikningur' and d.invoice_number ~* '^r'
  and s.greitt_med='reikningur' and s.is_credit is not true
  and (regexp_match(s.num,'(\d{2,})'))[1]::bigint = (regexp_match(d.invoice_number,'(\d{2,})'))[1]::bigint
  and d.amount is distinct from s.samtals and d.amount is not null;
```

## Kóðabreytingar (ÚTFÆRT 2026-08-17 í 199-doc-year-grid.js)

1. **invDocChip truth-vörn**: skjala-eintak með grunsamlegt found_by (bakfyllingar-
   keyrslurnar) EÐA upphæð sem stangast á við söluna → sölu-reikningurinn verður
   aðaleintakið (data-invopen) og skjalið sést sem dauft ⚠ með skýringu.
2. **paydayByNum lyklun**: aðeins á reference (+ number með R-forskeyti) — lagar
   greiðslustöðu-víxlunina (Steypustöðin).
3. found_by + samtals bætt í fyrirspurnir svo samanburðurinn sé mögulegur.

## Skýrslu-tvíeintök og önnur tvímæli

210 í-þjónustu-fyrirtæki eiga 2026-skýrslu bæði sem viðhengi og customer_documents-
skrá — að mestu vísvitandi tvívistun sama efnis; efnismunur verður ekki greindur
úr lýsigögnum og er EKKI hluti af SQL-inu. 4 raðir með Stólpa-númer (S-1077xx)
skildar eftir. Payday-spegillinn nær aðeins 30.6.–12.8.2026 — eldri kröfur fá
enga PD-stöðu (ekki gagnaskemmd).
