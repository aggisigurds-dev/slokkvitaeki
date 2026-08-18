# Sölur án customer_base_id — rót lokað í DB (verk #33)

_2026-08-18._

## Einkennin

Kröfur „hurfu" úr Kröfuyfirliti / 📦 Pör-bandinu og skjöl birtust ekki á
prófílnum — bæði lykla á `solur.customer_base_id`. Í morgun þurfti að baktengja
~34 ósendar sölur handvirkt til að þær yrðu sendanlegar.

## Rótin

`solur`-innsetningin setti `customer_base_id` misjafnt eftir leiðum:

| Leið | Setti base_id? |
|---|---|
| `165-visit-workflow.js` (úttekt) | JÁ — en fyrst frá **2026-08-05** (afritar af `fyrirtaeki.customer_base_id`) |
| `pos.js` (kassi) | **NEI** — hver POS-reikningur varð munaðarlaus |
| `210` (vertíð), `273`/`291` (brunakerfi) | NEI |

Úttektarsölur frá maí–4. ágúst og allir POS-reikningar fóru því inn án base_id.

## Lausnin — trigger í stað JS-plástra

Í stað þess að laga hverja insert-leið er gatið lokað í gagnagrunninum:

**`trg_solur_fill_base_id`** (BEFORE INSERT OR UPDATE OF customer_id, customer_kt,
customer_base_id) → `solur_fill_base_id()`:

1. Ef `customer_base_id` er þegar til → snertir ekki.
2. Annars: af `fyrirtaeki.customer_base_id` (gegnum `customer_id`).
3. Annars: einkvæm kt-mátun í `customers_base` (bandstriks-þolin; fleiri en ein → NULL).
4. **Fill-only** — hafnar aldrei innsetningu (ALLTAF LEYFA VISTUN). Walk-in
   (`999999-9999`) sleppt.

Grípur allar leiðir, núverandi og framtíðar. Sannreynt: tilraun til að núlla
R-000762 (Afltak) → trigger fyllti strax aftur í base 208.

## Bakfylling

- Morgun: ~34 ósendar sölur (mataðar í Kröfuyfirlit-viðgerðinni).
- Kvöld: 25 til viðbótar af fyrirtæki.
- Eftir: **1 réttmæt undantekning** — R-000704, POS walk-in einstaklingur
  („kt: 090789-2609") án fyrirtækis/grunnskrár. Ekki þvingað.

## Athugið

Engin JS-breyting var gerð — triggerinn er einn, á réttum stað (DB), og
áreiðanlegri en að muna eftir base_id í hverri nýrri sölu-innsetningu. `pos.js`
o.fl. mega áfram sleppa honum; DB fyllir.
