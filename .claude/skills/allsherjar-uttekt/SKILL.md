---
name: allsherjar-uttekt
description: Allsherjar úttekt á öllu kerfinu í einu (Slökkvitæki-appið, Brunahólfs-hubbinn, sameiginlegi gagnagrunnurinn, deploy) með agentum — sjö svið lesa og mæla, einn efasemdarmaður reynir að hrekja — og EFTIRFYLGNIN á eftir, þar sem hver lagfæring er endurmæld á lifandi kerfi. Notaðu þegar Agnar biður um heildaryfirferð, vill vita hvort allt sé í lagi, eða biður um að farið sé yfir verk lotu og athugað hvort það virki í raun. Ekki fyrir eina breytingu (kerfisrynir) né samræmi tækjatalna (uttekt-audit). Kveikjuorð: allsherjar audit, allsherjar úttekt, heildarúttekt, taka audit, fara yfir allt kerfið, er allt í lagi, virkar þetta í raun, fara í gegnum allar beiðnir, eftirfylgni, endurmæla.
---

# Allsherjar úttekt — og eftirfylgnin sem gerir hana einhvers virði

Fyrst keyrt 31.10.2026 (Agnar: „Geturðu tekið allsherjar audit"), eftirfylgni 10.11.2026 („fara í gegnum allar
beiðnir úr þessu sessioni, athuga hvort það virki í raun, endurbæta"). Staðan úr þeirri umferð:
`docs/UTTEKT-20261031.md`.

**Tvennt sem þetta skill er til að tryggja:** að úttektin sé MÆLD (hver niðurstaða ber skipunina sem sannar hana,
og það alvarlegasta er hrakið eða staðfest eftir annarri leið), og að henni sé FYLGT EFTIR — úttekt sem enginn
endurmælir er skýrsla, ekki lagfæring.

## Hvað þetta kostar — segðu Agnari það á undan

8 agentar, um 2,4 milljónir undirtokena, 74 mínútur á 4 kjarna gámi (aðeins 2 agentar keyra í einu: þakið er
`min(16, kjarnar − 2)`). Workflow-tólið má AÐEINS nota þegar Agnar hefur beðið um agenta eða úttekt af þessari
stærð — annars lýsirðu þessu og spyrð.

## 1. Undirbúningur — sjálfur, áður en nokkur agent fer af stað

```bash
S=<scratch-mappa>
git clone --depth 300 <slokkvitaeki> $S/sl && git clone --depth 300 <brunaholf> $S/bh
ln -sfn bh $S/brunaholf                 # ANNARS er audit-agentar falskt rautt (MAELINGAR kafli 20)
curl -s https://brunaholf.netlify.app/api/verkefnalisti > $S/bord.json   # opnar beiðnir — svo ekkert sé selt sem nýtt
(cd $S/sl && node tools/audit-all.cjs > $S/auditall.txt 2>&1 &)          # í bakgrunni; lestu rauðu línurnar sjálfur
curl -s https://slokkvitaeki.netlify.app/build.json; curl -s https://brunaholf.netlify.app/build.json
```

Og úr gagnagrunninum (aðeins SELECT): stærð grunns og stærstu töflur, `pg_stat_statements` (þyngstu köllin),
tvítaldir vísar, RLS-talning. **Lestu Þjónustuborðið** (`thjonustubeidni`, opið, tög `skrad-akvordun` / `agent:<svið>`):
ákvörðun Agnars sem er yngri en síðasta úttekt breytir því hvað er „niðurstaða" og hvað má laga (10.11.: mál #1536,
„RLS skiptir ekki miklu máli" — öryggisstillingar eru hans einar).

## 2. Keyrslan

```
Workflow({ scriptPath: 'tools/uttekt/allsherjar-uttekt.workflow.js',
           args: { S: '<scratch-mappa>', sidan: '<dagsetning síðustu úttektar>', bord: <fjöldi opinna beiðna> } })
```

Sviðin sjö: gögn og rukkun · öryggi · Slökkvitæki í vafra · hub og gagnaleiðslur · kóði Slökkvitækis · kóði
Brunahólfs · deploy og CI. Hvert skilar `graent[]`, `nidurstodur[]` (titill, alvarleiki, lýsing, sönnun, staður,
á_verkefnalista, tillaga) og `ekki_maelt`. Efasemdarmaðurinn fær allt sem er krítískt/hátt og dæmir
staðfest / staðfest-en-vægara / hrakið / ómælanlegt með ÓHÁÐRI mælingu.

Hörðu skilyrðin standa í skriftunni og mega ekki mýkjast: aðeins lestur; skrif í vafra fölsuð OG
`sendBeacon`/`keepalive` óvirk (MAELINGAR kafli 17); aldrei lesa `aggisigurds@gmail.com`; aldrei prenta lykil.

Á meðan agentarnir vinna: farðu sjálfur ofan í rauðu verðina úr `audit-all` — þar liggja oft raunverulegustu
niðurstöðurnar (31.10.: 153/360 `?v=`-misræmi, Krókur 77, skjöl sem komu aftur eftir eyðingu).

## 3. Skýrslan til Agnars

Niðurstaðan kemur í úttaksskrá verksins (`result.svid[]`, `result.domar[]`). Röðin sem virkaði:
krítískt (opið núna) → hátt → peningar (R-númer og upphæðir) → rekstur → viðmót → **grænt** → **ekki mælt** →
hvað ég get lagað sjálfur / hvað bíður hans. Stutt. Engin niðurstaða án tölu. Það sem þegar er á Verkefnalista
er sagt þannig, með „versnað/batnað/óbreytt".

## 4. Lagfæringar — í þessari röð

1. **Kóði** í PR per repó, EITT `[deploy]` hvort (deploy kostar; sjá skill `deploy`). Vörðuð leið → `netvordur`
   kallaður úr AÐALLOTUNNI (gaffall getur það ekki) með master-á-móti-grein samanburði á raungögnum.
2. **Tvær síður, ein tala** → sameiginleg skrá, og harness sem keyrir gamalt og nýtt á sömu gögnum (MAELINGAR kafli 21).
3. **Gagnagrunnsbreytingar (DDL)** fara í `brunaholf/sql/<dags>_<nafn>.sql` með afturköllun í haus og eru prófaðar
   sem `create temp view` / í tómri færslu fyrst. `apply_migration` spyr Agnar — sjái hann ekki spurninguna (sími)
   rennur hún út; þá stendur skráin merkt ÓKEYRT og verkið fer á Verkefnalistann. Aldrei framhjá með `execute_sql`.
4. **Öryggisstillingar (RLS, lyklar, innskráning) eru ákvörðun Agnars** — mál á Þjónustuborðinu, ekki verk.
   Eitt mál, ekki tíu; leitaðu fyrst að opnu máli um sama efni og bættu við það.
5. **Verk sem þú lagar ekki** → `verkefnalisti` (status `beidni`, eitt verk per MYNSTUR, skrá:lína og mæling).

## 5. Eftirfylgni — „virkar þetta í raun?"

Gerð í nýrri umferð, helst nokkrum dögum síðar. Úttekt sem liggur er ekki lengur lýsing á kerfinu: 10.11. voru
354 + 131 commit komin frá 31.10. og ný ákvörðun á borðinu.

1. `git fetch` í báðum repóum; lifandi `build.json`; er hver lagfæring ENN í trénu (`grep` á sérkenni hennar)?
2. `node tools/audit-all.cjs` — verðirnir sem lotan bjó til eða lagaði eiga að vera grænir; nýir rauðir eru taldir
   upp og sagt hvort þeir tengjast verkinu.
3. Lifandi endapunktar með GET og HÖFNUÐUM POST (hafnað kall skrifar ekkert): staðan sem lagfæringin lofaði.
4. Tölur sem áttu að stemma — stemma þær enn, per lykil?
5. Gagnagrunnsstaða með SQL: keyrði það sem átti að keyra? (`relrowsecurity`, `pg_indexes`, `pg_get_viewdef`.)
6. Vafri: `tools/maelingar/` (`maela.cjs`, `hopp.cjs`, `kyrrd-cpu.cjs`). **Frá 10.11.2026 er appið á bak við
   innskráningu** — skrifturnar stoppa á hliðinu (exit 2). Að svara hliðinu sjálf eða fá köku er ákvörðun Agnars;
   án hennar er vafrinn „EKKI MÆLT" og það er sagt.
7. **Systkinaleit** fyrir hverja villutegund sem var löguð (skill `variant-analysis`) — og vörður ef mynstrið á
   systkini (10.11.: `audit-regex-bakstrik` fann þrjú, eitt komið í loftið sama dag).
8. **Hvað var lagað en hefur aldrei keyrt í alvöru?** Segðu það (10.11.: „Viðbót við R-…" á Payday-kröfu — engin
   viðbótarsala enn til).
9. Þekkingin: MAELINGAR (ný gildra), agent-skrá eigandans (ein staðreynd, einn staður), Charlize (`minni.cjs --skra`,
   svo `--uppfaera`), `docs/UTTEKT-<dags>.md` uppfært með stöðu. Áður en þú skráir: `node tools/minni.cjs --leit "<orð>"`
   — er staðreyndin þegar til? (Bókin ber yfir 200 efni; leitin fer yfir þau öll og segir hvað hún sá ekki.)

## Gildrur sem bitu

- **Grænt þýðir „það sem vörðurinn mældi"** — þrír verðir gátu ekki orðið rauðir (MAELINGAR kafli 19).
- **Mæliskrifta sem lendir á innskráningarsíðu skilar „CLS 0, 0 villur"** fyrir öll borð. Athugaðu slóðina.
- **`build-agents-registry.cjs` í skýjalotu þurrkar skrána** (inntak vantar) — lestu `git diff --stat` á eftir.
- **Bæði repóin eru OPINBER á GitHub** og `/api/verkefnalisti` svarar án innskráningar. Skrifaðu staðreyndir og
  hvar þær eru mældar; aldrei gildi lykils, aldrei skref-fyrir-skref leið að óvörðu falli.
- **Slétt tala sem er jöfn þaki (1000) er ekki talning** — minnisbókin sagði „1000 staðreyndir" af 2.133 frá 04.11. til 10.11.2026
  og allt eldra en 04.11. var horfið úr henni (MAELINGAR kafli 22). Berðu sóttar raðir við `content-range`-heildina.
- **Tillaga eldist.** Það sem var „tilbúið til keyrslu" í síðustu umferð er endurmælt og borið við nýjustu ákvörðun
  Agnars áður en það er keyrt (MAELINGAR kafli 20).
