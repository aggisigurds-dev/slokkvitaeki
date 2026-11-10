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

## 12. Spegill sem er gamall les eins og frávik

`audit-payday-samraeming` flaggaði 09.10.2026 þremur kröfum sem „merkt send en
fór aldrei": R-001109, R-001110, R-001117, alls 305.333 kr. Allar þrjár BÁRU
raunverulegt `dk_invoice_id` — þær fóru í Payday kl. 15:33:58, 15:34:09 og
15:34:54. Spegillinn `payday_invoices_slokk` var síðast uppfærður **15:32:44**.
Tvær mínútur.

Vörðurinn mælir SPEGILINN, ekki Payday. Sé hann eldri en atburðurinn verður
hver nýleg aðgerð að „fráviki".

**Reglan:** áður en spegils-frávik er kallað frávik — lestu hvenær spegillinn
var uppfærður og berðu það saman við tímann á aðgerðinni. `select max(updated_at)
from payday_invoices_slokk` svarar því á einni sekúndu.

---

## 13. Hrá fyrirspurn sem hermir eftir viðmótinu — og appið hafði rétt fyrir sér

09.10.2026, spurningin var „eru þessar kröfur örugglega ósendar". Hrá SQL gaf
**23 ósendar, þar af 12 sem voru þegar kreditfærðar** — 1.741.218 kr sem leit út
eins og Agnar væri að fara að rukka tvisvar, þar af tvær með GREIDDAN
Payday-reikning á sömu upphæð.

Ekkert af því var satt. `166-krofu-yfirlit.js` (lína ~922) fjarlægir bæði
kreditfærsluna OG móðurina sem hún bakfærir:

```js
const cids = new Set(rows.filter(s => s.is_credit && s.credit_of != null).map(s => String(s.credit_of)));
rows = rows.filter(s => !s.is_credit && !cids.has(String(s.id)));
```

Fyrirspurnin mín sleppti seinni helmingnum. Viðmótið sýndi 9 kröfur, 259.852 kr —
og það var rétta talan.

**Reglan:** ætlirðu að staðfesta tölu sem viðmótið sýnir skaltu LESA síu
viðmótsins fyrst og herma eftir henni allri. Ósamræmi milli þín og appsins er
jafn líklega þín villa — og hér var það þannig. Sama gildir um
`v_solur_lifandi`, sem gerir þetta rétt og má nota í staðinn.

---

## 14. `false or NULL` er NULL

Í sömu yfirferð:

```sql
coalesce(svarad_at is not null, false) or coalesce(sonnun->>'styrkur'='svarad', false)
```

Án `coalesce` skilaði prófið **0 svöruð og 0 ósvöruð af 7** — þriggja gilda
rökfræði Postgres gerir `false or NULL` að `NULL`, og báðar talningar féllu.
Það leit út eins og „ekkert til".

**Reglan:** hver `or`/`and` yfir reit sem má vera NULL fær `coalesce(..., false)`.
Tala sem er núll í BÁÐA flokka er merki um NULL, ekki um tóman heim.

---

## 15. Rétt breyting í röngum teiknara mælist sem „engin breyting"

Sama dag: ℹ-takki bættur við hverja kröfu í `166`. Eftir hleðslu: **0 takkar**,
þótt kóðinn væri réttur og skráin þýddist. `166` teiknar kröfuraðir á TVEIMUR
stöðum (`kym-`-röðin og `kyIcon`/`kyAbtn`-röðin) og aðeins annar er virkur.
Mælingin sem fann það var `document.querySelectorAll('._ky-note').length` = 43
á móti `.kym-note` = 0.

**Reglan:** finnist breyting ekki í viðmótinu skaltu telja SYSTKINI hennar áður
en þú leitar að hleðsluvillu — teldu reitinn sem þú festir þig við. Sé hann til
í fjölda en þinn ekki, ertu í röngum teiknara.

---

## 16. Dálkur sem heitir `status` er ekki endilega staða kerfisins sem hann speglar

**Mælt 11.10.2026, mál #1184 (Heimaleiga → Eldsalir).** Ég sá í `payday_invoices_slokk`:

```
nr. 374 · Heimaleiga ehf. ·  52.519 kr · status CANCELLED · ógreitt
nr. 390 · Heimaleiga ehf. · −52.519 kr · status CREDIT    · ógreitt
```

og dró þá ályktun að kreditnótan FLYTI: reikningurinn var afturkallaður ofan á
kreditfærsluna, svo kreditið hefði ekkert að ganga á móti og við „ættum" Heimaleigu
52.519 kr. Ég sannreyndi meira að segja töluna á lifandi Payday með
`GET /api/payday-pull-slokk?dry=1` — sem skilaði NÁKVÆMLEGA sömu röð. Tvær heimildir,
sami svarið, og hvorug þeirra svaraði spurningunni sem ég var að spyrja.

**Payday sjálft svaraði henni** þegar ég bað um afturköllun:

```
400 "Unable to update invoice. Invoice with status Cancelled
     cannot be updated to status CANCELLED ."
```

Nótan var ÞEGAR afturkölluð. `status = 'CREDIT'` í speglinum er **tegund skjalsins**
(kreditnóta), ekki líftímastaða þess — og af því að tegundin fyllir sama dálkinn og
staðan, þá skrifar hún stöðuna yfir. Kreditnóta sést því aldrei CANCELLED í speglinum,
hversu afturkölluð sem hún er.

**Reglan:** þegar spegildálkur getur borið tvo óskylda hluti (tegund OG stöðu) er hann
ekki mælitæki á hvorugt. Þá þarf að spyrja kerfið sjálft um þann hlut sem máli skiptir.
Hér var ódýrasta rétta mælingin að biðja um aðgerðina og lesa höfnunina: kerfi sem
segir „er þegar afturkallað" er áreiðanlegasta heimildin um að það sé afturkallað.

**Af hverju þetta er dýrt:** ályktunin „kreditið flýtur" leiðir til leiðréttingar á
bókhaldi viðskiptavinar sem er ekki brotið. Ég var skrefi frá því að „laga" færslu sem
var í lagi — og hefði þá skilið eftir mig skýringu á borðinu um vandamál sem var aldrei til.

## 17. Hleruð skrif leka við lokun — og grunur um leka er ekki sönnun

**Mælt 14.10.2026 á staðbundinni prófsíðu** (`tools/maelingar/leki-vid-lokun.cjs`). Mæliskriftin hlera öll skrif með
`context.route('**/*')` og falsa svarið. Það heldur á meðan síðan lifir. En `fetch(…, {keepalive:true})`
og `navigator.sendBeacon` sem fara af stað við `pagehide`/`visibilitychange` þegar síðunni er lokað
(`page.close`, `context.close`, `page.reload`, `page.goto`) **fara framhjá hleruninni og ná á þjóninn**.
Prófsíðan staðfesti það: beacon og keepalive-POST komu inn á staðbundinn þjón þótt route-ið
svaraði öllu öðru með fölsun. Appið vistar biðröð `AppSettings` einmitt þannig við lokun
(`saveVidLokun`), svo mæling sem breytir einhverju og lokar svo getur skrifað í lifandi gögn.

**Vörnin — mæld, ekki gisk** (`tools/maelingar/leki-vid-lokun.cjs`, þrjár lokunarleiðir × þrjár
varnir, tvær keyrslur — tölurnar flökta milli keyrslna, núllin ekki):

| vörn | page.close | context.close | reload |
|---|---|---|---|
| engin (bara route) | 1–2 láku | 3 láku | 2–3 láku |
| `context.setOffline(true)` á undan | 1 lak | 1 lak | **3 láku** |
| `addInitScript`: `sendBeacon` → no-op, `fetch` með `keepalive` → falsað svar | **0** | **0** | **0** |

`setOffline` virðist augljósa svarið og **ver ekki** — keepalive-beiðnir fóru samt út. Það eina sem
hélt var að gera leiðirnar sjálfar óvirkar í síðunni áður en hún hleðst:

```js
await context.addInitScript(() => {
  navigator.sendBeacon = () => true;
  const f = window.fetch;
  window.fetch = function (u, o) { return (o && o.keepalive) ? Promise.resolve(new Response('lokað')) : f.apply(this, arguments); };
});
```

**Og hin hliðin, sama dag:** þegar tveir gagnaverðir urðu rauðir (T=S á sex félögum, vara 140
á legsteinalista) var fyrsti grunur minn að mæliskriftirnar hefðu lekið. `audit_vernd` sagði
annað: tækjum var eytt í raunverulegum úttektum 12.–13.10. (reikningar R-001123/1125/1126/1151/1156
rukkuðu nákvæmlega það sem eftir stóð), og legsteinninn kom með eyðingu tvítaks kl. 15:02 13.10.
Hvort tveggja var raunveruleg vinna sem kóðinn höndlaði rangt, ekki leki. **Lestu `audit_vernd`
(og `solur` fyrir sama dag) áður en þú kennir prófunum um** — sá sem kennir lekanum um lagar ekkert.

## 18. Mynstur sem þýðist en passar aldrei — týnt bakskástrik

**Mælt 31.10. og 10.11.2026.** `payday-push.cjs` bar `/^Viðbótarúttekt við (R-d+)/` og 488 bar `/^R-0d{5}$/`.
`d` er þá bókstafurinn d. Mynstrið þýðist, kastar engu og skilar „fannst ekki" — nákvæmlega sama svar og
þegar ekkert er að finna. „Viðbót við R-… (ný tæki)" fór því aldrei á Payday-kröfuna frá 28.10., og vörðurinn
`audit-payday-lysing` var grænn allan tímann: hann grep-aði að línan sem BÝR TIL textann væri í skránni, en
keyrði aldrei mynstrið. Það slapp aðeins vegna þess að engin viðbótarsala hafði orðið til (0 raðir, enn 10.11.).

Leit að systkinum 10.11. (skill `variant-analysis`) fann þrjú til viðbótar — eitt þeirra fór í loftið þann sama dag:

| Staður | Mynstrið | Hvað það gerði í raun |
|---|---|---|
| 478 „Vista mynd" | `.replace(/s+/g, ' ')` | hvert „s" í skráarnafni varð að bili: „Dalshraun 10 Hús" → „Dal hraun 10 Hú " |
| 478 sama lína | `^s*Teiknings*[—–-]s*` | forskeytið „Teikning — " var aldrei tekið af (passar aðeins án bila) |
| 404 takkatexti | `[─-◿]` + `s*` | bil stóð eftir fremst |
| brunaholf `ajour-myndayfirlit.cjs` | `.replace(/s+/g, '_')` | „s" í möppuheiti varð að „_" |

**Hvaðan það kemur:** bakskástrikið týnist þegar kóðinn fer í gegnum STRENG á leiðinni í skrána — `sed`-útskipting
(GNU sed sleppir óþekktu `\x` í útskiptitexta), `node -e`/JS-strengur (`'\d' === 'd'`), `new RegExp('\d+')`.
Ég gekk í sömu gildru þrisvar við að SKRIFA vörðinn: `□` kom út sem stafurinn sjálfur, dæmi í
blokk-athugasemd með `s*` + skástriki lokaði athugasemdinni (SyntaxError), og `\[` opnaði gervi-stafaklasa sem
gleypti það sem átti að finnast.

**Vörnin:** `tools/audit-regex-bakstrik.cjs` (í audit-all, les líka Brunahólf) — rauður á `d+ d{N s+ s* w+` sem
stendur ekki á eftir bókstaf. Hann var prófaður RAUÐUR fyrst: á öllum fjórum stöðunum áður en þeir voru lagaðir,
og á upprunalegu Payday-mynstrunum tveimur í tómri möppu. Og reglan fyrir verði almennt: **vörður sem ver mynstur
keyrir það** — á dæmi sem á að passa, dæmi sem á ekki að passa, og dæmi sem prófar akkerið (`audit-payday-lysing`
gerir nú allt þrennt; án `^` fengi venjuleg krafa með R-númeri í nótu línuna „Viðbót við R-…").

## 19. Vörður sem getur ekki kviknað

**Mælt 31.10.2026 — þrír verðir voru grænir af því þeir GÁTU ekki orðið rauðir:**

- `audit-solu-id` sótti sölur síðustu 14 daga (`GLUGGI=14`) en hrópaði fyrst á gengið-inn sölu eldri en 30 daga
  (`GAMALT_DAGAR=30`). Greinin var dauð. Þrjár ósóttar sölur (32–46 daga, 13.764 kr) sáust hvergi.
- `audit-uttekt-afslattarhopur-gogn` las aðeins `discount_tier_id` (10 félög). 81 félag bar `afslattur_pct > 0`.
  Þrír nýir staðir voru rukkaðir á fullu verði meðan systurstaðir á sömu kennitölu fengu 15–25 % (43.107 kr).
- `audit-payday-lysing` — kafli 18.

Enginn þeirra laug um það sem hann mældi. Þeir mældu bara minna en nafnið lofaði, og grænt var lesið sem
„þetta svið er í lagi".

**Prófið er stökkbreyting, og það tekur mínútu:** taktu EITT þekkt tilvik af grunnlínunni (eða brjóttu mynstrið,
eða víkkaðu það) og keyrðu vörðinn. Verði hann ekki rauður er hann skraut. Netvörður gerði þetta á #939: R-000957
tekin af grunnlínu → RAUTT; R-001071 tekin af B2-grunnlínu → RAUTT; mynstrið víkkað í `/(R-\d+)/` → RAUTT.
**Vörður sem enginn hefur séð rauðan hefur ekki verið prófaður.**

## 20. Rautt úr uppsetningu mælandans — ekki úr kerfinu

**Mælt 31.10. og 10.11.2026.** Þrisvar sagði tækið eitthvað um MIG, ekki kerfið:

- `audit-agentar` sagði „4 dauðir vísar" í fersku eintaki í scratch-möppu. Systur-repóið hét þar `bh`, ekki
  `brunaholf`, svo vörðurinn fann það ekki. Með `ln -s bh brunaholf` við hliðina: grænt. Uppsetningin verður að
  vera eins og í CI (`../brunaholf`).
- `git log --grep '#925'` fann ekkert — klónið var grunnt (99 commit). „Ekki til" var „ekki sótt".
  `git fetch --depth=700` (eða `--shallow-since`) fyrst; `audit-utgafumerki` sleppir sér sjálfur af sömu ástæðu.
- Supabase `apply_migration` bað um staðfestingu sem birtist ekki á tækinu sem Agnar var á (31.10. og 10.11.) og
  rann út á 230 s. Svarið „timed out" segir ekki hvort eitthvað keyrði — ég las stöðuna á eftir (`relrowsecurity`,
  `pg_indexes`) í bæði skiptin: ekkert hafði keyrt. **Lestu stöðuna, ekki villuboðin** (sbr. kafla 11).

Og fjórða, af annarri gerð: úttekt sem liggur í tíu daga er ekki lengur lýsing á kerfinu. 10.11. voru 354 commit
komin á master Slökkvitækis og 131 á main Brunahólfs frá 31.10., RLS-lausar töflur 288 í stað 232, og Agnar hafði
tekið ákvörðun (mál #1536, 07.11.) sem breytti því hvað mátti keyra. **Endurmældu forsendurnar áður en þú keyrir
það sem var „tilbúið" — og leitaðu að ákvörðun á Þjónustuborðinu sem er yngri en tillagan þín.**

## 21. Tvær síður, ein tala — heildarsamanburður felur hvar munurinn býr

**Mælt 31.10.2026.** Viðskiptavinir í hubbnum sýndi 70,4 m.kr. „ógreitt"; Kröfu yfirlit 6,2 m.kr. Báðar síður
lásu sömu töflur. Munurinn var ekki gögn heldur SKILGREINING: tvö afrit af reglunum um ógreitt/ósent, og annað
hafði ekki fengið lagfæringuna frá 20.10. (Payday-drög töldust ógreidd, faldar kröfur taldar með, drög sem voru
þegar í Payday töldust ósend).

Heildartölurnar tvær sögðu aðeins „eitthvað er að". Það sem fann rótina var að bera saman **per greiðanda** og
rekja hvern mun til einnar reglu. Og það sem sannaði lagfæringuna var harness sem keyrði GÖMLU og NÝJU útgáfu
beggja falla á sömu raungögnum (gervi-`fetch`, aðeins GET): Kröfu yfirlit bæti fyrir bæti eins fyrir og eftir,
Viðskiptavinir 6.194.804 = 6.194.804 með 0 kr mun per nafn — og eini munurinn sem eftir stóð á ósendu (358.918 kr)
var EITT nafngreint tilvik (NESDEKK-drög án greiðanda), ekki „námundun". 10.11. stóð það enn: 13.150.501 = 13.150.501.

Reglurnar búa nú á einum stað (`brunaholf/netlify/functions/_krofu-flokkun.js`). **Þegar tvær síður eiga að sýna
sömu tölu: berðu saman per lykil, ekki per summu — og láttu þær deila kóðanum, ekki afriti af honum.**

## 22. Tala sem er nákvæmlega þakið — og `limit` sem lofar meiru en þjónninn skilar

**Mælt 10.11.2026.** Minnisstýribókin (`tools/minni.cjs`) sagði „1000 virkar staðreyndir". Þær voru 2.133. Kallið bar
`limit=1000`, PostgREST skilar mest 1000 röðum í kalli, og bókin sýndi því aðeins það nýjasta: 81 efni af 239 —
`oryggisnet`, `hradi`, `rukkun` og `rekstrarfelog` vantaði alveg, og `node tools/minni.cjs oryggisnet` svaraði
„Ekkert efni heitir". Tækið sem á að hindra að lotur endurtaki sig hafði gleymt meira en helmingnum og sagði ekkert.

Systkinin fundust með einni leit (`limit=` yfir 1000 í einu kalli: 33 staðir í tveimur repóum) og EINNI talningu
(raðir í hverri töflu með sömu síu). Fjórir staðir voru yfir þakinu:

| Hvar | Bað um | Fékk | Afleiðing |
|---|---|---|---|
| `tools/minni.cjs` | 1000 | 1000 af 2.133 | 158 efni ósýnileg í bókinni |
| hub `charlize-stada.js` | 10000 | 1000 af 2.168 | „Minnið" í Jarvis: 976 virkar í stað 2.133, kúnnaminni 83 í stað 793 |
| hub `reikningspunktar.js` (kt → nöfn) | 2000 | 1000 af 1.284 | 247 kennitölur fundust aldrei í „bíður"-króknum |
| hub `raddminni.js` (nafnaleit) | 2000 | 1000 af 1.284 | félag utan þeirra 1000 fannst ekki eftir nafni |

Þrennt hefði átt að kveikja grun:

1. **Talan var slétt og jöfn þakinu.** „1000 staðreyndir", „1000 félög" — raunveruleg talning lendir nær aldrei þar.
2. **`limit=10000` les eins og vörn** („nóg pláss") en er óskhyggja: þjónninn klippir í 1000 og svarar 200/206.
   Svarið ber `content-range: 0-999/2168` — heildin stendur þar, enginn las hana.
3. **Athugasemdin við kallið sagði „~1.400 raðir"** — við hliðina á kalli sem skilaði 1000.

Lagfæringin er fletting með FASTRI röð (`order=id`; án raðar getur röð fallið milli síðna) og, þar sem hægt er,
samanburður við talningu þjónsins: `minni.cjs` KASTAR nú ef sóttar raðir ≠ `content-range`-heildin, í stað þess að
skrifa hálfa bók. Sönnunin var þrenns konar: gamall og nýr kóði fallanna keyrður á lifandi gögnum (aðeins GET),
próf með gerviþjóni sem skilar aldrei fleiri en 1000 röðum (`brunaholf/test/charlize-stada-thak.test.js`), og
það próf SÉÐ rautt á gamla kóðanum (3 af 4) áður en það var tekið gilt. Hinir 29 staðirnir eru undir þakinu í dag
(mest 653 raðir). Kóðahlið appsins er varin af `audit-pagination.cjs` (aðeins `js/`), tölurnar af `audit-rodafjoldi.cjs`.

Tvennt til viðbótar úr sama degi. **Heiðarlegur haus er ekki lagfæring:** önnur lota sá sömu tölu klukkutíma fyrr og lét
hausinn segja „1000 nýjustu af N" — satt, en bókin var áfram án alls sem var eldra en 04.11., því 775 af þeim 1000
nýjustu voru kúnnaminni sem kom inn þann dag. Og **það sem ýtti þekkingunni út átti ekki heima í skránni:** kúnnaminnið
ber tengiliði og aðgengi, og skráin er committuð í opinbert repó. `--uppfaera` sleppir því nú og segir fjöldann í haus.

**Slétt tala sem er jöfn þaki er ekki talning. Berðu fjöldann sem þú fékkst við heildina sem þjónninn gefur upp.**

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
13. Gerði ég `sendBeacon` og `keepalive` óvirk (`addInitScript`) áður en síðunni var lokað eða hún endurhlaðin? (`setOffline` ver EKKI — kafli 17)
14. Hef ég SÉÐ vörðinn rauðan á villunni sem hann á að grípa — stökkbreytti ég? (kaflar 18–19)
15. Er uppsetningin mín eins og í CI — systur-repó við hliðina, ferskt tré, nógu djúp saga — og las ég stöðuna eftir villuboð? (kafli 20)
16. Er tillagan mín eldri en nýjasta ákvörðun Agnars um sama efni? (kafli 20)
17. Bar ég saman per lykil, eða bara tvær summur? (kafli 21)
18. Er talan mín slétt og jöfn þaki (1000)? Bar ég sóttar raðir við heildina í `content-range`? (kafli 22)
