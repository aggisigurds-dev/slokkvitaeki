---
name: sannreyna-fyrirtaeki
description: Verkferlið „Sannreyna fyrirtæki" — fara yfir fyrirtæki eitt í einu og sannreyna sjö atriði (kt við nafn og heimilisfang, kt við skýrslu, geopunkt, húsmynd, tækjalista við síðustu skýrslu/reikning, netfang og samskipti, hvort félagið er enn starfandi), leiðrétta það sem er sannað og skila frávikum í töflu. Forráðamaður er agentinn `fyrirtaeki` (M) sem kallar á `kunnaskra`, `natalie`, `kort`, `postur` og `sara-coworker` eftir prófum. Staðan sést í boxinu „Sannreyna fyrirtæki" í Vinnusamantekt (489). Ekki fyrir eina tækjatölu (fact-check) né leit að peningum (rannsoknarhamur). Kveikjuorð: sannreyna fyrirtæki, keyra sannreyna, sannreyna listann, factchecka fyrirtækin, fara yfir Eftir 2026, fara yfir Gleymt, eitt í einu, kt passar við nafn, kt passar við skýrslu, geopunktur, götumynd, enn starfandi.
---

# Sannreyna fyrirtæki

Samþykkt af Agnari 11.11.2026. Fyrsta keyrsla: „Eftir 2026" (168 félög), vinnuskjal `docs/FACTCHECK-EFTIR-2026.md`.

## Svona er þetta keyrt (gildir fyrir hvaða módel sem er)
1. Lestu ALLA þessa skrá áður en fyrsta skipun er keyrð. Segðu Agnari í einni línu hvaða verkferli fer af stað og á hvaða mengi.
2. Farðu skrefin Í RÖÐ. Slepptu engu skrefi og bættu engu við. Skref sem ekki er hægt að vinna er skráð ÓMÆLT með ástæðu — ekki giskað, ekki sleppt þegjandi.
3. Hver fullyrðing í skilunum á sér skipun eða fyrirspurn sem þú keyrðir Í ÞESSARI LOTU. Tala úr minni, úr eldra skjali eða úr skilum undiragents er ekki mæling — endurmældu eða skrifaðu ÓMÆLT.
4. STOPPAÐU og spyrðu Agnar ef: tala stemmir ekki við það sem skrefið krefst, skrif eru ekki talin upp í þessari skrá, eða tvær heimildir stangast á og skráin segir ekki hvor ræður.
5. Skrifaðu AÐEINS það sem skráin leyfir. Allt annað fer í töfluna til Agnars.
6. Áður en þú segir „búið": farðu yfir kaflann um lok/skil lið fyrir lið og segðu hvað var prófað, hvernig, og hvað ekki.

## Hver vinnur hvað
Forráðamaður keyrslunnar er **`fyrirtaeki` (M)**. Hún heldur listanum, skilar töflunni og skráir stöðuna. Hvert próf á
sinn eiganda; reglur hans gilda um prófið (lestu skrána hans áður en þú mælir, eða kallaðu á hann sem undiragent úr
repo-rót). Aðallotan vinnur prófin sjálf í röð — undiragentar aðeins þegar próf festist, aldrei í hópum yfir allan listann.

| Próf | Eigandi | Skrá |
|---|---|---|
| A kt ↔ nafn ↔ heimilisfang, G enn starfandi | `kunnaskra` | `brunaholf/.claude/agents/kunnaskra.md` |
| B kt ↔ skýrsla | `sara-coworker` | `.claude/agents/sara-coworker.md` |
| C geopunktur, D húsmynd | `kort` | `.claude/agents/kort.md` |
| E tækjalisti ↔ skýrsla/reikningur | `natalie` (rekstrarfélög: skill `rekstrarfelog-parun`) | `.claude/agents/natalie.md` |
| F netfang og samskipti | `postur` | `.claude/agents/postur.md` |

## Skref 0 — mengið
1. Inntak er listi (sía í Ársskoðun, mánuður, rekstrarfélag) eða stök félög. Sé það sía á skjá: lestu listann af
   skjánum (`filteredSorted()` í 153) eða endurgerðu síuna, og **talan verður að vera sú sama og á skjánum**. Stemmi
   hún ekki er ekki haldið áfram.
   Án innskráningar í vafra: endurgerðu síuna í SQL, merktu mengið „ÓSTAÐFEST á móti skjá" efst í vinnuskjalinu og
   biddu Agnar um töluna af skjánum; prófin mega hefjast á félögum sem hann nefndi sjálfur.
2. Athugaðu `app_settings.sannreyna_fyrirtaeki.keyrslur` og vinnuskjalið: er keyrslan þegar hafin? Þá er haldið áfram
   þar sem frá var horfið — félag með úrskurð í skjalinu er ekki mælt aftur nema Agnar biðji um það. **Röð listans er
   föst (heimilisfang eins og skjárinn, annars `fyrirtaeki.id`) og skráð í vinnuskjalið; `sidasta_id` í stöðulyklinum
   segir hvar næsta lota byrjar.**
3. Flokkaðu: **einn staður** (ein `fyrirtaeki`-röð á kt, ekki í `customers_base.rekstrarfelag` né
   `app_settings.rekstrarfelog`) eða **rekstrarfélag** (margir staðir á kt). `stadur_nr > 1` á einu röðinni á kt er
   vísbending um horfinn systkinastað — nefndu það.
4. Félag sem á opið mál á borðinu um sama efni er merkt „á máli #N" og ekki mælt upp á nýtt.

## Skref 1 — sjö próf per félag
Úrskurður er mældur með heimild eða **ÓMÆLT** — aldrei „líklega". Kt er normalíseruð báðum megin
(`replace(kennitala,'-','')`).

### A. Kt ↔ nafn ↔ heimilisfang
- Okkar: `fyrirtaeki` (nafn, kennitala, heimilisfang, postnumer).
- Heimild: `fyrirtaekjaskra_stada` (nafn, heimilisfang_full, rekstrarform, `sott`). Eldri en 30 dagar eða vantar →
  keldan.is/Leit á kt. `/api/kt-lookup` er okkar eigin grunnur og telst ekki heimild.
- **Lögheimili er ekki þjónustustaður.** Bar, verslun eða útibú er sjaldnast á lögheimilinu. Heimilisfang staðarins er
  sannað með TVEIMUR af: skýrslutexta, pósti frá kúnnanum, reikningi, vef félagsins.
- Úrskurðir: PASSAR · NAFN ANNAÐ (kt annars félags) · HEIMILISFANG ANNAÐ (okkar | heimild) · GÖTU VANTAR (aðeins
  póstnúmer og bær) · KT FINNST EKKI · Á EKKI VIÐ (rekstrarfélag — sagt, ekki sleppt þegjandi).

### B. Kt ↔ skýrsla
- Nýjasta úttektarskýrsla: `arsskodun_report_facts.source_doc_id` / `customer_documents` (`doc_type='uttektarskyrsla'`,
  ekki `is_duplicate`), lesin um Drive á `drive_file_id`. **Innihaldið ræður, ekki skráarnafnið.** Skýrsla er aldrei
  opnuð í 168 í vafra (skrifar skoðunarmánuð).
- Bera saman: kt, nafn og heimilisfang í fyrstu málsgrein skýrslunnar við röðina.
- Úrskurðir: PASSAR · ÖNNUR KT (hvaða) · ENGIN KT Í SKÝRSLU (algengt 2023) · SKÝRSLA ANNARS STAÐAR (sama kt, annað
  heimilisfang) · SKRÁ FINNST EKKI (Drive svarar „not found" — nefndu doc-id) · ENGIN SKÝRSLA · ÓMÆLT (Drive
  ótengt eða svarar ekki — aldrei túlkað sem „engin skýrsla").

### C. Geopunktur
- Skráð: `app_settings.co_bygging_mynd[id].hnit` og `geocode_cache` (`query` = heimilisfangsstrengurinn).
- Rangt ef: heimilisfang án götu (punkturinn er þá miðja póstnúmers, 64.145981 / -21.9422367 í 101), sami punktur á
  fleiri óskyldum röðum, eða punkturinn fylgir heimilisfangi sem A felldi.
- Óháð mæling: `/api/husmynd` skilar `hnit` fyrir heimilisfangið; fjarlægð frá skráðum punkti í metrum.
- Úrskurðir: PASSAR (innan 40 m) · RANGUR (N m, hvers vegna) · ENGINN · ÓMÆLT. Handfærður punktur (mapfix) er ekki
  yfirskrifaður.

### D. Húsmynd
- Skráð: `app_settings.co_bygging_mynd[id]` — `uppspretta`: `handvirkt` · `google-maps-skjamynd` · `google-streetview` ·
  `gatt` · `borgarvefsja-2018` / `mapis-loftmynd` (loftmyndir). **Myndin er alltaf SKOÐUÐ**, uppsprettan ein segir ekkert.
- **Tilgangur myndarinnar (Agnar 11.11.2026): að við finnum húsið og þekkjum það þegar við komum á staðinn.** Hún á
  því að vera tekin UTAN af húsinu, frá götunni eins og maður kemur að því: allt húsið (eða sá hluti sem staðurinn er
  í) í einni mynd, með inngangi og helst húsnúmeri, skilti eða öðru kennileiti. Spurðu: „myndi ég þekkja húsið af
  þessari mynd úr bílnum?" Sé svarið nei er myndin ekki í lagi.
- **Í lagi aðeins ef húsið sjálft sést að utan: framhlið eða inngangur staðarins.** Nærmynd af hurð eða vegg án
  samhengis dugar ekki; fjarmynd þar sem húsið er eitt af mörgum dugar ekki heldur. Ekki í lagi: innimynd (verslun,
  veitingasalur — merkt „Trusted Photographer"), gluggalaus veggur, bílastæði, sund milli húsa, gatan án hússins,
  loftmynd. Agnar 11.11.2026: sjálfsóttu myndirnar eru lélegar — vera strangur.
- `handvirkt` er **aldrei snert**, sama hvernig myndin er.
- Ný mynd: fyrst `/api/husmynd` með `{address, vilja:'streetview'}` (Node `fetch`, ekki PowerShell). Mælt 11.11: af
  fjórum sjálfsóttum myndum var engin góð (innimynd, veggur, sund) — fallið velur næsta panó, ekki besta sjónarhornið.
  Sé myndin ekki í lagi: Google Maps götusýn í vafra á réttum punkti, snúa að framhlið, skjámynd
  (`uppspretta: 'google-maps-skjamynd'`). Finnist ekkert nothæft: ENGIN GÖTUMYND TIL, ekkert vistað.
- D er ekki unnið fyrr en A og C eru rétt (mynd af röngu húsi er verri en engin).
- Úrskurðir: HANDSETT – ÓSNERT · Í LAGI · LÉLEG (hvað sést) · LOFTMYND · ENGIN · NÝ MYND TILBÚIN (sýnd Agnari) ·
  ENGIN GÖTUMYND TIL.

### E. Tækjalisti ↔ síðasta skýrsla / reikningur
- Listi: `uttaeki` á `fyrirtaeki_id`, `status <> 'urelt'`, talið per `type` + `size` og sýnt per `status` (sían
  `= 'active'` ein felur heil félög með aðra stöðu). `urelt` telst ekki en er nefnt ef það er tvítak af virku tækjunum.
- Skýrsla: tölurnar í skýrslutextanum (B) og `arsskodun_report_facts.equipment`. Nýjasta útgáfa ræður.
- Reikningur: `solur` (tækjalínur, ekki kredit, `source` uttekt/vinnublad) eða `stolpi_reikningar` á `kt10` fyrir
  07.05.2026 — Stólpi geymir aðeins upphæð, þá er sagt „reikningur til, línur ólesnar".
- Ef reikningur er YNGRI en nýjasta skýrsla (skoðað og rukkað, skýrslu vantar) er það sérstakt frávik: SKÝRSLU VANTAR
  FYRIR <ár>.
- Úrskurðir: PASSAR (tegund fyrir tegund) · LISTI ≠ SKÝRSLA · LISTI ≠ REIKNINGUR · SKÝRSLA ≠ REIKNINGUR · SKÝRSLU
  VANTAR · EKKERT TIL. Tækjaskrá er ekki breytt; mismunur er aldrei rukkaður eftir á.

### F. Netfang og samskipti
- Skráð: `fyrirtaeki.netfang`, `charlize_contacts` (kt með bandstriki), `charlize_yfirlit(kt)`.
- Leit: `email_digest` á léni netfangsins, kt í texta, nafni staðar og heimilisfangi; bæði INBOX og SENT og
  `to_addresses`. Lestu þráðinn allan — þriðji aðili getur hafa svarað.
- Greindu hlutverk: tengiliður staðar · bókari / bókhaldsstofa · umsjónarfélag · reikningamóttaka (t.d. Fjársýslan).
- Úrskurðir: STAÐFEST (sést í raunverulegum pósti, dags.) · FUNDIÐ (nýtt, með heimild) · VAFASAMT (skráð en sést
  hvergi eða tilheyrir öðru félagi) · EKKERT FANNST; auk „síðast í sambandi: dags · efni" og sérþarfa sem pósturinn
  sýnir (rafrænir reikningar o.þ.h.).

### G. Enn starfandi
- Félagið: `fyrirtaekjaskra_stada.stada` (tómt = engin athugasemd) / keldan.is: afskráð, gjaldþrota, í slitum, sameinað.
- Staðurinn: vefur félagsins, póstur, ferðanóta. Rekstrarfélag: kt lifir þótt staður loki — spurt um STAÐINN.
- Lífsmerki hjá okkur: síðasta skoðun, síðasti reikningur og hvort hann var greiddur, síðasti póstur. Meira en tvö ár
  án nokkurs er sagt berum orðum — það er spurning um þjónustustöðu, ekki sönnun um lokun.
- Úrskurðir: STARFANDI · AFSKRÁÐ / GJALDÞROTA / Í SLITUM (dags., heimild) · STAÐUR LOKAÐUR / FLUTTUR · ÓMÆLT.

## Skrif — hvað má og hvað ekki
| Hvað | Hver ákveður | Hvernig |
|---|---|---|
| Heimilisfang staðar sannað í tveimur heimildum | Agnar segir „leiðrétta" (einu sinni per lotutöflu) | afrit í `backup_<dags>_sannreyna_heimilisfang`, lína í `review_note` með gamla gildinu og heimildum, lesið til baka |
| Netfang sem sést í raunverulegum pósti | sjálf | `charlize_contacts`, source „Sannreyna fyrirtæki <dags>"; skráð netfang aldrei yfirskrifað |
| Ný húsmynd | Agnar sér myndina fyrst | `co_bygging_mynd[id]` um `app_settings_merge`, gamla færslan í `fyrri`; aldrei yfir `handvirkt` |
| Kt, nafn, tækjaskrá, skoðunarmánuður, þjónustustaða, sameining/tenging | Agnar | aðeins í lotutöfluna |
| Mál á Þjónustuborð | — | mest tvö per keyrslu, aðeins peningar eða þjónustustaða, mælt sama dag |

Netföng og símar fara aldrei í skrár í repóinu (opinbert). Enginn póstur er sendur.

## Skref 2 — taktur og skil
1. Prufa á 5 félögum; Agnar staðfestir dýptina (gert 11.11.2026).
2. Síðan 10 í senn. Eftir hverja lotu: tafla í spjalli (`félag · A–G · ein lína um frávik`), efst þau sem þurfa
   ákvörðun Agnars; vinnuskjalið í `docs/` uppfært.
3. Staðan sem boxið les:
   `select app_settings_merge('{"sannreyna_fyrirtaeki":{"keyrslur":{"<lykill>":{"heiti":"…","alls":N,"buid":N,"fravik":N,"dags":"ÁÁÁÁ-MM-DD","skjal":"docs/…"}}}}'::jsonb);`
4. Kúnnafróðleikur (sérþarfir, hver borgar, hver er tengiliður) → `charlize_knowledge` scope `kunni`, ein færsla per staðreynd.
5. Lotu lýkur ekki fyrr en: hver leiðrétting er lesin til baka, 168 = úrskurðaðir + eftir, og sagt er hvað er óprófað.

## Lokagátlisti — verkið er EKKI búið fyrr en hvert hak er merkt
Skilaðu þessum lista í lokasvarinu með ✔ eða ✘ við hvern lið og einni línu um HVERNIG hann var staðfestur. ✘ er leyfilegt svar; að sleppa liðnum er það ekki. Klárist lotan ekki: segðu nákvæmlega á hvaða skrefi var hætt og skráðu það þar sem næsta lota les það (staðan / vinnuskjalið), svo hún haldi áfram en byrji ekki upp á nýtt.
- [ ] Fjöldi félaga í menginu stemmir við skjáinn eða er merktur ÓSTAÐFEST
- [ ] Hvert félag lotunnar á úrskurð í ÖLLUM sjö prófum (A–G) — ÓMÆLT með ástæðu telst, autt telst ekki
- [ ] Hver húsmynd var skoðuð með eigin augum (ekki aðeins `uppspretta` lesin)
- [ ] Hver leiðrétting á sér afrit, línu í `review_note` og var lesin til baka
- [ ] Engin `handvirkt` mynd, kt, tækjaskrá eða þjónustustaða var snert
- [ ] Vinnuskjalið í `docs/` er uppfært og ber engin netföng eða síma
- [ ] `app_settings.sannreyna_fyrirtaeki` uppfært (buid, fravik, dags, sidasta_id) og lesið til baka
- [ ] Taflan til Agnars er í lokasvarinu, frávik sem þurfa ákvörðun efst
- [ ] Keyrslan skráð: `select app_settings_merge('{"verkferli_keyrslur":{"sannreyna-fyrirtaeki":{"sidast":"ÁÁÁÁ-MM-DD","lota":"<módel>"}}}'::jsonb);` — aðeins ef ferlinu er LOKIÐ; boxið „Verkferli tilbúin til keyrslu" les þetta
