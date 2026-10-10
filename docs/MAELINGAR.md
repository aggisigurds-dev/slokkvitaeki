# MÆLINGAR — gildrurnar sem láta mælitækið ljúga

> Agnar 05.10.2026: „skoða þessi mælitæki líka."
>
> Þetta skjal er ekki um kóðann. Það er um **tækin sem segja okkur hvort kóðinn sé
> bilaður**. Á einni nóttu lugu þau þrisvar — í bæði áttir: sögðu bilun þar sem engin
> var, og sögðu „í lagi" þar sem raunverulegt gagnatap beið. Ósannreynd fullyrðing um
> bilun kostar jafn mikinn tíma og ósannreynd fullyrðing um lagfæringu
> (CLAUDE.md, regla 3).
>
> Hver gildra hér er **mæld**, með dagsetningu og því sem hún kostaði.

---

## 1. Fastur biðtími í stað kyrrstöðu

**05.10.2026.** Ég hermdi eftir því að merkistala á földum flipa breyttist, beið
**1.200 ms**, las `style.display` og fékk `"none"` — ályktun: *flipinn helst falinn,
engin bilun*. Ég var næstum búinn að afskrifa málið.

Með **3.000 ms** varð niðurstaðan `""` — **flipinn kom aftur í ljós**. Endurröðunin
hafði einfaldlega ekki keyrt innan 1,2 sek.

**Reglan:** bíddu eftir **kyrrstöðu**, ekki eftir klukku. Mældu þar til ekkert
hreyfist (engar DOM-breytingar og engin netköll í N ms) eða þar til þak næst — og
segðu hvort heldur varð. Sé fastur biðtími óhjákvæmilegur skal hann vera margfalt
lengri en versta tilvik, og talan nefnd í niðurstöðunni.

## 2. Tilbúinn atburður er ekki raunverulegur atburður

**05.10.2026.** Til að sanna að verð tapaðist við lokun sendi ég
`new PageTransitionEvent('pagehide')`. **Gamli kóðinn vistaði samt** — því tilbúinn
atburður afhleður ekki síðuna, svo 900 ms tímamælirinn fékk að renna eins og ekkert
væri. Prófið sagði „engin bilun".

`location.href = …` (raunveruleg afhleðsla) sýndi tapið strax: slegið inn 3333,
þjónninn stóð eftir í 5555.

**Reglan:** tilbúinn atburður prófar AÐEINS að meðhöndlarinn keyri. Til að prófa að
eitthvað lifi af lokun þarf **raunverulega afhleðslu**. Sama gildir um `beforeunload`,
`unload` og bfcache.

## 3. Normalísering sem étur einmitt það sem greinir að

**05.10.2026.** Ég hópaði 97 netköll eftir slóð **en stytti `select=` út** svo listinn
yrði læsilegur. Niðurstaðan leit út eins og alvarleg bilun: fjögur byte-eins köll á
sömu millisekúndu, þrisvar. Ég sagði það upphátt sem „skýrt mynstur".

Með fullri slóð voru byte-eins tvítekningar **2 af 97**, báðar góðkynja. Mynstrið var
dálkasundrun — allt annað vandamál með allt aðra lausn.

**Reglan:** mældu á hráa lyklinum fyrst; styttu AÐEINS til birtingar, eftir að talan
er fundin. Sé stytt tala notuð í fullyrðingu skal segja hverju var sleppt.

## 4. Tómt svar er ekki staðreynd

**05.10.2026.** Ég las `app_problems` úr vafranum til að sanna að sían virkaði: tómt.
Rétt ályktun virtist blasa við. En taflan er RLS-læst fyrir anon-lestur — **færslan
var þarna**, sem sást um leið og ég las þjónsmegin.

**Reglan:** mældu báðar hliðar. Tómt svar getur þýtt „ekkert til", „ég má ekki sjá
það" eða „ég spurði vitlaust". Sjá `feedback_tomt_svar_er_ekki_stadreynd`.

## 5. Falið vafraspjald hemlar tímamæla og rAF

Chrome hægir á `setTimeout`/`setInterval` og frystir `requestAnimationFrame` í földum
spjöldum. Mæling á pollun eða hreyfingu í földum glugga gefur falskt „ekkert gerist".

**Reglan:** flettu spjaldinu fram (`tabs_select`) áður en tímaháð hegðun er mæld, og
segðu í niðurstöðunni að það hafi verið gert. 05.10 mældi ég kyrrstöðu-pollun og
fletti fram FYRST — þess vegna er „núll köll á 30 sek" marktækt.

## 6. Nafnaleit í minnkuðum búnti sannar ekkert

**05.10.2026.** Til að staðfesta að lagfæring væri komin í loftið leitaði ég að
`skolaBkcVidLokun` í `_bundle-*.js`: **0 fundir**. Kóðinn VAR þó birtur — esbuild
endurnefnir staðbundin föll.

**Reglan:** staðfestu birtingu með **hegðun**, ekki nafni. Leitaðu að strengjum sem
lifa minnkun af (textar, auðkenni, `keepalive:!0`) eða keyrðu raunverulegt próf.

## 7. Gamalt `?v=` mælir gamlan kóða

Hefur bitið þrisvar. Breyting sem er „prófuð" án þess að merkið sé hækkað mælir
útgáfuna á undan. Vörður: `audit-utgafumerki.cjs`.

**Reglan:** hækkaðu merkið ÁÐUR en þú mælir, og staðfestu í mælingunni sjálfri hvaða
útgáfa svaraði (`build.json`, eða `?v=` í auðlindalistanum).

## 8. Vörður á SKRÁ er ekki vörður á ATRIÐI

**05.10.2026.** `audit-vistun-utskolun` spyr hvort skráin tefji skrif og hafi
*einhverja* útskolun. Papp 274 hafði `pagehide` fyrir nótuna → **grænt**, meðan tveir
af þrem töfnum vistörum gátu tapað vinnu. Vörðurinn hafði verið of ÞRÖNGUR 09.09; nú
var hann of grófur.

**Reglan:** veldu mælieininguna sem svarar spurningunni. Spurningin var „tapast
innsláttur?" — þá er einingin hver tafin vistun, ekki hver skrá.

## 9. Sía mælitækisins getur falið raunverulegar bilanir

**05.10.2026.** `audit-vistun-timarar` sagði *16 tímamælar, allir varðir*. Ein tala,
ekkert til að skoða. Þegar ég lét hann **telja upp hvað hann dæmdi og hverju hann
sleppti** (`--listi`) kom í ljós að hann flokkaði minnisblokkina og nótu verkspjaldsins
sem „bendilhandtök" — af því hlustarinn var nefnt fall og ég las aðeins innfelldan
líkama.

Eftir lagfæringu: **22 tímamælar**, og þar af **tveir raunverulega óvarðir** sem fyrri
útgáfan hafði falið — Stílstjórinn og **sjálfvistun brunakerfis-skýrslunnar** (2,5 s).

**Reglan:** hvert mælitæki skal geta sýnt **hvað það sá og hverju það sleppti, með
ástæðu**. Tala án lista er ekki mæling, hún er fullyrðing. Og: berðu nýtt mælitæki
saman við óháða talningu — tveir mælikvarðar sem stangast á segja að annar ljúgi.

## 10. Vörður sem gelgir að ósekju verður þaggaður

Úr haus `audit-vistun-utskolun` (09.09.2026) og staðfest aftur 05.10: fyrsta útgáfa
`audit-vistun-timarar` flaggaði leitar-tímamæla, því `/api/kt-lookup` taldist skrif og
`likami()` mislas örvarfall án slaufusviga. Rauður vörður sem hefur rangt fyrir sér er
verri en enginn — hann er slökktur og þá sést ekkert.

**Reglan:** neikvætt prófaðu hvern vörð í BÁÐAR áttir áður en hann er treystur: rauður
á biluðu ástandi, grænn á lagfærðu. Gerðu það með því að bakfæra raunverulegu
lagfæringuna, ekki með tilbúnu dæmi.

## 11. Staðfesting á útskrift í stað stöðu

**08.10.2026.** Ég ýtti breytingu með endurtekningarlykkju sem dæmdi þannig:

```bash
if git push origin master 2>&1 | tail -1 | grep -qv rejected; then echo YTT; break; fi
```

Hún prentaði **YTT**. Ýtingin hafði ekki heppnast: `git status -sb` sagði
`[ahead 3]` og `origin/master` bar ekki breytinguna. Skilyrðið er satt hvenær sem
síðasta línan er *eitthvað annað* en „rejected" — þar með talið „Everything
up-to-date", villuboð, eða lína úr pre-push netinu. Ég hélt áfram í þeirri trú að
verkið væri komið út.

**Reglan:** staðfestu á ÁSTANDINU, ekki á textanum sem skipunin prentaði.
Eftir ýtingu: `git fetch && git status -sb` (á að vera án `ahead`/`behind`) og
`git diff origin/master --quiet -- <skrár>`. Sama gildir víðar — `grep` á útskrift
svarar „stóð þetta orð þarna", ekki „tókst aðgerðin".

## 12. „Fyrsta sem fannst" er ekki mæling

**06.10.2026.** Greiningin á rekstrarfélögum tók **fyrstu** sögufærsluna fyrir hvert
(félag, ár). Sagan undir Grjóthálsi geymdi fjórar færslur fyrir 2026 — frá öllum fimm
stöðum Aðalskoðunar — og sú fyrsta var Hjallahraun. Þá leit út fyrir að Grjótháls og
Hjallahraun ættu sömu tölur (tvíræð) og að reikningur R-106443 „vegna Gjótháls"
stangaðist á við skýrsluna. PDF-ið sjálft sagði nákvæmlega reikninginn.

**Reglan:** þegar lykill getur átt fleiri en eina röð, **teldu þær** áður en þú velur,
og veldu á sönnun (skjal lesið, staður nefndur), ekki á röð. Prentaðu hvað var valið og
hverju var sleppt (sjá 9). Mælt í heild: 119 félag+ár með fleiri en eina sögufærslu.

## 13. Útskrift skipunar sem lítur út eins og gildi

**06.10.2026.** `netlify env:get VEL_HEARTBEAT_TOKEN --site …` keyrt úr rangri möppu
prentaði villutexta („No project linked …", 73 stafir með bilum). Skriftan tók síðustu
línuna sem lykilinn og skrifaði hana í `.env`. Hjartslátturinn hélt áfram að svara 401 —
nú með „réttu" .env-skránni, sem var verra en engin.

**Reglan:** gildi sem kemur úr skipun er **mælt** áður en það er notað: lengd, bil, snið
(lykill hefur engin bil, engin orð). Og keyrðu CLI-ið þar sem það á heima (brunaholf-mappan
er tengd síðunni). Sjá 11 — sama fjölskylda: textinn er ekki ástandið.

## 14. Mældu á textanum sem fallið sér

**06.10.2026.** Regexinn `hjá fyrirtækinu (…)` fann aldrei línuna í úttektarskýrslu.
Drive-MCP sýndi textann fallega á einni línu; pdf-parse (sem fallið notar) skilar
„hjá \nfyrirtækinu Steypustöðin Borgarnesi kt:… \n" — línuskil á undan OG eftir orðinu.
Tvær útsendingar fóru út áður en ég las pdf-parse-textann sjálfan.

**Reglan:** prófaðu útdráttinn á **sama hráefni og framleiðslukóðinn fær** (sama safn,
sama útgáfa, sömu bæti), ekki á öðru tóli sem sýnir sama skjal. Sæktu skrána, keyrðu
sama parser, skoðaðu `JSON.stringify(texti.slice(…))`.

## 15. Biðröð sem tæmist á 20 s fresti

**05.10.2026.** Endursköpun á því hvernig gamalt eintak yfirskrifaði `app_profiles_json`
„fann ekkert" — vistunin fer í biðröð (`saveVordud`) sem tæmist á 20 sekúndna fresti og
við `pagehide`. Prófunin lokaði síðunni eftir 15 s og sá aldrei skrifin.

**Reglan:** sé ferli með biðröð/tímamæli, bíddu **lengur en lotuna** (hér ≥ 46 s) eða
knýðu fram tæminguna (`pagehide`) — og staðfestu á þjóninum (`audit_vernd`), ekki í
vafranum. Afbrigði af 1: kyrrstaðan verður að ná yfir alla lotu biðraðarinnar.

---

## Gátlisti áður en sagt er „mælt"

1. Hvaða útgáfa svaraði? (`build.json` / `?v=`)
2. Beið ég eftir kyrrstöðu eða klukku?
3. Var spjaldið fremst ef tími skiptir máli?
4. Er tómt svar örugglega „ekkert til" — mældi ég hina hliðina?
5. Normalíseraði ég burt það sem greinir að?
6. Prófaði ég raunverulega aðgerð eða hermdi ég eftir henni?
7. Get ég sýnt hvað tækið sá OG hverju það sleppti?
8. Fékk ég sömu niðurstöðu með óháðri aðferð?
9. Staðfesti ég á ástandinu — eða bara á því sem skipunin prentaði?
10. Gat lykillinn átt fleiri en eina röð — taldi ég þær, eða tók ég þá fyrstu?
11. Prófaði ég útdráttinn á sama hráefni og framleiðslukóðinn fær?
12. Nær biðin yfir heila lotu biðraðarinnar / tímamælisins?
