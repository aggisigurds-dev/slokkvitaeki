---
name: villuleit
description: Hvernig Agnar sendir skill-agenta í villuleit sem er variant-alert — finna afrit af sama villumynstri (systkini-kt, röng join, falskt grænt) þvert á hubinn. Notaðu þegar Agnar segir „hindra klúður", „stöðva klúður", „villuleit", „variant", „variant-alert", „fölsk staðreynd", „false-fact", „sama mynstur og X", „er þetta víðar", „afrit", „systkini", „röng join", „FK-join", eða þegar ein villa er fundin og næsta skref er systkini. Taflan er docs/TRIGGERS.md. Ekki nýtt app. Skil í Charlize + einn lista.
---

Kveikjuorð (límtafla): `docs/TRIGGERS.md`.

## Hindra (áður en merge)

`hindra klúður` er **vörn**, ekki veiði. Áður en ýtt er: `node tools/audit-all.cjs` +
netvörður (`docs/ORYGGISNET.md`). Grepðu `customer_base_id` án `fyrirtaeki_id`,
`public_url`, Payday-eftir-kt. Charlize: `skýrsla = fyrirtaeki_id aldrei kennitala`.
Ekki breyta 153/187-reikningum. Ekki snerta Brunahólf.

# Villuleit — Agnar sendir, agentinn leitar víðar

Þetta er **sendi-leikreglan**. Aðferðin er þegar til:
`.claude/skills/variant-analysis` (fimm skref). Factcheck er
`.claude/agents/natalie.md`. Vörðu vírar eru `.claude/agents/netvordur.md`.

Trail of Bits
[variant-analysis](https://github.com/trailofbits/skills/tree/main/plugins/variant-analysis)
er valfrjáls lesning. Ekki setja upp Semgrep/CodeQL. `grep` + SQL duga.

## Hvernig Agnar sendir

1. **Opna rétt repo.** App-villa → `slokkvitaeki`. Hub/API/`customer.html` →
   `brunaholf`. Bæði lesa sama Supabase (`osfdzskyvisifcwyjkuk`).
2. **Ein setning:** `villuleit: sama mynstur og X`
   (Plaza, Center/Pizzan, Hotel Grandi, Kirkjuvellir/`uttaeki` án `fyrirtaeki_id`).
3. Agentinn les **þetta skill**, svo `variant-analysis`, svo Charlize
   (`topic` `villuleit` / `variant` / `oryggisnet` / `factcheck`).
4. Hann **lagar ekki** fyrsta hittið. Hann skilar lista.

## Variant-alert — grep-gátlisti

Keyrðu á **báðum** repo (og `netlify/functions/`). Eitt match er dæmi.
Mörg match á sömu rót er mynstur.

| Mynstur | Grep | Rangt þegar | Rétt lykill |
|---|---|---|---|
| **Systkini-kt** | `customer_base_id` án `fyrirtaeki_id`; `siblingsForKt`; `.eq('kennitala'`; `byKt` / `byBase` | ein skýrsla/reikningur málað á öll hótel/pizzur á sömu kt | `fyrirtaeki.id` (staður). Kt = hver borgar |
| **Röng join** | `uttaeki.client`; `lower(trim(client))`; `.limit(1)` á nafni/kt | tæki hverfur eða lendir á röngum stað | `uttaeki.fyrirtaeki_id` (`audit-fk-join.cjs`) |
| **Falskt grænt** | `isDoneYear`; `year_factcheck`; `hasConfirmedInvYear`; `last_year_inspected` | pera græn án skýrslu+reiknings **á þessum stað** | par á `fyrirtaeki_id`; `gap` trompar; `human` er LED |
| **public_url** | `public_url`; `bhDocUrl`; `drive_file_id` án efnisprófs | grænt/sent af dauðum hlekk | innihald eða staðfest par (254 `_okAtts`) |
| **Payday-eftir-kt** | `payday` + `kennitala` án `_siteTrusted`; `accountingCost` án `nr. N` | einn reikningur / 🧾 á öll systkini | `payday-push` aðeins með `_siteTrusted` |
| **Kennitala sem staður** | `document_pairs` lyklað á base/kt eina; `companyForBld` → `hits[0]` | eitt hús kveikir á tíu | `fyrirtaeki_id` (+ `stadur_nr`) |

Þekkt dæmi: Plaza, Center/Pizzan, Hotel Grandi, Heimaleiga 293, Hlaðvarpinn,
Steypustöðin 2026, Kirkjuvellir 152.880, Metal 7→9.

## Hver gerir hvað

| Ef … | Þá |
|---|---|
| Falskt grænt, tala á skjá ≠ tala í grunni, „stemmir þetta" | **Natalie** — mælir, skrifar `factcheck_bord`. Leiðréttir aldrei gögn |
| Vörðuð leið (10/233/254, 121/pos.js, payday-push, 153/187, 114, 309) | **netvörður** áður en lagað er — `docs/ORYGGISNET.md` + `node tools/audit-all.cjs` |
| Magn á tækjalista / skýrslu / reikningi | **uttekt-audit** (lesaðeins, `docs/SAMRAEMI-<ár>.md`) |
| Aðferðin sjálf (rót → exact grep → ein alhæfing → triage) | **variant-analysis** |

## Skil — Charlize + einn listi

**Ekki** ný síða, nýr flipi, nýtt app, ný tafla.

1. **Charlize** — ein færsla per *mynstur* (`topic='villuleit'` eða
   `topic='variant'`). Ein setning, file:line, engin persónu-kt.
2. **Einn listi** — annað hvort nýjar ☐-línur á `docs/SAMRAEMI-<ár>.md`
   **eða** eitt verk á Verkefnalista sem vísar í þær. Ekki sitthvor heimurinn.
   Verkefni = laga. Charlize = mynstrið. Natalie-mæling → `factcheck_bord`.
3. Ein málsgrein til Agnars: hve mörg staðfest, hve líkleg, hvað er hávaði.
   Óprófað sagt óprófað. Úrskurðartaflan í `variant-analysis` (RÓT / LEITAÐ /
   FUNDIÐ / LAGAÐ / EFTIR / SANNAÐ).

## Sync á 4 vélar + síma

**GitHub er tengingin.** Skill í repo + `git push` berst með `GIT_PULL` á
Kerfisheilsu. Skill sem liggur bara á claude.ai-reikningnum er ekki til á
hinum vélunum.
