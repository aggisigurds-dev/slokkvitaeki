# Teikning-glugginn og TurboPaint — staða og það sem lagað var í nóvember 2026

Agnar 10.11.2026: „reyna koma teikningum, forritinu og TurboPaint í betra stand, fara yfir allt, gera kerfið fullkomnara og
áreiðanlegra“. Þessi skrá segir hvað virkar, hvernig það var mælt, og hvað er enn opið. Hún er heimildin áður en
eitthvað af þessu er „lagað aftur“ — margt hér var sagt bilað lengi án þess að rótin væri mæld.

## Lagað og mælt (kjarni PR = TurboPaint á slokkvitaeki.vercel.app · patch = Teikning-glugginn í Slökkvitæki-appinu)

| Dags | Hvað | Hvar | Hvernig mælt |
|---|---|---|---|
| 06.11 | **Halli blaðsins** — vélin mælir hallann á myndinni sjálfri (ekki á veggjum borðsins); Agnar getur sett hann sjálfur og vélin skrifar aldrei yfir það; vistast á hæðina (`skekkja`, `skekkjaHandvirk`) | PR #290 · `thunnir-veggir.ts`, `skonnun-veggir-mynd.ts`, `VeggjaRitill.tsx` (SkekkjaStilling) | `thunnir-veggir.test.ts`, `uttekt-stillingar.test.ts`; opnun aftur sýnir sama halla |
| 06.11 | **Húsið** — Agnar teiknar útlínu hússins sjálfur (Veggir → Húsið → Teikna húsið); greiningin og 3D nota hana í stað kassa vélarinnar; vistast í dílum frummyndar (`husUtlina`) | PR #291 · `HusUtlina.tsx`, `veggja-hreinsun.ts`, `sjalfvirkt.ts`, `uttekt.ts` | `veggja-hreinsun.test.ts` (5), `uttekt.test.ts`; skrifvarin Playwright-prófun (hus-lifandi) |
| 07.11 | **Engin sjálfvirk læsing** — veggjaritillinn læsti laginu „Teikning“ þegar hann opnaðist („þoli ekki þessar læsingar“); nú valfrjálst („Læsa teikningu“) | PR #292 · `veggja-ritill-stada.ts` | `veggja-ritill.test.ts` 15/15; framleiðsla 10.11: lagið „teikning:opið“ með ritilinn opinn |
| 09.11 | **Eigin geymsla á leyfilista** — TurboPaint gat ekki opnað hæð með mynd úr Supabase-fötunni `turbopaint` (sameinuð blöð, upphlaðnar teikningar) | PR #294 · `api/turbopaint/fetch-plan/route.ts` | framleiðsla: `fetch-plan?url=<geymsla>` 403 → 200; hæð opnast |
| 09.11 | **Sameinuð blöð** (Krókháls 9) — sjá `sameina-blod.md` | gögn + `scripts/sameina-blod/` | Teikning + TurboPaint opna hæðirnar; 126 veggjalínur + 8 merki á réttum stað |
| 10.11 | **Opnun býr ekki til borð** — hæð úr Slökkvitæki-appinu opnast í skoðun; borðið verður til við fyrstu breytingu eða „Vista í úttekt“ (áður: nýtt borð + mynd í geymslu við HVERJA opnun) | PR #296 · `skodun.ts` (`uttekt`), `WhiteboardApp.tsx`, `TopBar.tsx` | skrifvarin prófun: engin POST í `turbopaint_boards`/geymslu við opnun |
| 10.11 | **Húsið ræður skurðinum** í sjálfvirka verkferlinu — kassi handteiknuðu útlínunnar + 2,5 % spássía í stað kassa sem vélin giskaði á; fyrri skurður hæðarinnar víkur (líka `sjalf:false` sem verkferlið skrifar sjálft), nema myndin sé skorin (`myndSkurdur`) eða hæðin leiðrétt | PR #298, #300 · `sjalfvirkt.ts` (skref b), `kassiUtlinu` í `veggja-hreinsun.ts` | `veggja-hreinsun.test.ts` 29/29; framleiðsla, Breiðhöfði 13 2. hæð: „Skorið að húsinu sem þú teiknaðir: 91,8 × 45,0 m“ |
| 10.11 | **Halli blaðsins allur í vinnuþræði** (afkóðun + minnkun + grátónun + mæling, OffscreenCanvas) og **bíður eftir blaðinu** (allt að 20 s) í stað þess að segja „Náði ekki að mæla“ | PR #299, #301 · `skonnun-veggir-verk.ts` (`halliblad`), `skonnun-veggir-mynd.ts` | framleiðsla (`tp-halli-maeling`): Krókháls 9 1. hæð (JPEG) — engin löng verk ≥100 ms eftir Veggir-smell (lengsta 54 ms; áður 377 ms). Breiðhöfði (TIF): 258/1041/538 ms standa eftir og koma úr TIF-innflutningnum (`skonnun.ts`), ekki hallanum |
| 10.11 | **Útlit í 3D** — litur veggja, litur hurða, gólfáferð (steypa, epoxy smásteinar, flísar 30/60 cm, parket, epoxy glans) í 3D-spjaldinu; vistast á hæðina (`utlit3d`) | PR #302 · `golfaferdir.ts`, `Hus3D.tsx`, `uttekt.ts` | `golfaferdir.test.ts` (3), `uttekt-stillingar.test.ts` (4); framleiðsla: valið lendir í `uttekt.utlit3d` á borðinu (`tp-utlit.cjs`) |
| 10.11 | **Hæð opnast beint** — við `?uttekt=&haed=` hlóð TurboPaint fyrst síðasta borðinu að fullu (2,6–3,2 s frost) og svo gamla efni hæðarborðsins, til þess eins að henda hvoru tveggja. Nú biðstaða í minni, `takaVidBordi` (auðkennið eitt), og `haettaBidOgHlada` ef opnunin bregst | PR #308 · `WhiteboardApp.tsx`, `persistence.ts` | framleiðsla (`tp-opnun-maeling.cjs`): Breiðhöfði 2. hæð 19,9 → 14,5 s, löng verk 4,9 → 0,8 s (lengsta 2604 → 292 ms); Krókháls 1. hæð 4,5 → 4,0 s, 1,56 → 1,09 s; sömu hlutir á borði; fyrsta breyting vistar enn |
| 10.11 | **Lokaskref TIF-skönnunar í vinnuþræði** (putImageData + birtuskilasía + JPEG) | PR #307 · `skonnun-verk.ts`, `skonnun.ts` | framleiðsla: 904 + 548 ms verk → 386 ms; skjámynd blaðsins fyrir/eftir: meðalmunur 0,00 af 255 |
| 10.11 | **„Útveggir úr útlínu“** — takki í Húsið-spjaldinu: hver hlið handteiknuðu útlínunnar sem enginn samsíða veggur liggur eftir (≥ 70 % innan 0,6 m) verður veggur; eitt ⌘Z-skref, endurtakanlegt | PR #309 · `HusUtlina.tsx`, `utveggirSemVantar` í `veggja-hreinsun.ts` | `veggja-hreinsun.test.ts` 30/30; framleiðsla, Breiðhöfði 2. hæð: 68 → 72 veggir, annar smellur +0, undo → 68 |
| 10.11 | **Gólfáferðin sést og er í réttum litum** — `texture.repeat` endurtók húsgrímuna (three r128 deilir uv-vörpun `map` með `alphaMap`) og gólfið hvarf; nú bökuð á einn striga (`createPattern`), ólýst efni | PR #306, #310 · `Hus3D.tsx`, `golfaferdir.ts` | skjáskot af framleiðslu fyrir (ekkert gólf / skær-appelsínugult) og eftir (eikarparket) |
| 11.11 | **HÖKTIÐ í veggjabreytingum** (Agnar: „erfitt að gera línu eins og maður þarf … fínstilltu allt, svo það sé ekki hökt“). Fjórar rætur, hver mæld: (1) blaðið var teiknað með `shadowBlur` 18; (2) blaðið var í sama Konva-lagi og veggirnir; (3) `ObjectNode` var ekki minnisaður og fékk nýja meðhöndlara + `dragBoundFunc` við hverja teikningu → react-konva uppfærði ALLA hnúta og merkti lögin óhrein; (4) hvert form með fyllingu + strik + skugga/ógagnsæi fór um aukastriga Konva á stærð sviðsins (`perfectDraw`), og rúðunetið (`sceneFunc` nýtt fall) teiknaðist í hvert sinn | PR #314 (skuggi), #315 (eigið lag), #316 (`React.memo` + stöðugir meðhöndlarar), #317 (`perfectDrawEnabled={false}` á öll form, `GridLayer` minnisað) · `ObjectNode.tsx`, `BoardCanvas.tsx`, `SymbolNode.tsx`, `GridLayer.tsx` | framleiðsla, Krókháls 9 1. hæð, 150 hreyfingar á veggenda (`tp-teikna-maeling.cjs`): löng verk **150 → 0**, versta 297 ms → ekkert; talning (`tp-teikna-talning.cjs`, 60 hreyfingar): teikningar blaðs 59 → 0, rúðunets 59 → 0, heilskjáa samsetningar 472 → 0. Virknipróf (`tp-log-prof.cjs`): táknadráttur, val á mynd með Transformer, útflutningur; skjámynd fyrir/eftir: munur 0,000 |
| 11.11 | **„Vista í úttekt“ sést þegar hæð opnast án borðs** — galli úr #296: borðinn var falinn (og „Vista sem borð“ sýnt) þar til fyrsta breytingin var gerð | PR #313 · `WhiteboardApp.tsx` (`skodunUttekt`) | framleiðsla (`tp-vista.cjs`): takkinn til við opnun; smellur → skrif í geymslu, `turbopaint_boards` og `teikning_bord` (gripin) |
| 10.11 | **HÆÐATAPIÐ** — „mest ein hæð sem dettur síðan út“, „nokkrir mánuðir og þetta hefur ekki virkað“. Rót: `383 sameinaHaedir` skipti staðbundna hæðalistanum út fyrir lista þjónsins þegar röð hans barst 0,4–40 s eftir opnun; nýja hæðin hvarf, virka hæðin datt á fyrstu hæð og upphlaðna myndin lenti ÞAR — og þurrkaði skurð og veggi hennar (`beita()`). Nú halda hæðir sem urðu til hér (`G.nyjarHer`) sér þar til þær eru á þjóninum; eydd hæð annars staðar fer eins og áður | patch 383 + 375 (commit f31e917f) | `tools/teikning-haed-tap-vafri.cjs` (skrifvarið, keyrir appið af vinnutrénu): 5 → 4 hæðir FYRIR, 5 → 5 EFTIR, eydd hæð fer |

## Hvernig á að prófa án þess að skrifa (mynstrið)

- **TurboPaint á framleiðslu:** Playwright, `ctx.route('**/*')` → allt sem er ekki GET/HEAD/OPTIONS á `supabase.co` er `fulfill`-að með `[]` og skráð. `window.__tpStore` (borðið), `__tpSkodun`, `__tpSjalfvirkt` eru til fyrir próf. Dæmi: vinnumappa lotunnar 10.11 `tp-laesing.cjs`.
- **Teikning-glugginn af vinnutrénu:** lítill kyrrstöðuþjónn á `index.html` (óbúntaðir patchar), `ROT = path.resolve(…)` (annars 404 á Windows), `/api/hub-adgangar` svarað **404** (annars sendir innskráningarhliðið á `innskraning.html`), Netlify-föll/`/api` sótt af lifandi vef með `route.fetch({ url })`, Supabase-skrif gripin. Opna gluggann með `FloorPlan.load(cid); FloorPlan.open(cid, nafn, tæki)` — sama kall og Teikning-takkinn. **Route-aðu aðeins það sem þú þarft**: `ctx.route('**/*')` lét alla patchana `ERR_ABORTED` í hausalausum vafra. Smellur á `[data-h="ny"]` kveikir ekki þar — `TeiknBord.nyHaed()` er sama leið. Dæmi: `tools/teikning-haed-tap-vafri.cjs`, `tools/teikning-nytt-vafri.cjs`.
- **Bíddu eftir HÆÐINNI, ekki fyrstu mynd:** síðasta borðið birtist stundum fyrst — prófun verður að bíða eftir mynd með `uttekt.haedId === <hæð>` og `!importProgress`, stöðugt í nokkrar mælingar (annars mælirðu rangt borð; kostaði þrjár keyrslur 10.11). Tól lotunnar: `tp-opnun-maeling.cjs` (löng verk í opnun), `tp-greina.cjs` (Greining með útlínu, `VEL=1` hleypir aðeins verkbeiðni veggjavélar í gegn), `tp-utveggir.cjs`, `tp-utlit.cjs`.
- **Hökt: mældu, ekki giska.** Röðin sem fann ræturnar fjórar: rammamæling (rAF-bil + `longtask`) per aðgerð → CPU-prófíll um CDP (`Profiler.start`, efstu sjálftímaföll + kóðabútur úr minnkaða búntinu á dálkinum) → TALNING: `layer.on('draw')` per Konva-lag og `drawImage` vafið með stærð upprunamyndar og markstriga. Prófíllinn sagði „drawImage/restore“ þrisvar í röð af ÞREMUR ólíkum ástæðum (skuggi, sama lag, aukastrigi) — aðeins talningin greindi þær að. react-konva: eiginleiki sem er ekki `on…` og breytir um tilvísun (t.d. `dragBoundFunc`, `sceneFunc`) kallar `batchDraw` á lagið. Mælingar í hausalausum vafra á vél sem er að þjálfa eru háar í grunninn (p50 50–80 ms) — berðu saman við sveim-grunnlínuna, ekki við 16 ms.
- three.js í 3D er **r128 af cdnjs** (ekki pakkinn 0.185): `map` og `alphaMap` deila uv-vörpun, engin litrýmisstjórnun — prófaðu sjónrænt (skjáskot), tsc sér þetta ekki.
- Vercel-forskoðun á PR er á bak við innskráningu Vercel — prófaðu á framleiðslu eftir sameiningu (`slokkvitaeki.vercel.app`), ekki á `*-git-*.vercel.app`.
- Google Fonts svarar stundum ekki í Vercel-byggingu (`next/font`, `skin-fonts.ts`) — tómt commit endurbyggir; ekki breyta neinu.

## Veggjavélin (U-Net, `~/vegg-tilraun`) — helgin 07.11.2026

Þrjú líkön þjálfuð á 11 leiðréttum hæðum (`gogn.pkl` úr `gt_*.json`, `thjalfa3.py`, 4 kjarnar, ~1,8 s/itrun), metin með `meta2.py`:

| Mat á hæðum sem líkanið sá ALDREI | Gamla líkanið (net2) | Nýja (net3) |
|---|---|---|
| Breiðhöfði 13, 1. hæð (gull) — veggir F1 línur / pixlar | 0,30 / 0,33 | 0,33 / 0,35 |
| Breiðhöfði — hurðir @0,35: rétt af 25 (nákvæmni) | 5 (0,14) | 8 (0,33) |
| 490 kjallari / 1. / 2. hæð — veggir F1 línur | 0,79 / 0,82 / 0,71 | 0,81 / 0,81 / 0,71 |
| 490 — hurðir @0,35 nákvæmni | 0,39 / 0,30 / 0,36 | 0,56 / 0,30 / 0,49 |

Niðurstaða: veggir óbreyttir, hurðir mun færri falskar. Breiðhöfði (önnur húsgerð) er enn langt frá nothæfu (þriðjungur
veggja). Kandídatinn `net3_allt.pt` (allar 11 hæðir, 24.000 itr) er EKKI í notkun — Agnar ákveður. Fleiri leiðréttar hæðir
í ÓLÍKUM byggingum hjálpa mest (489 hæð 2–4 eru sama merkingin þrisvar). Hvernig hæð verður þjálfunargögn: leiðrétt í
TurboPaint („Vista í úttekt“ með `leidrett.af = turbopaint`) → `samstilla.py --skrifa` tekur hana inn.

## Veggjavélin — næturþjálfun 11.11.2026 (14 hæðir, `nott.py` á heimatölvunni)

Þrjár hæðir bættust við (Krókháls 9 1. hæð — aðeins merkti hlutinn, `skurdur` handsettur í gt-skrána; Máni Apartments 6. hæð;
Ice Apartments 1. hæð) → 14 hæðir í 8 byggingum. Tvö líkön: `net3_n4utan219.pt` (6000 itr, Breiðhöfði haldinn frá) og
`net3_n4allt.pt` (16.000 itr, allar 14). Keyrslan tók 01:12–06:42. Tölurnar eru í `~/vegg-tilraun/NIDURSTODUR_nott_2026-11-11.md`.

| Mat á hæð sem líkanið sá ALDREI | Veggir F1 línur (pixlar) | Hurðir @0,35: rétt af (nákvæmni) |
|---|---|---|
| Helgarlíkanið `net3_allt` á Krókhálsi 9, 1. hæð | 0,71 (0,79) | 4 af 16 (0,22) |
| Helgarlíkanið á Mána, 6. hæð | 0,83 (0,85) | 10 af 13 (0,53) |
| Helgarlíkanið á Ice, 1. hæð | 0,61 (0,63) | 3 af 6 (0,19) |
| Breiðhöfði: 10 hæðir í þjálfun (helgin) → 13 hæðir (`n4utan219`) | 0,33 (0,35) → 0,35 (0,37) | 8 af 25 (0,33) → **4 af 25 (0,15)** |

Niðurstaða: nýju hæðirnar þrjár breyttu veggjum á Breiðhöfða ekki (0,02 er innan sveiflu einnar keyrslu) og **hurðir versnuðu
þar** á öllum þröskuldum (@0,25: 10 réttar af 42 spám → 8 af 57). Ekkert bendir til að `net3_n4allt.pt` sé betra en
`net3_allt.pt`; það sá allar 14 hæðirnar og verður því ekki metið á þeim. Kandídatinn er áfram `net3_allt.pt`, ekkert í notkun.
Líkanið dugar sem drög á íbúða- og gistihús (0,61–0,83 á óséðum húsum) en ekki á vöruhús með rekkum (0,35). Það sem vantar
er **önnur húsgerð í safnið** (vöruhús/verkstæði á eina hæð af 14), ekki fleiri íbúðahæðir.

Gildrur úr þessari keyrslu:
- **Berðu saman á SAMA þröskuldi.** Hurðatölur eru til á 0,15 / 0,25 / 0,35 / 0,5; „8 af 25“ á 0,25 hjá nýja líkaninu og „8 af 25“
  á 0,35 hjá því gamla eru ekki sami árangur (svarið 11.11 bar þetta saman þvert á þröskulda og sagði „óbreytt“ — það var rangt).
- **Lækkandi tap er ekki árangur.** Tapið í `log4_n4allt.txt` (9,8 → ~1,3) er mælt á þjálfunargögnunum sjálfum; aðeins mat á
  hæð sem líkanið sá ekki segir eitthvað.
- **Líkan sem sá allt verður ekki metið.** Áður en „allt“-líkan er þjálfað: keyra `utan<bygging>` fyrir hverja NÝJA byggingu,
  annars er engin tala til um hvort nýju gögnin hjálpuðu þeim.
- Bakgrunnsferli sem á að lifa endurræsingu lotunnar: `Invoke-CimMethod -ClassName Win32_Process -MethodName Create`
  (`Start-Process` dó með lotunni kl. 02:03); `nott.py` heldur áfram frá vistunarpunkti (250 itr) og sleppir mati sem er til.
- `eval4_nytt_219.txt` er cp1252 (hinar eru UTF-8) — lestu með `grep -a`, ekki breyta skránni.

## Endurprófað 16.11.2026 (eftir að aðrar lotur sameinuðu #320–#326: PWA, Verkefni-forsíða)

Prófskrifturnar eru nú geymdar í skillinu: `scripts/turbopaint-prof/` (README þar segir hvað hver svarar og hver rétt útkoma er;
þær voru áður aðeins í vinnumöppu lotunnar). Sömu skrifvörðu próf og 11.11, á framleiðslu, Krókháls 9 1. hæð: `tp-teikna-talning.cjs` — 60 hreyfingar á veggenda: blað 0 teikningar,
rúðunet 0, aðallag 59 (aðeins 8 tákn teiknuð beint, 200×128, enginn heilskjáastrigi); `tp-log-prof.cjs` — þrjú lög, tákn dregst,
blaðið valið með smelli, útflutningur skilar mynd; `tp-vista.cjs` — hæð opnuð án borðs sýnir „Vista í úttekt“, 0 skrif við opnun,
smellur skrifar geymslu + `turbopaint_boards` + `teikning_bord` (gripið). Gögn Krókháls 9 óbreytt: 8 merki og 126 veggjalínur á 1. hæð.
Engin ný leiðrétt hæð hafði bæst við þjálfunarsafnið (síðasta: Ice 1. hæð 10.11).

## Enn opið (ekki lagað — ekki segja að það sé það)

- **Barónsstígur 18** (staður 1941, heitir „Baronstígur 18“ í `fyrirtaeki`): Agnar sagði 10.11 að 1. hæð væri „ready“, en engin röð er í `teikning_bord` 16.11 — ekkert var vistað. Hæðin fer í þjálfun þegar hún er vistuð og leiðrétt.
- **„+ Hæð“ í Teikning-glugganum** hefur ekki verið smellt á lifandi vef eftir lagfæringuna 10.11 (þarf innskráningu); Agnar hefur ekki sagt hvort hæðir detta enn út.

- **2. hæð Breiðhöfða finnst ekki sjálfvirkt**: raunveruleg veggjavél (verk 303, 10.11) + þunnveggjaleit með útlínu um allt húsið = 30 veggir / 43 m, 1 hurð — aðeins efri útveggurinn (vafraleitin ein: 8 veggir). Hæðin er vöruhús (rekkar) með skrifstofukjarna neðst til hægri. Handleiðin er komin: Húsið → „Útveggir úr útlínu“ → teikna kjarnann í ritlinum. Veggirnir þar eru tvöfaldar hárfínar línur sem klassíska skönnunarleitin sér ekki; veggjavélin (U-Net) fann 68 línur 05.11 en F1 líkansins á þessu húsi er 0,33. Þetta er næsta stóra verkið — þunnveggjaleit (`finnaThunnaVeggi`) eða fleiri leiðréttar hæðir af þessari húsgerð.
- Lifandi prófun á Teikning-glugganum (hæðatapið) á slokkvitaeki.netlify.app þarf innskráningu — sannreynt af vinnutrénu og að lagfæringin sé í lifandi búntinu (`_bundle-4`: `nyjarHer`), ekki með smelli á lifandi vef.
- Raunveruleg tæki í Designer-3D (líkön).
- Veggjavélin (U-Net) á 2. hæð Breiðhöfða ekki keyrð aftur með nýjum líkönum (skrifar á framleiðslu — spyrja fyrst).
- Birkimelur 10/10a/10b/10c: teikningar fundnar (landnr 106353), ekki settar á borð (vantar félag).
- Teikning-glugginn opnast hægt á stórum blöðum (`Fylla tvöfalda veggi` 5,2 s á 6000 px kjallara Krókháls) — ekki mælt hvar restin fer.
