# Beiðnalisti Agnars → Claude

Hér skrái ég niður punktana sem Agnar hendir inn. Reglan: **ný beiðni stöðvar ekki
það sem er í gangi** — hún fær númer og bíður, núverandi verk klárast fyrst
(gert + prófað + staðreyndaskoðað). Sjá `feedback_request_dashboard`.

Staða: `NÝ` · `Í VINNSLU` · `Í YFIRFERÐ` (agent segist búinn, ég á eftir að fara yfir) · `KLÁRT` · `BÍÐUR AGNARS`

---

## 2026-09-09

| # | Beiðni | Hver | Staða |
|---|--------|------|-------|
| B1 | Geta eytt/falið öppum — „þoli ekki að geta ekki stjórnað neinu" | Claude | ✅ KLÁRT |
| B2 | Collapse-takki á teikningar (Teikning-borðinn á fyrirtækjasíðu) | agent | ✅ KLÁRT — yfirfarið |
| B3 | Texti á rekstrarfélögum helst ekki — dettur út við að fara af síðunni. Verður að festast og haldast milli tölva. **Finna hvað í reitnum veldur því + leita að sömu stillingu annars staðar á síðunni og laga þar líka** | agent | ✅ KLÁRT — yfirfarið |
| B4 | Þjónustuborð: breytingar mögulegar — en ekki á öllum. Athuga hverjir og af hverju | Claude | ✅ KLÁRT |
| B6 | Teikningar eru geymdar EINGÖNGU í `localStorage` (`fp_<id>`) — þær fylgja ekki milli tölva og glatast ef vaframinni er hreinsað. Brýtur samstillingarregluna í CLAUDE.md | — | NÝ |
| B8 | Enginn „Stólpi-afsláttur" er til — talan er afsláttarstiginn á prófílnum (tilboðsverð → afsláttarhópur → sjálfvirkur %). **Aðeins einn hópur er til (Center Hotels) og hann geymir prósentur þótt raunsamningurinn sé föst verð.** Þarf ákvörðun Agnars | — | BÍÐUR AGNARS |
| B7 | Villa í patch 109: „Engir tækjadottar enn"-kassinn bætist við á 1,5 s fresti án þess að sá fyrri sé fjarlægður — hleðst upp meðan teikning án dotta er opin | — | NÝ |
| B5 | Daufar textalínur á fyrirtækjabannerinn fyrir upplýsingar um verin (fjöldi íbúða, fjöldi hæða, hringja á undan…) + grafa upp Stólpi-afsláttartöluna og sýna hana í einni línunni | agent | ✅ KLÁRT — yfirfarið |

| B9 | **Sjálfvirkt % og Tilboðsverð vantaði í afsláttarkassann** — aðeins „Hópur" stóð eftir | Claude | ✅ KLÁRT |
| B10 | **KRITÍSKT: texti í athugasemdareitum hvarf við harða endurhleðslu.** POS-forsóknin skrifaði 10-súlna lista yfir `Companies.list` (32 súlur) — `banner_note`, `plan_note` o.fl. urðu `undefined` og reitir birtust tómir. Ekkert eyddist, það sást bara ekki | Claude | ✅ KLÁRT |
| B11 | Center Hotels: bannerlínan sýnir „Afsláttur —" þótt félagið sé í hópi með 10–32% — hópurinn er lesinn of seint | — | NÝ |


## 2026-09-30

| # | Beiðni | Hver | Staða |
|---|--------|------|-------|
| B23 | **Brunakerfis-miðjan, lagfæringar (skjámynd 18:3x):** (a) „Skoðað 29/07/2026"-platan upp í hægra horn vinstra hauss; (b) „Stækka" burt — gerir það sama og „Opna skýrsluna"; (c) stöðuplöturnar (Skýrsla lokið · R-… drög · N línur · einingar) hægrijafnaðar út í kant hægra hauss; (d) **allir hnappar ferkantaðri** (minni rúnnun) í stíl við þemað — byrja á Vista · Senda · Reikningur · Skoðunarskýrsla | Claude | ✅ KLÁRT |
| B24 | Línur reiknings (Brunakerfi): **hlutföll dálkanna** svo heitið („Samantekt og gerð skoðunarskýrslu") passi innan í reitinn — nafnið klippist | Claude | ✅ KLÁRT |
| B25 | Línur reiknings (Brunakerfi): **sjálfgefið Akstur ×1 og Skýrslugerð ×1** — vantar á skýrslur sem urðu til áður en 273 fékk akstursliðinn | Claude | ✅ KLÁRT |
| B26 | **„Aflæsa skýrslu"-hnappur á Brunakerfis-blaðinu:** haka við beint af skjá og breyta tölum eins og í slökkvikerfis-skýrslunni (386); þegar ýtt er á tölureit birtast **+ / −** til að hækka og lækka. Vinnusvæðið (273) verður varaleið. Krefst HTML-blaðs (273 „Skýrsla"-sýn) í stað PDF-ramma | Claude | ✅ KLÁRT |
| B27 | **Teikning-stikan** („Teikning · 5 staðsetningar" með − 100% + ↺ Sýna) og **Viðbóta upplýsingar**-reiturinn undir miðjunni: færa í tákn á „Teikning"-hnappinn í efri hluta, samanfellt sjálfgefið, hægt að opna | Claude | ✅ KLÁRT |
| B28 | **Vinnusvæðið (273 inni í 🚨-flipanum, 408): þjappa** — haus, reitir og búnaðaryfirlit taka of mikið pláss | Claude | ✅ KLÁRT |
| B29 | **Verðlisti: „Föst lína (alltaf 1×)" á Akstur og Vinnu pr. klst. virðist ekki virka** — tengingin ER vistuð á þjóni (30.09 18:43) og ⚡ Reikna út notar hana; föstu línurnar bætast hins vegar ekki sjálfkrafa á skýrslu sem þegar á línur. Lausn: „Sjálfgefið vantar"-röðin í miðjunni býður allar föstu línurnar sem vantar, einn smellur hver | Claude | ✅ KLÁRT |
| B30 | Línur reiknings (Brunakerfi): **afsláttur á alla heildina** — reitur undir línunum (kr m. vsk, líka hægt að slá inn %) | Claude | ✅ KLÁRT |
| B31 | **Vöruvalslistinn „Velja vöru / þjónustu" (117) í slökkvitækja-úttekt er heiftarlega ljótur og erfitt að finna á honum** — endurhanna í Brunastáli, betri leit og flokkun | Claude | NÝ |
| B32 | **Verðtengingar-glugginn (410) í slökkvitækja-úttekt** — ljótur og ekki í þema síðunnar; Brunastál C | Claude | NÝ |
| B33 | **Samskiptaboxið (286/359) hresst upp** — ljósar rendur/bönd til að brjóta upp, í Brunastáli | Claude | ✅ KLÁRT |
| B34 | **Ársbandið í Skjöl og viðhengi (403/199) meira áberandi** — árin og skiptingin milli ára sjást ekki nógu fljótt | Claude | ✅ KLÁRT |
| B35 | **„Skýrsla og reikningur saman" (311) og blokkirnar undir:** raðirnar taka fulla breidd með langt bil milli Úttektar og Senda — þjappa, sameina í 1/3 eða 1/2 breidd | Claude | ✅ KLÁRT |
| B36 | **„Póstafrit: Á"-hnappurinn** (haus Skjöl og viðhengi) á frekar heima efst á prófílnum sem einfalt hak | Claude | ✅ KLÁRT |
| B37 | **Stjórnstöð (Kjarni):** auka breidd meginhlutans; fjólublái liturinn „skelfilegur" — þemað í „big boss": ljóst, gull og svart | Claude | NÝ |
| B38 | **Sótt-glugginn (afhending, „Sókn — kt."):** hressa upp; afslátturinn (Lokastilling fyrir kvittun) inn á sömu opnu svo hann týnist ekki; guli liturinn burt; græni hausinn í dökkmálmsgrænan; samræma við þemað | Claude | NÝ |
| B39 | **Allir viðskiptavinir:** öll síðan í svipað þema og Fyrirtæki í þjónustu (Brunastál C), án súluritsins; halda öllum tökkum í bili | Claude | NÝ |
| B40 | **Kúnnasíðan** (úr Allir viðskiptavinir → „Opna kúnna-síðu", blái hallinn): „alveg ömurlega ljót" — laga liti og breidd í samræmi við Fyrirtæki í þjónustu (Brunastál C) | Claude | NÝ |
| B41 | **Fyrri viðskipti-glugginn** (kt.-hreyfingar, 370/167): pastellitirnir ekki í samræmi við þemað — hressa upp í Brunastáli | Claude | NÝ |
| B42 | **Valstikan í slökkvitækja-úttekt** (Velja allt · Yfirferð · Hleðsla · Ónýtt · Breyta stærð · Síðasta/Næsta skoðun · Prenta QR · Eyða, 404): samanfelld sjálfgefið, hægt að opna | Claude | ✅ KLÁRT |

## 2026-09-10

| # | Beiðni | Hver | Staða |
|---|--------|------|-------|
| B18 | Brunakerfi-spjaldið: tengja reikning sjálfur, lítið × í stað ruslatunnu, ein „bæta við skjali"-rönd neðst (Skýrslu/Reikningi), velja aðal-reikning ársins — „stílhreint og skýrt" | Claude | ✅ KLÁRT |
| B19 | Collapse-takki á Sara vinnublöð svo restin af Þjónustuborðinu nýtist | Claude | ✅ KLÁRT |
| B20 | Mynd af byggingunni í fyrirtækjabannernum — ein flís, enginn texti, stækkar við smell án teygingar; teikningin falin sjálfgefið | Claude | ✅ KLÁRT |
| B21 | Sameina POS-greinarnar tvær frá 9. sept. (kanónísk kúnnastofnun). Netvörður fann slitinn vír 3 (þögul bilun → sala án kúnna) — tengdur í `logProblem` án kennitölu; `audit-stadur-nr` hert og sannreynt í báðar áttir; 43/43 græn; live `13b3fb8` | Claude | ✅ KLÁRT |
| B22 | Kjarni Stjórnstöð (`slokkvitaeki.vercel.app/kjarni`): Teikningar-spjaldið huldi flipana Yfirlit/Vefir/Einingar/Aðstoð og heimilisfangaleitin var ómótuð — niðurstöðurnar lentu ~3.000 px neðar á síðunni. Tvær rætur: þemaregla `.ms > *` (26.08) felldi sticky-hausinn; Tailwind aðeins hlaðið á TurboPaint. Lagað í kjarni `8a0054b` + leitarspjaldið bundið við gluggahæðina (skarst ~70 px); prófað á build, localhost og framleiðslu í Chrome | Claude | ✅ KLÁRT |

## Textatap-sópið 2026-09-09 — „enginn texti má nokkurntíma tínast"

**Klárað og í loftinu.** 30. audit (`audit-textatap.cjs`) ver bæði mynstrin héðan í frá.

| Fannst | Hvar |
|---|---|
| Nótan vistaðist ALDREI (óskilgreint `SB`) | 175 rekstrarfélög |
| Mjó fyrirspurn skrifaði yfir breiðan lista | 114 POS-forsókn → `Companies.list`, `Vidskiptavinir.list` |
| Allur listinn blankaðist (1310 → 0) | `Companies.load()` þegar `DB.online` var ósatt |
| Drög að svari hurfu við stöðusmell | 287 póstar |
| Titilreitur án `oninput`; lokun henti nótu | 306 þjónustuborð (mobíl) |
| ✕/Esc hentu útfylltu eyðublaði | 94, 142, 273 |
| „Vistað" þótt vistun mistækist | 306, 286, 308, 96, 305, 166 |
| Debounce án blur-flush | 361, 166, 198, 97, 147, 158, 231, 302, 00-legacy |
| `window.toast` er ekki til → villuboð birtust aldrei | 305 |
| supabase-js notar ekki keepalive | 361 (sópað með `fetch(keepalive:true)`) |

### Bíður ákvörðunar Agnars

| # | Mál |
|---|-----|
| B12 | **Sala í vinnslu er aðeins í minni.** Nafn, sími, línulýsingar og báðar athugasemdirnar í `pos.js` lifa hvergi fyrr en `checkout()` keyrir — endurhleðsla í miðri sölu hendir öllu. Vörðuð leið, þarf þitt samþykki |
| B13 | **Mobíl Þjónustuborð (306) er ekki opnanlegt** — skráir sig gegn `NavRegistry`/`registerNavItem`/`registerView` sem eru hvergi til í kerfinu. Heil síða dauð |
| B14 | **Vaktlistinn (`adstod_watchlist_v1`) er frjáls texti aðeins í localStorage** — sést ekki milli tölvanna fjögurra, hverfur með vaframinni |
| B15 | `customers_base.general_notes` — 6–8 raunverulegar nótur sem enginn kóði les (t.d. „SKYLDA: beiðnanúmer á reikninga til Reykjavíkurborgar" hjá Hitt húsið). Hvar á að birta þær? |
| B16 | `js/vbu.js` „Viðbóta upplýsingar" skrifar í dálk sem er ekki til (`fyrirtaeki.vidbota_upplysingar`) og birtist bara ef félagið á teikningu. Fjarlægja eða laga? |
| B17 | 231 þjónustuborð sækir viðskiptavini án `deleted_at`-síu → 247 eyddir í leitinni |

### Bíður ákvörðunar Agnars (eldra)

| # | Mál |
|---|-----|
| A1 | 11–14 félög þar sem prófíll og skýrsla stemma ekki — hvor talan er nýrri? |
| A2 | Vélrás 1740/1741/1742 eru með `stadur_nr = null` |
| A3 | Tæki ranglega merkt `urelt` hjá Sólvangsvegi 1 (160) og Heimaleigu Mannheimum (626) |
| A4 | Á að draga reiknivélina úr patch 129 út svo öll ~595 félög fái raunverð (ekki bara 88)? |
