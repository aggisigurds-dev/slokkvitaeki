# Kveikjuorð — Jarvis

Ein setning vakir réttum sérfræðingi. Límdu orðið (eða línuna) inn í Claude /
Jarvis. Agentinn les `description:` í skill-/agent-frontmatter og hleður sér.

Kanónísk tafla. Brunahólf og 153/187-reikningarnir voru **ekki** breytt hér;
sömu orð virka í hinum repo af því `description:` þeirra inniheldur þegar lénið.

**Snið:** `orð: stutt mál` — t.d. `hindra klúður` eða `villuleit: sama mynstur og Plaza`.

## Hindra klúðurinn (áður en merge)

Ekki veiða eftir á. **Stöðvaðu** áður en ýtt er. Veiðin (`villuleit`) kemur
aðeins ef eitthvað slapp í gegn.

1. **Áður en merge / ýting**
   ```bash
   node tools/audit-all.cjs
   ```
   Lesið `docs/ORYGGISNET.md`. Kallið **netvörð** (`subagent_type: netvordur`).
   Grænt + SAFE = má merge. Rautt eða CUTS-A-WIRE = ekki ýta.

2. **Orðin `hindra klúður` / `villuleit`** vekja grep **áður** en agentinn skrifar:

   | Leitaðu að | Rangt þegar |
   |---|---|
   | `customer_base_id` án `fyrirtaeki_id`; `siblingsForKt`; `byKt` / `byBase` | ein skýrsla málar öll systkini á sömu kt |
   | `public_url` / `drive_file_id` án efnisprófs | grænt eða sent af dauðum hlekk |
   | `payday` + `kennitala` án `_siteTrusted` | einn reikningur / 🧾 á öll hótel |

3. **Charlize (ein setning):** `skýrsla = fyrirtaeki_id aldrei kennitala`
   Kt svarar „hver borgar". Staðurinn er `fyrirtaeki.id`.

4. **Ekki snerta** 153 / 187 reikninga (pera-stærðfræðin). Ekki snerta Brunahólf.

## Villuleit / variant (sama villa, mörg eintök)

Eitt staðfest dæmi → leitaðu að afritum. **Ekki** nýtt app. Skil: Charlize +
einn listi. Vörðu leið → `netvordur` á undan lagfæringu.

| Orð | Agent | Aðgerð |
|---|---|---|
| `hindra klúður` / `stöðva klúður` | `villuleit` + `netvordur` | **Stöðva** áður en merge: `audit-all` + grep (systkini-kt, `public_url`, Payday-eftir-kt). Ekki laga 153/187. |
| `villuleit` | `villuleit` | Senda-leikregla. Vakir `variant-analysis` + lén-agent. Skilar lista, lagar ekki fyrsta hitt. |
| `variant` / `variant-alert` | `villuleit` + `variant-analysis` | Eitt dæmi → öll eintök. Fimm skref: rót, exact, afstrakta, útvíkka, staðfesta. |
| `sama mynstur` / `er þetta víðar` / `afrit` | `variant-analysis` | Hunt copies. Skila lista, laga ekki fyrsta hitt. |
| `factcheck` / `er þetta rétt` / `hvað er satt` | `natalie` | Mæla kerfi vs gögn. LES OG MÆLIR. Leiðréttir aldrei gögn. |
| `systkini` / `systkini-kt` | `villuleit` + `kunnaskra` | Ein skýrsla/reikningur málað á öll hótel/pizzur á sömu kt. Lykill: `fyrirtaeki.id`. |
| `fölsk staðreynd` / `false-fact` / `falskt grænt` | `villuleit` + `uttekt-audit` | Pera/ár græn án skýrslu+reiknings á **þessum** stað. Par á `fyrirtaeki_id`. |
| `röng join` / `FK-join` / `join-villa` | `villuleit` + `elon-musk` | `uttaeki.client` / nafn-fold / `.limit(1)` í stað `uttaeki.fyrirtaeki_id`. `audit-fk-join.cjs`. |
| `hits[0]` / `companyForBld` | `villuleit` + `kunnaskra` | Giskað fyrsta hit á rekstrarfélagi. Aldrei. |
| `Tengireglan` | `kunnaskra` + `sara-coworker` | `fyrirtaeki_id` aðeins með sönnun. Aldrei giskað, aldrei núllað. |

Þekkt dæmi (ekki finna upp ný): Plaza, Center/Pizzan, Hotel Grandi, Heimaleiga
base 293, Hlaðvarpinn, Steypustöðin 2026.

## Lén — orð → agent → aðgerð

| Orð | Agent | Aðgerð |
|---|---|---|
| `kennitala` / `kt` / `999999` | `kunnaskra` | Hreinsa kt, tengja base↔stað, aldrei sameina rekstrarfélags-staði. |
| `customers_base` / `rekstrarfélag` / `sameina` / `tvítak` | `kunnaskra` | Lesa hrygginn áður en röð er sameinuð eða eytt. |
| `skýrsla` / `úttekt` / `fylla skýrslu` | `sara-coworker` | Fylla / yfirfara úttektarskýrslu live. Lykill: `fyrirtaeki_id`, aldrei kt. |
| `para` / `þekja` / `gloppa` / `vantar að rukka` | `sara-organizer` *(brunaholf)* | Pör skýrsla↔reikningur, `v_bundle_coverage`, aldrei ágiskun. |
| `reikningur` / `sala` / `POS` / `Payday` / `dkPlus` / `afsláttur` | `sala-reikningar` | Sala, reikningagerð, PDF-vistun, póstur. ALLTAF LEYFA VISTUN. |
| `krafa` / `kröfur` / `útistandandi` | `sala-reikningar` + `bokari` *(brunaholf)* | Kröfuyfirlit / AR. Bókari sannreynir tölu. |
| `taxti` / `VSK` / `NLSH` / `uppgjör` / `stemmir tala` | `bokari` *(brunaholf)* | Verðleggja, efnislisti, af hverju tala stemmir ekki. |
| `audit` / `samræmi` / `stemmir` / `passar magnið` | `uttekt-audit` | Magn á tækjalista ↔ skýrslu ↔ reikningi. Lesaðeins. `docs/SAMRAEMI-<ár>.md`. |
| `RLS` / `policy` / `lekt` / `anon` / `bucket` | `oryggi` *(brunaholf)* | RLS-staða, policies, lyklar. Áður en ný tafla fer í loftið. |
| `hraði` / `hægt` / `polling` / `bundle` | `hradi` *(brunaholf)* | Mæla og laga hleðslu, þung köll, polling sem étur DB. |
| `kort` / `pinnar` / `geocode` / `Leaflet` / `kill-dots` | `kort` | Pinnar, Nominatim, grátt kort, appelsínugulir punktar. |
| `prentun` / `QR` / `miði` / `Brother` / `raðnúmer` | `prentun` | Miði vitlaust/óskannanlegur, prentleið, S0001 / GY-0012. |
| `árs` / `ársreitur` / `pera` / `FULLBÚIÐ` / `VANTAR` / `SOURCE` / `FILTER` | `elon-musk` | As-built: `docs/RAFKERFI.md` fyrst. **Ekki breyta 153/187-reikningum.** |
| `öryggisnet` / `er óhætt` / `brýtur þetta` / `audit-all` | `netvordur` | Kortið + `node tools/audit-all.cjs`. SAFE eða CUTS-A-WIRE. |
| `útlit` / `sími` / `mobile` / `þröngt` / `endurhanna` | `joker` | Farsímaskjár, appham, takkar, letur. Ekki grind (það er 153). |
| `þema` / `skinna` / `Brunastál` / `theme.css` | `thema` | Hönnunarkerfi + per-page skeletons. |
| `flipi` / `borð` / `nav` / `bílstjóri` / `aksturslisti` / `bakk` | `bord-flettur` | Nýr flipi, deep-link, bakk (3 lög). |
| `muna` / `skrá` / `Charlize` / `hvernig var þetta` | `charlize` | Lesa áður en breytt er, skrifa áður en lokað er. |
| `Drive` / `PDF` / `endurnefna` / `skjal` | `skjol` *(brunaholf)* / `cowork-doc-sweep` | Skjöl, möppur, filename-snið. Aldrei eyða. |
| `Tímavera` / `Ajour` / `Redder` / `innsog` | `gagnaleidslur` *(brunaholf)* | Gögn vantar, innsog brotnar, hvað keyrir hvenær. |
| `bilað` / `niðri` / `timeout` / `eitthvað skrítið` | `kerfisheilsa` *(brunaholf)* | Supabase vs Netlify vs Claude vs appið. |
| `lykill` / `tengingar` / `gult` / `rautt` | `tengingar` *(brunaholf)* | Kerfisheilsu-borðið, endurnýja lykil. |
| `staðsetning` / `slökkvigildi` / `flóttaleið` / `byggingarreglugerð` | `arnold` | Hvar búnaður á að vera, hve mörg tæki. |
| `deploy` / `ýta` / `deploy.js` | `deploy` | Aðeins `git push`. Aldrei `node deploy.js`. |
| `verkefnalisti` / `beidni` / `i_vinnu` | `verkefnalisti` | Opna verk áður en nýtt er hafið. Reiturinn heitir `status`. |
| `watchlist` / `banner` / `aðstoð` | `adstod` | Customer brief, 🤖-spjald, Aðstoðarmiðstöð. |
| `hver er staðan` / `morgunyfirferð` / `Jarvis` | `jarvis` *(brunaholf)* | Dagleg yfirsýn, hvaða sérfræðingur á spurninguna. |
| `hype` / `hvernig gengur` | `hype` *(brunaholf)* | Sigrar + það sem stendur út af. Alvöru tölur. |

## Límsetningar (copy-paste)

```
hindra klúður: audit-all + netvörður áður en merge; grep systkini-kt / public_url / Payday-eftir-kt
villuleit: sama mynstur og Plaza — systkini-kt málar skýrslu á öll hótel
variant: röng join, tæki→nafn í stað FK
fölsk staðreynd: ársreitur grænn án pars á þessum stað
kennitala: tengja kt við customers_base, ekki sameina staði
skýrsla: fyrirtaeki_id aldrei kennitala
reikningur: POS + Payday, alltaf leyfa vistun
krafa: útistandandi á Kröfuyfirliti
RLS: er taflan opin / þarf policy
hraði: síðan er hægt, finna þunga köll
kort: pinnar vantar / grátt kort
prentun: QR skannast ekki / miði of lítill
árs: pera á röngum lit, as-built fyrst — ekki breyta 153/187
öryggisnet: er óhætt að ýta
```

## Repo-vísun

| Lén | Repo |
|---|---|
| App, POS, Ársskoðun, Bílstjóri, QR, kort | `slokkvitaeki` |
| Hub, customer.html, Drive-tól, Jarvis-síða, RLS | `brunaholf` (ekki snerta í klúður-vörn) |
| Ný Next.js / schema / shadcn | `kjarni` |

Bæði slökkvitæki og brunahólf lesa sama Supabase `osfdzskyvisifcwyjkuk`.

## Tengt

- Senda: `.claude/skills/villuleit/SKILL.md`
- Aðferð: `.claude/skills/variant-analysis/SKILL.md`
- Mæla: `.claude/agents/natalie.md`
- Öryggisnet: `docs/ORYGGISNET.md` + agent `netvordur`
- Staðreyndir: `docs/STADREYNDIR.md`
- As-built: `docs/RAFKERFI.md`
- Magn-audit: `.claude/skills/uttekt-audit/SKILL.md`
