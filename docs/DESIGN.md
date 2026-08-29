# DESIGN.md — Slökkvitæki ehf

> **Þetta er MARKMIÐ, ekki lýsing á núverandi ástandi.**
> Grunnlínan — hvað appið gerir *í dag* — er mæld í [`LITASKRA.md`](LITASKRA.md).
> Þetta skjal segir hvert á að stefna. Hver kafli sýnir hvort tveggja svo
> bilið sé sýnilegt og enginn þurfi að giska.
>
> Sniðið er fengið úr [awesome-design-md](https://github.com/VoltAgent/awesome-design-md)
> (MIT). Fjögur viðmiðunarkerfi liggja í [`honnun/`](honnun/) til hliðsjónar:
> Stripe, Supabase, Notion og Intercom — valin af því að þau eru **ljós** og
> **gagnaþétt**, eins og þetta app. Þau eru viðmið um *uppbyggingu*, ekki
> auðkenni sem á að afrita.

---

## Yfirlit

Slökkvitæki er **innra rekstrarkerfi**, ekki kynningarsíða. Það er notað allan
vinnudaginn af einum til þremur manns: tækjaskrá, úttektir, sala, akstur, kort.
Það þýðir þrennt sem ræður öllum ákvörðunum hér:

1. **Þéttleiki er kostur, ekki galli.** Ársskoðunartaflan sýnir 678 fyrirtæki.
   Loftrými sem myndi prýða kynningarsíðu kostar hér skrun.
2. **Ekkert má vera óskýrt.** Reitur sem sést illa er ekki fagurfræðilegt
   vandamál heldur villuuppspretta — rangt kennitölusvið, rangur mánuður.
3. **Sama skjámyndin, alla daga.** Það sem er lært einu sinni verður að haldast.
   Þrír ólíkir bakgrunnar á sama fleti er ekki fjölbreytni heldur hávaði.

**Einkenni kerfisins:**

- **Hlýr off-white flötur** `{colors.canvas}` (#f5f4ef) með hvítum spjöldum ofan á.
  Ekki grár, ekki kaldhvítur. Mælt gildi — ekki ákvörðun sem þarf að taka upp á nýtt.
- **Einn rauður**, Brunastál `{colors.brand}` (#c92a2a). Notaður sparlega:
  aðalaðgerð, virkur flipi, viðvörun. Aldrei sem flötur undir löngum texta.
- **IBM Plex Sans** í öllu viðmótinu, einbreitt letur fyrir tölur og auðkenni.
- **1px hárlínur** bera stigveldið, ekki skuggar. Skuggar eru fyrir það sem
  raunverulega svífur (valmyndir, gluggar) — ekkert annað.
- **Þrír textalitir.** Ekki fimmtán.

---

## Litir

### Núverandi ástand (mælt 2026-08-28)

| Vandi | Umfang |
|---|---|
| Textalitir í notkun | **15** — `--ink1`, `--ink-on-card`, `--ink-on-steel` eru sami litur undir þremur nöfnum |
| Rauðir | **5** — `#c92a2a`, `#C93C1D`, `#DA2A1E`, `#f0584c` og `--accent` sem endurtekur þann fyrsta |
| Bakgrunnar sem stangast á | `--bg #9ba1ad` (grár, ónotaður), `--bg2/--surface #ffffff`, raunverulegur `body #f5f4ef` |
| CSS-breytur á `:root` | 85 |
| Stílblöð hlaðin samtímis | 135 (127 innfelld, 8 tengd) |

### Markmið

#### Flötur

- **Canvas** (`{colors.canvas}` #f5f4ef) — grunnflötur síðunnar. Hlýr off-white.
  Þetta er mælt gildi úr núverandi appi og heldur sér: það liggur í sömu
  fjölskyldu og Intercom (#f5f1ec) og PostHog (#eeefe9), svo það er ekki slys.
- **Surface** (`{colors.surface}` #ffffff) — spjöld, töflur, innsláttarreitir.
  Eina flatarstigið ofan á canvas. Enginn þriðji flötur án skriflegs rökstuðnings.
- **Surface-sunk** (`{colors.surface-sunk}` #eef1f6) — töfluhausar, óvirkir flipar,
  bakgrunnur undir hópum. Þetta er eini „niðurgrafni" flöturinn.
- **Hairline** (`{colors.hairline}` #e6e9ee) — 1px rammar og skilalínur. Þetta er
  burðarvirki stigveldisins.
- **Hairline-strong** (`{colors.hairline-strong}` #cbd2dc) — rammi á reit sem hefur
  fókus, og skil sem þurfa að sjást yfir langa töflu.

#### Texti

Þrír litir. Ekki fleiri. Birtuskil mæld á `{colors.surface}` (#ffffff).

- **Ink** (`{colors.ink}` #11141c) — allur aðaltexti: heiti, tölur, reitagildi,
  töflugögn. **16,8:1**.
- **Ink-sub** (`{colors.ink-sub}` #4b5563) — undirtexti: póstnúmer, tímastimplar,
  skýringar undir heiti. **7,6:1**.
- **Ink-muted** (`{colors.ink-muted}` #6b7280) — dauft: dálkahausar, óvirkt,
  „—" þar sem gildi vantar. **5,3:1**. Neðri mörkin; ekkert daufara er leyfilegt
  fyrir texta sem á að lesa.

`#94a3b8` er **bannaður sem textalitur**. Hann mældist á 24 af 26 fellilistum með
2,8:1 birtuskil — það er placeholder-grár notaður sem raunverulegt gildi, og hann
er ástæðan fyrir því að valið sem notandinn gerði sést verr en það á að gera.

#### Vörumerki og staða

- **Brand** (`{colors.brand}` #c92a2a) — Brunastál. Aðalaðgerð, virkur flipi,
  áhersla. **Einn rauður fyrir allt appið.** Hinir fjórir falla út.
- **Brand-hover** (`{colors.brand-hover}` #b02323) — dekkri, aðeins fyrir svifhreyfingu.
- **Success** (`{colors.success}` #1f9d57) — skoðun búin, greitt, í lagi.
- **Warning** (`{colors.warning}` #c98a1a) — í pípunum, á eftir, athuga.
- **Danger** (`{colors.danger}` #c0392b) — vantar, útrunnið, villa.
  Aðgreindur frá `{colors.brand}` og aldrei notaður sem skraut.
- **Info** (`{colors.info}` #2563eb) — aksturslisti, tenglar, hlutlaus merking.

Stöðulitir birtast **alltaf** sem litaður texti á daufum sama-lit fleti
(t.d. #1f9d57 á #e7f7ee), aldrei sem fullmettaður flötur undir hvítum texta.
Ársskoðunar-stöðukúlurnar gera þetta þegar rétt og eru fyrirmyndin.

---

## Letur

### Núverandi ástand (mælt)

**11 leturstærðir** í virkri notkun á Sölu, Viðskiptavinum og Verkborði:
10, 10.5, 11, 11.5, 12, 12.5, 13, 13.33, 14, 16, 17px.
**7 þyngdir**: 300, 400, 500, 600, 700, 800, 900.

Það er ekki stigveldi heldur handahóf. `13.3333px` er sjálfgefið vafrastig sem
enginn valdi.

### Markmið

**Fjölskylda:** `"IBM Plex Sans", -apple-system, "Segoe UI", system-ui, sans-serif`
— þetta er letrið sem appið notar nú þegar (mælt á 10.547 hlutum) og heldur sér.
**Einbreitt:** `ui-monospace, SFMono-Regular, Menlo, monospace` fyrir kennitölur,
raðnúmer, upphæðir og dagsetningar í töflum — allt sem á að standast á milli lína.

Sex stig. Ekkert utan þeirra.

| Tóki | Stærð | Þyngd | Notkun |
|---|---|---|---|
| `{type.title}` | 22px | 800 | Fyrirsögn sýnar. Ein á skjá. |
| `{type.section}` | 16px | 700 | Kaflaheiti, spjaldhaus |
| `{type.body}` | 14px | 400 | Aðaltexti, reitagildi, hnappar |
| `{type.body-strong}` | 14px | 600 | Áhersla í töflu, heiti fyrirtækis |
| `{type.small}` | 12px | 400 | Undirtexti, hjálpartexti |
| `{type.micro}` | 10.5px | 700 | Dálkahausar, merkimiðar. HÁSTAFIR, `letter-spacing:.05em` |

Þyngdir: **400 · 600 · 700**. 300, 500, 800 og 900 falla út.
`{type.title}` er eina undantekningin með 800 og aðeins af því að hún stendur ein.

**Símaham** notar sama stiga. Ársskoðunartaflan í síma keyrir á 12.5px nöfnum og
9.5px undirlínum — það er *undir* stiganum og er meðvituð undantekning skjalfest
í `js/patches/153-arsskodun.js`: 150px dálkur með tveggja línu klemmu. Slíkar
undantekningar verða að vera **skrifaðar í kóðann með rökum**, ekki laumaðar inn.

---

## Útlit og bil

### Núverandi ástand (mælt)

**9 ólík `gap`-gildi**: 3, 4, 5, 6, 7, 8, 10, 12px og `1px 8px`.
**8 ólíkar `padding`-samsetningar** í efstu sætunum einum.

### Markmið

Grunneining **4px**. Fimm þrep, ekkert á milli:

| Tóki | Gildi | Notkun |
|---|---|---|
| `{space.1}` | 4px | Innan merkimiða, milli táknmyndar og texta |
| `{space.2}` | 8px | Milli reita í röð, innri padding á smáhnöppum |
| `{space.3}` | 12px | Innri padding spjalda og innsláttarreita |
| `{space.4}` | 16px | Milli spjalda, milli kafla innan sýnar |
| `{space.6}` | 24px | Milli kafla, umgjörð sýnar |

Töflur eru undantekning og hafa sinn eigin takt: `10px 8px` í klefa á skjá,
`0 6px` í síma þar sem raðhæðin er fest.

**Raðhæðir** (síma-Ársskoðun, mælt og fest 2026-08-29): haus 38px, röð 52px.
Þær tölur eru bindandi — allar 678 raðirnar mælast nákvæmlega 52px og það er
það sem gerir langan lista læsilegan.

---

## Form

### Núverandi ástand (mælt)

**9 ólíkir radíusar** í virkri notkun: 6, 7, 8, 9, 10, 11, 12, 16px og 50%.
Munurinn á 6 og 7 px sést ekki — hann er hávaði, ekki hönnun.

### Markmið

Fjögur þrep:

| Tóki | Gildi | Notkun |
|---|---|---|
| `{radius.sm}` | 6px | Merkimiðar, litlir hnappar, stöðuflísar |
| `{radius.md}` | 10px | Innsláttarreitir, hnappar, flipar |
| `{radius.lg}` | 16px | Spjöld, töflurammar, gluggar |
| `{radius.full}` | 999px | Kúlur, tölumerki, stöðupunktar |

**Rammar eru alltaf 1px.** Þetta er eina víddin sem er þegar öguð — 287 af 288
mældum römmum eru 1px. Það helst.

---

## Hæð og dýpt

Stigveldið er borið af **hárlínum**, ekki skuggum. Það er meðvitað: í þéttum
gagnaskjá verða skuggar að móðu þegar tuttugu spjöld liggja saman.

Tveir skuggar. Ekki fleiri.

- **`{shadow.card}`** — `0 1px 2px rgba(20,30,25,.05)`
  Spjöld og töflur. Nánast ósýnilegur; hann aðskilur án þess að lyfta.
- **`{shadow.float}`** — `0 10px 28px -16px rgba(25,35,60,.18)`
  Aðeins það sem raunverulega svífur: fellilistar, valmyndir, gluggar,
  Stílstjóra-spjaldið.

**Bannað:** innfelldir hágljáa-skuggar (`inset 0 1px 0 rgba(255,255,255,.85)`)
sem málmáhrif á venjuleg spjöld. Þeir mældust á 13 hlutum og eru leifar af
þemutilraunum.

---

## Íhlutir

### Innsláttarreitir og fellilistar

Þetta er stærsti einstaki gallinn í núverandi ástandi og því fyrsta reglan hér.

**100 innsláttarreitir mældust með GEGNSÆJAN bakgrunn.** Reiturinn erfir þá hvaða
flöt sem liggur undir — á hvítu spjaldi sést hann ekki sem reitur, og lendi hann
á lituðum fleti verður textinn misskýr eftir staðsetningu.

Reglur, án undantekninga:

- Bakgrunnur **alltaf** `{colors.surface}` (#ffffff). **Aldrei gegnsær.**
- Texti **alltaf** `{colors.ink}`. Placeholder má vera `{colors.ink-muted}` —
  aldrei valið gildi.
- Rammi 1px `{colors.hairline}`; í fókus `{colors.hairline-strong}` +
  fókushringur í `{colors.brand}` við 2px.
- Radíus `{radius.md}`, padding `{space.3}`, letur `{type.body}`.
- Merkimiði **fyrir ofan** reitinn, villutexti **fyrir neðan**.
- Í síma: lágmark 16px leturstærð svo iOS þysji ekki sjálfkrafa við snertingu.

### Töflur

- Haus: `{colors.surface-sunk}` flötur, `{type.micro}` hástafir,
  `{colors.ink-muted}` texti. **Aldrei ljós texti á gegnsæju** — sex hausar
  mældust þannig (#f0f2f5 á gegnsæju) og sjást aðeins fyrir tilviljun.
- Klefar: `{colors.ink}` á `{colors.surface}`, 1px `{colors.hairline}` skil.
- Tölur, kennitölur og dagsetningar í einbreiðu letri með `tabular-nums`.
- Frosinn fyrsti dálkur þegar taflan skrunast lárétt (sjá síma-Ársskoðun).
- Röð sem má smella á fær `cursor:pointer` og `{colors.surface-sunk}` við snertingu.

### Hnappar

| Gerð | Flötur | Texti | Notkun |
|---|---|---|---|
| Aðal | `{colors.brand}` | #ffffff | Ein á skjá. Sú aðgerð sem skjárinn snýst um. |
| Auka | `{colors.surface}` | `{colors.ink}` | 1px `{colors.hairline}` rammi |
| Hljóðlaus | gegnsær | `{colors.ink-sub}` | Í töflum og verkfærastikum |
| Hætta | `{colors.danger}` | #ffffff | Eyðing og óafturkræft. Aldrei sjálfgefinn fókus. |

Lágmarkshæð 36px á skjá, **44px í síma** (snertimark).
Merking hnapps verður að rúmast á einni línu.

### Stöðumerki

Litaður texti á daufum sama-lit fleti, `{radius.full}`, `{type.micro}`.
Aldrei fullmettaður flötur undir hvítum texta — það er hávaði í töflu með
sex hundruð röðum.

---

## Á að gera og ekki gera

**Gera**

- Nota `{colors.hairline}` til að skilja að. Það er ódýrasta og skýrasta tólið.
- Halda töflum þéttum. Þetta er vinnutæki, ekki sýning.
- Skrifa rök í kóðann þegar vikið er frá stiganum — með dagsetningu og mælingu.
- Nota einbreitt letur á allt sem á að standast á milli lína.
- Mæla áður en fullyrt er að eitthvað sé lagað.

**Ekki gera**

- **Ekki búa til nýja CSS-breytu fyrir lit sem er þegar til.** Þrjú nöfn á
  #11141c er hvernig fimmtán textalitir urðu til.
- **Ekki nota `!important` til að vinna sérvirknistríð.** Í þessu appi dugar það
  ekki hvort eð er — innfelldur `!important` slær stílblað, og `pinPad()` stimplar
  `.view` padding beint í hlutinn. Notaðu `window.__peBannerPad` og
  tvöfaldað auðkenni (`#view-x#view-x`) eins og gert er í 314/319/323.
- **Ekki bæta við þriðja flatarstigi.** Canvas → surface → sunk. Það er allt.
- **Ekki lita texta daufari en `{colors.ink-muted}`.**
- **Ekki skila gegnsæjum innsláttarreit.** Þetta er algengasta villan í kerfinu.
- **Ekki setja skugga á það sem svífur ekki.**
- **Ekki endurvekja dökka þemað.** `66-dark-mode.js` var fjarlægt 2026-08-28 og
  dauðar `data-theme="dark"` reglur sitja enn í 231 og 287. Þær eiga að fara,
  ekki fjölga.

---

## Hegðun eftir skjástærð

Þrír hamir, ekki fleiri:

- **Skjáborð** (`data-viewmode="desktop"`, ≥1024px) — full tafla, hliðarnav.
- **Sími** (`data-viewmode="mobile"`, ≤768px) — frosinn fyrsti dálkur + lárétt
  skrun þar sem tafla þarf fleiri en fjóra dálka. Botnflakk.
- **Appham** (`body.appmode`) — sími innan í appskel. **Erfir símaútlitið;
  hann er ekki þriðja hönnunin.**

Appham er sérstök gildra: patch 315 negldi eitt sinn eigin töflugrind fyrir hann
og hún varð úrelt um leið og símaútlitið breyttist. **Appham stillir umgjörð
(fullbreidd, snertimörk) — aldrei grind eða leturstiga.**

---

## Að breyta síma- og appútliti án þess að berjast við CSS

Þetta er hagnýti kaflinn — ástæðan fyrir því að stílbreyting sem *ætti* að taka
tvær mínútur tekur klukkutíma. Allt hér er lært af mælingum, ekki lesið úr kóða.

### Af hverju `!important` dugar ekki

Þrjú lög slá stílblaðið þitt, í þessari röð:

1. **Innfelldur `!important` slær stílblaðs-`!important`.** Sannað með mælingu.
   Ef JS stimplar `style="padding-top:86px !important"` vinnur ekkert stílblað.
2. **Sértækari veljari vinnur við sama vægi.** `html[data-viewmode="mobile"]
   #bstal-banner` slær `#bstal-banner` þótt bæði séu með `!important`.
3. **Seinna hlaðið stílblað vinnur við jafntefli.** Með 135 stílblöð samtímis
   ræðst útkoman af `<script>`-röðinni í `index.html`.

### Hvað virkar í staðinn

| Vandi | Lausn | Dæmi |
|---|---|---|
| Stílblað tapar fyrir sértækari reglu | **Tvöfaldaðu auðkennið** | `#view-arsskodun#view-arsskodun` |
| Þarf sértækni án auðkennis | **Falsauðkennis-fylling** | `:not(#_p1):not(#_p2):not(#_p3)` |
| JS stimplar innfellt gildi | **Breyttu upprunanum, ekki CSS** | `window.__peBannerPad` í stað þess að reyna að slá `pinPad()` |
| Veit ekki hver á regluna | **Mældu, ekki lestu** | `getComputedStyle` + `getMatchedCSSRules`-leit í vafra |

Falsauðkennis-bragðið (`:not(#_pN)`) er **húsvenja** sem er þegar í `css/mobile.css`
og pöppum 314/319/323 — það bætir auðkennis-vægi án þess að krefjast raunverulegs
auðkennis. Notaðu það frekar en að finna upp nýtt.

### Verkaskipting milli laga — reglan sem 315 braut

Þetta er mikilvægasta reglan í kaflanum, því brotið á henni kostaði heilan
villuleitarhring í dag:

- **Pappinn sem á sýnina** (t.d. 153 fyrir Ársskoðun) á **grindina, leturstigann
  og raðhæðirnar**.
- **Þjöppunarlögin** (314 sími, 315 appham) eiga **umgjörðina**: fullbreidd,
  snertimörk, ytri padding.

Patch 315 negldi eitt sinn `grid-template-columns` fyrir Ársskoðunarraðir í
appham. Þegar 153 fór úr 5 reitum í 9 tróð 315 níu reitum í fimm rákir — og það
sást ekki í síma, aðeins í appham. **Þjöppunarlag má aldrei negla grind.**

### Gátlisti fyrir hverja síma-/appbreytingu

Þetta er röðin sem fann þrjár villur í Ársskoðun áður en þær fóru í loftið:

1. **Mældu fyrir.** Breidd, hæð, fjöldi dálka — í raunverulegri skjástærð
   (430×860), ekki þrengdum skjáborðsglugga.
2. **Teldu reiti á móti rákum.** `row.children.length` verður að vera jafnt fjölda
   í `grid-template-columns`. Röð með 8 reiti í 9 rákum lítur *næstum* rétt út.
3. **Mældu ALLAR raðirnar, ekki eina.** `{52: 678}` er svar. „Ég skoðaði fyrstu
   röðina" er það ekki.
4. **Berðu saman miðjur haus↔gagna**, ekki vinstri brúnir — miðjaðir hnappar
   (`margin:0 auto`) gefa falskt jákvætt á brúnum.
5. **Prófaðu appham sérstaklega.** `document.body.classList.add('appmode')`.
   Hann erfir símaútlitið en sérlög geta yfirskrifað það.
6. **Staðfestu að síðan sjálf skrunist ekki lárétt:**
   `document.documentElement.scrollWidth === window.innerWidth`.
7. **`node tools/audit-all.cjs`** — 15/15 grænar áður en ýtt er.

### Stílstjórinn er fljótlegri leiðin

Fyrir hreinar útlitsstillingar — bil, leturstærð, dálkaröð, faldir dálkar,
þysjun — er **Stílstjórinn** (pappi 262 + kortin í 323/324) fljótari en
kóðabreyting og hann geymir stillinguna per síðu. Skrifaðu CSS aðeins þegar
Stílstjórinn ræður ekki við það.

---

## Leiðin þangað

Þetta er ekki eitt verk. Röðin skiptir máli því hvert skref gerir næsta mælanlegt.

1. **Slökkva á því sem er dautt.** Dauðar `data-theme="dark"` reglur í 231/287,
   `cfg_theme`-leifar. Engin sjónræn breyting ætti að mælast — ef hún mælist var
   reglan ekki dauð.
2. **Sameina litina.** 15 textalitir → 3, 5 rauðir → 1, þrír bakgrunnar → tveir.
   Gert sem endurnefning á breytum, ekki sem endurskrifun á reglum.
3. **Laga innsláttarreitina.** 100 gegnsæir reitir fá `{colors.surface}`.
   Þetta er breytingin sem notandinn finnur mest fyrir.
4. **Laga fellilistana.** `#94a3b8` → `{colors.ink}` á 24 listum.
5. **Þjappa stigunum.** 11 leturstærðir → 6, 9 radíusar → 4, 9 bil → 5.
6. **Fækka stílblöðunum.** 135 samtímis er rótin. Þetta er lengsta skrefið og
   á að koma síðast, þegar tókarnir eru orðnir stöðugir.

Eftir hvert skref: `node tools/audit-all.cjs` og mæling á sömu sýnum og
`LITASKRA.md` notaði, svo bilið minnki sannanlega en ekki bara í orði.

---

## Það sem vantar

Heiðarleg upptalning á því sem þetta skjal svarar **ekki** enn:

- **Símaham og appham eru ómæld.** `LITASKRA.md` mældi aðeins skjáborð. Litirnir
  hér eru því markmið fyrir símann, ekki staðfest grunnlína.
- **Hreyfing er óskilgreind.** Engar reglur um lengd, ferla eða
  `prefers-reduced-motion`. Appið hreyfist lítið sem stendur og það er í lagi —
  en um leið og eitthvað fer að hreyfast þarf þetta að vera skrifað.
- **Táknmyndir eru blandaðar.** Emoji og SVG saman. Óákveðið hvort á að velja.
- **Kort og Leaflet-lög** falla utan þessa skjals.
- **Prentun** (miðar, skýrslur, PDF) hefur sinn eigin litaveruleika og er ekki
  þakin hér.
- **Brunahólf-hub-inn** er systurkerfi með eigin útliti. Hvort þau eigi að
  renna saman er óákveðið og er spurning fyrir Agnar.

---

*Mælt og skrifað 2026-08-29. Grunnlína: [`LITASKRA.md`](LITASKRA.md) (2026-08-28).*
*Viðmið í [`honnun/`](honnun/) — Stripe, Supabase, Notion, Intercom, úr*
*[awesome-design-md](https://github.com/VoltAgent/awesome-design-md), MIT.*
