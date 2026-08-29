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

### Litir og mál

Sömu og appið notar — ekkert nýtt:

- Toppstika `#1a1f2e`, brand `#C93C1D`, grunnur `#f5f4ef`, spjöld `#fff` með ramma `#e6e9ee`
- Metal-hnappar `linear-gradient(180deg,#3c4452,#232b38)`, rammi `#10161f`, texti `#dbe2ec`
- **Virkur** hnappur (Skoðað þegar hakað, valinn aksturslisti) dökkblár metal
  `linear-gradient(180deg,#2f5a86,#17324f)`, rammi `#0d1a2b`, texti `#eaf1f9`,
  auk `0 0 0 2px rgba(47,90,134,.28)` á valna akstursnúmerinu
- Árs-pillur 26px háar: grænt `#1e6b3d→#0d4526` skoðað · gult `#c9a227→#8f6d10`
  yfirstandandi ár · rautt `#c0392b→#8c2318` ekki skoðað. Ljósdíóða vinstra megin
  (`#34d17a` / `#f0c246` / `#e8705f`), tveir 5px deplar undir: grænn = skýrsla,
  blár `#2563eb` = reikningur, `#ccd2da` = vantar
- Stöðulitir: skoðað `#1f9d57` á `#e7f7ee` · í vinnslu `#17324f` á `#eef4fb` ·
  á eftir `#c0392b` á `#fdeceb` · sleppt `#c98a1a` á `#fdf3e0` · á dagskrá
  `#8a94a3` á `#f4f6f9`
- Snertisvæði aldrei undir 40px, aðgerðahnappar 44px, spjaldabil 8px

`arsskodun-app.html` hér í hönnunarverkefninu er sjónrænt viðmiðið — ekki kóði
til að afrita, og hún fer af vefnum skv. ákvörðun 2.

### Áður en þú ýtir

`git fetch` fyrst, `node tools/audit-all.cjs`, gegnum `netvordur` (Ársskoðun er
varinn slóði), `elon-musk` fyrir perurnar, `joker` fyrir útlitið. Prófað á síma
með raunverulegum gögnum — og segðu hvernig það var prófað, ekki bara að það sé
búið.
