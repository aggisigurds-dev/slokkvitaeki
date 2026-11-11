---
name: agenta-samstilling
description: Verkferlið „Agenta-samstilling" — uppfæra alla agenta og skills á móti þekkingargrunninum Charlize eftir föstu ferli, svo enginn sérfræðingur vinni eftir úreltri reglu, dauðum vísi eða gamalli tölu. Les ferskan Charlize, mælir ferskleika hvers agents, vinnur nýjar staðreyndir inn í rétta skrá, leiðréttir mótsagnir, samræmir vélar-spegla, endurbyggir agentaskrána (Jarvis → Sérfræðingar og leiðarvísinn) og sannprófar kveikjuorðin. Forráðamaður er `jarvis`. Athugasemdir Agnars við agenta (agent_notes) eru skill `agent-athugasemdir`; úttekt á lotum er skill `lotu-uttekt`. Kveikjuorð: agenta-samstilling, samstilla agentana, uppfæra agentana, agent sync, uppfæra alla agenta, agentar á eftir, agentarnir úreltir, samstilla við Charlize, uppfæra þekkingu agenta.
---

# Agenta-samstilling við Charlize

Skráð 11.11.2026 að ósk Agnars („Agent sync update ferli við þekkingargrunn Charlize, og allir uppfærðir eftir
ákveðnu nákvæmu ferli"). Tilefnið sama dag: óháð yfirferð á níu verkferlum fann m.a. reglu í `samthykktir.md` sem
sagði öfugt við eigin leiðréttingu neðar í skránni, og 160 lína vélar-spegil af agent sem var 369 línur í repóinu.

## Svona er þetta keyrt (gildir fyrir hvaða módel sem er)
1. Lestu ALLA þessa skrá áður en fyrsta skipun er keyrð. Segðu Agnari í einni línu hvaða verkferli fer af stað og á hvaða mengi.
2. Farðu skrefin Í RÖÐ. Slepptu engu skrefi og bættu engu við. Skref sem ekki er hægt að vinna er skráð ÓMÆLT með ástæðu — ekki giskað, ekki sleppt þegjandi.
3. Hver fullyrðing í skilunum á sér skipun eða fyrirspurn sem þú keyrðir Í ÞESSARI LOTU. Tala úr minni, úr eldra skjali eða úr skilum undiragents er ekki mæling — endurmældu eða skrifaðu ÓMÆLT.
4. STOPPAÐU og spyrðu Agnar ef: tala stemmir ekki við það sem skrefið krefst, skrif eru ekki talin upp í þessari skrá, eða tvær heimildir stangast á og skráin segir ekki hvor ræður.
5. Skrifaðu AÐEINS það sem skráin leyfir. Allt annað fer í töfluna til Agnars.
6. Áður en þú segir „búið": farðu yfir kaflann um lok/skil lið fyrir lið og segðu hvað var prófað, hvernig, og hvað ekki.

## Reglur ferlisins
- **Charlize er sannleikurinn, agent-skráin er vinnuleiðbeiningin.** Stangist þau á: mæla, leiðrétta þann sem er
  rangur, og segja hvor það var. Aldrei velja þegjandi.
- **Engu er eytt.** Úrelt regla er leiðrétt Á STAÐNUM („leiðrétt <dags>: hér stóð X") — ekki bætt við neðst sem
  mótsögn við það sem stendur ofar. Sá sem les aðeins fyrri hlutann má ekki fá ranga reglu.
- **Ein staðreynd, einn staður.** Regla sem á heima hjá öðrum agent er færð þangað og vísað á hana.
- **Tölur bera dagsetningu** („mælt 04.11.2026") eða eru teknar út. Opinn verkefnalisti í agent-skrá er merktur
  úreltur eða færður á Verkefnalistann.
- **Engin netföng, símar né kúnnaminni í skrár** (repóin eru opinber). `ALDREI`-listi agents breytist aðeins með
  orðum Agnars.
- Ferlið stofnar ekkert mál á Þjónustuborðið.

## Skref
1. **Staða repóa:** `git fetch origin && git status -sb` í `slokkvitaeki` og `brunaholf`. Óhreinar agent-skrár frá
   annarri lotu eru ekki snertar — nefndu þær.
2. **Ferskur Charlize:** `node tools/minni.cjs --ferskt` (slokkvitaeki), síðan `node tools/minni.cjs --uppfaera`.
   Bregðist kallið: ferlið stoppar hér og það er sagt — ekki samstilla á móti gömlu eintaki.
3. **Mæla ferskleika:** `node tools/agent.cjs` (listi + hversu ferskir) og `node tools/audit-agentar.cjs`
   (A dauður vísir · B úreltur). Þetta er röðin sem unnið er í: rauðir fyrst, svo elstu.
4. **Per agent / skill** (einn í einu, í aðallotunni):
   a. Lestu skrána alla. Finndu síðustu samstillingu (línan „Samstillt við Charlize <dags>" eða nýjasta dagsetning
      í Lærdómi).
   b. Sæktu það sem Charlize hefur lært síðan á efnum agentsins:
      `select id, topic, fact, detail, created_at from v_charlize_active where topic in (<efni agentsins>) and created_at > '<síðasta samstilling>' order by created_at;`
      Efnin eru í „Charlize — lestu fyrst"-kafla skrárinnar og í `data/agents-registry.json` (gagnakortið).
   c. Fyrir hverja staðreynd: er hún þegar í skránni? → ekkert. Ný regla? → inn í réttan kafla með `[C#id]`.
      Stangast á við skrána? → mæla hvor er rétt, leiðrétta á staðnum; sé Charlize röng er sú færsla leiðrétt
      (skill `charlize`) og óstaðfest fer í `charlize_inbox`.
   d. Lestu skrána á móti sjálfri sér: leiðrétting neðar sem ofar er ekki fylgt, tvær útgáfur af sömu reglu,
      tólalína (`tools:`) sem leyfir ekki það sem rútínan krefst (t.d. SQL), vísir á skrá/slóð sem er ekki til
      á þessari vél (`C:\projects\…`, `E:\…`, tól í annarri möppu).
   e. Lestu á móti standandi reglum beggja `CLAUDE.md`: samþykkisþakið (mest tvö mál), pre-push af, `[deploy]`,
      opinbert repó.
   f. Bættu línunni `Samstillt við Charlize <dags> — N nýjar, M leiðréttar` neðst í Lærdóm:
      `node tools/agent.cjs --skra "Samstillt við Charlize <dags> — …" --agent <nafn>`.
5. **Vélar-speglar:** `~/.claude/agents/*.md` og `~/.claude/skills/*` sem eiga heimaskrá í repói eiga að vera
   BENDLAR á heimaskrána (stutt skrá sem segir „lestu <slóð>"), ekki afrit. Berðu línufjölda og dagsetningu saman;
   afrit sem er á eftir er endurskrifað sem bendill. Global skill án heimaskrár (t.d. `rannsoknarhamur`,
   `samthykki-a-bord`) er samstillt eins og agent í skrefi 4.
6. **Athugasemdir Agnars:** skill `agent-athugasemdir` (taflan `agent_notes`) — unnar inn í sömu lotu.
7. **Endurbyggja skrána:** `node tools/build-agents-registry.cjs` í `brunaholf` (skrifar `js/agents-registry.js`
   fyrir Jarvis → Sérfræðingar, `data/agents-registry.json` fyrir leiðarvísinn, `data/sidukort.json`,
   `docs/AGENTASKRA.md`, `docs/TRIGGERS.md`). Lestu viðvaranirnar („engin kveikjuorð") og lagaðu þær sem snerta
   agenta sem breyttust.
8. **Sannprófa:** fyrir hvern breyttan agent `node tools/router.cjs --dry "<kveikjuorð>"` á þremur orðum — hann á að
   vera valinn. `node tools/audit-agentar.cjs` aftur: EXIT=0, lesið sér (aldrei í pípu).
9. **Skrá í Charlize:** ein færsla, topic `agentar`: hvaða agentar voru samstilltir, hve margar leiðréttingar, hvað
   var ekki hægt að samstilla og hvers vegna.
10. **Skil:** tafla `agent · síðast samstilltur · nýtt inn · leiðrétt · dauðir vísar · ósamstillt (ástæða)`.
    Commit í báðum repóum; Jarvis-spjaldið uppfærist við næsta `[deploy]` á brunaholf.

## Lok
Lotu lýkur ekki fyrr en: registry er endurbyggt, vörðurinn er grænn eða rauðu línurnar nefndar, og sagt er hvaða
agentar voru EKKI samstilltir. Hálfkláruð samstilling heldur áfram frá töflunni í Charlize-færslunni (skref 9).

## Lokagátlisti — verkið er EKKI búið fyrr en hvert hak er merkt
Skilaðu þessum lista í lokasvarinu með ✔ eða ✘ við hvern lið og einni línu um HVERNIG hann var staðfestur. ✘ er leyfilegt svar; að sleppa liðnum er það ekki. Klárist lotan ekki: segðu nákvæmlega á hvaða skrefi var hætt og skráðu það þar sem næsta lota les það (staðan / vinnuskjalið), svo hún haldi áfram en byrji ekki upp á nýtt.
- [ ] `minni.cjs --ferskt` svaraði (annars var stoppað í skrefi 2)
- [ ] Hver agent á listanum er annaðhvort samstilltur eða talinn upp með ástæðu
- [ ] Engri reglu var eytt; leiðréttingar eru Á STAÐNUM með dagsetningu
- [ ] Vélar-speglar í `~/.claude/agents` og `~/.claude/skills` bornir saman við heimaskrár
- [ ] `build-agents-registry.cjs` keyrt, EXIT=0
- [ ] `router.cjs --dry` prófað á þremur kveikjuorðum per breyttan agent (heilar setningar, 3+ orð)
- [ ] `audit-agentar.cjs` keyrt eftir á og EXIT lesið sér
- [ ] Charlize-færsla (topic `agentar`) skrifuð og taflan í lokasvarinu
