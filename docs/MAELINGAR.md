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
