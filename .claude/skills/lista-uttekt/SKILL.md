---
name: lista-uttekt
description: Verkferlið „Listaúttekt" — finna og skrá ALLA lista, mælingar, verði og tól sem halda opnu verki eða stöðu (Verkefnalisti, Þjónustuborð, factcheck_bord og factcheck_akvardanir, Hunt/Veiðin, sara_yfirferd, checklistar og dagnótur, villuskrár, artifact-listar, audit-verðir, prófskriftur, docs-stöðuskjöl) í eina skrá, segja hver er lifandi, hver er dauður og hver skarast, og sjá til þess að hver hlutur eigi einn stað og uppfærist. Forráðamaður er `jarvis`; skörun mælir `natalie`. Kveikjuorð: listaúttekt, úttekt á listum, allir verkefnalistar, finna alla lista, hvaða listar eru til, týnt út í horni, of margir listar, of mörg tól, mælingaskrá, tólaskrá, hvaða mælingar eru til, hreinsa listana, sameina listana.
---

# Listaúttekt — allir listar, mælingar og tól í eina skrá

Skráð 11.11.2026 að ósk Agnars („úttekt yfir alla verkefnalistana út um allt, test, próf, factchecks, hunt, svo allt
geti uppfærst og sé ekki bara týnt út í horni … allt of mikið af mælingum og tólum og listum, finna þá alla og skrá").

Grunnurinn er til og er ekki smíðaður upp á nýtt: reglan „EINN VERKEFNALISTI — fjórar hirslur" (CLAUDE.md, mál #1548),
`/api/combo-yfirlit` + `node tools/combo-yfirlit.cjs` (telur hirslurnar; 844 opin atriði í níu hirslum 08.11.2026) og
vörðurinn `node tools/audit-skorun-lista.cjs` (skörun á R-númerum). Mælt 11.11.2026: `slokkvitaeki/tools` geymir 232
skrár, þar af 130 `audit-*`; `brunaholf/tools` 25. Enginn veit hverjar þeirra eru enn keyrðar — það er verkið.

## Svona er þetta keyrt (gildir fyrir hvaða módel sem er)
1. Lestu ALLA þessa skrá áður en fyrsta skipun er keyrð. Segðu Agnari í einni línu hvaða verkferli fer af stað og á hvaða mengi.
2. Farðu skrefin Í RÖÐ. Slepptu engu skrefi og bættu engu við. Skref sem ekki er hægt að vinna er skráð ÓMÆLT með ástæðu — ekki giskað, ekki sleppt þegjandi.
3. Hver fullyrðing í skilunum á sér skipun eða fyrirspurn sem þú keyrðir Í ÞESSARI LOTU. Tala úr minni, úr eldra skjali eða úr skilum undiragents er ekki mæling — endurmældu eða skrifaðu ÓMÆLT.
4. STOPPAÐU og spyrðu Agnar ef: tala stemmir ekki við það sem skrefið krefst, skrif eru ekki talin upp í þessari skrá, eða tvær heimildir stangast á og skráin segir ekki hvor ræður.
5. Skrifaðu AÐEINS það sem skráin leyfir. Allt annað fer í töfluna til Agnars.
6. Áður en þú segir „búið": farðu yfir kaflann um lok/skil lið fyrir lið og segðu hvað var prófað, hvernig, og hvað ekki.

## Afurðin: `docs/LISTASKRA.md` (ein skrá, ein lína per hlut)
| Dálkur | Merking |
|---|---|
| Heiti · tegund | LISTI (heldur opnu verki) · MÆLING (tala/staða) · VÖRÐUR (audit, rauður/grænn) · PRÓF (prófskrifta) · SKJAL (stöðuskjal í docs) |
| Hvar | tafla / skrá / slóð / síða |
| Eigandi | agent úr `docs/AGENTASKRA.md` |
| Hver skrifar · hver les | lota, vörður, Agnar, enginn |
| Síðast uppfært · síðast keyrt | dagsetning úr gögnum, `git log -1` eða `automation_runs`; annars ÓMÆLT |
| Opið | fjöldi opinna atriða í dag |
| Sést hvar | Vinnusamantekt, combo-yfirlit, Jarvis, `audit-all`, hvergi |
| Úrskurður | LIFANDI · SOFANDI (enginn skrifar > 30 d.) · DAUTT (enginn les) · SKARAST VIÐ <hvað> |

## Skref
1. **Lesa það sem er til:** `node tools/combo-yfirlit.cjs`, `node tools/audit-skorun-lista.cjs` (EXIT lesið sér),
   `docs/MAELINGAR.md`, `docs/ORYGGISNET.md`, `docs/AGENTASKRA.md` (gagnakortið), Charlize topic `listar`/`verkefnalisti`.
2. **Finna listana** — fimm leitir, hver með tölu:
   a. Töflur: `information_schema.tables` á heitum með `list`, `bord`, `beidni`, `verkefn`, `yfirferd`, `akvard`,
      `factcheck`, `hunt`, `veidi`, `villur`, `problems`, `inbox`, `checklist`, `notes`; fyrir hverja: fjöldi opinna
      raða og nýjasta `created_at`/`updated_at`. `backup_*` taldar en ekki skráðar.
   b. `app_settings` / `app_kv`: lyklar sem geyma lista eða stöðu (checklistar, dagnótur, keyrslur verkferla).
   c. Síður: síðukortið `data/sidukort.json` — hver síða sem sýnir lista eða teljara.
   d. Skjöl: `docs/*.md` með opnum atriðum („Opið", „Bíður", „TODO", „☐") og dagsetningu í heiti; `memory/` vísar.
   e. Artifact-listar: taflan `artifact_listar` (opin atriði per lista).
3. **Finna tólin** — `tools/` í báðum repóum, flokkað: `audit-*` (er það í `audit-all.cjs`? síðast breytt?),
   mælitól (`trio`, `combo-yfirlit`, `minni`, `agent`), prófskriftur (`prof-*`, Playwright), einnota skriftur
   (dagsettar, notaðar einu sinni). Tól sem ekkert kallar á og hefur ekki breyst í 60 daga er SOFANDI, ekki eytt.
4. **Mæla lífsmark** fyrir hvern lista: hver skrifaði síðast og hvenær, hver les (grep á töfluheitið í kóða), er hann
   talinn í combo-yfirliti eða Vinnusamantekt. Listi sem enginn les er DAUTT; listi sem er lesinn en hvergi sýndur er
   „týndur í horni" — það er aðalfundurinn.
5. **Skörun** (eigandi `natalie`): sami hlutur á tveimur listum. Vörðurinn sér aðeins R-númer; berðu líka saman á
   kt, `fyrirtaeki_id` og heiti. Hver skörun: hvor staðurinn heldur, hinn fær hlekk og lokast (reglan úr CLAUDE.md).
6. **Tillaga per hlut**, ein af: HALDA (og hvar hann á að sjást) · SAMEINA Í <lista> · FRYSTA (lesaðeins, merkt úrelt
   efst) · TENGJA (bæta í combo-yfirlit / Vinnusamantekt / `audit-all`). Ekkert er sameinað, fryst né eytt í
   úttektinni sjálfri — tillögurnar fara í EITT skjal til Agnars.
7. **Skrá:** `docs/LISTASKRA.md` skrifuð/uppfærð; staðan í `app_settings.listauttekt` (dags, fjöldi per tegund og
   úrskurð) svo box geti sýnt hana; ein Charlize-færsla, topic `listar`.
8. **Framkvæmd eftir já Agnars:** opin atriði flutt á Verkefnalistann með hlekk til baka, gamli listinn merktur
   frystur, nýjar mælingar tengdar í `MAEL` (489) eða combo-yfirlit, verðir í `audit-all.cjs`. Hver flutningur
   lesinn til baka og birtingin athuguð (teljarinn á skjánum breytist).

## Reglur
- Lesaðeins þar til Agnar hefur séð skrána. Engin eyðing, aldrei.
- Úttektin stofnar ekki nýjan lista — `LISTASKRA.md` er skrá YFIR lista, ekki listi yfir verk.
- Tala án dagsetningar og heimildar er ÓMÆLT. Tómt svar (RLS) er ekki „0 opin".
- Mest tvö mál á Þjónustuborðið (samþykkisþakið); tillögurnar eru eitt skjal, ekki mál per lista.

## Skil
Þrjár tölur efst (listar · mælingar/verðir · tól; þar af LIFANDI / SOFANDI / DAUTT / SKARAST), síðan taflan röðuð
eftir „opið" lækkandi, og sér kafli „Týnt í horni": það sem er lifandi en sést hvergi.

## Lokagátlisti — verkið er EKKI búið fyrr en hvert hak er merkt
Skilaðu þessum lista í lokasvarinu með ✔ eða ✘ við hvern lið og einni línu um HVERNIG hann var staðfestur. ✘ er leyfilegt svar; að sleppa liðnum er það ekki. Klárist lotan ekki: segðu nákvæmlega á hvaða skrefi var hætt og skráðu það þar sem næsta lota les það (staðan / vinnuskjalið), svo hún haldi áfram en byrji ekki upp á nýtt.
- [ ] Allar fimm leitir í skrefi 2 keyrðar, hver með tölu
- [ ] Bæði `tools/` (slokkvitaeki og brunaholf) flokkuð; fjöldi per flokk sagður
- [ ] Hver lína í `docs/LISTASKRA.md` ber dagsetningu síðustu uppfærslu eða ÓMÆLT
- [ ] `audit-skorun-lista.cjs` keyrt og EXIT lesið sér
- [ ] Engu var eytt, ekkert sameinað né fryst án já Agnars
- [ ] `app_settings.listauttekt` og Charlize-færsla (topic `listar`) skrifuð
- [ ] Kaflinn „Týnt í horni" er í skilunum
- [ ] Keyrslan skráð: `select app_settings_merge('{"verkferli_keyrslur":{"lista-uttekt":{"sidast":"ÁÁÁÁ-MM-DD","lota":"<módel>"}}}'::jsonb);` — aðeins ef ferlinu er LOKIÐ; boxið „Verkferli tilbúin til keyrslu" les þetta
