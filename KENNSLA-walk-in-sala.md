# Kennslubók: Walk-in sala — viðskiptavinur kemur með tæki í verslun

**Ferill**: Walk-in viðskiptavinur (oft óskráð fyrirtæki eða einstaklingar) kemur með tæki sem þarf að endurhlaða eða skoða.

---

## Fyrir hvern

Þetta er hraðasta flæðið — fyrir viðskiptavini sem koma beint í verslun. Hægt að nota fyrir:
- **Staðgreiðslu** (greitt strax með korti / pening)
- **Greitt síðar** (afhent núna, krafa send í lok mánaðar)
- **Setja í reikning** (krafa í banka)

---

## Skref 1 — Bæta tækjum / þjónustu í körfu

1. **Smelltu á „Sala"** í vinstri hlið-bar (eða sjálfgefna lendingar-síðan)
2. **Smelltu á þjónustu/vöru-tile** sem á við
   - „6 kg. Duft ABC hleðsla" — venjuleg endurfylling
   - „CO₂ 5 kg hleðsla" — kolsýrutæki
   - „Slökkvitæki 6kg ABC Duft" — nýtt tæki (vara, ekki þjónusta)
3. Tile-inn fer í körfuna hægra megin
4. **Slæðu inn fjölda** í magn-input-inu (þú getur slegið beint inn 10 í stað þess að smella + 9 sinnum)

> 💡 Vörutile-flokkar:
> - 🟦 **Þjónusta** (blá) — hleðslur, yfirferðir, viðgerðir
> - 🟥 **CO₂ vörur** (rauðar)
> - 🟩 **Vatn / Froða** (grænar)
> - **VÖRUR** súla neðst — heilu slökkvitækin (ekki bara þjónusta)

---

## Skref 2 — Velja viðskiptavin

Þú hefur fjórar leiðir:

### Leið A — Þekktur viðskiptavinur (kt eða nafn í kerfinu)

1. **Slæðu inn nafn, kennitölu eða síma** í leitarreitinn
2. Drop-down birtist með matchandi viðskiptavinum
   - 🟢 **B2B** badge fyrir fyrirtæki
   - 🔵 **Viðsk.** badge fyrir einstaklinga
   - 🟢 **15%** badge ef viðskiptavinurinn hefur sjálfgefinn afslátt
3. Smelltu á réttan → kortið birtist með kt + sími + heimilisfang

### Leið B — Nýr viðskiptavinur (ekki í kerfinu)

1. Slæðu inn **nafn** eða **kennitölu** — engin niðurstaða
2. Sjáð valkosti:
   - 📋 **Leita í þjóðskrá / RSK** (ef kt) — sækir nafn úr opinberri skrá
   - ✅ **+ Stofna nýjan viðskiptavin** — opnar form til að skrá viðskiptavin
3. Smelltu **„+ Stofna nýjan viðskiptavin"**:
   - Lítill modal opnast (grænn header)
   - Fyllt sjálfvirkt nafn ef þú slóst nafn inn fyrst
   - Sláðu inn: **Nafn (krafist)** + Kennitala + Sími + Netfang + Heimilisfang
   - Smelltu **„Vista og velja"** (eða Enter)
   - Toast: „✓ X stofnaður og valinn"
   - Viðskiptavinurinn er strax valinn í körfuna

### Leið C — Þjóðskrá / RSK lookup (10-stafa kt)

1. Slæðu inn 10-stafa kennitölu
2. „📋 Leita að XXXXXX-XXXX í þjóðskrá / RSK" birtist
3. Smelltu — kerfið sækir nafnið frá RSK
   - Ef það finnst → sett í kortið, þú ferð áfram
   - Ef það finnst ekki → notaðu Leið B til að stofna handvirkt

### Leið D — Staðgreitt (engin skráning)

1. **Smelltu á „⚡ Staðgreitt"** takkann hægra megin við leitarreitinn
2. Engin viðskiptavinur skráður (kt = 999999-9999)
3. Hentar fyrir staðgreiðslu þar sem þú vilt ekki rekja sögu

---

## Skref 3 — Afsláttur (valfrjálst)

1. Hægra megin í körfu, **„Afsláttur:"** lína með % input
2. Slæðu inn % (t.d. 15)
3. **kr-upphæðin birtist í rauðu** strax (t.d. „−10.173 kr")
4. Samtals uppfærist sjálfvirkt

> 💡 Sjálfgefinn afsláttur fyrir samningsfyrirtæki birtist sem græn ↺ takki — smelltu til að nota hann

---

## Skref 4 — Smelltu „✓ ÁFRAM"

Stóri grænn takki neðst hægra. Sýnir samtalsupphæðina.

**Greiðslu-modal opnast** með:

- 💳 **Greitt með korti** — staðgreiðsla strax
- 💵 **Greitt með pening** — staðgreiðsla strax
- 📋 **Setja í reikning** — krafa í banka 10 dagar
- ⏳ **Greitt síðar** — Greitt þegar tækið er sótt

> 💡 **Smelltu prentun-checkboxana** fyrir kvittun/strikamerki/QR-merki eftir þörfum

---

## Skref 5 — Velja greiðslumáta

Smelltu á viðeigandi takka:

### A — Staðgreitt (Kort eða Pening)

- Reikningurinn er **strax merktur greiddur**
- Færist í Bókhald sem **final**
- Birtist EKKI í Reikningar-listanum (ekkert að innheimta)

### B — Setja í reikning

- Reikningurinn er **final**, en **paid_at = null**
- **Krafa send í banka 10 dagar** (handvirkt í gegnum heimabanka)
- Birtist í **Reikningar-listanum** sem ógreitt

### C — Greitt síðar (NÝTT — Phase B)

Þetta er fyrir tilfelli þar sem viðskiptavinurinn:
- Skilur tækin eftir til þjónustu
- Mun greiða þegar hann sækir tækin

Þá:
- Reikningur er stofnaður sem **drög** (status='drog')
- **Birtist EKKI** í Tekjum/Bókhaldi (ekki í tölfræðinni)
- **Birtist EKKI** í Reikningar-listanum
- Verkbeiðnin fer í verkstæði-flæðið

Þegar viðskiptavinur kemur að sækja:
- Smelltu „Sótt ✓" í Afgreiðslu (sjá kennslubókina fyrir Sækja inn flæði)
- Reikningurinn er **finalize-aður** í pickup-modalnum með rétta upphæð

---

## Skref 6 — Skrá tæki fyrir verkbeiðni (ef þjónusta valin)

Eftir greiðslumáta-val opnast **„Skrá tæki fyrir verkbeiðni"** modal.

> 💡 Titillinn sýnir nú **nafn viðskiptavinarins** efst (t.d. „Skrá tæki fyrir verkbeiðni — Rútuleigan ehf · 5559876")

Fyrir hvert tæki í körfunni:
1. **Sláðu inn raðnúmer** (skanna QR eða typing)
   - 📷 **Skanna** takki — opnar myndavél
   - ✨ **QR** takki — býr til **nýtt raðnúmer** ef tækið er ekki með QR-kóða
2. **Athugasemd** per tæki (valfrjálst) — sérstakar óskir o.s.frv.

Eða:

- ☐ **Sleppa þessari skráningu** — engin verkbeiðni búin til (bara reikningur)
- **→ Án skráninga** — sleppa raðnúmerum (verkbeiðni búin til án QR-tenginga)

**Smelltu „✓ Halda áfram"** þegar lokið.

---

## Skref 7 — Niðurstaða

- Toast: „✓ Sala vistuð"
- Reikningurinn er búinn til
- Verkbeiðnin (ef þjónusta) birtist í **Verkstæði → Verkröðin**
- Kvittun prentast (ef checkbox var virkur)

---

## Sérstök tilfelli

### Walk-in viðskiptavinur með ÓNÝTT tæki + vill kaupa nýtt í staðin

**Beztu leið**: Greiðslumáti = „Greitt síðar" (Phase B).

1. Skrá 10 hleðslur í körfu (eða það magn sem hann er með)
2. Stofna nýjan viðskiptavin inline (Skref 2 Leið B)
3. Setja afslátt (t.d. 15% fyrir stóran viðskiptavin)
4. ÁFRAM → **Greitt síðar**
5. Tæki fara í verkstæði → 2 reynast ónýt
6. Hringja í viðskiptavin: „2 ónýt — viltu 2 ný í staðinn?"
7. Hann kemur að sækja → smelltu „Sótt ✓"
8. Í Sókn-modalnum:
   - Untikkaðu 2 ónýtt tæki
   - **„+ Bæta við"** → leita „6kg duft" → velja Slökkvitæki 6kg ABC Duft
   - Magn-modal: 2
9. Endurskoðaðu samtals
10. Greiðslumáti: **„Setja í reikning"** (krafa send)
11. **„✓ Klára sölu og afhenda"**
    - Verðið endurreiknast: 8 hleðslur (afsláttur) + 2 ný tæki
    - Reikningur sendur í lok mánaðar via Reikningar-listanum

---

## Munurinn á flæðunum

| Atriði | „Sækja inn úr fyrirtæki" | „Walk-in sala" (þetta) |
|---|---|---|
| Hver byrjar | Verkstæðismaður (þegar bílstjóri kemur með tæki) | Afgreiðslufólk (þegar viðskiptavinur kemur sjálfur) |
| Tæki koma frá | Field-service skrá (Þjónustutæki) | Viðskiptavinur ber sjálfur |
| Reikningsstofnun | Stofnað sem drög í Sækja inn skrefi | Stofnað strax í POS (final eða drög ef Greitt síðar) |
| Verðákvörðun | Sjálfvirkt úr vörulista + Tilboðsverð | Notandi velur tile-a / leitar í picker |
| Næsta skoðun +12 mán | ✅ Sjálfvirkt | ❌ Þarf að gera handvirkt í Þjónustutæki ef tæki er skráð |

---

## Algengar villur og lausnir

| Vandamál | Lausn |
|---|---|
| Get ekki bætt nýjum viðskiptavin inline | Skref 2 Leið B — „+ Stofna nýjan viðskiptavin" í drop-down birtist eftir leit án niðurstöðu |
| RSK lookup feilar (Engin samsvörun) | Skref 2 Leið B — stofna handvirkt með sömu kt |
| Vörupicker finnur ekki vöru | Reyna styttra leitarorð — leitið er nú „tokenized" — orðin geta verið í hvaða röð sem er |
| Karfan tæmist eftir customer-val | Bug — tilkynna |
| Magn-modal birtist ekki, browser frýs | Vesen úr eldri útgáfu — síða þarf hard-refresh (Ctrl+F5) |

---

**Síðast uppfært**: 2026-05-10 með blockers laguðum (B1-B6) og UX hreinsun (F1-F4, F6, F7, L1-L4)
