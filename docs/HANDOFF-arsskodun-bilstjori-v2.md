# Handoff v2 — Bílstjóra-spjaldaútlit (Ársskoðun í síma)

**Leysir af hólmi `HANDOFF-arsskodun-simi.md`.** Það skjal var skrifað án þess að
vita hvað var komið í loftið; fjórar forsendur í því voru rangar og hafa verið
sannreyndar af Code:

- Númerið **315 er upptekið** (`315-fjarmal-app-compact.js`).
- **Borð-útlitið er þegar komið**, byggt inni í `153-arsskodun.js` með þeim
  dálkabreiddum sem skjalið tiltók, mælt á 678 fyrirtækjum. Ekkert eftir þar.
- Lögin sem stangast á eru **tvær 314-skrár**, ekki 314/315:
  `314-simi-compact-layer.js` (virk) og `314-arsskodun-mobile-compact.js`
  (hálfdauð — stílar borð sem birtist ekki lengur, en reglur hennar á `._ars-mo`
  og `._ars-filterstrip` eru enn virkar og hafa þegar unnið inline-stíla).
- Kveikjan er **`data-viewmode` á `<html>`**, notandastilling — ekki
  `matchMedia('(max-width: 820px)')`.

Það sem eftir stendur er eitt: **spjaldaútlitið fyrir bílstjóra.** Það er hvergi
til í appinu.

## Ákvarðanir sem beðið var um

**1 · KPI-spjöldin fara úr símaútlitinu.** Í hönnuninni er röðin
titill → síustrimlar → tafla, ekkert á milli. 187px af skjáhæð fyrir þrjár tölur
sem bílstjóri notar ekki á staðnum er ekki réttur díll. Tölurnar sjálfar tapast
ekki — þær eiga heima í botnstrimlinum sem þegar sýnir fjölda og samtölu
(`Sýni 12 af 612` · `≈ 4.106.000 kr`). Þar kostar það 34px, ekki 187px.
Þau eiga áfram að vera á skjáborðinu.

**2 · Sjálfstæðu HTML-skrárnar eiga að fara af vefnum.**
`/arsskodun-mobile.html` og `/arsskodun-app.html` liggja opnar með 12 uppdiktuðum
fyrirtækjum og geta ekki lesið gagnagrunninn. Þær voru viðmið, ekki vara. Taktu
þær úr `dist` — þær eru til hér í hönnunarverkefninu ef þarf að skoða þær aftur.

**3 · 21px yfirflæðið á klasalausa stakinu** er þitt kall — það þarf klasa í
upprunann og þú sérð hvar hann á að fara.

## Verkið: spjaldaútlit fyrir bílstjóra

Nýr patch undir næsta lausu númeri (**316** ef það er laust — sannreyndu),
`js/patches/316-arsskodun-bilstjori.js`.

**Kveikja:** `data-viewmode` á `<html>`, eins og restin af appinu. Þetta er þriðja
sýn á sömu gögnum, ekki þjöppun á borðinu — bílstjórinn velur hana. Borð-útlitið
sem þú byggðir í dag stendur óhaggað; þetta kemur við hlið þess.

**Sama gagnalag sem áður** — það var rétt í fyrra skjalinu og er staðfest:
`CanonStadur` (312) fyrir mánuð og canonical tækjafjölda, `ArsAkstur` (267) fyrir
aksturslistann, `161-leidsogn` fyrir leiðsögn, árs-reitirnir og perurnar úr 153
endurnotaðar (ekki afritaðar), og vistun **alltaf eitt fyrirtæki í einu**:

```js
await window.AppSettings.save({ arsskodun_customers: { [String(coId)]: patch } });
```

### Uppbygging

Flipar fyrir aksturslista `🚗 1 · 🚗 2 · 🚗 3 · Allir` í toppstikunni, listinn
hópaður eftir mánuði með 34px hópstiku (`Ágúst 2026` … `6 / 18`), og eitt spjald
á fyrirtæki:

1. Nafn (15.5px/700) + heimilisfang (12px), staða-pilla hægra megin
2. Árs-reitir (4 pillur, 184px), SLT/BSL/RS, `Síðast dd.mm.áá`, `≈ virði` hægra
3. Tengiliður + sími
4. Nóta á ljósum grunni `#f4f6f9`
5. **Ef í vinnslu:** blá blokk `#eef4fb` með ramma `#cfdcea` — „Í vinnslu —
   óklárað", `3 af 9 tækjum skráð`, og `⟳ Samstilla í Ársskoðun`
   (`field_inspected_year`)
6. Akstur-toggle: `— · 1 · 2 · 3`, 40×40px
7. Neðst: `📞 Hringja` (`tel:`) · `🗺 Leiðsögn` (gegnum 161) · `✓ Skoðað`

Vinstri kantur spjaldsins 4px í lit stöðunnar.

### Litir og mál — ATH: endurskoðað

Fyrsta útgáfan sem fór í loftið 29.08 var of þung: dökkir metal-hnappar á allt,
fullur blár flötur á spjaldinu í vinnslu, sjö jafnþungir hlutir að slást um sama
spjaldið. Það var hafnað. Rétta meðferðin er **hljóðlát spjöld með einni þungri
aðgerð** — tillaga `2a` í hönnunarskjalinu.

**Eitt þungt stak á spjald.** `✓ Skoðað` er eina fyllta aðgerðin.

- Spjald: `#fff`, rammi `1px #e3e1dc`, radíus `3px`, skuggi `0 1px 1px rgba(20,20,18,.04)`.
  Grunnur undir spjöldum `#f0eeea`. **Aldrei fylltur litaflötur á spjaldið sjálft.**
- Vinstri kantur 3px í lit stöðunnar: skoðað `#2e6b4a` · í vinnslu `#5980a6` ·
  á eftir `#c0392b` · sleppt `#c9a227` · á dagskrá `#ded9d2`
- Nafn 16.5px/600 `#16181c`. Allur annar texti `#5d5a54` (6.9:1) — **ekki ljósari.**
  Smámerki („AKSTUR") 10px/600 `#6f6b63`. Þetta er tól sem er lesið úti í dagsljósi;
  `#8c8880` og `#a8a49c` mældust 3.5:1 og 2.5:1 og eru of ljós.
- Stöðumerki er **texti í lit, ekki pilla**: 11px/600, uppháar, í djúpa þrepinu
  (`#2a4763` fyrir í vinnslu, `#2e6b4a` fyrir skoðað). Hrátt stálblátt `#5980a6`
  aðeins á 3px kantinum og 2px strikinu — aldrei á texta (Industry-reglan um
  djúpa þrepið fyrir smátexta í accent).
- Árs-reitir **flatir**, engir gljáar, engar ljósdíóður, engir deplar:
  31×20px, radíus 2px, `#2e6b4a` skoðað · `#c9a227` yfirstandandi ár ·
  `#e8e5e0` með `#6f6b63` texta ekki skoðað. Ártalið sjálft í reitnum (23/24/25/26).
- Hringja og Leiðsögn eru **38px táknhnappar** með hárlínuramma `#e0ddd7`,
  hvítur grunnur — ekki fylltir hnappar, ekki með texta.
- Akstur er **samfelldur segment-strimill**, ekki fjórir stakir hnappar:
  einn 1px rammi `#e0ddd7` utan um, 30×36px reitir með `1px #e0ddd7` skilum,
  valinn reitur `#17324f` með `#f2f5f8` texta.
- `✓ Skoðað` 40px hár, `#17324f` á `#f2f5f8` þegar hakað; óhakað er `Skoðað?`
  á `#f0eeea` með `#5d5a54` texta. **Munurinn á hökuðu og óhökuðu verður að sjást** —
  í loftútgáfunni var hann blár í báðum tilvikum.
- „Óklárað"-blokkin er ljós: `#f2f5f8` með 2px vinstri striki `#5980a6`,
  texti `#2a4763`, og `⟳ Samstilla` sem hvítur hnappur með ramma `#c3cfdb`.
  Ekki fullur blár flötur.
- Snertisvæði aldrei undir 36px, `✓ Skoðað` 40px, spjaldabil 12px

Uppröðunin (mánaðarhópar, flipar, línurnar í spjaldinu) kemur úr `1c`;
meðferðin að ofan úr `2a`. Bæði eru í `Ársskoðun sími.dc.html` í hönnunar-
verkefninu — opnaðu það og sjáðu `#1c` og `#2a`. `arsskodun-app.html` er
ÚRELT viðmið (það er metal-útgáfan) og fer af vefnum skv. ákvörðun 2.

### Áður en þú ýtir

`git fetch` fyrst, `node tools/audit-all.cjs`, gegnum `netvordur` (Ársskoðun er
varinn slóði), `elon-musk` fyrir perurnar, `joker` fyrir útlitið. Prófað á síma
með raunverulegum gögnum — og segðu hvernig það var prófað, ekki bara að það sé
búið.
