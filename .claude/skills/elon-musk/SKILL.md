---
name: elon-musk
description: >
  Kallaðu á Elon Musk (byggingarstjóra rafkerfisins) þegar pera bilar eða
  þarf as-built: Ársskoðun ._yr litur rangur (grænt/rautt/gull/blátt),
  Rekstrarfélög 🧾 á röngum stað, skoðunarmánuður/inspect_month, penda vs
  now, Plaza-type Drive-reikningur, data-elon spor, eða „hvaða tafla kveikir
  þessum pixel". Skill-ið vísar á agentinn + docs/RAFKERFI.md. Ekki nota
  fyrir nýtt útlit á year-cell (joker/thema) né kúnnasameiningu (kunnaskra).
---

# Elon Musk — hvenær á að kalla

Lesa agentinn `.claude/agents/elon-musk.md` **eða** kalla `subagent_type: elon-musk`.
**Fyrsta verk hans:** `docs/RAFKERFI.md`.

## Kallaðu þegar

- Ársskoðun-árreitur (`._yr`) er á röngum lit — both/now/penda/inv-only / LED.
- 🧾 kviknar (eða kviknar ekki) á Rekstrarfélögum eða Ársskoðun.
- Skoðunarmánuður (📅, `inspect_month`, SKOÐUN-dálkur, gull vs rautt þetta ár).
- Status-chip, mánaðar-chip, KPI, accordion-haus, prófíls-skýrslur/reikningar.
- Plaza-type false flag (Drive-einn reikningur, kt-leki milli hótela).
- Spotrás: `data-elon`, `ELON · f…`, „rekja peru".
- Spurt er hvaða tafla/dálkur kveikir pixel.

## Ekki kalla (aðrir sérfræðingar)

| Verk | Hver |
|---|---|
| Endurstíla `._yr` gradienta / síma-útlit | `joker` / `thema` — og **bannað** að mála look-A |
| Sameina kúnna / kennitala-líkan | `kunnaskra` — **aldrei** sameina rekstrarfélags-staði |
| Senda/teikna reikning, Payday | `sala-reikningar` + `netvordur` á OUT-línu |
| Úttektartexti, par skýrsla↔reikningur sem *verk* | `sara-coworker` |
| Er óhætt að ýta? Vörðu línur 10/233/254, 121, payday, 153/187 | **`netvordur` fyrst** — Elon les teikninguna, netvörður dæmir vírinn |

## Mini-rás (ef þú gerir þetta sjálfur)

1. Hover → `title` `ELON · f<fid> · <ár> · <k> · src=<…>`
2. `data-elon` = `ELON|fid=…|y=…|k=…|src=…`
3. `docs/RAFKERFI.md` kafli 1 (mánuður), 2 (ársreitur), 3 (🧾), 4 (chips), 7 (floor plan)
4. Fid = `fyrirtaeki.id`. Ekki kt.

## Stimpillinn

Patch `js/patches/317-elon-trace.js`. Falinn: data-attrs + title. Engin CSS á `._yr`.
