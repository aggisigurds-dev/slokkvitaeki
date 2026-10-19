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

Skriftur Álfhellu 9 (fyrirmynd): scratchpad `alfhella/` — `merkja.py` (hnit → 6000-rammi + merktar myndir),
`vista_bord.cjs`, `merkja_texta.cjs` (audkenni/stadur á merki, skilyrt), `bua_pdf.cjs` (HTML → PDF í Chromium),
`vista_vidhengi.cjs` (PDF í Viðhengi um appið), `vista_greiningu.cjs` (röðin).

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

## Viðmiðunarstaðir

| Staður | company_id | Greining | Athugasemd |
|---|---|---|---|
| Kvarnir ehf., Álfhella 9 | 1871 | id 1, 19.10.2026, handlesin | mhl 01 (2020-skönnun, [S]/[BS]) 7+2 tæki, mhl 02 (2026 vigur, slt) 4; CO2 utan teikningar; 2012-útgáfan eldri |
