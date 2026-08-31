---
name: elon-musk
description: >
  Kallaðu á Elon Musk (byggingarstjóra rafkerfisins) þegar pera bilar eða
  þarf as-built um ALLT húsið: Ársskoðun ._yr, Rekstrarfélög 🧾, SOURCE vs
  FILTER (📅 vs Ágú 32), FULLBÚIÐ/VANTAR, TÆKI/KPI/afslættir/VSK, skjala-
  lyklar (fyrirtaeki_id), eða „hvaða patch/tafla er þetta borð". Fyrsta
  verk: docs/RAFKERFI.md kaflar 8–12. Ekki nota fyrir nýtt útlit á year-cell
  (joker/thema) né kúnnasameiningu (kunnaskra).
  Kveikjuorð: árs, ársreitur, pera, FULLBÚIÐ, VANTAR, SOURCE, FILTER, TÆKI,
  KPI, data-elon, RAFKERFI, röng join, FK-join. Afrit → villuleit.
---

# Elon Musk — hvenær á að kalla

Lesa agentinn `.claude/agents/elon-musk.md` **eða** kalla `subagent_type: elon-musk`.
**Fyrsta verk hans:** `docs/RAFKERFI.md`.

## Kallaðu þegar

- Ársskoðun-árreitur (`._yr`) er á röngum lit — both/now/penda/inv-only / LED.
- 🧾 kviknar (eða kviknar ekki) á Rekstrarfélögum eða Ársskoðun.
- Skoðunarmánuður: 📅 SOURCE vs mánaðar-chip FILTER (Ágú 32), SKOÐUN-dálkur, gull vs rautt.
- STAÐA EFTIR ÁRI, ✓ FULLBÚIÐ, 1 AF 2 VANTAR, Brunakerfisþjónusta sem önnur rás.
- Útreikningur: verð, VSK, afsláttur %, KPI Fjöldi/Búið, TÆKI „2 SLT", reiknings-samtala.
- Skjala-tenging: `customer_documents`, `document_pairs`, Drive, skýrsla↔reikningur (lykill fid).
- „Hvaða patch/tafla/gesture er þetta borð?" — kafli 11 (Ársskoðun, POS, Kröfur, Öpp, …).
- Plaza-type false flag (Drive-einn reikningur, kt-leki milli hótela).
- Spotrás: `data-elon`, `ELON · f…`, `data-elon-role`, „rekja peru".

## Ekki kalla (aðrir sérfræðingar)

| Verk | Hver |
|---|---|
| Endurstíla `._yr` gradienta / síma-útlit | `joker` / `thema` — og **bannað** að mála look-A |
| Sameina kúnna / kennitala-líkan | `kunnaskra` — **aldrei** sameina rekstrarfélags-staði |
| Senda/teikna reikning, Payday | `sala-reikningar` + `netvordur` á OUT-línu |
| Úttektartexti, par skýrsla↔reikningur sem *verk* | `sara-coworker` |
| Er óhætt að ýta? Vörðu línur 10/233/254, 121, payday, 153/187 | **`netvordur` fyrst** — Elon les teikninguna, netvörður dæmir vírinn |

## Mini-rás (ef þú gerir þetta sjálfur)

1. Hover → `title` `ELON · f<fid> · <ár> · <k> · src=<…> · <ROLE>`
2. `data-elon` = `ELON|fid=…|y=…|k=…|src=…|role=…`
3. `docs/RAFKERFI.md`: **8** annotated Center Hotels, **9** útreikningar, **10** skjöl, **11** borð, **12** SOURCE vs FILTER; einnig 1 mánuður, 2 ársreitur, 3 🧾, 7 floor plan
4. Fid = `fyrirtaeki.id`. Ekki kt. FILTER skrifar ekki `inspect_month`.

## Stimpillinn

Patch `js/patches/317-elon-trace.js`. Falinn: data-attrs + title. Engin CSS á `._yr`.
Hylur: `._yr`, FULLBÚIÐ/VANTAR, 📅 SOURCE SWITCH, SKOÐUN `._mo`, FILTER chips `._ars-mo` + `._ars-st`, KPI, TÆKI, STAÐA EFTIR ÁRI, 🧾, afsláttar-pills.

---

# Takka-úttekt (bætt við 28.08.2026)

## Aðferð sem VIRKAR EKKI — ekki endurtaka

Að hlera `EventTarget.prototype.addEventListener` úr console og telja takka
án hlustanda **gefur falskar niðurstöður**. Hlerinn nær aðeins bindingum sem
verða til EFTIR að hann er settur upp; allt sem batt sig við fyrstu hleðslu
lítur út fyrir að vera dautt.

Mælt 28.08: 11.508 takkar, þar af 689 flokkaðir „enginn hlustandi". Í þeim
hópi var `⬇ Taka úr þjónustu` — sem var sannreynt VIRKANDI sömu klukkustund.
Talan er því stórlega ýkt og ónothæf.

## Aðferð sem á að nota í staðinn

Kyrrstæð greining á kóðanum, ekki keyrslutími:

1. Finndu takkann í `js/` eða `js/patches/` á texta eða class.
2. Athugaðu hvort til sé `onclick=`, `addEventListener('click'`, eða
   umboðshlustandi (`closest('.klasi')`) sem nær yfir hann.
3. Staðfestu í vafra með EINUM smelli á tiltekinn takka — og kláraðu
   staðfestingargluggann (sjá gildru hér að neðan).

**Aldrei smella á alla takka í röð.** Listinn inniheldur Eyða, senda póst,
stofna reikning og taka úr þjónustu. Sjálfvirk smellaruna eyðileggur gögn.

## Gildra: appið notar EIGIN staðfestingarglugga

`Confirm.show(msg)` (`#_cfm-dialog`, hnappar „Hætta við" / „Já") — EKKI
`window.confirm`. Sá sem stubbar `window.confirm` í prófun sér ekkert
gerast og ályktar ranglega að takkinn sé bilaður. Svo virkar hann:

```js
document.getElementById('_cfm-dialog')
  ?.querySelector('button:nth-of-type(2)')   // „Já"
  ?.click();
```

## Staðfest 28.08.2026

| Atriði | Niðurstaða |
|---|---|
| `⬇ Taka úr þjónustu` (patch 280) | **VIRKAR** — `er_i_thjonustu=false` í DB, `subscribed=false`, `removed_from_service_at` stimplað. Prófað á fid 510 |
| Hausar Ársskoðun-töflunnar skarast | Vistað útlit úr stílstjóra, EKKI útgáfu-galli. `TableLook` negldi dálka 5–8 á 40px og `_pe-overrides` setti 18px |
| `font-weight:300px` í vistuðu CSS | Galli í `262-page-editor.js applySize()` — px sett á einingalaus eigindi. Lagað (`UNITLESS_PROPS`) |
| Röðun á póst-stöðu | Var til en falin sem 🚦-merki inni í Fyrirtæki-hausnum. Færð á ✉-dálkinn |
| Skörun á öðrum síðum | Skannaðar allar 51 sýnir: 9 með töflur, aðeins `SKOÐUN⇅` á Ársskoðun skarast (7px) |

## Stílstjórinn geymir í vafranum, ekki á netþjóni

`slokk_app_settings_v1` í localStorage (1,375 MB þegar mælt). Breytingar eru
því **per vafra**, ekki fyrir alla notendur. `PageEditor.clearRule(scope, sel)`
hreinsar eina reglu; `scope` er view-id og `sel` er velji ÁN `#view-x#view-x`
forskeytisins sem `applyCss()` bætir framan við.
