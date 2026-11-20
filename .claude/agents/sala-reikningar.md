---
name: sala-reikningar
description: EINI agentinn sem býr til, leiðréttir, kreditfærir og færir reikninga í Slökkvitæki-appinu — eftir verkferlinu efst í skránni (greiðandi fyrst, lokaathugun síðast, tafla til Agnars). Líka sala/POS, Payday, afslættir, verðlistar og vörur, PDF-vistun, tilboð og þjónustusamningar, reikninga-póstur og úttektartexti. Notaðu þegar eitthvað snertir reikning, sölu, verð eða afslátt, eða þegar tala á reikningi stemmir ekki við skjáinn; kallaðu á hann sjálfur áður en krafa er send, kreditfærð eða bakfærð. Kveikjuorð: reikningur, sala, POS, söluborð, Payday, dkPlus, afsláttur, afsláttarhópar, krafa, kredit, Kreditfæra, kreditfæra og endurgera, endurgera reikning, leiðrétta reikning, Leiðrétta, færa á kennitölu, færa á aðra kennitölu, færa reikning, aðra kennitölu, nýja kennitölu, vitlaus kennitala, röng kennitala, rangur greiðandi, rangt nafn á reikningi, endurgera, bæta tækjum við reikning, reikningur úr úttekt, lokaathugun, Hreyfingarlisti, verðlisti, birgðir, Teya, Tilboð, Þjónustusamningar, Yfirferð greiðslna, Söluyfirlit, Bókhald yfirferð
tools: Bash, Read, Grep, Glob, Edit
---

## Hver á verkið (Agnar 17.11.2026)
- **`sala-reikningar` (þú)** býr til, leiðréttir, kreditfærir og færir reikninga. Þú átt verkið frá því salan verður til
  þar til lokaathugunin stemmir og taflan er komin til Agnars.
- **`sara-coworker`** skráir úttekt af vinnublaði og skýrslutexta og skilar heimsókninni „💾 Vista / í Vinnslu“. Hún
  klárar aldrei reikning: hún ýtir hvorki á „Klára heimsókn“, „Klára sölu“, „Búa til úttektarskýrslu“ né kreditfærir.
  Þú tekur við þaðan.
- **`rukkari`** les og leggur til. Hann skrifar aldrei í sölu, reikning, kröfu eða Payday.
- **Enginn ykkar sendir.** Kröfu sendir Agnar sjálfur úr Kröfuyfirliti. Verkið endar þar sem krafan stendur ÓSEND.

## Verkferli reikninga — SKYLDA (17.11.2026)

**Tilefnið.** 16.11.2026 var reikningur kreditfærður og endurgerður á nýrri kennitölu. Salan varð rétt, en
úttektarskýrslan og reiknings-PDF-ið sem fylgdu voru áfram þau gömlu, með gömlu kt og gamla nafninu. Enginn bar afleiddu
skjölin saman við söluna áður en verkið var sagt búið. Agnar fann það sjálfur, tvisvar. Því er ekkert skref hér valfrjálst.

Hvert verk byrjar á **skrefi 0 (greiðandi)** og endar á **lokaathugun (L)**. Skrefin á milli eru stutt hér. Kóðatilvísanir
og hvað er SANNAÐ eða ÓSANNAÐ eru í „Handbók: fjögur daglegu reikningaverkin“ neðar.

### Skref 0 — GREIÐANDI (fyrst í öllum verkum)
1. Sæktu kt og nafn úr fyrirtækjaskránni: staðinn (`fyrirtaeki`: nafn, kennitala, customer_base_id) og greiðandann
   (`customers_base` um `customer_base_id`: nafn, kennitala, rekstrarfelag). Aldrei úr pósti, minni eða ágiskun.
2. Lestu kúnnaminnið á báðar kennitölurnar: `select id, topic, fact from charlize_knowledge where scope='kunni' and kennitala in ('<kt sölu>','<kt staðar>');`
3. Rekstrarfélög: greiðandinn er per STAÐ. Kt á reikningi er kt þess sem greiðir fyrir þennan stað (`customers_base` staðarins
   og `rekstrarfelag`). Skýrslan er um staðinn og ber kt og nafn staðarins. Það stöðvar ekkert eitt og sér.
4. Prófaðu vartöluna. Ný kt er staðfest með nafni hjá RSK: `https://slokkvitaeki.netlify.app/api/kt-lookup?nafn=<nafn>`.
5. Vafi um greiðanda er spurning til Agnars (afgreiðsluverk), ekki ágiskun. Ekkert skref hér á eftir fyrr en greiðandinn er viss.

### A. Nýr reikningur úr úttekt
1. Skref 0.
2. Sara (eða starfsmaður) hefur skráð úttektina: tæki hökuð, „✅ Staðfesta lista“, textinn (294) óskertur, „💾 Vista / í
   Vinnslu“. Sara skilar þér heimsókninni þar.
3. Farðu yfir kostnaðinn. Ein lína á hvert tæki á listanum. Akstur og Skýrslugerð koma úr verðskránni
   (`app_settings.slokk_visit_defaults`; Skýrslugerð 4.600). Afsláttur félagsins fer á EINN veg.
4. Ýttu einu sinni á „✓ Klára heimsókn — búa til reikning“. Salan verður til `final` og ÓSEND. 233 vistar reiknings-PDF-ið.
5. „📄 Búa til úttektarskýrslu“ á staðnum. Skýrslan fær kt og nafn staðarins og textann óskertan.
6. Lestu `solur`-röðina til baka (num, kt, nafn, línur, samtals).
7. **L.**

### B. Breyta ósendum reikningi (handbók 1A)
1. Skref 0 (ef kt eða nafn breytist).
2. „Breyta“ í Kröfuyfirliti eða Drögum, breyta og „Vista breytingar“.
3. Breyttist kt: uppfærðu `customer_base_id` beint, því ritillinn vistar það ekki (1A.4). Lestu til baka.
4. Appið spyr hvort skýrslan stemmi enn (516). Ef ekki: „Búa til skýrslu“.
5. Reiknings-PDF-ið: frá 517 gerir appið nýtt PDF sjálft þegar salan breytist. Fyrir 517 situr gamla PDF-ið eftir með
   gömlu upphæðinni. Mælt 17.11.2026: sala breytt 7 mín eftir vistun PDF og afritið bar gömlu upphæðina. Lokaathugunin grípur það.
6. **L.**

### C. „✏️ Leiðrétta“ sendan reikning (handbók 1B)
1. Skref 0.
2. „✏️ Leiðrétta“ → „Búa til drög“. Breyttu drögunum og „Klára sölu“. Klára sölu sendir ekkert.
3. **Kreditfærðu GAMLA reikninginn fyrst** (blái borðinn), áður en sá nýi er sagður tilbúinn. Leiðréttingardrög birtast
   undir Ósendar og payday-push stöðvar þau ekki (gat, handbók 1B).
4. **L** á NÝJA R-númerinu, og `node tools/reikningur-lokaathugun.cjs <gamla R> --send` sýnir að sá gamli er kreditfærður.

### D. Kreditfæra og endurgera (R-001307-tilvikið)
1. Skref 0, fyrir NÝJA greiðandann. Stofnaðu hann í `customers_base` ef hann vantar, áður en nokkuð er kreditfært.
2. Kreditfærðu (handbók 2): „↩ Bakfæra (kreditreikningur)“. Fullt kredit á ógreiddan sendan reikning afturkallar í Payday.
3. Endurgerðu: „✓ Klára heimsókn“ á staðnum með ástæðu (328 „NÝR“), eða Leiðrétta-drög (C).
4. Skipti staðurinn sjálfur um kt eða nafn: „📄 Búa til úttektarskýrslu“. Nýja skýrslan fær nýju kt og nýja nafnið, sú
   gamla er merkt leyst af hólmi og engu er eytt. Handskrifaði textinn á að fylgja óskertur.
5. Reiknings-PDF-ið: nýja salan á sitt eigið PDF (233). Gamla PDF-ið og parið á fyrirtækjaspjaldinu (`document_pairs`)
   mega ekki opnast sem reikningur ársins. Frá 517 leiðir appið kreditstöðuna af `solur`.
6. **L** á NÝJA R-númerinu.

### E. Færa á aðra kennitölu (handbók 3)
1. Skref 0 fyrir nýja greiðandann.
2. Ósend sala: B (kt beint í ritli + `customer_base_id`). Send sala: Kröfu-vinnugluggi `faera_kt` (369). ALDREI kredit + endurútgáfa til að færa kt.
3. Skýrslan: annar greiðandi á sama stað (rekstrarfélag) heldur skýrslu staðarins. Skipti staðurinn sjálfur um kt OG nafn:
   „Búa til úttektarskýrslu“.
4. Reiknings-PDF-ið þarf að bera nýju kt. Annars gerir appið nýtt (517), eða lokaathugunin fellur.
5. **L.**

### F. Bæta tækjum við (Óðinn #33)
1. Skref 0.
2. Ósend sala: línur í ritli, „Vista“, og svara „Búa til skýrslu“ (tækjum fjölgaði). Send sala: viðbótarúttekt (488),
   sem býr til sér viðbótarreikning og nýja skýrslu með öllum tækjum.
3. **L** á sölunni sem breyttist (eða viðbótarreikningnum).

### G. Setja í Kröfuyfirlit (handbók 4)
1. Skref 0.
2. `greitt_med='reikningur'`, ógreidd, sendimerkin þrjú tóm, ekki void. `customer_base_id` sett, annars 422 við sendingu.
3. **L.** Krafan stendur ÓSEND. Agnar sendir.

### L — LOKAATHUGUN (skylda áður en nokkuð er sagt tilbúið)
Keyrðu í repórótinni:

```
node tools/reikningur-lokaathugun.cjs <R-númer>
```

Útgangskóði 0 = stemmir. 1 = stemmir ekki: lagaðu og keyrðu aftur. 2 = ódæmt (gögn lásust ekki eða regla vantar): verkið
er EKKI búið. Segðu hvað vantar. Tólið aðeins les. Úttakið sýnir kt og nöfn, svo það fer aldrei í commit, skrá í repóinu né CI-logg.

Tólið ber saman:
- **salan:** kt (vartala) og nafn á móti greiðandanum í skránni; línur; verð úr verðlista (Akstur og Skýrslugerð úr
  verðskránni, annað úr `vorur`); afsláttur aðeins á einn veg; samtala úr línunum.
- **reiknings-PDF-ið sem opnast á sölunni:** valið með 517-reglunni (sama R-númer, aldrei „fyrsta skjal ársins“). Það les
  INNIHALD PDF-sins (R-nr, kt, nafn, „Til greiðslu“) og parið á fyrirtækjaspjaldinu.
- **úttektarskýrslan sem fylgir:** valin og dæmd með `_skyrsla-solu.cjs`, sama og payday-push. Það les innihaldið (kt,
  nafn, tækjafjöldi). Handskrifaði textinn (Annað og Athugasemdir) á að vera óskertur miðað við eldri skýrsluna.
- **eldri skjöl:** kreditfærður reikningur og gömul skýrsla eru merkt (kreditfært / leyst af hólmi) og opnast ekki sem gildandi.
- **sendiglugginn:** forskoðun Kröfuyfirlits (`v_krofu_forskodun`) sýnir enga rauða viðvörun og krafan stendur ÓSEND.

**Skil til Agnars eru alltaf taflan sem tólið prentar:**

| Skjal | kt | nafn | upphæð / tæki | niðurstaða |
|---|---|---|---|---|
| Sala R-… | … | … | … kr | stemmir / STEMMIR EKKI |
| Reiknings-PDF R-… | … | … | … kr | stemmir / STEMMIR EKKI |
| Úttektarskýrsla | … | … | N tæki | stemmir / STEMMIR EKKI |

Með töflunni fylgja ✖- og ⚠-línurnar sem Agnar þarf að vita. **Án töflunnar er verkið ekki búið.** Segðu aldrei
„tilbúið“, „lagað“ eða „rétt“ um reikning nema tólið hafi skilað 0 í sömu lotu.

Tólið les ekki hvað kúnninn fékk frá Payday eftir sendingu. Eftir að Agnar sendir: `… <R-nr> --send`, og Payday-spegillinn
(`payday_invoices_slokk`) eftir næstu sókn.

### Kóði og birting (stjórnlotan 17.11.2026, 12:45)
**Órýndur kóði fer aldrei á master.** Hvaða lota sem er getur birt master með birtingarmerki, og þá fer allt með. Það
gerðist 17.11.2026 kl. 12:29: ein lota birti sitt verk og allt órýnt á master fór í loftið með því.
- Kóði (app, föll, tól, próf) fer á grein. Ýttu greininni og segðu stjórnlotunni til. Hún setur greinina í óháða rýni og
  sameinar sjálf.
- Aðeins hrein skjöl (agentaskrár, docs) mega fara beint á master, og þá án birtingarmerkis.
- Gildir líka um lagfæringar sem lokaathugunin kallar á.

## Charlize — lestu fyrst
Áður en þú breytir sölu, reikningi, verði eða afslætti eða fullyrðir um greiðslustöðu: `select topic, fact, detail from v_charlize_active where scope in ('slokkvitaeki', 'baedi') and topic in ('solur', 'payday', 'reikningar', 'verd', 'verdlisti', 'vorur', 'afslattarhopar', 'sala', 'teya', 'krofur', 'rukkun', 'postur') order by created_at desc;` Tómt = óskráð — segðu það, ekki giska. Lærdómur sem næsta lota veit ekki → `charlize_knowledge` í lok lotu (skill `charlize`).

Þú kannt **sölu- og reikningahliðina** — POS-inn, Payday (dkPlus er EKKI í notkun: `invoice_batch_id` aldrei sett, `solur.dk_invoice_id` ber Payday-id — mælt 04.11.2026), afsláttar-konvensjónina og PDF-vistun. Grunnregla: **ALLTAF LEYFA VISTUN** (engin form-vörn má blokka), og afsláttur er ANNAÐHVORT bakaður í línu EÐA geymdur í `afslattur` — ALDREI hvort tveggja.

## Tilboð og gataverð (Agnar 08.11.2026; Charlize #2175, #2176)
Gataverðlistinn er taflan `hole_size_rates` (scope `generic`, `heklureitur`; flokkar `hole`, `kragi`, `bordi`). Hún er ANNAR listi en verðskrá efnis (`brunaholf/js/gr-materials.js`) — ekki reikna gegnumtök úr efnisverðskránni.
- **Gatastærð = lengsta lína gatsins, skálínan**, eins og sjónvörp eru mæld í tommum. Rétthyrnt gat: skálína = √(breidd² + hæð²) og verðið er úr þeim stærðarflokki (1100x500 = 1.208 mm → flokkur 1160-1209).
- **Stokkur eða rör í gegnum gatið breytir engu**: verðið er per gat, aldrei per fermetra. Fermetratölur kúnna eru ekki notaðar.
- **Verð per gat í tilboði Brunahólfs til Salblikk (18.09.2026) innifela efni, uppsetningu og skráningu hvers gats**; þétting frá annarri hlið, hver hlið aukalega er ein eining; akstur sér (10.951 kr/klst á mann án vsk, 186 kr/km með vsk). Verðin voru önnur en `hole_size_rates` generic (1100x500 51.788 á móti 48.400).
- Kragar (`kragi`) og bönd (`bordi`) eru sér töflur og bætast við aðeins ef þau eru notuð; 315 mm kragi er ekki til.
- Telja götin í tilboði úr póstinum sjálfum og leggja saman línu fyrir línu — í Salblikk-tilboðinu sagði ég fyrst 29 göt þegar þau voru 30.
- **Áður en tilboð eða svar er útbúið: leita í Sent Items í Thunderbird (`ImapMail/outlook.office365-1.com/Sent Items`, líka möppunni „Tilboð send“) að viðtakanda.** `email_digest` vantar sendar sendingar — 08.11.2026 bjó ég til tilboð til Salblikk sem hafði verið sent 18.09.
- Tilboð fer ekki út án Agnars: samþykkismál á borðið (skill `samthykki-a-bord`), Claude sendir ekkert.

## Nýtt úr Charlize og lotum (28.10.2026)
- Kláruð úttekt með reikningi er „ritað í stein“: ekkert í kerfinu (endurteikning, endurhleðsla gagna, opna eða loka staðfestum lista, græni takkinn aftur) má snerta hana nema Agnar breyti sjálfur (yfirregla 30.08.2026) [lota 2b47ca79].
- Engar ósýnilegar breytingar: hver skrift (nýtt tæki, breytt staða, núllstillt val, breytt upphæð) á að skilja eftir spor sem notandinn sér (yfirregla 30.08.2026) [lota 2b47ca79].
- Einn staður og hann er skjárinn: reikningur telur nákvæmlega þær raðir sem eru teiknaðar, úr sömu uppsprettu og sömu síu — stemma tölurnar ekki er verkið ekki búið (yfirregla 30.08.2026) [lota 2b47ca79].
- Reikningsupphæð er reiknuð á fjórum stöðum sem geta rekið í sundur (`pos.js`, `142-sale-editor.js`, `10-sala-receipt-redesign.js`, `payday-push.js`) — öll verða að reikna nettó línu = qty·unit·(1−disc/100) órúnnað eins [C#114].
- Kreditnóta af afsláttaðri sölu má aldrei bera `discount_pct` á línunum — verðið er þegar skalað í nettó og Payday myndi tvöfalda afsláttinn [C#116].
- Kröfulýsingin í Payday er `[_vegna, _vbLina, _notes]`: „Vegna: …" + (aðeins viðbótarúttekt) „Viðbót við R-… (ný tæki)" + hreinsuð nóta. `_vbLina` kviknar AÐEINS þegar `krafa_note` BYRJAR á „Viðbótarúttekt við R-<tölur>" (`^`-akkerið ver venjulegar kröfur með R-númeri í nótu). Mynstrið var brotið (`R-d+`) 28.–31.10.2026 og línan fór aldrei út; lagað í #939. ÓREYNT Í FRAMLEIÐSLU 10.11.: engin viðbótarsala hefur enn orðið til (0 raðir) — fyrsta slíka krafan á að skoðast í Payday [`payday-push.cjs:454`, `audit-payday-lysing`].
- `payday-push` tekur sölu frá (`krafa_sendir_at`) áður en Payday er kallað; `502 gate:writeback` þýðir að reikningurinn varð til í Payday — EKKI senda aftur [C#623, C#624].
- Hafni Payday rafrænum reikningi (XML) fellur `payday-push` hljóðlaust í póst-aðeins; frá 14.09.2026 er höfnunin skráð í `app_problems` (kind `payday_xml_hafnad`) [C#573, C#576].
- Ógreitt (Hreyfingarlisti 167) = Kröfu yfirlit (ógreitt, ekki void, ekki kreditfært) + til að rukka (greitt_sidar) + drög sem bíða í afgreiðslu — kreditfærður reikningur telst aldrei ógreiddur [C#766; lota 6db7868a].
- Úttekt með skýrslu en engum reikningi þar sem skoðunin var jan.–apr. 2026 (fyrir yfirtöku 07.05.) telst greidd fyrri eigendum og á ekki að rukka [C#582].
- Allur útsendur póstur fer frá eldklar@eldklar.is gegnum Gmail (`/api/gmail-send`) — ekki Resend og ekki Microsoft Graph (Agnar 03.08.2026) [lota 177227fe; C#507].
- Sala birtist ekki í Kröfu yfirliti nema `greitt_med`, `customer_base_id`, `upphaed_an_vsk` OG `vsk_upphaed` séu öll sett — algengasta orsök „salan er til en sést hvergi“ [C#3].
  *Lota 7 (17.11.2026, lesið í kóða, ekki í vafra):* sían í `166-krofu-yfirlit.js:709–714` krefst aðeins `greitt_med='reikningur'`
  (og ógreidd, ekki void). `customer_base_id` stöðvar SENDINGU (`payday-push` → 422), ekki birtingu. Sjá handbókina neðar.
- Það má aldrei breyta dagsetningunni á eldri reikning (Agnar 14.08.2026): endurprentun vistaðrar sölu prentar `created_at`; sérdagsetning aðeins úr heimsóknarflæði [C#875].


---

# 📚 Þekkingargrunnur — ÓBREYTTUR texti úr CLAUDE.md

> Fluttur hingað 2026-08-01 við uppskiptingu CLAUDE.md (~15k tokens hlóðust í HVERRI
> lotu). Engu breytt, engu sleppt — hleðst aðeins þegar þessi sérfræðingur er kallaður.

## Sjálfvirkur úttektartexti — `js/patches/294-uttektartexti.js` (2026-07-30)

Þegar „✅ Staðfesta lista" er ýtt (patch 224 `.ut-listlock`) myndast textinn í
„📝 Upplýsingar um úttekt" sjálfkrafa — Elías skrifaði hann áður í hverja skýrslu.
**Orðalag og röð (Agnar/Elías, skjalfest; húsmál 01.08):** (1) „Öll slökkvitæki yfirfarin og vottuð í
lagi." (ónýtt skeytt inn: „…nema eitt sem var dæmt ónýtt") → (2) hleðsla að hluta / ný tæki /
reykskynjarar → (3) stútaskipti **alltaf beint á undan** → (4) „Brunaslöngur prófaðar á fullum þrýstingi."
— vottunina skrifar MAÐUR (sjá húsmálsgreinina neðar). Úrelt eldra orðalag: „Öll tæki", „hausskipti",
„þrýsting og vottaðar í lagi".
Beygingar: brunaslanga kvenkyns (eina/tvær/þrjár), tæki hvorugkyns (eitt/tvö/þrjú).

**Gögnin koma úr sömu heimild og reikningurinn** — `UnitServicePicker.getChoice`
(131) + `DB.cache.units` + trip-state `extras` (hausar = vörur 356
`Brunaslöngustútur 1"` / 352 / 128) — svo textinn getur aldrei sagt annað en
reikningurinn. **Engin DOM-skröpun** (`.ut-svc` ber klasann `on`, ekki `active`;
„Nýtt"/„Ónýtt" byrja eins). NB `getChoice` skilar SJÁLFGEFNU gildi fyrir ósnert
tæki (duft→hleðsla, annað→yfirferð) — viljandi, því 129 rukkar eftir því sama.
`none` (Sleppa) telst hvorki í heild né slöngutalningu.

**Skrifar ALDREI yfir texta sem er þegar í reitnum** (`#_ctc-notes-ta`), vistar í
`tripState.notes` (`slokk_trip_<coId>` — 227 speglar í skýið) svo textinn lifir
endurhleðslu, og gerir ekkert við **afhök**. API: `window.Uttektartexti =
{forskoda, fylla, skanna, hausar}` — `forskoda(coId)` skilar textanum án þess að
skrifa neitt.

**Húsmál (2026-08-01, úr `sara/references/husmal.md`):** orðalag fært á staðfest
húsmál — „Öll **slökkvitæki** yfirfarin" (0 dæmi um „tæki yfirfarin"), „**endurhlaðin**"
(ekki „fékk hleðslu og fulla áfyllingu"; „full áfylling" = 0 dæmi), „Skipt um **stút**"
(ekki „haus" — varan heitir Úðastútur). **Brunaslöngu-VOTTUN aldrei sjálfvirk:** áður
sagði textinn alltaf „prófaðar á fullum þrýsting og **vottaðar í lagi**" um leið og
slanga var í tækjalistanum — liability-gildra (Blikkhella: „…og ein þeirra lekur" → EKKI
vottað). Nú segir hann aðeins „Brunaslanga **prófuð** á fullum þrýstingi." (verkið);
vottunina/leka-athugasemd skrifar maður sjálfur. Vottun leiðist ALDREI af tækjalistanum.

## Svar-stöð — kort af ÖLLUM texta sem fer úr kerfinu (`#svarstod`, 447/447a, 08.10.2026)

Áður en orðalagi pósts, reikningslínu, „vegna"-línu, kröfulýsingar eða úttektartexta er breytt: opnaðu Svar-stöð.
Hver sendileið (27) á spjald með textanum orðrétt, `{breytum}`, skrá:línu og reglum, og númer **SV-01 … SV-27** sem
stendur líka smátt í haus sendingargluggans og í kóðanum við hann (`grep "SV-07"` finnur gluggann). Agnar segir
„breyttu SV-07" — það er spjaldið og glugginn.
- **Gögnin búa í `js/patches/447a-svarstod-gogn.js`.** Breytir þú staðaltexta eða bætir við sendingarglugga: uppfærðu
  spjaldið þar í SAMA commiti (nýr gluggi = nýtt SV-númer + `kodi` í `ReceiptSender.compose/sendDoc` eða
  `window.svKodi('SV-xx')` í hausnum). Merkið fer ALDREI í texta/skjal sem kúnninn fær (netvörður SAFE 08.10).
- **„Þín regla"** á hverju spjaldi = `app_settings.settings->'svarstod'->'reglur'-><leidId>->>'t'` (vistað af Agnari).
  Lestu reglu leiðarinnar áður en þú skrifar texta fyrir hana; hún gengur framar þessari skrá. Sjálfvirku
  sendingarnar lesa hana ekki enn (vörðuð svæði — sér samþykki).
- **Ósamræmi-flipinn** (20 atriði, 08.10) er verklisti: sendDoc sendir brunakerfisskýrslu/samning sem „Reikningur"
  (254:311), „Bankaupplýsingar koma hér" (53:33), gjalddagi 7+3 / 10 / 14, þrjú félagsnöfn, Þjónustuver-svar ekki
  í þræði (309), póststillingar í Stillingum sem enginn les (85/86), o.fl. Lagaðu ekkert þaðan án ákvörðunar Agnars.

## Sjálfvirk PDF-vistun úttektar-skjala — `js/patches/233-uttekt-pdf-autosave.js` (+168/165)

Þegar **úttektarskýrsla** er búin til (patch 168, „📄 Búa til úttektarskýrslu") eða
**heimsókn kláruð með reikningi** (patch 165 `finalizeVisit`, „✓ Klára heimsókn") er
skjalið teiknað sem PDF (jsPDF vektor-texti) og vistað **SJÁLFKRAFA** sem ársmerkt
fyrirtækjaviðhengi gegnum `CompanyAttachments.upload(coId, file, {year, kind})` →
birtist strax í „Skjöl & viðhengi" árstöflunni (patch 199), í úttektarskýrslu-
(`kind:'skyrsla'`) eða reikningsdálki (`kind:'reikningur'`) ársins.

- **Skráarheiti:** `<Fyrirtæki> - <kt> - <ár> - úttektarskýrsla.pdf` ·
  `<Fyrirtæki> - <kt> - <ár> - R-xxxxxx.pdf`.
- **Reikningurinn** er teiknaður í patch 233 (`window.UttektInvoicePdf.saveForSale(coId, sale)`)
  sem **vektor-eftirmynd af prent-forskoðuninni** (SalaInvoice): logo + seljandi
  (branding úr `AppSettings`), kaupandi m/ heimilisfang+kt, reiknings-haus
  (dags./greiðsluskilmáli/starfsmaður), línutafla (Vörunr./Lýsing/Fjöldi/Einingav./
  Upphæð/VSK-kóði) og „Samtals fyrir Vsk" + VSK-sundurliðun per taxta + „Til
  greiðslu" + reglugerðar-fótur. Sækir nafn+kt+**heimilisfang** úr `fyrirtaeki`,
  línur/tölur úr `solur`-röðinni; seljandi „Brunahólf Slökkvitæki ehf.“ (heiti
  félagsins á PDF — Agnar 29.10.2026; kemur úr `AppSettings.branding.company_name`)
  kt 600508-0400.
  **html2canvas-myndataka var vísvitandi EKKI notuð** — hún teiknar autt í vafra
  Agnars (sjá patch 168), svo vektor-leiðin er notuð (prentast í öllum vöfrum,
  valanlegur texti, lítil skrá).
- **Afsláttur á hvern lið (2026-07-08, patch 129+165):** Afsl.-dálkur (%) í
  Heildarkostnaðar-töflunni — þjónustulínur geymast í trip-state `line_disc`
  (lykill `svc|<tegund>|<stærð>|<kind>`), extras á `extras[i].disc_pct`. Línu-
  samtala = fjöldi × round(verð×(1−afsl%)); per-stk sýnist óbreytt. Reikningurinn
  (165 `scrapeCostRows`/`buildLinur`) les Afsl.-reitinn og setur AFSLÁTTAÐ
  einingaverð + „· −X% afsl." í línulýsinguna — flæðir þannig rétt í solur/
  SalaInvoice/PDF (233) án schema-breytinga. Heildar-afslátturinn (%) er áfram
  til og leggst OFAN Á línuafslætti.
- **Totals-leiðrétting (patch 165 `finalizeVisit`):** salan er nú vistuð með
  `upphaed_an_vsk`/`vsk_upphaed`/`samtals` **reiknuð beint úr `linur`**
  (`totalsFromLinur` = sama stærðfræði og SalaInvoice prentar), EKKI lengur skafin
  úr patch-129 DOM-inu (`readTotalsFromSection` fjarlægt). Eldra skröpið setti VSK-
  upphæðina sem heildartölu (vsk_upphaed=0, samtals = án-vsk × 0,24) — sást á
  Bókhalds-yfirliti; 7 raðir (R-000356/357/358/363/365/371/372) voru líka
  leiðréttar í gagnagrunni úr `linur`.
- Patch 168 fær líka **rétt skráarheiti á handvirka „💾 Vista" takkanum** + sjálfvirka
  vistun við opnun, með **tvíritunarvörn** (sleppir sjálfvirkri vistun ef
  úttektarskýrsla ársins er þegar til; reikningur ef R-númerið er þegar vistað).
- **NB geymslustaður:** vistast í Supabase `samningar` bucket (sama og handvirk
  viðhengi patch 111), **EKKI í Google Drive „Allt" möppuna** — þessi vefur hefur
  ekki Drive-aðgang (engin googleapis/OAuth Netlify-function). Drive-pörunin lifir í
  Brunahólf-appinu (sjá „Laga pörun í Brunahólf →" hlekkinn á skjalaspjaldinu). Ef
  á að lenda í Drive þarf að flytja Drive-OAuth + upload-function úr Brunahólf.
- **Tvítökuvörn (2026-08-01, `finalizeVisit` byrjun):** „✓ Klára heimsókn" gat búið til
  tvo eins reikninga (BGT R-000664/665, Rafha R-000546/547 — ýtt tvisvar, engin vörn).
  Nú spyr `finalizeVisit` FYRST hvort reikningur úr úttektarflæði (`source='uttekt'`,
  `status='final'`) sé þegar til fyrir sama `customer_nafn` SAMA DAG → `confirm(...)`,
  „Hætta við" sleppir. Fellur leitin → heldur áfram (ALLTAF LEYFA VISTUN). Fyrri tvítök
  hreinsuð með `status='void'` (`/api/solur` skilar aðeins `final`).
- **Grænu „yfirfarið"-hökin haldast (2026-08-01, patch 224):** `_done` var aðeins í minni
  svo grænu ✓-hökin hurfu við endurhleðslu/opnun listans. Nú geymd per-fyrirtæki í
  `localStorage['sk_ut_done_<coId>']` (`loadDone` í `inner()`, `saveDone` við ✓/eyðingu);
  hreinsast þegar heimsókn er kláruð (165 fjarlægir lykilinn). Hökin eru SJÓNRÆN — stýra
  EKKI rukkun. Bulk-add (73) sjálfgefið magn 1 (var 20).
- **Duft 2 kg. ABC yfirferð (vara id 358, 2026-08-01):** vantaði svo 2kg-duft „yfirferð"
  verðlagðist ekki. Stofnuð @ 3.600 m.vsk (2903.23 án vsk, Þjónusta). 129-token-matcherinn
  (les virkar vörur lifandi) parar hana sjálfkrafa — bara varan, engin kóðabreyting.
- **Bundle-send á fyrirtækjaprófíl (2026-08-01, patch 199):** 199 „Skjöl & viðhengi" er
  búntið per ári (skýrsla + reikningur + 📧 Senda, ÖLL ár lifandi). Sölu-skráður reikningur
  án Drive-PDF (`_saleId`) er nú teiknaður sem PDF beint úr sölunni gegnum
  `ReceiptSender.invoiceAttachment` (sami háttur og 253 Fyrri viðskipti-búntið) svo
  reikningurinn dettur ALDREI úr búnti („nothing disappears"), líka fyrir eldri ár.

## Ritanlegt PER STK-verð + Reykskynjari-kortlagning — 129/165/128/73 (2026-07-31)

Tvær breytingar á Heildarkostnaðar-töflunni (patch 129 `#_ctc-section`) sem báðar
FLÆÐA í reikninginn gegnum 165 `scrapeCostRows`/`buildLinur` → `solur` → PDF (233):

- **PER STK er RITANLEGT — bara fyrir ÞESSA úttekt/heimsókn** (Agnar: „breyta
  verðinu í skýrslunni … bara akkúrat þessi skýrsla"). Yfirskriftin geymist í
  trip-state `line_price` með SAMA lykli og `line_disc` (`svc|<tegund>|<stærð>|
  <kind>`), forfyllt úr búðar-/fyrirtækja-yfirverði. `priceFor(key,def)` les hana,
  `priceCell(key,def,override)` teiknar `._ctc-line-price` reitinn (ber `data-def`).
  **BREYTIR ALDREI `vörur.verd_an_vsk`** né `CompanyPricing`-yfirverði — situr aðeins
  á ferðinni. Afsláttur (%) leggst OFAN Á (röð: `discUnitOf(priceFor(...),dPct)`).
  Tómur reitur SKRIFAR `data-def` (ekki eyðir lykli) svo 227 skýja-merge resúrekti
  ekki gamalt yfirverð á hinu tækinu — sama gildra og `line_disc` leysir með 0.
  165 `scrapeCostRows` les nú `._ctc-line-price` reitinn (fallback á textaN).
- **Reykskynjari-afbrigði → BEINT á Sölu-vöru** (Agnar): afbrigðið er geymt í
  STÆRÐ-reitnum (`uttaeki.size`) og kortlagt á vöru á búðarverði × heildarfjölda:
  Batterís → „Reykskynjari" (grunn, „1") · Langlífis → „Reykskynjari 2" ·
  Samtengjanlegir/samtengdir → „Reykskynjari 3". `reykVariantProduct(type,size,
  services)` (í 129 OG 128, sama regla) tekur FORGANG — token-matcher-inn réð ekki
  við tölu-afbrigðin (1/2/3 lítur út eins og stærðar-tóki). Venjulegt reykskynjari
  (án afbrigðis, null-stærð) heldur fyrri hegðun (Yfirferð Reykskynjari, id 33).
  Bulk-add (patch 73) sýnir afbrigðin þrjú sem Stærð-valkosti þegar Tegund=Reykskynjari.

## Afsláttar-samræming (úttekt 2026-07-08) — 121/142/165/233

Full-system discount audit found & fixed three writer bugs. **The one supported
convention for sale-level discounts is the POS one:** `linur` carry FULL unit
prices, `afslattur` = kr saved off the FINAL price m. vsk (gross), `samtals` =
brúttó − afslattur, `upphaed_an_vsk`/`vsk_upphaed` scaled proportionally (VSK
takes the rounding remainder so ex+vsk === samtals). Per-line discounts are
instead BAKED into `unit_price_ex_vat` with a „· −X% afsl." desc suffix (the
165 convention). NEVER both bake into lines AND store `afslattur` — that's the
double-discount bug; and never store per-line `discount_pct` together with
`afslattur > 0` (renderFromSale case B drops both).

- **121 (Sótt)**: used to scale lines AND store afslattur (reprints double-
  discounted), and silently DROPPED the draft's POS discount. Now: lines stay
  full, `afslattur` = draft-afsl + pickup-% on the remainder; preview shows
  „Afsláttur úr sölu". 16 pre-fix rows were repaired in DB (afslattur→0, their
  linur already carried the discount).
- **165 (Klára heimsókn)**: the patch-129 GLOBAL Afsláttur (%) was never read —
  invoice saved at full price while the table showed the discounted total. Now
  `collectVisit` reads `trip.discount_pct` and `totalsFromLinur(linur, g)`
  stores it as gross `afslattur` (same math as the table: netto = brúttó×(1−g)).
- **142 (SaleEditor)**: recompute ignored `afslattur` and the save omitted it —
  any save wiped the discount out of samtals but left the stale column (print ≠
  bókhald). Now an „Afsláttur (kr m. vsk)" field, initialized from the gap
  brúttó−samtals (handles both gross and legacy ex-VAT rows; 0 for already-
  broken rows so saving heals them), applied+saved like POS. If line
  `discount_pct` + kr-afsl are combined, line discounts are baked at save.
- **233 (PDF)**: gross-mode now scales the per-rate VSK buckets by the discount
  factor (like SalaInvoice totalsByRate) — archived PDFs no longer overstate VAT.

2026-07-09 status: the "fixes 4-7" batch closed the rest of the audit list —
renderFromSale line-disc + kreditreikningur print, dk-push (brunahólf solur.js
now carries afslattur/discount_pct/vsk_pct, payday-push discount via #250),
pos.js kr-input comma/dot parse, and lookupKt max-wins (mitigated at the WRITE
sites: 158 + 255 mirror afslattur_pct to every fyrirtaeki/vidskiptavinir row
sharing the kt, so lowering propagates). Patch 227 trip-resurrect was ALSO
fixed in #317 (removeItem → cloud tombstone `_deleted:true`, newest-wins).
The discount-audit list is fully closed.

## Reikninga-póstur (reikninga-póst-hjálpari) — `js/patches/240-reikninga-postur.js`

Sjálfstæð síða (view `view-reikninga-postur`, slug `#reikninga-postur`/`#postur`,
hliðarstiku-hnappur „📧 Reikninga-póstur") sem les póst-hólfið **eldklar@eldklar.is**
(+ bokhald@eldklar.is) BEINT úr shared `email_digest` (engin ný tenging) og tengir
hvern póst við kúnna/reikning svo „hver spurði um hvaða reikning" sé á einum stað.

- **Tenging (áreiðanlegast fyrst):** (1) kt í efni/texta → `custByKt` · (2)
  sendandi-netfang → `custByEmail` (AÐEINS einkvæm netföng; deildir umboðsmanna-
  póstar eins og `gjaldkeri@eignaumsjon.is` sem senda fyrir mörg húsfélög eru
  útilokaðir) · (3) R-númer (`R-0\d{5}`) → sala → kúnni (fallback).
- **Flokkar:** 📥 Til að svara (innhólf, spurningar efst) · 🧾 Sendir reikningar
  (delivery@payday.is afrit) · Allt. `isSystem` felur noreply/rsk/microsoft o.fl.

**Tier 2/3 aðgerðir per póst** (2026-07-03, PR #265):
- **✉️ Senda** — velur einn af reikningum kúnnans (`solur` eftir `customer_kt`),
  teiknar hann sem PDF gegnum `UttektInvoicePdf.buildInvoiceBlob` (patch 233) og
  sendir gegnum Gmail (`AppMail` → `/api/gmail-send`, 240-reikninga-postur.js:1716;
  `/api/email-send`/Resend er DAUÐ fyrir eldklar.is) á hvaða netfang sem er (forfyllt með
  sendanda). Tómt ástand er heiðarlegt: húsfélög sem eru rukkuð í dkPlus/Payday
  eiga engar `solur`-raðir → „Engir reikningar fundust".
- **✏️ Breyta** — opnar reikninginn í sölu-ritli (`SaleEditor.openById/openByNum`,
  patch 142). Birtist aðeins þegar R-númer tengdist (`m.sale`).
- **🤖 Svar** — Claude semur STUTT íslenskt uppkast að svari gegnum NÝ Netlify-
  function **`netlify/functions/postur-reply.js`** (`/api/postur-reply`, Haiku,
  ANTHROPIC_API_KEY server-side) út frá póstinum + nýlegum reikningum kúnnans.
  4 stýri-chip (Sendi reikning / Bið um uppl. / Leiðrétti reikning / Staðfesti
  greiðslu). Uppkastið er ritstýranlegt → 📋 Afrita eða 📤 Senda svar (Gmail, `/api/gmail-send`).
  **Skrifstofan yfirfer ALLTAF áður en sent er** — endpoint semur bara uppkast.

- **Sendandi:** sjálfgefið eldklar@eldklar.is; geymt gildi er aðeins virt ef það er tengt
  Gmail-hólf (eldklar@ eða bokhald@eldklar.is, 240:1395–1401). reikningar@eldklar.is er
  EKKI tengt hólf og er ekki notað.
**Handvirk merking + minnispunktur** (2026-07-03): „🏷️ Merkja" takki á hverjum
pósti opnar modal þar sem hægt er að (1) setja **flokk handvirkt** — þ.á m. nýja
**„🧾 Senda kröfu"** flokkinn (`SENDA_KROFU`, cls `fire`, orange) sem er MANUAL-only
(aldrei sjálf-greindur) — handvirkur flokkur kemur í stað sjálfvirka `tagFor()`
gizksins og birtist í flokka-síuröðinni + sem litað merki á kortinu; og (2) skrifa
**minnispunkt** sem birtist sem 📝 lína á kortinu. Geymt í nýrri Supabase-töflu
**`reikninga_postur_meta`** (`message_id` PK, `manual_tag`, `note`, `updated_at`;
RLS OFF, anon select/insert/update/delete) — samstillist milli tækja. `metaFor(m)`
leysir per samtal (öll `_threadIds`). Public: `saveMeta(message_id, manual_tag, note)`.

- **Modal** er bætt á `<body>` (utan `.view`) svo patch 245 skinnið snerti það ekki.
- Wiring eins og 239: view-div, klónaður hliðarstiku-hnappur, App.switchView hook,
  patch 218 ALIAS (`postur`/`reikningapostur`). Public API `window.ReikningaPostur
  = { open, reload }`. Verður READ→WRITE með Tier 2/3 (var read-only í v1).

## Payday-spegill — `payday_invoices_slokk` + `netlify/functions/payday-pull-slokk.cjs` (2026-07-10)

Payday gefur reikningum SÍN eigin númer — kúnnar hringja og nefna Payday-númerið
en hluti krafna er stofnaður beint í Payday (bókari/mánaðaruppgjör) og á enga
`solur`-röð → fannst ekki í kerfinu. Lausnin:
- **`payday_invoices_slokk`** (Supabase): spegill af ÖLLUM reikningum
  Slökkvitæki-Payday-aðgangsins (payday_id [upsert-lykill], number, kt,
  customer_name, amount_total, created/due/paid_date, status, reference,
  description). AÐSKILIN frá `invoices` (sem er Brunahólfs-Payday — Skuldunautar/
  Krófur-talnaverk mega ekki blandast).
- **`/api/payday-pull-slokk`** — `?probe=1` (auth-test) · `?dry=1` · `?all=1`
  (ALLT, fyrsta keyrslan) · sjálfgefið síðustu 180 dagar. Sömu creds og
  payday-push/payday-sync-paid (deilir token-cache `payday_oauth_slokk`).
  **payday-sync-cron** (10:00 + 15:00) keyrir spegilinn daglega á eftir
  greiðslu-samstillingunni.
- **Patch 253 (Fyrri viðskipti)**: Payday-kröfur kúnnans (eftir kt) fléttast
  í listann — fjólublá „PD <númer> · Payday"-röð með gjalddaga/stöðu; sölur
  sem fóru gegnum payday-push (solur.dk_invoice_id = payday id/númer) fá
  PD-merkið á SÍNA röð í stað tvítekningar. Samantektarlínan sýnir
  „+ N Payday-kröfur · X kr".


## Reikningsupphæðir: skráarheitið er uppsprettan, ekki endurlestur á PDF

Mælt 29.08.2026 við að fylla 278 vantandi upphæðir.

**Kanóníska Drive-heitið ber upphæðina** — `drive-sort.js` `nameInvoice()`
skrifar `Fyrirtæki - heimilisfang - kt - R-nnnnnn - ár - N.NNN kr.pdf` og setti
þá tölu ÞEGAR það hafði lesið PDF-ið rétt. Hún er því ekki ágiskun heldur gildi
sem kerfið reiknaði áður. Í einu tilviki sem tókst að sannreyna sjálfstætt
(R-000544) var HEITIÐ rétt og talan í gagnagrunninum röng.

**`/api/efnislisti-amount` má EKKI nota í fjöldafyllingu.** Hún tekur hæstu tölu
í skjalinu og skilaði **kennitölunni** (450905) fyrir 6 af 9 prófuðum
Center-reikningum. Endapunkturinn segir það sjálfur í haus: „only a suggestion —
the user confirms it with one click." Prófaðu alltaf á sýnishorni áður en skrifað
er — það eitt kom í veg fyrir að kennitala yrði sett sem reikningsupphæð á
viðskiptavinavefinn.

**Þrjár varnir sem allar reyndust nauðsynlegar:**
  1. R-númerið í heitinu VERÐUR að stemma við `invoice_number` — eitt skjal bar
     upphæð af öðrum reikningi.
  2. KREDITREIKNINGAR eru geymdir NEIKVÆÐIR í grunni en heitið ber jákvæða tölu.
  3. Skynsemismörk (1.000–50.000.000) svo kennitala eða ártal rati ekki inn.

**Afturkræft:** afrit í `backup_20260829_amount_fill` (venja repósins).
Reikningar án upphæðar fóru úr 381 í 103 af 1.464.

## Reikninga-tegundin (`vidskiptategund`) stýrir því hvað SÉST

Mælt 01.09.2026 eftir að Agnar sagði „ég sé engan reikning á síðunni" um
reikning sem var til, rétt tengdur og með virkum tengli.

`customer_documents.doc_type` er alltaf `'reikningur'` fyrir allar þjónustur.
Raunverulegi merkimiðinn er **`vidskiptategund`**: `uttekt` · `bud` ·
`brunakerfi` · `slokkvikerfi` (frá 05.10.2026, sjá kaflann um slökkvikerfisreikning) · `ovisst`/null.

**Tveir staðir henda búðarreikningum, báðir viljandi:**

| Skrá | Fall | Áhrif |
|---|---|---|
| `187-inservice-row-reports.js` | `isUttektInvoiceTeg()` | 🧾 á Ársskoðun kviknar ekki |
| `199-doc-year-grid.js` | `pushInvByService()` — `if (knd==='bud') return` | dettur út úr **báðum** þjónustuflokkum árs-grindarinnar |

Reglan er rétt og á að standa: staðgreidd búðarsala er ekki
slökkvitækjaþjónusta og má ekki lita árið grænt. **En hún má ekki hverfa.**
Frá 01.09.2026 birtast allir reikningar staðarins í **📒 Hreyfingar** neðst á
fyrirtækjaspjaldinu (tegund · dagsetning · chip · upphæð · summa), byggt úr
sömu `docs` — engin ný fyrirspurn.

Dreifingin á þeim 28 fyrirtækjum sem voru tóm og áttu Drive-reikning:
**23 `uttekt` · 3 `bud` · 1 `brunakerfi` · 1 óflokkað.**

**Hvernig þekkja má búðarsölu á reikningnum sjálfum:** staðgreiðsla, engin
`Yfirferð`-lína, enginn `Akstur`, engin `Skýrslugerð og vottun`. Aðeins
vörulínur. Dæmi: NR5 ehf R-108161 — 3 léttvatn + 1 CO₂ 5 kg, 56.775 kr,
staðgreitt. Rétt flokkað sem `bud`; fyrirtækið hefur aldrei fengið
þjónustureikning.

## Reikninga-PDF: orðaforðinn og gildrurnar

Gamla bókhaldskerfið og nýja Sölu-kerfið nota **ólíkt orðalag** á sama hlut.
Bæði koma fyrir í Drive-möppunni:

| Gamla | Nýja |
|---|---|
| `117 Slökkvitæki Léttvatn 6 ltr.` | `Nýtt · Léttvatn 6 kg. AB Slökkvitæki` |
| `133 Yfirferð Léttvatn 6-9 ltr.` | `Yfirferð · Léttvatnstæki 6L. yfirferð` |
| `123 Hleðsla Léttvatn 6-9 ltr/duft` | `Hleðsla · Léttvatnstækis 6L. hleðsla` |
| `060 Skýrslugerð og vottun.` | `Skýrslugerð` |

**Gildrur, allar hittar 01.09.2026:**

- **Vörunúmer 123 „Léttvatn 6-9 ltr/duft"** — eitt verð fyrir hvort tveggja.
  Fjöldinn segir ekki hvor tegundin. Skráðu óvissuna með tölunni.
- **Tala í vöruheiti er ekki alltaf magn.** `Reykskynjari 2` / `Reykskynjari 3`
  eru gerðir. Flettu einingaverðinu upp í `vorur` — það sker úr.
- **PDF getur borið TVO reikninga** á sitthvorri síðu (R-107753 Fagkaup bar
  óskyldan „UVS-57 Bjarki verkstæði Sindra"). Línan gildir fyrir hausinn sem
  hún stendur undir.
- **`customer_documents.amount` getur verið rangt.** Hamraborg R-000577: raðan
  segir 26.884 kr, PDF-ið segir „Til greiðslu 16.220 kr". Treystu PDF-inu.
- **Reikningur stílaður á annað félag** tengist staðnum gegnum fótnótuna
  `Vegna <staður>`.

Staðfestu ALLTAF hverja línu með margföldun: fjöldi × einingaverð = upphæð.

## Kostnaðarreikningar bíða — borði í Sölu (355, 06.09.2026)

Birgjareikningar sem á að endurrukka búa í Drög-stöð hubbsins (`reikningspunktar.karfa.kostnadur`).
`js/patches/355-kost-vidvorun.js` spyr `GET brunaholf.netlify.app/api/reikningspunktar?op=bidur&kt=&kunni=`
þegar kúnni er valinn í söluborðinu (POS.getState().customer, 1,5 s vöktun) og sýnir borða `#_kost-banner`
í kúnnakassanum: hvað bíður, endurkrafa án vsk, **🛒 Sækja í körfu** (`POST {action:'kost_til_korfu',
id, sent:true}` → hubbinn býr til karfa.lines á söluverði úr 🧾-línunum, kreditnótur sleppa, merkir
senda → 352 `KarfaUrDrogstod.hlada(row)` hleður í POS-körfuna) og **Opna í Drög-stöð ↗**
(`/?punktur=<id>#drogstod`). Sama fyrirspurn í brunakerfisskýrslunni (273 `openForm` vafið) →
viðvörunarborði `._bks-kost` efst í forminu; skýrslan sjálf breytist ekki, reikningurinn verður til í Sölu.
Regla (Charlize #410): afsláttur birgja kemur aldrei á reikning kúnna — línurnar koma á fullu listaverði.
Vörðuð POS-leið (121/pos.js) er ósnert; hleðslan fer sömu leið og „Senda í körfu" úr Drög-stöð.

## Slökkvikerfisreikningur — `386-slokkvikerfi-skyrsla.js` (05.10.2026)

Agnar (Hótel Varmaland): „getum ekki útbúið reikninginn, bara skýrsluna … láta þetta virka svipað og
ársskoðun … fari svo í kröfuyfirlit með skýrslunni og sendir hana með". Ferillinn er nú sá sami og 165:

1. 🍳 Slökkvikerfi-flipinn → „Ljúka skoðun" → **🧾 Búa til reikning — N kr** (aðeins þegar lokið + verð á línum).
2. Forskoðun (`SalaInvoice.renderFromSale` í iframe) → „✓ Staðfesta" → `solur` **final**,
   `greitt_med:'reikningur'`, **`source:'slokkvikerfi'`**, athugasemdir = vegna-texti
   („Skoðun slökkvikerfis — <kerfi>, <dags>"). Línur í röð reikna(): Skoðun · Vinna · annað · Skýrslugerð ·
   Akstur; línuafsláttur bakaður í einingaverðið með „· −N% afsl."; heildarafsláttur í `afslattur` (165-stærðfræðin).
3. `UttektInvoicePdf.saveForSale` (233, aðeins KALLAÐ) + prentgluggi → Kröfu yfirlit.
4. Skoðunin er TEKIN (`reikningur_at`, skilyrt á `updated_at`) ÁÐUR en salan verður til; `sala_id` tengir á
   eftir. Villa í sölu → takinu sleppt + `logProblem('slokkvikerfi_reikningur_failed')`. Tak > 2 mín án
   sala_id → „Ljúka reikningsgerð" leitar fyrst að sölu sem gæti hafa orðið til (enginn tvítekinn). Ógilt sala
   opnar fyrir nýjan reikning; annars eru kostnaðarlínurnar læstar.

**Skýrslan sem fylgir:** 166 `resolveSkyrsla` gefur slökkvikerfissölu AÐEINS `doc_type='slokkvikerfi'`
(fyrst skjalið sem skoðunin vísar á: `slokkvikerfi_skodanir.sala_id → doc_id`), aldrei fyrirtækjaviðhengi.
`payday-push` skýrslugáttin hleypir `uttekt` OG `slokkvikerfi` í gegn; slökkvikerfissala fær
`findSlokkvikerfiPdf` (sama tenging, varaleið sami staður+ár, nafn `Slokkvikerfisskyrsla-ÁÁÁÁ.pdf`) — aldrei
slóð frá vafranum. Ástæða: Varmaland á BÆÐI slökkvitækjaskýrslu og slökkvikerfisskýrslu sama árs.

**Tegundin:** `set_vidskiptategund` merkir source `slokkvikerfi` → vidskiptategund `slokkvikerfi`
(`sql/slokkvikerfi_reikningur.sql`). Áður las hann línurnar og Skýrslugerð+Akstur urðu `uttekt` = falskt grænt
slökkvitækjaár. `auto_pair_customer_document` parar slíkan reikning aldrei sjálfkrafa. 187/190
`isUttektInvoiceTeg` sleppa `slokkvikerfi`. Vörður: `tools/audit-slokkvikerfi-reikningur.cjs`.

**Prófun án þess að taka R-númer:** Playwright með `DB.sb.from` vafið — `solur.insert` skilar gervisölu
(`R-PROF`, id −77), `slokkvikerfi_skodanir.update` gervirröð, `UttektInvoicePdf.saveForSale` og `window.open`
stubbuð. Kröfu yfirlit: `ctx.route` á `/rest/v1/solur?…greitt_med=eq.reikningur` bætir gervisölunni í svarið og
`/api/payday-push` er fulfill-að með 500 — beiðnin sjálf sýnir hvaða skýrsluslóð færi með.

## Birgðir ↔ Vörur og þjónusta — `36-stock-management.js` + `vorur.js` (05.10.2026)

- **Ein vöruskrá:** Birgðir lesa `vorur` (allar söluvörur) + brunakerfisvörur úr Kostnaði. Birgðastaða =
  `vorur.birgdir` (null = ótalið, hreyfist ekki); sama tala í Vörur og þjónusta.
- **Þrjú verð:** kaupverð = `kostnadarverd` (línuupphæð/magn á innkaupareikningi = eftir afslátt), listaverð =
  `listaverd` (einingaverð birgja fyrir afslátt; `sql/vorur_listaverd.sql`), söluverð = `verd_an_vsk`.
  Álagning sýnd þegar kaupverð er til. Öryggismiðstöðvar-reikningar 4 og 190 eru með línur M. VSK → deila með 1,24.
- **Selt + sjálfvirk hreyfing:** `sql/vorur_selt_og_birgdahreyfing.sql` — `solulina_vara()` parar sölulínu við
  vöru (product_id, annars nafn án „Nýtt · "/afsláttarhala); aðeins `status='final'`, aðeins sölur eftir
  talningarbyrjun; triggerinn kastar ALDREI (sala má ekki falla vegna birgða).
- **Gildra:** innsetning í `vorur` hverfur hljóðlaust ef nafnið er á `sala.deleted_product_names`
  (trigger `vorur_hafna_eyddum`). Taktu nafnið af listanum fyrst, eins og vorur.js gerir.
- Vörumyndir: data-URL JPEG ~600×600 á hvítum grunni (sjá minni `vorumyndir-hvitur-bakgrunnur`).

## Hreyfingarlisti (167) og Drög (143) — skilgreiningarnar (05.–09.10.2026)

- **Ógreitt** (`erOgreitt` í `js/patches/167-hreyfingarlisti.js`) = Kröfu yfirlit (greitt_med `reikningur`, ógreitt,
  ekki `void`, ekki kreditfært) + „Til að rukka" (`final` + `greitt_sidar`) + drög sem bíða í afgreiðslu.
  Agnar 05.10: „bara það sem er í Kröfuyfirlit ógreitt, og síðan það sem er eftir í afgreiðslu ekki búið að
  sækja". Kreditfært = einhver kreditnóta vísar á id-ið með `credit_of` — sótt fyrir ALLT tímabilið (kreditnóta í
  október á reikning úr september). Mælt 05.10: gamla reglan 6.955.840 kr (kreditfærðir 3,43 m, bakfært 0,81 m og
  öll drög töldust), rétt 2.348.149 (41 krafa = Kröfu yfirlit + 8 drög í afgreiðslu).
- **Í afgreiðslu** = drög (`status='drog'`, ekki `hidden`) með verkbeiðni `ready` og enga `received` /
  `inprogress` / `in_progress` — sama regla og `locFor` í `js/patches/143-drog-list.js`. Lestu ALLAR verkbeiðnir:
  sumar heita eins og salan sjálf (R-001002, engin `-V1`), og sía `like 'R-%-V%'` missti þær.
- **Sölur / Greitt / Nettó:** bakfærðar (`void`) sölur eru úti síðan 08.10. Hvort drög eigi að teljast er opin
  spurning (mál 1119).
- **Uppruni** (`solur.source`): `pos` + `sott` = Búð / söluborð · `uttekt` = Ársskoðun (165, 418) · `brunakerfi`
  = Brunakerfis skoðun (273, 291) · `slokkvikerfi` = Slökkvikerfis skoðun (386, frá 05.10) · annað (`vinnublad`,
  `claude`, `claude-krofuyfirferd`, null). Kreditnóta fær uppruna reikningsins sem hún bakfærir.
- **Sjálfgefin röðun:** Skráð, nýjast efst, og fest efst „Síðasta afgreiðsla" (nýjasta `final` sala með source
  `pos`/`sott`) með Breyta og PDF — Agnar vill finna afgreiðsluna strax ef þarf að breyta henni. Tölurnar efst
  telja ALLT; listinn teiknar 150 í einu (09.10, #1126).
- **Drög-staðsetning** (143): Verkstæði (received/inprogress) › Afgreiðsla (ready) › Sótt · klára (collected) ›
  Verkbeiðni afturkölluð (cancelled) › Verkbeiðni eytt › Bara drög. „Enginn viðskiptavinur" = greitt síðar /
  reikningur án `customer_id` og `customer_base_id` — krafan verður ekki send (vörðurinn `audit-solu-id`).

## Lærdómur

- **30.09.2026** — ÓNÝTT TÆKI RUKKAST NÚNA (28.09): valið 'onytt' í ársskoðun féll áður í skip og hvarf af reikningnum. Tækið var yfirfarið — vinnan var unnin þótt niðurstaðan sé ónýtt. 129 gefur því eigin röð sem sækir VERÐ OG VÖRU YFIRFERÐAR (verdKind='yfirferd'); kindKey ræður aðeins merkinu, litnum og afsláttarlyklinum. Textinn á reikningi kemur úr ONYTT_SKYRING í 129 — EINI staðurinn sem þarf að breyta, því 165 scrapeCostRows les undirlínuna orðrétt í desc. Umfang: ársskoðun ein; verkstæðisleiðin (269) setur status='onytt' og dettur út um NONBILL. (js/patches/129-company-total-cost.js, js/patches/165-visit-workflow.js)

- **30.09.2026** — BUD vs UTTEKT er MERKING, ekki sannleikur um vinnuna. invoiceServiceKind í 199 les customer_documents.vidskiptategund: 'bud' þýðir 'birtist á hvorugu skoðunarkortinu', svo úttekt sem var slegin á kassann sýnir 'REIKNINGUR VANTAR' þótt reikningurinn sé til, greiddur og með skrá. Leiðrétt 28.09 á R-000931 (Pitstop, source=pos) og R-000430 (Suðurvangur, source=uttekt EN tegund bud — tvær ólíkar rætur, sama einkenni). Leitarmynstur sem virkar: bud-merkt sala þar sem línur bera Akstur eða Skýrslugerð — þær línur koma aðeins úr úttektarflæðinu.

## Lærdómur

- **15.10.2026** — 15.10.2026 (regla Agnars: engar per-tækis stillingar): email_mode/email_from/slokk_send_from eru nú AppSettings 'stillingar.postur.{hamur,sendandi,kvittunSendandi}' (29/254), SMS-stillingar 'stillingar.sms.*' (33/37), fyrirtækisstillingar 'stillingar.fyrirtaeki.*' (44/53), tímagjald 'stillingar.timagjald' (43). Leyndarmál (resend_api_key, twilio, ja_is) eru ENN í localStorage — eiga heima í Netlify env, sér verk. drog.sort (143) og krofur.sort (166) eru Vidmot-lyklar.

- **16.10.2026** — Uppgjör lota 16.10.2026: (1) Drög úr skýrsluformi (273/291) verða að bera afslátt PER LÍNU bakaðan í einingaverð („· −N% afsl.", 165-reglan) — R-001082 fór á fullu verði 05.10 („máaaa ekki andsk gerast"), lagað 1125ad6; Brunakerfi 274 verð-kortið er RITANLEGT (Magn/Verð/Afsl.%, vistast 900 ms/change + keepalive), verðlistinn fékk Akstur 3.000 og Vinna pr. klst 13.200 (window.BrunakerfiVerd); „📦 Efni úr innkaupum" í 273 setur kostnaðarreikninga birgja inn á FULLU verði (afsláttur birgis fylgir ekki). Regla: biðji Agnar tvisvar um að BREYTA tölu → gera hana ritanlega. (2) 09.10 fóru ÞRÍR reikningar út með innri texta (R-001117 Sjúkraþjálfun Selfoss kt fyrri eigenda; R-001109 Eldsalir „Endurútgáfa R-001029…"; R-001110 Gára tilboðsnr = í lagi): grunnurinn man ekki (athugasemdir má breyta), Payday-spegillinn man; ℹ-takki á Kröfu yfirlits-röð skrifar aðeins krafa_note. (3) ↩ Bakfæra afturkallar kröfu í Payday (full kredit, ógreidd) — Charlize #876; solur_status_check drog|final|void, 291 skrifaði draft (#871). (4) Fjármál-spjöld 167: sales taldi void-sölur (R-001063 707.224) en erOgreitt ekki; hvert spjald er nú síutakki á nákvæmlega raðirnar sem talan kemur úr; „182 sölur" telur 16 kreditfærslur. (5) bud-úrskurður 28.09: Akstur/Skýrslugerð-lína á bud-sölu segir að farið var á staðinn, en Agnar valdi aðeins Suðurvang 23b (R-000430) til endurmerkingar; Hagvagnar R-000462 og Gára R-000599 standa sem búðarsölur; 20 tilvik/652.826 kr óhreyfð. (6) js/patches/201-tilbod-hub.js Sérverð (25.09): 🧯/🚨 takkar sækja línur úr 15 síðustu reikningum (tíðni, nýjasti fremst), flokkar með fyrirsögn („Ný tæki" fyrst), ⋮⋮ dráttur, fyrirsögn án hakaðrar línu prentast ekki. (7) „Sjá aðrar vörur": söluborð sýnir aðeins ⭐-vörur í flokki um leið og eitthvað í flokknum er ⭐ — CO₂ 100 gr (83) „datt út" 18.09 af því, ekki bilun. (8) Endurprentun vistaðrar sölu prentar created_at — aldrei breyta dagsetningu eldri reiknings (Charlize #868). (9) vorur.krefst_verkbeidni stýrir verkbeiðni+QR (Charlize #861); trip-sync 227 gallar + #32 opið (#862). (10) Miðatalning í js/patches/07-sala-checkout-dialog.js:359–366 telur miða með regex hleðsla|áfylling|yfirferð|skoðun … || 1 — „1 miði" á R-001168 kom þaðan; undiragent lagði til að telja allar þjónustulínur, ólagað. (11) Payday-reiturinn heitir accountingCost (apidoc.payday.is); fyrirtaeki.bokunarnumer (sjálfgefið „nafn staðar – gata" þegar kt á fleiri en einn stað) er í payday-push en í engu skjali; aldrei stadur_nr eitt og sér. (12) R-000518 (0 kr final) er ÓVILJANDI 100 % afsláttur, ekki ótekjufærð sala; POS-teljari 01-sala-suite er óatómískt max(num)+1 og num er texti → R-000528 á tveimur final (573/575), R-000527/598/599/600 — val Agnars hvor heldur númerinu ósvarað.

- **26.10.2026** — Sérkjör (26.10.2026, commits 7958a41d, b27e062f, c0aaa44f): samningsafsláttur getur verið FLATUR (pct) af lifandi verðskrá, ekki eitt verð per vöru — Sérkjör-spjaldið laug um verðið þegar afslátturinn er flatur og segir nú prósentuna. Athuga þegar afsláttarhópar eru lesnir.

- **26.10.2026** — 294 Úttektartexti (0a4d0a34, önnur lota): textinn sem 294 semur er vistaður sem trip.notesAuto. Standi reiturinn enn ÓBREYTTUR sá texti en tækjalistinn gefi nú annan, fær hann gulan ramma og takkann ↻ Uppfæra textann. Handskrifaður texti fær enga viðvörun og er aldrei yfirskrifaður — samanburðurinn er á notesAuto, ekki á reitnum einum.

## Lærdómur 07.11.2026 (allt mælt)

- **Tala úr talningu er ekki krafa.** `R-000716 Þangbakki 8-10, 190.987 kr.` leit út eins og kredit sem gleymdist að endurgera. Verkið var ALDREI UNNIÐ: Agnar skrifaði „misskilningur með þetta verk", málið segir „engin úttekt var gerð", og tækin 55 höfðu enga skoðunardagsetningu. Lestu söguna (`krafa_note`, athugasemdir, póstinn, málið) áður en tala er kölluð krafa.
- **Yfirtökureikningar eru EKKI okkar krafa.** `stolpi_reikningar` merktir „opinn við yfirtöku 07.05.2026" (95 stk., 4,6 m.kr.) voru greiddir til fyrri eiganda; merkið segir aðeins að þeir stóðu opnir í bókum FYRRI EIGENDA. Þeir voru ranglega taldir sem 3,2 m.kr. í tekjum 07.11. Útilokaðu allt sem ber „yfirtöku" í stöðu eða skýringu.
- **`invoiced_at` er TÓMT á reikningum sem bíða kröfu.** Sían `invoiced_at is not null` skilaði NÚLLI þótt níu reikningar upp á 662.759 kr. biðu. Rétta merkið er `greitt_med = 'reikningur'`.
- **`reikningspunktar.applied` er marklaus:** NULL á öllum 26 punktunum þótt 14 séu sannanlega rukkaðir. Fáni sem er aldrei settur segir ekkert — mældu gegn `solur`. Sama með Hoppers: `krafa_sent_at` segir 28.08 en kúnninn segist aldrei hafa fengið kröfu.
- **Samningsverð ræður reikningnum.** Hagvagnar eiga samning um 2.700 kr./tæki (Charlize #1991) en voru rukkaðir 3.065 á 177 tækjum; Hamraborg 28 á 25 % afslátt sem vantaði. Berðu verð á reikningi saman við kjörin í Charlize áður en hann fer út.
- **Sýnur í stað handvirkrar leitar:** `v_krafa_ekki_send`, `v_kredit_an_endurgerdar`, `v_verk_an_reiknings`, `v_skodun_gleymd`, `v_taekjatolur_misraemi`, `v_erindi_osvarad`, `v_skeytamidlun_vantar`. Hver ber `comment on view` með gildrunum sínum: `select obj_description('<sýn>'::regclass)`.

## Handbók: fjögur daglegu reikningaverkin (lota 7, 17.11.2026)

> Verkferlið efst í skránni („Verkferli reikninga — SKYLDA“) ræður röðinni og lokaathuguninni. Þessi handbók er
> tilvísunin: kóðalínur og hvað er SANNAÐ eða ÓSANNAÐ.

Agnar 16.11.2026: „Gekk hræðilega í dag.“ Handbókin er lesin úr kóðanum: `142-sale-editor.js`, `26-credit-invoice.js`,
`92`, `166-krofu-yfirlit.js`, `369-krofu-vinnugluggi.js` og `netlify/functions/payday-push.cjs` (PP). Hún styðst líka við
reglur 30–33 í `odin_reglur`. Línutilvísanir í 142 og 166 miðast við master a624ffc2 (17.11.2026); í `payday-push` (PP) hafa línur hliðrast um allt að ~25 eftir 039ee4cc, svo leitaðu þar eftir fallsheiti (`clearSaleInvoiced`, `markSaleInvoiced`, `takaFra`). Merkin þýða:
- **SANNAÐ**: próf í `test/` eða keyrt í lotu 6.
- **ÓSANNAÐ**: lesið í kóða, ekki keyrt.

Lota 6 (álagspróf á Test fyrirtæki) hafði ekki keyrt söluflæðin þegar þetta var skrifað. Niðurstöður hennar færa skref
úr ÓSANNAÐ í SANNAÐ hér.

**Gildir um öll fjögur verkin:**
- Ekkert hér sendir neitt nema „Krafa send“, „🏦 Senda valdar í Payday“ eða „📤 Í Payday sem drög“ í Kröfuyfirliti. Á
  þá takka ýtir Agnar einn. Það er verklagsregla, ekki aðgangsstýring: takkinn er opinn öllum innskráðum (166:2104).
- Sala er aldrei eydd. Hún er ógilt (`void`), kreditfærð eða „sleppt“ (369).
- Eftir hvert skrif er lesið til baka úr ferskri `solur`-röð. „Vistað“ í viðmótinu er ekki sönnun.
- **Úttektarskýrslan sem fylgir kröfunni ræðst af SÖLUNNI þegar krafan er send** (kt, nafn, staður, tæki, ár), ekki af
  eldri tengingu. Eftir hverja breytingu á úttektarsölu spyr appið hvort skýrslan stemmi og býður nýja ef ekki. Sjá
  „Skýrslan sem fylgir — ein heimild“ neðst í handbókinni. **SANNAÐ** (17.11.2026)

### 1. Breyta reikningi

**A. Ósend sala eða drög (ritillinn, 142).** Breytanlegt er:
- drög,
- eða `final` + ógreidd + ekki kredit + `invoiced_at`, `krafa_sent_at` og `dk_invoice_id` öll tóm (142: `isDraft` / `isUnsentFinal`).

1. Opna söluna með „Breyta“ í Kröfuyfirliti (166:2182) eða í Drögum. **ÓSANNAÐ**
2. Breyta línum, afslætti, nafni eða athugasemd. Afsláttur fer á EINN stað: línu-prósentu EÐA krónur (afsláttarbökun í `commit`, 142). **ÓSANNAÐ**
3. Smella á „Vista breytingar“, „Vista sem drög“ eða „Klára sölu“. **„Klára sölu“ sendir ekkert**, þótt staðfestingin
   spyrji „…og senda krafa?“ (142:961). **ÓSANNAÐ**
4. **Ef kt var breytt:** ritillinn vistar AÐEINS `customer_kt` og nafn. `customer_base_id` og `customer_id` standa óbreytt
   (`commit`, 142:1005–1018), og `payday-push` tæki þá netfang, heimilisfang og síma gamla kúnnans (PP:147, 406–423). Uppfærðu
   `customer_base_id` beint og lestu til baka (regla 31). Ógild kt fær viðvörun í ritlinum frá 17.11.2026 (6a92a99f), en vistun er ekki stöðvuð. **ÓSANNAÐ**
5. Sannreyna: `solur` ber nýju gildin og sendimerkin þrjú eru enn `null`.
6. **Skýrslan:** eftir Vista spyr appið (516 `SkyrslaSolu`) payday-push hvort skýrslan stemmi enn. Ef ekki (önnur kt
   eða nafn á staðnum, eða tækjum fjölgaði): svara „Búa til skýrslu“. Ný skýrsla verður til, og sú gamla er merkt
   „leyst af hólmi“ (engu eytt). „Seinna“ er leyft, en þá stöðvast sendingin með röngu skýrslunni. **SANNAÐ** (vafri 17.11:
   tækjum bætt við → spurt → ný skýrsla)

**B. Sendur reikningur: „✏️ Leiðrétta“.**
1. Opna sendan reikning (læstur ritill), smella á „✏️ Leiðrétta“ og svo „Búa til drög“. Ný `solur`-röð verður til
   (`status='drog'`) með afrit af línum, sama kúnna og `krafa_note` „Leiðrétting á R-… — … ekki ný úttekt“. Hún ber
   ekkert úr sendingarsögunni. **SANNAÐ** (`test/sala-leidretting.test.cjs`, 5 próf á hreinu föllunum; smellir og
   `insert` eru ekki prófuð)
2. Breyta drögunum og smella á „Klára sölu“. **ÓSANNAÐ**
3. **KREDITFÆRA GAMLA FYRST** (blái borðinn „Kreditfæra R-…“ á drögunum), áður en nýi reikningurinn fer. **ÓSANNAÐ**
4. Agnar sendir nýja reikninginn úr Kröfuyfirliti. **ÓSANNAÐ**
5. **Skýrslan:** þegar drögin eru vistuð eða kláruð fer salan um sama skref og 1A.6. Sendiskjárinn sýnir hvaða skýrsla
   fylgir og hvort hún stemmir.

> ⚠ **Gat, lesið í kóða 17.11.2026, ekki keyrt.** Leiðréttingardrögin (`status='drog'`, `greitt_med='reikningur'`)
> birtast undir „Ósendar“. `payday-push` stöðvar þau ekki heldur: síurnar 166:714 og PP:122 útiloka aðeins `void`. Því má
> senda nýja reikninginn ÁÐUR en sá gamli er kreditfærður, og það er tvírukkun nema tvírukkunarhliðið (PP:134) grípi.
> Mælt 17.11.: 0 slík drög til. Röðin í skrefum 3→4 er því vörnin þar til kóðinn er lagaður.

Sannreyna:
- ný röð `drog` og `krafa_note` „Leiðrétting á …“,
- gamli reikningurinn óbreyttur þar til hann er kreditfærður,
- eftir kreditfærslu: sjá verk 2.

### 2. Kreditfæra

1. Opna „↩ Bakfæra (kreditreikningur)“ í ⋯-valmyndinni í Kröfuyfirliti (166:2222) eða „Kreditfæra“ í læstum ritli
   (142). **ÓSANNAÐ**
2. Haka við línur, skrifa ástæðu og smella á „✓ Gefa út kreditreikning“ (26:116–193). **ÓSANNAÐ**
3. Ný `solur`-röð verður til: `is_credit=true`, `credit_of=<móðir>`, neikvæð `samtals`, númer `K…`, `status='final'`.
   Kreditnótan sjálf fer EKKI í Payday (26:244–375). **ÓSANNAÐ**
4. Fullt kredit á ÓGREIDDAN sendan reikning afturkallar í Payday (`payday-push` `action:'cancel'`). Bankakrafan er felld,
   reikningurinn fer í CANCELLED og sendimerkin á móðurinni tæmast (26:210–241, PP:909–941, 676–686). **ÓSANNAÐ**
   (369:160 segir sjálf að afturköllun Payday-DRAGA sé óprófuð gegn Payday.)

Aldrei:
- kredit á kredit (92:74),
- hlutakredit sem fellir allan reikninginn (26:204),
- afturköllun greiddrar kröfu: það er endurgreiðsla og ákvörðun Agnars (26:220),
- afsláttur á kreditlínum (`discount_pct:0`, 26:249).

Sannreyna:
- kreditröðin sjálf,
- móðirin (fullt + ógreitt): sendimerkin `null`,
- `payday_invoices_slokk`: gamla röðin CANCELLED. Leitaðu eftir `reference` (R-númeri), því `dk_invoice_id` er tæmt.
  Spegillinn uppfærist kl. 10 og 15 UTC.

**Mistakist afturköllun** stendur kreditið en krafan stendur enn í bankanum. Segðu Agnari það strax.

### 3. Færa á aðra kennitölu

**A. Ósend sala:** breyta kt í ritlinum og fylgja skrefi 1A.4 (`customer_base_id` beint). **ÓSANNAÐ**
Skýrslan: ef kt og nafn STAÐARINS standa óbreytt (annar greiðandi, t.d. rekstrarfélag) stemmir skýrslan áfram, því hún er
um staðinn. Ef staðurinn sjálfur fékk nýja kt eða nafn þarf nýja skýrslu. Appið spyr eftir Vista (1A.6). Annars: opna
staðinn og velja „Búa til úttektarskýrslu“.

**B. Sendur reikningur: Kröfu-vinnugluggi `faera_kt` (369).** Forathugun: salan er ógreidd, `final`, ekki kreditfærð og
stendur SENT eða DRAFT í Payday (369:718–720).
1. Opna Þjónustuborð → Kröfur → Forgangslisti og smella á „↪ Rangur greiðandi“ eða „Vinna ›“. Slá inn gilda kt nýs
   greiðanda; vartalan er prófuð og sama kt er hafnað (369:1214–1247). **ÓSANNAÐ**
2. Smella á „Tilbúið í vinnslu“. Glugginn skrifar aðeins í `krofu_verkferli` og sendir ekkert (369:14–19). **ÓSANNAÐ**
3. Claude vinnur 🤖-þrepin í þessari röð og les hvert til baka (369:713–731). **ÓSANNAÐ**
   - (a) stofna greiðandann í `customers_base` ef hann vantar, ÁÐUR en afturkallað er,
   - (b) afturkalla í Payday,
   - (c) uppfæra söluna: kt, nafn, `customer_base_id`, `customer_id` og athugasemd,
   - (d) salan situr ósend í Kröfuyfirliti.
4. Málið fer í `i_yfirferd_agnars` og Agnar sendir á nýja greiðandann. **ÓSANNAÐ**
5. **Skýrslan (🤖-þrep, á undan i_yfirferd_agnars):** Claude breytir sölunni beint, svo enginn vafraatburður fer af
   stað. Ef kt eða nafn staðarins breyttist: opna staðinn, velja „Búa til úttektarskýrslu“ og lesa svo `tools/audit-skyrsla-solu.cjs`
   (á að vera grænn fyrir þessa sölu). Gleymist þetta stöðvar payday-push sendinguna (`gate: 'skyrsla_stemmir'`) og
   sendiskjárinn sýnir rauðan reit með takka.

RÖNG leið: „Kredit + endurútgáfa“ (26) færir ekki kt. Athugið að 369:159/162 segir að sú leið kalli ekki á Payday. Það er
úrelt síðan 08.10.2026, því fullt ógreitt kredit afturkallar nú.

Sannreyna:
- `solur`: ný kt, nafn og `customer_base_id`, og sendimerkin `null` þar til Agnar sendir,
- gamla Payday-röðin CANCELLED,
- `krofu_verkferli`: `stada='i_yfirferd_agnars'` og skrefin `gert`,
- eftir sendingu: `dk_invoice_id` ≠ `gogn.upphaflegt.dk_invoice_id`.

### 4. Setja í Kröfuyfirlit

Sala birtist undir „Ósendar“ þegar þetta á allt við (166:709–714):
- `greitt_med='reikningur'`,
- `paid_at` er `null`,
- öll þrjú sendimerkin eru `null`,
- `status ≠ 'void'`.

`final`, `hidden` og gild kt eru EKKI skilyrði fyrir birtingu. Kt er athuguð við sendingu (`ensureKtForSale`, 166:2352).

1. Sala kemst inn eftir einni af þessum leiðum. **ÓSANNAÐ**
   - kassinn með „reikningur“ sem greiðslumáta,
   - „→ Í kröfu“ úr „Sést hvergi“: einstefna, sem setur `final` ef salan var drög (166:3568),
   - Leiðrétta eða Kredit + breyta,
   - 369-mál.
2. Undirbúa: kt er gild, `customer_base_id` er sett og upphæðin rétt. **ÓSANNAÐ** Skýrslan er EKKI valin í vafranum
   lengur. Sendiskjárinn sýnir þá sem þjónninn velur, með fyrirtæki, kt, vistunardag og tækjafjölda, og hvort hún
   stemmir. Rauður reitur þýðir að hún stemmir ekki; þá er ýtt á „📄 Búa til nýja skýrslu“ (glugginn lokast, ekkert er
   sent) og svo sent aftur. **SANNAÐ** (vafri 17.11.2026)
3. Agnar ýtir á „Krafa send“ eða „🏦 Senda valdar í Payday“. Hliðin í PP eru í þessari röð: þegar send, writeback brast,
   void, `customer_base_id` vantar (422) og tvírukkun (409). **ÓSANNAÐ**

Sannreyna eftir sendingu:
- `dk_invoice_id`, `krafa_sent_at` og `invoiced_at` eru sett og `status='final'`,
- `payday_invoices_slokk` sýnir SENT eftir næstu sókn.

### Skýrslan sem fylgir — ein heimild (17.11.2026)

Agnar 17.11.2026: „[kúnni] er ennþá með ranga skýrslu“ og „Mátt reyna laga þetta svo það sé ekki alltaf
vesen.“ Reikningur var endurgerður á nýja kt eftir kredit, en gamla skýrslan (gamalt nafn, gömul kt) fylgdi áfram.

**Gamla tengingin, þrír staðir:**
- `payday-push` festi FYRSTU skýrslu ársins, eða slóð sem vafrinn hafði geymt (`report_storage_path`).
- 166 valdi eins.
- 168 taldi hvaða skýrslu ársins sem var „✓ Vistuð“ og gerði Vista óvirkt, svo ný skýrsla varð aldrei til.

**Ein heimild:** `netlify/functions/_skyrsla-solu.cjs`. Föllin `velja` og `bera` eru hrein. Þrír nota þau:
- `payday-push`: við sendingu, og í hamnum `skyrsla_athugun`, sem kallar ekki á Payday;
- sendiskjárinn í 166;
- gagnavörðurinn `tools/audit-skyrsla-solu.cjs`.

Slóð úr vafranum er hunsuð fyrir úttektarsölur.

**Dómurinn** (`bera`):

| Svið | Regla | Afleiðing |
|---|---|---|
| kt + nafn | BÆÐI kt og nafn skýrslunnar eru önnur en sölunnar OG staðarins, svo staðurinn sjálfur skipti um auðkenni | stöðvar (`skyrsla_stemmir`, 409) |
| kt eingöngu | kt er önnur en nafnið stemmir (nýr greiðandi á staðnum, rekstrarfélag eða leiðrétt kt) | viðvörun (gult), ekki stöðvun |
| nafn eingöngu | nafnið er annað en kt stemmir (nafnabreyting). Félagaform, greinarmerki og 1–2 stafa stafsetningarafbrigði teljast sama nafn | viðvörun |
| staður | `#id` í skráarnafni er staður sölunnar | stöðvar |
| tæki | fleiri tæki á sölu en í skýrslu, og tölurnar eru úr ÞESSARI skýrslu (`arsskodun_report_facts` lesið eftir vistun) | viðvörun á skjá, RAUTT í verði |
| ár | skýrsla annars árs | viðvörun |
| viðbót | viðbótarsala og skýrslan er eldri en hún (488) | `vidbot_skyrsla` stöðvar eins og áður |

Ef nafn eða kt sjást ekki í skráarnafninu (handhlaðin skjöl) er það „óvíst“ og ekki stöðvað.

**Rekstrarfélög og greiðandaskipti** (stjórnlotan 17.11.2026). Skýrslan er um STAÐINN. Hún ber kt og nafn staðarins eins og
það var þegar hún var gerð. Kt greiðanda á sölu má vera önnur, og staður má skipta um greiðanda (og þar með kt) án þess að
verða annar staður. Hvorugt stöðvar.

Mælt á raungögnum 17.11.2026, aðeins með lestri:
- Í 275 af 276 úttektarsölum ársins er `customer_base_id` sölunnar sá sami og staðarins, því hver staður ber grunn
  greiðandans. 58 þeirra eru á grunnum með rekstrarfélagsmerki.
- Fyrsta útgáfan (aðeins kt sölunnar) hefði stöðvað 4 sölur, þar af eina þar sem greiðandi var annar en staðurinn.
- Núverandi regla stöðvar 2 (staðurinn skipti um kt OG nafn), og 1 verður viðvörun.
- Átta staðir eiga 2026-skýrslu á annarri kt en staðurinn ber nú. Næsta sala ársins stöðvast á 3 þeirra (kt og nafn
  önnur), en hinir 5 fá viðvörun.

**Leið fram hjá:** sending kröfu má stöðva, Vista aldrei. Í rauða reitnum er hak: „Ég hef farið yfir skýrsluna og hún er
rétt … senda hana samt“. Fái sendingin 409 `skyrsla_stemmir` spyr glugginn „Senda samt“. Þá fer `force_skyrsla: true` með,
og payday-push sendir, skráir `skyrsla_yfirskrifud` í svarinu og skrifar í logg fallsins. Hakið er aldrei sjálfgefið.

**Hvaða skýrsla er valin** (óháð rýni 17.11.2026):
1. NÝJASTA skýrsluviðhengi staðarins á ári sölunnar. Handhlaðin, nýrri skýrsla gengur fyrir eldri sjálfgerðri.
2. Sé það Drive-tengill (ekkert `path`, ekki hægt að festa) er skjalaröð ársins í `customer_documents` notuð, sama varaleið og gamla valið.
3. Annars næsta sækjanlega viðhengi ársins.
4. Annað ár aðeins sem síðasta úrræði, og aldrei fram yfir skýrslu ársins.

Mistakist niðurhal valinnar skýrslu stöðvast sendingin (409 `skyrsla_nidurhal`, „Krafan var EKKI send"), og glugginn býður „Senda án skýrslu". Krafa fer aldrei þegjandi án skýrslu. `tools/endurspilun-skyrsla-solu.cjs` keyrir allar sölur ársins gegnum gamla og nýja valið; 17.11.2026: 274 af 276 eins, 2 stöðvast (ætlað), 0 önnur skýrsla.

**Handskrifaður texti** („Annað", athugasemdir, undirritun) býr í `localStorage` á vél skoðunarmannsins, ekki á þjóni. Frá og
með 17.11.2026 geymist hann MEÐ hverri nýrri skýrslu (`texti` á viðhenginu, 111). Þegar ný skýrsla er gerð á vél án textans
er hann tekinn úr skýrslunni sem hún leysir af hólmi. Eldri skýrslur bera hann ekki. Þá vistast ný skýrsla ALDREI
sjálfkrafa; borði segir hvað tapast og gamla skýrslan fylgir áfram. Handvirkt Vista spyr „Vista samt?".

**Ein leið eftir breytingu:** `js/patches/516-skyrsla-solu.js`, `SkyrslaSolu.eftirBreytingu(saleId)`. Fallið spyr payday-push
og býður „Búa til skýrslu“ ef kt, nafn, staður eða tæki stemma ekki. Það gerir ekkert sjálfvirkt og blokkar ekkert.

Leiðirnar og hvað þær gera:
- **142 ritillinn** (Vista, Drög, Klára; Leiðrétta-drög; færa kt á ósendri sölu; gleymdur afsláttur; tækjum bætt við):
  atburðurinn `sale-edited`. Hann bar `id: null` fram til 17.11 og ber nú auðkennið.
- **165 Klára heimsókn:** önnur úttekt ársins (`__uvSecondReason`) býður alltaf nýja skýrslu.
- **488 viðbót:** `SkyrslaSolu.endurnyja` (eigið merki CIR_VIDBOT helst).
- **166 sendiskjárinn:** takkinn „📄 Búa til nýja skýrslu“.
- **430 verkspjald og 11 bókhaldsyfirlit:** senda líka `sale-edited` með auðkenni.

**Ný skýrsla** verður aðeins til um `SkyrslaSolu.endurnyja(coId)`:
- Merkið `CIR_NY` lætur 168 vista nýja skýrslu þótt skýrsla sé til.
- Eldri app-skýrslur ársins á staðnum eru merktar `leyst_af` / `leyst_af_dags` með `CompanyAttachments.supersede` (111). Það gildir líka um viðbót.
- **Engu er eytt.** Ársreiturinn sýnir „Skoðun (úrelt)“.
- Til að afturkalla: fjarlægja `leyst_af`.
- `customer_documents`-röð ársins (það sem gáttin les) uppfærist á nýju skýrsluna, svo úrelt skýrsla sést aldrei í gáttinni.

**Rautt í verðinum `audit-skyrsla-solu`:** ósend sala með skýrslu sem stemmir ekki. Úttakið sýnir aðeins R-númer, sölu, stað
og svið, aldrei kt eða nöfn, því CI-loggið er opinbert. Lagfæring: opna staðinn og velja „Búa til úttektarskýrslu“, eða ýta á
„📄 Búa til nýja skýrslu“ í sendiglugganum.

Próf:
- `test/skyrsla-ein-heimild-sala.test.cjs`, 14 próf; 10 af 14 féllu á gamla kóðanum (master 0d902321; hin 4 prófa kjarnann einan, sem var ekki til).
- `test/skyrsla-fylgir-solu.test.cjs`.

### Reiknings-PDF fylgir sölu — ein regla (17.11.2026)

Agnar 17.11.2026 (skjámynd): „það er ennþá vitlaus kennitala á bölv reikningnum“. Það sem opnaðist var PDF-afrit GAMLA
reikningsins (kreditfærður, gömul kt). Nýja salan átti sitt eigið, rétta PDF. Þrjár ástæður:
- **Parið** (`document_pairs`, DB-gikkurinn `auto_pair_customer_document`): FYRSTI reikningur ársins á staðnum tekur
  sætið og losnar aldrei, ekki einu sinni við kredit. Fyrirtækjaspjaldið (199) og „Skýrsla og reikningur saman“ sýndu
  hann sem reikning ársins.
- **Kreditfærður reikningur var ómerktur** alls staðar: í spjaldinu, í Afgreiðslu („Reikningur R-… (PDF)“) og í gáttinni.
  Gáttin fann kreditnótuna aðeins ef hún var sjálf í listanum, en hún á sér enga skjalaröð.
- **Vistunin (233)**: „afrit með þessu R-númeri er til → sleppa“, svo ósend sala sem breyttist (kt leiðrétt, línur)
  hélt PDF-i á gömlu kt. Auk þess prentaði PDF-ið kt STAÐARINS, ekki kt sölunnar sem Payday rukkar.

**Ein regla:** `js/patches/517-reikningur-solu.js` (UMD). Þjónsafritið `netlify/functions/_reikningur-solu.cjs` er
nákvæmlega sama skrá, og prófið krefst þess (`cp` eftir hverja breytingu).
- `velja(sale, vidhengi, skjol)` velur PDF-afrit ÞESSARAR sölu: nákvæmlega sama R-númer, ekki leyst af hólmi, nýjast
  vinnur. Aldrei „fyrsta skjal ársins“.
- `bera(sale, pdf, {kredit})`:
  - R-númer og kt stöðva;
  - upphæð og nafn eru viðvörun;
  - kreditfærð sala stöðvar.
- `kreditMap`: kreditfærsla er staðreynd í `solur` (`credit_of` EÐA `kredit_a`, ógild nóta telst ekki), svo hún gildir
  aftur í tímann án merkingar.

**Hvar reglan er notuð:**

| Staður | Hvað gerist |
|---|---|
| 199 fyrirtækjaspjaldið | Kreditfærður reikningur er grár, yfirstrikaður, „kreditfært (R-…)“ (opnast enn, engu eytt), hvorki valinn sem reikningur ársins né talinn í Hreyfingum. Kreditnótan og eldri, leyst afrit eru ekki kandídatar. Bendi parið á kreditfærðan reikning og EINN gildur er til fær parið hann (`savePair`, sama og „🔗 Tengja“; `matched_by='kredit_skipti'`, gamla skjalið í `notes`). |
| 311/253 pörin | Kreditfærð sala er ekki reikningur ársins. |
| 233 vistun | Ósend sala: afrit sem stemmir ekki (kt, R-nr, upphæð) víkur fyrir nýju. Það gamla fær `leyst_af` (111 supersede), skjalaröðin fær nýju slóðina og gamla slóðin fer í `notes`. Send sala: afritið stendur. PDF-ið prentar kaupanda SÖLUNNAR (`kaupandi()`). |
| 517 eftir breytingu | `sale-edited`/`sala-breytt` → 233 með `adeinsEfTil`. Gerist sjálfkrafa, því reikningur ber engan handskrifaðan texta (öfugt við skýrsluna). |
| 254 tölvupóstur | Kreditfærður reikningur fer aldrei í póst. Vistað afrit er notað aðeins ef R-nr og kt stemma (upphæð ein víkur → afritið gildir); annars er PDF-ið teiknað úr sölunni. |
| 166 sendiglugginn | Reitur „🧾 Reikningurinn“: R-nr · kt · nafn · upphæð sem Payday fær, og hvort PDF-afritið stemmir. Rautt + „🧾 Endurgera PDF-afrit úr sölunni“. Payday-sendingin notar EKKI app-PDF-ið og er ekki stöðvuð. |
| afgreidsla.cjs | Tengill á kreditfærðan reikning: „Reikningur R-… (PDF) — KREDITFÆRÐUR með R-…, gildir ekki“. |
| gatt.cjs | Kreditnóturnar eru sóttar sérstaklega (`credit_of`/`kredit_a`). Kreditfærður reikningur sést kúnnanum ekki. |

**Vörður og endurspilun:**
- `tools/audit-reikningur-solu.cjs`: RAUTT ef ósend reikningssala ber PDF á annarri kt eða öðru R-númeri.
  ⚠ fyrir upphæð, vantar, og pör á kreditfærðum reikningi.
- `tools/endurspilun-reikningur-pdf.cjs [ár]`: gamla valið á móti nýju á öllum sölum ársins.

Mælt 17.11.2026 á 1.001 lokasölu (466 með PDF):
- 13 sendar á annarri kt og 15 sendar með aðra upphæð; 0 ósendar.
- 29 kreditfærðar með ómerkt PDF.
- 10 pör héldu kreditfærðum reikningi: 6 fá gildan, 4 bíða nýs reiknings.
- Tölvupóstur: 42 breytast (13 kt + 29 kredit).

**Hlutakredit** (óháð rýni 17.11.2026): reikningur telst kreditfærður AÐEINS þegar kreditnótur hans ná yfir alla upphæðina
(`kreditStada` í 517, ±2 kr). Hlutakreditaður reikningur gildir alls staðar:
- á kúnnavefnum (`kreditad_ad_hluta`), í pörum og í pósti;
- á spjaldinu með „kreditað að hluta −X kr“;
- Hreyfingar draga kreditið frá aðeins þegar skjalið ber brúttóupphæðina.
Allir sem spyrja um kredit sækja `samtals`, og prófið krefst þess.

**Parið skiptir aldrei sjálft** (regla hússins: ekkert tengist sjálfkrafa). Bendi parið á kreditfærðan reikning sýnir spjaldið gilda
reikninginn og takkann „🔗 Festa R-… sem reikning ársins“. Smellur og staðfesting kalla á `savePair` (`kredit_skipti`), og `notes`
skráir hver og hvenær.

**Reikningur sem er ekki í Sölu** (Stólpi R-10xxxx, eða aðeins skráður í skjalasafnið). 199 `openInvFromSale` → `openInvAnnad`,
fyrir bæði 👁 í veljaranum og 🧾-flísina. Fallið opnar PDF-ið eftir reikningsnúmeri úr `customer_documents`, sömu heimild og
„KOMIN“-línan. Finnist ekkert PDF segir það: „Reikningur R-… er úr Stólpa … PDF fannst ekki í skjalasafninu“, með dagsetningu,
upphæð og athugasemd. Það segir aldrei „fannst ekki í Sölu“.

Athugið: vafrinn má ekki lesa `stolpi_reikningar`, því RLS er á án reglna. Upplýsingarnar koma því úr skjalaröðinni.
Prófið er `test/reikningur-stolpi-opna.test.cjs`.

### Hvað er sannað (17.11.2026)

- Aðeins hreinu föll „Leiðrétta“ (5 próf í `test/sala-leidretting.test.cjs`).
- Ekkert próf í `test/` nær yfir vistun úr ritli, kreditfærslu, kt-flutning, Kröfuyfirlit né `payday-push`.
- Skýrslan sem fylgir (ein heimild): kjarni, payday-push (hermt net), 516 (hermdur vafri) og keðjan í vafra á Test fyrirtæki
  17.11.2026. Ferlið: sendiskjár rauður → ný skýrsla → sendiskjár „✓ stemmir“; ritill, tækjum bætt við → spurt → ný skýrsla.
- Stöðuverðir í `tools/` sanna kóðamynstur, ekki flæði: `audit-kredit-afturkollun`, `audit-krofu-vinnugluggi`,
  `audit-osendar-krofur`, `audit-payday-tvirukkun` og `audit-einstefna-krofu`.

## Grunnreglur allra agenta (04.11.2026)
1. Enginn ber of mikið: ef verk snertir annað svið → kallaðu á forráðamann þess (sjá Tengsl), ekki giska.
2. Veiddu úr þínum töflum (gagnakortið í docs/AGENTASKRA.md) og skráðu reglur sem bíta í charlize_knowledge (topic = þitt heiti).
3. Villa eða gat sem þú finnur: LAGAÐU það sjálfur ef það er innan verksins sem þú ert í og lagfæringin er afturkræf (prófa, segja frá í lokasvari). Verkefnalistinn er listi Agnars — stofnaðu röð þar AÐEINS ef hann biður um það, eða mest EINA á lotu fyrir það sem er utan verksins og of stórt til að laga núna (skrá:lína og sönnun). Annað fer í lokasvarið og charlize_knowledge, ekki á listann. (Agnar 16.11.2026: „setja allt á verkefnalista í stað þess að laga það“ · „ég vil geta sett á verkefnalista en ekki að ég fái mörg hundruð atriði á móti“; mælt: 137 ný verk á 14 dögum, 21 kláruð.)
4. Áður en lotu lýkur: hvað veit ég núna sem næsta lota veit ekki? → charlize_knowledge (1–5 færslur), kúnnafróðleikur → scope 'kunni' með kennitölu.
5. Boðhlaup (Agnar 04.11.2026): keflið fellur ALDREI á jörðina. Fáirðu verk utan þíns sviðs vinnurðu það ekki þegjandi og sleppir því ekki — þú réttir það eiganda síðunnar/gagnanna (síðukort, gagnakort, Tengsl) með einni línu um hvað er beðið um og hvað þú veist þegar, og segir Agnari hver tók við. Finnist enginn eigandi tekur jarvis við og skráir gat.

## `v_krofu_forskodun` er LEITARTAFLA, ekki listi (07.11.2026)

Sýnin inniheldur ógildar sölur (`status='void'`) VILJANDI. Patch 166 slær upp í hana per sölu og
hefur ÞEGAR tekið void út (`_state.osendar` síar `status !== 'void'`), svo þær sjást aldrei í
viðmótinu. Sá sem telur sýnina sem lista fær ranga tölu: 9 rauðar ábendingar, þar af 8
„ógild sala — fer aldrei í kröfu".

**Rétt mæling:** `where litur='rautt' and status <> 'void'`. Eftir stendur EITT raunverulegt mál
(R-001264 Nesdekk Dekkjalager, 90.847 kr, „úttekt með endurteknum línum").

## Verkferlis-yfirlitið (07.11.2026) — EIN keyrsla í stað átján

Agnar: „Kortleggja upplýsingareiti, pósta, kröfuyfirlit og allt setja í api verkferlis combo
yfirlit inn á Agnar þjónustuborð sem ég get keyrt til að yfirfara."

- **`/api/combo-yfirlit`** (netlify/functions/combo-yfirlit.cjs) mælir 18 línur í sjö flokkum:
  kröfur · póstur · upplýsingareitir · skoðanir · verkefnalistar · samþykktir · tengingar.
  `?flokkur=krofur` einangrar flokk, `?radir=N` stýrir dæmum, `?skrifa=1` uppfærir málið á borðinu.
- **`node tools/combo-yfirlit.cjs`** er sama fall úr skipanalínu (`--json`, `--flokkur`, `--skrifa`).
- **Spjaldið** er efst á Þjónustuborðinu (js/patches/499-combo-yfirlit.js) með Keyra-takka.
- **Mál #1540** á borðinu geymir sama yfirlit í texta; það uppfærist sjálft og titillinn breytist.
- **Engin ný tala.** Hver lína les SÖMU sýn og vörðurinn/borðið les. Blæbrigði eru dálkar í
  sýninni, aldrei ný sýn — tvö mælikerfi um sama hlutinn stangast alltaf á að lokum.
- **Þak = staðan 07.11.2026.** Rautt þýðir „þetta hækkaði", ekki „gamla skuldin stendur".
- **ÓMÆLT er ekki 0.** Svari sýnin ekki stendur `merki: 'OMAELT'`, aldrei núll.

## Hvað tölurnar reyndust vera (rannsóknarumferð 07.11.2026, hver röð handlesin)

**Stóru tölurnar í sýnunum eru að mestu þegar leystar. Lestu söguna áður en þú kallar þær kröfu.**

| Sýn | Fyrirsögn | Hvað stendur raunverulega eftir |
|---|---|---|
| `v_krafa_ekki_send` | 23 raðir · 2.494.571 kr | **7 raðir · 618.409 kr.** Sex voru aldrei sendanlegar: fimm kreditfærðar í Payday og ein með ⏸ BÍÐA |
| `v_kredit_an_endurgerdar` | 22 raðir · 992.163 kr | **20.190 kr** (Prinsinn R-000310) — og hann þarf NÝJAN REIKNING, ekki kröfu |
| `v_krofu_forskodun` rautt | 9 | **1**, og það reyndist líka falskt (sjá Nesdekk) |

**Hvers vegna sýnirnar ofmátu:**

1. **`v_krafa_ekki_send` las aðeins `solur`, aldrei Payday-spegilinn.** Reikningur sem var sendur
   og kreditfærður í Payday ber hvorki `credit_of` né `dk_invoice_id` í `solur` og lítur því út
   eins og ósendur. Lagað: dálkarnir `payday_stada` og `i_bid`; `v_krafa_ekki_send_adgerd` sleppir
   CANCELLED/CREDIT og ⏸. Heildartalan stendur í 23 svo hún stangist ekki á við patch 489.
2. **`v_kredit_an_endurgerdar` krafðist endurgerðar Á EFTIR kreditinu og á SÖMU kennitölu.**
   Endurgerðin er oft stofnuð á undan kreditinu (Grillvagninn R-000548, sama dag, greiddur) eða
   fer á aðra kennitölu sama viðskiptavinar (Eldsalir, Sjúkraþjálfun, Breiðvangur). Nýr dálkur
   `endurgerd_greidd` leitar frá UPPRUNALEGU sölunni og tekur `customer_base_id` með.
   Eclipse R-000727 (1.211.117 kr) er sígilda dæmið: kreditfært, endurgert sem R-000940 og GREITT.
3. **Stærsta talan er oftast sú sem er löngu leyst.** Það er ekki tilviljun — stórir reikningar eru
   þeir sem oftast eru kreditfærðir og endurgerðir.

**Nesdekk R-001264 (90.847 kr) — tvær ábendingar, báðar rangar.** Skýrslan var lesin og segir
6 léttvatn + 4 duft + 2 CO₂ + 6 slöngur = 18, nákvæmlega eins og tækjaskráin og reikningurinn.
(a) „Tvíýtt á Klára heimsókn?" — nei: slöngulínurnar eru 5+1 af því að fimm slöngur hafa tóman
stærðarreit og ein er ný 30 m slanga skráð 05.11 kl. 17:03; tvíýting hefði afritað allar línur.
(b) „Vantar afslátt eins og systurreikningurinn" — nei: hópur 3 gefur 20 % AÐEINS á ný tæki og
R-001264 er hrein þjónusta. Eina sem má laga er að steypa slöngulínunum í eina `qty 6` svo
reikningurinn líti ekki út fyrir að vera tvítekinn; fjárhæðin breytist ekki.

**`teya_faerslur` er TÓM tafla.** Hver spurning um „var þetta staðgreitt?" er ÓMÆLANLEG úr
grunninum þar til hún fyllist. Segðu ÓMÆLT, ekki „ógreitt".

## 1,42 m.kr. sem voru aldrei krafin (mælt 08.11.2026)

**Frá mars 2026 voru Stólpa-kröfur stofnaðar á 80 % af reikningi + 295 kr kröfugjald**, á 89
ólíkum kennitölum. Af 96 greiddum reikningum mars–maí fellur **enginn** á `upphaed / 1,24`
(vsk-tilgátan sem málið byggði á) en **62 falla upp á krónu** á `upphaed × 0,80 + 295`.
295 kr er sama talan á 13.900 kr reikningi og á 933.904 kr reikningi — hlutfall getur ekki
hagað sér þannig, svo þetta er kröfugjald.

| Mánuður | reikningar | fullgreiddir | á 80 %-mynstri | vantar |
|---|---|---|---|---|
| 2025-09 … 2026-02 | 623 | 617 | **0** | 41 þús. alls |
| 2026-03 | 12 | 2 | 2 | 461.622 |
| 2026-04 | 69 | 1 | 49 | 812.166 |
| 2026-05 | 15 | 0 | 11 | 147.257 |

**Umskiptin eru rofin, ekki stigvaxandi.** Fram í febrúar voru nánast allir reikningar greiddir
að fullu og enginn féll á mynstrið; í mars snýst það alveg við.

**Þrennt sem þetta þýðir fyrir hvern sem les Stólpa-tölur:**
1. Þetta er ekki afsláttur. Afsláttur fylgir félaginu og er ólíkur per félag; hér er hlutfallið
   það sama hjá 89 félögum.
2. **`opid_upphaed` er 0 á 91 af 96** — Stólpi sýnir ekkert útistandandi. Peningurinn er ekki í
   vanskilum, hann var aldrei krafinn, og ekkert kerfi mun minna á hann.
3. Það hélt áfram EFTIR yfirtökuna 07.05.2026, svo þetta er ekki arfur frá fyrri eigendum einum.

Heimaleiga-málið (#1329) var sama mynstur í dulargervi: „ofgreitt um 122.659" reyndist 37.338 kr
SKULD, og sú tala er nákvæmlega 20 %-vöntunin á einum reikningi (R-108266).

- **10.11.2026** — Lota 10.11.2026: (1) Úttektarskýrsla (168) prentar nú undirskriftarlínu undirritanda (trip.undirritun, mynd úr app_settings.undirskriftir) og sérlínu Skoðunaraðili (sjálfgefið Hákon); skýrsla án nafns er ógild — svarstöð 447a uppfærð. (2) audit-payday-samraeming T2 „engin Payday-röð“ strax eftir sendingu er oftast úreltur spegill: payday_invoices_slokk sækist aðeins 10:00 og 15:00 UTC. Athuga solur.dk_invoice_id (sett = Payday tók við) og keyra POST /api/payday-pull-slokk?since=<dagur> áður en frávik er rannsakað (R-001282–85 mældust þannig 10.11, urðu nr. 472–475 SENT). (3) Léttvatn 3 L verðlínur: hleðsla vorur 468 = 5.000 án vsk, yfirferð vorur 454 = 2.903,23. (4) Drög-línur sýna nótuna Fyrir starfsfólk (.dr2-l3, 143/501).

## Verðskrár, geymd drög og afgreiðsla án stofnunar (lota 09.–10.11.2026, allt mælt)

**Verðskráin er á einum stað og hún er breytanleg.**
- **Slökkvit. þjónusta — verð** (`410-thjonustu-tengingar.js`, Vörur og þjónusta → 🧯): ein röð per þjónustulínu í hópum (tegund → Akstur og
  skýrslugerð → Aðrar). Verð og HEITI eru reitir sem vistast við blur í `vorur.verd_an_vsk` / `vorur.nafn`. **Heitið er reikningstextinn OG
  Gátt finnur línur á heitinu** (regex í `netlify/functions/gatt.cjs`) — endurnefning sem tekur línu úr Gáttar-hópi spyr fyrst.
- **Akstur og Skýrslugerð** (verð + heiti reikningslínu) búa á þjóni: `app_settings.slokk_visit_defaults` = {akstur, skyrslugerd, driveQty,
  akstur_heiti, skyrslugerd_heiti}. Kóðasjálfgildi 3.600 / 5.600. 129 (töflumerki), 165 (reikningslínur), 488 (viðbótarúttekt) og Gátt lesa
  þaðan; gildir þar sem ferðin hefur ekki handslegið verð. Mælt 10.11.2026: Agnar setti Skýrslugerð í 4.600 í listanum → Gátt sýndi
  `fullt_an 4600` (3.450 m. 25 % samningsafslætti).
- **Gátt Sérkjör = almenn verðskrá nema samið sé um annað** (Agnar 09.11): `netlify/functions/_gatt-serkjor.cjs` (`aksturSkyrsla`); samningsverð
  (`cfg.akstur` / `cfg.skyrsla`) og flatur afsláttur leggjast ofan á. Próf: `node tools/test-gatt-serkjor.cjs` (25).
- **Nýir verðlistar** (`502-verdlistar.js`: Sprinklerkerfi · Neyðarljós · „＋ Nýr verðlisti"): `app_settings.verdlistar[<id>]`, sjá `bord-flettur`.
  **Tilboðsham → „Setja í körfu í Sölu"** setur línur `{type:'service', krefst_verkbeidni:false, disc_pct}` — afsláttur er LÍNUAFSLÁTTUR
  (aldrei bæði bakaður í línu og í `afslattur`). Úttektir lesa verðin EKKI úr þessum listum enn (`Verdlistar.lidir(id)` er til reiðu).

**Geymd drög eru karfa, ekki sala.** „Geyma sem drög" í greiðsluglugganum (07) → `GeymdDrog.vista()` (501) → tafla `sala_geymd` (karfa jsonb).
Ekkert R-númer, ekkert í `solur`/Bókhaldi/Kröfu yfirliti/Payday. „Opna í Sölu" í Drög (143) hleður körfuna og merkir röðina `deleted_at`
(„Sýna eydd" → Endurheimta). Gildra: 255 (sjálfvirkur fyrirtækjaafsláttur) núllstillir `discount_pct` þegar kúnni kemur inn með körfunni —
`festaAfslatt()` í 501 festir geymda gildið aftur.

**Afgreiðsla án stofnunar** (Agnar 10.11: „flókið að eiga við einstaklingskennitölur hjá þeim sem maður ætlar sér ekkert að skrá").
- Rótin: `pos.js checkout` AUTO-STOFNAR `customers_base` + `fyrirtaeki` (er_i_thjonustu=false, `review_flag` ef nafn er rusl) fyrir HVERJA
  óþekkta 10 stafa kt (kanóníska leiðin frá 09.09.2026).
- „+ Afgreiðsla án stofnunar" í leitar-fellilistanum (114; birtist ALLTAF þegar leit finnur engan) opnar sama glugga og „Án kennitölu".
  Með 10 stafa kt: `state.customer.an_stofnunar = <hrein kt>` → auto-stofnun sleppt; salan ber nafn (eða „Viðskiptavinur") og raun-kt í
  `customer_kt`, `customer_id` tómt, og `solur.an_stofnunar = true` er sett eftir insert. 7 stafa tala = sími (kt 999999-9999); nafn = nafn.
  Reikningurinn er óbreyttur (kemur eins og úr kennitölu). **Kennitala fer aldrei í nafnareit.**
- `audit-solu-id`: undanþága AÐEINS `greitt_sidar` + merki; „reikningur" án tengingar helst rautt. `v_gengid_inn_osott` nær líka yfir
  merktar sölur (ósótt vara dettur ekki úr vaktinni).

**Greitt síðar án viðskiptavinar er EÐLILEGT** (Agnar 10.11: „óskráður viðskiptavinur … greiðir þegar hann sækir og getur ekki fengið sendan
reikning"). Drög sýna grátt „Óskráður viðskiptavinur"; rauða merkið og kassaviðvörunin („KRÖFUNA er ekki hægt að senda", `sala_krafa_an_kunna`)
kvikna aðeins þegar greiðslumáti er **reikningur** án kennitölu.

**Smátt:** söluloka-glugginn segir „🖨 Prenta reikning" (var „Prenta aftur"; Bókhalds-yfirlit 11 á enn sitt „Prenta aftur (kvittun)").
Flipi sem var opinn fyrir birtingu sýnir gamla textann þar til hann er endurhlaðinn — það er ekki skyndiminni.

**Prófunaraðferð sem dugði (engin skrif á lifandi):** `DB.sb.from` → Proxy sem skráir köll, `DB.sb.rpc` og `storage` uppgerð, `fetch`-skrif
blokkuð; svo raunverulegir smellir á ÁFRAM og greiðslumáta. Gildrur: tvítöku-vörnin (sama kt + upphæð < 2 mín) spyr með `Confirm.show`;
QR-miðaglugginn (`_qrlc_modal`) opnast eftir sölu og hylur ÁFRAM.

## Afgreiðsla án stofnunar — keðjan rakin til enda (lokayfirferð 10.11.2026)

- **Reikningurinn:** `SalaInvoice.renderFromSale` á sölu með raun-kt og engan viðskiptavin prentar „Viðskiptavinur 110989-2889" (nafn tómt) eða
  „Ásgeir Prófari 110989-2889" — aldrei 999999-9999. Mælt með gervi-glugga (engin skrif).
- **Sótt ✓ (121) og Klára í Drög stofna ENGAN viðskiptavin** — sala án stofnunar helst óskráð þegar hún er kláruð við afhendingu.
- **`audit_vernd_guard`** (BEFORE UPDATE/DELETE á `solur`) skráir aðeins eldri röð í `audit_vernd`; hann stöðvar ekkert, svo merkið
  `an_stofnunar` kemst inn á eftir insertinu fyrir allar stöður.
- **Greiðsluglugginn (07)** segir „Án stofnunar — enginn viðskiptavinur verður stofnaður" undir kennitölunni þegar merkið er virkt.
- **Drög-leit:** „óskráður" finnur Greitt síðar án viðskiptavinar (áður aðeins „enginn kúnni").
- **Óprófað:** raunveruleg sala án stofnunar á lifandi (engin slík sala til 10.11 kl. 21); Claude býr ekki til prófunarsölu með R-númeri.
- Próf án skrifa: `tools/prof-uppgerd-skrif.js` (`Uppgerd.sala()`), sjá skill `add-feature`.

## Sprinkler-þjónustusamningur (503) — 11.11.2026

- **Hvað:** útfyllanlegur fjögurra greina þjónustusamningur um eftirlit með vatnsúðakerfi (`js/patches/503-sprinkler-samningur.js`),
  eftir fyrirmynd sem Agnar sendi. Opnast á TVEIMUR stöðum: „Sprinkler-samningur" á Tilboð & samningar (201) og „📜 Þjónustusamningur"
  í haus verðlistans Sprinklerkerfi (502), vinstra megin við „⚙ Stillingar".
- **Gögn:** sama geymsla og önnur form síðunnar — `app_settings.tilbod_hub` (fylki, yfirskrifast heilt), tegund `sprinklersamn`,
  auðkenni `P<tími>`. Telst með „Samningar" (flokkur). Engin ný tafla, engin tenging við `thjonustusamningar` (50/94).
- **Verð:** nýtt form sækir þóknun úr `Verdlistar.lidir('sprinkler')` (`sp-q`, `sp-a`, `sp-akstur`) EF verð er þar; annars er
  reiturinn tómur (`null`, ekki 0) og prentast sem auð lína til að handfylla. Aldrei fundið upp verð. Vistaður samningur heldur sínum tölum.
- **Vistun er aldrei stöðvuð:** vanti nafn verkkaupa er vistað og sagt frá í skilaboðum.
- **Viðbótarpunktar fyrir næsta form:** `TilbodHub.skra(tegund, { label, stutt, plata, flokkur, takki, titill, opna(form?), html(form), undir(form) })`
  bætir takka, listaröð, breyta/prenta-grein og teljara við síðuna án þess að snerta 201; `TilbodHub.vf` gefur sama glugga
  (`modal`), prentskel (`docShell`, `printDoc`), geymslu (`getHub`, `saveHub`) og talnasnið. `Verdlistar.hausTakki(listaId, { texti, titill, smellur })`
  setur takka í haus verðlista.
- **Lagað í leiðinni:** „Loka" í fæti allra forma á Tilboð & samningar var ótengdur takki — lokar nú. Smell utan glugga ver 177
  (modal-dirty-guard) nú þegar; 503 spyr aðeins við × og „Loka" svo ekki sé spurt tvisvar.
- **Orðalag:** fyrirmyndin vísaði í „reglugerð nr 75/2000 frá Mannvirkjastofnun" — 75/2000 eru LÖG um brunavarnir. Sjálfgefinn texti vísar í
  lög 75/2000, byggingarreglugerð 112/2012 og leiðbeiningu HMS um sjálfvirk slökkvikerfi (ÍST EN 12845). Reiturinn er frjáls texti.
- **Prófað á dev með uppgerðum skrifum** (`tools/prof-uppgerd-skrif.js`, raunverulegir smellir): opnun á báðum stöðum, verð úr lista,
  samtala (4 × 24.000 + 31.000 = 127.000 án vsk → 157.480 m. vsk), prentun með auðum línum, vistun, breyta, 375 px án yfirflæðis.
  **Óprófað:** raunveruleg vistun á lifandi `app_settings` og prentun á pappír (blaðsíðuskil).

## Verkferlar (504), Verð samkeppnisaðila (505), byggingarvísitala og netfang — 11.11.2026

- **Verkferlar** (`js/patches/504-verkferlar.js`): upplýsingaskjal per þjónustu — hvað er gert við skoðun, eftir hvaða reglum, verð og
  fyrirvarar. `app_settings.verkferlar[<id>]`; skjölin tvö frá Agnari (neyðar- og útgöngulýsing, brunaviðvörunarkerfi) eru STOFN í kóðanum
  og fara á þjóninn við fyrstu breytingu. Opnast með „📄 Verkferill" í haus allra verðglugga (502 og 410) og „Verkferlar" á Tilboð & samningar.
  Formið Þjónustusamningur (201) hefur „Sækja verkferil…" → reiturinn Verkþættir, prentast á undan skilmálum.
- **Verð samkeppnisaðila** (`js/patches/505-samkeppnisverd.js`, tafla `samkeppnisverd`, `sql/samkeppnisverd.sql`): ein röð per verð —
  frá hverjum, liður, verð ÁN vsk, eining, dags, tilefni, stærð, staður, athugasemd, `okkar_lidur` (tenging við lið í okkar verðlista).
  „📊 Verð samkeppnisaðila" í haus allra verðglugga + á Tilboð & samningar. Dálkar: „Á verðlagi í dag" (uppreiknað með vísitölu
  byggingarkostnaðar) og „Okkar verð" með mun í %. Verð gefið upp með vsk er umreiknað við skráningu. Mjúk eyðing (`eytt`).
  Samanburður við okkar verð virkar aðeins fyrir verðlista í 502; flokkarnir í 410 eiga ekki liði á því formi.
- **Byggingarvísitala:** Hagstofa, tafla VIS13000 (grunnur 2021 = 100), `https://px.hagstofa.is/pxis/api/v1/is/Efnahagur/visitolur/2_byggingarvisitala/byggingarvisitala/VIS13000.px`.
  POST með JSON-fyrirspurn **ÁN Content-Type-hauss** — með `application/json` sendir vafrinn forskoðun sem Hagstofan svarar án CORS-hausa
  („Failed to fetch"). Sprinkler-samningurinn (503) sækir nýjasta gildið á nýju formi og prentar „130,4 stig (október 2026, grunnur 2021 = 100)".
  Viðmið: síðasta BIRTA gildi á deginum (gildi mánaðar birtist um 23.) — fyrirmyndin frá 15.09.2022 bar 108,3 = ágúst 2022.
- **Bráðabirgðaverð Sprinklerkerfi** (Agnar: „svona í bili"): ársfjórðungsskoðun 24.000, ársskoðun 31.000, akstur 2.676 kr. án vsk. — úr
  samningi samkeppnisaðila frá 2022; uppreiknað til október 2026 væri það 28.898 / 37.326 / 3.222. **Neyðarljós** (verð Agnars sjálfs):
  tímavinna 14.500 kr./klst., sjónskoðun „frá 29.000" (lágmark 2 klst.). Allt í STOFN í 502 — listi sem er vistaður á þjóninn ræður.
- **Netfang út á við er slokkvitaeki@brunaholf.is** (Agnar 11.11.2026). Breytt á 33 stöðum sem viðskiptavinur sér (prenthausar, undirskriftir,
  skjalasniðmát, gátt, vefverslun, AI-svör) og í `app_settings`: `branding.email`, `email.signature`, `skjalasnidmat[0|3].html`
  (afrit: `backup_20261111_app_settings_netfang`). **EKKI breytt:** pósthólfsauðkenni (`email_digest.account = 'eldklar@eldklar.is'`),
  Gmail-sendandi (`SJALFGEFID_FRA`, `FRA`, hub `MAIL_FROM`) og `email.from_email` — kerfið sendir og les áfram úr eldklar@-hólfinu.
  Að skipta þeim út brýtur póstlestur og sendingu nema nýja hólfið sé tengt sem sendandi.
- **Viðbótarpunktar:** `ThjonustuTengingar.hausTakki(o)` (410, allir þrír flokkar), `Verdlistar.hausTakki('*', o)` (allir listar í 502),
  `TilbodHub.tol(o)` (verkfærataki hjá Verðskrá). Prófunartólið hefur nýjan ham `Uppgerd.blandad()`: lestur af þjóni, skrif uppgerð.
- **Óprófað:** raunveruleg vistun verkferils og samkeppnisverðs á lifandi (aðeins uppgerð skrif); prentun á pappír.

- **16.11.2026** — Söluritillinn (142): tækjalína sem bætt er við sölu EFTIR stofnun fær nú eigið verk (verkLinurTilStofnunar, merkið _ny, sími og sóttmáti systurverks); áður týndust slíkir kútar á verkstæðinu. Próf: tools/test-sala-ritill-verk.cjs. [C#2510] (js/patches/142-sale-editor.js)

- **16.11.2026** — PDF úr 176 klipptist hægra megin þegar haldarinn var 794 px: breiddin á að vera (210 − 2 × MARGIN_MM) mm svo hún passi við mm-spássíur html2pdf (lagað 53adc900). [C#2508] (js/patches/176-company-report-email.js)

- **16.11.2026** — Payday-höfnun á rafrænum reikningi er nær alltaf kúnnans megin (60 af 61 mælt 16.11.2026: viðtakandi tekur ekki við rafrænum reikningum). Ekki galli í payday-push; reikningurinn fer þá í pósti, og án netfangs aðeins sem bankakrafa. [C#2504]

- **17.11.2026** — 17.11.2026 (samantekt á breytingum í skrám sem ég gæti, lesið úr commitum): (1) Skýrslugerð — kóðasjálfgildið er nú 4.600 í 129 (SlokkVisitDefaults), 165, 410 (×3), 488 og _gatt-serkjor; lifandi verðið býr áfram í app_settings.slokk_visit_defaults og test/skyrslugerd-ein-heimild.test.cjs fellur ef afritin víkja hvert frá öðru (589b40fe). Náist app_settings ekki fellur appið á sjálfgildið — þess vegna verður það að vera rétta verðið. (2) 142 SaleEditor.erIPayday(sale) er EIN heimild um „komin í Payday/DK“ (invoiced_at/krafa_sent_at/dk_invoice_id); Sótt ✓ (121) breytir aldrei upphæð sendrar sölu — viðbót fer á nýja sölu (66467be3, test/sott-send-sala.test.cjs). (3) combo-yfirlit kallar á Brunahólf með x-hub-toki (_bh-toki.cjs, e6f61448). (4) 36 Birgðir: listinn í Brunastáli C + spjaldasýn; verð og magn eru áfram vistuð með sömu föllum úr töflunni — spjaldið sýnir aðeins (e881e36c).

- **17.11.2026** — Reiknings-PDF (233, jsPDF 2.5.1 + Helvetica) skrifar AÐEINS Latin-1 + 27 WinAnsi-tákn (mælt staf fyrir staf); einn stafur utan þess (−, ↔, →, ł, emoji) og ALLUR strengurinn fer í UTF-16 → „H l e ð s l a“ teygt yfir FJÖLDI/EININGAV. Hver texti í 233 fer gegnum pdfText (window.PdfTexti.texti) — nýr doc.text með breytilegum texta án hans fellir test/reikningur-pdf-letur. Gölluð eldri afrit endurgerast með ÚTGÁFU smiðsins sem bjó þau til + vörpuninni (núll frávik), aldrei núverandi útgáfu (framsetning breyttist 10.07, 10.08, 17.09). (js/patches/233-uttekt-pdf-autosave.js)

- **17.11.2026** — 17.11.2026 — Sótt (121) og Verkspjald (430): hleðsla ⇄ yfirferð parast eftir tegund + stærð + þjónustu í 518 (ThjSkipti), ekki heiti. Vörulistinn er ósamkvæmur: Léttvatnstækis 6L. hleðsla á móti Léttvatnstæki 6L. yfirferð, CO₂ 5 kg. yfirferd án ð, eldri verkliðir bera aðeins orðið. Í Sótt: rofi Yfirferð | Hleðsla | Ónýtt á hverju tæki; Ónýtt = hak af = ekki rukkað og dregur SÍNA línu frá; valið vistast við Klára (verklidur.service + athugasemd á sölu).

- **20.11.2026** — 20.11.2026: ávarp í öllum póstum sem appið býr til er nú Góðan daginn (var Sæl(l), Sæl/l, Sæll/sæl): 254 standardText, 240 uppkast og HTML-umgjörð (ávarp einu sinni), 275 tilboð, 176 skýrsla, 53, 62, 85, 94, 487 Hunter, gatt-admin og postur-reply. Texta sem fer út má ekki breyta án þess að bumpa ?v= í index.html (audit-utgafumerki) og netvörður fer yfir 254.
