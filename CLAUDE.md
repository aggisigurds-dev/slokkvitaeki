# CLAUDE.md — Slökkvitæki ehf web app

This file is read by Claude Code at the start of every session in this folder.
It contains everything Claude Code needs to know to be useful immediately.

> **📖 ALSO READ**: [`docs/STADREYNDIR.md`](docs/STADREYNDIR.md) — sannreyndar
> grunnstaðreyndir (kúnna-líkanið, töflur, vinnureglur) — **lesa á undan öllu öðru
> þegar spurning snýst um viðskiptavini/gögn**; and
> [`docs/CLAUDE-LEIDBEININGAR.md`](docs/CLAUDE-LEIDBEININGAR.md) — operational playbook; and
> [`docs/ORYGGISNET.md`](docs/ORYGGISNET.md) — **öryggisnetið (the safety net): READ
> before changing any guarded path (invoice OUT `10/233/254`, kennitala `121/pos.js`,
> billing `payday-push.cjs`, readiness `153/187`) and run `node tools/audit-all.cjs`
> before EVERY push. Route the change through the **`netvordur`** guardian agent
> (`subagent_type: netvordur`). Do not cut the power line without reconnecting + testing it.**
>
> og [`docs/MAELINGAR.md`](docs/MAELINGAR.md) — **gildrurnar sem láta mælitækið ljúga**
> (fastur biðtími í stað kyrrstöðu · tilbúinn atburður í stað raunverulegrar afhleðslu ·
> normalísering sem étur það sem greinir að · tómt svar úr RLS · falið spjald · nafnaleit
> í minnkuðum búnti · vörður á skrá í stað atriðis · „fyrsta sem fannst" af mörgum röðum ·
> útskrift skipunar tekin sem gildi · útdráttur prófaður á öðru hráefni en fallið fær ·
> bið styttri en lota biðraðarinnar). **Lesa áður en sagt er „mælt".**
> Hver gildra þar er mæld, með því sem hún kostaði. Regla 3 hér að neðan er marklaus ef
> mælitækið lýgur.
>
> **📋 Í upphafi vinnu-session:** líta á opin verk á Verkefnalistanum —
> `GET https://brunaholf.netlify.app/api/verkefnalisti` (beidni/i_vinnu) — áður en
> nýtt verk er hafið (Agnar 2026-07-30).
>
> **🗂 EINN VERKEFNALISTI FYRIR ALLAR LOTUR (Agnar 08.11.2026):** „veldu einhvern einn
> verkefnalista sem er notaður af öllum sessions svo þetta fari ekki út um allt."
> Listinn er **`verkefnalisti`** (vefur: brunaholf.netlify.app/verkefnalisti.html).
> **Nýtt verk fer ÞANGAÐ — ekki í nýja töflu, ekki á Þjónustuborðið, ekki í checklista.**
>
> Fjórar hirslur, hver með eitt hlutverk (mál #1548):
> 1. **Þjónustuborðið** = það sem bíður AGNARS. Ákvarðanir, leyfi, svör — ekkert annað.
> 2. **Verkefnalistinn** = það sem bíður OKKAR. Þarf verk ákvörðun? Þá fer ÁKVÖRÐUNIN á borðið,
>    ekki verkið.
> 3. **Villuskrár** (`app_problems`, `villur`) = vélagögn. Enginn les þær sem lista; vörður segir
>    frá þegar eitthvað NÝTT kviknar. Reynist röð peningamál er hún LYFT á borðið.
> 4. **Checklistar og dagnótur** = inntak, ekki geymsla. Atriði verður annaðhvort mál eða hakað.
>
> **Reglan sem heldur þessu:** hver hlutur á EINN stað. Lendi hann á tveimur er hlekkur á milli
> og hinn lokast. `tools/audit-skorun-lista.cjs` rauðnar þegar sami hlutur fer aftur á tvo staði,
> og `/api/combo-yfirlit` telur allar hirslurnar í einu svari (sést efst á Þjónustuborðinu).
>
> Mælt 08.11.2026 þegar reglan var sett: 844 opin atriði í níu hirslum. Skörunin sem fannst —
> 12 af 13 ósvöruðum `factcheck_akvardanir` áttu tvíbura á borðinu, og 14 borðmál báru þegar
> `verkefnalisti:`-tag sem hvergi var birt.
> covering the customer-DB architecture, Verkfærakassi, walk-in convention (kt
> `999999-9999`), rekstrarfélög-staðsettningar rule, email priorities, and known
> gotchas. Updated continuously as Agnar gives new context.

---


> **Reikningalota:** áður en reikningar, kröfur eða úttektir eru kláraðar með Agnari — lesa
> `../brunaholf/docs/REIKNINGALOTA.md` (félögin, flæðin, afslættirnir, pósturinn) og opna
> Drög-stöðina `brunaholf.netlify.app/#drogstod`. Sparar að útskýra allt upp á nýtt.

## ⛔ ÞRJÁR REGLUR — lesist fyrst

Agnar eyðir of miklum tíma í að endurtaka sig, staðfesta aftur og biðja um sama
hlutinn oftar en einu sinni. Það er ekki minnisleysi hjá honum. Það er af því að
lotur gleyma, stöðuskjáir ljúga og „búið" er sagt án þess að vera prófað.
Þessar þrjár reglur eru til að stoppa það. Hver þeirra á sér raunverulegt dæmi
frá 28.08.2026.

### 1. Minnisstýribókin — hún les sig sjálf, en þú SKRIFAR í hana

```bash
node tools/minni.cjs                    # stýribókin (git-eintak, 87 ms, án nets)
node tools/minni.cjs solur              # bara það efni
node tools/minni.cjs --leit "payday krafa"   # leit þvert á öll efnin (yfir 200) — þegar þú veist ekki hvað efnið heitir
node tools/minni.cjs --ferskt           # beint úr Supabase
node tools/minni.cjs --skra "<staðreynd>" --topic <efni>
node tools/minni.cjs --skra "<staðreynd um EITT félag>" --topic taeki --scope kunni --kt <kt>   # kúnnaminni (aldrei í git)
node tools/minni.cjs --uppfaera         # endurskrifa docs/MINNISBOK.md + committa
```

**Þessi regla er nú þvinguð, ekki beðin um.** `SessionStart`-hookur í
`.claude/settings.json` keyrir `minni.cjs` sjálfkrafa við upphaf hverrar lotu.
Ástæðan er mæld: þessi regla sagði áður „lestu Charlize ÁÐUR en þú byrjar" með
SQL-fyrirspurn, og lotan 31.08.2026 las hana **ekki** — með CLAUDE.md í samhengi
allan tímann. Hún endurreiknaði í staðinn tölur sem voru þegar til, og fann
tvö mælikerfi sem stönguðust á. Tilmæli duga ekki.

**Tvær hliðar á sama minni:** Supabase (`charlize_knowledge` / `v_charlize_active`,
2.133 virkar staðreyndir 10.11.2026) er sannleikurinn — ritanlegur samstundis úr hvaða
verkfæri sem er. `docs/MINNISBOK.md` er **generuð** og committuð, svo minnið
berst á allar fjórar vélarnar með `git pull` og er læsilegt án nets eða lykla.

Það sem eftir stendur af þér: **skrifa.** Hookurinn les; hann getur ekki vitað
hvað þú lærðir. Í lok lotu — `--skra` og svo `--uppfaera`. *(Skill: `charlize`.
Regla hennar stendur: lestu áður en þú breytir, skrifaðu áður en þú lokar.)*

### 2. `git status` lýgur þangað til þú keyrir `git fetch`

```bash
git fetch origin && git status -sb
```

**Dæmi:** vinnutréð sagðist „in sync" og var 1518 commit og þrjá mánuði á eftir.
Á þeim grunni var næstum ýtt út kóða sem hafði þegar verið leystur af hólmi.
Sama gildir um `claude mcp list` (sýnir ekki claude.ai-tengingar) og
viðbóta-listann (sýnir netþjóna sem verða aldrei auðkenndir). **Enginn stöðuskjár
er sannleikur fyrr en hann er sannreyndur.**

### 3. Ekkert er „búið" án þess að segja HVERNIG það var prófað

Ekki „lagað". Heldur: *hvað var keyrt, hvað kom út.* Sé það óprófað skal það
sagt hreint út.

**Dæmi frá einum degi:**

| Sagt | Raunveruleiki |
|---|---|
| `doc-indexer.js` á main, virkt | hefði hrunið á fyrsta PDF (pdf-parse v2) |
| Tímavera „óvirk" síðan í júlí | scheduled task keyrði á klukkutíma fresti í 6 vikur |
| „Taka úr þjónustu virkar ekki" | virkaði — prófunin svaraði aldrei `Confirm.show` |

Þriðja línan er sérstaklega mikilvæg: **ósannreynd fullyrðing um bilun kostar
alveg jafn mikinn tíma og ósannreynd fullyrðing um lagfæringu.**

---

## ✅ FAST UMBOÐ — það sem þú gerir ÁN þess að spyrja Agnar (16.11.2026)

**Mælt 16.11.2026:** af 1.583 skeytum Agnars í 49 lotum voru um 350 (22 %) aðeins leyfi til að halda áfram.
Sama dag enduðu loturnar á einni vél 19 af 36 umferðum á spurningu („Má ég birta lagfæringuna?" sjö sinnum,
ein lota spurði sömu spurningar þrisvar í röð) og stóðu svo kyrrar. Orð hans um kvöldið: „þarf að fara inn á
hvert session á nokkurra mínútna fresti til að segja halda áfram, því allt er stopp" og „setja allt á
verkefnalista í stað þess að laga það". Hann samþykkti umboðið („Ja hljómar vel") og það var víkkað sama kvöld.

**Gerðu þetta án þess að spyrja:**

1. **Haltu áfram milli skrefa** í verki sem hann bað um. Ekki „á ég að halda áfram?" eða „viltu að ég taki næsta skref?".
2. **Sameinaðu (merge) þína eigin grein** þegar öll próf standast og öryggisnetið sýnir ekkert nýtt rautt frá
   þinni breytingu (berðu saman við hreint `git worktree` — sumt er rautt fyrir).
3. **Birtu það sem hann bað um** — nýja virkni jafnt sem lagfæringu — þegar það er prófað enda á milli („aldrei
   smíðað en óprófað"). `[deploy]` í haus-commit, staðfest með `build.json`. Ekki enda á „Má ég birta?".
4. **Lagaðu villu sem þú finnur** í því sem þú ert að vinna við, ef lagfæringin er afturkræf. Ekki spyrja „á ég
   að laga hana?" og ekki setja hana á Verkefnalistann í staðinn.

**Ekki enda umferð á spurningu sem svarið er augljóst „já" við.** Spurning í lok umferðar (líka í `wrap_up`)
stöðvar lotuna þar til hann kemur aftur, oft klukkustundum síðar og úr síma. Spyrðu aðeins um það sem er á
listanum hér að neðan, eða þegar valið er raunverulega hans og þú getur ekki lesið það úr gögnunum.

**Spyrðu ALLTAF fyrst (óbreytt):** póstur eða SMS út úr húsi · kröfur, reikningar, kredit og annað sem snertir
peninga · eyðing gagna · verðbreytingar · breytingar á borði eða stillingum annarra starfsmanna.

**⛔ VERKEFNALISTAÞAK:** Verkefnalistinn (`verkefnalisti`) er listi AGNARS fyrir hans beiðnir. Lotur og agentar
stofna EKKI verk þar nema hann biðji um það — mest EITT á lotu fyrir það sem er utan verksins og of stórt til
að laga núna. Mælt 16.11: 175 verk biðu, 137 ný á 14 dögum en 21 kláruð. Orð hans: „Ég vil geta sett á
verkefnalista en ekki að ég fái mörg hundruð atriði á verkefnalistann á móti." Það sem þú finnur og lagar ekki fer
í lokasvarið og `charlize_knowledge`. (Þetta kemur í stað gömlu grunnreglu 3 „villa/bug/gat → röð í verkefnalisti".)

**🚰 KRANVÖRNIN ER NÚNA Í GRUNNINUM (21.11.2026, `sql/kranvorn.sql`).** Þakið og tvítekningarvörnin eru ekki
lengur heiðursorð — kveikjur á `thjonustubeidni` og `verkefnalisti` framkvæma þær. Það sem þú þarft að vita:
- **Mál sem er þegar til verður ekki til aftur.** Sami `channel_ref`, sami `ai:lykill` eða sama félag með sama
  erindi opið → þitt mál fer EKKI inn, nóta með öllum þínum texta fer á málið sem er til og tagið
  `kranvorn:maelt:<n>` hækkar. Þriðja mælingin merkir málið `important` + `kranvorn:fyrir-agnar`.
- **Verk á Verkefnalistann** fer aðeins inn sé `category='villa'`, markmið nefnt í `description`, skjámynd á
  verkinu, eða `[AGNAR]`-merkið fremst (Afgreiðslan setur það). Annars fer röðin EKKI inn og textinn bíður í
  `kranvorn_log`. PostgREST skilar þá engri röð — það er ekki villa í kóðanum þínum, það er þakið.
- **Vaktarping** (`created_by` með vakt/audit/cron/sjalfprof) verður mál aðeins ef það snertir peninga,
  kennitölu eða kúnna sem bíður. Annars fer það á `heilsuspjald`.
- **Mál úr pósti eldri en 21 dags** verður ekki til (`app_kv` → `kranvorn.postur_dagar`).
- Maður sem skrifar sjálfur (`created_by` ekki vélarnafn) sleppur ALLTAF inn. Allt er afturkræft:
  `select kranvorn_af()` slekkur, `select kranvorn_a()` kveikir. Vörður: `tools/audit-kranvorn.cjs`.
- Mælt 20.11: ~310 ný mál á 21 degi, 2 frá manni. Stærsti kraninn (`ai-uppfaerslur`, 3–7 „AI-tillaga" á dag
  kl. 06:23) keyrir á ANNARRI VÉL og er ekki í þessu repói — þess vegna er vörnin í grunninum.

**Eftir á:** segðu í einni línu hvað var sameinað eða birt og hvernig það var sannreynt. SAMÞYKKISÞAKIÐ hér að
neðan gildir áfram. Commit og push aðeins þegar prófin sýna „fail 0" (keðjaðu með `if`, ekki `;`).

---

## 👁️ ÓÐINN — fyrst til hans, svo (kannski) til Agnars (16.11.2026)

Agnar réð agentinn `odin` 16.11.2026 sem umsjónarmann samþykkta og Verkefnalistans, og kennir honum regla fyrir
reglu hvernig hann vill að mál séu afgreidd („bit by bit … in the beginning easier obvious samþykktir, then more and more").

**Áður en þú stofnar samþykkismál á Agnar, verk á Verkefnalistann, eða tilkynnir bilun** flettir þú upp í reglubókinni:

```sql
select id, heiti, thegar, adgerd, urskurdur, heimild, thak_kr, agent, skill, skref from odin_reglur where virk order by flokkur, id;
```

- Regla á við og `heimild = 'sjalfur'` → gerðu það sem reglan segir og skráðu úrskurðinn í `odin_urskurdir` (`gert = true`). Ekkert mál á Agnar.
- Regla á við og `heimild = 'leggja_til'` → undirbúðu verkið (Afgreiðsla / „Tilbúin verk") svo Agnar ýti einu sinni. Skráðu úrskurð með `gert = false`.
- Engin regla → þá fyrst mál á Agnar (innan SAMÞYKKISÞAKS), með einni já/nei-línu og spurningunni hvort svarið eigi að verða regla.

**Þegar Agnar segir „Óðinn: …"** er hann að kenna reglu: skráðu hana í `odin_reglur` með orðum hans orðrétt í `heimildarord`
(`heimild = 'leggja_til'` nema hann segi skýrt að Óðinn megi afgreiða sjálfur) og segðu honum í einni línu hvað var skráð.
Heimild `sjalfur` veitir aðeins Agnar. Öll rútínan og mörkin: `.claude/agents/odin.md`.

---

## ⛔ SAMÞYKKISÞAK — áður en þú stofnar mál á Agnar (11.11.2026)

**Mælt 11.11.2026:** síðustu 14 daga stofnuðu Claude-lotur 99 samþykkismál á Þjónustuborðið
(tag `samthykki`, `assigned_to` Agnar), sjálfvirkir verðir 12 í viðbót. Agnar svaraði ENGU þeirra;
146 biðu. Orð hans: „þori ekki að taka mark á neinu í samþykktarborði“ og „AI á að hjálpa mér í
rekstrinum, ekki ég að hlaupa á eftir AI“. Tvær yfirferðir (07.11, 08.11) sýndu að málin voru
flest rétt mæld — vandinn er FJÖLDINN og að flest þeirra eru ekki ákvarðanir sem hann einn getur tekið.

Spurning sem enginn svarar er ekki öryggisnet. Hún felur þær sem skipta máli.

**Þú mátt AÐEINS stofna samþykkismál á Agnar ef allt þetta á við:**
1. Aðgerðin fer út fyrir kerfið eða er óafturkræf: krafa, reikningur, kredit, endurgreiðsla, póstur
   eða svar til kúnna, félag tekið úr eða sett í þjónustu, eyðing gagna.
2. Forsendan er MÆLD sama dag í báðum heimildum (ekki ályktuð) og mælingin stendur í málinu.
3. Ekkert opið mál er til um sama efni (leitaðu á nafni, kennitölu og R-númeri). Sé það til bætirðu
   línu við það mál í stað þess að stofna nýtt.
4. Lotan stofnar mest TVÖ slík mál. Eigirðu fleiri velurðu þau tvö sem varða mesta peninga.

**Allt annað fer EKKI á samþykktarborðið:**
- Kerfisspurning („á X að hegða sér Y?“) → haltu óbreyttri hegðun og skráðu spurninguna á
  verkefnalistann. Spyrðu í spjallinu ef Agnar er við.
- „Á ég að taka saman / prófa / skrifa …?“ → gerðu það eða slepptu því. Tilboð um aukavinnu er
  ekki ákvörðun.
- Afturkræf gagnaleiðrétting með sönnun → verkefnalistinn (`assigned_agent` claude-code), ekki borðið.
- Verk fyrir starfsmann (hringja, finna netfang, bóka skoðun) → verkefnalistinn; mál á starfsmann
  aðeins ef Agnar hefur falið honum slík verk.
- Sjálfvirkir verðir (payday-push, veidi-vaktin, ai-uppfaerslur) uppfæra EITT mál per tegund,
  þeir stofna ekki nýtt mál per tilvik.

Sá sem svarar málum er `samthykktir` (.claude/agents/samthykktir.md). Þakið gildir um að STOFNA þau.

---

## ⭐ FORGANGSMÁL — handvalið á vinnuborð Agnars (11.11.2026)

Agnar 11.11.2026 um niðurstöðu úr yfirferð (samningur undirritaður, fyrsta úttekt ógerð): „þetta eru alveg svona
top priority niðurstöður … myndi vilja bara fá sem Forgangsmál inn á þjónustuborðið mitt … auk svona ný skilaboð,
sem eru mikilvæg, handvalið bara frá Claude“. Einingin **28 Forgangsmál** (368, `forgangsmalHtml` í `bottomHtml`)
á „Agnar · mitt vinnuborð“ les venjuleg Þjónustuborðsmál — engin ný tafla, ekkert sjálfvirkt:

| Hluti | Merki í `thjonustubeidni.tags` | Hvað á heima þar |
|---|---|---|
| Þarf að bregðast við | `forgangsmal` | Niðurstaða sem kostar peninga eða kúnna ef ekkert er gert, og Agnar getur brugðist við með einni aðgerð |
| Ný skilaboð | `skilabod` | Póstur frá manneskju sem bíður svars og skiptir máli (kvörtun, ágreiningur um reikning, stórt tilboð) |

**Uppskrift:** nýtt mál með `assigned_to` 'Agnar', `created_by` 'claude', `summary` = EIN lína um hvers vegna þetta
skiptir máli (hún stendur undir titlinum í einingunni), `notes` = „Hvað þarf að gera“ + „Byggt á (mælt dd.mm.áááá)“
með tölum, `fyrirtaeki_id` sé félag í spilinu. Skilaboð: sé póstmálið þegar til (`channel_ref = 'email:<id>'`) er
merkinu BÆTT VIÐ það mál — ekki stofna tvítak og ekki færa það af Master.

**Þak — þetta er ekki nýtt samþykktarborð:**
1. Mest **7 opin forgangsmál og 5 skilaboð**. Sé fullt tekurðu merkið af því sísta áður en þú bætir við.
2. Aðeins það sem er MÆLT sama dag í gögnunum, með tölunni í málinu. Ekkert „gæti verið“.
3. Ekkert sem annað opið mál segir þegar (leitaðu á nafni, kennitölu og R-númeri).
4. Ekki spurning til Agnars um kerfið og ekki tilboð um aukavinnu. Aðgerðin er hans: bóka, hringja, svara, ákveða.
5. Brunahólfs-pósthólfin opnast ekki í þessu appi (RLS á `email_digest` leyfir aðeins eldklar@ og bokhald@eldklar):
   þá stendur samantektin ein. Starfsmannamál og annað viðkvæmt fer ALDREI á borðið — það sjá allir starfsmenn.
6. Þegar aðgerðin er búin lokar Agnar málinu á línunni (✓ Lokið). Lota sem sér að málið er leyst í gögnunum lokar
   því með sönnun (sama lokunarvenja og annars staðar).

---

## 🧭 HVER KANN HVAÐ — byrjaðu hér

Þekkingin sem áður var í þessu skjali (~15.000 tokens sem hlóðust í **hverri einustu
lotu**) býr núna hjá sérfræðingum í `.claude/agents/`. **Ekkert var fjarlægt** — aðeins
fært, orðrétt. Hver þeirra hleðst AÐEINS þegar hann er kallaður til.

| Spurningin snýst um … | → Sérfræðingur |
|---|---|
| **„Hvar stendur allt?"** — kröfur, póstur, upplýsingareitir, skoðanir, verkefnalistar, samþykktir, tengingar í EINNI keyrslu með þaki frá 07.11.2026 | `node tools/combo-yfirlit.cjs` · `/api/combo-yfirlit` · spjaldið efst á Þjónustuborðinu (499) · mál #1540 |
| **„Hvað á ég að einbeita mér að?"** — **aðalfyrirtækjaráðgjafinn, ráðinn 15.11.2026 með umboð** (markmið: 2× tekjur og 3× hagnaður fyrir nóv. 2027; top 10 á morgnana; 2 mánaða planið í `app_kv` `radgjafinn_aaetlun`), forgangsröðun, betri leiðir, gagnrýni á uppbygginguna (síður, útlit, virkni, verkferla), djarfar hugmyndir. Yfirmaður **Avengers-deildarinnar** (fjórar línur hér fyrir neðan + `endurskodandi`, `logfraedingur`); skrifar líka morgunyfirlit Ráðgjafans á borði Agnars (506 · `netlify/functions/_radgjafinn.cjs`) | `tony-stark` 🦾 |
| **Markmiðslistinn** — síðan Markmið: 51 markmið í 8 flokkum, grunnlína, mælir, skref, viðhengi; mælingar í `markmid_maela` + `YTRA` í `markmid.cjs`, morgunmæling 06:20 | `tony-stark` (kaflinn Markmiðslistinn) |
| Verð keppinauta — hvað aðrir rukka, verðbreytingar, útboð; heldur `competitor_prices`/`service_prices` (Verðsamanburður í hubbnum) ferskum. Aðeins opinberar heimildir | `black-widow` 🕷️ |
| Innkaup — besta innkaupsverð, birgjar, jafngildar vörur, innflutningur frá EES (verð við komu, tollur, VSK, vottun). Leggur til, pantar aldrei | `hawkeye` 🏹 |
| Markaðsmál — Facebook/Instagram-færslur, auglýsingar, efnisdagatal, herferðir, vefsíðutexti. Drög; Agnar birtir | `captain-america` 🛡️ |
| Sala — nýir kúnnar og endurheimt gamalla, Hunter (`#hunter`, `hunter_adilar`), drög að pósti og símtölum. Sendir aldrei | `spider-man` 🕸️ |
| Sölu, reikninga, dkPlus/Payday, afslætti, PDF-vistun, reikninga-póst, úttektartexta | `sala-reikningar` |
| Rukkunarmál beggja félaga — reikningalota, hvað er tilbúið að senda, punktar, póstur, tengingar (les ../brunaholf/docs/REIKNINGALOTA.md sjálfur, stjórnar sala-reikningar / bokari; póstvörðurinn er kafli í rukkari.md) | `rukkari` 🦆 |
| Fylla úttektarskýrslur LIVE, úttektar-texta, verðin, skýrsla↔reikning (tækjafjöldi / vegna / tvær þjónustur), Cowork/MCP-flæðið 🤝 | `sara-coworker` |
| Viðskiptavini, kennitölur, DB-skema, sameiningu, kerfis-kort, póst-merki | `kunnaskra` |
| **Spurt um eitt félag** („hvað vitum við um X", staða, heimilisfang, tæki, skýrsla) — lesa FYRST `fyrirtaeki.review_note`: línan „Sannreynt <dags> (<keyrsla>): …" ber úrskurð yfirferðarinnar (168 raðir „Eftir 2026", 11.11.2026). Ekki mæla aftur nema Agnar biðji eða ný skýrsla/reikningur hafi bæst við | `docs/FACTCHECK-EFTIR-2026.md` + skill `sannreyna-fyrirtaeki` |
| Flipa, borð, nav — Verkborð, Bakendi, Bílstjóri, Aksturslisti, URL-routing, bakk, app-síður | `bord-flettur` |
| **Fyrirtækjaprófíllinn** — hvar hver reitur/takki er, nýi prófíllinn, sjálfgefinn síðan 19.11.2026; `?prof=1` = gamli (patch 500: gluggi, Samskipti, sjö flipar; les DOM gamla prófílsins, skrifar ekkert) | `docs/PROFILL-I-EIGINLEIKAR.md` + `fyrirtaeki` |
| theme.css hönnunarkerfið + per-page skeletons | `thema` |
| AI-aðstoðarmanninn (Customer brief, watchlist, Aðstoðarmiðstöð) | `adstod` |
| Útlit, farsímaskjái, brotna/þrönga skjái, endurhönnun, Brunastál V2 — hönnuðurinn 🃏 | `joker` |
| QR-merki, miðaprentun (Brother PT-P750W), raðnúmer, skannann | `prentun` |
| Kort, Leaflet, mapfix-merkin, geocode/Nominatim, kill-dots | `kort` |
| Ársskoðun-perur, 📅 SOURCE vs FILTER, FULLBÚIÐ, útreikningar, skjöl, öll borð, data-elon, as-built (`docs/RAFKERFI.md`) | `elon-musk` |
| Hvar búnaður á að vera, lög og reglur brunavarna (byggingarreglugerð, neyðarlýsing, eldvarnaeftirlit, hverjir eru skyldugir), byggingarlýsing/skráningartafla, sameign í fjölbýli — reglusafn í `.claude/skills/arnold/references/`. **Yfirmaður Expendables** — sendir á Dolph/Terry/Wesley/Randy þegar tilboð er beðið um | agent+skill `arnold` 💪 |
| **Tilboð í brunaviðvörunarkerfi** — 372 kúnnar, reiknivélin (200), verðlisti, EN 54 | `dolph-lundgren` 🔫 (Arnolds Expendables) |
| **Tilboð í sprinkler / vatnsúðakerfi** — 246 kúnnar, samningur (503), EN 12845, verðlisti (vantar verð) | `terry-crews` 💪 (Arnolds Expendables) |
| **Tilboð í slökkvikerfi eldhús** — 79 kúnnar, EN 16282, Ansul, kæfikerfi (vantar reiknivél) | `wesley-snipes` 🗡️ (Arnolds Expendables) |
| **Teikning → tilboð**, búnaðargreining → sérfræðingur, fjölkerfatilboð, v_stadur_kerfi tækifæri | `randy-couture` 🤼 (Arnolds Expendables) |
| **Texti sem fer úr kerfinu** — póstur, skýrslur, reikningslínur, „vegna", kröfulýsing, svör, SMS: hvaðan, hvaða texti, hvar skráður, reglur Agnars. Númerin SV-01…SV-27 standa í haus hvers sendingarglugga | síðan `#svarstod` (gögn í `js/patches/447a-svarstod-gogn.js`) + `sala-reikningar` |
| **Svör Agnars á Þjónustuborðinu** — „klára svörin", „yfirfara svör", „ég er búinn að svara", „vinna úr Samþykkja", „hvað bíður Claude" 🕵️ | `samthykktir` |
| Sama villumynstur víðar (systkini-kt, röng join, falskt grænt) | skill `villuleit` + `variant-analysis` (+ `natalie` til að mæla, `netvordur` ef vörðuð leið) |
| **Rekstrarfélög** (margir staðir á kt): skýrsla ↔ reikningur ↔ tækjaskrá eftir tölum per tegund, „para eftir magni", tvíræð, vegna-línan, hleðsluspá — Skýrslu-stöð ⚖ + `tools/renna-rekstrarfelag.cjs` | skill `rekstrarfelog-parun` (+ `skjol` í brunaholf) |

Kveikjuorð (copy-paste): [`docs/TRIGGERS.md`](docs/TRIGGERS.md) — `hindra klúður`, `villuleit`, `variant`, `kennitala`, `skýrsla`, `reikningur`, `krafa`, `RLS`, `hraði`, `kort`, `prentun`, … Agentaskrá: [`docs/AGENTASKRA.md`](docs/AGENTASKRA.md).

**Notkun:** kallaðu á sérfræðinginn með Agent-tólinu (`subagent_type`), eða lestu skrána
hans beint þegar þú þarft bara þekkinguna. **Ekki afrita innihald þeirra hingað** — ein
staðreynd á að eiga sér einn stað, annars rekur hún í sundur.


## What this project is

Slökkvitæki ehf is a fire-extinguisher inspection and service company in Iceland.
This codebase is the company's internal web app — equipment tracking, customer
management, jobs, sales (POS), QR labels, accounting overview, and field-service
maps.

- **Live site**: https://slokkvitaeki.netlify.app
- **Owner / sole developer**: Agnar Sigurðsson (aggisigurds@gmail.com)
- **UI language**: Icelandic
- **Primary mobile device**: Samsung S26 (QR scanning, field work)
- **Label printer**: Brother PT-P750W (24mm tape, 100mm cuts)

---

## Stack

- **Hosting**: Netlify. TVÆR deploy-leiðir keyra á hverja ýtingu og birta nú SAMA dist
  (2026-07-30, #524): GitHub Actions (build-dist → netlify-cli) OG Netlify Git-tengingin
  ([build] í netlify.toml keyrir sama build-dist). Deploy-preview á PR-um eru því eins
  og framleiðslan. NB build-dist bundlar ~280 patch-skrár í 6 minified bundle —
  esbuild skrifar broddstafi sem \uXXXX svo grep á bundle þarf python/unicode-escape.
- **Backend**: Supabase (PostgreSQL + Storage + Realtime)
- **Frontend**: Plain HTML/CSS/vanilla JS — no framework, no bundler
- **Map**: Leaflet
- **QR**: jsQR (scan); prent notar qrcodejs o.fl. — ⚠️ þrjú ósamrýmanleg söfn deila
  `window.QRCode`, sjá `prentun`-sérfræðinginn

---

## Credentials

```
NETLIFY_TOKEN  = GitHub Actions secret `NETLIFY_TOKEN` (create at app.netlify.com → User settings → Applications → Personal access tokens). Never commit the value.
NETLIFY_SITE   = d22039b2-75f2-4206-b543-7c6176f2d181

SUPABASE_URL   = https://osfdzskyvisifcwyjkuk.supabase.co
SUPABASE_PROJ  = osfdzskyvisifcwyjkuk
SUPABASE_KEY   = (in /js/config.js as window.SUPABASE_KEY)

DRIVE_BACKUP   = 13qboszs2EtaKZ46CmrNzmmiqaz1KU_be
```

`window.supabase` is the LIBRARY. The client is created via
`window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_KEY)`.
Most code uses the global `DB` object (in `/js/db.js`).

---

## Project state — important context

The codebase was originally built over many Claude.ai sessions where patches
were streamed into the live site through the browser, because the sandbox
couldn't reach api.netlify.com directly. All accumulated patches lived in
**one giant file** (`js/patch-master.js`, ~456 KB), each wrapped:
```
/* === FOO PATCH NAME v1 === */
(() => { ... })();
/* === END FOO PATCH NAME === */
```

That single file has since been **split into `js/patches/*.js`** (one file per
patch block), and the project lives in a GitHub repo (⚠️ PUBLIC — see Setup status) at
`aggisigurds-dev/slokkvitaeki`. Adding new functionality means a new file under
`js/patches/` and a `<script>` tag in `index.html` — no need for the
`/* === NAME === */` wrapper anymore.

---

## Source layout

```
index.html              shell — declares <script> tags + <div id="view-*"> containers
js/config.js            Supabase URL + anon key
js/db.js                DB global, wraps supabase client
js/utils.js             helpers (esc, fmtKr, dates)
js/pos.js               Sala (POS) view + showReceipt() popup
js/mapfix.js            kort-merkin + geocode (js/field.js er EKKI til — sjá `kort`)
js/qrbulkprint.js       Bulk QR sheet printing
js/qrscan.js            Camera QR scanning
js/vidskiptavinir.js    Customers
js/sala.js              Sales list (older — superseded by Bókhalds yfirlit)
js/tekjur.js            Income overview
js/companieslist.js     Company list
js/v9.js                Realtime sync (Supabase channels)
```

---

## Setup status (all done)

- ✅ `js/patch-master.js` split into `js/patches/*.js`
- ✅ `verkdagbok_attachments` table + `verkdagbok-attachments` storage bucket exist in Supabase
- ⚠️ `deploy.js` is DEPRECATED & guarded off — it wipes the serverless functions. Deploy via `git push` → GitHub Actions ONLY (see Deploy workflow)
- ⚠️ GitHub repo `aggisigurds-dev/slokkvitaeki` er **OPINBERT** (mælt 31.10. og 10.11.2026 — `brunaholf` og `kjarni` líka;
  þessi lína sagði „Private" og var röng). Hvort það á að vera private er ákvörðun Agnars (mál #1431). Þangað til:
  engir lyklar, ekkert kúnnaminni (scope `kunni`), engin netföng/símanúmer tengiliða og engar skref-fyrir-skref leiðir að
  óvörðum föllum í skrár, commit-skilaboð eða PR. `tools/minni.cjs --uppfaera` sleppir kúnnaminninu af þessari ástæðu.

---

## Browser automation in Claude Code web/remote sessions (2026-08-10)

A plain `playwright` `chromium.launch()` + `page.goto('https://...')` fails
every time in a Claude Code **web/remote** session (`net::ERR_CONNECTION_RESET`)
— NOT in a local/desktop session, and NOT for curl/fetch, only for a real
Chromium instance. Root cause: Chromium sends a "ECH GREASE" TLS extension on
every ClientHello (anti-ossification measure, on by default, NOT disabled by
`--disable-features=EncryptedClientHello` on the Chromium build in that
environment) and the remote session's egress proxy RSTs the connection when
it sees that extension. **`tools/bh-browser.cjs`** works around it with a
local TLS-splitting relay — full writeup + the "how do I re-diagnose this if
it breaks again" note is in that file's header comment. Use it instead of
calling `playwright` directly whenever a task needs a real rendered page
(screenshots, verifying a UI fix, driving a form) from such a session:

```js
const { launch } = require('./tools/bh-browser.cjs');
const { context, cleanup } = await launch();
const page = await context.newPage();
await page.goto('https://slokkvitaeki.netlify.app');
// ...
await cleanup();
```

`playwright` itself is installed **globally** in that environment, not as a
repo dependency — run with `NODE_PATH=/opt/node22/lib/node_modules node
your-script.js` (the file throws a clear error naming this if it's missing).
The `.cjs` extension is required, not cosmetic — this repo's `package.json`
has `"type": "module"`, so a plain `.js` file here loads through the ESM
loader and its `module.exports` silently doesn't take effect (empty exports,
`launch is not a function` — cost real time to track down once already).

**Uppfært 08.10.2026:** í þeirri lotu HÉKK `bh-browser.cjs` í `launch()` (engin villa, ekkert svar), en
plain Playwright virkaði gegnum egress-proxy-inn: `chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
proxy: { server: process.env.HTTPS_PROXY, bypass: '<IP gámsins>' } })` + `newContext({ ignoreHTTPSErrors: true })`.
Supabase svaraði (401 án lykils = náði í gegn). Tvær gildrur: (1) með `proxy` fer **127.0.0.1/localhost líka um
proxy-inn** (síðan sýnir „agent-proxy relay … HTTPS CONNECT"), svo staðbundni þjónninn (`python3 -m http.server
8787`) er opnaður á IP gámsins (`hostname -I`, t.d. `http://192.0.2.2:8787/`) sem er líka í `bypass`; (2) Netlify
deploy-preview lén skiluðu `ERR_TOO_MANY_RETRIES` — prófaðu staðbundið. Hleruð skrif: `context.route('**/*')` og
`fulfill` á allt sem er ekki GET/HEAD/OPTIONS á supabase.co / `/api/`. Skjáskot náðust aðeins eftir smell inni á
síðunni (ræsihulan `.boot-veil` situr annars yfir öllu í hausalausum vafra).

**Uppfært 12.10.2026:** sama uppsetning gaf `net::ERR_TOO_MANY_RETRIES` á handahófskenndum köllum (bundles, Supabase,
letur) — appið hlóðst hálft. Lausn sem virkaði á lifandi síðu og staðbundið: láta **Node sækja allt** utan gámsins í
`context.route('**/*')` — `const r = await route.fetch({ timeout: 60000 }); return route.fulfill({ response: r });`
(3 tilraunir), en `route.continue()` fyrir `http://<IP gámsins>`. Staðbundið þarf `/.netlify/functions/` og `/api/`
að fara á `https://slokkvitaeki.netlify.app/` með `route.fetch({ url })`. Mæliskriftin (CPU-prófíll, trace með
ógildingarrakningu, kyrrstöðubið) eru í skill `frontend-profiler`.

---

## Deploy workflow — `git push` samstillir, `[deploy]` birtir (4 machines, must stay in sync)

**Regla frá 07.09.2026 (Agnar: „næstum 10$ á dag í viðbótargjöld"):** hvert framleiðslu-
deploy kostar 15 Netlify-krítur (≈ 10 sent). 1.031 deploy á 20 dögum — hver ýting var
deploy — átu 15.465 af 16.636 krítum og keyptu $10 pakka nánast daglega. Þess vegna:

- `git push` samstillir vélarnar fjórar **frjálst** og birtir EKKERT.
- Síðan fer í loftið **aðeins** þegar haus-commit ýtingarinnar ber `[deploy]`, eða með
  morgunkeyrslunni kl. 06:10 UTC (`deploy.yml` schedule) sem deployar aðeins ef live
  `build.json` ≠ HEAD. Handvirkt: „Run workflow" í GitHub Actions.
- **Loka hverju verki með einu [deploy]-commiti** — má vera tómt. Einu sinni í lok lotu,
  ekki eftir hverja litla breytingu:

```bash
git pull origin master      # ALWAYS pull first — never deploy stale code over a teammate's work
# …make changes, test locally (preview_start), commit as often as you like…
git push origin master      # samstillir vélarnar — EKKERT deploy
git commit --allow-empty -m "[deploy] stutt lýsing á því sem fer út" && git push   # birtir
```

**Pre-push vörðurinn er af (Agnar 10.11.2026):** `.githooks/pre-push` byrjar á `exit 0`, svo `git push` keyrir enga verði og þarf ekki
`--no-verify`. Keyrðu `node tools/audit-all.cjs --static` handvirkt þegar þú snertir varðaða leið og segðu frá rauðum vörðum. Ekki kveikja
á hooknum aftur nema Agnar biðji um það.

**Málfræðivörður í build-inu (Agnar 10.11.2026):** `build-dist.js` þáttar hverja staðbundna, klassíska skriftu í `index.html` (`vm.Script`)
áður en búntað er og **fellur (exit 1) á málfræðivillu** — þá birtist ekkert og síðan stendur á síðustu heilu útgáfu. Tilefnið: 10.11.2026
kl. 21:04–21:18 fór `502-verdlistar.js` í loftið með einn sviga vantandi (ókláruð breyting sem auto-sync bar á master) og drap `_bundle-3`
í heild, því esbuild-bilunin er gleypt. Falli build-ið: `node --check <skrá>` á skránni sem villan nefnir, laga, ýta aftur. Neyðarútgangur:
`BUILD_LEYFA_MALFRAEDIVILLU=1`. Vörðurinn nær ekki til module-skrifta né annarra síðna en `index.html` (t.d. `gatt/`).

Auto-sync (`OneDrive/ClaudeMemory/auto-sync-*.ps1`, sameiginlegt öllum vélum) merkir wip-
commit `[skip ci]` nema óýtt `[deploy]`-commit bíði undir því — þá erfir wip-commitið
`[deploy]`. GitHub Actions (`.github/workflows/deploy.yml`) keyrir `build-dist.js` og
birtir static-síðuna **og föllin saman**, atómískt.

⚠️ **NEVER run `node deploy.js`.** It uploads only the *static* files from the
local machine and **silently deletes every serverless function** (`kt-lookup`,
`geocode`, `email-send`, …) — breaking kennitala lookup, maps and email until the
next `git push` rebuilds them — and it overwrites the live site with whatever
stale code that one machine has. (The script is now guarded to refuse to run.)

**Why git-only matters:** this app is edited from 4 machines, each running Claude
Code. If any machine deploys its local folder directly, it clobbers the others'
work and wipes the functions. `git push → CI` is the single source of truth, so
every machine deploys the same committed code, functions included. Pull before
you start; push to deploy.

If CI is down and you MUST deploy by hand, use the SAME command CI uses (never
`deploy.js`) so the functions come along:

```bash
node build-dist.js
npx netlify-cli@latest deploy --prod --dir=dist --functions=netlify/functions --site=d22039b2-75f2-4206-b543-7c6176f2d181
```

---

## Recent deploy history

```
69f5bd79a34637f104f20a88   MAPFIX KILL DOTS v2     (CURRENT)
69f5b41d56ae1ccc93df591f   MAPFIX KILL DOTS v1     (over-aggressive — superseded)
69f4f99dff3bc3e39faf773d   BOKHALDS YFIRLIT v1.1   (row expansion fix)
69f4ef314130b3d8bda5b65d   BOKHALDS YFIRLIT v1
69f4ea278cd86fb58f48bb83   SALA RECEIPT REDESIGN v1
69f4dc728273fd702705854d   VERKDAGBOK ATTACHMENTS v1 (SQL still pending)
69ef660d719f851eb2d2aeca   SAFE REVERT POINT
```

To revert to a previous deploy:
```bash
curl -X POST \
  -H "Authorization: Bearer $NETLIFY_TOKEN" \
  https://api.netlify.com/api/v1/sites/$NETLIFY_SITE/deploys/$DEPLOY_ID/restore
```

---

## Conventions

- **SAMSTILLT MILLI VÉLA — harðkóðuð regla (Agnar 05.09.2026):** fjórar tölvur í sama rými vinna
  saman í sömu gögnum. **Hvert merki, takki, hnappur, textareitur eða upplýsing sem lýsir STÖÐU
  gagna** (krafa send/staðfest/greidd/falin, nótur, drög, körfur, punktar, breytingar á tímum,
  stillingar sem snerta reikninga) **VERÐUR að skrifast á þjóninn** (Supabase-tafla eða
  `AppSettings.save` með sér-lykli eða Supabase-tafla) **og lesast þaðan** — aldrei aðeins í `localStorage`,
  `sessionStorage` eða `state.ui`. `localStorage` er leyfilegt fyrir útlitsval eins vafra
  (sía, röðun, samanbrot, þema, hver er við vélina) og fyrir skyndiminni sem þjónninn
  endurhleður. Dæmi um rétta leið: `krofur_yfirlit_meta` (confirmed/sent/done/hidden/
  paid/note), `invoice_drafts`, `reikningspunktar.karfa`, `app_kv` (`ky_settings`).
  Úttekt á vafra-lyklum: `docs/UTTEKT-VAFRASTADA-20260905.txt` (brunaholf).

  **REGLA 15.10.2026 (Agnar: „ég vill ekki sjá neinstaðar neina slíka stillingu að það virki bara í einhverju
  ákveðnu tæki … regla bannað að það sé slíkt"):** undanþágan hér að ofan um „útlitsval eins vafra" er FALLIN ÚR
  GILDI. Hvert val notandans — sía, röðun, samanbrot, þema, sýn (tafla/spjöld), hamur, kveikt/slökkt, dálkabreidd
  sem hann dregur — fer á þjóninn (AppSettings) og er eins á öllum fimm vélunum; nýjasta valið ræður. Í localStorage
  mega aðeins vera: skyndiminni sem þjónninn endurhleður, tímabundin staða (opinn flipi, bakk, ósend drög, „reynt
  einu sinni"), og „hver er við vélina". Skrif á þjón aðeins við raunverulegan smell — aldrei í lykkju eða vakt.


- **UI language**: Icelandic. Don't translate to English unless asked.
- **Currency formatting**: `1.234 kr` (Icelandic uses period as thousands separator)
- **CSV exports**: UTF-8 BOM, semicolon separator, decimal comma — Icelandic Excel locale
- **VAT**: Default 24%. Some items 11% (food, books).
- **BRUNASTÁL C — hönnunarkerfið ræður öllum útlitsbreytingum (Agnar 24.09.2026).** Hönnunarkerfið er
  https://claude.ai/artifact/MfY6rBkwqEkKaSrJd6TKKj (Miðakerfi — Brunastál). Áður en síða, spjald, tafla eða
  reitur er teiknaður eða breytt: lestu `project/README.md`, kaflann `project/brunastal-c.md` og kortið
  `project/components/Stalspjald/README.md` úr kerfinu (Artifact read með path) og notaðu táknin þaðan — málmhaus
  með hnoðum, stálplata, reitir (.line/.reitur), plötur, silfur/málm/rautt takkar, tafla C, Playfair-tala í haus.
  Ekkert nýtt útlit, engir bláir takkar, engin emoji. Reglurnar sjö um hopp í kaflanum „Stöðugt viðmót" þar
  gilda um hverja breytingu og eru mældar (layout-shift + rammi fyrir ramma í Playwright 1600 px) áður en sagt er
  „búið". Þegar nýr hlutur verður til í þessu útliti fer hann líka inn í kerfið (kafli, kort, tákn) í sömu lotu —
  ein skrá í hverju publish-kalli, indexið síðast.
- **STÖÐUGT VIÐMÓT — regla frá 23.09.2026** (Agnar: „hindra hopp þegar maður er að ýta á eitthvað eða stimpla inn"):
  teiknir þú lista með `rot.innerHTML = …` þá HVERFUR allt sem hékk í gamla trénu — skrunstaðan (líka lárétta skrunið
  á síma), fókusinn í reitnum sem verið er að skrifa í og textavalið. Notaðu hjálparann `js/patches/388-stodugt-vidmot.js`:

  ```js
  const aftur = (window.Stodugt && Stodugt.vernda) ? Stodugt.vernda(rot) : null;
  rot.innerHTML = …;
  if (aftur) aftur();   // strax á eftir, í SAMA tifi — engin millistaða sést
  ```

  Fernt til viðbótar undir sömu reglu:
  1. **Endurteikning má aldrei kippa reitnum undan þeim sem er að skrifa.** Bíddu með hana þar til `focusout` kemur
     (`erAdSkrifa()` + `teiknaEftirInnslatt()` í 153).
  2. **Ástand sem lifir aðeins í DOM-inu tapast** við hverja teikningu — t.d. hvaða kort eru opin. Geymdu það í breytu,
     ekki í klasa á hnút (`_opin` í 175).
  3. **Þegar gögn lenda: uppfærðu hnútinn sem breyttist** (`innerHTML` á SAMA `<td>`) í stað þess að rífa hann út og
     byggja aftur. Hnútur sem hverfur og birtist aftur ER blikkið sem sést (`endurbyggjaArsreiti()` í 187 — þar fóru
     201 reitir út og inn við hverja opnun). Sé mörgum hleðslurum lokið á víxl, dragðu endurbygginguna saman í eina.
  4. **TVEIR PAPPAR MEGA ALDREI EIGA SAMA HNÚTINN.** Uppröðunar-pappi sem *ættleiðir* hnút frá öðrum (403 tekur
     `._dpb-company` inn í Skjöl-spjaldið) fer í reiptog við þann sem *staðsetur* hann (311), því hvor um sig les hina
     staðsetninguna sem „ranga" og færir hnútinn til baka — og hver færsla vekur hina vaktina. Mælt á fyrirtæki 202
     23.09.2026: 11 færslur fram og til baka á 6 sekúndum, síðan komst aldrei í kyrrstöðu. **Þetta gerðist TVISVAR í
     sama falli** (`placeCompanySection`, 18.09 og 23.09), svo reglan er skrifuð hér: sá sem staðsetur verður að
     viðurkenna ættleiðinguna sem gildan stað (`if (sec.closest('._dyg-section')) return;`) — prófaðu á ÆTTINNI, ekki
     á klasa ættleiðandans, svo næsta uppröðun erfi vörnina. Almennt: *snertu DOM aðeins þegar hnúturinn er
     raunverulega á röngum stað,* og teldu ættleiðingu ekki ranga.

     **Og seinni helmingurinn, sem beit mig samdægurs:** ættleiddur hnútur er ekki lengur beinn afkomandi.
     Vakt sem hlustar á `{ childList: true }` án `subtree` sér þá EKKI þegar hann deyr — hann hverfur inni í
     spjaldinu sem var endurteiknað, engin bein barnabreyting verður, og hnúturinn kemur aldrei aftur
     (mælt: enginn `._dpb-company` eftir 20 sek á fullteiknuðum prófíl). Færir þú hnút dýpra í tréð verður
     endurlífgun hans að hvíla á einhverju sem sér þangað: öryggispúls sem er ódýr í kyrrstöðu (`mountCompany`
     hættir strax sé hnúturinn réttur) — ekki á vaktinni sem hætti að ná til hans.

  5. **Hluti sem tekur pláss efst á prófílnum teiknast í SAMA tifi og borðinn** — ekki á eigin `setInterval`/vakt.
     Mælt 12.10.2026 (13 félög): húsmynd (367), upplýsingalínur (363/432), Samskipti (286) komu hver á sínu tifi
     0,3–2,3 s eftir opnun og ýttu öllu niður (CLS 0,12–0,25). `462-stodug-opnun.js` kallar þá alla strax (óinngjafin
     vakt á `#companies-main`) → CLS 0,001–0,01. Nýr slíkur hluti fer í `SKREF`-listann þar; gögn sem berast síðar fá
     „Sæki…"-staðgengil í SÖMU stærð og svarið (sjá 363 `_bupp-teikn-saekir`, 432 Hús-línuna, 286 beinagrindina).
     ATH: klasaheiti með `-bidur` verður gullpilla (230 `[class*="-bidur"]`).

  Og **samtíma hleðslur eiga að deila EINNI sókn** (`_loadP`-mynstrið í 153 `loadAll()` og `features.js Companies.load()`)
  — annars sækja fjórir kallarar sama mengið og síðasta svarið yfirskrifar hin.

- **Patch wrapping**: When adding new patches as separate files, NO need for the
  `/* === NAME === */` wrapper convention anymore — that was only needed for the
  old single-file approach.

---

## Related projects (in case Agnar mentions them)

- **Brunahólf** — MÓÐURFÉLAGIÐ (Brunahólf ehf á Slökkvitæki ehf — Agnar
  2026-07-30), separate ecosystem (Google Sheets + Apps Script + Tímavera +
  Ajour). Hub-inn brunaholf.netlify.app er stjórnstöðin/bakendinn með dýpri
  tólum um Slökkvitæki líka. See COWORK-brunaholf.md if relevant.
- **Slökkvitæki app** — this project. Pure code, lives on Netlify + Supabase.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).

## Cursor Cloud specific instructions

Cloud Agents see this repo at `/agent/repos/slokkvitaeki`. Open that folder. Daily work is one repo per window; the 8-root workspace is only when the task crosses repos.

**Verkefnalisti** still applies: `GET https://brunaholf.netlify.app/api/verkefnalisti` (beidni/i_vinnu) before starting new work.

**Charlize** still applies: read `v_charlize_active` (scope `kerfi`/`baedi`/`slokkvitaeki`) before changing DB, deploy, or Drive.

**Screenshots / browser:** use Cursor Playwright MCP or computer use. `tools/bh-browser.cjs` is a Claude Code remote-egress workaround (see `brunaholf/docs/BROWSER-MCP-SETUP.md`). Do not use bh-browser unless Playwright fails.

Never read `index.html`, large `js/patches/*`, `js/pos.js`, `dist/`, or `graphify-out/` whole. Grep first, then Read with offset/limit.

Start with `git fetch origin && git status -sb`. Never run `node deploy.js`. Run `node tools/audit-all.cjs` before every push. Read `docs/ORYGGISNET.md` first; route guarded paths (invoice OUT `10`/`233`/`254`, kennitala `121`/`pos.js`, `payday-push`, readiness `153`/`187`) through `netvordur`.

The 4-machine deploy rule still holds: pull the default branch first, push to deploy. Cursor Cloud is another machine. Same rule.

## Innskráning lotunnar — notaðu aðganginn „Lota (Claude)“, uid 10 (18.11.2026)

**Þetta er standandi heimild frá Agnari og þú þarft ekki að spyrja hann aftur.** Hans orð 18.11.2026:
„já ég vill að claude geti unnið við kerfið sem það er að byggja … annars er þetta bara blind bygging
og bara 100 % líkur á mistökum og tjóni.“ Og 17.11: „ef ég er að vinna gegnum símann, þá kemst ég
ekkert inn á browserinn hjá sessions.“ **Biddu hann ALDREI að skrá sig inn í vafra lotunnar.**

Hver Claude-lota hefur sinn eigin vafra og sínar eigin kökur, svo lotan skráir sig inn SJÁLF.
Til þess er sérstakur aðgangur: **uid 10, „Lota (Claude)“, hlutverk Admin** (Agnar hækkaði hann
18.11.2026 svo lotur kæmust líka í borðsins eigin föll) — ekki manneskja, ekki Agnar, og hann má
slökkva hvenær sem er með `update hub_adgangar set virkur=false where id=10`.

```sql
select kaka, notandi, rola, rennur_ut from innri.lotu_koku(10, 2);   -- uid 10 = Lota (Claude), 2 klst.
```

**ALDREI mynta uid 1.** Það er Agnar sjálfur: lota sem ber þá köku kemur fram sem hann, aðgerðir
skrást á hans nafn og hún fær Admin-réttindi sem hún á ekki að hafa. Notaðu uid 10.
Veldu stuttan gildistíma (1–2 klst.), ekki 12.

**Sama kaka gildir á BÁÐUM vefjum** (slokkvitaeki og brunaholf staðfesta hana bæði gegn
`hub_adgangar_stilling.session_secret`).

Í vafra lotunnar: opnaðu fyrst slóð á réttu léni (t.d. `/innskraning.html`), settu svo kökuna og
endurhlaðið:

```js
document.cookie = 'hub_user=<kaka>; path=/; max-age=7200; samesite=lax';
location.replace('/');
```

Úr skel eða `fetch`: hausinn `Cookie: hub_user=<kaka>`.

**ALDREI:** skrifa kökuna eða `session_secret` í skrá, commit, annál, skjáskot eða svar til Agnars.
Myntaðu nýja þegar þarf í stað þess að geyma hana. Skemað `innri` er ekki opið PostgREST, svo fallið
næst hvorki með publishable-lykli né RPC.

**Mælt 18.11.2026 kl. 09:30 með uid-10 kökunni** (án kökunnar → með henni):

| Slóð | Niðurstaða |
|---|---|
| BH `/api/odin` | 401 → **200** |
| SL `/api/bh-toki` | 401 → **200** |
| SL og BH síður (`/`, `/afgreidsla.html`) | 200 → 200 (síðurnar sjálfar eru opnar; hliðin eru í API-unum) |
| SL `/api/afgreidsla`, SL `/api/tekjur-beint` | 401 → **200** (Admin-föll, opnast eftir hækkunina) |

**Admin fylgir ábyrgð, ekki nýtt leyfi.** Aðgangurinn er til þess að lotan geti SÉÐ og PRÓFAÐ það sem
hún smíðar. Allar venjulegu reglurnar standa óbreyttar og Admin-kakan víkur þeim ekki til hliðar:
ekkert fer út úr húsi (póstur, SMS, krafa, reikningur, kredit, Payday-sending, hlekkur til kúnna),
engu er eytt, engin fyrirtæki sameinuð, engri kennitölu né verði breytt, og borð annarra starfsmanna
eru ósnert. Allt slíkt endar sem drög eða tilbúið verk sem Agnar ýtir á — nákvæmlega eins og áður.
Aðgerðir skrást á „Lota (Claude)“, svo þær eru rekjanlegar og aðskildar frá Agnari sjálfum.
