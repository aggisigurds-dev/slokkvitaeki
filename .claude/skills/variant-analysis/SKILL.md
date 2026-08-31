---
name: variant-analysis
description: Finnur ALLA staði sem bera sömu villu og sá sem var nýlega lagaður. Notaðu strax eftir að villa finnst — áður en sagt er „lagað" — og þegar Agnar segir „villuleit", „variant", „variant-alert", „er þetta víðar", „laga þetta alls staðar", „hvar annars staðar", „afrit", „sama mynstur", eða þegar sama villan kemur aftur eftir að hún átti að vera löguð. Fimm skref: rótin, nákvæm samsvörun, hvað má afstrakta, útvíkka þar til falsjákvæðin taka yfir, og staðfesta hvert tilvik á raungögnum. Senda-leikregla: docs/TRIGGERS.md + skill villuleit.
---

# Variant analysis — ein villa er aldrei ein

Þegar villa finnst er freistandi að laga staðinn sem brann og halda áfram.
Það er nákvæmlega þar sem þetta kerfi hefur blætt: sama villan situr á fjórum
öðrum stöðum og kemur aftur eftir viku, og þá er búið að segja Agnari að hún
væri löguð.

**Reglan: villa telst ekki fundin fyrr en búið er að leita að systkinum hennar.**

## Dæmið sem þetta skill er byggt á (30.08.2026)

`uttaeki`-raðir urðu til án `fyrirtaeki_id`. Þær verða draugar: reikningurinn
telur þær (hann telur á `client`-nafni) en tækjalistinn ekki (hann telur á
auðkenni). Þetta bjó til 152.880-reikninginn hjá Kirkjuvöllum og tvítalninguna
hjá Metal (7 tæki urðu 9).

Keðjan `Companies.addUnit → submitAddUnit → DB.addUnit` var lagfærð kl. 14:01
og **fór sannanlega í framleiðslu** — lifandi `/js/db.js` bar lagfæringuna.
Samt urðu til ótengdar raðir kl. 14:46:56 og 14:54:30.

Ástæðan: **tveir staðir í viðbót skrifa BEINT í töfluna** og snerta
`DB.addUnit` aldrei.

```
js/patches/73-bulk-add-units.js:131   sb.from('uttaeki').insert(rows)
js/patches/226-uttekt-reader.js:238   sb.from('uttaeki').insert(rows)
```

Þrír staðir lagaðir af fimm. Villan hélt áfram að framleiða draugatæki í
45 mínútur eftir að hún var sögð löguð. **Þetta skill er til svo það gerist
ekki aftur.**

---

## Skref 1 — Rótin, ekki einkennið

Skrifaðu í einni setningu hvað fór úrskeiðis, á því dýpi að setningin eigi við
hvern þann stað sem gæti borið sömu villu.

- ❌ Einkenni: „Kirkjuvellir fengu rangan reikning."
- ❌ Of þröngt: „`DB.addUnit` setti ekki `fyrirtaeki_id`."
- ✅ Rót: „Röð er skrifuð í `uttaeki` án `fyrirtaeki_id`, svo talning á
  auðkenni og talning á nafni gefa sitt hvora töluna."

Prófið: **ef setningin nefnir eitt fall eða einn viðskiptavin er hún ekki
komin niður á rótina.**

## Skref 2 — Nákvæm samsvörun

Finndu fyrst nákvæmlega þann kóða sem brann. Þetta er viðmiðið sem allt annað
er borið saman við.

```bash
grep -rn "status: 'ok'" --include=*.js js/ | grep -v "^js/patches/.*://"
```

Þú átt að fá 1 niðurstöðu. Fáirðu 0 er leitin röng; fáirðu margar ertu þegar
kominn með fyrstu systkinin.

## Skref 3 — Hvað má afstrakta

Taktu samsvörunina í sundur og merktu hvern hluta: er hann **einstakur fyrir
þessa villu** eða **hluti af mynstrinu**?

| Hluti | Einstakur? | Afstrakta í |
|---|---|---|
| `DB.addUnit` | já — bara þetta fall | → hvaða leið sem skrifar í töfluna |
| `uttaeki` | **nei** — taflan er mynstrið | → halda |
| `fyrirtaeki_id` vantar | **nei** — þetta ER villan | → halda |
| `status:'ok'` | já — ein birtingarmynd | → hvaða rangt fast gildi sem er |

Það sem eftir stendur óafstraktað er **fingrafarið**. Hér:
*hvaða skrif sem er í `uttaeki` sem ber ekki `fyrirtaeki_id`.*

## Skref 4 — Útvíkka, eitt þrep í einu

Slakaðu á **einum** þætti, keyrðu leitina, farðu yfir HVERJA nýja niðurstöðu og
merktu hana rétta eða falska. Haltu áfram þar til falsjákvæðin fara yfir
u.þ.b. helming — þá er mynstrið orðið of vítt og þú hættir.

```bash
# þrep 1 — leiðin sem var löguð
grep -rn "DB.addUnit" --include=*.js js/

# þrep 2 — allir sem skrifa í töfluna, ekki bara gegnum hjálparfallið
grep -rn "from('uttaeki')" --include=*.js js/ | grep -i "insert\|upsert"

# þrep 3 — sama mynstur á ÖÐRUM töflum sem eiga eiganda
grep -rn "\.insert(" --include=*.js js/ | grep -v "fyrirtaeki_id"
```

Þrep 2 er þrepið sem fann villuna sem klikkaði. **Sleppirðu því ferðu heim með
þrjá staði af fimm.**

## Skref 5 — Staðfesta á RAUNGÖGNUM, ekki í kóðanum

Kóðalestur segir hvað ætti að gerast. Gagnagrunnurinn segir hvað gerðist.
Hvert tilvik fær þrjá reiti:

| Reitur | Merking |
|---|---|
| **Staður** | `file:line` — nákvæmlega |
| **Vissa** | Há / Miðlungs / Lág |
| **Sannað?** | Fyrirspurn sem sýnir raðir sem villan bjó til — eða „engin enn" |

Dæmi um staðfestingu sem heldur:

```sql
-- Vinnur leiðin sem var löguð? Bornar saman raðir FYRIR og EFTIR útgáfutíma.
select date_trunc('hour', created_at) as klst,
       count(*) filter (where fyrirtaeki_id is null) as draugar,
       count(*) as alls
from uttaeki
where created_at >= '2026-08-30'
group by 1 order by 1;
```

**Munaðu tímabeltið.** `created_at` er UTC. Villan 30.08 leit út fyrir að vera
löguð af því tímastimplar voru bornir saman við íslenskan klukkutíma.

---

## Fastir grunsemdarstaðir í þessu kerfi

Þegar villa finnst á einu af þessum sviðum eru systkinin næstum alltaf til:

| Villuflokkur | Hvar á að leita strax |
|---|---|
| Röð skrifuð án eiganda-auðkennis | öll `.insert(` á `uttaeki`, `solur`, `customer_documents` |
| Talið á **nafni** í stað auðkennis | `client ===`, `.eq('client'`, `customer_nafn`, `co.nafn` |
| Kennitala borin saman | með og án bandstriks — `551007-1890` vs `5510071890` |
| Fast gildi sem á að vera breyta | `status:`, `'active'`, `'ok'`, `999999` |
| Þögul bilun | `catch(_){}`, `catch(e){}` án `logProblem` |
| Ópögineruð fyrirspurn | `.select(` án `.range(` á stórri töflu |
| Skjal vistað á undan sölunni | `upload(` á undan `insert('solur')` |

Fyrstu þrír flokkarnir hafa hver um sig kostað peninga á reikningi árið 2026.

## Kennitölu-gildran, sérstaklega

Þessi villa hefur komið upp **tvisvar á sama degi** hjá sama höfundi:

```python
# RANGT — customers_base.kennitala er geymd MEÐ bandstriki
q("customers_base?kennitala=ilike.*7006003350*")     # 0 niðurstöður, ranglega

# RÉTT — normalísera BÁÐAR hliðar áður en borið er saman
def d(v): return "".join(c for c in str(v or "") if c.isdigit())
BK = {d(b["kennitala"]): b for b in base}
```

Fyrra skiptið gaf ranga niðurstöðu um Ferðafélagið; seinna skiptið leiddi til
þess að Agnari var sagt að KAT og Icelandair Cargo væru ekki til í grunninum
og að vörn væri byggð á því. Hvort tveggja var rangt. **Normalísaðu alltaf
báðar hliðar.**

## Úrskurður — alltaf í lokin

Aldrei segja „lagað" án þessarar töflu:

```
RÓT: <ein setning>

LEITAÐ:  <mynstrin sem voru keyrð, orðrétt>
FUNDIÐ:  N staðir
LAGAÐ:   N staðir           (file:line hver)
EFTIR:   N staðir           (af hverju — meðvituð ákvörðun, ekki gleymska)
SANNAД:  <fyrirspurn sem sýnir að engin ný röð ber villuna>
```

Sé „EFTIR" ekki núll verður að segja það upphátt. Agnar tekur ákvörðun um
afganginn — það er ekki höfundarins að ákveða að hann skipti ekki máli.

## Muna

- **Kóðalagfæring ver aðeins kóðaleiðina.** Gamalt opið flipa-eintak keyrir
  gamla JS-ið áfram þótt `?v=` sé bumpað. Eina vörnin sem enginn sniðgengur er
  í gagnagrunninum sjálfum (`NOT NULL`, `CHECK`, `UNIQUE`, trigger).
- **Fimm staðir er ekki óvenjulegt í þessu kerfi.** ~330 patch-skrár hafa
  vaxið yfir mörg ár og sama aðgerðin var oft endurrituð.
- Skrifaðu nýtt `tools/audit-<nafn>.cjs` þegar mynstrið er þess virði að verja
  — `audit-all.cjs` tekur það sjálfkrafa upp og þá kemur villan aldrei aftur
  þegjandi.
- Charlize: `topic='variant'` — skráðu hvert mynstur sem hefur átt systkini.

## Heimildir

Aðferðafræðin er sótt í variant analysis eins og GitHub Security Lab og Trail
of Bits beita henni (rót → nákvæm samsvörun → afstraktpunktar → útvíkkun með
falsjákvæðu-þaki → þríundun), aðlöguð að því að hér er engin CodeQL — verkfærin
eru `grep` og fyrirspurn í Supabase.

- [About CodeQL](https://codeql.github.com/docs/codeql-overview/about-codeql/)
- [Multi-repository variant analysis](https://github.blog/changelog/2023-03-09-use-multi-repository-variant-analysis-beta-to-run-codeql-queries-at-scale/)
- [Trail of Bits — variant-analysis skill](https://github.com/trailofbits/skills/tree/main/plugins/variant-analysis)
