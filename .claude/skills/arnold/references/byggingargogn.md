# Byggingargögn úr skjalasafni — skráningartafla og byggingarlýsing

Hvar finnst hvað brunavarnabúnaður á að vera, hve stórt húsið er og hvað var lofað við
byggingarleyfi? Í **aðaluppdráttum** eru, auk teikninga, tvö skjöl sem svara því beint.
Lærdómur 08.10.2026 (prófað á Fiskislóð 41, Skútuvogi 4, Laugavegi 18, Laugavegi 120,
Mánatúni 6, Þverholti 24, Hraunbæ 64).

## Hvar skjölin eru

- **Reykjavík:** skjalasafn.reykjavik.is → FotoWeb „5000-Aðaluppdrættir". Lýsigögn hvers skjals:
  BN-númer, **Landnúmer**, Heimilisfang, Staðgreinir, Gildisstaða, Tegund og **Lýsing**.
  - `Lýsing: Skráningartafla` → stærðir.
  - `Lýsing: Byggingarlýsing` (oft á blaði með brunavarnalýsingu) → brunavarnir og staðir.
  - Leit eftir landnúmeri: `skjalasafn.reykjavik.is/fotoweb/archives/5000-Aðaluppdrættir/?q=LANDNÚMER`.
  - ⚠ **Orðaleit á landnúmeri tekur með blöð annarra lóða** (Fiskislóð 41 fékk Tunguveg 19).
    Síaðu á landnúmersreit safnsins, ekki textaleit.
  - ⚠ Lýsigögn bera oft heimilisfang **lóðarinnar**, ekki hússins (Þverholt 20 merkt „Rauðarárstígur 35"). Lóðir með
    marga matshluta: veldu rétt blað eftir matshluta.
  - ⚠ 1 af 13 blöðum merktum „Skráningartafla" var útlitsteikning — lestu áður en þú treystir.
- **Hafnarfjörður o.fl.:** map.is (`teikn-listi?heimilisfang=…` í appinu). Berjavellir 6 hafa engar teikningar í
  kortasjá Hafnarfjarðar en finnast í lóðarsafni map.is (lagað 08.10, teikn-listi).
- **Í appinu:** „Sækja teikningu" (patch 374) merkir blöð margra hæða, snið og útlit; „Finna allt húsið" leggur til hæðir.

## Skráningartafla → stærðir

- **Gefur:** m² brúttó og birt flatarmál, rúmmál (m³), m² á hverja hæð, hæðir (kjallari/hæðir/ris),
  fjölda eigna/rýma, matshluta. **Ekki** stigaganga og sjaldnast byggingarár.
- **Lestur:** skannaður TIF (oft 7016×4961, 300 ppi) → OCR (RapidOCR staðbundið á skrifstofuvélinni; ekki í Netlify).
- **Áreiðanleiki (mælt 08.10):** 395/396 reitir réttir á tveimur handslegnum töflum; 58/58 lykiltölur á sjö blöðum
  1998–2023. Tala fær „háa vissu" þegar **summur töflunnar stemma** — 51/51 slíkar réttar. Eignafjöldi óvissari
  (engin summa prófar hann).
- Pípan: `teikning-greining\byggingargogn\scripts\` · frumgerð: grein `bygging-uppl` (Netlify-fall `bygging-uppl`,
  patch 448 „Bygging 🏛") — óbirt, bíður ákvörðunar Agnars um lotu og geymslustað.

## Byggingarlýsing → brunavarnir OG STAÐIR

Byggingarlýsingin (brunavarnalýsing / brunahönnun) segir **hvar í húsinu** búnaður á að vera. Hún er forsenda
byggingarleyfisins og gengur framar almennri reglu (723/2017, 3. gr.).

- **Lestur:** PDF með textalagi (ný hús, t.d. Fiskislóð 2023) lesast nákvæmlega; skannaðar (flestar eldri) með OCR,
  verr; sumar PDF 2020–22 í of lágri upplausn — reyndu TIF-frumrit (`.tif.info`).
- **Fundust á Fiskislóð 41:** 10–11 af 11 brunavarnaatriðum.

### Dæmi — Fiskislóð 41 (byggingarlýsing 28.11.2023, Brunahönnun slf)

| Atriði | Hvar / krafa |
|---|---|
| Brunaviðvörunarkerfi | Númerað kerfi í öllu húsinu skv. ÍST EN 54; stjórnstöð og yfirlitsmynd við aðalinngang, útstöð í stjórnherbergi vatnsúðakerfis; tengt vaktstöð |
| Vatnsúðakerfi | Allt húsið skv. NFPA 13; ESFR í dekkjalager; stjórnbúnaður í sér brunahólfi í tæknirými aðgengilegu utan frá |
| Brunahólfun | Dekkjaverkstæði + stoðrými (101–102) sér hólf; óskilgreindur iðnaður (104) sér hólf; skrifstofur 2. hæðar (201) eitt hólf; hæðaskil REI60 |
| Flóttaleiðir | Hvergi > 30 m í útgang; dekkjalager 3 (2 beint út), dekkjaverkstæði 2, óskilgr. starfsemi 2 óháðar, skrifstofur 3 (2 um stigahús, 1 út á svalir); neyðarhúnar ÍST EN 179 |
| Reyklosun | Reyklúgur í þaki (dekkjaverkstæði, óskilgr. bil, dekkjalager), opnaðar frá stjórnrými vatnsúðakerfis |
| Slökkvitæki | Skv. teikningum, t.d. 6 L léttvatn + 5 kg kolsýra við aðalrafmagnstöflu; sett upp af viðurkenndum aðila; merkt skiltum |
| Brunaslöngur | Í dekkjalager (ÍST EN 671) |
| Neyðarlýsing | 5 lux yfir slökkvitækjum, handboðum, í stigahúsum, tækni-/inntaksrými, stjórnrými vatnsúðakerfis · 0,5 lux í dekkjalager, dekkjaverkstæði, óskilgr. rými, opnum skrifstofum, salernum fatlaðra · leiðarljós við alla útganga |
| Þjónusta | „Þjónustusamningur verður gerður um eftirlit og viðhald á brunavarnakerfum hússins (vatnsúðakerfi, reyklúgur, brunaviðvörunarkerfi, handvirkum slökkvibúnaði og út- og neyðarlýsingu)" — **sölutækifæri** |

Textinn: `teikning-greining\byggingargogn\pdf\2023-11-2843346.txt`.

## Samanburður á 40 húsum (09.10.2026) — hvort skjalið á að treysta

Skýrsla: `teikning-greining\byggingargogn\samanburdur\skyrsla.html` (hús fyrir hús í `samanburdur.json`, pípan í `scripts\`).

| Atriði | Betri heimild | Mælt |
|---|---|---|
| m², m² á hæð, hæðir, kjallari, rúmmál | **Skráningartafla** | 34/40 fundust, 29/40 af réttu húsi; 67/70 tölur réttar, engin röng merkt „há" |
| Eignir | Skráningartafla | engin summa prófar — óvíst |
| Brunavarnir, notkunarflokkur | **Byggingarlýsing** | 33/40 fundust, brunavarnakafli í 24 (0 af 13 fjölbýlum); textalag 100 %, skannað 90 % |
| Hvar í húsinu (staðir) | **Lýsing með textalagi** | textalag 87 % fundust / 86 % rétt; skannað aðeins 16 % → tillaga, aldrei í reiti Agnars |
| Byggingarár | Kaupskrá HMS (32/40) | ekki nota í kerfinu fyrr en Agnar samþykkir skilmálana |
| Neyðarlýsing | Byggingarlýsing | krafin í 24 lýsingum, lux í 16, þjónustusamningur nefndur í 16 |

- **Rétt hús er stærsti vandinn.** Á lóð með mörgum húsum er nýjasta skjalið oft af öðru húsi (Skeifan 5: tafla af
  53 m² eldsneytisgeymum; Seljavegur 2: lýsing af fjölbýli á sömu lóð). Matshluti + húsnúmer af blaðinu leysir flest;
  segðu alltaf hvaða hús skjalið á við.
- Tafla og lýsing eru oft úr ólíkum umsóknum (sami dagur í 10/30) — nefndu dagsetningu hvors.
- OCR (RapidOCR) kann ekki íslenska stafi; hærri upplausn hjálpar lítið. Tesseract „isl" er næsta tilraun.
- Skannað blað: 1½–3 mín í lestri (allt að 8). Textalag < 1 s, en sum nýleg PDF hafa brenglað textalag.

## Aðrar heimildir

- **HMS fasteignaskrá** (hms.is) lokar á sjálfvirkar fyrirspurnir (429); api.hms.is í áskrift.
- **Kaupskrá fasteigna** (HMS opin gögn, CSV ~48 MB, dagleg): byggingarár, matshlutar, lágmarksfjöldi eigna —
  vantar hús sem ekki hafa selst (Fiskislóð 41). Skilmálar: Agnar á að líta yfir áður en notað í kerfinu.
- geo.fasteignaskra.is: landnúmer/lóð, engar stærðir.

## Þegar Agnar spyr „hvar á búnaðurinn að vera?"

1. Finndu byggingarlýsinguna (eða brunaskýrslublaðið á teikningunni). Ef hún nefnir staði — **hún ræður**.
2. Annars: reglurnar í `bunadur.md` (25 m gönguleið, kefli 30+9 m …) og `neydarlysing.md` (9.4.12).
3. Taktu fram hvaðan hvert atriði kemur (lýsing / teikning / regla) og vitnaðu orðrétt í lýsinguna.
