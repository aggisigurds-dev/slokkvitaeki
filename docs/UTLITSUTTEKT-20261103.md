# Útlitsúttekt 03.11.2026 — Slökkvitæki-appið (tölva · sími · app-snið) og Brunahólf

Aðeins lestur. Mælt af undiragentum í innbyggða vafranum (hermdur sími 375×812, tölva 1280×900), DOM-mælingar, ekki raunsími (S26 ÓMÆLT).
Merking: **[staðfest]** = ég endurmældi/las kóðann sjálfur; **[agent]** = mælt af agent, ósannreynt af mér.
Heildartöflur: scratchpad `utlit-slokk-vidm.md`, `utlit-slokk-app.md`, `utlit-bh1.md`, `utlit-bh2.md`.

## Brunahólf (brunaholf.netlify.app) — LAGAÐ og birt (commit 5b9a307)
36 síður. Símaútlit á 9 síðum (vidskiptavinir, thjonusta-gloppur, multitool, slokkvitaeki-reikningur, skraalisti, eydublod,
afkastavakt, keepit, dkplus-products) mælt á lifandi vef eftir birtingu: scrollWidth 375 á öllum [staðfest].
`/api/doc-matrix` var 500 (customers_base hefur engan er_i_thjonustu-dálk) — nú 200, 819 raðir [staðfest]; keepit-companies sama villa — nú 459 í þjónustu af 1.005 [staðfest].
vidskiptavinir.html: `surKt=kt` → `curKt=kt` (Vista gerði ekkert síðan 06.08) [staðfest í kóða; vistun óprófuð].
Eftir: smáletur (<11 px) á jarvis/kerfiskort/verkkaupar/nlsh; smátakkar <32 px á email-helper/eydublod/jarvis; `skoda` krefst token (innihald ÓMÆLT);
keepit hefur 61 hnút utan 375 px án láréttrar skrunar (ógreint).
App-snið: aðeins brunathettingar, index, jarvis, keepit hafa manifest (standalone); hinar 32 ekkert.

## Slökkvitæki-appið — EKKI lagað (bíður yfirferðar með lifandi villuleit)
51 flipar opnaðir með .click() á nav-takka í báðum sniðum: 40 OK í báðum, enginn með JS-villu, 4xx/5xx eða lárétt yfirflæði (scrollWidth = innerWidth). Mesta layout shift 0,036 (Tengiliðir, sími).

### Sími — zoom (333-app-page-zoom.js, síðustærð per síðu; sameiginleg öllum símum)
- Kröfu yfirlit z=0,35: allir 1098 textahnútar <11 px (lægst 3,2 px); ◀ ▶ 15×15 px. [agent]
- Brunakerfi yfirlit z=0,3; Þjónustuborð z=0,7 (196/200 hnútar <11 px); ÞjónustuVerkstæði z=0,7; Sala z=0,8; Vörur z=0,8; Brunakerfis/Slökkvikerfis skoðun z=0,6. [agent]
- **Zoom 0,3 festist**: eftir opnun #brunayfirlit helst hash óbreyttur og zoom 0,3 situr á öllum flipum á eftir þar til endurhlaðið (endurtekið tvisvar). [agent]
  Orsök sem agent benti á: `272-brunakerfi-yfirlit.js:454` setur hash með replaceState; `333-app-page-zoom.js:151` notar hash sem zoom-lykil.
  ATH: `siduLykill()` í 333 hefur vörn (virk sýn ræður ef hash vísar á aðra sýn) — rótin er því ekki staðfest; þarf lifandi villuleit.
- Hvort Agnar valdi zoom-gildin sjálfur (klípa) er ÓMÆLT — ekki breyta gildunum án hans.

### Sími — fljótandi hnappar
`#_ad-fab` 💬 (52×52), `#qr-fab` (52×52) og EN (59×44) hylja efni neðst; í hliðarskúffu hylur EN 58×19 px af leitartakka. 💬 er undir `#_app-nav` í öppum með botnstiku (z-index 2147481000 á móti …001) svo hann er ósnertanlegur. [agent]

### Slóðir / nav
- Slóð uppfærist ekki við opnun Öpp, Rekstrarfélög, Viðskiptavinir, Mínar síður, Tilboð, Samningar, Bókhalds yfirlit, Kerfi — endurhleðsla/bakk fer á ranga síðu. [agent]
- Lánstæki-takkinn opnar Þjónustuborð (#bord); view-lanstaeki birtist aldrei. [agent]
- Bókhalds yfirlit frá #maelabord (tölva): birtist ~1,5 s og hverfur aftur í Mælaborð innan 3 s; Tilboð ekki þaðan; frá #sala virka þau. [agent]

### App-snið (?app=<lykill>), 16 öpp
- **verkefni / xthebox / xdriver, sími (#bord):** Dagskrá, Checklisti, Skipulagsborð 1511 px breið (viku-grid min 825) í 488–533 px hólfi, view-bord hefur overflow-x:hidden → 99 textahnútar og 98 takkar (t.d. „+ Skrá verk") utan skjás. [agent]
- **verkefni / xthebox / xdriver, tölva:** seg-stikan overflow-x:hidden, sw 1614 á móti cw 1230 → flipar („Test", „Afgreiðsla / Útköl", „Reikningsbeiðnir") utan skjás og ekki hægt að skruna. [agent]
- **bilstjori (sími og tölva):** 84 px tóm ræma neðst; `219-bilstjori.js` ~719–722 `bottom:var(--bs-navh,84px)`; --bs-navh fjarlægð (línu 823) þegar engin #_app-nav er til. [agent; kóðinn lesinn: fallback 84 px er í CSS-inu — staðfest]
- Smáletur sími: fjarmal miðgildi 4,5 dp; xarsskodunskjar 4,2; brunakerfi 6,6. [agent]
- xarsskodunskjar sími: síðasta töfluröð 14 px undir botnstiku við hámarksskrun. [agent]
- verkstjorar, skyrslustod, threedwork vantar í TITLES/APPLE í index.html (almennur titill/iOS-tákn). [agent]
- data-viewmode „desktop" í 3 af 16 hleðslum á 1280 (xbrunaholfogslokkvi, xfirestarters, xpostur) — orsök ÓMÆLT. [agent]
- Tvöfalt skrun (skjal + view) í #bord, brunakerfi, xbrunaholfogslokkvi. [agent]

### ÓMÆLT
Raunsími S26 og klípa; innihald í iframe (cross-origin); uppsetning/service worker; Bílstjóri eftir val á starfsmanni; landscape; „Opna/Setja upp/Afrita hlekk" í launcher; TurboPaint, skýrslur, prófílar og Þjónustuborðsmál (opnun skrifar á lifandi gögn); Supabase 4xx við fyrstu hleðslu; 14 af 58 síðum launcher-fylkisins eru í engu appi.

## Reglur sem gilda um viðgerðina
CLAUDE.md „STÖÐUGT VIÐMÓT" (7 reglur, mæla layout shift) og „BRUNASTÁL C"; engin stilling bara á einu tæki (zoom er þegar á þjóni); aldrei `display` á nav-hnappa;
`node tools/audit-all.cjs` fyrir hverja ýtingu (2 rauðir 03.11: payday-samræming R-001251–53 = reikningar frá í dag; skjal-endurkoma 18 > 16 = mál #1370).

## Lagfæringar 03.11 (Slökkvitæki-appið; hver liður endurmældur á lifandi vef áður en breytt var, prófað á staðbundnum þjóni með breytingunni)
Prófað í innbyggða vafranum: sími 375×812 (síðan 981 px breið í appi — HUB_VP), tölva 1280×900. Ekkert commit/deploy af þessari lotu (auto-sync tók wip-commit). Raunsími S26 ÓMÆLT.

1. **Zoom 0,3 festist — endurgert já; lagað.** Rót (mæld): `272` setur `#brunayfirlit` með replaceState en sýnin heitir `view-brunakerfi-yfirlit`; vörn í `333 siduLykill()` leit aðeins á `view-<hash>` (null) → hash-lykillinn `brunayfirlit` (vistað 0,3) gilti á öllum flipum á eftir. Lagað: `333-app-page-zoom.js` (nýtt `NAVSYN` + `hashSyn()`, 8 línur í siduLykill) leysir hash í sýn (NAVSYN / `UrlRouting.resolveView`) og virka sýnin ræður ef hashinn vísar á aðra sýn. Zoom-gildin óbreytt. Fyrir: yfirlit→sala→opp→rekstrarfelog→vorur = 0,3 / 0,3 / 0,3 / 0,3 / 0,3. Eftir: 0,3 / 0,8 / 1 / 1 / 0,8. ATH (ólagað, ÓMÆLT hvað Agnar vill): með snertingu skrifar 348 hash `#brunakerfi-yfirlit` og þá gildir lykill sem hefur ENGA vistaða stærð (zoom 1), ekki vistaða 0,3 undir `brunayfirlit`.
2. **Bílstjóri 84 px ræma — endurgert já; lagað.** Rót (mæld): `?app=bilstjori` er standalone (261): engin `#_app-hdr`, engin `#_app-nav`, en 316 setur `body.appmode`; `219` reglurnar (linur ~718–722) gerðu ráð fyrir 50 px haus og 84 px botnstiku. Líka 50 px ræma EFST (ekki í úttektinni). Lagað: `219-bilstjori.js` — fimm reglur fá `:not([data-app="bilstjori"])`. Fyrir (375×812): view top 50, bottom 728; (1280×900): 50–816. Eftir: 0–812 og 0–900; scrollWidth = clientWidth.
3. **#bord í appi — endurgert já; lagað.** Rót (mæld): `.modgrid` í `368` er 60 dálkar × 14 px bil = 826 px lágmark → t5 848 px í 400–532 px hólfi; `263 mobile-baseline` gefur `.view` overflow-x:hidden → klippt. Lagað: `368-thjonustubord5.js` (+7 línur): `@container t5 (max-width:760px){.modgrid{column-gap:0}}` og `:host-context(body.appmode) .seg.modeseg{overflow-x:auto…}`. Fyrir (sími, app): t5 sw 848/cw 532; 165 af 342 hnöppum/reitum utan hólfs án skruns. Eftir: 532/532; 10 utan hólfs, allir í láréttu skruni Hamur-stikunnar. Tölva í appi: stika sw 1614/cw 1230 skrunast nú (scrollLeft 0→384). Tölva utan apps ÓBREYTT (mælt: stika 1611/1010 overflow hidden, column-gap 14 px). ATH: sama klipping á Hamur-stikunni er á tölvu UTAN apps (1614/1010, flipar utan sjónar) — ekki snert samkvæmt fyrirmælum.
4. **Slóð/nav.** (a) Slóð uppfærist ekki við Öpp, Rekstrarfélög, Viðskiptavini, Mínar síður, Tilboð, Samninga, Bókhalds yfirlit, Kerfi: **ekki endurgert** — 348/218 skrifa slóð aðeins eftir fyrstu snertingu (pointerdown); með snertingu uppfærðist slóðin í öllum 11 flipum sem prófaðir voru (úttektin notaði .click() án snertingar). (b) Lánstæki → Þjónustuborð: **viljandi** — Lánstæki í djúpdvala (`465`, 13.10), takkinn er `display:none` og óaðgengilegur. (c) Bókhalds yfirlit frá #maelabord: endurgert já (án snertingar 3/3; með snertingu 1 af 4 — kapphlaup); rót (mæld): `346 vakta()` „bein slóð"-reglan kippir til baka ef slóðin er enn `#maelabord` 300 ms eftir ferð. Lagað: `346-maelabord.js` (+9 línur, `_burt`: Mælaborð var virkt og önnur sýn tók við = ferð burt; hreinsast við hashchange/Mælaborð virkt). Fyrir: bókhalds/tilbod hurfu aftur í Mælaborð eftir ~0,9–1,5 s; eftir: haldast (6 s mælt, án snertingar).
5. **💬 undir stikunni — endurgert já; lagað.** Rót (mæld): `401` hættir við ef `innerWidth > 900`, en app á síma er 981 px breitt (HUB_VP) → 💬 sat á bottom:78px bak við `#_app-nav`. Fyrir (375×812 app): 💬 t=1993–2045, stika t=1863–2123, elementFromPoint í öllum 5 punktum = `._app-tab` (alveg hulinn). Tölva-app: neðstu 20 af 52 px huldir. Lagað: `401-fljotandi-rod.js` (appmode telst með; auk þess toast z-index í appmode). Eftir: 💬 t=1733–1785 (sími), t=672–724 (tölva-app), snertanlegur. Tölva utan apps óbreytt (skilyrðið óbreytt þar).
6. **Titill/iOS-tákn.** `index.html` (+8 línur): `apple-mobile-web-app-title` fær heitið fyrir verkstjorar/skyrslustod/threedwork (mælt á skyrslustod: „Slökkvitæki" → „Skýrslu-stöð"). `document.title` er yfirskrifaður af öðrum patch í ÖLLUM öppum (mælt „Brunahólf Slökkvitæki ehf."), svo þar breytist ekkert. iOS-tákn EKKI lagað: engin `img/app-<lykill>-apple.png` er til fyrir þessi þrjú (myndir þarf frá Agnari).

Ekki mælt / athugasemdir: CLS á staðbundnum þjóni (`?app=bilstjori` 0,247, ein færsla í `_bs-list` við gagnahleðslu; live 0 — /api vantar staðbundið, ósamanburðarhæft, rakið ekki til CSS-breytinganna); #bord CLS live 0,103 (1 færsla), staðbundið 0 — orsök ÓMÆLT. Ekki endurmælt: smáletur, hvort Agnar vill að yfirlit opnist á 0,3 eða 1 (sjá lið 1), landscape, raunsími.
