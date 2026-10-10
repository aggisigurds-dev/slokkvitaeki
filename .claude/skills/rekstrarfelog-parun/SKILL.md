---
name: rekstrarfelog-parun
description: >
  Pörun skýrslu ↔ reiknings ↔ tækjaskrár hjá rekstrarfélögum (sama kennitala,
  margir staðir — Center Hótel, Heimaleiga, Aðalskoðun, Steypustöðin, Pizzan,
  Endurvinnslan, Colas, Vélrás…) eftir TÖLUM per tækjategund, ekki heitum eða
  heimilisföngum. Notaðu þegar spurt er „stemmir reikningurinn við skýrsluna",
  „hvaða reikningur á þessa skýrslu", „para eftir magni", „af hverju er þessi
  staður vantar reikning", „tvíræð", „vegna-línan", „hvað þarf að sækja mörg
  tæki til hleðslu", eða þegar skýrsla og reikningur virðast stangast á hjá
  félagi með fleiri en einn stað. Tólið: Skýrslu-stöð → ⚖ Para eftir magni
  (brunahólf) + tools/para-rekstrarfelag.cjs + tools/renna-rekstrarfelag.cjs.
---

# Rekstrarfélög — pörun eftir tækjafjölda

Agnar 06.10.2026: „para burtséð frá heitum / heimilisföngum" · „Invoice = skýrsla =
tækjalisti" · „ekki alltaf að marka eldri skjöl". Skráarheiti á Drive ljúga (öll blöð
Steypustöðvarinnar heita „Malarhöfða 38"); tölurnar 17/20/1/2 eru Borgarnes hvað sem
blaðið heitir. Heimildaröðin úr `fact-check` gildir: **skýrsla > reikningur > tækjaskrá**.

## Tólin

| Hvar | Hvað |
|---|---|
| brunaholf.netlify.app/#skyrslustod → stika **⚖ Para eftir magni** | Velur félag (kt með ≥ 2 staði), sýnir hverja skýrslu með besta reikningi, besta stað, pari og ⚑-ábendingum. „Lesa PDF" les ólesna skýrslu inn í söguna; „Para" skrifar par sem vantar reikning. |
| `brunaholf/netlify/functions/para-rekstrarfelag.js` | `GET ?listi=1` · `GET ?kt=` · `POST {action:'para'|'lesa', …, dry, force}`. Sérfræðingur: `skjol` (brunaholf). |
| `tools/para-rekstrarfelag.cjs --kt <kt> [--allt] [--tillogur]` | Sama greining án viðmóts, lesaðeins. `--tillogur` skrifar `ut/parun-<kt>.json` (örugg pör sem vantar + ábendingar + ólesnar). |
| `tools/renna-rekstrarfelag.cjs <kt> […]` | Rennir heilu félagi í gegnum lifandi fallið: les ólesnar skýrslur → parar það sem er öruggt → prentar töfluna. **Lesaðeins nema `--skrifa`.** |

Talið per tegund: léttvatn · duft 6–12 · duft 2 · CO₂ 2 · CO₂ 5 · slöngur · teppi.
**Reykskynjarar aldrei** (taldir í skýrslu, aldrei rukkaðir). Reikningur = yfirferð + hleðsla
(= skoðuð) og „Slökkvitæki …"-línur (= ný). Besti reikningur innan −1..+4 mánaða; frávik =
Σ|mismunur| (móti skoðuð eða skoðuð+ný) + 0,5 per mánuð; öruggt ef frávik ≤ max(2, 10 %).

## Reglurnar — hver þeirra kostaði eitthvað

1. **Einn reikningur, ein skýrsla.** Fyrsta útgáfan skoðaði hverja skýrslu eina og sér og
   paraði R-107896 („vegna húsnæðis Hjallahraun 4") við ÞRJÁ staði Aðalskoðunar, af því
   Grjótháls og Hjallahraun áttu sömu tölur. Reikningur bundinn í pari tilheyrir ÞEIRRI
   skýrslu; `POST para` neitar reikningi sem er þegar í pari (nema `force`).
2. **`reikningslestur.vegna` sker úr.** Vegna-línan útilokar aðra staði og leysir tvíræðni
   (`stadirUrTexta`: sameiginlega forskeytið „Center Hótel - " fer af heitunum, stofn fyrstu
   6 stafa svo Hjallahraun/Hjallahrauni passi). Reikningur sem nefnir annan stað er aldrei
   kandídat, hversu vel sem tölurnar passa.
3. **Tvíræð = sýnt, aldrei parað.** Tveir staðir með nákvæmlega sömu tölur sama ár fá ⚑
   „tvíræð" og engan Para-takka nema vegna-línan nefni annan þeirra.
4. **Tvær geymslur, og báðar ljúga.** `arsskodun_customers[fid].history` geymir stundum
   skýrslur ALLRA staða hópsins (kt-leki úr batch-lestri — Grjótháls bar 4 færslur fyrir
   2026 og 7 fyrir 2025); `arsskodun_report_facts` ber skjal af öðru ári en `report_year` í
   138 röðum og annars félags í 17 (mælt 06.10.2026; 119 félag+ár með fleiri en eina
   sögufærslu, 111 félög, mest 15). Því: PDF-lesin færsla (`doc_id`) vinnur; facts-röð með
   rangt skjal víkur aðeins fyrir sögufærslu sem nefnir staðinn; fleiri færslur sama ár →
   sú sem nefnir staðinn, hinar í ⚑ — **aldrei „fyrsta sem fannst"**. R-106443 „vegna
   Gjótháls" leit út fyrir að stangast á við skýrsluna; PDF-ið sagði 3/1/1 = reikningurinn.
   **Lestu PDF-ið áður en þú dæmir reikning rangan.**
5. **`lesa` yfirskrifar ekki blint.** Skjal 9906 lá undir Skjaldbreið en sagði sjálft „hjá
   fyrirtækinu Miðgarður" (33 tæki) og lesturinn eyddi 3-tækja sögunni. Nú stöðvar `lesa`
   sig (`tharf_force:true` + tölurnar) ef hjá-línan nefnir annan stað í hópnum eða árið á
   færslu úr öðru skjali með öðrum tölum. `force:true` yfirskrifar. `lesa` uppfærir BÁÐAR
   geymslurnar (facts upsert, aldrei með eldra skjali).
6. **Tæki = `uttaeki.status <> 'urelt'`** (active / „Í lagi" / ok / loaned). `status=eq.active`
   faldi 11 félög alveg (Dalbrekka 4-6: 48 tæki) — `audit-status-gildi.cjs` fer rautt.
7. **manual / manual_unlink pör eru aldrei hreyfð.** Tólið sýnir að þau passi (Þingholt 2026
   ↔ R-000804 frávik 0) en Agnar ákveður; hann lét tengja tvö aftur 06.10.2026.
8. **Skýrslur ≥ 2 ára fá ⚠ eldri heimild** og ráða engu um stöðu ársins.
9. **Fjölstaða-kúnna má aldrei para á kennitölu** — lykill er `fyrirtaeki.id`.

## Lestrargildrur sem bitu

- pdf-parse skilar „hjá \nfyrirtækinu Steypustöðin Borgarnesi kt:…" — línuskil á undan OG
  eftir orðinu. Regex sem krafðist eins bils fann ekkert. Mældu á textanum sem **fallið
  sér** (pdf-parse 1.1.1 úr Drive-byte-unum), ekki á Drive-textanum sem MCP sýnir.
- Sum blöð segja „hjá húsfélaginu …", ekki „fyrirtækinu". Sum segja „vegna Hringhellu og
  Íshellu" = EIN skýrsla og EINN reikningur fyrir tvo staði; parið getur aðeins átt annan.
- PostgREST les `settings->arsskodun_customers->285` sem fylkisvísi — sæktu allan
  hlutann og veldu sjálf.
- `arsskodun_report_facts.source_doc_id` getur verið eldra skjal en `report_year` → leitaðu
  að pari á (fid, ár, 'uttekt'), ekki á skjalinu.
- Sami reikningur getur verið bæði í `reikningslestur` og `solur` (R-000xxx) — salan ræður.
- Tveir reikningar með sömu línum (R-107256 / R-107267, dagur á milli) → jafntefli; sá sem
  parið á þegar vinnur. Segðu Agnari frá hinum (tvírukkun / endurútgáfa án kreditar?).

## Vinnulag

```bash
node tools/renna-rekstrarfelag.cjs 540994-2269            # lesaðeins: staðan núna
node tools/renna-rekstrarfelag.cjs 540994-2269 --skrifa   # les ólesnar PDF + parar örugg
node tools/para-rekstrarfelag.cjs --kt 540994-2269 --allt --tillogur
```

1. Afritaðu `document_pairs` (og `arsskodun_customers` lyklana) áður en nokkuð er skrifað:
   `create table backup_<dags>_… as select …`. Skrifin í dag eru merkt `matched_by`
   `magn_station` / `magn_claude_<dags>` / `magn_afturkallad_<dags>` / `manual_relink_agnar_<dags>`.
2. Eftir skrif: keyrðu sama félag lesaðeins aftur og lestu ⚑-línurnar. „Upptekinn",
   „útilokaður: vegna", „tvíræð", „sagan geymir N færslur", „facts-röðin vísar á skjal frá …"
   eru niðurstöður, ekki hávaði.
3. Óháð aðferð: `E:\pascal-profun\rf-prof.cjs <kt>` keyrir spjaldið í headless Chrome og
   skilar fjölda raða / Para-takka / villum + skjámynd `ut/rf-1.png`.
4. Skráðu í minnisbókina (`node tools/minni.cjs --skra … --topic skyrslur`) og uppfærðu
   `brunaholf/.claude/agents/skjol.md` ef reglan breytist.

## Opið (06.10.2026)

- Hleðsluspáin (5 ár léttvatn/duft, 10 ár CO₂) bíður reikninganna 2022–2024 sem Agnar
  tekur saman; reikningslestur nær aðeins til 2024.
- 119 tvöfaldar sögufærslur eru ekki hreinsaðar — hver þarf PDF-lestur („Lesa PDF").
- Opin fjármál sem tólið fann: Midtown Hotel okt 2025 (61 tæki) án reiknings; Aðalskoðun
  einn reikningur á ári fyrir fjóra staði (Grjótháls/Skeifan/Skemmuvegur 2026, Skeifan/
  Skemmuvegur/Hjallahraun 2025 án reiknings); Center Grandi jan 2026 (25 tæki) án
  skoðunarreiknings; Þingholt Apartments des 2025 (5 tæki).
- 113 ólesnar skýrslur voru í 21 fjölstaða-félagi 06.10; Aðalskoðun, Center Hótel og
  Heimaleiga lesin að fullu (9201 Grandi 2023 skannað, 859 Höfuðstöðvar 2023 horfið).
