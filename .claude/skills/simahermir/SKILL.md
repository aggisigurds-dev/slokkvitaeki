---
name: simahermir
description: Símahermirinn — sjá hvernig síða, sýn eða mockup lítur út í síma ÁÐUR en Agnar þarf að opna hana. Eitt tól (tools/simahermir.cjs), tveir hamir. „skot" tekur mynd í 360/390/412 px með alvöru tækjahermun og setur þær hlið við hlið á eina samanburðarmynd sem er send í síma Agnars. „opna" opnar smellanlegan símaglugga á tölvunni. Virkar á Slökkvitæki, Brunahólf, Kjarna, localhost og HTML-skrá á diski (mockup). Notaðu við ALLA hönnun og lagfæringu á símaútliti, fyrir og eftir breytingu, og áður en sagt er að eitthvað „virki á síma". Kveikjuorð: símahermir, hermir, emulator, mobile view, mobile preview, símaútlit, hvernig lítur þetta út í síma, sjá í síma, símaskjáskot, phone frame, símarammi, mockup í síma, 360, 390, 412, sími í tölvuútgáfu.
---

# Símahermir

Agnar 27.11.2026: „make some artifact or similar so it will be easier for claude and me to see how it will look like
in the mobile, when designing the mobile view … or make some emulator, we can use."

Tólið er `tools/simahermir.cjs` í slokkvitaeki-repóinu. Úr brunaholf eða kjarna: `node ../slokkvitaeki/tools/simahermir.cjs`.
Það finnur Playwright sjálft (luna-bridge), `NODE_PATH` þarf ekki.

## Keyrslureglur

1. **Fyrir breytingu og eftir breytingu.** Taktu skot áður en þú snertir CSS og aftur á eftir. Sama skipun, sama tæki.
2. **Lestu samanburðarmyndina sjálf** (`Read` á `…-samanburdur.png`) áður en þú segir nokkuð um útlitið.
3. **Sendu Agnari myndina** með `SendUserFile` (`display: "render"`). Hann vinnur oftast úr síma og sér hvorki
   vafraglugga lotunnar né localhost.
4. **Segðu „prófað í hermi".** Aldrei „virkar í símanum þínum" fyrr en hann hefur sent raunskjáskot.
5. **Myndirnar fara ekki í repó.** Þær bera kúnnagögn og repóin eru opinber. Sjálfgefna mappan er í TEMP; það er rétt.

## Skot — myndir í síma Agnars

Innskráning (lotan skráir sig sjálf, uid 10, aldrei uid 1): myntaðu köku með Supabase-tólinu,
`select kaka from innri.lotu_koku(10, 1);`, og settu hana í umhverfisbreytu í SAMA Bash-kalli. Aldrei í skrá.

```bash
export HERMIR_KAKA='<kaka>'
node tools/simahermir.cjs skot "#bord"                              # Slökkvitæki, sýn
node tools/simahermir.cjs skot "#bord" "#sala" --heil               # tvær sýnir, öll síðan niður úr
node tools/simahermir.cjs skot --vefur bh                           # forsíða Brunahólfs-hubbsins
node tools/simahermir.cjs skot "customer.html?id=12" --vefur bh     # undirsíða
node tools/simahermir.cjs skot "http://localhost:5599/#bord"        # óbirt breyting á dev-þjóni
node tools/simahermir.cjs skot C:/slod/mockup.html --bid 1500       # mockup á diski
node tools/simahermir.cjs skot "#bord" --taeki 360,390,412,tolvu    # með „sími í tölvuútgáfu"
```

Úttakið er ein lína á tæki (mæld `innerWidth`, lárétt skrun, reitir undir 16 px, takkar undir 36 px, sýnarhamur)
og slóðin á `…-samanburdur.png`.

| Valkostur | Hvað |
|---|---|
| `--vefur slokk\|bh\|kjarni\|<url>` | grunnur fyrir `#sýn` og `/slóð` (sjálfgefið slokk) |
| `--taeki` | `360` `390` `412` `430` · `tafla` (834 px) · `tafla-l` (spjaldtölva á hlið, 1.112 px) · `lenovo` / `lenovo-p` (Lenovo Tab 10,1″ bílstjórans á hlið 1.280 × 720 / upprétt 800 × 1.160 — ÁÆTLAÐ af skjástærð, ekki mælt á tækinu) · `tolvu` (sími í tölvuútgáfu, 1.230 px) · `tolva` (1.440 px) |
| `--taeki 1024x768` | sérsnið: hvaða stærð sem er (undir 600 px breidd telst sími, annars spjaldtölva) |
| `--heil` | öll síðan, ekki aðeins fyrsti skjárinn |
| `--bid 12000` | lengri bið þegar síðan sýnir enn „Sæki…" á myndinni |
| `--js "<kóði>"` | keyrt fyrir myndatöku: opna flipa, skruna, smella á takka sem þú ÞEKKIR |
| `--hamur thvinga` | þvinga sýnarham Slökkvitækis (`?devframe=simi\|tafla\|taflaL`). Sjálfgefið þvingar tólið aðeins ef appið valdi annað; `--hamur enginn` þvingar aldrei |

## Opna — smellanlegur sími á tölvunni

```bash
node tools/simahermir.cjs opna "#bord"              # Slökkvitæki í 390 px glugga
node tools/simahermir.cjs opna --vefur bh --taeki 412
```

Gluggi með snertingu og síma-UA opnast á þeirri vél sem keyrir skipunina. Agnar skráir sig inn einu sinni; prófíllinn
geymir það (`%LOCALAPPDATA%\simahermir-profill`). Þetta er fyrir Agnar við tölvuna. Fyrir lotuna sjálfa er skot betra,
eða vafraspjaldið með `resize_window preset: mobile`.

## Mockup (artifact eða HTML-skrá)

- **Sími Agnars er besti hermirinn fyrir mockup.** Artifact sem hann opnar í símanum teiknast í hans raunbreidd.
  Mockup fyrir síma er því venjuleg síða sem fyllir skjáinn, EKKI mynd af síma inni í síðu.
- Mockup verður að bera `<meta name="viewport" content="width=device-width,initial-scale=1">`. Án þess teiknar síminn
  hana í 980 px og smækkar. Tólið segir „vantar viewport-merki" þegar svo er. (Birtur artifact fær merkið sjálfkrafa;
  skrá á diski ekki.)
- Á breiðum skjá má sýna mockupið í 390 px ramma svo það líti ekki út eins og borði yfir þveran skjá:

  ```css
  @media (min-width: 700px) {
    body { background: #22252b; }
    .simi { width: 390px; min-height: 844px; margin: 24px auto; border-radius: 36px; outline: 10px solid #111; overflow: hidden; }
  }
  ```

  Efnið fer í `<div class="simi">`. Ath.: `@media`-reglur mockupsins svara glugganum, ekki rammanum. Skrifaðu mockupið
  því símafyrst án breiddarbrota.
- Keyrðu skrána gegnum `skot` áður en þú sýnir hana.

## Það sem hermirinn sannar ekki

- **Hermir er ekki síminn hans.** 13.11.2026 teiknaði sími Agnars Kjarna-síðu í tölvuútgáfu (~1.230 px) þótt hún
  stæðist 360 og 412 px í hermi. Tækið `tolvu` sýnir það tilvik, en hvort vafrinn hans er í þeim ham sést aðeins á
  raunskjáskoti frá honum.
- **Slökkvitæki velur símaútlit af sýnarham** (`data-viewmode`), ekki breidd. Tólið prentar `hamur=` fyrir hvert tæki.
  Standi þar annað en `mobile` á símatæki er myndin ekki símaútlitið.
- **Spjaldtölva í Slökkvitæki:** á hermdri spjaldtölvu (834 og 1.112 px) velur appið sjálft `desktop`, ekki `table`
  (mælt 27.11.2026). Tólið þvingar því Töflu-ham, eins og rofinn gerir, og prentar „(þvingaður með devframe)".
  `--hamur enginn` sýnir það sem spjaldtölva fær áður en nokkur velur Töflu.
- **Síðuzoom:** Slökkvitæki ber vistaða stærðarstillingu fyrir síma (333, `simi_sidustaerd`). Hún gildir líka í herminum.
- Talning á of smáu letri og kreistum dálkum er `tools/simasopur.cjs`. Hermirinn SÝNIR, sópurinn TELUR.

## Óbirt breyting (localhost)

Staðbundinn þjónn (`preview_start` → `slokkvitaeki-dev`, port 5599) á engin föll, svo appið stoppar á innskráningarskjá.
Hermirinn leysir það sjálfur: þegar markið er `http://localhost…` sækir hann `/api/` og `/.netlify/functions/` af lifandi
vefnum (`--vefur`) með lotukökunni. **Aðeins lestur** — öllu öðru en GET er svarað með tómu `{}` og fer aldrei af vélinni.
Supabase-köll vafrans fara áfram beint í grunninn, eins og á lifandi síðu: skoðaðu, smelltu ekki á vistun.

```bash
node tools/simahermir.cjs skot "http://localhost:5599/#bilstjori" --taeki 390,tafla,tafla-l --hamur thvinga
```

Á localhost velur appið annan sýnarham en á lifandi síðunni (mælt: `mobile` á 834 px staðbundið, `desktop` lifandi).
Notaðu `--hamur thvinga` þegar þú berð saman við lifandi mynd.

## Gildrur (allar mældar 27.11.2026)

- **Git Bash breytir `"/slóð"` í `C:/Program Files/Git/slóð`.** Tólið snýr því við. Fyrir forsíðu dugar `--vefur bh` eitt.
- **Rammi í artifact getur ekki hlaðið lifandi síðunum.** Claude-rammar loka á ytri vefi, og iframe á öðru léni fær ekki
  innskráningarkökuna. Þess vegna er þetta tól en ekki artifact. Sama gildir um `responsive-craft preview` á lifandi síðum.
- **Smart App Control lokar á Chromium Playwright í sýnilegum ham** á skrifstofuvélinni („spawn UNKNOWN"). `opna` notar
  því uppsettan Chrome, svo Edge. `skot` keyrir hauslaust og verður ekki fyrir þessu.
- **Headless Chrome með `--window-size=375` lýgur** (lágmarksbreidd ~500 px). Hér er útsýnið sett með tækjahermun og
  `innerWidth` mælt: 360/390/412 skiluðu 360/390/412.

## Lokagátlisti

- [ ] Skot fyrir og eftir, sama skipun
- [ ] `innerWidth` í úttakinu jafnt umbeðinni breidd, `hamur=mobile` á Slökkvitæki
- [ ] „ekkert lárétt skrun" á öllum símatækjum
- [ ] Samanburðarmyndin lesin með `Read` og send Agnari með `SendUserFile`
- [ ] Svarið segir „prófað í hermi" og hvaða tæki
- [ ] Engin mynd, kaka né kúnnagögn í repói
