# Kennslubók: Sækja inn úr fyrirtæki — Phase A flæði

**Ferill**: Bílstjóri sækir tæki úr þjónustu-fyrirtæki → verkstæðismaður vinnur þau → viðskiptavinur sækir og fær reikning.

---

## Fyrir hvern

Þetta er tilbúið flæði fyrir **samningshafa** (fyrirtæki sem hafa árlegan þjónustusamning hjá Slökkvitæki ehf), eða önnur fyrirtæki sem þú vilt rukka eftir afhendingu.

Þegar þú ert búinn með þetta flæði:
- Reikningurinn er kominn í Bókhaldið
- Næsta skoðunardags hverra tækis er sjálfvirkt sett 12 mánuðum fram
- Úttektarskýrsla er prentanleg fyrir viðskiptavininn

---

## Skref 1 — Bílstjóri sækir tæki úr fyrirtæki

Bílstjóri keyrir túrinn samkvæmt **Þjónustutæki** kortinu (sjá vinstri hlið-bar). Hann kemur í verkstæðið með t.d. 10 slökkvitæki frá fyrirtæki sem heitir **„Test Bygging ehf"**.

> 💡 **Þú þarft ekki að gera neitt í kerfinu á þessu skrefi.** Bílstjórinn afhendir bara verkstæðismanni tækin.

---

## Skref 2 — Verkstæðismaður tekur tækin inn í kerfið

1. **Smelltu á „Verkstæði"** í vinstri hlið-bar
2. **Smelltu á bláa takkann „📥 Sækja inn úr fyrirtæki"** efst í **Samningshafar** súlu (hægri megin)

Modal opnast: _„📥 Sækja inn úr fyrirtæki — Veldu fyrirtæki og hvaða tæki komu inn"_

3. **Leitaðu að fyrirtækinu** í leitarreitnum efst, eða smelltu á það ef það birtist í listanum
   - Samningshafar **bubblerast efst** með bláu „Samningshafi" merki
4. **Smelltu á fyrirtækið** (t.d. Test Bygging ehf)

Listinn af **virkum field-tækjum** birtist með checkbox + service-dropdown per röð.

5. **Tikkaðu af þau tæki sem komu inn** (sjálfgefið er allt valið)
   - Hægt að nota „Velja öll" toggle efst
6. **Veldu þjónustu fyrir hvert tæki**:
   - **Hleðsla** — venjuleg endurfylling
   - **Skoðun / Yfirferð** — árleg eftirlit
   - **Hleðsla + Skoðun** — bæði (sjálfgefið ef næsta skoðun er útrunnin/í náinni framtíð)
   - **Viðgerð** — ef tækið þarf sérstaka aðgerð

> ⚠️ **Útrunnin tæki** fá rauða „⚠ Útrunnið" merkingu og default-a sjálfvirkt á „Hleðsla + Skoðun"

7. **Smelltu „Stofna verk"** neðst hægra
   - Toast birtist: _„✓ Stofnað R-NNNNNN með N tækjum · Y kr"_
   - Verkbeiðnin birtist strax í **Verkröðinni** (vinstri súla)
   - **Reikningsdrög** eru sjálfvirkt stofnuð með réttu verði (úr vörulistanum) — drög birtast EKKI í Tekjum/Bókhaldi fyrr en við Sótt ✓

---

## Skref 3 — Verkstæðismaður vinnur tækin

1. **Smelltu á verkbeiðnina** í Verkröðinni → modal opnast með öllum tækjunum
2. Fyrir hvert tæki:
   - 📷 **Skanna** — skanna QR-kóða með myndavél (ef þeir eru með kóða)
   - ✅ **Græni ✓ takki** — merkja sem **lokið** (þegar tækið er endurhlaðið / yfirfarið)
   - 🚫 **Ónýtt** — merkja sem **broken** ef tækið er búið og verður EKKI afhent aftur

> 💡 **Athugasemd-takkinn** virkar ef þú vilt skrifa eitthvað á sérstakan tæki (t.d. „Þrýstingur lítill, þurfti viðgerð")

3. Þegar **öll tæki** eru merkt (lokið eða ónýtt):
   - **Smelltu „✓ Merkja sem tilbúið"** neðst í modalnum
   - Toast birtist: _„Verk tilbúið · Afgreiðsla getur hringt í viðskiptavin 📞"_
   - Verkbeiðnin færist í **TILBÚIN** súluna í Afgreiðslu

---

## Skref 4 — Viðskiptavinur kemur að sækja → Sókn

1. **Smelltu á „Afgreiðsla"** í vinstri hlið-bar
2. Verkbeiðnin er efst í **TILBÚIN** súlu (hægra megin) með nafni viðskiptavinarins
3. **Smelltu „Sótt ✓"** (stóri græni takki)

**Sókn-modal opnast** með öllum tækjunum.

### 4a — Tæki sem viðskiptavinur tekur

- **Tæki frá viðgerð** — listi af öllum tækjum með checkbox
- ✅ **Tikkað = viðskiptavinur tekur** (sjálfgefið allt tikkað)
- ❌ **Untikkað = viðskiptavinur skilur eftir** (rautt bakgrunnur fyrir broken)

> 💡 **Ónýt tæki** sem voru merkt í verkstæðinu eru sjálfgefið **ekki tikkuð** og merkt rautt „⚠ ÓNÝTT — verður EKKI afhent". Bara breyta ef viðskiptavinur vill samt taka þau.

### 4b — Bæta við nýjum tækjum (replacements)

Ef viðskiptavinur vill kaupa **ný tæki í staðin fyrir ónýtt** (t.d. 2 ný 6kg ABC slökkvitæki):

1. **Smelltu „+ Bæta við"** í **„Ný tæki / aukalega"** hluta
2. Vörupickerinn opnast — **leitarsvæði + listi af 98 vörum**
3. Leitaðu „6kg duft" eða „slökkvi" — leit er nú **tokenized** (orðin geta verið í hvaða röð sem er)
4. Smelltu á vöruna
5. **Magn-modal** opnast (blár, í þema kerfisins) — sláðu inn fjölda (t.d. 2)
6. Enter eða „Bæta við"

Línan birtist í **Aukalega-listanum** með:
- Nafn vöru
- **Editable magn-input** (þú getur breytt strax án þess að delete-a)
- Línutotal m/VSK
- Eyða-takki ×

### 4c — Verð og samtals

- **Upphafleg upphæð** — verð á öllum 10 tækjunum (úr drögunum)
- **9 tæki á X kr =** — verð á því sem viðskiptavinur tekur (Z tæki úr verkbeiðni)
- **+ Aukalega:** — verð á replacements/extras
- **SAMTALS:** — heildarupphæð sem viðskiptavinur greiðir
- **↓ Lægra um X kr** eða **↑ Hærra um X kr** — sýnir mismun frá upphaflegu

> 💡 **Tilboðsverð** fyrir samningsfyrirtæki (sett undir Fyrirtæki-detail síðu) er **sjálfvirkt notað** í drögunum og við útreikning.

### 4d — Greiðslumáti

Veldu úr dropdown-inu neðst:
- 💵 **Reiðufé** — greitt strax með peningum
- 💳 **Kort** — greitt strax með korti
- 📋 **Setja í reikning** — kröfu send 10 daga (typical fyrir samningshafa)
- ⏳ **Greitt síðar** — krafa send seinna

### 4e — Klára

**Smelltu „✓ Klára sölu og afhenda"**

- Toast: _„✓ Sótt og selt — X kr"_
- Verkbeiðnin hverfur úr **TILBÚIN** súlu (færist í collected status)
- Reikningurinn birtist í **Bókhalds yfirliti** og **Reikningar listanum**
- **Næsta skoðun** sjálfvirkt sett +12 mánuði fram fyrir öll afhent tæki sem voru ekki ónýt

---

## Skref 5 — Prenta úttektarskýrslu

1. **Smelltu á „Bókhalds yfirlit"** í hlið-bar
2. Finndu nýju söluna (efst — `R-NNNNNN`)
3. **Smelltu á „📄 Skýrsla"** takkann
4. **Skýrslu-modal opnast in-page** (popup-blocker truflar ekki lengur)
5. Modalinn sýnir:
   - Slökkvitæki ehf header með kennitölu, vsk-nr, tengiliðum
   - Sölunúmer + dagsetning + starfsmaður
   - Viðskiptavinur (nafn, kt, sími, netfang, heimilisfang)
   - **Tafla**: Raðnúmer | Tegund/staðsetning | Þjónusta | ✓ Í lagi / ✗ Ónýtt | Þrýstingur | Næsta skoðun
   - Reikningssamantekt (ÁN VSK / VSK / SAMTALS)
   - Undirskriftarlínur fyrir starfsmann + viðskiptavin
6. **Smelltu „🖨 Prenta"** efst hægra → prentari opnast með A4 útlitið

---

## Skref 6 — Senda reikning

Reikningurinn birtist sjálfvirkt í:
- **Bókhalds yfirlit** — fullt samtals + VSK + línur
- **Reikningar tab** (ef greiðslumáti er „Setja í reikning" eða „Greitt síðar")

Þaðan er hægt að:
- Senda í pósti til viðskiptavinarins (ef email er skráð)
- Merkja sem greitt þegar greiðslan kemur

---

## Yfirlit — Hvað er sjálfvirkt í þessu flæði

| Atriði | Sjálfvirkt? |
|---|---|
| Búa til reikning | ✅ Stofnað sem drög í Skref 2, finalize-ast við Sótt ✓ |
| Reikna verð (úr vörulista) | ✅ Sjálfvirkt í Skref 2 |
| Tilboðsverð fyrir samningshafa | ✅ Notað sjálfvirkt ef sett upp undir Fyrirtæki |
| Næsta skoðun +12 mán | ✅ Sjálfvirkt í Skref 4e |
| Færsla í Bókhalds yfirlit | ✅ Eftir Sótt ✓ |
| Mark verkbeiðni → collected | ✅ Eftir Sótt ✓ |
| Audit trail (hvað var ekki afhent + greiðslumáti) | ✅ Skráð í solur.athugasemdir |

---

## Algengar villur og lausnir

| Vandamál | Lausn |
|---|---|
| Sækja inn modal sýnir engin tæki | Fyrirtækið er ekki með skráð tæki í Þjónustutæki — bæta þeim þangað fyrst |
| Verð sýnir 0 kr í Sókn-modal | Vöruheitin matcha ekki sjálfvirkt — bætið extras handvirkt eða fáið mig til að uppfæra vörulista-mappingu |
| Skýrsla opnast ekki | Ef popup-blocker er á í Chrome — núna opnast inline, no popup needed |
| Ekki finn fyrirtæki í Sækja inn modal | Athuga hvort það er í Fyrirtæki-listanum |

---

## Yfirlit yfir takka og merkingar

| Takki/merki | Hvar | Hvað gerir |
|---|---|---|
| 📥 Sækja inn úr fyrirtæki | Verkstæði → Samningshafar súla | Stofnar nýja verkbeiðni úr field-tækjum |
| ✅ Græni ✓ chip | Verkbeiðnis-modal | Merkir tæki sem lokið |
| 🚫 Ónýtt | Verkbeiðnis-modal | Merkir tæki sem broken (verður ekki afhent) |
| ✓ Merkja sem tilbúið | Verkbeiðnis-modal neðst | Færir verk í TILBÚIN súlu (Afgreiðsla) |
| Sótt ✓ | Afgreiðsla → TILBÚIN súla | Opnar Sókn-modal |
| ✓ Klára sölu og afhenda | Sókn-modal | Finalize-ar reikning + uppfærir tæki |
| 📄 Skýrsla | Bókhalds yfirlit á hverri línu | Opnar úttektarskýrsla in-page |
| ↩ Kredit | Bókhalds yfirlit / Reikningar | Stofnar kreditreikning ef þarf |

---

**Síðast uppfært**: 2026-05-10 með blockers laguðum (B1-B6) og UX hreinsun (F1-F4, L1-L4)
