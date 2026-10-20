# Verkhringrás Arnolds — Búnaðargreining gerð af kerfinu sjálfu

*Agnar 21.10.2026: „reyna gera kerfinu kleift að geta gert þetta sjálft, með einhvernskonar verkhringrás" og „turbo takka sem setur bara
allt heildar ferlið í gang".* Þessi skrá er forskriftin: hvaða Claude-lota sem er (tímasett verk **arnold-vaktin**, Agnar sjálfur eða vél á
bridge) getur tekið verk úr biðröð og skilað fullbúinni Búnaðargreiningu — greining vistuð, PDF í Viðhengi, sýnileg í Þjónustugátt.

## Hringrásin

```
Turbo-takki (474 í appinu) ─┐
bgr_verk.cjs bida <cid> ────┴→ bunadargreining_verk (status bida)
                                   │  naest            (bida → i_vinnslu, atómískt)
                                   ▼
 1 UNDIRBÚA   undirbua <id>   blöð úr teikning_bord sótt, vigur/skönnun flokkað, GRIDDED nærmyndir (h*_*.png) + yfirlit
 2 LESA       þú (vision)     skönnun: lestu nærmyndirnar → lestur.json   ·   vigur: `vigur <id>` (textalag) → frambjóðendur
 3 SANNREYNA  yfirlag <id>    sann_h*_*.png — hver hringur á tákni, ekkert tákn án hrings → leiðrétta lestur.json
 4 VISTA      vista <id>      bunadargreining-röð (UTF-8, auðkenni, texti, teikningar); virk röð fyrir fer í sögu (aldrei eytt)
 5 SKÝRSLA    skyrsla <id>    2 PDF (ein síða · hver hæð á sér blaði), 1,3 MB hvor, í Viðhengi félagsins
 6 LOKA       loka <id> "<yfirlit>"   (villa <id> "<ástæða>" ef þú getur ekki klárað — aldrei þegja um það)
```

Allar skipanir: `node .claude/skills/arnold/scripts/bunadargreining/verk/bgr_verk.cjs <skipun>` (úr rót repósins). Framvinda hvers
stigs er skrifuð í `bunadargreining_verk.framvinda` og **sést á Turbo-takkanum** — notaðu `stig <id> <stig> "<texti>"` þegar þú ferð milli
stiga (undirbuningur · lestur · sannreyning · vistun · skyrsla).

Forsendur: Node, Python með `pymupdf` + `Pillow` (`python -m pip install --user pymupdf pillow`), Playwright úr
`C:/Users/Slokkvitaeki/luna-bridge/node_modules` (PDF-gerðin keyrir appið sjálft á lifandi síðu). Vinnumappa:
`%USERPROFILE%\bgr-verk\<id>\`. Engin lyklameðhöndlun — skriptan les anon-lykilinn úr `js/config.js` eins og appið.

## Lestur — kjarni aðferðarinnar (hvernig 35 tákn á 4 hæðum urðu rétt)

1. **Rammahnit.** Allt sem þú skrifar er í *rammadílum blaðsins* (6006 á lengri hlið — sömu hnit og Teikning geymir). Nærmyndirnar hafa
   appelsínugular gridlínur á 200 díla fresti með hnitum í rauðu (`3600`, `1800` …). Hnit tákns = næsta gridlína + færsla innan reits.
   Staðfest: x0/y0 efsta-vinstra horns nærmyndar = `skurdur.x/y` borðsins (eða + k·(breidd−60) fyrir næstu nærmynd) — ef ekki, er eitthvað rangt.
2. **Skýringin ræður.** Lestu fyrst `h*_yfirlit.png` OG heildarmynd blaðsins (`<blað>.jpg` smækkuð með PIL `thumbnail((1800,1800))`) til að finna
   *skýringar og byggingarlýsingu* — þar stendur hvað ÚT / SL / BS / R þýða. Sami stafur getur þýtt ólíkt (Suðurhella: [S] = slökkvitæki,
   Trönuhraun: segulloki). Vanti skýringu: segðu það í `athugasemdir` („R-tákn túlkuð sem reykskynjarar — skýring vantar").
3. **Hvað er skráð:** `ut` (ÚT-kassi — útljós/neyðarlýsing, líka þeir sem standa við björgunarop BO), `sl` (handslökkvitæki: SL/SLT/HSL/HST),
   `bs` (brunaslanga/-kefli: BS/BRSL), `r` (reykskynjari), `hiti`, `hb` (handboði), `st` („!“ stjórnstöð/útstöð). **Ekki** skráð: björgunarop (BO)
   sjálf, EI-merki, flóttaleiðaörvar (Agnar: „björgunarop þarf ekki").
4. **Skannanir:** sniðmátsþáttun er hávær — lestu með augunum, nærmynd fyrir nærmynd, og skráðu *miðju* tákns. Tákn á skörun tveggja nærmynda
   skráist **einu sinni**. Teldu í lokin (yfirlagið telur fyrir þig) og berðu saman við yfirlitsmyndina.
5. **Vigur-PDF (textalag):** `vigur <id>` gefur frambjóðendur (`vigur_tokn.json`, `texti_<blað>.txt` með ÖLLUM textanum í lestrarröð —
   byggingarlýsing og skýringar) og `sann_vigur_h*.png`. Þú ræður samt merkingunni af skýringunni. Textalagið er stundum dulkóðað/tómt
   (Skútuvogur 2022) → þá er blaðið skönnun og `crops.py` flokkar það sem slíkt (`tegund`).
6. **Sannreyning er skylda:** `yfirlag <id>` og SKOÐAÐU myndirnar. Hver hringur á að sitja á tákni, ekkert tákn má vera án hrings. Aldrei „vista"
   án þessa — falskar tölur í brunavörnum eru verri en engar.

## lestur.json (skrifaðu með Write-tólinu — UTF-8; aldrei Python `open(f,'w')` án `encoding='utf-8'`, það skemmdi íslenska stafi 20.10.2026)

```json
{
 "company_id": 1484, "landnr": 101361, "heimilisfang": "Laugavegur 1, 101 Reykjavík (bakhús)",
 "stada": "tillaga", "af": "Claude (Arnold) — verkhringrás: …", "heimild_stutt": "Aðaluppdráttur 1.02 (08.09.2015) …",
 "blad_heiti": { "1. hæð": "aðaluppdráttur 1.02 (2015)" },
 "nytt": false,
 "items": [ {"haed": "1. hæð", "kind": "ut|sl|bs|r|hiti|hb|st", "x": 1065, "y": 804, "stadur": "Gistirými 3 — hurð", "tegund": "(valfrjálst)"} ],
 "texti": [ {"mhl": "04", "titill": "Brunamál — …", "heimild": "Skýringar á aðaluppdrætti …", "kaflar": [ {"fyrirsogn": "Stigar", "texti": "…", "lykill": true} ]} ],
 "heimildir": [ {"titill": "Aðaluppdráttur 1.02 — …", "dags": "2015-09-08", "slod": "<fotoweb .info slóð>", "gildir": true, "athugasemd": "…"} ],
 "athugasemdir": [ "innra: …" ]
}
```

* `haed` = nafn hæðar á Teikningu (`manifest.json`). `nytt:true` (Nýtt-merki á Teikningu) **aðeins** ef engin tæki eru skráð á staðinn
  (`skrad_taeki: 0` í manifest) — annars tvítalning. Sjálfgefið `false`: greining án þess að snerta Teikningu.
* **`texti` og `heimildir` sjást KÚNNANUM í Þjónustugátt** (`gatt/bunadargreining.js`): aðeins staðreyndir úr byggingarlýsingu/skýringum,
  orðrétt eða stytt — engin verð, engin gagnrýni, engin innri skýring. `athugasemdir` eru innri (ósamræmi við tækjaskrá, óstaðfest atriði,
  „skýring vantar") og fara aldrei út. Heimildir með dagsetningu í ISO-sniði (birt sem DD/MM/YYYY).
* `kind` → `bunadur` (fast): sl Handslökkvitæki · bs Brunaslanga / slöngukefli · ut Útgangur (ÚT-merki) · r Reykskynjari · hiti Hitaskynjari ·
  hb Handboði · st Stjórnstöð / útstöð.

## Félag án teikningaborðs

`undirbua` stoppar með „Vantar teikningaborð". Þá: finndu aðaluppdrætti (`teikn-listi?heimilisfang=…` → `landnr` → `teikn-listi?landnr=…`; gildandi blað
= `tegund "Aðaluppdrættir"`, nýjasta dags, `urelt:false` — sjá SKILL.md „Að finna teikningar"), sæktu blöðin, **veldu hæðir og skurði með augunum**
(skurður nær yfir húsið með málsetningum, ekki nafnreit/afstöðumynd) og skrifaðu `bord.json`:
`{"haedir":[{"nafn":"1. hæð","url":"<innri .info slóð>","frum":{"b":6006,"h":4401},"skurdur":{"x":721,"y":572,"w":2042,"h":1078}}]}` →
`bord <id> bord.json` (neitar að yfirskrifa borð sem er til). Keyrðu svo `undirbua` aftur.

## Reglur sem gilda alltaf

* **Aldrei eyða, aldrei yfirskrifa:** virk greining fyrir fer í sögu (`fjarlaegt_at`); borðið er ósnert nema `bord` (nýtt) eða `nytt:true`.
* **Heiðarleiki:** ólæsilegt blað, vantar skýringu, tala sem þú last ekki → `athugasemdir`, ekki giska. Fáir þú ekki klárað: `villa <id> "<ástæða>"`.
* **Merki Agnars á Teikningu eru hans** (markers) — snertu þau ekki. Þjónustu-/söluupplýsingar (verð, nótur) fara aldrei í greininguna.
* **Staða:** `stada: 'tillaga'` þar til Agnar yfirfer (kúnninn sér þá „staðfest á staðnum við næstu skoðun").
* **Gildrur sem hafa bitið:** Python stdout/skrá er cp1252 á Windows (`sys.stdout.reconfigure`, `encoding='utf-8'`, `PYTHONUTF8=1`); heredoc með
  íslensku í bash brotnar → Write-tólið; PDF 11 MB → `rewrite_images(quality=80)` 1,3 MB; `git`/deploy aðeins þegar kóði breytist (`[deploy]`).

## Arnold-vaktin (tímasett verk)

Tímasett verk sem keyrir á nokkurra mínútna fresti: `bgr_verk.cjs naest` → ef `{}`: hætta strax (ódýrt); annars fylgja hringrásinni hér að ofan
til enda og enda á `loka`/`villa`. Eitt verk í einu. Vaktin hefur sama leyfi og þessi skrá — ekkert annað; hún snertir ekki repóið (ekkert git).
Slökkt: `mcp__scheduled-tasks__update_scheduled_task` `enabled:false`, eða taka verk af biðröð með `afturkalla <id>`.

## Hvar útkoman birtist

1. **Appið** — Búnaðargreining-spjaldið á prófíl félagsins (474): samantekt, hæðir, Prenta (ein síða / hver hæð sér), Turbo-staða.
2. **Viðhengi** félagsins — „<Heimilisfang> - búnaðargreining (ein síða).pdf" og „(hver hæð á sér blaði).pdf".
3. **Þjónustugátt** — eignasíða → „Búnaðargreining" (`gatt/bunadargreining.js`, gögn úr `netlify/functions/_gatt-bgr.cjs`; tól `bunadargreining`
   í gatt-admin, sjálfgefið kveikt): flokkasía, tafla á hæð, hæðarspjöld með merkjum (stækka, sækja), brunavarnatexti úr byggingarlýsingu.
