# Litaskrá — mæld á skjá (desktop), 2026-08-28

Þetta er **grunnlínan** fyrir þemuhreinsunina: hvað appið litar textakassa og
fleti með EINS OG ÞAÐ ER NÚNA. Mælt í vafra á `data-viewmode="desktop"`, ljóst
þema, engin Stílstjóra-yfirskrift virk.

Tilgangurinn er sá sem Agnar lýsti: **skrá → henda → hreinsa → endurstilla.**
Án þessarar skráar er endurstillingin ágiskun.

---

## 1 · Það sem er raunverulega málað (mælt, ekki lesið úr kóða)

Talan `n` er hversu margir hlutir mældust með þeirri samsetningu.

### Innsláttarreitir (`input`)

| n | Textalitur | Bakgrunnur | Leturstærð |
|---:|---|---|---|
| **100** | `rgb(20,24,34)` | **`rgba(0,0,0,0)` — GEGNSÆR** | 12px |
| 4 | `rgb(20,24,34)` | `rgb(238,241,246)` | 14px |
| 3 | `rgb(17,20,28)` | `rgb(255,255,255)` | 14px |
| 2 | `rgb(20,24,34)` | `rgb(238,241,246)` | 15px |
| 2 | `rgb(15,23,42)` | `rgba(0,0,0,0)` | 13px |
| 1 | `rgb(20,24,34)` | `rgb(238,241,246)` | 16px |
| 1 | `rgb(17,20,28)` | `rgb(255,255,255)` | 14px |
| 1 | `rgb(20,24,34)` | `rgb(255,255,255)` | 13.5px |

### Fellilistar (`select`)

| n | Textalitur | Bakgrunnur |
|---:|---|---|
| **24** | **`rgb(148,163,184)` — fölgrátt** | `rgb(255,255,255)` |
| 1 | `rgb(58,66,80)` | gegnsær |
| 1 | `rgb(20,24,34)` | `rgb(238,241,246)` |

### Textasvæði (`textarea`)

| n | Textalitur | Bakgrunnur |
|---:|---|---|
| 2 | `rgb(15,23,42)` | `rgb(255,255,255)` |

### Töflur

| Hvað | n | Textalitur | Bakgrunnur |
|---|---:|---|---|
| `td` | 6 | `rgb(17,20,28)` | `rgb(255,255,255)` |
| `td` | 1 | `rgb(91,101,115)` | `rgb(255,255,255)` |
| `th` | 6 | **`rgb(240,242,245)` — nær hvítt** | **gegnsær** |
| `th` | 6 | `rgb(91,101,115)` | `rgb(238,241,246)` |

### Grunnfletir

| Hvað | Textalitur | Bakgrunnur |
|---|---|---|
| `body` | `rgb(17,20,28)` | `rgb(245,244,239)` |
| `.topbar` | `rgb(255,255,255)` | gegnsær (málað af 230) |

---

## 2 · Þrjú vandamál sem mælingin afhjúpaði

**a) 100 innsláttarreitir hafa GEGNSÆJAN bakgrunn.**
Reiturinn erfir þá hvaða flöt sem er undir. Á hvítu spjaldi sést hann ekki sem
reitur, og lendi hann á lituðum fleti verður textinn misskýr eftir staðsetningu.
Þetta er líklegasta skýringin á „sé ekki hvað stendur í kassanum".

**b) 24 af 26 fellilistum eru með fölgráan texta `#94a3b8` á hvítu.**
Það er *placeholder*-grár notaður sem raunverulegur textalitur — birtuskil um
2,8:1, undir 4,5:1 lágmarki WCAG. Valið sem notandinn hefur gert sést verr en
það á að gera.

**c) 6 töfluhausar eru með nær-hvítan texta á gegnsæjum grunni.**
Sést aðeins ef flöturinn undir er dökkur. Þetta er nákvæmlega sama gerð og
„Stílstjóra-slysareglan" sem var löguð 17.08 (div-keðja → hvítur texti).

---

## 3 · Hvaðan litirnir koma — og af hverju þeir stangast á

**135 stílblöð** hlaðin samtímis: 127 innfelld (`<style>` sprautuð af pöppum)
og 8 tengd. Ofan á það **85 CSS-breytur** á `:root`.

### 15 ólíkir textalitir

```
--ink                 #0f172a      --ink-on-card         #11141c
--ink1                #11141c      --ink-on-steel        #11141c
--ink2                #5b6573      --ink-sub-on-card     #3a4250
--ink3                #525b6b      --ink-sub-strong      #2b313c
--ink4                #626b7a      --ink-muted-readable  #1e293b
--ink-2               #334155      --muted               #5b6472
--body                #64748b      --faint               #626b7a
--empty               #cbd2dc
```

`--ink1`, `--ink-on-card` og `--ink-on-steel` eru **sami litur** undir þremur
nöfnum. `--ink3` `#525b6b`, `--ink4`/`--faint` `#626b7a`, `--muted` `#5b6472`
og `--ink2` `#5b6573` eru fjórir nánast eins gráir.

### 5 rauðir, þrír raunverulega ólíkir

```
--brand    #c92a2a     --accent    #c92a2a  (sami)
--red      #C93C1D     --thm-red   #DA2A1E
--accent-2 #f0584c
```

### Bakgrunnar stangast á

```
--bg       #9ba1ad   ← grár
--bg2      #ffffff
--surface  #ffffff
body       #f5f4ef   ← raunverulegur bakgrunnur, hvorugt ofangreint
```

---

## 4 · Tillaga að endurstillingu (eftir hreinsun)

Þrír textalitir duga þar sem fimmtán eru núna:

| Hlutverk | Litur | Birtuskil á hvítu |
|---|---|---|
| Aðaltexti | `#11141c` | 16,8:1 |
| Undirtexti | `#4b5563` | 7,6:1 |
| Daufur/óvirkur | `#6b7280` | 5,3:1 |

Og **einn** rauður: `#c92a2a` (Brunastál).

Reglur fyrir textakassa:

* Innsláttarreitir og fellilistar fá **alltaf** skýran bakgrunn (`#ffffff`)
  og aðaltexta — aldrei gegnsæjan grunn, aldrei `#94a3b8` sem textalit.
* Töfluhausar: dökkur texti á ljósum grunni, eða ljós texti á
  **yfirlýstum** dökkum grunni — aldrei ljós texti á gegnsæju.

---

## 5 · Hvernig þetta var mælt

Vafri á `localhost:5599`, gluggi 1600×1000, `data-viewmode="desktop"`,
`data-theme` ósett, `cfg_theme` tómt. Gengið í gegnum sýnirnar Sala, Ársskoðun,
Viðskiptavinir, Afgreiðsla og Verkstæði og `getComputedStyle` lesið af hverjum
`input`, `textarea`, `select`, `td` og `th`.

**Ekki mælt:** símaham (`data-viewmode="mobile"`), appham (`body.appmode`) og
dökka þemað (`66-dark-mode.js`). Þau eru sérstök lög og þarf að mæla sér ef á
að hreinsa þau líka.
