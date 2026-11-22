---
name: mockup-i-sidu
description: >
  Venjulega leiðin: ChatGPT-mockup af HLUTA tilbúinnar síðu limt inn, Claude
  Code á að breyta samkvæmt — quality hrynur alltaf nema þessi playbook sé
  notuð. Notaðu þegar Agnar sendir mockup, skjámynd, „fylgdu þessu",
  „breyttu samkvæmt", „eins og á myndinni", eða þegar ChatGPT sá síðuna og
  útkoman varð samt miklu lakari. EKKI design-flow, EKKI endurskrifa HTML
  eftir myndinni.
  Kveikjuorð: mockup, chatgpt mockup, fylgja mockupi, quality hrynur, eins
  og á myndinni, breyta samkvæmt, skjámynd af hluta, venjulega leiðin.
---

# Mockup → síða (venjulega leiðin, án quality-falls)

Agnar 22.11.2026: ChatGPT-mockup af hluta → limt inn → Claude Code á að
breyta samkvæmt. **Alltaf hræðilegt.** Hann hefur látið ChatGPT sjá
síðuna líka; quality er samt miklu minni í lokin. Þetta er venjulega
leiðin, ekki sérstakt tól.

Heim: `.claude/agents/joker.md` kaflinn *Venjulega leiðin*.

## Af hverju quality hrynur

Mockupið er málverk. Þýðingin er ágiskun inn í kast 325 pappa.

1. **Lota giskar CSS** — padding, leturstigi, bil. Quality sat þar.
2. **ChatGPT sem sér síðuna teiknar samt nýja mynd**, afritar ekki
   `theme.css`. Önnur lota líkir eftir málverkinu = quality/2.
3. **Lota ver kassann** — skiptir um lit, heldur þröngu padding.
   Öndunin *var* quality-in.
4. **Uppfinningar smitast eða allt er hent** — auka-takkar, rangt letur,
   fölsk gögn.
5. **„Lítur svipað út"** án skots af hlutanum OG restinni.

Það sem virkaði (Hreyfingarlisti, 05.10.2026): krókar óbreyttir, nýtt
CSS-forskeyti, aðeins útlitið. Joker „Listasíða í Brunastál C".

## Hvað tólið gerir

```
mynd  →  SKIPUN (3–7 breytingar + bannlisti)  →  skurðaðgerð á tilbúnum CSS
     →  skjáskot af HLUTANUM og af RESTINNI  →  dílamunur
```

Ekki: mynd → HTML. Ekki: ný síða. Ekki: nýtt letur.

```bash
node tools/mockup-i-sidu.cjs --snið --nafn fyrirtækishaus \
  --url 'https://slokkvitaeki.netlify.app/#companies' \
  --hluti '._dpb-company' \
  --mynd /tmp/mockup.png

node tools/mockup-i-sidu.cjs --lesa /tmp/mockup.png
# stærð + ríkjandi litir — mæling, ekki kóði

node tools/mockup-i-sidu.cjs --bera fyrir-sida.png eftir-sida.png \
  --grima 24,80,1100,220 \
  --ut mismunur.png
# rest síðunnar á að hreyfast ~0; hlutinn má hreyfast
```

Skjáskot: Playwright MCP / `screenshot-verify` / `bh-browser`. Tólið ber
saman PNG. JPEG-mockup: lestu myndina með Read, skipaðu PNG-bera.

Mappa: `.design/mockup-<nafn>/` (`SKIPUN.md`, `mockup.png`, `fyrir*.png`,
`eftir*.png`, `mismunur.png`).

## Skylda áður en lota skrifar CSS

1. **Lesa** mockupið (Read á myndina) OG skjáskot af núverandi hluta á
   **sömu breidd**.
2. **Fylla SKIPUN.md** — tómt samningur = ekki byrjað.
3. **Ekki** kalla á `design-flow` / `frontend-design`, og ekki endurskrifa
   HTML eftir myndinni.
4. Finna síðu í `.claude/sidukort.json` og núverandi patch/CSS-forskeyti.
5. Lesa `slokkvitaeki-layout` áður en CSS er skrifað (inline `!important`
   vinnur stylesheets).

## SKIPUN — þrír listar, ekkert annað

**BREYTA** — mest sjö línur. Hver lína: hvað sést á mockupinu → hvaða
veljari → hvernig Brunastál-tókni næst *sama* stiginn (ekki Inter, ekki
hex úr myndinni nema hann sé þegar í `theme.css`).

**HALDA** — krókar, `data-*`, föll, Vista, gögn, nav, aðrir hlutar síðunnar.

**HUNSA** — allt sem ChatGPT fann upp: leturgerð, fjólublátt/SaaS-blátt,
auka-nav, takkar sem eru ekki í framleiðslu, fölsk nöfn/tölur, vafrakróm
í mockupinu, „Lorem", enski UI-texti.

Quality-in *er* öndun og leturstigi mockupsins. Ef mockupið er rýmra er
padding/gap/type-scale breytingin — inni í veljaranum, ekki ytri rauf
síðunnar nema SKIPUN segi svo.

## Smíði

- Nýr patch með eigin forskeyti (`xyz-`) ofan á óbreytta króka. Sjá
  `add-feature` + Hreyfingarlista-uppskriftina.
- Eða minnsta CSS-viðbót á *þann* pappa sem þegar teiknar hlutann.
- Aldrei `innerHTML` á allri sýninni. `Stodugt.vernda` ef listi er
  teiknaður upp.
- Íslenska á UI. Engir bláir takkar. Engin emoji. `theme.css` ræður.
- ChatGPT-hex → næsti Brunastál-tókni. Ef enginn tókni er nógu nálægt:
  spyrðu, ekki smygla hex.

## Verklok — quality er mæld, ekki sögð

1. Skjáskot af **hlutanum** fyrir og eftir, sömu breidd og mockupið.
2. Skjáskot af **allri síðunni** fyrir og eftir.
3. `node tools/mockup-i-sidu.cjs --bera fyrir-sida.png eftir-sida.png --grima x,y,w,h`
   - restin > 1,5% díla breytt → **fall**. Þú breyttir of miklu.
   - hlutinn 0% breyttur → **fall**. Þú breyttir engu.
4. Lestu `mismunur.png` og mockupið hlið við hlið. Ósamræmi = næsta
   umferð, ekki „nóg svipað".
5. Miranda (`utlitsserfraedingur`) á 390 px og 1440 px áður en „búið".
6. Segðu hvað var keyrt og hvaða prósentur komu út (CLAUDE.md regla 3).

## Kjarni og aðrar síður

Sama regla: `--url` + `--hluti`. Á Next.js (kjarni) er veljarinn
íhluturinn sem þegar er til — ekki ný `page.tsx`.
