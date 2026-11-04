# Verkflæði: teikningar, tæki og greining á prófíl — í EINNI umferð

*Agnar 04.11.2026 (Nesdekk Breiðhöfða 13): „Ég get ekki verið að vesenast í 4 klukkutíma fram og til baka til að stilla einn
profile — reyndu að skapa einhvert ákveðið rétt workflow." Þetta er það verkflæði. Hvert skref hefur eina niðurstöðu og ekkert
er sagt „búið" fyrr en skref 8 er skoðað á lifandi síðunni.*

## Reglurnar sem gilda alltaf

1. **Ein hæð á hverja hæð.** Hæðir heita „Kjallari", „1. hæð", „2. hæð", „Milliloft", „Ris". Aldrei tvö blöð af sömu hæð á borðinu,
   aldrei ártal eða „skönnun" í hæðarnafni — hvaðan blaðið kom fer í `ath`/skjalið.
2. **Skarpasta blaðið sem sýnir húsið eins og það er.** Röð: vigur-PDF › TIF 300 dpi › skönnuð PDF. Skönnuð PDF úr skjalasafni getur
   verið 3185 px mynd á 27×14 cm síðu (Breiðhöfði 13, 2022) — sú verður aldrei skörp, hvorki í Teikningu né TurboPaint. Athuga
   upplausnina ÁÐUR en blað er valið (sjá skref 2). Eldra skarpara blað má vera grunnur ef húsið er óbreytt á þeirri hæð.
3. **Skráð tæki eru merkt sem skráð tæki.** Aldrei „Nýtt"-merki fyrir tæki sem eru til í `uttaeki`. Marker = `{unitId, audkenni, x, y}`.
   Auðkenni: **B** slanga/kefli, **S** handslökkvitæki, **K** CO₂, **ÚT** útgangur. „Nýtt" er aðeins fyrir búnað sem greiningin
   finnur á uppdrætti en er ekki í tækjaskrá.
4. **Félag með marga staði → staðfesta heimilisfang hjá Agnari áður en nokkuð er tengt** (Nesdekk: Dalshraun 10 ≠ Breiðhöfði 13).
5. **Skjöl fá nöfn án ártals** í Viðhengi (vista_vidhengi.cjs hafnar ártali).

## Skrefin

| # | Skref | Skipun / staður | Niðurstaða |
|---|---|---|---|
| 1 | Félag og heimilisfang | `fyrirtaeki` (hub-verkstaður: `verkstadur_info.slokk_company_id`) | rétt félag, rétt hús |
| 2 | Blöðin | `node E:/pascal-profun/teikn-listi.cjs "<heimilisfang>" allt` — fyrir hvert gildandi grunnblað: `.pdf.info` → sækja um `teikn-pdf` og lesa innfelldu myndina með pypdf (`page.images[].image.size`); `.tif.info` → `teikn-pdf` skilar TIF, `sharp().metadata()` | eitt blað valið á hverja hæð, með upplausn |
| 3 | Borð | `node E:/pascal-profun/setja-upp.cjs <cid> "<addr>" --landnr N --skra "<endi>=1. hæð,<endi>=2. hæð"` → skoða `ut/yfirlit-<cid>.jpg` → `node sql-thjappad.cjs <cid>` → INSERT (MCP). Skurður: húsið, ekki nafnreitur | `teikning_bord` með N hæðum, hver einu sinni |
| 4 | Byggingarupplýsingar + OCR | `node tools/greina-hop.cjs --fid <cid> --skrifa --ocr` → bíða (skrifstofuvélin les, 5–10 mín, `automation_triggers` status done) → aftur `--fid <cid> --skrifa` | `fasteign_greining` með m², brunavarnatexta, flokkum |
| 5 | Búnaðargreining | `insert into bunadargreining_verk (company_id,status,stig,beidandi,skilabod,framvinda) values (<cid>,'bida','bida','Claude','Sett í biðröð','[…]')` → 10–40 mín; dettur hún á „hámarki snúninga (80)" → setja aftur, önnur tilraun kláraðist | `bunadargreining` röð (tillaga): BS/SLT/ÚT með hnitum |
| 6 | Tæki á teikningu | Staðir: fyrst þau sem greiningin las (BS/SLT með `bx/by`, færð á grunnblaðið sé það annað), svo hönnunarreglur úr brunavarnatextanum (slökkvitæki við slöngur, afgreiðslu, matsal; CO₂ við töflur), afgangur við útganga. Skrifa `markers` með `unitId` úr `uttaeki` (SQL). Seiling kefla 30 m + 5 m = 35 m → sýna gat | hver skráð eining merkt einu sinni, „Merkt hér" = tækjaskrá |
| 7 | Hub og skjöl | `node scratchpad/verkstadir/mael.cjs <cid>` → `verkstadur_info.brunaholfun` (SQL). Brunaúttektarblað: listi (HTML→PDF), staðir á teikningu (`merkja.cjs`), tæki (`taeki.cjs`) → `node .claude/skills/arnold/scripts/bunadargreining/almennt/vista_vidhengi.cjs <cid> <pdf> "<nafn án ártals>"` (LUNA_BRIDGE=C:/projects/luna-bridge) | Viðhengi á prófíl, spjöld í hub |
| 8 | **Sannprófun á lifandi síðu** | `slokkvitaeki.netlify.app/#company/<cid>`: Teikningar segir „N hæðir", hver hæð einu sinni; „Merkt hér" = fjöldi í tækjaskrá; Búnaðargreining sýnir Tillögu; Viðhengi listar skjölin. Hub: verkstaður sýnir sömu hæðir | fyrst þá „búið" |

## Það sem er sjálfvirkt núna og það sem vantar

Sjálfvirkt: skref 2–3 (teikn-listi, setja-upp, sql-thjappad), 4 (greina-hop), 5 (Turbo á skrifstofuvél), 7 (mael, vista_vidhengi).
Handvirkt enn: val á skarpasta blaði (upplausnarmæling), staðsetning tækja (skref 6) og brunaúttektarblaðið. Næsta smíð:
`tools/profill-teikning.cjs <cid> "<addr>"` sem keyrir 2→3→4→5 í röð með upplausnarmælingu og einni hæð á hæð, og takki
„Brunaúttekt" á prófílnum (HT-02.11 í brunaholf/docs) sem býr til listann, staðina og tækin úr greiningunni.

## Gildrur sem kostuðu tíma 04.11.2026

- Rangt Nesdekk-félag tengt (1853 í stað 219) — regla 4.
- Fjórar hæðir á borðinu (2022 óskýr + 2018 skörp) — regla 1; ætti að hafa mælt upplausn fyrst (regla 2).
- „Nýtt"-tillögur ofan á skráð tæki — regla 3; villandi í Teikningu („Nýtt · Brunaslanga" ×5 þegar 5 slöngur eru skráðar).
- TurboPaint getur ekki gert 3185 px skönnun skarpa; Sækja-takkinn skilar sama lélega frumriti. 438 (skarpt) sækir TIF-frumrit
  í bakgrunni fyrir `.tif.info`-blöð — tekur tíma (33 MB) og sést fyrst eftir afkóðun.
