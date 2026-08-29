# Handoff — Ársskoðun símaskjár (patch 315)

**Til Claude Code, í `aggisigurds-dev/slokkvitaeki`.**

Þessi mappa inniheldur tvær HTML-skrár sem eru **sjónræn viðmið, ekki kóði til að
afrita inn í appið**: `arsskodun-mobile.html` (borð-útlit) og `arsskodun-app.html`
(spjalda-útlit fyrir bílstjóra). Þær nota dæmigögn og standa fyrir utan appið.

Verkið er að endurgera þetta útlit **inni í appinu** sem nýjan patch sem les
raunveruleg gögn. Ekki bæta sjálfstæðum síðum við `dist` — þær geta ekki lesið
gagnagrunninn.

## Hvað á að gera

Nýr `js/patches/315-arsskodun-simi.js` + `<script>` tag í `index.html`.
Hann tekur yfir Ársskoðun-skjáinn þegar `matchMedia('(max-width: 820px)')` er true,
í staðinn fyrir þjöppunar-lagið í `314-arsskodun-mobile-compact.js` (sjá „Sambúð
við 314" neðar).

## Gagnalagið — notaðu það sem er, ekki nýjar töflur

Allt er þegar til. Engin ný Supabase-tafla, engin ný fyrirspurn.

| Það sem skjárinn sýnir | Hvar það kemur frá |
| --- | --- |
| Fyrirtækjalisti, nafn, póstnr, heimilisfang | sama uppspretta og `153-arsskodun.js` notar í `render()` |
| Skoðunarmánuður | `window.CanonStadur` (patch 312) — **eina** rétta uppsprettan, aldrei nafna-strengur |
| Tækjafjöldi (SLT/BSL/RS) | `CanonStadur` fyrir canonical fjölda; flokkatölur úr `AppSettings.path('arsskodun_customers')[id].equipment` |
| Árs-reitir (4 ár) + skýrslustaða | sama útreikningur og 153 notar í perunum — **endurnotaðu þá aðgerð, ekki afrita hana** |
| Aksturslisti 1/2/3 | `window.ArsAkstur` (les/skrifar `arsskodun_customers[id].akstur`) |
| „Í vinnslu — óklárað" | `arsskodun_customers[id].field_inspected_year` (sjá 153 kringum línu 2013) |
| Sleppt í fyrra / virkja | `arsskodun_customers[id].ekki_sleppt` |
| Forgangur | `arsskodun_customers[id].priority` |

**Vistun — mikilvægt:** skrifaðu ALLTAF eitt fyrirtæki í einu:

```js
await window.AppSettings.save({ arsskodun_customers: { [String(coId)]: patch } });
```

Aldrei alla `arsskodun_customers` töfluna. Það er race-lagfæringin frá 2026-07-15
(153-arsskodun.js:2025) og hún má ekki tapast aftur.

Notaðu líka `window.ArsAkstur` fyrir aksturslistann, ekki beina skrift í blobið —
einingin er til svo talningar og perur uppfærist með.

## Útlitið sem á að ná

Opnaðu HTML-skrárnar í vafra (eða `bh-browser.cjs`) og notaðu þær sem viðmið.
Sömu litir og appið notar í dag — engin ný litapalletta:

- Toppstika `#1a1f2e`, brand `#C93C1D`, ljós grunnur `#f5f4ef`
- Dökkir metal-hnappar `linear-gradient(180deg,#3c4452,#232b38)` með `1px solid #10161f`
- **Virkur** hnappur (Skoðað, valinn aksturslisti) dökkblár metal
  `linear-gradient(180deg,#2f5a86,#17324f)`, rammi `#0d1a2b`, texti `#eaf1f9`
- Árs-reitir: pillur með ljósdíóðu — grænt `#1e6b3d→#0d4526` skoðað,
  gult `#c9a227→#8f6d10` yfirstandandi ár, rautt `#c0392b→#8c2318` ekki skoðað;
  tveir skjaladeplar undir hverri (grænn = skýrsla, blár = reikningur)
- Snertisvæði aldrei undir 40px; raðhæð 52px; letur í röðum 13–15.5px

### Borð-útlitið (arsskodun-mobile.html)

Nafndálkur 150px frosinn til vinstri (`box-shadow:3px 0 8px -6px`), hægri hlutinn
skrunast til hliðar, 668px breiður:
`Mán 56 · Ár 112 · Tæki 96 · Akstur 60 · Staða 52 · Virði 84 · Síðast 78 · Nóta 130`.
Bæði svæðin skruna samstillt niður (`scrollTop` speglað).

Allar síurnar úr 153 eiga að vera til staðar, í þremur strimlum sem skrunast til
hliðar: stöðuflísar, mánaðarflísar með talningu (+ „Án mánaðar"), og
númer/aksturslisti/röðun/fela-slepptu/prenta. **Ekki fella síur út til að spara
plass** — Agnar vill sjá mikið og skruna, ekki fá minni skjá.

### Spjalda-útlitið (arsskodun-app.html)

Fyrir bílstjóra: eitt spjald á fyrirtæki, flipar fyrir aksturslista 1/2/3/Allir,
hópað eftir mánuði. Hvert spjald: nafn + heimilisfang, staða-pilla, árs-reitir,
SLT/BSL/RS, síðasta skoðun, tengiliður + sími, nóta, akstur-toggle, og neðst
`📞 Hringja` (`tel:`) · `🗺 Leiðsögn` · stóri `✓ Skoðað`.

Leiðsögn á að fara gegnum `js/patches/161-leidsogn.js` sem er þegar til, ekki
beint Google Maps URL.

## Sambúð við 314

`314-arsskodun-mobile-compact.js` þjappar núverandi borð á síma. Þegar 315 tekur
yfir eiga þau ekki að keyra bæði — annaðhvort slökktu á 314 undir sama
breiddarþröskuldi, eða láttu 315 leysa það af hólmi og fjarlægðu 314 úr
`index.html`. Tvö lög sem stilla sama borð er uppspretta þess að síminn hefur
ekki virkað.

## Áður en þú ýtir

```bash
git fetch origin && git status -sb
node tools/audit-all.cjs
git push origin master
```

Ársskoðun er varinn slóði (153/187 í `docs/ORYGGISNET.md`) — keyrðu breytinguna
gegnum `netvordur`. Kallaðu á `elon-musk` fyrir perurnar og útreikningana í 153,
og `joker` fyrir farsímaútlitið. Skrifaðu í Charlize í lokin.

Og: ekki segja „búið" án þess að segja hvernig það var prófað — á símanum,
með raunverulegum gögnum.
