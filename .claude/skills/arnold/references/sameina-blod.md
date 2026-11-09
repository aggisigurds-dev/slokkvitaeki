# Sameina klofin blöð — ein mynd á hverja hæð

Agnar 09.11.2026 (Bílabúð Benna, Krókháls 9): „geturðu sameinað hæðirnar saman … eru 2–3 teikningahlutar af t.d.
1. hæð“. Stór hús passa ekki á eitt A1-blað í 1:100 og arkitektinn klýfur grunnmyndina í A/B (eða fernt/áttund). Í
Teikning/TurboPaint verður hver hluti þá sérhæð („1. hæð A“, „1. hæð B“), merkin dreifast á tvo staði og veggjavélin
sér aldrei allt húsið. Lausnin er að **sauma hlutana saman í eina mynd**, geyma hana í eigin geymslu og setja hana inn
sem EINA hæð.

## Hvenær á þetta við — og hvenær ekki

1. **Fyrst**: leitaðu að heilu blaði í skjalasafninu (`teikn-listi`, sjá „Að finna teikningar“ í SKILL.md). Oft er til
   eldri eða nýrri umsókn þar sem öll hæðin er á einu blaði — þá þarf ekkert að sauma. Á Krókhálsi 9 voru ALLAR
   grunnmyndir 2007–2023 klofnar, svo saumurinn var eina leiðin.
2. Saumurinn virkar vel þegar hlutarnir eru **teiknaðir úr sama vigur-PDF** (sama CAD-skjal, sami kvarði): þá er munurinn
   hrein hliðrun (dx, dy), enginn snúningur, og saumurinn er ósýnilegur. Krókháls 9: dx = 0,0, dy = −2207,5 px.
3. **Skannaðar TIF-myndir** (eldri umsóknir) hafa mismunandi halla og kvarða milli blaða — þær sauma ekki saman með
   þessu tóli. Þá annaðhvort velja nýrri vigurblöð (eins og gert var fyrir 2. hæð Krókháls: 2023-„Milligólf“ ber sjálft
   titilinn „Grunnmynd 2.h“ og kom í stað átta 2012-skannana) eða láta hlutana standa.
4. Athugaðu heiti blaðanna í safninu á móti titlinum Á blaðinu: safnið kallaði efri hæðina „Milligólf“ en blaðið sjálft
   „Grunnmynd 2.h“.

## Verkferlið (scripts/sameina-blod/)

Allt keyrt staðbundið í Python 3 (cv2, numpy, Pillow — allt til á vélinni). Ekkert skrifað fyrr en í skrefi 5.

1. **Sækja blöðin í fullri upplausn** um `teikn-mynd` (6006 px langhlið er sjálfgefið):
   `https://slokkvitaeki.netlify.app/.netlify/functions/teikn-mynd?url=<permalink .pdf.info, URL-kóðað>` →
   `full-<hæð>-A.jpg`, `full-<hæð>-B.jpg`. A = sá hluti sem er neðar/sunnar á sameinuðu myndinni, B sá efri.
2. **`sauma.py <hæð> …`** — ORB-einkenni á plan-svæði beggja blaða (titilreitur skorinn af, efstu 10 %), BFMatcher +
   RANSAC á hreina hliðrun (3 px vikmörk). Krefst ≥ 60 samhljóða para; Krókháls gaf 840–970 af ~3500. Í skörunarbandinu
   ræður efra blaðið ofan við miðju og það neðra neðan við — línur beggja haldast (`np.minimum`), rammi/texti annars
   blaðsins smitast ekki yfir. Skrifar `<hæð>-sameinad.jpg` + `<hæð>-smaa.jpg`. **Skoðaðu smámyndina og nærmynd af
   saumnum** áður en lengra er haldið.
3. **`ljuka.py <hæð>=<útnafn> …`** — sker titilreitsleifina ofan af (þétt band > 8 % dökkt í efstu 6 %), sker að ramma
   blaðsins (1,2 % inn fyrir rammalínuna), minnkar í **6000 px langhlið** (sama og 435 geymir, farsímar ráða við það)
   og vistar JPEG q88 í `lokaa/`. Prentar `top`, skurð og kvarðann `k` — **skrifaðu þessar tölur niður**, þær þarf í skrefi 6.
4. **Hlaða upp** í opnu Supabase-fötuna `turbopaint`, slóð `teikningar-mynd/sameinad/<útnafn>.jpg`
   (`POST /storage/v1/object/turbopaint/<slóð>`, anon-lykillinn dugar, `x-upsert: true`). Opinber slóð:
   `https://osfdzskyvisifcwyjkuk.supabase.co/storage/v1/object/public/turbopaint/teikningar-mynd/sameinad/<útnafn>.jpg`.
   Nafnið: `<gata>-<nr>-<hæð>-<ár umsóknar>.jpg`.
5. **Hæðin í `teikning_bord.haedir`**: `{id:'hc<félag>x<5 hex>', nafn, image_url:<opinbera slóðin>, frum:{b,h} = stærð
   JPEG-sins, markers:[], veggir:[], syn:{a:true}, sjalf:false, heimild:{dags, safn:'reykjavik', lysing, sameinad:[permalink A,
   permalink B], af}}`. Enginn `skurdur` — myndin er þegar skorin að húsinu. Taktu **afrit af röðinni** fyrst og skrifaðu
   með `updated_at=eq.<lesið gildi>` í PATCH-skilyrðinu svo ekkert sé yfirskrifað sem Agnar var að vinna í á meðan.
6. **Vinna sem var á hlutunum** (merki, `veggjaLinur`, `leidrett`) **má aldrei glatast** — athugaðu HVERN hluta áður en
   honum er eytt (`markers`, `veggjaLinur`, `veggir`, `pdfVeggir` eru oftast tóm en ekki alltaf: „1. hæð A“ á Krókhálsi
   bar 8 merki og 126 veggjalínur). Hnit hlutans → sameinaða myndin:
   `x' = (x − m)·k`, `y' = (y − off + round(−dy) − top − m)·k` fyrir A-blaðið (off = 10 % af hæð blaðsins, m = 1,2 % af
   breiddinni, top/k úr ljuka.py); fyrir B-blaðið er liðurinn `− off + round(−dy)` felldur niður (B byrjar efst). Þykkt
   `t` margfaldast með k. **Teiknaðu línurnar og merkin ofan á sameinuðu myndina og horfðu** — passi það ekki upp á díl
   er vörpunin röng. Skrifaðu `leidrett` áfram með `flutt: 'af <hluti> <dags>'`.
7. **Eyða hlutunum** (eftir að allt er flutt) og setja nýju hæðirnar í röðina Kjallari → 1. hæð → 2. hæð → Lóð;
   `markers`/`image_url` raðarinnar spegla fyrstu hæð.
8. **Sannreyna án skrifa**: opna `/kjarni/turbopaint?uttekt=<félag>&haed=<id>` með Playwright og hlera öll
   Supabase-skrif (sjá „Prófunaraðferð“ í SKILL.md); skjáskot. TurboPaint þarf hýsilinn `osfdzskyvisifcwyjkuk.supabase.co`
   á leyfilista `/api/turbopaint/fetch-plan` (kjarni PR #294, 09.11.2026) — fyrir hann hafnaði TurboPaint slíkri hæð
   með „Hýsillinn … er ekki á leyfilistanum“ þótt Teikning-glugginn sýndi hana.

## Það sem tapast — segðu Agnari það

- Sameinaða hæðin er **raster**: „Skýrari veggir“ / „Full gæði“ (vigur-PDF um teikn-mynd) eru ekki í boði á henni;
  veggjavél TurboPaint vinnur á myndinni eins og á skönnun. `pdfVeggir` hlutanna fylgja ekki með.
- Blaðstærðin er óþekkt, svo 3D giskar á kvarða (sama og á skönnuðum blöðum) — kvarðaðu í TurboPaint ef metrar skipta máli.
- Upprunalegu hlutarnir eru áfram í skjalasafninu og í afritinu (`afrit_<félag>_fyrir_sameiningu.json` í vinnumöppu
  lotunnar) — hægt að setja þá inn aftur hvenær sem er.

## Dæmi: Krókháls 9 (félag 532), 09.11.2026

| Hæð | Blöð (2023-08-15) | Hliðrun | Útkoma |
|---|---|---|---|
| Kjallari | 1542305 (A) + 1542249 (B) | dy −2286 | 3383 × 6000 |
| 1. hæð | 1542301 (A) + 1542303 (B) | dy −2207,5 | 3531 × 6000 · 8 merki + 126 veggjalínur fluttar af „1. hæð A“ |
| 2. hæð | 1542302 (A) + 1542304 (B) — heita „Milligólf“ í safninu | dy −2207,5 | 3523 × 6000 |

Fjarlægt: 6 A/B-hlutar og 8 skannaðar 2012-sneiðar af 2. hæð (A–H; E–H voru afrit af A–D). Lóðarblaðið (1542297) stóð óbreytt.
