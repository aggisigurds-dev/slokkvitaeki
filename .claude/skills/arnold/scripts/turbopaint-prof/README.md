# TurboPaint — skrifvarin próf á framleiðslu

Skrifturnar opna TurboPaint á lifandi vef (`https://slokkvitaeki.vercel.app/kjarni/turbopaint?uttekt=<félag>&haed=<hæð>`) í
hausalausum vafra og **grípa öll skrif** á `supabase.co` (allt sem er ekki GET/HEAD/OPTIONS er svarað með `[]` og skráð).
Ekkert vistast. Þær urðu til í lotunni 07.–11.11.2026 og voru keyrðar aftur 16.11.2026 — lýsing á því sem þær sönnuðu er í
`../../references/turbopaint-stada.md`.

Keyrsla: `node <skrifta>.cjs` — umhverfisbreytur `BASE`, `CID` (félag, sjálfgefið 532), `HAED` (sjálfgefið `hc532x170aa`),
sumar `MERKI` (heiti í skráarnafni skjáskots). Playwright er sótt úr `C:/projects/luna-bridge/node_modules/playwright`
(breyttu efstu línunni á vél sem á það annars staðar). Skjáskot fara í tímabundnu möppu stýrikerfisins.

Útkoman í töflunni er frá 10.–11.11.2026; `tp-vista`, `tp-teikna-talning` og `tp-log-prof` voru keyrðar aftur 16.11.2026
(líka af þessum stað) með sömu útkomu. Tvö villusvör í stjórnborði eru eðlileg: 404 á `/_vercel/insights/script.js`
(greiningarskrifta Vercel) og 400 á `HEAD …/storage/v1/object/public/turbopaint/h<tæti>.png` (appið spyr hvort myndin sé
þegar í geymslunni áður en það hleður henni upp — 400 þýðir „ekki til“).

| Skrifta | Hvað hún svarar | Rétt útkoma |
|---|---|---|
| `tp-vista.cjs` | Sést „Vista í úttekt“ þegar hæð opnast án borðs, og fer vistunin af stað? | 1 takki, 0 skrif við opnun, smellur → geymsla + `turbopaint_boards` + `teikning_bord` |
| `tp-teikna-talning.cjs` | Hvað er teiknað við drátt á veggenda (teikningar per Konva-lag, `drawImage` eftir stærð) | 60 hreyfingar: rúðunet 0, blað 0, aðallag 59; aðeins tákn (200×128) teiknuð |
| `tp-teikna-maeling.cjs` | Rammatími og löng verk í fimm aðgerðum (velja, teikna vegg með/án „Smella á línu“, draga enda, færa vegg) | 0 löng verk við drátt (voru 150 af 150) |
| `tp-teikna-profill.cjs` | CPU-prófíll um CDP meðan dregið er — efstu sjálftímaföll | notað til að finna rót, ekki staðið/fallið |
| `tp-log-prof.cjs` | Virkni eftir lagaskiptinguna: þrjú lög, tákn dregst, blaðið valið með smelli, útflutningur | allt ✓, engar síðuvillur |
| `tp-opnun-maeling.cjs` | Tími og löng verk við að opna hæð | Breiðhöfði 2. hæð ~14,5 s (var 19,9) |
| `tp-halli-maeling.cjs` | Mælist halli blaðsins (worker) án þess að frysta aðalþráð | gildi skilað, engin „Náði ekki að mæla“ |
| `tp-laesing.cjs` | Er lagið „Teikning“ ólæst með veggjaritilinn opinn (`BREYTA=1` prófar líka breytingu) | „teikning:opið“ |
| `tp-utveggir.cjs` | „Útveggir úr útlínu“ bætir við útveggjum sem vantar og afturköllun virkar | t.d. 68 → 72 → 68 |
| `tp-utlit.cjs` | Útlit í 3D (veggir, hurðir, gólf) — tekur skjáskot; **skoðaðu myndina**, three r128 villur sjást ekki í gerðaprófun | gólf sést, áferð ekki oflýst |
| `tp-greina.cjs` | Sjálfvirka greiningin með útlínu; `VEL=1` hleypir AÐEINS verkbeiðni veggjavélar (`automation_triggers` INSERT) í gegn | — (`VEL=1` skrifar eina röð — notaðu aðeins þegar það er ætlunin) |

Þrjár gildrur sem kostuðu keyrslur:
1. **Bíddu eftir hæðinni, ekki fyrstu mynd.** Síðasta borðið getur birst fyrst; skrifturnar bíða eftir mynd með
   `uttekt.haedId === HAED` og `!importProgress`, stöðugt í fjórar mælingar. Haltu því í nýjum skriftum.
2. **Berðu saman við grunnlínu sömu vélar.** Hausalaus vafri á vél sem er að þjálfa líkan gefur p50 50–80 ms á ramma í kyrrstöðu.
3. **Forskoðun Vercel á PR er á bak við innskráningu** — prófaðu á framleiðslu eftir sameiningu.
