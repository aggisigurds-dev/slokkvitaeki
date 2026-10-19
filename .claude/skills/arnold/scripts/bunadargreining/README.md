# Búnaðargreining — skriftur (fyrirmyndir)

Skrifturnar sem greindu fyrstu staðina 19.10.2026. Aðferðin sjálf er í `../../references/bunadargreining.md`.
Þær eru **fyrirmyndir**, ekki tilbúið tól: slóðir á skrár og hnit eru fyrir hvern stað. Keyrðu í vinnumöppu
(scratchpad) með afriti af skjölunum — Python: `C:\Users\Slokkvitaeki\teikning-greining\.venv\Scripts\python.exe -X utf8 -I`,
Node: Playwright úr `C:/Users/Slokkvitaeki/luna-bridge/node_modules/playwright`. Lyklar lesnir við keyrslu
(`slokkvitaeki/js/config.js` opinberi lykillinn, `luna-bridge/.env` aðeins fyrir upphleðslu í geymslu) — engir lyklar hér.

**Skrifar á framleiðslu:** `vista_*`, `merkja_texta`, `baeta_*`, `teikningar_greininga`, `skipta_skyrslu`, `vista_vidhengi`.
Allar hætta ef röðin hefur breyst (skilyrt á `updated_at`) eða ef virk greining er þegar til. Heredoc með íslensku brotnar í
Bash-tólinu — skrifaðu skriftu með Write og keyrðu hana.

| Mappa | Skrá | Hvað |
|---|---|---|
| `alfhella-9/` (1871) | `merkja.py` | hnit tákna af 1-bita skönnun (200 dpi) → 6000-díla rammi + merktar myndir |
| | `vista_bord.cjs` | ný `teikning_bord`-röð: 3 hæðir, skurður, Nýtt-merki (hættir ef röð er til) |
| | `merkja_texta.cjs` | `audkenni` + `stadur` á merkin (pörun á næsta punkt, skilyrt) |
| | `bua_pdf.cjs` | fyrsta PDF-skýrslan (HTML → Chromium) |
| | `vista_greiningu.cjs` | `bunadargreining`-röð (tki, texti, heimildir, athugasemdir) |
| | `ut_brunakerfi.py`, `baeta_ut.cjs` | ÚT/R úr skönnun (sniðmát úr skýringum) og textalagi → í greininguna |
| | `brunavarnir_*.txt`, `bunadur.json` | brunavarnatextinn orðrétt og staðirnir |
| `skutuvogur-4/` (661) | `afkoda.py` | dulkóðað textalag (ASCII + 29, íslenskir stafir á eigin sætum) |
| | `stilla.py`, `yfirlogn.py` | 2025-blað stillt við 2022-blað Teikningar (matchTemplate á brúnum) + sjónræn athugun |
| | `hannad.py`, `merkja_alfaborg.py` | hönnunarstaðir (L/HST/BRSL) → auðkenni, staðir, pörun við merki Agnars (≤ 2,5 m) |
| | `brunakerfi2.py`, `brunakerfi3.py` | brunakerfisblöð Voltorku: R/H/HB sniðmát, skýringareitur út, blaðapör skeytt, tvítekningar út; ÚT + stjórnstöð úr 2025 |
| | `vista_661.cjs`, `baeta_brunakerfi.cjs`, `teikningar_greininga.cjs` | greiningin vistuð, brunakerfi/ÚT bætt við, blöð greiningarinnar (sér teikning) |
| `sunnukriki-3/` | `greina_einingu.py` | snúinn brunavarnatexti settur saman + tákn einingar af vigur-PDF |
| | `merkja.py`, `bua_pdf.cjs` | merkt blöð og PDF |
| | `greining_sunnukriki.json` | **bíður vistunar** — ekkert félag á Sunnukrika 3 í kerfinu (tki + blöð í `bunadargreining`-sniði) |
| `almennt/` | `vista_vidhengi.cjs` | PDF í Viðhengi félags um appið sjálft (111), aðeins þau skrif hleypt út; ekkert ártal í nafni |
| | `skipta_skyrslu.cjs` | ný skýrsla í stað gamallar: færslan af listanum, skráin KYRR í geymslunni (ekkert harðeytt) |
| | `pdf_ur_appinu.cjs` | PDF úr „Prenta" Búnaðargreiningar (474) á lifandi síðu eða localhost |
| | `profa_blod.cjs`, `profa_listi.cjs` | viðmótspróf (skrif lokuð): spjöld, stór sýn, prentun, listar á hæðaspjöldum |
| | `mapis_prof.mjs` | hvort map.is hýsir kortasjá sveitarfélags (slóð, token, queryTeiknigrunn, hýsill skránna) |
| | `reykjanesbaer_breyta.cjs` | fyrirmynd að tengingu nýs sveitarfélags í teikningaleitina (sjá f3b4dc07) |
