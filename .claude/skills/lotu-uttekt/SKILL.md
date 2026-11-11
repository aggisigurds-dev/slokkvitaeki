---
name: lotu-uttekt
description: Verkferlið „Lotuúttekt í þekkingargrunn" — fara yfir Claude-lotur (sessions) tiltekins tímabils, lesa hvað hver gerði og lærði, endurmæla það sem var sagt „búið", og skila því í Charlize, agent- og skill-skrár og Verkefnalistann svo ekkert lifi aðeins í spjalli. Forráðamaður er `jarvis`. Samstilling agenta á móti Charlize á eftir er skill `agenta-samstilling`. Kveikjuorð: lotuúttekt, sessions úttekt, úttekt á lotum, fara yfir öll sessions, fara yfir loturnar, sessions í þekkingargrunn, hvað gerðu loturnar, yfirferð allra sessions, uppfæra þekkingargrunn úr lotum.
---

# Lotuúttekt í þekkingargrunn

Skráð 11.11.2026 að ósk Agnars („Sessions úttekt í þekkingargrunn"). Byggt á yfirferðinni 02.11.2026 (allar lotur
27.10–02.11) og reglunni „lota sem snerti kt og skrifaði 0 kunni-færslur er ólokið minni".

## Svona er þetta keyrt (gildir fyrir hvaða módel sem er)
1. Lestu ALLA þessa skrá áður en fyrsta skipun er keyrð. Segðu Agnari í einni línu hvaða verkferli fer af stað og á hvaða mengi.
2. Farðu skrefin Í RÖÐ. Slepptu engu skrefi og bættu engu við. Skref sem ekki er hægt að vinna er skráð ÓMÆLT með ástæðu — ekki giskað, ekki sleppt þegjandi.
3. Hver fullyrðing í skilunum á sér skipun eða fyrirspurn sem þú keyrðir Í ÞESSARI LOTU. Tala úr minni, úr eldra skjali eða úr skilum undiragents er ekki mæling — endurmældu eða skrifaðu ÓMÆLT.
4. STOPPAÐU og spyrðu Agnar ef: tala stemmir ekki við það sem skrefið krefst, skrif eru ekki talin upp í þessari skrá, eða tvær heimildir stangast á og skráin segir ekki hvor ræður.
5. Skrifaðu AÐEINS það sem skráin leyfir. Allt annað fer í töfluna til Agnars.
6. Áður en þú segir „búið": farðu yfir kaflann um lok/skil lið fyrir lið og segðu hvað var prófað, hvernig, og hvað ekki.

## Hvað telst afrakstur lotu
| Tegund | Fer í | Dæmi |
|---|---|---|
| Regla sem bítur / gildra | `charlize_knowledge` (topic = svið) + agent-skrá eiganda | „`athugasemdir` prentast, `krafa_note` er innri" |
| Fróðleikur um kúnna | `charlize_knowledge` scope `kunni`, kt með bandstriki | „reikningar fara rafrænt um Fjársýsluna" |
| Verk sem er ólokið | Verkefnalistinn (`verkefnalisti`), dagsett mælilína | „götumyndir óvistaðar" |
| Ákvörðun sem bíður Agnars | opið mál sem er til → lína bætt við; nýtt mál aðeins innan samþykkisþaksins | — |
| Óstaðfest | `charlize_inbox` | fullyrðing lotu sem ekki tókst að endurmæla |

Ólokið mál er ekki þekking: það sem breytist á morgun fer á Verkefnalistann, ekki í Charlize.

## Skref
1. **Tímabil og mengi.** Sjálfgefið: frá síðustu lotuúttekt (Charlize, topic `lotuuttekt`, nýjasta færsla) til dagsins
   í dag. Loturnar: `mcp__ccd_session_mgmt__list_sessions` og afritin á diski `~/.claude/projects/*/*.jsonl`
   (OneDrive-spegillinn „Claude Sessions Sync" ber lotur annarra véla). `list_events` skilar aðeins verkfæraköllum
   úr endanum — lestu jsonl-skrána sjálfa. Segðu töluna: N lotur, M á öðrum vélum, K ólesanlegar.
2. **Sigta.** Einkaverkefni og lotur sem snerta hvorugt félagið eru taldar en ekki lesnar. Lota sem er enn í gangi
   er lesin en ekkert skrifað um hana sem „búið".
3. **Per lota** (lesið í tímaröð; stórar skrár með `Grep` á notandaskilaboð og lokasvör, ekki í heilu lagi):
   a. Hvað bað Agnar um (orðrétt, stutt)? Hvað var gert? Hvað var sagt „búið / birt / lagað"?
   b. Hvað lærðist: leiðréttingar Agnars („nei", „ekki svona", „bíddu"), gildrur, mælingar sem felldu fyrri trú.
   c. Hvað var skilið eftir: óbirt, óprófað, „bíður Agnars", greinar sem voru ekki sameinaðar.
4. **Endurmæla áður en skráð er.** Fullyrðing lotu er ekki staðreynd. Fyrir hvert „búið": er það í `git log`, á
   lifandi síðu (`build.json`), í gagnagrunninum? Fyrir hverja tölu: mæld í dag eða merkt með dagsetningu lotunnar.
   Það sem ekki tekst að endurmæla er ÓMÆLT og fer í `charlize_inbox`, ekki `charlize_knowledge`.
5. **Tvítök.** `node tools/minni.cjs --leit "<lykilorð>"` áður en færsla er skrifuð. Sé staðreyndin til: ekkert, eða
   færslan uppfærð ef hún er orðin röng. Aldrei tvær færslur um sama hlut.
6. **Skrifa.**
   - Charlize: `node tools/minni.cjs --skra "<staðreynd með tölu og dagsetningu>" --topic <efni> [--scope kunni]`,
     ein færsla per staðreynd, `--source` með auðkenni lotunnar.
   - Agent/skill eiganda: `node tools/agent.cjs --skra "<lærdómur>" --agent <nafn>`; regla sem breytir verklagi er
     skrifuð inn í réttan kafla, ekki aðeins í Lærdóm.
   - Verkefnalisti: dagsett mælilína á verk sem er til; nýtt verk aðeins ef ekkert er til um efnið.
   - Minni þessarar vélar (`memory/`): aðeins það sem breytir hegðun næstu lotu; lokið verk er ekki minni.
7. **Lotuskráin.** `charlize_sessions`: hver lota fær merkt hvort hún skilaði færslum; lotur sem snertu kt en skiluðu
   engu kúnnaminni eru taldar upp.
8. **Loka.** `node tools/minni.cjs --uppfaera`; ein Charlize-færsla, topic `lotuuttekt`: tímabil, N lotur lesnar,
   færslur skrifaðar, hvað féll við endurmælingu, hvað var ólesanlegt. Þá er keyrt skill `agenta-samstilling` ef
   fleiri en fimm reglur bættust við.

## Skil til Agnars
Ein tafla: `lota (dags · heiti) · hvað var gert · staðfest já/nei · nýtt í Charlize · eftir`. Fyrir ofan hana mest
þrjár línur: hvað bíður hans, hvað féll við endurmælingu, hvað er óbirt.

## Það sem ferlið gerir ekki
Engin gögn kúnna leiðrétt, enginn deploy, ekkert mál stofnað umfram þakið, engin netföng eða símar í skrár.
Finnist peningamál (órukkað, röng krafa) fer það í skill `rannsoknarhamur` / `rukkari`, ekki leyst hér.

## Lokagátlisti — verkið er EKKI búið fyrr en hvert hak er merkt
Skilaðu þessum lista í lokasvarinu með ✔ eða ✘ við hvern lið og einni línu um HVERNIG hann var staðfestur. ✘ er leyfilegt svar; að sleppa liðnum er það ekki. Klárist lotan ekki: segðu nákvæmlega á hvaða skrefi var hætt og skráðu það þar sem næsta lota les það (staðan / vinnuskjalið), svo hún haldi áfram en byrji ekki upp á nýtt.
- [ ] Tímabil og fjöldi lota sagður (lesnar · á öðrum vélum · ólesanlegar)
- [ ] Hvert „búið" úr lotu var endurmælt (git log / build.json / gagnagrunnur) eða merkt ÓMÆLT
- [ ] Leitað að tvítaki (`minni.cjs --leit`) áður en hver færsla var skrifuð
- [ ] Ólokin verk fóru á Verkefnalistann, ekki í Charlize
- [ ] `charlize_sessions` uppfært fyrir lesnar lotur
- [ ] `minni.cjs --uppfaera` keyrt og Charlize-færsla með topic `lotuuttekt` skrifuð
- [ ] Taflan per lotu er í lokasvarinu
- [ ] Keyrslan skráð: `select app_settings_merge('{"verkferli_keyrslur":{"lotu-uttekt":{"sidast":"ÁÁÁÁ-MM-DD","lota":"<módel>"}}}'::jsonb);` — aðeins ef ferlinu er LOKIÐ; boxið „Verkferli tilbúin til keyrslu" les þetta
