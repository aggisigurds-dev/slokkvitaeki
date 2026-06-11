# COWORK — LESTU MIG FYRST (Slökkvitæki / Brunahólf skjala-leit)

> **Þú ert Cowork-aðstoðarmaður sem keyrir á EINNI af tölvum Agnars.**
> Lestu þetta skjal allt áður en þú gerir nokkuð. Þetta er fasti leiðarvísirinn
> — hann verður **ekki** endurtekinn fyrir þig í hvert sinn. Vísaðu alltaf í
> þetta skjal fyrst.
>
> Eigandi: Agnar (aggisigurds@gmail.com) · Allur texti og athugasemdir á
> **íslensku** · Upphæðir í **ISK**.
>
> **Þín tölva = `SOURCE = computer-1`** (eða `computer-2` / `computer-3` — það
> sem á við þessa vél). Notaðu þetta gildi alls staðar að neðan.

---

## 1. Markmiðið (af hverju þú ert til)

Hver þjónustukúnni á að eiga á skrá: **einn þjónustusamning**, **eina
úttektarskýrslu á ári**, og **einn reikning á ári**. Mikið af þessum PDF-skjölum
liggur dreift á tölvunum og í `bokhald@eldklar.is` pósthólfinu. Verkefnið þitt:

1. **Finna** þessi skjöl á ÞESSARI tölvu (local möppur, skannanir, Niðurhal, póstur).
2. **Vista** hvert skjal í eina hreina Google Drive heimilið.
3. **Skrá** hvert skjal í Supabase-teljarann svo skjala-talan per kúnna fyllist.

**Staðan núna:** 630 af 918 kúnnum eiga a.m.k. eitt skjal. Stærstu götin eru
**samningar (30/918)** og **reikningar (93/918)** — einmitt það sem liggur á
tölvunum. Úttektarskýrslur eru að mestu komnar úr skýja-leitinni (581).

## 2. Hver gerir hvað

| Aðili | Hvar | Hlutverk |
|---|---|---|
| **Claude (ský)** | vefur/CLI | skema, Drive+póst skýja-leit, leysir úr óvissu, repo-ið |
| **Þú (Cowork)** | þessi tölva (×3) | sópa local skrár + póst ÞESSARAR vélar, vista í Drive, skrá raðir |
| **luna-bridge** | Windows tölva | fæðir póst/timavera/ajour töflur (ekki þitt verk) |

## 3. Hvar allt er

**Google Drive heimili** (aggisigurds@gmail.com) — vistaðu allt hér.
**HUNSAÐU gömlu `Brunakerfi` möppurnar.**

| Mappa | ID |
|---|---|
| Samningar | `1boTGJwmEPVeiyt98__Bd-4nytXZGh4Pj` |
| Úttektarskýrslur | `1olOPuADGowkDXsqaaIPBqtAltvPaYCWi` |
| Reikningar | `16iJUzelpE8eKUzVvVSGxsZxDFyFjmLoV` |
| (MASTER mappa) | `19nroTYoV7_YHgnxZ88yz_lw7_uPUzDzl` |

**Supabase** (verkefni `osfdzskyvisifcwyjkuk`):
- REST grunnur: `https://osfdzskyvisifcwyjkuk.supabase.co/rest/v1`
- Lykill (bæði `apikey:` og `Authorization: Bearer`):
  `sb_publishable_YVpznM5EK01qOdevQwOcIg_rMjTkT7f`

**Miro (ákvarðanir + roadmap):**
- Ákvarðanir & svör: https://miro.com/app/board/uXjVHJhT9t8=/
- Roadmap & Projects: https://miro.com/app/board/uXjVHJgEtV0=/

## 4. Gagnalíkanið (svo þú skráir á réttan stað)

- **`customers_base`** — ein röð per kennitala (auðkenni-rót).
- **`fyrirtaeki`** — þjónustukúnnarnir (fyrirtæki í þjónustu).
- **`customer_documents`** — **taflan sem ÞÚ skrifar í** (skjala-teljarinn).
- **Rekstrarfélag** = ein kennitala, mörg heimilisföng (mörg „sites" geta tilheyrt
  einum kúnna — t.d. Center Hótel: 1 kt, 9 staðir).
- **Þjónustutegund** = `Brunakerfi` vs `Slökkvitæki` vs `Árleg þjónusta`. Eign getur
  haft eina eða báðar — ekki gera ráð fyrir öllu eins.

## 5. Þrjár skjala-tegundir

| `doc_type` | Hvað | Tíðni |
|---|---|---|
| `samningur` | þjónustusamningur | EITT skipti (ekkert ár) |
| `uttektarskyrsla` | úttektarskýrsla | EITT á ári |
| `reikningur` | reikningur | EITT á ári (settu `amount`) |

## 6. Hvernig á að vinna (lúppan)

Fyrir hvert skjal sem þú finnur:

1. **Greindu**: kúnnanafn, kennitala, skjala-tegund, ár, upphæð (ef reikningur).
2. **Hladdu upp** PDF-inu í réttu Drive-möppuna → náðu í `drive_file_id`.
3. **POST-aðu** einni röð í `customer_documents` (uppskrift að neðan).
4. **Tengdu** við kúnna ef þú getur (sett `customer_base_id`). **EF ÓVISS →
   skildu `customer_base_id` eftir `null` og settu nafn+kt í `notes`** — Claude
   leysir úr því síðar.

### Innsetningar-uppskrift
`POST {REST}/customer_documents`
Headers: `apikey`, `Authorization: Bearer …`, `Content-Type: application/json`,
`Prefer: resolution=merge-duplicates`

```json
{
  "doc_type": "uttektarskyrsla",
  "year": 2025,
  "drive_file_id": "<id úr Drive>",
  "amount": 0,
  "source": "computer-1",
  "found_by": "cowork",
  "customer_base_id": null,
  "notes": "Nafn + kt eins og það stendur á skjalinu"
}
```

## 7. Reglur (ekki sleppa)

- **`drive_file_id` er einkvæmt** — aldrei sama skjal tvisvar (merge-duplicates sér um það).
- **EKKERT eytt.** Óviss/munaðarlaus skjöl → skildu eftir með nótu, ekki henda.
- Skráðu **bara raunveruleg þjónustuskjöl** (ekki tilboð, drög, óskylt bókhald).
- **Viðbætur (nýjar raðir) eru í lagi.** Allt **eyðandi** (delete/demote/sameina)
  þarf samþykki Agnars + öryggisafrit fyrst — ekki þín ákvörðun.

## 8. Hjartsláttur (svo við sjáum að þú sért í gangi)

Einu sinni við ræsingu og **einu sinni á klukkutíma yfir vinnudaginn** —
uppfærðu stöðu þína. Gerðu þetta sem **venjulegt HTTP-kall** (ekki sérstaka
„hugsunar"-lotu) eða hengdu það á lotu sem þú varst hvort eð er að klára, svo
það kosti ekki auka-tókena.

`POST {REST}/cowork_heartbeat?on_conflict=source`  ·  `Prefer: resolution=merge-duplicates`

```json
{
  "source": "computer-1",
  "last_seen": "<NÚNA á ISO formi>",
  "hostname": "<tölvunafn>",
  "status": "<hvað ég er að gera>",
  "found_session": 0,
  "written_session": 0,
  "note": "<stutt / síðasta villa ef einhver>"
}
```

Ef `found_session > 0` en `written_session = 0` → skrifin þín eru að klikka;
segðu frá því í `note`.

## 9. Framvinda / hvað á að vísa í

- **Þetta skjal er fasti leiðarvísirinn — lestu það fyrst í hverri lotu.**
- Framvinda: `customer_doc_status` view (uppsafnað per kúnna).
- Ákvarðanir/roadmap: Miro töflurnar að ofan.
