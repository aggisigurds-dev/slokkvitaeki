# Tillögur Arnolds — áætluð þörf og staðsetning slökkvitækja/slöngukefla þar sem teikningin tilgreinir engin

Agnar 22.10.2026: „ef það eru engar merkingar til þá kanski fá Arnold til að reyna reikna út sirka þörf og hvar þau ættu að vera".

**Hvað þetta er:** Búnaðargreiningin (`bunadargreining.tki`) segir hvað HÖNNUÐUR teiknaði. Margar teikningar tilgreina engin slökkvitæki (eða slöngur) — þá reiknar Arnold
*áætlaða* þörf eftir reglunum (`bunadur.md`) og setur tillögu á teikninguna. Tillögur eru **aldrei** blandaðar í `tki`: þær búa í `bunadargreining.tillogur` (jsonb),
Gáttin sýnir þær sér (hvítur hringur með lituðum ramma, „tillaga" í teljara og skýringu), og kúnninn sér að þær eru áætlun, ekki hönnun.

## Gagnasnið — `bunadargreining.tillogur` (virk röð félagsins; PATCH, ný röð ekki þörf)

```json
{
 "at": "2026-10-22", "af": "Arnold (tillaga)",
 "nota": "stutt innri/ytri athugasemd (≤ 400 stafir, birt kúnna ekki orðrétt)",
 "krofur": { "<blad-id>": { "haed": "2. hæð", "m2": 480, "m2_heimild": "skráningartafla 2019 | áætlað úr málsetningu 19850×… | summa herbergja", "sl": 3, "bs": 1,
                           "reikn": "0,065×480 = 31,2 A → 3 × 13A; ≥ 2 á hæð; gönguleið ≤ 25 m úr öllum rýmum" } },
 "tki": [ { "blad": "<blað-id>", "haed": "2. hæð", "flokkur": "sl|bs", "bx": 1234, "by": 2345,
            "stadur": "Gangur við stigahús (0202), við ÚT-skilti", "tegund": "Léttvatn 9 l (13A)", "rok": "stigapallur/útgangur; gönguleið ≤ 25 m til herbergja 201–210" } ],
 "athugasemdir": [ "innra: …" ]
}
```
* `blad` = id blaðsins í `bunadargreining.teikningar` (EKKI endilega id hæðar á borðinu — sjá minnisskrá project_gatt_bgr_myndir), `bx/by` = rammadílar þess blaðs (sömu hnit og `tki[].bx/by`).
* Aðeins hæðir sem VANTAR búnað: sé hönnunin (tki) þegar komin yfir kröfuna á hæðinni → engin tillaga þar. Vanti hluta kröfunnar → tillaga fyrir mismuninn.
* Tillaga er aldrei sett í `teikning_bord` og snertir ekki merki Agnars.

## Útreikningur (reglur í `bunadur.md`, ekki endurtaka tölurnar annars staðar)

1. **Gólfflötur hæðar (m²):** forgangsröð: (a) skráningartafla/HMS (`arch/eignir.json` ef til), (b) summa herbergja sem standa á teikningunni („Herbergi 15,9 m²"), (c) málsetning
   (heildarlengd × breidd, dregið frá auðu rými) — merktu `m2_heimild` hreint og viðurkenndu óvissu (±15 %). Aldrei giska án heimildar.
2. **Slökkvitæki (`sl`):** slökkvigildi ≥ max(26 A; 0,065 × m²); léttvatn 9 l = 13 A → `ceil(A/13)`, **aldrei færri en 2 á hæð** (≤ 100 m² og lítið brunaálag: 1). Slöngukefli á hæðinni
   helmingar slökkviþörfina (26 A og 2 tæki standa). **Gönguleið ≤ 25 m** frá öllum stöðum — fjöldinn hækkar ef gangar eru langir (hótelgangur 40 m → tæki í báðum endum).
3. **Slöngukefli (`bs`):** aðeins þar sem reglan krefst — notkunarflokkur 1–2 yfir 500 m²; hótel/gisting (flokkur 4) eftir brunaálagi: leggðu til kefli ef hæðin er > 500 m² EÐA aðrar hæðir sömu
   byggingar eru með BS í hönnuninni (haltu mynstrinu). Drægni 30 m + 9 m bunu, öll horn nást; ≥ 2 á stórri hæð. Íbúðar-/gistiíbúðir í litlum húsum: ekkert kefli (segðu það í `reikn`).
4. **Staðsetning** (`bunadur.md`): við útganga og stigapalla (ÚT-merki hönnunarinnar sýna flóttaleiðir — notaðu þau sem akkeri), á göngum við hurðir í flóttaleið, sama staðsetning á hverri hæð
   (stigahús/lyftukjarni endurtekinn), við rafmagnstöflu/eldhús/þvottahús ef sjást á teikningunni (þá tegund: CO2 við töflu, froða/CO2 í eldhúsi). **Aldrei** inni í herbergi/gistiherbergi, bak við hurð, í skáp,
   í stigahúsi sjálfu (á pallinn/ganginn FYRIR framan það), á úti-/svalasvæði eða utan hússins. Settu merkið á gangvegg/pall við vegg, ekki ofan á hurðarboga.
5. **Texti:** `stadur` = rými + númer + kennileiti („Gangur 0201 við stigahús, við ÚT"); `tegund` = „Léttvatn 9 l (13A)" sjálfgefið, „Duft 6 kg" aðeins í verkstæði/lager/vélarými, „CO2 5 kg" við rafmagnstöflu.

## Vinnuferli

1. `node .claude/skills/arnold/scripts/bunadargreining/gatt-yfirlag/gogn.cjs <cid,…>` í eigin vinnumöppu → `blod.json` + blöðin (JPEG). Lestu hvert blað eins og greiningin: heildarmynd (smækkuð) + nærmyndir með gridlínum
   (`scripts/bunadargreining/verk/crops.py`, rammahnit) til að finna stigahús, ganga, ÚT-merki hönnunarinnar og herbergisstærðir; kvarði úr málsetningu eða m²-merkingum.
2. Skrifaðu `tillogur.json` (Write-tól, UTF-8) og PATCH-aðu það á virku röðina (`PATCH /rest/v1/bunadargreining?company_id=eq.<cid>&fjarlaegt_at=is.null`, anon-lykill úr js/config.js — aðeins
   `tillogur`-dálkurinn).
3. **Sannreyndu:** `gogn.cjs` aftur (tekur tillögurnar með) → `gera.py` → skoðaðu `yfirlag/*.jpg`: hver hvítur hringur á að sitja á gangi/palli við stigahús eða útgang, enginn inni í herbergi, engin utan hússins,
   engir tveir ofan á hvorum öðrum; teljarar mynd = `tillogur.tki`. Lagfærðu og endurtaktu.
4. `node hladaupp.cjs` (aðeins félögin í listanum) — nýju myndirnar koma í Gáttina þegar kóðinn sem les `tillogur` er kominn út.
5. **Fyrirvari alls staðar:** áætlun út frá reglum — endanleg staðfesting hjá hönnuði og slökkviliði; kúnninn sér það í Gáttinni og tæknimaðurinn staðfestir á staðnum við næstu skoðun.
