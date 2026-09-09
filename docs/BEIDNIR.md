# Beiðnalisti Agnars → Claude

Hér skrái ég niður punktana sem Agnar hendir inn. Reglan: **ný beiðni stöðvar ekki
það sem er í gangi** — hún fær númer og bíður, núverandi verk klárast fyrst
(gert + prófað + staðreyndaskoðað). Sjá `feedback_request_dashboard`.

Staða: `NÝ` · `Í VINNSLU` · `Í YFIRFERÐ` (agent segist búinn, ég á eftir að fara yfir) · `KLÁRT` · `BÍÐUR AGNARS`

---

## 2026-09-09

| # | Beiðni | Hver | Staða |
|---|--------|------|-------|
| B1 | Geta eytt/falið öppum — „þoli ekki að geta ekki stjórnað neinu" | Claude | ✅ KLÁRT |
| B2 | Collapse-takki á teikningar (Teikning-borðinn á fyrirtækjasíðu) | agent | ✅ KLÁRT — yfirfarið |
| B3 | Texti á rekstrarfélögum helst ekki — dettur út við að fara af síðunni. Verður að festast og haldast milli tölva. **Finna hvað í reitnum veldur því + leita að sömu stillingu annars staðar á síðunni og laga þar líka** | agent | ✅ KLÁRT — yfirfarið |
| B4 | Þjónustuborð: breytingar mögulegar — en ekki á öllum. Athuga hverjir og af hverju | Claude | ✅ KLÁRT |
| B6 | Teikningar eru geymdar EINGÖNGU í `localStorage` (`fp_<id>`) — þær fylgja ekki milli tölva og glatast ef vaframinni er hreinsað. Brýtur samstillingarregluna í CLAUDE.md | — | NÝ |
| B8 | Enginn „Stólpi-afsláttur" er til — talan er afsláttarstiginn á prófílnum (tilboðsverð → afsláttarhópur → sjálfvirkur %). **Aðeins einn hópur er til (Center Hotels) og hann geymir prósentur þótt raunsamningurinn sé föst verð.** Þarf ákvörðun Agnars | — | BÍÐUR AGNARS |
| B7 | Villa í patch 109: „Engir tækjadottar enn"-kassinn bætist við á 1,5 s fresti án þess að sá fyrri sé fjarlægður — hleðst upp meðan teikning án dotta er opin | — | NÝ |
| B5 | Daufar textalínur á fyrirtækjabannerinn fyrir upplýsingar um verin (fjöldi íbúða, fjöldi hæða, hringja á undan…) + grafa upp Stólpi-afsláttartöluna og sýna hana í einni línunni | agent | ✅ KLÁRT — yfirfarið |

| B9 | **Sjálfvirkt % og Tilboðsverð vantaði í afsláttarkassann** — aðeins „Hópur" stóð eftir | Claude | ✅ KLÁRT |
| B10 | **KRITÍSKT: texti í athugasemdareitum hvarf við harða endurhleðslu.** POS-forsóknin skrifaði 10-súlna lista yfir `Companies.list` (32 súlur) — `banner_note`, `plan_note` o.fl. urðu `undefined` og reitir birtust tómir. Ekkert eyddist, það sást bara ekki | Claude | ✅ KLÁRT |
| B11 | Center Hotels: bannerlínan sýnir „Afsláttur —" þótt félagið sé í hópi með 10–32% — hópurinn er lesinn of seint | — | NÝ |

### Bíður ákvörðunar Agnars (eldra)

| # | Mál |
|---|-----|
| A1 | 11–14 félög þar sem prófíll og skýrsla stemma ekki — hvor talan er nýrri? |
| A2 | Vélrás 1740/1741/1742 eru með `stadur_nr = null` |
| A3 | Tæki ranglega merkt `urelt` hjá Sólvangsvegi 1 (160) og Heimaleigu Mannheimum (626) |
| A4 | Á að draga reiknivélina úr patch 129 út svo öll ~595 félög fái raunverð (ekki bara 88)? |
