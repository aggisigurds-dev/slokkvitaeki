# Búnaðargreining — búnaður lesinn af teikningum, vistaður fast á staðnum

Agnar 19.10.2026 (Álfhella 9, Kvarnir ehf. 1871): „Þetta er í raun alveg nýr feature — Búnaðargreining — mátt skrá
þessa verkaðferð í Arnold" og „vista þessar niðurstöður … svo þetta sé fast og þurfi ekki að leita aftur".

**Hvað hún er:** hvert slökkvitæki, slöngukefli og (ef teiknað) reykskynjari staðarins, lesið af **samþykktum
aðaluppdráttum**, með auðkenni (S1, BS1, SLT1 …), hæð, staðsetningu í orðum og tegund — ásamt brunavarnatexta
hönnuðar orðrétt, heimildaskrá (hvaða blöð gilda, hver eru eldri útgáfur) og athugasemdum. Vistað í töflunni
`bunadargreining` og á merkjum Teikningar, svo engin þörf er á að leita aftur.

## Hvar hún býr

| Hluti | Staður |
|---|---|
| Vistaða greiningin | tafla `bunadargreining` (sql/bunadargreining.sql) — ein virk röð á `company_id`; „Greina aftur" setur `fjarlaegt_at` á þá gömlu. Engin eyðing. |
| Merkin á teikningunni | `teikning_bord.haedir[].markers[]` — Nýtt-merki `{unitId:'n:<lettvatn|slanga|…>:<id>', x, y, nytt:true, tegund, stada:'bid'}` + **`audkenni`** („S1") og **`stadur`** („Kaffistofa (0103), við flóttahurð"). Frumdílar heila blaðsins. |
| Listi við hverja hæð | 456 — undir spjaldi hverrar hæðar á prófílnum og í hliðardálki stóru sýnarinnar; auðkennin við punktana (slöngur bláar). |
| Spjaldið „Búnaðargreining" | 474 — undir hæðaspjöldunum: samantekt, athugasemdir, heimildir (yfirstrikað = eldri útgáfa), Brunavarnatexti, Skýrsla (PDF), Prenta, Greina aftur. |
| Skýrslan (PDF) | Viðhengi fyrirtækisins (111, `company_attachments`). **Ekkert ártal í skráarnafni** — annars merkist hún sem úttektarskýrsla ársins. |
| Teikning-glugginn | 433 — nafn merkis sýnir „S1 — Kaffistofa … · Nýtt · Léttvatn"; `audkenni`/`stadur` fylgja þegar búnaður er tengdur skráðu tæki. |

## Verkaðferðin (handlesin — Claude/Arnold)

1. **Finndu ÖLL aðaluppdráttarblöð staðarins** (teikn-listi; Hafnarfjörður `?landnr=&heitinr=&svf=1400`).
   - **Sami matshluti getur átt fleiri en eina útgáfu.** Álfhella 9: 2012 (VEGA) og 2020 (PPverk, „breyting á innra
     skipulagi") — bæjarsafnið merkir hvoruga úrelta. Sannreyndu með skráningartöflu: sama landnr, sami matshluti,
     sami grunnflötur, sama eign (0101) = sama hús; nýjasta samþykkta útgáfan gildir. Staðfestu með yngra skjali
     (mhl 02-blaðið 2026 sagði mhl 01 = 733 m² = 2020-talan).
   - **Fleiri en eitt hús á lóð = matshlutar** (mhl 01, mhl 02 …), hvert með sín blöð og sinn brunavarnatexta.
     Agnar sér það sem „2 húsnæði" — segðu skýrt hvort er: tvö hús, eða tvær útgáfur af sama húsi.
2. **Lestu skýringarnar (legend) á hverju blaði ÁÐUR en táknin eru túlkuð.** Táknin eru mjög mismunandi:
   | Tákn | Merking | Hvar séð |
   |---|---|---|
   | `[S]` í ramma | **slökkvitæki** | Álfhella 9 (VEGA 2012, PPverk 2020): „S Slökkvitæki" |
   | `[S]` í ramma | **segulloki** (!) | Trönuhraun 10 — TurboPaint `bunadur-lestur.ts` flokkar S sem segul |
   | `[BS]` / `BS` + spírall | brunaslanga / slöngukefli | Álfhella 9 |
   | `SLT` (oft lágstafir `slt`) | slökkvitæki | Álfhella mhl 02 (2026), Skútuvogur 4 |
   | `HSL` | handslökkvitæki | DRA ehf |
   | `HST` (rauður texti, ekkert tákn, ekki í skýringum) | handslökkvitæki — „sama og ST" (Agnar 19.10.2026) | Skútuvogur 4 (2025); við rafmagnstöflu = 5 kg kolsýra skv. brunahönnun |
   | rautt slökkvitækistákn með **`L`** inni í | slökkvitæki, léttvatn | Skútuvogur 4 (2025) — stafurinn er í textalaginu, rauður (#ed1f24) |
   | `BRSL` + spírall | brunaslanga; `BRSL SLT` = hvort tveggja á sama stað | Skútuvogur 4 |
   | `[R]` | reykskynjari | flest blöð — aðeins skráð, ekki okkar búnaður nema samningur nái til |
   | `[BV]` | stjórnstöð brunaviðvörunarkerfis | Álfhella 9 — upplýsingapunktur |
   | `ÚT` + ör | merktur útgangur / flóttaleið | flest blöð |
   Sama bókstafur getur þýtt sitthvað eftir hönnuði — **skýringarnar ráða, aldrei forsendan**.
3. **Lestu staðina.** Vigur-PDF: textalagið (PyMuPDF `get_text('words')`) gefur nákvæm hnit — leitaðu að táknorðum
   (`slt`, `SLT`, `HSL`, `BRSL`). Skönnun (Hafnarfjörður 1-bita, 200–300 dpi): teiknaðu í 200 dpi, skerðu í
   skarast flísar (~2000 px) og lestu hverja; staðfestu óljósa punkta með nærmynd. Skráðu hnit í dílum myndarinnar
   og varpaðu í **6000-díla ramma blaðsins** (lengri hlið = 6000; pdf.js-rammi Teikningar).
4. **Berðu saman við texta hönnuðar.** Byggingarlýsing / brunahönnun ræður (723/2017 3. gr.): „tvö slöngukefli sem
   ná um allt húsið … handslökkvitæki við slöngukeflin og á öðrum völdum stöðum" — fjöldinn á teikningunni á að
   stemma. Tegund: notaðu það sem textinn segir („6 L léttvatn, 5 kg kolsýra við aðalrafmagnstöflu"); segi hann ekkert,
   merktu tegundina sem **tillögu**. Tæki sem textinn nefnir en teikningin sýnir ekki (CO2 við töflu sem er ekki
   teiknuð) → í listann **án hnita**, „staðsetja á staðnum". Aldrei giska á stað.
5. **Staðsetning í orðum** fyrir hvert tæki: rými + rýmisnúmer + kennileiti („Lager/geymsla (0102), gafl við útgang
   — ofan við dyr, við BS2"). Það er það sem tæknimaðurinn les á staðnum.
6. **Vistaðu þrennt:**
   - `teikning_bord`: hæðir (skurður að húsinu, `sjalf:false`, `syn.fest:true`) + Nýtt-merki með `audkenni` og
     `stadur`. Ný röð aðeins ef engin er til; annars skilyrt á `updated_at` (Agnar gæti verið að vinna í henni).
   - PDF-skýrsla (búnaðartafla með hakreit „Uppsett", merktar hæðir, brunavarnatextinn orðrétt, heimildir,
     fyrirvari) → Viðhengi með appinu sjálfu (`CompanyAttachments.upload`, aðeins þau skrif hleypt út).
   - `bunadargreining`-röð: `tki`, `texti` (kaflar, `lykill:true` á slökkvitækja-/þjónustusamningsmálsgreinum),
     `heimildir` (`gildir:false` + skýring á eldri útgáfum), `athugasemdir`, `samantekt`, `skyrsla`.
7. **Sannreyndu á lifandi síðu með skrif lokuð** (prófunaraðferðin í SKILL.md): hæðirnar opnast, merkin á réttum
   stað, listinn og spjaldið birtast, ekkert skrifað.

Skriftur (fyrirmyndir, allir staðirnir): `../scripts/bunadargreining/` (README þar). Álfhella 9 (`alfhella-9/`) — `merkja.py` (hnit → 6000-rammi + merktar myndir),
`vista_bord.cjs`, `merkja_texta.cjs` (audkenni/stadur á merki, skilyrt), `bua_pdf.cjs` (HTML → PDF í Chromium),
`vista_vidhengi.cjs` (PDF í Viðhengi um appið), `vista_greiningu.cjs` (röðin).

## Sér teikning, útgangar og brunakerfi (Agnar 19.10.2026)

„Að það merkist líka inn á sér teikningu" · „að svona búnaðargreining sé svoldið sér, úr því sem stendur í
gögnum/teikningum" · „merkja inn neyðarútganga … ef það eru brunakerfisteikningar/upplýsingar að merkja það allt inn".

- **Teikning greiningarinnar** = blöðin sem greiningin las, ÓHÁÐ Teikningu staðarins: `bunadargreining.teikningar`
  `[{id, nafn, mynd, frum:{b,h}, skurdur, heimild}]`, hver staður `tki[].blad` + `bx/by` (dílar þess blaðs). `mynd` = teikn-mynd
  (PDF Teikningar) eða hrein JPEG í opinberu fötunni `turbopaint/bunadargreining/<cid>/…` (CORS * → 456 setur
  `crossOrigin` svo prentun virki). 474 sýnir spjald á blað, stóra sýn með flokkuðum lista, og Prenta notar þau.
- **Flokkar** `tki[].flokkur`: (tómt) = slökkvibúnaður (rautt / slanga blátt), `flotti` = ÚT (grænt; `tegund` Útidyr /
  Flóttaleið innanhúss), `brunakerfi` = skynjarar, handboðar, stjórnstöð/útstöð (fjólublátt, hitaskynjari appelsínugult).
  ÚT og brunakerfi eru `upplysingar:true` — teljast ekki með slökkvitækjum og fara ekki í „Ekki á Teikningu".
  `samantekt` fær `utgangar, flottaleidir, reykskynjarar, hitaskynjarar, handbodar`.
- **ÚT úr vigur-PDF:** orðið „ÚT" í textalagi (dulkóðað letur → afkóða). Útidyr = nærri útvegg (mörk mæld á blaðinu),
  annars flóttaleið innanhúss; staðurinn = næsta rýmisheiti (sía tölur, „m²", BRSL/SLT, athugasemdir).
- **ÚT/R úr 1-bita skönnun:** sniðmát klippt úr skýringum blaðsins (0/90/270°, þröskuldur ≈ 0,62, NMS). **[S] passar við
  R-sniðmátið** (Álfhella: 2 „R" voru slökkvitæki) — staðfestu alltaf með augunum; ÚT getur tvíteljast (sameina ≤ 70 dílar).
- **Brunakerfisteikningar** eru séruppdrættir rafhönnuðar (Reykjavík: `seruppdrattir?listi=1&landnr=` flokkur `raf`, titill
  í titilreit t.d. „Brunakerfi og neyðarlýsing 1.h"). Skútuvogur 4: Voltorka BN055104 bl. 13–16 (02.03.2020), 1:50, hver hæð
  á tveimur blöðum (norður/suður) sem skarast. Aðferð: sniðmát R/H/HB úr skýringunum (þröskuldur 0,70/0,74/0,70, 0/90/270°),
  skýringareitur felldur (H+R+HB í lóðréttri röð), blöðin **skeytt** (hliðrun milli para með matchTemplate á Canny-brúnum,
  ≈1800 dílar lóðrétt) og tvítekningar í skörun felldar (≤ 60 dílar). Bjöllur/neyðarljós/ÚT-ljós: sniðmát of almenn →
  ekki talin. **Varpa EKKI á nýrra aðaluppdrátt** þegar innrétting breyttist (stilling á daufum skönnunum gaf kvarða
  0,72–1,29 — ónothæf); sýndu blaðið sjálft sem eigið spjald, merkt „innrétting FYRIR breytingu".

## Takkinn „Búnaðargreining" í takkaröð prófílsins (Agnar 20.10.2026)

Fyrir framan Teikning-takkann (í stað Þjónustusamnings, sem er nú í ⋯-valmyndinni, 405). **Ýtt á hann: er greining til → hún opnast í glugga** (Skýrsla · Brunavarnatexti · **Prenta** · Greina aftur) — **annars setur kerfið hana af stað** og glugginn sýnir útkomuna. Grænt hak á takkanum þegar greining er til. Sami takki er í Brunahólfi (prófíllinn er innfelldur).

**Lesturinn sjálfur (474 `lesaUrTeikningu`):** þegar engin merki eru á hæðum Teikningar les takkinn táknin úr TEXTALAGI aðaluppdráttarins með pdf.js (snúningur síðunnar meðtalinn): `SLT`/`HSL`/`HST` = handslökkvitæki, `BRSL` = slanga, `ÚT`, og — aðeins ef **skýringin stendur á sama blaði** („Handslökkvitæki", „Brunaslanga", „Reykskynjari") — `SL`, `BS`, `R`. Skýringarlínur (tákn með lýsingu hægra megin) eru ekki taldar; `ÚT` aðeins ef allur textahnúturinn er „ÚT" (ekki orð í setningu); **björgunarop (BO) eru EKKI lesin** (Agnar: „þarf ekki að vera þarna"). Rými: sú lárétta röð rýmisnúmera (≥ 3) sem er næst miðgildi táknanna, nálægasta númer í x (nálægasta númer í tvívídd valdi tæknirými í horni). Hæð verður að eiga PDF-heimild: `image_url` = teikn-mynd-slóð PDF (`&sida=N` fyrir síðu í setti) eða `haedir[].pdf = {url, sida}` á hreinni JPEG-hæð. Skráð tæki á staðnum → engin Nýtt-merki (tvítalning), hönnunarstaðirnir fara aðeins í greininguna. Skönnun án textalags → tenglar á TurboPaint eins og áður. „Greina aftur" heldur nú ÚT/brunakerfi, hönnunarstöðum utan Teikningar, texta, heimildum, blöðum og skýrslu.

**Besta blaðið:** nýjasti **[INNSIGLAÐ] aðaluppdráttur** með eigin skýringum (Suðurhella 5: SL/BS/R/ÚT/BO, REI/EI, „Skýringar" + byggingarlýsing á blaði 3) segir allt — vigur með textalagi, einn skjal í setti (síða 1 = 1. hæð, síða 2 = 2. hæð/milliloft). Leitaðu hans FYRST í teikn-listi (`tegund: Bygginganefndarteikning`, nýjasta `dags`); 2016–2018-blöð (skönnuð, engin textalög) eru eldri útgáfa.

**Prentanlegt skjal:** ein síða án blaðaskiptingar (sími + prentun): samantekt (fjöldi á hæð og í heild) efst, húsmynd prófílsins í hægra horni, báðar hæðir fyrir neðan (`sudurhella-5/pdf_ein.py`) → Viðhengi.

**Merkjastærð:** Nýtt-merki á 50 m löngu húsi urðu of stór (sjálfvirkt 56 px á 3.951 px breiðum skurði) → `haedir[].stimpilStaerd` 26.

## Sjálfvirki takkinn („Greina búnað" í 474)

Les **ekki** táknin sjálfur — lesturinn býr í TurboPaint (kjarni, `kjarni.vercel.app/kjarni/turbopaint`):
- „Búnaður af teikningu" (Slökkvitæki-hamur): OCR (tesseract í vafra, lárétt ~75 s; eða RapidOCR á brúnni,
  `merki-ocr`) → `slt-brsl.ts` les SLT / HSL / BRSL (+ spírall slöngukeflisins í blekgrímunni), BO, ÚT. Vistar
  **ekkert** fyrr en „Vista í úttekt" — þá verða ótengd tákn Nýtt-merki.
- Rammastafir R/S/H/B (`bunadur-lestur.ts`) eru aðeins á grein `claude/turbopaint-merki-lesari` (ósameinuð 19.10) og
  túlka `[S]` sem segulloka — rangt fyrir Álfhellu-blöðin. `[BS]` er ekki lesið.
- „Sjálfvirkt" (`?sjalfvirkt=1`) keyrir allt verkferlið (skurður, veggir, hurðir, EI, tæki) og **endurgerir veggi**;
  finnist engir veggir vistast ekkert, ekki heldur tækin. Þess vegna ræsir Búnaðargreining það ekki.

Takkinn tekur því merkin sem ERU á hæðunum (úr TurboPaint-lestri eða dregin inn), og:
1. skráð tæki fá tegund/stærð/raðnúmer úr `uttaeki` (brunaslanga → BS);
2. auðkenni þar sem vantar: S (slökkvitæki), BS (slanga), R (skynjari), framhald af hæsta númeri, hæð fyrir hæð,
   ofan frá — **handlesin auðkenni/staðir haldast**;
3. staður þar sem vantar: næsta rýmisheiti úr textalagi vigur-PDF („Nálægt: smiðja"); skönnun → enginn staður;
4. brunavarnir úr byggingarlýsingu (468: `fasteign_greining` 'eign' → `gogn.bygg.brunavarnir.efni[].daemi`);
5. vistar merkin (skilyrt á `updated_at`) og nýja `bunadargreining`-röð.
Engin merki → tenglar „Lesa búnað í TurboPaint · <hæð>" (`?uttekt=<cid>&haed=<id>&b=&h=`).

Handlesin greining (Claude/Arnold) er alltaf betri á skönnunum: hún les skýringarnar og orðar staðinn.

## Þegar Teikningin notar ekki gildandi blað (Skútuvogur 4)

- **Athugaðu alltaf hvort til er nýrra samþykkt sett** en það sem Teikning staðarins notar. Skútuvogur 4: Teikningin var á
  blöðum 11.10.2022 (fyrri notkun: verkstæði, þrif á bílum), en „Teikningasett" samþykkt 09.12.2025 (USK25050395) breytti
  MHL 2 í verslun Álfaborgar. Stimpill byggingarfulltrúa á blaðinu („Aðaluppdrættir Samþykkt …") sker úr.
- **Skiptu ekki um blað undir merkjum Agnars** — merkin hans eru í frumdílum gamla blaðsins. Varpaðu hönnunarstöðunum á
  gamla blaðið í staðinn: bæði 1:100, svo kvarði ≈ 1 og hliðrun; `matchTemplate` á Canny-brúnum (30 dpi, kvarði 0,90–1,10)
  gaf s = 1,015 / 0,995. **Sannreyndu stillinguna** á táknum sem eru á sama stað á báðum blöðum (BRSL-staðirnir voru
  óbreyttir milli 2022 og 2025 og lentu hver ofan á öðrum).
- **Skráð tæki = ENGIN Nýtt-merki.** Álfaborg á 16 skráð tæki; hönnunarstaður án tækis á teikningu er „Ekki á Teikningu"
  í greiningunni (474 sýnir listann), ekki nýtt tæki — annars tvítalning. Merki sem stendur ≤ 2,5 m frá hönnunarstað fær
  `audkenni`/`stadur` (skilyrt á `updated_at`); hin fá ekkert og eru nefnd í athugasemdum.
- **Dulkóðað textalag:** 2025-blöðin nota letur sem hliðrar ASCII um +29 („6N~WXYRJXU" = „Skútuvogur"), íslenskir stafir á
  eigin sætum (0xe8 ð, 0x69 á, 0xa0 æ, 0x74 í, 0x79 ó, 0x7e ú, 0x7c ö, 0xec þ, 0xea ý, 0x70 é, 0xcb Í …). Afkóðunin er í
  `../scripts/bunadargreining/skutuvogur-4/afkoda.py`; brunavarnatextinn og rauðu táknstafirnir lásust þannig nákvæmt.

## Viðmiðunarstaðir

| Staður | company_id | Greining | Athugasemd |
|---|---|---|---|
| Kvarnir ehf., Álfhella 9 | 1871 | id 1, 19.10.2026, handlesin | mhl 01 (2020-skönnun, [S]/[BS]) 7+2 tæki, mhl 02 (2026 vigur, slt) 4; CO2 utan teikningar; 2012-útgáfan eldri |
| Álfaborg, Skútuvogur 4 | 661 | id 2, 19.10.2026, handlesin | sett 2025 (vigur, dulkóðað textalag): 15 slökkvitæki (12 „L" + 3 HST) + 5 BRSL; skráð 11 + 5; 3 af 7 merkjum á hönnunarstað; Teikning enn á 2022-blöðum |
| ProLan - Suðurhella 5 | 1875 | id 4, 20.10.2026, **sjálfvirkt úr textalagi** (staðfest handtalið) | aðaluppdráttur 15 023 samþ. 17.09.2025 (útg. F/E): 17 SL (11 + 6 á millilofti) + 6 BS (20 m) + 12 ÚT + 19 R; bil 0104 aðeins eitt SL; tegund tillaga (duft 6 kg); engin tæki skráð → 23 Nýtt-merki á Teikningu; ein-síðu PDF í Viðhengi |
| Sunnukriki 3 (Mosfellsbær) | — | ekki vistuð (ekkert félag) | Hóptíma stúdíó 2026: 2 SLT, 6 RS, 3 ÚT; brunakerfi 1. h. 7 + 24 R; gögnin í `../scripts/bunadargreining/sunnukriki-3/greining_sunnukriki.json` |

## Í Brunahólfi (20.10.2026)

Viðskiptavinir-síða hubbans (brunaholf.netlify.app) fellir prófílinn og Greininguna inn (flipar „Staðir & teikningar" og „Greining", iframe `https://slokkvitaeki.netlify.app/?bh=1#company/<id>` / `#greining/<heimilisfang>`). **Sama vélin** — Búnaðargreining, Teikning og Greining vista í sömu töflur á STAÐINN (fyrirtaeki á kennitölu greiðandans); "＋ Stofna stað" í hubbanum býr hann til. Greiðandi án staðar → stofna fyrst, svo vista greininguna á hann. Dæmi: Uppspil ehf. (kt 470922-2060) → fyrirtæki 1873, verkstaður Sunnukriki 3 (Mosfellsbær).
