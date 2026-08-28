# Uppskera — að læra af því sem þegar er til

Það liggja hundruð artifacts eftir: patch-skrár, Apps Script, HTML-frumgerðir, SQL, python-brúr,
skýrslur. Í þeim er þekking sem enginn hefur skrifað niður — og líka fullt af úreltu rusli.
Uppskeran greinir þar á milli. Hún gerir það **ekki sjálfvirkt inn í þekkingargrunninn.**

**Regla: uppskera fer í biðstofu (`charlize_inbox`), Agnar hleypir henni inn.**
Sjálfvirk innsetning myndi fylla grunninn af athugasemdum úr kóða sem enginn treystir — og þá
hættir fólk að lesa hann. Grunnur sem enginn les er verri en enginn grunnur.

## Tvennt sem er verið að ná í

**1. Artifact-skráin (`charlize_artifacts`)** — hvað er til, hvað það gerir, hvort það er í
notkun. Þetta eitt og sér leysir vandamál sem hefur bitið oftar en einu sinni: sex útgáfur af
sama module-inu og enginn veit hver er sú lifandi. `v_charlize_tvibura` sýnir skrár með sama
`content_hash` á tveimur stöðum — nákvæmlega sama mynstur og `skjalaheiti_log` notar fyrir
skjöl.

**2. Kandídatar (`charlize_inbox`)** — línur sem líta út eins og lærdómur: athugasemdir merktar
MIKILVÆGT/ATH/WARNING/„virkar ekki"/„ekki nota"/deprecated, og föst ID (Drive-möppur, Sheets,
site-ID, töflunöfn).

## Verkferlið

```bash
python scripts/harvest.py "C:\projects\brunaholf" --system brunaholf --out uppskera.sql
```

1. **Ein mappa í einu.** `C:\projects\slokkvitaeki`, svo `brunaholf`, svo `luna-bridge`, svo
   Cowork-vinnusvæðið, svo `Desktop\Claude workshop\`. Aldrei allt í einni keyrslu — 400 skráa
   biðstofa verður aldrei yfirfarin.
2. **Skoðaðu `uppskera.sql` áður en þú keyrir hana.** Hún er venjulegur texti.
3. Keyrðu hana í SQL Editor.
4. **Yfirferð:** `select * from v_charlize_inbox_pending;` — flokkaðu eftir `source_path` og
   taktu eina skrá í einu.
5. **Samþykkja:** `select charlize_approve(id) from v_charlize_inbox_pending where id in (...);`
   Lagaðu orðalagið á færslunni áður ef línan var slitin í miðju — `update charlize_inbox set
   fact='<heil setning>' where id=...`.
6. **Hafna:** `update charlize_inbox set status='rejected', review_note='úrelt' where id in (...);`
   Það er eðlilegt að hafna meirihlutanum. 10 góðar færslur úr 200 kandídötum er góð uppskera.

## Hvað skrifaði forritið EKKI

- **Skrár sem innihalda lykla.** Þær eru merktar í artifact-skránni með
  „INNIHELDUR LEYNDARMÁL" og **engir kandídatar eru teknir úr þeim.** Hreinsaðu skrána fyrst
  (og skiptu um lykil — hann telst lekinn um leið og hann er í skrá sem margir hafa lesið),
  keyrðu svo aftur.
- Skrár yfir 2 MB, `node_modules`, `.git`, `dist`, `build`, `graphify-out`.
- Nokkuð úr `.env`, `.pem`, myndum eða binary — þau eru ekki lesin.

## Að flokka artifacts

Forritið setur allt sem `status='unknown'`. Það er réttnefni — það veit ekki hvað er í notkun.
Flokkunin er mannsverk og borgar sig mest:

```sql
update charlize_artifacts set status='active',  purpose='<hvað þetta gerir>' where id=...;
update charlize_artifacts set status='superseded', superseded_by=<id> where id=...;
update charlize_artifacts set status='dead' where id=...;   -- má henda
```

Skrár með nafn sem lyktar af afriti (`gamalt`, `old`, `backup`, `_v2`, `tmp`, `test`, `drög`)
fá athugasemd um það sjálfkrafa — en nafn er vísbending, ekki dómur. `git remote -v` og
raunveruleg notkun skera úr.

## Endurkeyrsla

Skriptan er hugsuð til að keyra aftur reglulega. `path` er unique, svo endurkeyrsla uppfærir
hash, stærð og `last_seen` í stað þess að tvítaka. Þannig sést hvað hefur breyst og hvað hefur
ekki sést lengi:

```sql
select path, last_seen from charlize_artifacts
where last_seen < now() - interval '30 days' and status <> 'dead';
```

## Það sem uppskeran nær aldrei

Hún les kóða. Hún les ekki af hverju hlutirnir voru gerðir svona, hvað var reynt og virkaði
ekki, eða hvað kúnninn sagði í símann. **Það kemur bara frá Agnari og úr lotunum sjálfum** —
uppskeran er viðbót við að skrifa jafnóðum, ekki afsökun fyrir að sleppa því.
