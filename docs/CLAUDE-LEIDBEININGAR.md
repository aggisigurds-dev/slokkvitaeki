# CLAUDE-LEIDBEININGAR — Slökkvitæki + Brunahólf + Verkfærakassi

> Þetta skjal er **vinnubók fyrir Claude í hverri session**. Lestu þetta fyrst, lestu svo `CLAUDE.md`.
> Síðast uppfært: 2026-06-29 (við Sameining-tólið).

## 1. Hver Agnar er og hvernig á að tala við hann

- **Agnar Sigurðsson** (aggisigurds@gmail.com) — eigandi/eini þróunaraðili.
- **Tungumál**: íslenska í UI og kóða-kommentum. Ensk svör eingöngu ef beðið um.
- **Tæki**: Samsung S26 í vettvangsvinnu (QR-skönnun, Bilstjóri). Mobile-first.
- **Vinnumáta**: hraður, hands-off, biður Claude að keyra langt og koma með niðurstöðu. „Auto Mode" = bias toward action.
- **Þegar hann segir „halda áfram að byggja" — gerðu það, ekki spyrja**.
- **Þegar hann gefur lykilstaðreynd (t.d. „walk-ins fá 999999-9999")** — vista hana í þetta skjal strax + nota strax.

## 2. Vistarverurnar þrjár

```
┌─────────────────────────────────────────────────────────────┐
│  VERKFÆRAKASSI · verkfaeri.netlify.app                       │
│  ──────────────────────────────────────                      │
│  Meta-mælaborð. Sér yfir BÆÐI hin tvö. Battlestation Heim.   │
│  • Static HTML (engin backend). Drag-drop deploy.            │
│  • Sækir live: Brunahólf endpoints + Slökk Supabase REST.    │
└──────────┬──────────────────────────────────────┬───────────┘
           │                                      │
           ▼                                      ▼
┌──────────────────────────┐         ┌───────────────────────────┐
│ SLÖKKVITÆKI               │         │ BRUNAHÓLF                 │
│ slokkvitaeki.netlify.app  │         │ brunaholf.netlify.app     │
│ ──────────────────────    │         │ ───────────────────────   │
│ Service-side (þetta repo) │         │ Construction-side         │
│ Sala · Bílstjóri · Verkst │         │ Tímavera · Ajour · NLSH   │
│ Þjónustusamningar         │         │ Reikningar · Skuldunautar │
│ uttaeki + customers_base  │         │ Drive doc-index + dkPlus  │
└──────────────────────────┘         └───────────────────────────┘
```

**Meta-rule**: Verkfærakassi er hangar fyrir flugvélarnar. Hann veit allt en geymir ekkert eigin gögn.

## 3. Slökkvitæki customer-arkitektúr (mikilvægasta í þessu repo)

### 2-laga módel (ákveðið 2026-06-04, klárað smám saman)

```
                 ┌─────────────────────────┐
                 │   customers_base        │  ← RÓTIN. ein röð per kt.
                 │   ────────────────      │     870 raðir · 0 dups.
                 │   id, kennitala (UQ),   │
                 │   nafn, rekstrarfelag,  │
                 │   source_v_id, source_f_id ← back-link til feeders
                 └─────────┬───────────────┘
                           │ customer_base_id FK
              ┌────────────┴────────────┐
              ▼                         ▼
   ┌────────────────────┐    ┌───────────────────────┐
   │  fyrirtaeki        │    │  vidskiptavinir       │
   │  ───────────       │    │  ───────────────      │
   │  1097 raðir        │    │  359 raðir            │
   │  325 ÓTENGD ✗      │    │  23 ÓTENGD ✗          │
   │  þjónustugrein     │    │  POS / walk-in grein  │
   │  → er_i_thjonustu, │    │  → engin þjónusta     │
   │    fleet, contracts│    │                       │
   └────────────────────┘    └───────────────────────┘
```

### Walk-in konvention (mikilvægt, frá Agnar 2026-06-29)

- POS sölumenn skrá oft bara *nafn* fyrir „walk-in" (greiðir og fer).
- Þeir eiga ALLIR að lenda á ONE base-röð með kt = `999999-9999`.
- Kennitala-snið í gagnagrunni: **`xxxxxx-xxxx` með striki**.
- Sameining-tólið (patch 236) hefur „🚶 Sameina alla walk-ins" hnapp.

### Rekstrarfélög með margar staðsettningar (mikilvægt, frá Agnar 2026-06-29)

- **Sama kt → mörg `fyrirtaeki` (staðsettningar) → eitt `customers_base` parent**.
- Dæmi: Colas kt 420187-1499, þrjár staðsettningar (Óseyrarbraut / Gullhella / Álfhellu).
- **Staðsettningarnar haldast SJÁLFSTÆÐAR** — hver hefur eigin nafn, heimilisfang, úttæki-fleet, inspections.
- Sameining MÁ ALDREI **eyða** eða **renna saman** staðsettningum. Bara setja sama `customer_base_id`.
- Patch 157 `doMerge()` virkar á tvö fyrirtæki sem ÆTTU að vera sömu — ekki misnota fyrir rekstrarfélög-staðsettningar.

### Útitækjanúmer (frjáls hönd, frá Agnar 2026-06-29)

- `uttaeki.serial` er **auto-generated placeholder**, ekki byrjað að nota.
- Má eyða / bæta við / breyta án afleiðinga.
- **Serial-árekstrar þegar úttæki færast milli kúnna eru í lagi** — engar manual nags.

### Document tables FK destination

| Tafla | FK | Athugasemd |
|---|---|---|
| `customer_documents` | `customer_base_id → customers_base(id)` | Spec til, tafla bíður backup gate |
| `verkdagbok_attachments` | `entry_id → verkdagbok(id)` | Engin customer FK beint |
| `tilbod_attachments` | `tilbod_id → ...` | Indirekt um tilbod |

## 4. Email konvention (frá Agnar 2026-06-28)

| Forgangur | Reikningur | Notkun |
|---|---|---|
| 🟢 HÁTT | `eldklar@eldklar.is` | Slökkvitæki main inbox |
| 🟢 HÁTT | `brunaholf@brunaholf.is` | Brunahólf main inbox |
| 🟡 MIÐ | `bokhald@eldklar.is` | Slökkvitæki bókhald |
| 🟡 MIÐ | `bokhald@brunaholf.is` | Brunahólf bókhald |
| ❌ ALDREI | `aggisigurds@gmail.com` | Persónulegt, ekki sýna í inbox-views |

Verkfærakassi battlestation **filterar út aggisigurds@** og raðar eldklar/brunaholf fyrst.

## 5. Gagnaheilsa — núverandi þekkt vandi

### Nákvæmar tölur (skv. recon 2026-06-29)

| Vandi | Fjöldi | Skref |
|---|---|---|
| `fyrirtaeki.customer_base_id` ótengt | 325 | Sameining-tóli (patch 236) |
| `vidskiptavinir.customer_base_id` ótengt | 23 | Sameining-tóli (patch 236) — flest walk-ins |
| `solur.customer_base_id` ótengt | 93 | Sameining-tóli (patch 236), tab 💳 Sölur |
| `uttaeki.customer_base_id` ótengt | ~1130/5702 (20%) | Bakendi 232 Client-greining |
| `fyrirtaeki.tengiliður` vs `fyrirtaeki.tengilidur` dupe col | column-level | SQL hreinsun síðar |
| `fyrirtaeki` án kt | flagað í Bakendi | Bakendi 232 Endurhönnun „vantar kennitölu" |

### Verkfærin sem nú þegar laga

- **`patch 232-bakendi`** — Bakendi mælaborð, „vantar kennitölu" inline-edit
- **`patch 157-allir-vidskiptavinir.js`** — `doMerge(keeper, loser)` per-par
- **`patch 236-customer-sameining`** (NÝTT) — bulk-sameining flutt-undir-base + walk-in batch + per-tafla-tabbar

## 6. Brunahólf-side: doc-mismatch vandi (frá Agnar 2026-06-29)

> „Stærsta vandamálið sem ég veit af er illa eða rangt tengdir reikningar og úttektarskýrslur við viðskiptavini."

### Diagnose

- **`uttekt-rename.js`** var „næstum fín en ruglaðist aðeins" — endurnefnir og les aftur úr möppunni og býr til duplicates með mismunandi nöfnum.
- A.m.k. **2 lesarar** eru að lesa + tengja inn, einn auto sem Agnar veit ekki af. Þarf að audit-a.
- G-Drive folder **„Reikningar Master / Allt"** er „nokkuð gott" — staðfesta þann hluta fyrst.
- Eyturð: nöfn á skýrslunum sýna ekki nægilegar upplýsingar.

### Roadmap (5-fasi)

1. **Audit-matrix** — rows × ár; sést hvar göt eru (Stage 1)
2. **AI-bulk-rematcher** — Claude OCR → spá kt → samþykkja í batch
3. **Drive-möppu staðfesting** — bera saman skrár í Drive vs `customer_documents`
4. **Sakn-leit** — finna gögn sem eru til en ekki indexed
5. **Eitt rétt OCR** — sameina uttekt-rename + reikningar-read + doc-index í eina pípu; read → classify → rename → dedup → bucket → link

Sjá `docs/customer-documents.md` (brunaholf) fyrir gagnasmíði sem þegar er ákveðin.

## 7. Verkfærakassi (verkfaeri.netlify.app) — quick reference

### Tæknilegt

- Static `index.html` (~65 KB), engin build.
- Theme: dökk-blár topbar (`#1a1f2e`) + rauður brand (`#C93C1D`) — slökkvitæki Klassískt.
- Deploy: drag-drop í Netlify Deploys panel. *Ekki* í GitHub scope (ennþá).

### Live data sources

| Endpoint | Tilgangur |
|---|---|
| `brunaholf.netlify.app/api/data-sources-status` | Status + recent_emails + email_accounts |
| `brunaholf.netlify.app/api/automations` | Sjálfvirkni jobs + last_run |
| `brunaholf.netlify.app/api/debtors` | Skuldunautar + totals |
| `brunaholf.netlify.app/api/worksites?year=combined` | Verkstaðir + summary |
| `brunaholf.netlify.app/api/nlsh-dashboard` | NLSH byMonth/byStaff/byVerk |
| `brunaholf.netlify.app/api/nlsh-update` | (GET) Drive → Ajour ingest |
| `brunaholf.netlify.app/api/timavera-ingest-drive` | (GET) Tímavera ingest |
| `brunaholf.netlify.app/api/payday-ingest-drive` | (GET) Payday ingest |
| `osfdzskyvisifcwyjkuk.supabase.co/rest/v1/*` | Slökkvitæki Supabase (REST, anon key) |

### Drive folder ID (csv luna)

- `1BWIBt4Qid2qaIZYIeQ8DV13s3pcm9HH8` — hardkóðað í Verkfærakassa quick-action.

### NLSH revenue gildra (bug-saga)

- `/api/nlsh-dashboard` byMonth.revenue_m_vsk er **þegar í ISK, ekki milljónum**.
- Þegar multiplerast með `1e6` → trillion-villa.
- Verkfærakassi v5 leiðrétti þetta. Future Claude: **ekki margfalda**.

## 8. Slökk repo og deploy

- **Repo**: `aggisigurds-dev/slokkvitaeki` (private).
- **Branch fyrir Claude**: `claude/greeting-2eyc1w`.
- **Deploy**: `git push → CI auto-deployar á slokkvitaeki.netlify.app`. ALDREI `node deploy.js`.
- **4 vélar** vinna samtímis — pull fyrst, push síðan.
- **Patch-pattern**: nýtt skjal í `js/patches/NNN-name.js` + `<script>` tag í `index.html`. Engin patch-wrapper.

## 9. Verkfærakassi punkt-listi (frá 2026-06-29 setu)

Sé `verkfaeri/PUNKT-LISTI.md` í scratchpad. Heitir „þurfu yfirferð á morgun".

Krítískt sem þarf að sannreyna á live:
- [ ] NLSH-tölurnar á live síðunni (eftir v5 deploy)
- [ ] CORS prófun raunveruleg
- [ ] Notification permission í Safari

## 10. Stutt orðabók / glossary

| Hugtak | Hvað |
|---|---|
| **Úttektarskýrsla** | Árleg skoðun, PDF document, þarf að tengja við kúnna+ár |
| **Úttekt** | Inspection action (verb) |
| **Vinnufærsla** | Tímavera entry |
| **Verkbeiðni** | Service request (legacy table; nú verkbord/thjonustubeidni) |
| **Útistandandi** | Outstanding/unpaid |
| **Rekstrarfélag** | Parent company entity |
| **Starfsstöð** | Branch / site / location |
| **Heimsókn** | Visit (driver doing inspection round) |
| **Yfirfarið** | „Inspected" — green status |

## 11. Hvar á að vista nýjar lykilstaðreyndir

- **Þessi skjal**: vinnubók fyrir framtíðar Claude (live ops, customer arkitektúr, conventions)
- **`CLAUDE.md`**: stutt yfirlit, nýjar patches
- **`docs/customer-db.md`**: dýpra um customer model
- **`docs/customer-documents.md`**: planið fyrir documents table

Þegar Agnar segir „mundu þetta" — uppfærðu þetta skjal í sömu commit.
