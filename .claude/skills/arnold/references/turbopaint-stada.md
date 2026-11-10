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
| 10.11 | **HÆÐATAPIÐ** — „mest ein hæð sem dettur síðan út“, „nokkrir mánuðir og þetta hefur ekki virkað“. Rót: `383 sameinaHaedir` skipti staðbundna hæðalistanum út fyrir lista þjónsins þegar röð hans barst 0,4–40 s eftir opnun; nýja hæðin hvarf, virka hæðin datt á fyrstu hæð og upphlaðna myndin lenti ÞAR — og þurrkaði skurð og veggi hennar (`beita()`). Nú halda hæðir sem urðu til hér (`G.nyjarHer`) sér þar til þær eru á þjóninum; eydd hæð annars staðar fer eins og áður | patch 383 + 375 (commit f31e917f) | `tools/teikning-haed-tap-vafri.cjs` (skrifvarið, keyrir appið af vinnutrénu): 5 → 4 hæðir FYRIR, 5 → 5 EFTIR, eydd hæð fer |

## Hvernig á að prófa án þess að skrifa (mynstrið)

- **TurboPaint á framleiðslu:** Playwright, `ctx.route('**/*')` → allt sem er ekki GET/HEAD/OPTIONS á `supabase.co` er `fulfill`-að með `[]` og skráð. `window.__tpStore` (borðið), `__tpSkodun`, `__tpSjalfvirkt` eru til fyrir próf. Dæmi: vinnumappa lotunnar 10.11 `tp-laesing.cjs`.
- **Teikning-glugginn af vinnutrénu:** lítill kyrrstöðuþjónn á `index.html` (óbúntaðir patchar), `ROT = path.resolve(…)` (annars 404 á Windows), `/api/hub-adgangar` svarað **404** (annars sendir innskráningarhliðið á `innskraning.html`), Netlify-föll/`/api` sótt af lifandi vef með `route.fetch({ url })`, Supabase-skrif gripin. Opna gluggann með `FloorPlan.load(cid); FloorPlan.open(cid, nafn, tæki)` — sama kall og Teikning-takkinn. **Route-aðu aðeins það sem þú þarft**: `ctx.route('**/*')` lét alla patchana `ERR_ABORTED` í hausalausum vafra. Smellur á `[data-h="ny"]` kveikir ekki þar — `TeiknBord.nyHaed()` er sama leið. Dæmi: `tools/teikning-haed-tap-vafri.cjs`, `tools/teikning-nytt-vafri.cjs`.
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

## Enn opið (ekki lagað — ekki segja að það sé það)

- Þriðja handstýringin: **skurður/crop** sem Agnar setur sjálfur í TurboPaint og „Að húsinu“ skrifar ekki yfir (í Teikning-glugganum er ✂ Skera þegar `sjalf=false`).
- 3D: litir á veggjum/hurðum, gólfáferðir (steypa, epoxy, flísar, parket); raunveruleg tæki í Designer-3D.
- Hallamælingin tekur enn ~370 ms á aðalþræðinum (afkóðun/grátóni) — þak 200 ms.
- Veggjavélin á 2. hæð Breiðhöfða ekki keyrð aftur með nýjum kóða (skrifar á framleiðslu — spyrja fyrst).
- Birkimelur 10/10a/10b/10c: teikningar fundnar (landnr 106353), ekki settar á borð (vantar félag).
- Teikning-glugginn opnast hægt á stórum blöðum (`Fylla tvöfalda veggi` 5,2 s á 6000 px kjallara Krókháls) — ekki mælt hvar restin fer.
